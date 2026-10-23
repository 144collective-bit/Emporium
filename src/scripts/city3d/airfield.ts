/*
 * Sector 7 Airport, DOM-free like the street plan: where everything is
 * (south-east of the Southside Loop, east of the x = 64.5 avenue, where no
 * road runs), what's solid for walking and driving, the access road and its
 * loop round the car park, and every aircraft's schedule.
 *
 * A flight is a loop of acts: rolling or flying along waypoints (corners
 * rounded off, altitude and speed eased between them), holding still,
 * turning on the spot, or lifting straight up or down. `poseAt()` turns the
 * time into a position, heading, pitch, bank, gear and power. It's a
 * function of the time only, the same for everyone. airport.ts draws it all.
 */
import { NS_ROADS, RIVER, SEATS, SOUTH_SHIFT as D } from './layout';

/** The middle of the river (the prop plane flies along it) */
const RIVER_MID = (RIVER[0] + RIVER[1]) / 2;

export type Pt = [number, number];
export type Rect = [number, number, number, number];
/** x0, z0, x1, z1, height (solids.ts `Box`) */
export type Footprint = [number, number, number, number, number];

/* ---------- The layout ---------- */

/** The east ring avenue the access road leaves from */
const AVENUE = NS_ROADS.at(-1)!;
/** The whole airport, landside and airside (no trees in here) */
/* Written before the river was widened: every z south of it adds `D` (layout.ts SOUTH_SHIFT), so the airport kept its place past the Southside Loop.
   Fixed numbers, not the world's edge (growth plan Phase 5): when the edge moves out, the airport stays where it is */
export const SITE: Rect = [AVENUE.c + AVENUE.half + 1.2, 112.5 + D, 234, 234];

/** The runway: east-west, landings and take-offs eastwards */
export const RUNWAY = { x0: 92, x1: 232, z: 198 + D, half: 4 };
/** The parallel taxiway and the connectors down to the runway at both ends */
export const TAXIWAY = { x0: 93.5, x1: 222.5, z: 176 + D, half: 2.5 };
export const CONNECTORS = [96, 220];
/** The apron between the terminal and the taxiway */
export const APRON: Rect = [94, 143 + D, 218, TAXIWAY.z - TAXIWAY.half];
/** Approach lights out past the runway's west end */
export const APPROACH = { x0: 74, x1: RUNWAY.x0 - 1.5, z: RUNWAY.z };

/** The terminal: glass front to the road, airbridges to the stands behind */
export const TERMINAL: Footprint = [95, 131 + D, 165, 143 + D, 5.6];
/** Jet stands, nose in to the terminal (facing north, -z) */
export const STANDS: Pt[] = [107, 130, 153].map((x): Pt => [x, 154.5 + D]);
/** The control tower, east of the terminal: kept under the Emporium's height */
export const TOWER = { x: 171, z: 136 + D, r: 1.5, cab: 9, top: 11.6 };
/** The hangar: opens south onto the apron, the prop plane's stand in front of its west half */
export const HANGAR: Footprint = [178, 126 + D, 198, 145 + D, 7.4];
export const PROP_STAND: Pt = [181.5, 155 + D];
/** Under the hangar's arched roof (from the top of its walls): what flies in or out keeps under it */
export const HANGAR_ROOF: Footprint = [HANGAR[0], HANGAR[1], HANGAR[2], HANGAR[3], 4.2];
/** Your own aircraft (Phase 2) stands in the hangar's east half, nose to the doors, clear of the prop plane's stand */
export const HANGAR_SPOT = { x: 192.8, z: 136 + D, yaw: -Math.PI / 2 };
/** The hangar office on its east side; its door opens the hangar menu */
export const HANGAR_OFFICE: Footprint = [HANGAR[2], HANGAR[3] - 5, HANGAR[2] + 3.2, HANGAR[3], 2.6];
export const HANGAR_DOOR = { x: HANGAR[2] + 1.4, z: HANGAR[3] + 0.55 };
/** The airport panel's Walk in: walk mode starts on the apron by the office door, looking into the hangar */
export const AIR_SPAWN = (() => {
  const [x, z] = [HANGAR_DOOR.x - 0.6, HANGAR_DOOR.z + 2.4];
  return { x, z, yaw: Math.atan2(-(HANGAR_SPOT.x - x), -(HANGAR_SPOT.z - z)) };
})();
/** The helipad at the apron's east end */
export const HELIPAD = { x: 208, z: 154 + D, r: 4.5 };
/** Floodlight masts along the terminal, between the stands' wingtips */
export const MASTS: Pt[] = [
  [118.5, 145.5 + D],
  [141.5, 145.5 + D],
  [166.5, 162 + D],
];
/** A windsock on the grass between the taxiway and the runway */
export const WINDSOCK: Pt = [104, 186 + D];

/** The access road: east off the avenue along the terminal's front, round a one-way loop that holds the car park */
export const ROAD = { z: 127 + D, x0: AVENUE.c, x1: 168, loopZ: 115 + D, loopX: 98, half: 1.7 };
export const AIRPORT_STREETS: { id: string; pts: Pt[] }[] = [
  {
    id: 'airport-road',
    pts: [
      [ROAD.x0, ROAD.z],
      [ROAD.x1, ROAD.z],
    ],
  },
  {
    id: 'airport-loop',
    pts: [
      [ROAD.loopX, ROAD.z],
      [ROAD.loopX, ROAD.loopZ],
      [ROAD.x1, ROAD.loopZ],
      [ROAD.x1, ROAD.z],
    ],
  },
];
/** The car park inside the loop: two rows of bays, nose to nose */
export const CAR_PARK: Rect = [ROAD.loopX + ROAD.half + 0.6, ROAD.loopZ + ROAD.half + 0.4, ROAD.x1 - ROAD.half - 0.6, ROAD.z - ROAD.half - 0.4];
/** Parked cars: model, x, z, heading (yaw, as cars.ts turns them), colour */
export const PARKED: [string, number, number, number, string][] = (() => {
  const out: [string, number, number, number, string][] = [];
  const models = ['hatch', 'sedan', 'pickup', 'hatch', 'coupe', 'van', 'sedan'];
  const colours = ['#e23b3b', '#2aabee', '#ffd23f', '#f3f2f7', '#8000ff', '#1fbf6b', '#ff8a3d', '#2b2d3a'];
  const [x0, z0, x1, z1] = CAR_PARK;
  const rows = [z0 + 1.6, z1 - 1.6];
  let k = 0;
  for (let x = x0 + 1.2; x < x1 - 1; x += 1.7)
    rows.forEach((z, r) => {
      // About half the bays taken, the same ones every visit
      if (Math.abs(Math.sin(x * 12.9898 + r * 78.233) * 43758.5453) % 1 < 0.45) return;
      out.push([models[k % models.length], x, z, r === 0 ? Math.PI / 2 : -Math.PI / 2, colours[k % colours.length]]);
      k++;
    });
  return out;
})();
/** How big a parked car's footprint is (the longest model, either way round) */
const CAR_HALF = { l: 1.35, w: 0.6 };

/** Ground vehicles parked on the apron: a fuel truck, a baggage tug and carts, a stairs truck */
export const APRON_KIT: { kind: 'fuel' | 'tug' | 'stairs'; at: Pt; yaw: number }[] = [
  { kind: 'fuel', at: [119, 168 + D], yaw: 0 },
  { kind: 'tug', at: [142, 168.5 + D], yaw: Math.PI },
  { kind: 'stairs', at: [174, 166 + D], yaw: Math.PI / 2 },
];
const KIT_HALF = { fuel: [1.6, 0.6], tug: [2.4, 0.5], stairs: [1.3, 0.55] } as const;

/** Airbridges: from the terminal's airside to each jet's front left door */
export const AIRBRIDGES: { x: number; z0: number; z1: number }[] = STANDS.map(([x]) => ({ x: x - 3.2, z0: TERMINAL[3], z1: STANDS[0][1] - 7.3 }));

/** What's solid at the airport for walking and driving (the ground itself is open) */
export const AIRPORT_SOLIDS: Footprint[] = [
  TERMINAL,
  [TOWER.x - TOWER.r, TOWER.z - TOWER.r, TOWER.x + TOWER.r, TOWER.z + TOWER.r, TOWER.top],
  // The hangar's walls and back (its front stands open)
  [HANGAR[0], HANGAR[1], HANGAR[0] + 0.4, HANGAR[3], HANGAR[4]],
  [HANGAR[2] - 0.4, HANGAR[1], HANGAR[2], HANGAR[3], HANGAR[4]],
  [HANGAR[0], HANGAR[1], HANGAR[2], HANGAR[1] + 0.4, HANGAR[4]],
  HANGAR_OFFICE,
  ...MASTS.map(([x, z]): Footprint => [x - 0.2, z - 0.2, x + 0.2, z + 0.2, 8]),
  [WINDSOCK[0] - 0.1, WINDSOCK[1] - 0.1, WINDSOCK[0] + 0.1, WINDSOCK[1] + 0.1, 3],
  // Each airbridge's wheeled leg
  ...AIRBRIDGES.map((a): Footprint => [a.x - 0.5, a.z1 - 1.2, a.x + 0.5, a.z1 - 0.4, 2.2]),
  ...APRON_KIT.map(({ kind, at: [x, z], yaw }): Footprint => {
    const [l, w] = KIT_HALF[kind];
    const along = Math.abs(Math.cos(yaw)) > 0.5;
    return along ? [x - l, z - w, x + l, z + w, 1.6] : [x - w, z - l, x + w, z + l, 1.6];
  }),
  ...PARKED.map(([, x, z]): Footprint => [x - CAR_HALF.w, z - CAR_HALF.l, x + CAR_HALF.w, z + CAR_HALF.l, 1.2]),
];

/** The Emporium, which the helicopter circles */
const EMPORIUM: Pt = [SEATS['11,11'][0] + 4.5, SEATS['11,11'][1] + 4.5];

/* ---------- Paths: waypoints with rounded corners, altitude and speed eased between ---------- */

/** A waypoint: where (x, z), how high and how fast (tiles a second) */
export interface Way {
  at: Pt;
  y: number;
  v: number;
}
interface Path {
  pts: Pt[];
  cum: number[];
  len: number;
  /** Arc length at each waypoint (a corner's is the middle of its curve) */
  ws: number[];
  ways: Way[];
  /** Altitude slopes at each waypoint (monotone cubic) */
  m: number[];
  /** Time to cover each stretch between waypoints, and their running total */
  dt: number[];
  t: number[];
}

/** Waypoints joined by straight runs, each corner rounded off with radius `r` (less if the runs are short) */
function roundPath(ways: Way[], r: number): Path {
  const pts: Pt[] = [];
  const corner: number[] = [];
  const P = ways.map((w) => w.at);
  pts.push(P[0]);
  for (let i = 1; i < P.length - 1; i++) {
    const [a, b, c] = [P[i - 1], P[i], P[i + 1]];
    const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const u1: Pt = [(b[0] - a[0]) / l1, (b[1] - a[1]) / l1];
    const u2: Pt = [(c[0] - b[0]) / l2, (c[1] - b[1]) / l2];
    const phi = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1])));
    if (phi < 1e-3 || r <= 0) {
      corner.push(pts.length);
      pts.push(b);
      continue;
    }
    const d = Math.min(r * Math.tan(phi / 2), l1 / 2, l2 / 2);
    const rr = d / Math.tan(phi / 2);
    const A: Pt = [b[0] - u1[0] * d, b[1] - u1[1] * d];
    const turn = Math.sign(u1[0] * u2[1] - u1[1] * u2[0]);
    // The centre is to the turn's side of the incoming run
    const cx = A[0] - u1[1] * turn * rr;
    const cz = A[1] + u1[0] * turn * rr;
    const a0 = Math.atan2(A[1] - cz, A[0] - cx);
    const n = Math.max(2, Math.ceil((phi * rr) / 0.8));
    const start = pts.length;
    for (let k = 0; k <= n; k++) {
      const a = a0 + turn * phi * (k / n);
      pts.push([cx + Math.cos(a) * rr, cz + Math.sin(a) * rr]);
    }
    // A corner's waypoint sits in the middle of its curve
    corner.push(start + n / 2);
  }
  pts.push(P.at(-1)!);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const at = (k: number) => {
    const i = Math.floor(k);
    return i === k ? cum[i] : cum[i] + (cum[i + 1] - cum[i]) * (k - i);
  };
  const ws = [0, ...corner.map(at), cum.at(-1)!];
  // Monotone cubic slopes for the altitude (Fritsch-Carlson): no overshoot, flat where it levels off
  const h = ws.slice(1).map((s, i) => s - ws[i] || 1e-6);
  const dl = h.map((hi, i) => (ways[i + 1].y - ways[i].y) / hi);
  const m = ways.map((_, i) => (i === 0 ? dl[0] : i === ways.length - 1 ? dl.at(-1)! : dl[i - 1] * dl[i] <= 0 ? 0 : (dl[i - 1] + dl[i]) / 2));
  for (let i = 0; i < dl.length; i++) {
    if (dl[i] === 0) {
      m[i] = m[i + 1] = 0;
      continue;
    }
    const a = m[i] / dl[i];
    const b = m[i + 1] / dl[i];
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      m[i] = tau * a * dl[i];
      m[i + 1] = tau * b * dl[i];
    }
  }
  // Speed eases linearly in time between waypoints: each stretch takes 2L / (v0 + v1)
  const dt = h.map((hi, i) => (2 * hi) / Math.max(0.05, ways[i].v + ways[i + 1].v));
  const t = [0];
  for (const d of dt) t.push(t.at(-1)! + d);
  return { pts, cum, len: cum.at(-1)!, ws, ways, m, dt, t };
}

/** Where along the path's line `s` falls: the point and the direction there */
function along(p: Path, s: number): { at: Pt; dir: Pt } {
  s = Math.max(0, Math.min(p.len, s));
  let lo = 0;
  let hi = p.cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (p.cum[mid] <= s) lo = mid;
    else hi = mid;
  }
  const [a, b] = [p.pts[lo], p.pts[hi]];
  const l = p.cum[hi] - p.cum[lo] || 1;
  const f = (s - p.cum[lo]) / l;
  return { at: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], dir: [(b[0] - a[0]) / l, (b[1] - a[1]) / l] };
}

/** The altitude at `s` along the path, and its slope */
function altitude(p: Path, s: number): { y: number; dy: number } {
  let i = 0;
  while (i < p.ws.length - 2 && p.ws[i + 1] < s) i++;
  const h = p.ws[i + 1] - p.ws[i] || 1e-6;
  const f = Math.max(0, Math.min(1, (s - p.ws[i]) / h));
  const [y0, y1, m0, m1] = [p.ways[i].y, p.ways[i + 1].y, p.m[i] * h, p.m[i + 1] * h];
  const f2 = f * f;
  const f3 = f2 * f;
  const y = (2 * f3 - 3 * f2 + 1) * y0 + (f3 - 2 * f2 + f) * m0 + (-2 * f3 + 3 * f2) * y1 + (f3 - f2) * m1;
  const dy = ((6 * f2 - 6 * f) * y0 + (3 * f2 - 4 * f + 1) * m0 + (-6 * f2 + 6 * f) * y1 + (3 * f2 - 2 * f) * m1) / h;
  return { y, dy };
}

/* ---------- Aircraft and their schedules ---------- */

export type AircraftKind = 'jet' | 'prop' | 'heli';
/** How far apart two aircraft must stay (centre to centre): about half a wingspan or rotor each, and a margin */
export const REACH: Record<AircraftKind, number> = { jet: 10, prop: 3.6, heli: 3.6 };

type Act =
  | { kind: 'fly'; path: Path; reverse?: boolean; dur: number }
  | { kind: 'hold'; dur: number; power?: [number, number] }
  | { kind: 'turn'; dur: number; to: number }
  | { kind: 'lift'; dur: number; to: number };

/** Where an aircraft is and how it sits: heading as cars.ts turns them (model faces +x), bank positive into a right turn */
export interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  /** Ground speed (tiles a second) */
  v: number;
  /** On the ground (rolling or parked) */
  ground: boolean;
  /** Wheels down */
  gear: boolean;
  /** Engines / rotor, 0 stopped to 1 running */
  power: number;
}

export interface Flight {
  id: string;
  kind: AircraftKind;
  acts: Act[];
  /** Pose at the start of each act */
  starts: Pose[];
  cycle: number;
  /** Seconds into its cycle at time 0 */
  offset: number;
  /** Where it stands under reduced motion */
  parked: Pose;
}

const yawOf = (d: Pt) => Math.atan2(-d[1], d[0]);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Pose `tau` seconds into a fly act */
function flyPose(act: Extract<Act, { kind: 'fly' }>, tau: number, kind: AircraftKind): Pose {
  const p = act.path;
  let i = 0;
  while (i < p.dt.length - 1 && p.t[i + 1] <= tau) i++;
  const T = p.dt[i];
  const u = Math.max(0, Math.min(T, tau - p.t[i]));
  const [v0, v1] = [p.ways[i].v, p.ways[i + 1].v];
  const s = p.ws[i] + v0 * u + ((v1 - v0) * u * u) / (2 * T);
  const v = v0 + ((v1 - v0) * u) / T;
  const here = along(p, s);
  // Heading from a little either side, and how fast it's turning (for the bank)
  const back = along(p, s - 1.2);
  const ahead = along(p, s + 1.2);
  const dir: Pt = [ahead.at[0] - back.at[0], ahead.at[1] - back.at[1]];
  const dl = Math.hypot(...dir) || 1;
  const h0 = along(p, s - 2.5).dir;
  const h1 = along(p, s + 2.5).dir;
  const turn = Math.asin(Math.max(-1, Math.min(1, h0[0] * h1[1] - h0[1] * h1[0]))) / 5;
  const { y, dy } = altitude(p, s);
  const ground = y < 0.02;
  const yaw = yawOf([dir[0] / dl, dir[1] / dl]) + (act.reverse ? Math.PI : 0);
  let pitch = act.reverse ? 0 : Math.atan(dy);
  let roll = ground ? 0 : Math.max(-0.55, Math.min(0.55, turn * v * 1.1));
  // A helicopter dips its nose to fly forward
  if (kind === 'heli') {
    pitch = -Math.min(0.2, v * 0.014) + Math.atan(dy) * 0.3;
    roll = Math.max(-0.35, Math.min(0.35, turn * v * 0.9));
  }
  const gear = kind === 'heli' || ground || y < 9 || (dy < -0.02 && y < 22);
  return { x: here.at[0], y, z: here.at[1], yaw: wrap(yaw), pitch, roll, v, ground, gear, power: 1 };
}

function poseIn(f: Flight, k: number, tau: number): Pose {
  const act = f.acts[k];
  const start = f.starts[k];
  if (act.kind === 'fly') return flyPose(act, tau, f.kind);
  const e = Math.max(0, Math.min(1, tau / act.dur));
  const ease = e * e * (3 - 2 * e);
  if (act.kind === 'hold') {
    const power = act.power ? act.power[0] + (act.power[1] - act.power[0]) * e : start.power;
    return { ...start, v: 0, roll: 0, pitch: f.kind === 'heli' && start.y > 0.05 ? 0 : start.pitch, power };
  }
  if (act.kind === 'turn') return { ...start, v: 0, roll: 0, yaw: wrap(start.yaw + wrap(act.to - start.yaw) * ease) };
  return { ...start, v: 0, roll: 0, pitch: 0, y: start.y + (act.to - start.y) * ease, ground: start.y + (act.to - start.y) * ease < 0.02 };
}

/** Every schedule repeats over the same few minutes, so the timetable never drifts */
export const PERIOD = 240;

/**
 * Build a flight on the timetable: the hold at `fill` stretches so the loop
 * takes `cycle` seconds, and the act `at` (its take-off) starts at `when`
 * seconds into the period. The first act must be a fly act.
 */
function flight(id: string, kind: AircraftKind, acts: Act[], o: { fill: number; cycle: number; at: number; when: number; parked: number }): Flight {
  const rest = acts.reduce((a, x, k) => a + (k === o.fill ? 0 : x.dur), 0);
  acts[o.fill].dur = o.cycle - rest;
  const before = acts.slice(0, o.at).reduce((a, x) => a + x.dur, 0);
  const offset = (((before - o.when) % o.cycle) + o.cycle) % o.cycle;
  return build(id, kind, acts, offset, o.parked);
}

function build(id: string, kind: AircraftKind, acts: Act[], offset: number, parkedAct: number): Flight {
  const starts: Pose[] = [];
  const f: Flight = { id, kind, acts, starts, cycle: acts.reduce((a, x) => a + x.dur, 0), offset, parked: null! };
  let pose = flyPose(acts[0] as Extract<Act, { kind: 'fly' }>, 0, kind);
  pose.power = 0;
  for (let k = 0; k < acts.length; k++) {
    const a = acts[k];
    if (a.kind === 'fly') {
      const p = flyPose(a, 0, kind);
      p.power = 1;
      starts.push(p);
    } else starts.push(pose);
    pose = poseIn(f, k, a.dur);
  }
  f.parked = poseIn(f, parkedAct, 0);
  return f;
}

const fly = (ways: Way[], r: number, reverse = false): Act => {
  const path = roundPath(ways, r);
  return { kind: 'fly', path, reverse, dur: path.t.at(-1)! };
};
const w = (x: number, z: number, y: number, v: number): Way => ({ at: [x, z], y, v });

/* Speeds, tiles a second (a tile is about 1.8 m) */
const TAXI = 4.5;
const PUSH = 2.5;

/** An airliner: push back, taxi out, take off east, round the north over downtown, back round the west, land east, taxi in */
function jet(stand: Pt, takeoff: number, id: string): Flight {
  const [sx, sz] = stand;
  const R = RUNWAY.z;
  const TZ = TAXIWAY.z;
  const [cw, ce] = CONNECTORS;
  const acts: Act[] = [
    // Pushed back off the stand onto the taxiway, tail swinging east, nose ending up pointing west along it
    fly([w(sx, sz, 0, 0), w(sx, TZ, 0, PUSH), w(sx + 12, TZ, 0, 0)], 8, true),
    { kind: 'hold', dur: 4 },
    // Taxi west and down the west connector, line up on the runway
    fly([w(sx + 12, TZ, 0, 0), w(cw, TZ, 0, TAXI), w(cw, R, 0, 3), w(cw + 8, R, 0, 0)], 7),
    { kind: 'hold', dur: 4 },
    // Take off east, climb round to the north, cross the city high over downtown, round the west, down to land
    fly(
      [
        w(cw + 8, R, 0, 0),
        w(158, R, 0, 26),
        w(226, R, 11, 30),
        w(226, 28, 40, 33),
        w(-152, 28, 42, 34),
        w(-152, R, 26, 30),
        // Over the avenue well clear of the traffic, then down onto the runway
        w(64, R, 6.5, 26),
        w(RUNWAY.x0 + 20, R, 0, 24),
        w(206, R, 0, 6),
      ],
      32
    ),
    // Off at the east connector, back along the taxiway and into the stand
    fly([w(206, R, 0, 6), w(ce, R, 0, TAXI), w(ce, TZ, 0, TAXI), w(sx, TZ, 0, TAXI), w(sx, sz, 0, 0)], 7),
    { kind: 'hold', dur: 0 },
  ];
  return flight(id, 'jet', acts, { fill: acts.length - 1, cycle: PERIOD, at: 4, when: takeoff, parked: acts.length - 1 });
}

/** The prop plane: from the hangar's stand to the runway, a lower loop along the river, back to the hangar */
function prop(takeoff: number): Flight {
  const [px, pz] = PROP_STAND;
  const R = RUNWAY.z;
  const TZ = TAXIWAY.z;
  const [cw, ce] = CONNECTORS;
  const acts: Act[] = [
    // Taxi out (it turned round on its stand first), west along the taxiway, line up
    fly([w(px, pz, 0, 0), w(px, TZ, 0, 3.5), w(cw, TZ, 0, TAXI), w(cw, R, 0, 3), w(cw + 6, R, 0, 0)], 6),
    { kind: 'hold', dur: 3 },
    // A short run, climb round to the north, west along the river, back round to land
    fly(
      [
        w(cw + 6, R, 0, 0),
        w(130, R, 0, 15),
        w(224, R, 8, 18),
        w(224, RIVER_MID, 20, 20),
        w(-90, RIVER_MID, 22, 20),
        w(-90, R, 16, 18),
        w(64, R, 5, 14),
        w(RUNWAY.x0 + 18, R, 0, 12),
        w(206, R, 0, 5),
      ],
      20
    ),
    // Off at the east connector, along the taxiway and onto its stand
    fly([w(206, R, 0, 5), w(ce, R, 0, TAXI), w(ce, TZ, 0, TAXI), w(px, TZ, 0, TAXI), w(px, pz, 0, 0)], 6),
    { kind: 'hold', dur: 3, power: [1, 0] },
    { kind: 'hold', dur: 0, power: [0, 0] },
    { kind: 'hold', dur: 3, power: [0, 1] },
    // Turn round on the spot to face the taxiway
    { kind: 'turn', dur: 4, to: -Math.PI / 2 },
  ];
  return flight('prop', 'prop', acts, { fill: acts.length - 3, cycle: PERIOD, at: 2, when: takeoff, parked: acts.length - 3 });
}

/** The helicopter: up off its pad, round the Emporium high above the hologram and the blimp, and back */
function heli(liftoff: number): Flight {
  const { x: hx, z: hz } = HELIPAD;
  const [ex, ez] = EMPORIUM;
  const ORBIT = 24;
  const H = 25;
  const via: Pt = [120, 102 + D];
  // Straight up off the pad to clear the hangar before heading off
  const UP = 10;
  // Round the Emporium one and a half times, joining the circle as it comes in and leaving it heading back
  const inDir: Pt = [ex - via[0], ez - via[1]];
  const il = Math.hypot(...inDir);
  // Where the circle's direction of travel (anticlockwise as the angle grows) matches the way in
  const a0 = Math.atan2(-inDir[0] / il, inDir[1] / il);
  const ring: Way[] = [];
  for (let k = 0; k <= 36; k++) {
    const a = a0 + (k / 24) * Math.PI * 2;
    ring.push(w(ex + Math.cos(a) * ORBIT, ez + Math.sin(a) * ORBIT, H, 10));
  }
  const acts: Act[] = [
    fly([w(hx, hz, UP, 0), w(via[0], via[1], 22, 13), ...ring, w(via[0], via[1], 22, 13), w(hx, hz, UP, 0)], 10),
    // Hover over the pad, turn to face the hangar, settle down, rotor winds down
    { kind: 'turn', dur: 4, to: Math.PI },
    { kind: 'lift', dur: 6, to: 0 },
    { kind: 'hold', dur: 4, power: [1, 0] },
    { kind: 'hold', dur: 0, power: [0, 0] },
    { kind: 'hold', dur: 5, power: [0, 1] },
    { kind: 'lift', dur: 6, to: UP },
    // Turn to face the way out
    { kind: 'turn', dur: 4, to: yawOf([via[0] - hx, via[1] - hz]) },
  ];
  // Twice round each period
  return flight('heli', 'heli', acts, { fill: 4, cycle: PERIOD / 2, at: 0, when: liftoff, parked: 4 });
}

/** When each one takes off, seconds into the period */
export type Timetable = { jetA: number; prop: number; jetB: number; jetC: number; heli: number };
export const timetable = (tt: Timetable): Flight[] => [
  jet(STANDS[0], tt.jetA, 'jet-a'),
  prop(tt.prop),
  jet(STANDS[1], tt.jetB, 'jet-b'),
  jet(STANDS[2], tt.jetC, 'jet-c'),
  heli(tt.heli),
];
/** Every aircraft flying today (the timetable keeps them apart: tests/airfield.test.ts checks) */
export const FLIGHTS: Flight[] = timetable({ jetA: 0, prop: 50, jetB: 130, jetC: 185, heli: 0 });

/** Where a flight is at time `t` (seconds), or parked under reduced motion */
export function poseAt(f: Flight, t: number): Pose {
  let tau = (((t + f.offset) % f.cycle) + f.cycle) % f.cycle;
  for (let k = 0; k < f.acts.length; k++) {
    const d = f.acts[k].dur;
    if (tau <= d || k === f.acts.length - 1) return poseIn(f, k, Math.min(tau, d));
    tau -= d;
  }
  return f.parked;
}
