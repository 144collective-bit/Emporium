// Degen's arms in first person with empty hands (fparm.ts, the owner's call 2026-11: premium, jointed, not
// deformed): the elbow's reach, the fist's shape and the sleeves' pieces.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ARM, FIST, aimPiece, cuffGeometry, fistGeometry, merge, paint, sleeveGeometry, sleeveRadius, solveArm, stripeGeometry } from '../src/scripts/city3d/fparm';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const near = (a: number, b: number, e = 1e-6) => Math.abs(a - b) < e;

test('in reach, the hand lands on the target and both bones keep their lengths', () => {
  const s = V(0.2, -0.27, 0.06);
  const t = V(0.12, -0.12, -0.33);
  const e = new THREE.Vector3();
  const h = new THREE.Vector3();
  solveArm(s, t, V(0.45, -1, 0.15), e, h);
  assert.ok(h.distanceTo(t) < 1e-6, 'on the target');
  assert.ok(near(s.distanceTo(e), ARM.upper), 'upper arm');
  assert.ok(near(e.distanceTo(h), ARM.fore), 'forearm');
});

test('the elbow swings towards the pole: down in the guard, up and out for a hook', () => {
  const s = V(0.2, -0.27, 0.06);
  const t = V(0.12, -0.12, -0.33);
  const e = new THREE.Vector3();
  const h = new THREE.Vector3();
  solveArm(s, t, V(0, -1, 0), e, h);
  const mid = s.clone().add(h).multiplyScalar(0.5);
  assert.ok(e.y < mid.y, 'down');
  solveArm(s, t, V(1, 0.5, 0), e, h);
  assert.ok(e.x > mid.x, 'out');
});

test('out of reach, the arm goes straight towards the target and no further; never folded through itself', () => {
  const s = V(0, 0, 0);
  const e = new THREE.Vector3();
  const h = new THREE.Vector3();
  solveArm(s, V(0, 0, -2), V(0, -1, 0), e, h);
  assert.ok(h.length() <= ARM.upper + ARM.fore + 1e-9 && h.length() > (ARM.upper + ARM.fore) * 0.99);
  assert.ok(h.x === 0 && h.y === 0 && h.z < 0, 'straight at it');
  solveArm(s, V(0, 0, -0.001), V(0, -1, 0), e, h);
  assert.ok(h.length() >= Math.abs(ARM.upper - ARM.fore), 'not through itself');
  assert.ok(Number.isFinite(e.x + e.y + e.z));
});

test('a piece is turned along its bone, its +z as near the face asked as it can be', () => {
  const q = new THREE.Quaternion();
  aimPiece(V(0, 0, 0), V(0, 1, -1), V(0, 0, 1), q);
  const y = V(0, 1, 0).applyQuaternion(q);
  const z = V(0, 0, 1).applyQuaternion(q);
  assert.ok(y.distanceTo(V(0, 1, -1).normalize()) < 1e-6);
  assert.ok(near(y.dot(z), 0) && z.z > 0 && z.y > 0, 'square to the bone, facing as near as it can');
  // (a face along the bone itself still gives a turn)
  aimPiece(V(0, 0, 0), V(0, 0, 1), V(0, 0, 1), q);
  assert.ok(Number.isFinite(q.x + q.y + q.z + q.w));
});

test('the fist: closed, its size, the knuckles out front, the thumb on its side, nothing left over', () => {
  for (const thumb of [-1, 1] as const) {
    const g = fistGeometry(thumb);
    g.computeBoundingBox();
    const b = g.boundingBox!;
    const size = b.getSize(new THREE.Vector3());
    assert.ok(size.x > FIST.width * 0.9 && size.x < FIST.width * 1.2, `wide ${size.x}`);
    assert.ok(b.max.y > FIST.length * 0.85 && b.max.y < FIST.length * 1.1, `long ${b.max.y}`);
    assert.ok(size.z > FIST.depth * 0.8 && size.z < FIST.depth * 1.2, `deep ${size.z}`);
    // (the thumb, the furthest under the palm, is on its own side)
    const pos = g.attributes.position as THREE.BufferAttribute;
    let lowX = 0;
    let lowZ = Infinity;
    for (let i = 0; i < pos.count; i++)
      if (pos.getZ(i) < lowZ && pos.getY(i) > 0.06) {
        lowZ = pos.getZ(i);
        lowX = pos.getX(i);
      }
    assert.ok(lowX * thumb > -0.01, `thumb on side ${thumb}`);
    assert.deepEqual(Object.keys(g.attributes).sort(), ['normal', 'position']);
  }
});

test('the sleeves and cuffs: their lengths, round both ends; painted pieces merge into one draw', () => {
  const s = sleeveGeometry(0.058, 0.052, ARM.upper);
  s.computeBoundingBox();
  assert.ok(near(s.boundingBox!.min.y, -0.058, 1e-4) && near(s.boundingBox!.max.y, ARM.upper + 0.052, 1e-4));
  const open = sleeveGeometry(0.05, 0.045, 0.2, false);
  open.computeBoundingBox();
  assert.ok(near(open.boundingBox!.max.y, 0.2, 1e-6), 'open-ended for a cuff');
  const c = cuffGeometry(0.04, 0.037, 0.2, 0.25, 3);
  c.computeBoundingBox();
  assert.ok(c.boundingBox!.min.y >= 0.2 - 0.003 && c.boundingBox!.max.y <= 0.25 + 0.003);
  const st = stripeGeometry(Math.PI / 2, 0.058, 0.052, ARM.upper, 0.03, ARM.upper - 0.01);
  st.computeBoundingBox();
  assert.ok(st.boundingBox!.min.z > 0.05, 'a stripe at +z sits out on +z');
  // (on the sleeve all the way along: never sunk into it, never more than a few millimetres off it)
  const sp = st.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < sp.count; i++) {
    const out = Math.hypot(sp.getX(i), sp.getZ(i)) - sleeveRadius(0.058, 0.052, ARM.upper, sp.getY(i));
    assert.ok(out > 0 && out < 0.006, `stripe ${out} off the sleeve at ${sp.getY(i)}`);
  }
  const g = merge([paint(s, '#ff0000'), paint(fistGeometry(-1).translate(0, ARM.fore, 0), '#00ff00')]);
  const tint = g.attributes.tint as THREE.BufferAttribute;
  assert.equal(tint.count, g.attributes.position.count);
  assert.ok(tint.getX(0) > 0.9 && tint.getY(0) < 0.1);
  assert.ok(tint.getY(tint.count - 1) > 0.9);
});

// His body's arms read from the eye (the owner's call, 2026-11: "use his real body's clips")
import { makeSkeleton, newPose, poseSkeleton, UPPER_ARM } from '../src/scripts/city3d/skeleton';
import { BODY_TO_ARM, EYE, FP_FIX, FP_RUN, bodyArm, eyeFrame, newLaidArm, type BodyJoints } from '../src/scripts/city3d/fparm';

/** His skeleton posed (arms by `arms`), scaled `unit` and facing +z: its head and each arm's joints in the world */
function body(unit: number, arms?: (p: ReturnType<typeof newPose>) => void) {
  const sk = makeSkeleton();
  const p = newPose();
  arms?.(p);
  poseSkeleton(sk, p, [1, 1]);
  sk.root.scale.setScalar(unit);
  sk.root.updateMatrixWorld(true);
  const v = () => new THREE.Vector3();
  const side = (S: 'L' | 'R'): BodyJoints => ({
    shoulder: sk.bones[`arm${S}`].getWorldPosition(v()),
    elbow: sk.bones[`fore${S}`].getWorldPosition(v()),
    hand: sk.bones[`hand${S}`].getWorldPosition(v()),
    back: V(S === 'R' ? 1 : -1, 0, 0).applyQuaternion(sk.bones[`hand${S}`].getWorldQuaternion(new THREE.Quaternion())),
  });
  return { head: sk.bones.head.getWorldPosition(v()), L: side('L'), R: side('R') };
}

test('the eye: in his head, up and forward of the head bone, looking the way he faces', () => {
  const head = V(1, 2, 3);
  const m = eyeFrame(head, V(0, 0.3, 1), 0.66, new THREE.Matrix4());
  const at = new THREE.Vector3().setFromMatrixPosition(m);
  assert.ok(near(at.y - head.y, EYE.up * 0.66) && near(at.z - head.z, EYE.fwd * 0.66) && near(at.x, 1));
  // (-z the way he faces, level: a point ahead of him is ahead of the eye)
  const ahead = V(1, 2, 13).applyMatrix4(m.clone().invert());
  assert.ok(ahead.z < -9 && Math.abs(ahead.x) < 1e-6);
});

test('laid on his body: his arm lengths become the arm\'s, the elbow his own, the fist on his forearm', () => {
  for (const unit of [0.66, 1]) {
    const b = body(unit, (p) => {
      p.arms[0].fwd = p.arms[1].fwd = 0.8;
      p.arms[0].bend = p.arms[1].bend = 1.6;
    });
    const eye = eyeFrame(b.head, V(0, 0, 1), unit, new THREE.Matrix4());
    for (const j of [b.L, b.R]) {
      const l = bodyArm(j, eye, unit, newLaidArm());
      assert.ok(near(l.shoulder.distanceTo(l.elbow), ARM.upper, 1e-4), 'the upper arm');
      assert.ok(near(l.elbow.distanceTo(l.wrist), ARM.fore, 1e-4), 'the forearm');
      // (the elbow is his: his elbow read from the eye, in these metres)
      const mine = j.elbow.clone().applyMatrix4(eye.clone().invert()).multiplyScalar(BODY_TO_ARM / unit);
      assert.ok(mine.distanceTo(l.elbow) < 1e-6);
      assert.ok(near(l.face.length(), 1));
    }
    // (his two arms either side of the eye, both below it)
    const L = bodyArm(b.L, eye, unit, newLaidArm());
    const R = bodyArm(b.R, eye, unit, newLaidArm());
    assert.ok(L.shoulder.x * R.shoulder.x < 0 && L.shoulder.y < 0 && R.shoulder.y < 0);
  }
  assert.ok(near(BODY_TO_ARM * UPPER_ARM, ARM.upper));
});

test('the first-person corrections: the guard\'s fists up, in and never at the eye; the run\'s lifted; the arm keeps its lengths', () => {
  const unit = 0.66;
  // (a tight guard: the fists by his chin)
  const b = body(unit, (p) => {
    p.arms[0].fwd = p.arms[1].fwd = 0.45;
    p.arms[0].bend = p.arms[1].bend = 2.4;
  });
  const eye = eyeFrame(b.head, V(0, 0, 1), unit, new THREE.Matrix4());
  for (const j of [b.L, b.R]) {
    const raw = bodyArm(j, eye, unit, newLaidArm());
    const fixed = bodyArm(j, eye, unit, newLaidArm(), 1);
    assert.ok(fixed.wrist.y > raw.wrist.y, 'up');
    assert.ok(Math.abs(fixed.wrist.x) < Math.abs(raw.wrist.x), 'in');
    assert.ok(fixed.wrist.z <= -FP_FIX.near + 1e-3, 'not at the eye');
    assert.ok(near(fixed.shoulder.distanceTo(fixed.elbow), ARM.upper, 1e-4) && near(fixed.elbow.distanceTo(fixed.wrist), ARM.fore, 1e-4));
    // (none of it with the guard down)
    assert.ok(bodyArm(j, eye, unit, newLaidArm(), 0).wrist.distanceTo(raw.wrist) < 1e-9);
    const run = bodyArm(j, eye, unit, newLaidArm(), 0, 1);
    assert.ok(run.wrist.y > raw.wrist.y && FP_RUN.lift > 0, 'the run lifts his swing');
  }
});
