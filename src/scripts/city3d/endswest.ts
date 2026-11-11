/*
 * Endswood carried west (docs/ends-west-plan.md, the owner's call: still Endswood, an extension; DOM-free, the boot's,
 * tested in tests/endswest.test.ts): the council-estate town houses on the land west of Lot 9's tunnel's footpath,
 * outside the ring highway's south-west bend. Phase 1 is the land and the streets (the owner's picks: the Close carried
 * west as the extension's spine road, its bollards moved to its far end; houses facing footpaths and greens with cars
 * in courts behind; the near half now):
 *
 * - **The Close carried west** (endswood.ts `ends-close`, to `CLOSE_WEST`), a zebra where the tunnel's footpath crosses
 *   it (`ZEBRA`), short pavements either side of it between the old estate and the extension (`LINK_BLOCKS`).
 * - **Two blocks** either side of it (`WEST_BLOCKS`, ref `endswood` in the street plan): on each a service lane in from
 *   the Close at its west end (`LANES`) to the parking courts behind the rows (`COURTS`), the rows' footprints kept for
 *   Phase 2 (`ROWS`, each with the way it faces), their back gardens (`GARDENS`), the footpaths along their fronts
 *   (`PATHS`) either side of a green (`GREENS`), a footpath down the blocks' east side from the fronts to the Close, and
 *   the blocks' east ends kept for Phase 3 (the parade, the playground, the garage block: `RESERVE`).
 * - **Sodium lamps** along the Close and in the courts, over the greens and the kickabout green (`WEST_LAMPS`, at the boot).
 *
 * In world numbers, x across, z north (-) to south (+); every rect is x0, z0, x1, z1.
 */
import { WALK_W } from './layout';
import { CLOSE_END, CLOSE_WEST, ROAD_HALF, ROAD_Z, SLAB_Y, WEST_RECT, WEST_X0, type Pt, type Rect } from './endswood';
import { FOOTPATH, PATH_RECT } from './lot9';

export { WEST_RECT, CLOSE_WEST };

/** The blocks' edges either side of the Close (inside their sidewalks), their north and south edges and the east one */
export const N_EDGE = ROAD_Z - ROAD_HALF - WALK_W;
export const S_EDGE = ROAD_Z + ROAD_HALF + WALK_W;
export const NORTH = 336;
export const SOUTH = 462;
export const EAST = -136;

const rectPoly = ([x0, z0, x1, z1]: Rect): Pt[] => [
  [x0, z0],
  [x0, z1],
  [x1, z1],
  [x1, z0],
];

export interface WestBlock {
  id: string;
  rect: Rect;
  poly: Pt[];
}
/** The extension's two blocks, north and south of the Close (the street plan's, ref `endswood`) */
export const WEST_BLOCKS: WestBlock[] = [
  { id: 'ends-wn', rect: [WEST_X0, NORTH, EAST, N_EDGE] as Rect },
  { id: 'ends-ws', rect: [WEST_X0, S_EDGE, EAST, SOUTH] as Rect },
].map((b) => ({ ...b, poly: rectPoly(b.rect) }));

/** The tunnel's footpath's x where it crosses the Close (lot9.ts `FOOTPATH`) */
export const PATH_X = (() => {
  for (let i = 1; i < FOOTPATH.length; i++) {
    const [a, c] = [FOOTPATH[i - 1], FOOTPATH[i]];
    if ((a[1] - ROAD_Z) * (c[1] - ROAD_Z) <= 0) return a[0] + ((c[0] - a[0]) * (ROAD_Z - a[1])) / (c[1] - a[1]);
  }
  return FOOTPATH[0][0];
})();
/** The zebra over the Close where the footpath crosses it: its middle and half its width along the road */
export const ZEBRA = { x: PATH_X, half: 1.2 };
/** The pavements either side of the Close between the extension and the old estate (all sidewalk), broken where the
 * footpath crosses: [x0, x1] of each run (their polys are thin strips along the road) */
const LINK_DEPTH = 0.8;
export const LINK_RUNS: [number, number][] = [
  [EAST + WALK_W * 2 + 0.0001, PATH_RECT[0] - WALK_W - 0.2],
  [PATH_RECT[2] + WALK_W + 0.4, CLOSE_END - 0.8],
];
export const LINK_BLOCKS: WestBlock[] = LINK_RUNS.flatMap(([x0, x1], i): WestBlock[] =>
  [
    { id: `ends-wl${i}n`, rect: [x0, N_EDGE - LINK_DEPTH, x1, N_EDGE] as Rect },
    { id: `ends-wl${i}s`, rect: [x0, S_EDGE, x1, S_EDGE + LINK_DEPTH] as Rect },
  ].map((b) => ({ ...b, poly: rectPoly(b.rect) }))
);

/* ---------- On the blocks ---------- */

/** The service lanes in from the Close at the blocks' west ends, to the courts (a shared surface: cars in, people too) */
export const LANE = { x0: WEST_X0 + 2, x1: WEST_X0 + 6 };
export const LANES: Rect[] = [
  [LANE.x0, NORTH, LANE.x1, N_EDGE],
  [LANE.x0, S_EDGE, LANE.x1, 432],
];
/** The rows' run along x: from past the lane to the footpath down the blocks' east side */
export const ROW_X: [number, number] = [LANE.x1 + 3, -152];
/** The parking courts behind the rows (asphalt, the bays marked), off the lanes */
export const COURTS: Rect[] = [
  [LANE.x1, 337, ROW_X[1], 345],
  [LANE.x1, 386, ROW_X[1], 394],
  [LANE.x1, 424, ROW_X[1], 432],
];
/** A row of town houses (Phase 2 builds them): its footprint and the way its fronts face (+1 south, -1 north) */
export interface Row {
  id: string;
  rect: Rect;
  faces: 1 | -1;
}
/** How deep a house is, front to back */
export const HOUSE_DEPTH = 6;
const row = (id: string, z0: number, faces: 1 | -1): Row => ({ id, rect: [ROW_X[0], z0, ROW_X[1], z0 + HOUSE_DEPTH], faces });
export const ROWS: Row[] = [
  row('rn1', 349, 1),
  row('rn2', 365, -1),
  row('rs1', 398, 1),
  row('rs2', 414, -1),
  row('rs3', 436, 1),
  row('rs4', 452, -1),
];
/** Each row's back gardens: between its back and the court behind it (or the block's edge) */
export const GARDENS: Rect[] = ROWS.map((r): Rect => {
  const [x0, z0, x1, z1] = r.rect;
  if (r.faces > 0) {
    const court = COURTS.find((c) => c[3] <= z0 && z0 - c[3] < 6);
    return [x0, court ? court[3] : z0 - 4, x1, z0];
  }
  const court = COURTS.find((c) => c[1] >= z1 && c[1] - z1 < 6);
  const edge = z1 < N_EDGE ? N_EDGE - 1.5 : SOUTH;
  return [x0, z1, x1, court ? court[1] : edge];
});
/** The front paths along the rows' fronts (paving), each pair either side of a green; and the green between them */
const PATH_W = 1.5;
export const GREENS: Rect[] = [];
export const PATHS: Rect[] = [];
for (let i = 0; i < ROWS.length; i += 2) {
  const [a, c] = [ROWS[i], ROWS[i + 1]];
  const [z0, z1] = [a.rect[3], c.rect[1]];
  PATHS.push([LANE.x1, z0, ROW_X[1] + 2, z0 + PATH_W], [LANE.x1, z1 - PATH_W, ROW_X[1] + 2, z1]);
  GREENS.push([ROW_X[0], z0 + PATH_W, ROW_X[1], z1 - PATH_W]);
}
/** The footpath down each block's east side, from the fronts to the Close's sidewalk */
export const CROSS_PATHS: Rect[] = [
  [ROW_X[1] + 0.5, NORTH + 1, ROW_X[1] + 2, N_EDGE],
  [ROW_X[1] + 0.5, S_EDGE, ROW_X[1] + 2, SOUTH - 1],
];
/** The blocks' east ends, kept for Phase 3 (the parade on the Close, the playground, the green, the garage block) */
export const RESERVE: Rect[] = [
  [ROW_X[1] + 4, NORTH + 1, EAST - 1, N_EDGE - 1],
  [ROW_X[1] + 4, S_EDGE + 1, EAST - 1, SOUTH - 1],
];

/* ---------- Lamps ---------- */

/** Sodium lamps (x, z, the way the arm reaches, the ground's height; lampmix.ts: Endswood's): along the Close's
 * sidewalks either side, at the courts' and greens' north edges reaching in over them */
export const WEST_LAMPS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  const IN = ROAD_HALF + 0.45;
  for (const x of [-122, -146, -170, -190]) out.push([x, ROAD_Z - IN, Math.PI / 2, SLAB_Y]);
  for (const x of [-128, -158, -182]) out.push([x, ROAD_Z + IN, -Math.PI / 2, SLAB_Y]);
  const mid = (ROW_X[0] + ROW_X[1]) / 2;
  for (const r of [...COURTS, ...GREENS]) out.push([mid, r[1] + 0.35, Math.PI / 2, SLAB_Y]);
  // (and the kickabout green, Phase 4: two along the south block's cross path, over the green, its game lit at night)
  for (const z of [418, 444]) out.push([CROSS_PATHS[1][2] - 0.15, z, Math.PI, SLAB_Y]);
  return out;
})();
