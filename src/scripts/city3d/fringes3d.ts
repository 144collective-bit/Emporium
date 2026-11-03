/*
 * The slivers by the highway drawn (docs/blend-plan.md Phase 5c; the data is fringes.ts), as sites (tilework.ts),
 * from their neighbours' chunks: Southfield's (the south band and east of Kiln Lane), Sunridge's (its fringe) and
 * Westlake's (its west and north verges), each registering its own with `registerFringes()`.
 *
 * - the Kiln Lane substation: a gravel yard and drive, the palisade (rails and posts at every distance, the pales
 *   near only) with its gate and warning plates, the brick control house with its name, the transformers (fins,
 *   the conservator, the bushings), the gantry's portal frames with their insulators and wires, the busbars;
 * - the billboards: steel legs, the face (one atlas of fixed made-up copy, lit a little at night under the bloom),
 *   its frame, the walkway and the lamps over it;
 * - Sunridge's wash: the sandy bed, cobbles along its edges and boulders on its bends (near only), the culverts'
 *   concrete headwalls with their pipes and riprap; the dirt path beside it, its benches and bins;
 * - the scrub: wherever a tree could stand (and a little closer to the highway), in clumps from a seeded noise,
 *   Sunridge's desert plants (creosote, brittlebush, agave, ocotillo) on its fringe, brambles, gorse and tall grass
 *   on the rest. Phones draw half of it and leave out the pales, the flowers and the cobbles.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, lit, neon, siteMat, toon } from './kit';
import { site } from './tilework';
import { TILE } from './tiles';
import { COVER, LAMP } from './palette';
import { fromHighway, insideHighway } from './highway';
import { keepsNear, noise } from './landuse';
import { vergeY } from './verges';
import {
  BILLBOARDS, BOARD, BOARD_COPY, FRINGE_BENCHES, FRINGE_PATH, HEADWALL, HEADWALLS, REGIONS, SUBSTATION, WASH, WASH_W, legsOf, lineDist, onFringe, pathWidth,
  type Billboard, type FringeId, type Pt, type Rect,
} from './fringes';

const UP = new THREE.Vector3(0, 1, 0);
/** Pieces of a line no longer than this (a site each: nothing much longer than a tile, tileBatch()) */
const PIECE = 24;
/** The scrub comes this close to the highway's centre line (its lamps stand at 4.7) */
const SCRUB_KEEP = 5.6;

/* ---------- One atlas: the boards' faces, the substation's name, its warning plate ---------- */

const CELL = { w: 512, h: 148 };
const NAME_Y = 2 * CELL.h;
const ATLAS = canvasTex(1024, 512, (c) => {
  c.fillStyle = '#111';
  c.fillRect(0, 0, 1024, 512);
  BOARD_COPY.forEach((copy, i) => {
    const [x, y] = [(i % 2) * CELL.w, Math.floor(i / 2) * CELL.h];
    const g = c.createLinearGradient(x, y, x + CELL.w, y + CELL.h);
    g.addColorStop(0, copy.bg);
    g.addColorStop(1, '#000');
    c.fillStyle = g;
    c.fillRect(x, y, CELL.w, CELL.h);
    // (a band of the accent colour and a mark on the left, the copy beside it)
    c.fillStyle = copy.fg;
    c.fillRect(x, y + CELL.h - 14, CELL.w, 14);
    c.beginPath();
    c.arc(x + 70, y + 66, 44, 0, Math.PI * 2);
    c.lineWidth = 12;
    c.strokeStyle = copy.fg;
    c.stroke();
    c.beginPath();
    c.arc(x + 70, y + 66, 16, 0, Math.PI * 2);
    c.fillStyle = copy.ink;
    c.fill();
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    let size = 62;
    c.font = `900 ${size}px ${FONT_DISPLAY}`;
    const room = CELL.w - 150;
    const w = c.measureText(copy.head).width;
    if (w > room) {
      size = Math.floor((size * room) / w);
      c.font = `900 ${size}px ${FONT_DISPLAY}`;
    }
    c.fillStyle = copy.ink;
    c.fillText(copy.head, x + 132, y + 74);
    c.font = `700 24px ${FONT_DISPLAY}`;
    c.fillStyle = copy.fg;
    c.fillText(copy.sub, x + 134, y + 110);
  });
  // The substation's name (white on navy) and the warning plate (black on yellow)
  c.fillStyle = '#1b2a4a';
  c.fillRect(0, NAME_Y, 512, 64);
  c.strokeStyle = '#e8ecf4';
  c.lineWidth = 3;
  c.strokeRect(5, NAME_Y + 5, 502, 54);
  c.fillStyle = '#e8ecf4';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `800 34px ${FONT_DISPLAY}`;
  c.fillText(SUBSTATION.name, 256, NAME_Y + 34);
  c.fillStyle = '#f2c230';
  c.fillRect(512, NAME_Y, 128, 128);
  c.fillStyle = '#111';
  c.beginPath();
  c.moveTo(576, NAME_Y + 14);
  c.lineTo(626, NAME_Y + 88);
  c.lineTo(526, NAME_Y + 88);
  c.closePath();
  c.lineWidth = 8;
  c.strokeStyle = '#111';
  c.stroke();
  c.font = `900 50px ${FONT_DISPLAY}`;
  c.fillText('!', 576, NAME_Y + 62);
  c.font = `800 17px ${FONT_DISPLAY}`;
  c.fillText('DANGER · KEEP OUT', 576, NAME_Y + 110);
});
// (the boards lit a little at night, under the bloom, as a floodlit board reads)
const FACE = siteMat('fringe-face', lit(new THREE.MeshBasicMaterial({ map: ATLAS }), 0.95, 1.12));

/** A plane `w` x `h` showing the atlas's pixels (u0, v0)-(u1, v1), its middle at (x, y, z), looking along n */
function signPlane(w: number, h: number, px: [number, number, number, number], x: number, y: number, z: number, n: Pt) {
  const g = new THREE.PlaneGeometry(w, h);
  const [u0, v0, u1, v1] = [px[0] / 1024, 1 - px[3] / 512, px[2] / 1024, 1 - px[1] / 512];
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0);
  g.rotateY(Math.atan2(n[0], n[1]));
  return g.translate(x, y, z);
}

/* ---------- Helpers ---------- */

/** A box `w` (along a), `h`, `d` (across), turned to run along the unit a (x, z), its foot's middle at (x, y, z) */
function turnedBox(w: number, h: number, d: number, a: Pt, x: number, y: number, z: number) {
  return new THREE.BoxGeometry(w, h, d).rotateY(-Math.atan2(a[1], a[0])).translate(x, y + h / 2, z);
}
/** A band along a line, `width(x, z)` across, `y` up (or its own height at each point) */
function ribbon(pts: readonly Pt[], width: (x: number, z: number) => number, y: number | ((x: number, z: number) => number)) {
  const pos: number[] = [];
  const idx: number[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const [nx, nz] = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
    const h = width(p[0], p[1]) / 2;
    const [l0, l1]: Pt[] = [
      [p[0] + nx * h, p[1] + nz * h],
      [p[0] - nx * h, p[1] - nz * h],
    ];
    const at = (q: Pt) => (typeof y === 'number' ? y : y(q[0], q[1]));
    pos.push(l0[0], at(l0), l0[1], l1[0], at(l1), l1[1]);
    if (i) {
      const k = i * 2;
      idx.push(k - 2, k - 1, k, k - 1, k + 1, k);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // (whichever way it was wound, it faces up)
  if ((g.attributes.normal as THREE.BufferAttribute).getY(0) < 0) {
    g.setIndex(idx.map((_, i) => idx[i - (i % 3) + [0, 2, 1][i % 3]]));
    g.computeVertexNormals();
  }
  return g;
}
/** A line with a point at least every `step` */
function densify(pts: readonly Pt[], step: number): Pt[] {
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}
/** A line cut into pieces no longer than `PIECE` (sharing their ends) */
function pieces(pts: readonly Pt[]): Pt[][] {
  const out: Pt[][] = [];
  let cur: Pt[] = [pts[0]];
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    cur.push(pts[i]);
    if (len >= PIECE && i < pts.length - 1) {
      out.push(cur);
      cur = [pts[i]];
      len = 0;
    }
  }
  if (cur.length > 1) out.push(cur);
  return out;
}
const boxAround = (pts: readonly Pt[], pad: number): Rect => [
  Math.min(...pts.map((p) => p[0])) - pad,
  Math.min(...pts.map((p) => p[1])) - pad,
  Math.max(...pts.map((p) => p[0])) + pad,
  Math.max(...pts.map((p) => p[1])) + pad,
];
/** A point's own number, 0-1 (seeded from where it is) */
function hash01(x: number, z: number, k = 0) {
  let h = Math.imul(Math.round(x * 64) + k * 7919, 374761393) ^ Math.imul(Math.round(z * 64), 668265263) ^ 0x27d4eb2f;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const m4 = (x: number, y: number, z: number, yaw: number, sx: number, sy = sx, sz = sx) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, yaw), new THREE.Vector3(sx, sy, sz));

/* ---------- The paint ---------- */

const paint = () => ({
  gravel: toon(COVER.gravel),
  sand: toon(COVER.wash),
  dirt: toon(COVER.bare),
  steel: toon('#4c5560'),
  darkSteel: toon('#2f343c'),
  galv: toon('#9aa3a8'),
  palisade: toon('#2f4a3c'),
  brick: toon('#8a4c3a'),
  plinth: toon('#5e5a5a'),
  roof: toon('#3d3b40'),
  door: toon('#2c4a3a'),
  tank: toon('#6f7d72'),
  fins: toon('#5d6b61'),
  porcelain: toon('#7b4a35'),
  concrete: toon('#8d8a86'),
  pipe: toon('#1a1a1e'),
  rock: [toon('#7d7468'), toon('#8f8678'), toon('#6b655c')],
  wood: toon('#7a5a3a'),
  bin: toon('#2d4a35'),
  wire: toon('#222'),
  // The scrub: the town's brambles and gorse, the tall grass; the desert's creosote, brittlebush, agave, ocotillo
  bramble: [toon('#3d6337'), toon('#4a6e3c'), toon('#365a33')],
  gorse: toon('#5a6e34'),
  flower: toon('#e8c53a'),
  grass: toon('#8a8c55'),
  creosote: [toon('#5d6a38'), toon('#66713f')],
  brittle: toon('#8e9a72'),
  agave: toon('#6d8f80'),
  ocotillo: toon('#5f5a3c'),
  bulb: neon(LAMP.white.bulb, 0.15, 1.6),
});
type Paint = ReturnType<typeof paint>;

/* ---------- The substation ---------- */

function drawSubstation(b: Batch, P: Paint, low: boolean) {
  const S = SUBSTATION;
  const [x0, z0, x1, z1] = S.rect;
  // The yard's gravel and the drive (a hair over the ground)
  b.box(x0, 0.0, z0, x1 - x0, 0.02, z1 - z0, P.gravel);
  b.box(S.drive[0], 0, S.drive[1], S.drive[2] - S.drive[0], 0.018, S.drive[3] - S.drive[1], P.gravel);
  // The palisade: posts and two rails at every distance, the pales near only (fewer on phones)
  const { h, post } = S.fence;
  const sides: [Pt, Pt][] = [
    [
      [x0, z0],
      [x1, z0],
    ],
    [
      [x1, z0],
      [x1, z1],
    ],
    [
      [x1, z1],
      [x0, z1],
    ],
    [
      [x0, z1],
      [x0, z0],
    ],
  ];
  for (const [a, c] of sides) {
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const u: Pt = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
    const n = Math.max(1, Math.round(len / post));
    for (let k = 0; k <= n; k++) {
      const t = (k / n) * len;
      b.box(a[0] + u[0] * t - 0.06, 0, a[1] + u[1] * t - 0.06, 0.12, h + 0.05, 0.12, P.palisade);
    }
    for (const ry of [0.32, h - 0.3]) b.add(turnedBox(len, 0.07, 0.05, u, (a[0] + c[0]) / 2, ry, (a[1] + c[1]) / 2), P.palisade);
    b.detail(() => {
      const step = low ? 0.5 : 0.3;
      for (let t = step / 2; t < len; t += step) b.add(turnedBox(0.05, h - 0.05, 0.03, u, a[0] + u[0] * t, 0.02, a[1] + u[1] * t), P.palisade);
      // (the warning plates on the outside, in each side's middle)
      const out: Pt = [u[1], -u[0]];
      const [mx, mz] = [(a[0] + c[0]) / 2 + out[0] * 0.07, (a[1] + c[1]) / 2 + out[1] * 0.07];
      b.add(signPlane(0.5, 0.5, [512, NAME_Y, 640, NAME_Y + 128], mx, 1.3, mz, out), FACE);
    });
  }
  // The gate's posts (yellow-capped) either side of its leaves
  for (const gz of S.gate) {
    b.box(x0 - 0.12, 0, gz - 0.12, 0.24, h + 0.15, 0.24, P.darkSteel);
    b.box(x0 - 0.13, h + 0.15, gz - 0.13, 0.26, 0.08, 0.26, toon('#e0b22c'));
  }
  // The control house: brick on a plinth, a flat roof inside its parapet, the door, louvres, a lamp, its name
  const [hx0, hz0, hx1, hz1] = S.house.rect;
  const hh = S.house.h;
  b.box(hx0 - 0.05, 0, hz0 - 0.05, hx1 - hx0 + 0.1, 0.35, hz1 - hz0 + 0.1, P.plinth);
  b.box(hx0, 0.35, hz0, hx1 - hx0, hh - 0.35, hz1 - hz0, P.brick);
  b.box(hx0 + 0.006, hh - 0.25, hz0 + 0.006, hx1 - hx0 - 0.012, 0.2, hz1 - hz0 - 0.012, P.roof);
  for (const [px0, pz0, pw, pd] of [
    [hx0, hz0, hx1 - hx0, 0.2],
    [hx0, hz1 - 0.2, hx1 - hx0, 0.2],
    [hx0, hz0, 0.2, hz1 - hz0],
    [hx1 - 0.2, hz0, 0.2, hz1 - hz0],
  ])
    b.box(px0, hh, pz0, pw, 0.28, pd, P.plinth);
  b.box(S.house.door - 0.55, 0.35, hz1, 1.1, 2.1, 0.06, P.door);
  b.detail(() => {
    for (const lx of [hx0 + 0.8, hx1 - 1.6]) b.box(lx, 1.6, hz1, 0.8, 0.6, 0.04, P.darkSteel);
    b.box(S.house.door - 0.12, 2.6, hz1, 0.24, 0.14, 0.18, P.darkSteel);
    b.box(S.house.door - 0.08, 2.52, hz1 + 0.06, 0.16, 0.08, 0.1, P.bulb);
  });
  b.add(signPlane(4.2, 0.53, [0, NAME_Y, 512, NAME_Y + 64], hx0 - 0.01, 2.2, (hz0 + hz1) / 2, [-1, 0]), FACE);
  // The transformers: a plinth, the tank, its fins along both long sides, the conservator, the bushings
  for (const [tx0, tz0, tx1, tz1] of S.transformers) {
    const [cx, cz] = [(tx0 + tx1) / 2, (tz0 + tz1) / 2];
    b.box(tx0 - 0.25, 0, tz0 - 0.25, tx1 - tx0 + 0.5, 0.15, tz1 - tz0 + 0.5, P.concrete);
    b.box(tx0 + 0.45, 0.15, tz0 + 0.2, tx1 - tx0 - 0.9, S.body, tz1 - tz0 - 0.4, P.tank);
    b.detail(() => {
      for (const side of [tx0 + 0.2, tx1 - 0.45])
        for (let fz = tz0 + 0.35; fz < tz1 - 0.3; fz += 0.24) b.box(side, 0.3, fz, 0.25, S.body - 0.4, 0.05, P.fins);
    });
    const top = 0.15 + S.body;
    b.add(new THREE.CylinderGeometry(0.28, 0.28, tz1 - tz0 - 0.9, 10).rotateX(Math.PI / 2).translate(tx1 - 0.75, top + 0.45, cz), P.tank);
    b.box(tx1 - 0.85, top, cz - 0.1, 0.2, 0.2, 0.2, P.steel);
    for (let k = -1; k <= 1; k++) {
      const bz = cz + k * 0.62;
      b.add(new THREE.CylinderGeometry(0.1, 0.13, S.bushing, low ? 6 : 8).translate(cx - 0.3, top + S.bushing / 2, bz), P.porcelain);
      b.detail(() => {
        for (let r = 0.25; r < S.bushing; r += 0.25) b.add(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 8).translate(cx - 0.3, top + r, bz), P.porcelain);
        b.add(new THREE.SphereGeometry(0.07, 6, 4).translate(cx - 0.3, top + S.bushing + 0.04, bz), P.galv);
      });
    }
  }
  // The gantry: two portal frames, each two posts and a beam, insulators hanging under the beams, the wires between
  const F = S.frames;
  for (const fz of F.z) {
    for (const fx of F.x) b.box(fx - 0.15, 0, fz - 0.15, 0.3, F.h, 0.3, P.galv);
    b.box(F.x[0] - 0.15, F.h - 0.45, fz - 0.15, F.x[1] - F.x[0] + 0.3, 0.4, 0.3, P.galv);
    b.detail(() => {
      for (const fx of F.x) for (let y = 0.8; y < F.h - 0.6; y += 0.9) b.add(turnedBox(0.42, 0.05, 0.05, [0, 1], fx, y, fz), P.steel);
    });
  }
  for (const bx of S.bars.x) {
    b.detail(() => {
      for (const fz of F.z) b.add(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 6).translate(bx, F.h - 0.95, fz), P.porcelain);
    });
    b.add(new THREE.CylinderGeometry(0.025, 0.025, F.z[1] - F.z[0], 4, 1, true).rotateX(Math.PI / 2).translate(bx, F.h - 1.45, (F.z[0] + F.z[1]) / 2), P.wire);
    // The busbars: a tube on posts with insulators, under the wires
    const [bz0, bz1] = S.bars.z;
    for (const pz of [bz0, (bz0 + bz1) / 2, bz1]) {
      b.box(bx - 0.09, 0, pz - 0.09, 0.18, S.bars.h - 0.7, 0.18, P.galv);
      b.add(new THREE.CylinderGeometry(0.08, 0.1, 0.6, 6).translate(bx, S.bars.h - 0.4, pz), P.porcelain);
    }
    b.add(new THREE.CylinderGeometry(0.06, 0.06, bz1 - bz0 + 0.4, 6, 1, true).rotateX(Math.PI / 2).translate(bx, S.bars.h, (bz0 + bz1) / 2), P.galv);
    // (a dropper from the busbar up to its wire)
    b.add(new THREE.CylinderGeometry(0.02, 0.02, F.h - 1.45 - S.bars.h, 4, 1, true).translate(bx, (F.h - 1.45 + S.bars.h) / 2, (bz0 + bz1) / 2), P.wire);
  }
}

/* ---------- The billboards ---------- */

function drawBoard(b: Batch, P: Paint, bb: Billboard, low: boolean) {
  const n = bb.face;
  const a: Pt = [-n[1], n[0]];
  const { w, h, y } = BOARD;
  const yawFace = Math.atan2(n[0], n[1]);
  // The legs (steel posts up to the board's top), the back's steel panel and frame, the face
  for (const [lx, lz] of legsOf(bb)) b.add(turnedBox(BOARD.leg, y + h + 0.4, BOARD.leg, a, lx - n[0] * 0.25, 0, lz - n[1] * 0.25), P.steel);
  const [cx, cz] = [bb.at[0], bb.at[1]];
  b.add(turnedBox(w + 0.3, h + 0.3, 0.16, a, cx - n[0] * 0.12, y - 0.15, cz - n[1] * 0.12), P.darkSteel);
  b.add(signPlane(w, h, [(bb.copy % 2) * CELL.w, Math.floor(bb.copy / 2) * CELL.h, (bb.copy % 2) * CELL.w + CELL.w, Math.floor(bb.copy / 2) * CELL.h + CELL.h], cx + n[0] * 0.006, y + h / 2, cz + n[1] * 0.006, n), FACE);
  // (the frame's trim round the face, proud of it)
  for (const [dy, hh] of [
    [-0.12, 0.1],
    [h + 0.02, 0.1],
  ])
    b.add(turnedBox(w + 0.3, hh, 0.06, a, cx + n[0] * 0.03, y + dy, cz + n[1] * 0.03), P.darkSteel);
  // The walkway under the face, its rail, and three lamps on arms over the top, looking down at it
  b.detail(() => {
    b.add(turnedBox(w, 0.06, 0.6, a, cx + n[0] * 0.3, y - 0.4, cz + n[1] * 0.3), P.steel);
    if (!low) b.add(turnedBox(w, 0.04, 0.04, a, cx + n[0] * 0.58, y - 0.4 + 0.9, cz + n[1] * 0.58), P.steel);
    for (const t of [-0.33, 0, 0.33]) {
      const [lx, lz] = [cx + a[0] * w * t, cz + a[1] * w * t];
      b.add(turnedBox(0.05, 0.05, 0.9, a, lx + n[0] * 0.4, y + h + 0.12, lz + n[1] * 0.4), P.steel);
      b.add(new THREE.BoxGeometry(0.3, 0.1, 0.14).rotateY(yawFace).translate(lx + n[0] * 0.85, y + h + 0.1, lz + n[1] * 0.85), P.darkSteel);
      b.add(new THREE.BoxGeometry(0.24, 0.03, 0.1).rotateY(yawFace).translate(lx + n[0] * 0.85, y + h + 0.04, lz + n[1] * 0.85), P.bulb);
    }
  });
}

/* ---------- The wash, its headwalls, the path ---------- */

function drawWash(b: Batch, P: Paint, part: readonly Pt[], low: boolean) {
  b.add(ribbon(part, () => WASH_W + 0.6, 0.009), P.dirt);
  b.add(ribbon(part, () => WASH_W, 0.013), P.sand);
  // Cobbles along its edges, a boulder now and then (near only, none on phones)
  if (low) return;
  b.detail(() => {
    for (let i = 1; i < part.length; i++) {
      const [p, q] = [part[i - 1], part[i]];
      const l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      const [nx, nz] = [-(q[1] - p[1]) / l, (q[0] - p[0]) / l];
      for (let d = 0; d < l; d += 0.7) {
        const [x, z] = [p[0] + ((q[0] - p[0]) * d) / l, p[1] + ((q[1] - p[1]) * d) / l];
        for (const side of [-1, 1]) {
          const r = hash01(x, z, side + 3);
          if (r > 0.55) continue;
          const off = side * (WASH_W / 2 - 0.15 - r * 0.5);
          const s = 0.1 + r * 0.22;
          b.add(new THREE.DodecahedronGeometry(s, 0).scale(1, 0.55, 1).rotateY(r * 6).translate(x + nx * off, s * 0.25, z + nz * off), P.rock[Math.floor(r * 6) % 3]);
        }
        if (hash01(x, z, 9) < 0.05) b.add(new THREE.DodecahedronGeometry(0.45, 0).scale(1.2, 0.7, 1).rotateY(d).translate(x, 0.18, z), P.rock[1]);
      }
    }
  });
}

function drawHeadwall(b: Batch, P: Paint, hw: (typeof HEADWALLS)[number]) {
  const { at, n } = hw;
  const a: Pt = [-n[1], n[0]];
  const [cx, cz] = [at[0] - n[0] * HEADWALL.t * 0.5, at[1] - n[1] * HEADWALL.t * 0.5];
  b.add(turnedBox(HEADWALL.w, HEADWALL.h, HEADWALL.t, a, cx, 0, cz), P.concrete);
  b.add(turnedBox(HEADWALL.w + 0.1, 0.08, HEADWALL.t + 0.1, a, cx, HEADWALL.h, cz), P.concrete);
  // The pipe's mouth: a dark disc in a concrete ring on its face
  const yaw = Math.atan2(n[0], n[1]);
  b.add(new THREE.CircleGeometry(0.42, 14).rotateY(yaw).translate(at[0] + n[0] * 0.007, 0.48, at[1] + n[1] * 0.007), P.pipe);
  b.add(new THREE.RingGeometry(0.42, 0.52, 14).rotateY(yaw).translate(at[0] + n[0] * 0.014, 0.48, at[1] + n[1] * 0.014), P.concrete);
  // Riprap in front of it
  b.detail(() => {
    for (let k = 0; k < 7; k++) {
      const r = hash01(at[0], at[1], k);
      const [u, v] = [(r - 0.5) * WASH_W * 0.9, 0.5 + ((k * 0.37) % 1) * 1.2];
      const s = 0.18 + r * 0.18;
      b.add(new THREE.DodecahedronGeometry(s, 0).scale(1, 0.6, 1).translate(at[0] + a[0] * u + n[0] * v, s * 0.3, at[1] + a[1] * u + n[1] * v), P.rock[k % 3]);
    }
  });
}

function drawBench(b: Batch, P: Paint, at: Pt, face: Pt) {
  const a: Pt = [-face[1], face[0]];
  for (const t of [-0.6, 0.6]) b.add(turnedBox(0.08, 0.42, 0.42, a, at[0] + a[0] * t, 0, at[1] + a[1] * t), P.darkSteel);
  b.add(turnedBox(1.5, 0.06, 0.42, a, at[0], 0.42, at[1]), P.wood);
  b.add(turnedBox(1.5, 0.3, 0.05, a, at[0] - face[0] * 0.2, 0.55, at[1] - face[1] * 0.2), P.wood);
  // (a bin at its end)
  const [bx, bz] = [at[0] + a[0] * 1.15, at[1] + a[1] * 1.15];
  b.add(new THREE.CylinderGeometry(0.2, 0.18, 0.7, 8).translate(bx, 0.35, bz), P.bin);
}

/* ---------- The scrub ---------- */

/**
 * Whether scrub may grow at x, z: inside the highway past `SCRUB_KEEP`, closer to what the trees keep off than a
 * tree would (the clearing rule's margins `IN` less, not wobbled out), off the slivers' own things
 */
const IN = 0.6;
function wild(x: number, z: number) {
  if (!insideHighway(x, z) || fromHighway(x, z) < SCRUB_KEEP) return false;
  for (const k of keepsNear(x, z)) if (k.id !== 'highway' && k.id !== 'wash' && k.id !== 'fringe-path' && k.hit(x, z, -IN)) return false;
  return !onFringe(x, z, 0.45);
}

/** The scrub's shapes, made once a chunk */
function shapes(low: boolean) {
  const blob = new THREE.DodecahedronGeometry(0.5, 0).scale(1, 0.7, 1).translate(0, 0.28, 0);
  // A tuft: blades splayed round a point
  const blades: THREE.BufferGeometry[] = [];
  for (let k = 0; k < (low ? 4 : 6); k++) {
    const g = new THREE.ConeGeometry(0.05, 0.9, 3, 1, true).translate(0, 0.45, 0);
    g.rotateZ(0.25 + (k % 2) * 0.1).rotateY((k / (low ? 4 : 6)) * Math.PI * 2);
    blades.push(g);
  }
  const tuft = merge(blades);
  // An agave: a rosette of thick leaves leaning out
  const leaves: THREE.BufferGeometry[] = [];
  for (let k = 0; k < (low ? 6 : 9); k++) leaves.push(new THREE.ConeGeometry(0.11, 0.8, 3).scale(1, 1, 0.45).translate(0, 0.4, 0).rotateZ(0.55 + (k % 3) * 0.15).rotateY((k / (low ? 6 : 9)) * Math.PI * 2));
  const agave = merge(leaves);
  // An ocotillo: thin canes fanning up from the root
  const canes: THREE.BufferGeometry[] = [];
  for (let k = 0; k < (low ? 5 : 8); k++) canes.push(new THREE.CylinderGeometry(0.025, 0.04, 2.2, 4, 1, true).translate(0, 1.1, 0).rotateZ(0.12 + (k % 3) * 0.08).rotateY((k / (low ? 5 : 8)) * Math.PI * 2));
  const ocotillo = merge(canes);
  const dot = new THREE.IcosahedronGeometry(0.07, 0);
  return { blob, tuft, agave, ocotillo, dot };
}
function merge(gs: THREE.BufferGeometry[]) {
  const pos: number[] = [];
  for (const g of gs) {
    const ng = g.index ? g.toNonIndexed() : g;
    pos.push(...Array.from(ng.attributes.position.array as ArrayLike<number>));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.computeVertexNormals();
  return out;
}

/** The scrub in one tile of a sliver: a jittered grid, clumped by a seeded noise, each plant picked by its own number */
function drawScrub(b: Batch, P: Paint, S: ReturnType<typeof shapes>, id: FringeId, r: Rect, low: boolean) {
  const desert = id === 'sunridge';
  const step = 2.2;
  // (the copies grouped by shape and paint: one `instances()` each)
  const groups = new Map<string, { geo: THREE.BufferGeometry; mat: THREE.Material; list: THREE.Matrix4[] }>();
  const dots: THREE.Matrix4[] = [];
  const put = (geo: THREE.BufferGeometry, mat: THREE.Material, m: THREE.Matrix4) => {
    const key = `${geo.uuid}|${mat.uuid}`;
    if (!groups.has(key)) groups.set(key, { geo, mat, list: [] });
    groups.get(key)!.list.push(m);
  };
  /** One plant at x, z: `pick` which, `keep` its size */
  const plant = (x: number, z: number, pick: number, keep: number, scale: number) => {
    const yaw = pick * Math.PI * 7;
    const s = (0.7 + keep * 0.7) * scale;
    if (desert) {
      if (pick < 0.5) put(S.blob, P.creosote[Math.floor(pick * 4) % 2], m4(x, 0, z, yaw, s * 1.1, s * 0.9, s * 1.1));
      else if (pick < 0.72) {
        put(S.blob, P.brittle, m4(x, 0, z, yaw, s * 0.7, s * 0.55, s * 0.7));
        if (!low) for (let k = 0; k < 3; k++) dots.push(m4(x + Math.cos(yaw + k * 2.1) * 0.22 * s, 0.42 * s, z + Math.sin(yaw + k * 2.1) * 0.22 * s, 0, 1));
      } else if (pick < 0.88) put(S.agave, P.agave, m4(x, 0, z, yaw, s * 0.9));
      else put(S.ocotillo, P.ocotillo, m4(x, 0, z, yaw, (0.8 + keep * 0.5) * scale));
    } else {
      if (pick < 0.45) put(S.blob, P.bramble[Math.floor(pick * 7) % 3], m4(x, 0, z, yaw, s * 1.2, s, s * 1.2));
      else if (pick < 0.65) {
        put(S.blob, P.gorse, m4(x, 0, z, yaw, s, s * 0.9, s));
        if (!low) for (let k = 0; k < 4; k++) dots.push(m4(x + Math.cos(yaw + k * 1.6) * 0.3 * s, (0.4 + (k % 2) * 0.12) * s, z + Math.sin(yaw + k * 1.6) * 0.3 * s, 0, 1));
      } else put(S.tuft, P.grass, m4(x, 0, z, yaw, (0.8 + keep * 0.6) * scale));
    }
  };
  for (let gz = Math.ceil(r[1] / step) * step; gz < r[3]; gz += step)
    for (let gx = Math.ceil(r[0] / step) * step; gx < r[2]; gx += step) {
      const [j1, j2, pick, keep] = [hash01(gx, gz, 1), hash01(gx, gz, 2), hash01(gx, gz, 3), hash01(gx, gz, 4)];
      const [x, z] = [gx + (j1 - 0.5) * step * 0.9, gz + (j2 - 0.5) * step * 0.9];
      if (x < r[0] || x >= r[2] || z < r[1] || z >= r[3]) continue;
      // (in clumps: the noise on a finer lattice than the clearing rule's; the wash's banks thick with it whatever
      // the noise, as a desert wash's are; phones every other one)
      const bank = desert && lineDist(WASH, x, z) < WASH_W / 2 + 2.6;
      const clump = noise(x * 1.8 + 311, z * 1.8 - 173);
      if (!bank && (clump < 0.42 || keep > 0.45 + clump)) continue;
      if (low && hash01(gx, gz, 5) < 0.5) continue;
      if (!wild(x, z)) continue;
      plant(x, z, pick, keep, 1);
      // A clump: a plant or two more of the same kind beside it, smaller
      const more = Math.floor(hash01(gx, gz, 6) * (low ? 2 : 3));
      for (let k = 0; k < more; k++) {
        const a = hash01(gx, gz, 7 + k) * Math.PI * 2;
        const d = 0.55 + hash01(gx, gz, 9 + k) * 0.5;
        const [sx, sz] = [x + Math.cos(a) * d, z + Math.sin(a) * d];
        if (wild(sx, sz)) plant(sx, sz, Math.min(0.99, pick + (k + 1) * 0.013), hash01(gx, gz, 11 + k) * 0.6, 0.75);
      }
    }
  for (const { geo, mat, list } of groups.values()) b.instances(geo, mat, list);
  if (dots.length) b.detail(() => b.instances(S.dot, P.flower, dots));
}

/* ---------- Registering ---------- */

/** Register the slivers `ids` as sites (from their neighbour's chunk) */
export function registerFringes(ids: FringeId[], low: boolean) {
  const P = paint();
  const S = shapes(low);
  // The scrub: a site a tile of each sliver
  for (const id of ids) {
    const r = REGIONS[id];
    for (let j = Math.floor(r[1] / TILE); j * TILE < r[3]; j++)
      for (let i = Math.floor(r[0] / TILE); i * TILE < r[2]; i++) {
        const t: Rect = [Math.max(r[0], i * TILE), Math.max(r[1], j * TILE), Math.min(r[2], (i + 1) * TILE), Math.min(r[3], (j + 1) * TILE)];
        site(`fringe scrub ${id} ${i},${j}`, t, (into) => {
          const b = new Batch();
          drawScrub(b, P, S, id, t, low);
          b.build(into, { cast: false, receive: true });
        });
      }
  }
  // The billboards in these slivers
  const mine = (p: Pt) => ids.some((id) => p[0] >= REGIONS[id][0] && p[0] < REGIONS[id][2] && p[1] >= REGIONS[id][1] && p[1] < REGIONS[id][3]);
  for (const bb of BILLBOARDS)
    if (mine(bb.at))
      site(`fringe board ${bb.id}`, boxAround([bb.at], BOARD.w / 2 + 1), (into) => {
        const b = new Batch();
        drawBoard(b, P, bb, low);
        b.build(into);
      });
  if (ids.includes('south'))
    site('fringe substation', [SUBSTATION.drive[0], SUBSTATION.rect[1], SUBSTATION.rect[2], SUBSTATION.rect[3]], (into) => {
      const b = new Batch();
      drawSubstation(b, P, low);
      b.build(into);
    });
  if (ids.includes('sunridge')) {
    pieces(WASH).forEach((part, k) =>
      site(`fringe wash ${k}`, boxAround(part, WASH_W), (into) => {
        const b = new Batch();
        drawWash(b, P, part, low);
        b.build(into, { cast: false, receive: true });
      })
    );
    HEADWALLS.forEach((hw, k) =>
      site(`fringe headwall ${k}`, boxAround([hw.at], HEADWALL.w + 2), (into) => {
        const b = new Batch();
        drawHeadwall(b, P, hw);
        b.build(into);
      })
    );
    pieces(FRINGE_PATH).forEach((part, k) =>
      site(`fringe path ${k}`, boxAround(part, 2), (into) => {
        const b = new Batch();
        // (over the bank where it passes a block's eased edge, verges.ts)
        b.add(ribbon(densify(part, 0.4), pathWidth, (x, z) => vergeY(x, z) + 0.015), P.dirt);
        b.build(into, { cast: false, receive: true });
      })
    );
    FRINGE_BENCHES.forEach((bn, k) =>
      site(`fringe bench ${k}`, boxAround([bn.at], 2), (into) => {
        const b = new Batch();
        b.detail(() => drawBench(b, P, bn.at, bn.face));
        b.build(into);
      })
    );
  }
}
