/*
 * The city's collision boxes, shared by walk mode (and its camera) and the
 * multiplayer game server (shots and movement checks). Keep this file free of
 * the DOM and of scene code so the server can bundle it.
 *
 * They mirror landmarks.ts: when a landmark moves or changes size, update here.
 * Like the landmarks they're written on the landmarks' drawing grid and moved
 * onto today's streets with `designBox()` (layout.ts).
 */
import type { SpotId } from '../../lib/city';
import { DUMMIES } from './combat-sim';
import { BIG_LOTS, BS, GARAGE, MARKET, UNITS, design, designBox } from './layout';
import { ALLEYS, ALLEY_PROPS, BOLLARD_R, INFILL, SQUARE } from './downtown';
import { SQUARE_SOLIDS } from './outer';
import { CIRCUIT_SOLIDS as KART_SOLIDS } from './kartcircuit';
import { AIRPORT_SOLIDS } from './airfield';
import { LIBERTY_SOLIDS } from './liberty';
import { HARBOUR_SOLIDS } from './harbour';
import { BAGS, BLEACHERS, COUNTER, LOCKERS, POSTS, POST_R, SHED, SIGN } from './fightsite';
import type { LotKind, UnitKind } from './tycoon';
import { BoxGrid } from './boxgrid';
import { METRO_SOLIDS } from './metro';
import { PROJECT_SOLIDS } from './projects';
import { COMMONS_SOLIDS } from './commons';
import { GRIT_SOLIDS } from './grit';
import { STREETWALL_SOLIDS } from './streetwall';
import { AVENUE_SOLIDS } from './avenue';
import { RIVERSIDE_SOLIDS } from './riverside';
import { WATERFRONT_SOLIDS } from './waterfront';
import { NIGHT_MARKET_SOLIDS } from './nightmarket';
import { WESTLAKE_SOLIDS } from './westlake';
import { STADIUM_SOLIDS } from './stadium';
import { FACILITY_SOLIDS } from './kartfacility';
import { GARDEN_SOLIDS } from './gardens';
import { PLAZA_SOLIDS } from './plaza';
import { HIGHRISE_SOLIDS } from './highrise';
import { KERBSIDE_SOLIDS } from './kerbside';
import { STREETLEVEL_SOLIDS } from './streetlevel';
import { STREETLIFE_SOLIDS } from './streetlife';
import { WHEEL_SOLIDS } from './wheel';
import { MALL_SOLIDS } from './mall';
import { NORTH_SOLIDS } from './uptownnorth';
import { MALL_INSIDE_SOLIDS } from './mallinside';
import { UPTOWN_SITE_SOLIDS } from './uptownsites';
import { SKYDECK_SOLIDS } from './skydeck';

/** x0, z0, x1, z1, height */
export type Box = [number, number, number, number, number];

/** Training dummies: Degen walks round them */
export const DUMMY_SOLIDS = DUMMIES.map(([x, z]): Box => [x - 0.3, z - 0.3, x + 0.3, z + 0.3, 1.3]);

/** Everything you can't walk through, matching landmarks.ts (on its drawing grid). Height is for the camera. */
const DRAWN: Box[] = [
  // Emporium arcade: the podium with its street corner cut off (in steps); the tower stands on it
  [11.8, 11.8, 18.0, 16.0, 2.6],
  [11.8, 16.0, 16.0, 18.0, 2.6],
  ...[0, 1, 2, 3].map((k): Box => [16.0 + k * 0.5, 16.0, 16.5 + k * 0.5, 34 - (16.25 + k * 0.5), 2.6]),
  [15.75, 18.35, 16.4, 19.05, 1.4], // claw machines either side of the doors
  [18.35, 15.75, 19.05, 16.4, 1.4],
  [18.4, 14.15, 19.35, 15.25, 1.6], // prize booth
  [0.8, 11.9, 7.8, 17.05, 5.6], // vault body and rear steps
  [1.2, 17.1, 7.4, 17.75, 4.4], // vault columns
  [7.6, 13.3, 8.0, 15.3, 2.4], // vault door
  [22.7, 12.3, 29.5, 16.85, 5.6], // Drop 001 shop
  [24.25, 18.15, 24.95, 18.45, 1], // its sidewalk sign
  [23.5, 11.16, 25.7, 12.14, 0.9], // the two cars parked behind it
  [26.1, 11.16, 28.3, 12.14, 0.9],
  [11.8, 22.8, 18.8, 27.6, 3.7], // workshop
  [12.3, 28.5, 18.1, 29.4, 1], // tool crates
  [18.3, 28.1, 19.4, 30.1, 1.2], // drums and forklift
  [11.7, 4.5, 15.7, 8.05, 2.6], // signal studio
  [16.0, 2.2, 18.4, 4.6, 13.5], // signal tower
  [1.1, 23.1, 6.1, 27.1, 3.3], // post office
  [6.4, 27.3, 7.0, 27.85, 0.9], // mailbox
  [5.05, 27.85, 7.75, 30.55, 0], // pond
  // The Armoury compound: blast walls (open at the checkpoint), watchtowers, the checkpoint,
  // the gun store and its counter, vehicles, supplies
  [22.55, 22.475, 30.45, 22.975, 1.6],
  [22.475, 22.55, 22.975, 30.45, 1.6],
  [30.025, 22.55, 30.525, 30.45, 1.6],
  [22.55, 30.025, 24.9, 30.525, 1.6],
  [28.3, 30.025, 30.45, 30.525, 1.6],
  [22.5, 22.5, 23.4, 23.4, 2.6], // watchtowers
  [29.6, 22.5, 30.5, 23.4, 2.6],
  [22.5, 29.6, 23.4, 30.5, 2.6],
  [29.6, 29.6, 30.5, 30.5, 2.6],
  [24.95, 29.75, 25.85, 30.45, 1.4], // checkpoint booth
  [25.78, 30.18, 26.14, 30.4, 2.4], // gantry post and barrier post
  [28.06, 30.18, 28.4, 30.4, 2.4], // gantry post and barrier rest
  [23.3, 23.3, 27.9, 26.9, 2.8], // the gun store
  [23.85, 27.1, 25.55, 27.55, 0.7], // its counter
  [28.62, 24.55, 29.68, 26.25, 1.0], // tank
  [28.95, 28.05, 29.65, 29.15, 0.9], // jeep
  [28.1, 22.95, 30.05, 24.35, 1.4], // supply crates under the netting
  [23.05, 29.35, 23.8, 29.85, 0.6], // drums
  [23.3, 27.95, 23.55, 28.95, 0.7], // helmet rack
  [22.7, 0.9, 26.1, 4.3, 7.6], // apartments A
  [26.9, 1.5, 30.3, 5.3, 8.4], // apartments B and billboard
  [18.55, 11.95, 19.45, 12.85, 1.4], // planters
  [11.95, 18.55, 12.85, 19.45, 1.4],
];
/**
 * The garage on the south bank (garage.ts draws it; it's outside the core, so no drawing grid):
 * the workshop building, the showroom turntable on the forecourt with your car on it, and the
 * office door where its menu opens.
 */
export const GARAGE_SITE = {
  building: [GARAGE.ox + 0.4, GARAGE.oz + 3.7, GARAGE.ox + 8.6, GARAGE.oz + 8.6, 2.9] as Box,
  turntable: { x: GARAGE.ox + 2.9, z: GARAGE.oz + 1.85, r: 1.6 },
  door: { x: GARAGE.ox + 7.4, z: GARAGE.oz + 3.1 },
  tyres: { x: GARAGE.ox + 5.5, z: GARAGE.oz + 3.25 },
};
const T = GARAGE_SITE.turntable;
/** The turntable with your car on it (your own car ignores it: it drives off from there) */
export const TURNTABLE_BOX: Box = [T.x - 1.5, T.z - 1.5, T.x + 1.5, T.z + 1.5, 1.1];
const GARAGE_SOLIDS: Box[] = [
  GARAGE_SITE.building,
  TURNTABLE_BOX,
  [GARAGE_SITE.tyres.x - 0.3, GARAGE_SITE.tyres.z - 0.3, GARAGE_SITE.tyres.x + 0.3, GARAGE_SITE.tyres.z + 0.3, 0.8],
];
/**
 * The market square (market.ts draws it): two rows of four stalls either side of an east-west
 * aisle, under a MARKET gantry at the west end. Stall 0 (north row, nearest the city) is yours;
 * STALL_SPOT is where you stand, in front of its counter, to run it.
 */
const STALL_W = 1.8;
const STALL_D = 1.5;
export const MARKET_SITE = {
  stalls: [0, 1].flatMap((row) =>
    [0, 1, 2, 3].map((k) => {
      const x = MARKET.ox + 0.45 + k * (STALL_W + 0.3) + STALL_W / 2;
      // North row faces south (+z) into the aisle; south row faces north
      const z0 = row === 0 ? MARKET.oz + 0.6 : MARKET.oz + 8.4 - STALL_D;
      return { x, z: z0 + STALL_D / 2, w: STALL_W, d: STALL_D, facing: row === 0 ? 1 : -1 };
    })
  ),
  gantry: { x: MARKET.ox + 0.2, z0: MARKET.oz + 2.4, z1: MARKET.oz + 6.6 },
  /** The pole at the aisle's east end that holds up the string lights */
  pole: { x: MARKET.ox + 8.8, z: MARKET.oz + 4.5 },
};
/** Your stall, and where you stand to run it */
export const MY_STALL = MARKET_SITE.stalls[0];
export const STALL_SPOT = { x: MY_STALL.x, z: MY_STALL.z + MY_STALL.d / 2 + 0.55 };
const MARKET_SOLIDS: Box[] = [
  ...MARKET_SITE.stalls.map((t): Box => [t.x - t.w / 2, t.z - t.d / 2, t.x + t.w / 2, t.z + t.d / 2, 2.1]),
  ...[MARKET_SITE.gantry.z0, MARKET_SITE.gantry.z1].map((z): Box => [MARKET_SITE.gantry.x - 0.1, z - 0.1, MARKET_SITE.gantry.x + 0.1, z + 0.1, 2.9]),
  [MARKET_SITE.pole.x - 0.08, MARKET_SITE.pole.z - 0.08, MARKET_SITE.pole.x + 0.08, MARKET_SITE.pole.z + 0.08, 2.6],
];
/**
 * Makers' Row (units.ts draws it): four units, 4.1 x 4.1, two either side of a cross path. The
 * north row faces the street to the north, the south row the street to the south (toward the
 * market). A unit is drawn in its own numbers: u across its front, v back from it. What stands on
 * it depends on what it's built as, so its footprints come from unitSolids(); `door` is where you
 * stand to run it.
 */
export const UNIT_SIZE = 4.1;
export const UNIT_SITE = [0, 1, 2, 3].map((i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const x0 = UNITS.ox + col * (UNIT_SIZE + 0.8);
  const z0 = UNITS.oz + row * (UNIT_SIZE + 0.8);
  /** -1: the front faces -z (north); +1: +z (south) */
  const facing = row === 0 ? -1 : 1;
  const at = (u: number, v: number): [number, number] => [x0 + u, facing < 0 ? z0 + v : z0 + UNIT_SIZE - v];
  const [dx, dz] = at(UNIT_SIZE / 2, 0.3);
  return { i, x0, z0, facing, at, door: { x: dx, z: dz } };
});
/** A box drawn in a unit's own numbers (u0, v0, u1, v1, height), in the world */
export function unitBox(i: number, b: Box): Box {
  const [x0, za] = UNIT_SITE[i].at(b[0], b[1]);
  const [x1, zb] = UNIT_SITE[i].at(b[2], b[3]);
  return [x0, Math.min(za, zb), x1, Math.max(za, zb), b[4]];
}
/** What each kind of unit puts in the way (in its own numbers): the shop, the shed, the garden's tool shed */
export const UNIT_SHAPES: Record<UnitKind, Box[]> = {
  shop: [[0.4, 0.6, 3.7, 3.3, 2.25]],
  warehouse: [[0.3, 0.7, 3.8, 3.8, 2.4]],
  garden: [[2.8, 2.9, 3.85, 3.85, 1.5]],
};
export const unitSolids = (i: number, kind: UnitKind | null): Box[] => (kind ? UNIT_SHAPES[kind].map((b) => unitBox(i, b)) : []);

/**
 * The big lots (biglots.ts draws them), drawn like a unit in their own numbers: u across the
 * front (0-9), v back from it. Lot A faces south onto the street between it and Lot B; Lots B
 * and C face north onto the streets in front of them. `door` is where you stand to run one;
 * what's built on it sets its footprints (lotSolids()).
 */
export const LOT_SITE = BIG_LOTS.map((l, i) => {
  /** -1: the front faces -z (north); +1: +z (south) */
  const facing = i === 0 ? 1 : -1;
  const at = (u: number, v: number): [number, number] => [l.ox + u, facing < 0 ? l.oz + v : l.oz + BS - v];
  const [dx, dz] = at(BS / 2, 0.35);
  return { i, ox: l.ox, oz: l.oz, facing, at, door: { x: dx, z: dz } };
});
export function lotBox(i: number, b: Box): Box {
  const [x0, za] = LOT_SITE[i].at(b[0], b[1]);
  const [x1, zb] = LOT_SITE[i].at(b[2], b[3]);
  return [x0, Math.min(za, zb), x1, Math.max(za, zb), b[4]];
}
/** What each kind of big building puts in the way, in a lot's own numbers (forecourts stay open) */
export const LOT_SHAPES: Record<LotKind, Box[]> = {
  superstore: [[0.8, 3.0, 8.2, 8.4, 3.0]],
  factory: [
    [0.6, 2.6, 6.6, 8.5, 3.2],
    [7.1, 6.3, 8.3, 7.5, 7.0],
  ],
  depot: [[0.5, 3.6, 8.5, 8.6, 3.4]],
  offices: [
    [2.4, 3.6, 6.6, 7.8, 8.8],
    [1.6, 2.6, 7.4, 3.6, 1.6],
  ],
};
export const lotSolids = (i: number, kind: LotKind | null): Box[] => (kind ? LOT_SHAPES[kind].map((b) => lotBox(i, b)) : []);

/**
 * Downtown round the landmarks (downtown.ts, drawn by infill.ts): the infill buildings, the
 * bollards at the alleys' mouths, the bins, crates and pallets in them, and the hangout square's fountain, kiosks, planters and
 * light poles. Benches and the pocket parks stay walkable.
 */
const sq = SQUARE;
export const DOWNTOWN_SOLIDS: Box[] = [
  ...INFILL.flatMap((f) => f.solids),
  ...ALLEYS.flatMap((a) => a.bollards.map(([x, z]): Box => [x - BOLLARD_R, z - BOLLARD_R, x + BOLLARD_R, z + BOLLARD_R, 0.6])),
  ...ALLEY_PROPS.map((p): Box => [...p.box, p.h]),
  [sq.fountain.at[0] - sq.fountain.r * 0.9, sq.fountain.at[1] - sq.fountain.r * 0.9, sq.fountain.at[0] + sq.fountain.r * 0.9, sq.fountain.at[1] + sq.fountain.r * 0.9, 0.55],
  ...sq.kiosks.map((k): Box => [...k, 2.2]),
  ...sq.trees.map(([x, z]): Box => [x - 0.45, z - 0.45, x + 0.45, z + 0.45, 0.5]),
  ...sq.poles.map(([x, z]): Box => [x - 0.08, z - 0.08, x + 0.08, z + 0.08, 3]),
];

/**
 * The Fight Club on the south bank, east of the garage (fightsite.ts has the numbers, fightclub.ts
 * draws it): where the shed's posts, the sign's posts and the yard's small things stand, shared by
 * the drawing and the footprints so they never drift apart.
 */
const SHED_IN = 0.3;
export const FIGHTCLUB_FIX = {
  /** The shed's four posts, inset from its roof's corners (the north-west one stays clear of the trainer's spot) */
  shedPosts: [
    [SHED.x0 + SHED_IN, SHED.z0 + SHED_IN],
    [SHED.x1 - SHED_IN, SHED.z0 + SHED_IN],
    [SHED.x0 + SHED_IN, SHED.z1 - SHED_IN],
    [SHED.x1 - SHED_IN, SHED.z1 - SHED_IN],
  ] as [number, number][],
  /** The sign gantry's posts, either end of its beam */
  signPosts: [SIGN.x - SIGN.w / 2, SIGN.x + SIGN.w / 2] as [number, number],
  /** The heavy bag's frame: half its span (its uprights stand north and south of the bag) */
  bagSpan: 0.65,
  /** Which locker doors stand open, and how far (hinged on the north edge, swung out east) */
  ajar: [3, 9],
  ajarAngle: 1.0,
  /** The bench by the lockers (not solid) and the water cooler at the row's south end */
  bench: { x: 96.9, z: LOCKERS.z1 - 1.2 },
  cooler: { x: 95.75, z: LOCKERS.z1 + 0.8 },
};
/**
 * What's solid at the Fight Club: the ring's corner posts (the canvas and the ropes stay open: you
 * step through them), the shed's posts and its two closed walls, the counter, the lockers and
 * their open doors, the bags' frames, the bleachers, the sign's posts and the water cooler.
 */
export const FIGHTCLUB_SITE: Box[] = [
  ...POSTS.map(([x, z]): Box => [x - POST_R - 0.02, z - POST_R - 0.02, x + POST_R + 0.02, z + POST_R + 0.02, 1.6]),
  ...FIGHTCLUB_FIX.shedPosts.map(([x, z]): Box => [x - 0.1, z - 0.1, x + 0.1, z + 0.1, SHED.h]),
  [SHED.x1 - 0.2, SHED.z0, SHED.x1, SHED.z1, SHED.h], // the east wall
  [SHED.x0, SHED.z1 - 0.2, SHED.x1, SHED.z1, SHED.h], // the south wall
  [COUNTER.x0, COUNTER.z0, COUNTER.x1, COUNTER.z1, 2.0],
  [LOCKERS.x0, LOCKERS.z0, LOCKERS.x1, LOCKERS.z1, 1.9],
  ...FIGHTCLUB_FIX.ajar.map((k): Box => {
    const z = LOCKERS.z0 + k * 0.5 + 0.03;
    return [LOCKERS.x1, z, LOCKERS.x1 + Math.sin(FIGHTCLUB_FIX.ajarAngle) * 0.44 + 0.03, z + Math.cos(FIGHTCLUB_FIX.ajarAngle) * 0.44 + 0.03, 1.9];
  }),
  [BAGS.heavy.x - 0.15, BAGS.heavy.z - FIGHTCLUB_FIX.bagSpan - 0.06, BAGS.heavy.x + 0.15, BAGS.heavy.z + FIGHTCLUB_FIX.bagSpan + 0.06, 2.3],
  [BAGS.speed.x - 0.2, BAGS.speed.z - 0.4, BAGS.speed.x + 0.2, BAGS.speed.z + 0.2, 1.8],
  [BLEACHERS.x0, BLEACHERS.z0, BLEACHERS.x1, BLEACHERS.z1, 1.5],
  ...FIGHTCLUB_FIX.signPosts.map((x): Box => [x - 0.1, SIGN.z - 0.1, x + 0.1, SIGN.z + 0.1, SIGN.h + 0.3]),
  [FIGHTCLUB_FIX.cooler.x - 0.2, FIGHTCLUB_FIX.cooler.z - 0.2, FIGHTCLUB_FIX.cooler.x + 0.2, FIGHTCLUB_FIX.cooler.z + 0.2, 1.4],
];

/** The outer squares' centrepieces, planters and kiosks (outer.ts); the pocket parks and lawns stay walkable */
/** ...and the kart park's fence, hut, garages and stand (kartcircuit.ts), the airport's buildings, masts and parked vehicles (airfield.ts), the Fight Club (fightsite.ts), Liberty Bridge, the metro and The Trenches' towers, rows and The Block (projects.ts) */
export const SOLIDS: Box[] = [...DRAWN.map(designBox), ...DOWNTOWN_SOLIDS, ...SQUARE_SOLIDS, ...GARAGE_SOLIDS, ...MARKET_SOLIDS, ...DUMMY_SOLIDS, ...KART_SOLIDS, ...AIRPORT_SOLIDS, ...FIGHTCLUB_SITE, ...LIBERTY_SOLIDS, ...HARBOUR_SOLIDS, ...METRO_SOLIDS, ...PROJECT_SOLIDS, ...COMMONS_SOLIDS, ...GRIT_SOLIDS, ...STREETWALL_SOLIDS, ...AVENUE_SOLIDS, ...RIVERSIDE_SOLIDS, ...WATERFRONT_SOLIDS, ...NIGHT_MARKET_SOLIDS, ...WESTLAKE_SOLIDS, ...STADIUM_SOLIDS, ...FACILITY_SOLIDS, ...GARDEN_SOLIDS, ...PLAZA_SOLIDS, ...HIGHRISE_SOLIDS, ...KERBSIDE_SOLIDS, ...STREETLEVEL_SOLIDS, ...UPTOWN_SITE_SOLIDS, ...STREETLIFE_SOLIDS, ...WHEEL_SOLIDS, ...MALL_SOLIDS, ...MALL_INSIDE_SOLIDS, ...NORTH_SOLIDS, ...SKYDECK_SOLIDS];
/** What bullets stop on: everything solid except the dummies' footprints (they test their own shape) */
export const SHOT_SOLIDS = SOLIDS.filter((b) => !DUMMY_SOLIDS.includes(b));

/** Where you can step in, and what opens there (drawn on the landmarks' grid, moved onto today's streets) */
export const DOORS: { id: SpotId; x: number; z: number }[] = (
  [
    { id: 'emporium', x: 17.5, z: 17.5 },
    { id: 'shop', x: 26.1, z: 17.5 },
    { id: 'workshop', x: 15.3, z: 28.05 },
    { id: 'vault', x: 4.3, z: 18.6 },
    { id: 'signal', x: 13.7, z: 8.6 },
    { id: 'telegram', x: 3.6, z: 27.6 },
    { id: 'plan', x: 26.6, z: 30.95 },
    { id: 'apartments', x: 24.4, z: 4.55 },
  ] as { id: SpotId; x: number; z: number }[]
).map((d) => {
  const [x, z] = design(d.x, d.z);
  return { ...d, x, z };
});

/** Where walk mode starts: by the Emporium's doors, then `back` steps back along `yaw` so the tower fills the view */
export const WALK_SPAWN = (([x, z]) => ({ x, z, yaw: 0.45, back: 2.6 }))(design(17.3, 18.85));

/** Things to do with E besides doors: the gun store counter in the Armoury (stand in front of it to gear up) */
export const RACK = (([x, z]) => ({ x, z }))(design(24.7, 27.95));
/** Only the camera bumps into these (tall parts above a walkable footprint) */
export const CAMERA_ONLY: Box[] = [
  [11.9, 11.9, 17.5, 17.5, 12.6], // the Emporium's glass tower
].map((b) => designBox(b as Box));

/** The same boxes sorted into the collision grid (boxgrid.ts): a check looks only at those near it */
export const SOLID_GRID = new BoxGrid(SOLIDS);
/** What the walk camera bumps into */
export const CAMERA_GRID = new BoxGrid([...SOLIDS, ...CAMERA_ONLY]);
/** What bullets stop on */
const SHOT_GRID = new BoxGrid([...SHOT_SOLIDS, ...CAMERA_ONLY]);
/** Every grid that holds the solids (walk.ts adds the car's, which leaves out the turntable) */
export const SOLID_GRIDS: BoxGrid[] = [SOLID_GRID, CAMERA_GRID, SHOT_GRID];

/**
 * Solid boxes added after the city's own (a district laid by a recipe:
 * growth plan Phase 4): into `SOLIDS` and every grid, so walking, the
 * camera, bullets, driving and flying all meet them
 */
export function addSolids(boxes: readonly Box[]) {
  SOLIDS.push(...boxes);
  SHOT_SOLIDS.push(...boxes);
  for (const g of SOLID_GRIDS) g.add(boxes);
}

/**
 * Distance along a ray to the first solid box or the ground (y 0.1), up to
 * `max`. Boxes the ray starts inside or very near (the shooter's own
 * surroundings) are ignored. `extra` adds more boxes (placed buildings).
 */
export function rayBoxes(from: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }, max: number, extra: Box[] = []) {
  let t = max;
  if (dir.y < 0) t = Math.min(t, (from.y - 0.1) / -dir.y);
  const o = [from.x, from.y, from.z];
  const v = [dir.x, dir.y, dir.z];
  // Only the boxes under the ray's path can stop it
  for (const list of [SHOT_GRID.alongRay(from, dir, t), extra]) {
    for (const b of list) {
      if (b[4] < 0.3) continue;
      const lo = [b[0], 0, b[1]];
      const hi = [b[2], b[4], b[3]];
      let t0 = 0;
      let t1 = t;
      let hit = true;
      for (let k = 0; k < 3 && hit; k++) {
        if (Math.abs(v[k]) < 1e-6) {
          if (o[k] < lo[k] || o[k] > hi[k]) hit = false;
          continue;
        }
        let a = (lo[k] - o[k]) / v[k];
        let c = (hi[k] - o[k]) / v[k];
        if (a > c) [a, c] = [c, a];
        t0 = Math.max(t0, a);
        t1 = Math.min(t1, c);
        if (t0 > t1) hit = false;
      }
      if (hit && t0 > 0.6) t = Math.min(t, t0);
    }
  }
  return t;
}
