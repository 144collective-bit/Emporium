/*
 * The golf course's ground worked out for the city (docs/golf-plan.md Phase 2; DOM-free): golfground.ts's heights and
 * golf.ts's land on golflift.ts's grid, packed (`baked()` key `golf-ground`). Loaded only where there's no build's data
 * to read it from: the bake (scripts/bake.mjs, first, so the rest find it), the tests (scripts/test.mjs) and the seam
 * map's script; never by the city's own code, so the course's modules stay out of the boot (golf3d.ts, the course's
 * own chunk, carries golf.ts).
 */
import { baked } from './baked';
import { golfHeightAt, lakeWater } from './golfground';
import { LAKES, surfaceAt } from './golf';
import { packGolf, setGolfMaker, type GolfGrid } from './golflift';

/** The grid, worked out point by point */
export function makeGolfGrid(): GolfGrid {
  return packGolf(
    golfHeightAt,
    (x, z) => {
      const s = surfaceAt(x, z);
      return s === null ? 0 : s === 'native' ? 1 : 2;
    },
    LAKES.map(lakeWater)
  );
}
setGolfMaker(makeGolfGrid);
// (recorded by the bake as it loads this module)
baked('golf-ground', makeGolfGrid);
