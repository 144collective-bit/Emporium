/*
 * The country roads' fences and field gates (docs/highway-plan.md Phase 7; DOM-free, tested in tests/rural.test.ts;
 * read by rural3d.ts, the drawing's chunk only: out of the boot since Phase 9):
 *
 * - `FENCES`: a post-and-rail fence each side along the field edge (`RURAL.fence` out), broken at the field gates, and
 *   round each turning loop, open to the road (or its stub); none on a bank avenue's river side (`riverSide()`).
 * - `GATES`: a field gate now and then (`RURAL.gateGap`), each side in turn, with a track over the verge and the ditch.
 */
import { RURAL, RURAL_RUNS, type RuralRun } from './rural';
import { VISITORS_DRIVE } from './airbase';
import { CLUB_GAPS } from './golflift';
import type { Rect } from './tiles';

/** The drives that cross a country road's fence (the visitors' car park's at Northgate Air Base; the golf course's drive
 * and footpath, golflift.ts) */
const DRIVES: Rect[] = [VISITORS_DRIVE, ...CLUB_GAPS];
import { atRun, loopCentre, riverSide } from './ruraldress';
import type { Pt } from './streetplan';

/** A field gate: where along its run, which side, how wide the gap */
export interface Gate {
  run: string;
  v: number;
  side: 1 | -1;
}
export const GATE_W = 3.2;
export const GATES: Gate[] = RURAL_RUNS.flatMap((r) => {
  const out: Gate[] = [];
  const len = Math.abs(r.to - r.from);
  let k = 0;
  for (let d = RURAL.gateGap * 0.6; d < len - 20; d += RURAL.gateGap, k++) {
    const side = k % 2 ? 1 : -1;
    // (on the river's side of a bank avenue, the field's across the road)
    out.push({ run: r.id, v: r.from + r.out * d, side: riverSide(r, side) ? (-side as 1 | -1) : side });
  }
  return out;
});

/** Where a drive crosses a run's fence on one side (along the run, in its order): the drives off the country roads */
function drivesAcross(r: RuralRun, side: 1 | -1): [number, number][] {
  const out: [number, number][] = [];
  for (const d of DRIVES) {
    const [x, z] = atRun(r, r.from, side * RURAL.fence);
    const across = r.axis === 'x' ? z : x;
    const [c0, c1] = r.axis === 'x' ? [d[1], d[3]] : [d[0], d[2]];
    if (across < c0 || across > c1) continue;
    const [v0, v1] = r.axis === 'x' ? [d[0], d[2]] : [d[1], d[3]];
    // (along the run, not another one on the same line)
    if (v1 < Math.min(r.from, r.to) || v0 > Math.max(r.from, r.to)) continue;
    out.push(r.out > 0 ? [v0, v1] : [v1, v0]);
  }
  return out;
}
/** A fence: a straight run between two points, or round a turning loop as points */
export interface Fence {
  run: string;
  pts: Pt[];
}
export const FENCES: Fence[] = RURAL_RUNS.flatMap((r) => {
  const out: Fence[] = [];
  const lo = r.from + r.out * 4;
  const hi = r.to - r.out * (r.stub ? RURAL.half + 1 : 1.5);
  for (const side of [-1, 1] as const) {
    if (riverSide(r, side)) continue;
    // (broken at the gates on its side)
    const cuts = GATES.filter((g) => g.run === r.id && g.side === side).map((g) => g.v);
    // (and where a drive crosses it: the visitors' car park's, by Northgate Air Base's main gate)
    const gaps = [...cuts.map((g): [number, number] => [g - r.out * (GATE_W / 2), g + r.out * (GATE_W / 2)]), ...drivesAcross(r, side)].sort((p, q) => (p[0] - q[0]) * r.out);
    let a = lo;
    for (const [g0, g1] of gaps) {
      out.push({ run: r.id, pts: [atRun(r, a, side * RURAL.fence), atRun(r, g0, side * RURAL.fence)] });
      a = g1;
    }
    out.push({ run: r.id, pts: [atRun(r, a, side * RURAL.fence), atRun(r, hi, side * RURAL.fence)] });
  }
  // Round the loop, from one side's fence to the other's the long way round (open to its road, or its stub)
  const [cx, cz] = loopCentre(r);
  const R = RURAL.turn + RURAL.half + 1.3;
  const entry = r.stub ? r.stub.end : atRun(r, r.to, 0);
  const back = Math.atan2(entry[1] - cz, entry[0] - cx);
  const open = Math.asin(Math.min(1, RURAL.fence / R));
  // (a gated run's open on its gate's side too: two arcs, either side of the way through to the barrier)
  const arcs: [number, number][] = r.gated ? [[back + open, back + Math.PI - open], [back + Math.PI + open, back + 2 * Math.PI - open]] : [[back + open, back + 2 * Math.PI - open]];
  for (const [t0, t1] of arcs) {
    const ring: Pt[] = [];
    for (let k = 0; k <= 20; k++) {
      const t = t0 + ((t1 - t0) * k) / 20;
      ring.push([cx + Math.cos(t) * R, cz + Math.sin(t) * R]);
    }
    out.push({ run: r.id, pts: ring });
  }
  return out;
});

