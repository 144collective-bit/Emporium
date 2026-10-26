/*
 * The shopping plaza and the mall north of downtown (docs/mall-plan.md step 1,
 * the owner's call; DOM-free, tested in tests/mall.test.ts), drawn by
 * mall3d.ts, a district loaded as you approach. On the land between the
 * Parkway and the ring highway's north side, east of Westlake Park; a modern
 * mall and lifestyle centre (the owner's call: glass, white and grey cladding,
 * timber, black steel, warm white light), made-up names only, everything under
 * the Emporium (`TALLEST`).
 *
 * - **Palm Court** (`COURT`): the open-air plaza east of the mall, across the
 *   east ring avenue (ns3; moved there from the park's side, the owner's
 *   call, its old land Uptown North's: uptownnorth.ts). A promenade (`PROM`)
 *   runs north to south between two rows of shops facing each other across it
 *   (`SHOPS`). The west row is broken at the passage to the zebra over the
 *   avenue to the mall's forecourt (`ZEBRA`); the east row across from it,
 *   at the way out east (`EAST_GAP`). Paradise Cinema (`CINEMA`) stands
 *   across the north end; the fountain (`FOUNTAIN`) is in the middle, with
 *   trees in planters (`COURT_TREES`), benches and the PALM COURT gateway at
 *   the south end (`ARCH`). Each shop has its own front (`style`: glass,
 *   render, cladding or timber).
 * - **Starlight Mall** (`MALL_BLOCK`): the mall's hall (`HALL`) with its
 *   entrance porch (`PORCH`), the two anchors at its ends (`ANCHORS`) and the
 *   totem by the loop (`PYLON`).
 * - **The loop** (`LOOP`): two-way, off the north avenue (`MALL_STREETS` /
 *   `MALL_CROSSINGS` in the street plan, so traffic drives it). Inside it
 *   (`PARK_BLOCK`) are the surface car park (`CAR_PARK`, `BAYS`, `PARKED`,
 *   cabs at the rank in its first row, `RANK_CABS`, planted islands between
 *   the bays with trees and lamps, `ISLANDS`) and the multi-storey (`MSCP`,
 *   its cars `MSCP_CARS`); the zebra over the loop to the mall's porch
 *   (`LOOP_ZEBRA`); the forecourt's planters (`PLANTERS`) and pay stations
 *   (`PAY_STATIONS`).
 *
 * `MALL_SOLIDS` (in `SOLIDS`) are the buildings, the gateway's posts, the
 * fountain, the pylon, the planters, the islands, the pay stations and the
 * parked cars. `MALL_TREES` are planted at the boot (index.ts). The trees keep off `MALL_AREA`.
 * Inside the hall (step 2) is mallinside.ts.
 */
import { NS_ROADS, WALK_W } from './layout';

export type Pt = [number, number];
export type Rect = [number, number, number, number];
type Box = [number, number, number, number, number];

const NS0 = NS_ROADS[0];
const NS3 = NS_ROADS[NS_ROADS.length - 1];
/** The blocks' north edge (clear of the highway's slip lanes) and the land's south edge (clear of the Parkway's outer sidewalk) */
export const NORTH_Z = -155;
export const SOUTH_Z = -43.2;

/* ---------- Palm Court ---------- */

/** The plaza's block: from the east ring avenue's sidewalk east, as wide as it was by the park, its south end clear of the Parkway's outer sidewalk */
export const COURT_W = 32.75;
export const COURT: Rect = [NS3.c + NS3.half + WALK_W, NORTH_Z, NS3.c + NS3.half + WALK_W + COURT_W, SOUTH_Z];
/** How deep the shops are, and the promenade between the two rows (x0, x1) */
const ROW_D = 10;
export const PROM: [number, number] = [COURT[0] + 0.5 + ROW_D, COURT[2] - 0.5 - ROW_D];
export const PROM_X = (PROM[0] + PROM[1]) / 2;
/** Paradise Cinema across the north end, facing south down the promenade: its footprint and height */
export const CINEMA = { rect: [COURT[0] + 1, NORTH_Z + 1, COURT[2] - 1, -136] as Rect, h: 9, name: 'PARADISE CINEMA' };
/** The zebra over the east ring avenue from the west row's passage to the mall's forecourt (its middle, z), and the one over the north avenue from Uptown North's square to the forecourt's other end */
export const ZEBRA = { z: -112, half: 1.6 };
export const TOWER_ZEBRA = { z: -112, half: 1.6 };
/** The east row's gap across from the passage: the way out east onto the open land (z0, z1) */
export const EAST_GAP: Pt = [ZEBRA.z - 3, ZEBRA.z + 3];
/** The south end's arch over the promenade (z), and the fountain in the middle */
export const ARCH = { z: COURT[3] - 3, h: 5.2 };
export const FOUNTAIN = { x: PROM_X, z: ZEBRA.z, r: 2.4 };

export type ShopKind = 'cafe' | 'fashion' | 'books' | 'home' | 'beauty' | 'sports' | 'bakery' | 'shoes' | 'gifts' | 'tech' | 'kids' | 'restaurant';
/** The shops' made-up names, in turn along the rows, and their kinds */
export const SHOP_NAMES: { name: string; kind: ShopKind }[] = [
  { name: 'OAK & ASH', kind: 'home' },
  { name: 'BRISK COFFEE', kind: 'cafe' },
  { name: 'FERNLEY', kind: 'fashion' },
  { name: 'PAPER CRANE', kind: 'books' },
  { name: 'SOLSTICE', kind: 'beauty' },
  { name: 'NORTHWIND', kind: 'sports' },
  { name: 'GRAIN & CRUST', kind: 'bakery' },
  { name: 'STRIDE', kind: 'shoes' },
  { name: 'LITTLE KITE', kind: 'kids' },
  { name: 'CIRCUIT', kind: 'tech' },
  { name: 'MOSS & STONE', kind: 'gifts' },
  { name: 'THE LONG TABLE', kind: 'restaurant' },
  { name: 'HALCYON', kind: 'fashion' },
  { name: 'SLATE HOME', kind: 'home' },
  { name: 'TIDEWATER', kind: 'sports' },
  { name: 'MERIDIAN BOOKS', kind: 'books' },
  { name: 'ROSE & THISTLE', kind: 'beauty' },
  { name: 'EMBER GRILL', kind: 'restaurant' },
  { name: 'WILLOW', kind: 'fashion' },
  { name: 'FOLD & PRESS', kind: 'gifts' },
  { name: 'PIXELWORKS', kind: 'tech' },
  { name: 'SUNDAY CAFE', kind: 'cafe' },
];
/** How a shop's front is made (mall3d.ts): a glass box in black steel, white render with a deep window, cladding with fins, timber over glass */
export type ShopStyle = 'glass' | 'render' | 'clad' | 'timber';
export const SHOP_STYLES: ShopStyle[] = ['glass', 'render', 'clad', 'timber'];

export interface Shop {
  /** Its footprint (x0, z0, x1, z1) */
  rect: Rect;
  /** Which way its front faces (+1 east, the west row; -1 west, the east row) */
  face: 1 | -1;
  name: string;
  kind: ShopKind;
  style: ShopStyle;
  /** Its height: one storey, or two (every third) */
  h: number;
}

/** A row's runs along z between its gaps (z0, z1 pairs) */
function runs(z0: number, z1: number, gaps: Pt[]): Pt[] {
  const out: Pt[] = [];
  let at = z0;
  for (const [g0, g1] of [...gaps].sort((a, b) => a[0] - b[0])) {
    if (g1 <= at || g0 >= z1) continue;
    if (g0 > at) out.push([at, g0]);
    at = Math.max(at, g1);
  }
  if (at < z1) out.push([at, z1]);
  return out;
}

/** The two rows: from the cinema's square to the arch, cut into shops about 7 long */
export const SHOPS: Shop[] = (() => {
  const out: Shop[] = [];
  const start = CINEMA.rect[3] + 4;
  const end = ARCH.z - 1.5;
  const rows: { x0: number; x1: number; face: 1 | -1; gaps: Pt[] }[] = [
    { x0: COURT[0] + 0.5, x1: PROM[0], face: 1, gaps: [[ZEBRA.z - 3, ZEBRA.z + 3]] },
    { x0: PROM[1], x1: COURT[2] - 0.5, face: -1, gaps: [EAST_GAP] },
  ];
  let k = 0;
  for (const row of rows)
    for (const [a, b] of runs(start, end, row.gaps)) {
      // (no sliver of a shop where a gap comes close to the row's end)
      if (b - a < 4) continue;
      const n = Math.max(1, Math.round((b - a) / 7));
      for (let i = 0; i < n; i++) {
        const s = SHOP_NAMES[k % SHOP_NAMES.length];
        out.push({ rect: [row.x0, a + ((b - a) * i) / n + 0.1, row.x1, a + ((b - a) * (i + 1)) / n - 0.1], face: row.face, name: s.name, kind: s.kind, style: SHOP_STYLES[(k * 3 + (k >> 2)) % SHOP_STYLES.length], h: k % 3 === 1 ? 7 : 4.8 });
        k++;
      }
    }
  return out;
})();
/** Trees in square planters down the promenade's edges, clear of the shops' doors' middles and the fountain */
export const COURT_TREES: Pt[] = (() => {
  const out: Pt[] = [];
  for (let z = CINEMA.rect[3] + 6; z < ARCH.z - 2; z += 9) {
    if (Math.abs(z - FOUNTAIN.z) < FOUNTAIN.r + 2.5) continue;
    out.push([PROM[0] + 1.4, z], [PROM[1] - 1.4, z]);
  }
  return out;
})();
/** Benches facing the fountain (x, z, facing: 0 is +z) */
export const BENCHES: { x: number; z: number; ry: number }[] = [
  { x: FOUNTAIN.x, z: FOUNTAIN.z - FOUNTAIN.r - 1.6, ry: 0 },
  { x: FOUNTAIN.x, z: FOUNTAIN.z + FOUNTAIN.r + 1.6, ry: Math.PI },
];

/* ---------- Starlight Mall and the loop ---------- */

/** The loop: its north and south legs (z) off the north avenue, its east leg (x), the half width */
export const LOOP = { zN: -107, zS: -50, xE: 55, half: 1.7 };
/** The mall's block, north of the loop */
export const MALL_BLOCK: Rect = [NS0.c + NS0.half + WALK_W, NORTH_Z, NS3.c - NS3.half - WALK_W, LOOP.zN - LOOP.half - WALK_W];
/** Inside the loop: the car parks */
export const PARK_BLOCK: Rect = [NS0.c + NS0.half + WALK_W, LOOP.zN + LOOP.half + WALK_W, LOOP.xE - LOOP.half - WALK_W, LOOP.zS - LOOP.half - WALK_W];
export const MALL_NAME = 'STARLIGHT MALL';
/** The zebra over the loop's north leg from the car park to the porch (x, its half width) */
export const LOOP_ZEBRA = { x: 30, half: 1.6 };
/** The two department stores at the mall's ends (made-up names): footprint, height, cladding (light panels with fins, or dark with a glass corner) */
export const ANCHORS: { name: string; rect: Rect; h: number; wall: 'light' | 'dark' }[] = [
  { name: "MAXWELL'S", rect: [MALL_BLOCK[0] + 1, NORTH_Z + 2, MALL_BLOCK[0] + 16, -114], h: 7.6, wall: 'light' },
  { name: 'BRIGHT & CO.', rect: [MALL_BLOCK[2] - 16, NORTH_Z + 2, MALL_BLOCK[2] - 1, -114], h: 7.6, wall: 'dark' },
];
/** The mall's own hall between the anchors (two storeys, a skylit roof), its entrance porch on the south front */
export const HALL = { rect: [ANCHORS[0].rect[2], NORTH_Z + 6, ANCHORS[1].rect[0], -118] as Rect, h: 6.4 };
export const PORCH = { rect: [(HALL.rect[0] + HALL.rect[2]) / 2 - 5, HALL.rect[3], (HALL.rect[0] + HALL.rect[2]) / 2 + 5, -114.5] as Rect, h: 4.6 };
/** The totem at the block's corner by the loop's junction: its middle, size and height */
export const PYLON = { x: MALL_BLOCK[0] + 1.6, z: MALL_BLOCK[3] - 1.4, w: 1.8, d: 0.8, h: 11.2 };
/** The bus shelter on the forecourt in front of the east anchor */
export const SHELTER: Rect = [ANCHORS[1].rect[0] + 3, MALL_BLOCK[3] - 1.8, ANCHORS[1].rect[0] + 6.2, MALL_BLOCK[3] - 0.6];
/** Planters with trees along the forecourt, clear of the doors, the pylon and the shelter (their middles; `PLANTER` square) */
export const PLANTER = 1.4;
export const PLANTERS: Pt[] = [3.6, 13.6, 19.5, 41, 45.6, 57.6].map((x): Pt => [MALL_BLOCK[0] + x, MALL_BLOCK[3] - 2.1]);
/** The car park's pay stations on the forecourt either side of the porch */
export const PAY_STATIONS: Pt[] = [
  [PORCH.rect[0] - 2.2, MALL_BLOCK[3] - 1.6],
  [PORCH.rect[2] + 2.2, MALL_BLOCK[3] - 1.6],
];

/** The multi-storey in the loop's east side: footprint, its decks' spacing and how many over the ground */
export const MSCP = { rect: [PARK_BLOCK[2] - 16, PARK_BLOCK[1] + 2, PARK_BLOCK[2] - 0.5, LOOP.zS - 22] as Rect, deck: 2.3, decks: 3 };
/** The surface car park west of it */
export const CAR_PARK: Rect = [PARK_BLOCK[0] + 0.6, PARK_BLOCK[1] + 0.6, MSCP.rect[0] - 2, PARK_BLOCK[3] - 0.6];
export const BAY = { w: 2.5, d: 4.4 };
/** Rows of bays across it, noses in, aisles between (z middles, facing) */
export const BAY_ROWS: { z: number; yaw: number }[] = (() => {
  const [, z0, , z1] = CAR_PARK;
  const out: { z: number; yaw: number }[] = [];
  for (let z = z0; z + BAY.d * 2 <= z1 + 0.01; z += BAY.d * 2 + 5.2) {
    out.push({ z: z + BAY.d / 2, yaw: Math.PI / 2 }, { z: z + BAY.d * 1.5, yaw: -Math.PI / 2 });
  }
  return out;
})();
/** Each row's bays in groups of four, a planted island between the groups (x0, x1 of each group) */
const GROUP = 4;
const GROUPS: [number, number][] = (() => {
  const [x0, , x1] = CAR_PARK;
  const n = Math.floor((x1 - x0 + 0.01) / (GROUP * BAY.w + 1.6));
  const island = (x1 - x0 - n * GROUP * BAY.w) / Math.max(1, n - 1);
  return Array.from({ length: n }, (_, i): [number, number] => [x0 + i * (GROUP * BAY.w + island), x0 + i * (GROUP * BAY.w + island) + GROUP * BAY.w]);
})();
export const BAYS: { x: number; z: number; yaw: number }[] = BAY_ROWS.flatMap((row) => GROUPS.flatMap(([g0]) => Array.from({ length: GROUP }, (_, i) => ({ x: g0 + (i + 0.5) * BAY.w, z: row.z, yaw: row.yaw }))));
/** The planted islands between the groups, across both rows of each pair: a kerb, a paved walk down the middle (`ISLAND_WALK` wide), planting either side with two trees each, a lamp by the walk, EV chargers on every other one */
export const ISLANDS: Rect[] = (() => {
  const out: Rect[] = [];
  for (let r = 0; r + 1 < BAY_ROWS.length; r += 2)
    for (let g = 0; g + 1 < GROUPS.length; g++) out.push([GROUPS[g][1] + 0.15, BAY_ROWS[r].z - BAY.d / 2 + 0.2, GROUPS[g + 1][0] - 0.15, BAY_ROWS[r + 1].z + BAY.d / 2 - 0.2]);
  return out;
})();
/** The islands' walk down their middle (its width) */
export const ISLAND_WALK = 1.6;
/** The trees on an island: two either side of its walk */
export function islandTrees([x0, z0, x1, z1]: Rect): Pt[] {
  const xm = (x0 + x1) / 2;
  const off = ISLAND_WALK / 2 + ((x1 - x0) / 2 - ISLAND_WALK / 2) / 2;
  return [-1, 1].flatMap((s) => [z0 + 2.2, z1 - 2.2].map((z): Pt => [xm + s * off, z]));
}
/** The taxi rank: the first row's bays nearest the mall's porch */
export const RANK_CABS: { x: number; z: number; yaw: number }[] = BAYS.filter((b) => b.z === BAY_ROWS[0].z && Math.abs(b.x - (PORCH.rect[0] + PORCH.rect[2]) / 2) < 5);
const MODELS = ['hatch', 'sedan', 'pickup', 'van', 'coupe', 'suv'];
const COLOURS = ['#e23b3b', '#2aabee', '#ffd23f', '#f3f2f7', '#8000ff', '#1fbf6b', '#ff8a3d', '#2b2d3a', '#e219e5', '#7fe0d0'];
const seeded = (seed: number) => {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
};
/** The cars parked (model, x, z, yaw, colour): about two bays in three, seeded; the rank's bays are the cabs' */
export const PARKED: [string, number, number, number, string][] = (() => {
  const r = seeded(7311);
  return BAYS.filter((b) => !RANK_CABS.includes(b)).flatMap((b): [string, number, number, number, string][] => (r() > 0.68 ? [] : [[MODELS[Math.floor(r() * MODELS.length)], b.x, b.z, b.yaw + (r() < 0.15 ? Math.PI : 0), COLOURS[Math.floor(r() * COLOURS.length)]]]));
})();
/** The multi-storey's cars on each deck (model, x, z, yaw, colour, deck height over the ground) */
export const MSCP_CARS: [string, number, number, number, string, number][] = (() => {
  const r = seeded(9157);
  const [x0, z0, x1, z1] = MSCP.rect;
  const out: [string, number, number, number, string, number][] = [];
  for (let d = 0; d <= MSCP.decks; d++)
    for (const [x, yaw] of [
      [x0 + 2.4, Math.PI / 2],
      [x1 - 2.4, -Math.PI / 2],
    ] as const)
      for (let z = z0 + 2; z < z1 - 1.5; z += BAY.w) if (r() < 0.6) out.push([MODELS[Math.floor(r() * MODELS.length)], x, z, yaw, COLOURS[Math.floor(r() * COLOURS.length)], d * MSCP.deck]);
  return out;
})();
const CAR_HALF = { l: 1.5, w: 0.62 };

/* ---------- The streets ---------- */

export const MALL_STREETS: { id: string; pts: Pt[]; half: number }[] = [
  {
    id: 'mall-loop',
    pts: [
      [NS0.c, LOOP.zN],
      [LOOP.xE, LOOP.zN],
      [LOOP.xE, LOOP.zS],
      [NS0.c, LOOP.zS],
    ],
    half: LOOP.half,
  },
];
export const MALL_CROSSINGS: { id: string; at: Pt; streets: string[] }[] = [
  { id: 'mall-loop-n', at: [NS0.c, LOOP.zN], streets: ['ns0', 'mall-loop'] },
  { id: 'mall-loop-s', at: [NS0.c, LOOP.zS], streets: ['ns0', 'mall-loop'] },
];

/* ---------- Lamps ---------- */

/** Lamps round the loop, outside it and on its car park's side, and down the promenade (x, z, arm's facing, ground's height) */
export const MALL_LAMPS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  const SLAB_Y = 0.15;
  for (let x = 6; x < LOOP.xE - 4; x += 12) out.push([x, LOOP.zN + LOOP.half + 0.45, Math.PI, SLAB_Y], [x, LOOP.zS - LOOP.half - 0.45, 0, 0.02]);
  for (let z = LOOP.zN + 8; z < LOOP.zS - 4; z += 12) out.push([LOOP.xE + LOOP.half + 0.45, z, -Math.PI / 2, 0.02]);
  for (let z = CINEMA.rect[3] + 10; z < ARCH.z - 2; z += 18) if (Math.abs(z - FOUNTAIN.z) > FOUNTAIN.r + 2) out.push([PROM[0] + 0.5, z, Math.PI / 2, SLAB_Y], [PROM[1] - 0.5, z + 9, -Math.PI / 2, SLAB_Y]);
  // (a light beside the walk down every car park island)
  for (const [x0, z0, x1, z1] of ISLANDS) out.push([(x0 + x1) / 2 + ISLAND_WALK / 2 + 0.35, (z0 + z1) / 2, 0, SLAB_Y]);
  return out;
})();

/* ---------- Trees ---------- */

/** Where the trees stand (x, z, height of the ground under them over the slab): the court's planters, the forecourt's, two to a car park island */
export const MALL_TREES: [number, number, number][] = [
  ...COURT_TREES.map(([x, z]): [number, number, number] => [x, z, 0.5]),
  ...PLANTERS.map(([x, z]): [number, number, number] => [x, z, 0.5]),
  ...ISLANDS.flatMap((r) => islandTrees(r).map(([x, z]): [number, number, number] => [x, z, 0.25])),
];

/* ---------- What's solid ---------- */

const box = (r: Rect, h: number): Box => [r[0], r[1], r[2], r[3], h];
const carBox = (x: number, z: number, yaw: number, h = 1.3): Box => {
  const along = Math.abs(Math.cos(yaw)) > 0.5;
  const [hx, hz] = along ? [CAR_HALF.l, CAR_HALF.w] : [CAR_HALF.w, CAR_HALF.l];
  return [x - hx, z - hz, x + hx, z + hz, h];
};
/** The arch's two posts either side of the promenade */
export const ARCH_POSTS: Rect[] = [
  [PROM[0] + 0.3, ARCH.z - 0.4, PROM[0] + 1.1, ARCH.z + 0.4],
  [PROM[1] - 1.1, ARCH.z - 0.4, PROM[1] - 0.3, ARCH.z + 0.4],
];
export const MALL_SOLIDS: Box[] = [
  ...SHOPS.map((s) => box(s.rect, s.h)),
  box(CINEMA.rect, CINEMA.h),
  ...ARCH_POSTS.map((r) => box(r, ARCH.h)),
  [FOUNTAIN.x - FOUNTAIN.r * 0.85, FOUNTAIN.z - FOUNTAIN.r * 0.85, FOUNTAIN.x + FOUNTAIN.r * 0.85, FOUNTAIN.z + FOUNTAIN.r * 0.85, 0.6],
  ...ANCHORS.map((a) => box(a.rect, a.h)),
  // (the hall is hollow since step 2: its walls and what's inside are mallinside.ts's)
  // (the porch's posts at its two front corners: you walk in under it)
  [PORCH.rect[0], PORCH.rect[3] - 0.4, PORCH.rect[0] + 0.4, PORCH.rect[3], PORCH.h],
  [PORCH.rect[2] - 0.4, PORCH.rect[3] - 0.4, PORCH.rect[2], PORCH.rect[3], PORCH.h],
  [PYLON.x - PYLON.w / 2, PYLON.z - PYLON.d / 2, PYLON.x + PYLON.w / 2, PYLON.z + PYLON.d / 2, PYLON.h],
  box([SHELTER[0], SHELTER[1], SHELTER[2], SHELTER[1] + 0.25], 2.4),
  box(MSCP.rect, MSCP.deck * (MSCP.decks + 1) + 0.9),
  ...PLANTERS.map(([x, z]): Box => [x - PLANTER / 2, z - PLANTER / 2, x + PLANTER / 2, z + PLANTER / 2, 0.55]),
  ...PAY_STATIONS.map(([x, z]): Box => [x - 0.35, z - 0.25, x + 0.35, z + 0.25, 1.7]),
  ...ISLANDS.map((r) => box(r, 0.25)),
  ...[...RANK_CABS.map((c) => carBox(c.x, c.z, c.yaw)), ...PARKED.map(([, x, z, yaw]) => carBox(x, z, yaw))],
];

/* ---------- People ---------- */

export interface MallPerson {
  x: number;
  z: number;
  ry: number;
  act: 'look' | 'chat' | 'sit';
  /** Over the slab (a seat's height for those sitting) */
  y: number;
}
export const MALL_PEOPLE: MallPerson[] = (() => {
  const out: MallPerson[] = [];
  // Window-shopping down the promenade, at the shops' fronts
  SHOPS.forEach((s, i) => {
    if (i % 2) return;
    const x = s.face === 1 ? s.rect[2] + 1.2 : s.rect[0] - 1.2;
    out.push({ x, z: (s.rect[1] + s.rect[3]) / 2, ry: s.face === 1 ? -Math.PI / 2 : Math.PI / 2, act: 'look', y: 0 });
  });
  // Chatting in twos on the promenade
  for (let z = CINEMA.rect[3] + 12; z < ARCH.z - 6; z += 16)
    if (Math.abs(z - FOUNTAIN.z) > FOUNTAIN.r + 3) out.push({ x: PROM_X - 0.5, z, ry: Math.PI / 2, act: 'chat', y: 0 }, { x: PROM_X + 0.5, z: z + 0.2, ry: -Math.PI / 2, act: 'chat', y: 0 });
  // The cinema's queue
  for (let i = 0; i < 5; i++) out.push({ x: PROM_X - 3 + i * 0.8, z: CINEMA.rect[3] + 1.6, ry: Math.PI, act: 'look', y: 0 });
  // On the benches by the fountain
  for (const b of BENCHES) out.push({ x: b.x - 0.4, z: b.z + (b.ry === 0 ? 0.05 : -0.05), ry: b.ry, act: 'sit', y: 0.32 });
  // At the mall's porch and the bus shelter
  const px = (PORCH.rect[0] + PORCH.rect[2]) / 2;
  out.push({ x: px - 2.2, z: PORCH.rect[3] + 1.4, ry: Math.PI, act: 'chat', y: 0 }, { x: px - 1.4, z: PORCH.rect[3] + 1.6, ry: Math.PI, act: 'chat', y: 0 }, { x: px + 2.5, z: PORCH.rect[3] + 2, ry: Math.PI, act: 'look', y: 0 });
  out.push({ x: (SHELTER[0] + SHELTER[2]) / 2, z: SHELTER[3] + 0.6, ry: 0, act: 'look', y: 0 });
  return out;
})();

/* ---------- The places ---------- */

/** Walk in: at the promenade's south end facing up it (walk mode faces (-sin yaw, -cos yaw)), and in front of the mall's porch facing it */
export const COURT_SPAWN = { x: PROM_X, z: ARCH.z + 1.2, yaw: 0 };
export const MALL_SPAWN = { x: (PORCH.rect[0] + PORCH.rect[2]) / 2, z: MALL_BLOCK[3] - 1, yaw: 0 };
/** All of the land, Uptown North's block west of it to Palm Court east of the east ring avenue (the outskirts' trees keep off; loaded as you approach) */
export const MALL_AREA: Rect = [NS0.c - NS0.half - 34.5, NORTH_Z - 1.5, COURT[2] + 1, SOUTH_Z + 1];
/** The tallest anything stands (the pylon), under the Emporium's roof (about 12.5) */
export const TALLEST = Math.max(PYLON.h, CINEMA.h, ...ANCHORS.map((a) => a.h), HALL.h + 2.2, MSCP.deck * (MSCP.decks + 1) + 1.2);
