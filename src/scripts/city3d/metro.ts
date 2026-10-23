/*
 * The Sector 7 Metro (docs/growth-plan.md Phases 8 and 9; DOM-free, tested
 * in tests/metro.test.ts): an elevated line on a viaduct from the kart park
 * in the north, down the east ring avenue's median over downtown's east side
 * and the river to South Bank; there it bends west (the owner's call, with
 * The Trenches) and runs south of the town's south row and on over Trench
 * Avenue's median to The Trenches. The Airport's branch carries straight on
 * south from the bend.
 *
 * - **Tracks** (`TRACKS`): centre lines on the ground plan, `main` (north to
 *   south, then round the bend and west) and `branch` (from the switch,
 *   `SWITCH_S` along main, south to the Airport); a place on them is a track
 *   and a distance along it (`s`), `pointOn()` turns it into a point and the
 *   way the track runs there.
 * - **Stations** (`STATIONS`): each a platform beside its track (on the
 *   left of the way the track runs, the side `PLATFORM_SIDE`), a stair tower
 *   on the ground with its door at street level (where you board: "Metro"),
 *   the way out of the door (`face`).
 * - **Pillars** (`PILLARS`): along the tracks wherever the ground under them
 *   is clear: an avenue's median (clear of its junctions), or open land off
 *   every road; never in the river; never more than 12 apart where they can
 *   stand.
 * - **The train** shuttles on a timetable from the clock (`trainAt()`, the
 *   same for everyone): Kart Park, Downtown, South Bank, The Trenches, back
 *   to South Bank, out to the Airport, back, and up to the Kart Park. A ride
 *   (`rideAt()`) goes straight to the station you pick (from The Trenches to
 *   the Airport it turns round at South Bank), and the train carries on its
 *   timetable from there (`timetableAt()`).
 *
 * Built over the avenues' medians and on open land clear of the pads and
 * the blocks, so nothing that exists moves.
 */
import { MEDIAN, NS_ROADS, RIVER } from './layout';
import { PLAN, distToStreet, type Street } from './streetplan';
import { AVENUE_Z } from './trenches';
import type { Box } from './solids';

export type Pt = [number, number];
export type TrackId = 'main' | 'branch';

/** The east ring avenue the line runs down (x) */
export const LINE_X = NS_ROADS[NS_ROADS.length - 1].c;
/** The viaduct: the top of its deck, its half width, how thick the deck is */
export const DECK_Y = 5.2;
export const DECK_HALF = 1.0;
export const DECK_T = 0.5;
/** Pillar half width (in a median, 0.5 across) */
export const PILLAR_HALF = 0.25;
/** The platforms: from the deck's edge out, 2 wide, either side of the station's middle along the track */
export const PLATFORM = { from: DECK_HALF, to: DECK_HALF + 2, half: 5.2 };
/** Which side of the track the platforms are on: the left of the way the track runs (-1; +1 is its right) */
export const PLATFORM_SIDE = -1;

/** Where the line splits (z on the east avenue): the branch carries on south, the main line bends west */
export const SWITCH_Z = 116;
/** The bend's radius: it comes out of it running west along Trench Avenue */
export const BEND_R = AVENUE_Z - SWITCH_Z;
/** The ends of the tracks: north, west (past The Trenches' station) and south (past the Airport's) */
export const NORTH_END = -204;
export const WEST_END = -103;
export const AIRPORT_END = 136.4;

export interface Track {
  id: TrackId;
  pts: Pt[];
  /** Distance along it to each point */
  cum: number[];
  len: number;
}
const track = (id: TrackId, pts: Pt[]): Track => {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { id, pts, cum, len: cum[cum.length - 1] };
};
/** The bend: a quarter circle from running south to running west, about every half tile */
const BEND: Pt[] = Array.from({ length: 45 }, (_, k): Pt => {
  const a = ((k + 1) / 45) * (Math.PI / 2);
  return [LINE_X - BEND_R + BEND_R * Math.cos(a), SWITCH_Z + BEND_R * Math.sin(a)];
});
export const TRACKS: Record<TrackId, Track> = {
  main: track('main', [[LINE_X, NORTH_END], [LINE_X, SWITCH_Z], ...BEND, [WEST_END, AVENUE_Z]]),
  branch: track('branch', [[LINE_X, SWITCH_Z], [LINE_X, AIRPORT_END]]),
};
/** The switch: how far along the main line the branch leaves it (the branch starts there, at its 0) */
export const SWITCH_S = SWITCH_Z - NORTH_END;

/**
 * A point on a track `s` along it, and the way the track runs there (unit).
 * Past either end it carries on straight (a train's cars reaching past a
 * station at the end of the line); the branch before its start is the main
 * line north of the switch.
 */
export function pointOn(id: TrackId, s: number): { at: Pt; dir: Pt } {
  if (id === 'branch' && s < 0) return pointOn('main', SWITCH_S + s);
  const t = TRACKS[id];
  let i = 1;
  while (i < t.pts.length - 1 && t.cum[i] < s) i++;
  const [a, b] = [t.pts[i - 1], t.pts[i]];
  const l = t.cum[i] - t.cum[i - 1] || 1;
  const f = (s - t.cum[i - 1]) / l;
  return { at: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], dir: [(b[0] - a[0]) / l, (b[1] - a[1]) / l] };
}
/** The side normal of the way a track runs: +1 its right, -1 its left (travelling +x, right is +z) */
export const sideOf = (dir: Pt, side: number): Pt => [-dir[1] * side, dir[0] * side];
/** How far along a track a point is (its nearest point on it) */
export function along(id: TrackId, p: Pt) {
  const t = TRACKS[id];
  let best = { s: 0, d: Infinity };
  for (let i = 1; i < t.pts.length; i++) {
    const [a, b] = [t.pts[i - 1], t.pts[i]];
    const v: Pt = [b[0] - a[0], b[1] - a[1]];
    const l2 = v[0] * v[0] + v[1] * v[1];
    const f = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * v[0] + (p[1] - a[1]) * v[1]) / l2)) : 0;
    const d = Math.hypot(p[0] - (a[0] + v[0] * f), p[1] - (a[1] + v[1] * f));
    if (d < best.d) best = { s: t.cum[i - 1] + Math.sqrt(l2) * f, d };
  }
  return best.s;
}

export interface Station {
  id: string;
  name: string;
  track: TrackId;
  /** The platform's middle, along its track */
  s: number;
  /** The stair tower on the ground (x0, z0, x1, z1), and its door at street level */
  tower: [number, number, number, number];
  door: { x: number; z: number };
  /** The way you face walking out of the door (unit, on the ground) */
  face: Pt;
}
/** A stair tower 2.4 by 2.5 beside the east avenue, its west face at x 69.6, centred on z; its door facing west */
const eastTower = (z: number): Pick<Station, 'tower' | 'door' | 'face'> => ({ tower: [69.6, z - 1.25, 72, z + 1.25], door: { x: 69.2, z }, face: [-1, 0] });
/** The Trenches' station on Trench Avenue: its platform south of the track, the tower on the block's sidewalk edge, its door facing north */
const TRENCH_X = -93;
const trenchTower: Pick<Station, 'tower' | 'door' | 'face'> = { tower: [TRENCH_X - 1.2, AVENUE_Z + 5.3, TRENCH_X + 1.2, AVENUE_Z + 7.8], door: { x: TRENCH_X, z: AVENUE_Z + 4.9 }, face: [0, -1] };

export const STATIONS: Station[] = [
  { id: 'kart', name: 'Kart Park', track: 'main', s: -196 - NORTH_END, ...eastTower(-196) },
  { id: 'downtown', name: 'Downtown', track: 'main', s: 33 - NORTH_END, ...eastTower(37.5) },
  { id: 'southbank', name: 'South Bank', track: 'main', s: 109 - NORTH_END, ...eastTower(109.5) },
  { id: 'trenches', name: 'The Trenches', track: 'main', s: along('main', [TRENCH_X, AVENUE_Z]), ...trenchTower },
  { id: 'airport', name: 'Airport', track: 'branch', s: 130.5 - SWITCH_Z, ...eastTower(130.5) },
];
const station = (id: string) => STATIONS.find((s) => s.id === id)!;
/** Where a station's platform is: its middle and the way its track runs there */
export const stationAt = (st: Station) => pointOn(st.track, st.s);

/* ---------- Pillars ---------- */

const ROADS = PLAN.streets.filter((s) => s.kind !== 'alley');
/** Can a pillar stand here: in an avenue's median clear of every other road, or on open ground off every road; not in the river */
function clearFor(p: Pt) {
  if (p[1] > RIVER[0] - 0.5 && p[1] < RIVER[1] + 0.5) return false;
  let median: Street | null = null;
  for (const s of ROADS) {
    const d = distToStreet(s, p);
    if (d > s.half + PILLAR_HALF + 0.3) continue;
    // In the middle of an avenue: its median
    if (s.kind === 'avenue' && d + PILLAR_HALF <= MEDIAN / 2 + 1e-6 && !median) {
      median = s;
      continue;
    }
    return false;
  }
  return true;
}
/** Pillars down each track: at each end of every stretch they can stand on and evenly between, never more than 12 apart there */
export const PILLARS: { track: TrackId; s: number; at: Pt }[] = (Object.values(TRACKS) as Track[]).flatMap((t) => {
  const step = 0.25;
  // The branch shares its first stretch with the main line's pillars north of the switch: it starts a little way out
  const s0 = t.id === 'branch' ? 2.5 : 0.5;
  const runs: [number, number][] = [];
  let start: number | null = null;
  for (let s = s0; s <= t.len - 0.5 + 1e-9; s += step) {
    const ok = clearFor(pointOn(t.id, s).at);
    if (ok && start === null) start = s;
    if ((!ok || s + step > t.len - 0.5) && start !== null) {
      runs.push([start, ok ? s : s - step]);
      start = null;
    }
  }
  return runs.flatMap(([a, b]) => {
    const n = b - a < 2 ? 0 : Math.ceil((b - a) / 12);
    return (n ? Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n) : [(a + b) / 2]).map((s) => ({ track: t.id, s, at: pointOn(t.id, s).at }));
  });
});

/** What's solid: the pillars and the stair towers (the deck is overhead) */
export const METRO_SOLIDS: Box[] = [
  ...PILLARS.map(({ at: [x, z] }): Box => [x - PILLAR_HALF, z - PILLAR_HALF, x + PILLAR_HALF, z + PILLAR_HALF, DECK_Y]),
  ...STATIONS.map((s): Box => [...s.tower, DECK_Y + 2.2]),
];

/* ---------- The train and its timetable ---------- */

/** The train: its length (two cars), top speed, how hard it pulls away and brakes, how long it waits at a station */
export const TRAIN = { len: 10, speed: 14, accel: 2.5, dwell: 8 };
/** How long it stops to turn round at South Bank on a ride from The Trenches to the Airport */
export const TURN_STOP = 2;

/**
 * A run from one distance to another (either way): how far along it is t
 * seconds in (0 to its length), easing out of one station and into the next
 */
export function runAt(dist: number, t: number) {
  const d = Math.abs(dist);
  const { speed: v, accel: a } = TRAIN;
  // Long enough to reach full speed, or a triangle profile
  const ta = Math.min(v / a, Math.sqrt(d / a));
  const vmax = a * ta;
  const cruise = Math.max(0, (d - a * ta * ta) / vmax);
  const total = 2 * ta + cruise;
  const s = (() => {
    if (t <= 0) return 0;
    if (t >= total) return d;
    if (t < ta) return 0.5 * a * t * t;
    if (t < ta + cruise) return 0.5 * a * ta * ta + vmax * (t - ta);
    const u = total - t;
    return d - 0.5 * a * u * u;
  })();
  return { s, total, speed: t > 0 && t < total ? (t < ta ? a * t : t < ta + cruise ? vmax : a * (total - t)) : 0 };
}

/** A piece of a run: along one track from one distance to another */
export interface Piece {
  track: TrackId;
  s0: number;
  s1: number;
}
/** A run between two stations without stopping: its pieces in order, and its length */
export interface Run {
  from: string;
  to: string;
  pieces: Piece[];
  len: number;
}
const runOf = (from: string, to: string, pieces: Piece[]): Run => ({ from, to, pieces, len: pieces.reduce((a, p) => a + Math.abs(p.s1 - p.s0), 0) });
/** Is a main-line station north of the switch (the branch is straight on from there) */
const northOfSwitch = (st: Station) => st.track === 'main' && st.s <= SWITCH_S;

/**
 * The runs from one station to another: straight there on one track, or
 * through the switch between the main line north of it and the branch; from
 * the west of the bend to the branch (or back) it runs to South Bank and
 * turns round there
 */
export function runsBetween(a: string, b: string): Run[] {
  const A = station(a);
  const B = station(b);
  if (A.track === B.track) return [runOf(a, b, [{ track: A.track, s0: A.s, s1: B.s }])];
  if (A.track === 'main' && northOfSwitch(A)) return [runOf(a, b, [{ track: 'main', s0: A.s, s1: SWITCH_S }, { track: 'branch', s0: 0, s1: B.s }])];
  if (B.track === 'main' && northOfSwitch(B)) return [runOf(a, b, [{ track: 'branch', s0: A.s, s1: 0 }, { track: 'main', s0: SWITCH_S, s1: B.s }])];
  return [...runsBetween(a, 'southbank'), ...runsBetween('southbank', b)];
}

/** Where a run puts the train `d` along it (past either end it carries on along its first or last piece's track): its track, distance and way */
export function placeOn(run: Run, d: number): { track: TrackId; s: number; dir: 1 | -1 } {
  let left = d;
  for (let i = 0; i < run.pieces.length; i++) {
    const p = run.pieces[i];
    const l = Math.abs(p.s1 - p.s0);
    const dir = p.s1 >= p.s0 ? 1 : -1;
    if (left <= l || i === run.pieces.length - 1) return { track: p.track, s: p.s0 + dir * (left < 0 && i > 0 ? 0 : left), dir };
    left -= l;
  }
  const p = run.pieces[0];
  return { track: p.track, s: p.s0, dir: p.s1 >= p.s0 ? 1 : -1 };
}

/** The timetable's stops: down to South Bank, out to The Trenches and back, out to the Airport and back, and up again */
const STOPS = ['kart', 'downtown', 'southbank', 'trenches', 'southbank', 'airport', 'southbank', 'downtown'];
export const LEGS = STOPS.map((from, i) => {
  const run = runsBetween(from, STOPS[(i + 1) % STOPS.length])[0];
  return { run, time: runAt(run.len, 0).total };
});
/** One round trip, in seconds */
export const ROUND_TRIP = LEGS.reduce((a, l) => a + TRAIN.dwell + l.time, 0);

/** Where the train is: its middle (track, distance, the way it faces along the track), its speed, the station it's standing at */
export interface TrainAt {
  run: Run;
  /** How far along its run (its middle) */
  d: number;
  track: TrackId;
  s: number;
  dir: 1 | -1;
  speed: number;
  at: string | null;
}

/** Where the train is at time t (seconds, any clock) on the timetable */
export function trainAt(t: number): TrainAt {
  let k = ((t % ROUND_TRIP) + ROUND_TRIP) % ROUND_TRIP;
  for (const l of LEGS) {
    if (k < TRAIN.dwell) return { run: l.run, d: 0, ...placeOn(l.run, 0), speed: 0, at: l.run.from };
    k -= TRAIN.dwell;
    if (k < l.time) {
      const r = runAt(l.run.len, k);
      return { run: l.run, d: r.s, ...placeOn(l.run, r.s), speed: r.speed, at: null };
    }
    k -= l.time;
  }
  const l = LEGS[0];
  return { run: l.run, d: 0, ...placeOn(l.run, 0), speed: 0, at: l.run.from };
}

/** A car of the train (0 the front, 1 the back) `off` along the train from its middle: its point and heading on the ground */
export function carAt(tr: { run: Run; d: number }, off: number) {
  const pl = placeOn(tr.run, tr.d + off);
  const p = pointOn(pl.track, pl.s);
  return { at: p.at, dir: [p.dir[0] * pl.dir, p.dir[1] * pl.dir] as Pt };
}

/**
 * When the timetable has the train pull in at a station having come the way
 * a ride ended (its last run's last piece): the time into the round trip,
 * so after a ride it carries on from there
 */
export function timetableAt(stationId: string, last: Piece) {
  const way = Math.sign(last.s1 - last.s0);
  let k = 0;
  let fallback = -1;
  for (const l of LEGS) {
    k += TRAIN.dwell + l.time;
    if (l.run.to !== stationId) continue;
    const p = l.run.pieces[l.run.pieces.length - 1];
    if (p.track === last.track && Math.sign(p.s1 - p.s0) === way) return (k % ROUND_TRIP) + 1e-3;
    if (fallback < 0) fallback = (k % ROUND_TRIP) + 1e-3;
  }
  return fallback;
}

/** A ride from one station to another: its runs (with a stop to turn round between two), how long it takes, and where the train is t seconds in */
export function rideAt(from: string, to: string, t: number) {
  const runs = runsBetween(from, to);
  const times = runs.map((r) => runAt(r.len, 0).total);
  const total = times.reduce((a, b) => a + b, 0) + TURN_STOP * (runs.length - 1);
  let k = Math.max(0, t);
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    if (k <= times[i] || i === runs.length - 1) {
      const r = runAt(run.len, Math.min(k, times[i]));
      return { run, d: r.s, ...placeOn(run, r.s), speed: r.speed, total, runs };
    }
    k -= times[i];
    if (k < TURN_STOP) return { run, d: run.len, ...placeOn(run, run.len), speed: 0, total, runs };
    k -= TURN_STOP;
  }
  const run = runs[runs.length - 1];
  return { run, d: run.len, ...placeOn(run, run.len), speed: 0, total, runs };
}
