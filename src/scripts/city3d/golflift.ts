/*
 * The golf course's ground as the city stands on it (docs/golf-plan.md Phase 2; DOM-free, tested in
 * tests/golflift.test.ts). The course's own shape (golfground.ts) is worked out once, when the site is built (`baked()`
 * key `golf-ground`), on a grid every `GOLF_STEP`, and read back here: the boot never carries the course's code.
 *
 * - `golfLift()`: the ground's height over today's (0 off the course), each square of the grid two flat triangles,
 *   split from its low corner (x, z) to its high one, as world.ts draws it (`golfPlane()`) and the rolls are split, so
 *   what's drawn is what's walked on (terrain.ts `heightAt()` reads it).
 * - `golfLand()`: what the land is at a point: off the course (0), its native grass between the holes, where the
 *   outskirts' trees may stand (1), or in play (2: a hole's rough, fairway, green or tee, a bunker, the water, the
 *   grounds); the clearing rule (landuse.ts) and the ground's paint (ground.ts) read it.
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
export function packGolf(heightAt: (x: number, z: number) => number, landAt: (x: number, z: number) => 0 | 1 | 2, water: number[]): GolfGrid {
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
/** What the land is at x, z (its nearest grid point): 0 off the course, 1 its native grass, 2 in play */
export function golfLand(x: number, z: number): 0 | 1 | 2 {
  if (!onGolfGrid(x, z)) return 0;
  const i = Math.round((x - G.x0) / G.step);
  const j = Math.round((z - G.z0) / G.step);
  if (i < 0 || j < 0 || i >= G.nx || j >= G.nz) return 0;
  return M()[j * G.nx + i] as 0 | 1 | 2;
}
/** How far the land's fields blur its edges (grid points either way) */
const BLUR = 3;
const fields: Partial<Record<1 | 2, Float32Array>> = {};
/** The share of the land round each grid point that's at least `kind` (1: the course's land, 2: in play), blurred */
function field(kind: 1 | 2) {
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
/** How much of the land round x, z is the course's (`kind` 1) or in play (2), 0 to 1, blurred over a few tiles: the
 * ground's paint eases from the open land's into the course's over it (ground.ts) */
export function golfShare(x: number, z: number, kind: 1 | 2) {
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
