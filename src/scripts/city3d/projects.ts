/*
 * The Trenches' buildings as data, step 2 (docs/growth-plan.md Phase 9;
 * DOM-free, tested in tests/projects.test.ts): what stands on The Trenches'
 * blocks (trenches.ts).
 *
 * - **The projects** (`TOWERS`): the Trench Houses, numbered, on the blocks
 *   of row B, each block laid out by hand (`LAYOUTS`) from a mix of designs
 *   (`TowerDesign`): L and T shapes round half-courtyards, stepped towers,
 *   low walk-ups with stoops, slim point towers (the tallest), crosses and a
 *   slab; 4 to 10 storeys, every one under the Emporium; mostly red brick
 *   with some brown, tan and dark (`Brick`); set back on lawns, each door on
 *   the side nearest a street. `towerShell()` turns a tower's parts into its
 *   walls and roofs.
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
import { RECIPES, layBlock, type Laid } from './recipes';
import { KIT_SPEC, heightOf, lotSolids, type Lot } from './kits';
import { WALK_W } from './layout';
import { TRENCH_BLOCKS, type TrenchBlock } from './trenches';
import { STATIONS } from './metro';

/** The Emporium's roof (landmarks.ts): nothing here comes near it */
export const EMPORIUM_ROOF = 12.5;

/** The Trench Houses' designs: no two blocks alike */
export type TowerDesign = 'cross' | 'slab' | 'L' | 'T' | 'stepped' | 'walkup' | 'point';
export const TOWER_DESIGNS: TowerDesign[] = ['cross', 'slab', 'L', 'T', 'stepped', 'walkup', 'point'];
/** Brick: mostly red, some brown, tan and dark (wall atlas bands, infill.ts) */
export type Brick = 'brick' | 'brownstone' | 'brickTan' | 'brickDark';
/** One piece of a tower: its footprint and its own height (a stepped tower's ends are lower than its middle) */
export interface TowerPart {
  rect: Rect;
  /** Storeys above the ground floor */
  floors: number;
  /** Its roof over the slab */
  h: number;
}
export interface Tower {
  id: string;
  /** Its number on the door (the Trench Houses) */
  no: number;
  block: string;
  design: TowerDesign;
  parts: TowerPart[];
  /** The middle of its footprint's bounds */
  c: Pt;
  /** Its tallest part's storeys and roof, and the top of whatever's on that roof (the stair and lift house, a water tank) */
  floors: number;
  h: number;
  top: number;
  /** The tallest part (the stair and lift house stands in its middle; a water tank on the lower towers) */
  main: number;
  tank: boolean;
  /** Its door: where, and the way it faces (out of the building) */
  door: { x: number; z: number; face: Face };
  /** A walk-up's front stoops, every few steps along its front (solid, knee high) */
  stoops: Rect[];
  brick: Brick;
  /** Balconies (with washing on some) on its long walls */
  balconies: boolean;
  /** Scaffolding up one face (the footprint of its poles), on one tower only */
  scaffold: Rect | null;
}

/** A cross's arms: this long end to end, this wide (kept for The Block's neighbours) */
export const CROSS = { span: 11, arm: 4.2 };
/** Roof furniture: the stair and lift house and a water tank on its legs, above the parapet */
export const BULKHEAD = 0.9;
export const TANK = 1.75;
/** A stoop: out from the wall, wide, high */
export const STOOP = { out: 0.75, w: 1.3, h: 0.45 };
/** Scaffolding stands this far out from its wall */
export const SCAFFOLD_OUT = 0.9;

/** Five in eight red, then brown, tan and dark (picked by a tower's number, so they scatter) */
const BRICKS: Brick[] = ['brick', 'brick', 'brownstone', 'brick', 'brickTan', 'brick', 'brick', 'brickDark'];
const roofOver = (floors: number) => Math.round((SHOP_H + floors * FLOOR + PARAPET) * 100) / 100;

/**
 * Every block of the projects, laid out by hand in its own numbers (u east,
 * v south from its north-west corner): each tower a design and its parts
 * [u0, v0, u1, v1, floors]. The three blocks round The Block rise the
 * highest; point towers are the tallest of all (nine storeys over the
 * ground floor, the roof's stair house still well under the Emporium).
 * `trench-b0-3`, east of The Block, is left for the rec centre.
 */
type PartSpec = [number, number, number, number, number];
const LAYOUTS: Record<string, { design: TowerDesign; parts: PartSpec[]; scaffold?: Face; balconies?: boolean }[]> = {
  'trench-b0-0': [
    { design: 'L', parts: [[2, 2, 20, 7, 7], [2, 7, 7, 18, 7]], balconies: true },
    { design: 'point', parts: [[20.5, 24.5, 27.5, 31.5, 9]] },
  ],
  'trench-b0-1': [
    { design: 'stepped', parts: [[13, 6.5, 20, 13.5, 6], [13, 13.5, 20, 25.5, 9], [13, 25.5, 20, 32.5, 6]] },
    { design: 'walkup', parts: [[2, 3, 6.5, 36, 4]] },
  ],
  'trench-b0-4': [
    { design: 'point', parts: [[8.75, 6.5, 15.75, 13.5, 9]] },
    { design: 'walkup', parts: [[2, 30, 22.5, 34.5, 4]] },
  ],
  'trench-b1-0': [
    { design: 'T', parts: [[3, 3, 30, 8, 7], [14, 8, 19, 24, 7]], balconies: true },
    { design: 'walkup', parts: [[3, 28.8, 30, 33.3, 4]] },
  ],
  'trench-b1-1': [
    { design: 'L', parts: [[2, 2, 16, 7, 8], [2, 7, 7, 16, 8]] },
    { design: 'L', parts: [[17, 28, 31, 33, 7], [26, 19, 31, 28, 7]], balconies: true },
  ],
  'trench-b1-2': [
    { design: 'cross', parts: [[11, 15.4, 22, 19.6, 9], [14.4, 12, 18.6, 23, 9]] },
    { design: 'walkup', parts: [[2, 3, 6.5, 32, 5]] },
    { design: 'walkup', parts: [[26.5, 3, 31, 32, 5]] },
  ],
  'trench-b1-3': [
    { design: 'stepped', parts: [[4.5, 7, 11.5, 13, 5], [11.5, 7, 21.5, 13, 8], [21.5, 7, 28.5, 13, 5]], balconies: true },
    { design: 'point', parts: [[21, 23, 27.5, 29.5, 9]] },
    { design: 'walkup', parts: [[2, 23, 13, 27.5, 4]] },
  ],
  'trench-b1-4': [{ design: 'slab', parts: [[9.25, 7.5, 15.25, 27.5, 8]], balconies: true }],
  'trench-b2-0': [
    { design: 'walkup', parts: [[2, 2, 31, 6.5, 4]] },
    { design: 'walkup', parts: [[2, 9.5, 6.5, 27, 5]] },
    { design: 'walkup', parts: [[26.5, 9.5, 31, 27, 4]] },
  ],
  'trench-b2-1': [{ design: 'cross', parts: [[11, 12.4, 22, 16.6, 7], [14.4, 9, 18.6, 20, 7]] }],
  'trench-b2-2': [
    { design: 'L', parts: [[15, 2, 31, 7, 8], [26, 7, 31, 18, 8]], balconies: true },
    { design: 'walkup', parts: [[2, 22.8, 18, 27.3, 5]] },
  ],
  'trench-b2-3': [{ design: 'stepped', parts: [[3.5, 11.5, 10.5, 17.5, 6], [10.5, 11.5, 22.5, 17.5, 8], [22.5, 11.5, 29.5, 17.5, 6]], scaffold: 's' }],
  'trench-b2-4': [{ design: 'T', parts: [[2, 3, 7, 26, 7], [7, 12, 20, 17, 7]] }],
};
/** The blocks round The Block */
const ROUND_THE_BLOCK = ['trench-b0-1', 'trench-b0-3', 'trench-b1-2'];
/** The blocks people walk round (life.ts): The Block, its neighbours and the rows across Trench Avenue from it */
export const TRENCH_WALKS = ['trench-b0-2', ...ROUND_THE_BLOCK, 'trench-a1', 'trench-a2'];

const bounds = (b: TrenchBlock): Rect => {
  const xs = b.poly.map((p) => p[0]);
  const zs = b.poly.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
};
const boundsOf = (rs: Rect[]): Rect => [Math.min(...rs.map((r) => r[0])), Math.min(...rs.map((r) => r[1])), Math.max(...rs.map((r) => r[2])), Math.max(...rs.map((r) => r[3]))];

/** Its door: on the side nearest the block's edge (a street), in the middle of the part that reaches furthest that way */
function doorOf(parts: Rect[], blk: Rect): Tower['door'] {
  const [x0, z0, x1, z1] = blk;
  const [bx0, bz0, bx1, bz1] = boundsOf(parts);
  const gaps: [Face, number][] = [
    ['n', bz0 - z0],
    ['s', z1 - bz1],
    ['w', bx0 - x0],
    ['e', x1 - bx1],
  ];
  const face = gaps.sort((p, q) => p[1] - q[1])[0][0];
  const edge = (r: Rect) => (face === 'n' ? -r[1] : face === 's' ? r[3] : face === 'w' ? -r[0] : r[2]);
  const r = [...parts].sort((a, b) => edge(b) - edge(a))[0];
  const out = 0.25;
  const [mx, mz] = [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];
  return face === 'n' ? { x: mx, z: r[1] - out, face } : face === 's' ? { x: mx, z: r[3] + out, face } : face === 'w' ? { x: r[0] - out, z: mz, face } : { x: r[2] + out, z: mz, face };
}
/** A walk-up's stoops: one at its door and every six or so along the same front */
function stoopsOf(r: Rect, door: Tower['door']): Rect[] {
  const along = door.face === 'n' || door.face === 's';
  const [a0, a1] = along ? [r[0], r[2]] : [r[1], r[3]];
  const n = Math.max(1, Math.round((a1 - a0) / 6));
  const out: Rect[] = [];
  for (let k = 0; k < n; k++) {
    const m = a0 + ((a1 - a0) * (k + 0.5)) / n;
    const [w, o] = [STOOP.w / 2, STOOP.out];
    if (door.face === 'n') out.push([m - w, r[1] - o, m + w, r[1]]);
    else if (door.face === 's') out.push([m - w, r[3], m + w, r[3] + o]);
    else if (door.face === 'w') out.push([r[0] - o, m - w, r[0], m + w]);
    else out.push([r[2], m - w, r[2] + o, m + w]);
  }
  return out;
}

export const TOWERS: Tower[] = (() => {
  const out: Tower[] = [];
  for (const blk of TRENCH_BLOCKS) {
    const lay = LAYOUTS[blk.id];
    if (!lay) continue;
    const b = bounds(blk);
    for (const spec of lay) {
      const parts: TowerPart[] = spec.parts.map(([u0, v0, u1, v1, floors]) => ({ rect: [b[0] + u0, b[1] + v0, b[0] + u1, b[1] + v1], floors, h: roofOver(floors) }));
      const rects = parts.map((p) => p.rect);
      const main = parts.reduce((m, p, i) => (p.h > parts[m].h || (p.h === parts[m].h && (p.rect[2] - p.rect[0]) * (p.rect[3] - p.rect[1]) > (parts[m].rect[2] - parts[m].rect[0]) * (parts[m].rect[3] - parts[m].rect[1])) ? i : m), 0);
      const floors = parts[main].floors;
      const h = parts[main].h;
      // The tallest carry only the stair and lift house; the rest a water tank too
      const tank = floors <= 8;
      const door = doorOf(rects, b);
      const [bx0, bz0, bx1, bz1] = boundsOf(rects);
      // Mostly red brick; some brown, tan and dark, scattered
      const brick = BRICKS[((out.length + 1) * 3) % BRICKS.length];
      let scaffold: Rect | null = null;
      if (spec.scaffold) {
        const m = parts[main].rect;
        const o = SCAFFOLD_OUT;
        scaffold = spec.scaffold === 's' ? [m[0], m[3], m[2], m[3] + o] : spec.scaffold === 'n' ? [m[0], m[1] - o, m[2], m[1]] : spec.scaffold === 'w' ? [m[0] - o, m[1], m[0], m[3]] : [m[2], m[1], m[2] + o, m[3]];
      }
      out.push({
        id: `tower-${out.length + 1}`,
        no: out.length + 1,
        block: blk.id,
        design: spec.design,
        parts,
        c: [(bx0 + bx1) / 2, (bz0 + bz1) / 2],
        floors,
        h,
        top: Math.round((h + (tank ? TANK : BULKHEAD)) * 100) / 100,
        main,
        tank,
        door,
        stoops: spec.design === 'walkup' ? stoopsOf(parts[0].rect, door) : [],
        brick,
        balconies: !!spec.balconies,
        scaffold,
      });
    }
  }
  return out;
})();

/**
 * A tower's walls and roofs, from its parts: the parts cut its footprint into
 * cells, each as tall as the tallest part over it; a wall stands wherever a
 * cell meets a lower one (or the ground), from the lower one's roof (down to
 * the floor line under it, hidden inside, so the windows line up with the
 * rest) to its own. No two walls ever share a plane, however the parts meet.
 * Heights are over the slab.
 */
export interface TowerWall {
  a: Pt;
  c: Pt;
  /** The way it faces (out of the building) */
  n: Pt;
  y0: number;
  y1: number;
}
export function towerShell(parts: TowerPart[]) {
  const xs = [...new Set(parts.flatMap((p) => [p.rect[0], p.rect[2]]))].sort((a, b) => a - b);
  const zs = [...new Set(parts.flatMap((p) => [p.rect[1], p.rect[3]]))].sort((a, b) => a - b);
  const H = (i: number, j: number) => {
    if (i < 0 || j < 0 || i >= xs.length - 1 || j >= zs.length - 1) return 0;
    const cx = (xs[i] + xs[i + 1]) / 2;
    const cz = (zs[j] + zs[j + 1]) / 2;
    return Math.max(0, ...parts.filter((p) => cx > p.rect[0] && cx < p.rect[2] && cz > p.rect[1] && cz < p.rect[3]).map((p) => p.h));
  };
  type Raw = { x: boolean; at: number; from: number; to: number; n: Pt; lo: number; hi: number };
  const raw: Raw[] = [];
  for (let i = 0; i < xs.length; i++)
    for (let j = 0; j < zs.length - 1; j++) {
      const [l, r] = [H(i - 1, j), H(i, j)];
      if (l !== r) raw.push({ x: true, at: xs[i], from: zs[j], to: zs[j + 1], n: r > l ? [-1, 0] : [1, 0], lo: Math.min(l, r), hi: Math.max(l, r) });
    }
  for (let j = 0; j < zs.length; j++)
    for (let i = 0; i < xs.length - 1; i++) {
      const [up, dn] = [H(i, j - 1), H(i, j)];
      if (up !== dn) raw.push({ x: false, at: zs[j], from: xs[i], to: xs[i + 1], n: dn > up ? [0, -1] : [0, 1], lo: Math.min(up, dn), hi: Math.max(up, dn) });
    }
  // Runs of the same wall along one line join up
  const key = (w: Raw) => `${w.x}:${w.at}:${w.n}:${w.lo}:${w.hi}`;
  raw.sort((p, q) => (key(p) < key(q) ? -1 : key(p) > key(q) ? 1 : p.from - q.from));
  const merged: Raw[] = [];
  for (const w of raw) {
    const last = merged[merged.length - 1];
    if (last && key(last) === key(w) && Math.abs(last.to - w.from) < 1e-9) last.to = w.to;
    else merged.push({ ...w });
  }
  const walls: TowerWall[] = merged.map((w) => ({
    a: w.x ? [w.at, w.from] : [w.from, w.at],
    c: w.x ? [w.at, w.to] : [w.to, w.at],
    n: w.n,
    y0: w.lo > 0 ? Math.floor(w.lo) : 0,
    y1: w.hi,
  }));
  // The roofs: every cell under a part, pulled in a hair from each edge it stands over a lower one by (never flush with a wall)
  const roofs: { rect: Rect; h: number }[] = [];
  for (let i = 0; i < xs.length - 1; i++)
    for (let j = 0; j < zs.length - 1; j++) {
      const h = H(i, j);
      if (!h) continue;
      const e = 0.006;
      roofs.push({
        rect: [xs[i] + (H(i - 1, j) < h ? e : 0), zs[j] + (H(i, j - 1) < h ? e : 0), xs[i + 1] - (H(i + 1, j) < h ? e : 0), zs[j + 1] - (H(i, j + 1) < h ? e : 0)],
        h,
      });
    }
  return { walls, roofs };
}

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

/** A row block: the land a recipe lays on, its seed, and whether its rows are turned round (north for south) */
export interface RowBlock {
  id: string;
  poly: Pt[];
  seed: number;
  turned?: boolean;
}
/**
 * The blocks turned round (the owner's call): trench-a2 and trench-a3, so
 * their businesses (Trench Arms, The Rusty Nail, Club PULSE, Block Bodega,
 * Avenue Deli) face north, across the bank avenue to the river, and the
 * brownstones that faced the river face Trench Avenue and the el. The recipe
 * lays them as before and the rows are mirrored north for south: the club
 * keeps its corner on the cross street, every lot and alley its width.
 */
export const TURNED = ['trench-a2', 'trench-a3'];
/**
 * Row A's blocks whole (rows round all four sides, a yard inside); row C's
 * only along Bottom Street (a strip one row deep: behind it, the parking and
 * the trees along the highway)
 */
export const ROW_BLOCKS: RowBlock[] = TRENCH_BLOCKS.filter((b) => b.row === 'A' || b.row === 'C').map((b, i) => {
  if (b.row === 'A') return { id: b.id, poly: b.poly, seed: 7100 + i, turned: TURNED.includes(b.id) };
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
  { id: 'c0', name: 'BLOCK BODEGA', color: '#ffd23f', block: 'trench-a2', near: [-76.5, 96.5], face: 'n' },
  { id: 'c1', name: 'TRENCH MART', color: '#2bff88', block: 'trench-a1', near: [-147.5, 125.5], face: 's' },
  { id: 'c2', name: 'AVENUE DELI', color: '#ff6a2f', block: 'trench-a3', near: [-48, 96.5], face: 'n' },
  { id: 'c3', name: 'CORNER STOP', color: '#00eaff', block: 'trench-c2', near: [-76.5, 252.5], face: 'n' },
];
const CORNER_W = 3;

/** A block's rows mirrored north for south about its middle (`TURNED`): every lot's box and face, its solids, the alleys and their bollards */
function turnRound(laid: Laid, poly: Pt[]): Laid {
  const zs = poly.map((p) => p[1]);
  const m = Math.min(...zs) + Math.max(...zs);
  const flip = (r: Rect): Rect => [r[0], m - r[3], r[2], m - r[1]];
  const face = (f: Face): Face => (f === 'n' ? 's' : f === 's' ? 'n' : f);
  const lots = laid.lots.map((l) => {
    const t: Lot = { ...l, box: flip(l.box), face: face(l.face) };
    t.solids = lotSolids(t);
    return t;
  });
  const alleys = laid.alleys.map((a) => ({ box: flip(a.box), bollards: a.bollards.map(([x, z]): Pt => [x, m - z]) }));
  return { lots, alleys };
}

/** The rows laid, with the corner shops' lots made shops (their own drawing, cornershops.ts) */
const LAID = (() => {
  const byBlock = ROW_BLOCKS.map((b) => {
    const laid = layBlock(b.poly, RECIPES.rowhouses, b.seed);
    return b.turned ? turnRound(laid, b.poly) : laid;
  });
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

/* ---------- Trench Avenue's places (the grit's step 3) ---------- */

export type AvenueId = 'club' | 'bar' | 'arms';
/** One of The Trenches' places on row A (named for Trench Avenue, where they first stood): the row lots it takes (avenue.ts builds on them) and the land they cover */
export interface AvenueLots {
  id: AvenueId;
  block: string;
  lots: Lot[];
  rect: Rect;
}
/**
 * Which lots: every row lot on the block inside this area, on the turned
 * blocks' north side (`TURNED`), facing the bank avenue and the river.
 * Club PULSE takes the corner of trench-a3 (two lots on the cross street,
 * three on the bank avenue); The Rusty Nail and Trench Arms two lots each on
 * trench-a2, the bar next to Block Bodega
 */
const AVENUE_SPECS: { id: AvenueId; block: string; area: Rect }[] = [
  { id: 'club', block: 'trench-a3', area: [-71.6, 96.4, -58.9, 104.7] },
  { id: 'bar', block: 'trench-a2', area: [-88.9, 96.4, -81.85, 101] },
  { id: 'arms', block: 'trench-a2', area: [-95.7, 96.4, -88.6, 101] },
];
export const AVENUE_LOTS: AvenueLots[] = AVENUE_SPECS.map((a) => {
  const i = ROW_BLOCKS.findIndex((b) => b.id === a.block);
  const [x0, z0, x1, z1] = a.area;
  const lots = LAID.byBlock[i].lots.filter((l) => !isCorner(l) && l.box[0] >= x0 && l.box[1] >= z0 && l.box[2] <= x1 && l.box[3] <= z1);
  const rect: Rect = [Math.min(...lots.map((l) => l.box[0])), Math.min(...lots.map((l) => l.box[1])), Math.max(...lots.map((l) => l.box[2])), Math.max(...lots.map((l) => l.box[3]))];
  return { id: a.id, block: a.block, lots, rect };
});
/** Is a row lot one of the avenue's places' (drawn by avenue3d.ts, not with the rows) */
export const isAvenue = (l: Lot) => AVENUE_LOTS.some((a) => a.lots.includes(l));

/** Everything solid: the towers (their stoops and scaffolding), The Block's fence and handball wall, the rows' buildings and their alleys' bollards */
export function projectSolids(): Footprint[] {
  const r = 0.1;
  const d = rows();
  return [
    // (each part to its own roof; the tallest to the top of what's on it)
    ...TOWERS.flatMap((t) => t.parts.map((p, i): Footprint => [...p.rect, i === t.main ? t.top : p.h])),
    ...TOWERS.flatMap((t) => t.stoops.map((r): Footprint => [...r, STOOP.h])),
    ...TOWERS.flatMap((t) => (t.scaffold ? [[...t.scaffold, t.parts[t.main].h] as Footprint] : [])),
    ...blockFence().map((f): Footprint => [...f, THE_BLOCK.fenceH]),
    [...THE_BLOCK.handball, THE_BLOCK.handballH],
    ...d.lots.filter((l) => !isAvenue(l)).flatMap((l) => l.solids),
    ...d.alleys.flatMap((a) => a.bollards.map(([x, z]): Footprint => [x - r, z - r, x + r, z + r, 0.9])),
  ];
}
export const PROJECT_SOLIDS: Footprint[] = projectSolids();
