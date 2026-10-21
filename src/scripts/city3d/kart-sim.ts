/*
 * Kart racing at the kart park: the rules. Like the combat and driving sims
 * it's kept free of the DOM, of scene objects and of Math.random (a seeded
 * generator only), on a fixed tick, so it can be tested and a server could
 * run it. kart.ts is the view (the karts on screen, the camera, the sounds),
 * kart-ui.ts the menu, the HUD and the results.
 *
 * - A race is a course (kartpark.ts), a cup (how fast the rivals are and
 *   what the places pay), three laps, eight karts: you and seven rivals who
 *   follow the racing line, brake for corners, drift and use items, with a
 *   rubber band that keeps the pack close. A time trial is you alone, no
 *   items.
 * - Karts are arcade: speed tapers to the kart's top; steering is sharper
 *   at speed than a car's; a hop into a drift slides round a corner and
 *   builds a boost in three stages (let go to fire it). Boost pads on the
 *   track give a short burst. The hump throws a kart into the air; walls
 *   along both edges keep everyone on the track (scrape them and you lose
 *   speed). Karts bump each other: the heavier one wins.
 * - Items come from the item boxes, dealt by place (the leader gets
 *   defensive ones, the tail gets rockets and pigeons): a Rocket (boost), an
 *   Oil Slick (dropped behind: whoever drives through it spins), a Gummy
 *   Bomb (thrown, bounces along the track), a Homing Pigeon (chases the
 *   kart ahead), a Shield (soaks up one hit) and a Glow Trail (a line
 *   behind you that slows anyone crossing it). A hit spins a kart for a
 *   second; nothing ever hurts anyone.
 * - The track's surfaces count: a wet stretch halves the grip, the dirt
 *   shortcut caps speed (unless you're boosting) and banking adds grip. A
 *   kart that turns off at the shortcut's mouth runs its own line until it
 *   rejoins, its progress mapped onto the main line's.
 * - Engine classes (catalog.ts `KART_CLASSES`: Street, Sport, Neon) scale
 *   everyone's speed; a cup runs at its class, a time trial at the one you
 *   pick. `auto` lets the rivals' brain drive the player (the par ghost).
 * - Places are by progress round the loop; once you finish, the rest are
 *   placed by where they are. Prizes and records are paid by tycoon.ts
 *   (`finishKartRace`), not here.
 */
import { BOX_LATERALS, COURSES, F, GRID, KART_R, TRACK_HALF, along, at, frame, gridSlots, locate, wrapS, type Course, type CourseId, type Line } from './kartpark';
import { KART_CLASSES, type ClassId } from './catalog';
import { KART_SPECS, type KartId } from './mykart';

/** The sim's tick (seconds) */
export const TICK = 1 / 60;
export const COUNTDOWN = 3;
/** The usual lap count (a course can set its own) */
export const LAPS = 3;
/** On dirt a kart goes no faster than this share of its top speed, unless it's boosting */
export const DIRT_CAP = 0.55;

/* ---------- Cups ---------- */

export type CupId = 'rookie' | 'pro' | 'neon';
export interface Cup {
  id: CupId;
  name: string;
  blurb: string;
  /** Level needed to enter */
  level: number;
  /** The engine class it runs at, and the four courses of its series */
  cls: ClassId;
  courses: CourseId[];
  /** How fast the rivals go (a share of a fully tuned kart's pace) and how hard they race */
  ai: number;
  skill: number;
  /** What each place pays (Dorras), first to last */
  prizes: number[];
}
export const CUPS: Record<CupId, Cup> = {
  rookie: { id: 'rookie', name: 'Rookie Cup', blurb: 'Seven easy-going rivals at Street pace. Learn the loop, the drift and the items.', level: 1, cls: 'street', courses: ['neon-loop', 'summit', 'neon-reverse', 'grand'], ai: 0.8, skill: 0.5, prizes: [1500, 900, 600, 400, 300, 200, 150, 100] },
  pro: { id: 'pro', name: 'Pro Cup', blurb: 'Sport pace. The rivals brake later and throw harder. Bring a tuned kart.', level: 4, cls: 'sport', courses: ['summit', 'neon-reverse', 'grand', 'summit-reverse'], ai: 0.92, skill: 0.8, prizes: [4000, 2400, 1500, 1000, 700, 500, 350, 250] },
  neon: { id: 'neon', name: 'Neon Cup', blurb: 'Neon pace, flat out. The rivals drift every corner and never miss with a pigeon.', level: 9, cls: 'neon', courses: ['grand', 'neon-loop', 'summit-reverse', 'grand-reverse'], ai: 1.0, skill: 1, prizes: [10000, 6000, 3800, 2500, 1800, 1200, 900, 600] },
};
export const CUP_IDS = Object.keys(CUPS) as CupId[];
export const cup = (id: string) => CUPS[id as CupId] ?? null;

/* ---------- Items ---------- */

export type ItemId = 'rocket' | 'oil' | 'gummy' | 'pigeon' | 'shield' | 'trail';
export const ITEMS: Record<ItemId, { name: string; blurb: string }> = {
  rocket: { name: 'Rocket', blurb: 'A burst of speed.' },
  oil: { name: 'Oil Slick', blurb: 'Dropped behind you. Spins whoever drives through it.' },
  gummy: { name: 'Gummy Bomb', blurb: 'Thrown ahead (or behind). Bounces along the track and spins what it hits.' },
  pigeon: { name: 'Homing Pigeon', blurb: 'Chases the kart in front of you and spins it.' },
  shield: { name: 'Shield', blurb: 'Soaks up the next hit.' },
  trail: { name: 'Glow Trail', blurb: 'A line of light behind you. Anyone crossing it slows right down.' },
};
export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
/** What the boxes deal, by place: the leader gets defence, the tail gets catch-up */
const DEALS: { upTo: number; items: ItemId[] }[] = [
  { upTo: 1, items: ['oil', 'oil', 'gummy', 'shield', 'shield', 'trail'] },
  { upTo: 3, items: ['oil', 'gummy', 'gummy', 'shield', 'trail', 'pigeon', 'rocket'] },
  { upTo: 5, items: ['gummy', 'pigeon', 'pigeon', 'rocket', 'rocket', 'trail', 'shield'] },
  { upTo: 8, items: ['rocket', 'rocket', 'rocket', 'pigeon', 'pigeon', 'gummy'] },
];
/** How long things last (seconds) */
export const T = {
  roulette: 1.2,
  boxRespawn: 3,
  rocket: 2.2,
  shield: 15,
  trail: 2.6,
  trailLife: 4.5,
  oilLife: 25,
  gummyLife: 5,
  pigeonLife: 9,
  spin: 1.1,
  oilSpin: 0.85,
  slow: 1.1,
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
  /** Use the item (a press), and whether to send it behind */
  item: boolean;
  back: boolean;
}
export const NO_INPUT: KartInput = { throttle: 0, steer: 0, drift: false, item: false, back: false };

export interface Racer {
  i: number;
  kart: KartId;
  tune: KartTune;
  /** A rival's skill (0..1) and where across the track it likes to drive; null for the player */
  ai: { skill: number; offset: number; itemAt: number; cool: number } | null;
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
  /** Drifting: which way (0: not), for how long; the hop; the boost and how strong; a spin, a slowdown */
  drift: 0 | 1 | -1;
  driftT: number;
  hopT: number;
  boostT: number;
  boostK: number;
  spinT: number;
  spinLen: number;
  slowT: number;
  shield: boolean;
  shieldT: number;
  /** The item held, the roulette still spinning, and a trail being laid */
  item: ItemId | null;
  rouletteT: number;
  trailT: number;
  /** In the air after the hump, and the rise */
  air: boolean;
  vy: number;
  /** Scraping a wall or bumped (for sounds and sparks): seconds left */
  wallT: number;
  bumpT: number;
  /** Items landed on others */
  hits: number;
  /** The grip of the surface under it (1 = dry), for the slide */
  gripNow?: number;
  /** On the main line or the shortcut; s along whichever (the main's s is kept in `s` either way) */
  line: 'main' | 'short';
  sShort: number;
  /** The surface under it (kartpark.ts F flags) and its banking (radians, right side up), for the view */
  flags: number;
  roll: number;
}

export interface Hazard {
  kind: 'oil' | 'trail';
  x: number;
  z: number;
  y: number;
  s: number;
  owner: number;
  t: number;
}
export interface Missile {
  kind: 'gummy' | 'pigeon';
  x: number;
  z: number;
  y: number;
  yaw: number;
  /** Along the loop (the pigeon flies it; the gummy bounces across it) */
  s: number;
  lateral: number;
  vx: number;
  vz: number;
  owner: number;
  target: number;
  t: number;
  bounces: number;
}
export interface ItemBox {
  s: number;
  lateral: number;
  x: number;
  z: number;
  y: number;
  /** Seconds until it's back (0: there) */
  gone: number;
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
  | { kind: 'item'; kart: number; item: ItemId }
  | { kind: 'use'; kart: number; item: ItemId }
  | { kind: 'hit'; kart: number; by: number; item: ItemId | 'bump' }
  | { kind: 'shield'; kart: number }
  | { kind: 'bump'; kart: number; other: number; force: number }
  | { kind: 'wall'; kart: number; force: number }
  | { kind: 'jump'; kart: number }
  | { kind: 'land'; kart: number }
  | { kind: 'shortcut'; kart: number; on: boolean }
  | { kind: 'box'; box: number };

export interface RaceSetup {
  course: CourseId;
  /** A cup, or a time trial (alone, no items) */
  cup: CupId | 'time';
  /** The engine class (a cup's own when racing a cup) */
  cls?: ClassId;
  laps?: number;
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
/** How fast a kart turns at full lock (radians/s at speed) */
const TURN = 1.75;
/** Sideways push, the wall's limit */
const WALL = TRACK_HALF - KART_R;

export function createKartSim(setup: RaceSetup) {
  const course = COURSES[setup.course];
  const c = course;
  const r = rng(setup.seed);
  const laps = setup.laps ?? course.laps ?? LAPS;
  const timeTrial = setup.cup === 'time';
  const cupOf = timeTrial ? null : CUPS[setup.cup as CupId];
  const cls: ClassId = setup.cls ?? cupOf?.cls ?? 'sport';
  const sc = course.shortcut;
  /** The line a kart is on and its s along it */
  const lineOf = (k: Racer): { line: Line; s: number } => (k.line === 'short' && sc ? { line: sc, s: k.sShort } : { line: c, s: k.s });
  /** The main line's s for a point along the shortcut (its progress mapped onto the main's span) */
  const mainOfShort = (sShort: number) => (sc ? wrapS(c, sc.out + (along(c, sc.out, sc.in) * sShort) / sc.L) : 0);
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
      slowT: 0,
      shield: false,
      shieldT: 0,
      item: null,
      rouletteT: 0,
      trailT: 0,
      air: false,
      vy: 0,
      wallT: 0,
      bumpT: 0,
      hits: 0,
      line: 'main',
      sShort: 0,
      flags: 0,
      roll: 0,
    };
  };
  // The player starts at the back of the grid (the last slot); the rivals fill the rest from pole
  const rivals = timeTrial ? [] : setup.rivals.slice(0, GRID - 1);
  const playerSlot = timeTrial ? 0 : rivals.length;
  rivals.forEach((v, i) =>
    racers.push(mk(i, v.kart, v.tune, { skill: clamp((cupOf?.skill ?? 0.5) * (0.85 + r() * 0.3), 0.2, 1), offset: (r() - 0.5) * TRACK_HALF * 1.2, itemAt: 0, cool: 1 + r() * 2 }))
  );
  const player = mk(playerSlot, setup.player.kart, setup.player.tune, null);
  racers.push(player);
  const boxes: ItemBox[] = timeTrial
    ? []
    : c.boxes.flatMap((s) =>
        BOX_LATERALS.map((lateral) => {
          const p = at(c, s, lateral);
          return { s, lateral, x: p.x, z: p.z, y: p.y + 0.9, gone: 0 };
        })
      );
  const hazards: Hazard[] = [];
  const missiles: Missile[] = [];
  const events: KartEvent[] = [];
  let countdown = COUNTDOWN;
  let time = 0;
  let acc = 0;
  let started = false;
  let lastCount = Math.ceil(COUNTDOWN);
  let finishedCount = 0;
  let playerInput: KartInput = { ...NO_INPUT };
  const auto = !!setup.auto;
  /** The brain that drives the player when `auto` is on: steady, no items */
  const AUTO = { skill: 0.85, offset: 0, itemAt: -1e9, cool: 1e9 };

  /* ---------- Items ---------- */

  function deal(place: number): ItemId {
    const d = DEALS.find((x) => place <= x.upTo) ?? DEALS[DEALS.length - 1];
    return d.items[Math.floor(r() * d.items.length)];
  }
  function spin(k: Racer, by: number, item: ItemId | 'bump', len: number = T.spin) {
    if (k.finished) return;
    if (k.shield && item !== 'bump') {
      k.shield = false;
      k.shieldT = 0;
      events.push({ kind: 'shield', kart: k.i });
      return;
    }
    if (k.spinT > 0) return;
    // Armour: the Tank gets up twice as fast
    k.spinT = len * (1 - 0.5 * clamp(k.tune.weight - 0.6, 0, 0.4) / 0.4 * (k.kart === 'tank' ? 1 : 0));
    k.spinLen = k.spinT;
    k.speed *= 0.3;
    k.vx *= 0.3;
    k.vz *= 0.3;
    endDrift(k, false);
    k.boostT = 0;
    if (by >= 0 && by !== k.i && item !== 'bump') racers[by].hits++;
    events.push({ kind: 'hit', kart: k.i, by, item });
  }
  function use(k: Racer, back: boolean) {
    const item = k.item;
    if (!item || k.rouletteT > 0 || k.spinT > 0) return;
    k.item = null;
    events.push({ kind: 'use', kart: k.i, item });
    const fx = Math.cos(k.yaw);
    const fz = -Math.sin(k.yaw);
    switch (item) {
      case 'rocket':
        k.boostT = Math.max(k.boostT, T.rocket * k.tune.boost);
        k.boostK = 1.45;
        events.push({ kind: 'boost', kart: k.i, tier: 3 });
        break;
      case 'shield':
        k.shield = true;
        k.shieldT = T.shield;
        break;
      case 'trail':
        k.trailT = T.trail;
        break;
      case 'oil': {
        const s = k.s - 2;
        const p = at(c, s, clamp(k.lateral, -WALL, WALL));
        hazards.push({ kind: 'oil', x: p.x, z: p.z, y: p.y, s: wrapS(c, s), owner: k.i, t: T.oilLife });
        break;
      }
      case 'gummy': {
        const dir = back ? -1 : 1;
        const v = Math.max(0, k.speed) * dir + 14 * dir;
        const ahead = 1.1 * dir;
        missiles.push({
          kind: 'gummy',
          x: k.x + fx * ahead,
          z: k.z + fz * ahead,
          y: k.y + 0.4,
          yaw: k.yaw,
          s: k.s,
          lateral: k.lateral,
          vx: fx * v,
          vz: fz * v,
          owner: k.i,
          target: -1,
          t: T.gummyLife,
          bounces: 0,
        });
        break;
      }
      case 'pigeon': {
        // The kart ahead in the race; the leader's pigeon goes for whoever's behind
        const order = standings();
        const idx = order.indexOf(k.i);
        const target = idx > 0 ? order[idx - 1] : (order[1] ?? -1);
        missiles.push({ kind: 'pigeon', x: k.x, z: k.z, y: k.y + 0.8, yaw: k.yaw, s: k.s, lateral: k.lateral, vx: 0, vz: 0, owner: k.i, target, t: T.pigeonLife, bounces: 0 });
        break;
      }
    }
  }

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

  function think(k: Racer): KartInput {
    const ai = k.ai!;
    const skill = ai.skill;
    const { line, s } = lineOf(k);
    const half = line === c ? WALL : sc!.half - KART_R;
    // The racing line: a look-ahead point along the loop, across at this driver's offset (hugging the inside of bends a little)
    const ahead = 2.5 + k.speed * 0.32;
    let fr = frame(line, s + ahead);
    let bend = frame(line, s + ahead + 4).k;
    // Coming off the shortcut's end, look on down the main line
    if (line !== c && s + ahead > line.L) {
      fr = frame(c, sc!.in + (s + ahead - line.L));
      bend = frame(c, sc!.in + (s + ahead - line.L) + 4).k;
    }
    // At the shortcut's mouth, a boosting rival with the nerve takes it
    if (sc && k.line === 'main' && k.boostT > 0.4 && skill > 0.45 && along(c, k.s, sc.out) > -4 && along(c, k.s, sc.out) < 2) fr = frame(sc, 4);
    const want = clamp(ai.offset * (half / WALL) - bend * 6 * skill, -half + 0.3, half - 0.3);
    const tx = fr.x + fr.nx * want;
    const tz = fr.z + fr.nz * want;
    const heading = Math.atan2(-(tz - k.z), tx - k.x);
    const err = wrap(heading - k.yaw);
    let steer = clamp(-err * 2.2, -1, 1);
    // Brake for the corner ahead: the speed it can take, from its curvature
    let maxSpeed = Infinity;
    for (let d = 2; d <= 10; d += 2) {
      const ff = frame(line, s + d);
      const kk = Math.abs(ff.k);
      // Banking lets it carry more speed; a wet or dirt surface less
      const hold = (9 + skill * 6 + k.tune.handling * 3) * (ff.flags & F.bank ? 1.5 : 1) * ff.grip;
      if (kk > 0.02) maxSpeed = Math.min(maxSpeed, Math.sqrt(hold / kk) + (10 - d) * 0.25);
    }
    let throttle = k.speed > maxSpeed + 1.5 ? -0.4 : k.speed > maxSpeed ? 0 : 1;
    // Drift through the bends when it's going fast enough
    const turning = Math.abs(bend) > 0.11 && k.speed > k.tune.top * 0.55;
    let drift = k.drift !== 0 ? Math.abs(frame(c, k.s + 3).k) > 0.05 || k.driftT < 0.6 : turning && skill > 0.35;
    if (k.drift !== 0) steer = clamp(steer, k.drift > 0 ? -0.2 : -1, k.drift > 0 ? 1 : 0.2) * 1;
    if (k.drift !== 0 && k.drift * steer < -0.1) steer = 0;
    // Items: after a moment, or at once when it's a shield; oil and gummies go behind when someone's close
    let item = false;
    let back = false;
    if (k.item && k.rouletteT <= 0) {
      ai.itemAt += TICK;
      if (k.item === 'shield' || ai.itemAt > ai.cool) {
        item = true;
        ai.itemAt = 0;
        ai.cool = 1 + r() * 2.5;
        const behind = racers.some((o) => o.i !== k.i && !o.finished && along(c, o.s, k.s) > 0 && along(c, o.s, k.s) < 8);
        back = (k.item === 'oil' || k.item === 'gummy') && behind && k.place <= 3;
      }
    }
    return { throttle, steer, drift, item, back };
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

  function stepKart(k: Racer, inp: KartInput, dt: number) {
    const tn = k.tune;
    const spinning = k.spinT > 0;
    const live = started && !k.finished && !spinning;
    if (k.finished) inp = { ...NO_INPUT, throttle: 0.35 };
    if (!live) inp = { ...inp, throttle: k.finished ? inp.throttle : 0, steer: 0, drift: false, item: false };
    // Timers
    k.spinT = Math.max(0, k.spinT - dt);
    k.boostT = Math.max(0, k.boostT - dt);
    k.slowT = Math.max(0, k.slowT - dt);
    k.wallT = Math.max(0, k.wallT - dt);
    k.bumpT = Math.max(0, k.bumpT - dt);
    if (k.shield && (k.shieldT -= dt) <= 0) k.shield = false;
    if (k.rouletteT > 0 && (k.rouletteT -= dt) <= 0) {
      k.rouletteT = 0;
      k.item = deal(k.place);
      events.push({ kind: 'item', kart: k.i, item: k.item });
    }
    if (inp.item) use(k, inp.back);

    // Speed: gas, brake, the boost's extra top end, slowed by a trail, capped on dirt (unless boosting), scrubbed by a spin
    const boost = k.boostT > 0 ? k.boostK : 1;
    let top = tn.top * boost * (k.slowT > 0 ? 0.5 : 1);
    if (k.flags & F.dirt && k.boostT <= 0) top = Math.min(top, tn.top * DIRT_CAP);
    if (spinning) top = 0;
    const th = clamp(inp.throttle, -1, 1);
    if (k.air) {
      /* no gas in the air */
    } else if (k.boostT > 0 && th >= 0) k.speed = approach(k.speed, top, tn.accel * 2.5 * dt);
    else if (th > 0.02) k.speed += tn.accel * th * Math.max(0, 1 - (k.speed / top) ** 2) * dt;
    else if (th < -0.02) {
      if (k.speed > 0.3) k.speed = approach(k.speed, 0, 14 * -th * dt);
      else k.speed = approach(k.speed, -3 * -th, tn.accel * 0.6 * dt);
    } else k.speed = approach(k.speed, 0, (2.2 + Math.abs(k.speed) * 0.12) * dt);
    if (k.speed > top && !k.air) k.speed = approach(k.speed, top, (k.flags & F.dirt ? 12 : 6) * dt);
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
      const turn = TURN * (0.8 + tn.handling * 0.5) * clamp(k.speed / 3, 0, 1) / (1 + Math.abs(k.speed) / 28);
      if (k.drift !== 0) {
        const lean = 0.5 + 0.5 * k.drift * k.steer;
        yawRate = -k.drift * turn * (0.85 + lean * 0.75);
      } else yawRate = -k.steer * turn;
    }
    k.yaw += yawRate * dt;

    // The slide follows the nose (less in a drift, less on a wet or dirt surface, more on banking)
    const bankGrip = k.flags & F.bank ? 1.3 : 1;
    const grip = (k.drift !== 0 ? 2.4 + tn.handling * 0.8 : 6.5 + tn.handling * 4) * (k.gripNow ?? 1) * bankGrip;
    const kk = 1 - Math.exp(-grip * dt);
    const fx = Math.cos(k.yaw);
    const fz = -Math.sin(k.yaw);
    k.vx += (fx * k.speed - k.vx) * kk;
    k.vz += (fz * k.speed - k.vz) * kk;
    k.x += k.vx * dt;
    k.z += k.vz * dt;

    // Where that is on the loop (or the shortcut); the walls
    let ds = 0;
    let loc: ReturnType<typeof locate>;
    let wall = WALL;
    if (k.line === 'short' && sc) {
      loc = locate(sc, k.x, k.z, k.sShort, 6);
      k.sShort = loc.s;
      wall = sc.half - KART_R;
      const mainS = mainOfShort(k.sShort);
      ds = along(c, k.s, mainS);
      k.s = mainS;
      // Off the end: back on the main line
      if (k.sShort >= sc.L - 0.6) {
        k.line = 'main';
        k.s = wrapS(c, sc.in);
        loc = locate(c, k.x, k.z, k.s, 6);
        k.s = loc.s;
        wall = WALL;
        events.push({ kind: 'shortcut', kart: k.i, on: false });
      }
    } else {
      loc = locate(c, k.x, k.z, k.s, 6);
      ds = along(c, k.s, loc.s);
      k.s = loc.s;
      // Just past the shortcut's mouth and nearer its line than the main's: onto the shortcut
      if (sc && started && !k.finished) {
        const past = along(c, sc.out, k.s);
        if (past > 0 && past < 7) {
          const ls = locate(sc, k.x, k.z, Math.max(0, past), 6);
          if (ls.s > 0.5 && ls.s < sc.L - 1 && Math.abs(ls.lateral) < sc.half - KART_R && Math.abs(ls.lateral) < Math.abs(loc.lateral)) {
            k.line = 'short';
            k.sShort = ls.s;
            loc = ls;
            wall = sc.half - KART_R;
            events.push({ kind: 'shortcut', kart: k.i, on: true });
          }
        }
      }
    }
    k.lateral = loc.lateral;
    k.flags = loc.frame.flags;
    k.roll = loc.frame.roll;
    k.gripNow = loc.frame.grip;
    if (Math.abs(k.lateral) > wall) {
      const side = Math.sign(k.lateral);
      const f = loc.frame;
      const into = (k.vx * f.nx + k.vz * f.nz) * side;
      k.lateral = side * wall;
      k.x = f.x + f.nx * k.lateral;
      k.z = f.z + f.nz * k.lateral;
      if (into > 0) {
        k.vx -= f.nx * into * side;
        k.vz -= f.nz * into * side;
        const force = into;
        k.speed *= force > 3 ? 0.6 : 0.88;
        k.wallT = 0.25;
        if (force > 1.5) events.push({ kind: 'wall', kart: k.i, force });
        if (k.drift !== 0 && force > 3) endDrift(k, false);
      }
    }
    // Progress, laps, the finish
    if (started && !k.finished) {
      const before = k.progress;
      k.progress += ds;
      const lapBefore = Math.floor(before / c.L);
      const lapNow = Math.floor(k.progress / c.L);
      if (lapNow > lapBefore && lapNow >= 1) {
        k.lap = lapNow;
        if (lapNow >= laps) {
          k.finished = true;
          k.finishT = time;
          finishedCount++;
          placeAll();
          events.push({ kind: 'finish', kart: k.i, place: k.place, time });
        } else events.push({ kind: 'lap', kart: k.i, lap: lapNow + 1 });
      }
    }

    // Height: the track's surface, or the air over the hump
    const surface = loc.y;
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
      // Over the hump's top at speed the kart takes off
      const dh = c.hump >= 0 ? along(c, k.s, c.hump) : -1e9;
      if (dh >= 0 && dh < 1.2 && k.speed > 6 && !k.hopT) {
        k.air = true;
        k.vy = k.speed * 0.2;
        k.y = surface;
        events.push({ kind: 'jump', kart: k.i });
      } else k.y = surface;
    }

    // Boost pads
    if (!k.air && !spinning && started && !k.finished)
      for (const p of c.pads) {
        const d = along(c, p.s, k.s);
        if (d >= 0 && d < p.len && k.boostT < T.pad * 0.5) {
          k.boostT = T.pad * tn.boost;
          k.boostK = 1.4;
          events.push({ kind: 'pad', kart: k.i });
        }
      }
    // Item boxes
    if (!k.item && k.rouletteT <= 0 && started && !k.finished)
      for (let b = 0; b < boxes.length; b++) {
        const box = boxes[b];
        if (box.gone > 0) continue;
        if (Math.abs(along(c, box.s, k.s)) < 0.9 && Math.abs(k.lateral - box.lateral) < 1.05 && Math.abs(k.y - (box.y - 0.9)) < 1) {
          box.gone = T.boxRespawn;
          k.rouletteT = T.roulette;
          events.push({ kind: 'box', box: b });
          break;
        }
      }
    // Laying a trail
    if (k.trailT > 0) {
      k.trailT -= dt;
      const last = hazards.findLast((h) => h.kind === 'trail' && h.owner === k.i);
      if (!last || Math.hypot(last.x - k.x, last.z - k.z) > 0.6) hazards.push({ kind: 'trail', x: k.x, z: k.z, y: k.y, s: k.s, owner: k.i, t: T.trailLife });
    }
    // Hazards underfoot
    if (!k.air && !spinning && started && !k.finished)
      for (let h = hazards.length - 1; h >= 0; h--) {
        const z = hazards[h];
        if (Math.abs(z.y - k.y) > 0.8 || Math.hypot(z.x - k.x, z.z - k.z) > 0.75) continue;
        if (z.kind === 'oil') {
          hazards.splice(h, 1);
          spin(k, z.owner, 'oil', T.oilSpin);
        } else if (z.owner !== k.i && k.slowT <= 0) {
          k.slowT = T.slow;
          events.push({ kind: 'hit', kart: k.i, by: z.owner, item: 'trail' });
          racers[z.owner].hits++;
        }
      }
  }

  function stepMissiles(dt: number) {
    for (let m = missiles.length - 1; m >= 0; m--) {
      const p = missiles[m];
      p.t -= dt;
      if (p.t <= 0) {
        missiles.splice(m, 1);
        continue;
      }
      if (p.kind === 'gummy') {
        p.x += p.vx * dt;
        p.z += p.vz * dt;
        const loc = locate(c, p.x, p.z, p.s, 4);
        p.s = loc.s;
        p.lateral = loc.lateral;
        p.y = loc.y + 0.3 + Math.abs(Math.sin(p.t * 9)) * 0.35;
        if (Math.abs(p.lateral) > WALL) {
          const f = loc.frame;
          const side = Math.sign(p.lateral);
          const into = (p.vx * f.nx + p.vz * f.nz) * side;
          p.lateral = side * WALL;
          p.x = f.x + f.nx * p.lateral;
          p.z = f.z + f.nz * p.lateral;
          if (into > 0) {
            p.vx -= 2 * f.nx * into * side;
            p.vz -= 2 * f.nz * into * side;
            p.bounces++;
            if (p.bounces > 6) p.t = Math.min(p.t, 0.3);
          }
        }
        p.yaw = Math.atan2(-p.vz, p.vx);
      } else {
        const tgt = racers[p.target];
        const speed = 22;
        if (!tgt || tgt.finished) {
          p.t = 0;
          missiles.splice(m, 1);
          continue;
        }
        // Along the loop after its target, easing across to its line; the last stretch is a straight dash
        const gap = along(c, p.s, tgt.s);
        if (gap > 0 && gap < 3.5 && Math.abs(tgt.y - p.y) < 1.2) {
          const dx = tgt.x - p.x;
          const dz = tgt.z - p.z;
          const d = Math.hypot(dx, dz) || 1;
          p.x += (dx / d) * speed * dt;
          p.z += (dz / d) * speed * dt;
          const loc = locate(c, p.x, p.z, p.s, 4);
          p.s = loc.s;
          p.lateral = loc.lateral;
          p.y = loc.y + 0.8;
        } else {
          p.s = wrapS(c, p.s + speed * dt);
          p.lateral = approach(p.lateral, clamp(tgt.lateral, -WALL, WALL), 3 * dt);
          const q = at(c, p.s, p.lateral);
          p.yaw = Math.atan2(-(q.z - p.z), q.x - p.x);
          p.x = q.x;
          p.z = q.z;
          p.y = q.y + 0.8;
        }
      }
      // Hits
      for (const k of racers) {
        if (k.finished) continue;
        if (p.kind === 'gummy' && k.i === p.owner && p.t > T.gummyLife - 0.35) continue;
        if (p.kind === 'pigeon' && k.i === p.owner) continue;
        if (Math.abs(k.y - p.y) > 1.2 || Math.hypot(k.x - p.x, k.z - p.z) > 0.85) continue;
        missiles.splice(m, 1);
        spin(k, p.owner, p.kind);
        break;
      }
    }
    for (let h = hazards.length - 1; h >= 0; h--) if ((hazards[h].t -= dt) <= 0) hazards.splice(h, 1);
    for (const b of boxes) b.gone = Math.max(0, b.gone - dt);
  }

  /** Karts bump each other: pushed apart, the heavier one less */
  function bumps() {
    for (let a = 0; a < racers.length; a++)
      for (let b = a + 1; b < racers.length; b++) {
        const p = racers[a];
        const q = racers[b];
        if (Math.abs(p.y - q.y) > 0.9) continue;
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
            // A heavy kart ramming a light one hard sends it spinning
            if (into > 6 && !started) {
              /* (never on the grid) */
            } else if (into > 6.5 && p.tune.weight - q.tune.weight > 0.5) spin(q, p.i, 'bump', 0.7);
            else if (into > 6.5 && q.tune.weight - p.tune.weight > 0.5) spin(p, q.i, 'bump', 0.7);
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
    for (const k of racers) stepKart(k, k.ai ? think(k) : auto ? think({ ...k, ai: AUTO } as Racer) : playerInput, dt);
    playerInput = { ...playerInput, item: false };
    bumps();
    stepMissiles(dt);
    placeAll();
  }

  return {
    course,
    cup: cupOf,
    cls,
    laps,
    timeTrial,
    racers,
    player,
    boxes,
    hazards,
    missiles,
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
      playerInput = { ...inp, item: inp.item || playerInput.item };
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
