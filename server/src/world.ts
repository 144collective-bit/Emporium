/*
 * The city's geometry as the game server needs it: the boxes bullets stop
 * on and the gun stores' counters, baked when the Worker is built
 * (scripts/bake-world.mjs writes world.gen.txt), so the Worker never loads
 * solids.ts and every district's layout behind it. That took about 0.4 s of
 * CPU at startup, over Cloudflare's limit (deploys failed with code 10021).
 *
 * The ray is solids.ts's `rayBoxes()` less Crestmont's hills: no target
 * (the dummies, the drones) stands within a gun's range of them
 * (tests/solids.test.ts holds that), so a hit is decided the same way.
 */
import { BoxGrid, boxesAlong, groundAlong } from '../../src/scripts/city3d/boxgrid';
import type { Box } from '../../src/scripts/city3d/solids';
import WORLD from './world.gen.txt';

const world = JSON.parse(WORLD) as { shots: Box[]; counters: { x: number; z: number }[] };

/** Where a player may gear up: the gun stores' counters (the Armoury's, Trench Arms' hatch) */
export const COUNTERS: readonly { x: number; z: number }[] = world.counters;

/** What bullets stop on (solids.ts's SHOT_GRID) */
const SHOT_GRID = new BoxGrid(world.shots);

/** Distance along a ray to the first solid box or the ground, up to `max` (as solids.ts's `rayBoxes()`) */
export const rayBoxes = (from: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }, max: number) =>
  boxesAlong(SHOT_GRID, from, dir, groundAlong(from, dir, max));
