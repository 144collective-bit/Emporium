/*
 * Riding your motorbike (vehicle plan Phase 7): DOM-free, tested in
 * tests/bike.test.ts. A bike rides on the cars' rules (drive-sim.ts
 * `stepCar()`: arcade speed and braking, the bicycle steering, soft bumps,
 * the solids and the river walls), tuned as a bike (`tuneBike()`: narrow, so
 * its three circles slip through gaps a car can't; light and quick to answer,
 * rear-driven; the stats' range its own, the scooter slower than any car and
 * the sport bike as quick as the supercar), and adds what's a bike's own:
 *
 * - **The lean** (`leanTarget()`, `stepLean()`): into a turn by its speed and
 *   how fast it's turning, the way a real one balances (the pull of the turn
 *   against gravity), as far as its `most` and never further, so it never
 *   falls; eased in and out.
 * - **A foot down** (`footDown()`): slowing to a stop, the rider's left foot
 *   comes down and the bike rests a touch over onto it (`REST`).
 *
 * Positive lean tips its top towards its right (+z), the way a right turn
 * leans it.
 */
import { tune, type CarState, type DriveTune, type Feel } from './drive-sim';
import { BIKES, type BikeId } from './mybike';

/** Each bike's feel: light, rear-driven, quick at the bars; the scooter the gentlest */
export const BIKE_FEEL: Record<BikeId, Feel> = {
  scooter: { mass: 0.5, loose: 0.15, rwd: true, steerRate: 4.6, lock: 0.72 },
  streetbike: { mass: 0.55, loose: 0.3, rwd: true, steerRate: 4.8, lock: 0.68 },
  sportbike: { mass: 0.6, loose: 0.35, rwd: true, steerRate: 4.6, lock: 0.6 },
};

/** The lean: as far over as each bike goes (radians), and how quickly it follows (1/s) */
export const LEAN = { most: { scooter: 0.5, streetbike: 0.68, sportbike: 0.8 } as Record<BikeId, number>, rate: 7 };
/** Gravity in tiles a second squared (9.8 m/s², a tile about 1.8 m) */
export const G = 9.8 / 1.8;
/** Resting on the left foot: how far over, and under what speed the foot starts coming down (tiles/s) */
export const REST = { lean: -0.12, below: 1.2 };

/** A bike's handling from its 0..1 numbers (mods on): its own speed range, the cars' rules */
export function tuneBike(d: { speed: number; accel: number; grip: number }, id: BikeId): DriveTune {
  const s = BIKES[id];
  const t = tune(d, { L: s.L, W: s.W, wheelbase: s.axles[1] - s.axles[0] }, BIKE_FEEL[id]);
  return { ...t, top: 5 + d.speed * 11, accel: 3.6 + d.accel * 5.5, reverse: 1.6 };
}

const smooth = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));

/** How far the rider's foot is down: 1 stopped, 0 from `REST.below` up */
export const footDown = (s: CarState) => 1 - smooth(Math.abs(s.speed) / REST.below);

/** Where the lean is heading: into the turn by the pull of it, within its most, onto the foot as it stops */
export function leanTarget(s: CarState, id: BikeId) {
  const most = LEAN.most[id];
  const turn = Math.max(-most, Math.min(most, -Math.atan((s.speed * s.yawRate) / G)));
  const f = footDown(s);
  return turn * (1 - f) + REST.lean * f;
}

/** Ease the lean towards its target; never past its most */
export function stepLean(lean: number, s: CarState, id: BikeId, dt: number) {
  const most = LEAN.most[id];
  const next = lean + (leanTarget(s, id) - lean) * (1 - Math.exp(-LEAN.rate * Math.min(dt, 0.25)));
  return Math.max(-most, Math.min(most, next));
}
