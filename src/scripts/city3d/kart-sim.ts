/*
 * Kart racing at the kart park: the rules. Like the combat and driving sims
 * it's kept free of the DOM, of scene objects and of Math.random (a seeded
 * generator only), on a fixed tick, so it can be tested and a server could
 * run it. kart.ts is the view (the karts on screen, the camera, the sounds),
 * kart-ui.ts the menu, the HUD and the results.
 *
 * - A race is the circuit one way round (kartcircuit.ts), a cup (how fast
 *   the rivals are and what the places pay), a lap count, the conditions
 *   (day, night or rain) and eight karts: you and seven rivals who follow
 *   the racing line, brake for corners and drift, with a rubber band that
 *   keeps the pack close. A time trial is you alone. Pure racing: no items.
 * - Karts are arcade: speed tapers to the kart's top; steering is sharper
 *   at speed than a car's; a hop into a drift slides round a corner and
 *   builds a boost in three stages (let go to fire it). Boost pads give a
 *   short burst. The jump throws a kart into the air. Karts bump each
 *   other: the heavier one wins, and a heavy kart ramming a light one hard
 *   spins it. Nothing ever hurts anyone.
 * - No walls (the owner's call): the kerbs are part of the track; past them
 *   the grass and gravel run-off has little grip and holds a kart to a
 *   crawl; going far off (or off the flyover's deck) fades the kart back
 *   onto the track where it had got to, stopped. Banking adds grip; rain
 *   takes grip away everywhere (night is the looks only).
 * - A lap without a wheel in the run-off is a clean lap; passing a kart is
 *   an overtake (both counted for missions and badges).
 * - Engine classes (catalog.ts `KART_CLASSES`: Street, Sport, Neon) scale
 *   everyone's speed; a cup runs at its class, a time trial at the one you
 *   pick. `auto` lets the rivals' brain drive the player (the par ghost).
 * - Places are by progress round the loop; once you finish, the rest are
 *   placed by where they are. Prizes and records are paid by tycoon.ts
 *   (`finishKartRace`), not here.
 */
import { COURSES, CLEAR, GRID, KERB, LAPS, TRACK_HALF, gridSlots, type Cond, type CourseId } from './kartcircuit';
import { F, KART_R, along, at, frame, heightAt, locate, wrapS } from './kartpark';
import { KART_CLASSES, type ClassId } from './catalog';
import { KART_SPECS, type KartId } from './mykart';

/** The sim's tick (seconds) */
export const TICK = 1 / 60;
export const COUNTDOWN = 3;
export { LAPS };
/** In the run-off a kart goes no faster than this share of its top speed (more while boosting), with this much grip */
export const RUNOFF_CAP = 0.45;
export const RUNOFF_BOOST_CAP = 0.7;
export const RUNOFF_GRIP = 0.5;
/** Rain takes this share of the grip away everywhere */
export const RAIN_GRIP = 0.7;
/** Beyond this far from the centre line (or off the deck), a kart is put back on the track */
export const RESET_AT = CLEAR + 0.5;
/** How long a kart put back stays stopped (the view fades it out and in) */
export const RESET_T = 0.9;

/* ---------- Cups ---------- */

export type CupId = 'rookie' | 'pro' | 'neon';
/** One race of a cup: which way round, how many laps, in what conditions */
export interface CupRace {
  course: CourseId;
  laps: number;
  cond: Cond;
}
export interface Cup {
  id: CupId;
  name: string;
  blurb: string;
  /** Level needed to enter */
  level: number;
  /** The engine class it runs at, and the four races of its series */
  cls: ClassId;
  races: CupRace[];
  /** How fast the rivals go (a share of a fully tuned kart's pace) and how hard they race */
  ai: number;
  skill: number;
  /** What each place pays (Dorras), first to last */
  prizes: number[];
}
const R = (course: CourseId, laps: number, cond: Cond = 'day'): CupRace => ({ course, laps, cond });
export const CUPS: Record<CupId, Cup> = {
  rookie: {
    id: 'rookie',
    name: 'Rookie Cup',
    blurb: 'Seven easy-going rivals at Street pace. Learn the circuit both ways, and once by night.',
    level: 1,
    cls: 'street',
    races: [R('circuit', 2), R('circuit-reverse', 2), R('circuit', 2, 'night'), R('circuit-reverse', 3)],
    ai: 0.8,
    skill: 0.5,
    prizes: [1500, 900, 600, 400, 300, 200, 150, 100],
  },
  pro: {
    id: 'pro',
    name: 'Pro Cup',
    blurb: 'Sport pace. The rivals brake later and drift more. A wet race and a night race. Bring a tuned kart.',
    level: 4,
    cls: 'sport',
    races: [R('circuit-reverse', 3), R('circuit', 3, 'rain'), R('circuit-reverse', 3, 'night'), R('circuit', 3)],
    ai: 0.92,
    skill: 0.8,
    prizes: [4000, 2400, 1500, 1000, 700, 500, 350, 250],
  },
  neon: {
    id: 'neon',
    name: 'Neon Cup',
    blurb: 'Neon pace, flat out. The rivals drift every corner, rain or shine, and the last race is four laps.',
    level: 9,
    cls: 'neon',
    races: [R('circuit', 3, 'night'), R('circuit-reverse', 3, 'rain'), R('circuit', 3, 'rain'), R('circuit-reverse', 4, 'night')],
    ai: 1.0,
    skill: 1,
    prizes: [10000, 6000, 3800, 2500, 1800, 1200, 900, 600],
  },
};
export const CUP_IDS = Object.keys(CUPS) as CupId[];
export const cup = (id: string) => CUPS[id as CupId] ?? null;

/** How long things last (seconds) */
export const T = {
  spin: 1.1,
  hop: 0.22,
  pad: 1.3,
  /** The drift's three stages: how long you hold it for each boost */
  drift: [0.7, 1.5, 2.4],
  driftBoost: [0.6, 1.1, 1.6],
} as const;

/* ---------- Karts ---------- */

export interface KartTune {
  /** Top speed (tiles/s), acceleration (tiles/s²), how sharply it turns (0..1+), how much it weighs (0..1), how strong its boosts are (1 = plain) */
  top: number;
  accel: number;
  handling: number;
  weight: number;
  boost: number;
}
/** A kart's 0..1 numbers (KART_SPECS with the hut's mods on, kartStats in catalog.ts) as what the sim uses, at a class's pace */
export function tune(d: { speed: number; accel: number; handling: number; weight: number; boost?: number }, cls: ClassId = 'sport'): KartTune {
  const mul = KART_CLASSES[cls].pace;
  return { top: (11 + d.speed * 7) * mul, accel: (6 + d.accel * 7) * mul, handling: d.handling, weight: d.weight, boost: d.boost ?? 1 };
}

export interface KartInput {
  /** Gas (up to 1) or brake / reverse (down to -1) */
  throttle: number;
  /** Left (-1) to right (1) */
  steer: number;
  /** Hop and hold to drift */
  drift: boolean;
}
export const NO_INPUT: KartInput = { throttle: 0, steer: 0, drift: false };

export interface Racer {
  i: number;
  kart: KartId;
  tune: KartTune;
  /** A rival's skill (0..1) and where across the track it likes to drive; null for the player */
  ai: { skill: number; offset: number } | null;
  x: number;
  z: number;
  y: number;
  yaw: number;
  /** Speed along the nose, and the way it's actually moving (it slides) */
  speed: number;
  vx: number;
  vz: number;
  /** Front wheels (-1..1, smoothed), for the model */
  steer: number;
  /** Where on the loop: s along, lateral across (left positive), progress unwrapped from the line, the lap */
  s: number;
  lateral: number;
  progress: number;
  lap: number;
  finished: boolean;
  finishT: number;
  place: number;
  /** Drifting: which way (0: not), for how long; the hop; the boost and how strong; a spin */
  drift: 0 | 1 | -1;
  driftT: number;
  hopT: number;
  boostT: number;
  boostK: number;
  spinT: number;
  spinLen: number;
  /** In the air off the jump, and the rise */
  air: boolean;
  vy: number;
  /** Bumped (for sounds and sparks): seconds left */
  bumpT: number;
  /** Where it is across the track: on the kerb, in the run-off; being put back (seconds left, for the view's fade) */
  kerb: boolean;
  off: boolean;
  resetT: number;
  /** This lap has had a wheel in the run-off (or a reset); clean laps and overtakes so far */
  dirty: boolean;
  cleanLaps: number;
  overtakes: number;
  /** The grip of the surface under it (1 = dry), for the slide */
  gripNow: number;
  /** The surface under it (kartpark.ts F flags) and its banking (radians, right side up), for the view */
  flags: number;
  roll: number;
}

export type KartEvent =
  | { kind: 'count'; n: number }
  | { kind: 'go' }
  | { kind: 'lap'; kart: number; lap: number }
  | { kind: 'finish'; kart: number; place: number; time: number }
  | { kind: 'boost'; kart: number; tier: number }
  | { kind: 'pad'; kart: number }
  | { kind: 'drift'; kart: number; on: boolean }
  | { kind: 'driftTier'; kart: number; tier: number }
  | { kind: 'spin'; kart: number; by: number }
  | { kind: 'bump'; kart: number; other: number; force: number }
  | { kind: 'jump'; kart: number }
  | { kind: 'land'; kart: number }
  | { kind: 'offtrack'; kart: number; on: boolean }
  | { kind: 'reset'; kart: number }
  | { kind: 'clean'; kart: number; lap: number }
  | { kind: 'overtake'; kart: number; place: number };

export interface RaceSetup {
  course: CourseId;
  /** A cup, or a time trial (alone) */
  cup: CupId | 'time';
  /** The engine class (a cup's own when racing a cup) */
  cls?: ClassId;
  laps?: number;
  /** Day (the default), night (looks only) or rain (less grip) */
  cond?: Cond;
  /** The rivals' brain drives the player too (the par ghost) */
  auto?: boolean;
  player: { kart: KartId; tune: KartTune };
  /** The rivals' karts (any number up to GRID - 1; a time trial has none) */
  rivals: { kart: KartId; tune: KartTune }[];
  seed: number;
}

/** Small seeded random generator (mulberry32) */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const approach = (v: number, target: number, step: number) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Gravity (tiles/s²) */
const G = 22;
/** How fast a kart turns at full lock (radians/s at speed), and the speed over which turning eases off */
const TURN = 1.75;
const TURN_EASE = 28;
/** The rivals keep this far inside the track's edges */
const LANE = TRACK_HALF - KART_R - 0.2;
/** How hard the rivals brake (tiles/s²) when planning for a corner ahead */
const PLAN_BRAKE = 9;

/** How far a kart flies off the jump's lip at a speed (it takes off at a fifth of its speed upwards) */
export const flight = (speed: number) => (0.4 * speed * speed) / G;
/** A kart's yaw rate at full lock (radians/s) at a speed */
export const turnRate = (handling: number, speed: number) => (TURN * (0.8 + handling * 0.5) * clamp(speed / 3, 0, 1)) / (1 + Math.abs(speed) / TURN_EASE);
/**
 * The fastest a kart can take a bend of curvature `k` with `margin` of its full-lock turn rate in
 * hand (a drift lends it more): v / r ≤ margin · turnRate(v), solved for v.
 */
export function cornerSpeed(handling: number, k: number, margin: number) {
  const a = TURN * (0.8 + handling * 0.5) * margin;
  const x = a / Math.max(Math.abs(k), 1e-4);
  return (TURN_EASE / 2) * (Math.sqrt(1 + (4 * x) / TURN_EASE) - 1);
}

export function createKartSim(setup: RaceSetup) {
  const course = COURSES[setup.course];
  const c = course;
  const r = rng(setup.seed);
  const laps = setup.laps ?? course.laps ?? LAPS;
  const cond: Cond = setup.cond ?? 'day';
  const weather = cond === 'rain' ? RAIN_GRIP : 1;
  const timeTrial = setup.cup === 'time';
  const cupOf = timeTrial ? null : CUPS[setup.cup as CupId];
  const cls: ClassId = setup.cls ?? cupOf?.cls ?? 'sport';
  const slots = gridSlots(c);
  const racers: Racer[] = [];
  const mk = (i: number, kart: KartId, tn: KartTune, ai: Racer['ai']): Racer => {
    const slot = slots[i];
    const p = at(c, slot.s, slot.lateral);
    return {
      i,
      kart,
      tune: tn,
      ai,
      x: p.x,
      z: p.z,
      y: p.y,
      yaw: p.yaw,
      speed: 0,
      vx: 0,
      vz: 0,
      steer: 0,
      s: wrapS(c, slot.s),
      lateral: slot.lateral,
      progress: along(c, c.start, slot.s),
      lap: 0,
      finished: false,
      finishT: 0,
      place: i + 1,
      drift: 0,
      driftT: 0,
      hopT: 0,
      boostT: 0,
      boostK: 1,
      spinT: 0,
      spinLen: T.spin,
      air: false,
      vy: 0,
      bumpT: 0,
      kerb: false,
      off: false,
      resetT: 0,
      dirty: false,
      cleanLaps: 0,
      overtakes: 0,
      gripNow: weather,
      flags: 0,
      roll: 0,
    };
  };
  // The player starts at the back of the grid (the last slot); the rivals fill the rest from pole
  const rivals = timeTrial ? [] : setup.rivals.slice(0, GRID - 1);
  const playerSlot = timeTrial ? 0 : rivals.length;
  rivals.forEach((v, i) => racers.push(mk(i, v.kart, v.tune, { skill: clamp((cupOf?.skill ?? 0.5) * (0.85 + r() * 0.3), 0.2, 1), offset: (r() - 0.5) * LANE })));
  const player = mk(playerSlot, setup.player.kart, setup.player.tune, null);
  racers.push(player);
  const events: KartEvent[] = [];
  let countdown = COUNTDOWN;
  let time = 0;
  let acc = 0;
  let started = false;
  let lastCount = Math.ceil(COUNTDOWN);
  let finishedCount = 0;
  let playerInput: KartInput = { ...NO_INPUT };
  const auto = !!setup.auto;
  /** The brain that drives the player when `auto` is on: steady, on the middle of the track */
  const AUTO = { skill: 0.85, offset: 0 };

  /* ---------- Standings ---------- */

  /** Kart indices from first to last */
  function standings() {
    return [...racers]
      .sort((a, b) => {
        if (a.finished !== b.finished) return a.finished ? -1 : 1;
        if (a.finished && b.finished) return a.finishT - b.finishT;
        return b.progress - a.progress;
      })
      .map((k) => k.i);
  }
  function placeAll() {
    standings().forEach((i, p) => (racers[i].place = p + 1));
  }

  /* ---------- Rivals ---------- */

  function think(k: Racer, ai: { skill: number; offset: number }): KartInput {
    const skill = ai.skill;
    const v = Math.max(0, k.speed);
    const om = Math.max(turnRate(k.tune.handling, v), 1e-3);
    // The racing line: a look-ahead point along the loop, across at this driver's offset, keeping to the outside on the way in
    const look = 2 + v * 0.3;
    const fr = frame(c, k.s + look);
    const bend = frame(c, k.s + look + 3).k;
    let want = clamp(ai.offset + bend * 4 * skill, -LANE, LANE);
    // Traffic: a slower kart just ahead in its lane. Pull out to pass on the side with more room, and hold back if there's no room yet
    let follow = Infinity;
    for (const o of racers) {
      if (o === k || o.resetT > 0 || Math.abs(o.y - k.y) > 0.9) continue;
      const gap = along(c, k.s, o.s);
      if (gap <= 0 || gap > 7) continue;
      if (Math.abs(o.lateral - want) > 1.25 || o.speed > v + 0.5) continue;
      const pass = o.lateral > 0 ? o.lateral - 1.5 : o.lateral + 1.5;
      if (Math.abs(pass) <= LANE) want = pass;
      else if (Math.abs(o.lateral > 0 ? o.lateral + 1.5 : o.lateral - 1.5) <= LANE) want = o.lateral > 0 ? o.lateral + 1.5 : o.lateral - 1.5;
      else follow = Math.min(follow, o.speed + gap * 0.6);
    }
    const tx = fr.x + fr.nx * want;
    const tz = fr.z + fr.nz * want;
    // Pure pursuit on the way it's actually moving: the yaw rate that bends its path through the point
    const moving = Math.hypot(k.vx, k.vz) > 2 ? Math.atan2(-k.vz, k.vx) : k.yaw;
    const err = wrap(Math.atan2(-(tz - k.z), tx - k.x) - moving);
    const dist = Math.max(1, Math.hypot(tx - k.x, tz - k.z));
    const rate = (v * 2 * Math.sin(err)) / dist;
    // How much of its turn the bends just ahead need (above 1: only a drift gets round)
    let need = 0;
    let dir = 0;
    for (let d = 0; d <= Math.max(3, v * 0.5); d += 1) {
      const kk = frame(c, k.s + d).k;
      const n = (v * Math.abs(kk)) / om;
      if (n > need) {
        need = n;
        dir = kk > 0 ? -1 : 1;
      }
    }
    const drifter = skill > 0.35;
    let drift: boolean;
    if (k.drift === 0) drift = drifter && !k.off && need > 1.08 && v > k.tune.top * 0.5;
    else drift = need > 0.95 && dir === k.drift && rate * -k.drift > 0;
    // Steering for that yaw rate: plainly, or leaning a drift tighter or looser
    let steer: number;
    if (k.drift !== 0 && drift) {
      const lean = clamp(((rate * -k.drift) / om - 0.85) / 0.75, 0, 1);
      steer = k.drift * (lean - 0.5) * 2;
    } else steer = clamp(-rate / om, -1, 1);
    // Brake for what's ahead: the speed each bend allows (with the grip, the banking and a drift's help), planned back to here
    // Past the jump there's no braking for as far as it flies
    const toJump = c.jump >= 0 ? along(c, k.s, c.jump) : -1;
    let maxSpeed = Infinity;
    for (let d = 0; d <= 26; d += 1.5) {
      const ff = frame(c, k.s + d);
      if (Math.abs(ff.k) < 0.015) continue;
      const margin = (drifter ? 0.92 + skill * 0.25 : 0.85) * Math.sqrt(weather) * (ff.flags & F.bank ? 1.1 : 1);
      const vc = cornerSpeed(k.tune.handling, ff.k, margin);
      const brakeD = toJump >= 0 && toJump < d ? Math.max(0, d - flight(v)) : d;
      maxSpeed = Math.min(maxSpeed, Math.sqrt(vc * vc + 2 * PLAN_BRAKE * brakeD));
    }
    // Out in the run-off: just get back on, gently
    if (k.off) maxSpeed = Math.min(maxSpeed, k.tune.top * RUNOFF_CAP);
    maxSpeed = Math.min(maxSpeed, follow);
    const throttle = v > maxSpeed + 0.5 ? -1 : v > maxSpeed ? -0.3 : 1;
    return { throttle, steer, drift };
  }

  /* ---------- One tick ---------- */

  function endDrift(k: Racer, fire: boolean) {
    if (k.drift === 0) return;
    const tier = k.driftT >= T.drift[2] ? 3 : k.driftT >= T.drift[1] ? 2 : k.driftT >= T.drift[0] ? 1 : 0;
    k.drift = 0;
    k.driftT = 0;
    events.push({ kind: 'drift', kart: k.i, on: false });
    if (fire && tier > 0) {
      k.boostT = Math.max(k.boostT, T.driftBoost[tier - 1] * k.tune.boost);
      k.boostK = 1.3;
      events.push({ kind: 'boost', kart: k.i, tier });
    }
  }
  function spin(k: Racer, by: number, len: number = T.spin) {
    if (k.finished || k.spinT > 0) return;
    // The Tank gets up faster
    k.spinT = k.kart === 'tank' ? len * 0.6 : len;
    k.spinLen = k.spinT;
    k.speed *= 0.3;
    k.vx *= 0.3;
    k.vz *= 0.3;
    endDrift(k, false);
    k.boostT = 0;
    events.push({ kind: 'spin', kart: k.i, by });
  }
  /** Put a kart back on the track where it had got to: on the centre line, facing along it, stopped */
  function reset(k: Racer) {
    const p = at(c, k.s, 0);
    k.x = p.x;
    k.z = p.z;
    k.y = p.y;
    k.yaw = p.yaw;
    k.lateral = 0;
    k.speed = k.vx = k.vz = 0;
    k.air = false;
    k.vy = 0;
    k.boostT = 0;
    endDrift(k, false);
    k.resetT = RESET_T;
    k.dirty = true;
    if (k.off) events.push({ kind: 'offtrack', kart: k.i, on: false });
    k.off = false;
    k.kerb = false;
    events.push({ kind: 'reset', kart: k.i });
  }

  function stepKart(k: Racer, inp: KartInput, dt: number) {
    const tn = k.tune;
    const spinning = k.spinT > 0;
    k.resetT = Math.max(0, k.resetT - dt);
    // Finished karts roll on round the track at an easy pace (the cool-down lap)
    const live = started && !spinning && k.resetT === 0;
    if (k.finished) inp = { ...inp, throttle: Math.min(inp.throttle, 0.35), drift: false };
    if (!live) inp = { ...inp, throttle: 0, steer: 0, drift: false };
    // Timers
    k.spinT = Math.max(0, k.spinT - dt);
    k.boostT = Math.max(0, k.boostT - dt);
    k.bumpT = Math.max(0, k.bumpT - dt);

    // Speed: gas, brake, the boost's extra top end, held down in the run-off, scrubbed by a spin
    const boost = k.boostT > 0 ? k.boostK : 1;
    let top = tn.top * boost;
    if (k.off) top = Math.min(top, tn.top * (k.boostT > 0 ? RUNOFF_BOOST_CAP : RUNOFF_CAP));
    if (spinning || k.resetT > 0) top = 0;
    const th = clamp(inp.throttle, -1, 1);
    if (k.air) {
      /* no gas in the air */
    } else if (k.boostT > 0 && th > 0.02) k.speed = approach(k.speed, top, tn.accel * 2.5 * dt);
    else if (th > 0.02) k.speed += tn.accel * th * Math.max(0, 1 - (k.speed / Math.max(top, 0.1)) ** 2) * dt;
    else if (th < -0.02) {
      if (k.speed > 0.3) k.speed = approach(k.speed, 0, 14 * -th * dt);
      else k.speed = approach(k.speed, -3 * -th, tn.accel * 0.6 * dt);
    } else k.speed = approach(k.speed, 0, (2.2 + Math.abs(k.speed) * 0.12) * dt);
    if (k.speed > top && !k.air) k.speed = approach(k.speed, top, (k.off ? 14 : 6) * dt);
    if (spinning) k.speed = approach(k.speed, 0, 8 * dt);

    // The hop, into a drift
    k.hopT = Math.max(0, k.hopT - dt);
    if (live && !k.air && inp.drift && k.drift === 0 && k.hopT === 0 && Math.abs(inp.steer) > 0.25 && k.speed > tn.top * 0.45) {
      k.hopT = T.hop;
      k.drift = inp.steer > 0 ? 1 : -1;
      k.driftT = 0;
      events.push({ kind: 'drift', kart: k.i, on: true });
    }
    if (k.drift !== 0) {
      const before = k.driftT;
      k.driftT += dt;
      for (let t = 0; t < 3; t++) if (before < T.drift[t] && k.driftT >= T.drift[t]) events.push({ kind: 'driftTier', kart: k.i, tier: t + 1 });
      if (!inp.drift || k.speed < tn.top * 0.3 || !live) endDrift(k, live && k.speed >= tn.top * 0.3);
    }

    // Steering: the wheels follow the input; a drift turns the kart its way, tighter or looser with the stick
    const want = live && !k.air ? clamp(inp.steer, -1, 1) : 0;
    k.steer = approach(k.steer, want, 7 * dt);
    let yawRate = 0;
    if (!k.air && !spinning) {
      const turn = turnRate(tn.handling, k.speed);
      if (k.drift !== 0) {
        const lean = 0.5 + 0.5 * k.drift * k.steer;
        yawRate = -k.drift * turn * (0.85 + lean * 0.75);
      } else yawRate = -k.steer * turn;
    }
    k.yaw += yawRate * dt;

    // The slide follows the nose (less in a drift, less with less grip under it, more on banking)
    const bankGrip = k.flags & F.bank ? 1.3 : 1;
    const grip = (k.drift !== 0 ? 2.4 + tn.handling * 0.8 : 6.5 + tn.handling * 4) * k.gripNow * bankGrip;
    const kk = 1 - Math.exp(-grip * dt);
    const fx = Math.cos(k.yaw);
    const fz = -Math.sin(k.yaw);
    k.vx += (fx * k.speed - k.vx) * kk;
    k.vz += (fz * k.speed - k.vz) * kk;
    k.x += k.vx * dt;
    k.z += k.vz * dt;

    // Where that is on the loop (keeping to the layer it was on: the deck or the ground under it)
    const loc = locate(c, k.x, k.z, k.s, 6);
    const ds = along(c, k.s, loc.s);
    k.s = loc.s;
    k.lateral = loc.lateral;
    k.flags = loc.frame.flags;
    k.roll = loc.frame.roll;
    const side = Math.abs(k.lateral);
    // Far off, or over the deck's edge: put back on the track
    const offDeck = loc.frame.flags & F.deck && loc.frame.y > 0.6 && side > TRACK_HALF + KERB;
    if (started && (side > RESET_AT || offDeck)) {
      reset(k);
      return;
    }
    const wasOff = k.off;
    k.kerb = side > TRACK_HALF && side <= TRACK_HALF + KERB;
    k.off = side > TRACK_HALF + KERB;
    if (k.off) k.dirty = true;
    if (k.off !== wasOff) events.push({ kind: 'offtrack', kart: k.i, on: k.off });
    k.gripNow = weather * (k.off ? RUNOFF_GRIP : 1);

    // Progress, laps, clean laps, the finish
    if (started && !k.finished) {
      const before = k.progress;
      k.progress += ds;
      const lapBefore = Math.floor(before / c.L);
      const lapNow = Math.floor(k.progress / c.L);
      if (lapNow > lapBefore && lapNow >= 1) {
        k.lap = lapNow;
        if (!k.dirty) {
          k.cleanLaps++;
          events.push({ kind: 'clean', kart: k.i, lap: lapNow });
        }
        k.dirty = false;
        if (lapNow >= laps) {
          k.finished = true;
          k.finishT = time;
          finishedCount++;
          placeAll();
          events.push({ kind: 'finish', kart: k.i, place: k.place, time });
        } else events.push({ kind: 'lap', kart: k.i, lap: lapNow + 1 });
      }
    }

    // Height: the track's surface (the run-off carries on from the track's edge), or the air off the jump
    const surface = heightAt(loc.frame, clamp(k.lateral, -TRACK_HALF, TRACK_HALF));
    if (k.air) {
      k.vy -= G * dt;
      k.y += k.vy * dt;
      if (k.y <= surface) {
        k.y = surface;
        k.air = false;
        k.vy = 0;
        events.push({ kind: 'land', kart: k.i });
      }
    } else {
      // Over the jump's lip at speed the kart takes off
      const dh = c.jump >= 0 ? along(c, k.s, c.jump) : -1e9;
      if (dh >= 0 && dh < 1.2 && k.speed > 6 && !k.hopT && !k.off) {
        k.air = true;
        k.vy = k.speed * 0.2;
        k.y = surface;
        events.push({ kind: 'jump', kart: k.i });
      } else k.y = surface;
    }

    // Boost pads (on the asphalt)
    if (!k.air && !spinning && started && !k.finished && side <= TRACK_HALF)
      for (const p of c.pads) {
        const d = along(c, p.s, k.s);
        if (d >= 0 && d < p.len && k.boostT < T.pad * 0.5) {
          k.boostT = T.pad * tn.boost;
          k.boostK = 1.4;
          events.push({ kind: 'pad', kart: k.i });
        }
      }
  }

  /** Karts bump each other: pushed apart, the heavier one less */
  function bumps() {
    for (let a = 0; a < racers.length; a++)
      for (let b = a + 1; b < racers.length; b++) {
        const p = racers[a];
        const q = racers[b];
        if (Math.abs(p.y - q.y) > 0.9 || p.resetT > 0 || q.resetT > 0) continue;
        const dx = q.x - p.x;
        const dz = q.z - p.z;
        const d = Math.hypot(dx, dz);
        const min = KART_R * 2;
        if (d >= min || d < 1e-4) continue;
        const nx = dx / d;
        const nz = dz / d;
        const push = min - d;
        const wp = 0.3 + p.tune.weight;
        const wq = 0.3 + q.tune.weight;
        const shareP = wq / (wp + wq);
        const shareQ = wp / (wp + wq);
        p.x -= nx * push * shareP;
        p.z -= nz * push * shareP;
        q.x += nx * push * shareQ;
        q.z += nz * push * shareQ;
        const into = (p.vx - q.vx) * nx + (p.vz - q.vz) * nz;
        if (into > 0) {
          // Trade a bit of momentum, the lighter one gets the bigger shove
          const k = 0.9 * into;
          p.vx -= nx * k * shareP * 1.2;
          p.vz -= nz * k * shareP * 1.2;
          q.vx += nx * k * shareQ * 1.2;
          q.vz += nz * k * shareQ * 1.2;
          p.speed *= 0.93;
          q.speed *= 0.93;
          if (into > 1.2) {
            p.bumpT = q.bumpT = 0.3;
            events.push({ kind: 'bump', kart: p.i, other: q.i, force: into });
            // A heavy kart ramming a light one hard sends it spinning (never on the grid)
            if (started && into > 6.5 && p.tune.weight - q.tune.weight > 0.5) spin(q, p.i, 0.7);
            else if (started && into > 6.5 && q.tune.weight - p.tune.weight > 0.5) spin(p, q.i, 0.7);
          }
        }
      }
  }

  function rubber() {
    if (!cupOf) return;
    for (const k of racers) {
      if (!k.ai) continue;
      const gap = player.progress - k.progress;
      // Behind the player: faster; ahead: a touch slower. The harder the cup, the less it gives.
      const band = clamp(gap / 45, -0.1, 0.16) * (1.2 - cupOf.skill * 0.5);
      const base = tune(KART_SPECS[k.kart], cls);
      k.tune = { ...k.tune, top: base.top * cupOf.ai * (1 + band) * (0.97 + k.ai.skill * 0.06) };
    }
  }

  /** Places gained by passing count as overtakes (while both are still racing) */
  function overtakes(before: number[]) {
    if (!started) return;
    for (const k of racers) {
      const was = before[k.i];
      if (k.finished || k.place >= was) continue;
      k.overtakes += was - k.place;
      if (k === player) events.push({ kind: 'overtake', kart: k.i, place: k.place });
    }
  }

  function tick() {
    const dt = TICK;
    if (countdown > 0) {
      countdown = Math.max(0, countdown - dt);
      const n = Math.ceil(countdown);
      if (countdown === 0) {
        started = true;
        events.push({ kind: 'go' });
      } else if (n < lastCount) {
        lastCount = n;
        events.push({ kind: 'count', n });
      }
    } else time += dt;
    rubber();
    // The player's own input until the line; after it (or with `auto`) the rivals' brain drives
    for (const k of racers) stepKart(k, k.ai ? think(k, k.ai) : auto || k.finished ? think(k, AUTO) : playerInput, dt);
    bumps();
    const before = racers.map((k) => k.place);
    placeAll();
    overtakes(before);
  }

  return {
    course,
    cup: cupOf,
    cls,
    cond,
    laps,
    timeTrial,
    racers,
    player,
    get countdown() {
      return countdown;
    },
    get started() {
      return started;
    },
    get time() {
      return time;
    },
    /** The player has finished (the results can show) */
    get done() {
      return player.finished;
    },
    /** Everyone's finished */
    get over() {
      return finishedCount >= racers.length;
    },
    standings,
    /** Advance by a frame's worth of time (fixed ticks inside); returns what happened */
    step(dt: number, inp: KartInput): KartEvent[] {
      playerInput = inp;
      acc += Math.min(dt, 0.25);
      events.length = 0;
      while (acc >= TICK) {
        acc -= TICK;
        tick();
      }
      return events.slice();
    },
    /** The drift's stage a kart is at (0..3), for the view */
    driftTier(k: Racer) {
      return k.drift === 0 ? 0 : k.driftT >= T.drift[2] ? 3 : k.driftT >= T.drift[1] ? 2 : k.driftT >= T.drift[0] ? 1 : 0;
    },
  };
}
export type KartSim = ReturnType<typeof createKartSim>;
