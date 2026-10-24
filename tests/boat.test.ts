// Boating yourself (boat-sim.ts, river plan step 4c): the hire boat at its mooring, the handling, and the soft
// collisions: it keeps to the water, off everything standing in it and every other boat, passes under the bridges only
// where there's room (never under the ring highway's), and you step off only alongside a landing or at its mooring.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOAT, LEAVE, TUNE, WATER_SOLIDS, aheadOf, circles, leaveAt, moversAt, newBoat, speedOf, stepBoat, type BoatState, type Circle, type Rect } from '../src/scripts/city3d/boat-sim';
import { HIRE, STOPS, atGangway } from '../src/scripts/city3d/riverbus';
import { WATER_Y, inWater } from '../src/scripts/city3d/river';
import { RIVER } from '../src/scripts/city3d/layout';
import { BX, DECK_DEPTH, DECK_HALF, lowY } from '../src/scripts/city3d/liberty';
import { DEPTH, HALF, HX, deckY } from '../src/scripts/city3d/harbour';
import { riverBridges } from '../src/scripts/city3d/streetplan';
import { PROMENADE } from '../src/scripts/city3d/outer';
import { LANDINGS, OBSTACLES } from './water';

const highway = riverBridges().filter((b) => b.street === 'highway');
const [WEST, EAST] = [Math.max(...highway.filter((b) => b.x1 < 0).map((b) => b.x1)), Math.min(...highway.filter((b) => b.x0 > 0).map((b) => b.x0))];
/** How far a circle reaches into a rect (0: clear) */
const into = (c: Circle, r: Rect) => {
  const qx = Math.min(Math.max(c.x, r[0]), r[2]);
  const qz = Math.min(Math.max(c.z, r[1]), r[3]);
  const d = Math.hypot(c.x - qx, c.z - qz);
  return c.x > r[0] && c.x < r[2] && c.z > r[1] && c.z < r[3] ? c.r + 1 : Math.max(0, c.r - d);
};
const clearOf = (s: BoatState, m: number) => circles(s.x, s.z, s.yaw).every((c) => inWater(c.x, c.z, c.r - m) && WATER_SOLIDS.every((r) => into(c, r) <= m));
/** A seeded generator (the tests' own) */
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

test('the hire boat lies at its mooring, clear of everything, its ladder up to the promenade', () => {
  const s = newBoat();
  assert.ok(clearOf(s, 0), 'its mooring is clear');
  assert.ok(HIRE.door.z > PROMENADE.north[0] && HIRE.door.z < PROMENADE.north[1] && HIRE.door.x > PROMENADE.x[0]);
  assert.ok(atGangway('north', HIRE.door.x) && !atGangway('north', HIRE.door.x + 1.5), 'the railing opens at the ladder');
  assert.deepEqual(leaveAt(s)?.at, HIRE.door, 'you can step off back where you took it');
  // Clear of the river bus lying at Downtown's landing
  const down = STOPS.find((o) => o.id === 'downtown')!;
  assert.ok(HIRE.x - BOAT.len / 2 > down.landing[2] + 1);
});

test('what it keeps off: everything standing in the water, the landings, and the spans too low to pass under', () => {
  // Every obstacle the river's other tests know is covered
  for (const [what, r] of [...OBSTACLES, ...LANDINGS]) assert.ok(WATER_SOLIDS.some((w) => w[0] <= r[0] + 1e-6 && w[1] <= r[1] + 1e-6 && w[2] >= r[2] - 1e-6 && w[3] >= r[3] - 1e-6), `${what} is solid`);
  // Wherever it can float, there's room over it
  const r = BOAT.beam / 2;
  for (let x = WEST - 2; x <= EAST + 2; x += 0.5)
    for (let z = RIVER[0]; z <= RIVER[1]; z += 0.5) {
      const c = { x, z, r };
      if (!inWater(x, z, r) || WATER_SOLIDS.some((w) => into(c, w) > 0)) continue;
      const top = WATER_Y + BOAT.top;
      if (Math.abs(x - BX) < DECK_HALF + r) assert.ok(top < lowY(z) - DECK_DEPTH, `under Liberty Bridge at ${x}, ${z}`);
      if (Math.abs(x - HX) < HALF + r) assert.ok(top < deckY(z) - DEPTH, `under Harbour Bridge at ${x}, ${z}`);
      for (const b of highway) assert.ok(x < b.x0 - r + 1e-6 || x > b.x1 + r - 1e-6, `under the highway at ${x}`);
    }
  // ...and the middle of Harbour Bridge is open (the hump is high enough)
  const mid = (RIVER[0] + RIVER[1]) / 2;
  assert.ok(!WATER_SOLIDS.some((w) => into({ x: HX + 1, z: mid + 3, r }, w) > 0));
});

test('the handling: up to speed ahead, slower astern, the water slows it, the rudder turns it', () => {
  const s = newBoat({ x: -10, z: 101, yaw: 0 });
  for (let i = 0; i < 8 * 60; i++) stepBoat(s, { throttle: 1, steer: 0 }, 1 / 60, []);
  assert.ok(aheadOf(s) > TUNE.top * 0.85 && aheadOf(s) <= TUNE.top + 1e-6, `ahead at ${aheadOf(s).toFixed(2)}`);
  for (let i = 0; i < 6 * 60; i++) stepBoat(s, { throttle: 0, steer: 0 }, 1 / 60, []);
  assert.ok(aheadOf(s) < TUNE.top * 0.15, 'coasting, it slows');
  for (let i = 0; i < 6 * 60; i++) stepBoat(s, { throttle: -1, steer: 0 }, 1 / 60, []);
  assert.ok(aheadOf(s) < 0 && aheadOf(s) >= -TUNE.astern - 1e-6, 'astern, gently');
  // At speed, right on the rudder turns it right (its heading falls: 0 is east, north is left)
  const t = newBoat({ x: -10, z: 101, yaw: 0 });
  for (let i = 0; i < 4 * 60; i++) stepBoat(t, { throttle: 1, steer: 0 }, 1 / 60, []);
  const y0 = t.yaw;
  for (let i = 0; i < 60; i++) stepBoat(t, { throttle: 1, steer: 1 }, 1 / 60, []);
  assert.ok(t.yaw < y0 - 0.6, 'it turns');
  assert.ok(speedOf(t) > 3, 'and keeps going');
  // A long frame is cut up: the same as many short ones
  const a = newBoat({ x: -10, z: 101, yaw: 0.3 });
  const b = newBoat({ x: -10, z: 101, yaw: 0.3 });
  stepBoat(a, { throttle: 1, steer: 0.5 }, 0.5, []);
  for (let i = 0; i < 15; i++) stepBoat(b, { throttle: 1, steer: 0.5 }, 1 / 30, []);
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 1e-9);
});

test('soft collisions: off the banks, the piers and the decks, never through them', () => {
  // Full ahead into Liberty Bridge's north tower's pier, into the north quay wall, and into the boardwalk
  for (const [x, z, yaw] of [
    [BX - 12, 92, 0],
    [0, 80, Math.PI / 2],
    [-120, 118, -Math.PI / 2],
  ]) {
    const s = newBoat({ x, z, yaw });
    let knock = 0;
    for (let i = 0; i < 10 * 60; i++) {
      knock = Math.max(knock, stepBoat(s, { throttle: 1, steer: 0 }, 1 / 60));
      assert.ok(clearOf(s, 0.05), `through something at ${s.x.toFixed(2)}, ${s.z.toFixed(2)}`);
    }
    assert.ok(knock > 1, 'it knocked into it');
  }
});

test('a long drive round the river: in the water, clear of everything and every boat, between the highway bridges', () => {
  const rand = seeded(7);
  const s = newBoat();
  let inp = { throttle: 1, steer: 0 };
  for (let i = 0; i < 900 * 30; i++) {
    const t = 1000 + i / 30;
    if (i % 60 === 0) inp = { throttle: rand() < 0.85 ? 1 : -1, steer: rand() < 0.4 ? 0 : rand() * 2 - 1 };
    const others = moversAt(t, s.x, s.z);
    stepBoat(s, inp, 1 / 30, WATER_SOLIDS, others);
    assert.ok(clearOf(s, 0.05), `in something at ${s.x.toFixed(2)}, ${s.z.toFixed(2)} (t ${t.toFixed(1)})`);
    for (const c of circles(s.x, s.z, s.yaw)) for (const o of others) assert.ok(Math.hypot(c.x - o.x, c.z - o.z) > c.r + o.r - 0.05, `through a boat at ${t.toFixed(1)}`);
    assert.ok(s.x > WEST && s.x < EAST);
  }
});

test('stepping off: alongside a landing or at the mooring, and stopped', () => {
  for (const st of STOPS) {
    const k = st.bank === 'north' ? 1 : -1;
    const edge = k > 0 ? st.landing[3] : st.landing[1];
    const s = newBoat({ x: st.x + 1, z: edge + k * (BOAT.beam / 2 + 0.3), yaw: 0 });
    assert.ok(clearOf(s, 0), `${st.name}: room to lie alongside`);
    assert.equal(leaveAt(s)?.stop, st);
    s.vx = LEAVE.speed + 0.5;
    assert.equal(leaveAt(s), null, 'not while it moves');
  }
  assert.equal(leaveAt(newBoat({ x: -10, z: 101, yaw: 0 })), null, 'not in mid-river');
});
