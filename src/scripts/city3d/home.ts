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

/** The front door's prompt: just outside the door, on the path's side */
export const HOME_DOOR = { id: 'home' as const, x: HOME.door[0], z: HOME.door[1] - 0.75, label: 'Home' };
/** Where you arrive, and where walking starts: on the front path, facing the door (yaw π faces south) */
export const HOME_SPAWN = { x: HOME.door[0] + 0.5, z: HOME.door[1] - 1.75, yaw: Math.PI };

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

/** The garage's walls' thickness */
export const WALL = 0.12;
/**
 * What's solid at the boot: the garage's four walls, its door's opening left clear (Phase 2: the door is up, the car
 * inside; the house and its fences are the terraces', joined with their chunk)
 */
export const HOME_SOLIDS: Box[] = (() => {
  const [gx0, gz0, gx1, gz1] = HOME.garage;
  const D = HOME.garageDoor;
  const top = SLAB_Y + HOME.garageTop;
  return [
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
