// The go-karts' measurements and their driver (kartframe.ts, vehicle plan Phase 9): seated low on every model, his
// hands on the wheel's grips as it turns and his feet on the pedals under the nose, within 1.5 cm.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { DRIVER_SCALE, KART_SHAPES, driverRoot, gripOf, kartPose, pedalsOf, seatOf, wheelOf } from '../src/scripts/city3d/kartframe';
import { PLAYER_KARTS } from '../src/scripts/city3d/mykart';
import { ANKLE_H, HIP_HEIGHT, makeSkeleton, newPose, poseSkeleton } from '../src/scripts/city3d/skeleton';

const CM = 180;
const sk = makeSkeleton();
/** A bone's place in kart space with the driver sat in it (facing +x) */
function boneAt(p: ReturnType<typeof newPose>, id: (typeof PLAYER_KARTS)[number], name: 'handL' | 'handR' | 'footL' | 'footR' | 'hips') {
  poseSkeleton(sk, p);
  sk.root.position.set(...driverRoot(id));
  sk.root.rotation.set(0, Math.PI / 2, 0);
  sk.root.scale.setScalar(DRIVER_SCALE);
  sk.root.updateMatrixWorld(true);
  return sk.bones[name].getWorldPosition(new THREE.Vector3());
}

test('the driver sits on the seat, both hands on the grips however the wheel turns, on every kart', () => {
  for (const id of PLAYER_KARTS) {
    for (const turn of [0, 0.6, -0.9]) {
      const p = newPose();
      kartPose(p, id, 0, 0, turn);
      // (arm 0, the rig's -x and its left hand, is on the kart's right)
      for (const [name, side] of [['handL', 1], ['handR', -1]] as const) {
        const d = boneAt(p, id, name).distanceTo(gripOf(id, side, turn));
        assert.ok(d < 0.015, `${id} turn ${turn}: ${name} on its grip (${(d * CM).toFixed(1)} cm)`);
      }
    }
    const p = newPose();
    kartPose(p, id);
    const hips = boneAt(p, id, 'hips');
    const [sx, sy] = seatOf(id);
    assert.ok(Math.abs(hips.x - sx) < 0.02 && Math.abs(hips.y - (sy + 0.01)) < 0.03, `${id}: hips on the seat (${hips.x.toFixed(3)}, ${hips.y.toFixed(3)})`);
    assert.ok(Math.abs(driverRoot(id)[1] + HIP_HEIGHT * DRIVER_SCALE - sy - 0.01) < 1e-9);
  }
});

test('his feet rest on the pedals, tucked under the nose; the wheel sits ahead of him, close enough for his elbows to bend', () => {
  for (const id of PLAYER_KARTS) {
    const s = KART_SHAPES[id];
    const p = newPose();
    kartPose(p, id, 0.6, 0.3);
    const pedals = pedalsOf(id);
    for (const [name, i] of [['footL', 1], ['footR', 0]] as const) {
      const [px, py, pz] = pedals[i];
      const want = new THREE.Vector3(px - 0.04, py + ANKLE_H * DRIVER_SCALE, pz);
      const d = boneAt(p, id, name).distanceTo(want);
      assert.ok(d < 0.015, `${id}: ${name} on its pedal (${(d * CM).toFixed(1)} cm)`);
      // Under the nose (it starts 0.16 behind the front axle's fairing and stands 0.22 over the floor)
      assert.ok(px > s.axles[1] + 0.08 - 0.16 - 0.01 && py + 0.12 < s.floor + 0.22, `${id}: the pedal under the nose`);
    }
    const [wx, wy] = wheelOf(id);
    const [sx, sy] = seatOf(id);
    assert.ok(wx > sx + 0.25 && wx < s.axles[1], `${id}: the wheel ahead of the seat, behind the front axle`);
    assert.ok(wy > sy + 0.15, `${id}: the wheel over his knees`);
  }
});
