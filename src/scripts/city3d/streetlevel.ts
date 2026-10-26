/*
 * Uptown at street level (docs/finance-plan.md Phase 7, the owner's picks;
 * DOM-free, tested in tests/streetlevel.test.ts): what the towers' ground
 * floors and the sidewalks round them are, street by street.
 *
 * - **Frontages** (`FRONTAGES`): every side of a tower's base (or podium)
 *   that faces a street takes that street's character (`frontage()`):
 *   `luxe` (the bank avenue and the park's avenue: boutiques), `dining` (the
 *   cross streets, Circle Street and the axis's lanes: restaurants, cafés
 *   and bars), `local` (the one-way pair, the east street, the crescent and
 *   the circle's street: a deli, a dry cleaner, a pharmacy, a florist...);
 *   a side facing no street (an alley, the next tower) is `service`. Each
 *   frontage is shop units `UNIT` wide from the side's start (the ground
 *   floor band's two shops to a repeat), each a made-up name from its
 *   character's list (`SHOP_NAMES`), the units by a door left out.
 * - **The sidewalk's dressing** (`DRESSING`): in the margin between a base
 *   and its block's edge (the sidewalk itself stays clear), by character:
 *   café tables with their chairs (an umbrella where it's deep enough) and
 *   menu boards for dining, planters for luxe, a florist's buckets, crates of
 *   fruit, a newspaper box and bike racks for local; diners at the tables
 *   and doormen at the grand lobbies (`STREET_PEOPLE`), and a sculpture on a
 *   plinth by each grand lobby (`SCULPTURES`).
 * - **The galleria** (`GALLERIAS`): a glass roof on slim columns over each
 *   of the axis's walk-only lanes.
 * - **What's solid** (`STREETLEVEL_SOLIDS`): the tables, planters, crates,
 *   racks, boxes, plinths and the galleria's columns.
 */
import { HIGHRISES, TOWER_BLOCKS, type Face, type Highrise } from './highrise';
import { NORTH_OPEN } from './uptownnorth';
import { LAYBYS, UPTOWN_LANES, laybyRect, type Pt, type Rect } from './uptown';
import { PLAN, distToStreet } from './streetplan';
import { CHAIR, SEAT_Y, TERRACES } from './plaza';
import { SITE_RECTS } from './uptownsites';

export type Character = 'luxe' | 'dining' | 'local' | 'service';
export type ShopCharacter = Exclude<Character, 'service'>;

/** Each street's character, by its id in the street plan (an alley, the axis's lanes, is dining) */
export function characterOf(id: string, kind: string): Character {
  if (kind === 'alley') return 'dining';
  if (kind === 'highway' || kind === 'slip') return 'service';
  // (and the north avenue past Uptown North, across from the mall)
  if (id === 'ew0' || id === 'ew3' || id === 'ns0') return 'luxe';
  if (id === 'ew1' || id === 'ew2' || id === 'uptown-circle-e' || id === 'uptown-diag') return 'dining';
  return 'local';
}

/** A shop unit's width: the ground floor band's two shops to a 4.8 repeat */
export const UNIT = 2.4;
/** The shops' names (fixed made-up copy), a list a character */
export const SHOP_NAMES: Record<ShopCharacter, string[]> = {
  luxe: ['MAISON LUNE', 'AURUM', 'VELOUR', 'ATELIER NOIR', 'CASHMERE CO', 'GILT', 'OPTIKA', 'SILK & STONE', 'HARLOW', 'NORTH & PINE', 'THE TAILOR', 'IVORY'],
  dining: ['TRATTORIA SOLE', 'BLUE NOODLE', 'OYSTER BAR', 'SMOKE & OAK', 'BREW BAR', 'SAKURA', 'THE GILDED FORK', 'TACO NORTE', 'NIGHTJAR', 'LE PETIT ZINC', 'SALT BAKERY', 'TIDE WINES'],
  local: ['CORNER DELI', 'QUICK CLEAN', 'PHARMACY', 'PETAL & STEM', 'NEWS & CO', 'KEY & HEEL', 'FRESH MARKET', 'PAPER & INK', 'BAGEL BROS', 'IRON GYM', 'SNAP PHOTO', 'COPY SHOP'],
};

export interface Unit {
  /** Its middle on the wall (on the base's face) and how far along the wall from its start */
  at: Pt;
  u: number;
  /** Which name in its character's list */
  name: number;
}
export interface Frontage {
  tower: string;
  side: Face;
  /** The wall from a to c, wound as the blocks are (outward on its right going round), its outward normal */
  a: Pt;
  c: Pt;
  n: Pt;
  char: Character;
  /** The street it faces (its id in the street plan), and how deep the margin is from the wall to the block's edge */
  street: string | null;
  depth: number;
  units: Unit[];
}

type Side = { f: Face; a: Pt; c: Pt };
/** A box's four sides wound as the blocks are (west, south, east, north), each with the way it faces */
export function sidesOf([x0, z0, x1, z1]: Rect): Side[] {
  return [
    { f: 'w', a: [x0, z0], c: [x0, z1] },
    { f: 's', a: [x0, z1], c: [x1, z1] },
    { f: 'e', a: [x1, z1], c: [x1, z0] },
    { f: 'n', a: [x1, z0], c: [x0, z0] },
  ];
}
export const OPPOSITE: Record<Face, Face> = { n: 's', s: 'n', e: 'w', w: 'e' };
const NORMAL: Record<Face, Pt> = { w: [-1, 0], s: [0, 1], e: [1, 0], n: [0, -1] };

const inRect = (p: Pt, r: Rect, m = 0) => p[0] > r[0] - m && p[0] < r[2] + m && p[1] > r[1] - m && p[1] < r[3] + m;
function inPoly(poly: Pt[], p: Pt) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [u, v] = [poly[i], poly[j]];
    if (u[1] > p[1] !== v[1] > p[1] && p[0] < ((v[0] - u[0]) * (p[1] - u[1])) / (v[1] - u[1]) + u[0]) inside = !inside;
  }
  return inside;
}
/** What stops the margin in front of a wall: the lanes, the plaza's terraces, the lay-bys, the other towers' lots */
const STOPS: Rect[] = [...UPTOWN_LANES, ...TERRACES, ...LAYBYS.map(laybyRect), ...SITE_RECTS];

/**
 * What a wall from a to c faces (outward along n): the first street a step out from its middle meets, and how deep
 * the margin is before anything (the block's edge, a lane, a terrace, a lay-by, another tower's lot)
 */
export function frontage(t: Highrise, a: Pt, c: Pt, n: Pt): { street: string | null; char: Character; depth: number } {
  const blk = TOWER_BLOCKS.find((b) => b.id === t.block)!;
  const m: Pt = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
  const others = [...HIGHRISES.filter((o) => o !== t).map((o) => o.lot), ...SITE_RECTS];
  let depth = 0;
  for (let d = 0.05; d < 8; d += 0.05) {
    const p: Pt = [m[0] + n[0] * d, m[1] + n[1] * d];
    if (!inPoly(blk.poly, p) || STOPS.some((r) => inRect(p, r)) || others.some((r) => inRect(p, r))) break;
    depth = d;
  }
  // (Uptown North's square and the park's gates' walks through it: open ground, its ground floors dining)
  for (let d = 0.3; d <= depth + 0.3; d += 0.3) if (NORTH_OPEN.some((r) => inRect([m[0] + n[0] * d, m[1] + n[1] * d], r))) return { street: 'square', char: 'dining', depth };
  for (let d = depth; d < depth + 4; d += 0.1) {
    const p: Pt = [m[0] + n[0] * d, m[1] + n[1] * d];
    if (others.some((r) => inRect(p, r))) break;
    const s = PLAN.streets.find((q) => distToStreet(q, p) <= q.half + 0.05);
    if (s) return { street: s.id, char: characterOf(s.id, s.kind), depth };
    // (the axis's lanes are alleys in the plan, and the plaza's terraces beside them its dining too)
    if (UPTOWN_LANES.some((r) => inRect(p, r)) || TERRACES.some((r) => inRect(p, r))) return { street: 'lane', char: 'dining', depth };
  }
  return { street: null, char: 'service', depth };
}

/** A small, steady hash of a tower's name and a number (the names along its walls) */
const hash = (id: string, k: number) => [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 9973, 7 + k * 13);

/** Every tower's base sides facing a street (its back is its service wall; a colonnade's front is its bronze doors) */
export const FRONTAGES: Frontage[] = HIGHRISES.flatMap((t) => {
  const pod = t.parts[0];
  if (pod.skin !== 'podium') return [];
  return sidesOf(pod.rect).flatMap(({ f, a, c }): Frontage[] => {
    // (an arcaded back faces its street too: Circle Street's)
    if (f === OPPOSITE[t.front] && !(t.arcades ?? []).includes(f)) return [];
    const n = NORMAL[f];
    const { street, char, depth } = frontage(t, a, c, n);
    // The front is its lobby's: only a retail lobby has shops along it (and the grand lobby's either side of its portal)
    const front = f === t.front;
    if (front && t.lobby !== 'retail' && t.lobby !== 'grand') return [];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const u: Pt = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
    const units: Unit[] = [];
    if (char !== 'service')
      for (let k = 0; (k + 1) * UNIT <= len + 0.01; k++) {
        const d = k * UNIT + UNIT / 2;
        const at: Pt = [a[0] + u[0] * d, a[1] + u[1] * d];
        // (the lobby's door between them: wider for a grand portal)
        if (front && Math.hypot(at[0] - t.door[0], at[1] - t.door[1]) < (t.lobby === 'grand' ? 2.6 : 1.9)) continue;
        units.push({ at, u: d, name: hash(t.id + f, k) % SHOP_NAMES[char].length });
      }
    return [{ tower: t.id, side: f, a, c, n, char, street, depth, units }];
  });
});

/* ---------- The sidewalk's dressing ---------- */

export type DressKind = 'table' | 'umbrella' | 'aboard' | 'planter' | 'buckets' | 'crates' | 'newsbox' | 'bikes';
export interface Dress {
  kind: DressKind;
  x: number;
  z: number;
  /** Facing (0 is +z): out from the wall it stands by */
  ry: number;
}
/** Café tables (round, a chair either side along the wall), their reach from the wall, the margin they need */
export const TABLE = { r: 0.38, out: 0.8, need: 1.35, umbrella: 1.7, chair: CHAIR };
const ry = (n: Pt) => Math.atan2(n[0], n[1]);
export const DRESSING: Dress[] = FRONTAGES.flatMap((fr) => {
  const out: Dress[] = [];
  const t = HIGHRISES.find((h) => h.id === fr.tower)!;
  const at = (p: Pt, o: number, along = 0): [number, number] => {
    const len = Math.hypot(fr.c[0] - fr.a[0], fr.c[1] - fr.a[1]);
    const u: Pt = [(fr.c[0] - fr.a[0]) / len, (fr.c[1] - fr.a[1]) / len];
    return [p[0] + fr.n[0] * o + u[0] * along, p[1] + fr.n[1] * o + u[1] * along];
  };
  // (nothing in front of the lobby's door, nor under an arcade: it's the walk)
  const clear = (p: Pt) => Math.hypot(p[0] - t.door[0], p[1] - t.door[1]) > 3 && !(t.arcades ?? []).includes(fr.side);
  fr.units.forEach((un, k) => {
    if (!clear(un.at)) return;
    const R = ry(fr.n);
    if (fr.char === 'dining' && fr.depth >= TABLE.need) {
      const [x, z] = at(un.at, TABLE.out);
      out.push({ kind: k % 2 === 0 && fr.depth >= TABLE.umbrella ? 'umbrella' : 'table', x, z, ry: R });
      if (k % 3 === 1) {
        const [bx, bz] = at(un.at, Math.min(fr.depth - 0.25, TABLE.out + 0.75), UNIT / 2 - 0.2);
        out.push({ kind: 'aboard', x: bx, z: bz, ry: R });
      }
    } else if (fr.char === 'luxe' && fr.depth >= 0.9 && k % 2 === 1) {
      const [x, z] = at(un.at, 0.45, UNIT / 2);
      // (stepped along to the unit's edge: kept off the door's way all the same)
      if (Math.hypot(x - t.door[0], z - t.door[1]) > 2.5) out.push({ kind: 'planter', x, z, ry: R });
    } else if (fr.char === 'local' && fr.depth >= 0.9) {
      const kind = (['buckets', 'crates', 'newsbox', 'bikes'] as const)[(un.name + k) % 4];
      // (a bike rack along the wall: it needs the margin's depth only for its width)
      const [x, z] = at(un.at, kind === 'bikes' ? 0.35 : 0.42, kind === 'newsbox' ? UNIT / 2 - 0.4 : 0);
      if (k % 2 === 0 || kind === 'newsbox') out.push({ kind, x, z, ry: R });
    }
  });
  return out;
});
/** Each piece's footprint (half widths across and along its wall) and height, for what's solid */
export const DRESS_SIZE: Record<DressKind, [number, number, number]> = {
  table: [0.32, 0.9, 0.75],
  umbrella: [0.32, 0.9, 0.75],
  aboard: [0.2, 0.3, 0.8],
  planter: [0.3, 0.3, 0.5],
  buckets: [0.3, 0.55, 0.5],
  crates: [0.35, 0.6, 0.7],
  newsbox: [0.22, 0.25, 0.95],
  bikes: [0.12, 0.85, 0.75],
};

/** The grand lobbies' sculptures: a bronze piece on a stone plinth on the margin beside the portal (x, z, its plinth's half side) */
export const SCULPTURES: { x: number; z: number; half: number; tower: string }[] = HIGHRISES.filter((t) => t.lobby === 'grand').flatMap((t) => {
  const fr = FRONTAGES.find((q) => q.tower === t.id && q.side === t.front);
  if (!fr || fr.depth < 1.6) return [];
  const len = Math.hypot(fr.c[0] - fr.a[0], fr.c[1] - fr.a[1]);
  const u: Pt = [(fr.c[0] - fr.a[0]) / len, (fr.c[1] - fr.a[1]) / len];
  // (to one side of the door, a step out from the wall)
  const o = Math.min(fr.depth - 0.7, 1.1);
  return [{ x: t.door[0] + u[0] * 3.6 + fr.n[0] * (o - 0.6), z: t.door[1] + u[1] * 3.6 + fr.n[1] * (o - 0.6), half: 0.45, tower: t.id }];
});

/* ---------- The galleria over the axis's lanes ---------- */

/** A glass roof on slim columns over each lane: its rect, the roof's height, the columns along both sides */
export const GALLERY = { y: 4.2, col: 0.12, every: 3.2 };
export const GALLERIAS: { rect: Rect; columns: Pt[] }[] = UPTOWN_LANES.map((r) => {
  const columns: Pt[] = [];
  const n = Math.max(2, Math.round((r[3] - r[1] - 1) / GALLERY.every) + 1);
  for (let i = 0; i < n; i++) {
    const z = r[1] + 0.5 + ((r[3] - r[1] - 1) * i) / (n - 1);
    columns.push([r[0] + 0.15, z], [r[2] - 0.15, z]);
  }
  return { rect: r, columns };
});

/* ---------- People ---------- */

export interface StreetPerson {
  x: number;
  z: number;
  /** A seat's height for those sitting */
  y: number;
  ry: number;
  act: 'sit' | 'eat' | 'look' | 'chat';
}
export const STREET_PEOPLE: StreetPerson[] = (() => {
  const out: StreetPerson[] = [];
  // Diners at two tables in three, facing each other across them (along the wall)
  DRESSING.filter((d) => d.kind === 'table' || d.kind === 'umbrella').forEach((d, i) => {
    if (i % 3 === 2) return;
    const [ux, uz] = [Math.cos(d.ry), -Math.sin(d.ry)];
    for (const s of [-1, 1]) out.push({ x: d.x + ux * s * TABLE.chair, z: d.z + uz * s * TABLE.chair, y: SEAT_Y, ry: d.ry - (s * Math.PI) / 2, act: 'eat' });
  });
  // A doorman by each grand lobby's door, facing the street
  for (const t of HIGHRISES.filter((h) => h.lobby === 'grand')) {
    const fr = FRONTAGES.find((q) => q.tower === t.id && q.side === t.front);
    if (!fr) continue;
    const len = Math.hypot(fr.c[0] - fr.a[0], fr.c[1] - fr.a[1]);
    const u: Pt = [(fr.c[0] - fr.a[0]) / len, (fr.c[1] - fr.a[1]) / len];
    out.push({ x: t.door[0] - u[0] * 1.6 + fr.n[0] * 0.1, z: t.door[1] - u[1] * 1.6 + fr.n[1] * 0.1, y: 0, ry: ry(fr.n), act: 'look' });
  }
  return out;
})();

/* ---------- What's solid ---------- */

type Box = [number, number, number, number, number];
export const STREETLEVEL_SOLIDS: Box[] = [
  ...DRESSING.map(({ kind, x, z, ry: r }): Box => {
    const [across, along, h] = DRESS_SIZE[kind];
    // (a wall facing along x or z: across is along the normal)
    const alongX = Math.abs(Math.cos(r)) > 0.5;
    const [hx, hz] = alongX ? [along, across] : [across, along];
    return [x - hx, z - hz, x + hx, z + hz, h];
  }),
  ...SCULPTURES.map(({ x, z, half }): Box => [x - half, z - half, x + half, z + half, 2.4]),
  ...GALLERIAS.flatMap((g) => g.columns.map(([x, z]): Box => [x - GALLERY.col, z - GALLERY.col, x + GALLERY.col, z + GALLERY.col, GALLERY.y])),
];
