/*
 * The observation wheel on Uptown's esplanade (docs/finance-plan.md Phase 7
 * step 5, the owner's pick; DOM-free, tested in tests/wheel.test.ts), drawn
 * by wheel3d.ts in Uptown's chunk. Scenery only: it turns, nobody rides it.
 *
 * - **The wheel** (`WHEEL`): its rim turns in a plane along the river's edge,
 *   between the axis's overlook and the one-way pair's crossing, its hub on an
 *   axle between two A-frames either side of the rim, so the walk and the
 *   joggers along the esplanade pass on its avenue side (`WALK_PAST`);
 *   capsules hanging level from the rim (`capsuleAt()`, the same for
 *   everyone: a function of the clock, one turn in `WHEEL.period`), the
 *   lowest just over the boarding platform. Like
 *   Uptown's towers it rises over the Emporium (its top `WHEEL_TOP`), well
 *   under what flies over.
 * - **The boulevard keeps off** (`WHEEL_RECT`: boulevard.ts's trees and
 *   benches), and its boarding platform, the A-frames' feet and the ticket
 *   booth are solid (`WHEEL_SOLIDS`).
 */
import { RIVER } from './layout';
import { ROWS_Z, type Pt, type Rect } from './uptown';

const BANK = ROWS_Z[ROWS_Z.length - 1];
/** The esplanade's avenue side (its kerb) and its river edge (the rail) */
const KERB = BANK.c + BANK.half;
// (boulevard.ts's `OUT`: it reads this module, so the number is here too; the tests hold the wheel on its esplanade)
const EDGE = RIVER[0] + 3;

/**
 * x, z: the hub (z the rim's plane, along the river's edge); hub: its height over the deck; r: the rim's radius;
 * capsules: how many; period: seconds a turn; feet: the two A-frames' feet, either side of the hub (dx) and either
 * side of the rim (dz, the A-frames meeting the axle's ends at `top` from the rim's plane)
 */
export const WHEEL = {
  x: -123,
  z: EDGE - 1.1,
  hub: 11.7,
  r: 10,
  capsules: 20,
  period: 360,
  feet: { dx: 6, dz: 0.8, top: 0.8 },
  /** half the gap between its two rings (the capsules hang between them) */
  half: 0.55,
};
/** A capsule: its size and how far under its pin on the rim its middle hangs */
export const CAPSULE = { w: 1.2, h: 1.1, d: 0.8, hang: 0.75 };
/** The boarding platform under the wheel's foot (x0, z0, x1, z1, height), the ticket booth across the walk by the avenue's kerb (between the planters) */
export const PLATFORM: [number, number, number, number, number] = [WHEEL.x - 2.6, WHEEL.z - 0.7, WHEEL.x + 2.6, EDGE - 0.15, 0.3];
export const BOOTH: Rect = [WHEEL.x + 2, KERB + 0.2, WHEEL.x + 3.4, KERB + 0.95];
/** Its highest point over the deck (the top capsule's pin over the rim) */
export const WHEEL_TOP = WHEEL.hub + WHEEL.r + 0.3;
/** The rim's angle at time t (seconds): one turn every `period`, the same for everyone */
export const wheelAngle = (t: number) => ((t % WHEEL.period) / WHEEL.period) * Math.PI * 2;
/** Capsule i's middle at time t (x, y over the deck); its z is the rim's plane */
export function capsuleAt(i: number, t: number): Pt {
  const a = wheelAngle(t) + (i / WHEEL.capsules) * Math.PI * 2;
  return [WHEEL.x + Math.cos(a) * WHEEL.r, WHEEL.hub + Math.sin(a) * WHEEL.r - CAPSULE.hang];
}
/** What it covers on the esplanade (the boulevard's trees and benches keep off) */
export const WHEEL_RECT: Rect = [WHEEL.x - WHEEL.r - 1, WHEEL.z - WHEEL.feet.dz - 0.6, WHEEL.x + WHEEL.r + 1, EDGE];
/** (the walk past it, between the booth and the wheel's feet) */
export const WALK_PAST = WHEEL.z - WHEEL.feet.dz - 0.22 - BOOTH[3];

type Box = [number, number, number, number, number];
export const WHEEL_SOLIDS: Box[] = [
  // (the platform with its rail: nobody walks in under the capsules)
  [PLATFORM[0], PLATFORM[1], PLATFORM[2], PLATFORM[3], 1.0],
  [BOOTH[0], BOOTH[1], BOOTH[2], BOOTH[3], 2.4],
  ...[-1, 1].flatMap((s) => [-1, 1].map((t): Box => [WHEEL.x + s * WHEEL.feet.dx - 0.22, WHEEL.z + t * WHEEL.feet.dz - 0.22, WHEEL.x + s * WHEEL.feet.dx + 0.22, WHEEL.z + t * WHEEL.feet.dz + 0.22, 3])),
];
