/*
 * Harbour Bridge as data (river plan step 2, the owner's name and design;
 * DOM-free like layout.ts, so the scene, walking, driving, the traffic, the
 * tests and the game server read one layout): the east ring avenue's bridge
 * over the river, where the metro crosses, in the style of the old
 * suspension bridges.
 *
 * - Two stone towers standing in the river on cutwater piers, each with a
 *   great pointed arch the roadway and the metro pass through, and a smaller
 *   pointed arch through each leg for the footway.
 * - Four main cables over the towers' tops, from anchorages on the
 *   promenades at either end, suspenders down to the deck's girders and a
 *   web of stays fanning out from each tower's top.
 * - The deck: the avenue's two lanes each way (its own lanes, so the traffic
 *   runs on as before), humped `RISE` over the middle so the boats pass
 *   under (the water lies `WATER_Y` below the streets), from the bank
 *   avenues' kerbs (`Z0`, `Z1`) in one smooth rise and fall, a girder each
 *   side of the roadway and a footway along each outer edge.
 * - The metro down the middle on its own raised level, the el's height
 *   (metro.ts `DECK_Y`), joining the line either side without ramps: its
 *   posts stand on the deck's median.
 *
 * x east, z south, y up; world tiles (1 = about 1.8 m). Across the bridge
 * numbers are offsets `u` from its centre line (`HX`).
 */
import { EW_ROADS, MEDIAN, NS_ROADS, RING_HI, SOUTH_ROAD } from './layout';
import { WATER_Y } from './river';
import type { Box } from './solids';

/** The plan's street the bridge carries (the east ring avenue, layout.ts BRIDGED_NS) */
export const HARBOUR_STREET = `ns${NS_ROADS.length - 1}`;
const ROAD = NS_ROADS[NS_ROADS.length - 1];
/** The bridge's centre line (x): the east ring avenue's, the metro's */
export const HX = ROAD.c;
/** Where the deck starts and ends (z): the bank avenues' kerbs */
const bank = (c: number) => EW_ROADS.find((r) => r.c === c)!;
export const Z0 = RING_HI + bank(RING_HI).half;
export const Z1 = SOUTH_ROAD - bank(SOUTH_ROAD).half;
/** The bridge's middle (z) */
export const MID = (Z0 + Z1) / 2;
/** How high the deck rises over the middle */
export const RISE = 2.4;

/** Across the deck (offsets from `HX`): the roadway, the girders either side of the footway, the deck's outer edge */
export const ROADWAY = ROAD.half;
export const GIRDER = { inner: [ROADWAY, 4.0] as [number, number], outer: [5.75, 6.0] as [number, number], h: 0.9 };
export const FOOTWAY: [number, number] = [GIRDER.inner[1], GIRDER.outer[0]];
/** The deck's outer half width */
export const HALF = GIRDER.outer[1];
/** How far the footway's boards stand over the roadway (a kerb's step) */
export const FOOT_H = 0.15;
/** How deep the deck is under the roadway (its steel, its stiffening truss) */
export const DEPTH = 0.5;

/** The deck's height (the roadway's) at z: a smooth rise from each bank avenue's kerb to `RISE` over the middle */
export function deckY(z: number) {
  if (z <= Z0 || z >= Z1) return 0;
  const s = Math.sin((Math.PI * (z - Z0)) / (Z1 - Z0));
  return RISE * s * s;
}
/** The deck's slope at z (dy / dz) */
export function deckSlope(z: number) {
  if (z <= Z0 || z >= Z1) return 0;
  const k = Math.PI / (Z1 - Z0);
  return RISE * k * Math.sin(2 * k * (z - Z0));
}
/** Is x, z on the bridge's deck (`m` in from its edges) */
export const onHarbour = (x: number, z: number, m = 0) => Math.abs(x - HX) <= HALF - m && z > Z0 && z < Z1;
/** The ground on the bridge at x, z: the roadway, or the footway's boards; null off it */
export function harbourY(x: number, z: number): number | null {
  if (!onHarbour(x, z)) return null;
  const u = Math.abs(x - HX);
  return deckY(z) + (u >= FOOTWAY[0] && u <= FOOTWAY[1] ? FOOT_H : 0);
}

/** The towers (z), standing in the river either side of its middle: the main span between them, a side span to each bank */
export const TOWERS: [number, number] = [MID - 15, MID + 15];
/**
 * A tower: half its width across the bridge (`hu`) and its depth along it (`hz`), the great arch over the roadway and
 * the metro (pointed, as wide as the roadway, springing at `spring`), the footway's arch through each leg (`foot`:
 * across, springing over the footway), the cornice and top, and the pier under it in the river (its cutwaters
 * pointing up and down the river, `cut` long). Everything under the Emporium (about 12.5).
 */
export const TOWER = {
  hu: 7.8,
  hz: 2.0,
  arch: { half: ROADWAY, spring: 3.2 },
  /** The inner piers between the great arch and the footway's arches, and the outer legs */
  pier: [ROADWAY, 4.25] as [number, number],
  foot: { u: [4.25, 5.75] as [number, number], spring: 1.5 },
  leg: [5.75, 7.8] as [number, number],
  cornice: 10.6,
  top: 11.2,
  /** The cable saddles' housings on top */
  saddle: 11.7,
  base: { hu: 8.3, hz: 2.4, cut: 1.8, y: WATER_Y - 0.3 },
};
/** A pointed arch's height over its springing at u across it (half its span `half`: two arcs of radius its span) */
export function pointedArch(half: number, u: number) {
  const R = 2 * half;
  const d = half + Math.abs(u);
  return d >= R ? 0 : Math.sqrt(R * R - d * d);
}
/** The great arch's crown (y) */
export const CROWN = TOWER.arch.spring + pointedArch(TOWER.arch.half, 0);

/** The four main cables: their planes across the bridge (u: over the inner piers and over the outer legs) */
export const CABLE_U = [-(GIRDER.outer[0] + GIRDER.outer[1]) / 2, -(GIRDER.inner[0] + GIRDER.inner[1]) / 2, (GIRDER.inner[0] + GIRDER.inner[1]) / 2, (GIRDER.outer[0] + GIRDER.outer[1]) / 2];
/** The cables' saddles on the towers (y), how low the main span's dips (over the girder's top at the middle), the anchorages' cable ends */
export const CABLE = { top: TOWER.top + 0.2, low: RISE + GIRDER.h + 0.25, anchor: 1.6, sideSag: 1.2 };
/** The anchorages, one on each bank's promenade for each cable (z from, to; across, the girder's line and out) */
export const ANCHORS: { z: [number, number]; u: [number, number] }[] = (() => {
  const ends: [number, number][] = [
    [Z0 + 0.3, Z0 + 1.9],
    [Z1 - 1.9, Z1 - 0.3],
  ];
  return ends.flatMap((z) => [
    { z, u: [ROADWAY, 4.3] as [number, number] },
    { z, u: [5.75, 6.6] as [number, number] },
  ]);
})();
/** Where each end's cables come down to: their anchorages' middles (z) */
export const ANCHOR_Z: [number, number] = [(ANCHORS[0].z[0] + ANCHORS[0].z[1]) / 2, (ANCHORS[2].z[0] + ANCHORS[2].z[1]) / 2];
/** A main cable's height at z (it hangs from the anchorage over the tower's top, down to the middle and up again) */
export function cableY(z: number) {
  const [t0, t1] = TOWERS;
  if (z >= t0 && z <= t1) {
    // The main span: a parabola down to `low` over the middle
    const t = (z - MID) / (t1 - MID);
    return CABLE.low + (CABLE.top - CABLE.low) * t * t;
  }
  // A side span: from the anchorage to the tower's saddle, sagging a little
  const [a, b] = z < t0 ? [ANCHOR_Z[0], t0] : [t1, ANCHOR_Z[1]];
  const t = Math.min(1, Math.max(0, (z - a) / (b - a)));
  const [ya, yb] = z < t0 ? [CABLE.anchor, CABLE.top] : [CABLE.top, CABLE.anchor];
  return ya + (yb - ya) * t - CABLE.sideSag * 4 * t * (1 - t);
}
/** Suspenders, from each cable down to its girder: every `SUSPENDER` along the deck between the anchorages and the towers */
export const SUSPENDER = 1.5;
/** The stays: from each tower's top down to points along the girder, fanning out both ways (how many, how far apart) */
export const STAYS = { n: 6, from: 2.8, step: 2.2 };

/** The metro's posts on the deck's median (metro.ts draws them from `deckY`; the el above is the bridge's raised centre) */
export const MEDIAN_HALF = MEDIAN / 2;

/** A spot on the north end's east footway, looking south over the bridge */
export const HARBOUR_SPAWN = { x: HX + (FOOTWAY[0] + FOOTWAY[1]) / 2, z: Z0 + 2.6, yaw: 0 };

/** What's solid: the towers above and below the deck (but the roadway's and the footways' ways through), the girders over the water, the anchorages */
export const HARBOUR_SOLIDS: Box[] = [
  ...TOWERS.flatMap((z): Box[] =>
    [-1, 1].flatMap((e): Box[] =>
      [TOWER.pier, TOWER.leg].map(([a, b]): Box => {
        const [u0, u1] = e < 0 ? [-b, -a] : [a, b];
        return [HX + u0, z - TOWER.hz, HX + u1, z + TOWER.hz, TOWER.top];
      })
    )
  ),
  // The girders: between the roadway and the footways, and along the outer edges, from the anchorages out over the water
  ...[GIRDER.inner, GIRDER.outer].flatMap(([a, b]) =>
    [-1, 1].flatMap((e): Box[] => {
      const [u0, u1] = e < 0 ? [-b, -a] : [a, b];
      const runs: [number, number][] = [
        [ANCHORS[0].z[1], TOWERS[0] - TOWER.hz],
        [TOWERS[0] + TOWER.hz, TOWERS[1] - TOWER.hz],
        [TOWERS[1] + TOWER.hz, ANCHORS[2].z[0]],
      ];
      return runs.map(([z0, z1]): Box => [HX + u0, z0, HX + u1, z1, RISE + GIRDER.h]);
    })
  ),
  ...ANCHORS.flatMap(({ z, u: [a, b] }) => [-1, 1].map((e): Box => (e < 0 ? [HX - b, z[0], HX - a, z[1], CABLE.anchor + 0.4] : [HX + a, z[0], HX + b, z[1], CABLE.anchor + 0.4]))),
];

/** What the bridge covers on land (x0, z0, x1, z1): its deck and anchorages (the promenades' railings, lamps and benches keep off it) */
export const HARBOUR_RECT: [number, number, number, number] = [HX - ANCHORS[1].u[1], Z0, HX + ANCHORS[1].u[1], Z1];
