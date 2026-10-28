/*
 * How your car drives: arcade handling and soft collisions. Like the combat
 * rules it's kept free of the DOM and of scene code (drive.ts is the view),
 * so a game server could run it later.
 *
 * Units are tiles (about 1.8 m) and seconds. The car faces +x at yaw 0;
 * turning left raises the yaw (three.js's rotation about y).
 *
 * - Speed builds and tapers to the car's top speed (its model's number plus
 *   the garage's engine mods); brake, then reverse.
 * - Steering is a bicycle model: tighter at low speed, gentler when fast.
 * - Grip decides how quickly the car's slide follows its nose.
 * - Each model has its own feel (vehicle plan Phase 4, `Feel`: mycar.ts
 *   `FEEL`): its weight (how quickly it answers the wheel), how loose its
 *   tail is, whether the back wheels drive it, its steering's speed and
 *   lock.
 * - **Drifting** (`CarState.drift`, 0..1): a held slide. The handbrake at a
 *   roll starts one, and so does full power through a turn in a rear-drive
 *   car (as much as its tail is loose); throttle keeps it going while the
 *   tail is out, steering into the turn holds the angle and counter-steer
 *   brings the nose back; lift off and straighten and the grip comes back.
 *   Still arcade: the slide never goes past `DRIFT.most` from the nose,
 *   and with the wheel straight every slide recovers.
 * - Collisions are soft and safe: the car is three circles along its length;
 *   it slides along walls and bumps off other cars and people, losing speed,
 *   never hurting anyone.
 */
import type { Box } from './solids';
import { RIVER } from './layout';
import { edgeSamples, topsAt } from './river';
import { riverCrossings } from './streetplan';
import { LAKE_C, LAKE_WALLS } from './westlake';

export interface DriveTune {
  /** Top speed and reverse top speed (tiles/s) */
  top: number;
  reverse: number;
  /** Acceleration and braking (tiles/s²) */
  accel: number;
  brake: number;
  /** How quickly the slide follows the nose (1/s) */
  grip: number;
  /** Length, width, wheelbase (tiles) */
  L: number;
  W: number;
  wheelbase: number;
  /** The model's feel (`Feel`) */
  mass: number;
  loose: number;
  rwd: boolean;
  steerRate: number;
  lock: number;
}

/**
 * A model's feel (vehicle plan Phase 4): `mass` (1 a saloon: heavier answers the wheel later), `loose` (0..1, how
 * readily the tail steps out under power), `rwd` (the back wheels drive it: power can start a drift), `steerRate`
 * (how fast the front wheels turn, rad/s) and `lock` (as far as they turn at a crawl, radians)
 */
export interface Feel {
  mass: number;
  loose: number;
  rwd: boolean;
  steerRate: number;
  lock: number;
}
/** A feel in the middle (the kart's, and any car without its own) */
export const NEUTRAL: Feel = { mass: 1, loose: 0.3, rwd: false, steerRate: 3.2, lock: 0.62 };

/**
 * Drifting: `min` the speed a drift needs (tiles/s); `power` the speed, throttle and wheel full power needs to
 * break the tail away; `hold` the slide (radians) under which throttle no longer keeps one going; `grip` the share
 * of the grip a full drift loses; `turn` how much quicker the nose comes round in one; `most` the most the slide
 * can be from the nose; `scrub` the speed it costs; `into` / `out` how fast a drift builds and fades
 */
export const DRIFT = { min: 3, power: { speed: 5, throttle: 0.7, wheel: 0.5 }, hold: 0.12, grip: 0.82, turn: 0.45, most: 1.05, scrub: 0.25, into: 3, out: 1.2, brake: 6 };

/**
 * A car's 0..1 handling (mycar.ts DRIVE, with the garage's mods on: carStatsOf in
 * tycoon.ts can go past 1 a little) and size, as numbers the sim uses
 */
export function tune(d: { speed: number; accel: number; grip: number }, size: { L: number; W: number; wheelbase: number }, feel: Feel = NEUTRAL): DriveTune {
  return {
    top: 7 + d.speed * 9,
    reverse: 3.5,
    accel: 3.2 + d.accel * 5,
    brake: 13,
    grip: 3.5 + d.grip * 9,
    ...size,
    ...feel,
  };
}

export interface CarState {
  x: number;
  z: number;
  yaw: number;
  /** Speed along the nose (negative in reverse) */
  speed: number;
  /** The way it's actually moving (it can slide) */
  vx: number;
  vz: number;
  /** Front wheels' angle (radians, positive to the right) */
  steer: number;
  /** How fast it's turning (radians/s), for the body's lean */
  yawRate: number;
  /** How far into a drift (0 gripping, 1 a full slide) */
  drift: number;
}

export interface DriveInput {
  /** Gas (up to 1) or brake / reverse (down to -1) */
  throttle: number;
  /** Left (-1) to right (1) */
  steer: number;
  handbrake: boolean;
}

export interface DriveWorld {
  /** Solid boxes: x0, z0, x1, z1, height */
  boxes: Box[];
  /** Things to bump softly: other cars, people (circles) */
  soft: { x: number; z: number; r: number }[];
}

/**
 * How far round a car the solid boxes need gathering for a step (the collision
 * grid's `near()`): its length, how far it goes and a push or two. The tests
 * check a step with only these boxes ends exactly where it would with all.
 */
export const reachOf = (c: { speed: number }) => 8 + Math.abs(c.speed) * 0.05;

export const newCar = (x: number, z: number, yaw: number): CarState => ({ x, z, yaw, speed: 0, vx: 0, vz: 0, steer: 0, yawRate: 0, drift: 0 });

/** The slide: the angle from the nose to the way the car is moving (radians; positive, moving to the nose's right) */
export function slipOf(c: CarState) {
  const fwd = c.vx * Math.cos(c.yaw) - c.vz * Math.sin(c.yaw);
  const side = c.vx * Math.sin(c.yaw) + c.vz * Math.cos(c.yaw);
  return Math.hypot(fwd, side) < 0.5 ? 0 : Math.atan2(side, Math.abs(fwd));
}

/** How long each piece of the river's wall is along x (it follows the water's edges: river.ts) */
export const WALL_STEP = 2;
/**
 * The river is a wall except where the bridges cross it (the river's run and its bridges from the street plan:
 * growth plan Phase 5): in pieces `WALL_STEP` long, west to east, each over the water there, the further of its
 * edges along the piece and a little more (river plan step 1: the banks curve)
 */
export const RIVER_WALLS: Box[] = (() => {
  const { run, bridges } = riverCrossings();
  const out: Box[] = [];
  const stretch = (a: number, b: number) => {
    const k = Math.max(1, Math.ceil((b - a) / WALL_STEP));
    for (let i = 0; i < k; i++) {
      const [p0, p1] = [a + ((b - a) * i) / k, a + ((b - a) * (i + 1)) / k];
      // (at the tops of the banks' slopes, where they slope down to the water: river plan step 2)
      const e = edgeSamples(p0, p1, (p1 - p0) / 2).map((q) => topsAt(q.x));
      out.push([p0, Math.min(...e.map((q) => q[0])) - 0.3, p1, Math.max(...e.map((q) => q[1])) + 0.3, 2]);
    }
  };
  let at = run[0];
  for (const [g0, g1] of bridges) {
    stretch(at, g0 + 0.1);
    at = g1 - 0.1;
  }
  stretch(at, run[1]);
  return out;
})();
/** The river's walls a car at x might touch (`reach` either way): they're in order along x */
export function riverWallsNear(x: number, reach: number): Box[] {
  let lo = 0;
  let hi = RIVER_WALLS.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (RIVER_WALLS[mid][2] < x - reach) lo = mid + 1;
    else hi = mid;
  }
  const out: Box[] = [];
  for (let i = lo; i < RIVER_WALLS.length && RIVER_WALLS[i][0] <= x + reach; i++) out.push(RIVER_WALLS[i]);
  return out;
}

const approach = (v: number, target: number, step: number) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));

/** The car's three collision circles (centres along its length, one radius) */
export function circles(c: { x: number; z: number; yaw: number }, t: DriveTune) {
  const fx = Math.cos(c.yaw);
  const fz = -Math.sin(c.yaw);
  const r = t.W * 0.5;
  const reach = t.L / 2 - r;
  return [-reach, 0, reach].map((o) => ({ x: c.x + fx * o, z: c.z + fz * o, r }));
}

/**
 * One step. Returns how hard it hit something (0 if nothing), for a bump
 * sound and a shake.
 */
export function stepCar(c: CarState, inp: DriveInput, t: DriveTune, dt: number, world: DriveWorld, bounds: Box): number {
  // Gas, brake, reverse
  const th = Math.max(-1, Math.min(1, inp.throttle));
  if (th > 0.02) {
    if (c.speed < -0.3) c.speed = approach(c.speed, 0, t.brake * th * dt);
    else c.speed += t.accel * th * Math.max(0, 1 - (c.speed / t.top) ** 2) * dt;
  } else if (th < -0.02) {
    if (c.speed > 0.3) c.speed = approach(c.speed, 0, t.brake * -th * dt);
    else c.speed = approach(c.speed, -t.reverse * -th, t.accel * 0.7 * -th * dt);
  } else c.speed = approach(c.speed, 0, (1.6 + Math.abs(c.speed) * 0.08) * dt);
  if (inp.handbrake) c.speed = approach(c.speed, 0, 3.5 * dt);

  // Drifting: the handbrake at a roll, or full power through a turn in a rear-drive car, breaks the tail away;
  // throttle keeps it going while it's out; otherwise the grip comes back
  const wheel = Math.max(-1, Math.min(1, inp.steer));
  const slip = slipOf(c);
  const power = t.rwd && th > DRIFT.power.throttle && Math.abs(wheel) > DRIFT.power.wheel && c.speed > DRIFT.power.speed;
  const held = c.drift > 0.2 && th > 0.25 && Math.abs(slip) > DRIFT.hold;
  const want = c.speed < DRIFT.min ? 0 : inp.handbrake ? 1 : power ? Math.max(c.drift, t.loose) : held ? c.drift : 0;
  c.drift = approach(c.drift, want, (want > c.drift ? (inp.handbrake ? DRIFT.brake : DRIFT.into) : DRIFT.out) * dt);
  // (a slide costs speed)
  c.speed -= c.speed * DRIFT.scrub * c.drift * Math.abs(Math.sin(slip)) * dt;

  // Steering: as quick as the model's rack, the wheels turning less the faster it goes; the nose answers as quickly
  // as its weight lets it, and comes round quicker in a drift
  const max = t.lock / (1 + Math.abs(c.speed) / 5);
  c.steer = approach(c.steer, wheel * max, t.steerRate * dt);
  const yawTo = ((-c.speed * Math.tan(c.steer)) / t.wheelbase) * (1 + DRIFT.turn * c.drift);
  c.yawRate += (yawTo - c.yawRate) * (1 - Math.exp((-14 / t.mass) * dt));
  c.yaw += c.yawRate * dt;

  // The slide catches up with the nose, slower in a drift
  const grip = t.grip * (1 - DRIFT.grip * c.drift);
  const k = 1 - Math.exp(-grip * dt);
  const nfx = Math.cos(c.yaw);
  const nfz = -Math.sin(c.yaw);
  c.vx += (nfx * c.speed - c.vx) * k;
  c.vz += (nfz * c.speed - c.vz) * k;
  // Never further round than `most` from the nose: the slide is held there, never a spin
  const after = slipOf(c);
  if (Math.abs(after) > DRIFT.most) {
    const v = Math.hypot(c.vx, c.vz);
    const a = Math.sign(after) * DRIFT.most;
    const dir = Math.sign(c.vx * nfx + c.vz * nfz) || 1;
    // (the nose's way, turned `a` to its right: right is (sin yaw, cos yaw))
    c.vx = v * (dir * nfx * Math.cos(a) + Math.sin(c.yaw) * Math.sin(a));
    c.vz = v * (dir * nfz * Math.cos(a) + Math.cos(c.yaw) * Math.sin(a));
  }
  c.x += c.vx * dt;
  c.z += c.vz * dt;

  // Soft collisions: push each circle out of whatever it overlaps and lose the speed going into it
  let hit = 0;
  // (Westlake Park's lake only when the car's anywhere near it)
  const walls = world.boxes.concat(c.z > RIVER[0] - 8 && c.z < RIVER[1] + 8 ? riverWallsNear(c.x, 6) : [], Math.hypot(c.x - LAKE_C[0], c.z - LAKE_C[1]) < 50 ? LAKE_WALLS : []);
  /** Move the car (and the circle being checked) out along n */
  const push = (cc: { x: number; z: number }, nx: number, nz: number, depth: number, soft: boolean) => {
    c.x += nx * depth;
    c.z += nz * depth;
    cc.x += nx * depth;
    cc.z += nz * depth;
    const into = -(c.vx * nx + c.vz * nz);
    if (into > 0) {
      hit = Math.max(hit, into);
      // Slide along a wall; people and cars stop it gently instead
      c.vx += nx * into * (soft ? 1.2 : 1.05);
      c.vz += nz * into * (soft ? 1.2 : 1.05);
    }
    c.speed = c.vx * Math.cos(c.yaw) - c.vz * Math.sin(c.yaw);
  };
  for (let pass = 0; pass < 2; pass++) {
    for (const cc of circles(c, t)) {
      for (const b of walls) {
        if (b[4] < 0.3) continue;
        if (cc.x < b[0] - cc.r || cc.x > b[2] + cc.r || cc.z < b[1] - cc.r || cc.z > b[3] + cc.r) continue;
        const px = Math.max(b[0], Math.min(cc.x, b[2]));
        const pz = Math.max(b[1], Math.min(cc.z, b[3]));
        let dx = cc.x - px;
        let dz = cc.z - pz;
        let d = Math.hypot(dx, dz);
        if (d >= cc.r) continue;
        if (d < 1e-4) {
          // Centre inside the box: out the nearest side
          const sides = [cc.x - b[0], b[2] - cc.x, cc.z - b[1], b[3] - cc.z];
          const m = sides.indexOf(Math.min(...sides));
          [dx, dz] = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ][m];
          push(cc, dx, dz, sides[m] + cc.r, false);
        } else push(cc, dx / d, dz / d, cc.r - d, false);
      }
      for (const s of world.soft) {
        const dx = cc.x - s.x;
        const dz = cc.z - s.z;
        const d = Math.hypot(dx, dz);
        const min = cc.r + s.r;
        if (d >= min || d < 1e-4) continue;
        push(cc, dx / d, dz / d, min - d, true);
      }
    }
  }

  // The edge of the world
  const [x0, z0, x1, z1] = bounds;
  if (c.x < x0 || c.x > x1 || c.z < z0 || c.z > z1) {
    c.x = Math.max(x0, Math.min(x1, c.x));
    c.z = Math.max(z0, Math.min(z1, c.z));
    hit = Math.max(hit, Math.abs(c.speed));
    c.speed *= 0.3;
    c.vx *= 0.3;
    c.vz *= 0.3;
  }
  return hit;
}

/* ---------- What the car shows and sounds (city life plan, Phase 2) ---------- */

/** The car's lights this frame */
export interface CarLights {
  /** Brake lights: braking from a roll, or the handbrake on the move */
  brake: boolean;
  /** Reversing lights */
  reverse: boolean;
  /** The indicator flashing, if any */
  turn: 'L' | 'R' | null;
}

/** Below this speed (tiles/s) steering is a turn, not a lane change: the indicators follow the wheel */
export const SIGNAL_SPEED = 2.5;
/** How long an indicator stays on after the wheel straightens (seconds) */
export const SIGNAL_HOLD = 1.2;

/** The indicators' memory: the side lit and how long it has left */
export interface TurnSignal {
  side: 'L' | 'R' | null;
  hold: number;
}
export const newSignal = (): TurnSignal => ({ side: null, hold: 0 });

/**
 * The lights from the car's state and the driver's input. The indicators come on with the wheel below
 * SIGNAL_SPEED (and at a stop) and stay SIGNAL_HOLD after it straightens, so they don't flicker with the stick.
 */
export function carLights(c: CarState, inp: DriveInput, sig: TurnSignal, dt: number): CarLights {
  const brake = (inp.throttle < -0.05 && c.speed > 0.3) || (inp.handbrake && Math.abs(c.speed) > 0.3);
  const reverse = c.speed < -0.2;
  if (Math.abs(c.speed) < SIGNAL_SPEED && Math.abs(inp.steer) > 0.5) {
    sig.side = inp.steer > 0 ? 'R' : 'L';
    sig.hold = SIGNAL_HOLD;
  } else if (sig.side) {
    sig.hold -= dt;
    if (sig.hold <= 0) sig.side = null;
  }
  return { brake, reverse, turn: sig.side };
}

/** Where the gearbox shifts up, as shares of the top speed */
export const GEARS = [0.22, 0.45, 0.7];

/**
 * The gear for a speed: 'R' in reverse, 'N' stopped with no throttle, else 1-4; and the engine's revs
 * (0..1) climbing through each gear and dropping at the shift
 */
export function gearOf(speed: number, top: number, throttle = 0): { gear: 'R' | 'N' | 1 | 2 | 3 | 4; revs: number } {
  if (speed < -0.2) return { gear: 'R', revs: Math.min(1, -speed / 3.5) };
  if (Math.abs(speed) < 0.2 && Math.abs(throttle) < 0.05) return { gear: 'N', revs: 0 };
  const f = Math.max(0, speed / top);
  let g = 0;
  while (g < GEARS.length && f >= GEARS[g]) g++;
  const lo = g ? GEARS[g - 1] : 0;
  const hi = g < GEARS.length ? GEARS[g] : 1.08;
  return { gear: (g + 1) as 1 | 2 | 3 | 4, revs: Math.min(1, 0.25 + 0.75 * ((f - lo) / (hi - lo))) };
}

/**
 * An electric car's one gear (vehicle plan Phase 6, the Glow Pod): 'R', 'N' as gearOf, else 'D'; its motor's revs
 * climb smoothly with the speed, no shifts
 */
export function motorOf(speed: number, top: number, throttle = 0): { gear: 'R' | 'N' | 'D'; revs: number } {
  if (speed < -0.2) return { gear: 'R', revs: Math.min(1, -speed / 3.5) };
  if (Math.abs(speed) < 0.2 && Math.abs(throttle) < 0.05) return { gear: 'N', revs: 0 };
  return { gear: 'D', revs: Math.min(1, Math.max(0, speed / top)) };
}

/** A tyre leaves a mark past this much sideways speed (tiles/s) */
export const SKID_SLIP = 1.2;

/**
 * How hard the tyres are sliding: the speed sideways to the nose (tiles/s), 0 under SKID_SLIP unless the
 * handbrake is on at a roll. The marks and the screech follow it.
 */
export function skidding(c: CarState, inp: DriveInput): number {
  const nx = Math.cos(c.yaw);
  const nz = -Math.sin(c.yaw);
  const side = Math.abs(c.vx * nz - c.vz * nx);
  if (inp.handbrake && Math.abs(c.speed) > 1.5) return Math.max(side, 1.5);
  return side >= SKID_SLIP ? side : 0;
}
