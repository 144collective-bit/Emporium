// The boats' wakes (wakes.ts, docs/water-plan.md step 3): how long and how strong a wake is, which boats the shader
// draws (the nearest, never too many or too far), each drawing's list replacing its last, and speeds measured from
// where a boat was.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FULL, KELVIN, REST, WAKES, nearestWakes, setWakes, speedTracker, strengthOf, trailOf, type Wake } from '../src/scripts/city3d/wakes';

const boat = (x: number, z: number, speed = 2): Wake => ({ x, z, yaw: 0, speed, len: 2, beam: 0.6 });

test('a wake trails further the faster and longer the boat, never past 16; a boat at rest trails none', () => {
  assert.equal(trailOf(0, 2), 0);
  assert.equal(trailOf(REST - 0.01, 2), 0);
  assert.ok(trailOf(3, 2) > trailOf(1, 2) && trailOf(1, 2) > 0);
  assert.ok(trailOf(2, 6) > trailOf(2, 2));
  assert.equal(trailOf(100, 100), 16);
  // As strong as it gets from FULL, nothing at rest
  assert.equal(strengthOf(0), 0);
  assert.equal(strengthOf(FULL), 1);
  assert.equal(strengthOf(FULL * 3), 1);
  // The arms open at the Kelvin angle (about 19.5°)
  assert.ok(Math.abs(Math.atan(KELVIN) * (180 / Math.PI) - 19.47) < 0.01);
});

test('the shader gets the nearest boats first, at most as many as asked, none too far', () => {
  setWakes('test-a', [boat(50, 0), boat(5, 0), boat(WAKES.far + 10, 0)]);
  setWakes('test-b', [boat(0, 20), boat(0, 1)]);
  const into: Wake[] = [];
  const near = nearestWakes(0, 0, 3, into);
  assert.deepEqual(
    near.map((w) => [w.x, w.z]),
    [
      [0, 1],
      [5, 0],
      [0, 20],
    ]
  );
  assert.equal(nearestWakes(0, 0, 10, into).length, 4, 'the one past WAKES.far is left out');
  assert.ok(WAKES.phones < WAKES.most);
});

test("a drawing's boats replace what it said before", () => {
  setWakes('test-a', []);
  setWakes('test-b', [boat(0, 1)]);
  assert.equal(nearestWakes(0, 0, 10, []).length, 1);
  setWakes('test-b', []);
  assert.equal(nearestWakes(0, 0, 10, []).length, 0);
});

test('a speed measured from where a boat was eases to its true speed, and a jump never shows', () => {
  const speed = speedTracker();
  assert.equal(speed('a', 0, 0, 0), 0);
  let v = 0;
  for (let t = 0.1; t < 5; t += 0.1) v = speed('a', t * 2, 0, t);
  assert.ok(Math.abs(v - 2) < 0.05, `eased to ${v}`);
  // Put back somewhere else in a moment: the speed stays as it was
  const after = speed('a', 500, 0, 5.1);
  assert.ok(Math.abs(after - v) < 1e-9);
  // Each boat its own
  assert.equal(speed('b', 3, 3, 5.1), 0);
});
