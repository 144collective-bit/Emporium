// Sector 7 Airport (airfield.ts): the airport sits on clear land south-east of the Southside
// Loop, off every road but its own; what's solid keeps the taxi lanes open; and every aircraft
// stays inside the world, high over the town, on the ground only at the airport, and never near
// another one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AIRPORT_SOLIDS,
  AIRPORT_STREETS,
  APRON,
  FLIGHTS,
  HANGAR,
  HELIPAD,
  PARKED,
  PERIOD,
  REACH,
  ROAD,
  RUNWAY,
  SITE,
  STANDS,
  TAXIWAY,
  TERMINAL,
  TOWER,
  poseAt,
  type Rect,
} from '../src/scripts/city3d/airfield';
import { EW_ROADS, NS_ROADS, SEATS, WALK_W, WIDEN, WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { BENDS, BEND_REACH, PADS, inTown } from '../src/scripts/city3d/outer';
import { PLAN, distToStreet, onSlab, type Street } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';

const inside = (r: Rect, x: number, z: number, m = 0) => x >= r[0] + m && x <= r[2] - m && z >= r[1] + m && z <= r[3] - m;
const gap = (a: Rect, b: Rect) => Math.max(a[0] - b[2], b[0] - a[2], a[1] - b[3], b[1] - a[3]);
const runway: Rect = [RUNWAY.x0, RUNWAY.z - RUNWAY.half, RUNWAY.x1, RUNWAY.z + RUNWAY.half];
const taxiway: Rect = [TAXIWAY.x0, TAXIWAY.z - TAXIWAY.half, TAXIWAY.x1, TAXIWAY.z + TAXIWAY.half];
/** Every aircraft's pose, every quarter second through the whole timetable */
const SAMPLES = (() => {
  const out: { t: number; poses: ReturnType<typeof poseAt>[] }[] = [];
  for (let t = 0; t < PERIOD; t += 0.25) out.push({ t, poses: FLIGHTS.map((f) => poseAt(f, t)) });
  return out;
})();

test('the airport: on clear land inside the world, off every road but its own, clear of the town', () => {
  const [bx0, bz0, bx1, bz1] = WORLD_BOUNDS;
  assert.ok(SITE[0] >= bx0 && SITE[1] >= bz0 && SITE[2] <= bx1 && SITE[3] <= bz1);
  for (const r of NS_ROADS) assert.ok(SITE[0] >= r.c + r.half + WALK_W || SITE[2] <= r.c - r.half - WALK_W, `the airport is on the road at x ${r.c}`);
  for (const r of EW_ROADS) assert.ok(SITE[1] >= r.c + r.half + WALK_W, `the airport is on the road at z ${r.c}`);
  // Clear of the Southside Loop and its sidewalk, and of every plot and lot
  const loop: Street = { id: 'loop', kind: 'street', pts: BENDS[1].pts, half: 1.7, lanes: 1 };
  for (let x = SITE[0]; x <= SITE[2]; x += 1)
    for (let z = SITE[1]; z <= SITE[3]; z += 1) assert.ok(distToStreet(loop, [x, z]) > BEND_REACH, `the airport reaches the loop at ${x}, ${z}`);
  for (const p of PADS) assert.ok(gap(SITE, p.rect) > 2, `the airport crowds ${p.id}`);
  for (const [x, z] of [
    [SITE[0], SITE[1]],
    [SITE[2], SITE[1]],
    [SITE[0], SITE[3]],
  ])
    assert.ok(!inTown([x, z], 0));
  // The runway, taxiway, apron, terminal, tower, hangar and pad are all on the site
  for (const r of [runway, taxiway, APRON, TERMINAL.slice(0, 4) as Rect, HANGAR.slice(0, 4) as Rect]) assert.ok(inside(SITE, r[0], r[1]) && inside(SITE, r[2], r[3]));
  assert.ok(inside(SITE, HELIPAD.x - HELIPAD.r, HELIPAD.z - HELIPAD.r) && inside(SITE, HELIPAD.x + HELIPAD.r, HELIPAD.z + HELIPAD.r));
  // The tower stays under the Emporium's roof (about 12.5 up)
  assert.ok(TOWER.top < 12.5);
});

test('the access road: in the street plan, off the avenue, round the car park; the parked cars are in their bays', () => {
  for (const a of AIRPORT_STREETS) assert.ok(PLAN.streets.some((s) => s.id === a.id && s.lanes === 1));
  assert.ok(PLAN.crossings.some((c) => c.streets.includes('airport-road') && c.at[0] === NS_ROADS.at(-1)!.c));
  // Nothing solid on the asphalt
  const roads = PLAN.streets.filter((s) => s.id.startsWith('airport'));
  for (const s of AIRPORT_SOLIDS) {
    const box: Rect = [s[0], s[1], s[2], s[3]];
    for (const r of roads)
      for (let x = box[0]; x <= box[2]; x += 0.2)
        for (let z = box[1]; z <= box[3]; z += 0.2) assert.ok(distToStreet(r, [x, z]) > r.half, `something solid at ${x.toFixed(1)}, ${z.toFixed(1)} on ${r.id}`);
  }
  assert.ok(PARKED.length >= 12);
  for (const [, x, z] of PARKED) assert.ok(x > ROAD.loopX + ROAD.half && x < ROAD.x1 - ROAD.half && z > ROAD.loopZ + ROAD.half && z < ROAD.z - ROAD.half);
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
      assert.ok(p.x > -200 && p.x < 236 && p.z > -200 && p.z < 236 + WIDEN, `${f.id} leaves the world at ${t}`);
      assert.ok(p.y >= 0 && p.y < 60);
      if (p.y < 0.5) assert.ok(inside(SITE, p.x, p.z), `${f.id} is down outside the airport at ${p.x.toFixed(0)}, ${p.z.toFixed(0)}`);
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
    assert.ok(f.parked.ground && inside(SITE, f.parked.x, f.parked.z));
  }
  // Under reduced motion the airliners stand at their stands
  for (const [k, s] of STANDS.entries()) {
    const p = FLIGHTS.filter((f) => f.kind === 'jet')[k].parked;
    assert.ok(Math.hypot(p.x - s[0], p.z - s[1]) < 0.5);
  }
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

test('the aircraft never come near each other, in the air or on the ground', () => {
  for (const { t, poses } of SAMPLES)
    for (let i = 0; i < poses.length; i++)
      for (let j = i + 1; j < poses.length; j++) {
        const [a, b] = [poses[i], poses[j]];
        const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
        assert.ok(d >= REACH[FLIGHTS[i].kind] + REACH[FLIGHTS[j].kind], `${FLIGHTS[i].id} and ${FLIGHTS[j].id} are ${d.toFixed(1)} apart at ${t}`);
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
