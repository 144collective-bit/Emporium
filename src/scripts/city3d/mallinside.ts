/*
 * Inside Starlight Mall (docs/mall-plan.md step 2, the owner's call; DOM-free,
 * tested in tests/mallinside.test.ts), drawn by mallinside3d.ts in the mall's
 * chunk. The hall (mall.ts `HALL`) is hollow now: walls round it, the doors
 * open in its south wall behind the porch (`DOOR`), two floors inside.
 *
 * - **The entrance lobby** (south of `LOBBY_Z`): double height, the directory
 *   boards either side (`DIRECTORY`).
 * - **The units** (`UNITS`): four shops a side on each floor, their fronts on
 *   the concourse below and the galleries above, made-up names (`UNIT_NAMES`).
 * - **The atrium** (`VOID`): open to the glass vault, the fountain
 *   (`FOUNTAIN_IN`) with benches and palms, columns at the galleries' edges
 *   (`COLUMNS`), two escalators side by side (`ESCALATORS`: up and down, from
 *   `FOOT_Z` to the food court's terrace at `TERRACE_Z`).
 * - **Upstairs** (`UPPER`, at `UP`): the galleries along the units and the
 *   terrace across the north end, the food court (`FOOD_STALLS` along the
 *   north wall, `TABLES`).
 * - **Downstairs under the terrace**: kiddie rides, the information desk and a
 *   photo booth (`GROUND_THINGS`), the department stores' entrances on the
 *   west and east walls (`ANCHOR_DOORS`).
 *
 * Walking: `mallFloor()` is the floor under a point by Degen's height (the
 * ground floor, the upper floor, an escalator's ramp), `mallWall()` stops him
 * stepping off the upper floor's edges (its balustrades) or into what stands on
 * his floor (`LEVEL_SOLIDS`); `MALL_INSIDE_SOLIDS` (in `SOLIDS`) are the walls,
 * the units, the stalls' strip, the columns, the escalators' balustrades, the
 * fountain, the palms, the directories and the bollards in the porch (a walker
 * gets through, no car does). `MALL_CAMERA` is the roof and the upper floor
 * for the walk camera. Made-up names only; no prices on any sign.
 */
import { HALL, PORCH } from './mall';

export type Rect = [number, number, number, number];
type Box = [number, number, number, number, number];

/** The floor's slab (world.ts `SLAB`: the mall's block is a slab) */
const SLAB = 0.15;
/** The walls' thickness, and the inside of the hall */
export const WALL = 0.3;
export const IN: Rect = [HALL.rect[0] + WALL, HALL.rect[1] + WALL, HALL.rect[2] - WALL, HALL.rect[3] - WALL];
/** The upper floor's height over the ground floor (its top), and its slab's thickness */
export const UP = 3.2;
export const FLOOR_T = 0.3;
/** The doors in the south wall, behind the porch (open) */
export const DOOR = { x0: PORCH.rect[0] + 1, x1: PORCH.rect[2] - 1, h: 3.2 };
/** The entrance lobby (double height) is south of this; the units run from `NORTH_Z` to it */
export const LOBBY_Z = HALL.rect[3] - 3.5;
export const NORTH_Z = HALL.rect[1] + 7;
/** The food court's stalls: their fronts (the strip behind them, to the north wall, is solid on both floors) */
export const STALL_Z = HALL.rect[1] + 2.6;
/** How deep the units are, how wide the galleries */
export const UNIT_D = 5;
export const GALLERY_W = 3;
/** The terrace's south edge (the food court's floor reaches from the stalls to here) */
export const TERRACE_Z = HALL.rect[1] + 10;
const XM = (IN[0] + IN[2]) / 2;
/** The atrium: open from the ground floor to the roof, between the galleries, the terrace and the lobby */
export const VOID: Rect = [IN[0] + UNIT_D + GALLERY_W, TERRACE_Z, IN[2] - UNIT_D - GALLERY_W, LOBBY_Z];
/** The upper floor: the terrace across the north end and the two galleries */
export const UPPER: Rect[] = [
  [IN[0], STALL_Z, IN[2], TERRACE_Z],
  [IN[0] + UNIT_D, TERRACE_Z, VOID[0], LOBBY_Z],
  [VOID[2], TERRACE_Z, IN[2] - UNIT_D, LOBBY_Z],
];

/* ---------- The escalators ---------- */

/** Where they start on the ground floor (z), how far they climb along z before the landing at the top */
export const FOOT_Z = TERRACE_Z + 6.5;
export const RUN = 5.5;
/** Side by side in the atrium's middle, rising north to the terrace: up on the west, down on the east */
export const ESCALATORS: { x0: number; x1: number; dir: 1 | -1 }[] = [
  { x0: XM - 1.7, x1: XM - 0.3, dir: 1 },
  { x0: XM + 0.3, x1: XM + 1.7, dir: -1 },
];
/** The balustrades' thickness either side of a stair */
export const BALUSTRADE = 0.2;
/** An escalator's height over the ground floor at z: flat at the foot, up the run, flat on the landing */
export const escalatorY = (z: number) => Math.min(1, Math.max(0, (FOOT_Z - z) / RUN)) * UP;

/* ---------- The units and the food court ---------- */

/** The shops' made-up names: the ground floor's eight then the upper floor's (west then east, north to south) */
export const UNIT_NAMES = [
  'LINEN & LOOM',
  'NORTH PEAK',
  'CACAO HOUSE',
  'LENS & FRAME',
  'VERDANT',
  'CHAPTER ONE',
  'STRIDE LAB',
  'HOMEWARD',
  'AURORA BEAUTY',
  'ECHO AUDIO',
  'MAPLE KIDS',
  'TAILOR & TWINE',
  'SUMMIT SPORTS',
  'GILDED',
  'PRISM TECH',
  'FIELD & FERN',
];
export interface Unit {
  /** Its footprint (x0, z0, x1, z1) */
  rect: Rect;
  /** Which floor (0 the ground, 1 upstairs) */
  level: 0 | 1;
  /** Which way its front faces (+1 east: the west side's; -1 west) */
  face: 1 | -1;
  name: string;
  /** Its place in the list (its front's style comes from it, mallinside3d.ts) */
  k: number;
}
export const UNITS: Unit[] = (() => {
  const out: Unit[] = [];
  const n = 4;
  const L = (LOBBY_Z - NORTH_Z) / n;
  for (const level of [0, 1] as const)
    for (const face of [1, -1] as const)
      for (let i = 0; i < n; i++) {
        const [x0, x1] = face === 1 ? [IN[0], IN[0] + UNIT_D] : [IN[2] - UNIT_D, IN[2]];
        out.push({ rect: [x0, NORTH_Z + i * L, x1, NORTH_Z + (i + 1) * L], level, face, name: UNIT_NAMES[out.length], k: out.length });
      }
  return out;
})();
/** The food court's stalls along the north wall, upstairs (made-up names), facing south */
export const FOOD_NAMES = ['TACO VERDE', 'NOODLE BAR', 'BURGER CO.', 'GREEN BOWL', 'SUSHI GO ROUND', 'GELATO LAB'];
export const FOOD_STALLS: { x0: number; x1: number; name: string }[] = FOOD_NAMES.map((name, i) => {
  const w = (IN[2] - IN[0]) / FOOD_NAMES.length;
  return { x0: IN[0] + i * w, x1: IN[0] + (i + 1) * w, name };
});
/** The food court's tables (x, z; round, a seat each side), clear of the way from the escalators' landing */
export const TABLE_R = 0.45;
export const TABLES: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (const z of [STALL_Z + 2.4, STALL_Z + 5.2])
    for (let x = IN[0] + 2.2; x < IN[2] - 1.5; x += 3.3) if (Math.abs(x - XM) > 2.6 || z < STALL_Z + 3) out.push([x, z]);
  return out;
})();

/* ---------- The atrium and downstairs ---------- */

export const FOUNTAIN_IN = { x: XM, z: LOBBY_Z - 5, r: 1.7 };
/** Benches either side of the fountain, facing it (x, z, facing: 0 is +z) */
export const BENCHES_IN: { x: number; z: number; ry: number }[] = [
  { x: XM - 3.4, z: FOUNTAIN_IN.z, ry: Math.PI / 2 },
  { x: XM + 3.4, z: FOUNTAIN_IN.z, ry: -Math.PI / 2 },
];
/** Trees in big planters in the atrium (x, z): three corners, the fourth is the lift's */
export const PALMS_IN: [number, number][] = [
  [VOID[0] + 1.3, FOOT_Z + 2],
  [VOID[2] - 1.3, FOOT_Z + 2],
  [VOID[0] + 1.3, LOBBY_Z - 1.4],
];
/** The glass lift in the atrium's south-east corner, against the east gallery: its shaft, the door downstairs (west of it) and upstairs (on the gallery) */
export const LIFT_SHAFT: Rect = [VOID[2] - 1.9, LOBBY_Z - 3.4, VOID[2] - 0.1, LOBBY_Z - 1.4];
const LIFT_Z = (LIFT_SHAFT[1] + LIFT_SHAFT[3]) / 2;
export const MALL_LIFT = {
  /** The doors' prompts (x, z), and where each lets you out at the other end (facing away from the shaft; walk mode faces (-sin yaw, -cos yaw); y over the slab) */
  low: { x: LIFT_SHAFT[0] - 0.75, z: LIFT_Z },
  high: { x: LIFT_SHAFT[2] + 0.85, z: LIFT_Z },
  up: { x: LIFT_SHAFT[2] + 0.85, z: LIFT_Z, y: UP, yaw: -Math.PI / 2 },
  down: { x: LIFT_SHAFT[0] - 0.75, z: LIFT_Z, y: 0, yaw: Math.PI / 2 },
};
/** Kiosks in the atrium either side of the escalators (their footprints; made-up names) */
export const KIOSKS: { rect: Rect; name: string }[] = [
  { rect: [VOID[0] + 0.9, TERRACE_Z + 1.8, VOID[0] + 2.7, TERRACE_Z + 3.4], name: 'COFFEE CART' },
  { rect: [VOID[2] - 2.7, TERRACE_Z + 1.8, VOID[2] - 0.9, TERRACE_Z + 3.4], name: 'SUN & SHADE' },
];
export const PALM_R = 0.5;
/** The columns under the galleries' and the terrace's edges (x, z), round, `COLUMN_R` */
export const COLUMN_R = 0.22;
export const COLUMNS: [number, number][] = [VOID[0], VOID[2]].flatMap((x) => [TERRACE_Z, TERRACE_Z + 6, TERRACE_Z + 12, LOBBY_Z].map((z): [number, number] => [x, z]));
/** The directory boards in the lobby either side (x, z: their middles; they face north into the mall and south to the doors) */
export const DIRECTORY: [number, number][] = [
  [IN[0] + 3, LOBBY_Z + 1.5],
  [IN[2] - 3, LOBBY_Z + 1.5],
];
/** Downstairs under the terrace: two kiddie rides, the information desk, a photo booth (footprints) */
export const GROUND_THINGS: { kind: 'ride' | 'desk' | 'booth'; rect: Rect }[] = [
  { kind: 'ride', rect: [VOID[0] - 1.3, STALL_Z + 1.4, VOID[0] + 0.1, STALL_Z + 3.4] },
  { kind: 'ride', rect: [VOID[2] - 0.1, STALL_Z + 1.4, VOID[2] + 1.3, STALL_Z + 3.4] },
  { kind: 'desk', rect: [XM - 1.2, STALL_Z + 1.6, XM + 1.2, STALL_Z + 2.6] },
  { kind: 'booth', rect: [XM + 3.2, STALL_Z, XM + 4.6, STALL_Z + 1.2] },
];
/** The department stores' entrances, downstairs on the west and east walls under the terrace (z0, z1) */
export const ANCHOR_DOORS: { x: number; face: 1 | -1; z0: number; z1: number }[] = [
  { x: IN[0], face: 1, z0: STALL_Z + 0.8, z1: NORTH_Z - 0.6 },
  { x: IN[2], face: -1, z0: STALL_Z + 0.8, z1: NORTH_Z - 0.6 },
];
/** Bollards across the doors, under the porch: a walker gets through, no car does (x, z) */
export const BOLLARDS: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let x = DOOR.x0 + 0.3; x < DOOR.x1 - 0.1; x += 1.25) out.push([x, HALL.rect[3] + 0.5]);
  return out;
})();
export const BOLLARD = 0.15;

/* ---------- What's solid ---------- */

const sq = (x: number, z: number, r: number, h: number): Box => [x - r, z - r, x + r, z + r, h];
/** The walls (the doors left open) */
export const WALLS: Box[] = (() => {
  const [x0, z0, x1, z1] = HALL.rect;
  const h = HALL.h;
  return [
    [x0, z0, x1, z0 + WALL, h],
    [x0, z0, x0 + WALL, z1, h],
    [x1 - WALL, z0, x1, z1, h],
    [x0, z1 - WALL, DOOR.x0, z1, h],
    [DOOR.x1, z1 - WALL, x1, z1, h],
  ];
})();
/** The escalators' balustrades: either side, the one between them shared (from the landing to just past the foot) */
export const ESC_SOLIDS: Box[] = (() => {
  const [a, b] = ESCALATORS;
  const z1 = FOOT_Z + 0.8;
  return [
    [a.x0 - BALUSTRADE, TERRACE_Z, a.x0, z1, UP + 1],
    [a.x1, TERRACE_Z, b.x0, z1, UP + 1],
    [b.x1, TERRACE_Z, b.x1 + BALUSTRADE, z1, UP + 1],
  ];
})();
/** Solid on both floors (they stand on the ground through the upper floor), or on the ground floor where there's none over it */
export const MALL_INSIDE_SOLIDS: Box[] = [
  ...WALLS,
  // (the units on both floors, a strip a side; the stalls' strip across the north end)
  [IN[0], NORTH_Z, IN[0] + UNIT_D, LOBBY_Z, HALL.h],
  [IN[2] - UNIT_D, NORTH_Z, IN[2], LOBBY_Z, HALL.h],
  [IN[0], IN[1], IN[2], STALL_Z, HALL.h],
  ...COLUMNS.map(([x, z]) => sq(x, z, COLUMN_R, HALL.h)),
  ...ESC_SOLIDS,
  sq(FOUNTAIN_IN.x, FOUNTAIN_IN.z, FOUNTAIN_IN.r * 0.85, 0.7),
  ...PALMS_IN.map(([x, z]) => sq(x, z, PALM_R, 0.6)),
  ...BENCHES_IN.map((b): Box => [b.x - 0.25, b.z - 1.05, b.x + 0.25, b.z + 1.05, 0.9]),
  ...DIRECTORY.map(([x, z]): Box => [x - 0.9, z - 0.15, x + 0.9, z + 0.15, 2.2]),
  [...LIFT_SHAFT, HALL.h] as Box,
  ...KIOSKS.map((k): Box => [...k.rect, 2.4] as Box),
  ...BOLLARDS.map(([x, z]) => sq(x, z, BOLLARD, 0.9)),
];
/** What stands on one floor only, with a floor over or under it (x0, z0, x1, z1, level) */
export const LEVEL_SOLIDS: [number, number, number, number, 0 | 1][] = [
  ...GROUND_THINGS.map((t): [number, number, number, number, 0 | 1] => [...t.rect, 0]),
  ...TABLES.map(([x, z]): [number, number, number, number, 0 | 1] => [x - TABLE_R, z - TABLE_R, x + TABLE_R, z + TABLE_R, 1]),
];

/* ---------- Walking ---------- */

const inRect = (r: Rect, x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
/** Inside the hall's walls */
export const inMall = (x: number, z: number) => inRect(IN, x, z);
/** The escalator under a point, if any */
const escalatorAt = (x: number, z: number) => ESCALATORS.find((e) => x > e.x0 && x < e.x1 && z > TERRACE_Z && z < FOOT_Z);
/** The floors over a point (heights over the ground floor): an escalator's ramp alone (nothing walks under it), else the ground floor and the upper floor over it */
export function floorsAt(x: number, z: number): number[] {
  if (!inMall(x, z)) return [];
  const e = escalatorAt(x, z);
  if (e) return [escalatorY(z)];
  // (edges included: the terrace and the galleries meet on a line)
  return UPPER.some((r) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]) ? [0, UP] : [0];
}
/** How high Degen can step up and how far he can drop (a jump's height and more) and still be on a floor */
const STEP = 0.3;
const DROP = 1.3;
/**
 * The floor under a point for someone whose feet could reach `yNow` (world height): the highest floor not
 * over it; null outside the hall
 */
export function mallFloor(x: number, z: number, yNow: number): number | null {
  const fl = floorsAt(x, z);
  if (!fl.length) return null;
  const under = fl.filter((f) => SLAB + f <= yNow + 1e-6);
  return SLAB + (under.length ? Math.max(...under) : Math.min(...fl));
}
/** The floor someone at height `y` (world) stands on at a point: within a step up and a drop down, or null */
function reach(x: number, z: number, y: number): number | null {
  const ok = floorsAt(x, z).filter((f) => SLAB + f <= y + STEP && SLAB + f >= y - DROP);
  return ok.length ? Math.max(...ok) : null;
}
/**
 * Inside the hall, a point Degen (radius `m`, feet at `y`) can't stand at: off the upper floor's edges (its
 * balustrades), up into an escalator's side, or in what stands on his floor
 */
export function mallWall(x: number, z: number, y: number, m = 0): boolean {
  if (!inMall(x, z)) return false;
  for (const [dx, dz] of [
    [0, 0],
    [m, 0],
    [-m, 0],
    [0, m],
    [0, -m],
  ])
    if (inMall(x + dx, z + dz) && reach(x + dx, z + dz, y) === null) return true;
  const level = y > SLAB + UP - 0.6 ? 1 : 0;
  return LEVEL_SOLIDS.some((b) => b[4] === level && x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m);
}
/** For the walk camera (x0, z0, x1, z1, top, bottom): the roof and the upper floor's slabs */
export const MALL_CAMERA: number[][] = [[HALL.rect[0], HALL.rect[1], HALL.rect[2], HALL.rect[3], SLAB + HALL.h + 0.3, SLAB + HALL.h - 0.3], ...UPPER.map((r) => [...r, SLAB + UP, SLAB + UP - FLOOR_T])];

/* ---------- People ---------- */

export interface InsidePerson {
  x: number;
  z: number;
  ry: number;
  act: 'look' | 'chat' | 'sit';
  /** Over the slab (a seat's height for those sitting) */
  y: number;
}
export const MALL_INSIDE_PEOPLE: InsidePerson[] = (() => {
  const out: InsidePerson[] = [];
  // Window-shopping at every other unit, on both floors
  UNITS.forEach((u, i) => {
    if (i % 2) return;
    const x = u.face === 1 ? u.rect[2] + 1.1 : u.rect[0] - 1.1;
    out.push({ x, z: (u.rect[1] + u.rect[3]) / 2 + 0.6, ry: u.face === 1 ? -Math.PI / 2 : Math.PI / 2, act: 'look', y: u.level * UP });
  });
  // On the benches by the fountain
  for (const b of BENCHES_IN) out.push({ x: b.x + (b.ry > 0 ? -0.05 : 0.05), z: b.z + 0.45, ry: b.ry, act: 'sit', y: 0.32 });
  // Chatting in the atrium and the lobby
  out.push({ x: XM - 2.6, z: FOOT_Z + 1.2, ry: Math.PI / 2, act: 'chat', y: 0 }, { x: XM - 1.8, z: FOOT_Z + 1.3, ry: -Math.PI / 2, act: 'chat', y: 0 });
  out.push({ x: XM + 4, z: LOBBY_Z + 1.4, ry: Math.PI, act: 'chat', y: 0 }, { x: XM + 4.6, z: LOBBY_Z + 0.8, ry: -Math.PI / 4, act: 'chat', y: 0 });
  // Queueing at the food court's stalls, the cooks behind their counters, and sitting at its tables
  FOOD_STALLS.forEach((s, i) => i % 2 === 0 && out.push({ x: (s.x0 + s.x1) / 2, z: STALL_Z + 0.9, ry: Math.PI, act: 'look', y: UP }));
  FOOD_STALLS.forEach((s) => out.push({ x: (s.x0 + s.x1) / 2 - 0.4, z: STALL_Z - 1.15, ry: 0, act: 'look', y: UP }));
  TABLES.forEach(([x, z], i) => {
    if (i % 3 === 2) return;
    out.push({ x: x - TABLE_R - 0.3, z, ry: Math.PI / 2, act: 'sit', y: UP + 0.32 });
    if (i % 2 === 0) out.push({ x: x + TABLE_R + 0.3, z, ry: -Math.PI / 2, act: 'sit', y: UP + 0.32 });
  });
  // Leaning on the balustrades, looking down into the atrium
  out.push({ x: VOID[0] - 0.45, z: TERRACE_Z + 9, ry: -Math.PI / 2, act: 'look', y: UP }, { x: VOID[2] + 0.45, z: TERRACE_Z + 3.2, ry: Math.PI / 2, act: 'look', y: UP });
  // At the kiosks
  for (const k of KIOSKS) out.push({ x: (k.rect[0] + k.rect[2]) / 2, z: k.rect[3] + 0.55, ry: 0, act: 'look', y: 0 });
  // At the information desk
  const desk = GROUND_THINGS.find((t) => t.kind === 'desk')!.rect;
  out.push({ x: XM, z: desk[3] + 0.7, ry: Math.PI, act: 'chat', y: 0 });
  return out;
})();

/** Walk in: in the lobby, facing up the mall (walk mode faces (-sin yaw, -cos yaw)) */
export const INSIDE_SPAWN = { x: XM, z: LOBBY_Z + 1.6, yaw: 0 };
/** The tallest thing inside: under the hall's roof */
export const INSIDE_TALLEST = UP + 2.4;
