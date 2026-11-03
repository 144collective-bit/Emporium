/*
 * The Neon Mile's monorail (docs/strip-plan.md Phase 4; the owner's calls: a monorail behind the south row, three
 * stations, linked to the metro at its west end). DOM-free: the boot reads its solids, stations (places, doors) and
 * where the train is; the ride's card is monorail-ui.ts (loaded when first used), the drawing monorail3d.ts (the
 * Strip's chunk).
 *
 * - **The line** (`MONO`): a single concrete beam over the north bank avenue's median (as the metro's el keeps to an
 *   avenue's median), straight along it from `X0`, past the east ring avenue's junction, to `X1`, past the Strip's
 *   east end; the train straddles it, its floor at `FLOOR`.
 * - **Pillars** (`MONO_PILLARS`): T-shaped, in the median, every `GAP` or less, clear of the junctions the line
 *   passes over (the Parkway's).
 * - **Stations** (`MONO_STATIONS`): Downtown Link (by the east ring avenue, a short walk to the metro's Downtown
 *   station), Neon Mile West, Neon Mile Central and The Sphere (each at the back of a walk between two resorts, off
 *   the boulevard). Each a platform on the beam's north side over the avenue's westbound lanes, a skybridge over the
 *   sidewalk to its lift tower, the tower's door at street level and the spot you arrive at facing out of it.
 * - **The train** (`MONO_TRAIN`): three cars on a timetable (`monoAt()`), a function of the clock, the same for
 *   everyone: from the Link out to The Sphere and back, stopping at every station (`MONO_DWELL`).
 * - **Rides** (`monoRide()`): straight from one station to another, a gentle start and stop, `MONO_RIDE_MAX` at most;
 *   `monoResume()` is where the timetable picks up from a station the train has just stopped at.
 * - `MONO_SOLIDS` (in `SOLIDS`: the pillars, the towers). Made-up names only.
 */
import { EW_ROADS, RING_HI } from './layout';
import { ROWS, parkwayX } from './strip';

type Pt = [number, number];
type Rect = [number, number, number, number];
type Box = [number, number, number, number, number];

const BANK = EW_ROADS.find((r) => r.c === RING_HI)!;
/** The slab's top (world.ts SLAB) */
const SLAB_Y = 0.15;

/** The line: along the north bank avenue's middle, from X0 to X1; the beam's bottom and top, its width; the cars' floor */
export const MONO = { z: BANK.c, x0: 73, x1: 231, y0: 6.3, y1: 7.3, w: 0.9 };
export const FLOOR = MONO.y1 + 0.15;
/** Pillars no further apart than this */
export const GAP = 10;
/** A pillar's column (square) and its head across the beam */
export const PILLAR = { w: 0.5, head: 1.6 };
/** Junctions the line passes over: no pillar within `CLEAR` of them */
const JUNCTIONS = [parkwayX(BANK.c)];
const CLEAR = 7;

export const MONO_PILLARS: Pt[] = (() => {
  const out: Pt[] = [];
  const n = Math.ceil((MONO.x1 - MONO.x0) / GAP);
  for (let k = 0; k <= n; k++) {
    let x = MONO.x0 + 1 + ((MONO.x1 - MONO.x0 - 2) * k) / n;
    const j = JUNCTIONS.find((c) => Math.abs(x - c) < CLEAR);
    // (moved off a junction to its nearer side)
    if (j !== undefined) x = x < j ? j - CLEAR : j + CLEAR;
    if (!out.some((p) => Math.abs(p[0] - x) < 2)) out.push([x, MONO.z]);
  }
  return out;
})();

/* ---------- Stations ---------- */

export interface MonoStation {
  id: string;
  name: string;
  /** Its middle along the line */
  x: number;
  /** The platform beside the beam (north), at `FLOOR` */
  platform: Rect;
  /** The lift tower on the ground, its top at the platform's height */
  tower: Rect;
  /** The skybridge from the tower's top to the platform */
  bridge: Rect;
  /** Its door at street level, the way it faces out */
  door: { x: number; z: number };
  face: Pt;
  /** Where you arrive, a few steps out of the door facing away from it */
  at: { x: number; z: number; yaw: number };
}
/** How long a platform is (the train's three cars and a margin), how deep */
export const PLATFORM = { len: 12, depth: 2.2 };
const TOWER = { w: 2.4, d: 2.4 };
/** The platform's edge by the train: the cars' half-width (MONO_TRAIN.w / 2) and a gap off the beam's middle */
const north = BANK.c - 0.75 - 0.08;
const platform = (x: number): Rect => [x - PLATFORM.len / 2, north - PLATFORM.depth, x + PLATFORM.len / 2, north];
/** The south row's back edge (the lots), where the Strip's towers stand */
const BACK = ROWS.south[1];
/**
 * A Strip station: its tower at the back of the walk between two resorts (x), on the lot behind the sidewalk, its
 * door on its south face to the walk (and the boulevard beyond)
 */
function stripStation(id: string, name: string, x: number): MonoStation {
  const tower: Rect = [x - TOWER.w / 2, BACK - 0.2 - TOWER.d, x + TOWER.w / 2, BACK - 0.2];
  return {
    id,
    name,
    x,
    platform: platform(x),
    tower,
    bridge: [x - 0.9, tower[3] - 0.4, x + 0.9, north - PLATFORM.depth + 0.2],
    door: { x, z: tower[1] - 0.35 },
    face: [0, -1],
    at: { x, z: tower[1] - 2.4, yaw: 0 },
  };
}
/** The Link: its tower on the lawn north of the avenue, east of the ring avenue, its door to the west (the metro) */
const LINK_X = 80.5;
const linkTower: Rect = [LINK_X - TOWER.w / 2, BANK.c - BANK.half - 0.8 - 0.1 - TOWER.d, LINK_X + TOWER.w / 2, BANK.c - BANK.half - 0.8 - 0.1];
export const MONO_STATIONS: MonoStation[] = [
  {
    id: 'link',
    name: 'Downtown Link',
    x: LINK_X,
    platform: platform(LINK_X),
    tower: linkTower,
    bridge: [LINK_X - 0.9, linkTower[3] - 0.4, LINK_X + 0.9, north - PLATFORM.depth + 0.2],
    door: { x: linkTower[0] - 0.35, z: (linkTower[1] + linkTower[3]) / 2 },
    face: [-1, 0],
    at: { x: linkTower[0] - 2.4, z: (linkTower[1] + linkTower[3]) / 2, yaw: Math.PI / 2 },
  },
  // (the walks between the Gondolier and Lava Lagoon, Lava Lagoon and Orbit, Orbit and the Sphere's lot)
  stripStation('west', 'Neon Mile West', 163.2),
  stripStation('central', 'Neon Mile Central', 197.5),
  stripStation('east', 'The Sphere', 224.4),
];
export const monoStation = (id: string) => MONO_STATIONS.find((s) => s.id === id);

/* ---------- The train and its timetable ---------- */

/** Three cars, their length and gap; how wide and how tall (from the floor), the cruising speed (tiles a second) */
export const MONO_TRAIN = { cars: 3, car: 3.4, gap: 0.25, w: 1.5, h: 1.9, speed: 8 };
export const TRAIN_LEN = MONO_TRAIN.cars * MONO_TRAIN.car + (MONO_TRAIN.cars - 1) * MONO_TRAIN.gap;
/** Seconds at each station */
export const MONO_DWELL = 12;
/** A run of `d` tiles: how long, with a gentle start and stop */
const runTime = (d: number) => d / MONO_TRAIN.speed + 3;
/** Where along a run of `d` tiles the train is `u` (0 to 1) of its time in: easing in and out (a cosine profile) */
const runAt = (u: number) => u - Math.sin(2 * Math.PI * u) / (2 * Math.PI);

/** The timetable: out from the Link to the Sphere and back, stopping at each */
const ORDER = [...MONO_STATIONS, ...MONO_STATIONS.slice(1, -1).reverse()];
interface Leg {
  from: number;
  to: number;
  t0: number;
  /** Dwelling at `from` until `t0 + MONO_DWELL`, then running to `to` */
  run: number;
}
const LEGS: Leg[] = (() => {
  const out: Leg[] = [];
  let t = 0;
  ORDER.forEach((s, i) => {
    const n = ORDER[(i + 1) % ORDER.length];
    const run = runTime(Math.abs(n.x - s.x));
    out.push({ from: s.x, to: n.x, t0: t, run });
    t += MONO_DWELL + run;
  });
  return out;
})();
/** Seconds for the train to go out and back */
export const MONO_PERIOD = LEGS.reduce((s, l) => s + MONO_DWELL + l.run, 0);

export interface MonoPos {
  /** The train's middle along the line */
  x: number;
  /** Which way it faces (+1 east) */
  dir: 1 | -1;
  /** At a station (its doors open) */
  stopped: boolean;
}
/** The train at the clock's t (seconds) */
export function monoAt(t: number): MonoPos {
  const s = ((t % MONO_PERIOD) + MONO_PERIOD) % MONO_PERIOD;
  let leg = LEGS[LEGS.length - 1];
  for (const l of LEGS) if (s >= l.t0) leg = l;
  const dir = leg.to >= leg.from ? 1 : -1;
  const u = s - leg.t0;
  if (u < MONO_DWELL) return { x: leg.from, dir, stopped: true };
  const p = runAt(Math.min(1, (u - MONO_DWELL) / leg.run));
  return { x: leg.from + (leg.to - leg.from) * p, dir, stopped: false };
}

/** The ride from one station straight to another: where the train is `t` seconds in, and how long it takes */
export function monoRide(from: string, to: string, t: number): MonoPos & { total: number } {
  const a = monoStation(from)!;
  const b = monoStation(to)!;
  const total = runTime(Math.abs(b.x - a.x));
  const dir = b.x >= a.x ? 1 : -1;
  const p = runAt(Math.min(1, Math.max(0, t / total)));
  return { x: a.x + (b.x - a.x) * p, dir, stopped: t >= total, total };
}
export const MONO_RIDE_MAX = Math.max(...MONO_STATIONS.flatMap((a) => MONO_STATIONS.map((b) => monoRide(a.id, b.id, 0).total)));
/**
 * Where the timetable picks up after a ride ended at station `id` going `dir`: the clock time (within a period) at
 * which the train is there, just stopped, heading on that way (or turning back at an end)
 */
export function monoResume(id: string, dir: 1 | -1): number {
  const s = monoStation(id)!;
  const from = LEGS.filter((l) => l.from === s.x);
  // (on, the way it was going; at an end, the only way: back)
  return (from.find((l) => Math.sign(l.to - l.from) === dir) ?? from[0]).t0;
}

/* ---------- Solids ---------- */

export const MONO_PILLAR_SOLIDS: Box[] = MONO_PILLARS.map(([x, z]): Box => [x - PILLAR.w / 2, z - PILLAR.w / 2, x + PILLAR.w / 2, z + PILLAR.w / 2, SLAB_Y + MONO.y1]);
export const MONO_SOLIDS: Box[] = [...MONO_PILLAR_SOLIDS, ...MONO_STATIONS.map((s): Box => [...s.tower, SLAB_Y + FLOOR] as Box)];

/* ---------- What the drawing shows ---------- */

/**
 * The train as the drawing places it (monorail3d.ts reads it every frame): on its timetable shifted by `shift`
 * seconds, or held where a ride (monorail-ui.ts) has it
 */
export const MONO_VIEW: { hold: MonoPos | null; shift: number } = { hold: null, shift: 0 };
