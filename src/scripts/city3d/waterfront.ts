/*
 * The Trenches' waterfront (docs/waterfront-plan.md, the owner's pick: a
 * boardwalk out over the water and a pier; DOM-free, tested in
 * tests/waterfront.test.ts), drawn by waterfront3d.ts:
 *
 * - **The boardwalk** (`BOARDWALK`): a timber deck along the south bank
 *   from the highway's slip lanes to where the town's promenade begins,
 *   from the bank avenue's kerb out over the water (`OUT` past the river
 *   wall), on piles; a railing at the water, sodium lamps reaching over it,
 *   benches facing the river, trees in planters on the land side, mooring
 *   bollards and life rings along the edge.
 * - **Pier 7** (`PIER`): the centrepiece, out from the boardwalk on the
 *   Pier House's line (riverside.ts): a neck under a steel arch with PIER 7
 *   on a lit board (`ARCH`), and a wide head with a bait and coffee kiosk
 *   (`KIOSK`), coin binoculars, benches and people fishing off the rail.
 * - **The old docks** in front of the Refinery: a rust-red dock crane
 *   standing on the boardwalk, its jib out over a barge tied up alongside
 *   (`CRANE`, `BARGE`).
 * - **The night market's deck** (`MARKET_DECK`, what stands on it is
 *   nightmarket.ts): a broad deck out over the water in front of Harbor
 *   Stores, its whole length open to the boardwalk (`RAIL_GAPS`).
 *
 * It's a place (spot `pier`, its pin over the arch, `PIER_SPAWN`). Walking:
 * the decks are ground at `DECK_Y` (`onDeck()`: the river's wall stops you
 * everywhere else); the railing is the decks' edge. The boats keep clear:
 * a lane coming near the pier's head or the market's deck swings north round
 * it (`boatZ()`). What's solid is
 * `WATERFRONT_SOLIDS` (in SOLIDS): the crane's legs, the arch's posts, the
 * kiosk.
 */
import type { Footprint, Pt, Rect } from './downtown';
import { EW_ROADS, RIVER } from './layout';
import { BOAT_LANES } from './liberty';
import { laneAt } from './river';
import { PIER_HOUSE, REFINERY, STORES } from './riverside';

/** The south bank avenue: the boardwalk runs from its kerb to the water */
const BANK = EW_ROADS[EW_ROADS.length - 1];
/** The deck's top over the ground (a step up from the street, the river's wall under it) */
export const DECK_Y = 0.14;
/** How far the deck reaches out over the water past the river's wall */
export const OUT = 2.25;

/** The boardwalk: x0 by the highway's slip lanes, x1 where the town's promenade begins; z from the water's edge to the kerb */
export const BOARDWALK: Rect = [-198, RIVER[1] - OUT, -42, BANK.c - BANK.half];
const [BX0, BZ0, BX1, BZ1] = BOARDWALK;

/** Pier 7 on the Pier House's line: the neck out from the boardwalk, the head across its end */
const PX = PIER_HOUSE.cx;
export const PIER = {
  x: PX,
  neck: [PX - 2, BZ0 - 3.4, PX + 2, BZ0] as Rect,
  head: [PX - 8, BZ0 - 6.8, PX + 8, BZ0 - 3.4] as Rect,
};
/** The night market's deck (nightmarket.ts): a broad deck out over the water in front of Harbor Stores, joining the boardwalk along its whole length */
export const MARKET_DECK: Rect = [STORES.lot[0] + 1.5, BZ0 - 5.2, STORES.lot[2] + 5, BZ0];
/** The decks you walk on, overlapping where they meet (so a walker's middle is always in one of them) */
export const DECKS: Rect[] = [
  BOARDWALK,
  [PIER.neck[0], PIER.neck[1], PIER.neck[2], BZ0 + 1],
  [PIER.head[0], PIER.head[1], PIER.head[2], PIER.head[3] + 1],
  [MARKET_DECK[0], MARKET_DECK[1], MARKET_DECK[2], BZ0 + 1],
];
/** Where the boardwalk's railing at the water stops: the pier's neck and the market's deck run on out from it (x0, x1) */
export const RAIL_GAPS: [number, number][] = [
  [PIER.neck[0], PIER.neck[2]],
  [MARKET_DECK[0], MARKET_DECK[2]],
];
/** Is a point on a deck, `m` (a walker's radius) inside its edge */
export const onDeck = (x: number, z: number, m = 0) => DECKS.some((r) => x > r[0] + m && x < r[2] - m && z > r[1] + m && z < r[3] - m);
/** Over the water (past the river's wall): the deck that's drawn on piles */
export const overWater = (z: number) => z < RIVER[1];

/** The arch over the pier's neck at the boardwalk's edge: its posts' x, z, its height and the board's */
export const ARCH = { x0: PX - 2.25, x1: PX + 2.25, z: BZ0 + 0.35, post: 0.3, h: 3.6, board: { w: 3.2, h: 0.75, y: 2.45 } };
/** The kiosk at the head's west end: a little octagon, its counter facing the head's middle */
export const KIOSK = { c: [PIER.head[0] + 2.1, (PIER.head[1] + PIER.head[3]) / 2] as Pt, r: 1.2, h: 2.4 };
/** Coin binoculars at the head's north rail and along the boardwalk */
export const BINOCULARS: Pt[] = [
  [PX + 2.5, PIER.head[1] + 0.45],
  [PX + 6, PIER.head[1] + 0.45],
  [-148, BZ0 + 0.45],
  [-66.8, BZ0 + 0.45],
];
/** People fishing off the head's rail, facing the water (yaw 0 is +z: they face -z) */
export const FISHERS: { x: number; z: number; yaw: number }[] = [
  { x: PX - 4.8, z: PIER.head[1] + 0.55, yaw: Math.PI },
  { x: PX - 1.6, z: PIER.head[1] + 0.55, yaw: Math.PI + 0.15 },
  { x: PIER.head[2] - 0.55, z: PIER.head[1] + 1.6, yaw: Math.PI / 2 + 0.2 },
];

/** The dock crane in front of the Refinery: a portal on four legs straddling the boardwalk, its jib out over the water */
export const CRANE = (() => {
  const cx = (REFINERY.hall[0] + REFINERY.hall[2]) / 2 + 4;
  const legs: Rect[] = [];
  const [lx0, lx1] = [cx - 1.6, cx + 1.6];
  const [lz0, lz1] = [BZ0 + 0.35, BZ1 - 0.6];
  for (const x of [lx0, lx1]) for (const z of [lz0, lz1]) legs.push([x - 0.2, z - 0.2, x + 0.2, z + 0.2]);
  return { cx, legs, portal: [lx0, lz0, lx1, lz1] as Rect, deck: 3.4, cab: 4.6, jib: { to: BZ0 - 2.1, y: 6.2 }, top: 8.4 };
})();
/** The barge tied up alongside, under the crane's jib */
export const BARGE: Rect = [CRANE.cx - 5.5, BZ0 - 3.6, CRANE.cx + 5.5, BZ0 - 0.55];

/** Where things stand along the boardwalk: never in the pier's mouth, under the crane or along the market (it has its own) */
const clearAt = (x: number, m: number) =>
  Math.abs(x - PX) > ARCH.x1 - PX + m && (x < CRANE.portal[0] - m || x > CRANE.portal[2] + m) && (x < MARKET_DECK[0] - m || x > MARKET_DECK[2] + m);
/** Lamps at the water's edge, their arms reaching in over the walk */
export const LAMPS: Pt[] = [];
for (let x = BX0 + 3; x < BX1 - 1; x += 9) if (clearAt(x, 0.8)) LAMPS.push([x, BZ0 + 0.4]);
/** Benches facing the water, between the lamps */
export const BENCHES: Pt[] = [];
for (let x = BX0 + 7.5; x < BX1 - 2; x += 9) if (clearAt(x, 1.4)) BENCHES.push([x, BZ0 + 1.05]);
/** Trees in planters on the land side, every other bay */
export const PLANTERS: Pt[] = [];
for (let x = BX0 + 7.5; x < BX1 - 2; x += 18) if (clearAt(x, 1.4)) PLANTERS.push([x, BZ1 - 0.75]);
/** Mooring bollards and life rings along the edge */
export const BOLLARDS: number[] = [];
for (let x = BX0 + 1.5; x < BX1; x += 4.5) if (clearAt(x, 0.3) && !LAMPS.some((l) => Math.abs(l[0] - x) < 0.6)) BOLLARDS.push(x);
export const RINGS: number[] = LAMPS.filter((_, i) => i % 3 === 1).map((l) => l[0] + 1.6);

/** People strolling the boardwalk (life.ts walks its lanes round this thin loop down the middle) */
export const STROLL: Pt[] = [
  [BX0 + 4, BZ0 + 1.9],
  [BX0 + 4, BZ1 - 1.9],
  [BX1 - 4, BZ1 - 1.9],
  [BX1 - 4, BZ0 + 1.9],
];

/**
 * The boats keep clear (life.ts): since the river was widened again (river plan step 1) every lane runs its whole
 * length, following its curves (river.ts `laneAt()`); a lane coming near Pier 7's head or the market's deck swings
 * north round it, eased in and out
 */
const SWINGS = [
  { c: PX, flat: PIER.head[2] - PX + 2.5, ease: 14, z: PIER.head[1] - 1.1 },
  { c: (MARKET_DECK[0] + MARKET_DECK[2]) / 2, flat: (MARKET_DECK[2] - MARKET_DECK[0]) / 2 + 2.5, ease: 14, z: MARKET_DECK[1] - 1.1 },
];
export function boatZ(lane: number, x: number) {
  const z = laneAt(BOAT_LANES[lane], x);
  // (the furthest north any swing wants it here)
  let out = z;
  for (const w of SWINGS) {
    const d = Math.abs(x - w.c);
    if (d >= w.flat + w.ease) continue;
    const t = d <= w.flat ? 1 : 1 - (d - w.flat) / w.ease;
    const s = t * t * (3 - 2 * t);
    out = Math.min(out, z + (Math.min(z, w.z) - z) * s);
  }
  return out;
}

/** Its land, for the trees and the promenade's dressing to keep off (x0, z0, x1, z1) */
export const WATERFRONT_RECT: Rect = [BX0, PIER.head[1], BX1, BZ1];

/** Where Walk in and fast travel stand you: on the boardwalk under the arch, facing out along the pier (walk.ts's yaw 0 is north) */
export const PIER_SPAWN = { x: PX + 0.6, z: BZ0 + 2.2, yaw: 0 };

/** Everything solid: the crane's legs, the arch's posts, the kiosk */
export const WATERFRONT_SOLIDS: Footprint[] = [
  ...CRANE.legs.map((r): Footprint => [...r, CRANE.top]),
  ...[ARCH.x0, ARCH.x1].map((x): Footprint => [x - ARCH.post / 2, ARCH.z - ARCH.post / 2, x + ARCH.post / 2, ARCH.z + ARCH.post / 2, ARCH.h]),
  [KIOSK.c[0] - KIOSK.r, KIOSK.c[1] - KIOSK.r, KIOSK.c[0] + KIOSK.r, KIOSK.c[1] + KIOSK.r, KIOSK.h],
];
