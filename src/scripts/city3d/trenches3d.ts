/*
 * The Trenches on screen, step 1 (docs/growth-plan.md Phase 9; the numbers
 * are trenches.ts): its streets as sites (tilework.ts), built as you go like
 * the rest of the fixed city: asphalt, Trench Avenue's median (broken at
 * its junctions; the el's pillars stand in it), lane lines (a yellow centre
 * line down the streets, white dashes between the avenue's lanes), zebra
 * crossings on every arm of every junction, and street lamps along both
 * sides. Its blocks are the street plan's (world.ts draws their slabs and
 * yards). The towers, brownstones and The Block come in the next steps.
 *
 * The grit step wore them: patches of newer and older asphalt down the lanes
 * (each inside its lane, clear of the lines), cracks, and manhole covers;
 * the lamps are sodium orange (world.ts, `lampKind()`).
 */
import { keepTreesOff } from './world';
import { TRENCH_CROSSINGS, TRENCH_RECT, TRENCH_STREETS } from './trenches';
import { drawStreets } from './streets3d';

/** The Trenches' streets, each stretch a site; and the lamps along them (before the city's lamps are built) */
export function buildTrenches() {
  keepTreesOff(TRENCH_RECT);
  drawStreets(TRENCH_STREETS, TRENCH_CROSSINGS, 'trench', true);
}
