/*
 * What only the boulevard's drawing needs (docs/finance-plan.md Phase 4;
 * DOM-free, tested in tests/boulevard.test.ts), kept out of the boot:
 * boulevard.ts is the boot's.
 *
 * - **The yachts** (`YACHTS`): moored along the marina's pontoon on its river
 *   side, bows east, each its length, beam and colours (a new boat model,
 *   drawn by boulevard3d.ts); two tenders inside the pontoon (`TENDERS`).
 * - **The planted median** (`MEDIAN_RUNS`, `MEDIAN_TREES`): a low clipped
 *   hedge along the bank avenue's median through Uptown, broken well short
 *   of every junction and the axis's zebra, and round the metro's pillars
 *   where the el runs over it (docs/docks-plan.md Phase 2); slim columnar
 *   trees along it but under the el.
 * - **The terraces' names** (`TERRACE_NAMES`): made up, one to a terrace.
 */
import { MEDIAN } from './layout';
import { AXIS_X, E, LANE_HALF, ROWS_Z, W, crossingsOn } from './uptown';
import { ESPLANADE, GANGWAYS, PONTOON, ROOF_TERRACES } from './boulevard';
import { PILLARS, PILLAR_HALF, UP_R, UP_X } from './metro';

export interface Yacht {
  /** Its middle (x, z) and length along the water, beam across it */
  x: number;
  z: number;
  len: number;
  beam: number;
  /** Hull, the stripe along it and the deck house's trim */
  hull: string;
  stripe: string;
  /** A flybridge on top (the bigger ones) */
  fly: boolean;
}
const STYLES: Omit<Yacht, 'x' | 'z'>[] = [
  { len: 5.6, beam: 1.3, hull: '#f4f2ee', stripe: '#1c2a55', fly: true },
  { len: 4.4, beam: 1.15, hull: '#f4f2ee', stripe: '#8000ff', fly: false },
  { len: 5.0, beam: 1.25, hull: '#15162a', stripe: '#d8ae48', fly: true },
  { len: 4.0, beam: 1.1, hull: '#e9edf5', stripe: '#00a9c8', fly: false },
  { len: 5.2, beam: 1.3, hull: '#f4f2ee', stripe: '#c2347a', fly: true },
];
/** Along the pontoon's river side, a hand's width out from it, from its west end */
export const YACHTS: Yacht[] = (() => {
  const out: Yacht[] = [];
  let x = PONTOON[0] + 0.8;
  for (const s of STYLES) {
    if (x + s.len > PONTOON[2] - 0.4) break;
    out.push({ ...s, x: x + s.len / 2, z: PONTOON[3] + 0.12 + s.beam / 2 });
    x += s.len + 1.3;
  }
  return out;
})();
/** Two tenders tied up inside the pontoon, between the gangways */
const TZ = (ESPLANADE[3] + PONTOON[1]) / 2;
export const TENDERS: { x: number; z: number; len: number }[] = [
  { x: GANGWAYS[0] + 4, z: TZ, len: 1.4 },
  { x: GANGWAYS[1] - 5, z: TZ, len: 1.2 },
];

/* ---------- The planted median ---------- */

const BANK = ROWS_Z[ROWS_Z.length - 1];
/** The hedge along the median: its width and height over the median's top */
export const HEDGE = { w: MEDIAN - 0.22, h: 0.36 };
/** The bank avenue's median through Uptown in runs (x0, x1), well short of the junctions (their asphalt and more) and the axis's zebra; its z */
export const MEDIAN_Z = BANK.c;
export const MEDIAN_RUNS: [number, number][] = (() => {
  // (the crossing streets' widest half is the diagonal's, with its median: 2.3)
  const cuts = [
    ...crossingsOn(BANK).map((x): [number, number] => [x - 2.3 - 1.6, x + 2.3 + 1.6]),
    [AXIS_X - LANE_HALF - 1.8, AXIS_X + LANE_HALF + 1.8] as [number, number],
    // (the el's pillars standing in it, metro.ts)
    ...PILLARS.filter((p) => Math.abs(p.at[1] - BANK.c) < 0.01).map((p): [number, number] => [p.at[0] - PILLAR_HALF - 0.35, p.at[0] + PILLAR_HALF + 0.35]),
  ].sort((a, b) => a[0] - b[0]);
  const runs: [number, number][] = [];
  let at = W + 3;
  for (const [a, b] of cuts) {
    if (a - at > 2) runs.push([at, a]);
    at = Math.max(at, b);
  }
  if (E - 4 - at > 2) runs.push([at, E - 4]);
  // (in pieces no longer than 24: nothing fixed much longer than a tile)
  return runs.flatMap(([a, b]) => {
    const n = Math.ceil((b - a) / 24);
    return Array.from({ length: n }, (_, k): [number, number] => [a + ((b - a) * k) / n, a + ((b - a) * (k + 1)) / n]);
  });
})();
/** Where the el runs over the median (west of its bend north into the one-way pair's street): no trees under its deck */
export const UNDER_EL = UP_X - UP_R + 1;
/** Slim columnar trees along the hedge, every 8, a little in from each run's ends, none under the el */
export const MEDIAN_TREES: number[] = MEDIAN_RUNS.flatMap(([a, b]) => {
  const out: number[] = [];
  for (let x = a + 2; x < b - 1.5; x += 8) if (x > UNDER_EL) out.push(x);
  return out;
});

/* ---------- The terraces' names ---------- */

/** One to a terrace, made up (never a real restaurant) */
export const TERRACE_NAMES = ['HARBOUR & VINE', 'THE LANTERN ROOM', 'SKY GARDEN', 'RIVERLIGHT', 'THE GILDED FORK', 'BLUE HOUR', 'THE QUAYSIDE', 'TIDE & THYME', 'MOONDECK', 'COPPER & COAL'].slice(0, ROOF_TERRACES.length);
