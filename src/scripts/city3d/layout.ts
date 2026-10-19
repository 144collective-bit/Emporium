/*
 * The city's street plan, in world units (1 = one map tile, about 1.8 m:
 * Degen is about one tile tall). Shared by the 3D city, the 2D map, the
 * builder's plots and the game server, so keep it free of the DOM and of
 * scene code.
 *
 * Streets are sized for real cars: lanes 1.7 wide (a car is about 1 wide
 * and 2.5 long), with a 0.8 sidewalk along every block.
 * - Core streets (between the core city's blocks): one lane each way.
 * - Avenues (the ring round the core, and the south bank road): two lanes
 *   each way with a median.
 *
 * Blocks are 9 x 9 and keep their size; the streets between them set where
 * they sit. The landmarks were drawn on an older, tighter grid (blocks at
 * 0, 11 and 22 with 2-tile roads): `design()` moves a point drawn there to
 * its place on today's streets, so landmark code and the data that mirrors
 * it (collision boxes, doors, dummies) keep their original numbers.
 */

/** Block size (the lot, without its sidewalk) */
export const BS = 9;
export const LANE = 1.7;
/** Sidewalk round every block and district */
export const WALK_W = 0.8;
/** Raised strip down the middle of an avenue */
export const MEDIAN = 0.6;
export const STREET_GAP = 5;
export const AVENUE_GAP = 9;

export interface Road {
  /** Centre line (x for a north-south road, z for an east-west one) */
  c: number;
  /** Half the asphalt's width */
  half: number;
  /** Lanes each way */
  lanes: 1 | 2;
}
const street = (c: number): Road => ({ c, half: LANE, lanes: 1 });
const avenue = (c: number): Road => ({ c, half: MEDIAN / 2 + 2 * LANE, lanes: 2 });

/** The core city's blocks (x and z origins): 0-9, 14-23, 28-37 */
export const BLOCKS = [0, 14, 28];
const CORE_END = BLOCKS[2] + BS; // 37
/** The middle of the core city */
export const CENTER_XZ = { x: CORE_END / 2, z: CORE_END / 2 };

/** The ring avenues round the core: west / north at -4.5, east / north bank at 41.5 */
const RING_LO = -AVENUE_GAP / 2;
const RING_HI = CORE_END + AVENUE_GAP / 2;
/** District blocks beyond the ring: their near edges sit one avenue out */
export const OUTER_LO = -AVENUE_GAP - BS; // -18
export const OUTER_HI = CORE_END + AVENUE_GAP; // 46

/** The river, south of the north-bank avenue, with a 2-wide promenade either side */
export const RIVER: [number, number] = [RING_HI + AVENUE_GAP / 2 + 2, RING_HI + AVENUE_GAP / 2 + 5]; // 48-51
/** The south bank avenue, past the river and its riverside walk */
export const SOUTH_ROAD = RIVER[1] + 2.3 + AVENUE_GAP / 2 - WALK_W; // 57
/** Where the south row of districts starts */
export const SOUTH_ROW = SOUTH_ROAD + AVENUE_GAP / 2; // 61.5

/** Core streets between the core city's blocks (they get traffic lights where they cross) */
export const CORE_ROADS = [BLOCKS[0] + BS + STREET_GAP / 2, BLOCKS[1] + BS + STREET_GAP / 2]; // 11.5, 25.5

/** Roads running north-south, at these x */
export const NS_ROADS: Road[] = [avenue(RING_LO), ...CORE_ROADS.map(street), avenue(RING_HI)];
/** Roads running east-west, at these z (the south bank avenue only runs east-west) */
export const EW_ROADS: Road[] = [avenue(RING_LO), ...CORE_ROADS.map(street), avenue(RING_HI), avenue(SOUTH_ROAD)];

/** The playable world, edge to edge */
export const EXT: [number, number] = [-70, 101];

/** Lane centres of a road, with the direction traffic runs (+1 / -1 along the road's axis) */
export function laneCentres(r: Road, axis: 'x' | 'z'): { coord: number; dir: 1 | -1 }[] {
  const out: { coord: number; dir: 1 | -1 }[] = [];
  const inner = r.lanes === 2 ? MEDIAN / 2 : 0;
  for (let k = 0; k < r.lanes; k++) {
    const off = inner + LANE * (k + 0.5);
    // Drive on the right: along +x on the +z side; along +z on the -x side
    if (axis === 'x') out.push({ coord: r.c + off, dir: 1 }, { coord: r.c - off, dir: -1 });
    else out.push({ coord: r.c - off, dir: 1 }, { coord: r.c + off, dir: -1 });
  }
  return out;
}

/* ---------- The landmarks' drawing grid ---------- */

/** How far a landmark drawn in the old core block at `v` (0-9, 11-20 or 22-31) moves: 0, 3 or 6 */
export const designShift = (v: number) => (v < 10 ? 0 : v < 21 ? BLOCKS[1] - 11 : BLOCKS[2] - 22);
/** A point drawn on the landmarks' old grid, on today's streets */
export const design = (x: number, z: number): [number, number] => [x + designShift(x), z + designShift(z)];
/** An x0, z0, x1, z1, (height) box drawn on the old grid: moved whole, by the block its centre is in */
export function designBox<B extends number[]>(b: B): B {
  const dx = designShift((b[0] + b[2]) / 2);
  const dz = designShift((b[1] + b[3]) / 2);
  const out = [...b] as B;
  out[0] += dx;
  out[2] += dx;
  out[1] += dz;
  out[3] += dz;
  return out;
}
