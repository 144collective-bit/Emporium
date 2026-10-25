/*
 * The water's look (docs/water-plan.md, step 1): what the river's and the
 * lake's water meshes carry for the water's shader (world.ts), DOM-free,
 * tested in tests/riverwater.test.ts.
 *
 * - **The river** is rows across it at every sample along it (`riverRows()`):
 *   its two water lines, the end of the shallows off each and the middle.
 *   Each row carries how far it is from the nearer bank's water line (the
 *   distance is piecewise straight across, so the rows give it exactly), the
 *   shallows' teal by a natural bank (`shore`, as before: 0 at a natural
 *   bank's water line, 1 out in the stream and along the quays), and where
 *   the waves wash in (`wash`: a natural bank's, `beach`: the cove's sand).
 * - **The cove's swash** (`swashAt()`): a strip on the beach's sand from the
 *   water line up the slope, where the waves run up and leave the sand wet.
 * - **The lake** is rings in from its edge (`lakeRings()`), each carrying how
 *   far in it is.
 */
import { WATER_Y, edgesAt, pullAt, stretchAt, topsAt, type Bank } from './river';
import { LAKE_C, lakeR } from './westlake';

/** How far under the water the quay walls and the banks' slopes reach (the foam reads what stands in the water) */
export const BED = WATER_Y - 0.25;
/** How far out from a bank the shallows (and the waves rolling in) reach */
export const SHALLOWS = 2.4;
/** How far up the cove's beach (across, on the ground) the swash strip reaches from the water line */
export const RUN_UP = 1.4;
/** How far over the sand the swash strip lies (nothing flush) */
export const SWASH_LIFT = 0.012;
/** How far beyond its stone rim the lake's water reaches (westlake.ts `lakeLine(0.02)`, as before) */
export const LAKE_OUT = 0.02;
/** The lake's rings: how far in from its edge each lies (then its middle) */
export const LAKE_INSETS = [0, 0.8, 2.4, 6];

/** One row across the river at a sample */
export interface Row {
  z: number;
  /** How far from the nearer bank's water line */
  edge: number;
  /** 0 at a natural bank's water line, 1 out in the stream and along the quays (the shallows' teal) */
  shore: number;
  /** How much the waves wash in here (a natural bank's, 0 along a quay) */
  wash: number;
  /** The cove's beach (its waves bigger) */
  beach: number;
}

/** How natural a bank is at x: 1 where it's pulled back 1.2 or more, 0 on a quay (as the shallows always were) */
const natural = (bank: Bank, x: number) => Math.min(1, pullAt(bank, x) / 1.2);

/** The rows across the river at x, north to south: its water line, the shallows' end, the middle, the shallows' end, its water line */
export function riverRows(x: number): Row[] {
  const [n, s] = edgesAt(x);
  const [qn, qs] = [natural('north', x), natural('south', x)];
  const [bn, bs] = [stretchAt('north', x)?.beach ? qn : 0, stretchAt('south', x)?.beach ? qs : 0];
  return [
    { z: n, edge: 0, shore: 1 - qn, wash: qn, beach: bn },
    { z: n + SHALLOWS, edge: SHALLOWS, shore: 1, wash: qn, beach: bn },
    { z: (n + s) / 2, edge: (s - n) / 2, shore: 1, wash: 0, beach: 0 },
    { z: s - SHALLOWS, edge: SHALLOWS, shore: 1, wash: qs, beach: bs },
    { z: s, edge: 0, shore: 1 - qs, wash: qs, beach: bs },
  ];
}

/**
 * The sand's height on a natural bank's slope at x, z (as world.ts's `riverBanks()` lays it: from the slope's top at
 * the street's height down to `BED`, half a tile out past the water line)
 */
export function sandY(bank: Bank, x: number, z: number) {
  const e = edgesAt(x)[bank === 'north' ? 0 : 1];
  const top = topsAt(x)[bank === 'north' ? 0 : 1];
  const out = bank === 'north' ? 1 : -1;
  const foot = e + out * 0.5;
  return (BED * (z - top)) / (foot - top);
}

/**
 * The cove's swash strip at x: from the water's edge on the sand (lo) up the beach `RUN_UP` across (hi), each [z, y]
 * just over the sand, and how strong it is (`fade`); null off the beach
 */
export function swashAt(x: number): { lo: [number, number]; hi: [number, number]; fade: number } | null {
  const bank: Bank = 'south';
  const st = stretchAt(bank, x);
  const pull = pullAt(bank, x);
  if (!st?.beach || pull <= 1.2) return null;
  // (from the water's edge, where its mesh ends: the sand there is about the water's height, a little under on the
  // widest stretches, a little over on the narrowest)
  const e = edgesAt(x)[1];
  const top = topsAt(x)[1];
  const zh = Math.min(e + RUN_UP, top);
  // (`fade`: in from nothing where the beach eases in and out)
  return { lo: [e, sandY(bank, x, e) + SWASH_LIFT], hi: [zh, sandY(bank, x, zh) + SWASH_LIFT], fade: Math.min(1, (pull - 1.2) / 2) };
}

/** The lake's rings at angle a, from its edge in: [x, z, how far in] (its middle comes after, from `LAKE_C`) */
export function lakeRings(a: number): [number, number, number][] {
  const r = lakeR(a) + LAKE_OUT;
  return LAKE_INSETS.map((d) => [LAKE_C[0] + Math.cos(a) * (r - d), LAKE_C[1] + Math.sin(a) * (r - d), d]);
}
/** How far in the lake's middle is (its narrowest half-width, so the middle is never nearer the edge than it says) */
export const LAKE_MIDDLE = Math.min(...Array.from({ length: 360 }, (_, k) => lakeR((k / 360) * Math.PI * 2)));
/** The lake's water's height: on the park's lawn (world.ts `SLAB`, 0.15), a hair over it */
export const LAKE_Y = 0.15 + 0.04;
