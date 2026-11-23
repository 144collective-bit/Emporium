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

// ---------- Phase 1b: the courses both ways, the start, the corners, the grid, the pit lane, the racing lines ----------

test('both courses: the same surface each way, the start on the pit straight in front of race control', async () => {
  const { COURSES2, COURSE2_IDS, START2_U } = await import('../src/scripts/city3d/kartcircuit2');
  assert.deepEqual(COURSE2_IDS, ['riverside', 'riverside-reverse']);
  const [f, r] = [COURSES2.riverside, COURSES2['riverside-reverse']];
  assert.equal(f.name, 'Riverside Raceway');
  assert.ok(!f.reverse && r.reverse);
  assert.equal(f.L, r.L);
  // The reverse: the same points the other way round
  assert.equal(r.x[0], f.x[0]);
  assert.equal(r.x[1], f.x[f.x.length - 1]);
  for (const c of [f, r]) {
    const i = Math.round(c.start / c.step) % c.x.length;
    assert.ok(Math.abs(c.u[i] - START2_U) < 1 && c.v[i] > 108, `${c.id}'s line at ${c.u[i].toFixed(1)}, ${c.v[i].toFixed(1)}`);
  }
});

test('the corners: many of them, lefts and rights, numbered in race order from the line, a mirror the other way', async () => {
  const { COURSES2 } = await import('../src/scripts/city3d/kartcircuit2');
  const [f, r] = [COURSES2.riverside, COURSES2['riverside-reverse']];
  for (const c of [f, r]) {
    assert.ok(c.turns.length >= 16, `${c.id}: ${c.turns.length} corners`);
    assert.ok(c.turns.some((t) => t.left) && c.turns.some((t) => !t.left));
    const after = c.turns.map((t) => (t.s - c.start + c.L) % c.L);
    for (let i = 1; i < after.length; i++) assert.ok(after[i] > after[i - 1], 'numbered in order');
    assert.deepEqual(c.turns.map((t) => t.n), c.turns.map((_, i) => i + 1));
  }
  // The same corners, each turning the other way
  assert.equal(f.turns.length, r.turns.length);
  assert.equal(f.turns.filter((t) => t.left).length, r.turns.filter((t) => !t.left).length);
});

test('the grid: eight on the pit straight behind the line, on the track, two abreast', async () => {
  const { COURSES2, GRID2, gridSlots2, TRACK2_HALF, KART2_HALF } = await import('../src/scripts/city3d/kartcircuit2');
  for (const c of Object.values(COURSES2)) {
    const slots = gridSlots2(c);
    assert.equal(slots.length, GRID2);
    for (const g of slots) {
      const i = Math.round(g.s / c.step) % c.x.length;
      assert.ok(c.v[i] > 108, `${c.id}: a slot off the pit straight at ${c.u[i].toFixed(1)}, ${c.v[i].toFixed(1)}`);
      assert.ok(Math.abs(g.lateral) + KART2_HALF < TRACK2_HALF);
      const behind = (c.start - g.s + c.L) % c.L;
      assert.ok(behind > 0 && behind < 20, `${c.id}: a slot ${behind.toFixed(1)} behind the line`);
    }
  }
});

test('the racing line: on the track with room for a kart, to the inside at the apexes, shorter than the middle', async () => {
  const { COURSES2, TRACK2_HALF, KART2_HALF } = await import('../src/scripts/city3d/kartcircuit2');
  for (const c of Object.values(COURSES2)) {
    const n = c.x.length;
    for (const o of c.line) assert.ok(Math.abs(o) + KART2_HALF < TRACK2_HALF, `${c.id}: the line ${o.toFixed(2)} off the middle`);
    // At most apexes it's to the corner's inside (negative lateral is left)
    const inside = c.turns.filter((t) => {
      const i = Math.round(t.s / c.step) % n;
      return t.left ? c.line[i] < 0 : c.line[i] > 0;
    }).length;
    assert.ok(inside >= c.turns.length * 0.75, `${c.id}: inside at ${inside} of ${c.turns.length} apexes`);
    // And it cuts the corners
    const at = (i: number): [number, number] => {
      const j = (i + 1) % n;
      const [tx, tz] = [c.x[j] - c.x[i], c.z[j] - c.z[i]];
      const l = Math.hypot(tx, tz) || 1;
      return [c.x[i] - (tz / l) * c.line[i], c.z[i] + (tx / l) * c.line[i]];
    };
    let len = 0;
    for (let i = 0; i < n; i++) {
      const [a, b] = [at(i), at((i + 1) % n)];
      len += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    assert.ok(len < c.L * 0.98, `${c.id}: the racing line ${len.toFixed(0)} against ${c.L.toFixed(0)}`);
  }
});

test('the pit lane: off the pit straight and back on, along the garages clear of the run-off, inside the site', async () => {
  const { PIT2_LANE, PIT2_STRAIGHT, PIT2_HALF, SITE2: S, nearestTrack2, TRACK2_HALF, CLEAR2: CL } = await import('../src/scripts/city3d/kartcircuit2');
  const n = PIT2_LANE.u.length;
  for (const i of [0, n - 1]) assert.ok(nearestTrack2(PIT2_LANE.u[i], PIT2_LANE.v[i]).d < TRACK2_HALF / 2, 'its ends on the track');
  let straight = 0;
  for (let i = 0; i < n; i++) {
    assert.ok(PIT2_LANE.x[i] - PIT2_HALF > S.x0 && PIT2_LANE.x[i] + PIT2_HALF < S.x1 && PIT2_LANE.z[i] + PIT2_HALF < S.z1);
    if (PIT2_LANE.u[i] < PIT2_STRAIGHT.u0 || PIT2_LANE.u[i] > PIT2_STRAIGHT.u1) continue;
    straight++;
    assert.ok(nearestTrack2(PIT2_LANE.u[i], PIT2_LANE.v[i]).d - PIT2_HALF >= CL, `the pit lane in the run-off at u ${PIT2_LANE.u[i].toFixed(1)}`);
    assert.ok(Math.abs(PIT2_LANE.v[i] - PIT2_STRAIGHT.v) < 0.5);
  }
  assert.ok(straight > 20, 'a straight along the garages');
});
