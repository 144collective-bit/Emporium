/*
 * A fighter on screen: a Degen figure posed from the fight sim's state with
 * the clips in fight-anim.ts. Shared by the fight itself (fight.ts) and the
 * sparring demo (fight-demo.ts).
 *
 * How a fighter is drawn each frame (`drawFighter`):
 * - On the ground: the `knockdown` fall, then the `down` loop; getting up:
 *   `getup`. Stunned: the hit reaction for `hurt` (`hurtClip`), timed by
 *   `hurtFrame`. In a move: the move's clip at the sim's own `frame`, so
 *   the strike lands on the frame the rules say. Blocking: `block` (its
 *   hold loops). Else the `guard` loop; moving round the ring, its legs
 *   and hips are the animator's on the motion capture (animator.ts, the
 *   animation revamp's Phase 7: the guard's upper body over them, as a
 *   gun's is over the player's), or the planted-feet walk (locomotion.ts)
 *   until walk mode has the capture, so the feet step, not slide.
 * - A change of clip crossfades over a few frames (`blendPose`).
 * - The feet stay planted on the canvas (fightfeet.ts): each clip's legs
 *   reach down to them, so the hips turn and drop over them, the rear foot
 *   turning on its ball into a cross; the sim's lunges and knock backs move
 *   the fighter and the feet step after it (`createFootwork()`).
 * - `root` (the lying pose's lift, back-rotation and the height it turns
 *   about, `rootShift()`) goes on the figure's group with the sim's x, z and
 *   yaw: the group is moved so the pitch turns about `(0, pivot, 0)` in the
 *   figure's space (the hips for the fall and the get-up, the feet otherwise).
 * - `manual` plays a clip by hand (the demo's clip picker) over the sim.
 */
import * as THREE from 'three';
import { createDegen, type Degen, type Limb, type Outfit } from './character';
import { createLocomotion, type Locomotion } from './locomotion';
import { CLIPS, blendPose, hurtClip, hurtMirror, moveClip, newFightPose, rootShift, sampleClip, type ClipId, type FightPose } from './fight-anim';
import { T, type Fighter } from './fight-sim';
import { createFootwork, plantLegs, plantWeight, type Footwork } from './fightfeet';
import type { Animator } from './animator';
import { newMove, stepMove, type MoveState } from './movesim';
import type { Motion } from './remote';

/** Figures stand at the walker's scale */
export const FIGHTER_SCALE = 0.85;
const FADE = 6;

export interface FighterFigure {
  degen: Degen;
  pose: FightPose;
  prev: FightPose;
  tmp: FightPose;
  clip: ClipId | null;
  /** The clip is playing mirrored (a hit reaction to a blow from the left) */
  mirror: boolean;
  frame: number;
  fade: number;
  /** Moving round the ring: the legs from the planted-feet walk (locomotion.ts), weighed in over the guard's by `walk` */
  loco: Locomotion;
  walk: number;
  last: { x: number; z: number } | null;
  /** A clip being played by hand, with its frame */
  manual: { id: ClipId; frame: number } | null;
  /** The guard loop's own phase so two figures don't bounce in step */
  seed: number;
  /** The ground it fights on (0 in the ring; a street spar's, a pier's deck) */
  y: number;
  /** The feet on the canvas (fightfeet.ts), and how far each leg is planted (eased) */
  feet: Footwork;
  plant: [number, number];
  /** The motion capture and its animator module, once walk mode has them; this fighter's animator and its springs */
  motion: () => Motion | null;
  anim: Animator | null;
  move: MoveState;
}

export function createFighterFigure(parent: THREE.Object3D, outfit: Outfit, low: boolean, seed = 0, motion: () => Motion | null = () => null): FighterFigure {
  const degen = createDegen({ ...outfit, fists: true }, low ? 1 : undefined);
  degen.g.scale.setScalar(FIGHTER_SCALE);
  parent.add(degen.g);
  return {
    degen,
    pose: newFightPose(),
    prev: newFightPose(),
    tmp: newFightPose(),
    clip: null,
    mirror: false,
    frame: 0,
    fade: 0,
    loco: createLocomotion(),
    walk: 0,
    last: null,
    manual: null,
    seed,
    y: 0,
    feet: createFootwork(),
    plant: [1, 1],
    motion,
    anim: null,
    move: newMove(0),
  };
}
export function disposeFigure(fg: FighterFigure) {
  fg.degen.g.removeFromParent();
  fg.degen.dispose();
}

const copyPose = (from: FightPose, to: FightPose) => {
  to.bob = from.bob;
  to.lean = from.lean;
  to.twist = from.twist;
  to.side = from.side;
  to.turn = from.turn;
  to.sway = from.sway;
  to.headYaw = from.headYaw;
  to.headPitch = from.headPitch;
  for (let i = 0; i < 2; i++) {
    copyLimb(to.arms[i], from.arms[i]);
    copyLimb(to.legs[i], from.legs[i]);
  }
  to.root.y = from.root.y;
  to.root.pitch = from.root.pitch;
  to.root.pivot = from.root.pivot;
};
/** A limb by value: the wrist is its own object, never shared between poses */
const copyLimb = (to: Limb, from: Limb) => {
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
 * Which clip and frame a fighter's state calls for. Hit reactions are keyed
 * for a blow from the right (`armR`, `legR`): `mirror` plays them for one
 * from the left.
 */
export function pickClip(f: Fighter, fg: FighterFigure, ticks: number): { id: ClipId; frame: number; mirror?: boolean } {
  if (fg.manual) return fg.manual;
  if (f.down > 0) {
    const since = f.downTotal - f.down;
    return since < CLIPS.knockdown.frames ? { id: 'knockdown', frame: since } : { id: 'down', frame: since - CLIPS.knockdown.frames };
  }
  if (f.getup > 0) return { id: 'getup', frame: T.getupFrames - f.getup };
  if (f.stun > 0 && f.hurt) return { id: hurtClip(f.hurt), frame: f.hurtFrame, mirror: hurtMirror(f.hurtBy) };
  if (f.move) return { id: moveClip(f.move), frame: f.frame };
  if (f.blocking) return { id: 'block', frame: f.blockFrames };
  return { id: 'guard', frame: fg.seed + ticks };
}

/** How fast a leg may come onto the canvas or off it beyond what its clip says (a share a frame): a kick cut short by a blow comes down over a few frames */
const PLANT_RATE = 0.4;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const smooth = (x: number) => x * x * (3 - 2 * x);
const ball = new THREE.Vector3();

/** Pose and place the figure from the fighter's state; `dt` 0 holds the frame */
export function drawFighter(fg: FighterFigure, f: Fighter, dt: number, ticks: number, overrideClip?: { id: ClipId; frame: number; mirror?: boolean }) {
  const { id, frame, mirror } = overrideClip ?? pickClip(f, fg, ticks);
  if (fg.manual) {
    fg.manual.frame += dt * 60;
    if (!CLIPS[id].loop && fg.manual.frame >= CLIPS[id].frames + 20) fg.manual = null;
  }
  if (id !== fg.clip || !!mirror !== fg.mirror) {
    copyPose(fg.pose, fg.prev);
    fg.fade = fg.clip ? FADE : 0;
    fg.clip = id;
    fg.mirror = !!mirror;
  }
  fg.frame = frame;
  sampleClip(id, frame, fg.pose, { mirror });
  // Moving round the ring: the motion capture's legs under the guard (or the planted-feet walk until it's in),
  // facing the opponent, so the feet step instead of sliding; they fade in over the guard's stance and back out
  const vx = fg.last && dt > 0 ? (f.x - fg.last.x) / dt : 0;
  const vz = fg.last && dt > 0 ? (f.z - fg.last.z) / dt : 0;
  if (dt > 0) fg.last = { x: f.x, z: f.z };
  const mo = fg.motion();
  if (mo && !fg.anim) {
    fg.anim = mo.anim.createAnimator(mo.data);
    fg.move = newMove(f.yaw);
  }
  const anim = mo ? fg.anim : null;
  const walking = id === 'guard' && (f.moving > 0.05 || (!anim && fg.loco.stepping));
  const w0 = fg.walk;
  if (dt > 0) fg.walk += ((walking ? 1 : 0) - fg.walk) * Math.min(1, dt * 10);
  if (!walking && fg.walk < 0.01) fg.walk = 0;
  if (anim) {
    if (dt > 0 && fg.walk > 0) {
      // (taking off again from the stance: the springs start where it stands)
      if (w0 === 0) {
        anim.reset();
        fg.move = newMove(f.yaw);
      }
      stepMove(fg.move, vx, vz, true, dt, f.yaw);
      anim.update({ dt, x: f.x, y: fg.y, z: f.z, move: fg.move, gx: vx, gz: vz, scale: FIGHTER_SCALE, ground: () => fg.y, sprint: 0, grounded: true, vy: 0, faceGoal: f.yaw });
    }
  } else if (dt > 0) fg.loco.update({ dt, t: ticks / 60, x: f.x, y: 0, z: f.z, vx, vz, face: f.yaw, grounded: true, vy: 0, scale: FIGHTER_SCALE, ground: () => 0, armed: true });
  if (fg.fade > 0) {
    fg.fade -= dt * 60;
    const k = 1 - Math.max(0, fg.fade) / FADE;
    blendPose(fg.prev, fg.pose, k, fg.tmp);
    copyPose(fg.tmp, fg.pose);
  }
  // The feet on the canvas: while the walk has the legs they're wherever it put them; else they keep their place and
  // step after the fighter as the sim moves it, and the clip's legs reach down to them
  const root = { x: f.x, z: f.z, yaw: f.yaw, scale: FIGHTER_SCALE };
  const want = [plantWeight(id, 0, frame), plantWeight(id, 1, frame)];
  for (let i = 0; i < 2; i++) {
    const p = Math.max(0, want[i] - fg.walk);
    fg.plant[i] = dt > 0 ? fg.plant[i] + THREE.MathUtils.clamp(p - fg.plant[i], -PLANT_RATE * dt * 60, PLANT_RATE * dt * 60) : p;
  }
  const balls = fg.feet.update(dt, root, fg.plant);
  // (while the walk has them, the feet are where it put them: they step on from there)
  if (fg.walk > 0.02) {
    const bones = fg.degen.rig.bones;
    for (const i of [0, 1] as const) {
      bones[i === 0 ? 'toeL' : 'toeR'].getWorldPosition(ball);
      fg.feet.place(i, ball.x, ball.z);
    }
  }
  plantLegs(fg.pose, id, frame, { mirror: !!mirror, balls, w: fg.plant });

  const deg = fg.degen;
  deg.pose.bob = fg.pose.bob;
  deg.pose.lean = fg.pose.lean;
  deg.pose.twist = fg.pose.twist;
  deg.pose.side = fg.pose.side;
  deg.pose.turn = fg.pose.turn;
  deg.pose.sway = fg.pose.sway;
  // The clips' head turn is against the shoulders over square hips: the hips' own turn is taken back out
  deg.pose.headYaw = fg.pose.headYaw - fg.pose.turn;
  deg.pose.headPitch = fg.pose.headPitch;
  const lw = anim ? 0 : fg.walk;
  for (let i = 0; i < 2; i++) {
    copyLimb(deg.pose.arms[i], fg.pose.arms[i]);
    copyLimb(deg.pose.legs[i], fg.pose.legs[i]);
    // (the planted feet's own turn on the canvas)
    const l = deg.pose.legs[i];
    const c = fg.pose.legs[i];
    Object.assign(l, { foot: c.foot, footYaw: c.footYaw, footRoll: c.footRoll, toe: c.toe });
    // Without the motion capture: the planted-feet walk's legs, weighed in (its feet's own turn once it has the legs)
    const s = fg.loco.pose.legs[i];
    if (lw > 0.01) {
      l.fwd += (s.fwd - l.fwd) * lw;
      l.out += (s.out - l.out) * lw;
      l.bend += (s.bend - l.bend) * lw;
      if (lw > 0.5) Object.assign(l, { foot: s.foot, footYaw: s.footYaw, footRoll: s.footRoll, toe: s.toe });
    }
  }
  if (lw > 0.01) {
    deg.pose.bob += (fg.loco.pose.bob - deg.pose.bob) * lw;
    deg.pose.sway = (deg.pose.sway ?? 0) + ((fg.loco.pose.sway ?? 0) - (deg.pose.sway ?? 0)) * lw;
    // (the walk's legs are worked out on its own hips: square them to it as it takes over)
    deg.pose.turn = (deg.pose.turn ?? 0) + ((fg.loco.pose.turn ?? 0) - (deg.pose.turn ?? 0)) * lw;
  }
  deg.update();
  // ...the motion capture's legs and hips under the guard's upper body (the chest kept turned to the opponent)
  let yaw = f.yaw;
  if (mo && anim && fg.walk > 0) {
    const w = smooth(fg.walk);
    mo.anim.applyTo(deg.rig, anim.rot, anim.hips, w, 1, f.yaw - anim.face);
    yaw = f.yaw + wrap(anim.face - f.yaw) * w;
  }
  // The group turns about its origin (the feet); move it so the pitch turns about the root's pivot instead
  const { dy, dz } = rootShift(fg.pose.root);
  deg.g.position.set(f.x + Math.sin(f.yaw) * dz * FIGHTER_SCALE, fg.y + dy * FIGHTER_SCALE, f.z + Math.cos(f.yaw) * dz * FIGHTER_SCALE);
  deg.g.rotation.set(fg.pose.root.pitch, yaw, 0, 'YXZ');
}
