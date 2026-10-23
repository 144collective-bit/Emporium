/*
 * Trench Avenue's places on screen (the grit's step 3; the numbers are
 * avenue.ts): three places like The Block, each a spot with a pin and a
 * panel, built at the boot.
 *
 * - **Club PULSE**: a black box on the corner, neon tubes up its front
 *   that throb with the beat (still under reduced motion), a magenta line
 *   along its parapet, PULSE on a big board, the vertical blade on its
 *   corner reaching over the roof, the marquee over the door with its
 *   bulbs chasing, a velvet rope on brass posts with the queue behind it
 *   and the bouncer on the door.
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
 * own, driven by the tick. Nothing here is solid (`AVENUE_SOLIDS` is).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Batch, FONT_DISPLAY, PAL, canvasTex, fx, glowMat, lit, neon, toon } from './kit';
import { ATLAS, INK, METAL, WOOD, cornice, dress, frameOf, glow, kit, roof, shell, soft, type Frame } from './infill';
import { SLAB as S, addPool, type Tick } from './world';
import { FLOOR, SHOP_H, type Infill, type Pt } from './downtown';
import { ARMS, BAR, CLUB, type AvenuePlace } from './avenue';
import type { Idle, Spot } from './landmarks';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: THREE.Material) => b.box(x0, y0, z0, x1 - x0, y1 - y0, z1 - z0, mat);

/* ---------- The signs: one atlas, a row each ---------- */

const ROWS = [
  { text: 'PULSE', color: '#ff3bd4', glow: '#00eaff', board: '#0a0716', font: 900 },
  { text: 'THE RUSTY NAIL', color: '#ff8a3d', glow: '#ff5a1f', board: '#120c0a', font: 800 },
  { text: 'TRENCH ARMS', color: '#ff3b3b', glow: '#ff1f3b', board: '#111218', font: 900 },
  { text: 'TONIGHT · NEON NIGHTS', color: '#15121f', glow: '', board: '#f3eedf', font: 800 },
  { text: 'GUNS · GEAR · MODS', color: '#f3eedf', glow: '', board: '#1d1e27', font: 700 },
  { text: 'OPEN', color: '#ff3b5c', glow: '#ff3b5c', board: '#0b0910', font: 900 },
] as const;
type Row = 0 | 1 | 2 | 3 | 4 | 5;
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
const GLASS = toon('#0c0b18');
const BRASS = toon('#d4a64a');
const VELVET = toon('#a0142e');

function drawClub(b: Batch, parts: Map<THREE.Material, THREE.BufferGeometry[]>, crowd: Idle[], low: boolean) {
  const [x0, z0, x1, z1] = CLUB.body;
  const top = S + CLUB.h;
  const front = z1;
  // The box, a plinth round its foot, the parapet's coping and the roof inside it
  box(b, x0, S, z0, x1, top, z1, CLUB_WALL);
  box(b, x0 - 0.04, S, z0 + 0.3, x0, S + 0.45, z1 + 0.04, CLUB_TRIM);
  box(b, x0 - 0.04, S, z1, x1, S + 0.45, z1 + 0.04, CLUB_TRIM);
  box(b, x0 - 0.06, top, z0 - 0.06, x1 + 0.06, top + 0.3, z0 + 0.12, INK);
  box(b, x0 - 0.06, top, z1 - 0.12, x1 + 0.06, top + 0.3, z1 + 0.06, INK);
  box(b, x0 - 0.06, top, z0 + 0.12, x0 + 0.12, top + 0.3, z1 - 0.12, INK);
  box(b, x1 - 0.12, top, z0 + 0.12, x1 + 0.06, top + 0.3, z1 - 0.12, INK);
  // Panel seams round it, a storey up and two
  for (const y of [S + 3.05, S + 5.65]) {
    box(b, x0 - 0.03, y, z1, x1, y + 0.08, z1 + 0.03, CLUB_TRIM);
    box(b, x0 - 0.03, y, z0, x0, y + 0.08, z1, CLUB_TRIM);
  }
  // Magenta along the parapet's front and its side on the cross street, cyan just under
  box(b, x0 - 0.08, top + 0.31, z1 + 0.02, x1 + 0.02, top + 0.36, z1 + 0.08, glow('#ff3bd4'));
  box(b, x0 - 0.08, top + 0.31, z0 + 0.1, x0 - 0.02, top + 0.36, z1 + 0.08, glow('#ff3bd4'));
  box(b, x0 + 0.1, top - 0.32, z1 + 0.01, x1 - 0.1, top - 0.28, z1 + 0.05, glow('#00eaff'));
  // On the roof: plant boxes and a vent
  b.detail(() => {
    box(b, x1 - 3, top, z0 + 1, x1 - 1.6, top + 0.7, z0 + 2.2, METAL);
    box(b, x1 - 5.2, top, z0 + 1.2, x1 - 4.2, top + 0.55, z0 + 2.1, METAL);
    b.add(new THREE.CylinderGeometry(0.22, 0.22, 0.8, 10).translate(x0 + 3, top + 0.4, z0 + 1.5), METAL);
  });

  // The front: tubes up it, throbbing (one at each end, a pair flanking the board)
  const tube = (x: number, z: number, y0: number, y1: number, mat: THREE.Material, alongZ = false) =>
    parts.get(mat)!.push(new THREE.BoxGeometry(alongZ ? 0.05 : 0.07, y1 - y0, alongZ ? 0.07 : 0.05).translate(x, (y0 + y1) / 2, z));
  const fz = front + 0.05;
  tube(x0 + 0.3, fz, S + 0.6, top - 0.45, BEAT.magenta);
  tube(x0 + 0.48, fz, S + 0.6, top - 0.45, BEAT.cyan);
  tube(x1 - 0.3, fz, S + 0.6, top - 0.45, BEAT.magenta);
  tube(x1 - 0.48, fz, S + 0.6, top - 0.45, BEAT.cyan);
  // ...and on the side wall, along the cross street
  for (const [k, z] of [z0 + 0.5, z0 + 2.4, z0 + 4.3].entries()) tube(x0 - 0.05, z, S + 0.6, top - 0.45, k % 2 ? BEAT.cyan : BEAT.magenta, true);

  // PULSE on a big board over the marquee, framed
  const m = CLUB.marquee;
  const bc = (m.x0 + m.x1) / 2 - 1;
  const bw = 6.4;
  const by = S + 4.25;
  box(b, bc - bw / 2 - 0.12, by - 0.92, front, bc + bw / 2 + 0.12, by + 0.92, front + 0.08, INK);
  b.add(sign(0, bw, 1.6).translate(bc, by, front + 0.086), SIGNS);
  // The door: double glass doors in a lit frame
  const d = CLUB.door;
  box(b, d.x - d.w / 2 - 0.12, S, front, d.x + d.w / 2 + 0.12, S + 1.92, front + 0.03, INK);
  box(b, d.x - d.w / 2, S, front + 0.03, d.x + d.w / 2, S + 1.8, front + 0.04, GLASS);
  box(b, d.x - 0.012, S, front + 0.04, d.x + 0.012, S + 1.8, front + 0.05, METAL);
  box(b, d.x - d.w / 2 - 0.12, S + 1.92, front + 0.03, d.x + d.w / 2 + 0.12, S + 1.96, front + 0.07, soft('#ff3bd4'));
  // Dark glass blocks either side, a wash of colour behind (not see-through)
  for (const [a, c] of [
    [x0 + 0.8, d.x - d.w / 2 - 0.5],
    [d.x + d.w / 2 + 0.5, x1 - 0.8],
  ] as Pt[])
    if (c - a > 0.6) {
      box(b, a, S + 0.55, front, c, S + 2.05, front + 0.02, GLASS);
      box(b, a + 0.08, S + 0.62, front + 0.02, c - 0.08, S + 0.66, front + 0.03, soft('#7b2cff'));
    }

  // The marquee: a canopy out over the forecourt, its letterboard, bulbs round its edge chasing
  const mz = m.z;
  box(b, m.x0, S + m.y, front, m.x1, S + m.y + 0.32, mz, INK);
  box(b, m.x0 + 0.05, S + m.y - 0.012, front + 0.05, m.x1 - 0.05, S + m.y, mz - 0.05, CLUB_TRIM);
  b.add(sign(3, m.x1 - m.x0 - 0.5, 0.26).translate((m.x0 + m.x1) / 2, S + m.y + 0.16, mz + 0.006), SIGNS);
  for (const e of [-1, 1]) {
    const x = e < 0 ? m.x0 : m.x1;
    // Ties back up to the wall
    const g = new THREE.CylinderGeometry(0.02, 0.02, Math.hypot(mz - front, 1.3), 5);
    g.rotateX(-Math.atan2(mz - front, 1.3)).translate(x + -e * 0.15, S + m.y + 0.32 + 0.65, (front + mz) / 2);
    b.add(g, METAL);
  }
  const bulb = new THREE.SphereGeometry(low ? 0.04 : 0.035, low ? 5 : 6, 4);
  let n = 0;
  const put = (x: number, y: number, z: number) => parts.get(CHASE[n++ % 2])!.push(bulb.clone().translate(x, y, z));
  for (const y of [S + m.y + 0.36, S + m.y - 0.03]) {
    for (let x = m.x0 + 0.1; x <= m.x1 - 0.1 + 1e-6; x += low ? 0.32 : 0.2) put(x, y, mz + 0.02);
    for (const x of [m.x0 - 0.02, m.x1 + 0.02]) for (let z = front + 0.25; z < mz - 0.05; z += low ? 0.32 : 0.2) put(x, y, z);
  }
  addPool(d.x, front + 1.1, 3.4, S + 0.03);

  // The blade on the corner, turned to look down both streets, over the roof; two-sided on its brackets
  const bl = CLUB.blade;
  const bh = bl.h - 3;
  const out = 0.75;
  const turn = -Math.PI / 4;
  const [cx, cz]: Pt = [bl.x - out * Math.SQRT1_2, bl.z + out * Math.SQRT1_2];
  const bladeBox = new THREE.BoxGeometry(1.1, bh + 0.2, 0.16).rotateY(turn).translate(cx, S + 3 + bh / 2, cz);
  b.add(bladeBox, INK);
  for (const s of [1, -1]) {
    const g = blade(0, 0.96, bh).rotateY(turn + (s < 0 ? Math.PI : 0));
    const nx = Math.sin(turn) * s;
    const nz = Math.cos(turn) * s;
    b.add(g.translate(cx + nx * 0.086, S + 3 + bh / 2, cz + nz * 0.086), BLADES.mat);
  }
  for (const y of [S + 3.6, S + bl.h - 1.2]) {
    const g = new THREE.BoxGeometry(0.08, 0.08, out + 0.3).rotateY(turn).translate(bl.x - (out / 2) * Math.SQRT1_2, y, bl.z + (out / 2) * Math.SQRT1_2);
    b.add(g, METAL);
  }
  parts.get(BEAT.magenta)!.push(new THREE.BoxGeometry(1.16, 0.05, 0.05).rotateY(turn).translate(cx, S + bl.h - 0.38, cz));

  // The velvet rope on brass posts, the queue behind it, the bouncer by the door
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
    for (const [p, q] of [
      [a, mid],
      [mid, c],
    ] as Pt[]) {
      const len = Math.hypot(q - p, dip);
      const g = new THREE.CylinderGeometry(0.022, 0.022, len, 5).rotateZ(Math.PI / 2 + (q === mid ? -1 : 1) * Math.atan2(dip, q - p));
      b.add(g.translate((p + q) / 2, S + r.h - 0.14 - dip / 2, r.z), VELVET);
    }
  }
  for (const q of CLUB.queue.slice(0, low ? 5 : CLUB.queue.length)) crowd.push({ x: q.x, z: q.z, ry: q.yaw, act: 'queue' });
  crowd.push({ x: CLUB.bouncer.x, z: CLUB.bouncer.z, ry: CLUB.bouncer.yaw, scale: 1.1 });
}

/* ---------- The bar and the gun store: brick buildings in their lots' frames (infill.ts's kit) ---------- */

/** A place's building in infill's terms (its frame: u along the front, v out of it) */
const asInfill = (p: AvenuePlace): Infill => ({ box: p.lot, h: p.h, face: 's', seed: 0, type: 'shop', floors: Math.round((p.h - SHOP_H) / FLOOR), front: p.lot[3] - p.body[3], solids: [] });
const uOf = (F: Frame, x: number) => x - F.L[0];

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
  const [px, pz] = [BAR.lot[0] + 1.2, BAR.lot[3] + 0.45];
  crowd.push({ x: px, z: pz, ry: Math.PI / 2, act: 'chat' }, { x: px + 0.7, z: pz, ry: -Math.PI / 2, act: 'chat' });
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
  const h0 = uOf(F, ARMS.hatch.x0);
  const h1 = uOf(F, ARMS.hatch.x1);
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
    ring.position.set(cx, S + 0.05, cz + 0.6);
    group.add(fx(ring));
    return { id: p.id, group, focus: V(cx, 2, cz), size, pin: V(cx, S + pinY, cz), ring };
  };
  const club = make(CLUB, (b) => drawClub(b, parts, crowd, opts.low), 8, 18, CLUB.blade.h + 1);
  movers(club.group, parts);
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
