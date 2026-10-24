/*
 * Sector 7 Airport, DOM-free like the street plan (docs/airport-plan.md): where
 * everything is, what's solid for walking and driving, its roads in the
 * street plan, and every aircraft's schedule.
 *
 * Since the plan's Phase 3 (the owner's call: bigger, more realistic, out
 * of town) it stands past the ring highway's south-east bend, as a city's
 * airport does: airside (`AIRSIDE`, inside the perimeter fence) on the
 * land between the highway and the world's south edge, landside
 * (`LANDSIDE`) on the land east of the highway south of the river, where
 * Airport Drive comes down from the south bank avenue to the terminal's
 * kerb. The runway (09/27) runs east-west along the south edge; take-offs
 * and landings are eastwards, the departures turning north up the east
 * side and the arrivals coming in from the west over open land.
 *
 * A flight is a loop of acts: rolling or flying along waypoints (corners
 * rounded off, altitude and speed eased between them), holding still,
 * turning on the spot, or lifting straight up or down. `poseAt()` turns the
 * time into a position, heading, pitch, bank, gear and power. It's a
 * function of the time only, the same for everyone. airport.ts and
 * airportgrounds3d.ts draw it all.
 */
import { RIVER, SEATS, WIDEN } from './layout';
import { ROOF_PAD } from './highrise';

/** The middle of the river (the prop plane flies along it) */
const RIVER_MID = (RIVER[0] + RIVER[1]) / 2;

export type Pt = [number, number];
export type Rect = [number, number, number, number];
/** x0, z0, x1, z1, height (solids.ts `Box`) */
export type Footprint = [number, number, number, number, number];

/* ---------- The layout (fixed numbers, not the world's edge: growth plan Phase 5) ---------- */

/** Airside, inside the perimeter fence: from the highway's south verge to the world's south edge */
export const AIRSIDE: Rect = [96, 331, 452, 451];
/** Landside: east of the highway, from the south bank avenue down to the airside's fence (Airport Drive, step 2's car parks) */
export const LANDSIDE: Rect = [290, 147, 452, 331];
/** The terminal's forecourt: its loop round the short-stay car park and the deck's ramps, and the deck in front of the hall (west of the loop's land: the highway's bend is close) */
export const FORECOURT: Rect = [296, 288, 400, 337];
export const DEPARTURES_LAND: Rect = [261, 317, 296, 337];
/** The whole airport (no trees in its parts: `AIRPORT_AREAS`) */
export const SITE: Rect = [AIRSIDE[0], LANDSIDE[1], AIRSIDE[2], AIRSIDE[3]];
/** General aviation's way in, west of the fence (its road and car park, `GA_ROAD`), and the fence's west gate opposite it */
export const GA_LANDSIDE: Rect = [70.5, 338, AIRSIDE[0], 360];
export const GA_GATE = { z0: 345, z1: 349 };
export const AIRPORT_AREAS: Rect[] = [AIRSIDE, LANDSIDE, FORECOURT, DEPARTURES_LAND, GA_LANDSIDE];

/** The runway, 09/27: east-west along the south edge, take-offs and landings eastwards */
export const RUNWAY = { x0: 100, x1: 400, z: 442, half: 5 };
/** The parallel taxiway, and the apron's taxilane (the edge of the stands, where the airliners push back to) */
export const TAXIWAY = { x0: 108, x1: 420, z: 422, half: 2.8 };
export const TAXILANE = { x0: 108, x1: 430, z: 405, half: 2.5 };
/**
 * Connectors down to the runway (A to D, west to east): A from the taxilane at the west end, where departures
 * hold short (`HOLD`), C the rapid exit the landings take, D the east end's
 */
export const CONNECTORS = [108, 240, 330, 392];
export const CONNECTOR_NAMES = ['A', 'B', 'C', 'D'];
/** (both reach on past the passenger apron to the cargo apron's stands: step 3) */
/** Where departures wait short of the runway on A (clear of a landing over the threshold) */
export const HOLD = { x: CONNECTORS[0], z: 420 };
/** The apron in front of the terminal, and the general aviation apron at the west end (both run down to the taxiway) */
export const APRON: Rect = [180, 372, 396, TAXIWAY.z - TAXIWAY.half];
export const GA_APRON: Rect = [98, 355, 182, TAXIWAY.z - TAXIWAY.half];
/** Approach lights out past the runway's west end */
export const APPROACH = { x0: 74, x1: RUNWAY.x0 - 2.5, z: RUNWAY.z };

/**
 * The terminal: the hall (two storeys, its landside face to the kerb, three gates on its airside) and a concourse
 * either side of it, the stands along their airside face, nose in (facing north, -z)
 */
export const HALL: Footprint = [264, 336, 336, 372, 7.2];
export const CONCOURSES: Footprint[] = [
  [184, 356, 264, 372, 5.2],
  [336, 356, 392, 372, 5.2],
];
/** The whole terminal's outline (hall and concourses), for what's checked against it */
export const TERMINAL: Footprint = [CONCOURSES[0][0], HALL[1], CONCOURSES[1][2], HALL[3], HALL[4]];
/** The eight gates' stands, nose to the terminal (facing north) */
export const STANDS: Pt[] = [0, 1, 2, 3, 4, 5, 6, 7].map((k): Pt => [196 + k * 26, 383.5]);
/** Airbridges: from the terminal's airside to each jet's front left door */
export const AIRBRIDGES: { x: number; z0: number; z1: number }[] = STANDS.map(([x, z]) => ({ x: x - 3.2, z0: HALL[3], z1: z - 7.3 }));
/** Which stands the flying airliners use (the others hold parked ones, `PARKED_JETS`; step 3 gave stand 5's slot on the timetable to the freighter) */
export const FLYING_STANDS = [0, 2, 5, 7];
/** The control tower, behind the west concourse: kept under the Emporium's height */
export const TOWER = { x: 222, z: 342, r: 1.5, cab: 9, top: 11.6 };

/* General aviation, at the west end: Hangar 1 (your aircraft's), the maintenance hangar, the helipads */

/** Hangar 1: opens south onto the GA apron, the prop plane's stand in front of its west half */
export const HANGAR: Footprint = [112, 336, 132, 355, 7.4];
export const PROP_STAND: Pt = [HANGAR[0] + 3.5, HANGAR[3] + 10];
/** Under the hangar's arched roof (from the top of its walls): what flies in or out keeps under it */
export const HANGAR_ROOF: Footprint = [HANGAR[0], HANGAR[1], HANGAR[2], HANGAR[3], 4.2];
/** Your own aircraft (Phase 2) stands in the hangar's east half, nose to the doors, clear of the prop plane's stand */
export const HANGAR_SPOT = { x: HANGAR[0] + 14.8, z: HANGAR[1] + 10, yaw: -Math.PI / 2 };
/** The hangar office on its east side; its door opens the hangar menu */
export const HANGAR_OFFICE: Footprint = [HANGAR[2], HANGAR[3] - 5, HANGAR[2] + 3.2, HANGAR[3], 2.6];
export const HANGAR_DOOR = { x: HANGAR[2] + 1.4, z: HANGAR[3] + 0.55 };
/** The airport panel's Walk in: walk mode starts on the apron by the office door, looking into the hangar */
export const AIR_SPAWN = (() => {
  const [x, z] = [HANGAR_DOOR.x - 0.6, HANGAR_DOOR.z + 2.4];
  return { x, z, yaw: Math.atan2(-(HANGAR_SPOT.x - x), -(HANGAR_SPOT.z - z)) };
})();
/** The maintenance hangar, big enough for an airliner: doors shut, one parked on its apron (`PARKED_JETS`) */
export const MRO: Footprint = [140, 334, 178, 358, 8.6];
/** The helipad and the executive helicopter's pad (finance plan Phase 6), on the GA apron's west side */
export const HELIPAD = { x: 104, z: 372, r: 4.5 };
export const EXEC_PAD = { x: 104, z: 390, r: 3.6 };

/* Round the field */

/** The fire station by the runway's east end, in the cargo apron's corner, its doors to the runway; the fuel farm landside, in its north-east corner (step 3 moved both for the cargo area) */
export const FIRE: Footprint = [428, 372, 450, 388, 3.8];
export const FUEL_TANKS: { x: number; z: number; r: number; h: number }[] = [414, 428, 442].map((x) => ({ x, z: 168, r: 5, h: 3.6 }));
/* The cargo area (step 3): at the airside's east end, past the passenger apron */

/**
 * The cargo shed on the fence's line (it stands in it as the hall does): its docks on the landside, north, onto the
 * truck yard (`DOCKS`, its doors' x); its doors on the airside, south, onto the cargo apron; the office block at its
 * east end, a storey taller, SECTOR 7 CARGO on its face
 */
export const CARGO_SHED: Footprint = [402, 314, 440, 340, 6.4];
export const CARGO_OFFICE: Footprint = [440, 312, 450, 340, 8.6];
export const DOCKS: number[] = [407, 413, 419, 425, 431, 437];
/** The cargo apron, from the shed's airside doors down to the taxiway, the passenger apron's east end to the fence */
export const CARGO_APRON: Rect = [396, CARGO_SHED[3], AIRSIDE[2] - 1, TAXIWAY.z - TAXIWAY.half];
/**
 * Its two stands, nose in to the shed (facing north, as the passenger stands): the first the freighter on the
 * timetable flies from (pushed back onto the taxilane as the airliners are), the second's freighter parked
 */
export const CARGO_STANDS: Pt[] = [
  [414, 356],
  [439, 356],
];
/** The localizer's aerial array past the runway's far end (the landings line up on it), and the PAPI beside the touchdown zone */
export const LOCALIZER = { x: 422, z: RUNWAY.z, w: 12, h: 1.3 };
export const PAPI = { x: RUNWAY.x0 + 26, z: RUNWAY.z - RUNWAY.half - 4 };
/**
 * Floodlight masts along the terminal, between the stands' wingtips, and on the cargo apron (lighting phase): x, z and
 * which way their lamps face (+1 south, -1 north); `MAST_POOLS` the pools of light they throw on the apron at night
 */
export const MASTS: [number, number, 1 | -1][] = [...[209, 287, 365].map((x): [number, number, 1] => [x, 376, 1]), [426.5, 368, -1], [398.5, 360, 1]];
export const MAST_POOLS: [number, number, number][] = MASTS.flatMap(([x, z, f]): [number, number, number][] => [8, 16].map((d): [number, number, number] => [x, z + f * d, 13]));
/** A windsock on the grass between the taxiway and the runway */
export const WINDSOCK: Pt = [182, 432.5];
/** The perimeter fence (round the airside, broken for the hall, the crew gate by it and the cargo shed) */
export const FENCE: { a: Pt; b: Pt }[] = [
  { a: [AIRSIDE[0], AIRSIDE[1]], b: [255, AIRSIDE[1]] },
  // (the crew gate: from the kerb past the hall's west end onto the airside)
  { a: [259, AIRSIDE[1]], b: [HALL[0], AIRSIDE[1]] },
  { a: [HALL[0], AIRSIDE[1]], b: [HALL[0], HALL[1]] },
  { a: [HALL[2], HALL[1]], b: [HALL[2], AIRSIDE[1]] },
  // (the cargo shed and its office stand in the line too: step 3)
  { a: [HALL[2], AIRSIDE[1]], b: [CARGO_SHED[0], AIRSIDE[1]] },
  { a: [CARGO_OFFICE[2], AIRSIDE[1]], b: [AIRSIDE[2], AIRSIDE[1]] },
  { a: [AIRSIDE[2], AIRSIDE[1]], b: [AIRSIDE[2], AIRSIDE[3]] },
  { a: [AIRSIDE[2], AIRSIDE[3]], b: [AIRSIDE[0], AIRSIDE[3]] },
  // (the west side, broken for the GA gate)
  { a: [AIRSIDE[0], AIRSIDE[3]], b: [AIRSIDE[0], GA_GATE.z1] },
  { a: [AIRSIDE[0], GA_GATE.z0], b: [AIRSIDE[0], AIRSIDE[1]] },
];
export const FENCE_H = 2.2;

/* ---------- Landside (Phase 3 step 2): Airport Drive, the forecourt's loop, the departures deck ---------- */

/** Airport Drive: south off the south bank avenue (east of the highway) to the forecourt */
export const ROAD = { x: 300, z0: 137, z1: 300, half: 1.7 };
/**
 * The forecourt's one-way loop, off the drive's end and back onto it a little north: east along `z0`, south down
 * `east`, west along `up` (up the departures ramp onto the deck), round the hairpin at `west`, east along `kerb` past
 * the hall's upper doors (the drop-off on its right, down the other ramp), north up `x1` and west along `out` to the drive
 */
export const LOOP = { z0: ROAD.z1, out: 292, east: 388, x1: 396, west: 266, up: 320.5, kerb: 328, half: 1.7 };
/**
 * The departures deck in front of the hall's upper storey (`y` its top, `slab` thick): from `x0` to the ramps' tops
 * at `x1`, from `z0` to the hall's face; the up and down ramps run east from it to their feet at `foot`, each in a
 * band either side of its lane (`RAMP_HALF`): up along `up`, down along `kerb`. Under it, at street level, the arrivals kerb, the taxi rank and the
 * bus bay; its piers in rows (`PIERS`, off the lanes above them)
 */
export const DEPARTURES = { y: 3.3, slab: 0.45, x0: 262.5, x1: 338, z0: LOOP.up - 2.6, z1: HALL[1], foot: 370 };
export const RAMP_HALF = 2;
const RAMPS: [number, number][] = [LOOP.up, LOOP.kerb].map((c): [number, number] => [c - RAMP_HALF, c + RAMP_HALF]);
/** How far up or down a step onto it reaches (as Liberty Bridge's) */
const DECK_STEP = 0.55;
/** Its piers: along the deck's north edge and down the median between the lanes, every 12 */
export const PIERS: Pt[] = [DEPARTURES.z0 + 0.35, (RAMPS[0][1] + RAMPS[1][0]) / 2].flatMap((z) => [270, 282, 294, 306, 318, 330].map((x): Pt => [x, z]));
export const PIER = 0.32;

/**
 * The walking and driving surface of the deck and its ramps at x, z (`m` in from its edges), or null off it: the
 * deck flat at `y`, each ramp falling to the street from the deck's edge to its foot. Between the ramps' bands
 * the deck's east edge is its edge
 */
export function departuresSurface(x: number, z: number, m = 0): number | null {
  const D = DEPARTURES;
  const inBand = RAMPS.find(([a, b]) => z >= a + m && z <= b - m);
  if (x >= D.x0 + m && x <= (inBand ? D.x1 : D.x1 - m) && z >= D.z0 + m && z <= D.z1 - m) return D.y;
  if (inBand && x > D.x1 && x <= D.foot) return (D.y * (D.foot - x)) / (D.foot - D.x1);
  return null;
}
/** The deck under you: its surface when you're up there (or near enough to step onto it), else null */
export function departuresY(x: number, z: number, y: number, m = 0): number | null {
  const s = departuresSurface(x, z, m);
  return s !== null && y >= s - DECK_STEP ? s : null;
}
/** Up on the deck, off its surface (or `m` short of its edge): its parapets, the hall's face (you can't step or fall off) */
export function departuresWall(x: number, z: number, y: number, m = 0) {
  if (departuresY(x, z, y, m) !== null) return false;
  if (y < DECK_STEP + 0.05) return false;
  const D = DEPARTURES;
  return x >= D.x0 - m - 0.05 && x <= D.foot + m && z >= D.z0 - m - 0.05 && z <= D.z1 + m;
}
/** The height the traffic drives at here: the deck and its ramps (nothing drives under them), else the street */
export const departuresRoadY = (x: number, z: number) => departuresSurface(x, z) ?? 0;
/** How steeply the road climbs eastwards here (dy / dx): on a ramp, falling to its foot; else flat */
export function departuresSlope(x: number, z: number) {
  const D = DEPARTURES;
  return x > D.x1 && x <= D.foot && RAMPS.some(([a, b]) => z >= a && z <= b) ? -D.y / (D.foot - D.x1) : 0;
}
/** Its parapets, for a car up on it (drive.ts adds them while the car is up: down below they'd be walls in the open) */
export const DECK_WALLS: Footprint[] = (() => {
  const D = DEPARTURES;
  const top = D.y + 1;
  const t = 0.15;
  return [
    // The north edge and the hairpin's west end
    [D.x0, D.z0 - t, D.x1, D.z0, top],
    [D.x0 - t, D.z0, D.x0, D.z1, top],
    // The deck's east edge between the ramps
    [D.x1, RAMPS[0][1], D.x1 + t, RAMPS[1][0], top],
    // Each ramp's sides
    ...RAMPS.flatMap(([a, b]): Footprint[] => [
      [D.x1, a - t, D.foot, a, top],
      [D.x1, b, D.foot, b + t, top],
    ]),
  ];
})();
/**
 * What's solid down at street level: the piers, and under each ramp its embankment where the ramp's higher than a
 * step (its foot you walk onto), one box only as high as that step (so a car up on the ramp, over it, never meets
 * it: drive.ts drops what's under it; one box, not pieces: a car pushed out of one piece would land in the next)
 */
export const DECK_SOLIDS: Footprint[] = (() => {
  const D = DEPARTURES;
  const steep = D.foot - (DECK_STEP * (D.foot - D.x1)) / D.y;
  return [...PIERS.map(([x, z]): Footprint => [x - PIER, z - PIER, x + PIER, z + PIER, D.y - D.slab]), ...RAMPS.map(([a, b]): Footprint => [D.x1, a, steep, b, DECK_STEP])];
})();
/** The deck's slab for the walk camera: it can't pass up through it from under the deck (a box with a bottom) */
export const DECK_CAMERA: number[][] = [[DEPARTURES.x0, DEPARTURES.z0, DEPARTURES.x1, DEPARTURES.z1, DEPARTURES.y, DEPARTURES.y - DEPARTURES.slab]];

/**
 * Cargo Road (step 3): east off Airport Drive north of the multi-storey to the cargo yard, and the one-way loop round
 * the yard (as the GA car park's: in at the road's end, south, west past the shed's docks along `loopZ`, north up
 * `loopX` and back onto the road)
 */
export const CARGO_ROAD = { z: 244, x1: 448, loopX: 404, loopZ: 300, half: 1.7 };
export const AIRPORT_STREETS: { id: string; pts: Pt[]; oneway?: 1 | -1 }[] = [
  {
    id: 'airport-drive',
    pts: [
      [ROAD.x, ROAD.z0],
      [ROAD.x, ROAD.z1],
    ],
  },
  {
    id: 'airport-forecourt',
    pts: [
      [ROAD.x, LOOP.z0],
      [LOOP.east, LOOP.z0],
      [LOOP.east, LOOP.up],
      [LOOP.west, LOOP.up],
      [LOOP.west, LOOP.kerb],
      [LOOP.x1, LOOP.kerb],
      [LOOP.x1, LOOP.out],
      [ROAD.x, LOOP.out],
    ],
    oneway: 1,
  },
  {
    id: 'airport-cargo',
    pts: [
      [ROAD.x, CARGO_ROAD.z],
      [CARGO_ROAD.x1, CARGO_ROAD.z],
    ],
  },
  {
    id: 'airport-cargo-loop',
    pts: [
      [CARGO_ROAD.loopX, CARGO_ROAD.z],
      [CARGO_ROAD.loopX, CARGO_ROAD.loopZ],
      [CARGO_ROAD.x1, CARGO_ROAD.loopZ],
      [CARGO_ROAD.x1, CARGO_ROAD.z],
    ],
    oneway: -1,
  },
];
/** Where they meet the south bank avenue and each other (no lights) */
export const AIRPORT_CROSSINGS: { id: string; at: Pt; streets: string[] }[] = [
  { id: 'airport-in', at: [ROAD.x, ROAD.z0], streets: ['ew4', 'airport-drive'] },
  { id: 'airport-forecourt-in', at: [ROAD.x, LOOP.z0], streets: ['airport-drive', 'airport-forecourt'] },
  { id: 'airport-forecourt-out', at: [ROAD.x, LOOP.out], streets: ['airport-drive', 'airport-forecourt'] },
  { id: 'airport-cargo-in', at: [ROAD.x, CARGO_ROAD.z], streets: ['airport-drive', 'airport-cargo'] },
  { id: 'airport-cargo-w', at: [CARGO_ROAD.loopX, CARGO_ROAD.z], streets: ['airport-cargo', 'airport-cargo-loop'] },
  { id: 'airport-cargo-e', at: [CARGO_ROAD.x1, CARGO_ROAD.z], streets: ['airport-cargo', 'airport-cargo-loop'] },
];

/** The arrivals level under the deck: the taxi rank's Cruisers in taxi yellow waiting nose to tail, and the airport bus in its bay */
export const RANK_Z = (RAMPS[0][1] + RAMPS[1][0]) / 2 + 2.9;
export const RANK: [string, number, number, number, string][] = [276, 280.5, 285, 289.5, 294].map((x): [string, number, number, number, string] => ['sedan', x, RANK_Z, 0, '#ffd23f']);
export const BUS_BAY = { x: 312, z: RANK_Z };
/**
 * The multi-storey car park north of the loop (`MSCP`: its decks `levels` apart, the roof's parapet `top`; step 3
 * moved it a block north for the cargo yard), its entrance on the west off a drive from Cargo Road; the hotel by the
 * drive (`HOTEL`, its front on the drive's east sidewalk)
 */
export const MSCP = { rect: [344, 252, 388, 284] as Rect, levels: 2.6, decks: 4, top: 10.9 };
export const HOTEL = { rect: [308, 198, 340, 226] as Rect, top: 10.6, floors: 9 };
/** Cars on the multi-storey's decks (and its roof), along its open north and south sides: about two in three bays taken */
export const MSCP_CARS: { y: number; cars: [string, number, number, number, string][] }[] = Array.from({ length: MSCP.decks }, (_, k) => {
  const [x0, z0, x1, z1] = MSCP.rect;
  const models = ['hatch', 'sedan', 'coupe', 'pickup', 'van', 'hatch'];
  const colours = ['#f3f2f7', '#2b2d3a', '#e23b3b', '#2aabee', '#8a86a8', '#ffd23f', '#1fbf6b'];
  const cars: [string, number, number, number, string][] = [];
  let n = k * 7;
  for (let x = x0 + 2.2; x < x1 - 2; x += 1.9)
    for (const [z, yaw] of [
      [z0 + 2.2, Math.PI / 2],
      [z1 - 2.2, -Math.PI / 2],
    ] as const) {
      if (Math.abs(Math.sin(x * 4.7 + k * 9.1 + z) * 9137.31) % 1 < 0.35) continue;
      cars.push([models[n % models.length], x, z, yaw, colours[n % colours.length]]);
      n++;
    }
  return { y: (k + 1) * MSCP.levels, cars };
});
/** Lamps up on the deck, along its north parapet and by the hairpin (x, z, the way the arm reaches) */
export const DECK_LAMPS: [number, number, number][] = [
  ...[276, 300, 324].map((x): [number, number, number] => [x, DEPARTURES.z0 + 0.4, -Math.PI / 2]),
  [DEPARTURES.x0 + 0.4, (LOOP.up + LOOP.kerb) / 2, 0],
];
/** The truck yard: paved from the loop's west side to the fence, from Cargo Road down to the shed's docks */
export const YARD: Rect = [CARGO_ROAD.loopX - CARGO_ROAD.half - 1.2, CARGO_ROAD.z + CARGO_ROAD.half, AIRSIDE[2], CARGO_SHED[1]];
/**
 * The cargo's trucks: a trailer with its back at (x, z), facing along z (`dir`: -1 north, +1 south), `cab` with its
 * tractor unit in front; backed up to the shed's docks, and parked in rows inside the loop, about half the bays taken
 * (the same ones every visit). `RIG` their sizes (a trailer about 13 m long, its tractor 6)
 */
export interface Rig {
  x: number;
  z: number;
  dir: 1 | -1;
  cab: boolean;
  color: string;
}
export const RIG = { w: 1.4, trailer: 7.2, gap: 0.3, tractor: 3.2, h: 2.3 };
export const RIGS: Rig[] = (() => {
  const colours = ['#f3f2f7', '#2aabee', '#e23b3b', '#c9c4e6', '#ffd23f', '#1fbf6b', '#ff8a3d'];
  const out: Rig[] = [];
  let k = 0;
  for (const i of [0, 1, 3, 4]) out.push({ x: DOCKS[i], z: CARGO_SHED[1] - 0.1, dir: -1, cab: i !== 3, color: colours[k++ % colours.length] });
  const { loopX, x1, z, loopZ, half } = CARGO_ROAD;
  for (const [back, dir] of [
    [z + half + 0.7, 1],
    [loopZ - half - 0.7, -1],
  ] as const)
    for (let x = loopX + 4; x <= x1 - 4; x += 2.4) {
      if (Math.abs(Math.sin(x * 7.13 + dir * 3.7) * 9137.31) % 1 < 0.45) continue;
      out.push({ x, z: back, dir, cab: k % 3 === 0, color: colours[k++ % colours.length] });
    }
  return out;
})();
/** A rig's footprint (x0, z0, x1, z1): its trailer, and its tractor when it has one */
export function rigRect(r: Rig): Rect {
  const len = RIG.trailer + (r.cab ? RIG.gap + RIG.tractor : 0);
  const [a, b] = [r.z, r.z + r.dir * len];
  return [r.x - RIG.w / 2, Math.min(a, b), r.x + RIG.w / 2, Math.max(a, b)];
}
/** On the cargo apron: a high loader at the parked freighter's main deck door (forward, on its left), tugs and their dollies of containers along the shed */
export const CARGO_KIT: { kind: 'loader' | 'dollies'; at: Pt; yaw: number }[] = [
  { kind: 'loader', at: [CARGO_STANDS[1][0] - 4.4, CARGO_STANDS[1][1] - 5.4], yaw: 0 },
  { kind: 'dollies', at: [426, 343.6], yaw: Math.PI },
  { kind: 'dollies', at: [CARGO_STANDS[0][0] - 9, 343.6], yaw: 0 },
];
const CARGO_KIT_HALF = { loader: [1.8, 1.0], dollies: [3.6, 0.7] } as const;
/** People at work: at the docks, by the loader and the dollies (x, z, facing) */
export const CARGO_PEOPLE: [number, number, number][] = [
  [DOCKS[2] + 0.6, CARGO_SHED[1] - 1.2, Math.PI],
  [DOCKS[5] - 0.8, CARGO_SHED[1] - 1.6, 0.4],
  [CARGO_STANDS[1][0] - 6.8, CARGO_STANDS[1][1] - 3.6, -Math.PI / 2],
  [CARGO_STANDS[1][0] - 7.4, CARGO_STANDS[1][1] - 7.2, 2.4],
  [423.5, 346, Math.PI],
];

/**
 * General aviation's way in: a short road east off the east ring avenue south of the highway to a little car park
 * by the fence's west gate, the walk in to Hangar 1 (a one-way loop round the car park, as the kart park's is:
 * in from the road's end, back out at its west end)
 */
export const GA_ROAD = { z: 342, x0: 64.5, x1: 90, loopX: 72, loopZ: 356, half: 1.7 };
export const GA_STREETS: { id: string; pts: Pt[]; oneway?: -1 }[] = [
  {
    id: 'airport-ga',
    pts: [
      [GA_ROAD.x0, GA_ROAD.z],
      [GA_ROAD.x1, GA_ROAD.z],
    ],
  },
  {
    id: 'airport-ga-loop',
    pts: [
      [GA_ROAD.loopX, GA_ROAD.z],
      [GA_ROAD.loopX, GA_ROAD.loopZ],
      [GA_ROAD.x1, GA_ROAD.loopZ],
      [GA_ROAD.x1, GA_ROAD.z],
    ],
    oneway: -1,
  },
];
export const GA_CROSSINGS: { id: string; at: Pt; streets: string[] }[] = [
  { id: 'airport-ga-in', at: [GA_ROAD.x0, GA_ROAD.z], streets: ['ns3', 'airport-ga'] },
  { id: 'airport-ga-w', at: [GA_ROAD.loopX, GA_ROAD.z], streets: ['airport-ga', 'airport-ga-loop'] },
  { id: 'airport-ga-e', at: [GA_ROAD.x1, GA_ROAD.z], streets: ['airport-ga', 'airport-ga-loop'] },
];
/** Where you arrive at the airport (by taxi, on fast travel, `PLACES`): on the GA car park's kerb, facing the gate */
export const AIR_ARRIVE = { x: GA_ROAD.x1 + GA_ROAD.half + 1.6, z: (GA_GATE.z0 + GA_GATE.z1) / 2, yaw: -Math.PI / 2 };

/** The short-stay car park inside the loop, north of the deck and its ramp: two rows of bays */
export const CAR_PARK: Rect = [ROAD.x + 2.6, LOOP.z0 + LOOP.half + 0.6, LOOP.east - LOOP.half - 0.6, DEPARTURES.z0 - 0.5];
/** The GA car park inside its loop */
export const GA_CAR_PARK: Rect = [GA_ROAD.loopX + GA_ROAD.half + 0.6, GA_ROAD.z + GA_ROAD.half + 0.4, GA_ROAD.x1 - GA_ROAD.half - 0.6, GA_ROAD.loopZ - GA_ROAD.half - 0.4];
/** Parked cars: model, x, z, heading (yaw, as cars.ts turns them), colour */
export const PARKED: [string, number, number, number, string][] = (() => {
  const out: [string, number, number, number, string][] = [];
  const models = ['hatch', 'sedan', 'pickup', 'hatch', 'coupe', 'van', 'sedan'];
  const colours = ['#e23b3b', '#2aabee', '#ffd23f', '#f3f2f7', '#8000ff', '#1fbf6b', '#ff8a3d', '#2b2d3a'];
  let k = 0;
  for (const [x0, z0, x1, z1] of [CAR_PARK, GA_CAR_PARK]) {
    const rows = [z0 + 1.6, z1 - 1.6];
    for (let x = x0 + 1.2; x < x1 - 1; x += 1.7)
      rows.forEach((z, r) => {
        // About half the bays taken, the same ones every visit
        if (Math.abs(Math.sin(x * 12.9898 + r * 78.233) * 43758.5453) % 1 < 0.45) return;
        out.push([models[k % models.length], x, z, r === 0 ? Math.PI / 2 : -Math.PI / 2, colours[k % colours.length]]);
        k++;
      });
  }
  return out;
})();
/** How big a parked car's footprint is (the longest model, either way round) */
const CAR_HALF = { l: 1.35, w: 0.6 };
/** Lamps along the drive and round the loop: x, z, which way the arm reaches */
export const AIRPORT_LAMPS: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  const o = ROAD.half + 0.6;
  for (let z = ROAD.z0 + 10; z < LOOP.out - 6; z += 14) out.push([ROAD.x - o, z, Math.PI], [ROAD.x + o, z + 7, 0]);
  // (round the loop's street-level stretches: along its north side and its east sides)
  for (let x = ROAD.x + 12; x < LOOP.east - 4; x += 14) out.push([x, LOOP.out - o, -Math.PI / 2]);
  for (const z of [LOOP.out + 4, LOOP.z0 + 12]) out.push([LOOP.x1 + o, z, 0]);
  // ...along Cargo Road and round the truck yard's loop
  for (let x = ROAD.x + 14; x < CARGO_ROAD.x1 - 4; x += 16) out.push([x, CARGO_ROAD.z - o, -Math.PI / 2]);
  for (const z of [CARGO_ROAD.z + 16, CARGO_ROAD.z + 40]) out.push([CARGO_ROAD.x1 + o, z, 0], [CARGO_ROAD.loopX - o, z, Math.PI]);
  // ...and along the GA road, and by the gate
  out.push([GA_ROAD.x0 + 14, GA_ROAD.z - o, -Math.PI / 2], [GA_ROAD.x1 + o, GA_ROAD.loopZ - 2, 0]);
  return out;
})();

/** Ground vehicles parked on the apron between the stands: a fuel truck, a baggage tug and carts, a stairs truck, a bus */
export const APRON_KIT: { kind: 'fuel' | 'tug' | 'stairs' | 'bus'; at: Pt; yaw: number }[] = [
  { kind: 'fuel', at: [235, 381], yaw: Math.PI / 2 },
  { kind: 'tug', at: [261, 381], yaw: Math.PI / 2 },
  { kind: 'bus', at: [313, 381], yaw: Math.PI / 2 },
  { kind: 'stairs', at: [339, 381], yaw: Math.PI / 2 },
];
const KIT_HALF = { fuel: [1.6, 0.6], tug: [2.4, 0.5], stairs: [1.3, 0.55], bus: [2.6, 0.75] } as const;

/* ---------- Night lighting and the roadside (lighting and signs phase) ---------- */

/**
 * The stand guidance boards (VDGS): one on the building's face in line with each stand's lead-in (the terminal's
 * airside face, the cargo shed's), at `y`, facing the stand; airport.ts lights each by what's on its stand (dim with
 * none, amber while a jet rolls in, green once it's parked)
 */
export const VDGS: { x: number; z: number; y: number; stand: Pt }[] = [
  ...STANDS.map((s): { x: number; z: number; y: number; stand: Pt } => ({ x: s[0], z: TERMINAL[3], y: 3.1, stand: s })),
  ...CARGO_STANDS.map((s): { x: number; z: number; y: number; stand: Pt } => ({ x: s[0], z: CARGO_SHED[3], y: 3.5, stand: s })),
];
/** The approach lights' "rabbit": a strobe running in along the crossbars to the threshold, twice a second, at night */
export const RABBIT = { x0: APPROACH.x0, x1: APPROACH.x1, every: 2, period: 0.5 };
/** Centreline lights: the runway's white every `runway` (red and white towards its far end), the taxiway's green every `taxi` */
export const CENTRE_LIGHTS = { runway: 8, taxi: 6, far: 90, end: 30 };

/** A road sign: the board's middle (x, z) at the height `y`, facing the way `yaw` turns +z, `w` wide, which text, and on a single post or a gantry over the road */
export type SignText = 'airport-r' | 'airport-l' | 'cargo' | 'terminal' | 'park' | 'ga';
export interface RoadSign {
  x: number;
  z: number;
  y: number;
  yaw: number;
  w: number;
  text: SignText;
  /** A post either side (`gantry`, over the road from `x0` to `x1`) or one post */
  posts: number[];
}
export const ROAD_SIGNS: RoadSign[] = [
  // On the south bank avenue's south verge: for the traffic each way, the airport's drive to the south
  { x: 288, z: 144.2, y: 2.2, yaw: -Math.PI / 2, w: 3.4, text: 'airport-r', posts: [] },
  { x: 314, z: 144.2, y: 2.2, yaw: Math.PI / 2, w: 3.4, text: 'airport-l', posts: [] },
  // Over the drive coming south: Cargo Road and the multi-storey off to the left, the terminal straight on; then
  // the forecourt's loop off to the left for departures and arrivals
  { x: ROAD.x, z: CARGO_ROAD.z - 12, y: 4.3, yaw: Math.PI, w: 6.4, text: 'cargo', posts: [ROAD.x - ROAD.half - 1.6, ROAD.x + ROAD.half + 1.6] },
  { x: ROAD.x, z: LOOP.out - 8, y: 4.3, yaw: Math.PI, w: 6.4, text: 'terminal', posts: [ROAD.x - ROAD.half - 1.6, ROAD.x + ROAD.half + 1.6] },
  // On Cargo Road before the multi-storey's drive, for the traffic coming east
  { x: MSCP.rect[0] - 9, z: CARGO_ROAD.z + CARGO_ROAD.half + 2.2, y: 2.0, yaw: -Math.PI / 2, w: 2.2, text: 'park', posts: [] },
  // On the GA road's north verge past its loop's way in, facing the traffic off the avenue
  { x: GA_ROAD.loopX + 8, z: GA_ROAD.z - GA_ROAD.half - 2.6, y: 2.0, yaw: -Math.PI / 2, w: 3.2, text: 'ga', posts: [] },
];
/** At the drive's way in off the avenue: a low stone wall with SECTOR 7 AIRPORT on it in a planted bed, flags across the drive */
export const GATEWAY = { x0: ROAD.x - ROAD.half - 15, x1: ROAD.x - ROAD.half - 3.2, z: ROAD.z0 + 13, h: 2, bed: 1.6 };
export const FLAGS: Pt[] = [0, 1, 2, 3, 4].map((k): Pt => [ROAD.x + ROAD.half + 3.4 + k * 2.4, ROAD.z0 + 13]);
export const FLAG_H = 5.2;
/**
 * Planting: beds of flowers along the drive's verges between its trees (x, z), clipped hedges along the short-stay
 * car park (x0, z0, x1, z1), and shrubs round the hotel and the multi-storey (x, z)
 */
export const BEDS: Pt[] = (() => {
  const out: Pt[] = [];
  for (let z = ROAD.z0 + 24; z < LOOP.out - 10; z += 14)
    for (const s of [-1, 1]) {
      const x = ROAD.x + s * (ROAD.half + 3.2);
      // (clear of the junctions, the gantries and the hotel's front)
      if (Math.abs(z - CARGO_ROAD.z) < 9 || ROAD_SIGNS.some((r) => r.posts.length && Math.abs(r.z - z) < 4)) continue;
      if (s > 0 && z > HOTEL.rect[1] - 4 && z < HOTEL.rect[3] + 4) continue;
      out.push([x, z]);
    }
  return out;
})();
export const HEDGES: Rect[] = [
  [CAR_PARK[0] - 0.4, CAR_PARK[1] - 0.45, CAR_PARK[2] + 0.4, CAR_PARK[1] - 0.05],
  [CAR_PARK[0] - 0.4, CAR_PARK[3] + 0.05, CAR_PARK[2] + 0.4, CAR_PARK[3] + 0.45],
];
export const SHRUBS: Pt[] = [
  ...[0.15, 0.35, 0.65, 0.85].map((f): Pt => [HOTEL.rect[2] + 1.6, HOTEL.rect[1] + f * (HOTEL.rect[3] - HOTEL.rect[1])]),
  ...[0.12, 0.3, 0.5, 0.7, 0.88].map((f): Pt => [MSCP.rect[0] + f * (MSCP.rect[2] - MSCP.rect[0]), MSCP.rect[1] - 1.8]),
  ...[0.2, 0.5, 0.8].map((f): Pt => [MSCP.rect[2] + 1.8, MSCP.rect[1] + f * (MSCP.rect[3] - MSCP.rect[1])]),
];
/** Trees along Cargo Road's north side, between its lamps */
export const CARGO_TREES: Pt[] = [];
for (let x = ROAD.x + 22; x < CARGO_ROAD.x1 - 8; x += 16) CARGO_TREES.push([x, CARGO_ROAD.z - CARGO_ROAD.half - 2.6]);

/** What's solid at the airport for walking and driving (the ground itself is open) */
export const AIRPORT_SOLIDS: Footprint[] = [
  HALL,
  ...CONCOURSES,
  [TOWER.x - 2.6, TOWER.z - 2.4, TOWER.x + 2.6, TOWER.z + 2.4, 2.6],
  [TOWER.x - TOWER.r, TOWER.z - TOWER.r, TOWER.x + TOWER.r, TOWER.z + TOWER.r, TOWER.top],
  // Hangar 1's walls and back (its front stands open)
  [HANGAR[0], HANGAR[1], HANGAR[0] + 0.4, HANGAR[3], HANGAR[4]],
  [HANGAR[2] - 0.4, HANGAR[1], HANGAR[2], HANGAR[3], HANGAR[4]],
  [HANGAR[0], HANGAR[1], HANGAR[2], HANGAR[1] + 0.4, HANGAR[4]],
  HANGAR_OFFICE,
  MRO,
  FIRE,
  ...FUEL_TANKS.map(({ x, z, r, h }): Footprint => [x - r, z - r, x + r, z + r, h]),
  [LOCALIZER.x - 0.4, LOCALIZER.z - LOCALIZER.w / 2, LOCALIZER.x + 0.4, LOCALIZER.z + LOCALIZER.w / 2, LOCALIZER.h],
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
  // The forecourt: the deck's piers and its ramps' embankments, the taxis on the rank and the bus in its bay under the
  // deck, the multi-storey car park and the hotel
  ...DECK_SOLIDS,
  ...RANK.map(([, x, z]): Footprint => [x - CAR_HALF.l, z - CAR_HALF.w, x + CAR_HALF.l, z + CAR_HALF.w, 1.2]),
  [BUS_BAY.x - 2.9, BUS_BAY.z - 0.8, BUS_BAY.x + 2.9, BUS_BAY.z + 0.8, 2.1],
  [...MSCP.rect, MSCP.top],
  [...HOTEL.rect, HOTEL.top],
  // The gateway's wall and the flagpoles
  [GATEWAY.x0, GATEWAY.z - 0.35, GATEWAY.x1, GATEWAY.z + 0.35, GATEWAY.h],
  ...FLAGS.map(([x, z]): Footprint => [x - 0.1, z - 0.1, x + 0.1, z + 0.1, FLAG_H]),
  // The cargo area: the shed and its office, the trucks, the loader and the dollies
  CARGO_SHED,
  CARGO_OFFICE,
  ...RIGS.map((r): Footprint => [...rigRect(r), RIG.h]),
  ...CARGO_KIT.map(({ kind, at: [x, z], yaw }): Footprint => {
    const [l, w] = CARGO_KIT_HALF[kind];
    const along = Math.abs(Math.cos(yaw)) > 0.5;
    return along ? [x - l, z - w, x + l, z + w, kind === 'loader' ? 2.6 : 1.6] : [x - w, z - l, x + w, z + l, kind === 'loader' ? 2.6 : 1.6];
  }),
  // The fence, a thin wall each run
  ...FENCE.map(({ a, b }): Footprint => [Math.min(a[0], b[0]) - 0.1, Math.min(a[1], b[1]) - 0.1, Math.max(a[0], b[0]) + 0.1, Math.max(a[1], b[1]) + 0.1, FENCE_H]),
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
  /** A freighter (an airliner in cargo colours, from a cargo stand: step 3) */
  freight?: boolean;
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
const TAXI = 6;
const PUSH = 2.5;
const R = RUNWAY.z;
const TZ = TAXIWAY.z;
const TL = TAXILANE.z;
const [CA, , CC] = CONNECTORS;
/** The departures' climb-out turn at the east end and their downwind leg over the north of the town (high: Uptown's spire is 45) */
const EAST = 442;
const NORTH = -40;
const WEST = -385;

/** An airliner's (and the freighter's) way round: from holding short on A, take off east, the climbing turn north, west high over the town, down the west side, the approach from the west, landing east */
const jetFlight = (): Act =>
  fly(
    [
      w(HOLD.x, HOLD.z, 0, 0),
      w(CA, R, 0, 3),
      w(CA + 16, R, 0, 9),
      w(235, R, 0, 26),
      w(330, R, 9, 30),
      w(EAST, R, 16, 32),
      w(EAST, NORTH, 50, 34),
      w(WEST, NORTH, 54, 34),
      w(WEST, R, 28, 30),
      w(20, R, 9, 26),
      // (over the fence and the threshold at a few tiles, down on the touchdown zone)
      w(RUNWAY.x0 - 6, R, 4, 25),
      w(RUNWAY.x0 + 22, R, 0, 24),
      w(300, R, 0, 6),
    ],
    32
  );

/**
 * An airliner: pushed back off its stand onto the taxilane, taxi west to hold short on A, onto the runway and away
 * east, a climbing turn north up the east side, west high over the north of the town, down the west side, round onto
 * the approach from the west, land east, off at C and back along the taxiway to its stand
 */
function jet(stand: Pt, takeoff: number, id: string): Flight {
  const [sx, sz] = stand;
  const acts: Act[] = [
    // Pushed back off the stand onto the taxilane, tail swinging east, nose ending up pointing west along it
    fly([w(sx, sz, 0, 0), w(sx, TL, 0, PUSH), w(sx + 12, TL, 0, 0)], 8, true),
    { kind: 'hold', dur: 4 },
    // Taxi west along the taxilane and down A, holding short of the runway
    fly([w(sx + 12, TL, 0, 0), w(sx + 6, TL, 0, TAXI), w(CA, TL, 0, TAXI), w(HOLD.x, HOLD.z - 5, 0, 3), w(HOLD.x, HOLD.z, 0, 0)], 7),
    { kind: 'hold', dur: 6 },
    // Onto the runway, take off east, the climbing turn north, west over the town, down the west side and in to land
    jetFlight(),
    // Off at C, back along the taxiway and into the stand
    fly([w(300, R, 0, 6), w(CC, R, 0, TAXI), w(CC, TZ, 0, TAXI), w(sx, TZ, 0, TAXI), w(sx, sz + 7, 0, 2.5), w(sx, sz, 0, 0)], 7),
    { kind: 'hold', dur: 0 },
  ];
  return flight(id, 'jet', acts, { fill: acts.length - 1, cycle: PERIOD, at: 4, when: takeoff, parked: acts.length - 1 });
}

/**
 * The freighter (step 3): an airliner's flight from a cargo stand, its stand further from the taxilane, so pushed back
 * onto a lane across the cargo apron (`CARGO_LANE` back, tail swinging west, clear of the fire station), round onto
 * the taxilane and west to A; its taxiing brisker (`FREIGHT_TAXI`) to keep to the same period as the airliners
 */
const CARGO_LANE = 24;
const FREIGHT_TAXI = 9;
function freighter(stand: Pt, takeoff: number, id: string): Flight {
  const [sx, sz] = stand;
  const cz = sz + CARGO_LANE;
  const T = FREIGHT_TAXI;
  const acts: Act[] = [
    fly([w(sx, sz, 0, 0), w(sx, cz, 0, PUSH), w(sx - 12, cz, 0, 0)], 8, true),
    { kind: 'hold', dur: 4 },
    fly([w(sx - 12, cz, 0, 0), w(sx - 4, cz, 0, 3), w(sx, cz, 0, 4), w(sx, TL, 0, T), w(sx - 8, TL, 0, T), w(CA, TL, 0, T), w(HOLD.x, HOLD.z - 5, 0, 3), w(HOLD.x, HOLD.z, 0, 0)], 7),
    { kind: 'hold', dur: 6 },
    // The airliners' way round, the same act
    jetFlight(),
    fly([w(300, R, 0, 6), w(CC, R, 0, T), w(CC, TZ, 0, T), w(sx, TZ, 0, T), w(sx, sz + 7, 0, 2.5), w(sx, sz, 0, 0)], 7),
    { kind: 'hold', dur: 0 },
  ];
  const f = flight(id, 'jet', acts, { fill: acts.length - 1, cycle: PERIOD, at: 4, when: takeoff, parked: acts.length - 1 });
  f.freight = true;
  return f;
}

/** The prop plane: from its stand by Hangar 1 out to the runway, a lower loop up the east side and back along the river, home */
function prop(takeoff: number): Flight {
  const [px, pz] = PROP_STAND;
  const acts: Act[] = [
    // Taxi out (it turned round on its stand first), along the taxilane, holding short on A
    fly([w(px, pz, 0, 0), w(px, pz + 5, 0, 3.5), w(px, TL, 0, 3.5), w(CA, TL, 0, 3.5), w(HOLD.x, HOLD.z - 5, 0, 3), w(HOLD.x, HOLD.z, 0, 0)], 6),
    { kind: 'hold', dur: 4 },
    // A short run, climb round to the north, west along the river, round to land
    fly(
      [
        w(HOLD.x, HOLD.z, 0, 0),
        w(CA, R, 0, 3),
        w(CA + 12, R, 0, 6),
        w(200, R, 0, 15),
        w(300, R, 8, 18),
        w(EAST, R, 12, 20),
        w(EAST, RIVER_MID, 22, 24),
        w(-150, RIVER_MID, 24, 24),
        w(-150, R, 16, 20),
        w(30, R, 6, 14),
        w(RUNWAY.x0 - 6, R, 3.6, 13),
        w(RUNWAY.x0 + 16, R, 0, 12),
        w(300, R, 0, 5),
      ],
      20
    ),
    // Off at C, along the taxiway and onto its stand
    fly([w(300, R, 0, 5), w(CC, R, 0, TAXI), w(CC, TZ, 0, TAXI), w(px, TZ, 0, TAXI), w(px, pz + 6, 0, 2.5), w(px, pz, 0, 0)], 6),
    { kind: 'hold', dur: 3, power: [1, 0] },
    { kind: 'hold', dur: 0, power: [0, 0] },
    { kind: 'hold', dur: 3, power: [0, 1] },
    // Turn round on the spot to face the taxilane
    { kind: 'turn', dur: 4, to: -Math.PI / 2 },
  ];
  return flight('prop', 'prop', acts, { fill: acts.length - 3, cycle: PERIOD, at: 2, when: takeoff, parked: acts.length - 3 });
}

/** The helicopter: up off its pad, over the highway and round the Emporium high above the hologram and the blimp, and back */
function heli(liftoff: number): Flight {
  const { x: hx, z: hz } = HELIPAD;
  const [ex, ez] = EMPORIUM;
  const ORBIT = 24;
  const H = 25;
  const via: Pt = [80, 230];
  // Straight up off the pad to clear the hangars before heading off
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
    fly([w(hx, hz, UP, 0), w(via[0], via[1], 24, 16), ...ring, w(via[0], via[1], 24, 16), w(hx, hz, UP, 0)], 10),
    // Hover over the pad, turn to face the field, settle down, rotor winds down
    { kind: 'turn', dur: 4, to: 0 },
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

/**
 * The executive helicopter (finance plan Phase 6, the owner's pick): from its pad at the airport up over the highway,
 * west high over the south row, up the east side of the spire to Uptown's tallest slab, down onto its rooftop helipad
 * (highrise.ts `ROOF_PAD`); a wait there, rotor stopped, then back the same way and down onto its pad
 */
function exec(liftoff: number): Flight {
  const { x: px, z: pz } = EXEC_PAD;
  const R = ROOF_PAD;
  const UP = 10;
  const OVER = R.y + 8;
  const out: Way[] = [
    w(px, pz, UP, 0),
    w(px - 6, 330, 30, 15),
    w(60, 190 + WIDEN / 4, 36, 17),
    w(-40, 102 + WIDEN, 36, 17),
    w(-104, 96 + WIDEN, 40, 14),
    w(-104, 26, OVER, 10),
    w(R.x + 7, R.z, OVER, 5),
    w(R.x, R.z, OVER, 0),
  ];
  const acts: Act[] = [
    fly(out, 12),
    { kind: 'lift', dur: 7, to: R.y },
    { kind: 'hold', dur: 3, power: [1, 0] },
    // Waiting on the roof, rotor stopped
    { kind: 'hold', dur: 30, power: [0, 0] },
    { kind: 'hold', dur: 4, power: [0, 1] },
    { kind: 'lift', dur: 6, to: OVER },
    // Turn over the roof to face the way back
    { kind: 'turn', dur: 4, to: 0 },
    fly([...out].reverse(), 12),
    { kind: 'turn', dur: 4, to: 0 },
    { kind: 'lift', dur: 6, to: 0 },
    { kind: 'hold', dur: 4, power: [1, 0] },
    { kind: 'hold', dur: 0, power: [0, 0] },
    { kind: 'hold', dur: 5, power: [0, 1] },
    { kind: 'lift', dur: 6, to: UP },
    // Turn to face the way out
    { kind: 'turn', dur: 4, to: yawOf([out[1].at[0] - px, out[1].at[1] - pz]) },
  ];
  return flight('heli-x', 'heli', acts, { fill: 11, cycle: PERIOD, at: 0, when: liftoff, parked: 11 });
}

/** When each one takes off, seconds into the period: the airliners in `FLYING_STANDS`' order, the freighter from the first cargo stand */
export type Timetable = { jets: number[]; prop: number; heli: number; exec?: number; cargo?: number };
export const timetable = (tt: Timetable): Flight[] => [
  ...FLYING_STANDS.map((k, i) => jet(STANDS[k], tt.jets[i], `jet-${'abcde'[i]}`)),
  prop(tt.prop),
  heli(tt.heli),
  ...(tt.exec === undefined ? [] : [exec(tt.exec)]),
  ...(tt.cargo === undefined ? [] : [freighter(CARGO_STANDS[0], tt.cargo, 'cargo-a')]),
];
/** Every aircraft flying today (the timetable keeps them apart: tests/airfield.test.ts checks) */
export const FLIGHTS: Flight[] = timetable({ jets: [0, 32, 159, 195], prop: 126, heli: 91, exec: 68, cargo: 98 });

/** Airliners standing at the other stands and on the maintenance hangar's apron (drawn with the flying ones, never moving) */
export const PARKED_JETS: Pose[] = [
  ...STANDS.filter((_, k) => !FLYING_STANDS.includes(k)).map(([x, z]): Pose => ({ x, y: 0, z, yaw: Math.PI / 2, pitch: 0, roll: 0, v: 0, ground: true, gear: true, power: 0 })),
  { x: (MRO[0] + MRO[2]) / 2, y: 0, z: MRO[3] + 14, yaw: Math.PI / 2, pitch: 0, roll: 0, v: 0, ground: true, gear: true, power: 0 },
];

/** Freighters parked at the cargo stands the timetable leaves (the second) */
export const PARKED_FREIGHTERS: Pose[] = CARGO_STANDS.slice(1).map(([x, z]): Pose => ({ x, y: 0, z, yaw: Math.PI / 2, pitch: 0, roll: 0, v: 0, ground: true, gear: true, power: 0 }));

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
