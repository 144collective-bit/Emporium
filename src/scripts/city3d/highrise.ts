/*
 * Uptown's towers (docs/finance-plan.md Phase 2, the owner's call; DOM-free,
 * tested in tests/highrise.test.ts): the financial centre's skyline, taller
 * than the Emporium (the owner's call: the tallest about 30 tiles, the rest
 * 15 to 25; the Emporium stays the tallest downtown and the most detailed).
 *
 * - **Designs** (`Design`): a glass slab (a shaft on a podium, its plant
 *   room set back on top), a stepped deco tower (stone and gold, three
 *   setbacks, a gold pyramid and a finial), a round glass tower (a drum on a
 *   podium, a crown ring), twin towers (two shafts on one podium, a
 *   skybridge between) and the spire (the tallest: a chamfered shaft stepping
 *   in twice, a lit crown and a mast), each made from a lot by `design()`.
 * - **The towers** (`HIGHRISES`): laid by hand, one to a block (the plaza's
 *   block keeps its plaza, the spire standing in it), each its own height,
 *   skin and front: its lobby (`door`) on the street its front faces.
 * - **Each tower** is parts (`Part`: a box, a drum or an octagon, from y0 to
 *   y1, in a skin), bottom up; its podium first (if any), its roof (`roof`)
 *   and how high its crown and mast reach (`tip`); a skybridge for the twins.
 * - **What's solid** (`HIGHRISE_SOLIDS`): every part to its top (a drum's and
 *   an octagon's box drawn in a little), in strips (`partStrips()`), for
 *   walking, the camera, bullets and flying.
 */
import { PLAZA_BLOCK, UPTOWN_BLOCKS, UPTOWN_LANES, type Pt, type Rect } from './uptown';

export type Skin = 'blue' | 'gold' | 'black' | 'silver' | 'stone';
export type Shape = 'box' | 'drum' | 'oct';
export type Face = 'n' | 's' | 'e' | 'w';
export type Design = 'slab' | 'deco' | 'round' | 'twin' | 'spire';

export interface Part {
  shape: Shape;
  rect: Rect;
  y0: number;
  y1: number;
  /** Its walls: a curtain wall of glass or the deco stone; `podium` is the lobby's own */
  skin: Skin | 'podium';
}
export interface Highrise {
  id: string;
  block: string;
  design: Design;
  skin: Skin;
  /** Its land, inside its block's sidewalk */
  lot: Rect;
  /** Bottom up, the podium first (if any) */
  parts: Part[];
  front: Face;
  /** The lobby's door: on the front's sidewalk, in the middle of the front */
  door: Pt;
  /** The top of its highest part, and how high its crown and mast reach */
  roof: number;
  tip: number;
  /** The twins' skybridge: its box and height */
  bridge?: { rect: Rect; y0: number; y1: number };
}

/** The podium's height (a double-height lobby and a floor over it) and how far in from the lot it stands */
export const PODIUM = { h: 3.2, in: 0.8 };
/** How high the tallest reaches: its roof and the tip of its mast */
export const TALLEST = { roof: 30, tip: 36 };

const inset = ([x0, z0, x1, z1]: Rect, ax: number, az = ax): Rect => [x0 + ax, z0 + az, x1 - ax, z1 - az];
const mid = ([x0, z0, x1, z1]: Rect): Pt => [(x0 + x1) / 2, (z0 + z1) / 2];
/** A square of side s round a point */
const square = ([x, z]: Pt, s: number, t = s): Rect => [x - s / 2, z - t / 2, x + s / 2, z + t / 2];

/** The lobby's door on a rect's front face, `out` past it */
function doorOf(r: Rect, f: Face, out = 0.6): Pt {
  const [x, z] = mid(r);
  return f === 'n' ? [x, r[1] - out] : f === 's' ? [x, r[3] + out] : f === 'w' ? [r[0] - out, z] : [r[2] + out, z];
}

/** A tower of a design on a lot, `h` its roof */
export function design(id: string, block: string, kind: Design, lot: Rect, h: number, skin: Skin, front: Face): Highrise {
  const pod = inset(lot, PODIUM.in);
  const [pw, pd] = [pod[2] - pod[0], pod[3] - pod[1]];
  const podium: Part = { shape: 'box', rect: pod, y0: 0, y1: PODIUM.h, skin: 'podium' };
  const base = { id, block, design: kind, skin, lot, front, door: doorOf(pod, front) };
  const P = PODIUM.h;
  if (kind === 'slab') {
    // A long glass shaft on the podium, in from it more along its length; the plant room set back on top
    // (no longer than 2.2 times its depth: a long lot's slab stands in the middle of its podium)
    const long = pw > pd;
    const cap = (a: number, b: number) => Math.max(2.2, (a - 2.2 * (b - 2.8)) / 2);
    const shaft = inset(pod, long ? cap(pw, pd) : 1.4, long ? 1.4 : cap(pd, pw));
    const plant = inset(shaft, long ? 2.4 : 1.2, long ? 1.2 : 2.4);
    return { ...base, parts: [podium, { shape: 'box', rect: shaft, y0: P, y1: h - 2.2, skin }, { shape: 'box', rect: plant, y0: h - 2.2, y1: h, skin }], roof: h, tip: h + 1.6 };
  }
  if (kind === 'deco') {
    // Three setbacks in stone, a gold pyramid and a finial over them
    const s = Math.min(pw, pd) - 1.6;
    const t1 = square(mid(pod), Math.min(pw - 1.6, s * 1.35), s);
    const t2 = inset(t1, 1.3);
    const t3 = inset(t2, 1.3);
    return {
      ...base,
      parts: [podium, { shape: 'box', rect: t1, y0: P, y1: h * 0.55, skin }, { shape: 'box', rect: t2, y0: h * 0.55, y1: h * 0.8, skin }, { shape: 'box', rect: t3, y0: h * 0.8, y1: h, skin }],
      roof: h,
      tip: h + 5,
    };
  }
  if (kind === 'round') {
    // A glass drum on the podium, its top a step in
    const r = Math.min(pw, pd) / 2 - 1.0;
    const drum = square(mid(pod), r * 2);
    return { ...base, parts: [podium, { shape: 'drum', rect: drum, y0: P, y1: h - 1.4, skin }, { shape: 'drum', rect: inset(drum, 0.8), y0: h - 1.4, y1: h, skin }], roof: h, tip: h + 3 };
  }
  if (kind === 'twin') {
    // Two square shafts on one podium along its length, the second a little lower, a skybridge between
    const long = pw > pd;
    const s = Math.min(long ? pd : pw, ((long ? pw : pd) - 6) / 2) - 1.6;
    const [cx, cz] = mid(pod);
    const off = s / 2 + 3;
    const [a, b]: Pt[] = long ? [[cx - off, cz], [cx + off, cz]] : [[cx, cz - off], [cx, cz + off]];
    const h2 = Math.round(h * 0.92 * 10) / 10;
    const by = Math.round(h * 0.62 * 10) / 10;
    const bridge: Rect = long ? [a[0] + s / 2, cz - 1.2, b[0] - s / 2, cz + 1.2] : [cx - 1.2, a[1] + s / 2, cx + 1.2, b[1] - s / 2];
    return {
      ...base,
      parts: [podium, { shape: 'box', rect: square(a, s), y0: P, y1: h, skin }, { shape: 'box', rect: square(b, s), y0: P, y1: h2, skin }],
      roof: h,
      tip: h + 2.5,
      bridge: { rect: bridge, y0: by, y1: by + 1.8 },
    };
  }
  // The spire: no podium (it stands in the plaza), a chamfered shaft stepping in twice, a lit crown and a mast
  const s = Math.min(pw, pd);
  const t1 = square(mid(lot), s);
  const t2 = inset(t1, 1.6);
  const t3 = inset(t2, 1.6);
  return {
    ...base,
    door: doorOf(t1, front),
    parts: [{ shape: 'oct', rect: t1, y0: 0, y1: h * 0.45, skin }, { shape: 'oct', rect: t2, y0: h * 0.45, y1: h * 0.75, skin }, { shape: 'oct', rect: t3, y0: h * 0.75, y1: h, skin }],
    roof: h,
    tip: TALLEST.tip,
  };
}

const block = (id: string) => UPTOWN_BLOCKS.find((b) => b.id === id)!;
/** The part of a block east of the axis's lane through it (the sliver west of it stays open: `OPEN_LOTS` in uptown.ts) */
const eastOfLane = (id: string): Rect => {
  const b = block(id);
  const lane = UPTOWN_LANES.find((l) => l[1] === b.rect[1] && l[0] > b.rect[0] && l[2] < b.rect[2])!;
  return [lane[2] + 0.5, b.rect[1], b.rect[2], b.rect[3]];
};
/** The spire's lot in the plaza's block: a square east of the axis, the plaza round it */
export const SPIRE_LOT: Rect = (() => {
  const [, z0, x1, z1] = block(PLAZA_BLOCK).rect;
  const s = 15;
  // (its east side 1.5 in from the block's, its west side well clear of the axis)
  const cx = x1 - s / 2 - 1.5;
  return [cx - s / 2, (z0 + z1) / 2 - s / 2, cx + s / 2, (z0 + z1) / 2 + s / 2];
})();

/**
 * The towers, one to a block, laid by hand: heights stepping up to the spire in the plaza and down to the edges,
 * the river row fronting the water, the towers either side of the plaza fronting it
 */
export const HIGHRISES: Highrise[] = [
  design('n0', 'uptown-n0', 'twin', block('uptown-n0').rect, 19, 'blue', 's'),
  design('n1', 'uptown-n1', 'slab', eastOfLane('uptown-n1'), 22, 'black', 's'),
  design('n2', 'uptown-n2', 'deco', block('uptown-n2').rect, 20, 'stone', 's'),
  design('n3', 'uptown-n3', 'round', block('uptown-n3').rect, 17, 'silver', 's'),
  design('m0', 'uptown-m0', 'slab', block('uptown-m0').rect, 23, 'blue', 'e'),
  design('m1', PLAZA_BLOCK, 'spire', SPIRE_LOT, TALLEST.roof, 'silver', 'w'),
  design('m2', 'uptown-m2', 'deco', block('uptown-m2').rect, 24, 'stone', 'w'),
  design('m3', 'uptown-m3', 'round', block('uptown-m3').rect, 21, 'gold', 's'),
  design('s0', 'uptown-s0', 'slab', block('uptown-s0').rect, 18, 'silver', 's'),
  design('s1', 'uptown-s1', 'slab', eastOfLane('uptown-s1'), 24, 'gold', 's'),
  design('s2', 'uptown-s2', 'twin', block('uptown-s2').rect, 21, 'black', 's'),
  design('s3', 'uptown-s3', 'deco', block('uptown-s3').rect, 19, 'stone', 's'),
];

/** A part's box for what's solid: a drum's and an octagon's drawn in a little at the corners */
export function partBox(p: Part): [number, number, number, number, number] {
  const [x0, z0, x1, z1] = p.rect;
  const m = p.shape === 'drum' ? Math.min(x1 - x0, z1 - z0) * 0.08 : p.shape === 'oct' ? Math.min(x1 - x0, z1 - z0) * 0.04 : 0;
  return [x0 + m, z0 + m, x1 - m, z1 - m, p.y1];
}
/**
 * A part's box cut across its length into strips no wider than `STRIP` (as the kart park's grandstand): a car
 * started inside one is put out by its nearest side, a short push the collision grid's reach covers (drive-sim.ts)
 */
export const STRIP = 6;
export function partStrips(p: Part): [number, number, number, number, number][] {
  const [x0, z0, x1, z1, h] = partBox(p);
  const alongX = x1 - x0 >= z1 - z0;
  const len = alongX ? x1 - x0 : z1 - z0;
  const n = Math.ceil(len / STRIP);
  return Array.from({ length: n }, (_, k) => {
    const a = (alongX ? x0 : z0) + (len * k) / n;
    const b = (alongX ? x0 : z0) + (len * (k + 1)) / n;
    return alongX ? [a, z0, b, z1, h] : [x0, a, x1, b, h];
  });
}
export const HIGHRISE_SOLIDS: [number, number, number, number, number][] = HIGHRISES.flatMap((t) => t.parts.flatMap(partStrips));
