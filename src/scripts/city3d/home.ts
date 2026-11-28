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
const HOUSE: Rect = [ix0 + 6.4, iz1 - 7.8, ix0 + 16.8, iz1 - 0.3];
const GARAGE: Rect = [ix0 + 0.3, AXIS - 4, ix0 + 5.3, AXIS + 4];
const WORKSHOP: Rect = [ix0 + 8, iz0 + 0.3, ix0 + 13, iz0 + 4.3];

/** A door in a wall that runs along z (the garage's two, in its east wall): from, to along z, and its height */
interface DoorZ {
  x: number;
  z0: number;
  z1: number;
  h: number;
}
/**
 * The east lawn starts this far back from the house's front (docs/house-plan.md Phase 1: the house a metre deeper, its
 * front nearer the drive), a strip of the yard's paving along it for the bollards
 */
const LAWN_SET = 0.45;
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
    [HOUSE[2] + 0.5, HOUSE[1] + LAWN_SET, ix1, iz1],
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
  // (docs/house-plan.md Phase 1: four along the paving strip in front of the east lawn, spaced to fit)
  ...[0, 1, 2, 3].map((k): Pt => [HOUSE[2] + 1.4 + (k * (ix1 - 2.2 - HOUSE[2] - 1.4)) / 3, HOUSE[1] + LAWN_SET / 2]),
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
 * The yard's trees (docs/garden-plan.md Phase 1, resort luxe): a clipped tree in a square black steel planter, each
 * `half` from its middle to a side, `h` tall; three along the north strip behind the bollards, one either side of the
 * fountain, one south of the drive by the house's east end. All off the drive, lower than the palms
 */
export const YARD_TREE = { half: 0.3, h: 0.45, top: 1.85 };
export const YARD_TREES: Pt[] = [
  ...[2.2, 6.2, 10.2].map((dx): Pt => [WORKSHOP[2] + dx, iz0 + 1.1]),
  ...[-1, 1].map((s): Pt => [FOUNTAIN.x + s * 3.7, FOUNTAIN.z]),
  [HOUSE[2] + 3, AXIS + 2.9],
];

/**
 * The garden's paths (docs/garden-plan.md Phase 2): stepping stones of pale stone across the lawns, each path the line
 * of points its stones follow. The north-west lawn's from the yard at its corner, past the bench under the tree and
 * round south of the tree to the back gate; the east lawn's from the yard by the house's end, down past the pool's
 * west end to the side door and along the pool's south side to the cabana
 */
export const GARDEN_PATHS: Pt[][] = (() => {
  const [, [ex0, ez0]] = HOME.lawns;
  const [x1, z1] = [HOME.lawns[0][2], HOME.lawns[0][3]];
  const gate = HOME.backGate;
  return [
    [[x1 - 0.45, z1 - 0.35], [x1 - 1.5, z1 - 1.5], [x1 - 2.7, z1 - 2.8], [x1 - 4.2, z1 - 3.05], [x1 - 5.8, z1 - 3.2], [gate.x + 0.7, (gate.z0 + gate.z1) / 2]],
    [[ex0 + 0.55, ez0 + 0.25], [ex0 + 0.6, ez0 + 1.85], [ex0 + 0.6, ez0 + 3.45], [ex0 + 0.7, ez0 + 5], [ex0 + 1.9, ez0 + 5.15], [ex0 + 3.4, ez0 + 5.2], [ex0 + 4.5, ez0 + 5.35], [ex0 + 5.7, ez0 + 5.35]],
  ];
})();
/** A stepping stone's size (across the path, along it) and how far apart their middles are along a path */
export const STONE_SIZE = { w: 0.44, d: 0.3, step: 0.55 };

/** The stepping stones along the garden's paths: each one's middle and its turn (to the path's line), a little turned and sized in turn so they read laid by hand */
export function pathStones(): { x: number; z: number; turn: number; w: number; d: number }[] {
  const out: { x: number; z: number; turn: number; w: number; d: number }[] = [];
  for (const path of GARDEN_PATHS) {
    let k = 0;
    for (let i = 0; i + 1 < path.length; i++) {
      const [ax, az] = path[i];
      const [bx, bz] = path[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.round(len / STONE_SIZE.step));
      // (the first stone of the path, then each step along; the last point's stone is the next segment's first)
      for (let j = i === 0 ? 0 : 1; j <= n; j++, k++) {
        const t = j / n;
        const wob = [0, 0.12, -0.08][k % 3];
        out.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, turn: Math.atan2(bx - ax, bz - az) + wob, w: STONE_SIZE.w * [1, 0.9, 1.08][k % 3], d: STONE_SIZE.d * [1, 1.1, 0.92][k % 3] });
      }
    }
  }
  return out;
}

/** The paths' lights (Phase 2): low black posts with soft warm caps, beside the stones; each a pool of warm light at night (`HOME_POOLS`) */
export const PATH_LIGHT = { r: 0.035, h: 0.24 };
export const PATH_LIGHTS: Pt[] = (() => {
  const [, [ex0, ez0]] = HOME.lawns;
  const [x1, z1] = [HOME.lawns[0][2], HOME.lawns[0][3]];
  const gate = HOME.backGate;
  return [
    [x1 - 0.7, z1 - 1.2],
    [x1 - 1.8, z1 - 2.4],
    [x1 - 5, z1 - 2.65],
    [gate.x + 0.9, gate.z1 + 0.25],
    [ex0 + 1.05, ez0 + 1.25],
    [ex0 + 1.05, ez0 + 3.05],
    [ex0 + 2.3, ez0 + 5.6],
    [ex0 + 3.9, ez0 + 5.65],
  ];
})();


/**
 * The pool and the cabana on the east lawn (docs/compound-plan.md Phase 6d; the washing line gone): the pool along the
 * lawn's middle, its stone edge solid (no swimming: looks only), three loungers on its north side, the cabana in the
 * lawn's far corner (an open front on posts, a sofa under its roof); the way round to the side door kept clear
 */
const [lx0, lz0, lx1, lz1] = [HOUSE[2] + 0.5, HOUSE[1] + LAWN_SET, ix1, iz1];
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

/**
 * The outdoor kitchen (docs/garden-plan.md Phase 3): on the east lawn along its south wall, west of the cabana; a stone
 * counter (`KITCHEN`, `KITCHEN_H` tall) with a black steel grill, its hood closed, and a small sink; three stools on its
 * lawn side; a black steel pergola over it on four posts with a string of warm lights. Looks only
 */
export const KITCHEN: Rect = [HOME.lawns[1][0] + 0.7, HOME.lawns[1][3] - 0.6, CABANA[0] - 0.6, HOME.lawns[1][3] - 0.05];
export const KITCHEN_H = 0.46;
export const STOOL = { r: 0.12, h: 0.38 };
export const KITCHEN_STOOLS: Pt[] = [0.9, 1.8, 2.7].map((dx): Pt => [KITCHEN[0] + dx, KITCHEN[1] - 0.45]);
/** The pergola: its posts at the corners (`PERGOLA` the rect they stand on), `h` to its beams' tops */
export const PERGOLA = { rect: [KITCHEN[0] - 0.1, KITCHEN[1] - 0.85, KITCHEN[2] + 0.1, KITCHEN[3] - 0.02] as Rect, h: 1.25, post: 0.04 };
export const PERGOLA_POSTS: Pt[] = [
  [PERGOLA.rect[0], PERGOLA.rect[1]],
  [PERGOLA.rect[2], PERGOLA.rect[1]],
  [PERGOLA.rect[0], PERGOLA.rect[3]],
  [PERGOLA.rect[2], PERGOLA.rect[3]],
];

/**
 * The firepit (Phase 3): on the north-west lawn in the open ground between its path and the garage, a low round stone
 * bowl with a bed of embers and small flames (home3d.ts `firepitFlames()`), a curved stone bench round its south half
 * (toward the garage), a low chair either side; its north side open to the path. Looks only
 */
export const FIREPIT = { x: HOME.lawns[0][2] - 4.5, z: HOME.lawns[0][3] - 1.3, r: 0.42, h: 0.24 };
/** The bench's pieces round the pit: each piece's middle, its turn (along the curve) and its length; `FIRE_BENCH_R` from the pit's middle */
export const FIRE_BENCH_R = 1.0;
export const FIRE_BENCH = { w: 0.3, h: 0.26 };
export const fireBench = (): { x: number; z: number; turn: number; len: number }[] =>
  [0, 1, 2, 3, 4].map((k) => {
    const a = ((25 + k * 32.5) * Math.PI) / 180;
    return { x: FIREPIT.x + Math.cos(a) * FIRE_BENCH_R, z: FIREPIT.z + Math.sin(a) * FIRE_BENCH_R, turn: -a + Math.PI / 2, len: 0.58 };
  });
export const FIRE_CHAIR = { half: 0.24, h: 0.42 };
export const FIRE_CHAIRS: Pt[] = [-1, 1].map((s): Pt => [FIREPIT.x + s * 1.15, FIREPIT.z - 0.15]);
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
    // The outdoor kitchen, its stools and the pergola's posts; the firepit, its bench and chairs (docs/garden-plan.md Phase 3)
    [KITCHEN[0], KITCHEN[1], KITCHEN[2], KITCHEN[3], SLAB_Y + KITCHEN_H],
    ...KITCHEN_STOOLS.map(([x, z]): Box => [x - STOOL.r, z - STOOL.r, x + STOOL.r, z + STOOL.r, SLAB_Y + STOOL.h]),
    ...PERGOLA_POSTS.map(([x, z]): Box => [x - PERGOLA.post, z - PERGOLA.post, x + PERGOLA.post, z + PERGOLA.post, SLAB_Y + PERGOLA.h]),
    [FIREPIT.x - FIREPIT.r, FIREPIT.z - FIREPIT.r, FIREPIT.x + FIREPIT.r, FIREPIT.z + FIREPIT.r, SLAB_Y + FIREPIT.h],
    ...fireBench().map(({ x, z }): Box => [x - 0.17, z - 0.17, x + 0.17, z + 0.17, SLAB_Y + FIRE_BENCH.h]),
    ...FIRE_CHAIRS.map(([x, z]): Box => [x - FIRE_CHAIR.half, z - FIRE_CHAIR.half, x + FIRE_CHAIR.half, z + FIRE_CHAIR.half, SLAB_Y + FIRE_CHAIR.h]),
    // The garden's path lights (docs/garden-plan.md Phase 2)
    ...PATH_LIGHTS.map(([x, z]): Box => [x - PATH_LIGHT.r, z - PATH_LIGHT.r, x + PATH_LIGHT.r, z + PATH_LIGHT.r, SLAB_Y + PATH_LIGHT.h]),
    // The yard's trees' planters (docs/garden-plan.md Phase 1)
    ...YARD_TREES.map(([x, z]): Box => [x - YARD_TREE.half, z - YARD_TREE.half, x + YARD_TREE.half, z + YARD_TREE.half, SLAB_Y + YARD_TREE.h]),
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
export const WARDROBE_RECT: Rect = [rx0 + 3.3, rz0 + 3.07, rx1 - 2.8, rz0 + 3.45];
export const VAULT_RECT: Rect = [rx0 + 5.5, rz0, rx0 + 6.3, rz0 + 0.1];
export const DESK_CHAIR_RECT: Rect = [rx0 + 3.15, rz1 - 1.05, rx0 + 3.65, rz1 - 0.6];

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
const touch = (f: Rect, x: number, z: number, r: number) => x + r > f[0] && x - r < f[2] && z + r > f[1] && z - r < f[3];
const hits = (list: readonly { rect: Rect }[], x: number, z: number, r: number) => list.some(({ rect: f }) => touch(f, x, z, r));
/** Does someone `r` wide at x, z, `y` high, inside the house, touch its walls or anything standing on his floor? */
export function homeWall(x: number, z: number, r: number, y = SLAB_Y) {
  if (x - r < rx0 || x + r > rx1 || z - r < rz0 || z + r > rz1) return true;
  const lv = homeLevel(y);
  if (stairRails(y).some((f) => touch(f, x, z, r))) return true;
  return hits(lv === 'up' ? rooms.up : lv === 'base' ? rooms.base : rooms.room, x, z, r);
}
/**
 * The walk camera's ceilings and floors in the house for someone `y` high (boxes with a bottom: x0, z0, x1, z1, top,
 * bottom): in the room, everything over its ceiling; upstairs, the room under its floor and the roof over its
 * ceiling; on the roof, the whole house under it
 */
type CamBox = [number, number, number, number, number, number];
export function homeCamera(y: number): CamBox[] {
  const lv = homeLevel(y);
  // (over the stair's well the room's ceiling, the upstairs' floor and the basement's ceiling are open, the flights
  // and the spine in it solid: docs/house-plan.md Phases 2 and 3; over the hatch the upstairs' ceiling and the roof)
  const roof = (top: number, bottom: number) => aroundHatch(hx0, hz0, hx1, hz1).map((r): CamBox => [...r, top, bottom]);
  if (lv === 'room') return [...AROUND_WELL.map((r): CamBox => [...r, SLAB_Y + RIDGE, SLAB_Y + CEIL]), [...STAIR.well, SLAB_Y + RIDGE, SLAB_Y + UP_CEIL], ...FLIGHTS_CAMERA];
  if (lv === 'up') return [...AROUND_WELL.map((r): CamBox => [...r, SLAB_Y + UP_Y - 0.16, -1]), ...roof(SLAB_Y + RIDGE, SLAB_Y + UP_CEIL), ...FLIGHTS_CAMERA];
  if (lv === 'base')
    // (under the ground the city's walls don't reach: the basement's own four, round its room, and the house over it)
    return [
      ...AROUND_WELL.map((r): CamBox => [...r, SLAB_Y + RIDGE, SLAB_Y + BASE_CEIL]),
      [hx0 - 1, hz0 - 1, rx0, hz1 + 1, SLAB_Y, SLAB_Y + BASE_Y - 1],
      [rx1, hz0 - 1, hx1 + 1, hz1 + 1, SLAB_Y, SLAB_Y + BASE_Y - 1],
      [hx0 - 1, hz0 - 1, hx1 + 1, rz0, SLAB_Y, SLAB_Y + BASE_Y - 1],
      [hx0 - 1, rz1, hx1 + 1, hz1 + 1, SLAB_Y, SLAB_Y + BASE_Y - 1],
      ...FLIGHTS_CAMERA,
    ];
  return [...roof(SLAB_Y + RIDGE, -1), ...FLIGHTS_CAMERA];
}

/* ---------- The stair (docs/house-plan.md Phase 2: a turned stair, walked) ---------- */

/** A flight's width, the spine between the flights, the half landing's depth, a flight's run */
const [SW, SPINE, HALF_D, RUN] = [0.9, 0.1, 0.95, 1.45];
const [wx0, wz1] = [rx1 - 2 * SW - SPINE, rz0 + HALF_D + RUN];
/**
 * The stair from the room up to the landing, in the stair hall in the front east corner (`well`): the first flight
 * (`a`) up along the east wall toward the front, the half landing (`half`) across the front wall under the stair's
 * window (`window`, over its middle, x0 to x1 and y0 to y1 over the slab), the turn, the second flight (`b`) back
 * beside the first up to the landing upstairs, a steel spine between them (`spine`). `steps`: the risers in each
 * flight (the last onto the landing over it). Walked: the floor under him rises with the treads (`stairY()`), its
 * rails stop him (`stairRails()`), the camera's ceilings open over its well (`homeCamera()`).
 */
export const STAIR = {
  well: [wx0, rz0, rx1, wz1] as Rect,
  a: [rx1 - SW, rz0 + HALF_D, rx1, wz1] as Rect,
  half: [wx0, rz0, rx1, rz0 + HALF_D] as Rect,
  b: [wx0, rz0 + HALF_D, wx0 + SW, wz1] as Rect,
  spine: [wx0 + SW, rz0 + HALF_D, rx1 - SW, wz1] as Rect,
  steps: 6,
  window: { x0: wx0 + 0.2, x1: rx1 - 0.3, y0: UP_Y / 2 + 0.08, y1: CEIL - 0.08 },
};
/** The house's footprint round the well, as boxes (the camera's ceilings and floors round it) */
const AROUND_WELL: [number, number, number, number][] = [
  [hx0, hz0, wx0, hz1],
  [wx0, wz1, hx1, hz1],
  [rx1, hz0, hx1, wz1],
  [wx0, hz0, rx1, rz0],
];
const inR = (f: Rect, x: number, z: number) => x >= f[0] && x <= f[2] && z >= f[1] && z <= f[3];
/** A run of floor over `rect`: `n` over the slab along its north edge, `s` along its south, sloping evenly between (flat if they're the same) */
interface Run {
  rect: Rect;
  n: number;
  s: number;
}
const runY = ({ rect: r, n, s }: Run, z: number) => SLAB_Y + n + (s - n) * Math.min(1, Math.max(0, (z - r[1]) / (r[3] - r[1])));
const runAt = (list: readonly Run[], x: number, z: number) => {
  const r = list.find((u) => inR(u.rect, x, z));
  return r ? runY(r, z) : null;
};
/** The stair up: the first flight, the half landing, the second flight */
const UP_RUNS: Run[] = [
  { rect: STAIR.a, n: UP_Y / 2, s: 0 },
  { rect: STAIR.half, n: UP_Y / 2, s: UP_Y / 2 },
  { rect: STAIR.b, n: UP_Y / 2, s: UP_Y },
];
/** The stair's floor at x, z (over the world: the first flight from the room's floor at its foot to the half landing, the second on up to the landing upstairs), or null off it */
export const stairY = (x: number, z: number): number | null => runAt(UP_RUNS, x, z);
/**
 * The den's steps (docs/house-plan.md Phase 3): through the den's door under the second flight's high end, down under
 * it, the turn under the half landing, on down under the first flight to the basement's floor at its foot, turning as
 * the stair over them does
 */
export const DEN_STEPS = {
  b: STAIR.b,
  half: STAIR.half,
  a: STAIR.a,
  steps: 6,
  /**
   * The den's doorway in the second flight's back, x0 to x1: the flight's whole width, so whoever comes up the den's
   * steps along a wall walks straight out (a jamb in the way stopped him dead)
   */
  door: [STAIR.b[0], STAIR.b[2]] as [number, number],
};
const DEN_RUNS: Run[] = [
  { rect: STAIR.b, n: BASE_Y / 2, s: 0 },
  { rect: STAIR.half, n: BASE_Y / 2, s: BASE_Y / 2 },
  { rect: STAIR.a, n: BASE_Y / 2, s: BASE_Y },
];
/** The den's steps' floor at x, z (over the world), or null off them */
export const denY = (x: number, z: number): number | null => runAt(DEN_RUNS, x, z);
/** How far up or down from a floor he steps on or off it at the stair's ends */
const STEP = 0.3;
/**
 * While he wakes and the street outside loads, the stair waits too, as the doors do (docs/spawn-plan.md: the landing
 * looks out over the Close): index.ts shuts it as he wakes and opens it when the street's ready
 */
export const STAIR_GATE = { shut: false };
/**
 * What stops someone `y` high (his feet) round the stair: its west side always (the second flight's side and the
 * balustrade over it upstairs), the spine between the flights, across the first flight's foot but from the room's
 * floor (upstairs it's the well's rail; while the street loads, shut), across the second's head but from upstairs
 * (down in the room it's the flight's underside, the den's door in it)
 */
export function stairRails(y: number): Rect[] {
  const h = y - SLAB_Y;
  const { well, a, b, spine } = STAIR;
  const z1 = well[3];
  const out: Rect[] = [[well[0] - 0.04, well[1], well[0], z1 + 0.04], spine];
  // (the first flight's foot: open from the room, and from the basement to the den's steps' foot under it; upstairs,
  // the well's rail but where the roof's steps start, and their sides up over the well: docs/house-plan.md Phase 3)
  if (h > UP_Y - STEP) {
    const [sx0, , sx1] = ROOF_STEPS.rect;
    if (sx0 > a[0]) out.push([a[0], z1, sx0, z1 + 0.04]);
    out.push([sx1, z1, a[2], z1 + 0.04], [sx0 - 0.04, ROOF_STEPS.rect[1], sx0, z1], [sx1, ROOF_STEPS.rect[1], sx1 + 0.04, z1]);
  } else if ((STAIR_GATE.shut && h > -0.5) || h > STEP) out.push([a[0], z1, a[2], z1 + 0.04]);
  // (the second flight's back: from the room, its doorway the den's door; from the basement, the den's steps'
  // underside, closed)
  if (h < -0.5) out.push([b[0], z1 - 0.04, b[2], z1]);
  else if (h < UP_Y - STEP) {
    const [d0, d1] = DEN_STEPS.door;
    if (d0 > b[0]) out.push([b[0], z1, d0, z1 + 0.04]);
    if (d1 < b[2]) out.push([d1, z1, b[2], z1 + 0.04]);
  }
  return out;
}

/**
 * Where every visit starts (docs/spawn-plan.md Phase 1, the owner's call): in the room, in front of the sofa, facing
 * the telly on the media wall (yaw π/2 faces west: docs/interior-plan.md Phase 1), clear of the doors' prompts. The rest of the city loads behind the
 * walls while the doors out wait (`HOME_WAITS`). He's sat on the sofa as the room appears and stands up onto it
 * (Phase 2, `SOFA_SEAT`), but under reduced motion, where he's standing there already.
 */
const SEAT_X = rx0 + 3.26;
const SEAT_Z = rz0 + 2.2;
export const HOME_WAKE = { x: SEAT_X - 0.33, z: SEAT_Z, yaw: Math.PI / 2 };
/**
 * The sofa as a seat (moments.ts `seatMark()`: a bench's mark, `ry` the way the sitter faces, 0 south; he stands up
 * onto `HOME_WAKE`, `MOMENT.stand.bench` in front of it): his hips `h` over the floor, a thigh's half-thickness over
 * its cushion (0.22, home3d.ts `furnish()`), and `back` behind the mark: there, so his thighs (about 0.19) lie on the
 * cushion with his knees over its front edge (the owner's call, 2026-11-28: he was sunk into the cushion, his hips
 * level with its top and his legs in its front). His feet hang a touch over the floor: it's a deep sofa
 */
export const SOFA_SEAT = { x: SEAT_X, z: SEAT_Z, ry: -Math.PI / 2, h: 0.29, back: 0 };

/**
 * The room's windows (home3d.ts draws them: the front one over the sofa, the one east of the front door over the
 * hall's console table (docs/compound-plan.md Phase 2, as it is outside) up to the stair hall, the back one over the
 * counter; the stair's own window over the half landing is the stair's, `STAIR`), each
 * across x0 to x1 in the wall at z, `into` the way into the room
 */
export const ROOM_WINDOWS = [
  { x0: rx0 + 0.506, x1: DX - 0.75, z: rz0 + 0.006, into: 1 },
  { x0: DX + 0.9, x1: STAIR.well[0] - 0.25, z: rz0 + 0.006, into: 1 },
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



/* ---------- The roof terrace (docs/ends-far-west-plan.md Phase 3) ---------- */

/** The terrace's floor over the slab (the roof's felt), and the roof inside its parapet and rail */
export const ROOF_Y = EAVES + 0.06;
export const TERRACE: Rect = [hx0 + SHELL + 0.1, hz0 + SHELL + 0.1, hx1 - SHELL - 0.1, hz1 - SHELL - 0.1];
/**
 * The roof's steps' head: a hatch in the roof over the well's front, its lid up on its east side, a kerb round it but
 * on its west side by the steps' head, where he steps out onto the terrace (`HATCH_WAY`, z0 to z1)
 */
export const HATCH: Rect = [rx1 - 1.05, rz0 + 0.3, rx1 - 0.1, rz0 + 2.25];
/** The hatch's kerb's width */
export const HATCH_KERB = 0.08;
/**
 * The roof's steps (docs/house-plan.md Phase 2: steep, walnut on black steel; walked, Phase 3): from the landing at the
 * well's back, over the stair's first flight, up through the hatch: across x0 to x1, from their foot at z1 (the
 * landing's floor) to their head, `steps` risers, then a little platform `top` deep at the roof's floor to z0
 */
export const ROOF_STEPS = { rect: [HATCH[0] + 0.12, HATCH[1] + 0.15, HATCH[2] - 0.04, wz1] as Rect, steps: 9, top: 0.35 };
/** The way out of the hatch onto the terrace, beside the steps' platform: z0 to z1 along its west side */
export const HATCH_WAY: [number, number] = [HATCH[1] + HATCH_KERB, ROOF_STEPS.rect[1] + ROOF_STEPS.top + 0.1];
const ROOF_RUNS: Run[] = [
  { rect: [ROOF_STEPS.rect[0], ROOF_STEPS.rect[1], ROOF_STEPS.rect[2], ROOF_STEPS.rect[1] + ROOF_STEPS.top], n: ROOF_Y, s: ROOF_Y },
  { rect: [ROOF_STEPS.rect[0], ROOF_STEPS.rect[1] + ROOF_STEPS.top, ROOF_STEPS.rect[2], ROOF_STEPS.rect[3]], n: ROOF_Y, s: UP_Y },
];
/** The roof's steps' floor at x, z (over the world), or null off them */
export const roofStepY = (x: number, z: number): number | null => runAt(ROOF_RUNS, x, z);
/** A rect x0, z0, x1, z1 but for the hatch in it, as four */
function aroundHatch(x0: number, z0: number, x1: number, z1: number): Rect[] {
  const [a0, c0, a1, c1] = HATCH;
  return [
    [x0, z0, a0, z1],
    [a1, z0, x1, z1],
    [a0, z0, a1, c0],
    [a0, c1, a1, z1],
  ];
}
/** The hatch's kerb and the steps' rail inside it, as the terrace's walls: open on the west by the steps' head */
const HATCH_WALLS: Rect[] = [
  [HATCH[0], HATCH[1], HATCH[2], HATCH[1] + HATCH_KERB],
  [HATCH[0], HATCH[3] - HATCH_KERB, HATCH[2], HATCH[3]],
  [HATCH[2] - HATCH_KERB, HATCH[1], HATCH[2], HATCH[3]],
  [HATCH[0], HATCH_WAY[1], HATCH[0] + HATCH_KERB, HATCH[3]],
  [ROOF_STEPS.rect[0] - 0.04, HATCH_WAY[1], ROOF_STEPS.rect[0], HATCH[3]],
];
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
/**
 * The flights to the camera (the stair's, the den's steps', the roof's steps) and the spine between them: each flight
 * in six lengths, each a slab from its lower end's tread down a flight's depth, so the camera neither looks up
 * through one nor sinks into one under him
 */
const FLIGHTS_CAMERA: CamBox[] = [
  ...[...UP_RUNS, ...DEN_RUNS, ...ROOF_RUNS].flatMap((u): CamBox[] => {
    const [x0, z0, x1, z1] = u.rect;
    const n = u.n === u.s ? 1 : 6;
    return Array.from({ length: n }, (_, k): CamBox => {
      const [za, zb] = [z0 + (k * (z1 - z0)) / n, z0 + ((k + 1) * (z1 - z0)) / n];
      const top = Math.min(runY(u, za), runY(u, zb));
      return [x0, za, x1, zb, top, top - 0.18];
    });
  }),
  [...STAIR.spine, SLAB_Y + UP_Y / 2, SLAB_Y + BASE_Y],
];
/** Up on the roof (over the house's footprint, above the upstairs)? */
export const onRoof = (x: number, z: number, y: number) => homeLevel(y) === 'roof' && inFoot(x, z);
/**
 * The floor under someone `yNow` high in the house's footprint, for groundheight.ts: the stair's, the upstairs', the roof's or the
 * basement's (null in the room, whose floor is the plot's own ground, and outside the footprint)
 */
export function homeFloorY(x: number, z: number, yNow: number) {
  if (!inFoot(x, z)) return null;
  const lv = homeLevel(yNow);
  // In the stair's well, the flights over one another there (the stair's, the den's steps' under it, the roof's steps
  // over its first flight: docs/house-plan.md Phases 2 and 3): the highest he's on or can step up onto, else the lowest
  if (inR(STAIR.well, x, z)) {
    // (up on the roof, off the steps, the hatch's sill beside their platform, where he steps out)
    if (lv === 'roof' && roofStepY(x, z) === null) return SLAB_Y + ROOF_Y;
    const all = [stairY(x, z), denY(x, z), roofStepY(x, z)].filter((v): v is number => v !== null);
    const under = all.filter((v) => v <= yNow + 0.05);
    if (all.length) return under.length ? Math.max(...under) : Math.min(...all);
    return lv === 'up' ? SLAB_Y + UP_Y : lv === 'roof' ? SLAB_Y + ROOF_Y : lv === 'base' ? SLAB_Y + BASE_Y : null;
  }
  return lv === 'up' ? SLAB_Y + UP_Y : lv === 'roof' ? SLAB_Y + ROOF_Y : lv === 'base' ? SLAB_Y + BASE_Y : null;
}
/** What stands on the terrace as its walls: the hatch is its kerb's (`HATCH_WALLS`), open by the steps' head */
const ROOF_SOLIDS = ROOF_THINGS.filter((t) => t.kind !== 'hatch');
/** Does someone `r` wide at x, z on the terrace touch its rail, the hatch's kerb or anything standing on it? */
export function roofWall(x: number, z: number, r: number) {
  if (x - r < tx0 || x + r > tx1 || z - r < tz0 || z + r > tz1) return true;
  return hits(ROOF_SOLIDS, x, z, r) || HATCH_WALLS.some((f) => touch(f, x, z, r));
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
/** The stair's foot in the room, where it says it's waiting while the street loads */
export const STAIR_FOOT = { x: rx1 - SW / 2, z: wz1 + 0.3 };
/**
 * The front door (on the yard, north) and the side door (onto the east lawn), outside and in (the stair, the den's
 * steps and the roof's are walked: `STAIR`, `DEN_STEPS`, `ROOF_STEPS`, docs/house-plan.md Phases 2 and 3)
 */
export const HOME_PORTALS: Portal[] = [
  { id: 'home:in', level: 'room', x: DX, z: hz0 - 0.75, label: 'Go in', to: { x: DX, z: rz0 + 0.55, y: SLAB_Y, yaw: Math.PI }, arrived: 'Home' },
  { id: 'home:out', level: 'room', x: DX, z: rz0 + 0.3, label: 'Front door', to: { x: DX + 0.5, z: hz0 - 1.75, y: SLAB_Y, yaw: 0 }, arrived: 'The yard' },
  { id: 'home:yard', level: 'room', x: rx1 - 0.3, z: SZ, label: 'Side door', to: { x: hx1 + 0.6, z: SZ, y: SLAB_Y, yaw: -Math.PI / 2 }, arrived: 'The garden' },
  { id: 'home:back', level: 'room', x: hx1 + 0.5, z: SZ, label: 'Go in', to: { x: rx1 - 0.55, z: SZ, y: SLAB_Y, yaw: Math.PI / 2 }, arrived: 'Home' },
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
 * front door, the side door, and the stair up (`STAIR_GATE`, its prompt `home:stairs` at its foot meanwhile: the
 * landing and the terrace look out over the Close); spawn.ts says when
 */
export const HOME_WAITS: readonly string[] = ['home:out', 'home:yard', 'home:stairs'];
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
  const list = [...HOME_PORTALS, ...HOME_USES].filter((p) => p.level === lv).map((p) => (ready || !HOME_WAITS.includes(p.id) ? p : { ...p, label: WAITING }));
  return ready || lv !== 'room' ? list : [...list, { id: 'home:stairs', ...STAIR_FOOT, label: WAITING }];
}

/** Pools of light at night (docs/ends-far-west-plan.md Phase 5): on Gate Lane under each of the gates' lamps, in the
 * yard by the garage's lamp and at his front door (x, z, size; drawn by south3d.ts, dark by day as the lamps' pools) */
export const HOME_POOLS: [number, number, number][] = [
  [HOME.gates.x + 0.5, HOME.gates.z0 - PIER.w / 2, 2.2],
  [HOME.gates.x + 0.5, HOME.gates.z1 + PIER.w / 2, 2.2],
  [HOME.garage[2] + 0.9, (HOME.carDoor.z1 + HOME.bikeDoor.z0) / 2, 2.6],
  [HOME.door[0], HOME.door[1] - 0.6, 1.8],
  // (the garden's path lights, small and soft: docs/garden-plan.md Phase 2)
  ...PATH_LIGHTS.map(([x, z]): [number, number, number] => [x, z, 0.8]),
];
