/*
 * Endswood carried west, the estate round the terraces (docs/ends-west-plan.md Phase 3; DOM-free, the chunk's, tested
 * in tests/endsweststreet.test.ts), on the blocks' east ends Phase 1 kept (endswest.ts `RESERVE`). The owner's picks:
 *
 * - **The parade** on the Close (`PARADE_W`): four small shop units under a concrete canopy (`UNITS_W`: the corner
 *   shop, the chippy, the launderette, the fourth shuttered and to let), two storeys of flats over them, its forecourt
 *   on the Close's sidewalk; the bin store behind it (`BIN_STORES_W`).
 * - **The kids' space:** a fenced playground north of the parade (`PLAY_W`: rubber, swings, a slide, a roundabout, a
 *   springer, the fence's gate onto the cross path, `PLAY_FENCE`), and the kickabout green on the south block with a
 *   goal at each end (`KICKABOUT`, `GOALS`).
 * - **The garage block** (`GARAGES`): a row of lock-ups facing west onto their asphalt apron off the Close, a few with
 *   their up-and-over doors left open (`open`).
 * - The estate's board by the Close, CCTV on poles over the parade and the garages, benches by the playground and the
 *   green (`BOARD_W`, `CCTV_W`, `BENCHES_W`).
 *
 * `STREET_W_SOLIDS` join the grids when the chunk loads (endswest3d.ts `addSolids()`). Everything under the Emporium;
 * made-up names only. In world numbers, x across, z north (-) to south (+); every rect is x0, z0, x1, z1.
 */
import { CROSS_PATHS, N_EDGE, RESERVE, S_EDGE } from './endswest';
import { SLAB_Y, type Pt, type Rect } from './endswood';
import type { UnitKind } from './endsstreet';
import type { Box } from './solids';

const [NR, SR] = RESERVE;

/* ---------- The parade ---------- */

/** The shop floor's height (the canopy over it), the flats' storeys over it, the parapet */
export const SHOP_H = 1.4;
export const FLAT_H = 1;
export const FLATS = 2;
export const PARADE_PARAPET = 0.24;
/** The parade's body: across the north reserve's south end, its front on the forecourt by the Close's sidewalk */
export const PARADE_W = {
  rect: [NR[0] + 0.3, N_EDGE - 7, NR[2] - 0.3, N_EDGE - 1.5] as Rect,
  /** Its front (z), facing the Close (+z) */
  get front() {
    return this.rect[3];
  },
  top: SLAB_Y + SHOP_H + FLATS * FLAT_H,
};
/** The canopy over the units: its height and how far it reaches out over the forecourt */
export const CANOPY_W = { y: SLAB_Y + SHOP_H, out: 0.9, t: 0.08 };
export interface ShopUnit {
  name: string;
  kind: UnitKind;
  shut?: boolean;
}
/** The four units, west to east (made-up names; the fourth shut and to let) */
export const UNITS_W: ShopUnit[] = [
  { name: 'FENNEL MART', kind: 'news' },
  { name: 'FRYING SQUAD', kind: 'chippy' },
  { name: 'SPIN CYCLE', kind: 'launderette' },
  { name: 'UNIT 4 · TO LET', kind: 'phone', shut: true },
];
/** A unit's run along the front (x0, x1) */
export const unitAt = (k: number): [number, number] => {
  const [x0, , x1] = PARADE_W.rect;
  const w = (x1 - x0) / UNITS_W.length;
  return [x0 + k * w, x0 + (k + 1) * w];
};
/** The flats' door in the parade's west end, and the steel stair up its back to their landing (its flight solid) */
export const FLATS_DOOR: Pt = [PARADE_W.rect[0], PARADE_W.rect[1] + 1.2];
export const PARADE_STAIR: Rect = [PARADE_W.rect[0] + 0.4, PARADE_W.rect[1] - 1.2, PARADE_W.rect[0] + 1.3, PARADE_W.rect[1] - 0.3];

/* ---------- The bin stores ---------- */

/** Brick bin stores (three walls, open to their way in): behind the parade, and at the garages' end by the Close */
export interface BinStore {
  rect: Rect;
  /** The side it opens on */
  open: 'n' | 's' | 'e' | 'w';
}
export const BIN_STORES_W: BinStore[] = [
  { rect: [NR[0] + 1, N_EDGE - 10.6, NR[0] + 3.6, N_EDGE - 8.8], open: 'n' },
  { rect: [SR[2] - 3.2, S_EDGE + 0.3, SR[2] - 0.6, S_EDGE + 2.1], open: 'w' },
];
export const BIN_WALL = { h: 1.1, t: 0.12 };

/* ---------- The playground ---------- */

/** The fenced playground in the north reserve, its gate on the west side onto the cross path */
export const PLAY_W = {
  rect: [NR[0] + 0.6, NR[1] + 6, NR[2] - 0.6, NR[1] + 20] as Rect,
  gate: { z: NR[1] + 13, w: 1.4 },
  fence: 0.8,
};
const [px0, pz0, px1, pz1] = PLAY_W.rect;
/** The fence's runs (thin rects), broken at the gate */
export const PLAY_FENCE: Rect[] = [
  [px0, pz0 - 0.04, px1, pz0 + 0.04],
  [px0, pz1 - 0.04, px1, pz1 + 0.04],
  [px1 - 0.04, pz0, px1 + 0.04, pz1],
  [px0 - 0.04, pz0, px0 + 0.04, PLAY_W.gate.z - PLAY_W.gate.w / 2],
  [px0 - 0.04, PLAY_W.gate.z + PLAY_W.gate.w / 2, px0 + 0.04, pz1],
];
/** What the kids play on: the swings' frame, the slide (its ladder and chute), the roundabout, two springers */
export const SWINGS: Rect = [px0 + 1.2, pz0 + 1, px0 + 4.4, pz0 + 2];
export const SLIDE: Rect = [px1 - 2.6, pz0 + 1, px1 - 1.4, pz0 + 4.4];
export const ROUNDABOUT: { c: Pt; r: number } = { c: [(px0 + px1) / 2, pz1 - 3.6], r: 0.9 };
export const SPRINGERS: Pt[] = [
  [px0 + 2, pz1 - 2],
  [px1 - 2, pz1 - 2.4],
];

/* ---------- The kickabout green and the garages ---------- */

/** The garage block: lock-ups along the south reserve's east side facing west onto their apron off the Close */
export const GARAGE_N = 8;
export const GARAGE_W = 1.7;
export const GARAGES = {
  rect: [SR[2] - 3.4, S_EDGE + 2.5, SR[2], S_EDGE + 2.5 + GARAGE_N * GARAGE_W] as Rect,
  h: 1.45,
  /** Which doors are left up */
  open: [1, 4, 5],
};
/** The apron: asphalt from the Close's sidewalk to past the last garage */
export const APRON: Rect = [SR[0] + 1, S_EDGE + 0.1, GARAGES.rect[0], GARAGES.rect[3] + 1.2];
/** The kickabout green: the rest of the south reserve, south of the apron */
export const KICKABOUT: Rect = [SR[0], APRON[3] + 2, SR[2], SR[3]];
/** A goal at each end of the green, facing each other (its middle, the way it faces, its width and height) */
export const GOAL = { w: 2, h: 0.7, d: 0.5 };
export const GOALS: { at: Pt; faces: 1 | -1 }[] = [
  { at: [(KICKABOUT[0] + KICKABOUT[2]) / 2, KICKABOUT[1] + 8], faces: 1 },
  { at: [(KICKABOUT[0] + KICKABOUT[2]) / 2, KICKABOUT[1] + 38], faces: -1 },
];

/* ---------- The board, CCTV, benches ---------- */

/** The estate's board by the Close (west of the parade, by the cross path), facing the Close */
export const BOARD_W = { at: [CROSS_PATHS[0][2] + 0.9, N_EDGE - 0.5] as Pt, w: 1.4, h: 1, legs: 0.7 };
/** CCTV on poles: at the parade's east corner and over the garages' apron */
export const CCTV_W: { at: Pt; looks: number }[] = [
  { at: [NR[2] - 0.15, N_EDGE - 0.4], looks: Math.PI * 0.75 },
  { at: [APRON[0] + 0.2, APRON[1] + 0.6], looks: -Math.PI * 0.25 },
];
export const CCTV_H = 2.9;
/** Benches (where, the way they face): outside the playground's fence and along the green */
export const BENCHES_W: { at: Pt; faces: Pt }[] = [
  { at: [px0 + 2, pz1 + 1.1], faces: [0, -1] },
  { at: [px1 - 2, pz1 + 1.1], faces: [0, -1] },
  { at: [KICKABOUT[0] + 0.6, KICKABOUT[1] + 19], faces: [1, 0] },
  { at: [KICKABOUT[0] + 0.6, KICKABOUT[1] + 27], faces: [1, 0] },
];

/* ---------- What's solid ---------- */

const box = ([x0, z0, x1, z1]: Rect, h: number): Box => [x0, z0, x1, z1, SLAB_Y + h];
const t = BIN_WALL.t;
function binWalls({ rect: [x0, z0, x1, z1], open }: BinStore): Rect[] {
  const walls: Record<string, Rect> = { n: [x0, z0, x1, z0 + t], s: [x0, z1 - t, x1, z1], w: [x0, z0, x0 + t, z1], e: [x1 - t, z0, x1, z1] };
  return Object.entries(walls)
    .filter(([k]) => k !== open)
    .map(([, r]) => r);
}
export const STREET_W_SOLIDS: Box[] = [
  [...PARADE_W.rect, PARADE_W.top + PARADE_PARAPET] as Box,
  box(GARAGES.rect, GARAGES.h + 0.1),
  box(PARADE_STAIR, SHOP_H),
  ...BIN_STORES_W.flatMap((s) => binWalls(s).map((r) => box(r, BIN_WALL.h))),
  ...PLAY_FENCE.map((r) => box(r, PLAY_W.fence)),
  box(SWINGS, 1.5),
  box(SLIDE, 1.4),
  box([ROUNDABOUT.c[0] - ROUNDABOUT.r, ROUNDABOUT.c[1] - ROUNDABOUT.r, ROUNDABOUT.c[0] + ROUNDABOUT.r, ROUNDABOUT.c[1] + ROUNDABOUT.r], 0.4),
  // (the goals' posts, the board's legs, the CCTV poles)
  ...GOALS.flatMap(({ at: [x, z] }) => [-1, 1].map((s): Box => box([x + (s * GOAL.w) / 2 - 0.05, z - 0.05, x + (s * GOAL.w) / 2 + 0.05, z + 0.05], GOAL.h))),
  ...[-1, 1].map((s): Box => box([BOARD_W.at[0] + (s * BOARD_W.w) / 2 - 0.05, BOARD_W.at[1] - 0.05, BOARD_W.at[0] + (s * BOARD_W.w) / 2 + 0.05, BOARD_W.at[1] + 0.05], BOARD_W.legs + BOARD_W.h)),
  ...CCTV_W.map(({ at: [x, z] }): Box => box([x - 0.06, z - 0.06, x + 0.06, z + 0.06], CCTV_H)),
];
