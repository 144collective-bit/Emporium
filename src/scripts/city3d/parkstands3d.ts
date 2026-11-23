/*
 * Westlake Park's bandstand and the Lakehouse Café drawn (docs/westlake-plan.md Phase 6; the data is westlake.ts
 * `BANDSTAND`, `BANDSTAND_BENCHES`, `LAKEHOUSE`, `CAFE_TABLES`), a site each in the park's chunk:
 *
 * - the bandstand: an octagonal stone base with steps up on its lake side, cream-painted iron columns at its corners
 *   with a lacy frieze between them, a railing round its floor, an ogee roof of eight panels with a lantern and finial;
 *   benches round it on the lawn;
 * - the café: a pavilion of warm stone piers and tall glazed bays, a deep cornice, a hipped roof with a glass lantern
 *   down its ridge, a striped awning over its door; its tables (round, with chairs and parasols) on a strip in front and
 *   on the stone deck out over the inlet with its balustrade, the deck on stone corbels down the embankment.
 * Glazing is dim glass, lit softly at night; fine detail (the frieze, chairs, parasols) near only.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, lit, neon, siteMat, toon } from './kit';
import { SLAB } from './world';
import { site } from './tilework';
import { bench } from './gardens3d';
import { BANDSTAND, LAKEHOUSE, WATER_Y, type Pt } from './westlake';
import { BANDSTAND_BENCHES, CAFE_TABLES } from './parkstands';
import { addPeople } from './life';
import { clockAt } from './stadium';
import { CROWD_VIEW } from './character';
import type { Tick } from './world';
import { BAND, BAND_FLOOR, BAND_NOW, BAND_SEAT, DINERS, RAMBLE_PEOPLE, bandOn, bandPeople, listeners, waiter, type Part } from './parkcrowd';
import { ORNATE } from './palette';

const STONE = toon(ORNATE.stone);
const DRESSED = toon(ORNATE.dressed);
const ROUGH = toon(ORNATE.rough);
const IRON = toon(ORNATE.iron);
const ROOF = toon('#3f6b5a');
const ROOF_DARK = toon('#2f5546');
const GLASS = siteMat('lakehouse-glass', lit(toon('#5b7f98', { emissive: '#ffd59a' }), 0, 0.35));
const AWNING_A = toon('#2f6b52');
const AWNING_B = toon('#efe6cf');
const TABLE = toon('#e9e4da');
const CHAIR = toon('#2f6b52');
const PARASOL = toon('#efe6cf');
const GOLD = toon('#c9a24a');
const DOOR = toon('#5a3b2a');
const LANTERN = neon('#ffe2a0', 0.6, 2.4);
const BRASS = toon('#d9b44a');
const BRASS_DARK = toon('#a8842e');
const DRUM_SHELL = toon('#9b2f36');
const DRUM_HEAD = toon('#f1ece0');

/** The café's name board over its door: one small texture */
function cafeSign() {
  const tex = canvasTex(512, 96, (c) => {
    c.fillStyle = '#1f4a3a';
    c.fillRect(0, 0, 512, 96);
    c.strokeStyle = '#e8d9a8';
    c.lineWidth = 4;
    c.strokeRect(6, 6, 500, 84);
    c.fillStyle = '#f6ecd0';
    c.font = `900 50px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('THE LAKEHOUSE CAFÉ', 256, 52);
  });
  return siteMat('lakehouse-sign', lit(new THREE.MeshBasicMaterial({ map: tex, toneMapped: true }), 0.95, 1.15));
}

/** An octagon's corners round a middle, r out to them, the first on +x turned by a */
const octagon = (c: Pt, r: number, a = Math.PI / 8): Pt[] => Array.from({ length: 8 }, (_, k) => [c[0] + Math.cos(a + (k * Math.PI) / 4) * r, c[1] + Math.sin(a + (k * Math.PI) / 4) * r] as Pt);

function bandstand(b: Batch, low: boolean) {
  const { c, r, base, roof, top } = BANDSTAND;
  const [x, z] = c;
  const y = SLAB;
  // The base: an eight-sided stone drum, its moulded cap the floor's edge, steps up on the lake side (south, +z)
  b.add(new THREE.CylinderGeometry(r, r + 0.12, base, 8).rotateY(Math.PI / 8).translate(x, y + base / 2, z), STONE);
  b.add(new THREE.CylinderGeometry(r + 0.14, r + 0.14, 0.1, 8).rotateY(Math.PI / 8).translate(x, y + base + 0.05, z), DRESSED);
  for (let k = 0; k < 4; k++) {
    const h = base - (k + 1) * (base / 5);
    b.box(x - 1.1, y, z + r * 0.92 + k * 0.32, 2.2, h + 0.02, 0.34, DRESSED);
  }
  // The columns at the corners, the frieze and the railing between them
  const corners = octagon(c, r - 0.2);
  const ch = roof - base;
  for (const [px, pz] of corners) {
    b.add(new THREE.CylinderGeometry(0.07, 0.09, ch, 8).translate(px, y + base + ch / 2, pz), IRON);
    b.add(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 8).translate(px, y + base + 0.06, pz), IRON);
  }
  for (let k = 0; k < 8; k++) {
    const [p, q] = [corners[k], corners[(k + 1) % 8]];
    const [mx, mz] = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const ry = -Math.atan2(q[1] - p[1], q[0] - p[0]);
    b.add(new THREE.BoxGeometry(l, 0.14, 0.06).rotateY(ry).translate(mx, y + roof - 0.25, mz), IRON);
    // (the railing: open where the steps come up, south)
    if (mz < z + r * 0.5 || Math.abs(mx - x) > 1.2) {
      b.add(new THREE.BoxGeometry(l, 0.05, 0.05).rotateY(ry).translate(mx, y + base + 0.85, mz), IRON);
      b.add(new THREE.BoxGeometry(l, 0.04, 0.04).rotateY(ry).translate(mx, y + base + 0.35, mz), IRON);
    }
  }
  // The roof: eight panels rising in an ogee to a lantern, a gold finial
  const eave = octagon(c, r + 0.45);
  const ring = (rr: number, yy: number) => octagon(c, rr).map(([px, pz]) => new THREE.Vector3(px, y + yy, pz));
  const rings = [ring(r + 0.45, roof), ring(r * 0.78, roof + 0.55), ring(r * 0.42, roof + 1.15), ring(0.35, roof + 1.45)];
  for (let i = 1; i < rings.length; i++)
    for (let k = 0; k < 8; k++) {
      const [a, bb, cc, d] = [rings[i - 1][k], rings[i - 1][(k + 1) % 8], rings[i][(k + 1) % 8], rings[i][k]];
      // (both faces: its top seen from over the lawn, its underside from inside)
      for (const tri of [[a, bb, cc, a, cc, d], [a, cc, bb, a, d, cc]]) {
        const g = new THREE.BufferGeometry().setFromPoints(tri);
        g.computeVertexNormals();
        b.add(g, k % 2 ? ROOF : ROOF_DARK);
      }
    }
  b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.45, 8).translate(x, y + roof + 1.65, z), IRON);
  b.add(new THREE.ConeGeometry(0.36, 0.4, 8).translate(x, y + roof + 2.07, z), ROOF);
  b.add(new THREE.SphereGeometry(0.09, 8, 6).translate(x, y + top - 0.1, z), GOLD);
  b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 5).translate(x, y + top - 0.35, z), GOLD);
  // (the eaves' edge under the roof)
  for (let k = 0; k < 8; k++) {
    const [p, q] = [eave[k], eave[(k + 1) % 8]];
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    b.add(new THREE.BoxGeometry(l, 0.16, 0.08).rotateY(-Math.atan2(q[1] - p[1], q[0] - p[0])).translate((p[0] + q[0]) / 2, y + roof - 0.05, (p[1] + q[1]) / 2), IRON);
  }
  // Lanterns under the eaves at each column and one hung in the middle, lit at night (small: under the bloom's threshold)
  for (const [px, pz] of corners) {
    const [ox, oz] = [x + (px - x) * 0.9, z + (pz - z) * 0.9];
    b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 4).translate(ox, y + roof - 0.42, oz), IRON);
    b.box(ox - 0.08, y + roof - 0.72, oz - 0.08, 0.16, 0.2, 0.16, LANTERN);
  }
  b.add(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 4).translate(x, y + roof + 0.2, z), IRON);
  b.box(x - 0.11, y + roof - 0.55, z - 0.11, 0.22, 0.26, 0.22, LANTERN);
  b.detail(() => {
    if (low) return;
    // The frieze's lace: a row of small rings under the eaves between each pair of columns
    for (let k = 0; k < 8; k++) {
      const [p, q] = [corners[k], corners[(k + 1) % 8]];
      const ry = Math.atan2(-(q[1] - p[1]), q[0] - p[0]);
      for (let t = 0.2; t < 0.85; t += 0.2) {
        const [px, pz] = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
        b.add(new THREE.TorusGeometry(0.11, 0.015, 3, 8).rotateY(ry).translate(px, y + roof - 0.45, pz), IRON);
      }
    }
  });
  b.detail(() => {
    for (const bn of BANDSTAND_BENCHES) bench(b, bn.at, bn.ry);
  });
}

/** A café table with its chairs and a parasol */
function table(b: Batch, [x, z]: Pt, y: number, low: boolean) {
  b.add(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 12).translate(x, y + 0.72, z), TABLE);
  b.add(new THREE.CylinderGeometry(0.03, 0.12, 0.72, 6).translate(x, y + 0.36, z), IRON);
  if (low) return;
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + x;
    const [cx, cz] = [x + Math.cos(a) * 0.62, z + Math.sin(a) * 0.62];
    b.add(new THREE.BoxGeometry(0.36, 0.04, 0.36).translate(cx, y + 0.44, cz), CHAIR);
    b.add(new THREE.BoxGeometry(0.36, 0.42, 0.04).rotateY(-a + Math.PI / 2).translate(cx + Math.cos(a) * 0.17, y + 0.65, cz + Math.sin(a) * 0.17), CHAIR);
  }
  b.add(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 5).translate(x, y + 1.3, z), IRON);
  b.add(new THREE.ConeGeometry(0.95, 0.35, 8, 1, true).translate(x, y + 2.1, z), PARASOL);
}

function cafe(b: Batch, low: boolean) {
  const [x0, z0, x1, z1] = LAKEHOUSE.rect;
  const { h, top } = LAKEHOUSE;
  const y = SLAB;
  // The plinth, the floor, the stone piers and the glazed bays between, the cornice
  b.box(x0 - 0.15, y, z0 - 0.15, x1 - x0 + 0.3, 0.3, z1 - z0 + 0.3, DRESSED);
  const piers = (from: number, to: number, n: number) => Array.from({ length: n + 1 }, (_, k) => from + ((to - from) * k) / n);
  for (const xx of piers(x0, x1, 3))
    for (const zz of [z0, z1]) b.box(xx - 0.22, y + 0.3, zz - 0.22, 0.44, h - 0.3, 0.44, STONE);
  for (const zz of piers(z0, z1, 4)) for (const xx of [x0, x1]) b.box(xx - 0.22, y + 0.3, zz - 0.22, 0.44, h - 0.3, 0.44, STONE);
  // (the glass: a pane a hair inside each face; the long west face its front, glazed full, the door in its middle)
  b.box(x0 + 0.05, y + 0.3, z0 + 0.1, 0.04, h - 0.6, z1 - z0 - 0.2, GLASS);
  b.box(x1 - 0.09, y + 0.3, z0 + 0.1, 0.04, h - 0.6, z1 - z0 - 0.2, GLASS);
  for (const zz of [z0 + 0.05, z1 - 0.09]) b.box(x0 + 0.1, y + 0.3, zz, x1 - x0 - 0.2, h - 0.6, 0.04, GLASS);
  b.box(x0 - 0.05, y + h - 0.35, z0 - 0.05, x1 - x0 + 0.1, 0.35, z1 - z0 + 0.1, STONE);
  b.box(x0 - 0.25, y + h, z0 - 0.25, x1 - x0 + 0.5, 0.16, z1 - z0 + 0.5, DRESSED);
  // The roof: hipped, down from a ridge along its length, a glass lantern standing on the ridge
  const [mx, rz0, rz1] = [(x0 + x1) / 2, z0 + 1.6, z1 - 1.6];
  const ry0 = y + h + 0.16;
  const ridge = top - 0.5;
  const pts = (a: number[][]) => a.map(([px, py, pz]) => new THREE.Vector3(px, py, pz));
  const faces = [
    pts([[x0 - 0.3, ry0, z0 - 0.3], [x0 - 0.3, ry0, z1 + 0.3], [mx, y + ridge, rz1], [mx, y + ridge, rz0]]),
    pts([[x1 + 0.3, ry0, z1 + 0.3], [x1 + 0.3, ry0, z0 - 0.3], [mx, y + ridge, rz0], [mx, y + ridge, rz1]]),
    pts([[x0 - 0.3, ry0, z1 + 0.3], [x1 + 0.3, ry0, z1 + 0.3], [mx, y + ridge, rz1], [mx, y + ridge, rz1]]),
    pts([[x1 + 0.3, ry0, z0 - 0.3], [x0 - 0.3, ry0, z0 - 0.3], [mx, y + ridge, rz0], [mx, y + ridge, rz0]]),
  ];
  for (const [i, [a, bb, cc, d]] of faces.entries()) {
    const g = new THREE.BufferGeometry().setFromPoints([a, bb, cc, a, cc, d]);
    g.computeVertexNormals();
    b.add(g, i < 2 ? ROOF : ROOF_DARK);
  }
  // (a small glass lantern on the ridge's middle, its iron cap)
  const lz = (rz0 + rz1) / 2;
  b.box(mx - 0.4, y + ridge - 0.05, lz - 0.9, 0.8, 0.45, 1.8, GLASS);
  b.box(mx - 0.48, y + ridge + 0.4, lz - 0.98, 0.96, 0.07, 1.96, IRON);
  b.add(new THREE.SphereGeometry(0.08, 8, 6).translate(mx, y + ridge + 0.55, lz), GOLD);
  // The door in the front's middle bay (double, dark timber, glazed), the name board over it, the awning out over the
  // door and the tables, striped, its valance along the front
  const zc = (z0 + z1) / 2;
  b.box(x0 - 0.12, y + 0.3, zc - 0.7, 0.1, 2.0, 1.4, DOOR);
  b.box(x0 - 0.14, y + 0.6, zc - 0.55, 0.04, 1.3, 0.45, GLASS);
  b.box(x0 - 0.14, y + 0.6, zc + 0.1, 0.04, 1.3, 0.45, GLASS);
  b.add(new THREE.PlaneGeometry(2.6, 2.6 * (96 / 512)).rotateY(-Math.PI / 2).translate(x0 - 0.3, y + h - 0.2, zc), cafeSign());
  const deep = 1.5;
  for (let k = 0; k < 10; k++) {
    const g = new THREE.BoxGeometry(deep, 0.03, 0.4).translate(-deep / 2, 0, 0).rotateZ(0.28).translate(x0 - 0.25, y + h - 0.55, zc - 2 + k * 0.4 + 0.2);
    b.add(g, k % 2 ? AWNING_B : AWNING_A);
    b.add(new THREE.BoxGeometry(0.03, 0.2, 0.4).translate(x0 - 0.25 - deep * Math.cos(0.28), y + h - 0.55 - deep * Math.sin(0.28) - 0.1, zc - 2 + k * 0.4 + 0.2), k % 2 ? AWNING_A : AWNING_B);
  }
  // The deck over the inlet: its stone slab, the corbels under it down the embankment, its balustrade on three sides
  const [d0, e0, d1, e1] = LAKEHOUSE.deck;
  const dy = y + LAKEHOUSE.deckY;
  b.box(d0, dy - 0.25, e0, d1 - d0, 0.25, e1 - e0, STONE);
  for (let zz = e0 + 0.6; zz < e1; zz += 1.4) {
    b.add(new THREE.BoxGeometry(0.4, -WATER_Y + 0.6, 0.4).translate(d0 + 0.5, y + WATER_Y / 2 - 0.1, zz), ROUGH);
    b.add(new THREE.BoxGeometry(0.4, 0.6, 1.0).translate(d0 + 0.5, dy - 0.5, zz), ROUGH);
  }
  for (const [a, c] of [
    [[d0, e0], [d1, e0]],
    [[d0, e1], [d1, e1]],
    [[d0, e0], [d0, e1]],
  ] as [Pt, Pt][]) {
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const ry = -Math.atan2(c[1] - a[1], c[0] - a[0]);
    const [cx, cz] = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
    b.add(new THREE.BoxGeometry(l, 0.14, 0.26).rotateY(ry).translate(cx, dy + 0.07, cz), DRESSED);
    b.add(new THREE.BoxGeometry(l + 0.06, 0.1, 0.32).rotateY(ry).translate(cx, dy + 0.85, cz), DRESSED);
    const n = Math.round(l / 0.28);
    b.detail(() => {
      if (low) return;
      for (let k = 1; k < n; k++) {
        const t = k / n;
        b.add(new THREE.CylinderGeometry(0.05, 0.07, 0.66, 6).translate(a[0] + (c[0] - a[0]) * t, dy + 0.47, a[1] + (c[1] - a[1]) * t), STONE);
      }
    });
  }
  for (const p of [[d0, e0], [d0, e1]] as Pt[]) b.box(p[0] - 0.2, dy, p[1] - 0.2, 0.4, 1.0, 0.4, DRESSED);
  // Lanterns at the deck's corners over the water
  b.detail(() => {
    for (const p of [[d0 + 0.2, e0 + 0.2], [d0 + 0.2, e1 - 0.2]] as Pt[]) {
      b.box(p[0] - 0.04, dy + 1.0, p[1] - 0.04, 0.08, 0.9, 0.08, IRON);
      b.box(p[0] - 0.1, dy + 1.9, p[1] - 0.1, 0.2, 0.24, 0.2, neon('#ffe2a0', 0.6, 2.4));
    }
  });
  // The tables: on the deck and on the strip in front of the pavilion
  b.detail(() => {
    for (const t of CAFE_TABLES) table(b, t, t[0] < LAKEHOUSE.deck[2] ? dy : y, low);
  });
}

/** The bandstand and the café, a site each */
export function registerStands(low: boolean) {
  const { c, r } = BANDSTAND;
  site('westlake bandstand', [c[0] - r - 7.5, c[1] - r - 7.5, c[0] + r + 7.5, c[1] + r + 7.5], (into) => {
    const b = new Batch();
    bandstand(b, low);
    b.build(into, { cast: true, receive: true });
  });
  const [, z0, x1, z1] = LAKEHOUSE.rect;
  site('westlake lakehouse', [LAKEHOUSE.deck[0] - 1, z0 - 1, x1 + 1, z1 + 1], (into) => {
    const b = new Batch();
    cafe(b, low);
    b.build(into, { cast: true, receive: true });
  });
}

/* ---------- The band and the café's people (docs/westlake-plan.md Phase 7) ---------- */

/** A player's chair, their music stand and their instrument, drawn where they sit (`at`, facing `ry`) */
function player(b: Batch, x: number, z: number, ry: number, part: Part) {
  const [fx, fz] = [Math.sin(ry), Math.cos(ry)];
  const [rx, rz] = [Math.cos(ry), -Math.sin(ry)];
  /** A point `f` forward, `r` to the right and `u` up from the chair's seat */
  const P = (f: number, r: number, u: number): [number, number, number] => [x + fx * f + rx * r, BAND_FLOOR + BAND_SEAT + u, z + fz * f + rz * r];
  const put = (g: THREE.BufferGeometry, f: number, r: number, u: number, m: THREE.Material) => b.add(g.rotateY(ry).translate(...P(f, r, u)), m);
  // The chair: a seat, a back, four legs
  put(new THREE.BoxGeometry(0.32, 0.04, 0.3), -0.03, 0, -0.02, CHAIR);
  put(new THREE.BoxGeometry(0.32, 0.34, 0.03), -0.18, 0, 0.17, CHAIR);
  for (const [lf, lr] of [[0.1, 0.13], [0.1, -0.13], [-0.16, 0.13], [-0.16, -0.13]]) put(new THREE.CylinderGeometry(0.012, 0.012, BAND_SEAT, 4), lf, lr, -BAND_SEAT / 2 - 0.02, IRON);
  // (forward along the way they face: a geometry along +z turned to face `ry`)
  const along = (g: THREE.BufferGeometry, pitch = 0) => g.rotateX(Math.PI / 2 + pitch);
  switch (part) {
    case 'cornet':
      put(along(new THREE.CylinderGeometry(0.018, 0.018, 0.2, 6), 0.25), 0.18, 0.01, 0.25, BRASS);
      put(along(new THREE.CylinderGeometry(0.06, 0.02, 0.08, 8, 1, true), 0.25), 0.3, 0.01, 0.22, BRASS);
      put(new THREE.BoxGeometry(0.05, 0.05, 0.1), 0.16, 0.01, 0.22, BRASS_DARK);
      break;
    case 'trombone':
      put(along(new THREE.CylinderGeometry(0.012, 0.012, 0.56, 5), 0.18), 0.36, -0.03, 0.22, BRASS);
      put(along(new THREE.CylinderGeometry(0.012, 0.012, 0.56, 5), 0.18), 0.36, 0.03, 0.22, BRASS);
      put(along(new THREE.CylinderGeometry(0.08, 0.02, 0.14, 8, 1, true), 0.18), 0.3, 0.08, 0.28, BRASS);
      break;
    case 'tuba':
      put(new THREE.CylinderGeometry(0.1, 0.1, 0.28, 10), 0.16, 0.02, 0.14, BRASS);
      put(new THREE.CylinderGeometry(0.15, 0.08, 0.16, 10, 1, true), 0.14, 0.1, 0.36, BRASS);
      put(new THREE.TorusGeometry(0.08, 0.014, 4, 10), 0.18, -0.06, 0.12, BRASS_DARK);
      break;
    case 'drum':
      // A snare on its stand in front, a bass drum on its side beside it
      put(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 12), 0.24, 0, 0.0, DRUM_SHELL);
      put(new THREE.CylinderGeometry(0.152, 0.152, 0.012, 12), 0.24, 0, 0.056, DRUM_HEAD);
      put(new THREE.CylinderGeometry(0.012, 0.012, BAND_SEAT, 4), 0.24, 0, -BAND_SEAT / 2, IRON);
      put(new THREE.CylinderGeometry(0.24, 0.24, 0.2, 14).rotateZ(Math.PI / 2), 0.3, 0.42, -BAND_SEAT + 0.24, DRUM_SHELL);
      for (const s of [-1, 1]) put(new THREE.CylinderGeometry(0.242, 0.242, 0.012, 14).rotateZ(Math.PI / 2), 0.3, 0.42 + s * 0.1, -BAND_SEAT + 0.24, DRUM_HEAD);
      return;
  }
  // The music stand in front: a post and a tilted desk
  put(new THREE.CylinderGeometry(0.01, 0.01, 0.62, 4), 0.58, 0, -0.14, IRON);
  put(new THREE.BoxGeometry(0.26, 0.18, 0.012).rotateX(-0.5), 0.56, 0, 0.2, IRON);
  put(new THREE.BoxGeometry(0.22, 0.14, 0.004).rotateX(-0.5), 0.548, 0, 0.205, DRUM_HEAD);
}

/**
 * The band, the café's people and the woodland walk's into the city's crowd (life.ts `addPeople()`; phones take every
 * other listener and diner and leave out the walk's trimmed half), and the band's chairs, stands and instruments, shown
 * while it plays; `BAND_NOW` kept for the sound
 */
export function registerStandsLife(scene: THREE.Scene, tick: (f: Tick) => void, low: boolean) {
  let hour = 12;
  const day = () => clockAt(Date.now()).day;
  addPeople(
    [...bandPeople(day), ...listeners(day).filter((_, i) => !low || i % 2 === 0), ...DINERS.filter((_, i) => !low || i % 2 === 0)],
    [waiter(() => hour), ...RAMBLE_PEOPLE.filter((p) => !(low && p.trim))]
  );
  const group = new THREE.Group();
  group.name = 'westlake-band';
  const b = new Batch();
  for (const s of BAND) player(b, s.x, s.z, s.ry, s.part);
  b.build(group, { cast: !low, receive: true, lift: false });
  group.visible = false;
  scene.add(group);
  const [cx, cz] = BANDSTAND.c;
  tick((env) => {
    hour = env.hour;
    BAND_NOW.on = bandOn(day(), hour);
    // (only near enough to see: the crowd draws nobody past 170)
    group.visible = BAND_NOW.on && Math.hypot(CROWD_VIEW.eye.x - cx, CROWD_VIEW.eye.z - cz) < 180;
  });
}
