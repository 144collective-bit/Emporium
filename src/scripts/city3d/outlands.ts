/*
 * The Outlands (docs/outlands-plan.md, Phase 0): the land past Sector 7's
 * wall, as rules. DOM-free and free of scene objects (tested in
 * tests/outlands.test.ts), so the game server can ask the same questions
 * when multiplayer comes.
 *
 * - The Outlands is a map of its own, loaded instead of the city's: its
 *   numbers are its own (tiles, as the city's: about 1.8 m), centred on 0, and
 *   nothing here reads the city's `EXT` or the wall.
 * - The land is one seeded height map (`heightAt()`): rolling hills, a
 *   shallow river winding west to east (waded across anywhere), a deep lake
 *   (not), and mountains rising round the edge where walking stops
 *   (`WALK_LIMIT`). The same seed gives the same land everywhere, always.
 * - It's drawn in square chunks (`CHUNK`), each at a level of detail by how
 *   far it is (`chunksAround()`); the view builds and lets go of them.
 */

/** The chunks a side, and their size (tiles): 17 x 256 is 4,352 tiles, about 7.8 km across */
export const CHUNKS = 17;
export const CHUNK = 256;
export const SIZE = CHUNKS * CHUNK;
export const HALF = SIZE / 2;
/** Where walking stops, from the middle on each axis (the mountains at the edge are past it) */
export const WALK_LIMIT = HALF - 140;
/** The land's seed: the same land for everyone */
export const SEED = 7319;

/** The water's surface, and the deepest water Degen wades through (the river is shallower; the lake is deep) */
export const WATER_Y = 0;
export const WADE = 0.45;

/** The lake (the land dips to its bed inside `r`, back up by `shore`) */
export const LAKE = { x: 700, z: -1350, r: 190, shore: 330, depth: 3.6 };
/** The river: its water `half` wide either side of its line, its bed `bed` under the water, its valley `valley` wide */
export const RIVER = { half: 13, bed: 0.3, valley: 150 };

/** Where a new run starts: on dry land in the south-west, facing north-east */
export const SPAWN = { x: -1500, z: 900, yaw: Math.PI * 0.8 };

/**
 * The levels of detail: the spacing of a chunk's height grid (tiles) and how far (to the chunk's nearest point)
 * each is used; past the last, nothing is drawn. Phones (`low`) draw coarser and less far
 */
export const LODS = {
  high: { steps: [2, 4, 8, 16], within: [260, 620, 1050, 1350] },
  low: { steps: [4, 8, 16, 32], within: [180, 420, 700, 760] },
} as const;
export type LodTier = keyof typeof LODS;

/* ---------- Seeded noise ---------- */

/** A whole-number hash of a lattice point to 0..1 (no Math.random: the same everywhere) */
function hash(ix: number, iz: number, s: number) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(s + SEED, 1440662683);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** Smooth value noise, -1..1, one lattice cell per unit */
export function noise(x: number, z: number, s: number) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const u = fade(x - ix);
  const v = fade(z - iz);
  const a = hash(ix, iz, s);
  const b = hash(ix + 1, iz, s);
  const c = hash(ix, iz + 1, s);
  const d = hash(ix + 1, iz + 1, s);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** A soft max (no crease where the land levels off) */
const smax = (a: number, b: number, k: number) => {
  const h = Math.max(0, k - Math.abs(a - b)) / k;
  return Math.max(a, b) + h * h * k * 0.25;
};

/* ---------- The land ---------- */

/** The river's line: its z at x */
export const riverZ = (x: number) => -200 + 420 * Math.sin(x / 830 + 0.6) + 150 * Math.sin(x / 310 + 2.1);

/** The rolling hills alone (tiles over the water), before the river, the lake and the edge */
function hills(x: number, z: number) {
  const h = 4 + (noise(x / 900, z / 900, 1) + 1) * 19 + noise(x / 260, z / 260, 2) * 9 + noise(x / 75, z / 75, 3) * 2.2 + noise(x / 22, z / 22, 4) * 0.4;
  // (the low ground levels off over the water rather than dipping under it: only the river and the lake are wet)
  return smax(h, 1.6, 3);
}

/** A bank `d` out from the water's edge: rising gently (`rise` a tile) and easing into the land `h` by `w` out */
const valley = (h: number, d: number, w: number, rise: number) => {
  const low = Math.min(h, WATER_Y + d * rise);
  return low + (h - low) * smooth(0, w, d);
};

/** How far into the mountains at the edge (0 inside, 1 at the edge) */
const edgeOf = (x: number, z: number) => smooth(HALF - 330, HALF - 10, Math.max(Math.abs(x), Math.abs(z)));

/** The ground's height at (x, z): the land, with the river's valley, the lake's basin and the mountains round the edge */
export function heightAt(x: number, z: number) {
  let h = hills(x, z);
  // The river: its valley easing down to the water's edge, then a shallow bed (down `bed` within a few tiles)
  const d = Math.abs(z - riverZ(x));
  if (d < RIVER.half) h = WATER_Y - RIVER.bed * Math.min(1, (RIVER.half - d) / 3);
  else if (d < RIVER.valley) h = valley(h, d - RIVER.half, RIVER.valley - RIVER.half, 0.08);
  // The lake: a bowl down to its bed, its shore easing up to the land
  const l = Math.hypot(x - LAKE.x, z - LAKE.z);
  if (l < LAKE.r) h = Math.min(h, WATER_Y - LAKE.depth * (1 - (l / LAKE.r) ** 2));
  else if (l < LAKE.shore) h = Math.min(h, valley(h, l - LAKE.r, LAKE.shore - LAKE.r, 0.05));
  // The mountains round the edge (the river runs on out between them, through a gorge)
  const e = edgeOf(x, z) * smooth(RIVER.half, RIVER.half + 260, d);
  if (e > 0) h += e * Math.sqrt(e) * 95 + e * (noise(x / 140, z / 140, 5) + 1) * 14;
  return h;
}

/** How deep the water is at (x, z) (0 on dry land) */
export const waterDepth = (x: number, z: number) => Math.max(0, WATER_Y - heightAt(x, z));

/** Inside the walking limit */
export const inBounds = (x: number, z: number) => Math.abs(x) <= WALK_LIMIT && Math.abs(z) <= WALK_LIMIT;

/** Somewhere Degen can stand: inside the limit and no deeper in the water than he wades */
export const walkable = (x: number, z: number) => inBounds(x, z) && waterDepth(x, z) <= WADE;

/** The ground's slope at (x, z) (rise over run), from a step either side */
export function slopeAt(x: number, z: number, e = 1) {
  const dx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e);
  const dz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
  return Math.hypot(dx, dz);
}

/* ---------- Chunks ---------- */

/** A chunk's corner (its smallest x and z) */
export const chunkX = (i: number) => -HALF + i * CHUNK;

/** The chunk a point is in (clamped to the map) */
export const chunkOf = (v: number) => Math.min(CHUNKS - 1, Math.max(0, Math.floor((v + HALF) / CHUNK)));

/** How far (x, z) is from the nearest point of chunk (i, j) */
export function chunkDist(i: number, j: number, x: number, z: number) {
  const x0 = chunkX(i);
  const z0 = chunkX(j);
  const dx = Math.max(x0 - x, 0, x - (x0 + CHUNK));
  const dz = Math.max(z0 - z, 0, z - (z0 + CHUNK));
  return Math.hypot(dx, dz);
}

export interface ChunkWant {
  i: number;
  j: number;
  /** Its level of detail (an index into the tier's `steps`) */
  lod: number;
  dist: number;
}

/** The chunks to draw round (x, z), nearest first, each at its level of detail */
export function chunksAround(x: number, z: number, tier: LodTier = 'high'): ChunkWant[] {
  const { within } = LODS[tier];
  const reach = within[within.length - 1];
  const out: ChunkWant[] = [];
  const i0 = chunkOf(x - reach);
  const i1 = chunkOf(x + reach);
  const j0 = chunkOf(z - reach);
  const j1 = chunkOf(z + reach);
  for (let i = i0; i <= i1; i++)
    for (let j = j0; j <= j1; j++) {
      const dist = chunkDist(i, j, x, z);
      const lod = within.findIndex((w) => dist <= w);
      if (lod >= 0) out.push({ i, j, lod, dist });
    }
  return out.sort((a, b) => a.dist - b.dist);
}

/** A chunk's key, with its level of detail */
export const chunkKey = (c: { i: number; j: number; lod: number }) => `${c.i},${c.j},${c.lod}`;
