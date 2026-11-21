// Northgate Air Base's flying (airbaseflights.ts, docs/military-plan.md Phase 4): its timetable kept as the airport's
// is (smooth, gentle, on the period), over the base only (inside its fence: short of the wall, west of the hills), on
// the ground only on its own runway, taxiways and pads, clear of the airport's flights, of each other, of what's parked
// and over everything built
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE_FLIGHTS, TRAINER } from '../src/scripts/city3d/airbaseflights';
import { FLIGHTS, PERIOD, REACH, poseAt, type Pose } from '../src/scripts/city3d/airfield';
import { AIRBASE_SOLIDS, AIRFIELD_SOLIDS, BASE_SOLIDS, HELI_PADS, RUNWAY, TAXIWAY, inAirbase } from '../src/scripts/city3d/airbase';
import { PARKED } from '../src/scripts/city3d/airbasedress';
import { TERRAIN_RECT } from '../src/scripts/city3d/terrain';

const SAMPLES = Array.from({ length: PERIOD * 4 + 1 }, (_, k) => {
  const t = k * 0.25;
  return { t, base: BASE_FLIGHTS.map((f) => poseAt(f, t)), town: FLIGHTS.map((f) => poseAt(f, t)) };
});
/** On the base's own ground for aircraft: the runway, the taxiways and connectors between them, the heliport's pads */
const onField = (p: Pose) =>
  (p.x > RUNWAY.x0 - 15 && p.x < RUNWAY.x1 + 15 && p.z > RUNWAY.z - 10 && p.z < TAXIWAY.z + TAXIWAY.half + 1) || HELI_PADS.some(([x, z, r]) => Math.hypot(p.x - x, p.z - z) < r);

test('the base keeps its timetable: smooth, gentle, on the period, every one flying and back where it parks', () => {
  for (const f of BASE_FLIGHTS) assert.equal(PERIOD % f.cycle, 0, `${f.id} drifts off the timetable`);
  let prev = SAMPLES[0].base;
  for (const { t, base } of SAMPLES) {
    base.forEach((p, i) => {
      const f = BASE_FLIGHTS[i];
      for (const v of [p.x, p.y, p.z, p.yaw, p.pitch, p.roll]) assert.ok(Number.isFinite(v), `${f.id} at ${t}`);
      assert.ok(p.y >= 0 && p.y < 40);
      const q = prev[i];
      assert.ok(Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) < 30 * 0.25 + 0.5, `${f.id} jumps at ${t}`);
      assert.ok(Math.abs(p.roll) <= 0.56 && Math.abs(p.pitch) < 0.35, `${f.id} tips over at ${t}`);
      if (p.y < 0.5) assert.ok(onField(p), `${f.id} down off the field at ${p.x.toFixed(0)}, ${p.z.toFixed(0)}`);
    });
    prev = base;
  }
  for (const [i, f] of BASE_FLIGHTS.entries()) {
    assert.ok(Math.max(...SAMPLES.map((s) => s.base[i].y)) > 15, `${f.id} never takes off`);
    assert.ok(f.parked.ground && onField(f.parked), `${f.id} parks off the field`);
  }
  // (the trainer lands and takes off over the east: down at the runway's east end, up off its west end heading east)
  const down = SAMPLES.map((s) => s.base[0]).filter((p) => p.y > 0 && p.y < 3 && Math.abs(p.z - RUNWAY.z) < 1);
  assert.ok(down.some((p) => p.x > RUNWAY.x1 - 30));
  assert.equal(TRAINER.kind, 'prop');
});

test('they stay over the base: inside its fence, short of the wall, west of the hills', () => {
  // (the hills' land starts at TERRAIN_RECT's west edge, x 285)
  const hillsFoot = TERRAIN_RECT[0];
  for (const { t, base } of SAMPLES)
    base.forEach((p, i) => {
      assert.ok(inAirbase(p.x, p.z), `${BASE_FLIGHTS[i].id} leaves the base at ${p.x.toFixed(0)}, ${p.z.toFixed(0)} (t ${t})`);
      assert.ok(p.x < hillsFoot - 20);
    });
});

test("clear of the airport's flights, of each other, of the base's parked aircraft, and well over what's built", () => {
  const solids = [...AIRBASE_SOLIDS, ...AIRFIELD_SOLIDS, ...BASE_SOLIDS];
  for (const { t, base, town } of SAMPLES) {
    base.forEach((a, i) => {
      const ka = BASE_FLIGHTS[i].kind;
      for (let j = i + 1; j < base.length; j++) {
        const d = Math.hypot(a.x - base[j].x, a.y - base[j].y, a.z - base[j].z);
        assert.ok(d >= REACH[ka] + REACH[BASE_FLIGHTS[j].kind], `${BASE_FLIGHTS[i].id} and ${BASE_FLIGHTS[j].id} ${d.toFixed(1)} apart at ${t}`);
      }
      town.forEach((b, j) => assert.ok(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) >= REACH[ka] + REACH[FLIGHTS[j].kind] + 20, `${BASE_FLIGHTS[i].id} near ${FLIGHTS[j].id} at ${t}`));
      for (const p of PARKED) assert.ok(Math.hypot(a.x - p.at[0], a.y, a.z - p.at[1]) > REACH[ka] + (p.kind === 'freighter' ? 10 : 3.6), `${BASE_FLIGHTS[i].id} near a parked ${p.kind} at ${t}`);
      // Over anything built within reach, at least 4 over its top (but its own pad, where a helicopter sets down)
      for (const s of solids) {
        if (a.x < s[0] - REACH[ka] || a.x > s[2] + REACH[ka] || a.z < s[1] - REACH[ka] || a.z > s[3] + REACH[ka]) continue;
        assert.ok(a.y > s[4] + 4, `${BASE_FLIGHTS[i].id} at ${a.y.toFixed(1)} over something ${s[4]} high at ${a.x.toFixed(0)}, ${a.z.toFixed(0)} (t ${t})`);
      }
    });
  }
});
