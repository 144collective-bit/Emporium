/**
 * City view's free camera (the owner's call, 2026-11: "the camera free, fly round with WASD; near the wall"):
 * WASD is always on in City view and flies the camera where it looks (W straight along the look, up or down with
 * it), A and D to the side, E or Space up, Q or C down, Shift faster; the right mouse button held looks round where
 * the camera stands. It flies anywhere inside the wall, up to its inner face (`PAN_BOUNDS`, bounds.ts) and never
 * over it: near the wall the ceiling eases down under the wall's top, so nothing past it is flown into.
 * DOM-free, tested in tests/freecam.test.ts: index.ts reads the keys and the mouse and moves the camera with these.
 */
import { PAN_BOUNDS } from './bounds';
import { WALL, fromWall } from './wall';
import { heightAt, onHills } from './terrain';
import { rollsAt } from './rolls';

export type V3 = [number, number, number];
export type FlyDir = 'fwd' | 'back' | 'left' | 'right' | 'up' | 'down';
export type FlyKeys = Record<FlyDir | 'fast', boolean>;

export const FLY = {
  /** Tiles a second near the ground, and more for every tile up (high up, the city goes by at the same pace) */
  speed: 16,
  perHeight: 0.7,
  /** Shift held */
  fast: 3,
  /** How quickly it gets up to speed and stops (a second's share) */
  ease: 9,
  /** Mouse look: radians a pixel */
  look: 0.0032,
  /** How far down and up it may look (radians from level) */
  pitch: [-1.45, 0.6] as readonly [number, number],
  /** Above the ground, at the least */
  floor: 1.2,
  /** The highest it flies, away from the wall (City view's old zoomed-out height) */
  ceiling: 210,
  /** Within this of the wall's inner face the ceiling eases down to `under` below the wall's top */
  nearWall: 160,
  under: 1.5,
  /** The nearest the point it turns round may be (the orbit's pivot, City view's target) */
  pivot: 2,
};

/** The orbit's polar range (MapControls, from straight up): the pitch range seen from the target's side */
export const POLAR: readonly [number, number] = [Math.PI / 2 + FLY.pitch[0], Math.PI / 2 + FLY.pitch[1]];

/** Which direction a key flies (by `KeyboardEvent.code`, so it's the same place on every layout) */
export function keyDir(code: string): FlyDir | 'fast' | null {
  switch (code) {
    case 'KeyW': case 'ArrowUp': return 'fwd';
    case 'KeyS': case 'ArrowDown': return 'back';
    case 'KeyA': case 'ArrowLeft': return 'left';
    case 'KeyD': case 'ArrowRight': return 'right';
    case 'KeyE': case 'Space': return 'up';
    case 'KeyQ': case 'KeyC': return 'down';
    case 'ShiftLeft': case 'ShiftRight': return 'fast';
    default: return null;
  }
}

export const noKeys = (): FlyKeys => ({ fwd: false, back: false, left: false, right: false, up: false, down: false, fast: false });
export const anyHeld = (k: FlyKeys) => k.fwd || k.back || k.left || k.right || k.up || k.down;

/** How fast it flies at a height */
export const speedAt = (y: number, fast: boolean) => (FLY.speed + FLY.perHeight * Math.max(0, y)) * (fast ? FLY.fast : 1);

/** The velocity the keys ask for, the camera at height `y` looking along `look` (a unit vector) */
export function wish(keys: FlyKeys, look: V3, y: number): V3 {
  const f = (keys.fwd ? 1 : 0) - (keys.back ? 1 : 0);
  const s = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const u = (keys.up ? 1 : 0) - (keys.down ? 1 : 0);
  // The side: level, square to the look (looking straight down, along x)
  const h = Math.hypot(look[0], look[2]);
  const rx = h > 1e-6 ? -look[2] / h : 1;
  const rz = h > 1e-6 ? look[0] / h : 0;
  const v: V3 = [f * look[0] + s * rx, f * look[1] + u, f * look[2] + s * rz];
  const n = Math.hypot(v[0], v[1], v[2]);
  if (!n) return [0, 0, 0];
  const k = speedAt(y, keys.fast) / n;
  return [v[0] * k, v[1] * k, v[2] * k];
}

/** The velocity eased towards what's wished (`instant`: under reduced motion it starts and stops at once) */
export function easeVel(v: V3, want: V3, dt: number, instant = false): V3 {
  if (instant) return [...want];
  const a = 1 - Math.exp(-FLY.ease * dt);
  const out: V3 = [v[0] + (want[0] - v[0]) * a, v[1] + (want[1] - v[1]) * a, v[2] + (want[2] - v[2]) * a];
  return Math.hypot(...out) < 0.01 ? [0, 0, 0] : out;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The highest it may be at a point: under the wall's top by it, the old ceiling well away from it */
export function ceilingAt(x: number, z: number) {
  const low = WALL.h - FLY.under;
  return low + (FLY.ceiling - low) * smooth(0, FLY.nearWall, fromWall(x, z));
}

/** The land's height under a point (the hills, else the rolling ground; never below the street): what the camera keeps over */
export const groundUnder = (x: number, z: number) => Math.max(0, onHills(x, z) ? heightAt(x, z) : rollsAt(x, z));

/** A camera position kept inside the wall, over the ground (`ground`: its height under the camera) and under the ceiling */
export function clampCam(p: V3, ground: number): V3 {
  const x = Math.min(PAN_BOUNDS[2], Math.max(PAN_BOUNDS[0], p[0]));
  const z = Math.min(PAN_BOUNDS[3], Math.max(PAN_BOUNDS[1], p[2]));
  const lo = ground + FLY.floor;
  const y = Math.max(lo, Math.min(Math.max(lo, ceilingAt(x, z)), p[1]));
  return [x, y, z];
}

/** Mouse look: the look turned by a drag of (dx, dy) pixels, its pitch held in range */
export function turn(look: V3, dx: number, dy: number): V3 {
  const yaw = Math.atan2(look[0], look[2]) - dx * FLY.look;
  const pitch = Math.min(FLY.pitch[1], Math.max(FLY.pitch[0], Math.asin(Math.max(-1, Math.min(1, look[1]))) - dy * FLY.look));
  const c = Math.cos(pitch);
  return [Math.sin(yaw) * c, Math.sin(pitch), Math.cos(yaw) * c];
}

/** How far along `dir` from `from` the pivot may go, at most `d`, and stay inside the wall (never nearer than `FLY.pivot`) */
export function reach(from: V3, dir: V3, d: number): number {
  let t = d;
  const [x0, z0, x1, z1] = PAN_BOUNDS;
  if (dir[0] > 1e-9) t = Math.min(t, (x1 - from[0]) / dir[0]);
  if (dir[0] < -1e-9) t = Math.min(t, (x0 - from[0]) / dir[0]);
  if (dir[2] > 1e-9) t = Math.min(t, (z1 - from[2]) / dir[2]);
  if (dir[2] < -1e-9) t = Math.min(t, (z0 - from[2]) / dir[2]);
  return Math.max(FLY.pivot, t);
}
