/*
 * Sector 7 Stadium (Westlake Park's step 2, docs/growth-plan.md Phase 9b,
 * the owner's call; DOM-free, tested in tests/stadium.test.ts), drawn by
 * stadium3d.ts. An oval bowl on the site the park kept clear for it
 * (`STADIUM_SITE` in westlake.ts), its front to the south, where the Mall
 * comes up from the park's south gate to its forecourt.
 *
 * - **The bowl** is a soft-cornered oval (a superellipse, `ovalAt()`): the
 *   facade round the outside (`FACADE`, to `FACADE.h`), the stands stepping
 *   down from it to the pitch in two tiers with a concourse between
 *   (`TIERS`), a roof ring over the upper tier (`ROOF`), open over the
 *   pitch.
 * - **The pitch** (`PITCH`) in the middle, its lines and a running track
 *   round it.
 * - **Floodlights** on four masts outside the corners (`MASTS`) and a big
 *   screen over the north stand (`SCREEN`).
 * - **The main gate** in the middle of the south facade (`GATE`): its
 *   door prompt opens the stadium's panel (events coming soon), and Walk in
 *   stands you on the forecourt in front (`STADIUM_SPAWN`).
 * - **The car park** (`CAR_PARK`) on the strip across the west ring avenue
 *   from the park's south gate, with cars in most of its bays
 *   (`PARKED`).
 *
 * Everything stays under the Emporium (`TALLEST`). What's solid is
 * `STADIUM_SOLIDS`: the facade all the way round (the gates are shut until
 * there's an event), the masts and the parked cars.
 */
import { CAR_PARK, STADIUM_SITE } from './westlake';
import { WALK_W } from './layout';

export type Pt = [number, number];
export type Box = [number, number, number, number, number];

const [SX0, SZ0, SX1, SZ1] = STADIUM_SITE;
/** The bowl's middle */
export const CENTRE: Pt = [(SX0 + SX1) / 2, (SZ0 + SZ1) / 2];
/** How square the oval's corners are (2 an ellipse; higher, squarer) */
export const ROUNDNESS = 3;

/** A point on an oval of half sizes a (x) and b (z) round the middle, at angle t (0 east, +π/2 south) */
export function ovalAt(a: number, b: number, t: number): Pt {
  const c = Math.cos(t);
  const s = Math.sin(t);
  const e = 2 / ROUNDNESS;
  return [CENTRE[0] + a * Math.sign(c) * Math.abs(c) ** e, CENTRE[1] + b * Math.sign(s) * Math.abs(s) ** e];
}
/** An oval's outline, `n` points round */
export const oval = (a: number, b: number, n = 96): Pt[] => Array.from({ length: n }, (_, k) => ovalAt(a, b, (2 * Math.PI * k) / n));
/** Is a point inside an oval of half sizes a, b (m beyond it) */
export const inOval = (a: number, b: number, x: number, z: number, m = 0) =>
  (Math.abs(x - CENTRE[0]) / (a + m)) ** ROUNDNESS + (Math.abs(z - CENTRE[1]) / (b + m)) ** ROUNDNESS < 1;

/** The facade round the outside: its half sizes and height */
export const FACADE = { a: 31, b: 25, h: 7.2 };
/** The roof ring over the upper tier: from its inner edge out past the facade, its height (sloping a little up to the outside) */
export const ROOF = { a0: 23.4, b0: 17.8, a1: 31.6, b1: 25.6, y0: 8.3, y1: 8.7 };
/** The pitch (half sizes) and the running track round it (its outer half sizes) */
export const PITCH = { hx: 15, hz: 9.5 };
export const TRACK = { a: 19, b: 13.4 };

/** A tier of seats: from its front edge (half sizes) up and back, steps of a rise and a depth */
export interface Tier {
  a: number;
  b: number;
  /** The front edge's height */
  y: number;
  steps: number;
  rise: number;
  depth: number;
}
/** The lower tier from the track's edge, then the concourse (`GANGWAY` deep), then the upper tier up to the facade */
const GANGWAY = 1.2;
const lower: Tier = { a: TRACK.a + 0.4, b: TRACK.b + 0.4, y: 0.6, steps: 6, rise: 0.42, depth: 0.75 };
export const TIERS: Tier[] = [lower, { a: lower.a + lower.steps * lower.depth + GANGWAY, b: lower.b + lower.steps * lower.depth + GANGWAY, y: 3.6, steps: 6, rise: 0.48, depth: 0.75 }];
/** The concourse between the tiers: its inner and outer half sizes and its height */
export const CONCOURSE = { a0: lower.a + lower.steps * lower.depth, b0: lower.b + lower.steps * lower.depth, a1: TIERS[1].a, b1: TIERS[1].b, y: lower.y + lower.steps * lower.rise };

/** The four floodlight masts, outside the bowl's corners: where, how tall (the lamps at the top) */
export const MASTS: { x: number; z: number }[] = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].map((t) => {
  const [x, z] = ovalAt(FACADE.a + 1.6, FACADE.b + 1.6, t);
  return { x, z };
});
export const MAST = { h: 10.6, r: 0.22, head: { w: 2.6, h: 1.2 } };
/** The big screen over the north stand, facing the pitch: its middle, size and how high its foot stands */
export const SCREEN = { x: CENTRE[0], z: CENTRE[1] - FACADE.b + 0.8, w: 9, h: 3.2, y: FACADE.h + 0.3 };

/** The main gate: the middle of the south facade (its z), its width and height; where you stand at it */
export const GATE = (() => {
  const [, z] = ovalAt(FACADE.a, FACADE.b, Math.PI / 2);
  return { x: CENTRE[0], z, w: 5, h: 4.2, spot: { x: CENTRE[0], z: z + 1.3 } };
})();
/** The stadium's name over the main gate (fixed made-up copy) */
export const NAME = 'SECTOR 7 STADIUM';
/** Where Walk in and fast travel stand you: on the forecourt, facing the gate (north: walk.ts's yaw 0) */
export const STADIUM_SPAWN = { x: CENTRE[0] + 2.6, z: GATE.z + 4.2, yaw: 0 };

/** The tallest anything stands (the masts' lamps), under the Emporium's roof (about 12.5) */
export const TALLEST = MAST.h + MAST.head.h / 2;

/* ---------- The car park ---------- */

/** On the first strip across the avenue from the park's south gate, from the west end (westlake.ts, which keeps its trees off it) */
export { CAR_PARK };
/** A bay's width along the row, and how deep it is */
export const BAY = { w: 2.6, d: 4.4 };
/** Its two rows of bays either side of the aisle down the middle, nose to the aisle; where cars come in off the avenue */
export const BAYS: { x: number; z: number; yaw: number }[] = (() => {
  const [x0, z0, x1, z1] = CAR_PARK;
  const out: { x: number; z: number; yaw: number }[] = [];
  const n = Math.floor((x1 - x0 - 1) / BAY.w);
  for (let i = 0; i < n; i++) {
    const x = x0 + 0.5 + (i + 0.5) * BAY.w;
    // (cars.ts's yaw: 0 points +x; nose in, towards the aisle)
    out.push({ x, z: z0 + BAY.d / 2, yaw: -Math.PI / 2 }, { x, z: z1 - BAY.d / 2, yaw: Math.PI / 2 });
  }
  return out;
})();
/** The ways in off the avenue to its south: x of each, its width */
export const ENTRANCES = [CAR_PARK[0] + 9, CAR_PARK[2] - 9].map((x) => ({ x, w: 3.6 }));
/** The cars parked: model, x, z, yaw, colour; about three bays in four taken, seeded */
export const PARKED: [string, number, number, number, string][] = (() => {
  const models = ['hatch', 'sedan', 'pickup', 'van', 'coupe', 'suv'];
  const colours = ['#e23b3b', '#2aabee', '#ffd23f', '#f3f2f7', '#8000ff', '#1fbf6b', '#ff8a3d', '#2b2d3a', '#e219e5'];
  let s = 707;
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const out: [string, number, number, number, string][] = [];
  for (const b of BAYS) {
    if (r() > 0.74) continue;
    out.push([models[Math.floor(r() * models.length)], b.x, b.z, b.yaw + (r() < 0.15 ? Math.PI : 0), colours[Math.floor(r() * colours.length)]]);
  }
  return out;
})();
/** A parked car's footprint, half its length and width (the longest model) */
const CAR_HALF = { l: 1.5, w: 0.62 };

/* ---------- What's solid ---------- */

/** The facade as boxes along its outline (every few tiles round, each a box over its stretch), to its height */
const facadeBoxes = (): Box[] => {
  const pts = oval(FACADE.a, FACADE.b, 120);
  return pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    return [Math.min(p[0], q[0]) - 0.3, Math.min(p[1], q[1]) - 0.3, Math.max(p[0], q[0]) + 0.3, Math.max(p[1], q[1]) + 0.3, FACADE.h];
  });
};
export const STADIUM_SOLIDS: Box[] = [
  ...facadeBoxes(),
  ...MASTS.map(({ x, z }): Box => [x - 0.45, z - 0.45, x + 0.45, z + 0.45, MAST.h]),
  ...PARKED.map(([, x, z, yaw]): Box => {
    const along = Math.abs(Math.cos(yaw)) > 0.5;
    const [hx, hz] = along ? [CAR_HALF.l, CAR_HALF.w] : [CAR_HALF.w, CAR_HALF.l];
    return [x - hx, z - hz, x + hx, z + hz, 1.3];
  }),
];
/** The stadium's land with the forecourt in front, and the car park, for trees, lamps and paths to keep off */
export const STADIUM_RECTS: [number, number, number, number][] = [
  [SX0, SZ0, SX1, SZ1],
  [CAR_PARK[0] - 0.5, CAR_PARK[1] - 0.5, CAR_PARK[2] + 0.5, CAR_PARK[3] + 0.5],
];
/** The car park's sidewalk crossing to the avenue (z of the strip's edge, out to the asphalt) */
export const APRON = { z0: CAR_PARK[1] - 1 - WALK_W, z1: CAR_PARK[1] + 0.2 };
