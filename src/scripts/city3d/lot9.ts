/*
 * Lot 9 (docs/trailer-plan.md, the owner's call; DOM-free, the boot's, tested in tests/lot9.test.ts): a trailer park
 * on the open land south of the ring highway's south-west corner, south of Endswood Estate (moved there from hugging
 * the highway, docs/estate-plan.md Phase 1). A little run down, a rough
 * community: worn single-wides, double-wides, old caravans and RVs behind a chain-link fence, add-ons everywhere,
 * a burnt-out shell, boarded and condemned units, chained dogs in their runs, KEEP OUT signs. Moody, never
 * threatening. Today's world numbers (south of the highway, so after both of the river's widenings), well inside
 * the world at both sizes. Every name here is made up.
 *
 * - **The land** (`FENCE`): chain-link all round, the gate on the east side where the lane comes in off the south
 *   avenue (ns0s), and a hole cut in the north side where the footpath comes up from the tunnel.
 * - **The lanes** (`LOT9_STREETS`, in the street plan): the lane in from the avenue (two-way, gravel) along the middle
 *   to the west lane, and two one-way loops off it, north and south, so the residents' traffic comes and goes.
 * - **The lots** (`LOTS`): six rows facing the lanes, each home seeded (`HOMES`: kind, condition, add-ons); two lots
 *   in the middle are the fire pit (`FIRE`), a few are vacant pads gone to weeds.
 * - **By the gate**: the manager's office and the coin laundry (`OFFICE`, `LAUNDRY`); **the junk corner** along the
 *   west fence (`JUNK`: a boat on its trailer, the mechanic's bay, tyre stacks, the scrap pile, dead cars).
 * - **The tunnel** (`TUNNEL`, the owner's pick): a pedestrian underpass straight under the highway, in line with The
 *   Trenches' x -112 street between row C's blocks: a ramp down from Bottom Street's side, the passage under the
 *   highway, a ramp up on Lot 9's side and a dirt path to the hole in the fence. `tunnelY()` is its ground,
 *   `tunnelWall()` its walls (and its open cuttings' edges at street level), `tunnelRoom()` the walk camera's room
 *   down there, `TUNNEL_HOLES` the ground cut away over the open cuttings; its parapets, headwalls and the bollards
 *   at the top of each ramp are solid (cars stop there, a walker gets through between the bollards).
 * - Sodium lamps (lampmix.ts), people (`LOT9_IDLE`: porch sitters, the fire pit crowd, the mechanic, the manager;
 *   `LOT9_PEOPLE`: kids on bikes and kids running about), loose and chained dogs (`LOT9_DOGS`, `CHAINED_DOGS`), the
 *   residents' and the junk corner's cars (`LOT9_CARS`), `LOT9_SOLIDS`, `LOT9_SPAWN`.
 */
import { HIGHWAY_BOX, HIGHWAY_HALF } from './highway';
import { NS_ROADS, nsStreet } from './layout';
import { CARS } from './carspec';
import type { CarId } from './carspec';
import type { Idle } from './landmarks';
import type { Moment, ParkPerson } from './parklife';

export type Pt = [number, number];
export type Rect = [number, number, number, number];
/** A solid box: x0, z0, x1, z1, its top */
export type Box = [number, number, number, number, number];

export const LOT9_NAME = 'Lot 9';
/** The open ground's height (the ground plane, world.ts) */
export const GROUND_Y = 0.035;

/** The south avenue (the west ring avenue carried on south past the highway: ns0s) */
const AVE = NS_ROADS[0];
/** The highway's centre line on its south side, and its paved south edge */
export const HW_Z = HIGHWAY_BOX[3];
export const HW_SOUTH = HW_Z + HIGHWAY_HALF;
/** The avenue's west asphalt edge (where the lane's gravel starts) */
export const AVE_EDGE = AVE.c - AVE.half;

/* ---------- The land and the lanes ---------- */

/**
 * How far south Lot 9 moved from where it was first built, hugging the highway (docs/estate-plan.md Phase 1, the
 * owner's call: Endswood Estate takes its old land, so The Trenches, Endswood and Lot 9 run north to south). Every
 * number of Lot 9's written in fixed numbers adds it; the tunnel stays where it was (Endswood's subway to be).
 */
export const MOVED = 130;
/** The chain-link fence round the land: x0, z0, x1, z1 */
export const FENCE: Rect = [-205, 342 + MOVED, -22, 412 + MOVED];
/** The old park's west fence line (the polish round, the owner's call): the park east of it, the Field west of it (the
 * camp's ground, lot9camp.ts); the old fence there is open where the ways through are (`INNER_GAPS`: z from, to) */
export const PARK_X0 = -128;
export const INNER_GAPS: [number, number][] = [
  [351 + MOVED, 358.5 + MOVED],
  [373.4 + MOVED, 380.2 + MOVED],
];
/** The Field: the camp's ground inside the fence west of the old line */
export const FIELD: Rect = [FENCE[0] + 0.5, FENCE[1] + 0.5, PARK_X0 - 0.5, FENCE[3] - 0.5];
export const inField = (x: number, z: number, m = 0) => x > FIELD[0] + m && x < FIELD[2] - m && z > FIELD[1] + m && z < FIELD[3] - m;
/** The land inside the fence (and the scrub just outside its north side) and the lane out to the avenue: the district's
 * land (the tunnel's path north is `PATH_RECT`) */
export const LOT9_RECT: Rect = [FENCE[0] - 2, FENCE[1] - 6, AVE.c - AVE.half, FENCE[3] + 2];
/** Where Lot 9's own lamps stand (inside its fence, its gate and the top of the tunnel's ramp): lampmix.ts picks its dead and flickering ones there */
export const inLot9Lamps = (x: number, z: number) => x > FENCE[0] - 4 && x < FENCE[2] + 4 && z > FENCE[1] - 8 && z < FENCE[3] + 4;
export const inLot9 = (x: number, z: number, m = 0) => x > LOT9_RECT[0] - m && x < LOT9_RECT[2] + m && z > LOT9_RECT[1] - m && z < LOT9_RECT[3] + m;
/** The fence's height and thickness */
export const FENCE_H = 1.35;
export const FENCE_T = 0.1;

/** The lane in (and along the middle), the north and south lanes, the loops' west and east lanes */
export const ROAD_Z = 377 + MOVED;
export const LANE_N = 354 + MOVED;
export const LANE_S = 400 + MOVED;
export const LOOP_W = -118;
export const LOOP_E = -30;
/** Half a lane's gravel */
export const LANE_HALF = 1.4;
/** Half the lane in's gravel (two-way, a town street's width: the traffic turns in off the avenue) */
export const ROAD_HALF = 1.7;
/** The gate in the east fence: the lane through it, a post either side */
export const GATE = { x: FENCE[2], z: ROAD_Z, half: 2.4 };

export interface Lot9Street {
  id: string;
  pts: Pt[];
  half: number;
  oneway?: 1;
}
export const LOT9_STREETS: Lot9Street[] = [
  { id: 'lot9-road', pts: [[AVE.c, ROAD_Z], [LOOP_W, ROAD_Z]], half: ROAD_HALF },
  // (round one way: north up the east lane, west along the north lane, back down the west lane...)
  {
    id: 'lot9-north',
    pts: [
      [LOOP_E, ROAD_Z],
      [LOOP_E, LANE_N],
      [LOOP_W, LANE_N],
      [LOOP_W, ROAD_Z],
    ],
    half: LANE_HALF,
    oneway: 1,
  },
  // (...and on south down it, east along the south lane and back up the east lane to the middle)
  {
    id: 'lot9-south',
    pts: [
      [LOOP_W, ROAD_Z],
      [LOOP_W, LANE_S],
      [LOOP_E, LANE_S],
      [LOOP_E, ROAD_Z],
    ],
    half: LANE_HALF,
    oneway: 1,
  },
];
export const LOT9_CROSSINGS: { id: string; at: Pt; streets: string[] }[] = [
  { id: 'lot9-in', at: [AVE.c, ROAD_Z], streets: [nsStreet(0, ROAD_Z), 'lot9-road'] },
  { id: 'lot9-e', at: [LOOP_E, ROAD_Z], streets: ['lot9-road', 'lot9-north', 'lot9-south'] },
  { id: 'lot9-w', at: [LOOP_W, ROAD_Z], streets: ['lot9-road', 'lot9-north', 'lot9-south'] },
];
/** Where the avenue's bus stops serve Lot 9: the stops within this stretch of the avenue by the lane (transit.ts: one
 * each way, the stops falling every `STOP_GAP` along the avenue from its start) */
export const STOP_ZONE: [number, number] = [ROAD_Z - 40, ROAD_Z];

/* ---------- The tunnel ---------- */

/**
 * The pedestrian tunnel under the highway (along z at `x`): its walkable width (`half` either side), its walls'
 * thickness, its floor and ceiling (under the ground), the ramp down from `z0` (Bottom Street's side, between row C's
 * blocks) to `ramp0`, the roof from `roof0` to `roof1` (the highway over it), the ramp up from `ramp1` to `z1` (Lot 9's
 * side), and the parapets' height over the ground
 */
export const TUNNEL = { x: -112, half: 1.1, wall: 0.2, floor: -1.9, ceil: -0.25, z0: 302, ramp0: 309.6, roof0: 312.5, roof1: 327.5, ramp1: 329, z1: 336.6, rail: 0.9 };
/** Under this, Degen is down in the tunnel (walk.ts: only its walls stop him there) */
export const DOWN = -0.5;
/** How far down a step can be before it's a drop (the open cuttings' edges, at street level) */
const STEP = 0.35;

/** The tunnel's floor along it: the ramps, the flat between */
export function tunnelFloor(z: number) {
  const T = TUNNEL;
  if (z <= T.z0 || z >= T.z1) return GROUND_Y;
  if (z < T.ramp0) return GROUND_Y + (T.floor - GROUND_Y) * ((z - T.z0) / (T.ramp0 - T.z0));
  if (z <= T.ramp1) return T.floor;
  return T.floor + (GROUND_Y - T.floor) * ((z - T.ramp1) / (T.z1 - T.ramp1));
}
/** Is x, z on the tunnel's floor (its walkable width, `m` in from its walls), ramps and all */
export const inTunnel = (x: number, z: number, m = 0) => Math.abs(x - TUNNEL.x) < TUNNEL.half - m && z > TUNNEL.z0 && z < TUNNEL.z1;
/** Is z under the roof (the highway over it) */
export const roofed = (z: number) => z > TUNNEL.roof0 && z < TUNNEL.roof1;
/** The box round the tunnel, its walls and a margin: what walking and the camera ask about it first */
export const TUNNEL_ZONE: Rect = [TUNNEL.x - TUNNEL.half - TUNNEL.wall - 0.6, TUNNEL.z0 - 0.6, TUNNEL.x + TUNNEL.half + TUNNEL.wall + 0.6, TUNNEL.z1 + 0.6];
export const inTunnelZone = (x: number, z: number) => x > TUNNEL_ZONE[0] && x < TUNNEL_ZONE[2] && z > TUNNEL_ZONE[1] && z < TUNNEL_ZONE[3];

/** The ground under x, z in the tunnel: its ramps and open floor wherever; under the roof only when `yNow` is down there (null: not the tunnel's) */
export function tunnelY(x: number, z: number, yNow: number): number | null {
  if (!inTunnel(x, z)) return null;
  if (roofed(z)) return yNow < DOWN ? TUNNEL.floor : null;
  return tunnelFloor(z);
}

/**
 * Whether a walker `r` round at x, z (his feet at `y`) is stopped by the tunnel: down in it, by its walls and ends (he
 * keeps to its floor); at street level, by the open cuttings' edges where the floor is more than a step under him (the
 * parapets and headwalls are solid too: cars stop at them)
 */
export function tunnelWall(x: number, z: number, y: number, r: number) {
  if (!inTunnelZone(x, z)) return false;
  if (y < DOWN) return !(Math.abs(x - TUNNEL.x) <= TUNNEL.half - r && z >= TUNNEL.z0 && z <= TUNNEL.z1);
  for (const [px, pz] of [
    [x, z],
    [x - r, z],
    [x + r, z],
    [x, z - r],
    [x, z + r],
  ])
    if (inTunnel(px, pz) && !roofed(pz) && tunnelFloor(pz) < y - STEP) return true;
  return false;
}

/** Is (x, y, z) open air in the tunnel (its passage under the roof, its open cuttings up to the sky), `m` in from its faces */
function tunnelAir(x: number, y: number, z: number, m: number) {
  if (y > GROUND_Y + 0.05) return true;
  if (Math.abs(x - TUNNEL.x) > TUNNEL.half - m || z < TUNNEL.z0 || z > TUNNEL.z1) return false;
  if (y < tunnelFloor(z) + m) return false;
  return !roofed(z) || y < TUNNEL.ceil - m;
}
/**
 * The walk camera down in the tunnel: how far it can go from (ox, oy, oz) along (dx, dy, dz), at most `t`, before it
 * leaves the tunnel's air (through a wall, the floor or the roof). `t` as it is when the pivot isn't down there.
 */
export function tunnelRoom(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, t: number) {
  if (oy > GROUND_Y + 0.6 || !inTunnelZone(ox, oz)) return t;
  const STEP_T = 0.05;
  for (let s = STEP_T; s <= t; s += STEP_T) if (!tunnelAir(ox + dx * s, oy + dy * s, oz + dz * s, 0.12)) return Math.max(0, s - STEP_T);
  return t;
}

/** The ground cut away over the tunnel's open cuttings (world.ts: their walls go down to the floor) */
export const TUNNEL_HOLES: Rect[] = (() => {
  const T = TUNNEL;
  const [x0, x1] = [T.x - T.half - T.wall, T.x + T.half + T.wall];
  return [
    [x0, T.z0, x1, T.roof0],
    [x0, T.roof1, x1, T.z1],
  ];
})();
/** The bollards across the top of each ramp (x, z): a walker gets between the middle two, no car does */
export const BOLLARD = { r: 0.12, h: 0.85 };
export const TUNNEL_BOLLARDS: Pt[] = [TUNNEL.z0 + 0.3, TUNNEL.z1 - 0.3].flatMap((z): Pt[] => [
  [TUNNEL.x - 0.55, z],
  [TUNNEL.x + 0.55, z],
]);
/** The tunnel's solids: the open cuttings' parapets along their sides, the headwalls over the portals, the bollards */
export const TUNNEL_SOLIDS: Box[] = (() => {
  const T = TUNNEL;
  const [w0, w1] = [T.x - T.half - T.wall, T.x - T.half];
  const [e0, e1] = [T.x + T.half, T.x + T.half + T.wall];
  return [
    [w0, T.z0, w1, T.roof0, T.rail],
    [e0, T.z0, e1, T.roof0, T.rail],
    [w0, T.roof1, w1, T.z1, T.rail],
    [e0, T.roof1, e1, T.z1, T.rail],
    [w0, T.roof0, e1, T.roof0 + 0.3, T.rail],
    [w0, T.roof1 - 0.3, e1, T.roof1, T.rail],
    ...TUNNEL_BOLLARDS.map(([x, z]): Box => [x - BOLLARD.r, z - BOLLARD.r, x + BOLLARD.r, z + BOLLARD.r, BOLLARD.h]),
  ];
})();
/** The hole cut in the fence's north side where the footpath comes up from the tunnel */
export const HOLE = { x: TUNNEL.x, half: 1.15 };
/**
 * The footpath: from the top of the ramp south over the open land (Endswood's and the common's to be) to the hole, and
 * on in to the north lane; a point every `PATH_STEP` or so, wandering a little either side of the tunnel's line
 */
export const PATH_STEP = 6;
export const FOOTPATH: Pt[] = (() => {
  const [z0, z1] = [TUNNEL.z1, FENCE[1] - 2];
  const n = Math.ceil((z1 - z0) / PATH_STEP);
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push([TUNNEL.x + 2.2 * Math.sin(t * Math.PI * 2.3 + 0.7) * Math.sin(t * Math.PI) + 0.6 * t, z0 + (z1 - z0) * t]);
  }
  out.push([HOLE.x, FENCE[1]], [HOLE.x - 0.4, LANE_N - LANE_HALF]);
  return out;
})();
/** The footpath's land, from the top of the ramp to the fence (the trees keep off it) */
export const PATH_RECT: Rect = [Math.min(...FOOTPATH.map((p) => p[0])) - 1, TUNNEL.z1 - 1, Math.max(...FOOTPATH.map((p) => p[0])) + 1, FENCE[1]];

/* ---------- The Field's track (what's on the Field is lot9camp.ts's, the chunk's) ---------- */

/** The Field's dirt track: its half width, the loop's middle and radii */
export const TRACK_HALF = 1.3;
export const CAMP_C: Pt = [-166, 377 + MOVED];
const CAMP_R: Pt = [23, 21];
/** The loop's wobble (a share of its radius) at angle a: worn in by use, never drawn with a compass */
const wobble = (a: number) => 0.06 * Math.sin(2 * a + 1) + 0.04 * Math.sin(3 * a + 2);
/** The loop, closed (its first point again at the end), from its east end round by the south */
export const TRACK_LOOP: Pt[] = Array.from({ length: 49 }, (_, k): Pt => {
  const a = ((k % 48) / 48) * Math.PI * 2;
  const w = 1 + wobble(a);
  return [CAMP_C[0] + Math.cos(a) * CAMP_R[0] * w, CAMP_C[1] + Math.sin(a) * CAMP_R[1] * w];
});
/** The way in: off the west lane, across the junk corner, through the old line's gap to the loop's east end */
export const TRACK_SPUR: Pt[] = [
  [LOOP_W - LANE_HALF + 0.2, ROAD_Z],
  [PARK_X0, ROAD_Z - 0.1],
  [-135, 376.4 + MOVED],
  TRACK_LOOP[0],
];
/** How far x, z is from the track's middle */
export function fromTrack(x: number, z: number) {
  let d = Infinity;
  for (const line of [TRACK_SPUR, TRACK_LOOP])
    for (let i = 1; i < line.length; i++) {
      const [a, b] = [line[i - 1], line[i]];
      const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
      const l2 = vx * vx + vz * vz;
      const t = l2 ? Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l2)) : 0;
      d = Math.min(d, Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t));
    }
  return d;
}
/** Is x, z inside the loop (the commons' ground: angle and radius from its middle against the wobbled radius) */
export function inLoop(x: number, z: number, m = 0) {
  const [dx, dz] = [x - CAMP_C[0], z - CAMP_C[1]];
  const a = Math.atan2(dz / CAMP_R[1], dx / CAMP_R[0]);
  const w = 1 + wobble(a);
  return Math.hypot(dx / (CAMP_R[0] * w), dz / (CAMP_R[1] * w)) < 1 && fromTrack(x, z) > m;
}
/** The Field's shade trees (x, z, size) */
export const FIELD_TREES: [number, number, number][] = [
  [-198, 350.5 + MOVED, 1.3],
  [-200, 373 + MOVED, 1.15],
  [-197.5, 401 + MOVED, 1.4],
  [-181, 406.5 + MOVED, 1.1],
  [-152, 406 + MOVED, 1.25],
  [-138, 404 + MOVED, 0.95],
  [-160, 347.5 + MOVED, 1.15],
  [-184, 346.5 + MOVED, 1.0],
  [-160.5, 375 + MOVED, 1.35],
  [-174.5, 379.5 + MOVED, 1.2],
];

/* ---------- The lots' grid (the homes on them are lot9homes.ts's, the chunk's) ---------- */

/** A small seeded generator */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** A lot's width, the inner rows' first lot's west edge and how many lots each row holds */
export const LOT_W = 7.6;
export const COL0 = LOOP_W + LANE_HALF + 0.4;
export const COLS = 11;
/** The fire pit's two lots: row 3 (south of the middle), these columns */
export const FIRE_COLS = [5, 6];

/* ---------- The fire pit, the office, the laundry, the junk corner ---------- */

/** The fire pit: its lots, the burn barrel at its middle, the old couches and lawn chairs round it (x, z, facing ry, a couch or not) */
export const FIRE_LOT: Rect = [COL0 + FIRE_COLS[0] * LOT_W, ROAD_Z + ROAD_HALF + 0.2, COL0 + (FIRE_COLS[1] + 1) * LOT_W, (ROAD_Z + LANE_S) / 2];
export const FIRE = { x: (FIRE_LOT[0] + FIRE_LOT[2]) / 2, z: (FIRE_LOT[1] + FIRE_LOT[3]) / 2 + 0.6, r: 0.32, h: 0.62 };
export const FIRE_SEATS: { x: number; z: number; ry: number; couch: boolean }[] = [0, 1, 2, 3, 4, 5].map((k) => {
  const a = (k / 6) * Math.PI * 2 + 0.3;
  const d = k % 3 === 0 ? 2.4 : 1.9;
  const x = FIRE.x + Math.cos(a) * d;
  const z = FIRE.z + Math.sin(a) * d;
  // (facing the barrel)
  return { x, z, ry: Math.atan2(FIRE.x - x, FIRE.z - z), couch: k % 3 === 0 };
});
/** The string lights' poles round it (the lights strung between them across the middle) */
export const FIRE_POLES: Pt[] = [
  [FIRE_LOT[0] + 1, FIRE_LOT[1] + 1.2],
  [FIRE_LOT[2] - 1, FIRE_LOT[1] + 1.2],
  [FIRE_LOT[2] - 1, FIRE_LOT[3] - 1],
  [FIRE_LOT[0] + 1, FIRE_LOT[3] - 1],
];
/** A bug zapper on a pole by the couches (its blue glow at night), and the radio on a crate */
export const ZAPPER: Pt = [FIRE_LOT[0] + 2.2, FIRE_LOT[3] - 1.4];
export const RADIO: Pt = [FIRE.x + 1.1, FIRE.z - 1.25];

/** A building: its rect, its walls' top, the way its door faces and the door's foot (the office trailer, the laundry) */
export interface Hut {
  rect: Rect;
  h: number;
  face: 'n' | 's' | 'e' | 'w';
  door: Pt;
}
/** The strip between the east lane and the fence, by the gate */
const EX0 = LOOP_E + LANE_HALF + 0.4;
const EX1 = FENCE[2] - 0.6;
/** The manager's office: an old trailer on blocks north of the lane, its door on it */
export const OFFICE: Hut = { rect: [EX0, ROAD_Z - ROAD_HALF - 8.6, EX1, ROAD_Z - ROAD_HALF - 0.9], h: 1.8, face: 's', door: [(EX0 + EX1) / 2, ROAD_Z - ROAD_HALF - 0.5] };
/** The coin laundry: a cinder-block hut south of the lane, its door on it */
export const LAUNDRY: Hut = { rect: [EX0, ROAD_Z + ROAD_HALF + 0.9, EX1, ROAD_Z + ROAD_HALF + 7.4], h: 1.75, face: 'n', door: [(EX0 + EX1) / 2, ROAD_Z + ROAD_HALF + 0.5] };
/** The mailboxes on a post by the office (a row of them, dented) */
export const MAILBOXES: Pt = [EX0 + 0.6, ROAD_Z - ROAD_HALF - 0.35];

/** The junk corner: the strip between the west fence and the west lane */
const JX0 = PARK_X0 + 0.5;
const JX1 = LOOP_W - LANE_HALF - 0.4;
export const JUNK: Rect = [JX0, FENCE[1] + 0.5, JX1, FENCE[3] - 0.5];
/** A boat on its trailer, gone green */
export const BOAT: Rect = [JX0 + 1.2, FENCE[1] + 2, JX1 - 1.2, FENCE[1] + 7.6];
/** The mechanic's bay: a tarp on poles over the car being worked on, a tool chest and an engine hoist */
export const BAY: Rect = [JX0 + 0.4, 360 + MOVED, JX1 - 0.2, 368 + MOVED];
export const HOIST: Pt = [JX0 + 1.6, 369.2 + MOVED];
export const TOOLS: Rect = [JX1 - 1.1, 366.9 + MOVED, JX1 - 0.4, 367.35 + MOVED];
/** Tyre stacks (x, z, how many high) */
export const TYRES: [number, number, number][] = [
  [JX0 + 0.9, 381 + MOVED, 5],
  [JX0 + 2.1, 381.4 + MOVED, 3],
  [JX0 + 1.4, 382.8 + MOVED, 4],
  [JX1 - 1.2, 383.6 + MOVED, 6],
  [JX0 + 1.2, 385.6 + MOVED, 2],
];
/** The scrap pile (heaps: x, z, size), against the west fence */
export const SCRAP: [number, number, number][] = [
  [JX0 + 2.2, 391 + MOVED, 1.6],
  [JX0 + 3.4, 394.4 + MOVED, 1.25],
  [JX0 + 1.9, 397.6 + MOVED, 1.4],
  [JX0 + 4.6, 392.6 + MOVED, 0.9],
];
/** The junk corner's cars: dead ones along the south fence and the one in the bay (with the mechanic) */
const JUNK_CARS: { id: CarId; x: number; z: number; ry: number; paint: string }[] = [
  { id: 'sedan', x: (JX0 + JX1) / 2, z: (BAY[1] + BAY[3]) / 2, ry: Math.PI / 2, paint: '#8a2e2e' },
  { id: 'classic', x: (JX0 + JX1) / 2, z: 403.6 + MOVED, ry: -Math.PI / 2, paint: '#6b5a4a' },
  { id: 'van', x: (JX0 + JX1) / 2 - 0.4, z: 408.4 + MOVED, ry: -Math.PI / 2 + 0.12, paint: '#a29a86' },
];

/* ---------- Cars and solids ---------- */

/** The junk corner's cars (the residents' are lot9homes.ts's) */
export const LOT9_CARS: [CarId, number, number, number, string][] = JUNK_CARS.map((c): [CarId, number, number, number, string] => [c.id, c.x, c.z, c.ry, c.paint]);
/** A parked car's footprint, turned to its heading */
export function carBox(id: CarId, x: number, z: number, ry: number): Box {
  const { L, W } = CARS[id];
  const c = Math.abs(Math.cos(ry));
  const s = Math.abs(Math.sin(ry));
  const hx = (L * c + W * s) / 2;
  const hz = (L * s + W * c) / 2;
  return [x - hx, z - hz, x + hx, z + hz, 1.2];
}
export const boxOf = (r: Rect, h: number): Box => [r[0], r[1], r[2], r[3], h];

/** The fence's runs (a gap at the gate and at the hole) as thin boxes, and the old line's between its gaps */
export const FENCE_RUNS: [Pt, Pt][] = (() => {
  const [x0, z0, x1, z1] = FENCE;
  const inner: [Pt, Pt][] = [];
  let from = z0;
  for (const [a, b] of INNER_GAPS) {
    inner.push([[PARK_X0, from], [PARK_X0, a]]);
    from = b;
  }
  inner.push([[PARK_X0, from], [PARK_X0, z1]]);
  return [
    [[x0, z0], [HOLE.x - HOLE.half, z0]],
    [[HOLE.x + HOLE.half, z0], [x1, z0]],
    [[x1, z0], [x1, GATE.z - GATE.half]],
    [[x1, GATE.z + GATE.half], [x1, z1]],
    [[x1, z1], [x0, z1]],
    [[x0, z1], [x0, z0]],
    ...inner,
  ];
})();
/** The old line's runs (lot9-3d.ts draws them half down) */
export const INNER_RUNS = FENCE_RUNS.slice(6);

/** What's solid in Lot 9 from the boot: the fence, the office, the laundry, the fire pit's barrel, the junk corner and
 * its cars, the tunnel's parapets (the homes and the residents' cars are lot9homes.ts's, joined when the chunk loads) */
export const LOT9_SOLIDS: Box[] = [
  ...FENCE_RUNS.map(([a, b]): Box => [Math.min(a[0], b[0]) - FENCE_T / 2, Math.min(a[1], b[1]) - FENCE_T / 2, Math.max(a[0], b[0]) + FENCE_T / 2, Math.max(a[1], b[1]) + FENCE_T / 2, FENCE_H]),
  ...LOT9_CARS.map(([id, x, z, ry]) => carBox(id, x, z, ry)),
  boxOf(OFFICE.rect, OFFICE.h + 0.1),
  boxOf(LAUNDRY.rect, LAUNDRY.h + 0.1),
  [FIRE.x - FIRE.r, FIRE.z - FIRE.r, FIRE.x + FIRE.r, FIRE.z + FIRE.r, FIRE.h],
  boxOf(BOAT, 1.6),
  boxOf(TOOLS, 0.62),
  ...TYRES.map(([x, z, n]): Box => [x - 0.42, z - 0.42, x + 0.42, z + 0.42, n * 0.22]),
  ...SCRAP.map(([x, z, s]): Box => [x - s, z - s * 0.8, x + s, z + s * 0.8, s * 0.9]),
  ...TUNNEL_SOLIDS,
];

/* ---------- Lamps, people, dogs ---------- */

/** Sodium lamps (x, z, the way the arm reaches, the ground's height): along the lanes on the lots' corners, by the gate, at the tunnel's mouths (lampmix.ts: some flicker, the odd one dead) */
export const LOT9_LAMPS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  const IN = LANE_HALF + 0.45;
  for (let c = 1; c < COLS; c += 3) {
    const x = COL0 + c * LOT_W;
    out.push([x, ROAD_Z - ROAD_HALF - 0.45, Math.PI / 2, GROUND_Y]);
    out.push([x + LOT_W, LANE_N + IN, -Math.PI / 2, GROUND_Y]);
    if (c + 1.5 < COLS) out.push([x + LOT_W * 1.5, LANE_S - IN, Math.PI / 2, GROUND_Y]);
  }
  // By the gate, outside it, and at the top of each ramp
  out.push([GATE.x + 1.2, GATE.z - GATE.half - 0.6, Math.PI / 2, GROUND_Y]);
  out.push([TUNNEL.x + TUNNEL.half + TUNNEL.wall + 0.9, TUNNEL.z1 + 0.8, Math.PI, GROUND_Y]);
  // The Field's three: by the way in, by the shower block and by the camp kitchen (lot9camp.ts)
  out.push([-131, 380.4 + MOVED, -Math.PI / 2, GROUND_Y]);
  out.push([-166, 359.9 + MOVED, -Math.PI / 2, GROUND_Y]);
  out.push([-149.6, 380.4 + MOVED, 0, GROUND_Y]);
  return out;
})();

/** People standing (or sitting) about: the fire pit crowd, the mechanic and his mate, the manager, someone at the laundry, a pair by the lane, and one by the hole in the fence, watching the tunnel */
export const LOT9_IDLE: Idle[] = (() => {
  const out: Idle[] = [];
  // (the porch sitters are lot9homes.ts's, with the homes)
  // Round the fire: in the couches and chairs, two standing
  FIRE_SEATS.forEach((s, i) => {
    if (i === 4) return;
    out.push({ x: s.x, z: s.z, y: GROUND_Y + (s.couch ? 0.3 : 0.32), ry: s.ry, act: 'lounge' });
  });
  out.push({ x: FIRE.x + 0.4, z: FIRE.z + 2.0, ry: Math.PI + 0.3, act: 'chat' });
  out.push({ x: FIRE.x - 0.5, z: FIRE.z + 2.3, ry: Math.PI - 0.4, act: 'chat' });
  // The mechanic at the car's front, his mate watching
  const [bx, bz] = [(BAY[0] + BAY[2]) / 2, (BAY[1] + BAY[3]) / 2];
  out.push({ x: bx, z: bz - CARS.sedan.L / 2 - 0.45, ry: 0, act: 'cook' });
  out.push({ x: bx + 1.4, z: bz - CARS.sedan.L / 2 - 0.9, ry: -0.6, act: 'look' });
  // The manager at the office door, arms folded; someone outside the laundry on their phone
  out.push({ x: OFFICE.door[0] + 0.9, z: OFFICE.door[1] + 0.1, ry: 0, act: 'guard' });
  out.push({ x: LAUNDRY.door[0] - 0.9, z: LAUNDRY.door[1] + 0.2, ry: Math.PI, act: 'phone' });
  // A pair by the north lane, and the one by the hole in the fence
  out.push({ x: -66, z: LANE_N - LANE_HALF - 0.6, ry: 1.3, act: 'chat' });
  out.push({ x: -64.9, z: LANE_N - LANE_HALF - 0.35, ry: -1.9, act: 'chat' });
  out.push({ x: HOLE.x + 2.2, z: FENCE[1] + 1.2, ry: Math.PI - 0.5, act: 'look' });
  return out;
})();

/** A closed loop round the inside of a rect, `inset` in from its edges, its corners rounded (play.ts's `loopOf()`, kept
 * here so the boot's solids don't import The Trenches' play through it): the point `s` along it and the way it heads */
function loopOf(rect: Rect, inset: number) {
  const [x0, z0, x1, z1] = [rect[0] + inset, rect[1] + inset, rect[2] - inset, rect[3] - inset];
  const r = 0.25;
  const pts: Pt[] = [];
  const corner = (cx: number, cz: number, a0: number) => {
    for (let i = 0; i <= 6; i++) pts.push([cx + Math.cos(a0 + (i / 6) * (Math.PI / 2)) * r, cz + Math.sin(a0 + (i / 6) * (Math.PI / 2)) * r]);
  };
  corner(x1 - r, z0 + r, -Math.PI / 2);
  corner(x1 - r, z1 - r, 0);
  corner(x0 + r, z1 - r, Math.PI / 2);
  corner(x0 + r, z0 + r, Math.PI);
  pts.push(pts[0]);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = cum[cum.length - 1];
  return {
    len,
    at(s: number) {
      const d = ((s % len) + len) % len;
      let i = 1;
      while (i < cum.length - 1 && cum[i] < d) i++;
      const k = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1e-6);
      const [a, b] = [pts[i - 1], pts[i]];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return { x: a[0] + (b[0] - a[0]) * k, z: a[1] + (b[1] - a[1]) * k, dx: (b[0] - a[0]) / l, dz: (b[1] - a[1]) / l };
    },
  };
}

/** A kid's size against a grown-up's (play.ts's `KID`), a kid on a bike (bigger kids), the bikes' size and pace */
const KID_SIZE = 0.44;
export const RIDER = { scale: 0.62, bike: 0.72, seat: 0.44 * 0.72, pace: 1.9 };
/** The kids' loops: on bikes round the north loop's inside edge, running round the south loop's */
/** (just inside each lane's gravel, clear of the cars down its middle and the lots' fronts) */
const KID_IN = LANE_HALF - 0.15;
const RIDE_LOOP = loopOf([LOOP_W, LANE_N, LOOP_E, ROAD_Z], KID_IN);
const RUN_LOOP = loopOf([LOOP_W, ROAD_Z, LOOP_E, LANE_S], KID_IN);
const RUN_PACE = 1.15;
export const KIDS_ON_BIKES = 3;
export const KIDS_RUNNING = 2;
/** Where a kid on a bike is at t (x, z, facing ry) */
export function riderAt(k: number, t: number) {
  const p = RIDE_LOOP.at((k / KIDS_ON_BIKES) * RIDE_LOOP.len + RIDER.pace * t + (k === 1 ? 4 : 0));
  return { x: p.x, z: p.z, ry: Math.atan2(p.dx, p.dz) };
}
/** Where a running kid is at t (s back along the loop) */
export function runnerAt(k: number, t: number, back = 0) {
  const p = RUN_LOOP.at(((k + 0.3) / KIDS_RUNNING) * RUN_LOOP.len + RUN_PACE * t - back);
  return { x: p.x, z: p.z, ry: Math.atan2(p.dx, p.dz) };
}
export const LOT9_PEOPLE: ParkPerson[] = [
  ...Array.from({ length: KIDS_ON_BIKES }, (_, k): ParkPerson => ({
    id: `lot9-bike-${k}`,
    trim: k === 2,
    scale: RIDER.scale,
    at: (t: number, m: Moment) => {
      const p = riderAt(k, t);
      return Object.assign(m, { x: p.x, z: p.z, ry: p.ry, y: GROUND_Y + RIDER.seat, clip: 'sit' as const, speed: 0 });
    },
  })),
  ...Array.from({ length: KIDS_RUNNING }, (_, k): ParkPerson => ({
    id: `lot9-run-${k}`,
    trim: k === 1,
    scale: KID_SIZE,
    at: (t: number, m: Moment) => {
      const p = runnerAt(k, t);
      return Object.assign(m, { x: p.x, z: p.z, ry: p.ry, y: GROUND_Y, clip: 'jog' as const, speed: RUN_PACE });
    },
  })),
];
/** The loose dogs, running after the kids (which kid, how far behind, the coat, the size) */
export const LOT9_DOGS: { kid: number; back: number; coat: string; size: number }[] = [
  { kid: 0, back: 1.6, coat: '#7a5a3a', size: 1.05 },
  { kid: 1, back: 1.3, coat: '#2a2622', size: 0.9 },
];
/** A few scraggly trees (x, z, size): in the strip by the gate, in the junk corner, and outside the north fence */
export const LOT9_TREES: [number, number, number][] = [
  [FENCE[2] - 2.6, FENCE[1] + 4, 0.75],
  [FENCE[2] - 3.4, FENCE[1] + 12, 0.95],
  [FENCE[2] - 2.4, FENCE[3] - 5, 0.8],
  [FENCE[2] - 3.2, FENCE[3] - 14, 0.7],
  [-92, FENCE[1] - 3.2, 0.9],
  [-71, FENCE[1] - 4, 0.75],
  [-46, FENCE[1] - 3, 1.0],
  [-30, FENCE[1] - 4.4, 0.7],
  // (and outside the Field's north fence)
  [-150, FENCE[1] - 3.6, 0.95],
  [-171, FENCE[1] - 4.6, 0.8],
  [-192, FENCE[1] - 3.4, 1.05],
  // The Field's shade trees: the camp grew round them (lot9camp.ts keeps its pitches off them)
  ...FIELD_TREES,
];

/* ---------- The place ---------- */

/** Walk in: on the lane just outside the gate, facing in (west: walk.ts faces along (-sin yaw, -cos yaw)) */
export const LOT9_SPAWN = { x: GATE.x + 3.2, z: ROAD_Z, yaw: Math.PI / 2 };
/** The pin over the middle (the fire pit), and the box the City view picks */
export const LOT9_PIN: Pt = [FIRE.x, FIRE.z];
/** The signs' fixed made-up copy */
export const LOT9_SIGNS = { gate: 'LOT 9', office: 'OFFICE', laundry: 'COIN LAUNDRY', keepOut: 'KEEP OUT', dog: 'BEWARE OF DOG', condemned: 'CONDEMNED', private: 'PRIVATE PROPERTY', slow: 'SLOW', dumping: 'NO DUMPING' } as const;
/** Where the radio plays by the fire (ambience.ts: the boombox's beat) */
export const LOT9_RADIO = { x: RADIO[0], z: RADIO[1] };
