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
 * - Grip decides how quickly the car's slide follows its nose (the
 *   handbrake lets it go, for a cartoon drift).
 * - Collisions are soft and safe: the car is three circles along its length;
 *   it slides along walls and bumps off other cars and people, losing speed,
 *   never hurting anyone.
 */
import type { Box } from './solids';
import { EXT, NS_ROADS, RIVER, WALK_W } from './layout';

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
}

/**
 * A car's 0..1 handling (mycar.ts DRIVE, with the garage's mods on: carStatsOf in
 * tycoon.ts can go past 1 a little) and size, as numbers the sim uses
 */
export function tune(d: { speed: number; accel: number; grip: number }, size: { L: number; W: number; wheelbase: number }): DriveTune {
  return {
    top: 7 + d.speed * 9,
    reverse: 3.5,
    accel: 3.2 + d.accel * 5,
    brake: 13,
    grip: 3.5 + d.grip * 9,
    ...size,
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

export const newCar = (x: number, z: number, yaw: number): CarState => ({ x, z, yaw, speed: 0, vx: 0, vz: 0, steer: 0, yawRate: 0 });

/** The river is a wall except where the bridges cross it */
export const RIVER_WALLS: Box[] = (() => {
  const gaps = NS_ROADS.map((r) => [r.c - r.half - WALK_W + 0.1, r.c + r.half + WALK_W - 0.1]).sort((a, b) => a[0] - b[0]);
  const out: Box[] = [];
  let at = EXT[0];
  for (const [g0, g1] of gaps) {
    out.push([at, RIVER[0] - 0.3, g0, RIVER[1] + 0.3, 2]);
    at = g1;
  }
  out.push([at, RIVER[0] - 0.3, EXT[1], RIVER[1] + 0.3, 2]);
  return out;
})();

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
  if (inp.handbrake) c.speed = approach(c.speed, 0, 5.5 * dt);

  // Steering: the wheels turn less the faster it goes
  const max = 0.62 / (1 + Math.abs(c.speed) / 5);
  c.steer = approach(c.steer, Math.max(-1, Math.min(1, inp.steer)) * max, 3.2 * dt);
  c.yawRate = (-c.speed * Math.tan(c.steer)) / t.wheelbase * (inp.handbrake ? 1.35 : 1);
  c.yaw += c.yawRate * dt;

  // The slide catches up with the nose; the handbrake lets it go
  const grip = t.grip * (inp.handbrake ? 0.22 : 1);
  const k = 1 - Math.exp(-grip * dt);
  const nfx = Math.cos(c.yaw);
  const nfz = -Math.sin(c.yaw);
  c.vx += (nfx * c.speed - c.vx) * k;
  c.vz += (nfz * c.speed - c.vz) * k;
  c.x += c.vx * dt;
  c.z += c.vz * dt;

  // Soft collisions: push each circle out of whatever it overlaps and lose the speed going into it
  let hit = 0;
  const walls = world.boxes.concat(RIVER_WALLS);
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
