/*
 * One step of flying your aircraft (Airport Phase 2; the rules' header is flight-sim.ts's): the plane's and the
 * helicopter's handling, touching down, the soft collisions and the turn back at the world's edge. Its own file so it
 * stays out of the boot: fly.ts loads it when you come near an aircraft or climb in (`lazy()`). DOM-free, tested in
 * tests/flight.test.ts.
 */
import type { Box } from './solids';
import { CEILING, CLIMB_OUT, EDGE_TURN, floorAt, hullAt, type FlyInput, type FlyState, type FlyTune, type FlyWorld } from './flight-sim';

const approach = (v: number, target: number, step: number) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

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
