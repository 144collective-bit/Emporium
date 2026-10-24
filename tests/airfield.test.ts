// Sector 7 Airport (airfield.ts, docs/airport-plan.md Phase 3): the airport sits on open land on the world's south
// edge, outside the ring highway, off every road but its own; what's solid keeps the taxi lanes open; and every
// aircraft stays inside the world, high over the town, on the ground only at the airport, and never near another one
// (the airliners parked at the stands too).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AIRBRIDGES,
  AIRPORT_AREAS,
  AIRPORT_CROSSINGS,
  AIRPORT_SOLIDS,
  AIRPORT_STREETS,
  AIRSIDE,
  APRON,
  CAR_PARK,
  CONCOURSES,
  CONNECTORS,
  FENCE,
  FIRE,
  FLIGHTS,
  FLYING_STANDS,
  FUEL_TANKS,
  GA_CAR_PARK,
  GA_CROSSINGS,
  GA_GATE,
  GA_STREETS,
  AIR_ARRIVE,
  GA_APRON,
  HALL,
  HANGAR,
  HELIPAD,
  EXEC_PAD,
  MRO,
  PARKED,
  PARKED_JETS,
  PERIOD,
  REACH,
  ROAD,
  RUNWAY,
  SITE,
  STANDS,
  TAXILANE,
  TAXIWAY,
  TERMINAL,
  TOWER,
  poseAt,
  type Rect,
} from '../src/scripts/city3d/airfield';
import { SEATS, WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { PADS, inTown } from '../src/scripts/city3d/outer';
import { PLAN, distToStreet, onSlab } from '../src/scripts/city3d/streetplan';
import { fromHighway, HIGHWAY_HALF, insideHighway } from '../src/scripts/city3d/highway';
import { SOLIDS } from '../src/scripts/city3d/solids';

const inside = (r: Rect, x: number, z: number, m = 0) => x >= r[0] + m && x <= r[2] - m && z >= r[1] + m && z <= r[3] - m;
const gap = (a: Rect, b: Rect) => Math.max(a[0] - b[2], b[0] - a[2], a[1] - b[3], b[1] - a[3]);
const runway: Rect = [RUNWAY.x0, RUNWAY.z - RUNWAY.half, RUNWAY.x1, RUNWAY.z + RUNWAY.half];
const taxiway: Rect = [TAXIWAY.x0, TAXIWAY.z - TAXIWAY.half, TAXIWAY.x1, TAXIWAY.z + TAXIWAY.half];
const rectOf = (f: readonly number[]): Rect => [f[0], f[1], f[2], f[3]];
/** Every aircraft's pose, every quarter second through the whole timetable */
const SAMPLES = (() => {
  const out: { t: number; poses: ReturnType<typeof poseAt>[] }[] = [];
  for (let t = 0; t < PERIOD; t += 0.25) out.push({ t, poses: FLIGHTS.map((f) => poseAt(f, t)) });
  return out;
})();

test('the airport: on open land inside the world, outside the ring highway and the town, off every road but its own', () => {
  const [bx0, bz0, bx1, bz1] = WORLD_BOUNDS;
  assert.ok(SITE[0] >= bx0 && SITE[1] >= bz0 && SITE[2] <= bx1 && SITE[3] <= bz1);
  const own = new Set([...AIRPORT_STREETS, ...GA_STREETS].map((a) => a.id));
  for (const r of AIRPORT_AREAS)
    for (let x = r[0]; x <= r[2]; x += 1)
      for (let z = r[1]; z <= r[3]; z += 1) {
        assert.ok(!insideHighway(x, z) && fromHighway(x, z) > HIGHWAY_HALF + 4, `the airport reaches the highway at ${x}, ${z}`);
        assert.ok(!inTown([x, z], 0), `the airport is in town at ${x}, ${z}`);
        // Only its own streets, and the south bank avenue along the landside's north edge
        for (const s of PLAN.streets) if (!own.has(s.id) && s.id !== 'ew4') assert.ok(distToStreet(s, [x, z]) > s.half + 1, `${s.id} runs through the airport at ${x}, ${z}`);
      }
  const ew4 = PLAN.streets.find((s) => s.id === 'ew4')!;
  for (const r of [AIRSIDE, ...AIRPORT_AREAS.filter((a) => a !== AIRPORT_AREAS[1])]) assert.ok(distToStreet(ew4, [(r[0] + r[2]) / 2, r[1]]) > ew4.half, 'the avenue runs over the airside');
  for (const p of PADS) for (const r of AIRPORT_AREAS) assert.ok(gap(r, p.rect) > 2, `the airport crowds ${p.id}`);
  // The runway, taxiways, aprons, buildings and pads are all airside, inside the fence
  for (const r of [runway, taxiway, APRON, GA_APRON, rectOf(HANGAR), rectOf(MRO), rectOf(FIRE), ...CONCOURSES.map(rectOf)]) assert.ok(inside(AIRSIDE, r[0], r[1]) && inside(AIRSIDE, r[2], r[3]), `${r} is outside the fence`);
  for (const p of [HELIPAD, EXEC_PAD, ...FUEL_TANKS]) assert.ok(inside(AIRSIDE, p.x, p.z, p.r));
  // About twice the old airport's: a runway of 300, eight stands
  assert.ok(RUNWAY.x1 - RUNWAY.x0 >= 300 && STANDS.length === 8);
  // Nothing taller than the Emporium's roof (about 12.5 up)
  assert.ok(TOWER.top < 12.5);
  for (const f of [HALL, ...CONCOURSES, HANGAR, MRO, FIRE]) assert.ok(f[4] < 12.5);
});

test('the stands: on the apron, an airbridge from the terminal to each, clear of each other, the taxilane behind them', () => {
  for (const [k, [x, z]] of STANDS.entries()) {
    assert.ok(inside(APRON, x, z, 2), `stand ${k + 1} is off the apron`);
    if (k) assert.ok(x - STANDS[k - 1][0] >= 2 * REACH.jet + 4, `stands ${k} and ${k + 1} are too close`);
    // The terminal (hall and concourses) runs along behind every stand
    assert.ok(x > TERMINAL[0] && x < TERMINAL[2] && z > TERMINAL[3]);
    // A parked airliner's tail is clear of the taxilane's centre line
    assert.ok(TAXILANE.z - z > REACH.jet, `stand ${k + 1} blocks the taxilane`);
    const a = AIRBRIDGES[k];
    assert.ok(a.z0 === TERMINAL[3] && a.z1 > a.z0 && a.z1 < z);
  }
  // The taxilane joins the parallel taxiway at the first connector, the others join the taxiway to the runway
  assert.ok(CONNECTORS.every((c) => c >= TAXIWAY.x0 && c <= TAXIWAY.x1));
  assert.ok(TAXILANE.z < TAXIWAY.z && TAXIWAY.z < RUNWAY.z);
  assert.ok(FLYING_STANDS.every((k) => k >= 0 && k < STANDS.length));
});

test('the fence: round the airside, solid, with a gap to walk through to the kerb', () => {
  for (const { a, b } of FENCE) {
    assert.ok(a[0] === b[0] || a[1] === b[1], 'every run straight along x or z');
    for (const p of [a, b]) assert.ok(inside(AIRSIDE, p[0], p[1]) || inside(rectOf(HALL), p[0], p[1]));
  }
  // The perimeter: every side covered but the crew gate's gap on the north side, west of the hall
  const north = FENCE.filter(({ a, b }) => a[1] === AIRSIDE[1] && b[1] === AIRSIDE[1]).map(({ a, b }) => [Math.min(a[0], b[0]), Math.max(a[0], b[0])]).sort((p, q) => p[0] - q[0]);
  const gaps: number[][] = [];
  let at = AIRSIDE[0];
  // (the hall stands in the fence's line: the fence runs round it)
  for (const [x0, x1] of [...north, [HALL[0], HALL[2]]].sort((p, q) => p[0] - q[0])) {
    if (x0 > at + 0.01) gaps.push([at, x0]);
    at = Math.max(at, x1);
  }
  assert.equal(at, AIRSIDE[2]);
  assert.equal(gaps.length, 1);
  assert.ok(gaps[0][1] < HALL[0] && gaps[0][1] - gaps[0][0] >= 3, 'the crew gate is wide enough');
  // Nothing solid in the gateway
  const gx = (gaps[0][0] + gaps[0][1]) / 2;
  assert.ok(!SOLIDS.some((s) => gx > s[0] - 0.5 && gx < s[2] + 0.5 && AIRSIDE[1] > s[1] - 1 && AIRSIDE[1] < s[3] + 1), 'the crew gate is blocked');
});

test('Airport Drive off the south bank avenue and the GA road off the east ring avenue: in the street plan, round their car parks; the parked cars are in their bays', () => {
  for (const a of [...AIRPORT_STREETS, ...GA_STREETS]) assert.ok(PLAN.streets.some((s) => s.id === a.id && s.lanes === 1));
  for (const c of GA_CROSSINGS) assert.ok(PLAN.crossings.some((p) => p.id === c.id), c.id);
  // You arrive at the GA car park's kerb, by the fence's gate, on nothing solid, and the gate's clear to walk through
  assert.ok(AIR_ARRIVE.x < AIRSIDE[0] && AIR_ARRIVE.z > GA_GATE.z0 && AIR_ARRIVE.z < GA_GATE.z1);
  assert.ok(!SOLIDS.some((b) => AIR_ARRIVE.x > b[0] - 0.3 && AIR_ARRIVE.x < b[2] + 0.3 && AIR_ARRIVE.z > b[1] - 0.3 && AIR_ARRIVE.z < b[3] + 0.3));
  for (let x = AIR_ARRIVE.x; x < AIRSIDE[0] + 3; x += 0.25) assert.ok(!SOLIDS.some((b) => x > b[0] - 0.3 && x < b[2] + 0.3 && AIR_ARRIVE.z > b[1] - 0.3 && AIR_ARRIVE.z < b[3] + 0.3), `the GA gate is blocked at ${x}`);
  const way = AIRPORT_CROSSINGS.find((c) => c.streets.includes('ew4'))!;
  assert.deepEqual(way.at, [ROAD.x, ROAD.z0]);
  assert.ok(PLAN.crossings.some((c) => c.streets.includes('ew4') && c.streets.includes('airport-drive') && c.at[0] === ROAD.x));
  assert.ok(!insideHighway(ROAD.x, ROAD.z0) && fromHighway(ROAD.x, ROAD.z0) > 20, 'the way in is clear of the highway junction');
  // Nothing solid on the asphalt
  const roads = PLAN.streets.filter((s) => s.id.startsWith('airport'));
  for (const s of AIRPORT_SOLIDS) {
    const box: Rect = [s[0], s[1], s[2], s[3]];
    for (const r of roads)
      for (let x = box[0]; x <= box[2]; x += 0.2)
        for (let z = box[1]; z <= box[3]; z += 0.2) assert.ok(distToStreet(r, [x, z]) > r.half, `something solid at ${x.toFixed(1)}, ${z.toFixed(1)} on ${r.id}`);
  }
  assert.ok(PARKED.length >= 12);
  for (const [, x, z] of PARKED) assert.ok(inside(CAR_PARK, x, z, 0.5) || inside(GA_CAR_PARK, x, z, 0.5), `a car parked off the car parks at ${x}, ${z}`);
  // The airport is solid for walking and driving, and on no slab
  for (const s of AIRPORT_SOLIDS) assert.ok(SOLIDS.includes(s));
  assert.ok(!onSlab(PLAN, [TERMINAL[0] - 2, TERMINAL[1] - 2]));
});

test('every aircraft keeps to its timetable: smooth, inside the world, never on the ground outside the airport', () => {
  for (const f of FLIGHTS) assert.equal(PERIOD % f.cycle, 0, `${f.id} drifts off the timetable`);
  let prev = SAMPLES[0].poses;
  for (const { t, poses } of SAMPLES) {
    poses.forEach((p, i) => {
      const f = FLIGHTS[i];
      for (const v of [p.x, p.y, p.z, p.yaw, p.pitch, p.roll]) assert.ok(Number.isFinite(v), `${f.id} at ${t}`);
      assert.ok(p.x > WORLD_BOUNDS[0] && p.x < WORLD_BOUNDS[2] && p.z > WORLD_BOUNDS[1] && p.z < WORLD_BOUNDS[3], `${f.id} leaves the world at ${t}`);
      assert.ok(p.y >= 0 && p.y < 60);
      if (p.y < 0.5) assert.ok(inside(AIRSIDE, p.x, p.z), `${f.id} is down outside the airport at ${p.x.toFixed(0)}, ${p.z.toFixed(0)}`);
      // No jumps: never further in a quarter second than its top speed allows
      const q = prev[i];
      assert.ok(Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) < 40 * 0.25 + 0.5, `${f.id} jumps at ${t}`);
      // Banks and pitches stay gentle
      assert.ok(Math.abs(p.roll) <= 0.56 && Math.abs(p.pitch) < 0.35, `${f.id} tips over at ${t}`);
    });
    prev = poses;
  }
  // Every one actually flies, and comes back to where it parks
  for (const [i, f] of FLIGHTS.entries()) {
    assert.ok(Math.max(...SAMPLES.map((s) => s.poses[i].y)) > 18, `${f.id} never takes off`);
    assert.ok(f.parked.ground && inside(AIRSIDE, f.parked.x, f.parked.z));
  }
  // Under reduced motion the airliners stand at their stands
  const jets = FLIGHTS.filter((f) => f.kind === 'jet');
  for (const [i, k] of FLYING_STANDS.entries()) {
    const p = jets[i].parked;
    assert.ok(Math.hypot(p.x - STANDS[k][0], p.z - STANDS[k][1]) < 0.5);
  }
  // The other stands have their airliners parked, never moving
  for (const [k, s] of STANDS.entries()) if (!FLYING_STANDS.includes(k)) assert.ok(PARKED_JETS.some((p) => Math.hypot(p.x - s[0], p.z - s[1]) < 0.5), `stand ${k + 1} stands empty`);
});

test('high over the town: the airliners over downtown, the helicopter over the Emporium, the prop plane along the river', () => {
  const EMPORIUM: [number, number] = [SEATS['11,11'][0] + 4.5, SEATS['11,11'][1] + 4.5];
  let overTown = 0;
  for (const { poses } of SAMPLES)
    poses.forEach((p, i) => {
      const f = FLIGHTS[i];
      if (!inTown([p.x, p.z], 0)) return;
      overTown++;
      // Well over every roof (the tallest infill is about 10.6), the blimp (17) and the drones
      assert.ok(p.y > 20, `${f.id} is only ${p.y.toFixed(1)} up over the town at ${p.x.toFixed(0)}, ${p.z.toFixed(0)}`);
      if (f.kind === 'jet') assert.ok(p.y > 38);
      if (Math.hypot(p.x - EMPORIUM[0], p.z - EMPORIUM[1]) < 14) assert.ok(p.y > 22, `${f.id} is near the Emporium's hologram`);
    });
  assert.ok(overTown > 100, 'nobody flies over the town');
});

test('the aircraft never come near each other, in the air or on the ground, nor the airliners parked at the stands', () => {
  for (const { t, poses } of SAMPLES) {
    for (let i = 0; i < poses.length; i++)
      for (let j = i + 1; j < poses.length; j++) {
        const [a, b] = [poses[i], poses[j]];
        const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
        assert.ok(d >= REACH[FLIGHTS[i].kind] + REACH[FLIGHTS[j].kind], `${FLIGHTS[i].id} and ${FLIGHTS[j].id} are ${d.toFixed(1)} apart at ${t}`);
      }
    poses.forEach((a, i) => {
      for (const p of PARKED_JETS) {
        const d = Math.hypot(a.x - p.x, a.y - p.y, a.z - p.z);
        assert.ok(d >= REACH[FLIGHTS[i].kind] + REACH.jet - 3, `${FLIGHTS[i].id} comes ${d.toFixed(1)} from a parked airliner at ${t}`);
      }
    });
  }
});

test('taxiing aircraft keep clear of everything solid at the airport', () => {
  for (const { poses } of SAMPLES)
    poses.forEach((p, i) => {
      if (p.y > 3) return;
      // An airliner's wings reach far, so only its fuselage line is checked against the solids it rolls past
      const r = FLIGHTS[i].kind === 'jet' ? 2 : 1.5;
      for (const s of AIRPORT_SOLIDS)
        assert.ok(p.x < s[0] - r || p.x > s[2] + r || p.z < s[1] - r || p.z > s[3] + r, `${FLIGHTS[i].id} rolls into something at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
    });
});
