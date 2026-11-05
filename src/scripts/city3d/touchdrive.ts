/**
 * Two thumbs at the wheel on a touch screen (the owner's call: "simple, two finger touch points always available,
 * never interrupting each other"). One thumb steers, the other works the pedals, each followed by its own finger and
 * never by the other's:
 * - **the floating stick**: at the wheel a thumb landing anywhere on the stick's side of the lower screen is the
 *   stick, its ring moving under the thumb (`inSteerZone()`), so it's never missed; a little dead middle and full
 *   lock before the ring's edge (`stickRead()`, `STICK`), so a short slide steers hard;
 * - **the pedals**: a thumb landing on a pedal, or on the city near them (`inPedalZone()`), presses the nearest one,
 *   and rolling it from Gas onto Brake (or back) switches without lifting it (`pedalAt()`).
 * DOM-free: walk.ts feeds it the screen's numbers and the buttons' boxes; tested in tests/touchdrive.test.ts.
 */

/** The stick: the share of its radius that's dead in the middle, and the share at which it's full lock */
export const STICK = { dead: 0.08, full: 0.72 };

/** A finger's offset from the stick's middle (pixels) and the stick's radius: x and y in -1..1, shaped by `STICK` */
export function stickRead(dx: number, dy: number, radius: number): { x: number; y: number } {
  const r = Math.max(1, radius);
  const m = Math.hypot(dx, dy) / r;
  if (m <= STICK.dead) return { x: 0, y: 0 };
  const k = Math.min(1, (m - STICK.dead) / (STICK.full - STICK.dead)) / m;
  return { x: (dx / r) * k, y: (dy / r) * k };
}

/** A box on the screen (pixels) */
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** How far a point is from a box (0 inside it) */
export function distTo(r: Rect, x: number, y: number): number {
  const dx = Math.max(r.x0 - x, 0, x - r.x1);
  const dy = Math.max(r.y0 - y, 0, y - r.y1);
  return Math.hypot(dx, dy);
}

export type Pedal = 'gas' | 'brake';

/** The pedal a pedal finger at (x, y) presses: the one it's on, or else the nearer (it never lets go until lifted) */
export function pedalAt(x: number, y: number, gas: Rect | null, brake: Rect | null, was: Pedal): Pedal {
  if (!gas || !brake) return gas ? 'gas' : brake ? 'brake' : was;
  const g = distTo(gas, x, y);
  const b = distTo(brake, x, y);
  if (g === b) return was;
  return g < b ? 'gas' : 'brake';
}

/** The screen, the header's height and which side the stick is on (left-handed: the right) */
export interface Screen {
  w: number;
  h: number;
  head: number;
  /** The stick on the left (the right hand's layout) */
  stickLeft: boolean;
}

/** The share of the width on the stick's side that steers, and the top share of the space under the header left to looking round */
export const ZONE = { side: 0.45, top: 0.3 };

/** Whether a touch landing on the city at (x, y) is the floating stick: on the stick's side, low enough */
export function inSteerZone(x: number, y: number, s: Screen): boolean {
  if (y < s.head + (s.h - s.head) * ZONE.top) return false;
  return s.stickLeft ? x < s.w * ZONE.side : x > s.w * (1 - ZONE.side);
}

/** How far round the pedals (pixels) a touch on the city still presses the nearer one */
export const PEDAL_REACH = 56;

/** Whether a touch landing on the city at (x, y) is a pedal finger: on the pedals' side, near them */
export function inPedalZone(x: number, y: number, s: Screen, gas: Rect | null, brake: Rect | null): boolean {
  const near = [gas, brake].some((r) => r && distTo(r, x, y) <= PEDAL_REACH);
  if (!near) return false;
  return s.stickLeft ? x > s.w * 0.5 : x < s.w * 0.5;
}
