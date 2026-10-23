/*
 * Sector 7 Stadium (Westlake Park's step 2, docs/growth-plan.md Phase 9b;
 * moved north of the ring highway in the north side's stage 1,
 * docs/north-plan.md, the owner's call; DOM-free, tested in
 * tests/stadium.test.ts), drawn by stadium3d.ts. An oval bowl on its own
 * block north of the highway (`BLOCK`), in line with Westlake Park's Mall,
 * its front to the south, where a footbridge (`BRIDGE`) carries the Mall up
 * and over the highway and Stadium Road down onto its forecourt.
 *
 * - **The bowl** is a soft-cornered oval (a superellipse, `ovalAt()`): the
 *   facade round the outside (`FACADE`, to `FACADE.h`), the stands stepping
 *   down from it to the pitch in two tiers with a concourse between
 *   (`TIERS`), a roof ring over the upper tier (`ROOF`), open over the
 *   pitch.
 * - **The pitch** (`PITCH`) in the middle, its lines and a running track
 *   round it.
 * - **Floodlights** on four masts outside the corners (`MASTS`) and a big
 *   screen over the north stand (`SCREEN`).
 * - **The main gate** in the middle of the south facade (`GATE`): its
 *   door prompt opens the stadium's panel (events coming soon), and Walk in
 *   stands you on the forecourt in front (`STADIUM_SPAWN`).
 * - **Stadium Road** (`ROAD`) runs west off the north road past the highway
 *   (ns0) along the block's south side; the car park (`CAR_PARK`, with cars
 *   in most of its bays, `PARKED`) is inside the one-way loop off it east of
 *   the stadium (`LOOP`), as the airport's is. The street plan's
 *   `STADIUM_STREETS` and `STADIUM_CROSSINGS`; traffic drives them.
 * - **The footbridge** (`BRIDGE`): stairs up from the Mall in the park, a
 *   deck over the ring walk, the park's edge, the highway and Stadium Road,
 *   stairs down to the forecourt; you can walk it (`bridgeY()`,
 *   `bridgeWall()`), and only its piers and stair flanks are solid.
 *
 * Everything stays under the Emporium (`TALLEST`). What's solid is
 * `STADIUM_SOLIDS`: the facade all the way round (the gates are shut until
 * there's an event), the masts, the parked cars and the footbridge's piers
 * and stairs.
 */
import { WALK_W } from './layout';
import { HIGHWAY_BOX } from './highway';
import { MALL } from './westlake';

export type Pt = [number, number];
export type Box = [number, number, number, number, number];

export type Rect = [number, number, number, number];

/* ---------- Where: north of the ring highway, in line with the Mall ---------- */

/** Stadium Road: its centre line (z), from the north road (ns0, at x = -4.5, past the highway) west to `x1`; a street's half width */
export const ROAD = { z: -188, x0: -4.5, x1: -182, half: 1.7 };
/** The car park's one-way loop off Stadium Road (its south side is the road): x0..x1, north to z1 */
export const LOOP = { x0: -92, x1: -24, z1: -228, half: 1.7 };
/** The stadium's block (lawn on a slab, a sidewalk round it): north of Stadium Road, west of the loop */
export const BLOCK: Rect = [-184, -262, LOOP.x0 - LOOP.half - WALK_W, ROAD.z - ROAD.half - WALK_W];
/** The bowl's middle: in line with the Mall, its south facade 3.5 north of the footbridge's foot */
export const CENTRE: Pt = [MALL.x, -228];
/** How square the oval's corners are (2 an ellipse; higher, squarer) */
export const ROUNDNESS = 3;

/** A point on an oval of half sizes a (x) and b (z) round the middle, at angle t (0 east, +π/2 south) */
export function ovalAt(a: number, b: number, t: number): Pt {
  const c = Math.cos(t);
  const s = Math.sin(t);
  const e = 2 / ROUNDNESS;
  return [CENTRE[0] + a * Math.sign(c) * Math.abs(c) ** e, CENTRE[1] + b * Math.sign(s) * Math.abs(s) ** e];
}
/** An oval's outline, `n` points round */
export const oval = (a: number, b: number, n = 96): Pt[] => Array.from({ length: n }, (_, k) => ovalAt(a, b, (2 * Math.PI * k) / n));
/** Is a point inside an oval of half sizes a, b (m beyond it) */
export const inOval = (a: number, b: number, x: number, z: number, m = 0) =>
  (Math.abs(x - CENTRE[0]) / (a + m)) ** ROUNDNESS + (Math.abs(z - CENTRE[1]) / (b + m)) ** ROUNDNESS < 1;

/** The facade round the outside: its half sizes and height */
export const FACADE = { a: 31, b: 25, h: 7.2 };
/** The roof ring over the upper tier: from its inner edge out past the facade, its height (sloping a little up to the outside) */
export const ROOF = { a0: 23.4, b0: 17.8, a1: 31.6, b1: 25.6, y0: 8.3, y1: 8.7 };
/** The pitch (half sizes) and the running track round it (its outer half sizes) */
export const PITCH = { hx: 15, hz: 9.5 };
export const TRACK = { a: 19, b: 13.4 };

/** A tier of seats: from its front edge (half sizes) up and back, steps of a rise and a depth */
export interface Tier {
  a: number;
  b: number;
  /** The front edge's height */
  y: number;
  steps: number;
  rise: number;
  depth: number;
}
/** The lower tier from the track's edge, then the concourse (`GANGWAY` deep), then the upper tier up to the facade */
const GANGWAY = 1.2;
const lower: Tier = { a: TRACK.a + 0.4, b: TRACK.b + 0.4, y: 0.6, steps: 6, rise: 0.42, depth: 0.75 };
export const TIERS: Tier[] = [lower, { a: lower.a + lower.steps * lower.depth + GANGWAY, b: lower.b + lower.steps * lower.depth + GANGWAY, y: 3.6, steps: 6, rise: 0.48, depth: 0.75 }];
/** The concourse between the tiers: its inner and outer half sizes and its height */
export const CONCOURSE = { a0: lower.a + lower.steps * lower.depth, b0: lower.b + lower.steps * lower.depth, a1: TIERS[1].a, b1: TIERS[1].b, y: lower.y + lower.steps * lower.rise };

/** The four floodlight masts, outside the bowl's corners: where, how tall (the lamps at the top) */
export const MASTS: { x: number; z: number }[] = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].map((t) => {
  const [x, z] = ovalAt(FACADE.a + 1.6, FACADE.b + 1.6, t);
  return { x, z };
});
export const MAST = { h: 10.6, r: 0.22, head: { w: 2.6, h: 1.2 } };
/** The big screen over the north stand, facing the pitch: its middle, size and how high its foot stands */
export const SCREEN = { x: CENTRE[0], z: CENTRE[1] - FACADE.b + 0.8, w: 9, h: 3.2, y: FACADE.h + 0.3 };

/** The main gate: the middle of the south facade (its z), its width and height; where you stand at it */
export const GATE = (() => {
  const [, z] = ovalAt(FACADE.a, FACADE.b, Math.PI / 2);
  return { x: CENTRE[0], z, w: 5, h: 4.2, spot: { x: CENTRE[0], z: z + 1.3 } };
})();
/** The stadium's name over the main gate (fixed made-up copy) */
export const NAME = 'SECTOR 7 STADIUM';
/** Where Walk in and fast travel stand you: on the forecourt, facing the gate (north: walk.ts's yaw 0) */
export const STADIUM_SPAWN = { x: CENTRE[0] + 2.8, z: GATE.z + 2.6, yaw: 0 };

/** The tallest anything stands (the masts' lamps), under the Emporium's roof (about 12.5) */
export const TALLEST = MAST.h + MAST.head.h / 2;

/* ---------- The car park ---------- */

/** Inside the loop, clear of its asphalt (x0, z0, x1, z1) */
export const CAR_PARK: Rect = [LOOP.x0 + LOOP.half + 0.3, LOOP.z1 + LOOP.half + 0.3, LOOP.x1 - LOOP.half - 0.3, ROAD.z - ROAD.half - 0.3];
/** A bay's width along the row, and how deep it is */
export const BAY = { w: 2.6, d: 4.4 };
/** Four rows of bays: one along the north edge, two back to back in the middle, one by the road; each row's bays' z and facing */
export const BAY_ROWS: { z: number; yaw: number }[] = (() => {
  const [, z0, , z1] = CAR_PARK;
  // (cars.ts's yaw: 0 points +x; noses in, towards the bay's back)
  return [
    { z: z0 + BAY.d / 2, yaw: Math.PI / 2 },
    { z: z0 + BAY.d * 1.5 + 5, yaw: -Math.PI / 2 },
    { z: z0 + BAY.d * 2.5 + 5, yaw: Math.PI / 2 },
    { z: z1 - BAY.d / 2, yaw: -Math.PI / 2 },
  ];
})();
export const BAYS: { x: number; z: number; yaw: number }[] = (() => {
  const [x0, , x1] = CAR_PARK;
  const out: { x: number; z: number; yaw: number }[] = [];
  const n = Math.floor((x1 - x0 - 1) / BAY.w);
  for (const row of BAY_ROWS) for (let i = 0; i < n; i++) out.push({ x: x0 + 0.5 + (i + 0.5) * BAY.w, z: row.z, yaw: row.yaw });
  return out;
})();
/** The cars parked: model, x, z, yaw, colour; about three bays in five taken, seeded */
export const PARKED: [string, number, number, number, string][] = (() => {
  const models = ['hatch', 'sedan', 'pickup', 'van', 'coupe', 'suv'];
  const colours = ['#e23b3b', '#2aabee', '#ffd23f', '#f3f2f7', '#8000ff', '#1fbf6b', '#ff8a3d', '#2b2d3a', '#e219e5'];
  let s = 707;
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const out: [string, number, number, number, string][] = [];
  for (const b of BAYS) {
    if (r() > 0.6) continue;
    out.push([models[Math.floor(r() * models.length)], b.x, b.z, b.yaw + (r() < 0.15 ? Math.PI : 0), colours[Math.floor(r() * colours.length)]]);
  }
  return out;
})();
/** A parked car's footprint, half its length and width (the longest model) */
const CAR_HALF = { l: 1.5, w: 0.62 };

/* ---------- The streets ---------- */

/** Stadium Road and the car park's loop (one-way, driven against its points: north up its west side, east, south down its east side) */
export const STADIUM_STREETS: { id: string; pts: Pt[]; half: number; oneway?: -1 }[] = [
  { id: 'stadium-road', pts: [[ROAD.x0, ROAD.z], [ROAD.x1, ROAD.z]], half: ROAD.half },
  { id: 'stadium-loop', pts: [[LOOP.x1, ROAD.z], [LOOP.x1, LOOP.z1], [LOOP.x0, LOOP.z1], [LOOP.x0, ROAD.z]], half: LOOP.half, oneway: -1 },
];
/** Where they meet the north road and each other (no lights) */
export const STADIUM_CROSSINGS: { id: string; at: Pt; streets: string[] }[] = [
  { id: 'stadium-in', at: [ROAD.x0, ROAD.z], streets: ['ns0', 'stadium-road'] },
  { id: 'stadium-loop-e', at: [LOOP.x1, ROAD.z], streets: ['stadium-road', 'stadium-loop'] },
  { id: 'stadium-loop-w', at: [LOOP.x0, ROAD.z], streets: ['stadium-road', 'stadium-loop'] },
];
/**
 * Lamps along Stadium Road's north side and round the loop's outside: x, z, which way the arm reaches (ry turns +x
 * towards it) and the ground's height (the block's sidewalk is on its slab, the rest is open ground)
 */
export const STADIUM_LAMPS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  const north = ROAD.z - ROAD.half - 0.45;
  for (let x = ROAD.x1 + 4; x < LOOP.x0 - 3; x += 14) if (Math.abs(x - MALL.x) > 4) out.push([x, north, -Math.PI / 2, 0.15]);
  for (let x = LOOP.x1 + 6; x < ROAD.x0 - 5; x += 12) out.push([x, north, -Math.PI / 2, 0.02]);
  for (let z = ROAD.z - 10; z > LOOP.z1 + 3; z -= 14) out.push([LOOP.x1 + LOOP.half + 0.45, z, Math.PI, 0.02]);
  for (let x = LOOP.x1 - 6; x > LOOP.x0 + 3; x -= 14) out.push([x, LOOP.z1 - LOOP.half - 0.45, Math.PI / 2, 0.02]);
  return out;
})();

/* ---------- The footbridge ---------- */

/**
 * The Mall carried over the highway: a deck `y` over the ground from `deck[0]` (north of the stairs up from the Mall)
 * to `deck[1]` (south of the stairs down to the forecourt), `half` either side of x; its stairs in line with it
 * (`steps` of `tread` each end); the piers under it (z)
 */
export const BRIDGE = (() => {
  const steps = 18;
  const tread = 0.42;
  const deck: Pt = [-148.1, -191.5];
  return {
    x: MALL.x,
    half: 1.3,
    /** The deck's top, over the lawns' slab (SLAB is 0.15) */
    y: 3.65,
    deck,
    steps,
    tread,
    /** Each stair's foot and top (z) */
    south: [deck[0] + steps * tread, deck[0]] as Pt,
    north: [deck[1] - steps * tread, deck[1]] as Pt,
    piers: [-150.6, -157.8, -170, -180, -190.8],
  };
})();
/** The lawns' height either side (world.ts's SLAB), and the most a walker steps up at once */
const GROUND = 0.15;
const STEP = 0.32;
/** The walking surface's height at z on the bridge's line (its stairs, its deck), or null off it */
function surface(z: number) {
  const { south, north, deck, y, steps } = BRIDGE;
  const rise = (y - GROUND) / steps;
  if (z <= south[0] && z >= south[1]) return GROUND + rise * Math.min(steps, Math.floor((south[0] - z) / BRIDGE.tread) + 1);
  if (z < deck[0] && z > deck[1]) return y;
  if (z <= north[1] && z >= north[0]) return GROUND + rise * Math.min(steps, Math.floor((z - north[0]) / BRIDGE.tread) + 1);
  return null;
}
/** The footbridge as ground for a walker at height y (`m` in from its edges): its stairs and deck when you're up there, null under it or off it */
export function bridgeY(x: number, z: number, y: number, m = 0): number | null {
  if (Math.abs(x - BRIDGE.x) > BRIDGE.half - m) return null;
  const h = surface(z);
  if (h === null) return null;
  return y >= h - STEP ? h : null;
}
/** What the bridge covers from above */
export const BRIDGE_RECT: Rect = [BRIDGE.x - BRIDGE.half - 0.2, BRIDGE.north[0], BRIDGE.x + BRIDGE.half + 0.2, BRIDGE.south[0]];
/** Up on the bridge, off its walking surface: its parapets (you can't step or fall off) */
export const bridgeWall = (x: number, z: number, y: number, m = 0) =>
  y > GROUND + 0.9 && x > BRIDGE_RECT[0] - m - 0.05 && x < BRIDGE_RECT[2] + m + 0.05 && z > BRIDGE_RECT[1] - m && z < BRIDGE_RECT[3] + m && bridgeY(x, z, y, m) === null;

/* ---------- What's solid ---------- */

/** The facade as boxes along its outline (every few tiles round, each a box over its stretch), to its height */
const facadeBoxes = (): Box[] => {
  const pts = oval(FACADE.a, FACADE.b, 120);
  return pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    return [Math.min(p[0], q[0]) - 0.3, Math.min(p[1], q[1]) - 0.3, Math.max(p[0], q[0]) + 0.3, Math.max(p[1], q[1]) + 0.3, FACADE.h];
  });
};
export const STADIUM_SOLIDS: Box[] = [
  ...facadeBoxes(),
  ...MASTS.map(({ x, z }): Box => [x - 0.45, z - 0.45, x + 0.45, z + 0.45, MAST.h]),
  ...PARKED.map(([, x, z, yaw]): Box => {
    const along = Math.abs(Math.cos(yaw)) > 0.5;
    const [hx, hz] = along ? [CAR_HALF.l, CAR_HALF.w] : [CAR_HALF.w, CAR_HALF.l];
    return [x - hx, z - hz, x + hx, z + hz, 1.3];
  }),
  // The footbridge: its piers (slim, the middle one on the highway's median), and its stairs past their first steps
  ...BRIDGE.piers.map((z): Box => [BRIDGE.x - 0.9, z - 0.2, BRIDGE.x + 0.9, z + 0.2, BRIDGE.y - 0.3]),
  [BRIDGE.x - BRIDGE.half - 0.15, BRIDGE.deck[0], BRIDGE.x + BRIDGE.half + 0.15, BRIDGE.south[0] - BRIDGE.tread * 3, BRIDGE.y],
  [BRIDGE.x - BRIDGE.half - 0.15, BRIDGE.north[0] + BRIDGE.tread * 3, BRIDGE.x + BRIDGE.half + 0.15, BRIDGE.deck[1], BRIDGE.y],
];
/** What the outskirts' trees keep off: the block, the road and the loop with its car park, and the bridge */
export const STADIUM_RECTS: Rect[] = [
  BLOCK,
  [ROAD.x1 - 1, ROAD.z - ROAD.half - 1, ROAD.x0, ROAD.z + ROAD.half + 1],
  [LOOP.x0 - LOOP.half - 1, LOOP.z1 - LOOP.half - 1, LOOP.x1 + LOOP.half + 1, ROAD.z],
  BRIDGE_RECT,
];
/** All of it, for loading its grounds as you approach (districts.ts) */
export const STADIUM_AREA: Rect = [Math.min(...STADIUM_RECTS.map((r) => r[0])), Math.min(...STADIUM_RECTS.map((r) => r[1])), Math.max(...STADIUM_RECTS.map((r) => r[2])), Math.max(...STADIUM_RECTS.map((r) => r[3]))];
/** The highway's north side (z), for the tests: everything here is north of it */
export const HIGHWAY_NORTH = HIGHWAY_BOX[1];
