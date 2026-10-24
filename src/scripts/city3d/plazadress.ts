/*
 * What only the plaza's drawing needs (docs/finance-plan.md Phase 3; DOM-free,
 * tested in tests/plaza.test.ts), kept out of the boot: plaza.ts is the boot's
 * (its solids, trees, lamps and people), this is Uptown's own chunk's.
 *
 * - **The canopies** (`CANOPIES`, `CANOPY_H`) over the lunch tables along the
 *   forecourt's north and south edges, their posts (`POSTS`) clear of the
 *   axis and the tables.
 * - **The kiosks' names** (`KIOSK_NAMES`): made up.
 * - **The LED ribbon** (`RIBBON`): round the podium of the tower across the
 *   street from the forecourt, over its lobby's canopy, fixed made-up words
 *   only (`RIBBON_WORDS`), never a number.
 */
import { AXIS_X, LANE_HALF, type Rect } from './uptown';
import { HIGHRISES, SPIRE_LOT } from './highrise';
import { TABLES, TABLE_ROWS, WATER_WALL } from './plaza';

/** The canopies' height over the slab, and their rects (round each row of lunch tables) */
export const CANOPY_H = 3.1;
export const CANOPIES: Rect[] = TABLE_ROWS.map((z): Rect => [WATER_WALL.trough + 0.5, z - 1.2, SPIRE_LOT[0] - 0.6, z + 1.2]);
/** Their posts along each long edge (x): the ends, either side of the axis, one between the two tables east of it */
export const POSTS: number[] = (() => {
  const [a, , b] = CANOPIES[0];
  const east = TABLES.filter(([x, z]) => z === TABLE_ROWS[0] && x > AXIS_X).map(([x]) => x);
  return [a + 0.2, AXIS_X - LANE_HALF - 0.5, AXIS_X + LANE_HALF + 0.5, (east[0] + east[1]) / 2, b - 0.2];
})();

/** The café kiosks' names, north terrace first */
export const KIOSK_NAMES = ['MARBLE CAFÉ', 'SKYLINE DELI'];

/** The LED ribbon: whose podium, its heights over the slab, how far out from the wall */
export const RIBBON = { tower: 'm2a', y0: 2.78, y1: 3.1, out: 0.03 };
export const RIBBON_TOWER = HIGHRISES.find((t) => t.id === RIBBON.tower)!;
/** Its words: fixed, made up, never a number */
export const RIBBON_WORDS = ['WELCOME TO UPTOWN', 'LUNCH ON THE PLAZA', 'LOOK UP', 'MEET ME BY THE WATER WALL', 'THE CITY NEVER SLEEPS', 'GOOD MORNING SKYLINE'];
