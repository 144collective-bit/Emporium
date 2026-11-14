/*
 * Degen's compound's plot (docs/ends-far-west-plan.md; DOM-free, the boot's): it stays exactly where it was built when
 * the south was re-laid (docs/south-plan.md, the owner's call: only the compound stays put), its gates on Gate Lane
 * (south.ts) where the Close used to end. What stands on it is home.ts's.
 */
import { LANE, WALK_W } from './layout';

type Pt = [number, number];
type Rect = [number, number, number, number];

/** The line the Close ran along, and its asphalt's half width (the gates face it) */
export const ROAD_Z = 380;
export const ROAD_HALF = LANE;
/** Gate Lane past the gates (south.ts `GATE_LANE`): its centre line's x there, and its half width */
export const LANE_X = -216;
export const LANE_HALF = LANE;
/** Where Gate Lane passes the gates (the High Road's end, south.ts `HIGH_ROAD`) */
export const HEAD: Pt = [LANE_X, ROAD_Z];
/** The lane's sidewalk's outer edge on the compound's side */
const LANE_W = LANE_X - LANE_HALF - WALK_W;
/** The compound's plot: 26 across, 24 deep, facing Gate Lane */
export const PLOT: Rect = [LANE_W - 26, ROAD_Z - 12, LANE_W, ROAD_Z + 12];
/** Where its gates stand: on the plot's east edge, the road's width and a little more, opposite the High Road's end */
export const GATES = { x: PLOT[2], z0: ROAD_Z - ROAD_HALF - 0.3, z1: ROAD_Z + ROAD_HALF + 0.3 };
