/*
 * The fighters' feet on the canvas (the animation revamp's Phase 7,
 * docs/animation-revamp-plan.md). DOM-free, so the tests and the rubric
 * (fightrubric.ts) load it in Node.
 *
 * The fight clips (fight-anim.ts) are keyed on the `Pose` rig, where the legs
 * hang from the hips: turning the hips into a cross swung both feet round with
 * them, and the stances' leg angles let the feet wander as the hips bobbed and
 * swayed. Here the feet stand where the guard puts them and the legs reach
 * down to them (`reachLeg()`), so the hips turn, drop and shift over planted
 * feet:
 * - `STANCE`: where the guard's feet stand (the balls of the feet, in the
 *   figure's own space at scale 1, and each foot's heading and pitch). Each
 *   rig leg keeps its own spot, mirrored clip or not, so a reaction to a blow
 *   from the left keeps the fighter's own stance.
 * - `PLANTS`: which legs each clip plants and when a leg is off the canvas
 *   (`free`: the kicking leg, the stagger's stumble, the fall and the get-up,
 *   eased off and back over `RAMP` frames), and how a foot turns on its ball
 *   with the hips (`pivot`: the rear foot driving the cross and the uppercut,
 *   the lead foot under the hook, the standing foot through the roundhouse)
 *   and its heel comes up as it does (`heel`).
 * - `plantLegs()` lays it on a sampled pose: each planted leg reaches its
 *   foot's spot (or wherever the footwork has put it, `balls`), the foot keeps
 *   its heading on the ground whatever the leg above it does, and the hips
 *   come down (at most `DROP`) when a leg can't reach.
 * - `createFootwork()`: the sim moves a fighter's root through a move (the
 *   lunge, a knock back); the feet keep their place on the canvas and step
 *   after it (`STEP`: the foot the way it's going first, then the other), so
 *   a jab steps in and a blow knocks a fighter back a step, never a slide.
 */
import * as THREE from 'three';
import { ANKLE_H, BALL_Z, HIP_Y, LEG_REACH, LEG_X, looseFoot, makeSkeleton, poseSkeleton, reachLeg, type Limb } from './skeleton';
import { CLIPS, newFightPose, sampleClip, type ClipId, type FightPose } from './fight-anim';

/** A clip's feet: legs L, R */
export interface Plant {
  /** Each leg's frames off the canvas (from, to): eased off over RAMP frames from `from`, back on over the RAMP frames up to `to`; null planted throughout */
  free?: [[number, number] | null, [number, number] | null];
  /** Each foot turned on its ball by this share of the hips' turn from the guard's */
  pivot?: [number, number];
  /** Each heel up by this share of the hips' turn the way that drives through (radians a radian) */
  heel?: [number, number];
}

/** Frames a leg takes to come off the canvas or back onto it */
export const RAMP = 4;
/** The most the hips come down so a planted leg can reach (the figure's numbers) */
export const DROP = 0.08;
const NEVER = 1e9;

export const PLANTS: Partial<Record<ClipId, Plant>> = {
  guard: {},
  jab: { pivot: [0.15, 0.1] },
  // The rear hip drives the cross and the uppercut: the rear foot turns on its ball, the heel up
  cross: { pivot: [0.15, 0.8], heel: [0, 0.9] },
  hook: { pivot: [0.75, 0.2], heel: [0.6, 0] },
  uppercut: { pivot: [0.15, 0.7], heel: [0, 0.8] },
  // The kicking leg leaves the canvas; the standing foot turns under the hip
  frontKick: { free: [null, [1, CLIPS.frontKick.frames - 1]], pivot: [0.5, 0] },
  roundhouse: { free: [null, [1, CLIPS.roundhouse.frames - 1]], pivot: [1, 0], heel: [0.4, 0] },
  dodge: { pivot: [0.3, 0.3] },
  block: {},
  blockHit: {},
  hitHead: { pivot: [0.3, 0.3] },
  hitBody: { pivot: [0.3, 0.3] },
  // The stumble's steps are the clip's own; planted again as it settles
  stagger: { free: [
    [2, 30],
    [2, 30],
  ] },
  knockdown: { free: [
    [2, NEVER],
    [2, NEVER],
  ] },
  getup: { free: [
    [-NEVER, CLIPS.getup.frames - 4],
    [-NEVER, CLIPS.getup.frames - 4],
  ] },
  taunt: {},
  victory: {},
};

/** How far leg `i` is on the canvas (0-1) in clip `id` at `frame` */
export function plantWeight(id: ClipId, i: 0 | 1, frame: number): number {
  const c = PLANTS[id];
  if (!c) return 0;
  const f = c.free?.[i];
  if (!f) return 1;
  const [a, b] = f;
  const smooth = (u: number) => {
    const x = THREE.MathUtils.clamp(u, 0, 1);
    return x * x * (3 - 2 * x);
  };
  if (frame <= a) return 1;
  if (frame >= b) return 1;
  return Math.max(1 - smooth((frame - a) / RAMP), smooth((frame - (b - RAMP)) / RAMP));
}

/* ---------- The guard's stance ---------- */

const SK = makeSkeleton();
const GUARD_POSE = sampleClip('guard', 0, newFightPose());
/** The guard's hip turn (the clips' turns are measured from it) */
export const GUARD_TURN = GUARD_POSE.turn;
/** The ball of each foot in the foot's own space */
const BALL = new THREE.Vector3(0, -ANKLE_H, BALL_Z);

export interface Spot {
  /** The ball of the foot (the figure's space, scale 1; y 0 the canvas) */
  x: number;
  y: number;
  z: number;
  /** The foot's heading, pitch and roll on the ground ('YXZ') and its toes' bend */
  yaw: number;
  pitch: number;
  roll: number;
  toe: number;
}

/** Where the guard's feet stand */
export const STANCE: [Spot, Spot] = (() => {
  poseSkeleton(SK, GUARD_POSE);
  SK.root.updateMatrixWorld(true);
  const e = new THREE.Euler();
  const q = new THREE.Quaternion();
  return ([0, 1] as const).map((i) => {
    const S = i === 0 ? 'L' : 'R';
    const b = SK.bones[`toe${S}`].getWorldPosition(new THREE.Vector3());
    e.setFromQuaternion(SK.bones[`foot${S}`].getWorldQuaternion(q), 'YXZ');
    return { x: b.x, y: 0, z: b.z, yaw: e.y, pitch: e.x, roll: e.z, toe: looseFoot(GUARD_POSE.legs[i]).toe };
  }) as [Spot, Spot];
})();

/* ---------- Planting ---------- */

const tA = new THREE.Vector3();
const tE = new THREE.Euler();
const qF = new THREE.Quaternion();
const qP = new THREE.Quaternion();
const qB = new THREE.Quaternion();
const ankles = [new THREE.Vector3(), new THREE.Vector3()];
const feet = [new THREE.Quaternion(), new THREE.Quaternion()];
const solved: Limb = { fwd: 0, out: 0, bend: 0, twist: 0 };

/** A ball on the canvas for a leg (figure's space, scale 1; y its lift) */
export interface Ball {
  x: number;
  y: number;
  z: number;
}

/** The point `p` in the hips' space from leg `i`'s hip joint (as locomotion.ts's hipSpace) */
function hipSpace(p: FightPose, i: number, out: THREE.Vector3) {
  out.x -= p.sway ?? 0;
  out.y -= HIP_Y + p.bob;
  out.applyEuler(tE.set(0, -(p.turn ?? 0), 0, 'XYZ'));
  out.applyEuler(tE.set(0, 0, -p.side, 'XYZ'));
  out.x -= (i === 0 ? -1 : 1) * LEG_X;
  return out;
}

/**
 * Plant the feet of a pose sampled from clip `id` at `frame` (`mirror` as it
 * was sampled): each leg on the canvas reaches its foot's spot (`STANCE`, or
 * `balls[i]` where the footwork has a foot), turned on its ball and its heel
 * up as `PLANTS` says, and weighed in by `plantWeight()` (or `w`, each
 * leg's weight as the view eases it). Changes `p`'s legs
 * (with their `foot`, `footYaw`, `footRoll` and `toe`) and its `bob`.
 */
export function plantLegs(p: FightPose, id: ClipId, frame: number, opts: { mirror?: boolean; balls?: readonly (Ball | null)[]; w?: readonly number[] } = {}): FightPose {
  const c = PLANTS[id];
  if (!c) return p;
  const { mirror = false, balls } = opts;
  const w = opts.w ?? [plantWeight(id, 0, frame), plantWeight(id, 1, frame)];
  if (w[0] <= 0 && w[1] <= 0) return p;
  // (a mirrored clip turns its hips the other way, and its driving foot is the other one)
  const m = mirror ? -1 : 1;
  const dTurn = (p.turn ?? 0) - GUARD_TURN * m;
  const pick = (a: [number, number] | undefined, i: number) => (a ? a[mirror ? 1 - i : i] : 0);
  for (let i = 0; i < 2; i++) {
    if (w[i] <= 0) continue;
    const st = STANCE[i];
    const b = balls?.[i] ?? st;
    const lift = pick(c.heel, i) * Math.max(0, -dTurn * m);
    qF.setFromEuler(tE.set(st.pitch + lift, st.yaw + pick(c.pivot, i) * dTurn, st.roll, 'YXZ'));
    feet[i].copy(qF);
    ankles[i].copy(BALL).applyQuaternion(qF).multiplyScalar(-1).add(tA.set(b.x, b.y, b.z));
  }
  // Out of reach: the hips come down until the planted legs can reach (two passes, as the walk's)
  const bob0 = p.bob;
  for (let pass = 0; pass < 2; pass++) {
    let need = 0;
    for (let i = 0; i < 2; i++) {
      if (w[i] <= 0) continue;
      hipSpace(p, i, tA.copy(ankles[i]));
      const r2 = tA.x * tA.x + tA.z * tA.z;
      const reach = Math.sqrt(Math.max(0, LEG_REACH * LEG_REACH - r2));
      need = Math.max(need, (-tA.y - reach) * w[i]);
    }
    if (need <= 1e-5) break;
    p.bob = Math.max(bob0 - DROP, p.bob - need);
  }
  for (let i = 0; i < 2; i++) {
    if (w[i] <= 0) continue;
    const s = i === 0 ? -1 : 1;
    const l = p.legs[i];
    hipSpace(p, i, tA.copy(ankles[i]));
    reachLeg(solved, s, tA, p.side);
    // The foot keeps its heading on the ground whatever the leg does: its turn against the shin's
    qP.setFromEuler(tE.set(0, p.turn ?? 0, p.side, 'XYZ'))
      .multiply(qB.setFromEuler(tE.set(-solved.fwd, 0, s * solved.out - p.side, 'XYZ')))
      .multiply(qB.setFromEuler(tE.set(solved.bend, 0, 0, 'XYZ')));
    tE.setFromQuaternion(qP.invert().multiply(feet[i]), 'YXZ');
    const st = STANCE[i];
    const lift = pick(c.heel, i) * Math.max(0, -dTurn * m);
    const k = w[i];
    const loose = looseFoot(l);
    l.fwd += (solved.fwd - l.fwd) * k;
    l.out += (solved.out - l.out) * k;
    l.bend += (solved.bend - l.bend) * k;
    l.twist = (l.twist ?? 0) * (1 - k);
    l.foot = loose.foot + (tE.x - loose.foot) * k;
    l.footYaw = tE.y * k;
    l.footRoll = tE.z * k;
    // (the toes stay flat on the canvas as the heel comes up)
    l.toe = loose.toe + (st.toe - lift - loose.toe) * k;
  }
  return p;
}

/* ---------- Footwork ---------- */

/** A step: how far a foot may be from its spot before it steps (the figure's numbers), how long a step takes (seconds) and how high the foot lifts; standing still a while, a smaller miss settles */
export const STEP = { at: 0.07, time: 0.16, lift: 0.04, settle: 0.02, wait: 0.5 };

interface Foot {
  /** On the canvas (world) */
  x: number;
  z: number;
  /** Stepping: from where (world), how far through (0-1) */
  from: { x: number; z: number } | null;
  u: number;
}

/** Where a fighter stands (world), the way it faces (sin, cos) and its scale */
export interface Root {
  x: number;
  z: number;
  yaw: number;
  scale: number;
}

/**
 * The feet on the canvas under a fighter the sim moves: `update()` each
 * frame with where the root is and which legs the clip plants; it gives each
 * planted leg's ball in the figure's space (`balls`) for `plantLegs()`. A
 * leg off the canvas (`w` 0) lands back on its spot; `reset()` puts both
 * feet where they are (when the walk hands them back).
 */
export function createFootwork() {
  const feet: Foot[] = [
    { x: 0, z: 0, from: null, u: 0 },
    { x: 0, z: 0, from: null, u: 0 },
  ];
  const balls: [Ball, Ball] = [
    { x: STANCE[0].x, y: 0, z: STANCE[0].z },
    { x: STANCE[1].x, y: 0, z: STANCE[1].z },
  ];
  let started = false;
  let still = 0;
  /** A spot in the figure's space to the world */
  const toWorld = (r: Root, lx: number, lz: number) => {
    const c = Math.cos(r.yaw);
    const s = Math.sin(r.yaw);
    return { x: r.x + (lx * c + lz * s) * r.scale, z: r.z + (-lx * s + lz * c) * r.scale };
  };
  const toLocal = (r: Root, wx: number, wz: number, out: Ball) => {
    const c = Math.cos(r.yaw);
    const s = Math.sin(r.yaw);
    const dx = (wx - r.x) / r.scale;
    const dz = (wz - r.z) / r.scale;
    out.x = dx * c - dz * s;
    out.z = dx * s + dz * c;
  };
  const reset = (r: Root) => {
    for (let i = 0; i < 2; i++) {
      const t = toWorld(r, STANCE[i].x, STANCE[i].z);
      Object.assign(feet[i], { x: t.x, z: t.z, from: null, u: 0 });
    }
    started = true;
  };
  return {
    balls,
    feet,
    /** Put the feet on their spots where the fighter stands now */
    reset,
    /** Foot `i` is here (world) now: where something else (the walk) has put it */
    place(i: 0 | 1, x: number, z: number) {
      Object.assign(feet[i], { x, z, from: null, u: 0 });
      started = true;
    },
    /** One frame: where the root is, how far each leg is on the canvas; gives the balls in the figure's space */
    update(dt: number, r: Root, w: readonly number[]): [Ball, Ball] {
      if (!started) reset(r);
      const spots = [toWorld(r, STANCE[0].x, STANCE[0].z), toWorld(r, STANCE[1].x, STANCE[1].z)];
      const miss = spots.map((t, i) => Math.hypot(t.x - feet[i].x, t.z - feet[i].z) / r.scale);
      const moving = feet.some((f) => f.from);
      still = moving || Math.max(...miss) > STEP.at ? 0 : still + dt;
      // A leg off the canvas lands back on its spot
      for (let i = 0; i < 2; i++)
        if (w[i] <= 0.01) Object.assign(feet[i], { x: spots[i].x, z: spots[i].z, from: null, u: 0 });
      // Steps: one foot at a time, the one that's furthest out (the way it's going first when they're alike)
      if (!moving) {
        const need = [0, 1].filter((i) => w[i] > 0.5 && (miss[i] > STEP.at || (still > STEP.wait && miss[i] > STEP.settle)));
        if (need.length) {
          const goX = spots[0].x + spots[1].x - feet[0].x - feet[1].x;
          const goZ = spots[0].z + spots[1].z - feet[0].z - feet[1].z;
          const ahead = (i: number) => (spots[i].x - (spots[0].x + spots[1].x) / 2) * goX + (spots[i].z - (spots[0].z + spots[1].z) / 2) * goZ;
          need.sort((a, b) => miss[b] - miss[a] > 0.02 ? 1 : miss[a] - miss[b] > 0.02 ? -1 : ahead(b) - ahead(a));
          const f = feet[need[0]];
          f.from = { x: f.x, z: f.z };
          f.u = 0;
        }
      }
      for (let i = 0; i < 2; i++) {
        const f = feet[i];
        let lift = 0;
        if (f.from) {
          f.u = Math.min(1, f.u + dt / STEP.time);
          const e = f.u * f.u * (3 - 2 * f.u);
          f.x = f.from.x + (spots[i].x - f.from.x) * e;
          f.z = f.from.z + (spots[i].z - f.from.z) * e;
          lift = Math.sin(Math.PI * f.u) * STEP.lift;
          if (f.u >= 1) f.from = null;
        }
        toLocal(r, f.x, f.z, balls[i]);
        balls[i].y = lift;
      }
      return balls;
    },
  };
}
export type Footwork = ReturnType<typeof createFootwork>;
