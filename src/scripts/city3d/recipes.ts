/*
 * Recipes for blocks (docs/growth-plan.md Phase 4; DOM-free, seeded, tested
 * in tests/recipes.test.ts). A recipe says what a district's blocks are
 * filled with: its mix of building kits (kits.ts), how tall they get, how
 * often an alley breaks a row, rows of houses in yards, or one big kit to a
 * block. `layBlock()` lays it out on a block's outline, the land inside its
 * sidewalk: a row of buildings along every straight side that faces a
 * street (downtown's way: varied widths, a few set back, an alley every few,
 * bollards at its mouth), or the big kit filling the inside. Its buildings
 * come with their footprints (`lotSolids()`), so a district's collisions
 * come from the same recipe as its drawing.
 *
 * The same seed lays the same block, in the browser and on a server.
 */
import { SHOP_H, PARAPET, TOWER_FLOORS, insideBy, type Alley, type Face, type Pt, type Rect, type SignId } from './downtown';
import { KIT_SPEC, heightOf, lotSolids, type BigKit, type KitId, type Lot, type RowKit } from './kits';

export type RecipeId = 'midtown' | 'mainstreet' | 'terraces' | 'suburb' | 'warehouses' | 'factory' | 'school' | 'mall' | 'stadium' | 'works';

export interface Recipe {
  id: RecipeId;
  /** Row kits and how often each is picked */
  mix?: Partial<Record<RowKit, number>>;
  /** Rows of detached houses in their yards, not a street wall */
  houses?: boolean;
  /** One big kit filling the block's inside */
  big?: BigKit;
  /** How deep a row is, from the street back */
  depth: number;
  /** The tallest a row's buildings get, roof over the slab (offices and hotels up to `TOWER_FLOORS` where `towers` allows) */
  tall: number;
  /** How many offices and hotels a block may have rise past `tall` */
  towers: number;
  /** The chance of an alley after two or more buildings */
  alleys: number;
  /** The shop signs its shops take turns with (fixed copy from `SIGNS`) */
  signs: SignId[];
  /** What the block's ground is, round and behind the buildings */
  ground: 'paving' | 'grass' | 'concrete';
}

const SHOPS: SignId[] = ['noodles', 'records', 'laundry', 'pizza', 'mart', 'books', 'barber', 'tacos'];

export const RECIPES: Record<RecipeId, Recipe> = {
  // Tall and busy: shops, walk-ups, lofts, offices and hotels breaking the skyline
  midtown: { id: 'midtown', mix: { shop: 3, brownstone: 2, loft: 1.4, diner: 0.4, office: 1.2, hotel: 0.7 }, depth: 4.6, tall: 7.5, towers: 3, alleys: 0.5, signs: SHOPS, ground: 'paving' },
  // A high street: low shops and walk-ups, a diner
  mainstreet: { id: 'mainstreet', mix: { shop: 4, brownstone: 2.5, diner: 0.6, loft: 0.6 }, depth: 4.4, tall: 5.2, towers: 0, alleys: 0.45, signs: SHOPS, ground: 'paving' },
  // Rows of terraced houses, the odd walk-up and corner shop
  terraces: { id: 'terraces', mix: { terrace: 6, brownstone: 1, shop: 0.5 }, depth: 4.4, tall: 4.6, towers: 0, alleys: 0.3, signs: SHOPS, ground: 'grass' },
  // Detached houses in their yards
  suburb: { id: 'suburb', houses: true, depth: 6.4, tall: 4, towers: 0, alleys: 0, signs: [], ground: 'grass' },
  // Warehouses and old lofts along the streets
  warehouses: { id: 'warehouses', mix: { warehouse: 4, loft: 1.5 }, depth: 5.6, tall: 4.6, towers: 0, alleys: 0.25, signs: [], ground: 'concrete' },
  // One to a block
  factory: { id: 'factory', big: 'factory', depth: 0, tall: 0, towers: 0, alleys: 0, signs: [], ground: 'concrete' },
  school: { id: 'school', big: 'school', depth: 0, tall: 0, towers: 0, alleys: 0, signs: ['school'], ground: 'paving' },
  mall: { id: 'mall', big: 'mall', depth: 0, tall: 0, towers: 0, alleys: 0, signs: ['mall'], ground: 'concrete' },
  stadium: { id: 'stadium', big: 'stand', depth: 0, tall: 0, towers: 0, alleys: 0, signs: ['stadium'], ground: 'grass' },
  works: { id: 'works', big: 'crane', depth: 0, tall: 0, towers: 0, alleys: 0, signs: [], ground: 'concrete' },
};

/** The walk-only gap between buildings, and how far in its bollards stand */
export const ALLEY_W = 1.6;
const BOLLARD_IN = 0.3;
/** The narrowest building a row takes */
const MIN_W = 2.4;

/** A small, stable random generator (as downtown's) */
export function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Inside an outline (or on its edge) */
const inside = (poly: Pt[], [x, z]: Pt) => {
  const cx = poly.reduce((n, p) => n + p[0], 0) / poly.length;
  const cz = poly.reduce((n, p) => n + p[1], 0) / poly.length;
  // (nudged a hair towards the middle, so a point on the edge counts)
  return insideBy(poly, [x + (cx - x) * 1e-6 + Math.sign(cx - x) * 1e-6, z + (cz - z) * 1e-6 + Math.sign(cz - z) * 1e-6]);
};
const rectInside = (poly: Pt[], [x0, z0, x1, z1]: Rect) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].every((p) => inside(poly, p as Pt));
const overlap = (a: Rect, b: Rect) => Math.min(a[2], b[2]) - Math.max(a[0], b[0]) > 1e-6 && Math.min(a[3], b[3]) - Math.max(a[1], b[1]) > 1e-6;

/** A row along a street side: its strip, the face looking at the street, and its run along it */
interface Row {
  face: Face;
  /** The strip's fixed extent across (from the street back) */
  c0: number;
  c1: number;
  /** Its run along the street */
  a0: number;
  a1: number;
}
const alongX = (f: Face) => f === 'n' || f === 's';
const rowRect = (r: Row, a0 = r.a0, a1 = r.a1): Rect => (alongX(r.face) ? [a0, r.c0, a1, r.c1] : [r.c0, a0, r.c1, a1]);

/** The rows a block's straight sides take, longest first, trimmed to stay inside it and clear of each other */
export function rowsOf(poly: Pt[], depth: number): Row[] {
  const cx = poly.reduce((n, p) => n + p[0], 0) / poly.length;
  const cz = poly.reduce((n, p) => n + p[1], 0) / poly.length;
  const sides: Row[] = [];
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length];
    if (Math.abs(p[1] - q[1]) < 1e-6 && Math.abs(p[0] - q[0]) >= 5) {
      const z = p[1];
      const face: Face = z < cz ? 'n' : 's';
      sides.push({ face, c0: face === 'n' ? z : z - depth, c1: face === 'n' ? z + depth : z, a0: Math.min(p[0], q[0]), a1: Math.max(p[0], q[0]) });
    } else if (Math.abs(p[0] - q[0]) < 1e-6 && Math.abs(p[1] - q[1]) >= 5) {
      const x = p[0];
      const face: Face = x < cx ? 'w' : 'e';
      sides.push({ face, c0: face === 'w' ? x : x - depth, c1: face === 'w' ? x + depth : x, a0: Math.min(p[1], q[1]), a1: Math.max(p[1], q[1]) });
    }
  });
  sides.sort((p, q) => q.a1 - q.a0 - (p.a1 - p.a0));
  const rows: Row[] = [];
  for (const s of sides) {
    // Clear of the rows already laid (the corners go to the longer side)
    for (const r of rows) {
      const a = rowRect(s);
      const b = rowRect(r);
      if (!overlap(a, b)) continue;
      const [b0, b1] = alongX(s.face) ? [b[0], b[2]] : [b[1], b[3]];
      if (b0 <= s.a0 + 1e-6) s.a0 = Math.max(s.a0, b1);
      else if (b1 >= s.a1 - 1e-6) s.a1 = Math.min(s.a1, b0);
      else s.a1 = s.a0;
    }
    // Inside the block (a slanted side cuts the row short)
    while (s.a1 - s.a0 >= MIN_W && !rectInside(poly, rowRect(s, s.a0, s.a0 + 0.01))) s.a0 += 0.25;
    while (s.a1 - s.a0 >= MIN_W && !rectInside(poly, rowRect(s, s.a1 - 0.01, s.a1))) s.a1 -= 0.25;
    if (s.a1 - s.a0 >= MIN_W && rectInside(poly, rowRect(s))) rows.push(s);
  }
  return rows;
}

/** A plot pulled back from its street front by d */
function pull(b: Rect, face: Face, d: number): Rect {
  if (face === 'n') return [b[0], b[1] + d, b[2], b[3]];
  if (face === 's') return [b[0], b[1], b[2], b[3] - d];
  if (face === 'w') return [b[0] + d, b[1], b[2], b[3]];
  return [b[0], b[1], b[2] - d, b[3]];
}

/** The bollards across an alley's mouth (x, z), just in from the street front */
function mouth(face: Face, box: Rect): Pt[] {
  const [x0, z0, x1, z1] = box;
  const off = ALLEY_W * 0.32;
  if (face === 'n' || face === 's') {
    const m = (x0 + x1) / 2;
    const z = face === 'n' ? z0 + BOLLARD_IN : z1 - BOLLARD_IN;
    return [
      [m - off, z],
      [m + off, z],
    ];
  }
  const m = (z0 + z1) / 2;
  const x = face === 'w' ? x0 + BOLLARD_IN : x1 - BOLLARD_IN;
  return [
    [x, m - off],
    [x, m + off],
  ];
}

const pick = <T extends string>(r: () => number, weights: [T, number][]): T => {
  const total = weights.reduce((n, [, w]) => n + w, 0);
  let x = r() * total;
  for (const [k, w] of weights) if ((x -= w) < 0) return k;
  return weights[weights.length - 1][0];
};
const between = (r: () => number, [a, b]: [number, number]) => a + Math.floor(r() * (b - a + 1));

export interface Laid {
  lots: Lot[];
  alleys: Alley[];
}

/**
 * Lay a recipe on a block: `poly` is the land inside its sidewalk (convex,
 * its straight sides along x or z), `seed` makes it this block's own.
 */
export function layBlock(poly: Pt[], recipe: Recipe, seed: number): Laid {
  const r = rng(seed * 7919 + 17);
  const out: Laid = { lots: [], alleys: [] };
  let k = 0;
  const lot = (l: Omit<Lot, 'solids' | 'seed'>) => {
    const full: Lot = { ...l, seed: seed * 1000 + k++, solids: [] };
    full.solids = lotSolids(full);
    out.lots.push(full);
  };
  if (recipe.big) {
    // The big kit takes the inside, facing the longest street side
    const xs = poly.map((p) => p[0]);
    const zs = poly.map((p) => p[1]);
    let box: Rect = [Math.min(...xs) + 0.6, Math.min(...zs) + 0.6, Math.max(...xs) - 0.6, Math.max(...zs) - 0.6];
    while (!rectInside(poly, box) && box[2] - box[0] > 4) box = [box[0] + 0.25, box[1] + 0.25, box[2] - 0.25, box[3] - 0.25];
    const face = (rowsOf(poly, 1)[0]?.face ?? 's') as Face;
    const along = alongX(face) ? box[2] - box[0] : box[3] - box[1];
    // (a big kit's front faces its longer side; a deep block turns it to face along the long way)
    const f: Face = along >= (alongX(face) ? box[3] - box[1] : box[2] - box[0]) ? face : face === 'n' || face === 's' ? 'w' : 's';
    const spec = KIT_SPEC[recipe.big];
    const floors = between(r, spec.floors);
    lot({ box, h: heightOf(recipe.big, floors), face: f, type: recipe.big, floors, sign: recipe.signs[0], front: 0 });
    return out;
  }
  const counts = { towers: 0, diners: 0, signs: Math.floor(r() * 8) };
  for (const row of rowsOf(poly, recipe.depth)) {
    let a = row.a0;
    let since = 0;
    if (recipe.houses) {
      // Houses in their yards: a gap, a house, a gap...
      // (yards at the ends too: the next side's houses start round the corner)
      a += 1.3 + r() * 1.2;
      while (row.a1 - a >= KIT_SPEC.house.w[0] + 1.3) {
        const w = Math.min(KIT_SPEC.house.w[0] + r() * (KIT_SPEC.house.w[1] - KIT_SPEC.house.w[0]), row.a1 - a - 1.3);
        const floors = between(r, KIT_SPEC.house.floors);
        lot({ box: rowRect(row, a, a + w), h: heightOf('house', floors), face: row.face, type: 'house', floors, front: KIT_SPEC.house.front });
        a += w + 1.4 + r() * 1.6;
      }
      continue;
    }
    while (row.a1 - a >= MIN_W) {
      const left = row.a1 - a;
      // An alley between buildings, now and then (never first, never last)
      if (since >= 2 && left > MIN_W + ALLEY_W + 2.6 && r() < recipe.alleys) {
        const box = rowRect(row, a, a + ALLEY_W);
        out.alleys.push({ box, bollards: mouth(row.face, box) });
        a += ALLEY_W;
        since = 0;
        continue;
      }
      // What it is: from the mix, as the room and the block's counts allow
      const fits = (Object.entries(recipe.mix!) as [RowKit, number][]).filter(
        ([t]) =>
          KIT_SPEC[t].w[0] <= left + 1e-6 &&
          !(t === 'diner' && counts.diners >= 1) &&
          !((t === 'office' || t === 'hotel') && counts.towers >= recipe.towers) &&
          !((t === 'office' || t === 'hotel') && recipe.towers === 0)
      );
      if (!fits.length) break;
      const type = pick(r, fits);
      const spec = KIT_SPEC[type];
      let w = spec.w[0] + r() * (spec.w[1] - spec.w[0]);
      // Never leave a sliver: the last one takes the rest
      if (left - w < MIN_W) w = left;
      const tower = type === 'office' || type === 'hotel';
      if (tower) counts.towers++;
      if (type === 'diner') counts.diners++;
      const most = Math.max(1, Math.floor(recipe.tall - SHOP_H - PARAPET));
      const floors = tower ? Math.min(TOWER_FLOORS, between(r, spec.floors)) : Math.max(spec.floors[0], Math.min(most, between(r, spec.floors)));
      let box = rowRect(row, a, a + w);
      // Some without a front strip sit back a little, so the street wall isn't a ruler line
      if (!spec.front && r() < 0.35) box = pull(box, row.face, 0.4 + r() * 0.5);
      const sign: SignId | undefined = type === 'diner' ? 'diner' : type === 'hotel' ? 'hotel' : type === 'shop' && recipe.signs.length ? recipe.signs[counts.signs++ % recipe.signs.length] : undefined;
      lot({ box, h: heightOf(type, floors), face: row.face, type: type === 'shop' && !sign ? 'brownstone' : type, floors, sign, front: spec.front });
      a += w;
      since++;
    }
  }
  return out;
}

/** A block of a district: its land inside the sidewalk, its recipe and its seed */
export interface DistrictBlock {
  poly: Pt[];
  recipe: RecipeId;
  seed: number;
}

/** Lay a whole district, block by block */
export function layDistrict(blocks: DistrictBlock[]): Laid & { byBlock: Laid[] } {
  const byBlock = blocks.map((b) => layBlock(b.poly, RECIPES[b.recipe], b.seed));
  return { lots: byBlock.flatMap((l) => l.lots), alleys: byBlock.flatMap((l) => l.alleys), byBlock };
}

/** Every kit a recipe can lay */
export function kitsOf(recipe: Recipe): KitId[] {
  if (recipe.big) return [recipe.big];
  if (recipe.houses) return ['house'];
  return Object.keys(recipe.mix!) as KitId[];
}
