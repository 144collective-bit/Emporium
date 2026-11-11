/*
 * The civic quarter (docs/civic-plan.md, the owner's call; DOM-free, tested in tests/civic.test.ts): the seat of
 * power at Westlake Park's south end, on the Mall's line (Uptown's axis), facing Uptown across the avenue.
 * Phase 1 is the land: the civic square, the three lots kept for the buildings to come (City Hall on the axis at
 * the square's head, the police headquarters to its west and the courthouse to its east, both facing across the
 * square), the walk round City Hall to the Mall behind it, and what stands on the square (trees in grates,
 * lamps, benches, the axis inlaid). The park's own paths, trees, lamps, beds and benches keep off it all
 * (westlake.ts, gardens.ts, parklife.ts, ringstreet.ts read `inCivic()`).
 *
 * In world numbers: x across, z north (-) to south (+). Nothing here reads westlake.ts (it reads this), so the
 * park's edge and the axis are worked out the same way and the test holds them equal.
 */
import { EW_ROADS, WALK_W } from './layout';
import type { Moment, ParkPerson } from './parklife';

export type Pt = [number, number];
/** x0, z0, x1, z1 */
export type Rect = [number, number, number, number];

const AVE = EW_ROADS[0];
/** The park's south edge, inside its sidewalk (westlake.ts `ZS`): the square opens onto the sidewalk here */
export const PARK_EDGE = AVE.c - AVE.half - WALK_W;
/** The axis: the Mall's line (westlake.ts `MALL.x`), on through Uptown's lane to the plaza's cross (uptown.ts `AXIS_X`) */
export const AXIS = -140;

/** The civic square: open to the avenue along its south side, the axis down its middle */
export const SQUARE: Rect = [AXIS - 16, -36, AXIS + 16, PARK_EDGE];

/**
 * City Hall's lot (Phase 2 builds on it): the front range across the square's head and the back block behind it on
 * the axis (narrower, clear of the lake loop's west curve); its front door on the axis at the square, its back door
 * onto the Mall
 */
export const HALL = {
  front: [AXIS - 12, -44, AXIS + 12, -36] as Rect,
  back: [AXIS - 8, -62, AXIS + 8, -44] as Rect,
  door: [AXIS, -36] as Pt,
  rear: [AXIS, -62] as Pt,
};
/**
 * The police headquarters' lot (Phase 3), west of the square: the building north (its front to the square's
 * north-west corner, east), its walled yard south of it towards the avenue (the patrol cars, the gate onto the ring
 * walk by the park's south-west gate)
 */
export const POLICE: Rect = [-167, -50, -158, -18];
export const POLICE_HQ: Rect = [POLICE[0], POLICE[1], POLICE[2], -31];
export const POLICE_YARD: Rect = [POLICE[0], POLICE_HQ[3], POLICE[2], POLICE[3]];
/** The courthouse's lot (Phase 3), east of the square, its front to it (west), its steps at the lot's square side; the lake loop is behind it */
export const COURT: Rect = [-124, -30, -113, -18];

export interface Lot {
  id: 'cityhall' | 'police' | 'courthouse';
  rects: Rect[];
  /** Which way its front faces (a unit vector): City Hall south over the square, the others across it */
  faces: Pt;
}
export const LOTS: Lot[] = [
  { id: 'cityhall', rects: [HALL.front, HALL.back], faces: [0, 1] },
  { id: 'police', rects: [POLICE_HQ, POLICE_YARD], faces: [1, 0] },
  { id: 'courthouse', rects: [COURT], faces: [-1, 0] },
];

/** The walk behind City Hall (z): the west walk comes round to the Mall here, and the way to the lake leaves it */
export const BEHIND_Z = -66;
/** The west walk's line (x): between the police's lot and City Hall's front range */
export const WEST_WALK_X = AXIS - 15;
/** The walks round City Hall: from the square's north-west corner up its west side and round behind it to the Mall */
export const WEST_WALK: Pt[] = [
  [WEST_WALK_X, SQUARE[1] + 1.5],
  [WEST_WALK_X, BEHIND_Z],
  [AXIS, BEHIND_Z],
];
/** From the square's north-east corner towards the lake loop (westlake.ts carries it on to the loop's line) */
export const EAST_WALK_FROM: Pt = [SQUARE[2] - 1.5, SQUARE[1] + 1.5];
/** The walks' half width (as the park's small paths) */
export const WALK_HALF = 1.1;

const inRect = (r: Rect, p: Pt, m = 0) => p[0] > r[0] - m && p[0] < r[2] + m && p[1] > r[1] - m && p[1] < r[3] + m;
/** On the square (`m` more round it; the avenue's side is the park's edge) */
export const inSquare = (p: Pt, m = 0) => inRect(SQUARE, p, m);
/** On one of the lots (`m` more round them) */
export const onLot = (p: Pt, m = 0) => LOTS.some((l) => l.rects.some((r) => inRect(r, p, m)));
/** On the civic quarter's land: the square or a lot (what the park's trees, lamps, beds and benches keep off) */
export const inCivic = (p: Pt, m = 0) => inSquare(p, m) || onLot(p, m);

/* ---------- What stands on the square ---------- */

/** The square's two edges' lines (x), where its trees, lamps and benches stand, a little in from its sides */
export const EDGE_IN = 1.6;
export const EDGE_XS = [SQUARE[0] + EDGE_IN, SQUARE[2] - EDGE_IN];
/** Its trees in grates along both edges, north of the ring walk (which crosses the square at z -15); their grates' half size */
export const SQUARE_TREES: Pt[] = EDGE_XS.flatMap((x) => [-19.5, -25.5, -31.5].map((z): Pt => [x, z]));
export const GRATE = 0.75;
/** Its lamps: between the trees along both edges, and either side of the square's mouth on the avenue ([x, z, ry]: the arm towards the axis) */
export const SQUARE_LAMPS: [number, number, number][] = [
  ...EDGE_XS.flatMap((x) => [-22.5, -28.5].map((z): [number, number, number] => [x, z, x < AXIS ? 0 : Math.PI])),
  ...EDGE_XS.map((x): [number, number, number] => [x, PARK_EDGE - 2.2, x < AXIS ? 0 : Math.PI]),
];
/** Its benches: in front of the lamps, facing the axis (where, and which way the sitter faces: ry, +z turned) */
export const SQUARE_BENCHES: { at: Pt; ry: number }[] = SQUARE_LAMPS.slice(0, 4).map(([x, z]) => ({
  at: [x + (x < AXIS ? 1 : -1), z] as Pt,
  ry: x < AXIS ? Math.PI / 2 : -Math.PI / 2,
}));
/** The axis inlaid down the square, from the avenue to City Hall's door: its half width (the Mall's) */
export const AXIS_HALF = 2.4;
/** A border of inlay round the square's three park sides: its width */
export const BORDER = 0.6;

/* ---------- City Hall (Phase 2) ---------- */

/**
 * City Hall (the owner's picks, docs/civic-plan.md): stern stripped classicism in pale stone. A colonnade of square
 * columns across the front range on a podium up wide steps from the square, long banners on the wall behind them, a
 * bronze door on the axis, and a stepped tower over the back block crowned with the city's made-up emblem, a
 * seven-pointed star (Sector 7), seen across the city: the owner's exception to "under the Emporium", about 22.
 * Front is +z (south, the square), across is x.
 */
/** The ground it stands on: the park's slab (world.ts `SLAB`) */
export const HALL_GROUND = 0.15;
/** The podium (the portico's floor) over the ground, up `STEP_N` steps */
export const PODIUM_Y = HALL_GROUND + 0.9;
export const STEP_N = 6;
/** The steps: across the front, from their foot on the square up to the podium's edge (the square's head) */
export const STEPS: Rect = [AXIS - 11, SQUARE[1], AXIS + 11, SQUARE[1] + 3.6];
/** The portico: the podium's floor under the colonnade, in front of the front range's wall */
export const PORTICO: Rect = [AXIS - 12, -40.5, AXIS + 12, SQUARE[1]];
/** The front range behind it (its wall at the portico's back), to its roof */
export const FRONT_RANGE: Rect = [HALL.front[0], HALL.front[1], HALL.front[2], PORTICO[1]];
export const FRONT_H = PODIUM_Y + 9.6;
/** The back block, to its roof */
export const BACK_H = 11;
/** The columns: square, along the portico's front, eight of them, their height over the podium */
export const COLUMN = { w: 0.9, h: 6.4, z: SQUARE[1] - 0.8, n: 8, span: 21.2 };
export const COLUMNS: Pt[] = Array.from({ length: COLUMN.n }, (_, k): Pt => [AXIS - COLUMN.span / 2 + (COLUMN.span * k) / (COLUMN.n - 1), COLUMN.z]);
/** The antae: the portico's two end walls, full height, closing its sides */
export const ANTA_W = 0.5;
/** The door on the axis in the front range's wall (its width and height over the podium) */
export const DOOR = { w: 1.9, h: 3.8 };
/** The banners: on the wall behind the colonnade, one in each bay but the door's (their centres along x), their width, top and bottom over the podium */
export const BANNER = { w: 1.5, top: 6.0, bottom: 1.2 };
export const BANNER_XS: number[] = COLUMNS.slice(0, -1)
  .map((c, k) => (c[0] + COLUMNS[k + 1][0]) / 2)
  .filter((x) => Math.abs(x - AXIS) > DOOR.w);
/** The tower over the back block: square tiers stepping in, each its half width and its top; the crown on the last */
export const TOWER_C: Pt = [AXIS, (HALL.back[1] + HALL.back[3]) / 2];
export const TIERS: { half: number; top: number }[] = [
  { half: 5, top: 15.5 },
  { half: 4, top: 18.8 },
  { half: 3, top: 21 },
  { half: 1.8, top: 22.4 },
];
/** The emblem: a seven-pointed star in a ring on the attic over the door, and on each face of the second tier (radius, and its points' inner radius as a share) */
export const STAR = { points: 7, inner: 0.45, door: 0.8, tower: 1.35 };
/** The frieze over the columns (its height: the name carved on it) */
export const FRIEZE_H = 1.1;
/** The tallest point (the crown's roof): over the Emporium's (12.5), under Uptown's tallest and the flights */
export const CITYHALL_TOP = TIERS.at(-1)!.top;
/** The gold finial's tip over the crown */
export const CITYHALL_TIP = CITYHALL_TOP + 0.9;

/** Its ground: up the steps (a steady rise over their depth, as the estate's stairs: walk.ts reads it as a slope),
 * the portico's floor; nowhere else (null) */
export function cityHallY(x: number, z: number): number | null {
  if (x > STEPS[0] && x < STEPS[2] && z > STEPS[1] - 1e-9 && z < STEPS[3]) return HALL_GROUND + (PODIUM_Y - HALL_GROUND) * ((STEPS[3] - z) / (STEPS[3] - STEPS[1]));
  if (x > PORTICO[0] && x < PORTICO[2] && z > PORTICO[1] && z < PORTICO[3]) return PODIUM_Y;
  return null;
}
/** The civic quarter's raised ground: City Hall's steps and portico, the courthouse's (groundheight.ts's layer) */
export const civicY = (x: number, z: number): number | null => cityHallY(x, z) ?? courtY(x, z);

type Box = [number, number, number, number, number];
/** What's solid: the front range, the back block, the tower's tiers, the columns, the antae, the podium's cheeks beside the steps */
export const CITYHALL_SOLIDS: Box[] = [
  [...FRONT_RANGE, FRONT_H],
  [...HALL.back, BACK_H],
  ...TIERS.map((t): Box => [TOWER_C[0] - t.half, TOWER_C[1] - t.half, TOWER_C[0] + t.half, TOWER_C[1] + t.half, t.top]),
  ...COLUMNS.map(([x, z]): Box => [x - COLUMN.w / 2, z - COLUMN.w / 2, x + COLUMN.w / 2, z + COLUMN.w / 2, PODIUM_Y + COLUMN.h]),
  [PORTICO[0], PORTICO[1], PORTICO[0] + ANTA_W, PORTICO[3], FRONT_H],
  [PORTICO[2] - ANTA_W, PORTICO[1], PORTICO[2], PORTICO[3], FRONT_H],
  // (the podium's front either side of the steps, its cheeks out over the steps' ends)
  [PORTICO[0], STEPS[1], STEPS[0], STEPS[3], PODIUM_Y + 0.3],
  [STEPS[2], STEPS[1], PORTICO[2], STEPS[3], PODIUM_Y + 0.3],
];
/** The land it stands on, steps and all (its spot's) */
export const CITYHALL_LAND: Rect = [PORTICO[0], HALL.back[1], PORTICO[2], STEPS[3]];
/** The pick boxes for the City view (over the ground) */
export const CITYHALL_PICK: { rect: Rect; h: number }[] = [
  { rect: [PORTICO[0], FRONT_RANGE[1], PORTICO[2], STEPS[3]], h: FRONT_H - HALL_GROUND },
  { rect: HALL.back, h: BACK_H - HALL_GROUND },
  { rect: [TOWER_C[0] - TIERS[0].half, TOWER_C[1] - TIERS[0].half, TOWER_C[0] + TIERS[0].half, TOWER_C[1] + TIERS[0].half], h: CITYHALL_TOP - HALL_GROUND },
];
/** Its door (the walk prompt that opens its panel) on the portico in front of the bronze door, and where you arrive
 * (its panel's Walk in): on the square at the steps' foot, facing them (yaw 0 faces north) */
export const CITYHALL_DOOR = { x: AXIS, z: PORTICO[1] + 0.6, label: 'City Hall' };
export const CITYHALL_SPAWN = { x: AXIS, z: STEPS[3] + 2.6, yaw: 0 };

/* ---------- The police headquarters and the courthouse (Phase 3) ---------- */

/** What the two flanking buildings are dressed in: City Hall's pale stone, plainer and lower (the owner's pick) */
export const FLANK_TALLEST = 9.6;

/**
 * Sector 7 Police (made up): a plain three-storey block of pale stone with piers down its walls, the entrance on its
 * east face onto the west walk at the square's north-west corner (a canopy, SECTOR 7 POLICE over it, the blue lamp),
 * a mast on the roof; its walled yard south of it with the patrol cars parked against the building and the gate in
 * the south wall onto the ring walk
 */
export const HQ = { rect: POLICE_HQ, h: 8.4, door: { x: POLICE_HQ[2], z: -40.5, w: 1.6, h: 2.8 }, mast: 3 };
/** The yard's wall (thickness, height) and its gate (the gap in the south wall: from x0 to x1) */
export const YARD_WALL = { w: 0.3, h: 1.8 };
export const YARD_GATE = { x0: -164.2, x1: -160.8 };
/** The patrol cars in the yard, nosed up to the building (the traffic's Patrol car, carspec.ts `police`):
 * [model, x, z, yaw, paint] for cars.ts `parkedCars()` (yaw π/2 faces north) */
export const YARD_CARS: [string, number, number, number, string][] = [-165.5, -163.5, -161.5, -159.5].map((x): [string, number, number, number, string] => ['police', x, POLICE_HQ[3] + 1.7, Math.PI / 2, '#141a3a']);
/** A parked car's footprint, half its length and width (as kerbside.ts's) */
export const YARD_CAR_HALF = { l: 1.5, w: 0.6 };

/**
 * The Sector 7 Courthouse (made up): a smaller temple front in the same stone, four square columns on a podium
 * up four steps from the square under a low pediment, SECTOR 7 COURTHOUSE on its frieze, the body behind
 */
export const COURT_GROUND = HALL_GROUND;
export const COURT_PODIUM = COURT_GROUND + 0.6;
export const COURT_STEP_N = 4;
/** The steps: from their foot at the lot's square side (x0) up to the portico (x1) */
export const COURT_STEPS: Rect = [COURT[0], -28.5, COURT[0] + 2, -19.5];
export const COURT_PORTICO: Rect = [COURT_STEPS[2], -29.5, COURT_STEPS[2] + 2.5, -18.5];
export const COURT_BODY: Rect = [COURT_PORTICO[2], COURT[1], COURT[2], COURT[3]];
export const COURT_H = 7.2;
export const COURT_COLUMN = { w: 0.75, h: 4.6, x: COURT_PORTICO[0] + 0.6 };
export const COURT_COLUMNS: Pt[] = [0, 1, 2, 3].map((k): Pt => [COURT_COLUMN.x, -28.3 + (8.6 * k) / 3]);
/** The pediment over the portico: its ridge over the body's front */
export const PEDIMENT_H = 1.5;
export const COURT_TOP = COURT_PODIUM + COURT_COLUMN.h + 1 + 0.18 + PEDIMENT_H;

/** The courthouse's ground: up its steps (a slope over their depth), its portico's floor */
export function courtY(x: number, z: number): number | null {
  const [s0, sz0, s1, sz1] = COURT_STEPS;
  if (x > s0 - 1e-9 && x < s1 && z > sz0 && z < sz1) return COURT_GROUND + (COURT_PODIUM - COURT_GROUND) * ((x - s0) / (s1 - s0));
  const [, pz0, p1, pz1] = COURT_PORTICO;
  if (x >= s1 - 1e-9 && x < p1 && z > pz0 && z < pz1) return COURT_PODIUM;
  return null;
}

/** What's solid: the headquarters and its mast's foot, the yard's walls (the gate open), the cars; the courthouse's
 * body, columns, the antae closing its portico's ends and the cheeks beside its steps */
export const FLANK_SOLIDS: Box[] = (() => {
  const [x0, z0, x1, z1] = POLICE_YARD;
  const w = YARD_WALL.w;
  const out: Box[] = [
    [...POLICE_HQ, HQ.h],
    [x0, z0, x0 + w, z1, YARD_WALL.h],
    [x1 - w, z0, x1, z1, YARD_WALL.h],
    [x0, z1 - w, YARD_GATE.x0, z1, YARD_WALL.h],
    [YARD_GATE.x1, z1 - w, x1, z1, YARD_WALL.h],
    ...YARD_CARS.map(([, x, z]): Box => [x - YARD_CAR_HALF.w, z - YARD_CAR_HALF.l, x + YARD_CAR_HALF.w, z + YARD_CAR_HALF.l, 1.2]),
    [...COURT_BODY, COURT_H],
    ...COURT_COLUMNS.map(([x, z]): Box => [x - COURT_COLUMN.w / 2, z - COURT_COLUMN.w / 2, x + COURT_COLUMN.w / 2, z + COURT_COLUMN.w / 2, COURT_PODIUM + COURT_COLUMN.h]),
    [COURT_PORTICO[0], COURT_PORTICO[1], COURT_PORTICO[2], COURT_PORTICO[1] + 0.4, COURT_PODIUM + COURT_COLUMN.h],
    [COURT_PORTICO[0], COURT_PORTICO[3] - 0.4, COURT_PORTICO[2], COURT_PORTICO[3], COURT_PODIUM + COURT_COLUMN.h],
    [COURT_STEPS[0], COURT_PORTICO[1], COURT_STEPS[2], COURT_STEPS[1], COURT_PODIUM + 0.3],
    [COURT_STEPS[0], COURT_STEPS[3], COURT_STEPS[2], COURT_PORTICO[3], COURT_PODIUM + 0.3],
  ];
  return out;
})();

/** Their pick boxes for the City view (over the ground) */
export const POLICE_PICK: { rect: Rect; h: number }[] = [{ rect: POLICE_HQ, h: HQ.h + HQ.mast - HALL_GROUND }, { rect: POLICE_YARD, h: YARD_WALL.h }];
export const COURT_PICK: { rect: Rect; h: number }[] = [{ rect: COURT, h: COURT_TOP - HALL_GROUND }];
/** Their doors (the walk prompts that open their panels) and where you arrive (their panels' Walk in), facing each
 * (yaw π/2 faces west, -π/2 east) */
export const POLICE_DOOR = { x: HQ.door.x + 0.6, z: HQ.door.z, label: 'Police' };
export const POLICE_SPAWN = { x: WEST_WALK_X, z: HQ.door.z, yaw: Math.PI / 2 };
export const COURT_DOOR = { x: COURT_BODY[0] - 0.6, z: (COURT[1] + COURT[3]) / 2, label: 'Courthouse' };
export const COURTHOUSE_SPAWN = { x: COURT[0] - 1, z: (COURT[1] + COURT[3]) / 2, yaw: -Math.PI / 2 };

/* ---------- Life, night and sound (Phase 4) ---------- */

/** The pale ring in the square's middle: on the axis, level with the middle of the flanking lots, and its radius */
export const RING_C: Pt = [AXIS, (Math.max(POLICE[1], COURT[1]) + Math.min(POLICE[3], COURT[3])) / 2];
export const RING_R = 5.2;

/**
 * The flagpole in the ring's dark heart (the owner's pick): a stone plinth, a tall white pole and a gold ball, the
 * city's flag (the seven-pointed star in gold on crimson, made up, as City Hall's banners) flying from its top;
 * under the Emporium
 */
export const FLAGPOLE = { at: RING_C, plinth: { r: 1.05, h: 0.5 }, h: 10.2, r: 0.09, flag: { w: 2.6, h: 1.6 } };
/** The pole's top over the ground (the ball on it) */
export const FLAG_TOP = HALL_GROUND + FLAGPOLE.plinth.h + FLAGPOLE.h;
/** What's solid: the plinth, and the pole up to its top */
export const FLAG_SOLIDS: Box[] = (() => {
  const [x, z] = FLAGPOLE.at;
  const { r, h } = FLAGPOLE.plinth;
  const p = FLAGPOLE.r;
  return [
    [x - r, z - r, x + r, z + r, HALL_GROUND + h],
    [x - p, z - p, x + p, z + p, FLAG_TOP],
  ];
})();

/**
 * The floodlights (the owner's pick: all three facades lit from their feet at night): a low fixture at the foot of
 * each face and its wash of light up it, a rect on the face: `axis` the way the face points ('x' or 'z'), `sign`
 * which side, `at` the face's line (the wash a hair in front of it), `a0`-`a1` along the face, `y0`-`y1` up it
 * (the wash fading towards its top), `foot` where its fixture stands (x, y, z; none for the friezes, lit by the
 * columns' from below)
 */
export interface Flood {
  axis: 'x' | 'z';
  sign: 1 | -1;
  at: number;
  a0: number;
  a1: number;
  y0: number;
  y1: number;
  foot: [number, number, number] | null;
}
/** The washes a hair in front of what they light (nothing flush) */
export const WASH_OFF = 0.012;
export const FLOODS: Flood[] = (() => {
  const out: Flood[] = [];
  // City Hall: each column's face, from its base to its capital, the fixture on the podium in front of it...
  const cw = COLUMN.w / 2;
  for (const [x, z] of COLUMNS)
    out.push({ axis: 'z', sign: 1, at: z + cw, a0: x - cw, a1: x + cw, y0: PODIUM_Y + 0.3, y1: PODIUM_Y + COLUMN.h - 0.35, foot: [x, PODIUM_Y, PORTICO[3] - 0.13] });
  // ...the frieze over them (its face 0.3 back from the portico's front), and the tower's front over the back block
  const ey = PODIUM_Y + COLUMN.h;
  out.push({ axis: 'z', sign: 1, at: PORTICO[3] - 0.3 + 0.03, a0: PORTICO[0] + ANTA_W, a1: PORTICO[2] - ANTA_W, y0: ey, y1: ey + FRIEZE_H, foot: null });
  const [tx, tz] = TOWER_C;
  for (const [i, t] of TIERS.slice(0, 2).entries()) {
    const under = i ? TIERS[i - 1].top : BACK_H;
    out.push({ axis: 'z', sign: 1, at: tz + t.half, a0: tx - t.half, a1: tx + t.half, y0: under, y1: t.top - 0.3, foot: [tx, under, tz + t.half + 0.6] });
  }
  // The police: its front (east), in bays either side of the entrance, the fixtures on the ground by the wall
  const [, hz0, hx1, hz1] = POLICE_HQ;
  const d = HQ.door;
  for (const [a0, a1] of [
    [hz0 + 0.6, d.z - 5.2],
    [d.z - 5.2, d.z - 2.1],
    [d.z + 2.1, d.z + 5.2],
    [d.z + 5.2, hz1 - 0.6],
  ])
    out.push({ axis: 'x', sign: 1, at: hx1 + 0.12, a0, a1, y0: HALL_GROUND, y1: HQ.h - 0.05, foot: [hx1 + 0.45, HALL_GROUND, (a0 + a1) / 2] });
  // The courthouse: each column's face (west), the fixture on the portico in front of it, and the frieze
  const kw = COURT_COLUMN.w / 2;
  const top = COURT_PODIUM + COURT_COLUMN.h;
  for (const [x, z] of COURT_COLUMNS)
    out.push({ axis: 'x', sign: -1, at: x - kw, a0: z - kw, a1: z + kw, y0: COURT_PODIUM + 0.25, y1: top - 0.3, foot: [COURT_PORTICO[0] + 0.06, COURT_PODIUM, z] });
  out.push({ axis: 'x', sign: -1, at: COURT_PORTICO[0] + 0.05 - 0.03, a0: COURT_PORTICO[1] + 0.4, a1: COURT_PORTICO[3] - 0.4, y0: top, y1: top + 1, foot: null });
  return out;
})();
/** A pool of light on the ground where the police's fixtures stand (world.ts `addPool()` at the boot) */
export const FLOOD_POOLS: [number, number, number][] = FLOODS.filter((f) => f.axis === 'x' && f.sign === 1 && f.foot).map((f) => [f.foot![0] + 0.5, f.foot![2], 2.4]);

/** Whether the square's daytime people are about (the city's hour: City Hall's doors open nine to five, a little either side) */
export const civicDay = (hour: number) => hour >= 8 && hour < 18.5;

/**
 * The square's people standing about (the owner's pick): a guard at each door, always; by day officials talking
 * on City Hall's steps and one on their phone under the colonnade, a queue at its door, people looking up at the
 * flag and chatting, and someone on a bench feeding the pigeons. `y` is where they stand (or the seat), `day` the
 * ones only about by day
 */
export interface CivicIdle {
  x: number;
  z: number;
  y: number;
  ry: number;
  act: 'guard' | 'chat' | 'queue' | 'phone' | 'look' | 'sit';
  day: boolean;
  /** The honour guard at the flagpole, there only while the flag is raised or lowered (Phase 5, `flagCeremony()`) */
  ceremony?: true;
}
/** How far from the flagpole the honour guard stands (Phase 5) */
export const HONOUR = 1.7;
/** The bench the pigeons' friend sits on (one of the square's), and where the pigeons peck: on the granite in front of it */
export const FEEDER_BENCH = 0;
export const PIGEONS = { n: 7, r: 1.3, out: 1.9 };
export const CIVIC_IDLE: CivicIdle[] = (() => {
  const out: CivicIdle[] = [];
  const on = (x: number, z: number) => cityHallY(x, z) ?? HALL_GROUND;
  const stand = (x: number, z: number, ry: number, act: CivicIdle['act'], day = true) => out.push({ x, z, y: on(x, z), ry, act, day });
  // The guards: either side of City Hall's door facing the square, by the police's door facing the walk, on the courthouse's portico
  for (const s of [-1, 1]) stand(AXIS + s * (DOOR.w / 2 + 0.35), PORTICO[1] + 0.4, 0, 'guard', false);
  out.push({ x: HQ.door.x + 1, z: HQ.door.z + 1.6, y: HALL_GROUND, ry: Math.PI / 2, act: 'guard', day: false });
  out.push({ x: COURT_BODY[0] - 0.7, z: (COURT[1] + COURT[3]) / 2 + 1.5, y: COURT_PODIUM, ry: -Math.PI / 2, act: 'guard', day: false });
  // Officials in pairs on the steps, facing each other; one on their phone under the colonnade
  for (const [x, z] of [
    [AXIS - 6, -34.8],
    [AXIS + 6, -33.4],
  ]) {
    stand(x - 0.4, z, Math.PI / 2, 'chat');
    stand(x + 0.4, z, -Math.PI / 2, 'chat');
  }
  stand(AXIS + 6.1, PORTICO[1] + 1.9, 0, 'phone');
  // The queue at the door: along the portico behind the colonnade, facing the door
  for (let k = 0; k < 4; k++) stand(AXIS + 2.1 + k * 0.8, PORTICO[1] + 1.3, -Math.PI / 2, 'queue');
  // On the square: two looking up at the flag (inside the ring, between the walkers' loops), a pair chatting, someone on their phone
  const [fx, fz] = FLAGPOLE.at;
  for (const [x, z] of [
    [fx - 2, fz + 2.2],
    [fx + 2.2, fz - 1.9],
  ])
    stand(x, z, Math.atan2(fx - x, fz - z), 'look');
  stand(AXIS + 9.2, -14.2, Math.PI / 2, 'chat');
  stand(AXIS + 10, -14.2, -Math.PI / 2, 'chat');
  stand(AXIS - 8.8, -16.6, Math.PI, 'phone');
  // The pigeons' friend, on the seat a touch forward of its middle
  const b = SQUARE_BENCHES[FEEDER_BENCH];
  out.push({ x: b.at[0] + Math.sin(b.ry) * 0.08, z: b.at[1] + Math.cos(b.ry) * 0.08, y: HALL_GROUND + 0.3, ry: b.ry, act: 'sit', day: true });
  // The honour guard (Phase 5): either side of the flagpole's plinth, facing it, while the flag goes up or comes down
  for (const s of [-1, 1]) out.push({ x: fx + s * HONOUR, z: fz, y: HALL_GROUND, ry: (-s * Math.PI) / 2, act: 'guard', day: false, ceremony: true });
  return out;
})();
/** Where the pigeons peck: in front of the feeder's bench, the way it faces */
export const PIGEON_C: Pt = (() => {
  const b = SQUARE_BENCHES[FEEDER_BENCH];
  return [b.at[0] + Math.sin(b.ry) * PIGEONS.out, b.at[1] + Math.cos(b.ry) * PIGEONS.out];
})();

/**
 * People crossing the square (the owner's pick), walking round two loops at a stroll: up and down either side of
 * the axis between the avenue and City Hall's steps, and across between the police's walk and the courthouse's
 * steps, either side of the flag. Each is a rect walked round; `n` people evenly spread round it
 */
export const CIVIC_LOOPS: { rect: Rect; n: number; dir: 1 | -1 }[] = [
  { rect: [AXIS - 3.4, STEPS[3] + 0.8, AXIS + 3.4, PARK_EDGE - 1.5], n: 3, dir: 1 },
  { rect: [SQUARE[0] + 4, RING_C[1] - 3.6, SQUARE[2] - 4, RING_C[1] + 3.6], n: 3, dir: -1 },
];
/** Their pace (tiles a second: the park's stroll) */
export const CIVIC_PACE = 0.5;
/** Where on a loop `u` along it is (wrapping), and which way they face (0 is +z), going round the way `dir` says */
export function loopAt(rect: Rect, u: number, dir: 1 | -1): { x: number; z: number; ry: number } {
  const [x0, z0, x1, z1] = rect;
  const corners: Pt[] = [
    [x0, z0],
    [x0, z1],
    [x1, z1],
    [x1, z0],
  ];
  if (dir < 0) corners.reverse();
  const len = 2 * (x1 - x0 + z1 - z0);
  u = ((u % len) + len) % len;
  for (let i = 0; i < 4; i++) {
    const [a, b] = [corners[i], corners[(i + 1) % 4]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (u <= l || i === 3) {
      const k = Math.min(1, u / l);
      return { x: a[0] + (b[0] - a[0]) * k, z: a[1] + (b[1] - a[1]) * k, ry: Math.atan2(b[0] - a[0], b[1] - a[1]) };
    }
    u -= l;
  }
  return { x: x0, z: z0, ry: 0 };
}
/** A loop's length */
export const loopLen = ([x0, z0, x1, z1]: Rect) => 2 * (x1 - x0 + z1 - z0);

/** The people crossing the square, as the park's (life.ts moves them with the park's people; every other one left out on phones) */
export const CIVIC_WALKERS: ParkPerson[] = CIVIC_LOOPS.flatMap(({ rect, n, dir }, li) =>
  Array.from({ length: n }, (_, k): ParkPerson => {
    const u0 = (loopLen(rect) * k) / n + li * 3.7;
    return {
      id: `civic-${li}-${k}`,
      trim: k % 2 === 1,
      at(t: number, out: Moment) {
        const p = loopAt(rect, u0 + t * CIVIC_PACE, dir);
        return Object.assign(out, { x: p.x, z: p.z, ry: p.ry, y: HALL_GROUND, clip: 'walk', speed: CIVIC_PACE });
      },
    };
  })
);

/** City Hall's bell (the owner's pick: on the hour, by the visitor's clock as St Aldwyn's): in its tower's lantern */
export const HALL_BELL: Pt = TOWER_C;

/* ---------- Polish (Phase 5) ---------- */

/**
 * The flag's day (the owner's pick: lowered in the evening, raised in the morning, by the city's hour): it goes up
 * from `up` and comes down from `down`, each over `takes` of an hour (a few minutes on the Live clock), and is
 * taken in between; the honour guard stands at the pole from `guard` before to `guard` after
 */
export const FLAG_DAY = { up: 7, down: 19, takes: 0.05, guard: 0.05 };
const ease = (t: number) => t * t * (3 - 2 * t);
/** How far up the flag is at the city's hour: 1 at the top, 0 taken in */
export function flagLift(hour: number): number {
  const { up, down, takes } = FLAG_DAY;
  const h = ((hour % 24) + 24) % 24;
  if (h < up || h >= down + takes) return 0;
  if (h < up + takes) return ease((h - up) / takes);
  if (h < down) return 1;
  return 1 - ease((h - down) / takes);
}
/** Whether the honour guard is at the pole: round the raising and the lowering */
export function flagCeremony(hour: number): boolean {
  const { up, down, takes, guard } = FLAG_DAY;
  const h = ((hour % 24) + 24) % 24;
  return [up, down].some((at) => h >= at - guard && h < at + takes + guard);
}
/** The flag's middle at the top of the pole and down at the guard's hands, over the ground */
export const FLAG_HIGH = FLAG_TOP - 0.25 - FLAGPOLE.flag.h / 2;
export const FLAG_LOW = HALL_GROUND + FLAGPOLE.plinth.h + 0.9 + FLAGPOLE.flag.h / 2;

/**
 * The fountains (the owner's pick): twin round basins flanking the axis in front of City Hall's steps, between the
 * steps' foot and the walkers' cross loop, each a stone rim, the water and a stepped bowl with a jet in the middle
 */
export const FOUNTAIN = { r: 1.4, w: 0.25, rim: 0.45, water: 0.32, bowl: 0.55, jet: 1.5 };
export const FOUNTAINS: Pt[] = [-1, 1].map((s): Pt => [AXIS + s * 9.5, -30]);
/** What's solid: each basin to its rim */
export const FOUNTAIN_SOLIDS: Box[] = FOUNTAINS.map(([x, z]): Box => {
  const r = FOUNTAIN.r + FOUNTAIN.w;
  return [x - r, z - r, x + r, z + r, HALL_GROUND + FOUNTAIN.rim];
});
