/*
 * Uptown North (the owner's call: Palm Court moved across the east ring
 * avenue and Uptown's towers carried north onto its old land; DOM-free,
 * tested in tests/uptownnorth.test.ts): the block between Westlake Park and
 * the north avenue (ns0), from the ring highway's slip lanes to the Parkway.
 * Its towers are highrise.ts's (`HIGHRISES`, block `uptown-north`), drawn
 * with Uptown's in its chunk (uptown3d.ts); this is the land round them.
 *
 * - **The block** (`NORTH_BLOCK`): paved (ref `uptown` in the street plan),
 *   two columns of towers either side of a service way down its middle
 *   (`SERVICE_WAY`), the west column's lobbies on the park, the east
 *   column's on the avenue.
 * - **The ways through** (`GATE_WALKS`): the park's two east gates
 *   (westlake.ts `GATES`) carried straight through to the avenue, and the
 *   square (`NORTH_SQUARE`) at the block's heart, where the zebra over the
 *   avenue to the mall's forecourt lands (mall.ts `TOWER_ZEBRA`): a round
 *   pool with a steel sculpture (`POOL`), trees in grates (`SQUARE_TREES`),
 *   benches facing the pool (`SQUARE_BENCHES`), lamps (`NORTH_LAMPS`) and
 *   people at lunch (`NORTH_PEOPLE`). The towers' sides on them are dining
 *   (streetlevel.ts, `NORTH_OPEN`).
 * - **What's solid** (`NORTH_SOLIDS`): the pool and its sculpture.
 */
import { NS_ROADS, WALK_W } from './layout';
import { GATES, WESTLAKE_RECT } from './westlake';
import { NORTH_Z } from './mall';

export type Pt = [number, number];
export type Rect = [number, number, number, number];
type Box = [number, number, number, number, number];

const NS0 = NS_ROADS[0];
export const NORTH_BLOCK_ID = 'uptown-north';
/** The land inside its sidewalks: from the park's sidewalk to the north avenue's, the slip lanes to the Parkway */
export const NORTH_RECT: Rect = [WESTLAKE_RECT[2] + WALK_W, NORTH_Z, NS0.c - NS0.half - WALK_W, -42];
export const NORTH_BLOCK = {
  id: NORTH_BLOCK_ID,
  rect: NORTH_RECT,
  poly: [
    [NORTH_RECT[0], NORTH_RECT[1]],
    [NORTH_RECT[0], NORTH_RECT[3]],
    [NORTH_RECT[2], NORTH_RECT[3]],
    [NORTH_RECT[2], NORTH_RECT[1]],
  ] as Pt[],
};
/** The two columns of lots (x0, x1): the west on the park, the east on the avenue; the service way between */
export const WEST_COL: [number, number] = [NORTH_RECT[0] + 0.35, -28.1];
export const EAST_COL: [number, number] = [-22.6, NORTH_RECT[2] - 0.4];
export const SERVICE_WAY: Rect = [WEST_COL[1], NORTH_RECT[1], EAST_COL[0], NORTH_RECT[3]];

/** The park's east gates on this block (z), each carried through to the avenue as a walk 6 wide */
export const GATE_WALKS: Rect[] = GATES.filter((g) => g.out[0] === 1 && g.at[1] > NORTH_RECT[1] && g.at[1] < NORTH_RECT[3]).map((g): Rect => [NORTH_RECT[0], g.at[1] - 3, NORTH_RECT[2], g.at[1] + 3]);
/** The square at the block's heart (from the north gate's walk to the zebra's), and its pool */
export const NORTH_SQUARE: Rect = [NORTH_RECT[0], -131.5, NORTH_RECT[2], -108.4];
export const POOL = { x: (NORTH_RECT[0] + NORTH_RECT[2]) / 2, z: (NORTH_SQUARE[1] + NORTH_SQUARE[3]) / 2, r: 3.2, h: 0.45, sculpture: 5.2 };
/** What's open in front of the towers' sides: the square and the gates' walks (their ground floors are dining there) */
export const NORTH_OPEN: Rect[] = [NORTH_SQUARE, ...GATE_WALKS];

/** Trees in grates round the square, clear of the pool, the walks' middles and the zebra's landing */
export const SQUARE_TREES: Pt[] = (() => {
  const [x0, z0, x1, z1] = NORTH_SQUARE;
  const out: Pt[] = [];
  for (const x of [x0 + 2.4, POOL.x - 7.5, POOL.x + 7.5, x1 - 2.4])
    for (const z of [z0 + 4.6, z1 - 2.4]) out.push([x, z]);
  return out;
})();
/** Benches facing the pool from its four sides (x, z, facing: 0 is +z) */
export const SQUARE_BENCHES: { x: number; z: number; ry: number }[] = [
  { x: POOL.x, z: POOL.z - POOL.r - 1.8, ry: 0 },
  { x: POOL.x, z: POOL.z + POOL.r + 1.8, ry: Math.PI },
  { x: POOL.x - POOL.r - 1.8, z: POOL.z, ry: Math.PI / 2 },
  { x: POOL.x + POOL.r + 1.8, z: POOL.z, ry: -Math.PI / 2 },
];
/** Lamps round the square and down the gates' walks (x, z, arm's facing, ground's height) */
export const NORTH_LAMPS: [number, number, number, number][] = (() => {
  const SLAB_Y = 0.15;
  const out: [number, number, number, number][] = [];
  const [x0, z0, x1, z1] = NORTH_SQUARE;
  for (const x of [x0 + 6, x1 - 6]) out.push([x, z0 + 1.2, 0, SLAB_Y], [x, z1 - 1, Math.PI, SLAB_Y]);
  for (const [, a, , b] of GATE_WALKS) for (const x of [NORTH_RECT[0] + 9, NORTH_RECT[2] - 9]) out.push([x, a + 0.5, 0, SLAB_Y], [x + 4, b - 0.5, Math.PI, SLAB_Y]);
  return out;
})();
/** The trees (x, z, ground's height over the slab) */
export const NORTH_TREES: [number, number, number][] = SQUARE_TREES.map(([x, z]): [number, number, number] => [x, z, 0.02]);

export interface NorthPerson {
  x: number;
  z: number;
  ry: number;
  act: 'look' | 'chat' | 'sit';
  y: number;
}
/** People at lunch: on the benches, chatting in twos and threes, looking up at the towers */
export const NORTH_PEOPLE: NorthPerson[] = (() => {
  const out: NorthPerson[] = [];
  for (const b of SQUARE_BENCHES) out.push({ x: b.x + Math.cos(b.ry) * 0.4, z: b.z - Math.sin(b.ry) * 0.4, ry: b.ry, act: 'sit', y: 0.32 });
  const [x0, z0, x1] = NORTH_SQUARE;
  out.push({ x: x0 + 5, z: z0 + 8, ry: Math.PI / 2, act: 'chat', y: 0 }, { x: x0 + 6, z: z0 + 8.2, ry: -Math.PI / 2, act: 'chat', y: 0 }, { x: x0 + 5.5, z: z0 + 9, ry: Math.PI, act: 'chat', y: 0 });
  out.push({ x: x1 - 6, z: POOL.z + 5.5, ry: 0, act: 'look', y: 0 }, { x: x1 - 5, z: POOL.z - 6, ry: Math.PI / 2, act: 'chat', y: 0 }, { x: x1 - 4, z: POOL.z - 6.1, ry: -Math.PI / 2, act: 'chat', y: 0 });
  for (const [, a, , b] of GATE_WALKS) out.push({ x: (NORTH_RECT[0] + NORTH_RECT[2]) / 2 - 3, z: (a + b) / 2, ry: Math.PI / 2, act: 'chat', y: 0 }, { x: (NORTH_RECT[0] + NORTH_RECT[2]) / 2 - 2, z: (a + b) / 2 + 0.2, ry: -Math.PI / 2, act: 'chat', y: 0 });
  return out;
})();

export const NORTH_SOLIDS: Box[] = [[POOL.x - POOL.r * 0.85, POOL.z - POOL.r * 0.85, POOL.x + POOL.r * 0.85, POOL.z + POOL.r * 0.85, POOL.h]];
