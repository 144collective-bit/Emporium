/*
 * Uptown North and Westlake Park, where they meet with no street between (docs/blend-plan.md Phase 6e; DOM-free,
 * tested in tests/parkedge.test.ts). The park's east sidewalk and Uptown North's west one run side by side along
 * the park's low wall, the west column's towers opening their lobbies onto them: two strips of plain sidewalk, no
 * lamps and no trees, between the park's trees and the towers. Now they're one walk: the plaza's granite laid over
 * both (`PROMENADE`, its edge in line with the park's lot), a row of trees in grates down the line where they meet
 * (`EDGE_TREES`, about every `TREE_GAP`) and lamps between them (`EDGE_LAMPS`), all clear of the gates and their
 * walks, the lobbies' doors, the square's own trees and lamps, the park's lamps and anything solid.
 */
import { WALK_W } from './layout';
import { GATE_WALKS, NORTH_LAMPS, NORTH_RECT, SQUARE_TREES, type Rect } from './uptownnorth';
import { GATES, PARK_LAMPS, X1 } from './westlake';
import { HIGHRISES } from './highrise';
import { SOLIDS } from './solids';

type Pt = [number, number];

/** Where the two sidewalks meet: the park's lot edge plus its sidewalk (Uptown North's lot edge less its own) */
export const EDGE_X = X1 + WALK_W;
/** The walk: from the park's lot edge (its wall stands just inside; a hair off it, clear of the gates' paths) to Uptown North's lot, the block's length */
export const PROMENADE: Rect = [X1 + 0.02, NORTH_RECT[1] - WALK_W, NORTH_RECT[0] - 0.01, NORTH_RECT[3] + WALK_W];

/** The gates in the park's east wall along it, and the doors of the towers facing the park */
const EDGE_GATES = GATES.filter((g) => g.out[0] === 1 && g.at[1] > PROMENADE[1] && g.at[1] < PROMENADE[3]);
const DOORS: Pt[] = HIGHRISES.filter((h) => h.block === 'uptown-north' && h.door[0] < NORTH_RECT[0] + 1).map((h) => [h.door[0], h.door[1]]);
/** How far along the walk the trees and lamps keep from a gate's middle (its piers and its walk's mouth) and a door */
export const GATE_CLEAR = 4;
export const DOOR_CLEAR = 3;
/** The trees: about this far apart, this big */
export const TREE_GAP = 7;
export const TREE_S = 0.95;
/** The grates round them */
export const GRATE = 1.2;

const inBox = (r: readonly number[], q: Pt, m: number) => q[0] > r[0] - m && q[0] < r[2] + m && q[1] > r[1] - m && q[1] < r[3] + m;
/** Clear along the walk at z: of the gates, their walks through the block, the doors */
const clearAt = (z: number) =>
  EDGE_GATES.every((g) => Math.abs(g.at[1] - z) >= g.half + GATE_CLEAR) &&
  GATE_WALKS.every((w) => z <= w[1] - 1 || z >= w[3] + 1) &&
  DOORS.every((d) => Math.abs(d[1] - z) >= DOOR_CLEAR);
const lampsNear: Pt[] = [...NORTH_LAMPS, ...PARK_LAMPS].map(([x, z]) => [x, z] as Pt);

/** Spots spread evenly along the walk about `gap` apart, kept where `ok` holds */
function along(gap: number, offset: number, ok: (q: Pt) => boolean, nudge: number[] = [0]): Pt[] {
  const [z0, z1] = [PROMENADE[1] + 2, PROMENADE[3] - 2];
  const n = Math.round((z1 - z0) / gap);
  const out: Pt[] = [];
  for (let k = 0; k <= n; k++) {
    const z = z0 + ((z1 - z0) * (k + offset)) / n;
    // (a spot that's taken moves along a little rather than being lost)
    const q = nudge.map((d): Pt => [EDGE_X, z + d]).find((c) => c[1] >= z0 && c[1] <= z1 && clearAt(c[1]) && ok(c));
    if (q) out.push(q);
  }
  return out;
}

/** Lamps about every other tree's spacing down the middle of the walk, the arm over it towards the towers (x, z, ry) */
export const EDGE_LAMPS: [number, number, number][] = along(
  TREE_GAP * 2,
  0.25,
  (q) => !SOLIDS.some((b) => inBox(b, q, 0.3)) && lampsNear.every((l) => Math.hypot(l[0] - q[0], l[1] - q[1]) > 4),
  [0, 2, -2, 3.5, -3.5]
).map(([x, z]) => [x, z, 0]);

/** The trees in grates down the middle of the walk, clear of its lamps (x, z, size) */
export const EDGE_TREES: [number, number, number][] = along(TREE_GAP, 0, (q) =>
  !SOLIDS.some((b) => inBox(b, q, GRATE / 2 + 0.1)) &&
  SQUARE_TREES.every((t) => Math.hypot(t[0] - q[0], t[1] - q[1]) > 3) &&
  lampsNear.every((l) => Math.hypot(l[0] - q[0], l[1] - q[1]) > 2) &&
  EDGE_LAMPS.every((l) => Math.hypot(l[0] - q[0], l[1] - q[1]) > 2.4)
, [0, 1.2, -1.2]).map(([x, z]) => [x, z, TREE_S]);
