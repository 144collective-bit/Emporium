/*
 * Sunridge's yards drawn (docs/suburb-plan.md Phase 3; the data is sunyards.ts), sites in Sunridge's chunk: each
 * yard in its house's frame (the front's decomposed granite or lawn, the desert's agave, barrel cactus, prickly pear,
 * ocotillo, saguaros, palo verdes and boulders, the lawns' palms, shade trees, shrubs and flower beds; the back's
 * patio, ramada, grill, pool with its coping and deck, loungers, trampolines, swing sets and sheds; the bins), and the
 * block walls in sites a tile each (their caps, the gates in the returns). Trees, walls, pools and the ground at every
 * distance; the small plants and the back yards' things near only, fewer on phones.
 */
import * as THREE from 'three';
import { Batch, lit, siteMat, toon } from './kit';
import { site } from './tilework';
import { SLAB } from './world';
import { hip } from './roofs3d';
import { addSolids } from './solids';
import { TILE, tileOf } from './tiles';
import { HOUSES, SCHEMES, type House } from './sunhouses';
import { BLOCK, GROUNDS, WALLS, YARDS, YARD_SOLIDS, type Plant, type Yard } from './sunyards';
import { LOTS } from './sunridgelots';
import type { Pt } from './sunridge';

const DG = GROUNDS.map((c) => toon(c));
const LAWN = toon('#4f9a49');
const BLOCK_WALL = toon('#c9b799');
const BLOCK_CAP = toon('#b19f80');
const GATE = toon('#2f2d2b');
const CONCRETE = toon('#c8c0b0');
const DECK = toon('#d8cdb6');
const COPING = toon('#e2d7c0');
const POOL = siteMat('sun-pool', lit(toon('#4fb5d6', { emissive: '#2fd2ff' }), 0, 0.55));
const AGAVE = toon('#6f9a86');
const CACTUS = toon('#4f7d3d');
const PEAR = toon('#6b9245');
const OCOTILLO = toon('#5b6a3b');
const BLOOM = toon('#d2452e');
const PALO_TRUNK = toon('#86a052');
const PALO_LEAF = toon('#a9c26b');
const BOULDER = toon('#8c7a66');
const PALM_TRUNK = toon('#9b8c74');
const PALM_LEAF = toon('#4f8a3e');
const TRUNK = toon('#6b4e36');
const LEAF = toon('#5a8c3d');
const SHRUB = toon('#5f8a45');
const FLOWERS = [toon('#e0b23a'), toon('#d0567a'), toon('#e8e0d0')];
const BED = toon('#6e5039');
const METAL = toon('#3a3a3e');
const WHITE = toon('#e9e4da');
const MAT = toon('#202024');
const PAD = toon('#2f6fb8');
const SHED = toon('#c9b28a');
const SHED_ROOF = toon('#7d6b57');
const BIN_A = toon('#4a5a4a');
const BIN_B = toon('#3a5a8a');

/** A house's frame: local x along the street, z out to it (-v), y up from the lot's top (sunhouses3d.ts) */
const frameOf = (h: House) => new THREE.Matrix4().set(h.u[0], 0, -h.v[0], h.o[0], 0, 1, 0, SLAB, h.u[1], 0, -h.v[1], h.o[1], 0, 0, 0, 1);

function drawYard(b: Batch, h: House, y: Yard, low: boolean) {
  const M = frameOf(h);
  const add = (g: THREE.BufferGeometry, m: THREE.Material) => b.add(g.applyMatrix4(M), m);
  const box = (u0: number, u1: number, v0: number, v1: number, y0: number, y1: number, m: THREE.Material) =>
    add(new THREE.BoxGeometry(u1 - u0, y1 - y0, v1 - v0).translate((u0 + u1) / 2, (y0 + y1) / 2, -(v0 + v1) / 2), m);
  const flat = (pts: Pt[], yy: number, m: THREE.Material) => {
    const s = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, v)));
    // (the shape in u, v; laid flat with v in to the lot: z is -v)
    add(new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2).translate(0, yy, 0), m);
  };
  const rect = (u0: number, u1: number, v0: number, v1: number, yy: number, m: THREE.Material) =>
    add(new THREE.PlaneGeometry(u1 - u0, v1 - v0).rotateX(-Math.PI / 2).translate((u0 + u1) / 2, yy, -(v0 + v1) / 2), m);
  const at = (g: THREE.BufferGeometry, u: number, v: number, yy = 0) => g.translate(u, yy, -v);

  // The front ground
  for (const g of y.ground) flat(g, 0.008, y.front === 'desert' ? DG[y.groundTone] : LAWN);

  // The plants: the trees at every distance, the rest near only (phones fewer)
  const big = (p: Plant) => p.kind === 'paloverde' || p.kind === 'saguaro' || p.kind === 'palm' || p.kind === 'shade';
  for (const p of y.plants.filter(big)) plant(p);
  b.detail(() => {
    const small = y.plants.filter((p) => !big(p));
    for (const [k, p] of small.entries()) if (!low || k % 2 === 0) plant(p);
  });
  function plant(p: Plant) {
    const { u, v, s } = p;
    switch (p.kind) {
      case 'agave':
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          add(at(new THREE.ConeGeometry(0.045 * s, 0.36 * s, 4).rotateZ(-0.75).rotateY(a).translate(Math.cos(a) * 0.1 * s, 0.12 * s, -Math.sin(a) * 0.1 * s), u, v, 0.008), AGAVE);
        }
        break;
      case 'barrel':
        add(at(new THREE.SphereGeometry(0.14 * s, 8, 6).scale(1, 0.85, 1), u, v, 0.11 * s), CACTUS);
        add(at(new THREE.SphereGeometry(0.1 * s, 7, 5), u + 0.22 * s, v + 0.05, 0.08 * s), CACTUS);
        break;
      case 'pear':
        for (const [dx, dy, r] of [
          [0, 0.18, 0],
          [0.12, 0.38, 0.5],
          [-0.12, 0.36, -0.45],
          [0.04, 0.55, 0.15],
        ])
          add(at(new THREE.SphereGeometry(0.11 * s, 7, 5).scale(1, 1.25, 0.32).rotateZ(r).rotateY(u * 3), u + dx * s, v, dy * s), PEAR);
        break;
      case 'ocotillo':
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2 + u;
          const g = new THREE.CylinderGeometry(0.012, 0.02, 1.1 * s, 4, 1, true).translate(0, 0.55 * s, 0).rotateZ(0.22).rotateY(a);
          add(at(g, u, v), OCOTILLO);
          add(at(new THREE.ConeGeometry(0.03, 0.12, 4).translate(0, 1.1 * s, 0).rotateZ(0.22).rotateY(a), u, v), BLOOM);
        }
        break;
      case 'saguaro': {
        const H = 2.1 * s;
        add(at(new THREE.CylinderGeometry(0.11, 0.13, H, 8).translate(0, H / 2, 0), u, v), CACTUS);
        add(at(new THREE.SphereGeometry(0.11, 8, 5).translate(0, H, 0), u, v), CACTUS);
        for (const [side, y0, up] of [
          [1, 0.8, 0.6],
          [-1, 1.05, 0.45],
        ]) {
          add(at(new THREE.CylinderGeometry(0.075, 0.075, 0.32, 6).rotateZ(Math.PI / 2).translate(side * 0.24, y0 * s, 0), u, v), CACTUS);
          add(at(new THREE.CylinderGeometry(0.075, 0.075, up * s, 6).translate(side * 0.38, y0 * s + (up * s) / 2, 0), u, v), CACTUS);
          add(at(new THREE.SphereGeometry(0.075, 6, 4).translate(side * 0.38, y0 * s + up * s, 0), u, v), CACTUS);
        }
        break;
      }
      case 'paloverde': {
        // A few green trunks spreading from the ground, a light, open canopy
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2 + u;
          add(at(new THREE.CylinderGeometry(0.035, 0.06, 1.3 * s, 5, 1, true).translate(0, 0.65 * s, 0).rotateZ(0.35).rotateY(a), u, v), PALO_TRUNK);
        }
        for (let k = 0; k < (low ? 3 : 5); k++) {
          const a = (k / 5) * Math.PI * 2 + v;
          const r = k === 0 ? 0 : 0.5 * s;
          add(at(new THREE.IcosahedronGeometry(0.42 * s, 0).scale(1, 0.45, 1), u + Math.cos(a) * r, v + Math.sin(a) * r, 1.35 * s + (k % 2) * 0.12), PALO_LEAF);
        }
        break;
      }
      case 'boulder':
        add(at(new THREE.DodecahedronGeometry(0.2 * s, 0).scale(1.2, 0.7, 1), u, v, 0.08 * s), BOULDER);
        break;
      case 'palm': {
        const H = 2.6 * s;
        add(at(new THREE.CylinderGeometry(0.07, 0.1, H, 6, 1, true).translate(0, H / 2, 0), u, v), PALM_TRUNK);
        for (let k = 0; k < (low ? 6 : 9); k++) {
          const a = (k / (low ? 6 : 9)) * Math.PI * 2;
          add(at(new THREE.BoxGeometry(0.95 * s, 0.025, 0.2).translate(0.47 * s, 0, 0).rotateZ(-0.45).rotateY(a).translate(0, H, 0), u, v), PALM_LEAF);
        }
        break;
      }
      case 'shade':
        add(at(new THREE.CylinderGeometry(0.07, 0.1, 1.2 * s, 6, 1, true).translate(0, 0.6 * s, 0), u, v), TRUNK);
        add(at(new THREE.IcosahedronGeometry(0.75 * s, 1).scale(1, 0.85, 1), u, v, 1.6 * s), LEAF);
        break;
      case 'shrub':
        add(at(new THREE.SphereGeometry(0.22 * s, 7, 5).scale(1, 0.8, 1), u, v, 0.15 * s), SHRUB);
        break;
      case 'bed': {
        add(at(new THREE.CircleGeometry(0.45, 14).scale(1.4, 1, 1).rotateX(-Math.PI / 2), u, v, 0.016), BED);
        for (let k = 0; k < (low ? 4 : 9); k++) {
          const a = k * 2.4;
          const r = 0.12 + (k % 3) * 0.12;
          add(at(new THREE.SphereGeometry(0.06, 5, 4), u + Math.cos(a) * r * 1.4, v + Math.sin(a) * r, 0.07), FLOWERS[k % 3]);
        }
        break;
      }
    }
  }

  // The bins beside the garage
  b.detail(() => {
    const { u, v } = y.bins;
    box(u - 0.17, u + 0.13, v - 0.15, v + 0.15, 0, 0.5, BIN_A);
    box(u + 0.17, u + 0.47, v - 0.15, v + 0.15, 0, 0.5, BIN_B);
  });

  // The back yard's ground: decomposed granite to the walls, a patch of lawn in it where there's no pool
  {
    const [u0, v0, u1, v1] = y.back;
    rect(u0, u1, v0, v1, 0.006, DG[(y.groundTone + 1) % DG.length]);
    if (!y.pool && v1 - v0 > 2) rect(u0 + 0.5, u1 - 0.5, y.patio[3] + 0.35, v1 - 0.45, 0.011, LAWN);
  }
  // The back yard: its patio, the ramada over it, the grill
  const [pu0, pv0, pu1, pv1] = y.patio;
  rect(pu0, pu1, pv0, pv1, 0.017, CONCRETE);
  if (y.ramada) {
    const trim = toon(SCHEMES[h.scheme].trim);
    const top = 1.5;
    box(pu0 - 0.05, pu1 + 0.05, pv0, pv1 + 0.05, top, top + 0.1, trim);
    for (const u of [pu0 + 0.08, pu1 - 0.08]) box(u - 0.07, u + 0.07, pv1 - 0.12, pv1 + 0.02, 0, top, trim);
  }
  b.detail(() => {
    const { u, v } = y.grill;
    box(u - 0.22, u + 0.22, v - 0.15, v + 0.15, 0.45, 0.68, METAL);
    for (const du of [-0.18, 0.18]) box(u + du - 0.02, u + du + 0.02, v - 0.02, v + 0.02, 0, 0.45, METAL);
    if (low) return;
    // A table and its chairs on the patio
    const tu = (pu0 + pu1) / 2 - 0.4;
    const tv = (pv0 + pv1) / 2 + 0.1;
    box(tu - 0.35, tu + 0.35, tv - 0.3, tv + 0.3, 0.42, 0.46, WHITE);
    box(tu - 0.03, tu + 0.03, tv - 0.03, tv + 0.03, 0, 0.42, METAL);
    for (const [du, dv] of [
      [-0.55, 0],
      [0.55, 0],
    ])
      box(tu + du - 0.15, tu + du + 0.15, tv + dv - 0.15, tv + dv + 0.15, 0, 0.27, WHITE);
  });

  // The pool: its deck, coping and water
  if (y.pool) {
    const { u0, u1, v0, v1 } = y.pool;
    rect(u0 - 0.45, u1 + 0.45, v0 - 0.45, v1 + 0.35, 0.023, DECK);
    const c = 0.12;
    box(u0 - c, u1 + c, v0 - c, v0, 0, 0.07, COPING);
    box(u0 - c, u1 + c, v1, v1 + c, 0, 0.07, COPING);
    box(u0 - c, u0, v0, v1, 0, 0.07, COPING);
    box(u1, u1 + c, v0, v1, 0, 0.07, COPING);
    rect(u0, u1, v0, v1, 0.04, POOL);
    b.detail(() => {
      if (low) return;
      // Two loungers on the deck at its near side
      for (const k of [0, 1]) {
        const u = u0 + 0.4 + k * 0.75;
        box(u - 0.22, u + 0.22, v0 - 0.42 - 0.9, v0 - 0.42, 0.18, 0.24, WHITE);
        box(u - 0.22, u + 0.22, v0 - 0.42 - 0.3, v0 - 0.42, 0.24, 0.5, WHITE);
      }
    });
  }

  // The trampolines, swing sets and sheds (near only, but the sheds)
  for (const e of y.extras) {
    if (e.kind === 'shed') {
      box(e.u - 0.5, e.u + 0.5, e.v - 0.4, e.v + 0.4, 0, 0.95, SHED);
      const [r, so] = hip(e.u - 0.5, -(e.v - 0.4), e.u + 0.5, -(e.v + 0.4), 0.95, 0.3, 0.08);
      add(r, SHED_ROOF);
      add(so, SHED);
      b.detail(() => box(e.u - 0.22, e.u + 0.22, e.v - 0.41, e.v - 0.39, 0, 0.75, SHED_ROOF));
      continue;
    }
    if (low) continue;
    b.detail(() => {
      if (e.kind === 'trampoline') {
        add(at(new THREE.CircleGeometry(0.62, 18).rotateX(-Math.PI / 2), e.u, e.v, 0.42), MAT);
        add(at(new THREE.RingGeometry(0.62, 0.74, 18).rotateX(-Math.PI / 2), e.u, e.v, 0.43), PAD);
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2 + 0.4;
          add(at(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 4).translate(0, 0.21, 0), e.u + Math.cos(a) * 0.68, e.v + Math.sin(a) * 0.68), METAL);
        }
      } else {
        // An A-frame swing set: its legs, top bar and two seats
        for (const du of [-0.7, 0.7])
          for (const dv of [-0.3, 0.3]) add(at(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 4).rotateX(dv > 0 ? -0.22 : 0.22).translate(0, 0.62, 0), e.u + du, e.v + dv * 0.5), METAL);
        add(at(new THREE.CylinderGeometry(0.03, 0.03, 1.45, 5).rotateZ(Math.PI / 2), e.u, e.v, 1.24), METAL);
        for (const du of [-0.3, 0.3]) {
          box(e.u + du - 0.15, e.u + du + 0.15, e.v - 0.08, e.v + 0.08, 0.32, 0.36, PAD);
          for (const d of [-0.12, 0.12]) box(e.u + du + d - 0.005, e.u + du + d + 0.005, e.v - 0.005, e.v + 0.005, 0.36, 1.24, METAL);
        }
      }
    });
  }
}

export function registerYards(low: boolean, scene: THREE.Scene | null) {
  const lots = new Map(LOTS.map((l) => [l.id, l]));
  const houses = new Map(HOUSES.map((h) => [h.id, h]));
  for (const y of YARDS) {
    const h = houses.get(y.house)!;
    const l = lots.get(h.lot)!;
    const pts = [...l.front, ...l.back];
    const rect: [number, number, number, number] = [Math.min(...pts.map((p) => p[0])) - 2, Math.min(...pts.map((p) => p[1])) - 2, Math.max(...pts.map((p) => p[0])) + 2, Math.max(...pts.map((p) => p[1])) + 2];
    site(`sunridge yard ${h.id}`, rect, (into) => {
      const b = new Batch();
      drawYard(b, h, y, low);
      b.build(into, { cast: true, receive: true });
    });
  }
  // The block walls, a site a tile (by each one's middle)
  const byTile = new Map<string, typeof WALLS>();
  for (const w of WALLS) {
    const [i, j] = tileOf((w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2);
    const k = `${i},${j}`;
    if (!byTile.has(k)) byTile.set(k, []);
    byTile.get(k)!.push(w);
  }
  for (const [k, list] of byTile) {
    const [i, j] = k.split(',').map(Number);
    site(`sunridge walls ${k}`, [i * TILE - 6, j * TILE - 6, (i + 1) * TILE + 6, (j + 1) * TILE + 6], (into) => {
      const b = new Batch();
      const y0 = SLAB;
      const y1 = SLAB + BLOCK.h;
      const piece = (a: Pt, c: Pt, w: number, ya: number, yb: number, m: THREE.Material) => {
        const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
        if (l < 1e-3) return;
        b.add(new THREE.BoxGeometry(l, yb - ya, w).rotateY(-Math.atan2(c[1] - a[1], c[0] - a[0])).translate((a[0] + c[0]) / 2, (ya + yb) / 2, (a[1] + c[1]) / 2), m);
      };
      const lerp = (a: Pt, c: Pt, t: number): Pt => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t];
      for (const w of list) {
        const runs: [number, number, THREE.Material, number][] = w.gate ? [[0, w.gate[0], BLOCK_WALL, BLOCK.t], [w.gate[0], w.gate[1], GATE, 0.05], [w.gate[1], 1, BLOCK_WALL, BLOCK.t]] : [[0, 1, BLOCK_WALL, BLOCK.t]];
        for (const [t0, t1, m, th] of runs) {
          if (t1 - t0 < 1e-3) continue;
          const [a, c] = [lerp(w.a, w.b, t0), lerp(w.a, w.b, t1)];
          piece(a, c, th, y0, m === GATE ? y1 - 0.08 : y1, m);
          if (m !== GATE) {
            // (its cap a touch wider, and longer so the caps meet where walls do)
            const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
            const [ux, uz] = [(c[0] - a[0]) / l, (c[1] - a[1]) / l];
            piece([a[0] - ux * 0.04, a[1] - uz * 0.04], [c[0] + ux * 0.04, c[1] + uz * 0.04], BLOCK.t + 0.05, y1, y1 + 0.05, BLOCK_CAP);
          }
        }
      }
      b.build(into, { cast: true, receive: true });
    });
  }
  if (scene) addSolids(YARD_SOLIDS);
}
