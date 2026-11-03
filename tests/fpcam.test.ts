// How the eye moves in first person (docs/firstperson-plan.md Phase 0, fpcam.ts): subtle (never past FP_MOST,
// whatever the input), the right way round, settling back to nothing, the same at any frame rate, and still
// under reduced motion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FP_FEEL, FP_MOST, joltFp, newFpCam, stepFp, type FpInput, type FpMode } from '../src/scripts/city3d/fpcam';

const MODES = Object.keys(FP_FEEL) as FpMode[];
const still: FpInput = { speed: 0, top: 10, fwd: 0, side: 0, turn: 0, bob: 0, reduced: false };
const run = (mode: FpMode, inp: Partial<FpInput>, seconds: number, hz = 60, s = newFpCam()) => {
  for (let i = 0; i < seconds * hz; i++) stepFp(s, mode, { ...still, ...inp }, 1 / hz);
  return s;
};

test('braking nods the eye forward, speeding up tips it back', () => {
  for (const m of MODES) {
    assert.ok(run(m, { fwd: -12 }, 0.5).out.pitch < 0, `${m} braking`);
    assert.ok(run(m, { fwd: 8 }, 0.5).out.pitch > 0, `${m} speeding up`);
  }
});

test('a turn to the right: the eyes lead into it, the head tips out of it', () => {
  for (const m of MODES) {
    const o = run(m, { turn: 1, side: 6 }, 0.6).out;
    assert.ok(o.yaw > 0, `${m} leads with the turn`);
    if (FP_FEEL[m].sway) assert.ok(o.roll < 0, `${m} tips outwards`);
    else assert.equal(o.roll, 0, `${m} has no sway of its own`);
  }
});

test('the field of view opens with speed, to the mode`s own most', () => {
  for (const m of MODES) {
    const o = run(m, { speed: 10, top: 10 }, 2).out;
    assert.ok(Math.abs(o.fov - FP_FEEL[m].fov) < 0.01, `${m} at top speed: ${o.fov.toFixed(3)}`);
    assert.ok(run(m, { speed: 40, top: 10 }, 2).out.fov <= FP_FEEL[m].fov + 1e-9, `${m} never past its own`);
  }
});

test('never past FP_MOST, whatever comes in (wild and broken input)', () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (const m of MODES) {
    const s = newFpCam();
    for (let i = 0; i < 3000; i++) {
      if (i % 97 === 0) joltFp(s, 1);
      const o = stepFp(s, m, { speed: rnd() * 1e3, top: 10, fwd: rnd() * 1e4, side: rnd() * 1e4, turn: rnd() * 50, bob: rnd() * 5, reduced: false }, i % 50 === 0 ? NaN : Math.abs(rnd()) * 0.1);
      for (const [k, v] of Object.entries(o)) assert.ok(Number.isFinite(v), `${m} ${k} finite`);
      assert.ok(Math.abs(o.y) <= FP_MOST.y && Math.abs(o.pitch) <= FP_MOST.pitch && Math.abs(o.roll) <= FP_MOST.roll && Math.abs(o.yaw) <= FP_MOST.yaw, `${m} within FP_MOST`);
      assert.ok(o.fov >= 0 && o.fov <= FP_MOST.fov, `${m} fov`);
    }
  }
});

test('the full-strength input of each mode stays inside FP_MOST without being cut (the gains are subtle on their own)', () => {
  // The hardest each drives in the game: a car's emergency stop, a kart's bend at full lock, a sprint's start
  const hard: Partial<FpInput> = { fwd: -14, side: 12, turn: 1.8, bob: 0.03 };
  for (const m of MODES) {
    const o = run(m, hard, 1).out;
    assert.ok(Math.abs(o.pitch) < FP_MOST.pitch, `${m} pitch ${o.pitch.toFixed(4)}`);
    assert.ok(Math.abs(o.roll) < FP_MOST.roll, `${m} roll ${o.roll.toFixed(4)}`);
    assert.ok(Math.abs(o.yaw) < FP_MOST.yaw, `${m} yaw ${o.yaw.toFixed(4)}`);
  }
});

test('everything settles back to nothing once the input stops', () => {
  for (const m of MODES) {
    const s = run(m, { fwd: 10, side: -8, turn: 1, bob: 0.02, speed: 5 }, 1);
    joltFp(s, 1);
    const o = run(m, {}, 2.5, 60, s).out;
    for (const [k, v] of Object.entries(o)) assert.ok(Math.abs(v) < 1e-3, `${m} ${k} back: ${v}`);
  }
});

test('a jolt dips the eye and nods it, then comes back without a bounce', () => {
  const s = newFpCam();
  joltFp(s, 1);
  let low = 0;
  let prev = 0;
  let rising = false;
  for (let i = 0; i < 120; i++) {
    const { y } = stepFp(s, 'foot', still, 1 / 60);
    assert.ok(y <= 1e-12, 'never above where it was');
    if (y > prev) rising = true;
    else if (rising) assert.ok(y >= prev - 1e-9, 'once it starts back up it keeps going');
    low = Math.min(low, y);
    prev = y;
  }
  assert.ok(low < -0.01 && low > -FP_MOST.y, `a dip you feel, not a lurch: ${low.toFixed(4)}`);
});

test('the same at 30 and at 144 frames a second', () => {
  for (const m of MODES) {
    const inp = { fwd: -9, side: 5, turn: 0.8, speed: 6, bob: 0.015 };
    const a = run(m, inp, 0.5, 30).out;
    const b = run(m, inp, 0.5, 144).out;
    for (const k of ['pitch', 'roll', 'yaw', 'fov', 'y'] as const) assert.ok(Math.abs(a[k] - b[k]) < 1e-6 + 1e-3 * Math.abs(b[k]), `${m} ${k}: ${a[k]} vs ${b[k]}`);
  }
});

test('under reduced motion it is still, and coming back from it starts from nothing', () => {
  for (const m of MODES) {
    const s = run(m, { fwd: 10, turn: 1, speed: 10 }, 1);
    joltFp(s, 1);
    const o = stepFp(s, m, { ...still, fwd: 10, turn: 1, speed: 10, bob: 0.03, reduced: true }, 1 / 60);
    for (const [k, v] of Object.entries(o)) assert.equal(v, 0, `${m} ${k}`);
    const after = stepFp(s, m, still, 1 / 60);
    for (const [k, v] of Object.entries(after)) assert.equal(v, 0, `${m} ${k} after`);
  }
});
