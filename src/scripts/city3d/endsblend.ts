/*
 * Endswood blended into its neighbours (docs/estate-plan.md Phase 6; DOM-free, the boot's: what's solid, the lamps,
 * the trees, the ground; tested in tests/endsblend.test.ts). Drawn by endsblend3d.ts in Endswood's chunk.
 *
 * - **The common** (`COMMON`): the rough land between the estate's south edge and Lot 9's north fence, the footpath
 *   (lot9.ts `FOOTPATH`) running across it from the tunnel to the hole in the fence. A desire line worn from the
 *   estate's south edge to the path (`DESIRE`); a ditch across it (`DITCH`, solid low banks, open at the plank bridge
 *   where the path crosses, `PLANK`, and at its ends); fly-tipping (`TIPPED`: a mattress, a burnt-out moped, a
 *   shopping trolley on its side, a sofa, a fridge, bin bags, tyres); the estate's old chain-link along it, broken
 *   (`CHAIN`: standing runs, leaning ones, one flat on the grass, gaps where people walk); brambles and a few
 *   hawthorns (`BRAMBLES`, `COMMON_TREES`); sodium lamps along the path all the way (`COMMON_LAMPS`). The jets come in
 *   low over it (airfield.ts): nothing here stands tall.
 * - `COMMON_SOLIDS` (in `SOLIDS`): the ditch's banks, the standing chain-link, the bulky tipping.
 */
import { FENCE as LOT9_FENCE, FOOTPATH } from './lot9';
import { GROUND_Y, SOUTH_Z, type Box, type Pt, type Rect } from './endswood';

/** The common: past the estate's south edge and the slabs' easing down to the ground (verges.ts `RAMP`), to Lot 9's
 * fence, from the footpath's west side to the south avenue's sidewalk */
export const COMMON: Rect = [-128, SOUTH_Z + 2.5, -10.5, LOT9_FENCE[1] - 1.5];
export const inCommon = (x: number, z: number, m = 0) => x > COMMON[0] - m && x < COMMON[2] + m && z > COMMON[1] - m && z < COMMON[3] + m;
/** Sodium from the estate to Lot 9 all the way (lampmix.ts `SODIUM_AREAS`): the common and a wide margin round it, so
 * no lamp on it is mixed with the town's white */
const SODIUM_BAND = { x0: COMMON[0] - 26, z0: COMMON[1] - 30, x1: COMMON[2] + 26, z1: COMMON[3] + 22 };
export const inSodiumBand = (x: number, z: number, m = 0) => x > SODIUM_BAND.x0 - m && x < SODIUM_BAND.x1 + m && z > SODIUM_BAND.z0 - m && z < SODIUM_BAND.z1 + m;

/** The footpath's x at z (lot9.ts `FOOTPATH`, its points in order south) */
export function pathX(z: number): number {
  for (let i = 1; i < FOOTPATH.length; i++) {
    const [a, c] = [FOOTPATH[i - 1], FOOTPATH[i]];
    if (z >= a[1] && z <= c[1]) return a[0] + ((c[0] - a[0]) * (z - a[1])) / Math.max(1e-6, c[1] - a[1]);
  }
  return FOOTPATH[FOOTPATH.length - 1][0];
}
/** The footpath's worn width either side of its line (lot9-3d.ts draws it 0.6) */
export const PATH_HALF = 0.6;

/** The desire line: from the estate's south edge (between the south-west blocks' garages and Kite House) to the path,
 * north of the ditch; worn dirt `DESIRE_HALF` either side */
export const DESIRE: Pt[] = [
  [-62, SOUTH_Z + 1.2],
  [-66, 433.5],
  [-74, 437.5],
  [-86, 440.6],
  [-99, 442.6],
  [-108.5, 443.6],
];
export const DESIRE_HALF = 0.5;

/** The ditch across the common, wandering east to west; `half` its width either side, its banks `bank` high (solid:
 * nobody wades it, a walker goes round it or over the plank) */
export const DITCH = { half: 0.65, bank: 0.28 };
export const DITCH_LINE: Pt[] = (() => {
  const out: Pt[] = [];
  for (let x = COMMON[0] + 2; x <= COMMON[2] - 3.5 + 1e-6; x += 3) out.push([x, 450 + 1.6 * Math.sin(x * 0.11 + 0.8) + 0.7 * Math.sin(x * 0.29)]);
  return out;
})();
/** The ditch's z at x */
export function ditchZ(x: number): number {
  for (let i = 1; i < DITCH_LINE.length; i++) {
    const [a, c] = [DITCH_LINE[i - 1], DITCH_LINE[i]];
    if (x >= a[0] && x <= c[0]) return a[1] + ((c[1] - a[1]) * (x - a[0])) / (c[0] - a[0]);
  }
  return DITCH_LINE[x < DITCH_LINE[0][0] ? 0 : DITCH_LINE.length - 1][1];
}
/** The plank bridge where the footpath crosses the ditch: its middle, its half width along the ditch, its length */
export const PLANK = (() => {
  // (where the path's line meets the ditch's)
  let z = 450;
  for (let k = 0; k < 6; k++) z = ditchZ(pathX(z));
  return { x: pathX(z), z, half: 0.55, len: DITCH.half * 2 + 0.8 };
})();
/** The ditch's banks as boxes, a stretch of its line each, open `GAP` either side of the plank */
const GAP = 1.4;
export const DITCH_SOLIDS: Box[] = DITCH_LINE.slice(1).flatMap((c, i): Box[] => {
  const a = DITCH_LINE[i];
  const h = DITCH.half;
  const piece = (x0: number, x1: number): Box => {
    const [z0, z1] = [ditchZ(x0), ditchZ(x1)];
    return [x0, Math.min(z0, z1) - h, x1, Math.max(z0, z1) + h, DITCH.bank];
  };
  const [g0, g1] = [PLANK.x - GAP, PLANK.x + GAP];
  if (c[0] <= g0 || a[0] >= g1) return [piece(a[0], c[0])];
  return [...(a[0] < g0 ? [piece(a[0], g0)] : []), ...(c[0] > g1 ? [piece(g1, c[0])] : [])];
});

/** What's been dumped on the common */
export type TipKind = 'mattress' | 'moped' | 'trolley' | 'sofa' | 'fridge' | 'bags' | 'tyres';
export interface Tip {
  kind: TipKind;
  x: number;
  z: number;
  yaw: number;
}
export const TIPPED: Tip[] = [
  { kind: 'mattress', x: -94, z: 437.2, yaw: 0.35 },
  { kind: 'moped', x: -70, z: 461.5, yaw: 1.2 },
  { kind: 'trolley', x: -102.5, z: 456, yaw: 2.1 },
  { kind: 'sofa', x: -36, z: 459, yaw: -0.4 },
  { kind: 'fridge', x: -83, z: 466, yaw: 0.9 },
  { kind: 'bags', x: -47, z: 436.5, yaw: 0.2 },
  { kind: 'bags', x: -118.5, z: 438, yaw: 1.4 },
  { kind: 'tyres', x: -55, z: 445.5, yaw: 0 },
];
/** Each kind's footprint (along its yaw, across) and whether it's solid (the flat ones you step over or onto) */
export const TIP_SIZE: Record<TipKind, { l: number; w: number; h: number; solid: boolean }> = {
  mattress: { l: 1.9, w: 1.2, h: 0.18, solid: false },
  moped: { l: 1.6, w: 0.6, h: 0.55, solid: true },
  trolley: { l: 1.0, w: 0.9, h: 0.55, solid: true },
  sofa: { l: 1.9, w: 0.85, h: 0.75, solid: true },
  fridge: { l: 1.6, w: 0.65, h: 0.65, solid: true },
  bags: { l: 1.3, w: 1.0, h: 0.45, solid: false },
  tyres: { l: 1.2, w: 1.2, h: 0.5, solid: true },
};
/** A footprint turned to its yaw, as an axis-aligned box */
const footprint = (x: number, z: number, yaw: number, l: number, w: number, h: number): Box => {
  const [c, s] = [Math.abs(Math.cos(yaw)), Math.abs(Math.sin(yaw))];
  const [hx, hz] = [(c * l + s * w) / 2, (s * l + c * w) / 2];
  return [x - hx, z - hz, x + hx, z + hz, h];
};
export const tipBox = (t: Tip): Box => {
  const s = TIP_SIZE[t.kind];
  return footprint(t.x, t.z, t.yaw, s.l, s.w, s.h);
};

/** The estate's old chain-link along the common, broken: runs along `CHAIN_Z(x)` from x0 to x1, standing, leaning
 * over, or down flat; gaps between where people walk (the desire line goes through one) */
export const CHAIN = { h: 1.5, post: 2.5, t: 0.08 };
export const CHAIN_Z = (x: number) => 434 + 0.4 * Math.sin(x * 0.07);
export const CHAIN_RUNS: { x0: number; x1: number; state: 'up' | 'lean' | 'down' }[] = [
  { x0: -102, x1: -95, state: 'up' },
  { x0: -95, x1: -90, state: 'lean' },
  { x0: -84, x1: -76, state: 'up' },
  { x0: -60, x1: -53, state: 'down' },
  { x0: -51, x1: -41, state: 'up' },
  { x0: -34, x1: -28, state: 'lean' },
  { x0: -28, x1: -21, state: 'up' },
];
/** A standing run's footprint (solid; a leaning or flat one you walk over) */
export const chainBox = (r: (typeof CHAIN_RUNS)[number]): Box => {
  const [z0, z1] = [CHAIN_Z(r.x0), CHAIN_Z(r.x1)];
  return [r.x0, Math.min(z0, z1) - CHAIN.t, r.x1, Math.max(z0, z1) + CHAIN.t, CHAIN.h];
};

/** Bramble clumps (x, z, radius): walked through, scratchy */
export const BRAMBLES: [number, number, number][] = [
  [-124, 446, 1.6],
  [-121, 466, 1.3],
  [-90, 455.5, 1.4],
  [-64, 456.4, 1.2],
  [-44, 466, 1.5],
  [-24, 442.5, 1.3],
  [-16, 462, 1.1],
  [-78, 444.4, 1.0],
];
/** A few hawthorns, small (x, z, scale; addTree at the boot) */
export const COMMON_TREES: [number, number, number][] = [
  [-122.5, 457, 0.7],
  [-96, 465.5, 0.65],
  [-58, 467, 0.75],
  [-30, 451, 0.7],
  [-14, 440.5, 0.6],
];
/** Sodium lamps along the footpath across the common, on its east side reaching over it, and one by the desire
 * line's mouth (x, z, ry, y) */
export const COMMON_LAMPS: [number, number, number, number][] = [
  ...[435, 447, 459, 469].map((z): [number, number, number, number] => {
    // (the one by the ditch stands north of it, clear of the plank)
    const zz = Math.abs(z - PLANK.z) < 3 ? PLANK.z - 3 : z;
    return [pathX(zz) + 1.5, zz, Math.PI, GROUND_Y];
  }),
  [-60.5, 433, Math.PI, GROUND_Y],
];

export const COMMON_SOLIDS: Box[] = [...DITCH_SOLIDS, ...CHAIN_RUNS.filter((r) => r.state === 'up').map(chainBox), ...TIPPED.filter((t) => TIP_SIZE[t.kind].solid).map(tipBox)];
