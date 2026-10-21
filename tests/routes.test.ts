// Where the traffic drives (routes.ts): every route stays on the asphalt and off the
// sidewalks, the diagonals' routes turn in and out at both ends, and the lights never
// show two ways green at once.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JUNCTIONS, ROUTES, lightState, pointOn, type Phase } from '../src/scripts/city3d/routes';
import { PLAN, distToStreet, onSlab } from '../src/scripts/city3d/streetplan';
import { DIAGONALS } from '../src/scripts/city3d/downtown';
import { BENDS } from '../src/scripts/city3d/outer';
import { EW_ROADS, LIBERTY_ROAD, NS_ROADS, RIVER } from '../src/scripts/city3d/layout';

const roads = PLAN.streets.filter((s) => s.lanes > 0);

test('a route for every lane of every straight road, two down each diagonal, two round each bend, four over Liberty Bridge, one to the airport', () => {
  const lanes = [...EW_ROADS, ...NS_ROADS].reduce((n, r) => n + r.lanes * 2, 0);
  assert.equal(ROUTES.length, lanes + DIAGONALS.length * 2 + BENDS.length * 2 + 4 + 1);
});

test('Liberty Bridge carries traffic both ways, stopping at the lights at both river avenues', () => {
  // Where each route crosses the middle of the river on Liberty Road: +1 heading south, -1 heading north
  const ways = ROUTES.map((r) => {
    const i = r.pts.findIndex((p, i) => i > 0 && Math.abs(p[0] - LIBERTY_ROAD.c) < LIBERTY_ROAD.half && (p[1] - RIVER[0]) * (r.pts[i - 1][1] - RIVER[0]) <= 0);
    return i < 0 ? 0 : Math.sign(r.pts[i][1] - r.pts[i - 1][1]);
  });
  assert.equal(ways.filter((w) => w > 0).length, 2, 'two routes south over it');
  assert.equal(ways.filter((w) => w < 0).length, 2, 'two routes north over it');
  ROUTES.forEach((r, i) => {
    if (!ways[i]) return;
    const lit = r.stops.filter((s) => s.j.lit && s.j.streets.some((st) => st.id === 'liberty'));
    assert.ok(lit.length >= 2, 'stops at the lights at both river avenues');
  });
});

test("every route stays on the asphalt, a car's width in from the kerb, and off every slab", () => {
  for (const [i, r] of ROUTES.entries())
    for (let p = 0; p <= r.len; p += 0.5) {
      const q = pointOn(r, p, 0).at;
      assert.ok(
        roads.some((s) => distToStreet(s, q) <= s.half - 0.45),
        `route ${i} leaves the road at ${q.map((v) => v.toFixed(1))}`
      );
      assert.ok(!onSlab(PLAN, q), `route ${i} drives over a sidewalk at ${q.map((v) => v.toFixed(1))}`);
    }
});

test("the diagonals' routes stop at both ends: the ring corner and the lit junction, which runs three phases", () => {
  const diag = ROUTES.filter((r) => r.stops.some((s) => s.j.streets.some((st) => st.id.startsWith('diag')) && s.phase === 'd'));
  assert.equal(diag.length, DIAGONALS.length * 2);
  for (const d of DIAGONALS) {
    const ends = JUNCTIONS.filter((j) => j.streets.some((s) => s.id === d.id));
    assert.equal(ends.length, 2);
    const lit = ends.find((j) => j.lit)!;
    assert.ok(lit.three, `${d.id} meets a lit junction with three phases`);
    // Both ways down the diagonal pass both its ends
    assert.equal(ROUTES.filter((r) => ends.every((j) => r.stops.some((s) => s.j === j))).length, 2, d.id);
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
