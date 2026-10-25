// The gaze (the revamp's Phase 2, gaze.ts): the head is drawn to what's near and in front, holds a
// moment and comes back; the same thing isn't looked at twice running; standing with nothing to see
// he looks round by himself; the head leads a turn; the neck's reach holds; a glance is never a snap;
// and it's the same every time for a seed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAZE, createGaze, seeded, type GazeInput, type Interest } from '../src/scripts/city3d/gaze';

const DT = 1 / 60;
const base = (over: Partial<GazeInput> = {}): GazeInput => ({ dt: DT, x: 0, y: 1, z: 0, face: 0, speed: 0, interests: [], ...over });

/** Run `seconds` with the input `at(t)`, recording the head each frame */
function run(seconds: number, at: (t: number) => GazeInput, seed = 1) {
  const g = createGaze(seed);
  const yaw: number[] = [];
  const pitch: number[] = [];
  const w: number[] = [];
  let worstRate = 0;
  for (let i = 0; i < seconds * 60; i++) {
    const o = g.update(at(i * DT));
    if (yaw.length) worstRate = Math.max(worstRate, Math.abs(o.yaw - yaw[yaw.length - 1]) / DT);
    yaw.push(o.yaw);
    pitch.push(o.pitch);
    w.push(o.w);
  }
  return { yaw, pitch, w, worstRate, g };
}

test('a seeded random is the same sequence for the same seed, and in 0..1', () => {
  const a = seeded(5);
  const b = seeded(5);
  for (let i = 0; i < 100; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
  assert.notEqual(seeded(5)(), seeded(6)());
});

test('a person passing in front draws the eye: the head turns towards them, holds, and comes back', () => {
  // (walking slowly past: standing he'd look round by himself too)
  const person: Interest = { x: 2, z: 3, kind: 'person', moving: true, id: 'p1' };
  const r = run(12, () => base({ speed: 0.5, interests: [person] }));
  const want = Math.atan2(2, 3);
  const peak = Math.max(...r.yaw);
  assert.ok(peak > want * 0.9 && peak < want * 1.1, `turned ${peak.toFixed(2)} towards ${want.toFixed(2)}`);
  // ...and back ahead after the dwell, and not looked at again within the cooldown
  const first = r.yaw.findIndex((y) => y > want * 0.5);
  assert.ok(first > 0, 'looked');
  const after = r.yaw.slice(first + 60 * (GAZE.dwell[1] + 1), first + 60 * (GAZE.cooldown - 0.5));
  assert.ok(after.length > 60 && after.every((y) => Math.abs(y) < 0.05), 'back ahead after, not looked at again within the cooldown');
});

test('nothing behind him or out of reach is looked at', () => {
  const behind: Interest = { x: 0, z: -3, kind: 'person', id: 'b' };
  const far: Interest = { x: 0, z: GAZE.reach + 2, kind: 'person', id: 'f' };
  const r = run(12, () => base({ speed: 2, interests: [behind, far] }));
  assert.ok(r.w.every((x) => x < 0.05), 'no look');
});

test('standing with nothing to see he looks round by himself; moving he doesn\'t', () => {
  const standing = run(60, () => base());
  const looks = standing.yaw.filter((y) => Math.abs(y) > GAZE.lookRound.yaw[0] * 0.8).length;
  assert.ok(looks > 120, `looked round for ${(looks / 60).toFixed(1)} s of 60`);
  assert.ok(standing.yaw.some((y) => y > 0.2) && standing.yaw.some((y) => y < -0.2), 'both ways over time');
  const moving = run(30, () => base({ speed: 2.8 }));
  assert.ok(moving.yaw.every((y) => Math.abs(y) < 0.05), 'no look round moving');
});

test('the head leads a turn: it turns the way he\'s about to go, a share of the turn', () => {
  const r = run(3, () => base({ speed: 2.8, ahead: 0.8 }));
  const last = r.yaw[r.yaw.length - 1];
  assert.ok(Math.abs(last - 0.8 * GAZE.lead) < 0.02, `leads by ${last.toFixed(2)}`);
  const small = run(3, () => base({ speed: 2.8, ahead: 0.1 }));
  assert.ok(Math.abs(small.yaw[small.yaw.length - 1]) < 0.01, 'a small drift isn\'t led');
});

test('the neck\'s reach holds, and a glance is never a snap', () => {
  // A person coming round from in front to behind over 4 s
  const r = run(6, (t) => {
    const a = Math.min(Math.PI, (t / 4) * Math.PI);
    return base({ interests: [{ x: 3 * Math.sin(a), z: 3 * Math.cos(a), kind: 'person', moving: true, id: 'round' }] });
  });
  assert.ok(Math.max(...r.yaw.map(Math.abs)) <= GAZE.yawMost + 1e-6, 'within the neck\'s reach');
  assert.ok(r.worstRate < 6, `the head turns ${r.worstRate.toFixed(1)} rad/s at most`);
  const up = run(4, () => base({ interests: [{ x: 0, z: 2, y: 6, kind: 'sign', id: 's' }] }));
  assert.ok(Math.max(...up.pitch) <= GAZE.pitchMost + 1e-6 && Math.max(...up.pitch) > 0.3, 'looks up at a sign, within reach');
});

test('the same every time for a seed, different for another', () => {
  const a = run(10, () => base(), 3).yaw;
  const b = run(10, () => base(), 3).yaw;
  const c = run(10, () => base(), 4).yaw;
  assert.deepEqual(a, b);
  assert.ok(a.some((y, i) => Math.abs(y - c[i]) > 0.05));
});
