/*
 * The joined mall's roofs dressed (docs/mall-plan.md "One mall" Phase 4, the owner's pick: so the mall reads as
 * finished from the City view; DOM-free, tested in tests/mallroofs.test.ts), drawn by mallroofs3d.ts in the mall's
 * chunk (nothing here is in the boot: none of it is walked on or solid).
 *
 * - **The roofs** (`ROOFS`): Palm Court's two rows (mall.ts `SHOPS`, two storeys since Phase 3), Maxwell's and
 *   Bright & Co., the hall round its glass vault, Paradise Cinema. Each with its height, whether it gets the grey
 *   membrane (`membrane`: the light roofs, which read as bare white slabs from above), what it keeps clear of (the
 *   vault's opening and its curb, the coping round its edge, the plant).
 * - **The plant** (`PLANT`): the air handlers with their louvred screens, the ones mall3d.ts drew before and the
 *   rows' and the cinema's; each its footprint (`plantRect()`).
 * - **The solar arrays** (`PANELS`): rows of panels along x tilted to face south (+z), `PANEL_D` deep, `PANEL_GAP` to
 *   the next row (room for their shadow and to walk), in the room left on each roof.
 * - **The rooflights** (`ROOFLIGHTS`): over Palm Court's upper floor's units, the rows' inner halves.
 */
import { ANCHORS, CINEMA, HALL, PROM, ROW_H, SHOPS, type Pt, type Rect } from './mall';

/** The slab (world.ts `SLAB`) */
const SLAB = 0.15;

/* ---------- The plant ---------- */

/** An air handler's footprint at (x, z): its box and the louvred screen east of it (mall3d.ts `plant()`) */
export const plantRect = ([x, z]: Pt): Rect => [x - 1.0, z - 0.7, x + 2.9, z + 0.7];
const xm = (r: Rect) => (r[0] + r[2]) / 2;
const zm = (r: Rect) => (r[1] + r[3]) / 2;
/** Each anchor's two (the middle of its roof, and by its back), the hall's two by its back (where mall3d.ts always had them) */
export const ANCHOR_PLANT: Pt[][] = ANCHORS.map((a): Pt[] => [
  [xm(a.rect) - 3, zm(a.rect)],
  [xm(a.rect) + 2, a.rect[1] + 6],
]);
export const HALL_PLANT: Pt[] = [
  [HALL.rect[0] + 4, HALL.rect[1] + 2],
  [HALL.rect[2] - 6, HALL.rect[1] + 2],
];
/** Palm Court's rows': one over every third shop, by the rows' outer edge (the louvres towards the promenade) */
export const ROW_PLANT: Pt[] = SHOPS.filter((_, i) => i % 3 === 0).map((s): Pt => [s.face === 1 ? s.rect[0] + 1.6 : s.rect[2] - 4.6, zm(s.rect)]);
/** The cinema's: two over its back half */
export const CINEMA_PLANT: Pt[] = [
  [CINEMA.rect[0] + 6, CINEMA.rect[1] + 4],
  [CINEMA.rect[2] - 9, CINEMA.rect[1] + 4],
];

/* ---------- The roofs ---------- */

export interface Roof {
  id: string;
  /** The room on it: inside its coping */
  rect: Rect;
  /** Its top (world) */
  y: number;
  /** A grey membrane laid over it (the light roofs) */
  membrane: boolean;
  /** What the panels keep clear of */
  keep: Rect[];
  plant: Pt[];
}
/** How far in from a roof's edge (its coping and a walk round inside it) */
const EDGE = 0.7;
const inset = (r: Rect, d: number): Rect => [r[0] + d, r[1] + d, r[2] - d, r[3] - d];
/** Palm Court's rows as runs of roof (the shops are 0.2 apart: one roof over each run of them), the vault's curb on their inner edge */
function rowRuns(face: 1 | -1): Rect[] {
  const shops = SHOPS.filter((s) => s.face === face).sort((a, b) => a.rect[1] - b.rect[1]);
  const out: Rect[] = [];
  for (const s of shops) {
    const last = out.at(-1);
    if (last && s.rect[1] - last[3] < 0.5) last[3] = s.rect[3];
    else out.push([s.rect[0], s.rect[1], s.rect[2], s.rect[3]]);
  }
  // (clear of the vault's curb along the promenade's edge)
  return out.map((r): Rect => (face === 1 ? [r[0], r[1], PROM[0] - 0.45, r[3]] : [PROM[1] + 0.45, r[1], r[2], r[3]]));
}
/** The hall's roof round its glass vault: the opening and its curb (mall3d.ts `hall()`) */
const HALL_VAULT: Rect = (() => {
  const [x0, z0, x1, z1] = HALL.rect;
  const zc = (z0 + z1) / 2;
  return [x0 + 3.5 - 0.9, zc - 4.2 - 0.8, x1 - 3.5 + 0.9, zc + 4.2 + 0.8];
})();
export const ROOFS: Roof[] = [
  ...([1, -1] as const).flatMap((face) =>
    rowRuns(face).map((r, i): Roof => {
      const plant = ROW_PLANT.filter(([x, z]) => x > r[0] - 1 && x < r[2] + 1 && z > r[1] && z < r[3]);
      return { id: `court-${face === 1 ? 'west' : 'east'}-${i}`, rect: inset(r, EDGE), y: SLAB + ROW_H, membrane: true, keep: plant.map(plantRect), plant };
    })
  ),
  ...ANCHORS.map((a, k): Roof => ({ id: `anchor-${k}`, rect: inset(a.rect, EDGE), y: SLAB + a.h, membrane: a.wall === 'light', keep: ANCHOR_PLANT[k].map(plantRect), plant: [] })),
  { id: 'hall', rect: inset(HALL.rect, EDGE), y: SLAB + HALL.h, membrane: false, keep: [HALL_VAULT, ...HALL_PLANT.map(plantRect)], plant: [] },
  { id: 'cinema', rect: inset(CINEMA.rect, EDGE), y: SLAB + CINEMA.h, membrane: false, keep: CINEMA_PLANT.map(plantRect), plant: CINEMA_PLANT },
];

/* ---------- The solar arrays ---------- */

/** A row of panels: how deep (along z, before its tilt), its rise from front to back, the gap to the next row */
export const PANEL_D = 1.0;
export const PANEL_RISE = 0.45;
export const PANEL_GAP = 0.9;
/** The shortest row worth laying */
const MIN_LEN = 2.0;
/** A rect's x spans along one band of z left clear of what's kept clear of */
function spans(x0: number, x1: number, z0: number, z1: number, keep: Rect[]): Pt[] {
  const cuts = keep.filter((k) => k[1] < z1 + 0.3 && k[3] > z0 - 0.3).map((k): Pt => [k[0] - 0.4, k[2] + 0.4]).sort((a, b) => a[0] - b[0]);
  const out: Pt[] = [];
  let at = x0;
  for (const [a, b] of cuts) {
    if (b <= at) continue;
    if (a > at) out.push([at, Math.min(a, x1)]);
    at = Math.max(at, b);
    if (at >= x1) break;
  }
  if (at < x1) out.push([at, x1]);
  return out.filter(([a, b]) => b - a >= MIN_LEN);
}
/** The rows' outer halves take the panels (their inner halves the rooflights); the rest the whole roof */
const panelRoom = (r: Roof): Rect => {
  if (!r.id.startsWith('court-')) return r.rect;
  const west = r.id.startsWith('court-west');
  const mid = xm(r.rect);
  return west ? [r.rect[0], r.rect[1], mid, r.rect[3]] : [mid, r.rect[1], r.rect[2], r.rect[3]];
};
/** Each array: its footprint (x0, z0, x1, z1: its low front edge at z1, facing south) and the roof's top */
export const PANELS: { rect: Rect; y: number; roof: string }[] = ROOFS.flatMap((r) => {
  const [x0, z0, x1, z1] = panelRoom(r);
  const out: { rect: Rect; y: number; roof: string }[] = [];
  for (let z = z0; z + PANEL_D <= z1 + 1e-6; z += PANEL_D + PANEL_GAP) for (const [a, b] of spans(x0, x1, z, z + PANEL_D, r.keep)) out.push({ rect: [a, z, b, z + PANEL_D], y: r.y, roof: r.id });
  return out;
});

/* ---------- The rooflights ---------- */

/** Over Palm Court's upper floor's units, down the rows' inner halves: their footprints (a curb round glass) and the roof's top */
export const ROOFLIGHT = { w: 2.6, d: 1.4, gap: 3.4 };
export const ROOFLIGHTS: { rect: Rect; y: number }[] = ROOFS.filter((r) => r.id.startsWith('court-')).flatMap((r) => {
  const west = r.id.startsWith('court-west');
  const cx = west ? (xm(r.rect) + r.rect[2]) / 2 : (r.rect[0] + xm(r.rect)) / 2;
  const out: { rect: Rect; y: number }[] = [];
  for (let z = r.rect[1] + 0.8; z + ROOFLIGHT.d <= r.rect[3] - 0.8; z += ROOFLIGHT.d + ROOFLIGHT.gap) {
    const q: Rect = [cx - ROOFLIGHT.w / 2, z, cx + ROOFLIGHT.w / 2, z + ROOFLIGHT.d];
    if (!r.keep.some((k) => q[0] < k[2] + 0.3 && q[2] > k[0] - 0.3 && q[1] < k[3] + 0.3 && q[3] > k[1] - 0.3)) out.push({ rect: q, y: r.y });
  }
  return out;
});
