// From the seat of the bike and the kart (docs/firstperson-plan.md Phase 4, seateye.ts): the eye at the rider's own
// eyes with his head folded away (and back when the view's down), looking ahead along the vehicle and round as you
// look, the nobody-on-it eye in the vehicle's numbers, and the eye's motion: still at a steady speed, a lurch back
// on the throttle, the eyes into a turn.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeSkeleton } from '../src/scripts/city3d/skeleton';
import { eyeOf } from '../src/scripts/city3d/fpbody';
import { seatEye } from '../src/scripts/city3d/seateye';
import type { Degen } from '../src/scripts/city3d/character';

const SCALE = 0.85;
/** A rider on a vehicle's group: his skeleton seated at the drivers' size, facing the vehicle's +x */
function rig() {
  const group = new THREE.Group();
  group.position.set(10, 0, -4);
  group.rotation.y = 0.6;
  const sk = makeSkeleton();
  sk.root.rotation.y = Math.PI / 2;
  sk.root.scale.setScalar(SCALE);
  group.add(sk.root);
  group.updateWorldMatrix(true, true);
  return { group, rider: { rig: sk } as unknown as Degen, sk };
}
const still = { speed: 8, yawRate: 0 };

test('the eye at his own eyes, his head folded away while the view is up and back after', () => {
  const { group, rider, sk } = rig();
  const e = seatEye('bike');
  const pos = new THREE.Vector3();
  const at = new THREE.Vector3();
  const want = new THREE.Vector3();
  eyeOf(sk.bones, SCALE, want, new THREE.Vector3(), new THREE.Vector3());
  e.look(group, rider, SCALE, new THREE.Vector3(), pos, at, 0, 0, 1 / 60, still);
  assert.ok(pos.distanceTo(want) < 1e-9, 'at eyeOf()`s eyes');
  assert.ok(sk.bones.head.scale.x < 0.01, 'the head folded away');
  e.off();
  assert.equal(sk.bones.head.scale.x, 1, 'and back');
  // (a new rider: the old one's head comes back)
  e.look(group, rider, SCALE, new THREE.Vector3(), pos, at, 0, 0, 1 / 60, still);
  e.look(group, null, SCALE, new THREE.Vector3(0.1, 1, 0), pos, at, 0, 0, 1 / 60, still);
  assert.equal(sk.bones.head.scale.x, 1, 'nobody on it: his head is his own again');
  assert.ok(pos.distanceTo(new THREE.Vector3(0.1, 1, 0).applyMatrix4(group.matrixWorld)) < 1e-9, 'nobody on it: the vehicle`s own eye');
});

test('looking ahead along the vehicle, a little down the road; round and up as you look', () => {
  const { group, rider } = rig();
  const e = seatEye('kart');
  const pos = new THREE.Vector3();
  const at = new THREE.Vector3();
  const ahead = new THREE.Vector3(1, 0, 0).transformDirection(group.matrixWorld);
  e.look(group, rider, SCALE, new THREE.Vector3(), pos, at, 0, 0, 1 / 60, still, 0.15);
  const d = at.clone().sub(pos).normalize();
  assert.ok(d.dot(ahead) > 0.95, 'ahead');
  assert.ok(d.y < -0.1 && d.y > -0.2, 'a little down');
  e.look(group, rider, SCALE, new THREE.Vector3(), pos, at, 0.8, 0, 1 / 60, still, 0.15);
  const left = new THREE.Vector3(0, 0, -1).transformDirection(group.matrixWorld);
  assert.ok(at.clone().sub(pos).normalize().dot(left) > 0.5, 'looking round: to the vehicle`s left with yaw');
  e.look(group, rider, SCALE, new THREE.Vector3(), pos, at, 0, -0.5, 1 / 60, still, 0.15);
  assert.ok(at.clone().sub(pos).normalize().y > 0.1, 'and up');
});

test('the eye`s motion: still at a steady speed, a lurch back speeding up, the eyes into a turn', () => {
  const { group, rider } = rig();
  const pos = new THREE.Vector3();
  const at = new THREE.Vector3();
  const run = (st: (i: number) => { speed: number; yawRate: number }) => {
    const e = seatEye('bike');
    let v = e.look(group, rider, SCALE, new THREE.Vector3(), pos, at, 0, 0, 1 / 60, st(0));
    for (let i = 1; i < 40; i++) v = e.look(group, rider, SCALE, new THREE.Vector3(), pos, at, 0, 0, 1 / 60, st(i));
    return { ...v };
  };
  const steady = run(() => still);
  assert.ok(Math.abs(steady.pitch) < 1e-6 && Math.abs(steady.yaw) < 1e-6 && Math.abs(steady.roll) < 1e-6, 'nothing at a steady speed');
  const faster = run((i) => ({ speed: 4 + i * 0.15, yawRate: 0 }));
  assert.ok(faster.pitch > 0.002, `a lurch back speeding up (${faster.pitch.toFixed(4)})`);
  const left = run(() => ({ speed: 8, yawRate: 0.8 }));
  assert.ok(left.yaw > 0.01, 'the eyes into a left turn');
  const right = run(() => ({ speed: 8, yawRate: -0.8 }));
  assert.ok(right.yaw < -0.01, 'and a right one');
});
