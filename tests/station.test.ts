// Sector 7 Central, the grand station (station.ts, docs/station-plan.md step 1): its block west of the highway between
// the park's avenue and its car park, the hall and the shed on it, the platforms between the tracks, the floor you walk
// on (up the ramp from the doors), every platform reachable on foot from the plaza, its loop and slip lanes in the
// street plan, what's solid off the streets, its people on their floors, and everything under the Emporium.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BAYS,
  BOULEVARD_TREES,
  CAR_PARK,
  CONCOURSE,
  DOORS,
  FOUNTAINS,
  HALL,
  ISLANDS,
  LOOP,
  PARKED,
  PLAT_Y,
  PLAZA,
  RAMP,
  SHED,
  STATION_BLOCK,
  STATION_LAMPS,
  STATION_PEOPLE,
  STATION_SOLIDS,
  STATION_SPAWN,
  TALLEST,
  TRACKS,
  stationY,
} from '../src/scripts/city3d/station';
import { HIGHWAY_BOX } from '../src/scripts/city3d/highway';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { EXT, WORLD_BOUNDS } from '../src/scripts/city3d/layout';

type Box = [number, number, number, number, number];
const inBox = (b: Box | number[], x: number, z: number, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;
const roads = PLAN.streets.filter((s) => s.kind !== 'alley');

test('west of the highway, between the park\'s avenue and the car park, the hall and the shed on its block', () => {
  assert.ok(STATION_BLOCK[2] < HIGHWAY_BOX[0] - 30 && STATION_BLOCK[0] > WORLD_BOUNDS[0]);
  for (const r of [STATION_BLOCK, PLAZA, CAR_PARK])
    for (const [x, z] of [[r[0], r[1]], [r[2], r[1]], [r[0], r[3]], [r[2], r[3]]] as [number, number][])
      for (const s of roads) assert.ok(distToStreet(s, [x, z]) > s.half + 0.79, `${r} on ${s.id}`);
  assert.ok(HALL.x0 >= STATION_BLOCK[0] && HALL.x1 <= STATION_BLOCK[2] && HALL.z0 >= STATION_BLOCK[1] && HALL.z1 <= STATION_BLOCK[3]);
  assert.ok(SHED.x0 >= STATION_BLOCK[0] && SHED.z0 >= HALL.z0 && SHED.z1 <= HALL.z1 && SHED.x1 === HALL.x0);
  assert.ok(SHED.x1 - SHED.x0 >= 110, 'a long shed');
  assert.ok(TALLEST < 12.5, 'under the Emporium');
  assert.ok(EXT[0] < SHED.x0, 'the tracks run on west to the edge');
});

test('ten tracks, five island platforms between them, numbered from the south', () => {
  assert.equal(TRACKS.length, 10);
  assert.equal(ISLANDS.length, 5);
  for (const [z0, z1] of ISLANDS) {
    assert.ok(z0 > SHED.z0 && z1 < SHED.z1);
    // A track along each edge, its middle a little out from it
    assert.ok(TRACKS.some((t) => Math.abs(t - (z0 - 1.2)) < 1e-6) && TRACKS.some((t) => Math.abs(t - (z1 + 1.2)) < 1e-6));
  }
  for (const t of TRACKS) assert.ok(!ISLANDS.some(([z0, z1]) => t > z0 - 0.9 && t < z1 + 0.9), `track at ${t} under a platform`);
  for (let i = 1; i < TRACKS.length; i++) assert.ok(TRACKS[i] < TRACKS[i - 1], 'numbered from the south');
});

test('the floor: the concourse and the platforms at the platforms\' height, the ramp down to the doors, nothing outside', () => {
  const zm = (HALL.z0 + HALL.z1) / 2;
  assert.equal(stationY((HALL.x0 + RAMP.x0) / 2, zm), PLAT_Y);
  assert.ok(Math.abs(stationY(CONCOURSE[2] - 0.01, DOORS.z[1])!) < 0.01, 'down to the ground at the doors');
  for (const [z0, z1] of ISLANDS) assert.equal(stationY(-330, (z0 + z1) / 2), PLAT_Y);
  for (const t of TRACKS) assert.equal(stationY(-330, t), null);
  assert.equal(stationY(STATION_SPAWN.x, STATION_SPAWN.z), null);
});

test('every platform on foot from the plaza, through the doors and the concourse', () => {
  const solid = (x: number, z: number) => SOLIDS.some((b) => inBox(b, x, z, 0.3));
  const [x0, z0, x1, z1] = [SHED.x0 + 0.5, HALL.z0 - 2, PLAZA[2], PLAZA[3]];
  const step = 0.5;
  const nx = Math.ceil((x1 - x0) / step);
  const nz = Math.ceil((z1 - z0) / step);
  const seen = new Uint8Array(nx * nz);
  const ix = (x: number) => Math.round((x - x0) / step);
  const iz = (z: number) => Math.round((z - z0) / step);
  const queue: [number, number][] = [[ix(STATION_SPAWN.x), iz(STATION_SPAWN.z)]];
  assert.ok(!solid(STATION_SPAWN.x, STATION_SPAWN.z), 'the spawn is clear');
  seen[queue[0][1] * nx + queue[0][0]] = 1;
  while (queue.length) {
    const [i, k] = queue.pop()!;
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const [a, c] = [i + di, k + dk];
      if (a < 0 || c < 0 || a >= nx || c >= nz || seen[c * nx + a]) continue;
      if (solid(x0 + a * step, z0 + c * step)) continue;
      seen[c * nx + a] = 1;
      queue.push([a, c]);
    }
  }
  for (const [za, zb] of ISLANDS) assert.ok(seen[iz((za + zb) / 2) * nx + ix(-380)], `the platform at ${za} can't be reached`);
});

test('what\'s solid is off every street; the loop and the slip lanes are in the plan', () => {
  for (const b of STATION_SOLIDS)
    for (const s of roads) for (const p of [[b[0], b[1]], [b[2], b[3]], [b[0], b[3]], [b[2], b[1]]] as [number, number][]) assert.ok(distToStreet(s, p) > s.half - 1e-6, `${b} on ${s.id}`);
  const loop = PLAN.streets.find((s) => s.id === 'station-loop')!;
  assert.ok(loop && loop.pts[0][0] === LOOP.x0 && loop.pts.at(-1)![0] === LOOP.x1);
  assert.ok(PLAN.crossings.filter((c) => c.streets.includes('station-loop')).length === 2);
  assert.ok(PLAN.streets.filter((s) => s.id.startsWith('slip-highway-ew0-1-')).length === 4, 'slip lanes on all four corners');
  assert.ok(PARKED.length > BAYS.length / 2);
  for (const f of FOUNTAINS) assert.ok(inBox(PLAZA, f.x, f.z, -f.r), 'a fountain off the plaza');
});

test('its people on their floors, clear of what\'s solid; the trees and lamps off the streets', () => {
  for (const p of STATION_PEOPLE) {
    const floor = stationY(p.x, p.z) ?? 0;
    assert.ok(p.act === 'sit' ? p.y > floor : Math.abs(p.y - floor) < 1e-6, `someone at ${p.x}, ${p.z} off their floor`);
    if (p.act !== 'sit') assert.ok(!STATION_SOLIDS.some((b) => inBox(b, p.x, p.z, 0.2)), `someone at ${p.x}, ${p.z} in something`);
  }
  for (const [x, z] of [...BOULEVARD_TREES, ...STATION_LAMPS.map(([x, z]): [number, number] => [x, z])])
    for (const s of roads) assert.ok(distToStreet(s, [x, z]) > s.half + 0.3, `a tree or lamp at ${x}, ${z} on ${s.id}`);
});
