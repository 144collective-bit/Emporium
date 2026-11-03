// The hire boat's helm (helm.ts, docs/firstperson-plan.md Phase 5): seated on the bench, his left hand on the wheel's
// rim however it turns, his right on the throttle's knob however far it's pushed, within 1.5 cm; the lever forward
// for ahead and back for astern; the gauges on the dash's face, inside it; nothing of the helm through the console.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { eyeOf } from '../src/scripts/city3d/fpbody';
import { DRIVER_SCALE, HELM, driverRoot, helmPose, knobAt, leverAngle, onDash, rimAt, throttleHand, wheelHand } from '../src/scripts/city3d/helm';
import { ANKLE_H, makeSkeleton, newPose, poseSkeleton } from '../src/scripts/city3d/skeleton';

const CM = 180;
const sk = makeSkeleton();
/** A bone's place in boat space with the driver sat at the helm (facing the bow, +x) */
function boneAt(p: ReturnType<typeof newPose>, name: 'handL' | 'handR' | 'hips' | 'head' | 'footL' | 'footR' | 'shinL' | 'shinR') {
  poseSkeleton(sk, p);
  sk.root.position.copy(driverRoot());
  sk.root.rotation.set(0, Math.PI / 2, 0);
  sk.root.scale.setScalar(DRIVER_SCALE);
  sk.root.updateMatrixWorld(true);
  return sk.bones[name].getWorldPosition(new THREE.Vector3());
}

test('his left hand on the wheel and his right on the throttle, however they`re turned and pushed', () => {
  for (const steer of [0, 1, -1, 0.4])
    for (const power of [0, 1, -1, 0.5]) {
      const p = newPose();
      helmPose(p, steer, power);
      // (arm 0, the bone `handL` on the rig's -x, is his right hand: on the throttle, the starboard side)
      const l = boneAt(p, 'handR').distanceTo(wheelHand(steer));
      const r = boneAt(p, 'handL').distanceTo(throttleHand(power));
      assert.ok(l < 0.015, `steer ${steer}: his left hand on the rim (${(l * CM).toFixed(1)} cm)`);
      assert.ok(r < 0.015, `power ${power}: his right hand on the knob (${(r * CM).toFixed(1)} cm)`);
    }
});

test('he sits on the bench, his head under nothing, facing the bow', () => {
  const p = newPose();
  helmPose(p, 0, 0);
  const hips = boneAt(p, 'hips');
  assert.ok(Math.abs(hips.x - HELM.seat.x) < 0.03 && Math.abs(hips.y - HELM.seat.y) < 0.04, `hips on the bench (${hips.x.toFixed(3)}, ${hips.y.toFixed(3)})`);
  const head = boneAt(p, 'head');
  assert.ok(head.x < HELM.wheel.x - 0.1, 'his head behind the wheel');
  assert.ok(head.y > HELM.screen.at.y + 0.05, 'over the windscreen`s middle');
  // His feet on the sole, not through it; his knees aft of the console and clear of the lever's box
  for (const f of ['footL', 'footR'] as const) {
    const y = boneAt(p, f).y;
    assert.ok(y > HELM.sole + ANKLE_H * DRIVER_SCALE - 0.015 && y < HELM.sole + ANKLE_H * DRIVER_SCALE + 0.04, `${f} on the sole (${y.toFixed(3)})`);
  }
  const [x0, y0, z0, x1, y1, z1] = HELM.leverBox;
  const pod = new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1));
  for (const k of ['shinL', 'shinR'] as const) {
    const knee = boneAt(p, k);
    assert.ok(knee.x < HELM.wheelPod[0] - 0.06, `${k}: the knee aft of the console (${knee.x.toFixed(3)})`);
    assert.ok(pod.distanceToPoint(knee) > 0.07, `${k}: clear of the lever's pod (${pod.distanceToPoint(knee).toFixed(3)})`);
  }
});

test('the lever forward for ahead, back for astern; the knob over the side box', () => {
  assert.ok(knobAt(1).x > knobAt(0).x + 0.05 && knobAt(-1).x < knobAt(0).x - 0.05);
  assert.equal(leverAngle(0), 0);
  const [, , , , y1] = HELM.leverBox;
  for (const pw of [-1, 0, 1]) assert.ok(knobAt(pw).y > y1 + 0.05, 'the knob clear over its box');
});

test('the wheel turns about its middle; the gauges inside the dash`s face', () => {
  for (const a of [0, 1, 2, 4]) assert.ok(Math.abs(rimAt(a, 0.5).distanceTo(HELM.wheel) - HELM.wheelR) < 1e-9);
  assert.ok(rimAt(Math.PI / 2, 1).z > 0.05, 'turned to starboard, the top goes to starboard');
  const { h, w } = HELM.dash;
  for (const z of HELM.gauges) {
    assert.ok(Math.abs(z) + HELM.gaugeR < w / 2, 'across the dash');
    assert.ok(HELM.gaugeR < h / 2, 'up its slope');
  }
  // (the dash's face leans back towards him: out from it is aft and up)
  const off = onDash(0, 0, 0.01).sub(onDash(0, 0, 0));
  assert.ok(off.x < 0 && off.y > 0);
});

test('from his eyes looking ahead: the horizon, the wheel`s top, both gauges and his hand on the lever in view', () => {
  const p = newPose();
  helmPose(p, 0, 1);
  boneAt(p, 'head');
  const eye = new THREE.Vector3();
  eyeOf(sk.bones, DRIVER_SCALE, eye, new THREE.Vector3(), new THREE.Vector3());
  const half = (HELM.view.fov / 2) * (Math.PI / 180);
  const { down } = HELM.view;
  // (the angle below level to a point dead ahead or to the side: in view if within the frame's height, less a margin)
  const inView = (q: THREE.Vector3, what: string) => {
    const d = q.clone().sub(eye);
    const a = Math.atan2(d.y, d.x);
    assert.ok(a > -down - half + 0.05 && a < -down + half - 0.05, `${what} in view (${((a * 180) / Math.PI).toFixed(1)} deg)`);
  };
  inView(eye.clone().add(new THREE.Vector3(100, 0, 0)), 'the horizon');
  inView(rimAt(Math.PI / 2, 0), 'the wheel`s top');
  for (const z of HELM.gauges) inView(onDash(0, z, 0), 'a gauge');
  inView(knobAt(1), 'the throttle`s knob, pushed ahead');
  // (the gauges' middles over the wheel's top, not hidden behind its rim)
  const top = rimAt(Math.PI / 2, 0);
  const rim = Math.atan2(top.y - eye.y, top.x - eye.x);
  const g = onDash(0, 0, 0);
  assert.ok(Math.atan2(g.y - eye.y, g.x - eye.x) > rim + 0.02, 'the gauges over the wheel`s top');
});
