/*
 * The outer districts as data (DOM-free like layout.ts and downtown.ts, so
 * the 3D city, the street plan, traffic, collisions and the game server all
 * read one layout).
 *
 * Round the north half of the city sweeps the Parkway, a gently bending
 * two-lane street: up the west side, across the north and down the east,
 * meeting the north bank avenue at both ends. Across the river the
 * Southside Loop does the same round the south row. Between the ring and
 * these curves the plots and the Dorras lots sit in big landscaped blocks
 * (cut by the straight arterials and by the curves), with room for four
 * small squares, pocket parks and lawns with trees. Along the river runs the
 * waterfront promenade.
 *
 * The plots and lots keep their 9 x 9 pads where they were (owners'
 * buildings don't move; prices don't change); their blocks round them are
 * what's new.
 *
 * Coordinates are world units on the ground: [x, z].
 */
import { DISTRICTS } from '../../data/plots';
import { BIG_LOTS, BS, EW_ROADS, GARAGE, LANE, MARKET, NS_ROADS, RIVER, RING_HI, SOUTH_ROAD, SOUTH_SHIFT as D, UNITS, WALK_W, nsRuns, type Road } from './layout';
import { LIBERTY_RECTS } from './liberty';
import { HARBOUR_RECT } from './harbour';
import { FIGHT_CLUB } from './fightsite';

export type Pt = [number, number];
/** x0, z0, x1, z1 */
export type Rect = [number, number, number, number];

/** A small, stable random generator (the same city on every load) */
function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- The bending streets ---------- */

/**
 * A soft-cornered U (half a superellipse), centred on (cx, cz) with half
 * sizes A across and B deep: from its west end to its east end, both on the
 * line z = cz and square to it. `dir` -1 bows north, +1 bows south. Points
 * about 2 apart, so its curve reads smooth.
 */
function softU(cx: number, cz: number, A: number, B: number, p: number, dir: -1 | 1): Pt[] {
  const dense: Pt[] = [];
  const n = 3000;
  for (let i = 0; i <= n; i++) {
    const t = Math.PI * (1 - i / n);
    const c = Math.cos(t);
    const s = Math.sin(t);
    dense.push([cx + A * Math.sign(c) * Math.abs(c) ** (2 / p), cz + dir * B * Math.abs(s) ** (2 / p)]);
  }
  const cum = [0];
  for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const L = cum.at(-1)!;
  const steps = Math.round(L / 2);
  const out: Pt[] = [];
  let j = 0;
  for (let k = 0; k <= steps; k++) {
    const s = (L * k) / steps;
    while (j < dense.length - 2 && cum[j + 1] < s) j++;
    const f = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    out.push([dense[j][0] + (dense[j + 1][0] - dense[j][0]) * f, dense[j][1] + (dense[j + 1][1] - dense[j][1]) * f]);
  }
  // Exactly on the avenue at both ends
  out[0] = [cx - A, cz];
  out[out.length - 1] = [cx + A, cz];
  return out;
}

/** Where the curves are centred (between the west districts and the big lots) and how far they reach */
const U = { cx: 42, A: 82, p: 4 };
/** The Parkway: round the north half, from the north bank avenue (west of W3) to the north bank avenue (east of the big lots), about 40 north of the ring */
export const PARKWAY = softU(U.cx, RING_HI, U.A, 104, U.p, -1);
/** The Southside Loop: round the south row, from the south bank avenue and back */
export const SOUTHSIDE = softU(U.cx, SOUTH_ROAD, U.A, 30, U.p, 1);
/** The bending streets: one lane each way, kerbs and sidewalks either side */
export const BENDS: { id: string; name: string; pts: Pt[]; centre: Pt }[] = [
  { id: 'parkway', name: 'The Parkway', pts: PARKWAY, centre: [U.cx, RING_HI] },
  { id: 'southside', name: 'Southside Loop', pts: SOUTHSIDE, centre: [U.cx, SOUTH_ROAD] },
];
/** How far a bending street's asphalt and sidewalk reach from its centre line */
export const BEND_REACH = LANE + WALK_W;

/* ---------- Polygon helpers ---------- */

/** Keep the part of a convex outline on the side of a line where dot(p - a, n) >= 0 */
function clipHalf(poly: Pt[], a: Pt, n: Pt): Pt[] {
  const out: Pt[] = [];
  const side = (p: Pt) => (p[0] - a[0]) * n[0] + (p[1] - a[1]) * n[1];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const sp = side(p);
    const sq = side(q);
    if (sp >= 0) out.push(p);
    if (sp >= 0 !== sq >= 0) {
      const t = sp / (sp - sq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}
/** Each segment of a bend, with the normal that points into the town (towards its centre) */
function inward(b: (typeof BENDS)[number]) {
  return b.pts.slice(1).map((q, i) => {
    const p = b.pts[i];
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    let n: Pt = [-(q[1] - p[1]) / l, (q[0] - p[0]) / l];
    const mid: Pt = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    if ((b.centre[0] - mid[0]) * n[0] + (b.centre[1] - mid[1]) * n[1] < 0) n = [-n[0], -n[1]];
    return { p, q, n };
  });
}
/** A rectangle, kept to the town side of a bend and clear of its asphalt and sidewalk (the bends are convex, so this is a convex outline) */
function insideBend(r: Rect, b: (typeof BENDS)[number]): Pt[] {
  let poly: Pt[] = [
    [r[0], r[1]],
    [r[0], r[3]],
    [r[2], r[3]],
    [r[2], r[1]],
  ];
  for (const { p, n } of inward(b)) poly = clipHalf(poly, [p[0] + n[0] * BEND_REACH, p[1] + n[1] * BEND_REACH], n);
  // Drop corners that landed on top of each other
  return poly.filter((p, i) => Math.hypot(p[0] - poly[(i + 1) % poly.length][0], p[1] - poly[(i + 1) % poly.length][1]) > 1e-6);
}
/** Even-odd inside test */
export function inside(poly: Pt[], p: Pt) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
/** Distance from a point to an outline's edges */
export function edgeDist(poly: Pt[], p: Pt) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j];
    const [bx, bz] = poly[i];
    const vx = bx - ax;
    const vz = bz - az;
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * vx + (p[1] - az) * vz) / (vx * vx + vz * vz || 1)));
    best = Math.min(best, Math.hypot(p[0] - ax - vx * t, p[1] - az - vz * t));
  }
  return best;
}
/** Counter-clockwise seen from above (as streetplan.ts counts it) */
function ccw(poly: Pt[]): Pt[] {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  return a > 0 ? [...poly].reverse() : poly;
}

/* ---------- The pads: plots and lots keep their 9 x 9 squares ---------- */

export interface Pad {
  id: string;
  kind: 'plot' | 'lot';
  rect: Rect;
}
const lotName = (l: { ox: number; oz: number }) =>
  l === GARAGE ? 'garage' : l === MARKET ? 'market' : l === UNITS ? 'units' : `lot-${BIG_LOTS.indexOf(l as (typeof BIG_LOTS)[number])}`;
export const PADS: Pad[] = [
  ...DISTRICTS.map((d): Pad => ({ id: d.id, kind: 'plot', rect: [d.ox, d.oz, d.ox + BS, d.oz + BS] })),
  ...[GARAGE, MARKET, UNITS, ...BIG_LOTS].map((l): Pad => ({ id: lotName(l), kind: 'lot', rect: [l.ox, l.oz, l.ox + BS, l.oz + BS] })),
];

/* ---------- The blocks ---------- */

const FAR = 400;
const edges = (r: Road): [number, number] => [r.c - r.half - WALK_W, r.c + r.half + WALK_W];
const NS = [...NS_ROADS].sort((a, b) => a.c - b.c).map(edges);
const EW = EW_ROADS.filter((r) => r.c < RIVER[0])
  .sort((a, b) => a.c - b.c)
  .map(edges);
/** The spans between the straight roads (x for the north-south ones, z for the east-west ones north of the river) */
const spans = (cuts: [number, number][]): [number, number][] => [[-FAR, cuts[0][0]], ...cuts.slice(1).map((c, i): [number, number] => [cuts[i][1], c[0]]), [cuts.at(-1)![1], FAR]];
const COLS = spans(NS);
const ROWS = spans(EW);
const southEdge = SOUTH_ROAD + EW_ROADS.find((r) => r.c === SOUTH_ROAD)!.half + WALK_W;

export interface OuterBlock {
  id: string;
  /** Counter-clockwise outline, inside its sidewalk */
  poly: Pt[];
  /** The plots and lots on it */
  pads: string[];
}
const names = ['w', 'a', 'b', 'c', 'e'];
const rawBlocks: { id: string; rect: Rect; bend: (typeof BENDS)[number] }[] = [
  // North of the ring: the corners and the three between the arterials
  ...COLS.map((c, i) => ({ id: `o-n${names[i]}`, rect: [c[0], -FAR, c[1], ROWS[0][1]] as Rect, bend: BENDS[0] })),
  // West and east of the ring, between the cross streets (down to the north bank avenue)
  ...ROWS.slice(1, -1).flatMap((r, i) => [
    { id: `o-w${names[i + 1]}`, rect: [-FAR, r[0], COLS[0][1], r[1]] as Rect, bend: BENDS[0] },
    { id: `o-e${names[i + 1]}`, rect: [COLS.at(-1)![0], r[0], FAR, r[1]] as Rect, bend: BENDS[0] },
  ]),
  // The south bank, between the arterials
  ...COLS.map((c, i) => ({ id: `o-s${names[i]}`, rect: [c[0], southEdge, c[1], FAR] as Rect, bend: BENDS[1] })),
];
export const OUTER_BLOCKS: OuterBlock[] = rawBlocks.map(({ id, rect, bend }) => {
  const poly = ccw(insideBend(rect, bend));
  const pads = PADS.filter((p) => [p.rect[0] + 0.01, p.rect[2] - 0.01].every((x) => [p.rect[1] + 0.01, p.rect[3] - 0.01].every((z) => inside(poly, [x, z])))).map((p) => p.id);
  return { id, poly, pads };
});
export const blockOf = (id: string) => OUTER_BLOCKS.find((b) => b.id === id)!;

/* ---------- The small squares and the pocket parks ---------- */

export type SquareFeature = 'fountain' | 'statue' | 'bandstand' | 'clock';
export interface OuterSquare {
  id: string;
  name: string;
  block: string;
  rect: Rect;
  feature: SquareFeature;
}
/** One small square on each side of town, each round its own centrepiece */
export const OUTER_SQUARES: OuterSquare[] = [
  { id: 'north', name: 'North Square', block: 'o-nb', rect: [22.5, -32, 37.5, -21.5], feature: 'fountain' },
  { id: 'west', name: 'West Green', block: 'o-wb', rect: [-33, 23, -22, 37], feature: 'statue' },
  { id: 'east', name: 'East Square', block: 'o-ea', rect: [81.5, 1.2, 93.5, 13.3], feature: 'bandstand' },
  // (South of the river: written before it was widened, so its z adds layout.ts SOUTH_SHIFT)
  { id: 'south', name: 'South Square', block: 'o-sb', rect: [23, 96.5 + D, 37, 105 + D], feature: 'clock' },
];
export interface PocketPark {
  id: string;
  block: string;
  rect: Rect;
  trees: Pt[];
  benches: { at: Pt; ry: number }[];
}
const parkRects: { id: string; block: string; rect: Rect }[] = [
  { id: 'nw', block: 'o-nw', rect: [-26.5, -16.5, -20, -10.2] },
  { id: 'ne', block: 'o-ne', rect: [83, -27, 99, -12] },
  // (South of the river) Behind Liberty Bridge's south tower, where the loop's bend leaves room
  { id: 'sw', block: 'o-sw', rect: [-32, 93.5 + D, -22.5, 98.5 + D] },
  // East of the Fight Club's lot (fightsite.ts FIGHT_CLUB, x 95-109), which took its old spot
  { id: 'se', block: 'o-se', rect: [110.5, 85.5 + D, 118.5, 95 + D] },
];
export const OUTER_PARKS: PocketPark[] = parkRects.map((p, i) => {
  const r = rng(700 + i);
  const [x0, z0, x1, z1] = p.rect;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const trees: Pt[] = [];
  for (let x = x0 + 1; x < x1 - 0.8; x += 2.1)
    for (let z = z0 + 1; z < z1 - 0.8; z += 2.1) {
      const t: Pt = [x + (r() - 0.5) * 1.1, z + (r() - 0.5) * 1.1];
      // A clearing in the middle with the benches
      if (Math.hypot(t[0] - cx, t[1] - cz) > 2.6) trees.push(t);
    }
  const benches = [0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a) => ({ at: [cx + Math.sin(a) * 1.6, cz + Math.cos(a) * 1.6] as Pt, ry: a + Math.PI }));
  return { ...p, trees, benches };
});

/* ---------- Lawns: trees across the rest of each block ---------- */

const clearOf = (p: Pt, r: Rect, m: number) => p[0] < r[0] - m || p[0] > r[2] + m || p[1] < r[1] - m || p[1] > r[3] + m;
/** The Fight Club's lot on the south bank (fightclub.ts paves it): no lawn tree on it */
const FIGHT_LOT: Rect = [FIGHT_CLUB.x0, FIGHT_CLUB.z0, FIGHT_CLUB.x1, FIGHT_CLUB.z1];
/** Trees on the open lawns of the outer blocks (not on the pads, the squares, the parks or the Fight Club) */
export const LAWN_TREES: Pt[] = OUTER_BLOCKS.flatMap((b, i) => {
  const r = rng(900 + i);
  const xs = b.poly.map((p) => p[0]);
  const zs = b.poly.map((p) => p[1]);
  const out: Pt[] = [];
  const blocked = [
    ...PADS.filter((p) => b.pads.includes(p.id)).map((p) => p.rect),
    ...OUTER_SQUARES.filter((s) => s.block === b.id).map((s) => s.rect),
    ...parkRects.filter((s) => s.block === b.id).map((s) => s.rect),
    ...(inside(b.poly, [FIGHT_LOT[0] + 0.1, FIGHT_LOT[1] + 0.1]) ? [FIGHT_LOT] : []),
    // Liberty Bridge's towers, stairs and walkway (liberty.ts)
    ...LIBERTY_RECTS,
  ];
  for (let x = Math.min(...xs) + 1.5; x < Math.max(...xs) - 1.5; x += 2.9)
    for (let z = Math.min(...zs) + 1.5; z < Math.max(...zs) - 1.5; z += 2.9) {
      if (r() < 0.38) continue;
      const t: Pt = [x + (r() - 0.5) * 2, z + (r() - 0.5) * 2];
      if (inside(b.poly, t) && edgeDist(b.poly, t) > 1.3 && blocked.every((q) => clearOf(t, q, 1.4))) out.push(t);
    }
  return out;
});

/* ---------- The outer sidewalks of the bends ---------- */

/** Is a point on (or by) a straight road's asphalt and sidewalk */
const onRoad = ([x, z]: Pt) =>
  NS_ROADS.some((r, i) => Math.abs(x - r.c) < r.half + WALK_W && nsRuns(i, z)) ||
  EW_ROADS.some((r) => Math.abs(z - r.c) < r.half + WALK_W);
/** Which segments of each bend have their outer sidewalk (the rest cross a road): one flag per segment */
export const KERB_RUNS: boolean[][] = BENDS.map((b) =>
  inward(b).map(({ p, q, n }) => {
    const o: Pt = [-n[0], -n[1]];
    return ![p, q].some((c) => [LANE, BEND_REACH].some((d) => onRoad([c[0] + o[0] * d, c[1] + o[1] * d])));
  })
);
/** Which way is out of town from each bend (+1: to the right of its points' direction, as offsetLine counts it) */
export const OUTSIDE: (1 | -1)[] = BENDS.map((b) => {
  const { p, q, n } = inward(b)[Math.floor(b.pts.length / 2)];
  const right: Pt = [-(q[1] - p[1]), q[0] - p[0]];
  return right[0] * n[0] + right[1] * n[1] > 0 ? -1 : 1;
});

/**
 * The sidewalk on the outside of each bend (the town side is its blocks'
 * own): one short slab per segment, left out where it would cross a road
 * (world.ts draws them as one continuous kerb).
 */
export const BEND_KERBS: Pt[][] = BENDS.flatMap((b, bi) =>
  inward(b).flatMap(({ p, q, n }, si) => {
    if (!KERB_RUNS[bi][si]) return [];
    const o: Pt = [-n[0], -n[1]];
    const quad: Pt[] = [
      [p[0] + o[0] * LANE, p[1] + o[1] * LANE],
      [q[0] + o[0] * LANE, q[1] + o[1] * LANE],
      [q[0] + o[0] * BEND_REACH, q[1] + o[1] * BEND_REACH],
      [p[0] + o[0] * BEND_REACH, p[1] + o[1] * BEND_REACH],
    ];
    return [ccw(quad)];
  })
);

/* ---------- The waterfront promenade ---------- */

const northBank = EW_ROADS.find((r) => r.c === RING_HI)!;
const southBank = EW_ROADS.find((r) => r.c === SOUTH_ROAD)!;
/** The promenades either side of the river (z from the avenue's kerb to the water) and how far they run */
export const PROMENADE = {
  north: [northBank.c + northBank.half, RIVER[0] - 0.25] as [number, number],
  south: [RIVER[1] + 0.25, southBank.c - southBank.half] as [number, number],
  x: [U.cx - U.A - 2, U.cx + U.A + 2] as [number, number],
};
/** Jetties out over the water (boats tie up at them) */
export const JETTIES: { x: number; bank: 'north' | 'south' }[] = [
  { x: 31, bank: 'north' },
  { x: 92, bank: 'north' },
  { x: 55, bank: 'south' },
];
/** Off the bridges: a promenade feature at x is clear of every road crossing the river (layout.ts `BRIDGED_NS`: Harbour Bridge, its anchorages and its towers' piers, harbour.ts) */
export const offBridges = (x: number, m = 0.8) => x < HARBOUR_RECT[0] - m || x > HARBOUR_RECT[2] + m;
/** Clear of Liberty Bridge's supports on the promenades (liberty.ts): benches, trees in planters and lamps keep off */
export const offFootbridge = (x: number, m = 0.8) => LIBERTY_RECTS.every((r) => x < r[0] - m || x > r[2] + m);

/* ---------- The built-up town ---------- */

const closedParkway = [...PARKWAY];
const closedSouthside = [...SOUTHSIDE];
/** Inside the town: within the Parkway or the Southside Loop, or the river and its banks between them */
export const inTown = (p: Pt, m = 0) =>
  inside(closedParkway, p) ||
  inside(closedSouthside, p) ||
  (p[0] > PROMENADE.x[0] - m && p[0] < PROMENADE.x[1] + m && p[1] > RING_HI - m && p[1] < SOUTH_ROAD + m) ||
  BENDS.some((b) => b.pts.some((q, i) => i > 0 && segDist(b.pts[i - 1], q, p) < BEND_REACH + m));
function segDist(a: Pt, b: Pt, p: Pt) {
  const vx = b[0] - a[0];
  const vz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / (vx * vx + vz * vz || 1)));
  return Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vz * t);
}

/* ---------- What stands on the squares (shared with solids.ts and the scene) ---------- */

export interface SquareLayout {
  square: OuterSquare;
  centre: Pt;
  /** The centrepiece's footprint (half its size) and height, for walking round it */
  feature: { half: number; h: number };
  /** Trees in planters at the corners */
  planters: Pt[];
  /** Benches round the centrepiece, the sitter facing it */
  benches: { at: Pt; ry: number }[];
  /** A kiosk on one side (x0, z0, x1, z1) */
  kiosk: Rect | null;
  lamps: Pt[];
  /** Light bollards in pairs marking the north and south ways in */
  bollards: Pt[];
  /** Flush uplights in a ring round the centrepiece, lit at night */
  uplights: Pt[];
}
const FEATURE: Record<SquareFeature, { half: number; h: number }> = {
  fountain: { half: 1.4, h: 0.55 },
  statue: { half: 0.7, h: 1.2 },
  bandstand: { half: 2.0, h: 0.4 },
  clock: { half: 0.6, h: 5.2 },
};
export const SQUARE_LAYOUTS: SquareLayout[] = OUTER_SQUARES.map((sq) => {
  const [x0, z0, x1, z1] = sq.rect;
  const centre: Pt = [(x0 + x1) / 2, (z0 + z1) / 2];
  const feature = FEATURE[sq.feature];
  const planters: Pt[] = [
    [x0 + 1, z0 + 1],
    [x1 - 1, z0 + 1],
    [x1 - 1, z1 - 1],
    [x0 + 1, z1 - 1],
  ];
  const ring = feature.half + 1.6;
  const benches = [0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a) => ({ at: [centre[0] + Math.sin(a) * ring, centre[1] + Math.cos(a) * ring] as Pt, ry: a + Math.PI }));
  // A kiosk at the middle of the west side, where there's room
  const kiosk: Rect | null = sq.feature === 'fountain' || sq.feature === 'clock' ? [x0 + 0.4, centre[1] - 1.1, x0 + 2.0, centre[1] + 1.1] : null;
  const lamps: Pt[] = [
    [x0 + 0.4, centre[1] + (kiosk ? 2.2 : 0)],
    [x1 - 0.4, centre[1]],
  ];
  const bollards: Pt[] = [z0 + 0.35, z1 - 0.35].flatMap((z) => [-0.9, 0.9].map((dx): Pt => [centre[0] + dx, z]));
  const up = feature.half + 0.45;
  const uplights = Array.from({ length: 8 }, (_, i): Pt => [centre[0] + Math.sin((i * Math.PI) / 4 + Math.PI / 8) * up, centre[1] + Math.cos((i * Math.PI) / 4 + Math.PI / 8) * up]);
  return { square: sq, centre, feature, planters, benches, kiosk, lamps, bollards, uplights };
});
/** What's solid on the outer squares: each centrepiece, the corner planters, the kiosks and the light bollards */
export const SQUARE_SOLIDS: Footprint[] = SQUARE_LAYOUTS.flatMap((l) => [
  [l.centre[0] - l.feature.half, l.centre[1] - l.feature.half, l.centre[0] + l.feature.half, l.centre[1] + l.feature.half, l.feature.h] as Footprint,
  ...l.planters.map(([x, z]): Footprint => [x - 0.45, z - 0.45, x + 0.45, z + 0.45, 0.5]),
  ...(l.kiosk ? [[...l.kiosk, 2.1] as Footprint] : []),
  ...l.bollards.map(([x, z]): Footprint => [x - 0.09, z - 0.09, x + 0.09, z + 0.09, 0.55]),
]);
/** x0, z0, x1, z1, height (solids.ts `Box`) */
export type Footprint = [number, number, number, number, number];
