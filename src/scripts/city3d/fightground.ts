/*
 * The fighters on the canvas (the animation revamp's Phase 7,
 * docs/animation-revamp-plan.md). DOM-free.
 *
 * The fight clips (fight-anim.ts) key the legs and arms by their swing and
 * bend, and the hips by their bob, sway, turn and tilt, each on its own, so
 * a clip that drops the hips or leans them over a foot (the dodge, the hits,
 * the uppercut's dip, the get-up) put that foot through the canvas, and the
 * guard's stance stood the rear foot a few centimetres over it: measured by
 * the rubric (tests/fighthuman.test.ts), as much as 36 cm through and 7 cm
 * over. `groundFighter()` puts them right after the clip is sampled, with
 * the root (`Root`: the lying poses' lift and tip) as the figure is drawn:
 * a foot whose sole (its ball, or its heel) the clip has under `PLANT.lo`
 * over the canvas goes onto it, its leg reached (`reachLeg()`) to lift or
 * lower the ankle by as much, the foot keeping the pitch the clip gave it
 * (a heel up stays up); one higher comes down that much lower, eased in and
 * out (`soleGoal()`), so a kick or a step keeps its shape and nothing jumps
 * as a foot leaves the canvas or lands; past `PLANT.lift` it's the clip's.
 * The hips come down as far as a foot on the canvas needs (a spot out of the
 * leg's reach pulls them, never a lifted foot), as the dance's do
 * (emotes.ts). A foot the pose places itself (`foot` set) is left alone.
 */
import * as THREE from 'three';
import { rootShift, type FightPose, type Root } from './fight-anim';
import { ANKLE_H, HAND, HIP_Y, LEG_REACH, LEG_X, makeSkeleton, poseSkeleton, reachLeg, type Limb, type Pose } from './skeleton';

/** Fighters stand at the walker's scale */
export const FIGHTER_SCALE = 0.85;

const smooth = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * A sole under `lo` over the canvas (rig numbers, scale 1) goes onto it; one
 * higher comes down by as much and a little more, eased in (from `lo` to
 * `lo` + 2 `round` it goes from on the canvas to following the clip that
 * much lower, so a foot leaving it or landing never jumps) and out again by
 * `lift`, from where it follows the clip exactly (a kick at full stretch is
 * the clip's: reached any lower, its leg would come straight too soon);
 * `heel` is how far back of the ankle the heel is, under it; a hand's
 * knuckles stay `hand` over the canvas (the tests' line for the clips)
 */
export const PLANT = { lo: 0.035, round: 0.012, lift: 0.25, heel: 0.035, hand: 0.012 };

/** How high a sole the clip has `s` over the canvas ends up */
export function soleGoal(s: number) {
  const { lo, round: r, lift } = PLANT;
  if (s <= lo) return 0;
  if (s <= lo + 2 * r) return ((s - lo) * (s - lo)) / (4 * r);
  return s - (lo + r) * (1 - smooth(lo + 2 * r, lift, s));
}

const limb = (to: Limb, from: Limb) => {
  to.fwd = from.fwd;
  to.out = from.out;
  to.bend = from.bend;
  to.twist = from.twist ?? 0;
  to.reach = from.reach;
  if (from.wrist) {
    if (to.wrist) {
      to.wrist.roll = from.wrist.roll;
      to.wrist.bend = from.wrist.bend;
    } else to.wrist = { roll: from.wrist.roll, bend: from.wrist.bend };
  } else if (to.wrist) to.wrist = undefined;
};
/**
 * How far the head turns from the chest: freely to `free`, then easing in to
 * `most` at most (radians; a person's is about 80°). A cut from one clip to
 * the next carries the twist over on top of the new clip's (a cross caught
 * by the knockdown), which could turn it past that
 */
export const NECK = { free: 1.0, most: 1.3 };
const neck = (x: number) => {
  const a = Math.abs(x);
  if (a <= NECK.free) return x;
  return Math.sign(x) * (NECK.free + (NECK.most - NECK.free) * Math.tanh((a - NECK.free) / (NECK.most - NECK.free)));
};
/**
 * A clip's pose (fight-anim.ts) onto a figure's: the clips' head turn is
 * against the shoulders over square hips, so the hips' own turn is taken
 * back out, and kept within the neck's turn (`NECK`: poseSkeleton() turns
 * the head from the chest by its yaw less 0.8 of the twist); the feet are
 * the skeleton's to set (none placed)
 */
export function figurePose(from: FightPose, to: Pose) {
  to.bob = from.bob;
  to.lean = from.lean;
  to.twist = from.twist;
  to.side = from.side;
  to.turn = from.turn;
  to.sway = from.sway;
  to.headYaw = neck(from.headYaw - from.turn - 0.8 * from.twist) + 0.8 * from.twist;
  to.headPitch = from.headPitch;
  for (let i = 0; i < 2; i++) {
    limb(to.arms[i], from.arms[i]);
    limb(to.legs[i], from.legs[i]);
    const l = to.legs[i];
    l.foot = l.footYaw = l.footRoll = l.toe = undefined;
  }
  return to;
}

const sk = makeSkeleton();
const ball = new THREE.Vector3();
const heel = new THREE.Vector3();
const tmp = new THREE.Vector3();
const eu = new THREE.Euler();
const want: Limb = { fwd: 0, out: 0, bend: 0 };
const STANDING: Root = { y: 0, pitch: 0, pivot: 0 };

/** The skeleton posed and placed as the figure is drawn (its root's lift and tip, in rig numbers) */
function place(p: Pose, root: Root) {
  poseSkeleton(sk, p);
  const { dy, dz } = rootShift(root);
  sk.root.position.set(0, dy, dz);
  sk.root.rotation.set(root.pitch, 0, 0);
  sk.root.updateMatrixWorld(true);
}

/** A point (in his frame) into the hips' space from leg `i`'s hip joint (as emotes.ts's `hipSpace()`) */
function hipSpace(p: Pose, i: number, at: THREE.Vector3, out: THREE.Vector3) {
  out.set(at.x - (p.sway ?? 0), at.y - (HIP_Y + p.bob), at.z);
  out.applyEuler(eu.set(0, -(p.turn ?? 0), 0, 'XYZ'));
  out.applyEuler(eu.set(0, 0, -p.side, 'XYZ'));
  out.x -= (i === 0 ? -1 : 1) * LEG_X;
  return out;
}

/** How far each foot's sole (the lower of its ball and heel) is over the canvas, for the pose as it stands (rig numbers) */
export function soles(p: Pose, root: Root = STANDING, out: number[] = [0, 0]): number[] {
  place(p, root);
  return measureSoles(out);
}
function measureSoles(out: number[]) {
  for (let i = 0; i < 2; i++) {
    const S = i === 0 ? 'L' : 'R';
    sk.bones[`toe${S}`].getWorldPosition(ball);
    sk.bones[`foot${S}`].localToWorld(heel.set(0, -ANKLE_H, -PLANT.heel));
    out[i] = Math.min(ball.y, heel.y);
  }
  return out;
}
/** How far each hand's lowest knuckle is over the canvas (rig numbers): the tests hold the clips' hands off it */
export function knuckles(p: Pose, root: Root = STANDING, out: number[] = [0, 0]): number[] {
  place(p, root);
  return measureHands(out);
}
const KNUCKLES = HAND.fingers.map((f) => new THREE.Vector3(0, HAND.knuckleY, f.z));
function measureHands(out: number[]) {
  for (let i = 0; i < 2; i++) {
    const hand = sk.bones[i === 0 ? 'handL' : 'handR'];
    out[i] = Infinity;
    for (const k of KNUCKLES) out[i] = Math.min(out[i], hand.localToWorld(tmp.copy(k)).y);
  }
  return out;
}

const sole = [0, 0];
const goal = [0, 0];
const hold = [0, 0];
const ankles = [new THREE.Vector3(), new THREE.Vector3()];
/** Passes of reaching and measuring again (the reach's plane is the leg's, not quite the skeleton's: the second takes up what the first missed) */
const PASSES = 3;
const REACH = (LEG_REACH / 0.99) * 0.98;
/** The fighter's feet on the canvas, by `amt` (0 leaves the pose alone), with the root it's drawn with */
export function groundFighter(p: Pose, root: Root = STANDING, amt = 1) {
  if (amt <= 1e-3) return;
  soles(p, root, sole);
  // Where each sole should end (`soleGoal()`, by `amt`), and how much it counts for the hips (a foot on the canvas)
  for (let i = 0; i < 2; i++) {
    const free = p.legs[i].foot !== undefined;
    goal[i] = free ? NaN : sole[i] + (soleGoal(sole[i]) - sole[i]) * amt;
    hold[i] = free ? 0 : amt * (1 - smooth(PLANT.lo, PLANT.lo + 2 * PLANT.round, sole[i]));
  }
  for (let pass = 0; pass < PASSES; pass++) {
    // (after the first pass: what's still between each sole and its goal)
    if (pass > 0) {
      place(p, root);
      measureSoles(sole);
    }
    // Where each ankle should go: up or down by what's between its sole and its goal, in his frame
    for (let i = 0; i < 2; i++) {
      sk.bones[i === 0 ? 'footL' : 'footR'].getWorldPosition(ankles[i]);
      const e = sole[i] - goal[i];
      ankles[i].y -= Number.isFinite(e) ? e : 0;
      sk.root.worldToLocal(ankles[i]);
    }
    // The hips down as far as a foot going onto the canvas needs (out of the leg's reach, it pulls them; never a lifted foot)
    let need = 0;
    for (let i = 0; i < 2; i++) {
      if (!(sole[i] - goal[i] > 1e-4) || hold[i] <= 0) continue;
      hipSpace(p, i, ankles[i], tmp);
      need = Math.max(need, (-tmp.y - Math.sqrt(Math.max(0, REACH * REACH - tmp.x * tmp.x - tmp.z * tmp.z))) * hold[i]);
    }
    p.bob -= need;
    for (let i = 0; i < 2; i++) {
      if (!(Math.abs(sole[i] - goal[i]) > 1e-4)) continue;
      const l = p.legs[i];
      // The foot as poseSkeleton() sets it from the clip's leg (eased towards level, the toes bent back off a
      // tip), on the first pass; after it, as the pass before left it
      const tip = l.fwd - l.bend;
      const foot0 = l.foot ?? THREE.MathUtils.clamp(tip * 0.55, -0.5, 0.5);
      const toe0 = l.toe ?? -Math.min(0.6, Math.max(0, foot0 - tip)) * 0.9;
      reachLeg(want, i === 0 ? -1 : 1, hipSpace(p, i, ankles[i], tmp), p.side);
      l.fwd = want.fwd;
      l.out = want.out;
      l.bend = want.bend;
      l.twist = 0;
      // ...the foot at the pitch the clip gave it (the shin's new tilt taken back out)
      l.foot = foot0 + (l.fwd - l.bend - tip);
      l.toe = toe0;
      l.footYaw = l.footRoll = 0;
    }
  }
}
