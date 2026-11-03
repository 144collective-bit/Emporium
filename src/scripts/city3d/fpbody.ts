/*
 * His own body from the eye, on foot (docs/firstperson-plan.md Phase 1): what
 * walk mode and the lab's Eye camera lay on the figure in first person, the
 * body itself drawn close (fpclose.ts). DOM-free (three's maths only), tested
 * in tests/fpbody.test.ts.
 *
 * - `eyeOf()`: where his eyes are (body.ts `EYE_Y` over the head bone, a
 *   little in front of it) and his up (the neck's), from the posed bones; the
 *   eye rides them, so a crouch, a slide, a peek's lean, a bench and the
 *   capture's own steps move it as they move his head.
 * - `fpArms()`: hands at the edges (the owner's call): his arms eased
 *   forward and a little in, more at a run, and the elbows a little
 *   straighter there (the capture's run already bends them about 1 radian:
 *   bending them more folds the hands back up to the shoulders), so at a run
 *   the hands swing into the bottom of the view at the front of each swing
 *   (measured in the lab: about two frames in five at a run, one in seven at
 *   a sprint, none at a walk, looking level); laid on the bones after
 *   everything else, only when nothing else has his hands, and seen only
 *   from his eyes (and in his shadow).
 * - `nearFor()`: the near plane in first person. It stays the city's 0.5
 *   unless something solid is closer to his eye, when it comes in just short
 *   of it (never under `NEAR.min`), so a wall he stands at is a wall, not a
 *   hole into the room behind; the far city's precision is only spent then.
 * - `reachArm()` and `createFpGuard()` (Phase 2): two-bone IK on the
 *   figure's own bones, and the guard framed for the eye (the fists low in
 *   the view's corners, `GUARD`), its offset carried through every strike,
 *   the block and the kicks, for the street's fists and the ring alike.
 */
import * as THREE from 'three';
import { EYE_Y } from './body';
import type { BoneName } from './skeleton';

/** His eyes in the head bone's frame (his units: times his scale) */
export const EYE_AT = new THREE.Vector3(0, EYE_Y, 0.06);

const v = new THREE.Vector3();
const q = new THREE.Quaternion();
/**
 * Where his eyes are (`eye`), his head bone (`head`) and his up (`up`, the neck's), in the world, from the bones
 * as they're posed (their world matrices must be up to date). `scale` is the figure's.
 */
export function eyeOf(bones: Record<BoneName, THREE.Bone>, scale: number, eye: THREE.Vector3, head: THREE.Vector3, up: THREE.Vector3) {
  const h = bones.head;
  h.getWorldPosition(head);
  h.getWorldQuaternion(q);
  eye.copy(head).add(v.copy(EYE_AT).multiplyScalar(scale).applyQuaternion(q));
  bones.neck.getWorldQuaternion(q);
  up.set(0, 1, 0).applyQuaternion(q);
}

/**
 * Hands at the edges: how far forward the shoulders swing (rad) and how far in; how much more the elbows bend
 * (under 0: straighter); each at a walk, with `...Run` added at a run. `ELBOW_LEAST` is the bend an elbow keeps.
 */
export const ARMS = { flex: 0.22, flexRun: 1.0, inward: 0.1, bend: 0.1, bendRun: -0.5 };
const ELBOW_LEAST = 0.15;

const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);
const across = new THREE.Vector3();
const ahead = new THREE.Vector3();
const axis = new THREE.Vector3();
const pa = new THREE.Vector3();
const pb = new THREE.Vector3();
const pc = new THREE.Vector3();
const pq = new THREE.Quaternion();
const qa = new THREE.Quaternion();
/** Turn `bone` by `angle` about a world axis, in its parent's frame (whatever the pose has turned the parent to) */
function turnAbout(bone: THREE.Bone, worldAxis: THREE.Vector3, angle: number) {
  bone.parent!.getWorldQuaternion(pq);
  axis.copy(worldAxis).applyQuaternion(pq.invert());
  bone.quaternion.premultiply(qa.setFromAxisAngle(axis, angle));
}
/**
 * Lay hands-at-the-edges on the arms (after the pose and the capture have set them this frame): `w` 0..1 how much,
 * `run` 0..1 how much of a run. Each turn is about his chest's own axes (the capture turns the collarbones, so the
 * arms' own frames aren't his forward): the shoulders forward about its side-to-side line, in about its forward
 * line, the elbows bent about the side-to-side line too. The figure faces +z; L is its -x side.
 */
export function fpArms(bones: Record<BoneName, THREE.Bone>, w: number, run: number) {
  if (w <= 1e-4) return;
  const r = Math.max(0, Math.min(1, run));
  const flex = (ARMS.flex + ARMS.flexRun * r) * w;
  const bend = (ARMS.bend + ARMS.bendRun * r) * w;
  bones.chest.getWorldQuaternion(q);
  across.copy(X).applyQuaternion(q);
  ahead.copy(Z).applyQuaternion(q);
  for (const side of [-1, 1] as const) {
    const s = side < 0 ? 'L' : 'R';
    // (forward is a turn about -x: a hanging arm, down -y, swings towards +z; in is towards the middle, +x for L)
    turnAbout(bones[`arm${s}`], across, -flex);
    turnAbout(bones[`arm${s}`], ahead, -side * ARMS.inward * w);
    // (straighter only as far as the elbow is bent: never past straight, never backwards)
    bones[`arm${s}`].getWorldPosition(pa);
    bones[`fore${s}`].getWorldPosition(pb);
    bones[`hand${s}`].getWorldPosition(pc);
    const bent = pb.clone().sub(pa).angleTo(pc.sub(pb));
    turnAbout(bones[`fore${s}`], across, -Math.max(bend, -Math.max(0, bent - ELBOW_LEAST)));
  }
}

/** The near plane in first person: the city's own, and as close as it comes in front of a wall */
export const NEAR = { far: 0.5, min: 0.12, margin: 0.06 };

/** The near plane for an eye `clear` from the nearest solid thing (Infinity: nothing near) */
export function nearFor(clear: number) {
  if (!(clear < NEAR.far + NEAR.margin)) return NEAR.far;
  return Math.max(NEAR.min, Math.min(NEAR.far, clear - NEAR.margin));
}

/** How far a point is from a solid box `[x0, z0, x1, z1, height]` standing on `base` (0 inside it; Infinity over its top) */
export function boxClear(x: number, y: number, z: number, b: ArrayLike<number>, base = 0) {
  if (y > base + b[4]) return Infinity;
  const dx = Math.max(b[0] - x, 0, x - b[2]);
  const dz = Math.max(b[1] - z, 0, z - b[3]);
  return Math.hypot(dx, dz);
}

/* ---------- The guard from the eye (docs/firstperson-plan.md Phase 2) ---------- */

/**
 * Where his fists sit in the guard as he sees them, in his own units (times his scale) from the eye: ahead of
 * it, under it and out to the side. The lead hand (his left) further out and higher, the rear by his chin;
 * both low in the view's corners, clear of the cut round the eye (fpclose.ts `CUT`).
 */
export const GUARD = {
  lead: { fwd: 0.38, down: 0.12, side: 0.09 },
  rear: { fwd: 0.32, down: 0.15, side: 0.12 },
};
/**
 * The block from the eye: both fists up just under the eye and close together, the elbows down, so the view goes
 * on between them (the clip's own block lays the forearms across the face, right against the eye)
 */
export const BLOCK = { fwd: 0.27, down: 0.06, side: 0.075 };

const A = new THREE.Vector3();
const B = new THREE.Vector3();
const C = new THREE.Vector3();
const u1 = new THREE.Vector3();
const u2 = new THREE.Vector3();
const nrm = new THREE.Vector3();
const qq = new THREE.Quaternion();
const pq2 = new THREE.Quaternion();
/** Turn `bone` by the world rotation `q`, in its parent's frame */
function turnWorld(bone: THREE.Bone, q: THREE.Quaternion) {
  bone.parent!.getWorldQuaternion(pq2);
  const inv = pq2.clone().invert();
  bone.quaternion.premultiply(inv.multiply(q).multiply(pq2));
}

/**
 * Two-bone IK on the figure's own bones (world numbers): the hand (`hand`'s origin, the wrist) to `target`, the
 * elbow bent in the arm's own plane and swung towards `pole`; out of reach, the arm points at it straight but
 * for a hair. The hand keeps its turn on the forearm.
 */
export function reachArm(arm: THREE.Bone, fore: THREE.Bone, hand: THREE.Bone, target: THREE.Vector3, pole: THREE.Vector3) {
  arm.getWorldPosition(A);
  fore.getWorldPosition(B);
  hand.getWorldPosition(C);
  const l1 = A.distanceTo(B);
  const l2 = B.distanceTo(C);
  const d = Math.max(Math.abs(l1 - l2) + 1e-4, Math.min((l1 + l2) * 0.999, A.distanceTo(target)));
  // The elbow: the bend between the upper arm's line and the forearm's, to what the reach wants
  u1.copy(B).sub(A).normalize();
  u2.copy(C).sub(B).normalize();
  const bendNow = u1.angleTo(u2);
  const bendWant = Math.PI - Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2))));
  nrm.crossVectors(u1, u2);
  if (nrm.lengthSq() < 1e-8) nrm.crossVectors(u1, pole);
  if (nrm.lengthSq() < 1e-8) nrm.set(1, 0, 0);
  nrm.normalize();
  turnWorld(fore, qq.setFromAxisAngle(nrm, bendWant - bendNow));
  // The shoulder: the wrist onto the line to the target
  hand.getWorldPosition(C);
  turnWorld(arm, qq.setFromUnitVectors(u1.copy(C).sub(A).normalize(), u2.copy(target).sub(A).normalize()));
  // ...and round that line until the elbow is on the pole's side
  fore.getWorldPosition(B);
  const line = u2;
  const e = u1.copy(B).sub(A);
  e.addScaledVector(line, -e.dot(line));
  const p = nrm.copy(pole).addScaledVector(line, -pole.dot(line));
  if (e.lengthSq() > 1e-8 && p.lengthSq() > 1e-8) {
    e.normalize();
    p.normalize();
    const ang = Math.atan2(C.crossVectors(e, p).dot(line), e.dot(p));
    turnWorld(arm, qq.setFromAxisAngle(line, ang));
  }
}

const tgt = new THREE.Vector3();
const right = new THREE.Vector3();
const poleV = new THREE.Vector3();
const shoulder = new THREE.Vector3();
const handAt = new THREE.Vector3();
const UPW = new THREE.Vector3(0, 1, 0);
const knuck = new THREE.Vector3();
const blockAt = new THREE.Vector3();
const inward = new THREE.Vector3();
const xW = new THREE.Vector3();
const yW = new THREE.Vector3();
const zW = new THREE.Vector3();
const fistQ = new THREE.Quaternion();
const basis = new THREE.Matrix4();

/**
 * The guard framed for the eye (the ring's and the street's): the fight's clip poses his arms, then this moves
 * each fist on by an offset learned in the guard (where the clip's guard puts it, to `GUARD`'s spot), so a jab,
 * a hook and the kicks all play from where the guard shows and their reach still reads; a block puts both fists
 * up at `BLOCK`, eased. `w` eases it all in and out (0: the clip as it is); `idle` says the clip is the guard
 * (the offset is learned only then); `block` that he's blocking.
 */
export function createFpGuard() {
  const off = [new THREE.Vector3(), new THREE.Vector3()];
  const known = [false, false];
  const keep = [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()];
  /** How much of the guard's own turn of the fist (knuckles ahead, palm in, thumb up): the guard's, eased; a strike keeps the clip's */
  let fistW = 0;
  /** How far into the block's spot */
  let blockW = 0;
  return {
    reset() {
      known[0] = known[1] = false;
      fistW = 0;
      blockW = 0;
    },
    /** After the figure is posed and placed (world matrices up to date): `fwd` the way he looks, level */
    update(bones: Record<BoneName, THREE.Bone>, scale: number, eye: THREE.Vector3, fwd: THREE.Vector3, w: number, idle: boolean, dt: number, block = false) {
      right.crossVectors(fwd, UPW).normalize();
      const fisted = idle || block;
      fistW += ((fisted ? 1 : 0) - fistW) * (1 - Math.exp(-(fisted ? 10 : 30) * dt));
      blockW += ((block ? 1 : 0) - blockW) * (1 - Math.exp(-(block ? 18 : 12) * dt));
      (['L', 'R'] as const).forEach((s, i) => {
        const arm = bones[`arm${s}`];
        const fore = bones[`fore${s}`];
        const hand = bones[`hand${s}`];
        arm.getWorldPosition(shoulder);
        const side = Math.sign(shoulder.clone().sub(eye).dot(right)) || (i ? 1 : -1);
        // (his left, the lead hand, in an orthodox guard)
        const g = side < 0 ? GUARD.lead : GUARD.rear;
        tgt.copy(eye).addScaledVector(fwd, g.fwd * scale).addScaledVector(UPW, -g.down * scale).addScaledVector(right, side * g.side * scale);
        hand.getWorldPosition(handAt);
        if (idle || !known[i]) {
          const k = known[i] ? 1 - Math.exp(-12 * dt) : 1;
          off[i].lerp(tgt.sub(handAt), k);
          known[i] = true;
        }
        if (w <= 1e-3) return;
        tgt.copy(handAt).add(off[i]);
        if (blockW > 1e-3) {
          blockAt.copy(eye).addScaledVector(fwd, BLOCK.fwd * scale).addScaledVector(UPW, -BLOCK.down * scale).addScaledVector(right, side * BLOCK.side * scale);
          tgt.lerp(blockAt, blockW);
        }
        poleV.copy(UPW).multiplyScalar(-1).addScaledVector(right, side * 0.6);
        keep[0].copy(arm.quaternion);
        keep[1].copy(fore.quaternion);
        keep[2].copy(hand.quaternion);
        reachArm(arm, fore, hand, tgt, poleV);
        // The fist turned as a boxer's in the guard: the knuckles ahead (a touch up), the palm in towards the other
        // fist, the thumb up. A hand's fingers run down its own -y at rest, its palm towards the body (+x for L,
        // the rig's -x side, -x for R); whatever turn the IK left the forearm in, this sets the fist's
        if (fistW > 1e-3) {
          knuck.copy(fwd).addScaledVector(UPW, 0.25).normalize();
          inward.copy(right).multiplyScalar(-side);
          yW.copy(knuck).negate();
          xW.copy(inward).multiplyScalar(s === 'L' ? 1 : -1);
          zW.crossVectors(xW, yW).normalize();
          xW.crossVectors(yW, zW).normalize();
          fistQ.setFromRotationMatrix(basis.makeBasis(xW, yW, zW));
          fore.getWorldQuaternion(pq2);
          const local = pq2.invert().multiply(fistQ);
          hand.quaternion.slerp(local, fistW);
        }
        if (w < 0.999) {
          arm.quaternion.slerpQuaternions(keep[0], arm.quaternion.clone(), w);
          fore.quaternion.slerpQuaternions(keep[1], fore.quaternion.clone(), w);
          hand.quaternion.slerpQuaternions(keep[2], hand.quaternion.clone(), w);
        }
      });
    },
  };
}
export type FpGuard = ReturnType<typeof createFpGuard>;
