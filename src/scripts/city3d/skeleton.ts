/*
 * Degen's skeleton (DOM-free like layout.ts, so the tests read it): the
 * bones of the skinned body, how a Pose turns them, and how each bit of the
 * body and its clothes is weighted to them.
 *
 * - Proportions: about 1.28 tall to the crown at scale 1 (each caller's
 *   scale sets his height in the city), hips at 0.62, knees at 0.33,
 *   shoulders at 0.98, the head on a neck 0.445 over the hips (the brand
 *   art's long neck tube: the crowd's head sits 0.41 up). Real human
 *   proportions at Degen's height, a touch more head than life so the
 *   balaclava, shades and cap read from the street.
 * - The bones: hips, three up the spine (`spine1`, `spine2`, `chest`), the
 *   neck and head; per side a collarbone, upper arm, forearm and hand (at
 *   the wrist, where the old rig's hand socket was) with the index finger,
 *   the other three fingers and the thumb (two joints each); the thigh,
 *   shin, foot (at the ankle) and toes (at the ball of the foot).
 * - The old rig's frames live on as a subset, so every caller keeps
 *   working: `torso` is a frame on the chest where the old one-piece torso
 *   was (at the hips), so the shoulders, `reachArm()` and the guns carried
 *   on it keep their numbers; the hands are the old sockets.
 * - A Pose (the same as ever: arms, legs, lean, twist, head, plus an
 *   optional `grip`) maps onto the bones in `poseSkeleton()`: the spine
 *   shares the lean and twist, the neck takes a share of the head's turn,
 *   the collarbone shrugs when an arm goes over the shoulder, the feet ease
 *   towards level and the toes bend when a foot tips onto them.
 * - The weights (`weigh()`): every vertex of the body takes its own bone
 *   and blends smoothly into the next across each joint (shoulders take a
 *   collarbone share, hips a share of the pelvis), so the knees, elbows,
 *   shoulders, waist and neck bend without seams.
 *
 * x is the figure's right (+x is the rig's right arm, `arms[1]`), y up, z
 * forward; numbers at scale 1.
 */
import * as THREE from 'three';

/* ---------- Proportions ---------- */

export const HIP_Y = 0.62;
/** Hip height (for seating figures on benches and in karts) */
export const HIP_HEIGHT = HIP_Y;
/** The shoulders in the torso frame's space (the old rig's chest, at the hips) */
export const SHOULDER_X = 0.158;
export const SHOULDER_Y = 0.36;
export const UPPER_ARM = 0.215;
/** The middle of the palm in the forearm's space (the hand's centre) */
export const PALM_Y = 0.24;
export const PALM_Z = 0.006;
/** The wrist (the hand bone) in the forearm's space: at the palm, where the hand socket always was */
export const WRIST_Y = -PALM_Y - 0.01;
export const WRIST_Z = 0.015;
export const LEG_X = 0.08;
export const THIGH = 0.29;
/** The ground in the shin's space */
export const SHIN_GROUND = -(HIP_Y - THIGH);
/** The ankle over the ground, and the ball of the foot ahead of it */
export const ANKLE_H = 0.075;
export const BALL_Z = 0.095;
/** The spine's joints over the hips (spine2 and the chest), the neck's and the head's in the torso frame */
export const SPINE: [number, number] = [0.12, 0.24];
export const NECK_Y = 0.38;
export const HEAD_Y = 0.445;
/** The collarbone's root, in from the shoulder */
export const CLAV_X = 0.035;

/* ---------- Poses ---------- */

export interface Limb {
  /** Swing forward (radians); negative swings back */
  fwd: number;
  /** Away from the body, to the side */
  out: number;
  /** Elbow or knee bend */
  bend: number;
  /** Arms only: the upper arm turned about its own length (set by reachArm) */
  twist?: number;
  /** Arms only: the wrist, absent or zero for the hand straight on the forearm (fighting turns the fist) */
  wrist?: Wrist;
  /** Arms only: the collarbone swung forward (radians; negative pulls the shoulder back), set by `reachArm()` and the gun's recoil */
  reach?: number;
  /** Legs only: the foot's pitch at the ankle (positive tips the toes down) and the toes' bend (negative lifts them); left out, the foot eases towards level by itself */
  foot?: number;
  toe?: number;
  /** Legs only, with `foot`: the foot turned about the shin and rolled (so a planted foot keeps its heading whatever the leg does) */
  footYaw?: number;
  footRoll?: number;
}
/** A wrist: `roll` turns the hand about the forearm's length (positive brings the thumb inward on a forward arm, so the palm faces down), `bend` tips it forward at the wrist (negative back) */
export interface Wrist {
  roll: number;
  bend: number;
}
export interface Pose {
  bob: number;
  lean: number;
  twist: number;
  /** Weight shift, a sideways tilt of the hips */
  side: number;
  headYaw: number;
  headPitch: number;
  /** The head tilted sideways (+ towards his right), on top of what the hips' tilt gives it (a cheek on a rifle's stock) */
  headRoll?: number;
  arms: [Limb, Limb];
  legs: [Limb, Limb];
  /**
   * How closed each hand is (arms[0]'s, arms[1]'s): 0 open and relaxed, 1 a
   * fist. Left out, the figure's own (fists for fighters, a hold on what's
   * in the hand, else relaxed). Read once by `update()` and cleared, so set
   * it every frame you want it (holding a gun).
   */
  grip?: [number, number];
  /** The hips moved sideways (+x), over the foot taking the weight (locomotion.ts) */
  sway?: number;
  /** The pelvis turned about the spine (positive brings the -x hip forward); the spine's `twist` is on top of it */
  turn?: number;
}

export const newPose = (): Pose => ({
  bob: 0,
  lean: 0,
  twist: 0,
  side: 0,
  headYaw: 0,
  headPitch: 0,
  arms: [
    { fwd: 0, out: 0.08, bend: 0.15 },
    { fwd: 0, out: 0.08, bend: 0.15 },
  ],
  legs: [
    { fwd: 0, out: 0.02, bend: 0.04 },
    { fwd: 0, out: 0.02, bend: 0.04 },
  ],
});

/* ---------- The bones ---------- */

type Side = 'L' | 'R';
type Sided = 'clav' | 'arm' | 'fore' | 'hand' | 'leg' | 'shin' | 'foot' | 'toe' | 'idx1' | 'idx2' | 'fin1' | 'fin2' | 'thb1' | 'thb2';
export type BoneName = 'hips' | 'spine1' | 'spine2' | 'chest' | 'neck' | 'head' | `${Sided}${Side}`;

const SIDED: Sided[] = ['clav', 'arm', 'fore', 'hand', 'leg', 'shin', 'foot', 'toe', 'idx1', 'idx2', 'fin1', 'fin2', 'thb1', 'thb2'];
/** Every bone, in the order of the skin's bone indices */
export const BONES: BoneName[] = ['hips', 'spine1', 'spine2', 'chest', 'neck', 'head', ...SIDED.flatMap((b) => [`${b}L`, `${b}R`] as BoneName[])];
export const BONE_INDEX = Object.fromEntries(BONES.map((b, i) => [b, i])) as Record<BoneName, number>;

/** The hand's own numbers: the knuckles' line, the fingers' joints, the thumb's root (`x` towards the palm) */
// (a hand about a tenth of his height, wrist to fingertip, as a person's: the fingers were short and
// the palm a thick block, so the hand read as a mitten)
export const HAND = {
  knuckleY: -0.022,
  /** Index, middle, ring and little finger across the hand (z, front to back), their radii and lengths */
  fingers: [
    { z: 0.019, r: 0.0073, len: 0.051 },
    { z: 0.006, r: 0.0076, len: 0.056 },
    { z: -0.007, r: 0.0071, len: 0.052 },
    { z: -0.019, r: 0.0063, len: 0.042 },
  ],
  /** The first finger joint, as a share of the finger's length */
  mid: 0.56,
  thumb: { x: 0.007, y: 0.012, z: 0.029, r: 0.0088, len: 0.05, mid: 0.52 },
};
/** The thumb's turn at rest (on the palm side, pointing down and forward): x, then z towards the palm (times -side) */
export const THUMB_REST = { x: -0.62, z: 0.3 };

/** The old rig's frames: where the clothes are drawn, each now on a bone (or `torso`, the frame on the chest) */
export type Joint = 'pelvis' | 'torso' | 'head' | 'armL' | 'armR' | 'foreL' | 'foreR' | 'legL' | 'legR' | 'shinL' | 'shinR' | 'wristL' | 'wristR' | 'handL' | 'handR';

export interface Skeleton {
  root: THREE.Object3D;
  bones: Record<BoneName, THREE.Bone>;
  /** In BONES order */
  list: THREE.Bone[];
  /** The old rig's frames */
  j: Record<Joint, THREE.Object3D>;
  /** The torso frame: on the chest, where the old one-piece torso was at rest (the hips) */
  torso: THREE.Object3D;
  /** Bones with a turn at rest (the thumbs): a pose turns them on top of it */
  rest: Map<THREE.Bone, THREE.Quaternion>;
}

export function makeSkeleton(): Skeleton {
  const root = new THREE.Object3D();
  const bones = {} as Record<BoneName, THREE.Bone>;
  const bone = (name: BoneName, parent: THREE.Object3D, x: number, y: number, z = 0) => {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x, y, z);
    parent.add(b);
    bones[name] = b;
    return b;
  };
  const hips = bone('hips', root, 0, HIP_Y);
  const s1 = bone('spine1', hips, 0, 0);
  const s2 = bone('spine2', s1, 0, SPINE[0]);
  const chest = bone('chest', s2, 0, SPINE[1] - SPINE[0]);
  const torso = new THREE.Object3D();
  torso.position.set(0, -SPINE[1], 0);
  chest.add(torso);
  const neck = bone('neck', chest, 0, NECK_Y - SPINE[1]);
  bone('head', neck, 0, HEAD_Y - NECK_Y);
  const rest = new Map<THREE.Bone, THREE.Quaternion>();
  for (const [S, s] of [
    ['L', -1],
    ['R', 1],
  ] as const) {
    const clav = bone(`clav${S}`, chest, s * CLAV_X, SHOULDER_Y - SPINE[1]);
    const arm = bone(`arm${S}`, clav, s * (SHOULDER_X - CLAV_X), 0);
    const fore = bone(`fore${S}`, arm, 0, -UPPER_ARM);
    const hand = bone(`hand${S}`, fore, 0, WRIST_Y, WRIST_Z);
    // The roll is about the forearm's length, then the bend about the rolled wrist
    hand.rotation.order = 'YXZ';
    const { knuckleY, fingers, mid, thumb } = HAND;
    const idx = bone(`idx1${S}`, hand, 0, knuckleY, fingers[0].z);
    bone(`idx2${S}`, idx, 0, -fingers[0].len * mid);
    const fin = bone(`fin1${S}`, hand, 0, knuckleY, fingers[1].z);
    bone(`fin2${S}`, fin, 0, -fingers[1].len * mid);
    // The thumb sits on the palm side: -x for the right hand, +x for the left
    const thb = bone(`thb1${S}`, hand, -s * thumb.x, thumb.y, thumb.z);
    thb.quaternion.setFromEuler(new THREE.Euler(THUMB_REST.x, 0, -s * THUMB_REST.z));
    rest.set(thb, thb.quaternion.clone());
    bone(`thb2${S}`, thb, 0, -thumb.len * thumb.mid);
    const leg = bone(`leg${S}`, hips, s * LEG_X, 0);
    const shin = bone(`shin${S}`, leg, 0, -THIGH);
    const foot = bone(`foot${S}`, shin, 0, SHIN_GROUND + ANKLE_H);
    bone(`toe${S}`, foot, 0, -ANKLE_H, BALL_Z);
  }
  const b = bones;
  return {
    root,
    bones,
    list: BONES.map((n) => bones[n]),
    torso,
    rest,
    j: {
      pelvis: b.hips,
      torso,
      head: b.head,
      armL: b.armL,
      armR: b.armR,
      foreL: b.foreL,
      foreR: b.foreR,
      wristL: b.handL,
      wristR: b.handR,
      handL: b.handL,
      handR: b.handR,
      legL: b.legL,
      legR: b.legR,
      shinL: b.shinL,
      shinR: b.shinR,
    },
  };
}

/** How the spine shares the lean, twist and the hips' counter-tilt (spine1, spine2, chest) */
export const SPINE_SHARE = [0.3, 0.35, 0.35];
/** How much of the head's turn the neck takes */
export const NECK_SHARE = 0.35;
/** An arm raised past this (radians from hanging down) starts lifting its collarbone, by this much of the extra */
const SHRUG_FROM = 1.65;
const SHRUG = 0.35;
/** The feet ease this much of the way to level (the rest of the tip stays with the shin), and no further than this */
const FOOT_LEVEL = 0.55;
const FOOT_MAX = 0.5;

const qa = new THREE.Quaternion();
const qc = new THREE.Quaternion();
const ea = new THREE.Euler();
const down = new THREE.Vector3();
const Z = new THREE.Vector3(0, 0, 1);

/** Pose the skeleton. `grip` is each hand's closing (0 open, 1 a fist). */
export function poseSkeleton(sk: Skeleton, p: Pose, grip: [number, number] = [0.2, 0.2]) {
  const b = sk.bones;
  b.hips.position.set(p.sway ?? 0, HIP_Y + p.bob, 0);
  b.hips.rotation.set(0, p.turn ?? 0, p.side);
  const spine = [b.spine1, b.spine2, b.chest];
  for (let i = 0; i < 3; i++) {
    const k = SPINE_SHARE[i];
    spine[i].rotation.set(p.lean * k, p.twist * k, -p.side * 0.6 * k);
  }
  const hx = -p.headPitch - p.lean * 0.6;
  const hy = p.headYaw - p.twist * 0.8;
  const hz = p.side * 0.4 + (p.headRoll ?? 0);
  b.neck.rotation.set(hx * NECK_SHARE, hy * NECK_SHARE, hz * NECK_SHARE);
  b.head.rotation.set(hx * (1 - NECK_SHARE), hy * (1 - NECK_SHARE), hz * (1 - NECK_SHARE));
  for (let i = 0; i < 2; i++) {
    const S = i === 0 ? 'L' : 'R';
    const s = i === 0 ? -1 : 1;
    const a = p.arms[i];
    // The arm's turn, and the collarbone under it: shrugging when the arm goes over the shoulder,
    // swinging forward when a hand reaches out (`reach`)
    clavicle(a, s, qc);
    qa.setFromEuler(ea.set(-a.fwd, a.twist ?? 0, s * a.out));
    b[`clav${S}`].quaternion.copy(qc);
    // The arm keeps its turn in the chest: take the shrug back out of it
    b[`arm${S}`].quaternion.copy(qc.invert()).multiply(qa);
    b[`fore${S}`].rotation.set(-a.bend, 0, 0);
    const w = a.wrist;
    b[`hand${S}`].rotation.set(w ? -w.bend : 0, w ? w.roll : 0, 0, 'YXZ');
    // Fingers curl towards the palm (the -x side of the right hand, +x of the left)
    const g = THREE.MathUtils.clamp(grip[i], 0, 1);
    b[`idx1${S}`].rotation.set(0, 0, -s * (0.1 + 1.45 * g));
    b[`idx2${S}`].rotation.set(0, 0, -s * (0.16 + 1.6 * g));
    b[`fin1${S}`].rotation.set(0, 0, -s * (0.18 + 1.45 * g));
    b[`fin2${S}`].rotation.set(0, 0, -s * (0.24 + 1.6 * g));
    // The thumb folds in across the fingers
    const thb = b[`thb1${S}`];
    thb.quaternion.copy(sk.rest.get(thb)!).multiply(qa.setFromEuler(ea.set(1.15 * g, 0, -s * 0.5 * g)));
    b[`thb2${S}`].rotation.set(0.15 + 0.9 * g, 0, -s * 0.2 * g);

    const l = p.legs[i];
    b[`leg${S}`].rotation.set(-l.fwd, 0, s * l.out - p.side);
    b[`shin${S}`].rotation.set(l.bend, 0, 0);
    if (l.foot !== undefined) {
      // Placed by the pose (the walk's planted feet)
      b[`foot${S}`].rotation.set(l.foot, l.footYaw ?? 0, l.footRoll ?? 0, 'YXZ');
      b[`toe${S}`].rotation.set(l.toe ?? 0, 0, 0);
      continue;
    }
    // The foot eases towards level; if it still tips forward onto its toes, the toes bend back
    const tip = l.fwd - l.bend;
    const foot = THREE.MathUtils.clamp(tip * FOOT_LEVEL, -FOOT_MAX, FOOT_MAX);
    b[`foot${S}`].rotation.set(foot, 0, 0, 'YXZ');
    const toesDown = foot - tip;
    b[`toe${S}`].rotation.set(-Math.min(0.6, Math.max(0, toesDown)) * 0.9, 0, 0);
  }
}

const Y = new THREE.Vector3(0, 1, 0);
const qr = new THREE.Quaternion();
/** The collarbone's turn for an arm (side `s`): the shrug its raise calls for, then its forward reach */
function clavicle(a: Limb, s: number, out: THREE.Quaternion) {
  qa.setFromEuler(ea.set(-a.fwd, a.twist ?? 0, s * a.out));
  down.set(0, -1, 0).applyQuaternion(qa);
  const raise = Math.min(0.45, Math.max(0, Math.acos(THREE.MathUtils.clamp(-down.y, -1, 1)) - SHRUG_FROM) * SHRUG);
  out.setFromAxisAngle(Z, s * raise);
  if (a.reach) out.multiply(qr.setFromAxisAngle(Y, -s * a.reach));
  return out;
}
/** The most the collarbone swings forward to reach (radians), and about how much further that puts the hand */
export const CLAV_REACH = 0.32;
export const REACH_GAIN = (SHOULDER_X - CLAV_X) * Math.sin(CLAV_REACH);
const qs = new THREE.Quaternion();
/** Where arm `i`'s shoulder is in the torso frame, with its collarbone turned as the limb says */
export function shoulderAt(i: 0 | 1, a: Limb, out: THREE.Vector3) {
  const s = i === 0 ? -1 : 1;
  clavicle(a, s, qs);
  return out.set(s * (SHOULDER_X - CLAV_X), 0, 0).applyQuaternion(qs).add(tv.set(s * CLAV_X, SHOULDER_Y, 0));
}
const tv = new THREE.Vector3();

let scratch: Skeleton | null = null;
/** The torso frame in the figure's own space for a pose (where `reachArm()` targets live): for callers that place hands before posing */
export function torsoFrame(p: Pose, out: THREE.Matrix4) {
  scratch ??= makeSkeleton();
  poseSkeleton(scratch, p);
  scratch.root.updateMatrixWorld(true);
  return out.copy(scratch.torso.matrixWorld);
}

/* ---------- Reaching (hands on a gun, on a wheel) ---------- */

const PALM_R = Math.hypot(PALM_Y, PALM_Z);
const PALM_TILT = Math.atan2(PALM_Z, PALM_Y);
/** Shoulders in the torso frame (arms[0] is the rig's -x arm, arms[1] the +x one) */
export const SHOULDERS = [new THREE.Vector3(-SHOULDER_X, SHOULDER_Y, 0), new THREE.Vector3(SHOULDER_X, SHOULDER_Y, 0)] as const;

/** How far a palm can be from its shoulder */
export const ARM_REACH = UPPER_ARM + PALM_R;

/** Distance from arm `i`'s shoulder to a point in the torso frame */
export const shoulderTo = (i: 0 | 1, at: THREE.Vector3) => SHOULDERS[i].distanceTo(at);

const rN = new THREE.Vector3();
const rM = new THREE.Vector3();
const rE = new THREE.Vector3();
const rX = new THREE.Vector3();
const rY = new THREE.Vector3();
const rZ = new THREE.Vector3();
const rMat = new THREE.Matrix4();
const rEuler = new THREE.Euler();

/**
 * Two-bone reach: swing, turn and bend arm `i` so the middle of its palm
 * lands on `target` (in the torso frame). The elbow hangs down, a little
 * out and back, like holding a gun. Out of reach, the arm points at it fully
 * stretched.
 */
export function reachArm(p: Pose, i: 0 | 1, target: THREE.Vector3, reach?: number) {
  const l = p.arms[i];
  // The collarbone swings forward when the hand is near the end of the arm's reach (or as asked)
  l.reach = reach ?? CLAV_REACH * THREE.MathUtils.clamp((SHOULDERS[i].distanceTo(target) - (ARM_REACH - 0.06)) / 0.08, 0, 1);
  // Twice: the arm's new angle can change the collarbone's shrug, which moves the shoulder
  for (let k = 0; k < 2; k++) solveArm(p, i, target, shoulderAt(i, l, rS));
}
const rS = new THREE.Vector3();
function solveArm(p: Pose, i: 0 | 1, target: THREE.Vector3, S: THREE.Vector3) {
  const s = i === 0 ? -1 : 1;
  rN.subVectors(target, S);
  const len = rN.length() || 1e-6;
  rN.divideScalar(len);
  const d = THREE.MathUtils.clamp(len, Math.abs(UPPER_ARM - PALM_R) + 0.03, ARM_REACH - 0.002);
  // The triangle shoulder, elbow, palm: the elbow's bend and the angle at the shoulder
  const cosElbow = THREE.MathUtils.clamp((UPPER_ARM * UPPER_ARM + PALM_R * PALM_R - d * d) / (2 * UPPER_ARM * PALM_R), -1, 1);
  const bend = Math.max(0, Math.PI - Math.acos(cosElbow) - PALM_TILT);
  const cosShoulder = THREE.MathUtils.clamp((UPPER_ARM * UPPER_ARM + d * d - PALM_R * PALM_R) / (2 * UPPER_ARM * d), -1, 1);
  // Where the elbow goes: off the shoulder-to-hand line, towards down, out and back
  rM.set(s * 0.45, -1, -0.35).normalize();
  rM.addScaledVector(rN, -rM.dot(rN));
  if (rM.lengthSq() < 1e-6) rM.set(0, 0, -1).addScaledVector(rN, -rN.z);
  rM.normalize();
  rE.copy(S)
    .addScaledVector(rN, UPPER_ARM * cosShoulder)
    .addScaledVector(rM, UPPER_ARM * Math.sqrt(1 - cosShoulder * cosShoulder));
  // The upper arm's frame: +y up the arm, +z the way the forearm bends
  rY.subVectors(S, rE).normalize();
  rZ.copy(S).addScaledVector(rN, d).sub(rE);
  rZ.addScaledVector(rY, -rZ.dot(rY)).normalize();
  rX.crossVectors(rY, rZ);
  rEuler.setFromRotationMatrix(rMat.makeBasis(rX, rY, rZ), 'XYZ');
  const l = p.arms[i];
  l.fwd = -rEuler.x;
  l.twist = rEuler.y;
  l.out = s * rEuler.z;
  l.bend = bend;
}

/* ---------- Skin weights ---------- */

/** A smooth 0..1 step from `a` to `b` (either way round) */
export const step = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Up to four bones and their weights, summing to 1 */
export type Influence = [BoneName, number][];

/** What a piece of the body is, for weighting: where it's drawn (an old rig frame), or a part with rules of its own */
export type Region = Joint | 'shoe';

/** Where the joints are at rest, in the figure's space */
export const REST = {
  shoulderY: HIP_Y + SHOULDER_Y,
  elbowY: HIP_Y + SHOULDER_Y - UPPER_ARM,
  kneeY: HIP_Y - THIGH,
  ankleY: ANKLE_H,
  spine: [HIP_Y, HIP_Y + SPINE[0], HIP_Y + SPINE[1]],
  neckY: HIP_Y + NECK_Y,
  headY: HIP_Y + HEAD_Y,
};

const norm = (list: Influence): Influence => {
  const kept = list.filter(([, w]) => w > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const sum = kept.reduce((t, [, w]) => t + w, 0) || 1;
  return kept.map(([n, w]) => [n, w / sum]);
};

/** A little under every top's hem (the puffer's and the varsity's, the longest, end at 0.52) the legs start taking over the trunk's weights */
export const HEM_Y = HIP_Y - 0.105;
/** ...and from here down everything is the legs' (docs/clothing-plan.md) */
export const LEG_FREE = HIP_Y - 0.17;

/**
 * The trunk's weights, from the neck down to the tops of the thighs: one
 * field over the body by where a point is, whatever it's part of, so every
 * layer there (the shirt, a jacket over it, the trousers under its hem)
 * moves as one and none comes through another. Up the spine the waist, the
 * middle of the back, the chest; below the waist partly the hips and over
 * each thigh some of the way the leg, all of it under the hems.
 */
function trunk(x: number, y: number): Influence {
  const ax = Math.abs(x);
  const S: Side = x < 0 ? 'L' : 'R';
  const [s1, , ch] = REST.spine;
  const a = step(s1 + SPINE[0] - 0.05, s1 + SPINE[0] + 0.05, y);
  const b = step(ch - 0.05, ch + 0.05, y);
  const low = step(s1 + 0.12, s1 - 0.08, y);
  // Under the hems the legs take over. All the way across: a share that changed across the body
  // would bend each layer by where its own vertices happen to be, and one would come through another
  const under = step(HEM_Y, LEG_FREE, y);
  const thigh = low * (0.5 + 0.5 * under);
  const hip = 0.3 * low * (1 - under);
  // Which leg: shared across the middle, wider than the space between any layer's vertices so every
  // layer bends the same between them, and under the hems each leg's own (as from LEG_FREE down)
  const r = step(-0.05, 0.05, x) * (1 - under) + step(-0.005, 0.005, x) * under;
  // The shoulders: a share for the collarbone, and at the very edge one for the arm
  const top = step(REST.shoulderY - 0.09, REST.shoulderY - 0.02, y);
  const clav = 0.6 * step(0.085, 0.145, ax) * top;
  const arm = 0.35 * step(0.14, 0.175, ax) * top;
  const body = 1 - clav - arm;
  return norm([
    ['legL', thigh * (1 - r)],
    ['legR', thigh * r],
    ['hips', hip * (1 - thigh) * body],
    ['spine1', (1 - a) * (1 - hip) * (1 - thigh) * body],
    ['spine2', a * (1 - b) * body],
    ['chest', a * b * body],
    [`clav${S}`, clav],
    [`arm${S}`, arm],
  ]);
}

/**
 * The bones a point of the body moves with, by what it's part of (`region`)
 * and where it is at rest (x, y, z in the figure's space). Across each joint
 * the weight passes smoothly from one bone to the next; over the trunk
 * (`trunk()`) by where it is alone.
 */
export function weigh(region: Region, x: number, y: number, z: number): Influence {
  const S: Side = x < 0 ? 'L' : 'R';
  switch (region) {
    case 'torso':
      return trunk(x, y);
    case 'pelvis':
    case 'legL':
    case 'legR':
    case 'shinL':
    case 'shinR': {
      if (y > LEG_FREE) return trunk(x, y);
      // (the trousers are one piece on the pelvis: each leg by its side)
      const s = region === 'pelvis' ? S : region.endsWith('L') ? 'L' : 'R';
      const shin = step(THIGH - 0.03, THIGH + 0.03, HIP_Y - y);
      return norm([
        [`leg${s}`, 1 - shin],
        [`shin${s}`, shin],
      ]);
    }
    case 'armL':
    case 'armR':
    case 'foreL':
    case 'foreR': {
      const s = region.endsWith('L') ? 'L' : 'R';
      // How far down the arm from the shoulder
      const d = REST.shoulderY - y;
      const clav = 0.6 * step(0.03, -0.03, d);
      const fore = step(UPPER_ARM - 0.028, UPPER_ARM + 0.028, d);
      return norm([
        [`clav${s}`, clav],
        [`arm${s}`, 1 - clav - fore],
        [`fore${s}`, fore],
      ]);
    }
    case 'wristL':
    case 'wristR':
    case 'handL':
    case 'handR': {
      const s = region.endsWith('L') ? 'L' : 'R';
      // The wrist's top tucks into the sleeve with the forearm
      const wristY = REST.shoulderY - UPPER_ARM + WRIST_Y;
      const fore = 0.5 * step(wristY + 0.035, wristY + 0.065, y);
      return norm([
        [`hand${s}`, 1 - fore],
        [`fore${s}`, fore],
      ]);
    }
    case 'shoe': {
      // On the foot; ahead of the ball of the foot the toes; the top of a boot with the shin
      const toe = step(BALL_Z - 0.025, BALL_Z + 0.02, z);
      const shin = 0.8 * step(ANKLE_H + 0.01, ANKLE_H + 0.065, y);
      return norm([
        [`foot${S}`, (1 - toe) * (1 - shin)],
        [`toe${S}`, toe * (1 - shin)],
        [`shin${S}`, shin],
      ]);
    }
    case 'head': {
      // Up the neck: the chest under the collar, the neck, then the head
      const h = y - REST.headY;
      const t1 = step(-0.065, -0.035, h);
      const t2 = step(-0.01, 0.03, h);
      return norm([
        ['chest', 1 - t1],
        ['neck', t1 * (1 - t2)],
        ['head', t1 * t2],
      ]);
    }
  }
}

/**
 * A finger's weights along its length `d` from the knuckle (negative: still
 * in the hand): the hand, the first bone, then past the middle joint at `at`
 * the second.
 */
export function fingerWeigh(hand: BoneName, first: BoneName, second: BoneName, d: number, at: number): Influence {
  const inHand = step(0.004, -0.004, d);
  const tip = step(at - 0.005, at + 0.005, d);
  return norm([
    [hand, inHand],
    [first, (1 - inHand) * (1 - tip)],
    [second, (1 - inHand) * tip],
  ]);
}
