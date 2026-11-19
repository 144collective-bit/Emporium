/**
 * Crestmont's land round its houses (the polish pass, the owner's call: "design the surrounding land appropriately").
 * DOM-free, in Crestmont's chunk only: drawn by crestgardens3d.ts, its piers solid when the chunk comes in
 * (`LAND_SOLIDS`), the hills' oaks and scrub kept off it (landscape.ts `plantable()`), tested in tests/crestland.test.ts.
 *
 * - **Vineyards** (`VINEYARDS`): rows of vines on posts and wires across the gentler slopes low on the hills.
 * - **Olive groves** (`GROVES`): old olives in loose rows a little higher up.
 * - **Wildflower meadows** (`MEADOWS`): drifts of flowers in the open grass.
 * - **The mansions' drives** (`DRIVE_TREES`, `DRIVE_PIERS`): an avenue of cypresses up each from the road, and a pair
 *   of stone piers with lanterns at its mouth.
 *
 * Each found by a search over the hills (`clear()`): off the hill roads and their beds, the mansions, the landmarks,
 * the golf course, the reservoir and the metro's spur, on ground gentle enough. Every height is the ground's.
 */
import { BED, CREST_LAMPS, nearHillRoad } from './crestmont';
import { HILLS, TERRAIN_RECT, heightAt, naturalAt, slopeAt } from './terrain';
import { MANSIONS, onMansion } from './mansions';
import { onSite } from './crestsites';
import { underSpur } from './metro';
import { rng } from './recipes';
import { BUILT, baked } from './baked';
import { LANES } from './crestlife';

type Rect = [number, number, number, number];
type Box = [number, number, number, number, number];

/** A vineyard's rows (z) from x0 to x1, `ROW` apart */
export const ROW = 1.4;
export interface Vineyard {
  rect: Rect;
  rows: { z: number; x0: number; x1: number }[];
}
export interface Tree {
  x: number;
  z: number;
  y: number;
  s: number;
}
export interface Meadow {
  x: number;
  z: number;
  r: number;
  /** Its flowers: where, and which colour */
  flowers: { x: number; z: number; y: number; c: number }[];
}

/** Clear for the land's use at a point: on the hills, off what's there already, the ground no steeper than `slope` */
export function clear(x: number, z: number, slope: number) {
  return (
    x > TERRAIN_RECT[0] + 8 &&
    x < 468 &&
    z < HILLS.foot.z - 8 &&
    z > -430 &&
    naturalAt(x, z) > 2.5 &&
    !nearHillRoad(x, z, BED.shoulder + 3) &&
    !onMansion(x, z, 3) &&
    !onSite(x, z, 3) &&
    !underSpur(x, z) &&
    slopeAt(x, z) < slope
  );
}
/** A whole box clear, sampled every 3 */
function clearBox(r: Rect, slope: number) {
  for (let x = r[0]; x <= r[2] + 1e-9; x += (r[2] - r[0]) / Math.ceil((r[2] - r[0]) / 3)) for (let z = r[1]; z <= r[3] + 1e-9; z += (r[3] - r[1]) / Math.ceil((r[3] - r[1]) / 3)) if (!clear(x, z, slope)) return false;
  return true;
}
const apart = (a: Rect, b: Rect, m: number) => a[2] + m < b[0] || b[2] + m < a[0] || a[3] + m < b[1] || b[3] + m < a[1];

/** The search: boxes of a size laid over the hills from their foot up, the first `n` clear and apart from the rest */
function search(w: number, d: number, slope: number, n: number, taken: Rect[]): Rect[] {
  const out: Rect[] = [];
  for (let z = HILLS.foot.z - 10 - d; z > -425 && out.length < n; z -= 7)
    for (let x = TERRAIN_RECT[0] + 10; x + w < 466 && out.length < n; x += 7) {
      const r: Rect = [x, z, x + w, z + d];
      if ([...taken, ...out].every((t) => apart(t, r, 10)) && clearBox(r, slope)) out.push(r);
    }
  return out;
}

/**
 * The land as the search laid it before the premium upgrade's Phase 3 (the owner's call, 2026-11-19: "deeper terraces +
 * vineyard"): it stays where it stood, but where a new hill house's lot or drive now takes its ground (two vineyards
 * and a grove), that piece is moved aside whole to the first clear place the search finds (`keep()`)
 */
const LAID: { vines: Rect[]; groves: Rect[]; meadows: Rect[] } = {
  vines: [[393, -111, 415, -99], [442, -153, 464, -141], [400, -244, 422, -232]],
  groves: [[428, -118, 444, -106], [365, -146, 381, -134], [435, -181, 451, -169]],
  meadows: [[449, -211, 463, -197], [323, -225, 337, -211], [449, -239, 463, -225], [323, -253, 337, -239], [442, -267, 456, -253]],
};
/** Each laid piece kept where it's still clear, or moved aside to the search's first clear place apart from the rest */
function keep(laid: Rect[], w: number, d: number, slope: number, taken: Rect[]): Rect[] {
  const out: Rect[] = [];
  laid.forEach((r, i) => {
    if (clearBox(r, slope)) return out.push(r);
    const [moved] = search(w, d, slope, 1, [...taken, ...out, ...laid.slice(i + 1)]);
    if (moved) out.push(moved);
  });
  return out;
}
/**
 * Where the vineyards, groves and meadows lie: searched for when the site is built (baked.ts; scripts/bake.mjs), not as
 * Crestmont's chunk loads on the main thread
 */
const RECTS: { vines: Rect[]; groves: Rect[]; meadows: Rect[] } = baked('crest-land', BUILT ? undefined : () => {
  const vines = keep(LAID.vines, 22, 12, 0.45, [...LAID.groves, ...LAID.meadows]);
  const groves = keep(LAID.groves, 16, 12, 0.55, [...vines, ...LAID.meadows]);
  return { vines, groves, meadows: keep(LAID.meadows, 14, 14, 0.7, [...vines, ...groves]) };
});
const vineRects = RECTS.vines;
export const VINEYARDS: Vineyard[] = vineRects.map((rect) => {
  const rows: Vineyard['rows'] = [];
  for (let z = rect[1] + 0.8; z < rect[3] - 0.5; z += ROW) rows.push({ z, x0: rect[0] + 0.6, x1: rect[2] - 0.6 });
  return { rect, rows };
});
const groveRects = RECTS.groves;
export const GROVES: Tree[][] = groveRects.map((r, k) => {
  const rand = rng(4410 + k);
  const out: Tree[] = [];
  for (let z = r[1] + 1.6; z < r[3] - 1; z += 3.2)
    for (let x = r[0] + 1.6 + ((z - r[1]) % 6.4 > 3 ? 1.6 : 0); x < r[2] - 1; x += 3.2) {
      const [px, pz] = [x + (rand() - 0.5) * 0.8, z + (rand() - 0.5) * 0.8];
      out.push({ x: px, z: pz, y: heightAt(px, pz), s: 0.85 + rand() * 0.35 });
    }
  return out;
});
const meadowRects = RECTS.meadows;
export const MEADOWS: Meadow[] = meadowRects.map((r, k) => {
  const rand = rng(5520 + k);
  const [x, z] = [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];
  const R = 6.5;
  const flowers: Meadow['flowers'] = [];
  for (let i = 0; i < 70; i++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * R;
    const [fx, fz] = [x + Math.cos(a) * d, z + Math.sin(a) * d];
    flowers.push({ x: fx, z: fz, y: heightAt(fx, fz), c: Math.floor(rand() * 5) });
  }
  return { x, z, r: R, flowers };
});

/* ---------- The mansions' drives ---------- */

/** The cypresses' way out from a drive's middle, and how far apart up it; the piers' */
export const AVENUE = { off: 1.75, step: 2.4 } as const;
export const DRIVE_PIER = { off: 1.6, at: 1.3, half: 0.25, h: 1.3 } as const;
const offLamps = (x: number, z: number, m: number) => CREST_LAMPS.every(([lx, lz]) => Math.hypot(lx - x, lz - z) > m);

/** Clear for a pier: off the road, its lamps and the joggers' and dog walkers' lanes along its shoulders (crestlife.ts) */
const pierClear = (x: number, z: number) => !nearHillRoad(x, z, 0.5) && offLamps(x, z, 1) && !LANES.some((l) => l.pts.some(([px, pz]) => Math.hypot(px - x, pz - z) < DRIVE_PIER.half + 0.75));
/** Each mansion's drive: its piers a little up it from the road (further where the lanes run past its mouth), its cypresses past them */
const DRIVES = MANSIONS.map((m, k) => {
  const [a, b] = m.drive;
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const [ux, uz] = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
  const at = (t: number, s: number): [number, number] => [a[0] + ux * t - uz * s * DRIVE_PIER.off, a[1] + uz * t + ux * s * DRIVE_PIER.off];
  const t = [DRIVE_PIER.at, DRIVE_PIER.at + 0.8, DRIVE_PIER.at + 1.6].find((t) => t < L - 1 && [-1, 1].every((s) => pierClear(...at(t, s))));
  const piers: Tree[] = t === undefined ? [] : [-1, 1].map((s) => {
    const [x, z] = at(t, s);
    return { x, z, y: heightAt(x, z), s: 1 };
  });
  const rand = rng(6630 + k);
  const trees: Tree[] = [];
  for (let d = (t ?? 0.4) + 1.6; d < L - 0.8; d += AVENUE.step)
    for (const s of [-1, 1]) {
      const [x, z] = [a[0] + ux * d - uz * s * AVENUE.off, a[1] + uz * d + ux * s * AVENUE.off];
      if (nearHillRoad(x, z, 0.8) || !offLamps(x, z, 1.2) || onSite(x, z, 0.5)) continue;
      trees.push({ x, z, y: heightAt(x, z), s: 0.9 + rand() * 0.25 });
    }
  return { piers, trees };
});
export const DRIVE_TREES: Tree[] = DRIVES.flatMap((d) => d.trees);
export const DRIVE_PIERS: Tree[] = DRIVES.flatMap((d) => d.piers);
/** The drives' piers, solid */
export const LAND_SOLIDS: Box[] = DRIVE_PIERS.map(({ x, z, y }) => [x - DRIVE_PIER.half, z - DRIVE_PIER.half, x + DRIVE_PIER.half, z + DRIVE_PIER.half, y + DRIVE_PIER.h]);

/** In a vineyard, a grove or a meadow (padded `m`): the hills' oaks and scrub keep off */
export function onLand(x: number, z: number, m = 0) {
  for (const r of [...vineRects, ...groveRects]) if (x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m) return true;
  return MEADOWS.some((w) => Math.hypot(w.x - x, w.z - z) < w.r + m);
}
