/*
 * Westlake Park's walks, walls and gardens (the north side's stage 3,
 * docs/north-plan.md, the owner's picks), free of the DOM and of scene code,
 * tested in tests/gardens.test.ts; drawn by gardens3d.ts (the park's chunk).
 * The park's own numbers (its blocks, paths, gates, the lake and the
 * terraces) are westlake.ts.
 *
 * - **The walks** (`MAIN_WALKS`: the ring walk, the lake loop and the Mall)
 *   are paved with raised stone kerbs along both edges (`KERBS`, `KERB`);
 *   every other path is gravel with a flush stone edge (`EDGES`, `EDGE_W`).
 *   Both break wherever another path, the jetty or a terrace meets them.
 * - **The park's edge** has a low stone wall round its block (`WALLS`,
 *   `WALL`), broken at the gates and wherever a walk goes out.
 * - **The formal garden** on the stadium's old site (`GARDEN_SITE`): a low
 *   stone wall round it (`GARDEN_WALLS`, open at the Mall, the cross walk
 *   and the garden's own two walks), the Mall up its middle, the cross walk
 *   (`GARDEN_Z`) and two walks either side (`GARDEN_XS`, westlake.ts) meeting
 *   at two round places (`ROUNDS`) with a fountain in each (`FOUNTAIN`);
 *   between the walks eight parterres (`PARTERRES`): a low clipped hedge
 *   round each (`hedge`, open on its walk's side), a gravel border, the
 *   flower bed (`bed`, in bands of colour) and a topiary cone in its middle;
 *   benches round the fountains and along the Mall (`GARDEN_BENCHES`),
 *   urns on plinths in its corners (`URNS`), lanterns (`GARDEN_LAMPS`) and
 *   a few people (`GARDEN_PEOPLE`).
 * - **Flower beds** in low stone-walled planters: oblong ones along the
 *   Mall (`MALL_BEDS`), round ones where the paths meet the main walks and
 *   along the ring walk and the lake loop (`PLANTERS`).
 * - The lakeside terraces are westlake.ts's (`TERRACES`: walkable).
 *
 * `GARDEN_SOLIDS` (in solids.ts `SOLIDS`): the walls, the hedges, the
 * fountains, the urns and the planters. The kerbs and edges aren't solid.
 */
import { offsetLine } from './streetplan';
import {
  BENCHES,
  BIG,
  BOATHOUSE,
  GARDEN_SITE,
  GARDEN_XS,
  GARDEN_Z,
  GATES,
  JETTY,
  LAKE_C,
  MALL,
  PARK_LAMPS,
  PARK_TREES,
  PATHS,
  PIER,
  ZS,
  distToLine,
  inLake,
  inset,
  nearTerrace,
  onPath,
  type ParkPath,
  type Pt,
  type Rect,
} from './westlake';
import type { Box } from './solids';

/** The lawns' slab (world.ts SLAB): everything here stands on it */
const SLAB = 0.15;

/* ---------- Lines ---------- */

/** A polyline (closed if `loop`) with a point about every `step` */
export function dense(pts: Pt[], step: number, loop = false): Pt[] {
  const src = loop ? [...pts, pts[0]] : pts;
  const out: Pt[] = [src[0]];
  for (let i = 1; i < src.length; i++) {
    const [a, b] = [src[i - 1], src[i]];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  if (loop) out.pop();
  return out;
}
/** A line offset `d` to one side (closed lines mitred round their seam) */
function offset(pts: Pt[], d: number, loop: boolean): Pt[] {
  if (!loop) return offsetLine(pts, d);
  return offsetLine([pts.at(-1)!, ...pts, pts[0]], d).slice(1, -1);
}
/** Cut a line into runs where `keep` holds (a closed one starts where a run breaks, so none wraps) */
function runs(pts: Pt[], keep: (p: Pt) => boolean, loop: boolean, min = 2): Pt[][] {
  const yes = pts.map(keep);
  const n = pts.length;
  if (loop && yes.every(Boolean)) return [[...pts, pts[0]]];
  const start = loop ? Math.max(0, yes.findIndex((y, i) => y && !yes[(i - 1 + n) % n])) : 0;
  const out: Pt[][] = [];
  let cur: Pt[] = [];
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    if (yes[i]) cur.push(pts[i]);
    else if (cur.length) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out.filter((r) => r.length >= min);
}
const inRect = (r: Rect, p: Pt, m = 0) => p[0] > r[0] - m && p[0] < r[2] + m && p[1] > r[1] - m && p[1] < r[3] + m;
const hyp = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/* ---------- The walks: paved with kerbs, or gravel with a flush edge ---------- */

/** The formal garden's round places (where its walks cross the cross walk), declared early for the walks' edges */
const ROUND_AT: Pt[] = GARDEN_XS.map((x) => [x, GARDEN_Z]);
const ROUND_R = 4.6;

/** The main walks, paved, kerbed both sides */
export const MAIN_WALKS = ['ring', 'loop', 'mall'];
export const isMain = (q: ParkPath) => MAIN_WALKS.includes(q.id);
/** The kerbs: their width (inside the walk's edge) and height over the paving */
export const KERB = { w: 0.14, h: 0.07 };
/** The small paths' flush stone edge (inside their edge) */
export const EDGE_W = 0.18;

/** Where a walk's edge mustn't run: across another path, the jetty, a terrace, or between a gate's piers */
function edgeCut(q: ParkPath, p: Pt) {
  if (PATHS.some((r) => r !== q && distToLine(r.pts, p, r.loop) < r.half + 0.15)) return true;
  if (Math.abs(p[0] - JETTY.x) < JETTY.half + 0.4 && p[1] > JETTY.z0 - 0.6 && p[1] < JETTY.z1) return true;
  // (and the garden's round places, which the walks open into)
  if (ROUND_AT.some(([x, z]) => Math.hypot(p[0] - x, p[1] - z) < ROUND_R + 0.1)) return true;
  return nearTerrace(p, 0.4);
}
/** Runs along both edges of each path, `inside` in from its edge, broken where something crosses */
function edgesOf(main: boolean, inside: number) {
  const out: { path: string; side: 1 | -1; pts: Pt[] }[] = [];
  for (const q of PATHS.filter((r) => isMain(r) === main)) {
    const line = dense(q.pts, 0.5, q.loop);
    for (const side of [1, -1] as const) {
      const edge = offset(line, side * (q.half - inside / 2), !!q.loop);
      // (inside a sharp corner the offset folds back on itself: those points are nearer the middle than the edge)
      const folded = (p: Pt) => distToLine(q.pts, p, q.loop) < q.half - inside / 2 - 0.05;
      for (const pts of runs(edge, (p) => !edgeCut(q, p) && !folded(p), !!q.loop)) out.push({ path: q.id, side, pts });
    }
  }
  return out;
}
/** The main walks' kerbs: each run's centre line */
export const KERBS = edgesOf(true, KERB.w);
/** The small paths' edges: each run's centre line */
export const EDGES = edgesOf(false, EDGE_W);

/* ---------- The park's edge wall ---------- */

/** A low stone wall with a coping: height over the slab, thickness, how far in from the block's edge */
export const WALL = { h: 0.55, w: 0.3, in: 0.45 };
/** Is a point on a block's edge in a gate's mouth (between its piers, to their middles) */
const inGate = (p: Pt) =>
  GATES.some((g) => {
    const across: Pt = [g.out[1], -g.out[0]];
    const [dx, dz] = [p[0] - g.at[0], p[1] - g.at[1]];
    return Math.abs(dx * across[0] + dz * across[1]) < g.half + 0.2 + PIER.w / 2 && Math.abs(dx * g.out[0] + dz * g.out[1]) < 1.5;
  });
/** The wall's runs round the park's block, broken at the gates and where a path goes out */
export const WALLS: Pt[][] = [BIG].flatMap((poly) => {
  const line = dense(inset(poly, WALL.in), 0.5, true);
  return runs(line, (p) => !inGate(p) && !onPath(p, WALL.w / 2 + 0.25), true, 3);
});

/* ---------- The formal garden ---------- */

/** The garden's wall (its centre line, in from the site's edge), and its openings: the Mall's, the walks' */
export const GARDEN_IN: Rect = [GARDEN_SITE[0] + 0.5, GARDEN_SITE[1] + 0.5, GARDEN_SITE[2] - 0.5, GARDEN_SITE[3] - 0.5];
const GARDEN_WALK = 1.1;
const CROSS = 1.2;
export const GARDEN_WALLS: Pt[][] = (() => {
  const [x0, z0, x1, z1] = GARDEN_IN;
  const ring: Pt[] = [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
  const open = (p: Pt) =>
    (Math.abs(p[1] - z0) < 0.01 || Math.abs(p[1] - z1) < 0.01 ? Math.abs(p[0] - MALL.x) < MALL.half + 0.35 || GARDEN_XS.some((x) => Math.abs(p[1] - z0) < 0.01 && Math.abs(p[0] - x) < GARDEN_WALK + 0.35) : false) ||
    ((Math.abs(p[0] - x0) < 0.01 || Math.abs(p[0] - x1) < 0.01) && Math.abs(p[1] - GARDEN_Z) < CROSS + 0.35);
  return runs(dense(ring, 0.25, true), (p) => !open(p), true, 3);
})();

/** The round places where each garden walk crosses the cross walk, and the fountain in each */
export const ROUNDS: { c: Pt; r: number }[] = ROUND_AT.map((c) => ({ c, r: ROUND_R }));
export const FOUNTAIN = { r: 2.2, h: 0.45, bowl: 0.7, top: 1.5 };

export interface Parterre {
  /** The hedge's centre line round it (closed), and the runs it's drawn in (open at its walk's side) */
  line: Pt[];
  hedge: Pt[][];
  /** The flower bed inside the gravel border (closed), its middle (the topiary cone) */
  bed: Pt[];
  mid: Pt;
  /** The middle of the hedge's gap, on its walk's side, and which way is in (x) */
  gap: Pt;
  inX: number;
}
/** The low hedge round each parterre: its height and thickness; the gravel border inside it; the bed's own rim */
export const HEDGE = { h: 0.55, w: 0.5 };
const BORDER = 1.1;

/** Signed area (the sign says which way round) */
const area = (poly: Pt[]) => poly.reduce((a, p, i) => a + p[0] * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * p[1], 0) / 2;
/** Turned to go round the same way as the park's blocks (what `inset()` pulls in) */
const sameWay = (poly: Pt[]) => (Math.sign(area(poly)) === Math.sign(area(BIG)) ? poly : [...poly].reverse());

export const PARTERRES: Parterre[] = (() => {
  const [gx0, gz0, gx1, gz1] = GARDEN_IN;
  const m = 0.8;
  const out: Parterre[] = [];
  for (const [ri, walkX] of GARDEN_XS.entries()) {
    const c = ROUNDS[ri].c;
    const R = ROUNDS[ri].r + 0.6;
    // Each side of the garden's walk: out to the garden's wall, or in to the Mall
    const sides: [number, number][] = walkX < MALL.x ? [[gx0 + m, walkX - GARDEN_WALK - m], [walkX + GARDEN_WALK + m, MALL.x - MALL.half - m]] : [[MALL.x + MALL.half + m, walkX - GARDEN_WALK - m], [walkX + GARDEN_WALK + m, gx1 - m]];
    for (const [x0, x1] of sides)
      for (const [z0, z1] of [
        [gz0 + m, GARDEN_Z - CROSS - m],
        [GARDEN_Z + CROSS + m, gz1 - m],
      ] as [number, number][]) {
        // The corner by the round place is cut by an arc round it
        const cx = Math.abs(x0 - c[0]) < Math.abs(x1 - c[0]) ? x0 : x1;
        const cz = Math.abs(z0 - c[1]) < Math.abs(z1 - c[1]) ? z0 : z1;
        const ox = cx === x0 ? x1 : x0;
        const oz = cz === z0 ? z1 : z0;
        // From the edge along x = cx (where it leaves the arc) round to the edge along z = cz
        const zA = c[1] + Math.sign(oz - c[1]) * Math.sqrt(Math.max(0, R * R - (cx - c[0]) ** 2));
        const xB = c[0] + Math.sign(ox - c[0]) * Math.sqrt(Math.max(0, R * R - (cz - c[1]) ** 2));
        const a0 = Math.atan2(zA - c[1], cx - c[0]);
        const a1 = Math.atan2(cz - c[1], xB - c[0]);
        let da = a1 - a0;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        const arc: Pt[] = Array.from({ length: 9 }, (_, k) => [c[0] + Math.cos(a0 + (da * k) / 8) * R, c[1] + Math.sin(a0 + (da * k) / 8) * R]);
        const line = sameWay([[ox, oz], [cx, oz], ...arc, [ox, cz]]);
        // The hedge open in the middle of its side along the garden's walk
        const gapX = Math.abs(x0 - walkX) < Math.abs(x1 - walkX) ? x0 : x1;
        const gap: Pt = [gapX, (z0 + z1) / 2];
        const hedge = runs(dense(line, 0.25, true), (p) => !(Math.abs(p[0] - gapX) < 0.05 && Math.abs(p[1] - gap[1]) < 0.9), true, 3);
        const bed = inset(line, HEDGE.w / 2 + BORDER);
        const mid: Pt = [bed.reduce((a, p) => a + p[0], 0) / bed.length, bed.reduce((a, p) => a + p[1], 0) / bed.length];
        out.push({ line, hedge, bed, mid, gap, inX: gapX === x0 ? 1 : -1 });
      }
  }
  return out;
})();

/** Benches round each fountain (on the diagonals, facing it) and along the Mall in the garden (facing the beds) */
export const GARDEN_BENCHES: { at: Pt; ry: number }[] = (() => {
  const out: { at: Pt; ry: number }[] = [];
  for (const { c } of ROUNDS)
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      const at: Pt = [c[0] + Math.cos(a) * 3.9, c[1] + Math.sin(a) * 3.9];
      out.push({ at, ry: Math.atan2(c[0] - at[0], c[1] - at[1]) });
    }
  for (const z of [GARDEN_IN[1] + 6, GARDEN_Z - 6, GARDEN_Z + 6, GARDEN_IN[3] - 6]) for (const side of [-1, 1]) out.push({ at: [MALL.x + side * (MALL.half + 0.45), z], ry: side > 0 ? Math.PI / 2 : -Math.PI / 2 });
  return out;
})();
/** Urns on plinths in the garden's corners, inside its wall */
export const URNS: Pt[] = (() => {
  const [x0, z0, x1, z1] = GARDEN_IN;
  return [
    [x0 + 1, z0 + 1],
    [x1 - 1, z0 + 1],
    [x0 + 1, z1 - 1],
    [x1 - 1, z1 - 1],
  ];
})();
export const URN = { plinth: 0.6, h: 0.6 };
/** Lanterns round the fountains, behind the benches (x, z, ry: the arm over the round place) */
export const GARDEN_LAMPS: [number, number, number][] = ROUNDS.flatMap(({ c }) =>
  [0, 1, 2, 3].map((k): [number, number, number] => {
    const a = Math.PI / 4 + (k * Math.PI) / 2 + 0.32;
    const [x, z] = [c[0] + Math.cos(a) * 4.5, c[1] + Math.sin(a) * 4.5];
    // (ry turns the arm, +x, towards the middle)
    return [x, z, Math.atan2(-(c[1] - z), c[0] - x)];
  })
);
/** People in the garden: some on the benches round the fountains, some looking at the beds (act, facing; y over the slab) */
export const GARDEN_PEOPLE: { x: number; z: number; y: number; ry: number; act: 'sit' | 'look' | 'chat' }[] = (() => {
  const out: { x: number; z: number; y: number; ry: number; act: 'sit' | 'look' | 'chat' }[] = [];
  GARDEN_BENCHES.slice(0, 8).forEach((b, i) => {
    if (i % 3 === 1) return;
    // (on the seat, a touch forward of its middle)
    out.push({ x: b.at[0] + Math.sin(b.ry) * 0.08, z: b.at[1] + Math.cos(b.ry) * 0.08, y: 0.3, ry: b.ry, act: 'sit' });
  });
  // At every other parterre's gap, on the garden's walk, looking in at the bed
  for (const p of PARTERRES.filter((_, i) => i % 2 === 0)) out.push({ x: p.gap[0] - p.inX * 0.9, z: p.gap[1] + 0.5, y: 0, ry: p.inX > 0 ? Math.PI / 2 : -Math.PI / 2, act: 'look' });
  return out;
})();

/* ---------- Flower beds along the walks ---------- */

/** The planters: a low stone wall round the soil (height over the slab, the wall's thickness) */
export const PLANTER = { h: 0.42, wall: 0.12 };
/** Is a spot clear for a planter of radius r: on the park, off every path, the lake, the lamps, benches, trees and courts */
function plantable(p: Pt, r: number, others: Pt[]) {
  if (onPath(p, r + 0.25)) return false;
  if (inLake(p[0], p[1], r + 0.5) || nearTerrace(p, r + 0.5)) return false;
  if (inRect(GARDEN_SITE, p, r + 0.5) || inRect(BOATHOUSE.rect, p, r + 1)) return false;
  if (PARK_LAMPS.some(([x, z]) => Math.hypot(x - p[0], z - p[1]) < r + 0.6)) return false;
  if (BENCHES.some((b) => hyp(b.at, p) < r + 1)) return false;
  if (PARK_TREES.some((t) => Math.hypot(t.x - p[0], t.z - p[1]) < r + 0.9)) return false;
  if (GATES.some((g) => hyp(g.at, p) < r + 2.5)) return false;
  if (WALLS.some((w) => w.some((q) => hyp(q, p) < r + WALL.w / 2 + 0.4))) return false;
  return others.every((o) => hyp(o, p) > 2 * r + 0.6);
}
/** Oblong beds along the Mall between its trees, either side (x0, z0, x1, z1) */
export const MALL_BEDS: Rect[] = (() => {
  const out: Rect[] = [];
  for (let z = ZS - 3 - 2.25; z > GARDEN_SITE[3] + 3; z -= 4.5)
    for (const side of [-1, 1]) {
      const x = MALL.x + side * (MALL.half + 1.45);
      const r: Rect = [x - 0.45, z - 1, x + 0.45, z + 1];
      const clear =
        PATHS.every((q) => q.id === 'mall' || distToLine(q.pts, [x, z], q.loop) > q.half + 1.6) &&
        PARK_LAMPS.every(([lx, lz]) => !inRect(r, [lx, lz], 0.4)) &&
        BENCHES.every((b) => !inRect(r, b.at, 0.6)) &&
        PARK_TREES.every((t) => !inRect(r, [t.x, t.z], 0.5));
      if (clear) out.push(r);
    }
  return out;
})();
/** Round planters: in pairs where a path comes into a main walk, at the corners where main walks cross, and along the ring walk and the lake loop */
export const PLANTERS: { at: Pt; r: number }[] = (() => {
  const out: { at: Pt; r: number }[] = [];
  const put = (p: Pt, r: number) => {
    if (plantable(p, r, out.map((o) => o.at))) out.push({ at: p, r });
  };
  const mains = PATHS.filter(isMain);
  // Where a small path ends on a main walk: one either side of its mouth
  for (const q of PATHS.filter((r) => !isMain(r)))
    for (const [e, n] of [
      [q.pts[0], q.pts[1]],
      [q.pts.at(-1)!, q.pts.at(-2)!],
    ] as [Pt, Pt][]) {
      const main = mains.find((m) => distToLine(m.pts, e, m.loop) < m.half + 0.6);
      if (!main) continue;
      const l = hyp(n, e) || 1;
      const d: Pt = [(n[0] - e[0]) / l, (n[1] - e[1]) / l];
      const back = main.half + 1.2;
      for (const s of [1, -1]) put([e[0] + d[0] * back - d[1] * s * (q.half + 1.1), e[1] + d[1] * back + d[0] * s * (q.half + 1.1)], 0.7);
    }
  // Along the ring walk (its inside) and the lake loop (its land side), now and then
  for (const [id, every] of [
    ['ring', 26],
    ['loop', 17],
  ] as const) {
    const q = mains.find((m) => m.id === id)!;
    const line = dense(q.pts, 0.5, true);
    const [a, b] = [offset(line, q.half + 1.25, true), offset(line, -(q.half + 1.25), true)];
    // (the side away from the water; into the big block)
    const pick = id === 'loop' ? (hyp(a[0], LAKE_C) > hyp(b[0], LAKE_C) ? a : b) : distToLine(BIG, a[0], true) > distToLine(BIG, b[0], true) ? a : b;
    for (let i = 0; i < pick.length; i += every * 2) put(pick[i], 0.7);
  }
  return out;
})();

/* ---------- Solids ---------- */

const SOLID_H = (h: number) => SLAB + h;
/** Boxes along a run: one for each straight stretch along x or z, small ones round the bends */
function runBoxes(run: Pt[], half: number, h: number): Box[] {
  const out: Box[] = [];
  let i = 0;
  while (i < run.length - 1) {
    // How far it runs straight along x (same z) or along z (same x)
    let j = i + 1;
    const alongX = Math.abs(run[j][1] - run[i][1]) < 1e-6;
    const alongZ = Math.abs(run[j][0] - run[i][0]) < 1e-6;
    if (alongX || alongZ) while (j + 1 < run.length && (alongX ? Math.abs(run[j + 1][1] - run[i][1]) < 1e-6 : Math.abs(run[j + 1][0] - run[i][0]) < 1e-6)) j++;
    const [a, b] = [run[i], run[j]];
    out.push([Math.min(a[0], b[0]) - half, Math.min(a[1], b[1]) - half, Math.max(a[0], b[0]) + half, Math.max(a[1], b[1]) + half, SOLID_H(h)]);
    i = j;
  }
  return out;
}
export const GARDEN_SOLIDS: Box[] = [
  ...WALLS.flatMap((r) => runBoxes(r, WALL.w / 2, WALL.h)),
  ...GARDEN_WALLS.flatMap((r) => runBoxes(r, WALL.w / 2, WALL.h)),
  ...PARTERRES.flatMap((p) => p.hedge.flatMap((r) => runBoxes(r, HEDGE.w / 2, HEDGE.h))),
  ...ROUNDS.map(({ c }): Box => [c[0] - FOUNTAIN.r, c[1] - FOUNTAIN.r, c[0] + FOUNTAIN.r, c[1] + FOUNTAIN.r, SOLID_H(FOUNTAIN.h)]),
  ...URNS.map(([x, z]): Box => [x - URN.plinth / 2, z - URN.plinth / 2, x + URN.plinth / 2, z + URN.plinth / 2, SOLID_H(URN.plinth + URN.h)]),
  ...MALL_BEDS.map((r): Box => [...r, SOLID_H(PLANTER.h)]),
  ...PLANTERS.map(({ at: [x, z], r }): Box => [x - r * 0.8, z - r * 0.8, x + r * 0.8, z + r * 0.8, SOLID_H(PLANTER.h)]),
];
