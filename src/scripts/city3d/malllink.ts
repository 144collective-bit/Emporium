/*
 * The Skywalk: Starlight Mall and Palm Court joined over the east ring avenue (docs/mall-plan.md, "One mall",
 * Phase 1, the owner's call; DOM-free, tested in tests/malllink.test.ts), drawn by malllink3d.ts in the mall's chunk.
 * Traffic drives under it; the metro's el runs through its top floor (raised through it: metro.ts `needAt()`).
 *
 * - **The corridor** (`CORRIDOR`): off the hall's east gallery, where the east upper unit third from the north was
 *   (mallinside.ts `CORRIDOR_Z`), on through Bright & Co.'s upper floor to the bridge, the store's windows either side.
 * - **The bridge** (`LINK`): from Bright & Co.'s east face over the avenue to the pavilion, two floors: the lower one
 *   (`L1`) at the mall's upper floor's height, the platform floor (`L2`) at the el's, east of its track behind a glass
 *   screen (`SCREEN_X`); a glass barrel roof over both (`ROOF`). Under it the avenue keeps `CLEAR`. The el's pillar on
 *   the median is a column in the lower floor (`COLUMNS`).
 * - **The pavilion** (`PAVILION`, mall.ts): on Palm Court's west row, where its two northern shops were, a triple-height
 *   atrium with doors on the promenade and the avenue's sidewalk (`PAV_DOORS`), the lower floor's mezzanine across its
 *   north end (`MEZZ_L1`), the platform floor's across its south end (`MEZZ_L2`), and two pairs of escalators crossing
 *   the atrium (`FLIGHTS`): from the street up to the lower floor, rising north (`ESC_G`), and from the lower floor up
 *   to the platform floor, rising south (`ESC_UP`).
 *
 * Walking (as Endswood's sky network): `linkFloorAt()` is the floor under a point by Degen's height (groundheight.ts);
 * `linkUp()` says he's up there, where only `linkWall()` stops him (off every floor is an edge; what stands on his
 * floor, `LINK_SOLIDS`); in the pavilion's ground floor `linkWall()` also keeps him off the escalators' sides and from
 * under them. `LINK_WALLS` (in `SOLIDS`) are the pavilion's walls at street level, its doors open. `LINK_CAMERA` is
 * the slabs and the roof for the walk camera. Made-up names only; no prices on any sign.
 */
import { ANCHORS, LINK_LIFT, LINK_Z, PAVILION, type Pt, type Rect } from './mall';
import { CORRIDOR_Z, IN, UP, floorsAt } from './mallinside';
import { CONNECTOR_Z } from './courtinside';
import { DECK_HALF, HIGH_Y, LINE_X, PILLARS, PILLAR_HALF, PLATFORM_UP } from './metro';

type Box = [number, number, number, number, number];

/** The slab (world.ts `SLAB`): the mall's blocks and Palm Court stand on it */
const SLAB = 0.15;
/** The lower floor (the mall's upper floor's height) and the platform floor (the train's floor over the el's deck, raised through here) */
export const L1 = SLAB + UP;
export const L2 = HIGH_Y + PLATFORM_UP;
/** Their slabs' thickness, and the roof's top (a parapet round the barrel vault, under the pylon: mall.ts `TALLEST`) */
export const L1_T = 0.4;
export const L2_T = 0.45;
export const ROOF = L2 + 2.9;
/** The barrel vault's rise over the roof */
export const VAULT = 0.45;
/** What the avenue keeps under the bridge (the slab's underside over the street) */
export const CLEAR = L1 - L1_T - 0.02;
/** The walls' thickness: the bridge's glass ends and the pavilion's */
export const SKIN = 0.2;

/* ---------- The bridge ---------- */

/** Over the avenue: from Bright & Co.'s east face to the pavilion */
export const LINK: Rect = [ANCHORS[1].rect[2], LINK_Z[0], PAVILION[0], LINK_Z[1]];
/** The el's track through it (x0, x1: its deck), and the platform screen's line east of it */
export const TRACK: Pt = [LINE_X - DECK_HALF, LINE_X + DECK_HALF];
export const SCREEN_X = TRACK[1] + 0.12;
/** The el's pillars inside the bridge: columns in its lower floor */
export const COLUMNS: Pt[] = PILLARS.filter((p) => p.track === 'main' && p.at[1] > LINK[1] && p.at[1] < LINK[3]).map((p) => p.at);
export const COLUMN_R = PILLAR_HALF + 0.1;

/* ---------- The corridor ---------- */

/** Through Bright & Co.'s upper floor, from the hall's east wall (a little into the hall's strip) to the bridge */
export const CORRIDOR: Rect = [IN[2] - 0.5, CORRIDOR_Z[0], LINK[0], CORRIDOR_Z[1]];
/** Its ceiling's height over its floor */
export const CORRIDOR_H = 2.9;

/* ---------- The pavilion ---------- */

/** Inside its walls */
export const PAV_IN: Rect = [PAVILION[0] + SKIN, PAVILION[1] + SKIN, PAVILION[2] - SKIN, PAVILION[3] - SKIN];
/** Its mezzanines: the lower floor's across the north end (the bridge's lower floor runs into it), the platform floor's across the south end */
export const MEZZ_L1: Rect = [PAVILION[0], PAV_IN[1], PAV_IN[2], PAVILION[1] + 7.4];
/**
 * A pair of escalators side by side (up on the one, down on the other), a stair's x0 and x1; its ramp along z from
 * `foot` (at `y0`) to `run` on (at `y1`), a flat landing `LANDING` on to `land`, where the floor up there starts;
 * `rise` is the way it climbs along z
 */
export interface Flight {
  id: 'street' | 'platform' | 'court';
  stairs: { x0: number; x1: number; dir: 1 | -1 }[];
  y0: number;
  y1: number;
  foot: number;
  run: number;
  rise: 1 | -1;
  land: number;
}
/** The flat landing at an escalator's head, and the comb at its foot (where its balustrades start) */
export const LANDING = 1.0;
export const COMB = 0.8;
/** A balustrade's thickness either side of a stair, and between the two */
export const BALUSTRADE = 0.2;
/** How steep (the mall's: mallinside.ts `UP` over its run) */
const SLOPE = UP / 5.5;
const pair = (xm: number): Flight['stairs'] => [
  { x0: xm - 1.7, x1: xm - 0.3, dir: 1 },
  { x0: xm + 0.3, x1: xm + 1.7, dir: -1 },
];
const flight = (id: Flight['id'], xm: number, y0: number, y1: number, land: number, rise: 1 | -1): Flight => {
  const run = (y1 - y0) / SLOPE;
  return { id, stairs: pair(xm), y0, y1, run, rise, land, foot: land - rise * (run + LANDING) };
};
/** From the street up to the lower floor's mezzanine, rising north, by the pavilion's west wall */
export const ESC_G = flight('street', PAV_IN[0] + 2.2, SLAB, L1, MEZZ_L1[3], -1);
/** The platform floor's mezzanine across the south end (its north edge where the escalators up land) */
export const MEZZ_L2: Rect = [PAVILION[0], PAV_IN[3] - 3.7, PAV_IN[2], PAV_IN[3]];
/** From the lower floor up to the platform floor, rising south, by the pavilion's east wall */
export const ESC_UP = flight('platform', PAV_IN[2] - 2.5, L1, L2, MEZZ_L2[1], 1);
export const FLIGHTS: Flight[] = [ESC_G, ESC_UP];
/** A flight's whole width, its balustrades' outer faces (x0, x1) */
export const flightX = (f: Flight): Pt => [f.stairs[0].x0 - BALUSTRADE, f.stairs[1].x1 + BALUSTRADE];
/** Where its ramp is, along z (z0, z1: between its foot and where the floor up there starts) */
export const flightZ = (f: Flight): Pt => [Math.min(f.foot, f.land), Math.max(f.foot, f.land)];
/** Its ramp's height at z */
export const flightY = (f: Flight, z: number) => f.y0 + Math.min(1, Math.max(0, ((z - f.foot) * f.rise) / f.run)) * (f.y1 - f.y0);
/** The doors: on the promenade (east) and the avenue's sidewalk (west), under the lower floor's mezzanine (z0, z1 on its wall) */
export const PAV_DOORS: { x: number; face: 1 | -1; z0: number; z1: number }[] = [
  // (the way through from Palm Court indoors, both floors: courtinside.ts `CONNECTOR`)
  { x: PAVILION[2], face: 1, z0: CONNECTOR_Z[0], z1: CONNECTOR_Z[1] },
  { x: PAVILION[2], face: 1, z0: MEZZ_L2[1] + 0.4, z1: PAV_IN[3] - 0.6 },
  // (clear of the lift in the north-west corner)
  { x: PAVILION[0], face: -1, z0: MEZZ_L1[1] + 2.6, z1: MEZZ_L1[3] - 0.9 },
];
export const DOOR_H = 2.8;

/* ---------- The floors ---------- */

/** The lower floor: the corridor, the bridge (inside its glass ends), the pavilion's north mezzanine */
export const L1_FLOORS: Rect[] = [CORRIDOR, [LINK[0], LINK[1] + SKIN, LINK[2], LINK[3] - SKIN], MEZZ_L1, [PAV_IN[2], CONNECTOR_Z[0], PAVILION[2] + 0.3, CONNECTOR_Z[1]]];
/** The platform floor: along the track behind the screen, and the pavilion's south mezzanine */
export const L2_FLOORS: Rect[] = [[SCREEN_X + 0.05, LINK[1] + SKIN, LINK[2], LINK[3] - SKIN], MEZZ_L2];
const inR = (r: Rect, x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
/** On a floor's edge counts (a mezzanine and the bridge meet on a line) */
const onR = (r: Rect, x: number, z: number) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3];
const onFlight = (f: Flight, x: number, z: number) => {
  const [z0, z1] = flightZ(f);
  return z > z0 && z < z1 && f.stairs.some((s) => x > s.x0 && x < s.x1);
};
/** The floors over a point (world heights): an escalator's ramp alone where it stands on the street, else the pavilion's ground floor, the lower floor and the platform floor where they are */
export function linkFloors(x: number, z: number): number[] {
  // (the platform floor's mezzanine reaches over the street escalators' foot)
  if (onFlight(ESC_G, x, z)) return L2_FLOORS.some((r) => onR(r, x, z)) ? [flightY(ESC_G, z), L2] : [flightY(ESC_G, z)];
  const out: number[] = [];
  const pav = inR(PAV_IN, x, z);
  if (pav) out.push(SLAB);
  if (onFlight(ESC_UP, x, z)) return [...out, flightY(ESC_UP, z)];
  if (L1_FLOORS.some((r) => onR(r, x, z))) out.push(L1);
  if (L2_FLOORS.some((r) => onR(r, x, z))) out.push(L2);
  return out;
}
/** How high a step up, and how far a drop (a jump's height and more), and still on a floor */
const STEP = 0.3;
const DROP = 1.3;
/**
 * The floor under a point for someone whose feet are at `yNow` (world height): the highest within a step of them;
 * null off the Skywalk, or where nothing's in reach (on the avenue under the bridge, the street is)
 */
export function linkFloorAt(x: number, z: number, yNow: number): number | null {
  const fl = linkFloors(x, z).filter((f) => f <= yNow + STEP);
  return fl.length ? Math.max(...fl) : null;
}

/* ---------- What stands on a floor ---------- */

/** Benches on the bridge's lower floor by its glass ends, looking out along the avenue (x, z, facing: 0 is +z) */
export const BENCHES: { x: number; z: number; ry: number }[] = [
  { x: LINK[0] + 2.4, z: LINK[1] + 1.0, ry: Math.PI },
  { x: LINK[0] + 2.4, z: LINK[3] - 1.0, ry: 0 },
  { x: (SCREEN_X + LINK[2]) / 2, z: LINK[3] - 1.0, ry: 0 },
];
/** Trees in white planters on the lower floor (x, z) */
export const PLANTERS: Pt[] = [
  [LINK[0] + 1.0, (LINK[1] + LINK[3]) / 2 + 1.2],
  [LINK[2] - 1.3, (LINK[1] + LINK[3]) / 2 + 3.5],
];
export const PLANTER_R = 0.55;
/** The coffee kiosk on the lower floor: the café from the west row's shop the pavilion took (mall.ts `SHOP_NAMES`) */
export const KIOSK = { rect: [LINK[0] + 0.6, LINK[3] - 5.2, LINK[0] + 2.4, LINK[3] - 3.2] as Rect, name: 'BRISK COFFEE' };
/** Benches on the platform floor along the screen, facing the track (x, z, facing) */
export const PLATFORM_BENCHES: { x: number; z: number; ry: number }[] = [-4, 2.5].map((dz) => ({ x: LINK[2] - 0.7, z: (LINK[1] + LINK[3]) / 2 + dz, ry: -Math.PI / 2 }));
/* ---------- The station (Phase 2: metro.ts's Starlight Mall, its door on the platform) ---------- */

/** The METRO sign over the fare gates */
export const BOARD = { x: PAVILION[0] + 0.6, z: (MEZZ_L2[1] + PAV_IN[3]) / 2, text: 'METRO' };
/**
 * The fare gates across the way from the platform floor's mezzanine onto the platform (for the look: the rides are
 * free): their cabinets' footprints, the gaps between them to walk through
 */
export const GATES: Rect[] = (() => {
  const [z0, z1] = [MEZZ_L2[1], PAV_IN[3]];
  const n = 4;
  const w = 0.2;
  const gap = (z1 - z0 - n * w) / (n - 1);
  return Array.from({ length: n }, (_, i): Rect => [PAVILION[0] - 0.6, z0 + i * (w + gap), PAVILION[0] + 0.6, z0 + i * (w + gap) + w]);
})();
/** The next-train boards (malllink3d.ts, from metro.ts `nextTrain()`), `BOARD_W` by `BOARD_H`: hung under the ceiling over the platform (both faces), on the mezzanine's south wall (facing north) */
export const BOARD_W = 1.7;
export const BOARD_H = BOARD_W / 4;
export const NEXT_BOARDS: { x: number; y: number; z: number; ry: number }[] = [
  { x: (SCREEN_X + LINK[2]) / 2, y: ROOF - 0.4 - 0.08 - BOARD_H / 2, z: (LINK[1] + LINK[3]) / 2 - 3.2, ry: 0 },
  { x: (SCREEN_X + LINK[2]) / 2, y: ROOF - 0.4 - 0.08 - BOARD_H / 2, z: (LINK[1] + LINK[3]) / 2 - 3.2, ry: Math.PI },
  { x: (MEZZ_L2[0] + MEZZ_L2[2]) / 2 + 1, y: L2 + 2.1, z: PAV_IN[3] - 0.06, ry: Math.PI },
];
/** The glass lift (mall.ts `LINK_LIFT`): its floors, each with its door (where its prompt is, and where it lets you out: walk mode faces (-sin yaw, -cos yaw)) */
export interface LiftFloor {
  name: string;
  y: number;
  door: { x: number; z: number; yaw: number };
}
const LX = (LINK_LIFT[0] + LINK_LIFT[2]) / 2;
const LZ = (LINK_LIFT[1] + LINK_LIFT[3]) / 2;
export const STATION_LIFT: { id: string; name: string; floors: LiftFloor[] } = {
  id: 'skywalk',
  name: 'Starlight Mall',
  floors: [
    { name: 'Street', y: SLAB, door: { x: LX, z: LINK_LIFT[3] + 0.75, yaw: Math.PI } },
    { name: 'Mall', y: L1, door: { x: LX, z: LINK_LIFT[3] + 0.75, yaw: Math.PI } },
    { name: 'Metro', y: L2, door: { x: LINK_LIFT[0] - 0.75, z: LZ, yaw: Math.PI / 2 } },
  ],
};
/** Which of the lift's floors someone (feet at `y`, world) is on, by its index, or null */
export const liftFloorAt = (y: number) => {
  const i = STATION_LIFT.floors.findIndex((f) => Math.abs(f.y - y) < 0.8);
  return i < 0 ? null : i;
};
/** The lift's call point walk mode prompts at, for someone `y` high: the door on their floor */
export function stationLiftDoors(y: number): { id: string; x: number; z: number; label: string }[] {
  const i = liftFloorAt(y);
  if (i === null) return [];
  const d = STATION_LIFT.floors[i].door;
  return [{ id: `station-lift:${STATION_LIFT.id}`, x: d.x, z: d.z, label: 'Lift' }];
}
/** Solid between two heights (x0, z0, x1, z1, from, to: world): stops someone whose feet are between them */
export type Solid = [number, number, number, number, number, number];
const sq = (x: number, z: number, r: number, y0: number, y1: number): Solid => [x - r, z - r, x + r, z + r, y0, y1];
const balustrades = (f: Flight): Solid[] => {
  const [a, b] = f.stairs;
  const [z0, z1] = flightZ(f);
  const [za, zb] = [f.rise === 1 ? z0 - COMB : z0, f.rise === 1 ? z1 : z1 + COMB];
  return [
    [a.x0 - BALUSTRADE, za, a.x0, zb, f.y0, f.y1 + 1],
    [a.x1, za, b.x0, zb, f.y0, f.y1 + 1],
    [b.x1, za, b.x1 + BALUSTRADE, zb, f.y0, f.y1 + 1],
  ];
};
export const LINK_SOLIDS: Solid[] = [
  ...FLIGHTS.flatMap(balustrades),
  ...COLUMNS.map(([x, z]) => sq(x, z, COLUMN_R, L1, L2)),
  ...BENCHES.map((b): Solid => (b.ry === 0 || b.ry === Math.PI ? [b.x - 1.05, b.z - 0.25, b.x + 1.05, b.z + 0.25, L1, L1 + 0.9] : [b.x - 0.25, b.z - 1.05, b.x + 0.25, b.z + 1.05, L1, L1 + 0.9])),
  ...PLANTERS.map(([x, z]) => sq(x, z, PLANTER_R, L1, L1 + 0.6)),
  [...KIOSK.rect, L1, L1 + 2.4] as Solid,
  ...PLATFORM_BENCHES.map((b): Solid => [b.x - 0.25, b.z - 1.05, b.x + 0.25, b.z + 1.05, L2, L2 + 0.9]),
  // (the fare gates' cabinets; the lift's shaft, all the way up)
  ...GATES.map((g): Solid => [...g, L2, L2 + 1.1] as Solid),
  [...LINK_LIFT, SLAB, ROOF] as Solid,
];

/* ---------- Walking ---------- */

/** Up on the bridge or in the corridor: off the street */
const RAISED: Rect[] = [CORRIDOR, LINK];
/** Whether someone (feet at `y`, world) is up in the Skywalk: then only `linkWall()` stops them (walk.ts) */
export function linkUp(x: number, z: number, y: number): boolean {
  if (inR(PAVILION, x, z)) return y > SLAB + 0.9;
  // (a hair over its edges: where the bridge meets the pavilion counts as up there)
  return y > L1 - DROP && RAISED.some((r) => inR(r, x, z, 0.01));
}
/** The floors someone at `y` can stand on at a point: the Skywalk's, and the hall's (the corridor starts in its strip) */
function reach(x: number, z: number, y: number): boolean {
  const ok = (f: number) => f <= y + STEP && f >= y - DROP;
  return linkFloors(x, z).some(ok) || floorsAt(x, z).some((f) => ok(SLAB + f));
}
/**
 * Where Degen (radius `m`, feet at `y`) can't stand: up there, off every floor (an edge, a balustrade, the screen, the
 * glass) or in what stands on his floor; in the pavilion's ground floor, the escalators' sides and under them
 */
export function linkWall(x: number, z: number, y: number, m = 0): boolean {
  const up = linkUp(x, z, y);
  if (!up && !inR(PAV_IN, x, z, m)) return false;
  for (const [dx, dz] of [
    [0, 0],
    [m, 0],
    [-m, 0],
    [0, m],
    [0, -m],
  ]) {
    const [px, pz] = [x + dx, z + dz];
    // (in the pavilion's ground floor only what's inside its walls: its walls themselves are `LINK_WALLS`)
    if (!up && !inR(PAV_IN, px, pz)) continue;
    if (!reach(px, pz, y)) return true;
  }
  return LINK_SOLIDS.some((s) => y >= s[4] - 0.3 && y < s[5] && x > s[0] - m && x < s[2] + m && z > s[1] - m && z < s[3] + m);
}

/** The pavilion's walls at street level, its doors open (in `SOLIDS`: up there `linkWall()` keeps you in) */
export const LINK_WALLS: Box[] = (() => {
  const [x0, z0, x1, z1] = PAVILION;
  const h = ROOF;
  const out: Box[] = [
    [x0, z0, x1, z0 + SKIN, h],
    [x0, z1 - SKIN, x1, z1, h],
  ];
  for (const x of [x0, x1]) {
    const doors = PAV_DOORS.filter((d) => d.x === x).sort((a, b) => a.z0 - b.z0);
    let at = z0 + SKIN;
    const [w0, w1] = x === x0 ? [x0, x0 + SKIN] : [x1 - SKIN, x1];
    for (const d of doors) {
      out.push([w0, at, w1, d.z0, h]);
      at = d.z1;
    }
    out.push([w0, at, w1, z1 - SKIN, h]);
  }
  return out;
})();

/** For the walk camera (x0, z0, x1, z1, top, bottom): the floors' slabs, the corridor's ceiling, the roof */
export const LINK_CAMERA: number[][] = [
  ...L1_FLOORS.filter((r) => r !== CORRIDOR).map((r) => [...r, L1, L1 - L1_T]),
  ...L2_FLOORS.map((r) => [...r, L2, L2 - L2_T]),
  [CORRIDOR[0] + 0.5, CORRIDOR[1], CORRIDOR[2], CORRIDOR[3], L1 + CORRIDOR_H + 0.3, L1 + CORRIDOR_H],
  [LINK[0], LINK[1], PAVILION[2], LINK[3], ROOF + 0.1, ROOF - 0.5],
];

/* ---------- People ---------- */

export interface LinkPerson {
  x: number;
  z: number;
  ry: number;
  act: 'look' | 'chat' | 'sit';
  /** Over the slab (a seat's height for those sitting) */
  y: number;
}
export const LINK_PEOPLE: LinkPerson[] = (() => {
  const out: LinkPerson[] = [];
  const y1 = L1 - SLAB;
  const y2 = L2 - SLAB;
  // On the lower floor's benches, looking out along the avenue
  for (const b of BENCHES.slice(0, 2)) out.push({ x: b.x - 0.4, z: b.z + (b.ry === 0 ? -0.05 : 0.05), ry: b.ry, act: 'sit', y: y1 + 0.32 });
  // At the kiosk, and two chatting by the corridor's mouth
  out.push({ x: KIOSK.rect[2] + 0.55, z: (KIOSK.rect[1] + KIOSK.rect[3]) / 2, ry: Math.PI / 2, act: 'look', y: y1 });
  out.push({ x: LINK[0] + 3.2, z: CORRIDOR[3] + 1.2, ry: Math.PI / 2, act: 'chat', y: y1 }, { x: LINK[0] + 3.9, z: CORRIDOR[3] + 1.3, ry: -Math.PI / 2, act: 'chat', y: y1 });
  // Waiting on the platform floor, facing the track
  out.push({ x: SCREEN_X + 0.7, z: (LINK[1] + LINK[3]) / 2 - 1.5, ry: Math.PI / 2, act: 'look', y: y2 }, { x: SCREEN_X + 0.8, z: (LINK[1] + LINK[3]) / 2 + 4.5, ry: Math.PI / 2, act: 'look', y: y2 });
  // Looking down into the atrium from the lower floor's mezzanine
  out.push({ x: (MEZZ_L1[0] + flightX(ESC_UP)[0]) / 2 + 0.6, z: MEZZ_L1[3] - 0.45, ry: Math.PI, act: 'look', y: y1 });
  // In the pavilion's ground floor by the promenade's doors
  out.push({ x: PAV_IN[2] - 1.4, z: MEZZ_L1[1] + 3, ry: -Math.PI / 2, act: 'chat', y: 0 }, { x: PAV_IN[2] - 2.1, z: MEZZ_L1[1] + 3.2, ry: Math.PI / 2, act: 'chat', y: 0 });
  return out;
})();

/** The tallest anything stands: the vault's crown over the roof */
export const LINK_TALLEST = ROOF + VAULT;
