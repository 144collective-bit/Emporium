/*
 * What stands along the country roads (docs/highway-plan.md Phase 7; DOM-free, tested in tests/rural.test.ts): worked
 * out from the street plan's country roads (rural.ts `RURAL_RUNS`, filled as the plan is made, so this module reads it
 * through streetplan.ts).
 *
 * - `atRun()`, `loopCentre()`, `riverSide()`: where things stand beside a run (the fences and gates, ruralfence.ts, are
 *   the drawing's chunk's only).
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
