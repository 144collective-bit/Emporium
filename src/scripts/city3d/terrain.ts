/**
 * The ground over Crestmont's hills (docs/crestmont-plan.md, the owner's call): the first ground in Sector 7 that
 * isn't flat. DOM-free: the ground's mesh (world.ts), walking, driving and flying (walk.ts `groundAt()`), the
 * traffic, the outskirts' trees, shots (solids.ts) and the tests read it.
 *
 * The hills' own shape is hills.ts's (`natural()`); here the hill roads' beds are cut into them (crestmont.ts
 * `HILL_ROADS`: each level across, at its graded height, its banks eased into the slope over `BED.ease`), then any
 * `LEVELS` (ground held level: a building's pad, the plan's later phases). Everywhere outside `TERRAIN_RECT` the
 * ground is 0, as it always was: nothing that stands in the city moves (tests/terrain.test.ts holds every street of
 * the plan but the hill roads to it).
 */
import { HILLS, TERRAIN_RECT, natural, smooth, swell, type Rect } from './hills';
import { BED, HILL_ROADS } from './crestmont';
import { MANSION_LEVELS } from './mansions';

export { HILLS, TERRAIN_RECT, swell, type Rect };

/** Ground held level at `y` inside its rectangle, eased back into the hills over `ease` round it */
export interface Level {
  rect: Rect;
  y: number;
  ease: number;
}
/** The hills' mansions' pads (mansions.ts, Phase 6) */
export const LEVELS: Level[] = MANSION_LEVELS;

/** How far a level's hold reaches at a point: 1 inside its rectangle, easing to 0 over `ease` round it */
function hold(l: Level, x: number, z: number) {
  const [x0, z0, x1, z1] = l.rect;
  const d = Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
  return 1 - smooth(0, l.ease, d);
}

/* ---------- The hill roads' beds, found through a grid of their pieces ---------- */

interface Piece {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  ya: number;
  yb: number;
  /** Level out to here from the centre line */
  core: number;
}
const CELL = 16;
const BEDS = new Map<number, Piece[]>();
const cellKey = (i: number, j: number) => i * 100003 + j;
for (const r of HILL_ROADS) {
  const core = r.half + BED.shoulder;
  const reach = core + BED.ease;
  for (let k = 1; k < r.pts.length; k++) {
    const [a, b] = [r.pts[k - 1], r.pts[k]];
    const p: Piece = { ax: a[0], az: a[1], bx: b[0], bz: b[1], ya: r.y[k - 1], yb: r.y[k], core };
    for (let i = Math.floor((Math.min(a[0], b[0]) - reach) / CELL); i <= Math.floor((Math.max(a[0], b[0]) + reach) / CELL); i++)
      for (let j = Math.floor((Math.min(a[1], b[1]) - reach) / CELL); j <= Math.floor((Math.max(a[1], b[1]) + reach) / CELL); j++) {
        const key = cellKey(i, j);
        if (!BEDS.has(key)) BEDS.set(key, []);
        BEDS.get(key)!.push(p);
      }
  }
}

/**
 * The beds over a point: their height there (each piece's weighed by how firmly it holds, sharpened so the one under
 * you all but decides, so nowhere steps where two beds' banks meet) and how firmly the firmest holds (1 on a road)
 */
function bedAt(x: number, z: number): { y: number; w: number } | null {
  const list = BEDS.get(cellKey(Math.floor(x / CELL), Math.floor(z / CELL)));
  if (!list) return null;
  let most = 0;
  let sum = 0;
  let weight = 0;
  for (const p of list) {
    const [vx, vz] = [p.bx - p.ax, p.bz - p.az];
    const l2 = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((x - p.ax) * vx + (z - p.az) * vz) / l2));
    const d = Math.hypot(x - p.ax - vx * t, z - p.az - vz * t);
    const w = 1 - smooth(p.core, p.core + BED.ease, d);
    if (w <= 0) continue;
    most = Math.max(most, w);
    const k = w ** 6 * (1 / (1 + d));
    sum += (p.ya + (p.yb - p.ya) * t) * k;
    weight += k;
  }
  return most > 0 ? { y: sum / weight, w: most } : null;
}

/** The ground's height at a point (tiles; 0 outside `TERRAIN_RECT`) */
export function heightAt(x: number, z: number, levels: readonly Level[] = LEVELS) {
  if (x <= TERRAIN_RECT[0] || x >= TERRAIN_RECT[2] || z <= TERRAIN_RECT[1] || z >= TERRAIN_RECT[3]) return 0;
  let h = natural(x, z);
  const bed = bedAt(x, z);
  if (bed) h += (bed.y - h) * bed.w;
  for (const l of levels) {
    const w = hold(l, x, z);
    if (w > 0) h += (l.y - h) * w;
  }
  return h;
}

/** The hills' height before the roads were cut in (the tests compare) */
export const naturalAt = (x: number, z: number) => (x <= TERRAIN_RECT[0] || x >= TERRAIN_RECT[2] || z <= TERRAIN_RECT[1] || z >= TERRAIN_RECT[3] ? 0 : natural(x, z));

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

/** The ground's rise along a way (dx, dz a unit vector): a car's nose up or down the hill (traffic, taxis) */
export function riseAlong(x: number, z: number, dx: number, dz: number) {
  const e = 0.6;
  return (heightAt(x + dx * e, z + dz * e) - heightAt(x - dx * e, z - dz * e)) / (2 * e);
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
