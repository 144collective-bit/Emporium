/*
 * The airport's aircraft in Degen's cartoon style: a chunky airliner in
 * DEGEN AIR colours (a made-up airline, never a real one, maker or badge),
 * a high-wing prop plane and a helicopter. Fat shapes and clear parts, so
 * the ink outlines pick out the wings, engines, windows and gear.
 *
 * 1 tile is about 1.8 m (Degen is about one tile tall): the airliner is
 * about 20 tiles long with an 18-tile span, the prop plane about 5 long
 * with a 7.2 span, the helicopter about 6 long with a 6.2 rotor.
 *
 * Models point along +x (the nose), y up, +z the right wing; the origin is
 * on the ground under the middle (wheels or skids at y = 0). Each model is
 * a few parts by role: `body` (vertex colours, the shared toon paint),
 * `accent` (one colour per aircraft: tail, cowls, stripes), `neon` (nav
 * lights), `strobe` (the blinking beacon), `gear` (folds away in flight),
 * `decal` (the DEGEN AIR titles) and spinners (propeller, rotors, each with
 * a blur disc for when it's turning fast). `createFleet()` makes one
 * instanced mesh per part for several of a kind, so a fleet costs a handful
 * of draw calls whatever its size.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FONT_DISPLAY, canvasTex, fx, glowTex, neon, paintMat, sharedFor, toon } from './kit';
import type { AircraftKind, Pose } from './airfield';

/** Every model: the airport's three kinds and the players' small jet (Phase 2) */
export type ModelKind = AircraftKind | 'bizjet';

type Role = 'body' | 'accent' | 'neon' | 'strobe' | 'gear' | 'decal';
interface Spinner {
  blades: THREE.BufferGeometry;
  blur: THREE.BufferGeometry;
  /** Where it turns about, and on which axis (model space) */
  pivot: THREE.Vector3;
  axis: THREE.Vector3;
  /** Turns a second at full power */
  rate: number;
}
export interface AircraftModel {
  kind: ModelKind;
  parts: { role: Role; geo: THREE.BufferGeometry }[];
  spinners: Spinner[];
  /** Nose to tail, wingtip to wingtip, and its blob shadow's size */
  length: number;
  span: number;
}

/* ---------- Building blocks ---------- */

const C = (hex: string) => new THREE.Color(hex);
const WHITE = C('#eceaf6');
const BELLY = C('#b9b4d6');
const GREY = C('#d9d4ef');
const INK = C('#1b1830');
const GLASS = C('#24305e');
const METAL = C('#8f8ab0');
const TYRE = C('#17151f');
/** The PulseChain gradient, for stripes */
const PULSE = ['#ff0000', '#f10e7d', '#e219e5', '#8000ff', '#037dff', '#00b0ff', '#00eaff'].map(C);
const pulseAt = (f: number, out = new THREE.Color()) => {
  const k = Math.max(0, Math.min(1, f)) * (PULSE.length - 1);
  const i = Math.min(PULSE.length - 2, Math.floor(k));
  return out.copy(PULSE[i]).lerp(PULSE[i + 1], k - i);
};

/** Strip a geometry to positions and normals (and uvs or vertex colours), non-indexed, so the parts merge */
function clean(g: THREE.BufferGeometry, uv = false, color = false) {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal' && !(uv && k === 'uv') && !(color && k === 'color')) n.deleteAttribute(k);
  if (!n.attributes.normal) n.computeVertexNormals();
  return n;
}
/** One colour on every vertex */
function tint(g: THREE.BufferGeometry, c: THREE.Color) {
  const n = clean(g);
  const a = new Float32Array(n.attributes.position.count * 3);
  for (let i = 0; i < a.length; i += 3) c.toArray(a, i);
  n.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return n;
}

/** Collects a model's geometry by role */
class Parts {
  lists = new Map<Role, THREE.BufferGeometry[]>();
  spinners: Spinner[] = [];
  add(role: Role, g: THREE.BufferGeometry, c?: THREE.Color) {
    if (!this.lists.has(role)) this.lists.set(role, []);
    // Roles in one colour (accent, decal) carry no vertex colours; the rest always do
    const plain = role === 'accent' || role === 'decal';
    this.lists.get(role)!.push(plain ? clean(g, role === 'decal') : c ? tint(g, c) : g.attributes.color ? clean(g, false, true) : tint(g, WHITE));
  }
  /** A box from its centre and size, turned (yaw, pitch, roll as Euler YZX) */
  box(role: Role, c: THREE.Color | undefined, x: number, y: number, z: number, w: number, h: number, d: number, rx = 0, ry = 0, rz = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz, 'YZX')));
    g.translate(x, y, z);
    this.add(role, g, c);
  }
  /** A cylinder along x */
  tubeX(role: Role, c: THREE.Color | undefined, x0: number, x1: number, r0: number, r1: number, y: number, z: number, seg = 14) {
    const g = new THREE.CylinderGeometry(r1, r0, Math.abs(x1 - x0), seg).rotateZ(-Math.PI / 2);
    g.translate((x0 + x1) / 2, y, z);
    this.add(role, g, c);
  }
  /** A flat shape (outline in u, v) given thickness, laid by `place` (maps u, v, w to x, y, z) */
  slab(role: Role, c: THREE.Color | undefined, outline: [number, number][], t: number, place: (u: number, v: number, w: number) => [number, number, number]) {
    const shape = new THREE.Shape(outline.map(([u, v]) => new THREE.Vector2(u, v)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
    g.translate(0, 0, -t / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, ...place(p.getX(i), p.getY(i), p.getZ(i)));
    // A mapping that mirrors (a left wing) turns the faces inside out: wind them back
    const o = new THREE.Vector3(...place(0, 0, 0));
    const [du, dv, dw] = [place(1, 0, 0), place(0, 1, 0), place(0, 0, 1)].map((q) => new THREE.Vector3(...q).sub(o));
    let flat = g.index ? g.toNonIndexed() : g;
    if (du.dot(dv.clone().cross(dw)) < 0) {
      const a = flat.attributes.position;
      for (let i = 0; i < a.count; i += 3) {
        const [x, y, z] = [a.getX(i + 1), a.getY(i + 1), a.getZ(i + 1)];
        a.setXYZ(i + 1, a.getX(i + 2), a.getY(i + 2), a.getZ(i + 2));
        a.setXYZ(i + 2, x, y, z);
      }
    }
    flat = clean(flat);
    flat.computeVertexNormals();
    this.add(role, flat, c);
  }
  /** Something that turns: blades and a blur disc, both made round the origin, moved to the pivot */
  spin(blades: THREE.BufferGeometry, blur: THREE.BufferGeometry, pivot: THREE.Vector3, axis: THREE.Vector3, rate: number) {
    const b = blades.attributes.color ? clean(blades, false, true) : tint(blades, INK);
    this.spinners.push({ blades: b.translate(pivot.x, pivot.y, pivot.z), blur: clean(blur).translate(pivot.x, pivot.y, pivot.z), pivot, axis, rate });
  }
  model(kind: ModelKind, length: number, span: number): AircraftModel {
    const parts = [...this.lists].map(([role, geos]) => ({ role, geo: mergeGeometries(geos, false)! }));
    return { kind, parts, spinners: this.spinners, length, span };
  }
}

/**
 * A body of revolution along x from stations (x, radius, centre height,
 * height scale), coloured per vertex by `paint`. `from`/`to` (0-1 round
 * the ring, 0 at the right side, 0.25 the top) make a patch instead of a
 * whole ring, `out` lifts it off the surface (stripes, glazing).
 */
function loft(
  stations: [number, number, number, number?][],
  paint: (x: number, a: number) => THREE.Color,
  o: { seg?: number; from?: number; to?: number; out?: number; width?: number } = {}
) {
  const seg = o.seg ?? 18;
  const [a0, a1] = [o.from ?? 0, o.to ?? 1];
  const full = a1 - a0 >= 1;
  const n = full ? seg : Math.max(2, Math.round(seg * (a1 - a0)));
  const cols = full ? n : n + 1;
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const out = o.out ?? 0;
  const wz = o.width ?? 1;
  for (const [x, r, cy, sy = 1] of stations)
    for (let k = 0; k < cols; k++) {
      const a = (a0 + ((a1 - a0) * k) / n) * Math.PI * 2;
      const rr = r + out;
      pos.push(x, cy + Math.sin(a) * rr * sy, Math.cos(a) * rr * wz);
      paint(x, (a0 + ((a1 - a0) * k) / n) % 1).toArray(col, col.length);
    }
  for (let s = 0; s < stations.length - 1; s++)
    for (let k = 0; k < (full ? cols : cols - 1); k++) {
      const k1 = full ? (k + 1) % cols : k + 1;
      const [p, q, r, t] = [s * cols + k, s * cols + k1, (s + 1) * cols + k, (s + 1) * cols + k1];
      idx.push(p, q, r, q, t, r);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  // Smooth normals round the body (worked out while the rings share their vertices), kept when split
  g.computeVertexNormals();
  return g.toNonIndexed();
}
/** Where a station-lofted body's surface is at (x, a): radius and centre, interpolated */
function surface(stations: [number, number, number, number?][], x: number, a: number, out = 0) {
  let i = 0;
  while (i < stations.length - 2 && stations[i + 1][0] > x) i++;
  const [s0, s1] = [stations[i], stations[i + 1]];
  const f = (x - s0[0]) / (s1[0] - s0[0] || 1);
  const r = s0[1] + (s1[1] - s0[1]) * f + out;
  const cy = s0[2] + (s1[2] - s0[2]) * f;
  const sy = (s0[3] ?? 1) + ((s1[3] ?? 1) - (s0[3] ?? 1)) * f;
  const ang = a * Math.PI * 2;
  return new THREE.Vector3(x, cy + Math.sin(ang) * r * sy, Math.cos(ang) * r);
}
/** A little flat pad stuck onto a lofted body, facing out (windows, doors) */
function onBody(P: Parts, role: Role, c: THREE.Color, st: [number, number, number, number?][], x: number, a: number, w: number, h: number) {
  const p = surface(st, x, a, 0.02);
  // Its thin side (z) turned out from the centre line
  P.box(role, c, p.x, p.y, p.z, w, h, 0.05, -a * Math.PI * 2, 0, 0);
}

/** The nav lights: red on the left wingtip, green on the right, white at the tail */
function navLights(P: Parts, tipX: number, tipY: number, tipZ: number, tail: [number, number, number]) {
  const lamp = (c: string) => sharedFor(neon(c, 0.35, 2.4))!.color;
  P.add('neon', new THREE.SphereGeometry(0.14, 8, 6).translate(tipX, tipY, -tipZ), lamp('#ff2b2b'));
  P.add('neon', new THREE.SphereGeometry(0.14, 8, 6).translate(tipX, tipY, tipZ), lamp('#2bff88'));
  P.add('neon', new THREE.SphereGeometry(0.12, 8, 6).translate(...tail), lamp('#fff6c8'));
}

/* ---------- The airliner ---------- */

function airliner(): AircraftModel {
  const P = new Parts();
  const H = 2.75;
  const R = 1.3;
  const st: [number, number, number, number?][] = [
    [10.1, 0.04, H - 0.35],
    [9.85, 0.5, H - 0.3],
    [9.35, 0.86, H - 0.18],
    [8.6, 1.12, H - 0.08],
    [7.6, 1.26, H - 0.02],
    [6.6, R, H],
    [-4.6, R, H],
    [-6.2, 1.16, H + 0.18],
    [-7.8, 0.88, H + 0.48],
    [-9.2, 0.5, H + 0.82],
    [-10.1, 0.12, H + 1.02],
    [-10.25, 0.02, H + 1.05],
  ];
  // Fuselage: white, a grey belly, the PulseChain stripe along each side
  P.add(
    'body',
    loft(st, () => WHITE, { seg: 22 })
  );
  P.add(
    'body',
    loft(st.slice(3, 10), () => BELLY, { seg: 22, from: 0.6, to: 0.9, out: 0.012 })
  );
  for (const [from, to] of [
    [0.965, 1.015],
    [0.485, 0.535],
  ])
    P.add(
      'body',
      loft(st.slice(2, 10), (x) => pulseAt((8.6 - x) / 16), { seg: 60, from, to, out: 0.014 })
    );
  // Windows: a row each side, the cockpit's panes, doors
  for (let x = -5.6; x <= 6.2; x += 0.56) for (const a of [0.045, 0.455]) onBody(P, 'body', INK, st, x, a, 0.24, 0.3);
  for (const [x, a, w] of [
    [9.15, 0.08, 0.5],
    [9.15, 0.42, 0.5],
    [9.35, 0.16, 0.42],
    [9.35, 0.34, 0.42],
  ] as const)
    onBody(P, 'body', GLASS, st, x, a, w, 0.34);
  for (const x of [7.25, -6.6]) for (const a of [0.0, 0.5]) onBody(P, 'body', GREY, st, x, a + 0.005, 0.62, 1.15);

  // Wings: swept, tapered, a little dihedral, winglets in the accent colour
  const wing = (side: 1 | -1) => {
    const dih = 0.08;
    P.slab(
      'body',
      GREY,
      [
        [2.3, 0.9],
        [-2.9, 0.9],
        [-4.2, 9],
        [-2.5, 9],
      ],
      0.26,
      (u, v, t) => [u, H - 0.95 + t + (v - 0.9) * dih, side * v]
    );
    P.slab(
      'accent',
      undefined,
      [
        [-2.45, 0],
        [-3.9, 0],
        [-4.4, 1.25],
        [-3.7, 1.25],
      ],
      0.12,
      (u, v, t) => [u, H - 0.95 + 8.1 * dih + v, side * (9 + t + v * 0.15)]
    );
    // Engine under the wing: cowl in the accent colour, an inked intake and fan, a pylon
    const ez = side * 3.6;
    const ey = H - 1.75;
    P.tubeX('accent', undefined, 0.2, 2.9, 0.52, 0.66, ey, ez, 18);
    P.tubeX('body', INK, 2.9, 2.98, 0.66, 0.6, ey, ez, 18);
    P.add('body', new THREE.CircleGeometry(0.55, 18).rotateY(Math.PI / 2).translate(2.96, ey, ez), C('#4b4766'));
    P.add('body', new THREE.ConeGeometry(0.16, 0.4, 10).rotateZ(-Math.PI / 2).translate(3.05, ey, ez), C('#4b4766'));
    P.tubeX('body', METAL, -0.35, 0.2, 0.32, 0.46, ey, ez, 14);
    P.box('body', GREY, 0.9, ey + 0.65, ez, 2.2, 0.55, 0.2);
  };
  wing(1);
  wing(-1);

  // Tail: fin in the accent colour with the Emporium's diamond, tailplanes
  P.slab(
    'accent',
    undefined,
    [
      [-6.4, 0],
      [-9.8, 0],
      [-10.6, 4.6],
      [-9.3, 4.6],
    ],
    0.28,
    (u, v, t) => [u, H + 0.9 + v, t]
  );
  for (const s of [1, -1]) {
    const d = [
      [-8.9, 2.1],
      [-8.45, 2.75],
      [-8.9, 3.4],
      [-9.35, 2.75],
    ] as [number, number][];
    P.slab('body', WHITE, d, 0.04, (u, v, t) => [u, H + 0.9 + v, s * (0.16 + t)]);
    P.slab(
      'body',
      C('#00eaff'),
      d.map(([u, v]) => [-8.9 + (u + 8.9) * 0.5, 2.75 + (v - 2.75) * 0.5] as [number, number]),
      0.04,
      (u, v, t) => [u, H + 0.9 + v, s * (0.19 + t)]
    );
    P.slab(
      'body',
      GREY,
      [
        [-7.6, 0.3],
        [-9.7, 0.3],
        [-10.3, 3.7],
        [-9.3, 3.7],
      ],
      0.18,
      (u, v, t) => [u, H + 0.75 + t + v * 0.05, s * v]
    );
  }

  // Landing gear: a nose leg and two main legs, twin wheels each
  const leg = (x: number, z: number, r: number, top: number) => {
    P.add('gear', new THREE.CylinderGeometry(0.09, 0.09, top - r).translate(x, r + (top - r) / 2, z), METAL);
    for (const dz of [-0.24, 0.24]) {
      P.add('gear', new THREE.CylinderGeometry(r, r, 0.2, 14).rotateX(Math.PI / 2).translate(x, r, z + dz), TYRE);
      P.add('gear', new THREE.CylinderGeometry(r * 0.5, r * 0.5, 0.22, 10).rotateX(Math.PI / 2).translate(x, r, z + dz), METAL);
    }
  };
  leg(7.7, 0, 0.32, H - 0.9);
  leg(-0.7, 2.1, 0.44, H - 1.0);
  leg(-0.7, -2.1, 0.44, H - 1.0);

  navLights(P, -3.4, H - 0.95 + 8.1 * 0.08 + 0.1, 9.05, [-10.3, H + 1.05, 0]);
  const red = sharedFor(neon('#ff2b2b', 0.6, 2.4))!.color;
  P.add('strobe', new THREE.SphereGeometry(0.16, 8, 6).translate(-1, H + R + 0.05, 0), red);
  P.add('strobe', new THREE.SphereGeometry(0.16, 8, 6).translate(-1, H - R - 0.05, 0), red);

  // DEGEN AIR above the windows, both sides
  for (const s of [1, -1]) {
    const a = 0.1;
    const p = surface(st, 2.6, s > 0 ? a : 0.5 - a, 0.03);
    const g = new THREE.PlaneGeometry(4.6, 0.62);
    g.rotateX(-a * Math.PI * 2);
    if (s < 0) g.rotateY(Math.PI);
    g.translate(p.x, p.y, p.z);
    P.add('decal', g);
  }
  return P.model('jet', 20.4, 18.6);
}

/* ---------- The prop plane ---------- */

function propPlane(): AircraftModel {
  const P = new Parts();
  const H = 1.15;
  const st: [number, number, number, number?][] = [
    [2.55, 0.18, H],
    [2.4, 0.46, H],
    [1.7, 0.55, H + 0.02, 1.1],
    [0.4, 0.58, H + 0.08, 1.2],
    [-0.7, 0.5, H + 0.08, 1.15],
    [-1.8, 0.3, H + 0.15],
    [-2.6, 0.12, H + 0.25],
    [-2.7, 0.02, H + 0.26],
  ];
  P.add(
    'body',
    loft(st, () => WHITE, { seg: 16 })
  );
  // Cowling and a stripe in the accent colour
  P.add(
    'accent',
    loft(st.slice(0, 3), () => WHITE, { seg: 16, out: 0.01 })
  );
  P.add(
    'accent',
    loft(st.slice(2, 7), () => WHITE, { seg: 30, from: 0.47, to: 0.53, out: 0.012 })
  );
  P.add(
    'accent',
    loft(st.slice(2, 7), () => WHITE, { seg: 30, from: 0.97, to: 1.03, out: 0.012 })
  );
  // Windscreen and side windows
  for (const a of [0.12, 0.38]) onBody(P, 'body', GLASS, st, 1.25, a, 0.5, 0.36);
  for (const x of [0.75, 0.05]) for (const a of [0.05, 0.45]) onBody(P, 'body', GLASS, st, x, a, 0.5, 0.34);
  // High wing on struts, tips in the accent colour
  const WY = H + 0.68;
  P.box('body', WHITE, 0.25, WY, 0, 1.25, 0.14, 7.2);
  for (const s of [1, -1]) {
    P.box('accent', undefined, 0.25, WY, s * 3.45, 1.27, 0.16, 0.3);
    const strut = new THREE.CylinderGeometry(0.04, 0.04, 1.75).rotateX(s * 0.95).translate(0.25, H + 0.05, s * 0.95);
    P.add('body', strut, METAL);
  }
  // Tail
  P.slab(
    'accent',
    undefined,
    [
      [-1.9, 0],
      [-2.75, 0],
      [-2.95, 1.05],
      [-2.5, 1.05],
    ],
    0.1,
    (u, v, t) => [u, H + 0.3 + v, t]
  );
  P.box('body', WHITE, -2.35, H + 0.3, 0, 0.6, 0.08, 2.4);
  // Fixed gear with spats
  const wheel = (x: number, z: number) => {
    P.add('body', new THREE.CylinderGeometry(0.22, 0.22, 0.14, 12).rotateX(Math.PI / 2).translate(x, 0.22, z), TYRE);
    P.add('body', new THREE.SphereGeometry(0.28, 12, 8).scale(1.5, 0.9, 0.55).translate(x, 0.3, z), C('#c9c4e6'));
    P.add('body', new THREE.CylinderGeometry(0.04, 0.04, 0.55).translate(x, 0.6, z), METAL);
  };
  wheel(1.9, 0);
  wheel(0.05, 0.75);
  wheel(0.05, -0.75);
  // Propeller: a spinner and two blades, turning about x
  P.add('body', new THREE.ConeGeometry(0.17, 0.32, 12).rotateZ(-Math.PI / 2).translate(2.7, H, 0), C('#e219e5'));
  const blades = new THREE.BoxGeometry(0.06, 1.75, 0.16);
  blades.applyMatrix4(new THREE.Matrix4().makeRotationX(0.3));
  P.spin(tint(blades, INK), new THREE.CircleGeometry(0.88, 24).rotateY(Math.PI / 2), new THREE.Vector3(2.62, H, 0), new THREE.Vector3(1, 0, 0), 18);
  navLights(P, 0.25, WY, 3.62, [-2.95, H + 1.38, 0]);
  P.add('strobe', new THREE.SphereGeometry(0.09, 8, 6).translate(-2.55, H + 1.4, 0), sharedFor(neon('#ff2b2b', 0.6, 2.4))!.color);
  return P.model('prop', 5.4, 7.2);
}

/* ---------- The helicopter ---------- */

function helicopter(): AircraftModel {
  const P = new Parts();
  const H = 1.25;
  const st: [number, number, number, number?][] = [
    [1.85, 0.06, H - 0.12],
    [1.7, 0.45, H - 0.08, 1.05],
    [1.2, 0.78, H, 1.08],
    [0.2, 0.86, H + 0.05, 1.1],
    [-0.8, 0.7, H + 0.12, 1.05],
    [-1.3, 0.38, H + 0.25],
    [-1.45, 0.05, H + 0.3],
  ];
  // The cabin in the accent colour, glazing round the nose, a white band
  P.add(
    'accent',
    loft(st, () => WHITE, { seg: 18 })
  );
  P.add(
    'body',
    loft(st.slice(0, 4), (x, a) => (a > 0.62 && a < 0.88 ? C('#2a2550') : GLASS), { seg: 36, from: 0.62, to: 1.38, out: 0.015 })
  );
  P.add(
    'body',
    loft(st.slice(2, 6), () => WHITE, { seg: 36, from: 0.44, to: 0.56, out: 0.02 })
  );
  P.add(
    'body',
    loft(st.slice(2, 6), () => WHITE, { seg: 36, from: 0.94, to: 1.06, out: 0.02 })
  );
  // Engine housing, mast and hub
  P.box('accent', undefined, -0.25, H + 0.95, 0, 1.4, 0.42, 0.9);
  P.box('body', C('#2a2550'), -0.95, H + 0.95, 0, 0.12, 0.3, 0.7);
  P.add('body', new THREE.CylinderGeometry(0.09, 0.12, 0.4, 10).translate(0, H + 1.35, 0), METAL);
  // Tail boom, fin, stabiliser
  P.tubeX('accent', undefined, -4.3, -1.1, 0.12, 0.32, H + 0.42, 0, 12);
  P.slab(
    'accent',
    undefined,
    [
      [-3.8, 0],
      [-4.45, 0],
      [-4.65, 1.1],
      [-4.3, 1.1],
    ],
    0.1,
    (u, v, t) => [u, H + 0.35 + v, t]
  );
  P.box('body', WHITE, -3.6, H + 0.45, 0, 0.45, 0.06, 1.3);
  // Skids and their cross tubes
  for (const s of [1, -1]) {
    P.tubeX('body', METAL, -1.2, 1.25, 0.05, 0.05, 0.06, s * 0.8, 8);
    P.add('body', new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8).rotateZ(-0.9).translate(1.38, 0.17, s * 0.8), METAL);
    for (const x of [-0.6, 0.7]) P.add('body', new THREE.CylinderGeometry(0.04, 0.04, 0.75, 8).rotateX(s * 0.55).translate(x, 0.38, s * 0.62), METAL);
  }
  // Main rotor about y, tail rotor about z
  const blades: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 4; k++) blades.push(new THREE.BoxGeometry(3.05, 0.05, 0.28).translate(1.55, 0, 0).rotateY((k * Math.PI) / 2));
  blades.push(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 10));
  const main = mergeGeometries(blades.map((g) => clean(g)))!;
  P.spin(tint(main, INK), new THREE.CircleGeometry(3.1, 32).rotateX(-Math.PI / 2), new THREE.Vector3(0, H + 1.58, 0), new THREE.Vector3(0, 1, 0), 6);
  const tail = mergeGeometries([new THREE.BoxGeometry(0.1, 1.05, 0.04), new THREE.BoxGeometry(1.05, 0.1, 0.04)].map((g) => clean(g)))!;
  P.spin(tint(tail, INK), new THREE.CircleGeometry(0.55, 18), new THREE.Vector3(-4.3, H + 0.62, 0.16), new THREE.Vector3(0, 0, 1), 18);
  navLights(P, -3.6, H + 0.45, 0.68, [-4.65, H + 1.45, 0]);
  P.add('strobe', new THREE.SphereGeometry(0.1, 8, 6).translate(-0.4, H + 1.18, 0), sharedFor(neon('#ff2b2b', 0.6, 2.4))!.color);
  P.add('strobe', new THREE.SphereGeometry(0.1, 8, 6).translate(0.2, H - 0.9, 0), sharedFor(neon('#ff2b2b', 0.6, 2.4))!.color);
  return P.model('heli', 6.2, 6.2);
}

/* ---------- The small jet (the players' own, Phase 2) ---------- */

function bizjet(): AircraftModel {
  const P = new Parts();
  const H = 1.35;
  const st: [number, number, number, number?][] = [
    [4.4, 0.03, H - 0.22],
    [4.2, 0.26, H - 0.17],
    [3.8, 0.46, H - 0.09],
    [3.2, 0.6, H - 0.02],
    [2.5, 0.65, H],
    [-1.6, 0.65, H],
    [-2.6, 0.55, H + 0.1],
    [-3.5, 0.37, H + 0.26],
    [-4.2, 0.13, H + 0.4],
    [-4.32, 0.02, H + 0.42],
  ];
  P.add(
    'body',
    loft(st, () => WHITE, { seg: 20 })
  );
  P.add(
    'body',
    loft(st.slice(2, 8), () => BELLY, { seg: 20, from: 0.6, to: 0.9, out: 0.01 })
  );
  // A sweep of the accent colour along each side, and the nose cone
  for (const [from, to] of [
    [0.955, 1.02],
    [0.48, 0.545],
  ])
    P.add(
      'accent',
      loft(st.slice(1, 9), () => WHITE, { seg: 60, from, to, out: 0.012 })
    );
  P.add(
    'accent',
    loft(st.slice(0, 2), () => WHITE, { seg: 20, out: 0.01 })
  );
  // Cockpit glazing, oval cabin windows, the door
  for (const [x, a, w] of [
    [3.55, 0.09, 0.42],
    [3.55, 0.41, 0.42],
    [3.72, 0.17, 0.34],
    [3.72, 0.33, 0.34],
  ] as const)
    onBody(P, 'body', GLASS, st, x, a, w, 0.26);
  for (let x = -1.1; x <= 2.0; x += 0.52) for (const a of [0.035, 0.465]) onBody(P, 'body', INK, st, x, a, 0.26, 0.2);
  onBody(P, 'body', GREY, st, 2.65, 0.485, 0.5, 0.82);
  // Low swept wings with winglets in the accent colour
  for (const side of [1, -1] as const) {
    const dih = 0.07;
    P.slab(
      'body',
      GREY,
      [
        [1, 0.5],
        [-0.9, 0.5],
        [-2.05, 4.05],
        [-1.4, 4.05],
      ],
      0.16,
      (u, v, t) => [u, H - 0.42 + t + (v - 0.5) * dih, side * v]
    );
    P.slab(
      'accent',
      undefined,
      [
        [-1.35, 0],
        [-2.05, 0],
        [-2.35, 0.75],
        [-1.95, 0.75],
      ],
      0.08,
      (u, v, t) => [u, H - 0.42 + 3.55 * dih + v, side * (4.05 + t + v * 0.1)]
    );
    // An engine on each side of the tail, on a short pylon
    const ez = side * 1.02;
    const ey = H + 0.38;
    P.tubeX('accent', undefined, -3.3, -1.55, 0.29, 0.36, ey, ez, 16);
    P.tubeX('body', INK, -1.55, -1.5, 0.36, 0.33, ey, ez, 16);
    P.add('body', new THREE.CircleGeometry(0.3, 16).rotateY(Math.PI / 2).translate(-1.51, ey, ez), C('#4b4766'));
    P.tubeX('body', METAL, -3.55, -3.3, 0.2, 0.27, ey, ez, 12);
    P.box('body', GREY, -2.45, ey - 0.02, side * 0.68, 0.9, 0.12, 0.42);
  }
  // T-tail: the fin in the accent colour with the Emporium's diamond, the tailplane on top
  const FIN = 2.05;
  P.slab(
    'accent',
    undefined,
    [
      [-2.85, 0],
      [-4.15, 0],
      [-4.75, FIN],
      [-4.1, FIN],
    ],
    0.14,
    (u, v, t) => [u, H + 0.3 + v, t]
  );
  for (const s of [1, -1]) {
    const d = [
      [-3.85, 0.7],
      [-3.6, 1.05],
      [-3.85, 1.4],
      [-4.1, 1.05],
    ] as [number, number][];
    P.slab('body', WHITE, d, 0.03, (u, v, t) => [u, H + 0.3 + v, s * (0.08 + t)]);
    P.slab(
      'body',
      C('#00eaff'),
      d.map(([u, v]) => [-3.85 + (u + 3.85) * 0.5, 1.05 + (v - 1.05) * 0.5] as [number, number]),
      0.03,
      (u, v, t) => [u, H + 0.3 + v, s * (0.1 + t)]
    );
    P.slab(
      'body',
      WHITE,
      [
        [-3.95, 0.05],
        [-4.6, 0.05],
        [-4.95, 1.75],
        [-4.55, 1.75],
      ],
      0.1,
      (u, v, t) => [u, H + 0.3 + FIN + t, s * v]
    );
  }
  // Gear: a nose leg and two mains, folding away in flight
  const leg = (x: number, z: number, r: number, top: number) => {
    P.add('gear', new THREE.CylinderGeometry(0.06, 0.06, top - r).translate(x, r + (top - r) / 2, z), METAL);
    P.add('gear', new THREE.CylinderGeometry(r, r, 0.16, 12).rotateX(Math.PI / 2).translate(x, r, z), TYRE);
    P.add('gear', new THREE.CylinderGeometry(r * 0.5, r * 0.5, 0.18, 10).rotateX(Math.PI / 2).translate(x, r, z), METAL);
  };
  leg(3.05, 0, 0.17, H - 0.45);
  leg(-0.6, 1.05, 0.24, H - 0.45);
  leg(-0.6, -1.05, 0.24, H - 0.45);
  navLights(P, -1.75, H - 0.42 + 3.55 * 0.07 + 0.08, 4.1, [-4.95, H + 0.3 + FIN + 0.12, 0]);
  const red = sharedFor(neon('#ff2b2b', 0.6, 2.4))!.color;
  P.add('strobe', new THREE.SphereGeometry(0.09, 8, 6).translate(0.2, H + 0.67, 0), red);
  P.add('strobe', new THREE.SphereGeometry(0.09, 8, 6).translate(0.2, H - 0.67, 0), red);
  return P.model('bizjet', 9.3, 8.4);
}

const MODELS: Partial<Record<ModelKind, AircraftModel>> = {};
export function aircraftModel(kind: ModelKind) {
  return (MODELS[kind] ??= kind === 'jet' ? airliner() : kind === 'prop' ? propPlane() : kind === 'bizjet' ? bizjet() : helicopter());
}

/* ---------- Materials ---------- */

let mats: Record<Role, THREE.Material> & { blur: THREE.Material; shadow: THREE.Material } = null!;
function materials() {
  if (mats) return mats;
  const titles = canvasTex(1024, 140, (c) => {
    c.clearRect(0, 0, 1024, 140);
    c.font = `900 118px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 10;
    c.strokeStyle = '#eceaf6';
    c.strokeText('DEGEN AIR', 512, 76);
    c.fillStyle = '#2c1f68';
    c.fillText('DEGEN AIR', 512, 76);
  });
  const lights = sharedFor(neon('#ffffff', 0.35, 2.4))!.mat;
  mats = {
    body: paintMat(),
    accent: toon('#ffffff', { fog: true }),
    neon: lights,
    strobe: sharedFor(neon('#ff2b2b', 0.6, 2.4))!.mat,
    gear: paintMat(),
    decal: toon('#ffffff', { map: titles, alphaTest: 0.5 }),
    blur: new THREE.MeshBasicMaterial({ color: '#c9c4e6', transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }),
    shadow: new THREE.MeshBasicMaterial({ color: '#000000', map: glowTex, transparent: true, opacity: 0.4, depthWrite: false }),
  };
  return mats;
}

/* ---------- Fleets ---------- */

const Q = new THREE.Quaternion();
const E = new THREE.Euler(0, 0, 0, 'YZX');
const ONE = new THREE.Vector3(1, 1, 1);
const UP = new THREE.Vector3(0, 1, 0);
const NONE = new THREE.Vector3(0, 0, 0);
const HIDE = new THREE.Matrix4();
const SIZE = new THREE.Vector3();
const V = new THREE.Vector3();
const M = new THREE.Matrix4();
const S = new THREE.Matrix4();
const T = new THREE.Matrix4();

/** The model's place in the world for a pose */
export function poseMatrix(p: Pose, out = new THREE.Matrix4()) {
  E.set(p.roll, p.yaw, p.pitch, 'YZX');
  return out.compose(V.set(p.x, p.y, p.z), Q.setFromEuler(E), ONE);
}

/**
 * Several aircraft of one kind, each part one instanced mesh: `set(i, pose)`
 * each frame, then `update(t, dt)` turns the props and rotors, folds the
 * gear, blinks the beacons and moves the blob shadows.
 */
export function createFleet(kind: ModelKind, liveries: string[]) {
  const model = aircraftModel(kind);
  const m = materials();
  const n = liveries.length;
  const group = new THREE.Group();
  group.name = `fleet-${kind}`;
  const inst = (geo: THREE.BufferGeometry, mat: THREE.Material, cast = true) => {
    const im = new THREE.InstancedMesh(geo, mat, n);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Culled as a fleet: its bounds are worked out again each frame from where they are
    im.frustumCulled = true;
    im.castShadow = cast;
    im.receiveShadow = false;
    group.add(im);
    return im;
  };
  const parts = model.parts.map((p) => {
    const im = inst(p.geo, m[p.role], p.role === 'body' || p.role === 'accent' || p.role === 'gear');
    if (p.role === 'neon' || p.role === 'strobe' || p.role === 'decal') fx(im);
    if (p.role === 'accent') liveries.forEach((c, i) => im.setColorAt(i, new THREE.Color(c)));
    return { role: p.role, im };
  });
  const accent = parts.find((p) => p.role === 'accent')?.im;
  const spins = model.spinners.map((s) => ({ s, blades: inst(s.blades, m.body), blur: fx(inst(s.blur, m.blur, false)), angle: new Array<number>(n).fill(0) }));
  // A soft shadow on the ground, for where the city's shadow map doesn't reach (and while flying low)
  const shadow = fx(inst(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), m.shadow, false));
  const poses: Pose[] = new Array(n);

  return {
    group,
    model,
    set(i: number, p: Pose) {
      poses[i] = p;
    },
    /** Repaint one aircraft's livery colour (your own, picked at the hangar) */
    paint(i: number, hex: string) {
      if (!accent) return;
      accent.setColorAt(i, new THREE.Color(hex));
      accent.instanceColor!.needsUpdate = true;
    },
    update(t: number, dt: number) {
      for (let i = 0; i < n; i++) {
        const p = poses[i];
        if (!p) continue;
        poseMatrix(p, M);
        // Hidden parts shrink to nothing where the aircraft is (not at the world's origin, which would stretch the bounds)
        HIDE.copy(M).scale(NONE);
        for (const { role, im } of parts) {
          if (role === 'gear' && !p.gear) im.setMatrixAt(i, HIDE);
          else if (role === 'strobe' && (t * 1.1 + i * 0.37) % 1 > 0.12) im.setMatrixAt(i, HIDE);
          else im.setMatrixAt(i, M);
        }
        for (const sp of spins) {
          sp.angle[i] = (sp.angle[i] + sp.s.rate * Math.PI * 2 * p.power * dt) % (Math.PI * 2);
          const { pivot, axis } = sp.s;
          T.makeTranslation(pivot.x, pivot.y, pivot.z)
            .multiply(S.makeRotationAxis(axis, sp.angle[i]))
            .multiply(new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));
          // Fast: a blurred disc; slow: the blades
          const fast = p.power > 0.6;
          sp.blades.setMatrixAt(i, fast ? HIDE : S.multiplyMatrices(M, T));
          sp.blur.setMatrixAt(i, fast ? M : HIDE);
        }
        // The shadow: under it, fading as it climbs
        const k = Math.max(0, 1 - p.y / 30);
        shadow.setMatrixAt(
          i,
          T.compose(V.set(p.x, 0.04, p.z), Q.setFromAxisAngle(UP, p.yaw), SIZE.set(Math.max(1e-4, model.length * k * 1.05), 1, Math.max(1e-4, model.span * 0.55 * k)))
        );
      }
      for (const im of [...parts.map((x) => x.im), ...spins.flatMap((sp) => [sp.blades, sp.blur]), shadow]) {
        im.instanceMatrix.needsUpdate = true;
        im.computeBoundingSphere();
      }
    },
  };
}
export type Fleet = ReturnType<typeof createFleet>;
