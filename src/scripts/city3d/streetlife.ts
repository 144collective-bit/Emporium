/*
 * Uptown's street life (docs/finance-plan.md Phase 7 step 4, the owner's
 * picks; DOM-free, tested in tests/streetlife.test.ts), drawn by
 * streetlife3d.ts in Uptown's chunk. Scenery only: fixed made-up words, never
 * a number or a price.
 *
 * - **Screens** (`SCREENS`): big LED screens on the street wall's bases along
 *   the north cross street and round the plaza, over the shopfronts and under
 *   each base's cornice, showing slides (`SLIDES`) that change together.
 * - **Neon** (`BLADES`): a vertical neon blade over the margin at the corner
 *   of each restaurant front (the dining frontages deep enough to hang one
 *   over), each a made-up word (`BLADE_WORDS`), over head height.
 * - **Vendors and carts** (`CARTS`): a coffee cart, a hot dog cart, a
 *   flower stall and a newsstand in turn, one in the margin of each front
 *   deep enough (`CART`: the cart, its vendor behind it and a customer at each
 *   end, the sidewalk left clear), wherever that's clear of the dressing, the
 *   doors and everything solid; the vendors and customers are
 *   `STREETLIFE_PEOPLE`.
 * - **What's solid** (`STREETLIFE_SOLIDS`): the carts.
 */
import { HIGHRISES, PODIUM } from './highrise';
import { DRESSING, FRONTAGES, SCULPTURES, STREETLEVEL_SOLIDS, type Frontage } from './streetlevel';
import { UPTOWN_LAMPS, type Pt, type Rect } from './uptown';
import { KERBSIDE_SOLIDS } from './kerbside';
import { PLAZA_SOLIDS } from './plaza';
import { SITE_RECTS, UPTOWN_SITE_SOLIDS } from './uptownsites';

type Box = [number, number, number, number, number];

const lenOf = (f: Frontage) => Math.hypot(f.c[0] - f.a[0], f.c[1] - f.a[1]);
const dirOf = (f: Frontage): Pt => {
  const len = lenOf(f);
  return [(f.c[0] - f.a[0]) / len, (f.c[1] - f.a[1]) / len];
};
/** A point on a frontage: `along` from its start, `out` from its wall */
export function onFront(f: Frontage, along: number, out: number): Pt {
  const u = dirOf(f);
  return [f.a[0] + u[0] * along + f.n[0] * out, f.a[1] + u[1] * along + f.n[1] * out];
}
/** Facing out from a frontage's wall (0 is +z) */
export const facing = (n: Pt) => Math.atan2(n[0], n[1]);
/** The axis-aligned box of a band on a frontage (its walls are all along x or z) */
function band(f: Frontage, a0: number, a1: number, o0: number, o1: number): Rect {
  const [p, q] = [onFront(f, a0, o0), onFront(f, a1, o1)];
  return [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1])];
}
const overlaps = (a: Rect, b: Rect | Box, m = 0) => a[0] < b[2] + m && a[2] > b[0] - m && a[1] < b[3] + m && a[3] > b[1] - m;
const towerOf = (f: Frontage) => HIGHRISES.find((t) => t.id === f.tower)!;

/* ---------- Screens ---------- */

/** The slides every screen shows in turn (fixed made-up copy; streetlife3d.ts paints them), how long each stays */
export const SLIDES = ['UPTOWN NIGHTS', 'SECTOR 7', 'GOOD MORNING UPTOWN', 'CIRCLE THEATRE', 'THE SKY DECK', 'MARBLE CAFÉ', 'RIVER BUS · ALL ABOARD', 'GAME ON'];
export const SLIDE_SECONDS = 7;
export interface Screen {
  tower: string;
  /** Its middle on the wall's face (x, z), the way it faces, its width and height, its bottom over the slab */
  x: number;
  z: number;
  n: Pt;
  w: number;
  h: number;
  y: number;
  /** The slide it starts on */
  slide: number;
}
/** How far off the wall a screen's face stands (its frame behind it), the gap over the shopfronts, under the cornice */
export const SCREEN = { off: 0.18, frame: 0.12, over: PODIUM.h + 0.5, under: 0.9, side: 0.7 };
/** Which walls carry one: the north cross street's and the plaza's, on bases tall enough */
const SCREEN_WALLS: [string, string][] = [
  ['n0b', 's'],
  ['n0d', 's'],
  ['n0d', 'e'],
  ['n1a', 'w'],
  ['n1b', 's'],
  ['m2a', 'n'],
];
export const SCREENS: Screen[] = SCREEN_WALLS.flatMap(([id, side], i): Screen[] => {
  const f = FRONTAGES.find((q) => q.tower === id && q.side === side);
  const t = HIGHRISES.find((h) => h.id === id);
  if (!f || !t?.base) return [];
  const room = t.base.h - SCREEN.under - SCREEN.over;
  const w = Math.min(lenOf(f) - 2 * SCREEN.side, 2 * room);
  const h = w / 2;
  const [x, z] = onFront(f, lenOf(f) / 2, SCREEN.off);
  return [{ tower: id, x, z, n: f.n, w, h, y: t.base.h - SCREEN.under - h, slide: (i * 3) % SLIDES.length }];
});

/* ---------- Neon blades ---------- */

export const BLADE_WORDS = ['BAR', 'JAZZ', 'GRILL', 'SUSHI', 'LOUNGE', 'DINER', 'NOODLE', 'TAPAS', 'OYSTER', 'BISTRO'];
export interface Blade {
  tower: string;
  /** At the wall (x, z), reaching out along n, the word */
  x: number;
  z: number;
  n: Pt;
  word: number;
}
/** How far it reaches out, how high its bottom and top are, how far in from the corner, the margin it needs */
export const BLADE = { out: 0.95, y0: PODIUM.h + 0.3, y1: PODIUM.h + 3.2, corner: 0.45, need: 1.2, thick: 0.12 };
export const BLADES: Blade[] = FRONTAGES.filter((f) => f.char === 'dining' && f.depth >= BLADE.need && f.units.length >= 2).map((f, i) => {
  const [x, z] = onFront(f, BLADE.corner, 0);
  return { tower: f.tower, x, z, n: f.n, word: i % BLADE_WORDS.length };
});

/* ---------- Vendors and carts ---------- */

export type CartKind = 'coffee' | 'hotdog' | 'flowers' | 'news';
export const CART_KINDS: CartKind[] = ['coffee', 'hotdog', 'flowers', 'news'];
export interface Cart {
  kind: CartKind;
  tower: string;
  /** Its middle (x, z), facing out from the wall it stands by (0 is +z) */
  x: number;
  z: number;
  ry: number;
  /** Along the wall (unit) and out from it */
  u: Pt;
  n: Pt;
}
/**
 * A cart's half length along the wall and depth out from it, how far out its middle stands, where its vendor stands
 * behind it and its customers at its ends, how far they reach along, the sidewalk's width left clear past it
 */
export const CART = { half: 0.75, depth: 0.35, out: 0.95, vendor: 0.35, side: 1.2, reach: 1.6, walk: 0.8, h: 1.1 };
const CART_NEED = CART.out + CART.depth + CART.walk;
/** Everything a cart keeps clear of */
const KEEP: (Rect | Box)[] = [...STREETLEVEL_SOLIDS, ...KERBSIDE_SOLIDS, ...PLAZA_SOLIDS, ...UPTOWN_SITE_SOLIDS, ...SITE_RECTS];
export const CARTS: Cart[] = (() => {
  const out: Cart[] = [];
  for (const f of FRONTAGES) {
    if (f.char === 'service' || f.depth < CART_NEED) continue;
    const t = towerOf(f);
    if ((t.arcades ?? []).includes(f.side)) continue;
    const len = lenOf(f);
    // The spot nearest the wall's middle whose whole band (cart, vendor, customers) is clear
    const spots: number[] = [];
    for (let s = CART.reach + 0.3; s <= len - CART.reach - 0.3; s += 0.3) spots.push(s);
    spots.sort((p, q) => Math.abs(p - len / 2) - Math.abs(q - len / 2));
    const s = spots.find((s) => {
      const r = band(f, s - CART.reach, s + CART.reach, 0, CART.out + CART.depth + 0.15);
      const mid = onFront(f, s, CART.out);
      if (Math.hypot(mid[0] - t.door[0], mid[1] - t.door[1]) < 3.2) return false;
      if (KEEP.some((b) => overlaps(r, b, 0.15))) return false;
      if (DRESSING.some((d) => d.x > r[0] - 0.6 && d.x < r[2] + 0.6 && d.z > r[1] - 0.6 && d.z < r[3] + 0.6)) return false;
      if (SCULPTURES.some((q) => q.x > r[0] - 1 && q.x < r[2] + 1 && q.z > r[1] - 1 && q.z < r[3] + 1)) return false;
      return !UPTOWN_LAMPS.some(([x, z]) => x > r[0] - 0.5 && x < r[2] + 0.5 && z > r[1] - 0.5 && z < r[3] + 0.5);
    });
    if (s === undefined) continue;
    const [x, z] = onFront(f, s, CART.out);
    out.push({ kind: CART_KINDS[out.length % CART_KINDS.length], tower: f.tower, x, z, ry: facing(f.n), u: dirOf(f), n: f.n });
  }
  return out;
})();

/* ---------- People ---------- */

export interface LifePerson {
  x: number;
  z: number;
  ry: number;
  act: 'look' | 'chat';
}
/** Each cart's vendor behind it facing out, and a customer at one end or both facing it */
export const STREETLIFE_PEOPLE: LifePerson[] = CARTS.flatMap((c, i) => {
  const at = (along: number, out: number): Pt => [c.x + c.u[0] * along + c.n[0] * (out - CART.out), c.z + c.u[1] * along + c.n[1] * (out - CART.out)];
  const ends = i % 2 === 0 ? [-1, 1] : [1];
  const people: LifePerson[] = [{ x: at(0, CART.vendor)[0], z: at(0, CART.vendor)[1], ry: c.ry, act: 'look' }];
  for (const s of ends) {
    const [x, z] = at(s * CART.side, CART.out);
    people.push({ x, z, ry: Math.atan2(-s * c.u[0], -s * c.u[1]), act: 'chat' });
  }
  return people;
});

/* ---------- What's solid ---------- */

export const STREETLIFE_SOLIDS: Box[] = CARTS.map((c): Box => {
  const [hx, hz] = Math.abs(c.u[0]) > 0.5 ? [CART.half, CART.depth] : [CART.depth, CART.half];
  return [c.x - hx, c.z - hz, c.x + hx, c.z + hz, CART.h];
});
