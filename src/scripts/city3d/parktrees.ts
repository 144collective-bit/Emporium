/*
 * Westlake Park's planting as redesigned (docs/westlake-plan.md Phase 5; DOM-free, tested in tests/parktrees.test.ts).
 * Worked out at the build (baked). Out of the boot (the owner's call: the trees come with the park's chunk, westlake3d.ts, drawn by parktrees3d.ts), so
 * nothing in the boot reads them: the boot's things (the ring street's trees, the picnics, the planters, the beds, the
 * benches and lamps) stand where they stand and the trees keep off them.
 *
 * - `PARK_TREES`: elms in avenues along the promenade and the Mall north of the garden; groves of oaks and planes
 *   across the lawns where a slow noise is high, glades where it's low; a denser wood round the ramble north-east of
 *   the lake, oaks among pines; pines towards the highway; willows by the water, between its rim and the loop, leaning
 *   out over it (`lean`, the way to the water).
 * - `SHRUBS`: shrub beds just inside the park's wall, in clumps of uneven length, breaking its straight line.
 * - `REEDS`, `LILIES`: reeds at the embankment's foot in the coves and up the arm, lily pads on the water off them.
 */
import { BENCHES, BIG, BOATHOUSE, GARDEN_SITE, JETTY, LAKE_ARM, LAKE_C, LAKE_COVES, MALL, PARK_LAMPS, PROMENADE_HALF, RIM, Z0, inPark, inset, lakeAt, lakeDist, lakeLine, nearTerrace, onBridge, onGrand, onLawn, onOverlook, onPath, treeFree, type Pt } from './westlake';
import { HALL } from './civic';
import { BUILT, baked } from './baked';
import { MALL_BEDS, PLANTERS, WALL } from './gardens';
import { PICNICS } from './parklife';
import { PARK_EDGE_TREES } from './ringstreet';

export type TreeKind = 'elm' | 'oak' | 'plane' | 'willow' | 'pine';
export interface ParkTree {
  x: number;
  z: number;
  /** Its size (1: a tile-high round tree's) */
  s: number;
  kind: TreeKind;
  /** A willow's lean: the way out over the water (radians, from +x towards +z); 0 for the rest */
  lean: number;
  /** Left out on phones (the trim: every other one in the groves and the wood) */
  clump: boolean;
}

/** A seeded generator (the same park for everyone) */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** A slow smooth noise (0..1) */
function noise(x: number, z: number) {
  const h = (i: number, j: number) => {
    const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const [i, j] = [Math.floor(x), Math.floor(z)];
  const [u, v] = [x - i, z - j];
  const [a, b, c, d] = [h(i, j), h(i + 1, j), h(i, j + 1), h(i + 1, j + 1)];
  const [su, sv] = [u * u * (3 - 2 * u), v * v * (3 - 2 * v)];
  return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
}

/** To the centimetre (what's baked stays small) */
const cm = (v: number) => Math.round(v * 100) / 100;

/** The ramble's wood: north-east of the lake, off the Great Lawn */
const inWood = (p: Pt) => p[0] > -82 && p[1] < -86 && !onLawn(p, -3);
/** Clear of what stands in the park already (the boot's): picnics, planters, beds, benches, lamps, the ring's edge trees */
function clearOfThings(p: Pt, m: number) {
  if (PICNICS.some((q) => Math.hypot(q.at[0] - p[0], q.at[1] - p[1]) < 3 + m)) return false;
  if (PLANTERS.some((q) => Math.hypot(q.at[0] - p[0], q.at[1] - p[1]) < q.r + 0.9 + m)) return false;
  if (MALL_BEDS.some((r) => p[0] > r[0] - 0.8 - m && p[0] < r[2] + 0.8 + m && p[1] > r[1] - 0.8 - m && p[1] < r[3] + 0.8 + m)) return false;
  if (BENCHES.some((b) => Math.hypot(b.at[0] - p[0], b.at[1] - p[1]) < 1.1 + m)) return false;
  if (PARK_LAMPS.some(([x, z]) => Math.hypot(x - p[0], z - p[1]) < 1.1 + m)) return false;
  return PARK_EDGE_TREES.every(([x, z]) => Math.hypot(x - p[0], z - p[1]) > 2.2 + m);
}

export const PARK_TREES: ParkTree[] = baked('park-trees', BUILT ? undefined : () => {
  const r = rng(5150);
  const out: ParkTree[] = [];
  const put = (x: number, z: number, s: number, kind: TreeKind, clump: boolean, gap = 2.4, lean = 0) => {
    const p: Pt = [x, z];
    if (kind !== 'willow' && !treeFree(p)) return;
    if (!clearOfThings(p, 0)) return;
    if (out.some((t) => Math.hypot(t.x - x, t.z - z) < Math.max(gap, (t.s + s) * 1.05))) return;
    out.push({ x: cm(x), z: cm(z), s: cm(s), kind, lean: cm(lean), clump });
  };
  // The avenues: elms either side of the promenade in two rows (as Phase 2 laid them), and either side of the Mall
  // north of the garden to the north gate
  for (let z = HALL.rear[1] - 2.25; z > GARDEN_SITE[3] + 1; z -= 4.5)
    for (const side of [-1, 1]) for (const o of [1.75, 4.7]) put(MALL.x + side * (PROMENADE_HALF + o), z, 1.2, 'elm', false, 2.2);
  for (let z = GARDEN_SITE[1] - 3; z > Z0 + 3; z -= 4.5) for (const side of [-1, 1]) put(MALL.x + side * (MALL.half + 1.8), z, 1.15, 'elm', false, 2.2);
  // Willows by the water: round the shore between the rim and the loop, leaning out over it, off everything there
  const shore = lakeLine(RIM.w + 1.4, 160);
  for (const [i, p] of shore.entries()) {
    if (i % 5 || r() < 0.35) continue;
    if (onPath(p, 0.9) || nearTerrace(p, 2.5) || onGrand(p[0], p[1], -3) || onOverlook(p[0], p[1], 2) || onBridge(p[0], p[1], -3)) continue;
    if (Math.abs(p[0] - JETTY.x) < 4 && p[1] > JETTY.z0 - 3 && p[1] < JETTY.z1 + 2) continue;
    if (p[0] > BOATHOUSE.rect[0] - 3 && p[0] < BOATHOUSE.rect[2] + 3 && p[1] > BOATHOUSE.rect[1] - 3 && p[1] < BOATHOUSE.rect[3] + 3) continue;
    const d = lakeDist(p[0], p[1]);
    if (d < 1.2 || d > 2.6) continue;
    // (the lean: towards the nearest water)
    const w = lakeLine(0, 360).reduce((b, q) => (Math.hypot(q[0] - p[0], q[1] - p[1]) < Math.hypot(b[0] - p[0], b[1] - p[1]) ? q : b));
    put(p[0], p[1], 1.25 + r() * 0.25, 'willow', false, 6, Math.atan2(w[1] - p[1], w[0] - p[0]));
  }
  // The wood round the ramble: denser, oaks among pines, smaller trees between
  for (let x = -82; x < -44; x += 2.6)
    for (let z = -158; z < -86; z += 2.6) {
      const [jx, jz] = [x + (r() - 0.5) * 2, z + (r() - 0.5) * 2];
      if (!inWood([jx, jz]) || r() < 0.25) continue;
      put(jx, jz, 0.85 + r() * 0.6, r() < 0.35 ? 'pine' : 'oak', true, 2.6);
    }
  // The groves across the lawns: big spreading oaks and planes where the noise is high, glades where it's low; pines
  // towards the highway
  for (let x = -200; x < -43; x += 3.6)
    for (let z = Z0; z < -9; z += 3.6) {
      const n = noise(x / 24, z / 24);
      if (n < 0.42 || r() > (n - 0.42) * 2.4) continue;
      const [jx, jz] = [x + (r() - 0.5) * 2.8, z + (r() - 0.5) * 2.8];
      if (inWood([jx, jz])) continue;
      const north = jx < -175 || jz < -145;
      const kind: TreeKind = north && r() < 0.6 ? 'pine' : r() < 0.55 ? 'oak' : 'plane';
      put(jx, jz, kind === 'pine' ? 0.9 + r() * 0.4 : 1.2 + r() * 0.7, kind, true, 3.4);
    }
  return out;
});

/** Shrub beds just inside the park's wall: clumps of uneven length along it, a gap between, round shrubs in each */
export interface ShrubBed {
  /** Its shrubs' middles and sizes */
  shrubs: { x: number; z: number; r: number }[];
}
export const SHRUBS: ShrubBed[] = baked('park-shrubs', BUILT ? undefined : () => {
  const r = rng(7717);
  const line = inset(BIG, WALL.in + 1.3);
  const out: ShrubBed[] = [];
  // (walking the line a step at a time: a bed of 3 to 9 steps, then a gap of 2 to 7)
  let cur: ShrubBed | null = { shrubs: [] };
  let left = 3 + Math.floor(r() * 7);
  for (let i = 0; i < line.length; i++) {
    const [a, c] = [line[i], line[(i + 1) % line.length]];
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const [nx, nz] = [-(c[1] - a[1]) / l, (c[0] - a[0]) / l];
    for (let t = 0; t < l; t += 1.1) {
      if (left-- <= 0) {
        if (cur) {
          out.push(cur);
          cur = null;
          left = 2 + Math.floor(r() * 6);
        } else {
          cur = { shrubs: [] };
          left = 3 + Math.floor(r() * 7);
        }
      }
      if (!cur) continue;
      const p: Pt = [a[0] + ((c[0] - a[0]) * t) / l, a[1] + ((c[1] - a[1]) * t) / l];
      if (!inPark(p, 0.6) || onPath(p, 1.1) || !clearOfThings(p, -0.4) || PARK_TREES.some((tr) => Math.hypot(tr.x - p[0], tr.z - p[1]) < 1.3)) continue;
      // (wandering in and out from the wall)
      const off = (r() - 0.5) * 1.2;
      cur.shrubs.push({ x: cm(p[0] + nx * off), z: cm(p[1] + nz * off), r: cm(0.5 + r() * 0.45) });
    }
  }
  if (cur) out.push(cur);
  return out.filter((b) => b.shrubs.length >= 2);
});

/** Reeds at the embankment's foot in the coves and up the arm (clumps' middles), lily pads on the water off them */
export const REEDS: Pt[] = baked('park-reeds', BUILT ? undefined : () => {
  const r = rng(3301);
  const out: Pt[] = [];
  const spots = [...LAKE_COVES.map((c) => c.a), Math.atan2(LAKE_ARM.line[2][1] - LAKE_C[1], LAKE_ARM.line[2][0] - LAKE_C[0])];
  const edge = lakeLine(-0.5, 480);
  for (const p of edge) {
    const a = Math.atan2(p[1] - LAKE_C[1], p[0] - LAKE_C[0]);
    const inCove = spots.some((s) => Math.abs(Math.atan2(Math.sin(a - s), Math.cos(a - s))) < 0.18);
    const inArm = p[1] < -78 && p[0] > -82;
    if (!(inCove || inArm) || r() < 0.55) continue;
    if (onBridge(p[0], p[1], -2) || nearTerrace(p, 2) || onGrand(p[0], p[1], -2)) continue;
    out.push([cm(p[0]), cm(p[1])]);
  }
  return out;
});
export const LILIES: { x: number; z: number; r: number; flower: boolean }[] = baked('park-lilies', BUILT ? undefined : () => {
  const r = rng(9091);
  const out: { x: number; z: number; r: number; flower: boolean }[] = [];
  for (const p of REEDS) {
    if (r() < 0.5) continue;
    // (a little out from the reeds, over the water)
    const w = lakeAt(Math.atan2(p[1] - LAKE_C[1], p[0] - LAKE_C[0]), -1.4 - r() * 1.6);
    if (lakeDist(w[0], w[1]) > -0.6) continue;
    out.push({ x: cm(w[0] + (r() - 0.5) * 0.8), z: cm(w[1] + (r() - 0.5) * 0.8), r: cm(0.22 + r() * 0.18), flower: r() < 0.3 });
  }
  return out;
});
