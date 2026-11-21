/*
 * The golf course's ground worked out for the city (docs/golf-plan.md Phase 2; DOM-free): golfground.ts's heights and
 * golf.ts's land on golflift.ts's grid, packed (`baked()` key `golf-ground`). Loaded only where there's no build's data
 * to read it from: the bake (scripts/bake.mjs, first, so the rest find it), the tests (scripts/test.mjs) and the seam
 * map's script; never by the city's own code, so the course's modules stay out of the boot (golf3d.ts, the course's
 * own chunk, carries golf.ts).
 */
import { baked } from './baked';
import { golfHeightAt, lakeWater } from './golfground';
import { CLUB_GROUNDS, HOLES, LAKES, fromDrive, fromPaths, lakeAt, nearestOn, surfaceAt } from './golf';
import { LAND, packGolf, setGolfMaker, type GolfGrid, type Land } from './golflift';

/** How far the rough must be from every hole's line to grow a tree (past the fairway, its cut and its bunkers), and
 * how far any tree keeps from a path, the drive, the water and the grounds */
export const TREES_CLEAR = { holes: 24, path: 3, drive: 5, water: 4, grounds: 8 };

/** What the land is at x, z (`LAND`): off the course, its native grass, its rough well clear of everything, or in play */
export function landAt(x: number, z: number): Land {
  const s = surfaceAt(x, z);
  if (s === null) return LAND.off;
  if (s !== 'native' && s !== 'rough') return LAND.play;
  const [gx0, gz0, gx1, gz1] = CLUB_GROUNDS;
  if (Math.hypot(Math.max(gx0 - x, 0, x - gx1), Math.max(gz0 - z, 0, z - gz1)) < TREES_CLEAR.grounds) return LAND.play;
  if (fromPaths(x, z) < TREES_CLEAR.path || fromDrive(x, z) < TREES_CLEAR.drive) return LAND.play;
  if (LAKES.some((l) => lakeAt(l, x, z) < 1 + TREES_CLEAR.water / Math.min(...l.r))) return LAND.play;
  if (s === 'native') return LAND.native;
  return HOLES.every((h) => nearestOn(h, x, z).d >= TREES_CLEAR.holes) ? LAND.rough : LAND.play;
}

/** The grid, worked out point by point */
export function makeGolfGrid(): GolfGrid {
  return packGolf(golfHeightAt, landAt, LAKES.map(lakeWater));
}
setGolfMaker(makeGolfGrid);
// (recorded by the bake as it loads this module)
baked('golf-ground', makeGolfGrid);
