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
 * camera stays under `HOME_CAMERA`, the ceiling.
 */
const [hx0, hz0, hx1, hz1] = HOUSE;
export const ROOM: Rect = [hx0 + SHELL, hz0 + SHELL, hx1 - SHELL, hz1 - SHELL];
export const CEIL = 1.2;
/** The walk camera can't pass the ceiling (a box with a bottom: x0, z0, x1, z1, top, bottom) */
export const HOME_CAMERA: [number, number, number, number, number, number] = [hx0, hz0, hx1, hz1, SLAB_Y + RIDGE, SLAB_Y + CEIL];

/** A thing in the room: its footprint, how tall, and what it is (home3d.ts draws each kind) */
export type FurnitureKind = 'stairs' | 'sofa' | 'table' | 'tv' | 'counter' | 'fridge' | 'dining' | 'wardrobe' | 'stash';
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
 * The room: the sitting room in its west half (the sofa under the front window facing the telly on its unit across
 * a low table, the trunk at the sofa's end: the stash), the kitchen along the back wall (a counter, the fridge at
 * its end, a table), the stairs boxed in along the east wall by the front and the wardrobe past them; the middle
 * clear from the front door to the side door
 */
export const FURNITURE: Furniture[] = [
  { kind: 'stairs', rect: [rx1 - 0.95, rz0, rx1, rz0 + 2.8], h: CEIL },
  { kind: 'sofa', rect: [rx0 + 0.3, rz0 + 0.04, rx0 + 3.2, rz0 + 0.78], h: 0.42 },
  { kind: 'stash', rect: [rx0 + 0.3, rz0 + 0.9, rx0 + 1.0, rz0 + 1.3], h: 0.3 },
  { kind: 'table', rect: [rx0 + 1.3, rz0 + 1.5, rx0 + 2.7, rz0 + 1.95], h: 0.24 },
  { kind: 'tv', rect: [rx0 + 0.6, rz0 + 2.75, rx0 + 3.0, rz0 + 3.1], h: 0.36 },
  { kind: 'wardrobe', rect: [rx1 - 0.55, rz0 + 2.95, rx1, rz0 + 4.15], h: 1.1 },
  { kind: 'dining', rect: [rx0 + 1.3, rz1 - 2.0, rx0 + 2.5, rz1 - 1.4], h: 0.42 },
  { kind: 'counter', rect: [rx0 + 0.2, rz1 - 0.6, rx0 + 4.6, rz1], h: 0.52 },
  { kind: 'fridge', rect: [rx0 + 4.66, rz1 - 0.66, rx0 + 5.26, rz1], h: 1.02 },
];
/** How high someone is once he's up on the roof and no longer in the room (between the ceiling and the roof) */
const UP = SLAB_Y + CEIL + 0.5;
/** Inside the house (its footprint, on the ground floor: `y` is how high he is; up on the roof is `onRoof()`)? */
export const inHouse = (x: number, z: number, y = 0) => y < UP && x > hx0 && x < hx1 && z > hz0 && z < hz1;
/** Does someone `r` wide at x, z in the room touch its walls or anything standing in it? */
export function homeWall(x: number, z: number, r: number) {
  if (x - r < rx0 || x + r > rx1 || z - r < rz0 || z + r > rz1) return true;
  return FURNITURE.some(({ rect: f }) => x + r > f[0] && x - r < f[2] && z + r > f[1] && z - r < f[3]);
}

/* ---------- The roof terrace (Phase 3) ---------- */

/** The terrace's floor over the slab (the roof's felt), and the roof inside its parapet and rail */
export const ROOF_Y = EAVES + 0.06;
export const TERRACE: Rect = [hx0 + SHELL + 0.1, hz0 + SHELL + 0.1, hx1 - SHELL - 0.1, hz1 - SHELL - 0.1];
/** The stairs' head: a hatch in the roof over the stairs below, its lid up, a rail round three sides */
export const HATCH: Rect = [rx1 - 1.05, rz0 + 0.3, rx1 - 0.1, rz0 + 1.7];
/** What stands on the terrace: its footprint, how tall (over the roof), and what it is (home3d.ts draws each) */
export interface RoofThing {
  kind: 'hatch' | 'chair' | 'table' | 'planter';
  rect: Rect;
  h: number;
}
const [tx0, tz0, tx1, tz1] = TERRACE;
/** Two chairs and a low table at the front rail, looking over the yard and down the Close; planters in the back corners */
export const ROOF_THINGS: RoofThing[] = [
  { kind: 'hatch', rect: HATCH, h: 0.5 },
  { kind: 'chair', rect: [tx0 + 2.4, tz0 + 0.9, tx0 + 2.9, tz0 + 1.45], h: 0.5 },
  { kind: 'chair', rect: [tx0 + 4.0, tz0 + 0.9, tx0 + 4.5, tz0 + 1.45], h: 0.5 },
  { kind: 'table', rect: [tx0 + 3.2, tz0 + 0.5, tx0 + 3.7, tz0 + 0.95], h: 0.22 },
  { kind: 'planter', rect: [tx0 + 0.1, tz1 - 0.6, tx0 + 1.5, tz1 - 0.1], h: 0.3 },
  { kind: 'planter', rect: [tx1 - 1.5, tz1 - 0.6, tx1 - 0.1, tz1 - 0.1], h: 0.3 },
];
/** Up on the roof (over the house's footprint, above the room)? */
export const onRoof = (x: number, z: number, y: number) => y >= UP && x > hx0 && x < hx1 && z > hz0 && z < hz1;
/** The roof under someone `yNow` high (null: not up there), for groundheight.ts */
export const homeRoofY = (x: number, z: number, yNow: number) => (onRoof(x, z, yNow) ? SLAB_Y + ROOF_Y : null);
/** Does someone `r` wide at x, z on the terrace touch its rail or anything standing on it? */
export function roofWall(x: number, z: number, r: number) {
  if (x - r < tx0 || x + r > tx1 || z - r < tz0 || z + r > tz1) return true;
  return ROOF_THINGS.some(({ rect: f }) => x + r > f[0] && x - r < f[2] && z + r > f[1] && z - r < f[3]);
}

/** A door's two sides: where its prompt stands, its label, and where the fade puts you (walking's yaw: 0 north, π south, π/2 west) */
export interface Portal {
  id: string;
  x: number;
  z: number;
  label: string;
  to: { x: number; z: number; y: number; yaw: number };
  arrived: string;
}
/** The front door (on the yard, north) and the side door (onto the east lawn), outside and in */
export const HOME_PORTALS: Portal[] = [
  { id: 'home:in', x: DX, z: hz0 - 0.75, label: 'Go in', to: { x: DX, z: rz0 + 0.55, y: SLAB_Y, yaw: Math.PI }, arrived: 'Home' },
  { id: 'home:out', x: DX, z: rz0 + 0.3, label: 'Front door', to: { x: DX + 0.5, z: hz0 - 1.75, y: SLAB_Y, yaw: 0 }, arrived: 'The yard' },
  { id: 'home:yard', x: rx1 - 0.3, z: SZ, label: 'Side door', to: { x: hx1 + 0.6, z: SZ, y: SLAB_Y, yaw: -Math.PI / 2 }, arrived: 'The garden' },
  { id: 'home:back', x: hx1 + 0.5, z: SZ, label: 'Go in', to: { x: rx1 - 0.55, z: SZ, y: SLAB_Y, yaw: Math.PI / 2 }, arrived: 'Home' },
  // The stairs (Phase 3): from the room at their foot up to the hatch's side on the terrace, and down again
  { id: 'home:up', x: rx1 - 1.3, z: rz0 + 2.45, label: 'Upstairs', to: { x: HATCH[0] - 0.55, z: (HATCH[1] + HATCH[3]) / 2, y: SLAB_Y + ROOF_Y, yaw: Math.PI / 2 }, arrived: 'The terrace' },
  { id: 'home:down', x: HATCH[0] - 0.35, z: (HATCH[1] + HATCH[3]) / 2, label: 'Downstairs', to: { x: rx1 - 1.75, z: rz0 + 2.45, y: SLAB_Y, yaw: Math.PI / 2 }, arrived: 'Home' },
];
/** A thing in the room to use: where its prompt stands and its label (walk `places`; index.ts opens what it's for) */
export interface HomeUse {
  id: 'home:wardrobe' | 'home:stash';
  x: number;
  z: number;
  label: string;
}
const at = (kind: FurnitureKind) => FURNITURE.find((f) => f.kind === kind)!.rect;
/**
 * The home's prompts for someone `y` high: on the terrace only the way down; anywhere else everything but that (the
 * room's and the terrace's stand over one another, so each shows on its own floor)
 */
export function homePlaces(y: number): { id: string; x: number; z: number; label: string }[] {
  const up = y >= UP;
  return [...HOME_PORTALS.filter((p) => (p.id === 'home:down') === up), ...(up ? [] : HOME_USES)];
}
/** The wardrobe (stood in front of, on its west side: the fitting room) and the trunk (from its east end: the stash) */
export const HOME_USES: HomeUse[] = [
  { id: 'home:wardrobe', x: at('wardrobe')[0] - 0.35, z: (at('wardrobe')[1] + at('wardrobe')[3]) / 2, label: 'Wardrobe' },
  { id: 'home:stash', x: at('stash')[2] + 0.35, z: (at('stash')[1] + at('stash')[3]) / 2, label: 'Stash' },
];

/** Pools of light at night (docs/ends-far-west-plan.md Phase 5): on Gate Lane under each of the gates' lamps, in the
 * yard by the garage's lamp and at his front door (x, z, size; drawn by south3d.ts, dark by day as the lamps' pools) */
export const HOME_POOLS: [number, number, number][] = [
  [HOME.gates.x + 0.5, HOME.gates.z0 - PIER.w / 2, 2.2],
  [HOME.gates.x + 0.5, HOME.gates.z1 + PIER.w / 2, 2.2],
  [HOME.garage[2] + 0.9, (HOME.carDoor.z1 + HOME.bikeDoor.z0) / 2, 2.6],
  [HOME.door[0], HOME.door[1] - 0.6, 1.8],
];
