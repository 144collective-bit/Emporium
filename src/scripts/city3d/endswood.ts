/*
 * Endswood, "the Ends": the south of The Trenches as re-laid (docs/south-plan.md Phase 1b, the owner's calls; DOM-free,
 * the boot's, tested in tests/endswood.test.ts). Its street web is south.ts's (the Circus and its spokes, the village's
 * streets, the closes and their footpaths); this is what the rest of the city asks of it: its land (`inEndswood()`,
 * `ENDSWOOD_RECT`: the blocks and the streets with their sidewalks, as a grid, so what's built is the estate's and the
 * fields round it aren't), its sodium lamps along the streets (`ENDS_LAMPS`, lampmix.ts) and its solids (the
 * bollards at each end of every footpath: walkers and bikes through, cars not).
 *
 * The estate's old streets, blocks, subways, decks, church, parade and rows were taken up for the re-laying (the
 * owner's call: the blocks are redesigned in Phase 2, the village in Phase 3, what's below ground in Phase 4).
 */
import { HIGHWAY_BOX, HIGHWAY_HALF } from './highway';
import type { Box, Pt, Rect } from './underground';
import { CIRCUS, FOOTPATHS, PATH_HALF, SOUTH_BLOCKS, SOUTH_CROSSINGS, SOUTH_STREETS, BRIDGES, BULB } from './south';
import { distTo, inside } from './streetfaces';
import { southLift } from './southground';

export type { Rect, Pt, Box };

/** The estate's name (made up: docs/estate-plan.md), and what everyone calls it */
export const ENDSWOOD_NAME = 'Endswood Estate';
export const ENDS_NICK = 'THE ENDS';

/** The ground's height and the blocks' slab's (world.ts `SLAB`: the sidewalks' top) */
export const GROUND_Y = 0.035;
export const SLAB_Y = 0.15;
/** The ring road's south edge */
export const HW_EDGE = HIGHWAY_BOX[3] + HIGHWAY_HALF;
/** A sidewalk's width (layout.ts `WALK_W`) */
const WALK = 0.8;

/* ---------- The land ---------- */

/** The land's grid: a cell's size, and the cells the blocks and the streets (with their sidewalks) cover */
const CELL = 2;
const key = (i: number, j: number) => (i + 4096) * 8192 + (j + 4096);
const CELLS = new Set<number>();
{
  const mark = (x: number, z: number) => CELLS.add(key(Math.floor(x / CELL), Math.floor(z / CELL)));
  // (each street: a cell every half cell along it, out to its sidewalk's edge)
  for (const s of SOUTH_STREETS) {
    const r = s.half + WALK + CELL / 2;
    for (let i = 1; i < s.pts.length; i++) {
      const [a, b] = [s.pts[i - 1], s.pts[i]];
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (CELL / 2)));
      for (let k = 0; k <= n; k++) {
        const [x, z] = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n];
        for (let dx = -r; dx <= r; dx += CELL / 2) for (let dz = -r; dz <= r; dz += CELL / 2) if (dx * dx + dz * dz <= r * r) mark(x + dx, z + dz);
      }
    }
    if (s.bulb) {
      const [x, z] = s.pts[s.pts.length - 1];
      const R = BULB + WALK + CELL / 2;
      for (let dx = -R; dx <= R; dx += CELL / 2) for (let dz = -R; dz <= R; dz += CELL / 2) if (dx * dx + dz * dz <= R * R) mark(x + dx, z + dz);
    }
  }
  // (each block, every cell whose middle is inside it, and its edge's)
  for (const b of SOUTH_BLOCKS) {
    const xs = b.poly.map((p) => p[0]);
    const zs = b.poly.map((p) => p[1]);
    for (let x = Math.floor(Math.min(...xs) / CELL) * CELL; x <= Math.max(...xs); x += CELL)
      for (let z = Math.floor(Math.min(...zs) / CELL) * CELL; z <= Math.max(...zs); z += CELL) if (inside(b.poly, [x + CELL / 2, z + CELL / 2])) mark(x + CELL / 2, z + CELL / 2);
    for (const [x, z] of b.poly) mark(x, z);
  }
}
const cellXs = [...CELLS].map((k) => Math.floor(k / 8192) - 4096);
const cellZs = [...CELLS].map((k) => (k % 8192) - 4096);
/** The estate's land's bounds (its built-up land: the fields round it are the country's) */
export const ENDSWOOD_RECT: Rect = [Math.min(...cellXs) * CELL, Math.min(...cellZs) * CELL, (Math.max(...cellXs) + 1) * CELL, (Math.max(...cellZs) + 1) * CELL];
/** On the estate's land (`m` more round it, by the grid's cells; negative, further in) */
export function inEndswood(x: number, z: number, m = 0) {
  if (x < ENDSWOOD_RECT[0] - m - CELL || x > ENDSWOOD_RECT[2] + m + CELL || z < ENDSWOOD_RECT[1] - m - CELL || z > ENDSWOOD_RECT[3] + m + CELL) return false;
  const [i, j] = [Math.floor(x / CELL), Math.floor(z / CELL)];
  if (m <= 0) {
    if (!CELLS.has(key(i, j))) return false;
    if (m === 0) return true;
    const r = Math.ceil(-m / CELL);
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (!CELLS.has(key(i + a, j + b))) return false;
    return true;
  }
  const r = Math.ceil(m / CELL);
  for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (CELLS.has(key(i + a, j + b))) return true;
  return false;
}

/** Off every street's asphalt and turning circle, by `m` */
const offRoad = ([x, z]: Pt, m: number) =>
  SOUTH_STREETS.every((o) => distTo(o.pts, [x, z], o.loop) > o.half + m && (!o.bulb || Math.hypot(o.pts[o.pts.length - 1][0] - x, o.pts[o.pts.length - 1][1] - z) > BULB + m));

/* ---------- Lamps ---------- */

/** Sodium lamps (x, z, the way the arm reaches, the ground's height; lampmix.ts): along every street's sidewalks,
 * either side in turn about every 15, clear of the crossings, the bridges and the footpaths' ends; round the Circus's
 * outer sidewalk. A lamp's arm reaches along (cos ry, -sin ry) (world.ts `buildLamps()`): over the carriageway */
export const ENDS_LAMPS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  const crossings = SOUTH_CROSSINGS.map((c) => c.at);
  const ends = FOOTPATHS.flatMap((f) => f.pts);
  const clear = (x: number, z: number) =>
    crossings.every((c) => Math.hypot(c[0] - x, c[1] - z) > 7.5) &&
    ends.every((e) => Math.hypot(e[0] - x, e[1] - z) > 2.5) &&
    FOOTPATHS.every((f) => distTo(f.pts, [x, z]) > PATH_HALF + 0.8) &&
    BRIDGES.every((b) => Math.hypot(b.at[0] - x, b.at[1] - z) > 6) &&
    out.every((l) => Math.hypot(l[0] - x, l[1] - z) > 6);
  for (const s of SOUTH_STREETS) {
    if (s.loop) continue;
    let d = 6;
    let side = 1;
    let run = 0;
    for (let i = 1; i < s.pts.length; i++) {
      const [a, b] = [s.pts[i - 1], s.pts[i]];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      run += l;
      if (run < d) continue;
      // (the street's right is (-dz, dx) along it; the lamp on that side, its arm back over the road)
      const [ux, uz] = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
      const [nx, nz] = [-uz * side, ux * side];
      const off = s.half + 0.45;
      const [x, z] = [b[0] + nx * off, b[1] + nz * off];
      // (and clear of every other street's asphalt)
      const onRoad = !offRoad([x, z], 0.3);
      if (clear(x, z) && !onRoad) {
        out.push([x, z, Math.atan2(nz, -nx), SLAB_Y + southLift(x, z)]);
        side = -side;
        d = run + (s.kind === 'close' || s.kind === 'crescent' ? 13 : 15);
      } else d = run + 2;
    }
  }
  // Round the Circus on its outer sidewalk, between its arms (arms reaching in over the carriageway)
  const R = CIRCUS.r + CIRCUS.half + 0.45;
  for (const a of [40, 130, 220, 310].map((v) => (v * Math.PI) / 180)) {
    const [x, z] = [CIRCUS.x + R * Math.cos(a), CIRCUS.z + R * Math.sin(a)];
    if (SOUTH_STREETS.every((o) => o.loop || o.pts.every((p) => Math.hypot(p[0] - x, p[1] - z) > o.half + 0.6))) out.push([x, z, Math.PI - a, SLAB_Y + southLift(x, z)]);
  }
  return out;
})();

/* ---------- What's solid ---------- */

/** A bollard at each end of a footpath (walkers and bikes through, not cars), either side of the way */
export const BOLLARD = { r: 0.12, h: 0.85 };
/** Where they stand: just in from each end, either side of the path's middle */
/** How far from a point on a street its asphalt reaches there: a turning circle's radius by it, else the street's half */
function reachAt(p: Pt) {
  let r = 0;
  for (const s of SOUTH_STREETS) {
    if (distTo(s.pts, p, s.loop) > 1e-6) continue;
    const e = s.pts[s.pts.length - 1];
    r = Math.max(r, s.bulb && Math.hypot(p[0] - e[0], p[1] - e[1]) < BULB + 0.1 ? BULB : s.half);
  }
  return r;
}
export const PATH_BOLLARDS: Pt[] = FOOTPATHS.flatMap((f) => {
  const [a, b] = f.pts;
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const [ux, uz] = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  const [nx, nz] = [-uz, ux];
  const out: Pt[] = [];
  // (each end is on a street, its middle or its turning circle's: the bollards stand on the block, past its sidewalk;
  // the tunnel's mouth is its own end)
  const w = PATH_HALF * 0.75;
  const at = (t: number, k: number): Pt => [a[0] + ux * t + nx * w * k, a[1] + uz * t + nz * w * k];
  // (then on in, a step at a time, till both of the pair are clear of every street's asphalt and turning circle)
  const clear = (t: number) => [-1, 1].every((k) => offRoad(at(t, k), 0.4));
  let from = f.id.endsWith('tunnel-path') ? 0.6 : reachAt(a) + WALK + 0.3;
  let to = l - (reachAt(b) + WALK + 0.3);
  while (!f.id.endsWith('tunnel-path') && from < l / 2 && !clear(from)) from += 0.2;
  while (to > l / 2 && !clear(to)) to -= 0.2;
  for (const t of [from, to]) if (t > 0 && t < l && clear(t)) for (const k of [-1, 1]) out.push(at(t, k));
  return out;
});
const square = ([x, z]: Pt, r: number, h: number): Box => [x - r, z - r, x + r, z + r, h];
/** What's solid: the footpaths' bollards */
export const ENDS_SOLIDS: Box[] = PATH_BOLLARDS.map((p) => square(p, BOLLARD.r, BOLLARD.h));
