/*
 * How Degen moves, apart from how he looks (DOM-free, tested in
 * tests/movesim.test.ts): his velocity on a critically damped spring
 * towards what the stick asks, his facing on another, and where that will
 * take him (`ahead()`): the trajectory the animation is matched to
 * (motionmatch.ts). Starting, stopping and turning get a real shape and a
 * real distance from the springs' half-lives (`MOVE`), and anything that
 * leans on them (the bank into a bend) reads the springs, not frame-to-
 * frame differences, so a wobbling stick never twitches the body.
 *
 * Numbers in the world's (tiles, seconds); yaw 0 faces +z.
 */
import { springAhead, springAngle, springVel, wrap } from './inertia';

/**
 * His speeds (tiles a second; a tile is about 1.8 m, his hips 0.95 m up):
 * a walk (Caps Lock), the run he goes at by default and the sprint (Shift).
 * The walk and run are the captured actor's own; the sprint is the run
 * played faster with longer strides and harder drive (animator.ts).
 */
export const GAITS = { walk: 1.25, run: 3.4, sprint: 5 };

/** The springs' half-lives (seconds): speeding up, slowing down, turning to face, and the little control there is in the air */
export const MOVE = { accel: 0.11, stop: 0.1, face: 0.075, air: 0.9 };

export interface MoveState {
  vx: number;
  vz: number;
  ax: number;
  az: number;
  face: number;
  /** The facing's turn rate (radians a second) */
  w: number;
}
export const newMove = (face = 0): MoveState => ({ vx: 0, vz: 0, ax: 0, az: 0, face, w: 0 });

/** The half-life heading for `gx, gz` from `s`: slowing down or speeding up */
export function halflife(s: MoveState, gx: number, gz: number, grounded: boolean) {
  if (!grounded) return MOVE.air;
  return gx * gx + gz * gz < s.vx * s.vx + s.vz * s.vz ? MOVE.stop : MOVE.accel;
}

/** The way to face for a goal velocity (where you're going, or as you were when there's none) */
export const faceFor = (s: MoveState, gx: number, gz: number) => (gx * gx + gz * gz > 0.01 ? Math.atan2(gx, gz) : s.face);

/** One step towards the goal velocity, facing where it goes (or `faceGoal`) */
export function stepMove(s: MoveState, gx: number, gz: number, grounded: boolean, dt: number, faceGoal = faceFor(s, gx, gz)) {
  const h = halflife(s, gx, gz, grounded);
  [s.vx, s.ax] = springVel(s.vx, s.ax, gx, h, dt);
  [s.vz, s.az] = springVel(s.vz, s.az, gz, h, dt);
  [s.face, s.w] = springAngle(s.face, s.w, faceGoal, MOVE.face, dt);
  s.face = wrap(s.face);
}

/** Where the springs will have taken him `t` from now (relative to where he is) and the way he'll face */
export function ahead(s: MoveState, gx: number, gz: number, t: number, out: { x: number; z: number; face: number }, faceGoal = faceFor(s, gx, gz)) {
  const h = halflife(s, gx, gz, true);
  out.x = springAhead(s.vx, s.ax, gx, h, t);
  out.z = springAhead(s.vz, s.az, gz, h, t);
  out.face = springAngle(s.face, s.w, faceGoal, MOVE.face, t)[0];
  return out;
}

/** The sideways pull of a bend (tiles a second²): speed times turn rate, for the lean into it */
export const bendPull = (s: MoveState) => Math.hypot(s.vx, s.vz) * s.w;
