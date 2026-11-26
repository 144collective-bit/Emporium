/**
 * Sunridge's greens between the cul-de-sacs (the improvement loop's J12, R3; the owner's call, 2026-11-26: no house
 * taken). The open land inside the courts' block (sunridge.ts `SUN_BLOCKS` "sun-3") opens onto Mesa Drive; from Saguaro
 * and Palo Verde Courts' turning circles a footpath runs across it to Mesa Drive's sidewalk (the "nowhere a dead end on
 * foot" rule), with bollards at each end; trees stand in groups on the greens and a bench beside each path. Ocotillo
 * Court's circle is boxed in by lots and keeps none. DOM-free, the chunk's (sunamenities3d.ts draws it;
 * tests/sungreens.test.ts).
 *
 * The paths are found, not drawn by hand: a search over the block's free land on a half-metre grid, the path's width and
 * a margin clear of every lot, from the far side of the circle (not back down beside the court) to Mesa Drive's kerb
 * line; then cut to as few straight runs as stay clear.
 */
import { BULB, COURTS, HALF, MESA, SUN_BLOCKS, distTo, inside, type Pt } from './sunridge';
import { LOTS, type Lot } from './sunridgelots';
import { WALK_W } from './layout';

type Box = [number, number, number, number, number];

export const GREEN = {
  /** The path's width (a ginnel's, between the yards' walls), and how far its edge keeps from a lot */
  pathW: 1.0,
  clear: 0.2,
  /** A tree's least distance from a lot and from a path's edge; the trees' size */
  treeLot: 2.4,
  treePath: 1.6,
  /** A bollard: its half-width and height; how far apart a pair stands */
  bollard: { half: 0.09, h: 0.8, gap: 1.3 },
} as const;
/** The courts that get a path (Ocotillo Court's circle is boxed in by lots) */
export const PATH_COURTS = ['sun-court-0', 'sun-court-2'] as const;

const BLOCK = SUN_BLOCKS.find((b) => b.id === 'sun-3')!;
const ringOf = (l: Lot): Pt[] => [l.front[0], l.front[1], l.back[1], l.back[0]];
const LOT_RINGS = LOTS.filter((l) => l.block === BLOCK.id).map(ringOf);
/** How far a point is from the nearest lot (0 inside one) */
export const lotDist = (p: Pt) => Math.min(...LOT_RINGS.map((r) => (inside(r, p) ? 0 : distTo(r, p, true))));

const S = 0.5;
const xs = BLOCK.poly.map((p) => p[0]);
const zs = BLOCK.poly.map((p) => p[1]);
const X0 = Math.min(...xs);
const Z0 = Math.min(...zs);
const NX = Math.ceil((Math.max(...xs) - X0) / S) + 1;
const NZ = Math.ceil((Math.max(...zs) - Z0) / S) + 1;
const at = (i: number, j: number): Pt => [X0 + i * S, Z0 + j * S];
/** Each cell's distance to the nearest lot (-1: out of the block) */
const ROOM: number[] = (() => {
  const out = new Array<number>(NX * NZ).fill(-1);
  for (let i = 0; i < NX; i++)
    for (let j = 0; j < NZ; j++) {
      const p = at(i, j);
      if (inside(BLOCK.poly, p) && distTo(BLOCK.poly, p, true) > 0.4) out[i * NZ + j] = lotDist(p);
    }
  return out;
})();
const HALF_W = GREEN.pathW / 2;
/** Where the paths meet the sidewalks: their back edge (Mesa Drive's, the circle's) */
const MESA_KERB = HALF + WALK_W + 0.02;

/** A straight run clear of the lots all along (but its first `skip`, at a sidewalk, and by Mesa Drive's) */
const clearRun = (a: Pt, c: Pt, skip = 0) => {
  const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const n = Math.max(1, Math.ceil(L / 0.25));
  for (let k = 0; k <= n; k++) {
    if ((L * k) / n < skip) continue;
    const p: Pt = [a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n];
    if (lotDist(p) < HALF_W + GREEN.clear - 1e-6 && distTo(MESA.pts, p) > MESA_KERB + 0.6) return false;
  }
  return true;
};

function pathFor(courtId: string): Pt[] {
  const c = COURTS.find((q) => q.id === courtId)!;
  const end = c.pts[c.pts.length - 1];
  const stem = c.pts.slice(0, -1);
  const free = (k: number, p: Pt) => ROOM[k] >= HALF_W + GREEN.clear && distTo(stem, p) > HALF + 4;
  const from = new Int32Array(NX * NZ).fill(-2);
  const q: number[] = [];
  for (let i = 0; i < NX; i++)
    for (let j = 0; j < NZ; j++) {
      const k = i * NZ + j;
      const p = at(i, j);
      const r = Math.hypot(p[0] - end[0], p[1] - end[1]);
      const rim: Pt = [end[0] + ((p[0] - end[0]) / r) * (BULB + WALK_W + 0.02), end[1] + ((p[1] - end[1]) / r) * (BULB + WALK_W + 0.02)];
      // (a spot just off the circle, reached straight out from its sidewalk)
      if (r < BULB + WALK_W + 2.5 && free(k, p) && clearRun(rim, p, 1)) {
        from[k] = -1;
        q.push(k);
      }
    }
  let goal = -1;
  for (let h = 0; h < q.length && goal < 0; h++) {
    const k = q[h];
    const [i, j] = [Math.floor(k / NZ), k % NZ];
    if (distTo(MESA.pts, at(i, j)) <= MESA_KERB + 0.5) goal = k;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const [a, b] = [i + di, j + dj];
      if (a < 0 || b < 0 || a >= NX || b >= NZ) continue;
      const n = a * NZ + b;
      if (from[n] !== -2 || !free(n, at(a, b))) continue;
      from[n] = k;
      q.push(n);
    }
  }
  if (goal < 0) throw new Error(`${courtId}: no way across the green`);
  const cells: Pt[] = [];
  for (let k = goal; k >= 0; k = from[k]) cells.push(at(Math.floor(k / NZ), k % NZ));
  cells.reverse();
  // (from the circle's sidewalk, out along its radius, to Mesa Drive's kerb line)
  const s = cells[0];
  const r = Math.hypot(s[0] - end[0], s[1] - end[1]);
  const start: Pt = [end[0] + ((s[0] - end[0]) / r) * (BULB + WALK_W + 0.02), end[1] + ((s[1] - end[1]) / r) * (BULB + WALK_W + 0.02)];
  const g = cells[cells.length - 1];
  let best = 0;
  for (let i = 1; i < MESA.pts.length; i++) if (distTo([MESA.pts[i - 1], MESA.pts[i]], g) < distTo([MESA.pts[best], MESA.pts[best + 1] ?? MESA.pts[best]], g)) best = i - 1;
  const [m0, m1] = [MESA.pts[best], MESA.pts[best + 1]];
  const [dx, dz] = [m1[0] - m0[0], m1[1] - m0[1]];
  const L = Math.hypot(dx, dz);
  const f = Math.max(0, Math.min(1, ((g[0] - m0[0]) * dx + (g[1] - m0[1]) * dz) / (L * L)));
  const foot: Pt = [m0[0] + dx * f, m0[1] + dz * f];
  const d = Math.hypot(g[0] - foot[0], g[1] - foot[1]);
  const kerb: Pt = [foot[0] + ((g[0] - foot[0]) / d) * MESA_KERB, foot[1] + ((g[1] - foot[1]) / d) * MESA_KERB];
  const all = [start, ...cells, kerb];
  // As few straight runs as stay clear
  const out: Pt[] = [all[0]];
  let i = 0;
  while (i < all.length - 1) {
    let j = all.length - 1;
    while (j > i + 1 && !clearRun(all[i], all[j], i === 0 ? 1 : 0)) j--;
    out.push(all[j]);
    i = j;
  }
  return out;
}

export interface GreenPath {
  court: string;
  pts: Pt[];
  /** Two bollards at each end, across the path */
  bollards: Pt[];
  bench: { x: number; z: number; yaw: number };
}
const len = (pts: Pt[]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
/** The point `d` along a line and its direction */
function along(pts: Pt[], d: number): { p: Pt; t: Pt } {
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (d <= l || i === pts.length - 1) {
      const t: Pt = [(pts[i][0] - pts[i - 1][0]) / l, (pts[i][1] - pts[i - 1][1]) / l];
      const f = Math.min(d, l);
      return { p: [pts[i - 1][0] + t[0] * f, pts[i - 1][1] + t[1] * f], t };
    }
    d -= l;
  }
  return { p: pts[0], t: [1, 0] };
}

export const GREEN_PATHS: GreenPath[] = PATH_COURTS.map((court) => {
  const pts = pathFor(court);
  const L = len(pts);
  const bollards: Pt[] = [];
  for (const d of [0.7, L - 0.7]) {
    const { p, t } = along(pts, d);
    for (const s of [-1, 1]) bollards.push([p[0] - t[1] * s * (GREEN.bollard.gap / 2), p[1] + t[0] * s * (GREEN.bollard.gap / 2)]);
  }
  // (the bench beside the path's middle, on the side with more room, facing it)
  const { p, t } = along(pts, L / 2);
  const off = HALF_W + 0.7;
  const sides = [1, -1].map((s): Pt => [p[0] - t[1] * s * off, p[1] + t[0] * s * off]);
  const at = lotDist(sides[0]) >= lotDist(sides[1]) ? sides[0] : sides[1];
  const yaw = Math.atan2(p[0] - at[0], p[1] - at[1]);
  return { court, pts, bollards, bench: { x: at[0], z: at[1], yaw } };
});

/** The trees: in groups of three or four on the greens, clear of the lots, the paths, the benches and Mesa Drive */
export const GREEN_TREES: { x: number; z: number; s: number }[] = (() => {
  let seed = 20261126;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const ok = (p: Pt) =>
    inside(BLOCK.poly, p) &&
    distTo(BLOCK.poly, p, true) > 1.5 &&
    lotDist(p) >= GREEN.treeLot &&
    GREEN_PATHS.every((g) => distTo(g.pts, p) >= HALF_W + GREEN.treePath && Math.hypot(g.bench.x - p[0], g.bench.z - p[1]) > 2) &&
    distTo(MESA.pts, p) > HALF + WALK_W + 3;
  // (the group's middles: the roomiest spots, at least 9 apart)
  const spots: Pt[] = [];
  for (let i = 0; i < NX; i += 2)
    for (let j = 0; j < NZ; j += 2) if (ROOM[i * NZ + j] >= GREEN.treeLot + 2.5 && ok(at(i, j))) spots.push(at(i, j));
  spots.sort((a, b) => lotDist(b) - lotDist(a));
  const mids: Pt[] = [];
  for (const s of spots) if (mids.length < 6 && mids.every((m) => Math.hypot(m[0] - s[0], m[1] - s[1]) >= 9)) mids.push(s);
  const out: { x: number; z: number; s: number }[] = [];
  for (const m of mids) {
    const n = 3 + Math.floor(rnd() * 2);
    for (let k = 0, tries = 0; k < n && tries < 40; tries++) {
      const a = rnd() * Math.PI * 2;
      const r = k === 0 ? 0 : 1.6 + rnd() * 1.4;
      const p: Pt = [m[0] + Math.cos(a) * r, m[1] + Math.sin(a) * r];
      if (!ok(p) || out.some((t) => Math.hypot(t.x - p[0], t.z - p[1]) < 1.6)) continue;
      out.push({ x: p[0], z: p[1], s: 0.85 + rnd() * 0.35 });
      k++;
    }
  }
  return out;
})();

/** What's solid: the trunks, the benches, the bollards (joined to the grids when the chunk loads) */
export const GREEN_SOLIDS: Box[] = [
  ...GREEN_TREES.map((t): Box => [t.x - 0.12 * t.s, t.z - 0.12 * t.s, t.x + 0.12 * t.s, t.z + 0.12 * t.s, 1.3 * t.s]),
  ...GREEN_PATHS.map((g): Box => [g.bench.x - 0.7, g.bench.z - 0.7, g.bench.x + 0.7, g.bench.z + 0.7, 0.8]),
  ...GREEN_PATHS.flatMap((g) => g.bollards.map(([x, z]): Box => [x - 0.09, z - 0.09, x + 0.09, z + 0.09, 0.8])),
];
