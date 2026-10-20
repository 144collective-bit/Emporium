/*
 * Downtown as data: what stands where inside the ring, DOM-free like
 * layout.ts, so the 3D city (infill.ts), the 2D map, collisions (solids.ts),
 * the street plan (streetplan.ts) and the game server all read one layout.
 *
 * Downtown is 0-60 on both axes. Two straight streets each way cross it
 * (layout.ts `CORE_ROADS`, at 17 and 43), cutting it into nine blocks, and
 * three diagonals run in from the ring's corners to the cross streets,
 * cutting the corner blocks into triangles:
 *
 *        NW  /|  N (Signal, Apartments)  |\  NE
 *       W (Post office, Vault)  C (the Emporium)  E (Drop 001, Workshop)
 *        SW \|  S (the hangout square)   |   SE (the Armoury)
 *
 * The landmarks keep their 9 x 9 lots (layout.ts `SEATS`); round them,
 * tight rows of infill buildings face the streets with walk-only alleys
 * between (bollards at their mouths keep cars out), triangles become pocket
 * parks or saw-toothed infill, and the south block is the hangout square.
 *
 * Coordinates are world units on the ground: [x, z].
 */
import { BS, CORE_ROADS, DOWNTOWN, LANE, RING_HI, RING_LO, SEATS, THIRDS, WALK_W } from './layout';

export type Pt = [number, number];
/** x0, z0, x1, z1 */
export type Rect = [number, number, number, number];
/** Which way a building's front looks: towards -z (n), +z (s), +x (e) or -x (w) */
export type Face = 'n' | 's' | 'e' | 'w';

/* ---------- The diagonals ---------- */

/** Diagonal streets, ring corner to cross street (one lane each way) */
export const DIAGONALS: { id: string; from: Pt; to: Pt }[] = [
  { id: 'diag-nw', from: [RING_LO, RING_LO], to: [CORE_ROADS[0], CORE_ROADS[0]] },
  { id: 'diag-ne', from: [RING_HI, RING_LO], to: [CORE_ROADS[1], CORE_ROADS[0]] },
  { id: 'diag-sw', from: [RING_LO, RING_HI], to: [CORE_ROADS[0], CORE_ROADS[1]] },
];
/** How far a diagonal's asphalt and sidewalk reach along x (or z) from its centre line: (half + sidewalk) * sqrt 2 */
export const DIAG_CUT = (LANE + WALK_W) * Math.SQRT2;

/* ---------- Blocks ---------- */

export type DowntownUse = 'landmark' | 'infill' | 'park' | 'plaza';
export interface DowntownBlock {
  id: string;
  /** The lot's outline (inside its sidewalk), counter-clockwise seen from above */
  poly: Pt[];
  use: DowntownUse;
}

const [T0, T1, T2] = THIRDS;
const D = DOWNTOWN;
const c = DIAG_CUT;
const rect = ([x0, z0, x1, z1]: Rect): Pt[] => [
  [x0, z0],
  [x0, z1],
  [x1, z1],
  [x1, z0],
];
/** Counter-clockwise seen from above (as streetplan.ts `polyArea` counts it) */
function ccw(poly: Pt[]): Pt[] {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  return a > 0 ? [...poly].reverse() : poly;
}

export const BLOCKS_DT: DowntownBlock[] = [
  // North-west, cut by its diagonal (x = z): infill to the north-east, a pocket park to the south-west
  {
    id: 'nw-a',
    use: 'infill',
    poly: ccw([
      [T0[0] + c, T0[0]],
      [T0[1], T0[0]],
      [T0[1], T0[1] - c],
    ]),
  },
  {
    id: 'nw-b',
    use: 'park',
    poly: ccw([
      [T0[0], T0[0] + c],
      [T0[0], T0[1]],
      [T0[1] - c, T0[1]],
    ]),
  },
  // North-east, cut by its diagonal (x + z = 60): infill towards the cross street, a pocket park at the ring
  {
    id: 'ne-a',
    use: 'infill',
    poly: ccw([
      [T2[0], T0[0]],
      [D - c, T0[0]],
      [T2[0], D - c - T2[0]],
    ]),
  },
  {
    id: 'ne-b',
    use: 'park',
    poly: ccw([
      [T2[1], T0[0] + c],
      [T2[1], T0[1]],
      [D + c - T0[1], T0[1]],
    ]),
  },
  // South-west, cut by its diagonal (x + z = 60): a pocket park at the ring, infill towards the cross street
  {
    id: 'sw-a',
    use: 'park',
    poly: ccw([
      [T0[0], T2[0]],
      [D - c - T2[0], T2[0]],
      [T0[0], D - c],
    ]),
  },
  {
    id: 'sw-b',
    use: 'infill',
    poly: ccw([
      [T0[1], D + c - T0[1]],
      [T0[1], T2[1]],
      [D + c - T2[1], T2[1]],
    ]),
  },
  { id: 'n', use: 'landmark', poly: rect([T1[0], T0[0], T1[1], T0[1]]) },
  { id: 'w', use: 'landmark', poly: rect([T0[0], T1[0], T0[1], T1[1]]) },
  { id: 'c', use: 'landmark', poly: rect([T1[0], T1[0], T1[1], T1[1]]) },
  { id: 'e', use: 'landmark', poly: rect([T2[0], T1[0], T2[1], T1[1]]) },
  { id: 'se', use: 'landmark', poly: rect([T2[0], T2[0], T2[1], T2[1]]) },
  // The hangout square: the whole south block, a block south of the Emporium
  { id: 's', use: 'plaza', poly: rect([T1[0], T2[0], T1[1], T2[1]]) },
];

/* ---------- The landmarks' lots ---------- */

/** Every landmark's 9 x 9 lot today, by its old block on the drawing grid */
export const LANDMARK_LOTS: Rect[] = Object.entries(SEATS)
  .filter(([k]) => k !== '0,0')
  .map(([, [x, z]]) => [x, z, x + BS, z + BS]);

/* ---------- Infill: tight rows of buildings with alleys between ---------- */

/**
 * What an infill building is (infill.ts draws each its own way):
 * - brownstone: a walk-up with a stoop, a bay window and a bracketed cornice
 * - shop: a shopfront with a fascia sign, an awning and a blade sign, flats above (fire escapes)
 * - diner: one storey, chrome and long windows, a rooftop sign, tables out front
 * - loft: an old warehouse, big windows, roll-up doors, a sawtooth roof
 * - office: a glass tower over a podium, set back, a lit crown and a mast
 * - hotel: tall and narrow, balconies, an entrance canopy and a vertical sign
 */
export type InfillType = 'brownstone' | 'shop' | 'diner' | 'loft' | 'office' | 'hotel';
/** Shop signs: fixed copy only (made-up names, nothing about the token) */
export const SIGNS = {
  coffee: { name: 'CRYPTO COFFEE', blade: 'CAFE', color: '#ffd36b', icon: 'cup' },
  validator: { name: "DAVE'S VALIDATOR", blade: 'TECH', color: '#00eaff', icon: 'chip' },
  crumpet: { name: 'GOLDEN CRUMPET', blade: 'BAKERY', color: '#f2c94c', icon: 'crumpet' },
  noodles: { name: 'NEON NOODLES', blade: 'RAMEN', color: '#ff6ad5' },
  records: { name: 'SPIN RECORDS', blade: 'VINYL', color: '#8f7bff' },
  laundry: { name: 'SUDS LAUNDRY', blade: 'WASH', color: '#7cf4ff' },
  pizza: { name: 'SLICE PIZZA', blade: 'PIZZA', color: '#ff8a3d' },
  mart: { name: '24/7 MART', blade: '24/7', color: '#2bff88' },
  books: { name: 'PIXEL BOOKS', blade: 'BOOKS', color: '#ffd36b' },
  barber: { name: 'FRESH CUTS', blade: 'CUTS', color: '#e219e5' },
  tacos: { name: 'TACO RIOT', blade: 'TACOS', color: '#ff6a2f' },
  diner: { name: 'STARLITE DINER', blade: 'EAT', color: '#ff3b8a' },
  hotel: { name: 'HOTEL NOVA', blade: 'HOTEL', color: '#ff6ad5' },
  gm: { name: 'GM DEGENS', blade: 'GM', color: '#00eaff' },
} as const satisfies Record<string, { name: string; blade: string; color: string; icon?: string }>;
export type SignId = keyof typeof SIGNS;
/** Your three shops (the owner's names), spread across downtown */
export const NAMED_SHOPS: SignId[] = ['coffee', 'validator', 'crumpet'];
/** Signs the other shops take turns with */
const SHOP_SIGNS: SignId[] = ['noodles', 'records', 'laundry', 'pizza', 'mart', 'books', 'barber', 'tacos'];

/** x0, z0, x1, z1, height (solids.ts `Box`) */
export type Footprint = [number, number, number, number, number];

export interface Infill {
  /** Its plot along the street (the building, and anything out front: a stoop, café tables) */
  box: Rect;
  /** Roof height */
  h: number;
  face: Face;
  /** Picks the facade, colours and details (stable from build to build) */
  seed: number;
  type: InfillType;
  /** Whole floors above the ground floor */
  floors: number;
  sign?: SignId;
  /** How far the building stands back from the front of its plot (room for a stoop or café tables) */
  front: number;
  /** What's solid: the building, and a stoop */
  solids: Footprint[];
}
export interface Alley {
  /** The walk-only gap between two buildings, from the street front to the back */
  box: Rect;
  /** Bollards across its mouth, just inside the street front (x, z), so cars stay out */
  bollards: Pt[];
}

/** A strip of land along a street front, filled with buildings of varied width and height, an alley every few */
interface Zone {
  box: Rect;
  face: Face;
  /** Tallest a building here may be (the Emporium stays the tallest by far) */
  tall: number;
  seed: number;
  /** Offices and hotels here may rise to TOWER_FLOORS, breaking the skyline */
  tower?: boolean;
  /** Faces a back lane, not a street (no diners) */
  back?: boolean;
}

/** A small, stable random generator (the same city on every load, in the browser and on the server) */
function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALLEY_W = 1.6;
/** An infill building's shop floor, each floor above it, and its parapet */
export const SHOP_H = 1.25;
export const FLOOR = 1;
export const PARAPET = 0.35;
/** The tallest an office or hotel gets (its roof about 10.6 up, well under the Emporium's 12.5) */
export const TOWER_FLOORS = 9;
/** Bollards stand this far in from the front (the sidewalk stays clear for the people walking it) */
const BOLLARD_IN = 0.3;

const [X0, X1] = T1;
const ZONES: Zone[] = [
  // The centre block: a row along the north cross street, a row behind it facing the Emporium's back lane, and rows either side of the Emporium
  { box: [X0, T1[0], X1, T1[0] + 4.6], face: 'n', tall: 7.5, seed: 11, tower: true },
  { box: [X0, T1[0] + 5.7, X1, SEATS['11,11'][1] - 1.7], face: 's', tall: 6.5, seed: 12, back: true },
  { box: [X0, SEATS['11,11'][1], SEATS['11,11'][0] - 1.7, T1[1]], face: 'w', tall: 6.5, seed: 13 },
  { box: [SEATS['11,11'][0] + BS + 1.7, SEATS['11,11'][1], X1, T1[1]], face: 'e', tall: 6.5, seed: 14 },
  // Backs of the north, west and east blocks, facing the ring
  { box: [X0, T0[0], X1, SEATS['11,0'][1] - 1.3], face: 'n', tall: 5.5, seed: 21, tower: true },
  { box: [T0[0], T1[0], SEATS['0,11'][0] - 1.3, T1[1]], face: 'w', tall: 5.5, seed: 22, tower: true },
  { box: [SEATS['22,11'][0] + BS + 1.3, T1[0], T2[1], T1[1]], face: 'e', tall: 5.5, seed: 23, tower: true },
  // The triangles with infill: a row along each straight side from the right-angle corner, kept
  // clear of the diagonal (its side keeps a planted strip). Rows are ROW deep.
  ...triangleRows(),
];

/** The rows along an infill triangle's two straight sides (corner building in the first row) */
function triangleRows(): Zone[] {
  const R = 3.9;
  const g = 0.1;
  return [
    // North-west (right angle at the north-east corner, x - z >= c)
    { box: [T0[0] + c + R + g, T0[0], T0[1], T0[0] + R], face: 'n', tall: 4.5, seed: 31 },
    { box: [T0[1] - R, T0[0] + R, T0[1], T0[1] - R - c - g], face: 'e', tall: 4.5, seed: 32 },
    // North-east (right angle at the north-west corner, x + z <= 60 - c)
    { box: [T2[0], T0[0], D - c - R - g, T0[0] + R], face: 'n', tall: 4.5, seed: 33 },
    { box: [T2[0], T0[0] + R, T2[0] + R, D - c - T2[0] - R - g], face: 'w', tall: 4.5, seed: 34 },
    // South-west (right angle at the south-east corner, x + z >= 60 + c)
    { box: [D + c - T2[1] + R + g, T2[1] - R, T0[1], T2[1]], face: 's', tall: 4.5, seed: 35 },
    { box: [T0[1] - R, D + c - T0[1] + R + g, T0[1], T2[1] - R], face: 'e', tall: 4.5, seed: 36 },
  ];
}

/** Fill a zone: buildings 2.6-4.6 along its front, an alley after every two or three */
function fill(z: Zone, out: { infill: Infill[]; alleys: Alley[] }) {
  const r = rng(z.seed * 7919);
  const along: 'x' | 'z' = z.face === 'n' || z.face === 's' ? 'x' : 'z';
  const [x0, z0, x1, z1] = z.box;
  const [a0, a1] = along === 'x' ? [x0, x1] : [z0, z1];
  let a = a0;
  let since = 0;
  let k = 0;
  while (a1 - a > 2.4) {
    // An alley between buildings, now and then (never first, never last)
    if (since >= 2 && a1 - a > 2.4 + ALLEY_W + 2.6 && r() < 0.55) {
      const box: Rect = along === 'x' ? [a, z0, a + ALLEY_W, z1] : [x0, a, x1, a + ALLEY_W];
      const m = a + ALLEY_W / 2;
      const off = ALLEY_W * 0.32;
      const mouth: Pt[] =
        z.face === 'n'
          ? [
              [m - off, z0 + BOLLARD_IN],
              [m + off, z0 + BOLLARD_IN],
            ]
          : z.face === 's'
            ? [
                [m - off, z1 - BOLLARD_IN],
                [m + off, z1 - BOLLARD_IN],
              ]
            : z.face === 'w'
              ? [
                  [x0 + BOLLARD_IN, m - off],
                  [x0 + BOLLARD_IN, m + off],
                ]
              : [
                  [x1 - BOLLARD_IN, m - off],
                  [x1 - BOLLARD_IN, m + off],
                ];
      out.alleys.push({ box, bollards: mouth });
      a += ALLEY_W;
      since = 0;
      continue;
    }
    let w = 2.6 + r() * 2;
    if (a1 - (a + w) < 2.6) w = a1 - a;
    // What it is: wide plots take the big types, narrow ones walk-ups and shops; towers only where the zone allows
    const pick = r();
    const wide = w >= 3.5;
    let type: InfillType;
    if (z.tower && mix.towers < 6 && pick < 0.32) {
      type = wide ? 'office' : 'hotel';
      mix.towers++;
    } else if (wide && !z.back && mix.diners < 2 && pick < 0.48) {
      type = 'diner';
      mix.diners++;
    } else if (wide && pick < 0.62) type = 'loft';
    else if (pick < 0.8) type = 'shop';
    else type = 'brownstone';
    // Some sit back a little from the street, so the street wall isn't a ruler line (not the ones with a stoop or tables out front)
    const front = FRONTS[type];
    const depthCut = !front && r() < 0.35 ? 0.4 + r() * 0.5 : 0;
    let box: Rect = along === 'x' ? [a, z0, a + w, z1] : [x0, a, x1, a + w];
    if (depthCut) box = pull(box, z.face, depthCut);
    // A ground floor, whole floors above it, and the parapet
    const most = Math.max(1, Math.floor(z.tall - SHOP_H - PARAPET));
    const floors =
      type === 'diner'
        ? 0
        : type === 'office'
          ? 5 + Math.floor(r() * (TOWER_FLOORS - 4))
          : type === 'hotel'
            ? 5 + Math.floor(r() * (TOWER_FLOORS - 5))
            : type === 'brownstone'
              ? Math.min(most, 2 + Math.floor(r() * 3))
              : 1 + Math.floor(r() * most);
    const h = Math.round((SHOP_H + floors * FLOOR + PARAPET + (type === 'diner' ? 0.3 : 0)) * 100) / 100;
    const sign: SignId | undefined = type === 'diner' ? 'diner' : type === 'hotel' ? 'hotel' : type === 'shop' ? SHOP_SIGNS[mix.signs++ % SHOP_SIGNS.length] : undefined;
    out.infill.push(withSolids({ box, h, face: z.face, seed: z.seed * 100 + k++, type, floors, sign, front, solids: [] }));
    a += w;
    since++;
  }
}

/** A plot pulled back from its front by d */
function pull(b: Rect, face: Face, d: number): Rect {
  if (face === 'n') return [b[0], b[1] + d, b[2], b[3]];
  if (face === 's') return [b[0], b[1], b[2], b[3] - d];
  if (face === 'w') return [b[0] + d, b[1], b[2], b[3]];
  return [b[0], b[1], b[2] - d, b[3]];
}
/** The building's own footprint (its plot without the strip out front) */
export const bodyOf = (f: Infill): Rect => (f.front ? pull(f.box, f.face, f.front) : f.box);

/** The stoop: steps up to a walk-up's door, from its plot's front strip (where along the front, and how wide) */
export function stoopOf(f: Infill): Rect {
  const [x0, z0, x1, z1] = f.box;
  const alongX = f.face === 'n' || f.face === 's';
  const len = alongX ? x1 - x0 : z1 - z0;
  const c = (alongX ? x0 : z0) + len * 0.3;
  const half = 0.42;
  const depth = f.front - 0.05;
  if (f.face === 'n') return [c - half, z0 + f.front - depth, c + half, z0 + f.front];
  if (f.face === 's') return [c - half, z1 - f.front, c + half, z1 - f.front + depth];
  if (f.face === 'w') return [x0 + f.front - depth, c - half, x0 + f.front, c + half];
  return [x1 - f.front, c - half, x1 - f.front + depth, c + half];
}

function withSolids(f: Infill): Infill {
  f.solids = [[...bodyOf(f), f.h]];
  if (f.type === 'brownstone') f.solids.push([...stoopOf(f), 0.45]);
  return f;
}

/** How far each type stands back from its plot's front: a stoop, café tables, planters and bikes, an entrance canopy (lofts load straight off the street) */
const FRONTS: Record<InfillType, number> = { brownstone: 0.8, shop: 0.5, diner: 0.9, loft: 0, office: 0.6, hotel: 0.7 };

/** Running counts while downtown is filled: a few towers and diners, and the shop signs taking turns */
const mix = { towers: 0, diners: 0, signs: 0 };
const built = { infill: [] as Infill[], alleys: [] as Alley[] };
for (const z of ZONES) fill(z, built);

// Your three shops, one in each part of downtown: Crypto Coffee beside the Emporium on the west cross street,
// Dave's Validator in the north-east triangle, the Golden Crumpet in the south-west triangle by the square
for (const [sign, seed] of [
  ['coffee', 13],
  ['validator', 34],
  ['crumpet', 36],
] as [SignId, number][]) {
  const f = built.infill.find((b) => Math.floor(b.seed / 100) === seed && Math.min(b.box[2] - b.box[0], b.box[3] - b.box[1]) >= 2.6 && b.type !== 'office')!;
  f.type = 'shop';
  f.sign = sign;
  f.floors = Math.max(1, Math.min(f.floors, 3));
  // The café has tables out front
  f.front = sign === 'coffee' ? 0.9 : FRONTS.shop;
  f.h = Math.round((SHOP_H + f.floors * FLOOR + PARAPET) * 100) / 100;
  withSolids(f);
}

/** Every infill building downtown */
export const INFILL: Infill[] = built.infill;
/** Every walk-only alley downtown */
export const ALLEYS: Alley[] = built.alleys;
/** The rooftop the GM water tower stands on: a mid-height one on the west side of the Emporium's block, over the cross street */
export const WATER_TOWER: Infill =
  [...INFILL].filter((f) => f.h <= 5.7 && f.face === 'w' && f.box[0] < 25 && !NAMED_SHOPS.includes(f.sign!)).sort((p, q) => q.h - p.h)[0] ?? INFILL[0];
/** A bollard's footprint: half its width */
export const BOLLARD_R = 0.1;

/**
 * Walk-only lanes between two landmarks on one block: the alley between the
 * Signal tower and the Apartments, and the courtyard lanes the Post office and
 * Drop 001 front onto (each open to the cross street at one end).
 */
export const LANES: Rect[] = [
  [SEATS['11,0'][0] + BS, SEATS['11,0'][1], SEATS['22,0'][0], SEATS['22,0'][1] + BS],
  [SEATS['0,22'][0], SEATS['0,22'][1] + BS, SEATS['0,11'][0] + BS, SEATS['0,11'][1]],
  [SEATS['22,11'][0], SEATS['22,11'][1] + BS, SEATS['11,22'][0] + BS, SEATS['11,22'][1]],
];

/* ---------- Pocket parks and the hangout square ---------- */

export interface Park {
  id: string;
  poly: Pt[];
  trees: Pt[];
  /** Benches: where, and which way the sitter faces (0 is +z) */
  benches: { at: Pt; ry: number }[];
  lamps: Pt[];
}

/** Points inside a triangle, spread on a jittered grid */
function scatter(poly: Pt[], step: number, seed: number, margin: number): Pt[] {
  const r = rng(seed);
  const xs = poly.map((p) => p[0]);
  const zs = poly.map((p) => p[1]);
  const out: Pt[] = [];
  for (let x = Math.min(...xs) + margin; x < Math.max(...xs) - margin; x += step)
    for (let z = Math.min(...zs) + margin; z < Math.max(...zs) - margin; z += step) {
      const p: Pt = [x + (r() - 0.5) * step * 0.6, z + (r() - 0.5) * step * 0.6];
      if (insideBy(poly, p, margin)) out.push(p);
    }
  return out;
}
/** Inside an outline and at least `m` from every edge */
export function insideBy(poly: Pt[], p: Pt, m = 0) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) inside = !inside;
  }
  if (!inside || !m) return inside;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j];
    const [bx, bz] = poly[i];
    const vx = bx - ax;
    const vz = bz - az;
    const l2 = vx * vx + vz * vz;
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * vx + (p[1] - az) * vz) / l2));
    if (Math.hypot(p[0] - (ax + vx * t), p[1] - (az + vz * t)) < m) return false;
  }
  return true;
}

/** Target practice in the north-west pocket park: where three cardboard dummies stand (combat-sim.ts DUMMIES) */
export const PRACTICE: Pt[] = [
  [1.6, 8.4],
  [1.6, 11.2],
  [3.4, 12.9],
];

export const PARKS: Park[] = BLOCKS_DT.filter((b) => b.use === 'park').map((b, i) => {
  const trees = scatter(b.poly, 1.7, 400 + i, 0.7);
  // Benches round the middle of the triangle, facing it
  const mid: Pt = [b.poly.reduce((s, p) => s + p[0], 0) / 3, b.poly.reduce((s, p) => s + p[1], 0) / 3];
  const benches = [0, 2.1, 4.2]
    .map((a) => ({ at: [mid[0] + Math.cos(a + i) * 1.3, mid[1] + Math.sin(a + i) * 1.3] as Pt, a: a + i }))
    .filter((q) => insideBy(b.poly, q.at, 0.7))
    .map((q) => ({ at: q.at, ry: Math.atan2(mid[0] - q.at[0], mid[1] - q.at[1]) }));
  const clear = (p: Pt) =>
    Math.hypot(p[0] - mid[0], p[1] - mid[1]) > 2.1 &&
    benches.every((q) => Math.hypot(p[0] - q.at[0], p[1] - q.at[1]) > 1.1) &&
    PRACTICE.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) > 1.2);
  return { id: b.id, poly: b.poly, trees: trees.filter(clear), benches, lamps: [mid] };
});

/**
 * The hangout square: the whole south block (lot outline), with a stage, a screen and room for a
 * crowd. The stage is at the north end facing south, so the screen faces the city's camera and the
 * people on the square look back across to the Emporium.
 */
export const SQUARE = (() => {
  const [x0, x1] = T1;
  const [z0, z1] = T2;
  const cx = (x0 + x1) / 2;
  return {
    box: [x0, z0, x1, z1] as Rect,
    /** The stage at the north end, its front (+z) to the square */
    stage: [cx - 5, z0 + 0.6, cx + 5, z0 + 3.2] as Rect,
    stageH: 0.55,
    /** The big screen at the back of the stage, facing +z */
    screen: { x0: cx - 4.2, x1: cx + 4.2, z: z0 + 0.45, y0: 1.2, y1: 4.9 },
    /** A round fountain towards the south end */
    fountain: { at: [cx, z1 - 3.4] as Pt, r: 1.6 },
    /** Kiosks either side */
    kiosks: [
      [x0 + 0.8, z0 + 7.4, x0 + 3.0, z0 + 9.6],
      [x1 - 3.0, z0 + 7.4, x1 - 0.8, z0 + 9.6],
    ] as Rect[],
    /** Trees in planters round the edge */
    trees: [
      [x0 + 1.4, z0 + 1.4],
      [x1 - 1.4, z0 + 1.4],
      [x0 + 1.4, z1 - 1.4],
      [x1 - 1.4, z1 - 1.4],
      [x0 + 1.6, z1 - 4.4],
      [x1 - 1.6, z1 - 4.4],
    ] as Pt[],
    /** Benches facing the stage (the sitter looks -z) */
    benches: [-6, -2.5, 2.5, 6].map((dx) => ({ at: [cx + dx, z0 + 8.4] as Pt, ry: Math.PI })),
    /** Poles for the string lights, round the square */
    poles: [
      [x0 + 0.5, z0 + 0.5],
      [x1 - 0.5, z0 + 0.5],
      [x1 - 0.5, z1 - 0.5],
      [x0 + 0.5, z1 - 0.5],
    ] as Pt[],
  };
})();

/** Lamps along downtown's diagonals (both sides, on the sidewalk) */
export const DIAGONAL_LAMPS: { at: Pt; ry: number }[] = DIAGONALS.flatMap((d) => {
  const [ax, az] = d.from;
  const [bx, bz] = d.to;
  const L = Math.hypot(bx - ax, bz - az);
  const ux = (bx - ax) / L;
  const uz = (bz - az) / L;
  const out: { at: Pt; ry: number }[] = [];
  for (let s = 9.5; s < L - 7; s += 6.5)
    for (const side of [1, -1]) {
      const off = LANE + WALK_W * 0.55;
      const at: Pt = [ax + ux * s - uz * off * side, az + uz * s + ux * off * side];
      // The arm reaches out over the road
      out.push({ at, ry: Math.atan2(ux * side, uz * side) });
    }
  return out;
});
