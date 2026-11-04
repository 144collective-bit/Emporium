// Hold or toggle (comfort.ts, docs/views-plan.md Phase 5): unpicked, everything works as it did; picked, it works
// the same on every input.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanHolds, DEFAULTS, HOLD_JOBS, holdMode, press, type HoldInput } from '../src/scripts/city3d/comfort';

const INPUTS: HoldInput[] = ['keys', 'pad', 'touch'];

test('unpicked, each works as it always has', () => {
  assert.equal(holdMode({}, 'sprint', 'keys'), 'hold');
  assert.equal(holdMode({}, 'sprint', 'pad'), 'hold');
  assert.equal(holdMode({}, 'sprint', 'touch'), 'toggle');
  assert.equal(holdMode({}, 'aim', 'keys'), 'hold');
  assert.equal(holdMode({}, 'aim', 'touch'), 'toggle');
  for (const i of INPUTS) {
    assert.equal(holdMode({}, 'crouch', i), 'toggle');
    assert.equal(holdMode({}, 'block', i), 'hold');
  }
});

test('picked, it is the same on the keyboard, the gamepad and touch', () => {
  for (const j of HOLD_JOBS)
    for (const m of ['hold', 'toggle'] as const) for (const i of INPUTS) assert.equal(holdMode({ [j]: m }, j, i), m);
  // and one pick leaves the others as they were
  assert.equal(holdMode({ crouch: 'hold' }, 'sprint', 'touch'), DEFAULTS.sprint.touch);
});

test('hold is on while pressed; toggle flips on each press and ignores the let-go', () => {
  assert.equal(press('hold', false, true), true);
  assert.equal(press('hold', true, false), false);
  let on = false;
  for (const [down, want] of [[true, true], [false, true], [true, false], [false, false], [true, true]] as const) {
    on = press('toggle', on, down);
    assert.equal(on, want);
  }
});

test('a saved choice is cleaned', () => {
  assert.deepEqual(cleanHolds(undefined), {});
  assert.deepEqual(cleanHolds('x'), {});
  assert.deepEqual(cleanHolds({ sprint: 'toggle', aim: 'hold', crouch: 'sideways', jump: 'toggle', block: 3 }), { sprint: 'toggle', aim: 'hold' });
});
