// Every block's lot and slab are finite numbers all round (docs/stability-plan.md, Phase 1). A NaN corner on a lot
// reached a real GPU as NaN pixels, which the bloom spread over the screen as black: Crestmont's `crest-0-2`, its bay
// `park-w2` reaching the block's corner, so its outline runs out to the corner and back (on purpose: the slab then
// carries the sidewalk across the bay's end), and the inset of that fold divided by nothing. world.ts draws a lot
// inside the tidied outline (`tidyOutline()`), and `insetPoly()` never makes a NaN whatever it's given.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAN, inPoly, insetPoly, onSlab, slabOf, tidyOutline, type Pt } from '../src/scripts/city3d/streetplan';
import { crestPoly } from '../src/scripts/city3d/crestmont';

const finite = (poly: Pt[]) => poly.every(([x, z]) => Number.isFinite(x) && Number.isFinite(z));

test('every block: a finite lot inside its slab, a finite slab, a finite inset of the outline as it is', () => {
  for (const blk of PLAN.blocks) {
    const lot = insetPoly(tidyOutline(blk.poly), 0.4);
    assert.ok(finite(lot), `${blk.id}: its lot has a corner that isn't a number`);
    assert.ok(finite(insetPoly(blk.poly, 0.4)), `${blk.id}: the inset of its outline has a corner that isn't a number`);
    assert.ok(finite(slabOf(blk)), `${blk.id}: its slab has a corner that isn't a number`);
    // (each corner of the lot on the block's own slab, a hair in towards its middle)
    const [cx, cz] = [lot.reduce((s, p) => s + p[0], 0) / lot.length, lot.reduce((s, p) => s + p[1], 0) / lot.length];
    const slab = slabOf(blk);
    for (const [x, z] of lot) {
      const d = Math.hypot(cx - x, cz - z) || 1;
      assert.ok(inPoly(slab, [x + ((cx - x) / d) * 0.01, z + ((cz - z) / d) * 0.01]), `${blk.id}: a corner of its lot off its slab`);
    }
  }
});

test("crest-0-2: its outline and slab as they were, its lot ending where the bay starts", () => {
  const p = crestPoly('crest-0-2');
  // (out to the corner and back: the sidewalk across the bay's end)
  assert.deepEqual(p.slice(1, 5), [
    [302.5, 40.5],
    [327.5, 40.5],
    [327.5, 40.5],
    [325.3, 40.5],
  ]);
  assert.ok(onSlab(PLAN, [327.4, 40.4]), 'the sidewalk across the bay\'s end has gone');
  const lot = insetPoly(tidyOutline(p), 0.4);
  assert.ok(finite(lot));
  assert.ok(Math.max(...lot.map((q) => q[0])) < 327.5 - 0.39);
  assert.ok(lot.every(([x, z]) => !(x > 325.3 && z > 32.5)), 'the lot reaches into the bay');
});

test('tidyOutline: repeats and straight-back corners go, real corners stay', () => {
  const square: Pt[] = [
    [0, 0],
    [0, 10],
    [10, 10],
    [10, 0],
  ];
  assert.deepEqual(tidyOutline(square), square);
  // The corner twice, then back along the top: what crest-0-2 had
  assert.deepEqual(
    tidyOutline([
      [0, 0],
      [0, 10],
      [10, 10],
      [10, 10],
      [8, 10],
      [8, 5],
      [10, 5],
      [10, 0],
    ]),
    [
      [0, 0],
      [0, 10],
      [8, 10],
      [8, 5],
      [10, 5],
      [10, 0],
    ]
  );
  // A point along a straight side goes too
  assert.deepEqual(
    tidyOutline([
      [0, 0],
      [0, 5],
      [0, 10],
      [10, 10],
      [10, 0],
    ]),
    square
  );
});

test('insetPoly: the same mitred corners as before, and never NaN', () => {
  const square: Pt[] = [
    [0, 0],
    [0, 10],
    [10, 10],
    [10, 0],
  ];
  const near = (a: Pt[], b: Pt[]) => a.length === b.length && a.every((p, i) => Math.hypot(p[0] - b[i][0], p[1] - b[i][1]) < 1e-9);
  // (the plan's outlines run with their insides to the left of travel)
  const inset = insetPoly(square, 1);
  assert.ok(near(inset, [[1, 1], [1, 9], [9, 9], [9, 1]]) || near(inset, [[-1, -1], [-1, 11], [11, 11], [11, -1]]), JSON.stringify(inset));
  // A repeated point and a fold back: finite all round
  const bad: Pt[] = [
    [0, 0],
    [0, 10],
    [10, 10],
    [10, 10],
    [8, 10],
    [8, 5],
    [10, 5],
    [10, 0],
  ];
  assert.ok(finite(insetPoly(bad, 0.4)));
});
