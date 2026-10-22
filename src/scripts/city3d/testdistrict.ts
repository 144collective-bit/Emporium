/*
 * The test district (docs/growth-plan.md Phase 4; DOM-free, tested in
 * tests/recipes.test.ts): about 300 buildings laid by recipes on the open
 * land south of the river, west of the town, to measure the building kits
 * against the targets. It's only there with `?district=test` in the
 * address: the city itself doesn't change (new districts are the owner's
 * call, Phase 8).
 *
 * A grid of streets (one lane each way, like downtown's cross streets) off
 * the south bank avenue, and 20 blocks, each a recipe: midtown, high
 * streets, terraces, suburbs, warehouses, and one block each for the
 * factory, the school, the mall, the stadium and the crane.
 */
import { EW_ROADS, LANE, WALK_W } from './layout';
import { lotSolids } from './kits';
import { layDistrict, type DistrictBlock, type RecipeId } from './recipes';
import type { Box } from './solids';
import type { Pt, Rect } from './downtown';

/** The land it takes: south of the south bank avenue, out to the west */
export const DISTRICT_RECT: Rect = [-190, 100, -46, 228];
/** Its streets' width: a lane each way */
export const STREET_W = LANE * 2;
const COLS = 5;
const ROWS = 4;
const [X0, Z0, X1, Z1] = DISTRICT_RECT;
const BW = (X1 - X0 - (COLS + 1) * STREET_W) / COLS;
const BH = (Z1 - Z0 - (ROWS + 1) * STREET_W) / ROWS;
/** The avenue its streets run up to */
const AVENUE = EW_ROADS.find((r) => r.c > 80 && r.c < Z0)!;

/** Its streets, as rectangles of asphalt: north-south ones run up to the avenue */
export const DISTRICT_STREETS: Rect[] = [
  ...Array.from({ length: COLS + 1 }, (_, i): Rect => {
    const x = X0 + i * (BW + STREET_W);
    return [x, AVENUE.c + AVENUE.half, x + STREET_W, Z1];
  }),
  ...Array.from({ length: ROWS + 1 }, (_, j): Rect => {
    const z = Z0 + j * (BH + STREET_W);
    return [X0, z, X1, z + STREET_W];
  }),
];

/** Which recipe each block gets, row by row from the avenue */
const PLAN: RecipeId[][] = [
  ['mall', 'midtown', 'midtown', 'mainstreet', 'terraces'],
  ['midtown', 'midtown', 'mainstreet', 'terraces', 'suburb'],
  ['warehouses', 'midtown', 'mainstreet', 'school', 'terraces'],
  ['factory', 'warehouses', 'works', 'stadium', 'suburb'],
];

export interface TestBlock extends DistrictBlock {
  /** The block with its sidewalk (the raised slab) */
  slab: Rect;
}

/** Its blocks: the slab (sidewalk round the edge) and the land inside it the recipe fills */
export const DISTRICT_BLOCKS: TestBlock[] = PLAN.flatMap((row, j) =>
  row.map((recipe, i): TestBlock => {
    const x0 = X0 + STREET_W + i * (BW + STREET_W);
    const z0 = Z0 + STREET_W + j * (BH + STREET_W);
    const slab: Rect = [x0, z0, x0 + BW, z0 + BH];
    const m = WALK_W;
    const poly: Pt[] = [
      [x0 + m, z0 + m],
      [x0 + BW - m, z0 + m],
      [x0 + BW - m, z0 + BH - m],
      [x0 + m, z0 + BH - m],
    ];
    return { slab, poly, recipe, seed: 4000 + j * 10 + i };
  })
);

let laid: ReturnType<typeof layDistrict> | null = null;
/** The district laid out (on first ask: nothing is laid unless it's wanted) */
export function testDistrict() {
  return (laid ??= layDistrict(DISTRICT_BLOCKS));
}

/** What's solid in it: every building, and the bollards at its alleys' mouths */
export function districtSolids(): Box[] {
  const d = testDistrict();
  const r = 0.1;
  return [...d.lots.flatMap((l) => lotSolids(l)), ...d.alleys.flatMap((a) => a.bollards.map(([x, z]): Box => [x - r, z - r, x + r, z + r, 0.9]))];
}

/** Whether a point is on its land (the outskirts' trees keep off it) */
export const inDistrict = (x: number, z: number, m = 0) => x > X0 - m && x < X1 + m && z > Z0 - m && z < Z1 + m;
