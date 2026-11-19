/**
 * Crestmont's gateway (docs/crestmont-plan.md, the premium upgrade's Phase 1; the owner's call, 2026-11-19: "Gateway,
 * streets kept"): where the boulevard leaves the bank avenue for the Flats, a stone pylon on each of its corners with a
 * lantern on top, a low stone wing wall from each along the avenue with CRESTMONT cut in a plaque on its face, and a
 * fountain on the median's nose. The streets, the lots and the estates stay where they were: it all stands in the strip
 * each corner lot keeps outside its hedges (estates.ts `HEDGE.outer`) and on the median.
 *
 * DOM-free, in Crestmont's chunk only: drawn by crestgate3d.ts, its solids joining the grids when the chunk comes in
 * (crestmont3d.ts), tested in tests/crestgate.test.ts.
 */
import { BOULEVARD, BOULEVARD_MEDIAN, FLATS_X, flatsHalf } from './crestmont';
import { EW_ROADS, WALK_W } from './layout';
import { HEDGE, SLAB_Y } from './estates';
import type { Box } from './solids';

type Rect = [number, number, number, number];

/** The avenue along the river the boulevard leaves */
const BANK = EW_ROADS[3];
/** The boulevard's middle */
export const GATE_X = FLATS_X[BOULEVARD];
/** The blocks' corners either side of the boulevard: their z on the avenue's side, and how far out from the boulevard's middle */
export const CORNER_Z = BANK.c - BANK.half - WALK_W;
const EDGE = flatsHalf(BOULEVARD) + WALK_W;
/** How far in from the lot's edges the gateway stands (the middle of the strip outside the hedges) */
const IN = HEDGE.outer / 2;

/** A pylon: half its side, its height over the slab, its capstone's overhang and depth, the lantern's half side and height */
export const PYLON = { half: 0.4, h: 2.5, cap: 0.08, capH: 0.18, lantern: 0.17, lanternH: 0.42 } as const;
/** A wing wall: its length out from the pylon, its thickness and its height over the slab */
export const WING = { len: 3.2, thick: 0.36, h: 0.95 } as const;
/** The plaque on each wing's face to the avenue: its width and height, its foot over the slab */
export const PLAQUE = { w: 2.3, h: 0.46, y: 0.28 } as const;
/** The name cut in it (the district's own) */
export const GATE_NAME = 'CRESTMONT';

export interface Pylon {
  x: number;
  z: number;
  /** West of the boulevard (-1) or east (1) */
  side: -1 | 1;
}
export const PYLONS: Pylon[] = ([-1, 1] as const).map((side) => ({ x: GATE_X + side * (EDGE + IN), z: CORNER_Z - IN, side }));
/** The wing walls (x0, z0, x1, z1), out along the avenue from each pylon, away from the boulevard */
export const WINGS: Rect[] = PYLONS.map((p): Rect => {
  const [a, b] = p.side < 0 ? [p.x - PYLON.half - WING.len, p.x - PYLON.half] : [p.x + PYLON.half, p.x + PYLON.half + WING.len];
  return [a, p.z - WING.thick / 2, b, p.z + WING.thick / 2];
});

/** The fountain on the median's nose: its middle, the basin's radius and rim height, the bowl's radius and height over the slab */
export const BASIN = { x: GATE_X, z: CORNER_Z - 1.6, r: 1.0, rim: 0.42, bowl: 0.42, bowlY: 0.95 } as const;
/** (the median's grass half width: the basin stands on it) */
export const MEDIAN_GRASS = BOULEVARD_MEDIAN / 2 - 0.08;

/** Every solid box of the gateway (x0, z0, x1, z1, top) */
export const GATEWAY_SOLIDS: Box[] = [
  ...PYLONS.map((p): Box => [p.x - PYLON.half, p.z - PYLON.half, p.x + PYLON.half, p.z + PYLON.half, SLAB_Y + PYLON.h]),
  ...WINGS.map((w): Box => [w[0], w[1], w[2], w[3], SLAB_Y + WING.h]),
  [BASIN.x - BASIN.r, BASIN.z - BASIN.r, BASIN.x + BASIN.r, BASIN.z + BASIN.r, SLAB_Y + BASIN.rim],
];

/** Within `m` of any of the gateway's boxes (the verges' planting keeps off: crestgardens.ts) */
export const onGateway = (x: number, z: number, m = 0) => GATEWAY_SOLIDS.some(([x0, z0, x1, z1]) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m);
/** A rect (x0, z0, x1, z1) within `m` of any of the gateway's boxes */
export const nearGateway = (r: readonly number[], m = 0) => GATEWAY_SOLIDS.some(([x0, z0, x1, z1]) => r[0] < x1 + m && r[2] > x0 - m && r[1] < z1 + m && r[3] > z0 - m);
