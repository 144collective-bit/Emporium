// Springs and inertialization (animation Phase 1, inertia.ts): the springs settle where they should
// without overshooting, turns as vectors go there and back, and a jump between two poses shows no
// step at all and then eases into the new pose.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { angVel, createInertia, decay, expQ, logQ, springAhead, springAngle, springVel } from '../src/scripts/city3d/inertia';

test('an offset decays to nothing without crossing over', () => {
  let x = 1;
  let v = 0;
  for (let i = 0; i < 60; i++) {
    [x, v] = decay(x, v, 0.1, 1 / 60);
    assert.ok(x >= -1e-9, 'never past zero');
  }
  assert.ok(x < 0.02, `after a second: ${x.toFixed(4)}`);
});

test('a velocity spring reaches its goal, and springAhead() adds up the way there', () => {
  let v = 0;
  let a = 0;
  let d = 0;
  const n = 1000;
  for (let i = 0; i < n; i++) {
    [v, a] = springVel(v, a, 3, 0.12, 1 / n);
    d += v / n;
  }
  assert.ok(Math.abs(v - 3) < 0.01);
  assert.ok(Math.abs(springAhead(0, 0, 3, 0.12, 1) - d) < 0.005);
});

test('a heading spring takes the short way round', () => {
  let y = 3;
  let w = 0;
  for (let i = 0; i < 120; i++) [y, w] = springAngle(y, w, -3, 0.08, 1 / 60);
  // From 3 to -3 the short way is through π, not back through 0
  assert.ok(Math.abs(Math.atan2(Math.sin(y + 3), Math.cos(y + 3))) < 0.01);
});

test('turns as vectors go there and back', () => {
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const back = new THREE.Quaternion();
  for (const [x, y, z, ang] of [
    [1, 0, 0, 0.3],
    [0, 1, 1, 2.5],
    [1, -2, 0.5, 3.1],
    [0, 0, 1, 1e-9],
  ]) {
    q.setFromAxisAngle(new THREE.Vector3(x, y, z).normalize(), ang);
    expQ(logQ(q, v), back);
    assert.ok(q.angleTo(back) < 1e-6);
  }
});

test('a jump between poses shows no step, then eases into the new pose', () => {
  const n = 3;
  const inertia = createInertia(n, 0.1);
  const src = new Float32Array(n * 4);
  const dst = new Float32Array(n * 4);
  const rnd = (out: Float32Array) => {
    for (let b = 0; b < n; b++) new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)).toArray(out, b * 4);
  };
  rnd(src);
  rnd(dst);
  const zero = () => Array.from({ length: n }, () => new THREE.Vector3());
  inertia.jump(src, zero(), new THREE.Vector3(0, 0.6, 0), new THREE.Vector3(), dst, zero(), new THREE.Vector3(0, 0.5, 0), new THREE.Vector3());
  const shown = dst.slice();
  const hips = new THREE.Vector3(0, 0.5, 0);
  inertia.apply(shown, hips);
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();
  for (let b = 0; b < n; b++) assert.ok(qa.fromArray(shown, b * 4).angleTo(qb.fromArray(src, b * 4)) < 2e-3, 'the first frame after the jump is the old pose (to float32)');
  assert.ok(Math.abs(hips.y - 0.6) < 1e-6);
  for (let i = 0; i < 60; i++) inertia.step(1 / 60);
  const later = dst.slice();
  inertia.apply(later, hips.set(0, 0.5, 0));
  for (let b = 0; b < n; b++) assert.ok(qa.fromArray(later, b * 4).angleTo(qb.fromArray(dst, b * 4)) < 0.03, 'a second on, the new pose');
});

test('angular velocity between two frames', () => {
  const a = new THREE.Quaternion().toArray([]);
  const b = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.1).toArray([]);
  const v = angVel(a, 0, b, 0, 0.05, new THREE.Vector3());
  assert.ok(Math.abs(v.y - 2) < 1e-6 && Math.abs(v.x) < 1e-9);
});
