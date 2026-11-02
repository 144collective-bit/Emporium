/*
 * The Neon Mile's resorts (docs/strip-plan.md Phase 2; the owner's calls: seven themed resorts, a mix of themed,
 * glass and old-school neon, towers over the Emporium (the Strip's only), every flight clear; scenery first, places
 * that say coming soon, no betting). DOM-free: the boot reads their solids, doors, spawns and spots; the drawing is
 * resorts3d.ts in the Strip's chunk. Every name is made up.
 *
 * Each resort stands on its own stretch of a row (strip.ts `ROWS`), facing the boulevard: the north row's south
 * (+z), the south row's north. Its numbers are written in its own frame (`u` along the boulevard from its west end,
 * `v` back from the row's boulevard edge) and turned into world numbers here (`frame()`), so a resort is the same
 * whichever row it's on.
 *
 * - **The parts** (`Part`): boxes, drums, upright prisms (`poly`), pyramids, cones and saucers, each from `y0` to
 *   `y1` over the slab in its `skin` (a dome: Orbit's glass top); `solid: false` for what's over something else (crowns, cones, the saucer).
 * - **Out front:** the sign pylon by the boulevard (`pylon`: its LED screen from `screen[0]` to `screen[1]`, the name
 *   in neon over it), the porte-cochère over the drop-off (`porte`) with a car under it (`cars`), the door (`door`,
 *   a walk prompt that opens the panel) and the spot you walk in at, facing it (`spawn`); water at the ground
 *   (`water`: the lake, the lagoon, the canal, the moat, a pool), each held in by a low rim (`RIM`).
 * - **The theme** (`WILD_ACE`, `SCARAB`, `COASTER`, `GONDOLIER`, `LAGOON`, `ORBIT`): what only one resort has.
 * - **The Sphere's lot** (`SPHERE_LOT`): the giant LED sphere's, Phase 3; hoardings round it for now.
 * - `RESORT_SOLIDS` (in `SOLIDS`), `RESORT_TALLEST`.
 */
import { ROWS, type Rect } from './strip';
import type { CarId } from './carspec';

type Pt = [number, number];
type Box = [number, number, number, number, number];

/** The lots' top (world.ts SLAB) */
export const SLAB_Y = 0.15;
/** A rim round water at the ground: high enough to stop a walker, low enough to see over */
export const RIM = 0.55;

export type ResortId = 'wildace' | 'dragonspire' | 'scarab' | 'bigcity' | 'gondolier' | 'lagoon' | 'orbit';
export type Skin = 'gold' | 'blue' | 'dark' | 'bronze' | 'silver' | 'cream' | 'ochre' | 'castle' | 'brick' | 'white' | 'red' | 'teal';
export type Shape = 'box' | 'drum' | 'poly' | 'pyramid' | 'cone' | 'saucer' | 'dome';

export interface Part {
  shape: Shape;
  /** Its footprint (a drum, cone or saucer: the box round it) */
  rect: Rect;
  /** An upright prism's outline, counter-clockwise from above */
  poly?: Pt[];
  y0: number;
  y1: number;
  skin: Skin;
  /** Over something else, or too slight to bump: left out of the solids */
  solid?: false;
  /** Floors of lit windows (a hotel's), or a plain face (a casino's walls, stone) */
  windows?: boolean;
}

export interface Resort {
  id: ResortId;
  name: string;
  row: 'north' | 'south';
  /** Its stretch of the row (x) */
  x0: number;
  x1: number;
  /** Towards the boulevard (z): +1 for the north row, -1 for the south */
  face: 1 | -1;
  /** Its land (world), from the row's boulevard edge to its back edge */
  land: Rect;
  parts: Part[];
  /** The sign pylon: its footprint, its top, its LED screen's height (over the slab) */
  pylon: { rect: Rect; h: number; screen: [number, number]; row: number };
  /** The porte-cochère's canopy over the drop-off, at y */
  porte: { rect: Rect; y: number };
  door: { x: number; z: number };
  spawn: { x: number; z: number; yaw: number };
  water: Rect[];
  /** The pool deck on the podium's roof */
  pool?: { rect: Rect; y: number };
  cars: [CarId, number, number, number, string][];
  /** Its highest point over the slab (masts, spires, the pylon) */
  top: number;
  /** Its neon colours: the trims, the name */
  neon: [string, string];
}

const NORTH_FRONT = ROWS.north[1];
const SOUTH_FRONT = ROWS.south[0];
const DEPTH = ROWS.north[1] - ROWS.north[0];

/** A resort's frame: u along the boulevard from x0, v back from the row's boulevard edge */
function frame(row: 'north' | 'south', x0: number) {
  const zOf = (v: number) => (row === 'north' ? NORTH_FRONT - v : SOUTH_FRONT + v);
  const p = (u: number, v: number): Pt => [x0 + u, zOf(v)];
  const r = (u0: number, v0: number, u1: number, v1: number): Rect => {
    const [za, zb] = [zOf(v0), zOf(v1)];
    return [x0 + Math.min(u0, u1), Math.min(za, zb), x0 + Math.max(u0, u1), Math.max(za, zb)];
  };
  /** The yaw that faces back into the lot (towards the door), the forward being (-sin yaw, -cos yaw) */
  const back = row === 'north' ? 0 : Math.PI;
  return { p, r, back, face: (row === 'north' ? 1 : -1) as 1 | -1 };
}

const box = (rect: Rect, y0: number, y1: number, skin: Skin, more: Partial<Part> = {}): Part => ({ shape: 'box', rect, y0, y1, skin, ...more });
const drum = (cx: number, cz: number, rad: number, y0: number, y1: number, skin: Skin, more: Partial<Part> = {}): Part => ({ shape: 'drum', rect: [cx - rad, cz - rad, cx + rad, cz + rad], y0, y1, skin, ...more });
const cone = (cx: number, cz: number, rad: number, y0: number, y1: number, skin: Skin): Part => ({ shape: 'cone', rect: [cx - rad, cz - rad, cx + rad, cz + rad], y0, y1, skin, solid: false });

/* ---------- The north row, west to east ---------- */

const N = (x0: number) => frame('north', x0);
const S = (x0: number) => frame('south', x0);

/** Wild Ace: the old-school neon casino by the welcome sign, the smallest, under the Emporium */
const wildAce = (() => {
  const f = N(128);
  const casino = f.r(2, 7, 20, 20);
  return {
    id: 'wildace' as const,
    name: 'Wild Ace',
    row: 'north' as const,
    x0: 128,
    x1: 150,
    face: f.face,
    land: f.r(0, 0, 22, DEPTH),
    parts: [box(casino, 0, 4.5, 'red'), box(f.r(5, 9, 17, 18), 4.5, 5.6, 'white', { solid: false })],
    pylon: { rect: f.r(0.6, 1.4, 3.4, 2.4), h: 11.5, screen: [3.2, 7.2] as [number, number], row: 0 },
    porte: { rect: f.r(10, 2.6, 17.5, 6.3), y: 3 },
    door: { x: f.p(11.5, 7)[0], z: f.p(11.5, 6.65)[1] },
    spawn: { x: f.p(11.5, 4.4)[0], z: f.p(11.5, 4.4)[1], yaw: f.back },
    water: [],
    cars: [['classic', ...f.p(14.6, 4.6), 0, '#d8263c']] as [CarId, number, number, number, string][],
    top: 11.5,
    neon: ['#ff3a6e', '#ffd23a'] as [string, string],
  };
})();
/** Its theme: the neon star on the roof, the cowboy over the door (a flat neon cut-out, his arm waving), the marquee of chasing bulbs */
export const WILD_ACE = (() => {
  const f = N(128);
  return {
    star: { at: f.p(15.5, 11), y: 5.6 + 3.1, r: 2.6 },
    cowboy: { at: f.p(6.5, 7.6), y: 4.5, h: 5.8 },
    marquee: { rect: f.r(4, 6.4, 18, 7), y0: 2.8, y1: 4.2 },
  };
})();

/** Dragonspire: a castle, its gatehouse and drawbridge over the moat, bright turrets, the hotel tower behind */
const dragonspire = (() => {
  const f = N(152);
  const turret = (u: number, v: number, rad: number, h: number, roof: number, skin: Skin): Part[] => {
    const [x, z] = f.p(u, v);
    return [drum(x, z, rad, 0, h, 'castle'), cone(x, z, rad + 0.35, h, roof, skin)];
  };
  const tower = f.r(7, 14, 25, 21.6);
  const topTurret = (u: number, v: number, roof: number, skin: Skin): Part[] => {
    const [x, z] = f.p(u, v);
    return [drum(x, z, 1.25, 24, 26.4, 'castle', { solid: false }), cone(x, z, 1.6, 26.4, roof, skin)];
  };
  const [cx, cz] = f.p(16, 17.8);
  return {
    id: 'dragonspire' as const,
    name: 'Dragonspire',
    row: 'north' as const,
    x0: 152,
    x1: 184,
    face: f.face,
    land: f.r(0, 0, 32, DEPTH),
    parts: [
      box(f.r(2, 8, 30, 14.2), 0, 6, 'castle'),
      box(f.r(12.6, 6.6, 19.4, 14), 0, 8.4, 'castle'),
      ...turret(3.2, 8.6, 2, 9, 13.4, 'blue'),
      ...turret(28.8, 8.6, 2, 9, 13.4, 'red'),
      ...turret(9, 8.2, 1.5, 7.6, 11.2, 'gold'),
      ...turret(23, 8.2, 1.5, 7.6, 11.2, 'blue'),
      ...turret(12.6, 7.8, 1.2, 9.6, 12.6, 'red'),
      ...turret(19.4, 7.8, 1.2, 9.6, 12.6, 'red'),
      box(tower, 0, 24, 'cream', { windows: true }),
      ...topTurret(7.6, 14.6, 29.2, 'blue'),
      ...topTurret(24.4, 14.6, 29.2, 'gold'),
      ...topTurret(7.6, 21, 28.4, 'red'),
      ...topTurret(24.4, 21, 28.4, 'blue'),
      drum(cx, cz, 1.7, 24, 27.6, 'castle', { solid: false }),
      cone(cx, cz, 2.1, 27.6, 32.4, 'gold'),
    ],
    pylon: { rect: f.r(0.6, 1.4, 3.4, 2.4), h: 15, screen: [4.4, 10] as [number, number], row: 1 },
    porte: { rect: f.r(22, 1.6, 29.5, 4.8), y: 3 },
    door: { x: f.p(16, 6.6)[0], z: f.p(16, 6.25)[1] },
    spawn: { x: f.p(16, 3.4)[0], z: f.p(16, 3.4)[1], yaw: f.back },
    // The moat across the front, but for the drawbridge
    water: [f.r(2, 5, 14.6, 6.4), f.r(17.4, 5, 30, 6.4)],
    pool: { rect: f.r(4, 9.5, 11, 13.2), y: 6 },
    cars: [['exec', ...f.p(25.7, 3.2), 0, '#16141f']] as [CarId, number, number, number, string][],
    top: 32.4,
    neon: ['#2ef2ff', '#ff3fd2'] as [string, string],
  };
})();
/** Its drawbridge over the moat into the gatehouse */
export const DRAWBRIDGE = (() => {
  const f = N(152);
  return { rect: f.r(14.6, 4.8, 17.4, 6.6), y: 0.22 };
})();

/** The Golden Scarab: a dark glass pyramid with its light beam, two stepped towers, the sphinx at the gate, an obelisk for its sign */
const scarab = (() => {
  const f = N(186);
  const zig = (u0: number, u1: number): Part[] => [
    box(f.r(u0, 9, u1, 21.6), 0, 12, 'dark', { windows: true }),
    box(f.r(u0 + 0.8, 9.8, u1 - 0.8, 20.8), 12, 17, 'dark', { windows: true }),
    box(f.r(u0 + 1.6, 10.6, u1 - 1.6, 20), 17, 21, 'dark', { windows: true }),
  ];
  return {
    id: 'scarab' as const,
    name: 'The Golden Scarab',
    row: 'north' as const,
    x0: 186,
    x1: 218,
    face: f.face,
    land: f.r(0, 0, 32, DEPTH),
    parts: [{ shape: 'pyramid' as const, rect: f.r(8, 6, 24, 22), y0: 0, y1: 15, skin: 'dark' as const }, ...zig(1, 7), ...zig(25, 31)],
    // (the obelisk is the sign: SCARAB.obelisk)
    pylon: { rect: f.r(28.4, 1.2, 30.4, 3.2), h: 16, screen: [4.6, 8.6] as [number, number], row: 2 },
    porte: { rect: f.r(12, 2, 20, 4.9), y: 3 },
    door: { x: f.p(16, 6)[0], z: f.p(16, 5.25)[1] },
    spawn: { x: f.p(16, 3.4)[0], z: f.p(16, 3.4)[1], yaw: f.back },
    water: [],
    cars: [['exec', ...f.p(18.6, 3.4), 0, '#c9a23a']] as [CarId, number, number, number, string][],
    top: 21,
    neon: ['#ffd23a', '#2ef2ff'] as [string, string],
  };
})();
export const SCARAB = (() => {
  const f = N(186);
  return {
    /** The pyramid's tip, where the beam starts */
    apex: [...f.p(16, 14), SLAB_Y + 15] as [number, number, number],
    sphinx: { rect: f.r(2.6, 1.2, 7.6, 5.4), h: 3.4 },
    obelisk: { at: f.p(29.4, 2.2), base: 1.9, h: 16 },
    /** The pyramid's portal at its foot (the door) */
    portal: { rect: f.r(14.4, 5.6, 17.6, 6.4), h: 3.2 },
  };
})();

/** Big City: a cluster of little skyscrapers of a made-up big city, a rollercoaster round them, a bridge over its pool */
const bigCity = (() => {
  const f = N(220);
  return {
    id: 'bigcity' as const,
    name: 'Big City',
    row: 'north' as const,
    x0: 220,
    x1: 249,
    face: f.face,
    land: f.r(0, 0, 29.1, DEPTH),
    parts: [
      box(f.r(1, 7, 28, 14), 0, 5, 'brick'),
      // The towers, west to east: deco, the tall one with its setbacks, silver, brick, gold
      box(f.r(2.4, 12.2, 6.8, 19.4), 0, 17, 'silver', { windows: true }),
      box(f.r(8, 10.6, 13, 18), 0, 21, 'blue', { windows: true }),
      box(f.r(8.7, 11.3, 12.3, 17.3), 21, 25, 'blue', { windows: true, solid: false }),
      box(f.r(9.4, 12, 11.6, 16.6), 25, 27.5, 'silver', { solid: false }),
      box(f.r(14, 13, 18.6, 21), 0, 22, 'silver', { windows: true }),
      box(f.r(19.4, 10, 23.2, 16.4), 0, 14.6, 'brick', { windows: true }),
      box(f.r(23.8, 12.4, 27, 20.6), 0, 19.5, 'gold', { windows: true }),
    ],
    pylon: { rect: f.r(25.8, 1.2, 28.6, 2.2), h: 16, screen: [4.8, 10.6] as [number, number], row: 3 },
    porte: { rect: f.r(16.6, 2, 24, 5.2), y: 3 },
    door: { x: f.p(20.3, 7)[0], z: f.p(20.3, 6.65)[1] },
    spawn: { x: f.p(19.4, 3.6)[0], z: f.p(19.4, 3.6)[1], yaw: f.back },
    water: [f.r(1.6, 1.4, 14, 5.6)],
    pool: { rect: f.r(19.8, 8, 26.6, 12.6), y: 5 },
    cars: [['super', ...f.p(22.6, 3.6), 0, '#f2f2f2']] as [CarId, number, number, number, string][],
    top: 30.5,
    neon: ['#ff8a1e', '#2ef2ff'] as [string, string],
  };
})();
export const BIG_CITY = (() => {
  const f = N(220);
  return {
    /** The tall tower's spire, the deco tower's crown, the silver tower's pointed crown (tips over the slab) */
    spire: { at: f.p(10.5, 14.3), y0: 27.5, y1: 30.5 },
    crowns: [
      { rect: f.r(2.4, 12.2, 6.8, 19.4), y: 17, h: 2.4 },
      { rect: f.r(14, 13, 18.6, 21), y: 22, h: 3.6 },
    ],
    /** The bridge over the pool: its towers' feet (u), the deck along v */
    bridge: { a: f.p(3, 3.5), b: f.p(12.6, 3.5), deck: 0.9, towers: 3.2 },
  };
})();
/**
 * Big City's rollercoaster: a closed track round the cluster (world x, y over the slab, z), round its west side, along
 * the back, down the east side and back along the front over the podium with a loop the loop; the drawing runs a
 * curve through it (`COASTER_SAMPLES`). Clear of the towers (the test), inside its land.
 */
export const COASTER: [number, number, number][] = (() => {
  const f = N(220);
  const pts: [number, number, number][] = [
    // (u, y, v)
    [24, 7.5, 7.6],
    [27.8, 8.2, 8.6],
    [28.5, 11, 13],
    [28.4, 15.5, 18],
    [27.4, 17.4, 22.1],
    [22, 13.6, 22.2],
    [16, 18.6, 22.2],
    [10, 12.4, 22.2],
    [4.5, 15.2, 22.1],
    [0.9, 12, 19],
    [0.8, 8.4, 13],
    [1.4, 7.4, 8.4],
    [5, 7.2, 7.4],
    [9.5, 7.6, 7.6],
    [12.6, 8.4, 7.8],
    [14.4, 10.6, 7.6],
    [13.6, 12.8, 7.4],
    [11.9, 11.2, 7.2],
    [12.6, 8.8, 7.0],
    [15.6, 7.7, 7.0],
    [19.5, 7.5, 7.3],
  ];
  return pts.map(([u, y, v]) => [...f.p(u, v), y] as [number, number, number]).map(([x, z, y]) => [x, y, z]);
})();

/** A point on the rollercoaster's track, `t` from 0 to 1 round it (a Catmull-Rom curve through `COASTER`, closed) */
export function coasterAt(t: number): [number, number, number] {
  const n = COASTER.length;
  const f = (((t % 1) + 1) % 1) * n;
  const i = Math.floor(f);
  const u = f - i;
  const P = (k: number) => COASTER[(i + k + n) % n];
  const [p0, p1, p2, p3] = [P(-1), P(0), P(1), P(2)];
  const c = (a: number, b: number, cc: number, d: number) => 0.5 * (2 * b + (-a + cc) * u + (2 * a - 5 * b + 4 * cc - d) * u * u + (-a + 3 * b - 3 * cc + d) * u * u * u);
  return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1]), c(p0[2], p1[2], p2[2], p3[2])];
}
/** How many points the drawing and the tests take round the track */
export const COASTER_SAMPLES = 420;

/* ---------- The south row ---------- */

/** The Gondolier: an old-world palace on its canal, the bell tower, the hotel behind; the fountain show's lake in front (Phase 3's jets) */
const gondolier = (() => {
  const f = S(128);
  return {
    id: 'gondolier' as const,
    name: 'The Gondolier',
    row: 'south' as const,
    x0: 128,
    x1: 162,
    face: f.face,
    land: f.r(0, 0, 34, DEPTH),
    parts: [
      box(f.r(2, 8.8, 31, 15.8), 0, 7, 'ochre'),
      box(f.r(12, 15.4, 22, 22), 0, 27, 'cream', { windows: true }),
      box(f.r(5, 15.8, 12, 21.6), 0, 23, 'cream', { windows: true }),
      box(f.r(22, 15.8, 29, 21.6), 0, 23, 'cream', { windows: true }),
      // The bell tower by the lake's east end
      box(f.r(30.8, 6.2, 33.4, 8.8), 0, 19, 'brick'),
      box(f.r(31, 6.4, 33.2, 8.6), 19, 20.6, 'white', { solid: false }),
      { shape: 'pyramid' as const, rect: f.r(31, 6.4, 33.2, 8.6), y0: 20.6, y1: 23.6, skin: 'teal' as const, solid: false as const },
    ],
    pylon: { rect: f.r(0.6, 1.4, 2.6, 2.4), h: 15, screen: [4.4, 10] as [number, number], row: 4 },
    porte: { rect: f.r(27, 1.4, 33.6, 5), y: 3 },
    door: { x: f.p(17, 8.8)[0], z: f.p(17, 8.45)[1] },
    spawn: { x: f.p(17, 5.9)[0], z: f.p(17, 5.9)[1], yaw: f.back },
    // The lake (the fountain show's, Phase 3) and the canal along the palace's front, a bridge over it to the door
    water: [f.r(3, 0.9, 26, 5), f.r(2, 6.9, 15.8, 8.6), f.r(18.2, 6.9, 30.6, 8.6)],
    pool: { rect: f.r(4, 10, 11, 14.6), y: 7 },
    cars: [['exec', ...f.p(30.3, 3.2), 0, '#16141f']] as [CarId, number, number, number, string][],
    top: 27,
    neon: ['#ffd23a', '#ff3fd2'] as [string, string],
  };
})();
export const GONDOLIER = (() => {
  const f = S(128);
  return {
    /** The bridge over the canal to the door */
    bridge: { rect: f.r(15.8, 6.7, 18.2, 8.8), rise: 0.5 },
    /** The arcade along the palace's front (its arches' bays), the lake's rim, the gondolas at the steps */
    arcade: { a: f.p(2, 8.8), b: f.p(31, 8.8), bays: 14, h: 3.6 },
    gondolas: [f.p(6, 7.75), f.p(11.5, 7.75), f.p(22, 7.75), f.p(27, 7.75)],
  };
})();

/** Lava Lagoon: a curved gold tower behind palms, the lagoon out front (its volcano Phase 3's) */
const lagoon = (() => {
  const f = S(164);
  // The tower: a crescent, its middle the furthest back, its ends coming forward round the lagoon; in segments
  const [cu, cv] = [16, -2];
  const seg = 8;
  const [r0, r1] = [18, 20.8];
  const a0 = Math.asin(9 / r1);
  const parts: Part[] = [box(f.r(1, 10, 31, 22.2), 0, 5, 'bronze')];
  for (let k = 0; k < seg; k++) {
    const [ta, tb] = [-a0 + (2 * a0 * k) / seg, -a0 + (2 * a0 * (k + 1)) / seg];
    const at = (r: number, t: number) => f.p(cu + Math.sin(t) * r, cv + Math.cos(t) * r);
    const q = [at(r0, ta), at(r1, ta), at(r1, tb), at(r0, tb)];
    // (counter-clockwise from above: x across, z down; wound by its area's sign)
    const area = q.reduce((s, p, i) => s + (p[0] * q[(i + 1) % 4][1] - q[(i + 1) % 4][0] * p[1]), 0);
    const poly = area < 0 ? q.reverse() : q;
    const xs = poly.map((p) => p[0]);
    const zs = poly.map((p) => p[1]);
    // (the middle rises highest, the wings step down)
    const mid = Math.abs(k + 0.5 - seg / 2) / (seg / 2);
    parts.push({ shape: 'poly', poly, rect: [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)], y0: 0, y1: 28 - Math.round(mid * 3) * 1.5, skin: 'gold', windows: true });
  }
  return {
    id: 'lagoon' as const,
    name: 'Lava Lagoon',
    row: 'south' as const,
    x0: 164,
    x1: 196,
    face: f.face,
    land: f.r(0, 0, 32, DEPTH),
    parts,
    pylon: { rect: f.r(0.6, 1.4, 3.4, 2.4), h: 15.5, screen: [4.6, 10.4] as [number, number], row: 5 },
    porte: { rect: f.r(23.6, 2, 30.6, 5.4), y: 3 },
    door: { x: f.p(27, 10)[0], z: f.p(27, 9.65)[1] },
    spawn: { x: f.p(27, 7)[0], z: f.p(27, 7)[1], yaw: f.back },
    water: [f.r(2, 1, 22, 8.6)],
    pool: { rect: f.r(3, 18, 10, 21.4), y: 5 },
    cars: [['exec', ...f.p(28.6, 3.7), 0, '#efe6d0']] as [CarId, number, number, number, string][],
    top: 28,
    neon: ['#ff6a2a', '#ffd23a'] as [string, string],
  };
})();
export const LAGOON = (() => {
  const f = S(164);
  return {
    /** The islet in the lagoon where the volcano will stand (Phase 3) */
    islet: { at: f.p(12, 4.8), r: 2.2, h: 1.1 },
    /** Palms round the lagoon */
    palms: [f.p(2.4, 0.5), f.p(6.5, 9.2), f.p(11, 9.2), f.p(15.5, 9.2), f.p(20, 9.2), f.p(22.6, 0.5), f.p(22.8, 4.6), f.p(1.4, 4.8)],
  };
})();

/** Orbit: the space-age tower, the tallest on the Strip, its saucer deck ringed in neon */
const orbit = (() => {
  const f = S(198);
  const [x, z] = f.p(13, 15);
  const pod = f.r(2, 8, 24, 21.6);
  return {
    id: 'orbit' as const,
    name: 'Orbit',
    row: 'south' as const,
    x0: 198,
    x1: 224,
    face: f.face,
    land: f.r(0, 0, 26, DEPTH),
    parts: [
      box(pod, 0, 5, 'white'),
      drum(x, z, 3.3, 0, 33, 'silver', { windows: true }),
      { shape: 'saucer' as const, rect: [x - 7.4, z - 7.4, x + 7.4, z + 7.4] as Rect, y0: 33, y1: 36.6, skin: 'silver' as const, solid: false as const },
      { shape: 'dome' as const, rect: [x - 3, z - 3, x + 3, z + 3] as Rect, y0: 36.6, y1: 38.6, skin: 'teal' as const, solid: false as const },
    ],
    pylon: { rect: f.r(0.6, 1.4, 3.2, 2.4), h: 18, screen: [5, 11.4] as [number, number], row: 6 },
    porte: { rect: f.r(9, 2, 17, 5.4), y: 3.2 },
    door: { x: f.p(13, 8)[0], z: f.p(13, 7.65)[1] },
    spawn: { x: f.p(13, 4.6)[0], z: f.p(13, 4.6)[1], yaw: f.back },
    water: [],
    pool: { rect: f.r(3.5, 9.5, 8.5, 20), y: 5 },
    cars: [['ev', ...f.p(15.6, 3.7), 0, '#e8f4ff']] as [CarId, number, number, number, string][],
    top: 44,
    neon: ['#2ef2ff', '#a15bff'] as [string, string],
  };
})();
export const ORBIT = (() => {
  const f = S(198);
  const [x, z] = f.p(13, 15);
  return { at: [x, z] as Pt, shaft: 3.3, saucer: { y0: 33, y1: 36.6, r: 7.4 }, mast: { y0: 38.6, y1: 44 }, fins: 3 };
})();

/** Every resort, west to east along each row */
export const RESORTS: Resort[] = [wildAce, dragonspire, scarab, bigCity, gondolier, lagoon, orbit];
export const resortOf = (id: string) => RESORTS.find((r) => r.id === id);
export const RESORT_IDS = RESORTS.map((r) => r.id);

/** The Sphere's lot (Phase 3), east end of the south row: hoardings round it for now */
export const SPHERE_LOT: Rect = S(226).r(0.8, 0.8, 22.4, DEPTH - 0.8);
export const HOARDING = { h: 2.6, t: 0.2 };

/** The tallest point on the Strip (Orbit's mast) */
export const RESORT_TALLEST = Math.max(...RESORTS.map((r) => r.top));

/* ---------- Solids ---------- */

/** A disc as three crossing boxes */
function disc(cx: number, cz: number, r: number, h: number): Box[] {
  return [
    [cx - r * 0.92, cz - r * 0.38, cx + r * 0.92, cz + r * 0.38, h],
    [cx - r * 0.71, cz - r * 0.71, cx + r * 0.71, cz + r * 0.71, h],
    [cx - r * 0.38, cz - r * 0.92, cx + r * 0.38, cz + r * 0.92, h],
  ];
}
/** A convex outline as strips a tile wide or less, each the outline's reach across it */
export function polyStrips(poly: Pt[], h: number, step = 1): Box[] {
  const xs = poly.map((p) => p[0]);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const n = Math.max(1, Math.ceil((x1 - x0) / step));
  const out: Box[] = [];
  for (let k = 0; k < n; k++) {
    const [a, b] = [x0 + ((x1 - x0) * k) / n, x0 + ((x1 - x0) * (k + 1)) / n];
    // (the outline's z where it crosses x a and x b, and its corners between)
    const zs: number[] = [];
    poly.forEach((p, i) => {
      const q = poly[(i + 1) % poly.length];
      for (const x of [a, b]) if ((p[0] - x) * (q[0] - x) <= 0 && p[0] !== q[0]) zs.push(p[1] + ((q[1] - p[1]) * (x - p[0])) / (q[0] - p[0]));
      if (p[0] >= a && p[0] <= b) zs.push(p[1]);
    });
    if (zs.length) out.push([a, Math.min(...zs), b, Math.max(...zs), h]);
  }
  return out;
}
const partSolids = (p: Part): Box[] => {
  if (p.solid === false) return [];
  const [x0, z0, x1, z1] = p.rect;
  const h = SLAB_Y + p.y1;
  if (p.shape === 'drum') return disc((x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2, h);
  if (p.shape === 'poly') return polyStrips(p.poly!, h);
  if (p.shape === 'pyramid') {
    // (in steps: each box as high as the slope at its own middle)
    const half = Math.min(x1 - x0, z1 - z0) / 2;
    return [0, 1, 2, 3].map((k): Box => {
      const i = (half * k) / 4;
      return [x0 + i, z0 + i, x1 - i, z1 - i, SLAB_Y + (p.y1 - p.y0) * ((k + 0.5) / 4) + p.y0];
    });
  }
  return [[x0, z0, x1, z1, h]];
};
/** A rim's walls round water at the ground, open where `gaps` (x or z ranges along a side) say */
const rimOf = ([x0, z0, x1, z1]: Rect, t = 0.25): Box[] => [
  [x0 - t, z0 - t, x1 + t, z0, SLAB_Y + RIM],
  [x0 - t, z1, x1 + t, z1 + t, SLAB_Y + RIM],
  [x0 - t, z0, x0, z1, SLAB_Y + RIM],
  [x1, z0, x1 + t, z1, SLAB_Y + RIM],
];
/** A car's footprint, parked */
const CAR_SIZE: Partial<Record<CarId, [number, number]>> = { exec: [3, 1.06], classic: [2.7, 1.1], super: [2.5, 1.1], ev: [2.2, 1] };
const carBox = ([id, x, z, yaw]: [CarId, number, number, number, string]): Box => {
  const [l, w] = CAR_SIZE[id] ?? [2.6, 1.1];
  // (a car's length is along its +x, turned by yaw about y)
  const alongX = Math.abs(Math.cos(yaw)) > 0.5;
  const [hx, hz] = alongX ? [l / 2, w / 2] : [w / 2, l / 2];
  return [x - hx, z - hz, x + hx, z + hz, SLAB_Y + 1.1];
};
/** The porte-cochère's posts at its four corners */
export const portePosts = ({ rect: [x0, z0, x1, z1] }: { rect: Rect }): Pt[] => [
  [x0 + 0.3, z0 + 0.3],
  [x1 - 0.3, z0 + 0.3],
  [x0 + 0.3, z1 - 0.3],
  [x1 - 0.3, z1 - 0.3],
];
export const POST = 0.18;

export const RESORT_SOLIDS: Box[] = (() => {
  const out: Box[] = [];
  for (const r of RESORTS) {
    for (const p of r.parts) out.push(...partSolids(p));
    out.push([...r.pylon.rect, SLAB_Y + r.pylon.h] as Box);
    for (const [x, z] of portePosts(r.porte)) out.push([x - POST, z - POST, x + POST, z + POST, SLAB_Y + r.porte.y]);
    // (the bridges over the moat and the canal keep their way open: those waters' rims stop at them)
    for (const w of r.water) out.push(...rimOf(w));
    for (const c of r.cars) out.push(carBox(c));
  }
  // The theme's own: the sphinx, the obelisk, Big City's bridge towers, the islet
  out.push([...SCARAB.sphinx.rect, SLAB_Y + SCARAB.sphinx.h]);
  const [ox, oz] = SCARAB.obelisk.at;
  const ob = SCARAB.obelisk.base / 2;
  out.push([ox - ob, oz - ob, ox + ob, oz + ob, SLAB_Y + SCARAB.obelisk.h]);
  // The Sphere's hoardings
  const [x0, z0, x1, z1] = SPHERE_LOT;
  const t = HOARDING.t;
  const H = SLAB_Y + HOARDING.h;
  out.push([x0, z0, x1, z0 + t, H], [x0, z1 - t, x1, z1, H], [x0, z0, x0 + t, z1, H], [x1 - t, z0, x1, z1, H]);
  return out;
})();
