/*
 * The Trenches (docs/growth-plan.md Phase 9, the owner's call; DOM-free,
 * tested in tests/trenches.test.ts): a neighbourhood of projects in the
 * style of Brooklyn on the south-west quadrant inside the ring highway,
 * from the south bank avenue down to the highway, and from the highway's
 * west side to the town's south row and the west ring avenue. It's where the
 * storyline will start (later).
 *
 * Step 1 is its streets and its blocks (this file), its traffic (routes.ts
 * reads the plan) and the metro's el over Trench Avenue (metro.ts); the
 * towers, brownstones, The Block and the corner shops come in the next steps.
 *
 * - **Trench Avenue** (`AVENUE_Z`): an avenue (two lanes each way and a
 *   median, the el's pillars stand in it) from the west ring avenue to West
 *   Street.
 * - **Cross streets** (`NS_X`, one lane each way): north to the south bank
 *   avenue (where the south row's bend leaves room), south to Bottom Street.
 * - **East-west streets** (`EW_Z`): two through the projects, and Bottom
 *   Street along the highway side.
 * - **Blocks** (`TRENCH_BLOCKS`): the land between them, inside their
 *   sidewalks, in rows A (Trench Avenue's north side, nearest the town), B
 *   (the projects) and C (the strip along the highway); the corner by the
 *   highway's bend is a block cut by it. Row W (the grit's step 2) is the
 *   strip between West Street and the highway.
 */
import { EW_ROADS, LANE, NS_ROADS, WALK_W, WIDEN, nsStreet } from './layout';
import { HIGHWAY_BOX, HIGHWAY_HALF, HIGHWAY_R } from './highway';

export type Pt = [number, number];

/** The south bank avenue (the district's north edge) and the west ring avenue (its east edge, south of the south row) */
export const BANK = EW_ROADS[EW_ROADS.length - 1];
export const RING_W = NS_ROADS[0];
/** How far the district keeps from the highway's centre line (its half, a shoulder and a verge) */
export const HIGHWAY_CLEAR = HIGHWAY_HALF + 6;
/** The highway's south-west bend: its centre and how far from it the district may reach */
const [HX0, , , HZ1] = HIGHWAY_BOX;
export const BEND_C: Pt = [HX0 + HIGHWAY_R, HZ1 - HIGHWAY_R];
export const BEND_REACH = HIGHWAY_R - HIGHWAY_CLEAR;

/** Trench Avenue's centre line (z), half width and lanes: an avenue like the ring's */
export const AVENUE_Z = 130 + WIDEN;
export const AVENUE_HALF = RING_W.half;
/** Its west end: West Street */
export const WEST_X = -188;
/** The cross streets (x), west to east; a street's half width */
export const NS_X = [WEST_X, -150, -112, -74, -36];
export const STREET_HALF = LANE;
/** The east-west streets through the projects and Bottom Street (z), north to south */
export const EW_Z = [176 + WIDEN, 216 + WIDEN];
export const BOTTOM_Z = 250 + WIDEN;
/** Where the cross streets north of Trench Avenue stop: the ones west of the south row's bend run up to the bank avenue */
const NORTH_TO_BANK = (x: number) => x <= -74;

export interface TrenchStreet {
  id: string;
  kind: 'avenue' | 'street';
  pts: Pt[];
  half: number;
  lanes: 1 | 2;
}

/** How far down a cross street runs: to Bottom Street, or (inside the highway's bend) to the last east-west street it reaches */
const southEnd = (x: number) => {
  const reach = (z: number) => Math.hypot(Math.min(0, x - BEND_C[0]), Math.max(0, z - BEND_C[1])) <= BEND_REACH - STREET_HALF - WALK_W;
  return [BOTTOM_Z, ...EW_Z.slice().reverse(), AVENUE_Z].find(reach)!;
};
/** How far west an east-west street runs: to West Street, or to the first cross street that reaches it */
const westEnd = (z: number) => NS_X.find((x) => southEnd(x) >= z)!;

export const TRENCH_STREETS: TrenchStreet[] = [
  { id: 'trench-ave', kind: 'avenue', pts: [[RING_W.c, AVENUE_Z], [WEST_X, AVENUE_Z]], half: AVENUE_HALF, lanes: 2 },
  ...NS_X.map((x, i): TrenchStreet => ({ id: `trench-ns${i}`, kind: 'street', pts: [[x, NORTH_TO_BANK(x) ? BANK.c : AVENUE_Z], [x, southEnd(x)]], half: STREET_HALF, lanes: 1 })),
  ...EW_Z.map((z, i): TrenchStreet => ({ id: `trench-ew${i}`, kind: 'street', pts: [[RING_W.c, z], [westEnd(z), z]], half: STREET_HALF, lanes: 1 })),
  { id: 'trench-bottom', kind: 'street', pts: [[RING_W.c, BOTTOM_Z], [westEnd(BOTTOM_Z), BOTTOM_Z]], half: STREET_HALF, lanes: 1 },
];

/** Where its streets meet each other and the avenues round it: [x, z], the streets, and whether there are lights */
export interface TrenchCrossing {
  id: string;
  at: Pt;
  streets: string[];
  lights: boolean;
}
export const TRENCH_CROSSINGS: TrenchCrossing[] = (() => {
  const out: TrenchCrossing[] = [];
  const ew = TRENCH_STREETS.filter((s) => s.pts[0][1] === s.pts[1][1]);
  const ns = TRENCH_STREETS.filter((s) => s.pts[0][0] === s.pts[1][0]);
  const span = (a: number, b: number, v: number) => v >= Math.min(a, b) - 1e-6 && v <= Math.max(a, b) + 1e-6;
  for (const e of ew) {
    const z = e.pts[0][1];
    // Its east end on the west ring avenue (Trench Avenue's lit: two avenues meet)
    out.push({ id: `${e.id}-ring`, at: [RING_W.c, z], streets: [nsStreet(0, z), e.id], lights: e.kind === 'avenue' });
    for (const n of ns) {
      const x = n.pts[0][0];
      if (span(e.pts[0][0], e.pts[1][0], x) && span(n.pts[0][1], n.pts[1][1], z)) out.push({ id: `${n.id}-${e.id}`, at: [x, z], streets: [n.id, e.id], lights: e.kind === 'avenue' });
    }
  }
  // The cross streets that run up to the bank avenue
  for (const n of ns) if (n.pts[0][1] === BANK.c) out.push({ id: `${n.id}-bank`, at: [n.pts[0][0], BANK.c], streets: [`ew${EW_ROADS.length - 1}`, n.id], lights: false });
  return out;
})();

export type Row = 'A' | 'B' | 'C' | 'W';
export interface TrenchBlock {
  id: string;
  row: Row;
  /** Inside its sidewalk, counter-clockwise seen from above */
  poly: Pt[];
}

/** A rectangle's outline (inside its sidewalk), counter-clockwise from above */
const rect = (x0: number, z0: number, x1: number, z1: number): Pt[] => [
  [x0, z0],
  [x0, z1],
  [x1, z1],
  [x1, z0],
];
/** The edges a block keeps from the streets round it: the half width and the sidewalk */
const IN = STREET_HALF + WALK_W;
const IN_AVE = AVENUE_HALF + WALK_W;

/** The highway's bend cutting a block's south-west corner: the corner replaced by points along the bend, inside it */
function cutByBend(x0: number, z0: number, x1: number, z1: number): Pt[] {
  const r = BEND_REACH - WALK_W;
  const inside = (x: number, z: number) => Math.hypot(Math.min(0, x - BEND_C[0]), Math.max(0, z - BEND_C[1])) <= r;
  if (inside(x0, z1)) return rect(x0, z0, x1, z1);
  // Round the corner: from the west edge where it meets the bend, along the bend, to the south edge
  const pts: Pt[] = [[x0, z0]];
  const zw = BEND_C[1] + Math.sqrt(Math.max(0, r * r - (x0 - BEND_C[0]) ** 2));
  const xs = BEND_C[0] - Math.sqrt(Math.max(0, r * r - (z1 - BEND_C[1]) ** 2));
  const a0 = Math.atan2(zw - BEND_C[1], x0 - BEND_C[0]);
  const a1 = Math.atan2(z1 - BEND_C[1], xs - BEND_C[0]);
  const n = 8;
  for (let k = 0; k <= n; k++) {
    const a = a0 + ((a1 - a0) * k) / n;
    pts.push([BEND_C[0] + Math.cos(a) * r, BEND_C[1] + Math.sin(a) * r]);
  }
  pts.push([x1, z1], [x1, z0]);
  return pts;
}

/** The south row's bend reaches out to here (x) at the bank avenue: row A stops short of it */
export const ROW_A_EAST = -48;

export const TRENCH_BLOCKS: TrenchBlock[] = (() => {
  const out: TrenchBlock[] = [];
  const cols = [...NS_X, RING_W.c];
  // Row A: between the bank avenue and Trench Avenue, west of the south row's bend
  const aCols = [...NS_X.filter((x) => x < ROW_A_EAST), ROW_A_EAST];
  for (let i = 0; i < aCols.length - 1; i++) {
    const x0 = aCols[i] + IN;
    const x1 = i === aCols.length - 2 ? aCols[i + 1] : aCols[i + 1] - IN;
    out.push({ id: `trench-a${i}`, row: 'A', poly: rect(x0, BANK.c + BANK.half + WALK_W, x1, AVENUE_Z - IN_AVE) });
  }
  // Rows B: between Trench Avenue, the east-west streets and Bottom Street
  const bands: [number, number][] = [
    [AVENUE_Z + IN_AVE, EW_Z[0] - IN],
    [EW_Z[0] + IN, EW_Z[1] - IN],
    [EW_Z[1] + IN, BOTTOM_Z - IN],
  ];
  bands.forEach(([z0, z1], j) => {
    for (let i = 0; i < cols.length - 1; i++) {
      const x0 = cols[i] + IN;
      const x1 = i === cols.length - 2 ? cols[i + 1] - IN_AVE : cols[i + 1] - IN;
      // (where its west street stops short, the highway's bend may cut its corner)
      out.push({ id: `trench-b${j}-${i}`, row: 'B', poly: cutByBend(x0, z0, x1, z1) });
    }
  });
  // Row C: the strip between Bottom Street and the highway
  const bottomWest = westEnd(BOTTOM_Z);
  const cz0 = BOTTOM_Z + IN;
  const cz1 = HZ1 - HIGHWAY_CLEAR - WALK_W;
  for (let i = cols.indexOf(bottomWest); i < cols.length - 1; i++) {
    const x0 = cols[i] + IN;
    // (the last stops short of the slip lane off the highway onto the west ring avenue)
    const x1 = i === cols.length - 2 ? cols[i + 1] - IN_AVE - 7 : cols[i + 1] - IN;
    out.push({ id: `trench-c${i}`, row: 'C', poly: i === cols.indexOf(bottomWest) ? cutByBend(x0, cz0, x1, cz1) : rect(x0, cz0, x1, cz1) });
  }
  // Row W (step 2 of the grit): the strip between West Street and the highway, from the bank avenue down to where
  // the highway starts to bend (the gritty low commercial: streetwall.ts); its north end clear of the slip lane
  // off the highway onto the bank avenue
  out.push({ id: 'trench-w0', row: 'W', poly: rect(HX0 + HIGHWAY_CLEAR + WALK_W, BANK.c + BANK.half + WALK_W + 2.5, WEST_X - IN, BEND_C[1]) });
  return out;
})();

/** Its land, for the outskirts' trees to keep off (x0, z0, x1, z1) */
export const TRENCH_RECT: [number, number, number, number] = [HX0 + HIGHWAY_HALF + 1, BANK.c + BANK.half, RING_W.c - RING_W.half, HZ1 - HIGHWAY_HALF - 1];
/** Is a point on The Trenches' land (its rectangle, short of the highway's bend) */
export const inTrenches = (x: number, z: number, m = 0) => {
  const [x0, z0, x1, z1] = TRENCH_RECT;
  if (x < x0 - m || x > x1 + m || z < z0 - m || z > z1 + m) return false;
  return Math.hypot(Math.min(0, x - BEND_C[0]), Math.max(0, z - BEND_C[1])) <= HIGHWAY_R - HIGHWAY_HALF - 1 + m;
};

/**
 * The Trenches' street lights (the grit step, the owner's call): sodium
 * orange inside the district, a few flickering and the odd one dead, picked
 * from where each stands so it's the same every visit; null outside it (the
 * town's own white lamps)
 */
export type LampKind = 'sodium' | 'flicker' | 'dead';
export function lampKind(x: number, z: number): LampKind | null {
  if (!inTrenches(x, z)) return null;
  const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  const u = h - Math.floor(h);
  return u < 0.06 ? 'dead' : u < 0.16 ? 'flicker' : 'sodium';
}
