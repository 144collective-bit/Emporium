/*
 * Uptown's free land built on (docs/finance-plan.md Phase 7, the owner's
 * picks; DOM-free, tested in tests/uptownsites.test.ts): what stands on the
 * open ground the towers left, each fitted to its block's outline, the
 * neighbouring towers' lots and the sidewalks.
 *
 * - **The Circle Theatre** (`THEATRE`): a theatre and cinema on the circle's
 *   west side, its curved front following the circle across the
 *   carriageway, a marquee over the doors with chasing bulbs, posters for
 *   made-up films, its fly tower behind.
 * - **The Exchange** (`EXCHANGE`): a stone hall on the wedge east of the
 *   diagonal by the park's avenue, its portico of columns and pediment
 *   facing the avenue and Westlake Park, a ticker of fixed made-up words
 *   along its side (never a number, never a price).
 * - **The Grand Hotel** (`HOTEL`): on the diagonal's west side by the
 *   flatiron, its front along the diagonal, a porte-cochère on the cross
 *   street, its name lit on its roof, a pool deck on its roof with loungers
 *   and cabanas, a glass penthouse behind it.
 * - **A tower going up** (`WORKS`): the wedge north of the hotel, hoardings
 *   round it with made-up developer copy, floors stacked on columns round a
 *   concrete core, the formwork on top, a tower crane turning slowly.
 * - **Pocket gardens** (`GARDENS`): by the circle, either side of Circle
 *   Street: trees, a bench, a fountain bowl, planting.
 *
 * Their outlines are wound as the blocks are; `SITE_RECTS` are their bounds,
 * which streetlevel.ts's margins stop at.
 */
import { CIRCLE, DIAG, ROWS_Z, type Pt, type Rect } from './uptown';
import { WALK_W } from './layout';

const boundsOf = (poly: Pt[]): Rect => [Math.min(...poly.map((p) => p[0])), Math.min(...poly.map((p) => p[1])), Math.max(...poly.map((p) => p[0])), Math.max(...poly.map((p) => p[1]))];

/* ---------- The Circle Theatre ---------- */

/** The circle's land's outer edge (its sidewalk's), uptown.ts's `CIRCLE_OUT` */
const CIRCLE_OUT = CIRCLE.r + CIRCLE.half + WALK_W;
/** The circle's street's west edge of land (its half and sidewalk) */
const CIRCLE_W = CIRCLE.x - 1.7 - WALK_W;
const [, CROSS_N, CROSS_S] = ROWS_Z;
/** How far in from the block's edges the new buildings stand */
const IN = 0.6;
/** Where the theatre's front is at z: in from the circle's land where it bulges west, else from the street */
export function theatreFront(z: number) {
  const dz = z - CIRCLE.z;
  const arc = Math.abs(dz) < CIRCLE_OUT ? CIRCLE.x - Math.sqrt(CIRCLE_OUT ** 2 - dz * dz) : Infinity;
  return Math.min(CIRCLE_W, arc) - IN;
}
const T_Z0 = CROSS_N.c + CROSS_N.half + WALK_W + 0.8;
const T_Z1 = CROSS_S.c - CROSS_S.half - WALK_W - 0.8;
const T_X0 = -188.9;
export const THEATRE = (() => {
  // Its front: every tile along, and where the circle's land meets the straight street
  const zs = new Set<number>([T_Z0, T_Z1]);
  for (let z = Math.ceil(T_Z0); z < T_Z1; z += 1) zs.add(z);
  const meet = Math.sqrt(CIRCLE_OUT ** 2 - (CIRCLE_W - CIRCLE.x) ** 2);
  zs.add(CIRCLE.z - meet);
  zs.add(CIRCLE.z + meet);
  const front = [...zs].sort((a, b) => b - a).map((z): Pt => [theatreFront(z), z]);
  const poly: Pt[] = [[T_X0, T_Z0], [T_X0, T_Z1], ...front];
  return {
    poly,
    rect: boundsOf(poly),
    /** The hall's height and the fly tower behind it (x0, z0, x1, z1, its top) */
    h: 7.6,
    fly: [T_X0 + 0.3, 25, T_X0 + 4.4, 35, 12] as [number, number, number, number, number],
    /** The marquee: along the curved front from z0 to z1, out from it, its underside's height */
    marquee: { z0: 24.2, z1: 35.8, out: 0.95, y: 3.0 },
    /** Its doors (on the front, facing the circle) and where the queue stands */
    door: [theatreFront(CIRCLE.z) + 0.6, CIRCLE.z] as Pt,
  };
})();
/** The marquee's outer edge along the curved front: points every so often from its z0 to z1, the front there, out from it, and its normal */
export const MARQUEE: { inner: Pt; outer: Pt; n: Pt }[] = (() => {
  const { z0, z1, out } = THEATRE.marquee;
  const pts: { inner: Pt; outer: Pt; n: Pt }[] = [];
  for (let z = z0; z <= z1 + 1e-6; z += (z1 - z0) / 18) {
    const x = theatreFront(z);
    // (the front's normal there: out of the hall, towards the circle)
    const dz = 0.05;
    const t: Pt = [theatreFront(z + dz) - theatreFront(z - dz), 2 * dz];
    const l = Math.hypot(t[0], t[1]);
    const n: Pt = [t[1] / l, -t[0] / l];
    pts.push({ inner: [x, z], outer: [x + n[0] * out, z + n[1] * out], n });
  }
  return pts;
})();
/** The films on its posters and the marquee's lines: made up */
export const FILMS = ['NEON HARBOUR', 'STARFALL CITY', 'THE GLASS MILE', 'VELVET SKYLINE', 'MIDNIGHT ARCADE', 'COMET SEASON'];

/* ---------- The Exchange ---------- */

/** The diagonal's land's edge east of it at z (uptown.ts's block edge) and west of it */
const DSLOPE = (DIAG[1][0] - DIAG[0][0]) / (DIAG[1][1] - DIAG[0][1]);
const DIAG_OFF = (1.7 + 0.6 + WALK_W) * Math.hypot(1, DSLOPE);
const diagX = (z: number) => DIAG[0][0] + (z - DIAG[0][1]) * DSLOPE;
const eastOfDiag = (z: number) => diagX(z) + DIAG_OFF + 0.5;
const westOfDiag = (z: number) => diagX(z) - DIAG_OFF - 0.8;
const [RING] = ROWS_Z;
const E_Z0 = RING.c + RING.half + WALK_W + 0.8;
const E_Z1 = CROSS_N.c - CROSS_N.half - WALK_W - 1.5;
/** East of it, n2a's lot (highrise.ts) less a passage */
const E_X1 = -92;
export const EXCHANGE = (() => {
  const poly: Pt[] = [[eastOfDiag(E_Z0), E_Z0], [eastOfDiag(E_Z1), E_Z1], [E_X1, E_Z1], [E_X1, E_Z0]];
  return {
    poly,
    rect: boundsOf(poly),
    /** The hall's height (the cornice's top), the portico on its north face: its columns' line, how many, how high, the pediment's peak */
    h: 7,
    portico: { x0: eastOfDiag(E_Z0) + 1.6, x1: E_X1 - 0.6, z: E_Z0 + 0.45, cols: 6, colH: 5.4, peak: 8.6, depth: 1.5 },
    /** The ticker along its side on the diagonal, from its north end along the side, its height */
    ticker: { y: 5.6, h: 0.42 },
    /** The hall behind the portico: the outline with its north side stood back the portico's depth */
    hall: [[eastOfDiag(E_Z0 + 1.5), E_Z0 + 1.5], [eastOfDiag(E_Z1), E_Z1], [E_X1, E_Z1], [E_X1, E_Z0 + 1.5]] as Pt[],
  };
})();
/** The ticker's words: fixed and made up (never a number, never a price) */
export const TICKER_WORDS = ['OPEN', 'SECTOR 7', 'UPTOWN', 'GOOD MORNING', 'BUILDING TOGETHER', 'THE EXCHANGE', 'WELCOME', 'BRIGHT DAYS AHEAD'];

/* ---------- The Grand Hotel ---------- */

const H_Z0 = 31;
const H_Z1 = CROSS_S.c - CROSS_S.half - WALK_W - 1.5;
/** West of it, m2b's lot (highrise.ts) less a passage */
const H_X0 = -92.3;
export const HOTEL = (() => {
  const poly: Pt[] = [[H_X0, H_Z0], [H_X0, H_Z1], [westOfDiag(H_Z1), H_Z1], [westOfDiag(H_Z0), H_Z0]];
  return {
    poly,
    rect: boundsOf(poly),
    /** Its height to the roof (the pool deck), the penthouse's over the back of it (x0, z0, x1, z1, top) */
    h: 11.5,
    penthouse: [H_X0 + 0.6, H_Z0 + 0.6, H_X0 + 2.9, H_Z1 - 0.6, 13.6] as [number, number, number, number, number],
    /** The pool on the roof (its outline wound as the blocks, a step in from the parapet along the diagonal) */
    pool: [[H_X0 + 3.7, H_Z0 + 3.4], [H_X0 + 3.7, H_Z1 - 1.0], [westOfDiag(H_Z1 - 1.0) - 1.9, H_Z1 - 1.0], [westOfDiag(H_Z0 + 3.4) - 1.9, H_Z0 + 3.4]] as Pt[],
    /** The porte-cochère over the sidewalk on the cross street (its door's x, out to the kerb) */
    door: [H_X0 + 4.4, H_Z1] as Pt,
  };
})();
export const HOTEL_NAME = 'THE AURELIAN';

/* ---------- A tower going up ---------- */

const W_Z0 = 22.5;
const W_Z1 = 30.2;
/** West of it, m2a's lot less a passage */
const W_X0 = -97.8;
export const WORKS = (() => {
  const poly: Pt[] = [[W_X0, W_Z0], [W_X0, W_Z1], [westOfDiag(W_Z1), W_Z1], [westOfDiag(W_Z0), W_Z0]];
  return {
    poly,
    rect: boundsOf(poly),
    /** The new tower's footprint, how many floors are up (a floor's height), its core's top */
    tower: [W_X0 + 0.5, 25.8, W_X0 + 4.9, W_Z1 - 0.3] as Rect,
    floors: 8,
    floor: 1,
    core: 12.5,
    /** The tower crane: its mast, its height, the jib's reach and the counter-jib's */
    crane: { x: W_X0 + 1.3, z: 23.6, h: 29, jib: 13, counter: 4.5 },
    /** The hoardings' height round it */
    hoarding: 2.2,
  };
})();
/** The hoardings' made-up developer copy */
export const HOARDING_COPY = ['UPTOWN RISING', 'COMING SOON', 'BUILDING THE SKYLINE', 'SECTOR 7'];

/* ---------- Pocket gardens ---------- */

/** By the circle, either side of Circle Street (x0, z0, x1, z1) */
export const GARDENS: Rect[] = [
  [-173.2, 19.9, -168.5, 23.0],
  [-173.2, 37.0, -168.5, 40.1],
];
/** Each garden's trees, its bench and its fountain bowl */
export const GARDEN_TREES: Pt[] = GARDENS.flatMap(([x0, z0, x1, z1]): Pt[] => [
  [x0 + 0.9, z0 + 0.9],
  [x1 - 0.9, z1 - 0.9],
]);
export const GARDEN_FOUNTAINS: Pt[] = GARDENS.map(([x0, z0, x1, z1]): Pt => [(x0 + x1) / 2, (z0 + z1) / 2]);
export const FOUNTAIN_R = 0.85;

/* ---------- Bounds, solids, people ---------- */

/** What each stands on (streetlevel.ts's margins stop at them) */
export const SITE_RECTS: Rect[] = [THEATRE.rect, EXCHANGE.rect, HOTEL.rect, WORKS.rect, ...GARDENS];

type Box = [number, number, number, number, number];
/** An outline cut into strips across z (each the bounds of the outline over it), for what's solid */
function strips(poly: Pt[], h: number, step = 1): Box[] {
  const [, z0, , z1] = boundsOf(poly);
  const out: Box[] = [];
  for (let z = z0; z < z1 - 1e-6; z += step) {
    const zb = Math.min(z1, z + step);
    // (its x range over the strip: where the outline's edges cross it, and its corners in it)
    const xs: number[] = [];
    poly.forEach((a, i) => {
      const b = poly[(i + 1) % poly.length];
      for (const zz of [z, zb, (z + zb) / 2])
        if ((a[1] - zz) * (b[1] - zz) <= 0 && a[1] !== b[1]) xs.push(a[0] + ((b[0] - a[0]) * (zz - a[1])) / (b[1] - a[1]));
      if (a[1] >= z && a[1] <= zb) xs.push(a[0]);
    });
    if (xs.length) out.push([Math.min(...xs), z, Math.max(...xs), zb, h]);
  }
  return out;
}
export const UPTOWN_SITE_SOLIDS: Box[] = [
  ...strips(THEATRE.poly, THEATRE.h),
  [...THEATRE.fly] as Box,
  ...strips(EXCHANGE.poly, EXCHANGE.h),
  ...strips(HOTEL.poly, HOTEL.h),
  // The works behind their hoardings (the whole site), the crane's mast inside them
  ...strips(WORKS.poly, WORKS.hoarding),
  [WORKS.crane.x - 0.5, WORKS.crane.z - 0.5, WORKS.crane.x + 0.5, WORKS.crane.z + 0.5, WORKS.crane.h],
  ...GARDEN_FOUNTAINS.map(([x, z]): Box => [x - FOUNTAIN_R, z - FOUNTAIN_R, x + FOUNTAIN_R, z + FOUNTAIN_R, 0.55]),
];

export interface SitePerson {
  x: number;
  z: number;
  /** Over the slab (a lounger's or a stool's height for those sitting, the roof's for those on it) */
  y: number;
  ry: number;
  act: 'sit' | 'look' | 'chat' | 'queue';
}
export const SITE_PEOPLE: SitePerson[] = (() => {
  const out: SitePerson[] = [];
  // A queue for the theatre on the sidewalk round the circle, along its front south of the doors, facing them
  const r = CIRCLE_OUT - 0.4;
  for (let k = 0; k < 5; k++) {
    const z = CIRCLE.z + 1.6 + k * 0.7;
    out.push({ x: CIRCLE.x - Math.sqrt(r * r - (z - CIRCLE.z) ** 2), z, y: 0, ry: Math.PI, act: 'queue' });
  }
  // The hotel's doorman under the porte-cochère, guests on the pool deck's loungers
  out.push({ x: HOTEL.door[0] - 1.3, z: HOTEL.door[1] + 0.5, y: 0, ry: 0, act: 'look' });
  const [px0, pz0] = HOTEL.pool[0];
  for (let k = 0; k < 3; k++) out.push({ x: px0 - 0.6, z: pz0 + 0.6 + k * 1.4, y: HOTEL.h + 0.35, ry: Math.PI / 2, act: 'sit' });
  // People in the gardens on their benches
  for (const [x0, z0, x1] of GARDENS) out.push({ x: (x0 + x1) / 2, z: z0 + 0.45, y: 0.32, ry: 0, act: 'sit' });
  // A pair at the exchange's steps
  const p = EXCHANGE.portico;
  for (const s of [-0.35, 0.35]) out.push({ x: (p.x0 + p.x1) / 2 + s, z: p.z - 0.6, y: 0, ry: s < 0 ? Math.PI / 2 : -Math.PI / 2, act: 'chat' });
  return out;
})();
