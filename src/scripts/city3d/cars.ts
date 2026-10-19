/*
 * The city's cars, at real proportions in Degen's cartoon style: chunky
 * extruded bodies, a painted cabin with dark glass stuck on, fat tyres and
 * black bumpers, so the ink outlines pick out every panel.
 *
 * 1 tile is about 1.8 m (Degen is about one tile tall): a hatch is about
 * 4 m long, 1.8 m wide and 1.7 m tall, a bus about 10 m long and 3 m tall.
 * Lanes are 1.7 tiles wide (layout.ts).
 *
 * Models point along +x (the front), y up, z across; the origin is on the
 * ground under the middle of the car. Each model is two geometries: `paint`
 * (one colour, set per car) and `detail` (tyres, rims, glass, bumpers,
 * plates, in vertex colours), so a fleet costs two draw calls per model.
 * The bus's windows are a third (`glow`), lit at night. Head- and taillights
 * are spots (`head`, `tail`) for the caller's own light meshes.
 *
 * `wheels: false` leaves the tyres out of `detail` (for a car whose wheels
 * turn: build them from `wheelGeometry()` at `wheelSpots()`).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fx, toon } from './kit';

export type CarId = 'hatch' | 'sedan' | 'coupe' | 'pickup' | 'van' | 'bus';
type V2 = [number, number];

export interface CarSpec {
  id: CarId;
  /** What the garage calls it (made-up names, never a real make) */
  name: string;
  /** Length, width (tiles) */
  L: number;
  W: number;
  /** Wheel radius and tyre width */
  r: number;
  tw: number;
  /** Rear and front axle (x) */
  axles: V2;
  /** Height of the body's underside */
  clr: number;
  /** Top line of the lower body, front to rear (the front and rear faces drop from its ends) */
  top: V2[];
  /** The cabin's side outline: rear base, rear roof, front roof, front base */
  cabin: [V2, V2, V2, V2];
  /** Cabin width, as a share of W */
  cabinW: number;
  /** Side windows: x ranges along the cabin (each one a pane), and the lowest a pane goes */
  panes: V2[];
  sill?: number;
  /** Rear window (vans and buses have none: a blank back) */
  rearGlass?: boolean;
  /** Height of the lights */
  lightY: number;
  /** Extras drawn per model */
  extra?: (p: Parts, s: CarSpec) => void;
}

/* ---------- Colours ---------- */

const TYRE = '#17151f';
const RIM = '#c9c4e6';
const TRIM = '#2a2838';
const GLASS = '#5cc8e8';
const PLATE = '#f3f2f7';

/** Paint colours that suit each model (the traffic picks from these) */
export const PAINTS: Record<CarId, string[]> = {
  hatch: ['#e23b3b', '#ffd23f', '#00c2ff', '#1fbf6b', '#f3f2f7', '#ff8a3d'],
  sedan: ['#f3f2f7', '#2b2a40', '#8000ff', '#00c2ff', '#e23b3b', '#9a96b8'],
  coupe: ['#e219e5', '#e23b3b', '#ffd23f', '#00eaff', '#14121f'],
  pickup: ['#ff8a3d', '#1f6b4a', '#e23b3b', '#f3f2f7', '#2a3b66'],
  van: ['#f3f2f7', '#f3f2f7', '#ffd23f', '#00c2ff', '#9a96b8'],
  bus: ['#e219e5', '#2aabee'],
};

/* ---------- Models ---------- */

export const CARS: Record<CarId, CarSpec> = {
  hatch: {
    id: 'hatch',
    name: 'City Hatch',
    L: 2.2,
    W: 0.98,
    r: 0.19,
    tw: 0.2,
    axles: [-0.68, 0.7],
    clr: 0.1,
    top: [
      [1.1, 0.44],
      [1.0, 0.53],
      [0.5, 0.57],
      [-1.02, 0.6],
      [-1.1, 0.5],
    ],
    cabin: [
      [-1.03, 0.57],
      [-0.9, 0.93],
      [0.12, 0.95],
      [0.55, 0.56],
    ],
    cabinW: 0.86,
    panes: [
      [-0.95, -0.36],
      [-0.3, 0.5],
    ],
    rearGlass: true,
    lightY: 0.44,
  },
  sedan: {
    id: 'sedan',
    name: 'Cruiser',
    L: 2.6,
    W: 1.0,
    r: 0.2,
    tw: 0.2,
    axles: [-0.82, 0.86],
    clr: 0.1,
    top: [
      [1.3, 0.42],
      [1.2, 0.52],
      [0.55, 0.56],
      [-0.85, 0.58],
      [-1.25, 0.56],
      [-1.3, 0.46],
    ],
    cabin: [
      [-0.9, 0.57],
      [-0.46, 0.89],
      [0.2, 0.89],
      [0.6, 0.55],
    ],
    cabinW: 0.86,
    panes: [
      [-0.85, -0.15],
      [-0.09, 0.55],
    ],
    rearGlass: true,
    lightY: 0.43,
  },
  coupe: {
    id: 'coupe',
    name: 'Street GT',
    L: 2.5,
    W: 1.04,
    r: 0.21,
    tw: 0.24,
    axles: [-0.8, 0.84],
    clr: 0.07,
    top: [
      [1.25, 0.34],
      [1.13, 0.48],
      [0.4, 0.52],
      [-1.0, 0.54],
      [-1.25, 0.5],
    ],
    cabin: [
      [-1.0, 0.53],
      [-0.42, 0.79],
      [0.0, 0.79],
      [0.42, 0.51],
    ],
    cabinW: 0.82,
    panes: [[-0.85, 0.36]],
    rearGlass: true,
    lightY: 0.35,
    extra(p, s) {
      // Rear wing on two posts
      p.paint(box(0.2, 0.035, s.W * 0.86, -1.1, 0.64, 0));
      for (const z of [-0.3, 0.3]) p.detail(box(0.05, 0.13, 0.04, -1.08, 0.56, z), TRIM);
      // Side intakes
      for (const z of [-1, 1]) p.detail(box(0.3, 0.08, 0.02, -0.45, 0.36, z * (s.W / 2 + 0.005)), TRIM);
    },
  },
  pickup: {
    id: 'pickup',
    name: 'Hauler',
    L: 2.95,
    W: 1.06,
    r: 0.26,
    tw: 0.24,
    axles: [-0.95, 0.95],
    clr: 0.18,
    top: [
      [1.475, 0.62],
      [1.4, 0.71],
      [0.62, 0.75],
      [-1.475, 0.75],
    ],
    cabin: [
      [-0.24, 0.74],
      [-0.2, 1.13],
      [0.3, 1.13],
      [0.66, 0.74],
    ],
    cabinW: 0.92,
    panes: [[-0.16, 0.58]],
    rearGlass: true,
    lightY: 0.62,
    extra(p, s) {
      // The open bed: a dark liner inside raised rails
      p.detail(box(1.12, 0.012, s.W - 0.16, -0.86, 0.752, 0), '#3a3550');
      for (const z of [-1, 1]) p.paint(box(1.18, 0.07, 0.07, -0.86, 0.785, z * (s.W / 2 - 0.035)));
      p.paint(box(0.07, 0.07, s.W, -1.44, 0.785, 0));
      // Push bar on the nose
      p.detail(box(0.08, 0.2, s.W * 0.7, 1.5, 0.42, 0), TRIM);
    },
  },
  van: {
    id: 'van',
    name: 'Box Van',
    L: 2.75,
    W: 1.06,
    r: 0.23,
    tw: 0.22,
    axles: [-0.9, 0.92],
    clr: 0.14,
    top: [
      [1.375, 0.5],
      [1.3, 0.6],
      [1.02, 0.66],
      [-1.375, 0.66],
    ],
    cabin: [
      [-1.375, 0.65],
      [-1.375, 1.27],
      [0.6, 1.27],
      [1.04, 0.65],
    ],
    cabinW: 0.98,
    panes: [[0.24, 0.84]],
    sill: 0.78,
    lightY: 0.5,
    extra(p, s) {
      // Sliding-door rail and a roof rack
      for (const z of [-1, 1]) p.detail(box(1.1, 0.025, 0.02, -0.45, 1.02, z * (s.W * 0.49 + 0.01)), TRIM);
      for (const x of [-1.0, -0.4, 0.2]) p.detail(box(0.05, 0.05, s.W * 0.9, x, 1.3, 0), TRIM);
      p.detail(box(1.3, 0.04, 0.04, -0.4, 1.33, s.W * 0.42), TRIM);
      p.detail(box(1.3, 0.04, 0.04, -0.4, 1.33, -s.W * 0.42), TRIM);
    },
  },
  bus: {
    id: 'bus',
    name: 'City Bus',
    L: 5.6,
    W: 1.38,
    r: 0.3,
    tw: 0.26,
    axles: [-1.75, 1.8],
    clr: 0.16,
    top: [
      [2.8, 0.72],
      [-2.8, 0.72],
    ],
    cabin: [
      [-2.8, 0.71],
      [-2.78, 1.66],
      [2.72, 1.66],
      [2.8, 0.71],
    ],
    cabinW: 0.99,
    panes: [
      [-2.6, -1.85],
      [-1.75, -1.0],
      [-0.9, -0.15],
      [-0.05, 0.7],
      [0.8, 1.55],
      [1.65, 2.6],
    ],
    sill: 0.92,
    lightY: 0.5,
    extra(p, s) {
      // Destination sign over the windscreen, a stripe along the side
      p.glow(box(0.02, 0.14, s.W * 0.6, s.L / 2 + 0.012, 1.5, 0));
      for (const z of [-1, 1]) p.detail(box(s.L - 0.4, 0.06, 0.012, 0, 0.8, z * (s.W * 0.495 + 0.008)), '#f3f2f7');
    },
  },
};

/* ---------- Building ---------- */

function box(w: number, h: number, d: number, x: number, y: number, z: number) {
  return new THREE.BoxGeometry(w, h, d).translate(x, y, z);
}

/** An outline in the side view (x, y), pushed out `depth` across the car, centred */
function extrude(shape: THREE.Shape, depth: number) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 8 });
  return g.translate(0, 0, -depth / 2);
}

/** The lower body: its top line, then underneath with an arch over each wheel */
function bodyShape(s: CarSpec) {
  const half = s.L / 2;
  const sh = new THREE.Shape();
  sh.moveTo(half, s.clr);
  for (const [x, y] of s.top) sh.lineTo(x, y);
  sh.lineTo(-half, s.clr);
  const arch = s.r + 0.04;
  for (const ax of s.axles) {
    sh.lineTo(ax - arch, s.clr);
    sh.lineTo(ax - arch, s.r);
    sh.absarc(ax, s.r, arch, Math.PI, 0, true);
    sh.lineTo(ax + arch, s.clr);
  }
  sh.lineTo(half, s.clr);
  return sh;
}

/** Shrink a convex outline by d (offset every edge inwards, meet at the corners) */
function inset(poly: V2[], d: number): V2[] {
  const n = poly.length;
  // Winding sign, so "inwards" is the same side for every edge
  let area = 0;
  for (let i = 0; i < n; i++) area += poly[i][0] * poly[(i + 1) % n][1] - poly[(i + 1) % n][0] * poly[i][1];
  const sgn = area > 0 ? 1 : -1;
  const lines = poly.map((a, i) => {
    const b = poly[(i + 1) % n];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * sgn;
    const ny = (dx / len) * sgn;
    return { p: [a[0] + nx * d, a[1] + ny * d] as V2, v: [dx, dy] as V2 };
  });
  return lines.map((l, i) => {
    const m = lines[(i + n - 1) % n];
    // Where line m meets line l
    const den = m.v[0] * l.v[1] - m.v[1] * l.v[0];
    if (Math.abs(den) < 1e-9) return l.p;
    const t = ((l.p[0] - m.p[0]) * l.v[1] - (l.p[1] - m.p[1]) * l.v[0]) / den;
    return [m.p[0] + m.v[0] * t, m.p[1] + m.v[1] * t] as V2;
  });
}

/** Keep the part of an outline where f(point) >= 0 (f linear) */
function clip(poly: V2[], f: (p: V2) => number): V2[] {
  const out: V2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const fa = f(a);
    const fb = f(b);
    if (fa >= 0) out.push(a);
    if (fa >= 0 !== fb >= 0) {
      const t = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

/** A thin pane along a side-view segment a-b (glass on a sloped face), pushed out from the cabin */
function pane(a: V2, b: V2, width: number, centre: V2, ends: number) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  let nx = -dy / len;
  let ny = dx / len;
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  if ((mx - centre[0]) * nx + (my - centre[1]) * ny < 0) [nx, ny] = [-nx, -ny];
  return new THREE.BoxGeometry(len - ends * 2, 0.014, width)
    .rotateZ(Math.atan2(dy, dx))
    .translate(mx + nx * 0.012, my + ny * 0.012, 0);
}

export class Parts {
  readonly paints: THREE.BufferGeometry[] = [];
  readonly details: THREE.BufferGeometry[] = [];
  readonly glows: THREE.BufferGeometry[] = [];
  paint(g: THREE.BufferGeometry) {
    this.paints.push(g);
  }
  detail(g: THREE.BufferGeometry, color: string) {
    const c = new THREE.Color(color);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.details.push(g);
  }
  glow(g: THREE.BufferGeometry) {
    this.glows.push(g);
  }
}

/** Same attributes everywhere (position, normal, uv, and colour where asked), indexed, so they merge */
function merge(geos: THREE.BufferGeometry[], color: boolean) {
  if (!geos.length) return null;
  const clean = geos.map((g0) => {
    const g = g0.index ? g0.toNonIndexed() : g0;
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', ...(color ? ['color'] : [])].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    return g;
  });
  return mergeGeometries(clean, false);
}

/** Wheel centres: x, y, z (left then right, rear then front) */
export function wheelSpots(s: CarSpec): [number, number, number][] {
  const z = s.W / 2 - s.tw / 2 + 0.02;
  return s.axles.flatMap((x) => [
    [x, s.r, z],
    [x, s.r, -z],
  ]);
}

/** One wheel (tyre and rim), axle along z, centred; the rim faces +z */
export function wheelGeometry(s: CarSpec) {
  const p = new Parts();
  p.detail(new THREE.CylinderGeometry(s.r, s.r, s.tw, 16).rotateX(Math.PI / 2), TYRE);
  p.detail(new THREE.CylinderGeometry(s.r * 0.58, s.r * 0.58, 0.02, 12).rotateX(Math.PI / 2).translate(0, 0, s.tw / 2 + 0.005), RIM);
  p.detail(new THREE.CylinderGeometry(s.r * 0.2, s.r * 0.2, 0.03, 8).rotateX(Math.PI / 2).translate(0, 0, s.tw / 2 + 0.01), TRIM);
  return merge(p.details, true)!;
}

export interface CarGeometry {
  spec: CarSpec;
  paint: THREE.BufferGeometry;
  detail: THREE.BufferGeometry;
  /** Lit windows (the bus), or null */
  glow: THREE.BufferGeometry | null;
  /** Head- and taillight spots (on the front / rear faces) */
  head: [number, number, number][];
  tail: [number, number, number][];
}

const cache = new Map<string, CarGeometry>();

export function carGeometry(id: CarId, { wheels = true } = {}): CarGeometry {
  const key = `${id}:${wheels}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const s = CARS[id];
  const p = new Parts();
  const half = s.L / 2;
  const cw = s.W * s.cabinW;
  const lit = s.id === 'bus';
  const addGlass = (g: THREE.BufferGeometry) => (lit ? p.glow(g) : p.detail(g, GLASS));

  // Body and cabin
  p.paint(extrude(bodyShape(s), s.W));
  p.paint(extrude(new THREE.Shape(s.cabin.map(([x, y]) => new THREE.Vector2(x, y))), cw));

  // Glass: the side panes (inset from the cabin's outline), the windscreen and the rear window
  const [rb, rr, fr, fb] = s.cabin;
  const inner = inset(s.cabin, 0.06);
  for (const [x0, x1] of s.panes) {
    let poly = clip(inner, ([x]) => x - x0);
    poly = clip(poly, ([x]) => x1 - x);
    if (s.sill !== undefined) poly = clip(poly, ([, y]) => y - s.sill!);
    if (poly.length < 3) continue;
    const shape = new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x, y)));
    for (const side of [-1, 1]) addGlass(extrude(shape, 0.012).translate(0, 0, side * (cw / 2 + 0.012)));
  }
  const mid: V2 = [(rb[0] + fb[0] + rr[0] + fr[0]) / 4, (rb[1] + fb[1] + rr[1] + fr[1]) / 4];
  const screenFrom: V2 = s.sill !== undefined && lit ? [fb[0] + (fr[0] - fb[0]) * 0.15, fb[1] + (fr[1] - fb[1]) * 0.15] : fb;
  addGlass(pane(fr, screenFrom, cw - 0.12, mid, 0.06));
  if (s.rearGlass) addGlass(pane(rb, rr, cw - 0.12, mid, 0.06));

  // Bumpers, grille, plates
  const bumperY = s.clr + 0.08;
  for (const end of [-1, 1]) {
    p.detail(box(0.1, 0.14, s.W + 0.02, end * (half + 0.01), bumperY, 0), TRIM);
    p.detail(box(0.02, 0.08, 0.26, end * (half + 0.065), bumperY + 0.01, 0), PLATE);
  }
  const noseTop = s.top[0][1];
  p.detail(box(0.02, Math.max(0.06, noseTop - bumperY - 0.14), s.W * 0.42, half + 0.008, (noseTop + bumperY + 0.07) / 2, 0), TRIM);
  // Wing mirrors
  for (const side of [-1, 1]) p.paint(box(0.08, 0.07, 0.1, fb[0] - 0.08, fb[1] + 0.09, side * (cw / 2 + 0.06)));

  // Wheels
  if (wheels) {
    const w = wheelGeometry(s);
    for (const [x, y, z] of wheelSpots(s)) {
      const g = w.clone();
      if (z < 0) g.rotateY(Math.PI);
      p.details.push(g.translate(x, y, z));
    }
  }
  s.extra?.(p, s);

  const lz = s.W / 2 - Math.min(0.17, s.W * 0.16);
  const out: CarGeometry = {
    spec: s,
    paint: merge(p.paints, false)!,
    detail: merge(p.details, true)!,
    glow: merge(p.glows, false),
    head: [
      [half + 0.005, s.lightY, lz],
      [half + 0.005, s.lightY, -lz],
    ],
    tail: [
      [-half - 0.005, s.lightY, lz],
      [-half - 0.005, s.lightY, -lz],
    ],
  };
  cache.set(key, out);
  return out;
}

/** The materials the fleet shares: paint takes each car's own colour, detail its vertex colours */
let mats: { paint: THREE.Material; detail: THREE.Material } | null = null;
export function carMaterials() {
  mats ??= {
    paint: toon('#ffffff', { name: 'car' }),
    detail: toon('#ffffff', { vertexColors: true, name: 'car-detail' }),
  };
  return mats;
}

/**
 * Parked cars (static, instanced: two draw calls a model). Each is [model, x, z, turn, colour];
 * x, z on the ground at `y`.
 */
export function parkedCars(parent: THREE.Object3D, y: number, list: [CarId, number, number, number, string][]) {
  const { paint, detail } = carMaterials();
  const M = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  for (const id of new Set(list.map((c) => c[0]))) {
    const cars = list.filter((c) => c[0] === id);
    const g = carGeometry(id);
    const meshes = [new THREE.InstancedMesh(g.paint, paint, cars.length), new THREE.InstancedMesh(g.detail, detail, cars.length)];
    cars.forEach(([, x, z, ry, color], i) => {
      M.compose(new THREE.Vector3(x, y, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), one);
      for (const m of meshes) m.setMatrixAt(i, M);
      meshes[0].setColorAt(i, new THREE.Color(color));
    });
    for (const m of meshes) {
      m.castShadow = true;
      m.receiveShadow = true;
      m.computeBoundingSphere();
      parent.add(m);
    }
  }
}

/**
 * One car of your own (the garage's turntable, and the car you'll drive):
 * its own paint, wheels that can turn and steer, and lights. Built facing +x
 * with the origin on the ground under its middle, like the models.
 */
export function createCar(id: CarId, paint: string) {
  const g = carGeometry(id, { wheels: false });
  const s = g.spec;
  const { detail } = carMaterials();
  const group = new THREE.Group();
  const paintMat = toon(paint);
  const body = new THREE.Mesh(g.paint, paintMat);
  const trim = new THREE.Mesh(g.detail, detail);
  const wheelGeo = wheelGeometry(s);
  const wheels = wheelSpots(s).map(([x, y, z]) => {
    // A pivot per wheel: it steers (y) and rolls (z); the rim faces out
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    const w = new THREE.Mesh(wheelGeo, detail);
    if (z < 0) w.rotation.y = Math.PI;
    pivot.add(w);
    group.add(pivot);
    return { pivot, mesh: w, front: x > 0 };
  });
  group.add(body, trim);
  for (const m of [body, trim, ...wheels.map((w) => w.mesh)]) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
  const lightGeo = new THREE.BoxGeometry(0.03, 0.08, 0.17);
  const headMat = new THREE.MeshBasicMaterial({ color: '#fff6c8' });
  const tailMat = new THREE.MeshBasicMaterial({ color: '#ff2b2b' });
  for (const [list, mat] of [
    [g.head, headMat],
    [g.tail, tailMat],
  ] as const)
    for (const [x, y, z] of list) {
      const l = new THREE.Mesh(lightGeo, mat);
      l.position.set(x, y, z);
      group.add(fx(l));
    }
  let roll = 0;
  return {
    group,
    spec: s,
    /** Roll the wheels by a distance travelled, and steer the front ones (radians) */
    drive(dist: number, steer = 0) {
      roll -= dist / s.r;
      for (const w of wheels) {
        w.mesh.rotation.z = w.mesh.rotation.y ? -roll : roll;
        w.pivot.rotation.y = w.front ? steer : 0;
      }
    },
    dispose() {
      group.removeFromParent();
      wheelGeo.dispose();
      lightGeo.dispose();
      headMat.dispose();
      tailMat.dispose();
    },
  };
}
export type Car = ReturnType<typeof createCar>;
