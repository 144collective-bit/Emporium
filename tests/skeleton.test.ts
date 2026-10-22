// Degen's skinned body (character Phase 1): the skeleton's proportions (skeleton.ts), the old rig's
// frames kept for every caller (the torso frame, the hand sockets, reachArm on the guns' and the
// kart wheel's grips), how a Pose turns the bones (spine, neck, collarbone shrug, feet, fingers),
// the skin weights across every joint, and the head and hands (body.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  ANKLE_H,
  ARM_REACH,
  BONES,
  HEAD_Y,
  HIP_Y,
  PALM_Y,
  PALM_Z,
  REACH_GAIN,
  REST,
  SHIN_GROUND,
  SHOULDERS,
  THIGH,
  fingerWeigh,
  makeSkeleton,
  newPose,
  poseSkeleton,
  reachArm,
  torsoFrame,
  weigh,
  type Influence,
  type Region,
} from '../src/scripts/city3d/skeleton';
import { EYE_Y, HEAD_BOTTOM, HEAD_ROWS, HEAD_TOP, handParts, headFront, headGeometry } from '../src/scripts/city3d/body';

const world = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

test('the bones: every one named once, at human proportions for Degen\'s height', () => {
  const sk = makeSkeleton();
  assert.equal(new Set(BONES).size, BONES.length);
  assert.equal(BONES.length, 34);
  for (const b of BONES) assert.equal(sk.bones[b].name, b);
  sk.root.updateMatrixWorld(true);
  const b = sk.bones;
  assert.ok(near(world(b.hips).y, HIP_Y));
  assert.ok(near(world(b.shinL).y, HIP_Y - THIGH), 'knees');
  assert.ok(near(world(b.footR).y, ANKLE_H), 'ankles');
  assert.ok(near(world(b.toeR).y, 0), 'the ball of the foot on the ground');
  assert.ok(near(SHIN_GROUND, -(HIP_Y - THIGH)), 'the shoes stand on the ground');
  assert.ok(near(world(b.armR).y, REST.shoulderY) && near(world(b.armR).x, SHOULDERS[1].x), 'shoulders where the old rig had them');
  assert.ok(near(world(b.head).y, HIP_Y + HEAD_Y));
  // Left is -x, right +x, all the way down
  for (const n of ['clav', 'arm', 'fore', 'hand', 'leg', 'shin', 'foot', 'toe'] as const) assert.ok(world(b[`${n}L`]).x < 0 && world(b[`${n}R`]).x > 0, n);
  // About 1.3 to the crown: the eyes under the first-person camera (1.2 at scale 1), the crown under 1.31
  const crown = HIP_Y + HEAD_Y + HEAD_TOP;
  assert.ok(crown > 1.25 && crown < 1.31, `crown ${crown}`);
  const eyes = HIP_Y + HEAD_Y + EYE_Y;
  assert.ok(eyes > 1.15 && eyes < 1.2, `eyes ${eyes}`);
});

test('the old frames carry on: the torso frame sits where the old torso was, the hands at the sockets', () => {
  const sk = makeSkeleton();
  sk.root.updateMatrixWorld(true);
  const m = sk.torso.matrixWorld;
  assert.ok(m.equals(new THREE.Matrix4().makeTranslation(0, HIP_Y, 0)), 'at rest the torso frame is at the hips, unturned');
  // Old frames the clothes are drawn in are all at rest at their old places
  const at = (o: THREE.Object3D) => world(o).toArray().map((v) => +v.toFixed(5));
  assert.deepEqual(at(sk.j.handR), [0.158, HIP_Y + 0.36 - 0.215 - 0.25, 0.015]);
  assert.deepEqual(at(sk.j.shinL), [-0.08, HIP_Y - THIGH, 0]);
  // torsoFrame() (for callers that place hands before posing) is the posed skeleton's torso frame
  const p = newPose();
  Object.assign(p, { bob: -0.03, lean: 0.2, twist: -0.5, side: 0.06 });
  poseSkeleton(sk, p);
  sk.root.updateMatrixWorld(true);
  const f = torsoFrame(p, new THREE.Matrix4());
  f.elements.forEach((v, i) => assert.ok(near(v, sk.torso.matrixWorld.elements[i], 1e-9)));
});

test('reachArm puts the palm on the grip, wherever the torso is turned (guns, the kart wheel)', () => {
  const sk = makeSkeleton();
  const palm = new THREE.Vector3();
  const inv = new THREE.Matrix4();
  const targets: THREE.Vector3[] = [];
  // In front of the chest, low and ready to up and aimed, left and right, near and far
  for (const x of [-0.12, -0.02, 0.08])
    for (const y of [0.22, 0.3, 0.38])
      for (const z of [0.16, 0.24, 0.32]) targets.push(new THREE.Vector3(x, y, z));
  for (const [lean, twist] of [
    [0, 0],
    [0.2, -0.6],
    [-0.1, -1.1],
  ]) {
    const p = newPose();
    p.lean = lean;
    p.twist = twist;
    for (const t of targets)
      for (const i of [0, 1] as const) {
        if (SHOULDERS[i].distanceTo(t) > ARM_REACH - 0.01) continue;
        reachArm(p, i, t);
        poseSkeleton(sk, p);
        sk.root.updateMatrixWorld(true);
        const fore = i === 0 ? sk.bones.foreL : sk.bones.foreR;
        palm.set(0, -PALM_Y, PALM_Z).applyMatrix4(fore.matrixWorld).applyMatrix4(inv.copy(sk.torso.matrixWorld).invert());
        assert.ok(palm.distanceTo(t) < 1e-3, `arm ${i} to ${t.toArray()} at lean ${lean} twist ${twist}: off by ${palm.distanceTo(t)}`);
      }
  }
});

test('posing: the spine shares the lean, the collarbone shrugs only over the shoulder, feet ease level, hands close', () => {
  const sk = makeSkeleton();
  const p = newPose();
  // A lean bends the whole spine, and the chest ends up turned by all of it
  p.lean = 0.3;
  poseSkeleton(sk, p);
  sk.root.updateMatrixWorld(true);
  const chest = new THREE.Euler().setFromQuaternion(sk.bones.chest.getWorldQuaternion(new THREE.Quaternion()));
  assert.ok(near(chest.x, 0.3, 1e-6));
  for (const b of ['spine1', 'spine2', 'chest'] as const) assert.ok(sk.bones[b].rotation.x > 0.05 && sk.bones[b].rotation.x < 0.15);
  // Arms down or forward (a gun) leave the collarbone be; a cheer lifts it
  for (const fwd of [0, 0.8, 1.45]) {
    p.arms[1] = { fwd, out: 0.1, bend: 0.2 };
    poseSkeleton(sk, p);
    assert.ok(sk.bones.clavR.quaternion.angleTo(new THREE.Quaternion()) < 1e-9, `fwd ${fwd}`);
  }
  p.arms[1] = { fwd: 2.75, out: 0.32, bend: 0.3 };
  poseSkeleton(sk, p);
  assert.ok(sk.bones.clavR.quaternion.angleTo(new THREE.Quaternion()) > 0.2, 'shrug');
  // The arm still points where the pose says: the shrug is taken back out of it
  sk.root.updateMatrixWorld(true);
  const armDir = new THREE.Vector3(0, -1, 0).applyQuaternion(sk.bones.armR.getWorldQuaternion(new THREE.Quaternion()));
  const want = new THREE.Vector3(0, -1, 0)
    .applyEuler(new THREE.Euler(-2.75, 0, 0.32))
    .applyQuaternion(sk.bones.chest.getWorldQuaternion(new THREE.Quaternion()));
  assert.ok(armDir.distanceTo(want) < 1e-6);
  // A leg swung forward, knee straight: the foot comes back towards level, the toes don't dig in
  p.legs[0] = { fwd: 0.5, out: 0.02, bend: 0.05 };
  poseSkeleton(sk, p);
  sk.root.updateMatrixWorld(true);
  const pitch = (o: THREE.Object3D) => new THREE.Euler().setFromQuaternion(o.getWorldQuaternion(new THREE.Quaternion())).x;
  assert.ok(Math.abs(pitch(sk.bones.footL)) < Math.abs(pitch(sk.bones.shinL)) * 0.6);
  // Fists: the fingertips fold in towards the palm (the left hand's palm faces +x)
  const tip = (g: number) => {
    poseSkeleton(sk, newPose(), [g, g]);
    sk.root.updateMatrixWorld(true);
    return new THREE.Vector3(0, -0.02, 0).applyMatrix4(sk.bones.fin2L.matrixWorld).applyMatrix4(new THREE.Matrix4().copy(sk.bones.handL.matrixWorld).invert());
  };
  const open = tip(0);
  const fist = tip(1);
  assert.ok(open.x > 0 && fist.x > 0, 'curls to the palm side');
  assert.ok(fist.y > open.y + 0.04, 'and right round, up into the palm');
});

const sum = (inf: Influence) => inf.reduce((t, [, w]) => t + w, 0);

test('skin weights: up to four bones summing to one, passing smoothly across every joint', () => {
  const regions: Region[] = ['torso', 'pelvis', 'armL', 'armR', 'foreL', 'foreR', 'handL', 'handR', 'legL', 'legR', 'shinL', 'shinR', 'shoe', 'head'];
  for (const r of regions)
    for (let y = 0; y <= 1.35; y += 0.01)
      for (const x of [-0.17, -0.08, -0.01, 0.01, 0.08, 0.17])
        for (const z of [-0.08, 0, 0.12]) {
          const inf = weigh(r, x, y, z);
          assert.ok(inf.length >= 1 && inf.length <= 4, `${r} at ${x},${y}`);
          assert.ok(near(sum(inf), 1, 1e-6));
          for (const [, w] of inf) assert.ok(w > 0 && w <= 1 + 1e-9);
        }
  // Smooth: down an arm, a leg, the spine and the neck no weight jumps by more than a little per millimetre
  const w = (inf: Influence, b: string) => inf.find(([n]) => n === b)?.[1] ?? 0;
  const smooth = (r: Region, x: number, z: number, y0: number, y1: number, bones: string[]) => {
    let prev = weigh(r, x, y0, z);
    for (let y = y0 + 0.001; y <= y1; y += 0.001) {
      const cur = weigh(r, x, y, z);
      for (const b of bones) assert.ok(Math.abs(w(cur, b) - w(prev, b)) < 0.06, `${r} ${b} jumps at y ${y.toFixed(3)}`);
      prev = cur;
    }
  };
  smooth('armR', 0.158, 0, REST.elbowY - 0.08, REST.shoulderY + 0.05, ['clavR', 'armR', 'foreR']);
  smooth('legL', -0.08, 0, REST.kneeY - 0.08, HIP_Y + 0.05, ['hips', 'legL', 'shinL']);
  smooth('torso', 0.05, 0.08, HIP_Y - 0.1, REST.shoulderY + 0.06, ['legR', 'hips', 'spine1', 'spine2', 'chest']);
  smooth('head', 0, 0, REST.headY - 0.09, REST.headY + 0.1, ['chest', 'neck', 'head']);
  // And each bone takes over where it should: the elbow half and half, knees too, the face all head
  assert.ok(near(w(weigh('armR', 0.158, REST.elbowY, 0), 'foreR'), 0.5, 1e-6));
  assert.ok(near(w(weigh('shinL', -0.08, REST.kneeY, 0), 'shinL'), 0.5, 1e-6));
  assert.equal(w(weigh('head', 0, REST.headY + EYE_Y, 0.1), 'head'), 1);
  assert.equal(w(weigh('torso', 0, REST.spine[2] + 0.08, 0.1), 'chest'), 1);
  // Shoes: the heel on the foot, the toe cap on the toes
  assert.equal(w(weigh('shoe', 0.08, 0.02, -0.05), 'footR'), 1);
  assert.equal(w(weigh('shoe', -0.08, 0.02, 0.16), 'toeL'), 1);
  // Fingers: in the hand, then the first bone, the second past the middle joint
  assert.deepEqual(fingerWeigh('handR', 'idx1R', 'idx2R', -0.01, 0.025), [['handR', 1]]);
  assert.deepEqual(fingerWeigh('handR', 'idx1R', 'idx2R', 0.012, 0.025), [['idx1R', 1]]);
  assert.deepEqual(fingerWeigh('handR', 'idx1R', 'idx2R', 0.04, 0.025), [['idx2R', 1]]);
});

test('the head after the brand art: a tall oval, flat-fronted, with a nose ridge, a chin and the neck tube', () => {
  const g = headGeometry(30, 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.array.length; i++) assert.ok(Number.isFinite(p.array[i]));
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  assert.ok(near(bb.max.y, HEAD_TOP) && near(bb.min.y, HEAD_BOTTOM));
  // Taller than it's wide, deeper than it's wide, narrower at the jaw than at the brow
  const width = bb.max.x - bb.min.x;
  const chin = 0.02;
  assert.ok(HEAD_TOP - chin > width * 1.2, 'a tall oval');
  assert.ok(bb.max.z - bb.min.z > width);
  const hw = (y: number) => HEAD_ROWS.find((r) => r[0] >= y)![1];
  assert.ok(hw(0.045) < hw(0.16) * 0.8, 'the jaw tapers');
  // The nose stands out of the face, the chin juts, the eyes sit back under the brow
  assert.ok(headFront(0, 0.08) > headFront(0.03, 0.08) + 0.012, 'nose ridge');
  assert.ok(headFront(0, 0.03) > headFront(0, 0.0) + 0.02, 'chin over the neck');
  assert.ok(headFront(0.04, 0.163) > headFront(0.04, EYE_Y) + 0.002, 'brow over the eyes');
  // The neck tube runs down into the collar (the collar's top is about 0.015 under the head bone)
  assert.ok(HEAD_BOTTOM < -0.06);
});

test('the hands: palm, wrist, four fingers and a thumb, every vertex weighted, mirrored left and right', () => {
  for (const s of [-1, 1] as const) {
    const parts = handParts(s, 9);
    assert.equal(parts.length, 3 + 4 + 1);
    let tris = 0;
    const used = new Set<string>();
    for (const { geo, skin } of parts) {
      assert.equal(geo.index, null);
      const n = geo.attributes.position.count;
      assert.equal(skin.length, n);
      tris += n / 3;
      for (const inf of skin) {
        assert.ok(near(sum(inf), 1, 1e-6));
        for (const [b] of inf) used.add(b);
      }
    }
    const S = s < 0 ? 'L' : 'R';
    for (const b of ['hand', 'fore', 'idx1', 'idx2', 'fin1', 'fin2', 'thb1', 'thb2']) assert.ok(used.has(`${b}${S}`), `${b}${S}`);
    assert.ok(![...used].some((b) => b.endsWith(S === 'L' ? 'R' : 'L')), 'only its own side');
    // A hand stays cheap: a figure has two
    assert.ok(tris < 1800, `${tris} triangles a hand`);
    // The thumb is on the palm side (-x for the right hand)
    const thumb = parts[parts.length - 1].geo;
    thumb.computeBoundingBox();
    const mid = (thumb.boundingBox!.min.x + thumb.boundingBox!.max.x) / 2;
    assert.ok(mid * s < 0);
  }
  // The head: a few thousand triangles at most
  assert.ok(headGeometry(30, 2).index!.count / 3 < 2400);
});

test('the collarbone brings the shoulder forward for a reach just past the arm (two-handed holds)', () => {
  const sk = makeSkeleton();
  const inv = new THREE.Matrix4();
  for (const i of [0, 1] as const) {
    const s = i === 0 ? -1 : 1;
    // Straight ahead of the shoulder, past the arm's own length but within the collarbone's help
    const t = new THREE.Vector3(s * 0.12, 0.34, ARM_REACH + REACH_GAIN * 0.7 - 0.02);
    assert.ok(SHOULDERS[i].distanceTo(t) > ARM_REACH);
    const p = newPose();
    reachArm(p, i, t);
    assert.ok((p.arms[i].reach ?? 0) > 0.1, 'the collarbone swings forward');
    poseSkeleton(sk, p);
    sk.root.updateMatrixWorld(true);
    const fore = i === 0 ? sk.bones.foreL : sk.bones.foreR;
    const palm = new THREE.Vector3(0, -PALM_Y, PALM_Z).applyMatrix4(fore.matrixWorld).applyMatrix4(inv.copy(sk.torso.matrixWorld).invert());
    assert.ok(palm.distanceTo(t) < 2e-3, `arm ${i}: off by ${palm.distanceTo(t)}`);
    // Close in, it stays back; a given reach pulls it back (recoil)
    const q = newPose();
    reachArm(q, i, new THREE.Vector3(s * 0.05, 0.3, 0.2));
    assert.equal(q.arms[i].reach, 0);
    reachArm(q, i, new THREE.Vector3(s * 0.05, 0.3, 0.2), -0.2);
    assert.equal(q.arms[i].reach, -0.2);
  }
});
