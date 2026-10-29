/*
 * The river's shape (docs/river-plan.md, the owner's call: four times as
 * wide, and natural, not a straight line). DOM-free, tested in
 * tests/river.test.ts.
 *
 * `RIVER` (layout.ts) is the band between the quays, the bank avenues
 * running straight along it edge to edge. The water's edge keeps to the
 * band where things stand on the water (the quays: Uptown's boulevard and
 * its marina, the town's promenades and their jetties, The Trenches'
 * boardwalk with Pier 7 and the Night Market, Liberty Bridge, every
 * bridge) and pulls back from it on the stretches in `BANKS`: a sandy cove
 * on the south bank below the south row, grass banks east of the town's
 * promenades, and past the ring highway it wanders freely, each bank on its
 * own (but the Docks' frontage, a straight quay: docks.ts `DOCKS_QUAY`).
 * It never reaches past the band. Since step 2 the water lies
 * `WATER_Y` below the streets: quay walls drop to it, and the banks it pulls
 * back from slope down to it (`topsAt()`, `shoreY()`). Everything that reads
 * the water reads these edges (`edgesAt()`): the water and its banks (world.ts),
 * walking (walk.ts), driving (`RIVER_WALLS` in drive-sim.ts), the boats
 * (`boatZ()` in waterfront.ts), the trees, the world map, the sound.
 */
import { EXT, RIVER, RIVER_W } from './layout';
import { DOCKS_QUAY } from './docks';

export type Bank = 'north' | 'south';

/**
 * A stretch of bank where the water pulls back from the quay line: from x0
 * to x1, easing in and out over `ease`, `min` to `max` back (a smooth seeded
 * wander between them), `beach` where the land it leaves is sand (the cove)
 * rather than grass
 */
export interface Stretch {
  bank: Bank;
  x0: number;
  x1: number;
  ease: number;
  min: number;
  max: number;
  /** The wander's phase (each stretch its own) */
  phase: number;
  beach?: boolean;
}

/** The ring highway's two bridges (x): the water keeps to the band under them and either side */
const HW_WEST = -215;
const HW_EAST = 275;
/** How far either side of a highway bridge the banks stay straight */
const HW_CLEAR = 13;
/** Past the world's edge: the stretches out of town run on off it */
const PAST = 200;

export const BANKS: Stretch[] = [
  // The cove below the south row, between Liberty Bridge and the south bank's east jetty (outer.ts JETTIES): a beach
  { bank: 'south', x0: -12, x1: 47, ease: 15, min: 5.2, max: 6.6, phase: 0.6, beach: true },
  // East of the town's promenades to the highway: grass banks, both sides
  { bank: 'north', x0: 132, x1: HW_EAST - HW_CLEAR, ease: 18, min: 1.5, max: 8, phase: 2.3 },
  { bank: 'south', x0: 132, x1: HW_EAST - HW_CLEAR, ease: 18, min: 1.5, max: 8, phase: 4.1 },
  // Past the highway, out of town both ways: wandering freely (but along the Docks' frontage west of the highway, a
  // straight quay: docks.ts)
  { bank: 'north', x0: EXT[0] - PAST, x1: HW_WEST - HW_CLEAR, ease: 22, min: 1, max: 9, phase: 1.7 },
  { bank: 'south', x0: EXT[0] - PAST, x1: DOCKS_QUAY[0], ease: 22, min: 1, max: 9, phase: 5.2 },
  { bank: 'north', x0: HW_EAST + HW_CLEAR, x1: EXT[1] + PAST, ease: 22, min: 1, max: 9, phase: 3.4 },
  { bank: 'south', x0: HW_EAST + HW_CLEAR, x1: EXT[1] + PAST, ease: 22, min: 1, max: 9, phase: 0.2 },
];

/** Smooth from 0 to 1 */
const smooth = (t: number) => {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
};
/** A smooth seeded wander between 0 and 1 */
const wander = (x: number, ph: number) => 0.5 + 0.5 * (0.62 * Math.sin(x / 29 + ph) + 0.38 * Math.sin(x / 11.3 + ph * 2.1));

/** How far back from the quay line the water's edge is on a bank at x (0 on the quays) */
export function pullAt(bank: Bank, x: number): number {
  let d = 0;
  for (const s of BANKS) {
    if (s.bank !== bank || x <= s.x0 || x >= s.x1) continue;
    const w = smooth((x - s.x0) / s.ease) * smooth((s.x1 - x) / s.ease);
    d = Math.max(d, w * (s.min + (s.max - s.min) * wander(x, s.phase)));
  }
  return d;
}
/** The stretch the bank at x is pulled back on, if any */
export const stretchAt = (bank: Bank, x: number) => BANKS.find((s) => s.bank === bank && x > s.x0 && x < s.x1);

/** The water's edges at x: north and south (z) */
export const edgesAt = (x: number): [number, number] => [RIVER[0] + pullAt('north', x), RIVER[1] - pullAt('south', x)];
/** Is x, z in the water (`m` further in from its edges; negative reaches out past them) */
export function inWater(x: number, z: number, m = 0) {
  if (z <= RIVER[0] + m || z >= RIVER[1] - m) return false;
  const [n, s] = edgesAt(x);
  return z > n + m && z < s - m;
}
/**
 * The water's height (river plan step 2, the owner's pick: the water a little lower, Harbour Bridge a little
 * higher, so boats pass under it): 1.5 below the streets, between stone quay walls where it keeps to the quay line,
 * and down grass or sand slopes where it pulls back
 */
export const WATER_Y = -1.5;
/** The widest a bank's slope gets (where it pulls back further, flat land is left above it); the cove's is its whole beach */
export const SLOPE = 2.6;
/** How wide a bank's slope is at x: none on a quay (a wall), the whole pull on the cove's beach */
export function slopeAt(bank: Bank, x: number) {
  const p = pullAt(bank, x);
  return stretchAt(bank, x)?.beach ? p : Math.min(p, SLOPE);
}
/** The tops of the banks' slopes at x (north, south): beyond them the land is flat at the street's height */
export function topsAt(x: number): [number, number] {
  const [n, s] = edgesAt(x);
  return [n - slopeAt('north', x), s + slopeAt('south', x)];
}
/** The ground's height at x, z over the river's band: the street's (0) on the flat, down a bank's slope, the water's below */
export function shoreY(x: number, z: number) {
  if (z <= RIVER[0] || z >= RIVER[1]) return 0;
  const [n, s] = edgesAt(x);
  const [tn, ts] = topsAt(x);
  if (z <= tn || z >= ts) return 0;
  if (z >= n && z <= s) return WATER_Y;
  const t = z < n ? (z - tn) / Math.max(1e-6, n - tn) : (ts - z) / Math.max(1e-6, ts - s);
  return WATER_Y * t;
}
/** Is x, z on the river's slopes or in its water (`m` out past the slopes' tops): no car, no tree */
export function inChannel(x: number, z: number, m = 0) {
  if (z <= RIVER[0] - m || z >= RIVER[1] + m) return false;
  const [tn, ts] = topsAt(x);
  return z > tn - m && z < ts + m;
}
/** The narrowest the river gets (tests/river.test.ts holds it) */
export const MIN_WIDTH = RIVER_W - 2 * 9;

/**
 * The water's edges sampled every `step` from x0 to x1 (both included): for the water's mesh, its banks, the world
 * map and the walls the cars stop at
 */
export function edgeSamples(x0: number, x1: number, step = 2): { x: number; n: number; s: number }[] {
  const k = Math.max(1, Math.ceil((x1 - x0) / step));
  return Array.from({ length: k + 1 }, (_, i) => {
    const x = x0 + ((x1 - x0) * i) / k;
    const [n, s] = edgesAt(x);
    return { x, n, s };
  });
}

/** A boat lane's line at x: its place across the band (layout.ts RIVER) kept in proportion across the water there */
export function laneAt(z: number, x: number) {
  const [n, s] = edgesAt(x);
  return n + ((z - RIVER[0]) / RIVER_W) * (s - n);
}
