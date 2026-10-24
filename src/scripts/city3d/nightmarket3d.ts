/*
 * The Night Market on screen (the numbers are nightmarket.ts): a place
 * built at the boot (`buildNightMarket()`, spot `nightmarket`), its deck
 * out over the water with the boardwalk's railing round it:
 *
 * - **The containers**: corrugated twenty-footers in four colours, their
 *   hatches open with the flap propped up over the counter, lit inside,
 *   pots and boxes on the counter, the stall's name on a board on the roof
 *   (both ways) with a neon line under it.
 * - **The food trucks**: a box body on its wheels with the cab at one end,
 *   the serving hatch and flap on the market side, the name along the roof.
 * - **The cart**: a little striped cart under its umbrella.
 * - **The tables**: picnic tables with benches either side, trays and cups
 *   on some.
 * - **The lights**: NIGHT MARKET on the gantry over the boardwalk, framed
 *   in neon with bulbs along its beam, both ways; string lights with paper
 *   lanterns hung from the stalls' roofs to poles along the boardwalk;
 *   patio heaters glowing orange; pools of light at the counters.
 *
 * Signs are one small atlas of fixed made-up copy. The people (cooks,
 * queues, diners, a few standing about) are the city's crowd.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, PAL, canvasTex, fx, glowMat, lit, toon } from './kit';
import { INK, METAL, WOOD, glow, soft } from './infill';
import { addPool, type Tick } from './world';
import type { Pt } from './downtown';
import type { Idle, Spot } from './landmarks';
import { DINERS, FLOOR_Y as T, GANTRY, HEATERS, MARKET_RAILS, MX, POLES, QUEUE, STALLS, STALL_NAMES, STRINGS, TABLE, TABLES, TRUCK, VENDORS, type Stall } from './nightmarket';
import { BOARDWALK, MARKET_DECK } from './waterfront';
import { box } from './riversidekit';
import { deck, railX, railZ } from './waterfront3d';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/* ---------- The signs: one atlas, a row each ---------- */

const ROWS = [
  { text: 'NIGHT MARKET', color: '#ffffff', glow: '#ff3bd4', board: '#0d0b22' },
  ...STALL_NAMES.map((text, i) => ({ text, color: ['#ffd23f', '#ff8a3d', '#ffffff', '#7ff6ff', '#ff5a5a', '#9dff7a', '#ffb3e6'][i], glow: '', board: ['#1d2a3a', '#3a1d14', '#2a1d3a', '#14302a', '#2a1414', '#1d3a1d', '#3a1d33'][i] })),
  { text: 'OPEN LATE', color: '#ff3bd4', glow: '#ff3bd4', board: '#0b0910' },
];
const OPEN_LATE = ROWS.length - 1;
const SIGNS = (() => {
  const W = 512;
  const H = 96;
  const tex = canvasTex(W, H * ROWS.length, (c) => {
    ROWS.forEach((r, i) => {
      const y = i * H;
      c.fillStyle = r.board;
      c.fillRect(0, y, W, H);
      c.strokeStyle = r.glow || r.color;
      c.lineWidth = 4;
      c.strokeRect(7, y + 7, W - 14, H - 14);
      c.font = `900 72px ${FONT_DISPLAY}`;
      const size = Math.min(72, (72 * (W - 60)) / c.measureText(r.text).width);
      c.font = `900 ${size}px ${FONT_DISPLAY}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      if (r.glow) {
        c.shadowColor = r.glow;
        c.shadowBlur = 18;
      }
      c.fillStyle = r.color;
      c.fillText(r.text, W / 2, y + H / 2 + 3);
      c.shadowBlur = 0;
    });
  });
  return lit(new THREE.MeshBasicMaterial({ map: tex, toneMapped: true }), 0.95, 1.35);
})();
/** A board showing row `row`, w x h, facing +z (or -z), its middle at x, y, z */
function sign(row: number, w: number, h: number, x: number, y: number, z: number, back = false) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const v0 = 1 - (row + 1) / ROWS.length;
  const v1 = 1 - row / ROWS.length;
  for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) > 0.5 ? v1 - 0.004 : v0 + 0.004);
  return (back ? g.rotateY(Math.PI) : g).translate(x, y, z);
}

/* ---------- Materials ---------- */

const PAINTS = ['#2f6b8a', '#9a3b24', '#d9a23a', '#3e7a4a'].map((c) => toon(c));
const RIBS = ['#24566f', '#7a2e1c', '#b58424', '#2f5f39'].map((c) => toon(c));
const TRUCKS = [toon('#f2c94c'), toon('#e0457b')];
const STEEL = toon('#3a3b4a');
const INSIDE = toon('#2b2433');
const GLASS = toon('#141a36');
const TYRE = toon('#16141f');
const CHROME = toon('#c9c4e6');
const WARM = soft('#ffd9a0');
const LANTERNS = ['#ff3b3b', '#ff8a3d', '#ffd23f', '#ff3bd4', '#00eaff'].map((c) => soft(c));
const BULBS = [glow('#ffd27a'), glow('#ff7ad9')];

/** A flap hinged over a hatch, propped up and out over the counter (in +z), w wide */
function flap(b: Batch, x0: number, x1: number, y: number, z: number, mat: THREE.Material) {
  const out = 0.62;
  const rise = 0.22;
  const g = new THREE.BoxGeometry(x1 - x0, 0.04, Math.hypot(out, rise)).rotateX(-Math.atan2(rise, out)).translate((x0 + x1) / 2, y + rise / 2, z + out / 2);
  b.add(g, mat);
  // Its two props
  for (const x of [x0 + 0.05, x1 - 0.05]) {
    const p = new THREE.CylinderGeometry(0.012, 0.012, 0.7, 4).rotateX(-0.9).translate(x, y - 0.15, z + 0.3);
    b.add(p, METAL);
  }
}

/* ---------- The stalls ---------- */

function container(b: Batch, s: Stall, i: number, low: boolean) {
  const [x0, z0, x1, z1] = s.rect;
  const top = T + s.h;
  const paint = PAINTS[i % PAINTS.length];
  const rib = RIBS[i % RIBS.length];
  const t = 0.06;
  const counter = T + 0.6;
  const lintel = T + 1.25;
  const [h0, h1] = [x0 + 0.3, x1 - 0.3];
  // The box: back, ends, roof, the front below and above the hatch and beside it
  box(b, x0, T, z0, x1, top, z0 + t, paint);
  box(b, x0, T, z0, x0 + t, top, z1, paint);
  box(b, x1 - t, T, z0, x1, top, z1, paint);
  box(b, x0, top - t, z0, x1, top, z1, paint);
  box(b, x0, T, z1 - t, x1, counter, z1, paint);
  box(b, x0, lintel, z1 - t, x1, top, z1, paint);
  box(b, x0, counter, z1 - t, h0, lintel, z1, paint);
  box(b, h1, counter, z1 - t, x1, lintel, z1, paint);
  // Its corner castings and the ribs (near)
  for (const x of [x0, x1 - 0.1]) for (const y of [T, top - 0.1]) for (const z of [z0, z1 - 0.1]) box(b, x - 0.005, y - 0.005, z - 0.005, x + 0.105, y + 0.105, z + 0.105, STEEL);
  b.detail(() => {
    for (let x = x0 + 0.18; x < x1 - 0.1; x += low ? 0.5 : 0.25) box(b, x - 0.03, T + 0.1, z0 - 0.02, x + 0.03, top - 0.1, z0, rib);
    for (const [xa, dir] of [
      [x0, -1],
      [x1, 1],
    ] as Pt[])
      for (let z = z0 + 0.18; z < z1 - 0.1; z += low ? 0.5 : 0.25) box(b, xa, T + 0.1, z - 0.03, xa + dir * 0.02, top - 0.1, z + 0.03, rib);
  });
  // Inside, lit: the back wall's glow, a shelf, the floor
  box(b, h0, counter, z0 + t, h1, lintel, z0 + t + 0.01, WARM);
  box(b, x0 + t, T, z0 + t, x1 - t, T + 0.02, z1 - t, INSIDE);
  box(b, h0, counter - 0.02, z1 - 0.06, h1, counter + 0.04, z1 + 0.25, WOOD);
  b.detail(() => {
    box(b, h0 + 0.05, T + 0.95, z0 + t, h1 - 0.05, T + 0.98, z0 + 0.3, METAL);
    // Pots, a sauce rack and a tray on the counter
    b.add(new THREE.CylinderGeometry(0.1, 0.09, 0.14, 10).translate(h0 + 0.4, counter + 0.11, z1 + 0.08), CHROME);
    b.add(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 10).translate(h0 + 0.75, counter + 0.09, z1 + 0.06), CHROME);
    box(b, h1 - 0.55, counter + 0.04, z1 - 0.02, h1 - 0.15, counter + 0.07, z1 + 0.2, toon('#ff3b5c'));
    for (let k = 0; k < 3; k++) b.add(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 6).translate(h1 - 0.48 + k * 0.12, counter + 0.13, z1 + 0.1), [toon('#ff3b3b'), toon('#ffd23f'), toon('#2a8a55')][k]);
  });
  flap(b, h0 - 0.05, h1 + 0.05, lintel, z1, paint);
  // The name on a board on the roof's front edge, a neon line under it; the strings' post
  const cx = (x0 + x1) / 2;
  box(b, x0 + 0.2, top, z1 - 0.12, x1 - 0.2, top + 0.5, z1 - 0.04, INK);
  b.add(sign(1 + i, x1 - x0 - 0.5, 0.42, cx, top + 0.25, z1 - 0.034), SIGNS);
  b.add(sign(1 + i, x1 - x0 - 0.5, 0.42, cx, top + 0.25, z1 - 0.126, true), SIGNS);
  box(b, x0 + 0.2, top - 0.02, z1 - 0.02, x1 - 0.2, top + 0.02, z1 + 0.02, glow(['#ffd23f', '#ff8a3d', '#ff3bd4', '#00eaff'][i % 4]));
  b.add(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 5).translate(cx, top + 0.75, z1 - 0.1), METAL);
  if (i === 0) b.add(sign(OPEN_LATE, 0.9, 0.24, 0, 0, 0).rotateY(-Math.PI / 2).translate(x0 - 0.008, T + 1.0, (z0 + z1) / 2), SIGNS);
}

function truck(b: Batch, s: Stall, i: number, low: boolean) {
  const [x0, z0, x1, z1] = s.rect;
  const paint = TRUCKS[i % TRUCKS.length];
  const fl = T + TRUCK.floor;
  const top = T + s.h;
  const cabX = x1 - TRUCK.cab;
  // The chassis and the wheels
  box(b, x0 + 0.1, T + 0.22, z0 + 0.15, x1 - 0.1, fl, z1 - 0.15, STEEL);
  for (const x of [x0 + 0.55, x1 - 0.5])
    for (const z of [z0 + 0.12, z1 - 0.12]) {
      b.add(new THREE.CylinderGeometry(0.26, 0.26, 0.18, low ? 10 : 14).rotateX(Math.PI / 2).translate(x, T + 0.26, z), TYRE);
      b.add(new THREE.CylinderGeometry(0.13, 0.13, 0.19, 8).rotateX(Math.PI / 2).translate(x, T + 0.26, z), CHROME);
    }
  // The box body behind the cab, the hatch on the market side (+z), its counter and flap
  const [h0, h1] = [x0 + 0.35, cabX - 0.25];
  const counter = fl + 0.55;
  const lintel = fl + 1.12;
  box(b, x0, fl, z0, cabX, top, z0 + 0.06, paint);
  box(b, x0, fl, z0, x0 + 0.06, top, z1, paint);
  box(b, cabX - 0.06, fl, z0, cabX, top, z1, paint);
  box(b, x0, top - 0.06, z0, cabX, top, z1, paint);
  box(b, x0, fl, z1 - 0.06, cabX, counter, z1, paint);
  box(b, x0, lintel, z1 - 0.06, cabX, top, z1, paint);
  box(b, x0, counter, z1 - 0.06, h0, lintel, z1, paint);
  box(b, h1, counter, z1 - 0.06, cabX, lintel, z1, paint);
  box(b, h0, counter, z0 + 0.06, h1, lintel, z0 + 0.07, WARM);
  box(b, h0, counter - 0.02, z1 - 0.06, h1, counter + 0.04, z1 + 0.22, CHROME);
  flap(b, h0 - 0.05, h1 + 0.05, lintel, z1, paint);
  // A white stripe along its side, the name on the roof
  box(b, x0 - 0.005, fl + 0.32, z1 - 0.005, h0, fl + 0.4, z1 + 0.005, toon('#f3f2f7'));
  box(b, x0 + 0.1, top, z1 - 0.2, cabX - 0.1, top + 0.46, z1 - 0.12, INK);
  b.add(sign(5 + i, cabX - x0 - 0.3, 0.38, (x0 + cabX) / 2, top + 0.23, z1 - 0.114), SIGNS);
  b.add(sign(5 + i, cabX - x0 - 0.3, 0.38, (x0 + cabX) / 2, top + 0.23, z1 - 0.206, true), SIGNS);
  b.add(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 5).translate((x0 + x1) / 2 - 0.4, top + 0.25, z1 - 0.3), METAL);
  // The cab: lower, its windscreen and side window, the headlights
  const ct = fl + 1.15;
  box(b, cabX, fl, z0 + 0.05, x1, ct, z1 - 0.05, paint);
  box(b, cabX + 0.05, ct - 0.02, z0 + 0.08, x1 - 0.05, ct + 0.04, z1 - 0.08, toon('#f3f2f7'));
  box(b, x1 - 0.005, fl + 0.55, z0 + 0.15, x1 + 0.005, ct - 0.08, z1 - 0.15, GLASS);
  box(b, cabX + 0.15, fl + 0.6, z1 - 0.055, x1 - 0.15, ct - 0.1, z1 - 0.045, GLASS);
  for (const z of [z0 + 0.25, z1 - 0.25]) b.add(new THREE.SphereGeometry(0.06, 8, 6).translate(x1 + 0.01, fl + 0.3, z), glow('#fff1c2'));
}

function cart(b: Batch, s: Stall, low: boolean) {
  const [x0, z0, x1, z1] = s.rect;
  const body = T + 0.85;
  box(b, x0, T + 0.2, z0, x1, body, z1, toon('#f3f2f7'));
  // Pink stripes, the name on its front, the lid's freezer windows
  for (let x = x0 + 0.1; x < x1 - 0.05; x += 0.3) box(b, x, T + 0.25, z1 - 0.005, x + 0.14, body - 0.05, z1 + 0.005, toon('#ff7ad9'));
  b.add(sign(7, x1 - x0 - 0.2, 0.26, (x0 + x1) / 2, body + 0.17, z1 + 0.012), SIGNS);
  box(b, x0 + 0.05, body + 0.03, z1 - 0.005, x1 - 0.05, body + 0.31, z1 + 0.006, INK);
  box(b, x0 + 0.1, body, z0 + 0.1, x1 - 0.1, body + 0.04, z1 - 0.1, toon('#8fd8e8'));
  for (const x of [x0 + 0.2, x1 - 0.2]) b.add(new THREE.CylinderGeometry(0.18, 0.18, 0.08, low ? 8 : 12).rotateX(Math.PI / 2).translate(x, T + 0.18, z1 + 0.02), TYRE);
  // Its umbrella
  const cx = (x0 + x1) / 2;
  b.add(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 5).translate(cx, body + 0.7, (z0 + z1) / 2), METAL);
  const segs = 8;
  for (let k = 0; k < segs; k++) {
    const g = new THREE.ConeGeometry(1.0, 0.35, segs, 1, true, (k / segs) * Math.PI * 2, (Math.PI * 2) / segs);
    b.add(g.translate(cx, body + 1.45, (z0 + z1) / 2), k % 2 ? toon('#ff7ad9') : toon('#f3f2f7'));
  }
}

/* ---------- The tables, the gantry, the strings, the heaters ---------- */

function tables(b: Batch, low: boolean) {
  const woods = [WOOD, toon('#7a5236'), toon('#946640')];
  TABLES.forEach((t, i) => {
    const wood = woods[i % woods.length];
    const [hl, hd] = [TABLE.l / 2, TABLE.d / 2];
    const top = T + TABLE.h;
    box(b, t.x - hl, top - 0.06, t.z - hd, t.x + hl, top, t.z + hd, wood);
    const off = hd + TABLE.gap + TABLE.bench / 2;
    for (const s of [-1, 1]) box(b, t.x - hl, T + 0.25, t.z + s * off - TABLE.bench / 2, t.x + hl, T + 0.3, t.z + s * off + TABLE.bench / 2, wood);
    b.detail(() => {
      for (const x of [t.x - hl + 0.2, t.x + hl - 0.2]) {
        box(b, x - 0.04, T, t.z - off - 0.1, x + 0.04, top - 0.06, t.z - off + 0.1, wood);
        box(b, x - 0.04, T, t.z + off - 0.1, x + 0.04, top - 0.06, t.z + off + 0.1, wood);
        box(b, x - 0.04, T + 0.2, t.z - off, x + 0.04, T + 0.25, t.z + off, wood);
      }
      // Trays, boxes and cups on some
      if (!low && i % 2 === 0) {
        box(b, t.x - 0.55, top, t.z - 0.22, t.x - 0.15, top + 0.03, t.z + 0.02, toon('#e23b3b'));
        box(b, t.x + 0.2, top, t.z - 0.05, t.x + 0.45, top + 0.1, t.z + 0.2, toon('#f3f2f7'));
        b.add(new THREE.CylinderGeometry(0.04, 0.035, 0.12, 8).translate(t.x - 0.05, top + 0.06, t.z + 0.15), toon('#ffd23f'));
      }
    });
  });
}

function gantry(b: Batch, low: boolean) {
  const G = GANTRY;
  const [xa, xb] = [G.x - G.half, G.x + G.half];
  const beam = T + G.h;
  for (const x of [xa, xb]) {
    box(b, x - G.post / 2, T, G.z - G.post / 2, x + G.post / 2, beam, G.z + G.post / 2, INK);
    box(b, x - 0.25, T, G.z - 0.25, x + 0.25, T + 0.3, G.z + 0.25, STEEL);
  }
  box(b, xa - 0.2, beam - 0.25, G.z - 0.12, xb + 0.2, beam, G.z + 0.12, INK);
  // The board both ways, framed in neon
  const bd = G.board;
  const by = T + bd.y;
  box(b, G.x - bd.w / 2 - 0.1, by - bd.h / 2 - 0.1, G.z - 0.06, G.x + bd.w / 2 + 0.1, by + bd.h / 2 + 0.1, G.z + 0.06, INK);
  b.add(sign(0, bd.w, bd.h, G.x, by, G.z + 0.066), SIGNS);
  b.add(sign(0, bd.w, bd.h, G.x, by, G.z - 0.066, true), SIGNS);
  for (const z of [G.z - 0.08, G.z + 0.08])
    for (const y of [by - bd.h / 2 - 0.12, by + bd.h / 2 + 0.12]) box(b, G.x - bd.w / 2 - 0.12, y - 0.025, z - 0.02, G.x + bd.w / 2 + 0.12, y + 0.025, z + 0.02, glow('#00eaff'));
  // Hangers from the beam to the board, bulbs along the beam's top
  for (const x of [G.x - bd.w / 2 + 0.4, G.x + bd.w / 2 - 0.4]) box(b, x - 0.02, by + bd.h / 2 + 0.1, G.z - 0.02, x + 0.02, beam - 0.25, G.z + 0.02, METAL);
  for (let x = xa; x <= xb + 1e-6; x += low ? 0.6 : 0.35) b.add(new THREE.SphereGeometry(0.05, 6, 4).translate(x, beam + 0.05, G.z), BULBS[Math.round((x - xa) / 0.35) % 2]);
}

function strings(b: Batch, low: boolean) {
  // The poles at the ends (the gantry's posts are the middle ones)
  for (const [x, z] of [POLES[0], POLES[POLES.length - 1]]) {
    b.add(new THREE.CylinderGeometry(0.05, 0.07, 2.8, 8).translate(x, T + 1.4, z), INK);
    b.add(new THREE.SphereGeometry(0.1, 8, 6).translate(x, T + 2.85, z), glow('#ffd27a'));
  }
  const stallTop = (p: Pt) => {
    const s = STALLS.find((q) => p[0] > q.rect[0] && p[0] < q.rect[2])!;
    return T + s.h + (s.kind === 'container' ? 1 : 0.5);
  };
  for (const [a, c] of STRINGS) {
    const from = V(a[0], stallTop(a), a[1]);
    const to = V(c[0], T + 2.7, c[1]);
    const n = low ? 10 : 18;
    const sag = 0.55;
    const at = (t: number) => from.clone().lerp(to, t).add(V(0, -Math.sin(t * Math.PI) * sag, 0));
    for (let k = 1; k < n; k++) {
      const p = at(k / n);
      if (k % 4 === 2) {
        // A paper lantern: a lit ball with a dark cap
        b.add(new THREE.SphereGeometry(0.12, 8, 6).scale(1, 1.15, 1).translate(p.x, p.y - 0.14, p.z), LANTERNS[(k + Math.abs(Math.round(a[0]))) % LANTERNS.length]);
        b.add(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 6).translate(p.x, p.y - 0.01, p.z), INK);
      } else b.add(new THREE.SphereGeometry(0.04, 5, 4).translate(p.x, p.y - 0.03, p.z), BULBS[k % 2]);
    }
    // The wire (near)
    b.detail(() => {
      for (let k = 0; k < n; k++) {
        const p = at(k / n);
        const q = at((k + 1) / n);
        const d = q.clone().sub(p);
        b.add(new THREE.CylinderGeometry(0.006, 0.006, d.length(), 3).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize())).translate((p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2), INK);
      }
    });
  }
}

function heaters(b: Batch) {
  for (const [x, z] of HEATERS) {
    b.add(new THREE.CylinderGeometry(0.2, 0.22, 0.08, 12).translate(x, T + 0.04, z), STEEL);
    b.add(new THREE.CylinderGeometry(0.04, 0.05, 1.9, 8).translate(x, T + 1.0, z), STEEL);
    b.add(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 10).translate(x, T + 1.95, z), glow('#ff6a2f'));
    b.add(new THREE.ConeGeometry(0.42, 0.18, 14, 1, true).translate(x, T + 2.2, z), STEEL);
    addPool(x, z, 2.4, T + 0.02, true);
  }
}

/** The Night Market: a place (its pin over the gantry), its deck and railing, the stalls, tables and lights, its people */
export function buildNightMarket(scene: THREE.Scene, crowd: Idle[], opts: { tick: (f: Tick) => void; low: boolean }): { spot: Spot } {
  const { low } = opts;
  const group = new THREE.Group();
  group.name = 'nightmarket';
  scene.add(group);
  const b = new Batch();
  // The deck (out over the water) and its railing round the water's sides
  deck(b, MARKET_DECK, low);
  const [mx0, mz0, mx1, mz1] = MARKET_DECK;
  box(b, mx0 - 0.02, T - 0.32, mz0, mx0 + 0.06, T - 0.06, mz1, toon('#4a3424'));
  box(b, mx1 - 0.06, T - 0.32, mz0, mx1 + 0.02, T - 0.06, mz1, toon('#4a3424'));
  for (const [x0, z0, x1, z1] of MARKET_RAILS) {
    if (z0 === z1) railX(b, x0, x1, z0 + 0.08, low);
    else railZ(b, z0, z1, x0 + (x0 === mx0 ? 0.08 : -0.08), low);
  }
  let c = 0;
  let k = 0;
  for (const s of STALLS) {
    if (s.kind === 'container') container(b, s, c++, low);
    else if (s.kind === 'truck') truck(b, s, k++, low);
    else cart(b, s, low);
    addPool((s.rect[0] + s.rect[2]) / 2, s.front + 0.7, 2.6, T + 0.02, true);
  }
  tables(b, low);
  gantry(b, low);
  strings(b, low);
  heaters(b);
  // Bins at the ends
  for (const x of [mx0 + 0.5, mx1 - 0.5]) {
    b.add(new THREE.CylinderGeometry(0.22, 0.2, 0.6, 10).translate(x, T + 0.3, mz0 + 2.2), toon('#2a8a55'));
    b.add(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 10).translate(x, T + 0.62, mz0 + 2.2), INK);
  }
  b.build(group);
  addPool(GANTRY.x, GANTRY.z, 4, T + 0.02);
  // The people: the cooks, the queues, the diners (every other one on phones), a few standing about under the gantry
  for (const v of VENDORS) crowd.push({ x: v.x, z: v.z, y: T + v.y, ry: v.yaw, act: 'chat' });
  for (const q of QUEUE) crowd.push({ x: q.x, z: q.z, y: T, ry: q.yaw, act: 'queue' });
  DINERS.forEach((d, i) => {
    if (!low || i % 2 === 0) crowd.push({ x: d.x, z: d.z, y: T + 0.3, ry: d.yaw, act: 'sit' });
  });
  for (const [dx, dz, ry] of [
    [-2.2, 0.4, 0.6],
    [-1.5, 0.6, -2.2],
    [3.4, 0.2, Math.PI],
  ] as [number, number, number][])
    crowd.push({ x: MX + dx, z: BOARDWALK[3] - 1.6 + dz, y: T, ry, act: 'chat' });
  const ring = new THREE.Mesh(new THREE.RingGeometry(14, 14.25, 64), glowMat(PAL.cyan, 0, null));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(MX, T + 0.05, (mz0 + BOARDWALK[3]) / 2);
  group.add(fx(ring));
  return {
    spot: { id: 'nightmarket', group, focus: V(MX, 1.4, (mz0 + BOARDWALK[3]) / 2), size: 22, pin: V(GANTRY.x, T + GANTRY.h + 1.1, GANTRY.z), ring },
  };
}
