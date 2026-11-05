// Two thumbs at the wheel (touchdrive.ts): the stick's reading, the floating stick's zone and the pedals that follow
// the finger.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PEDAL_REACH, STICK, inPedalZone, inSteerZone, pedalAt, stickRead, type Rect, type Screen } from '../src/scripts/city3d/touchdrive';

const close = (a: number, b: number, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} vs ${b}`);

test('the stick: still in the middle, full lock before the edge, the direction kept', () => {
  const R = 60;
  assert.deepEqual(stickRead(0, 0, R), { x: 0, y: 0 });
  assert.deepEqual(stickRead(R * STICK.dead * 0.9, 0, R), { x: 0, y: 0 });
  // full lock at `full` of the radius and past it, never over 1
  close(stickRead(-R * STICK.full, 0, R).x, -1);
  close(stickRead(R * 2, 0, R).x, 1);
  // half way between dead and full is half lock
  close(stickRead(R * (STICK.dead + STICK.full) / 2, 0, R).x, 0.5);
  // a diagonal keeps its direction, at most 1 long
  const d = stickRead(R, R, R);
  close(d.x, d.y);
  close(Math.hypot(d.x, d.y), 1);
  // it rises steadily
  let last = 0;
  for (let px = 0; px <= R; px += 3) {
    const x = stickRead(px, 0, R).x;
    assert.ok(x >= last - 1e-12);
    last = x;
  }
});

// A phone upright: 390 x 844, the header 50 high; Gas in the corner, Brake beside it
const UP: Screen = { w: 390, h: 844, head: 50, stickLeft: true };
const GAS: Rect = { x0: 290, y0: 740, x1: 370, y1: 820 };
const BRAKE: Rect = { x0: 200, y0: 760, x1: 260, y1: 820 };

test('the floating stick: anywhere low on the stick side, never up top or on the other side', () => {
  assert.ok(inSteerZone(80, 700, UP));
  assert.ok(inSteerZone(150, 400, UP));
  assert.ok(!inSteerZone(80, 120, UP), 'up top is for looking round');
  assert.ok(!inSteerZone(300, 700, UP), 'the pedals side');
  // left-handed: mirrored
  const L = { ...UP, stickLeft: false };
  assert.ok(inSteerZone(310, 700, L));
  assert.ok(!inSteerZone(80, 700, L));
  // on its side: 844 x 390
  const SIDE: Screen = { w: 844, h: 390, head: 40, stickLeft: true };
  assert.ok(inSteerZone(120, 300, SIDE) && !inSteerZone(700, 300, SIDE));
});

test('the pedals: the one under the finger, else the nearer; rolling across switches; never let go', () => {
  assert.equal(pedalAt(330, 780, GAS, BRAKE, 'brake'), 'gas');
  assert.equal(pedalAt(230, 790, GAS, BRAKE, 'gas'), 'brake');
  // a thumb rolled off Gas towards Brake: the nearer
  assert.equal(pedalAt(282, 790, GAS, BRAKE, 'gas'), 'gas');
  assert.equal(pedalAt(268, 790, GAS, BRAKE, 'gas'), 'brake');
  // dead between them it keeps what it had
  assert.equal(pedalAt(275, 790, GAS, BRAKE, 'gas'), 'gas');
  assert.equal(pedalAt(275, 790, GAS, BRAKE, 'brake'), 'brake');
  // slid far off, still the nearer: a held pedal is never dropped
  assert.equal(pedalAt(380, 300, GAS, BRAKE, 'brake'), 'gas');
  // one pedal hidden (a kart race's layout keeps both, but don't trip)
  assert.equal(pedalAt(10, 10, GAS, null, 'brake'), 'gas');
  assert.equal(pedalAt(10, 10, null, null, 'brake'), 'brake');
});

test('the pedal zone: near the pedals on their side, not the stick side or up top', () => {
  assert.ok(inPedalZone(330, 780, UP, GAS, BRAKE));
  assert.ok(inPedalZone(330, 740 - PEDAL_REACH + 2, UP, GAS, BRAKE));
  assert.ok(!inPedalZone(330, 740 - PEDAL_REACH - 10, UP, GAS, BRAKE));
  assert.ok(!inPedalZone(150, 780, UP, GAS, BRAKE), 'the stick side');
  // the zones never overlap: a touch is the stick's or the pedals', never both
  for (let x = 0; x <= UP.w; x += 10) for (let y = UP.head; y <= UP.h; y += 10) assert.ok(!(inSteerZone(x, y, UP) && inPedalZone(x, y, UP, GAS, BRAKE)), `${x},${y}`);
});
