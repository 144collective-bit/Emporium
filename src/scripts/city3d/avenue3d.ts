/*
 * The Trenches' three places on screen (the grit's step 3; the numbers are
 * avenue.ts, their lots riverside.ts's): each a spot with a pin and a
 * panel, built at the boot, facing north to the boardwalk and the river.
 *
 * - **Club PULSE**, the riverside's landmark: a black hall, its ground
 *   storey clad round the door's portal and lit vitrines, vertical fins up
 *   its front each with a neon tube throbbing with the beat, PULSE on a big
 *   board across them, a magenta line along the parapet; the corner pylon
 *   with the vertical PULSE on its two outer faces, neon up its edges, a
 *   cyan crown ring and a mast; the fly tower at the back with a heartbeat
 *   in neon across its face; the sky deck on the roof (its rail, the DJ
 *   booth under its canopy and SKY DECK, string lights, the dancers); the
 *   searchlights' drums and their beams (`beams()`); a wide marquee lit
 *   underneath, its bulbs chasing; the red carpet, the velvet rope on brass
 *   posts with the queue behind it, two bouncers; fins and the stage door
 *   on the cross street.
 * - **The Rusty Nail**: an old dark-brick walk-up, its ground floor a dark
 *   wood front round warm windows, its name in neon over it, a BAR blade
 *   and an OPEN sign; a couple out front.
 * - **Trench Arms**: squat red brick over a concrete ground floor, barred
 *   windows, a steel door under its shutter's housing, the hatch on the
 *   street with its counter (where the gun store opens), TRENCH ARMS in
 *   red neon with a crosshair, a camera on the corner.
 *
 * The signs are one atlas (fixed made-up copy) and the blades another; the
 * club's throbbing tubes and chasing bulbs are four materials of their
 * own, driven by the tick, the beams one more. Nothing here is solid
 * (`AVENUE_SOLIDS` is).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Batch, FONT_DISPLAY, PAL, canvasTex, fx, glowMat, lit, toon } from './kit';
import { ATLAS, INK, METAL, WOOD, cornice, dress, frameOf, glow, kit, roof, shell, soft, type Frame } from './infill';
import { SLAB as S, addPool, type Tick } from './world';
import { FLOOR, SHOP_H, type Infill, type Pt } from './downtown';
import { ARMS, BAR, CLUB, type AvenuePlace } from './avenue';
import type { Idle, Spot } from './landmarks';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** A box between two corners, given either way round */
const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: THREE.Material) =>
  b.box(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), mat);

/* ---------- The signs: one atlas, a row each ---------- */

const ROWS = [
  { text: 'PULSE', color: '#ff3bd4', glow: '#00eaff', board: '#0a0716', font: 900 },
  { text: 'THE RUSTY NAIL', color: '#ff8a3d', glow: '#ff5a1f', board: '#120c0a', font: 800 },
  { text: 'TRENCH ARMS', color: '#ff3b3b', glow: '#ff1f3b', board: '#111218', font: 900 },
  { text: 'TONIGHT · NEON NIGHTS', color: '#15121f', glow: '', board: '#f3eedf', font: 800 },
  { text: 'GUNS · GEAR · MODS', color: '#f3eedf', glow: '', board: '#1d1e27', font: 700 },
  { text: 'OPEN', color: '#ff3b5c', glow: '#ff3b5c', board: '#0b0910', font: 900 },
  { text: 'SKY DECK', color: '#00eaff', glow: '#ff3bd4', board: '#0a0716', font: 900 },
] as const;
type Row = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const SIGNS = (() => {
  const W = 1024;
  const H = 128;
  const tex = canvasTex(W, H * ROWS.length, (c) => {
    ROWS.forEach((r, i) => {
      const y = i * H;
      c.fillStyle = r.board;
      c.fillRect(0, y, W, H);
      if (r.glow) {
        c.strokeStyle = r.glow;
        c.lineWidth = 5;
        c.strokeRect(10, y + 10, W - 20, H - 20);
      }
      c.font = `${r.font} 96px ${FONT_DISPLAY}`;
      const size = Math.min(96, (96 * (W - 90)) / c.measureText(r.text).width);
      c.font = `${r.font} ${size}px ${FONT_DISPLAY}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      if (r.glow) {
        c.shadowColor = r.glow;
        c.shadowBlur = 22;
      }
      c.fillStyle = r.color;
      c.fillText(r.text, W / 2, y + H / 2 + 4);
      c.shadowBlur = 0;
    });
  });
  return lit(new THREE.MeshBasicMaterial({ map: tex, toneMapped: true }), 0.95, 1.35);
})();
/** A board facing +z showing row `row`, w x h, centred at the origin */
function sign(row: Row, w: number, h: number) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const v0 = 1 - (row + 1) / ROWS.length;
  const v1 = 1 - row / ROWS.length;
  for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) > 0.5 ? v1 - 0.004 : v0 + 0.004);
  return g;
}

/** The blades: PULSE and BAR, a letter over the next, a column each */
const BLADES = (() => {
  const cols = [
    { text: 'PULSE', color: '#ff3bd4', glow: '#00eaff' },
    { text: 'BAR', color: '#ffb347', glow: '#ff5a1f' },
  ];
  const W = 128;
  const H = 640;
  const tex = canvasTex(W * cols.length, H, (c) => {
    cols.forEach((col, i) => {
      const x = i * W;
      c.fillStyle = '#0a0716';
      c.fillRect(x, 0, W, H);
      c.strokeStyle = col.glow;
      c.lineWidth = 5;
      c.strokeRect(x + 8, 8, W - 16, H - 16);
      c.font = `900 104px ${FONT_DISPLAY}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.shadowColor = col.glow;
      c.shadowBlur = 18;
      c.fillStyle = col.color;
      const step = (H - 40) / col.text.length;
      [...col.text].forEach((ch, k) => c.fillText(ch, x + W / 2, 20 + step * (k + 0.5) + 4));
      c.shadowBlur = 0;
    });
  });
  return { mat: lit(new THREE.MeshBasicMaterial({ map: tex, toneMapped: true }), 0.95, 1.35), cols: cols.length };
})();
/** A blade facing +z showing column `col` */
function blade(col: 0 | 1, w: number, h: number) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const u0 = col / BLADES.cols;
  const u1 = (col + 1) / BLADES.cols;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) > 0.5 ? u1 - 0.004 : u0 + 0.004);
  return g;
}

/* ---------- The club's lights that move: tubes throbbing with the beat, bulbs chasing ---------- */

const BPM = 124;
/** A glowing material the tick drives (not the time of day's own list) */
const driven = (color: string) => {
  const m = new THREE.MeshBasicMaterial({ color, toneMapped: true });
  m.userData.base = new THREE.Color(color);
  return m;
};
const BEAT = { magenta: driven('#ff3bd4'), cyan: driven('#00eaff') };
const CHASE = [driven('#ffe6a8'), driven('#ffe6a8')];
/** Their geometry, gathered per material, merged and added as one mesh each */
function movers(parent: THREE.Object3D, parts: Map<THREE.Material, THREE.BufferGeometry[]>) {
  for (const [mat, geos] of parts) {
    if (!geos.length) continue;
    const mesh = new THREE.Mesh(mergeGeometries(geos, false)!, mat);
    // (moving light stays itself at every distance: lod.ts's far form leaves it be)
    mesh.userData.keep = true;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    parent.add(mesh);
  }
}

/* ---------- Club PULSE ---------- */

const CLUB_WALL = toon('#17142a');
const CLUB_TRIM = toon('#2a2444');
const CLUB_CLAD = toon('#221d38');
const GLASS = toon('#0c0b18');
const BRASS = toon('#d4a64a');
const VELVET = toon('#a0142e');
const CARPET = toon('#8c1426');
const DECK = toon('#2b2440');

/** The heartbeat across the fly tower: (u, y) from 0 to 1 along its front and up its middle band */
const ECG: Pt[] = [
  [0, 0.5],
  [0.2, 0.5],
  [0.25, 0.62],
  [0.3, 0.5],
  [0.38, 0.5],
  [0.42, 0.3],
  [0.47, 1],
  [0.52, 0],
  [0.56, 0.5],
  [0.64, 0.5],
  [0.69, 0.68],
  [0.75, 0.5],
  [1, 0.5],
];

function drawClub(b: Batch, parts: Map<THREE.Material, THREE.BufferGeometry[]>, crowd: Idle[], low: boolean) {
  const [x0, , x1] = CLUB.body;
  const top = S + CLUB.h;
  // Its front wall and its back (z), and the way out of the front: every z below is a step out of the front (F) or in from the back (R)
  const f = CLUB.out;
  const front = CLUB.wall;
  const rear = f > 0 ? CLUB.body[1] : CLUB.body[3];
  const F = (o: number) => front + f * o;
  const R = (o: number) => rear + f * o;
  // A sign facing out of the front (the atlas's boards face +z)
  const outward = (g: THREE.BufferGeometry) => (f > 0 ? g : g.rotateY(Math.PI));
  const tube = (x: number, z: number, y0: number, y1: number, mat: THREE.Material, alongZ = false, t = 0.07) =>
    parts.get(mat)!.push(new THREE.BoxGeometry(alongZ ? 0.05 : t, y1 - y0, alongZ ? t : 0.05).translate(x, (y0 + y1) / 2, z));
  /** A tube between two points in the front's plane (the heartbeat, the pylon's crown) */
  const segment = (a: THREE.Vector3, c: THREE.Vector3, mat: THREE.Material, th = 0.07) => {
    const d = c.clone().sub(a);
    const g = new THREE.BoxGeometry(th, d.length() + th, th).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()));
    parts.get(mat)!.push(g.translate((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2));
  };

  /* --- The hall: the box, its cladding, the parapet and the roof --- */
  box(b, x0, S, rear, x1, top, front, CLUB_WALL);
  // A plinth round its foot (the front and the side on the cross street) and the ground storey's cladding
  box(b, x0 - 0.05, S, R(0.3), x0, S + 0.45, F(0.05), CLUB_TRIM);
  box(b, x0 - 0.05, S, front, x1, S + 0.45, F(0.05), CLUB_TRIM);
  box(b, x0 - 0.03, S + 0.45, front, x1, S + 3.2, F(0.03), CLUB_CLAD);
  box(b, x0 - 0.03, S + 0.45, R(0.3), x0, S + 3.2, front, CLUB_CLAD);
  // The coping round the parapet
  box(b, x0 - 0.06, top, R(-0.06), x1 + 0.06, top + 0.32, R(0.12), INK);
  box(b, x0 - 0.06, top, F(-0.12), x1 + 0.06, top + 0.32, F(0.06), INK);
  box(b, x0 - 0.06, top, R(0.12), x0 + 0.12, top + 0.32, F(-0.12), INK);
  box(b, x1 - 0.12, top, R(0.12), x1 + 0.06, top + 0.32, F(-0.12), INK);
  // Magenta along the parapet's front and its side on the cross street, cyan under the coping
  box(b, x0 - 0.08, top + 0.33, F(0.02), x1 + 0.02, top + 0.38, F(0.08), glow('#ff3bd4'));
  box(b, x0 - 0.08, top + 0.33, R(0.1), x0 - 0.02, top + 0.38, F(0.08), glow('#ff3bd4'));
  box(b, x0 + 0.1, top - 0.3, F(0.03), x1 - 0.1, top - 0.26, F(0.07), glow('#00eaff'));
  // A storey line between the cladding and the fins
  box(b, x0 - 0.05, S + 3.2, front, x1 + 0.02, S + 3.34, F(0.12), CLUB_TRIM);

  /* --- The front: dark glass behind neon fins, throbbing with the beat --- */
  const p = CLUB.pylon.rect;
  const fx0 = p[2] + 0.2;
  box(b, fx0, S + 3.34, F(0.02), x1 - 0.2, top - 0.34, F(0.03), GLASS);
  CLUB.fins.forEach((x, i) => {
    box(b, x - 0.09, S + 3.34, F(0.03), x + 0.09, top - 0.34, F(0.4), INK);
    tube(x, F(0.43), S + 3.45, top - 0.45, i % 2 ? BEAT.cyan : BEAT.magenta);
  });
  // A wash of violet behind the glass, a storey up and two (lit, never see-through)
  for (const y of [S + 4.6, S + 6.6]) box(b, fx0 + 0.1, y, F(0.03), x1 - 0.3, y + 0.05, F(0.036), soft('#7b2cff'));

  // PULSE on a big board across the fins, framed
  const d = CLUB.door;
  const bw = 11.5;
  const by = S + 5.55;
  box(b, d.x - bw / 2 - 0.16, by - 1.32, F(0.42), d.x + bw / 2 + 0.16, by + 1.32, F(0.52), INK);
  b.add(outward(sign(0, bw, 2.36)).translate(d.x, by, F(0.526)), SIGNS);
  for (const y of [by - 1.38, by + 1.38]) box(b, d.x - bw / 2 - 0.2, y - 0.03, F(0.5), d.x + bw / 2 + 0.2, y + 0.03, F(0.56), glow('#ff3bd4'));

  /* --- The ground storey: the door in its portal, vitrines either side, the red carpet --- */
  box(b, d.x - d.w / 2 - 0.35, S, front, d.x + d.w / 2 + 0.35, S + 2.55, F(0.06), INK);
  box(b, d.x - d.w / 2, S, F(0.06), d.x + d.w / 2, S + 2.2, F(0.07), GLASS);
  box(b, d.x - 0.015, S, F(0.07), d.x + 0.015, S + 2.2, F(0.08), METAL);
  for (const o of [-0.22, 0.22]) box(b, d.x + o - 0.02, S + 0.9, F(0.07), d.x + o + 0.02, S + 1.5, F(0.12), BRASS);
  box(b, d.x - d.w / 2 - 0.35, S + 2.55, F(0.06), d.x + d.w / 2 + 0.35, S + 2.6, F(0.1), soft('#ff3bd4'));
  for (const o of [-1, 1]) box(b, d.x + o * (d.w / 2 + 0.22) - 0.03, S + 0.1, F(0.06), d.x + o * (d.w / 2 + 0.22) + 0.03, S + 2.5, F(0.1), soft('#00eaff'));
  for (const [a, c] of [
    [fx0 + 0.4, d.x - d.w / 2 - 0.7],
    [d.x + d.w / 2 + 0.7, x1 - 0.5],
  ] as Pt[])
    if (c - a > 0.8) {
      box(b, a, S + 0.6, front, c, S + 2.6, F(0.04), GLASS);
      box(b, a + 0.1, S + 0.68, F(0.04), c - 0.1, S + 0.72, F(0.05), soft('#7b2cff'));
      box(b, a + 0.1, S + 2.5, F(0.04), c - 0.1, S + 2.54, F(0.05), soft('#ff3bd4'));
    }
  const cp = CLUB.carpet;
  box(b, cp[0], S + 0.006, cp[1], cp[2], S + 0.018, cp[3], CARPET);
  box(b, cp[0] - 0.05, S + 0.006, cp[1], cp[0], S + 0.022, cp[3], BRASS);
  box(b, cp[2], S + 0.006, cp[1], cp[2] + 0.05, S + 0.022, cp[3], BRASS);

  /* --- The marquee: a wide canopy out over the forecourt, lit underneath, its letterboard, bulbs chasing round it --- */
  const m = CLUB.marquee;
  const mz = m.z;
  const reach = (mz - front) * f;
  box(b, m.x0, S + m.y, front, m.x1, S + m.y + 0.42, mz, INK);
  box(b, m.x0 + 0.08, S + m.y - 0.012, F(0.08), m.x1 - 0.08, S + m.y, mz - f * 0.08, soft('#ffd9f4'));
  box(b, m.x0 - 0.02, S + m.y + 0.42, front, m.x1 + 0.02, S + m.y + 0.46, mz - f * 0.02, CLUB_TRIM);
  b.add(outward(sign(3, m.x1 - m.x0 - 0.7, 0.32)).translate((m.x0 + m.x1) / 2, S + m.y + 0.21, mz + f * 0.006), SIGNS);
  for (const e of [-1, 1]) {
    // Two rods each side back up to the wall
    for (const k of [0.4, 2.6]) {
      const x = (e < 0 ? m.x0 : m.x1) - e * k;
      const g = new THREE.CylinderGeometry(0.025, 0.025, Math.hypot(mz - front, 1.6), 5);
      g.rotateX(-Math.atan2(mz - front, 1.6)).translate(x, S + m.y + 0.42 + 0.8, (front + mz) / 2);
      b.add(g, METAL);
    }
  }
  const bulb = new THREE.SphereGeometry(low ? 0.045 : 0.04, low ? 5 : 6, 4);
  let n = 0;
  const put = (x: number, y: number, z: number) => parts.get(CHASE[n++ % 2])!.push(bulb.clone().translate(x, y, z));
  for (const y of [S + m.y + 0.47, S + m.y - 0.04]) {
    for (let x = m.x0 + 0.1; x <= m.x1 - 0.1 + 1e-6; x += low ? 0.34 : 0.22) put(x, y, mz + f * 0.03);
    for (const x of [m.x0 - 0.03, m.x1 + 0.03]) for (let o = 0.25; o < reach - 0.05; o += low ? 0.34 : 0.22) put(x, y, F(o));
  }
  addPool(d.x, F(1.4), 4.6, S + 0.03);

  /* --- The pylon on the corner: the vertical PULSE on its two outer faces, neon up its edges, a crown and a mast --- */
  const ph = S + CLUB.pylon.h;
  const [pz0, pz1] = [p[1], p[3]];
  box(b, p[0], S, pz0, p[2], ph, pz1, CLUB_WALL);
  box(b, p[0] - 0.05, S, pz0 - 0.05, p[2] + 0.05, S + 0.5, pz1 + 0.05, CLUB_TRIM);
  // The coping and the neon round the top
  box(b, p[0] - 0.08, ph, pz0 - 0.08, p[2] + 0.08, ph + 0.26, pz1 + 0.08, INK);
  const pzOut = f > 0 ? pz1 : pz0;
  // (the outer corner: on the cross street and out of the front)
  for (const [x, z] of [
    [p[0] - 0.04, pzOut + f * 0.04],
    [p[2] + 0.04, pzOut + f * 0.04],
    [p[0] - 0.04, (f > 0 ? pz0 : pz1) - f * 0.04],
  ] as Pt[])
    tube(x, z, S + 0.6, ph - 0.2, BEAT.magenta, false, 0.06);
  const blH = CLUB.blade.h - 1.6;
  const blY = S + 1.6 + blH / 2;
  // The sign out of the front (framed), and the one on the cross street
  const pcx = (p[0] + p[2]) / 2;
  const pcz = (pz0 + pz1) / 2;
  box(b, pcx - 0.82, blY - blH / 2 - 0.12, pzOut, pcx + 0.82, blY + blH / 2 + 0.12, pzOut + f * 0.08, INK);
  b.add(outward(blade(0, 1.5, blH)).translate(pcx, blY, pzOut + f * 0.086), BLADES.mat);
  box(b, p[0] - 0.08, blY - blH / 2 - 0.12, pcz - 0.82, p[0], blY + blH / 2 + 0.12, pcz + 0.82, INK);
  b.add(blade(0, 1.5, blH).rotateY(-Math.PI / 2).translate(p[0] - 0.086, blY, pcz), BLADES.mat);
  // The crown: a ring of cyan over the top, the mast and its beacon
  const ring = new THREE.TorusGeometry(1.05, 0.05, 6, low ? 16 : 28).rotateX(Math.PI / 2).translate(pcx, ph + 0.55, pcz);
  parts.get(BEAT.cyan)!.push(ring);
  for (const [dx, dz] of [
    [-0.75, -0.75],
    [0.75, -0.75],
    [0.75, 0.75],
    [-0.75, 0.75],
  ])
    b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 5).translate(pcx + dx, ph + 0.27, pcz + dz), METAL);
  b.add(new THREE.CylinderGeometry(0.035, 0.06, CLUB.pylon.top - CLUB.pylon.h - 0.1, 6).translate(pcx, ph + (CLUB.pylon.top - CLUB.pylon.h) / 2, pcz), METAL);
  b.add(new THREE.SphereGeometry(0.08, 8, 6).translate(pcx, S + CLUB.pylon.top - 0.04, pcz), glow('#ff3b3b'));

  /* --- The fly tower at the back: its heartbeat in neon across the front, plant on its roof --- */
  const fl = CLUB.fly.rect;
  const fh = S + CLUB.fly.h;
  const flyFront = f > 0 ? fl[3] : fl[1];
  const flyRear = f > 0 ? fl[1] : fl[3];
  box(b, fl[0], top - 0.1, flyRear, fl[2], fh, flyFront, CLUB_WALL);
  box(b, fl[0] - 0.06, fh, flyRear - f * 0.06, fl[2] + 0.06, fh + 0.26, flyFront + f * 0.06, INK);
  box(b, fl[0] + 0.1, fh - 0.25, flyFront + f * 0.02, fl[2] - 0.1, fh - 0.2, flyFront + f * 0.06, glow('#ff3bd4'));
  const [eu0, eu1] = [fl[0] + 0.8, fl[2] - 0.8];
  const [ey0, ey1] = [top + 0.2, fh - 0.4];
  const ez = flyFront + f * 0.06;
  const ecg = ECG.map(([u, y]) => V(eu0 + (eu1 - eu0) * u, ey0 + (ey1 - ey0) * y, ez));
  for (let i = 1; i < ecg.length; i++) segment(ecg[i - 1], ecg[i], i >= 5 && i <= 8 ? BEAT.magenta : BEAT.cyan, 0.13);
  b.detail(() => {
    for (const [u, w] of [
      [0.25, 1.4],
      [0.62, 1],
    ] as Pt[]) {
      const cx = fl[0] + (fl[2] - fl[0]) * u;
      box(b, cx - w / 2, fh, R(1.2), cx + w / 2, fh + 0.7, R(2.4), METAL);
    }
    b.add(new THREE.CylinderGeometry(0.25, 0.25, 0.9, 10).translate(fl[2] - 1.2, fh + 0.45, R(1.4)), METAL);
  });

  /* --- The sky deck: its floor and railing, the DJ booth under a canopy, string lights, the dancers --- */
  const dk = CLUB.deck.rect;
  const dz0 = Math.min(dk[1], dk[3]);
  const dz1 = Math.max(dk[1], dk[3]);
  const deckY = top + 0.06;
  box(b, dk[0], top, dz0, dk[2], deckY, dz1, DECK);
  b.detail(() => {
    // The rail: posts every metre or so, a top rail, a mid rail, round the front and the sides
    const rail = toon('#c9c4e6');
    const ry = deckY + 0.55;
    const edge = f > 0 ? dz1 : dz0;
    box(b, dk[0], ry - 0.03, edge - 0.03, dk[2], ry + 0.03, edge + 0.03, rail);
    box(b, dk[0], deckY + 0.25, edge - 0.02, dk[2], deckY + 0.29, edge + 0.02, rail);
    for (const x of [dk[0], dk[2]]) box(b, x - 0.03, ry - 0.03, dz0, x + 0.03, ry + 0.03, dz1, rail);
    for (let x = dk[0]; x <= dk[2] + 1e-6; x += low ? 2.2 : 1.1) box(b, x - 0.025, deckY, edge - 0.025, x + 0.025, ry, edge + 0.025, rail);
  });
  // The booth: its desk lit along the front, the decks on it, a canopy on four posts, SKY DECK over it
  const bt = CLUB.deck.booth;
  const [bz0, bz1] = [Math.min(bt[1], bt[3]), Math.max(bt[1], bt[3])];
  const bfront = f > 0 ? bz1 : bz0;
  box(b, bt[0] + 0.3, deckY, bz0 + 0.5, bt[2] - 0.3, deckY + 0.95, bz1 - 0.5, INK);
  box(b, bt[0] + 0.35, deckY + 0.2, bfront - f * 0.5, bt[2] - 0.35, deckY + 0.8, bfront - f * 0.48, soft('#ff3bd4'));
  b.detail(() => {
    for (const o of [-0.55, 0.55]) b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 14).translate((bt[0] + bt[2]) / 2 + o, deckY + 0.97, (bz0 + bz1) / 2), METAL);
    // Speakers either side
    for (const x of [bt[0] - 0.2, bt[2] + 0.2]) box(b, x - 0.3, deckY, bz0 + 0.6, x + 0.3, deckY + 1.3, bz1 - 0.6, CLUB_TRIM);
  });
  for (const x of [bt[0], bt[2]]) for (const z of [bz0, bz1]) b.add(new THREE.CylinderGeometry(0.04, 0.04, 2.1, 6).translate(x, deckY + 1.05, z), METAL);
  box(b, bt[0] - 0.15, deckY + 2.1, bz0 - 0.15, bt[2] + 0.15, deckY + 2.22, bz1 + 0.15, INK);
  box(b, bt[0] - 0.17, deckY + 2.14, bfront + f * 0.15, bt[2] + 0.17, deckY + 2.19, bfront + f * 0.19, glow('#00eaff'));
  box(b, (bt[0] + bt[2]) / 2 - 1.16, deckY + 2.22, (bz0 + bz1) / 2 - 0.03, (bt[0] + bt[2]) / 2 + 1.16, deckY + 2.66, (bz0 + bz1) / 2 + 0.03, INK);
  b.add(outward(sign(6, 2.2, 0.36)).translate((bt[0] + bt[2]) / 2, deckY + 2.45, (bz0 + bz1) / 2 + f * 0.036), SIGNS);
  // String lights from the booth's canopy out to poles at the deck's front corners
  const poles: Pt[] = [
    [dk[0] + 0.3, f > 0 ? dz1 - 0.3 : dz0 + 0.3],
    [dk[2] - 0.3, f > 0 ? dz1 - 0.3 : dz0 + 0.3],
    [(dk[0] + dk[2]) / 2, f > 0 ? dz1 - 0.3 : dz0 + 0.3],
  ];
  for (const [x, z] of poles) b.add(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 6).translate(x, deckY + 1.2, z), METAL);
  const warm = glow('#ffd27a');
  const pink = glow('#ff7ad9');
  b.detail(() => {
    const from: Pt[] = [
      [bt[0], (bz0 + bz1) / 2],
      [bt[2], (bz0 + bz1) / 2],
      [(bt[0] + bt[2]) / 2, (bz0 + bz1) / 2],
    ];
    poles.forEach(([px, pz], i) => {
      const [ax, az] = from[i];
      const k = low ? 8 : 14;
      for (let j = 0; j <= k; j++) {
        const t = j / k;
        const y = deckY + 2.2 + (2.4 - 2.2) * t - Math.sin(t * Math.PI) * 0.45;
        b.add(new THREE.SphereGeometry(0.045, 5, 4).translate(ax + (px - ax) * t, y, az + (pz - az) * t), j % 2 ? pink : warm);
      }
    });
  });
  for (const q of CLUB.deck.people.slice(0, low ? 5 : CLUB.deck.people.length)) crowd.push({ x: q.x, z: q.z, y: deckY, ry: q.yaw, act: 'look' });

  /* --- The searchlights' drums on the parapet (their beams are their own: buildAvenue) --- */
  for (const [x, z] of CLUB.searchlights) {
    box(b, x - 0.35, top + 0.32, z - 0.35, x + 0.35, top + 0.5, z + 0.35, METAL);
    b.add(new THREE.CylinderGeometry(0.26, 0.3, 0.45, 12).translate(x, top + 0.72, z), INK);
    b.add(new THREE.CircleGeometry(0.22, 12).rotateX(-Math.PI / 2).translate(x, top + 0.951, z), soft('#e8f6ff'));
  }

  /* --- The side on the cross street: fins and tubes, the stage door under its own little canopy --- */
  const side = x0;
  for (let o = 1.2, k = 0; o < Math.abs(rear - front) - 0.8; o += 1.7, k++) {
    const z = F(-o);
    box(b, side - 0.36, S + 3.34, z - 0.08, side, top - 0.34, z + 0.08, INK);
    tube(side - 0.39, z, S + 3.45, top - 0.45, k % 2 ? BEAT.magenta : BEAT.cyan, true);
  }
  const sd = R(3.2);
  box(b, side - 0.05, S, sd - 0.6, side, S + 2.1, sd + 0.6, toon('#30313d'));
  box(b, side - 0.75, S + 2.2, sd - 0.85, side, S + 2.3, sd + 0.85, INK);
  b.add(new THREE.SphereGeometry(0.06, 8, 6).translate(side - 0.12, S + 2.05, sd + 0.75), glow('#ffb347'));
  addPool(side - 0.6, sd, 2, S + 0.03);

  /* --- The velvet rope on brass posts, the queue behind it, the bouncers by the door --- */
  const r = CLUB.rope;
  for (const x of r.posts) {
    b.add(new THREE.CylinderGeometry(0.13, 0.16, 0.04, 10).translate(x, S + 0.02, r.z), BRASS);
    b.add(new THREE.CylinderGeometry(0.03, 0.03, r.h - 0.08, 6).translate(x, S + (r.h - 0.08) / 2, r.z), BRASS);
    b.add(new THREE.SphereGeometry(0.06, 8, 6).translate(x, S + r.h - 0.04, r.z), BRASS);
  }
  for (let i = 0; i + 1 < r.posts.length; i++) {
    const [a, c] = [r.posts[i], r.posts[i + 1]];
    // A sag in each run: two halves dipping to the middle
    const mid = (a + c) / 2;
    const dip = 0.12;
    for (const [pa, q] of [
      [a, mid],
      [mid, c],
    ] as Pt[]) {
      const len = Math.hypot(q - pa, dip);
      const g = new THREE.CylinderGeometry(0.022, 0.022, len, 5).rotateZ(Math.PI / 2 + (q === mid ? -1 : 1) * Math.atan2(dip, q - pa));
      b.add(g.translate((pa + q) / 2, S + r.h - 0.14 - dip / 2, r.z), VELVET);
    }
  }
  for (const q of CLUB.queue.slice(0, low ? 6 : CLUB.queue.length)) crowd.push({ x: q.x, z: q.z, ry: q.yaw, act: 'queue' });
  for (const q of CLUB.bouncers) crowd.push({ x: q.x, z: q.z, ry: q.yaw, act: 'guard', scale: 1.1 });
}

/** The searchlights' beams: long soft cones from the drums, sweeping the sky at night (their own material; still under reduced motion) */
function beams(group: THREE.Group, tick: (f: Tick) => void, reduced: boolean) {
  const L = 34;
  const g = new THREE.CylinderGeometry(1.9, 0.18, L, 16, 1, true).translate(0, L / 2, 0);
  // Fading out towards the tip: vertex alpha
  const pos = g.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) col.set([1, 1, 1, Math.max(0, 1 - pos.getY(i) / L) ** 1.6], i * 4);
  g.setAttribute('color', new THREE.BufferAttribute(col, 4));
  const mat = new THREE.MeshBasicMaterial({ color: '#cfe9ff', vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const top = S + CLUB.h + 0.85;
  const lights = CLUB.searchlights.map(([x, z], i) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, top, z);
    const m = fx(new THREE.Mesh(g, mat));
    m.userData.keep = true;
    m.frustumCulled = false;
    pivot.add(m);
    pivot.userData.keep = true;
    group.add(pivot);
    return { pivot, ph: i * 2.1 };
  });
  tick(({ t, night }) => {
    mat.opacity = 0.085 * night;
    const on = night > 0.05;
    for (const l of lights) {
      l.pivot.visible = on;
      if (!on) continue;
      const a = reduced ? l.ph : t * 0.35 + l.ph;
      // Leaning out over the river, swinging side to side
      l.pivot.rotation.set(-0.42 + Math.sin(a * 0.7) * 0.12, 0, Math.sin(a) * 0.55);
    }
  });
}

/* ---------- The bar and the gun store: brick buildings in their lots' frames (infill.ts's kit) ---------- */

/** A place's building in infill's terms (its frame: u along the front, v out of it) */
const asInfill = (p: AvenuePlace): Infill => ({ box: p.lot, h: p.h, face: p.face, seed: 0, type: 'shop', floors: Math.round((p.h - SHOP_H) / FLOOR), front: Math.abs(p.street - p.wall), solids: [] });
/** Where x is along its front (u runs along x facing south, back along it facing north) */
const uOf = (F: Frame, x: number) => (x - F.L[0]) * F.t[0];

function drawBar(b: Batch, crowd: Idle[], low: boolean) {
  const F = frameOf(asInfill(BAR));
  const k = kit(b, F);
  const { w } = F;
  const top = S + BAR.h;
  const fascia = 0.5;
  const upper = S + SHOP_H + fascia;
  const trim = toon('#bfb2a6');
  shell(k, F, top, ATLAS.wall.brickDark, ATLAS.ground.shopWarm, upper, 0.55);
  dress(k, w, upper, top, Math.round((top - upper) / FLOOR), trim);
  cornice(k, w, top, trim, low);
  roof(k, F, top, toon('#3a2224'));
  const du = uOf(F, BAR.door.x);
  const dw = BAR.door.w;
  k.all(() => {
    // The fascia, its name in neon on it
    k.lbox(0, w, S + SHOP_H, upper, 0, 0.09, toon('#140e0c'));
    k.put(sign(1, w - 0.3, fascia - 0.12).translate(w / 2, S + SHOP_H + fascia / 2, 0.096), SIGNS);
    // The dark wood front: posts, the riser under the windows, the door
    for (const u of [0, du - dw / 2 - 0.12, du + dw / 2, w - 0.12]) k.lbox(u, u + 0.12, S, S + SHOP_H, 0.006, 0.07, WOOD);
    k.lbox(0, w, S, S + 0.45, 0.006, 0.06, toon('#3b2418'));
    k.lbox(du - dw / 2, du + dw / 2, S, S + 1.12, 0.006, 0.03, toon('#24140e'));
  });
  // A lamp over the door, the OPEN sign in the window, a brass plate
  k.lbox(du - 0.1, du + 0.1, S + 1.18, S + 1.22, 0.07, 0.2, METAL);
  k.put(new THREE.SphereGeometry(0.05, 8, 6).translate(du, S + 1.14, 0.16), glow('#ffb347'));
  k.put(sign(5, 0.5, 0.16).translate(du + dw / 2 + 0.75, S + 0.85, 0.062), SIGNS);
  k.lbox(du - dw / 2 - 0.42, du - dw / 2 - 0.2, S + 0.7, S + 0.9, 0.07, 0.08, BRASS);
  // The BAR blade out over the sidewalk, at the far end
  const bu = w - 0.25;
  k.all(() => {
    k.lbox(bu - 0.06, bu + 0.06, S + 1.75, S + 3.25, 0.05, 0.75, INK);
    for (const s of [1, -1]) k.put(blade(1, 0.62, 1.42).rotateY((s * Math.PI) / 2).translate(bu + s * 0.065, S + 2.5, 0.42), BLADES.mat);
  });
  k.lbox(bu - 0.03, bu + 0.03, S + 1.7, S + 1.75, 0, 0.5, METAL);
  k.lbox(bu - 0.03, bu + 0.03, S + 3.25, S + 3.3, 0, 0.5, METAL);
  // A barrel out front; two regulars chatting by it
  k.put(new THREE.CylinderGeometry(0.2, 0.2, 0.55, low ? 8 : 12).translate(0.45, S + 0.28, 0.42), WOOD);
  if (!low) for (const y of [0.12, 0.42]) k.put(new THREE.CylinderGeometry(0.205, 0.205, 0.04, 12).translate(0.45, S + y, 0.42), METAL);
  // (u along the front in world x, and the way along it)
  const ux = (u: number) => (BAR.out > 0 ? BAR.lot[0] + u : BAR.lot[2] - u);
  const pz = BAR.street + BAR.out * 0.45;
  const ry = (BAR.out * Math.PI) / 2;
  crowd.push({ x: ux(1.2), z: pz, ry, act: 'chat' }, { x: ux(1.9), z: pz, ry: -ry, act: 'chat' });
}
function drawArms(b: Batch, low: boolean) {
  const F = frameOf(asInfill(ARMS));
  const k = kit(b, F);
  const { w } = F;
  const top = S + ARMS.h;
  const fascia = 0.45;
  const upper = S + SHOP_H + fascia;
  const trim = toon('#a7a3b4');
  const CONCRETE = toon('#5c5a68');
  shell(k, F, top, ATLAS.wall.brick, null, upper, 0.15);
  dress(k, w, upper, top, Math.round((top - upper) / FLOOR), trim);
  roof(k, F, top, toon('#3b3a48'), 0.3);
  const du = uOf(F, ARMS.door.x);
  const dw = ARMS.door.w;
  const [h0, h1] = [uOf(F, ARMS.hatch.x0), uOf(F, ARMS.hatch.x1)].sort((a, c) => a - c);
  const hy = S + ARMS.hatch.y;
  const hh = ARMS.hatch.h;
  k.all(() => {
    // The concrete ground floor, the fascia with TRENCH ARMS in red neon
    k.lbox(0, w, S, S + SHOP_H, 0.006, 0.05, CONCRETE);
    k.lbox(0, w, S + SHOP_H, upper, 0, 0.09, toon('#111218'));
    k.put(sign(2, w - 1.1, fascia - 0.1).translate(w / 2 - 0.4, S + SHOP_H + fascia / 2, 0.096), SIGNS);
    // The steel door, its shutter's housing over it
    k.lbox(du - dw / 2, du + dw / 2, S, S + 1.1, 0.05, 0.065, toon('#30313d'));
    k.lbox(du - dw / 2 - 0.08, du + dw / 2 + 0.08, S + 1.1, S + 1.22, 0.05, 0.16, METAL);
    // The hatch: lit inside, its steel frame, the counter jutting out, the grille's housing over it
    k.lbox(h0, h1, hy, hy + hh, 0.05, 0.056, soft('#ffd9a0'));
    k.lbox(h0 - 0.08, h1 + 0.08, hy - 0.06, hy, 0.05, 0.32, METAL);
    k.lbox(h0 - 0.08, h1 + 0.08, hy + hh, hy + hh + 0.1, 0.05, 0.14, METAL);
    for (const u of [h0 - 0.08, h1]) k.lbox(u, u + 0.08, hy, hy + hh, 0.05, 0.1, METAL);
    // GUNS · GEAR · MODS on a board over the fascia
    const gw = 2.2;
    k.lbox(w / 2 - gw / 2 - 0.05, w / 2 + gw / 2 + 0.05, upper + 0.08, upper + 0.36, 0, 0.05, toon('#1d1e27'));
    k.put(sign(4, gw, 0.24).translate(w / 2, upper + 0.22, 0.056), SIGNS);
  });
  // The barred window between the door and the hatch, dark behind
  const [w0, w1] = [du + dw / 2 + 0.25, h0 - 0.3];
  if (w1 - w0 > 0.3) {
    k.lbox(w0, w1, S + 0.5, S + 1.05, 0.05, 0.056, toon('#1a1a26'));
    for (let u = w0 + 0.08; u < w1 - 0.04; u += 0.12) k.lbox(u - 0.012, u + 0.012, S + 0.5, S + 1.05, 0.056, 0.075, METAL);
  }
  // The bars on the hatch too, a small window the other side of the door
  for (let u = h0 + 0.1; u < h1 - 0.05; u += low ? 0.24 : 0.16) k.lbox(u - 0.01, u + 0.01, hy + hh * 0.55, hy + hh, 0.056, 0.07, METAL);
  if (du - dw / 2 > 0.7) {
    k.lbox(0.2, du - dw / 2 - 0.2, S + 0.55, S + 1.05, 0.05, 0.056, toon('#1a1a26'));
    for (let u = 0.28; u < du - dw / 2 - 0.22; u += 0.12) k.lbox(u - 0.012, u + 0.012, S + 0.55, S + 1.05, 0.056, 0.075, METAL);
  }
  // The crosshair at the sign's end, in red neon
  const cu = w - 0.45;
  const cy = S + SHOP_H + fascia / 2;
  k.all(() => {
    k.put(new THREE.TorusGeometry(0.16, 0.018, 6, 20).translate(cu, cy, 0.12), glow('#ff1f3b'));
    k.lbox(cu - 0.24, cu + 0.24, cy - 0.012, cy + 0.012, 0.1, 0.12, glow('#ff1f3b'));
    k.lbox(cu - 0.012, cu + 0.012, cy - 0.24, cy + 0.24, 0.1, 0.12, glow('#ff1f3b'));
  });
  // The camera on the corner, a steel shutter rolled up over an upper window
  k.lbox(w - 0.2, w - 0.05, top - 0.5, top - 0.42, 0, 0.3, METAL);
  k.lbox(w - 0.22, w - 0.04, top - 0.62, top - 0.48, 0.2, 0.42, toon('#d6d2ea'));
  k.put(new THREE.SphereGeometry(0.025, 6, 4).translate(w - 0.13, top - 0.55, 0.43), glow('#ff3b3b'));
}

/* ---------- The places ---------- */

export function buildAvenue(scene: THREE.Scene, crowd: Idle[], opts: { tick: (f: Tick) => void; reduced: boolean; low: boolean }): { spots: Spot[] } {
  const parts = new Map<THREE.Material, THREE.BufferGeometry[]>([...Object.values(BEAT), ...CHASE].map((m) => [m, []]));
  const make = (p: AvenuePlace, draw: (b: Batch) => void, radius: number, size: number, pinY: number): Spot => {
    const group = new THREE.Group();
    group.name = p.id;
    scene.add(group);
    const b = new Batch();
    draw(b);
    b.build(group);
    const [x0, z0, x1, z1] = p.lot;
    const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius, radius + 0.2, 64), glowMat(PAL.cyan, 0, null));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(cx, S + 0.05, cz + p.out * 0.6);
    group.add(fx(ring));
    return { id: p.id, group, focus: V(cx, 2, cz), size, pin: V(cx, S + pinY, cz), ring, faces: p.face === 'n' ? ('n' as const) : undefined };
  };
  const club = make(CLUB, (b) => drawClub(b, parts, crowd, opts.low), 13, 34, CLUB.pylon.top + 0.8);
  movers(club.group, parts);
  beams(club.group, opts.tick, opts.reduced);
  const bar = make(BAR, (b) => drawBar(b, crowd, opts.low), 4.4, 10, BAR.h + 1.6);
  const arms = make(ARMS, (b) => drawArms(b, opts.low), 4.4, 10, ARMS.h + 1.6);

  // The tubes throb with the club's beat and the bulbs chase, brighter at night; under reduced motion they hold still
  opts.tick(({ t, night }) => {
    const level = 1 + 1.4 * night;
    const beat = opts.reduced ? 1 : 0.72 + 0.28 * Math.exp(-((t * BPM) / 60 - Math.floor((t * BPM) / 60)) * 4);
    for (const m of Object.values(BEAT)) m.color.copy(m.userData.base).multiplyScalar(level * beat);
    const on = opts.reduced ? 0 : Math.floor(t * 5) % 2;
    CHASE.forEach((m, i) => m.color.copy(m.userData.base).multiplyScalar(level * (opts.reduced || i === on ? 1 : 0.3)));
  });
  return { spots: [club, bar, arms] };
}
