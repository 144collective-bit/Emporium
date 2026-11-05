// The swing bridge (swingbridge.ts, docs/highway-plan.md Phase 5): in line with Uptown's southbound street and The
// Trenches' cross street, kerb to kerb over the river on gentle ramps, its piers between the boats' lanes, swung open
// whenever the tall ship comes by (and shut otherwise), the barriers down from before it turns until it's back, the
// traffic waiting at them, and its street in the plan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RIVER } from '../src/scripts/city3d/layout';
import { COUPLET } from '../src/scripts/city3d/uptown';
import { NS_X } from '../src/scripts/city3d/trenches';
import { BOAT_LANES, SHIP, SHIP_TIMES, shipAt } from '../src/scripts/city3d/liberty';
import { boatZ } from '../src/scripts/city3d/waterfront';
import { PLAN, riverBridges } from '../src/scripts/city3d/streetplan';
import { ROUTES, heightOn, pointOn } from '../src/scripts/city3d/routes';
import { hullCorners } from '../src/scripts/city3d/riverlife';
import {
  BARRIERS,
  BARRIER_WALLS,
  FOOT,
  H,
  HALF,
  PIVOT,
  RAMP,
  REST,
  SOUTH_PIER,
  SPAN,
  SWEEP,
  SWING_LAMPS,
  SWING_PIERS,
  SWING_SOLIDS,
  SWING_TIMES,
  SWING_WINDOWS,
  SX,
  Z0,
  Z1,
  barrierHold,
  betweenBarriers,
  deckSlope,
  deckY,
  onSwingDeck,
  swingAt,
  swingY,
} from '../src/scripts/city3d/swingbridge';

test("in line with Uptown's southbound street and The Trenches' cross street, kerb to kerb on gentle ramps", () => {
  assert.equal(SX, COUPLET.south);
  assert.ok(NS_X.includes(SX));
  assert.ok(Z0 < RIVER[0] && Z1 > RIVER[1]);
  assert.ok(deckY(Z0) === 0 && deckY(Z1) === 0);
  for (let z = Z0; z <= Z1; z += 0.25) assert.ok(Math.abs(deckSlope(z)) < (1.5 * H) / RAMP + 0.01, `steep at ${z}`);
  // (level all along the swing span: it turns on its pier)
  for (let z = SPAN.z0; z <= SPAN.z1; z += 0.5) assert.ok(Math.abs(deckY(z) - H) < 1e-9, `the span not level at ${z}`);
  assert.ok(SPAN.z0 > Z0 + RAMP && SPAN.z1 < Z1 - RAMP);
  // Walking and driving: on it from kerb to kerb, the footways a step up
  assert.ok(onSwingDeck(SX, (Z0 + Z1) / 2) && !onSwingDeck(SX + HALF + 0.1, 100));
  assert.ok(Math.abs(swingY(SX, PIVOT.z)! - H) < 1e-9 && swingY(SX + (FOOT[0] + FOOT[1]) / 2, PIVOT.z)! > H);
  assert.ok(riverBridges().some((b) => b.street === 'swing' && b.x0 <= SX - HALF + 1e-9 && b.x1 >= SX + HALF - 1e-9));
});

test("its piers stand between the boats' lanes, clear of them and of the tall ship's line", () => {
  for (const [x0, z0, x1, z1] of SWING_PIERS)
    for (let x = x0; x <= x1; x += 0.5)
      for (let lane = 0; lane < BOAT_LANES.length; lane++) {
        const z = boatZ(lane, x);
        assert.ok(z < z0 - 1.6 || z > z1 + 1.6, `lane ${lane} at ${z.toFixed(1)} meets a pier ${z0}..${z1}`);
      }
  // The pivot pier between the north and middle lanes, north of the ship's line; the rest pier and the approach's south of it
  assert.ok(PIVOT.z + PIVOT.r < SHIP.z - SHIP.beam / 2 - 1);
  assert.ok(REST.z - REST.hz > SHIP.z + SHIP.beam / 2 + 1 && SOUTH_PIER.z > REST.z);
  assert.ok(SPAN.z0 < SHIP.z - SHIP.beam && SPAN.z1 > SHIP.z + SHIP.beam, 'the span covers the ship\'s line');
});

/** Is a point inside the span's footprint turned to angle a (a margin `m` round it) */
function inSpan(x: number, z: number, a: number, m: number) {
  const [ux, uz] = [Math.sin(a), Math.cos(a)];
  const along = (x - SX) * ux + (z - PIVOT.z) * uz;
  const across = (x - SX) * uz - (z - PIVOT.z) * ux;
  return Math.abs(along) < SPAN.half + m && Math.abs(across) < HALF + m;
}

test('it swings open whenever the tall ship comes by, never into it, and stands shut the rest of the time', () => {
  let opened = 0;
  for (let t = 0; t < SHIP_TIMES.period * 2; t += 0.25) {
    const { angle, shut } = swingAt(t);
    assert.ok(angle >= 0 && angle <= SWING_TIMES.open + 1e-9);
    if (angle > 0) assert.ok(shut, `turned with the barriers up at ${t}`);
    if (angle >= SWING_TIMES.open - 1e-9) opened++;
    const s = shipAt(t);
    const hull = hullCorners(s.x, s.z, s.yaw, { len: SHIP.len + 1.6, beam: SHIP.beam + 0.6, top: SHIP.mast });
    // Never over the span wherever it's turned to, never through its swept circle unless it's fully open
    for (const [x, z] of hull) {
      assert.ok(!inSpan(x, z, angle, 0.5), `the ship meets the span at ${t}`);
      if (angle < SWING_TIMES.open - 1e-9) assert.ok(Math.hypot(x - SX, z - PIVOT.z) > SWEEP + 0.5, `the ship in its sweep at ${t}`);
      assert.ok(Math.hypot(x - SX, z - PIVOT.z) > PIVOT.r + 0.5);
    }
  }
  assert.ok(opened > 0, 'it never opens');
  // The barriers come down `warn` before it turns, and it's shut most of the time
  SWING_WINDOWS.forEach(([a, b], h) => {
    assert.ok(a > 0 && b < SHIP_TIMES.period / 2, 'each window inside its half');
    const o = (h * SHIP_TIMES.period) / 2;
    assert.ok(swingAt(o + a + 1).shut && swingAt(o + a + 1).angle === 0);
    assert.ok(!swingAt(o + a - 1).shut && !swingAt(o + b + 1).shut);
  });
  const shut = SWING_WINDOWS.reduce((n, [a, b]) => n + (b - a), 0);
  assert.ok(shut < SHIP_TIMES.period / 2, 'open to traffic most of the time');
});

test('the barriers: before the span at each end, the traffic coming waits at them, the rest drive on off it', () => {
  assert.ok(BARRIERS.n < SPAN.z0 - 1 && BARRIERS.n > Z0 + 4);
  assert.ok(BARRIERS.s > REST.z + 1 && BARRIERS.s < Z1 - 4);
  for (const [x0, z0, x1, z1] of BARRIER_WALLS) assert.ok(x0 <= SX - FOOT[1] && x1 >= SX + FOOT[1] && z1 - z0 < 0.5);
  // Coming south from Uptown: held; already past the barrier: not
  assert.ok(barrierHold(SX - 0.85, BARRIERS.n - 5, 0, 1, 1, true) < 5);
  assert.equal(barrierHold(SX - 0.85, BARRIERS.n - 5, 0, 1, 1, false), Infinity);
  assert.equal(barrierHold(SX - 0.85, BARRIERS.n + 2, 0, 1, 1, true), Infinity);
  assert.equal(barrierHold(SX + 0.85, BARRIERS.n - 5, 0, -1, 1, true), Infinity, 'leaving northwards');
  assert.ok(barrierHold(SX + 0.85, BARRIERS.s + 5, 0, -1, 1, true) < 5);
  assert.ok(betweenBarriers(SX, PIVOT.z) && !betweenBarriers(SX, BARRIERS.n - 1));
  // Its lamps on the fixed approaches, never on the span
  for (const [x, z, , y] of SWING_LAMPS) {
    assert.ok(onSwingDeck(x, z) && (z < SPAN.z0 - 1 || z > SPAN.z1 + 1));
    assert.ok(Math.abs(y - deckY(z) - 0.12) < 1e-9);
  }
  // The parapets only over the water and the promenades' edges (the walks cross it at the kerbs)
  for (const b of SWING_SOLIDS) assert.ok(b[1] > Z0 + 3 && b[3] < Z1 - 3);
});

test('its street in the plan: lit at both ends, two-way, and the traffic drives it over its deck', () => {
  const s = PLAN.streets.find((q) => q.id === 'swing')!;
  assert.ok(s && !s.oneway && s.lanes === 1);
  const ends = PLAN.crossings.filter((c) => c.streets.includes('swing'));
  assert.equal(ends.length, 2);
  for (const c of ends) assert.ok(c.lights);
  let ways = 0;
  for (const r of ROUTES) {
    let on = false;
    for (let p = 0; p < r.len; p += 0.5) {
      const q = pointOn(r, p, 0).at;
      if (Math.abs(q[0] - SX) < 1.5 && Math.abs(q[1] - PIVOT.z) < 0.5) {
        on = true;
        assert.ok(Math.abs(heightOn(r, p) - H) < 0.05, 'a car on the span at its height');
      }
    }
    if (on) ways++;
  }
  assert.ok(ways >= 2, 'driven both ways');
});
