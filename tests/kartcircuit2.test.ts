// Riverside Raceway's circuit as data (kartcircuit2.ts; docs/kart-harbour-plan.md Phase 1, the owner's picks): a lap
// about twice today's and more, the track 5.2 wide, no corner tighter than MIN_RADIUS2, every ramp under MAX_SLOPE2,
// the lap never near itself except where it passes over itself (the tunnel under the hill), inside its site and clear
// of the city's streets and solids.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CIRCUIT2 as C, CLEAR2, HILL_TOP, MAX_SLOPE2, MIN_RADIUS2, SITE2, STACKED, TRACK2_W, TUNNEL_CLEAR, TUNNEL_ROOF, radius3 } from '../src/scripts/city3d/kartcircuit2';
import { CIRCUIT, TRACK_W } from '../src/scripts/city3d/kartcircuit';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { DOCKS_RECT } from '../src/scripts/city3d/docks';

const n = C.x.length;
const at = (i: number) => `${C.u[i].toFixed(1)}, ${C.v[i].toFixed(1)}`;

test('a longer lap on a wider track (the owner picks: winding, a tunnel, a little wider)', () => {
  assert.ok(TRACK2_W > TRACK_W && TRACK2_W <= TRACK_W * 1.25, 'a little wider than today');
  assert.ok(C.L > CIRCUIT.L * 2 && C.L < CIRCUIT.L * 2.4, `the lap ${C.L.toFixed(0)}, today ${CIRCUIT.L.toFixed(0)}`);
  assert.ok(Math.abs(n * C.step - C.L) < 1e-6);
  // Closed: the last sample a step from the first
  assert.ok(Math.hypot(C.x[n - 1] - C.x[0], C.z[n - 1] - C.z[0]) < C.step * 1.5);
});

test('no corner tighter than MIN_RADIUS2, and the inside edge never folds', () => {
  assert.ok(MIN_RADIUS2 > TRACK2_W / 2 + 0.5);
  for (let i = 0; i < n; i++) {
    const r = radius3([C.x[(i - 3 + n) % n], C.z[(i - 3 + n) % n]], [C.x[i], C.z[i]], [C.x[(i + 3) % n], C.z[(i + 3) % n]]);
    assert.ok(r >= MIN_RADIUS2, `radius ${r.toFixed(2)} at ${at(i)}`);
  }
});

test('every ramp under MAX_SLOPE2; the hill reaches its top; the road is never below the site', () => {
  let top = 0;
  for (let i = 0; i < n; i++) {
    const slope = Math.abs(C.y[(i + 1) % n] - C.y[i]) / C.step;
    assert.ok(slope <= MAX_SLOPE2, `slope ${slope.toFixed(3)} at ${at(i)}`);
    assert.ok(C.y[i] >= 0);
    top = Math.max(top, C.y[i]);
  }
  assert.ok(Math.abs(top - HILL_TOP) < 1e-6);
});

test('it crosses itself only through the tunnel: under the hill-top run, with a clear height and a roof', () => {
  assert.equal(C.crossings.length, 2, 'the tunnel under the switchbacks, passed twice');
  assert.ok(TUNNEL_ROOF > 0.5 && TUNNEL_CLEAR >= 2.4);
  for (const x of C.crossings) {
    assert.ok(C.y[x.upper] - C.y[x.lower] >= TUNNEL_CLEAR + TUNNEL_ROOF - 1e-6, `${at(x.upper)}: only ${(C.y[x.upper] - C.y[x.lower]).toFixed(2)} over`);
    assert.equal(C.y[x.lower], 0, 'the tunnel at ground level');
    // (the lower run inside the tunnel's samples)
    const [t0, t1] = C.tunnel;
    assert.ok(x.lower >= t0 - 20 && x.lower <= t1 + 20, `the crossing at ${at(x.lower)} outside the tunnel's run`);
  }
});

test('the lap never comes near itself, except one run stacked over the other', () => {
  for (let i = 0; i < n; i += 2)
    for (let j = i + 2; j < n; j += 2) {
      if (Math.min(j - i, n - (j - i)) * C.step < 40) continue;
      if (Math.abs(C.y[i] - C.y[j]) >= STACKED) continue;
      const d = Math.hypot(C.x[i] - C.x[j], C.z[i] - C.z[j]);
      assert.ok(d >= 2 * CLEAR2, `${at(i)} and ${at(j)} are ${d.toFixed(1)} apart`);
    }
});

test('inside its site with its run-off, clear of the Docks, the streets and every solid', () => {
  for (let i = 0; i < n; i++) {
    assert.ok(C.x[i] - CLEAR2 > SITE2.x0 && C.x[i] + CLEAR2 < SITE2.x1, `x at ${at(i)}`);
    assert.ok(C.z[i] - CLEAR2 > SITE2.z0 && C.z[i] + CLEAR2 < SITE2.z1, `z at ${at(i)}`);
  }
  assert.ok(SITE2.x1 < DOCKS_RECT[0], "the site west of the Docks");
  for (const s of PLAN.streets) for (let i = 0; i < n; i += 4) assert.ok(distToStreet(s, [C.x[i], C.z[i]]) > s.half + CLEAR2, `${s.id} at ${at(i)}`);
  for (const b of SOLIDS) for (let i = 0; i < n; i += 4) {
    const dx = Math.max(b[0] - C.x[i], 0, C.x[i] - b[2]);
    const dz = Math.max(b[1] - C.z[i], 0, C.z[i] - b[3]);
    assert.ok(Math.hypot(dx, dz) > CLEAR2, `a solid ${b.slice(0, 4)} at ${at(i)}`);
  }
});
