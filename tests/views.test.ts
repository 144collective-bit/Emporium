// The cameras at the wheel (views.ts, docs/views-plan.md Phase 1): near, far and first person in every vehicle, near
// the one each had before, far further back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHASE, chaseDistance, FIRST_NAME, nextView, START_VIEW, VIEW_ORDER, viewName, type ViewId, type ViewKind } from '../src/scripts/city3d/views';

const KINDS: ViewKind[] = ['car', 'bike', 'kart', 'boat', 'plane'];

test('every vehicle starts near and steps near, far, first person, then back', () => {
  assert.equal(START_VIEW, 'near');
  assert.deepEqual([...VIEW_ORDER], ['near', 'far', 'first']);
  let v: ViewId = START_VIEW;
  const seen: ViewId[] = [v];
  for (let i = 0; i < 3; i++) seen.push((v = nextView(v)));
  assert.deepEqual(seen, ['near', 'far', 'first', 'near']);
});

test('near is the chase camera each vehicle had before the plan', () => {
  // the car's, the bike's and the kart's (drive.ts), the boat's and the aircraft's, at a few speeds
  for (const k of ['car', 'bike', 'kart'] as const) {
    for (const [L, v] of [[4.2, 0], [4.2, 30], [1.2, 12]]) assert.equal(chaseDistance(CHASE[k].near, L, v), 3.6 + L * 0.95 + v * 0.1);
    assert.equal(CHASE[k].near.pitch, 0.26);
    assert.equal(CHASE[k].near.fov, 58);
  }
  for (const v of [0, 4, 20]) assert.equal(chaseDistance(CHASE.boat.near, 0, v), 5 + Math.min(4, v * 0.45));
  assert.equal(CHASE.boat.near.fov, undefined);
  for (const [L, v] of [[3, 0], [8, 40], [8, 200]]) assert.equal(chaseDistance(CHASE.plane.near, L, v), 4.5 + L * 1.15 + Math.min(14, v * 0.18));
  assert.equal(CHASE.plane.near.pitch, 0.2);
});

test('far is further back and looks down more than near, at every speed', () => {
  for (const k of KINDS) {
    const { near, far } = CHASE[k];
    assert.ok(far.pitch > near.pitch, k);
    for (const L of [1, 4, 12]) for (const v of [0, 5, 20, 80]) assert.ok(chaseDistance(far, L, v) > chaseDistance(near, L, v) * 1.4, `${k} ${L} ${v}`);
    // reversing pulls back the same as going forward
    assert.equal(chaseDistance(far, 4, -6), chaseDistance(far, 4, 6));
  }
});

test('every view has a name for the toast', () => {
  for (const k of KINDS) {
    assert.equal(viewName(k, 'near'), 'Near');
    assert.equal(viewName(k, 'far'), 'Far');
    assert.ok(FIRST_NAME[k].length > 0);
    assert.equal(viewName(k, 'first'), FIRST_NAME[k]);
  }
});
