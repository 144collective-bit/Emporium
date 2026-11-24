/*
 * The golf game's rules (docs/golf-game-plan.md Phase 1): DOM-free (on `DOM_FREE`), seeded, tested in
 * tests/golfgame.test.ts. The view only draws what these say (Phase 2).
 *
 * Units are tiles (about 1.8 m) and seconds; the course is laid at about half a real course's length (golf.ts
 * `PAR_LENGTH`), so the clubs carry about half a real club's distance.
 *
 * - **The clubs** (`CLUBS`): what each carries in the air on flat ground with no wind (`carry`), its loft, and how far
 *   a lie lets it go (`lieTake()`): clean off the tee and the fairway, less from the rough, a chip from the native
 *   grass, only a wedge out of a bunker. Each club's launch speed is worked out once from its carry (`launchOf()`), so
 *   the carries hold whatever the flight's numbers.
 * - **A shot** (`strike()`): the aim (a heading), the power (0 to 1, a little over 1 off the top of the meter: more
 *   distance, less control) and the accuracy (-1 to 1: 0 dead straight, negative a hook to the left, positive a slice
 *   to the right), the lie's own spray (seeded), the wind.
 * - **The flight** (`fly()`, a fixed step, `STEP`): gravity, the air's drag on the ball's speed through the air (the
 *   wind), the hook or slice's curve; the trees (golflift.ts `golfTrees()`) stop it dead or knock it down; on landing
 *   it bounces and rolls by what's underfoot (golf.ts `surfaceAt()`: `BOUNCE`, `ROLL`), with the ground's slope
 *   (golflift.ts `golfLift()`), into the cup if it's slow enough over it (`CUP`).
 * - **The penalties**: the water a stroke and a drop on dry land by where it went in, off the club's land (out of
 *   bounds) a stroke and the shot again from where it was played.
 * - **A round** (`newRound()`, `playShot()`): a hole, a nine or the eighteen, the card (strokes a hole), a hole picked up
 *   at `MAX_STROKES`.
 * - **The bot** (`botShot()`): the test golfer, aiming at the pin (or down the hole's line when it's out of reach) with
 *   the club that gets there, trying a spread of aims and powers on the sim itself and keeping the best: every hole is
 *   playable within par plus two.
 */
import { CLUB_GROUNDS, HOLES, LAKES, along, greenOf, inCourse, lakeAt, lengthOf, nearestOn, surfaceAt, teeOf, type Hole, type Pt, type Surface } from './golf';
import { golfLift, golfTrees, golfWater } from './golflift';

/* ---------- The clubs ---------- */

export type ClubId = 'driver' | 'wood3' | 'iron5' | 'iron7' | 'iron9' | 'pw' | 'sw' | 'putter';
export interface Club {
  id: ClubId;
  name: string;
  /** How far it carries in the air, flat and still (tiles) */
  carry: number;
  /** Its loft (radians): the launch angle */
  loft: number;
}
const deg = (d: number) => (d * Math.PI) / 180;
export const CLUBS: Club[] = [
  { id: 'driver', name: 'Driver', carry: 92, loft: deg(12) },
  { id: 'wood3', name: '3 Wood', carry: 80, loft: deg(15) },
  { id: 'iron5', name: '5 Iron', carry: 66, loft: deg(22) },
  { id: 'iron7', name: '7 Iron', carry: 54, loft: deg(30) },
  { id: 'iron9', name: '9 Iron', carry: 42, loft: deg(40) },
  { id: 'pw', name: 'Wedge', carry: 32, loft: deg(46) },
  { id: 'sw', name: 'Sand Wedge', carry: 20, loft: deg(56) },
  { id: 'putter', name: 'Putter', carry: 0, loft: 0 },
];
export const club = (id: ClubId) => CLUBS.find((c) => c.id === id)!;
/** The longest a putt rolls on a flat green at full power (tiles) */
export const PUTT_MAX = 26;

/** How much of a club's distance a lie gives (the rest of a shot's spray is `SPRAY`) */
export function lieTake(lie: Surface | null, id: ClubId): number {
  if (id === 'putter') return 1;
  const wedge = id === 'sw' || id === 'pw';
  switch (lie) {
    case 'tee':
    case 'fairway':
      return 1;
    case 'cut':
    case 'fringe':
    case 'path':
    case 'drive':
      return 0.94;
    case 'green':
    case 'grounds':
      return 0.9;
    case 'rough':
      return id === 'driver' || id === 'wood3' ? 0.62 : 0.8;
    case 'native':
      return wedge ? 0.7 : 0.45;
    case 'bunker':
      return id === 'sw' ? 0.9 : wedge ? 0.7 : 0.4;
    default:
      return 0.8;
  }
}
/** How wild a lie makes a shot: the spread of its line (radians, either way) */
export const SPRAY: Partial<Record<Surface, number>> = { cut: 0.012, fringe: 0.01, rough: 0.035, native: 0.07, bunker: 0.04, path: 0.015, drive: 0.015 };

/* ---------- The flight ---------- */

/** Gravity (tiles a second a second: brisk, so a shot's in the air a few seconds), the air's drag, the step */
export const GRAVITY = 9;
export const DRAG = 0.006;
export const STEP = 1 / 60;
/** How hard a hook or a slice curves the ball (sideways, at full miss, a share of its speed a second) */
export const CURVE = 0.32;
/** Off the top of the meter: power past 1 gives this much more distance at most, and this much more miss */
export const OVER = { power: 1.1, miss: 0.5 };

/** How a landing takes the ball on each surface: how much of its fall comes back up (`up`) and its run kept (`run`) */
export const BOUNCE: Record<Surface, { up: number; run: number }> = {
  tee: { up: 0.3, run: 0.62 },
  fairway: { up: 0.32, run: 0.66 },
  cut: { up: 0.24, run: 0.5 },
  fringe: { up: 0.24, run: 0.52 },
  green: { up: 0.2, run: 0.55 },
  rough: { up: 0.12, run: 0.28 },
  native: { up: 0.08, run: 0.16 },
  bunker: { up: 0, run: 0 },
  path: { up: 0.45, run: 0.8 },
  drive: { up: 0.45, run: 0.8 },
  grounds: { up: 0.3, run: 0.6 },
  water: { up: 0, run: 0 },
};
/** How fast a rolling ball slows on each surface (tiles a second a second) */
export const ROLL: Record<Surface, number> = {
  green: 1.3,
  fringe: 2.6,
  tee: 2.6,
  fairway: 2.4,
  cut: 3.6,
  rough: 6.5,
  native: 10,
  bunker: 40,
  path: 1.6,
  drive: 1.6,
  grounds: 2.6,
  water: 40,
};
/** The slope's pull on a rolling ball (a share of gravity along the ground's fall) */
export const SLOPE_PULL = 0.55;
/** The cup: its radius (tiles: generous, an arcade's) and how slow a ball must be over it to drop */
export const CUP = { r: 0.13, speed: 1.3 };
/** A ball's radius (tiles), over the ground it rests on */
export const BALL_R = 0.03;

export interface Ball {
  x: number;
  y: number;
  z: number;
}
/** A wind: its heading (radians, the way it blows: x = sin, z = cos) and its speed (tiles a second) */
export interface Wind {
  dir: number;
  speed: number;
}
/** What a shot did: where the ball stopped, its path (for the view: every `TRACE` steps), and what happened */
export interface ShotResult {
  at: Ball;
  path: Ball[];
  lie: Surface | null;
  holed: boolean;
  /** 'water' (a stroke, a drop at `drop`), 'out' (a stroke, the shot again from where it was played) */
  penalty: 'water' | 'out' | null;
  drop?: Pt;
  /** It struck a tree on the way */
  tree: boolean;
  /** How long it took (seconds) */
  time: number;
  /** How far it flew before it first came down (tiles; 0 for a putt) */
  carry: number;
}
/** How many steps between the points of a shot's path */
export const TRACE = 3;

/** The ground (or the water's top) under a point */
export function groundAt(x: number, z: number): number {
  const l = LAKES.findIndex((k) => lakeAt(k, x, z) < 1);
  return l >= 0 ? golfWater(l) : golfLift(x, z);
}
/** The ground's slope at a point: how much it rises a tile east (gx) and south (gz) */
export function slopeAt(x: number, z: number): [number, number] {
  const e = 0.35;
  return [(golfLift(x + e, z) - golfLift(x - e, z)) / (2 * e), (golfLift(x, z + e) - golfLift(x, z - e)) / (2 * e)];
}
/** Is a point over a lake */
const wet = (x: number, z: number) => LAKES.some((k) => lakeAt(k, x, z) < 1);
/** Is a point off the club's land (out of bounds): off the course and off the clubhouse's grounds */
export function outOfBounds(x: number, z: number) {
  const [x0, z0, x1, z1] = CLUB_GROUNDS;
  return !inCourse(x, z) && !(x > x0 && x < x1 && z > z0 && z < z1);
}

/* ---------- The trees ---------- */

/** A tree's trunk and crown, as the ball meets them: its trunk's radius, its crown's height (tiles, by its size) */
export const TREE = { trunk: 0.35, crown: 3.2 };
const TREE_CELL = 8;
let treeCells: Map<number, { x: number; z: number; s: number }[]> | null = null;
function treesNear(x: number, z: number) {
  if (!treeCells) {
    treeCells = new Map();
    for (const t of golfTrees()) {
      const k = Math.floor(t.x / TREE_CELL) * 100003 + Math.floor(t.z / TREE_CELL);
      if (!treeCells.has(k)) treeCells.set(k, []);
      treeCells.get(k)!.push(t);
    }
  }
  return treeCells.get(Math.floor(x / TREE_CELL) * 100003 + Math.floor(z / TREE_CELL)) ?? [];
}
/** Is a ball at this point in a tree: within its trunk (and the crown's reach over it) below its top */
export function inTree(b: Ball): boolean {
  for (const t of treesNear(b.x, b.z)) {
    const top = golfLift(t.x, t.z) + TREE.crown * t.s * 1.6;
    const r = b.y - golfLift(t.x, t.z) < TREE.crown * t.s * 0.5 ? TREE.trunk * t.s : TREE.trunk * t.s * 3.2;
    if (b.y < top && Math.hypot(b.x - t.x, b.z - t.z) < r) return true;
  }
  return false;
}

/* ---------- A shot ---------- */

/** The launch speed (tiles a second) that carries a club its carry on flat, still ground: worked out once */
const launch = new Map<ClubId, number>();
export function launchOf(id: ClubId): number {
  const c = club(id);
  if (id === 'putter') return 0;
  if (!launch.has(id)) {
    // (a search on the flight itself: how far a speed carries, in the air only)
    const carryAt = (v: number) => {
      let [x, y, vx, vy] = [0, 0, v * Math.cos(c.loft), v * Math.sin(c.loft)];
      for (let k = 0; k < 6000; k++) {
        const sp = Math.hypot(vx, vy);
        vx -= DRAG * sp * vx * STEP;
        vy -= (GRAVITY + DRAG * sp * vy) * STEP;
        x += vx * STEP;
        y += vy * STEP;
        if (y < 0) return x;
      }
      return x;
    };
    let [lo, hi] = [1, 200];
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2;
      if (carryAt(mid) < c.carry) lo = mid;
      else hi = mid;
    }
    launch.set(id, (lo + hi) / 2);
  }
  return launch.get(id)!;
}
/** A putt's starting speed for a roll of `d` on a flat green */
export const puttSpeed = (d: number) => Math.sqrt(2 * ROLL.green * d);

/** A seeded generator (the sims' own: never `Math.random`) */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ShotInput {
  club: ClubId;
  /** The heading it's aimed along (radians: x = sin, z = cos) */
  aim: number;
  /** 0 to `OVER.power` */
  power: number;
  /** -1 (a hook, left) to 1 (a slice, right), 0 straight */
  accuracy: number;
}

/**
 * Play a shot from where the ball lies: its flight, landing, bounces and roll, to where it stops (or into the cup, the
 * water or out of bounds). `spray` is the lie's seeded wobble of the line (-1 to 1); the hole's pin for the cup.
 */
export function strike(from: Ball, shot: ShotInput, wind: Wind, pin: Pt | null, spray = 0): ShotResult {
  const lie = surfaceAt(from.x, from.z);
  const c = club(shot.club);
  const power = Math.max(0, Math.min(OVER.power, shot.power));
  // (off the top of the meter: more distance, more miss)
  const over = Math.max(0, power - 1) / (OVER.power - 1 || 1);
  const miss = Math.max(-1, Math.min(1, shot.accuracy)) * (1 + OVER.miss * over);
  const aim = shot.aim + (SPRAY[lie ?? 'rough'] ?? 0) * spray;
  const [fx, fz] = [Math.sin(aim), Math.cos(aim)];
  const b = { x: from.x, y: from.y, z: from.z };
  const path: Ball[] = [{ ...b }];
  let vx = 0;
  let vy = 0;
  let vz = 0;
  if (shot.club === 'putter') {
    const sp = puttSpeed(power * PUTT_MAX);
    // (a miss on a putt pushes it off its line a little)
    const a = aim + miss * 0.05;
    vx = Math.sin(a) * sp;
    vz = Math.cos(a) * sp;
  } else {
    const sp = launchOf(shot.club) * Math.sqrt(lieTake(lie, shot.club)) * power;
    vx = fx * Math.cos(c.loft) * sp;
    vz = fz * Math.cos(c.loft) * sp;
    vy = Math.sin(c.loft) * sp;
  }
  const [wx, wz] = [Math.sin(wind.dir) * wind.speed, Math.cos(wind.dir) * wind.speed];
  let t = 0;
  let k = 0;
  let tree = false;
  let air = shot.club !== 'putter';
  /** What's underfoot while it rolls, and where it was last read */
  let here: Pt = [Infinity, Infinity];
  let under: Surface | null = null;
  /** The last point the ball passed over dry land (for a drop by the water) */
  let dry: Pt = [from.x, from.z];
  let carry = 0;
  const done = (r: Omit<ShotResult, 'path' | 'tree' | 'time' | 'carry'>): ShotResult => {
    path.push({ ...r.at });
    return { ...r, path, tree, time: t, carry: carry || (air ? Math.hypot(b.x - from.x, b.z - from.z) : 0) };
  };
  while (t < 60) {
    t += STEP;
    k++;
    if (air) {
      // The air: gravity, drag on the speed through it (the wind's), a hook or slice curving it while it flies
      const [rx, ry, rz] = [vx - wx, vy, vz - wz];
      const sp = Math.hypot(rx, ry, rz);
      const hs = Math.hypot(vx, vz) || 1;
      // (to the right of the way it's going: facing +z the right is -x, so (-vz, vx); a slice, miss > 0, curves it right)
      const side = CURVE * miss * hs;
      const [ox, oz] = [vx, vz];
      vx += (-DRAG * sp * rx - side * (oz / hs)) * STEP;
      vz += (-DRAG * sp * rz + side * (ox / hs)) * STEP;
      vy += (-GRAVITY - DRAG * sp * ry) * STEP;
      b.x += vx * STEP;
      b.y += vy * STEP;
      b.z += vz * STEP;
      // A tree: the ball drops out of it where it met it
      if (inTree(b)) {
        tree = true;
        vx *= -0.15;
        vz *= -0.15;
        vy = Math.min(0, vy) * 0.3;
      }
      // (the ground under it: the course's grid, the water's top only when it's low over a lake; where it was last over
      // dry land, every few steps, for a drop)
      let g = golfLift(b.x, b.z);
      if (b.y < g + 3) g = groundAt(b.x, b.z);
      if (k % 6 === 0 && !wet(b.x, b.z)) dry = [b.x, b.z];
      if (b.y <= g + BALL_R) {
        b.y = g + BALL_R;
        if (!carry) carry = Math.hypot(b.x - from.x, b.z - from.z);
        const s = surfaceAt(b.x, b.z);
        if (outOfBounds(b.x, b.z)) return done({ at: { ...b }, lie: null, holed: false, penalty: 'out' });
        if (s === 'water') return done({ at: { ...b }, lie: 'water', holed: false, penalty: 'water', drop: dropBy(dry, [from.x, from.z]) });
        const bo = BOUNCE[s ?? 'rough'];
        vy = -vy * bo.up;
        vx *= bo.run;
        vz *= bo.run;
        if (vy < 1.2) {
          vy = 0;
          air = false;
        }
      }
    } else {
      // Rolling: slowed by the surface, pulled down the slope, into the cup if it's slow enough over it (what's underfoot
      // read again only once it's rolled on a little)
      if (Math.hypot(b.x - here[0], b.z - here[1]) > 0.2) {
        here = [b.x, b.z];
        under = surfaceAt(b.x, b.z);
      }
      const s = under;
      if (s === null && outOfBounds(b.x, b.z)) return done({ at: { ...b }, lie: null, holed: false, penalty: 'out' });
      if (s === 'water') return done({ at: { ...b }, lie: 'water', holed: false, penalty: 'water', drop: dropBy(dry, [from.x, from.z]) });
      dry = [b.x, b.z];
      const [gx, gz] = slopeAt(b.x, b.z);
      const sp = Math.hypot(vx, vz);
      const slow = ROLL[s ?? 'rough'] * STEP;
      vx -= gx * GRAVITY * SLOPE_PULL * STEP;
      vz -= gz * GRAVITY * SLOPE_PULL * STEP;
      if (sp <= slow) {
        // (it stops unless the slope's pull beats the grass's hold)
        if (Math.hypot(gx, gz) * GRAVITY * SLOPE_PULL < ROLL[s ?? 'rough'] * 0.8) {
          vx = vz = 0;
          b.y = groundAt(b.x, b.z) + BALL_R;
          return done({ at: { ...b }, lie: s, holed: false, penalty: null });
        }
      } else {
        vx -= (vx / sp) * slow;
        vz -= (vz / sp) * slow;
      }
      b.x += vx * STEP;
      b.z += vz * STEP;
      b.y = groundAt(b.x, b.z) + BALL_R;
      if (pin && Math.hypot(b.x - pin[0], b.z - pin[1]) < CUP.r && Math.hypot(vx, vz) < CUP.speed) {
        b.x = pin[0];
        b.z = pin[1];
        return done({ at: { ...b }, lie: 'green', holed: true, penalty: null });
      }
    }
    if (k % TRACE === 0) path.push({ ...b });
  }
  return done({ at: { ...b }, lie: surfaceAt(b.x, b.z), holed: false, penalty: null });
}

/** Where a ball that went into the water is dropped: back from where it went in towards where it was played, on dry
 * land that's in play (never in the water, a bunker or out of bounds) */
export function dropBy(entry: Pt, from: Pt): Pt {
  const L = Math.hypot(from[0] - entry[0], from[1] - entry[1]) || 1;
  const [ux, uz] = [(from[0] - entry[0]) / L, (from[1] - entry[1]) / L];
  for (let d = 1.5; d < L + 2; d += 0.5) {
    const p: Pt = [entry[0] + ux * d, entry[1] + uz * d];
    const s = surfaceAt(...p);
    if (s && s !== 'water' && s !== 'bunker' && !outOfBounds(...p)) return p;
  }
  return from;
}

/* ---------- A round ---------- */

/** A hole's strokes are picked up at this many */
export const MAX_STROKES = 10;
/** The wind's strongest (tiles a second) */
export const WIND_MAX = 5;

export interface HolePlay {
  /** Its index in `HOLES` */
  hole: number;
  strokes: number;
  ball: Ball;
  /** Where the last shot was played from (out of bounds plays again from here) */
  from: Ball;
  holed: boolean;
}
export interface Round {
  seed: number;
  /** The holes played, in order (`HOLES`' indexes) */
  holes: number[];
  /** Which of them is being played */
  at: number;
  /** Each hole's strokes as finished (null while not) */
  card: (number | null)[];
  play: HolePlay;
  wind: Wind;
  /** The shots played so far this round (the lie's spray is seeded from it) */
  shots: number;
}

/** Where a hole's ball sits on its tee (its middle, a ball's height over it) */
export function teeBall(h: Hole): Ball {
  const t = teeOf(h).at;
  return { x: t[0], y: golfLift(...t) + BALL_R, z: t[1] };
}
/** A hole's pin (golflife.ts's flag stands there: its cup) */
export type PinOf = (hole: number) => Pt;

/** A round of the given holes: the wind seeded, the first on its tee */
export function newRound(holes: number[], seed: number): Round {
  const r = rng(seed);
  const wind = { dir: r() * Math.PI * 2, speed: r() * WIND_MAX };
  const ball = teeBall(HOLES[holes[0]]);
  return { seed, holes, at: 0, card: holes.map(() => null), play: { hole: holes[0], strokes: 0, ball, from: { ...ball }, holed: false }, wind, shots: 0 };
}
/** The wind on a hole (the round's, turning a little hole to hole) */
export function windOn(r: Round): Wind {
  const k = rng(r.seed * 31 + r.at)();
  return { dir: r.wind.dir + (k - 0.5) * 0.8, speed: r.wind.speed * (0.75 + k * 0.5) };
}

/**
 * Play the round's next shot: the stroke counted, the penalties' strokes and drops, the hole finished when it's holed
 * or picked up. Returns the shot's result (`null` if the round is over).
 */
export function playShot(r: Round, shot: ShotInput, pinOf: PinOf): ShotResult | null {
  if (r.at >= r.holes.length) return null;
  const p = r.play;
  const pin = pinOf(p.hole);
  const spray = rng(r.seed * 7919 + r.shots * 104729)() * 2 - 1;
  r.shots++;
  const res = strike(p.ball, shot, windOn(r), pin, spray);
  p.strokes++;
  p.from = { ...p.ball };
  if (res.penalty === 'out') {
    // (stroke and distance: the shot again from where it was played)
    p.strokes++;
  } else if (res.penalty === 'water') {
    p.strokes++;
    const d = res.drop!;
    p.ball = { x: d[0], y: golfLift(...d) + BALL_R, z: d[1] };
  } else p.ball = { ...res.at };
  if (res.holed) p.holed = true;
  if (p.holed || p.strokes >= MAX_STROKES) finishHole(r);
  return res;
}
function finishHole(r: Round) {
  r.card[r.at] = Math.min(MAX_STROKES, r.play.strokes);
  r.at++;
  if (r.at < r.holes.length) {
    const ball = teeBall(HOLES[r.holes[r.at]]);
    r.play = { hole: r.holes[r.at], strokes: 0, ball, from: { ...ball }, holed: false };
  }
}
/** The round's score against par so far (the holes finished) */
export function toPar(r: Round): number {
  return r.card.reduce<number>((sum, s, i) => (s === null ? sum : sum + s - HOLES[r.holes[i]].par), 0);
}
export const roundOver = (r: Round) => r.at >= r.holes.length;

/* ---------- The bot ---------- */

/** Where the bot aims a shot from a spot on a hole: the pin if a club gets there, else down the hole's line as far as its longest club goes from this lie */
function botTarget(h: Hole, b: Ball, pin: Pt): { target: Pt; reach: boolean } {
  const d = Math.hypot(pin[0] - b.x, pin[1] - b.z);
  const lie = surfaceAt(b.x, b.z);
  const longest = Math.max(...CLUBS.filter((c) => c.id !== 'putter' && (c.id !== 'driver' || lie === 'tee')).map((c) => c.carry * lieTake(lie, c.id)));
  if (d <= longest * 1.08) return { target: pin, reach: true };
  const n = nearestOn(h, b.x, b.z);
  return { target: along(h, Math.min(n.s + longest * 0.92, lengthOf(h))).at, reach: false };
}
/**
 * The bot's shot: the club that gets to its target, then a search over aims and powers on the sim itself (the wind
 * and the slopes included, the lie's spray left out), keeping the shot that ends nearest the target without a
 * penalty. A straight swing (accuracy 0): the bot never mishits.
 */
export function botShot(r: Round, pinOf: PinOf): ShotInput {
  const p = r.play;
  const h = HOLES[p.hole];
  const pin = pinOf(p.hole);
  const b = p.ball;
  const lie = surfaceAt(b.x, b.z);
  const wind = windOn(r);
  const heading = (to: Pt) => Math.atan2(to[0] - b.x, to[1] - b.z);
  if (lie === 'green') {
    // Putting: a coarse search of lines and lengths, then a fine one round the best (the one that drops, or ends nearest)
    const d = Math.hypot(pin[0] - b.x, pin[1] - b.z);
    const at = (a: number, len: number): { s: ShotInput; e: number } => {
      const s: ShotInput = { club: 'putter', aim: heading(pin) + a, power: Math.min(1, len / PUTT_MAX), accuracy: 0 };
      const res = strike(b, s, wind, pin, 0);
      return { s, e: res.holed ? -1 : Math.hypot(res.at.x - pin[0], res.at.z - pin[1]) };
    };
    let best = { a: 0, len: d, e: Infinity, s: null as ShotInput | null };
    for (let a = -0.35; a <= 0.3501; a += 0.05)
      for (const k of [0.9, 1.05, 1.2, 1.4, 1.7]) {
        const r = at(a, d * k + 0.5);
        if (r.e < best.e) best = { a, len: d * k + 0.5, e: r.e, s: r.s };
      }
    const step = Math.min(0.025, 0.06 / Math.max(1, d));
    for (let pass = 0; pass < 2 && best.e > -1; pass++) {
      const [a0, l0, da, dl] = [best.a, best.len, step / (pass + 1), (d * 0.06 + 0.15) / (pass + 1)];
      for (let i = -3; i <= 3; i++)
        for (let j = -3; j <= 3; j++) {
          const r = at(a0 + i * da, Math.max(0.3, l0 + j * dl));
          if (r.e < best.e) best = { a: a0 + i * da, len: l0 + j * dl, e: r.e, s: r.s };
        }
    }
    return best.s!;
  }
  const { target, reach } = botTarget(h, b, pin);
  const d = Math.hypot(target[0] - b.x, target[1] - b.z);
  const clubs = CLUBS.filter((c) => c.id !== 'putter' && (c.id !== 'driver' || lie === 'tee'));
  // (the shortest club that carries far enough, and the next one up and down)
  const sorted = clubs.sort((a, c) => a.carry - c.carry);
  const i = Math.max(0, sorted.findIndex((c) => c.carry * lieTake(lie, c.id) >= d * (reach ? 0.9 : 1)));
  const tries = [sorted[i], sorted[Math.min(sorted.length - 1, i + 1)], sorted[Math.max(0, i - 1)]];
  let best: { s: ShotInput; score: number } | null = null;
  for (const c of tries)
    for (let a = -0.24; a <= 0.2401; a += 0.06)
      for (const pw of [0.72, 0.84, 0.94, 1]) {
        const s: ShotInput = { club: c.id, aim: heading(target) + a, power: pw, accuracy: 0 };
        const res = strike(b, s, wind, pin, 0);
        if (res.penalty) continue;
        // (nearest the target; a bunker or the native grass costs, a tree costs, the green wins when going for it)
        const end = res.at;
        let score = Math.hypot(end.x - target[0], end.z - target[1]);
        if (res.lie === 'bunker') score += 14;
        if (res.lie === 'native') score += 10;
        if (res.lie === 'rough') score += 4;
        if (res.tree) score += 8;
        if (reach && res.lie === 'green') score -= 6;
        if (!best || score < best.score) best = { s, score };
      }
  // (nothing clean: a short wedge back down the line)
  return best?.s ?? { club: 'pw', aim: heading(greenOf(h).at), power: 0.6, accuracy: 0 };
}

/* ---------- The swing's input (docs/golf-game-plan.md Phases 2 and 4): the keys' and the pad's meter, the touch pull-back ---------- */

/** The meter (seconds and its reading): up from 0 past the top (`top`, a little over full) and back down; the
 * power's set on the way up, the accuracy on the way down (0 the line; `window` either side of it is a full hook or
 * slice; past `end` it's a full slice) */
export const METER = { rate: 1.05, top: 1.1, window: 0.12, end: -0.22 };
/** The touch swing's pull-back (CSS pixels): the length that's full power (a share of the screen's height, between
 * `min` and `max`), too short to count, and the lean off straight down (radians) that's a full hook or slice */
export const PULL = { share: 0.3, min: 110, max: 240, least: 14, lean: 0.35 };
/** The pull-back's power and accuracy from how far it went down (`dy`) and across (`dx`) and its full length */
export function pullShot(dx: number, dy: number, full: number) {
  const power = Math.max(0, Math.min(METER.top, dy / full));
  // (a slingshot's: pulled back to the right sends it left, a hook; to the left a slice; a sliver off straight is straight)
  const lean = Math.atan2(dx, Math.max(1, dy));
  const accuracy = Math.abs(lean) < 0.03 ? 0 : Math.max(-1, Math.min(1, -lean / PULL.lean));
  return { power, accuracy };
}
