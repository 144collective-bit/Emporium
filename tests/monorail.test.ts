// The Neon Mile's monorail (monorail.ts, docs/strip-plan.md Phase 4): a beam over the north bank avenue's median from
// by the east ring avenue past the Strip's east end, its pillars in the median clear of the junctions, high over the
// traffic; four stations, their lift towers on the lots and lawns off every street, their doors and arrival spots
// clear; the Link a short walk from the metro's Downtown station; the train on its timetable stopping at each, rides
// straight between them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FLOOR, GAP, MONO, MONO_DWELL, MONO_PERIOD, MONO_PILLARS, MONO_PILLAR_SOLIDS, MONO_RIDE_MAX, MONO_SOLIDS, MONO_STATIONS, MONO_TRAIN, PILLAR, TRAIN_LEN, monoAt, monoResume, monoRide } from '../src/scripts/city3d/monorail';
import { EW_ROADS, MEDIAN, RING_HI, WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { PLAN, distToStreet, onSlab } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { STATIONS } from '../src/scripts/city3d/metro';
import { RESORTS } from '../src/scripts/city3d/resorts';
import { PLACES } from '../src/scripts/city3d/places';

const BANK = EW_ROADS.find((r) => r.c === RING_HI)!;
const bankId = `ew${EW_ROADS.indexOf(BANK)}`;
const crossingsX = PLAN.crossings.filter((c) => c.streets.includes(bankId) && c.at[0] > MONO.x0 - 20 && c.at[0] < MONO.x1 + 20).map((c) => c.at[0]);

test('the line runs over the north bank avenue from by the ring avenue past the Strip, high over the traffic', () => {
  assert.equal(MONO.z, BANK.c);
  assert.ok(MONO.x0 > RING_HI + BANK.half + 3, 'clear of the ring avenue junction');
  assert.ok(MONO.x0 > WORLD_BOUNDS[0] && MONO.x1 < WORLD_BOUNDS[2]);
  assert.ok(MONO.y0 > 5, 'over the buses');
  assert.ok(FLOOR > MONO.y1);
  // The street ends past the Strip's east road: the line stops short of it
  const east = PLAN.streets.find((s) => s.id === 'strip-east')!;
  assert.ok(MONO.x1 < east.pts[0][0] - east.half - 4);
});

test('the pillars stand in the median every few tiles, clear of the junctions', () => {
  const xs = MONO_PILLARS.map((p) => p[0]).sort((a, b) => a - b);
  assert.ok(xs[0] <= MONO.x0 + 2 && xs[xs.length - 1] >= MONO.x1 - 2);
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] <= GAP + 7.5, `a long span at ${xs[i]}`);
  for (const [x, z] of MONO_PILLARS) {
    assert.ok(Math.abs(z - BANK.c) + PILLAR.w / 2 <= MEDIAN / 2 + 1e-9, 'in the median');
    for (const c of crossingsX) assert.ok(Math.abs(x - c) > 5, `a pillar at ${x} on the junction at ${c}`);
  }
  for (const b of MONO_SOLIDS) assert.ok(SOLIDS.includes(b));
});

test('four stations along the line, their towers off every street and clear of everything else, doors and arrivals free', () => {
  assert.equal(MONO_STATIONS.length, 4);
  assert.equal(new Set(MONO_STATIONS.map((s) => s.name)).size, 4);
  const roads = PLAN.streets.filter((s) => s.kind !== 'alley');
  const others = SOLIDS.filter((b) => !MONO_SOLIDS.includes(b));
  for (const s of MONO_STATIONS) {
    const [x0, z0, x1, z1] = s.platform;
    assert.ok(x0 >= MONO.x0 && x1 <= MONO.x1, `${s.id}'s platform on the line`);
    assert.ok(z1 < MONO.z && z0 > BANK.c - BANK.half - 0.5, `${s.id}'s platform over the westbound lanes`);
    assert.ok(x1 - x0 > TRAIN_LEN);
    assert.ok(z1 <= MONO.z - MONO_TRAIN.w / 2 - 0.05, `${s.id}'s platform clear of the cars`);
    for (const q of [
      [s.tower[0], s.tower[1]],
      [s.tower[2], s.tower[3]],
      [s.tower[0], s.tower[3]],
      [s.tower[2], s.tower[1]],
    ] as [number, number][]) {
      assert.ok(onSlab(PLAN, q), `${s.id}'s tower off the slabs at ${q}`);
      for (const r of roads) assert.ok(distToStreet(r, q) > r.half + 0.3, `${s.id}'s tower on ${r.id}`);
    }
    for (const b of others) {
      assert.ok(!(s.tower[0] < b[2] && b[0] < s.tower[2] && s.tower[1] < b[3] && b[1] < s.tower[3]), `${s.id}'s tower in ${b}`);
      assert.ok(!(s.at.x > b[0] - 0.4 && s.at.x < b[2] + 0.4 && s.at.z > b[1] - 0.4 && s.at.z < b[3] + 0.4), `${s.id}'s arrival in ${b}`);
    }
    for (const r of RESORTS) for (const p of r.parts) assert.ok(!(s.tower[0] < p.rect[2] && p.rect[0] < s.tower[2] && s.tower[1] < p.rect[3] && p.rect[1] < s.tower[3]), `${s.id}'s tower in ${r.id}`);
    assert.ok(onSlab(PLAN, [s.at.x, s.at.z]), `${s.id}'s arrival off the slabs`);
    // Arriving out of the door, facing away from it
    const [fx, fz] = [-Math.sin(s.at.yaw), -Math.cos(s.at.yaw)];
    assert.ok(Math.abs(fx - s.face[0]) < 1e-9 && Math.abs(fz - s.face[1]) < 1e-9);
    assert.ok(Math.hypot(s.at.x - s.door.x, s.at.z - s.door.z) < 3);
    const p = PLACES.find((q) => q.id === `mono-${s.id}`)!;
    assert.ok(p && p.kind === 'mono', `${s.id} on the map`);
  }
  // The Link: a short walk from the metro's Downtown station
  const link = MONO_STATIONS[0];
  const metro = STATIONS.find((s) => s.id === 'downtown')!;
  assert.ok(Math.hypot(link.door.x - metro.door.x, link.door.z - metro.door.z) < 40);
});

test('the train runs its timetable along the line, stopping at every station, smoothly', () => {
  const stops = new Set<string>();
  let last = monoAt(0);
  for (let t = 0; t <= MONO_PERIOD; t += 0.1) {
    const p = monoAt(t);
    assert.ok(p.x >= MONO.x0 + TRAIN_LEN / 2 - 6.5 && p.x <= MONO.x1 - TRAIN_LEN / 2 + 6.5, `the train off the line at ${p.x}`);
    assert.ok(Math.abs(p.x - last.x) < MONO_TRAIN.speed * 0.1 * 2.2, `a jump at ${t}`);
    if (p.stopped) for (const s of MONO_STATIONS) if (Math.abs(s.x - p.x) < 1e-6) stops.add(s.id);
    last = p;
  }
  assert.equal(stops.size, 4);
  assert.ok(MONO_PERIOD < 400);
  // The same for everyone
  assert.deepEqual(monoAt(1e9 + 5), monoAt(1e9 + 5));
  assert.ok(MONO_DWELL >= 8);
});

test('a ride runs straight from station to station, under about half a minute; the timetable picks up there after', () => {
  for (const a of MONO_STATIONS)
    for (const b of MONO_STATIONS) {
      if (a === b) continue;
      const r = monoRide(a.id, b.id, 0);
      assert.ok(Math.abs(r.x - a.x) < 1e-9);
      assert.ok(Math.abs(monoRide(a.id, b.id, r.total).x - b.x) < 1e-6);
      assert.ok(r.dir === Math.sign(b.x - a.x));
      const t = monoResume(b.id, r.dir);
      const p = monoAt(t + 0.5);
      assert.ok(p.stopped && Math.abs(p.x - b.x) < 1e-6, `the timetable at ${b.id}`);
    }
  assert.ok(MONO_RIDE_MAX < 32, `${MONO_RIDE_MAX}`);
  assert.ok(MONO_PILLAR_SOLIDS.length === MONO_PILLARS.length);
});
