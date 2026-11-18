/*
 * Degen's home: his compound (docs/ends-far-west-plan.md Phase 2, the owner's call: a landmark with a design of its
 * own, a walled yard with gates in the Ends' far west; DOM-free, the boot's, tested in tests/home.test.ts). It stands
 * on its plot at the head of the Close (endsfar.ts `PLOT`), its gates opposite the road's end. It was the end house
 * of a terrace (docs/home-plan.md); that house is a neighbour's again.
 *
 * - **The wall and the gates** (`HOME.wall`, `HOME.gates`): brick, about head high, round the whole plot; the gates
 *   on the lane stand open (you drive and walk straight in), a small gate in the west wall to the allotments
 *   (`HOME.backGate`).
 * - **The double garage** (`HOME.garage`) at the yard's west end, on the Close's line, so its two doors face you as
 *   you come down the road: the car's (`CAR_HOME`) and the bike's (`BIKE_HOME`), both up. Its menu's prompt is
 *   `HOME_GARAGE_DOOR`.
 * - **The house** (`HOME.house`) along the south side, two storeys under a flat roof with a terrace on it (Phase 3
 *   climbs to it), its front door on the yard (`HOME.door`), a side door onto the garden.
 * - **The workshop** (`HOME.workshop`) against the north wall, its roller door on the yard: its prompt
 *   (`HOME_WORKSHOP_DOOR`) opens the garage's menu on its kit.
 * - **The yard** between them, block paving (the wide drive), and **the gardens**: the lawn in the north-west corner
 *   and the one east of the house (`HOME.lawns`).
 * - **The place**: spot `home` (its pin over the house, a panel with Walk in), where you arrive and where walking
 *   starts (`HOME_SPAWN`: in the yard, facing the front door).
 * - **Done up** (docs/compound-plan.md Phase 1): the yard's lit bollards (`BOLLARDS`) and the planters by the front
 *   door (`PLANTERS`), both solid; the rest of the upgrade (steel, neon, his mark, the hoop) is home3d.ts's drawing.
 * - **Inside**: one room on the ground floor (`ROOM`, `FURNITURE`), sealed: the doors are fades (`HOME_PORTALS`).
 * - **The roof terrace** (Phase 3): up the stairs (a fade too) to the roof inside its rail (`TERRACE`, `ROOF_THINGS`,
 *   `onRoof()`, `roofWall()`), the yard and the Close below.
 *
 * In world numbers (x across, z north (-) to south (+)), all from the plot, so the boot carries nothing else.
 */
import { GATES, PLOT } from './endsfar';
import { SLAB_Y, type Pt, type Rect } from './endswood';
import type { Box } from './solids';

const [px0, pz0, px1, pz1] = PLOT;
/** The compound wall's thickness and height, and its piers' at the gates */
export const WALL_T = 0.3;
export const WALL_H = 1.3;
export const PIER = { w: 0.5, h: 1.6 };
/** Inside the wall */
const [ix0, iz0, ix1, iz1] = [px0 + WALL_T, pz0 + WALL_T, px1 - WALL_T, pz1 - WALL_T];
/** The Close's line through the plot (the gates are on it) */
const AXIS = (GATES.z0 + GATES.z1) / 2;

/** The house's walls' top and its parapet's (over the slab): two storeys under a flat roof */
const EAVES = 2.5;
const RIDGE = 2.75;
const HOUSE: Rect = [ix0 + 6.4, iz1 - 6.8, ix0 + 15.4, iz1 - 0.3];
const GARAGE: Rect = [ix0 + 0.3, AXIS - 4, ix0 + 5.3, AXIS + 4];
const WORKSHOP: Rect = [ix0 + 8, iz0 + 0.3, ix0 + 13, iz0 + 4.3];

/** A door in a wall that runs along z (the garage's two, in its east wall): from, to along z, and its height */
interface DoorZ {
  x: number;
  z0: number;
  z1: number;
  h: number;
}
const garageDoor = (z0: number): DoorZ => ({ x: GARAGE[2], z0, z1: z0 + 3.2, h: 1.45 });

export const HOME = {
  /** The plot, and the land inside the wall */
  plot: PLOT,
  inner: [ix0, iz0, ix1, iz1] as Rect,
  /** The gates' opening in the east wall (on the lane, opposite the Close's end) */
  gates: GATES,
  /** The small gate in the west wall, by the north-west lawn (to the allotments) */
  backGate: { x: px0, z0: pz0 + 3.2, z1: pz0 + 4.2 },
  /** The house's body, and how tall (over the slab) */
  house: HOUSE,
  eaves: EAVES,
  ridge: RIDGE,
  /** The front door's middle on the front wall (the house faces north, onto the yard) */
  door: [(HOUSE[0] + HOUSE[2]) / 2, HOUSE[1]] as Pt,
  /** The side door's middle on the east wall (onto the east lawn) */
  sideDoor: [HOUSE[2], HOUSE[3] - 1.6] as Pt,
  /** The double garage: its body, its walls' height and its parapet's top (over the slab) */
  garage: GARAGE,
  garageH: 1.75,
  garageTop: 1.9,
  /** Its two doors in its east wall, north to south: the car's and the bike's */
  carDoor: garageDoor(GARAGE[1] + 0.4),
  bikeDoor: garageDoor(GARAGE[3] - 3.6),
  /** The workshop: its body, its height, and its roller door in its south wall (from, to along x; half up) */
  workshop: WORKSHOP,
  workshopH: 1.6,
  workshopDoor: { z: WORKSHOP[3], x0: WORKSHOP[0] + 0.9, x1: WORKSHOP[2] - 0.9, h: 1.3 },
  /** The lawns: the north-west corner's (a tree, a bench) and the one east of the house (the washing line) */
  lawns: [
    [ix0, iz0, WORKSHOP[0] - 0.6, GARAGE[1] - 0.6],
    [HOUSE[2] + 0.5, HOUSE[1], ix1, iz1],
  ] as Rect[],
} as const;

/** Where you arrive, and where walking starts: in the yard, facing the front door (yaw π faces south) */
// (within a door prompt's reach of his front door's, so "Go in" shows as you arrive)
export const HOME_SPAWN = { x: HOME.door[0] + 0.5, z: HOME.door[1] - 1.45, yaw: Math.PI };

/**
 * Does walking start at home? Not a new player's very first walk (the owner's call): that starts downtown by the
 * Emporium, where Getting started's first steps are; once anywhere has been walked to (the save's `visited`), home.
 */
export const startsAtHome = (visited: readonly string[]) => visited.length > 0;

/** The place's pick boxes (over the slab), the land its ring goes round, and its pin over the house */
export const HOME_PICK: { rect: Rect; h: number }[] = [
  { rect: HOME.house, h: RIDGE },
  { rect: HOME.garage, h: HOME.garageTop },
  { rect: HOME.workshop, h: HOME.workshopH },
];
export const HOME_LAND: Rect = PLOT;
export const HOME_PIN: Pt = [(HOUSE[0] + HOUSE[2]) / 2, (HOUSE[1] + HOUSE[3]) / 2];
export const HOME_PIN_H = RIDGE + 1.6;
export const HOME_SLAB = SLAB_Y;

/* ---------- Done up (docs/compound-plan.md Phase 1, the owner's pick: made good, with his neon) ---------- */

/** A low bollard with a lit cap: its radius and height (over the slab) */
export const BOLLARD = { r: 0.07, h: 0.38 };
/**
 * The yard's bollards, at its edges, clear of the drive: along the east lawn (the house's front's line, from a little
 * past the house's corner, so the way round to the side door stays open, to the wall by the gates) and along the
 * north strip from the workshop to the wall
 */
export const BOLLARDS: Pt[] = [
  ...[0, 1, 2, 3, 4].map((k): Pt => [HOUSE[2] + 1.4 + k * 1.95, HOUSE[1] - 0.25]),
  ...[0, 1, 2, 3, 4].map((k): Pt => [WORKSHOP[2] + 1.0 + k * 2.4, WORKSHOP[3] + 0.25]),
];
/** A planter each side of the front door, between the door and the windows, at the wall's foot */
export const PLANTER_H = 0.32;
export const PLANTERS: Rect[] = [-1, 1].map((s): Rect => {
  const x = (HOUSE[0] + HOUSE[2]) / 2 + s * 0.72;
  return [x - 0.15, HOUSE[1] - 0.46, x + 0.15, HOUSE[1] - 0.06];
});

/** The garage's and the workshop's walls' thickness, and the house's */
export const WALL = 0.12;
export const SHELL = 0.15;
/**
 * What's solid at the boot: the compound's wall (the gates and the back gate left open) and the gates' piers; the
 * house's four walls (the room inside is walked in: its doors are fades, not gaps); the garage's walls, its two
 * doors' openings clear (the doors are up); the workshop's, its roller door's opening shut by its bench inside
 */
export const HOME_SOLIDS: Box[] = (() => {
  const top = SLAB_Y + WALL_H;
  const pier = SLAB_Y + PIER.h;
  const { gates: G, backGate: B, carDoor: C, bikeDoor: K } = HOME;
  const [hx0, hz0, hx1, hz1] = HOME.house;
  const peak = SLAB_Y + RIDGE;
  const [gx0, gz0, gx1, gz1] = HOME.garage;
  const gtop = SLAB_Y + HOME.garageTop;
  const [wx0, wz0, wx1, wz1] = HOME.workshop;
  const wtop = SLAB_Y + HOME.workshopH;
  return [
    // The compound's wall: north, south, the west either side of the back gate, the east either side of the gates
    [px0, pz0, px1, pz0 + WALL_T, top],
    [px0, pz1 - WALL_T, px1, pz1, top],
    [px0, pz0, px0 + WALL_T, B.z0, top],
    [px0, B.z1, px0 + WALL_T, pz1, top],
    [px1 - WALL_T, pz0, px1, G.z0 - PIER.w, top],
    [px1 - WALL_T, G.z1 + PIER.w, px1, pz1, top],
    [px1 - PIER.w, G.z0 - PIER.w, px1, G.z0, pier],
    [px1 - PIER.w, G.z1, px1, G.z1 + PIER.w, pier],
    // The house
    [hx0, hz0, hx1, hz0 + SHELL, peak],
    [hx0, hz1 - SHELL, hx1, hz1, peak],
    [hx0, hz0, hx0 + SHELL, hz1, peak],
    [hx1 - SHELL, hz0, hx1, hz1, peak],
    // The garage: north, south and west walls, and the east one's two ends and the pier between its doors
    [gx0, gz0, gx1, gz0 + WALL, gtop],
    [gx0, gz1 - WALL, gx1, gz1, gtop],
    [gx0, gz0, gx0 + WALL, gz1, gtop],
    [gx1 - WALL, gz0, gx1, C.z0, gtop],
    [gx1 - WALL, C.z1, gx1, K.z0, gtop],
    [gx1 - WALL, K.z1, gx1, gz1, gtop],
    // The workshop (its door's opening too: the bench stands just inside it)
    [wx0, wz0, wx1, wz0 + WALL, wtop],
    [wx0, wz0, wx0 + WALL, wz1, wtop],
    [wx1 - WALL, wz0, wx1, wz1, wtop],
    [wx0, wz1 - WALL, wx1, wz1, wtop],
    // Done up (docs/compound-plan.md Phase 1): the yard's lit bollards and the planters by the front door
    ...BOLLARDS.map(([x, z]): Box => [x - BOLLARD.r, z - BOLLARD.r, x + BOLLARD.r, z + BOLLARD.r, SLAB_Y + BOLLARD.h]),
    ...PLANTERS.map((r): Box => [r[0], r[1], r[2], r[3], SLAB_Y + PLANTER_H]),
  ];
})();

/**
 * Where his vehicles live (garage.ts's home stands). A vehicle's yaw is its group's turn: its nose points along
 * (cos yaw, -sin yaw), so 0 is east, π west, -π/2 south, π/2 north (walking's yaw is another thing: 0 north, π
 * south). Both in the garage, noses to their doors (east, the way out): the car behind the north door, the bike
 * behind the south one.
 */
const bayX = (GARAGE[0] + GARAGE[2]) / 2 + 0.1;
export const CAR_HOME = { x: bayX, z: (HOME.carDoor.z0 + HOME.carDoor.z1) / 2, yaw: 0, r: 1.1 };
export const BIKE_HOME = { x: bayX + 0.6, z: (HOME.bikeDoor.z0 + HOME.bikeDoor.z1) / 2, yaw: 0 };
/** The garage's prompt (its menu, as the city garage's office door): in the yard by the pier between its doors */
export const HOME_GARAGE_DOOR = { x: GARAGE[2] + 0.55, z: AXIS };
/** The workshop's prompt (the same menu, opened on its kit): in the yard by its roller door */
export const HOME_WORKSHOP_DOOR = { x: (HOME.workshopDoor.x0 + HOME.workshopDoor.x1) / 2, z: HOME.workshopDoor.z + 0.55 };
/** Where the garage menu's camera looks from and at (over the slab): from out in the yard, into the garage */
export const HOME_VIEW = { eye: [GARAGE[2] + 5.6, 2.0, AXIS + 2.4] as [number, number, number], at: [bayX, 0.7, AXIS - 0.6] as [number, number, number] };

/** Is a point on the home's own ground (the plot)? What grows or stands about keeps off it */
export const onHome = (x: number, z: number, m = 0) => x > HOME_LAND[0] - m && x < HOME_LAND[2] + m && z > HOME_LAND[1] - m && z < HOME_LAND[3] + m;

/* ---------- Inside ---------- */

/**
 * The room inside: the house's ground floor, one room from wall to wall inside its shell, a ceiling `CEIL` over the
 * slab. It's sealed: the front door and the side door are fades (index.ts `rideTo()`, as the lifts are), each a
 * prompt outside and one inside (`HOME_PORTALS`). Standing in it you're inside the house's footprint, which nothing
 * else reaches, so walking asks `homeWall()` there in place of the city's solids (walk.ts `blocked()`), and the
 * camera stays under its ceiling (`homeCamera()`). Upstairs (Phase 3) is a floor of its own over it (`UPSTAIRS`).
 */
const [hx0, hz0, hx1, hz1] = HOUSE;
export const ROOM: Rect = [hx0 + SHELL, hz0 + SHELL, hx1 - SHELL, hz1 - SHELL];
export const CEIL = 1.2;

/** A thing in the room: its footprint, how tall, and what it is (home3d.ts draws each kind) */
export type FurnitureKind =
  | 'stairs'
  | 'sofa'
  | 'chaise'
  | 'table'
  | 'tv'
  | 'lamp'
  | 'plant'
  | 'trophies'
  | 'counter'
  | 'fridge'
  | 'island'
  | 'stools'
  | 'console'
  | 'wardrobe'
  | 'stash';
export interface Furniture {
  kind: FurnitureKind;
  rect: Rect;
  h: number;
}
const [rx0, rz0, rx1, rz1] = ROOM;
/** The front door's place along the front wall, and the side door's along the east one */
const DX = HOME.door[0];
const SZ = HOME.sideDoor[1];
/** The way through the room from the front door to the side door, kept clear: this wide */
export const HALL_W = 1.25;
/**
 * The room, refitted (docs/compound-plan.md Phase 2): **the lounge** in its west half (the corner sofa: its long run
 * under the front window and a chaise at its east end, a coffee table, the media unit across the room with the telly
 * on it facing the sofa, the trunk at the sofa's west end (the stash), a floor lamp, and **the trophy wall** on the
 * west wall); **the kitchen** along the back wall (the counter, the fridge at its end, a plant at its west end, an
 * island with its stools on the lounge's side); **the hall** from the front door to the side door, clear (a console
 * table and a plant under the front window east of the door), the stairs open along the east wall by the front and the
 * wardrobe past them. The stash's, the wardrobe's and the doors' prompts stand where they always have
 */
export const FURNITURE: Furniture[] = [
  { kind: 'stairs', rect: [rx1 - 0.95, rz0, rx1, rz0 + 2.8], h: CEIL },
  { kind: 'sofa', rect: [rx0 + 0.3, rz0 + 0.04, rx0 + 3.2, rz0 + 0.78], h: 0.42 },
  { kind: 'chaise', rect: [rx0 + 2.46, rz0 + 0.78, rx0 + 3.2, rz0 + 1.9], h: 0.42 },
  { kind: 'stash', rect: [rx0 + 0.3, rz0 + 0.9, rx0 + 1.0, rz0 + 1.3], h: 0.3 },
  { kind: 'table', rect: [rx0 + 1.6, rz0 + 1.3, rx0 + 2.2, rz0 + 1.9], h: 0.2 },
  { kind: 'tv', rect: [rx0 + 0.4, rz0 + 2.75, rx0 + 3.0, rz0 + 3.1], h: 0.24 },
  { kind: 'trophies', rect: [rx0, rz0 + 1.5, rx0 + 0.22, rz0 + 2.6], h: 1.1 },
  { kind: 'lamp', rect: [rx0 + 0.05, rz0 + 2.8, rx0 + 0.3, rz0 + 3.05], h: 1.0 },
  { kind: 'plant', rect: [rx0 + 0.06, rz1 - 1.75, rx0 + 0.36, rz1 - 1.45], h: 0.75 },
  { kind: 'console', rect: [DX + 0.75, rz0, DX + 2.05, rz0 + 0.3], h: 0.36 },
  { kind: 'plant', rect: [DX + 2.2, rz0 + 0.03, DX + 2.48, rz0 + 0.31], h: 0.55 },
  { kind: 'island', rect: [rx0 + 1.0, rz1 - 1.85, rx0 + 3.2, rz1 - 1.25], h: 0.48 },
  { kind: 'stools', rect: [rx0 + 1.15, rz1 - 2.25, rx0 + 3.05, rz1 - 1.88], h: 0.3 },
  { kind: 'counter', rect: [rx0 + 0.2, rz1 - 0.6, rx0 + 4.6, rz1], h: 0.52 },
  { kind: 'fridge', rect: [rx0 + 4.66, rz1 - 0.66, rx0 + 5.26, rz1], h: 1.02 },
  { kind: 'wardrobe', rect: [rx1 - 0.55, rz0 + 2.95, rx1, rz0 + 4.15], h: 1.1 },
];
/* ---------- The floors (docs/compound-plan.md Phase 3: the upstairs between the room and the roof) ---------- */

/** The upstairs' floor over the slab (the floor slab's top, CEIL + 0.1) and its ceiling (the roof's underside) */
export const UP_Y = CEIL + 0.1;
export const UP_CEIL = EAVES;
/** The basement's floor and ceiling over the slab (docs/compound-plan.md Phase 4): a room's height under the room */
export const BASE_Y = -1.32;
export const BASE_CEIL = -0.12;
/** Which of the house's floors someone `y` high is on (his jump tops out about 0.52 over a floor, so each line is well over that above the floor under it) */
export type HomeLevel = 'base' | 'room' | 'up' | 'roof';
export function homeLevel(y: number): HomeLevel {
  const h = y - SLAB_Y;
  return h < -0.5 ? 'base' : h < 0.9 ? 'room' : h < 2.1 ? 'up' : 'roof';
}
const inFoot = (x: number, z: number) => x > hx0 && x < hx1 && z > hz0 && z < hz1;
/** Inside the house (its footprint, on one of its indoor floors: `y` is how high he is; up on the roof is `onRoof()`)? */
export const inHouse = (x: number, z: number, y = 0) => inFoot(x, z) && homeLevel(y) !== 'roof';
const hits = (list: readonly { rect: Rect }[], x: number, z: number, r: number) => list.some(({ rect: f }) => x + r > f[0] && x - r < f[2] && z + r > f[1] && z - r < f[3]);
/** Does someone `r` wide at x, z, `y` high, inside the house, touch its walls or anything standing on his floor? */
export function homeWall(x: number, z: number, r: number, y = SLAB_Y) {
  if (x - r < rx0 || x + r > rx1 || z - r < rz0 || z + r > rz1) return true;
  const lv = homeLevel(y);
  return hits(lv === 'up' ? UPSTAIRS : lv === 'base' ? BASEMENT : FURNITURE, x, z, r);
}
/**
 * The walk camera's ceilings and floors in the house for someone `y` high (boxes with a bottom: x0, z0, x1, z1, top,
 * bottom): in the room, everything over its ceiling; upstairs, the room under its floor and the roof over its
 * ceiling; on the roof, the whole house under it
 */
export function homeCamera(y: number): [number, number, number, number, number, number][] {
  const lv = homeLevel(y);
  if (lv === 'room') return [[hx0, hz0, hx1, hz1, SLAB_Y + RIDGE, SLAB_Y + CEIL]];
  if (lv === 'up')
    return [
      [hx0, hz0, hx1, hz1, SLAB_Y + UP_Y - 0.16, -1],
      [hx0, hz0, hx1, hz1, SLAB_Y + RIDGE, SLAB_Y + UP_CEIL],
    ];
  if (lv === 'base')
    // (under the ground the city's walls don't reach: the basement's own four, round its room, and the house over it)
    return [
      [hx0, hz0, hx1, hz1, SLAB_Y + RIDGE, SLAB_Y + BASE_CEIL],
      [hx0 - 1, hz0 - 1, rx0, hz1 + 1, SLAB_Y, SLAB_Y + BASE_Y - 1],
      [rx1, hz0 - 1, hx1 + 1, hz1 + 1, SLAB_Y, SLAB_Y + BASE_Y - 1],
      [hx0 - 1, hz0 - 1, hx1 + 1, rz0, SLAB_Y, SLAB_Y + BASE_Y - 1],
      [hx0 - 1, rz1, hx1 + 1, hz1 + 1, SLAB_Y, SLAB_Y + BASE_Y - 1],
    ];
  return [[hx0, hz0, hx1, hz1, SLAB_Y + RIDGE, -1]];
}

/* ---------- Upstairs (Phase 3) ---------- */

/** The partition between the landing (east, by the stairs) and his two rooms, and between the bedroom (front) and the office (back) */
const LAND_X = rx1 - 2.6;
const SPLIT_Z = rz0 + 3.0;
const PART = 0.05;
/**
 * Upstairs (docs/compound-plan.md Phase 3), on the slab over the room: **the landing** along the east wall (the
 * stairwell over the stairs, railed, with the steep steps on up to the roof's hatch over it; a shut door at its back
 * end, the bathroom's), **the bedroom** at the front (a big low bed against the west wall between its bedside tables,
 * a dresser, his caps on the wall), **the office** at the back (the desk against the back wall with its screens and
 * chair: its prompt opens the business card; a bookshelf, a plant). Partitions to the ceiling with a doorway into
 * each room off the landing. Its own list, asked by `homeWall()` up there
 */
export type UpKind = 'wall' | 'well' | 'bathdoor' | 'bed' | 'bedside' | 'dresser' | 'caps' | 'desk' | 'chair' | 'shelf' | 'plant';
export interface UpThing {
  kind: UpKind;
  rect: Rect;
  h: number;
}
/** The doorways in the landing's partition, into the bedroom and into the office (from, to along z) */
export const UP_DOORS: [number, number][] = [
  [rz0 + 1.2, rz0 + 2.1],
  [rz0 + 4.1, rz0 + 5.0],
];
const UH = UP_CEIL - UP_Y;
export const UPSTAIRS: UpThing[] = [
  // The partitions: the landing's (but for its two doorways), the one between the rooms, the bathroom's at the landing's back
  { kind: 'wall', rect: [LAND_X - PART, rz0, LAND_X + PART, UP_DOORS[0][0]], h: UH },
  { kind: 'wall', rect: [LAND_X - PART, UP_DOORS[0][1], LAND_X + PART, UP_DOORS[1][0]], h: UH },
  { kind: 'wall', rect: [LAND_X - PART, UP_DOORS[1][1], LAND_X + PART, rz1], h: UH },
  { kind: 'wall', rect: [rx0, SPLIT_Z - PART, LAND_X - PART, SPLIT_Z + PART], h: UH },
  { kind: 'wall', rect: [LAND_X + PART, rz0 + 5.1, rx1, rz0 + 5.2], h: UH },
  { kind: 'bathdoor', rect: [rx1 - 1.6, rz0 + 4.98, rx1 - 0.9, rz0 + 5.1], h: 1.0 },
  // The stairwell over the stairs, railed (the steps on up to the hatch rise in it)
  { kind: 'well', rect: [rx1 - 0.95, rz0, rx1, rz0 + 2.8], h: 0.45 },
  // The bedroom
  { kind: 'bed', rect: [rx0, rz0 + 0.85, rx0 + 1.3, rz0 + 2.15], h: 0.3 },
  { kind: 'bedside', rect: [rx0, rz0 + 0.45, rx0 + 0.32, rz0 + 0.8], h: 0.24 },
  { kind: 'bedside', rect: [rx0, rz0 + 2.2, rx0 + 0.32, rz0 + 2.55], h: 0.24 },
  { kind: 'dresser', rect: [rx0 + 3.6, SPLIT_Z - PART - 0.38, rx0 + 4.9, SPLIT_Z - PART], h: 0.42 },
  { kind: 'caps', rect: [rx0 + 2.1, SPLIT_Z - PART - 0.12, rx0 + 3.3, SPLIT_Z - PART], h: 0.95 },
  // The office
  { kind: 'desk', rect: [rx0 + 1.4, rz1 - 0.55, rx0 + 3.4, rz1], h: 0.38 },
  { kind: 'chair', rect: [rx0 + 2.15, rz1 - 1.05, rx0 + 2.65, rz1 - 0.6], h: 0.5 },
  { kind: 'shelf', rect: [rx0, SPLIT_Z + PART + 0.3, rx0 + 0.3, SPLIT_Z + PART + 1.7], h: 1.0 },
  { kind: 'plant', rect: [LAND_X - PART - 0.4, rz1 - 0.4, LAND_X - PART - 0.1, rz1 - 0.1], h: 0.7 },
];
/** Where you arrive at the top of the stairs, by the stairwell's head */
const LANDING = { x: rx1 - 1.3, z: rz0 + 0.75 };

/* ---------- The basement (docs/compound-plan.md Phase 4) ---------- */

/**
 * His basement, his trading den (the owner's call: "a basement that he uses to trade in. A real degen man cave"):
 * under the house, a room's height (`BASE_Y` to `BASE_CEIL`), down steps under the open stairs (their way down a fade,
 * `home:cellar`). **The trading desk** along the back wall: six screens on arms (made-up charts, no words, numbers or
 * names: home3d.ts `denCharts()`), his chair, the tower with its lit side; **the cave**: a wall-hung telly on the front
 * wall, a low sofa facing it across a table, a beanbag, a bar along the east wall (its counter, a lit shelf of made-up
 * bottles behind it, stools, a mini fridge), an arcade cabinet on the west wall, a plant. Looks only: nothing in it does
 * anything in the game. Its own list, asked by `homeWall()` down there
 */
export type BaseKind = 'steps' | 'tv' | 'table' | 'sofa' | 'beanbag' | 'arcade' | 'desk' | 'chair' | 'tower' | 'bar' | 'barshelf' | 'stools' | 'fridge' | 'plant';
export interface BaseThing {
  kind: BaseKind;
  rect: Rect;
  h: number;
}
const BH = BASE_CEIL - BASE_Y;
export const BASEMENT: BaseThing[] = [
  // The steps down, along the east wall from under the stairs (their top at the front, at the room's floor)
  { kind: 'steps', rect: [rx1 - 0.95, rz0, rx1, rz0 + 2.2], h: BH },
  // The cave: the telly on the front wall, the table, the sofa facing it, a beanbag
  { kind: 'tv', rect: [rx0 + 1.0, rz0, rx0 + 3.0, rz0 + 0.12], h: 0.9 },
  { kind: 'table', rect: [rx0 + 1.55, rz0 + 0.75, rx0 + 2.45, rz0 + 1.2], h: 0.2 },
  { kind: 'sofa', rect: [rx0 + 0.8, rz0 + 1.55, rx0 + 3.2, rz0 + 2.25], h: 0.42 },
  { kind: 'beanbag', rect: [rx0 + 3.5, rz0 + 1.0, rx0 + 4.0, rz0 + 1.5], h: 0.25 },
  { kind: 'arcade', rect: [rx0, rz0 + 3.0, rx0 + 0.5, rz0 + 3.55], h: 1.0 },
  // The trading desk along the back wall, his chair, the tower
  { kind: 'desk', rect: [rx0 + 1.6, rz1 - 0.6, rx0 + 4.8, rz1], h: 0.38 },
  { kind: 'chair', rect: [rx0 + 2.95, rz1 - 1.15, rx0 + 3.45, rz1 - 0.65], h: 0.55 },
  { kind: 'tower', rect: [rx0 + 4.9, rz1 - 0.5, rx0 + 5.15, rz1 - 0.05], h: 0.4 },
  // The bar along the east wall: the counter, the lit shelf behind it, the stools, the mini fridge
  { kind: 'bar', rect: [rx1 - 0.8, rz0 + 3.3, rx1 - 0.4, rz0 + 5.3], h: 0.5 },
  { kind: 'barshelf', rect: [rx1 - 0.25, rz0 + 3.3, rx1, rz0 + 5.3], h: 1.05 },
  { kind: 'stools', rect: [rx1 - 1.2, rz0 + 3.5, rx1 - 0.85, rz0 + 5.1], h: 0.3 },
  { kind: 'fridge', rect: [rx1 - 0.55, rz1 - 0.55, rx1, rz1], h: 0.45 },
  { kind: 'plant', rect: [rx0 + 0.05, rz1 - 0.4, rx0 + 0.35, rz1 - 0.1], h: 0.7 },
];

/* ---------- The roof terrace (docs/ends-far-west-plan.md Phase 3) ---------- */

/** The terrace's floor over the slab (the roof's felt), and the roof inside its parapet and rail */
export const ROOF_Y = EAVES + 0.06;
export const TERRACE: Rect = [hx0 + SHELL + 0.1, hz0 + SHELL + 0.1, hx1 - SHELL - 0.1, hz1 - SHELL - 0.1];
/** The stairs' head: a hatch in the roof over the stairs below, its lid up, a rail round three sides */
export const HATCH: Rect = [rx1 - 1.05, rz0 + 0.3, rx1 - 0.1, rz0 + 1.7];
/** What stands on the terrace: its footprint, how tall (over the roof), and what it is (home3d.ts draws each) */
export interface RoofThing {
  kind: 'hatch' | 'sofa' | 'table' | 'planter' | 'telescope' | 'sign';
  rect: Rect;
  h: number;
}
const [tx0, tz0, tx1, tz1] = TERRACE;
/**
 * The terrace (done up, docs/compound-plan.md Phase 5): an outdoor sofa facing the front rail over the yard with the
 * low table before it, the telescope in the front corner turned to the Emporium (looks only), his D in neon on a
 * small stand at the east rail facing down the Close, planters in the back corners and one more along the back
 */
export const ROOF_THINGS: RoofThing[] = [
  { kind: 'hatch', rect: HATCH, h: 0.5 },
  { kind: 'sofa', rect: [tx0 + 2.3, tz0 + 1.0, tx0 + 4.6, tz0 + 1.6], h: 0.4 },
  { kind: 'table', rect: [tx0 + 3.2, tz0 + 0.5, tx0 + 3.7, tz0 + 0.95], h: 0.22 },
  { kind: 'telescope', rect: [tx0 + 0.9, tz0 + 0.1, tx0 + 1.3, tz0 + 0.5], h: 0.6 },
  { kind: 'sign', rect: [tx1 - 0.1, (tz0 + tz1) / 2 - 0.25, tx1, (tz0 + tz1) / 2 + 0.25], h: 0.6 },
  { kind: 'planter', rect: [tx0 + 0.1, tz1 - 0.6, tx0 + 1.5, tz1 - 0.1], h: 0.3 },
  { kind: 'planter', rect: [tx0 + 5.0, tz1 - 0.5, tx0 + 6.0, tz1 - 0.1], h: 0.3 },
  { kind: 'planter', rect: [tx1 - 1.5, tz1 - 0.6, tx1 - 0.1, tz1 - 0.1], h: 0.3 },
];
/** Up on the roof (over the house's footprint, above the upstairs)? */
export const onRoof = (x: number, z: number, y: number) => homeLevel(y) === 'roof' && inFoot(x, z);
/**
 * The floor under someone `yNow` high in the house's footprint, for groundheight.ts: the upstairs', the roof's or the basement's (null
 * in the room, whose floor is the plot's own ground, and outside the footprint)
 */
export function homeFloorY(x: number, z: number, yNow: number) {
  if (!inFoot(x, z)) return null;
  const lv = homeLevel(yNow);
  return lv === 'up' ? SLAB_Y + UP_Y : lv === 'roof' ? SLAB_Y + ROOF_Y : lv === 'base' ? SLAB_Y + BASE_Y : null;
}
/** Does someone `r` wide at x, z on the terrace touch its rail or anything standing on it? */
export function roofWall(x: number, z: number, r: number) {
  if (x - r < tx0 || x + r > tx1 || z - r < tz0 || z + r > tz1) return true;
  return hits(ROOF_THINGS, x, z, r);
}

/** A door's two sides: where its prompt stands (and on which floor), its label, and where the fade puts you (walking's yaw: 0 north, π south, π/2 west) */
export interface Portal {
  id: string;
  level: HomeLevel;
  x: number;
  z: number;
  label: string;
  to: { x: number; z: number; y: number; yaw: number };
  arrived: string;
}
/**
 * The front door (on the yard, north) and the side door (onto the east lawn), outside and in; the stairs, from the
 * room up to the landing and down again; the steps from the landing up through the hatch to the terrace, and down
 */
export const HOME_PORTALS: Portal[] = [
  { id: 'home:in', level: 'room', x: DX, z: hz0 - 0.75, label: 'Go in', to: { x: DX, z: rz0 + 0.55, y: SLAB_Y, yaw: Math.PI }, arrived: 'Home' },
  { id: 'home:out', level: 'room', x: DX, z: rz0 + 0.3, label: 'Front door', to: { x: DX + 0.5, z: hz0 - 1.75, y: SLAB_Y, yaw: 0 }, arrived: 'The yard' },
  { id: 'home:yard', level: 'room', x: rx1 - 0.3, z: SZ, label: 'Side door', to: { x: hx1 + 0.6, z: SZ, y: SLAB_Y, yaw: -Math.PI / 2 }, arrived: 'The garden' },
  { id: 'home:back', level: 'room', x: hx1 + 0.5, z: SZ, label: 'Go in', to: { x: rx1 - 0.55, z: SZ, y: SLAB_Y, yaw: Math.PI / 2 }, arrived: 'Home' },
  // The stairs: from the room at their foot up to the landing by the stairwell's head, and down
  { id: 'home:up', level: 'room', x: rx1 - 1.3, z: rz0 + 2.45, label: 'Upstairs', to: { x: LANDING.x, z: LANDING.z + 0.6, y: SLAB_Y + UP_Y, yaw: Math.PI }, arrived: 'Upstairs' },
  { id: 'home:down', level: 'up', x: LANDING.x, z: LANDING.z + 1.4, label: 'Downstairs', to: { x: rx1 - 1.75, z: rz0 + 2.45, y: SLAB_Y, yaw: Math.PI / 2 }, arrived: 'Home' },
  // The steps from the landing up through the hatch, and down
  { id: 'home:roof', level: 'up', x: LANDING.x, z: LANDING.z, label: 'Roof', to: { x: HATCH[0] - 0.55, z: (HATCH[1] + HATCH[3]) / 2, y: SLAB_Y + ROOF_Y, yaw: Math.PI / 2 }, arrived: 'The terrace' },
  { id: 'home:roofdown', level: 'roof', x: HATCH[0] - 0.35, z: (HATCH[1] + HATCH[3]) / 2, label: 'Downstairs', to: { x: LANDING.x, z: LANDING.z + 0.5, y: SLAB_Y + UP_Y, yaw: Math.PI }, arrived: 'Upstairs' },
  // The steps down under the open stairs (Phase 4): from the room by their top to the basement by their foot, and up
  // (down there he arrives west of the bar's stools, facing into the den with the way south clear)
  { id: 'home:cellar', level: 'room', x: rx1 - 1.3, z: rz0 + 0.6, label: 'Basement', to: { x: rx1 - 1.65, z: rz0 + 2.75, y: SLAB_Y + BASE_Y, yaw: Math.PI }, arrived: 'The den' },
  { id: 'home:cellarup', level: 'base', x: rx1 - 1.5, z: rz0 + 2.15, label: 'Upstairs', to: { x: rx1 - 1.3, z: rz0 + 1.2, y: SLAB_Y, yaw: Math.PI / 2 }, arrived: 'Home' },
];
/** A thing in the house to use: where its prompt stands, on which floor, and its label (walk `places`; index.ts opens what it's for) */
export interface HomeUse {
  id: 'home:wardrobe' | 'home:stash' | 'home:desk';
  level: HomeLevel;
  x: number;
  z: number;
  label: string;
}
const at = (kind: FurnitureKind) => FURNITURE.find((f) => f.kind === kind)!.rect;
const upAt = (kind: UpKind) => UPSTAIRS.find((f) => f.kind === kind)!.rect;
/** The wardrobe (stood in front of, on its west side: the fitting room), the trunk (from its east end: the stash), the desk (behind its chair: the business card) */
export const HOME_USES: HomeUse[] = [
  { id: 'home:wardrobe', level: 'room', x: at('wardrobe')[0] - 0.35, z: (at('wardrobe')[1] + at('wardrobe')[3]) / 2, label: 'Wardrobe' },
  { id: 'home:stash', level: 'room', x: at('stash')[2] + 0.35, z: (at('stash')[1] + at('stash')[3]) / 2, label: 'Stash' },
  { id: 'home:desk', level: 'up', x: (upAt('chair')[0] + upAt('chair')[2]) / 2, z: upAt('chair')[1] - 0.25, label: 'Desk' },
];
/** The home's prompts for someone `y` high: each floor's own (the floors' stand over one another, so each shows on its own) */
export function homePlaces(y: number): { id: string; x: number; z: number; label: string }[] {
  const lv = homeLevel(y);
  return [...HOME_PORTALS, ...HOME_USES].filter((p) => p.level === lv);
}

/** Pools of light at night (docs/ends-far-west-plan.md Phase 5): on Gate Lane under each of the gates' lamps, in the
 * yard by the garage's lamp and at his front door (x, z, size; drawn by south3d.ts, dark by day as the lamps' pools) */
export const HOME_POOLS: [number, number, number][] = [
  [HOME.gates.x + 0.5, HOME.gates.z0 - PIER.w / 2, 2.2],
  [HOME.gates.x + 0.5, HOME.gates.z1 + PIER.w / 2, 2.2],
  [HOME.garage[2] + 0.9, (HOME.carDoor.z1 + HOME.bikeDoor.z0) / 2, 2.6],
  [HOME.door[0], HOME.door[1] - 0.6, 1.8],
];
