/**
 * The cameras at the wheel (docs/views-plan.md, Phase 1; the owner's picks): every vehicle the same three views,
 * stepped through by the one camera control (V, the gamepad's right stick pressed, the touch View button):
 * near (a close chase camera, the one you start in), far (a chase camera further back and higher) and first person
 * (the driver's seat, the helmet, the kart's seat, the helm, the cockpit). Not remembered: every time you get in it
 * starts near. DOM-free: drive.ts, boat.ts and fly.ts read the chase cameras' numbers from here, walk.ts the names.
 */

export type ViewId = 'near' | 'far' | 'first';
/** What's being driven: the car, the motorbike and your own kart (drive.ts), the hire boat, your aircraft */
export type ViewKind = 'car' | 'bike' | 'kart' | 'boat' | 'plane';

/** The order the camera control steps through, from the view you get in with */
export const VIEW_ORDER: readonly ViewId[] = ['near', 'far', 'first'];
export const START_VIEW: ViewId = 'near';

/** The view after `v` */
export function nextView(v: ViewId): ViewId {
  return VIEW_ORDER[(VIEW_ORDER.indexOf(v) + 1) % VIEW_ORDER.length];
}

/**
 * A chase camera: how far back it wants to be (`base`, plus `perL` of the vehicle's length, plus `perSpeed` of its
 * speed up to `speedMax` more), how far it looks down on it (`pitch`, radians) and its field of view (`fov`, degrees,
 * before the widening with speed; none: the camera's own, as the boat's has always been)
 */
export interface Chase {
  base: number;
  perL: number;
  perSpeed: number;
  speedMax: number;
  pitch: number;
  fov?: number;
}

/**
 * Each kind's near and far chase. Near is the chase camera each had before the plan, to the number; far is about
 * twice as far back and looks down a little more, so more of the street ahead and round it is in view.
 */
export const CHASE: Record<ViewKind, Record<'near' | 'far', Chase>> = {
  car: {
    near: { base: 3.6, perL: 0.95, perSpeed: 0.1, speedMax: Infinity, pitch: 0.26, fov: 58 },
    far: { base: 7, perL: 1.4, perSpeed: 0.14, speedMax: Infinity, pitch: 0.34, fov: 58 },
  },
  bike: {
    near: { base: 3.6, perL: 0.95, perSpeed: 0.1, speedMax: Infinity, pitch: 0.26, fov: 58 },
    far: { base: 6.5, perL: 1.4, perSpeed: 0.14, speedMax: Infinity, pitch: 0.34, fov: 58 },
  },
  kart: {
    near: { base: 3.6, perL: 0.95, perSpeed: 0.1, speedMax: Infinity, pitch: 0.26, fov: 58 },
    far: { base: 6.5, perL: 1.4, perSpeed: 0.14, speedMax: Infinity, pitch: 0.34, fov: 58 },
  },
  boat: {
    near: { base: 5, perL: 0, perSpeed: 0.45, speedMax: 4, pitch: 0.26 },
    far: { base: 9.5, perL: 0, perSpeed: 0.6, speedMax: 6, pitch: 0.34 },
  },
  plane: {
    near: { base: 4.5, perL: 1.15, perSpeed: 0.18, speedMax: 14, pitch: 0.2, fov: 58 },
    far: { base: 9, perL: 1.7, perSpeed: 0.24, speedMax: 20, pitch: 0.27, fov: 58 },
  },
};

/** How far back the chase camera wants to be (before the walls pull it in), for a vehicle `L` long going `speed` */
export function chaseDistance(c: Chase, L: number, speed: number): number {
  return c.base + c.perL * L + Math.min(c.speedMax, Math.abs(speed) * c.perSpeed);
}

/** What first person is called in each */
export const FIRST_NAME: Record<ViewKind, string> = { car: 'Driver’s seat', bike: 'Helmet', kart: 'Seat', boat: 'Helm', plane: 'Cockpit' };

/** The view's name for the toast as it changes ("Camera · Near") */
export function viewName(kind: ViewKind, v: ViewId): string {
  return v === 'first' ? FIRST_NAME[kind] : v === 'near' ? 'Near' : 'Far';
}
