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
