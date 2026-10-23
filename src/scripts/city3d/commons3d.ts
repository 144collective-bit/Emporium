/*
 * The Trenches' communal areas on screen (the redesign's step B; the
 * numbers are commons.ts): every amenity, the rec block, the parking bays,
 * the railings, hedges and hydrants as sites (tilework.ts), built as you go;
 * the parked cars, the rec block's trees and lamps and the people out on the
 * lawns at the boot.
 *
 * - A playground on soft ground (a climbing frame and slide, swings, a
 *   spring rider, a bench), a basketball half-court (lines, a hoop, a
 *   railed fence), the soccer cage (turf, lines, goals, a tall railed
 *   fence), a skate spot (two quarter pipes with painted sides, a fun box, a
 *   rail), a community garden (raised beds, grills, picnic tables), chess
 *   tables with stools, washing lines with the washing out. A path from each
 *   out to the street.
 * - The rec block: the rec centre (brick, a glass front, its sign), the
 *   laundromat (its lit front, its sign), the pavilion over picnic tables
 *   and a grill, a notice board, paths, trees and lamps.
 * - Parking bays: tarmac lay-bys behind the sidewalk, lined, a kerb on the
 *   lawn side, cars parked in about two spaces in three.
 * - Chain-link on a low concrete kerb round the yards (the grit step: once
 *   railings and hedges round lawns), open at every way in; fire hydrants on
 *   the corners.
 *
 * The grit step wore them down: the courts on old asphalt with faded lines
 * and tagged backboards behind chain-link, the playground's rubber faded,
 * the cage's turf worn bald at the goals, the garden's beds fenced in.
 *
 * Signs are fixed copy with made-up names. Details are near only; surfaces,
 * buildings, fences and hedges at every distance.
 */
import * as THREE from 'three';
import { Batch, canvasTex, FONT_DISPLAY, lit, siteMat, toon } from './kit';
import { ATLAS, CREAM, INK, LEAF, METAL, ROOF, STONE, WOOD, glow, kit, type Frame } from './infill';
import { buildFx, chainMesh, tag } from './grime';
import { EDGES, EDGE_H, EDGE_W } from './streetwall';
import { SLAB as S, addLamp } from './world';
import { site } from './tilework';
import { parkedCars, type CarId } from './cars';
import { towerShell } from './projects';
import { TRENCH_BLOCKS } from './trenches';
import {
  AMENITIES,
  BAYS,
  BAY_CARS,
  HYDRANTS,
  REC,
  REC_DOORS,
  SPACE,
  amenityWay,
  commonsPeople,
  gardenGrills,
  overlaps,
  pavilionPosts,
  washingPoles,
  type Amenity,
} from './commons';
import type { Idle } from './landmarks';
import type { Pt, Rect } from './downtown';

const WORLD: Frame = { M: new THREE.Matrix4(), w: 0, d: 0, L: [0, 0], t: [1, 0], n: [0, 1] };
const KID = 0.44;
const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: THREE.Material) => b.box(Math.min(x0, x1), y0, Math.min(z0, z1), Math.abs(x1 - x0), y1 - y0, Math.abs(z1 - z0), mat);
const flat = (b: Batch, [x0, z0, x1, z1]: Rect, y: number, mat: THREE.Material) => b.add(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, S + y, (z0 + z1) / 2), mat);
const cyl = (b: Batch, r: number, h: number, x: number, y: number, z: number, mat: THREE.Material, seg = 8) => b.add(new THREE.CylinderGeometry(r, r, h, seg).translate(x, y + h / 2, z), mat);

const PAVING = toon('#77738a');
const TARMAC = toon('#2e2b45');
const LINE = toon('#e8e2f0');
/** (worn: the grit step) */
const FADED = toon('#a6a2b8');
const RUBBER = toon('#9a4c44');
const TURF = toon('#3c6a44');
const BALD = toon('#6a5644');
const COURT = toon('#36334a');
const CONCRETE = toon('#9a96b4');
/** Galvanised pipe: the chain-link's posts and rails */
const PIPE = toon('#8c90a2');
const KERB = toon('#8a8698');
const KERB_TOP = toon('#77738a');
const RED = toon('#d6283a');

/** An amenity's own frame: u along its long side, v across, both from its corner (x0, z0) */
function frameOf(a: Amenity) {
  const [x0, z0, x1, z1] = a.rect;
  const L = a.turned ? z1 - z0 : x1 - x0;
  const D = a.turned ? x1 - x0 : z1 - z0;
  const at = (u: number, v: number): Pt => (a.turned ? [x0 + v, z0 + u] : [x0 + u, z0 + v]);
  /** A box in the frame */
  const ubox = (b: Batch, u0: number, u1: number, y0: number, y1: number, v0: number, v1: number, mat: THREE.Material) => {
    const [p, q] = [at(u0, v0), at(u1, v1)];
    box(b, p[0], S + y0, p[1], q[0], S + y1, q[1], mat);
  };
  return { L, D, at, ubox };
}

/** A chain-link fence round a rectangle (pipe posts, a top rail, the mesh in the FX layer), open where `gap` crosses it */
function chainFence(b: Batch, wire: Batch, r: Rect, h: number, gap: Rect | null) {
  const [x0, z0, x1, z1] = r;
  const runs: [Pt, Pt][] = [
    [[x0, z0], [x1, z0]],
    [[x0, z1], [x1, z1]],
    [[x0, z0], [x0, z1]],
    [[x1, z0], [x1, z1]],
  ];
  for (const [p, q] of runs) {
    const alongX = p[1] === q[1];
    const [a0, a1] = alongX ? [p[0], q[0]] : [p[1], q[1]];
    // Split round the gate
    const pieces: [number, number][] = [];
    const g = gap && overlaps(gap, alongX ? [a0, p[1] - 0.1, a1, p[1] + 0.1] : [p[0] - 0.1, a0, p[0] + 0.1, a1]) ? (alongX ? [gap[0], gap[2]] : [gap[1], gap[3]]) : null;
    if (g) pieces.push([a0, Math.max(a0, g[0])], [Math.min(a1, g[1]), a1]);
    else pieces.push([a0, a1]);
    for (const [s0, s1] of pieces) {
      if (s1 - s0 < 0.2) continue;
      const at = (a: number): Pt => (alongX ? [a, p[1]] : [p[0], a]);
      // The top rail, posts every couple of tiles, and the mesh between
      const [t0, t1] = [at(s0), at(s1)];
      box(b, t0[0] - (alongX ? 0 : 0.025), S + h - 0.05, t0[1] - (alongX ? 0.025 : 0), t1[0] + (alongX ? 0 : 0.025), S + h, t1[1] + (alongX ? 0.025 : 0), PIPE);
      const n = Math.max(1, Math.round((s1 - s0) / 2.4));
      for (let i = 0; i <= n; i++) {
        const [x, z] = at(s0 + ((s1 - s0) * i) / n);
        cyl(b, 0.04, h + 0.05, x, S, z, PIPE, 6);
      }
      chainMesh(wire, t0, t1, S + 0.02, h - 0.07);
    }
  }
}

/** A park bench, the sitter facing `ry` */
function bench(b: Batch, [x, z]: Pt, ry: number) {
  const g = (w: number, h: number, d: number, px: number, py: number, pz: number) => new THREE.BoxGeometry(w, h, d).translate(px, py + h / 2, pz).rotateY(ry).translate(x, S, z);
  b.add(g(1.2, 0.06, 0.32, 0, 0.24, 0), WOOD);
  b.add(g(1.2, 0.3, 0.05, 0, 0.32, -0.16), WOOD);
  for (const sx of [-0.5, 0.5]) b.add(g(0.05, 0.26, 0.3, sx, 0, 0), INK);
}
/** A picnic table with its benches, along x or z */
function picnic(b: Batch, [x, z]: Pt, alongX: boolean, y = 0) {
  const [hw, hd] = alongX ? [0.85, 0.42] : [0.42, 0.85];
  box(b, x - hw, S + y + 0.68, z - hd, x + hw, S + y + 0.74, z + hd, WOOD);
  for (const e of [-1, 1]) {
    if (alongX) box(b, x - hw, S + y + 0.38, z + e * 0.72 - 0.14, x + hw, S + y + 0.43, z + e * 0.72 + 0.14, WOOD);
    else box(b, x + e * 0.72 - 0.14, S + y + 0.38, z - hw, x + e * 0.72 + 0.14, S + y + 0.43, z + hw, WOOD);
    for (const d of [-0.65, 0.65]) {
      if (alongX) box(b, x + d - 0.04, S + y, z - 0.85, x + d + 0.04, S + y + 0.68, z + 0.85, INK);
      else box(b, x - 0.85, S + y, z + d - 0.04, x + 0.85, S + y + 0.68, z + d + 0.04, INK);
    }
  }
}
/** A kettle grill on three legs */
function grill(b: Batch, [x, z]: Pt) {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    b.add(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 4).rotateZ(0.15).rotateY(a).translate(x + Math.cos(a) * 0.12, S + 0.27, z + Math.sin(a) * 0.12), INK);
  }
  b.add(new THREE.SphereGeometry(0.26, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(x, S + 0.72, z), toon('#1b1830'));
  b.add(new THREE.SphereGeometry(0.26, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2.4).translate(x, S + 0.74, z), toon('#2a2b38'));
  b.add(new THREE.CylinderGeometry(0.245, 0.245, 0.02, 12).translate(x, S + 0.73, z), glow('#ff6a2f'));
}

/* ---------- The amenities ---------- */

function playground(b: Batch, a: Amenity) {
  const f = frameOf(a);
  flat(b, a.rect, 0.018, RUBBER);
  // A low kerb round the soft ground
  const [x0, z0, x1, z1] = a.rect;
  for (const r of [
    [x0, z0, x1, z0 + 0.12],
    [x0, z1 - 0.12, x1, z1],
    [x0, z0, x0 + 0.12, z1],
    [x1 - 0.12, z0, x1, z1],
  ] as Rect[])
    box(b, r[0], S, r[1], r[2], S + 0.12, r[3], STONE);
  b.detail(() => {
    // The climbing frame with a roof and a slide
    const [cu, cv] = [1.8, f.D / 2];
    for (const [du, dv] of [
      [-0.7, -0.7],
      [0.7, -0.7],
      [-0.7, 0.7],
      [0.7, 0.7],
    ] as Pt[])
      f.ubox(b, cu + du - 0.06, cu + du + 0.06, 0, 2.2, cv + dv - 0.06, cv + dv + 0.06, toon('#ffd23f'));
    f.ubox(b, cu - 0.8, cu + 0.8, 1.0, 1.08, cv - 0.8, cv + 0.8, WOOD);
    const [rx, rz] = f.at(cu, cv);
    b.add(new THREE.ConeGeometry(1.2, 0.6, 4).rotateY(Math.PI / 4).translate(rx, S + 2.5, rz), toon('#00a3d6'));
    const slide = new THREE.BoxGeometry(2.1, 0.05, 0.6).rotateZ(-0.45);
    if (a.turned) slide.rotateY(-Math.PI / 2);
    const [sx, sz] = f.at(cu + 0.8 + 0.95, cv);
    b.add(slide.translate(sx, S + 0.55, sz), toon('#e219e5'));
    // Swings
    const [wu, wv] = [f.L - 2.2, f.D / 2];
    for (const e of [-1, 1]) f.ubox(b, wu + e * 1.3 - 0.05, wu + e * 1.3 + 0.05, 0, 2.1, wv - 0.05, wv + 0.05, toon('#00a3d6'));
    f.ubox(b, wu - 1.35, wu + 1.35, 2.05, 2.12, wv - 0.05, wv + 0.05, toon('#00a3d6'));
    for (const d of [-0.55, 0.55]) {
      f.ubox(b, wu + d - 0.2, wu + d + 0.2, 0.45, 0.5, wv - 0.1, wv + 0.1, INK);
      for (const e of [-0.17, 0.17]) f.ubox(b, wu + d + e - 0.01, wu + d + e + 0.01, 0.5, 2.05, wv - 0.01, wv + 0.01, METAL);
    }
    // A spring rider and a bench for the grown-ups
    const [ru, rv] = [f.L / 2, 1.1];
    const [px, pz] = f.at(ru, rv);
    b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.35, 6).translate(px, S + 0.18, pz), METAL);
    b.add(new THREE.SphereGeometry(0.22, 8, 6).scale(1.4, 0.8, 0.8).translate(px, S + 0.45, pz), toon('#2bff88'));
    const [bx, bz] = f.at(f.L / 2, f.D - 0.6);
    bench(b, [bx, bz], a.turned ? -Math.PI / 2 : Math.PI);
  });
}

function halfcourt(b: Batch, a: Amenity, wire: Batch) {
  const f = frameOf(a);
  flat(b, a.rect, 0.016, COURT);
  // The far end from the gate carries the hoop
  const hoopAtEnd = a.turned ? a.opens === 'n' || a.opens === 'w' : a.opens === 'w' || a.opens === 'n';
  const hu = hoopAtEnd ? f.L - 0.9 : 0.9;
  const dir = hoopAtEnd ? -1 : 1;
  const ly = 0.024;
  b.detail(() => {
    // The key and the three-point line
    f.ubox(b, Math.min(hu, hu + dir * 3.5), Math.max(hu, hu + dir * 3.5), ly, ly + 0.004, f.D / 2 - 1.2, f.D / 2 + 1.2, toon('#6a3a66'));
    const [cx, cz] = f.at(hu, f.D / 2);
    const arc = new THREE.RingGeometry(3.3, 3.37, 24, 1, dir > 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI).rotateX(-Math.PI / 2);
    if (a.turned) arc.rotateY(-Math.PI / 2);
    b.add(arc.translate(cx, S + ly + 0.006, cz), FADED);
  });
  // The hoop: pole, arm, backboard, rim
  const pu = hoopAtEnd ? f.L - 0.25 : 0.25;
  f.ubox(b, pu - 0.07, pu + 0.07, 0, 2.95, f.D / 2 - 0.07, f.D / 2 + 0.07, METAL);
  const bu = pu + dir * 0.55;
  f.ubox(b, Math.min(pu, bu), Math.max(pu, bu), 2.85, 2.92, f.D / 2 - 0.04, f.D / 2 + 0.04, METAL);
  f.ubox(b, bu - 0.04, bu + 0.04, 2.45, 3.4, f.D / 2 - 0.85, f.D / 2 + 0.85, CREAM);
  b.detail(() => {
    // A tag across the backboard's front
    const [tx, tz] = f.at(bu + dir * 0.046, f.D / 2);
    const tn: Pt = a.turned ? [0, dir] : [dir, 0];
    wire.detail(() => tag(wire, Math.round(a.rect[0] + a.rect[1]), 1.3, tn, tx, S + 3.15, tz));
    const [rx, rz] = f.at(bu + dir * 0.3, f.D / 2);
    b.add(new THREE.TorusGeometry(0.22, 0.02, 6, 16).rotateX(Math.PI / 2).translate(rx, S + 2.62, rz), toon('#ff6a2f'));
    b.add(new THREE.CylinderGeometry(0.22, 0.14, 0.38, 10, 1, true).translate(rx, S + 2.43, rz), CREAM);
  });
  chainFence(b, wire, a.rect, 2.2, amenityWay(a, 0.8));
}

function soccer(b: Batch, a: Amenity, wire: Batch) {
  const f = frameOf(a);
  flat(b, a.rect, 0.016, TURF);
  b.detail(() => {
    const y = 0.024;
    f.ubox(b, 0.3, f.L - 0.3, y, y + 0.004, 0.3, 0.36, FADED);
    f.ubox(b, 0.3, f.L - 0.3, y, y + 0.004, f.D - 0.36, f.D - 0.3, FADED);
    f.ubox(b, f.L / 2 - 0.03, f.L / 2 + 0.03, y, y + 0.004, 0.3, f.D - 0.3, FADED);
    const [cx, cz] = f.at(f.L / 2, f.D / 2);
    b.add(new THREE.RingGeometry(1.3, 1.36, 24).rotateX(-Math.PI / 2).translate(cx, S + y + 0.006, cz), FADED);
    // Worn bald in each goalmouth and the middle
    for (const u of [1.6, f.L / 2, f.L - 1.6]) {
      const [x, z] = f.at(u, f.D / 2);
      b.add(new THREE.CircleGeometry(u === f.L / 2 ? 0.9 : 1.1, 12).scale(1, a.turned ? 1 : 0.7, 1).rotateX(-Math.PI / 2).translate(x, S + 0.02, z), BALD);
    }
  });
  // A goal at each end
  for (const [u0, u1] of [
    [0.3, 1.1],
    [f.L - 1.1, f.L - 0.3],
  ]) {
    const um = u0 < 1 ? u0 : u1;
    for (const v of [f.D / 2 - 1.5, f.D / 2 + 1.5]) f.ubox(b, um - 0.05, um + 0.05, 0, 1.6, v - 0.05, v + 0.05, CREAM);
    f.ubox(b, um - 0.05, um + 0.05, 1.55, 1.62, f.D / 2 - 1.55, f.D / 2 + 1.55, CREAM);
    b.detail(() => f.ubox(b, Math.min(u0, u1), Math.max(u0, u1), 1.55, 1.58, f.D / 2 - 1.5, f.D / 2 + 1.5, toon('#c9c4e6')));
  }
  chainFence(b, wire, a.rect, 2.6, amenityWay(a, 0.8));
}

/** A quarter pipe's side outline (u across it, y up), its ramp curving up to the deck */
const QUARTER = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(1.6, 0);
  s.lineTo(1.6, 0.9);
  s.lineTo(1.3, 0.9);
  for (let i = 0; i <= 8; i++) {
    const t = (i / 8) * (Math.PI / 2);
    s.lineTo(1.3 - Math.sin(t) * 1.3, 0.9 - (1 - Math.cos(t)) * 0.9 + 0 * t);
  }
  return s;
})();
function skate(b: Batch, a: Amenity, wire: Batch) {
  const f = frameOf(a);
  flat(b, a.rect, 0.016, CONCRETE);
  // A quarter pipe at each end, facing in, its sides painted
  for (const end of [0, 1]) {
    const g = new THREE.ExtrudeGeometry(QUARTER, { depth: f.D - 1, bevelEnabled: false });
    // (the profile in x, y; extruded along z): turn it to face in from its end
    g.translate(0, 0, -(f.D - 1) / 2);
    if (end === 0) g.rotateY(Math.PI);
    const [ex, ez] = f.at(end === 0 ? 1.6 : f.L - 1.6, f.D / 2);
    if (a.turned) g.rotateY(-Math.PI / 2);
    b.add(g.translate(ex, S + 0.016, ez), CONCRETE);
    b.detail(() => {
      const [px, pz] = f.at(end === 0 ? 0.8 : f.L - 0.8, 0.5 - 0.006);
      const [qx, qz] = f.at(end === 0 ? 0.8 : f.L - 0.8, f.D - 0.5 + 0.006);
      const stripe = toon(end ? '#e219e5' : '#00c2ff');
      for (const [x, z, s] of [
        [px, pz, -1],
        [qx, qz, 1],
      ]) {
        b.add(new THREE.PlaneGeometry(1.2, 0.35).rotateY(a.turned ? (s > 0 ? Math.PI / 2 : -Math.PI / 2) : s > 0 ? 0 : Math.PI).translate(x, S + 0.3, z), stripe);
        // A tag up on its high end (where the side is tallest)
        const tn: Pt = a.turned ? [s, 0] : [0, s];
        const [gx, gz] = f.at(end === 0 ? 0.6 : f.L - 0.6, s > 0 ? f.D - 0.5 + 0.01 : 0.5 - 0.01);
        wire.detail(() => tag(wire, end * 2 + (s > 0 ? 1 : 0) + 3, 0.7, tn, gx, S + 0.56, gz));
      }
      // The coping along the top
      f.ubox(b, end === 0 ? 1.25 : f.L - 1.35, end === 0 ? 1.35 : f.L - 1.25, 0.9, 0.96, 0.5, f.D - 0.5, METAL);
    });
  }
  // A fun box in the middle with a rail beside it
  const m = f.L / 2;
  f.ubox(b, m - 1.2, m + 1.2, 0, 0.45, f.D / 2 - 0.9, f.D / 2 + 0.9, toon('#8a86a8'));
  b.detail(() => {
    f.ubox(b, m - 1.5, m + 1.5, 0.5, 0.55, f.D - 1.3, f.D - 1.25, METAL);
    for (const u of [m - 1.3, m + 1.3]) f.ubox(b, u - 0.03, u + 0.03, 0, 0.5, f.D - 1.3, f.D - 1.25, METAL);
  });
}

function garden(b: Batch, a: Amenity, wire: Batch) {
  const f = frameOf(a);
  // Raised beds on the yard's concrete (the grit step; open since the trim)
  b.detail(() => {
    // Raised beds along the far side
    for (let i = 0; i < 3; i++) {
      const u0 = 0.5 + i * ((f.L - 1) / 3);
      const u1 = u0 + (f.L - 1) / 3 - 0.5;
      f.ubox(b, u0, u1, 0, 0.42, 0.4, 1.9, WOOD);
      f.ubox(b, u0 + 0.06, u1 - 0.06, 0.42, 0.44, 0.46, 1.84, toon('#3b2a22'));
      for (let u = u0 + 0.3; u < u1 - 0.1; u += 0.5)
        for (const v of [0.8, 1.45]) {
          const [x, z] = f.at(u, v);
          b.add(new THREE.IcosahedronGeometry(0.2, 0).translate(x, S + 0.6, z), (u * 7 + v) % 2 > 1 ? LEAF : toon('#2a8a55'));
        }
    }
    // Picnic tables between the grills
    for (const u of [f.L / 2 - 1.4, f.L / 2 + 1.4]) picnic(b, f.at(u, f.D - 2.2), !a.turned);
  });
  for (const g of gardenGrills(a)) grill(b, g);
}

function chess(b: Batch, a: Amenity) {
  const f = frameOf(a);
  flat(b, a.rect, 0.014, PAVING);
  for (const u of [f.L / 2 - 1.2, f.L / 2 + 1.2]) {
    const [x, z] = f.at(u, f.D / 2);
    cyl(b, 0.12, 0.7, x, S, z, CONCRETE, 8);
    box(b, x - 0.42, S + 0.7, z - 0.42, x + 0.42, S + 0.76, z + 0.42, CONCRETE);
    b.detail(() => {
      // The board: dark squares on the light top
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
          if ((i + j) % 2) continue;
          const [sx, sz] = [x - 0.32 + i * 0.16, z - 0.32 + j * 0.16];
          box(b, sx, S + 0.76, sz, sx + 0.16, S + 0.765, sz + 0.16, INK);
        }
      for (const [dx, dz] of [
        [-0.7, 0],
        [0.7, 0],
        [0, -0.7],
        [0, 0.7],
      ] as Pt[])
        cyl(b, 0.16, 0.42, x + dx, S, z + dz, CONCRETE, 8);
    });
  }
}

function washing(b: Batch, a: Amenity) {
  const poles = washingPoles(a);
  for (const [x, z] of poles) {
    box(b, x - 0.04, S, z - 0.04, x + 0.04, S + 1.9, z + 0.04, METAL);
  }
  b.detail(() => {
    const colours = ['#f3f2f7', '#ff6ad5', '#00c2ff', '#ffd23f', '#2bff88', '#e23b3b', '#8f7bff'];
    // Lines between the pairs of poles at each end, the washing hung along them
    const pairs: [Pt, Pt][] = [
      [poles[0], poles[1]],
      [poles[2], poles[3]],
    ];
    let k = 0;
    for (const [p, q] of pairs) {
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const t: Pt = [(q[0] - p[0]) / len, (q[1] - p[1]) / len];
      box(b, Math.min(p[0], q[0]) - 0.01, S + 1.82, Math.min(p[1], q[1]) - 0.01, Math.max(p[0], q[0]) + 0.01, S + 1.84, Math.max(p[1], q[1]) + 0.01, CREAM);
      for (let s = 0.4; s < len - 0.3; s += 0.45) {
        const [x, z] = [p[0] + t[0] * s, p[1] + t[1] * s];
        const w = 0.3;
        const h = 0.3 + ((k * 7) % 3) * 0.12;
        box(b, x - (t[0] ? w / 2 : 0.006), S + 1.82 - h, z - (t[1] ? w / 2 : 0.006), x + (t[0] ? w / 2 : 0.006), S + 1.82, z + (t[1] ? w / 2 : 0.006), toon(colours[k++ % colours.length]));
      }
    }
    // A basket
    const [x0, z0, x1, z1] = a.rect;
    box(b, (x0 + x1) / 2 - 0.25, S, (z0 + z1) / 2 - 0.18, (x0 + x1) / 2 + 0.25, S + 0.3, (z0 + z1) / 2 + 0.18, toon('#c9a26a'));
  });
}

const DRAW: Record<Amenity['kind'], (b: Batch, a: Amenity, wire: Batch) => void> = { playground, halfcourt, soccer, skate, garden, chess, washing };

/* ---------- The rec block ---------- */

/** The rec block's signs: the rec centre and the laundromat (made-up names), one row each */
const REC_SIGNS = (() => {
  const rows = [
    { text: 'TRENCHES REC CENTER', color: '#2bff88' },
    { text: 'WASH & FOLD', color: '#00eaff' },
  ];
  const W = 1024;
  const H = 128;
  const tex = canvasTex(W, H * rows.length, (c) => {
    rows.forEach(({ text, color }, i) => {
      const y = i * H;
      c.fillStyle = '#0d0b1c';
      c.fillRect(0, y, W, H);
      c.strokeStyle = color;
      c.lineWidth = 8;
      c.strokeRect(10, y + 10, W - 20, H - 20);
      c.font = `900 84px ${FONT_DISPLAY}`;
      const size = Math.min(84, (84 * (W - 80)) / c.measureText(text).width);
      c.font = `900 ${size}px ${FONT_DISPLAY}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.shadowColor = color;
      c.shadowBlur = 16;
      c.fillStyle = color;
      c.fillText(text, W / 2, y + H / 2 + 4);
    });
  });
  return { mat: siteMat('rec-signs', lit(new THREE.MeshBasicMaterial({ map: tex, toneMapped: true }), 0.95, 1.3)), rows: rows.length };
})();
function signPlane(row: number, w: number, h: number, x: number, y: number, z: number) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const v0 = 1 - (row + 1) / REC_SIGNS.rows;
  const v1 = 1 - row / REC_SIGNS.rows;
  for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) > 0.5 ? v1 - 0.003 : v0 + 0.003);
  return g.translate(x, y, z);
}

/** A flat-roofed building on a rectangle: brick walls, a shopfront along its south side, a parapet, its sign over the door */
function building(b: Batch, r: Rect, h: number, wall: keyof typeof ATLAS.wall, front: keyof typeof ATLAS.ground, sign: number) {
  const k = kit(b, WORLD);
  const { walls, roofs } = towerShell([{ rect: r, floors: 0, h }]);
  k.all(() => {
    for (const w of walls) k.wall(ATLAS.wall[wall], w.a, w.c, S + w.y0, S + w.y1, w.n, 0.2);
    for (const rf of roofs) k.lbox(rf.rect[0], rf.rect[2], S + h - 0.04, S + h, rf.rect[1], rf.rect[3], ROOF);
    // The shopfront along the south side, a hair proud of the brick
    k.wall(ATLAS.ground[front], [r[0] + 0.3, r[3] + 0.008], [r[2] - 0.3, r[3] + 0.008], S, S + 1.25, [0, 1], 0);
    // Parapet
    for (const w of walls) {
      const [x0, x1] = [Math.min(w.a[0], w.c[0]), Math.max(w.a[0], w.c[0])];
      const [z0, z1] = [Math.min(w.a[1], w.c[1]), Math.max(w.a[1], w.c[1])];
      const ix = -w.n[0] * 0.14;
      const iz = -w.n[1] * 0.14;
      k.lbox(Math.min(x0, x0 + ix), Math.max(x1, x1 + ix), S + h, S + h + 0.26, Math.min(z0, z0 + iz), Math.max(z1, z1 + iz), toon('#5a2c2a'));
    }
    // The sign over the door, on a dark fascia
    const mx = (r[0] + r[2]) / 2;
    const sw = Math.min(r[2] - r[0] - 1, 7);
    k.lbox(mx - sw / 2 - 0.1, mx + sw / 2 + 0.1, S + 1.3, S + 1.85, r[3], r[3] + 0.08, toon('#141226'));
    k.put(signPlane(sign, sw, 0.5, mx, S + 1.575, r[3] + 0.086), REC_SIGNS.mat);
  });
  // A canopy over the door
  const mx = (r[0] + r[2]) / 2;
  k.lbox(mx - 1.4, mx + 1.4, S + 1.9, S + 1.98, r[3], r[3] + 1.1, toon('#2f3a4a'));
}

function recBlock(b: Batch) {
  // Paths: along the block from the avenue, round the pavilion
  flat(b, REC.path, 0.012, PAVING);
  const [px0, pz0, px1, pz1] = REC.pavilion;
  flat(b, [px0 - 1, pz0 - 1, px1 + 1, pz1 + 1], 0.012, PAVING);
  flat(b, [px1 + 1, (pz0 + pz1) / 2 - 1, REC.path[0], (pz0 + pz1) / 2 + 1], 0.012, PAVING);
  // Forecourts in front of the buildings
  for (const r of [REC.centre, REC.laundry]) flat(b, [r[0], r[3], r[2], r[3] + 2.4], 0.012, PAVING);
  building(b, REC.centre, REC.centreH, 'brick', 'lobby', 0);
  building(b, REC.laundry, REC.laundryH, 'brickTan', 'shopCyan', 1);
  // The pavilion: posts, a roof with a fascia, a slab, tables and a grill under it
  for (const [x, z] of pavilionPosts()) box(b, x - 0.1, S, z - 0.1, x + 0.1, S + REC.pavilionH, z + 0.1, CREAM);
  // A timber fascia, then a hipped roof
  box(b, px0 - 0.5, S + REC.pavilionH, pz0 - 0.5, px1 + 0.5, S + REC.pavilionH + 0.22, pz1 + 0.5, WOOD);
  const k = Math.SQRT1_2;
  b.add(
    new THREE.ConeGeometry(1, 1, 4, 1)
      .rotateY(Math.PI / 4)
      .scale((px1 - px0 + 1.2) / 2 / k, 1.6, (pz1 - pz0 + 1.2) / 2 / k)
      .translate((px0 + px1) / 2, S + REC.pavilionH + 0.22 + 0.8, (pz0 + pz1) / 2),
    toon('#b8553a')
  );
  b.detail(() => {
    for (let i = 0; i < 3; i++) picnic(b, [px0 + 2.2 + i * 3.8, (pz0 + pz1) / 2], true);
    // A notice board by the rec centre's door
    const d = REC_DOORS.centre;
    box(b, d.x - 3, S, d.z + 0.6, d.x - 2.95, S + 1.5, d.z + 0.65, METAL);
    box(b, d.x - 2.0, S, d.z + 0.6, d.x - 1.95, S + 1.5, d.z + 0.65, METAL);
    box(b, d.x - 3.05, S + 0.8, d.z + 0.6, d.x - 1.9, S + 1.6, d.z + 0.64, toon('#c9a26a'));
    for (let i = 0; i < 4; i++) box(b, d.x - 2.95 + i * 0.25, S + 1.0 + (i % 2) * 0.2, d.z + 0.645, d.x - 2.75 + i * 0.25, S + 1.3 + (i % 2) * 0.2, d.z + 0.652, toon(['#f3f2f7', '#ffd23f', '#ff6ad5', '#00c2ff'][i]));
  });
  grill(b, [px1 - 0.8, pz1 - 0.8]);
}

/* ---------- Bays, edges, hydrants ---------- */

function bay(b: Batch, y: (typeof BAYS)[number]) {
  const alongX = y.face === 'n' || y.face === 's';
  const [x0, z0, x1, z1] = y.rect;
  flat(b, y.rect, 0.014, TARMAC);
  // A kerb on the lawn side
  const k = 0.12;
  if (y.face === 's') box(b, x0, S, z0, x1, S + 0.12, z0 + k, STONE);
  else if (y.face === 'n') box(b, x0, S, z1 - k, x1, S + 0.12, z1, STONE);
  else if (y.face === 'w') box(b, x1 - k, S, z0, x1, S + 0.12, z1, STONE);
  else box(b, x0, S, z0, x0 + k, S + 0.12, z1, STONE);
  b.detail(() => {
    const n = Math.round((alongX ? x1 - x0 : z1 - z0) / SPACE);
    for (let i = 0; i <= n; i++) {
      const a = (alongX ? x0 : z0) + i * SPACE;
      if (alongX) box(b, a - 0.03, S + 0.014, z0 + 0.2, a + 0.03, S + 0.022, z1 - 0.2, LINE);
      else box(b, x0 + 0.2, S + 0.014, a - 0.03, x1 - 0.2, S + 0.022, a + 0.03, LINE);
    }
  });
}
function edges(b: Batch, block: string) {
  for (const e of EDGES.filter((o) => o.block === block)) {
    const [x0, x1] = [Math.min(e.a[0], e.c[0]), Math.max(e.a[0], e.c[0])];
    const [z0, z1] = [Math.min(e.a[1], e.c[1]), Math.max(e.a[1], e.c[1])];
    const alongX = z0 === z1;
    const [wx, wz] = alongX ? [0, EDGE_W / 2] : [EDGE_W / 2, 0];
    // A low worn concrete kerb (the trim: it was chain-link), its top a shade darker where feet and weather wore it
    box(b, x0 - wx, S, z0 - wz, x1 + wx, S + EDGE_H - 0.03, z1 + wz, KERB);
    box(b, x0 - wx - 0.005, S + EDGE_H - 0.03, z0 - wz - 0.005, x1 + wx + 0.005, S + EDGE_H, z1 + wz + 0.005, KERB_TOP);
  }
}
function hydrant(b: Batch, [x, z]: Pt) {
  cyl(b, 0.1, 0.42, x, S, z, RED, 8);
  b.add(new THREE.SphereGeometry(0.1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, S + 0.42, z), RED);
  b.detail(() => b.add(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6).rotateZ(Math.PI / 2).translate(x, S + 0.28, z), RED));
}

/** The commons: their sites, and at the boot the parked cars, the rec block's trees and lamps, and the people */
export function buildCommons(scene: THREE.Scene, crowd: Idle[], opts: { low: boolean }) {
  const pad = (r: Rect, m: number): Rect => [r[0] - m, r[1] - m, r[2] + m, r[3] + m];
  for (const a of AMENITIES)
    site(`trench ${a.kind} ${a.id}`, pad(a.rect, 1), (into) => {
      const b = new Batch();
      const wire = new Batch();
      DRAW[a.kind](b, a, wire);
      // Its path out to the street
      flat(b, amenityWay(a, 0.8), 0.012, PAVING);
      b.build(into);
      buildFx(wire, into);
    });
  site('trench rec block', REC.rect, (into) => {
    const b = new Batch();
    recBlock(b);
    b.build(into);
  });
  for (const y of BAYS)
    site(`trench bay ${y.id}`, y.rect, (into) => {
      const b = new Batch();
      bay(b, y);
      b.build(into, { cast: false, receive: true });
    });
  for (const blk of TRENCH_BLOCKS.filter((o) => o.row === 'B')) {
    const xs = blk.poly.map((p) => p[0]);
    const zs = blk.poly.map((p) => p[1]);
    const rect: Rect = [Math.min(...xs) - 1, Math.min(...zs) - 1, Math.max(...xs) + 1, Math.max(...zs) + 1];
    site(`trench edges ${blk.id}`, rect, (into) => {
      const b = new Batch();
      edges(b, blk.id);
      for (const h of HYDRANTS) if (h[0] >= rect[0] && h[0] <= rect[2] && h[1] >= rect[1] && h[1] <= rect[3]) hydrant(b, h);
      b.build(into);
    });
  }

  // The parked cars, a lot to a block (each swaps to its far form on its own)
  const byBlock = new Map<string, [CarId, number, number, number, string][]>();
  for (const { bay: id, car } of BAY_CARS) {
    const block = BAYS.find((y) => y.id === id)!.block;
    byBlock.set(block, [...(byBlock.get(block) ?? []), car as [CarId, number, number, number, string]]);
  }
  for (const list of byBlock.values()) parkedCars(scene, S, list);

  // The rec block's lamps (its trees are the yards', grit3d.ts)
  for (const d of Object.values(REC_DOORS)) addLamp(d.x + 2.2, d.z + 1.8, 0);
  addLamp(REC.path[0] - 0.6, REC.rect[3] - 6, Math.PI / 2);
  addLamp(REC.path[0] - 0.6, (REC.pavilion[1] + REC.pavilion[3]) / 2 - 4, Math.PI / 2);

  // The people out on the lawns (kids smaller)
  for (const p of commonsPeople(opts.low)) crowd.push({ x: p.x, z: p.z, ry: p.ry, act: p.act, y: p.seat !== undefined ? S + p.seat : undefined, scale: p.kid ? KID : undefined });
}
