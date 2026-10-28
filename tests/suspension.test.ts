// Your car's suspension (suspension.ts, vehicle plan Phase 2): each wheel on
// its own spring, the body's heave, pitch and roll from the springs and the
// load thrown onto them, the wheels following the ground within their travel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPRINGS, newSprings, over, stepSprings, wheelsOf, type SpringInput } from '../src/scripts/city3d/suspension';
import { CARS } from '../src/scripts/city3d/carspec';

const flat = (ax = 0, ay = 0): SpringInput => ({ ax, ay, ground: [0, 0, 0, 0] });
const run = (id: keyof typeof CARS, inp: (t: number) => SpringInput, seconds: number, dt = 1 / 60, each?: (sp: ReturnType<typeof newSprings>, t: number) => void) => {
  const sp = newSprings();
  const at = wheelsOf(CARS[id]);
  for (let t = 0; t < seconds; t += dt) {
    stepSprings(sp, SPRINGS[id], at, inp(t), dt);
    each?.(sp, t);
  }
  return sp;
};

test('every model has springs, and wheels at its four corners', () => {
  for (const s of Object.values(CARS)) {
    const t = SPRINGS[s.id];
    assert.ok(t && t.hz > 0.8 && t.hz < 3 && t.zeta > 0.3 && t.zeta < 1, s.id);
    assert.ok(t.travel > 0.03 && t.travel < s.r * 0.6, `${s.id}: travel inside the arch`);
    const w = wheelsOf(s);
    assert.equal(w.length, 4);
    assert.ok(w[0][0] < 0 && w[3][0] > 0 && w[0][1] > 0 && w[1][1] < 0, `${s.id}: back right, back left, front right, front left`);
  }
});

test('standing on flat ground nothing moves', () => {
  const sp = run('hatch', () => flat(), 3);
  for (const k of ['h', 'p', 'r', 'vh', 'vp', 'vr'] as const) assert.equal(sp[k], 0, k);
  assert.deepEqual(sp.wheels, [0, 0, 0, 0]);
});

test('speeding up lifts the nose, braking dips it, and it settles where the model says', () => {
  for (const id of ['hatch', 'van', 'super'] as const) {
    const t = SPRINGS[id];
    const go = run(id, () => flat(4), 4);
    assert.ok(go.p > 0, `${id}: the nose lifts`);
    assert.ok(Math.abs(go.p - Math.min(t.most, t.pitch * 4)) < 0.002, `${id}: settles (${go.p.toFixed(4)})`);
    const stop = run(id, () => flat(-6), 4);
    assert.ok(stop.p < 0, `${id}: the nose dives`);
  }
});

test('a turn leans the body out of it, more in the soft models than the tight ones', () => {
  // (a left turn pulls to the left: the body leans to the right, its roll positive)
  const lean = (id: keyof typeof CARS) => run(id, () => flat(0, 3), 4).r;
  assert.ok(lean('hatch') > 0, 'a left turn leans it right');
  assert.ok(run('hatch', () => flat(0, -3), 4).r < 0, 'a right turn leans it left');
  assert.ok(lean('van') > lean('hatch') && lean('hatch') > lean('super'), 'the van leans most, the supercar least');
  // However hard the turn, never past the stops
  for (const s of Object.values(CARS)) assert.ok(Math.abs(run(s.id, () => flat(0, 80), 3).r) <= SPRINGS[s.id].most + 1e-9, s.id);
});

test('it settles without bouncing on and on', () => {
  for (const s of Object.values(CARS)) {
    const t = SPRINGS[s.id];
    const want = Math.min(t.most, t.roll * 3);
    let peak = 0;
    const sp = run(s.id, () => flat(0, 3), 4, 1 / 60, (q) => void (peak = Math.max(peak, q.r)));
    assert.ok(peak < want * 1.35, `${s.id}: overshoots ${((peak / want - 1) * 100).toFixed(0)}%`);
    assert.ok(Math.abs(sp.r - want) < want * 0.03, `${s.id}: settled`);
    assert.ok(Math.abs(sp.vr) < 0.01, `${s.id}: still`);
  }
});

test('a kerb under the left wheels lifts that side, and the wheels ride up in their arches', () => {
  const kerb = 0.1;
  // (the left wheels are wheelsOf's second and fourth)
  const sp = run('sedan', () => ({ ax: 0, ay: 0, ground: [0, kerb, 0, kerb] }), 3);
  assert.ok(sp.r > 0, 'leans away from the kerb (to the right)');
  assert.ok(sp.h > 0 && sp.h < kerb, 'rises part of the way');
  const at = wheelsOf(CARS.sedan);
  for (const [i, [x, z]] of at.entries()) {
    const g = i % 2 ? kerb : 0;
    assert.ok(Math.abs(sp.wheels[i] - g) < 1e-9, `wheel ${i} on the ground`);
    assert.ok(Math.abs(sp.wheels[i] - over(sp, x, z)) <= SPRINGS.sedan.travel + 1e-9, `wheel ${i} within its travel`);
  }
});

test('a step up the front wheels pitches the nose up first, then the body follows', () => {
  let first = 0;
  const sp = run('hatch', (t) => ({ ax: 0, ay: 0, ground: t < 0.25 ? [0, 0, 0.1, 0.1] : [0.1, 0.1, 0.1, 0.1] }), 3, 1 / 60, (q, t) => {
    if (t < 0.2) first = Math.max(first, q.p);
  });
  assert.ok(first > 0, 'the nose came up');
  assert.ok(Math.abs(sp.h - 0.1) < 0.003 && Math.abs(sp.p) < 0.003, 'level again on top');
});

test('a wheel never leaves its arch: a big step carries the body with it', () => {
  for (const s of Object.values(CARS)) {
    const t = SPRINGS[s.id];
    const at = wheelsOf(s);
    run(s.id, (time) => ({ ax: 0, ay: 0, ground: time < 0.5 ? [0, 0, 0.6, 0.6] : [0, 0, 0, 0] }), 2, 1 / 60, (sp) => {
      for (const [i, [x, z]] of at.entries()) assert.ok(Math.abs(sp.wheels[i] - over(sp, x, z)) <= t.travel + 1e-9, `${s.id} wheel ${i}`);
    });
  }
});

test('a slow frame (a twentieth of a second) is as steady as many quick ones', () => {
  const slow = run('van', () => flat(3, 2), 3, 1 / 20);
  const quick = run('van', () => flat(3, 2), 3, 1 / 120);
  assert.ok(Number.isFinite(slow.p) && Math.abs(slow.p - quick.p) < 0.002 && Math.abs(slow.r - quick.r) < 0.002);
  // A hitch of half a second can't blow it up either
  const sp = newSprings();
  stepSprings(sp, SPRINGS.van, wheelsOf(CARS.van), flat(5, 5), 0.5);
  assert.ok(Math.abs(sp.p) <= SPRINGS.van.most && Math.abs(sp.r) <= SPRINGS.van.most);
});
