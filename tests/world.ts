// Shared bits for the tests: the city's raised ground and box maths.
import { DISTRICTS } from '../src/data/plots';
import { BLOCKS, BS, EXTRA_LOTS, WALK_W } from '../src/scripts/city3d/layout';
import type { Box } from '../src/scripts/city3d/solids';

export type Rect = [x0: number, z0: number, x1: number, z1: number];

/** Every raised slab (a block, district or an extra lot: garage, market) with its sidewalk */
export const SLABS: Rect[] = [
  ...BLOCKS.flatMap((x) => BLOCKS.map((z) => [x, z] as const)),
  ...DISTRICTS.map((d) => [d.ox, d.oz] as const),
  ...EXTRA_LOTS.map((l) => [l.ox, l.oz] as const),
].map(([x, z]) => [x - WALK_W, z - WALK_W, x + BS + WALK_W, z + BS + WALK_W] as Rect);

export const overlaps = (a: Rect | Box, b: Rect | Box) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
export const inside = (a: Rect | Box, b: Rect | Box) => a[0] >= b[0] && a[2] <= b[2] && a[1] >= b[1] && a[3] <= b[3];
export const pointIn = (x: number, z: number, b: Rect | Box, pad = 0) => x > b[0] - pad && x < b[2] + pad && z > b[1] - pad && z < b[3] + pad;
