/*
 * Sector 7 Central, the grand station (docs/station-plan.md step 1, the
 * owner's call; DOM-free, tested in tests/station.test.ts), drawn by
 * station3d.ts, a district loaded as you approach. A terminus north of the
 * park's avenue (ew0) and west of the ring highway: its head house (the
 * hall) faces east towards the highway and Uptown, the train shed behind it,
 * its tracks running on west to the world's edge.
 *
 * - **The hall** (`HALL`): a block-sized glass-and-steel hall under a
 *   sweeping curved roof (`HALL.eave` to `HALL.crown`, under the Emporium),
 *   its doors on the forecourt (`DOORS`); inside, the concourse at the
 *   platforms' height (`PLAT_Y`, a ramp up from the doors, `RAMP`), the
 *   departures board over the platforms' ends (`BOARD`), the ticket hall
 *   (`COUNTERS`), kiosks and cafés (`SHOPS`), benches (`BENCHES`), the
 *   clock (`CLOCK`) and people (`STATION_PEOPLE`).
 * - **The train shed** (`SHED`): five island platforms (`ISLANDS`) between
 *   ten tracks (`TRACKS`, numbered 1 to 10 from the south), under a glazed
 *   roof on steel arches (`ARCHES`); the tracks run on west out of it to the
 *   world's edge.
 * - **The forecourt:** a drop-off loop off the avenue (`LOOP`, two-way, in the
 *   street plan: traffic drives it), the plaza inside it (`PLAZA`) with its
 *   fountains (`FOUNTAINS`), the taxi rank (`RANK`) and bus bays (`BUS_BAYS`)
 *   along the loop's legs, and the car park north of it (`CAR_PARK`, cars in
 *   most of its bays, `PARKED`).
 * - **The boulevard:** the park's avenue from the highway out to the
 *   forecourt, trees along it (`BOULEVARD_TREES`); the highway's junction
 *   with it gets slip lanes on its outer corners (streetplan.ts
 *   `OUTER_SLIPS`).
 *
 * Walking: `stationY()` is the concourse's and the platforms' floor (the
 * ramp up from the doors), and the hall's walls, the shed's sides, the
 * track beds and the platforms' far ends are solid (`STATION_SOLIDS`).
 */
import { EW_ROADS, EXT, WALK_W } from './layout';

export type Pt = [number, number];
export type Rect = [number, number, number, number];
type Box = [number, number, number, number, number];

/** The park's avenue (ew0) the station fronts: its north kerb (z) */
const AVE = EW_ROADS[0];
const KERB_N = AVE.c - AVE.half;

/** The station's name (made up), and the platforms' height over the ground (the concourse's too) */
export const STATION_NAME = 'SECTOR 7 CENTRAL';
export const PLAT_Y = 0.6;

/* ---------- The forecourt's loop (two-way, a lane each way: in and out at either leg, past the doors on its west leg) ---------- */

export const LOOP = { x0: -252, x1: -236, z1: -60, half: 1.7 };

/* ---------- The station's block: the hall and the shed ---------- */

/** The hall: its walls' outside (x0 west, x1 the front on the forecourt), the roof's eaves and crown over the ground */
export const HALL = { x0: -284, x1: -256, z0: -61, z1: -11, eave: 7, crown: 11.6, wall: 0.3 };
/** The shed behind it: from its west end to the hall, between its glazed sides; the roof's arches spring at `eave` and rise to `crown` */
export const SHED = { x0: -404, x1: HALL.x0, z0: -59, z1: -13, eave: 4.5, crown: 11, wall: 0.3 };
/** The ramp up from the doors to the concourse, inside the front wall (x from `x0` up to the front) */
export const RAMP = { x0: HALL.x1 - HALL.wall - 2.6 };
/** The doors in the front: three openings (their middles, z) `half` either side, a canopy over them */
export const DOORS = { z: [-44, -36, -28], half: 1.6, h: 3.2 };

/** A unit of the shed: a track, an island platform, a track; their spacing */
const TRACK_PITCH = 2.4;
const ISLAND_W = 3.2;
const UNIT = TRACK_PITCH * 2 + ISLAND_W;
const UNITS = 5;
/** The first unit's south edge (z): the units centred in the shed */
const U0 = (SHED.z0 + SHED.z1) / 2 + (UNITS * UNIT) / 2;
/** The island platforms (z0, z1), south to north: island i serves tracks 2i + 1 (its south side) and 2i + 2 */
export const ISLANDS: [number, number][] = Array.from({ length: UNITS }, (_, i) => {
  const s = U0 - i * UNIT - TRACK_PITCH;
  return [s - ISLAND_W, s];
});
/** The tracks' centre lines (z), numbered 1 from the south */
export const TRACKS: number[] = Array.from({ length: UNITS }, (_, i) => {
  const s = U0 - i * UNIT;
  return [s - TRACK_PITCH / 2, s - UNIT + TRACK_PITCH / 2];
}).flat();
/** How far a track's middle lies from its platform's edge, and the rails' gauge */
export const RAIL = { gauge: 0.8, edge: TRACK_PITCH / 2 };
/** The buffers where the tracks end, at the hall (x) */
export const BUFFERS_X = HALL.x0 - 1.2;
/** The shed's roof: an arch every `step` along it */
export const ARCHES: number[] = (() => {
  const step = 8;
  const n = Math.round((SHED.x1 - SHED.x0) / step);
  return Array.from({ length: n + 1 }, (_, i) => SHED.x0 + ((SHED.x1 - SHED.x0) * i) / n);
})();
/** The station's block in the street plan (inside its sidewalk): the hall and the shed, to the forecourt's loop and the avenue */
export const STATION_BLOCK: Rect = [SHED.x0 - 1, HALL.z0 - 1.5, LOOP.x0 - LOOP.half - WALK_W, KERB_N - WALK_W];

/* ---------- Inside the hall ---------- */

/** The departures board over the platforms' ends, facing the doors: its middle (z), width, bottom and top */
export const BOARD = { x: HALL.x0 + 1.2, z: (HALL.z0 + HALL.z1) / 2, w: 10, y0: 4.2, y1: 6.6 };
/** The ticket hall along the north wall: the counter's windows (x middles), its depth from the wall */
export const COUNTERS = { z: HALL.z0 + HALL.wall, depth: 1.4, xs: [-278, -275, -272, -269, -266, -263], h: 1.1 };
export type ShopKind = 'cafe' | 'news' | 'bakery' | 'flowers';
/** Kiosks and cafés along the south wall (x0, x1, how deep from the wall, kind) */
export const SHOPS: { x0: number; x1: number; depth: number; kind: ShopKind; name: string }[] = [
  { x0: -281, x1: -276.5, depth: 2.6, kind: 'cafe', name: 'PLATFORM CAFÉ' },
  { x0: -275.5, x1: -272.5, depth: 2.2, kind: 'news', name: 'NEWS & BOOKS' },
  { x0: -271.5, x1: -268.5, depth: 2.2, kind: 'bakery', name: 'THE CRUST' },
  { x0: -267.5, x1: -264.5, depth: 2.2, kind: 'flowers', name: 'STEM & PETAL' },
];
/** The café's tables in front of it (x, z) */
export const CAFE_TABLES: Pt[] = [
  [-280, HALL.z1 - 4.2],
  [-277.6, HALL.z1 - 4.2],
  [-280, HALL.z1 - 5.9],
  [-277.6, HALL.z1 - 5.9],
];
/** The benches in rows across the concourse, back to back (x, z, facing: 0 is +z) */
export const BENCHES: { x: number; z: number; ry: number }[] = (() => {
  const out: { x: number; z: number; ry: number }[] = [];
  for (const x of [-276, -271, -266])
    for (const z of [-46, -40, -32, -26]) for (const s of [-1, 1]) out.push({ x, z: z + s * 0.32, ry: s > 0 ? 0 : Math.PI });
  return out;
})();
export const BENCH_LEN = 2.2;
/** The clock hanging over the concourse: its middle, its faces' radius */
export const CLOCK = { x: -270, z: (HALL.z0 + HALL.z1) / 2, y: 8.2, r: 0.9 };
/** The made-up places the board lists, platform by platform */
export const DESTINATIONS = ['NORTHGATE', 'HARBOUR CITY', 'PINE VALLEY', 'SILVER COAST', 'LAKESIDE', 'HIGHMOOR', 'EASTPORT', 'SUNRISE BAY', 'OLD MILL', 'CRYSTAL FALLS'];

/* ---------- The forecourt ---------- */

/** The plaza inside the loop (the street plan's block) */
export const PLAZA: Rect = [LOOP.x0 + LOOP.half + WALK_W, LOOP.z1 + LOOP.half + WALK_W, LOOP.x1 - LOOP.half - WALK_W, KERB_N - WALK_W];
/** The fountains on the hall's axis: round pools (x, z, radius) */
export const FOUNTAINS: { x: number; z: number; r: number }[] = [
  { x: (PLAZA[0] + PLAZA[2]) / 2, z: -46, r: 2.6 },
  { x: (PLAZA[0] + PLAZA[2]) / 2, z: -28, r: 2.6 },
];
/** The taxi rank: a lay-by in the plaza along the west leg's south stretch (x0, z0, x1, z1), and the cabs waiting in it (z) */
export const RANK: Rect = [PLAZA[0], -24, PLAZA[0] + 2.4, -11];
export const RANK_CABS: number[] = [-21.8, -18.2, -14.6];
/** The bus bays: a lay-by along the east leg (x0, z0, x1, z1), a shelter by each (z) */
export const BUS_BAYS: Rect = [PLAZA[2] - 2.6, -54, PLAZA[2], -36];
export const BUS_SHELTERS: number[] = [-52, -40];
/** Trees in grates round the plaza's middle (x, z) */
export const PLAZA_TREES: Pt[] = [
  [PLAZA[0] + 3.2, -54],
  [PLAZA[0] + 3.2, -37],
  [PLAZA[2] - 3.4, -32],
  [PLAZA[2] - 3.4, -20],
  [PLAZA[2] - 3.4, -12],
];
/** Benches facing the fountains (x, z, facing) */
export const PLAZA_BENCHES: { x: number; z: number; ry: number }[] = FOUNTAINS.flatMap((f) => [
  { x: f.x, z: f.z - f.r - 1.5, ry: 0 },
  { x: f.x, z: f.z + f.r + 1.5, ry: Math.PI },
]);

/** The car park north of the loop (the street plan's block, inside its sidewalk) */
export const CAR_PARK: Rect = [LOOP.x0 - LOOP.half + WALK_W, -98, -228, LOOP.z1 - LOOP.half - WALK_W];
/** A bay's width along a row, how deep it is */
export const BAY = { w: 2.6, d: 4.4 };
/** Four rows of bays across it, noses in, with aisles between (z, facing) */
export const BAY_ROWS: { z: number; yaw: number }[] = (() => {
  const [, z0, , z1] = CAR_PARK;
  return [
    { z: z0 + 0.6 + BAY.d / 2, yaw: Math.PI / 2 },
    { z: z0 + 0.6 + BAY.d * 1.5 + 5.5, yaw: -Math.PI / 2 },
    { z: z0 + 0.6 + BAY.d * 2.5 + 5.5, yaw: Math.PI / 2 },
    { z: z1 - 6 - BAY.d / 2, yaw: -Math.PI / 2 },
  ];
})();
export const BAYS: { x: number; z: number; yaw: number }[] = (() => {
  const [x0, , x1] = CAR_PARK;
  const n = Math.floor((x1 - x0 - 1) / BAY.w);
  return BAY_ROWS.flatMap((row) => Array.from({ length: n }, (_, i) => ({ x: x0 + 0.5 + (i + 0.5) * BAY.w, z: row.z, yaw: row.yaw })));
})();
/** The cars parked: model, x, z, yaw, colour; about two bays in three taken, seeded */
export const PARKED: [string, number, number, number, string][] = (() => {
  const models = ['hatch', 'sedan', 'pickup', 'van', 'coupe', 'suv'];
  const colours = ['#e23b3b', '#2aabee', '#ffd23f', '#f3f2f7', '#8000ff', '#1fbf6b', '#ff8a3d', '#2b2d3a', '#e219e5'];
  let s = 4242;
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  return BAYS.flatMap((b): [string, number, number, number, string][] => (r() > 0.66 ? [] : [[models[Math.floor(r() * models.length)], b.x, b.z, b.yaw + (r() < 0.15 ? Math.PI : 0), colours[Math.floor(r() * colours.length)]]]));
})();
const CAR_HALF = { l: 1.5, w: 0.62 };

/* ---------- The streets ---------- */

/** The loop (two-way: off the avenue at either leg, round past the doors) */
export const STATION_STREETS: { id: string; pts: Pt[]; half: number; oneway?: -1 }[] = [
  { id: 'station-loop', pts: [[LOOP.x0, AVE.c], [LOOP.x0, LOOP.z1], [LOOP.x1, LOOP.z1], [LOOP.x1, AVE.c]], half: LOOP.half },
];
export const STATION_CROSSINGS: { id: string; at: Pt; streets: string[] }[] = [
  { id: 'station-loop-w', at: [LOOP.x0, AVE.c], streets: ['ew0', 'station-loop'] },
  { id: 'station-loop-e', at: [LOOP.x1, AVE.c], streets: ['ew0', 'station-loop'] },
];

/* ---------- The boulevard and the lamps ---------- */

/** Trees along the avenue from the highway's slip lanes out past the station, on its south side, and along the station's front (x, z) */
export const BOULEVARD_TREES: Pt[] = (() => {
  const out: Pt[] = [];
  const south = AVE.c + AVE.half + WALK_W + 1;
  for (let x = -230; x > SHED.x0 + 2; x -= 8) out.push([x, south]);
  return out;
})();
/** Lamps round the loop's outside and along the avenue's south side: x, z, which way the arm reaches, the ground's height */
export const STATION_LAMPS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  for (let z = AVE.c - 10; z > LOOP.z1 + 3; z -= 12) out.push([LOOP.x1 + LOOP.half + 0.45, z, Math.PI, 0.02]);
  for (let x = -234; x > SHED.x0 + 4; x -= 16) out.push([x, AVE.c + AVE.half + 0.45, Math.PI / 2, 0.02]);
  return out;
})();

/* ---------- Walking ---------- */

const inRect = (x: number, z: number, r: Rect, m = 0) => x > r[0] + m && x < r[2] - m && z > r[1] + m && z < r[3] - m;
/** The concourse inside the hall's walls */
export const CONCOURSE: Rect = [HALL.x0, HALL.z0 + HALL.wall, HALL.x1 - HALL.wall, HALL.z1 - HALL.wall];
/** The floor's height over the ground in the hall (up the ramp from the doors) and on the platforms; null elsewhere */
export function stationY(x: number, z: number): number | null {
  if (inRect(x, z, CONCOURSE)) return x > RAMP.x0 ? PLAT_Y * (1 - (x - RAMP.x0) / (HALL.x1 - HALL.wall - RAMP.x0)) : PLAT_Y;
  if (x > SHED.x0 && x <= HALL.x0 && ISLANDS.some(([z0, z1]) => z > z0 && z < z1)) return PLAT_Y;
  return null;
}

/* ---------- What's solid ---------- */

/** The hall's walls, the doors left open, in strips along each side */
function hallWalls(): Box[] {
  const { x0, x1, z0, z1, wall } = HALL;
  const H = HALL.eave;
  const out: Box[] = [];
  // The front, open at the doors
  const cuts = [z0, ...DOORS.z.flatMap((z) => [z - DOORS.half, z + DOORS.half]), z1];
  for (let i = 0; i < cuts.length; i += 2) out.push([x1 - wall, cuts[i], x1, cuts[i + 1], H]);
  // The north and south walls
  out.push([x0, z0, x1, z0 + wall, H], [x0, z1 - wall, x1, z1, H]);
  // The back, beyond the shed's sides (the shed opens into the hall)
  out.push([x0 - wall, z0, x0, SHED.z0, H], [x0 - wall, SHED.z1, x0, z1, H]);
  return out;
}
/** The track beds between the platforms (and between the outer ones and the shed's sides), to the buffers */
function trackBeds(): Box[] {
  const edges = [SHED.z0 + SHED.wall, ...ISLANDS.flatMap(([a, b]) => [a, b]).sort((p, q) => p - q), SHED.z1 - SHED.wall];
  const out: Box[] = [];
  for (let i = 0; i < edges.length; i += 2) out.push([SHED.x0, edges[i], HALL.x0, edges[i + 1], PLAT_Y + 0.4]);
  return out;
}
export const STATION_SOLIDS: Box[] = [
  ...hallWalls(),
  // The shed's glazed sides
  [SHED.x0, SHED.z0, SHED.x1, SHED.z0 + SHED.wall, SHED.eave],
  [SHED.x0, SHED.z1 - SHED.wall, SHED.x1, SHED.z1, SHED.eave],
  ...trackBeds(),
  // The platforms' far ends: a railing across each
  ...ISLANDS.map(([z0, z1]): Box => [SHED.x0, z0, SHED.x0 + 0.3, z1, PLAT_Y + 1.1]),
  // The ticket counter, the kiosks and cafés, the benches
  [COUNTERS.xs[0] - 1.6, COUNTERS.z, COUNTERS.xs[COUNTERS.xs.length - 1] + 1.6, COUNTERS.z + COUNTERS.depth, COUNTERS.h],
  ...SHOPS.map((s): Box => [s.x0, HALL.z1 - HALL.wall - s.depth, s.x1, HALL.z1 - HALL.wall, 2.8]),
  ...CAFE_TABLES.map(([x, z]): Box => [x - 0.35, z - 0.35, x + 0.35, z + 0.35, 0.8]),
  ...BENCHES.map(({ x, z }): Box => [x - BENCH_LEN / 2, z - 0.25, x + BENCH_LEN / 2, z + 0.25, 0.5]),
  // The fountains, the bus shelters, the waiting cabs, the parked cars
  ...FOUNTAINS.map((f): Box => [f.x - f.r * 0.85, f.z - f.r * 0.85, f.x + f.r * 0.85, f.z + f.r * 0.85, 0.6]),
  ...BUS_SHELTERS.map((z): Box => [BUS_BAYS[0] - 1.4, z - 1.6, BUS_BAYS[0] - 0.5, z + 1.6, 2.4]),
  ...RANK_CABS.map((z): Box => [RANK[0] + 0.55, z - CAR_HALF.l, RANK[0] + 1.85, z + CAR_HALF.l, 1.3]),
  ...PARKED.map(([, x, z, yaw]): Box => {
    const along = Math.abs(Math.cos(yaw)) > 0.5;
    const [hx, hz] = along ? [CAR_HALF.l, CAR_HALF.w] : [CAR_HALF.w, CAR_HALF.l];
    return [x - hx, z - hz, x + hx, z + hz, 1.3];
  }),
];

/* ---------- People ---------- */

export interface StationPerson {
  x: number;
  z: number;
  /** Their floor's height over the ground (the concourse and the platforms' PLAT_Y, the plaza's 0) */
  y: number;
  ry: number;
  act: 'sit' | 'eat' | 'look' | 'chat';
}
export const STATION_PEOPLE: StationPerson[] = (() => {
  const out: StationPerson[] = [];
  // At the ticket windows, a few queueing behind
  COUNTERS.xs.forEach((x, i) => {
    if (i % 2) return;
    out.push({ x, z: COUNTERS.z + COUNTERS.depth + 0.5, y: PLAT_Y, ry: Math.PI, act: 'look' });
    out.push({ x, z: COUNTERS.z + COUNTERS.depth + 1.3, y: PLAT_Y, ry: Math.PI, act: 'look' });
  });
  // Looking up at the board
  for (const dz of [-5, -2, 1.5, 4.5]) out.push({ x: BOARD.x + 3 + Math.abs(dz) * 0.3, z: BOARD.z + dz, y: PLAT_Y, ry: -Math.PI / 2, act: 'look' });
  // On every other bench, at the café's tables
  BENCHES.forEach((b, i) => i % 3 === 0 && out.push({ x: b.x - 0.4, z: b.z + (b.ry === 0 ? 0.05 : -0.05), y: PLAT_Y + 0.32, ry: b.ry, act: 'sit' }));
  CAFE_TABLES.forEach(([x, z], i) => i % 2 === 0 && out.push({ x: x - 0.6, z, y: PLAT_Y + 0.32, ry: Math.PI / 2, act: 'eat' }));
  // Waiting on the platforms, in twos and threes
  ISLANDS.forEach(([z0, z1], i) => {
    const zm = (z0 + z1) / 2;
    for (const x of [-300 - i * 9, -330 + i * 6]) {
      out.push({ x, z: zm - 0.4, y: PLAT_Y, ry: i % 2 ? Math.PI / 2 : -Math.PI / 2, act: 'chat' });
      out.push({ x: x + 0.7, z: zm + 0.3, y: PLAT_Y, ry: -Math.PI / 2, act: 'chat' });
    }
  });
  // On the plaza by the fountains, at the bus stops
  for (const f of FOUNTAINS) out.push({ x: f.x + f.r + 0.8, z: f.z, y: 0, ry: -Math.PI / 2, act: 'look' });
  for (const z of BUS_SHELTERS) out.push({ x: BUS_BAYS[0] - 0.95, z: z + 2.2, y: 0, ry: Math.PI / 2, act: 'look' });
  return out;
})();

/* ---------- The place ---------- */

/** Walk in: on the plaza between the fountains, facing the hall's doors */
export const STATION_SPAWN = { x: (PLAZA[0] + PLAZA[2]) / 2, z: -37, yaw: Math.PI / 2 };
/** What the outskirts' trees keep off (the block, the plaza, the car park, the loop and the boulevard's verge), and all of it for loading */
export const STATION_RECTS: Rect[] = [
  [STATION_BLOCK[0] - 2, STATION_BLOCK[1] - 2, STATION_BLOCK[2] + 1, STATION_BLOCK[3] + 1],
  [LOOP.x0 - LOOP.half - 1, LOOP.z1 - LOOP.half - 1, LOOP.x1 + LOOP.half + 1, AVE.c],
  [CAR_PARK[0] - 1.5, CAR_PARK[1] - 1.5, CAR_PARK[2] + 1.5, CAR_PARK[3] + 1.5],
  [SHED.x0 - 2, AVE.c + AVE.half, -224, AVE.c + AVE.half + WALK_W + 2],
  // (and the tracks on west of the shed to the world's edge)
  [EXT[0] - 2, SHED.z0 - 1, SHED.x0, SHED.z1 + 1],
];
export const STATION_AREA: Rect = [Math.min(...STATION_RECTS.map((r) => r[0])), Math.min(...STATION_RECTS.map((r) => r[1])), Math.max(...STATION_RECTS.map((r) => r[2])), Math.max(...STATION_RECTS.map((r) => r[3]))];
/** The tallest anything stands (the hall's crown and the ribs over it), under the Emporium's roof (about 12.5) */
export const TALLEST = Math.max(HALL.crown, SHED.crown) + 0.5;
