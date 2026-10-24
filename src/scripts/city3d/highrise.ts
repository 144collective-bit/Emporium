/*
 * Uptown's towers (docs/finance-plan.md Phases 2 and 5, the owner's calls;
 * DOM-free, tested in tests/highrise.test.ts): the financial centre's
 * skyline, taller than the Emporium. Phase 5 made them slim (the owner's
 * call: "a smaller footprint so they look more realistic as skyscrapers"):
 * shafts 5 to 10 tiles across, two or three to a block, the spire in the
 * plaza about 40 tiles, the rest 14 to 32.
 *
 * - **Designs** (`Design`): a glass slab (a shaft on a podium, its plant
 *   room set back on top), a stepped deco tower (stone and gold, three
 *   setbacks, a gold pyramid and a finial), a round glass tower (a drum on a
 *   podium, a crown ring), twin towers (two shafts on one podium, a
 *   skybridge between), the spire (the tallest: a chamfered shaft stepping
 *   in twice, a lit crown and a mast) and the flatiron (a stone wedge filling
 *   the sharp corner the diagonal cuts, its prow blunt, a cornice on top),
 *   each made from a lot by `design()`.
 * - **The towers** (`HIGHRISES`): laid by hand on their own lots inside the
 *   blocks (uptown.ts), each its own height, skin and front: its lobby
 *   (`door`) on the street its front faces. The river row's shafts stand at
 *   the back of their podiums (`back`), the front of the podium's roof left
 *   for a restaurant terrace (boulevard.ts).
 * - **Each tower** is parts (`Part`: a box, a drum, an octagon or a prism
 *   (an outline of its own, `poly`), from y0 to y1, in a skin), bottom up;
 *   its podium first (if any), its roof (`roof`) and how high its crown and
 *   mast reach (`tip`); a skybridge for the twins.
 * - **What's solid** (`HIGHRISE_SOLIDS`): every part to its top (a drum's and
 *   an octagon's box drawn in a little, a prism in thin strips along it), in
 *   strips (`partStrips()`), for walking, the camera, bullets and flying.
 */
import { PLAZA_BLOCK, UPTOWN_BLOCKS, type Pt, type Rect } from './uptown';

export type Skin = 'blue' | 'gold' | 'black' | 'silver' | 'stone';
export type Shape = 'box' | 'drum' | 'oct' | 'prism';
export type Face = 'n' | 's' | 'e' | 'w';
export type Design = 'slab' | 'deco' | 'round' | 'twin' | 'spire' | 'flatiron';

export interface Part {
  shape: Shape;
  /** Its bounds (a prism's too) */
  rect: Rect;
  /** A podium's ground floor where it stands back from the storey over it (what's solid down there) */
  foot?: Rect;
  /** A prism's outline, counter-clockwise as the blocks' */
  poly?: Pt[];
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
  /** Its lobby's design (`Lobby`), and the columns standing along its front where the ground floor is set back (x, z) */
  lobby: Lobby;
  columns: Pt[];
}

/**
 * The lobbies (the owner's call: "more realistic ... not a plinth"): a glass atrium (double-height glazing, a
 * vestibule, a canopy), a colonnade (the ground floor set back behind stone columns, bronze doors), an arcade (set
 * back behind round columns), retail (shopfronts either side of a narrow lobby door, awnings, signs) and the
 * spire's pavilion (a glass entrance pavilion at its foot). The podium's other sides are shops where they face a
 * street, its back a service wall
 */
export type Lobby = 'atrium' | 'colonnade' | 'arcade' | 'retail' | 'pavilion';
/** The ground floor's height under the podium's top storey, and how far a colonnade's or arcade's front stands back */
export const GROUND = { h: 2.3, recess: 1.1, col: 0.36, every: 1.7 };

/** The podium's height (a double-height lobby and a floor over it) and how far in from the lot it stands */
export const PODIUM = { h: 3.2, in: 0.8 };
/** How high the tallest reaches: its roof and the tip of its mast */
export const TALLEST = { roof: 40, tip: 45 };
/** How much of an octagon's side its corners cut (highrise3d.ts draws them so; the sky deck's outline, skydeck.ts) */
export const OCT_CUT = 0.22;

const inset = ([x0, z0, x1, z1]: Rect, ax: number, az = ax): Rect => [x0 + ax, z0 + az, x1 - ax, z1 - az];
const mid = ([x0, z0, x1, z1]: Rect): Pt => [(x0 + x1) / 2, (z0 + z1) / 2];
/** A square of side s round a point */
const square = ([x, z]: Pt, s: number, t = s): Rect => [x - s / 2, z - t / 2, x + s / 2, z + t / 2];

/** The lobby's door on a rect's front face, `out` past it */
function doorOf(r: Rect, f: Face, out = 0.6): Pt {
  const [x, z] = mid(r);
  return f === 'n' ? [x, r[1] - out] : f === 's' ? [x, r[3] + out] : f === 'w' ? [r[0] - out, z] : [r[2] + out, z];
}

/** Each design's lobby (the slabs alternate between a glass atrium and shops, by their name) */
const lobbyOf = (id: string, kind: Design): Lobby =>
  kind === 'deco' ? 'colonnade' : kind === 'round' ? 'arcade' : kind === 'twin' ? 'atrium' : kind === 'spire' ? 'pavilion' : kind === 'flatiron' ? 'retail' : (id.charCodeAt(1) + id.charCodeAt(2)) % 2 ? 'retail' : 'atrium';
/** A podium's ground floor set back along its front, and the columns left standing along the front's line */
function setBack(pod: Rect, front: Face): { foot: Rect; columns: Pt[] } {
  const r = GROUND.recess;
  const foot: Rect = front === 'n' ? [pod[0], pod[1] + r, pod[2], pod[3]] : front === 's' ? [pod[0], pod[1], pod[2], pod[3] - r] : front === 'w' ? [pod[0] + r, pod[1], pod[2], pod[3]] : [pod[0], pod[1], pod[2] - r, pod[3]];
  const along = front === 'n' || front === 's';
  const [a, b] = along ? [pod[0], pod[2]] : [pod[1], pod[3]];
  const line = front === 'n' ? pod[1] : front === 's' ? pod[3] : front === 'w' ? pod[0] : pod[2];
  const inward = front === 'n' || front === 'w' ? 1 : -1;
  const n = Math.max(2, Math.round((b - a - 0.5) / GROUND.every) + 1);
  const columns = Array.from({ length: n }, (_, i): Pt => {
    const v = a + 0.25 + ((b - a - 0.5) * i) / (n - 1);
    const w = line + inward * (GROUND.col / 2 + 0.02);
    return along ? [v, w] : [w, v];
  });
  return { foot, columns };
}

/** A shaft's outline pushed to one side of its podium (`back`), 1 in from it, the rest of the podium's roof left open */
function toBack(r: Rect, pod: Rect, back?: Face): Rect {
  if (!back) return r;
  const [w, d] = [r[2] - r[0], r[3] - r[1]];
  if (back === 'n') return [r[0], pod[1] + 1, r[2], pod[1] + 1 + d];
  if (back === 's') return [r[0], pod[3] - 1 - d, r[2], pod[3] - 1];
  if (back === 'w') return [pod[0] + 1, r[1], pod[0] + 1 + w, r[3]];
  return [pod[2] - 1 - w, r[1], pod[2] - 1, r[3]];
}

/**
 * A tower of a design on a lot, `h` its roof; `back` pushes its shaft to that side of its podium and `depth` caps the
 * shaft's depth there, and `ratio` is how long its shaft may be against its depth (a slab's)
 */
export function design(id: string, block: string, kind: Design, lot: Rect, h: number, skin: Skin, front: Face, o: { back?: Face; depth?: number; ratio?: number } = {}): Highrise {
  const { back, depth = Infinity, ratio = 1.7 } = o;
  const pod = inset(lot, PODIUM.in);
  const [pw, pd] = [pod[2] - pod[0], pod[3] - pod[1]];
  const lobby = lobbyOf(id, kind);
  const back_ = lobby === 'colonnade' || lobby === 'arcade' ? setBack(pod, front) : null;
  const podium: Part = { shape: 'box', rect: pod, y0: 0, y1: PODIUM.h, skin: 'podium', ...(back_ ? { foot: back_.foot } : {}) };
  const base = { id, block, design: kind, skin, lot, front, door: doorOf(pod, front), lobby, columns: back_?.columns ?? [] };
  const P = PODIUM.h;
  // (the shaft's own room on the podium: all of it, or a depth at the back)
  const room: Rect = !back || !Number.isFinite(depth) ? pod : back === 'n' ? [pod[0], pod[1], pod[2], pod[1] + depth + 2] : back === 's' ? [pod[0], pod[3] - depth - 2, pod[2], pod[3]] : back === 'w' ? [pod[0], pod[1], pod[0] + depth + 2, pod[3]] : [pod[2] - depth - 2, pod[1], pod[2], pod[3]];
  const [rw, rd] = [room[2] - room[0], room[3] - room[1]];
  if (kind === 'slab') {
    // A glass shaft 1 in from the podium (no longer than `ratio` times its depth), the plant room set back on top
    const long = rw > rd;
    const s0 = inset(room, Math.min(1, Math.min(rw, rd) * 0.12));
    const [sw, sd] = [s0[2] - s0[0], s0[3] - s0[1]];
    const cut = long ? Math.max(0, (sw - ratio * sd) / 2) : Math.max(0, (sd - ratio * sw) / 2);
    const shaft = toBack(long ? inset(s0, cut, 0) : inset(s0, 0, cut), pod, back);
    const plant = inset(shaft, Math.min(1.2, (shaft[2] - shaft[0]) * 0.2), Math.min(1.2, (shaft[3] - shaft[1]) * 0.2));
    return { ...base, parts: [podium, { shape: 'box', rect: shaft, y0: P, y1: h - 2.2, skin }, { shape: 'box', rect: plant, y0: h - 2.2, y1: h, skin }], roof: h, tip: h + 1.6 };
  }
  if (kind === 'deco') {
    // Three setbacks in stone, each a sixth of its width in, a gold pyramid and a finial over them
    const t1 = toBack(inset(room, 0.9), pod, back);
    const k = Math.min(t1[2] - t1[0], t1[3] - t1[1]) * 0.16;
    const t2 = inset(t1, k);
    const t3 = inset(t2, k);
    return {
      ...base,
      parts: [podium, { shape: 'box', rect: t1, y0: P, y1: h * 0.6, skin }, { shape: 'box', rect: t2, y0: h * 0.6, y1: h * 0.84, skin }, { shape: 'box', rect: t3, y0: h * 0.84, y1: h, skin }],
      roof: h,
      tip: h + 4,
    };
  }
  if (kind === 'round') {
    // A glass drum on the podium, its top a step in
    const r = Math.min(rw, rd) / 2 - 0.9;
    const drum = toBack(square(mid(room), r * 2), pod, back);
    return { ...base, parts: [podium, { shape: 'drum', rect: drum, y0: P, y1: h - 1.4, skin }, { shape: 'drum', rect: inset(drum, 0.6), y0: h - 1.4, y1: h, skin }], roof: h, tip: h + 3 };
  }
  if (kind === 'twin') {
    // Two square shafts on one podium along its length, the second a little lower, a skybridge between
    const long = rw > rd;
    const s = Math.min((long ? rd : rw) - 1.8, ((long ? rw : rd) - 4) / 2 - 0.9);
    const [cx, cz] = mid(room);
    const off = s / 2 + 2;
    const [a, b]: Pt[] = long ? [[cx - off, cz], [cx + off, cz]] : [[cx, cz - off], [cx, cz + off]];
    const h2 = Math.round(h * 0.9 * 10) / 10;
    const by = Math.round(h * 0.62 * 10) / 10;
    const bridge: Rect = long ? [a[0] + s / 2, cz - 0.9, b[0] - s / 2, cz + 0.9] : [cx - 0.9, a[1] + s / 2, cx + 0.9, b[1] - s / 2];
    return {
      ...base,
      parts: [podium, { shape: 'box', rect: square(a, s), y0: P, y1: h, skin }, { shape: 'box', rect: square(b, s), y0: P, y1: h2, skin }],
      roof: h,
      tip: h + 2.5,
      bridge: { rect: bridge, y0: by, y1: by + 1.6 },
    };
  }
  if (kind === 'flatiron') throw new Error('the flatiron is made by flatiron()');
  // The spire: no podium (it stands in the plaza), a chamfered shaft stepping in twice, a lit crown and a mast
  const s = Math.min(pw, pd);
  const t1 = square(mid(lot), s);
  const t2 = inset(t1, s * 0.12);
  const t3 = inset(t2, s * 0.12);
  return {
    ...base,
    door: doorOf(t1, front),
    parts: [{ shape: 'oct', rect: t1, y0: 0, y1: h * 0.5, skin }, { shape: 'oct', rect: t2, y0: h * 0.5, y1: h * 0.8, skin }, { shape: 'oct', rect: t3, y0: h * 0.8, y1: h, skin }],
    roof: h,
    tip: TALLEST.tip,
  };
}

/* ---------- The flatiron ---------- */

/** A convex outline (counter-clockwise as the blocks') with every edge moved in by d */
function insetConvex(poly: Pt[], d: number): Pt[] {
  const n = poly.length;
  const lines = poly.map((a, i) => {
    const b = poly[(i + 1) % n];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    // (inside is on the right of travel seen from above: the blocks' winding)
    const nx = -(b[1] - a[1]) / l;
    const nz = (b[0] - a[0]) / l;
    return { p: [a[0] - nx * d, a[1] - nz * d] as Pt, u: [(b[0] - a[0]) / l, (b[1] - a[1]) / l] as Pt };
  });
  return lines.map((L, i) => {
    const M = lines[(i + n - 1) % n];
    // Where the line before meets this one
    const den = M.u[0] * L.u[1] - M.u[1] * L.u[0];
    const t = ((L.p[0] - M.p[0]) * L.u[1] - (L.p[1] - M.p[1]) * L.u[0]) / den;
    return [M.p[0] + M.u[0] * t, M.p[1] + M.u[1] * t] as Pt;
  });
}
/** An outline clipped to z0..z1 */
function clipZ(poly: Pt[], z0: number, z1: number): Pt[] {
  let out = poly;
  for (const [inside, z] of [[(p: Pt) => p[1] >= z0, z0], [(p: Pt) => p[1] <= z1, z1]] as const) {
    const src = out;
    out = [];
    src.forEach((a, i) => {
      const b = src[(i + 1) % src.length];
      if (inside(a)) out.push(a);
      if (inside(a) !== inside(b)) out.push([a[0] + ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]), z]);
    });
  }
  return out;
}
const boundsOf = (poly: Pt[]): Rect => [Math.min(...poly.map((p) => p[0])), Math.min(...poly.map((p) => p[1])), Math.max(...poly.map((p) => p[0])), Math.max(...poly.map((p) => p[1]))];
/** The prow's width, where the wedge is cut off blunt */
export const PROW = 2.4;
/**
 * The flatiron: the diagonal's wedge (a triangle, its sharp corner at one end along z) filled with a stone wedge
 * `inset` in from its sidewalks, its prow cut off blunt `PROW` wide, a cornice tier on top; no podium
 */
function flatiron(id: string, block: string, h: number, front: Face, inset = 0.6): Highrise {
  const tri = insetConvex(UPTOWN_BLOCKS.find((b) => b.id === block)!.poly, inset);
  const [, z0, , z1] = boundsOf(tri);
  // Its width across at z: where the wedge narrows to the prow
  const width = (z: number) => {
    const cut = clipZ(tri, z - 1e-3, z + 1e-3);
    return cut.length ? Math.max(...cut.map((p) => p[0])) - Math.min(...cut.map((p) => p[0])) : 0;
  };
  // (the sharp end: the end of its z range where it narrows)
  const sharpSouth = width(z1 - 0.5) < width(z0 + 0.5);
  let [a, b] = sharpSouth ? [z0, z1] : [z1, z0];
  for (let k = 0; k < 40; k++) {
    const m = (a + b) / 2;
    if (width(m) > PROW) a = m;
    else b = m;
  }
  const body = sharpSouth ? clipZ(tri, z0, a) : clipZ(tri, a, z1);
  const crown = insetConvex(body, 0.45);
  const lot: Rect = boundsOf(body);
  const parts: Part[] = [
    { shape: 'prism', poly: body, rect: lot, y0: 0, y1: h - 2, skin: 'stone' },
    { shape: 'prism', poly: crown, rect: boundsOf(crown), y0: h - 2, y1: h, skin: 'stone' },
  ];
  const door: Pt = front === 'n' ? [(lot[0] + lot[2]) / 2 + 2, lot[1] - 0.4] : [(lot[0] + lot[2]) / 2 + 2, lot[3] + 0.4];
  return { id, block, design: 'flatiron', skin: 'stone', lot: [lot[0] - 0.5, lot[1] - 0.5, lot[2] + 0.5, lot[3] + 0.5], front, door, parts, roof: h, tip: h + 1.2, lobby: 'retail', columns: [] };
}

/** The spire's lot in the plaza's block: a square east of the axis, the plaza round it */
export const SPIRE_LOT: Rect = (() => {
  const [, z0, x1, z1] = UPTOWN_BLOCKS.find((b) => b.id === PLAZA_BLOCK)!.rect;
  const s = 12 + PODIUM.in * 2;
  // (12 across, its east side 2.2 in from the block's, its west side well clear of the axis)
  const cx = x1 - s / 2 - 2.2;
  return [cx - s / 2, (z0 + z1) / 2 - s / 2, cx + s / 2, (z0 + z1) / 2 + s / 2];
})();

/**
 * The towers, laid by hand on their lots: heights stepping up to the spire in the plaza and down to the edges, the
 * river row fronting the water (their shafts at the back of their podiums, the terraces in front), the circle's
 * framed by the four round it, the crescent's following its curve
 */
export const HIGHRISES: Highrise[] = [
  // West of the circle's street and east of it to the one-way pair
  design('n0a', 'uptown-n0w', 'round', [-199.5, 1.5, -191.5, 13], 21, 'silver', 'n'),
  design('n0b', 'uptown-n0w', 'slab', [-189.5, 1.5, -181, 13], 25, 'blue', 'e'),
  design('n0c', 'uptown-n0e', 'deco', [-171, 1.5, -163.5, 13], 24, 'stone', 'w'),
  design('n0d', 'uptown-n0e', 'slab', [-161.5, 1.5, -153.5, 13], 28, 'black', 'e'),
  design('m0a', 'uptown-m0w', 'twin', [-199.5, 20.5, -189.5, 39.5], 27, 'gold', 'w'),
  design('m0b', 'uptown-m0n', 'slab', [-167.5, 19.6, -153.3, 26.8], 16, 'silver', 'n', { ratio: 2.2 }),
  design('m0c', 'uptown-m0s', 'slab', [-167.5, 33.2, -153.3, 40.4], 17, 'blue', 's', { ratio: 2.2 }),
  design('s0a', 'uptown-s0w', 'round', [-199.5, 46.3, -191.5, 59.2], 20, 'blue', 's', { back: 'n', depth: 7 }),
  design('s0b', 'uptown-s0w', 'deco', [-189.5, 46.3, -181, 59.2], 22, 'stone', 's', { back: 'n', depth: 7 }),
  design('s0c', 'uptown-s0e', 'slab', [-171, 46.3, -163.5, 59.2], 24, 'silver', 's', { back: 'n', depth: 6.5 }),
  design('s0d', 'uptown-s0e', 'round', [-161.5, 46.3, -153.5, 59.2], 21, 'gold', 's', { back: 'n', depth: 6.5 }),
  // Between the one-way pair: either side of the plaza, east of the axis's lanes (the slivers west of them are café terraces)
  design('n1a', 'uptown-n1', 'deco', [-136.5, 1, -127, 12.2], 30, 'stone', 's'),
  design('n1b', 'uptown-n1', 'slab', [-125, 1, -115.5, 12.2], 32, 'blue', 's'),
  design('m1', PLAZA_BLOCK, 'spire', SPIRE_LOT, TALLEST.roof, 'silver', 'w'),
  design('s1a', 'uptown-s1', 'slab', [-136.5, 46.3, -127, 57.8], 29, 'black', 's', { back: 'n', depth: 5.5 }),
  design('s1b', 'uptown-s1', 'round', [-125, 46.3, -115.5, 57.8], 27, 'gold', 's', { back: 'n', depth: 5.5 }),
  // Either side of the diagonal: the flatiron in its wedge
  design('n2a', 'uptown-n2e', 'deco', [-90.5, 1.5, -79, 13], 26, 'stone', 'n'),
  design('m2a', 'uptown-m2w', 'round', [-108.5, 20.5, -99, 30], 25, 'blue', 'w'),
  design('m2b', 'uptown-m2w', 'slab', [-107, 31.6, -93.5, 39.6], 22, 'gold', 's'),
  flatiron('m2c', 'uptown-m2e', 22, 'n'),
  design('s2a', 'uptown-s2', 'twin', [-108.5, 46.3, -88, 59.2], 26, 'silver', 's', { back: 'n', depth: 7.2 }),
  design('s2b', 'uptown-s2', 'slab', [-86, 46.3, -77.5, 59.2], 23, 'black', 's', { back: 'n', depth: 6.5 }),
  // Along the crescent
  design('n3a', 'uptown-n3', 'round', [-71, 1.5, -62.5, 13], 21, 'silver', 'w'),
  design('n4a', 'uptown-n4', 'slab', [-53, 1.5, -44.2, 13], 19, 'silver', 'n'),
  design('m3a', 'uptown-m3', 'slab', [-71, 20.5, -59, 29.5], 24, 'blue', 'w'),
  design('m3b', 'uptown-m3', 'deco', [-71, 31.3, -59, 39.6], 20, 'stone', 'w'),
  design('m4a', 'uptown-m4', 'twin', [-52.2, 20.5, -44.2, 39.5], 19, 'black', 'e'),
  design('s3a', 'uptown-s3', 'round', [-71, 46.3, -62.5, 58.5], 18, 'gold', 's', { back: 'n', depth: 6 }),
  design('s4a', 'uptown-s4', 'slab', [-53, 46.3, -44.2, 59], 17, 'blue', 's', { back: 'n', depth: 5.6 }),
];

/**
 * The helipad (finance plan Phase 6, the executive helicopter's: airfield.ts): a steel deck raised over the tallest
 * slab's plant room, as wide as its shaft (its mast left off for it, red lights at the deck's corners instead); `y`
 * is its deck's top over the ground (the slab's 0.15 under the towers, world.ts's SLAB, and the deck's legs)
 */
export const ROOF_PAD = (() => {
  const t = HIGHRISES.filter((h) => h.design === 'slab').sort((p, q) => q.roof - p.roof)[0];
  const shaft = t.parts[1];
  const [x0, z0, x1, z1] = shaft.rect;
  return { tower: t.id, x: (x0 + x1) / 2, z: (z0 + z1) / 2, half: Math.min(x1 - x0, z1 - z0) / 2 + 0.1, y: 0.15 + t.roof + 0.55 };
})();

/** A part's box for what's solid: a drum's and an octagon's drawn in a little at the corners */
export function partBox(p: Part): [number, number, number, number, number] {
  // (a podium set back over its ground floor: what's solid is its ground floor's)
  const [x0, z0, x1, z1] = p.foot ?? p.rect;
  const m = p.shape === 'drum' ? Math.min(x1 - x0, z1 - z0) * 0.08 : p.shape === 'oct' ? Math.min(x1 - x0, z1 - z0) * 0.04 : 0;
  return [x0 + m, z0 + m, x1 - m, z1 - m, p.y1];
}
/**
 * A part's box cut across its length into strips no wider than `STRIP` (as the kart park's grandstand): a car
 * started inside one is put out by its nearest side, a short push the collision grid's reach covers (drive-sim.ts)
 */
export const STRIP = 6;
export function partStrips(p: Part): [number, number, number, number, number][] {
  if (p.poly) {
    // A prism: thin strips across its length, each the bounds of the outline over it
    const [, z0, , z1] = p.rect;
    const n = Math.ceil((z1 - z0) / 1);
    return Array.from({ length: n }, (_, k): [number, number, number, number, number] => {
      const piece = clipZ(p.poly!, z0 + ((z1 - z0) * k) / n, z0 + ((z1 - z0) * (k + 1)) / n);
      const [a, b, c, d] = boundsOf(piece);
      return [a, b, c, d, p.y1];
    });
  }
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
export const HIGHRISE_SOLIDS: [number, number, number, number, number][] = [
  ...HIGHRISES.flatMap((t) => t.parts.flatMap(partStrips)),
  // (the columns along a set-back front, to the podium's top storey)
  ...HIGHRISES.flatMap((t) => t.columns.map(([x, z]): [number, number, number, number, number] => [x - GROUND.col / 2, z - GROUND.col / 2, x + GROUND.col / 2, z + GROUND.col / 2, GROUND.h])),
];
