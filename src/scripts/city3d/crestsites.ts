/**
 * Crestmont's landmarks (docs/crestmont-plan.md Phase 7, the owner's picks; scenery in this step, each a place next).
 * DOM-free: terrain.ts holds the ground under them level (`SITE_LEVELS`, with the mansions' in its `LEVELS`), solids.ts
 * what's solid, landscape.ts the palms they bring and the planting kept off them (`onSite()`), crestsites3d.ts draws
 * them.
 *
 * - **The grand hotel** (`HOTEL`, THE CORALLINE, made up) on the Flats' block kept for it off the boulevard
 *   (estates.ts `KEPT`): a pastel pink hotel of four storeys round a five-storey tower, a porte-cochère over its door
 *   off a drive looping round a fountain from the boulevard, its name in script on the roof; behind it, the pool garden
 *   with cabanas and loungers; palms round it all (`HOTEL_PALMS`).
 * - **The civic hall** (`CIVIC`) at the boulevard's head, north of Foothill Road on ground held level: a white hall with
 *   a colonnade and a tower under a tiled dome, a park in front with a walk up the boulevard's line and two fountains.
 * - **The country club** (`CLUB`) on the lower slopes west of Canyon Drive: a clubhouse by Foothill Road, six holes
 *   (`HOLES`: tees, fairways, greens with their flags, bunkers) up the strip and back, laid on the ground as it is,
 *   carts by the clubhouse.
 * - **The overlook** (`OVERLOOK`) past Ridge Road's end: a little paved park held level, a stone balustrade on the
 *   sides that fall away, benches and coin viewers looking back over Sector 7. No sign on the hillside (the owner's call).
 * - **The reservoir** (`RESERVOIR`) in a bowl of the hills east of the ridge: still water held at `y` over a basin,
 *   a dam wherever the ground falls away from it, a valve tower, a fence round it.
 *
 * Names made up. Every top under the Emporium (`TALLEST` over its ground). Fixed world numbers north of the river.
 */
import { BED, CREST_BLOCKS, HILL_ROADS, nearHillRoad, roadY, type Rect } from './crestmont';
import { natural } from './hills';
import { CUT, MANSIONS } from './mansions';

type Pt = [number, number];
type Box = [number, number, number, number, number];

/** The tallest anything here stands over its ground (the Emporium's roof is 12.5) */
export const TALLEST = 11.4;
export const SLAB_Y = 0.15;
/** A site's level eased back into the hills over this (the mansions' `PAD_EASE`) */
export const EASE = 6;

/* ---------- The grand hotel ---------- */

const HOTEL_BLOCK = CREST_BLOCKS.find((b) => b.id === 'crest-2-0')!.rect;
export const HOTEL_NAME = 'The Coralline';
export const HOTEL = (() => {
  const [x0, z0, x1, z1] = HOTEL_BLOCK;
  return {
    block: HOTEL_BLOCK,
    /** The hotel: its four storeys, the tower in the middle of its front, the storeys' heights */
    body: [x0 + 5.5, z0 + 3, x1 - 2.5, z0 + 19] as Rect,
    floors: 4,
    tower: [x0 + 9.5, z0 + 7, x0 + 16.5, z0 + 15] as Rect,
    towerFloors: 5,
    storey: { ground: 2.4, upper: 2 },
    /** Its door on the west front, the porte-cochère out over the drive */
    porte: [x0 + 3.2, z0 + 7.5, x0 + 5.5, z0 + 14.5] as Rect,
    /** The drive: in from the boulevard and round the fountain's island */
    drive: [x0, z0 + 2, x0 + 5.5, z0 + 20] as Rect,
    island: { x: x0 + 2.6, z: z0 + 11, rx: 1.4, rz: 4.2 },
    /** The pool garden behind: the pool, its deck, the cabanas along it */
    pool: [x0 + 9, z1 - 20, x1 - 6, z1 - 10] as Rect,
    deck: [x0 + 7, z1 - 23, x1 - 3.5, z1 - 6] as Rect,
    cabanas: [0, 1, 2, 3].map((i): Pt => [x0 + 9.5 + i * 3.4, z1 - 3.6]),
  };
})();
/** The hotel's palms: date palms round the drive's island and along the front, fan palms round the pool garden */
export const HOTEL_PALMS: { x: number; z: number; kind: 'fan' | 'date' }[] = (() => {
  const [x0, , x1, z1] = HOTEL.block;
  const out: { x: number; z: number; kind: 'fan' | 'date' }[] = [];
  out.push({ x: HOTEL.island.x, z: HOTEL.island.z - 2.6, kind: 'date' }, { x: HOTEL.island.x, z: HOTEL.island.z + 2.6, kind: 'date' });
  for (const z of [z1 - 21.5, z1 - 13, z1 - 4.5]) out.push({ x: x0 + 3.5, z, kind: 'fan' });
  // (on the east side clear of Linden Way's palms and the cabanas)
  for (const z of [z1 - 21.5, z1 - 13]) out.push({ x: x1 - 4.5, z, kind: 'fan' });
  return out;
})();

/* ---------- The civic hall ---------- */

/** The boulevard's line (crestmont.ts FLATS_X[2]) */
const AXIS = 362;
export const CIVIC = {
  pad: [AXIS - 12, -95, AXIS + 12, -66] as Rect,
  y: 0,
  /** The hall, its colonnade's columns along its front, the tower and its dome */
  hall: [AXIS - 8, -93, AXIS + 8, -83] as Rect,
  floors: 2,
  storey: { ground: 2.6, upper: 2.2 },
  colonnade: { z: -81.6, n: 8 },
  tower: [AXIS - 2.6, -90.5, AXIS + 2.6, -85.3] as Rect,
  towerTop: 7.4,
  dome: 2.4,
  /** The park in front: the walk up the axis, the fountains either side of it */
  walk: [AXIS - 1.8, -81, AXIS + 1.8, -66] as Rect,
  fountains: [[AXIS - 6.5, -73.5], [AXIS + 6.5, -73.5]] as Pt[],
  fountainR: 1.6,
  benches: [[AXIS - 3, -78], [AXIS + 3, -78], [AXIS - 3, -69.5], [AXIS + 3, -69.5]] as Pt[],
};

/* ---------- The country club ---------- */

export interface Hole {
  n: number;
  par: 3 | 4;
  tee: Pt;
  green: Pt;
}
/** Six holes up the strip west of Canyon Drive and back down (kept off the mansions' pads and every road) */
export const HOLES: Hole[] = [
  { n: 1, par: 4, tee: [300, -92], green: [300, -136] },
  { n: 2, par: 4, tee: [300, -144], green: [300.5, -192] },
  { n: 3, par: 4, tee: [300.5, -200], green: [302, -246] },
  { n: 4, par: 4, tee: [314, -248], green: [313, -202] },
  { n: 5, par: 3, tee: [313, -194], green: [310.5, -158] },
  { n: 6, par: 4, tee: [309.5, -150], green: [310, -100] },
];
/** A fairway's half width, a green's radius, its fringe, a bunker's, a tee box's half size */
export const FAIRWAY = 3.4;
export const GREEN_R = 2.6;
export const FRINGE = 3.3;
export const BUNKER_R = 1.3;
export const TEE = { half: [1.6, 1.1] as Pt };
/** Each green's bunkers: either side of it, a little short */
export function bunkersOf(h: Hole): Pt[] {
  const [dx, dz] = [h.green[0] - h.tee[0], h.green[1] - h.tee[1]];
  const L = Math.hypot(dx, dz);
  const [ux, uz] = [dx / L, dz / L];
  return [-1, 1].map((s): Pt => [h.green[0] - ux * 1.4 + -uz * s * (FRINGE + 1.4), h.green[1] - uz * 1.4 + ux * s * (FRINGE + 1.4)]);
}
/** The flag on each green, a little off its middle */
export const flagOf = (h: Hole): Pt => [h.green[0] + 0.7, h.green[1] - 0.4];
export const CLUB = {
  name: 'Crestmont Hills Club',
  pad: [292, -86, 320, -66] as Rect,
  y: 0,
  house: [298, -82, 314, -73] as Rect,
  floors: 2,
  storey: { ground: 2.4, upper: 2 },
  /** The terrace in front, the carts parked by the cart shed */
  terrace: [298, -73, 314, -70] as Rect,
  shed: [315.5, -82, 319, -76] as Rect,
  carts: [[316.2, -74.5], [317.6, -74.5], [319, -74.5]] as Pt[],
};

/* ---------- The overlook ---------- */

/** High on the ridge beside a hill road, like a mansion's pad: its ease clear of every road and pad, at the road's height
 * give or take a little, never a quarry; of the spots that fit, the highest with the ground falling furthest away past
 * it (the view; today on Vista Lane, the ridge's spur) */
export const OVERLOOK = (() => {
  let best: { rect: Rect; y: number; u: Pt; path: [Pt, Pt]; drop: number; half: number; road: string } | null = null;
  for (const ridge of HILL_ROADS)
  for (let d = 10; d < ridge.cum[ridge.cum.length - 1] - 4; d += 4)
    for (const side of [1, -1])
      for (const half of [5.5, 4.5, 3.5]) {
        let i = 1;
        while (i < ridge.cum.length - 1 && ridge.cum[i] < d) i++;
        const [a, b] = [ridge.pts[i - 1], ridge.pts[i]];
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const u: Pt = [(-(b[1] - a[1]) / l) * side, ((b[0] - a[0]) / l) * side];
        const gap = ridge.half + BED.shoulder + 0.4 + EASE + 0.6;
        const c: Pt = [a[0] + u[0] * (gap + half), a[1] + u[1] * (gap + half)];
        const rect: Rect = [c[0] - half, c[1] - half, c[0] + half, c[1] + half];
        let clear = true;
        for (let x = rect[0] - EASE - 0.3; x <= rect[2] + EASE + 0.3 && clear; x += 1) for (let z = rect[1] - EASE - 0.3; z <= rect[3] + EASE + 0.3 && clear; z += 1) if (nearHillRoad(x, z, BED.shoulder + 0.4)) clear = false;
        if (!clear || MANSIONS.some((m) => !(m.rect[2] + 2 * EASE + 1 < rect[0] || rect[2] + 2 * EASE + 1 < m.rect[0] || m.rect[3] + 2 * EASE + 1 < rect[1] || rect[3] + 2 * EASE + 1 < m.rect[1]))) continue;
        const yRoad = roadY(ridge, d);
        const corners = [natural(rect[0], rect[1]), natural(rect[2], rect[1]), natural(rect[0], rect[3]), natural(rect[2], rect[3])];
        const mid = (Math.min(...corners) + Math.max(...corners)) / 2;
        const y = yRoad + Math.max(-2, Math.min(2, mid - yRoad));
        const e = EASE / 2;
        const ring = [rect[0] - e, c[0], rect[2] + e].flatMap((x) => [rect[1] - e, c[1], rect[3] + e].map((z) => natural(x, z) - y));
        if (corners.some((v) => Math.abs(v - y) > CUT) || ring.some((v) => Math.abs(v) > CUT + 0.5)) continue;
        // (the ground's fall past it, out the way it faces, and towards the city to the west)
        const drop = y + y - natural(c[0] + u[0] * (half + 16), c[1] + u[1] * (half + 16)) + half;
        if (!best || drop > best.drop) best = { rect, y, u, path: [[a[0] + u[0] * (ridge.half + 0.3), a[1] + u[1] * (ridge.half + 0.3)], [a[0] + u[0] * gap, a[1] + u[1] * gap]], drop, half, road: ridge.id };
      }
  if (!best) throw new Error('no room for the overlook on the ridge');
  const { rect, y, u, path, half, road } = best;
  const c: Pt = [(rect[0] + rect[2]) / 2, (rect[1] + rect[3]) / 2];
  return {
    road,
    rect,
    y,
    /** The path from the road to it */
    path,
    /** Out from it, the way it looks */
    look: u,
    benches: [-1, 1].map((s): Pt => [c[0] + u[0] * 1.5 + -u[1] * s * 2.4, c[1] + u[1] * 1.5 + u[0] * s * 2.4]),
    viewers: [-1, 0, 1].map((s): Pt => [c[0] + u[0] * (half - 1.1) + -u[1] * s * 2.8, c[1] + u[1] * (half - 1.1) + u[0] * s * 2.8]),
  };
})();

/* ---------- The reservoir ---------- */

/** The basin (x0, z0, x1, z1) held at `floor`, the water at `y` over it */
export const RESERVOIR = (() => {
  const rect: Rect = [408, -284, 428, -268];
  const y = 16.4;
  const floor = y - 1.5;
  // A dam on each side where the hills just past it fall below the water (west, north, east, south)
  const sideLow = (pts: Pt[]) => Math.min(...pts.map(([x, z]) => natural(x, z))) < y + 0.3;
  const along = (a: Pt, b: Pt): Pt[] => Array.from({ length: 11 }, (_, k): Pt => [a[0] + ((b[0] - a[0]) * k) / 10, a[1] + ((b[1] - a[1]) * k) / 10]);
  const e = EASE;
  const dams = {
    w: sideLow(along([rect[0] - e, rect[1]], [rect[0] - e, rect[3]])),
    n: sideLow(along([rect[0], rect[1] - e], [rect[2], rect[1] - e])),
    e: sideLow(along([rect[2] + e, rect[1]], [rect[2] + e, rect[3]])),
    s: sideLow(along([rect[0], rect[3] + e], [rect[2], rect[3] + e])),
  };
  // The water: out over the banks where the hills rise past it (its edge under the ground there), to the dams' faces
  const water: Rect = [rect[0] - (dams.w ? 0 : e), rect[1] - (dams.n ? 0 : e), rect[2] + (dams.e ? 0 : e), rect[3] + (dams.s ? 0 : e)];
  return { rect, y, floor, dams, water, dam: 1.4, tower: { x: rect[0] + 6, z: rect[1] + 6, r: 1, h: 3 } };
})();
/** The fence round it: just outside the water (on a dam, along its crest's outer side) */
export const FENCE: Rect = (() => {
  const { water, dams, dam } = RESERVOIR;
  return [water[0] - (dams.w ? dam : 0.6), water[1] - (dams.n ? dam : 0.6), water[2] + (dams.e ? dam : 0.6), water[3] + (dams.s ? dam : 0.6)];
})();

/* ---------- The ground held level, what's solid, where the planting keeps off ---------- */

export const SITE_LEVELS = [
  { rect: CIVIC.pad, y: CIVIC.y, ease: EASE },
  { rect: CLUB.pad, y: CLUB.y, ease: EASE },
  { rect: OVERLOOK.rect, y: OVERLOOK.y, ease: EASE },
  { rect: RESERVOIR.rect, y: RESERVOIR.floor, ease: EASE },
];

const box = (r: Rect, top: number): Box => [r[0], r[1], r[2], r[3], top];
const sq = ([x, z]: Pt, h: number, top: number): Box => [x - h, z - h, x + h, z + h, top];
const hotelTop = HOTEL.storey.ground + (HOTEL.towerFloors - 1) * HOTEL.storey.upper + 0.8;
export const SITE_SOLIDS: Box[] = [
  // The hotel and its tower, the porte-cochère's posts, the island's fountain, the cabanas
  box(HOTEL.body, SLAB_Y + HOTEL.storey.ground + (HOTEL.floors - 1) * HOTEL.storey.upper + 0.4),
  box(HOTEL.tower, SLAB_Y + hotelTop),
  ...[HOTEL.porte[1] + 0.3, HOTEL.porte[3] - 0.3].map((z) => sq([HOTEL.porte[0] + 0.3, z], 0.18, SLAB_Y + 2.6)),
  sq([HOTEL.island.x, HOTEL.island.z], 0.7, SLAB_Y + 1.2),
  ...HOTEL.cabanas.map((c) => sq(c, 1.2, SLAB_Y + 2.4)),
  // The civic hall, its tower and dome, the fountains
  box(CIVIC.hall, CIVIC.y + CIVIC.storey.ground + CIVIC.storey.upper + 0.5),
  box(CIVIC.tower, CIVIC.y + CIVIC.towerTop + CIVIC.dome),
  ...CIVIC.fountains.map((f) => sq(f, CIVIC.fountainR * 0.8, CIVIC.y + 1.2)),
  // The clubhouse, its shed, the carts
  box(CLUB.house, CLUB.y + CLUB.storey.ground + CLUB.storey.upper + 1.3),
  box(CLUB.shed, CLUB.y + 2.4),
  ...CLUB.carts.map((c) => [c[0] - 0.5, c[1] - 0.9, c[0] + 0.5, c[1] + 0.9, CLUB.y + 1.5] as Box),
  // The overlook's viewers and benches
  ...OVERLOOK.viewers.map((v) => sq(v, 0.2, OVERLOOK.y + 1.3)),
  // The reservoir's fence (a run a side), its tower
  ...(() => {
    const [a, b, c, d] = FENCE;
    const t = 0.1;
    const top = RESERVOIR.y + 1.6;
    return [box([a, b, c, b + t], top), box([a, d - t, c, d], top), box([a, b, a + t, d], top), box([c - t, b, c, d], top)];
  })(),
  sq([RESERVOIR.tower.x, RESERVOIR.tower.z], RESERVOIR.tower.r, RESERVOIR.y + RESERVOIR.tower.h),
];
/** In the hotel's drive off the boulevard (the street's palms keep off) */
export const inHotelDrive = (x: number, z: number, m = 0) => x > HOTEL.drive[0] - m && x < HOTEL.drive[2] + m && z > HOTEL.drive[1] - m && z < HOTEL.drive[3] + m;
/** On a site's ground (with its ease, padded `m`), a fairway, a green or the overlook's path: the planting keeps off */
export function onSite(x: number, z: number, m = 0) {
  for (const l of SITE_LEVELS) {
    const e = l.ease + m;
    if (x > l.rect[0] - e && x < l.rect[2] + e && z > l.rect[1] - e && z < l.rect[3] + e) return true;
  }
  const near = ([ax, az]: Pt, [bx, bz]: Pt, r: number) => {
    const [vx, vz] = [bx - ax, bz - az];
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1)));
    return Math.hypot(x - ax - vx * t, z - az - vz * t) < r + m;
  };
  if (HOLES.some((h) => near(h.tee, h.green, FAIRWAY + 1.5) || near(h.green, h.green, FRINGE + 3))) return true;
  if (near(OVERLOOK.path[0], OVERLOOK.path[1], 1.6)) return true;
  const [fx0, fz0, fx1, fz1] = FENCE;
  return x > fx0 - 1 - m && x < fx1 + 1 + m && z > fz0 - 1 - m && z < fz1 + 1 + m;
}
/** The most a site is cut into the hills or built up at its corners (the mansions' rule, the tests check) */
export const SITE_CUT = CUT + 0.5;
