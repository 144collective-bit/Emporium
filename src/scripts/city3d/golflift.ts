/*
 * The golf course's ground as the city stands on it (docs/golf-plan.md Phase 2; DOM-free, tested in
 * tests/golflift.test.ts). The course's own shape (golfground.ts) is worked out once, when the site is built (`baked()`
 * key `golf-ground`), on a grid every `GOLF_STEP`, and read back here: the boot never carries the course's code.
 *
 * - `golfLift()`: the ground's height over today's (0 off the course), each square of the grid two flat triangles,
 *   split from its low corner (x, z) to its high one, as world.ts draws it (`golfPlane()`) and the rolls are split, so
 *   what's drawn is what's walked on (terrain.ts `heightAt()` reads it).
 * - `golfLand()`: what the land is at a point (`LAND`): off the course (0), its native grass between the holes (1:
 *   woods), its rough well away from the holes (2: a tree here and there), or in play (3: a hole's rough, fairway,
 *   green or tee, a bunker, the water, the paths, the drive, the grounds); the clearing rule (landuse.ts), the ground's
 *   paint (ground.ts) and the course's woods (`golfTrees()`, world.ts) read it.
 * - `DRIVE` (Clubhouse Drive, off the country road east up to the clubhouse's grounds) and `FOOTPATH` (from the course
 *   out to the country road): their lines, for the clearing rule, the country road's fences' gaps and the drawing.
 * - `golfWater()`: each lake's water level (golf.ts `LAKES`, in their order), for the course's drawing.
 *
 * The grid is packed for the page: the heights in 64ths of a tile, each from the one before it along its row, a
 * character each (`packGolf()` / `unpackHeights()`); the land in runs. Its box is fixed (`GOLF_RECT`): what's kept
 * clear and painted round the course files it by its box before the grid is read.
 *
 * The boot never imports the course's own modules (golf.ts, golfground.ts: they'd come into the boot's code with
 * them): what works the grid out is golfbake.ts, loaded by the bake (scripts/bake.mjs, first), the tests
 * (scripts/test.mjs) and the seam map's script, which hands it here (`setGolfMaker()`). The grid's read the first
 * time anything asks.
 */
import { BUILT, baked } from './baked';

type Rect = [number, number, number, number];

/** What the land is (`golfLand()`) */
export const LAND = { off: 0, native: 1, rough: 2, play: 3 } as const;
export type Land = 0 | 1 | 2 | 3;

/** Clubhouse Drive's corners (docs/golf-plan.md Phase 3): off the country road east (ew0-e, its north edge) north along
 * the hills' east foot, over the club's edge into its land and up its bed to the clubhouse's grounds (golfground.ts) */
export const DRIVE_CORNERS: [number, number][] = [
  [502, -6.2],
  [501, -26],
  [498, -64],
  [503, -110],
  [499, -170],
  [501, -240],
  [498, -310],
  [501, -352],
  [506, -374],
  [515, -388],
  [520, -406],
  [522, -428],
  [520.5, -450],
  [521, -470],
];
/** A line's corners rounded (Chaikin's: each corner cut to two points a quarter in either side, `passes` times), its
 * ends kept */
function rounded(pts: [number, number][], passes: number): [number, number][] {
  let out = pts;
  for (let k = 0; k < passes; k++) {
    const next: [number, number][] = [out[0]];
    for (let i = 1; i < out.length; i++) {
      const [a, b] = [out[i - 1], out[i]];
      if (i > 1) next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      if (i < out.length - 1) next.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    next.push(out.at(-1)!);
    out = next;
  }
  return out;
}
/** Clubhouse Drive: its corners rounded (a road bends, it doesn't kink: the owner's call, streets follow the land) */
export const DRIVE: [number, number][] = rounded(DRIVE_CORNERS, 2);
/** The drive's half width (a lane each way, as a country road's) */
export const DRIVE_HALF = 1.7;
/** The footpath from the course out to the country road east (its north edge), joining the cart path by hole 12 */
export const FOOTPATH: [number, number][] = [
  [688, -6.2],
  [689, -24],
  [690, -40],
  [691, -54],
];
/** A path's half width (the cart paths, the footpath) */
export const PATH_HALF = 0.8;
/** Where the drive and the footpath cross the country road's fence (x0, z0, x1, z1: ruralfence.ts leaves a gap) */
export const CLUB_GAPS: Rect[] = [
  [DRIVE[0][0] - DRIVE_HALF - 1, -14, DRIVE[0][0] + DRIVE_HALF + 1, -6.2],
  [FOOTPATH[0][0] - PATH_HALF - 0.6, -14, FOOTPATH[0][0] + PATH_HALF + 0.6, -6.2],
];

/** The grid's step (tiles): world.ts draws the course's grass near on it */
export const GOLF_STEP = 2;
/** How finely the heights are kept (a 64th of a tile, about 3 cm) */
const Q = 64;

export interface GolfGrid {
  /** The grid's first point (x0, z0), its step, how many points across and down */
  x0: number;
  z0: number;
  step: number;
  nx: number;
  nz: number;
  /** The heights, packed */
  h: string;
  /** The land, in runs */
  m: string;
  /** Each lake's water level */
  w: number[];
}

/* ---------- Packing ---------- */

/** The characters a step between heights is written in: printable, never a quote or a backslash */
const ALPHA = Array.from({ length: 94 }, (_, i) => String.fromCharCode(33 + i))
  .filter((c) => c !== '"' && c !== '\\')
  .join('');
/** A step from -`MID` to `MID` is one character; anything bigger is `ESC` and its value in four */
const MID = 44;
const ESC = ALPHA[2 * MID + 1];
const BIG = 46000000;
function packHeights(q: Int32Array, nx: number): string {
  let out = '';
  for (let k = 0; k < q.length; k++) {
    const prev = k % nx === 0 ? (k === 0 ? 0 : q[k - nx]) : q[k - 1];
    const d = q[k] - prev;
    if (d >= -MID && d <= MID) out += ALPHA[d + MID];
    else {
      let v = d + BIG / 2;
      let s = '';
      for (let i = 0; i < 4; i++) {
        s += ALPHA[v % 92];
        v = Math.floor(v / 92);
      }
      out += ESC + s;
    }
  }
  return out;
}
function unpackHeights(s: string, n: number, nx: number): Float32Array {
  const code = new Map([...ALPHA].map((c, i) => [c, i]));
  const q = new Int32Array(n);
  let k = 0;
  for (let i = 0; i < s.length && k < n; k++) {
    const prev = k % nx === 0 ? (k === 0 ? 0 : q[k - nx]) : q[k - 1];
    const c = s[i++];
    let d: number;
    if (c === ESC) {
      let v = 0;
      for (let j = 3; j >= 0; j--) v = v * 92 + code.get(s[i + j])!;
      i += 4;
      d = v - BIG / 2;
    } else d = code.get(c)! - MID;
    q[k] = prev + d;
  }
  const out = new Float32Array(n);
  for (let j = 0; j < n; j++) out[j] = q[j] / Q;
  return out;
}
/** The land in runs: its value (0, 1, 2) and how many, in base 36, each run ended by a full stop */
const packLand = (m: Uint8Array) => {
  let out = '';
  for (let k = 0; k < m.length; ) {
    let n = 1;
    while (k + n < m.length && m[k + n] === m[k]) n++;
    out += `${m[k]}${n.toString(36)}.`;
    k += n;
  }
  return out;
};
const unpackLand = (s: string, n: number) => {
  const m = new Uint8Array(n);
  let k = 0;
  for (const run of s.split('.')) {
    if (!run) continue;
    const v = Number(run[0]);
    const len = parseInt(run.slice(1), 36);
    m.fill(v, k, k + len);
    k += len;
  }
  return m;
};

/* ---------- The grid, made when the site is built ---------- */

/** The grid's box (x0, z0, x1, z1), on its step: round the course's land (golf.ts `COURSE_RECT`, tests/golflift.test.ts) */
export const GOLF_RECT: Rect = [296, -744, 784, -30];
const NX = (GOLF_RECT[2] - GOLF_RECT[0]) / GOLF_STEP + 1;
const NZ = (GOLF_RECT[3] - GOLF_RECT[1]) / GOLF_STEP + 1;

/** Packs a grid worked out point by point (golfbake.ts): its height (tiles) and its land at each */
export function packGolf(heightAt: (x: number, z: number) => number, landAt: (x: number, z: number) => Land, water: number[]): GolfGrid {
  const q = new Int32Array(NX * NZ);
  const m = new Uint8Array(NX * NZ);
  for (let j = 0; j < NZ; j++)
    for (let i = 0; i < NX; i++) {
      const [x, z] = [GOLF_RECT[0] + i * GOLF_STEP, GOLF_RECT[1] + j * GOLF_STEP];
      q[j * NX + i] = Math.round(heightAt(x, z) * Q);
      m[j * NX + i] = landAt(x, z);
    }
  return { x0: GOLF_RECT[0], z0: GOLF_RECT[1], step: GOLF_STEP, nx: NX, nz: NZ, h: packHeights(q, NX), m: packLand(m), w: water.map((w) => Math.round(w * Q) / Q) };
}

/** A packed grid's heights and land (the tests unpack one) */
export const unpackGolf = (g: GolfGrid) => ({ heights: unpackHeights(g.h, g.nx * g.nz, g.nx), land: unpackLand(g.m, g.nx * g.nz) });

let maker: (() => GolfGrid) | null = null;
/** What works the grid out where there's no build's data (golfbake.ts: the bake, the tests) */
export function setGolfMaker(make: () => GolfGrid) {
  maker = make;
}
let grid: GolfGrid | null = null;
/** The grid (the build's, or worked out: the bake, the tests) */
export function golfGrid(): GolfGrid {
  return (grid ??= baked(
    'golf-ground',
    BUILT
      ? undefined
      : () => {
          if (!maker) throw new Error('golf-ground: golfbake.ts works it out; load it first');
          return maker();
        }
  ));
}

/* ---------- Reading it ---------- */

/** Each lake's water level (golf.ts `LAKES`' order) */
export const golfWater = (i: number) => golfGrid().w[i];
let heights: Float32Array | null = null;
let land: Uint8Array | null = null;
const H = () => (heights ??= unpackHeights(golfGrid().h, NX * NZ, NX));
const M = () => (land ??= unpackLand(golfGrid().m, NX * NZ));
const G = { x0: GOLF_RECT[0], z0: GOLF_RECT[1], step: GOLF_STEP, nx: NX, nz: NZ };

/** Is x, z (with `m` round it) over the course's grid at all (a cheap test first) */
export const onGolfGrid = (x: number, z: number, m = 0) => x > GOLF_RECT[0] - m && x < GOLF_RECT[2] + m && z > GOLF_RECT[1] - m && z < GOLF_RECT[3] + m;

/** The grid point (i, j)'s height (tiles) */
export function golfNode(i: number, j: number) {
  if (i < 0 || j < 0 || i >= G.nx || j >= G.nz) return 0;
  return H()[j * G.nx + i];
}
/** The course's ground's height over today's at x, z (0 off the grid), as drawn: each square two triangles from its
 * low corner to its high one */
export function golfLift(x: number, z: number) {
  if (!onGolfGrid(x, z)) return 0;
  const u = (x - G.x0) / G.step;
  const v = (z - G.z0) / G.step;
  const i = Math.min(G.nx - 2, Math.floor(u));
  const j = Math.min(G.nz - 2, Math.floor(v));
  const [fu, fv] = [u - i, v - j];
  const h = H();
  const k = j * G.nx + i;
  const [h00, h10, h01, h11] = [h[k], h[k + 1], h[k + G.nx], h[k + G.nx + 1]];
  if (h00 === 0 && h10 === 0 && h01 === 0 && h11 === 0) return 0;
  return fu >= fv ? h00 + (h10 - h00) * fu + (h11 - h10) * fv : h00 + (h01 - h00) * fv + (h11 - h01) * fu;
}
/** What the land is at x, z (its nearest grid point, `LAND`) */
export function golfLand(x: number, z: number): Land {
  if (!onGolfGrid(x, z)) return 0;
  const i = Math.round((x - G.x0) / G.step);
  const j = Math.round((z - G.z0) / G.step);
  if (i < 0 || j < 0 || i >= G.nx || j >= G.nz) return 0;
  return M()[j * G.nx + i] as Land;
}
/** How far the land's fields blur its edges (grid points either way) */
const BLUR = 3;
const fields: Partial<Record<1 | 2 | 3, Float32Array>> = {};
/** The share of the land round each grid point that's at least `kind` (`LAND`), blurred */
function field(kind: 1 | 2 | 3) {
  let f = fields[kind];
  if (f) return f;
  const m = M();
  const [nx, nz] = [G.nx, G.nz];
  // (a box blur, across then down)
  const a = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      let s = 0;
      for (let d = -BLUR; d <= BLUR; d++) {
        const k = Math.min(nx - 1, Math.max(0, i + d));
        s += m[j * nx + k] >= kind ? 1 : 0;
      }
      a[j * nx + i] = s / (2 * BLUR + 1);
    }
  f = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      let s = 0;
      for (let d = -BLUR; d <= BLUR; d++) s += a[Math.min(nz - 1, Math.max(0, j + d)) * nx + i];
      f[j * nx + i] = s / (2 * BLUR + 1);
    }
  fields[kind] = f;
  return f;
}
/** How much of the land round x, z is at least `kind` (1: the course's, 2: its rough or play, 3: in play), 0 to 1,
 * blurred over a few tiles: the ground's paint eases from the open land's into the course's over it (ground.ts) */
export function golfShare(x: number, z: number, kind: 1 | 2 | 3) {
  if (!onGolfGrid(x, z)) return 0;
  const f = field(kind);
  const u = Math.max(0, Math.min(G.nx - 1.001, (x - G.x0) / G.step));
  const v = Math.max(0, Math.min(G.nz - 1.001, (z - G.z0) / G.step));
  const [i, j] = [Math.floor(u), Math.floor(v)];
  const [fu, fv] = [u - i, v - j];
  const k = j * G.nx + i;
  const top = f[k] + (f[k + 1] - f[k]) * fu;
  const bottom = f[k + G.nx] + (f[k + G.nx + 1] - f[k + G.nx]) * fu;
  return top + (bottom - top) * fv;
}
/** Whether the course's land comes into a box (x0, z0, x1, z1) at all, on its grid's points (and one past) */
export function golfIn(x0: number, z0: number, x1: number, z1: number) {
  if (x1 < GOLF_RECT[0] || x0 > GOLF_RECT[2] || z1 < GOLF_RECT[1] || z0 > GOLF_RECT[3]) return false;
  const m = M();
  const [i0, i1] = [Math.max(0, Math.floor((x0 - G.x0) / G.step) - 1), Math.min(G.nx - 1, Math.ceil((x1 - G.x0) / G.step) + 1)];
  const [j0, j1] = [Math.max(0, Math.floor((z0 - G.z0) / G.step) - 1), Math.min(G.nz - 1, Math.ceil((z1 - G.z0) / G.step) + 1)];
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (m[j * G.nx + i]) return true;
  return false;
}
/** Whether x, z stands on the course's ground (its land, or a square touching it) */
export function onGolf(x: number, z: number) {
  if (!onGolfGrid(x, z)) return false;
  const u = Math.floor((x - G.x0) / G.step);
  const v = Math.floor((z - G.z0) / G.step);
  const m = M();
  for (const [di, dj] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const [i, j] = [u + di, v + dj];
    if (i >= 0 && j >= 0 && i < G.nx && j < G.nz && m[j * G.nx + i]) return true;
  }
  return false;
}

/* ---------- The course's ground's mesh ---------- */

/** A mesh's points (x, z pairs) and its triangles (three indices each, wound to face up) */
export interface GolfMesh {
  xz: number[];
  tri: number[];
}
/** How coarse the far mesh's middle is (its edges stay on the grid's step, so a piece drawn far meets one drawn near
 * with no gap) */
export const GOLF_FAR = 3 * GOLF_STEP;
/** A triangle (a, b, c) of points (x, z) wound to face up (its normal's y over 0) */
function upward(xz: number[], a: number, b: number, c: number): [number, number, number] {
  const [ax, az, bx, bz, cx, cz] = [xz[a * 2], xz[a * 2 + 1], xz[b * 2], xz[b * 2 + 1], xz[c * 2], xz[c * 2 + 1]];
  return (bz - az) * (cx - ax) - (bx - ax) * (cz - az) >= 0 ? [a, b, c] : [a, c, b];
}
/** The lines from a to b every `step` (on its multiples), its ends kept */
function lines(a: number, b: number, step: number) {
  const out = [a];
  for (let v = (Math.floor(a / step) + 1) * step; v < b - 1e-6; v += step) out.push(v);
  out.push(b);
  return out;
}
/**
 * The course's ground over a box (x0, z0, x1, z1) as triangles. Near: the grid every `GOLF_STEP`, each square split from
 * its low corner to its high one, as `golfLift()` reads it (what's drawn is what's walked on). Far: its middle every
 * `GOLF_FAR`, its edges still every `GOLF_STEP`, a band of triangles zipping the two together, so its edges are exactly
 * a near piece's: no gap where a tile drawn near meets one drawn far (world.ts draws the grass on it, golf3d.ts the turf).
 */
export function golfMesh(r: Rect, far: boolean): GolfMesh {
  const [x0, z0, x1, z1] = r;
  const xz: number[] = [];
  const tri: number[] = [];
  const grid = (xs: number[], zs: number[]) => {
    const base = xz.length / 2;
    for (const z of zs) for (const x of xs) xz.push(x, z);
    const n = xs.length;
    for (let j = 0; j + 1 < zs.length; j++)
      for (let i = 0; i + 1 < n; i++) {
        const a = base + j * n + i;
        const [b, c, d] = [a + 1, a + n + 1, a + n];
        tri.push(...upward(xz, a, c, b), ...upward(xz, a, d, c));
      }
    return { base, n };
  };
  // (too small for a middle of its own: the grid all through)
  if (!far || x1 - x0 < 3 * GOLF_FAR || z1 - z0 < 3 * GOLF_FAR) {
    grid(lines(x0, x1, GOLF_STEP), lines(z0, z1, GOLF_STEP));
    return { xz, tri };
  }
  // The middle, coarse
  const [ix0, iz0, ix1, iz1] = [x0 + GOLF_FAR, z0 + GOLF_FAR, x1 - GOLF_FAR, z1 - GOLF_FAR];
  const xs = lines(ix0, ix1, GOLF_FAR);
  const zs = lines(iz0, iz1, GOLF_FAR);
  const inner = grid(xs, zs);
  const innerAt = (i: number, j: number) => inner.base + j * inner.n + i;
  // The band: each side's edge every step zipped to the middle's edge facing it
  const point = (x: number, z: number) => (xz.push(x, z), xz.length / 2 - 1);
  const ex = lines(x0, x1, GOLF_STEP);
  const ez = lines(z0, z1, GOLF_STEP);
  const sides: { outer: number[]; inner: number[]; t: (k: number) => number }[] = [
    // (north, south: along x; west, east: along z; the corners shared)
    { outer: [], inner: xs.map((_, i) => innerAt(i, 0)), t: (k) => xz[k * 2] },
    { outer: [], inner: xs.map((_, i) => innerAt(i, zs.length - 1)), t: (k) => xz[k * 2] },
    { outer: [], inner: zs.map((_, j) => innerAt(0, j)), t: (k) => xz[k * 2 + 1] },
    { outer: [], inner: zs.map((_, j) => innerAt(xs.length - 1, j)), t: (k) => xz[k * 2 + 1] },
  ];
  const corners = [point(x0, z0), point(x1, z0), point(x0, z1), point(x1, z1)];
  sides[0].outer = [corners[0], ...ex.slice(1, -1).map((x) => point(x, z0)), corners[1]];
  sides[1].outer = [corners[2], ...ex.slice(1, -1).map((x) => point(x, z1)), corners[3]];
  sides[2].outer = [corners[0], ...ez.slice(1, -1).map((z) => point(x0, z)), corners[2]];
  sides[3].outer = [corners[1], ...ez.slice(1, -1).map((z) => point(x1, z)), corners[3]];
  for (const s of sides) {
    // (each run's place along its side, 0 to 1, the outer from the box's corner to corner, the inner the middle's)
    const frac = (run: number[]) => {
      const [a, b] = [s.t(run[0]), s.t(run[run.length - 1])];
      return run.map((k) => (s.t(k) - a) / (b - a));
    };
    const [fo, fi] = [frac(s.outer), frac(s.inner)];
    let [i, j] = [0, 0];
    while (i < s.outer.length - 1 || j < s.inner.length - 1) {
      if (j === s.inner.length - 1 || (i < s.outer.length - 1 && fo[i + 1] <= fi[j + 1])) {
        tri.push(...upward(xz, s.outer[i], s.outer[i + 1], s.inner[j]));
        i++;
      } else {
        tri.push(...upward(xz, s.outer[i], s.inner[j + 1], s.inner[j]));
        j++;
      }
    }
  }
  return { xz, tri };
}

/* ---------- The course's woods ---------- */

/** How likely a grid point grows a tree: its native grass (woods), its rough well away from the holes (a few) */
export const WOODS_CHANCE = { native: 0.16, rough: 0.035 };
/** A seeded number in [0, 1) for a grid point and a draw */
const seeded = (i: number, j: number, k: number) => {
  let h = Math.imul(i * 73856093 ^ j * 19349663 ^ k * 83492791, 2654435761) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};
/**
 * The course's woods (docs/golf-plan.md Phase 3): a tree now and then on its land's grid, thick in the native grass
 * between the holes and a few in the rough well away from them, never in play; the outskirts' trees keep off the
 * course's land (landuse.ts), these stand in their place (world.ts `scatterOutskirts()`, as the outskirts' are drawn).
 * The same trees every time, each a little off its grid point; `keep` under 1 leaves the rest out (phones: the trim).
 */
export function golfTrees(keep = 1): { x: number; z: number; s: number; pine: boolean }[] {
  const m = M();
  const out: { x: number; z: number; s: number; pine: boolean }[] = [];
  for (let j = 0; j < G.nz; j++)
    for (let i = 0; i < G.nx; i++) {
      const land = m[j * G.nx + i];
      if (land !== LAND.native && land !== LAND.rough) continue;
      // (its neighbours too: a tree's crown never over the play, nor its trunk off the course)
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([di, dj]) => {
        const n = m[(j + dj) * G.nx + i + di] ?? LAND.off;
        return n === LAND.play || n === LAND.off;
      }))
        continue;
      if (seeded(i, j, 0) >= (land === LAND.native ? WOODS_CHANCE.native : WOODS_CHANCE.rough)) continue;
      if (seeded(i, j, 5) >= keep) continue;
      const pine = seeded(i, j, 3) < (land === LAND.native ? 0.65 : 0.35);
      out.push({
        x: G.x0 + i * G.step + (seeded(i, j, 1) - 0.5) * G.step * 0.8,
        z: G.z0 + j * G.step + (seeded(i, j, 2) - 0.5) * G.step * 0.8,
        s: pine ? 1.5 + seeded(i, j, 4) * 1.2 : 1.1 + seeded(i, j, 4) * 0.8,
        pine,
      });
    }
  return out;
}

/* ---------- Knob Hill Golf Club's clubhouse (docs/golf-plan.md Phase 4) ---------- */

/** The club's name (made up: the owner's call, 2026-11-21) */
export const CLUB_NAME = 'KNOB HILL GOLF CLUB';
/**
 * The clubhouse's grounds (golf.ts `CLUB_GROUNDS`, level at the rise's top: golfground.ts) and what stands on them: the
 * clubhouse (two storeys, a hipped roof, a columned porch south over the car park with the club's name over it, a
 * terrace north over the course), the car park where the drive comes in, the cart shed, the putting green and the
 * practice nets (the short range: the owner's call). The boot's: the place, its door, its solids (golf3d.ts draws it).
 */
export const GOLF_CLUBHOUSE = {
  grounds: [500, -520, 572, -470] as Rect,
  house: [510, -514, 546, -498] as Rect,
  storey: { ground: 3, upper: 2.6 },
  roof: 1.6,
  porch: [520, -498, 536, -495] as Rect,
  terrace: [510, -519, 546, -514] as Rect,
  carpark: [506, -492, 548, -470] as Rect,
  shed: [552, -492, 568, -484] as Rect,
  putting: { at: [559, -505] as [number, number], r: [9, 6.5] as [number, number] },
  nets: [501, -516, 508, -494] as Rect,
  /** Where you arrive (Walk in: in the car park, facing the porch) and the door's prompt (in the porch) */
  spawn: { x: 528, z: -486, yaw: 0 },
  door: { x: 528, z: -496.6 },
};
/** The grounds' level (the baked grid's, at their middle) */
export const clubLevel = () => golfLift((GOLF_CLUBHOUSE.grounds[0] + GOLF_CLUBHOUSE.grounds[2]) / 2, (GOLF_CLUBHOUSE.grounds[1] + GOLF_CLUBHOUSE.grounds[3]) / 2);
/** The clubhouse's full height over its grounds (to the roof's ridge) */
export const GOLF_CLUBHOUSE_H = GOLF_CLUBHOUSE.storey.ground + GOLF_CLUBHOUSE.storey.upper + GOLF_CLUBHOUSE.roof;
/** What's solid at the club (x0, z0, x1, z1, top: their tops over today's ground, the grounds' level added): the
 * clubhouse, the porch's columns, the cart shed, the nets' frame */
export function golfSolids(): [number, number, number, number, number][] {
  const y = clubLevel();
  const { house, porch, shed, nets } = GOLF_CLUBHOUSE;
  const cols = [0, 1, 2, 3].map((k): [number, number, number, number, number] => {
    const x = porch[0] + 1 + ((porch[2] - porch[0] - 2) * k) / 3;
    return [x - 0.25, porch[1] - 0.25, x + 0.25, porch[1] + 0.25, y + GOLF_CLUBHOUSE.storey.ground];
  });
  return [
    [house[0], house[1], house[2], house[3], y + GOLF_CLUBHOUSE_H],
    ...cols,
    [shed[0], shed[1], shed[2], shed[1] + 0.3, y + 2.6],
    [shed[0], shed[1], shed[0] + 0.3, shed[3], y + 2.6],
    [shed[2] - 0.3, shed[1], shed[2], shed[3], y + 2.6],
    [nets[0], nets[1], nets[0] + 0.2, nets[3], y + 3],
    [nets[0], nets[1], nets[2], nets[1] + 0.2, y + 3],
    [nets[0], nets[3] - 0.2, nets[2], nets[3], y + 3],
  ];
}

/* ---------- Clubhouse Drive as a street (the owner's call, 2026-11-22: "make Clubhouse Drive a real street") ---------- */

/** The turning loop at the drive's end, in the car park: its radius (a country road's, rural.ts `RURAL.turn`, a little less) */
export const DRIVE_TURN = 5;
type GolfStreet = { id: string; kind: 'rural'; pts: [number, number][]; half: number; lanes: 1; oneway?: 1; loop?: true };
type GolfCrossing = { id: string; at: [number, number]; streets: string[]; lights: boolean };
/**
 * Clubhouse Drive in the street plan (streetplan.ts `cityPlan()`, after the country roads are split): from the country
 * road east's middle (ew0-e: the drive's first point is its north edge, a lane's width up) up to the grounds, and a
 * turning loop one way round in the car park, as a country road's at its end (rural.ts), so a taxi drives up to the
 * clubhouse and the traffic turns back. Drawn by golf3d.ts (its asphalt over the course's ground; the loop is the car
 * park's): the country roads' drawing (rural3d.ts) draws only their runs.
 */
export function golfStreets(): { streets: GolfStreet[]; crossings: GolfCrossing[] } {
  const start: [number, number] = [DRIVE[0][0], DRIVE[0][1] + DRIVE_HALF];
  const end = DRIVE[DRIVE.length - 1];
  const before = DRIVE[DRIVE.length - 2];
  const l = Math.hypot(end[0] - before[0], end[1] - before[1]) || 1;
  const dir: [number, number] = [(end[0] - before[0]) / l, (end[1] - before[1]) / l];
  const centre: [number, number] = [end[0] + dir[0] * DRIVE_TURN, end[1] + dir[1] * DRIVE_TURN];
  const n = 20;
  const a0 = Math.atan2(end[1] - centre[1], end[0] - centre[0]);
  const ring: [number, number][] = Array.from({ length: n }, (_, k): [number, number] => {
    const t = a0 - (k / n) * Math.PI * 2;
    return [+(centre[0] + Math.cos(t) * DRIVE_TURN).toFixed(4), +(centre[1] + Math.sin(t) * DRIVE_TURN).toFixed(4)];
  });
  ring[0] = end;
  return {
    streets: [
      // (its first points past the junction's corner: a stretch a lane long there leaves the routes' rounding nothing to round)
      { id: 'golf-drive', kind: 'rural', pts: [start, ...DRIVE.filter((p) => Math.hypot(p[0] - start[0], p[1] - start[1]) >= 6)], half: DRIVE_HALF, lanes: 1 },
      { id: 'golf-drive-turn', kind: 'rural', pts: ring, half: DRIVE_HALF, lanes: 1, oneway: 1, loop: true },
    ],
    crossings: [
      { id: 'golf-drive-gate', at: start, streets: ['ew0-e', 'golf-drive'], lights: false },
      { id: 'golf-drive-end', at: end, streets: ['golf-drive', 'golf-drive-turn'], lights: false },
    ],
  };
}
