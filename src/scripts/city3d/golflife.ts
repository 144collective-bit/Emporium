/*
 * The golf course's life (docs/golf-plan.md Phase 5), the rules and the data: DOM-free (on `DOM_FREE`), the golf
 * chunk's (golf3d.ts draws it, golflife3d.ts), tested in tests/golflife.test.ts.
 *
 * - **What stands on the course** (`FURNITURE`, one a hole): the flag in the cup (`pin`, somewhere on the green, the
 *   same every time), the two tee markers at the tee's front, a ball washer and a bench beside the tee on the side its
 *   cart path runs, the hole's sign (its name: never a number on a sign) at the back of the tee, a rake by every bunker
 *   on its far side from the hole's line.
 * - **The golfers** (`GOLFERS`: `GROUPS` out on each nine, spread round it): each group plays its nine for ever, the
 *   same round every time (`roundOf()`): off the tee in turn, out to their balls (`ballsOf()`: the fairway, then the
 *   green near the pin), the furthest from the pin playing first while the rest stand and watch, a putt and a tap-in
 *   each, then on along the cart paths to the next tee (the ninth back over the clubhouse's grounds to the first).
 *   `golferAt()` reads where one is and what they're doing (walking, watching, a full swing, a putt).
 * - **The carts** (`CARTS`) round each nine's cart paths (`CART_LOOPS`, `cartAt()`), the greenkeeper's mower up and
 *   down the 10th's fairway in its stripes (`MOW_LOOP`, `mowerAt()`), ducks paddling slow rounds on the lakes
 *   (`DUCKS`, `duckAt()`).
 */
import { HOLES, LAKES, PATHS, TEE, arcOf, bunkersOf, fairwayHalf, framePt, fromPaths, greenOf, inLake, nearestOn, onGreen, onTee, surfaceAt, teeOf, type Hole, type Pt, type Surface } from './golf';

/* ---------- What stands on the course ---------- */

/** What's underfoot that the tee's things may stand on (off the play, never in the water or on the path itself) */
export const BESIDE: Surface[] = ['cut', 'rough', 'native', 'fringe'];
/** A seeded number in [0, 1) from a hole's number and a salt (the same every time) */
const hash = (n: number, salt: number) => {
  const s = Math.sin(n * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** The flag: its stick's height, the cloth's size (tiles; a person stands about 0.8) */
export const FLAG = { stick: 1.1, w: 0.42, h: 0.28 };
/** How far out of the green's middle a pin may stand (a share of its radii) */
export const PIN_OUT = 0.45;
/** The tee markers: along the tee from its middle, out either side of the line */
export const MARKERS = { along: 1.6, across: 2.2 };

export interface HoleFurniture {
  n: number;
  /** Where the cup is, on the green */
  pin: Pt;
  /** The tee's markers, either side of the line at its front */
  markers: [Pt, Pt];
  /** Which side of the line (facing the green: 1 right, -1 left) the tee's things stand on: its cart path's */
  side: 1 | -1;
  washer: Pt;
  /** The bench, and the way it faces (radians about y, three.js's: 0 faces +z) */
  bench: { at: Pt; ry: number };
  /** The hole's sign at the back of the tee, facing back the way a golfer comes up to it */
  sign: { at: Pt; ry: number };
  /** A rake by each bunker: where it lies and its heading */
  rakes: { at: Pt; ry: number }[];
}

/** A point in the frame of a hole's tee: `u` along (to the green), `v` across to the right */
function teePt(h: Hole, u: number, v: number): Pt {
  const { at, dir } = teeOf(h);
  return [at[0] + dir[0] * u - dir[1] * v, at[1] + dir[1] * u + dir[0] * v];
}
/** The heading (about y) that faces along a way on the ground (x, z) */
export const facing = (dx: number, dz: number) => Math.atan2(dx, dz);

function furnish(h: Hole): HoleFurniture {
  const g = greenOf(h);
  const [ga, gc] = [(hash(h.n, 1) * 2 - 1) * PIN_OUT * h.green[0], (hash(h.n, 2) * 2 - 1) * PIN_OUT * h.green[1]];
  const pin: Pt = [g.at[0] + g.dir[0] * ga - g.dir[1] * gc, g.at[1] + g.dir[1] * ga + g.dir[0] * gc];
  // (the side its path runs: whichever is nearer a cart path just off the tee)
  const off = TEE[1] + 3;
  const side: 1 | -1 = fromPaths(...teePt(h, -2, off)) <= fromPaths(...teePt(h, -2, -off)) ? 1 : -1;
  const t = teeOf(h);
  // (each the first of its spots, out from the tee and back along it, that's on the grass beside it: clear of the
  // path, the play and the water, and of what's put there already)
  const taken: Pt[] = [];
  const spot = (us: number[], vs: number[]): Pt => {
    for (const v of vs)
      for (const u of us) {
        for (const sd of [side, -side]) {
          const p = teePt(h, u, sd * v);
          const ok = BESIDE.includes(surfaceAt(...p)!) && !onTee(h, ...p) && fromPaths(...p) > PATH_CLEAR && !inLake(...p, -1) && taken.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > 1.6);
          if (ok) {
            taken.push(p);
            return p;
          }
        }
      }
    throw new Error(`hole ${h.n}: nowhere beside its tee`);
  };
  const washer = spot([-1.5, 0.5, -3, 2], [TEE[1] + 1.4, TEE[1] + 2.2]);
  const benchAt = spot([-4.2, -2.6, -5.6, 1], [TEE[1] + 2.4, TEE[1] + 3.4, TEE[1] + 1.6]);
  // (the bench faces the tee's middle)
  const bench = { at: benchAt, ry: facing(t.at[0] - benchAt[0], t.at[1] - benchAt[1]) };
  const sign = { at: spot([-TEE[0] - 1.4, -TEE[0] - 2.4], [1.6, 0.4, 2.8]), ry: facing(-t.dir[0], -t.dir[1]) };
  const rakes = bunkersOf(h).map((b) => {
    // (on the bunker's edge across its lie, the side further from the hole's line, a little out on the grass)
    const n: Pt = [-b.dir[1], b.dir[0]];
    const out = (s: number): Pt => [b.at[0] + n[0] * s * (b.r[1] + 0.35), b.at[1] + n[1] * s * (b.r[1] + 0.35)];
    const s = nearestOn(h, ...out(1)).d >= nearestOn(h, ...out(-1)).d ? 1 : -1;
    return { at: out(s), ry: facing(b.dir[0], b.dir[1]) };
  });
  return { n: h.n, pin, markers: [teePt(h, MARKERS.along, -MARKERS.across), teePt(h, MARKERS.along, MARKERS.across)], side, washer, bench, sign, rakes };
}

/** How far the tee's things keep from a cart path's line (tiles: its half width and a little) */
export const PATH_CLEAR = 1.6;
/** Every hole's furniture (in `HOLES`' order) */
export const FURNITURE: HoleFurniture[] = /* @__PURE__ */ HOLES.map(furnish);


/* ---------- The golfers ---------- */

/** What a golfer's doing: walking, standing watching, a full swing, a putt (the crowd's rows: crowdclips.ts) */
export type GolfClip = 'walk' | 'look' | 'golf' | 'putt';
/** One stretch of a golfer's round: from `t0` to `t1` (seconds into its loop) going from `a` to `b` (still if the same), facing `ry` while still */
export interface Leg {
  /** The hole it's played on (`HOLES`' index; the walk on to the next tee is the hole just played) */
  hole: number;
  t0: number;
  t1: number;
  a: Pt;
  b: Pt;
  clip: GolfClip;
  ry: number;
}
/** A golfer: their group, their place in it, their round (its legs, looping every `loop` seconds, `offset` in) */
export interface Golfer {
  id: string;
  group: number;
  k: number;
  trim: boolean;
  legs: Leg[];
  loop: number;
  offset: number;
}

/** Their walking pace (the crowd's stroll, parklife.ts `WALK_PACE`), a full swing's and a putt's seconds (the rows'
 * loops: acts.ts `GOLF_SECONDS`, `PUTT_SECONDS`; tests/golflife.test.ts holds them equal), how long they wait between turns */
export const GOLF_PACE = 0.5;
export const SWING_T = 3.2;
export const PUTT_T = 2.4;
const BEAT = 1.2;
/** How far from the pin a golfer who's holed out stands back (past every ball: `ballsOf()` lands them within 3.2) */
const HOLED = 4.4;
/** How far a golfer stands from the ball they address (tiles) */
export const ADDRESS = 0.42;
/** Groups out on each nine, and how many in each */
export const GROUPS: number[][] = [
  [3, 2, 4],
  [2, 3, 3],
];

/** Seeded [0, 1) from a group, a hole and a salt */
const rnd = (g: number, n: number, salt: number) => hash(g * 41 + n, salt + g * 7.3);

/** Where each of a group's balls comes to rest on a hole, shot by shot (the tee's first, the green's last): along the line, on the fairway, onto the green near the pin */
export function ballsOf(h: Hole, f: HoleFurniture, g: number, n: number): Pt[][] {
  const L = arcOf(h.line).at(-1)!;
  // (the tee shot from the tee's middle, a little either side of it each)
  const shots = h.par - 2;
  return Array.from({ length: n }, (_, k) => {
    const out: Pt[] = [teePt(h, 0.5, (k - (n - 1) / 2) * 0.9)];
    for (let s = 1; s < shots; s++) {
      // (the drive about 0.58 of a par 4, 0.42 then 0.76 of a par 5; on the fairway's middle half, either side)
      const share = h.par === 4 ? 0.56 + rnd(g, h.n, k * 3 + s) * 0.08 : [0.4, 0.74][s - 1] + rnd(g, h.n, k * 3 + s) * 0.06;
      const at = share * L;
      const half = fairwayHalf(h, at) || 6;
      // (each in its own lane of the fairway's middle, a little either way in it: the group's balls apart)
      const lane = n > 1 ? ((k + 0.5) / n) * 2 - 1 : 0;
      out.push(framePt(h, at, (lane * 0.55 + (rnd(g, h.n, k * 5 + s + 11) - 0.5) * 0.2) * half));
    }
    // (onto the green, a few tiles from the pin: never in its cup)
    // (each from its own side of the pin: the group's balls spread round it)
    const a = rnd(g, h.n, 21) * Math.PI * 2 + (k * Math.PI * 2) / n + (rnd(g, h.n, k + 21) - 0.5) * 0.6;
    const r = 1.2 + rnd(g, h.n, k + 31) * 2;
    let on: Pt = [f.pin[0] + Math.cos(a) * r, f.pin[1] + Math.sin(a) * r];
    if (onGreen(h, ...on) > 0.85) on = [f.pin[0] + (on[0] - f.pin[0]) * 0.4, f.pin[1] + (on[1] - f.pin[1]) * 0.4];
    out.push(on);
    return out;
  });
}

/** The way from one hole's green (from `from`) to the next tee along the cart paths: onto the hole's own path where
 * it's nearest, along it, then its link on (golf.ts `PATHS`), or back over the clubhouse's grounds to the nine's first */
function wayOn(i: number, first: number, from: Pt): Pt[] {
  const byId = (id: string) => PATHS.find((p) => p.id === id)?.pts ?? [];
  const here = byId(`hole-${i + 1}`);
  // (its nearest point: on the stretch nearest, then on along the rest)
  const best = nearestOnLine(here, from);
  const rest = [best.p, ...here.slice(best.j)];
  if (i !== first + 8) return [...rest, ...byId(`hole-${i + 1}-${i + 2}`)];
  return [...rest, ...byId(`${i + 1}-grounds`), ...byId(`grounds-${first + 1}`)];
}

/** Where a point is nearest a line: the point, and the stretch it's on (ending at index `j`) */
function nearestOnLine(line: Pt[], from: Pt) {
  let best = { d: Infinity, p: line[0], j: 1 };
  for (let j = 1; j < line.length; j++) {
    const [a, b] = [line[j - 1], line[j]];
    const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
    const u = Math.max(0, Math.min(1, ((from[0] - a[0]) * vx + (from[1] - a[1]) * vz) / (vx * vx + vz * vz || 1)));
    const q: Pt = [a[0] + vx * u, a[1] + vz * u];
    const d = Math.hypot(q[0] - from[0], q[1] - from[1]);
    if (d < best.d) best = { d, p: q, j };
  }
  return best;
}
/** Does a straight walk get its feet wet */
const wet = (a: Pt, b: Pt) => {
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5);
  for (let k = 0; k <= n; k++) if (inLake(a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n, -0.6)) return true;
  return false;
};
/** The walk from one ball to the next on a hole: straight, or round by its cart path where that would cross the water */
function walkOn(i: number, from: Pt, to: Pt, abreast = 0): Pt[] {
  if (!wet(from, to)) return [to];
  const path = PATHS.find((p) => p.id === `hole-${i + 1}`)?.pts ?? [];
  const [a, b] = [nearestOnLine(path, from), nearestOnLine(path, to)];
  const mid = a.j <= b.j ? path.slice(a.j, b.j) : path.slice(b.j, a.j).reverse();
  return [...besideLine([a.p, ...mid, b.p], abreast), to];
}

/** A line moved `o` to its right (each point along the way it runs there), so a group walks side by side, not in one another */
function besideLine(line: Pt[], o: number): Pt[] {
  if (!o || line.length < 2) return line;
  return line.map((p, i) => {
    const [a, b] = [line[Math.max(0, i - 1)], line[Math.min(line.length - 1, i + 1)]];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [p[0] - ((b[1] - a[1]) / L) * o, p[1] + ((b[0] - a[0]) / L) * o] as Pt;
  });
}
/** How far apart a group walks */
export const ABREAST = 0.75;

/** The heading that faces a ball side-on to play it at `to` (right-handed: the target to the left) */
const addressRy = (from: Pt, to: Pt) => {
  const [dx, dz] = [to[0] - from[0], to[1] - from[1]];
  return facing(-dz, dx);
};
/** Where a golfer stands to play a ball at `to` */
const addressAt = (ball: Pt, to: Pt): Pt => {
  const ry = addressRy(ball, to);
  return [ball[0] - Math.sin(ry) * ADDRESS, ball[1] - Math.cos(ry) * ADDRESS];
};

/** A group's round of its nine (`nine` 0 the front, 1 the back): every golfer's legs, and how long a loop takes */
export function roundOf(nine: 0 | 1, g: number, n: number): { legs: Leg[][]; loop: number } {
  const first = nine * 9;
  const legs: Leg[][] = Array.from({ length: n }, () => []);
  // (where each stands now, and when the group's next together)
  const pos: Pt[] = Array.from({ length: n }, (_, k) => teePt(HOLES[first], -3.4, (k - (n - 1) / 2) * 1.1));
  let T = 0;
  /** The hole being played */
  let cur = first;
  const still = (k: number, until: number, ry: number) => {
    const last = legs[k].at(-1);
    const from = last ? last.t1 : 0;
    if (until > from + 1e-6) legs[k].push({ t0: from, t1: until, a: pos[k], b: pos[k], clip: 'look', ry, hole: cur });
  };
  const walk = (k: number, via: Pt[], start: number) => {
    let t = start;
    for (const p of via) {
      const d = Math.hypot(p[0] - pos[k][0], p[1] - pos[k][1]);
      if (d < 0.05) continue;
      legs[k].push({ t0: t, t1: t + d / GOLF_PACE, a: pos[k], b: p, clip: 'walk', ry: facing(p[0] - pos[k][0], p[1] - pos[k][1]), hole: cur });
      t += d / GOLF_PACE;
      pos[k] = p;
    }
    return t;
  };
  /** Everyone walks their own way, then waits for the last; each faces `look(k)` while they wait */
  const together = (ways: Pt[][], look: (k: number) => number) => {
    // (everyone held where they are up to now first, facing as they were)
    for (let k = 0; k < n; k++) still(k, T, legs[k].at(-1)?.ry ?? 0);
    const ends = ways.map((w, k) => walk(k, w, T));
    T = Math.max(...ends) + BEAT;
    for (let k = 0; k < n; k++) still(k, T, look(k));
  };
  for (let i = first; i < first + 9; i++) {
    cur = i;
    const h = HOLES[i];
    const f = FURNITURE[i];
    const balls = ballsOf(h, f, g + nine * 10, n);
    const shots = balls[0].length - 1;
    const toward = (p: Pt, q: Pt) => facing(q[0] - p[0], q[1] - p[1]);
    for (let s = 0; s < shots; s++) {
      // (each to their ball's address, the furthest from the pin plays first, the rest watching)
      const targets = balls.map((b) => addressAt(b[s], b[s + 1]));
      together(
        targets.map((p, k) => walkOn(i, pos[k], p, (k - (n - 1) / 2) * ABREAST)),
        (k) => addressRy(balls[k][s], balls[k][s + 1])
      );
      const order = [...Array(n).keys()].sort((a, b) => Math.hypot(balls[b][s][0] - f.pin[0], balls[b][s][1] - f.pin[1]) - Math.hypot(balls[a][s][0] - f.pin[0], balls[a][s][1] - f.pin[1]));
      for (const k of order) {
        for (let j = 0; j < n; j++) if (j !== k) still(j, T, toward(pos[j], pos[k]));
        still(k, T, addressRy(balls[k][s], balls[k][s + 1]));
        legs[k].push({ t0: T, t1: T + SWING_T, a: pos[k], b: pos[k], clip: 'golf', ry: addressRy(balls[k][s], balls[k][s + 1]), hole: cur });
        T += SWING_T + BEAT;
        still(k, T, addressRy(balls[k][s], balls[k][s + 1]));
      }
    }
    // On the green: up to their ball, a putt, the tap-in, the farthest first
    const on = balls.map((b) => b.at(-1)!);
    together(
      on.map((b, k) => walkOn(i, pos[k], addressAt(b, f.pin), (k - (n - 1) / 2) * ABREAST)),
      (k) => addressRy(on[k], f.pin)
    );
    const order = [...Array(n).keys()].sort((a, b) => Math.hypot(on[b][0] - f.pin[0], on[b][1] - f.pin[1]) - Math.hypot(on[a][0] - f.pin[0], on[a][1] - f.pin[1]));
    for (const k of order) {
      for (let j = 0; j < n; j++) if (j !== k) still(j, T, toward(pos[j], pos[k]));
      still(k, T, addressRy(on[k], f.pin));
      legs[k].push({ t0: T, t1: T + PUTT_T, a: pos[k], b: pos[k], clip: 'putt', ry: addressRy(on[k], f.pin), hole: cur });
      T += PUTT_T;
      // (the tap-in from beside the cup)
      const tap: Pt = [f.pin[0] + (on[k][0] - f.pin[0]) * (0.5 / Math.hypot(on[k][0] - f.pin[0], on[k][1] - f.pin[1])), f.pin[1] + (on[k][1] - f.pin[1]) * (0.5 / Math.hypot(on[k][0] - f.pin[0], on[k][1] - f.pin[1]))];
      T = walk(k, [addressAt(tap, f.pin)], T);
      for (let j = 0; j < n; j++) if (j !== k) still(j, T, toward(pos[j], pos[k]));
      legs[k].push({ t0: T, t1: T + PUTT_T, a: pos[k], b: pos[k], clip: 'putt', ry: addressRy(tap, f.pin), hole: cur });
      T += PUTT_T;
      // (holed out: a step back off the line, to their own side of the green)
      const away = (k * Math.PI * 2) / n + 0.4;
      const back: Pt = [f.pin[0] + Math.cos(away) * HOLED, f.pin[1] + Math.sin(away) * HOLED];
      // (past every ball on the green, `HOLED`; nearer where that would be in a bunker or the water)
      const clear = (q: Pt) => !inLake(...q, -0.5) && surfaceAt(...q) !== 'bunker';
      T = walk(k, [clear(back) ? back : [f.pin[0] + (back[0] - f.pin[0]) * 0.85, f.pin[1] + (back[1] - f.pin[1]) * 0.85]], T) + BEAT;
      still(k, T, toward(pos[k], f.pin));
    }
    // On to the next tee along the cart paths (the last of the nine back over the grounds to its first)
    const next = i < first + 8 ? HOLES[i + 1] : HOLES[first];
    together(
      Array.from({ length: n }, (_, k) => [...besideLine(wayOn(i, first, pos[k]), (k - (n - 1) / 2) * ABREAST), teePt(next, -3.4, (k - (n - 1) / 2) * 1.1)]),
      () => facing(teeOf(next).dir[0], teeOf(next).dir[1])
    );
  }
  // (back where they started: the loop closes)
  return { legs, loop: T };
}

/** Everyone out on the course: the groups on each nine spread round it */
export const GOLFERS: Golfer[] = /* @__PURE__ */ (() => {
  const out: Golfer[] = [];
  for (const nine of [0, 1] as const)
    GROUPS[nine].forEach((n, g) => {
      const { legs, loop } = roundOf(nine, g, n);
      for (let k = 0; k < n; k++) out.push({ id: `golfer-${nine}-${g}-${k}`, group: nine * 10 + g, k, trim: k % 2 === 1, legs: legs[k], loop, offset: (loop * (g + 0.5)) / GROUPS[nine].length });
    });
  return out;
})();

/** Where a golfer is `t` seconds in, and what they're doing */
export function golferAt(p: Golfer, t: number, out: { x: number; z: number; ry: number; clip: GolfClip; speed: number; since?: number; hole?: number }) {
  const u = (((t + p.offset) % p.loop) + p.loop) % p.loop;
  let lo = 0;
  let hi = p.legs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (p.legs[mid].t0 <= u) lo = mid;
    else hi = mid - 1;
  }
  const l = p.legs[lo];
  const k = l.t1 > l.t0 ? Math.min(1, Math.max(0, (u - l.t0) / (l.t1 - l.t0))) : 1;
  out.x = l.a[0] + (l.b[0] - l.a[0]) * k;
  out.z = l.a[1] + (l.b[1] - l.a[1]) * k;
  out.ry = l.ry;
  out.clip = l.clip;
  out.speed = l.clip === 'walk' ? GOLF_PACE : 0;
  // (how long into a swing or a putt: its row plays from its start)
  out.since = l.clip === 'golf' || l.clip === 'putt' ? u - l.t0 : undefined;
  out.hole = l.hole;
  return out;
}

/** The hole Degen's playing (golfgame.ts sets it while a round's on, -1 otherwise): the crowd's golfers on it step off
 * the course till he's done with it, so nobody's in his way (golflife3d.ts) */
export const PLAYING = { hole: -1 };
/** Is a golfer kept off the course now (on the hole being played) */
export function offCourse(p: Golfer, t: number, at = { x: 0, z: 0, ry: 0, clip: 'look' as GolfClip, speed: 0, hole: -1 }) {
  if (PLAYING.hole < 0) return false;
  golferAt(p, t, at);
  return at.hole === PLAYING.hole;
}

/* ---------- The carts, the mower, the ducks ---------- */

/** A closed way round, measured (its points and the distance to each) */
export interface Loop {
  pts: Pt[];
  cum: number[];
  len: number;
}
export function loopOf(pts: Pt[]): Loop {
  const cum = [0];
  for (let i = 1; i <= pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i % pts.length][0] - pts[i - 1][0], pts[i % pts.length][1] - pts[i - 1][1]));
  return { pts, cum, len: cum.at(-1)! };
}
/** The point `u` along a loop (wrapping round), and the way along it there */
export function onLoop(l: Loop, u: number): { at: Pt; dir: Pt } {
  u = ((u % l.len) + l.len) % l.len;
  let lo = 0;
  let hi = l.pts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (l.cum[mid] <= u) lo = mid;
    else hi = mid - 1;
  }
  const [a, b] = [l.pts[lo], l.pts[(lo + 1) % l.pts.length]];
  const seg = l.cum[lo + 1] - l.cum[lo] || 1;
  const k = (u - l.cum[lo]) / seg;
  return { at: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], dir: [(b[0] - a[0]) / seg, (b[1] - a[1]) / seg] };
}

/** The carts' way round each nine: out from the grounds along every hole's path and its link on, back to the grounds */
export const CART_LOOPS: Loop[] = /* @__PURE__ */ ([0, 1] as const).map((nine) => {
  const byId = (id: string) => PATHS.find((p) => p.id === id)?.pts ?? [];
  const first = nine * 9;
  const pts: Pt[] = [...byId(`grounds-${first + 1}`)];
  for (let i = first; i < first + 9; i++) {
    pts.push(...byId(`hole-${i + 1}`));
    if (i < first + 8) pts.push(...byId(`hole-${i + 1}-${i + 2}`));
  }
  pts.push(...byId(`${first + 9}-grounds`));
  // (no point twice in a row)
  return loopOf(pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 0.05));
});
/** A cart's pace (tiles a second: about 14 km/h), and each one's loop and how far round it starts */
export const CART_PACE = 2.2;
export const CARTS: { nine: 0 | 1; phase: number; trim: boolean }[] = [
  { nine: 0, phase: 0.15, trim: false },
  { nine: 0, phase: 0.62, trim: true },
  { nine: 1, phase: 0.35, trim: false },
  { nine: 1, phase: 0.85, trim: true },
];
/** Its size (tiles: about 2.4 by 1.2 m) and the driver's seat (forward of its middle, left of it, its height) */
export const CART = { len: 1.3, wide: 0.66, seat: { fwd: 0.05, left: 0.16, y: 0.3 } };
/** Where a cart is `t` seconds in and its heading (about y, three.js's) */
export function cartAt(i: number, t: number) {
  const c = CARTS[i];
  const l = CART_LOOPS[c.nine];
  const { at, dir } = onLoop(l, c.phase * l.len + t * CART_PACE);
  return { x: at[0], z: at[1], ry: facing(dir[0], dir[1]) };
}

/** The greenkeeper's mower: up and down one hole's fairway in its stripes, turning at each end (the 10th's) */
export const MOW_HOLE = 9;
export const MOW_PACE = 1.1;
export const MOW_LOOP: Loop = /* @__PURE__ */ (() => {
  const h = HOLES[MOW_HOLE];
  const fw = h.fairway!;
  const [a, b] = [fw.from + 6, arcOf(h.line).at(-1)! + fw.to - 6];
  const pts: Pt[] = [];
  // (up one stripe, back down the next, across to the first at the end; each stripe a share of the fairway's width
  // where it is, which narrows to the green)
  [-0.8, -0.4, 0, 0.4, 0.8].forEach((share, j) => {
    const [s0, s1] = j % 2 ? [b, a] : [a, b];
    for (let k = 0; k <= 12; k++) {
      const at = s0 + ((s1 - s0) * k) / 12;
      pts.push(framePt(h, at, share * (fairwayHalf(h, at) - 1.5)));
    }
  });
  return loopOf(pts);
})();
export function mowerAt(t: number) {
  const { at, dir } = onLoop(MOW_LOOP, t * MOW_PACE);
  return { x: at[0], z: at[1], ry: facing(dir[0], dir[1]) };
}

/** The ducks: a few on each lake, paddling slow rounds well inside its shore (seeded: the same every time) */
export const DUCKS: { lake: number; at: Pt; r: number; speed: number; phase: number; trim: boolean }[] = /* @__PURE__ */ (() => {
  const out: { lake: number; at: Pt; r: number; speed: number; phase: number; trim: boolean }[] = [];
  LAKES.forEach((l, li) => {
    const n = 2 + Math.round(hash(li, 51) * 2);
    for (let k = 0; k < n; k++) {
      const a = hash(li * 7 + k, 53) * Math.PI * 2;
      const rr = 0.35 * hash(li * 7 + k, 57);
      const at: Pt = [l.at[0] + Math.cos(a) * l.r[0] * rr, l.at[1] + Math.sin(a) * l.r[1] * rr];
      out.push({ lake: li, at, r: 1.5 + hash(li * 7 + k, 59) * 2.5, speed: (hash(li * 7 + k, 61) < 0.5 ? -1 : 1) * (0.05 + hash(li * 7 + k, 63) * 0.05), phase: hash(li * 7 + k, 67) * Math.PI * 2, trim: k % 2 === 1 });
    }
  });
  return out;
})();
export function duckAt(i: number, t: number) {
  const d = DUCKS[i];
  const a = d.phase + t * d.speed;
  // (heading along its round: the tangent)
  return { x: d.at[0] + Math.cos(a) * d.r, z: d.at[1] + Math.sin(a) * d.r, ry: facing(-Math.sin(a) * Math.sign(d.speed), Math.cos(a) * Math.sign(d.speed)) };
}
