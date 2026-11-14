/*
 * Lot 9 (docs/trailer-plan.md, the owner's call; DOM-free, the boot's, tested in tests/lot9.test.ts): a trailer park
 * on the open land south of the ring highway's south-west corner, south of Endswood Estate (moved there from hugging
 * the highway, docs/estate-plan.md Phase 1). A little run down, a rough
 * community: worn single-wides, double-wides, old caravans and RVs behind a chain-link fence, add-ons everywhere,
 * a burnt-out shell, boarded and condemned units, chained dogs in their runs, KEEP OUT signs. Moody, never
 * threatening. Today's world numbers (south of the highway, so after both of the river's widenings), well inside
 * the world at both sizes. Every name here is made up.
 *
 * - **The land** (`LOT9_FENCE`, the owner's call, 2026-11-14): one wandering chain-link fence round the park (`PARK`),
 *   the camp south of it (`FIELD`, moved there by `CAMP_SHIFT`) and the strip between them; the gate on the east side
 *   where the lane comes in off the south avenue (ns0s), a gate on the west side for Lot Lane (`GATE_W`), and a hole
 *   cut in the north side where the footpath comes in (`HOLE`).
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
import { DOWN as UNDER_DOWN, floorOf, inPassage, passageZone, roofedAt, underworld, type Passage } from './underground';
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
/** The trailer park's box, where it has always stood (its lots, lanes, office, laundry and junk corner): x0, z0, x1, z1 */
export const PARK: Rect = [-128, 342 + MOVED, -22, 412 + MOVED];
/** The park's west side (the junk corner along it) */
export const PARK_X0 = PARK[0];
/**
 * How far the camp (the Field) moved as a block, from the land west of the park to the open land just south of it
 * (the owner's call, 2026-11-14, docs/south-plan.md: its old land, x -205 to -128, is the new village's and the
 * brook's). Translated, never turned: everything of the Field's written in fixed numbers adds it (here and in
 * lot9camp.ts: `x + dx`, `z + MOVED + dz`)
 */
export const CAMP_SHIFT = { dx: 88, dz: 76.5 } as const;
const [DX, DZ] = [CAMP_SHIFT.dx, CAMP_SHIFT.dz];
/** The camp's east side: the park's old west line (the polish round), moved with the camp; still half down, open where
 * the ways through are (`INNER_GAPS`: z from, to), THE FIELD over the track's gap (lot9camp.ts `FIELD_ARCH`) */
export const CAMP_X1 = PARK_X0 + DX;
export const INNER_GAPS: [number, number][] = [
  [351 + MOVED + DZ, 358.5 + MOVED + DZ],
  [373.4 + MOVED + DZ, 380.2 + MOVED + DZ],
];
/** The Field: the camp's ground (x -116.5 to -40.5, z 549 to 618), the strip between its east side and the park's east
 * line its way in */
export const FIELD: Rect = [-205 + 0.5 + DX, PARK[1] + 0.5 + DZ, PARK_X0 - 0.5 + DX, PARK[3] - 0.5 + DZ];
export const inField = (x: number, z: number, m = 0) => x > FIELD[0] + m && x < FIELD[2] - m && z > FIELD[1] + m && z < FIELD[3] - m;
/**
 * The chain-link fence round the land (the owner's call, 2026-11-14: one fence round the park, the camp and the strip
 * between them, wandering, no ruler-straight edge): a closed polygon (its last point joins its first), clockwise on
 * the map with north up (x east, z south): east along the north side from the park's north-west corner, south down
 * the east side, west along the camp's south side, north up the camp's west side, the step in to the park's west side
 * and north up it. It keeps 1 to 4 outside the park, the camp and the strip (the gate stretches on their lines), and
 * inside the land the new streets run round: for z ≤ 546, x -131 to -17; south of that, x -121 to -17; z 467 to 623.
 * Openings: the east gate (`GATE`), the west gate (`GATE_W`), the hole on the north side (`HOLE`).
 */
export const LOT9_FENCE: Pt[] = [
  // The north side, the hole on its stretch at x -112
  [-130, 469.5], [-121.5, 470.4], [-115.5, 470.4], [-108.5, 470.2], [-99, 469.1], [-88.5, 468.6], [-77, 469.4], [-66.5, 470.5], [-55, 470.1], [-44.5, 468.9], [-33, 468.5], [-24.5, 469.3],
  // The east side, straight at the gate, on to the camp's south-east corner
  [-19.5, 470.8], [-18.6, 480], [-19.8, 489.5], [-19.5, 497], [-22, 501.5], [-22, 512.5], [-19.4, 518], [-18.5, 527.5], [-20.2, 535], [-19.9, 542], [-19.4, 549], [-18.4, 556],
  [-19.7, 566], [-20.6, 575.5], [-19.2, 585], [-18.3, 594.5], [-19.5, 604], [-20.5, 612.5], [-19.5, 620.3],
  // The south side (the camp's east line meets it at x -40)
  [-29, 621.6], [-40, 620.6], [-50.5, 619.7], [-61, 620.8], [-72, 621.8], [-83, 620.9], [-93.5, 619.6], [-104, 620.2], [-112.5, 621.3], [-119, 620],
  // The camp's west side, the step in to the park's, the park's west side (straight at the west gate)
  [-120.2, 610.5], [-119.4, 601], [-118.2, 591.5], [-119.1, 582], [-120.3, 572.5], [-119.6, 563], [-118.4, 554.5], [-119.5, 548], [-120.6, 545.6], [-126, 544.6], [-130.1, 542],
  [-129.4, 534], [-130.4, 524.5], [-129.6, 516.5], [-129.5, 512.5], [-129.5, 501.5], [-130.5, 494], [-129.3, 484.5], [-130.2, 476],
];
/** The box round the fence: x0, z0, x1, z1 */
export const FENCE: Rect = [
  Math.min(...LOT9_FENCE.map((p) => p[0])),
  Math.min(...LOT9_FENCE.map((p) => p[1])),
  Math.max(...LOT9_FENCE.map((p) => p[0])),
  Math.max(...LOT9_FENCE.map((p) => p[1])),
];
/** How far x, z is from a segment */
function segDist(x: number, z: number, a: Pt, b: Pt) {
  const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
  const l2 = vx * vx + vz * vz;
  const t = l2 ? Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l2)) : 0;
  return Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t);
}
/** Is x, z inside a closed polygon (a ray to +x, counting crossings) */
export function inPolygon(pts: readonly Pt[], x: number, z: number) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [a, b] = [pts[i], pts[j]];
    if (a[1] > z !== b[1] > z && x < a[0] + ((z - a[1]) * (b[0] - a[0])) / (b[1] - a[1])) inside = !inside;
  }
  return inside;
}
/** How far x, z is from the fence's line (inside or out) */
export function toFence(x: number, z: number) {
  let d = Infinity;
  for (let i = 0; i < LOT9_FENCE.length; i++) d = Math.min(d, segDist(x, z, LOT9_FENCE[i], LOT9_FENCE[(i + 1) % LOT9_FENCE.length]));
  return d;
}
/** How far x, z is outside the fence (0 inside) */
export const fromLot9Fence = (x: number, z: number) => (inPolygon(LOT9_FENCE, x, z) ? 0 : toFence(x, z));
/** Is x, z inside the fence, `m` further out (negative: further in) */
export function inLot9Fence(x: number, z: number, m = 0) {
  if (x < FENCE[0] - m || x > FENCE[2] + m || z < FENCE[1] - m || z > FENCE[3] + m) return false;
  return inPolygon(LOT9_FENCE, x, z) ? toFence(x, z) > -m : toFence(x, z) < m;
}
/** The land inside the fence (and a little round it) and the lane out to the avenue: the district's box (the tunnel's
 * path up to the hole is `PATH_RECT`) */
export const LOT9_RECT: Rect = [FENCE[0] - 2, FENCE[1] - 2, AVE.c - AVE.half, FENCE[3] + 2];
/** The strip between the fence's east side and the avenue (the lane's mouth, the avenue's verge): Lot 9's too */
const MOUTH: Rect = [PARK[2], FENCE[1] - 2, AVE.c - AVE.half, FENCE[3] + 2];
/** Is x, z on Lot 9's land: inside the fence or within 2 of it, or between it and the avenue; `m` further out (negative: further in) */
export const inLot9 = (x: number, z: number, m = 0) =>
  (x > MOUTH[0] - m && x < MOUTH[2] + m && z > MOUTH[1] - m && z < MOUTH[3] + m) || inLot9Fence(x, z, m + 2);
/** Where Lot 9's own lamps stand (inside its fence, by its gate, and at the top of the tunnel's ramp on its side):
 * lampmix.ts picks its dead and flickering ones there */
export const inLot9Lamps = (x: number, z: number) => inLot9Fence(x, z, 4) || (Math.abs(x - TUNNEL.x) < 4 && z > TUNNEL.z1 - 2 && z < TUNNEL.z1 + 4);
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
export const GATE = { x: PARK[2], z: ROAD_Z, half: 2.4 };
/** The gate in the west fence, in line with the lane (the owner's call, 2026-11-14: Lot Lane comes in through it from
 * the west, docs/south-plan.md, and on over the junk corner to `lot9-road`'s west end at `LOOP_W`) */
export const GATE_W = { x: -129.5, z: ROAD_Z, half: 2.4 };

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
export const DOWN = UNDER_DOWN;
/** The tunnel as a passage of the underground kit (underground.ts, docs/estate-plan.md Phase 2: walking, the walk
 * camera and the ground's holes ask about it with the estate's subways; Endswood's since Lot 9 moved south) */
export const LOT9_PASSAGE: Passage = {
  id: 'lot9-tunnel',
  axis: 'z',
  c: TUNNEL.x,
  half: TUNNEL.half,
  wall: TUNNEL.wall,
  floor: TUNNEL.floor,
  ceil: TUNNEL.ceil,
  a0: TUNNEL.z0,
  ramp0: TUNNEL.ramp0,
  ramp1: TUNNEL.ramp1,
  a1: TUNNEL.z1,
  roofs: [[TUNNEL.roof0, TUNNEL.roof1]],
  rail: TUNNEL.rail,
};
const UNDER = underworld([LOT9_PASSAGE]);

/** The tunnel's floor along it: the ramps, the flat between */
export const tunnelFloor = (z: number) => floorOf(LOT9_PASSAGE, z);
/** Is x, z on the tunnel's floor (its walkable width, `m` in from its walls), ramps and all */
export const inTunnel = (x: number, z: number, m = 0) => inPassage(LOT9_PASSAGE, x, z, m);
/** Is z under the roof (the highway over it) */
export const roofed = (z: number) => roofedAt(LOT9_PASSAGE, z);
/** The box round the tunnel, its walls and a margin: what walking and the camera ask about it first */
export const TUNNEL_ZONE: Rect = passageZone(LOT9_PASSAGE);
export const inTunnelZone = (x: number, z: number) => x > TUNNEL_ZONE[0] && x < TUNNEL_ZONE[2] && z > TUNNEL_ZONE[1] && z < TUNNEL_ZONE[3];

/** The ground under x, z in the tunnel: its ramps and open floor wherever; under the roof only when `yNow` is down there (null: not the tunnel's) */
export const tunnelY = (x: number, z: number, yNow: number): number | null => UNDER.y(x, z, yNow);
/**
 * Whether a walker `r` round at x, z (his feet at `y`) is stopped by the tunnel: down in it, by its walls and ends (he
 * keeps to its floor); at street level, by the open cuttings' edges where the floor is more than a step under him (the
 * parapets and headwalls are solid too: cars stop at them)
 */
export const tunnelWall = (x: number, z: number, y: number, r: number) => UNDER.wall(x, z, y, r);
/**
 * The walk camera down in the tunnel: how far it can go from (ox, oy, oz) along (dx, dy, dz), at most `t`, before it
 * leaves the tunnel's air (through a wall, the floor or the roof). `t` as it is when the pivot isn't down there.
 */
export const tunnelRoom = (ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, t: number) => UNDER.room(ox, oy, oz, dx, dy, dz, t);

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
/** The fence's north side's z at x (the stretch of it over x) */
function northZ(x: number) {
  for (let i = 1; i < LOT9_FENCE.length; i++) {
    const [a, b] = [LOT9_FENCE[i - 1], LOT9_FENCE[i]];
    if (b[0] <= a[0] || x < a[0] || x > b[0]) continue;
    return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
  }
  return PARK[1];
}
/** The hole cut in the fence's north side, in line with the tunnel (`z` where the fence's line crosses x) */
export const HOLE = { x: TUNNEL.x, z: northZ(TUNNEL.x), half: 1.15 };
/**
 * The footpath to the hole (the land north of the park is re-laid as streets, docs/south-plan.md): from the new
 * street's sidewalk at `PATH_Z0` a few steps to the hole, wandering a little, and on in to the north lane
 */
export const PATH_Z0 = 461;
export const FOOTPATH: Pt[] = [
  [TUNNEL.x, PATH_Z0],
  [TUNNEL.x - 0.5, PATH_Z0 + 3.2],
  [TUNNEL.x - 0.25, HOLE.z - 3],
  [HOLE.x, HOLE.z],
  [HOLE.x - 0.3, (HOLE.z + LANE_N - LANE_HALF) / 2],
  [HOLE.x - 0.4, LANE_N - LANE_HALF],
];
/** The footpath's land outside the fence (the trees keep off it) */
export const PATH_RECT: Rect = [Math.min(...FOOTPATH.map((p) => p[0])) - 1, PATH_Z0 - 1, Math.max(...FOOTPATH.map((p) => p[0])) + 1, HOLE.z];

/* ---------- The Field's track (what's on the Field is lot9camp.ts's, the chunk's) ---------- */

/** The Field's dirt track: its half width, the loop's middle and radii */
export const TRACK_HALF = 1.3;
export const CAMP_C: Pt = [-166 + DX, 377 + MOVED + DZ];
const CAMP_R: Pt = [23, 21];
/** The loop's wobble (a share of its radius) at angle a: worn in by use, never drawn with a compass */
const wobble = (a: number) => 0.06 * Math.sin(2 * a + 1) + 0.04 * Math.sin(3 * a + 2);
/** The loop, closed (its first point again at the end), from its east end round by the south */
export const TRACK_LOOP: Pt[] = Array.from({ length: 49 }, (_, k): Pt => {
  const a = ((k % 48) / 48) * Math.PI * 2;
  const w = 1 + wobble(a);
  return [CAMP_C[0] + Math.cos(a) * CAMP_R[0] * w, CAMP_C[1] + Math.sin(a) * CAMP_R[1] * w];
});
/** The way in: off the south lane at the park's south-east loop corner, south through the gap in the park's old south
 * side (`PARK_GAPS`) and down the strip, then west through the camp's east side's gap to the loop's east end */
export const TRACK_SPUR: Pt[] = [
  [LOOP_E, LANE_S + LANE_HALF - 0.2],
  [LOOP_E - 0.2, PARK[3]],
  [LOOP_E + 0.4, 552],
  [LOOP_E - 0.4, 563],
  [LOOP_E, 572],
  [LOOP_E - 1.5, 578.5],
  [LOOP_E - 5, 582],
  [CAMP_X1, ROAD_Z + DZ - 0.1],
  [-135 + DX, 376.4 + MOVED + DZ],
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
/** The Field's shade trees (x, z, size; where they stood before the camp moved, moved with it) */
export const FIELD_TREES: [number, number, number][] = (
  [
    [-198, 350.5, 1.3],
    [-200, 373, 1.15],
    [-197.5, 401, 1.4],
    [-181, 406.5, 1.1],
    [-152, 406, 1.25],
    [-138, 404, 0.95],
    [-160, 347.5, 1.15],
    [-184, 346.5, 1.0],
    [-160.5, 375, 1.35],
    [-174.5, 379.5, 1.2],
  ] as [number, number, number][]
).map(([x, z, s]): [number, number, number] => [x + DX, z + MOVED + DZ, s]);

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
const EX1 = PARK[2] - 0.6;
/** The manager's office: an old trailer on blocks north of the lane, its door on it */
export const OFFICE: Hut = { rect: [EX0, ROAD_Z - ROAD_HALF - 8.6, EX1, ROAD_Z - ROAD_HALF - 0.9], h: 1.8, face: 's', door: [(EX0 + EX1) / 2, ROAD_Z - ROAD_HALF - 0.5] };
/** The coin laundry: a cinder-block hut south of the lane, its door on it */
export const LAUNDRY: Hut = { rect: [EX0, ROAD_Z + ROAD_HALF + 0.9, EX1, ROAD_Z + ROAD_HALF + 7.4], h: 1.75, face: 'n', door: [(EX0 + EX1) / 2, ROAD_Z + ROAD_HALF + 0.5] };
/** The mailboxes on a post by the office (a row of them, dented) */
export const MAILBOXES: Pt = [EX0 + 0.6, ROAD_Z - ROAD_HALF - 0.35];

/** The junk corner: the strip between the west fence and the west lane */
const JX0 = PARK_X0 + 0.5;
const JX1 = LOOP_W - LANE_HALF - 0.4;
export const JUNK: Rect = [JX0, PARK[1] + 0.5, JX1, PARK[3] - 0.5];
/** A boat on its trailer, gone green */
export const BOAT: Rect = [JX0 + 1.2, PARK[1] + 2, JX1 - 1.2, PARK[1] + 7.6];
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

/** The fence's openings: the east gate, the west gate, the hole (each on a stretch of the fence's line, `half` either
 * side of its middle along it) */
export const OPENINGS: { at: Pt; half: number }[] = [
  { at: [GATE.x, GATE.z], half: GATE.half },
  { at: [GATE_W.x, GATE_W.z], half: GATE_W.half },
  { at: [HOLE.x, HOLE.z], half: HOLE.half },
];
/** The park's old south side, between the park and the camp's land: kept standing, open where the track goes through
 * and where a path cuts through from the vacant pad at row 5's fifth lot (x from, to) */
export const PARK_GAPS: [number, number][] = [
  [-83.2, -80.8],
  [LOOP_E - 2.4, LOOP_E + 2.4],
];
/** The fence's line from a to b, cut where an opening on it is */
function cut(a: Pt, b: Pt, holes: { at: Pt; half: number }[]): [Pt, Pt][] {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const [ux, uz] = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  const at = (t: number): Pt => [a[0] + ux * t, a[1] + uz * t];
  const gaps = holes
    .map((h) => ({ t: (h.at[0] - a[0]) * ux + (h.at[1] - a[1]) * uz, off: Math.abs((h.at[0] - a[0]) * uz - (h.at[1] - a[1]) * ux), half: h.half }))
    .filter((g) => g.off < 1e-6 && g.t > 0 && g.t < l)
    .sort((p, q) => p.t - q.t);
  const out: [Pt, Pt][] = [];
  let from = 0;
  for (const g of gaps) {
    if (g.t - g.half > from) out.push([at(from), at(g.t - g.half)]);
    from = g.t + g.half;
  }
  if (from < l) out.push([at(from), b]);
  return out;
}
/** The fence's runs round the land, cut at its openings */
export const OUTER_RUNS: [Pt, Pt][] = LOT9_FENCE.flatMap((p, i) => cut(p, LOT9_FENCE[(i + 1) % LOT9_FENCE.length], OPENINGS));
/** The fence's points on the park's old south side's line (z `PARK[3]`): its west and east ends */
const SOUTH_ENDS = LOT9_FENCE.filter((p) => p[1] === PARK[3]).sort((p, q) => p[0] - q[0]);
/** The park's old south side, from the fence's west side to its east, open at `PARK_GAPS` */
export const PARK_SOUTH_RUNS: [Pt, Pt][] = (() => {
  const out: [Pt, Pt][] = [];
  let from = SOUTH_ENDS[0][0];
  for (const [a, b] of PARK_GAPS) {
    out.push([[from, PARK[3]], [a, PARK[3]]]);
    from = b;
  }
  out.push([[from, PARK[3]], [SOUTH_ENDS[1][0], PARK[3]]]);
  return out;
})();
/** The camp's east side (the old line, half down: lot9-3d.ts), from the park's old south side to the fence's south
 * side, open at `INNER_GAPS` */
export const INNER_RUNS: [Pt, Pt][] = (() => {
  const south = LOT9_FENCE.find((p) => p[0] === CAMP_X1 && p[1] > FIELD[3])!;
  const out: [Pt, Pt][] = [];
  let from = PARK[3];
  for (const [a, b] of INNER_GAPS) {
    out.push([[CAMP_X1, from], [CAMP_X1, a]]);
    from = b;
  }
  out.push([[CAMP_X1, from], [CAMP_X1, south[1]]]);
  return out;
})();
/** Every run of fence (drawn by lot9-3d.ts: the inner line's half down) */
export const FENCE_RUNS: [Pt, Pt][] = [...OUTER_RUNS, ...PARK_SOUTH_RUNS, ...INNER_RUNS];
/** A run of fence as thin boxes: one if it runs along x or z; a slanting one in pieces short enough that each box is
 * barely wider than the fence (`FENCE_T` and at most 0.3 more across it) */
export function fenceBoxes([a, b]: [Pt, Pt], h = FENCE_H): Box[] {
  const [dx, dz] = [b[0] - a[0], b[1] - a[1]];
  const n = Math.max(1, Math.ceil(Math.min(Math.abs(dx), Math.abs(dz)) / 0.3));
  const out: Box[] = [];
  for (let k = 0; k < n; k++) {
    const [p, q]: [Pt, Pt] = [
      [a[0] + (dx * k) / n, a[1] + (dz * k) / n],
      [a[0] + (dx * (k + 1)) / n, a[1] + (dz * (k + 1)) / n],
    ];
    out.push([Math.min(p[0], q[0]) - FENCE_T / 2, Math.min(p[1], q[1]) - FENCE_T / 2, Math.max(p[0], q[0]) + FENCE_T / 2, Math.max(p[1], q[1]) + FENCE_T / 2, h]);
  }
  return out;
}
/** The fence's solids */
export const FENCE_SOLIDS: Box[] = FENCE_RUNS.flatMap((r) => fenceBoxes(r));

/** What's solid in Lot 9 from the boot: the fence, the office, the laundry, the fire pit's barrel, the junk corner and
 * its cars, the tunnel's parapets (the homes and the residents' cars are lot9homes.ts's, joined when the chunk loads) */
export const LOT9_SOLIDS: Box[] = [
  ...FENCE_SOLIDS,
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
    // (a lamp's arm reaches along cos ry, -sin ry: world.ts buildLamps(); each out over its lane)
    out.push([x, ROAD_Z - ROAD_HALF - 0.45, -Math.PI / 2, GROUND_Y]);
    out.push([x + LOT_W, LANE_N + IN, Math.PI / 2, GROUND_Y]);
    if (c + 1.5 < COLS) out.push([x + LOT_W * 1.5, LANE_S - IN, -Math.PI / 2, GROUND_Y]);
  }
  // By the gate, outside it (reaching over the way in), and at the top of each ramp
  out.push([GATE.x + 1.2, GATE.z - GATE.half - 0.6, -Math.PI / 2, GROUND_Y]);
  out.push([TUNNEL.x + TUNNEL.half + TUNNEL.wall + 0.9, TUNNEL.z1 + 0.8, Math.PI, GROUND_Y]);
  // The Field's three, moved with it: by the way in, by the shower block and by the camp kitchen (lot9camp.ts)
  out.push([-131 + DX, 380.4 + MOVED + DZ, -Math.PI / 2, GROUND_Y]);
  out.push([-166 + DX, 359.9 + MOVED + DZ, -Math.PI / 2, GROUND_Y]);
  out.push([-149.6 + DX, 380.4 + MOVED + DZ, 0, GROUND_Y]);
  // ...and one on the track's way down the strip, reaching west over it
  out.push([LOOP_E + 2.4, 562, Math.PI, GROUND_Y]);
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
  out.push({ x: HOLE.x + 2.2, z: HOLE.z + 1.2, ry: Math.PI - 0.5, act: 'look' });
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
/** A few scraggly trees (x, z, size): in the strip by the gate, along the camp's way in down the strip (the land outside
 * the fence is the new streets': docs/south-plan.md) */
export const LOT9_TREES: [number, number, number][] = [
  [PARK[2] - 2.6, PARK[1] + 4, 0.75],
  [PARK[2] - 3.4, PARK[1] + 12, 0.95],
  [PARK[2] - 2.4, PARK[3] - 5, 0.8],
  [PARK[2] - 3.2, PARK[3] - 14, 0.7],
  [-25, 556, 0.85],
  [-35.5, 569.5, 0.75],
  [-24.6, 597, 0.95],
  [-35, 607.5, 0.8],
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
