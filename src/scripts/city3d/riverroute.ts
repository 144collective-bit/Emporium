/*
 * The river bus's loop, timetable and rides (river plan step 4b; its stops
 * are riverbus.ts), as data: DOM-free, tested in tests/riverbus.test.ts.
 * Two boats on one loop round the town's reach, calling at the four stops.
 *
 * The loop runs east along the north bank (under Liberty Bridge's north
 * approach), crosses the river east of the cruise boat's turn (and the tall
 * ship's east anchorage), runs west along the south bank (under its south
 * approach) and crosses back north west of the tall ship's west anchorage,
 * so it never meets the tall ship or the cruise boat (riverlife.ts); its
 * lines along the banks keep between the bank and the outer lanes. A
 * function of the clock, the same for everyone: each boat runs from stop to
 * stop at `BUS.v`, easing in and out, and waits `BUS.dwell` at each.
 *
 * A ride (`rideAt()`) goes straight from one stop to another along the loop
 * the shorter way round (no stops between), quickly enough to take at most
 * about `RIDE_MAX` seconds; the river bus card shows how long each takes.
 *
 * x east, z south; world tiles (1 = about 1.8 m).
 */
import { BUS, STOPS, type StopId } from './riverbus';
import { loopOf, pointAlong, yawOf, type Loop, type Pt } from './riverlife';

/** Its lines along the banks (z): north, south */
export const LINES: [number, number] = [84.6, 117.6];
/** Where it crosses the river (x): east of the cruise boat's turn, west of the tall ship's west anchorage */
export const CROSS: [number, number] = [47, -125];
const S = (id: StopId) => STOPS.find((s) => s.id === id)!;

/** The loop's corners, in the order it runs (the stops lie on its straights: Uptown, Downtown, South Row, Pier 7) */
export const WAYPOINTS: Pt[] = [
  [CROSS[1], LINES[1]],
  [CROSS[1], LINES[0]],
  [-108, LINES[0]],
  [-100, S('uptown').berth],
  [-82, S('uptown').berth],
  [-74, LINES[0]],
  [-6, LINES[0]],
  [2, S('downtown').berth],
  [16, S('downtown').berth],
  [24, LINES[0]],
  [CROSS[0], LINES[0]],
  [CROSS[0], LINES[1]],
  [-27, LINES[1]],
  [-31, S('pier7').berth],
  [-82, S('pier7').berth],
  [-90, LINES[1]],
];
/** How tightly it rounds a corner */
export const CORNER = 4;

/** A closed line through the corners, each rounded off (a curve from `r` before it to `r` after), every `step` */
export function roundLoop(pts: Pt[], r: number, step = 0.5): Pt[] {
  const out: Pt[] = [];
  const n = pts.length;
  const lerp = (a: Pt, b: Pt, f: number): Pt => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  for (let i = 0; i < n; i++) {
    const [p, c, q] = [pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n]];
    const dIn = Math.hypot(c[0] - p[0], c[1] - p[1]);
    const dOut = Math.hypot(q[0] - c[0], q[1] - c[1]);
    const a = lerp(c, p, Math.min(r, dIn / 2) / dIn);
    const b = lerp(c, q, Math.min(r, dOut / 2) / dOut);
    // The curve round the corner (a quadratic from a, pulled to the corner, to b)
    const k = Math.max(4, Math.ceil((Math.hypot(a[0] - c[0], a[1] - c[1]) + Math.hypot(b[0] - c[0], b[1] - c[1])) / step));
    for (let j = 0; j < k; j++) {
      const f = j / k;
      out.push(lerp(lerp(a, c, f), lerp(c, b, f), f));
    }
    // ...then the straight on to where the next corner's curve starts
    const end = lerp(q, c, Math.min(r, dOut / 2) / dOut);
    const len = Math.hypot(end[0] - b[0], end[1] - b[1]);
    const m = Math.ceil(len / step);
    for (let j = 0; j < m; j++) out.push(lerp(b, end, j / m));
  }
  return out;
}
export const ROUTE: Loop = loopOf(roundLoop(WAYPOINTS, CORNER));

/** How far along the loop each stop is (where the boat lies beside its landing) */
export const STOP_S: Record<StopId, number> = (() => {
  const out = {} as Record<StopId, number>;
  for (const s of STOPS) {
    let best = 0;
    let bd = Infinity;
    for (let u = 0; u < ROUTE.len; u += 0.05) {
      const p = pointAlong(ROUTE, u).at;
      const d = Math.hypot(p[0] - s.x, p[1] - s.berth);
      if (d < bd) [bd, best] = [d, u];
    }
    out[s.id] = best;
  }
  return out;
})();
/** The stops in the order the loop meets them */
export const ORDER: StopId[] = (Object.keys(STOP_S) as StopId[]).sort((a, b) => STOP_S[a] - STOP_S[b]);
/** The distance along the loop from one stop forwards to the next it meets (or to another) */
export const gap = (a: StopId, b: StopId) => (((STOP_S[b] - STOP_S[a]) % ROUTE.len) + ROUTE.len) % ROUTE.len;

/** Running `d` from a standstill to a standstill at pace v, pick-up a: how long it takes, and how far along it is at time s */
export function run(d: number, v: number, a: number) {
  const tAcc = Math.min(v / a, Math.sqrt(d / a));
  const vTop = a * tAcc;
  const dAcc = 0.5 * a * tAcc * tAcc;
  const total = 2 * tAcc + (d - 2 * dAcc) / vTop;
  const at = (s: number) => {
    if (s <= 0) return 0;
    if (s >= total) return d;
    if (s < tAcc) return 0.5 * a * s * s;
    if (s > total - tAcc) return d - 0.5 * a * (total - s) ** 2;
    return dAcc + vTop * (s - tAcc);
  };
  return { total, at };
}

/** Each leg of the loop (stop to stop) and how long it takes; the whole loop's time with the waits */
const LEGS = ORDER.map((id, i) => {
  const to = ORDER[(i + 1) % ORDER.length];
  return { from: id, to, d: gap(id, to), ...run(gap(id, to), BUS.v, BUS.a) };
});
export const LOOP_T = LEGS.reduce((t, l) => t + BUS.dwell + l.total, 0);
/** When in the loop (from boat 0's start) a boat begins its wait at a stop */
export function dwellStart(id: StopId) {
  let t = 0;
  for (const l of LEGS) {
    if (l.from === id) return t;
    t += BUS.dwell + l.total;
  }
  return 0;
}
/** The clock offset that puts boat 0 at the start of its wait at a stop at time t (after a ride: the boat you came on lies there) */
export const offsetFor = (id: StopId, t: number) => (((dwellStart(id) + 0.05 - t) % LOOP_T) + LOOP_T) % LOOP_T;
/**
 * The river bus as this screen draws it (riverlife3d.ts): the clock's offset (`offsetFor()` after a ride; the
 * timetable is `busAt(i, t + offset)`) and, while you ride, where boat 0 is
 */
export const BUS_VIEW: { offset: number; ride: { x: number; z: number; yaw: number } | null } = { offset: 0, ride: null };
/** How many boats run the loop (half a loop apart) */
export const BUSES = 2;

/** Where along the loop boat i is at time t, and whether it's waiting at a stop (which) */
export function busS(i: number, t: number): { s: number; at: StopId | null } {
  let tau = (((t + (i * LOOP_T) / BUSES) % LOOP_T) + LOOP_T) % LOOP_T;
  for (const l of LEGS) {
    if (tau < BUS.dwell) return { s: STOP_S[l.from], at: l.from };
    tau -= BUS.dwell;
    if (tau < l.total) return { s: STOP_S[l.from] + l.at(tau), at: null };
    tau -= l.total;
  }
  return { s: STOP_S[ORDER[0]], at: ORDER[0] };
}
/** Boat i at time t: where, its heading (0: bow to +x), and the stop it waits at */
export function busAt(i: number, t: number) {
  const { s, at } = busS(i, t);
  const p = pointAlong(ROUTE, s);
  return { x: p.at[0], z: p.at[1], yaw: yawOf(p.dir), at };
}

/** A ride takes at most about this long (it goes quicker over a longer way) */
export const RIDE_MAX = 36;
/**
 * A ride from one stop to another: straight there along the loop the shorter way round (backwards if that's
 * shorter: `way`), its pace set so it takes at most `RIDE_MAX`
 */
export function ride(a: StopId, b: StopId) {
  const fwd = gap(a, b);
  const way: 1 | -1 = fwd <= ROUTE.len - fwd ? 1 : -1;
  const d = way > 0 ? fwd : ROUTE.len - fwd;
  // (twice the timetable's pace at least: nobody waits at the other stops)
  const v = Math.min(12, Math.max(2 * BUS.v, d / (RIDE_MAX - 6)));
  return { way, d, ...run(d, v, Math.max(BUS.a, v / 6)) };
}
/** Where the boat on a ride from a to b is, s seconds in (its heading the way it's going) */
export function rideAt(a: StopId, b: StopId, s: number) {
  const r = ride(a, b);
  const p = pointAlong(ROUTE, STOP_S[a] + r.way * r.at(s));
  // (`inside`: towards the middle of the loop, out over the river, whichever way the ride goes)
  return { x: p.at[0], z: p.at[1], yaw: yawOf([p.dir[0] * r.way, p.dir[1] * r.way]), inside: [-p.dir[1], p.dir[0]] as Pt, done: s >= r.total, total: r.total };
}
