/*
 * Southbank Docks' port (docs/docks-plan.md Phase 3; the land, the streets and the quays are docks.ts's): what stands
 * on the quays, as data. DOM-free: the solids (solids.ts `SOLIDS`), the Harbour Master's office as a place (its door
 * in walk.ts, its spot docksspot.ts, its spawn places.ts), the masts' pools of light (index.ts) and the drawing
 * (docksport3d.ts, in the docks' chunk) read it. Every number is today's world's, well short of the world's edge.
 *
 * - **The container terminal** on the west quay: three ship-to-shore cranes on rails along the basin's west wall
 *   (`CRANES`, `CRANE`: the only things in the docks over the Emporium, the owner's call; one with its boom raised),
 *   the container ship at the berth under them (`SHIP`, made-up name), the stacks behind (`STACKS`: containers of
 *   made-up lines, `LINES`, two to four high in blocks with lanes between), the gate off West Road (`GATE`: a booth
 *   and a gantry over its lanes), straddle carriers parked between the cranes (`STRADDLES`) and a reach stacker.
 * - **The old docks** on the east quay: SHED 3 (`SHED`), the dry dock with a coaster on its blocks (docks.ts
 *   `DRY_DOCK`; `COASTER`) and the tug berth along the basin's east wall (`TUGS`: two tugs and the pilot boat).
 * - **The yards** south of Quay Road: brick warehouses numbered along it (`WAREHOUSES`), the fuel farm in its bund
 *   (`FUEL`), the truck park (`TRUCKS`: rigs with containers on their trailers).
 * - **Landmarks:** the Harbour Master's office on the quay by the basin's mouth (`HARBOUR_MASTER`, a place), the
 *   lighthouse across the mouth from it (`LIGHTHOUSE`), floodlight masts (`MASTS`).
 *
 * Every top but the cranes' under the Emporium (`PORT_TALLEST`); the cranes well under every flight (the test). Names
 * are made up: no real shipping line, ship or company.
 */
import { BASIN, DRY_DOCK, GATE_Z, WEST_X, HALF, QUAY_Z, type Rect } from './docks';
import { WATER_Y } from './river';
import { WALK_W } from './layout';

type Pt = [number, number];
type Box = [number, number, number, number, number];

/** The quays' top (world.ts SLAB) */
export const S = 0.15;
/** A seeded number in 0..1 from a few integers (the same everywhere) */
const hash = (...n: number[]) => {
  let h = 2166136261;
  for (const v of n) h = Math.imul(h ^ (v | 0), 16777619) ^ (h >>> 13);
  return ((h >>> 0) % 10007) / 10007;
};

/* ---------- Containers ---------- */

/** A 40-foot box in tiles: length, width, height; and the gap between neighbours */
export const BOX = { L: 6.8, W: 1.36, H: 1.44, gap: 0.1 };
/** The made-up lines' colours and names (their name on a box's side, docksport3d.ts's sign atlas) */
export const LINES: { name: string; color: string }[] = [
  { name: 'ORCA LINE', color: '#1f4e8c' },
  { name: 'SUNFISH', color: '#e0702a' },
  { name: 'KESTREL', color: '#2f8f5b' },
  { name: 'TIDEWAY', color: '#b0302d' },
  { name: 'NEON PELICAN', color: '#7a3fb8' },
  { name: 'GULLWING', color: '#1f7f86' },
  { name: '', color: '#8a8f99' },
  { name: '', color: '#cfc4a2' },
];
/** A stack: its footprint (one box's) and each tier's line, from the bottom */
export interface Stack {
  rect: Rect;
  tiers: number[];
}
const tiersOf = (seed: number, most = 4) => {
  const n = 1 + Math.floor(hash(seed, 7) * most * 0.999);
  return Array.from({ length: Math.max(1, Math.min(most, n + (hash(seed, 11) < 0.35 ? 1 : 0))) }, (_, i) => Math.floor(hash(seed, 3, i) * LINES.length));
};

/* ---------- The container terminal (the west quay) ---------- */

/** The cranes' rails along the basin's west wall (x): the sea leg's and the land leg's */
export const SEA_RAIL = BASIN[0] - 1.6;
export const LAND_RAIL = SEA_RAIL - 9.5;
/**
 * A ship-to-shore crane: its legs `leg` either side of its middle along the rail (z), the girder's underside `girder`
 * over the quay, its back reach past the land rail and its boom out past the sea rail, the A-frame's apex; a raised
 * boom stands at `raised` (radians) on its hinge at the sea legs
 */
export const CRANE = { leg: 4.5, bogie: 0.8, girder: 15, depth: 1.4, back: 8, out: 16.5, apex: 24.5, apexX: SEA_RAIL - 2.5, raised: 1.36, house: 7 };
/** The boom's hinge (x, y) and length */
export const HINGE: Pt = [SEA_RAIL + 0.4, CRANE.girder + CRANE.depth / 2];
export const BOOM = SEA_RAIL + CRANE.out - HINGE[0];
/** The three cranes (their middles along the rail, z), the north one's boom raised, where each one's trolley stands */
export const CRANES: { z: number; raised: boolean; trolley: number }[] = [
  { z: 159, raised: true, trolley: LAND_RAIL - 2 },
  { z: 174, raised: false, trolley: BASIN[0] + 4.8 },
  { z: 189, raised: false, trolley: BASIN[0] + 8.2 },
];
/** A crane's highest point (its raised boom's tip, or the A-frame with its warning light) */
export const craneTop = (c: { raised: boolean }) => (c.raised ? HINGE[1] + BOOM * Math.sin(CRANE.raised) + 0.8 : CRANE.apex + 1.2);
/** What a crane covers on the ground, its boom out over the water included (x0, z0, x1, z1) */
export const craneRect = (c: { z: number }): Rect => [LAND_RAIL - CRANE.back, c.z - CRANE.leg - CRANE.bogie - 0.3, SEA_RAIL + CRANE.out, c.z + CRANE.leg + CRANE.bogie + 0.3];

/** The container ship at the berth (made up): its hull's box on the water, the bow its first `bow` (north) */
export const SHIP = {
  rect: [BASIN[0] + 1.4, 151, BASIN[0] + 10.6, 197] as Rect,
  bow: 5.5,
  keel: WATER_Y - 0.6,
  deck: 1.4,
  bridge: { z0: 188.6, z1: 194.2, top: 9.2 },
  funnel: { z0: 194.6, z1: 196.2, top: 10.6 },
  name: 'ORCA STAR',
  line: 0,
};
/** The ship's boxes on deck: fore and aft (bays, along z) and across (rows), tiers seeded */
export const SHIP_STACKS: Stack[] = (() => {
  const out: Stack[] = [];
  const [x0, , x1] = SHIP.rect;
  const rows = 5;
  const w = rows * (BOX.W + BOX.gap) - BOX.gap;
  const rx = (x0 + x1) / 2 - w / 2;
  for (let bay = 0; bay < 4; bay++)
    for (let r = 0; r < rows; r++) {
      const z = 157.4 + bay * (BOX.L + 0.2);
      const x = rx + r * (BOX.W + BOX.gap);
      out.push({ rect: [x, z, x + BOX.W, z + BOX.L], tiers: tiersOf(1000 + bay * 10 + r, 3 + (r % 4 === 1 ? 1 : 0)) });
    }
  return out;
})();

/** The stacks on the quay: two columns of blocks (each two boxes long, along x) and rows of boxes across (z) */
const COLUMNS: [number, number][] = [
  [-387.5, -387.5 + 2 * BOX.L + 0.2],
  [-371.3, -371.3 + 2 * BOX.L + 0.2],
];
/** Each block's first row (z) and how many rows (the gate's lanes between the second and third) */
const BANDS: [number, number][] = [
  [143.0, 6],
  [153.9, 6],
  [173.4, 6],
  [184.0, 6],
  [194.6, 3],
];
export const STACKS: Stack[] = (() => {
  const out: Stack[] = [];
  COLUMNS.forEach(([cx], c) =>
    BANDS.forEach(([z0, rows], b) => {
      for (let r = 0; r < rows; r++)
        for (let k = 0; k < 2; k++) {
          const x = cx + k * (BOX.L + 0.2);
          const z = z0 + r * (BOX.W + BOX.gap);
          out.push({ rect: [x, z, x + BOX.L, z + BOX.W], tiers: tiersOf(c * 1000 + b * 100 + r * 10 + k) });
        }
    })
  );
  return out;
})();
/** The stack blocks' outlines (the drawing's sites; the masts stand in the lane between the columns) */
export const STACK_BLOCKS: Rect[] = COLUMNS.flatMap(([x0, x1]) => BANDS.map(([z0, rows]): Rect => [x0, z0, x1, z0 + rows * (BOX.W + BOX.gap) - BOX.gap]));

/** The terminal's gate off West Road: its lanes (z0, z1), the gantry over them (x) and the booth between them */
export const GATE = {
  z0: GATE_Z - 5,
  z1: GATE_Z + 5,
  x: WEST_X + HALF + WALK_W + 0.6,
  booth: [-390.4, GATE_Z - 0.7, -388.8, GATE_Z + 0.7] as Rect,
  h: 6.4,
};
/** Straddle carriers parked between the cranes (their middles; their length along x) and the reach stacker north of them */
export const STRADDLE = { L: 6, W: 2.8, H: 6.2 };
export const STRADDLES: Pt[] = [
  [(SEA_RAIL + LAND_RAIL) / 2, 166.5],
  [(SEA_RAIL + LAND_RAIL) / 2, 181.5],
];
export const REACH_STACKER = { x: (SEA_RAIL + LAND_RAIL) / 2, z: 147.5, L: 6, W: 2.4, H: 3.2 };

/* ---------- The old docks (the east quay) and the basin's boats ---------- */

/** SHED 3: a transit shed, a gable roof along its length (z) */
export const SHED = { rect: [-268, 148.8, -253.5, 166.4] as Rect, eaves: 4.4, ridge: 5.8, name: 'SHED 3' };
/** The coaster on its blocks in the dry dock (made up): along the dock (x), bow west to the caisson */
export const COASTER = {
  rect: [DRY_DOCK[0] + 2.6, DRY_DOCK[1] + 2.1, DRY_DOCK[2] - 2.8, DRY_DOCK[3] - 2.1] as Rect,
  keel: -2.9,
  deck: 1.9,
  bridge: { x0: -264.2, x1: -261.2, top: 5.2 },
  name: 'SEA MULE',
};
/** The tug berth along the basin's east wall: two tugs and the pilot boat (their middles; bows north) */
export const TUGS: { x: number; z: number; L: number; B: number; kind: 'tug' | 'pilot'; name: string }[] = [
  { x: BASIN[2] - 2.2, z: 152, L: 5.6, B: 2.4, kind: 'tug', name: 'BRUISER' },
  { x: BASIN[2] - 2.2, z: 159.4, L: 5.6, B: 2.4, kind: 'tug', name: 'NUDGE' },
  { x: BASIN[2] - 1.7, z: 166.6, L: 4.6, B: 1.8, kind: 'pilot', name: 'PILOT' },
];

/* ---------- The yards (south of Quay Road) ---------- */

/** The warehouses along Quay Road, their fronts to it (numbered), a loading yard behind each */
export const WAREHOUSES: { rect: Rect; h: number; n: number; brick: 'brick' | 'brickDark' | 'brickTan' }[] = [-390, -361.5, -333, -304.5, -276].map((x, i) => ({
  rect: [x, QUAY_Z + HALF + WALK_W + 2, x + 22, QUAY_Z + HALF + WALK_W + 15],
  h: [7.6, 6.4, 8.2, 7, 6.8][i],
  n: 4 + i,
  brick: (['brick', 'brickDark', 'brick', 'brickTan', 'brickDark'] as const)[i],
}));
/** The fuel farm: its bund (a low wall round it) and the tanks in it */
export const FUEL = {
  bund: [-391, 254, -365, 281.5] as Rect,
  wall: 0.9,
  tanks: [
    { x: -384, z: 261.5, r: 4, h: 6.6 },
    { x: -372.4, z: 261.5, r: 4, h: 6.6 },
    { x: -378.2, z: 274.2, r: 4.6, h: 5.4 },
  ],
};
/** The truck park: rigs facing north with a container on each trailer (a slot's middle; some empty) */
export const TRUCK_BODY = 8.2;
export const TRUCKS: { x: number; z: number; line: number }[] = (() => {
  const out: { x: number; z: number; line: number }[] = [];
  for (const z of [241, 268])
    for (let i = 0; i < 16; i++) {
      const x = -356 + i * 3.4;
      if (hash(i, z) < 0.72) out.push({ x, z, line: Math.floor(hash(i, z, 5) * LINES.length) });
    }
  return out;
})();

/* ---------- Landmarks ---------- */

/** The Harbour Master's office: two storeys on the quay by the basin's mouth, its clock tower at the east end, its door to the avenue (north) */
export const HARBOUR_MASTER = {
  rect: [-299, 142.6, -286.5, 146.6] as Rect,
  h: 6,
  tower: [-290.2, 142.6, -286.5, 146.6] as Rect,
  towerH: 9.4,
  mast: 11.6,
  door: { x: -295, z: 142.2 },
};
/** Where you arrive (places.ts, the panel's Walk in): on the sidewalk, facing its door */
export const HM_SPAWN = { x: HARBOUR_MASTER.door.x, z: 141.1, yaw: Math.PI };
/** The lighthouse at the basin's mouth, across it from the Harbour Master's */
export const LIGHTHOUSE = { x: -320.4, z: 144.35, r: 1.25, gallery: 9.0, top: 11.4 };
/** Floodlight masts: in the lane between the stack columns and along the yards (their pools of light are the boot's) */
export const MAST_H = 11.6;
export const MASTS: Pt[] = [
  [(COLUMNS[0][1] + COLUMNS[1][0]) / 2, 158.2],
  [(COLUMNS[0][1] + COLUMNS[1][0]) / 2, 187.8],
  [-347, 250],
  [-318, 250],
  [-289, 250],
];

/** Everything under the Emporium but the cranes (the test) */
export const PORT_TALLEST = Math.max(LIGHTHOUSE.top, MAST_H, HARBOUR_MASTER.mast, SHIP.funnel.top, ...WAREHOUSES.map((w) => w.h + 0.6), ...FUEL.tanks.map((t) => t.h + 0.8), STRADDLE.H, GATE.h);

/* ---------- What's solid (solids.ts `SOLIDS`) ---------- */

const sq = (x: number, z: number, r: number, h: number): Box => [x - r, z - r, x + r, z + r, h];
const boxOf = (r: Rect, h: number): Box => [r[0], r[1], r[2], r[3], h];
export const PORT_SOLIDS: Box[] = [
  // The cranes' legs (with their bogies), each to the girder
  ...CRANES.flatMap((c) => [LAND_RAIL, SEA_RAIL].flatMap((x) => [-1, 1].map((s) => sq(x, c.z + s * CRANE.leg, 0.5, CRANE.girder)))),
  ...STACKS.map((k) => boxOf(k.rect, S + k.tiers.length * BOX.H)),
  boxOf(GATE.booth, 2.6),
  ...[GATE.z0 + 0.3, GATE.z1 - 0.3].map((z) => sq(GATE.x, z, 0.2, GATE.h)),
  ...STRADDLES.map(([x, z]): Box => [x - STRADDLE.L / 2, z - STRADDLE.W / 2, x + STRADDLE.L / 2, z + STRADDLE.W / 2, STRADDLE.H]),
  [REACH_STACKER.x - REACH_STACKER.L / 2, REACH_STACKER.z - REACH_STACKER.W / 2, REACH_STACKER.x + REACH_STACKER.L / 2, REACH_STACKER.z + REACH_STACKER.W / 2, REACH_STACKER.H],
  boxOf(SHED.rect, SHED.ridge),
  ...WAREHOUSES.map((w) => boxOf(w.rect, w.h)),
  ...FUEL.tanks.map((t) => sq(t.x, t.z, t.r * 0.92, t.h)),
  // The bund's walls, a gap in the north one for the way in
  [FUEL.bund[0], FUEL.bund[1], FUEL.bund[0] + 0.3, FUEL.bund[3], FUEL.wall],
  [FUEL.bund[2] - 0.3, FUEL.bund[1], FUEL.bund[2], FUEL.bund[3], FUEL.wall],
  [FUEL.bund[0], FUEL.bund[3] - 0.3, FUEL.bund[2], FUEL.bund[3], FUEL.wall],
  [FUEL.bund[0], FUEL.bund[1], (FUEL.bund[0] + FUEL.bund[2]) / 2 - 1.5, FUEL.bund[1] + 0.3, FUEL.wall],
  [(FUEL.bund[0] + FUEL.bund[2]) / 2 + 1.5, FUEL.bund[1], FUEL.bund[2], FUEL.bund[1] + 0.3, FUEL.wall],
  ...TRUCKS.map(({ x, z }): Box => [x - 0.66, z - TRUCK_BODY / 2, x + 0.66, z + TRUCK_BODY / 2, S + 2.9]),
  boxOf(HARBOUR_MASTER.rect, HARBOUR_MASTER.h),
  boxOf(HARBOUR_MASTER.tower, HARBOUR_MASTER.towerH),
  sq(LIGHTHOUSE.x, LIGHTHOUSE.z, LIGHTHOUSE.r, LIGHTHOUSE.top),
  ...MASTS.map(([x, z]) => sq(x, z, 0.4, MAST_H)),
];
