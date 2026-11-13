/*
 * The far west round the compound (docs/ends-far-west-plan.md Phase 4, the owner's pick: a small close of bungalows
 * along the lane, allotments behind; DOM-free, the chunk's, tested in tests/endsfarhomes.test.ts): on the blocks
 * endsfar.ts laid (`ends-fn`, `ends-fs`, `ends-fa`).
 *
 * - **The bungalows** (`BUNGALOWS`): two on each block, north and south of the compound, facing the lane: one
 *   storey under a pitched roof (lower than the compound's wall-tops' buildings: his is the tallest thing out
 *   here), a front garden behind a low wall with a gap at the path to the door, a back garden in close-board
 *   fencing, a shed in some. Pebble-dash or brick, each door its own colour.
 * - **The allotments** (`ALLOTMENT`): the long block behind all three, in a low wire fence with a gate at each end and
 *   one opposite the compound's back gate; a path down the middle and one in from that gate; plots either side
 *   (`PLOTS`), each with its beds (a crop or dug earth), a shed and a water butt on some, a few left to grass.
 * - `FAR_HOME_SOLIDS`, joined through `addSolids()` when the chunk loads.
 *
 * In world numbers (x across, z north (-) to south (+)); every rect is x0, z0, x1, z1.
 */
import { rng } from './recipes';
import { PLANT } from './palette';
import { FAR_BLOCKS } from './endsfar';
import { HOME } from './home';
import { SLAB_Y, type Rect } from './endswood';
import type { Box } from './solids';

const blocks = (use: string) => FAR_BLOCKS.filter((b) => b.use === use).map((b) => b.rect);

/* ---------- The bungalows ---------- */

/** A bungalow's walls' top and its ridge (over the slab), how deep its front garden is, and its body's size */
export const BUNGALOW = { eaves: 1.15, ridge: 1.85, front: 2.6, depth: 7, side: 1.1 };
/** The front wall along the lane and the back gardens' fences: thickness and height */
export const FRONT_WALL = { t: 0.16, h: 0.45, gap: 1.0 };
export const FAR_FENCE = { t: 0.08, h: 0.95 };
const DOOR_COLOURS = ['#2b4c86', '#8a2a2a', '#2f6a3c', '#d9a02b', '#4a3270', '#1c1b21'];
const WALLS = ['#d8cfbb', '#7a4337', '#c9bfa8', '#8a5a45'];
const ROOFS = ['#5a3a34', '#4a4a55', '#6a4038'];

export interface Bungalow {
  id: string;
  /** Its lot (the block's half), its body, its front garden and its back garden */
  lot: Rect;
  rect: Rect;
  front: Rect;
  back: Rect;
  /** The front door's middle on the east wall (z), and the path's gap in the front wall opposite it */
  doorZ: number;
  walls: string;
  roof: string;
  door: string;
  /** A shed in the back garden (some) */
  shed: Rect | null;
  /** A wheelie bin by the front wall */
  bin: [number, number];
}
export const BUNGALOWS: Bungalow[] = blocks('bungalows').flatMap((B, bi) => {
  const [x0, z0, x1, z1] = B;
  const half = (z1 - z0) / 2;
  return [0, 1].map((k): Bungalow => {
    const r = rng(8100 + bi * 10 + k);
    const lot: Rect = [x0, z0 + k * half, x1, z0 + (k + 1) * half];
    const rect: Rect = [x1 - BUNGALOW.front - BUNGALOW.depth, lot[1] + BUNGALOW.side, x1 - BUNGALOW.front, lot[3] - BUNGALOW.side];
    const doorZ = rect[1] + (r() < 0.5 ? 1.6 : rect[3] - rect[1] - 1.6);
    const back: Rect = [x0, lot[1], rect[0], lot[3]];
    const shedAt = r();
    return {
      id: `bungalow-${bi}-${k}`,
      lot,
      rect,
      front: [rect[2], lot[1], x1, lot[3]],
      back,
      doorZ,
      walls: WALLS[Math.floor(r() * WALLS.length)],
      roof: ROOFS[Math.floor(r() * ROOFS.length)],
      door: DOOR_COLOURS[(bi * 2 + k + Math.floor(r() * 2)) % DOOR_COLOURS.length],
      shed: shedAt < 0.6 ? [x0 + 0.5, (shedAt < 0.3 ? lot[1] + 0.5 : lot[3] - 1.9), x0 + 2.1, (shedAt < 0.3 ? lot[1] + 1.9 : lot[3] - 0.5)] : null,
      bin: [x1 - FRONT_WALL.t - 0.5, doorZ + (doorZ - (lot[1] + lot[3]) / 2 > 0 ? -1.4 : 1.4)],
    };
  });
});

/** A bungalow's front wall along the lane, either side of its path's gap */
export function frontWall(b: Bungalow): Rect[] {
  const x1 = b.lot[2];
  const [g0, g1] = [b.doorZ - FRONT_WALL.gap / 2, b.doorZ + FRONT_WALL.gap / 2];
  return [
    [x1 - FRONT_WALL.t, b.lot[1], x1, g0],
    [x1 - FRONT_WALL.t, g1, x1, b.lot[3]],
  ];
}
/** Its back garden's fences: along its two sides from the back of the block to its body's front, and across the back */
export function backFences(b: Bungalow): Rect[] {
  const T = FAR_FENCE.t;
  const [x0, z0, , z1] = b.lot;
  const xf = b.rect[2];
  return [
    [x0, z0, xf, z0 + T],
    [x0, z1 - T, xf, z1],
    [x0, z0 + T, x0 + T, z1 - T],
  ];
}

/* ---------- The allotments ---------- */

const [A] = blocks('allotments');
/** The wire fence round them: thickness and height; its gates' width */
export const WIRE = { t: 0.06, h: 0.7, gate: 1.2 };
const MID = (A[0] + A[2]) / 2;
/** The compound's back gate's line (the gate in the allotments' east fence is opposite it) */
const GATE_Z = (HOME.backGate.z0 + HOME.backGate.z1) / 2;
export interface Plot {
  id: string;
  rect: Rect;
  /** Its beds across it (each a strip), and what's in each: a crop's colour, or '' for dug earth; none: left to grass */
  beds: { rect: Rect; crop: string }[];
  shed: Rect | null;
  /** A water butt by the shed */
  butt: [number, number] | null;
}
/** The crops' greens (the palette's plants: no colour of the ground's is written anywhere else) */
const CROPS: string[] = [PLANT.hedgeTop, PLANT.shrub, PLANT.clipped, PLANT.hedge, PLANT.box, PLANT.shrubDark];
export const ALLOTMENT = (() => {
  const [x0, z0, x1, z1] = A;
  const PATH = 1.2;
  /** The path down the middle, and the one in from the east gate to it */
  const paths: Rect[] = [
    [MID - PATH / 2, z0 + WIRE.t, MID + PATH / 2, z1 - WIRE.t],
    [MID + PATH / 2, GATE_Z - PATH / 2, x1 - WIRE.t, GATE_Z + PATH / 2],
  ];
  /** The gates: one at each end of the middle path (in the north and south fences), one in the east fence */
  const g = WIRE.gate / 2;
  const fence: Rect[] = [
    [x0, z0, MID - g, z0 + WIRE.t],
    [MID + g, z0, x1, z0 + WIRE.t],
    [x0, z1 - WIRE.t, MID - g, z1],
    [MID + g, z1 - WIRE.t, x1, z1],
    [x0, z0 + WIRE.t, x0 + WIRE.t, z1 - WIRE.t],
    [x1 - WIRE.t, z0 + WIRE.t, x1, GATE_Z - g],
    [x1 - WIRE.t, GATE_Z + g, x1, z1 - WIRE.t],
  ];
  // The plots: a column each side of the middle path, in rows either side of the cross path
  const [LEN, GAP, EDGE] = [6.4, 1.0, 0.9];
  const rows: [number, number][] = [];
  for (let z = z0 + EDGE; z + LEN <= GATE_Z - PATH / 2 - 0.5; z += LEN + GAP) rows.push([z, z + LEN]);
  for (let z = GATE_Z + PATH / 2 + 0.5; z + LEN <= z1 - EDGE; z += LEN + GAP) rows.push([z, z + LEN]);
  const cols: [number, number][] = [
    [x0 + 0.6, MID - PATH / 2 - 0.3],
    [MID + PATH / 2 + 0.3, x1 - 0.6],
  ];
  const plots: Plot[] = rows.flatMap(([za, zb], ri) =>
    cols.map(([xa, xb], ci): Plot => {
      const r = rng(8300 + ri * 7 + ci);
      const rect: Rect = [xa, za, xb, zb];
      const fallow = r() < 0.14;
      // (a shed in a far corner of some, the beds kept clear of it)
      const hasShed = !fallow && r() < 0.45;
      const sx = ci === 0 ? xa : xb - 1.3;
      const shed: Rect | null = hasShed ? [sx, zb - 1.1, sx + 1.3, zb] : null;
      const beds: Plot['beds'] = [];
      if (!fallow) {
        const n = 3 + Math.floor(r() * 2);
        const span = (shed ? zb - 1.4 : zb) - za;
        const w = span / n;
        for (let k = 0; k < n; k++) beds.push({ rect: [xa + 0.15, za + k * w + 0.15, xb - 0.15, za + (k + 1) * w - 0.15], crop: r() < 0.25 ? '' : CROPS[Math.floor(r() * CROPS.length)] });
      }
      return { id: `plot-${ri}-${ci}`, rect, beds, shed, butt: shed ? [ci === 0 ? shed[2] + 0.3 : shed[0] - 0.3, shed[1] + 0.5] : null };
    })
  );
  return { rect: A, paths, fence, plots, gateZ: GATE_Z, mid: MID };
})();
export const PLOTS = ALLOTMENT.plots;
/** A shed's walls' top (over the slab), a bungalow's shed's and a plot's the same */
export const SHED_H = 0.95;

/** What's solid: the bungalows, their front walls, fences and sheds; the allotments' fence (its gates open) and sheds */
export const FAR_HOME_SOLIDS: Box[] = [
  ...BUNGALOWS.flatMap((b): Box[] => [
    [...b.rect, SLAB_Y + BUNGALOW.ridge] as Box,
    ...frontWall(b).map((r): Box => [...r, SLAB_Y + FRONT_WALL.h]),
    ...backFences(b).map((r): Box => [...r, SLAB_Y + FAR_FENCE.h]),
    ...(b.shed ? [[...b.shed, SLAB_Y + SHED_H] as Box] : []),
  ]),
  ...ALLOTMENT.fence.map((r): Box => [...r, SLAB_Y + WIRE.h]),
  ...PLOTS.flatMap((p): Box[] => (p.shed ? [[...p.shed, SLAB_Y + SHED_H] as Box] : [])),
];
