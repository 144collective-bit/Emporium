/*
 * The city's street plan, in world units (1 = one map tile, about 1.8 m:
 * Degen is about one tile tall). Shared by the 3D city, the 2D map, the
 * builder's plots and the game server, so keep it free of the DOM and of
 * scene code.
 *
 * Streets are sized for real cars: lanes 1.7 wide (a car is about 1 wide
 * and 2.5 long), with a 0.8 sidewalk along every block.
 * - Streets (the cross streets through downtown, and the diagonals): one
 *   lane each way.
 * - Avenues (the ring round downtown, and the south bank road): two lanes
 *   each way with a median.
 *
 * Downtown (0-60 on both axes, inside the ring) is crossed by two straight
 * streets each way (`CORE_ROADS`, at 17 and 43), which carry on out past the
 * ring between the districts. Three diagonals run in from the ring's corners
 * and the blocks between are cut into lots, infill and squares
 * (downtown.ts, streetplan.ts). Districts and the extra lots sit on lines
 * centred on downtown's thirds (`BLOCKS`).
 *
 * The landmarks were drawn on an older grid (blocks at 0, 11 and 22):
 * `design()` moves a point drawn there onto the landmark's lot today
 * (`SEATS`), so landmark code and the data that mirrors it (collision boxes,
 * doors, dummies) keep their original numbers.
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

/** Downtown's size: 0-60 on both axes, inside the ring avenues */
export const DOWNTOWN = 60;
const CORE_END = DOWNTOWN;
/** The middle of downtown */
export const CENTER_XZ = { x: CORE_END / 2, z: CORE_END / 2 };
/** The straight streets crossing downtown (x for north-south, z for east-west); they get traffic lights where they cross */
export const CORE_ROADS = [17, 43];
/** Downtown's thirds, between the ring and the cross streets: 0-14.5, 19.5-40.5, 45.5-60 (lots, sidewalks off) */
export const THIRDS: [number, number][] = [
  [0, CORE_ROADS[0] - LANE - WALK_W],
  [CORE_ROADS[0] + LANE + WALK_W, CORE_ROADS[1] - LANE - WALK_W],
  [CORE_ROADS[1] + LANE + WALK_W, CORE_END],
];
/** The lines the districts and the extra lots sit on (their x or z origins): 9-wide lots centred on downtown's thirds */
export const BLOCKS = THIRDS.map(([a, b]) => (a + b) / 2 - BS / 2); // 2.75, 25.5, 48.25

/** The ring avenues round downtown: west / north at -4.5, east / north bank at 64.5 */
export const RING_LO = -AVENUE_GAP / 2;
export const RING_HI = CORE_END + AVENUE_GAP / 2;
/** District blocks beyond the ring: their near edges sit one avenue out */
export const OUTER_LO = -AVENUE_GAP - BS; // -18
export const OUTER_HI = CORE_END + AVENUE_GAP; // 69

/** The river, south of the north-bank avenue, with a 2-wide promenade either side */
export const RIVER: [number, number] = [RING_HI + AVENUE_GAP / 2 + 2, RING_HI + AVENUE_GAP / 2 + 5]; // 71-74
/** The south bank avenue, past the river and its riverside walk */
export const SOUTH_ROAD = RIVER[1] + 2.3 + AVENUE_GAP / 2 - WALK_W; // 80
/** Where the south row of districts starts */
export const SOUTH_ROW = SOUTH_ROAD + AVENUE_GAP / 2; // 84.5

/** The garage's lot on the south bank, east of the south row (S5), facing the south bank avenue */
export const GARAGE = { ox: OUTER_HI + BS + 4, oz: SOUTH_ROW }; // 82-91 x 84.5-93.5
/** The market square, east of the East districts, facing the north bank avenue (across the river from the garage) */
export const MARKET = { ox: OUTER_HI + BS + 4, oz: BLOCKS[2] }; // 82-91 x 48.25-57.25
/** Makers' Row: four units of your own, north of the market square across the street */
export const UNITS = { ox: OUTER_HI + BS + 4, oz: BLOCKS[1] }; // 82-91 x 25.5-34.5
/** The big lots (Phase 4, bought with Dorras, never the PLS district plots): three 9 x 9 lots east of Makers' Row and the market */
export const BIG_LOTS = [0, 1, 2].map((k) => ({ ox: UNITS.ox + BS + 5, oz: BLOCKS[k] })); // 96-105
/** Lots outside the core and the districts (raised and paved like a block, with a sidewalk round) */
export const EXTRA_LOTS = [GARAGE, MARKET, UNITS, ...BIG_LOTS];

/** Roads running north-south, at these x */
export const NS_ROADS: Road[] = [avenue(RING_LO), ...CORE_ROADS.map(street), avenue(RING_HI)];
/** Roads running east-west, at these z (the south bank avenue only runs east-west) */
export const EW_ROADS: Road[] = [avenue(RING_LO), ...CORE_ROADS.map(street), avenue(RING_HI), avenue(SOUTH_ROAD)];

/**
 * The world, edge to edge: grass, the river and every road run all the way. Room
 * to grow the city into; nothing is built past the districts and the garage yet.
 */
export const EXT: [number, number] = [-200, 240];
/** The built-up part: traffic loops here and the outskirts' trees fill round it */
export const CITY_EXT: [number, number] = [-80, 140];
/** How far you can walk or drive: x0, z0, x1, z1 (a little inside the edge) */
export const WORLD_BOUNDS: [number, number, number, number] = [EXT[0] + 6, EXT[0] + 6, EXT[1] - 6, EXT[1] - 6];

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

/** Which old block (0, 11 or 22) a coordinate drawn on the old grid belongs to (its lot, its sidewalk and half the street past it) */
const oldBlock = (v: number) => (v < 10 ? 0 : v < 21 ? 11 : 22);

/**
 * Where each landmark's old block (x, z origin on the old grid) sits today:
 * its lot's origin. Every landmark's front (its door side) faces south (+z):
 * onto a street, or onto a walk-only courtyard lane open to one.
 */
export const SEATS: Record<string, [number, number]> = {
  '11,11': [25.5, 31.5], // the Emporium: the centre block, its front on the south cross street
  '11,0': [20.5, 5.5], // the Signal tower and
  '22,0': [31.5, 5.5], // the Apartments, side by side in the north block with an alley between
  '0,22': [5.5, 19.5], // the Post office (its front on a courtyard lane) and
  '0,11': [5.5, 31.5], // the Vault, in the west block
  '22,11': [45.5, 19.5], // Drop 001 (on a courtyard lane) and
  '11,22': [45.5, 31.5], // the Workshop, in the east block
  '22,22': [48, 48], // the Armoury: the south-east block
  '0,0': [3, 3], // (the old park, not drawn any more)
};

/** How far a landmark drawn in the old block at (bx, bz) moves */
export function seat(bx: number, bz: number): [number, number] {
  const [ox, oz] = SEATS[`${oldBlock(bx)},${oldBlock(bz)}`];
  return [ox - oldBlock(bx), oz - oldBlock(bz)];
}
/** A point drawn on the landmarks' old grid, on its lot today */
export const design = (x: number, z: number): [number, number] => {
  const [dx, dz] = seat(x, z);
  return [x + dx, z + dz];
};
/** An x0, z0, x1, z1, (height) box drawn on the old grid: moved whole, by the block its centre is in */
export function designBox<B extends number[]>(b: B): B {
  const [dx, dz] = seat((b[0] + b[2]) / 2, (b[1] + b[3]) / 2);
  const out = [...b] as B;
  out[0] += dx;
  out[2] += dx;
  out[1] += dz;
  out[3] += dz;
  return out;
}
