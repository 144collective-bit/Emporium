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
 * - Guns fire full auto, one shot a pull, or a burst a pull (the Tri-Tap: three
 *   rounds at its rate, then a short pause before the next pull can fire).
 * - Each player's guns can carry the Armoury's mods (catalog.ts): `setMods()`
 *   stores them and every rule reads the modded gun through `weaponOf()`. The
 *   server never sets any, so there everything runs on the stock numbers.
 */
import * as THREE from 'three';
import { CORE_ROADS, NS_ROADS, design } from './layout';
import { PRACTICE } from './downtown';
import { applyGunMods, type GunMods } from './catalog';

export const TICK = 1 / 60;

/* ---------- The guns in the Armoury's store ---------- */

export type WeaponId = 'rifle' | 'smg' | 'shotgun' | 'dmr' | 'revolver' | 'burst' | 'lmg';
export interface Weapon {
  id: WeaponId;
  name: string;
  /** Short name for the swap button */
  short: string;
  /** One line for the store */
  blurb: string;
  /** Lifetime score that unlocks it in the store (cosmetic progress, never bought) */
  need: number;
  mag: number;
  reserve: number;
  /** Rounds a second */
  rate: number;
  /** Holding the trigger keeps firing; otherwise one shot per pull */
  auto: boolean;
  /** Damage per pellet, and pellets per shot */
  damage: number;
  pellets: number;
  reload: number;
  range: number;
  /** Shot cone (radians) from the hip and aimed, and how much each shot opens it */
  spreadHip: number;
  spreadAim: number;
  bloom: number;
  bloomMax: number;
  bloomDecay: number;
  /** How hard each shot kicks the view (radians) */
  kick: number;
  /** First person: how many degrees the view narrows when aiming */
  zoom: number;
  /** Rounds fired per trigger pull (a burst), 1 for the rest */
  burst?: number;
}

const BASE = { auto: true, pellets: 1, bloomDecay: 0.2 };
export const WEAPONS: Record<WeaponId, Weapon> = {
  rifle: { ...BASE, id: 'rifle', name: 'Assault Rifle', short: 'Rifle', blurb: 'All-rounder with a holo red-dot. Full auto.', need: 0, mag: 30, reserve: 120, rate: 9.5, damage: 25, reload: 1.7, range: 70, spreadHip: 0.012, spreadAim: 0.003, bloom: 0.005, bloomMax: 0.04, kick: 0.012, zoom: 20 },
  smg: { ...BASE, id: 'smg', name: 'Buzz SMG', short: 'SMG', blurb: 'Tiny, loud and fast. Sprays a big magazine up close.', need: 750, mag: 40, reserve: 160, rate: 15, damage: 14, reload: 1.4, range: 45, spreadHip: 0.02, spreadAim: 0.007, bloom: 0.004, bloomMax: 0.05, bloomDecay: 0.3, kick: 0.007, zoom: 14 },
  shotgun: { ...BASE, id: 'shotgun', name: 'Street Sweeper', short: 'Sweeper', blurb: 'Eight pellets a pull. Flattens anything close.', need: 2500, mag: 6, reserve: 36, rate: 1.4, auto: false, damage: 11, pellets: 8, reload: 2.2, range: 30, spreadHip: 0.065, spreadAim: 0.045, bloom: 0, bloomMax: 0, kick: 0.05, zoom: 10 },
  dmr: { ...BASE, id: 'dmr', name: 'Long Shot', short: 'Long Shot', blurb: 'Marksman rifle with a scope. Slow, precise, hits hard.', need: 6000, mag: 8, reserve: 40, rate: 2.6, auto: false, damage: 80, reload: 2.0, range: 120, spreadHip: 0.03, spreadAim: 0.0004, bloom: 0.02, bloomMax: 0.03, bloomDecay: 0.5, kick: 0.035, zoom: 36 },
  // Bought at the Armoury with Dorras (catalog.ts), never unlocked by score
  revolver: { ...BASE, id: 'revolver', name: 'Hand Cannon', short: 'Cannon', blurb: 'Six-shot revolver. Slow to fire, slower to reload, and it drops anything in one or two.', need: 0, mag: 6, reserve: 30, rate: 2.2, auto: false, damage: 60, reload: 2.4, range: 60, spreadHip: 0.018, spreadAim: 0.002, bloom: 0.015, bloomMax: 0.04, bloomDecay: 0.35, kick: 0.04, zoom: 18 },
  burst: { ...BASE, id: 'burst', name: 'Tri-Tap', short: 'Tri-Tap', blurb: 'Carbine that fires tight three-round bursts. Precise at range.', need: 0, mag: 36, reserve: 144, rate: 14, auto: false, burst: 3, damage: 22, reload: 1.8, range: 85, spreadHip: 0.01, spreadAim: 0.002, bloom: 0.004, bloomMax: 0.03, kick: 0.01, zoom: 24 },
  lmg: { ...BASE, id: 'lmg', name: 'Belt Feeder', short: 'Belt', blurb: 'A hundred-round belt and a bipod. Spray and keep spraying.', need: 0, mag: 100, reserve: 200, rate: 11, damage: 20, reload: 3.6, range: 65, spreadHip: 0.03, spreadAim: 0.012, bloom: 0.003, bloomMax: 0.06, bloomDecay: 0.18, kick: 0.016, zoom: 16 },
};
/** Store order, and each gun's number on the wire */
export const WEAPON_IDS: WeaponId[] = ['rifle', 'smg', 'shotgun', 'dmr', 'revolver', 'burst', 'lmg'];
export const weaponUnlocked = (id: unknown, total: number) => typeof id === 'string' && id in WEAPONS && total >= WEAPONS[id as WeaponId].need;
/** Seconds after a swap before the new gun can fire (it's being drawn) */
export const SWAP_TIME = 0.35;
/** Seconds after a burst's last round before the next pull can fire */
export const BURST_PAUSE = 0.28;
/** Phones: snap to a target this close to the crosshair (radians), within this range */
const ASSIST = { cone: 0.12, range: 38 };

export const POINTS = { hit: 10, dummy: 100, drone: 150 };
/** Seconds to chain another takedown into a streak */
export const STREAK_WINDOW = 6;

/**
 * Training dummies: x, z and facing. Three in the north-west pocket park (downtown.ts PRACTICE),
 * the rest on a few landmarks' lots (placed on the landmarks' drawing grid, layout.ts).
 */
export const DUMMIES: [number, number, number][] = [
  ...PRACTICE.map(([x, z], i): [number, number, number] => [x, z, i === 0 ? Math.PI / 2 : 0]),
  ...(
    [
      [7.7, 24.1, Math.PI / 4],
      [8.1, 25.6, Math.PI / 4],
      [28.6, 7.0, 0],
      [24.4, 6.4, 0],
    ] as [number, number, number][]
  ).map(([x, z, ry]): [number, number, number] => [...design(x, z), ry]),
];
const DUMMY = { hp: 100, down: 4, lo: new THREE.Vector3(-0.31, 0.34, -0.06), hi: new THREE.Vector3(0.31, 1.27, 0.06), aimY: 0.8 };

/** Patrol loops (x0, z0, x1, z1, height) and the drones flying them: round the Emporium's block over the core streets, and round the ring avenues */
export const DRONE_LOOPS: [number, number, number, number, number][] = [
  [CORE_ROADS[0], CORE_ROADS[0], CORE_ROADS[1], CORE_ROADS[1], 4.4],
  [NS_ROADS[0].c, NS_ROADS[0].c, NS_ROADS[3].c, NS_ROADS[3].c, 5.6],
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
  weapon: WeaponId;
  geared: boolean;
  armed: boolean;
  mag: number;
  reserve: number;
  /** Ammo left in the other guns carried (swapped out); a gun not in here is full */
  stash: Partial<Record<WeaponId, [mag: number, reserve: number]>>;
  cooldown: number;
  /** Seconds of reload left (0 when not reloading) */
  reload: number;
  spread: number;
  score: number;
  streak: number;
  streakT: number;
  /** The trigger was down last tick (semi-auto guns fire once per pull) */
  held: boolean;
  /** Rounds still to fire in the burst under way (0 between bursts) */
  burst: number;
  /** The Armoury's mods on each of this player's guns (none set: the stock gun) */
  mods: Partial<Record<WeaponId, GunMods>>;
  input: SimInput;
}

export type SimEvent =
  /** One per pellet; `pellet` 0 is the one that makes the noise */
  | { type: 'shot'; player: string; weapon: WeaponId; pellet: number; from: THREE.Vector3; to: THREE.Vector3; target: number | null; dist: number }
  | { type: 'hit'; player: string; target: number; damage: number; at: THREE.Vector3; hp: number }
  | { type: 'takedown'; player: string; target: number; at: THREE.Vector3; points: number; streak: number }
  | { type: 'empty'; player: string }
  | { type: 'reload'; player: string; phase: 'start' | 'done' }
  | { type: 'armed'; player: string; on: boolean }
  | { type: 'gear'; player: string; weapon: WeaponId }
  /** Swapped to another gun in the field (no refill) */
  | { type: 'swap'; player: string; weapon: WeaponId }
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
  const aim = new THREE.Vector3();
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

  /** Modded guns, worked out once per player and gun and kept until the mods change */
  const modded = new Map<string, Partial<Record<WeaponId, Weapon>>>();
  /** The rules of the gun a player carries, with their mods on */
  function weaponOf(p: SimPlayer): Weapon {
    const m = p.mods[p.weapon];
    if (!m || (!m.barrel && !m.mag && !m.grip)) return WEAPONS[p.weapon];
    let c = modded.get(p.id);
    if (!c) modded.set(p.id, (c = {}));
    return c[p.weapon] ?? (c[p.weapon] = applyGunMods(WEAPONS[p.weapon], m));
  }
  /** The modded rules of any gun a player owns (equipping and swapping fill its magazine) */
  function weaponFor(p: SimPlayer, weapon: WeaponId): Weapon {
    const m = p.mods[weapon];
    return m ? applyGunMods(WEAPONS[weapon], m) : WEAPONS[weapon];
  }

  function startReload(p: SimPlayer) {
    const W = weaponOf(p);
    if (!p.armed || p.reload > 0 || p.mag === W.mag || p.reserve === 0) return;
    p.reload = W.reload;
    p.burst = 0;
    events.push({ type: 'reload', player: p.id, phase: 'start' });
  }

  const hitsOn = new Map<SimTarget, { damage: number; at: THREE.Vector3 }>();
  /** One shot (every pellet of it); false when the magazine was empty */
  function fire(p: SimPlayer) {
    const inp = p.input;
    const W = weaponOf(p);
    if (p.mag === 0) {
      events.push({ type: 'empty', player: p.id });
      p.cooldown = 0.25;
      p.burst = 0;
      if (p.reserve > 0) startReload(p);
      return false;
    }
    p.mag--;
    p.cooldown += 1 / W.rate;
    aim.copy(inp.dir).normalize();
    if (inp.assist) {
      let best = ASSIST.cone;
      for (const t of targets) {
        if (t.down > 0) continue;
        tmp.set(t.x, t.y + (t.kind === 'dummy' ? DUMMY.aimY : 0), t.z).sub(inp.origin);
        if (tmp.length() > Math.min(ASSIST.range, W.range)) continue;
        const ang = tmp.normalize().angleTo(inp.dir);
        if (ang < best) {
          best = ang;
          aim.copy(tmp);
        }
      }
    }
    const s = p.spread + (inp.aim ? W.spreadAim : W.spreadHip);
    hitsOn.clear();
    // Each pellet flies on its own; damage on a target adds up into one hit
    for (let k = 0; k < W.pellets; k++) {
      dir.copy(aim);
      dir.x += (random() - 0.5) * s * 2;
      dir.y += (random() - 0.5) * s * 2;
      dir.z += (random() - 0.5) * s * 2;
      dir.normalize();
      ray.set(inp.origin, dir);
      let dist = o.rayWorld(inp.origin, dir, W.range);
      let hit: SimTarget | null = null;
      for (const t of targets) {
        const d = hitTarget(t, ray, inp.view);
        if (d !== null && d < dist && d > 0.5) {
          dist = d;
          hit = t;
        }
      }
      const at = ray.at(dist, new THREE.Vector3());
      events.push({ type: 'shot', player: p.id, weapon: W.id, pellet: k, from: inp.origin.clone(), to: at, target: hit ? hit.id : null, dist });
      if (hit) {
        const h = hitsOn.get(hit);
        if (h) h.damage += W.damage;
        else hitsOn.set(hit, { damage: W.damage, at });
      }
    }
    p.spread = Math.min(W.bloomMax, p.spread + W.bloom);
    if (authority) for (const [t, h] of hitsOn) damage(p, t, h.damage, h.at);
    return true;
  }

  function damage(p: SimPlayer, t: SimTarget, amount: number, at: THREE.Vector3) {
    if (t.down > 0) return;
    t.hp = Math.max(0, t.hp - amount);
    p.score += POINTS.hit;
    events.push({ type: 'hit', player: p.id, target: t.id, damage: amount, at: at.clone(), hp: t.hp });
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
      const W = weaponOf(p);
      p.cooldown = Math.max(p.cooldown - TICK, -1 / W.rate);
      p.spread = Math.max(0, p.spread - W.bloomDecay * TICK);
      if (p.reload > 0) {
        p.reload -= TICK;
        if (p.reload <= 0) {
          p.reload = 0;
          const take = Math.min(W.mag - p.mag, p.reserve);
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
      // (a burst under way carries on at the gun's rate, trigger or not)
      if (!p.input.fire && p.burst === 0) p.cooldown = Math.max(p.cooldown, 0);
      // Semi-auto guns need the trigger let go between shots (and between bursts)
      const pull = p.input.fire && (W.auto || !p.held);
      if (p.armed && p.cooldown <= 0 && p.reload <= 0) {
        if (p.burst > 0) {
          // The rest of the burst; it ends early on an empty magazine, then the pause
          p.burst = fire(p) && p.mag > 0 ? p.burst - 1 : 0;
          if (p.burst === 0) p.cooldown = Math.max(p.cooldown, BURST_PAUSE);
        } else if (pull && fire(p) && (W.burst ?? 1) > 1 && p.mag > 0) p.burst = W.burst! - 1;
      }
      p.held = p.input.fire;
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
      p.burst = 0;
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
        weapon: 'rifle',
        geared: false,
        armed: false,
        mag: WEAPONS.rifle.mag,
        reserve: WEAPONS.rifle.reserve,
        stash: {},
        cooldown: 0,
        reload: 0,
        spread: 0,
        score: 0,
        streak: 0,
        streakT: 0,
        held: false,
        burst: 0,
        mods: {},
        input: { fire: false, aim: false, assist: false, origin: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, -1) },
      };
      players.set(id, p);
      return p;
    },
    removePlayer(id: string) {
      players.delete(id);
      modded.delete(id);
    },
    /**
     * The Armoury's mods on one of a player's guns (catalog.ts). They change the gun's
     * rules from the next tick; a magazine already carried keeps its rounds and fills to
     * the new size on the next reload or at the counter.
     */
    setMods(id: string, weapon: WeaponId, mods: GunMods) {
      const p = player(id);
      if (!(weapon in WEAPONS)) return;
      p.mods[weapon] = { ...mods };
      delete modded.get(id)?.[weapon];
    },
    /** The rules of the gun a player carries, with their mods on (what the HUD shows) */
    weaponOf(id: string) {
      return weaponOf(player(id));
    },
    /**
     * Take a gun from the Armoury's store counter, full of ammo; every other gun is
     * refilled too (the same gun again just refills). Whether the player may have it
     * is checked by the caller.
     */
    equip(id: string, weapon: WeaponId) {
      const p = player(id);
      if (!(weapon in WEAPONS)) return;
      const W = weaponFor(p, weapon);
      p.weapon = weapon;
      p.geared = true;
      p.mag = W.mag;
      p.reserve = W.reserve;
      p.stash = {};
      p.reload = 0;
      p.cooldown = 0;
      p.spread = 0;
      p.burst = 0;
      events.push({ type: 'gear', player: id, weapon });
      setArmed(id, true);
    },
    /**
     * Swap to another gun anywhere once geared up. Each gun keeps its own ammo (a
     * gun not carried yet comes full), a reload in progress is dropped, and the new
     * gun fires after SWAP_TIME. Whether the player may have it is checked by the caller.
     */
    swap(id: string, weapon: WeaponId) {
      const p = player(id);
      if (!p.geared || !(weapon in WEAPONS) || weapon === p.weapon) return false;
      p.stash[p.weapon] = [p.mag, p.reserve];
      const W = weaponFor(p, weapon);
      [p.mag, p.reserve] = p.stash[weapon] ?? [W.mag, W.reserve];
      delete p.stash[weapon];
      p.weapon = weapon;
      p.reload = 0;
      p.cooldown = SWAP_TIME;
      p.spread = 0;
      p.burst = 0;
      p.held = p.input.fire;
      events.push({ type: 'swap', player: id, weapon });
      setArmed(id, true);
      return true;
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
    syncPlayer(id: string, s: { mag: number; reserve: number; reloading: boolean; score: number; streak: number; armed: boolean; weapon: WeaponId }) {
      const p = player(id);
      if (s.weapon !== p.weapon && s.weapon in WEAPONS) {
        delete p.stash[s.weapon];
        p.weapon = s.weapon;
        p.reload = 0;
        p.burst = 0;
      }
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
