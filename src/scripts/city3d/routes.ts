/*
 * Where the traffic drives, DOM-free like the street plan: a route for every
 * lane of every straight road, edge of town to edge of town, and routes down
 * each of downtown's diagonals and back (in off the ring, out along a cross
 * street), with the turns rounded off; where along each route it crosses a
 * junction and on which phase; and the lights' timing (two phases, or three
 * where a diagonal comes in). life.ts drives the cars along them.
 */
import { CITY_EXT, EW_ROADS, LANE, MEDIAN, NS_ROADS, laneCentres } from './layout';
import { PLAN, distToStreet, offsetLine, type Street } from './streetplan';
import { BENDS } from './outer';
import { DIAGONALS } from './downtown';

export type Pt = [number, number];
/** Which way traffic crosses a junction: along x, along z, or down a diagonal (each gets its own green) */
export type Phase = 'x' | 'z' | 'd';
export const phaseOf = (dx: number, dz: number): Phase => (Math.abs(dx) > 2 * Math.abs(dz) ? 'x' : Math.abs(dz) > 2 * Math.abs(dx) ? 'z' : 'd');

/** A crossing on the plan, as traffic sees it */
export interface Junction {
  ix: number;
  at: Pt;
  streets: Street[];
  lit: boolean;
  /** A diagonal meets here: the lights run three phases */
  three: boolean;
}
/**
 * A route a car drives, edge of town to edge of town: a centre line in its
 * lane (turns rounded off), and where along it each crossing starts and ends.
 */
export interface Route {
  pts: Pt[];
  cum: number[];
  len: number;
  stops: { j: Junction; enter: number; exit: number; phase: Phase }[];
}
/** Traffic loops round the built-up part of the world */
const [E0, E1] = CITY_EXT;

/** Lights cycle each phase in turn: green, then yellow, then red while the others go */
const CYCLE2 = 22;
const CYCLE3 = 30;
export function lightState(j: Junction, phase: Phase, t: number): 'g' | 'y' | 'r' {
  if (j.three) {
    const k = (t + j.ix * 4.5) % CYCLE3;
    const start = phase === 'x' ? 0 : phase === 'z' ? 10 : 20;
    const d = k - start;
    return d >= 0 && d < 8 ? 'g' : d >= 8 && d < 10 ? 'y' : 'r';
  }
  const k = (t + j.ix * 5.5) % CYCLE2;
  if (phase !== 'z') return k < 9 ? 'g' : k < 11 ? 'y' : 'r';
  return k < 11 ? 'r' : k < 20 ? 'g' : 'y';
}

export const JUNCTIONS: Junction[] = PLAN.crossings.map((c, ix) => ({
  ix,
  at: c.at,
  streets: c.streets.map((id) => PLAN.streets.find((s) => s.id === id)!),
  lit: c.lights,
  three: c.streets.some((id) => id.startsWith('diag')),
}));

/** The right-hand side of travel along (dx, dz) */
export const rightOf = (dx: number, dz: number): Pt => [-dz, dx];

/**
 * A route from legs, each a street's centre line (a -> b, or a polyline
 * `pts`) and how far right of it the lane runs; where two legs meet, the
 * corner is rounded off.
 */
type Leg = { a: Pt; b: Pt; off: number } | { pts: Pt[]; off: number };
function legs(list: Leg[]): Pt[] {
  const lanes = list.map((l) => offsetLine('pts' in l ? l.pts : [l.a, l.b], l.off));
  const dir = (a: Pt, b: Pt): Pt => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  };
  let out: Pt[] = [...lanes[0]];
  for (let i = 1; i < lanes.length; i++) {
    const A = out;
    const B = lanes[i];
    const a0 = A[A.length - 2];
    const uA = dir(a0, A[A.length - 1]);
    const uB = dir(B[0], B[1]);
    // Where the two lanes' lines meet
    const den = uA[0] * uB[1] - uA[1] * uB[0];
    const t = ((B[0][0] - a0[0]) * uB[1] - (B[0][1] - a0[1]) * uB[0]) / den;
    const P: Pt = [a0[0] + uA[0] * t, a0[1] + uA[1] * t];
    // Right turns (from the kerb-side lane) turn tight round the corner; left turns sweep wider
    const cut = den > 0 ? 1.4 : 2.6;
    const near = (q: Pt) => Math.hypot(q[0] - P[0], q[1] - P[1]) < cut;
    // Round the corner: drop what's within `cut` of it either side, and curve from a little before it to a little after
    while (A.length > 1 && near(A[A.length - 1])) A.pop();
    let k0 = 0;
    while (k0 < B.length - 1 && near(B[k0])) k0++;
    const s: Pt = [P[0] - uA[0] * cut, P[1] - uA[1] * cut];
    const e: Pt = [P[0] + uB[0] * cut, P[1] + uB[1] * cut];
    for (let k = 0; k <= 6; k++) {
      const f = k / 6;
      A.push([(1 - f) * (1 - f) * s[0] + 2 * (1 - f) * f * P[0] + f * f * e[0], (1 - f) * (1 - f) * s[1] + 2 * (1 - f) * f * P[1] + f * f * e[1]]);
    }
    out = [...A, ...B.slice(k0)];
  }
  return out;
}

function makeRoute(pts: Pt[]): Route {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const route: Route = { pts, cum, len: cum.at(-1)!, stops: [] };
  // Where it crosses each junction: inside the asphalt of two of the streets meeting there
  for (const j of JUNCTIONS) {
    let enter = -1;
    let exit = -1;
    for (let p = 0; p <= route.len; p += 0.1) {
      const q = pointOn(route, p, 0).at;
      if (Math.hypot(q[0] - j.at[0], q[1] - j.at[1]) > 12) continue;
      const n = j.streets.filter((s) => distToStreet(s, q) < s.half + 0.2).length;
      if (n >= 2) {
        if (enter < 0) enter = p;
        exit = p;
      }
    }
    if (enter < 0) continue;
    const a = pointOn(route, enter, 0).dir;
    route.stops.push({ j, enter, exit, phase: phaseOf(a[0], a[1]) });
  }
  route.stops.sort((a, b) => a.enter - b.enter);
  return route;
}
/** The point `p` along a route (from segment `seg` on), its direction and segment */
export function pointOn(r: Route, p: number, seg: number): { at: Pt; dir: Pt; seg: number } {
  let i = Math.max(0, Math.min(seg, r.pts.length - 2));
  while (i < r.pts.length - 2 && r.cum[i + 1] < p) i++;
  while (i > 0 && r.cum[i] > p) i--;
  const a = r.pts[i];
  const b = r.pts[i + 1];
  const l = r.cum[i + 1] - r.cum[i] || 1;
  const f = Math.max(0, Math.min(1, (p - r.cum[i]) / l));
  return { at: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], dir: [(b[0] - a[0]) / l, (b[1] - a[1]) / l], seg: i };
}

export const ROUTES: Route[] = (() => {
  // Every lane of every straight road, edge to edge: one each way on streets, two each way on avenues (over the bridges too)
  const straight: Route[] = [];
  const lo = E0 + 4;
  const hi = E1 - 4;
  for (const r of EW_ROADS)
    for (const l of laneCentres(r, 'x'))
      straight.push(
        makeRoute(
          l.dir === 1
            ? [
                [lo, l.coord],
                [hi, l.coord],
              ]
            : [
                [hi, l.coord],
                [lo, l.coord],
              ]
        )
      );
  for (const r of NS_ROADS)
    for (const l of laneCentres(r, 'z'))
      straight.push(
        makeRoute(
          l.dir === 1
            ? [
                [l.coord, lo],
                [l.coord, hi],
              ]
            : [
                [l.coord, hi],
                [l.coord, lo],
              ]
        )
      );
  // Down each diagonal and back: in off the ring onto the diagonal, then out along a cross street; and the other way
  const ST = LANE / 2;
  const OUT = MEDIAN / 2 + LANE * 1.5;
  const IN = MEDIAN / 2 + LANE / 2;
  const [NW, NE, SW] = DIAGONALS;
  const diag: Route[] = [
    // North-west: from the west along the north ring, down the diagonal, east along the first cross street
    legs([
      { a: [lo, NW.from[1]], b: NW.from, off: OUT },
      { a: NW.from, b: NW.to, off: ST },
      { a: NW.to, b: [hi, NW.to[1]], off: ST },
    ]),
    legs([
      { a: [hi, NW.to[1]], b: NW.to, off: ST },
      { a: NW.to, b: NW.from, off: ST },
      { a: NW.from, b: [lo, NW.from[1]], off: IN },
    ]),
    // North-east: from the north down the east ring, down the diagonal, west along the first cross street
    legs([
      { a: [NE.from[0], lo], b: NE.from, off: OUT },
      { a: NE.from, b: NE.to, off: ST },
      { a: NE.to, b: [lo, NE.to[1]], off: ST },
    ]),
    legs([
      { a: [lo, NE.to[1]], b: NE.to, off: ST },
      { a: NE.to, b: NE.from, off: ST },
      { a: NE.from, b: [NE.from[0], lo], off: IN },
    ]),
    // South-west: up the west ring from across the river, up the diagonal, north along the first cross street
    legs([
      { a: [SW.from[0], hi], b: SW.from, off: OUT },
      { a: SW.from, b: SW.to, off: ST },
      { a: SW.to, b: [SW.to[0], lo], off: ST },
    ]),
    legs([
      { a: [SW.to[0], lo], b: SW.to, off: ST },
      { a: SW.to, b: SW.from, off: ST },
      { a: SW.from, b: [SW.from[0], hi], off: IN },
    ]),
  ].map(makeRoute);
  // Round each bend and back: in off its avenue at one end, all the way round, out along the avenue at the other
  const bends: Route[] = BENDS.flatMap((b) => {
    const [w, e] = [b.pts[0], b.pts.at(-1)!];
    const back = [...b.pts].reverse();
    // The Parkway leaves its avenue northwards (a left turn heading east), the Southside Loop southwards (a right turn)
    const north = b.pts[1][1] < w[1];
    return [
      legs([{ a: [lo, w[1]], b: w, off: north ? IN : OUT }, { pts: b.pts, off: ST }, { a: e, b: [hi, e[1]], off: north ? IN : OUT }]),
      legs([{ a: [hi, e[1]], b: e, off: north ? OUT : IN }, { pts: back, off: ST }, { a: w, b: [lo, w[1]], off: north ? OUT : IN }]),
    ].map(makeRoute);
  });
  // Spread the diagonal and bend routes through the list, so every quality tier sends cars down them
  const out = [...straight];
  [...diag, ...bends].forEach((r, k) => out.splice(k * 5 + 1, 0, r));
  return out;
})();
