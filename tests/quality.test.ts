// The quality step-down's order (quality.ts, docs/stability-plan.md Phase 6.1): pixels, then shadows, then bloom
// go; bloom, then shadows, then pixels come back, each once.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createQuality } from '../src/scripts/city3d/quality';

test('too slow: pixels, then shadows, then bloom, then nothing more', () => {
  const q = createQuality();
  assert.equal(q.canDegrade(), true);
  assert.equal(q.degrade(), 'pixels');
  assert.equal(q.degrade(), 'shadows');
  assert.equal(q.degrade(), 'bloom');
  assert.deepEqual({ ...q.lowered }, { pixels: true, shadows: true, bloom: true });
  assert.equal(q.canDegrade(), false);
  assert.equal(q.degrade(), null);
});

test('fast again: bloom, then shadows (they can come back now), then pixels', () => {
  const q = createQuality();
  q.degrade();
  q.degrade();
  q.degrade();
  assert.equal(q.restore(), 'bloom');
  assert.equal(q.restore(), 'shadows');
  assert.equal(q.restore(), 'pixels');
  assert.equal(q.restore(), null);
  assert.deepEqual({ ...q.lowered }, { pixels: false, shadows: false, bloom: false });
});

test('a step put back and lost again stays off: no see-sawing', () => {
  const q = createQuality();
  q.degrade(); // pixels
  q.degrade(); // shadows
  assert.equal(q.restore(), 'shadows');
  assert.equal(q.degrade(), 'shadows');
  // shadows were put back once: not again; pixels still can be
  assert.equal(q.restore(), 'pixels');
  assert.equal(q.restore(), null);
  assert.equal(q.lowered.shadows, true);
});

test('nothing lowered: nothing to put back', () => {
  assert.equal(createQuality().restore(), null);
});
