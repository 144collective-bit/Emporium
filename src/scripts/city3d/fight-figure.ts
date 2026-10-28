/*
 * A fighter on screen: a Degen figure posed from the fight sim's state with
 * the clips in fight-anim.ts. Shared by the fight itself (fight.ts) and the
 * sparring demo (fight-demo.ts).
 *
 * How a fighter is drawn each frame (`drawFighter`):
 * - The clip the fighter's state calls for (`clipFor()` in fight-anim.ts: the
 *   fall, the ground, the get-up, a hit reaction, the move at the sim's own
 *   frame so the strike lands on the frame the rules say, the block, the
 *   guard), played by the fighter's poser (`createFightPoser()`: a change of
 *   clip carries over where the pose was and how fast it moved, eased out).
 * - The clip's pose on the figure, its feet on the canvas (fightground.ts:
 *   the revamp's Phase 7, the rubric found them floating over it and sinking
 *   into it), with the root it's drawn with.
 * - In the guard moving round the ring, its legs are the motion capture's
 *   (animator.ts, once walk mode has it: `motion`), the guard's upper body
 *   over them as the gun's is over the player's (`applyTo()`'s upper mask),
 *   so the feet step, not slide; until it's in (and in the `?fight` demo
 *   until its own copy is) the planted-feet walk (locomotion.ts).
 * - `root` (the lying pose's lift, back-rotation and the height it turns
 *   about, `rootShift()`) goes on the figure's group with the sim's x, z and
 *   yaw: the group is moved so the pitch turns about `(0, pivot, 0)` in the
 *   figure's space (the hips for the fall and the get-up, the feet otherwise).
 * - `manual` plays a clip by hand (the demo's clip picker) over the sim.
 */
import * as THREE from 'three';
import { createDegen, type Degen, type Outfit } from './character';
import { createLocomotion, type Locomotion } from './locomotion';
import { newMove, stepMove, type MoveState } from './movesim';
import type { Animator } from './animator';
import type { Motion } from './remote';
import { CLIPS, clipFor, createFightPoser, rootShift, type ClipId, type ClipPick, type FightPoser } from './fight-anim';
import type { Fighter } from './fight-sim';
import { FIGHTER_SCALE, figurePose, groundFighter } from './fightground';

export { FIGHTER_SCALE };
/** The legs round the ring come in over this and go back to the guard's over `LEGS_OUT` (seconds) */
const LEGS_IN = 0.12;
const LEGS_OUT = 0.2;
/** Further than this between two of the sim's ticks is a jump, not a step */
const JUMP = 0.6;
const smooth = (x: number) => x * x * (3 - 2 * x);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export interface FighterFigure {
  degen: Degen;
  /** The clip playing and the pose it gives (its `clip` and `frame` for the demo's readout) */
  poser: FightPoser;
  /** Moving round the ring: the legs from the planted-feet walk (locomotion.ts), weighed in over the guard's by `walk` */
  loco: Locomotion;
  walk: number;
  /** ...or from the motion capture, once walk mode has it (`motion`): its animator, fed where the fighter is drawn */
  motion: () => Motion | null;
  anim: Animator | null;
  move: MoveState | null;
  /** Where the fighter was at the sim's last tick, and how fast it went over the ticks before */
  last: { x: number; z: number; tick: number } | null;
  vel: { x: number; z: number };
  /** A clip being played by hand, with its frame */
  manual: { id: ClipId; frame: number } | null;
  /** The guard loop's own phase so two figures don't bounce in step */
  seed: number;
}

export function createFighterFigure(parent: THREE.Object3D, outfit: Outfit, low: boolean, seed = 0, motion: () => Motion | null = () => null): FighterFigure {
  const degen = createDegen({ ...outfit, fists: true }, low ? 1 : undefined);
  degen.g.scale.setScalar(FIGHTER_SCALE);
  parent.add(degen.g);
  return { degen, poser: createFightPoser(), loco: createLocomotion(), walk: 0, motion, anim: null, move: null, last: null, vel: { x: 0, z: 0 }, manual: null, seed };
}
export function disposeFigure(fg: FighterFigure) {
  fg.degen.g.removeFromParent();
  fg.degen.dispose();
}

/** Which clip and frame the figure plays: the one played by hand, or what the fighter's state calls for */
export const pickClip = (f: Fighter, fg: FighterFigure, ticks: number): ClipPick => fg.manual ?? clipFor(f, ticks, fg.seed);

/** Pose and place the figure from the fighter's state; `dt` 0 holds the frame */
export function drawFighter(fg: FighterFigure, f: Fighter, dt: number, ticks: number, overrideClip?: ClipPick) {
  const pick = overrideClip ?? pickClip(f, fg, ticks);
  if (fg.manual) {
    fg.manual.frame += dt * 60;
    if (!CLIPS[pick.id].loop && fg.manual.frame >= CLIPS[pick.id].frames + 20) fg.manual = null;
  }
  const pose = fg.poser.play(pick, dt);
  // How fast the fighter goes, over the sim's ticks (a frame can see none or two: the speed between them is
  // the last ticks'); a jump (a new fight, the demo's reset) gives none, and the animator starts afresh
  const jumped = !!fg.last && Math.hypot(f.x - fg.last.x, f.z - fg.last.z) > JUMP;
  if (!fg.last || jumped) fg.vel = { x: 0, z: 0 };
  else if (ticks > fg.last.tick) fg.vel = { x: ((f.x - fg.last.x) * 60) / (ticks - fg.last.tick), z: ((f.z - fg.last.z) * 60) / (ticks - fg.last.tick) };
  if (!fg.last || jumped || ticks !== fg.last.tick) fg.last = { x: f.x, z: f.z, tick: ticks };
  const vx = fg.vel.x;
  const vz = fg.vel.z;
  // Moving round the ring: the motion capture's legs under the guard (its animator's springs following the
  // velocity seen, facing the opponent, so it picks the strafes and the way back), or the planted-feet walk
  // (square to the opponent, as when armed) until it's in; either fades in over the guard's stance and back out
  const mo = fg.motion();
  if (mo && !fg.anim) {
    fg.anim = mo.anim.createAnimator(mo.data);
    fg.move = newMove(f.yaw);
  }
  if (jumped && fg.anim) {
    fg.anim.reset();
    fg.move = newMove(f.yaw);
  }
  const an = mo ? fg.anim : null;
  if (an && fg.move && dt > 0) {
    stepMove(fg.move, vx, vz, true, dt, f.yaw);
    an.update({ dt, x: f.x, y: 0, z: f.z, move: fg.move, gx: vx, gz: vz, scale: FIGHTER_SCALE, ground: () => 0, sprint: 0, grounded: true, vy: 0, faceGoal: f.yaw });
  } else if (dt > 0) fg.loco.update({ dt, t: ticks / 60, x: f.x, y: 0, z: f.z, vx, vz, face: f.yaw, grounded: true, vy: 0, scale: FIGHTER_SCALE, ground: () => 0, armed: true });
  // (the capture's legs stay in until both feet are down after the last step)
  const stepping = an ? an.feet.some((ft) => !ft.locked) : fg.loco.stepping;
  const walking = pick.id === 'guard' && (f.moving > 0.05 || stepping);
  if (dt > 0) fg.walk = an ? THREE.MathUtils.clamp(fg.walk + (walking ? dt / LEGS_IN : -dt / LEGS_OUT), 0, 1) : fg.walk + ((walking ? 1 : 0) - fg.walk) * Math.min(1, dt * 10);
  const deg = fg.degen;
  // The clip's pose on the figure (its head's turn over square hips), its feet on the canvas (fightground.ts) as
  // the figure is drawn (the lying poses' root and all)
  figurePose(pose, deg.pose);
  groundFighter(deg.pose, pose.root);
  if (!an && fg.walk > 0.01) {
    for (let i = 0; i < 2; i++) {
      // The walk's legs, weighed in (its feet's own turn once it has the legs)
      const w = fg.walk;
      const l = deg.pose.legs[i];
      const s = fg.loco.pose.legs[i];
      l.fwd += (s.fwd - l.fwd) * w;
      l.out += (s.out - l.out) * w;
      l.bend += (s.bend - l.bend) * w;
      if (w > 0.5) Object.assign(l, { foot: s.foot, footYaw: s.footYaw, footRoll: s.footRoll, toe: s.toe });
    }
    deg.pose.bob += (fg.loco.pose.bob - deg.pose.bob) * fg.walk;
    deg.pose.sway = (deg.pose.sway ?? 0) + ((fg.loco.pose.sway ?? 0) - (deg.pose.sway ?? 0)) * fg.walk;
    // (the walk's legs are worked out on its own hips: square them to it as it takes over)
    deg.pose.turn = (deg.pose.turn ?? 0) + ((fg.loco.pose.turn ?? 0) - (deg.pose.turn ?? 0)) * fg.walk;
  }
  deg.update();
  // The capture's legs and hips under the clip's upper body, the chest turned back to face the opponent
  // (the figure shown facing the way the capture turns it), as the gun's hold over the player's legs
  let yaw = f.yaw;
  if (mo && an && fg.walk > 0) {
    const w = smooth(fg.walk);
    mo.anim.applyTo(deg.rig, an.rot, an.hips, w, 1, f.yaw - an.face);
    yaw = f.yaw + wrap(an.face - f.yaw) * w;
  }
  // The group turns about its origin (the feet); move it so the pitch turns about the root's pivot instead
  const { dy, dz } = rootShift(pose.root);
  deg.g.position.set(f.x + Math.sin(f.yaw) * dz * FIGHTER_SCALE, dy * FIGHTER_SCALE, f.z + Math.cos(f.yaw) * dz * FIGHTER_SCALE);
  deg.g.rotation.set(pose.root.pitch, yaw, 0, 'YXZ');
}
