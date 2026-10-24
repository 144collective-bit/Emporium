/*
 * Uptown, the financial centre (docs/finance-plan.md, the owner's call;
 * DOM-free, tested in tests/uptown.test.ts): the land west of town between
 * the west ring avenue and the river, from the ring highway to the Parkway
 * (Westlake Park's three strips until Phase 1), becoming a waterfront
 * boulevard and a financial centre with skyscrapers and a plaza. Phase 1 is
 * the land and its streets (this file); the towers are highrise.ts (Phase 2),
 * the plaza plaza.ts (Phase 3), the waterfront boulevard boulevard.ts
 * (Phase 4); the life comes next.
 *
 * - **Its streets** (`UPTOWN_STREETS`): three north-south streets (one lane
 *   each way) from the west ring avenue down to the north bank avenue, in
 *   line with The Trenches' cross streets across the river (`NS_X`), lit
 *   junctions wherever they meet the avenues and the cross streets
 *   (`UPTOWN_CROSSINGS`).
 * - **Its blocks** (`UPTOWN_BLOCKS`): the land between them, in three rows
 *   (n: by the ring avenue, m: the middle, s: on the river), four to a row;
 *   `PLAZA_BLOCK` is the plaza's (plaza.ts).
 * - **The axis** (`AXIS_X`): Westlake Park's Mall carried on south from its
 *   gate through Uptown to the river, a walk-only lane through the blocks
 *   either side of the plaza (`UPTOWN_LANES`) and zebra crossings over the
 *   streets (`AXIS_ZEBRAS`).
 * - **The lots:** the plaza's block and the slivers west of the axis's
 *   lanes are the plaza's (plaza.ts, Phase 3); every other lot is a
 *   tower's (highrise.ts, Phase 2).
 * - **The boulevard's line** (`BOULEVARD_X`): the north bank from Uptown's
 *   west edge to where the town's promenade begins, the esplanade's
 *   (boulevard.ts).
 */
import { EW_ROADS, LANE, RIVER, WALK_W } from './layout';
import { MALL, X0 as WEST, X1 as EAST } from './westlake';
import { PROMENADE } from './outer';

export type Pt = [number, number];
export type Rect = [number, number, number, number];

/** The avenues and cross streets west of town, north to south: the west ring avenue, the cross streets at 17 and 43, the north bank avenue */
export const ROWS_Z = EW_ROADS.filter((r) => r.c < RIVER[0]);
const [RING, CROSS_N, CROSS_S, BANK] = ROWS_Z;
/** Its west and east edges (inside the sidewalks): clear of the highway's slip lanes, and the Parkway's west leg */
export const W = WEST;
export const E = EAST;
/** A street's half width (one lane each way) */
export const STREET_HALF = LANE;

/* ---------- The streets (Phase 5, the redesign: the owner's picks) ---------- */

/**
 * The one-way pair either side of the plaza (x): northbound on its west side, southbound on its east, in line with
 * The Trenches' cross streets across the river; each with a bike lane on its kerb side (`BIKE`)
 */
export const COUPLET = { north: -150, south: -112 };
/** The bike lane's middle and width, right of a one-way street's centre (its one lane is in the middle) */
export const BIKE = { off: 1.2, w: 0.6 };
/** The east street (x), in line with The Trenches' too */
export const EAST_X = -74;
/**
 * Uptown Circle: a roundabout west of the plaza, a monument on its island; its carriageway (one lane, wide) round
 * the centre line at `r`, one way (anticlockwise seen from above, north up: cars give way to it and keep right)
 */
export const CIRCLE = { x: -176, z: 30, r: 4.9, half: 1.5 };
/** The island's kerb, and the outline of the land round it (the carriageway and its sidewalk) */
export const ISLAND_R = CIRCLE.r - CIRCLE.half;
const CIRCLE_OUT = CIRCLE.r + CIRCLE.half + WALK_W;
/** A planted median's width down the middle of a street (the diagonal and Circle Street) */
export const STREET_MEDIAN = 1.2;
const MEDIAN_HALF = LANE + STREET_MEDIAN / 2;
/** The diagonal: from the ring avenue at the one-way pair's southbound street to the east street at the south cross street */
export const DIAG: [Pt, Pt] = [
  [COUPLET.south, RING.c],
  [EAST_X, CROSS_S.c],
];
/** x along the diagonal at z */
const diagX = (z: number) => DIAG[0][0] + ((z - DIAG[0][1]) * (DIAG[1][0] - DIAG[0][0])) / (DIAG[1][1] - DIAG[0][1]);
/** The crescent: a street bowing east between the east street and the Parkway, from the ring avenue to the bank avenue */
export const CRESCENT = { x: -61, bow: 6 };
export const crescentX = (z: number) => CRESCENT.x + CRESCENT.bow * Math.sin((Math.PI * (z - RING.c)) / (BANK.c - RING.c));
/** Its line, every few tiles, through its crossings with the cross streets */
const crescentPts = (): Pt[] => {
  const zs = new Set<number>([RING.c, CROSS_N.c, CROSS_S.c, BANK.c]);
  for (let z = RING.c; z < BANK.c; z += 3) zs.add(z);
  return [...zs].sort((a, b) => a - b).map((z) => [crescentX(z), z]);
};
/** The circle's centre line, anticlockwise seen from above (north up) from its east point, every 15 degrees, closed */
const circlePts = (): Pt[] => Array.from({ length: 25 }, (_, k): Pt => {
  const a = (-k * Math.PI) / 12;
  return [CIRCLE.x + CIRCLE.r * Math.cos(a), CIRCLE.z + CIRCLE.r * Math.sin(a)];
});

export interface UptownStreet {
  id: string;
  kind: 'street';
  pts: Pt[];
  half: number;
  lanes: 1;
  /** One way along its points (1) or against them (-1) */
  oneway?: 1 | -1;
  /** A closed loop (the circle) */
  loop?: boolean;
  /** A planted median down its middle: its lanes either side of it */
  median?: number;
}
const st = (id: string, pts: Pt[], o: Partial<UptownStreet> = {}): UptownStreet => ({ id: `uptown-${id}`, kind: 'street', pts, half: STREET_HALF, lanes: 1, ...o });
export const UPTOWN_STREETS: UptownStreet[] = [
  // The circle's street, north and south of it, and Circle Street east to the one-way pair (the plaza's cross at its end)
  st('circle-n', [
    [CIRCLE.x, RING.c],
    [CIRCLE.x, CROSS_N.c],
    [CIRCLE.x, CIRCLE.z - CIRCLE.r],
  ]),
  st('circle-s', [
    [CIRCLE.x, CIRCLE.z + CIRCLE.r],
    [CIRCLE.x, CROSS_S.c],
    [CIRCLE.x, BANK.c],
  ]),
  st('circle-e', [
    [CIRCLE.x + CIRCLE.r, CIRCLE.z],
    [COUPLET.north, CIRCLE.z],
  ], { half: MEDIAN_HALF, median: STREET_MEDIAN }),
  st('circle', circlePts(), { half: CIRCLE.half, loop: true, oneway: 1 }),
  // The one-way pair
  ...([['ns1', COUPLET.north, -1], ['ns2', COUPLET.south, 1]] as const).map(([id, x, way]) =>
    st(id, [
      [x, RING.c],
      [x, CROSS_N.c],
      ...(x === COUPLET.north ? [[x, CIRCLE.z] as Pt] : []),
      [x, CROSS_S.c],
      [x, BANK.c],
    ], { oneway: way })
  ),
  // The diagonal, its median planted
  st('diag', [DIAG[0], [diagX(CROSS_N.c), CROSS_N.c], DIAG[1]], { half: MEDIAN_HALF, median: STREET_MEDIAN }),
  // The east street, and the crescent
  st('ns3', [
    [EAST_X, RING.c],
    [EAST_X, CROSS_N.c],
    [EAST_X, CROSS_S.c],
    [EAST_X, BANK.c],
  ]),
  st('crescent', crescentPts()),
];
/** The straight north-south streets (x) */
export const NS_X = [CIRCLE.x, COUPLET.north, COUPLET.south, EAST_X];

export interface UptownCrossing {
  id: string;
  at: Pt;
  streets: string[];
  lights: boolean;
}
const ew = (r: (typeof ROWS_Z)[number]) => `ew${EW_ROADS.indexOf(r)}`;
const cx = (id: string, at: Pt, streets: string[], lights = true): UptownCrossing => ({ id: `uptown-${id}`, at, streets, lights });
/** Every junction lit but the circle's (its traffic gives way) */
export const UPTOWN_CROSSINGS: UptownCrossing[] = [
  ...ROWS_Z.flatMap((r) => {
    const at = (x: number): Pt => [x, r.c];
    const out: UptownCrossing[] = [];
    // The circle's street, north and south of it
    out.push(cx(`circle-${ew(r)}`, at(CIRCLE.x), [ew(r), r.c < CIRCLE.z ? 'uptown-circle-n' : 'uptown-circle-s']));
    // The one-way pair (the diagonal leaving the ring avenue where the southbound one does)
    out.push(cx(`ns1-${ew(r)}`, at(COUPLET.north), [ew(r), 'uptown-ns1']));
    out.push(cx(`ns2-${ew(r)}`, at(COUPLET.south), [ew(r), 'uptown-ns2', ...(r === RING ? ['uptown-diag'] : [])]));
    // The diagonal over the north cross street
    if (r === CROSS_N) out.push(cx(`diag-${ew(r)}`, at(diagX(r.c)), [ew(r), 'uptown-diag']));
    // The east street (the diagonal coming in at the south cross street), and the crescent
    out.push(cx(`ns3-${ew(r)}`, at(EAST_X), [ew(r), 'uptown-ns3', ...(r === CROSS_S ? ['uptown-diag'] : [])]));
    out.push(cx(`crescent-${ew(r)}`, at(crescentX(r.c)), [ew(r), 'uptown-crescent']));
    return out;
  }),
  // Round the circle (giving way), and Circle Street meeting the one-way pair
  cx('circle-in-n', [CIRCLE.x, CIRCLE.z - CIRCLE.r], ['uptown-circle-n', 'uptown-circle'], false),
  cx('circle-in-s', [CIRCLE.x, CIRCLE.z + CIRCLE.r], ['uptown-circle-s', 'uptown-circle'], false),
  cx('circle-in-e', [CIRCLE.x + CIRCLE.r, CIRCLE.z], ['uptown-circle-e', 'uptown-circle'], false),
  cx('circle-e-ns1', [COUPLET.north, CIRCLE.z], ['uptown-circle-e', 'uptown-ns1']),
];
/** Where the streets meet a row's avenue or cross street (x), west to east */
export const crossingsOn = (r: (typeof ROWS_Z)[number]) =>
  UPTOWN_CROSSINGS.filter((c) => c.streets.includes(ew(r))).map((c) => c.at[0]).sort((a, b) => a - b);

/* ---------- The blocks ---------- */

export type UptownRow = 'n' | 'm' | 's';
export interface UptownBlock {
  id: string;
  row: UptownRow;
  /** Inside its sidewalk, counter-clockwise seen from above (the plan's way round) */
  poly: Pt[];
  /** Its bounds */
  rect: Rect;
  /** What it is: towers' land, the plaza, a pocket park, the circle's island */
  use: 'towers' | 'plaza' | 'park' | 'island';
}
const rectPoly = ([x0, z0, x1, z1]: Rect): Pt[] => [
  [x0, z0],
  [x0, z1],
  [x1, z1],
  [x1, z0],
];
const boundsOf = (poly: Pt[]): Rect => [Math.min(...poly.map((p) => p[0])), Math.min(...poly.map((p) => p[1])), Math.max(...poly.map((p) => p[0])), Math.max(...poly.map((p) => p[1]))];
/** A street's edge of land: its half, its sidewalk */
const IN = STREET_HALF + WALK_W;
const ROW_Z: Record<UptownRow, [number, number]> = {
  n: [RING.c + RING.half + WALK_W, CROSS_N.c - CROSS_N.half - WALK_W],
  m: [CROSS_N.c + CROSS_N.half + WALK_W, CROSS_S.c - CROSS_S.half - WALK_W],
  s: [CROSS_S.c + CROSS_S.half + WALK_W, BANK.c - BANK.half - WALK_W],
};
/**
 * A block's land left (-1) or right (1) of a street running down it as x = f(z), `off` (horizontal) from its
 * centre line: x0..x1 over the row, the street's edge sampled every `dz` (a straight one only at its ends)
 */
function sideOf(x0: number, x1: number, [z0, z1]: [number, number], f: (z: number) => number, off: (z: number) => number, side: -1 | 1, dz = Infinity): Pt[] {
  const g = (z: number) => f(z) + side * off(z);
  const zs = [z0, z1];
  for (let z = z0 + dz; z < z1 - 0.5; z += dz) zs.push(z);
  // (and exactly where the street's edge leaves the block's sides)
  for (const x of [x0, x1])
    if ((g(z0) - x) * (g(z1) - x) < 0) {
      let [a, b] = [z0, z1];
      for (let k = 0; k < 50; k++) {
        const m = (a + b) / 2;
        if ((g(a) - x) * (g(m) - x) <= 0) b = m;
        else a = m;
      }
      zs.push((a + b) / 2);
    }
  zs.sort((a, b) => a - b);
  // (where it has any width: right of the block's west side for the land left of the street, left of its east side for the land right of it)
  const valid = zs.filter((z) => (side < 0 ? g(z) > x0 - 1e-4 : g(z) < x1 + 1e-4)).map((z): Pt => [Math.min(x1, Math.max(x0, g(z))), z]);
  const ends = [valid[0], valid[valid.length - 1]];
  // Left of it: its west side down, then back up the street's edge; right of it: down the street's edge, back up its east side
  const poly: Pt[] = side < 0 ? [...ends.map((p): Pt => [x0, p[1]]), ...[...valid].reverse()] : [...valid, ...ends.map((p): Pt => [x1, p[1]]).reverse()];
  // (no point twice running)
  return poly.filter((p, i) => Math.hypot(p[0] - poly[(i + 1) % poly.length][0], p[1] - poly[(i + 1) % poly.length][1]) > 1e-6);
}
/** Points round the circle's land from angle a to b (anticlockwise seen from below: increasing angle) */
const arc = (a: number, b: number, n = 8): Pt[] => Array.from({ length: n + 1 }, (_, k): Pt => {
  const t = a + ((b - a) * k) / n;
  return [CIRCLE.x + CIRCLE_OUT * Math.cos(t), CIRCLE.z + CIRCLE_OUT * Math.sin(t)];
});
/** Where a straight edge (x = x or z = z) meets the circle's land, as an angle */
const atX = (x: number, below: boolean) => Math.atan2((below ? 1 : -1) * Math.sqrt(CIRCLE_OUT ** 2 - (x - CIRCLE.x) ** 2), x - CIRCLE.x);
const atZ = (z: number) => Math.atan2(z - CIRCLE.z, Math.sqrt(CIRCLE_OUT ** 2 - (z - CIRCLE.z) ** 2));

const DIAG_OFF = () => (MEDIAN_HALF + WALK_W) * Math.hypot(1, (DIAG[1][0] - DIAG[0][0]) / (DIAG[1][1] - DIAG[0][1]));
const crescentSlope = (z: number) => ((CRESCENT.bow * Math.PI) / (BANK.c - RING.c)) * Math.cos((Math.PI * (z - RING.c)) / (BANK.c - RING.c));
// (a hair more than its sidewalk: the street's line is straight between its points)
const CRESCENT_OFF = (z: number) => (IN + 0.05) * Math.hypot(1, crescentSlope(z));

const block = (id: string, row: UptownRow, poly: Pt[], use: UptownBlock['use'] = 'towers'): UptownBlock => ({ id: `uptown-${id}`, row, poly, rect: boundsOf(poly), use });
/** Between two straight streets (their x), in a row */
const between = (a: number, b: number, row: UptownRow): Rect => [a === W ? W : a + IN, ROW_Z[row][0], b === E ? E : b - IN, ROW_Z[row][1]];

/* ---------- Lay-bys (Phase 5: the kerbside) ---------- */

export type LaybyKind = 'parking' | 'taxi' | 'valet' | 'loading';
export interface Layby {
  id: string;
  kind: LaybyKind;
  /** The block it's cut into, and its side of it (the street it opens off) */
  block: string;
  side: 'n' | 's' | 'e' | 'w';
  /** Along that side, from and to (z for an east or west side, x for a north or south one), and how far in */
  from: number;
  to: number;
  depth: number;
}
/**
 * Bays off the kerb, cut into the blocks (the sidewalk runs round behind them): parking along the circle's street
 * north and south of it, the taxi rank behind the spire, valet lay-bys at the lobbies either side of the plaza (under
 * their porte-cochères: highrise.ts), a loading bay by a service door
 */
export const LAYBYS: Layby[] = [
  { id: 'park-n0w', kind: 'parking', block: 'uptown-n0w', side: 'e', from: 2, to: 12.5, depth: 2.2 },
  { id: 'park-n0e', kind: 'parking', block: 'uptown-n0e', side: 'w', from: 2, to: 12.5, depth: 2.2 },
  { id: 'park-s0w', kind: 'parking', block: 'uptown-s0w', side: 'e', from: 47.5, to: 58, depth: 2.2 },
  { id: 'park-s0e', kind: 'parking', block: 'uptown-s0e', side: 'w', from: 47.5, to: 58, depth: 2.2 },
  { id: 'taxi', kind: 'taxi', block: 'uptown-m1', side: 'e', from: 23.5, to: 36.5, depth: 2 },
  { id: 'valet-n1', kind: 'valet', block: 'uptown-n1', side: 's', from: -135, to: -117, depth: 2 },
  { id: 'valet-s1', kind: 'valet', block: 'uptown-s1', side: 's', from: -135, to: -117, depth: 2 },
  { id: 'loading-m2', kind: 'loading', block: 'uptown-m2w', side: 'w', from: 31.5, to: 38.5, depth: 2.2 },
];
/** A lay-by's asphalt: from the street's edge (the block's edge less its sidewalk) in by its depth */
export function laybyRect(l: Layby): Rect {
  const r = UPTOWN_BLOCKS.find((b) => b.id === l.block)!.rect;
  const edge = l.side === 'w' ? r[0] : l.side === 'e' ? r[2] : l.side === 'n' ? r[1] : r[3];
  const out = l.side === 'w' || l.side === 'n' ? -1 : 1;
  // (the street's edge, past the block's sidewalk; the block's outline has the bay cut in, its sidewalk behind the bay)
  const kerb = edge + out * WALK_W;
  const back = kerb - out * l.depth;
  const [a, b] = [Math.min(kerb, back), Math.max(kerb, back)];
  return l.side === 'w' || l.side === 'e' ? [a, l.from, b, l.to] : [l.from, a, l.to, b];
}
/** An outline with a bay cut into it along one of its straight sides (the sidewalk then runs round behind it) */
function notch(poly: Pt[], l: Layby): Pt[] {
  const vertical = l.side === 'w' || l.side === 'e';
  const xs = poly.map((p) => p[0]);
  const zs = poly.map((p) => p[1]);
  const line = l.side === 'w' ? Math.min(...xs) : l.side === 'e' ? Math.max(...xs) : l.side === 'n' ? Math.min(...zs) : Math.max(...zs);
  const inward = l.side === 'w' || l.side === 'n' ? 1 : -1;
  const on = (p: Pt) => Math.abs((vertical ? p[0] : p[1]) - line) < 1e-6;
  const at = (v: number, d: number): Pt => (vertical ? [line + inward * d, v] : [v, line + inward * d]);
  for (let i = 0; i < poly.length; i++) {
    const [p, q] = [poly[i], poly[(i + 1) % poly.length]];
    if (!on(p) || !on(q)) continue;
    const [pv, qv] = vertical ? [p[1], q[1]] : [p[0], q[0]];
    if (Math.min(pv, qv) > l.from || Math.max(pv, qv) < l.to) continue;
    // In the order this side runs
    const [a, b] = pv < qv ? [l.from, l.to] : [l.to, l.from];
    return [...poly.slice(0, i + 1), at(a, 0), at(a, l.depth), at(b, l.depth), at(b, 0), ...poly.slice(i + 1)];
  }
  throw new Error(`no straight ${l.side} side for ${l.id} on ${l.block}`);
}

export const UPTOWN_BLOCKS: UptownBlock[] = (() => {
  const out: UptownBlock[] = [];
  const [cw, cc] = [CIRCLE.x - IN, CIRCLE.x + IN];
  // West of the circle's street, and east of it to the one-way pair: whole in rows n and s; in row m round the circle
  for (const row of ['n', 's'] as const) {
    out.push(block(`${row}0w`, row, rectPoly(between(W, CIRCLE.x, row))));
    out.push(block(`${row}0e`, row, rectPoly(between(CIRCLE.x, COUPLET.north, row))));
  }
  const [m0, m1] = ROW_Z.m;
  const ce = MEDIAN_HALF + WALK_W;
  out.push(block('m0w', 'm', [[W, m0], [W, m1], [cw, m1], ...arc(atX(cw, true), atX(cw, false) + Math.PI * 2), [cw, m0]]));
  out.push(block('m0n', 'm', [[cc, m0], [cc, CIRCLE.z - Math.sqrt(CIRCLE_OUT ** 2 - IN ** 2)], ...arc(atX(cc, false), atZ(CIRCLE.z - ce)).slice(1, -1), [CIRCLE.x + Math.sqrt(CIRCLE_OUT ** 2 - ce ** 2), CIRCLE.z - ce], [COUPLET.north - IN, CIRCLE.z - ce], [COUPLET.north - IN, m0]]));
  out.push(block('m0s', 'm', [[CIRCLE.x + Math.sqrt(CIRCLE_OUT ** 2 - ce ** 2), CIRCLE.z + ce], ...arc(atZ(CIRCLE.z + ce), atX(cc, true)).slice(1, -1), [cc, CIRCLE.z + Math.sqrt(CIRCLE_OUT ** 2 - IN ** 2)], [cc, m1], [COUPLET.north - IN, m1], [COUPLET.north - IN, CIRCLE.z + ce]]));
  // The circle's island
  out.push(block('circle', 'm', Array.from({ length: 24 }, (_, k): Pt => [CIRCLE.x + (ISLAND_R - WALK_W - 0.06) * Math.cos((k * Math.PI) / 12), CIRCLE.z - (ISLAND_R - WALK_W - 0.06) * Math.sin((k * Math.PI) / 12)]), 'island'));
  // Between the one-way pair: the axis's blocks and the plaza
  for (const row of ['n', 'm', 's'] as const) out.push(block(`${row}1`, row, rectPoly(between(COUPLET.north, COUPLET.south, row)), row === 'm' ? 'plaza' : 'towers'));
  // East of the pair to the east street: cut by the diagonal in rows n and m (a pocket park in the north, the flatiron's wedge in the middle)
  for (const row of ['n', 'm'] as const) {
    const [x0, , x1] = between(COUPLET.south, EAST_X, row);
    out.push(block(`${row}2w`, row, sideOf(x0, x1, ROW_Z[row], diagX, DIAG_OFF, -1), row === 'n' ? 'park' : 'towers'));
    out.push(block(`${row}2e`, row, sideOf(x0, x1, ROW_Z[row], diagX, DIAG_OFF, 1)));
  }
  out.push(block('s2', 's', rectPoly(between(COUPLET.south, EAST_X, 's'))));
  // East of the east street: either side of the crescent
  for (const row of ['n', 'm', 's'] as const) {
    const [x0, , x1] = between(EAST_X, E, row);
    out.push(block(`${row}3`, row, sideOf(x0, x1, ROW_Z[row], crescentX, CRESCENT_OFF, -1, 1.5)));
    out.push(block(`${row}4`, row, sideOf(x0, x1, ROW_Z[row], crescentX, CRESCENT_OFF, 1, 1.5)));
  }
  // The lay-bys cut into them (their bounds stay the block's)
  for (const l of LAYBYS) {
    const b = out.find((o) => o.id === l.block)!;
    b.poly = notch(b.poly, l);
  }
  return out;
})();
/** The plaza's block (Phase 3): the middle row's, on the Mall's axis */
export const PLAZA_BLOCK = 'uptown-m1';

/* ---------- The axis: the Mall carried on to the river ---------- */

/** Westlake Park's Mall, carried on south from its gate on the ring avenue */
export const AXIS_X = MALL.x;
/** The walk-only lanes along it through the blocks either side of the plaza (the plaza is open), half its width */
export const LANE_HALF = 1.6;
export const UPTOWN_LANES: Rect[] = UPTOWN_BLOCKS.filter((b) => b.rect[0] < AXIS_X && b.rect[2] > AXIS_X && b.id !== PLAZA_BLOCK).map((b) => [AXIS_X - LANE_HALF, b.rect[1], AXIS_X + LANE_HALF, b.rect[3]]);
/** Zebra crossings where the axis crosses each avenue and cross street: the road's centre line (z) and half width */
export const AXIS_ZEBRAS: { z: number; half: number }[] = ROWS_Z.map((r) => ({ z: r.c, half: r.half }));

/* ---------- Its lamps and the boulevard's line ---------- */

/** The north bank along Uptown, the esplanade's (boulevard.ts): from Uptown's west edge to where the town's promenade begins */
export const BOULEVARD_X: [number, number] = [W, PROMENADE.x[0]];

/**
 * Street lamps along the avenues and cross streets through Uptown (its own streets' are drawn with them): both sides
 * every 12 (the ring avenue's park side and the bank avenue's river side have their own), clear of the junctions and
 * the axis's zebras; [x, z, ry], the arm reaching over the road
 */
export const UPTOWN_LAMPS: [number, number, number][] = ROWS_Z.flatMap((r, j) =>
  [-1, 1].flatMap((side) => {
    // (the ring avenue's north side is the park's; the bank avenue's south side the promenade's)
    if ((j === 0 && side < 0) || (j === ROWS_Z.length - 1 && side > 0)) return [];
    const z = r.c + side * (r.half + 0.45);
    const out: [number, number, number][] = [];
    for (let x = W + 4; x < E - 3; x += 12) {
      if (crossingsOn(r).some((c) => Math.abs(x - c) < MEDIAN_HALF + WALK_W + 2.5) || Math.abs(x - AXIS_X) < LANE_HALF + 1.5) continue;
      // (nor in a lay-by: its sidewalk runs round behind it)
      if (LAYBYS.some((l) => {
        const b = laybyRect(l);
        return x > b[0] - 0.8 && x < b[2] + 0.8 && z > b[1] - 0.8 && z < b[3] + 0.8;
      })) continue;
      out.push([x, z, Math.atan2(side, 0)]);
    }
    return out;
  })
);

/** Its land, for the outskirts' trees to keep off (x0, z0, x1, z1): the blocks, their streets, and the bank down to the water */
export const UPTOWN_RECT: Rect = [W - WALK_W, ROWS_Z[0].c - ROWS_Z[0].half, E + WALK_W, RIVER[0]];
/** Is a point on Uptown's land */
export const inUptown = (x: number, z: number, m = 0) => x > UPTOWN_RECT[0] - m && x < UPTOWN_RECT[2] + m && z > UPTOWN_RECT[1] - m && z < UPTOWN_RECT[3] + m;
