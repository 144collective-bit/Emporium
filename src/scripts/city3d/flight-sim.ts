/*
 * How your aircraft flies (Airport Phase 2): arcade handling and soft,
 * safe collisions. Kept free of the DOM and of scene code like the driving
 * rules (fly.ts is the view), so a game server could run it later.
 *
 * Units are tiles (about 1.8 m) and seconds. The aircraft faces +x at yaw
 * 0; turning left raises the yaw; a bank is positive into a right turn
 * (airfield.ts's poses). `y` is the height of its wheels (or skids).
 *
 * - Planes (the prop plane and the small jet): the throttle is a lever
 *   (Faster / Slower move it). On the ground they roll, steer by the nose
 *   wheel and lift off once they're fast enough and the stick comes back
 *   (or on their own a little faster). In the air the stick banks them
 *   into a turn and climbs or dives; let go and they level themselves.
 *   They can't stall: never slower than their slowest flying speed, and
 *   without enough power they sink gently instead of climbing, so cutting
 *   the power and gliding in is a landing. Coming down hard near the ground
 *   eases off on its own; touching down anywhere is a landing.
 * - The helicopter: up and down on the stick, Faster / Slower fly it forward
 *   and back, it turns on the spot and holds its height when you let go. It
 *   lands on the ground or any flat roof.
 * - Collisions are soft and safe: the aircraft is a few spheres; it slides
 *   off buildings, other aircraft and the hangar's roof, turns back at the
 *   edge of the world and levels off at the ceiling. No damage, no crash.
 */
import type { Box } from './solids';
import type { PlaneId } from './myplane';

/** Everything that flies, for the collision shapes: the airport's own traffic and the players' */
export type HullKind = 'jet' | 'prop' | 'heli' | 'bizjet';
/** Each aircraft as spheres: [forward, to the right wing, height over the wheels, radius] */
export const HULLS: Record<HullKind, [number, number, number, number][]> = {
  prop: [
    [1.8, 0, 1.15, 0.6],
    [0.1, 0, 1.3, 0.75],
    [-1.9, 0, 1.45, 0.55],
    [0.25, 2.4, 1.83, 0.6],
    [0.25, -2.4, 1.83, 0.6],
  ],
  bizjet: [
    [3.1, 0, 1.3, 0.65],
    [1, 0, 1.35, 0.72],
    [-1.4, 0, 1.45, 0.75],
    [-3.6, 0, 2.2, 0.75],
    [-1.4, 2.8, 1.15, 0.6],
    [-1.4, -2.8, 1.15, 0.6],
  ],
  heli: [
    [1, 0, 1.25, 0.85],
    [-0.5, 0, 1.4, 0.9],
    [-2.8, 0, 1.6, 0.45],
    [1.9, 0, 2.83, 1.1],
    [-1.9, 0, 2.83, 1.1],
    [0, 1.9, 2.83, 1.1],
    [0, -1.9, 2.83, 1.1],
  ],
  jet: [
    [7, 0, 2.75, 1.5],
    [0, 0, 2.75, 1.5],
    [-7, 0, 3.4, 1.5],
    [-2.6, 6, 2.1, 1.7],
    [-2.6, -6, 2.1, 1.7],
  ],
};

export interface FlyTune {
  kind: 'plane' | 'heli';
  hull: HullKind;
  /** Top speed (a plane's airspeed, the helicopter's forward speed), tiles/s */
  top: number;
  accel: number;
  /** Planes: lift-off speed and the slowest it flies */
  rotate: number;
  minAir: number;
  /** Turn rate at full stick (radians/s) */
  turn: number;
  /** Planes: steepest climb or dive (radians); helicopter: climb rate (tiles/s) */
  pitch: number;
  climb: number;
  /** Steepest bank */
  bank: number;
  /** Wheels to the top of the fin or rotor (for the hangar's roof) */
  tall: number;
  /** Nose to tail and wingtip to wingtip (or across the rotor) */
  L: number;
  span: number;
}

/** How each one flies (the hangar's stat bars read these too) */
export const TUNES: Record<PlaneId, FlyTune> = {
  prop: { kind: 'plane', hull: 'prop', top: 22, accel: 5, rotate: 9, minAir: 7.5, turn: 0.95, pitch: 0.4, climb: 0, bank: 0.6, tall: 2.6, L: 5.4, span: 7.2 },
  bizjet: { kind: 'plane', hull: 'bizjet', top: 34, accel: 6.5, rotate: 13, minAir: 11, turn: 0.72, pitch: 0.34, climb: 0, bank: 0.62, tall: 3.8, L: 9.4, span: 8.4 },
  heli: { kind: 'heli', hull: 'heli', top: 14, accel: 5.5, rotate: 0, minAir: 0, turn: 1.35, pitch: 0, climb: 5, bank: 0.3, tall: 2.95, L: 6.2, span: 6.2 },
};

/** The highest anyone flies: well over the airliners' route, inside the sky */
export const CEILING = 72;
/** How close to the world's edge the aircraft starts turning itself back */
export const EDGE_TURN = 18;
/** A plane left alone after lift-off climbs this high over the floor before levelling off */
export const CLIMB_OUT = 6;
/** Getting out: on the ground and (nearly) stopped */
export const EXIT_SPEED = 1.2;

export interface FlyState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  /** Speed along the nose (a plane's airspeed; negative rolling back) */
  speed: number;
  /** How it's actually moving */
  vx: number;
  vy: number;
  vz: number;
  /** Planes: the throttle lever, 0..1 */
  power: number;
  /** The engine or rotor's spin, 0..1 (for the props, the rotor and the sound) */
  spool: number;
  ground: boolean;
  gear: boolean;
  yawRate: number;
}

export interface FlyInput {
  /** Faster (up to 1) or slower (down to -1): a plane's lever, the helicopter's forward / back */
  throttle: number;
  /** Left (-1) to right (1) */
  turn: number;
  /** Climb (1) or dive / descend (-1) */
  climb: number;
}

export interface FlyWorld {
  /** Solid boxes: x0, z0, x1, z1, height (their tops are landing spots) */
  boxes: Box[];
  /** Roofs to keep under (the hangar's): x0, z0, x1, z1, the roof's underside */
  ceilings: Box[];
  /** Other aircraft (spheres) */
  soft: { x: number; y: number; z: number; r: number }[];
  /** The ground's height (the raised blocks and sidewalks) */
  ground(x: number, z: number): number;
}

/** How far round an aircraft the solid boxes need gathering for a step: its hull's reach (a wing or the tail), how far it goes and a push */
export const flyReach = (s: { speed: number }) => 14 + Math.abs(s.speed) * 0.05;

export const newFlight = (x: number, z: number, yaw: number, y = 0): FlyState => ({
  x,
  y,
  z,
  yaw,
  pitch: 0,
  roll: 0,
  speed: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  power: 0,
  spool: 0,
  ground: true,
  gear: true,
  yawRate: 0,
});

const approach = (v: number, target: number, step: number) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** An aircraft's spheres where it is (turned with its heading only) */
export function hullAt(p: { x: number; y: number; z: number; yaw: number }, kind: HullKind) {
  const fx = Math.cos(p.yaw);
  const fz = -Math.sin(p.yaw);
  // The right wing is +z in the model: (sin yaw, cos yaw) in the world
  const rx = Math.sin(p.yaw);
  const rz = Math.cos(p.yaw);
  return HULLS[kind].map(([u, v, h, r]) => ({ x: p.x + fx * u + rx * v, y: p.y + h, z: p.z + fz * u + rz * v, r }));
}

/** The floor under a point: the ground, or the top of whatever it's standing on (a box's top a little under its wheels) */
export function floorAt(world: FlyWorld, x: number, z: number, y: number) {
  let f = world.ground(x, z);
  for (const b of world.boxes) if (b[4] > f && b[4] <= y + 0.6 && x > b[0] && x < b[2] && z > b[1] && z < b[3]) f = b[4];
  return f;
}

/** Can Degen climb out? On the ground and stopped */
export const canLeave = (s: FlyState) => s.ground && Math.abs(s.speed) < EXIT_SPEED && Math.abs(s.vx) + Math.abs(s.vz) < EXIT_SPEED * 1.5;

/**
 * One step (split into small ones inside). Returns how hard it hit
 * something (0 if nothing), for a bump sound and a shake.
 */
export function stepFly(s: FlyState, inp: FlyInput, t: FlyTune, dt: number, world: FlyWorld, bounds: Box): number {
  const n = Math.max(1, Math.ceil(dt / (1 / 60)));
  const h = dt / n;
  const i = { throttle: clamp(inp.throttle, -1, 1), turn: clamp(inp.turn, -1, 1), climb: clamp(inp.climb, -1, 1) };
  let hit = 0;
  for (let k = 0; k < n; k++) {
    if (t.kind === 'plane') plane(s, i, t, h, world);
    else heli(s, i, t, h, world);
    hit = Math.max(hit, collide(s, t, h, world), edges(s, t, h, bounds));
  }
  return hit;
}

function plane(s: FlyState, inp: FlyInput, t: FlyTune, dt: number, world: FlyWorld) {
  // The lever, and the engine following it (it idles while you're in)
  s.power = clamp(s.power + inp.throttle * 0.6 * dt, 0, 1);
  s.spool = approach(s.spool, Math.max(0.22, s.power), 0.9 * dt);
  const fx = Math.cos(s.yaw);
  const fz = -Math.sin(s.yaw);
  if (s.ground) {
    const want = s.power * t.top;
    if (inp.throttle < -0.1 && s.power < 0.02) {
      // Lever down and still holding Slower: the brakes, then a slow roll backwards (out of a corner)
      s.speed = s.speed > 0.05 ? approach(s.speed, 0, 8 * dt) : approach(s.speed, -1.6, 1.5 * dt);
    } else if (s.speed < want) s.speed = Math.min(want, s.speed + t.accel * (s.speed < 0 ? 2 : 1) * dt);
    else s.speed = approach(s.speed, want, 2.4 * dt);
    // The nose wheel steers: a slow pivot when nearly stopped, gentler when fast
    const sp = Math.abs(s.speed);
    const rate = (0.9 / (1 + sp / 8)) * Math.max(0.4, Math.min(1, sp / 1.2));
    s.yawRate = -inp.turn * rate * (s.speed < -0.1 ? -1 : 1);
    s.yaw = wrap(s.yaw + s.yawRate * dt);
    s.roll += (0 - s.roll) * damp(8, dt);
    s.pitch += ((inp.climb > 0.1 && s.speed > t.rotate * 0.8 ? 0.08 : 0) - s.pitch) * damp(6, dt);
    s.vx = Math.cos(s.yaw) * s.speed;
    s.vz = -Math.sin(s.yaw) * s.speed;
    s.vy = 0;
    s.x += s.vx * dt;
    s.z += s.vz * dt;
    // Up kerbs and onto low things; off an edge it's flying (or dropping softly back)
    const floor = floorAt(world, s.x, s.z, s.y);
    if (floor >= s.y - 0.3) s.y = floor;
    else s.ground = false;
    // Fast enough and the stick back (or faster still): it lifts off
    if (s.speed >= t.rotate && (inp.climb > 0.1 || s.speed >= t.rotate * 1.25)) {
      s.ground = false;
      s.vy = 0.6;
      s.y += 0.02;
    }
    s.gear = true;
    return;
  }

  // In the air: the speed follows the lever, never under the slowest it flies
  const want = t.minAir + s.power * (t.top - t.minAir);
  s.speed = approach(s.speed, want, (s.speed < want ? t.accel * 0.7 : 2.2) * dt);
  // Climbing costs speed, diving adds it
  s.speed = clamp(s.speed - Math.sin(s.pitch) * 5 * dt, t.minAir, t.top * 1.15);
  // The bank follows the stick and levels itself; the turn follows the bank
  s.roll += (inp.turn * t.bank - s.roll) * damp(2.6, dt);
  s.yawRate = -(s.roll / t.bank) * t.turn;
  s.yaw = wrap(s.yaw + s.yawRate * dt);
  // The nose follows the stick (only gently up while slow) and levels itself
  const auth = clamp((s.speed - t.minAir) / Math.max(1, t.rotate - t.minAir), 0.15, 1);
  let pitchWant = inp.climb * t.pitch * (inp.climb > 0 ? auth : 1);
  // Just off the ground with the power up and the stick left alone, it climbs out to a safe height on its own
  const lowFloor = floorAt(world, s.x, s.z, s.y);
  if (s.y - lowFloor < CLIMB_OUT && inp.climb >= 0 && s.power > 0.35 && s.speed > t.rotate) pitchWant = Math.max(pitchWant, t.pitch * 0.45);
  // The nose comes down near the ceiling
  if (s.y > CEILING - 8) pitchWant = Math.min(pitchWant, t.pitch * clamp((CEILING - s.y) / 8, 0, 1));
  s.pitch += (pitchWant - s.pitch) * damp(2.2, dt);
  // Slow, it sinks: a gentle glide, never a stall
  const sink = Math.max(0, 1 - s.speed / t.rotate) * 7;
  s.vy = s.speed * Math.sin(s.pitch) - sink;
  const floor = floorAt(world, s.x, s.z, s.y);
  const above = s.y - floor;
  // Coming down hard near the ground, it eases off on its own
  if (above < 5 && s.vy < -2.4) s.vy += (-2.4 - s.vy) * clamp(1 - above / 5, 0, 1);
  const flat = s.speed * Math.cos(s.pitch);
  s.vx = fx * flat;
  s.vz = fz * flat;
  s.x += s.vx * dt;
  s.z += s.vz * dt;
  s.y += s.vy * dt;
  if (s.y > CEILING) {
    s.y = CEILING;
    s.vy = Math.min(0, s.vy);
  }
  s.gear = above < 7;
  land(s, world);
}

function heli(s: FlyState, inp: FlyInput, t: FlyTune, dt: number, world: FlyWorld) {
  // The rotor spins up while you're in
  s.spool = approach(s.spool, 1, 0.5 * dt);
  s.power = s.spool;
  s.gear = true;
  if (s.ground) {
    s.speed = approach(s.speed, 0, 10 * dt);
    s.vx = s.vz = s.vy = 0;
    // Light on its skids once the rotor's up to speed: it turns on the spot
    s.yawRate = s.spool > 0.6 ? -inp.turn * t.turn * 0.5 : 0;
    s.yaw = wrap(s.yaw + s.yawRate * dt);
    s.pitch += (0 - s.pitch) * damp(8, dt);
    s.roll += (0 - s.roll) * damp(8, dt);
    s.y = Math.max(floorAt(world, s.x, s.z, s.y), s.y - 0.5 * dt);
    if (inp.climb > 0.1 && s.spool > 0.7) {
      s.ground = false;
      s.vy = 0.6;
      s.y += 0.02;
    }
    return;
  }
  // Up and down on the stick, holding its height when you let go
  s.vy += (inp.climb * t.climb - s.vy) * damp(4.5, dt);
  // Forward on Faster, back (slowly) on Slower, easing to a hover
  const fwd = inp.throttle >= 0 ? inp.throttle * t.top : inp.throttle * t.top * 0.4;
  const before = s.speed;
  s.speed = approach(s.speed, fwd, t.accel * dt);
  s.yawRate = -inp.turn * t.turn;
  s.yaw = wrap(s.yaw + s.yawRate * dt);
  // A little drift: the way it moves catches up with the nose
  const k = damp(2.6, dt);
  s.vx += (Math.cos(s.yaw) * s.speed - s.vx) * k;
  s.vz += (-Math.sin(s.yaw) * s.speed - s.vz) * k;
  // It dips its nose to go forward (more while speeding up) and leans into turns
  const accel = (s.speed - before) / dt;
  s.pitch += (-(s.speed / t.top) * 0.18 - accel * 0.03 - s.pitch) * damp(4, dt);
  s.roll += (inp.turn * t.bank * Math.min(1, 0.35 + Math.abs(s.speed) / 6) - s.roll) * damp(4, dt);
  s.x += s.vx * dt;
  s.z += s.vz * dt;
  s.y += s.vy * dt;
  if (s.y > CEILING) {
    s.y = CEILING;
    s.vy = Math.min(0, s.vy);
  }
  land(s, world, inp.climb <= 0.05);
}

/** Touching the floor: a landing, wherever it is */
function land(s: FlyState, world: FlyWorld, settle = true) {
  const floor = floorAt(world, s.x, s.z, s.y);
  if (s.y > floor) return;
  s.y = floor;
  if (s.vy < 0) s.vy = 0;
  if (settle) {
    s.ground = true;
    s.vy = 0;
  }
}

/** Soft collisions: slide off buildings and other aircraft, keep under the hangar's roof */
function collide(s: FlyState, t: FlyTune, dt: number, world: FlyWorld): number {
  let hit = 0;
  // Under a roof, the fin or the rotor stays clear of it
  for (const c of world.ceilings)
    if (s.x > c[0] && s.x < c[2] && s.z > c[1] && s.z < c[3] && s.y + t.tall > c[4]) {
      const floor = floorAt(world, s.x, s.z, s.y);
      s.y = Math.max(floor, c[4] - t.tall);
      if (s.vy > 0) {
        hit = Math.max(hit, s.vy);
        s.vy = 0;
      }
      if (s.y <= floor + 1e-3 && t.kind === 'plane') s.ground = true;
    }
  /** Move the aircraft out along a flat normal and take away the speed going into it */
  const push = (nx: number, nz: number, depth: number) => {
    s.x += nx * depth;
    s.z += nz * depth;
    const into = -(s.vx * nx + s.vz * nz);
    if (into <= 0) return;
    hit = Math.max(hit, into);
    s.vx += nx * into * 1.05;
    s.vz += nz * into * 1.05;
    const along = Math.hypot(s.vx, s.vz);
    if (t.kind === 'plane' && !s.ground) {
      // A plane can't stop in the air: it turns along the wall (or away from it, head on)
      const tx = s.vx / (along || 1);
      const tz = s.vz / (along || 1);
      if (along > 1) s.yaw = wrap(s.yaw + wrap(Math.atan2(-tz, tx) - s.yaw) * 0.6);
      else s.yaw = wrap(s.yaw + 0.5);
      s.speed = Math.max(t.minAir, s.speed * 0.85);
    } else s.speed = s.vx * Math.cos(s.yaw) - s.vz * Math.sin(s.yaw);
  };
  for (let pass = 0; pass < 2; pass++) {
    for (const c of hullAt(s, t.hull)) {
      for (const b of world.boxes) {
        // Low enough to stand on (under the wheels): that's the floor, not a wall
        if (b[4] < 0.3 || b[4] <= s.y + 0.6) continue;
        if (c.x < b[0] - c.r || c.x > b[2] + c.r || c.z < b[1] - c.r || c.z > b[3] + c.r || c.y - c.r > b[4]) continue;
        const px = clamp(c.x, b[0], b[2]);
        const pz = clamp(c.z, b[1], b[3]);
        const dx = c.x - px;
        const dz = c.z - pz;
        const flat = Math.hypot(dx, dz);
        // Over the top's edge, the sphere reaches less far sideways
        const up = Math.max(0, c.y - b[4]);
        const reach = Math.sqrt(Math.max(0, c.r * c.r - up * up));
        if (flat >= reach) continue;
        if (flat < 1e-4) {
          const sides = [c.x - b[0], b[2] - c.x, c.z - b[1], b[3] - c.z];
          const m = sides.indexOf(Math.min(...sides));
          const [nx, nz] = ([[-1, 0], [1, 0], [0, -1], [0, 1]] as const)[m];
          c.x += nx * (sides[m] + reach);
          c.z += nz * (sides[m] + reach);
          push(nx, nz, sides[m] + reach);
        } else {
          c.x += (dx / flat) * (reach - flat);
          c.z += (dz / flat) * (reach - flat);
          push(dx / flat, dz / flat, reach - flat);
        }
      }
      for (const o of world.soft) {
        const dx = c.x - o.x;
        const dz = c.z - o.z;
        const dy = c.y - o.y;
        const d = Math.hypot(dx, dy, dz);
        const flat = Math.hypot(dx, dz);
        if (d >= c.r + o.r || flat < 1e-4) continue;
        const depth = Math.min(c.r + o.r - d, 1);
        c.x += (dx / flat) * depth;
        c.z += (dz / flat) * depth;
        push(dx / flat, dz / flat, depth);
      }
    }
  }
  return hit;
}

/** The edge of the world: it turns itself back as it nears it, and never goes past */
function edges(s: FlyState, t: FlyTune, dt: number, bounds: Box): number {
  const [x0, z0, x1, z1] = bounds;
  const near = Math.min(s.x - x0, x1 - s.x, s.z - z0, z1 - s.z);
  if (!s.ground && near < EDGE_TURN) {
    // Not heading in? Turn towards the middle, harder the closer it is
    const cx = (x0 + x1) / 2 - s.x;
    const cz = (z0 + z1) / 2 - s.z;
    if (s.vx * cx + s.vz * cz < 0.5 * Math.hypot(s.vx, s.vz) * Math.hypot(cx, cz)) {
      const home = Math.atan2(-cz, cx);
      s.yaw = wrap(s.yaw + wrap(home - s.yaw) * damp(1.6 * (1 - near / EDGE_TURN) + 0.2, dt));
    }
  }
  if (s.x >= x0 && s.x <= x1 && s.z >= z0 && s.z <= z1) return 0;
  s.x = clamp(s.x, x0, x1);
  s.z = clamp(s.z, z0, z1);
  const out = Math.hypot(s.vx, s.vz);
  if (s.x <= x0 || s.x >= x1) s.vx = 0;
  if (s.z <= z0 || s.z >= z1) s.vz = 0;
  if (t.kind === 'heli' || s.ground) s.speed *= 0.3;
  return out;
}
