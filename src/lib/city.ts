/*
 * Degen City: the isometric night city on the homepage, drawn as one SVG
 * string at build time.
 *
 * Tile grid: x runs to the lower right of the screen, y to the lower left,
 * z is height. Blocks sit at 0-9, 11-20 and 22-31 on both axes with roads
 * between them; everything outside is parkland, a river and road out of town.
 *
 * Draw order is the painter's algorithm by block: everything in a block is
 * drawn by its block's (column + row), and the cars on a road segment are
 * drawn right after the block behind that segment, so nothing on the street
 * ever paints over a building standing in front of it.
 */

export type SpotId = 'emporium' | 'shop' | 'workshop' | 'vault' | 'signal' | 'telegram' | 'plan';

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

export const VIEW = { x: -1600, y: -330, w: 3200, h: 1930 };

type Pt = [number, number];
const P = (x: number, y: number, z = 0): Pt => [((x - y) * TW) / 2, ((x + y) * TH) / 2 - z * ZH];
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
const cellOf = (t: number) => Math.floor((t + 1) / 11);
const add = (x: number, y: number, svg: string) => items.push({ cell: cellOf(x) + cellOf(y), car: 0, d: x + y, svg });

/* ---------- Ground: roads, river, block slabs ---------- */

const BLOCKS = [0, 11, 22];
const ROADS = [10, 21];
const EXT: [number, number] = [-24, 56];
const RIVER: [number, number] = [34.5, 37.5];

function crosswalk(along: 'x' | 'y', at: number, road: number) {
  let s = '';
  for (let k = 0; k < 6; k++) {
    const a = road - 0.9 + k * 0.32;
    const b = a + 0.17;
    s +=
      along === 'x'
        ? poly('#d9d4ef', P(at, a, 0), P(at + 0.6, a, 0), P(at + 0.6, b, 0), P(at, b, 0))
        : poly('#d9d4ef', P(a, at, 0), P(b, at, 0), P(b, at + 0.6, 0), P(a, at + 0.6, 0));
  }
  return s;
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

  // Asphalt, then lane dashes between the intersections, then crosswalks
  for (const r of ROADS) {
    s += `<g class="road">${poly(C.asphalt, P(e0, r - 1), P(e1, r - 1), P(e1, r + 1), P(e0, r + 1))}</g>`;
    s += `<g class="road">${poly(C.asphalt, P(r - 1, e0), P(r + 1, e0), P(r + 1, e1), P(r - 1, e1))}</g>`;
  }
  const runs: [number, number][] = [
    [e0, 8.2],
    [11.8, 19.2],
    [22.8, e1],
  ];
  for (const r of ROADS) {
    for (const [a, b] of runs) {
      s += line(P(a, r), P(b, r), 'lane') + line(P(r, a), P(r, b), 'lane');
    }
    for (const r2 of ROADS) {
      s += crosswalk('x', r2 - 1.7, r) + crosswalk('x', r2 + 1.1, r);
      s += crosswalk('y', r2 - 1.7, r) + crosswalk('y', r2 + 1.1, r);
    }
  }

  // Bridges where the avenues cross the river
  for (const r of ROADS) {
    for (const side of [r - 1, r + 1]) {
      s += `<g class="ink rail">${line(P(side, r0 - 0.3, 0.45), P(side, r1 + 0.3, 0.45))}</g>`;
      for (let y = r0 - 0.3; y <= r1 + 0.31; y += 0.75) s += `<g class="ink rail">${line(P(side, y, 0), P(side, y, 0.45))}</g>`;
    }
  }

  // Block slabs (the curb) and their lots
  for (const ox of BLOCKS) {
    for (const oy of BLOCKS) {
      s += prism(ox, oy, 9, 9, Z0, { c: C.sidewalk });
      const lot = lots[`${ox},${oy}`];
      const i = 0.4;
      s += `<polygon points="${pts(P(ox + i, oy + i, Z0), P(ox + 9 - i, oy + i, Z0), P(ox + 9 - i, oy + 9 - i, Z0), P(ox + i, oy + 9 - i, Z0))}" fill="${lot}" class="lot"/>`;
    }
  }
  return s;
}

/** Trees across the parkland outside town, kept off the roads and the river. */
function outskirts() {
  const step = 1.7;
  for (let gx = EXT[0]; gx < EXT[1]; gx += step) {
    for (let gy = EXT[0]; gy < EXT[1]; gy += step) {
      if (rand() > 0.42) continue;
      const x = gx + rand() * step;
      const y = gy + rand() * step;
      if (x > -1 && x < 32 && y > -1 && y < 32) continue;
      if (ROADS.some((r) => Math.abs(y - r) < 1.7 || Math.abs(x - r) < 1.7)) continue;
      if (y > RIVER[0] - 0.9 && y < RIVER[1] + 0.6) continue;
      const [sx, sy] = P(x, y);
      if (sx < VIEW.x - 30 || sx > VIEW.x + VIEW.w + 30 || sy < VIEW.y + 40 || sy > VIEW.y + VIEW.h + 70) continue;
      add(x, y, tree(x, y, 0));
    }
  }
}

/* ---------- Cars ---------- */

const CAR_COLORS = ['#e23b3b', '#ffd23f', '#00c2ff', '#e219e5', '#f3f2f7', '#1fbf6b', '#ff8a3d'];
const BOUNDS = [-23, -12, -1, 10, 21, 32, 43, 54];

function carSprite(axis: 'x' | 'y', c: string, dir: number) {
  const [w, d] = axis === 'x' ? [1.05, 0.56] : [0.56, 1.05];
  let s = prism(-w / 2, -d / 2, w, d, 0.48, { c, z: 0.06 });
  const [cw, cd] = axis === 'x' ? [w * 0.5, d * 0.84] : [w * 0.84, d * 0.5];
  const cx = axis === 'x' ? (dir > 0 ? -w / 2 + 0.1 : w / 2 - 0.1 - cw) : -cw / 2;
  const cy = axis === 'y' ? (dir > 0 ? -d / 2 + 0.1 : d / 2 - 0.1 - cd) : -cd / 2;
  s += prism(cx, cy, cw, cd, 0.34, { c, z: 0.54, left: C.glass, right: mix(C.glass, '#140a33', 0.45) });
  // Head- or tail-lights on whichever end faces the viewer
  const lights = dir > 0 ? '#fff2a8' : '#ff3b3b';
  const lamps = `<circle cx="7" cy="4" r="2.6" fill="${lights}"/><circle cx="23" cy="4" r="2.6" fill="${lights}"/>`;
  s += axis === 'x' ? g(onR(w / 2, d / 2, 0.4), lamps) : g(onL(-w / 2, d / 2, 0.4), lamps);
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
      [r + 0.5, 1],
      [r - 0.5, -1],
    ]) {
      car('x', lane, dir, CAR_COLORS[i++ % CAR_COLORS.length], rand());
      car('x', lane, dir, CAR_COLORS[i++ % CAR_COLORS.length], rand(), 1.3);
    }
    for (const [lane, dir] of [
      [r - 0.5, 1],
      [r + 0.5, -1],
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

/** Block (0,0): the park, with a water tower and a court. */
function park() {
  // Water tower
  let wt = '<g class="ink">';
  for (const [x, y] of [
    [2.0, 2.0],
    [3.2, 2.0],
    [2.0, 3.2],
  ])
    wt += line(P(x, y, Z0), P(2.6 + (x - 2.6) * 0.55, 2.6 + (y - 2.6) * 0.55, 5.1), 'leg');
  wt += line(P(2.0, 3.2, 2.4), P(3.2, 3.2, 2.4)) + line(P(3.2, 2.0, 2.4), P(3.2, 3.2, 2.4));
  wt += line(P(3.2, 3.2, Z0), P(2.93, 2.93, 5.1), 'leg') + '</g>';
  wt += cyl(2.6, 2.6, 1.0, 2.6, { c: '#5d4f9a', z: 5 });
  const [cx, ct] = P(2.6, 2.6, 7.6);
  const [, apex] = P(2.6, 2.6, 9.2);
  wt += `<g class="ink"><path d="M${n(cx - 72)},${n(ct)}A72,36 0 0 0 ${n(cx + 72)},${n(ct)}L${n(cx)},${n(apex)}Z" fill="#41377a"/></g>`;
  wt += text(cx, ct + 44, 'GM', 34, 't-display outlined', '#ff6ad5');
  add(2.6, 2.6, wt);

  // Basketball court
  const cw = 2.8 * TL;
  const ch = 3.6 * TL;
  const court =
    `<rect width="${n(cw)}" height="${n(ch)}" fill="#b4513a" stroke="${INK}" stroke-width="3"/>` +
    `<g fill="none" stroke="#f3e9dc" stroke-width="2"><rect x="6" y="6" width="${n(cw - 12)}" height="${n(ch - 12)}"/>` +
    `<line x1="6" y1="${n(ch / 2)}" x2="${n(cw - 6)}" y2="${n(ch / 2)}"/><circle cx="${n(cw / 2)}" cy="${n(ch / 2)}" r="16"/>` +
    `<rect x="${n(cw / 2 - 20)}" y="6" width="40" height="34"/><rect x="${n(cw / 2 - 20)}" y="${n(ch - 40)}" width="40" height="34"/></g>`;
  let ct2 = g(onT(5.3, 4.6, Z0), court);
  for (const y of [4.8, 8.0]) {
    ct2 += `<g class="ink">${line(P(6.7, y, Z0), P(6.7, y, 2.2), 'leg')}${prism(6.35, y - 0.05, 0.7, 0.1, 0.5, { c: '#f3f2f7', z: 2.0 })}</g>`;
  }
  add(6.7, 6.4, ct2);

  for (const [x, y] of [
    [1.0, 5.4],
    [1.2, 6.9],
    [1.6, 8.2],
    [3.2, 8.3],
    [4.4, 1.0],
    [5.8, 1.1],
    [7.3, 1.0],
    [8.2, 2.4],
    [8.3, 3.7],
    [3.9, 4.6],
  ])
    add(x, y, tree(x, y));
  add(4.0, 6.2, bench(3.6, 6.1, 'y'));
  add(4.6, 3.4, lamp(4.6, 3.4));
  add(8.4, 8.4, lamp(8.4, 8.4));
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

/** Block (2,0): apartments with Degen on the billboard. */
function apartments(art: CityInput['art']) {
  let a = prism(22.8, 1.0, 3.2, 3.2, 8.5, { c: '#17414a', z: Z0 });
  a += winL(22.8, 1.0, 3.2, 3.2, 8.5, Z0, 4, 9, { pal: [C.warm, C.warm, C.pink] });
  a += winR(22.8, 1.0, 3.2, 3.2, 8.5, Z0, 4, 9, { pal: [C.warm, C.cyan] });
  a += prism(23.3, 1.4, 0.8, 0.8, 0.6, { c: '#4a4170', z: Z0 + 8.5 }) + prism(24.6, 2.6, 0.9, 0.7, 0.5, { c: '#4a4170', z: Z0 + 8.5 });
  add(24.4, 2.6, a);

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

/** Block (1,1): the Emporium, a black-and-gold palace under a great dome, its corner on the street. */
function emporium(s: Spot, art: CityInput['art']) {
  const GOLD = '#e2b04a';
  const STONE = '#231d33';
  const R2 = Math.SQRT1_2;
  // Plan helpers: the corner front runs along x + y = 34; `at` steps out from its middle and along it
  const at = (n: number, u: number, z: number) => P(17 + (n + u) * R2, 17 + (n - u) * R2, z);
  const body = (d: number, z: number, h: number, c: string, top?: string | null) => {
    const k = (Math.SQRT2 - 1) * d;
    const [x0, x1, y0, y1] = [11.8 - d, 18 + d, 11.8 - d, 18 + d];
    const z1 = z + h;
    const sh = shade(c);
    return (
      '<g class="ink">' +
      poly(sh.left, P(x0, y1, z), P(16 + k, y1, z), P(16 + k, y1, z1), P(x0, y1, z1)) +
      poly(mix(sh.left, sh.right, 0.45), P(16 + k, y1, z), P(x1, 16 + k, z), P(x1, 16 + k, z1), P(16 + k, y1, z1)) +
      poly(sh.right, P(x1, 16 + k, z), P(x1, y0, z), P(x1, y0, z1), P(x1, 16 + k, z1)) +
      (top === null ? '' : poly(top ?? sh.top, P(x0, y0, z1), P(x1, y0, z1), P(x1, 16 + k, z1), P(16 + k, y1, z1), P(x0, y1, z1))) +
      '</g>'
    );
  };
  const H = 4.8;
  const zT = Z0 + H;
  let b = body(0.06, Z0, 0.35, '#2e2742');
  b += body(0, Z0, H, STONE, '#3a3352');
  // Shop windows below, tall windows above, an LED screen in the middle of each street front
  const W = 4.2 * TL;
  const screen = (msg: string, size: number) =>
    `<rect x="${n(W / 2 - 66)}" y="12" width="132" height="44" fill="${GOLD}" stroke="${INK}" stroke-width="2"/>` +
    `<rect x="${n(W / 2 - 61)}" y="16" width="122" height="36" fill="url(#bbGrad)"/>` +
    text(W / 2, 41, msg, size, 't-display', '#ffffff', ' letter-spacing="2"');
  b += g(onL(11.8, 18, Z0 + 2.3), windows(W, 2.3 * ZH, 6, 1, { mt: 10, mb: 4, lit: 1, pal: [C.warm] }));
  b += g(onR(18, 16, Z0 + 2.3), windows(W, 2.3 * ZH, 6, 1, { mt: 10, mb: 4, lit: 1, pal: [C.warm] }));
  b += g(onL(11.8, 18, zT), windows(W, 2.3 * ZH, 6, 1, { mt: 8, mb: 8, lit: 0.7, pal: [C.warm, C.cyan] }) + screen('GM', 26));
  b += g(onR(18, 16, zT), windows(W, 2.3 * ZH, 6, 1, { mt: 8, mb: 8, lit: 0.7, pal: [C.warm, C.cyan] }) + screen('OPEN 24/7', 19));
  // Gold belt and the deep cornice, with marquee lights chasing along it
  b += body(0.1, Z0 + 2.3, 0.18, GOLD, null);
  b += body(0.2, zT, 0.3, '#2a2340', '#3a3352');
  const k2 = (Math.SQRT2 - 1) * 0.2;
  b += `<polyline points="${pts(P(11.6, 18.2, zT + 0.15), P(16 + k2, 18.2, zT + 0.15), P(18.2, 16 + k2, zT + 0.15), P(18.2, 11.6, zT + 0.15))}" fill="none" stroke="#ff6ad5" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="0.1 11" class="chase"/>`;
  const zR = zT + 0.3;

  // Corner pavilions; the back one first, the dome, then the two at the sides
  const pav = (x: number, y: number) => prism(x, y, 1.6, 1.6, 1.5, { c: STONE, z: zR, top: '#3a3352' }) + prism(x - 0.06, y - 0.06, 1.72, 1.72, 0.12, { c: GOLD, z: zR + 1.5 });
  b += pav(11.8, 11.8);

  // Drum: arched windows between gold columns, then the attic with the name in neon
  const R = 1.85;
  const zD = zR + 0.1;
  const DH = 2.3;
  b += cyl(14.9, 14.9, R + 0.15, 0.15, { c: STONE, z: zR });
  b += cyl(14.9, 14.9, R, DH, { c: STONE, z: zD, top: '#2a2340' });
  for (let i = 0; i < 16; i++) {
    const a = ((i + 0.5) / 16) * Math.PI * 2;
    const face = Math.cos(a - Math.PI / 4);
    if (face < 0.15) continue;
    const [wx, wy] = P(14.9 + Math.cos(a) * R, 14.9 + Math.sin(a) * R, zD + 0.3);
    const ww = 14 * face;
    b += `<rect x="${n(wx - ww / 2)}" y="${n(wy - 36)}" width="${n(ww)}" height="36" rx="${n(ww / 2)}" fill="${i % 2 ? C.cyan : C.warm}" stroke="${GOLD}" stroke-width="2"/>`;
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    if (Math.cos(a - Math.PI / 4) < 0.05) continue;
    const [cx, cy] = P(14.9 + Math.cos(a) * (R + 0.08), 14.9 + Math.sin(a) * (R + 0.08), zD);
    b += `<line x1="${n(cx)}" y1="${n(cy)}" x2="${n(cx)}" y2="${n(cy - DH * ZH)}" stroke="${GOLD}" stroke-width="4"/>`;
  }
  const zA = zD + DH;
  b += cyl(14.9, 14.9, R + 0.2, 0.1, { c: GOLD, z: zA });
  b += cyl(14.9, 14.9, R + 0.1, 0.5, { c: '#1a1528', z: zA + 0.1 });
  {
    const [cx, cy] = P(14.9, 14.9, zA + 0.35);
    const rx = (R + 0.1) * 67.88;
    const ry = (R + 0.1) * 33.94;
    b += `<path d="M${n(cx - rx)},${n(cy)}A${n(rx)},${n(ry)} 0 0 0 ${n(cx + rx)},${n(cy)}" fill="none" stroke="url(#pulseH)" stroke-width="5" class="neon-strip"/>`;
  }

  // The great dome: black glass, gold ribs and rings
  const zB = zA + 0.6;
  const HD = 3.4;
  const [dx, dy] = P(14.9, 14.9, zB);
  const drx = R * 67.88;
  const dry = R * 33.94;
  const vt = Math.hypot(HD * ZH, dry);
  b += `<g class="ink"><path d="M${n(dx - drx)},${n(dy)}A${n(drx)},${n(vt)} 0 0 1 ${n(dx + drx)},${n(dy)}A${n(drx)},${n(dry)} 0 0 1 ${n(dx - drx)},${n(dy)}Z" fill="#241c40"/></g>`;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    if (Math.cos(a - Math.PI / 4) < -0.05) continue;
    const rib = Array.from({ length: 11 }, (_, j) => {
      const th = (j / 10) * (Math.PI / 2) * 0.94;
      return P(14.9 + Math.cos(a) * R * Math.cos(th), 14.9 + Math.sin(a) * R * Math.cos(th), zB + HD * Math.sin(th));
    });
    b += `<polyline points="${pts(...rib)}" fill="none" stroke="${GOLD}" stroke-width="3.5" stroke-linecap="round"/>`;
  }
  for (const th of [0, Math.PI / 6, Math.PI / 3]) {
    const r = R * Math.cos(th);
    const [cx, cy] = P(14.9, 14.9, zB + HD * Math.sin(th));
    b += `<path d="M${n(cx - r * 67.88)},${n(cy)}A${n(r * 67.88)},${n(r * 33.94)} 0 0 0 ${n(cx + r * 67.88)},${n(cy)}" fill="none" stroke="${GOLD}" stroke-width="${th ? 3 : 5}"/>`;
  }
  b += `<path d="M${n(dx - drx - 6)},${n(dy + 2)}A${n(drx + 6)},${n(dry + 3)} 0 0 0 ${n(dx + drx + 6)},${n(dy + 2)}" fill="none" stroke="#7cf4ff" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="0.1 10" class="chase"/>`;

  // Lantern, cupola and the logo crowning it all
  const zL = zB + HD - 0.15;
  b += cyl(14.9, 14.9, 0.45, 0.8, { c: '#3a2c12', z: zL, top: GOLD });
  {
    const [lx, ly] = P(14.9, 14.9, zL + 0.4);
    b += `<rect x="${n(lx - 18)}" y="${n(ly - 8)}" width="10" height="16" rx="5" fill="${C.warm}"/><rect x="${n(lx + 8)}" y="${n(ly - 8)}" width="10" height="16" rx="5" fill="${C.cyan}"/>`;
    const [ux, uy] = P(14.9, 14.9, zL + 0.8);
    b += `<g class="ink"><path d="M${n(ux - 32)},${n(uy)}A32,24 0 0 1 ${n(ux + 32)},${n(uy)}Z" fill="${GOLD}"/></g>`;
  }
  const zTop = zL + 0.8 + 0.7;
  const lw = 3.8 * TL;
  const lh = lw * (494 / 729);
  const [gx, gy] = P(14.9, 14.9, zTop);
  b += `<g class="ink">${line([gx - 14, gy + 26], [gx - 40, gy - 6], 'leg')}${line([gx + 14, gy + 26], [gx + 40, gy - 6], 'leg')}</g>`;
  b += `<ellipse cx="${n(gx)}" cy="${n(gy - lh / 2)}" rx="${n(lw * 0.75)}" ry="${n(lh * 0.7)}" fill="url(#logoGlow)" class="logo-glow"/>`;
  b += `<image href="${esc(art.logo)}" x="${n(gx - lw / 2)}" y="${n(gy - lh)}" width="${n(lw)}" height="${n(lh)}" preserveAspectRatio="xMidYMid meet" class="roof-logo"/>`;

  b += pav(16.4, 11.8);
  b += pav(11.8, 16.4);
  // Helipad on the right pavilion, glass rail on the left one
  {
    const [hx, hy] = P(17.2, 12.6, zR + 1.62);
    b += `<ellipse cx="${n(hx)}" cy="${n(hy)}" rx="42" ry="21" fill="#1b1729" stroke="${GOLD}" stroke-width="3"/>` + text(hx, hy + 6, 'H', 18, 't-display', '#ffffff');
    b += `<g class="ink">${poly('#1d1a2c', P(11.85, 16.45, zR + 1.62), P(13.35, 16.45, zR + 1.62), P(13.35, 17.95, zR + 1.62), P(11.85, 17.95, zR + 1.62))}</g>`;
    b += `<polyline points="${pts(P(11.85, 17.95, zR + 2.0), P(13.35, 17.95, zR + 2.0), P(13.35, 16.45, zR + 2.0))}" fill="none" stroke="#7fe9ff" stroke-width="2.5" opacity=".8"/>`;
  }

  // The grand corner front: marble steps, four gold columns, entablature with the name, pediment
  for (let k = 0; k < 3; k++) {
    const dd = 1.35 - 0.2 * k;
    const hl = (3.6 - 0.2 * k) / 2;
    const z0 = Z0 + 0.1 * k;
    const z1 = z0 + 0.12;
    b +=
      '<g class="ink">' +
      poly('#3a3352', at(dd, -hl, z0), at(dd, hl, z0), at(dd, hl, z1), at(dd, -hl, z1)) +
      poly('#4a4266', at(0, -hl, z1), at(0, hl, z1), at(dd, hl, z1), at(dd, -hl, z1)) +
      '</g>';
  }
  {
    const [x0, y0] = at(0.04, -0.5, Z0 + 0.32);
    b += `<path d="M${n(x0)},${n(y0)}v-40a${n(48 * R2 * 0.7)},${n(48 * R2 * 0.7)} 0 0 1 ${n(96 * R2 * 0.7)},0v40Z" fill="#ffd27a" stroke="${GOLD}" stroke-width="3"/>`;
  }
  const zc = Z0 + 0.32;
  const zE = Z0 + 4.3;
  for (const u of [-1.15, -0.38, 0.38, 1.15]) {
    const x = 17 + (0.72 + u) * R2;
    const y = 17 + (0.72 - u) * R2;
    b += cyl(x, y, 0.13, zE - zc, { c: GOLD, z: zc });
  }
  b +=
    '<g class="ink">' +
    poly('#2a2340', at(1.04, -1.55, zE), at(1.04, 1.55, zE), at(1.04, 1.55, zE + 0.5), at(1.04, -1.55, zE + 0.5)) +
    poly(GOLD, at(1.06, -1.6, zE + 0.5), at(1.06, 1.6, zE + 0.5), at(1.06, 0, zE + 1.35)) +
    poly('#2a2340', at(1.06, -1.6, zE + 0.5), at(1.06, 0, zE + 1.35), at(-0.02, 0, zE + 1.35), at(-0.02, -1.6, zE + 0.5)) +
    poly('#1f1a30', at(1.06, 1.6, zE + 0.5), at(1.06, 0, zE + 1.35), at(-0.02, 0, zE + 1.35), at(-0.02, 1.6, zE + 0.5)) +
    '</g>';
  {
    const [tx, ty] = at(1.04, 0, zE + 0.25);
    b += text(tx, ty + 4, 'THE DEGEN EMPORIUM', 10, 't-mono', '#ffd36b', ' font-weight="700" letter-spacing="1.5"');
  }

  add(14.9, 14.9, spot('emporium', s, b));
  pin('emporium', s, P(14.9, 14.9, zTop + lh / ZH + 2.2));

  // Forecourt fountain at the foot of the steps
  let f = cyl(18.9, 18.9, 0.8, 0.35, { c: '#2e2742', z: Z0, top: '#2a6fd6' });
  const [fx0, fy0] = P(18.9, 18.9, Z0 + 0.35);
  f += `<ellipse cx="${n(fx0)}" cy="${n(fy0)}" rx="${n(0.8 * 67.88)}" ry="${n(0.8 * 33.94)}" fill="none" stroke="${GOLD}" stroke-width="3"/>`;
  for (let k = 0; k < 2; k++)
    f +=
      `<ellipse cx="${n(fx0)}" cy="${n(fy0)}" rx="10" ry="5" fill="none" stroke="#bff6ff" stroke-width="1.5">` +
      `<animate attributeName="rx" values="8;46" dur="2.4s" begin="-${k * 1.2}s" repeatCount="indefinite"/>` +
      `<animate attributeName="ry" values="4;23" dur="2.4s" begin="-${k * 1.2}s" repeatCount="indefinite"/>` +
      `<animate attributeName="opacity" values="1;0" dur="2.4s" begin="-${k * 1.2}s" repeatCount="indefinite"/></ellipse>`;
  f += `<g class="spray"><path d="M${n(fx0)},${n(fy0)}q-14,-56 -32,-6M${n(fx0)},${n(fy0)}q14,-56 32,-6M${n(fx0)},${n(fy0)}v-50" fill="none" stroke="#9fefff" stroke-width="3" stroke-linecap="round"/></g>`;
  add(18.9, 18.9, f);

  for (const [x, y] of [
    [19.0, 12.6],
    [19.0, 14.6],
    [12.6, 19.0],
    [14.6, 19.0],
  ]) {
    add(x, y, cyl(x, y, 0.42, 0.35, { c: STONE, z: Z0, top: '#1d3b30' }) + tree(x, y, Z0 + 0.35, 0.85, 'round'));
  }
  add(11.6, 11.6, lamp(11.6, 11.6));
  add(19.5, 11.6, lamp(19.5, 11.6));
  add(11.6, 19.5, lamp(11.6, 19.5));
  add(19.35, 16.3, lamp(19.35, 16.3));
  add(16.3, 19.35, lamp(16.3, 19.35));
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

/** Block (2,2): the building site with a crane, for the plan. */
function construction(s: Spot) {
  const c = '#8d8aa0';
  let b = prism(22.8, 22.8, 4.6, 4.2, 0.3, { c, z: Z0 });
  const xs = [22.9, 25.0, 27.1];
  const ys = [22.9, 24.8, 26.7];
  const col = (x: number, y: number, z: number, h: number) => prism(x, y, 0.3, 0.3, h, { c: '#a7a4b8', z });
  const levels = [
    { z: Z0 + 0.3, h: 2.3, rows: ys, slab: [22.8, 4.2] },
    { z: Z0 + 2.85, h: 2.3, rows: ys, slab: [22.8, 2.3] },
    { z: Z0 + 5.4, h: 1.6, rows: [ys[0]], slab: null },
  ] as const;
  for (const L of levels) {
    const posts = xs.flatMap((x) => L.rows.map((y) => [x, y] as const)).sort((a, b2) => a[0] + a[1] - (b2[0] + b2[1]));
    for (const [x, y] of posts) b += col(x, y, L.z, L.h);
    if (L.slab) b += prism(22.8, L.slab[0], 4.6, L.slab[1], 0.25, { c, z: L.z + L.h });
  }
  // Rebar sticking out of the top
  let rebar = '';
  for (const x of xs) rebar += line(P(x + 0.15, 23.05, Z0 + 7.0), P(x + 0.15, 23.05, Z0 + 7.8));
  b += `<g class="rebar">${rebar}</g>`;

  // Crane
  const mz = Z0;
  const mh = 8.5;
  b += prism(28.9, 23.4, 0.5, 0.5, mh, { c: '#f5c400', z: mz });
  let lattice = '';
  for (let z = 0; z < mh; z += 1) {
    lattice += `<path d="M0,${n(z * ZH)}L${n(0.5 * TL)},${n((z + 1) * ZH)}M${n(0.5 * TL)},${n(z * ZH)}L0,${n((z + 1) * ZH)}"/>`;
  }
  b += g(onL(28.9, 23.9, mz + mh), lattice, 'lattice') + g(onR(29.4, 23.9, mz + mh), lattice, 'lattice');
  const jz = mz + mh;
  b += prism(28.7, 23.9, 0.9, 0.8, 0.8, { c: '#f5c400', z: jz - 0.9, left: '#8fe7ff' });
  const [px, py] = P(29.15, 23.65, jz + 0.45);
  const [, ptop] = P(29.15, 23.65, jz + 2.4);
  const [ax, ay] = P(24.6, 23.65, jz + 0.45);
  const [bx, by] = P(31.4, 23.65, jz + 0.45);
  b += `<g class="ink"><path d="M${n(ax)},${n(ay)}L${n(px)},${n(ptop)}L${n(bx)},${n(by)}" fill="none" stroke-width="2"/><line x1="${n(px)}" y1="${n(py)}" x2="${n(px)}" y2="${n(ptop)}" stroke-width="5"/></g>`;
  b += prism(24.2, 23.45, 7.8, 0.4, 0.45, { c: '#f5c400', z: jz });
  b += prism(30.4, 23.35, 1.0, 0.6, 0.9, { c: '#6f6c80', z: jz - 0.9 });
  // Hook and a swinging beam
  const [hx, hy] = P(25.4, 23.65, jz);
  const [, hb] = P(25.4, 23.65, Z0 + 6.6);
  b +=
    `<g><animateTransform attributeName="transform" type="rotate" values="-5 ${n(hx)} ${n(hy)};5 ${n(hx)} ${n(hy)};-5 ${n(hx)} ${n(hy)}" dur="5s" repeatCount="indefinite"/>` +
    `<line x1="${n(hx)}" y1="${n(hy)}" x2="${n(hx)}" y2="${n(hb)}" stroke="${INK}" stroke-width="2.5"/>` +
    `<g transform="translate(${n(hx)},${n(hb)})">${prism(-0.9, -0.12, 1.8, 0.24, 0.3, { c: '#e23b3b', z: -0.3 })}</g></g>`;

  // Fence with the banner along the front
  const fz = Z0 + 1.3;
  b += g(
    onL(22.4, 30.7, fz),
    `<rect width="${n(8.3 * TL)}" height="31" fill="url(#mesh)" stroke="${INK}" stroke-width="2.5"/>` +
      `<rect x="${n(8.3 * TL * 0.18)}" y="4" width="${n(8.3 * TL * 0.64)}" height="23" fill="#f5c400" stroke="${INK}" stroke-width="2"/>` +
      text(8.3 * TL * 0.5, 21, "WHAT'S NEXT · THE PLAN, ROUGHLY", 13, 't-mono', '#05050a', ' font-weight="700" letter-spacing="1"')
  );
  b += g(onR(30.7, 30.7, fz), `<rect width="${n(8.3 * TL)}" height="31" fill="url(#mesh)" stroke="${INK}" stroke-width="2.5"/><rect width="${n(8.3 * TL)}" height="6" fill="url(#hazard)"/>`);
  add(26.5, 26.5, spot('plan', s, b));
  pin('plan', s, P(26.2, 24.6, Z0 + 10.4));

  // Cones and a dirt pile
  for (const [x, y] of [
    [23.2, 28.8],
    [24.2, 29.4],
    [28.8, 27.6],
  ]) {
    const [cx, cy] = P(x, y, Z0);
    add(x, y, `<g class="ink">${poly('#ff8a3d', [cx - 7, cy], [cx + 7, cy], [cx, cy - 20])}<rect x="${n(cx - 4)}" y="${n(cy - 11)}" width="8" height="3" fill="#fff" stroke="none"/></g>`);
  }
  const [dx, dy] = P(27.2, 29.0, Z0);
  add(27.2, 29.0, `<g class="ink"><path d="M${n(dx - 46)},${n(dy)}q20,-34 46,-30q30,4 46,30z" fill="#6b4a3a"/></g>`);
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

  const lots: Record<string, string> = {
    '0,0': C.grass,
    '11,0': C.grass,
    '22,0': C.grass,
    '0,11': 'url(#paving)',
    '11,11': 'url(#paving)',
    '22,11': C.concrete,
    '0,22': C.grass,
    '11,22': C.concrete,
    '22,22': C.dirt,
  };
  const base = ground(lots);

  park();
  signal(spots.signal);
  apartments(art);
  vault(spots.vault);
  emporium(spots.emporium, art);
  shop(spots.shop);
  workshop(spots.workshop);
  construction(spots.plan);
  postOffice(spots.telegram);
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
export const EMPORIUM_FOCUS = P(14.9, 14.9, 7);
