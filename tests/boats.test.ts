// The river's boats (boats.ts, city life plan Phase 4): the horn before a bridge, the cruising speed and
// the wake, the moored boats clear of the lanes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BRIDGES, HORN_AHEAD, LANES, MOORED, cruise, hornDue, newBoatHorn, wakeOf } from '../src/scripts/city3d/boats';
import { RIVER } from '../src/scripts/city3d/layout';
import { JETTIES } from '../src/scripts/city3d/outer';
import { riverBridges } from '../src/scripts/city3d/streetplan';

test('a boat sounds its horn once coming up to each bridge, either way, in the approach to it and never under or past it', () => {
  // (river plan step 1: the east avenue's bridge and the highway's two; and Liberty Bridge, step 3)
  assert.ok(BRIDGES.length >= 4);
  const n = riverBridges().length + 1;
  for (const way of [1, -1] as const) {
    const h = newBoatHorn();
    const toots: number[] = [];
    for (let x = way > 0 ? -400 : 440; way > 0 ? x < 440 : x > -400; x += 0.25 * way) if (hornDue(h, x, way)) toots.push(x);
    assert.equal(toots.length, n, `${toots.length} toots for ${n} bridges going ${way > 0 ? 'east' : 'west'}`);
    // Each in some bridge's approach: before its edge, within HORN_AHEAD of it
    for (const x of toots) assert.ok(BRIDGES.some((b) => (b.c - b.half * way - x) * way > 0 && (b.c - b.half * way - x) * way <= HORN_AHEAD), `tooted at ${x}, by no bridge`);
    // ...and one toot a bridge, in turn along the river
    const inTurn = [...BRIDGES].sort((p, q) => (p.c - q.c) * way);
    inTurn.forEach((b, i) => {
      const ahead = (b.c - b.half * way - toots[i]) * way;
      assert.ok(ahead > 0 && ahead <= HORN_AHEAD, `toot ${i} at ${toots[i]} isn't for the bridge at ${b.c}`);
    });
  }
  // Standing still before a bridge it has sounded for, it stays quiet
  const h = newBoatHorn();
  const b = BRIDGES[0];
  const x = b.c - b.half - 5;
  assert.ok(hornDue(h, x, 1));
  assert.ok(!hornDue(h, x, 1));
  assert.ok(!hornDue(h, x + 2, 1));
});

test('the cruising speed eases between about 0.55 and 1 of the base; the wake trails the speed', () => {
  let lo = Infinity;
  let hi = -Infinity;
  for (let t = 0; t < 200; t += 0.5) {
    const v = cruise(1, t, 0.3);
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  assert.ok(lo > 0.5 && lo < 0.6, `slowest ${lo}`);
  assert.ok(hi > 0.95 && hi <= 1.0001, `fastest ${hi}`);
  const slow = wakeOf(0.3, 1);
  const fast = wakeOf(1, 1);
  assert.ok(fast.len > slow.len && fast.width > slow.width && fast.alpha > slow.alpha);
  assert.ok(wakeOf(-1, 1).len === fast.len, 'the same going the other way');
  assert.ok(wakeOf(0, 1).alpha >= 0.5 && wakeOf(2, 1).alpha <= 1);
});

test('the moored boats lie in the river beside their jetties, off the deck and clear of the lanes and the bridges', () => {
  assert.ok(MOORED.length >= 2);
  for (const m of MOORED) {
    assert.ok(m.z > RIVER[0] + 0.3 && m.z < RIVER[1] - 0.3, 'in the water');
    const j = JETTIES.find((q) => Math.abs(q.x + 1.9 - m.x) < 0.01)!;
    assert.ok(j, 'beside a jetty');
    // The deck reaches 0.65 out from the rail, 0.3 inland of the water, over x within 1.1 of the jetty
    assert.ok(m.x - 0.75 > j.x + 1.1, "past the deck's end");
    assert.ok(j.bank === 'north' ? m.z - 0.3 < RIVER[0] + 1.2 : m.z + 0.3 > RIVER[1] - 1.2, 'close in to its bank');
    for (const z of LANES) assert.ok(Math.abs(z - m.z) > 1.0, `in a lane at ${z}`);
    for (const b of BRIDGES) assert.ok(Math.abs(m.x - b.c) > b.half, `under a bridge at ${b.c}`);
  }
});
