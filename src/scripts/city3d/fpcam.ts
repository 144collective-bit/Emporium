/*
 * How the eye moves in first person (docs/firstperson-plan.md, Phase 0; the
 * owner's call: grounded and subtle). One set of rules for every first-
 * person view (on foot, the ring, the car, the bike, the kart, the boat, the
 * cockpit), each with its own gains (`FP_FEEL`), all within `FP_MOST`:
 *
 * - the bob: a share of the step's or the springs' rise and fall;
 * - the lurch: the head pitched by speeding up (back) and braking (forward);
 * - the sway: tilted by a sideways pull, outwards in a turn;
 * - the lead: the eyes looking a little into a turn, ahead of the nose;
 * - the field of view opening a little with speed;
 * - jolts (a hit, a landing, a bump): a dip that springs back, no bounce.
 *
 * Every value is a critically damped spring (inertia.ts), so the eye never
 * snaps, and it's the same at 30 and 144 frames a second. Under reduced
 * motion everything is zero. DOM-free, tested in tests/fpcam.test.ts; the
 * views read `FpView` and lay it on their own camera.
 */
import { decay, springVel } from './inertia';

export type FpMode = 'foot' | 'ring' | 'car' | 'bike' | 'kart' | 'boat' | 'plane';

export interface FpFeel {
  /** Share of the given bob the eye takes */
  bob: number;
  /** Pitch (rad) per unit of forward acceleration (tiles a second, a second) */
  lurch: number;
  /** Roll (rad) per unit of sideways acceleration */
  sway: number;
  /** Look into a turn (rad) per rad a second of turning */
  lead: number;
  /** Degrees added to the field of view at top speed */
  fov: number;
  /** The springs' half-life, s */
  half: number;
}

/** Never more than this, whatever the mode or the input: the owner's "subtle" */
export const FP_MOST = { y: 0.04, pitch: 0.035, roll: 0.03, yaw: 0.14, fov: 6 };

export const FP_FEEL: Record<FpMode, FpFeel> = {
  // On foot the motion capture's hips already bob the eye (walk.ts FP_BOB): a light lurch into starts and stops
  foot: { bob: 1, lurch: 0.0012, sway: 0.0008, lead: 0.04, fov: 4, half: 0.12 },
  // In the ring: steadier, so the opponent's tells read; jolts do the work
  ring: { bob: 0.6, lurch: 0.0008, sway: 0.0006, lead: 0.02, fov: 0, half: 0.1 },
  car: { bob: 0.8, lurch: 0.0022, sway: 0.0016, lead: 0.07, fov: 5, half: 0.15 },
  // The bike's lean tips the whole view already (drive.ts): no sway of its own
  bike: { bob: 0.6, lurch: 0.0016, sway: 0, lead: 0.05, fov: 6, half: 0.12 },
  kart: { bob: 1, lurch: 0.0026, sway: 0.0022, lead: 0.06, fov: 6, half: 0.1 },
  boat: { bob: 0.7, lurch: 0.002, sway: 0.0012, lead: 0.05, fov: 3, half: 0.25 },
  plane: { bob: 0.3, lurch: 0.0008, sway: 0.0005, lead: 0.03, fov: 4, half: 0.3 },
};

/** A jolt: how far a full one (k = 1) dips the eye and pitches it, and how quickly it's back */
export const JOLT = { y: 0.9, pitch: 0.8, half: 0.07 };

export interface FpInput {
  /** Speed now and the top speed it's measured against (any units, the same) */
  speed: number;
  top: number;
  /** Acceleration along the way he faces (+ speeding up) and across it (+ to his right), tiles a second, a second */
  fwd: number;
  side: number;
  /** How fast he's turning, rad a second (either sign: the lead takes the same) */
  turn: number;
  /** The rise and fall to take a share of (tiles) */
  bob: number;
  reduced: boolean;
}

export interface FpView {
  /** The eye raised (tiles; under 0 lowered) */
  y: number;
  /** Pitch (rad, + up), roll (rad, + the head tipped to its right), yaw (rad, the turn's sign) */
  pitch: number;
  roll: number;
  yaw: number;
  /** Degrees added to the field of view */
  fov: number;
}

export interface FpCam {
  /** The springs: [value, rate] for each */
  pitch: [number, number];
  roll: [number, number];
  yaw: [number, number];
  y: [number, number];
  fov: [number, number];
  /** The jolt's dip and pitch, decaying */
  jy: [number, number];
  jp: [number, number];
  out: FpView;
}

const pair = (): [number, number] => [0, 0];
export const newFpCam = (): FpCam => ({ pitch: pair(), roll: pair(), yaw: pair(), y: pair(), fov: pair(), jy: pair(), jp: pair(), out: { y: 0, pitch: 0, roll: 0, yaw: 0, fov: 0 } });

const clamp = (x: number, m: number) => Math.max(-m, Math.min(m, x));
const finite = (x: number) => (Number.isFinite(x) ? x : 0);

/** A jolt of strength `k` (0..1; a landing, a hit, a bump): a dip and a nod that spring back */
export function joltFp(s: FpCam, k: number) {
  const j = Math.max(0, Math.min(1, finite(k)));
  s.jy[1] -= j * JOLT.y;
  s.jp[1] -= j * JOLT.pitch;
}

/** The eye after `dt` seconds of `inp` in `mode` (`s.out`, also returned) */
export function stepFp(s: FpCam, mode: FpMode, inp: FpInput, dt: number): FpView {
  const o = s.out;
  if (inp.reduced) {
    Object.assign(s, newFpCam(), { out: o });
    o.y = o.pitch = o.roll = o.yaw = o.fov = 0;
    return o;
  }
  const f = FP_FEEL[mode];
  const h = f.half;
  const t = Math.max(0, Math.min(0.25, finite(dt)));
  const goal = {
    pitch: clamp(f.lurch * finite(inp.fwd), FP_MOST.pitch),
    roll: clamp(-f.sway * finite(inp.side), FP_MOST.roll),
    yaw: clamp(f.lead * finite(inp.turn), FP_MOST.yaw),
    y: clamp(f.bob * finite(inp.bob), FP_MOST.y),
    fov: f.fov * Math.max(0, Math.min(1, inp.top > 0 ? finite(inp.speed) / inp.top : 0)),
  };
  for (const k of ['pitch', 'roll', 'yaw', 'fov'] as const) s[k] = springVel(s[k][0], s[k][1], goal[k], h, t);
  // (the bob follows its own rise and fall closely: it's already a motion)
  s.y = springVel(s.y[0], s.y[1], goal.y, h * 0.25, t);
  s.jy = decay(s.jy[0], s.jy[1], JOLT.half, t);
  s.jp = decay(s.jp[0], s.jp[1], JOLT.half, t);
  o.y = clamp(s.y[0] + s.jy[0], FP_MOST.y);
  o.pitch = clamp(s.pitch[0] + s.jp[0], FP_MOST.pitch);
  o.roll = clamp(s.roll[0], FP_MOST.roll);
  o.yaw = clamp(s.yaw[0], FP_MOST.yaw);
  o.fov = Math.max(0, Math.min(FP_MOST.fov, s.fov[0]));
  return o;
}
