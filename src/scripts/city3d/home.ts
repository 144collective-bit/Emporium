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
 * - **The place**: spot `home` (its pin over the house, a panel with Walk in), where you arrive and where the Walk
 *   button starts you (`HOME_SPAWN`: in the yard, facing the front door). Every visit starts inside, in the room
 *   (`HOME_WAKE`, docs/spawn-plan.md).
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
// (since docs/compound-plan.md Phase 6b, the kingpin's compound: about twice his height, the gates' piers over it)
export const WALL_H = 1.8;
export const PIER = { w: 0.5, h: 2.25 };
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

/** Where you arrive by the Walk button, the panel and fast travel: in the yard, facing the front door (yaw π faces south) */
// (within a door prompt's reach of his front door's, so "Go in" shows as you arrive)
export const HOME_SPAWN = { x: HOME.door[0] + 0.5, z: HOME.door[1] - 1.45, yaw: Math.PI };


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

/**
 * The fire escape up the house's east side, facing the gates (docs/compound-plan.md Phase 6: the house as a black brick
 * loft): a landing at the upper floor and a flight down to the ground, its footprint solid; narrow enough that the
 * way round the house's east end to the side door stays open beside it
 */
export const FIRE_ESCAPE: Rect = [HOUSE[2], HOUSE[1] + 0.5, HOUSE[2] + 0.34, HOUSE[1] + 3.7];

/**
 * The gatehouse (docs/compound-plan.md Phase 6b): a small lit booth of black brick just inside the gates on their south
 * side, its window on the gates; solid, clear of the drive, the bollards and the cars' way in
 */
export const GATEHOUSE: Rect = [px1 - WALL_T - 1.6, GATES.z1 + PIER.w + 0.25, px1 - WALL_T - 0.05, GATES.z1 + PIER.w + 1.65];
export const GATEHOUSE_H = 1.35;
/**
 * The gate (Phase 6b): one black steel leaf, slid open along the inside of the wall north of the gates (the way in
 * always open: nothing in the city is shut to you), on its track; solid
 */
export const GATE_LEAF: Rect = [px1 - WALL_T - 0.13, GATES.z0 - PIER.w - (GATES.z1 - GATES.z0) - 0.1, px1 - WALL_T - 0.05, GATES.z0 - PIER.w - 0.05];
export const GATE_LEAF_H = 1.7;

/**
 * The fountain (docs/compound-plan.md Phase 6c): in the yard north of the drive (clear of the cars' way in and out and
 * of the bollards along the north strip), a round stone basin with a pedestal and two bowls; its basin solid
 */
export const FOUNTAIN = { x: (GARAGE[2] + px1) / 2 + 2.2, z: AXIS - 4.6, r: 0.95, h: 0.3 };
/** The palms (Phase 6c), each in a round stone planter with an uplight: either side of the gates inside, at the house's west corner, by the workshop */
export const PALMS: Pt[] = [
  [px1 - WALL_T - 1.3, AXIS - 3.9],
  [px1 - WALL_T - 2.2, AXIS + 3.3],
  [HOUSE[0] + 0.3, HOUSE[1] - 0.75],
  [WORKSHOP[0] - 0.1, WORKSHOP[3] + 1.9],
];
export const PALM_PLANTER = { r: 0.35, h: 0.32 };

/**
 * The pool and the cabana on the east lawn (docs/compound-plan.md Phase 6d; the washing line gone): the pool along the
 * lawn's middle, its stone edge solid (no swimming: looks only), three loungers on its north side, the cabana in the
 * lawn's far corner (an open front on posts, a sofa under its roof); the way round to the side door kept clear
 */
const [lx0, lz0, lx1, lz1] = [HOUSE[2] + 0.5, HOUSE[1], ix1, iz1];
export const POOL: Rect = [lx0 + 1.7, lz0 + 1.3, lx1 - 1.6, lz0 + 4.5];
export const POOL_EDGE = 0.15;
export const LOUNGERS: Rect[] = [0, 1, 2].map((k): Rect => [lx0 + 2.2 + k * 1.6, lz0 + 0.2, lx0 + 2.62 + k * 1.6, lz0 + 1.1]);
export const CABANA: Rect = [lx1 - 3.2, lz1 - 1.6, lx1 - 0.1, lz1 - 0.1];
/** Under the cabana's roof: its sofa against the back, and the roof's four posts (each a small solid) */
export const CABANA_SOFA: Rect = [CABANA[0] + 0.4, CABANA[3] - 0.65, CABANA[2] - 0.4, CABANA[3] - 0.05];
export const CABANA_POSTS: Pt[] = [
  [CABANA[0] + 0.06, CABANA[1] + 0.06],
  [CABANA[2] - 0.06, CABANA[1] + 0.06],
  [CABANA[0] + 0.06, CABANA[3] - 0.06],
  [CABANA[2] - 0.06, CABANA[3] - 0.06],
];
export const CABANA_H = 1.45;

/**
 * The helipad on the garage's roof (docs/compound-plan.md Phase 6e): a round pad in its middle with his D and a ring
 * painted on it, lights round its edge, a windsock at the roof's corner; looks only (nobody walks up there, nothing
 * lands)
 */
export const HELIPAD = { x: (GARAGE[0] + GARAGE[2]) / 2, z: AXIS, r: 2.2 };

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
    [FIRE_ESCAPE[0], FIRE_ESCAPE[1], FIRE_ESCAPE[2], FIRE_ESCAPE[3], SLAB_Y + RIDGE + 0.3],
    // The gatehouse, and the gate's leaf slid open along the wall (Phase 6b)
    [GATEHOUSE[0], GATEHOUSE[1], GATEHOUSE[2], GATEHOUSE[3], SLAB_Y + GATEHOUSE_H],
    [GATE_LEAF[0], GATE_LEAF[1], GATE_LEAF[2], GATE_LEAF[3], SLAB_Y + GATE_LEAF_H],
    // The fountain's basin and the palms' planters (Phase 6c)
    [FOUNTAIN.x - FOUNTAIN.r * 0.85, FOUNTAIN.z - FOUNTAIN.r * 0.85, FOUNTAIN.x + FOUNTAIN.r * 0.85, FOUNTAIN.z + FOUNTAIN.r * 0.85, SLAB_Y + FOUNTAIN.h],
    ...PALMS.map(([x, z]): Box => [x - PALM_PLANTER.r, z - PALM_PLANTER.r, x + PALM_PLANTER.r, z + PALM_PLANTER.r, SLAB_Y + PALM_PLANTER.h]),
    // The pool, the loungers, the cabana's sofa and posts (Phase 6d)
    [POOL[0], POOL[1], POOL[2], POOL[3], SLAB_Y + 0.3],
    ...LOUNGERS.map((r): Box => [r[0], r[1], r[2], r[3], SLAB_Y + 0.25]),
    [CABANA_SOFA[0], CABANA_SOFA[1], CABANA_SOFA[2], CABANA_SOFA[3], SLAB_Y + 0.4],
    ...CABANA_POSTS.map(([x, z]): Box => [x - 0.05, z - 0.05, x + 0.05, z + 0.05, SLAB_Y + CABANA_H]),
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
const [rx0, rz0, rx1, rz1] = ROOM;
/** The front door's place along the front wall, and the side door's along the east one */
const DX = HOME.door[0];
const SZ = HOME.sideDoor[1];

/**
 * What the house's prompts stand at (`HOME_USES`): the wardrobe, the den's vault (the stash) and the office's chair (the
 * desk). Here, in the boot, for the prompts; the rooms' lists (homerooms.ts) put the things themselves on them
 */
/** (the dressing room's rails upstairs, docs/interior-plan.md Phase 3: along its back, by the partition to the office) */
export const WARDROBE_RECT: Rect = [rx0 + 3.3, rz0 + 2.57, rx1 - 2.8, rz0 + 2.95];
export const VAULT_RECT: Rect = [rx0 + 4.75, rz0, rx0 + 5.55, rz0 + 0.1];
export const DESK_CHAIR_RECT: Rect = [rx0 + 2.15, rz1 - 1.05, rx0 + 2.65, rz1 - 0.6];

/**
 * What stands on each floor (homerooms.ts's `FURNITURE`, `UPSTAIRS`, `BASEMENT`), as `homeWall()` asks it. The lists
 * load in their own small chunk, out of the boot (the owner's call, 2026-11-19: the first download was full), fetched
 * as the city starts (index.ts); waking in the room waits for them. Until they're in, only the walls stop him
 */
const rooms: Record<'room' | 'up' | 'base', readonly { rect: Rect }[]> = { room: [], up: [], base: [] };
let roomsIn = false;
export function setRooms(r: typeof rooms) {
  Object.assign(rooms, r);
  roomsIn = true;
}
/** Are the rooms' lists in? */
export const roomsReady = () => roomsIn;

/* ---------- The floors (docs/compound-plan.md Phase 3: the upstairs between the room and the roof) ---------- */

/** The upstairs' floor over the slab (the floor slab's top, CEIL + 0.1) and its ceiling (the roof's underside) */
export const UP_Y = CEIL + 0.1;
export const UP_CEIL = EAVES;
/** The basement's floor and ceiling over the slab (docs/compound-plan.md Phase 4): a room's height under the room */
export const BASE_Y = -1.32;
export const BASE_CEIL = -0.12;
/** The house's measurements its rooms are laid out on (homerooms.ts `houseRooms()`, which imports nothing) */
export const HOUSE_GEO = { ROOM, CEIL, UP_Y, UP_CEIL, BASE_Y, BASE_CEIL, HOME, WARDROBE_RECT, VAULT_RECT, DESK_CHAIR_RECT };
export type HouseGeo = typeof HOUSE_GEO;
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
  return hits(lv === 'up' ? rooms.up : lv === 'base' ? rooms.base : rooms.room, x, z, r);
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

/**
 * Where every visit starts (docs/spawn-plan.md Phase 1, the owner's call): in the room, in front of the sofa, facing
 * the telly on the media wall (yaw π/2 faces west: docs/interior-plan.md Phase 1), clear of the doors' prompts. The rest of the city loads behind the
 * walls while the doors out wait (`HOME_WAITS`). He's sat on the sofa as the room appears and stands up onto it
 * (Phase 2, `SOFA_SEAT`), but under reduced motion, where he's standing there already.
 */
const SEAT_X = rx0 + 2.86;
const SEAT_Z = rz0 + 1.84;
export const HOME_WAKE = { x: SEAT_X - 0.33, z: SEAT_Z, yaw: Math.PI / 2 };
/**
 * The sofa as a seat (moments.ts's bench mark: its middle, `ry` the way the sitter faces, 0 south; he stands up onto
 * `HOME_WAKE`, `MOMENT.stand.bench` in front of it), its cushion `h` over the floor
 */
export const SOFA_SEAT = { x: SEAT_X, z: SEAT_Z, ry: -Math.PI / 2, h: 0.24 };

/**
 * The room's windows (home3d.ts draws them: the front one over the sofa, the one east of the front door over the
 * hall's console table (docs/compound-plan.md Phase 2, as it is outside), the back one over the counter), each
 * across x0 to x1 in the wall at z, `into` the way into the room
 */
export const ROOM_WINDOWS = [
  { x0: rx0 + 0.506, x1: DX - 0.75, z: rz0 + 0.006, into: 1 },
  { x0: DX + 0.9, x1: rx1 - 1.05, z: rz0 + 0.006, into: 1 },
  { x0: rx0 + 0.806, x1: rx0 + 4.206, z: rz1 - 0.006, into: -1 },
] as const;
/**
 * Their curtains (docs/spawn-plan.md Phase 2): drawn while the street outside loads, drawn back once it's ready. Each
 * window has two, from its ends (`over` past them) to its middle; open, each is bunched `bunched` wide at its end.
 * They hang `off` into the room from the wall (clear of the glass and its frame), from `y0` to `y1` over the slab
 */
export const CURTAIN = { over: 0.08, off: 0.07, thick: 0.02, y0: 0.53, y1: 1.12, bunched: 0.16 };
/** The curtains' panels `k` open (0 drawn, 1 open): each a rect in the room */
export function curtainPanels(k: number): Rect[] {
  const u = Math.min(1, Math.max(0, k));
  return ROOM_WINDOWS.flatMap(({ x0, x1, z, into }) => {
    const [a, b] = [x0 - CURTAIN.over, x1 + CURTAIN.over];
    const w = ((b - a) / 2) * (1 - u) + CURTAIN.bunched * u;
    const [za, zb] = [z + into * CURTAIN.off, z + into * (CURTAIN.off + CURTAIN.thick)];
    const [z0, z1] = [Math.min(za, zb), Math.max(za, zb)];
    return [[a, z0, a + w, z1], [b - w, z0, b, z1]] as Rect[];
  });
}


/** Where you arrive at the top of the stairs, by the stairwell's head */
const LANDING = { x: rx1 - 1.3, z: rz0 + 0.75 };

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
const [wa, va, ca] = [WARDROBE_RECT, VAULT_RECT, DESK_CHAIR_RECT];
/**
 * The ways out of the room that wait while the street outside is still loading (docs/spawn-plan.md Phase 1): the
 * front door, the side door and the stairs up (the landing and the terrace look out over the Close); spawn.ts says when
 */
export const HOME_WAITS: readonly string[] = ['home:out', 'home:yard', 'home:up'];
/** Their prompt meanwhile */
export const WAITING = 'Getting ready…';
/** The wardrobe (in front of the dressing room's rails upstairs: the fitting room), the den's vault (in front of it: the stash), the desk (behind its chair: the business card) */
export const HOME_USES: HomeUse[] = [
  { id: 'home:wardrobe', level: 'up', x: (wa[0] + wa[2]) / 2, z: wa[1] - 0.35, label: 'Wardrobe' },
  { id: 'home:stash', level: 'base', x: (va[0] + va[2]) / 2, z: va[3] + 0.4, label: 'Stash' },
  { id: 'home:desk', level: 'up', x: (ca[0] + ca[2]) / 2, z: ca[1] - 0.25, label: 'Desk' },
];
/**
 * The home's prompts for someone `y` high: each floor's own (the floors stand over one another, so each shows on its
 * own); while the street outside is still loading (`ready` false), the ways out of the room say so (`HOME_WAITS`)
 */
export function homePlaces(y: number, ready = true): { id: string; x: number; z: number; label: string }[] {
  const lv = homeLevel(y);
  return [...HOME_PORTALS, ...HOME_USES].filter((p) => p.level === lv).map((p) => (ready || !HOME_WAITS.includes(p.id) ? p : { ...p, label: WAITING }));
}

/** Pools of light at night (docs/ends-far-west-plan.md Phase 5): on Gate Lane under each of the gates' lamps, in the
 * yard by the garage's lamp and at his front door (x, z, size; drawn by south3d.ts, dark by day as the lamps' pools) */
export const HOME_POOLS: [number, number, number][] = [
  [HOME.gates.x + 0.5, HOME.gates.z0 - PIER.w / 2, 2.2],
  [HOME.gates.x + 0.5, HOME.gates.z1 + PIER.w / 2, 2.2],
  [HOME.garage[2] + 0.9, (HOME.carDoor.z1 + HOME.bikeDoor.z0) / 2, 2.6],
  [HOME.door[0], HOME.door[1] - 0.6, 1.8],
];
