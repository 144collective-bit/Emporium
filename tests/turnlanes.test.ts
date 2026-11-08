// Turn lanes and signals at the busiest avenue junctions (routes.ts `arrows`, turnlanes.ts; docs/highway-plan.md
// Phase 6): which junctions, the left turns waiting for their own green arrow while the rest go, never both at once,
// the traffic's left turns flagged and in the inner lane, the arrows painted in their lanes on the avenue's asphalt,
// and people waiting while the arrow's lit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARROW, JUNCTIONS, ROUTES, arrowCycle, lightState, pointOn, rightOf } from '../src/scripts/city3d/routes';
import { distToStreet } from '../src/scripts/city3d/streetplan';
import { LANE, MEDIAN } from '../src/scripts/city3d/layout';
import { STOP_BARS, TURN_ARROWS, TURN_JUNCTIONS } from '../src/scripts/city3d/turnlanes';
import { redLeft } from '../src/scripts/city3d/pedestrians';

const ARROWED = JUNCTIONS.filter((j) => j.arrows.length);

test('the busiest avenue junctions get turn lanes: lit four-way crossroads on an avenue', () => {
  assert.ok(ARROWED.length >= 8, `only ${ARROWED.length}`);
  for (const j of ARROWED) {
    assert.ok(j.lit && !j.three && !j.merge);
    for (const p of j.arrows) {
      const [dx, dz] = p === 'x' ? [6, 0] : [0, 6];
      for (const s of [1, -1]) {
        const arm = j.streets.find((q) => distToStreet(q, [j.at[0] + s * dx, j.at[1] + s * dz]) < 0.5);
        assert.ok(arm && arm.lanes === 2, `${j.at} ${p}: not an avenue`);
      }
    }
  }
  // (the Kestrel Bridge's ends among them: docs/highway-plan.md Phase 5)
  assert.ok(ARROWED.some((j) => j.streets.some((s) => s.id === 'swing')));
});

test('a left turn waits for its own arrow; the avenue ahead and the street across go after, never at once', () => {
  for (const j of ARROWED) {
    const cycle = arrowCycle(j);
    let arrows = 0;
    for (let t = 0; t < cycle * 2; t += 0.25) {
      const p = j.arrows[0];
      const other = p === 'x' ? 'z' : 'x';
      const left = lightState(j, p, t, true);
      const ahead = lightState(j, p, t);
      const across = lightState(j, other, t);
      const greens = [left, ahead, across].filter((c) => c !== 'r').length;
      assert.ok(greens <= 1, `${j.at} at ${t}: ${left} ${ahead} ${across}`);
      if (left === 'g') arrows++;
    }
    assert.ok(Math.abs(arrows * 0.25 - 2 * ARROW.left) < 0.6, `${j.at}: the arrow's green for ${arrows * 0.25} s`);
  }
  // Elsewhere a left turn goes with the rest, as before
  const plain = JUNCTIONS.find((j) => j.lit && !j.arrows.length && !j.three)!;
  for (let t = 0; t < 30; t += 0.5) assert.equal(lightState(plain, 'x', t, true), lightState(plain, 'x', t));
});

test("the traffic's left turns are flagged, and at a turn lane they come from the inner lane", () => {
  let lefts = 0;
  const inner = MEDIAN / 2 + LANE / 2;
  for (const r of ROUTES)
    for (const s of r.stops) {
      if (!s.left || !s.j.arrows.includes(s.phase)) continue;
      lefts++;
      // 4 back from the junction's edge, the car is in the inner lane of its way
      const o = pointOn(r, Math.max(0, s.enter - 4), 0);
      const rt = rightOf(o.dir[0], o.dir[1]);
      const avenue = s.j.streets.find((q) => distToStreet(q, o.at) < q.half + 0.2 && q.lanes === 2)!;
      const wide = avenue.median ? (avenue.median - MEDIAN) / 2 : 0;
      // (its offset to the right of the avenue's centre line, along the way it's going)
      const c = s.j.at;
      const off = s.phase === 'x' ? (o.at[1] - c[1]) * rt[1] : (o.at[0] - c[0]) * rt[0];
      assert.ok(Math.abs(off - (wide + inner)) < 0.35, `a left turner at ${o.at.map((v) => v.toFixed(1))} ${off.toFixed(2)} off`);
    }
  assert.ok(lefts > 0, 'nobody turns left at a turn lane');
});

test('the arrows lie in their lanes on the avenue, the stop bars across both, Uptown painting its own', () => {
  assert.ok(TURN_JUNCTIONS.length && TURN_JUNCTIONS.every((j) => !j.streets.some((s) => s.id.startsWith('uptown-'))));
  assert.equal(TURN_ARROWS.length, TURN_JUNCTIONS.reduce((n, j) => n + j.arrows.length, 0) * 2 * 2 * 2);
  for (const a of TURN_ARROWS) {
    const j = TURN_JUNCTIONS.find((q) => Math.hypot(q.at[0] - a.x, q.at[1] - a.z) < 30)!;
    const avenue = j.streets.find((s) => s.lanes === 2 && distToStreet(s, [a.x, a.z]) < s.half)!;
    assert.ok(avenue, `an arrow off the avenue at ${a.x}, ${a.z}`);
    // (on its own side: to the right of the way it points)
    const rt = rightOf(a.ux, a.uz);
    assert.ok((a.x - j.at[0]) * rt[0] + (a.z - j.at[1]) * rt[1] > 0);
    // (clear of the street it's coming up to)
    for (const s of j.streets) if (s !== avenue) assert.ok(distToStreet(s, [a.x, a.z]) > s.half + 1, 'an arrow in the junction');
  }
  assert.equal(STOP_BARS.length, TURN_JUNCTIONS.reduce((n, j) => n + j.arrows.length * 2, 0));
});

test("people don't step out across the street the avenue's left turners turn into while their arrow's lit", () => {
  for (const j of ARROWED) {
    const p = j.arrows[0];
    const other = p === 'x' ? 'z' : 'x';
    for (let t = 0; t < arrowCycle(j); t += 0.5) if (lightState(j, p, t, true) !== 'r') assert.equal(redLeft(j, other, t), 0);
  }
});
