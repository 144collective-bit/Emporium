/*
 * The street plan as data: streets (centre lines with a kind and a width),
 * the crossings where they meet, the blocks between them as outlines, and
 * the plazas. DOM-free and scene-free, like layout.ts, so the 3D city, the
 * 2D map, traffic, pedestrians, collisions, the plots and the game server
 * can all read one plan.
 *
 * `gridPlan()` describes today's city exactly (the grid in layout.ts). The
 * organic redesign (docs/city-plan.md) replaces it with curved and diagonal
 * streets, uneven blocks, walk-only alleys and plazas, and everything moves
 * over to reading the plan instead of the grid.
 *
 * Coordinates are world units on the ground: [x, z].
 */
import { DISTRICTS } from '../../data/plots';
import { BLOCKS, BS, CENTER_XZ, CORE_ROADS, EW_ROADS, EXT, EXTRA_LOTS, GARAGE, LANE, MARKET, MEDIAN, NS_ROADS, UNITS, WALK_W, type Road } from './layout';

export type Pt = [number, number];

/**
 * - street: one lane each way
 * - avenue: two lanes each way with a median
 * - alley: walk-only, no cars (cars never route along it)
 */
export type StreetKind = 'street' | 'avenue' | 'alley';

export interface Street {
  id: string;
  kind: StreetKind;
  /** The centre line, at least two points; straight between them */
  pts: Pt[];
  /** Half the paved width (asphalt for streets and avenues, the lane for an alley) */
  half: number;
  /** Lanes each way (0 for an alley) */
  lanes: 0 | 1 | 2;
}

export interface Crossing {
  id: string;
  at: Pt;
  /** The streets that meet here */
  streets: string[];
  /** Traffic lights (the rest give way) */
  lights: boolean;
}

export type BlockUse = 'landmark' | 'district' | 'lot' | 'park' | 'plaza' | 'plain';

export interface Block {
  id: string;
  /** The block's outline, inside its sidewalk, counter-clockwise seen from above (+y) */
  poly: Pt[];
  use: BlockUse;
  /** What stands on it: a landmark's spot id, a district plot id, a lot's name */
  ref?: string;
  /** Sidewalk width round it */
  walk: number;
}

export type PlazaKind = 'hangout' | 'square' | 'park';

export interface Plaza {
  id: string;
  kind: PlazaKind;
  poly: Pt[];
}

export interface StreetPlan {
  streets: Street[];
  crossings: Crossing[];
  blocks: Block[];
  plazas: Plaza[];
}

/* ---------- Geometry helpers ---------- */

const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const len = (a: Pt) => Math.hypot(a[0], a[1]);

/** A street's length along its centre line */
export function streetLength(s: Street) {
  let n = 0;
  for (let i = 1; i < s.pts.length; i++) n += len(sub(s.pts[i], s.pts[i - 1]));
  return n;
}

/** The point `d` along a street's centre line (clamped to its ends), and the direction it runs there */
export function pointAt(s: Street, d: number): { at: Pt; dir: Pt } {
  let left = Math.max(0, d);
  for (let i = 1; i < s.pts.length; i++) {
    const a = s.pts[i - 1];
    const v = sub(s.pts[i], a);
    const l = len(v);
    if (left <= l || i === s.pts.length - 1) {
      const f = l ? Math.min(1, left / l) : 0;
      return { at: [a[0] + v[0] * f, a[1] + v[1] * f], dir: l ? [v[0] / l, v[1] / l] : [1, 0] };
    }
    left -= l;
  }
  return { at: s.pts[0], dir: [1, 0] };
}

/** How far a point is from a street's centre line */
export function distToStreet(s: Street, p: Pt) {
  let best = Infinity;
  for (let i = 1; i < s.pts.length; i++) {
    const a = s.pts[i - 1];
    const v = sub(s.pts[i], a);
    const l2 = v[0] * v[0] + v[1] * v[1];
    const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * v[0] + (p[1] - a[1]) * v[1]) / l2)) : 0;
    best = Math.min(best, Math.hypot(p[0] - (a[0] + v[0] * t), p[1] - (a[1] + v[1] * t)));
  }
  return best;
}

/**
 * The lanes cars drive along a street: each a centre line offset from the
 * street's and the way traffic runs on it (+1 along the points, -1 against).
 * Drive on the right, as `laneCentres()` in layout.ts. Alleys have none.
 */
export function lanePaths(s: Street): { pts: Pt[]; dir: 1 | -1 }[] {
  if (!s.lanes) return [];
  const inner = s.lanes === 2 ? MEDIAN / 2 : 0;
  const out: { pts: Pt[]; dir: 1 | -1 }[] = [];
  for (let k = 0; k < s.lanes; k++) {
    const off = inner + LANE * (k + 0.5);
    for (const dir of [1, -1] as const) out.push({ pts: offsetLine(s.pts, off * dir), dir });
  }
  return out;
}

/** The side normal of the segment a -> b: travelling along +x it points to +z (the right-hand side of the road) */
const sideOf = (a: Pt, b: Pt): Pt => {
  const v = sub(b, a);
  const l = len(v) || 1;
  return [-v[1] / l, v[0] / l];
};

/** A polyline moved sideways by `d` (to the right-hand side of its direction for d > 0), mitred at bends */
export function offsetLine(pts: Pt[], d: number): Pt[] {
  return pts.map((p, i) => {
    let n: Pt;
    if (i === 0) n = sideOf(pts[0], pts[1]);
    else if (i === pts.length - 1) n = sideOf(pts[i - 1], pts[i]);
    else {
      const n0 = sideOf(pts[i - 1], pts[i]);
      const n1 = sideOf(pts[i], pts[i + 1]);
      const m: Pt = [n0[0] + n1[0], n0[1] + n1[1]];
      const ml = len(m) || 1;
      // Longer at a bend so the lane keeps its width (capped at sharp corners)
      const k = 1 / Math.max(0.3, (m[0] * n0[0] + m[1] * n0[1]) / ml);
      n = [(m[0] / ml) * k, (m[1] / ml) * k];
    }
    return [p[0] + n[0] * d, p[1] + n[1] * d];
  });
}

/** Is a point inside an outline (even-odd rule) */
export function inPoly(poly: Pt[], p: Pt) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** An outline's area, positive when it runs counter-clockwise seen from above (+y) */
export function polyArea(poly: Pt[]) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1]) / 2;
  // Seen from above with x right and z towards the viewer, x-cross-z points down: flip so CCW from above is positive
  return -a;
}

/** The middle of an outline (its vertices' average) */
export const polyCentre = (poly: Pt[]): Pt => [poly.reduce((a, p) => a + p[0], 0) / poly.length, poly.reduce((a, p) => a + p[1], 0) / poly.length];

/** The block a point is on (inside its outline, sidewalk not included), if any */
export const blockAt = (plan: StreetPlan, p: Pt) => plan.blocks.find((b) => inPoly(b.poly, p));

/* ---------- Today's grid as a plan ---------- */

/** A square outline from its min corner, counter-clockwise seen from above */
const square = (ox: number, oz: number, w: number, d = w): Pt[] => [
  [ox, oz],
  [ox, oz + d],
  [ox + w, oz + d],
  [ox + w, oz],
];

const kindOf = (r: Road): StreetKind => (r.lanes === 2 ? 'avenue' : 'street');

/** Landmark spots on the core blocks, by block origin (as landmarks.ts places them) */
const CORE_USE: Record<string, { use: BlockUse; ref?: string }> = {
  '0,0': { use: 'park' },
  '14,14': { use: 'landmark', ref: 'emporium' },
  '28,14': { use: 'landmark', ref: 'shop' },
  '14,28': { use: 'landmark', ref: 'workshop' },
  '0,14': { use: 'landmark', ref: 'vault' },
  '28,28': { use: 'landmark', ref: 'plan' },
  '14,0': { use: 'landmark', ref: 'signal' },
  '0,28': { use: 'landmark', ref: 'telegram' },
  '28,0': { use: 'landmark', ref: 'apartments' },
};

/** Today's city: the straight grid of layout.ts, every road edge to edge */
export function gridPlan(): StreetPlan {
  const [e0, e1] = EXT;
  const streets: Street[] = [
    ...NS_ROADS.map((r, i): Street => ({ id: `ns${i}`, kind: kindOf(r), pts: [[r.c, e0], [r.c, e1]], half: r.half, lanes: r.lanes })),
    ...EW_ROADS.map((r, i): Street => ({ id: `ew${i}`, kind: kindOf(r), pts: [[e0, r.c], [e1, r.c]], half: r.half, lanes: r.lanes })),
  ];
  const crossings: Crossing[] = [];
  NS_ROADS.forEach((nr, i) =>
    EW_ROADS.forEach((er, j) =>
      crossings.push({ id: `x${i}-${j}`, at: [nr.c, er.c], streets: [`ns${i}`, `ew${j}`], lights: CORE_ROADS.includes(nr.c) && CORE_ROADS.includes(er.c) })
    )
  );
  const blocks: Block[] = [
    ...BLOCKS.flatMap((ox) =>
      BLOCKS.map((oz): Block => {
        const u = CORE_USE[`${ox},${oz}`] ?? { use: 'plain' as BlockUse };
        return { id: `core-${ox}-${oz}`, poly: square(ox, oz, BS), use: u.use, ref: u.ref, walk: WALK_W };
      })
    ),
    ...DISTRICTS.map((d): Block => ({ id: `district-${d.id}`, poly: square(d.ox, d.oz, BS), use: 'district', ref: d.id, walk: WALK_W })),
    ...EXTRA_LOTS.map((l, i): Block => {
      const ref = l === GARAGE ? 'garage' : l === MARKET ? 'market' : l === UNITS ? 'units' : `lot-${i - 3}`;
      return { id: `lot-${ref}`, poly: square(l.ox, l.oz, BS), use: 'lot', ref, walk: WALK_W };
    }),
  ];
  return { streets, crossings, blocks, plazas: [] };
}

/** The plan the city is built from */
export const PLAN: StreetPlan = gridPlan();

/** The middle of the city */
export const PLAN_CENTRE: Pt = [CENTER_XZ.x, CENTER_XZ.z];
