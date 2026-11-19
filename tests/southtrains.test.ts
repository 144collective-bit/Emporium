// The underground's south line's trains (southtrains.ts, docs/south-plan.md Phase 4g): runs that speed up, cruise and
// slow; a round out from The Trenches to the High Road and back calling everywhere; two trains half a round apart on
// their own tracks, standing within their platforms with their doors open, clear of the escalators between the tracks;
// a ride boarding at one station and pulling in at another, stopping at those between.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEGS, ROUND, STOPS, TRAIN_LEN, TUBE, carOffset, carPose, rideAt, runDist, runTime, trackOf, trainAt } from '../src/scripts/city3d/southtrains';
import { ESC_HALF, LINE, LINE_LENGTH, SOUTH_STATIONS, TRACK_OFF, TUNNEL_HALF } from '../src/scripts/city3d/southline';
import { distTo } from '../src/scripts/city3d/streetfaces';

test('a run speeds up, cruises if it can and slows to a stand, getting there exactly', () => {
  for (const d of [8, 30, 70, 150]) {
    const T = runTime(d);
    assert.ok(Math.abs(runDist(d, T) - d) < 1e-9 && runDist(d, 0) === 0);
    let prev = 0;
    for (let t = 0; t <= T; t += T / 50) {
      const x = runDist(d, t);
      assert.ok(x >= prev - 1e-9, 'never back');
      assert.ok(x - prev <= TUBE.speed * (T / 50) + 1e-6, 'never over its cruise');
      prev = x;
    }
  }
});

test('one round: out from The Trenches calling at every station to the High Road, round, and back', () => {
  assert.deepEqual(STOPS.map((s) => s.id), ['trenches', 'circus', 'lot9', 'aldwyns', 'highroad']);
  for (let i = 1; i < LEGS.length; i++) assert.ok(Math.abs(LEGS[i].t0 - LEGS[i - 1].t1) < 1e-9, 'legs end to end');
  assert.equal(LEGS[0].t0, 0);
  const stands = LEGS.filter((l) => 'at' in l).map((l) => ('at' in l ? l.at : -1));
  assert.deepEqual(stands, [0, 1, 2, 3, 4, 3, 2, 1, 0]);
  assert.ok(ROUND > 0 && ROUND < 400, `a round of ${ROUND.toFixed(0)} s`);
});

test('two trains, each on its own track, standing within the platform with doors open only while stood', () => {
  assert.notEqual(trackOf(0), trackOf(1));
  for (const k of [0, 1])
    for (let t = 0; t < ROUND; t += 0.7) {
      const tr = trainAt(k, t);
      assert.ok(tr.s >= STOPS[0].s - 1e-9 && tr.s <= STOPS[STOPS.length - 1].s + 1e-9, 'on the line between its ends');
      if (tr.doors) assert.ok(tr.stop !== null);
      if (tr.stop !== null) {
        const st = SOUTH_STATIONS[tr.stop];
        assert.ok(tr.s - TRAIN_LEN / 2 >= st.p0 - 1e-6 && tr.s + TRAIN_LEN / 2 <= st.p1 + 1e-6, `${st.id}: the train within its platform`);
      }
    }
  // (half a round apart: one going out while the other comes back)
  for (let t = 0; t < ROUND; t += 5) {
    const [a, b] = [trainAt(0, t), trainAt(1, t)];
    if (a.stop === null && b.stop === null) assert.notEqual(a.dir, b.dir);
  }
});

test('a car on its track runs alongside the line, clear of the escalators rising between the tracks', () => {
  const CAR_HALF = 1.2;
  for (const s of [10, 200, 400, LINE_LENGTH - 10])
    for (const u of [trackOf(0), trackOf(1)]) assert.ok(Math.abs(distTo(LINE, carPose(s, u).at) - Math.abs(u)) < 0.05);
  assert.ok(TRACK_OFF - CAR_HALF > ESC_HALF + 0.3, 'its inner side past the escalator shaft');
  assert.ok(Math.abs(carOffset(0, 1) + carOffset(TUBE.cars - 1, 1)) < 1e-9, 'its cars either side of its middle');
});

test('a ride: boarding, the runs between with a stop at each station between, pulling in at the one picked', () => {
  for (const [a, b] of [
    ['trenches', 'highroad'],
    ['highroad', 'circus'],
    ['lot9', 'aldwyns'],
  ] as const) {
    const r = rideAt(a, b, 0);
    const [ia, ib] = [STOPS.findIndex((o) => o.id === a), STOPS.findIndex((o) => o.id === b)];
    assert.equal(r.s, STOPS[ia].s);
    assert.equal(r.dir, ib > ia ? 1 : -1);
    const end = rideAt(a, b, r.total + 1);
    assert.equal(end.s, STOPS[ib].s);
    assert.equal(end.stop, ib);
    // (on along the line its way, stopping at each station between)
    let prev = r.s;
    const stoppedAt = new Set<number>();
    for (let t = 0; t <= r.total + 0.5; t += 0.25) {
      const x = rideAt(a, b, t);
      assert.ok((x.s - prev) * r.dir >= -1e-9, 'never back');
      if (x.stop !== null) stoppedAt.add(x.stop);
      prev = x.s;
    }
    for (let i = ia; i !== ib + r.dir; i += r.dir) assert.ok(stoppedAt.has(i), `${a} to ${b}: a stop at ${STOPS[i].id}`);
    assert.ok(r.total < 120, `${a} to ${b}: ${r.total.toFixed(0)} s`);
  }
});

test("a train's straight cars stay inside the tunnel round the line's bends", () => {
  const CAR_HALF = 1.2;
  for (const u of [trackOf(0), trackOf(1)])
    for (let s = TUBE.carLen; s < LINE_LENGTH - TUBE.carLen; s += 0.5) {
      const { at, dir } = carPose(s, u);
      // (each corner of the car, its middle on the track there, pointing along it)
      for (const a of [-1, 1])
        for (const b of [-1, 1]) {
          const c: [number, number] = [at[0] + dir[0] * a * (TUBE.carLen / 2) - dir[1] * b * CAR_HALF, at[1] + dir[1] * a * (TUBE.carLen / 2) + dir[0] * b * CAR_HALF];
          assert.ok(distTo(LINE, c) < TUNNEL_HALF - 0.1, `s ${s.toFixed(1)}: a corner ${distTo(LINE, c).toFixed(2)} out`);
        }
    }
});
