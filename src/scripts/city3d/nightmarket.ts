/*
 * The Night Market (docs/waterfront-plan.md, the owner's call: "build the
 * night market next"; scenery for now; DOM-free, tested in
 * tests/nightmarket.test.ts), on the market's deck out over the water in
 * front of Harbor Stores (`MARKET_DECK` in waterfront.ts), drawn by
 * nightmarket3d.ts:
 *
 * - **The stalls** (`STALLS`) along the deck's water side, their counters
 *   facing the city: shipping containers turned kitchens (a flap propped up
 *   over the hatch), two food trucks and a cart, each with a made-up name
 *   over it and its cook behind the counter (`VENDORS`), a queue in front
 *   (`QUEUE`).
 * - **The tables** (`TABLES`): two rows of picnic tables with benches, people
 *   eating at them (`DINERS`), patio heaters between (`HEATERS`).
 * - **The lights**: NIGHT MARKET on a lit gantry over the boardwalk's walk
 *   on its land side (`GANTRY`, both ways), string lights and paper lanterns
 *   criss-crossing from the stalls' roofs to poles along the boardwalk
 *   (`POLES`, `STRINGS`).
 *
 * It's a place (spot `nightmarket`, its pin over the gantry,
 * `MARKET_SPAWN`). The boardwalk's strollers pass along behind it. What's
 * solid is `NIGHT_MARKET_SOLIDS` (in SOLIDS): the stalls, the tables and their
 * benches, the gantry's posts and the heaters.
 */
import type { Footprint, Pt, Rect } from './downtown';
import { BOARDWALK, DECK_Y, MARKET_DECK } from './waterfront';

const [MX0, MZ0, MX1] = MARKET_DECK;
const BZ0 = BOARDWALK[1];
/** The market's middle along the river */
export const MX = (MX0 + MX1) / 2;
/** Its floor: the decks' */
export const FLOOR_Y = DECK_Y;

export type StallKind = 'container' | 'truck' | 'cart';
/** A stall: what it is, its made-up name, its footprint; its counter faces the city (+z) along `front` */
export interface Stall {
  kind: StallKind;
  name: string;
  rect: Rect;
  /** Its front (z): the counter's side */
  front: number;
  /** Its top over the deck */
  h: number;
}
/** The stalls' fixed made-up names (nothing real, nothing for sale but food in the city's own story) */
export const STALL_NAMES = ['NOODLES', 'TACOS', 'BAO BUNS', 'DUMPLINGS', 'WINGS', 'SMOOTHIES', 'SWEETS'] as const;

const BACK = MZ0 + 0.3;
/** A container's size (a twenty-footer, in tiles) and the gap between them */
export const CONTAINER = { l: 3.3, d: 1.35, h: 1.45, gap: 0.8 };
export const TRUCK = { l: 3, d: 1.3, h: 1.85, floor: 0.35, cab: 0.95 };
export const CART = { l: 1.6, d: 0.8, h: 1.15 };

export const STALLS: Stall[] = (() => {
  const out: Stall[] = [];
  let x = MX0 + 0.8;
  for (let i = 0; i < 4; i++) {
    out.push({ kind: 'container', name: STALL_NAMES[i], rect: [x, BACK, x + CONTAINER.l, BACK + CONTAINER.d], front: BACK + CONTAINER.d, h: CONTAINER.h });
    x += CONTAINER.l + CONTAINER.gap;
  }
  x += 0.4;
  for (let i = 0; i < 2; i++) {
    out.push({ kind: 'truck', name: STALL_NAMES[4 + i], rect: [x, BACK + 0.05, x + TRUCK.l, BACK + 0.05 + TRUCK.d], front: BACK + 0.05 + TRUCK.d, h: TRUCK.h });
    x += TRUCK.l + 1;
  }
  x += 0.2;
  const cz = BACK + CONTAINER.d - CART.d;
  out.push({ kind: 'cart', name: STALL_NAMES[6], rect: [x, cz, x + CART.l, cz + CART.d], front: cz + CART.d, h: CART.h });
  return out;
})();

/** Where the queue stands, the line in front of the counters (z) */
const QUEUE_Z = Math.max(...STALLS.map((s) => s.front)) + 0.45;
/** A picnic table and its two benches: the table's middle, its length along x; the footprint is the lot */
export const TABLE = { l: 1.8, d: 0.7, bench: 0.3, gap: 0.08, h: 0.48 };
const tableRect = (x: number, z: number): Rect => [x - TABLE.l / 2, z - TABLE.d / 2 - TABLE.gap - TABLE.bench, x + TABLE.l / 2, z + TABLE.d / 2 + TABLE.gap + TABLE.bench];
/** Two rows of tables between the queue and the boardwalk's walk (the second row half a table along) */
export const TABLES: { x: number; z: number; rect: Rect }[] = (() => {
  const out: { x: number; z: number; rect: Rect }[] = [];
  const half = TABLE.d / 2 + TABLE.gap + TABLE.bench;
  const zA = QUEUE_Z + 0.75 + half;
  const zB = zA + 2 * half + 0.35;
  for (let x = MX0 + 2.5; x <= MX1 - 1.6; x += 3.4) out.push({ x, z: zA, rect: tableRect(x, zA) });
  for (let x = MX0 + 4.2; x <= MX1 - 2.5; x += 3.4) out.push({ x, z: zB, rect: tableRect(x, zB) });
  return out;
})();
/** The boardwalk's walk stays clear behind the tables (z): strollers pass along here */
export const WALK_FROM = Math.max(...TABLES.map((t) => t.rect[3])) + 0.2;

/** The gantry: NIGHT MARKET on a board between two posts on the boardwalk's land side, over the walk, facing the street (and the river behind) */
export const GANTRY = { x: MX, z: BOARDWALK[3] - 0.7, half: 6, post: 0.28, h: 3.5, board: { w: 9, h: 1.05, y: 2.75 } };
/** Poles along the boardwalk's side for the string lights (the gantry's posts carry them too) */
export const POLES: Pt[] = [
  [MX0 + 0.4, GANTRY.z],
  [GANTRY.x - GANTRY.half, GANTRY.z],
  [GANTRY.x + GANTRY.half, GANTRY.z],
  [MX1 - 0.4, GANTRY.z],
];
/** The strings: from each stall's roof to the poles either side of it (they cross over the tables) */
export const STRINGS: [Pt, Pt][] = STALLS.flatMap((s) => {
  const at: Pt = [(s.rect[0] + s.rect[2]) / 2, s.front - 0.1];
  const near = [...POLES].sort((a, b) => Math.abs(a[0] - at[0]) - Math.abs(b[0] - at[0])).slice(0, 2);
  return near.map((p): [Pt, Pt] => [at, p]);
});
/** Patio heaters between the second row's tables */
export const HEATERS: Pt[] = TABLES.filter((_, i) => i % 3 === 1 && i >= 8).map((t): Pt => [t.x + 1.7, t.z]);

/** The cooks behind their counters, facing out (0 is +z): inside a container or a truck (its floor up on its wheels), behind the cart; `y` over the floor */
export const VENDORS: { x: number; z: number; y: number; yaw: number }[] = STALLS.map((s) => ({
  x: (s.rect[0] + s.rect[2]) / 2 + 0.3,
  z: s.kind === 'cart' ? s.rect[1] - 0.35 : s.front - 0.55,
  y: s.kind === 'truck' ? TRUCK.floor : 0,
  yaw: 0,
}));
/** The queue at each counter, facing it */
export const QUEUE: { x: number; z: number; yaw: number }[] = STALLS.flatMap((s, i) => {
  const cx = (s.rect[0] + s.rect[2]) / 2;
  const n = i % 3 === 2 ? 1 : 2;
  return Array.from({ length: n }, (_, k) => ({ x: cx - 0.4 + k * 0.75, z: QUEUE_Z + (k % 2) * 0.12, yaw: Math.PI + (k ? 0.25 : -0.1) }));
});
/** People eating: on the benches, facing the table (seated: the bench's seat at the floor + 0.3) */
export const DINERS: { x: number; z: number; yaw: number }[] = TABLES.flatMap((t, i) => {
  const off = TABLE.d / 2 + TABLE.gap + TABLE.bench / 2;
  const seats: { x: number; z: number; yaw: number }[] = [];
  if (i % 4 !== 3) seats.push({ x: t.x - 0.45, z: t.z - off, yaw: 0 });
  if (i % 3 !== 1) seats.push({ x: t.x + 0.4, z: t.z + off, yaw: Math.PI });
  if (i % 5 === 0) seats.push({ x: t.x + 0.5, z: t.z - off, yaw: 0 });
  return seats;
});

/** Where Walk in and fast travel stand you: on the boardwalk's walk behind the tables, past the gantry (the camera clear of its board), facing the stalls (walk.ts's yaw 0 is north) */
export const MARKET_SPAWN = { x: GANTRY.x + GANTRY.half + 1.6, z: WALK_FROM + 0.7, yaw: -0.35 };

/** Everything solid: the stalls, each table with its benches, the gantry's posts, the heaters */
export const NIGHT_MARKET_SOLIDS: Footprint[] = [
  ...STALLS.map((s): Footprint => [...s.rect, s.h]),
  ...TABLES.map((t): Footprint => [...t.rect, TABLE.h]),
  ...[GANTRY.x - GANTRY.half, GANTRY.x + GANTRY.half].map((x): Footprint => [x - GANTRY.post / 2, GANTRY.z - GANTRY.post / 2, x + GANTRY.post / 2, GANTRY.z + GANTRY.post / 2, GANTRY.h]),
  ...HEATERS.map(([x, z]): Footprint => [x - 0.18, z - 0.18, x + 0.18, z + 0.18, 2.2]),
];

/** The deck's edges at the water (its railing): north, and the two ends back to the boardwalk */
export const MARKET_RAILS: Rect[] = [
  [MX0, MZ0, MX1, MZ0],
  [MX0, MZ0, MX0, BZ0],
  [MX1, MZ0, MX1, BZ0],
];
