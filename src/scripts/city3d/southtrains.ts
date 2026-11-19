/*
 * The underground's south line's trains (docs/south-plan.md Phase 4g; the owner's calls, 2026-11-19): round-top tube
 * trains running the line on a timetable from the clock, so a platform has trains pulling in and out; and a ride: you
 * board at a platform and the train runs to the station you picked, stopping at those between. Two trains, each on its
 * own track either side of the island platforms, shuttling end to end (the line's two ends, The Trenches and the High
 * Road), speeding up out of a station, running at a cruise and slowing into the next. A place on the line is a distance
 * along it (southline.ts `LINE`) and a track. DOM-free, tested in tests/southtrains.test.ts; drawn by tube3d.ts, ridden
 * by tube-ui.ts.
 */
import { SOUTH_STATIONS, TRACK_OFF, lineAt, type StationId } from './southline';
import type { Pt } from './south';

/** A train: its cars, each car's length and the gap between, its cruise, how hard it speeds up and slows, how long it
 * stands at a platform (and at the line's ends, turning round) */
export const TUBE = { cars: 2, carLen: 9.4, gap: 0.5, speed: 13, accel: 2.4, dwell: 10, turn: 14, rideStop: 6 };
export const TRAIN_LEN = TUBE.cars * TUBE.carLen + (TUBE.cars - 1) * TUBE.gap;

/** Where each station's train stops: its platform's middle along the line, in the line's order */
export const STOPS: { id: StationId; s: number }[] = SOUTH_STATIONS.map((st) => ({ id: st.id, s: (st.p0 + st.p1) / 2 }));

/** How long a run of `d` takes from a stand to a stand: speeding up, at its cruise if it gets there, slowing */
export function runTime(d: number, speed = TUBE.speed, accel = TUBE.accel) {
  const reach = (speed * speed) / accel;
  return d >= reach ? d / speed + speed / accel : 2 * Math.sqrt(d / accel);
}
/** How far into a run of `d` it is `t` after setting off */
export function runDist(d: number, t: number, speed = TUBE.speed, accel = TUBE.accel) {
  const total = runTime(d, speed, accel);
  if (t <= 0) return 0;
  if (t >= total) return d;
  const reach = (speed * speed) / accel;
  if (d >= reach) {
    const ta = speed / accel;
    if (t < ta) return 0.5 * accel * t * t;
    if (t < total - ta) return 0.5 * accel * ta * ta + speed * (t - ta);
    const r = total - t;
    return d - 0.5 * accel * r * r;
  }
  const half = total / 2;
  return t < half ? 0.5 * accel * t * t : d - 0.5 * accel * (total - t) ** 2;
}

/** A leg of the timetable: standing at a stop from t0 to t1, or running from one stop to the next */
export type Leg = { t0: number; t1: number; at: number } | { t0: number; t1: number; from: number; to: number };
/** One train's round: out from The Trenches calling at every station to the High Road, standing to turn round, back */
export const LEGS: Leg[] = (() => {
  const out: Leg[] = [];
  let t = 0;
  const order = [...STOPS.keys(), ...[...STOPS.keys()].reverse().slice(1)];
  order.forEach((i, k) => {
    const end = k === 0 || k === order.length - 1 || i === STOPS.length - 1;
    const stand = end ? TUBE.turn / (k === 0 || k === order.length - 1 ? 2 : 1) : TUBE.dwell;
    out.push({ t0: t, t1: t + stand, at: i });
    t += stand;
    if (k < order.length - 1) {
      const j = order[k + 1];
      const d = Math.abs(STOPS[j].s - STOPS[i].s);
      out.push({ t0: t, t1: t + runTime(d), from: i, to: j });
      t += runTime(d);
    }
  });
  return out;
})();
/** One round's length (the two trains half a round apart) */
export const ROUND = LEGS[LEGS.length - 1].t1;

/** Where a train is on its track: how far along the line its middle is, the way it's facing (+1: towards the High
 * Road), whether it's standing at a stop (its index) and its doors open */
export interface TrainAt {
  s: number;
  dir: 1 | -1;
  stop: number | null;
  doors: boolean;
}
/** Train `k` (0 or 1) `t` seconds into the clock: each on its own track, half a round apart */
export function trainAt(k: number, t: number): TrainAt {
  const tt = (((t + k * (ROUND / 2)) % ROUND) + ROUND) % ROUND;
  let leg = LEGS[0];
  for (const l of LEGS) if (tt >= l.t0 && tt < l.t1) leg = l;
  if ('at' in leg) {
    // (facing the way it goes next: at the ends it turns round while it stands)
    const next = LEGS[LEGS.indexOf(leg) + 1];
    const dir = next && 'to' in next ? (next.to > next.from ? 1 : -1) : -1;
    const open = tt - leg.t0 > 1.2 && leg.t1 - tt > 1.2;
    return { s: STOPS[leg.at].s, dir, stop: leg.at, doors: open };
  }
  const [a, b] = [STOPS[leg.from].s, STOPS[leg.to].s];
  const dir: 1 | -1 = b > a ? 1 : -1;
  return { s: a + dir * runDist(Math.abs(b - a), tt - leg.t0), dir, stop: null, doors: false };
}
/** Each train's track: train 0 on one side of the islands, train 1 on the other (across the line from its middle) */
export const trackOf = (k: number) => (k === 0 ? -TRACK_OFF : TRACK_OFF);

/** Where along a train its car `i`'s middle is, from the train's middle (its front car first, the way it's facing) */
export const carOffset = (i: number, dir: 1 | -1) => dir * (TRAIN_LEN / 2 - TUBE.carLen / 2 - i * (TUBE.carLen + TUBE.gap));
/** A car's middle and the way it points, on its track at a distance along the line */
export function carPose(s: number, u: number): { at: Pt; dir: Pt } {
  const { at, dir } = lineAt(s);
  return { at: [at[0] - dir[1] * u, at[1] + dir[0] * u], dir };
}

/* ---------- A ride ---------- */

/** A ride from one station to another: boarding (the doors closing), the runs between with a short stop at each
 * station between, pulling in at the last; where the train is `t` seconds in, and how long it all takes */
export function rideAt(from: StationId, to: StationId, t: number): { s: number; dir: 1 | -1; u: number; stop: number | null; total: number } {
  const a = STOPS.findIndex((o) => o.id === from);
  const b = STOPS.findIndex((o) => o.id === to);
  const dir: 1 | -1 = b > a ? 1 : -1;
  // (the track running that way: the trains' own tracks, the ride on whichever goes its way)
  const u = dir > 0 ? trackOf(0) : trackOf(1);
  const steps: { t0: number; t1: number; s0: number; s1: number }[] = [];
  let at = 2;
  for (let i = a; i !== b; i += dir) {
    const [s0, s1] = [STOPS[i].s, STOPS[i + dir].s];
    const d = runTime(Math.abs(s1 - s0));
    steps.push({ t0: at, t1: at + d, s0, s1 });
    at += d + (i + dir !== b ? TUBE.rideStop : 0);
  }
  const total = at;
  if (t <= 0 || a === b) return { s: STOPS[a].s, dir, u, stop: a, total };
  for (const st of steps) {
    if (t < st.t0) return { s: st.s0, dir, u, stop: STOPS.findIndex((o) => o.s === st.s0), total };
    if (t < st.t1) return { s: st.s0 + dir * runDist(Math.abs(st.s1 - st.s0), t - st.t0), dir, u, stop: null, total };
  }
  return { s: STOPS[b].s, dir, u, stop: b, total };
}
