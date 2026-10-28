/*
 * The outer districts' lawns dressed (`dressing()`, DOM-free, tested in
 * tests/outerdress.test.ts; drawn by outerdress3d.ts): the landscaping
 * between the pads, the squares and the pocket parks on each of outer.ts's
 * blocks.
 *
 * - **Paths**: a paved walk from each plot's pad out to its
 *   block's sidewalk the shortest clear way, and from each small square's
 *   ways in (north and south) and each pocket park.
 * - **Beds**: round flower beds with a stone edge in the blocks' corners, and
 *   small ones either side of a walk where it meets the sidewalk, where clear.
 * - **Furniture**: benches either side of a path's middle facing
 *   it, a bin by the first; a picnic table on each block's biggest clearing.
 * - **Trees**: outer.ts's lawn trees kept off all of that, and
 *   a ring of shrubs at some of their feet (drawn, near only).
 *
 * None of it is solid (the beds are low, the benches and tables small, as the
 * pocket parks' are); everything keeps off what is (`SOLIDS`), the pads, the
 * squares, the parks, the Fight Club's lot and Liberty Bridge.
 */
import { FIGHT_CLUB } from './fightsite';
import { LIBERTY_RECTS } from './liberty';
import { LAWN_TREES, OUTER_BLOCKS, OUTER_PARKS, OUTER_SQUARES, PADS, edgeDist, inside, type Pt, type Rect } from './outer';

/** A walk's width, and how far out its benches stand from its middle */
export const PATH_W = 1.4;
export const BENCH_OUT = PATH_W / 2 + 0.55;
export interface DressPath {
  block: string;
  a: Pt;
  b: Pt;
}
export interface Bed {
  block: string;
  at: Pt;
  r: number;
  /** Which flowers (a colour scheme) */
  kind: number;
}
export interface Furniture {
  block: string;
  kind: 'bench' | 'bin' | 'picnic';
  at: Pt;
  /** Facing (0 is +z) */
  ry: number;
}

const FIGHT_LOT: Rect = [FIGHT_CLUB.x0, FIGHT_CLUB.z0, FIGHT_CLUB.x1, FIGHT_CLUB.z1];
const inRect = (r: Rect, [x, z]: Pt, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
const segDist = (a: Pt, b: Pt, p: Pt) => {
  const vx = b[0] - a[0];
  const vz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / (vx * vx + vz * vz || 1)));
  return Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vz * t);
};
/** Where a ray from p along d leaves a convex outline (its distance), or Infinity */
function exit(poly: Pt[], p: Pt, d: Pt) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j];
    const [ex, ez] = [poly[i][0] - ax, poly[i][1] - az];
    const den = d[0] * ez - d[1] * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((ax - p[0]) * ez - (az - p[1]) * ex) / den;
    const u = ((ax - p[0]) * d[1] - (az - p[1]) * d[0]) / den;
    if (t > 1e-6 && u >= -1e-6 && u <= 1 + 1e-6) best = Math.min(best, t);
  }
  return best;
}

/** What the dressing keeps off on a block: its pads, squares, parks, the Fight Club's lot, Liberty Bridge */
function taken(block: (typeof OUTER_BLOCKS)[number]): Rect[] {
  return [
    ...PADS.filter((p) => block.pads.includes(p.id)).map((p) => p.rect),
    ...OUTER_SQUARES.filter((s) => s.block === block.id).map((s) => s.rect),
    ...OUTER_PARKS.filter((s) => s.block === block.id).map((s) => s.rect),
    FIGHT_LOT,
    ...LIBERTY_RECTS,
  ];
}

interface Dressed {
  paths: DressPath[];
  beds: Bed[];
  furniture: Furniture[];
}
/**
 * A block's dressing. `solid` says whether a point is on something solid (the city's SOLIDS, passed in so
 * this stays light for the tests and the boot alike)
 */
function dressBlock(block: (typeof OUTER_BLOCKS)[number], i: number, solid: (p: Pt, m: number) => boolean): Dressed {
  const poly = block.poly;
  const off = taken(block);
  const paths: DressPath[] = [];
  /** Is a point on open lawn (inside, in from the edge by m, clear of what's taken and solid) */
  const open = (p: Pt, m: number, except?: Rect) => inside(poly, p) && edgeDist(poly, p) > m && off.every((r) => r === except || !inRect(r, p, m)) && !solid(p, m);
  /** A walk from a rectangle's side out to the block's edge: each side's middle tried, the shortest clear one(s) kept */
  const walkFrom = (r: Rect, want: number, sides = [0, 1, 2, 3]) => {
    const [x0, z0, x1, z1] = r;
    const tries = sides
      .map((s) => {
        const [a, d]: [Pt, Pt] = s === 0 ? [[(x0 + x1) / 2, z0], [0, -1]] : s === 1 ? [[x1, (z0 + z1) / 2], [1, 0]] : s === 2 ? [[(x0 + x1) / 2, z1], [0, 1]] : [[x0, (z0 + z1) / 2], [-1, 0]];
        const len = exit(poly, a, d);
        if (!isFinite(len) || len < 0.6 || len > 26) return null;
        const b: Pt = [a[0] + d[0] * len, a[1] + d[1] * len];
        // (clear all along, both edges of the walk, but where it leaves its rectangle)
        for (let t = 0.5; t < len - 0.2; t += 0.5)
          for (const w of [-PATH_W / 2, 0, PATH_W / 2]) {
            const p: Pt = [a[0] + d[0] * t - d[1] * w, a[1] + d[1] * t + d[0] * w];
            if (off.some((q) => q !== r && inRect(q, p, 0.2)) || solid(p, 0.1)) return null;
          }
        return { a, b, len };
      })
      .filter((t): t is { a: Pt; b: Pt; len: number } => !!t)
      .sort((p, q) => p.len - q.len);
    for (const t of tries.slice(0, want)) paths.push({ block: block.id, a: t.a, b: t.b });
  };
  for (const p of PADS) if (p.kind === 'plot' && block.pads.includes(p.id)) walkFrom(p.rect, 1);
  // (the squares' ways in are north and south, where their bollards stand)
  for (const s of OUTER_SQUARES) if (s.block === block.id) walkFrom(s.rect, 2, [0, 2]);
  for (const s of OUTER_PARKS) if (s.block === block.id) walkFrom(s.rect, 1);
  const nearPath = (p: Pt, m: number) => paths.some((q) => segDist(q.a, q.b, p) < PATH_W / 2 + m);

  // Beds in the corners: along the bisector, in from the corner
  const beds: Bed[] = [];
  poly.forEach((c, k) => {
    const p = poly[(k + poly.length - 1) % poly.length];
    const n = poly[(k + 1) % poly.length];
    const u: Pt = [p[0] - c[0], p[1] - c[1]];
    const v: Pt = [n[0] - c[0], n[1] - c[1]];
    const lu = Math.hypot(...u);
    const lv = Math.hypot(...v);
    if (lu < 4 || lv < 4) return;
    const cos = (u[0] * v[0] + u[1] * v[1]) / (lu * lv);
    // (a real corner, not a bend's gentle turn)
    if (cos > Math.cos((140 * Math.PI) / 180)) {
      const bis: Pt = [u[0] / lu + v[0] / lv, u[1] / lu + v[1] / lv];
      const lb = Math.hypot(...bis);
      const r = 1.25;
      const at: Pt = [c[0] + (bis[0] / lb) * 3, c[1] + (bis[1] / lb) * 3];
      if (open(at, r + 0.5) && !nearPath(at, r + 0.4)) beds.push({ block: block.id, at, r, kind: (i + k) % 4 });
    }
  });
  // And a small bed either side of each walk where it meets the sidewalk
  for (const q of paths) {
    const len = Math.hypot(q.b[0] - q.a[0], q.b[1] - q.a[1]);
    if (len < 3) continue;
    const d: Pt = [(q.b[0] - q.a[0]) / len, (q.b[1] - q.a[1]) / len];
    for (const s of [-1, 1]) {
      const r = 0.7;
      const at: Pt = [q.b[0] - d[0] * 1.3 - d[1] * s * (PATH_W / 2 + r + 0.35), q.b[1] - d[1] * 1.3 + d[0] * s * (PATH_W / 2 + r + 0.35)];
      if (open(at, r + 0.25) && !paths.some((o) => segDist(o.a, o.b, at) < PATH_W / 2 + r + 0.2) && beds.every((b) => Math.hypot(at[0] - b.at[0], at[1] - b.at[1]) > b.r + r + 0.4)) beds.push({ block: block.id, at, r, kind: (i + 2) % 4 });
    }
  }
  const nearBed = (p: Pt, m: number) => beds.some((b) => Math.hypot(p[0] - b.at[0], p[1] - b.at[1]) < b.r + m);

  // Benches either side of each long enough walk's middle, facing it; a bin by the first
  const furniture: Furniture[] = [];
  for (const q of paths) {
    const len = Math.hypot(q.b[0] - q.a[0], q.b[1] - q.a[1]);
    if (len < 4) continue;
    const d: Pt = [(q.b[0] - q.a[0]) / len, (q.b[1] - q.a[1]) / len];
    const mid: Pt = [(q.a[0] + q.b[0]) / 2, (q.a[1] + q.b[1]) / 2];
    let first = true;
    for (const s of [-1, 1]) {
      const at: Pt = [mid[0] - d[1] * s * BENCH_OUT, mid[1] + d[0] * s * BENCH_OUT];
      if (!open(at, 0.7) || nearBed(at, 0.5) || paths.some((o) => o !== q && segDist(o.a, o.b, at) < PATH_W / 2 + 0.6)) continue;
      // (facing the walk: from the bench towards its middle)
      furniture.push({ block: block.id, kind: 'bench', at, ry: Math.atan2(mid[0] - at[0], mid[1] - at[1]) });
      if (first) {
        const bin: Pt = [at[0] + d[0] * 0.95, at[1] + d[1] * 0.95];
        if (open(bin, 0.4)) furniture.push({ block: block.id, kind: 'bin', at: bin, ry: 0 });
        first = false;
      }
    }
  }
  // A picnic table on the block's biggest clearing (clear of everything by 2.6 at least)
  const xs = poly.map((p) => p[0]);
  const zs = poly.map((p) => p[1]);
  let best: { at: Pt; room: number } | null = null;
  for (let x = Math.min(...xs) + 2; x < Math.max(...xs) - 2; x += 1)
    for (let z = Math.min(...zs) + 2; z < Math.max(...zs) - 2; z += 1) {
      const at: Pt = [x, z];
      if (!open(at, 2.6) || nearPath(at, 2) || nearBed(at, 1.5) || furniture.some((f) => Math.hypot(f.at[0] - x, f.at[1] - z) < 3)) continue;
      const room = Math.min(edgeDist(poly, at), ...off.map((r) => Math.max(r[0] - x, x - r[2], r[1] - z, z - r[3])));
      if (!best || room > best.room + 1e-6) best = { at, room };
    }
  if (best) furniture.push({ block: block.id, kind: 'picnic', at: best.at, ry: (i % 2) * (Math.PI / 2) });
  return { paths, beds, furniture };
}

/** Dress every block (SOLIDS passed in as a test of a point with a margin); computed once */
export function dressing(solid: (p: Pt, m: number) => boolean) {
  const all = OUTER_BLOCKS.map((b, i) => dressBlock(b, i, solid));
  const paths = all.flatMap((d) => d.paths);
  const beds = all.flatMap((d) => d.beds);
  const furniture = all.flatMap((d) => d.furniture);
  // The lawn trees kept off the walks, the beds and the furniture
  const trees = LAWN_TREES.filter(
    (t) =>
      !paths.some((q) => segDist(q.a, q.b, t) < PATH_W / 2 + 0.9) &&
      !beds.some((b) => Math.hypot(t[0] - b.at[0], t[1] - b.at[1]) < b.r + 0.6) &&
      !furniture.some((f) => Math.hypot(t[0] - f.at[0], t[1] - f.at[1]) < (f.kind === 'picnic' ? 2.2 : 0.9))
  );
  return { paths, beds, furniture, trees };
}
