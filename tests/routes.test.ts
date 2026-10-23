// Where the traffic drives (routes.ts, generated from the street plan since growth plan Phase 7): every route
// is a closed loop that stays on the asphalt and off the sidewalks, inside the ring highway; between them they
// drive every lane of every street that goes anywhere, the highway all the way round, and every slip lane;
// the diagonals' routes turn in and out at both ends; and the lights never show two ways green at once.
import { test } from 'node:test';
import { LOOP, ROAD } from '../src/scripts/city3d/stadium';
import assert from 'node:assert/strict';
import { JUNCTIONS, ROUTES, SPOTS, lightState, pointOn, type Phase, type Pt, type Route } from '../src/scripts/city3d/routes';
import { PLAN, distToStreet, lanePaths, onSlab, streetLength } from '../src/scripts/city3d/streetplan';
import { DIAGONALS } from '../src/scripts/city3d/downtown';
import { HIGHWAY_HALF, fromHighway, insideHighway } from '../src/scripts/city3d/highway';

const roads = PLAN.streets.filter((s) => s.lanes > 0);
/** Every point of a route, about every half tile */
function points(r: Route, step = 0.5) {
  const out: { at: Pt; dir: Pt }[] = [];
  for (let p = 0, seg = 0; p <= r.len; p += step) {
    const o = pointOn(r, p, seg);
    seg = o.seg;
    out.push(o);
  }
  return out;
}

test('every route is a closed loop: round and round', () => {
  assert.ok(ROUTES.length >= 20);
  for (const [i, r] of ROUTES.entries()) {
    assert.ok(Math.hypot(r.pts[0][0] - r.pts.at(-1)![0], r.pts[0][1] - r.pts.at(-1)![1]) < 1e-9, `route ${i} is closed`);
    // No sudden turn at the seam
    const a = pointOn(r, 0.2, 0).dir;
    const b = pointOn(r, r.len - 0.2, 0).dir;
    assert.ok(a[0] * b[0] + a[1] * b[1] > 0.99, `route ${i} runs on smoothly over its seam`);
    for (const p of r.pts) assert.ok(Number.isFinite(p[0]) && Number.isFinite(p[1]));
  }
});

/** The stadium's streets north of the highway, the north road up to them and its slip lanes there (stadium.ts): driven too */
const stadiumWay = (q: Pt) =>
  (q[0] > LOOP.x0 - 3 && q[0] < LOOP.x1 + 3 && q[1] > LOOP.z1 - 3 && q[1] < -165) || (q[0] >= LOOP.x1 + 3 && q[0] < ROAD.x0 + 12 && q[1] > ROAD.z - 3 && q[1] < -165);

test("every route stays on the asphalt, a car's width in from the kerb, off every slab, and inside the highway (or on the stadium's streets)", () => {
  for (const [i, r] of ROUTES.entries())
    for (const { at: q } of points(r)) {
      assert.ok(
        roads.some((s) => distToStreet(s, q) <= s.half - 0.45),
        `route ${i} leaves the road at ${q.map((v) => v.toFixed(1))}`
      );
      assert.ok(!onSlab(PLAN, q), `route ${i} drives over a sidewalk at ${q.map((v) => v.toFixed(1))}`);
      assert.ok(insideHighway(q[0], q[1]) || fromHighway(q[0], q[1]) < HIGHWAY_HALF || stadiumWay(q), `route ${i} goes out past the highway at ${q.map((v) => v.toFixed(1))}`);
    }
});

test('between them the routes drive every street that goes anywhere, each way (an avenue in one lane or the other)', () => {
  const all = ROUTES.flatMap((r) => points(r, 1));
  const grid = new Map<string, { at: Pt; dir: Pt }[]>();
  const cell = (x: number, z: number) => `${Math.floor(x / 10)},${Math.floor(z / 10)}`;
  for (const p of all) {
    const k = cell(...p.at);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k)!.push(p);
  }
  const driven = (q: Pt, u: Pt) => {
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++)
        for (const p of grid.get(`${Math.floor(q[0] / 10) + dx},${Math.floor(q[1] / 10) + dz}`) ?? [])
          if (Math.hypot(p.at[0] - q[0], p.at[1] - q[1]) < 0.9 && p.dir[0] * u[0] + p.dir[1] * u[1] > 0.9) return true;
    return false;
  };
  /** Either lane of an avenue that way: the other lane is LANE across */
  const drivenSide = (q: Pt, u: Pt) => [-1, 1].some((k) => driven([q[0] - u[1] * 1.7 * k, q[1] + u[0] * 1.7 * k], u));
  let checked = 0;
  for (const s of roads.filter((s) => s.kind !== 'slip'))
    for (const lane of lanePaths(s)) {
      const pts = lane.dir === 1 ? lane.pts : [...lane.pts].reverse();
      const street = { ...s, pts };
      const len = streetLength(street);
      for (let d = 0; d <= len; d += 6) {
        let at: Pt = pts[0];
        let u: Pt = [1, 0];
        // The point d along the lane and the way it runs there
        let run = 0;
        for (let i = 1; i < pts.length; i++) {
          const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
          if (run + l >= d) {
            const f = (d - run) / (l || 1);
            at = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
            u = [(pts[i][0] - pts[i - 1][0]) / l, (pts[i][1] - pts[i - 1][1]) / l];
            break;
          }
          run += l;
        }
        // Only where it goes anywhere (inside the highway, or out to the stadium) and away from the junctions, where cars turn
        if (!insideHighway(at[0], at[1]) && fromHighway(at[0], at[1]) > 1 && !stadiumWay(at)) continue;
        if (JUNCTIONS.some((j) => Math.hypot(at[0] - j.at[0], at[1] - j.at[1]) < 14)) continue;
        // (westbound up the airport road from the far end of its one-way loop: nobody gets there without a U-turn)
        if (s.id === 'airport-road' && lane.dir === -1 && at[0] > 98) continue;
        // (the same on Stadium Road east along the stadium's loop: its cars leave the loop at its east end)
        if (s.id === 'stadium-road' && lane.dir === -1 && at[0] < LOOP.x1) continue;
        checked++;
        // (an avenue's either lane that way: the lane a car keeps to depends on its next turn)
        assert.ok(driven(at, u) || (s.lanes === 2 && drivenSide(at, u)), `nobody drives ${s.id} (${lane.dir === 1 ? 'with' : 'against'} its points) at ${at.map((v) => v.toFixed(1))}`);
      }
    }
  assert.ok(checked > 500);
});

test('the highway all the way round, both ways, in both lanes; and every slip lane is driven', () => {
  const hw = PLAN.streets.find((s) => s.kind === 'highway')!;
  // (all along it: its points every half tile, not only its corners, which a straight run across town would hide)
  const round = ROUTES.filter((r) => points(r, 2).every(({ at: p }) => Math.abs(fromHighway(p[0], p[1])) < HIGHWAY_HALF));
  assert.equal(round.length, 4);
  for (const r of round) assert.ok(Math.abs(r.len - streetLength(hw)) < 40, `${r.len} round the highway`);
  // A stop at every junction on the way round
  for (const r of round) assert.equal(r.stops.length, JUNCTIONS.filter((j) => j.highway).length);
  const all = ROUTES.flatMap((r) => points(r, 0.25).map((p) => p.at));
  for (const s of PLAN.streets.filter((s) => s.kind === 'slip'))
    for (const p of s.pts.slice(1, -1)) assert.ok(all.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.2), `nobody takes ${s.id}`);
});

test("the diagonals' routes stop at both ends: the ring corner and the lit junction, which runs three phases", () => {
  for (const d of DIAGONALS) {
    const ends = JUNCTIONS.filter((j) => j.streets.some((s) => s.id === d.id));
    assert.equal(ends.length, 2);
    const lit = ends.find((j) => j.lit)!;
    assert.ok(lit.three, `${d.id} meets a lit junction with three phases`);
    // Down the diagonal both ways, passing both its ends: into each end along the diagonal (its own phase)
    for (const into of ends) assert.ok(ROUTES.some((r) => ends.every((j) => r.stops.some((s) => s.j === j)) && r.stops.some((s) => s.j === into && s.phase === 'd')), `${d.id} into ${into.ix}`);
  }
});

test('spots to put a car back on the road are on their routes, clear of the junctions', () => {
  assert.ok(SPOTS.length > 1000);
  for (const s of SPOTS) {
    const r = ROUTES[s.r];
    const q = pointOn(r, s.p, 0).at;
    assert.ok(Math.hypot(q[0] - s.x, q[1] - s.z) < 1e-6);
    assert.ok(!r.stops.some((t) => s.p > t.enter - 3 && s.p < t.exit + 2));
  }
});

test('the lights: one way green at a time, and every way gets its turn', () => {
  for (const j of JUNCTIONS.filter((j) => j.lit)) {
    const phases: Phase[] = j.three ? ['x', 'z', 'd'] : ['x', 'z'];
    const seen = new Set<Phase>();
    for (let t = 0; t < 60; t += 0.25) {
      const green = phases.filter((p) => lightState(j, p, t) !== 'r');
      assert.ok(green.length <= 1, `two ways open at junction ${j.ix} at ${t}`);
      for (const p of phases) if (lightState(j, p, t) === 'g') seen.add(p);
    }
    assert.equal(seen.size, phases.length, `junction ${j.ix} never lets every way go`);
  }
});
