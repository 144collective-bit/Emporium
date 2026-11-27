// The estate's sitting-out squares (southsquares.ts; docs/flats-plan.md Phase 5): a few on the paving round Linnet,
// Marten and Wren Courts, each a planter with a tree, two benches facing it, a bin and a lamp; the whole square clear of
// the blocks, the cages, the streets, the courts, the grass and each other; all of it solid.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SQUARE, SQUARES, SQUARE_SOLIDS, clearOf } from '../src/scripts/city3d/southsquares';
import { inBlock } from '../src/scripts/city3d/southblocks';

const d = (a: [number, number], c: [number, number]) => Math.hypot(a[0] - c[0], a[1] - c[1]);

test('a few squares, apart, each clear of everything round it for its whole reach', () => {
  assert.ok(SQUARES.length >= 3 && SQUARES.length <= 5, `${SQUARES.length} squares`);
  for (const [i, s] of SQUARES.entries()) {
    assert.ok(clearOf(s.at, SQUARE.reach), `square ${i} crowds something`);
    assert.ok(!inBlock(s.at, SQUARE.reach), `square ${i} by a block`);
    for (const o of SQUARES.slice(i + 1)) assert.ok(d(s.at, o.at) >= SQUARE.apart, 'two squares too close');
  }
});

test("each square's planter in the middle, its benches either side facing it, its bin and lamp beside, none on another", () => {
  for (const s of SQUARES) {
    assert.equal(s.benches.length, 2);
    for (const b of s.benches) {
      assert.ok(Math.abs(d([b.x, b.z], s.at) - SQUARE.bench) < 1e-6);
      // (its front, (sin yaw, cos yaw), towards the planter)
      const f = [Math.sin(b.yaw), Math.cos(b.yaw)];
      const to = [(s.at[0] - b.x) / SQUARE.bench, (s.at[1] - b.z) / SQUARE.bench];
      assert.ok(f[0] * to[0] + f[1] * to[1] > 0.99, 'a bench facing away');
    }
    const things: [number, number][] = [...s.benches.map((b): [number, number] => [b.x, b.z]), s.bin, s.lamp];
    for (const [i, p] of things.entries()) {
      assert.ok(d(p, s.at) > SQUARE.planter + 0.3, 'in the planter');
      assert.ok(d(p, s.at) <= SQUARE.reach, 'out of the square');
      for (const q of things.slice(i + 1)) assert.ok(d(p, q) > 0.9, 'two things on each other');
    }
  }
  assert.equal(SQUARE_SOLIDS.length, SQUARES.length * 5);
});
