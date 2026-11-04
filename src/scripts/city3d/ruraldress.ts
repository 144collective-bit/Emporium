/*
 * What stands along the country roads (docs/highway-plan.md Phase 7; DOM-free, tested in tests/rural.test.ts): worked
 * out from the street plan's country roads (rural.ts `RURAL_RUNS`, filled as the plan is made, so this module reads it
 * through streetplan.ts).
 *
 * - `FENCES`: a post-and-rail fence each side along the field edge (`RURAL.fence` out), broken at the field gates, and
 *   round each turning loop, open to the road; `GATES`: a field gate now and then (`RURAL.gateGap`), each side in turn,
 *   with a track over the verge and the ditch to it.
 * - `RURAL_LAMPS` (at the boot): one where each country road leaves town, one by its turning loop, and the odd one
 *   between (`RURAL.lampGap`), on the verge, its arm over the road.
 * - `RURAL_KEEPS`: the land the outskirts' trees keep off (the road, its verges, ditches and fences; landuse.ts).
 */
import { PLAN } from './streetplan';
import { RIVER } from './layout';
import { RURAL, RURAL_RUNS, type RuralRun } from './rural';
import type { Pt } from './streetplan';

/** (the plan is made before anything here reads the runs) */
export const RURAL_READY = PLAN.streets.some((s) => s.kind === 'rural');

/** A point beside a run: `v` along its axis, `o` across it (positive: +z for a run along x, +x for one along z) */
export const atRun = (r: RuralRun, v: number, o: number): Pt => (r.axis === 'x' ? [v, r.c + o] : [r.c + o, v]);
/** The turning loop's centre */
export const loopCentre = (r: RuralRun): Pt => r.centre;

/** Does this side of a run face the river (a bank avenue's: its bank runs down to the water there, no ditch, fence or gate) */
export const riverSide = (r: RuralRun, side: number) => r.axis === 'x' && ((r.c < RIVER[0] && side > 0 && RIVER[0] - r.c < 12) || (r.c > RIVER[1] && side < 0 && r.c - RIVER[1] < 12));

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

/** The lamps (x, z, the way the arm faces, the foot's height) */
export const RURAL_LAMPS: [number, number, number, number][] = RURAL_RUNS.flatMap((r) => {
  const len = Math.abs(r.to - r.from);
  const at: number[] = [6];
  for (let d = RURAL.lampGap; d < len - 30; d += RURAL.lampGap) at.push(d);
  at.push(len - 4);
  return at.map((d, k): [number, number, number, number] => {
    const side = k % 2 ? 1 : -1;
    const [x, z] = atRun(r, r.from + r.out * d, side * (RURAL.half + 0.9));
    // (its arm back over the road)
    const ry = r.axis === 'x' ? (side * Math.PI) / 2 : side > 0 ? Math.PI : 0;
    return [x, z, ry, 0.02];
  });
});

/** What the outskirts' trees keep off: each road with its verges, ditches and fences, and its turning loop */
export const RURAL_KEEPS: { id: string; pts: Pt[]; half: number }[] = RURAL_RUNS.flatMap((r) => [
  { id: `rural:${r.id}`, pts: [atRun(r, r.from, 0), atRun(r, r.to, 0)], half: RURAL.fence + 1 },
  ...(r.stub ? [{ id: `rural:${r.id}-stub`, pts: [atRun(r, r.to, 0), r.stub.end], half: RURAL.fence + 1 }] : []),
  { id: `rural:${r.id}-turn`, pts: [r.centre, r.centre], half: RURAL.turn + RURAL.half + 2.5 },
]);
