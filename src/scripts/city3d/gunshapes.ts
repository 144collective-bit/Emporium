/*
 * The guns' shapes (docs/weapons-plan.md Phase 2, the owner's call: "the guns
 * need to look less blocky"): DOM-free, so the tests can build every gun at
 * every level; guns.ts gives them their materials and finishes.
 *
 * Units are metres at the character's scale: barrel along +z, the pistol grip
 * at the origin. Where the hands, sight, muzzle and butt are is gunfit.ts's
 * (`FIT`): the shapes are drawn round those spots and never move them.
 *
 * - Receivers, stocks, grips and magazines are side outlines with rounded
 *   corners (`fillet()`), extruded across the gun with a bevelled edge
 *   (`side()`); handguards and pumps are rounded sections along the barrel
 *   (`section()`); barrels, muzzle devices, the scope and the revolver's
 *   cylinder are turned (`turned()`, a lathe a profile segment, so every step
 *   keeps a hard edge); trigger guards are tubes along a curve; small parts
 *   are boxes with rounded edges (`rbox()`).
 * - Three levels (`GunDetail`): 2 the first-person gun, which fills the
 *   screen (`buildGun(..., { detail: 2 })` in viewmodel.ts, the lab); 1 the
 *   gun in a figure's hands (yours and other players'); 0 the soldiers'
 *   parade rifle, one shape in the crowd (`rifleGeometry()`): no bevels or
 *   fillets, few sides, the small details left out (`fine()`).
 * - No real-world makes or markings.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { WeaponId } from './combat-sim';
import { FIT, type Fit } from './gunfit';

export type GunDetail = 0 | 1 | 2;
export type Key = 'steel' | 'furniture' | 'accent' | 'ink';
export type Part = [THREE.BufferGeometry, Key];
type P = [number, number];
type P3 = [number, number, number];

/** The level being built (set by `gunParts()` round each gun's builders) */
let Q: GunDetail = 2;
/** Sides of a round thing at this level */
const segs = (n: number) => (Q === 0 ? Math.max(5, Math.round(n / 2)) : Q === 1 ? n : Math.round(n * 1.5));
/** Details only drawn from the middle level up */
const fine = (parts: () => Part[]): Part[] => (Q === 0 ? [] : parts());

/* ---------- Shape helpers ---------- */

const box = (w: number, h: number, d: number, x: number, y: number, z: number, rx = 0) => {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  return g.translate(x, y, z);
};
/** A box with rounded edges (a plain one when small or at the lowest level) */
function rbox(w: number, h: number, d: number, x: number, y: number, z: number, rx = 0, r?: number): THREE.BufferGeometry {
  const m = Math.min(w, h, d);
  if (Q === 0 || m < 0.006) return box(w, h, d, x, y, z, rx);
  const g = new RoundedBoxGeometry(w, h, d, Q === 2 ? 2 : 1, Math.min(r ?? m * 0.25, m * 0.45));
  if (rx) g.rotateX(rx);
  return g.translate(x, y, z);
}

/** An outline with each corner rounded off by up to `r` (quadratic arcs; none at the lowest level) */
export function fillet(pts: P[], r: number, q: GunDetail = Q): P[] {
  const n = q === 0 ? 0 : q === 1 ? 2 : 4;
  const out: P[] = [];
  const push = (p: P) => {
    const l = out[out.length - 1];
    if (!l || Math.hypot(l[0] - p[0], l[1] - p[1]) > 1e-5) out.push(p);
  };
  if (!n || r <= 0) {
    for (const p of pts) push(p);
  } else {
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const a = pts[(i + pts.length - 1) % pts.length];
      const b = pts[(i + 1) % pts.length];
      const la = Math.hypot(a[0] - p[0], a[1] - p[1]);
      const lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
      const d = Math.min(r, la * 0.45, lb * 0.45);
      if (d < 1e-4) {
        push(p);
        continue;
      }
      const s: P = [p[0] + ((a[0] - p[0]) / la) * d, p[1] + ((a[1] - p[1]) / la) * d];
      const e: P = [p[0] + ((b[0] - p[0]) / lb) * d, p[1] + ((b[1] - p[1]) / lb) * d];
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const u = 1 - t;
        push([u * u * s[0] + 2 * u * t * p[0] + t * t * e[0], u * u * s[1] + 2 * u * t * p[1] + t * t * e[1]]);
      }
    }
  }
  const f = out[0];
  const l = out[out.length - 1];
  if (out.length > 3 && Math.hypot(f[0] - l[0], f[1] - l[1]) < 1e-5) out.pop();
  return out;
}

/**
 * An outline moved `d` in from its edges (out where `d` is negative), each point along the bisector of its two
 * edges (mitred, the mitre held to a few times `d` at a sharp corner)
 */
export function inset(pts: P[], d: number): P[] {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    area += x0 * y1 - x1 * y0;
  }
  // Inwards is the left of each edge going round anticlockwise, the right going clockwise
  const s = area > 0 ? 1 : -1;
  return pts.map((p, i) => {
    const a = pts[(i + pts.length - 1) % pts.length];
    const b = pts[(i + 1) % pts.length];
    const n = (u: P, v: P): P => {
      const l = Math.hypot(v[0] - u[0], v[1] - u[1]) || 1;
      return [(-(v[1] - u[1]) / l) * s, ((v[0] - u[0]) / l) * s];
    };
    const n0 = n(a, p);
    const n1 = n(p, b);
    const m: P = [n0[0] + n1[0], n0[1] + n1[1]];
    const ml = Math.hypot(m[0], m[1]) || 1;
    const cos = Math.max(0.35, (m[0] * n0[0] + m[1] * n0[1]) / ml);
    return [p[0] + (m[0] / ml) * (d / cos), p[1] + (m[1] / ml) * (d / cos)];
  });
}

const area = (pts: P[]) => pts.reduce((a, [x0, y0], i) => a + x0 * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * y0, 0) / 2;
function inside(pts: P[], [x, y]: P) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
/** An inset outline still the same way round and at least a third of the area, every grown hole inside it */
export const sound = (outer: P[], out: P[], holes: P[][]) =>
  Math.sign(area(out)) === Math.sign(area(outer)) && Math.abs(area(out)) > Math.abs(area(outer)) / 3 && holes.every((h) => h.every((p) => inside(out, p)));

/** An outline in its own plane extruded `depth` along z, centred on z = 0, its edges bevelled by `bev` */
function extrude(outer: P[], holes: P[][], depth: number, bev: number) {
  let b = Q === 0 ? 0 : Math.min(bev, depth * 0.3);
  // The faces inset by the bevel, so the walls stay on the outline (three's own negative bevelOffset closes holes up);
  // where a wall is too thin for it (the inset turns inside out, or a hole grown by it no longer fits) a finer bevel
  let out = inset(outer, b);
  let hs = holes.map((h) => inset(h, -b));
  while (b > 0 && !sound(outer, out, hs)) {
    b = b > 0.0004 ? b / 2 : 0;
    out = inset(outer, b);
    hs = holes.map((h) => inset(h, -b));
  }
  const shape = new THREE.Shape(out.map(([a, c]) => new THREE.Vector2(a, c)));
  for (const h of hs) shape.holes.push(new THREE.Path(h.map(([a, c]) => new THREE.Vector2(a, c))));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: depth - 2 * b,
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: Q === 2 ? 2 : 1,
    curveSegments: 1,
  });
  return g.translate(0, 0, -(depth / 2 - b));
}
interface Outline {
  /** Across the gun (side outlines) */
  x?: number;
  /** Corner radius */
  r?: number;
  bev?: number;
  holes?: P[][];
}
/** A side outline: points (z, y), extruded `w` across the gun, centred on `x` */
function side(pts: P[], w: number, o: Outline = {}) {
  const r = o.r ?? 0.006;
  const g = extrude(fillet(pts, r), (o.holes ?? []).map((h) => fillet(h, r * 0.5)), w, o.bev ?? Math.min(0.003, w * 0.12));
  return g.rotateY(-Math.PI / 2).translate(o.x ?? 0, 0, 0);
}
/** A section across the gun: points (x, y), extruded `len` along the barrel, centred on z = `zc` */
function section(pts: P[], len: number, zc: number, o: Outline = {}) {
  const r = o.r ?? 0.006;
  return extrude(fillet(pts, r), (o.holes ?? []).map((h) => fillet(h, r * 0.5)), len, o.bev ?? Math.min(0.003, len * 0.12)).translate(0, 0, zc);
}
/** A rectangle's corners (w across, h high, centred on cx, cy), for `section()` */
const rect = (w: number, h: number, cx = 0, cy = 0): P[] => [
  [cx - w / 2, cy - h / 2],
  [cx + w / 2, cy - h / 2],
  [cx + w / 2, cy + h / 2],
  [cx - w / 2, cy + h / 2],
];

/**
 * A turned part along the barrel: a profile of (radius, z), traced from the back to the front (radius 0 caps an
 * end; turning back inwards and back makes a bore), centred on (x, y). Each profile segment is its own lathe, so
 * every step and shoulder keeps a hard edge.
 */
function turned(prof: P[], x = 0, y = 0, n = 12) {
  return lathe(prof, n).rotateX(Math.PI / 2).translate(x, y, 0);
}
/** The same, standing up: a profile of (radius, y) from the bottom up, centred on (x, z) */
function turnedY(prof: P[], x = 0, z = 0, n = 12) {
  return lathe(prof, n).translate(x, 0, z);
}
function lathe(prof: P[], n: number) {
  const s = segs(n);
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i + 1 < prof.length; i++) {
    const [r0, a0] = prof[i];
    const [r1, a1] = prof[i + 1];
    if (Math.abs(r0 - r1) + Math.abs(a0 - a1) < 1e-6 || (r0 < 1e-6 && r1 < 1e-6)) continue;
    parts.push(new THREE.LatheGeometry([new THREE.Vector2(r0, a0), new THREE.Vector2(r1, a1)], s));
  }
  return mergeAll(parts);
}
/** A tube of radius `r` along a smooth curve through the points */
const tube = (pts: P3[], r: number) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z))), segs(12), r, Q === 0 ? 4 : 6, false);
/** A plain rod along z, and one across the gun (along x), and one standing up */
const rod = (r: number, len: number, x: number, y: number, z: number, n = 8) => new THREE.CylinderGeometry(r, r, len, segs(n)).rotateX(Math.PI / 2).translate(x, y, z);
const rodX = (r: number, len: number, x: number, y: number, z: number, n = 10) => new THREE.CylinderGeometry(r, r, len, segs(n)).rotateZ(Math.PI / 2).translate(x, y, z);
const rodY = (r: number, len: number, x: number, y: number, z: number, n = 10) => new THREE.CylinderGeometry(r, r, len, segs(n)).translate(x, y, z);
/** A flat round facing +z (a bore, a chamber) */
const disc = (r: number, x: number, y: number, z: number) => new THREE.CircleGeometry(r, segs(10)).translate(x, y, z);
/** A ring round the z axis */
const ring = (r: number, t: number, x: number, y: number, z: number) => new THREE.TorusGeometry(r, t, Q === 0 ? 4 : 6, segs(16)).translate(x, y, z);

/* ---------- Parts every gun shares ---------- */

/** The pistol grip at the origin, raked back, finger grooves down its front and a beavertail at the top */
const pistolGrip = (): Part[] => [
  [
    side(
      [
        [0.012, 0.004],
        [0.009, -0.018],
        [0.002, -0.03],
        [0.004, -0.044],
        [-0.005, -0.057],
        [-0.004, -0.071],
        [-0.019, -0.098],
        [-0.024, -0.106],
        [-0.074, -0.103],
        [-0.068, -0.088],
        [-0.042, 0.0],
        [-0.05, 0.006],
      ],
      0.038,
      { r: 0.006 }
    ),
    'furniture',
  ],
];
/** The trigger guard (a bent bar from the grip's front to the receiver) and the curved trigger blade */
const trigger = (): Part[] => [
  [
    tube(
      [
        [0, -0.002, 0.01],
        [0, -0.026, 0.02],
        [0, -0.033, 0.046],
        [0, -0.027, 0.074],
        [0, -0.004, 0.082],
      ],
      0.0042
    ),
    'steel',
  ],
  [
    side(
      [
        [0.054, 0.006],
        [0.047, 0.006],
        [0.044, -0.008],
        [0.047, -0.022],
        [0.053, -0.024],
        [0.051, -0.011],
      ],
      0.006,
      { r: 0.002 }
    ),
    'ink',
  ],
];
/** A holo sight whose window is centred at (0, y, z), on a riser from `base`: a hooded frame, its clamp and a brightness knob */
const holo = (y: number, z: number, base: number): Part[] => [
  // (its walls are 4 to 6 mm, so the bevel's finer: the outline's inset and the window's outset mustn't meet)
  [section(rect(0.07, 0.073, 0, y + 0.0025), 0.062, z, { r: 0.01, bev: 0.0012, holes: [rect(0.058, 0.061, 0, y + 0.0005)] }), 'steel'],
  [rbox(0.042, 0.012, 0.074, 0, base, z), 'ink'],
  [rbox(0.032, y - 0.034 - base, 0.052, 0, (base + y - 0.034) / 2, z), 'steel'],
  [rbox(0.026, 0.006, 0.05, 0, y + 0.0395, z), 'accent'],
  ...fine(() => [
    [rodX(0.007, 0.01, 0.039, y - 0.006, z - 0.01), 'ink'],
    [rodX(0.004, 0.008, -0.038, y - 0.006, z + 0.012), 'ink'],
  ]),
];
/** A top rail `len` long centred on z = `zc` at height `y`, with its teeth */
const rail = (len: number, y: number, zc: number): Part[] => {
  const p: Part[] = [[rbox(0.03, 0.01, len, 0, y, zc, 0, 0.002), 'ink']];
  const n = Math.floor(len / 0.024);
  for (let i = 0; i < n; i++) p.push([box(0.034, 0.006, 0.01, 0, y + 0.007, zc - (n - 1) * 0.012 + i * 0.024), 'ink']);
  return p;
};
/** M-LOK style slots down both sides of a handguard */
const slots = (x: number, y: number, zs: number[]): Part[] => fine(() => zs.flatMap((z): Part[] => [[rbox(0.004, 0.01, 0.028, x, y, z), 'ink'], [rbox(0.004, 0.01, 0.028, -x, y, z), 'ink']]));

/* ---------- The guns ---------- */

export interface GunShape extends Fit {
  body: () => Part[];
  /** The magazine (what comes out on a reload: a magazine, the revolver's cylinder, the belt box) */
  mag: () => Part[];
}

const SHAPES: Record<WeaponId, GunShape> = {
  rifle: {
    ...FIT.rifle,
    body: () => [
      // Upper receiver, and the lower with its flared magwell
      [side([[-0.112, 0.03], [0.17, 0.03], [0.17, 0.081], [-0.1, 0.081], [-0.116, 0.07]], 0.056, { r: 0.005 }), 'steel'],
      [side([[-0.1, 0.033], [0.168, 0.033], [0.168, 0.008], [0.158, -0.022], [0.086, -0.024], [0.076, -0.006], [0.03, -0.012], [-0.04, -0.008], [-0.1, 0.008]], 0.05, { r: 0.006 }), 'steel'],
      // Ejection port on the right, the charging handle, the top rail
      [rbox(0.004, 0.02, 0.052, -0.029, 0.057, 0.07), 'ink'],
      [rbox(0.048, 0.01, 0.026, 0, 0.086, -0.1), 'ink'],
      ...rail(0.26, 0.086, 0.06),
      // The handguard's slip ring, the handguard, its slots and an accent stripe down each side
      [turned([[0, 0.168], [0.037, 0.168], [0.038, 0.17], [0.038, 0.18], [0, 0.18]], 0, 0.05, 14), 'steel'],
      [section(rect(0.066, 0.066, 0, 0.05), 0.2, 0.28, { r: 0.015 }), 'furniture'],
      ...slots(0.033, 0.062, [0.22, 0.28, 0.34]),
      [rbox(0.07, 0.01, 0.17, 0, 0.032, 0.28), 'accent'],
      // Gas block with the folding front sight, barrel and the ported muzzle brake
      [rbox(0.03, 0.032, 0.03, 0, 0.06, 0.395), 'steel'],
      [side([[0.385, 0.074], [0.405, 0.074], [0.401, 0.108], [0.391, 0.108]], 0.008, { r: 0.002 }), 'steel'],
      [turned([[0, 0.375], [0.0135, 0.375], [0.0135, 0.476], [0.016, 0.48], [0.018, 0.484], [0.018, 0.528], [0.016, 0.535], [0.0065, 0.535], [0.0065, 0.522], [0, 0.522]], 0, 0.05, 14), 'steel'],
      ...fine(() => [0.496, 0.512].map((z): Part => [rbox(0.04, 0.005, 0.008, 0, 0.05, z), 'ink'])),
      ...pistolGrip(),
      ...trigger(),
      // Selector on the left, the buffer tube and its castle nut, the stock, its lever, an accent stripe, the butt pad
      ...fine(() => [[rbox(0.004, 0.008, 0.02, 0.027, 0.016, -0.004), 'ink']]),
      [turned([[0, -0.215], [0.016, -0.215], [0.016, -0.104], [0.02, -0.104], [0.02, -0.092], [0, -0.092]], 0, 0.05, 12), 'steel'],
      [side([[-0.163, 0.073], [-0.163, 0.03], [-0.316, -0.022], [-0.316, 0.08], [-0.25, 0.084]], 0.05, { r: 0.01 }), 'furniture'],
      ...fine(() => [[rbox(0.012, 0.008, 0.03, 0, 0.02, -0.19), 'ink']]),
      [rbox(0.054, 0.008, 0.12, 0, 0.005, -0.245, -0.33), 'accent'],
      [rbox(0.054, 0.106, 0.02, 0, 0.03, -0.325), 'ink'],
      // Holo sight on a riser, so the stock stays out of the way when aiming
      ...holo(0.152, 0.075, 0.098),
    ],
    // A curved magazine, its base plate
    mag: () => [
      [side([[0.093, 0.012], [0.152, 0.012], [0.157, -0.04], [0.172, -0.09], [0.188, -0.125], [0.128, -0.14], [0.112, -0.1], [0.098, -0.05]], 0.034, { r: 0.008 }), 'steel'],
      [rbox(0.04, 0.012, 0.066, 0, -0.137, 0.158, -0.245), 'accent'],
      ...fine(() => [[rbox(0.036, 0.004, 0.034, 0, -0.03, 0.127, -0.12), 'ink']]),
    ],
  },
  smg: {
    ...FIT.smg,
    body: () => [
      // Receiver and its lower, the top rail
      [side([[-0.082, 0.018], [0.16, 0.018], [0.16, 0.076], [-0.06, 0.076], [-0.082, 0.058]], 0.05, { r: 0.008 }), 'steel'],
      [side([[-0.07, 0.022], [0.13, 0.022], [0.13, 0.0], [0.118, -0.018], [0.06, -0.018], [0.05, -0.006], [-0.03, -0.008], [-0.07, 0.006]], 0.044, { r: 0.006 }), 'steel'],
      ...rail(0.2, 0.081, 0.04),
      // Barrel shroud with its vents and a stripe, the short barrel and its cap
      [section(rect(0.056, 0.052, 0, 0.05), 0.1, 0.21, { r: 0.017 }), 'furniture'],
      ...fine(() => [0.185, 0.21, 0.235].flatMap((z): Part[] => [[rbox(0.004, 0.012, 0.012, 0.027, 0.06, z), 'ink'], [rbox(0.004, 0.012, 0.012, -0.027, 0.06, z), 'ink']])),
      [rbox(0.06, 0.008, 0.08, 0, 0.034, 0.21), 'accent'],
      [turned([[0, 0.255], [0.012, 0.255], [0.012, 0.33], [0.0155, 0.333], [0.0155, 0.365], [0.005, 0.365], [0.005, 0.356], [0, 0.356]], 0, 0.05, 12), 'steel'],
      // The vertical foregrip with its finger grooves
      [turnedY([[0, -0.074], [0.017, -0.074], [0.017, -0.068], [0.0155, -0.062], [0.0135, -0.05], [0.0155, -0.035], [0.0135, -0.02], [0.015, -0.005], [0.014, 0.03], [0, 0.03]], 0, 0.2, 12), 'furniture'],
      ...pistolGrip(),
      ...trigger(),
      // Charging knob on the left, the folding wire stock and its butt plate
      ...fine(() => [[rodX(0.006, 0.012, 0.03, 0.06, 0.1), 'ink']]),
      [rod(0.004, 0.2, 0.02, 0.045, -0.17), 'steel'],
      [rod(0.004, 0.2, -0.02, 0.045, -0.17), 'steel'],
      [rod(0.004, 0.17, 0.02, 0.0, -0.16), 'steel'],
      [rod(0.004, 0.17, -0.02, 0.0, -0.16), 'steel'],
      [rbox(0.05, 0.075, 0.014, 0, 0.022, -0.272, 0, 0.006), 'ink'],
      // A small holo sight
      ...holo(0.13, 0.03, 0.087),
    ],
    mag: () => [
      [side([[0.064, 0.012], [0.104, 0.012], [0.116, -0.133], [0.076, -0.133]], 0.03, { r: 0.006 }), 'steel'],
      [rbox(0.036, 0.012, 0.046, 0, -0.135, 0.096), 'accent'],
    ],
  },
  shotgun: {
    ...FIT.shotgun,
    body: () => {
      const p: Part[] = [
        // Receiver with its loading port underneath
        [side([[-0.07, 0.012], [0.13, 0.006], [0.13, 0.084], [0.0, 0.086], [-0.07, 0.064]], 0.052, { r: 0.008 }), 'steel'],
        [rbox(0.03, 0.004, 0.07, 0, 0.005, 0.085), 'ink'],
        // Barrel with its vent rib and bead, the magazine tube and its cap, the clamp joining them
        [turned([[0, 0.12], [0.017, 0.12], [0.017, 0.545], [0.0125, 0.545], [0.0125, 0.535], [0, 0.535]], 0, 0.066, 14), 'steel'],
        [rbox(0.012, 0.006, 0.4, 0, 0.085, 0.335), 'ink'],
        [new THREE.SphereGeometry(0.0055, segs(8), segs(6)).translate(0, 0.093, 0.53), 'accent'],
        [turned([[0, 0.12], [0.014, 0.12], [0.014, 0.43], [0.0155, 0.432], [0.0155, 0.452], [0.012, 0.456], [0, 0.456]], 0, 0.03, 12), 'steel'],
        [section(rect(0.026, 0.068, 0, 0.048), 0.016, 0.44, { r: 0.008 }), 'steel'],
        // The pump, grooved round
        [section(rect(0.054, 0.048, 0, 0.03), 0.14, 0.3, { r: 0.017 }), 'furniture'],
        ...pistolGrip(),
        ...trigger(),
        // Stock and butt pad
        [side([[-0.065, 0.074], [-0.065, 0.014], [-0.12, -0.004], [-0.296, -0.036], [-0.296, 0.05], [-0.2, 0.062]], 0.048, { r: 0.012 }), 'furniture'],
        [rbox(0.05, 0.09, 0.02, 0, 0.007, -0.305), 'ink'],
        // Ghost-ring rear sight on its post
        [ring(0.014, 0.0045, 0, 0.1, 0), 'steel'],
        [rbox(0.024, 0.012, 0.012, 0, 0.087, 0), 'steel'],
        // The side saddle and its spare shells
        [rbox(0.012, 0.034, 0.1, 0.031, 0.045, 0.03), 'ink'],
      ];
      for (let k = 0; k < 4; k++) {
        const z = -0.006 + k * 0.024;
        p.push([rodY(0.0075, 0.028, 0.039, 0.047, z), 'accent']);
        p.push([rodY(0.008, 0.006, 0.039, 0.031, z), 'steel']);
      }
      p.push(...fine(() => [0.255, 0.275, 0.295, 0.315, 0.335].map((z): Part => [section(rect(0.057, 0.051, 0, 0.03), 0.006, z, { r: 0.018, bev: 0.001 }), 'ink'])));
      return p;
    },
    // The loading gate under the port
    mag: () => [[rbox(0.028, 0.006, 0.066, 0, 0.0, 0.088), 'steel']],
  },
  dmr: {
    ...FIT.dmr,
    body: () => [
      // Long upper receiver, the lower, the ejection port, the top rail
      [side([[-0.13, 0.028], [0.24, 0.028], [0.24, 0.078], [-0.12, 0.078], [-0.134, 0.066]], 0.058, { r: 0.005 }), 'steel'],
      [side([[-0.12, 0.031], [0.15, 0.031], [0.15, 0.008], [0.14, -0.022], [0.086, -0.024], [0.076, -0.006], [0.03, -0.012], [-0.04, -0.008], [-0.12, 0.008]], 0.05, { r: 0.006 }), 'steel'],
      [rbox(0.004, 0.02, 0.056, -0.03, 0.054, 0.08), 'ink'],
      ...rail(0.34, 0.083, 0.06),
      // The long handguard, its slots and stripe, the barrel and its brake
      [section(rect(0.062, 0.062, 0, 0.05), 0.28, 0.38, { r: 0.019 }), 'furniture'],
      ...slots(0.031, 0.056, [0.3, 0.36, 0.42, 0.48]),
      [rbox(0.066, 0.01, 0.24, 0, 0.03, 0.38), 'accent'],
      [turned([[0, 0.5], [0.0135, 0.5], [0.0135, 0.715], [0.017, 0.72], [0.019, 0.724], [0.019, 0.772], [0.017, 0.78], [0.007, 0.78], [0.007, 0.768], [0, 0.768]], 0, 0.05, 14), 'steel'],
      ...fine(() => [0.737, 0.755].map((z): Part => [rbox(0.042, 0.006, 0.01, 0, 0.05, z), 'ink'])),
      ...pistolGrip(),
      ...trigger(),
      // Buffer, the precision stock, its adjustable cheek piece on two posts, the butt pad
      [turned([[0, -0.2], [0.017, -0.2], [0.017, -0.12], [0, -0.12]], 0, 0.05, 12), 'steel'],
      [side([[-0.17, 0.074], [-0.17, 0.025], [-0.22, 0.004], [-0.335, -0.03], [-0.335, 0.08], [-0.25, 0.084]], 0.05, { r: 0.01 }), 'furniture'],
      [rbox(0.034, 0.024, 0.12, 0, 0.098, -0.215), 'furniture'],
      ...fine(() => [-0.25, -0.18].map((z): Part => [rodY(0.004, 0.02, 0, 0.084, z), 'ink'])),
      [rbox(0.054, 0.112, 0.02, 0, 0.026, -0.345), 'ink'],
      // Folded bipod under the handguard
      [rbox(0.04, 0.016, 0.024, 0, 0.016, 0.505), 'steel'],
      [rod(0.004, 0.18, 0.018, 0.012, 0.42), 'steel'],
      [rod(0.004, 0.18, -0.018, 0.012, 0.42), 'steel'],
      // Scope: the rings on their bases, the tube with its eyepiece and objective bells, the turrets
      ...[-0.02, 0.15].flatMap((z): Part[] => [[rbox(0.03, 0.026, 0.02, 0, 0.096, z), 'ink'], [ring(0.0235, 0.0045, 0, 0.13, z), 'ink']]),
      [turned([[0.025, -0.107], [0.028, -0.104], [0.028, -0.062], [0.021, -0.045], [0.021, 0.16], [0.026, 0.178], [0.031, 0.205], [0.031, 0.238], [0.029, 0.242]], 0, 0.13, 18), 'steel'],
      [turnedY([[0, 0.148], [0.012, 0.148], [0.012, 0.166], [0.013, 0.168], [0.013, 0.176], [0, 0.176]], 0, 0.06, 12), 'accent'],
      [rodX(0.012, 0.022, 0.03, 0.13, 0.06, 12), 'accent'],
      ...fine(() => [[ring(0.0305, 0.002, 0, 0.13, 0.24), 'ink']]),
    ],
    mag: () => [
      [side([[0.098, 0.012], [0.158, 0.012], [0.162, -0.078], [0.104, -0.084]], 0.034, { r: 0.006 }), 'steel'],
      [rbox(0.04, 0.012, 0.064, 0, -0.082, 0.133, -0.103), 'accent'],
    ],
  },
  revolver: {
    ...FIT.revolver,
    // The Hand Cannon: a frame round the cylinder's window, a long round barrel with a full lug and a vented rib,
    // a hammer, wooden grip panels over the grip frame, iron sights and a lanyard ring. Both hands on the grip.
    body: () => {
      const p: Part[] = [
        [side([[-0.056, 0.0], [-0.05, 0.074], [-0.034, 0.09], [0.1, 0.09], [0.106, 0.084], [0.106, 0.012], [0.09, 0.0]], 0.034, { r: 0.006, holes: [[[0.008, 0.016], [0.082, 0.016], [0.082, 0.084], [0.008, 0.084]]] }), 'steel'],
        // The round barrel (bored at the muzzle), the full-length lug under it, the rib on top and its front blade
        [turned([[0, 0.1], [0.016, 0.1], [0.016, 0.341], [0.0145, 0.35], [0.0075, 0.35], [0.0075, 0.338], [0, 0.338]], 0, 0.055, 16), 'steel'],
        [side([[0.104, 0.05], [0.3, 0.048], [0.31, 0.04], [0.31, 0.026], [0.3, 0.021], [0.12, 0.019], [0.104, 0.03]], 0.022, { r: 0.006 }), 'steel'],
        [rbox(0.012, 0.009, 0.24, 0, 0.0745, 0.22), 'steel'],
        [side([[0.315, 0.076], [0.338, 0.076], [0.338, 0.094], [0.33, 0.094]], 0.006, { r: 0.002 }), 'ink'],
        [rbox(0.008, 0.014, 0.008, 0.009, 0.094, -0.04), 'ink'],
        [rbox(0.008, 0.014, 0.008, -0.009, 0.094, -0.04), 'ink'],
        [side([[-0.044, 0.07], [-0.032, 0.07], [-0.038, 0.092], [-0.05, 0.104], [-0.062, 0.104], [-0.052, 0.094]], 0.01, { r: 0.003 }), 'ink'],
        // The grip frame under the wooden panels, and the panels
        [side([[0.002, 0.006], [-0.054, 0.006], [-0.066, -0.05], [-0.074, -0.103], [-0.024, -0.112], [-0.014, -0.06], [-0.001, -0.02]], 0.036, { r: 0.012 }), 'steel'],
        [side([[0.0, 0.004], [-0.05, 0.004], [-0.062, -0.05], [-0.07, -0.1], [-0.026, -0.108], [-0.016, -0.06], [-0.004, -0.02]], 0.05, { r: 0.012 }), 'accent'],
        ...trigger(),
        // The lanyard ring under the butt
        [new THREE.TorusGeometry(0.009, 0.0025, 6, 14).rotateY(Math.PI / 2).translate(0, -0.113, -0.06), 'steel'],
      ];
      p.push(
        ...fine(() => [
          // The rib's vents, the grip screw, the cylinder release
          ...[0.14, 0.18, 0.22, 0.26, 0.3].map((z): Part => [rbox(0.013, 0.004, 0.012, 0, 0.0785, z), 'ink']),
          [rodX(0.004, 0.052, 0, -0.055, -0.035), 'steel'] as Part,
          [rbox(0.004, 0.01, 0.016, 0.018, 0.06, -0.016), 'steel'] as Part,
        ])
      );
      return p;
    },
    // The cylinder on its crane: fluted, its chambers at the front, the ejector rod's head; it swings out and drops on a reload
    mag: () => {
      const p: Part[] = [
        [turned([[0, 0.011], [0.026, 0.011], [0.03, 0.015], [0.03, 0.075], [0.026, 0.079], [0, 0.079]], 0, 0.05, 16), 'steel'],
        [turned([[0, 0.079], [0.006, 0.079], [0.006, 0.09], [0, 0.09]], 0, 0.05, 8), 'steel'],
        [rbox(0.012, 0.02, 0.05, 0.022, 0.028, 0.045), 'steel'],
      ];
      for (let i = 0; i < 6; i++) {
        const a = ((i + 0.5) / 6) * Math.PI * 2;
        p.push([new THREE.BoxGeometry(0.006, 0.008, 0.044).rotateZ(a).translate(Math.cos(a) * 0.0285, 0.05 + Math.sin(a) * 0.0285, 0.045), 'ink']);
      }
      p.push(...fine(() => Array.from({ length: 6 }, (_, i): Part => [disc(0.0055, Math.cos((i / 6) * Math.PI * 2) * 0.017, 0.05 + Math.sin((i / 6) * Math.PI * 2) * 0.017, 0.0805), 'ink'])));
      return p;
    },
  },
  burst: {
    ...FIT.burst,
    // The Tri-Tap: a compact bullpup carbine (the magazine behind the grip), a carry
    // handle with the holo sight on it, a short barrel with a flash hider, accent stripes.
    body: () => [
      // One long polymer body (stock, receiver and magwell) with the butt pad, and the handguard ahead of it
      [side([[-0.215, 0.004], [-0.172, 0.004], [-0.166, -0.014], [-0.09, -0.014], [-0.084, 0.004], [-0.052, 0.008], [0.12, 0.01], [0.12, 0.08], [-0.06, 0.086], [-0.215, 0.084]], 0.054, { r: 0.01 }), 'furniture'],
      [rbox(0.058, 0.092, 0.016, 0, 0.042, -0.215), 'ink'],
      [section(rect(0.05, 0.05, 0, 0.045), 0.1, 0.17, { r: 0.015 }), 'furniture'],
      ...slots(0.025, 0.05, [0.15, 0.19]),
      // Accent stripes down each side, the cheek rest
      [rbox(0.0575, 0.008, 0.3, 0, 0.028, -0.03), 'accent'],
      [rbox(0.0575, 0.006, 0.18, 0, 0.066, 0.02), 'accent'],
      [rbox(0.03, 0.016, 0.12, 0, 0.09, -0.13), 'furniture'],
      // Ejection port on the right, charging handle
      [rbox(0.004, 0.018, 0.045, -0.028, 0.056, -0.06), 'ink'],
      [rbox(0.014, 0.01, 0.028, 0.03, 0.084, 0.02), 'ink'],
      // Short barrel and the slotted flash hider
      [turned([[0, 0.21], [0.012, 0.21], [0.012, 0.28], [0.017, 0.282], [0.017, 0.32], [0.008, 0.32], [0.008, 0.31], [0, 0.31]], 0, 0.05, 12), 'steel'],
      [box(0.005, 0.038, 0.03, 0, 0.05, 0.302), 'ink'],
      [box(0.038, 0.005, 0.03, 0, 0.05, 0.302), 'ink'],
      // Carry handle (two legs and the bar, open between), with the holo sight on top
      [side([[-0.115, 0.08], [0.115, 0.08], [0.115, 0.1], [0.125, 0.106], [0.125, 0.118], [-0.125, 0.118], [-0.125, 0.106], [-0.115, 0.1]], 0.028, { r: 0.006, holes: [[[-0.09, 0.09], [0.09, 0.09], [0.09, 0.103], [-0.09, 0.103]]] }), 'steel'],
      ...pistolGrip(),
      ...trigger(),
      ...holo(0.172, 0.0, 0.118),
    ],
    mag: () => [
      [side([[-0.158, 0.006], [-0.104, 0.006], [-0.11, -0.08], [-0.158, -0.088]], 0.034, { r: 0.006 }), 'steel'],
      [rbox(0.04, 0.012, 0.058, 0, -0.086, -0.134, -0.165), 'accent'],
    ],
  },
  lmg: {
    ...FIT.lmg,
    // The Belt Feeder: a long receiver under a top cover, the belt box hanging under it,
    // a heavy finned barrel with the bipod folded back under it, a stock.
    body: () => {
      const p: Part[] = [
        // Receiver and its lower, the top cover with its latch, the feed tray's lip on the left
        [side([[-0.16, 0.027], [0.2, 0.027], [0.2, 0.089], [-0.15, 0.089], [-0.165, 0.076]], 0.058, { r: 0.006 }), 'steel'],
        [side([[-0.1, 0.03], [0.1, 0.03], [0.1, 0.004], [0.06, -0.008], [-0.1, -0.004]], 0.05, { r: 0.006 }), 'steel'],
        [side([[-0.15, 0.087], [0.18, 0.087], [0.18, 0.098], [0.165, 0.105], [-0.12, 0.105], [-0.15, 0.098]], 0.064, { r: 0.005 }), 'ink'],
        [rbox(0.024, 0.008, 0.03, 0, 0.108, 0.15), 'accent'],
        [rbox(0.018, 0.026, 0.1, -0.036, 0.075, 0.06), 'steel'],
        // Handguard with a stripe, the carry handle folded along its left side, the gas tube under the barrel
        [section(rect(0.06, 0.05, 0, 0.045), 0.12, 0.26, { r: 0.014 }), 'furniture'],
        [rbox(0.064, 0.01, 0.1, 0, 0.03, 0.26), 'accent'],
        [side([[0.2, 0.06], [0.32, 0.06], [0.31, 0.086], [0.21, 0.086]], 0.012, { x: -0.036, r: 0.004 }), 'furniture'],
        [turned([[0, 0.3], [0.009, 0.3], [0.009, 0.53], [0, 0.53]], 0, 0.03, 10), 'steel'],
        // Heavy barrel, its cooling fins and the slotted muzzle booster
        [turned([[0, 0.3], [0.015, 0.3], [0.015, 0.58], [0.018, 0.58], [0.02, 0.585], [0.02, 0.625], [0.018, 0.63], [0.008, 0.63], [0.008, 0.62], [0, 0.62]], 0, 0.058, 14), 'steel'],
        [rbox(0.042, 0.008, 0.012, 0, 0.058, 0.605), 'ink'],
        // Front sight post
        [side([[0.55, 0.078], [0.575, 0.078], [0.568, 0.112], [0.558, 0.112]], 0.008, { r: 0.002 }), 'ink'],
        // Bipod folded back under the barrel: the hinge block, two legs and their feet
        [rbox(0.036, 0.02, 0.03, 0, 0.03, 0.5), 'steel'],
        [rod(0.0045, 0.2, 0.019, 0.02, 0.4), 'steel'],
        [rod(0.0045, 0.2, -0.019, 0.02, 0.4), 'steel'],
        [rbox(0.014, 0.012, 0.018, 0.019, 0.02, 0.3), 'ink'],
        [rbox(0.014, 0.012, 0.018, -0.019, 0.02, 0.3), 'ink'],
        ...pistolGrip(),
        ...trigger(),
        // Buffer, stock with its cheek rise, butt pad
        [rbox(0.04, 0.046, 0.05, 0, 0.05, -0.185), 'steel'],
        [side([[-0.208, 0.074], [-0.208, 0.028], [-0.36, -0.02], [-0.36, 0.078], [-0.29, 0.084]], 0.05, { r: 0.01 }), 'furniture'],
        [rbox(0.054, 0.104, 0.02, 0, 0.03, -0.36), 'ink'],
        // The rear sight at the back of the cover
        [rbox(0.03, 0.014, 0.014, 0, 0.112, -0.12), 'ink'],
      ];
      for (let i = 0; i < 7; i++) {
        const z = 0.34 + i * 0.03;
        p.push([turned([[0.015, z], [0.021, z], [0.021, z + 0.008], [0.015, z + 0.008]], 0, 0.058, 12), 'ink']);
      }
      return p;
    },
    // The belt box under the receiver, its lid line and band, and the belt's links climbing into the feed tray
    mag: () => [
      [rbox(0.05, 0.08, 0.11, 0, 0.0, 0.14, 0, 0.008), 'steel'],
      [rbox(0.054, 0.012, 0.114, 0, -0.03, 0.14), 'accent'],
      ...fine(() => [[rbox(0.0515, 0.004, 0.112, 0, 0.034, 0.14), 'ink'] as Part]),
      ...[0.04, 0.052, 0.064].map((y): Part => [rbox(0.012, 0.011, 0.03, -0.031, y, 0.12), 'accent']),
    ],
  },
};

/** Where shots leave each gun, its sight and where the hands go (gunfit.ts's numbers), with its builders */
export const gunShape = (id: WeaponId) => SHAPES[id];

/** A gun's parts at a level: the body, and the magazine apart (it comes out on a reload) */
export function gunParts(id: WeaponId, q: GunDetail): { body: Part[]; mag: Part[] } {
  const was = Q;
  Q = q;
  try {
    return { body: SHAPES[id].body(), mag: SHAPES[id].mag() };
  } finally {
    Q = was;
  }
}

/* ---------- Merging ---------- */

const clean = (g: THREE.BufferGeometry) => {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
  return n;
};
/** Geometries as one (position, normal and uv; no index) */
export function mergeAll(geos: THREE.BufferGeometry[]) {
  const list = geos.map(clean);
  const out = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv'] as const) {
    const total = list.reduce((a, g) => a + g.attributes[k].array.length, 0);
    const arr = new Float32Array(total);
    let o = 0;
    for (const g of list) {
      arr.set(g.attributes[k].array as Float32Array, o);
      o += g.attributes[k].array.length;
    }
    out.setAttribute(k, new THREE.BufferAttribute(arr, k === 'uv' ? 2 : 3));
  }
  return out;
}
/**
 * Parts merged by key. The accent's uv runs along each part's length (the neon finish's gradient goes front to
 * back, whatever uv the shape came with).
 */
export function byKey(parts: Part[]) {
  const out = new Map<Key, THREE.BufferGeometry>();
  for (const k of ['steel', 'furniture', 'accent', 'ink'] as Key[]) {
    const g = parts.filter(([, pk]) => pk === k).map(([g]) => (k === 'accent' ? alongZ(clean(g)) : g));
    if (g.length) out.set(k, mergeAll(g));
  }
  return out;
}
function alongZ(g: THREE.BufferGeometry) {
  const p = g.attributes.position;
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < p.count; i++) {
    lo = Math.min(lo, p.getZ(i));
    hi = Math.max(hi, p.getZ(i));
  }
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = hi - lo > 1e-6 ? (p.getZ(i) - lo) / (hi - lo) : 0.5;
    uv[i * 2 + 1] = 0.5;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/** The assault rifle as one shape at the lowest level (instanced crowds: the soldiers carry it, the Armoury's counter shows it) */
export function rifleGeometry() {
  const { body, mag } = gunParts('rifle', 0);
  return mergeAll([...body, ...mag].map(([g]) => g));
}
