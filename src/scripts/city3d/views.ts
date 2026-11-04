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

/** The ring's: near and far only (the owner's call: a fight in first person is hard to read) */
export const RING_ORDER: readonly ViewId[] = ['near', 'far'];

/** The view after `v` (in `order`, the vehicles' unless given) */
export function nextView(v: ViewId, order: readonly ViewId[] = VIEW_ORDER): ViewId {
  return order[(order.indexOf(v) + 1) % order.length];
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

/** A kart race's far camera (kart.ts): the near one's distance times `scale`, looking down at `pitch` (near's 0.3) */
export const RACE_FAR = { scale: 1.9, pitch: 0.4 };

/**
 * The ring's far camera (fight.ts): `back` times further behind you than the near one, `up` high, `side` over your
 * right shoulder, held at most `past` outside a street spar's ring, or `ropes` outside the Fight Club's (still under
 * its shed's roof, inside its posts)
 */
export const RING_FAR = { back: 2, up: 2.9, side: 0.9, past: 2.4, ropes: 0.8 };

/* ---------- Rides (the taxi, the metro, the monorail, the river bus: docs/views-plan.md Phase 2) ---------- */

export type RideKind = 'taxi' | 'metro' | 'monorail' | 'riverbus';
/** What first person is called on each ride */
export const RIDE_FIRST: Record<RideKind, string> = { taxi: 'Back seat', metro: 'Window seat', monorail: 'Window seat', riverbus: 'Deck' };

/** A point in the world */
export interface P3 {
  x: number;
  y: number;
  z: number;
}

/**
 * The ride's camera, the same for every ride: its view and where you look (the owner's call: look round freely,
 * the mouse, a drag or the right stick; it stays where you leave it). Started near, looking ahead, every ride.
 */
export const RIDE_CAM = { view: START_VIEW as ViewId, yaw: 0, pitch: 0 };
/** How far round you can look on a ride (radians: either way, up, down) */
export const RIDE_LOOK = { yaw: 2.8, up: 0.55, down: -0.45 };
/** The far view on a ride: the near one's offset from the vehicle `out` times further, `up` times higher */
export const RIDE_FAR = { out: 1.9, up: 1.5 };

/** A ride starts (walk.ts `setRide()`): near, looking ahead */
export function startRide() {
  RIDE_CAM.view = START_VIEW;
  RIDE_CAM.yaw = RIDE_CAM.pitch = 0;
}
/** Look round on a ride (radians: `dx` to the right, `dy` up) */
export function rideLook(dx: number, dy: number) {
  RIDE_CAM.yaw = Math.max(-RIDE_LOOK.yaw, Math.min(RIDE_LOOK.yaw, RIDE_CAM.yaw - dx));
  RIDE_CAM.pitch = Math.max(RIDE_LOOK.down, Math.min(RIDE_LOOK.up, RIDE_CAM.pitch + dy));
}

/** (x, z) turned `a` radians the way a heading turns (0 along +x, a quarter turn to -z) */
function turn(x: number, z: number, a: number): [number, number] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c + z * s, -x * s + z * c];
}

/**
 * Where a ride's camera goes and looks this frame, from the ride's own camera (`near`: where it wants to be and
 * what it looks at, round the vehicle's `centre`), the passenger's eye and the way the vehicle faces (`fwd`, a unit
 * (x, z)). Near and far orbit the centre as you look round; first person stands at the eye, looking ahead turned
 * as you look, and is placed at once (`snap`), not eased after the moving vehicle.
 */
export function rideView(near: { want: P3; at: P3 }, centre: P3, eye: P3, fwd: [number, number], cam: { view: ViewId; yaw: number; pitch: number } = RIDE_CAM) {
  if (cam.view === 'first') {
    const a = Math.atan2(-fwd[1], fwd[0]) + cam.yaw;
    const p = cam.pitch - 0.06;
    const want = { ...eye };
    const at = { x: eye.x + Math.cos(a) * Math.cos(p) * 10, y: eye.y + Math.sin(p) * 10, z: eye.z - Math.sin(a) * Math.cos(p) * 10 };
    return { want, at, snap: true };
  }
  const far = cam.view === 'far';
  let [ox, oz] = [near.want.x - centre.x, near.want.z - centre.z];
  let oy = near.want.y - centre.y;
  if (far) {
    ox *= RIDE_FAR.out;
    oz *= RIDE_FAR.out;
    oy *= RIDE_FAR.up;
  }
  [ox, oz] = turn(ox, oz, cam.yaw);
  oy = Math.max(0.6, oy + cam.pitch * Math.hypot(ox, oz));
  const [ax, az] = turn(near.at.x - centre.x, near.at.z - centre.z, cam.yaw);
  return { want: { x: centre.x + ox, y: centre.y + oy, z: centre.z + oz }, at: { x: centre.x + ax, y: near.at.y, z: centre.z + az }, snap: false };
}

/** What first person is called in each */
export const FIRST_NAME: Record<ViewKind, string> = { car: 'Driver’s seat', bike: 'Helmet', kart: 'Seat', boat: 'Helm', plane: 'Cockpit' };

/** The view's name for the toast as it changes ("Camera · Near"): a vehicle's, a ride's, or on foot ('foot') */
export function viewName(kind: ViewKind | RideKind | 'ring' | 'foot', v: ViewId): string {
  if (v === 'first') return kind === 'foot' ? 'First person' : kind in RIDE_FIRST ? RIDE_FIRST[kind as RideKind] : kind === 'ring' ? 'Near' : FIRST_NAME[kind as ViewKind];
  return kind === 'foot' ? 'Over the shoulder' : v === 'near' ? 'Near' : 'Far';
}
