// The traffic's other vehicles (fleet.ts, vehicle plan Phase 8): the delivery trucks' loading bays and their
// unloading, the big rig's tractor and trailer along the route, the patrol cars' light bars, the bikes' lean.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BAYS, BAY_AHEAD, BAY_BEHIND, BAY_DWELL, BAR_FLASH, BIKE_MIX, RIG_LEN, TRAFFIC_LEAN, barLit, rigAlong, trafficLean } from '../src/scripts/city3d/fleet';
import { BUS_STOPS, busStep, newBus, routeStops } from '../src/scripts/city3d/transit';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { LANE, RIVER } from '../src/scripts/city3d/layout';
import { ROUTES } from '../src/scripts/city3d/routes';
import { CARS, FIFTH_WHEEL, TRAILER } from '../src/scripts/city3d/carspec';
import { PLAYER_BIKES } from '../src/scripts/city3d/mybike';

const streetOf = (id: string) => PLAN.streets.find((s) => s.id === id)!;

test('loading bays line the avenues in town, in the kerb lane, clear of the junctions, the bridges and the bus stops', () => {
  assert.ok(BAYS.length >= 20, `${BAYS.length} bays`);
  for (const a of ['ns0', 'ns3', 'ew0', 'trench-ave']) assert.ok(BAYS.some((b) => b.street === a), `no bay on ${a}`);
  for (const b of BAYS) {
    const s = streetOf(b.street);
    assert.equal(s.kind, 'avenue');
    assert.ok(Math.abs(distToStreet(s, b.at) - (s.half - LANE / 2)) < 0.05, `${b.id} off the kerb lane`);
    // The junction ahead clear of its stop line, the one behind clear of a rig's whole length
    for (const c of PLAN.crossings) {
      if (!c.streets.includes(b.street)) continue;
      const ahead = (c.at[0] - b.at[0]) * b.dir[0] + (c.at[1] - b.at[1]) * b.dir[1];
      const side = Math.abs((c.at[0] - b.at[0]) * b.dir[1] - (c.at[1] - b.at[1]) * b.dir[0]);
      if (side > 6) continue;
      assert.ok(ahead >= 0 ? ahead >= BAY_AHEAD - 0.5 : -ahead >= BAY_BEHIND - 0.5, `${b.id} by ${c.id} (${ahead.toFixed(1)})`);
    }
    assert.ok(!(b.at[1] > RIVER[0] - 5 && b.at[1] < RIVER[1] + 5 && Math.abs(b.dir[1]) > 0.5), `${b.id} on a bridge`);
    // A rig standing at a bay (its nose at the bay) never stands in a bus stop the same way
    for (const st of BUS_STOPS) {
      if (st.street !== b.street || st.dir[0] * b.dir[0] + st.dir[1] * b.dir[1] < 0.9) continue;
      // (the rig from the bay back its length, a bus from its stop back its length: apart)
      const back = (b.at[0] - st.at[0]) * b.dir[0] + (b.at[1] - st.at[1]) * b.dir[1];
      assert.ok(back < -(CARS.bus.L + 1.5) || back > RIG_LEN + 1.5, `${b.id} over the stop ${st.id}`);
    }
  }
  // Some of the traffic's routes pass them (a truck takes any route: it serves the bays it passes)
  assert.ok(ROUTES.filter((r) => routeStops(r, BAYS).length > 0).length >= 3);
});

test('a truck slows into its bay, stands unloading a while, and moves off', () => {
  const route = ROUTES.find((r) => routeStops(r, BAYS).length > 0)!;
  const stops = routeStops(route, BAYS);
  const b = newBus();
  const p0 = stops[0].p - 20;
  let p = p0;
  let v = 4;
  let stood = 0;
  let left = false;
  for (let i = 0; i < 60 * 60 && !left; i++) {
    const dt = 1 / 60;
    const r = busStep(b, p, v, route.len, stops, dt, 0.5, BAY_DWELL);
    const target = Math.min(4, r.cap);
    v += Math.max(-5 * dt, Math.min(1.8 * dt, target - v));
    p += v * dt;
    if (b.at >= 0) stood += dt;
    if (stood > 0 && r.doors === 'shut') left = true;
  }
  assert.ok(left, 'it moved off');
  const want = BAY_DWELL[0] + (BAY_DWELL[1] - BAY_DWELL[0]) * 0.5;
  assert.ok(Math.abs(stood - want) < 0.2, `stood ${stood.toFixed(2)} s`);
  assert.ok(Math.abs(p - stops[0].p) < 1.2, 'stopped at the bay');
});

test('the big rig: the tractor ahead, the kingpin on its fifth wheel, the trailer behind; the cab clear of the trailer however it swings', () => {
  const a = rigAlong(100);
  assert.ok(a.tractor > a.pin && a.pin > a.axles);
  // Nose to tail is the whole length
  const nose = a.tractor + CARS.rig.L / 2;
  const tail = a.pin - TRAILER.pin - TRAILER.L / 2;
  assert.ok(Math.abs(nose - tail - RIG_LEN) < 1e-9);
  assert.ok(Math.abs(nose - 100 - RIG_LEN / 2) < 1e-9);
  // The kingpin over the tractor's rear axle
  assert.ok(Math.abs(FIFTH_WHEEL - CARS.rig.axles[0]) < 0.2);
  // The trailer's front corners, swung up to 75 degrees about the kingpin, stay behind the cab's back
  const cabBack = CARS.rig.cabin[0][0];
  const front = TRAILER.L / 2 - TRAILER.pin;
  for (let deg = 0; deg <= 75; deg += 5) {
    const th = (deg * Math.PI) / 180;
    const ahead = front * Math.cos(th) + (TRAILER.W / 2) * Math.sin(th);
    assert.ok(FIFTH_WHEEL + ahead < cabBack - 0.03, `at ${deg} degrees the trailer hits the cab`);
  }
  // It sits on the deck, over the tractor's top behind the cab
  assert.ok(TRAILER.floor > CARS.rig.top[CARS.rig.top.length - 1][1]);
});

test('the patrol cars\' light bars flash now and then, blue and magenta in turn, each at its own time', () => {
  let on = 0;
  let blue = 0;
  const n = 4200;
  for (let i = 0; i < n; i++) {
    const l = barLit(i * 0.1, 0.3);
    if (l) on++;
    if (l === 1) blue++;
  }
  const share = on / n;
  assert.ok(Math.abs(share - BAR_FLASH.on / BAR_FLASH.period) < 0.02, `lit ${(share * 100).toFixed(1)}% of the time`);
  assert.ok(Math.abs(blue / on - 0.5) < 0.1, 'blue half the time it flashes');
  // Two cars flash at different times
  let both = 0;
  for (let i = 0; i < n; i++) if (barLit(i * 0.1, 0.1) && barLit(i * 0.1, 0.6)) both++;
  assert.equal(both, 0);
  // Never anything but off, blue or magenta, at any time (negative too)
  for (const t of [-50, -1, 0, 3.3, 1e6]) assert.ok([0, 1, 2].includes(barLit(t, 0.9)));
});

test('the bikes in the traffic are the motorbikes\' models, and lean into a turn only a little', () => {
  for (const id of BIKE_MIX) assert.ok(PLAYER_BIKES.includes(id));
  // A right turn (the cars' way: yaw falling) leans the top to the right, a left turn to the left
  assert.ok(trafficLean(5, -0.6) > 0);
  assert.ok(trafficLean(5, 0.6) < 0);
  assert.equal(trafficLean(0, 1), -0);
  for (const v of [2, 5, 9]) for (const w of [-2, -0.3, 0.3, 2]) assert.ok(Math.abs(trafficLean(v, w)) <= TRAFFIC_LEAN + 1e-9);
});
