/*
 * Southbank Docks (the owner's name; growth plan Phase 9c, docs/docks-plan.md; the owner's call: a working port on
 * the south bank west of The Trenches, past the ring highway). Phase 1: the land, the streets and the quays. DOM-free: the street plan
 * (streetplan.ts `cityPlan()`), the river (river.ts: the frontage a straight quay), walking (walk.ts `inBasin()`),
 * driving (drive-sim.ts `BASIN_WALLS`), the trees (outskirts.ts), the world map and the drawing (world.ts at the boot:
 * the basin's water and its walls, the blocks; docks3d.ts as you approach: the streets and the quays' dressing) read it.
 *
 * - **The streets** (`DOCK_STREETS`): the south bank avenue carried on from the highway's west side as the docks'
 *   main road, with traffic now (a slip lane on the junction's south-west corner, streetplan.ts `OUTER_SLIPS`); the
 *   docks' ring off it (`docks-ring`: Dock Road south at `DOCK_X`, Yard Road west at `YARD_Z`, West Road north at
 *   `WEST_X` back to the avenue) and Quay Road across it (`QUAY_Z`) along the basin's south side. One lane each way.
 * - **The basin** (`BASIN`): a dock cut into the south bank, its mouth (`CHANNEL`) open to the river under the
 *   avenue, which crosses it on a flat bridge (`DOCK_BRIDGE`) at the street's height; stone quay walls all round
 *   it down to the water (river.ts `WATER_Y`). The river's boat lanes run past its mouth untouched.
 * - **The blocks** (`DOCK_BLOCKS`): the west quay (the container terminal in Phase 3) and the east quay (the old
 *   docks), each round its side of the basin to the avenue; the basin's south quay a sidewalk along Quay Road; the
 *   bridge's own sidewalk; the yards south of Quay Road. Worn concrete, a sidewalk round each.
 * - **Lamps** (`DOCK_LAMPS`): sodium, along the sidewalks (world.ts).
 *
 * Fixed world numbers, today's (south of the river after both widenings: no `SOUTH_SHIFT` / `WIDEN` to add), and
 * well short of the world's edge (x -420 today, -680 in the wide test), so nothing reads the edge. Names are made up.
 */
import { EW_ROADS, LANE, RIVER, SOUTH_ROAD, WALK_W } from './layout';

type Pt = [number, number];
export type Rect = [number, number, number, number];

/** The district's name (the owner's): its signs, its place and its metro station */
export const DOCKS_NAME = 'Southbank Docks';

/** The south bank avenue (the docks' main road) */
const AVENUE = EW_ROADS.find((r) => r.c === SOUTH_ROAD)!;
/** Its south kerb (z) */
export const AVENUE_KERB = AVENUE.c + AVENUE.half;

/** Dock Road, West Road (x), Quay Road and Yard Road (z): the docks' streets, one lane each way */
export const DOCK_X = -248;
export const WEST_X = -396;
export const QUAY_Z = 202.5;
export const YARD_Z = 286;
export const HALF = LANE;

/** The basin (x0, z0, x1, z1): its water between quay walls */
export const BASIN: Rect = [-345, 148, -275, QUAY_Z - HALF - WALK_W];
/** Its mouth from the river (the quay line) in to the basin, under the avenue's bridge */
export const CHANNEL: Rect = [-316, RIVER[1], -302, BASIN[1]];
/** The avenue's bridge over the mouth: from the quay line to the far side of its own sidewalk */
export const DOCK_BRIDGE: Rect = [CHANNEL[0], RIVER[1], CHANNEL[2], AVENUE_KERB + WALK_W];
/** The water open to the sky: the basin and the mouth south of the bridge */
export const OPEN_WATER: Rect[] = [BASIN, [CHANNEL[0], DOCK_BRIDGE[3], CHANNEL[2], CHANNEL[3]]];

/** The docks' land (the trees keep off; the drawing's district) */
export const DOCKS_RECT: Rect = [WEST_X - HALF - 4, RIVER[1], DOCK_X + HALF + 4, YARD_Z + HALF + 4];
export const inDocks = (x: number, z: number, m = 0) => x > DOCKS_RECT[0] - m && x < DOCKS_RECT[2] + m && z > DOCKS_RECT[1] - m && z < DOCKS_RECT[3] + m;
/** The river's south bank along the docks' frontage, a straight quay (river.ts `BANKS` keeps off it): x */
export const DOCKS_QUAY: [number, number] = [DOCKS_RECT[0] - 4, DOCKS_RECT[2]];

const inRect = (r: Rect, x: number, z: number, m: number) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
/** Is x, z in the basin's water open to the sky (`m` further in from its edges; negative reaches out past them) */
export const inBasin = (x: number, z: number, m = 0) => OPEN_WATER.some((r) => inRect(r, x, z, -m));
/** Is x, z on the avenue's bridge over the mouth */
export const onDockBridge = (x: number, z: number) => inRect(DOCK_BRIDGE, x, z, 0);

/** What a car stops at (drive-sim.ts): the open water, a wall each (x0, z0, x1, z1, height) */
export const BASIN_WALLS: [number, number, number, number, number][] = OPEN_WATER.map((r) => [r[0], r[1], r[2], r[3], 2]);

/* ---------- The streets ---------- */

export interface DockStreet {
  id: string;
  name: string;
  pts: Pt[];
  half: number;
}
export const DOCK_STREETS: DockStreet[] = [
  {
    id: 'docks-ring',
    name: 'Dock Road',
    pts: [
      [DOCK_X, SOUTH_ROAD],
      [DOCK_X, YARD_Z],
      [WEST_X, YARD_Z],
      [WEST_X, SOUTH_ROAD],
    ],
    half: HALF,
  },
  {
    id: 'docks-quay',
    name: 'Quay Road',
    pts: [
      [WEST_X, QUAY_Z],
      [DOCK_X, QUAY_Z],
    ],
    half: HALF,
  },
];
/** The ring's three sides' names (made up), for the map and the signs */
export const SIDE_NAMES = { east: 'Dock Road', south: 'Yard Road', west: 'West Road' } as const;

export interface DockCrossing {
  id: string;
  at: Pt;
  streets: string[];
  lights: boolean;
}
export const DOCK_CROSSINGS: DockCrossing[] = [
  // The ring off the avenue: lit where Dock Road meets it (nearest the highway), and at West Road
  { id: 'docks-ew4-e', at: [DOCK_X, SOUTH_ROAD], streets: ['ew4', 'docks-ring'], lights: true },
  { id: 'docks-ew4-w', at: [WEST_X, SOUTH_ROAD], streets: ['ew4', 'docks-ring'], lights: true },
  // Quay Road across it
  { id: 'docks-quay-e', at: [DOCK_X, QUAY_Z], streets: ['docks-ring', 'docks-quay'], lights: false },
  { id: 'docks-quay-w', at: [WEST_X, QUAY_Z], streets: ['docks-ring', 'docks-quay'], lights: false },
];

/* ---------- The blocks ---------- */

/** A block's outline (inside its sidewalk), counter-clockwise from above as streetplan.ts's (west side going south first) */
const rect = (x0: number, z0: number, x1: number, z1: number): Pt[] => [
  [x0, z0],
  [x0, z1],
  [x1, z1],
  [x1, z0],
];
const W = WALK_W;
/** The blocks' edges against the streets: the avenue's south kerb, the ring's and Quay Road's kerbs, a sidewalk in */
const N = AVENUE_KERB + W;
const X0 = WEST_X + HALF + W;
const X1 = DOCK_X - HALF - W;
const QN = QUAY_Z - HALF - W;
const QS = QUAY_Z + HALF + W;
const S = YARD_Z - HALF - W;

export interface DockBlock {
  id: string;
  poly: Pt[];
  /** The sidewalk round it (0: the block is all sidewalk) */
  walk: number;
}
export const DOCK_BLOCKS: DockBlock[] = [
  // The west quay: from West Road round the basin's west side and the mouth's (its sidewalk the quay's edge)
  {
    id: 'docks-west',
    poly: [
      [X0, N],
      [X0, QN],
      [BASIN[0] - W, QN],
      [BASIN[0] - W, BASIN[1] - W],
      [CHANNEL[0] - W, BASIN[1] - W],
      [CHANNEL[0] - W, N],
    ],
    walk: W,
  },
  // The east quay: the mirror of it, to Dock Road
  {
    id: 'docks-east',
    poly: [
      [CHANNEL[2] + W, N],
      [CHANNEL[2] + W, BASIN[1] - W],
      [BASIN[2] + W, BASIN[1] - W],
      [BASIN[2] + W, QN],
      [X1, QN],
      [X1, N],
    ],
    walk: W,
  },
  // The basin's south quay: a sidewalk along Quay Road
  { id: 'docks-south-quay', poly: rect(BASIN[0], BASIN[3], BASIN[2], QN + W), walk: 0 },
  // The bridge's sidewalk over the mouth
  { id: 'docks-bridge', poly: rect(CHANNEL[0], AVENUE_KERB, CHANNEL[2], N), walk: 0 },
  // The yards, south of Quay Road (the truck park and the warehouses in Phase 3)
  { id: 'docks-yards', poly: rect(X0, QS, X1, S), walk: W },
];

/* ---------- Lamps ---------- */

/** The sidewalks' top (world.ts SLAB) */
const SLAB_Y = 0.15;
/** Lamps: x, z, the way the arm reaches (over the street), the ground's height; sodium (world.ts) */
export const DOCK_LAMPS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  const IN = HALF + 0.45;
  const clear = (v: number, cuts: number[], m = 6) => cuts.every((c) => Math.abs(v - c) > m);
  // Dock Road's west sidewalk and West Road's east one, clear of the crossings
  for (let z = N + 6; z < S - 3; z += 12)
    if (clear(z, [QUAY_Z])) {
      out.push([DOCK_X - IN, z, 0, SLAB_Y]);
      out.push([WEST_X + IN, z, Math.PI, SLAB_Y]);
    }
  // Quay Road's south sidewalk (the north one is the basin's quay, kept clear for the berth) and Yard Road's north one
  for (let x = X0 + 6; x < X1 - 3; x += 14) {
    out.push([x, QUAY_Z + IN, -Math.PI / 2, SLAB_Y]);
    out.push([x, YARD_Z - IN, Math.PI / 2, SLAB_Y]);
  }
  // The avenue's south sidewalk, clear of the ring's ends and the bridge
  for (let x = X0 + 6; x < X1 - 3; x += 14) if (x < CHANNEL[0] - 2 || x > CHANNEL[2] + 2) out.push([x, AVENUE_KERB + 0.45, -Math.PI / 2, SLAB_Y]);
  return out;
})();
