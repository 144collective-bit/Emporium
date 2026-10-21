/*
 * Sector 7: the isometric night city on the homepage, drawn as one SVG
 * string at build time.
 *
 * Tile grid: x runs to the lower right of the screen, y to the lower left,
 * z is height. The street plan is the 3D city's downtown (layout.ts,
 * streetplan.ts, downtown.ts): 0-60 on both axes, two cross streets each way
 * and three diagonals, the blocks between them with their sidewalks, the
 * infill and its alleys, the pocket parks and the hangout square; everything
 * outside is parkland, a river and roads out of town. (The ring avenues and
 * plot districts are 3D only, so the diagonals simply run on out of town.)
 * The landmarks are drawn on their old drawing grid and moved onto their lots
 * like the 3D ones (`seat()`), so their numbers match landmarks.ts.
 *
 * Draw order is the painter's algorithm by block: everything in a block is
 * drawn by its block's (column + row, the cells between the cross streets),
 * and the cars on a road segment are
 * drawn right after the block behind that segment, so nothing on the street
 * ever paints over a building standing in front of it.
 */

import { CORE_ROADS, DOWNTOWN, LANE, RIVER, WALK_W, design, seat } from '../scripts/city3d/layout';
import { PLAN } from '../scripts/city3d/streetplan';
import { ALLEYS, DIAGONALS, INFILL, LANES, NAMED_SHOPS, PARKS, SHOP_H, SIGNS, SQUARE, WATER_TOWER, bodyOf, stoopOf, type Infill, type InfillType, type SignId } from '../scripts/city3d/downtown';

/** The places with a pin (the kart park exists in 3D only: the 2D map draws nothing for it) */
export type SpotId = 'emporium' | 'shop' | 'workshop' | 'vault' | 'signal' | 'telegram' | 'plan' | 'apartments' | 'karts';

export interface Spot {
  href: string;
  external?: boolean;
  /** Pin title and subline */
  title: string;
  sub: string;
  /** Accessible name of the building link */
  aria: string;
}

export interface CityInput {
  spots: Record<SpotId, Spot>;
  art: { degen: string; logo: string };
}

/* ---------- Projection ---------- */

const TW = 96; // tile width on screen
const TH = 48; // tile height on screen
const ZH = 24; // screen px per unit of height
const TL = 53.67; // face-local units per tile (one tile's edge length on screen)
const K = 0.8944; // cos/sin of the 2:1 iso edge
const Q = 0.4472;

/** The map's viewBox: downtown (0-60) with a margin of parkland and the river along the bottom left */
export const VIEW = { x: -3240, y: -420, w: 6480, h: 3560 };

type Pt = [number, number];
/** Where the building being drawn moves from its drawing grid onto its block (see `onBlock`) */
let shift: Pt = [0, 0];
const P = (x: number, y: number, z = 0): Pt => {
  const X = x + shift[0];
  const Y = y + shift[1];
  return [((X - Y) * TW) / 2, ((X + Y) * TH) / 2 - z * ZH];
};
const n = (v: number) => +v.toFixed(1);
const pts = (...ps: Pt[]) => ps.map(([a, b]) => `${n(a)},${n(b)}`).join(' ');
const poly = (fill: string, ...ps: Pt[]) => `<polygon points="${pts(...ps)}" fill="${fill}"/>`;
const line = (a: Pt, b: Pt, cls = '') =>
  `<line x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0])}" y2="${n(b[1])}"${cls ? ` class="${cls}"` : ''}/>`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** 2D drawing spaces laid onto a face: 1 local unit is about 1 screen px. */
const mat = (a: number, b: number, c: number, d: number, [e, f]: Pt) => `matrix(${a},${b},${c},${d},${n(e)},${n(f)})`;
/** Front-left face (constant y), origin at its top-left corner, +u along +x. */
const onL = (x: number, y: number, z: number) => mat(K, Q, 0, 1, P(x, y, z));
/** Front-right face (constant x), origin at its top-left (front) corner, +u along -y. */
const onR = (x: number, y: number, z: number) => mat(K, -Q, 0, 1, P(x, y, z));
/** Ground plane, +u along +x, +v along +y, TL units per tile. */
const onT = (x: number, y: number, z: number) => mat(K, Q, -K, Q, P(x, y, z));
const g = (transform: string, body: string, cls = '') =>
  `<g transform="${transform}"${cls ? ` class="${cls}"` : ''}>${body}</g>`;

/* ---------- Colour ---------- */

const INK = '#05050a';
const hex = (c: string) => {
  const v = parseInt(c.slice(1), 16);
  return [v >> 16, (v >> 8) & 255, v & 255];
};
const mix = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
/** Night shading: tops catch the light, right faces fall into violet shadow. */
const shade = (c: string) => ({ top: mix(c, '#ffffff', 0.16), left: c, right: mix(c, '#140a33', 0.4) });

const C = {
  grassOut: '#0d2a2b',
  grass: '#134238',
  grassHi: '#1a5245',
  asphalt: '#191730',
  lane: '#f5d76e',
  sidewalk: '#3d3570',
  plaza: '#2b2558',
  concrete: '#262247',
  dirt: '#3a2a35',
  water: '#123a6b',
  trunk: '#5b3a29',
  greens: ['#1f9d6a', '#22a873', '#178a5b'],
  pine: '#137a55',
  warm: '#ffd36b',
  cyan: '#7cf4ff',
  pink: '#ff8ae6',
  darkWin: '#17132e',
  glass: '#8fe7ff',
};

/* ---------- Deterministic randomness ---------- */

let seed = 144;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];

/* ---------- Primitives ---------- */

const Z0 = 0.22; // top of a block's slab

interface Box {
  c: string;
  z?: number;
  top?: string;
  left?: string;
  right?: string;
}

/** An inked box: front-left, front-right and top faces. */
function prism(x: number, y: number, w: number, d: number, h: number, { c, z = 0, top, left, right }: Box) {
  const z1 = z + h;
  const s = shade(c);
  return (
    '<g class="ink">' +
    poly(left ?? s.left, P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z1), P(x, y + d, z1)) +
    poly(right ?? s.right, P(x + w, y + d, z), P(x + w, y, z), P(x + w, y, z1), P(x + w, y + d, z1)) +
    poly(top ?? s.top, P(x, y, z1), P(x + w, y, z1), P(x + w, y + d, z1), P(x, y + d, z1)) +
    '</g>'
  );
}

/** An upright cylinder of radius r tiles. */
function cyl(x: number, y: number, r: number, h: number, { c, z = 0, top }: Box) {
  const [cx, yb] = P(x, y, z);
  const yt = yb - h * ZH;
  const rx = r * 67.88;
  const ry = r * 33.94;
  const s = shade(c);
  const side = `M${n(cx - rx)},${n(yt)}V${n(yb)}A${n(rx)},${n(ry)} 0 0 0 ${n(cx + rx)},${n(yb)}V${n(yt)}Z`;
  return (
    '<g class="ink">' +
    `<path d="${side}" fill="${s.left}"/>` +
    `<path d="M${n(cx)},${n(yt)}V${n(yb + ry)}A${n(rx)},${n(ry)} 0 0 0 ${n(cx + rx)},${n(yb)}V${n(yt)}Z" fill="${s.right}" stroke="none"/>` +
    `<path d="${side}" fill="none"/>` +
    `<ellipse cx="${n(cx)}" cy="${n(yt)}" rx="${n(rx)}" ry="${n(ry)}" fill="${top ?? s.top}"/>` +
    '</g>'
  );
}

interface WinOpts {
  mx?: number;
  mt?: number;
  mb?: number;
  gx?: number;
  gy?: number;
  lit?: number;
  pal?: string[];
}

/** A grid of windows in face-local space, some lit, a few flickering. */
function windows(W: number, H: number, cols: number, rows: number, o: WinOpts = {}) {
  const { mx = 8, mt = 8, mb = 8, gx = 6, gy = 7, lit = 0.6, pal = [C.warm] } = o;
  const ww = (W - 2 * mx - gx * (cols - 1)) / cols;
  const wh = (H - mt - mb - gy * (rows - 1)) / rows;
  let s = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const on = rand() < lit;
      const flick = on && rand() < 0.12 ? ` class="flick" style="animation-delay:-${n(rand() * 9)}s"` : '';
      s += `<rect x="${n(mx + c * (ww + gx))}" y="${n(mt + r * (wh + gy))}" width="${n(ww)}" height="${n(wh)}" rx="1.5" fill="${on ? pick(pal) : C.darkWin}"${flick}/>`;
    }
  }
  return `<g class="wins">${s}</g>`;
}
/** Windows across the front-left face of a box. */
const winL = (x: number, y: number, w: number, d: number, h: number, z: number, cols: number, rows: number, o?: WinOpts) =>
  g(onL(x, y + d, z + h), windows(w * TL, h * ZH, cols, rows, o));
/** Windows across the front-right face of a box. */
const winR = (x: number, y: number, w: number, d: number, h: number, z: number, cols: number, rows: number, o?: WinOpts) =>
  g(onR(x + w, y + d, z + h), windows(d * TL, h * ZH, cols, rows, o));

const text = (x: number, y: number, s: string, size: number, cls: string, fill = '#fff', extra = '') =>
  `<text x="${n(x)}" y="${n(y)}" font-size="${size}" class="${cls}" fill="${fill}" text-anchor="middle"${extra}>${esc(s)}</text>`;

function tree(x: number, y: number, z = Z0, s = 0.8 + rand() * 0.4, kind = rand() < 0.3 ? 'pine' : 'round') {
  const [cx, cy] = P(x, y, z);
  let out = `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(18 * s)}" ry="${n(9 * s)}" fill="#000" opacity=".35"/><g class="ink">`;
  if (kind === 'pine') {
    out +=
      `<rect x="${n(cx - 3 * s)}" y="${n(cy - 14 * s)}" width="${n(6 * s)}" height="${n(14 * s)}" fill="${C.trunk}"/>` +
      poly(C.pine, [cx - 17 * s, cy - 12 * s], [cx + 17 * s, cy - 12 * s], [cx, cy - 46 * s]) +
      poly(mix(C.pine, '#ffffff', 0.12), [cx - 13 * s, cy - 30 * s], [cx + 13 * s, cy - 30 * s], [cx, cy - 62 * s]);
  } else {
    const c = pick(C.greens);
    out +=
      `<rect x="${n(cx - 3 * s)}" y="${n(cy - 20 * s)}" width="${n(6 * s)}" height="${n(20 * s)}" fill="${C.trunk}"/>` +
      `<circle cx="${n(cx)}" cy="${n(cy - 33 * s)}" r="${n(17 * s)}" fill="${c}"/>` +
      `<circle cx="${n(cx - 6 * s)}" cy="${n(cy - 39 * s)}" r="${n(6 * s)}" fill="${mix(c, '#ffffff', 0.25)}" stroke="none"/>`;
  }
  return out + '</g>';
}

function lamp(x: number, y: number, z = Z0) {
  const [cx, cy] = P(x, y, z);
  const top = cy - 58;
  return (
    `<ellipse cx="${n(cx + 10)}" cy="${n(cy + 2)}" rx="40" ry="20" fill="url(#pool)"/>` +
    `<g class="ink"><line x1="${n(cx)}" y1="${n(cy)}" x2="${n(cx)}" y2="${n(top)}" stroke-width="4"/>` +
    `<path d="M${n(cx)},${n(top)}q0,-8 12,-8" fill="none" stroke-width="3"/>` +
    `<rect x="${n(cx + 6)}" y="${n(top - 12)}" width="14" height="6" rx="2" fill="#1b1830"/></g>` +
    `<circle cx="${n(cx + 13)}" cy="${n(top - 4)}" r="16" fill="url(#lampGlow)" class="lamp-glow"/>` +
    `<circle cx="${n(cx + 13)}" cy="${n(top - 5)}" r="3" fill="#fff4c2"/>`
  );
}

const bench = (x: number, y: number, axis: 'x' | 'y' = 'x') =>
  axis === 'x'
    ? prism(x, y, 0.9, 0.3, 0.25, { c: '#6b4a8f', z: Z0 })
    : prism(x, y, 0.3, 0.9, 0.25, { c: '#6b4a8f', z: Z0 });

/* ---------- Depth-sorted scene items ---------- */

interface Item {
  cell: number;
  car: number;
  d: number;
  svg: string;
}
let items: Item[] = [];
/** Which block row / column a coordinate is in: the cells between the cross streets (17, 43), one cross street apart on out */
const PITCH = CORE_ROADS[1] - CORE_ROADS[0];
const cellOf = (t: number) => Math.floor((t - CORE_ROADS[0] + PITCH) / PITCH);
const add = (x: number, y: number, svg: string) => {
  const [X, Y] = [x + shift[0], y + shift[1]];
  items.push({ cell: cellOf(X) + cellOf(Y), car: 0, d: X + Y, svg });
};
/** Draw one landmark (written on the old grid, block origin `ox, oy` there) onto its lot today */
function onBlock(ox: number, oy: number, draw: () => void) {
  shift = seat(ox + 1, oy + 1);
  draw();
  shift = [0, 0];
}

/* ---------- Ground: roads, river, block slabs ---------- */

const ROADS = CORE_ROADS;
/** Half a street's asphalt */
const RH = LANE;
const EXT: [number, number] = [-50, 130];
/** The street runs between crossings (each crossing and its crosswalks left clear) */
const RUNS: [number, number][] = [EXT[0], ...ROADS.flatMap((r) => [r - RH - 1.1, r + RH + 1.1]), EXT[1]].reduce<[number, number][]>(
  (out, v, k, all) => (k % 2 ? [...out, [all[k - 1], v]] : out),
  []
);

function crosswalk(along: 'x' | 'y', at: number, road: number) {
  let s = '';
  for (let k = 0; k < 10; k++) {
    const a = road - RH + 0.15 + k * 0.32;
    const b = a + 0.17;
    s +=
      along === 'x'
        ? poly('#d9d4ef', P(at, a, 0), P(at + 0.6, a, 0), P(at + 0.6, b, 0), P(at, b, 0))
        : poly('#d9d4ef', P(a, at, 0), P(b, at, 0), P(b, at + 0.6, 0), P(a, at + 0.6, 0));
  }
  return s;
}

/** Where each landmark's lot is, by its old block (layout.ts SEATS) */
const SEAT_LOTS: Record<string, Pt> = Object.fromEntries(['11,0', '22,0', '0,11', '11,11', '22,11', '11,22', '22,22', '0,22'].map((k) => {
  const [bx, by] = k.split(',').map(Number);
  const [dx, dy] = seat(bx + 1, by + 1);
  return [k, [bx + dx, by + dy] as Pt];
}));

/** A raised outline (a block with its sidewalk): the sides that face the viewer, then its top */
function slab(outline: Pt[]) {
  let s = '<g class="ink">';
  const m = outline.length;
  for (let i = 0; i < m; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % m];
    // The outward side of a counter-clockwise outline is to the right of travel
    const nx = -(b[1] - a[1]);
    const ny = b[0] - a[0];
    if (nx + ny <= 0) continue;
    s += poly(nx > ny ? mix(C.sidewalk, '#140a33', 0.4) : C.sidewalk, P(a[0], a[1], 0), P(b[0], b[1], 0), P(b[0], b[1], Z0), P(a[0], a[1], Z0));
  }
  s += poly(mix(C.sidewalk, '#ffffff', 0.16), ...outline.map(([x, y]) => P(x, y, Z0))) + '</g>';
  return s;
}
/** An outline pulled in by d (counter-clockwise, corners mitred) */
function inset(outline: Pt[], d: number): Pt[] {
  const m = outline.length;
  return outline.map((p, i) => {
    const a = outline[(i + m - 1) % m];
    const b = outline[(i + 1) % m];
    const l0 = Math.hypot(p[0] - a[0], p[1] - a[1]);
    const l1 = Math.hypot(b[0] - p[0], b[1] - p[1]);
    // Inward normals: to the left of travel
    const n0 = [(p[1] - a[1]) / l0, -(p[0] - a[0]) / l0];
    const n1 = [(b[1] - p[1]) / l1, -(b[0] - p[0]) / l1];
    const k = d / (1 + n0[0] * n1[0] + n0[1] * n1[1]);
    return [p[0] + (n0[0] + n1[0]) * k, p[1] + (n0[1] + n1[1]) * k] as Pt;
  });
}

function ground(lots: Record<string, string>) {
  const [e0, e1] = EXT;
  let s = `<rect x="${VIEW.x}" y="${VIEW.y}" width="${VIEW.w}" height="${VIEW.h}" fill="${C.grassOut}"/>`;

  // River along the bottom-left, with a shimmer and banks
  const [r0, r1] = RIVER;
  s += `<g class="ink">${poly(C.water, P(e0, r0), P(e1, r0), P(e1, r1), P(e0, r1))}</g>`;
  for (let k = 0; k < 4; k++) {
    const y = r0 + 0.6 + k * 0.6;
    s += line(P(e0, y), P(e1, y), `shimmer shimmer-${k % 2}`);
  }

  // Asphalt (the diagonals run on out of town past downtown's corners), then lane dashes between the intersections, then crosswalks
  for (const r of ROADS) {
    s += `<g class="road">${poly(C.asphalt, P(e0, r - RH), P(e1, r - RH), P(e1, r + RH), P(e0, r + RH))}</g>`;
    s += `<g class="road">${poly(C.asphalt, P(r - RH, e0), P(r + RH, e0), P(r + RH, e1), P(r - RH, e1))}</g>`;
  }
  for (const d of DIAGONALS) {
    const [jx, jy] = d.to;
    const l = Math.hypot(d.from[0] - jx, d.from[1] - jy);
    const [ux, uy] = [(d.from[0] - jx) / l, (d.from[1] - jy) / l];
    const far: Pt = [jx + ux * (l + 40), jy + uy * (l + 40)];
    // Wide enough to fill the corners where its sidewalks meet the cross streets' (the slabs cover the rest)
    const w = RH + WALK_W + 0.6;
    const [nx, ny] = [-uy * w, ux * w];
    s += `<g class="road">${poly(C.asphalt, P(jx + nx, jy + ny), P(far[0] + nx, far[1] + ny), P(far[0] - nx, far[1] - ny), P(jx - nx, jy - ny))}</g>`;
    s += line(P(jx + ux * 3.6, jy + uy * 3.6), P(far[0], far[1]), 'lane');
  }
  for (const r of ROADS) {
    for (const [a, b] of RUNS) {
      s += line(P(a, r), P(b, r), 'lane') + line(P(r, a), P(r, b), 'lane');
    }
    for (const r2 of ROADS) {
      // Crosswalks on every arm of the crossing (r2, r) across the road at y = r, and of (r, r2)
      // across the road at x = r; none on the two arms a diagonal comes in between
      const from = (x: number, y: number) => DIAGONALS.find((d) => d.to[0] === x && d.to[1] === y)?.from;
      const dx = Math.sign((from(r2, r)?.[0] ?? r2) - r2);
      const dy = Math.sign((from(r, r2)?.[1] ?? r2) - r2);
      if (dx !== -1) s += crosswalk('x', r2 - RH - 0.95, r);
      if (dx !== 1) s += crosswalk('x', r2 + RH + 0.35, r);
      if (dy !== -1) s += crosswalk('y', r2 - RH - 0.95, r);
      if (dy !== 1) s += crosswalk('y', r2 + RH + 0.35, r);
    }
  }

  // Bridges where the streets cross the river: sidewalks either side, then rails
  for (const r of ROADS) {
    const w = RH + WALK_W;
    for (const [a, b] of [
      [r - w, r - RH],
      [r + RH, r + w],
    ])
      s += `<g class="ink">${poly(C.sidewalk, P(a, r0 - 0.6), P(b, r0 - 0.6), P(b, r1 + 0.6), P(a, r1 + 0.6))}</g>`;
    for (const side of [r - w, r + w]) {
      s += `<g class="ink rail">${line(P(side, r0 - 0.6, 0.45), P(side, r1 + 0.6, 0.45))}</g>`;
      for (let y = r0 - 0.6; y <= r1 + 0.61; y += 0.75) s += `<g class="ink rail">${line(P(side, y, 0), P(side, y, 0.45))}</g>`;
    }
  }

  // Downtown's block slabs (the curb with its sidewalk) and their lots
  PLAN.blocks.forEach((blk, i) => {
    if (!blk.id.startsWith('dt-')) return;
    s += slab(PLAN.slabs[i]);
    const lot = inset(blk.poly, 0.4).map(([x, y]) => P(x, y, Z0));
    s += `<polygon points="${pts(...lot)}" fill="${lots[blk.id] ?? (blk.use === 'park' ? C.grass : 'url(#paving)')}" class="lot"/>`;
  });
  // The landmarks' own lots inside their blocks
  for (const [k, fill] of Object.entries(lots)) {
    const at = SEAT_LOTS[k];
    if (!at) continue;
    const [ox, oy] = at;
    const i = 0.2;
    s += `<polygon points="${pts(P(ox + i, oy + i, Z0), P(ox + 9 - i, oy + i, Z0), P(ox + 9 - i, oy + 9 - i, Z0), P(ox + i, oy + 9 - i, Z0))}" fill="${fill}" class="lot"/>`;
  }
  return s;
}

/** Trees across the parkland outside town, kept off the roads and the river. */
function outskirts() {
  const step = 1.7;
  for (let gx = EXT[0]; gx < EXT[1]; gx += step) {
    for (let gy = EXT[0]; gy < EXT[1]; gy += step) {
      if (rand() > 0.32) continue;
      const x = gx + rand() * step;
      const y = gy + rand() * step;
      const core = [-WALK_W - 0.4, DOWNTOWN + WALK_W + 0.4];
      if (x > core[0] && x < core[1] && y > core[0] && y < core[1]) continue;
      if (ROADS.some((r) => Math.abs(y - r) < RH + 0.9 || Math.abs(x - r) < RH + 0.9)) continue;
      // Off the diagonals running out of town
      if (DIAGONALS.some((d) => (x - d.to[0]) * (d.from[0] - d.to[0]) + (y - d.to[1]) * (d.from[1] - d.to[1]) > 0 && Math.abs((x - d.to[0]) * (d.from[1] - d.to[1]) - (y - d.to[1]) * (d.from[0] - d.to[0])) / Math.hypot(d.from[0] - d.to[0], d.from[1] - d.to[1]) < RH + WALK_W + 1.2)) continue;
      if (y > RIVER[0] - 0.9 && y < RIVER[1] + 0.6) continue;
      const [sx, sy] = P(x, y);
      if (sx < VIEW.x - 30 || sx > VIEW.x + VIEW.w + 30 || sy < VIEW.y + 40 || sy > VIEW.y + VIEW.h + 70) continue;
      add(x, y, tree(x, y, 0));
    }
  }
}

/* ---------- Cars ---------- */

const CAR_COLORS = ['#e23b3b', '#ffd23f', '#00c2ff', '#e219e5', '#f3f2f7', '#1fbf6b', '#ff8a3d'];
/** Where a car's road is cut into segments (one copy per segment): the cross streets, and on out a cell apart */
const BOUNDS = [-2, -1, 0, 1, 2, 3, 4].map((k) => ROADS[0] + k * PITCH);

function carSprite(axis: 'x' | 'y', c: string, dir: number) {
  // Sized like the 3D city's cars: about 2.3 long and 1 wide, in a 1.7-wide lane
  const [w, d] = axis === 'x' ? [2.3, 0.98] : [0.98, 2.3];
  let s = prism(-w / 2, -d / 2, w, d, 0.62, { c, z: 0.08 });
  const [cw, cd] = axis === 'x' ? [w * 0.5, d * 0.84] : [w * 0.84, d * 0.5];
  const cx = axis === 'x' ? (dir > 0 ? -w / 2 + 0.3 : w / 2 - 0.3 - cw) : -cw / 2;
  const cy = axis === 'y' ? (dir > 0 ? -d / 2 + 0.3 : d / 2 - 0.3 - cd) : -cd / 2;
  s += prism(cx, cy, cw, cd, 0.45, { c, z: 0.7, left: C.glass, right: mix(C.glass, '#140a33', 0.45) });
  // Head- or tail-lights on whichever end faces the viewer
  const lights = dir > 0 ? '#fff2a8' : '#ff3b3b';
  const end = 0.98 * TL;
  const lamps = `<circle cx="${n(end * 0.2)}" cy="5" r="3.4" fill="${lights}"/><circle cx="${n(end * 0.8)}" cy="5" r="3.4" fill="${lights}"/>`;
  s += axis === 'x' ? g(onR(w / 2, d / 2, 0.52), lamps) : g(onL(-w / 2, d / 2, 0.52), lamps);
  return s;
}

/**
 * One car driving the full length of a road. It is drawn once per road
 * segment, each copy visible only while the car is on that segment, so each
 * copy can sit at the right depth between the blocks either side.
 */
function car(axis: 'x' | 'y', lane: number, dir: number, color: string, phase: number, speed = 1.6) {
  const a0 = BOUNDS[0];
  const a1 = BOUNDS[BOUNDS.length - 1];
  const L = a1 - a0;
  const T = n(L / speed);
  const road = ROADS.find((r) => Math.abs(r - lane) < 1.2)!;
  const roadCell = cellOf(road - 0.5);
  const sprite = carSprite(axis, color, dir);
  const at = (t: number) => (axis === 'x' ? P(t, lane) : P(lane, t));
  const r4 = (v: number) => +v.toFixed(4);

  for (let k = 0; k < BOUNDS.length - 1; k++) {
    const s = BOUNDS[k];
    const e = BOUNDS[k + 1];
    const t0 = r4((dir > 0 ? s - a0 : a1 - e) / L);
    const t1 = r4(t0 + (e - s) / L);
    const [A, B] = dir > 0 ? [at(s), at(e)] : [at(e), at(s)];
    const kp = [0];
    const kt = [0];
    if (t0 > 0) kp.push(0), kt.push(t0);
    kp.push(1), kt.push(t1 >= 1 ? 1 : t1);
    if (t1 < 1) kp.push(1), kt.push(1);
    let op = '';
    if (t0 > 0 && t1 < 1) op = `values="0;1;0" keyTimes="0;${t0};${t1}"`;
    else if (t0 > 0) op = `values="0;1" keyTimes="0;${t0}"`;
    else if (t1 < 1) op = `values="1;0" keyTimes="0;${t1}"`;
    const timing = `dur="${T}s" begin="-${n(phase * T)}s" repeatCount="indefinite"`;
    const svg =
      `<g opacity="0">` +
      `<animateMotion ${timing} calcMode="linear" keyPoints="${kp.join(';')}" keyTimes="${kt.join(';')}" path="M${pts(A)} L${pts(B)}"/>` +
      (op ? `<animate attributeName="opacity" ${timing} calcMode="discrete" ${op}/>` : '') +
      sprite +
      `</g>`;
    items.push({ cell: cellOf((s + e) / 2) + roadCell, car: 1, d: 0, svg });
  }
}

function traffic() {
  let i = 0;
  for (const r of ROADS) {
    // Right-hand traffic: heading +x keeps to the +y lane, heading +y to the -x lane
    for (const [lane, dir] of [
      [r + LANE / 2, 1],
      [r - LANE / 2, -1],
    ]) {
      car('x', lane, dir, CAR_COLORS[i++ % CAR_COLORS.length], rand());
      car('x', lane, dir, CAR_COLORS[i++ % CAR_COLORS.length], rand(), 1.3);
    }
    for (const [lane, dir] of [
      [r - LANE / 2, 1],
      [r + LANE / 2, -1],
    ]) {
      car('y', lane, dir, CAR_COLORS[i++ % CAR_COLORS.length], rand());
      car('y', lane, dir, CAR_COLORS[i++ % CAR_COLORS.length], rand(), 1.3);
    }
  }
}

/* ---------- Buildings ---------- */

let pins = '';
let fx = '';

function spot(id: SpotId, s: Spot, body: string) {
  const ext = s.external ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<a class="spot" data-spot="${id}" href="${esc(s.href)}"${ext} aria-label="${esc(s.aria)}"><g class="lift" aria-hidden="true">${body}</g></a>`;
}

function pin(id: SpotId, s: Spot, [x, y]: Pt) {
  const w = Math.round(Math.max(s.title.length * 12.6, s.sub.length * 7.8) + 32);
  const h = 52;
  const ext = s.external ? ' target="_blank" rel="noopener noreferrer"' : '';
  pins +=
    `<a class="pin" data-spot="${id}" href="${esc(s.href)}"${ext} tabindex="-1" aria-hidden="true">` +
    `<g transform="translate(${n(x)},${n(y)})"><g class="pin-bob" style="animation-delay:-${n(rand() * 3)}s">` +
    `<line class="pin-stem" x1="0" y1="0" x2="0" y2="-30"/><circle class="pin-dot" r="5"/>` +
    `<rect class="pin-card" x="${-w / 2}" y="${-30 - h}" width="${w}" height="${h}" rx="8"/>` +
    `<text class="pin-title" y="${-30 - h + 25}" text-anchor="middle">${esc(s.title)}</text>` +
    `<text class="pin-sub" y="${-30 - 11}" text-anchor="middle">${esc(s.sub)}</text>` +
    `</g></g></a>`;
}

/* ---------- Downtown round the landmarks (downtown.ts) ---------- */

const AWNINGS = ['#e23b3b', '#ffd23f', '#00c2ff', '#e219e5', '#1fbf6b', '#ff8a3d'];

/** Each type's wall colours (as in the 3D city's atlas) */
const TYPE_WALLS: Record<InfillType, string[]> = {
  brownstone: ['#6b4636', '#7a3b38'],
  shop: ['#2f6b6b', '#8c4466', '#4f3d8a', '#7a3b38'],
  diner: ['#c9c4e6'],
  loft: ['#4a2f35'],
  office: ['#1d5a5f'],
  hotel: ['#8a5a4a'],
};

/** A sign board on a face the viewer sees: on the +y face (left on screen) or the +x face (right), `u` along it from its left end */
function board(face: 'y' | 'x', x: number, y: number, z: number, len: number, h: number, id: SignId) {
  const sg = SIGNS[id];
  const W = len * TL;
  const H = h * ZH;
  const body =
    `<rect width="${n(W)}" height="${n(H)}" rx="3" fill="#0d0b1c" stroke="${sg.color}" stroke-width="2.5"/>` +
    text(W / 2, H * 0.72, sg.name, Math.min(H * 0.62, (W * 1.5) / sg.name.length), 't-display', sg.color);
  return face === 'y' ? g(onL(x, y, z), body) : g(onR(x, y, z), body);
}

/** An infill building, by its type: the body with windows on the faces the viewer sees, its signs, its front and roof details */
function infill(f: Infill) {
  const [x0, y0, x1, y1] = bodyOf(f);
  const w = x1 - x0;
  const d = y1 - y0;
  const r = (k: number) => ((f.seed * 9301 + k * 49297) % 233280) / 233280;
  const walls = TYPE_WALLS[f.type];
  const c = walls[Math.floor(r(1) * walls.length)];
  const top = Z0 + f.h;
  const pal = [C.warm, C.cyan, C.pink];
  const up = f.type === 'shop' ? 1.7 : 1.3;
  const rows = Math.max(1, f.floors);
  let b = '';
  if (f.type === 'office') {
    // A podium, the glass tower set back on it, a lit crown and a mast
    const pod = SHOP_H + 1;
    b += prism(x0, y0, w, d, pod, { c, z: Z0 });
    b += winL(x0, y0, w, d, pod, Z0, Math.max(2, Math.round(w / 0.6)), 2, { lit: 0.6, pal: ['#cfe8ff', C.cyan] });
    b += winR(x0, y0, w, d, pod, Z0, Math.max(2, Math.round(d / 0.6)), 2, { lit: 0.6, pal: ['#cfe8ff', C.cyan] });
    const [tx0, ty0, tx1, ty1] = [x0 + 0.35, y0 + 0.35, x1 - 0.35, y1 - 0.35];
    const th = f.h - pod;
    b += prism(tx0, ty0, tx1 - tx0, ty1 - ty0, th, { c: '#1d3a6b', z: Z0 + pod });
    b += winL(tx0, ty0, tx1 - tx0, ty1 - ty0, th, Z0 + pod, Math.max(3, Math.round((tx1 - tx0) / 0.4)), rows, { lit: 0.4, pal, gx: 2, gy: 3, mx: 4 });
    b += winR(tx0, ty0, tx1 - tx0, ty1 - ty0, th, Z0 + pod, Math.max(3, Math.round((ty1 - ty0) / 0.4)), rows, { lit: 0.4, pal, gx: 2, gy: 3, mx: 4 });
    b += `<polyline points="${pts(P(tx0, ty1, top + 0.15), P(tx1, ty1, top + 0.15), P(tx1, ty0, top + 0.15))}" fill="none" stroke="${C.cyan}" stroke-width="4" class="flick"/>`;
    const [mx, my] = P((tx0 + tx1) / 2, (ty0 + ty1) / 2, top);
    b += `<g class="ink">${line([mx, my], [mx, my - 1.2 * ZH], 'leg')}</g><circle cx="${n(mx)}" cy="${n(my - 1.2 * ZH)}" r="4" fill="#ff3b3b"/>`;
    add((x0 + x1) / 2, (y0 + y1) / 2, b);
    return;
  }
  b += prism(x0, y0, w, d, f.h, { c, z: Z0 });
  if (f.type === 'diner') {
    // Chrome above long lit windows, a pink neon line, the sign on the roof
    b += winL(x0, y0, w, d, 1.0, Z0 + 0.15, 1, 1, { lit: 1, pal: [C.warm], mt: 4, mb: 4, mx: 4 });
    b += winR(x0, y0, w, d, 1.0, Z0 + 0.15, 1, 1, { lit: 1, pal: [C.warm], mt: 4, mb: 4, mx: 4 });
    b += `<polyline points="${pts(P(x0, y1, Z0 + 1.35), P(x1, y1, Z0 + 1.35), P(x1, y0, Z0 + 1.35))}" fill="none" stroke="#ff3b8a" stroke-width="4"/>`;
    b += prism(x0 + 0.2, (y0 + y1) / 2, w - 0.4, 0.08, 0.7, { c: '#0d0b1c', z: top });
    b += board('y', x0 + 0.2, (y0 + y1) / 2 + 0.08, top + 0.7, w - 0.4, 0.6, 'diner');
    add((x0 + x1) / 2, (y0 + y1) / 2, b);
    return;
  }
  // Windows on the floors above the ground floor (tight margins on a one-floor building)
  const wallH = f.h - up - 0.3;
  const m = wallH < 1.2 ? { mt: 3, mb: 3, gy: 3 } : {};
  b += winL(x0, y0, w, d, wallH, Z0 + up, Math.max(2, Math.round(w / 0.75)), rows, { lit: 0.42, pal, ...m });
  b += winR(x0, y0, w, d, wallH, Z0 + up, Math.max(2, Math.round(d / 0.75)), rows, { lit: 0.42, pal, ...m });
  // A cornice on the faces the viewer sees
  b += `<polyline points="${pts(P(x0, y1, top - 0.25), P(x1, y1, top - 0.25), P(x1, y0, top - 0.25))}" fill="none" stroke="#d4bf9c" stroke-width="5" stroke-linecap="square"/>`;
  // The ground floor and the sign, on the front if the viewer sees it
  const sg = f.sign ? SIGNS[f.sign] : null;
  const awning = AWNINGS[f.seed % AWNINGS.length];
  if (f.face === 's' || f.face === 'e') {
    const glass = f.type === 'loft' ? '#8f8ab0' : f.type === 'hotel' ? '#cfe8ff' : C.warm;
    if (f.face === 's') {
      b += winL(x0, y0, w, d, 1.1, Z0, Math.max(1, Math.round(w / 1.4)), 1, { lit: 1, pal: [glass], mt: 6, mb: 4 });
      if (sg) b += board('y', x0 + 0.15, y1 + 0.02, Z0 + 1.7, w - 0.3, 0.42, f.sign!);
      if (f.type === 'shop') b += prism(x0 + 0.15, y1, w - 0.3, 0.45, 0.1, { c: awning, z: Z0 + 1.0 });
    } else {
      b += winR(x0, y0, w, d, 1.1, Z0, Math.max(1, Math.round(d / 1.4)), 1, { lit: 1, pal: [glass], mt: 6, mb: 4 });
      if (sg) b += board('x', x1 + 0.02, y1 - 0.15, Z0 + 1.7, d - 0.3, 0.42, f.sign!);
      if (f.type === 'shop') b += prism(x1, y0 + 0.15, 0.45, d - 0.3, 0.1, { c: awning, z: Z0 + 1.0 });
    }
    if (f.type === 'brownstone') {
      // The stoop
      const [sx0, sy0, sx1, sy1] = stoopOf(f);
      b += prism(sx0, sy0, sx1 - sx0, sy1 - sy0, 0.45, { c: '#8f7a8a', z: Z0 });
    }
  } else if (f.sign && NAMED_SHOPS.includes(f.sign)) {
    // Your shops face away from the map's view: their name stands on the roof too
    b += prism(x0 + 0.2, (y0 + y1) / 2, w - 0.4, 0.08, 0.55, { c: '#0d0b1c', z: top });
    b += board('y', x0 + 0.2, (y0 + y1) / 2 + 0.08, top + 0.55, w - 0.4, 0.5, f.sign);
  }
  // Something on the roof: a water tank, a garden's trees, or plant
  const pick = r(2);
  if (f !== WATER_TOWER) {
    if (pick < 0.3) b += cyl(x0 + w * 0.6, y0 + d * 0.45, 0.4, 0.8, { c: '#7a5a3c', z: top + 0.7 }) + `<g class="ink">${line(P(x0 + w * 0.6, y0 + d * 0.45, top), P(x0 + w * 0.6, y0 + d * 0.45, top + 0.7), 'leg')}</g>`;
    else if (pick < 0.55) b += tree(x0 + w * 0.3, y0 + d * 0.5, top, 0.5, 'round') + tree(x0 + w * 0.7, y0 + d * 0.5, top, 0.45, 'round');
    else b += prism(x0 + w * 0.3, y0 + d * 0.35, 0.6, 0.45, 0.36, { c: '#c9c4e6', z: top });
  }
  add((x0 + x1) / 2, (y0 + y1) / 2, b);
}

/** The GM water tower on its rooftop */
function waterTower(f: Infill) {
  const [x0, y0, x1, y1] = f.box;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const z = Z0 + f.h;
  const k = 0.72;
  let wt = '<g class="ink">';
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ])
    wt += line(P(cx + sx * 0.6 * k, cy + sy * 0.6 * k, z), P(cx + sx * 0.33 * k, cy + sy * 0.33 * k, z + 3 * k), 'leg');
  wt += '</g>' + cyl(cx, cy, 1.0 * k, 2.6 * k, { c: '#5d4f9a', z: z + 3 * k });
  const [tx, tt] = P(cx, cy, z + 5.6 * k);
  const [, apex] = P(cx, cy, z + 7.2 * k);
  wt += `<g class="ink"><path d="M${n(tx - 72 * k)},${n(tt)}A${n(72 * k)},${n(36 * k)} 0 0 0 ${n(tx + 72 * k)},${n(tt)}L${n(tx)},${n(apex)}Z" fill="#41377a"/></g>`;
  wt += text(tx, tt + 40 * k, 'GM', 30 * k, 't-display outlined', '#ff6ad5');
  // Drawn just after its building
  items.push({ cell: cellOf(cx) + cellOf(cy), car: 0, d: cx + cy + 0.01, svg: wt });
}

function downtown() {
  for (const f of INFILL) infill(f);
  waterTower(WATER_TOWER);
  // Bollards at the alleys' mouths
  for (const a of ALLEYS) for (const [x, y] of a.bollards) add(x, y, cyl(x, y, 0.09, 0.6, { c: '#1b1830', z: Z0 }));
  // Pocket parks: trees, benches and a lamp
  for (const p of PARKS) {
    for (const [x, y] of p.trees) add(x, y, tree(x, y));
    for (const q of p.benches) add(q.at[0], q.at[1], bench(q.at[0] - 0.45, q.at[1] - 0.15));
    for (const [x, y] of p.lamps) add(x, y, lamp(x, y));
  }
  // The courtyard lanes: a planted tree or two
  for (const [x0, y0, x1, y1] of LANES) if (x1 - x0 > y1 - y0) for (const x of [x0 + 1.2, x1 - 1.2]) add(x, y0 + 0.35, tree(x, y0 + 0.35, Z0, 0.6, 'round'));

  // The hangout square: an open plaza with the fountain, kiosks, trees and benches
  const sq = SQUARE;
  const f = sq.fountain;
  add(f.at[0], f.at[1], cyl(f.at[0], f.at[1], f.r, 0.45, { c: '#8f8ab0', z: Z0 }) + cyl(f.at[0], f.at[1], 0.16, 1.2, { c: '#a9a4c9', z: Z0 + 0.45 }));
  sq.kiosks.forEach(([x0, y0, x1, y1], i) => add((x0 + x1) / 2, (y0 + y1) / 2, prism(x0, y0, x1 - x0, y1 - y0, 1.6, { c: '#2b2550', z: Z0 }) + prism(x0 - 0.2, y0 - 0.2, x1 - x0 + 0.4, y1 - y0 + 0.4, 0.15, { c: ['#e219e5', '#00c2ff'][i], z: Z0 + 1.6 })));
  for (const [x, y] of sq.trees) add(x, y, prism(x - 0.45, y - 0.45, 0.9, 0.9, 0.5, { c: '#6e6a8c', z: Z0 }) + tree(x, y, Z0 + 0.5, 0.95, 'round'));
  for (const q of sq.benches) add(q.at[0], q.at[1], bench(q.at[0] - 0.45, q.at[1] - 0.15));
}

/** Block (1,0): the signal tower and studio, linking to X. */
function signal(s: Spot) {
  let b = prism(11.8, 4.6, 3.8, 3.4, 3.2, { c: '#2b2d3a', z: Z0 });
  b += winR(11.8, 4.6, 3.8, 3.4, 3.2, Z0, 3, 2, { mt: 10, pal: [C.cyan, C.warm] });
  const W = 3.8 * TL;
  b += g(
    onL(11.8, 8.0, Z0 + 3.2),
    `<rect x="10" y="10" width="${n(W - 70)}" height="30" rx="3" fill="#0b0a18" stroke="${INK}" stroke-width="2"/>` +
      text((W - 60) / 2 + 5, 33, 'SIGNAL', 24, 't-display neon', '#7cf4ff') +
      `<rect x="${n(W - 52)}" y="8" width="40" height="40" rx="6" fill="#0b0a18" stroke="${INK}" stroke-width="2"/>` +
      `<path transform="translate(${n(W - 44)},16) scale(1)" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="#fff"/>` +
      `<rect x="18" y="50" width="34" height="26" rx="2" fill="${C.warm}" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="${n(W / 2 - 14)}" y="44" width="28" height="33" fill="#0b0a18" stroke="${INK}" stroke-width="2"/>`
  );
  // Dish on the roof
  const [dx, dy] = P(13.2, 5.6, Z0 + 3.2);
  b += `<g class="ink"><line x1="${n(dx)}" y1="${n(dy)}" x2="${n(dx)}" y2="${n(dy - 18)}"/><ellipse cx="${n(dx)}" cy="${n(dy - 26)}" rx="18" ry="11" fill="#d9d4ef" transform="rotate(-25 ${n(dx)} ${n(dy - 26)})"/></g>`;

  // Lattice tower, red and white
  const top = 15;
  const at = (cx: number, cy: number, z: number) => {
    const t = (z - Z0) / (top - Z0);
    const k = 1 - t * 0.82;
    return P(17.2 + (cx - 17.2) * k, 3.4 + (cy - 3.4) * k, z);
  };
  let tw = '<g class="tower">';
  const base: [number, number][] = [
    [16.2, 2.4],
    [18.2, 2.4],
    [16.2, 4.4],
    [18.2, 4.4],
  ];
  for (const [x, y] of base) tw += ['tw-leg', 'tw-white', 'tw-stripe'].map((c) => line(at(x, y, Z0), at(x, y, top), c)).join('');
  for (let z = 2.5; z < top; z += 2.5) {
    tw += line(at(16.2, 4.4, z), at(18.2, 4.4, z), 'tw-brace') + line(at(18.2, 2.4, z), at(18.2, 4.4, z), 'tw-brace');
    tw += line(at(16.2, 4.4, z - 2.5), at(18.2, 4.4, z), 'tw-brace') + line(at(18.2, 4.4, z - 2.5), at(18.2, 2.4, z), 'tw-brace');
  }
  const [tx, ty] = P(17.2, 3.4, top);
  tw += `</g><g class="ink"><line x1="${n(tx)}" y1="${n(ty)}" x2="${n(tx)}" y2="${n(ty - 40)}" stroke-width="4"/></g>`;
  for (let k = 0; k < 3; k++) {
    tw +=
      `<ellipse cx="${n(tx)}" cy="${n(ty - 40)}" rx="8" ry="4" class="ring">` +
      `<animate attributeName="rx" values="8;110" dur="3.6s" begin="-${k * 1.2}s" repeatCount="indefinite"/>` +
      `<animate attributeName="ry" values="4;55" dur="3.6s" begin="-${k * 1.2}s" repeatCount="indefinite"/>` +
      `<animate attributeName="opacity" values=".9;0" dur="3.6s" begin="-${k * 1.2}s" repeatCount="indefinite"/></ellipse>`;
  }
  tw += `<circle cx="${n(tx)}" cy="${n(ty - 42)}" r="14" fill="url(#redGlow)" class="beacon"/><circle cx="${n(tx)}" cy="${n(ty - 42)}" r="4.5" fill="#ff3b3b" stroke="${INK}" stroke-width="2"/>`;

  add(16, 4.4, spot('signal', s, b + tw));
  pin('signal', s, P(17.2, 3.4, top + 3.4));

  for (const [x, y] of [
    [12.2, 1.4],
    [13.6, 1.2],
    [15.0, 1.3],
    [19.4, 6.4],
    [19.3, 7.9],
    [16.6, 8.4],
  ])
    add(x, y, tree(x, y));
  add(15.8, 8.6, lamp(15.8, 8.6));
}

/** Block (2,0): apartments with Degen on the billboard (the tower is a place: staff to hire). */
function apartments(s: Spot, art: CityInput['art']) {
  let a = prism(22.8, 1.0, 3.2, 3.2, 8.5, { c: '#17414a', z: Z0 });
  a += winL(22.8, 1.0, 3.2, 3.2, 8.5, Z0, 4, 9, { pal: [C.warm, C.warm, C.pink] });
  a += winR(22.8, 1.0, 3.2, 3.2, 8.5, Z0, 4, 9, { pal: [C.warm, C.cyan] });
  a += prism(23.3, 1.4, 0.8, 0.8, 0.6, { c: '#4a4170', z: Z0 + 8.5 }) + prism(24.6, 2.6, 0.9, 0.7, 0.5, { c: '#4a4170', z: Z0 + 8.5 });
  add(24.4, 2.6, spot('apartments', s, a));
  pin('apartments', s, P(24.4, 2.6, Z0 + 9.6));

  let b = prism(27.0, 1.6, 3.2, 3.6, 5.0, { c: '#3b2c66', z: Z0 });
  b += winL(27.0, 1.6, 3.2, 3.6, 5.0, Z0, 4, 5, { pal: [C.warm, C.pink] });
  b += winR(27.0, 1.6, 3.2, 3.6, 5.0, Z0, 4, 5, { pal: [C.warm, C.cyan] });
  // Billboard on the roof
  const bz = Z0 + 5.0;
  b += `<g class="ink">${line(P(27.7, 4.4, bz), P(27.7, 4.4, bz + 0.9), 'leg')}${line(P(29.5, 4.4, bz), P(29.5, 4.4, bz + 0.9), 'leg')}</g>`;
  const W = 2.8 * TL;
  const H = 3.5 * ZH;
  b += g(
    onL(27.2, 4.4, bz + 0.9 + 3.5),
    `<rect width="${n(W)}" height="${n(H)}" fill="url(#bbGrad)" stroke="${INK}" stroke-width="3"/>` +
      `<image href="${esc(art.degen)}" x="2" y="4" width="70" height="${n(H - 4)}" preserveAspectRatio="xMidYMax meet"/>` +
      text(W - 38, 38, 'GM', 30, 't-display outlined', '#fff') +
      text(W - 38, 64, 'DEGEN', 22, 't-display outlined', '#7cf4ff') +
      `<rect width="${n(W)}" height="${n(H)}" fill="none" stroke="${INK}" stroke-width="3"/>`
  );
  b += lamp(27.4, 4.9, bz);
  add(28.6, 3.4, b);

  for (const [x, y] of [
    [23.0, 5.6],
    [23.4, 7.4],
    [25.2, 8.2],
    [27.0, 8.3],
    [30.4, 6.4],
    [30.4, 8.0],
  ])
    add(x, y, tree(x, y));
  add(28.8, 6.8, bench(28.4, 6.8));
  add(25.6, 6.0, lamp(25.6, 6.0));
}

/** Block (0,1): the vault, a stone bank with its door taped shut. */
function vault(s: Spot) {
  const H = 4.35;
  let b = prism(1.0, 12.0, 6.6, 4.6, H, { c: '#c9bd9f', z: Z0 });
  // Vault door on the side
  const dw = 4.6 * TL;
  b += g(
    onR(7.6, 16.6, Z0 + H),
    `<circle cx="${n(dw / 2)}" cy="58" r="36" fill="#f2c94c" stroke="${INK}" stroke-width="3"/>` +
      `<circle cx="${n(dw / 2)}" cy="58" r="26" fill="#c99a2e" stroke="${INK}" stroke-width="2.5"/>` +
      `<g stroke="${INK}" stroke-width="3" stroke-linecap="round">` +
      [0, 60, 120].map((r) => `<line x1="${n(dw / 2)}" y1="40" x2="${n(dw / 2)}" y2="76" transform="rotate(${r} ${n(dw / 2)} 58)"/>`).join('') +
      `</g><circle cx="${n(dw / 2)}" cy="58" r="6" fill="#f2c94c" stroke="${INK}" stroke-width="2.5"/>` +
      `<g transform="rotate(-10 ${n(dw / 2)} 58)"><rect x="${n(dw / 2 - 92)}" y="48" width="184" height="20" fill="url(#hazard)" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="${n(dw / 2 - 52)}" y="50" width="104" height="16" fill="#ffd23f"/>` +
      text(dw / 2, 63, 'CLASSIFIED', 13, 't-mono', '#05050a', ' font-weight="700" letter-spacing="2"') +
      `</g>`
  );
  // Steps, columns, entablature, pediment
  b += prism(0.8, 16.6, 7.0, 1.7, 0.25, { c: '#d9cdb0', z: Z0 });
  b += prism(1.0, 16.6, 6.6, 1.3, 0.25, { c: '#e3d9c0', z: Z0 + 0.25 });
  // Columns stand on the steps and carry the entablature, which sits flush with the roofline
  for (const x of [1.45, 2.75, 4.05, 5.35, 6.65]) b += cyl(x, 17.45, 0.2, H - 1.05, { c: '#f4efe2', z: Z0 + 0.5 });
  b += prism(0.9, 16.5, 6.8, 1.4, 0.55, { c: '#b3a37f', z: Z0 + H - 0.55 });
  const ez = Z0 + H;
  const rz = ez + 1.5;
  b +=
    '<g class="ink">' +
    poly('#e3d9c0', P(0.8, 12.0, ez), P(4.3, 12.0, rz), P(4.3, 17.9, rz), P(0.8, 17.9, ez)) +
    poly('#9c8c66', P(4.3, 12.0, rz), P(7.8, 12.0, ez), P(7.8, 17.9, ez), P(4.3, 17.9, rz)) +
    poly('#d9cdb0', P(0.8, 17.9, ez), P(7.8, 17.9, ez), P(4.3, 17.9, rz)) +
    '</g>';
  b += g(onL(0.8, 17.9, rz), text(3.5 * TL, 31, 'THE VAULT', 15, 't-display', '#3a2c12', ' letter-spacing="3"'));
  add(4.3, 15, spot('vault', s, b));
  pin('vault', s, P(4.3, 15, 9.6));

  // Searchlights sweeping the sky either side
  for (const [x, y, d] of [
    [0.7, 19.2, 0],
    [8.3, 19.0, 1],
  ] as const) {
    const [bx, by] = P(x, y, Z0);
    fx += `<g class="search search-${d}" style="transform-origin:${n(bx)}px ${n(by)}px"><polygon points="${n(bx - 6)},${n(by)} ${n(bx + 6)},${n(by)} ${n(bx + 60)},${n(by - 620)} ${n(bx - 60)},${n(by - 620)}" fill="url(#beam)"/></g>`;
    add(x, y, cyl(x, y, 0.22, 0.35, { c: '#3a3466', z: Z0 }));
  }

  for (const [x, y] of [
    [1.2, 19.8],
    [8.0, 11.8],
    [8.4, 19.4],
  ])
    add(x, y, tree(x, y));
  add(2.4, 19.8, lamp(2.4, 19.8));
  add(6.2, 19.8, lamp(6.2, 19.8));
}

/** Block (1,1): the Emporium, a twisting glass cyber arcade on a street-level arcade hall. */
function emporium(s: Spot, art: CityInput['art']) {
  const R2 = Math.SQRT1_2;
  const DARK = '#1d1934';
  const at = (n: number, u: number, z: number) => P(17 + (n + u) * R2, 17 + (n - u) * R2, z);
  // The podium's plan: a square with its street corner cut off along x + y = 34
  const PH = 2.6;
  const zP = Z0 + PH;
  const faces: [[number, number], [number, number]][] = [
    [
      [11.8, 18],
      [16, 18],
    ],
    [
      [16, 18],
      [18, 16],
    ],
    [
      [18, 16],
      [18, 11.8],
    ],
  ];
  let b = '';
  // Hall: dark inside, claw machines and cabinets glowing behind the glass, slim mullions
  faces.forEach(([a, c], fi) => {
    b += `<g class="ink">${poly(fi === 1 ? '#241d40' : '#1a1530', P(a[0], a[1], Z0), P(c[0], c[1], Z0), P(c[0], c[1], zP), P(a[0], a[1], zP))}</g>`;
    if (fi === 1) return;
    const bays = 6;
    for (let k = 0; k < bays; k++) {
      const f = (k + 0.5) / bays;
      const x = a[0] + (c[0] - a[0]) * f;
      const y = a[1] + (c[1] - a[1]) * f;
      const [px, py] = P(x, y, Z0);
      const col = [C.pink, C.cyan, '#a64dff', C.warm][(k + fi) % 4];
      b += `<rect x="${n(px - 9)}" y="${n(py - 30)}" width="18" height="30" fill="${col}" opacity=".85"/><rect x="${n(px - 9)}" y="${n(py - 46)}" width="18" height="15" fill="#bff6ff" opacity=".5"/>`;
    }
    b += `<g>${poly('#9fe8ff', P(a[0], a[1], Z0), P(c[0], c[1], Z0), P(c[0], c[1], zP), P(a[0], a[1], zP)).replace('/>', ' opacity=".22"/>')}</g>`;
    for (let k = 0; k <= bays; k++) {
      const f = k / bays;
      b += `<g class="ink">${line(P(a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f, Z0), P(a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f, zP))}</g>`;
    }
  });
  // Podium roof with its neon edge
  const k2 = (Math.SQRT2 - 1) * 0.1;
  b += `<g class="ink">${poly(DARK, P(11.7, 11.7, zP), P(18.1, 11.7, zP), P(18.1, 16 + k2, zP), P(16 + k2, 18.1, zP), P(11.7, 18.1, zP))}</g>`;
  b += `<polyline points="${pts(P(11.7, 18.1, zP), P(16 + k2, 18.1, zP), P(18.1, 16 + k2, zP), P(18.1, 11.7, zP))}" fill="none" stroke="#00eaff" stroke-width="3.5" class="neon-strip"/>`;

  // The tower: twelve glass floors, each turned a little further, one face an LED wall
  const CX = 14.7;
  const CY = 14.7;
  const NF = 12;
  const FH = 1.3;
  const HS = 2;
  const z0 = zP + 0.2;
  const loc = (th: number, lx: number, lz: number): [number, number] => [CX + lx * Math.cos(th) + lz * Math.sin(th), CY - lx * Math.sin(th) + lz * Math.cos(th)];
  const eq = ['#ff2fb9', '#d02ff0', '#8f3dff', '#4a6bff', '#00b8ff', '#00eaff'];
  for (let i = 0; i < NF; i++) {
    const th = (i / NF) * (Math.PI / 3);
    const za = z0 + i * FH;
    const zb = za + FH;
    for (let k = 0; k < 4; k++) {
      const phi = (k * Math.PI) / 2;
      if (Math.sin(phi + th) + Math.cos(phi + th) <= 0.02) continue;
      const nx = Math.sin(phi);
      const nz = Math.cos(phi);
      const tx = Math.cos(phi);
      const tz = -Math.sin(phi);
      const p1 = loc(th, (nx + tx) * HS, (nz + tz) * HS);
      const p2 = loc(th, (nx - tx) * HS, (nz - tz) * HS);
      const quad = [P(p1[0], p1[1], za), P(p2[0], p2[1], za), P(p2[0], p2[1], zb), P(p1[0], p1[1], zb)] as Pt[];
      const wall = k === 0 && i >= 1 && i <= NF - 2;
      if (wall) {
        b += `<g class="ink">${poly('#07060f', ...quad)}</g>`;
        // Pixel art on the LED wall
        for (let u = 0; u < 12; u++) {
          if (rand() > 0.45) continue;
          const f0 = (u + 0.15) / 12;
          const f1 = (u + 0.85) / 12;
          const lerp = (f: number, h: number): Pt => [quad[0][0] + (quad[1][0] - quad[0][0]) * f, quad[0][1] + (quad[1][1] - quad[0][1]) * f - h * (FH - 0.2) * ZH - 0.1 * ZH];
          b += poly(pick(['#ff6ad5', '#a64dff', '#00eaff', '#7cff9e', '#ffd36b']), lerp(f0, 0.25), lerp(f1, 0.25), lerp(f1, 0.75), lerp(f0, 0.75));
        }
      } else {
        b += `<g class="ink">${poly('#2a1f5c', ...quad)}</g>`;
        const [ax, ay] = P(p1[0] + (p2[0] - p1[0]) * 0.3, p1[1] + (p2[1] - p1[1]) * 0.3, za + 0.15);
        const [bx2, by2] = P(p1[0] + (p2[0] - p1[0]) * 0.7, p1[1] + (p2[1] - p1[1]) * 0.7, za + 0.15);
        b += `<rect x="${n(ax - 5)}" y="${n(ay - 14)}" width="10" height="12" fill="${pick([C.pink, C.cyan, C.warm])}"/><rect x="${n(bx2 - 5)}" y="${n(by2 - 14)}" width="10" height="12" fill="${pick([C.pink, C.cyan, '#a64dff'])}"/>`;
        b += poly('#bff3ff', ...quad).replace('/>', ' opacity=".28"/>');
      }
      // Equalizer: corner bars and the floor edge, lit in turn
      const col = eq[Math.min(eq.length - 1, Math.floor((i / NF) * eq.length))];
      const d = (i * 0.07 + k * 0.23).toFixed(2);
      b += `<line x1="${n(quad[0][0])}" y1="${n(quad[0][1])}" x2="${n(quad[3][0])}" y2="${n(quad[3][1])}" stroke="${col}" stroke-width="4" stroke-linecap="round" class="eq" style="animation-delay:-${d}s"/>`;
      b += `<line x1="${n(quad[0][0])}" y1="${n(quad[0][1])}" x2="${n(quad[1][0])}" y2="${n(quad[1][1])}" stroke="${col}" stroke-width="2.5" class="eq" style="animation-delay:-${(i * 0.09).toFixed(2)}s"/>`;
    }
  }
  // Roof, projector and the hologram
  const roofZ = z0 + NF * FH;
  const thT = Math.PI / 3;
  const roof = [
    [1, 1],
    [1, -1],
    [-1, -1],
    [-1, 1],
  ].map(([a, c]) => {
    const [x, y] = loc(thT, a * (HS + 0.1), c * (HS + 0.1));
    return P(x, y, roofZ);
  });
  b += `<g class="ink">${poly(DARK, ...roof)}</g>`;
  b += `<polygon points="${pts(...roof)}" fill="none" stroke="#00eaff" stroke-width="3" class="neon-strip"/>`;
  const [rx, ry] = P(CX, CY, roofZ);
  b += `<ellipse cx="${n(rx)}" cy="${n(ry)}" rx="44" ry="22" fill="#2a2448" stroke="#00eaff" stroke-width="3"/>`;
  b += `<polygon points="${n(rx - 40)},${n(ry)} ${n(rx + 40)},${n(ry)} ${n(rx + 70)},${n(ry - 150)} ${n(rx - 70)},${n(ry - 150)}" fill="url(#holoBeam)"/>`;
  b += `<image href="${esc(art.degen)}" x="${n(rx - 55)}" y="${n(ry - 150)}" width="110" height="140" preserveAspectRatio="xMidYMax meet" class="holo"/>`;

  // Entrance on the corner: glowing doors, canopy, ARCADE sign, the logo above
  {
    const [dl, dy] = at(0.02, -0.6, Z0);
    const [dr] = at(0.02, 0.6, Z0);
    b += `<rect x="${n(dl)}" y="${n(dy - 40)}" width="${n(dr - dl)}" height="40" fill="url(#pulseV)" opacity=".9" stroke="${INK}" stroke-width="2"/>`;
    b += `<g class="ink">${poly('#2a2448', at(1.1, -1.5, Z0 + 2.0), at(1.1, 1.5, Z0 + 2.0), at(1.1, 1.5, Z0 + 2.15), at(1.1, -1.5, Z0 + 2.15))}${poly('#3a3366', at(0, -1.5, Z0 + 2.15), at(0, 1.5, Z0 + 2.15), at(1.1, 1.5, Z0 + 2.15), at(1.1, -1.5, Z0 + 2.15))}</g>`;
    const [ax, ay] = at(1.12, 0, Z0 + 2.45);
    b += text(ax, ay + 6, 'ARCADE', 20, 't-display neon', '#7cf4ff', ' letter-spacing="4"');
    const lw = 3.2 * TL;
    const lh = lw * (494 / 729);
    const [gx, gy] = at(0.4, 0, zP + 0.25);
    b += `<ellipse cx="${n(gx)}" cy="${n(gy - lh / 2)}" rx="${n(lw * 0.7)}" ry="${n(lh * 0.65)}" fill="url(#logoGlow)" class="logo-glow"/>`;
    b += `<image href="${esc(art.logo)}" x="${n(gx - lw / 2)}" y="${n(gy - lh)}" width="${n(lw)}" height="${n(lh)}" preserveAspectRatio="xMidYMid meet" class="roof-logo"/>`;
  }

  add(14.9, 14.9, spot('emporium', s, b));
  pin('emporium', s, P(CX, CY, roofZ + 9));

  // Outside: a glowing tile pad at the doors, claw machines, the prize booth
  let o = '';
  const tiles = ['#ff2fb9', '#8f3dff', '#00eaff', '#ffd36b'];
  for (let a = 0; a < 6; a++)
    for (let c = 0; c < 4; c++) {
      const u0 = -1.8 + a * 0.6;
      const n0 = 0.25 + c * 0.6;
      o += poly(tiles[(a + c) % 4], at(n0 + 0.05, u0 + 0.05, Z0), at(n0 + 0.05, u0 + 0.55, Z0), at(n0 + 0.55, u0 + 0.55, Z0), at(n0 + 0.55, u0 + 0.05, Z0)).replace('/>', ` opacity="${(0.35 + ((a * 7 + c * 3) % 5) * 0.13).toFixed(2)}" class="flick" style="animation-delay:-${(a * 0.7 + c).toFixed(1)}s"/>`);
    }
  add(18.3, 18.3, o);
  for (const [x, y, col] of [
    [15.8, 18.4, '#ff6ad5'],
    [18.4, 15.8, '#00b8d8'],
  ] as const)
    add(x + 0.25, y + 0.25, prism(x, y, 0.5, 0.5, 0.6, { c: col, z: Z0 }) + prism(x, y, 0.5, 0.5, 0.6, { c: '#9fe8ff', z: Z0 + 0.6, top: '#bff6ff', left: '#7fd8f0', right: '#5fb8d8' }) + prism(x - 0.03, y - 0.03, 0.56, 0.56, 0.12, { c: C.warm, z: Z0 + 1.2 }));
  add(18.9, 14.7, prism(18.45, 14.2, 0.85, 1.0, 1.4, { c: '#5a2a8a', z: Z0 }) + g(onR(19.3, 15.2, Z0 + 1.4), text(1.0 * TL / 2, 14, 'PRIZES', 13, 't-display neon', '#ffd36b')));
  for (const [x, y] of [
    [19.0, 12.4],
    [12.4, 19.0],
  ])
    add(x, y, cyl(x, y, 0.42, 0.35, { c: DARK, z: Z0, top: '#1d3b30' }) + tree(x, y, Z0 + 0.35, 0.85, 'round'));
  add(11.6, 11.6, lamp(11.6, 11.6));
  add(19.5, 11.6, lamp(19.5, 11.6));
  add(11.6, 19.5, lamp(11.6, 19.5));
}

/** Block (2,1): Drop 001, shutters down until the store opens. */
function shop(s: Spot) {
  let b = prism(22.8, 12.4, 6.6, 4.4, 3.4, { c: '#9e2a36', z: Z0 });
  const W = 6.6 * TL;
  let shutter = '';
  for (let y = 32; y < 82; y += 6) shutter += `<line x1="112" y1="${y}" x2="242" y2="${y}"/>`;
  b += g(
    onL(22.8, 16.8, Z0 + 3.4),
    `<rect x="110" y="26" width="134" height="56" fill="#55506e" stroke="${INK}" stroke-width="2.5"/>` +
      `<g stroke="#3a3654" stroke-width="2">${shutter}</g>` +
      text(177, 66, 'SOON', 30, 't-display spray', '#ff6ad5', ' transform="rotate(-8 177 58)"') +
      [14, 256]
        .map(
          (x) =>
            `<rect x="${x}" y="30" width="84" height="44" fill="#7cf4ff" stroke="${INK}" stroke-width="2.5" class="display"/>` +
            `<path d="M${x + 30},70v-22l-8,6-5,-9 14,-9h16l14,9-5,9-8,-6v22z" fill="#1b1830" stroke="${INK}" stroke-width="1.5"/>`
        )
        .join('')
  );
  b += winR(22.8, 12.4, 6.6, 4.4, 3.4, Z0, 3, 2, { pal: [C.warm] });
  // Striped awning
  let aw = '<g class="ink awning">';
  const strips = 10;
  for (let k = 0; k < strips; k++) {
    const xa = 23.0 + (k * 6.2) / strips;
    const xb = xa + 6.2 / strips;
    aw += poly(k % 2 ? '#f3f2f7' : '#e23b3b', P(xa, 16.8, Z0 + 3.35), P(xb, 16.8, Z0 + 3.35), P(xb, 17.3, Z0 + 3.0), P(xa, 17.3, Z0 + 3.0));
  }
  b += aw + '</g>';
  // Roof sign and the giant bag
  const rz = Z0 + 3.4;
  b += prism(23.2, 15.0, 4.0, 0.25, 1.5, { c: '#14102a', z: rz });
  b += g(onL(23.2, 15.25, rz + 1.5), text((4 * TL) / 2, 27, 'DROP 001', 26, 't-display neon', '#ff6ad5', ' letter-spacing="2"'));
  b += prism(27.7, 14.0, 1.5, 1.2, 2.0, { c: '#f3f2f7', z: rz });
  b += g(onL(27.7, 15.2, rz + 2.0), text((1.5 * TL) / 2, 32, '001', 20, 't-display', '#e23b3b'));
  const h0 = P(27.95, 14.6, rz + 2.0);
  const h1 = P(28.95, 14.6, rz + 2.0);
  const hc = P(28.45, 14.6, rz + 3.3);
  b += `<path d="M${pts(h0)} Q${pts(hc)} ${pts(h1)}" fill="none" stroke="${INK}" stroke-width="5"/>`;
  add(26, 14.6, spot('shop', s, b));
  pin('shop', s, P(26.2, 14.6, 8.4));

  // Sidewalk sign
  const sg = prism(24.4, 18.3, 1.1, 0.22, 1.0, { c: '#14102a', z: Z0 }) + g(onL(24.4, 18.52, Z0 + 1.0), text((1.1 * TL) / 2, 16, 'COMING', 9, 't-mono', '#7cf4ff', ' font-weight="700"') + text((1.1 * TL) / 2, 22 + 2, 'SOON', 9, 't-mono', '#ff6ad5', ' font-weight="700"'));
  add(24.9, 18.4, sg);

  // Parking at the back
  let lot = '';
  for (let k = 0; k <= 4; k++) lot += `<line x1="${n(k * 50)}" y1="0" x2="${n(k * 50)}" y2="50"/>`;
  add(25.0, 10.8, g(onT(23.4, 11.0, Z0), `<g stroke="#8b86b8" stroke-width="2">${lot}</g>`));
  for (const [x, c] of [
    [24.2, '#00c2ff'],
    [27.9, '#ffd23f'],
  ] as const) {
    add(x, 11.5, g(`translate(${pts(P(x, 11.5, Z0))})`, carSprite('y', c, 1)));
  }
  for (const [x, y] of [
    [30.4, 12.2],
    [30.5, 14.0],
    [30.4, 16.0],
    [30.3, 19.6],
    [22.8, 19.6],
  ])
    add(x, y, tree(x, y));
  add(28.0, 19.6, lamp(28.0, 19.6));
  add(30.6, 18.0, lamp(30.6, 18.0));
}

/** Block (1,2): the workshop, sparks flying out of the open door. */
function workshop(s: Spot) {
  let b = prism(11.8, 22.8, 7.0, 4.8, 3.2, { c: '#2e4a72', z: Z0 });
  const W = 7.0 * TL;
  b += g(
    onL(11.8, 27.6, Z0 + 3.2),
    `<rect x="120" y="14" width="135" height="63" fill="url(#forge)" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M140,77v-18h96v18M150,59v-8h20v8" fill="#1b1830" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="116" y="8" width="143" height="8" fill="url(#hazard)" stroke="${INK}" stroke-width="2"/>` +
      windows(110, 77, 2, 2, { mt: 14, pal: [C.warm] }) +
      `<g transform="translate(265,0)">${windows(110, 77, 2, 2, { mt: 14, pal: [C.warm, C.cyan] })}</g>`
  );
  b += winR(11.8, 22.8, 7.0, 4.8, 3.2, Z0, 4, 1, { mt: 12, mb: 40, pal: [C.warm] });
  // Sawtooth roof, glazing facing the street; the front run carries the sign
  const rz = Z0 + 3.2;
  for (let k = 0; k < 3; k++) {
    const y0 = 22.8 + k * 1.6;
    const y1 = y0 + 1.6;
    b +=
      '<g class="ink">' +
      poly('#4b6896', P(11.8, y0, rz), P(18.8, y0, rz), P(18.8, y1, rz + 1.3), P(11.8, y1, rz + 1.3)) +
      poly(k === 2 ? '#0b0a18' : '#5fd6ff', P(11.8, y1, rz), P(18.8, y1, rz), P(18.8, y1, rz + 1.3), P(11.8, y1, rz + 1.3)) +
      poly('#22385a', P(18.8, y0, rz), P(18.8, y1, rz), P(18.8, y1, rz + 1.3)) +
      '</g>';
  }
  b += g(onL(11.8, 27.6, rz + 1.3), text(W / 2, 24, 'THE WORKSHOP', 22, 't-display neon', '#ffb347', ' letter-spacing="3"'));
  // Crates in the yard
  for (const [x, label] of [
    [12.4, 'TERMINAL'],
    [14.6, 'DEX'],
    [16.8, 'LAUNCHER'],
  ] as const) {
    b += prism(x, 28.5, 1.4, 0.9, 0.9, { c: '#8a5a2b', z: Z0 });
    b += g(onL(x, 29.4, Z0 + 0.9), `<rect x="4" y="4" width="${n(1.4 * TL - 8)}" height="${n(0.9 * ZH - 8)}" fill="none" stroke="#5b3a1c" stroke-width="1.5"/>` + text((1.4 * TL) / 2, 15, label, 9, 't-mono', '#f3e3c3', ' font-weight="700"'));
  }
  add(15.3, 25.5, spot('workshop', s, b));
  pin('workshop', s, P(15.3, 25.2, 7.4));

  // Sparks out of the door
  const [ox, oy] = P(15.2, 27.7, Z0 + 0.7);
  for (let k = 0; k < 14; k++) {
    const dx = n((rand() - 0.5) * 120);
    const dy = n(-20 - rand() * 60);
    fx += `<circle cx="${n(ox)}" cy="${n(oy)}" r="${n(1.6 + rand() * 1.6)}" class="spark" style="--dx:${dx}px;--dy:${dy}px;animation-delay:-${n(rand() * 1.4)}s"/>`;
  }

  for (const [x, y] of [
    [19.5, 23.0],
    [19.4, 24.8],
    [19.5, 26.8],
    [12.0, 30.6],
  ])
    add(x, y, tree(x, y));
  add(19.5, 30.4, lamp(19.5, 30.4));
}

/** Block (2,2): the Armoury, a modern military compound and the players' gun store, for the plan. */
function armoury(s: Spot, art: CityInput['art']) {
  const CONC = '#b3ae9e';
  const OLIVE = '#5a6b3a';
  const OLIVE_DK = '#3e4a26';
  const STEEL = '#2b2a33';
  const WH = 1.35;
  const WT = 0.3;
  /** A run of T-wall blast barriers (panel seams) with razor wire on top. */
  const blast = (x: number, y: number, w: number, d: number) => {
    let o = prism(x, y, w, d, WH, { c: CONC, z: Z0 });
    const alongX = w > d;
    const len = alongX ? w : d;
    let seams = '';
    for (let a = 0.9; a < len - 0.05; a += 0.9) {
      seams += alongX ? line(P(x + a, y + d, Z0), P(x + a, y + d, Z0 + WH)) : line(P(x + w, y + a, Z0), P(x + w, y + a, Z0 + WH));
    }
    o += `<g class="ink" stroke-width="1.2">${seams}</g>`;
    // Razor wire: a row of little loops along the top
    let wire = '';
    const steps = Math.floor(len / 0.18);
    for (let k = 0; k <= steps; k++) {
      const f = k / steps;
      const [cx, cy] = alongX ? P(x + w * f, y + d / 2, Z0 + WH + 0.28) : P(x + w / 2, y + d * f, Z0 + WH + 0.28);
      wire += `<circle cx="${n(cx)}" cy="${n(cy)}" r="4.2" fill="none"/>`;
    }
    return o + `<g stroke="#c9c6d6" stroke-width="1.4">${wire}</g>`;
  };
  /** A steel watchtower: legs, a cabin with a dark window band and a flat roof, a red light. */
  const tower = (x: number, y: number) => {
    let t = '<g class="ink" stroke-width="2.5">';
    for (const [dx, dy] of [
      [-0.35, -0.35],
      [0.35, -0.35],
      [-0.35, 0.35],
      [0.35, 0.35],
    ])
      t += line(P(x + dx, y + dy, Z0), P(x + dx * 0.75, y + dy * 0.75, Z0 + 2.0));
    t += line(P(x - 0.3, y + 0.3, Z0 + 0.5), P(x + 0.3, y + 0.3, Z0 + 1.5)) + line(P(x + 0.3, y + 0.3, Z0 + 0.5), P(x - 0.3, y + 0.3, Z0 + 1.5));
    t += '</g>';
    t += prism(x - 0.42, y - 0.42, 0.84, 0.84, 0.62, { c: OLIVE_DK, z: Z0 + 2.0 });
    t += g(onL(x - 0.42, y + 0.42, Z0 + 2.4), `<rect x="0" y="0" width="${n(0.84 * TL)}" height="7" fill="#1d2a33"/>`);
    t += g(onR(x + 0.42, y + 0.42, Z0 + 2.4), `<rect x="0" y="0" width="${n(0.84 * TL)}" height="7" fill="#1d2a33"/>`);
    t += prism(x - 0.52, y - 0.52, 1.04, 1.04, 0.07, { c: '#4a4a52', z: Z0 + 2.62 });
    const [lx, ly] = P(x, y, Z0 + 2.85);
    return t + `<circle cx="${n(lx)}" cy="${n(ly)}" r="3" fill="#ff2a2a"/>`;
  };

  // Back and left blast walls, the back watchtower
  add(26.0, 23.0, blast(22.55, 22.55, 7.9, WT));
  add(23.0, 26.1, blast(22.55, 22.55, WT, 7.9));
  add(25.0, 25.0, tower(22.95, 22.95));

  // The gun store: flat-roofed concrete with a window ribbon, glass shopfront under a canopy
  // with the GUN STORE sign, rooftop helipad, AC units, a dish and Degen's flag. It's the spot.
  const HH = 2.8;
  const HW = 4.6;
  let k = prism(23.3, 23.3, HW, 3.6, HH, { c: CONC, z: Z0 });
  const ribbon = (W: number) => {
    let r = `<rect x="6" y="14" width="${n(W - 12)}" height="13" fill="#1d2a33" stroke="${INK}" stroke-width="1.5"/>`;
    for (let x = 6; x < W - 6; x += 22) r += `<rect x="${n(x)}" y="14" width="2" height="13" fill="${INK}"/>`;
    return r;
  };
  const FW = HW * TL;
  const FH = HH * ZH;
  // Front: window ribbon, shopfront with rifles on the racks, glass doors, the roller shutter, the olive plinth
  let front = ribbon(FW);
  front += `<rect x="12" y="${n(FH - 34)}" width="${n(FW * 0.5)}" height="28" fill="#121820" stroke="${INK}" stroke-width="2"/>`;
  front += `<rect x="12" y="${n(FH - 34)}" width="${n(FW * 0.5)}" height="3" fill="#3cff7a"/>`;
  for (let i = 0; i < 4; i++) front += `<path d="M${n(20 + i * 28)},${n(FH - 22)}h18v-3h5v3l-12,3l-1,5h-3v-4h-7z" fill="${['#5a6b3a', '#8f3dff', '#24212f', '#00b8d8'][i]}" stroke="${INK}" stroke-width="1"/>`;
  front += `<rect x="${n(FW * 0.6)}" y="${n(FH - 32)}" width="20" height="30" fill="#16202a" stroke="${INK}" stroke-width="2"/><line x1="${n(FW * 0.6 + 10)}" y1="${n(FH - 32)}" x2="${n(FW * 0.6 + 10)}" y2="${n(FH - 2)}" stroke="${INK}" stroke-width="1.5"/>`;
  front += `<rect x="${n(FW * 0.8)}" y="${n(FH - 30)}" width="18" height="28" fill="#8f8b98" stroke="${INK}" stroke-width="1.5"/>`;
  front += `<rect x="0" y="${n(FH - 5)}" width="${n(FW)}" height="5" fill="${OLIVE}"/>`;
  k += g(onL(23.3, 26.9, Z0 + HH), front);
  k += g(onR(27.9, 26.9, Z0 + HH), ribbon(3.6 * TL) + `<rect x="0" y="${n(FH - 5)}" width="${n(3.6 * TL)}" height="5" fill="${OLIVE}"/>`);
  // Canopy and its lit sign
  k += prism(23.2, 26.9, 4.8, 0.9, 0.07, { c: '#4a4a52', z: Z0 + 1.62 });
  k += g(
    onL(23.2, 27.8, Z0 + 1.69),
    `<rect x="0" y="0" width="${n(4.8 * TL)}" height="11" fill="#14121f" stroke="${INK}" stroke-width="1.5"/>` + text(2.4 * TL, 9, 'GUN STORE', 9, 't-display', '#3cff7a', ' letter-spacing="3"')
  );
  // Roof: helipad, AC units, the comms mast with its red light, the flag
  {
    const [hx, hy] = P(24.75, 25.15, Z0 + HH);
    k += `<ellipse cx="${n(hx)}" cy="${n(hy)}" rx="58" ry="29" fill="#3a3a42" stroke="#ffd23f" stroke-width="3"/>`;
    k += `<text x="${n(hx)}" y="${n(hy + 7)}" text-anchor="middle" class="t-display" font-size="22" fill="#f3f2f7" transform="matrix(1,0,0,0.6,0,${n(hy * 0.4)})">H</text>`;
    k += prism(26.35, 23.55, 0.85, 0.6, 0.42, { c: '#e2ded2', z: Z0 + HH }) + prism(26.35, 24.3, 0.85, 0.6, 0.42, { c: '#e2ded2', z: Z0 + HH });
    k += `<g class="ink" stroke-width="2.5">${line(P(27.5, 23.7, Z0 + HH), P(27.5, 23.7, Z0 + HH + 2.1))}</g>`;
    const [mx, my] = P(27.5, 23.7, Z0 + HH + 2.15);
    k += `<circle cx="${n(mx)}" cy="${n(my)}" r="3" fill="#ff2a2a"/>`;
    const [px, py] = P(27.55, 26.55, Z0 + HH);
    const top = py - 46;
    k += `<g class="ink"><line x1="${n(px)}" y1="${n(py)}" x2="${n(px)}" y2="${n(top)}" stroke-width="3"/></g>`;
    k +=
      `<g><animateTransform attributeName="transform" type="skewY" values="0;-4;0;3;0" dur="2.6s" repeatCount="indefinite"/>` +
      `<rect x="${n(px)}" y="${n(top)}" width="40" height="27" fill="#14121f" stroke="${INK}" stroke-width="1.5"/>` +
      `<image href="${esc(art.degen)}" x="${n(px + 8)}" y="${n(top + 1)}" width="24" height="22" preserveAspectRatio="xMidYMid meet"/>` +
      `<rect x="${n(px)}" y="${n(top + 23)}" width="40" height="4" fill="url(#pulseH)"/></g>`;
  }
  // The store is the spot: it lifts on hover and leads to the plan
  add(25.6, 25.1, spot('plan', s, k));

  // The counter out front, where players gear up
  add(24.7, 27.35, prism(23.9, 27.15, 1.6, 0.35, 0.55, { c: OLIVE_DK, z: Z0 }) + prism(23.85, 27.1, 1.7, 0.45, 0.05, { c: STEEL, z: Z0 + 0.55 }));

  // Supply yard under camo netting, the tank, a patrol in the yard, drums and helmets
  {
    let y = '';
    for (const [x, yy, z] of [
      [28.3, 23.1, 0],
      [28.85, 23.1, 0],
      [29.4, 23.1, 0],
      [28.3, 23.65, 0],
      [28.85, 23.65, 0],
      [28.55, 23.1, 1],
    ])
      y += prism(x, yy, 0.5, 0.5, 0.42, { c: '#4f5d31', z: Z0 + z * 0.42 });
    for (const [px, py] of [
      [28.15, 24.35],
      [30.0, 24.35],
    ])
      y += `<g class="ink">${line(P(px, py, Z0), P(px, py, Z0 + 1.5))}</g>`;
    y += `<g class="ink">${poly(OLIVE, P(28.15, 22.95, Z0 + 1.5), P(30.0, 22.95, Z0 + 1.5), P(30.0, 24.35, Z0 + 1.5), P(28.15, 24.35, Z0 + 1.5))}</g>`;
    const [nx, ny] = P(29.07, 23.65, Z0 + 1.5);
    y += `<ellipse cx="${n(nx - 30)}" cy="${n(ny)}" rx="16" ry="7" fill="${OLIVE_DK}"/><ellipse cx="${n(nx + 22)}" cy="${n(ny - 6)}" rx="18" ry="6" fill="#7d6b45"/><ellipse cx="${n(nx + 4)}" cy="${n(ny + 12)}" rx="14" ry="5" fill="#2b3418"/>`;
    add(29.1, 24.4, y);
  }
  {
    let tk = prism(28.59, 24.6, 0.28, 1.6, 0.32, { c: '#2b2a33', z: Z0 }) + prism(29.43, 24.6, 0.28, 1.6, 0.32, { c: '#2b2a33', z: Z0 });
    tk += prism(28.67, 24.65, 0.96, 1.5, 0.28, { c: OLIVE, z: Z0 + 0.28 });
    tk += prism(28.84, 24.95, 0.62, 0.7, 0.26, { c: OLIVE_DK, z: Z0 + 0.56 });
    tk += `<g class="ink"><line x1="${n(P(29.15, 25.65, Z0 + 0.7)[0])}" y1="${n(P(29.15, 25.65, Z0 + 0.7)[1])}" x2="${n(P(29.15, 26.7, Z0 + 0.7)[0])}" y2="${n(P(29.15, 26.7, Z0 + 0.7)[1])}" stroke-width="5"/></g>`;
    add(29.15, 25.4, tk);
  }
  {
    // A patrol in the yard and drums by the wall
    let sq = '';
    for (let i = 0; i < 3; i++) {
      const [x, y] = P(26.5 + i * 0.55, 28.4 - i * 0.18, Z0);
      sq += `<g class="ink"><rect x="${n(x - 3)}" y="${n(y - 14)}" width="6" height="14" fill="${OLIVE}"/><circle cx="${n(x)}" cy="${n(y - 17)}" r="3.5" fill="#14121f"/><path d="M${n(x - 4.5)},${n(y - 18)}a4.5,4.5 0 0 1 9,0z" fill="${OLIVE_DK}"/></g>`;
    }
    for (const [x, y] of [
      [23.25, 29.55],
      [23.6, 29.65],
    ])
      sq += cyl(x, y, 0.17, 0.48, { c: OLIVE_DK, z: Z0 });
    add(27.0, 28.6, sq);
  }
  add(29.1, 27.35, prism(28.9, 27.15, 0.5, 0.4, 0.4, { c: OLIVE, z: Z0 }) + prism(29.4, 27.17, 0.34, 0.36, 0.34, { c: '#4f5d31', z: Z0 + 0.1 }));
  add(29.3, 28.6, prism(29.02, 28.1, 0.56, 1.0, 0.3, { c: OLIVE, z: Z0 + 0.12 }) + prism(29.03, 28.3, 0.54, 0.05, 0.3, { c: '#8fd6e8', z: Z0 + 0.42 }));

  // The checkpoint: guard booth, a raised boom barrier and the sign gantry with the name
  {
    let cp = prism(24.98, 29.8, 0.8, 0.62, 1.25, { c: '#e2ded2', z: Z0 });
    cp += g(onL(24.98, 30.42, Z0 + 1.0), `<rect x="2" y="0" width="${n(0.8 * TL - 4)}" height="9" fill="#1d2a33"/>`);
    cp += prism(24.9, 29.72, 0.96, 0.78, 0.08, { c: '#4a4a52', z: Z0 + 1.25 });
    cp += prism(25.98, 30.25, 0.14, 0.14, 0.7, { c: '#ffd23f', z: Z0 });
    const [bx, by] = P(26.05, 30.32, Z0 + 0.62);
    cp += `<g class="ink" stroke-width="5"><line x1="${n(bx)}" y1="${n(by)}" x2="${n(bx + 12)}" y2="${n(by - 48)}"/></g><line x1="${n(bx)}" y1="${n(by)}" x2="${n(bx + 12)}" y2="${n(by - 48)}" stroke="#e23b3b" stroke-width="3" stroke-dasharray="6 6"/>`;
    cp += `<g class="ink" stroke-width="4">${line(P(25.85, 30.27, Z0), P(25.85, 30.27, Z0 + 2.35))}${line(P(28.2, 30.27, Z0), P(28.2, 30.27, Z0 + 2.35))}</g>`;
    cp += g(
      onL(25.75, 30.27, Z0 + 2.4),
      `<rect x="0" y="0" width="${n(2.55 * TL)}" height="22" fill="#2b3418" stroke="${INK}" stroke-width="2"/>` +
        text(1.275 * TL, 12, 'THE ARMOURY', 10, 't-display', '#f3f2f7', ' letter-spacing="1.5"') +
        text(1.275 * TL, 20, 'GUN STORE', 5.5, 't-mono', '#3cff7a', ' letter-spacing="1.5" font-weight="700"')
    );
    for (const x of [25.95, 28.13]) {
      const [lx, ly] = P(x, 30.27, Z0 + 2.45);
      cp += `<circle cx="${n(lx)}" cy="${n(ly)}" r="2.5" fill="#2aff6a"/>`;
    }
    add(26.6, 30.2, cp);
  }

  // Front and right blast walls, the side and front watchtowers
  add(24.0, 30.4, blast(22.55, 30.15, 2.35, WT));
  add(29.9, 30.4, blast(28.3, 30.15, 2.15, WT));
  add(30.4, 30.0, blast(30.15, 22.55, WT, 7.9));
  add(24.5, 30.5, tower(22.95, 30.05));
  add(30.5, 30.4, tower(30.05, 22.95));
  add(31.0, 30.9, tower(30.05, 30.05));

  pin('plan', s, P(26.6, 25.8, Z0 + 8.6));
}

/** Block (0,2): the post office, linking to Telegram. */
function postOffice(s: Spot) {
  let b = prism(1.2, 23.2, 4.8, 3.8, 2.8, { c: '#e3d6b8', z: Z0 });
  const W = 4.8 * TL;
  b += g(
    onL(1.2, 27.0, Z0 + 2.8),
    `<rect x="${n(W / 2 - 15)}" y="30" width="30" height="37" fill="#2a3b66" stroke="${INK}" stroke-width="2.5"/>` +
      windows(W / 2 - 20, 67, 2, 1, { mt: 30, mb: 14, lit: 1 }) +
      `<g transform="translate(${n(W / 2 + 20)},0)">${windows(W / 2 - 20, 67, 2, 1, { mt: 30, mb: 14, lit: 1 })}</g>` +
      `<rect x="${n(W / 2 - 72)}" y="6" width="144" height="18" rx="3" fill="#0b0a18" stroke="${INK}" stroke-width="2"/>` +
      text(W / 2 + 8, 20, 'TELEGRAM', 14, 't-display', '#bfe9ff', ' letter-spacing="3"') +
      `<circle cx="${n(W / 2 - 52)}" cy="15" r="7" fill="#2aabee"/><path d="M${n(W / 2 - 56)},15l8,-3-2,7-2,-3z" fill="#fff"/>`
  );
  b += winR(1.2, 23.2, 4.8, 3.8, 2.8, Z0, 3, 1, { mt: 18, mb: 16, lit: 1 });
  const ez = Z0 + 2.8;
  const rz = ez + 1.6;
  b +=
    '<g class="ink">' +
    poly('#1f86bd', P(1.0, 23.0, ez), P(6.2, 23.0, ez), P(4.6, 25.1, rz), P(2.6, 25.1, rz)) +
    poly('#1f86bd', P(1.0, 23.0, ez), P(2.6, 25.1, rz), P(1.0, 27.2, ez)) +
    poly('#1b76a8', P(6.2, 27.2, ez), P(6.2, 23.0, ez), P(4.6, 25.1, rz)) +
    poly('#2aabee', P(1.0, 27.2, ez), P(6.2, 27.2, ez), P(4.6, 25.1, rz), P(2.6, 25.1, rz)) +
    '</g>';
  b += prism(6.5, 27.4, 0.5, 0.4, 0.9, { c: '#2aabee', z: Z0 });
  add(3.6, 25.1, spot('telegram', s, b));
  pin('telegram', s, P(3.6, 25.1, 7.4));

  // Pond
  const pond =
    `<circle r="70" fill="${C.water}" stroke="${INK}" stroke-width="3"/>` +
    `<circle r="20" fill="none" stroke="#7cc8ff" stroke-width="2" class="ripple"/>` +
    `<circle cx="-30" cy="18" r="9" fill="#1f9d6a" stroke="${INK}" stroke-width="2"/><circle cx="26" cy="-24" r="7" fill="#1f9d6a" stroke="${INK}" stroke-width="2"/>`;
  add(6.4, 29.2, g(onT(6.4, 29.2, Z0), pond));

  // A paper plane looping over the block
  const [cx, cy] = P(4.4, 26.6, 9);
  const path = `M${n(cx - 230)},${n(cy)}a230,80 0 1 0 460,0a230,80 0 1 0 -460,0`;
  fx +=
    `<g class="plane"><animateMotion dur="14s" repeatCount="indefinite" rotate="auto" path="${path}"/>` +
    `<g class="ink" stroke-width="2.5"><polygon points="18,0 -12,-10 -6,0 -12,10" fill="#f3f2f7"/><polyline points="18,0 -6,0" fill="none"/></g></g>`;

  for (const [x, y] of [
    [1.0, 28.6],
    [1.4, 30.3],
    [3.0, 30.4],
    [7.8, 23.0],
    [8.2, 24.8],
  ])
    add(x, y, tree(x, y));
  add(3.0, 28.6, bench(2.6, 28.4));
  add(8.5, 26.6, lamp(8.5, 26.6));
}

function clouds() {
  let s = '';
  for (let k = 0; k < 6; k++) {
    const y = VIEW.y + 80 + k * 260 + rand() * 120;
    const sc = 0.8 + rand() * 0.9;
    const blobs = [
      [0, 0, 90, 34],
      [60, -18, 70, 34],
      [-60, -10, 60, 28],
      [120, 4, 60, 24],
    ]
      .map(([x, yy, rx, ry]) => `<ellipse cx="${x * sc}" cy="${yy * sc}" rx="${rx * sc}" ry="${ry * sc}"/>`)
      .join('');
    s += `<g class="cloud" style="animation-duration:${n(110 + rand() * 90)}s;animation-delay:-${n(rand() * 200)}s"><g transform="translate(${VIEW.x - 300},${n(y)})">${blobs}</g></g>`;
  }
  return s;
}

const DEFS = `<defs>
<linearGradient id="pulseH" x1="0" x2="1"><stop offset="0" stop-color="#ff0000"/><stop offset=".2" stop-color="#f10e7d"/><stop offset=".32" stop-color="#e219e5"/><stop offset=".52" stop-color="#8000ff"/><stop offset=".72" stop-color="#037dff"/><stop offset=".84" stop-color="#00b0ff"/><stop offset="1" stop-color="#00eaff"/></linearGradient>
<linearGradient id="pulseV" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff0000"/><stop offset=".32" stop-color="#e219e5"/><stop offset=".52" stop-color="#8000ff"/><stop offset=".72" stop-color="#037dff"/><stop offset="1" stop-color="#00eaff"/></linearGradient>
<linearGradient id="bbGrad" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#5a0f6e"/><stop offset=".55" stop-color="#2a1a8a"/><stop offset="1" stop-color="#0b5fa8"/></linearGradient>
<radialGradient id="lampGlow"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".9"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>
<radialGradient id="pool"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".22"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>
<radialGradient id="redGlow"><stop offset="0" stop-color="#ff3b3b" stop-opacity=".95"/><stop offset="1" stop-color="#ff3b3b" stop-opacity="0"/></radialGradient>
<radialGradient id="cyanGlow"><stop offset="0" stop-color="#7cf4ff" stop-opacity=".95"/><stop offset="1" stop-color="#7cf4ff" stop-opacity="0"/></radialGradient>
<radialGradient id="logoGlow"><stop offset="0" stop-color="#e219e5" stop-opacity=".45"/><stop offset=".6" stop-color="#8000ff" stop-opacity=".18"/><stop offset="1" stop-color="#8000ff" stop-opacity="0"/></radialGradient>
<radialGradient id="forge" cx=".5" cy="1" r="1"><stop offset="0" stop-color="#ffd27a"/><stop offset=".5" stop-color="#ff7a2f"/><stop offset="1" stop-color="#5a1f2a"/></radialGradient>
<linearGradient id="holoBeam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#00eaff" stop-opacity=".4"/><stop offset="1" stop-color="#00eaff" stop-opacity="0"/></linearGradient>
<linearGradient id="beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#c9b8ff" stop-opacity=".35"/><stop offset="1" stop-color="#c9b8ff" stop-opacity="0"/></linearGradient>
<pattern id="hazard" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="14" height="14" fill="#ffd23f"/><rect width="7" height="14" fill="#05050a"/></pattern>
<pattern id="mesh" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#0e0c1c" fill-opacity=".55"/><path d="M0,0H8M0,0V8" stroke="#9a96b8" stroke-width="1"/></pattern>
<pattern id="paving" width="26.8" height="26.8" patternUnits="userSpaceOnUse" patternTransform="matrix(${K},${Q},${-K},${Q},0,0)"><rect width="26.8" height="26.8" fill="${C.plaza}"/><path d="M0,0H26.8M0,0V26.8" stroke="#3a3370" stroke-width="2"/></pattern>
</defs>`;

/** Render the whole city as SVG markup (without the outer <svg>). */
export function renderCity({ spots, art }: CityInput) {
  seed = 144;
  items = [];
  pins = '';
  fx = '';

  // Downtown's blocks are paved (parks grassed); the landmarks' own lots, by their old block, get their own ground (as in the 3D city)
  const base = ground({ 'dt-se': C.concrete, '22,22': C.concrete, '22,11': C.concrete, '11,22': C.concrete, '11,0': C.grass, '22,0': C.grass, '0,22': C.grass });

  // Each landmark on its lot (the numbers are their blocks on the old drawing grid), then downtown round them
  onBlock(11, 0, () => signal(spots.signal));
  onBlock(22, 0, () => apartments(spots.apartments, art));
  onBlock(0, 11, () => vault(spots.vault));
  onBlock(11, 11, () => emporium(spots.emporium, art));
  onBlock(22, 11, () => shop(spots.shop));
  onBlock(11, 22, () => workshop(spots.workshop));
  onBlock(22, 22, () => armoury(spots.plan, art));
  onBlock(0, 22, () => postOffice(spots.telegram));
  downtown();
  outskirts();
  traffic();

  items.sort((a, b) => a.cell - b.cell || a.car - b.car || a.d - b.d);
  const scene = items.map((i) => i.svg).join('');

  return (
    DEFS +
    `<g aria-hidden="true">${base}</g>` +
    `<g class="scene">${scene}</g>` +
    `<g class="fx" aria-hidden="true">${fx}${clouds()}</g>` +
    `<g class="pins">${pins}</g>`
  );
}

/** Screen position (in viewBox units) of a spot's pin, for centring the view. */
export const EMPORIUM_FOCUS = P(...design(14.7, 14.7), 8);
