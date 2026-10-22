/*
 * The Trenches' buildings as data, step 2 (docs/growth-plan.md Phase 9;
 * DOM-free, tested in tests/projects.test.ts): what stands on The Trenches'
 * blocks (trenches.ts).
 *
 * - **The projects** (`TOWERS`): brick tower blocks on the blocks of row B,
 *   cross-shaped or long slabs, 8 to 10 storeys (every one under the
 *   Emporium), set back on lawns, each with its door at the end of the arm
 *   (or the middle of the long side) nearest a street and a path out to
 *   the sidewalk. They're the Trench Houses, numbered.
 * - **The Block** (`THE_BLOCK`): the courtyard at the heart of the projects,
 *   on the block straight south of The Trenches' metro station: a fenced
 *   basketball court, a playground, a handball wall, benches, a community
 *   garden and string lights; the storyline will start here.
 * - **Rows** (`ROW_BLOCKS`): brownstone walk-ups and corner shops round the
 *   blocks of row A (along Trench Avenue and the bank avenue) and along
 *   Bottom Street on row C, laid by a recipe (`rowhouses`, recipes.ts).
 *
 * Every footprint is in `PROJECT_SOLIDS`, from the same numbers.
 */
import { FLOOR, PARAPET, SHOP_H, type Face, type Footprint, type Pt, type Rect } from './downtown';
import { RECIPES, layBlock, rng } from './recipes';
import { KIT_SPEC, heightOf, lotSolids, type Lot } from './kits';
import { WALK_W } from './layout';
import { TRENCH_BLOCKS, type TrenchBlock } from './trenches';
import { STATIONS } from './metro';

/** The Emporium's roof (landmarks.ts): nothing here comes near it */
export const EMPORIUM_ROOF = 12.5;

export type TowerShape = 'cross' | 'slab';
export interface Tower {
  id: string;
  /** Its number on the door (the Trench Houses) */
  no: number;
  block: string;
  shape: TowerShape;
  /** Its middle, and which way a slab runs (a cross is the same both ways) */
  c: Pt;
  along: 'x' | 'z';
  /** Storeys above the ground floor */
  floors: number;
  /** Its roof over the slab, and the top of whatever's on the roof (the stair and lift house, a water tank) */
  h: number;
  top: number;
  /** A water tank on its roof (the lower ones), or only the stair and lift house */
  tank: boolean;
  /** Its footprint: one rectangle for a slab, the two arms for a cross */
  parts: Rect[];
  /** Its door: where, and the way it faces (out of the building) */
  door: { x: number; z: number; face: Face };
}

/** A cross's arms: this long end to end, this wide */
export const CROSS = { span: 11, arm: 4.2 };
/** A slab: this long, this deep */
export const SLAB_SIZE = { long: 14, deep: 5 };
/** Roof furniture: the stair and lift house and a water tank on its legs, above the parapet */
export const BULKHEAD = 0.9;
export const TANK = 1.75;

/** What each block of row B carries: two crosses, two slabs one behind the other, one cross, or The Block */
type BlockPlan = 'crosses' | 'slabs' | 'cross' | 'block';
const PLANS: Record<string, BlockPlan> = {
  'trench-b0-0': 'slabs',
  'trench-b0-1': 'crosses',
  'trench-b0-2': 'block',
  'trench-b0-3': 'crosses',
  'trench-b0-4': 'cross',
  'trench-b1-0': 'slabs',
  'trench-b1-1': 'crosses',
  'trench-b1-2': 'crosses',
  'trench-b1-3': 'crosses',
  'trench-b1-4': 'cross',
  'trench-b2-0': 'cross',
  'trench-b2-1': 'slabs',
  'trench-b2-2': 'crosses',
  'trench-b2-3': 'slabs',
  'trench-b2-4': 'cross',
};
/** The blocks round The Block: their towers rise the highest */
const ROUND_THE_BLOCK = ['trench-b0-1', 'trench-b0-3', 'trench-b1-2'];
/** The blocks people walk round (life.ts): The Block, its neighbours and the rows across Trench Avenue from it */
export const TRENCH_WALKS = ['trench-b0-2', ...ROUND_THE_BLOCK, 'trench-a1', 'trench-a2'];

const bounds = (b: TrenchBlock): Rect => {
  const xs = b.poly.map((p) => p[0]);
  const zs = b.poly.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
};

/** A tower's footprint from its shape and middle */
export function partsOf(shape: TowerShape, [cx, cz]: Pt, along: 'x' | 'z'): Rect[] {
  if (shape === 'cross') {
    const s = CROSS.span / 2;
    const a = CROSS.arm / 2;
    return [
      [cx - s, cz - a, cx + s, cz + a],
      [cx - a, cz - s, cx + a, cz + s],
    ];
  }
  const [l, d] = [SLAB_SIZE.long / 2, SLAB_SIZE.deep / 2];
  return along === 'x' ? [[cx - l, cz - d, cx + l, cz + d]] : [[cx - d, cz - l, cx + d, cz + l]];
}

/** Its door: on the side nearest the block's edge (a street), at the end of the arm or the middle of the long side */
function doorOf(shape: TowerShape, c: Pt, along: 'x' | 'z', blk: Rect): Tower['door'] {
  const [x0, z0, x1, z1] = blk;
  const gaps: [Face, number][] = [
    ['n', c[1] - z0],
    ['s', z1 - c[1]],
    ['w', c[0] - x0],
    ['e', x1 - c[0]],
  ];
  // A slab's door is on one of its long sides
  const ok = gaps.filter(([f]) => shape === 'cross' || (along === 'x' ? f === 'n' || f === 's' : f === 'e' || f === 'w'));
  const face = ok.sort((p, q) => p[1] - q[1])[0][0];
  const reach = shape === 'cross' ? CROSS.span / 2 : SLAB_SIZE.deep / 2;
  const out = reach + 0.25;
  return face === 'n' ? { x: c[0], z: c[1] - out, face } : face === 's' ? { x: c[0], z: c[1] + out, face } : face === 'w' ? { x: c[0] - out, z: c[1], face } : { x: c[0] + out, z: c[1], face };
}

export const TOWERS: Tower[] = (() => {
  const out: Tower[] = [];
  const r = rng(9090);
  for (const blk of TRENCH_BLOCKS) {
    const plan = PLANS[blk.id];
    if (!plan || plan === 'block') continue;
    const b = bounds(blk);
    const [x0, z0, x1, z1] = b;
    const [mx, mz] = [(x0 + x1) / 2, (z0 + z1) / 2];
    const spots: { shape: TowerShape; c: Pt; along: 'x' | 'z' }[] =
      plan === 'crosses'
        ? [
            { shape: 'cross', c: [x0 + 8, mz], along: 'x' },
            { shape: 'cross', c: [x1 - 8, mz], along: 'x' },
          ]
        : plan === 'slabs'
          ? [
              { shape: 'slab', c: [mx, z0 + 7.5], along: 'x' },
              { shape: 'slab', c: [mx, z1 - 7.5], along: 'x' },
            ]
          : [{ shape: 'cross', c: [mx, mz], along: 'x' }];
    for (const s of spots) {
      const tall = ROUND_THE_BLOCK.includes(blk.id);
      const floors = tall ? 9 : 7 + Math.floor(r() * 3);
      const h = Math.round((SHOP_H + floors * FLOOR + PARAPET) * 100) / 100;
      // The tallest carry only the stair and lift house; the rest a water tank too
      const tank = floors <= 8;
      out.push({
        id: `tower-${out.length + 1}`,
        no: out.length + 1,
        block: blk.id,
        shape: s.shape,
        c: s.c,
        along: s.along,
        floors,
        h,
        top: Math.round((h + (tank ? TANK : BULKHEAD)) * 100) / 100,
        tank,
        parts: partsOf(s.shape, s.c, s.along),
        door: doorOf(s.shape, s.c, s.along, b),
      });
    }
  }
  return out;
})();

/* ---------- The Block ---------- */

const BLOCK = TRENCH_BLOCKS.find((b) => b.id === 'trench-b0-2')!;
const [BX0, BZ0, BX1, BZ1] = bounds(BLOCK);
const STATION = STATIONS.find((s) => s.id === 'trenches')!;

/** The Block: the courtyard's parts, in world numbers */
export const THE_BLOCK = {
  block: BLOCK.id,
  rect: [BX0, BZ0, BX1, BZ1] as Rect,
  /** Where its pin and the camera look (the middle of the court and the playground) */
  focus: [(BX0 + BX1) / 2, (BZ0 + BZ1) / 2 + 2] as Pt,
  /** The plaza by the station's stair tower, at the north edge */
  plaza: [BX0 + 1, BZ0 + 0.5, BX1 - 1, BZ0 + 7] as Rect,
  /** The basketball court (its lines), and the fence round it with a gate in each long side */
  court: [BX1 - 14.5, BZ0 + 11, BX1 - 6, BZ0 + 26.5] as Rect,
  fence: [BX1 - 15.5, BZ0 + 10, BX1 - 5, BZ0 + 27.5] as Rect,
  gate: 2,
  fenceH: 2.4,
  /** The playground's soft ground */
  playground: [BX0 + 2, BZ0 + 10.5, BX0 + 12.5, BZ0 + 20.5] as Rect,
  /** The handball wall (solid) */
  handball: [BX0 + 2.5, BZ0 + 24.5, BX0 + 9.5, BZ0 + 25] as Rect,
  handballH: 3.2,
  /** The community garden's raised beds */
  beds: [0, 1, 2].map((i): Rect => [BX0 + 2.5 + i * 3.8, BZ1 - 7, BX0 + 5.5 + i * 3.8, BZ1 - 3]),
  /** Benches: x, z and the way they face (radians, 0 is +z) */
  benches: [
    [BX1 - 17.2, BZ0 + 14, Math.PI / 2],
    [BX1 - 17.2, BZ0 + 19, Math.PI / 2],
    [BX1 - 17.2, BZ0 + 24, Math.PI / 2],
    [BX0 + 7, BZ0 + 8.5, 0],
    [BX0 + 14.5, BZ0 + 8.5, 0],
    [BX1 - 12, BZ0 + 8.5, 0],
    [BX0 + 14.5, BZ0 + 15.5, -Math.PI / 2],
    [BX0 + 14.5, BZ1 - 6, -Math.PI / 2],
  ] as [number, number, number][],
  /** Picnic tables south of the court */
  tables: [
    [BX1 - 13, BZ1 - 6],
    [BX1 - 7.5, BZ1 - 6],
  ] as Pt[],
  /** Poles the string lights hang between */
  poles: [
    [BX0 + 1.5, BZ0 + 8.5],
    [BX1 - 1.5, BZ0 + 8.5],
    [BX0 + 1.5, BZ1 - 9],
    [BX1 - 1.5, BZ1 - 9],
    [BX1 - 16.5, BZ0 + 9],
    [BX1 - 16.5, BZ0 + 28.5],
  ] as Pt[],
  /** The station's stair tower stands at its north edge */
  station: STATION.tower,
};

/** Where Walk in and fast travel stand you: on the plaza, by the station's stairs, facing in under THE BLOCK's gantry */
export const BLOCK_SPAWN = { x: (BX0 + BX1) / 2 + 6.5, z: BZ0 + 4.5, yaw: Math.PI };

/** Its fence, in runs (x0, z0, x1, z1), with a gate's gap in the middle of each long side */
export function blockFence(): Rect[] {
  const [x0, z0, x1, z1] = THE_BLOCK.fence;
  const t = 0.06;
  const zm = (z0 + z1) / 2;
  const g = THE_BLOCK.gate / 2;
  return [
    [x0, z0, x1, z0 + t],
    [x0, z1 - t, x1, z1],
    [x0, z0, x0 + t, zm - g],
    [x0, zm + g, x0 + t, z1],
    [x1 - t, z0, x1, zm - g],
    [x1 - t, zm + g, x1, z1],
  ];
}

/* ---------- The rows ---------- */

/** A row block: the land a recipe lays on, its seed */
export interface RowBlock {
  id: string;
  poly: Pt[];
  seed: number;
}
/**
 * Row A's blocks whole (rows round all four sides, a yard inside); row C's
 * only along Bottom Street (a strip one row deep: behind it, the parking and
 * the trees along the highway)
 */
export const ROW_BLOCKS: RowBlock[] = TRENCH_BLOCKS.filter((b) => b.row !== 'B').map((b, i) => {
  if (b.row === 'A') return { id: b.id, poly: b.poly, seed: 7100 + i };
  const [x0, z0, x1] = bounds(b);
  const d = RECIPES.rowhouses.depth + 0.1;
  // (its back edge a hair off straight, so the recipe lays its one row along Bottom Street, facing it)
  const poly: Pt[] = [
    [x0, z0],
    [x0, z0 + d],
    [x1, z0 + d + 0.01],
    [x1, z0],
  ];
  return { id: b.id, poly, seed: 7100 + i };
});

/* ---------- The corner shops (step 3) ---------- */

export type CornerId = 'c0' | 'c1' | 'c2' | 'c3';
/** A corner shop: its made-up name and colour, and the row lot it takes (a shop, facing its street) */
export interface CornerShop {
  id: CornerId;
  name: string;
  color: string;
  block: string;
  lot: Lot;
  /** Where you stand to serve its customers, and where a courier drops off: out on the sidewalk at its door */
  door: { x: number; z: number };
}
/** Which lot: the one facing `face` nearest `near` on the block, at least this wide */
const CORNER_SPECS: { id: CornerId; name: string; color: string; block: string; near: Pt; face: Face }[] = [
  { id: 'c0', name: 'BLOCK BODEGA', color: '#ffd23f', block: 'trench-a2', near: [-76.5, 125.5], face: 's' },
  { id: 'c1', name: 'TRENCH MART', color: '#2bff88', block: 'trench-a1', near: [-147.5, 125.5], face: 's' },
  { id: 'c2', name: 'AVENUE DELI', color: '#ff6a2f', block: 'trench-a3', near: [-48, 125.5], face: 's' },
  { id: 'c3', name: 'CORNER STOP', color: '#00eaff', block: 'trench-c2', near: [-76.5, 252.5], face: 'n' },
];
const CORNER_W = 3;

/** The rows laid, with the corner shops' lots made shops (their own drawing, cornershops.ts) */
const LAID = (() => {
  const byBlock = ROW_BLOCKS.map((b) => layBlock(b.poly, RECIPES.rowhouses, b.seed));
  const corners: CornerShop[] = CORNER_SPECS.map((c) => {
    const i = ROW_BLOCKS.findIndex((b) => b.id === c.block);
    const mid = (l: Lot): Pt => [(l.box[0] + l.box[2]) / 2, (l.box[1] + l.box[3]) / 2];
    const wide = (l: Lot) => (l.face === 'n' || l.face === 's' ? l.box[2] - l.box[0] : l.box[3] - l.box[1]);
    const lot = byBlock[i].lots
      .filter((l) => l.face === c.face && wide(l) >= CORNER_W)
      .sort((a, b) => Math.hypot(mid(a)[0] - c.near[0], mid(a)[1] - c.near[1]) - Math.hypot(mid(b)[0] - c.near[0], mid(b)[1] - c.near[1]))[0];
    // A shop of its height (a shopfront, no stoop)
    lot.type = 'shop';
    lot.sign = undefined;
    lot.front = KIT_SPEC.shop.front;
    lot.h = heightOf('shop', lot.floors);
    lot.solids = lotSolids(lot);
    const [x0, z0, x1, z1] = lot.box;
    const [mx, mz] = mid(lot);
    const out = WALK_W / 2;
    const door = c.face === 's' ? { x: mx, z: z1 + out } : c.face === 'n' ? { x: mx, z: z0 - out } : c.face === 'w' ? { x: x0 - out, z: mz } : { x: x1 + out, z: mz };
    return { id: c.id, name: c.name, color: c.color, block: c.block, lot, door };
  });
  return { lots: byBlock.flatMap((l) => l.lots), alleys: byBlock.flatMap((l) => l.alleys), byBlock, corners };
})();
/** The rows laid */
export const rows = () => LAID;
export const CORNER_SHOPS: CornerShop[] = LAID.corners;
/** Is a row lot one of the corner shops' (drawn from the save, not with the rows) */
export const isCorner = (l: Lot) => CORNER_SHOPS.some((c) => c.lot === l);

/** Everything solid: the towers, The Block's fence and handball wall, the rows' buildings and their alleys' bollards */
export function projectSolids(): Footprint[] {
  const r = 0.1;
  const d = rows();
  return [
    ...TOWERS.flatMap((t) => t.parts.map((p): Footprint => [...p, t.top])),
    ...blockFence().map((f): Footprint => [...f, THE_BLOCK.fenceH]),
    [...THE_BLOCK.handball, THE_BLOCK.handballH],
    ...d.lots.flatMap((l) => l.solids),
    ...d.alleys.flatMap((a) => a.bollards.map(([x, z]): Footprint => [x - r, z - r, x + r, z + r, 0.9])),
  ];
}
export const PROJECT_SOLIDS: Footprint[] = projectSolids();
