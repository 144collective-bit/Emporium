/*
 * The Trenches' riverside (docs/waterfront-plan.md, the owner's call: "a
 * better design... variety and an architecturally impressive waterfront";
 * DOM-free, tested in tests/riverside.test.ts): the four blocks of row A
 * redesigned. Their river side, facing north across the bank avenue to the
 * boardwalk and the water, is a row of landmarks, each its own architecture;
 * their Trench Avenue side keeps a strip of brownstones and the corner shops
 * (`STRIPS`, laid by the rows' recipe in projects.ts), with a service yard
 * between.
 *
 * West to east:
 *
 * - trench-a0: **The Wharf** (`WHARF`), a slim glass tower of stacked,
 *   shifted boxes on a glass lobby, and **The Refinery** (`REFINERY`), an
 *   old brick sugar works turned lofts: a long hall with tall arched
 *   windows, a monitor roof, its brick chimney and the big REFINERY sign on
 *   a steel lattice on its roof.
 * - trench-a1: **Harbor Stores** (`STORES`), a brick warehouse with an
 *   arcade of arches along the ground floor and a glass penthouse set back
 *   on its roof, and **Trench Arms** on the corner (avenue.ts).
 * - trench-a2: **The Pier House** (`PIER_HOUSE`), a stone ferry hall with a
 *   clock tower at the head of Pier 7 (waterfront.ts), and **The Rusty
 *   Nail** on the corner (avenue.ts).
 * - trench-a3: **Club PULSE** (avenue.ts), the landmark: four times the
 *   club it was.
 *
 * Everything stays under the Emporium (`TALLEST`). What's solid is
 * `RIVERSIDE_SOLIDS` (in SOLIDS): the buildings' parts to their roofs, the
 * chimney and the tower to their tops.
 */
import type { Footprint, Pt, Rect } from './downtown';
import { RECIPES } from './recipes';
import { TRENCH_BLOCKS } from './trenches';

/** Nothing here comes near the Emporium's roof (12.5, landmarks.ts): half a tile under it at most */
export const TALLEST = 12;

const blockRect = (id: string): Rect => {
  const b = TRENCH_BLOCKS.find((t) => t.id === id)!;
  const xs = b.poly.map((p) => p[0]);
  const zs = b.poly.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
};
/** Row A's blocks, west to east, and their land (inside the sidewalks) */
export const RIVER_BLOCKS = ['trench-a0', 'trench-a1', 'trench-a2', 'trench-a3'];
export const BLOCK_RECT: Record<string, Rect> = Object.fromEntries(RIVER_BLOCKS.map((id) => [id, blockRect(id)]));

/** The river front (z): the blocks' north edge, on the bank avenue's sidewalk */
export const FRONT_Z = BLOCK_RECT['trench-a0'][1];
/** Trench Avenue's strip of brownstones: one row deep (the rows' recipe's depth), along the blocks' south edge */
export const STRIP_D = RECIPES.rowhouses.depth + 0.1;
/** The service yards between the riverside buildings and the strip's backs (z): the buildings stop at YARD_Z */
export const YARD_Z = BLOCK_RECT['trench-a0'][3] - STRIP_D - 2.4;

/**
 * Each block's strip along Trench Avenue, the land the rows' recipe lays on (projects.ts `ROW_BLOCKS`): its back
 * edge a hair off straight, so the recipe lays its one row along the avenue, facing it
 */
export const STRIPS: { id: string; poly: Pt[] }[] = RIVER_BLOCKS.map((id) => {
  const [x0, , x1, z1] = BLOCK_RECT[id];
  return {
    id,
    poly: [
      [x0, z1 - STRIP_D - 0.01],
      [x0, z1],
      [x1, z1],
      [x1, z1 - STRIP_D],
    ],
  };
});

/** One part of a building: its footprint and its roof (or top) over the slab */
export interface Part {
  rect: Rect;
  h: number;
}
export type RiversideId = 'wharf' | 'refinery' | 'stores' | 'arms' | 'pierhouse' | 'bar' | 'club';
/** A riverside building: its lot (to the sidewalk), its parts, and its name */
export interface Riverside {
  id: RiversideId;
  name: string;
  block: string;
  lot: Rect;
  parts: Part[];
}

const [A0x0, , A0x1] = BLOCK_RECT['trench-a0'];
const [A1x0, , A1x1] = BLOCK_RECT['trench-a1'];
const [A2x0, , A2x1] = BLOCK_RECT['trench-a2'];
const [A3x0, , A3x1] = BLOCK_RECT['trench-a3'];
const F = FRONT_Z;

/**
 * The Wharf: a glass lobby a storey high (its roof a terrace out front) and over it a slim tower of four stacks
 * of floors, each box shifted from the one under it, a lit crown on top
 */
export const WHARF = (() => {
  const lot: Rect = [A0x0, F, A0x0 + 10, YARD_Z];
  const lobby: Rect = [lot[0] + 0.6, F + 0.9, lot[2] - 0.6, F + 15];
  // The stacks: x0, z0 (the tower's corner), floors; each 7.2 x 7.2
  const W = 7.2;
  const x = lot[0] + 1.4;
  const z = F + 5.6;
  const stacks: { rect: Rect; y0: number; y1: number }[] = [];
  const shifts: Pt[] = [
    [0, 0],
    [0.7, -0.9],
    [-0.4, 0.5],
    [0.5, -0.4],
  ];
  const H = [2.2, 2.2, 2.2, 2];
  let y = 1.25;
  shifts.forEach(([dx, dz], i) => {
    stacks.push({ rect: [x + dx, z + dz, x + dx + W, z + dz + W], y0: y, y1: y + H[i] });
    y += H[i];
  });
  const crown = { rect: [x + 1.6, z + 1.1, x + W - 1.6, z + W - 1.9] as Rect, y0: y, y1: y + 1.1 };
  return { lot, lobby, lobbyH: 1.25, stacks, crown, top: crown.y1 };
})();

/** The Refinery: the hall, its monitor roof down the middle, the chimney at the back, the sign's lattice on the roof's front */
export const REFINERY = (() => {
  const lot: Rect = [A0x0 + 11, F, A0x1, YARD_Z];
  const hall: Rect = [lot[0] + 0.4, F + 0.9, lot[2] - 0.4, F + 15.5];
  const h = 6.9;
  const monitor: Rect = [hall[0] + 2.5, hall[1] + 3.5, hall[2] - 2.5, hall[3] - 3];
  const chimney = { c: [hall[2] - 2.4, hall[3] + 1.6] as Pt, r: 0.95, top: 11.6 };
  // (its base, a square plinth: what's solid)
  const plinth: Rect = [chimney.c[0] - 1.25, chimney.c[1] - 1.25, chimney.c[0] + 1.25, chimney.c[1] + 1.25];
  const sign = { x0: hall[0] + 3, x1: hall[2] - 3, z: hall[1] + 1.2, y0: h + 0.2, y1: h + 2.7 };
  return { lot, hall, h, monitor, monitorH: h + 1.3, chimney, plinth, sign };
})();

/** Harbor Stores: the warehouse, the arcade along its front, the glass penthouse set back on its roof */
export const STORES = (() => {
  const lot: Rect = [A1x0, F, A1x0 + 25.5, YARD_Z];
  const body: Rect = [lot[0] + 0.5, F + 1.6, lot[2] - 0.5, F + 14.5];
  const h = 5.9;
  const penthouse: Rect = [body[0] + 4.5, body[1] + 4.2, body[2] - 4.5, body[3] - 2.4];
  return { lot, body, h, penthouse, penthouseH: h + 1.9, arches: 9 };
})();

/** Trench Arms (avenue.ts draws it): its lot on the corner, on the cross street */
export const ARMS_LOT: Rect = [A1x1 - 6.7, F, A1x1, F + 4.9];

/** The Pier House: the hall, the clock tower out of the middle of its front, on the pier's line (waterfront.ts) */
export const PIER_HOUSE = (() => {
  const cx = (A2x0 + A2x1) / 2 - 4.5;
  const lot: Rect = [cx - 9.5, F, cx + 9.5, YARD_Z - 2];
  const hall: Rect = [cx - 8.6, F + 1.9, cx + 8.6, F + 14];
  const h = 5.3;
  const tower: Rect = [cx - 2, F + 0.5, cx + 2, F + 4.5];
  return { cx, lot, hall, h, tower, towerH: 8.6, top: 11.4, clockY: 7.4 };
})();

/** The Rusty Nail (avenue.ts draws it): its lot on the corner, on the cross street */
export const BAR_LOT: Rect = [A2x1 - 7.3, F, A2x1, F + 4.8];

/** Club PULSE (avenue.ts draws it): the whole river half of trench-a3 */
export const CLUB_LOT: Rect = [A3x0, F, A3x1, YARD_Z - 2];
export const CLUB_BLOCK = 'trench-a3';

export const RIVERSIDE: Riverside[] = [
  {
    id: 'wharf',
    name: 'The Wharf',
    block: 'trench-a0',
    lot: WHARF.lot,
    // (the tower as the box round its stacks, to its crown)
    parts: [
      { rect: WHARF.lobby, h: WHARF.lobbyH },
      {
        rect: [Math.min(...WHARF.stacks.map((s) => s.rect[0])), Math.min(...WHARF.stacks.map((s) => s.rect[1])), Math.max(...WHARF.stacks.map((s) => s.rect[2])), Math.max(...WHARF.stacks.map((s) => s.rect[3]))],
        h: WHARF.top,
      },
    ],
  },
  {
    id: 'refinery',
    name: 'The Refinery',
    block: 'trench-a0',
    lot: REFINERY.lot,
    parts: [
      { rect: REFINERY.hall, h: REFINERY.sign.y1 },
      { rect: REFINERY.plinth, h: REFINERY.chimney.top },
    ],
  },
  { id: 'stores', name: 'Harbor Stores', block: 'trench-a1', lot: STORES.lot, parts: [{ rect: STORES.body, h: STORES.penthouseH }] },
  {
    id: 'pierhouse',
    name: 'The Pier House',
    block: 'trench-a2',
    lot: PIER_HOUSE.lot,
    parts: [
      { rect: PIER_HOUSE.hall, h: PIER_HOUSE.h + 1.2 },
      { rect: PIER_HOUSE.tower, h: PIER_HOUSE.top },
    ],
  },
];

/** Everything solid the riverside's own buildings make (the three places' are avenue.ts's) */
export const RIVERSIDE_SOLIDS: Footprint[] = RIVERSIDE.flatMap((r) => r.parts.map((p): Footprint => [...p.rect, p.h]));
