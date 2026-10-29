/**
 * Crestmont's hills (docs/crestmont-plan.md Phase 1, the owner's call): the first ground in Sector 7 that
 * isn't flat. DOM-free: the ground's mesh (world.ts), walking, driving and flying (walk.ts `groundAt()`), the
 * outskirts' trees and the tests read it.
 *
 * The hills rise from the Flats, east of the ring highway's east side and north of z `HILLS.foot.z`, up to a ridge
 * (`HILLS.peak` high, a little more or less where the seeded swell says so: spurs and canyons), and fall away again
 * towards the world's north-east corner, so they end before the skyline ring. Everywhere outside `TERRAIN_RECT` the
 * ground is 0, as it always was: nothing that stands in the city moves (tests/terrain.test.ts holds every street of
 * the plan to it).
 *
 * Written in fixed world numbers (north of the river, so no `SOUTH_SHIFT` / `WIDEN`), never against the world's
 * edge: the same hills at both sizes.
 *
 * `LEVELS` are ground held level (cut and fill: a building's pad, later a road's bed), eased into the slope round
 * them; none yet (the plan's later phases add them).
 */

/** A rectangle: x0, z0, x1, z1 */
export type Rect = [number, number, number, number];

export const HILLS = {
  /** The foot of the hills: they begin east of x and north of z (the ring highway's east side is x 275) */
  foot: { x: 285, z: -75 },
  /** How far in from the foot they take to rise to the ridge */
  rise: 110,
  /** The ridge's height before the swell (tiles: 26 is about 47 m; the swell takes it to about 32, 58 m) */
  peak: 26,
  /** Where they've fallen away to nothing beyond the ridge, towards the north-east corner (x, z) */
  end: { x: 490, z: -450 },
  /** How far before that end they start to fall */
  fall: 80,
  /** How round the corners are where the foot's two lines (and the end's) meet */
  round: 30,
} as const;

/** Where the ground can be anything but 0 (outside it heightAt() is 0) */
export const TERRAIN_RECT: Rect = [HILLS.foot.x, HILLS.end.z, HILLS.end.x, HILLS.foot.z];

/** Ground held level at `y` inside its rectangle, eased back into the hills over `ease` round it */
export interface Level {
  rect: Rect;
  y: number;
  ease: number;
}
export const LEVELS: Level[] = [];

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** A soft minimum: the corner where two lines meet rounded over `k` */
const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - (h * h * k) / 4;
};

/** The seeded swell over the ridge: spurs and canyons, about 0.62 to 1.24 (fixed waves, the same for everyone) */
const WAVES: [number, number, number, number][] = [
  // amplitude, direction (radians), wavelength (tiles), phase
  [0.17, 0.55, 150, 1.3],
  [0.12, 2.2, 95, 4.1],
  [0.07, 1.25, 58, 0.4],
  [0.04, 2.9, 34, 2.6],
];
export function swell(x: number, z: number) {
  let n = 0.93;
  for (const [a, dir, len, ph] of WAVES) n += a * Math.sin(((Math.cos(dir) * x + Math.sin(dir) * z) / len) * Math.PI * 2 + ph);
  return n;
}

/** The hills before anything is cut into them */
function natural(x: number, z: number) {
  const into = smin(x - HILLS.foot.x, HILLS.foot.z - z, HILLS.round);
  if (into <= 0) return 0;
  const left = smin(HILLS.end.x - x, z - HILLS.end.z, HILLS.round);
  if (left <= 0) return 0;
  return HILLS.peak * smooth(0, HILLS.rise, into) * smooth(0, HILLS.fall, left) * swell(x, z);
}

/** How far a level's hold reaches at a point: 1 inside its rectangle, easing to 0 over `ease` round it */
function hold(l: Level, x: number, z: number) {
  const [x0, z0, x1, z1] = l.rect;
  const d = Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
  return 1 - smooth(0, l.ease, d);
}

/** The ground's height at a point (tiles; 0 outside `TERRAIN_RECT`) */
export function heightAt(x: number, z: number, levels: readonly Level[] = LEVELS) {
  if (x <= TERRAIN_RECT[0] || x >= TERRAIN_RECT[2] || z <= TERRAIN_RECT[1] || z >= TERRAIN_RECT[3]) return 0;
  let h = natural(x, z);
  for (const l of levels) {
    const w = hold(l, x, z);
    if (w > 0) h += (l.y - h) * w;
  }
  return h;
}

/** Whether a point (with `m` round it) is on the hills' land at all: a cheap test before heightAt() */
export const onHills = (x: number, z: number, m = 0) =>
  x > TERRAIN_RECT[0] - m && x < TERRAIN_RECT[2] + m && z > TERRAIN_RECT[1] - m && z < TERRAIN_RECT[3] + m;

/** The ground's slope at a point: rise over run, the steepest way */
export function slopeAt(x: number, z: number, levels: readonly Level[] = LEVELS) {
  const e = 0.25;
  const gx = (heightAt(x + e, z, levels) - heightAt(x - e, z, levels)) / (2 * e);
  const gz = (heightAt(x, z + e, levels) - heightAt(x, z - e, levels)) / (2 * e);
  return Math.hypot(gx, gz);
}

/**
 * Where a ray from `from` along `dir` (not normalised: `t` is in its own lengths) first comes within `pad` of
 * the hills, at most `t`: the walk and chase cameras keep above them and shots stop on them (solids.ts
 * `rayBoxes()`). Only the stretch over `TERRAIN_RECT` is looked at, marched in steps of about `step` tiles.
 */
export function hillsAlong(from: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }, t: number, pad = 0.3, step = 0.8) {
  // The stretch of the ray over the hills' rectangle (in the ray's own lengths)
  let a = 0;
  let b = t;
  for (const [o, v, lo, hi] of [
    [from.x, dir.x, TERRAIN_RECT[0], TERRAIN_RECT[2]],
    [from.z, dir.z, TERRAIN_RECT[1], TERRAIN_RECT[3]],
  ]) {
    if (Math.abs(v) < 1e-9) {
      if (o <= lo || o >= hi) return t;
      continue;
    }
    let p = (lo - o) / v;
    let q = (hi - o) / v;
    if (p > q) [p, q] = [q, p];
    a = Math.max(a, p);
    b = Math.min(b, q);
    if (a >= b) return t;
  }
  const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
  const steps = Math.max(2, Math.ceil(((b - a) * len) / step));
  let prev = a;
  for (let k = 0; k <= steps; k++) {
    const s = a + ((b - a) * k) / steps;
    if (from.y + dir.y * s < heightAt(from.x + dir.x * s, from.z + dir.z * s) + pad) return k === 0 ? s : prev;
    prev = s;
  }
  return t;
}
