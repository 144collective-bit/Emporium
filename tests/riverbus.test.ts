// The river bus (riverbus.ts, river plan step 4b): two boats on a loop with four stops. The loop keeps to the water,
// clear of everything on it (but its own landings, where it lies beside them), under Liberty Bridge with room to
// spare; neither boat ever meets the tall ship, the cruise boat, the rowing eight or the other; the stops' prompts
// stand on the quay; rides take a sensible time and end at the stop.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUS, BUSES, CROSS, LINES, LOOP_T, ORDER, ROUTE, STOPS, STOP_S, busAt, gap, ride, rideAt, RIDE_MAX } from '../src/scripts/city3d/riverbus';
import { hullCorners, pointAlong, riverMovers } from '../src/scripts/city3d/riverlife';
import { WATER_Y, inWater } from '../src/scripts/city3d/river';
import { BOAT_LANES, BX, DECK_DEPTH, DECK_HALF, SHIP, lowY, shipAt } from '../src/scripts/city3d/liberty';
import { HALF, HX } from '../src/scripts/city3d/harbour';
import { boatZ, onDeck } from '../src/scripts/city3d/waterfront';
import { onEsplanade } from '../src/scripts/city3d/boulevard';
import { PROMENADE } from '../src/scripts/city3d/outer';
import { OBSTACLES, inRect } from './water';

const near = (a: { x: number; z: number; yaw: number; len: number; beam: number }, b: { x: number; z: number; yaw: number; len: number; beam: number }, m: number) => {
  // (two boxes on the water: apart when some corner-free gap shows on either's axes; checked by their corners' spread)
  const ca = hullCorners(a.x, a.z, a.yaw, { len: a.len, beam: a.beam, top: 0 });
  const cb = hullCorners(b.x, b.z, b.yaw, { len: b.len, beam: b.beam, top: 0 });
  const axes = [a.yaw, a.yaw + Math.PI / 2, b.yaw, b.yaw + Math.PI / 2].map((y): [number, number] => [Math.cos(y), -Math.sin(y)]);
  return axes.every(([ux, uz]) => {
    const pa = ca.map(([x, z]) => x * ux + z * uz);
    const pb = cb.map(([x, z]) => x * ux + z * uz);
    return Math.max(...pa) + m > Math.min(...pb) && Math.max(...pb) + m > Math.min(...pa);
  });
};

test('four stops, in order round the loop, each on its bank', () => {
  assert.equal(STOPS.length, 4);
  assert.deepEqual(new Set(ORDER), new Set(STOPS.map((s) => s.id)));
  for (const s of STOPS) {
    const p = pointAlong(ROUTE, STOP_S[s.id]).at;
    assert.ok(Math.hypot(p[0] - s.x, p[1] - s.berth) < 0.1, `${s.name}: the loop runs beside its landing`);
    // The landing reaches out to the boat, and lies on the water
    assert.ok(Math.abs(s.berth - (s.bank === 'north' ? s.landing[3] : s.landing[1])) < BUS.hull.beam / 2 + 0.2);
    for (const x of [s.landing[0] + 0.3, s.landing[2] - 0.3]) assert.ok(inWater(x, (s.landing[1] + s.landing[3]) / 2, -0.2), `${s.name}'s landing is in the water`);
    // Its prompt (and where you arrive) stand on the promenade, the esplanade or the boardwalk
    for (const at of [s.door, s.arrive]) {
      const onProm = at.x > PROMENADE.x[0] && at.x < PROMENADE.x[1] && ((at.z > PROMENADE.north[0] && at.z < PROMENADE.north[1]) || (at.z > PROMENADE.south[0] && at.z < PROMENADE.south[1]));
      assert.ok(onProm || onDeck(at.x, at.z) || onEsplanade(at.x, at.z), `${s.name}: its prompt stands on the quay`);
    }
  }
  assert.ok(LOOP_T > 120 && LOOP_T < 300);
});

test('the loop keeps to the water, clear of everything on it, under Liberty Bridge with room to spare', () => {
  for (let s = 0; s < ROUTE.len; s += 0.25) {
    const p = pointAlong(ROUTE, s);
    const yaw = Math.atan2(-p.dir[1], p.dir[0]);
    for (const c of hullCorners(p.at[0], p.at[1], yaw, BUS.hull)) {
      assert.ok(inWater(c[0], c[1], 0.3), `on the bank at ${c.map((v) => v.toFixed(1))}`);
      for (const [what, r] of OBSTACLES) assert.ok(!inRect(c, r, 0.25), `meets ${what} at ${c.map((v) => v.toFixed(1))}`);
      if (Math.abs(c[0] - BX) < DECK_HALF + 0.2) assert.ok(WATER_Y + BUS.hull.top < lowY(c[1]) - DECK_DEPTH - 0.25, `scrapes under Liberty Bridge at ${c[1].toFixed(1)}`);
      assert.ok(Math.abs(c[0] - HX) > HALF + 1, 'never under Harbour Bridge');
    }
  }
  // Along the banks it keeps between the bank and the outer lanes; it crosses only east of the cruise boat and west of the tall ship
  assert.ok(LINES[0] - BUS.hull.beam / 2 > BOAT_LANES[0] + 0.35 + 1);
  assert.ok(LINES[1] + BUS.hull.beam / 2 < BOAT_LANES[2] - 0.35 - 1);
  assert.ok(CROSS[0] > 40 && CROSS[1] < -120);
  for (let s = 0; s < ROUTE.len; s += 0.5) {
    const [x, z] = pointAlong(ROUTE, s).at;
    if (Math.abs(z - boatZ(1, x)) < 2) assert.ok(x > 40 || x < -120, 'it crosses the middle lane only at its crossings');
  }
});

test('neither boat meets the tall ship, the cruise boat, the rowing eight or the other', () => {
  const bus = { len: BUS.hull.len, beam: BUS.hull.beam };
  for (let t = 0; t < 1440; t += 0.5) {
    const ship = shipAt(t);
    const boats = Array.from({ length: BUSES }, (_, i) => ({ ...busAt(i, t), ...bus }));
    for (const b of boats) {
      assert.ok(!near(b, { ...ship, x: ship.x + Math.cos(ship.yaw) * 0.8, z: ship.z - Math.sin(ship.yaw) * 0.8, len: SHIP.len + 1.6, beam: SHIP.beam }, 0.6), `meets the tall ship at ${t}`);
      for (const m of riverMovers(t)) assert.ok(!near(b, { ...m, len: m.hull.len, beam: m.hull.beam }, 0.6), `meets the ${m.id} at ${t}`);
    }
    assert.ok(!near(boats[0], boats[1], 1), `the two meet at ${t}`);
  }
});

test('a ride: straight there along the loop, quick, ending at the stop', () => {
  for (const a of STOPS)
    for (const b of STOPS) {
      if (a === b) continue;
      const r = ride(a.id, b.id);
      assert.ok(r.total > 5 && r.total <= RIDE_MAX + 0.5, `${a.name} to ${b.name}: ${r.total.toFixed(1)} s`);
      assert.ok(Math.abs(r.at(r.total) - Math.min(gap(a.id, b.id), gap(b.id, a.id))) < 1e-6, 'the shorter way');
      const end = rideAt(a.id, b.id, r.total + 1);
      assert.ok(end.done && Math.hypot(end.x - b.x, end.z - b.berth) < 0.1);
      // Smooth: never a jump
      let prev = rideAt(a.id, b.id, 0);
      for (let s = 0.1; s < r.total; s += 0.1) {
        const p = rideAt(a.id, b.id, s);
        assert.ok(Math.hypot(p.x - prev.x, p.z - prev.z) < 1.2);
        prev = p;
      }
    }
});

test('the timetable: smooth, waiting at each stop, the same for everyone', () => {
  for (let i = 0; i < BUSES; i++) {
    let prev = busAt(i, 0);
    let waits = 0;
    for (let t = 0.25; t < LOOP_T; t += 0.25) {
      const p = busAt(i, t);
      assert.ok(Math.hypot(p.x - prev.x, p.z - prev.z) < BUS.v * 0.25 + 1e-6, `boat ${i} jumps at ${t}`);
      if (p.at) waits += 0.25;
      prev = p;
    }
    assert.ok(Math.abs(waits - BUS.dwell * STOPS.length) < 1.5);
    assert.deepEqual(busAt(i, 77.7), busAt(i, 77.7 + LOOP_T));
  }
});
