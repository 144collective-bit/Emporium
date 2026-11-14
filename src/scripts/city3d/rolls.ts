/*
 * Gentle rolls in the open land outside the town (docs/blend-plan.md Phase 4; DOM-free, tested in
 * tests/rolls.test.ts): low swells and dips, a metre or two at most, on the land outside the ring highway, flat
 * (exactly 0) under and round everything that stands there today.
 *
 * The heights live on a lattice (`ROLL.cell` apart, on the world's own grid, so a tile of 30 holds two cells either
 * way). Between its points the ground is the two triangles of each cell, split from its low corner (x, z) to its high
 * one (`rollsAt()`), the way world.ts draws it, so what you walk and drive on is exactly what's drawn; any finer grid
 * laid on the lattice (desktop's ground) draws the very same surface.
 *
 * A point's height is a few fixed waves (`shape()`, the same for everyone and whatever the world's size) times its
 * share: 0 wherever anything the outskirts' trees keep off (landuse.ts `KEEPS`: every street, block, district, the
 * airport, the river, the metro, the verges), the land inside the highway, the hills' land or the world's edge comes
 * within `ROLL.clear` of it (so every triangle touching any of them is flat), rising over `ROLL.ramp` past that.
 * Working that out asks the clearing rule all over the world, so it's baked when the site is built (`baked()` key
 * `rolls`, a digit a point) and only made when first asked for.
 */
import { EXT } from './layout';
import { insideHighway } from './highway';
import { keptOff } from './landuse';
import { TERRAIN_RECT } from './hills';
import { SOUTH_GROUND_RECT } from './southground';
import { BUILT, baked } from './baked';

export const ROLL = {
  /** The lattice: its points this far apart (a tile of 30 is two cells either way) */
  cell: 15,
  /** The highest swell and the deepest dip (tiles: 1 is about 1.8 m) */
  up: 1,
  down: 0.45,
  /** How fine the clearing rule is asked over to find how far a lattice point is from what's kept clear */
  raster: 3,
  /** A lattice point within this of anything kept is 0: every triangle it's a corner of stays flat (a cell's
   * diagonal, and two of the raster's steps for what lies between the points it asked) */
  clear: 15 * Math.SQRT2 + 2 * 3,
  /** Past `clear` the rolls rise to their full height over this */
  ramp: 30,
  /** The steps a point's share is kept in (the bake's digits) */
  levels: 9,
} as const;

/** The waves the rolls are made of: amplitude (they sum to 1), direction (radians), wavelength (tiles), phase */
const WAVES: [number, number, number, number][] = [
  [0.42, 0.4, 170, 0.7],
  [0.3, 1.9, 112, 2.3],
  [0.18, 2.8, 74, 4.4],
  [0.1, 0.95, 47, 1.1],
];
/** The rolls' own shape at a point, before its share: swells to `up`, dips to `down` */
export function shape(x: number, z: number) {
  let n = 0;
  for (const [a, dir, len, ph] of WAVES) n += a * Math.sin(((Math.cos(dir) * x + Math.sin(dir) * z) / len) * Math.PI * 2 + ph);
  return n > 0 ? n * ROLL.up : n * ROLL.down;
}

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ---------- The share at each lattice point ---------- */

/** The lattice's points: i from `I0`, j from `J0`, `N` either way (the world's land, a point past each edge) */
const L = ROLL.cell;
const I0 = Math.floor(EXT[0] / L) - 1;
const N = Math.ceil(EXT[1] / L) + 1 - I0 + 1;
const J0 = I0;

/** Whether anything is kept clear at x, z: the clearing rule, the land inside the highway, the hills' land, past the edge */
function kept(x: number, z: number) {
  if (x < EXT[0] || x > EXT[1] || z < EXT[0] || z > EXT[1]) return true;
  if (x > TERRAIN_RECT[0] && x < TERRAIN_RECT[2] && z > TERRAIN_RECT[1] && z < TERRAIN_RECT[3]) return true;
  // (and the south's rolling ground, its own shape: southground.ts)
  if (x > SOUTH_GROUND_RECT[0] && x < SOUTH_GROUND_RECT[2] && z > SOUTH_GROUND_RECT[1] && z < SOUTH_GROUND_RECT[3]) return true;
  return insideHighway(x, z) || keptOff(x, z) !== null;
}

/** Each lattice point's share, a digit 0 to `ROLL.levels`, row by row (j), `N` to a row */
function makeShares(): string {
  const R = ROLL.raster;
  const reach = ROLL.clear + ROLL.ramp;
  // The clearing rule asked at the middle of every raster cell over the lattice's land (and `reach` past it)
  const x0 = I0 * L - reach;
  const span = (N - 1) * L + 2 * reach;
  const M = Math.ceil(span / R);
  const at = (a: number) => x0 + (a + 0.5) * R;
  const held = new Uint8Array(M * M);
  for (let b = 0; b < M; b++) for (let a = 0; a < M; a++) held[b * M + a] = kept(at(a), at(b)) ? 1 : 0;
  const k = Math.ceil(reach / R);
  let out = '';
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const [px, pz] = [(I0 + i) * L, (J0 + j) * L];
      const [ca, cb] = [Math.floor((px - x0) / R), Math.floor((pz - x0) / R)];
      // (the nearest kept cell's middle, out to `reach`)
      let best = reach * reach;
      for (let b = Math.max(0, cb - k); b <= Math.min(M - 1, cb + k); b++)
        for (let a = Math.max(0, ca - k); a <= Math.min(M - 1, ca + k); a++)
          if (held[b * M + a]) {
            const d2 = (at(a) - px) ** 2 + (at(b) - pz) ** 2;
            if (d2 < best) best = d2;
          }
      out += String(Math.round(smooth(ROLL.clear, reach, Math.sqrt(best)) * ROLL.levels));
    }
  return out;
}

/** Each lattice point's height (tiles), made the first time anything asks */
let heights: Float32Array | null = null;
function lattice() {
  if (heights) return heights;
  const shares = baked('rolls', BUILT ? undefined : makeShares);
  heights = new Float32Array(N * N);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const s = shares.charCodeAt(j * N + i) - 48;
      if (s > 0) heights[j * N + i] = (s / ROLL.levels) * shape((I0 + i) * L, (J0 + j) * L);
    }
  return heights;
}
/** The lattice point (i, j)'s height (0 off the lattice) */
function nodeY(h: Float32Array, i: number, j: number) {
  const [a, b] = [i - I0, j - J0];
  return a < 0 || b < 0 || a >= N || b >= N ? 0 : h[b * N + a];
}

/* ---------- The ground's height ---------- */

/** The rolls' height at x, z (tiles; exactly 0 under and round everything that stands today) */
export function rollsAt(x: number, z: number) {
  const h = lattice();
  const i = Math.floor(x / L);
  const j = Math.floor(z / L);
  const h00 = nodeY(h, i, j);
  const h10 = nodeY(h, i + 1, j);
  const h01 = nodeY(h, i, j + 1);
  const h11 = nodeY(h, i + 1, j + 1);
  if (h00 === 0 && h10 === 0 && h01 === 0 && h11 === 0) return 0;
  const u = x / L - i;
  const v = z / L - j;
  // (the cell's two triangles, split from its low corner to its high one: world.ts draws them the same way)
  return u >= v ? h00 + u * (h10 - h00) + v * (h11 - h10) : h00 + v * (h01 - h00) + u * (h11 - h01);
}

/** Whether a rectangle (x0, z0, x1, z1) has any rolls in it at all (its cells' corners): flat pieces of the ground stay one quad */
export function rollsIn(x0: number, z0: number, x1: number, z1: number) {
  const h = lattice();
  for (let j = Math.floor(z0 / L); j <= Math.ceil(z1 / L); j++) for (let i = Math.floor(x0 / L); i <= Math.ceil(x1 / L); i++) if (nodeY(h, i, j) !== 0) return true;
  return false;
}

/** Whether the ground rolls at x, z (cheaper than asking how high: walking's step down a slope) */
export const onRolls = (x: number, z: number) => rollsAt(x, z) !== 0;

/**
 * Which way the rolls rise at a point and how steeply (rise over run along x and z), over `e` either side: the
 * ground's shade asks over half a cell, so it changes smoothly across the lattice's lines
 */
export function rollGrad(x: number, z: number, e = 0.25): [number, number] {
  return [(rollsAt(x + e, z) - rollsAt(x - e, z)) / (2 * e), (rollsAt(x, z + e) - rollsAt(x, z - e)) / (2 * e)];
}
/** The rolls' slope at a point: rise over run, the steepest way (the trees set into it) */
export const rollSlope = (x: number, z: number) => Math.hypot(...rollGrad(x, z));

/**
 * Where a ray from `from` along `dir` (not normalised: `t` in its own lengths) first comes within `pad` of the rolls,
 * at most `t` (the walk camera keeps above them; shots stop on them). Only a ray that comes down below the highest
 * swell is marched, in steps of about `step` tiles.
 */
export function rollsAlong(from: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }, t: number, pad = 0.3, step = 0.8) {
  if (Math.min(from.y, from.y + dir.y * t) > ROLL.up + pad) return t;
  const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
  const steps = Math.min(400, Math.max(2, Math.ceil((t * len) / step)));
  let prev = 0;
  for (let k = 0; k <= steps; k++) {
    const s = (t * k) / steps;
    const y = from.y + dir.y * s;
    if (y < ROLL.up + pad && y < rollsAt(from.x + dir.x * s, from.z + dir.z * s) + pad) return k === 0 ? s : prev;
    prev = s;
  }
  return t;
}

/** The shares as the page carries them (tests/baked.test.ts) */
export const rollShares = () => makeShares();

// (a bake run, scripts/bake.mjs, records them now rather than when first asked for)
if ((globalThis as { __cityBake?: unknown }).__cityBake) lattice();
