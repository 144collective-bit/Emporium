/*
 * A fight on screen (docs/fight-plan.md, Phase 2): you against one of the
 * gym's fighters in the Fight Club's ring, run by fight-sim.ts and drawn
 * with the clips in fight-anim.ts (fight-figure.ts). walk.ts feeds the
 * input in (`update`), the trainer's menu starts it (`start`), the HUD and
 * the bout card are fight-ui.ts.
 *
 * - Your fighter is a Degen in your look with fists (the walker hides
 *   while you're in the ring); the opponent wears the crew's colours.
 * - A soft lock-on: you always face the opponent; forward on the stick or
 *   W is towards them. The sim does the same turn, so hits agree with
 *   what's drawn.
 * - Heavy hits and knock-outs freeze the picture for a moment (hit-stop)
 *   and punch the camera; sparks and stars on the hits, stars circling a
 *   knocked-out head. The camera sits over your shoulder, looking at the
 *   two of you.
 * - A spar ends when you quit; a bout ends on the sim's `bout` event. Both
 *   pay through tycoon.ts finishFight() + commit() and show the card;
 *   closing the card hands control back (walk.ts leaves the ring).
 * - Sounds go through sfx() (silent until the visitor turns sound on).
 */
import * as THREE from 'three';
import { crewOutfit } from './crew';
import { BOT_LEVELS, FIGHT_BOTS, type BotLevel } from './catalog';
import { createFighterFigure, disposeFigure, drawFighter, type FighterFigure } from './fight-figure';
import { T, createFightSim, forward, yawTo, type FightEvent, type FightSim, type Fighter, type FighterInput } from './fight-sim';
import type { Fight, FightDeps, FightHud, FightInput, FightKind, FightResultView } from './fight-types';
import { CORNERS, OUT, RING, RING_HALF } from './fightsite';
import { fx, glowTex } from './kit';
import { finishFight } from './tycoon';

const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);
const BOUT = { rounds: 3, seconds: 90 };
const YOU = 'you';
const THEM = 'them';

export function createFight(d: FightDeps): Fight {
  const { camera, root } = d;
  const group = new THREE.Group();
  d.scene.add(group);

  let sim: FightSim | null = null;
  let kind: FightKind = 'spar';
  let bot: BotLevel = 'easy';
  let you: FighterFigure | null = null;
  let them: FighterFigure | null = null;
  let active = false;
  /** The card is up: the fight is over, the figures hold */
  let done = false;
  /** Seconds of hit-stop left */
  let stop = 0;
  /** The spar's opening ("FIGHT") before the sim takes input */
  let intro = 0;
  let countT = 0;
  let shake = 0;
  let elapsed = 0;
  let tiredAt = -10;
  const camPos = new THREE.Vector3();
  const camAt = new THREE.Vector3();
  let camReady = false;

  /* ---------- Sparks, stars ---------- */

  const burstMat = new THREE.SpriteMaterial({ map: glowTex, color: '#ffe44d', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const blockMat = new THREE.SpriteMaterial({ map: glowTex, color: '#00eaff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const bursts: { m: THREE.Sprite; t: number; big: boolean }[] = [];
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Sprite(burstMat.clone());
    m.visible = false;
    group.add(fx(m));
    bursts.push({ m, t: 1, big: false });
  }
  let burstN = 0;
  function burst(x: number, y: number, z: number, kindOf: 'hit' | 'block' | 'heavy') {
    const b = bursts[burstN++ % bursts.length];
    b.m.material = (kindOf === 'block' ? blockMat : burstMat).clone();
    b.m.position.set(x, y, z);
    b.m.visible = true;
    b.t = 0;
    b.big = kindOf === 'heavy';
  }
  // Stars round a knocked-down head
  const starMat = new THREE.SpriteMaterial({ map: glowTex, color: '#fff3a0', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const stars = Array.from({ length: 5 }, () => {
    const m = new THREE.Sprite(starMat);
    m.scale.setScalar(0.16);
    m.visible = false;
    group.add(fx(m));
    return m;
  });
  function placeStars(f: Fighter | null, t: number) {
    const on = !!f && f.down > 0;
    for (const s of stars) s.visible = on && !d.reduced;
    if (!on || !f) return;
    // The head lies about a tile behind the feet (fight-anim.ts: the fall pivots about the feet)
    const [fx_, fz] = forward(f.yaw);
    const hx = f.x - fx_ * 0.85;
    const hz = f.z - fz * 0.85;
    stars.forEach((s, i) => {
      const a = t * 3 + (i / stars.length) * Math.PI * 2;
      s.position.set(hx + Math.cos(a) * 0.3, 0.42 + Math.sin(a * 2) * 0.05, hz + Math.sin(a) * 0.3);
    });
  }

  /* ---------- Starting and ending ---------- */

  const fighter = (id: string): Fighter | null => sim?.fighter(id) ?? null;
  const youF = () => fighter(YOU);
  const themF = () => fighter(THEM);

  function start(setup: { kind: FightKind; bot: BotLevel }) {
    if (active) clear();
    const save = d.game.save();
    kind = setup.kind;
    bot = BOT_LEVELS.includes(setup.bot) ? setup.bot : 'easy';
    const B = FIGHT_BOTS[bot];
    sim = createFightSim({
      seed: (Date.now() % 1_000_000) + 7,
      fighters: [
        { id: YOU, name: 'You', style: save.fight.style, x: CORNERS[0].x, z: CORNERS[0].z, yaw: CORNERS[0].yaw },
        { id: THEM, name: B.name, style: B.style, x: CORNERS[1].x, z: CORNERS[1].z, yaw: CORNERS[1].yaw, bot: { skill: B.skill } },
      ],
      bout: kind === 'bout' ? BOUT : null,
      arena: { x: RING.x, z: RING.z, r: RING.r },
    });
    you = createFighterFigure(group, d.outfit(), d.low, 0);
    them = createFighterFigure(group, crewOutfit(bot === 'hard' ? 2 : bot === 'medium' ? 1 : 0), d.low, 41);
    active = true;
    done = false;
    stop = 0;
    shake = 0;
    elapsed = 0;
    camReady = false;
    intro = kind === 'spar' ? 1.2 : 0;
    root.classList.add('is-fighting');
    root.dataset.fight = B.name;
    d.ui.showHud(true);
    d.club.setLive(true);
    if (kind === 'spar') showCount('FIGHT', 0.9);
    // Draw both in their corners at once
    for (const f of sim.fighters) drawFighter(f.id === YOU ? you : them, f, 0, 0);
  }

  function clear() {
    if (you) disposeFigure(you);
    if (them) disposeFigure(them);
    you = them = null;
    sim = null;
    active = false;
    done = false;
    for (const s of stars) s.visible = false;
    for (const b of bursts) b.m.visible = false;
    root.classList.remove('is-fighting');
    delete root.dataset.fight;
    d.ui.showHud(false);
    d.ui.count('');
    d.club.setLive(false);
  }

  function showCount(text: string, seconds: number) {
    countT = seconds;
    d.ui.count(text);
  }

  /** The fight is over: pay, show the card */
  function finish(quit: boolean) {
    if (!sim || done) return;
    done = true;
    const a = youF()!;
    const b = themF()!;
    const won: boolean | null = kind === 'bout' ? (quit ? false : sim.winner === YOU) : null;
    const save = d.game.save();
    const result = finishFight(save, { kind, bot, won, hits: a.hits, kos: a.kos, bestChain: a.bestChain, seconds: elapsed, quit });
    d.game.commit();
    if (result.levels > 0) d.sfx('levelup');
    const view: FightResultView = {
      kind,
      opponent: FIGHT_BOTS[bot].name,
      bot,
      won,
      quit,
      rounds: [a.rounds, b.rounds],
      hits: a.hits,
      taken: a.taken,
      bestChain: a.bestChain,
      kos: a.kos,
      knockdowns: a.knockdowns,
      seconds: Math.round(elapsed),
      result,
    };
    d.ui.count('');
    d.ui.showResult(view);
  }

  /* ---------- Events ---------- */

  function onEvents(ev: FightEvent[]) {
    for (const e of ev) {
      switch (e.kind) {
        case 'swing':
          d.sfx('whoosh', 0.5);
          break;
        case 'dodge':
          d.sfx('whoosh', 0.35);
          break;
        case 'hit': {
          const heavy = e.heavy;
          d.sfx(e.move === 'frontKick' || e.move === 'roundhouse' ? 'kick' : 'punch', heavy ? 1 : 0.8);
          burst(e.x, e.y, e.z, heavy ? 'heavy' : 'hit');
          if (!d.reduced) {
            stop = Math.max(stop, heavy ? 0.07 : 0.03);
            shake = Math.max(shake, heavy ? 0.12 : 0.05);
          }
          break;
        }
        case 'block':
          d.sfx('fightBlock', 0.7);
          burst(e.x, e.y, e.z, 'block');
          if (e.who === YOU) d.ui.pop('Blocked', 'good');
          break;
        case 'parry':
          d.sfx('parry');
          d.ui.pop(e.who === YOU ? 'Parry!' : 'Parried', e.who === YOU ? 'good' : 'bad');
          break;
        case 'stagger':
          if (e.who === YOU) d.ui.pop('Staggered', 'bad');
          break;
        case 'chain':
          if (e.who === YOU && e.n >= 2) d.ui.pop(`${e.n} hit chain`, 'good');
          break;
        case 'tired':
          if (e.who === YOU && elapsed - tiredAt > 1.5) {
            tiredAt = elapsed;
            d.ui.pop('Tired', 'bad');
          }
          break;
        case 'knockdown':
          d.sfx(e.ko ? 'fightKo' : 'thud');
          if (!d.reduced) {
            stop = Math.max(stop, e.ko ? 0.14 : 0.08);
            shake = Math.max(shake, e.ko ? 0.2 : 0.12);
          }
          if (e.ko) showCount('K.O.', 1.6);
          else d.ui.pop(e.who === YOU ? 'Knocked down' : 'Knockdown!', e.who === YOU ? 'bad' : 'good');
          break;
        case 'getup':
          break;
        case 'bell':
          d.sfx('bell');
          showCount('FIGHT', 0.8);
          break;
        case 'round':
          d.sfx('bell', 0.8);
          d.ui.pop(e.winner === YOU ? 'Round to you' : e.winner === THEM ? `Round to ${FIGHT_BOTS[bot].name}` : 'Round even', e.winner === YOU ? 'good' : e.winner === THEM ? 'bad' : 'plain');
          break;
        case 'bout':
          finish(false);
          break;
      }
    }
  }

  /* ---------- The HUD ---------- */

  function paintHud() {
    if (!sim) return;
    const a = youF()!;
    const b = themF()!;
    const down = a.down > 0 ? 'you' : b.down > 0 ? 'them' : null;
    const h: FightHud = {
      kind,
      you: 'You',
      opponent: FIGHT_BOTS[bot].name,
      health: a.health / T.health,
      stamina: a.stamina / T.stamina,
      oppHealth: b.health / T.health,
      empty: a.empty,
      blocking: a.blocking,
      chain: a.chain,
      round: sim.round,
      rounds: BOUT.rounds,
      clock: sim.boutPhase === 'bell' && kind === 'bout' ? BOUT.seconds : sim.clock,
      phase: sim.boutPhase,
      count: down ? Math.ceil((a.down > 0 ? a.down : b.down) * T.tick) : 0,
      down,
      score: [a.rounds, b.rounds],
    };
    d.ui.paintHud(h);
  }

  /* ---------- The camera ---------- */

  function placeCamera(dt: number) {
    const a = youF();
    const b = themF();
    if (!a || !b) return;
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    // Behind you, over the right shoulder, looking at the pair
    const [fx_, fz] = forward(a.yaw);
    const rx = fz;
    const rz = -fx_;
    const back = 2.3 + Math.min(0.9, Math.hypot(b.x - a.x, b.z - a.z) * 0.2);
    const want = new THREE.Vector3(a.x - fx_ * back + rx * 0.6, 1.5, a.z - fz * back + rz * 0.6);
    // Inside the ropes, so they never cross the picture
    const lim = RING_HALF - 0.3;
    want.x = THREE.MathUtils.clamp(want.x, RING.x - lim, RING.x + lim);
    want.z = THREE.MathUtils.clamp(want.z, RING.z - lim, RING.z + lim);
    const at = new THREE.Vector3(mx, 0.85, mz);
    if (!camReady || d.reduced) {
      camPos.copy(want);
      camAt.copy(at);
      camReady = true;
    } else {
      camPos.lerp(want, damp(6, dt));
      camAt.lerp(at, damp(8, dt));
    }
    camera.position.copy(camPos);
    if (shake > 0 && !d.reduced) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake * 0.6;
      shake = Math.max(0, shake - dt * 1.4);
    }
    camera.lookAt(camAt);
  }

  /* ---------- The interface ---------- */

  return {
    get active() {
      return active;
    },
    get sim() {
      return sim;
    },
    start,
    update(dt, inp: FightInput) {
      if (!sim || !you || !them) return;
      const a = youF()!;
      const b = themF()!;
      elapsed += dt;
      if (countT > 0) {
        countT -= dt;
        if (countT <= 0) d.ui.count('');
      }
      // The sim: your input in your facing's frame (the lock-on faces the opponent)
      let simDt = dt;
      if (stop > 0) {
        stop -= dt;
        simDt = 0;
      }
      if (intro > 0) {
        intro -= dt;
        simDt = 0;
      }
      if (!done && simDt > 0) {
        const face = yawTo(a.x, a.z, b.x, b.z);
        const [fx_, fz] = forward(face);
        const rx = fz;
        const rz = -fx_;
        const inputs: Record<string, FighterInput> = {
          [YOU]: {
            x: fx_ * inp.fwd + rx * inp.right,
            z: fz * inp.fwd + rz * inp.right,
            face,
            punch: inp.punch,
            kick: inp.kick,
            block: inp.block,
            dodge: inp.dodge,
          },
        };
        onEvents(sim.step(simDt, inputs));
      }
      // Draw both (held during a hit-stop), the sparks, the stars
      const drawDt = done ? dt : simDt;
      drawFighter(you, a, drawDt, sim.ticks);
      drawFighter(them, b, drawDt, sim.ticks);
      for (const bu of bursts) {
        if (!bu.m.visible) continue;
        bu.t += dt * (bu.big ? 2.6 : 3.4);
        if (bu.t >= 1) bu.m.visible = false;
        else {
          bu.m.scale.setScalar((bu.big ? 0.5 : 0.3) + bu.t * (bu.big ? 0.9 : 0.55));
          (bu.m.material as THREE.SpriteMaterial).opacity = 1 - bu.t;
        }
      }
      placeStars(a.down > 0 ? a : b.down > 0 ? b : null, elapsed);
      placeCamera(dt);
      paintHud();
    },
    exit() {
      // Leaving mid-fight (walk mode ending): a bout in progress is forfeited, a spar just ends
      if (sim && !done) {
        const a = youF()!;
        const save = d.game.save();
        finishFight(save, { kind, bot, won: kind === 'bout' ? false : null, hits: a.hits, kos: a.kos, bestChain: a.bestChain, seconds: elapsed, quit: true });
        d.game.commit();
      }
      clear();
      return { ...OUT };
    },
    quit() {
      if (!sim || done) return;
      finish(true);
    },
    idle() {},
  };
}
