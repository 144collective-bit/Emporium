/*
 * The ground the city stands on: grass, roads with markings, the river and
 * its bridges, block slabs, trees, street lamps and a skyline in the haze.
 *
 * World units: 1 = one map tile. x and z match the 2D map's x and y; y is up.
 * The street plan is layout.ts and streetplan.ts (`PLAN`): downtown (0-60)
 * crossed by two cross streets each way and three diagonals, its blocks cut
 * into lots, triangles, pocket parks and the hangout square (downtown.ts);
 * ring avenues (two lanes each way and a median) round it, and the plot
 * districts (see plots.ts) beyond to the north, west and east. The river runs
 * south of the north-bank avenue; across its four bridges the south bank
 * avenue carries the south row of districts. Every block has a sidewalk, and
 * both banks a lamp-lit promenade.
 */
import * as THREE from 'three';
import { DISTRICTS } from '../../data/plots';
import { Batch, canvasTex, facadeMat, flickerTogether, fx, glowMat, glowTex, lit, neon, PAL, rand, rng, sidesBox, siteMat, toon } from './kit';
import { BLOCKS, BS, CENTER_XZ, CORE_ROADS, DOWNTOWN, EW_ROADS, EXT, LANE, MEDIAN, NS_ROADS, RIVER, SEATS, SOUTH_ROAD, WALK_W, type Road } from './layout';
import { PLAN, offsetLine, pointAt, riverBridges, streetLength, type Pt, type Street } from './streetplan';
import { HIGHWAY, HIGHWAY_HALF } from './highway';
import { DIAGONALS, DIAGONAL_LAMPS } from './downtown';
import { BENDS, BEND_REACH, KERB_RUNS, OUTSIDE, PADS, PROMENADE, offFootbridge } from './outer';
import { SITE } from './airfield';
import { TILE, tileKey, tileOf, tilesIn } from './tiles';
import { outskirtsTrees } from './outskirts';
import { SKYLINE } from './bounds';
import { keyRect } from './tileplan';
import { site } from './tilework';
import { lampKind } from './trenches';
import { AXIS_X, AXIS_ZEBRAS, BOULEVARD_X, LANE_HALF } from './uptown';
import { WATERFRONT_RECT } from './waterfront';
import { BRIDGE_RECT } from './stadium';
import { SWAY, lampGlow, newLamp, type Lamp } from './dusk';

export { BLOCKS, BS, CORE_ROADS, EW_ROADS, EXT, NS_ROADS, RIVER, SOUTH_ROAD, WALK_W, type Road };
/** District blocks around the core: one large plot each (src/data/plots.ts). */
export { DISTRICTS };
export const SLAB = 0.15;
/** How far the grass carries on past the world's edge, under the skyline ring */
export const SKIRT = 80;
export const CENTER = new THREE.Vector3(CENTER_XZ.x, 0, CENTER_XZ.z);

export type Env = { t: number; dt: number; night: number; rain: number; day: number; /** The hour of the city's day, 0-24 (sky.ts) */ hour: number };
export type Tick = (env: Env) => void;

/* ---------- Trees and lamps are instanced: collect first, build once ---------- */

const trees: { x: number; z: number; s: number; pine: boolean; y: number }[] = [];
export function addTree(x: number, z: number, s = 0.8 + rand() * 0.45, pine = rand() < 0.3, y = SLAB) {
  trees.push({ x, z, s, pine, y });
}

const lamps: { x: number; z: number; ry: number; y: number }[] = [];
/** How many trees and lamps are placed so far (landmarks.ts moves a landmark's own ones with it) */
export const placedMark = () => ({ trees: trees.length, lamps: lamps.length });
export function shiftPlaced(from: { trees: number; lamps: number }, dx: number, dz: number) {
  for (const t of trees.slice(from.trees)) (t.x += dx), (t.z += dz);
  for (const l of lamps.slice(from.lamps)) (l.x += dx), (l.z += dz);
}
export function addLamp(x: number, z: number, ry = 0, y = SLAB) {
  lamps.push({ x, z, ry, y });
}
/** A pool of lamplight on the ground with no street lamp over it (alley wall lamps): drawn with the street lamps' pools */
const pools: { x: number; z: number; y: number; size: number; sodium: boolean }[] = [];
export function addPool(x: number, z: number, size: number, y = SLAB, sodium = false) {
  pools.push({ x, z, y, size, sodium });
}

/** Every tree, lamp and pool placed (the site worker takes the main thread's: sitework.ts) */
export interface Placed {
  trees: typeof trees;
  lamps: typeof lamps;
  pools: typeof pools;
}
export const placed = (): Placed => ({ trees, lamps, pools });
/** The site worker: the main thread's trees, lamps and pools, in place of its own (sitework.ts) */
export function usePlaced(p: Placed) {
  trees.splice(0, trees.length, ...p.trees);
  lamps.splice(0, lamps.length, ...p.lamps);
  pools.splice(0, pools.length, ...p.pools);
}

/* ---------- Ground ---------- */

const paving = canvasTex(256, 256, (ctx) => {
  ctx.fillStyle = '#3a3470';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#4a4388';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }
});
paving.wrapS = paving.wrapT = THREE.RepeatWrapping;
paving.repeat.set(4, 4);

/**
 * The Trenches' yards (the grit step): worn concrete, 8 tiles to a repeat (laid on in world units): slabs two tiles
 * square with their joints, a few slabs patched, oil stains, specks and cracks running across
 */
export const YARD_REPEAT = 8;
const yard = canvasTex(512, 512, (c) => {
  const r = rng(77);
  c.fillStyle = '#5d5a6d';
  c.fillRect(0, 0, 512, 512);
  // Specks of grit, light and dark
  for (let i = 0; i < 2600; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(30,26,40,0.22)' : 'rgba(160,156,176,0.16)';
    c.fillRect(r() * 512, r() * 512, 1 + r() * 2, 1 + r() * 2);
  }
  // A few slabs replaced, a shade off
  for (let i = 0; i < 6; i++) {
    c.fillStyle = r() < 0.5 ? '#67647a' : '#545164';
    c.fillRect(Math.floor(r() * 4) * 128 + 2, Math.floor(r() * 4) * 128 + 2, 124, 124);
  }
  // Stains, wrapping round the edges so the repeat doesn't show
  for (let i = 0; i < 14; i++) {
    const [x, y, rad] = [r() * 512, r() * 512, 14 + r() * 44];
    for (const [ox, oy] of [
      [0, 0],
      [512, 0],
      [-512, 0],
      [0, 512],
      [0, -512],
    ]) {
      const g = c.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      g.addColorStop(0, 'rgba(24,20,34,0.38)');
      g.addColorStop(1, 'rgba(24,20,34,0)');
      c.fillStyle = g;
      c.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
    }
  }
  // The joints
  c.fillStyle = '#423f53';
  for (let k = 0; k < 512; k += 128) {
    c.fillRect(k, 0, 3, 512);
    c.fillRect(0, k, 512, 3);
  }
  // Cracks: wandering lines, drawn again a repeat over where they run off an edge
  c.strokeStyle = '#363346';
  c.lineWidth = 1.6;
  c.lineJoin = 'round';
  for (let i = 0; i < 16; i++) {
    const pts: [number, number][] = [[r() * 512, r() * 512]];
    let a = r() * Math.PI * 2;
    for (let k = 0; k < 7; k++) {
      a += (r() - 0.5) * 1.3;
      const [x, y] = pts[pts.length - 1];
      pts.push([x + Math.cos(a) * (8 + r() * 16), y + Math.sin(a) * (8 + r() * 16)]);
    }
    for (const ox of [-512, 0, 512])
      for (const oy of [-512, 0, 512]) {
        c.beginPath();
        pts.forEach(([x, y], k) => (k ? c.lineTo(x + ox, y + oy) : c.moveTo(x + ox, y + oy)));
        c.stroke();
      }
  }
});
yard.wrapS = yard.wrapT = THREE.RepeatWrapping;

const LOTS: Record<string, THREE.Material> = {
  grass: toon('#2f7a52'),
  paving: new THREE.MeshToonMaterial({ map: paving, color: '#ffffff' }),
  concrete: toon('#4b4766'),
  dirt: toon('#6a4a3c'),
  yard: new THREE.MeshToonMaterial({ map: yard, color: '#ffffff' }),
};
export type LotKind = keyof typeof LOTS;
/** The lot surfaces (grass, paving, concrete, dirt), for squares and pads drawn elsewhere */
export const lotMat = (k: LotKind) => LOTS[k];

/** A flat outline at height y, facing up (UVs one texture repeat per lot, like a block's) */
export function flatPoly(poly: Pt[], y: number, repeat = BS - 0.8) {
  const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, y, 0);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / repeat, uv.getY(i) / repeat);
  return g;
}
/** An outline raised from the ground to height h (a kerbed slab) */
export function slabPoly(poly: Pt[], h: number) {
  const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  return new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false }).rotateX(-Math.PI / 2);
}
/** An outline pulled in by d, corners mitred */
export function insetPoly(poly: Pt[], d: number): Pt[] {
  const n = poly.length;
  return poly.map((p, i) => {
    const a = poly[(i + n - 1) % n];
    const b = poly[(i + 1) % n];
    const e0 = [p[0] - a[0], p[1] - a[1]];
    const e1 = [b[0] - p[0], b[1] - p[1]];
    const l0 = Math.hypot(e0[0], e0[1]);
    const l1 = Math.hypot(e1[0], e1[1]);
    // Inward normals of a counter-clockwise outline (from above): to the left of travel
    const n0 = [e0[1] / l0, -e0[0] / l0];
    const n1 = [e1[1] / l1, -e1[0] / l1];
    const m = [n0[0] + n1[0], n0[1] + n1[1]];
    const k = d / (1 + n0[0] * n1[0] + n0[1] * n1[1]);
    return [p[0] + m[0] * k, p[1] + m[1] * k] as Pt;
  });
}
/** A convex outline clipped to a rectangle (empty if it's outside it) */
function clipRect(poly: Pt[], x0: number, z0: number, x1: number, z1: number): Pt[] {
  let out = poly;
  const edges: [(p: Pt) => number, (a: Pt, b: Pt) => Pt][] = [
    [(p) => p[0] - x0, (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])]],
    [(p) => x1 - p[0], (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] - z0, (a, b) => [a[0] + ((b[0] - a[0]) * (z0 - a[1])) / (b[1] - a[1]), z0]],
    [(p) => z1 - p[1], (a, b) => [a[0] + ((b[0] - a[0]) * (z1 - a[1])) / (b[1] - a[1]), z1]],
  ];
  for (const [inside, cut] of edges) {
    const src = out;
    out = [];
    for (let i = 0; i < src.length; i++) {
      const a = src[i];
      const b = src[(i + 1) % src.length];
      const ia = inside(a) >= 0;
      const ib = inside(b) >= 0;
      if (ia) out.push(a);
      if (ia !== ib) out.push(cut(a, b));
    }
    if (out.length < 3) return [];
  }
  return out;
}
/** Bigger than a tile either way (a park's lawn): drawn in a piece per tile (`tiled()`) */
const bigPoly = (poly: Pt[]) => {
  const xs = poly.map((p) => p[0]);
  const zs = poly.map((p) => p[1]);
  return Math.max(...xs) - Math.min(...xs) > TILE || Math.max(...zs) - Math.min(...zs) > TILE;
};
/**
 * A flat convex outline at y cut into a piece per tile. `tileBatch()` files each triangle under the tile its middle
 * is in, so one long triangle across a big lawn would go with that tile (out of view, all of it)
 */
function tiled(poly: Pt[], y: number, repeat?: number): THREE.BufferGeometry[] {
  const xs = poly.map((p) => p[0]);
  const zs = poly.map((p) => p[1]);
  return tilesIn(Math.min(...xs), Math.min(...zs), Math.max(...xs) - 1e-6, Math.max(...zs) - 1e-6)
    .map(([i, j]) => clipRect(poly, i * TILE, j * TILE, (i + 1) * TILE, (j + 1) * TILE))
    .filter((piece) => piece.length >= 3)
    .map((piece) => flatPoly(piece, y, repeat));
}
/**
 * The ring of a sidewalk `w` wide just inside an outline, at y: its edges cut every few tiles so no triangle is long
 * (tileBatch() files each under the tile its middle is in)
 */
function ring(poly: Pt[], w: number, y: number) {
  const dense: Pt[] = [];
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length];
    const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 8));
    for (let k = 0; k < n; k++) dense.push([p[0] + ((q[0] - p[0]) * k) / n, p[1] + ((q[1] - p[1]) * k) / n]);
  });
  const inner = insetPoly(dense, w);
  const pos: number[] = [];
  for (let i = 0; i < dense.length; i++) {
    const j = (i + 1) % dense.length;
    const [a, c, d, e] = [dense[i], dense[j], inner[j], inner[i]];
    // Each triangle wound to face up
    const tri = (p: Pt, q: Pt, t: Pt) => {
      const up = (q[1] - p[1]) * (t[0] - p[0]) - (q[0] - p[0]) * (t[1] - p[1]) > 0;
      for (const v of up ? [p, q, t] : [p, t, q]) pos.push(v[0], y, v[1]);
    };
    tri(a, c, d);
    tri(a, d, e);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  return g;
}
/** A big outline raised to h, in pieces: its top a piece per tile, its sides a wall each edge */
function tiledSlab(poly: Pt[], h: number): THREE.BufferGeometry[] {
  const pos: number[] = [];
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
  const cz = poly.reduce((s, p) => s + p[1], 0) / poly.length;
  for (let i = 0; i < poly.length; i++) {
    const [p, q] = [poly[i], poly[(i + 1) % poly.length]];
    const quad = [
      [p[0], 0, p[1]],
      [q[0], 0, q[1]],
      [q[0], h, q[1]],
      [p[0], h, p[1]],
    ];
    // Wound 0-1-2 it faces (-ez, ex): turned round if that faces in
    const [ex, ez] = [q[0] - p[0], q[1] - p[1]];
    const out = -ez * (p[0] - cx) + ex * (p[1] - cz) > 0;
    for (const k of out ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]) pos.push(...quad[k]);
  }
  const walls = new THREE.BufferGeometry();
  walls.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  walls.computeVertexNormals();
  return [walls, ...tiled(poly, h)];
}
const isRect = (poly: Pt[]) => poly.length === 4 && poly.every((p, i) => { const q = poly[(i + 1) % 4]; return p[0] === q[0] || p[1] === q[1]; });

/** Water: deep colour with drifting highlights and, at night, neon streaks. */
export const waterMat = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    night: { value: 1 },
    rain: { value: 0 },
    deep: { value: new THREE.Color('#123a6b') },
    sky: { value: new THREE.Color('#5fb0ff') },
  },
  vertexShader: /* glsl */ `
    varying vec3 vPos;
    void main() { vPos = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vPos, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform float time; uniform float night; uniform float rain; uniform vec3 deep; uniform vec3 sky;
    varying vec3 vPos;
    float h(float n) { return fract(sin(n) * 43758.5453); }
    void main() {
      float wave = sin(vPos.x * 0.9 + time * 1.3) * sin(vPos.z * 2.7 - time * 0.8);
      vec3 col = mix(deep, sky, 0.18 + 0.12 * wave);
      // Highlights drifting downstream
      float lane = floor(vPos.z * 3.0);
      float streak = smoothstep(0.92, 1.0, sin(vPos.x * 0.35 + time * (0.6 + h(lane) * 0.8) + h(lane) * 40.0));
      col += streak * mix(vec3(0.35), vec3(0.0), night) * 0.6;
      // Neon reflections at night
      vec3 neonCol = mix(vec3(1.0, 0.25, 0.85), vec3(0.0, 0.9, 1.0), h(lane + 3.0));
      float ref = smoothstep(0.75, 1.0, sin(vPos.x * 0.12 + h(lane) * 30.0)) * (0.5 + 0.5 * sin(time * 2.0 + vPos.x));
      col += neonCol * ref * night * 0.55;
      // Rain rings
      float ring = smoothstep(0.96, 1.0, sin(length(fract(vPos.xz * 0.8) - 0.5) * 40.0 - time * 8.0));
      col += ring * rain * 0.25;
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }
  `,
});

/** Wet-road sheen: neon streaks that show on the asphalt when it rains (driven by the rain level). */
export const puddleMat = new THREE.MeshBasicMaterial({
    map: canvasTex(64, 256, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,.9)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(20, 0, 24, 256);
    }),
    color: '#ffffff',
    transparent: true,
    blending: THREE.AdditiveBlending, fog: false,
    depthWrite: false,
});

/**
 * Where the highway, or a street of The Trenches (trenches.ts) or Uptown (uptown.ts), meets road `i` (an east-west
 * road's x, a north-south road's z), each widened to the asphalt of the road that meets it: gaps in that road's median
 * and lines (and where Uptown's axis crosses it on foot, for its zebra)
 */
function highwayGaps(axis: 'ew' | 'ns', i: number): [number, number][] {
  const road = `${axis}${i}`;
  const gaps = PLAN.crossings
    .filter((c) => c.streets.includes(road) && (c.streets.includes('highway') || c.streets.some((id) => id.startsWith('trench-') || id.startsWith('uptown-'))))
    .map((c): [number, number] => {
      const v = axis === 'ew' ? c.at[0] : c.at[1];
      const half = c.streets.includes('highway') ? HIGHWAY_HALF : PLAN.streets.find((s) => s.id === c.streets.find((id) => id !== road))!.half;
      return [v - half - 0.2, v + half + 0.2];
    });
  if (axis === 'ew' && AXIS_ZEBRAS.some((z) => z.z === EW_ROADS[i].c)) gaps.push([AXIS_X - LANE_HALF - 0.2, AXIS_X + LANE_HALF + 0.2]);
  return gaps;
}

/**
 * The highway's centre line in runs, sampled every `step`: broken at each of its junctions (the crossing
 * road's asphalt and a little more) and over the river (its bridge has no median)
 */
function highwayRuns(step: number): Pt[][] {
  const hw: Street = PLAN.streets.find((s) => s.kind === 'highway')!;
  const len = streetLength(hw);
  const meets = PLAN.crossings
    .filter((c) => c.streets.includes('highway'))
    .map((c) => ({ at: c.at, clear: PLAN.streets.find((s) => s.id === c.streets[0])!.half + 1.2 }));
  const runs: Pt[][] = [];
  let run: Pt[] = [];
  for (let d = 0; d <= len + 1e-6; d += step) {
    const p = pointAt(hw, Math.min(d, len)).at;
    const open = meets.every((c) => Math.hypot(p[0] - c.at[0], p[1] - c.at[1]) > c.clear) && !(p[1] > RIVER[0] - 0.7 && p[1] < RIVER[1] + 0.7);
    if (open) run.push(p);
    else if (run.length) {
      if (run.length > 1) runs.push(run);
      run = [];
    }
  }
  if (run.length > 1) runs.push(run);
  return runs;
}

/** A flat strip along a polyline, from `l` to `r` right of it, its top at y, facing up */
function strip(pts: Pt[], l: number, r: number, y: number) {
  const L = offsetLine(pts, l);
  const R = offsetLine(pts, r);
  const pos: number[] = [];
  const tri = (p: Pt, q: Pt, t: Pt) => {
    const up = (q[1] - p[1]) * (t[0] - p[0]) - (q[0] - p[0]) * (t[1] - p[1]) > 0;
    for (const v of up ? [p, q, t] : [p, t, q]) pos.push(v[0], y, v[1]);
  };
  for (let i = 1; i < pts.length; i++) {
    tri(L[i - 1], R[i - 1], R[i]);
    tri(L[i - 1], R[i], L[i]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  return g;
}

/** An upright wall along a polyline, `off` right of it, from the ground to y, facing right (side 1) or left (-1) */
function wall(pts: Pt[], off: number, y: number, side: number) {
  const W = offsetLine(pts, off);
  const pos: number[] = [];
  for (let i = 1; i < W.length; i++) {
    const [a, c] = [W[i - 1], W[i]];
    const quad = [
      [a[0], 0, a[1]],
      [c[0], 0, c[1]],
      [c[0], y, c[1]],
      [a[0], y, a[1]],
    ];
    // Facing right of travel: wound so (c - a) x up points right
    const [p0, p1, p2, p3] = side > 0 ? [quad[1], quad[0], quad[3], quad[2]] : quad;
    pos.push(...p0, ...p2, ...p1, ...p0, ...p3, ...p2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Marks along a polyline every `every`, each turned along it */
function along(pts: Pt[], every: number, put: (x: number, z: number, q: THREE.Quaternion) => void) {
  let carry = 0;
  const yAxis = new THREE.Vector3(0, 1, 0);
  for (let i = 1; i < pts.length; i++) {
    const [a, c] = [pts[i - 1], pts[i]];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (len < 1e-9) continue;
    const [ux, uz] = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
    const q = new THREE.Quaternion().setFromAxisAngle(yAxis, Math.atan2(-uz, ux));
    for (let p = carry; p < len; p += every) put(a[0] + ux * p, a[1] + uz * p, q);
    carry = (carry - len) % every;
    if (carry < 0) carry += every;
  }
}

/**
 * The ground. `lots` picks a surface for a block (by its plan id, like 'dt-c' or
 * 'district-N1') or for a landmark's own lot inside its block (by its old block, layout.ts SEATS).
 */
export function buildGround(scene: THREE.Scene, lots: Record<string, LotKind>) {
  const [e0, e1] = EXT;
  const L = e1 - e0;
  const mid = (e0 + e1) / 2;
  const b = new Batch();

  // Grass everywhere, a tile at a time (growth plan Phase 5), and on past the edge under the skyline's towers
  // (so they stand on land, not on nothing); then the river cut in on top
  const grass = toon('#245c45');
  const [g0, g1] = [e0 - SKIRT, e1 + SKIRT];
  for (const [i, j] of tilesIn(g0, g0, g1 - 1e-6, g1 - 1e-6)) {
    const [x0, z0, x1, z1] = [Math.max(g0, i * TILE), Math.max(g0, j * TILE), Math.min(g1, (i + 1) * TILE), Math.min(g1, (j + 1) * TILE)];
    b.add(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, (z0 + z1) / 2), grass);
  }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(L, RIVER[1] - RIVER[0]), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(mid, 0.01, (RIVER[0] + RIVER[1]) / 2);
  scene.add(water);
  const stone = toon('#6b6790');
  b.box(e0, 0, RIVER[0] - 0.25, L, 0.12, 0.25, stone);
  b.box(e0, 0, RIVER[1], L, 0.12, 0.25, stone);

  // A promenade on each bank: between the north-bank avenue and the water, and the water and the south bank avenue
  const northBank = EW_ROADS.filter((r) => r.c < RIVER[0]).at(-1)!;
  const southBank = EW_ROADS.find((r) => r.c === SOUTH_ROAD)!;
  const promenade = toon('#4a4388');
  for (const [z0, z1] of [
    [northBank.c + northBank.half, RIVER[0] - 0.25],
    [RIVER[1] + 0.25, southBank.c - southBank.half],
  ])
    b.box(e0, 0, z0, L, 0.05, z1 - z0, promenade);
  // Lamps along the water, reaching out over the walk (clear of the bridges)
  const nearBridge = (x: number) => NS_ROADS.some((r) => Math.abs(x - r.c) < r.half + WALK_W + 0.9) || !offFootbridge(x, 0.6);
  // (the north bank's carried on west along Uptown, the boulevard's line: uptown.ts)
  for (let x = PROMENADE.x[0]; x <= PROMENADE.x[1]; x += 6)
    if (!nearBridge(x)) {
      addLamp(x, RIVER[0] - 0.4, Math.PI / 2, 0.05);
      addLamp(x, RIVER[1] + 0.4, -Math.PI / 2, 0.05);
    }
  for (let x = PROMENADE.x[0] - 6; x >= BOULEVARD_X[0] + 1; x -= 6) if (!nearBridge(x)) addLamp(x, RIVER[0] - 0.4, Math.PI / 2, 0.05);

  // Roads: asphalt, and down each avenue a raised median (broken at crossings and over the river)
  const asphalt = toon('#26243f');
  for (const r of EW_ROADS) b.box(e0, 0, r.c - r.half, L, 0.03, r.half * 2, asphalt);
  for (const r of NS_ROADS) b.box(r.c - r.half, 0.002, e0, r.half * 2, 0.03, L, asphalt);
  const median = toon('#3f5a4a');
  const kerbTop = toon('#5a5290');
  /** Stretches of a road between the roads crossing it (and any other gaps, like the river) */
  const runsBetween = (cross: Road[], gaps: [number, number][] = []): [number, number][] => {
    const cuts = [...cross.map((r): [number, number] => [r.c - r.half - 0.2, r.c + r.half + 0.2]), ...gaps].sort((p, q) => p[0] - q[0]);
    const runs: [number, number][] = [];
    let at = e0;
    for (const [c0, c1] of cuts) {
      if (c0 > at) runs.push([at, c0]);
      at = Math.max(at, c1);
    }
    if (at < e1) runs.push([at, e1]);
    return runs;
  };
  const river: [number, number] = [RIVER[0] - 0.7, RIVER[1] + 0.7];
  for (const r of EW_ROADS)
    if (r.lanes === 2)
      for (const [a0, a1] of runsBetween(NS_ROADS, highwayGaps('ew', EW_ROADS.indexOf(r)))) {
        b.box(a0, 0, r.c - MEDIAN / 2, a1 - a0, SLAB, MEDIAN, kerbTop);
        b.box(a0, SLAB, r.c - MEDIAN / 2 + 0.06, a1 - a0, 0.005, MEDIAN - 0.12, median);
      }
  for (const r of NS_ROADS)
    if (r.lanes === 2)
      for (const [a0, a1] of runsBetween(EW_ROADS, [river, ...highwayGaps('ns', NS_ROADS.indexOf(r))])) {
        b.box(r.c - MEDIAN / 2, 0, a0, MEDIAN, SLAB, a1 - a0, kerbTop);
        b.box(r.c - MEDIAN / 2 + 0.06, SLAB, a0, MEDIAN - 0.12, 0.005, a1 - a0, median);
      }

  // Bridges over the river: the road and its sidewalks, with rails
  const rail = toon('#c9c4e6');
  const span = RIVER[1] - RIVER[0] + 1.2;
  // Every road that crosses the river (the highway too: streetplan.ts riverBridges())
  for (const r of riverBridges()) {
    const w = r.half + WALK_W;
    b.box(r.c - w, 0, RIVER[0] - 0.6, w * 2, 0.06, span, toon('#34314f'));
    b.box(r.c - w, 0.06, RIVER[0] - 0.6, WALK_W, SLAB - 0.06, span, kerbTop);
    b.box(r.c + r.half, 0.06, RIVER[0] - 0.6, WALK_W, SLAB - 0.06, span, kerbTop);
    for (const side of [r.c - w - 0.05, r.c + w - 0.05]) {
      b.box(side, SLAB, RIVER[0] - 0.6, 0.1, 0.08, span, rail);
      for (let z = RIVER[0] - 0.6; z <= RIVER[1] + 0.6; z += 0.75) b.box(side, SLAB, z, 0.1, 0.45, 0.1, rail);
      b.box(side, SLAB + 0.45, RIVER[0] - 0.6, 0.1, 0.06, span, rail);
    }
  }

  // Diagonals: asphalt wide enough to fill the corners where their sidewalks meet the cross streets' (the kerbs cover the rest)
  for (const d of DIAGONALS) {
    const [ax, az] = d.from;
    const [bx, bz] = d.to;
    const len = Math.hypot(bx - ax, bz - az);
    const g = new THREE.BoxGeometry(len, 0.03, (LANE + WALK_W + 0.6) * 2).rotateY(Math.atan2(-(bz - az), bx - ax)).translate((ax + bx) / 2, 0.019, (az + bz) / 2);
    b.add(g, asphalt);
  }

  // Block slabs: the sidewalk round every block (the kerb) and the lot inside: downtown's blocks, the districts and the extra lots
  const kerb = toon('#5a5290');
  // (The Trenches' sidewalks are plain grey concrete, their yards worn concrete: the grit step)
  const trenchKerb = toon('#5f5c70');
  PLAN.blocks.forEach((blk, i) => {
    // (The bends' outer sidewalks are drawn as one kerb each, below)
    if (blk.id.startsWith('kerb-')) return;
    const slab = PLAN.slabs[i];
    if (blk.id.startsWith('trench-')) {
      b.add(slabPoly(slab, SLAB), trenchKerb);
      b.add(flatPoly(insetPoly(blk.poly, 0.4), SLAB + 0.005, YARD_REPEAT), LOTS.yard);
      return;
    }
    const kind: LotKind =
      lots[blk.id] ??
      // (Uptown's empty lots are bare earth behind their hoardings until the towers come: uptown.ts)
      (blk.ref === 'garage' ? 'concrete' : blk.ref === 'market' || blk.ref === 'units' ? 'paving' : blk.ref === 'uptown' ? 'dirt' : blk.use === 'park' ? 'grass' : blk.id.startsWith('dt-') ? 'paving' : 'grass');
    if (isRect(slab) && !bigPoly(slab)) {
      const [x0, z0] = [Math.min(...slab.map((p) => p[0])), Math.min(...slab.map((p) => p[1]))];
      const [x1, z1] = [Math.max(...slab.map((p) => p[0])), Math.max(...slab.map((p) => p[1]))];
      b.box(x0, 0, z0, x1 - x0, SLAB, z1 - z0, kerb);
      b.box(x0 + WALK_W + 0.4, SLAB, z0 + WALK_W + 0.4, x1 - x0 - (WALK_W + 0.4) * 2, 0.005, z1 - z0 - (WALK_W + 0.4) * 2, LOTS[kind]);
    } else if (bigPoly(slab)) {
      // (a big one, a park's: in pieces a tile each. Its top is the lot itself, the sidewalk a ring laid on it: a lot
      // a few millimetres over a slab that size would flicker through it far off)
      const [walls, ...top] = tiledSlab(slab, SLAB);
      b.add(walls, kerb);
      for (const g of top) b.add(g, LOTS[kind]);
      b.add(ring(slab, blk.walk + 0.4, SLAB + 0.004), kerb);
    } else {
      b.add(slabPoly(slab, SLAB), kerb);
      // (A bend's outer sidewalk is all sidewalk: no lot)
      if (blk.walk) b.add(flatPoly(insetPoly(blk.poly, 0.4), SLAB + 0.003), LOTS[kind]);
    }
  });
  // The landmarks' own lots inside their blocks (grass round the Signal tower, concrete in the compound...)
  for (const [k, kind] of Object.entries(lots))
    if (SEATS[k]) {
      const [ox, oz] = SEATS[k];
      b.box(ox + 0.2, SLAB, oz + 0.2, BS - 0.4, 0.008, BS - 0.4, LOTS[kind]);
    }
  // The plots' and lots' pads on their blocks' lawns: a paved rim round each (the lots their own ground)
  const rim = toon('#4b4766');
  const padGround: Record<string, LotKind> = { garage: 'concrete', market: 'paving', units: 'paving' };
  for (const p of PADS) {
    const [x0, z0, x1, z1] = p.rect;
    b.box(x0, SLAB, z0, x1 - x0, 0.007, z1 - z0, rim);
    b.box(x0 + 0.3, SLAB, z0 + 0.3, x1 - x0 - 0.6, 0.01, z1 - z0 - 0.6, padGround[p.id] ? LOTS[padGround[p.id]] : toon('#367f5a'));
  }
  // The bending streets: asphalt wide enough to fill their corners at the avenues (the kerbs cover the rest)
  for (const bend of BENDS) {
    const hw = BEND_REACH + 0.4;
    const l = offsetLine(bend.pts, -hw);
    const r = offsetLine(bend.pts, hw);
    const pos: number[] = [];
    // Each triangle wound to face up (seen from above, whichever way the curve runs)
    const tri = (p: Pt, q: Pt, t: Pt) => {
      const up = (q[1] - p[1]) * (t[0] - p[0]) - (q[0] - p[0]) * (t[1] - p[1]) > 0;
      for (const v of up ? [p, q, t] : [p, t, q]) pos.push(v[0], 0.033, v[1]);
    };
    for (let i = 1; i < bend.pts.length; i++) {
      tri(l[i - 1], r[i - 1], r[i]);
      tri(l[i - 1], r[i], l[i]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    g.setIndex(Array.from({ length: pos.length / 3 }, (_, i) => i));
    b.add(g, asphalt);
  }

  // The bends' outer sidewalks: one continuous raised kerb, broken where a road crosses
  BENDS.forEach((bend, bi) => {
    const out = OUTSIDE[bi];
    const near = offsetLine(bend.pts, out * LANE);
    const far = offsetLine(bend.pts, out * BEND_REACH);
    const top: number[] = [];
    const wall: number[] = [];
    // A quad from four corners, wound to face `up` (the top) or away from the road / out of town (the walls)
    const quad = (list: number[], a: number[], c: number[], d: number[], e: number[], face: [number, number, number]) => {
      const cr = [(c[1] - a[1]) * (d[2] - a[2]) - (c[2] - a[2]) * (d[1] - a[1]), (c[2] - a[2]) * (d[0] - a[0]) - (c[0] - a[0]) * (d[2] - a[2]), (c[0] - a[0]) * (d[1] - a[1]) - (c[1] - a[1]) * (d[0] - a[0])];
      const ok = cr[0] * face[0] + cr[1] * face[1] + cr[2] * face[2] > 0;
      for (const v of ok ? [a, c, d, a, d, e] : [a, d, c, a, e, d]) list.push(...v);
    };
    const runs = KERB_RUNS[bi];
    for (let i = 1; i < bend.pts.length; i++) {
      if (!runs[i - 1]) continue;
      const [n0, n1, f0, f1] = [near[i - 1], near[i], far[i - 1], far[i]];
      quad(top, [n0[0], SLAB, n0[1]], [n1[0], SLAB, n1[1]], [f1[0], SLAB, f1[1]], [f0[0], SLAB, f0[1]], [0, 1, 0]);
      const towards = (from: Pt, to: Pt): [number, number, number] => [to[0] - from[0], 0, to[1] - from[1]];
      quad(wall, [n0[0], 0, n0[1]], [n1[0], 0, n1[1]], [n1[0], SLAB, n1[1]], [n0[0], SLAB, n0[1]], towards(f0, n0));
      quad(wall, [f0[0], 0, f0[1]], [f1[0], 0, f1[1]], [f1[0], SLAB, f1[1]], [f0[0], SLAB, f0[1]], towards(n0, f0));
      // Ends of a run
      if (i === 1 || !runs[i - 2]) quad(wall, [n0[0], 0, n0[1]], [f0[0], 0, f0[1]], [f0[0], SLAB, f0[1]], [n0[0], SLAB, n0[1]], towards(n1, n0));
      if (i === bend.pts.length - 1 || !runs[i]) quad(wall, [n1[0], 0, n1[1]], [f1[0], 0, f1[1]], [f1[0], SLAB, f1[1]], [n1[0], SLAB, n1[1]], towards(n0, n1));
    }
    for (const list of [top, wall]) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(list, 3));
      g.computeVertexNormals();
      b.add(g, kerb);
    }
  });

  // The ring highway (growth plan Phase 7): its asphalt, the median (broken at its junctions and over the
  // river), lamps along both verges, and the slip lanes across the corners on the town side
  b.add(strip(HIGHWAY, -HIGHWAY_HALF, HIGHWAY_HALF, 0.034), asphalt);
  for (const run of highwayRuns(1)) {
    b.add(strip(run, -MEDIAN / 2, MEDIAN / 2, SLAB), kerbTop);
    b.add(strip(run, -MEDIAN / 2 + 0.06, MEDIAN / 2 - 0.06, SLAB + 0.005), median);
    for (const side of [-1, 1]) b.add(wall(run, (side * MEDIAN) / 2, SLAB, side), kerbTop);
  }
  for (const run of highwayRuns(24))
    run.forEach((p, i) => {
      if (i === 0) return;
      const [ux, uz] = [p[0] - run[i - 1][0], p[1] - run[i - 1][1]];
      const l = Math.hypot(ux, uz) || 1;
      // Alternate sides, the arm reaching in over the road
      const side = i % 2 ? 1 : -1;
      const [nx, nz] = [(-uz / l) * side, (ux / l) * side];
      const [lx, lz] = [p[0] + nx * (HIGHWAY_HALF + 0.5), p[1] + nz * (HIGHWAY_HALF + 0.5)];
      // (none under the stadium's footbridge: stadium.ts)
      if (lx > BRIDGE_RECT[0] - 2 && lx < BRIDGE_RECT[2] + 2 && lz > BRIDGE_RECT[1] && lz < BRIDGE_RECT[3]) return;
      addLamp(lx, lz, Math.atan2(nz, -nx), 0.02);
    });
  for (const s of PLAN.streets) if (s.kind === 'slip') b.add(strip(s.pts, -s.half, s.half, 0.036), asphalt);

  // Lamps along the diagonals
  for (const l of DIAGONAL_LAMPS) addLamp(l.at[0], l.at[1], l.ry);
  b.build(scene, { cast: false, receive: true });

  // Lane markings and crosswalks, instanced: a dashed yellow centre line on streets,
  // white dashes between an avenue's lanes, zebra crossings on every arm of every crossing
  const dashes: THREE.Matrix4[] = [];
  const whites: THREE.Matrix4[] = [];
  const zebra: THREE.Matrix4[] = [];
  const m = new THREE.Matrix4();
  const q0 = new THREE.Quaternion();
  const lines = (r: Road) => (r.lanes === 1 ? [{ off: 0, yellow: true }] : [-1, 1].map((sd) => ({ off: sd * (MEDIAN / 2 + LANE), yellow: false })));
  for (const r of EW_ROADS)
    for (const { off, yellow } of lines(r))
      for (const [a0, a1] of runsBetween(NS_ROADS, highwayGaps('ew', EW_ROADS.indexOf(r))))
        for (let p = a0 + 0.4; p < a1 - 0.3; p += 1.1) (yellow ? dashes : whites).push(m.clone().compose(new THREE.Vector3(p, 0.036, r.c + off), q0, new THREE.Vector3(0.55, 0.01, 0.07)));
  for (const r of NS_ROADS)
    for (const { off, yellow } of lines(r))
      for (const [a0, a1] of runsBetween(EW_ROADS, [river, ...highwayGaps('ns', NS_ROADS.indexOf(r))]))
        for (let p = a0 + 0.4; p < a1 - 0.3; p += 1.1) (yellow ? dashes : whites).push(m.clone().compose(new THREE.Vector3(r.c + off, 0.038, p), q0, new THREE.Vector3(0.07, 0.01, 0.55)));
  for (const nr of NS_ROADS)
    for (const er of EW_ROADS) {
      // A diagonal coming in from one corner: no zebras on the two arms it crosses
      const diag = DIAGONALS.map((d) => (d.from[0] === nr.c && d.from[1] === er.c ? d.to : d.to[0] === nr.c && d.to[1] === er.c ? d.from : null)).find(Boolean);
      const sx = diag ? Math.sign(diag[0] - nr.c) : 0;
      const sz = diag ? Math.sign(diag[1] - er.c) : 0;
      // Across the east-west road, either side of the crossing
      for (const side of [-1, 1])
        if (side !== sx)
          for (let k = er.c - er.half + 0.16; k < er.c + er.half - 0.1; k += 0.32) zebra.push(m.clone().compose(new THREE.Vector3(nr.c + side * (nr.half + 0.45), 0.04, k), q0, new THREE.Vector3(0.55, 0.01, 0.17)));
      // Across the north-south road
      for (const side of [-1, 1])
        if (side !== sz)
          for (let k = nr.c - nr.half + 0.16; k < nr.c + nr.half - 0.1; k += 0.32) zebra.push(m.clone().compose(new THREE.Vector3(k, 0.042, er.c + side * (er.half + 0.45)), q0, new THREE.Vector3(0.17, 0.01, 0.55)));
    }
  // A dashed centre line round each bend, clear of the roads it crosses
  for (const bend of BENDS) {
    let carry = 0;
    for (let i = 1; i < bend.pts.length; i++) {
      const [a, c] = [bend.pts[i - 1], bend.pts[i]];
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const [ux, uz] = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-uz, ux));
      for (let p = carry; p < len; p += 1.1) {
        const [x, z] = [a[0] + ux * p, a[1] + uz * p];
        if (NS_ROADS.some((r) => Math.abs(x - r.c) < r.half + 1.4) || EW_ROADS.some((r) => Math.abs(z - r.c) < r.half + 1.4)) continue;
        dashes.push(m.clone().compose(new THREE.Vector3(x, 0.037, z), q, new THREE.Vector3(0.55, 0.01, 0.07)));
      }
      carry = (carry - len) % 1.1;
      if (carry < 0) carry += 1.1;
    }
  }
  // The highway's lines: dashes between each way's two lanes, a solid line along each edge
  for (const run of highwayRuns(0.5)) {
    for (const off of [-(MEDIAN / 2 + LANE), MEDIAN / 2 + LANE])
      along(offsetLine(run, off), 3, (x, z, q) => whites.push(m.clone().compose(new THREE.Vector3(x, 0.041, z), q, new THREE.Vector3(1.2, 0.01, 0.08))));
    for (const off of [-(MEDIAN / 2 + 2 * LANE + 0.06), MEDIAN / 2 + 2 * LANE + 0.06])
      along(offsetLine(run, off), 0.5, (x, z, q) => whites.push(m.clone().compose(new THREE.Vector3(x, 0.041, z), q, new THREE.Vector3(0.52, 0.01, 0.07))));
  }
  // A dashed centre line down each diagonal, clear of the crossings at its ends
  for (const d of DIAGONALS) {
    const [ax, az] = d.from;
    const [bx, bz] = d.to;
    const len = Math.hypot(bx - ax, bz - az);
    const [ux, uz] = [(bx - ax) / len, (bz - az) / len];
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-uz, ux));
    for (let p = 6; p < len - 3.6; p += 1.1) dashes.push(m.clone().compose(new THREE.Vector3(ax + ux * p, 0.037, az + uz * p), q, new THREE.Vector3(0.55, 0.01, 0.07)));
  }
  // Flat: two triangles a marking (thousands of them), lying on the asphalt; merged with the city's
  // fixed geometry, so they're split by tile and only the ones in view are drawn (tileBatch() in kit.ts)
  const unit = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const marks = new Batch();
  marks.instances(unit, neon('#f5d76e', 0.9, 1.1), dashes).instances(unit, toon('#d9d5ee'), whites).instances(unit, toon('#e8e4f8'), zebra);
  marks.build(scene, { cast: false, receive: true });

  // Neon streaks on wet asphalt (only visible in the rain, at dusk and night): one mesh,
  // shown only while it's raining (index.ts hides it when the sheen is off)
  const sb = new Batch();
  for (let i = 0; i < 70; i++) {
    const alongX = rand() < 0.5;
    const r = CORE_ROADS[Math.floor(rand() * CORE_ROADS.length)];
    const s = rand() * DOWNTOWN;
    const across = r - LANE + rand() * LANE * 2;
    const g = new THREE.PlaneGeometry(0.35, 2.4).rotateX(-Math.PI / 2);
    if (alongX) g.rotateY(Math.PI / 2).translate(s, 0.05, across);
    else g.translate(across, 0.05, s);
    sb.add(g, puddleMat);
  }
  const streaks = new THREE.Group();
  sb.build(streaks, { cast: false, receive: false });
  streaks.name = 'streaks';
  scene.add(fx(streaks));
  return { streaks };
}

/* ---------- Outskirts ---------- */

/**
 * Scatter trees outside town, off the roads and the river: `count` in the belt round the
 * city, a lighter sprinkle (`count` * `sparse`) across the open land out to the world's edge,
 * and woods in patches well away from the city, seeded tile by tile at a density per area
 * (outskirts.ts, growth plan Phases 5 and 6)
 */
export function scatterOutskirts(count: number, sparse = 0.6, keep = 1) {
  // (`keep` < 1 leaves the rest out, the same ones whatever else changes: phones keep half, the trim)
  for (const t of outskirtsTrees(count, sparse, CLEAR)) if (keep >= 1 || turnAt(t.z, t.x) / 6 < keep) addTree(t.x, t.z, t.s, t.pine, 0);
}

/** Land the outskirts' trees keep off besides the town (The Trenches', the metro's el over open land) */
const CLEAR: [number, number, number, number][] = [];
export function keepTreesOff(rect: [number, number, number, number]) {
  CLEAR.push(rect);
}

/** The world's half-width the skyline's `count` is for (before Phase 6): a wider world's ring has more towers, as far apart */
const SKYLINE_REACH = 220;
/** A ring of towers on the horizon, past the world's edge, so the city reads as part of a metropolis. */
export function buildSkyline(scene: THREE.Scene, count: number, tick: (f: Tick) => void) {
  const mats = [
    facadeMat({ cols: 6, rows: 26, wall: '#241d4a', lit: [PAL.warm, PAL.cyan], litRatio: 0.45, seed: 11 }, 0.1, 1.4),
    facadeMat({ cols: 6, rows: 26, wall: '#2c1f55', lit: [PAL.pink, PAL.warm], litRatio: 0.4, seed: 12 }, 0.1, 1.4),
    facadeMat({ cols: 6, rows: 26, wall: '#1b2550', lit: [PAL.cyan], litRatio: 0.5, seed: 13 }, 0.1, 1.4),
  ];
  const roof = toon('#1a1636', { fog: false });
  // Out past the world's edge, the haze would swallow them whole: they stand clear of it, a skyline on the horizon
  for (const m of mats) m.fog = false;
  // Merged: one mesh per facade, one for the roofs and masts, one for the beacons
  const b = new Batch();
  const lights = new Batch();
  const beaconMat = neon('#ff3b3b', 0.4, 3);
  // As many as today's ring had for its length, wherever the edge is (growth plan Phase 5), each from its own seeded numbers
  const reach = (EXT[1] - EXT[0]) / 2;
  const n = Math.round((count * reach) / SKYLINE_REACH);
  const r = rng(808);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.1;
    // A ring just past the world's edge, so the metropolis carries on beyond the land you can build on.
    // The world is square: the ring follows its edge (a rounded square), so no tower stands on the
    // land in the corners (the kart park fills the north-east one)
    const rr = reach / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))) + SKYLINE.gap + r() * SKYLINE.depth;
    const x = (EXT[0] + EXT[1]) / 2 + Math.cos(a) * rr;
    const z = (EXT[0] + EXT[1]) / 2 + Math.sin(a) * rr;
    // None by the airport: they'd loom over the runway (since Phase 6 the ring stands far enough out that none is)
    const w = 7 + r() * 9;
    const h = 22 + r() * 50;
    if (Math.hypot(x - (SITE[0] + SITE[2]) / 2, z - (SITE[1] + SITE[3]) / 2) < 150) continue;
    const mat = mats[i % mats.length];
    const mesh = new THREE.Mesh(sidesBox(w, h, w), [mat, roof]);
    mesh.position.set(x, h / 2, z);
    mesh.rotation.y = r() * Math.PI;
    b.mesh(mesh);
    if (h > 45) {
      lights.add(new THREE.SphereGeometry(0.6, 8, 6).translate(x, h + 2.6, z), beaconMat);
      b.add(new THREE.CylinderGeometry(0.14, 0.14, 2.6).translate(x, h + 1.3, z), roof);
    }
  }
  b.build(scene, { cast: false, receive: false });
  const beacons = new THREE.Group();
  lights.build(beacons, { cast: false, receive: false });
  scene.add(fx(beacons));
  tick(({ t }) => {
    beacons.visible = Math.sin(t * 3) > 0.3;
  });
}

/* ---------- Instanced trees and lamps ---------- */

/** Things placed over the map, grouped by the tile they stand in (each tile a site, built as you go: tilework.ts) */
function byTile<T extends { x: number; z: number }>(list: readonly T[]) {
  const out = new Map<string, T[]>();
  for (const t of list) {
    const k = tileKey(...tileOf(t.x, t.z));
    let l = out.get(k);
    if (!l) out.set(k, (l = []));
    l.push(t);
  }
  return out;
}
/** A turn from a position (the same every time a tile is built) */
const turnAt = (x: number, z: number) => {
  const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return (h - Math.floor(h)) * 6;
};

/**
 * A tree far away on a phone (the trim): two flat cards crossed, each faced both ways (no new material),
 * its outline in (across, up) at scale 1; the normals tip up and out so the toon light still reads it as round
 */
function crossedCards(outline: [number, number][]) {
  const pos: number[] = [];
  const nor: number[] = [];
  for (const a of [0, Math.PI / 2]) {
    const [dx, dz] = [Math.cos(a), -Math.sin(a)];
    for (const side of [1, -1]) {
      const n = new THREE.Vector3(-dz * side * 0.7, 0.7, dx * side * 0.7).normalize();
      const at = (k: number) => [outline[k][0] * dx, outline[k][1], outline[k][0] * dz];
      for (let k = 1; k < outline.length - 1; k++) {
        const tri = side > 0 ? [0, k, k + 1] : [0, k + 1, k];
        for (const v of tri) {
          pos.push(...at(v));
          nor.push(n.x, n.y, n.z);
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

export function buildTrees(low = false) {
  // Open-ended: the canopy hides the top, the ground the bottom. Phones (the trim): a rounder
  // dodecahedron canopy at less than half the triangles, four-sided trunks, open five-sided cones
  const trunkGeo = new THREE.CylinderGeometry(0.07, 0.09, 1, low ? 4 : 6, 1, true);
  const canopyGeo = low ? new THREE.DodecahedronGeometry(0.42, 0) : new THREE.IcosahedronGeometry(0.42, 1);
  const coneGeo = low ? new THREE.ConeGeometry(0.42, 0.9, 5, 1, true) : new THREE.ConeGeometry(0.42, 0.9, 7);
  // ...and far away, flat cards: a hexagon for a round tree (down over its trunk), a triangle for a pine
  const roundCard = crossedCards([[0, 0.3], [0.42, 0.6], [0.42, 1.05], [0, 1.27], [-0.42, 1.05], [-0.42, 0.6]]);
  const pineCard = crossedCards([[-0.42, 0.28], [0.42, 0.28], [0, 1.56]]);
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const greens = ['#2fae6e', '#33b878', '#24995f', '#3fc485', '#2a9d63'];
  // Every tile's trees a site, merged with the city's fixed geometry (split by tile, only those in view drawn: tileBatch())
  for (const [key, list] of byTile(trees))
    site(`trees ${key}`, keyRect(key), (into) => {
      const trunks = list.map((t) => {
        const h = t.pine ? 0.45 : 0.6;
        return new THREE.Matrix4().compose(new THREE.Vector3(t.x, t.y + (h * t.s) / 2, t.z), q, new THREE.Vector3(t.s, h * t.s, t.s));
      });
      // Round canopies in five greens, each turned its own way
      const canopies: THREE.Matrix4[][] = greens.map(() => []);
      list.forEach((t, i) => {
        if (t.pine) return;
        canopies[i % greens.length].push(
          new THREE.Matrix4().compose(new THREE.Vector3(t.x, t.y + 0.85 * t.s, t.z), new THREE.Quaternion().setFromAxisAngle(up, turnAt(t.x, t.z)), new THREE.Vector3(t.s, t.s * 0.95, t.s))
        );
      });
      const cones = list
        .filter((t) => t.pine)
        .flatMap((t) => [
          new THREE.Matrix4().compose(new THREE.Vector3(t.x, t.y + 0.75 * t.s, t.z), q, new THREE.Vector3(t.s, t.s, t.s)),
          new THREE.Matrix4().compose(new THREE.Vector3(t.x, t.y + 1.2 * t.s, t.z), q, new THREE.Vector3(t.s * 0.75, t.s * 0.8, t.s * 0.75)),
        ]);
      const b = new Batch();
      if (low) b.lod = 'near';
      b.instances(trunkGeo, toon('#6b4630'), trunks);
      // The canopies sway in the wind (city life plan, Phase 4, dusk.ts): desktop only, the sway in their normals' lengths
      greens.forEach((g, i) => b.instances(canopyGeo, toon(g), canopies[i], low ? 0 : SWAY));
      b.instances(coneGeo, toon('#1d7a55'), cones, low ? 0 : SWAY * 0.6);
      if (low) {
        b.lod = 'far';
        const cards: THREE.Matrix4[][] = greens.map(() => []);
        list.forEach((t, i) => {
          if (t.pine) return;
          cards[i % greens.length].push(new THREE.Matrix4().compose(new THREE.Vector3(t.x, t.y, t.z), new THREE.Quaternion().setFromAxisAngle(up, turnAt(t.x, t.z)), new THREE.Vector3(t.s, t.s, t.s)));
        });
        greens.forEach((g, i) => b.instances(roundCard, toon(g), cards[i]));
        const pines = list.filter((t) => t.pine).map((t) => new THREE.Matrix4().compose(new THREE.Vector3(t.x, t.y, t.z), new THREE.Quaternion().setFromAxisAngle(up, turnAt(t.x, t.z)), new THREE.Vector3(t.s, t.s, t.s)));
        b.instances(pineCard, toon('#1d7a55'), pines);
      }
      b.build(into);
    });
}

/**
 * The street lamps: white in town; in The Trenches (the grit step, `lampKind()` in trenches.ts) sodium orange, a few
 * flickering (two sets, each going out together: its bulbs, halos and pools) and the odd one dead (no light at all)
 */
type Tone = 'white' | 'sodium' | 'flickA' | 'flickB';
const TONES: Tone[] = ['white', 'sodium', 'flickA', 'flickB'];
const SODIUM = { bulb: '#ffb35c', halo: '#ffab55', pool: '#ff9a45' };
/**
 * `tick`: the lamps come on one by one at dusk (city life plan, Phase 4, dusk.ts): each halo and pool its own glow
 * that frame, a colour per point and per instance over its tone's material (the bulbs, in the Batches' shared
 * neon, come up with the night). Not under reduced motion (`reduced`: no tick runs after the first frame).
 */
export function buildLamps(scene: THREE.Scene, low = false, tick?: (f: Tick) => void, reduced = false) {
  const toneOf = lamps.map((l, i): Tone | 'dead' => {
    // (the waterfront's are all sodium, none flickering: it's kept up)
    const [wx0, wz0, wx1, wz1] = WATERFRONT_RECT;
    const k = l.x > wx0 && l.x < wx1 && l.z > wz0 && l.z < wz1 ? 'sodium' : lampKind(l.x, l.z);
    return k === null ? 'white' : k === 'sodium' ? 'sodium' : k === 'dead' ? 'dead' : i % 2 ? 'flickA' : 'flickB';
  });
  // The lamps themselves are merged with the city's fixed geometry (split by tile: tileBatch() in kit.ts)
  const poles: THREE.Matrix4[] = [];
  const arms: THREE.Matrix4[] = [];
  const bulbs: THREE.Matrix4[] = [];
  // Halos are points, so they always face the camera; pools are flat glows on the ground
  const halos: Record<Tone, number[]> = { white: [], sodium: [], flickA: [], flickB: [] };
  const poolsOf: Record<Tone, THREE.Matrix4[]> = { white: [], sodium: [], flickA: [], flickB: [] };
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  lamps.forEach((l, i) => {
    q.setFromAxisAngle(up, l.ry);
    const dir = new THREE.Vector3(0.2, 0, 0).applyQuaternion(q);
    poles.push(new THREE.Matrix4().compose(new THREE.Vector3(l.x, l.y + 0.8, l.z), q, new THREE.Vector3(1, 1, 1)));
    arms.push(new THREE.Matrix4().compose(new THREE.Vector3(l.x + dir.x, l.y + 1.58, l.z + dir.z), q, new THREE.Vector3(1, 1, 1)));
    bulbs.push(new THREE.Matrix4().compose(new THREE.Vector3(l.x + dir.x * 2, l.y + 1.53, l.z + dir.z * 2), q, new THREE.Vector3(1, 1, 1)));
    const tone = toneOf[i];
    if (tone === 'dead') return;
    halos[tone].push(l.x + dir.x * 2, l.y + 1.5, l.z + dir.z * 2);
    poolsOf[tone].push(new THREE.Matrix4().compose(new THREE.Vector3(l.x + dir.x * 2, l.y + 0.02, l.z + dir.z * 2), flat, new THREE.Vector3(2.6, 2.6, 2.6)));
  });
  for (const p of pools) poolsOf[p.sodium ? 'sodium' : 'white'].push(new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y + 0.02, p.z), flat, new THREE.Vector3(p.size, p.size, p.size)));
  // Each tone's materials: the flickering ones going out together
  const flicker = (t: Tone) => (t === 'flickA' || t === 'flickB' ? 1.3 : 0);
  const mats = Object.fromEntries(
    TONES.map((t) => {
      const white = t === 'white';
      // (a flickering bulb keeps its own material, not the Batch's shared neon, so it goes out with its halo and pool)
      const bulb = white ? neon('#fff1c2', 0.6, 2.4) : flicker(t) ? siteMat(`lamp-bulb-${t}`, lit(new THREE.MeshBasicMaterial({ color: SODIUM.bulb, toneMapped: true }), 0.6, 2.4, flicker(t))) : neon(SODIUM.bulb, 0.6, 2.4);
      const halo = lit(new THREE.PointsMaterial({ color: white ? '#ffe2a0' : SODIUM.halo, map: glowTex, size: 1.1, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, vertexColors: true }), 0, white ? 0.3 : 0.34, flicker(t));
      const pool = lit(glowMat(white ? '#ffd98a' : SODIUM.pool, 1), 0, white ? 0.26 : 0.3, flicker(t));
      if (flicker(t)) flickerTogether([bulb, halo, pool], t === 'flickA' ? 11 : 47);
      return [t, { bulb, halo, pool }];
    })
  ) as unknown as Record<Tone, { bulb: THREE.Material; halo: THREE.PointsMaterial; pool: THREE.Material }>;
  const dead = toon('#3a3644');
  // Near only (growth plan Phase 2): far off, a lamp is a hairline; its halo (below) still shows at night.
  // Each tile's lamps a site (built as you go: tilework.ts)
  // Phones (the trim): four-sided and open-ended (the ends are too small to see), half the triangles
  const bar = (r: number, len: number) => new THREE.CylinderGeometry(r, r, len, 4, 1, true).rotateY(Math.PI / 4).rotateZ(Math.PI / 2);
  const poleGeo = low ? new THREE.CylinderGeometry(0.035, 0.05, 1.6, 4, 1, true).rotateY(Math.PI / 4) : new THREE.CylinderGeometry(0.035, 0.05, 1.6, 6);
  const armGeo = low ? bar(0.035, 0.4) : new THREE.BoxGeometry(0.4, 0.05, 0.05);
  const bulbGeo = low ? bar(0.075, 0.2) : new THREE.BoxGeometry(0.2, 0.07, 0.12);
  for (const [key, list] of byTile(lamps.map((l, i) => ({ x: l.x, z: l.z, i }))))
    site(`lamps ${key}`, keyRect(key), (into) => {
      const pick = (all: THREE.Matrix4[]) => list.map((l) => all[l.i]);
      const lampB = new Batch();
      lampB.lod = 'near';
      lampB.instances(poleGeo, toon('#1b1830'), pick(poles)).instances(armGeo, toon('#1b1830'), pick(arms));
      lampB.build(into, { cast: true, receive: true });
      // (the bulbs cast no shadow)
      const bulbB = new Batch();
      bulbB.lod = 'near';
      for (const t of [...TONES, 'dead' as const]) {
        const mine = list.filter((l) => toneOf[l.i] === t).map((l) => bulbs[l.i]);
        if (mine.length) bulbB.instances(bulbGeo, t === 'dead' ? dead : mats[t].bulb, mine);
      }
      bulbB.build(into, { cast: false, receive: true });
    });
  /** Each tone's halos and pools, and every lamp's switch: the pools' first `nHalo` are the lamps with halos, the rest the wall lamps' pools */
  const switching: { halo: THREE.BufferAttribute | null; nHalo: number; pool: THREE.InstancedMesh | null; lamps: Lamp[]; seeds: number[]; glow: Float32Array }[] = [];
  const seedAt = (x: number, z: number) => {
    const v = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  const black = new THREE.Color(0, 0, 0);
  for (const t of TONES) {
    const nHalo = halos[t].length / 3;
    const seeds: number[] = [];
    for (let i = 0; i < nHalo; i++) seeds.push(seedAt(halos[t][i * 3], halos[t][i * 3 + 2]));
    let halo: THREE.BufferAttribute | null = null;
    let pool: THREE.InstancedMesh | null = null;
    if (nHalo) {
      const haloGeo = new THREE.BufferGeometry();
      haloGeo.setAttribute('position', new THREE.Float32BufferAttribute(halos[t], 3));
      // (lit as the lamps come on; everything lit at once without the tick: reduced motion, the site worker)
      halo = new THREE.BufferAttribute(new Float32Array(nHalo * 3).fill(tick && !reduced ? 0 : 1), 3);
      halo.setUsage(THREE.DynamicDrawUsage);
      haloGeo.setAttribute('color', halo);
      scene.add(fx(new THREE.Points(haloGeo, mats[t].halo)));
    }
    if (poolsOf[t].length) {
      pool = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mats[t].pool, poolsOf[t].length);
      poolsOf[t].forEach((m, i) => {
        pool!.setMatrixAt(i, m);
        if (i >= nHalo) seeds.push(seedAt(m.elements[12], m.elements[14]));
      });
      if (tick && !reduced) {
        poolsOf[t].forEach((_, i) => pool!.setColorAt(i, black));
        pool.instanceColor!.setUsage(THREE.DynamicDrawUsage);
      }
      scene.add(fx(pool));
    }
    if (tick && !reduced && (halo || pool)) switching.push({ halo, nHalo, pool, lamps: seeds.map(newLamp), seeds, glow: new Float32Array(seeds.length).fill(-1) });
  }
  if (!switching.length || !tick) return;
  const c = new THREE.Color();
  // The first frame sets every lamp as it stands (no trickle: a visit that starts at night finds them on)
  let first = true;
  tick(({ night, t }) => {
    for (const s of switching) {
      let changed = false;
      for (let i = 0; i < s.lamps.length; i++) {
        const g = lampGlow(s.lamps[i], night, s.seeds[i], t, !first);
        if (g === s.glow[i]) continue;
        s.glow[i] = g;
        changed = true;
        if (i < s.nHalo) s.halo!.setXYZ(i, g, g, g);
        s.pool?.setColorAt(i, c.setScalar(g));
      }
      if (!changed) continue;
      if (s.halo) s.halo.needsUpdate = true;
      if (s.pool) s.pool.instanceColor!.needsUpdate = true;
    }
    first = false;
  });
}
