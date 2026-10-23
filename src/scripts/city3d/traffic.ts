/*
 * How the traffic behaves (city life plan, Phase 1): the rules life.ts
 * draws on the cars it already has. DOM-free and tested
 * (tests/traffic.test.ts), like the sims.
 *
 * - A route's turns (`turnsOf()`): where its heading swings round within a
 *   few tiles, and which way, so a car can indicate before it (`indicating()`).
 *   A long gentle bend (the ring highway's corners) isn't a turn.
 * - Pulling away (`pullAway()`): a car that has stopped waits its own
 *   reaction time before it moves off, so a queue peels from the front.
 * - Brake lights (`braking()`): lit while a car is slowing or holding at a
 *   stop.
 * - The body (`bodyMotion()`): a nod under braking and a lean in turns, from
 *   the car's own speed and heading.
 * - The horn (`hornDue()`): a car held up by you toots after a couple of
 *   seconds, then again now and then.
 *
 * Units are tiles and seconds. Yaw is three.js's rotation about y: a car
 * faces +x at 0, its left side at -z; turning left raises the yaw.
 */
import type { Pt } from './routes';

/** Where a route turns: from the start of the swing to its end (distances along the route), and which way */
export interface Turn {
  from: number;
  to: number;
  dir: 'L' | 'R';
}

/** A swing of at least this (radians) over at most TURN_LEN tiles is a turn a car indicates for */
export const TURN_SWING = 0.6;
export const TURN_LEN = 20;
/** How far before a turn the indicator starts */
export const TURN_LEAD = 5;

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * The turns along a polyline (`pts` with their cumulative distances `cum`, as a Route carries them):
 * runs of heading change the same way, taken together, that add up to a real corner within a few tiles
 */
export function turnsOf(pts: Pt[], cum: number[]): Turn[] {
  const out: Turn[] = [];
  // The heading of each segment (zero-length ones skipped: they'd have none)
  const segs: { h: number; i: number }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0];
    const dz = pts[i + 1][1] - pts[i][1];
    if (Math.hypot(dx, dz) < 1e-6) continue;
    segs.push({ h: Math.atan2(dz, dx), i });
  }
  let run: { start: number; end: number; sum: number } | null = null;
  const close = () => {
    // (a sharp corner at a single point still spans a tile, so a car is indicating as it goes round)
    if (run && Math.abs(run.sum) >= TURN_SWING && cum[run.end] - cum[run.start] <= TURN_LEN) out.push({ from: cum[run.start], to: Math.max(cum[run.end], cum[run.start] + 1), dir: run.sum < 0 ? 'L' : 'R' });
    run = null;
  };
  for (let k = 1; k < segs.length; k++) {
    const d = wrap(segs[k].h - segs[k - 1].h);
    const at = segs[k].i;
    if (Math.abs(d) < 0.02) {
      // Straight on: a turn ends once the road has run straight for a tile or so
      if (run && cum[at] - cum[run.end] > 1.5) close();
      continue;
    }
    if (run && Math.sign(d) !== Math.sign(run.sum)) close();
    if (!run) run = { start: at, end: at, sum: 0 };
    run.sum += d;
    run.end = at;
  }
  close();
  // One turn ends where the next begins (an S through a junction: a right straight into a left)
  for (let i = 1; i < out.length; i++) out[i - 1].to = Math.min(out[i - 1].to, out[i].from);
  return out;
}

/**
 * Which way a car at `p` along a route of length `len` is indicating, if any: from TURN_LEAD before a turn to
 * its end; the turn it's in before the one it's coming up to (two turns close together, one after the other)
 */
export function indicating(turns: Turn[], p: number, len: number): 'L' | 'R' | null {
  for (const lead of [0, TURN_LEAD])
    for (const t of turns) {
      for (const q of [p, p + len, p - len]) if (q >= t.from - lead && q <= t.to) return t.dir;
    }
  return null;
}

/** Is an indicator lit at time t (1.5 flashes a second; `phase` 0..1 so cars don't flash together)? */
export const blinkOn = (t: number, phase = 0) => ((t * 1.5 + phase) % 1 + 1) % 1 < 0.5;

/** A car's own reaction time at a stop (seconds), from its number in the traffic */
export const reactionOf = (i: number) => 0.3 + 0.6 * (((i + 1) * 0.618034) % 1);

/** A car pulling away from a stop */
export interface Mover {
  /** Its speed */
  v: number;
  /** How long it has wanted to go */
  held: number;
  /** Its reaction time */
  react: number;
}

/**
 * The speed a stopped car may aim for: nothing until it has wanted to go for its reaction time, then
 * `target`. Once rolling, the wait is forgotten until it next stops.
 */
export function pullAway(m: Mover, target: number, dt: number): number {
  if (m.v < 0.05) {
    if (target > 0.3) {
      m.held += dt;
      if (m.held < m.react) return 0;
    } else m.held = 0;
  } else if (m.v > 0.5) m.held = 0;
  return target;
}

/** Are the brake lights on: slowing, or holding at a stop? */
export const braking = (v: number, target: number) => target < v - 0.15 || (v < 0.05 && target < 0.3);

/** A car's body on its wheels: nose down under braking, leaning out of a turn */
export interface Body {
  /** Rotation about the car's z (negative is nose down) */
  pitch: number;
  /** Rotation about the car's x (positive is the right side down) */
  roll: number;
  lastV: number;
  lastYaw: number;
}

export const newBody = (v: number, yaw: number): Body => ({ pitch: 0, roll: 0, lastV: v, lastYaw: yaw });
export const PITCH_MAX = 0.05;
export const ROLL_MAX = 0.06;

/** Ease the body towards what this frame's speed and heading ask for */
export function bodyMotion(b: Body, v: number, yaw: number, dt: number) {
  if (dt <= 0) return;
  const a = (v - b.lastV) / dt;
  const yawRate = wrap(yaw - b.lastYaw) / dt;
  b.lastV = v;
  b.lastYaw = yaw;
  const wantPitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, a * 0.012));
  const wantRoll = Math.max(-ROLL_MAX, Math.min(ROLL_MAX, yawRate * v * 0.012));
  const k = 1 - Math.exp(-6 * dt);
  b.pitch += (wantPitch - b.pitch) * k;
  b.roll += (wantRoll - b.roll) * k;
}

/** Put the body level and forget the last frame (a car put back on the road somewhere else) */
export function resetBody(b: Body, v: number, yaw: number) {
  b.pitch = b.roll = 0;
  b.lastV = v;
  b.lastYaw = yaw;
}

/** A car's horn */
export interface Horn {
  /** How long it has been held up */
  held: number;
  /** When it next toots (seconds held up) */
  next: number;
}

export const HORN_FIRST = 2.2;
export const newHorn = (seed = 0): Horn => ({ held: 0, next: HORN_FIRST + seed * 1.2 });

/** Does the car toot this frame? `heldUp`: stopped behind someone in the road. */
export function hornDue(h: Horn, heldUp: boolean, dt: number, seed = 0): boolean {
  if (!heldUp) {
    h.held = 0;
    h.next = HORN_FIRST + seed * 1.2;
    return false;
  }
  h.held += dt;
  if (h.held < h.next) return false;
  // Again in a while (a little longer each time)
  h.next += 5 + seed * 4;
  return true;
}
