/*
 * Southfield (docs/blend-plan.md Phase 5a; DOM-free, tested in tests/southfield.test.ts): the open land south of
 * the south row, inside the ring highway (the airport's old land and the three strips between the small north-south
 * roads), filled by its neighbours, scenery only. Today's world numbers, well inside the world at both sizes.
 *
 * - **Southfield Yards** (ref `southyards`): light industry on a ring off the south bank avenue (`SF_STREETS`: Forge
 *   Street down from the avenue, along and back up as Kiln Lane, the Docks' way; Yard Street across it), lit where it
 *   meets the avenue. North of Yard Street the bus depot and the builder's merchant; south of it warehouses, a works,
 *   a truck depot and lock-ups along the ring's south leg. Nothing crosses under the metro: its pillars are worked
 *   out from the street plan, and stay where they are.
 * - **Southfield Park** (ref `southfield`, a park): between the east ring avenue and Forge Street, south of the south
 *   row: lawns, a loop of paths, a pond in a stone rim, a community garden by the south row, trees, benches, lamps.
 * - **The strips** between the small north-south roads, south of the metro's main line: the allotments in the
 *   middle one, the community garden and more allotments in the east one, and in the west one, across the ring
 *   avenue from The Trenches, its grit carried on in a few low blocks (lock-ups and warehouses).
 * - **The railside walk** under the metro's airport branch (open land: a gravel path, shrubs, benches; no tree under
 *   the el) and the linear walk under the main line across the strips' tops.
 * - Lamps (sodium in the yards, white in the park), trees, people, solids, and the sites kept for later
 *   (`FUTURE_SITES`: places that could be run for Dorras in a later plan; no pin, panel or price now).
 *
 * Every name here is made up.
 */
import { EW_ROADS, LANE, NS_ROADS, SOUTH_ROAD, WALK_W } from './layout';
import { heightOf, KIT_SPEC, lotSolids, type KitId, type Lot } from './kits';
import type { Face } from './downtown';
import type { IdleAct } from './crowdclips';
import type { CarId } from './carspec';
import { BOX, LINES } from './docksport';

type Pt = [number, number];
export type Rect = [number, number, number, number];
/** A solid box: x0, z0, x1, z1, its top over the slab */
export type Box = [number, number, number, number, number];

export const SOUTHFIELD_NAME = 'Southfield';
export const YARDS_NAME = 'Southfield Yards';

const AVENUE = EW_ROADS.find((r) => r.c === SOUTH_ROAD)!;
/** The east ring avenue (the metro's branch in its median, down to its bend east) */
const RING_E = NS_ROADS[NS_ROADS.length - 1];
const RING_W = NS_ROADS[0];
export const HALF = LANE;
const W = WALK_W;
/** The sidewalks' top (world.ts SLAB) */
export const SLAB_Y = 0.15;

/* ---------- The streets ---------- */

/** Forge Street's and Kiln Lane's lines (x), Yard Street's and the ring's south leg's (z) */
export const FORGE_X = 140;
export const KILN_X = 240;
export const YARD_Z = 200;
/** The ring's south leg: well north of the airport branch (its line at z 276), so no pillar moves */
export const MILL_Z = 261;
/** The avenue's south kerb */
export const AVENUE_KERB = AVENUE.c + AVENUE.half;

export interface SfStreet {
  id: string;
  name: string;
  pts: Pt[];
  half: number;
}
export const SF_STREETS: SfStreet[] = [
  {
    id: 'sy-ring',
    name: 'Forge Street',
    pts: [
      [FORGE_X, SOUTH_ROAD],
      [FORGE_X, MILL_Z],
      [KILN_X, MILL_Z],
      [KILN_X, SOUTH_ROAD],
    ],
    half: HALF,
  },
  {
    id: 'sy-yard',
    name: 'Yard Street',
    pts: [
      [FORGE_X, YARD_Z],
      [KILN_X, YARD_Z],
    ],
    half: HALF,
  },
];
export interface SfCrossing {
  id: string;
  at: Pt;
  streets: string[];
  lights: boolean;
}
export const SF_CROSSINGS: SfCrossing[] = [
  // The ring off the avenue, lit at both ends
  { id: 'sy-ew4-w', at: [FORGE_X, SOUTH_ROAD], streets: ['ew4', 'sy-ring'], lights: true },
  { id: 'sy-ew4-e', at: [KILN_X, SOUTH_ROAD], streets: ['ew4', 'sy-ring'], lights: true },
  // Yard Street across it
  { id: 'sy-yard-w', at: [FORGE_X, YARD_Z], streets: ['sy-ring', 'sy-yard'], lights: false },
  { id: 'sy-yard-e', at: [KILN_X, YARD_Z], streets: ['sy-ring', 'sy-yard'], lights: false },
];

/* ---------- The blocks ---------- */

/** A block's outline (inside its sidewalk), counter-clockwise from above as streetplan.ts's (west side going south first) */
const rect = ([x0, z0, x1, z1]: Rect): Pt[] => [
  [x0, z0],
  [x0, z1],
  [x1, z1],
  [x1, z0],
];
const N = AVENUE_KERB + W;
const FX = FORGE_X + HALF + W;
const KX = KILN_X - HALF - W;
/** The yards' two blocks: north of Yard Street (the depot and the merchant) and south of it (the works) */
export const DEPOT_LOT: Rect = [FX, N, KX, YARD_Z - HALF - W];
export const WORKS_LOT: Rect = [FX, YARD_Z + HALF + W, KX, MILL_Z - HALF - W];
/** The park: from the east ring avenue's sidewalk to Forge Street's, the south row's bend to well short of the branch's bend */
export const PARK_LOT: Rect = [RING_E.c + RING_E.half + W, 170.5, FORGE_X - HALF - W, 250];
/** The strips between the small north-south roads (their sidewalks in), from south of the main line to short of the highway's slips */
const STRIP_Z: [number, number] = [183, 300];
/** A strip's lot: from the sidewalk of the road on its west to that of the road on its east */
const strip = (west: { c: number; half: number }, east: { c: number; half: number }): Rect => [west.c + west.half + W, STRIP_Z[0], east.c - east.half - W, STRIP_Z[1]];
export const STRIPS = {
  west: strip(RING_W, NS_ROADS[1]),
  mid: strip(NS_ROADS[1], NS_ROADS[2]),
  east: strip(NS_ROADS[2], RING_E),
};

export interface SfBlock {
  id: string;
  poly: Pt[];
  ref: 'southfield' | 'southyards';
  use: 'park' | 'plain';
  walk: number;
}
export const SF_BLOCKS: SfBlock[] = [
  { id: 'sy-depot', poly: rect(DEPOT_LOT), ref: 'southyards', use: 'plain', walk: W },
  { id: 'sy-works', poly: rect(WORKS_LOT), ref: 'southyards', use: 'plain', walk: W },
  { id: 'sy-west', poly: rect(STRIPS.west), ref: 'southyards', use: 'plain', walk: W },
  { id: 'sf-park', poly: rect(PARK_LOT), ref: 'southfield', use: 'park', walk: W },
  { id: 'sf-mid', poly: rect(STRIPS.mid), ref: 'southfield', use: 'plain', walk: W },
  { id: 'sf-east', poly: rect(STRIPS.east), ref: 'southfield', use: 'plain', walk: W },
];

/** Southfield's land (the park, the strips, the walks) and the yards' (the trees keep off; the drawing's district) */
export const SOUTHFIELD_RECT: Rect = [STRIPS.west[0] - W, 168, PARK_LOT[2] + W, 300.8];
export const YARDS_RECT: Rect = [FORGE_X - HALF, AVENUE_KERB, KILN_X + HALF, MILL_Z + HALF];
/** All of it with the railside walk: the district's land (districts.ts) */
export const SF_RECT: Rect = [SOUTHFIELD_RECT[0], AVENUE_KERB, 262, 300.8];
export const inYards = (x: number, z: number, m = 0) => x > YARDS_RECT[0] - m && x < YARDS_RECT[2] + m && z > YARDS_RECT[1] - m && z < YARDS_RECT[3] + m;

/* ---------- The yards' buildings ---------- */

/** A kit building on a lot (kits.ts): its box along the street it faces, its floors */
function kitLot(type: KitId, box: Rect, face: Face, floors: number, seed: number): Lot {
  const lot: Lot = { box, h: heightOf(type, floors), face, seed, type, floors, front: KIT_SPEC[type].front, solids: [] };
  lot.solids = lotSolids(lot);
  return lot;
}

/** The warehouses along Yard Street's south side (facing it), with gaps between, and the works on the corner by Kiln Lane */
export const YARD_LOTS: Lot[] = (() => {
  const out: Lot[] = [];
  const [x0, z0] = [WORKS_LOT[0], WORKS_LOT[1]];
  const widths = [6.5, 7, 6, 7.5, 6.5, 7];
  let x = x0 + 1;
  widths.forEach((w, i) => {
    out.push(kitLot('warehouse', [x, z0, x + w, z0 + 6.4], 'n', 1, 5100 + i));
    x += w + 2;
  });
  // The works: a big shed on the corner, facing Yard Street
  out.push(kitLot('factory', [KX - 30.5, z0, KX - 0.5, z0 + 26], 'n', 2, 5200));
  // The west strip's warehouses: back to back down its south half, facing the ring avenue (The Trenches) and the small street
  const [sx0, , sx1, sz1] = STRIPS.west;
  for (let z = 236, k = 0; z + 6 <= sz1 - 1; k++) {
    const w = [6, 7, 6.5, 7.5, 6, 7][k % 6];
    if (z + w > sz1 - 1) break;
    out.push(kitLot('warehouse', [sx0, z, sx0 + 5.8, z + w], 'w', 1, 5300 + k));
    out.push(kitLot('warehouse', [sx1 - 5.8, z, sx1, z + w], 'e', 1, 5400 + k));
    z += w + 2.2;
  }
  return out;
})();

/** A low building drawn here (the depot's shed, the merchant's store, a lock-up row, a hut, a gatehouse): its rect, its height */
export interface Shed {
  id: string;
  rect: Rect;
  h: number;
  /** Which side its door or open front faces */
  face: Face;
  kind: 'depot' | 'store' | 'lockups' | 'hut' | 'gate' | 'office' | 'polytunnel';
}
/** The bus depot's shed: open to the forecourt on its north side, four bays */
export const DEPOT_SHED: Shed = { id: 'depot', rect: [DEPOT_LOT[0] + 6, DEPOT_LOT[3] - 26, DEPOT_LOT[0] + 46, DEPOT_LOT[3] - 2], h: 5, face: 'n', kind: 'depot' };
/** The depot's gatehouse by its way in off Forge Street */
export const DEPOT_GATE: Shed = { id: 'depot-gate', rect: [DEPOT_LOT[0] + 0.6, N + 9, DEPOT_LOT[0] + 3.6, N + 12], h: 2.4, face: 'w', kind: 'gate' };
/** The builder's merchant: its store along the avenue at the block's east end, its bays and stacks behind */
export const MERCHANT: Shed = { id: 'merchant', rect: [KX - 22, N + 1, KX - 1, N + 9], h: 3.6, face: 'n', kind: 'store' };
/** The merchant's material bays (three-sided, open to the yard) and its stacks (pallets of blocks, timber racks) */
export const BAYS: Rect[] = [0, 1, 2, 3].map((i): Rect => [KX - 22 + i * 5.5, DEPOT_LOT[3] - 10, KX - 22 + i * 5.5 + 4.6, DEPOT_LOT[3] - 1]);
export const STACKS: [number, number, number, number, number][] = (() => {
  const out: [number, number, number, number, number][] = [];
  // (rows of pallets between the store and the bays: x, z, w, d, h)
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) out.push([KX - 21 + i * 3.4, N + 14 + j * 7, 1.6, 1.2, 0.6 + ((i + j) % 3) * 0.25]);
  return out;
})();
/** The truck depot south of the works' warehouses: its office, and the trucks in two rows facing north */
export const TRUCK_OFFICE: Shed = { id: 'truck-office', rect: [FX + 1, WORKS_LOT[1] + 12, FX + 7, WORKS_LOT[1] + 18], h: 3, face: 'e', kind: 'office' };
/** The lock-ups along the ring's south leg (backs to the railside walk, doors on the street) */
export const LOCKUPS: Shed[] = (() => {
  const out: Shed[] = [];
  const z1 = WORKS_LOT[3];
  for (let x = FX + 2, k = 0; x + 24 <= KX - 34; x += 26, k++) out.push({ id: `lockups-${k}`, rect: [x, z1 - 5, x + 24, z1], h: 2.6, face: 's', kind: 'lockups' });
  return out;
})();
/** The west strip's lock-ups: back to back down its north half, doors on its two streets */
export const WEST_LOCKUPS: Shed[] = (() => {
  const [sx0, sz0, sx1] = STRIPS.west;
  const out: Shed[] = [];
  for (let z = sz0 + 1, k = 0; z + 13 <= 232; z += 15, k++) {
    out.push({ id: `west-lockups-w-${k}`, rect: [sx0, z, sx0 + 5, z + 13], h: 2.6, face: 'w', kind: 'lockups' });
    out.push({ id: `west-lockups-e-${k}`, rect: [sx1 - 5, z, sx1, z + 13], h: 2.6, face: 'e', kind: 'lockups' });
  }
  return out;
})();
/** A lock-up row's doors: one every so far along it */
export const LOCKUP_W = 3;

/** The works' back yard (east of the lock-ups, south of the works): containers stacked one to three high in rows with
 * aisles between (40-foot boxes in the port's made-up lines), and skips by the fence */
export const CONTAINERS: { rect: Rect; h: number; line: number }[] = (() => {
  const out: { rect: Rect; h: number; line: number }[] = [];
  const x0 = KX - 4 * (BOX.L + 0.4) - 6;
  [WORKS_LOT[1] + 30, WORKS_LOT[1] + 37.5, WORKS_LOT[1] + 45].forEach((z, row) => {
    for (let k = 0; k < 4; k++)
      for (let j = 0; j < 2; j++) {
        const x = x0 + k * (BOX.L + 0.4);
        const zz = z + j * (BOX.W + BOX.gap);
        const tiers = 1 + ((row * 7 + k * 3 + j * 5) % 3);
        out.push({ rect: [x, zz, x + BOX.L, zz + BOX.W], h: tiers * BOX.H, line: (row * 4 + k * 2 + j) % LINES.length });
      }
  });
  return out;
})();
export const SKIPS: Rect[] = [0, 1, 2].map((i): Rect => [KX - 4.4, WORKS_LOT[1] + 30 + i * 6, KX - 1, WORKS_LOT[1] + 31.8 + i * 6]);
export const SKIP_H = 1.1;

/** Parked: the buses on the depot's forecourt and in its bays, the trucks in the truck depot, a van at the merchant's */
export const SF_CARS: [CarId, number, number, number, string][] = (() => {
  const out: [CarId, number, number, number, string][] = [];
  const paints = ['#e219e5', '#2aabee'];
  // (ry: 0 faces +x, pi / 2 north (-z), -pi / 2 south)
  // The forecourt: two rows facing north, ready to go (the shed's bays are open but out of bounds)
  for (let row = 0; row < 2; row++) for (let k = 0; k < 6; k++) out.push(['bus', DEPOT_LOT[0] + 9 + k * 6.4 + row * 3.2, N + 6.5 + row * 9.5, Math.PI / 2, paints[(k + row) % 2]]);
  // The truck depot: two rows of box trucks facing north
  const tz0 = WORKS_LOT[1] + 13;
  for (let row = 0; row < 2; row++) for (let k = 0; k < 7; k++) out.push(['truck', FX + 12 + k * 3.4, tz0 + 3 + row * 7, Math.PI / 2, ['#f3f2f7', '#ffd23f', '#e23b3b', '#2a3b66'][(k + row) % 4]]);
  // A van at the merchant's store
  out.push(['van', KX - 25.5, N + 4.5, Math.PI / 2, '#f3f2f7']);
  return out;
})();
const CAR_SIZE: Partial<Record<CarId, [number, number]>> = { bus: [5.6, 1.38], truck: [3.9, 1.2], van: [3.6, 1.3] };

/* ---------- The park ---------- */

/** The pond: an oval (centre, radii along x and z) in a stone rim */
export const POND = { x: 100, z: 222, rx: 11, rz: 7.5, rim: 0.5, h: 0.32 };
export const inPond = (x: number, z: number, m = 0) => ((x - POND.x) / (POND.rx + m)) ** 2 + ((z - POND.z) / (POND.rz + m)) ** 2 < 1;
/** The paths: a loop round the park and its ways in (ns3 side, Forge Street side, the south row side), and one along the pond */
export const PARK_PATHS: { id: string; pts: Pt[]; w: number }[] = (() => {
  const [x0, z0, x1, z1] = PARK_LOT;
  const loop: Pt[] = [
    [x0 + 6, z0 + 6],
    [x1 - 6, z0 + 6],
    [x1 - 6, z1 - 6],
    [x0 + 6, z1 - 6],
    [x0 + 6, z0 + 6],
  ];
  return [
    { id: 'loop', pts: loop, w: 1.6 },
    { id: 'west', pts: [[x0, 210], [x0 + 6, 210]], w: 1.6 },
    { id: 'east', pts: [[x1, 232], [x1 - 6, 232]], w: 1.6 },
    { id: 'north', pts: [[96, z0], [96, z0 + 6]], w: 1.6 },
    // (round the pond's west and south sides, clear of its rim)
    { id: 'pond', pts: [[x0 + 6, 205], [85, 210], [86, 224], [92, 232], [108, 232.5], [114, 230], [x1 - 6, 238]], w: 1.4 },
  ];
})();
/** The community garden by the south row, in the park's north-west corner: raised beds, a shed, a polytunnel, tables */
export const GARDEN_LOT: Rect = [PARK_LOT[0] + 8, PARK_LOT[1] + 8, PARK_LOT[0] + 24, PARK_LOT[1] + 24];
export const GARDEN_SHED: Shed = { id: 'garden-shed', rect: [GARDEN_LOT[0], GARDEN_LOT[1], GARDEN_LOT[0] + 3, GARDEN_LOT[1] + 2.4], h: 2, face: 'e', kind: 'hut' };
export const GARDEN_TUNNEL: Shed = { id: 'garden-tunnel', rect: [GARDEN_LOT[2] - 3.2, GARDEN_LOT[1], GARDEN_LOT[2], GARDEN_LOT[1] + 8], h: 1.9, face: 's', kind: 'polytunnel' };
/** Raised beds (x, z, w, d), on the garden's lot clear of the shed and the tunnel */
export const RAISED_BEDS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) out.push([GARDEN_LOT[0] + 1 + i * 3.6, GARDEN_LOT[1] + 5 + j * 3.4, 2.4, 1.6]);
  return out;
})();
/** Benches by the paths and the pond (x, z, facing) */
export const PARK_BENCHES: [number, number, number][] = [
  [POND.x, POND.z - POND.rz - 2.2, 0],
  [POND.x - 6, POND.z - POND.rz - 1.8, 0.3],
  [POND.x + 6, POND.z + POND.rz + 4.9, Math.PI],
  [PARK_LOT[0] + 7.6, 200, Math.PI / 2],
  [PARK_LOT[2] - 7.6, 206, -Math.PI / 2],
  [PARK_LOT[2] - 7.6, 224, -Math.PI / 2],
  [110, PARK_LOT[3] - 7.6, Math.PI],
];

/* ---------- The allotments ---------- */

export interface Plot {
  rect: Rect;
  /** Which side its path is on (its gate) */
  face: 'w' | 'e';
  /** A shed on it */
  shed: boolean;
  seed: number;
}
/** The plots down a strip either side of its middle path, from `z0` to `z1` (the path `PATH_W` wide) */
export const PATH_W = 1.6;
function plotsOf([x0, , x1]: Rect, z0: number, z1: number, seed: number): Plot[] {
  const mid = (x0 + x1) / 2;
  const out: Plot[] = [];
  const depth = 5.6;
  for (let z = z0, k = 0; z + depth <= z1; z += depth + 0.4, k++)
    for (const side of [-1, 1] as const) {
      const r: Rect = side < 0 ? [x0 + 0.4, z, mid - PATH_W / 2 - 0.3, z + depth] : [mid + PATH_W / 2 + 0.3, z, x1 - 0.4, z + depth];
      out.push({ rect: r, face: side < 0 ? 'e' : 'w', shed: (k + (side > 0 ? 1 : 0)) % 3 === 0, seed: seed + k * 2 + (side > 0 ? 1 : 0) });
    }
  return out;
}
/** The middle strip all allotments (its hut at the north end), the east strip's south half */
const ALLOT_HUT: Shed = { id: 'allotment-hut', rect: [STRIPS.mid[0] + 2, STRIPS.mid[1] + 1, STRIPS.mid[0] + 9, STRIPS.mid[1] + 5], h: 2.6, face: 'e', kind: 'hut' };
export const HUTS: Shed[] = [ALLOT_HUT, GARDEN_SHED];
export const PLOTS: Plot[] = [...plotsOf(STRIPS.mid, STRIPS.mid[1] + 7, STRIPS.mid[3] - 1, 600), ...plotsOf(STRIPS.east, 240, STRIPS.east[3] - 1, 800)];
/** A plot's shed (by its back corner, away from the path) */
export function shedOf(p: Plot): Rect {
  const [x0, z0, x1] = p.rect;
  return p.face === 'e' ? [x0 + 0.2, z0 + 0.3, x0 + 1.6, z0 + 1.5] : [x1 - 1.6, z0 + 0.3, x1 - 0.2, z0 + 1.5];
}
export const SHED_H = 1.6;
/** The east strip's north half: the community garden (beds, tables, a polytunnel) */
export const EAST_GARDEN: Rect = [STRIPS.east[0], STRIPS.east[1], STRIPS.east[2], 236];
export const EAST_TUNNEL: Shed = { id: 'east-tunnel', rect: [EAST_GARDEN[0] + 1, EAST_GARDEN[1] + 2, EAST_GARDEN[0] + 4.5, EAST_GARDEN[1] + 11], h: 1.9, face: 's', kind: 'polytunnel' };
export const EAST_BEDS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  for (let z = EAST_GARDEN[1] + 14; z + 1.6 <= EAST_GARDEN[3] - 2; z += 3.4) for (const x of [EAST_GARDEN[0] + 1.2, EAST_GARDEN[0] + 8.6]) out.push([x, z, 4.2, 1.6]);
  return out;
})();
/** Picnic tables (x, z, along x or z), in the gardens */
export const TABLES: [number, number, boolean][] = [
  [EAST_GARDEN[0] + 10, EAST_GARDEN[1] + 6, true],
  [GARDEN_LOT[2] - 2, GARDEN_LOT[3] - 1.5, true],
];

/* ---------- The walks ---------- */

/** The railside walk under the airport branch (open land: its path a gravel strip south of the el, from the ring avenue's
 * side round the bend and east to short of the highway), and the main line's across the strips' tops */
export const RAIL_WALK: Pt[] = [
  // (from the park's corner down the inside of the branch's bend, then east along its north side, 5 off the track)
  [70, 251.5],
  [70.6, 258],
  [74, 265],
  [79, 269.5],
  [86, 271],
  [255, 271],
];
export const STRIP_WALK: Pt[] = [
  [STRIPS.west[0], 179],
  [STRIPS.east[2], 179],
];
export const WALK_PATH_W = 1.4;
/** Benches along the railside walk (x, z, facing: north, at the el) */
export const RAIL_BENCHES: [number, number, number][] = [110, 150, 190, 230].map((x): [number, number, number] => [x, 272.5, Math.PI]);

/* ---------- Solids ---------- */

const boxOf = (r: Rect, h: number): Box => [r[0], r[1], r[2], r[3], h];
/** A parked vehicle's footprint, turned to its heading (x, z, ry) */
function carBox(id: CarId, x: number, z: number, ry: number): Box {
  const [l, w] = CAR_SIZE[id] ?? [3.6, 1.3];
  const along = Math.abs(Math.cos(ry)) > 0.5;
  const [hx, hz] = along ? [l / 2, w / 2] : [w / 2, l / 2];
  return [x - hx, z - hz, x + hx, z + hz, id === 'bus' || id === 'truck' ? 2.4 : 1.6];
}
/** The pond's rim in boxes with their corners on it (the plaza's way), so you walk round it */
function pondBoxes(): Box[] {
  const out: Box[] = [];
  const n = 5;
  for (let i = 0; i < n; i++) {
    // (slices across z, each as wide as the oval at its nearer edge to the middle)
    const [za, zb] = [POND.z - POND.rz + (2 * POND.rz * i) / n, POND.z - POND.rz + (2 * POND.rz * (i + 1)) / n];
    const near = Math.abs(za - POND.z) < Math.abs(zb - POND.z) ? za : zb;
    const t = Math.max(0, 1 - ((near - POND.z) / POND.rz) ** 2);
    const half = POND.rx * Math.sqrt(t);
    if (half < 0.5) continue;
    out.push([POND.x - half, za, POND.x + half, zb, POND.h]);
  }
  return out;
}
/** Floodlight masts over the depot's forecourt (between its rows of buses) and the truck depot (beside its trucks): x, z, the pool's size (sodium) */
export const SF_POOLS: [number, number, number][] = [
  [DEPOT_LOT[0] + 18, N + 11, 12],
  [DEPOT_LOT[0] + 38, N + 11, 12],
  [FX + 38, WORKS_LOT[1] + 19.5, 11],
];

/** A floodlight mast: its height, its foot's half-width */
export const MAST = { h: 6, half: 0.15 };
export const SOUTHFIELD_SOLIDS: Box[] = [
  ...SF_POOLS.map(([x, z]): Box => [x - MAST.half, z - MAST.half, x + MAST.half, z + MAST.half, MAST.h]),
  ...YARD_LOTS.flatMap((l) => l.solids.map((f) => [f[0], f[1], f[2], f[3], f[4]] as Box)),
  ...[DEPOT_SHED, DEPOT_GATE, MERCHANT, TRUCK_OFFICE, ...LOCKUPS, ...WEST_LOCKUPS, ...HUTS, GARDEN_TUNNEL, EAST_TUNNEL].map((s) => boxOf(s.rect, s.h)),
  // (the bays' back and side walls; the stacks)
  ...BAYS.flatMap(([x0, z0, x1, z1]): Box[] => [
    [x0, z1 - 0.3, x1, z1, 1.4],
    [x0, z0, x0 + 0.3, z1, 1.4],
    [x1 - 0.3, z0, x1, z1, 1.4],
  ]),
  ...STACKS.map(([x, z, w, d, h]): Box => [x, z, x + w, z + d, h]),
  ...PLOTS.filter((p) => p.shed).map((p) => boxOf(shedOf(p), SHED_H)),
  ...CONTAINERS.map((c) => boxOf(c.rect, c.h)),
  ...SKIPS.map((r) => boxOf(r, SKIP_H)),
  ...pondBoxes(),
  ...SF_CARS.map(([id, x, z, ry]) => carBox(id, x, z, ry)),
];

/* ---------- Lamps, trees and people ---------- */

/** Lamps: x, z, the way the arm reaches (0 +x, pi over the -x side, pi / 2 +z, -pi / 2 -z), the ground's height (the yards' sodium: world.ts) */
export const SF_LAMPS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  const IN = HALF + 0.45;
  const clear = (v: number, cuts: number[], m = 6) => cuts.every((c) => Math.abs(v - c) > m);
  // Forge Street's east sidewalk and Kiln Lane's west one, clear of the crossings
  for (let z = N + 7; z < MILL_Z - 4; z += 12)
    if (clear(z, [YARD_Z])) {
      out.push([FORGE_X + IN, z, Math.PI, SLAB_Y]);
      out.push([KILN_X - IN, z, 0, SLAB_Y]);
    }
  // Yard Street's sidewalks and the ring's south leg's north one
  for (let x = FX + 8; x < KX - 4; x += 14) {
    out.push([x, YARD_Z - IN, Math.PI / 2, SLAB_Y]);
    out.push([x + 7, YARD_Z + IN, -Math.PI / 2, SLAB_Y]);
    out.push([x, MILL_Z - IN, Math.PI / 2, SLAB_Y]);
  }
  return out;
})();
/** The park's lamps (white: they light the paths), along the loop's inner side */
export const PARK_LAMPS: [number, number, number][] = (() => {
  const [x0, z0, x1, z1] = PARK_LOT;
  const out: [number, number, number][] = [];
  for (let x = x0 + 14; x < x1 - 8; x += 16) {
    out.push([x, z0 + 7.4, Math.PI / 2]);
    out.push([x + 8, z1 - 7.4, -Math.PI / 2]);
  }
  for (let z = z0 + 18; z < z1 - 8; z += 18) {
    out.push([x0 + 7.4, z, 0]);
    out.push([x1 - 7.4, z + 9, Math.PI]);
  }
  return out;
})();


/** A small seeded generator (the trees' places) */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const segDist = (p: Pt, a: Pt, b: Pt) => {
  const vx = b[0] - a[0];
  const vz = b[1] - a[1];
  const l2 = vx * vx + vz * vz;
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / l2)) : 0;
  return Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vz * t);
};
const nearPath = (p: Pt, m: number) => PARK_PATHS.some((q) => q.pts.some((a, i) => i > 0 && segDist(p, q.pts[i - 1], a) < q.w / 2 + m));
const inRect = (r: Rect, x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;

/** The park's trees (x, z, size): clumps on its lawns, off the paths, the pond, the garden, the benches and lamps */
export const PARK_TREES: [number, number, number][] = (() => {
  const r = rng(4242);
  const out: [number, number, number][] = [];
  const [x0, z0, x1, z1] = PARK_LOT;
  for (let tries = 0; tries < 900 && out.length < 46; tries++) {
    const p: Pt = [x0 + 2 + r() * (x1 - x0 - 4), z0 + 2 + r() * (z1 - z0 - 4)];
    if (nearPath(p, 1.4) || inPond(p[0], p[1], 3) || inRect(GARDEN_LOT, p[0], p[1], 2)) continue;
    if (PARK_BENCHES.some(([bx, bz]) => Math.hypot(bx - p[0], bz - p[1]) < 2.2) || PARK_LAMPS.some(([lx, lz]) => Math.hypot(lx - p[0], lz - p[1]) < 2)) continue;
    // (clumped: more where a slow wave says so)
    if (r() > 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(p[0] * 0.09) * Math.cos(p[1] * 0.11))) continue;
    if (out.some(([tx, tz]) => Math.hypot(tx - p[0], tz - p[1]) < 3.2)) continue;
    out.push([p[0], p[1], 0.8 + r() * 0.45]);
  }
  return out;
})();
/** A few fruit trees at the allotments' ends and along the yards' Forge Street side by the park (x, z, size) */
export const STRIP_TREES: [number, number, number][] = [
  [STRIPS.mid[0] + 2, STRIPS.mid[3] - 0.6, 0.65],
  [STRIPS.mid[2] - 2, STRIPS.mid[3] - 0.6, 0.6],
  [STRIPS.east[0] + 1.6, EAST_GARDEN[3] + 0.6, 0.6],
  [STRIPS.east[2] - 1.6, EAST_GARDEN[3] + 0.6, 0.65],
];

/** People about: on the park's benches, by the pond, at the gardens and the allotments, at the depot and the merchant's */
export const SF_PEOPLE: { x: number; z: number; y: number; ry: number; act: IdleAct }[] = [
  ...PARK_BENCHES.slice(0, 4).map(([x, z, ry]) => ({ x, z, y: 0.45, ry, act: 'sit' as IdleAct })),
  { x: POND.x - POND.rx - 1.6, z: POND.z, y: 0, ry: Math.PI / 2, act: 'look' },
  { x: POND.x + 2, z: POND.z + POND.rz + 1.4, y: 0, ry: Math.PI, act: 'phone' },
  { x: GARDEN_LOT[0] + 3, z: GARDEN_LOT[1] + 9, y: 0, ry: 0.4, act: 'look' },
  { x: GARDEN_LOT[0] + 6.4, z: GARDEN_LOT[1] + 12.4, y: 0, ry: -2.6, act: 'chat' },
  { x: GARDEN_LOT[0] + 7.4, z: GARDEN_LOT[1] + 13.2, y: 0, ry: 0.5, act: 'chat' },
  { x: (STRIPS.mid[0] + STRIPS.mid[2]) / 2, z: 230, y: 0, ry: 0, act: 'look' },
  { x: STRIPS.mid[0] + 4, z: 258, y: 0, ry: Math.PI / 2, act: 'look' },
  { x: STRIPS.mid[2] - 4, z: 268, y: 0, ry: -Math.PI / 2, act: 'look' },
  { x: EAST_GARDEN[0] + 6, z: EAST_GARDEN[1] + 18, y: 0, ry: 1.2, act: 'chat' },
  { x: EAST_GARDEN[0] + 7.2, z: EAST_GARDEN[1] + 18.6, y: 0, ry: -1.9, act: 'chat' },
  { x: DEPOT_GATE.rect[2] + 1, z: (DEPOT_GATE.rect[1] + DEPOT_GATE.rect[3]) / 2, y: 0, ry: -Math.PI / 2, act: 'guard' },
  { x: DEPOT_LOT[0] + 30, z: N + 11, y: 0, ry: 0.3, act: 'chat' },
  { x: DEPOT_LOT[0] + 31.2, z: N + 11.6, y: 0, ry: -2.8, act: 'chat' },
  { x: MERCHANT.rect[0] + 4, z: MERCHANT.rect[3] + 1.6, y: 0, ry: Math.PI, act: 'serve' },
];

/* ---------- Kept for later ---------- */

/** Places that could be run for Dorras in a later plan (the plan's "sites kept for later"): no pin, panel or price now */
export const FUTURE_SITES: { id: string; name: string; rect: Rect; what: string }[] = [
  { id: 'bus-depot', name: 'Southfield Bus Depot', rect: DEPOT_SHED.rect, what: 'a bus company' },
  { id: 'merchant', name: 'Kingpost Builders', rect: MERCHANT.rect, what: "a builder's merchant" },
  { id: 'lockups', name: 'Mill Row Lock-ups', rect: LOCKUPS[0].rect, what: 'lock-ups to rent out' },
  { id: 'allotments', name: 'Southfield Allotments', rect: ALLOT_HUT.rect, what: 'an allotment society' },
];
/** The signs' copy (fixed, made up) */
export const SF_SIGNS = { depot: 'SOUTHFIELD BUS DEPOT', merchant: 'KINGPOST BUILDERS', allotments: 'SOUTHFIELD ALLOTMENTS', garden: 'COMMUNITY GARDEN', park: 'SOUTHFIELD PARK' } as const;
