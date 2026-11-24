/*
 * Westlake Park's kerbs and edges along its walks (the north side's stage 3; moved out of gardens.ts so the boot
 * doesn't carry them, docs/westlake-plan.md Phase 3c's room): the main walks' raised stone kerbs both sides
 * (`KERBS`), the gravel paths' flush stone edge (`EDGES`), each broken where something crosses. DOM-free, tested in
 * tests/gardens.test.ts; drawn by gardens3d.ts (the park's chunk).
 */
import { EDGE_W, KERB, ROUND_AT, ROUND_R, dense, isMain, offset, runs } from './gardens';
import { JETTY, PATHS, distToLine, nearTerrace, onBridge, type ParkPath, type Pt, type Rect } from './westlake';
import { inSquare } from './civic';

const inRect = (r: Rect, p: Pt) => p[0] > r[0] && p[0] < r[2] && p[1] > r[1] && p[1] < r[3];

/** Each path's bounds, out as far as `edgeCut()` looks (a point outside them is off it: no need to measure) */
const REACH = new Map(
  PATHS.map((r) => {
    const m = r.half + 0.15;
    const xs = r.pts.map((p) => p[0]);
    const zs = r.pts.map((p) => p[1]);
    return [r, [Math.min(...xs) - m, Math.min(...zs) - m, Math.max(...xs) + m, Math.max(...zs) + m] as Rect];
  })
);
/** Where a walk's edge mustn't run: across another path, the jetty, a terrace, or between a gate's piers */
function edgeCut(q: ParkPath, p: Pt) {
  if (PATHS.some((r) => r !== q && inRect(REACH.get(r)!, p) && distToLine(r.pts, p, r.loop) < r.half + 0.15)) return true;
  if (Math.abs(p[0] - JETTY.x) < JETTY.half + 0.4 && p[1] > JETTY.z0 - 0.6 && p[1] < JETTY.z1) return true;
  // (and the garden's round places, which the walks open into)
  if (ROUND_AT.some(([x, z]) => Math.hypot(p[0] - x, p[1] - z) < ROUND_R + 0.1)) return true;
  // (and the civic square, paved edge to edge: the walks that cross it or come into it open into it)
  if (inSquare(p, 0.1)) return true;
  // (and the bridges, whose decks carry their own railings and parapets: docs/westlake-plan.md Phase 3a)
  if (onBridge(p[0], p[1], -0.4)) return true;
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
