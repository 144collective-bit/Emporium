/*
 * The swing bridge (docs/highway-plan.md Phase 5, the owner's call; DOM-free, tested in tests/swingbridge.test.ts):
 * a second road bridge over the river, from Uptown to The Trenches, in line with Uptown's southbound street and The
 * Trenches' x -112 cross street. Low over the water (the boats pass under it) with a ramp up from each bank avenue's
 * kerb, it swings open for the tall ship on Liberty Bridge's timetable (liberty.ts `shipNear()`): the barriers come
 * down, the span turns a quarter round on its pier, the ship sails by, and it swings back.
 *
 * - The deck (`deckY()`): up a ramp `RAMP` long from each kerb (`Z0`, `Z1`) to `H`, level between; the roadway (one
 *   lane each way, `ROAD`), a footway each side a step up (`FOOT`, `FOOT_H`) and the parapets (`HALF`).
 * - The swing span (`SPAN`): over the north and middle of the river, centred on its pivot pier (`PIVOT`, between the
 *   north and middle boat lanes), its south end resting on `REST`; the fixed approach south of it on `SOUTH_PIER`
 *   (between the middle and south lanes). Open, it lies along the river between the north lane and the ship's line.
 * - The timetable (`swingAt()`): the barriers down `SWING_TIMES.warn` before it turns, a quarter turn in `turn`, open
 *   while the ship is near enough to touch what it sweeps (`SWING_REACH`), back, the barriers up.
 * - The barriers (`BARRIERS`): one at each end before the span; while they're down the traffic coming waits at them
 *   (`barrierHold()`), and walking and driving stop at them (`barrierWalls()`).
 * - `onSwingDeck()` / `swingY()`: its surface for walking and driving; `betweenBarriers()`: where you're put off when
 *   they come down; `swingRoadY()`: the road's height for the traffic's routes (routes.ts `heightsOf()`).
 * - `SWING_STREET` (its street in the plan, `swingPts()`), `SWING_SOLIDS` (in `SOLIDS`: the parapets),
 *   `SWING_PIERS` (what stands in the water, for the boats), `SWING_LAMPS` (on the fixed approaches, at the boot),
 *   `SWING_RECT` (what it covers: the promenades' dressing keeps off).
 *
 * x east, z south, y up; world tiles (1 = about 1.8 m).
 */
import { EW_ROADS, RING_HI, SOUTH_ROAD } from './layout';
import { BOAT_LANES, SHIP, shipNear, SHIP_TIMES } from './liberty';
import { WATER_Y } from './river';
import type { Box } from './solids';

/** Its name (made up), on the boards at each end */
export const SWING_NAME = 'KESTREL BRIDGE';
/** Its centre line (x): Uptown's southbound street's and The Trenches' cross street's (uptown.ts COUPLET.south, trenches.ts NS_X) */
export const SX = -112;
const bank = (c: number) => EW_ROADS.find((r) => r.c === c)!;
/** Where the deck starts and ends (z): the bank avenues' kerbs */
export const Z0 = RING_HI + bank(RING_HI).half;
export const Z1 = SOUTH_ROAD - bank(SOUTH_ROAD).half;
/** The deck's height over the streets between its ramps, and how long each ramp is */
export const H = 1.0;
export const RAMP = 12;
/** Across (offsets from `SX`): the roadway's half width, the footways, the deck's outer half width (the parapets' outsides) */
export const ROAD = 1.7;
export const FOOT: [number, number] = [ROAD + 0.05, 2.95];
export const HALF = 3.1;
/** The footways' step over the roadway, the parapets' height over the footway, the deck's depth under the road */
export const FOOT_H = 0.12;
export const PARAPET_H = 0.95;
export const DEPTH = 0.5;

const smooth = (u: number) => {
  const k = Math.max(0, Math.min(1, u));
  return k * k * (3 - 2 * k);
};
/** The roadway's height at z: up each ramp from its kerb, level between */
export function deckY(z: number) {
  if (z <= Z0 || z >= Z1) return 0;
  return H * Math.min(smooth((z - Z0) / RAMP), smooth((Z1 - z) / RAMP));
}
/** The roadway's slope at z (dy / dz) */
export function deckSlope(z: number) {
  const e = 0.05;
  return (deckY(z + e) - deckY(z - e)) / (2 * e);
}

/** The pivot pier (a round drum in the river) the span turns on */
export const PIVOT = { z: (BOAT_LANES[0] + BOAT_LANES[1]) / 2 + 1.1, r: 2.4 };
/** The swing span: its half length (it's centred on the pivot) */
export const SPAN = { half: 11.5, z0: 0, z1: 0 };
SPAN.z0 = PIVOT.z - SPAN.half;
SPAN.z1 = PIVOT.z + SPAN.half;
/** The rest pier under its south end, and the fixed approach's pier between the middle and south lanes */
export const REST = { z: SPAN.z1 + 0.75, hz: 0.6 };
export const SOUTH_PIER = { z: (BOAT_LANES[1] + BOAT_LANES[2]) / 2, hz: 0.9 };
/** The piers' half width across the bridge */
export const PIER_HX = HALF + 0.2;

/** The barriers (z): one at each end before the span, on the fixed approaches */
export const BARRIERS = { n: SPAN.z0 - 3.5, s: REST.z + 3.2 };
/** Is x, z on the deck between the barriers (where you're put off when they come down) */
export const betweenBarriers = (x: number, z: number, m = 0) => Math.abs(x - SX) <= HALF + m && z > BARRIERS.n - m && z < BARRIERS.s + m;

/* ---------- The timetable ---------- */

/** The barriers' warning before it turns, how long a quarter turn takes, how far it turns */
export const SWING_TIMES = { warn: 20, turn: 24, open: Math.PI / 2 };
/** How far clear of what the span sweeps the ship's ends stay */
export const SWING_CLEAR = 2;
/** The span's swept circle round the pivot, and how near the ship's middle may come (along the river) while it turns */
export const SWEEP = Math.hypot(SPAN.half, HALF);
const nearZ = Math.min(Math.abs(SHIP.z - SHIP.beam / 2 - PIVOT.z), Math.abs(SHIP.z + SHIP.beam / 2 - PIVOT.z));
export const SWING_REACH = Math.sqrt(Math.max(0, SWEEP * SWEEP - nearZ * nearZ)) + SWING_CLEAR + SHIP.len / 2;
/** In each half of the ship's round (seconds into it): open by `up`, starting back at `down` */
const WIN = shipNear(SX, SWING_REACH);
const HALF_T = SHIP_TIMES.period / 2;
const mod = (a: number, n: number) => ((a % n) + n) % n;
/** The windows (seconds into each half) the barriers are down, for the tests */
export const SWING_WINDOWS = WIN.map(({ up, down }) => [up - SWING_TIMES.turn - SWING_TIMES.warn, down + SWING_TIMES.turn] as [number, number]);
/** The span at time t (seconds): how far it's turned (radians, 0 shut across the river), whether the barriers are down */
export function swingAt(t: number): { angle: number; shut: boolean } {
  const p = mod(t, SHIP_TIMES.period);
  const h = p < HALF_T ? 0 : 1;
  const tau = p - h * HALF_T;
  const { up, down } = WIN[h];
  const { warn, turn, open } = SWING_TIMES;
  const t0 = up - turn;
  if (tau < t0 - warn || tau > down + turn) return { angle: 0, shut: false };
  let k = 0;
  if (tau >= t0 && tau < up) k = smooth((tau - t0) / turn);
  else if (tau >= up && tau <= down) k = 1;
  else if (tau > down) k = 1 - smooth((tau - down) / turn);
  return { angle: open * k, shut: true };
}
/** Where the span's ends are at angle a (x, z of its north and south ends' middles) */
export function spanEnds(a: number): [[number, number], [number, number]] {
  const [dx, dz] = [Math.sin(a) * SPAN.half, Math.cos(a) * SPAN.half];
  return [
    [SX - dx, PIVOT.z - dz],
    [SX + dx, PIVOT.z + dz],
  ];
}

/* ---------- Walking, driving, the traffic ---------- */

/** Is x, z on the deck (inside its parapets, `m` in from them) */
export const onSwingDeck = (x: number, z: number, m = 0) => Math.abs(x - SX) <= FOOT[1] - m && z > Z0 && z < Z1;
/** The deck's surface at x, z (the footways a step up), else null */
export function swingY(x: number, z: number): number | null {
  if (!onSwingDeck(x, z)) return null;
  return deckY(z) + (Math.abs(x - SX) > FOOT[0] ? FOOT_H * Math.min(1, deckY(z) / 0.2 + 0.4) : 0);
}
/** The road's height for a car on it heading along it (the traffic's routes), else null */
export const swingRoadY = (x: number, z: number) => (Math.abs(x - SX) <= ROAD + 0.4 && z > Z0 && z < Z1 ? deckY(z) : null);

/**
 * While the barriers are down: how far ahead (along fx, fz) a car at x, z coming onto the bridge has to its barrier
 * (from its nose, `half` its length), else Infinity
 */
export function barrierHold(x: number, z: number, fx: number, fz: number, half: number, shut: boolean) {
  if (!shut || Math.abs(x - SX) > ROAD + 0.6) return Infinity;
  if (fz > 0.6 && z < BARRIERS.n) return BARRIERS.n - z - half;
  if (fz < -0.6 && z > BARRIERS.s) return z - BARRIERS.s - half;
  return Infinity;
}
/** The barriers as walls while they're down: across the deck at each end, inside its parapets */
export const BARRIER_WALLS: Box[] = [BARRIERS.n, BARRIERS.s].map((z): Box => [SX - HALF, z - 0.15, SX + HALF, z + 0.15, H + 1.6]);
export const barrierWalls = (shut: boolean): Box[] => (shut ? BARRIER_WALLS : []);

/** The parapets' first and last z (over the water, past the promenades' crossings at the kerbs) */
export const PARAPET_Z: [number, number] = [Z0 + 4.2, Z1 - 4.2];
/** What's solid of it: the parapets (in pieces 2 long, up with the deck) */
export const SWING_SOLIDS: Box[] = (() => {
  const out: Box[] = [];
  for (const side of [-1, 1]) {
    const [o0, o1] = side < 0 ? [SX - HALF, SX - FOOT[1]] : [SX + FOOT[1], SX + HALF];
    for (let z = PARAPET_Z[0]; z < PARAPET_Z[1] - 1e-6; z += 2) {
      const z1 = Math.min(PARAPET_Z[1], z + 2);
      out.push([o0, z, o1, z1, Math.max(deckY(z), deckY(z1)) + FOOT_H + PARAPET_H]);
    }
  }
  return out;
})();
/** What stands in the water (for the boats and the tests): x0, z0, x1, z1 */
export const SWING_PIERS: [number, number, number, number][] = [
  [SX - PIVOT.r, PIVOT.z - PIVOT.r, SX + PIVOT.r, PIVOT.z + PIVOT.r],
  [SX - PIER_HX, REST.z - REST.hz, SX + PIER_HX, REST.z + REST.hz],
  [SX - PIER_HX, SOUTH_PIER.z - SOUTH_PIER.hz, SX + PIER_HX, SOUTH_PIER.z + SOUTH_PIER.hz],
];
/** The piers' tops (under the deck; they're the boats' only: nothing walking or driving reaches them, and up on the deck they'd be walls) */
export const PIER_TOP = H - DEPTH;
/** What it covers (the promenades' railings, lamps, benches and trees keep off) */
export const SWING_RECT: [number, number, number, number] = [SX - HALF - 0.3, Z0, SX + HALF + 0.3, Z1];
/** How low over the water its underside is, at z (for the boats) */
export const undersideY = (z: number) => (z <= Z0 || z >= Z1 ? 0 : deckY(z) - DEPTH);
/** The water's level under it (river.ts) */
export const WATER = WATER_Y;

/** The lamps on its fixed approaches (x, z, the way the arm faces, its foot's height): on the footways' outer edges */
export const SWING_LAMPS: [number, number, number, number][] = [BARRIERS.n + 1.6, SOUTH_PIER.z - 2.5, SOUTH_PIER.z + 6, SOUTH_PIER.z + 13].flatMap((z) =>
  [-1, 1].map((side): [number, number, number, number] => [SX + side * (FOOT[1] - 0.2), z, side < 0 ? 0 : Math.PI, deckY(z) + FOOT_H])
);

/** Its street in the plan: from the north bank avenue's middle to the south bank's, points every 1.5 so the routes carry its heights */
export const SWING_STREET = 'swing';
export function swingPts(): [number, number][] {
  const pts: [number, number][] = [[SX, RING_HI]];
  for (let z = Z0; z < Z1; z += 1.5) pts.push([SX, z]);
  pts.push([SX, Z1], [SX, SOUTH_ROAD]);
  return pts;
}
