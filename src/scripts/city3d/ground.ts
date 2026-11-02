/*
 * What the open ground is covered in (docs/blend-plan.md Phase 2; DOM-free,
 * tested in tests/ground.test.ts): `coverAt(x, z)` is a mix of the palette's
 * covers (palette.ts `COVER`) for the ground under a point, which world.ts
 * paints onto the ground's own vertices (`buildGround()`): no texture, no
 * new draw.
 *
 * The open land is rough grass with patches of meadow and of dry grass from
 * a large, smooth seeded noise. Round each district its ground takes after
 * it (`INFLUENCES`): worn grass and bare dirt by The Trenches, gravel and dry
 * grass by the Docks and the airport, dry grass by Sunridge's desert yards,
 * Crestmont and along the highway's verges, lawn round the park, the town,
 * Uptown, the mall, the stadium and the kart park, lusher grass down by the
 * river, and a worn verge along every street. Each fades out over its reach
 * with a wobbled distance (no edge anywhere), most of the way at its
 * `strength`, so the open land between districts carries a little of both.
 */
import { COVER, type Cover } from './palette';
import { PLAN, type Pt } from './streetplan';
import { HIGHWAY_HALF, fromHighway } from './highway';
import { RIVER } from './layout';
import { TOWN_BOX, noise } from './landuse';
import { TRENCH_RECT } from './trenches';
import { DOCKS_RECT } from './docks';
import { AIRPORT_AREAS } from './airfield';
import { SUNRIDGE_RECT } from './sunridge';
import { CREST_RECT } from './crestmont';
import { WESTLAKE_RECT } from './westlake';
import { UPTOWN_RECT } from './uptown';
import { MALL_AREA } from './mall';
import { STADIUM_RECTS } from './stadium';
import { KART_RECTS } from './kartfacility';
import { TILE, tileKey, type Rect } from './tiles';
import { inTrenches } from './trenches';
import { inSunridge } from './sunridge';
import { inTown } from './outer';
import { BUILT_UP } from './bounds';

/** A mix of covers: each cover's share, the shares summing to 1 */
export type Mix = Partial<Record<Cover, number>>;

/** The open land's own patches: meadow and dry grass where a large noise (`cell` across) is high, up to `most` of the ground */
export const PATCHES = {
  meadow: { cell: 70, from: 0.55, to: 0.72, most: 0.55 },
  dryGrass: { cell: 95, from: 0.6, to: 0.78, most: 0.45 },
} as const;

/** How far a district's ground reaches (tiles) wobbles by up to this share of it */
export const REACH_WOBBLE = 0.35;

export interface Influence {
  id: string;
  cover: Cover;
  /** How far out it reaches (tiles) */
  reach: number;
  /** At most this much of the ground's colour, at the district's edge */
  strength: number;
  /** The box it reaches over (for filing it by tile) */
  box: Rect;
  /** How far x, z is outside what it surrounds (0 inside) */
  dist(x: number, z: number): number;
}

const rectDist = (r: Rect) => (x: number, z: number) => Math.hypot(Math.max(r[0] - x, 0, x - r[2]), Math.max(r[1] - z, 0, z - r[3]));
const around = (id: string, r: Rect, cover: Cover, reach: number, strength: number): Influence => ({
  id,
  cover,
  reach,
  strength,
  box: [r[0] - reach, r[1] - reach, r[2] + reach, r[3] + reach],
  dist: rectDist(r),
});
/** A line's worn verge: `half` its paved half-width; one influence the whole line, measured to its nearest stretch (so a curve's stretches don't add up) */
function verge(id: string, pts: readonly Pt[], half: number, cover: Cover, reach: number, strength: number): Influence {
  const m = half + reach;
  const xs = pts.map((p) => p[0]);
  const zs = pts.map((p) => p[1]);
  return {
    id,
    cover,
    reach,
    strength,
    box: [Math.min(...xs) - m, Math.min(...zs) - m, Math.max(...xs) + m, Math.max(...zs) + m],
    dist: (x, z) => {
      let best = Infinity;
      for (let i = 1; i < pts.length; i++) {
        const [a, b] = [pts[i - 1], pts[i]];
        const vx = b[0] - a[0];
        const vz = b[1] - a[1];
        const l2 = vx * vx + vz * vz;
        const t = l2 ? Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l2)) : 0;
        const dx = x - a[0] - vx * t;
        const dz = z - a[1] - vz * t;
        best = Math.min(best, dx * dx + dz * dz);
      }
      return Math.max(0, Math.sqrt(best) - half);
    },
  };
}
const SKY: Rect = [-1e5, -1e5, 1e5, 1e5];

/** Round what, in which cover, how far and how much; later ones over earlier ones */
export const INFLUENCES: Influence[] = [
  // Every street's verge, worn a little (the highway's, drier and wider)
  ...PLAN.streets.filter((s) => s.kind !== 'highway').map((s) => verge(`street:${s.id}`, s.loop ? [...s.pts, s.pts[0]] : s.pts, s.half, 'worn', 4, 0.35)),
  { id: 'highway', cover: 'dryGrass', reach: 9, strength: 0.6, box: SKY, dist: (x, z) => Math.max(0, fromHighway(x, z) - HIGHWAY_HALF) },
  // The town, the park, Uptown, the mall, the stadium and the kart park: lawn round them
  around('town', TOWN_BOX, 'lawn', 12, 0.45),
  around('westlake', WESTLAKE_RECT, 'lawn', 16, 0.6),
  around('uptown', UPTOWN_RECT, 'lawn', 10, 0.45),
  around('mall', MALL_AREA, 'lawn', 10, 0.4),
  ...STADIUM_RECTS.map((r, i) => around(`stadium-${i}`, r, 'lawn', 12, 0.45)),
  ...KART_RECTS.map((r, i) => around(`karts-${i}`, r, 'lawn', 14, 0.5)),
  // Sunridge's desert yards and Crestmont's dry hills: dry grass round them
  around('sunridge', SUNRIDGE_RECT, 'dryGrass', 16, 0.55),
  around('crestmont', CREST_RECT, 'dryGrass', 22, 0.5),
  // The airport's mown, sun-dried grass, and the Docks' gravel and dry grass
  ...AIRPORT_AREAS.map((r, i) => around(`airport-${i}`, r, 'dryGrass', 30, 0.55)),
  around('docks', DOCKS_RECT, 'dryGrass', 28, 0.45),
  around('docks-yard', DOCKS_RECT, 'gravel', 9, 0.6),
  // The Trenches: worn grass, bare dirt at its edge
  around('trenches', TRENCH_RECT, 'worn', 20, 0.5),
  around('trenches-edge', TRENCH_RECT, 'bare', 6, 0.4),
  // Lusher by the river (its banks are the river's own, river.ts; this is the grass running down to them)
  { id: 'river', cover: 'bank', reach: 10, strength: 0.6, box: [SKY[0], RIVER[0] - 10, SKY[2], RIVER[1] + 10], dist: (_x, z) => Math.max(0, RIVER[0] - z, z - RIVER[1]) },
];

const BY_TILE = new Map<string, Influence[]>();
for (const f of INFLUENCES) {
  if (f.box === SKY || f.box[0] < -1e4) continue;
  const [i0, j0, i1, j1] = [Math.floor(f.box[0] / TILE), Math.floor(f.box[1] / TILE), Math.floor(f.box[2] / TILE), Math.floor(f.box[3] / TILE)];
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++) {
      const key = tileKey(i, j);
      (BY_TILE.get(key) ?? BY_TILE.set(key, []).get(key)!).push(f);
    }
}
/** The influences everywhere (the highway's, the river's) */
const EVERYWHERE = INFLUENCES.filter((f) => f.box === SKY || f.box[0] < -1e4);
const MERGED = new Map<string, Influence[]>();
/** The influences that can reach x, z, in their order (each tile's list merged with the ones everywhere, once) */
export function influencesNear(x: number, z: number): Influence[] {
  const key = tileKey(Math.floor(x / TILE), Math.floor(z / TILE));
  let list = MERGED.get(key);
  if (!list) MERGED.set(key, (list = [...(BY_TILE.get(key) ?? []), ...EVERYWHERE].sort((a, b) => INFLUENCES.indexOf(a) - INFLUENCES.indexOf(b))));
  return list;
}

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
/** A large patch noise, 0-1 (landuse.ts's noise stretched to `cell` and moved off the wobble's lattice) */
const patch = (x: number, z: number, cell: number, k: number) => noise((x * 14) / cell + k * 311, (z * 14) / cell - k * 173);

/** The open land's own mix at x, z: rough grass with patches of meadow and dry grass */
export function openMix(x: number, z: number): Mix {
  const m = PATCHES.meadow;
  const d = PATCHES.dryGrass;
  const meadow = m.most * smooth((patch(x, z, m.cell, 1) - m.from) / (m.to - m.from));
  const dry = d.most * smooth((patch(x, z, d.cell, 2) - d.from) / (d.to - d.from)) * (1 - meadow);
  return { rough: 1 - meadow - dry, meadow, dryGrass: dry };
}

/** How much of an influence there is at x, z (0-1): its strength at its edge, easing to none at its (wobbled) reach */
export function influenceAt(f: Influence, x: number, z: number) {
  const d = f.dist(x, z);
  // (out of its reach however it wobbles: no noise asked for)
  if (d >= f.reach * (1 + REACH_WOBBLE)) return 0;
  const reach = f.reach * (1 - REACH_WOBBLE + 2 * REACH_WOBBLE * patch(x, z, 26, 3));
  return f.strength * smooth(1 - d / reach);
}

/** What the ground at x, z is covered in: the open land's mix, each influence laid over it in turn */
export function coverAt(x: number, z: number): Mix {
  const mix: Mix = openMix(x, z);
  for (const f of influencesNear(x, z)) {
    const k = influenceAt(f, x, z);
    if (k <= 0) continue;
    for (const c in mix) mix[c as Cover]! *= 1 - k;
    mix[f.cover] = (mix[f.cover] ?? 0) + k;
  }
  return mix;
}

/** Each cover's colour, sRGB 0-1 */
const RGB = Object.fromEntries(
  Object.entries(COVER).map(([k, hex]) => {
    const h = parseInt(hex.slice(1), 16);
    return [k, [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]];
  })
) as Record<Cover, [number, number, number]>;

/** A mix as one colour, in sRGB 0-1 (the covers' colours weighed) */
export function mixColour(mix: Mix, out: [number, number, number] = [0, 0, 0]): [number, number, number] {
  out[0] = out[1] = out[2] = 0;
  for (const c in mix) {
    const w = mix[c as Cover]!;
    const rgb = RGB[c as Cover];
    out[0] += w * rgb[0];
    out[1] += w * rgb[1];
    out[2] += w * rgb[2];
  }
  return out;
}

/** The ground's colour at x, z, sRGB 0-1: `mixColour(coverAt(x, z))` worked out straight (it's asked for every vertex of the ground) */
export function colourAt(x: number, z: number, out: [number, number, number] = [0, 0, 0]): [number, number, number] {
  const m = PATCHES.meadow;
  const d = PATCHES.dryGrass;
  const meadow = m.most * smooth((patch(x, z, m.cell, 1) - m.from) / (m.to - m.from));
  const dry = d.most * smooth((patch(x, z, d.cell, 2) - d.from) / (d.to - d.from)) * (1 - meadow);
  const rough = 1 - meadow - dry;
  for (let i = 0; i < 3; i++) out[i] = rough * RGB.rough[i] + meadow * RGB.meadow[i] + dry * RGB.dryGrass[i];
  for (const f of influencesNear(x, z)) {
    const k = influenceAt(f, x, z);
    if (k <= 0) continue;
    const c = RGB[f.cover];
    for (let i = 0; i < 3; i++) out[i] += (c[i] - out[i]) * k;
  }
  return out;
}

/* ---------- The ground's grid ---------- */

/** How far apart the ground's vertices are near the city (phones: twice), out past `FAR` from it, and under a district */
export const GRID = { near: 5, far: 15, farFrom: 60 } as const;
/** What the districts cover with their own blocks and lots (the ground under them is hidden: one quad does): each a box, and a test inside it */
const inR = (r: Rect) => (x: number, z: number) => x > r[0] && x < r[2] && z > r[1] && z < r[3];
const COVERED: [Rect, (x: number, z: number) => boolean][] = [
  [TOWN_BOX, (x, z) => inTown([x, z])],
  [TRENCH_RECT, (x, z) => inTrenches(x, z)],
  [SUNRIDGE_RECT, (x, z) => inSunridge(x, z, 0)],
  ...[UPTOWN_RECT, WESTLAKE_RECT, MALL_AREA, DOCKS_RECT].map((r): [Rect, (x: number, z: number) => boolean] => [r, inR(r)]),
];
const FAR: Rect = [BUILT_UP[0] - GRID.farFrom, BUILT_UP[1] - GRID.farFrom, BUILT_UP[2] + GRID.farFrom, BUILT_UP[3] + GRID.farFrom];

/**
 * How far apart a piece of the ground's vertices are (Infinity: one quad): one quad where a district covers it all
 * (3 x 3 points in it all under one), `far` out past `GRID.farFrom` from the city (the open land's patches change
 * slowly), `near` (twice on phones) where the districts' ground fades into the open land's
 */
export function groundStep(x0: number, z0: number, x1: number, z1: number, low: boolean) {
  const pts: Pt[] = [];
  for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) pts.push([x0 + ((x1 - x0) * i) / 2, z0 + ((z1 - z0) * j) / 2]);
  if (COVERED.some(([r, has]) => x0 >= r[0] && x1 <= r[2] && z0 >= r[1] && z1 <= r[3] && pts.every(([x, z]) => has(x, z)))) return Infinity;
  if (x1 < FAR[0] || x0 > FAR[2] || z1 < FAR[1] || z0 > FAR[3]) return GRID.far;
  return GRID.near * (low ? 2 : 1);
}
