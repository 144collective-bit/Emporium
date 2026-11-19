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
import { MANSIONS, MANSION_LEVELS } from './mansions';
import { SITE_LEVELS } from './crestsites';
import { SOUTH_GROUND_RECT, onSouthGround, southLift } from './southground';
import { BUILT, baked } from './baked';

export { HILLS, TERRAIN_RECT, swell, type Rect };

/** Ground held level at `y` inside its rectangle, eased back into the hills over `ease` round it */
export interface Level {
  rect: Rect;
  y: number;
  ease: number;
  /** One site's levels nested in each other (the reservoir's basin in its apron): which site they're all of */
  of?: string;
}
/** The hills' mansions' pads (mansions.ts, Phase 6) and the landmarks' ground (crestsites.ts, Phase 7) */
export const LEVELS: Level[] = [...MANSION_LEVELS, ...SITE_LEVELS];

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
const CELL = 8;
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
    const vx = p.bx - p.ax;
    const vz = p.bz - p.az;
    const l2 = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((x - p.ax) * vx + (z - p.az) * vz) / l2));
    const dx = x - p.ax - vx * t;
    const dz = z - p.az - vz * t;
    // (past its bank's reach a piece holds nothing: no need for the square root)
    const reach = p.core + BED.ease;
    if (dx * dx + dz * dz >= reach * reach) continue;
    const d = Math.hypot(dx, dz);
    const w = 1 - smooth(p.core, p.core + BED.ease, d);
    if (w <= 0) continue;
    most = Math.max(most, w);
    const k = w ** 6 * (1 / (1 + d));
    sum += (p.ya + (p.yb - p.ya) * t) * k;
    weight += k;
  }
  return most > 0 ? { y: sum / weight, w: most } : null;
}

/** The ground's height at a point (tiles; 0 outside `TERRAIN_RECT` and the south's rolling ground, southground.ts:
 * docs/south-plan.md Phase 1c, read off its grid, `southLift()`) */
export function heightAt(x: number, z: number, levels: readonly Level[] = LEVELS) {
  if (x <= TERRAIN_RECT[0] || x >= TERRAIN_RECT[2] || z <= TERRAIN_RECT[1] || z >= TERRAIN_RECT[3]) return southLift(x, z);
  let h = natural(x, z);
  const bed = bedAt(x, z);
  if (bed) h += (bed.y - h) * bed.w;
  for (const l of levels) {
    const w = hold(l, x, z);
    if (w > 0) h += (l.y - h) * w;
  }
  // The drives graded from their roads up to their pads (never on a road's bed, which holds its own height)
  if (levels === LEVELS)
    for (const r of RAMPS) {
      if (x < r.box[0] || x > r.box[2] || z < r.box[1] || z > r.box[3]) continue;
      const t = Math.max(0, Math.min(1, ((x - r.ax) * r.vx + (z - r.az) * r.vz) / r.l2));
      const d = Math.hypot(x - r.ax - r.vx * t, z - r.az - r.vz * t);
      // (and never on its pad's level ground, which holds its own height: the ramp eases into it as into the road)
      const w = (1 - smooth(RAMP.half, RAMP.half + RAMP.ease, d)) * (1 - (bed?.w ?? 0)) * (1 - hold(r.level, x, z));
      if (w > 0) h += (r.ya + (r.yb - r.ya) * t - h) * w;
    }
  return h;
}

/**
 * Each hill mansion's drive, the ground under it graded (the owner's call, 2026-11-19: the drive met its road on a
 * slab standing out of the bank): from the road's height at its mouth to the pad's at its front, straight, held level
 * across the drive and its kerbs (`half`), eased back into the slope either side (`ease`)
 */
export const RAMP = { half: 1.6, ease: 4 } as const;
const RAMPS = MANSIONS.map((m, i) => {
  const [a, b] = m.drive;
  const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
  const reach = RAMP.half + RAMP.ease;
  const bed = bedAt(a[0], a[1]);
  return {
    ax: a[0],
    az: a[1],
    vx,
    vz,
    l2: vx * vx + vz * vz || 1,
    ya: bed ? bed.y : natural(a[0], a[1]),
    yb: m.y,
    level: MANSION_LEVELS[i],
    box: [Math.min(a[0], b[0]) - reach, Math.min(a[1], b[1]) - reach, Math.max(a[0], b[0]) + reach, Math.max(a[1], b[1]) + reach],
  };
});

/* ---------- The ground as drawn (world.ts `hillsPlane()`) ---------- */

/** The hills' grass grid: a line every `HILL_STEP`, on its multiples */
export const HILL_STEP = 2;
/** Through a level's bank (its ease round it) the grid's lines `LEVEL_STEP` apart, and one on each of its edges */
export const LEVEL_STEP = 1;
/** The ground's pieces (world.ts: its 30-tile tiles, tiles.ts `TILE`) */
const PIECE = 30;
/**
 * The hills' grid's lines along one way (x if `axis` is 0) over a piece of ground from `a` to `b` (and `c` to `d` the
 * other way): its ends, every `HILL_STEP` between, and where a level's ground meets it, a line on each of the level's
 * edges and every `LEVEL_STEP` across its bank, so a pad is drawn flat to its edge and its bank bends where it bends
 * (on the coarse grid alone, a square straddling a pad's edge cut its corner under the grass or left it in the air)
 */
function plainLines(a: number, b: number, c: number, d: number, axis: 0 | 1, levels: readonly Level[]) {
  const out = [a, b];
  for (let v = (Math.floor(a / HILL_STEP) + 1) * HILL_STEP; v < b - 1e-6; v += HILL_STEP) out.push(v);
  for (const l of levels) {
    const [lo, hi, olo, ohi] = axis === 0 ? [l.rect[0], l.rect[2], l.rect[1], l.rect[3]] : [l.rect[1], l.rect[3], l.rect[0], l.rect[2]];
    if (hi + l.ease <= a || lo - l.ease >= b || ohi + l.ease <= c || olo - l.ease >= d) continue;
    for (let k = 0; k <= Math.ceil(l.ease / LEVEL_STEP); k++) {
      const e = Math.min(l.ease, k * LEVEL_STEP);
      for (const v of [lo - e, hi + e]) if (v > a + 1e-6 && v < b - 1e-6) out.push(v);
    }
  }
  out.sort((p, q) => p - q);
  return out.filter((v, i) => i === 0 || v - out[i - 1] > 0.05);
}
/** A piece whose grass on the plain grid strays further than this from the hills' shape gets a line every `FINE_STEP` */
export const FINE_GAP = 0.06;
export const FINE_STEP = 1;
/**
 * The pieces of the hills drawn on the fine grid (each by its north-west corner, `x,z`): where, on the plain lines, the
 * grass strays more than `FINE_GAP` from the hills' shape anywhere in it, looked at every half tile (the ridges, the
 * hill roads' banks, the hollows). Worked out when the site is built (baked.ts; scripts/bake.mjs), not on the visit.
 */
export const FINE_PIECES: string[] = baked('hill-fine', BUILT ? undefined : finePieces);
const FINE = new Set(FINE_PIECES);
function finePieces() {
  const out: string[] = [];
  for (let x0 = Math.floor(TERRAIN_RECT[0] / PIECE) * PIECE; x0 < TERRAIN_RECT[2]; x0 += PIECE)
    for (let z0 = Math.floor(TERRAIN_RECT[1] / PIECE) * PIECE; z0 < TERRAIN_RECT[3]; z0 += PIECE) {
      const xs = plainLines(x0, x0 + PIECE, z0, z0 + PIECE, 0, LEVELS);
      const zs = plainLines(z0, z0 + PIECE, x0, x0 + PIECE, 1, LEVELS);
      const H = zs.map((z) => xs.map((x) => heightAt(x, z)));
      if (!H.some((row) => row.some((h) => h > 0))) continue;
      let i = 0;
      let j = 0;
      search: for (let x = x0 + 0.25; x < x0 + PIECE; x += 0.5)
        for (let z = z0 + 0.25; z < z0 + PIECE; z += 0.5) {
          while (i + 2 < xs.length && xs[i + 1] <= x) i++;
          j = 0;
          while (j + 2 < zs.length && zs[j + 1] <= z) j++;
          const [fx, fz] = [(x - xs[i]) / (xs[i + 1] - xs[i]), (z - zs[j]) / (zs[j + 1] - zs[j])];
          const [ha, hb, hc, hd] = [H[j][i], H[j][i + 1], H[j + 1][i + 1], H[j + 1][i]];
          const drawn = fx >= fz ? ha + (hb - ha) * fx + (hc - hb) * fz : ha + (hd - ha) * fz + (hc - hd) * fx;
          if (Math.abs(drawn - heightAt(x, z)) > FINE_GAP) {
            out.push(`${x0},${z0}`);
            break search;
          }
        }
    }
  return out;
}
/** Whether a piece (from x0, z0) is drawn fine */
const finePiece = (x0: number, z0: number) => FINE.has(`${x0},${z0}`);
/**
 * The hills' grid's lines along one way (x if `axis` is 0) over a piece of ground from `a` to `b` (and `c` to `d` the
 * other way): its ends, every `HILL_STEP` between, and where a level's ground meets it, a line on each of the level's
 * edges and every `LEVEL_STEP` across its bank, so a pad is drawn flat to its edge and its bank bends where it bends
 * (on the coarse grid alone, a square straddling a pad's edge cut its corner under the grass or left it in the air);
 * where the hills curve more than the plain grid follows (`finePiece()`), a line every `FINE_STEP` across the piece
 */
export function hillLines(a: number, b: number, c: number, d: number, axis: 0 | 1, levels: readonly Level[] = LEVELS) {
  const out = plainLines(a, b, c, d, axis, levels);
  if (levels !== LEVELS || !(axis === 0 ? finePiece(a, c) : finePiece(c, a))) return out;
  for (let v = (Math.floor(a / FINE_STEP) + 1) * FINE_STEP; v < b - 1e-6; v += FINE_STEP) out.push(v);
  out.sort((p, q) => p - q);
  return out.filter((v, i) => i === 0 || v - out[i - 1] > 0.05);
}
/** Each piece's lines, worked out once */
const PIECE_LINES = new Map<number, [number[], number[]]>();
/** The last line at or before `v` in a sorted list (its index) */
function cellOf(lines: number[], v: number) {
  let lo = 0;
  let hi = lines.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lines[mid] <= v) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
/**
 * The ground's height as the hills' grass draws it (world.ts `hillsPlane()`): `heightAt()` at its grid's corners
 * (`hillLines()`), each square split from its low corner (x0, z0) to its high one (x1, z1), each triangle flat. What
 * stands on the hills and wants its foot on the grass it's seen on (crestbanks.ts) reads this.
 */
export function drawnAt(x: number, z: number) {
  if (x <= TERRAIN_RECT[0] || x >= TERRAIN_RECT[2] || z <= TERRAIN_RECT[1] || z >= TERRAIN_RECT[3]) return heightAt(x, z);
  const [p0, q0] = [Math.floor(x / PIECE) * PIECE, Math.floor(z / PIECE) * PIECE];
  const key = p0 * 7919 + q0;
  let lines = PIECE_LINES.get(key);
  if (!lines) PIECE_LINES.set(key, (lines = [hillLines(p0, p0 + PIECE, q0, q0 + PIECE, 0), hillLines(q0, q0 + PIECE, p0, p0 + PIECE, 1)]));
  const [xs, zs] = lines;
  const [i, j] = [cellOf(xs, x), cellOf(zs, z)];
  const [x0, x1, z0, z1] = [xs[i], xs[i + 1], zs[j], zs[j + 1]];
  const [fx, fz] = [(x - x0) / (x1 - x0), (z - z0) / (z1 - z0)];
  const a = heightAt(x0, z0);
  const c = heightAt(x1, z1);
  // (the triangle with the (x1, z0) corner, or the one with the (x0, z1) corner)
  if (fx >= fz) {
    const b = heightAt(x1, z0);
    return a + (b - a) * fx + (c - b) * fz;
  }
  const dd = heightAt(x0, z1);
  return a + (dd - a) * fz + (c - dd) * fx;
}

/** The hills' height before the roads were cut in (the tests compare) */
export const naturalAt = (x: number, z: number) => (x <= TERRAIN_RECT[0] || x >= TERRAIN_RECT[2] || z <= TERRAIN_RECT[1] || z >= TERRAIN_RECT[3] ? 0 : natural(x, z));

/** Whether a point (with `m` round it) is on Crestmont's hills' land at all */
export const onCrest = (x: number, z: number, m = 0) =>
  x > TERRAIN_RECT[0] - m && x < TERRAIN_RECT[2] + m && z > TERRAIN_RECT[1] - m && z < TERRAIN_RECT[3] + m;
/** Whether a point (with `m` round it) is on ground that isn't flat at all (Crestmont's hills, the south's rolling
 * ground): a cheap test before heightAt() */
export const onHills = (x: number, z: number, m = 0) => onCrest(x, z, m) || onSouthGround(x, z, m);

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
  // (Crestmont's hills, then the south's rolling ground: the nearer stop wins)
  return Math.min(alongOver(TERRAIN_RECT, from, dir, t, pad, step), alongOver(SOUTH_GROUND_RECT, from, dir, t, pad, step));
}
function alongOver(R: Rect, from: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }, t: number, pad: number, step: number) {
  // The stretch of the ray over the rectangle (in the ray's own lengths)
  let a = 0;
  let b = t;
  for (const [o, v, lo, hi] of [
    [from.x, dir.x, R[0], R[2]],
    [from.z, dir.z, R[1], R[3]],
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
