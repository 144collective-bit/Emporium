/*
 * The civic quarter (docs/civic-plan.md, the owner's call; DOM-free, tested in tests/civic.test.ts): the seat of
 * power at Westlake Park's south end, on the Mall's line (Uptown's axis), facing Uptown across the avenue.
 * Phase 1 is the land: the civic square, the three lots kept for the buildings to come (City Hall on the axis at
 * the square's head, the police headquarters to its west and the courthouse to its east, both facing across the
 * square), the walk round City Hall to the Mall behind it, and what stands on the square (trees in grates,
 * lamps, benches, the axis inlaid). The park's own paths, trees, lamps, beds and benches keep off it all
 * (westlake.ts, gardens.ts, parklife.ts, ringstreet.ts read `inCivic()`).
 *
 * In world numbers: x across, z north (-) to south (+). Nothing here reads westlake.ts (it reads this), so the
 * park's edge and the axis are worked out the same way and the test holds them equal.
 */
import { EW_ROADS, WALK_W } from './layout';

export type Pt = [number, number];
/** x0, z0, x1, z1 */
export type Rect = [number, number, number, number];

const AVE = EW_ROADS[0];
/** The park's south edge, inside its sidewalk (westlake.ts `ZS`): the square opens onto the sidewalk here */
export const PARK_EDGE = AVE.c - AVE.half - WALK_W;
/** The axis: the Mall's line (westlake.ts `MALL.x`), on through Uptown's lane to the plaza's cross (uptown.ts `AXIS_X`) */
export const AXIS = -140;

/** The civic square: open to the avenue along its south side, the axis down its middle */
export const SQUARE: Rect = [AXIS - 16, -36, AXIS + 16, PARK_EDGE];

/**
 * City Hall's lot (Phase 2 builds on it): the front range across the square's head and the back block behind it on
 * the axis (narrower, clear of the lake loop's west curve); its front door on the axis at the square, its back door
 * onto the Mall
 */
export const HALL = {
  front: [AXIS - 12, -44, AXIS + 12, -36] as Rect,
  back: [AXIS - 8, -62, AXIS + 8, -44] as Rect,
  door: [AXIS, -36] as Pt,
  rear: [AXIS, -62] as Pt,
};
/** The police headquarters' lot (Phase 3), west of the square, its front to it (east) */
export const POLICE: Rect = [-167, -36, -158, -18];
/** The courthouse's lot (Phase 3), east of the square, its front to it (west); the lake loop is behind it */
export const COURT: Rect = [-122, -30, -113, -18];

export interface Lot {
  id: 'cityhall' | 'police' | 'courthouse';
  rects: Rect[];
  /** Which way its front faces (a unit vector): City Hall south over the square, the others across it */
  faces: Pt;
}
export const LOTS: Lot[] = [
  { id: 'cityhall', rects: [HALL.front, HALL.back], faces: [0, 1] },
  { id: 'police', rects: [POLICE], faces: [1, 0] },
  { id: 'courthouse', rects: [COURT], faces: [-1, 0] },
];

/** The walk behind City Hall (z): the west walk comes round to the Mall here, and the way to the lake leaves it */
export const BEHIND_Z = -66;
/** The west walk's line (x): between the police's lot and City Hall's front range */
export const WEST_WALK_X = AXIS - 15;
/** The walks round City Hall: from the square's north-west corner up its west side and round behind it to the Mall */
export const WEST_WALK: Pt[] = [
  [WEST_WALK_X, SQUARE[1] + 1.5],
  [WEST_WALK_X, BEHIND_Z],
  [AXIS, BEHIND_Z],
];
/** From the square's north-east corner towards the lake loop (westlake.ts carries it on to the loop's line) */
export const EAST_WALK_FROM: Pt = [SQUARE[2] - 1.5, SQUARE[1] + 1.5];
/** The walks' half width (as the park's small paths) */
export const WALK_HALF = 1.1;

const inRect = (r: Rect, p: Pt, m = 0) => p[0] > r[0] - m && p[0] < r[2] + m && p[1] > r[1] - m && p[1] < r[3] + m;
/** On the square (`m` more round it; the avenue's side is the park's edge) */
export const inSquare = (p: Pt, m = 0) => inRect(SQUARE, p, m);
/** On one of the lots (`m` more round them) */
export const onLot = (p: Pt, m = 0) => LOTS.some((l) => l.rects.some((r) => inRect(r, p, m)));
/** On the civic quarter's land: the square or a lot (what the park's trees, lamps, beds and benches keep off) */
export const inCivic = (p: Pt, m = 0) => inSquare(p, m) || onLot(p, m);

/* ---------- What stands on the square ---------- */

/** The square's two edges' lines (x), where its trees, lamps and benches stand, a little in from its sides */
export const EDGE_IN = 1.6;
export const EDGE_XS = [SQUARE[0] + EDGE_IN, SQUARE[2] - EDGE_IN];
/** Its trees in grates along both edges, north of the ring walk (which crosses the square at z -15); their grates' half size */
export const SQUARE_TREES: Pt[] = EDGE_XS.flatMap((x) => [-19.5, -25.5, -31.5].map((z): Pt => [x, z]));
export const GRATE = 0.75;
/** Its lamps: between the trees along both edges, and either side of the square's mouth on the avenue ([x, z, ry]: the arm towards the axis) */
export const SQUARE_LAMPS: [number, number, number][] = [
  ...EDGE_XS.flatMap((x) => [-22.5, -28.5].map((z): [number, number, number] => [x, z, x < AXIS ? 0 : Math.PI])),
  ...EDGE_XS.map((x): [number, number, number] => [x, PARK_EDGE - 2.2, x < AXIS ? 0 : Math.PI]),
];
/** Its benches: in front of the lamps, facing the axis (where, and which way the sitter faces: ry, +z turned) */
export const SQUARE_BENCHES: { at: Pt; ry: number }[] = SQUARE_LAMPS.slice(0, 4).map(([x, z]) => ({
  at: [x + (x < AXIS ? 1 : -1), z] as Pt,
  ry: x < AXIS ? Math.PI / 2 : -Math.PI / 2,
}));
/** The axis inlaid down the square, from the avenue to City Hall's door: its half width (the Mall's) */
export const AXIS_HALF = 2.4;
/** A border of inlay round the square's three park sides: its width */
export const BORDER = 0.6;
