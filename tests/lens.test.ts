// The walk camera's lens up close (lens.ts): the near plane in as a wall comes near and out when nothing is, and
// people the lens is inside left undrawn.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LENS, nearFor, onLens } from '../src/scripts/city3d/lens';

test('the near plane: the city\'s with nothing close, in as a wall comes near, never under its least', () => {
  // Nothing within the probe: the city's own
  assert.equal(nearFor(LENS.probe, false), LENS.base);
  assert.equal(nearFor(5, false), LENS.base);
  // A wall a third of a tile off (where the camera stops short of one): well inside it, corners and all
  const n = nearFor(0.33, false);
  assert.ok(n < 0.33 && n * 1.6 < 0.33 + 0.18, `near ${n}`);
  // Nearer the wall, nearer the plane; never past the least or the base
  let last = Infinity;
  for (let g = 1; g >= 0; g -= 0.05) {
    const v = nearFor(g, false);
    assert.ok(v <= last + 1e-12 && v >= LENS.min && v <= LENS.base);
    last = v;
  }
  assert.equal(nearFor(0, false), LENS.min);
  assert.equal(nearFor(-1, false), LENS.min);
  // First person: in all the time
  assert.equal(nearFor(5, true), LENS.first);
  assert.ok(nearFor(0.05, true) >= LENS.min);
  // In steps, so it isn't set anew each frame for a hair's change
  assert.equal(nearFor(0.501, false), nearFor(0.505, false));
});

test('people: not drawn with the lens inside them or the near plane cutting them; drawn otherwise', () => {
  // The lens in the middle of someone
  assert.ok(onLens(0, 0, 0, 0.5, 1));
  // Just beside them, within the near plane: cut open, so left out
  assert.ok(onLens(0.5, 0, 0, 0.5, 1));
  // A step off: drawn
  assert.ok(!onLens(1.2, 0, 0, 0.5, 1));
  // With the near plane in (a wall close by), they stay until the lens is right at them
  assert.ok(!onLens(0.5, 0, 0, 0.05, 1));
  assert.ok(onLens(0.2, 0, 0, 0.05, 1));
  // Over their head or under their feet: drawn
  assert.ok(!onLens(0, 2, 0, 0.5, 1));
  assert.ok(!onLens(0, -2, 0, 0.5, 1));
  // Smaller people, a smaller body
  assert.ok(!onLens(0.3, 0, 0, 0.05, 0.5));
});
