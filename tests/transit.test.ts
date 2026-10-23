// Buses that stop (transit.ts, city life plan Phase 4): the bus stops along the avenues, where the routes
// pass them, and a bus slowing to a halt, dwelling and moving off.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APPROACH, BUS_STOPS, DWELL, PULL_IN, PULL_OUT, SHELTER_HALF, STOP_CLEAR, STOP_GAP, busStep, newBus, pullIn, routeStops, type RouteStop } from '../src/scripts/city3d/transit';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { LANE, RIVER, WALK_W } from '../src/scripts/city3d/layout';
import { ROUTES } from '../src/scripts/city3d/routes';
import { SOLIDS } from '../src/scripts/city3d/solids';

const streetOf = (id: string) => PLAN.streets.find((s) => s.id === id)!;

test('there are stops on every avenue in town, in the kerb lane, with the shelter on the sidewalk facing the road', () => {
  assert.ok(BUS_STOPS.length >= 12, `${BUS_STOPS.length} stops`);
  const avenues = new Set(PLAN.streets.filter((s) => s.kind === 'avenue').map((s) => s.id));
  for (const a of avenues) assert.ok(BUS_STOPS.some((b) => b.street === a), `no stop on ${a}`);
  for (const b of BUS_STOPS) {
    const s = streetOf(b.street);
    assert.equal(s.kind, 'avenue');
    // The bus halts in the kerb lane: a lane's middle in from the asphalt's edge
    assert.ok(Math.abs(distToStreet(s, b.at) - (s.half - LANE / 2)) < 0.05, `${b.id} off its lane (${distToStreet(s, b.at)})`);
    // The shelter stands on the sidewalk, off the asphalt
    const k = distToStreet(s, b.kerb);
    assert.ok(k > s.half && k < s.half + WALK_W, `${b.id}'s shelter at ${k}`);
    // ...facing the road: from the shelter towards the bus's spot
    const to = [b.at[0] - b.kerb[0], b.at[1] - b.kerb[1]];
    assert.ok(to[0] * b.face[0] + to[1] * b.face[1] > 0.9 * Math.hypot(...to), `${b.id}'s shelter faces away`);
    // Driving on the right: the kerb is on the right of the way the bus faces
    const right = [-b.dir[1], b.dir[0]];
    assert.ok((b.kerb[0] - b.at[0]) * right[0] + (b.kerb[1] - b.at[1]) * right[1] > 0, `${b.id}'s kerb is on the left`);
    assert.ok(Math.abs(Math.hypot(...b.dir) - 1) < 1e-6);
  }
});

test('stops keep clear of the junctions, the bridges and anything solid, and are spread out', () => {
  for (const b of BUS_STOPS) {
    for (const c of PLAN.crossings) if (c.streets.includes(b.street)) assert.ok(Math.hypot(c.at[0] - b.at[0], c.at[1] - b.at[1]) >= STOP_CLEAR - 0.01, `${b.id} by ${c.id}`);
    assert.ok(!(b.at[1] > RIVER[0] - 5 && b.at[1] < RIVER[1] + 5 && Math.abs(b.dir[1]) > 0.5), `${b.id} on a bridge`);
    // Nothing solid stands where the shelter goes (its middle and both ends); the buildings behind the sidewalk are fine
    for (const k of [-1, 0, 1]) {
      const q = [b.kerb[0] + b.dir[0] * k * SHELTER_HALF, b.kerb[1] + b.dir[1] * k * SHELTER_HALF];
      for (const box of SOLIDS) assert.ok(q[0] <= box[0] || q[0] >= box[2] || q[1] <= box[1] || q[1] >= box[3], `${b.id}'s shelter inside something solid`);
    }
    for (const o of BUS_STOPS) if (o !== b && o.street === b.street && o.dir[0] === b.dir[0] && o.dir[1] === b.dir[1]) assert.ok(Math.hypot(o.at[0] - b.at[0], o.at[1] - b.at[1]) >= STOP_GAP - 1, `${b.id} and ${o.id} too close`);
  }
});

test('the routes pass the stops in their direction, and a bus serves them in order', () => {
  const served = ROUTES.map((r) => routeStops(r));
  const n = served.reduce((a, s) => a + s.length, 0);
  assert.ok(n >= BUS_STOPS.length, `${n} stops passed by the routes, of ${BUS_STOPS.length}`);
  // Every stop is passed by some route (a bus can take any)
  for (const b of BUS_STOPS) assert.ok(served.some((s) => s.some((rs) => rs.stop === b)), `${b.id} on no route`);
  for (const s of served) for (let i = 1; i < s.length; i++) assert.ok(s[i].p > s[i - 1].p);
});

test('a bus slows to a halt at its stop, stands its dwell with the doors open and shut, then carries on past it', () => {
  const stops: RouteStop[] = [{ p: 50, off: 0, stop: BUS_STOPS[0] }, { p: 120, off: 1.7, stop: BUS_STOPS[1] }];
  const bus = newBus();
  const len = 200;
  let p = 20;
  let v = 3;
  const dt = 0.05;
  let opened = 0;
  let shut = 0;
  let stoodAt = -1;
  let stood = 0;
  for (let t = 0; t < 60; t += dt) {
    const { cap, doors } = busStep(bus, p, v, len, stops, dt, 0.5);
    if (doors === 'open') {
      opened++;
      if (stoodAt < 0) stoodAt = p;
    }
    if (doors === 'shut') shut++;
    if (bus.at >= 0) stood += dt;
    // The simplest driver: towards the cap at a fixed rate
    const target = Math.min(3, cap);
    v += Math.max(-5 * dt, Math.min(1.8 * dt, target - v));
    if (v < 0.03) v = 0;
    p += v * dt;
    if (p > len) p -= len;
  }
  assert.ok(opened >= 2 && shut >= 2, `doors opened ${opened}, shut ${shut}`);
  assert.ok(stoodAt > 49.4 && stoodAt < 50.5, `stood at ${stoodAt}`);
  const dwell = DWELL[0] + (DWELL[1] - DWELL[0]) * 0.5;
  assert.ok(stood > dwell * 2 - 0.5 && stood < dwell * 3 + 1, `stood ${stood} s in all`);
  // No stop ahead: no cap; past the last one it comes round to the first
  const far = newBus();
  assert.equal(busStep(far, 60, 3, len, stops, dt, 0).cap, Infinity);
  assert.ok(busStep(far, 120 - APPROACH + 1, 3, len, stops, dt, 0).cap < Infinity, 'slowing in from the approach');
  assert.ok(busStep(far, 118.5, 3, len, stops, dt, 0).cap < 3);
  assert.equal(busStep(newBus(), 0, 3, len, [], dt, 0).cap, Infinity);
});

test('a bus in the inner lane pulls in to the kerb over the approach and back out after; one in the kerb lane stays put', () => {
  const stops: RouteStop[] = [{ p: 50, off: 0, stop: BUS_STOPS[0] }, { p: 120, off: 1.7, stop: BUS_STOPS[1] }];
  const len = 200;
  assert.equal(pullIn(20, len, stops), 0);
  assert.equal(pullIn(50, len, stops), 0, 'already in the kerb lane');
  assert.equal(pullIn(120 - PULL_IN - 1, len, stops), 0);
  assert.ok(pullIn(120 - PULL_IN / 2, len, stops) > 0.5 && pullIn(120 - PULL_IN / 2, len, stops) < 1.2);
  assert.ok(Math.abs(pullIn(120, len, stops) - 1.7) < 1e-9, 'at the kerb at the stop');
  assert.ok(pullIn(120 + PULL_OUT / 2, len, stops) > 0.5 && pullIn(120 + PULL_OUT / 2, len, stops) < 1.2);
  assert.equal(pullIn(120 + PULL_OUT + 1, len, stops), 0);
  // Eased: never a jump
  let was = 0;
  for (let p = 100; p < 135; p += 0.1) {
    const k = pullIn(p, len, stops);
    assert.ok(Math.abs(k - was) < 0.1, `jump at ${p}`);
    was = k;
  }
  // Round the loop's seam too
  const seam: RouteStop[] = [{ p: 2, off: 1.7, stop: BUS_STOPS[0] }];
  assert.ok(pullIn(len - 4, len, seam) > 0.5);
});
