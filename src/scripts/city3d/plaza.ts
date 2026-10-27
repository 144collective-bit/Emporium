/*
 * Uptown's plaza (docs/finance-plan.md Phase 3, the owner's call; DOM-free,
 * tested in tests/plaza.test.ts): the plaza's block round the spire, and the
 * two slivers west of the axis's lanes as café terraces.
 *
 * - **The forecourt**: the block west of the spire, where the Mall's axis
 *   (north-south) meets the line from Uptown Circle down Circle Street to
 *   the spire's lobby (east-west, uptown.ts) at `CENTRE`.
 * - **The cross** (the owner's pick): a tall gold cross on a stepped stone
 *   plinth (`CROSS`) in a round pool (`POOL`) at the centre, its arms across
 *   the axis so it faces the Mall and the river.
 * - **The water wall** (`WATER_WALL`): a long stepped wall along the
 *   forecourt's west side with water sheeting down its steps into a trough,
 *   in two halves either side of the way in from the street (`GAP`).
 * - **The lunch tables** (`TABLES`) along the north and south edges, under
 *   lit glass canopies (plazadress.ts, the drawing's); trees in
 *   grates (`TREES`), benches facing the pool (`BENCHES`), lamps (`LAMPS`),
 *   planters along the spire's sides (`PLANTERS`).
 * - **The terraces** (`TERRACES`): the slivers by the lanes, each a café
 *   kiosk (`KIOSKS`) with tables out front and a tree at each end.
 * - **People at lunch** (`PLAZA_PEOPLE`) and what's solid (`PLAZA_SOLIDS`).
 *
 * What only the drawing needs (the canopies, the kiosks' names, the LED
 * ribbon) is plazadress.ts's, in Uptown's own chunk: this file is in the boot.
 */
import { AXIS_X, PLAZA_BLOCK, UPTOWN_BLOCKS, UPTOWN_LANES, type Pt, type Rect } from './uptown';
import { SPIRE_LOT } from './highrise';

type Box = [number, number, number, number, number];
const block = UPTOWN_BLOCKS.find((b) => b.id === PLAZA_BLOCK)!;
const [X0, Z0, , Z1] = block.rect;

/** Where the axis meets Circle Street's line from the circle to the spire's lobby: the pool and the cross */
export const CENTRE: Pt = [AXIS_X, (Z0 + Z1) / 2];
const [CX, CZ] = CENTRE;

/** The pool: its radius inside the rim, the rim's height and width, the water's height (over the slab) */
export const POOL = { r: 3.4, rim: 0.45, w: 0.35, water: 0.32 };
/**
 * The cross: its plinth's three steps (side, top), the shaft's width and top, the arms' span and middle (over the
 * slab); the arms run along x, so it faces the axis
 */
export const CROSS = { steps: [[2.6, 0.55], [2.0, 0.85], [1.4, 1.15]] as [number, number][], w: 0.55, top: 7.6, span: 3.4, arm: 5.6 };

/** The water wall: its stepped body (from the back: each step's front and top), its trough's front and rim; the way in through it, half its width */
export const WATER_WALL = { x: X0 + 0.3, steps: [[X0 + 0.7, 2.4], [X0 + 1.1, 1.75], [X0 + 1.5, 1.1]] as [number, number][], trough: X0 + 2.4, rim: 0.45 };
export const GAP = 2;
/** Its two halves (z), north and south of the way in */
export const WALL_RUNS: [number, number][] = [
  [Z0 + 1.2, CZ - GAP],
  [CZ + GAP, Z1 - 1.2],
];

/** Café tables, each with a chair either side (along z): under the canopies (plazadress.ts) along the north and south edges, and out on the terraces */
export const CHAIR = 0.6;
/** The lunch tables' rows (z), each a table west of the axis and two east of it */
export const TABLE_ROWS = [Z0 + 1.7, Z1 - 1.7];
export const TABLES: Pt[] = TABLE_ROWS.flatMap((z) => [-3.25, 3.45, 6.2].map((d): Pt => [AXIS_X + d, z]));

/** Trees in grates round the pool, clear of the canopies, the axis and the way in */
export const TREES: Pt[] = [
  [CX - 3.9, CZ - 6],
  [CX + 4.5, CZ - 6],
  [CX - 3.9, CZ + 6],
  [CX + 4.5, CZ + 6],
];
/** Benches on the pool's diagonals, facing it (the sitter faces `ry`, 0 is +z) */
export const BENCHES: { at: Pt; ry: number }[] = [-3, -1, 1, 3].map((k) => {
  const a = (k * Math.PI) / 4;
  const at: Pt = [CX + Math.sin(a) * 4.7, CZ + Math.cos(a) * 4.7];
  return { at, ry: a + Math.PI };
});
/** Lamps flanking the way in and the spire's lobby (x, z, ry) */
export const LAMPS: [number, number, number][] = [
  [WATER_WALL.trough + 0.6, CZ - GAP - 0.6, 0],
  [WATER_WALL.trough + 0.6, CZ + GAP + 0.6, 0],
  [SPIRE_LOT[0] - 2, CZ - 3, 0],
  [SPIRE_LOT[0] - 2, CZ + 3, 0],
];
/** Low planters along the spire's north and south sides, by the cross streets */
export const PLANTER_H = 0.45;
export const PLANTERS: Rect[] = [Z0 + 0.4, Z1 - 1.3].flatMap((z) => [0, 1, 2].map((i): Rect => [SPIRE_LOT[0] + 1.5 + i * 5, z, SPIRE_LOT[0] + 4.5 + i * 5, z + 0.9]));

/* ---------- The terraces ---------- */

/** The slivers west of the axis's lanes, north and south of the plaza */
export const TERRACES: Rect[] = UPTOWN_LANES.map((l) => {
  const b = UPTOWN_BLOCKS.find((q) => q.rect[1] === l[1] && q.rect[0] < l[0] && q.rect[2] > l[2])!;
  return [b.rect[0], b.rect[1], l[0], b.rect[3]] as Rect;
});
/** Each terrace's café kiosk against its west side, its counter facing the lane (made-up names) */
export const KIOSK_H = 2.6;
export const KIOSKS: { rect: Rect; counter: Pt }[] = TERRACES.map(([x0, z0, , z1]) => {
  const cz = (z0 + z1) / 2;
  const rect: Rect = [x0 + 0.3, cz - 1.3, x0 + 2.3, cz + 1.3];
  return { rect, counter: [rect[2] + 0.5, cz] };
});
/** The terraces' tables (two either side of the kiosk) and trees (one at each end) */
export const TERRACE_TABLES: Pt[] = TERRACES.flatMap(([x0, z0, x1, z1]) => {
  const [x, cz] = [(x0 + 2.3 + x1) / 2 + 0.2, (z0 + z1) / 2];
  return [-5.2, -2.8, 2.8, 5.2].map((d): Pt => [x, cz + d]);
});
export const TERRACE_TREES: Pt[] = TERRACES.flatMap(([x0, z0, x1, z1]): Pt[] => [
  [(x0 + x1) / 2, z0 + 1.2],
  [(x0 + x1) / 2, z1 - 1.2],
]);
export const TERRACE_LAMPS: [number, number, number][] = TERRACES.map(([x0, z0, x1, z1]) => [x1 - 0.5, (z0 + z1) / 2, 0]);

/* ---------- People ---------- */

export type PlazaAct = 'sit' | 'eat' | 'chat' | 'look' | 'queue' | 'phone';
export interface PlazaPerson {
  x: number;
  z: number;
  /** Over the slab (a seat's height for those sitting) */
  y: number;
  ry: number;
  act: PlazaAct;
}
export const SEAT_Y = 0.32;
/** People at lunch: at the tables (most chairs), on the benches, chatting in the forecourt, looking at the cross, on their phones by the pool, at the kiosks */
export const PLAZA_PEOPLE: PlazaPerson[] = (() => {
  const out: PlazaPerson[] = [];
  const add = (x: number, z: number, ry: number, act: PlazaAct, y = 0) => out.push({ x, z, y, ry, act });
  // (a chair each side along z, facing the table; one in three tables a single diner)
  [...TABLES, ...TERRACE_TABLES].forEach(([x, z], i) => {
    add(x, z - CHAIR, 0, 'eat', SEAT_Y);
    if (i % 3 !== 1) add(x, z + CHAIR, Math.PI, 'eat', SEAT_Y);
  });
  BENCHES.forEach(({ at, ry }, i) => add(at[0] + Math.cos(ry) * (i % 2 ? 0.3 : -0.3), at[1] - Math.sin(ry) * (i % 2 ? 0.3 : -0.3), ry, 'sit', SEAT_Y));
  // Two pairs chatting by the spire's lobby, someone looking up at the cross from the axis either side of the pool,
  // two queueing at each kiosk
  for (const dz of [-1.6, 1.6]) for (const s of [-1, 1]) add(SPIRE_LOT[0] - 4.2 + s * 0.45, CZ + dz, (-s * Math.PI) / 2, 'chat');
  for (const s of [-1, 1]) add(CX + (s + 1) * 0.3, CZ + s * (POOL.r + POOL.w + 1.4), s < 0 ? 0 : Math.PI, 'look');
  // (two reading their phones a step off the axis, half turned from the pool)
  for (const s of [-1, 1]) add(CX + s * 1.4, CZ + s * (POOL.r + POOL.w + 2.4), s < 0 ? 0.7 : Math.PI - 0.7, 'phone');
  for (const { counter: [x, z] } of KIOSKS) for (const d of [0, 0.75]) add(x + d, z, -Math.PI / 2, 'queue');
  return out;
})();

/* ---------- What's solid ---------- */

/** The pool's rim, in boxes with their corners on it every 14° (the steps between them stay outside the water) */
const R = POOL.r + POOL.w;
export const PLAZA_SOLIDS: Box[] = [
  ...[10, 24, 38, 52, 66, 80].map((d): Box => {
    const [c, s] = [Math.cos((d * Math.PI) / 180) * R, Math.sin((d * Math.PI) / 180) * R];
    return [CX - c, CZ - s, CX + c, CZ + s, POOL.rim];
  }),
  // The cross's plinth and shaft, its arms
  [CX - CROSS.steps[2][0] / 2, CZ - CROSS.steps[2][0] / 2, CX + CROSS.steps[2][0] / 2, CZ + CROSS.steps[2][0] / 2, CROSS.top],
  [CX - CROSS.span / 2, CZ - CROSS.w / 2, CX + CROSS.span / 2, CZ + CROSS.w / 2, CROSS.arm + CROSS.w / 2],
  // The water wall's halves and their troughs
  ...WALL_RUNS.flatMap(([a, b]): Box[] => [
    [WATER_WALL.x, a, WATER_WALL.steps[2][0], b, WATER_WALL.steps[0][1]],
    [WATER_WALL.steps[2][0], a, WATER_WALL.trough, b, WATER_WALL.rim],
  ]),
  ...PLANTERS.map(([x0, z0, x1, z1]): Box => [x0, z0, x1, z1, PLANTER_H]),
  ...KIOSKS.map(({ rect: [x0, z0, x1, z1] }): Box => [x0, z0, x1, z1, KIOSK_H]),
];
