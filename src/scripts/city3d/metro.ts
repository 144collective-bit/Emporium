/*
 * The Sector 7 Metro (docs/growth-plan.md Phases 8 and 9; DOM-free, tested
 * in tests/metro.test.ts): an elevated line on a viaduct from the kart park
 * in the north, down the east ring avenue's median over downtown's east side
 * and the river to South Bank; there it bends west (the owner's call, with
 * The Trenches) and runs south of the town's south row and on over Trench
 * Avenue's median to The Trenches, and on (docs/finance-plan.md Phase 7)
 * round a tight bend north, over the river on a steel arch, to Uptown. The
 * Airport's branch carries straight on south from the bend.
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
 *   stand. Where the line runs over a street with no median, portal frames
 *   (`PORTALS`: a leg each side, on the blocks' edges), and over the river to
 *   Uptown the arch (`ARCH`), its deck hung from it (`HANGERS`).
 * - **Crestmont's spur** (`crest`, docs/crestmont-plan.md Phase 9): from just
 *   south of Kart Park east round the highway's north-east corner and south
 *   to Crestmont station by the Flats (`CREST`).
 * - **The train** shuttles on a timetable from the clock (`trainAt()`, the
 *   same for everyone): Kart Park, Downtown, South Bank, The Trenches,
 *   Uptown, back through The Trenches to South Bank, out to the Airport,
 *   back, and up to the Kart Park. A ride (`rideAt()`) goes straight to the
 *   station you pick (from the west to the Airport it turns round at South
 *   Bank), and the train carries on its timetable from there
 *   (`timetableAt()`).
 *
 * Built over the avenues' medians and on open land clear of the pads and
 * the blocks, so nothing that exists moves.
 */
import { MEDIAN, NS_ROADS, RIVER, WIDEN } from './layout';
import { PLAN, distToStreet, type Street } from './streetplan';
import { AVENUE_Z, NS_X } from './trenches';
import type { Box } from './solids';

export type Pt = [number, number];
export type TrackId = 'main' | 'branch' | 'crest';

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
export const SWITCH_Z = 116 + WIDEN;
/** The bend's radius: it comes out of it running west along Trench Avenue */
export const BEND_R = AVENUE_Z - SWITCH_Z;
/** The north end of the main line (past the Kart Park's station) */
export const NORTH_END = -204;
/**
 * Uptown's extension (docs/finance-plan.md Phase 7 step 6, the owner's pick): on west past The Trenches along Trench
 * Avenue's median to `WEST_END`, round a tight bend (`UP_R`) into the cross street at `UP_X` (in line with the one-way
 * pair's northbound street), north up it on portal frames (`PORTALS`), over the river on a steel arch with nothing in
 * the water (`ARCH`), and up the pair's street to Uptown station, the line's end at `UP_END` (z)
 */
export const UP_X = NS_X[1];
export const UP_R = 8;
export const WEST_END = UP_X + UP_R;
export const UP_END = 46;
/**
 * The Airport's branch (since the airport moved out to the world's south edge, docs/airport-plan.md Phase 3 step 2):
 * straight on south from the switch down the avenue's median to `BRANCH.south`, a quarter bend east (`BRANCH.r`),
 * and east along `BRANCH.z` over the airport's old land and the highway's bend, over Airport Drive, to the station
 * by the drive just north of the terminal's forecourt, the line's end at `AIRPORT_END` (x)
 */
export const BRANCH = { south: 256, r: 20, z: 276 };
export const AIRPORT_END = 324;
/**
 * Crestmont's spur (docs/crestmont-plan.md Phase 9, the owner's call): off the main line just south of Kart Park
 * station (`CREST.z`), a tight bend east (`CREST.r`) into the corridor between Kart Road and the ring highway's north
 * side (`CREST.corridor`), east past the kart park, round outside the highway's north-east corner on a bend about its
 * own centre (`CREST.cx`, `CREST.cz`), south down the strip between the highway and Alder Way (`CREST.x`), and a tight
 * bend east over Alder Way into the block kept for it (crest-0-0) to Crestmont station, the line's end at `CREST_END`
 * (x). It leaves the main line facing north: a run from it to anywhere but Kart Park turns round there.
 */
export const CREST = { z: -189.5, r: 10, corridor: -179.5, cx: 205, cz: -100, x: 284.5, south: -46.5, station: -36.5 };
export const CREST_END = 320;

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
/** A quarter circle about (cx, cz) from angle a0 to a1, about every half tile, its first point left out */
const arc = (cx: number, cz: number, r: number, a0: number, a1: number): Pt[] =>
  Array.from({ length: 45 }, (_, k): Pt => {
    const a = a0 + ((k + 1) / 45) * (a1 - a0);
    return [cx + r * Math.cos(a), cz + r * Math.sin(a)];
  });
export const TRACKS: Record<TrackId, Track> = {
  main: track('main', [[LINE_X, NORTH_END], [LINE_X, SWITCH_Z], ...BEND, [WEST_END, AVENUE_Z], ...arc(WEST_END, AVENUE_Z - UP_R, UP_R, Math.PI / 2, Math.PI), [UP_X, UP_END]]),
  branch: track('branch', [[LINE_X, SWITCH_Z], [LINE_X, BRANCH.south], ...arc(LINE_X + BRANCH.r, BRANCH.south, BRANCH.r, Math.PI, Math.PI / 2), [AIRPORT_END, BRANCH.z]]),
  crest: track('crest', [
    [LINE_X, CREST.z],
    ...arc(LINE_X + CREST.r, CREST.z, CREST.r, Math.PI, Math.PI / 2),
    [CREST.cx, CREST.corridor],
    ...arc(CREST.cx, CREST.cz, CREST.x - CREST.cx, -Math.PI / 2, 0),
    [CREST.x, CREST.south],
    ...arc(CREST.x + CREST.r, CREST.south, CREST.r, Math.PI, Math.PI / 2),
    [CREST_END, CREST.station],
  ]),
};
/** The switch: how far along the main line the branch leaves it (the branch starts there, at its 0) */
export const SWITCH_S = SWITCH_Z - NORTH_END;
/** Where Crestmont's spur leaves the main line (its 0) */
export const CREST_S = CREST.z - NORTH_END;
/** How far along the main line each spur leaves it */
const JUNCTION: Record<Exclude<TrackId, 'main'>, number> = { branch: SWITCH_S, crest: CREST_S };

/**
 * A point on a track `s` along it, and the way the track runs there (unit).
 * Past either end it carries on straight (a train's cars reaching past a
 * station at the end of the line); the branch before its start is the main
 * line north of the switch.
 */
export function pointOn(id: TrackId, s: number): { at: Pt; dir: Pt } {
  if (id !== 'main' && s < 0) return pointOn('main', JUNCTION[id] + s);
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
  /** Which side of the track its platform is on (`PLATFORM_SIDE` but where the ground's only clear on the other) */
  side?: 1 | -1;
}
/** A stair tower 2.4 by 2.5 beside the east avenue, its west face at x 69.6, centred on z; its door facing west */
/** The Airport's station's middle along its track (east of Airport Drive) */
const AIRPORT_STATION_X = 312;
/** Crestmont station's middle along its track (past Alder Way) */
const CREST_STATION_X = 312;
const eastTower = (z: number): Pick<Station, 'tower' | 'door' | 'face'> => ({ tower: [69.6, z - 1.25, 72, z + 1.25], door: { x: 69.2, z }, face: [-1, 0] });
/** Uptown station's middle (z, over the pair's street at `UP_X`) */
const UPTOWN_Z = 52.5;
/** The Trenches' station on Trench Avenue: its platform south of the track, the tower on the block's sidewalk edge, its door facing north */
const TRENCH_X = -93;
const trenchTower: Pick<Station, 'tower' | 'door' | 'face'> = { tower: [TRENCH_X - 1.2, AVENUE_Z + 5.3, TRENCH_X + 1.2, AVENUE_Z + 7.8], door: { x: TRENCH_X, z: AVENUE_Z + 4.9 }, face: [0, -1] };

export const STATIONS: Station[] = [
  { id: 'kart', name: 'Kart Park', track: 'main', s: -196 - NORTH_END, ...eastTower(-196) },
  { id: 'downtown', name: 'Downtown', track: 'main', s: 33 - NORTH_END, ...eastTower(37.5) },
  { id: 'southbank', name: 'South Bank', track: 'main', s: 109 + WIDEN - NORTH_END, ...eastTower(109.5 + WIDEN) },
  { id: 'trenches', name: 'The Trenches', track: 'main', s: along('main', [TRENCH_X, AVENUE_Z]), ...trenchTower },
  // (by Airport Drive just north of the terminal's forecourt: its platform north of the track (running east), its tower
  // north of that, the door facing the track and the forecourt; taxis stop for it on the drive)
  { id: 'airport', name: 'Airport', track: 'branch', s: along('branch', [AIRPORT_STATION_X, BRANCH.z]), tower: [AIRPORT_STATION_X - 1.25, BRANCH.z - 7.5, AIRPORT_STATION_X + 1.25, BRANCH.z - 5.1], door: { x: AIRPORT_STATION_X, z: BRANCH.z - 4.7 }, face: [0, 1] },
  // (over the one-way pair's northbound street by the plaza's café terrace: its platform east of the track, over the
  // street's sidewalk, its tower on the terrace north of the café's kiosk, the door facing the cross street)
  { id: 'uptown', name: 'Uptown', track: 'main', s: along('main', [UP_X, UPTOWN_Z]), tower: [UP_X + 2.85, UPTOWN_Z - 4.9, UP_X + 5.25, UPTOWN_Z - 2.4], door: { x: UP_X + 4.05, z: UPTOWN_Z - 5.3 }, face: [0, -1], side: 1 },
  // (on the block kept for it past Alder Way: its platform north of the track (running east), its tower north of that,
  // the door facing north onto the block's lawn)
  { id: 'crestmont', name: 'Crestmont', track: 'crest', s: along('crest', [CREST_STATION_X, CREST.station]), tower: [CREST_STATION_X - 1.25, CREST.station - 5.6, CREST_STATION_X + 1.25, CREST.station - 3.2], door: { x: CREST_STATION_X, z: CREST.station - 6 }, face: [0, -1] },
];
const station = (id: string) => STATIONS.find((s) => s.id === id)!;
/** Where a station's platform is: its middle and the way its track runs there */
export const stationAt = (st: Station) => pointOn(st.track, st.s);
/** Which side of its track a station's platform is on */
export const sideAt = (st: Station) => st.side ?? PLATFORM_SIDE;

/* ---------- Uptown's extension: portal frames and the arch ---------- */

/**
 * The steel arch over the river, nothing standing in the water: two ribs either side of the deck (`half` off the
 * track), springing from the ground at `z0` (south, in the cross street's block edges in The Trenches) and `z1` (north,
 * on Uptown's esplanade, between the avenue and the joggers' lane), its crown `top` over the ground (well under what flies over: the prop plane turns south over
 * it), the deck hung from it on hangers every `hang`
 */
export const ARCH = { x: UP_X, z0: 163.5, z1: 69.35, half: 2.75, top: 16, hang: 4, rib: 0.35 };
/** The ribs' height over the ground at z (0 at the feet) */
export const archY = (z: number) => {
  const u = (ARCH.z0 - z) / (ARCH.z0 - ARCH.z1);
  return u <= 0 || u >= 1 ? 0 : ARCH.top * 4 * u * (1 - u);
};
/** Portal frames holding the deck where the line runs over a street with no median: two legs `half` off the track */
export const PORTAL = { half: ARCH.half, leg: 0.25 };
export const PORTALS: { track: TrackId; s: number; at: Pt }[] = [ARCH.z0, ARCH.z1, 58.6, UP_END + 0.4].map((z) => {
  const s = along('main', [UP_X, z]);
  return { track: 'main', s, at: pointOn('main', s).at };
});
/** Where the arch holds the deck up between its feet (on hangers, or on posts from the ribs near the feet) */
export const HANGERS: number[] = (() => {
  const [a, b] = [along('main', [UP_X, ARCH.z0]), along('main', [UP_X, ARCH.z1])];
  const n = Math.ceil((b - a) / ARCH.hang);
  return Array.from({ length: n - 1 }, (_, i) => a + ((b - a) * (i + 1)) / n);
})();

/* ---------- Pillars ---------- */

const ROADS = PLAN.streets.filter((s) => s.kind !== 'alley');
/**
 * Can a pillar stand here: in an avenue's median clear of every other road, or on open ground off every road; over
 * the river only in the median of the bridge it crosses on (the east avenue's, river plan step 1); never under the arch
 */
function clearFor(p: Pt) {
  // (between the arch's feet its deck hangs from it: nothing stands under it)
  if (Math.abs(p[0] - ARCH.x) < 0.5 && p[1] > ARCH.z1 - 1 && p[1] < ARCH.z0 + 1) return false;
  const wet = p[1] > RIVER[0] - 0.5 && p[1] < RIVER[1] + 0.5;
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
  return !wet || median !== null;
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

/** The land under Crestmont's spur where nothing grows (the outskirts' trees, the Flats' palms): a box every few tiles along it, past the main line */
export const SPUR_CLEAR: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  for (let s = 12; s <= TRACKS.crest.len; s += 5) {
    const [x, z] = pointOn('crest', s).at;
    out.push([x - 4, z - 4, x + 4, z + 4]);
  }
  return out;
})();
/** Under Crestmont's spur (`SPUR_CLEAR`) */
export const underSpur = (x: number, z: number) => SPUR_CLEAR.some((r) => x > r[0] && x < r[2] && z > r[1] && z < r[3]);

/** What's solid: the pillars, the portals' legs (the arch's feet among them) and the stair towers (the deck is overhead) */
export const METRO_SOLIDS: Box[] = [
  ...PILLARS.map(({ at: [x, z] }): Box => [x - PILLAR_HALF, z - PILLAR_HALF, x + PILLAR_HALF, z + PILLAR_HALF, DECK_Y]),
  ...PORTALS.flatMap(({ at: [x, z] }) => [-1, 1].map((k): Box => [x + k * PORTAL.half - PORTAL.leg, z - PORTAL.leg, x + k * PORTAL.half + PORTAL.leg, z + PORTAL.leg, DECK_Y])),
  ...STATIONS.map((s): Box => [...s.tower, DECK_Y + 2.2]),
];

/* ---------- The train and its timetable ---------- */

/**
 * The train: its length (two cars), top speed, how hard it pulls away and brakes, how long it waits at a station;
 * on the runs out to the Airport and back, the long way out to the world's south edge, it goes faster (`express`)
 */
export const TRAIN = { len: 10, speed: 14, accel: 2.5, dwell: 8, express: 24 };
/** How long it stops to turn round at South Bank on a ride from The Trenches to the Airport */
export const TURN_STOP = 2;

/**
 * A run from one distance to another (either way): how far along it is t
 * seconds in (0 to its length), easing out of one station and into the next
 */
export function runAt(dist: number, t: number, v = TRAIN.speed) {
  const d = Math.abs(dist);
  const { accel: a } = TRAIN;
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

/** Where Uptown's extension begins along the main line (past The Trenches' station) */
const WEST_S = along('main', [TRENCH_X, AVENUE_Z]) + 1;
/** How fast a run goes: the express out on the Airport's branch and out to Uptown */
export const speedOf = (run: { pieces: { track: TrackId; s0: number; s1: number }[] }) =>
  run.pieces.some((p) => p.track !== 'main' || Math.max(p.s0, p.s1) > WEST_S) ? TRAIN.express : TRAIN.speed;

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
  // Crestmont's spur leaves the main line facing north, past Kart Park: straight to and from there, turning round there for the rest
  if (A.track === 'crest' || B.track === 'crest') {
    if (a === 'kart') return [runOf(a, b, [{ track: 'main', s0: A.s, s1: CREST_S }, { track: 'crest', s0: 0, s1: B.s }])];
    if (b === 'kart') return [runOf(a, b, [{ track: 'crest', s0: A.s, s1: 0 }, { track: 'main', s0: CREST_S, s1: B.s }])];
    return [...runsBetween(a, 'kart'), ...runsBetween('kart', b)];
  }
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

/** The timetable's stops: from Crestmont to Kart Park, down to South Bank, out through The Trenches to Uptown and back, out to the Airport and back, and up again */
const STOPS = ['crestmont', 'kart', 'downtown', 'southbank', 'trenches', 'uptown', 'trenches', 'southbank', 'airport', 'southbank', 'downtown', 'kart'];
export const LEGS = STOPS.map((from, i) => {
  const run = runsBetween(from, STOPS[(i + 1) % STOPS.length])[0];
  return { run, time: runAt(run.len, 0, speedOf(run)).total };
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
      const r = runAt(l.run.len, k, speedOf(l.run));
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
  const times = runs.map((r) => runAt(r.len, 0, speedOf(r)).total);
  const total = times.reduce((a, b) => a + b, 0) + TURN_STOP * (runs.length - 1);
  let k = Math.max(0, t);
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    if (k <= times[i] || i === runs.length - 1) {
      const r = runAt(run.len, Math.min(k, times[i]), speedOf(run));
      return { run, d: r.s, ...placeOn(run, r.s), speed: r.speed, total, runs };
    }
    k -= times[i];
    if (k < TURN_STOP) return { run, d: run.len, ...placeOn(run, run.len), speed: 0, total, runs };
    k -= TURN_STOP;
  }
  const run = runs[runs.length - 1];
  return { run, d: run.len, ...placeOn(run, run.len), speed: 0, total, runs };
}
