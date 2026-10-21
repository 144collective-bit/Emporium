/*
 * The sparring demo (`?fight` in the address): two Degens fight on the
 * hangout square, run by fight-sim.ts (two bots) and drawn with the clips
 * in fight-anim.ts, so the animations can be watched in the city before
 * the Fight Club exists (docs/fight-plan.md, Phase 1). An overlay shows
 * both fighters' health and stamina, the clip each is playing, and lets
 * you pause the bots and play any clip on the first fighter.
 *
 * How a fighter is drawn each frame (fight.ts will do the same):
 * - On the ground: the `knockdown` fall, then the `down` loop; getting up:
 *   `getup`. Stunned: the hit reaction for `hurt` (`hurtClip`), timed by
 *   `hurtFrame`. In a move: the move's clip at the sim's own `frame`, so
 *   the strike lands on the frame the rules say. Blocking: `block` (its
 *   hold loops). Walking: the guard with the legs from `walkPose`. Else
 *   the `guard` loop.
 * - A change of clip crossfades over a few frames (`blendPose`).
 * - `root` (the lying pose's drop and back-rotation) goes on the figure's
 *   group; the sim's x, z and yaw too.
 */
import * as THREE from 'three';
import { createDegen, walkPose, PLAYER, type Degen, type Outfit } from './character';
import { crewOutfit } from './crew';
import { CLIPS, CLIP_IDS, blendPose, hurtClip, moveClip, newFightPose, sampleClip, type ClipId, type FightPose } from './fight-anim';
import { T, createFightSim, type FightEvent, type FightSim, type Fighter } from './fight-sim';
import { fx, glowTex } from './kit';

/** Where the sparring happens: the open north half of the hangout square, and the ring's radius */
export const SPAR_SPOT = { x: 30, z: 49, r: 2.6 };
const SCALE = 0.85;
const FADE = 6;

interface Figure {
  id: string;
  degen: Degen;
  pose: FightPose;
  prev: FightPose;
  tmp: FightPose;
  clip: ClipId | null;
  fade: number;
  walk: number;
  /** A clip being played by hand (the overlay), with its frame */
  manual: { id: ClipId; frame: number } | null;
  /** The guard loop's own phase so the two don't bounce in step */
  seed: number;
}

export interface FightDemoDeps {
  scene: THREE.Scene;
  root: HTMLElement;
  reduced: boolean;
  low: boolean;
  /** The clock: a tick each frame */
  tick(f: (env: { dt: number; t: number }) => void): void;
}

export function buildFightDemo(d: FightDemoDeps) {
  const group = new THREE.Group();
  d.scene.add(group);
  const outfits: Outfit[] = [
    { ...PLAYER, fists: true },
    { ...crewOutfit(1), fists: true },
  ];
  const spot = SPAR_SPOT;
  let sim = makeSim(1);
  let bots = true;
  let paused = false;
  let stepOnce = false;

  function makeSim(seed: number): FightSim {
    return createFightSim({
      seed,
      fighters: [
        { id: 'a', name: 'Degen', style: 'street', x: spot.x, z: spot.z - 1.1, yaw: 0, bot: { skill: 0.8 } },
        { id: 'b', name: 'Goon', style: 'kickboxer', x: spot.x, z: spot.z + 1.1, yaw: Math.PI, bot: { skill: 0.5 } },
      ],
      bout: null,
      arena: { x: spot.x, z: spot.z, r: spot.r },
    });
  }

  const figures: Figure[] = sim.fighters.map((f, i) => {
    const degen = createDegen(outfits[i], d.low ? 1 : 2);
    degen.g.scale.setScalar(SCALE);
    group.add(degen.g);
    return { id: f.id, degen, pose: newFightPose(), prev: newFightPose(), tmp: newFightPose(), clip: null, fade: 0, walk: 0, manual: null, seed: i * 37 };
  });

  // The ring on the ground: a neon circle, and the hit bursts
  const ring = new THREE.Mesh(new THREE.RingGeometry(spot.r - 0.06, spot.r, 64), new THREE.MeshBasicMaterial({ color: '#00eaff', transparent: true, opacity: 0.6, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(spot.x, 0.03, spot.z);
  group.add(fx(ring));
  const bursts: { m: THREE.Sprite; t: number }[] = [];
  const burstMat = new THREE.SpriteMaterial({ map: glowTex, color: '#ffe44d', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const blockMat = new THREE.SpriteMaterial({ map: glowTex, color: '#00eaff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Sprite(burstMat);
    m.visible = false;
    m.scale.setScalar(0.5);
    group.add(fx(m));
    bursts.push({ m, t: 1 });
  }
  let burstN = 0;
  function burst(x: number, y: number, z: number, block: boolean) {
    const b = bursts[burstN++ % bursts.length];
    b.m.material = (block ? blockMat : burstMat).clone();
    b.m.position.set(x, y, z);
    b.m.visible = true;
    b.t = 0;
  }

  /* ---------- The overlay ---------- */

  const ui = document.createElement('div');
  ui.className = 'fight-demo';
  ui.innerHTML = `
    <div class="fight-demo-head"><span class="fight-demo-title">Sparring demo</span><span class="fight-demo-note">?fight · the fight clips in the city</span></div>
    <div class="fight-demo-bars" data-bars></div>
    <div class="fight-demo-row">
      <button type="button" data-bots aria-pressed="true">Bots on</button>
      <button type="button" data-pause aria-pressed="false">Pause</button>
      <button type="button" data-step>Step</button>
      <button type="button" data-reset>Reset</button>
    </div>
    <p class="fight-demo-hint">Pick a clip to play it on Degen (bots off). Keys: 1-9, 0 play clips; P pause; . step.</p>
    <div class="fight-demo-clips" data-clips></div>`;
  d.root.append(ui);
  const bars = ui.querySelector<HTMLElement>('[data-bars]')!;
  const clipsEl = ui.querySelector<HTMLElement>('[data-clips]')!;
  const botsBtn = ui.querySelector<HTMLButtonElement>('[data-bots]')!;
  const pauseBtn = ui.querySelector<HTMLButtonElement>('[data-pause]')!;
  for (const f of sim.fighters) {
    const row = document.createElement('div');
    row.className = 'fight-demo-fighter';
    row.dataset.fighter = f.id;
    row.innerHTML = `<span class="fight-demo-name">${f.name}</span><span class="fight-demo-bar fight-demo-health"><span></span></span><span class="fight-demo-bar fight-demo-stamina"><span></span></span><span class="fight-demo-clip" data-clip-name>guard</span>`;
    bars.append(row);
  }
  CLIP_IDS.forEach((id, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.play = id;
    b.textContent = `${i < 10 ? `${(i + 1) % 10} ` : ''}${id}`;
    b.addEventListener('click', () => play(id));
    clipsEl.append(b);
  });
  function setBots(on: boolean) {
    bots = on;
    sim.bots = on;
    botsBtn.setAttribute('aria-pressed', String(on));
    botsBtn.textContent = on ? 'Bots on' : 'Bots off';
    if (on) for (const fg of figures) fg.manual = null;
  }
  function setPaused(on: boolean) {
    paused = on;
    pauseBtn.setAttribute('aria-pressed', String(on));
    pauseBtn.textContent = on ? 'Paused' : 'Pause';
  }
  function play(id: ClipId) {
    setBots(false);
    figures[0].manual = { id, frame: 0 };
  }
  botsBtn.addEventListener('click', () => setBots(!bots));
  pauseBtn.addEventListener('click', () => setPaused(!paused));
  ui.querySelector('[data-step]')!.addEventListener('click', () => {
    setPaused(true);
    stepOnce = true;
  });
  ui.querySelector('[data-reset]')!.addEventListener('click', () => {
    sim = makeSim(Math.floor(Math.random() * 1e6));
    sim.bots = bots;
    for (const fg of figures) {
      fg.manual = null;
      fg.clip = null;
    }
  });
  const onKey = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input, textarea')) return;
    if (e.key === 'p' || e.key === 'P') setPaused(!paused);
    else if (e.key === '.') {
      setPaused(true);
      stepOnce = true;
    } else if (/^[0-9]$/.test(e.key)) {
      const i = e.key === '0' ? 9 : Number(e.key) - 1;
      if (CLIP_IDS[i]) play(CLIP_IDS[i]);
    }
  };
  window.addEventListener('keydown', onKey);

  /* ---------- Drawing a fighter ---------- */

  const walkTmp = newFightPose();
  /** Which clip and frame a fighter's state calls for */
  function pick(f: Fighter, fg: Figure): { id: ClipId; frame: number } {
    if (fg.manual) return fg.manual;
    if (f.down > 0) {
      const since = f.downTotal - f.down;
      return since < CLIPS.knockdown.frames ? { id: 'knockdown', frame: since } : { id: 'down', frame: since - CLIPS.knockdown.frames };
    }
    if (f.getup > 0) return { id: 'getup', frame: T.getupFrames - f.getup };
    if (f.stun > 0 && f.hurt) return { id: hurtClip(f.hurt), frame: f.hurtFrame };
    if (f.move) return { id: moveClip(f.move), frame: f.frame };
    if (f.blocking) return { id: 'block', frame: f.blockFrames };
    return { id: 'guard', frame: fg.seed + sim.ticks };
  }

  function draw(f: Fighter, fg: Figure, dt: number) {
    const { id, frame } = pick(f, fg);
    if (fg.manual) {
      fg.manual.frame += dt * 60;
      if (!CLIPS[id].loop && fg.manual.frame >= CLIPS[id].frames + 20) fg.manual = null;
    }
    if (id !== fg.clip) {
      // Crossfade from the pose we were showing
      Object.assign(fg.prev, structuredClone(fg.pose));
      fg.fade = fg.clip ? FADE : 0;
      fg.clip = id;
    }
    sampleClip(id, frame, fg.pose);
    // Walking: the legs from the walk cycle under the guard
    if (id === 'guard' && f.moving > 0.05) {
      fg.walk += dt * 7 * f.moving;
      walkPose(walkTmp, fg.walk, Math.min(1, f.moving), 0, 0);
      for (let i = 0; i < 2; i++) Object.assign(fg.pose.legs[i], walkTmp.legs[i]);
      fg.pose.bob += walkTmp.bob;
    }
    if (fg.fade > 0) {
      fg.fade -= dt * 60;
      const k = 1 - Math.max(0, fg.fade) / FADE;
      blendPose(fg.prev, fg.pose, k, fg.tmp);
      Object.assign(fg.pose, structuredClone(fg.tmp));
    }
    const deg = fg.degen;
    Object.assign(deg.pose, { bob: fg.pose.bob, lean: fg.pose.lean, twist: fg.pose.twist, side: fg.pose.side, headYaw: fg.pose.headYaw, headPitch: fg.pose.headPitch });
    for (let i = 0; i < 2; i++) {
      Object.assign(deg.pose.arms[i], fg.pose.arms[i]);
      Object.assign(deg.pose.legs[i], fg.pose.legs[i]);
    }
    deg.update();
    deg.g.position.set(f.x, fg.pose.root.y * SCALE, f.z);
    deg.g.rotation.set(fg.pose.root.pitch, f.yaw, 0, 'YXZ');
    const row = bars.querySelector<HTMLElement>(`[data-fighter="${f.id}"]`)!;
    row.querySelector<HTMLElement>('.fight-demo-health span')!.style.transform = `scaleX(${f.health / T.health})`;
    row.querySelector<HTMLElement>('.fight-demo-stamina span')!.style.transform = `scaleX(${f.stamina / T.stamina})`;
    const name = row.querySelector<HTMLElement>('[data-clip-name]')!;
    const label = `${id} ${Math.floor(frame)}${f.chain > 1 ? ` · ${f.chain} hit chain` : ''}${f.empty ? ' · tired' : ''}`;
    if (name.textContent !== label) name.textContent = label;
  }

  function onEvents(ev: FightEvent[]) {
    for (const e of ev) {
      if (e.kind === 'hit') burst(e.x, e.y, e.z, false);
      else if (e.kind === 'block') burst(e.x, e.y, e.z, true);
    }
  }

  d.tick(({ dt }) => {
    const run = !paused || stepOnce;
    stepOnce = false;
    if (run) {
      // Bots off: the fighters stand in guard where they are (the clock still runs for the loops)
      onEvents(sim.step(dt));
    }
    for (const f of sim.fighters) draw(f, figures.find((g) => g.id === f.id)!, run ? dt : 0);
    for (const b of bursts) {
      if (!b.m.visible) continue;
      b.t += dt * 3;
      if (b.t >= 1) b.m.visible = false;
      else {
        b.m.scale.setScalar(0.35 + b.t * 0.6);
        (b.m.material as THREE.SpriteMaterial).opacity = 1 - b.t;
      }
    }
  });

  return {
    group,
    spot,
    dispose() {
      window.removeEventListener('keydown', onKey);
      ui.remove();
      group.removeFromParent();
    },
  };
}
