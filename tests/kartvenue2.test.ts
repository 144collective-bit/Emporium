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

test("4b, the hire-kart garage: on its land, the karts under the canopy clear of its posts, the cabin's things inside it, its doorway clear", async () => {
  const { BRIEF_BENCHES2, CABIN2, CANOPY_POSTS2, DESK2, HELMET_RACK2, HIRE_CANOPY2, HIRE_KARTS2, SCREEN2 } = await import('../src/scripts/city3d/kartvenue2');
  const canopy: URect = HIRE_CANOPY2;
  const cab: URect = CABIN2;
  for (const r of [canopy, cab, HELMET_RACK2]) {
    assert.ok(inside(r, HIRE2_LAND), 'on its land');
    for (const [u, v] of corners(r)) assert.ok(trackDistance(u, v) > CLEAR2 + 3);
    assert.ok(!overlap(r, TYRESTORE2) && !overlap(r, WORKSHOP2));
  }
  assert.ok(!overlap(canopy, cab), 'the canopy and the cabin apart');
  assert.equal(HIRE_KARTS2.length, 8);
  for (const [i, k] of HIRE_KARTS2.entries()) {
    const foot: URect = { u0: k.u - 0.45, v0: k.v - 0.75, u1: k.u + 0.45, v1: k.v + 0.75 };
    assert.ok(inside(foot, canopy), `kart ${i} under the canopy`);
    for (const [u, v] of CANOPY_POSTS2) assert.ok(!overlap(foot, { u0: u - 0.12, v0: v - 0.12, u1: u + 0.12, v1: v + 0.12 }), `kart ${i} on a post`);
    for (const o of HIRE_KARTS2.slice(i + 1)) assert.ok(!overlap(foot, { u0: o.u - 0.45, v0: o.v - 0.75, u1: o.u + 0.45, v1: o.v + 0.75 }), 'karts apart');
  }
  const inner: URect = { u0: cab.u0 + WALL, v0: cab.v0 + WALL, u1: cab.u1 - WALL, v1: cab.v1 - WALL };
  for (const r of [DESK2, ...BRIEF_BENCHES2]) {
    assert.ok(inside(r, inner), 'inside the cabin');
    assert.ok(r.u1 <= CABIN2.door[0] - 0.5 || r.u0 >= CABIN2.door[1] + 0.5 || r.v0 > cab.v0 + 1.5, 'the doorway kept clear');
  }
  assert.ok(SCREEN2.v0 > inner.v0 && SCREEN2.v1 < inner.v1 && SCREEN2.u <= inner.u1);
  assert.ok(CABIN2.door[1] - CABIN2.door[0] >= 1.5, 'a doorway to walk through');
  assert.ok(HELMET_RACK2.u1 <= CABIN2.door[0], 'the helmet rack beside the doorway, not in it');
  // (a kart, a post and the cabin's walls among the solids)
  assert.ok(VENUE2_SOLIDS.length >= 50 + CANOPY_POSTS2.length + HIRE_KARTS2.length);
});
