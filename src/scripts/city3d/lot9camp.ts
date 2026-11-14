/*
 * The Field (docs/trailer-plan.md's polish round, the owner's call: "a lived in feel that has everything a long term
 * trailer park / camp site... almost a rough camp on a large scale"; DOM-free, the chunk's, tested in
 * tests/lot9camp.test.ts): Lot 9's camp on the land just south of the park (lot9.ts `FIELD`: it stood west of the park
 * until the owner's call of 2026-11-14 moved it as a block, `CAMP_SHIFT`), round its dirt track (`TRACK_LOOP`, and
 * `TRACK_SPUR` in off the park's south lane down the strip east of it).
 *
 * - **The commons** inside the loop and by the way in (`COMMONS`): the shower and toilet block, the porta-potties,
 *   the standpipe and its trough, the big fire circle with its log benches, the camp kitchen (a tarp roof over
 *   tables, a grill, a sink), the firewood pile and its honour box, a washing line, the dumpster corral, the notice
 *   board, THE FIELD over the track's gap in the camp's east side (the old fence line), the vegetable patch and the
 *   chicken coop.
 * - **The pitches** (`PITCHES`): laid by a seeded planner along both sides of the track and in the back corners,
 *   each facing the track, nothing on one touching the track, a tree, a lamp, the commons or another pitch: tents
 *   (domes, ridge tents, family cabin tents), travel trailers and teardrops, vans with their awnings, pallet-and-tarp
 *   shacks and bus conversions; round each its living (a fire ring with chairs, a tarp canopy over a table, a camp
 *   stove), its car, and what a long stay gathers (washing lines, coolers, jerrycans, generators, firewood, solar
 *   panels, pallet windbreaks, a dish, flags, lanterns, potted plants, a tied-out dog).
 * - `CAMP_SOLIDS` (joined through `addSolids()` when the chunk loads), `CAMP_CARS`, `CAMP_PEOPLE` (the crowd's spare
 *   slots), `CAMP_DOGS`. Every name is made up; everything is under the Emporium.
 */
import { CARS, type CarId } from './carspec';
import { CAMP_SHIFT, CAMP_X1, FIELD, FIELD_TREES, INNER_GAPS, LOT9_LAMPS, MOVED, ROAD_Z, TRACK_HALF, TRACK_LOOP, TRACK_SPUR, carBox, fromTrack, rng, type Box, type Pt, type Rect } from './lot9';
import type { Idle } from './landmarks';

/* ---------- What's placed ---------- */

export type ItemKind =
  | 'dome'
  | 'ridge'
  | 'cabin'
  | 'trailer'
  | 'teardrop'
  | 'shack'
  | 'bus'
  | 'fire'
  | 'chair'
  | 'table'
  | 'canopy'
  | 'awning'
  | 'line'
  | 'cooler'
  | 'jerry'
  | 'generator'
  | 'wood'
  | 'flag'
  | 'lantern'
  | 'solar'
  | 'pallets'
  | 'dish'
  | 'plants'
  | 'stake'
  | 'stove'
  | 'deck';
/** Something placed: its middle, its turn (three's rotateY: its own x along (cos ry, -sin ry)), its size along its own x
 * (`w`) and z (`d`), its height; `tone` picks its colour, `lit` whether a fire's burning, `to` the far end of a line */
export interface Item {
  kind: ItemKind;
  x: number;
  z: number;
  ry: number;
  w: number;
  d: number;
  h: number;
  tone: number;
  lit?: boolean;
  to?: Pt;
}
export type PitchKind = 'dome' | 'ridge' | 'cabin' | 'trailer' | 'teardrop' | 'shack' | 'bus' | 'van';
export interface Pitch {
  id: string;
  kind: PitchKind;
  /** Its frame: where it starts off the track, and the way it faces away from it (ry, as an item's) */
  x: number;
  z: number;
  ry: number;
  items: Item[];
  seed: number;
}

/** A rotated rect's corners */
export function cornersOf(it: { x: number; z: number; ry: number; w: number; d: number }): Pt[] {
  const [c, s] = [Math.cos(it.ry), Math.sin(it.ry)];
  // (its own x is (c, -s) in the world, its own z (s, c))
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([a, b]): Pt => [it.x + (c * a * it.w) / 2 + (s * b * it.d) / 2, it.z - (s * a * it.w) / 2 + (c * b * it.d) / 2]);
}
/** The box round a rotated rect */
export function aabbOf(it: { x: number; z: number; ry: number; w: number; d: number }): Rect {
  const p = cornersOf(it);
  const xs = p.map((q) => q[0]);
  const zs = p.map((q) => q[1]);
  return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
}
const grow = (r: Rect, m: number): Rect => [r[0] - m, r[1] - m, r[2] + m, r[3] + m];
const overlap = (a: Rect, b: Rect) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
const rectDist = (r: Rect, x: number, z: number) => Math.hypot(Math.max(r[0] - x, x - r[2], 0), Math.max(r[1] - z, z - r[3], 0));

/* ---------- The commons ---------- */

/** Where the camp moved to (lot9.ts `CAMP_SHIFT`): the commons' numbers are where they stood before, plus these */
const X = CAMP_SHIFT.dx;
const Z = MOVED + CAMP_SHIFT.dz;

/** A thing of the commons: an item, solid or not */
const C = (kind: ItemKind, x: number, z: number, ry: number, w: number, d: number, h: number, tone = 0): Item => ({ kind, x, z, ry, w, d, h, tone });
export const SHOWERS = { rect: [-171 + X, 361.5 + Z, -161 + X, 365.5 + Z] as Rect, h: 2.05 };
/** The shower block's doors on its south side (into the middle): showers, then toilets */
export const SHOWER_DOORS: Pt[] = [
  [-169.2 + X, SHOWERS.rect[3]],
  [-166.8 + X, SHOWERS.rect[3]],
  [-163.6 + X, SHOWERS.rect[3]],
];
export const POTTIES: Rect[] = [0, 1, 2].map((k): Rect => [-160.4 + X + k * 1.2, 362 + Z, -159.3 + X + k * 1.2, 363.1 + Z]);
export const POTTY_H = 2.1;
/** The standpipe and its trough */
export const STANDPIPE: Pt = [-163.2 + X, 369 + Z];
export const TROUGH: Rect = [-164.4 + X, 369.5 + Z, -162 + X, 370.1 + Z];
/** The big fire circle: its ring, the log benches round it */
export const CIRCLE = { x: -168 + X, z: 381.5 + Z, r: 0.85 };
export const LOGS: Item[] = [0, 1, 2, 3, 4].map((k) => {
  const a = (k / 5) * Math.PI * 2 + 0.4;
  const [x, z] = [CIRCLE.x + Math.cos(a) * 3.1, CIRCLE.z + Math.sin(a) * 3.1];
  // (a log lies across the way to the fire: its own x along the circle)
  return C('wood', x, z, Math.atan2(Math.cos(a), -Math.sin(a)) - Math.PI / 2, 1.8, 0.42, 0.4);
});
/** The camp kitchen: a tarp roof on posts over two tables, the grill and the sink at its back */
export const KITCHEN: Rect = [-158 + X, 382 + Z, -151.2 + X, 388 + Z];
export const KITCHEN_TABLES: Item[] = [
  C('table', -156.2 + X, 384.4 + Z, 0, 2.0, 1.5, 0.75),
  C('table', -153.0 + X, 384.4 + Z, 0, 2.0, 1.5, 0.75),
];
export const GRILL: Rect = [-157.4 + X, 386.8 + Z, -156.0 + X, 387.5 + Z];
export const SINK: Rect = [-153.6 + X, 386.9 + Z, -152.2 + X, 387.5 + Z];
/** The firewood pile and its honour box */
export const WOODPILE: Rect = [-180 + X, 371 + Z, -177 + X, 373 + Z];
/** The commons' washing line */
export const WASHING: [Pt, Pt] = [
  [-179 + X, 386.4 + Z],
  [-175 + X, 389.2 + Z],
];
/** The dumpster corral by the way in, and the dumpsters in it */
export const CORRAL: Rect = [-139.5 + X, 381 + Z, -133.5 + X, 385 + Z];
export const DUMPSTERS: Rect[] = [
  [-139 + X, 381.6 + Z, -136.6 + X, 383.6 + Z],
  [-136.2 + X, 381.6 + Z, -133.8 + X, 383.6 + Z],
];
/** The notice board by the way in */
export const NOTICE: Pt = [-130.6 + X, 373.8 + Z];
/** THE FIELD over the gap in the old fence where the track goes through: its two poles */
export const FIELD_ARCH: [Pt, Pt] = [
  [CAMP_X1 - 0.3, INNER_GAPS[1][0] + 0.3],
  [CAMP_X1 - 0.3, INNER_GAPS[1][1] - 0.3],
];
/** The vegetable patch (raised beds) and the chicken coop with its run, in the Field's north-east corner */
export const GARDEN: Rect = [-143 + X, 345 + Z, -133 + X, 351.4 + Z];
export const BEDS: Rect[] = [0, 1, 2, 3].map((k): Rect => [GARDEN[0] + 0.6 + k * 2.4, GARDEN[1] + 0.8, GARDEN[0] + 2.2 + k * 2.4, GARDEN[3] - 0.8]);
export const COOP: Rect = [-132.4 + X, 345 + Z, -130 + X, 347.4 + Z];
export const COOP_RUN: Rect = [-132.4 + X, 347.6 + Z, -129.6 + X, 350.6 + Z];
/** What the commons cover (the planner keeps the pitches off them, with room round) */
const COMMON_RECTS: Rect[] = [SHOWERS.rect, ...POTTIES, TROUGH, [CIRCLE.x - 4.2, CIRCLE.z - 4.2, CIRCLE.x + 4.2, CIRCLE.z + 4.2], KITCHEN, WOODPILE, [WASHING[0][0], WASHING[0][1], WASHING[1][0], WASHING[1][1]], CORRAL, [NOTICE[0] - 0.8, NOTICE[1] - 0.4, NOTICE[0] + 0.8, NOTICE[1] + 0.4], GARDEN, COOP, COOP_RUN];
/** The ways through the camp's east side's gaps kept open (the walk in from the strip, the track's mouth) */
const WAYS: Rect[] = [
  [CAMP_X1 - 7, INNER_GAPS[0][0], CAMP_X1, INNER_GAPS[0][1]],
  [CAMP_X1 - 6, INNER_GAPS[1][0] - 1, CAMP_X1, INNER_GAPS[1][1] + 1],
];

/** By the old park's gate (the strip between the east lane and the fence): the dumpsters north of the office; south of
 * the laundry the propane exchange cage, the ice chest and the drinks machine, all facing the lane (west) */
export const GATE_DUMPSTERS: Rect[] = [
  [-28, 359.5 + MOVED, -25.6, 361.5 + MOVED],
  [-25.4, 359.5 + MOVED, -23, 361.5 + MOVED],
];
export const ICE: Rect = [-27.9, 386.5 + MOVED, -26.3, 387.3 + MOVED];
export const VENDING: Rect = [-25.6, 386.4 + MOVED, -24.5, 387.2 + MOVED];
export const PROPANE_CAGE: Rect = [-28, 388.3 + MOVED, -26.2, 389.7 + MOVED];
export const GATE_SOLIDS: Box[] = [...GATE_DUMPSTERS.map((r): Box => [...r, 1.3]), [...ICE, 1.0], [...VENDING, 1.75], [...PROPANE_CAGE, 1.45]];

/** The commons' solids */
export const COMMON_SOLIDS: Box[] = [
  [...SHOWERS.rect, SHOWERS.h + 0.2],
  ...POTTIES.map((r): Box => [...r, POTTY_H]),
  [...TROUGH, 0.55],
  [STANDPIPE[0] - 0.08, STANDPIPE[1] - 0.08, STANDPIPE[0] + 0.08, STANDPIPE[1] + 0.08, 0.95],
  [CIRCLE.x - CIRCLE.r * 0.7, CIRCLE.z - CIRCLE.r * 0.7, CIRCLE.x + CIRCLE.r * 0.7, CIRCLE.z + CIRCLE.r * 0.7, 0.3],
  ...KITCHEN_TABLES.map((t): Box => [...inner(t)[0], t.h]),
  [...GRILL, 0.95],
  [...SINK, 0.9],
  [...WOODPILE, 1.05],
  ...DUMPSTERS.map((r): Box => [...r, 1.3]),
  ...BEDS.map((r): Box => [...r, 0.32]),
  [...COOP, 1.35],
  [...COOP_RUN, 0.95],
];

/* ---------- Solids of a rotated thing: squares along its length, each the box inside it (never solid where it isn't) ---------- */

export function inner(it: { x: number; z: number; ry: number; w: number; d: number }): Rect[] {
  const long = Math.max(it.w, it.d);
  const short = Math.min(it.w, it.d);
  const n = Math.max(1, Math.ceil(long / short - 0.25));
  const [c, s] = [Math.cos(it.ry), Math.sin(it.ry)];
  // (the long axis in the world)
  const [ax, az] = it.w >= it.d ? [c, -s] : [s, c];
  const half = (short / 2) / (Math.abs(c) + Math.abs(s));
  const out: Rect[] = [];
  for (let k = 0; k < n; k++) {
    const o = n === 1 ? 0 : -long / 2 + short / 2 + ((long - short) * k) / (n - 1);
    const [x, z] = [it.x + ax * o, it.z + az * o];
    out.push([x - half, z - half, x + half, z + half]);
  }
  return out;
}

/* ---------- The planner ---------- */

const LAMPS: Pt[] = LOT9_LAMPS.map(([x, z]): Pt => [x, z]);
/** Everything placed so far (with what's fixed), as boxes */
const taken: Rect[] = [...COMMON_RECTS.map((r) => grow(r, 0.9)), ...WAYS];
type Foot = { x: number; z: number; ry: number; w: number; d: number };
/** Do two turned rects overlap, `m` round the first (the separating axes: each one's own two) */
export function crosses(a: Foot, b: Foot, m = 0) {
  const ga = { ...a, w: a.w + 2 * m, d: a.d + 2 * m };
  const [pa, pb] = [cornersOf(ga), cornersOf(b)];
  for (const r of [ga.ry, b.ry])
    for (const [ax, az] of [
      [Math.cos(r), -Math.sin(r)],
      [Math.sin(r), Math.cos(r)],
    ]) {
      const pr = (p: Pt[]) => p.map((q) => q[0] * ax + q[1] * az);
      const [A, B] = [pr(pa), pr(pb)];
      if (Math.max(...A) <= Math.min(...B) || Math.max(...B) <= Math.min(...A)) return false;
    }
  return true;
}
/** Is this footprint clear: in the Field, off the track, the trees and lamps, everything other pitches and the
 * commons have taken, and this pitch's own things (`mine`, turned as they are), `m` round it */
function clear(it: Foot, m: number, mine: Foot[], track = TRACK_HALF + 0.35) {
  const box = aabbOf(it);
  if (box[0] < FIELD[0] + 0.6 || box[2] > FIELD[2] - 0.6 || box[1] < FIELD[1] + 0.6 || box[3] > FIELD[3] - 0.6) return false;
  const g = grow(box, m);
  if (taken.some((t) => overlap(t, g))) return false;
  if (mine.some((o) => crosses(it, o, m))) return false;
  for (const [x, z, s] of FIELD_TREES) if (rectDist(box, x, z) < 0.7 + s * 0.35) return false;
  for (const [x, z] of LAMPS) if (rectDist(box, x, z) < 0.7) return false;
  // (off the track: its corners, edges and middle)
  const p = cornersOf(it);
  const pts: Pt[] = [...p, [it.x, it.z]];
  for (let i = 0; i < 4; i++) {
    const [a, b] = [p[i], p[(i + 1) % 4]];
    for (const t of [0.25, 0.5, 0.75]) pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return pts.every(([x, z]) => fromTrack(x, z) > track);
}

/** The pitches' shelters: size along the track (w), back from it (d), height; how far they may turn off square */
const SHELTER: Record<PitchKind, { w: number; d: number; h: number; turn: number }> = {
  dome: { w: 2.2, d: 2.2, h: 1.25, turn: 0.5 },
  ridge: { w: 1.8, d: 2.6, h: 1.2, turn: 0.4 },
  cabin: { w: 3.4, d: 2.8, h: 1.75, turn: 0.25 },
  trailer: { w: 4.6, d: 2.1, h: 1.75, turn: 0.12 },
  teardrop: { w: 2.6, d: 1.5, h: 1.15, turn: 0.15 },
  shack: { w: 3.0, d: 2.6, h: 1.9, turn: 0.12 },
  bus: { w: 7.6, d: 2.3, h: 1.8, turn: 0.08 },
  van: { w: CARS.van.L, d: CARS.van.W, h: 1.6, turn: 0.1 },
};
const KINDS: [PitchKind, number][] = [
  ['dome', 0.26],
  ['ridge', 0.1],
  ['cabin', 0.12],
  ['trailer', 0.15],
  ['teardrop', 0.05],
  ['shack', 0.15],
  ['bus', 0.06],
  ['van', 0.11],
];
/** The kinds not laid yet (the planner's) */
const WANT: PitchKind[] = ['bus', 'trailer', 'teardrop', 'shack', 'van', 'cabin', 'ridge', 'dome'];
const CAR_MODELS: CarId[] = ['hatch', 'sedan', 'pickup', 'suv', 'classic', 'pickup', 'hatch', 'sedan'];
export const CAR_PAINTS = ['#7a4b3a', '#5b6a73', '#a29a86', '#3d4a5c', '#8a2e2e', '#c9b77b', '#2f3b2f', '#6b5a7a', '#b9b3a6', '#4d3b2c', '#9a6a3a'];

/** Car heading (cars.ts: ry 0 is +x, heading (cos ry, -sin ry)) from a way (dx, dz) */
const carRy = (dx: number, dz: number) => Math.atan2(-dz, dx);

export const CAMP_CARS: [CarId, number, number, number, string][] = [];
const carBoxes: Box[] = [];

/** A pitch at a frame: O the frame's start, n the way away from the track (unit) */
function pitch(id: string, ox: number, oz: number, nx: number, nz: number, r: () => number, busCount: { n: number }): Pitch | null {
  // (its own x along the track, its own z away from it: three's rotateY(ry) takes z to (sin ry, cos ry))
  const ry = Math.atan2(nx, nz);
  const [tx, tz] = [nz, -nx];
  const at = (u: number, v: number): Pt => [ox + tx * u + nx * v, oz + tz * u + nz * v];
  // The kind (one bus or two in all)
  let roll = r();
  let kind: PitchKind = 'dome';
  for (const [k, w] of KINDS) {
    if (roll < w) {
      kind = k;
      break;
    }
    roll -= w;
  }
  if (kind === 'bus' && busCount.n >= 2) kind = 'shack';
  // (every kind of stay at least once: now and then a kind not yet laid takes the turn)
  if (WANT.length && r() < 0.4) kind = WANT[0];
  const S = SHELTER[kind];
  const items: Item[] = [];
  const tone = Math.floor(r() * 1000);
  const turn = (r() - 0.5) * 2 * S.turn;
  const back = 0.4 + r() * 1.2;
  const su = (r() - 0.5) * 1.2;
  const [sx, sz] = at(su, back + S.d / 2);
  const main: Item = { kind: kind === 'van' ? 'awning' : kind, x: sx, z: sz, ry: ry + turn, w: S.w, d: S.d, h: S.h, tone };
  /** This pitch's footprints so far (its things and its car), joined to what's taken when it's done */
  const mine: Foot[] = [];
  if (!clear(main, 0.5, mine)) return null;
  const place = (it: Item, m = 0.25) => {
    if (!clear(it, m, mine)) return false;
    items.push(it);
    mine.push(it);
    return true;
  };
  // (the van is a car: parked along the track, its awning out of its far side)
  if (kind === 'van') {
    const vry = ry + turn;
    const car: [CarId, number, number, number, string] = ['van', sx, sz, vry, CAR_PAINTS[tone % CAR_PAINTS.length]];
    const box = carBox('van', sx, sz, vry);
    CAMP_CARS.push(car);
    carBoxes.push(box);
    mine.push({ x: sx, z: sz, ry: vry, w: S.w, d: S.d });
    // (the awning off its far side, on two poles)
    const [ax, az] = at(su, back + S.d + 1.25);
    place({ kind: 'awning', x: ax, z: az, ry: ry + turn, w: S.w * 0.7, d: 2.1, h: 1.9, tone }, 0.05);
  } else {
    items.push(main);
    mine.push(main);
    if (kind === 'bus') busCount.n++;
  }
  if (WANT.includes(kind)) WANT.splice(WANT.indexOf(kind), 1);
  const lived = kind !== 'dome' && kind !== 'ridge' && kind !== 'teardrop';
  // The living area to one side: a fire ring, chairs round it, sometimes a canopy over a table behind it
  const side = r() < 0.5 ? 1 : -1;
  const fu = su + side * (S.w / 2 + 1.9 + r() * 0.6);
  const [fxp, fzp] = at(fu, back + 1.1 + r() * 1.2);
  const fire: Item = { kind: 'fire', x: fxp, z: fzp, ry: r() * 3, w: 0.9, d: 0.9, h: 0.25, tone, lit: r() < 0.42 };
  if (place(fire, 0.9)) {
    const chairs = 2 + Math.floor(r() * 2.2);
    for (let c = 0; c < chairs; c++) {
      // (round it, mostly on the side away from the shelter)
      const a = Math.atan2(fzp - sz, fxp - sx) + (c - (chairs - 1) / 2) * 1.1 + (r() - 0.5) * 0.3;
      const [cx, cz] = [fxp + Math.cos(a) * 1.25, fzp + Math.sin(a) * 1.25];
      place({ kind: 'chair', x: cx, z: cz, ry: Math.atan2(fxp - cx, fzp - cz), w: 0.5, d: 0.5, h: 0.75, tone: tone + c }, 0.05);
    }
  }
  // A canopy over a table (the families, the long stays)
  if (kind === 'cabin' || ((kind === 'trailer' || kind === 'bus' || kind === 'shack' || kind === 'van') && r() < 0.55) || r() < 0.2) {
    const cu = su + side * (S.w / 2 + 1.9);
    const [cx, cz] = at(cu, back + 4.4 + r() * 0.5);
    const can: Item = { kind: 'canopy', x: cx, z: cz, ry: ry + (r() - 0.5) * 0.3, w: 2.8, d: 2.6, h: 2.05, tone };
    if (place(can, 0.12)) {
      // (the table under it: what's solid of the pitch)
      const tb: Item = { kind: 'table', x: cx, z: cz, ry: can.ry, w: 1.7, d: 1.4, h: 0.75, tone };
      items.push(tb);
      if (r() < 0.6) items.push({ kind: 'stove', x: cx + Math.cos(can.ry) * 0.45, z: cz - Math.sin(can.ry) * 0.45, ry: can.ry, w: 0.5, d: 0.3, h: 0.12, tone });
    }
  }
  // The car (not with a van or a bus): nosed in beside the shelter on the other side
  if (kind !== 'van' && kind !== 'bus' && (kind === 'trailer' || kind === 'teardrop' || r() < 0.6)) {
    const id = CAR_MODELS[Math.floor(r() * CAR_MODELS.length)];
    const { L, W } = CARS[id];
    for (const cu of [su - side * (S.w / 2 + W / 2 + 0.7), su - side * (S.w / 2 + W / 2 + 1.4)]) {
      const [cx, cz] = at(cu, 0.3 + L / 2);
      const cry = carRy(nx, nz) + (r() - 0.5) * 0.3;
      const box = carBox(id, cx, cz, cry);
      const it = { x: cx, z: cz, ry: cry, w: L, d: W };
      // (a car turned by carRy: its length along its own x)
      if (!clear(it, 0.3, mine, TRACK_HALF + 0.2)) continue;
      CAMP_CARS.push([id, cx, cz, cry, CAR_PAINTS[(tone >> 3) % CAR_PAINTS.length]]);
      carBoxes.push(box);
      mine.push(it);
      break;
    }
  }
  // A pallet windbreak across the back of the long stays, now and then
  if (lived && r() < 0.4) place({ kind: 'pallets', x: at(su, back + S.d + 0.5)[0], z: at(su, back + S.d + 0.5)[1], ry, w: Math.min(3.2, S.w), d: 0.25, h: 1.1, tone }, 0.06);
  // Behind it: a washing line on the long stays, often
  if ((lived && r() < 0.65) || r() < 0.2) {
    const [ax, az] = at(su - 1.6, back + S.d + 1.4 + r() * 0.8);
    const [bx, bz] = at(su + 1.6, back + S.d + 1.4 + r() * 0.8);
    const it: Item = { kind: 'line', x: (ax + bx) / 2, z: (az + bz) / 2, ry: Math.atan2(-(bz - az), bx - ax), w: Math.hypot(bx - ax, bz - az), d: 0.3, h: 1.6, tone, to: [bx, bz] };
    place(it, 0.1);
  }
  // What a stay gathers, round the shelter's corners and behind: a few of these, each where there's room
  const extras: [ItemKind, number, number, number, number][] = [
    ['cooler', 0.6, 0.4, 0.42, 0.55],
    ['jerry', 0.5, 0.25, 0.45, 0.5],
    ['wood', 1.2, 0.6, 0.6, 0.5],
    ['lantern', 0.3, 0.3, 1.6, 0.4],
    ['flag', 0.3, 0.3, 2.6, 0.18],
    ['plants', 0.8, 0.5, 0.5, 0.3],
  ];
  if (lived) {
    extras.push(['generator', 0.7, 0.5, 0.55, 0.55]);
    extras.push(['solar', 1.4, 0.9, 1.0, 0.35]);
    extras.push(['dish', 0.6, 0.6, 1.0, 0.2]);
  }
  if (kind === 'trailer' || kind === 'bus' || kind === 'shack') extras.push(['deck', 1.8, 1.4, 0.22, 0.6]);
  // (the tents: a second, smaller one for the kids, often)
  if (kind === 'dome' || kind === 'ridge' || kind === 'cabin') extras.unshift(['dome', 1.6, 1.6, 1.0, 0.55]);
  if (kind === 'shack' || kind === 'bus' || r() < 0.15) extras.push(['stake', 1.1, 1.1, 0.2, 0.6]);
  const spots: Pt[] = [
    [su - S.w / 2 - 0.6, back + 0.4],
    [su + S.w / 2 + 0.6, back + 0.4],
    [su - S.w / 2 - 0.7, back + S.d],
    [su + S.w / 2 + 0.7, back + S.d],
    [su, back + S.d + 0.7],
    [su - S.w / 4, back - 0.1],
    [su + S.w / 4, back + S.d + 0.6],
    [fu + 1.6, back + 2.6],
    [su - side * (S.w / 2 + 1.2), back + S.d + 0.9],
    [su + side * (S.w / 2 + 0.9), back + S.d + 1.6],
  ];
  for (const [k, w, d, h, chance] of extras) {
    if (r() > chance) continue;
    // (the deck at the shelter's door: its middle on the track's side, the pallets across its back)
    const tries: Pt[] = k === 'deck' ? [[su + S.w * 0.18, back - d / 2 - 0.05]] : k === 'pallets' ? [[su, back + S.d + 0.6]] : spots;
    const off = Math.floor(r() * tries.length);
    for (let i = 0; i < tries.length; i++) {
      const s = tries[(i + off) % tries.length];
      let [x, z] = at(s[0], s[1]);
      let kry = ry + (k === 'pallets' || k === 'solar' ? 0 : (r() - 0.5) * 1.2);
      if (k === 'deck') {
        // (square to the shelter, against its front)
        const [c, sn] = [Math.cos(main.ry), Math.sin(main.ry)];
        const [lu, lv] = [S.w * 0.18, -S.d / 2 - d / 2 - 0.04];
        [x, z, kry] = [main.x + c * lu + sn * lv, main.z - sn * lu + c * lv, main.ry];
      }
      const it: Item = { kind: k, x, z, ry: kry, w, d, h, tone: tone + Math.round(w * 10) };
      // (the deck against the shelter's front: let it touch what's taken round the shelter)
      if (place(it, k === 'deck' ? 0.01 : 0.08)) break;
    }
  }
  for (const f of mine) taken.push(grow(aabbOf(f), 0.2));
  const [px, pz] = at(0, 0);
  return { id, kind, x: px, z: pz, ry, items, seed: tone };
}

/** The track's point nearest x, z and the way from it to x, z */
function nearest(x: number, z: number) {
  let best = { d: Infinity, x: 0, z: 0 };
  for (const line of [TRACK_SPUR, TRACK_LOOP])
    for (let i = 1; i < line.length; i++) {
      const [a, b] = [line[i - 1], line[i]];
      const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
      const l2 = vx * vx + vz * vz;
      const t = l2 ? Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l2)) : 0;
      const [px, pz] = [a[0] + vx * t, a[1] + vz * t];
      const d = Math.hypot(x - px, z - pz);
      if (d < best.d) best = { d, x: px, z: pz };
    }
  return best;
}

export const PITCHES: Pitch[] = (() => {
  const out: Pitch[] = [];
  const busCount = { n: 0 };
  const r = rng(90909);
  const tryAt = (id: string, px: number, pz: number, nx: number, nz: number) => {
    for (let k = 0; k < 3; k++) {
      const off = TRACK_HALF + 0.5 + k * 0.6;
      const p = pitch(id, px + nx * off, pz + nz * off, nx, nz, r, busCount);
      if (p) {
        out.push(p);
        return;
      }
    }
  };
  // Along the loop, both sides, every few tiles
  const loopLen = TRACK_LOOP.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - TRACK_LOOP[i][0], p[1] - TRACK_LOOP[i][1]), 0);
  const at = (d: number) => {
    let s = ((d % loopLen) + loopLen) % loopLen;
    for (let i = 1; i < TRACK_LOOP.length; i++) {
      const [a, b] = [TRACK_LOOP[i - 1], TRACK_LOOP[i]];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (s <= l) return { x: a[0] + ((b[0] - a[0]) * s) / l, z: a[1] + ((b[1] - a[1]) * s) / l, tx: (b[0] - a[0]) / l, tz: (b[1] - a[1]) / l };
      s -= l;
    }
    return { x: TRACK_LOOP[0][0], z: TRACK_LOOP[0][1], tx: 0, tz: 1 };
  };
  for (const side of [1, -1])
    for (let d = side === 1 ? 2 : 6; d < loopLen; d += 9.5) {
      const p = at(d);
      // (the loop runs anticlockwise seen from above with +z south: its outside is to the right of the way it runs)
      const [nx, nz] = [p.tz * side, -p.tx * side];
      tryAt(`lot9-pitch-${side > 0 ? 'o' : 'i'}${Math.round(d)}`, p.x, p.z, nx, nz);
    }
  // Along the way in, both sides
  for (const x of [-142 + X, -137 + X])
    for (const s of [-1, 1]) {
      const z = ROAD_Z + CAMP_SHIFT.dz - 0.5;
      tryAt(`lot9-pitch-s${-(x - X)}${s > 0 ? 's' : 'n'}`, x, z, 0, s);
    }
  // The back corners: wherever there's room, facing the nearest bit of track
  for (let x = FIELD[0] + 5; x < FIELD[2] - 4; x += 7)
    for (let z = FIELD[1] + 4; z < FIELD[3] - 3; z += 7) {
      const n = nearest(x, z);
      if (n.d < TRACK_HALF + 6) continue;
      const [nx, nz] = [(x - n.x) / n.d, (z - n.z) / n.d];
      const p = pitch(`lot9-pitch-b${Math.round(-x)}-${Math.round(z)}`, x - nx * 2.2, z - nz * 2.2, nx, nz, r, busCount);
      if (p) out.push(p);
    }
  return out;
})();

/* ---------- Solids, people, dogs ---------- */

/** What's solid among the pitches' things: the shelters, fires, tables, generators, firewood, decks (no), cars */
const SOLID_KINDS: Partial<Record<ItemKind, number>> = { dome: 1.25, ridge: 1.2, cabin: 1.75, trailer: 1.75, teardrop: 1.15, shack: 1.9, bus: 1.8, fire: 0.3, table: 0.75, generator: 0.55, wood: 0.6, cooler: 0.42, jerry: 0.45 };
export const PITCH_SOLIDS: Box[] = PITCHES.flatMap((p) => p.items.flatMap((it) => (SOLID_KINDS[it.kind] ? inner(it).map((r): Box => [...r, SOLID_KINDS[it.kind]!]) : [])));
/** Everything solid in the Field once the chunk is in: the commons, the pitches' things, the cars */
export const CAMP_SOLIDS: Box[] = [...COMMON_SOLIDS, ...PITCH_SOLIDS, ...carBoxes, ...GATE_SOLIDS];

/** The Field's people: round the lit fires, at the commons */
export const CAMP_PEOPLE: Idle[] = (() => {
  const out: Idle[] = [];
  let k = 0;
  for (const p of PITCHES)
    for (const it of p.items)
      if (it.kind === 'chair') {
        // (someone in about one chair in two at a lit fire, one in five at a cold one)
        const fire = p.items.find((f) => f.kind === 'fire');
        if ((fire?.lit ? k % 2 === 0 : k % 5 === 0)) out.push({ x: it.x, z: it.z, y: 0.035 + 0.3, ry: it.ry, act: 'lounge' });
        k++;
      }
  // The big fire circle: on the logs, and a pair standing
  LOGS.forEach((l, i) => {
    if (i === 2) return;
    out.push({ x: l.x, z: l.z, y: 0.035 + 0.25, ry: Math.atan2(CIRCLE.x - l.x, CIRCLE.z - l.z), act: 'lounge' });
  });
  out.push({ x: CIRCLE.x + 1.6, z: CIRCLE.z - 4.4, ry: 2.6, act: 'chat' });
  out.push({ x: CIRCLE.x + 2.3, z: CIRCLE.z - 5.0, ry: -0.6, act: 'chat' });
  // The kitchen: one at the grill, one eating
  out.push({ x: (GRILL[0] + GRILL[2]) / 2, z: GRILL[1] - 0.5, ry: 0, act: 'cook' });
  out.push({ x: KITCHEN_TABLES[1].x, z: KITCHEN_TABLES[1].z - 0.55, y: 0.035 + 0.42, ry: 0, act: 'eat' });
  // Filling a jug at the standpipe, waiting for the showers, in the vegetable patch
  out.push({ x: STANDPIPE[0] + 0.15, z: STANDPIPE[1] - 0.6, ry: 0, act: 'look' });
  out.push({ x: SHOWER_DOORS[0][0] + 1.1, z: SHOWER_DOORS[0][1] + 0.9, ry: Math.PI - 0.4, act: 'phone' });
  out.push({ x: (BEDS[1][2] + BEDS[2][0]) / 2, z: (GARDEN[1] + GARDEN[3]) / 2, ry: Math.PI / 2, act: 'look' });
  return out;
})();
/** The dogs tied out at their pitches (x, z, facing, coat) */
export const CAMP_DOGS: { x: number; z: number; ry: number; coat: string }[] = PITCHES.flatMap((p) =>
  p.items.filter((it) => it.kind === 'stake').map((it, i) => ({ x: it.x + Math.cos(it.ry) * 0.35, z: it.z - Math.sin(it.ry) * 0.35, ry: it.ry + i, coat: ['#3b2f26', '#8a6a48', '#2a2622', '#b8a58a', '#5a4a3a'][(p.seed + i) % 5] }))
);
