/*
 * The sparring demo (`?fight` in the address): two Degens fight on the
 * hangout square, run by fight-sim.ts (two bots) and drawn with the clips
 * in fight-anim.ts, so the animations can be watched in the city before
 * the Fight Club exists (docs/fight-plan.md, Phase 1). An overlay shows
 * both fighters' health and stamina, the clip each is playing, and lets
 * you pause the bots and play any clip on the first fighter.
 *
 * The figures are drawn by fight-figure.ts (shared with fight.ts); the
 * motion capture is fetched as walk mode fetches it, so their footwork round
 * the ring moves on the animator as in the Fight Club.
 */
import * as THREE from 'three';
import { PLAYER, type Outfit } from './character';
import { crewOutfit } from './crew';
import { CLIP_IDS, type ClipId } from './fight-anim';
import { createFighterFigure, drawFighter, type FighterFigure } from './fight-figure';
import { T, createFightSim, type FightEvent, type FightSim } from './fight-sim';
import { fx, glowTex } from './kit';
import { loadMocap } from './mocap-load';
import type { Motion } from './remote';

/** Where the sparring happens: the open north half of the hangout square, and the ring's radius */
export const SPAR_SPOT = { x: 30, z: 49, r: 2.6 };

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
  const outfits: Outfit[] = [PLAYER, crewOutfit(1)];
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

  let motion: Motion | null = null;
  void Promise.all([import('./animator'), loadMocap(), import('./onfoot')]).then(([anim, data, onFoot]) => (motion = { anim, data, onFoot }));
  const figures: (FighterFigure & { id: string })[] = sim.fighters.map((f, i) => ({ id: f.id, ...createFighterFigure(group, outfits[i], d.low, i * 37, () => motion) }));

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

  function draw(f: (typeof sim.fighters)[number], fg: FighterFigure, dt: number) {
    drawFighter(fg, f, dt, sim.ticks);
    const row = bars.querySelector<HTMLElement>(`[data-fighter="${f.id}"]`)!;
    row.querySelector<HTMLElement>('.fight-demo-health span')!.style.transform = `scaleX(${f.health / T.health})`;
    row.querySelector<HTMLElement>('.fight-demo-stamina span')!.style.transform = `scaleX(${f.stamina / T.stamina})`;
    const name = row.querySelector<HTMLElement>('[data-clip-name]')!;
    const label = `${fg.clip ?? 'guard'} ${Math.floor(fg.frame)}${f.chain > 1 ? ` · ${f.chain} hit chain` : ''}${f.empty ? ' · tired' : ''}`;
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
