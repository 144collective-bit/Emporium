/*
 * The street plan as data: streets (centre lines with a kind and a width),
 * the crossings where they meet, the blocks between them as outlines, and
 * the plazas. DOM-free and scene-free, like layout.ts, so the 3D city, the
 * world map, traffic, pedestrians, collisions, the plots and the game
 * server can all read one plan.
 *
 * `gridPlan()` describes the straight grid of layout.ts (edge-to-edge
 * streets, square blocks). `PLAN` is the city as built: the grid outside
 * downtown, and downtown (downtown.ts) with its diagonals, triangle blocks,
 * walk-only alleys, pocket parks and the hangout square
 * (docs/city-plan.md).
 *
 * Coordinates are world units on the ground: [x, z].
 */
import { BLOCKS, BRIDGED_NS, BS, CORE_ROADS, DISTRICTS, EW_ROADS, EXT, EXTRA_LOTS, GARAGE, LANE, MARKET, MEDIAN, NS_ROADS, RIVER, RING_HI, SEATS, SHORT_NS, SOUTH_ROAD, UNITS, WALK_W, nsRuns, nsStreet, type Road } from './layout';
import { ALLEYS, BLOCKS_DT, DIAGONALS, LANES } from './downtown';
import { BENDS, BEND_KERBS, OUTER_BLOCKS, OUTER_PARKS, OUTER_SQUARES, PADS } from './outer';
import { AIRPORT_CROSSINGS, AIRPORT_STREETS, GA_CROSSINGS, GA_ROAD, GA_STREETS, ROAD } from './airfield';
import { HALF as HARBOUR_HALF, HARBOUR_STREET } from './harbour';
import { HIGHWAY, HIGHWAY_HALF, insideHighway, outerLane, slipCurve } from './highway';
import { TRENCH_BLOCKS, TRENCH_CROSSINGS, TRENCH_STREETS } from './trenches';
import { WESTLAKE_BLOCKS } from './westlake';
import { UPTOWN_BLOCKS, UPTOWN_CROSSINGS, UPTOWN_LANES, UPTOWN_STREETS } from './uptown';
import { NORTH_BLOCK } from './uptownnorth';
import { BLOCK as STADIUM_BLOCK, STADIUM_CROSSINGS, STADIUM_STREETS } from './stadium';
import { KART_CROSSINGS, KART_STREETS } from './kartpark';
import { COURT, MALL_BLOCK, MALL_CROSSINGS, MALL_STREETS, PARK_BLOCK } from './mall';
import { CREST_BLOCKS, CREST_CROSSINGS, CREST_STREETS } from './crestmont';

export type Pt = [number, number];

/**
 * - street: one lane each way
 * - avenue: two lanes each way with a median
 * - highway: the ring highway (highway.ts), an avenue with a hard shoulder and no sidewalks
 * - slip: a one-way slip lane across a corner where the highway meets an arterial
 * - alley: walk-only, no cars (cars never route along it)
 */
export type StreetKind = 'street' | 'avenue' | 'highway' | 'slip' | 'alley';

export interface Street {
  id: string;
  kind: StreetKind;
  /** The centre line, at least two points; straight between them */
  pts: Pt[];
  /** Half the paved width (asphalt for streets and avenues, the lane for an alley) */
  half: number;
  /** Lanes each way (0 for an alley) */
  lanes: 0 | 1 | 2;
  /** A closed loop: its last point is its first (the highway) */
  loop?: boolean;
  /** Traffic runs one way only: along its points (1) or against them (-1); it then has one lane, down its middle */
  oneway?: 1 | -1;
  /** A street's planted median (its width): its one lane each way runs either side of it */
  median?: number;
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
  /** The landmarks on a downtown block (their spot ids) */
  places?: string[];
  /** The plots and lots on an outer block (outer.ts PADS) */
  pads?: string[];
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
  /** Every block's raised slab (`slabOf()`), in the same order */
  slabs: Pt[][];
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
  // (squared distances, rooted once: it's asked a great many times as the city is worked out)
  let best = Infinity;
  for (let i = 1; i < s.pts.length; i++) {
    const a = s.pts[i - 1];
    const b = s.pts[i];
    const vx = b[0] - a[0];
    const vz = b[1] - a[1];
    const l2 = vx * vx + vz * vz;
    const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / l2)) : 0;
    const dx = p[0] - (a[0] + vx * t);
    const dz = p[1] - (a[1] + vz * t);
    const d2 = dx * dx + dz * dz;
    if (d2 < best) best = d2;
  }
  return Math.sqrt(best);
}

/**
 * The lanes cars drive along a street: each a centre line offset from the
 * street's and the way traffic runs on it (+1 along the points, -1 against).
 * Drive on the right, as `laneCentres()` in layout.ts. Alleys have none.
 */
export function lanePaths(s: Street): { pts: Pt[]; dir: 1 | -1 }[] {
  if (!s.lanes) return [];
  if (s.oneway) return [{ pts: s.pts, dir: s.oneway }];
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

/**
 * A convex outline grown by `d` on every side (its sidewalk round it). Corners
 * of 90 degrees or more are mitred; sharper ones (a triangle's 45-degree tips)
 * are cut square across, so the sidewalk doesn't spike out into the crossing.
 */
export function outset(poly: Pt[], d: number): Pt[] {
  const n = poly.length;
  // Outward normal of edge i -> i+1 (counter-clockwise from above: outward is to the right of travel, sideOf)
  const nrm = poly.map((p, i) => sideOf(p, poly[(i + 1) % n]));
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p = poly[i];
    const a = nrm[(i + n - 1) % n];
    const b = nrm[i];
    const cos = a[0] * b[0] + a[1] * b[1];
    if (cos >= -1e-9) {
      // 90 degrees or wider: one mitred corner
      const m: Pt = [a[0] + b[0], a[1] + b[1]];
      const k = d / (1 + cos);
      out.push([p[0] + m[0] * k, p[1] + m[1] * k]);
    } else {
      // A sharp tip: two corners, each straight out from its own edge
      out.push([p[0] + a[0] * d, p[1] + a[1] * d], [p[0] + b[0] * d, p[1] + b[1] * d]);
    }
  }
  return out;
}

/** A block's raised slab: its lot and the sidewalk round it */
export const slabOf = (b: Block): Pt[] => outset(b.poly, b.walk);
/** Is a point on a raised slab (a lot or its sidewalk) */
export const onSlab = (plan: StreetPlan, p: Pt) => plan.slabs.some((s) => inPoly(s, p));

/* ---------- The grid, and the city as built ---------- */

/** A square outline from its min corner, counter-clockwise seen from above */
const square = (ox: number, oz: number, w: number, d = w): Pt[] => [
  [ox, oz],
  [ox, oz + d],
  [ox + w, oz + d],
  [ox + w, oz],
];

const kindOf = (r: Road): StreetKind => (r.lanes === 2 ? 'avenue' : 'street');

/**
 * The straight streets of layout.ts, every one edge to edge; but the north-south roads with no bridge (river plan
 * step 1) stop at the bank avenues, a street each side of the river (`nsStreet()`), and the short ones start at the
 * Parkway (`SHORT_NS`: the mall's land past it, docs/mall-plan.md)
 */
function gridStreets(): Street[] {
  const [e0, e1] = EXT;
  const parkway = BENDS.find((b) => b.id === 'parkway')!.pts;
  return [
    ...NS_ROADS.flatMap((r, i): Street[] => {
      const s = (id: string, z0: number, z1: number): Street => ({ id, kind: kindOf(r), pts: [[r.c, z0], [r.c, z1]], half: r.half, lanes: r.lanes });
      const top = i in SHORT_NS ? Math.min(...crossingsOf(parkway, 0, r.c).map((p) => p[1])) : e0;
      return BRIDGED_NS.includes(i) ? [s(`ns${i}`, top, e1)] : [s(`ns${i}`, top, RING_HI), s(`ns${i}s`, SOUTH_ROAD, e1)];
    }),
    ...EW_ROADS.map((r, i): Street => ({ id: `ew${i}`, kind: kindOf(r), pts: [[e0, r.c], [e1, r.c]], half: r.half, lanes: r.lanes })),
  ];
}

/** A crossing wherever a north-south and an east-west road meet; lights where downtown's cross streets meet */
function gridCrossings(): Crossing[] {
  const out: Crossing[] = [];
  NS_ROADS.forEach((nr, i) =>
    EW_ROADS.forEach((er, j) => out.push({ id: `x${i}-${j}`, at: [nr.c, er.c], streets: [nsStreet(i, er.c), `ew${j}`], lights: CORE_ROADS.includes(nr.c) && CORE_ROADS.includes(er.c) }))
  );
  return out;
}

const outerBlocks = (): Block[] => [
  ...DISTRICTS.map((d): Block => ({ id: `district-${d.id}`, poly: square(d.ox, d.oz, BS), use: 'district', ref: d.id, walk: WALK_W })),
  ...EXTRA_LOTS.map((l, i): Block => {
    const ref = l === GARAGE ? 'garage' : l === MARKET ? 'market' : l === UNITS ? 'units' : `lot-${i - 3}`;
    return { id: `lot-${ref}`, poly: square(l.ox, l.oz, BS), use: 'lot', ref, walk: WALK_W };
  }),
];

const withSlabs = (p: Omit<StreetPlan, 'slabs'>): StreetPlan => ({ ...p, slabs: p.blocks.map(slabOf) });

/** The straight grid: 3 x 3 square blocks between the streets of layout.ts */
export function gridPlan(): StreetPlan {
  return withSlabs({
    streets: gridStreets(),
    crossings: gridCrossings(),
    blocks: [...BLOCKS.flatMap((ox) => BLOCKS.map((oz): Block => ({ id: `core-${ox}-${oz}`, poly: square(ox, oz, BS), use: 'plain', walk: WALK_W }))), ...outerBlocks()],
    plazas: [],
  });
}

/** Landmark spot ids by their old block on the drawing grid (layout.ts SEATS) */
const SPOT_OF: Record<string, string> = {
  '11,11': 'emporium',
  '11,0': 'signal',
  '22,0': 'apartments',
  '0,22': 'telegram',
  '0,11': 'vault',
  '22,11': 'shop',
  '11,22': 'workshop',
  '22,22': 'plan',
};

/** Where a polyline crosses the line x = c (axis 0) or z = c (axis 1) */
function crossingsOf(pts: Pt[], axis: 0 | 1, c: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1][axis] - c;
    const b = pts[i][axis] - c;
    if (a === 0 || (a < 0) !== (b < 0)) {
      const t = a === b ? 0 : a / (a - b);
      const p: Pt = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
      if (!out.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.5)) out.push(p);
    }
  }
  if (pts.at(-1)![axis] === c && !out.some((q) => Math.hypot(q[0] - pts.at(-1)![0], q[1] - pts.at(-1)![1]) < 0.5)) out.push(pts.at(-1)!);
  return out;
}

/**
 * The city as built: the grid's streets, downtown's diagonals, blocks,
 * alleys and squares, and the outer districts (outer.ts): the Parkway and
 * the Southside Loop, the landscaped blocks round the plots and lots, their
 * squares and pocket parks.
 */
/**
 * The highway's junctions whose outer corners get slip lanes too: where an arterial past it carries traffic (the north
 * roads to the stadium and the kart park, and to the airport since docs/airport-plan.md Phase 3: the south bank avenue
 * east to Airport Drive, the east ring avenue south to the GA road; and Crestmont's Flats since its Phase 2:
 * downtown's east-west roads east past the highway, crestmont.ts; but never one over the river's promenade, as the bank
 * avenue's corner on the water would be)
 */
export const OUTER_SLIPS = ['highway-ns0-1', 'highway-ns3-0', 'highway-ns3-1', 'highway-ew4-0', 'highway-ew0-0', 'highway-ew1-0', 'highway-ew2-0', 'highway-ew3-0'];

export function cityPlan(): StreetPlan {
  const streets = gridStreets();
  const crossings = gridCrossings();
  for (const d of DIAGONALS) {
    streets.push({ id: d.id, kind: 'street', pts: [d.from, d.to], half: LANE, lanes: 1 });
    // Each end is a crossing of the grid already (a ring corner, a cross-street junction)
    for (const end of [d.from, d.to]) crossings.find((c) => c.at[0] === end[0] && c.at[1] === end[1])!.streets.push(d.id);
  }
  // The bending streets: a crossing (no lights) wherever one meets a straight road, ends included
  for (const b of BENDS) {
    streets.push({ id: b.id, kind: 'street', pts: b.pts, half: LANE, lanes: 1 });
    NS_ROADS.forEach((r, i) => crossingsOf(b.pts, 0, r.c).forEach((at, k) => crossings.push({ id: `${b.id}-ns${i}-${k}`, at, streets: [nsStreet(i, at[1]), b.id], lights: false })));
    EW_ROADS.forEach((r, i) => crossingsOf(b.pts, 1, r.c).forEach((at, k) => crossings.push({ id: `${b.id}-ew${i}-${k}`, at, streets: [`ew${i}`, b.id], lights: false })));
  }
  // The airport's drive off the south bank avenue east of the highway, and the forecourt's one-way loop off its end, up
  // over the departures deck and back (airfield.ts)
  for (const a of AIRPORT_STREETS) streets.push({ id: a.id, kind: 'street', pts: a.pts, half: ROAD.half, lanes: 1, ...(a.oneway ? { oneway: a.oneway } : {}) });
  for (const c of AIRPORT_CROSSINGS) crossings.push({ ...c, lights: false });
  for (const a of GA_STREETS) streets.push({ id: a.id, kind: 'street', pts: a.pts, half: GA_ROAD.half, lanes: 1, ...(a.oneway ? { oneway: a.oneway } : {}) });
  for (const c of GA_CROSSINGS) crossings.push({ ...c, lights: false });
  // Stadium Road off the north road past the highway, and the one-way loop round the stadium's car park (stadium.ts)
  for (const t of STADIUM_STREETS) streets.push({ id: t.id, kind: 'street', pts: t.pts, half: t.half, lanes: 1, ...(t.oneway ? { oneway: t.oneway } : {}) });
  for (const c of STADIUM_CROSSINGS) crossings.push({ id: c.id, at: c.at, streets: [...c.streets], lights: false });
  // Kart Road off the east ring avenue past the highway, and the one-way loop round the kart park's car park (kartpark.ts)
  for (const t of KART_STREETS) streets.push({ id: t.id, kind: 'street', pts: t.pts, half: t.half, lanes: 1, ...(t.oneway ? { oneway: t.oneway } : {}) });
  for (const c of KART_CROSSINGS) crossings.push({ id: c.id, at: c.at, streets: [...c.streets], lights: false });
  // Crestmont (crestmont.ts, docs/crestmont-plan.md Phase 2): the Flats' streets across the east-west roads past the
  // highway, Foothill Road, and the hill roads up from it
  for (const t of CREST_STREETS) streets.push({ id: t.id, kind: 'street', pts: t.pts, half: t.half, lanes: 1, ...(t.median ? { median: t.median } : {}) });
  for (const c of CREST_CROSSINGS) crossings.push({ id: c.id, at: c.at, streets: [...c.streets], lights: c.lights });
  // The mall's two-way loop off the north avenue past the Parkway (mall.ts, docs/mall-plan.md)
  for (const t of MALL_STREETS) streets.push({ id: t.id, kind: 'street', pts: t.pts, half: t.half, lanes: 1 });
  for (const c of MALL_CROSSINGS) crossings.push({ id: c.id, at: c.at, streets: [...c.streets], lights: false });
  // The ring highway (highway.ts): a lit junction wherever it meets a straight arterial, and on the town
  // side of each, slip lanes for the right turns on and off it (and on the outside too where an arterial past
  // it carries traffic: the north road to the stadium, `OUTER_SLIPS`)
  streets.push({ id: 'highway', kind: 'highway', pts: HIGHWAY, half: HIGHWAY_HALF, lanes: 2, loop: true });
  const meets: { id: string; at: Pt; road: Road; street: string; along: 0 | 1 }[] = [];
  NS_ROADS.forEach((r, i) =>
    crossingsOf(HIGHWAY, 0, r.c).forEach((at, k) => nsRuns(i, at[1]) && meets.push({ id: `highway-ns${i}-${k}`, at, road: r, street: nsStreet(i, at[1]), along: 1 }))
  );
  EW_ROADS.forEach((r, i) => crossingsOf(HIGHWAY, 1, r.c).forEach((at, k) => meets.push({ id: `highway-ew${i}-${k}`, at, road: r, street: `ew${i}`, along: 0 })));
  for (const m of meets) {
    crossings.push({ id: m.id, at: m.at, streets: [m.street, 'highway'], lights: true });
    // The arterial runs along z (along 1) or x; the highway, square to it there, the other way
    const ta: Pt = m.along === 1 ? [0, 1] : [1, 0];
    const th: Pt = m.along === 1 ? [1, 0] : [0, 1];
    const turns: [Pt, number, number][] = [
      [ta, outerLane(m.road.lanes), outerLane(2)],
      [[-ta[0], -ta[1]], outerLane(m.road.lanes), outerLane(2)],
      [th, outerLane(2), outerLane(m.road.lanes)],
      [[-th[0], -th[1]], outerLane(2), outerLane(m.road.lanes)],
    ];
    turns.forEach(([uA, offA, offB], k) => {
      const pts = slipCurve(m.at, uA, offA, [-uA[1], uA[0]], offB);
      // Only on the town side: the arterials past the highway carry no traffic yet
      // (none from the north bank avenue towards the river: its corner there is the promenade's)
      const overWater = m.along === 0 && m.road.c < RIVER[0] && m.road.c + m.road.half + 3 > RIVER[0] && pts.some((p) => p[1] > m.at[1] + 0.5);
      if (insideHighway(...pts[3]) || (OUTER_SLIPS.includes(m.id) && !overWater)) streets.push({ id: `slip-${m.id}-${k}`, kind: 'slip', pts, half: 1.2, lanes: 1, oneway: 1 });
    });
  }
  // The Trenches (trenches.ts, growth plan Phase 9): Trench Avenue, its cross streets and Bottom Street, south-west of town
  for (const t of TRENCH_STREETS) streets.push({ id: t.id, kind: t.kind, pts: t.pts, half: t.half, lanes: t.lanes });
  for (const c of TRENCH_CROSSINGS) crossings.push({ id: c.id, at: c.at, streets: c.streets, lights: c.lights });
  // Uptown (uptown.ts, the financial centre, redesigned in Phase 5): the circle and its streets, the one-way pair,
  // the diagonal, the east street and the crescent, every junction lit but the circle's; the Mall's axis through its
  // blocks as walk-only lanes
  for (const t of UPTOWN_STREETS)
    streets.push({ id: t.id, kind: t.kind, pts: t.pts, half: t.half, lanes: t.lanes, ...(t.oneway ? { oneway: t.oneway } : {}), ...(t.loop ? { loop: true } : {}), ...(t.median ? { median: t.median } : {}) });
  for (const c of UPTOWN_CROSSINGS) crossings.push({ id: c.id, at: c.at, streets: [...c.streets], lights: c.lights });
  UPTOWN_LANES.forEach(([x0, z0, x1, z1], i) =>
    streets.push({
      id: `uptown-lane${i}`,
      kind: 'alley',
      pts: [
        [(x0 + x1) / 2, z0],
        [(x0 + x1) / 2, z1],
      ],
      half: (x1 - x0) / 2,
      lanes: 0,
    })
  );
  // Alleys and lanes: walk-only, from the street front through to the back
  [...ALLEYS.map((a) => a.box), ...LANES].forEach((b, i) => {
    const [x0, z0, x1, z1] = b;
    const alongX = x1 - x0 > z1 - z0;
    const pts: Pt[] = alongX
      ? [
          [x0, (z0 + z1) / 2],
          [x1, (z0 + z1) / 2],
        ]
      : [
          [(x0 + x1) / 2, z0],
          [(x0 + x1) / 2, z1],
        ];
    streets.push({ id: `alley${i}`, kind: 'alley', pts, half: (alongX ? z1 - z0 : x1 - x0) / 2, lanes: 0 });
  });
  const inside = (b: { poly: Pt[] }, [x, z]: [number, number]) => inPoly(b.poly, [x + BS / 2, z + BS / 2]);
  const blocks: Block[] = [
    ...BLOCKS_DT.map((b): Block => {
      const places = Object.entries(SPOT_OF)
        .filter(([k]) => inside(b, SEATS[k]))
        .map(([, id]) => id);
      const use: BlockUse = b.use === 'infill' ? 'plain' : b.use;
      return { id: `dt-${b.id}`, poly: b.poly, use, places: places.length ? places : undefined, walk: WALK_W };
    }),
    // The outer blocks, named after their first plot (or lot), every pad on them listed
    ...OUTER_BLOCKS.map((b): Block => {
      const plot = b.pads.find((id) => PADS.find((p) => p.id === id)!.kind === 'plot');
      return { id: b.id, poly: b.poly, use: plot ? 'district' : 'lot', ref: plot ?? b.pads[0], pads: b.pads, walk: WALK_W };
    }),
    // The Trenches' blocks (rows A, B and C), built on in the next steps
    ...TRENCH_BLOCKS.map((b): Block => ({ id: b.id, poly: b.poly, use: 'plain', ref: 'trenches', walk: WALK_W })),
    // Westlake Park's block (westlake.ts, growth plan Phase 9b), west of town
    ...WESTLAKE_BLOCKS.map((b): Block => ({ id: b.id, poly: b.poly, use: 'park', ref: 'westlake', walk: WALK_W })),
    // Uptown's blocks (uptown.ts) south of it, the plaza's among them
    ...UPTOWN_BLOCKS.map((b): Block => ({ id: b.id, poly: b.poly, use: b.use === 'plaza' ? 'plaza' : b.use === 'park' || b.use === 'island' ? 'park' : 'plain', ref: 'uptown', walk: WALK_W })),
    // ...and Uptown North's on Palm Court's old land between the park and the north avenue (uptownnorth.ts)
    { id: NORTH_BLOCK.id, poly: NORTH_BLOCK.poly, use: 'plain', ref: 'uptown', walk: WALK_W },
    // The stadium's block north of the highway (stadium.ts, the north side's stage 1)
    { id: 'stadium', poly: square(STADIUM_BLOCK[0], STADIUM_BLOCK[1], STADIUM_BLOCK[2] - STADIUM_BLOCK[0], STADIUM_BLOCK[3] - STADIUM_BLOCK[1]), use: 'plain', ref: 'stadium', walk: WALK_W },
    // The mall's block and its car parks inside the loop, north of downtown past the Parkway, and Palm Court across the east ring avenue (mall.ts)
    ...(
      [
        ['palm-court', COURT, 'plaza'],
        ['mall', MALL_BLOCK, 'plain'],
        ['mall-park', PARK_BLOCK, 'lot'],
      ] as const
    ).map(([id, r, use]): Block => ({ id, poly: square(r[0], r[1], r[2] - r[0], r[3] - r[1]), use, ref: 'mall', walk: WALK_W })),
    // Crestmont's Flats (crestmont.ts)
    ...CREST_BLOCKS.map((b): Block => ({ id: b.id, poly: square(b.rect[0], b.rect[1], b.rect[2] - b.rect[0], b.rect[3] - b.rect[1]), use: 'plain', ref: 'crestmont', walk: WALK_W })),
    // The bends' outer sidewalks (their own outline is the sidewalk)
    ...BEND_KERBS.map((poly, i): Block => ({ id: `kerb-${i}`, poly, use: 'plain', walk: 0 })),
  ];
  const plazas: Plaza[] = [
    ...BLOCKS_DT.filter((b) => b.use === 'plaza' || b.use === 'park').map((b): Plaza => ({ id: b.id, kind: b.use === 'plaza' ? 'hangout' : 'park', poly: b.poly })),
    ...OUTER_SQUARES.map((q): Plaza => ({ id: `square-${q.id}`, kind: 'square', poly: square(q.rect[0], q.rect[1], q.rect[2] - q.rect[0], q.rect[3] - q.rect[1]) })),
    ...OUTER_PARKS.map((q): Plaza => ({ id: `park-${q.id}`, kind: 'park', poly: square(q.rect[0], q.rect[1], q.rect[2] - q.rect[0], q.rect[3] - q.rect[1]) })),
  ];
  return withSlabs({ streets, crossings, blocks, plazas });
}

/** The plan the city is built from */
export const PLAN: StreetPlan = cityPlan();

/**
 * The river and its bridges, from the plan (growth plan Phase 5): where it
 * runs (x, edge to edge) and, for each street that crosses it, the span its
 * bridge takes (x0, x1, the sidewalks included), west to east
 */
export function riverCrossings(plan: StreetPlan = PLAN) {
  return { run: [...EXT] as [number, number], bridges: riverBridges(plan).map((b): [number, number] => [b.x0, b.x1]) };
}

/**
 * Every bridge over the river, west to east: each street that crosses it on
 * a north-south stretch, its centre and half width, and the span it takes
 * (x0, x1, its sidewalks included; the highway's bridge carries a footway
 * each side too)
 */
export function riverBridges(plan: StreetPlan = PLAN) {
  const out: { street: string; c: number; half: number; x0: number; x1: number }[] = [];
  for (const s of plan.streets) {
    if (s.kind === 'alley') continue;
    for (let i = 1; i < s.pts.length; i++) {
      const [a, b] = [s.pts[i - 1], s.pts[i]];
      if (a[0] !== b[0] || Math.min(a[1], b[1]) >= RIVER[0] || Math.max(a[1], b[1]) <= RIVER[1]) continue;
      // (Harbour Bridge is wider than its avenue: its footways along its outer edges, harbour.ts)
      const w = s.id === HARBOUR_STREET ? HARBOUR_HALF : s.half + WALK_W;
      out.push({ street: s.id, c: a[0], half: s.half, x0: a[0] - w, x1: a[0] + w });
    }
  }
  return out.sort((p, q) => p.x0 - q.x0);
}

