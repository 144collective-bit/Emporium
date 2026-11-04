/*
 * Turn lanes at the busiest avenue junctions (docs/highway-plan.md Phase 6; DOM-free, tested in tests/turnlanes.test.ts):
 * where routes.ts gives an avenue's ways an arrow of their own (`Junction.arrows`: lit four-way crossroads on an
 * avenue), its inner lane coming up to the junction is the left-turn lane and the outer one for ahead and right. The
 * traffic already keeps to them (routes.ts picks the inner lane for a left turn); the lights give the left turns a
 * green arrow first (`lightState(..., left)`), then the rest.
 *
 * - `TURN_JUNCTIONS`: those junctions (but Uptown's, whose chunk paints its own: kerbside3d.ts `turnArrows()`).
 * - `TURN_ARROWS`: the arrows painted in the lanes on each way in (a left arrow in the inner lane, ahead-and-right in
 *   the outer), two sets back from the junction, and the stop bars across both lanes (`STOP_BARS`).
 */
import { LANE, MEDIAN } from './layout';
import { distToStreet, type Pt, type Street } from './streetplan';
import { JUNCTIONS, rightOf, type Junction } from './routes';

/** The junctions with turn lanes painted here (Uptown's are its own chunk's) */
export const TURN_JUNCTIONS: Junction[] = JUNCTIONS.filter((j) => j.arrows.length && !j.streets.some((s) => s.id.startsWith('uptown-')));
/** How far back from the junction's middle each set of arrows lies, past the street it crosses (and its zebra) */
export const ARROW_BACK = [6.5, 15];
/** An arrow's length */
export const ARROW_LEN = 1.8;

export interface TurnArrow {
  x: number;
  z: number;
  /** The way the traffic runs */
  ux: number;
  uz: number;
  kind: 'left' | 'right';
}
/** A street's inner and outer lanes' offsets to the right of its way (routes.ts: its median pushes them out) */
const lanesOf = (s: Street): [number, number] => {
  const wide = s.median ? (s.median - MEDIAN) / 2 : 0;
  return [wide + MEDIAN / 2 + LANE / 2, wide + MEDIAN / 2 + LANE * 1.5];
};
/** The street at an arm of j, `d` out along (ux, uz) */
const armOf = (j: Junction, ux: number, uz: number, d = 6) => j.streets.find((s) => distToStreet(s, [j.at[0] + ux * d, j.at[1] + uz * d]) < 0.5)!;

export const TURN_ARROWS: TurnArrow[] = [];
export const STOP_BARS: { x: number; z: number; ux: number; uz: number; w: number }[] = [];
for (const j of TURN_JUNCTIONS)
  for (const p of j.arrows)
    for (const sgn of [1, -1]) {
      // (coming in along u, from the -u side)
      const u: Pt = p === 'x' ? [sgn, 0] : [0, sgn];
      const avenue = armOf(j, -u[0], -u[1]);
      // (the street it crosses: how far its asphalt reaches out from the middle)
      const across = armOf(j, u[1], -u[0]) ?? armOf(j, -u[1], u[0]);
      const reach = across.half + 1.4;
      const r = rightOf(u[0], u[1]);
      const [inner, outer] = lanesOf(avenue);
      for (const back of ARROW_BACK) {
        const d = reach + back;
        for (const [off, kind] of [
          [inner, 'left'],
          [outer, 'right'],
        ] as const)
          TURN_ARROWS.push({ x: j.at[0] - u[0] * d + r[0] * off, z: j.at[1] - u[1] * d + r[1] * off, ux: u[0], uz: u[1], kind });
      }
      const mid = (inner + outer) / 2;
      STOP_BARS.push({ x: j.at[0] - u[0] * (reach + 0.4) + r[0] * mid, z: j.at[1] - u[1] * (reach + 0.4) + r[1] * mid, ux: u[0], uz: u[1], w: LANE * 2 });
    }

/** The land they're on (the drawing's chunk loads as you come near it) */
export const TURN_RECT: [number, number, number, number] = [
  Math.min(...TURN_ARROWS.map((a) => a.x)) - 20,
  Math.min(...TURN_ARROWS.map((a) => a.z)) - 20,
  Math.max(...TURN_ARROWS.map((a) => a.x)) + 20,
  Math.max(...TURN_ARROWS.map((a) => a.z)) + 20,
];
