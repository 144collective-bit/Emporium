// The Sector 7 Metro (metro.ts, growth plan Phase 8): the viaduct's pillars stand in the east ring avenue's median
// clear of every junction and the river, never too far apart; its stations sit between the junctions; the stair
// towers stand on open lawn, off every road, pad and solid; and the train keeps to its line and its timetable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DECK_HALF, LINE, LINE_X, METRO_SOLIDS, PILLARS, PILLAR_HALF, PLATFORM, ROUND_TRIP, STATIONS, TRAIN, rideAt, timetableAt, trainAt } from '../src/scripts/city3d/metro';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { MEDIAN, NS_ROADS, RIVER } from '../src/scripts/city3d/layout';
import { PADS } from '../src/scripts/city3d/outer';
import { SOLIDS } from '../src/scripts/city3d/solids';

const avenue = PLAN.streets.find((s) => s.id === `ns${NS_ROADS.length - 1}`)!;
const others = PLAN.streets.filter((s) => s !== avenue && s.kind !== 'alley');

test('the line runs down the middle of the east ring avenue', () => {
  assert.equal(LINE_X, avenue.pts[0][0]);
  assert.ok(LINE[0] < LINE[1]);
  for (const s of STATIONS) assert.ok(s.z - PLATFORM.half > LINE[0] && s.z + PLATFORM.half < LINE[1], s.id);
});

test("the pillars stand in the avenue's median, clear of every junction and the river, never more than 18 apart", () => {
  assert.ok(PILLAR_HALF < MEDIAN / 2);
  for (const z of PILLARS) {
    for (const o of others) assert.ok(distToStreet(o, [LINE_X, z]) > o.half + PILLAR_HALF + 0.2, `a pillar at z ${z.toFixed(1)} in ${o.id}`);
    assert.ok(z < RIVER[0] - 0.5 || z > RIVER[1] + 0.5, `a pillar at z ${z.toFixed(1)} in the river`);
  }
  for (let i = 1; i < PILLARS.length; i++) assert.ok(PILLARS[i] - PILLARS[i - 1] <= 18.1, `${PILLARS[i - 1]} to ${PILLARS[i]}`);
  assert.ok(PILLARS[0] - LINE[0] < 3 && LINE[1] - PILLARS[PILLARS.length - 1] < 3, 'held up at both ends');
});

test('the platforms are between junctions; the stair towers on open lawn, off every road, pad and solid', () => {
  for (const s of STATIONS) {
    for (let z = s.z - PLATFORM.half; z <= s.z + PLATFORM.half; z += 0.5)
      for (const o of others) assert.ok(distToStreet(o, [LINE_X, z]) > o.half + 0.3, `${s.id}'s platform over ${o.id}`);
    const [x0, z0, x1, z1] = s.tower;
    const corners: [number, number][] = [
      [x0, z0],
      [x1, z0],
      [x0, z1],
      [x1, z1],
      [(x0 + x1) / 2, (z0 + z1) / 2],
    ];
    for (const c of corners) for (const o of PLAN.streets) assert.ok(distToStreet(o, c) > o.half, `${s.id}'s tower on ${o.id}`);
    for (const p of PADS) assert.ok(x1 < p.rect[0] - 0.3 || x0 > p.rect[2] + 0.3 || z1 < p.rect[1] - 0.3 || z0 > p.rect[3] + 0.3, `${s.id}'s tower on pad ${p.id}`);
    for (const b of SOLIDS.filter((b) => !METRO_SOLIDS.includes(b))) assert.ok(x1 <= b[0] || x0 >= b[2] || z1 <= b[1] || z0 >= b[3], `${s.id}'s tower in a box at ${b.join(', ')}`);
    // Its door is at street level on the avenue's side, the stair tower within reach of the skybridge over the lanes
    assert.ok(s.door.x < x0 && x0 - s.door.x < 0.6 && s.door.z > z0 && s.door.z < z1);
    assert.ok(x0 - PLATFORM.x1 < 4 && PLATFORM.x0 === LINE_X + DECK_HALF);
    assert.ok(Math.abs((z0 + z1) / 2 - s.z) <= PLATFORM.half, `${s.id}'s tower is by its platform`);
  }
});

test('the train keeps to the line, stops at every station, and never jumps', () => {
  const seen = new Set<string>();
  let prev = trainAt(0);
  for (let t = 0; t <= ROUND_TRIP * 2; t += 0.05) {
    const p = trainAt(t);
    assert.ok(p.z >= LINE[0] + TRAIN.len / 2 - 6 && p.z <= LINE[1] - TRAIN.len / 2 + 6, `${p.z} at ${t}`);
    assert.ok(p.speed <= TRAIN.speed + 1e-9);
    assert.ok(Math.abs(p.z - prev.z) <= TRAIN.speed * 0.05 + 1e-6, `a jump at ${t}`);
    if (p.at) seen.add(p.at);
    prev = p;
  }
  assert.deepEqual([...seen].sort(), STATIONS.map((s) => s.id).sort());
  assert.ok(ROUND_TRIP > 60 && ROUND_TRIP < 240);
});

test('a ride goes straight there in well under a minute, and the timetable carries on from where it stops', () => {
  for (const a of STATIONS)
    for (const b of STATIONS) {
      if (a === b) continue;
      const r = rideAt(a.id, b.id, 0);
      assert.ok(r.total < 30, `${a.id} to ${b.id} takes ${r.total}`);
      assert.equal(rideAt(a.id, b.id, 0).z, a.z);
      assert.ok(Math.abs(rideAt(a.id, b.id, r.total).z - b.z) < 1e-9);
      const dir = b.z > a.z ? 1 : -1;
      const t = timetableAt(b.id, dir);
      assert.equal(trainAt(t).at, b.id);
      assert.equal(trainAt(t).z, b.z);
    }
});
