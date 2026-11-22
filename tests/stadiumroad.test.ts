// Stadium Road and the walk north of the ring highway (stadiumroad.ts): what was left when Sector 7 Stadium was removed
// (2026-11-22, the owner's call). The road off the north road where it was, its crossing, the walk from the park's
// north gate under the deck to a zebra over it; the stadium's place, its loop and its solids all gone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IN, ROAD, ROAD_AREA, ROAD_LINE, ROAD_RECTS, STADIUM_CROSSINGS, STADIUM_LAMPS, STADIUM_STREETS, WALK, ZEBRA } from '../src/scripts/city3d/stadiumroad';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { PLACES } from '../src/scripts/city3d/places';
import { LIVE_PLACES } from '../src/scripts/city3d/live';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { MALL, Z0 } from '../src/scripts/city3d/westlake';

test('Stadium Road: off the north road where it was, one street, its one crossing, in the street plan', () => {
  assert.deepEqual(ROAD_LINE[0], [IN.x0, IN.z]);
  assert.deepEqual(ROAD_LINE.at(-1), [ROAD.x1, ROAD.z]);
  assert.deepEqual(STADIUM_STREETS.map((s) => s.id), ['stadium-road']);
  assert.deepEqual(STADIUM_CROSSINGS.map((c) => c.id), ['stadium-in']);
  const road = PLAN.streets.find((s) => s.id === 'stadium-road')!;
  assert.ok(road, 'not in the street plan');
  assert.ok(!PLAN.streets.some((s) => s.id === 'stadium-loop'), 'the loop is gone');
  assert.ok(!PLAN.blocks.some((b) => b.id === 'stadium'), "the stadium's block is gone");
  const ns0 = PLAN.streets.find((s) => s.id === 'ns0')!;
  assert.ok(distToStreet(ns0, [IN.x0, IN.z]) < ns0.half, 'it meets the north road');
  // (its lamps beside it, off its asphalt)
  for (const [x, z] of STADIUM_LAMPS) assert.ok(distToStreet(road, [x, z]) > road.half && distToStreet(road, [x, z]) < road.half + 1, `a lamp at ${x}, ${z}`);
});

test('the walk: from the park\'s north gate under the deck to a zebra over Stadium Road', () => {
  assert.equal(WALK.x, MALL.x);
  assert.equal(WALK.z0, Z0);
  assert.equal(WALK.z1, ROAD.z + ROAD.half);
  assert.equal(ZEBRA.x, WALK.x);
  assert.ok(ZEBRA.z0 === ROAD.z - ROAD.half && ZEBRA.z1 === ROAD.z + ROAD.half);
  // (all of it inside what loads with the park's chunk)
  for (const r of ROAD_RECTS) assert.ok(r[0] >= ROAD_AREA[0] && r[1] >= ROAD_AREA[1] && r[2] <= ROAD_AREA[2] && r[3] <= ROAD_AREA[3]);
});

test('the stadium is gone: no place, no live line, nothing solid on its old land north of the road', () => {
  assert.ok(!PLACES.some((p) => (p.id as string) === 'stadium'));
  assert.ok(!LIVE_PLACES.some((p) => (p.id as string) === 'stadium'));
  // (its old block, north of Stadium Road and west of its bend)
  const [x0, z0, x1, z1] = [-184, -262, -106, ROAD.z - ROAD.half - 1];
  assert.ok(!SOLIDS.some((b) => (b[0] + b[2]) / 2 > x0 && (b[0] + b[2]) / 2 < x1 && (b[1] + b[3]) / 2 > z0 && (b[1] + b[3]) / 2 < z1), 'something solid on its old land');
});
