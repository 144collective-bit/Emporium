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
 * a walk (Caps Lock, about 1.4 m/s), the run he goes at by default (about
 * 5 m/s) and the sprint (Shift, about 7.5 m/s). The captures run at 3-4 m/s;
 * the animator (animator.ts) makes up the rest a little in cadence and
 * mostly in longer strides, as a runner does (the owner's call, after the
 * capture's double-speed timing was fixed: quick but believable).
 */
export const GAITS = { walk: 0.78, run: 2.8, sprint: 4.2 };

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

/**
 * The slide (animation Phase 5: crouch while sprinting): from going at least
 * `min` tiles a second, off at `start` times the speed he had, the way he
 * was going, slowing by `friction` tiles a second² and steering at most
 * `steer` radians a second towards the stick, until he's down to `end` or
 * it's been `most` seconds
 */
export const SLIDE = { min: 3.4, start: 1.08, friction: 3.4, end: 1.5, most: 1.1, steer: 0.9 };
export interface Slide {
  /** Seconds since it started, how fast he's going and which way (yaw) */
  t: number;
  v: number;
  dir: number;
}
/** Into a slide from the springs as they are, if he's going fast enough */
export function startSlide(s: MoveState): Slide | null {
  const v = Math.hypot(s.vx, s.vz);
  return v < SLIDE.min ? null : { t: 0, v: v * SLIDE.start, dir: Math.atan2(s.vx, s.vz) };
}
/** One step of a slide, the springs carried along with it (so he runs or stops on from where it leaves him); false once it's over */
export function stepSlide(sl: Slide, s: MoveState, gx: number, gz: number, dt: number) {
  sl.t += dt;
  sl.v = Math.max(0, sl.v - SLIDE.friction * dt);
  if (gx * gx + gz * gz > 0.01) {
    const turn = wrap(Math.atan2(gx, gz) - sl.dir);
    sl.dir = wrap(sl.dir + Math.sign(turn) * Math.min(Math.abs(turn), SLIDE.steer * dt));
  }
  s.vx = Math.sin(sl.dir) * sl.v;
  s.vz = Math.cos(sl.dir) * sl.v;
  s.ax = s.az = s.w = 0;
  s.face = sl.dir;
  return sl.v > SLIDE.end && sl.t < SLIDE.most;
}

/**
 * Stairs (the revamp's Phase 2): the takes tagged `tag` (subject 122 walking up three steps) are searched
 * only while climbing: the ground `ahead` tiles on (scaled) is `rise` or more higher than here and still
 * rising at twice that (a kerb is one step and then flat), going slower than `fast` tiles a second (walk
 * mode's climbing pace, `walk`, is under it; a brisk climb or a run up stairs keeps the run, the lock
 * putting its feet on the treads as before: faster than the takes' climb a held foot stretched and
 * snapped); never otherwise. Their climbing frames are those whose floor rises `step` (rig numbers)
 * over the next `look` frames or rose over the last `back`; once on one the search needs `margin`
 * better to leave it (the climbs are short: at the usual margin a take flipped to its mirror every
 * half second). Walk mode slows a climb to `walk` tiles a second walking and `run` running (a brisk
 * climb: nobody runs up stairs flat out).
 */
export const STAIRS = { tag: 'stairs', ahead: 0.6, rise: 0.08, fast: 0.6, look: 12, back: 6, step: 0.03, margin: 0.6, walk: 0.45, run: 1.6 };
/** Whether the ground ahead along (dx, dz) climbs like stairs from (x, z) at height y (STAIRS) */
export function climbAhead(ground: (x: number, z: number, y: number) => number, x: number, z: number, y: number, dx: number, dz: number, scale: number) {
  const l = Math.hypot(dx, dz) || 1;
  const ux = (dx / l) * STAIRS.ahead * scale;
  const uz = (dz / l) * STAIRS.ahead * scale;
  const g0 = ground(x, z, y + 0.3);
  const g1 = ground(x + ux, z + uz, y + 0.3);
  const g2 = ground(x + ux * 2, z + uz * 2, y + 0.3);
  return g1 - g0 >= STAIRS.rise * scale && g2 - g0 >= STAIRS.rise * scale * 1.5;
}
