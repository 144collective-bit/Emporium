/*
 * The gaze (the revamp's Phase 2, docs/animation-revamp-plan.md; DOM-free,
 * tested in tests/gaze.test.ts): what a figure's head is drawn to, as a
 * turn of the head on top of whatever posed it.
 *
 * - Interests (`Interest`): things near him with a pull: a person passing,
 *   a car going by, a sign, the way he's about to turn. Within `reach` and
 *   inside the cone he could turn his head to (`fov` either side of the way
 *   he faces), each scores by its weight, how near it is and whether it's
 *   moving; one he's looked at lately scores nothing for `cooldown`.
 * - Every so often (`glanceEvery`: more often standing than moving) the
 *   best one past `threshold` takes his eye for a dwell (`dwell`), then his
 *   gaze comes back ahead; standing still with nothing to look at he looks
 *   round by himself (`lookRound`: a glance to one side, a hold, back).
 * - The way he's about to turn (`ahead`: the springs' facing a moment on)
 *   leads at once: his head turns into a bend before his body does.
 * - The head's turn is on springs (`turn`: a glance, not a snap: under 6
 *   rad/s), within the neck's reach (`yawMost`, `pitchMost`); a target that
 *   goes further round than that is let go.
 * - Seeded (`seed`), so a test (and a recording) is the same every time.
 *
 * `update()` gives the head's yaw and pitch relative to the body and `w`
 * (how much of a look it is, for a caller that blends it); the caller lays
 * it on with addLook().
 */
import { springVel, wrap } from './inertia';

export interface Interest {
  x: number;
  z: number;
  /** Its height to look at (world; the eye's height if not given) */
  y?: number;
  kind: 'person' | 'car' | 'sign' | 'thing';
  /** How much it draws the eye (1 a person) */
  weight?: number;
  moving?: boolean;
  /** Anything that tells it from the next one (the same thing isn't looked at twice running) */
  id?: string;
}

export interface GazeInput {
  dt: number;
  /** Where he stands and the eye's height (world), and the way the body faces (world yaw) */
  x: number;
  y: number;
  z: number;
  face: number;
  /** The way he'll be facing a moment on (the springs'; `face` if not given) */
  ahead?: number;
  /** His speed over the ground (tiles a second) */
  speed: number;
  interests: Interest[];
}

/** The numbers (tiles, seconds, radians) */
export const GAZE = {
  reach: 7,
  fov: 1.35,
  threshold: 0.3,
  dwell: [0.8, 2.4] as [number, number],
  cooldown: 7,
  /** How often a glance is considered: standing, and moving (seconds between) */
  glanceEvery: [2.5, 6] as [number, number],
  /** Standing with nothing to look at: a look round every so often, this far, for this long */
  lookRound: { every: [4, 9] as [number, number], yaw: [0.35, 0.7] as [number, number], hold: [0.9, 1.8] as [number, number] },
  /** The head leads a turn by this share of the turn ahead, past this much of it */
  lead: 0.6,
  leadFrom: 0.25,
  /** The neck's reach, and the springs' half-life */
  yawMost: 1.15,
  pitchMost: 0.45,
  turn: 0.14,
  /** Standing still (tiles a second) */
  still: 0.08,
};

/** A seeded random (the same sequence for the same seed) */
export function seeded(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface Target {
  yaw: number;
  pitch: number;
  until: number;
  id?: string;
}

export function createGaze(seed = 1) {
  const rnd = seeded(seed);
  const pick = (r: readonly [number, number]) => r[0] + (r[1] - r[0]) * rnd();
  let t = 0;
  let target: Target | null = null;
  let nextGlance = pick(GAZE.glanceEvery);
  let nextLook = pick(GAZE.lookRound.every);
  const seen = new Map<string, number>();
  let yaw = 0;
  let yawV = 0;
  let pitch = 0;
  let pitchV = 0;
  let w = 0;
  let wV = 0;

  /** The best interest to look at now, in his frame */
  function best(inp: GazeInput): Target | null {
    let top: Target | null = null;
    let topScore = GAZE.threshold;
    for (const i of inp.interests) {
      const dx = i.x - inp.x;
      const dz = i.z - inp.z;
      const d = Math.hypot(dx, dz);
      if (d > GAZE.reach || d < 0.3) continue;
      const rel = wrap(Math.atan2(dx, dz) - inp.face);
      if (Math.abs(rel) > GAZE.fov) continue;
      if (i.id && t - (seen.get(i.id) ?? -Infinity) < GAZE.cooldown) continue;
      const score = ((i.weight ?? 1) * (i.moving ? 1.5 : 1)) / (1 + d / 3);
      if (score > topScore) {
        topScore = score;
        top = { yaw: rel, pitch: Math.atan2((i.y ?? inp.y) - inp.y, d), until: t + pick(GAZE.dwell), id: i.id };
      }
    }
    return top;
  }

  function update(inp: GazeInput) {
    const dt = Math.min(inp.dt, 0.1);
    t += dt;
    const standing = inp.speed < GAZE.still;
    // A target that's gone round behind him, or whose dwell is over, is let go
    if (target && (t > target.until || Math.abs(target.yaw) > GAZE.yawMost)) target = null;
    // A new interest, every so often
    nextGlance -= dt;
    if (!target && nextGlance <= 0) {
      nextGlance = pick(GAZE.glanceEvery) * (standing ? 1 : 1.6);
      target = best(inp);
      if (target?.id) seen.set(target.id, t);
    }
    // Standing with nothing to look at: a look round
    if (standing) {
      nextLook -= dt;
      if (!target && nextLook <= 0) {
        nextLook = pick(GAZE.lookRound.every);
        target = { yaw: pick(GAZE.lookRound.yaw) * (rnd() < 0.5 ? -1 : 1), pitch: 0, until: t + pick(GAZE.lookRound.hold) };
      }
    } else nextLook = Math.max(nextLook, 1);
    // Where the head wants to be: the target, else leading the turn ahead, else ahead
    let wantYaw = 0;
    let wantPitch = 0;
    let wantW = 0;
    if (target) {
      wantYaw = target.yaw;
      wantPitch = target.pitch;
      wantW = 1;
    } else if (inp.ahead !== undefined) {
      const turn = wrap(inp.ahead - inp.face);
      if (Math.abs(turn) > GAZE.leadFrom) {
        wantYaw = turn * GAZE.lead;
        wantW = 1;
      }
    }
    wantYaw = Math.max(-GAZE.yawMost, Math.min(GAZE.yawMost, wantYaw));
    wantPitch = Math.max(-GAZE.pitchMost, Math.min(GAZE.pitchMost, wantPitch));
    [yaw, yawV] = springVel(yaw, yawV, wantYaw, GAZE.turn, dt);
    [pitch, pitchV] = springVel(pitch, pitchV, wantPitch, GAZE.turn, dt);
    [w, wV] = springVel(w, wV, wantW, GAZE.turn * 2, dt);
    return { yaw, pitch, w };
  }

  return {
    update,
    /** What he's looking at, for the lab */
    get target() {
      return target;
    },
    get yaw() {
      return yaw;
    },
    get pitch() {
      return pitch;
    },
    reset() {
      target = null;
      yaw = yawV = pitch = pitchV = w = wV = 0;
      seen.clear();
    },
  };
}
export type Gaze = ReturnType<typeof createGaze>;
