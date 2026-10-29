/**
 * What's in Sunridge's three places (docs/suburb-plan.md Phase 4; their footprints are sunplaces.ts's, the boot's).
 * DOM-free, the chunk's (sunamenities3d.ts draws it; tests/sunamenities.test.ts):
 *
 * - **Sunridge Club**: the clubhouse with its portico (`PORTICO`), the pool yard behind it in a black iron fence with
 *   its gate off the clubhouse's back door (`POOL_YARD`, `POOL_GATE`): the lap pool (`LAP_POOL`) and the round splash
 *   pool under a shade sail (`SPLASH`), umbrellas, loungers facing the water and the lifeguard's chair; two pickleball
 *   courts in their fence (`COURTS`, `COURT_FENCE`); the car park beside the clubhouse with its drive off the loop
 *   (`CAR_PARK`, `CLUB_BAYS`, `CLUB_CARS`).
 * - **Sunridge Park**: the walk round it (`PARK_WALK`) and its way in from the loop (`PARK_SPUR`), the playground
 *   under shade sails (`PLAYGROUND`: towers, a bridge, a slide, swings), the ramada with its picnic tables (`RAMADA`),
 *   the field, shade trees (`PARK_TREES`), benches facing in (`PARK_BENCHES`), a drinking fountain.
 * - **Sunridge Elementary**: its wings and hall (sunplaces.ts) with covered walks round the courtyard (`CANOPIES`),
 *   the field with its goals (`FIELD`, `GOALS`), the playground (`SCHOOL_PLAY`), the bus bay and the yellow bus in it
 *   (`BUS_BAY`, `SCHOOL_BUS`), the flagpole and the name on a low wall by the walk (`FLAG`, `SIGN`).
 *
 * `AMENITY_SOLIDS`: the fences, the ramada's posts, the play towers, the goals, the cars and the bus; joined to the grids
 * when the chunk loads. Everything under the Emporium.
 */
import { CLUBHOUSE, PARK_LAND, SCHOOL, SLAB_Y } from './sunplaces';
import type { Rect } from './sunridge';

type Pt = [number, number];
type Box = [number, number, number, number, number];

/* ---------- Sunridge Club ---------- */

export const PORTICO: Rect = [148.6, CLUBHOUSE.rect[3], 152.4, CLUBHOUSE.rect[3] + 1.3];
/** The pool yard behind the clubhouse, fenced, its gate on the clubhouse's side by the back door */
export const POOL_YARD: Rect = [144, -57.5, 162.2, -43];
export const POOL_GATE = { x: 150.5, w: 1.3 } as const;
export const LAP_POOL: Rect = [146, -55, 157, -48.6];
export const SPLASH = { x: 159.7, z: -50.8, r: 1.45 } as const;
export const UMBRELLAS: Pt[] = [
  [147.4, -45.3],
  [151.9, -45.3],
  [156.4, -45.3],
  [160.6, -55.6],
];
/** Loungers along the deck's south side facing the pool (yaw: their foot to the north), between the umbrellas */
export const LOUNGERS: { x: number; z: number }[] = [146.2, 148.6, 150.7, 153.1, 155.2].map((x) => ({ x, z: -45.6 }));
export const LIFEGUARD: Pt = [157.9, -47.7];
/** Two pickleball courts (about 6 x 13.4 m each), long ways north-south, in their fence with a gate on the south */
export const COURTS: Rect[] = [
  [163.6, -55.5, 166.9, -48.1],
  [167.6, -55.5, 170.9, -48.1],
];
export const COURT_FENCE: Rect = [163, -56.6, 171.4, -47];
export const COURT_GATE = { x: 167.25, w: 1.2 } as const;
/** The car park beside the clubhouse: bays along its north side, the aisle, the drive out to the loop */
export const CAR_PARK: Rect = [158, -41.5, 170.8, -33.2];
export const BAY = { w: 2.4, d: 4.1 } as const;
export const CLUB_BAYS: Rect[] = Array.from({ length: 5 }, (_, i): Rect => [158.4 + i * BAY.w, CAR_PARK[1], 158.4 + (i + 1) * BAY.w, CAR_PARK[1] + BAY.d]);
export const CLUB_DRIVE: [number, number] = [164, 167.2];
/** The cars in the bays, nose in (facing north: a car's front is its +x, turned a quarter) */
export const CLUB_CARS: [string, number, number, number, string][] = [
  ['hatch', (CLUB_BAYS[0][0] + CLUB_BAYS[0][2]) / 2, CAR_PARK[1] + 1.6, Math.PI / 2, '#f3f2f7'],
  ['sedan', (CLUB_BAYS[2][0] + CLUB_BAYS[2][2]) / 2, CAR_PARK[1] + 1.7, Math.PI / 2, '#2b2a40'],
  ['pickup', (CLUB_BAYS[3][0] + CLUB_BAYS[3][2]) / 2, CAR_PARK[1] + 1.8, Math.PI / 2, '#e23b3b'],
];

/* ---------- Sunridge Park ---------- */

const [px0, pz0, px1, pz1] = PARK_LAND;
/** The walk round the park: a rounded loop in from its edges (its last point its first) */
export const PARK_WALK: Pt[] = (() => {
  const [x0, z0, x1, z1] = [px0 + 2, pz0 + 2, px1 - 2, pz1 - 2.5];
  const r = 3;
  const out: Pt[] = [];
  const corner = (cx: number, cz: number, a0: number) => {
    for (let k = 0; k <= 6; k++) {
      const a = a0 + (k / 6) * (Math.PI / 2);
      out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
    }
  };
  corner(x1 - r, z1 - r, 0);
  corner(x0 + r, z1 - r, Math.PI / 2);
  corner(x0 + r, z0 + r, Math.PI);
  corner(x1 - r, z0 + r, -Math.PI / 2);
  out.push([...out[0]]);
  return out;
})();
export const WALK_W = 1.1;
/** The way in from the loop's sidewalk to the walk */
export const PARK_SPUR: Rect = [185.4, pz1 - 2.5, 186.6, pz1];
export const PLAYGROUND: Rect = [176.6, -56.8, 185, -48.6];
export const PLAY = {
  towers: [
    [178.6, -52.2],
    [182.0, -52.2],
  ] as Pt[],
  tower: 0.75,
  deck: 1.15,
  roof: 2.1,
  /** The slide off the east tower, down to the south */
  slide: { x: 182.0, z0: -51.45, z1: -49.3 },
  /** The swings' frame along x at its z, its seats */
  swings: { x0: 177.2, x1: 180.8, z: -55.6, h: 1.65 },
  /** Shade sails over it: three corners each, on poles */
  sails: [
    [
      [176.9, -56.6],
      [181.6, -56.4],
      [179.3, -50.2],
    ],
    [
      [180.4, -50.0],
      [184.8, -49.0],
      [184.6, -54.6],
    ],
  ] as Pt[][],
  sailH: 2.6,
} as const;
export const RAMADA: Rect = [188, -56.5, 195, -51.6];
export const RAMADA_H = 2.05;
export const PARK_TABLES: Pt[] = [
  [189.9, -54.05],
  [193.1, -54.05],
];
export const DRINK: Pt = [186.9, -50.2];
export const PARK_TREES: { x: number; z: number; s: number }[] = [
  [174.3, -36.5, 1],
  [197.6, -37, 1.1],
  [174.2, -45.5, 0.9],
  [197.7, -47, 1],
  [186.6, -59.6, 1.05],
  [192.5, -39.5, 0.95],
  [179.5, -40.5, 1],
].map(([x, z, s]) => ({ x, z, s }));
/** Benches on the walk's inner side, facing into the park (yaw: the way they face, as (sin, cos)) */
export const PARK_BENCHES: { x: number; z: number; yaw: number }[] = [
  { x: 180, z: -36.2, yaw: Math.PI },
  { x: 192, z: -36.2, yaw: Math.PI },
  { x: 195.6, z: -45, yaw: -Math.PI / 2 },
  { x: 176.4, z: -45, yaw: Math.PI / 2 },
];

/* ---------- Sunridge Elementary ---------- */

/** Covered walks: along the back of the front wing and down the side wing's east face, on posts */
export const CANOPIES: Rect[] = [
  [SCHOOL.wings[1][2], SCHOOL.wings[0][1] - 1.7, SCHOOL.wings[0][2], SCHOOL.wings[0][1]],
  [SCHOOL.wings[1][2], SCHOOL.wings[1][1], SCHOOL.wings[1][2] + 1.7, SCHOOL.wings[0][1] - 1.7],
];
export const CANOPY_H = 1.55;
export const FIELD: Rect = [210.5, -63, 229.5, -51.5];
/** The goals at the field's ends (their mouths facing in) */
export const GOALS: { x: number; z: number; face: 1 | -1 }[] = [
  { x: FIELD[0] + 0.5, z: (FIELD[1] + FIELD[3]) / 2, face: 1 },
  { x: FIELD[2] - 0.5, z: (FIELD[1] + FIELD[3]) / 2, face: -1 },
];
export const GOAL = { w: 3.2, h: 1.15, d: 0.9 } as const;
export const SCHOOL_PLAY: Rect = [224, -50, 231, -42.6];
export const SCHOOL_PLAY_TOWER: Pt = [227.5, -46.3];
/** The bus bay beside the front wing and the school's yellow bus in it, facing east */
export const BUS_BAY: Rect = [222.6, -38.4, 229.9, -33.6];
export const SCHOOL_BUS: [string, number, number, number, string] = ['bus', 226.3, -36, 0, '#f2c21b'];
export const FLAG: Pt = [216.6, -32.8];
export const FLAG_H = 4.2;
/** The name on a low wall by the front walk (made up) */
export const SIGN = { rect: [203.2, -33.2, 208.2, -32.7] as Rect, h: 0.75, text: 'SUNRIDGE ELEMENTARY' } as const;
export const CLUB_SIGN = { rect: [143.6, -33.2, 147.8, -32.7] as Rect, h: 0.7, text: 'SUNRIDGE CLUB' } as const;

/* ---------- What's solid ---------- */

/** A fence round a box with a gate gap on its south side (+z), as boxes along its sides */
function fence(r: Rect, gate: { x: number; w: number }, h: number): Box[] {
  const [x0, z0, x1, z1] = r;
  const t = 0.06;
  const top = SLAB_Y + h;
  return [
    [x0 - t, z0 - t, x1 + t, z0 + t, top],
    [x0 - t, z0, x0 + t, z1, top],
    [x1 - t, z0, x1 + t, z1, top],
    [x0 - t, z1 - t, gate.x - gate.w / 2, z1 + t, top],
    [gate.x + gate.w / 2, z1 - t, x1 + t, z1 + t, top],
  ];
}
export const POOL_FENCE_H = 1.0;
export const COURT_FENCE_H = 1.6;
const carBox = (x: number, z: number, yaw: number, L: number, W: number): Box => {
  const [hx, hz] = Math.abs(Math.cos(yaw)) > 0.5 ? [L / 2, W / 2] : [W / 2, L / 2];
  return [x - hx, z - hz, x + hx, z + hz, SLAB_Y + 1.4];
};
export const AMENITY_SOLIDS: Box[] = [
  ...fence(POOL_YARD, POOL_GATE, POOL_FENCE_H),
  ...fence(COURT_FENCE, COURT_GATE, COURT_FENCE_H),
  // The ramada's posts, the play towers, the goals' frames
  ...[RAMADA[0] + 0.15, RAMADA[2] - 0.15].flatMap((x) => [RAMADA[1] + 0.15, RAMADA[3] - 0.15].map((z): Box => [x - 0.12, z - 0.12, x + 0.12, z + 0.12, SLAB_Y + RAMADA_H])),
  ...PLAY.towers.map(([x, z]): Box => [x - PLAY.tower, z - PLAY.tower, x + PLAY.tower, z + PLAY.tower, SLAB_Y + PLAY.roof]),
  ...GOALS.map((g): Box => [g.x - (g.face > 0 ? 0.05 : GOAL.d), g.z - GOAL.w / 2, g.x + (g.face > 0 ? GOAL.d : 0.05), g.z + GOAL.w / 2, SLAB_Y + GOAL.h]),
  // The cars and the bus
  ...CLUB_CARS.map(([, x, z, yaw]) => carBox(x, z, yaw, 2.5, 1.2)),
  carBox(SCHOOL_BUS[1], SCHOOL_BUS[2], SCHOOL_BUS[3], 5.6, 1.4),
];
