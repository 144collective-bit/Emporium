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
 *   hold loops). Walking: the guard with the legs from `walkPose`. Else
 *   the `guard` loop.
 * - A change of clip crossfades over a few frames (`blendPose`).
 * - `root` (the lying pose's lift, back-rotation and the height it turns
 *   about, `rootShift()`) goes on the figure's group with the sim's x, z and
 *   yaw: the group is moved so the pitch turns about `(0, pivot, 0)` in the
 *   figure's space (the hips for the fall and the get-up, the feet otherwise).
 * - `manual` plays a clip by hand (the demo's clip picker) over the sim.
 */
import * as THREE from 'three';
import { createDegen, walkPose, type Degen, type Limb, type Outfit } from './character';
import { CLIPS, blendPose, hurtClip, hurtMirror, moveClip, newFightPose, rootShift, sampleClip, type ClipId, type FightPose } from './fight-anim';
import { T, type Fighter } from './fight-sim';

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
  walk: number;
  /** A clip being played by hand, with its frame */
  manual: { id: ClipId; frame: number } | null;
  /** The guard loop's own phase so two figures don't bounce in step */
  seed: number;
}

export function createFighterFigure(parent: THREE.Object3D, outfit: Outfit, low: boolean, seed = 0): FighterFigure {
  const degen = createDegen({ ...outfit, fists: true }, low ? 1 : 2);
  degen.g.scale.setScalar(FIGHTER_SCALE);
  parent.add(degen.g);
  return { degen, pose: newFightPose(), prev: newFightPose(), tmp: newFightPose(), clip: null, mirror: false, frame: 0, fade: 0, walk: 0, manual: null, seed };
}
export function disposeFigure(fg: FighterFigure) {
  fg.degen.g.removeFromParent();
  fg.degen.dispose();
}

const walkTmp = newFightPose();
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
  // Walking: the legs from the walk cycle under the guard
  if (id === 'guard' && f.moving > 0.05) {
    fg.walk += dt * 7 * f.moving;
    walkPose(walkTmp, fg.walk, Math.min(1, f.moving), 0, 0);
    for (let i = 0; i < 2; i++) copyLimb(fg.pose.legs[i], walkTmp.legs[i]);
    fg.pose.bob += walkTmp.bob;
  }
  if (fg.fade > 0) {
    fg.fade -= dt * 60;
    const k = 1 - Math.max(0, fg.fade) / FADE;
    blendPose(fg.prev, fg.pose, k, fg.tmp);
    copyPose(fg.tmp, fg.pose);
  }
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
  for (let i = 0; i < 2; i++) {
    copyLimb(deg.pose.arms[i], fg.pose.arms[i]);
    copyLimb(deg.pose.legs[i], fg.pose.legs[i]);
  }
  deg.update();
  // The group turns about its origin (the feet); move it so the pitch turns about the root's pivot instead
  const { dy, dz } = rootShift(fg.pose.root);
  deg.g.position.set(f.x + Math.sin(f.yaw) * dz * FIGHTER_SCALE, dy * FIGHTER_SCALE, f.z + Math.cos(f.yaw) * dz * FIGHTER_SCALE);
  deg.g.rotation.set(fg.pose.root.pitch, f.yaw, 0, 'YXZ');
}
