/*
 * Westlake Park's grand terrace drawn (docs/westlake-plan.md Phase 3b; the data is westlake.ts `GRAND`, `grandY()`),
 * a site in the park's chunk: the sunken plaza at the water's level, paved, a ring inlaid round its fountain, its
 * carved balustrade along the water; its side walls (up to the lawn where the land is, a balustrade at the plaza's
 * level over the water); the arcade's wall under the lawn with its three arches into a tiled recess; the two flights
 * down from the lawn along that wall, their string walls stepped and their balustrades sloping; the fountain (a basin,
 * two bowls and the winged figure in bronze, arms raised); lanterns at the steps' heads and the plaza's front corners.
 * Balusters, tiles and the figure's detail near only.
 */
import * as THREE from 'three';
import { Batch, neon, toon } from './kit';
import { SLAB } from './world';
import { site } from './tilework';
import { BED_Y, GRAND, grandAt, lakeDist, type Pt } from './westlake';
import { ORNATE } from './palette';

const STONE = toon(ORNATE.stone);
const ROUGH = toon(ORNATE.rough);
const DRESSED = toon(ORNATE.dressed);
const TILE = toon(ORNATE.tile);
const TILE_DARK = toon(ORNATE.tileDark);
const BRONZE = toon(ORNATE.bronze);
const WATER = toon('#4fb5d6');
const IRON = toon('#1b1830');

/** The terrace's turn: its local x along `u` (out of the water), its local z along the shore */
const RY = Math.atan2(-GRAND.u[1], GRAND.u[0]);
/** Is the frame's local z the shore's way (`t`) or against it */
const ZS = Math.sign(-GRAND.u[1] * GRAND.t[0] + GRAND.u[0] * GRAND.t[1]) || 1;
/** A height over the lawn's slab, absolute */
const Y = (h: number) => SLAB + h;
const P = GRAND.plaza;

/** A box in the terrace's frame: d0..d1 out of the water, s0..s1 along the shore, h0..h1 over the slab */
function piece(d0: number, d1: number, s0: number, s1: number, h0: number, h1: number) {
  const c = grandAt((d0 + d1) / 2, (s0 + s1) / 2);
  return new THREE.BoxGeometry(Math.abs(d1 - d0), Math.abs(h1 - h0), Math.abs(s1 - s0)).rotateY(RY).translate(c[0], Y((h0 + h1) / 2), c[1]);
}
/** A geometry made in the frame (x along d, y up over the slab, z along s) placed in the world */
function placed(g: THREE.BufferGeometry, d: number, s: number, h: number) {
  const c = grandAt(d, s);
  return g.scale(1, 1, ZS).rotateY(RY).translate(c[0], Y(h), c[1]);
}

/**
 * A balustrade along a straight run in the frame (d, s at each end), its foot at h0 and h1 there: a plinth, a rail on
 * top, balusters between (near only), a pier at each end
 */
function balustrade(b: Batch, low: boolean, a: [number, number, number], c: [number, number, number]) {
  const [d0, s0, h0] = a;
  const [d1, s1, h1] = c;
  const len = Math.hypot(d1 - d0, s1 - s0);
  const n = Math.max(1, Math.ceil(len / 0.6));
  for (let i = 0; i < n; i++) {
    const [f0, f1] = [i / n, (i + 1) / n];
    const lerp = (f: number) => [d0 + (d1 - d0) * f, s0 + (s1 - s0) * f, h0 + (h1 - h0) * f] as const;
    const [p, q] = [lerp(f0), lerp(f1)];
    const hm = (p[2] + q[2]) / 2;
    const dd = (p[0] + q[0]) / 2;
    const ss = (p[1] + q[1]) / 2;
    const w = 0.3;
    // (a run along d or along s: the plinth and the rail as boxes the piece long)
    const along = Math.abs(d1 - d0) > Math.abs(s1 - s0);
    const [ld, ls] = along ? [len / n + 0.02, w] : [w, len / n + 0.02];
    b.add(piece(dd - ld / 2, dd + ld / 2, ss - ls / 2, ss + ls / 2, hm, hm + 0.16), DRESSED);
    b.add(piece(dd - ld / 2, dd + ld / 2, ss - (ls + (along ? 0.08 : 0)) / 2, ss + (ls + (along ? 0.08 : 0)) / 2, hm + 0.78, hm + 0.9), DRESSED);
  }
  for (const [d, s, h] of [a, c]) b.add(piece(d - 0.22, d + 0.22, s - 0.22, s + 0.22, h, h + 1.05), DRESSED);
  b.detail(() => {
    if (low) return;
    const m = Math.max(2, Math.ceil(len / 0.28));
    for (let i = 1; i < m; i++) {
      const f = i / m;
      const [d, s, h] = [d0 + (d1 - d0) * f, s0 + (s1 - s0) * f, h0 + (h1 - h0) * f];
      const g = new THREE.LatheGeometry([new THREE.Vector2(0.05, 0), new THREE.Vector2(0.08, 0.12), new THREE.Vector2(0.05, 0.3), new THREE.Vector2(0.09, 0.45), new THREE.Vector2(0.05, 0.62)], 6);
      b.add(placed(g, d, s, h + 0.16), STONE);
    }
  });
}

/** A lantern on a post, its foot at h over the slab */
function lantern(b: Batch, d: number, s: number, h: number) {
  b.add(piece(d - 0.2, d + 0.2, s - 0.2, s + 0.2, h, h + 0.5), DRESSED);
  const c = grandAt(d, s);
  b.add(new THREE.CylinderGeometry(0.05, 0.07, 1.6, 6).translate(c[0], Y(h + 1.3), c[1]), IRON);
  b.detail(() => {
    b.add(new THREE.BoxGeometry(0.26, 0.32, 0.26).translate(c[0], Y(h + 2.25), c[1]), neon('#ffe2a0', 0.6, 2.4));
    b.add(new THREE.ConeGeometry(0.24, 0.2, 4).rotateY(Math.PI / 4).translate(c[0], Y(h + 2.5), c[1]), IRON);
  });
}

/** The fountain: a basin, two bowls on their stems, the winged figure on top */
function fountain(b: Batch, low: boolean) {
  const { d, r } = GRAND.fountain;
  const at = (g: THREE.BufferGeometry, h: number, m: THREE.Material) => b.add(placed(g, d, 0, h), m);
  // The basin: its wall and coping, its water
  at(new THREE.CylinderGeometry(r, r + 0.08, 0.55, 28, 1, true), P + 0.275, STONE);
  at(new THREE.TorusGeometry(r, 0.12, 4, 28).rotateX(Math.PI / 2), P + 0.56, DRESSED);
  at(new THREE.CircleGeometry(r - 0.05, 28).rotateX(-Math.PI / 2), P + 0.42, WATER);
  // The stem, the lower bowl, a column, the upper bowl
  const bowl = (rad: number) => new THREE.LatheGeometry([new THREE.Vector2(0.12, 0), new THREE.Vector2(rad * 0.5, 0.08), new THREE.Vector2(rad, 0.28), new THREE.Vector2(rad * 0.96, 0.32)], 18);
  at(new THREE.LatheGeometry([new THREE.Vector2(0.55, 0), new THREE.Vector2(0.4, 0.12), new THREE.Vector2(0.22, 0.5), new THREE.Vector2(0.3, 0.95), new THREE.Vector2(0.12, 1.0)], 14), P + 0.42, DRESSED);
  at(bowl(1.25), P + 1.4, STONE);
  at(new THREE.CircleGeometry(1.18, 18).rotateX(-Math.PI / 2), P + 1.68, WATER);
  at(new THREE.CylinderGeometry(0.12, 0.18, 0.8, 10), P + 2.1, DRESSED);
  at(bowl(0.7), P + 2.45, STONE);
  at(new THREE.CircleGeometry(0.66, 14).rotateX(-Math.PI / 2), P + 2.73, WATER);
  // The figure in bronze: a robe falling to its feet, a body, a head, arms raised, two wings swept up behind it
  const fy = P + 2.8;
  // (a robe flaring to the feet, a waist, the chest and shoulders)
  at(new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(0.3, 0), new THREE.Vector2(0.26, 0.2), new THREE.Vector2(0.17, 0.62), new THREE.Vector2(0.12, 0.9), new THREE.Vector2(0.16, 1.15), new THREE.Vector2(0.17, 1.28), new THREE.Vector2(0.07, 1.36), new THREE.Vector2(0.001, 1.37)], 12), fy, BRONZE);
  at(new THREE.SphereGeometry(0.13, 10, 8), fy + 1.48, BRONZE);
  for (const sg of [-1, 1]) {
    const arm = new THREE.CylinderGeometry(0.04, 0.05, 0.6, 6).translate(0, 0.3, 0).rotateX(sg * 0.5).rotateZ(-0.15);
    at(arm, fy + 1.28, BRONZE);
    // A wing: a long feathered blade, thin, raised and swept back from the shoulders
    const w = new THREE.Shape();
    w.moveTo(0, 0);
    w.bezierCurveTo(0.25, 0.35, 0.55, 0.85, 0.5, 1.35);
    w.bezierCurveTo(0.38, 1.1, 0.3, 0.9, 0.12, 0.75);
    w.bezierCurveTo(0.2, 0.6, 0.14, 0.4, 0, 0.3);
    w.lineTo(0, 0);
    const wing = new THREE.ExtrudeGeometry(w, { depth: 0.04, bevelEnabled: false }).rotateY(Math.PI / 2).rotateX(sg * 0.55).translate(-0.12, 0, sg * 0.06);
    at(wing, fy + 1.1, BRONZE);
  }
  b.detail(() => {
    if (low) return;
    // Water falling from each bowl's lip: thin streams round it
    for (const [rad, h0, h1, n] of [
      [0.68, 2.72, 1.7, 8],
      [1.24, 1.66, 0.45, 12],
    ] as const)
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        b.add(placed(new THREE.CylinderGeometry(0.03, 0.05, h0 - h1, 4), GRAND.fountain.d + Math.cos(a) * rad, Math.sin(a) * rad, P + (h0 + h1) / 2), WATER);
      }
  });
}

function terrace(b: Batch, low: boolean) {
  const { front: f, back: bk, half: h, foot, flight, steps, recess } = GRAND;
  const bed = BED_Y;
  // The plaza: a slab up from the bed, paved, an inlaid ring round the fountain and a border round its edge
  b.add(piece(f, bk, -h, h, bed, P), STONE);
  b.add(placed(new THREE.RingGeometry(GRAND.fountain.r + 0.5, GRAND.fountain.r + 0.9, 32).rotateX(-Math.PI / 2), GRAND.fountain.d, 0, P + 0.006), DRESSED);
  for (const sg of [-1, 1]) b.add(piece(f + 0.2, bk - flight - 0.2, sg * (h - 0.45), sg * (h - 0.15), P, P + 0.006), DRESSED);
  b.add(piece(f + 0.15, f + 0.45, -h + 0.15, h - 0.15, P, P + 0.006), DRESSED);
  // Its front over the water: a balustrade along it, a lantern at each corner
  balustrade(b, low, [f + 0.1, -h + 0.25, P], [f + 0.1, h - 0.25, P]);
  for (const sg of [-1, 1]) lantern(b, f + 0.35, sg * (h - 0.35), P);
  // Its sides: up to the lawn where the land is (a balustrade on top), a balustrade at the plaza's level over the water
  for (const sg of [-1, 1]) {
    const n = 16;
    for (let i = 0; i < n; i++) {
      const [d0, d1] = [f + ((bk - flight - f) * i) / n, f + ((bk - flight - f) * (i + 1)) / n];
      const p: Pt = grandAt((d0 + d1) / 2, sg * (h + 0.15));
      // (up to the lawn wherever the land or the embankment is: no gap between it and the lake's rim)
      const land = lakeDist(p[0], p[1]) > -1.2;
      b.add(piece(d0, d1, sg * h, sg * (h + 0.7), bed, land ? 0.12 : P + 0.16), land ? ROUGH : STONE);
    }
    balustrade(b, low, [f + 0.3, sg * (h + 0.15), P], [f + 2.6, sg * (h + 0.15), P]);
    balustrade(b, low, [f + 2.6, sg * (h + 0.15), 0.12], [bk - flight, sg * (h + 0.15), 0.12]);
  }
  // The arcade's wall under the lawn: carved, three arches through it into a tiled recess, a cornice at the lawn
  const wall = new THREE.Shape();
  wall.moveTo(-h, 0);
  wall.lineTo(h, 0);
  wall.lineTo(h, -P);
  wall.lineTo(-h, -P);
  wall.lineTo(-h, 0);
  const arches = [-1.8, 0, 1.8];
  for (const c of arches) {
    const hole = new THREE.Path();
    const [hw, sh] = [0.65, 1.1];
    hole.moveTo(c - hw, 0);
    hole.lineTo(c + hw, 0);
    hole.lineTo(c + hw, sh);
    hole.absarc(c, sh, hw, 0, Math.PI, false);
    hole.lineTo(c - hw, 0);
    wall.holes.push(hole);
  }
  // (the shape in s across and y up from the plaza; extruded out of the water through the wall's thickness)
  const face = new THREE.ExtrudeGeometry(wall, { depth: 0.5, bevelEnabled: false, curveSegments: 8 })
    .rotateY(Math.PI / 2)
    .scale(1, 1, ZS);
  const c0 = grandAt(bk, 0);
  b.add(face.rotateY(RY).translate(c0[0], Y(P), c0[1]), STONE);
  b.add(piece(bk - 0.08, bk + 0.55, -h, h, -0.12, 0.05), DRESSED);
  // (pilasters between the arches and at their ends)
  for (const sp of [-2.68, -0.9, 0.9, 2.68]) b.add(piece(bk - 0.12, bk, sp - 0.15, sp + 0.15, P, -0.12), DRESSED);
  // The recess: its floor, back wall, sides, a tiled ceiling under the lawn
  const rs = 2.6;
  b.add(piece(bk, bk + recess + 0.5, -rs, rs, bed, P), STONE);
  b.add(piece(bk + recess, bk + recess + 0.3, -rs, rs, P, -0.2), TILE_DARK);
  for (const sg of [-1, 1]) b.add(piece(bk, bk + recess, sg * rs, sg * (rs + 0.3), P, -0.2), TILE_DARK);
  // (under the lawn's slab, never flush with it)
  b.add(piece(bk + 0.4, bk + recess, -rs, rs, -0.32, -0.2), TILE);
  b.detail(() => {
    if (low) return;
    // The ceiling's tiles: a checker of the two
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 10; j++)
        if ((i + j) % 2) b.add(piece(bk + 0.45 + i * 0.27, bk + 0.7 + i * 0.27, -rs + j * 0.52, -rs + j * 0.52 + 0.48, -0.335, -0.325), TILE_DARK);
  });
  // The balustrade on the lawn over the arcade and the steps
  balustrade(b, low, [bk + 0.25, -h - 0.15, 0.12], [bk + 0.25, h + 0.15, 0.12]);
  // The flights down from the lawn, either side: each step a block, the string wall stepping down beside them, the
  // balustrade sloping with them
  const w = (h - foot) / steps;
  for (const sg of [-1, 1]) {
    for (let k = 0; k < steps; k++) {
      const top = P + ((k + 1) * -P) / (steps + 1);
      const [s0, s1] = [sg * (foot + k * w), sg * (foot + (k + 1) * w)];
      b.add(piece(bk - flight, bk, s0, s1, P, top), STONE);
      b.add(piece(bk - flight + 0.02, bk - 0.02, s0 + sg * (w - 0.08), s1, top, top + 0.012), DRESSED);
      b.add(piece(bk - flight - 0.3, bk - flight, s0, s1, P, top + 0.12), ROUGH);
    }
    balustrade(b, low, [bk - flight - 0.15, sg * foot, P + 0.12], [bk - flight - 0.15, sg * (h - 0.2), -0.02]);
    lantern(b, bk - flight - 0.15, sg * (foot - 0.3), P);
    lantern(b, bk + 0.3, sg * (h + 0.5), 0.0);
  }
  fountain(b, low);
}

/** The grand terrace, a site */
export function registerGrandTerrace(low: boolean) {
  const { front: f, back: bk, half: h, recess } = GRAND;
  const c = [grandAt(f - 1, -h - 2), grandAt(f - 1, h + 2), grandAt(bk + recess + 1, -h - 2), grandAt(bk + recess + 1, h + 2)];
  const rect: [number, number, number, number] = [Math.min(...c.map((p) => p[0])), Math.min(...c.map((p) => p[1])), Math.max(...c.map((p) => p[0])), Math.max(...c.map((p) => p[1]))];
  site('westlake grand terrace', rect, (into) => {
    const b = new Batch();
    terrace(b, low);
    b.build(into, { cast: true, receive: true });
  });
}
