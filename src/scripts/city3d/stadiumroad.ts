/*
 * Stadium Road and the walk north of the ring highway (DOM-free, tested in tests/stadiumroad.test.ts), drawn by
 * stadiumgrounds3d.ts. What was left when Sector 7 Stadium was removed (2026-11-22, the owner's call: the bowl, its
 * car park and loop, its block and match nights all gone; the road kept as a plain road, the walk and the Mall's north
 * gate kept). Its old land is open country again.
 *
 * - **Stadium Road** (`ROAD_LINE`) runs west off the north road past the highway (ns0) along `IN.z`, bends down and
 *   runs on west along `ROAD.z` to its end, a quiet road with no way through (traffic drives only from junction to
 *   junction: routes.ts). The street plan's `STADIUM_STREETS` and `STADIUM_CROSSINGS`.
 * - **The walk** (`WALK`): the Mall carried on from the park's north gate (westlake.ts `GATES`, `gate-n`) under the
 *   highway's deck to Stadium Road, a zebra over it (`ZEBRA`) onto the open land north of it.
 */
import { MALL, Z0 as PARK_EDGE } from './westlake';

export type Pt = [number, number];
export type Rect = [number, number, number, number];

/**
 * Stadium Road's way in (docs/highway-plan.md Phase 1b: the raised highway's exit 1 took its old line by the highway):
 * west along `z` from the north road (ns0, at x = -4.5, past the highway) to the bend (`BEND_X`), then down to the
 * stretch west (`ROAD`)
 */
export const IN = { z: -211, x0: -4.5 };
/** Where the way in bends down to the stretch west (where the stadium's car park loop's west side was, less five) */
const BEND_X = -97;
/** The stretch west: its centre line (z), from the bend's foot (`x0`) west to `x1`; a street's half width */
export const ROAD = { z: -188, x0: -100, x1: -182, half: 1.7 };
/** Stadium Road's centre line, from the north road to its end */
export const ROAD_LINE: Pt[] = [[IN.x0, IN.z], [BEND_X, IN.z], [ROAD.x0, ROAD.z], [ROAD.x1, ROAD.z]];

/** Stadium Road in the street plan (traffic drives it from the north road; its far end has no way through) */
export const STADIUM_STREETS: { id: string; pts: Pt[]; half: number; oneway?: -1 }[] = [{ id: 'stadium-road', pts: ROAD_LINE, half: ROAD.half }];
/** Where it meets the north road (no lights) */
export const STADIUM_CROSSINGS: { id: string; at: Pt; streets: string[] }[] = [{ id: 'stadium-in', at: [IN.x0, IN.z], streets: ['ns0', 'stadium-road'] }];
/**
 * Lamps along Stadium Road's north side: x, z, which way the arm reaches (ry turns +x towards it) and the ground's
 * height (open ground)
 */
export const STADIUM_LAMPS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  const north = ROAD.z - ROAD.half - 0.45;
  for (let x = ROAD.x1 + 4; x < ROAD.x0 - 3; x += 14) if (Math.abs(x - MALL.x) > 4) out.push([x, north, -Math.PI / 2, 0.02]);
  for (let x = BEND_X + 8; x < IN.x0 - 5; x += 12) out.push([x, IN.z - ROAD.half - 0.45, -Math.PI / 2, 0.02]);
  return out;
})();

/**
 * The Mall carried on north from the park's north gate under the raised highway's deck to Stadium Road's south kerb
 * (x, its half width, from z0 to z1), and the zebra over the road (docs/highway-plan.md Phase 2)
 */
export const WALK = { x: MALL.x, half: MALL.half, z0: PARK_EDGE, z1: ROAD.z + ROAD.half };
export const ZEBRA = { x: MALL.x, half: 1.4, z0: ROAD.z - ROAD.half, z1: ROAD.z + ROAD.half };
/** What the walk covers (the outskirts' trees and the deck's piers keep off) */
export const WALK_RECT: Rect = [WALK.x - WALK.half - 0.5, WALK.z1, WALK.x + WALK.half + 0.5, WALK.z0];

/** What the outskirts' trees keep off: the road's two stretches and the bend between, and the walk */
export const ROAD_RECTS: Rect[] = [
  [ROAD.x1 - 1, ROAD.z - ROAD.half - 1, ROAD.x0, ROAD.z + ROAD.half + 1],
  [BEND_X + 5, IN.z - ROAD.half - 1, IN.x0, IN.z + ROAD.half + 1],
  [ROAD.x0 - ROAD.half - 1, IN.z - ROAD.half - 1, BEND_X + 5 + ROAD.half + 1, ROAD.z + ROAD.half + 1],
  WALK_RECT,
];
/** All of it, for loading its grounds as you approach (districts.ts: with Westlake Park's) */
export const ROAD_AREA: Rect = [Math.min(...ROAD_RECTS.map((r) => r[0])), Math.min(...ROAD_RECTS.map((r) => r[1])), Math.max(...ROAD_RECTS.map((r) => r[2])), Math.max(...ROAD_RECTS.map((r) => r[3]))];
