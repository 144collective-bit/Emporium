/*
 * The blocks' edges where they meet open land (docs/blend-plan.md Phase 3;
 * DOM-free, tested in tests/verges.test.ts). Every block is a slab `SLAB`
 * high with a kerb all round; along a street that's right, but where a block
 * meets open land (the highway's verge, the land between districts, the belt
 * outside the Parkway) its straight step down onto the grass is what made
 * every district end on a ruled line.
 *
 * `VERGES` finds those stretches: each straight side of every block's slab
 * is walked a tile at a time and looked past (`OUT`), and where what's there
 * is open land (not a street of the plan, a lay-by or a bay, not another
 * slab, not the water or the docks' basin) the stretch is a verge. There the
 * slab eases down to the ground over `RAMP` (drawn by world.ts, a grass or
 * gravel bank in the district's cover; walking and driving follow it,
 * `vergeY()`), and along its foot stands the district's own edge (`EDGE_OF`):
 * a clipped hedge round the town and Crestmont's estates, a low stone wall
 * round Uptown and the shops; the rest (the park, the stadium, The Trenches,
 * the Docks, Sunridge with its own wall) just the bank. A hedge or a wall is
 * broken every `GAP_EVERY` (a way through, `GAP`) and solid between
 * (`VERGE_SOLIDS`, in `SOLIDS`), low enough to vault (vault.ts).
 */
import { PLAN, inPoly, type Pt } from './streetplan';
import { HIGHWAY_HALF, fromHighway } from './highway';
import { inWater } from './river';
import { inBasin } from './docks';
import { LAYBYS, laybyRect } from './uptown';
import { inBay } from './crestmont';
import { AIRPORT_AREAS } from './airfield';
import { areaOfBlock, AREAS, type Character } from './seams';
import { BENDS, BEND_REACH, KERB_RUNS } from './outer';
import { BUILT, baked } from './baked';
import type { Cover } from './palette';
import { TILE, tileKey, type Rect } from './tiles';
import type { Box } from './solids';

/** The slab's height (world.ts `SLAB`) */
const SLAB = 0.15;
/** How far out the slab eases down to the ground (tiles) */
export const RAMP = 1.1;
/** How far past a block's edge is looked at to see what it meets */
export const OUT = 1.2;
/** The step along an edge (tiles) */
const STEP = 1;
/** How far out the land past a verge must be open: past its bank's foot and the hedge or wall along it */
const CLEAR = RAMP + 0.65;
/** Stretches shorter than this are left as they are (a corner's worth) */
export const MIN_RUN = 2;

/** What stands along a verge's foot */
export type Edge = 'hedge' | 'wall' | null;
/** A hedge's or a wall's size: its width and height, and the gaps in it */
export const EDGE = { hedge: { w: 0.5, h: 0.55 }, wall: { w: 0.35, h: 0.45 } } as const;
export const GAP_EVERY = 12;
export const GAP = 1.8;

/** By what a block is like: the edge along its foot, and the bank's cover */
const BY_CHARACTER: Record<Character | 'walk', { edge: Edge; cover: Cover }> = {
  core: { edge: 'wall', cover: 'lawn' },
  town: { edge: 'hedge', cover: 'lawn' },
  walk: { edge: 'hedge', cover: 'lawn' },
  towers: { edge: 'wall', cover: 'lawn' },
  retail: { edge: 'wall', cover: 'lawn' },
  park: { edge: null, cover: 'lawn' },
  homes: { edge: null, cover: 'garden' },
  estates: { edge: 'hedge', cover: 'planted' },
  grit: { edge: null, cover: 'worn' },
  industry: { edge: null, cover: 'gravel' },
  airport: { edge: null, cover: 'dryGrass' },
  sport: { edge: null, cover: 'lawn' },
};

export interface Verge {
  /** The block it's the edge of */
  block: string;
  /** Its area (seams.ts), or 'walk' for a sidewalk-only strip (the bends' kerbs) */
  area: string;
  /** Along the slab's edge, a to b, and the way out from it (unit) */
  a: Pt;
  b: Pt;
  n: Pt;
  edge: Edge;
  cover: Cover;
  /** How far along its run a is (a bend's verges carry on from each other: their hedges' gaps keep their spacing) */
  s0: number;
}

/* ---------- What a point past an edge is ---------- */

interface Seg {
  a: Pt;
  b: Pt;
  r: number;
}
/** Every plan street's stretches (not the highway's: `fromHighway()` measures it), filed by tile */
const STREET_SEGS = new Map<string, Seg[]>();
const fileBox = <T>(into: Map<string, T[]>, box: Rect, item: T) => {
  for (let j = Math.floor(box[1] / TILE); j <= Math.floor(box[3] / TILE); j++)
    for (let i = Math.floor(box[0] / TILE); i <= Math.floor(box[2] / TILE); i++) {
      const k = tileKey(i, j);
      (into.get(k) ?? into.set(k, []).get(k)!).push(item);
    }
};
for (const s of PLAN.streets) {
  if (s.kind === 'highway') continue;
  const pts = s.loop ? [...s.pts, s.pts[0]] : s.pts;
  for (let i = 1; i < pts.length; i++) {
    const seg = { a: pts[i - 1], b: pts[i], r: s.half };
    fileBox(STREET_SEGS, [Math.min(seg.a[0], seg.b[0]) - s.half, Math.min(seg.a[1], seg.b[1]) - s.half, Math.max(seg.a[0], seg.b[0]) + s.half, Math.max(seg.a[1], seg.b[1]) + s.half], seg);
  }
}
const SLABS = new Map<string, { poly: Pt[]; box: Rect }[]>();
for (const poly of PLAN.slabs) {
  const xs = poly.map((p) => p[0]);
  const zs = poly.map((p) => p[1]);
  const box: Rect = [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
  fileBox(SLABS, box, { poly, box });
}
const key = (p: Pt) => tileKey(Math.floor(p[0] / TILE), Math.floor(p[1] / TILE));
const segDist = (p: Pt, a: Pt, b: Pt) => {
  const vx = b[0] - a[0];
  const vz = b[1] - a[1];
  const l2 = vx * vx + vz * vz;
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / l2)) : 0;
  return Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vz * t);
};
const LAYBY_RECTS = LAYBYS.map(laybyRect);
const inRect = (r: Rect, p: Pt, m = 0) => p[0] > r[0] - m && p[0] < r[2] + m && p[1] > r[1] - m && p[1] < r[3] + m;

/** Whether p is open land: off every street, lay-by and bay, every slab, the water, the basin and the airport */
export function openAt(p: Pt) {
  if (fromHighway(p[0], p[1]) < HIGHWAY_HALF + 0.3) return false;
  for (const s of STREET_SEGS.get(key(p)) ?? []) if (segDist(p, s.a, s.b) < s.r + 0.3) return false;
  for (const s of SLABS.get(key(p)) ?? []) if (inRect(s.box, p) && inPoly(s.poly, p)) return false;
  if (LAYBY_RECTS.some((r) => inRect(r, p, 0.3)) || inBay(p[0], p[1], 0.3)) return false;
  if (inWater(p[0], p[1], -0.5) || inBasin(p[0], p[1], 0.5)) return false;
  if (AIRPORT_AREAS.some((r) => inRect(r, p))) return false;
  return true;
}

/* ---------- The verges ---------- */

function findVerges(): Verge[] {
  const out: Verge[] = [];
  PLAN.blocks.forEach((blk, bi) => {
    const slab = PLAN.slabs[bi];
    const area = areaOfBlock(blk) ?? 'walk';
    const character = area === 'walk' ? 'walk' : AREAS.find((a) => a.id === area)!.character;
    const { edge, cover } = BY_CHARACTER[character];
    for (let i = 0; i < slab.length; i++) {
      const a = slab[i];
      const c = slab[(i + 1) % slab.length];
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      if (len < MIN_RUN) continue;
      const d: Pt = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
      // The way out: whichever side of the edge's middle isn't the slab
      let n: Pt = [d[1], -d[0]];
      const mid: Pt = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
      if (inPoly(slab, [mid[0] + n[0] * 0.3, mid[1] + n[1] * 0.3])) n = [-n[0], -n[1]];
      // A tile at a time along it: open past it or not; open stretches are verges (their ends kept a step in from the corners)
      let from = -1;
      const close = (to: number) => {
        const [t0, t1] = [Math.max(from, 0.5), Math.min(to, len - 0.5)];
        if (t1 - t0 >= MIN_RUN) out.push({ block: blk.id, area, a: [a[0] + d[0] * t0, a[1] + d[1] * t0], b: [a[0] + d[0] * t1, a[1] + d[1] * t1], n, edge, cover, s0: 0 });
        from = -1;
      };
      for (let t = 0; t <= len; t += STEP) {
        const at = Math.min(t, len);
        const p: Pt = [a[0] + d[0] * at + n[0] * OUT, a[1] + d[1] * at + n[1] * OUT];
        // (and the ramp's foot too: nothing of it on a street)
        const foot: Pt = [a[0] + d[0] * at + n[0] * CLEAR, a[1] + d[1] * at + n[1] * CLEAR];
        const open = openAt(p) && openAt(foot);
        if (open && from < 0) from = at;
        else if (!open && from >= 0) close(at - STEP);
      }
      if (from >= 0) close(len);
    }
  });
  // The bends' outer sidewalks (outer.ts: the Parkway and the Southside Loop, short kerb pieces along a curve): a verge
  // a piece, out from the bend's centre, wherever it faces open land
  const { edge, cover } = BY_CHARACTER.town;
  BENDS.forEach((bend, bi) => {
    let s = 0;
    for (let i = 1; i < bend.pts.length; i++) {
      const [p, q] = [bend.pts[i - 1], bend.pts[i]];
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (KERB_RUNS[bi][i - 1] && len > 0) {
        let n: Pt = [-(q[1] - p[1]) / len, (q[0] - p[0]) / len];
        const mid: Pt = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        if (n[0] * (mid[0] - bend.centre[0]) + n[1] * (mid[1] - bend.centre[1]) < 0) n = [-n[0], -n[1]];
        const a: Pt = [p[0] + n[0] * BEND_REACH, p[1] + n[1] * BEND_REACH];
        const b: Pt = [q[0] + n[0] * BEND_REACH, q[1] + n[1] * BEND_REACH];
        // (open past it all along: at both ends and the middle, out to the edge's look and the bank's foot)
        const open = [0, 0.5, 1].every((t) => {
          const m: Pt = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
          return openAt([m[0] + n[0] * OUT, m[1] + n[1] * OUT]) && openAt([m[0] + n[0] * CLEAR, m[1] + n[1] * CLEAR]);
        });
        if (open)
          out.push({ block: `bend-${bend.id}`, area: 'walk', a, b, n, edge, cover, s0: s });
      }
      s += len;
    }
  });
  // (rounded: what the page carries, the same as what's worked out here)
  const r = (v: number) => Math.round(v * 1000) / 1000 + 0;
  return out.map((v) => ({ ...v, a: [r(v.a[0]), r(v.a[1])], b: [r(v.b[0]), r(v.b[1])], n: [r(v.n[0]), r(v.n[1])], s0: r(v.s0) }));
}
/** Worked out when the site is built (baked.ts): the boot carries the list, not the search */
export const VERGES: Verge[] = baked('verges', BUILT ? undefined : findVerges);

/* ---------- Standing on them ---------- */

const BY_TILE = new Map<string, Verge[]>();
for (const v of VERGES) {
  const xs = [v.a[0], v.b[0], v.a[0] + v.n[0] * RAMP, v.b[0] + v.n[0] * RAMP];
  const zs = [v.a[1], v.b[1], v.a[1] + v.n[1] * RAMP, v.b[1] + v.n[1] * RAMP];
  fileBox(BY_TILE, [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)], v);
}
/** The ground's height on a verge's bank at x, z (0 off every one): the slab's top at its edge, easing to the ground at its foot */
export function vergeY(x: number, z: number) {
  let y = 0;
  for (const v of BY_TILE.get(tileKey(Math.floor(x / TILE), Math.floor(z / TILE))) ?? []) {
    const dx = v.b[0] - v.a[0];
    const dz = v.b[1] - v.a[1];
    const l = Math.hypot(dx, dz);
    const along = ((x - v.a[0]) * dx + (z - v.a[1]) * dz) / l;
    if (along < 0 || along > l) continue;
    // (a hair inside the edge counts: the numbers are rounded to a millimetre)
    const out = (x - v.a[0]) * v.n[0] + (z - v.a[1]) * v.n[1];
    if (out < -0.02 || out > RAMP) continue;
    y = Math.max(y, SLAB * (1 - Math.max(0, out) / RAMP));
  }
  return y;
}

/* ---------- The hedges and walls ---------- */

/**
 * A verge's hedge or wall in pieces, [from, to] along it: a gap `GAP` wide in the middle of every `GAP_EVERY` along
 * its run (counted from its run's start, `s0`, so a bend's verges keep one spacing), pieces under `MIN_PIECE` left out
 */
export const MIN_PIECE = 0.4;
export function edgePieces(v: Verge): [number, number][] {
  if (!v.edge) return [];
  const l = Math.hypot(v.b[0] - v.a[0], v.b[1] - v.a[1]);
  const cuts: [number, number][] = [];
  for (let g = Math.floor(v.s0 / GAP_EVERY) * GAP_EVERY + GAP_EVERY / 2; g - GAP / 2 < v.s0 + l; g += GAP_EVERY) cuts.push([g - GAP / 2 - v.s0, g + GAP / 2 - v.s0]);
  const out: [number, number][] = [];
  let from = 0;
  for (const [c0, c1] of cuts) {
    if (c1 <= 0) continue;
    if (c0 > from) out.push([from, Math.min(c0, l)]);
    from = Math.max(from, c1);
    if (from >= l) break;
  }
  if (from < l) out.push([from, l]);
  return out.filter(([s0, s1]) => s1 - s0 > MIN_PIECE);
}

/** Where a piece of a verge's edge stands: its corners along the foot (a, b) and its middle line's offset out */
export function pieceLine(v: Verge, [s0, s1]: [number, number]) {
  const l = Math.hypot(v.b[0] - v.a[0], v.b[1] - v.a[1]);
  const d: Pt = [(v.b[0] - v.a[0]) / l, (v.b[1] - v.a[1]) / l];
  const off = RAMP + (v.edge ? EDGE[v.edge].w / 2 : 0) + 0.05;
  const at = (s: number): Pt => [v.a[0] + d[0] * s + v.n[0] * off, v.a[1] + d[1] * s + v.n[1] * off];
  return { a: at(s0), b: at(s1), d };
}

/** The hedges and walls as boxes (a box every tile or so along a slanting one) */
export const VERGE_SOLIDS: Box[] = VERGES.flatMap((v) => {
  if (!v.edge) return [];
  const { w, h } = EDGE[v.edge];
  return edgePieces(v).flatMap((piece) => {
    const { a, b } = pieceLine(v, piece);
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    // (straight along an axis: one box; slanting: a box a step)
    const axis = Math.abs(a[0] - b[0]) < 1e-6 || Math.abs(a[1] - b[1]) < 1e-6;
    const n = axis ? 1 : Math.max(1, Math.ceil(l / 0.8));
    const out: Box[] = [];
    for (let k = 0; k < n; k++) {
      const p: Pt = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n];
      const q: Pt = [a[0] + ((b[0] - a[0]) * (k + 1)) / n, a[1] + ((b[1] - a[1]) * (k + 1)) / n];
      const r = w / 2;
      out.push([Math.min(p[0], q[0]) - r, Math.min(p[1], q[1]) - r, Math.max(p[0], q[0]) + r, Math.max(p[1], q[1]) + r, h]);
    }
    return out;
  });
});
