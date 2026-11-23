/*
 * Riverside Raceway's venue drawn (docs/kart-harbour-plan.md, Phase 4), behind `?karts=new`: registered with the
 * track's district (kartgrounds2-3d.ts `register()`), as sites. The numbers are kartvenue2.ts.
 *
 * 4a, the workshops and the tyre store: the concrete apron; the tuning shed (clad walls, a roof over its open front,
 * the club's fascia, roller doors half up, strip lights; inside, benches with vices under the tool walls, karts up on
 * stands and one on a trolley, the engine rack, the parts counter and its shelves); the tyre store (racks of tyres,
 * the fitting machine); the loose stacks of tyres round them and along the pit lane. The insides are near only.
 */
import * as THREE from 'three';
import { Batch, neon, toon } from './kit';
import { site } from './tilework';
import { SITE2 } from './kartcircuit2';
import {
  APRON2,
  BENCHES2,
  BRIEF_BENCHES2,
  CABIN2,
  CANOPY_POSTS2,
  CLUB,
  DESK2,
  HELMET_RACK2,
  HIRE_CANOPY2,
  HIRE_KARTS2,
  SCREEN2,
  COUNTER2,
  ENGINE_RACK2,
  FITTER2,
  PARTS_SHELF2,
  RACKS2,
  RACK_SHELVES,
  STACKS2,
  STANDS2,
  TYRE2,
  TYRESTORE2,
  WALL,
  WORKSHOP2,
  W2,
  type URect,
} from './kartvenue2';
import { COVER } from './palette';

const PAVING = 0.025;
const FLOOR = 0.045;

const CONCRETE = toon(COVER.concrete);
const FLOOR_C = toon('#5a5674');
const CLAD = toon('#6a6e8c');
const CLAD_DARK = toon('#4d5070');
const ROOF = toon('#34304a');
const STEEL = toon('#2b2a40');
const INK = toon(CLUB.ink);
const CLUB_A = toon(CLUB.a);
const CLUB_B = toon(CLUB.b);
const SHUTTER = toon('#8f93ad');
const WOOD = toon('#a9825a');
const PEG = toon('#c9b48a');
const TYRE = toon('#17151f');
const WHITE = toon('#e8e6f0');
const ENGINE = toon('#4a4a5c');
const PARTS = ['#e23b3b', '#ffd23f', '#2aabee', '#1fbf6b'].map((c) => toon(c));
const LIGHT = neon('#f4f1ff', 0.5, 1.1);
const HIRE = toon('#ffd23f');
const GLASS = toon('#9fd3ff');
const SCREEN_C = toon('#14122a');
const SCREEN_LINE = neon('#4fd6ff', 0.6, 1.2);
const PAINT = toon('#e8e4f8');

const unitCyl = (r: number, h: number, seg = 10) => new THREE.CylinderGeometry(r, r, h, seg);

/** A box from a site-frame rect, `y0` up to `y1` */
function boxU(b: Batch, r: URect, y0: number, y1: number, mat: THREE.Material) {
  const [x0, z0] = W2(r.u0, r.v0);
  b.box(x0, y0, z0, r.u1 - r.u0, y1 - y0, r.v1 - r.v0, mat);
}
/** A flat rectangle on the ground from a site-frame rect, in pieces no longer than `len` */
function flatU(b: Batch, r: URect, y: number, mat: THREE.Material, len = 14) {
  const nu = Math.max(1, Math.ceil((r.u1 - r.u0) / len));
  const nv = Math.max(1, Math.ceil((r.v1 - r.v0) / len));
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      const [a0, a1] = [r.u0 + ((r.u1 - r.u0) * i) / nu, r.u0 + ((r.u1 - r.u0) * (i + 1)) / nu];
      const [c0, c1] = [r.v0 + ((r.v1 - r.v0) * j) / nv, r.v0 + ((r.v1 - r.v0) * (j + 1)) / nv];
      const [x, z] = W2((a0 + a1) / 2, (c0 + c1) / 2);
      b.add(new THREE.PlaneGeometry(a1 - a0, c1 - c0).rotateX(-Math.PI / 2).translate(x, y, z), mat);
    }
}

/** A tyre lying flat, its middle at u, v, its bottom at y */
const flatTyre = (b: Batch, u: number, v: number, y: number, mat: THREE.Material) => {
  const [x, z] = W2(u, v);
  b.add(unitCyl(TYRE2.r, TYRE2.h).translate(x, y + TYRE2.h / 2, z), mat);
};

/** A shed: clad walls (back and sides), the roof with its overhang over the open front, the fascia, posts, roller doors, the floor, lights */
function shed(b: Batch, s: { u0: number; v0: number; u1: number; v1: number; h: number }, bays: number, fascia: THREE.Material) {
  flatU(b, { u0: s.u0, v0: s.v0, u1: s.u1, v1: s.v1 }, FLOOR, FLOOR_C);
  boxU(b, { u0: s.u0, v0: s.v1 - WALL, u1: s.u1, v1: s.v1 }, 0, s.h, CLAD);
  boxU(b, { u0: s.u0, v0: s.v0, u1: s.u0 + WALL, v1: s.v1 }, 0, s.h, CLAD);
  boxU(b, { u0: s.u1 - WALL, v0: s.v0, u1: s.u1, v1: s.v1 }, 0, s.h, CLAD);
  // (a darker plinth along the walls' foot)
  boxU(b, { u0: s.u0 - 0.02, v0: s.v1 - WALL - 0.02, u1: s.u1 + 0.02, v1: s.v1 + 0.02 }, 0, 0.5, CLAD_DARK);
  // The roof, over the front by a little, and the fascia along its front in the club's colour
  boxU(b, { u0: s.u0 - 0.3, v0: s.v0 - 1.2, u1: s.u1 + 0.3, v1: s.v1 + 0.3 }, s.h, s.h + 0.25, ROOF);
  boxU(b, { u0: s.u0 - 0.3, v0: s.v0 - 1.25, u1: s.u1 + 0.3, v1: s.v0 - 1.15 }, s.h - 0.55, s.h + 0.25, fascia);
  // The lintel over the front, the posts between the bays, a roller door half up in each
  boxU(b, { u0: s.u0, v0: s.v0, u1: s.u1, v1: s.v0 + 0.3 }, s.h - 0.9, s.h, CLAD);
  const w = (s.u1 - s.u0) / bays;
  for (let k = 1; k < bays; k++) {
    const u = s.u0 + k * w;
    boxU(b, { u0: u - 0.18, v0: s.v0, u1: u + 0.18, v1: s.v0 + 0.36 }, 0, s.h, STEEL);
  }
  for (let k = 0; k < bays; k++) {
    const [a, c] = [s.u0 + k * w + (k ? 0.18 : WALL), s.u0 + (k + 1) * w - (k < bays - 1 ? 0.18 : WALL)];
    boxU(b, { u0: a, v0: s.v0 + 0.05, u1: c, v1: s.v0 + 0.2 }, s.h - 2.1, s.h - 0.9, SHUTTER);
    // (its ribs)
    for (let y = s.h - 2.0; y < s.h - 0.95; y += 0.2) boxU(b, { u0: a, v0: s.v0 + 0.02, u1: c, v1: s.v0 + 0.05 }, y, y + 0.04, CLAD_DARK);
    // A strip light under the roof down the bay's middle
    const m = (a + c) / 2;
    boxU(b, { u0: m - 0.06, v0: s.v0 + 1.2, u1: m + 0.06, v1: s.v1 - 1.2 }, s.h - 0.12, s.h - 0.04, LIGHT);
  }
}

/** A kart up on a stand (or a trolley), its paint the club's */
function kartUp(b: Batch, u: number, v: number, ry: number, paint: THREE.Material, trolley: boolean) {
  const [x, z] = W2(u, v);
  const at = (g: THREE.BufferGeometry) => g.rotateY(ry).translate(x, 0, z);
  const lift = trolley ? 0.32 : 0.55;
  if (trolley) {
    b.add(at(new THREE.BoxGeometry(1.1, 0.06, 0.6).translate(0, 0.26, 0)), STEEL);
    for (const [a, d] of [
      [-0.45, 0.25],
      [-0.45, -0.25],
      [0.45, 0.25],
      [0.45, -0.25],
    ])
      b.add(at(unitCyl(0.08, 0.05, 8).rotateX(Math.PI / 2).translate(a, 0.08, d)), INK);
    b.add(at(new THREE.BoxGeometry(0.05, 0.7, 0.05).translate(-0.6, 0.6, 0)), STEEL);
  } else b.add(at(new THREE.BoxGeometry(0.9, lift, 0.5).translate(0, lift / 2, 0)), STEEL);
  const y = lift - 0.1;
  b.add(at(new THREE.BoxGeometry(1.2, 0.08, 0.7).translate(0, y + 0.1, 0)), paint);
  b.add(at(new THREE.BoxGeometry(0.3, 0.32, 0.4).translate(-0.18, y + 0.28, 0)), INK);
  b.add(at(new THREE.BoxGeometry(0.3, 0.12, 0.6).translate(0.48, y + 0.18, 0)), paint);
  b.add(at(unitCyl(0.12, 0.03, 8).rotateZ(1.1).translate(0.18, y + 0.38, 0)), INK);
  for (const [a, d] of [
    [-0.42, 0.4],
    [-0.42, -0.4],
    [0.42, 0.4],
    [0.42, -0.4],
  ])
    b.add(at(unitCyl(0.17, 0.16, 8).rotateX(Math.PI / 2).translate(a, y + 0.2, d)), TYRE);
}

/** The tuning shed's insides: benches with vices, the tool walls, the karts, the engine rack, the counter and its shelves */
function workshopInside(b: Batch) {
  for (const bench of BENCHES2) {
    boxU(b, bench, 0, 0.88, STEEL);
    boxU(b, { u0: bench.u0 - 0.03, v0: bench.v0 - 0.03, u1: bench.u1 + 0.03, v1: bench.v1 }, 0.88, 0.96, WOOD);
    for (let u = bench.u0 + 0.6; u < bench.u1 - 0.3; u += 2.2) boxU(b, { u0: u, v0: bench.v0 + 0.05, u1: u + 0.3, v1: bench.v0 + 0.35 }, 0.96, 1.18, INK);
    // The tool wall over it: a pegboard, spanners and hammers hung on it
    const back = WORKSHOP2.v1 - WALL - 0.03;
    boxU(b, { u0: bench.u0, v0: back - 0.02, u1: bench.u1, v1: back }, 1.25, 2.55, PEG);
    for (let u = bench.u0 + 0.25; u < bench.u1 - 0.15; u += 0.32) {
      const tall = 0.35 + ((u * 7) % 3) * 0.12;
      boxU(b, { u0: u, v0: back - 0.05, u1: u + 0.05, v1: back - 0.02 }, 2.2 - tall, 2.2, INK);
    }
  }
  STANDS2.forEach((s, i) => kartUp(b, s.u, s.v, s.ry, i % 2 ? CLUB_B : CLUB_A, s.trolley));
  // The engine rack: posts, three shelves, engines on them
  const r = ENGINE_RACK2;
  for (const v of [r.v0, r.v1 - 0.06]) boxU(b, { u0: r.u0, v0: v, u1: r.u1, v1: v + 0.06 }, 0, 1.9, STEEL);
  for (const y of [0.35, 1.0, 1.65]) {
    boxU(b, { ...r, v1: r.v1 }, y, y + 0.05, STEEL);
    for (let v = r.v0 + 0.4; v < r.v1 - 0.4; v += 1.1) boxU(b, { u0: r.u0 + 0.12, v0: v, u1: r.u1 - 0.1, v1: v + 0.55 }, y + 0.05, y + 0.42, ENGINE);
  }
  // The parts counter, and its shelves of boxes behind it
  boxU(b, COUNTER2, 0, 1.0, CLAD_DARK);
  boxU(b, { u0: COUNTER2.u0 - 0.05, v0: COUNTER2.v0 - 0.05, u1: COUNTER2.u1 + 0.05, v1: COUNTER2.v1 + 0.05 }, 1.0, 1.08, WOOD);
  const p = PARTS_SHELF2;
  boxU(b, p, 0, 0.05, STEEL);
  for (const y of [0.55, 1.15, 1.75]) {
    boxU(b, p, y, y + 0.04, STEEL);
    let k = 0;
    for (let v = p.v0 + 0.1; v < p.v1 - 0.4; v += 0.45) boxU(b, { u0: p.u0 + 0.08, v0: v, u1: p.u1 - 0.05, v1: v + 0.38 }, y + 0.04, y + 0.34, PARTS[k++ % PARTS.length]);
  }
}

/** The tyre store's insides: racks of tyres standing on their shelves, the fitting machine */
function tyreStoreInside(b: Batch) {
  for (const r of RACKS2) {
    const along = r.u1 - r.u0 > r.v1 - r.v0;
    const len = along ? r.u1 - r.u0 : r.v1 - r.v0;
    // (posts at the ends and every two tiles)
    for (let t = 0; t <= len + 1e-6; t += len / Math.max(1, Math.round(len / 2))) {
      const post: URect = along ? { u0: r.u0 + Math.min(t, len - 0.06), v0: r.v0, u1: r.u0 + Math.min(t, len - 0.06) + 0.06, v1: r.v1 } : { u0: r.u0, v0: r.v0 + Math.min(t, len - 0.06), u1: r.u1, v1: r.v0 + Math.min(t, len - 0.06) + 0.06 };
      boxU(b, post, 0, 2.4, STEEL);
    }
    for (const y of RACK_SHELVES) {
      boxU(b, r, y - 0.04, y, STEEL);
      // Tyres stood on edge side by side, their axles along the rack
      for (let t = 0.2; t < len - 0.15; t += TYRE2.h + 0.02) {
        const [u, v] = along ? [r.u0 + t, (r.v0 + r.v1) / 2] : [(r.u0 + r.u1) / 2, r.v0 + t];
        const [x, z] = W2(u, v);
        const g = unitCyl(TYRE2.r, TYRE2.h, 9);
        b.add(along ? g.rotateZ(Math.PI / 2).translate(x, y + TYRE2.r, z) : g.rotateX(Math.PI / 2).translate(x, y + TYRE2.r, z), TYRE);
      }
    }
  }
  // The fitting machine: a cabinet, its turntable with a tyre on, the arm
  const [fx, fz] = W2(FITTER2.u, FITTER2.v);
  b.box(fx - 0.45, 0, fz - 0.4, 0.9, 0.85, 0.8, CLUB_A);
  b.add(unitCyl(0.36, 0.06, 14).translate(fx, 0.88, fz), STEEL);
  b.add(unitCyl(TYRE2.r, TYRE2.h, 12).translate(fx, 0.91 + TYRE2.h / 2, fz), TYRE);
  b.box(fx + 0.35, 0.85, fz - 0.06, 0.12, 0.9, 0.12, STEEL);
  b.box(fx - 0.05, 1.68, fz - 0.05, 0.5, 0.1, 0.1, STEEL);
}

/** The loose stacks of tyres: black, a white-walled one every few, the top of every third in the club's colour */
function stacks(b: Batch, low: boolean) {
  STACKS2.forEach((s, i) => {
    const n = low ? Math.min(s.n, 3) : s.n;
    for (let k = 0; k < n; k++) flatTyre(b, s.u, s.v, PAVING + k * TYRE2.h, k === n - 1 && i % 3 === 0 ? (i % 2 ? CLUB_B : CLUB_A) : k % 3 === 1 ? WHITE : TYRE);
  });
}

/** A hire kart parked: the yellow livery, a black bumper all round, the seat, the wheel */
function hireKart(b: Batch, u: number, v: number, ry: number) {
  const [x, z] = W2(u, v);
  const at = (g: THREE.BufferGeometry) => g.rotateY(ry).translate(x, 0, z);
  b.add(at(new THREE.BoxGeometry(1.3, 0.1, 0.75).translate(0, 0.16, 0)), HIRE);
  b.add(at(new THREE.BoxGeometry(1.5, 0.12, 0.9).translate(0, 0.1, 0)), INK);
  b.add(at(new THREE.BoxGeometry(0.34, 0.36, 0.42).translate(-0.2, 0.38, 0)), INK);
  b.add(at(new THREE.BoxGeometry(0.32, 0.14, 0.62).translate(0.5, 0.26, 0)), HIRE);
  b.add(at(unitCyl(0.12, 0.03, 8).rotateZ(1.1).translate(0.18, 0.5, 0)), INK);
  for (const [a, d] of [
    [-0.45, 0.42],
    [-0.45, -0.42],
    [0.45, 0.42],
    [0.45, -0.42],
  ])
    b.add(at(unitCyl(0.17, 0.16, 8).rotateX(Math.PI / 2).translate(a, 0.17, d)), TYRE);
}

/** 4b: the canopy over the hire karts (posts, roof, fascia, the bays painted under it), the karts */
function hireCanopy(b: Batch) {
  const c = HIRE_CANOPY2;
  for (const [u, v] of CANOPY_POSTS2) boxU(b, { u0: u - 0.1, v0: v - 0.1, u1: u + 0.1, v1: v + 0.1 }, 0, c.h, STEEL);
  boxU(b, { u0: c.u0 - 0.2, v0: c.v0 - 0.4, u1: c.u1 + 0.2, v1: c.v1 + 0.2 }, c.h, c.h + 0.18, ROOF);
  boxU(b, { u0: c.u0 - 0.2, v0: c.v0 - 0.45, u1: c.u1 + 0.2, v1: c.v0 - 0.35 }, c.h - 0.4, c.h + 0.18, HIRE);
  // (the bays' lines on the apron)
  for (const v of [134.6, 138.2, 141.8]) boxU(b, { u0: c.u0 + 0.6, v0: v - 0.05, u1: c.u1 - 0.6, v1: v + 0.05 }, PAVING, PAVING + 0.012, PAINT);
}

/** 4b: the sign-on cabin: clad walls, the doorway, windows, its roof and fascia; inside, the desk, the benches, the screen */
function cabin(b: Batch) {
  const c = CABIN2;
  const [d0, d1] = c.door;
  flatU(b, { u0: c.u0, v0: c.v0, u1: c.u1, v1: c.v1 }, FLOOR, FLOOR_C);
  boxU(b, { u0: c.u0, v0: c.v1 - WALL, u1: c.u1, v1: c.v1 }, 0, c.h, CLAD);
  boxU(b, { u0: c.u0, v0: c.v0, u1: c.u0 + WALL, v1: c.v1 }, 0, c.h, CLAD);
  boxU(b, { u0: c.u1 - WALL, v0: c.v0, u1: c.u1, v1: c.v1 }, 0, c.h, CLAD);
  boxU(b, { u0: c.u0, v0: c.v0, u1: d0, v1: c.v0 + WALL }, 0, c.h, CLAD);
  boxU(b, { u0: d1, v0: c.v0, u1: c.u1, v1: c.v0 + WALL }, 0, c.h, CLAD);
  boxU(b, { u0: d0, v0: c.v0, u1: d1, v1: c.v0 + WALL }, 2.3, c.h, CLAD);
  // (windows on the front, a hair proud of the wall)
  for (const [a, e] of [
    [58.2, 60.6],
    [61, 63],
  ])
    boxU(b, { u0: a, v0: c.v0 - 0.03, u1: e, v1: c.v0 }, 1.1, 2.2, GLASS);
  boxU(b, { u0: c.u0 - 0.2, v0: c.v0 - 0.5, u1: c.u1 + 0.2, v1: c.v1 + 0.2 }, c.h, c.h + 0.2, ROOF);
  boxU(b, { u0: c.u0 - 0.2, v0: c.v0 - 0.55, u1: c.u1 + 0.2, v1: c.v0 - 0.45 }, c.h - 0.4, c.h + 0.2, HIRE);
}
function cabinInside(b: Batch) {
  boxU(b, DESK2, 0, 1.0, CLAD_DARK);
  boxU(b, { u0: DESK2.u0 - 0.05, v0: DESK2.v0 - 0.05, u1: DESK2.u1 + 0.05, v1: DESK2.v1 + 0.05 }, 1.0, 1.06, WOOD);
  for (const bench of BRIEF_BENCHES2) {
    boxU(b, bench, 0.38, 0.46, WOOD);
    for (const v of [bench.v0 + 0.2, bench.v1 - 0.3]) boxU(b, { u0: bench.u0 + 0.1, v0: v, u1: bench.u1 - 0.1, v1: v + 0.1 }, 0, 0.38, STEEL);
  }
  // The screen on the east wall: a circuit's outline and its flags (no words)
  const s = SCREEN2;
  boxU(b, { u0: s.u - 0.04, v0: s.v0, u1: s.u, v1: s.v1 }, s.y0, s.y1, SCREEN_C);
  const loop: [number, number][] = [
    [0.15, 0.3],
    [0.5, 0.2],
    [0.85, 0.35],
    [0.8, 0.75],
    [0.45, 0.8],
    [0.2, 0.65],
  ];
  for (let k = 0; k < loop.length; k++) {
    const [a, c] = [loop[k], loop[(k + 1) % loop.length]];
    const [va, ya] = [s.v0 + 0.4 + a[0] * (s.v1 - s.v0 - 0.8), s.y0 + 0.2 + a[1] * (s.y1 - s.y0 - 0.4)];
    const [vc, yc] = [s.v0 + 0.4 + c[0] * (s.v1 - s.v0 - 0.8), s.y0 + 0.2 + c[1] * (s.y1 - s.y0 - 0.4)];
    const [x, za] = W2(s.u - 0.05, va);
    const zc = W2(s.u, vc)[1];
    const len = Math.hypot(zc - za, yc - ya);
    b.add(new THREE.BoxGeometry(0.02, 0.05, len).rotateX(Math.atan2(yc - ya, zc - za) * -1).translate(x, (ya + yc) / 2, (za + zc) / 2), SCREEN_LINE);
  }
  for (const [k, mat] of [
    [0, toon('#1fbf6b')],
    [1, toon('#ffd23f')],
    [2, toon('#e23b3b')],
  ] as const) {
    const [x, z] = W2(s.u - 0.05, s.v0 + 0.5 + k * 0.5);
    b.box(x - 0.01, s.y1 - 0.45, z - 0.18, 0.02, 0.25, 0.36, mat);
  }
  // The helmet rack on the front wall outside: two rails of pegs, a helmet on each
  const r = HELMET_RACK2;
  boxU(b, r, 0, 0.1, STEEL);
  for (const y of [0.95, 1.55]) {
    boxU(b, { ...r, v0: r.v1 - 0.06 }, y - 0.04, y, STEEL);
    let k = 0;
    for (let u = r.u0 + 0.3; u < r.u1 - 0.2; u += 0.48) {
      const [x, z] = W2(u, r.v0 + 0.12);
      b.add(new THREE.SphereGeometry(0.17, 10, 8).scale(1, 0.95, 1.1).translate(x, y + 0.14, z), [CLUB_A, HIRE, CLUB_B, WHITE][k++ % 4]);
      b.box(x - 0.12, y + 0.08, z - 0.2, 0.24, 0.1, 0.05, INK);
    }
  }
}

/** 4a: registered with the track's district (kartgrounds2-3d.ts) */
export function registerVenue({ low }: { low: boolean }) {
  const rectW = (r: URect, m = 0): [number, number, number, number] => [SITE2.x0 + r.u0 - m, SITE2.z0 + r.v0 - m, SITE2.x0 + r.u1 + m, SITE2.z0 + r.v1 + m];
  site('riverside apron', rectW(APRON2), (into) => {
    const b = new Batch();
    flatU(b, APRON2, PAVING, CONCRETE);
    b.build(into, { cast: false, receive: true });
  });
  site('riverside workshop', rectW(WORKSHOP2, 2), (into) => {
    const b = new Batch();
    shed(b, WORKSHOP2, WORKSHOP2.bays, CLUB_A);
    b.detail(() => workshopInside(b));
    b.build(into);
  });
  site('riverside tyre store', rectW(TYRESTORE2, 2), (into) => {
    const b = new Batch();
    shed(b, TYRESTORE2, 1, CLUB_B);
    b.detail(() => tyreStoreInside(b));
    b.build(into);
  });
  // 4b: the hire-kart garage
  site('riverside hire canopy', rectW(HIRE_CANOPY2, 1), (into) => {
    const b = new Batch();
    hireCanopy(b);
    b.detail(() => HIRE_KARTS2.forEach((k) => hireKart(b, k.u, k.v, k.ry)));
    b.build(into);
  });
  site('riverside sign-on cabin', rectW(CABIN2, 1), (into) => {
    const b = new Batch();
    cabin(b);
    b.detail(() => cabinInside(b));
    b.build(into);
  });
  // The stacks: by the sheds, and along the pit lane
  const near = STACKS2.filter((s) => s.v > 130);
  const pits = STACKS2.filter((s) => s.v <= 130);
  for (const [id, list] of [
    ['sheds', near],
    ['pits', pits],
  ] as const) {
    if (!list.length) continue;
    const r: URect = { u0: Math.min(...list.map((s) => s.u)) - 1, v0: Math.min(...list.map((s) => s.v)) - 1, u1: Math.max(...list.map((s) => s.u)) + 1, v1: Math.max(...list.map((s) => s.v)) + 1 };
    site(`riverside tyre stacks ${id}`, rectW(r), (into) => {
      const b = new Batch();
      b.detail(() => stacks(b, low));
      b.build(into);
    });
  }
}
