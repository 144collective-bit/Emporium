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
 * - Targets are the dummies, the drones and the crew: a cartoon rival crew of
 *   goons on the south bank (`CREW_ZONE`, `CREW_SPOTS`). Each walks its route
 *   back and forth on the sim clock (`goonPatrol()`, pure, so every client
 *   agrees), jogs at a player who comes near (`setPlayerPos()`), shoves them
 *   (a `shove` event with the knockback direction) and backs off before it
 *   tries again. Shot down, it lies there a while and gets up at its spawn.
 *   They never leave the zone or cross the river; the city north of it stays
 *   a safe hangout.
 */
import * as THREE from 'three';
import { AVENUE_GAP, BS, CORE_ROADS, EW_ROADS, NS_ROADS, OUTER_HI, RING_LO, RIVER, SOUTH_ROAD, SOUTH_ROW, design } from './layout';
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

export const POINTS = { hit: 10, dummy: 100, drone: 150, goon: 120 };
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

/* ---------- The crew on the south bank ---------- */

/**
 * The south bank the crew keeps to: x0, z0, x1, z1. From the west bridge's east
 * kerb to just past South 5 (short of the garage), and from the river's south
 * wall to the south row's front. They never cross the river.
 */
export const CREW_ZONE: [number, number, number, number] = [RING_LO + AVENUE_GAP / 2, RIVER[1] + 0.25, OUTER_HI + BS + 2, SOUTH_ROW];
/** The riverside walk on the south bank (world.ts: between the river wall and the avenue), and its paving's height */
const WALK_Z = RIVER[1] + 1.3;
const WALK_Y = 0.05;
/** The avenue's south sidewalk, along the south row's front */
const PATH_Z = SOUTH_ROW - 0.4;
const SOUTH_BANK = EW_ROADS.find((r) => r.c === SOUTH_ROAD)!;

export interface CrewSpot {
  /** The patrol route, walked back and forth (x, z corners) */
  route: [number, number][];
  /** Where the goon stands up again after a knock-down (on the route) */
  spawn: [number, number];
  /** Head start along the route, so the crew doesn't march in step */
  phase: number;
}
const walk = (x0: number, x1: number, phase: number, dz = 0): CrewSpot => ({ route: dz ? [[x0, WALK_Z], [(x0 + x1) / 2, WALK_Z + dz], [x1, WALK_Z]] : [[x0, WALK_Z], [x1, WALK_Z]], spawn: [x0, WALK_Z], phase });
const path = (x0: number, x1: number, phase: number): CrewSpot => ({ route: [[x0, PATH_Z], [x1, PATH_Z]], spawn: [x0, PATH_Z], phase });
/**
 * The crew's patrol routes: short lines along the riverside walk between the bridges
 * (the bridges' roads cut the walk) and along the avenue's south sidewalk in front of
 * South 2 to 5. Never on the avenue's asphalt.
 */
export const CREW_SPOTS: CrewSpot[] = [
  walk(1, 13.5, 0),
  walk(20.5, 29.5, 7, 0.6),
  walk(31, 39.5, 3),
  walk(46.5, 52.5, 11),
  walk(53.5, 59, 5, -0.5),
  walk(70, 79.5, 9),
  path(2.5, 12, 4),
  path(25.5, 34.5, 13),
  path(48.5, 53.8, 2),
  path(69.5, 78.3, 8),
];
/** The goons: health, how long one stays down, the figure's scale and hit box, and how it moves */
export const GOON = {
  hp: 60,
  down: 8,
  /** The figure's scale (the player's), its hit box ~0.6 wide and 1.25 tall at that scale, aimed at 0.8 up */
  scale: 0.85,
  half: 0.3,
  height: 1.25,
  aimY: 0.8,
  /** Tiles a second on patrol, and jogging at a player */
  walk: 0.9,
  jog: 1.6,
  /** How near a player in the zone has to be to draw a goon off its route, and how near it gets before it shoves */
  sense: 7,
  reach: 0.8,
  /** Seconds it backs off after a shove before it can shove again */
  backoff: 2,
};
/** Each route's corner distances and length, worked out once */
const ROUTES = CREW_SPOTS.map((s) => {
  const cum = [0];
  for (let i = 1; i < s.route.length; i++) cum.push(cum[i - 1] + Math.hypot(s.route[i][0] - s.route[i - 1][0], s.route[i][1] - s.route[i - 1][1]));
  return { cum, len: cum[cum.length - 1] };
});

/** The ground under a goon: the riverside walk's paving, the avenue's asphalt or the sidewalk's slab */
const groundY = (z: number, slab: number) => (z < SOUTH_BANK.c - SOUTH_BANK.half ? WALK_Y : z > SOUTH_BANK.c + SOUTH_BANK.half ? slab : 0.035);

/** Where goon `i` is on its patrol at `time` (pure, so every client agrees): back and forth along the route */
export function goonPatrol(i: number, time: number, out: { x: number; z: number; heading: number }) {
  const s = CREW_SPOTS[i];
  const r = ROUTES[i];
  const per = 2 * r.len;
  let u = (((time * GOON.walk + s.phase) % per) + per) % per;
  const back = u > r.len;
  if (back) u = per - u;
  let k = 0;
  while (k < r.cum.length - 2 && r.cum[k + 1] < u) k++;
  const a = s.route[k];
  const b = s.route[k + 1];
  const f = (u - r.cum[k]) / (r.cum[k + 1] - r.cum[k] || 1);
  out.x = a[0] + (b[0] - a[0]) * f;
  out.z = a[1] + (b[1] - a[1]) * f;
  out.heading = Math.atan2(b[0] - a[0], b[1] - a[1]) + (back ? Math.PI : 0);
  return out;
}

export type GoonMode = 'patrol' | 'chase' | 'back' | 'return';
export interface GoonState {
  /** Its entry in CREW_SPOTS */
  spot: number;
  mode: GoonMode;
  /** Seconds of backing off left after a shove */
  back: number;
  /** The player it's after (or just shoved) */
  who: string | null;
}

export type TargetKind = 'dummy' | 'drone' | 'goon';
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
  /** Where the player stands (the camera in `input` is elsewhere), for the crew; null while away or in a car */
  at: { x: number; z: number } | null;
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
  | { type: 'streak-end'; player: string }
  /** A goon shoved a player: `dx`, `dz` is the direction to knock them back (unit length) */
  | { type: 'shove'; player: string; target: number; dx: number; dz: number };

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
  // The crew, after the drones (rows in applyTargets line up by index)
  const firstGoon = targets.length;
  const goons: GoonState[] = [];
  CREW_SPOTS.forEach((_, i) => {
    goonPatrol(i, 0, pose);
    targets.push({ id: targets.length, kind: 'goon', hp: GOON.hp, max: GOON.hp, down: 0, x: pose.x, y: groundY(pose.z, o.ground), z: pose.z, heading: pose.heading });
    goons.push({ spot: i, mode: 'patrol', back: 0, who: null });
  });

  const box = new THREE.Box3(DUMMY.lo, DUMMY.hi);
  const goonBox = new THREE.Box3();
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
    if (t.kind === 'goon') {
      // A standing figure: a box round it, whichever way it faces
      goonBox.min.set(t.x - GOON.half, t.y, t.z - GOON.half);
      goonBox.max.set(t.x + GOON.half, t.y + GOON.height * GOON.scale, t.z + GOON.half);
      return r.intersectBox(goonBox, hitP) ? hitP.distanceTo(r.origin) : null;
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
        tmp.set(t.x, t.y + (t.kind === 'dummy' ? DUMMY.aimY : t.kind === 'goon' ? GOON.aimY * GOON.scale : 0), t.z).sub(inp.origin);
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
    const points = t.kind === 'drone' ? POINTS.drone : t.kind === 'goon' ? POINTS.goon : POINTS.dummy;
    p.score += points;
    p.streak = p.streakT > 0 ? p.streak + 1 : 1;
    p.streakT = STREAK_WINDOW;
    t.down = t.kind === 'drone' ? DRONE.down : t.kind === 'goon' ? GOON.down : DUMMY.down;
    events.push({ type: 'takedown', player: p.id, target: t.id, at: at.clone(), points, streak: p.streak });
  }

  /** A target is back: a goon gets up at its spawn and walks back to its route */
  function revive(t: SimTarget) {
    t.down = 0;
    t.hp = t.max;
    if (t.kind !== 'goon') return;
    const g = goons[t.id - firstGoon];
    [t.x, t.z] = CREW_SPOTS[g.spot].spawn;
    t.y = groundY(t.z, o.ground);
    g.mode = 'return';
    g.back = 0;
    g.who = null;
  }

  const inZone = (x: number, z: number) => x >= CREW_ZONE[0] && x <= CREW_ZONE[2] && z >= CREW_ZONE[1] && z <= CREW_ZONE[3];
  /** Move a goon `step` tiles towards (or, negative, away from) a point, kept inside the zone */
  function walkTo(t: SimTarget, x: number, z: number, step: number) {
    const dx = x - t.x;
    const dz = z - t.z;
    const d = Math.hypot(dx, dz);
    if (d < 1e-6) return d;
    t.x = Math.min(CREW_ZONE[2], Math.max(CREW_ZONE[0], t.x + (dx / d) * step));
    t.z = Math.min(CREW_ZONE[3], Math.max(CREW_ZONE[1], t.z + (dz / d) * step));
    t.y = groundY(t.z, o.ground);
    t.heading = Math.atan2(dx, dz);
    return d;
  }
  /** One tick of the crew: patrol, jog at the nearest player in the zone, shove, back off, return */
  function stepGoons() {
    for (const g of goons) {
      const t = targets[firstGoon + g.spot];
      if (t.down > 0) continue;
      // The nearest player standing in the zone within reach
      let who: SimPlayer | null = null;
      let best = GOON.sense;
      for (const p of players.values()) {
        if (!p.at || !inZone(p.at.x, p.at.z)) continue;
        const d = Math.hypot(p.at.x - t.x, p.at.z - t.z);
        if (d < best) {
          best = d;
          who = p;
        }
      }
      if (g.back > 0) {
        // Just shoved: a few steps back, then it squares up again
        g.back = Math.max(0, g.back - TICK);
        g.mode = 'back';
        if (who) {
          if (g.back > GOON.backoff - 0.7) walkTo(t, who.at!.x, who.at!.z, -GOON.walk * TICK);
          t.heading = Math.atan2(who.at!.x - t.x, who.at!.z - t.z);
        }
        continue;
      }
      if (who) {
        g.mode = 'chase';
        g.who = who.id;
        const d = walkTo(t, who.at!.x, who.at!.z, Math.min(GOON.jog * TICK, Math.max(0, best - GOON.reach * 0.75)));
        if (d <= GOON.reach) {
          const dx = who.at!.x - t.x;
          const dz = who.at!.z - t.z;
          const n = Math.hypot(dx, dz) || 1;
          events.push({ type: 'shove', player: who.id, target: t.id, dx: dx / n, dz: dz / n });
          g.back = GOON.backoff;
        }
        continue;
      }
      g.who = null;
      if (g.mode !== 'patrol') {
        // Back to wherever its patrol has got to
        g.mode = 'return';
        goonPatrol(g.spot, poseTime, pose);
        if (walkTo(t, pose.x, pose.z, GOON.jog * TICK) <= GOON.jog * TICK) g.mode = 'patrol';
      }
      if (g.mode === 'patrol') {
        goonPatrol(g.spot, poseTime, t);
        t.y = groundY(t.z, o.ground);
      }
    }
  }

  function step(motion: boolean) {
    time += TICK;
    if (motion) poseTime += TICK;
    for (const t of targets) {
      // A browser in multiplayer waits for the server to bring targets back
      if (t.down > 0 && authority) {
        t.down -= TICK;
        if (t.down <= 0) {
          revive(t);
          events.push({ type: 'respawn', target: t.id });
        }
      }
      if (t.kind === 'drone' && t.down === 0) dronePose(t.id - firstDrone, poseTime, t);
    }
    // Under reduced motion the crew stands where it is, like the drones
    if (motion) stepGoons();
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
    /** The crew's state, one per goon (its target is `targets[firstGoon + i]`) */
    goons,
    firstGoon,
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
        at: null,
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
    /** Where a player stands on the ground (the crew goes by this, not the camera); anything not finite means away (in a car, or not walking) */
    setPlayerPos(id: string, x: number, z: number) {
      const p = player(id);
      if (!Number.isFinite(x) || !Number.isFinite(z)) p.at = null;
      else if (p.at) {
        p.at.x = x;
        p.at.z = z;
      } else p.at = { x, z };
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
          revive(t);
          t.hp = hp;
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
