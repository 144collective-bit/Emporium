/*
 * The country roads' fences and field gates (docs/highway-plan.md Phase 7; DOM-free, tested in tests/rural.test.ts;
 * read by rural3d.ts, the drawing's chunk only: out of the boot since Phase 9):
 *
 * - `FENCES`: a post-and-rail fence each side along the field edge (`RURAL.fence` out), broken at the field gates, and
 *   round each turning loop, open to the road (or its stub); none on a bank avenue's river side (`riverSide()`).
 * - `GATES`: a field gate now and then (`RURAL.gateGap`), each side in turn, with a track over the verge and the ditch.
 */
import { RURAL, RURAL_RUNS } from './rural';
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
    let a = lo;
    for (const g of cuts) {
      out.push({ run: r.id, pts: [atRun(r, a, side * RURAL.fence), atRun(r, g - r.out * (GATE_W / 2), side * RURAL.fence)] });
      a = g + r.out * (GATE_W / 2);
    }
    out.push({ run: r.id, pts: [atRun(r, a, side * RURAL.fence), atRun(r, hi, side * RURAL.fence)] });
  }
  // Round the loop, from one side's fence to the other's the long way round (open to its road, or its stub)
  const [cx, cz] = loopCentre(r);
  const R = RURAL.turn + RURAL.half + 1.3;
  const entry = r.stub ? r.stub.end : atRun(r, r.to, 0);
  const back = Math.atan2(entry[1] - cz, entry[0] - cx);
  const open = Math.asin(Math.min(1, RURAL.fence / R));
  const ring: Pt[] = [];
  for (let k = 0; k <= 20; k++) {
    const t = back + open + ((2 * Math.PI - 2 * open) * k) / 20;
    ring.push([cx + Math.cos(t) * R, cz + Math.sin(t) * R]);
  }
  out.push({ run: r.id, pts: ring });
  return out;
});

