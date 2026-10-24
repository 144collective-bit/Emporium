/*
 * Harbour Bridge on screen (river plan step 2; harbour.ts has the numbers):
 * the east ring avenue's suspension bridge over the river, drawn the city's
 * way (flat cartoon shading, ink outlines, warm light at night).
 *
 * - Two stone towers in the river on cutwater piers: a great pointed arch
 *   the roadway and the metro pass through, a smaller pointed arch through
 *   each leg for the footway, a ring of stones round each arch, a blind
 *   lancet up each leg, a string course, a cornice and parapet, the cables'
 *   saddles on top, and HARBOUR BRIDGE on a plaque over the great arch on
 *   both faces.
 * - The deck humped over the river: the avenue's four lanes (their lines,
 *   the median with the el's posts on it), a lattice girder each side of the
 *   roadway and along each outer edge, timber footways between them, iron
 *   lanterns on the outer girders with pools of their light at night.
 * - Four main cables from the anchorages on the promenades over the towers'
 *   saddles, suspenders down to the girders, a web of stays fanning from
 *   each tower's top, and a necklace of bulbs along the outer cables.
 *
 * The whole bridge is the spot's group (it lifts on hover). One Batch for the
 * stone, the steel and the lights, the plaques their own.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, PAL, canvasTex, fx, glowMat, glowTex, lit, neon, toon } from './kit';
import { SLAB, addPool } from './world';
import {
  ANCHORS,
  ANCHOR_Z,
  CABLE,
  CABLE_U,
  CROWN,
  DEPTH,
  FOOTWAY,
  FOOT_H,
  GIRDER,
  HALF,
  HX,
  MEDIAN_HALF,
  MID,
  ROADWAY,
  STAYS,
  SUSPENDER,
  TOWER,
  TOWERS,
  Z0,
  Z1,
  cableY,
  deckY,
} from './harbour';
import { LANE } from './layout';
import { WATER_Y } from './river';
import type { Spot } from './landmarks';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const STONE = toon('#c3b499');
const TRIM = toon('#a99a7e');
const DARK = toon('#5d5444');
const STEEL = toon('#46536b');
const STEEL_DARK = toon('#2f3849');
const CABLE_C = toon('#d6d0bd');
const ASPHALT = toon('#26243f');
const KERB = toon('#5a5290');
const TIMBER = toon('#8a6a48');
const LINE = toon('#e8e4f4');
const IRON = toon('#262233');
/** Lantern glass and the cables' bulbs: dark by day, warm at night (small and bright) */
const BULB = neon('#ffe2a0', 0.25, 2.4);

/* ---------- Shapes ---------- */

/** A box from (x0, y0, z0) to (x1, y1, z1) */
const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: THREE.Material) => b.box(x0, y0, z0, x1 - x0, y1 - y0, z1 - z0, mat);
/**
 * A box across the deck from u0 to u1 and along it from za to zb, its bottom `dy0` and top `dy1` over the deck there
 * (so it follows the hump)
 */
function onDeck(b: Batch, u0: number, u1: number, dy0: number, dy1: number, za: number, zb: number, mat: THREE.Material) {
  const g = new THREE.BoxGeometry(u1 - u0, 1, zb - za).translate(HX + (u0 + u1) / 2, 0.5, (za + zb) / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, deckY(p.getZ(i)) + (p.getY(i) > 0.5 ? dy1 : dy0));
  g.computeVertexNormals();
  b.add(g, mat);
}
/** Both sides of the bridge: [u0, u1] and its mirror */
const sides = ([a, c]: [number, number]): [number, number][] => [
  [-c, -a],
  [a, c],
];
/** A thin rod from a to c */
function rod(b: Batch, a: THREE.Vector3, c: THREE.Vector3, w: number, mat: THREE.Material) {
  const d = c.clone().sub(a);
  const g = new THREE.BoxGeometry(w, w, d.length()).lookAt(d);
  b.add(g.translate((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2), mat);
}
/** Cuts from a to c, none longer than `step` */
function cuts(a: number, c: number, step: number) {
  const n = Math.max(1, Math.ceil((c - a) / step));
  return Array.from({ length: n + 1 }, (_, i) => a + ((c - a) * i) / n);
}

/**
 * A pointed arch's outline added to a path, from its left foot at (cu - half, spring) over the point to (cu + half,
 * spring): two arcs, each of radius the span, centred on the other's springing (`out` widens it, for a ring round it)
 */
function pointed(path: THREE.Path, cu: number, half: number, spring: number, out = 0) {
  const R = 2 * half + out;
  const a = Math.acos(half / R);
  path.absarc(cu + half, spring, R, Math.PI, Math.PI - a, true);
  path.absarc(cu - half, spring, R, a, 0, true);
}
/** The same, back from the right foot over the point to the left one */
function pointedBack(path: THREE.Path, cu: number, half: number, spring: number, out = 0) {
  const R = 2 * half + out;
  const a = Math.acos(half / R);
  path.absarc(cu - half, spring, R, 0, a, false);
  path.absarc(cu + half, spring, R, Math.PI - a, Math.PI, false);
}
/** A shape in the u-y plane extruded `depth` along z, its back at z0 */
const slabZ = (shape: THREE.Shape, depth: number, z0: number) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 14 }).translate(HX, 0, z0);

/** HARBOUR BRIDGE on a bronze plaque */
function nameTex() {
  return canvasTex(1024, 128, (ctx, w, h) => {
    ctx.fillStyle = '#2a2a36';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#b9934e';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.font = `900 80px ${FONT_DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '16px';
    const g = ctx.createLinearGradient(0, 20, 0, h - 20);
    g.addColorStop(0, '#ffe7a3');
    g.addColorStop(1, '#d8a24a');
    ctx.fillStyle = g;
    ctx.fillText('HARBOUR BRIDGE', w / 2, h / 2 + 4);
  });
}

/* ---------- The towers ---------- */

function tower(b: Batch, plaques: Batch, z: number, name: THREE.Material) {
  const { hu, hz, arch, foot, leg, base } = TOWER;
  const dz = deckY(z);
  /** The tower's foot over the pier: just under the deck's underside */
  const yb = dz - DEPTH - 0.02;
  const fs = dz + FOOT_H + foot.spring;
  const fh = (foot.u[1] - foot.u[0]) / 2;
  const fc = (foot.u[0] + foot.u[1]) / 2;
  /** The string course's foot, over the footways' arches */
  const sy = fs + 1.6 * fh * 2 + 0.25;

  // The pier in the river, its cutwaters up and down the river, a ledge round its top
  const cut = new THREE.Shape([V(-base.hu - base.cut, 0, 0), V(-base.hu, -base.hz, 0), V(base.hu, -base.hz, 0), V(base.hu + base.cut, 0, 0), V(base.hu, base.hz, 0), V(-base.hu, base.hz, 0)].map((p) => new THREE.Vector2(p.x, p.y)));
  b.add(new THREE.ExtrudeGeometry(cut, { depth: yb - base.y, bevelEnabled: false }).rotateX(Math.PI / 2).translate(HX, yb, z), STONE);
  const ledge = new THREE.Shape([V(-base.hu - base.cut - 0.15, 0, 0), V(-base.hu - 0.05, -base.hz - 0.12, 0), V(base.hu + 0.05, -base.hz - 0.12, 0), V(base.hu + base.cut + 0.15, 0, 0), V(base.hu + 0.05, base.hz + 0.12, 0), V(-base.hu - 0.05, base.hz + 0.12, 0)].map((p) => new THREE.Vector2(p.x, p.y)));
  b.add(new THREE.ExtrudeGeometry(ledge, { depth: 0.2, bevelEnabled: false }).rotateX(Math.PI / 2).translate(HX, yb - 0.6, z), TRIM);

  // The tower: its outline with the great arch and the footways' arches cut up into it from its foot
  const s = new THREE.Shape();
  s.moveTo(-hu, yb);
  s.lineTo(-foot.u[1], yb);
  s.lineTo(-foot.u[1], fs);
  pointed(s, -fc, fh, fs);
  s.lineTo(-foot.u[0], yb);
  s.lineTo(-arch.half, yb);
  s.lineTo(-arch.half, arch.spring);
  pointed(s, 0, arch.half, arch.spring);
  s.lineTo(arch.half, yb);
  s.lineTo(foot.u[0], yb);
  s.lineTo(foot.u[0], fs);
  pointed(s, fc, fh, fs);
  s.lineTo(foot.u[1], yb);
  s.lineTo(hu, yb);
  s.lineTo(hu, TOWER.cornice);
  s.lineTo(-hu, TOWER.cornice);
  s.closePath();
  b.add(slabZ(s, hz * 2, z - hz), STONE);

  for (const f of [-1, 1]) {
    /** Just proud of this face */
    const zf = z + f * hz;
    const proud = (d: number) => (f > 0 ? zf : zf - d);
    // A ring of stones round each arch
    const ring = (cu: number, half: number, spring: number, band: number) => {
      const r = new THREE.Shape();
      r.moveTo(cu - half - band, spring);
      pointed(r, cu, half, spring, band);
      r.lineTo(cu + half, spring);
      pointedBack(r, cu, half, spring);
      r.closePath();
      b.add(slabZ(r, 0.06, proud(0.06)), TRIM);
    };
    ring(0, arch.half, arch.spring, 0.3);
    for (const e of [-1, 1]) ring(e * fc, fh, fs, 0.16);
    // A blind lancet up each leg over the string course, framed
    for (const e of [-1, 1]) {
      const lc = (e * (leg[0] + leg[1])) / 2;
      const lh = 0.42;
      const [y0, ys] = [sy + 0.45, 8.2];
      const frame = new THREE.Shape();
      frame.moveTo(lc - lh - 0.12, y0 - 0.12);
      frame.lineTo(lc + lh + 0.12, y0 - 0.12);
      frame.lineTo(lc + lh + 0.12, ys);
      pointedBack(frame, lc, lh + 0.12, ys);
      frame.closePath();
      b.add(slabZ(frame, 0.05, proud(0.05)), TRIM);
      const panel = new THREE.Shape();
      panel.moveTo(lc - lh, y0);
      panel.lineTo(lc + lh, y0);
      panel.lineTo(lc + lh, ys);
      pointedBack(panel, lc, lh, ys);
      panel.closePath();
      b.add(slabZ(panel, 0.09, proud(0.09)), DARK);
    }
    // The plaque over the great arch: a dark board, the name on it
    const [py0, py1] = [CROWN + 0.22, TOWER.cornice - 0.18];
    box(b, HX - 2.25, py0 - 0.06, f > 0 ? zf : zf - 0.05, HX + 2.25, py1 + 0.06, f > 0 ? zf + 0.05 : zf, DARK);
    const plane = new THREE.PlaneGeometry(4.3, py1 - py0).translate(0, (py0 + py1) / 2, 0);
    if (f < 0) plane.rotateY(Math.PI);
    plaques.add(plane.translate(HX, 0, zf + f * 0.06), name);
  }
  // A string course across the legs over the footways' arches, clear of the great arch
  const archAt = (y: number) => -arch.half + Math.sqrt(Math.max(0, 4 * arch.half * arch.half - (y - arch.spring) ** 2));
  for (const [a, c] of sides([archAt(sy + 0.15) + 0.36, hu + 0.06])) box(b, HX + a, sy, z - hz - 0.06, HX + c, sy + 0.15, z + hz + 0.06, TRIM);
  // The cornice, the parapet over it, the saddles' housings on top
  box(b, HX - hu - 0.25, TOWER.cornice - 0.15, z - hz - 0.2, HX + hu + 0.25, TOWER.cornice, z + hz + 0.2, TRIM);
  box(b, HX - hu - 0.1, TOWER.cornice, z - hz - 0.05, HX + hu + 0.1, TOWER.top, z + hz + 0.05, STONE);
  box(b, HX - hu - 0.16, TOWER.top, z - hz - 0.11, HX + hu + 0.16, TOWER.top + 0.08, z + hz + 0.11, TRIM);
  for (const u of CABLE_U) {
    box(b, HX + u - 0.32, TOWER.top + 0.08, z - 0.9, HX + u + 0.32, TOWER.saddle, z + 0.9, STONE);
    box(b, HX + u - 0.38, TOWER.saddle, z - 0.96, HX + u + 0.38, TOWER.saddle + 0.08, z + 0.96, TRIM);
  }
}

/* ---------- The deck ---------- */

/** The girders' runs along the deck: from the anchorages out to the towers and between them */
const RUNS: [number, number][] = [
  [ANCHORS[0].z[1], TOWERS[0] - TOWER.hz],
  [TOWERS[0] + TOWER.hz, TOWERS[1] - TOWER.hz],
  [TOWERS[1] + TOWER.hz, ANCHORS[2].z[0]],
];

function deck(b: Batch, low: boolean) {
  const lanterns: THREE.Vector3[] = [];
  const zs = cuts(Z0, Z1, 1);
  for (let i = 1; i < zs.length; i++) {
    const [za, zb] = [zs[i - 1], zs[i]];
    // The deck's steel body (its top just under the asphalt and the boards), the asphalt, the footways' boards
    onDeck(b, -HALF, HALF, -DEPTH, -0.01, za, zb, STEEL_DARK);
    onDeck(b, -ROADWAY, ROADWAY, -0.01, 0.032, za, zb, ASPHALT);
    for (const [a, c] of sides(FOOTWAY)) onDeck(b, a, c, -0.01, FOOT_H, za, zb, TIMBER);
    // The median's kerb (the el's posts stand on it), the edge lines, the lane lines dashed
    onDeck(b, -MEDIAN_HALF, MEDIAN_HALF, 0.032, SLAB, za, zb, KERB);
    for (const e of [-1, 1]) onDeck(b, e * (ROADWAY - 0.14) - 0.035, e * (ROADWAY - 0.14) + 0.035, 0.032, 0.04, za, zb, LINE);
    for (const e of [-1, 1]) onDeck(b, e * (MEDIAN_HALF + LANE) - 0.035, e * (MEDIAN_HALF + LANE) + 0.035, 0.032, 0.04, za + 0.2, za + 0.75, LINE);
  }
  // The girders: a lattice each side of the roadway and along each outer edge (chords, posts, near only the diagonals)
  for (const [z0, z1] of RUNS) {
    const zc = cuts(z0, z1, 1);
    for (const g of [GIRDER.inner, GIRDER.outer])
      for (const [a, c] of sides(g)) {
        const m = (a + c) / 2;
        for (let i = 1; i < zc.length; i++) {
          onDeck(b, a, c, -0.01, 0.12, zc[i - 1], zc[i], STEEL);
          onDeck(b, a - 0.02, c + 0.02, GIRDER.h - 0.1, GIRDER.h, zc[i - 1], zc[i], STEEL);
        }
        for (const z of zc) box(b, HX + m - 0.05, deckY(z) + 0.12, z - 0.05, HX + m + 0.05, deckY(z) + GIRDER.h - 0.1, z + 0.05, STEEL);
        if (!low)
          b.detail(() => {
            for (let i = 1; i < zc.length; i++) {
              const [p, q] = [zc[i - 1], zc[i]];
              rod(b, V(HX + m, deckY(p) + 0.14, p), V(HX + m, deckY(q) + GIRDER.h - 0.12, q), 0.05, STEEL);
              rod(b, V(HX + m, deckY(p) + GIRDER.h - 0.12, p), V(HX + m, deckY(q) + 0.14, q), 0.05, STEEL);
            }
          });
      }
    // Iron lanterns on the outer girders, both sides, their pools of light on the footway
    for (const z of cuts(z0 + 1.5, z1 - 1.5, 6))
      for (const e of [-1, 1]) {
        const u = (e * (GIRDER.outer[0] + GIRDER.outer[1])) / 2;
        const y = deckY(z) + GIRDER.h;
        box(b, HX + u - 0.05, y, z - 0.05, HX + u + 0.05, y + 1.0, z + 0.05, IRON);
        box(b, HX + u - 0.13, y + 1.0, z - 0.13, HX + u + 0.13, y + 1.32, z + 0.13, BULB);
        box(b, HX + u - 0.17, y + 1.32, z - 0.17, HX + u + 0.17, y + 1.4, z + 0.17, IRON);
        lanterns.push(V(HX + u, y + 1.16, z));
        addPool(HX + (e * (FOOTWAY[0] + FOOTWAY[1])) / 2, z, 2.4, deckY(z) + FOOT_H + 0.01);
      }
  }
  return lanterns;
}

/* ---------- The cables ---------- */

function cables(b: Batch, low: boolean) {
  const [a, c] = ANCHOR_Z;
  // The main cables: from the anchorages over the saddles, a piece every tile or so (and exactly at the towers)
  const zs = [...new Set([...cuts(a, TOWERS[0], 1), ...cuts(TOWERS[0], TOWERS[1], 1), ...cuts(TOWERS[1], c, 1)])].sort((p, q) => p - q);
  for (const u of CABLE_U) {
    for (let i = 1; i < zs.length; i++) rod(b, V(HX + u, cableY(zs[i - 1]), zs[i - 1]), V(HX + u, cableY(zs[i]), zs[i]), 0.14, CABLE_C);
    // The necklace of bulbs along the outer cables
    if (Math.abs(u) > GIRDER.inner[1])
      for (let z = a + 2; z < c - 1; z += 2) if (TOWERS.every((t) => Math.abs(z - t) > TOWER.hz + 0.4)) box(b, HX + u - 0.08, cableY(z) - 0.22, z - 0.08, HX + u + 0.08, cableY(z) - 0.06, z + 0.08, BULB);
  }
  // Suspenders from each cable to its girder's top
  const step = low ? SUSPENDER * 2 : SUSPENDER;
  for (const u of CABLE_U)
    for (let z = a + 1.2; z < c - 1.2; z += step) {
      if (TOWERS.some((t) => Math.abs(z - t) < TOWER.hz + 0.5)) continue;
      const top = cableY(z) - 0.07;
      const foot = deckY(z) + GIRDER.h;
      if (top - foot > 0.25) box(b, HX + u - 0.022, foot, z - 0.022, HX + u + 0.022, top, z + 0.022, CABLE_C);
    }
  // The stays: from each tower's top down to the girders, fanning out both ways
  for (const t of TOWERS)
    for (const f of [-1, 1])
      for (let k = 0; k < STAYS.n; k++) {
        const z = t + f * (TOWER.hz + STAYS.from + k * STAYS.step);
        if (z < a + 1 || z > c - 1) continue;
        for (const u of CABLE_U) rod(b, V(HX + u, TOWER.cornice - 0.4, t + f * TOWER.hz), V(HX + u, deckY(z) + GIRDER.h, z), 0.045, CABLE_C);
      }
  // The anchorages on the promenades: stone blocks with a cap, the cable's iron shoe going in
  for (const { z: [z0, z1], u } of ANCHORS)
    for (const [p, q] of sides(u)) {
      const top = CABLE.anchor + 0.4;
      box(b, HX + p, 0, z0, HX + q, top, z1, STONE);
      box(b, HX + p - 0.06, top, z0 - 0.06, HX + q + 0.06, top + 0.1, z1 + 0.06, TRIM);
      box(b, HX + p - 0.04, 0, z0 - 0.04, HX + q + 0.04, 0.3, z1 + 0.04, TRIM);
    }
}

export function buildHarbourBridge(scene: THREE.Scene, opts: { low: boolean }): { spot: Spot } {
  const group = new THREE.Group();
  group.name = 'harbour';
  scene.add(group);
  const b = new Batch();
  const plaques = new Batch();
  const name = lit(new THREE.MeshBasicMaterial({ map: nameTex(), toneMapped: true }), 0.95, 1.2);
  for (const z of TOWERS) tower(b, plaques, z, name);
  const lanterns = deck(b, opts.low);
  cables(b, opts.low);
  b.build(group);
  plaques.build(group, { cast: false, receive: false });
  // The lanterns' halos (points, always facing the camera), only at night
  const haloMat = lit(new THREE.PointsMaterial({ color: '#ffe2a0', map: glowTex, size: 0.9, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), 0, 0.4);
  group.add(fx(new THREE.Points(new THREE.BufferGeometry().setFromPoints(lanterns), haloMat)));

  // The hover ring on the water round the north tower's pier, and the pin over its top
  const ring = new THREE.Mesh(new THREE.RingGeometry(10.6, 10.76, 96), glowMat(PAL.cyan, 0, null));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(HX, WATER_Y + 0.06, TOWERS[0]);
  group.add(fx(ring));
  const spot: Spot = { id: 'harbour', group, focus: V(HX, 5, MID), size: 46, pin: V(HX, TOWER.saddle + 1.6, TOWERS[0]), ring };
  return { spot };
}
