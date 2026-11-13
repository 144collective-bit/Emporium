/*
 * Degen's home (docs/home-plan.md Phase 1, the owner's call: a home with a garage in the Ends, room for a car and a
 * bike on the driveway; DOM-free, the boot's, tested in tests/home.test.ts). It's the west end house of the row that
 * backs onto the Close in Endswood carried west (endswest.ts row `rn2`, endsterraces.ts house `rn2-0-2`: the house
 * itself stands where it stood, nothing moved), with what makes it his:
 *
 * - **The garage** (`HOME.garage`) in its back garden, a brick box under a flat felt roof as long as the garden is
 *   wide, its up-and-over door in its west wall (`HOME.garageDoor`) onto the driveway, up: the car stands inside
 *   (`CAR_HOME`), the walls solid (`HOME_SOLIDS`), the opening clear. Its menu's prompt is `HOME_GARAGE_DOOR`.
 * - **The driveway** (`HOME.drive`): the strip between the row's west end and the service lane, from the house's
 *   back corner down to the Close's pavement, concrete, with a dropped kerb onto the Close (`HOME.kerb`); it lies
 *   open to the lane on its west side too, so a car comes in off either. Room for the car (`HOME.carBay`) and the
 *   bike (`HOME.bikeBay`) side by side, clear of the garage's door.
 * - **The place**: spot `home` (its pin over the roof, a panel with Walk in), its front door's prompt
 *   (`HOME_DOOR`), where you arrive and where walking starts (`HOME_SPAWN`: on the front path, facing the door).
 *
 * In world numbers (x across, z north (-) to south (+)), from endswest.ts's row and garden, so the boot carries none
 * of the terraces' data; the test holds the house here to the terrace's own.
 */
import { GARDENS, LANE, N_EDGE, ROWS } from './endswest';
import { ROAD_HALF, ROAD_Z, SLAB_Y, type Pt, type Rect } from './endswood';
import type { Box } from './solids';

/** The row and the house: endsterraces.ts's `rn2-0-2` (the test holds these to it) */
export const HOME_ROW = 'rn2';
export const HOME_HOUSE = 'rn2-0-2';
const ROW = ROWS.find((r) => r.id === HOME_ROW)!;
const GARDEN = GARDENS[ROWS.indexOf(ROW)];
/** The terraces' numbers this needs (endsterraces.ts: eight houses and two passages along the row, a door this far in) */
const HOUSES_IN_ROW = 8;
const PASSAGE = 1.6;
const DOOR_IN = 0.75;
const HOUSE_W = (ROW.rect[2] - ROW.rect[0] - PASSAGE * 2) / HOUSES_IN_ROW;
/** Its walls' top and its ridge over the slab (two storeys under a shallow pitched roof) */
const EAVES = 2.25;
const RIDGE = EAVES + 0.85;

const [x0, z0, , z1] = ROW.rect;
const HOUSE: Rect = [x0, z0, x0 + HOUSE_W, z1];
/** How far the garage stands back from the house's back wall (a yard, the back door onto it) */
const YARD = 1.2;

export const HOME = {
  /** The house's body, and how tall (over the slab) */
  house: HOUSE,
  eaves: EAVES,
  ridge: RIDGE,
  /** Its back garden (the house's width, from its back wall to the garden's far edge) */
  garden: [HOUSE[0], z1, HOUSE[2], GARDEN[3]] as Rect,
  /** The front door's middle on the front wall (the row faces north) */
  door: [x0 + DOOR_IN, z0] as Pt,
  /** The garage: its body, its walls' height and its parapet's top (over the slab) */
  garage: [HOUSE[0], z1 + YARD, HOUSE[2] - 0.04, GARDEN[3]] as Rect,
  garageH: 1.75,
  garageTop: 1.9,
  /** Its door in its west wall: from, to along z, and its height */
  garageDoor: { x: HOUSE[0], z0: z1 + YARD + 0.3, z1: z1 + YARD + 2.7, h: 1.45 },
  /** The driveway: from the lane's edge to the row's end, from the house's back corner to the block's edge by the Close */
  drive: [LANE.x1, z1 - 0.6, HOUSE[0], N_EDGE] as Rect,
  /** The dropped kerb across the Close's pavement at the driveway's foot (to the road's edge) */
  kerb: [LANE.x1, N_EDGE, HOUSE[0], ROAD_Z - ROAD_HALF] as Rect,
} as const;

/** A parked vehicle's bay on the driveway: its middle, the way its nose points (yaw 0 north, π south) and its room */
export interface Bay {
  x: number;
  z: number;
  yaw: number;
  /** Half its width and length */
  hw: number;
  hl: number;
}
const [dx0, , dx1, dz1] = HOME.drive;
/** The car along the lane's side, nose to the Close; the bike by the garage's wall, south of its door */
export const CAR_BAY: Bay = { x: dx0 + 0.95, z: dz1 - 2.0, yaw: Math.PI, hw: 0.75, hl: 1.7 };
export const BIKE_BAY: Bay = { x: dx1 - 0.6, z: dz1 - 1.2, yaw: Math.PI, hw: 0.4, hl: 0.95 };
export const HOME_BAYS = { car: CAR_BAY, bike: BIKE_BAY };
export const bayRect = (b: Bay): Rect => [b.x - b.hw, b.z - b.hl, b.x + b.hw, b.z + b.hl];

/** Where you arrive, and where walking starts: on the front path, facing the door (yaw π faces south) */
// (within a door prompt's reach of his front door's, so "Go in" shows as you arrive)
export const HOME_SPAWN = { x: HOME.door[0] + 0.5, z: HOME.door[1] - 1.45, yaw: Math.PI };

/**
 * Does walking start at home? Not a new player's very first walk (the owner's call): that starts downtown by the
 * Emporium, where Getting started's first steps are; once anywhere has been walked to (the save's `visited`), home.
 */
export const startsAtHome = (visited: readonly string[]) => visited.length > 0;

/** The place's pick boxes (over the slab), the land its ring goes round, and its pin over the roof */
export const HOME_PICK: { rect: Rect; h: number }[] = [
  { rect: HOME.house, h: RIDGE },
  { rect: HOME.garage, h: HOME.garageTop },
];
export const HOME_LAND: Rect = [dx0, z0, HOUSE[2], dz1];
export const HOME_PIN: Pt = [(HOUSE[0] + HOUSE[2]) / 2, (z0 + z1) / 2];
export const HOME_PIN_H = RIDGE + 1.6;
export const HOME_SLAB = SLAB_Y;

/** The garage's walls' thickness, and the house's */
export const WALL = 0.12;
export const SHELL = 0.15;
/**
 * What's solid at the boot: the garage's four walls, its door's opening left clear (Phase 2: the door is up, the car
 * inside; the house and its fences are the terraces', joined with their chunk)
 */
export const HOME_SOLIDS: Box[] = (() => {
  const [gx0, gz0, gx1, gz1] = HOME.garage;
  const D = HOME.garageDoor;
  const top = SLAB_Y + HOME.garageTop;
  // (and the house's own four walls, Phase 3: the terraces' solid leaves his house out, endsterraces.ts, so the
  // room inside is walked in; sealed all round: its doors are fades, not gaps)
  const [hx0, hz0, hx1, hz1] = HOME.house;
  const peak = SLAB_Y + RIDGE;
  return [
    [hx0, hz0, hx1, hz0 + SHELL, peak],
    [hx0, hz1 - SHELL, hx1, hz1, peak],
    [hx0, hz0, hx0 + SHELL, hz1, peak],
    [hx1 - SHELL, hz0, hx1, hz1, peak],
    [gx0, gz0, gx1, gz0 + WALL, top],
    [gx0, gz1 - WALL, gx1, gz1, top],
    [gx1 - WALL, gz0, gx1, gz1, top],
    // (the west wall either side of the door)
    [gx0, gz0, gx0 + WALL, D.z0, top],
    [gx0, D.z1, gx0 + WALL, gz1, top],
  ];
})();

/**
 * Where his vehicles live (Phase 2, garage.ts's home stands). A vehicle's yaw is its group's turn: its nose points
 * along (cos yaw, -sin yaw), so π is west, -π/2 south, π/2 north (walking's yaw is another thing: 0 north, π south).
 * The car in the garage, nose to its door; the bike on its bay on the driveway, nose to the Close.
 */
export const CAR_HOME = { x: (HOME.garage[0] + HOME.garage[2]) / 2 + 0.1, z: (HOME.garageDoor.z0 + HOME.garageDoor.z1) / 2, yaw: Math.PI, r: 1.1 };
export const BIKE_HOME = { x: BIKE_BAY.x, z: BIKE_BAY.z, yaw: -Math.PI / 2 };
/** The garage's prompt (its menu, as the city garage's office door): on the driveway by the door's north jamb */
export const HOME_GARAGE_DOOR = { x: HOME.garageDoor.x - 0.55, z: HOME.garageDoor.z0 - 0.15 };
/** Where the garage menu's camera looks from and at (over the slab): from out on the driveway, into the garage */
export const HOME_VIEW = { eye: [HOME.drive[0] - 1.6, 2.0, HOME.garageDoor.z1 + 1.9] as [number, number, number], at: [CAR_HOME.x - 0.6, 0.7, CAR_HOME.z] as [number, number, number] };

/** Is a point on the home's own ground (the house, its garden, the driveway)? What grows or stands about keeps off it */
export const onHome = (x: number, z: number, m = 0) => x > HOME_LAND[0] - m && x < HOME_LAND[2] + m && z > HOME_LAND[1] - m && z < HOME_LAND[3] + m;

/* ---------- Inside (Phase 3) ---------- */

/**
 * The room inside: the house's ground floor, one room from wall to wall inside its shell, a ceiling `CEIL` over the
 * slab. It's sealed: the front door and the back door are fades (index.ts `rideTo()`, as the lifts are), each a
 * prompt outside and one inside (`HOME_PORTALS`). Standing in it you're inside the house's footprint, which nothing
 * else reaches, so walking asks `homeWall()` there in place of the city's solids (walk.ts `blocked()`), and the
 * camera stays under `HOME_CAMERA`, the ceiling.
 */
export const ROOM: Rect = [HOUSE[0] + SHELL, z0 + SHELL, HOUSE[2] - SHELL, z1 - SHELL];
export const CEIL = 1.2;
/** The walk camera can't pass the ceiling (a box with a bottom: x0, z0, x1, z1, top, bottom) */
export const HOME_CAMERA: [number, number, number, number, number, number] = [HOUSE[0], z0, HOUSE[2], z1, SLAB_Y + RIDGE, SLAB_Y + CEIL];

/** A thing in the room: its footprint, how tall, and what it is (home3d.ts draws each kind) */
export type FurnitureKind = 'stairs' | 'sofa' | 'table' | 'tv' | 'counter' | 'fridge' | 'dining' | 'wardrobe' | 'stash';
export interface Furniture {
  kind: FurnitureKind;
  rect: Rect;
  h: number;
}
const [rx0, rz0, rx1, rz1] = ROOM;
/** The hall down the west wall from the front door to the back door: kept clear */
export const HALL_W = 1.25;
/**
 * The room: the stairs boxed in along the east wall by the front, the sofa under the front window facing the telly
 * on its unit across a low table, the kitchen along the back wall (a counter, the fridge in the corner, a table), the
 * wardrobe against the east wall past the stairs and the stash, a trunk at the sofa's end (both Phase 4's)
 */
export const FURNITURE: Furniture[] = [
  { kind: 'stairs', rect: [rx1 - 0.95, rz0, rx1, rz0 + 2.8], h: CEIL },
  { kind: 'sofa', rect: [rx0 + HALL_W + 0.25, rz0 + 0.04, rx1 - 1.15, rz0 + 0.78], h: 0.42 },
  { kind: 'stash', rect: [rx0 + HALL_W + 0.25, rz0 + 0.9, rx0 + HALL_W + 0.95, rz0 + 1.3], h: 0.3 },
  { kind: 'table', rect: [rx0 + HALL_W + 0.75, rz0 + 1.5, rx1 - 1.5, rz0 + 1.95], h: 0.24 },
  { kind: 'tv', rect: [rx0 + HALL_W + 0.3, rz0 + 2.75, rx1 - 1.1, rz0 + 3.1], h: 0.36 },
  { kind: 'wardrobe', rect: [rx1 - 0.55, rz0 + 2.95, rx1, rz0 + 4.15], h: 1.1 },
  { kind: 'dining', rect: [rx0 + HALL_W + 0.45, rz1 - 1.85, rx0 + HALL_W + 1.25, rz1 - 1.3], h: 0.42 },
  { kind: 'counter', rect: [rx0 + HALL_W + 0.2, rz1 - 0.6, rx1 - 0.62, rz1], h: 0.52 },
  { kind: 'fridge', rect: [rx1 - 0.6, rz1 - 0.66, rx1, rz1], h: 1.02 },
];
/** Inside the house (its footprint)? */
export const inHouse = (x: number, z: number) => x > HOUSE[0] && x < HOUSE[2] && z > z0 && z < z1;
/** Does someone `r` wide at x, z in the room touch its walls or anything standing in it? */
export function homeWall(x: number, z: number, r: number) {
  if (x - r < rx0 || x + r > rx1 || z - r < rz0 || z + r > rz1) return true;
  return FURNITURE.some(({ rect: f }) => x + r > f[0] && x - r < f[2] && z + r > f[1] && z - r < f[3]);
}

/** A door's two sides: where its prompt stands, its label, and where the fade puts you (walking's yaw: 0 north, π south) */
export interface Portal {
  id: string;
  x: number;
  z: number;
  label: string;
  to: { x: number; z: number; y: number; yaw: number };
  arrived: string;
}
const DX = HOME.door[0];
/** The front door (on the green's side, north) and the back door (onto the yard, south), outside and in */
export const HOME_PORTALS: Portal[] = [
  { id: 'home:in', x: DX, z: z0 - 0.75, label: 'Go in', to: { x: DX, z: rz0 + 0.55, y: SLAB_Y, yaw: Math.PI }, arrived: 'Home' },
  { id: 'home:out', x: DX, z: rz0 + 0.3, label: 'Front door', to: { x: DX + 0.5, z: z0 - 1.75, y: SLAB_Y, yaw: 0 }, arrived: 'Endswood' },
  { id: 'home:yard', x: DX, z: rz1 - 0.3, label: 'Back door', to: { x: DX, z: z1 + 0.6, y: SLAB_Y, yaw: Math.PI }, arrived: 'The yard' },
  { id: 'home:back', x: DX, z: z1 + 0.5, label: 'Go in', to: { x: DX, z: rz1 - 0.55, y: SLAB_Y, yaw: 0 }, arrived: 'Home' },
];
/** The yard's gate onto the driveway (the fence's stub by the row's end is a gap, an open gate drawn in it) */
export const YARD_GATE: Rect = [HOUSE[0] - 0.1, z1, HOUSE[0] + 0.1, HOME.garage[1]];
