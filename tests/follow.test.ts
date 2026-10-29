// Follow-through (the animation revamp's Phase 8, follow.ts): the head a few frames behind the chest in a turn,
// caught up once it stops, nothing standing still, and a jump taken at once.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOLLOW, createFollow } from '../src/scripts/city3d/follow';

const DT = 1 / 60;

test('turning, the head trails the chest; stopped, it catches up', () => {
  const f = createFollow();
  let yaw = 0;
  f.update(DT, yaw);
  // A steady turn left at 3 rad/s: the head turned back (right, negative) by about the speed times the lag
  for (let i = 0; i < 30; i++) f.update(DT, (yaw += 3 * DT));
  const trail = -f.offset;
  const want = (FOLLOW.share * 3 * FOLLOW.lag) / Math.LN2;
  assert.ok(trail > 0 && Math.abs(trail - want) < 0.03, `trails ${trail.toFixed(3)} (about ${want.toFixed(3)})`);
  // A few frames behind: the offset is the chest's way a few frames ago
  assert.ok(trail / FOLLOW.share / (3 * DT) > 2 && trail / FOLLOW.share / (3 * DT) < 8, 'a few frames');
  // Stopped: caught up within a quarter second
  for (let i = 0; i < 15; i++) f.update(DT, yaw);
  assert.ok(Math.abs(f.offset) < 0.01, `caught up ${f.offset}`);
  // The other way trails the other way
  for (let i = 0; i < 30; i++) f.update(DT, (yaw -= 3 * DT));
  assert.ok(f.offset > 0);
});

test('never more than its most, nothing standing still, a jump taken at once', () => {
  const f = createFollow();
  let yaw = 1;
  for (let i = 0; i < 60; i++) assert.equal(f.update(DT, yaw), 0);
  for (let i = 0; i < 30; i++) assert.ok(Math.abs(f.update(DT, (yaw += 0.15))) <= FOLLOW.most + 1e-9);
  f.reset();
  f.update(DT, 0);
  assert.equal(f.update(DT, 2.5), 0, 'a jump is taken at once');
  // Across the wrap at ±π it's the short way round
  const g = createFollow();
  g.update(DT, Math.PI - 0.01);
  const o = g.update(DT, -Math.PI + 0.01);
  assert.ok(o < 0 && o > -0.02, `the short way (0.02 left, so a touch right): ${o}`);
});
