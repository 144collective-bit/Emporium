/*
 * Your car's suspension (vehicle plan Phase 2): DOM-free, tested in
 * tests/suspension.test.ts, and kept out of the boot (only carride.ts, the
 * cars' fine-detail chunk, reads it).
 *
 * Each wheel is on its own spring. The body rides on the four of them: its
 * heave (up and down), pitch (nose up positive) and roll (its top towards
 * the car's right, +z, positive) are where the springs' pull and the load
 * thrown onto them leave it. Every wheel follows the ground under it, up and
 * down in its arch, as far as its travel lets it:
 *
 * - **The ground:** the wheels' ground heights (`ground`, from the car's own
 *   height, the one drive.ts eases up the kerbs) give a plane the body is
 *   pulled to: a kerb under the left wheels lifts that side.
 * - **The load:** speeding up throws it onto the back (the nose lifts),
 *   braking onto the front (it dives), a turn onto the outside (the body
 *   leans out): `pitch` and `roll` per model, in radians for each tile a
 *   second squared.
 * - **The springs:** each way the body moves is a damped spring at the
 *   model's `hz`, `zeta` of critical (soft and floaty for the vans, tight
 *   for the coupes), stepped in small pieces so a slow frame can't upset it.
 * - **The travel:** a wheel more than `travel` from where the body is over
 *   it hits its stop, and the body is carried with it.
 */
import type { CarId, CarSpec } from './carspec';

export interface SpringTune {
  /** How quickly the body bobs (a second's worth of bounces) */
  hz: number;
  /** Its damping, a share of critical (1 doesn't bounce back past where it settles) */
  zeta: number;
  /** How far a wheel can move up or down in its arch (tiles) */
  travel: number;
  /** The lean out of a turn and the nose's lift under power, radians per tile/s² */
  roll: number;
  pitch: number;
  /** The most it leans or pitches (the bump stops) */
  most: number;
}

const T = (hz: number, zeta: number, travel: number, roll: number, pitch: number, most = 0.08): SpringTune => ({ hz, zeta, travel, roll, pitch, most });

/** Each model's springs: the city cars in the middle, the vans and the town car soft, the coupes and the supercar tight */
export const SPRINGS: Record<CarId, SpringTune> = {
  hatch: T(1.7, 0.5, 0.07, 0.013, 0.007),
  sedan: T(1.5, 0.5, 0.07, 0.014, 0.007),
  coupe: T(2.1, 0.6, 0.05, 0.009, 0.005),
  pickup: T(1.3, 0.42, 0.1, 0.017, 0.008, 0.09),
  van: T(1.25, 0.42, 0.09, 0.019, 0.008, 0.09),
  bus: T(1.1, 0.45, 0.08, 0.016, 0.006),
  muscle: T(1.6, 0.45, 0.07, 0.012, 0.009),
  suv: T(1.3, 0.42, 0.11, 0.018, 0.008, 0.09),
  super: T(2.4, 0.65, 0.045, 0.007, 0.004, 0.06),
  exec: T(1.2, 0.55, 0.08, 0.015, 0.006),
};

/** Where the wheels are under the body (cars.ts `wheelSpots()`'s order: each axle back to front, right then left) */
export function wheelsOf(s: CarSpec): [number, number][] {
  const z = s.W / 2 - s.tw / 2 + 0.02;
  return s.axles.flatMap((x): [number, number][] => [
    [x, z],
    [x, -z],
  ]);
}

export interface Springs {
  /** The body: heave (tiles), pitch (nose up) and roll (top to the right), and how fast each is changing */
  h: number;
  p: number;
  r: number;
  vh: number;
  vp: number;
  vr: number;
  /** Each wheel's height from where it sits at rest (wheelsOf's order) */
  wheels: number[];
}
export const newSprings = (): Springs => ({ h: 0, p: 0, r: 0, vh: 0, vp: 0, vr: 0, wheels: [0, 0, 0, 0] });

/** What the body feels this frame */
export interface SpringInput {
  /** Speeding up along the car (tiles/s²; braking is negative) */
  ax: number;
  /** Across it, towards its left (a left turn's pull: its speed times the yaw rate) */
  ay: number;
  /** The ground under each wheel from the car's own height (wheelsOf's order) */
  ground: number[];
}

/** The longest piece a frame is stepped in */
const STEP = 1 / 120;

/** The body's height over one wheel (x, z), from its heave, pitch and roll */
export const over = (sp: Springs, x: number, z: number) => sp.h + sp.p * x - sp.r * z;

/** Step the springs: `at` is wheelsOf()'s spots */
export function stepSprings(sp: Springs, t: SpringTune, at: [number, number][], inp: SpringInput, dt: number) {
  // The plane through the wheels' ground (least squares): its height, its slope along the car and across it
  let sx = 0;
  let sz = 0;
  let gh = 0;
  let gp = 0;
  let gr = 0;
  for (const [i, [x, z]] of at.entries()) {
    const g = inp.ground[i] ?? 0;
    gh += g / at.length;
    gp += g * x;
    gr -= g * z;
    sx += x * x;
    sz += z * z;
  }
  gp /= sx || 1;
  gr /= sz || 1;
  const pw = Math.max(-t.most, Math.min(t.most, gp + t.pitch * inp.ax));
  const rw = Math.max(-t.most, Math.min(t.most, gr + t.roll * inp.ay));
  const w = 2 * Math.PI * t.hz;
  const k = w * w;
  const c = 2 * t.zeta * w;
  for (let left = Math.min(dt, 0.25); left > 1e-6; left -= STEP) {
    const h = Math.min(STEP, left);
    sp.vh += (k * (gh - sp.h) - c * sp.vh) * h;
    sp.vp += (k * (pw - sp.p) - c * sp.vp) * h;
    sp.vr += (k * (rw - sp.r) - c * sp.vr) * h;
    sp.h += sp.vh * h;
    sp.p += sp.vp * h;
    sp.r += sp.vr * h;
  }
  // The stops: the body never more than `most` over, and never so far from the ground that a wheel's out of its arch
  if (Math.abs(sp.p) > t.most) (sp.p = Math.sign(sp.p) * t.most), (sp.vp = 0);
  if (Math.abs(sp.r) > t.most) (sp.r = Math.sign(sp.r) * t.most), (sp.vr = 0);
  let up = -Infinity;
  let down = Infinity;
  for (const [i, [x, z]] of at.entries()) {
    const d = (inp.ground[i] ?? 0) - over(sp, x, z);
    up = Math.max(up, d - t.travel);
    down = Math.min(down, d + t.travel);
  }
  // (a wheel pushed up past its stop lifts the body; one dropped further than it reaches pulls it down)
  if (up > 0) (sp.h += up), (sp.vh = Math.max(sp.vh, 0));
  else if (down < 0) (sp.h += down), (sp.vh = Math.min(sp.vh, 0));
  for (const [i, [x, z]] of at.entries()) {
    const b = over(sp, x, z);
    sp.wheels[i] = Math.max(b - t.travel, Math.min(b + t.travel, inp.ground[i] ?? 0));
  }
  return sp;
}
