/*
 * The Neon Mile's moving sounds (docs/strip-plan.md Phase 7), DOM-free (tested in tests/stripsound.test.ts): how loud,
 * at a listener's x, z and the clock, Big City's coaster is (its wheels rattling by its speed, the chain's clatter as
 * it climbs, its riders screaming down the drops) and the monorail's train is (a hum as it runs over the bank
 * avenue's median, a softer one standing at a station). The coaster and the train are where resorts3d.ts and
 * monorail3d.ts draw them on the same clock (`coasterAt()`, `COASTER_LAP`, `monoAt()`), so each is heard where it's
 * seen. sound.ts (its own chunk) turns them into sound; the party bus's beat is the traffic's (life.ts).
 */
import { COASTER_LAP, SLAB_Y, coasterAt } from './resorts';
import { FLOOR, MONO, monoAt } from './monorail';

/** How far off each is heard (tiles) */
export const COASTER_HEARD = 55;
export const MONO_HEARD = 45;
/** The coaster's speed (tiles a second) its rattle calls full: about its fastest */
export const COASTER_FAST = 8;
/** Climbing faster than this (tiles a second up) the chain clatters; dropping faster than this, the riders scream */
export const CLIMB = 1.5;
export const DROP = 2.5;

export interface StripNoise {
  /** The coaster's wheels on the track, 0-1 (near and fast) */
  rattle: number;
  /** The lift chain's clatter while it climbs, 0-1 */
  clatter: number;
  /** The riders screaming down a drop, 0-1 */
  scream: number;
  /** The monorail's hum, 0-1 (running; a third of it standing at a station) */
  mono: number;
}

const near = (d: number, heard: number) => Math.max(0, 1 - d / heard);

/** The Strip's moving sounds heard at (x, z) at the clock's t (seconds) */
export function stripNoise(x: number, z: number, t: number): StripNoise {
  // The coaster: its lead car where it's drawn, and how it's moving over the next tenth of a second
  const u = (((t / COASTER_LAP) % 1) + 1) % 1;
  const a = coasterAt(u);
  const b = coasterAt(u + 0.1 / COASTER_LAP);
  const v = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 0.1;
  const vy = (b[1] - a[1]) / 0.1;
  const c = near(Math.hypot(a[0] - x, a[2] - z, SLAB_Y + a[1] - 1.6), COASTER_HEARD);
  // The monorail's train, over the median at its floor
  const m = monoAt(t);
  const h = near(Math.hypot(m.x - x, MONO.z - z, FLOOR - 1.6), MONO_HEARD);
  return {
    rattle: c * Math.min(1, v / COASTER_FAST),
    clatter: vy > CLIMB ? c : 0,
    scream: vy < -DROP ? c * Math.min(1, -vy / (DROP * 2)) : 0,
    mono: h * (m.stopped ? 0.33 : 1),
  };
}
