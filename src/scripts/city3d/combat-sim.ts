/*
 * Target practice rules, kept apart from anything on screen so the same code
 * can run on a game server when multiplayer arrives.
 *
 * - No DOM, no scene, no Math.random: only three.js maths, a seeded random
 *   generator and the world's ray test passed in. Same inputs, same results.
 * - Runs on a fixed 60 Hz tick. Each player sends inputs (trigger, aim, where
 *   the camera looks); the sim fires, resolves hits and keeps ammo, health,
 *   score and streaks.
 * - Everything that happens comes out as events (shots, hits, takedowns,
 *   reloads, respawns) for the view to draw and play, or for a server to send.
 */
import * as THREE from 'three';

export const TICK = 1 / 60;

export const WEAPON = {
  mag: 30,
  reserve: 120,
  /** Rounds a second, full auto */
  rate: 9.5,
  damage: 25,
  reload: 1.7,
  range: 70,
  /** Shot cone (radians) from the hip and aimed, and how much each shot opens it */
  spreadHip: 0.012,
  spreadAim: 0.003,
  bloom: 0.005,
  bloomMax: 0.04,
  bloomDecay: 0.2,
  /** Phones: snap to a target this close to the crosshair (radians), within this range */
  assistCone: 0.12,
  assistRange: 38,
};

export const POINTS = { hit: 10, dummy: 100, drone: 150 };
/** Seconds to chain another takedown into a streak */
export const STREAK_WINDOW = 6;

/** Training dummies: x, z and facing, in the park and on a few lots */
export const DUMMIES: [number, number, number][] = [
  [5.15, 3.0, 0],
  [7.45, 3.0, 0],
  [2.6, 7.6, Math.PI / 2],
  [7.7, 24.1, Math.PI / 4],
  [8.1, 25.6, Math.PI / 4],
  [28.6, 7.0, 0],
  [24.4, 6.4, 0],
];
const DUMMY = { hp: 100, down: 4, lo: new THREE.Vector3(-0.31, 0.34, -0.06), hi: new THREE.Vector3(0.31, 1.27, 0.06), aimY: 0.8 };

/** Patrol loops (x0, z0, x1, z1, height) and the drones flying them */
export const DRONE_LOOPS: [number, number, number, number, number][] = [
  [10, 10, 21, 21, 4.4],
  [-1, -1, 32, 32, 5.6],
];
export const DRONES: { loop: number; phase: number }[] = [
  { loop: 0, phase: 0 },
  { loop: 0, phase: 22 },
  { loop: 1, phase: 0 },
  { loop: 1, phase: 66 },
];
/** Drones stay down longer: the view shows them falling first */
const DRONE = { hp: 75, down: 7.5, radius: 0.42, speed: 1.8 };

/** Where a drone is at `time` (pure, so every client agrees) */
export function dronePose(i: number, time: number, out: { x: number; y: number; z: number; heading: number }) {
  const spec = DRONES[i];
  const [x0, z0, x1, z1, h] = DRONE_LOOPS[spec.loop];
  const w = x1 - x0;
  const d = z1 - z0;
  const per = 2 * (w + d);
  let u = (((time * DRONE.speed + spec.phase) % per) + per) % per;
  if (u < w) Object.assign(out, { x: x0 + u, z: z0, heading: Math.PI / 2 });
  else if ((u -= w) < d) Object.assign(out, { x: x1, z: z0 + u, heading: 0 });
  else if ((u -= d) < w) Object.assign(out, { x: x1 - u, z: z1, heading: -Math.PI / 2 });
  else Object.assign(out, { x: x0, z: z1 - (u - w), heading: Math.PI });
  out.y = h + Math.sin(time * 1.3 + spec.phase) * 0.25;
  return out;
}

export type TargetKind = 'dummy' | 'drone';
export interface SimTarget {
  id: number;
  kind: TargetKind;
  hp: number;
  max: number;
  /** Seconds until it's back (0 while up) */
  down: number;
  x: number;
  y: number;
  z: number;
  heading: number;
}

export interface SimInput {
  fire: boolean;
  aim: boolean;
  /** Touch screens get a little aim assist */
  assist: boolean;
  origin: THREE.Vector3;
  dir: THREE.Vector3;
  /** The drone clock the shooter saw (their screen lags the server a little); drones are hit-tested there */
  view?: number;
}

export interface SimPlayer {
  id: string;
  geared: boolean;
  armed: boolean;
  mag: number;
  reserve: number;
  cooldown: number;
  /** Seconds of reload left (0 when not reloading) */
  reload: number;
  spread: number;
  score: number;
  streak: number;
  streakT: number;
  input: SimInput;
}

export type SimEvent =
  | { type: 'shot'; player: string; from: THREE.Vector3; to: THREE.Vector3; target: number | null; dist: number }
  | { type: 'hit'; player: string; target: number; damage: number; at: THREE.Vector3; hp: number }
  | { type: 'takedown'; player: string; target: number; at: THREE.Vector3; points: number; streak: number }
  | { type: 'empty'; player: string }
  | { type: 'reload'; player: string; phase: 'start' | 'done' }
  | { type: 'armed'; player: string; on: boolean }
  | { type: 'gear'; player: string }
  | { type: 'respawn'; target: number }
  | { type: 'streak-end'; player: string };

export interface SimOptions {
  /** Height of the ground the dummies stand on */
  ground: number;
  /** Distance along a ray to the first building or the ground */
  rayWorld(from: THREE.Vector3, dir: THREE.Vector3, max: number): number;
  seed?: number;
  /**
   * False in a multiplayer browser: shots are only predicted (for the tracer and
   * ammo) and the server's events decide hits, health and score.
   */
  authority?: boolean;
}

/** Small seeded random generator (mulberry32) */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How far back a shooter's view of the drones is trusted (seconds) */
const MAX_REWIND = 0.35;

export function createSim(o: SimOptions) {
  const authority = o.authority ?? true;
  const random = rng(o.seed ?? 1444);
  const events: SimEvent[] = [];
  const players = new Map<string, SimPlayer>();
  let time = 0;
  /** Drone clock: stands still when motion is off */
  let poseTime = 0;
  let acc = 0;
  let moving = true;

  const targets: SimTarget[] = [];
  const dummyInv: THREE.Matrix4[] = [];
  for (const [x, z, ry] of DUMMIES) {
    const m = new THREE.Matrix4().makeRotationY(ry).setPosition(x, o.ground, z);
    dummyInv.push(m.clone().invert());
    targets.push({ id: targets.length, kind: 'dummy', hp: DUMMY.hp, max: DUMMY.hp, down: 0, x, y: o.ground, z, heading: ry });
  }
  const firstDrone = targets.length;
  const pose = { x: 0, y: 0, z: 0, heading: 0 };
  DRONES.forEach((_, i) => {
    dronePose(i, 0, pose);
    targets.push({ id: targets.length, kind: 'drone', hp: DRONE.hp, max: DRONE.hp, down: 0, ...pose });
  });

  const box = new THREE.Box3(DUMMY.lo, DUMMY.hi);
  const sphere = new THREE.Sphere(new THREE.Vector3(), DRONE.radius);
  const localRay = new THREE.Ray();
  const hitP = new THREE.Vector3();
  const ray = new THREE.Ray();
  const dir = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  /** Distance along the ray to a target, or null. Drones are placed where the shooter saw them. */
  function hitTarget(t: SimTarget, r: THREE.Ray, view?: number) {
    if (t.down > 0) return null;
    if (t.kind === 'dummy') {
      localRay.copy(r).applyMatrix4(dummyInv[t.id]);
      return localRay.intersectBox(box, hitP) ? hitP.distanceTo(localRay.origin) : null;
    }
    if (view !== undefined && view < poseTime) {
      dronePose(t.id - firstDrone, Math.max(view, poseTime - MAX_REWIND), pose);
      sphere.center.set(pose.x, pose.y, pose.z);
    } else sphere.center.set(t.x, t.y, t.z);
    return r.intersectSphere(sphere, hitP) ? hitP.distanceTo(r.origin) : null;
  }

  function startReload(p: SimPlayer) {
    if (!p.armed || p.reload > 0 || p.mag === WEAPON.mag || p.reserve === 0) return;
    p.reload = WEAPON.reload;
    events.push({ type: 'reload', player: p.id, phase: 'start' });
  }

  function fire(p: SimPlayer) {
    const inp = p.input;
    if (p.mag === 0) {
      events.push({ type: 'empty', player: p.id });
      p.cooldown = 0.25;
      if (p.reserve > 0) startReload(p);
      return;
    }
    p.mag--;
    p.cooldown += 1 / WEAPON.rate;
    dir.copy(inp.dir).normalize();
    if (inp.assist) {
      let best = WEAPON.assistCone;
      for (const t of targets) {
        if (t.down > 0) continue;
        tmp.set(t.x, t.y + (t.kind === 'dummy' ? DUMMY.aimY : 0), t.z).sub(inp.origin);
        if (tmp.length() > WEAPON.assistRange) continue;
        const ang = tmp.normalize().angleTo(inp.dir);
        if (ang < best) {
          best = ang;
          dir.copy(tmp);
        }
      }
    }
    const s = p.spread + (inp.aim ? WEAPON.spreadAim : WEAPON.spreadHip);
    dir.x += (random() - 0.5) * s * 2;
    dir.y += (random() - 0.5) * s * 2;
    dir.z += (random() - 0.5) * s * 2;
    dir.normalize();
    p.spread = Math.min(WEAPON.bloomMax, p.spread + WEAPON.bloom);
    ray.set(inp.origin, dir);

    let dist = o.rayWorld(inp.origin, dir, WEAPON.range);
    let hit: SimTarget | null = null;
    for (const t of targets) {
      const d = hitTarget(t, ray, inp.view);
      if (d !== null && d < dist && d > 0.5) {
        dist = d;
        hit = t;
      }
    }
    const at = ray.at(dist, new THREE.Vector3());
    events.push({ type: 'shot', player: p.id, from: inp.origin.clone(), to: at, target: hit ? hit.id : null, dist });
    if (hit && authority) damage(p, hit, at);
  }

  function damage(p: SimPlayer, t: SimTarget, at: THREE.Vector3) {
    t.hp = Math.max(0, t.hp - WEAPON.damage);
    p.score += POINTS.hit;
    events.push({ type: 'hit', player: p.id, target: t.id, damage: WEAPON.damage, at: at.clone(), hp: t.hp });
    if (t.hp > 0) return;
    const points = t.kind === 'drone' ? POINTS.drone : POINTS.dummy;
    p.score += points;
    p.streak = p.streakT > 0 ? p.streak + 1 : 1;
    p.streakT = STREAK_WINDOW;
    t.down = t.kind === 'drone' ? DRONE.down : DUMMY.down;
    events.push({ type: 'takedown', player: p.id, target: t.id, at: at.clone(), points, streak: p.streak });
  }

  function step(motion: boolean) {
    time += TICK;
    if (motion) poseTime += TICK;
    for (const t of targets) {
      // A browser in multiplayer waits for the server to bring targets back
      if (t.down > 0 && authority) {
        t.down -= TICK;
        if (t.down <= 0) {
          t.down = 0;
          t.hp = t.max;
          events.push({ type: 'respawn', target: t.id });
        }
      }
      if (t.kind === 'drone' && t.down === 0) dronePose(t.id - firstDrone, poseTime, t);
    }
    for (const p of players.values()) {
      p.cooldown = Math.max(p.cooldown - TICK, -1 / WEAPON.rate);
      p.spread = Math.max(0, p.spread - WEAPON.bloomDecay * TICK);
      if (p.reload > 0) {
        p.reload -= TICK;
        if (p.reload <= 0) {
          p.reload = 0;
          const take = Math.min(WEAPON.mag - p.mag, p.reserve);
          p.mag += take;
          p.reserve -= take;
          events.push({ type: 'reload', player: p.id, phase: 'done' });
        }
      }
      if (p.streakT > 0) {
        p.streakT -= TICK;
        if (p.streakT <= 0) {
          p.streak = 0;
          events.push({ type: 'streak-end', player: p.id });
        }
      }
      if (!p.input.fire) p.cooldown = Math.max(p.cooldown, 0);
      if (p.armed && p.input.fire && p.cooldown <= 0 && p.reload <= 0) fire(p);
    }
  }

  const player = (id: string) => players.get(id)!;
  function setArmed(id: string, on: boolean) {
    const p = player(id);
    const next = on && p.geared;
    if (next === p.armed) return;
    p.armed = next;
    if (!next) {
      p.input.fire = false;
      p.reload = 0;
    }
    events.push({ type: 'armed', player: id, on: next });
  }

  return {
    targets,
    players,
    get time() {
      return time;
    },
    /** The drone clock, including the part-tick since the last step (for smooth drawing) */
    get poseNow() {
      return poseTime + (moving ? acc : 0);
    },
    addPlayer(id: string) {
      const p: SimPlayer = {
        id,
        geared: false,
        armed: false,
        mag: WEAPON.mag,
        reserve: WEAPON.reserve,
        cooldown: 0,
        reload: 0,
        spread: 0,
        score: 0,
        streak: 0,
        streakT: 0,
        input: { fire: false, aim: false, assist: false, origin: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, -1) },
      };
      players.set(id, p);
      return p;
    },
    removePlayer(id: string) {
      players.delete(id);
    },
    /** Take a rifle from the Armoury rack (and refill ammo) */
    gearUp(id: string) {
      const p = player(id);
      p.geared = true;
      p.mag = WEAPON.mag;
      p.reserve = WEAPON.reserve;
      p.reload = 0;
      events.push({ type: 'gear', player: id });
      setArmed(id, true);
    },
    setArmed,
    reload(id: string) {
      startReload(player(id));
    },
    /** The latest input from a player; it holds until the next one */
    setInput(id: string, input: Partial<SimInput>) {
      const p = player(id);
      const { origin, dir, ...rest } = input;
      Object.assign(p.input, rest);
      if (origin) p.input.origin.copy(origin);
      if (dir) p.input.dir.copy(dir);
    },
    /** Run as many fixed ticks as `dt` covers (capped, so a stalled tab doesn't spiral) */
    advance(dt: number, motion = true) {
      moving = motion;
      acc += Math.min(dt, 0.25);
      let n = 0;
      while (acc >= TICK && n < 15) {
        step(motion);
        acc -= TICK;
        n++;
      }
      if (n === 15) acc = 0;
      return n;
    },
    /** Multiplayer browsers: follow the server's drone clock */
    setPoseTime(t: number) {
      poseTime = t;
      acc = 0;
    },
    /** Multiplayer browsers: the server's word on each target (health, knocked down or not) */
    applyTargets(rows: [number, number, number][]) {
      for (const [id, hp, down] of rows) {
        const t = targets[id];
        if (!t) continue;
        t.hp = hp;
        if (down && t.down === 0) t.down = 1;
        else if (!down && t.down > 0) {
          t.down = 0;
          events.push({ type: 'respawn', target: id });
        }
      }
    },
    /** Multiplayer browsers: the server's word on a player's ammo and score */
    syncPlayer(id: string, s: { mag: number; reserve: number; reloading: boolean; score: number; streak: number; armed: boolean }) {
      const p = player(id);
      p.score = s.score;
      p.streak = s.streak;
      p.streakT = s.streak ? STREAK_WINDOW : 0;
      if (p.armed !== s.armed) {
        p.armed = s.armed;
        events.push({ type: 'armed', player: id, on: s.armed });
      }
      // Ammo: trust our own prediction mid-burst or mid-reload, otherwise take the server's count
      if (!p.input.fire && p.reload === 0 && !s.reloading) {
        p.mag = s.mag;
        p.reserve = s.reserve;
      }
      if (s.armed) p.geared = true;
    },
    /** Hand over (and clear) everything that happened since the last call */
    drain() {
      return events.splice(0, events.length);
    },
  };
}

export type Sim = ReturnType<typeof createSim>;
