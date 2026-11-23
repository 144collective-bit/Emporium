/*
 * Riverside Raceway's circuit as data (docs/kart-harbour-plan.md, Phase 1): the kart park's new home on the south bank
 * west of the Docks, its new longer lap. DOM-free, tested in tests/kartcircuit2.test.ts. Nothing in the city reads it
 * until the new park is built behind `?karts=new` (Phase 3) and switched on (Phase 8).
 *
 * The owner's picks (2026-11-23): winding roads, a tunnel, a longer, more complex lap, the track a little wider than
 * today's (5.2, not 4.4). Raced forward it runs:
 * - the pit straight east along the south, in front of race control;
 * - the Docks wiggles north up the east side and the hairpin at the top;
 * - the riverside straight west along the north, the grandstand and the river beside it;
 * - the winding descent onto the hill, and the hill-top switchbacks, raised over the tunnel;
 * - west and up to the keyhole hairpin in the north-west corner, the esses down the west side;
 * - the carousel round the south-west, then north-east through the tunnel under the hill (under the switchbacks twice);
 * - the chicane and back round onto the pit straight.
 *
 * Its frame is the site's: u east and v south from its north-west corner (`SITE2`), as kartpark.ts's is for today's.
 */

export type Pt = [number, number];

/** The new park's site in the world: the riverside road (z 137) to its north, the Docks (x -402) to its east */
export const SITE2 = { x0: -585, z0: 145, x1: -410, z1: 300 } as const;

/** The track: wider than today's (4.4), its kerbs, its run-off, and how far its middle keeps from anything */
export const TRACK2_W = 5.2;
export const TRACK2_HALF = TRACK2_W / 2;
export const KERB2 = 0.5;
export const RUNOFF2 = 3;
export const CLEAR2 = TRACK2_HALF + KERB2 + RUNOFF2;
/** The tightest corner (a little over today's MIN_RADIUS 4), the steepest ramp (gentler than today's 0.3) */
export const MIN_RADIUS2 = 5;
export const MAX_SLOPE2 = 0.15;
/** How high the hill-top switchbacks run over the tunnel's floor, and the tunnel's clear height inside */
export const HILL_TOP = 3.4;
export const TUNNEL_CLEAR = 2.6;
/** The deck's depth over the tunnel (its roof): what's left between the clear height and the road over it */
export const TUNNEL_ROOF = HILL_TOP - TUNNEL_CLEAR;
/** How far apart two runs must stand in height to pass one over the other (the hill between): the tunnel's clear height and a little */
export const STACKED = TUNNEL_CLEAR + 0.3;
/** Samples half a tile apart along the centre line */
export const STEP2 = 0.5;

/** The lap's shape: its waypoints in the site's frame, before the stretch below; a closed loop, raced forward this way */
const WAYPOINTS: Pt[] = [
  [96, 116], [122, 115], [146, 110], [160, 98], [154, 84], [164, 70], [158, 54], [166, 40], [156, 27], [138, 25],
  [112, 26], [96, 30], [90, 40], [100, 48], [94, 56], [82, 56], [76, 64], [86, 72], [100, 77], [94, 88], [78, 92], [62, 86],
  [52, 72], [44, 56], [34, 40], [20, 30], [9, 36], [12, 48], [22, 56], [16, 68], [8, 80], [14, 94], [10, 106], [22, 118], [40, 120], [54, 112],
  [64, 100], [78, 82], [94, 70], [110, 66], [122, 68], [130, 60], [142, 66], [140, 82], [124, 94], [106, 98], [90, 102], [80, 108], [84, 114],
];
/** Which waypoints are the hill-top run (raised over the tunnel) */
const HILL_RUN: [number, number] = [13, 21];
/** The stretch about the hill's middle that gives the wider track its run-off (u, then v) */
const STRETCH = { cu: 85, cv: 75, su: 1.0, sv: 1.08, du: 3, dv: -2 } as const;
const PER_SEG = 40;

/** A centripetal Catmull-Rom through a closed list of points, `n` points a segment */
function spline(P: Pt[], n: number): Pt[] {
  const out: Pt[] = [];
  const L = P.length;
  for (let i = 0; i < L; i++) {
    const [p0, p1, p2, p3] = [P[(i - 1 + L) % L], P[i], P[(i + 1) % L], P[(i + 2) % L]];
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const [t2, t3] = [t * t, t * t * t];
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)) as Pt);
    }
  }
  return out;
}
/** The radius of the circle through three points */
export function radius3(a: Pt, b: Pt, c: Pt): number {
  const [ab, bc, ca] = [Math.hypot(b[0] - a[0], b[1] - a[1]), Math.hypot(c[0] - b[0], c[1] - b[1]), Math.hypot(a[0] - c[0], a[1] - c[1])];
  const cr = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  return cr < 1e-9 ? Infinity : (ab * bc * ca) / (2 * cr);
}
/** Relax every corner tighter than `rmin` (and those near it) towards its neighbours, leaving the rest as drawn */
function relax(C: Pt[], rmin: number): Pt[] {
  let cur = C.map((p) => [...p] as Pt);
  const n = cur.length;
  for (let pass = 0; pass < 4000; pass++) {
    const mark = new Set<number>();
    for (let i = 0; i < n; i++) if (radius3(cur[(i - 3 + n) % n], cur[i], cur[(i + 3) % n]) < rmin) for (let d = -10; d <= 10; d++) mark.add((i + d + n) % n);
    if (!mark.size) break;
    const next = cur.map((p) => [...p] as Pt);
    for (const i of mark) {
      const [a, b] = [cur[(i - 1 + n) % n], cur[(i + 1) % n]];
      next[i] = [cur[i][0] * 0.5 + (a[0] + b[0]) * 0.25, cur[i][1] * 0.5 + (a[1] + b[1]) * 0.25];
    }
    cur = next;
  }
  return cur;
}
/** Resample a closed line every `step` by arc length, keeping where each original point lands */
function resample(C: Pt[], step: number): { pts: Pt[]; at: number[] } {
  const n = C.length;
  const cum = [0];
  for (let i = 0; i < n; i++) cum.push(cum[i] + Math.hypot(C[(i + 1) % n][0] - C[i][0], C[(i + 1) % n][1] - C[i][1]));
  const L = cum[n];
  const m = Math.round(L / step);
  const pts: Pt[] = [];
  let j = 0;
  for (let k = 0; k < m; k++) {
    const s = (k * L) / m;
    while (cum[j + 1] < s) j++;
    const f = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    const [a, b] = [C[j], C[(j + 1) % n]];
    pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return { pts, at: cum.slice(0, n) };
}
const segsCross = (a: Pt, b: Pt, c: Pt, d: Pt) => {
  const o = (p: Pt, q: Pt, r: Pt) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
};

export interface Circuit2 {
  /** The centre line in the world, a sample every `step`, closed (the last joins the first) */
  x: number[];
  z: number[];
  /** The road's height over the site's level ground at each sample */
  y: number[];
  /** The same in the site's frame */
  u: number[];
  v: number[];
  L: number;
  step: number;
  /** Where the lap crosses itself: the sample on the upper run (over the hill) and the lower (in the tunnel) */
  crossings: { upper: number; lower: number }[];
  /** The tunnel's samples (the lower run between its mouths) */
  tunnel: [number, number];
}

function build(): Circuit2 {
  const shaped = WAYPOINTS.map(([u, v]): Pt => [STRETCH.cu + STRETCH.du + (u - STRETCH.cu) * STRETCH.su, STRETCH.cv + STRETCH.dv + (v - STRETCH.cv) * STRETCH.sv]);
  const dense = relax(spline(shaped, PER_SEG), MIN_RADIUS2 + 1);
  const { pts } = resample(dense, STEP2);
  const n = pts.length;
  const L = n * STEP2;
  // Which samples are the hill's run and the tunnel's (from the waypoints' share of the lap)
  const share = (w: number) => Math.round((w / WAYPOINTS.length) * n) % n;
  const [h0, h1] = [share(HILL_RUN[0]), share(HILL_RUN[1])];
  const inRun = (i: number, a: number, b: number) => (a <= b ? i >= a && i <= b : i >= a || i <= b);
  // Where it crosses itself
  const crossings: { upper: number; lower: number }[] = [];
  for (let i = 0; i < n; i++)
    for (let j = i + 4; j < n; j++) {
      if (i === 0 && j > n - 4) continue;
      if (!segsCross(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) continue;
      const [up, lo] = inRun(i, h0, h1) ? [i, j] : [j, i];
      crossings.push({ upper: up, lower: lo });
    }
  // Heights: the hill's run raised to HILL_TOP over the crossings, ramped at MAX_SLOPE2 or gentler either side
  const ups = crossings.map((c) => c.upper);
  const lo = Math.min(...ups);
  const hi = Math.max(...ups);
  const hold = 8 / STEP2;
  // (a smoothstep's steepest is 1.5 times its average: the ramp long enough that its steepest is under MAX_SLOPE2)
  const ramp = Math.ceil((1.5 * HILL_TOP) / (MAX_SLOPE2 * 0.9) / STEP2);
  const y = pts.map((_, i) => {
    const d = i < lo - hold ? lo - hold - i : i > hi + hold ? i - (hi + hold) : 0;
    if (d >= ramp) return 0;
    const t = 1 - d / ramp;
    return HILL_TOP * (t * t * (3 - 2 * t));
  });
  return {
    u: pts.map((p) => p[0]),
    v: pts.map((p) => p[1]),
    x: pts.map((p) => SITE2.x0 + p[0]),
    z: pts.map((p) => SITE2.z0 + p[1]),
    y,
    L,
    step: STEP2,
    crossings,
    // (the tunnel: the lower run from a little before its first crossing to a little past its last)
    tunnel: [Math.min(...crossings.map((c) => c.lower)) - Math.round(12 / STEP2), Math.max(...crossings.map((c) => c.lower)) + Math.round(12 / STEP2)],
  };
}

export const CIRCUIT2: Circuit2 = build();
