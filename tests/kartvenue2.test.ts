// Riverside Raceway's venue (kartvenue2.ts; docs/kart-harbour-plan.md Phase 4): 4a, the workshops and the tyre store
// on their apron, clear of the track, its barriers, the pit lane and the hire garage's land; what's inside each inside
// it; the stacks of tyres on open ground; the solids round them all.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APRON2, BENCHES2, COUNTER2, ENGINE_RACK2, FITTER2, HIRE2_LAND, PARTS_SHELF2, RACKS2, STACKS2, STANDS2, TYRE2, TYRESTORE2, VENUE2_SOLIDS, WALL, WORKSHOP2, type URect } from '../src/scripts/city3d/kartvenue2';
import { CIRCUIT2, CLEAR2, PIT2_HALF, PIT2_LANE, SITE2 } from '../src/scripts/city3d/kartcircuit2';
import { kart2Ground } from '../src/scripts/city3d/kartpark2';

const trackDistance = (u: number, v: number) => {
  let best = Infinity;
  for (let i = 0; i < CIRCUIT2.u.length; i++) best = Math.min(best, Math.hypot(CIRCUIT2.u[i] - u, CIRCUIT2.v[i] - v));
  return best;
};
const pitDistance = (u: number, v: number) => {
  let best = Infinity;
  for (let k = 0; k < PIT2_LANE.u.length; k++) best = Math.min(best, Math.hypot(PIT2_LANE.u[k] - u, PIT2_LANE.v[k] - v));
  return best;
};
const corners = (r: URect): [number, number][] => [
  [r.u0, r.v0],
  [r.u1, r.v0],
  [r.u0, r.v1],
  [r.u1, r.v1],
  [(r.u0 + r.u1) / 2, r.v0],
];
const inside = (r: URect, o: URect) => r.u0 >= o.u0 - 1e-9 && r.u1 <= o.u1 + 1e-9 && r.v0 >= o.v0 - 1e-9 && r.v1 <= o.v1 + 1e-9;
const overlap = (a: URect, b: URect) => a.u0 < b.u1 && b.u0 < a.u1 && a.v0 < b.v1 && b.v0 < a.v1;

test('the sheds stand on the apron, in the site, on level ground, clear of the track and its barriers, apart', () => {
  const W = SITE2.x1 - SITE2.x0;
  const H = SITE2.z1 - SITE2.z0;
  assert.ok(APRON2.u0 >= 0 && APRON2.u1 <= W && APRON2.v0 >= 0 && APRON2.v1 <= H);
  for (const s of [WORKSHOP2, TYRESTORE2]) {
    assert.ok(inside(s, APRON2), 'on the apron');
    for (const [u, v] of corners(s)) {
      assert.ok(trackDistance(u, v) > CLEAR2 + 3, `a shed by the track at ${u}, ${v}`);
      assert.equal(kart2Ground(u, v), 0, 'on level ground');
    }
  }
  assert.ok(!overlap(WORKSHOP2, TYRESTORE2));
  assert.ok(!overlap(WORKSHOP2, HIRE2_LAND) && !overlap(TYRESTORE2, HIRE2_LAND), "the hire garage's land kept");
  // (the apron from past the barriers: its north edge clear of the run-off)
  for (let u = APRON2.u0; u <= APRON2.u1; u += 1) assert.ok(trackDistance(u, APRON2.v0) > CLEAR2 + 0.5, `the apron in the run-off at u ${u}`);
});

test("what's in the sheds is inside them, off their walls, and leaves the bays' fronts open", () => {
  const inner = (s: URect): URect => ({ u0: s.u0 + WALL - 1e-6, v0: s.v0, u1: s.u1 - WALL + 1e-6, v1: s.v1 - WALL + 1e-6 });
  for (const r of [...BENCHES2, ENGINE_RACK2, COUNTER2, PARTS_SHELF2]) assert.ok(inside(r, inner(WORKSHOP2)), 'in the tuning shed');
  for (const s of STANDS2) assert.ok(inside({ u0: s.u - 0.75, v0: s.v - 0.75, u1: s.u + 0.75, v1: s.v + 0.75 }, inner(WORKSHOP2)), 'a kart in the shed');
  for (const r of RACKS2) assert.ok(inside(r, inner(TYRESTORE2)), 'a rack in the store');
  assert.ok(inside({ u0: FITTER2.u - 0.5, v0: FITTER2.v - 0.5, u1: FITTER2.u + 0.5, v1: FITTER2.v + 0.5 }, inner(TYRESTORE2)));
  // (a clear way in: nothing within 2.5 of the fronts)
  for (const r of [...BENCHES2, ENGINE_RACK2, COUNTER2, PARTS_SHELF2]) assert.ok(r.v0 > WORKSHOP2.v0 + 2.5);
  for (const s of STANDS2) assert.ok(s.v - 0.75 > WORKSHOP2.v0 + 2.5);
  for (const r of RACKS2) assert.ok(r.v0 >= TYRESTORE2.v0 + 2.5);
});

test('the stacks of tyres: on open ground, off the sheds, the track, the pit lane, and each other', () => {
  assert.ok(STACKS2.length >= 15);
  for (const [i, s] of STACKS2.entries()) {
    assert.ok(s.n >= 2 && s.n <= 6);
    const foot: URect = { u0: s.u - TYRE2.r, v0: s.v - TYRE2.r, u1: s.u + TYRE2.r, v1: s.v + TYRE2.r };
    assert.ok(!overlap(foot, WORKSHOP2) && !overlap(foot, TYRESTORE2), `stack ${i} in a shed`);
    assert.ok(trackDistance(s.u, s.v) > CLEAR2 + 1, `stack ${i} by the track`);
    assert.ok(pitDistance(s.u, s.v) > PIT2_HALF + TYRE2.r + 0.2, `stack ${i} on the pit lane`);
    assert.equal(kart2Ground(s.u, s.v), 0);
    for (const t of STACKS2.slice(i + 1)) assert.ok(Math.hypot(t.u - s.u, t.v - s.v) >= TYRE2.r * 2, `stacks ${i} overlap`);
  }
});

test('the solids: every shed wall, fitting and stack, in the site, none on the track', () => {
  assert.ok(VENUE2_SOLIDS.length > 40);
  for (const [x0, z0, x1, z1, top] of VENUE2_SOLIDS) {
    assert.ok(x1 > x0 && z1 > z0 && top > 0);
    assert.ok(x0 >= SITE2.x0 && x1 <= SITE2.x1 && z0 >= SITE2.z0 && z1 <= SITE2.z1);
    assert.ok(trackDistance((x0 + x1) / 2 - SITE2.x0, (z0 + z1) / 2 - SITE2.z0) > CLEAR2);
  }
});
