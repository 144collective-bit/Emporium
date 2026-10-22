/*
 * The ring highway (docs/growth-plan.md Phase 7; DOM-free, tested in
 * tests/highway.test.ts): two lanes each way with a median, round the whole
 * city well outside the Parkway and the Southside Loop, the kart park and the
 * airport, on a rounded rectangle with gentle corners. It meets every straight
 * arterial at a lit junction (streetplan.ts), crosses the river on a bridge on
 * each side, and right turns between it and the arterials take slip lanes
 * across the corners on the town side (`slipCurve()`), so nothing has to be
 * built over anything else: it's all at ground level.
 */
import { LANE, MEDIAN } from './layout';

export type Pt = [number, number];

/** The centre line's box: x0, z0, x1, z1 (round The Trenches in the south-west, the kart park in the north, the airport in the south-east) */
export const HIGHWAY_BOX: [number, number, number, number] = [-215, -170, 275, 275];
/** Its corners' radius */
export const HIGHWAY_R = 70;
/** A hard shoulder past the outer lane, each side */
export const SHOULDER = 0.5;
/** Half the paved width: the median's half, two lanes and the shoulder */
export const HIGHWAY_HALF = MEDIAN / 2 + 2 * LANE + SHOULDER;
/** How far either side of the corner a slip lane starts and ends (routes.ts rounds right turns at its junctions this wide) */
export const SLIP_CUT = 9;

/**
 * The centre line: a closed loop (its last point is its first), starting in
 * the middle of the north side heading east, so the seam is on a straight
 */
export const HIGHWAY: Pt[] = (() => {
  const [x0, z0, x1, z1] = HIGHWAY_BOX;
  const R = HIGHWAY_R;
  const out: Pt[] = [[(x0 + x1) / 2, z0]];
  const arc = (cx: number, cz: number, a0: number) => {
    // A quarter turn clockwise seen from above (x east, z south), 12 steps
    for (let k = 0; k <= 12; k++) {
      const a = a0 + (k / 12) * (Math.PI / 2);
      out.push([cx + Math.cos(a) * R, cz + Math.sin(a) * R]);
    }
  };
  arc(x1 - R, z0 + R, -Math.PI / 2);
  arc(x1 - R, z1 - R, 0);
  arc(x0 + R, z1 - R, Math.PI / 2);
  arc(x0 + R, z0 + R, Math.PI);
  out.push([(x0 + x1) / 2, z0]);
  return out;
})();

/**
 * How far a point is from the highway's centre line (a rounded rectangle's
 * edge, worked out exactly)
 */
export function fromHighway(x: number, z: number) {
  const [x0, z0, x1, z1] = HIGHWAY_BOX;
  const R = HIGHWAY_R;
  const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
  const [hx, hz] = [(x1 - x0) / 2 - R, (z1 - z0) / 2 - R];
  const qx = Math.abs(x - cx) - hx;
  const qz = Math.abs(z - cz) - hz;
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0);
  return Math.abs(outside - R);
}
/** Is x, z inside the highway's loop */
export function insideHighway(x: number, z: number) {
  const [x0, z0, x1, z1] = HIGHWAY_BOX;
  const R = HIGHWAY_R;
  const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
  const qx = Math.abs(x - cx) - ((x1 - x0) / 2 - R);
  const qz = Math.abs(z - cz) - ((z1 - z0) / 2 - R);
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) < R;
}

/**
 * A corner rounded off: from `cut` before the corner `P` (coming along uA) to
 * `cut` after it (leaving along uB), a curve with the corner as its control
 * point, in seven points. routes.ts rounds every turn with it, and the slip
 * lanes are drawn along it.
 */
export function cornerCurve(P: Pt, uA: Pt, uB: Pt, cut: number): Pt[] {
  const s: Pt = [P[0] - uA[0] * cut, P[1] - uA[1] * cut];
  const e: Pt = [P[0] + uB[0] * cut, P[1] + uB[1] * cut];
  const out: Pt[] = [];
  for (let k = 0; k <= 6; k++) {
    const f = k / 6;
    out.push([(1 - f) * (1 - f) * s[0] + 2 * (1 - f) * f * P[0] + f * f * e[0], (1 - f) * (1 - f) * s[1] + 2 * (1 - f) * f * P[1] + f * f * e[1]]);
  }
  return out;
}

/** The right-hand side of travel along u */
const rightOf = (u: Pt): Pt => [-u[1], u[0]];
/** The outer lane's offset from a road's centre line: an avenue's (and the highway's) second lane, a street's only one */
export const outerLane = (lanes: number) => (lanes === 2 ? MEDIAN / 2 + LANE * 1.5 : LANE / 2);

/**
 * A slip lane: the right turn at a junction at `at` from a road coming in
 * along uA (its outer lane `offA` right of its centre) onto one leaving along
 * uB, square to it (its outer lane `offB`)
 */
export function slipCurve(at: Pt, uA: Pt, offA: number, uB: Pt, offB: number): Pt[] {
  // Where the two outer lanes' lines meet
  const a0: Pt = [at[0] + rightOf(uA)[0] * offA, at[1] + rightOf(uA)[1] * offA];
  const b0: Pt = [at[0] + rightOf(uB)[0] * offB, at[1] + rightOf(uB)[1] * offB];
  const den = uA[0] * uB[1] - uA[1] * uB[0];
  const t = ((b0[0] - a0[0]) * uB[1] - (b0[1] - a0[1]) * uB[0]) / den;
  return cornerCurve([a0[0] + uA[0] * t, a0[1] + uA[1] * t], uA, uB, SLIP_CUT);
}
