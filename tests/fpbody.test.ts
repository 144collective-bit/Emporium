// His own body from the eye on foot (docs/firstperson-plan.md Phase 1, fpbody.ts): the eye where his eyes are and
// riding his head, the hands at the edges (forward, in, a run more than a walk, nothing when off), the near plane
// brought in only at a wall, and the view kept clean round the eye (fpclose.ts's cut: the whole head and every hat
// gone, the shoulders, the collar's front and the tie kept).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeSkeleton, HEAD_Y, NECK_Y, SHOULDER_X, SHOULDER_Y, BONE_INDEX, BONES } from '../src/scripts/city3d/skeleton';
import { EYE_Y } from '../src/scripts/city3d/body';
import { items, PLAYER, type Outfit } from '../src/scripts/city3d/wardrobe';
import { BLOCK, EYE_AT, GUARD, NEAR, boxClear, createFpGuard, eyeOf, fpArms, nearFor, reachArm } from '../src/scripts/city3d/fpbody';
import { ARM_BONES, CUT, cutAway } from '../src/scripts/city3d/fpclose';

const SCALE = 0.85;
const rig = () => {
  const sk = makeSkeleton();
  sk.root.scale.setScalar(SCALE);
  sk.root.updateMatrixWorld(true);
  return sk;
};
const world = (b: THREE.Object3D) => (b.updateWorldMatrix(true, false), b.getWorldPosition(new THREE.Vector3()));

test('the eye: over the head bone by EYE_Y, a little in front, his up the neck`s; and it rides the head', () => {
  const sk = rig();
  const eye = new THREE.Vector3();
  const head = new THREE.Vector3();
  const up = new THREE.Vector3();
  eyeOf(sk.bones, SCALE, eye, head, up);
  assert.ok(Math.abs(eye.y - head.y - EYE_Y * SCALE) < 1e-6, 'up by EYE_Y');
  assert.ok(Math.abs(eye.z - head.z - EYE_AT.z * SCALE) < 1e-6, 'in front (+z)');
  assert.ok(up.distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-6, 'up');
  // (a lean forward takes the eye forward and down with the head)
  sk.bones.spine1.rotation.x = 0.4;
  sk.root.updateMatrixWorld(true);
  const leant = new THREE.Vector3();
  eyeOf(sk.bones, SCALE, leant, head, up);
  assert.ok(leant.z > eye.z + 0.1 && leant.y < eye.y, `leant: ${leant.toArray().map((v) => v.toFixed(3))}`);
});

test('hands at the edges: nothing when off; forward, in and up when on, more at a run; the same both sides', () => {
  const at = (w: number, run: number) => {
    const sk = rig();
    fpArms(sk.bones, w, run);
    sk.root.updateMatrixWorld(true);
    return { l: world(sk.bones.handL), r: world(sk.bones.handR) };
  };
  const rest = at(0, 0);
  const walk = at(1, 0);
  const run = at(1, 1);
  assert.ok(at(1e-6, 1).l.distanceTo(rest.l) < 1e-6, 'nothing when off');
  for (const s of ['l', 'r'] as const) {
    assert.ok(walk[s].z > rest[s].z + 0.03, `${s} forward at a walk`);
    assert.ok(run[s].z > walk[s].z && run[s].y > walk[s].y, `${s} further forward and up at a run`);
    assert.ok(Math.abs(run[s].x) < Math.abs(rest[s].x), `${s} in towards the middle`);
  }
  assert.ok(Math.abs(run.l.x + run.r.x) < 1e-6 && Math.abs(run.l.z - run.r.z) < 1e-6, 'mirrored');
  // (a run's elbow, already bent as the capture bends it, eased straighter; a straight one never bent backwards)
  const elbow = (pre: number) => {
    const sk = rig();
    sk.bones.foreR.rotation.x = -pre;
    sk.root.updateMatrixWorld(true);
    const ang = () => {
      sk.root.updateMatrixWorld(true);
      const a = world(sk.bones.armR), b = world(sk.bones.foreR), c = world(sk.bones.handR);
      return { bend: b.clone().sub(a).angleTo(c.clone().sub(b)), hand: c, elbow: b };
    };
    const before = ang().bend;
    fpArms(sk.bones, 1, 1);
    return { before, ...ang() };
  };
  const bent = elbow(1.0);
  assert.ok(bent.bend < bent.before - 0.3 && bent.bend > 0.15, `a run's elbow eased straighter: ${bent.before.toFixed(2)} to ${bent.bend.toFixed(2)}`);
  const straight = elbow(0);
  assert.ok(straight.bend < 0.2 && straight.hand.z >= straight.elbow.z - 1e-6, `a straight arm stays straight, the hand ahead: ${straight.bend.toFixed(2)}`);
  // (from the eye, looking straight ahead, a run brings the hands a good way towards the bottom of the view)
  const sk = rig();
  const eye = new THREE.Vector3();
  eyeOf(sk.bones, SCALE, eye, new THREE.Vector3(), new THREE.Vector3());
  const below = (h: THREE.Vector3) => Math.atan2(eye.y - h.y, h.z - eye.z);
  assert.ok(below(rest.r) - below(run.r) > THREE.MathUtils.degToRad(15), `${THREE.MathUtils.radToDeg(below(rest.r)).toFixed(0)}° to ${THREE.MathUtils.radToDeg(below(run.r)).toFixed(0)}° below the eye`);
});

test('the near plane: the city`s 0.5 unless a wall is closer to the eye, then just short of it, never under its least', () => {
  assert.equal(nearFor(Infinity), NEAR.far);
  assert.equal(nearFor(5), NEAR.far);
  assert.equal(nearFor(NEAR.far + NEAR.margin + 0.01), NEAR.far);
  assert.ok(Math.abs(nearFor(0.3) - (0.3 - NEAR.margin)) < 1e-9);
  assert.equal(nearFor(0.05), NEAR.min);
  assert.equal(nearFor(NaN), NEAR.far);
  let prev = 0;
  for (let c = 0; c < 1; c += 0.01) {
    const n = nearFor(c);
    assert.ok(n >= prev && n <= c + NEAR.far, `monotonic at ${c.toFixed(2)}`);
    prev = n;
  }
  const box = [0, 0, 2, 2, 1.5];
  assert.equal(boxClear(1, 1, 1, box), 0, 'inside');
  assert.ok(Math.abs(boxClear(2.3, 1, 1, box) - 0.3) < 1e-9, 'beside');
  assert.ok(Math.abs(boxClear(2.3, 1, 2.4, box) - 0.5) < 1e-9, 'off a corner');
  assert.equal(boxClear(2.3, 1.6, 1, box), Infinity, 'over its top: looking over a low wall');
});

test('the cut: everything worn on his head goes (the head over the collar, the shades, the hood, every hat), at both details', () => {
  const LOOKS: [string, Partial<Outfit>][] = [
    ['as he is', {}],
    ['hood up', { hood: true }],
    ['cap', {}],
    ['cap back', { capBack: true }],
    ['beanie', { beanie: '#3355ff' }],
    ['bucket', { bucket: '#3355ff' }],
    ['crown', { crown: true }],
    ['cowboy', { cowboy: '#a06838' }],
    ['top hat', { tophat: '#222222' }],
    ['halo', { halo: true }],
  ];
  for (const q of [3, 2] as const)
    for (const [name, extra] of LOOKS) {
      const o = { ...PLAYER, ...extra } as Outfit;
      let kept = 0;
      let seen = 0;
      for (const it of items(q, true).filter((i) => i.when(o)))
        for (const pc of it.pieces) {
          if (pc.joint !== 'head' || pc.region || pc.bone) continue;
          const P = pc.geo.getAttribute('position');
          for (let i = 0; i < P.count; i++) {
            const y = P.getY(i);
            // (the neck's tube runs on down inside the collar: that stays, as the collar does)
            if (y <= CUT.low) continue;
            seen++;
            if (!cutAway(y, Math.hypot(P.getX(i), P.getZ(i)))) kept++;
          }
        }
      assert.ok(seen > 100, `${name} (detail ${q}): pieces found`);
      assert.equal(kept, 0, `${name} (detail ${q}): ${kept} points of what's on his head still in view`);
    }
});

test('the cut keeps what`s under the eye and out to the side', () => {
  assert.ok(cutAway(EYE_Y, 0.06), 'the eyes and the shades');
  assert.ok(cutAway(0.2, 0.25), 'a cowboy hat`s brim');
  assert.ok(cutAway(0.35, 0.05), 'a top hat`s crown');
  // (in the torso frame the shoulders, the collar and the knot sit under the head bone)
  assert.ok(!cutAway(SHOULDER_Y - HEAD_Y, SHOULDER_X), 'the shoulders');
  assert.ok(!cutAway(NECK_Y - HEAD_Y - 0.03, 0.07), 'the collar`s front and the knot under the eye');
  assert.ok(!cutAway(-0.2, 0.1), 'the chest');
  assert.ok(!cutAway(0.1, CUT.wide + 0.05), 'a hand raised out to the side');
});

test('with the gun hands up, his arms go from the shoulder down to the fingertips, both sides; the rest stays', () => {
  const set = new Set(ARM_BONES.map((b) => BONE_INDEX[b]));
  for (const b of BONES) {
    const arm = /^(arm|fore|hand|idx|fin|thb)/.test(b);
    assert.equal(set.has(BONE_INDEX[b]), arm, b);
  }
  assert.equal(ARM_BONES.length, 18);
});

test('the arm IK: the wrist onto a target in reach, the elbow towards the pole; out of reach, the arm straight at it', () => {
  for (const side of ['L', 'R'] as const) {
    for (const t of [new THREE.Vector3(0.1, 0.55, 0.2), new THREE.Vector3(-0.05, 0.75, 0.25), new THREE.Vector3(0.2, 0.45, 0.1)]) {
      const sk = rig();
      const sh = world(sk.bones[`arm${side}`]);
      const target = sh.clone().add(t.clone().sub(new THREE.Vector3(0, 0.6, 0)).multiplyScalar(1));
      const pole = new THREE.Vector3(0, -1, 0);
      reachArm(sk.bones[`arm${side}`], sk.bones[`fore${side}`], sk.bones[`hand${side}`], target, pole);
      sk.root.updateMatrixWorld(true);
      const hand = world(sk.bones[`hand${side}`]);
      const reach = sh.distanceTo(world(sk.bones[`fore${side}`])) + world(sk.bones[`fore${side}`]).distanceTo(hand);
      if (sh.distanceTo(target) < reach * 0.98) {
        assert.ok(hand.distanceTo(target) < 0.015, `${side}: ${(hand.distanceTo(target) * 100).toFixed(2)} cm off`);
        // (the elbow under the line from the shoulder to the hand)
        const elbow = world(sk.bones[`fore${side}`]);
        const mid = sh.clone().lerp(hand, 0.5);
        assert.ok(elbow.y <= mid.y + 1e-3, `${side}: the elbow drops`);
      }
    }
    const sk = rig();
    const sh = world(sk.bones[`arm${side}`]);
    const far = sh.clone().add(new THREE.Vector3(0, 0, 3));
    reachArm(sk.bones[`arm${side}`], sk.bones[`fore${side}`], sk.bones[`hand${side}`], far, new THREE.Vector3(0, -1, 0));
    sk.root.updateMatrixWorld(true);
    const dir = world(sk.bones[`hand${side}`]).sub(sh).normalize();
    assert.ok(dir.z > 0.99, `${side}: pointed straight at a target out of reach`);
  }
});

test('the guard from the eye: each fist on its spot (the lead on his left, further out), and nothing at all with it off', () => {
  const sk = rig();
  const eye = new THREE.Vector3();
  eyeOf(sk.bones, SCALE, eye, new THREE.Vector3(), new THREE.Vector3());
  const fwd = new THREE.Vector3(0, 0, 1);
  const before = world(sk.bones.handL);
  const off = createFpGuard();
  off.update(sk.bones, SCALE, eye, fwd, 0, true, 1 / 60);
  sk.root.updateMatrixWorld(true);
  assert.ok(world(sk.bones.handL).distanceTo(before) < 1e-9, 'off: the clip as it is');
  const g = createFpGuard();
  g.update(sk.bones, SCALE, eye, fwd, 1, true, 1 / 60);
  sk.root.updateMatrixWorld(true);
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
  for (const s of ['L', 'R'] as const) {
    const h = world(sk.bones[`hand${s}`]);
    const side = Math.sign(world(sk.bones[`arm${s}`]).sub(eye).dot(right));
    const spot = side < 0 ? GUARD.lead : GUARD.rear;
    const want = eye.clone().addScaledVector(fwd, spot.fwd * SCALE).addScaledVector(new THREE.Vector3(0, 1, 0), -spot.down * SCALE).addScaledVector(right, side * spot.side * SCALE);
    assert.ok(h.distanceTo(want) < 0.015, `${s}: ${(h.distanceTo(want) * 100).toFixed(2)} cm from its spot`);
    // (in the view: ahead, under the eye, within a 70° view's bottom half)
    const below = Math.atan2(eye.y - h.y, h.z - eye.z);
    assert.ok(below > 0.1 && below < THREE.MathUtils.degToRad(33), `${s}: ${THREE.MathUtils.radToDeg(below).toFixed(0)}° under the eye`);
    const hd = world(sk.bones.head);
    assert.ok(!cutAway((h.y - hd.y) / SCALE, Math.hypot(h.x - hd.x, h.z - hd.z) / SCALE), `${s}: the fist isn't cut away`);
  }
  assert.ok(GUARD.lead.fwd > GUARD.rear.fwd && GUARD.lead.down < GUARD.rear.down, 'the lead further out and higher');
});

test('the block from the eye: both fists up just under the eye, close together, either side of the view; eased in', () => {
  const sk = rig();
  const eye = new THREE.Vector3();
  eyeOf(sk.bones, SCALE, eye, new THREE.Vector3(), new THREE.Vector3());
  const fwd = new THREE.Vector3(0, 0, 1);
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
  // (each frame the clip poses the arms afresh: the rest pose stands in for it)
  const rest = Object.values(sk.bones).map((b) => b.quaternion.clone());
  const frame = (g: ReturnType<typeof createFpGuard>, block: boolean) => {
    Object.values(sk.bones).forEach((b, i) => b.quaternion.copy(rest[i]));
    sk.root.updateMatrixWorld(true);
    g.update(sk.bones, SCALE, eye, fwd, 1, false, 1 / 60, block);
    sk.root.updateMatrixWorld(true);
  };
  const g = createFpGuard();
  frame(g, false);
  const guardL = world(sk.bones.handL);
  frame(g, true);
  const want = (side: number) => eye.clone().addScaledVector(fwd, BLOCK.fwd * SCALE).addScaledVector(new THREE.Vector3(0, 1, 0), -BLOCK.down * SCALE).addScaledVector(right, side * BLOCK.side * SCALE);
  const sideL = Math.sign(world(sk.bones.armL).sub(eye).dot(right));
  assert.ok(world(sk.bones.handL).distanceTo(want(sideL)) > 0.01 && world(sk.bones.handL).distanceTo(guardL) > 1e-4, 'eased in, not snapped');
  for (let i = 0; i < 60; i++) frame(g, true);
  for (const s of ['L', 'R'] as const) {
    const h = world(sk.bones[`hand${s}`]);
    const side = Math.sign(world(sk.bones[`arm${s}`]).sub(eye).dot(right));
    assert.ok(h.distanceTo(want(side)) < 0.015, `${s}: ${(h.distanceTo(want(side)) * 100).toFixed(2)} cm from the block's spot`);
    const below = Math.atan2(eye.y - h.y, h.z - eye.z);
    assert.ok(below > 0.05 && below < THREE.MathUtils.degToRad(25), `${s}: ${THREE.MathUtils.radToDeg(below).toFixed(0)}° under the eye`);
    assert.ok(Math.abs(h.clone().sub(eye).dot(right)) > 0.03 * SCALE, `${s}: off the middle, the view between them`);
  }
  assert.ok(BLOCK.down < GUARD.lead.down && BLOCK.fwd < GUARD.rear.fwd, 'higher and nearer than the guard');
  // (the arms are never in the head's cut, fpclose.ts: a block's fists sit inside the hat's reach)
  for (let i = 0; i < 60; i++) frame(g, false);
  assert.ok(world(sk.bones.handL).distanceTo(guardL) < 0.015, 'back on the guard when the block lets go');
});
