/*
 * The Trenches on screen (docs/growth-plan.md Phase 9; the numbers are
 * trenches.ts, projects.ts, commons.ts, grit.ts, streetwall.ts, riverside.ts
 * and waterfront.ts): a district loaded as you approach (districts.ts), its
 * chunk a module the boot never downloads. `register()` registers its sites
 * (tilework.ts), built as you go like the rest of the fixed city, on the main
 * thread and in the site worker alike:
 *
 * - its streets (streets3d.ts): asphalt, Trench Avenue's median (broken at
 *   its junctions; the el's pillars stand in it), lane lines, zebra crossings
 *   on every arm of every junction; worn (the grit step): patches of newer
 *   and older asphalt down the lanes, cracks, manhole covers;
 * - the Trench Houses, the rows and the car parks (projects3d.ts), the
 *   communal areas (commons3d.ts), the grit (grit3d.ts), the street walls
 *   and low commercial (streetwall3d.ts), the riverside's three landmarks
 *   (riverside3d.ts), the boardwalk and the docks (boardwalk3d.ts).
 *
 * Everything else about it is in the boot: its streets and blocks in the
 * street plan, its solids, its places (The Block, Club PULSE, The Rusty Nail,
 * Trench Arms, Pier 7, the Night Market, the corner shops), and where its
 * trees, lamps, parked cars and people stand (`placeTrenches()`,
 * trenches-place.ts), so walking, driving, traffic, the lamps and the crowd
 * never wait for the chunk.
 */
import { TRENCH_CROSSINGS, TRENCH_STREETS } from './trenches';
import { drawStreets } from './streets3d';
import { registerProjects } from './projects3d';
import { registerCommons } from './commons3d';
import { registerGrit } from './grit3d';
import { registerStreetWalls } from './streetwall3d';
import { registerRiverside } from './riverside3d';
import { registerBoardwalk } from './boardwalk3d';

/** This module's own address: the site worker loads it too (districts.ts) */
export const SELF = import.meta.url;

export function register({ low }: { low: boolean }) {
  drawStreets(TRENCH_STREETS, TRENCH_CROSSINGS, 'trench', true);
  registerProjects(low);
  registerCommons(low);
  registerGrit(low);
  registerStreetWalls(low);
  registerRiverside(low);
  registerBoardwalk(low);
}
