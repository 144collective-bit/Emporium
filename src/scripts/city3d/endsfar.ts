/*
 * The Ends' far west (docs/ends-far-west-plan.md, the owner's call: still Endswood, carried further west, Degen's
 * compound its centrepiece; DOM-free, the boot's, tested in tests/endsfar.test.ts): the land west of the rows
 * (endswest.ts), the half docs/ends-west-plan.md kept for later. Phase 1 is the land and the road:
 *
 * - **The Close carried on** from where it ended (`CLOSE_WEST`, its bollards taken up: the owner's call) to a T
 *   (`HEAD`) with **the lane** (`ends-lane`), which runs north and south across its end (`LANE_X`, `LANE_Z`).
 * - **The compound's plot** (`PLOT`, block `ends-fc`) west of the lane, its gates' place on the lane opposite the
 *   Close's end (`GATES`), so the road runs straight at them.
 * - **The plots round it** (Phase 4 builds on them, the owner's pick: a close of bungalows and allotments): the
 *   bungalows' land north and south of the compound along the lane (`ends-fn`, `ends-fs`), the allotments behind
 *   all three (`ends-fa`), and the verge between the lane and the rows (`ends-fen`, `ends-fes`).
 * - **Sodium lamps** along the Close's new run and the lane (`FAR_LAMPS`, at the boot).
 *
 * In world numbers, x across, z north (-) to south (+); every rect is x0, z0, x1, z1.
 */
import { WALK_W } from './layout';
import { CLOSE_WEST, FAR_RECT, ROAD_HALF, ROAD_Z, SLAB_Y, WEST_X0, type Pt, type Rect } from './endswood';

export { FAR_RECT };

/** The lane across the Close's end: its centre line's x, and how far it runs north and south */
export const LANE_X = -216;
export const LANE_Z: [number, number] = [348, 412];
export const LANE_HALF = ROAD_HALF;
/** The T where the Close meets the lane */
export const HEAD: Pt = [LANE_X, ROAD_Z];

export interface FarStreet {
  id: string;
  pts: Pt[];
  half: number;
}
/** The Close's run on from its old end to the T, and the lane (dead ends both ways: no traffic, you walk or drive in) */
export const FAR_STREETS: FarStreet[] = [
  { id: 'ends-close-far', pts: [[CLOSE_WEST, ROAD_Z], HEAD], half: ROAD_HALF },
  { id: 'ends-lane', pts: [[LANE_X, LANE_Z[0]], HEAD, [LANE_X, LANE_Z[1]]], half: LANE_HALF },
];
export const FAR_CROSSINGS: { id: string; at: Pt; streets: string[] }[] = [{ id: 'ends-head', at: HEAD, streets: ['ends-close-far', 'ends-lane'] }];

/** The blocks' edges by the roads (inside their sidewalks) */
const LANE_W = LANE_X - LANE_HALF - WALK_W;
const LANE_E = LANE_X + LANE_HALF + WALK_W;
const N_EDGE = ROAD_Z - ROAD_HALF - WALK_W;
const S_EDGE = ROAD_Z + ROAD_HALF + WALK_W;
/** The gap between two blocks that share an edge: each one's sidewalk */
const GAP = WALK_W * 2;

/** The compound's plot: 26 across, 24 deep, on the Close's line */
export const PLOT: Rect = [LANE_W - 26, ROAD_Z - 12, LANE_W, ROAD_Z + 12];
/** Where its gates stand: on the plot's east edge, the Close's width and a little more, opposite the Close's end */
export const GATES = { x: PLOT[2], z0: ROAD_Z - ROAD_HALF - 0.3, z1: ROAD_Z + ROAD_HALF + 0.3 };

const rectPoly = ([x0, z0, x1, z1]: Rect): Pt[] => [
  [x0, z0],
  [x0, z1],
  [x1, z1],
  [x1, z0],
];
export interface FarBlock {
  id: string;
  /** What it's for (Phase 4 builds on all but the compound's) */
  use: 'compound' | 'bungalows' | 'allotments' | 'verge';
  rect: Rect;
  poly: Pt[];
}
/** The far west's blocks (the street plan's, ref `endswood`) */
export const FAR_BLOCKS: FarBlock[] = (
  [
    { id: 'ends-fc', use: 'compound', rect: PLOT },
    { id: 'ends-fn', use: 'bungalows', rect: [PLOT[0], LANE_Z[0], LANE_W, PLOT[1] - GAP] },
    { id: 'ends-fs', use: 'bungalows', rect: [PLOT[0], PLOT[3] + GAP, LANE_W, LANE_Z[1]] },
    { id: 'ends-fa', use: 'allotments', rect: [PLOT[0] - GAP - 14, LANE_Z[0], PLOT[0] - GAP, LANE_Z[1]] },
    // (between the lane and the rows' west sidewalk: a verge either side of the Close)
    { id: 'ends-fen', use: 'verge', rect: [LANE_E, LANE_Z[0], WEST_X0 - GAP, N_EDGE] },
    { id: 'ends-fes', use: 'verge', rect: [LANE_E, S_EDGE, WEST_X0 - GAP, LANE_Z[1]] },
  ] as Omit<FarBlock, 'poly'>[]
).map((b) => ({ ...b, poly: rectPoly(b.rect) }));

/** Sodium lamps (x, z, the way the arm reaches, the ground's height; lampmix.ts: Endswood's): one on the Close's new
 * run, and down the lane's east side, their arms out over it (a lamp's arm reaches along cos ry, -sin ry) */
export const FAR_LAMPS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  const IN = ROAD_HALF + 0.45;
  out.push([(CLOSE_WEST + LANE_E) / 2, ROAD_Z - IN, -Math.PI / 2, SLAB_Y]);
  for (const z of [356, 372, 388, 404]) out.push([LANE_X + IN, z, Math.PI, SLAB_Y]);
  return out;
})();
