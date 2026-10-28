/*
 * The moments' keyed poses (moments.ts has the marks and the state machine;
 * this is what the figure plays, loaded with walk mode's on-foot chunk,
 * onfoot.ts, never in the boot): `momentPose()` keys the door push, the
 * lean on the counter, the sit, getting in and out of a vehicle and the
 * lift on the `Pose` rig, the hands put on the thing by `reachArm()`;
 * `carryPose()` holds the crate in both hands on the walk between a pick
 * and a put, `crateAt()` / `carriedAt()` say where the crate is. DOM-free,
 * tested in tests/moments.test.ts.
 */
import * as THREE from 'three';
import { HIP_HEIGHT, type Pose, reachArm, torsoFrame } from './skeleton';
import { sitPose } from './poses';
import { MOMENT, type Mark, type Moment, type Vehicle, smooth } from './moments';

const mRoot = new THREE.Matrix4();
const mTorso = new THREE.Matrix4();
const qYaw = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);
const vHand = new THREE.Vector3();
const vPos = new THREE.Vector3();
const vScale = new THREE.Vector3();

/** Arm `i` reaches `w` of the way to a world point, from where the pose has it */
function reachTo(p: Pose, i: 0 | 1, wx: number, wy: number, wz: number, w: number) {
  vHand.set(wx, wy, wz).applyMatrix4(mRoot).applyMatrix4(mTorso);
  const before = { ...p.arms[i] };
  reachArm(p, i, vHand);
  const l = p.arms[i];
  l.fwd = before.fwd + (l.fwd - before.fwd) * w;
  l.out = before.out + (l.out - before.out) * w;
  l.bend = before.bend + (l.bend - before.bend) * w;
  l.twist = (before.twist ?? 0) + ((l.twist ?? 0) - (before.twist ?? 0)) * w;
  l.reach = (before.reach ?? 0) + ((l.reach ?? 0) - (before.reach ?? 0)) * w;
}

/** The world → torso-frame transform for a figure at (x, y, z) facing `face` at `scale` with pose `p` */
function frame(p: Pose, x: number, y: number, z: number, face: number, scale: number) {
  mRoot.compose(vPos.set(x, y, z), qYaw.setFromAxisAngle(UP, face), vScale.set(scale, scale, scale)).invert();
  torsoFrame(p, mTorso);
  mTorso.invert();
}

/**
 * The moment's keyed pose laid on `p` (the figure's own, standing or walking) by `a` (0 none, 1 all): the figure at
 * (x, y, z) facing `face` at `scale` (the root where walk.ts has it: seated, `root()`'s place); `t` the clock
 */
export function momentPose(p: Pose, m: Moment, a: number, x: number, y: number, z: number, face: number, scale: number, t: number) {
  const mark = m.mark;
  if (!mark || a <= 0.001) return;
  const k = m.amount() * a;
  if (k <= 0.001) return;
  if (mark.kind === 'door') {
    // The push: a little lean in, the right hand (arms[0], the rig's -x arm) to the handle, pushing it in as it lands
    p.lean += (MOMENT.door.lean - p.lean) * k;
    p.headPitch += (0.1 - p.headPitch) * k;
    frame(p, x, y, z, face, scale);
    const h = mark.hands[0];
    const dx = Math.sin(mark.face);
    const dz = Math.cos(mark.face);
    const push = smooth((m.u - 0.5) / 0.25) * MOMENT.door.push;
    reachTo(p, 0, h.x + dx * push, h.y, h.z + dz * push, k);
    return;
  }
  if (mark.kind === 'counter') {
    // The lean: the spine forward over the counter, the weight on both hands, the head up to whoever's there
    p.lean += (MOMENT.counter.lean - p.lean) * k;
    p.bob += (-0.02 - p.bob) * k;
    p.headPitch += (-0.12 - p.headPitch) * k;
    frame(p, x, y, z, face, scale);
    for (const i of [0, 1] as const) {
      const h = mark.hands[i];
      reachTo(p, i, h.x, h.y, h.z, k);
    }
    return;
  }
  if (mark.kind === 'lift') return;
  if (mark.kind === 'board' || mark.kind === 'alight') {
    boardPose(p, mark, m, k, a, x, y, z, face, scale, t);
    return;
  }
  if (mark.kind === 'pick' || mark.kind === 'put') {
    // The squat: down to the crate, both hands on its sides, up with it (or without it); the hands follow the crate
    p.bob += (MOMENT.crate.squat - p.bob) * k;
    p.lean += (MOMENT.crate.bend - p.lean) * k;
    p.headPitch += (0.3 - p.headPitch) * k;
    for (const l of p.legs) {
      l.fwd += (0.5 - l.fwd) * k;
      l.bend += (1.0 - l.bend) * k;
      l.out += (0.12 - l.out) * k;
    }
    // (once it's in his hands they stay on it: all the way up, and until it's down)
    const lifted = m.lifted();
    const w = Math.max(k, (mark.kind === 'pick' ? (lifted > 0.001 ? 1 : 0) : lifted) * a);
    const c = crateAt(m, x, y, z, face, scale);
    if (c && w > 0.001) handsOn(p, c, x, y, z, face, scale, w);
    return;
  }
  // The bench: down onto the seat (the root comes down and back with it, walk.ts), the legs folding, the arms to the knees
  const sit = sitPoseOf(t);
  p.bob += (sit.bob - p.bob) * k;
  p.lean += (sit.lean - p.lean) * k;
  p.twist += (sit.twist - p.twist) * k;
  p.side += (sit.side - p.side) * k;
  p.sway = (p.sway ?? 0) * (1 - k);
  p.turn = (p.turn ?? 0) * (1 - k);
  p.headPitch += (sit.headPitch - p.headPitch) * k;
  p.headYaw += (sit.headYaw * 0.3 - p.headYaw) * k;
  for (const i of [0, 1] as const) {
    const l = p.legs[i];
    const s = sit.legs[i];
    l.fwd += (s.fwd - l.fwd) * k;
    l.out += (s.out - l.out) * k;
    l.bend += (s.bend - l.bend) * k;
    l.foot = (l.foot ?? 0) * (1 - k);
    l.toe = (l.toe ?? 0) * (1 - k);
    l.footYaw = (l.footYaw ?? 0) * (1 - k);
    l.footRoll = (l.footRoll ?? 0) * (1 - k);
    const al = p.arms[i];
    const as = sit.arms[i];
    al.fwd += (as.fwd - al.fwd) * k;
    al.out += (as.out - al.out) * k;
    al.bend += (as.bend - al.bend) * k;
    al.twist = (al.twist ?? 0) * (1 - k);
    al.reach = (al.reach ?? 0) * (1 - k);
  }
}

/** The stepping leg (his left, the rig's +x: legs[1]) into each vehicle: up and over, or down the ladder */
const STEP: Record<Vehicle, { fwd: number; bend: number; out: number }> = {
  car: { fwd: 0.85, bend: 1.3, out: 0.1 },
  kart: { fwd: 1.1, bend: 1.5, out: 0.3 },
  plane: { fwd: 1.25, bend: 1.6, out: 0.15 },
  boat: { fwd: -0.3, bend: 0.5, out: 0.1 },
};

/**
 * Getting in (`board`: `k` rising to the vehicle taking him) or out (`alight`: `k` falling from the seat to his
 * feet): the hands to the handle, the pod's rim, the door frame or the rails; the near leg lifting over; the body
 * folding down onto the seat (or unfolding off it)
 */
function boardPose(p: Pose, mark: Mark, m: Moment, k: number, a: number, x: number, y: number, z: number, face: number, scale: number, t: number) {
  const v = mark.vehicle ?? 'car';
  const c = MOMENT[v];
  const u = mark.kind === 'board' ? Math.min(1, m.u / (mark.fireAt ?? 1)) : 1 - Math.min(1, m.u);
  // (the hands land over the first half, the lean in and the duck with them; the body folds onto the seat over the second)
  const hw = (mark.kind === 'board' ? smooth(u / 0.5) : smooth((u - 0.3) / 0.7)) * a;
  p.lean += (c.lean - p.lean) * hw;
  p.bob += (c.bob - p.bob) * Math.max(k, hw);
  p.headPitch += ((v === 'boat' ? 0.35 : 0.15) - p.headPitch) * hw;
  const step = Math.sin(Math.PI * u) * a;
  const st = STEP[v];
  const l = p.legs[1];
  l.fwd += (st.fwd - l.fwd) * step;
  l.bend += (st.bend - l.bend) * step;
  l.out += (st.out - l.out) * step;
  l.foot = (l.foot ?? 0) * (1 - step) - 0.3 * step;
  l.footYaw = (l.footYaw ?? 0) * (1 - step);
  l.footRoll = (l.footRoll ?? 0) * (1 - step);
  const sitK = smooth((u - 0.5) / 0.5) * a;
  if (sitK > 0.001) {
    const sit = sitPoseOf(t);
    for (const i of [0, 1] as const) {
      const lg = p.legs[i];
      const sg = sit.legs[i];
      lg.fwd += (sg.fwd - lg.fwd) * sitK;
      lg.bend += (sg.bend - lg.bend) * sitK;
      lg.out += (sg.out - lg.out) * sitK;
      lg.foot = (lg.foot ?? 0) * (1 - sitK);
      lg.toe = (lg.toe ?? 0) * (1 - sitK);
    }
    p.sway = (p.sway ?? 0) * (1 - sitK);
    p.turn = (p.turn ?? 0) * (1 - sitK);
  }
  if (!mark.hands.length || hw < 0.001) return;
  frame(p, x, y, z, face, scale);
  if (mark.hands.length === 1) reachTo(p, mark.hand ?? 0, mark.hands[0].x, mark.hands[0].y, mark.hands[0].z, hw);
  else for (const i of [0, 1] as const) reachTo(p, i, mark.hands[i].x, mark.hands[i].y, mark.hands[i].z, hw);
}

/** Both hands on the sides of a crate whose middle is at `c` (world), `w` of the way */
function handsOn(p: Pose, c: { x: number; y: number; z: number }, x: number, y: number, z: number, face: number, scale: number, w: number) {
  frame(p, x, y, z, face, scale);
  const rx = -Math.cos(face);
  const rz = Math.sin(face);
  const side = (MOMENT.crate.w / 2 + MOMENT.palm) * scale;
  // (arms[0] is his right: the crate's right side is at +r)
  reachTo(p, 0, c.x + rx * side, c.y, c.z + rz * side, w);
  reachTo(p, 1, c.x - rx * side, c.y, c.z - rz * side, w);
}

/** Where a carried crate's middle is: out in front of a figure at (x, y, z) facing `face`, held at the hips */
export function carriedAt(x: number, y: number, z: number, face: number, scale: number) {
  return { x: x + Math.sin(face) * MOMENT.crate.out * scale, y: y + (HIP_HEIGHT + MOMENT.crate.up) * scale, z: z + Math.cos(face) * MOMENT.crate.out * scale };
}

/** Where the crate is during a pick or a put: on the ground at the mark, in his hands, or on its way between (`lifted()`) */
export function crateAt(m: Moment, x: number, y: number, z: number, face: number, scale: number) {
  const mark = m.mark;
  if (!mark?.seat || (mark.kind !== 'pick' && mark.kind !== 'put')) return null;
  const k = m.lifted();
  const c = carriedAt(x, y, z, face, scale);
  const g = mark.seat;
  return { x: g.x + (c.x - g.x) * k, y: g.y + (c.y - g.y) * k, z: g.z + (c.z - g.z) * k };
}

/** Carrying a crate on the walk between a pick and a put: both hands on it out in front, a little lean back, `w` of the way */
export function carryPose(p: Pose, w: number, x: number, y: number, z: number, face: number, scale: number) {
  if (w <= 0.001) return;
  p.lean += (-MOMENT.crate.lean - p.lean) * w;
  handsOn(p, carriedAt(x, y, z, face, scale), x, y, z, face, scale, w);
}

const sitScratch: Pose = {
  bob: 0,
  lean: 0,
  twist: 0,
  side: 0,
  headYaw: 0,
  headPitch: 0,
  arms: [
    { fwd: 0, out: 0, bend: 0 },
    { fwd: 0, out: 0, bend: 0 },
  ],
  legs: [
    { fwd: 0, out: 0, bend: 0 },
    { fwd: 0, out: 0, bend: 0 },
  ],
};
/** The crowd's sitting pose (poses.ts) at time `t`, with its own small life */
function sitPoseOf(t: number): Pose {
  sitPose(sitScratch, t);
  return sitScratch;
}
