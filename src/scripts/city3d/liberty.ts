/*
 * Liberty Bridge as data (DOM-free like layout.ts, so the scene, walking,
 * collisions, the tests and the game server read one layout): a
 * one-of-a-kind footbridge over the river, in the style of the old
 * gate-tower bridges with lifting leaves (river plan step 3, the owner's
 * calls: its high walkways walked on, its lower deck's halves lifting), on
 * `FOOTBRIDGE_X` (layout.ts).
 *
 * - Two stone gate towers standing in the river on cutwater piers, either
 *   side of the middle: an arch through each for the lower deck, gothic
 *   windows, a corbelled cornice, four domed turrets and the Liberty flame
 *   on top.
 * - The lower deck: an approach from each bank's promenade, hung from
 *   chains between the tower and an abutment just off the quay, rising
 *   gently to `LOW_Y`; through the towers; and across the middle on two
 *   leaves (`LEAF`) that lift for the tall ship on a timetable
 *   (`leavesAt()`): the gates close, the leaves rise, the ship passes, they
 *   come down and the gates open.
 * - The high level at `HIGH_Y`: two enclosed walkways between the towers'
 *   upper storeys and a gallery along each tower's inner face joining them
 *   (a walk all the way round, looking down on the leaves), reached by a
 *   lift in each tower (`LIFTS`).
 * - The tall ship (`SHIP`, `shipAt()`): anchored mid-river west of the
 *   bridge, then east of it, sailing between them through the middle span.
 *
 * The timetable is a function of the clock, the same for everyone (as the
 * airport's). Walking reads `footbridgeY()` (the deck and the high level as
 * ground) and `footbridgeWall()` (their edges, the leaves while they're
 * shut); `LIBERTY_SOLIDS` is what stands in the water. libertybridge.ts
 * draws it.
 *
 * x east, z south, y up; world tiles (1 = about 1.8 m).
 */
import { FOOTBRIDGE_X, RIVER } from './layout';
import { WATER_Y } from './river';
import type { Box } from './solids';

export type Rect = [number, number, number, number];

/** The bridge's centre line (x) */
export const BX = FOOTBRIDGE_X;
/** The middle of the river (z): the middle of the span between the towers */
export const ZC = (RIVER[0] + RIVER[1]) / 2;
/** Half the middle span, between the towers' inner faces (the leaves' length) */
export const SPAN_HALF = 5.5;
/** The towers' inner faces (z): north, south */
export const FACES: [number, number] = [ZC - SPAN_HALF, ZC + SPAN_HALF];

/** The lower deck's walk over the middle (the leaves and through the towers), and the high level's */
export const LOW_Y = 1.2;
export const HIGH_Y = 7.2;
/** The promenades' top, where the approaches start */
export const PROM_Y = 0.05;

/**
 * A gate tower: half its size (x across the bridge, z along it), the arch through it for the lower deck (pointed,
 * springing at `spring`), its cornice, roof, the four corner turrets, the flame's drum and the flame (its tip under
 * the Emporium, about 12.5), and the pier under it in the river (its cutwaters up and down the river)
 */
export const TOWER = {
  hx: 3.0,
  hz: 3.0,
  arch: { half: 1.6, spring: LOW_Y + 2.2 },
  cornice: 9.3,
  roof: 9.7,
  turret: { s: 0.85, top: 10.45, dome: 0.75 },
  drum: 0.35,
  flame: { base: 10.15, h: 2.2 },
  pier: { hx: 3.5, hz: 3.2, cut: 1.9, y: WATER_Y - 0.3 },
};
/** The towers (z): north, south */
export const TOWERS: [number, number] = [FACES[0] - TOWER.hz, FACES[1] + TOWER.hz];
/** Which way the middle is from each tower (+1: south) */
export const TO_MIDDLE: [1, -1] = [1, -1];
/** A pointed arch's height over its springing at u across it (half its span `half`: two arcs of radius its span) */
export function pointedArch(half: number, u: number) {
  const R = 2 * half;
  const d = half + Math.abs(u);
  return d >= R ? 0 : Math.sqrt(R * R - d * d);
}

/** The lower deck: the walk between its parapets (half), the deck's outer half width, the parapets' height */
export const WALK_HALF = 1.5;
export const DECK_HALF = 1.8;
export const PARAPET_H = 0.9;
/** How deep the lower deck is under its walk */
export const DECK_DEPTH = 0.45;
/** Where the approaches start on each bank's promenade (z), and the towers' outer faces they rise to */
export const APPROACH: [number, number] = [RIVER[0] - 1.3, RIVER[1] + 1.3];
export const OUTER: [number, number] = [TOWERS[0] - TOWER.hz, TOWERS[1] + TOWER.hz];
/** The lower deck end to end (the world map draws it) */
export const WALKWAY: [number, number] = APPROACH;

const smooth = (t: number) => {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
};
/** The lower deck's walk at z: up each approach from the promenade, level through the towers and over the middle */
export function lowY(z: number) {
  if (z <= OUTER[0]) return PROM_Y + (LOW_Y - PROM_Y) * smooth((z - APPROACH[0]) / (OUTER[0] - APPROACH[0]));
  if (z >= OUTER[1]) return PROM_Y + (LOW_Y - PROM_Y) * smooth((APPROACH[1] - z) / (APPROACH[1] - OUTER[1]));
  return LOW_Y;
}

/** The abutments just off each quay, where the approaches' chains come down (z from, to; x out from the centre line) */
export const ABUTMENTS: { z: [number, number]; x: [number, number]; top: number }[] = [
  { z: [RIVER[0] + 0.1, RIVER[0] + 1.5], x: [DECK_HALF + 0.05, DECK_HALF + 1.0], top: 2.6 },
  { z: [RIVER[1] - 1.5, RIVER[1] - 0.1], x: [DECK_HALF + 0.05, DECK_HALF + 1.0], top: 2.6 },
];
/** The chains (across: the plane they hang in), where they leave the towers and the abutments, how far they sag */
export const CHAIN = { x: DECK_HALF + 0.12, tower: 6.2, abutment: 2.35, sag: 2.4 };
/** A chain's height at z over approach i (null off it) */
export function chainY(z: number): number | null {
  const [a, b] = z < ZC ? [(ABUTMENTS[0].z[0] + ABUTMENTS[0].z[1]) / 2, OUTER[0]] : [OUTER[1], (ABUTMENTS[1].z[0] + ABUTMENTS[1].z[1]) / 2];
  if (z < a || z > b) return null;
  const t = (z - a) / (b - a);
  const [ya, yb] = z < ZC ? [CHAIN.abutment, CHAIN.tower] : [CHAIN.tower, CHAIN.abutment];
  return ya + (yb - ya) * t - CHAIN.sag * 4 * t * (1 - t);
}

/* ---------- The leaves and the tall ship ---------- */

/** Each leaf: its length (from its tower's face to the middle), how far it lifts, how thick it is */
export const LEAF = { len: SPAN_HALF, max: (75 * Math.PI) / 180, t: DECK_DEPTH };
/** The lift's steps (seconds): the gates close, the leaves rise, they hold while the ship passes, they come down */
export const LIFT_TIMES = { warn: 6, raise: 12, lower: 12 };

/** The tall ship: its length, beam, how tall its masts stand over the water, its line through the middle span (z) */
export const SHIP = { len: 7, beam: 1.8, mast: 7.2, z: ZC - 2 };
/** Where it anchors west and east of the bridge (x) */
export const ANCHOR_X: [number, number] = [BX - 86, BX + 46];
/** Its timetable: a whole round (west to east, then back), when it weighs anchor in each half, its speed and pick-up */
export const SHIP_TIMES = { period: 360, depart: 20, v: 3.2, a: 0.4, turn: 22 };
/** How far clear of the bridge's leaves the ship's bow and stern stay while they're up */
export const SHIP_CLEAR = 4;

const HALF = SHIP_TIMES.period / 2;
const D = ANCHOR_X[1] - ANCHOR_X[0];
const T_ACC = SHIP_TIMES.v / SHIP_TIMES.a;
const D_ACC = 0.5 * SHIP_TIMES.a * T_ACC * T_ACC;
/** How long a passage takes, anchor to anchor */
export const PASSAGE = 2 * T_ACC + (D - 2 * D_ACC) / SHIP_TIMES.v;
/** How far along its passage the ship is, `s` seconds after weighing anchor */
function along(s: number) {
  const { v, a } = SHIP_TIMES;
  if (s <= 0) return 0;
  if (s >= PASSAGE) return D;
  if (s < T_ACC) return 0.5 * a * s * s;
  if (s > PASSAGE - T_ACC) return D - 0.5 * a * (PASSAGE - s) ** 2;
  return D_ACC + v * (s - T_ACC);
}
/** When (seconds after weighing anchor) the ship has come `d` along */
function when(d: number) {
  const { v, a } = SHIP_TIMES;
  if (d <= D_ACC) return Math.sqrt((2 * d) / a);
  if (d >= D - D_ACC) return PASSAGE - Math.sqrt((2 * (D - d)) / a);
  return T_ACC + (d - D_ACC) / v;
}
/** Through the bridge in each half (seconds into the half): the leaves fully up by `up`, starting down at `down` */
const leafWin = (() => {
  // (the same both ways: the passage is symmetric about the bridge only if the anchors are, so each way its own)
  const reach = SHIP_CLEAR + SHIP.len / 2;
  const east = { up: SHIP_TIMES.depart + when(BX - reach - ANCHOR_X[0]), down: SHIP_TIMES.depart + when(BX + reach - ANCHOR_X[0]) };
  const west = { up: SHIP_TIMES.depart + when(ANCHOR_X[1] - (BX + reach)), down: SHIP_TIMES.depart + when(ANCHOR_X[1] - (BX - reach)) };
  return [east, west];
})();
const mod = (a: number, n: number) => ((a % n) + n) % n;

/** The tall ship at time t (seconds): where it is, its heading (yaw: 0 is its bow to +x), whether it's under way */
export function shipAt(t: number): { x: number; z: number; yaw: number; moving: boolean } {
  const p = mod(t, SHIP_TIMES.period);
  const h = p < HALF ? 0 : 1;
  const tau = p - h * HALF;
  const dir = h === 0 ? 1 : -1;
  const from = h === 0 ? ANCHOR_X[0] : ANCHOR_X[1];
  const base = h === 0 ? 0 : Math.PI;
  if (tau < SHIP_TIMES.depart) return { x: from, z: SHIP.z, yaw: base, moving: false };
  const s = tau - SHIP_TIMES.depart;
  if (s < PASSAGE) return { x: from + dir * along(s), z: SHIP.z, yaw: base, moving: true };
  // At anchor at the far end, swinging round to face the way back
  const u = smooth((s - PASSAGE - 12) / SHIP_TIMES.turn);
  return { x: from + dir * D, z: SHIP.z, yaw: base + Math.PI * u, moving: false };
}

/**
 * The leaves at time t (seconds): how far they're up (radians, 0 down), and whether the gates are shut (from the
 * warning before they rise until they're down again)
 */
export function leavesAt(t: number): { angle: number; shut: boolean } {
  const p = mod(t, SHIP_TIMES.period);
  const h = p < HALF ? 0 : 1;
  const tau = p - h * HALF;
  const { up, down } = leafWin[h];
  const { warn, raise, lower } = LIFT_TIMES;
  const r0 = up - raise;
  if (tau < r0 - warn || tau > down + lower) return { angle: 0, shut: false };
  let k = 0;
  if (tau >= r0 && tau < up) k = smooth((tau - r0) / raise);
  else if (tau >= up && tau <= down) k = 1;
  else if (tau > down) k = 1 - smooth((tau - down) / lower);
  return { angle: LEAF.max * k, shut: true };
}
/** The windows (seconds into each half) when the gates are shut, for the tests */
export const SHUT_WINDOWS = leafWin.map(({ up, down }) => [up - LIFT_TIMES.raise - LIFT_TIMES.warn, down + LIFT_TIMES.lower] as [number, number]);

/* ---------- The high level ---------- */

/** The walkways' walk across (|x - BX| from, to), the galleries' depth out from the towers' inner faces, the enclosure's height */
export const HIGH = { walk: [1.3, 2.6] as [number, number], gallery: 1.4, h: 1.7 };
/** Is x, z on the high level (`m` in from its edges): a walkway, or a gallery along a tower's inner face */
export function onHigh(x: number, z: number, m = 0) {
  const ax = Math.abs(x - BX);
  if (z < FACES[0] + m || z > FACES[1] - m || ax > HIGH.walk[1] - m) return false;
  if (ax >= HIGH.walk[0] + m) return true;
  return z <= FACES[0] + HIGH.gallery - m || z >= FACES[1] - HIGH.gallery + m;
}

/* ---------- Walking on it ---------- */

/** How high a step up walking takes onto the deck (and how far under it you stay on the ground or the water) */
const STEP = 0.75;
/**
 * The bridge's ground under a point at height `y`: the lower deck (its approaches, through the towers and over the
 * leaves while they're down: `open`), or up on the high level (null when not on it). `m` keeps that far in from its
 * edges (walking passes Degen's radius, so he never leans into a parapet).
 */
export function footbridgeY(x: number, z: number, y: number, m = 0, open = true): number | null {
  if (y > HIGH_Y - STEP) return onHigh(x, z, m) ? HIGH_Y : null;
  if (z < APPROACH[0] || z > APPROACH[1] || Math.abs(x - BX) > WALK_HALF - m) return null;
  if (!open && z > FACES[0] - m && z < FACES[1] + m) return null;
  const g = lowY(z);
  return y >= g - STEP ? g : null;
}
/** Is x, z on the leaves (between the towers' faces), on the lower deck */
export const onLeaves = (x: number, z: number) => Math.abs(x - BX) <= DECK_HALF && z > FACES[0] && z < FACES[1];
/** Everything the bridge covers, from above: the lower deck end to end, the towers on their piers, the abutments */
export const LIBERTY_RECTS: Rect[] = [
  [BX - DECK_HALF, APPROACH[0], BX + DECK_HALF, APPROACH[1]],
  ...TOWERS.map((z): Rect => [BX - TOWER.pier.hx - TOWER.pier.cut, z - TOWER.pier.hz, BX + TOWER.pier.hx + TOWER.pier.cut, z + TOWER.pier.hz]),
  ...ABUTMENTS.flatMap((a) => [-1, 1].map((e): Rect => (e < 0 ? [BX - a.x[1], a.z[0], BX - a.x[0], a.z[1]] : [BX + a.x[0], a.z[0], BX + a.x[1], a.z[1]]))),
];
/**
 * On the bridge, off its walking surface (or `m` short of its edge): a parapet, a tower's wall, the gates while the
 * leaves are shut, or the high level's railings (you can't step or fall off). On the approaches' first low stretch
 * over the promenade you can step off sideways.
 */
export function footbridgeWall(x: number, z: number, y: number, m = 0, open = true) {
  if (footbridgeY(x, z, y, m, open) !== null) return false;
  if (y > HIGH_Y - STEP) return Math.abs(x - BX) <= TOWER.hx + m + 0.05 && z >= OUTER[0] && z <= OUTER[1];
  if (y < PROM_Y + 0.4) return false;
  return Math.abs(x - BX) <= DECK_HALF + m + 0.05 && z >= APPROACH[0] - m && z <= APPROACH[1] + m;
}

/** Each tower's lift: its door on the lower deck (in the arch's west wall) and on the gallery, and where it lets you out */
export const LIFTS = TOWERS.map((z, i) => {
  const s = TO_MIDDLE[i];
  // (walk.ts's yaw 0 looks north: down below you face out of the middle)
  const toMiddle = s > 0 ? Math.PI : 0;
  return {
    low: { x: BX - WALK_HALF + 0.25, z },
    high: { x: BX, z: FACES[i] + s * 0.3 },
    // (out on the gallery facing along it, east: the camera behind you over the gallery, not in the tower's stone)
    up: { x: BX - 0.6, z: FACES[i] + s * 0.75, y: HIGH_Y, yaw: -Math.PI / 2 },
    down: { x: BX - 0.4, z: z - s * 0.6, y: LOW_Y, yaw: toMiddle + Math.PI },
  };
});
/** How near a lift door you have to stand for its prompt */
export const LIFT_R = 0.9;

/** Walk in from the panel: on the north promenade at the foot of the approach, looking along it (walk.ts: yaw 0 faces -z) */
export const LIBERTY_SPAWN = { x: BX, z: APPROACH[0] + 0.5, yaw: Math.PI };

/** Where boats pass: under the north approach, through the middle span and under the south approach (as before) */
export const BOAT_LANES: number[] = [RIVER[0] + 9.75, ZC, RIVER[1] - 9.75];
/** How far either side of its centre line a boat counts as under it (boats.ts's horn) */
export const BOAT_HALF = TOWER.pier.hx + TOWER.pier.cut + 2.5;

/**
 * People strolling on the high level: life.ts walks them round this outline a little way out from it (its lanes,
 * 0.16 to 0.62 out), along both walkways and the galleries, at `HIGH_Y`
 */
export const DECK_STROLLS: [number, number][][] = [
  [
    [BX - 1.5, FACES[0] + 1.3],
    [BX - 1.5, FACES[1] - 1.3],
    [BX + 1.5, FACES[1] - 1.3],
    [BX + 1.5, FACES[0] + 1.3],
  ],
];

/**
 * What the walk camera can't pass that you can walk under (x0, z0, x1, z1, top, bottom): the towers' upper storeys
 * over their arches, and the high walkways' roofs
 */
export const LIBERTY_CAMERA: [number, number, number, number, number, number][] = [
  ...TOWERS.map((z): [number, number, number, number, number, number] => [BX - TOWER.hx, z - TOWER.hz, BX + TOWER.hx, z + TOWER.hz, TOWER.cornice + 0.5, TOWER.arch.spring + pointedArch(TOWER.arch.half, 0) - 0.2]),
  ...[-1, 1].map((e): [number, number, number, number, number, number] => {
    const [a, c] = e < 0 ? [BX - HIGH.walk[1] - 0.16, BX - HIGH.walk[0] + 0.04] : [BX + HIGH.walk[0] - 0.04, BX + HIGH.walk[1] + 0.16];
    return [a, FACES[0], c, FACES[1], HIGH_Y + HIGH.h + 0.08, HIGH_Y + HIGH.h];
  }),
];

/**
 * What stands in the water: the towers either side of the arch (walk through it), and the abutments. Heights are
 * for the camera and the bullets.
 */
export const LIBERTY_SOLIDS: Box[] = [
  ...TOWERS.flatMap((z) =>
    [-1, 1].map((s): Box => {
      const [a, b] = [BX + s * TOWER.arch.half, BX + s * TOWER.hx];
      return [Math.min(a, b), z - TOWER.hz, Math.max(a, b), z + TOWER.hz, TOWER.roof];
    })
  ),
  ...LIBERTY_RECTS.slice(3).map((r): Box => [...r, ABUTMENTS[0].top]),
];
