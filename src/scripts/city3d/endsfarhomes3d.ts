/*
 * The far west round the compound, drawn (docs/ends-far-west-plan.md Phase 4; the numbers are endsfarhomes.ts): in
 * the far west's chunk (endsfar3d.ts registers it, in the worker too), all sites, all in the shared paint:
 *
 * - **A bungalow a site**: its walls, a pitched roof (the ridge along the lane, a gable each end), the front door
 *   and a window each side of it, a chimney; its front garden's low wall along the lane with the gap at its path,
 *   the path in flags, the back garden's fences, its shed; near only the window frames, the bin, the roof's ridge
 *   tiles and the gutter.
 * - **The allotments**: the wire fence as posts and two rails (a site a side), the paths in trodden earth; a site a
 *   pair of plots: dug beds, the crops in rows on them, a shed and a water butt on some; near only the crops' rows,
 *   the butts and the sheds' doors. Phones draw every other crop row.
 */
import * as THREE from 'three';
import { Batch, neon, toon } from './kit';
import { site } from './tilework';
import { COVER, KERB, SOIL } from './palette';
import { METAL } from './infill';
import { SLAB_Y, type Rect } from './endswood';
import { ALLOTMENT, BUNGALOW, BUNGALOWS, FAR_FENCE, FRONT_WALL, PLOTS, SHED_H, WIRE, backFences, frontWall, type Bungalow, type Plot } from './endsfarhomes';

const S = SLAB_Y;
/** On the block: over the block's grass (endsfar3d.ts lays it 6 mm over the slab), then what lies on that */
const ON = S + 0.014;
const OVER = ON + 0.006;
const mats = new Map<string, THREE.Material>();
const paint = (hex: string) => {
  let m = mats.get(hex);
  if (!m) mats.set(hex, (m = toon(hex)));
  return m;
};
const FLAGS = toon(KERB.grit);
const TRIM = toon('#f1eee8');
const GLASS = toon('#22304a');
/** A window with a lamp on behind it (Phase 5): dark by day, warm at night, under the bloom's threshold */
const LIT_GLASS = neon('#ffd58a', 0.14, 0.95);
const WALL_BRICK = toon('#7a4337');
const COPING = toon('#a9a5ad');
const FENCE = toon('#7a5a3a');
const SHED = toon('#5f4a36');
const SHED_ROOF = toon('#2e2b36');
const BIN = toon('#2f5a3a');
const EARTH = toon(SOIL.bed);
const DUG = toon(SOIL.garden);
const TROD = toon(COVER.dirt);
const LAWN = toon(COVER.lawn);
const WIRE_M = toon('#55585f');
const BUTT = toon('#2f6a55');

const cube = (b: Batch, [x0, z0, x1, z1]: Rect, y0: number, y1: number, m: THREE.Material) => b.box(x0, y0, z0, x1 - x0, y1 - y0, z1 - z0, m);
function flat(b: Batch, [x0, z0, x1, z1]: Rect, y: number, m: THREE.Material) {
  if (x1 - x0 < 1e-6 || z1 - z0 < 1e-6) return;
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2);
  g.deleteAttribute('uv');
  b.add(g.translate((x0 + x1) / 2, y, (z0 + z1) / 2), m);
}
const grow = ([x0, z0, x1, z1]: Rect, m: number): Rect => [x0 - m, z0 - m, x1 + m, z1 + m];

/** A pitched roof over a rect: the ridge along z at `ridge`, the eaves at `eaves`, overhanging a little; a gable each end */
function pitched(b: Batch, [x0, z0, x1, z1]: Rect, eaves: number, ridge: number, roof: THREE.Material, gable: THREE.Material) {
  const O = 0.12;
  const [xa, xb, xm, za, zb] = [x0 - O, x1 + O, (x0 + x1) / 2, z0 - O, z1 + O];
  const g = new THREE.BufferGeometry();
  // (two slopes, each a quad: west and east of the ridge)
  g.setAttribute('position', new THREE.Float32BufferAttribute([xa, eaves, za, xm, ridge, za, xm, ridge, zb, xa, eaves, zb, xm, ridge, za, xb, eaves, za, xb, eaves, zb, xm, ridge, zb], 3));
  g.setIndex([0, 2, 1, 0, 3, 2, 4, 6, 5, 4, 7, 6]);
  g.computeVertexNormals();
  b.add(g, roof);
  // (the gables: a triangle over each end wall, a hair inside the roof's edge)
  const t = new THREE.BufferGeometry();
  t.setAttribute('position', new THREE.Float32BufferAttribute([x0, eaves, z0, x1, eaves, z0, xm, ridge - 0.02, z0, x0, eaves, z1, x1, eaves, z1, xm, ridge - 0.02, z1], 3));
  t.setIndex([0, 2, 1, 3, 4, 5]);
  t.computeVertexNormals();
  b.add(t, gable);
}

function shed(b: Batch, r: Rect, doorX: 1 | -1) {
  cube(b, r, S, S + SHED_H, SHED);
  cube(b, [r[0] - 0.06, r[1] - 0.06, r[2] + 0.06, r[3] + 0.06], S + SHED_H, S + SHED_H + 0.05, SHED_ROOF);
  b.detail(() => {
    const x = doorX > 0 ? r[2] + 0.004 : r[0] - 0.02;
    cube(b, [x, (r[1] + r[3]) / 2 - 0.25, x + 0.016, (r[1] + r[3]) / 2 + 0.25], S, S + 0.8, FENCE);
  });
}

function bungalow(h: Bungalow, low: boolean) {
  site(`endsfar ${h.id}`, grow(h.lot, 0.5), (into) => {
    const b = new Batch();
    const [x0, z0, x1, z1] = h.rect;
    const { eaves: E, ridge: R } = BUNGALOW;
    const walls = paint(h.walls);
    cube(b, h.rect, S, S + E, walls);
    pitched(b, h.rect, S + E, S + R, paint(h.roof), walls);
    // The front (east): the door, and a window each side of it where there's room
    const F = x1 + 0.004;
    cube(b, [F, h.doorZ - 0.3, F + 0.016, h.doorZ + 0.3], S, S + 0.98, paint(h.door));
    const wins: [number, number][] = [];
    if (h.doorZ - z0 > 2.6) wins.push([z0 + 0.6, h.doorZ - 0.75]);
    if (z1 - h.doorZ > 2.6) wins.push([h.doorZ + 0.75, z1 - 0.6]);
    // (a lamp on behind the first window of three in four of them)
    wins.forEach(([a, c], k) => cube(b, [F, a, F + 0.012, c], S + 0.45, S + 0.95, k === 0 && h.id !== 'bungalow-1-0' ? LIT_GLASS : GLASS));
    // The front wall along the lane, the path from its gap to the door, the back garden's fences, the shed
    for (const r of frontWall(h)) {
      cube(b, r, S, S + FRONT_WALL.h - 0.05, WALL_BRICK);
      cube(b, [r[0] - 0.02, r[1], r[2] + 0.02, r[3]], S + FRONT_WALL.h - 0.05, S + FRONT_WALL.h, COPING);
    }
    flat(b, [x1, h.doorZ - 0.4, h.lot[2], h.doorZ + 0.4], ON, FLAGS);
    for (const r of backFences(h)) cube(b, r, S, S + FAR_FENCE.h, FENCE);
    if (h.shed) shed(b, h.shed, 1);
    b.detail(() => {
      // The chimney, the ridge's tiles, the windows' frames, the gutter along the front, the bin
      cube(b, [(x0 + x1) / 2 - 0.18, z0 + 1.1, (x0 + x1) / 2 + 0.18, z0 + 1.5], S + R - 0.15, S + R + 0.3, WALL_BRICK);
      if (!low) {
        cube(b, [(x0 + x1) / 2 - 0.05, z0 - 0.12, (x0 + x1) / 2 + 0.05, z1 + 0.12], S + R - 0.01, S + R + 0.04, COPING);
        for (const [a, c] of wins) {
          cube(b, [F, a - 0.04, F + 0.02, c + 0.04], S + 0.41, S + 0.45, TRIM);
          cube(b, [F, a - 0.04, F + 0.02, c + 0.04], S + 0.95, S + 0.99, TRIM);
          cube(b, [F + 0.004, (a + c) / 2 - 0.015, F + 0.02, (a + c) / 2 + 0.015], S + 0.45, S + 0.95, TRIM);
        }
        cube(b, [x1 + 0.1, z0 - 0.12, x1 + 0.16, z1 + 0.12], S + E - 0.04, S + E + 0.02, METAL);
      }
      cube(b, [h.bin[0] - 0.2, h.bin[1] - 0.2, h.bin[0] + 0.2, h.bin[1] + 0.2], S, S + 0.5, BIN);
    });
    b.build(into, { cast: true, receive: true });
  });
}

/** A run of the wire fence along a thin rect: a post every couple of tiles and two rails */
function wire(b: Batch, r: Rect, low: boolean) {
  const alongX = r[2] - r[0] > r[3] - r[1];
  const [a, c] = alongX ? [r[0], r[2]] : [r[1], r[3]];
  const mid = alongX ? (r[1] + r[3]) / 2 : (r[0] + r[2]) / 2;
  const at = (u0: number, u1: number, t: number): Rect => (alongX ? [u0, mid - t, u1, mid + t] : [mid - t, u0, mid + t, u1]);
  for (const y of low ? [WIRE.h - 0.04] : [0.3, WIRE.h - 0.04]) cube(b, at(a, c, 0.012), S + y, S + y + 0.03, WIRE_M);
  const n = Math.max(1, Math.round((c - a) / 2.2));
  for (let k = 0; k <= n; k++) {
    const u = a + ((c - a) * k) / n;
    cube(b, at(u - 0.025, u + 0.025, 0.025), S, S + WIRE.h, WIRE_M);
  }
}

function plots(pair: Plot[], i: number, low: boolean) {
  const box: Rect = [Math.min(...pair.map((p) => p.rect[0])), Math.min(...pair.map((p) => p.rect[1])), Math.max(...pair.map((p) => p.rect[2])), Math.max(...pair.map((p) => p.rect[3]))];
  site(`endsfar plots ${i}`, grow(box, 0.5), (into) => {
    const b = new Batch();
    for (const p of pair) {
      // (a plot left to grass: a brighter patch; the rest: each bed dug, its crop in rows on it)
      if (!p.beds.length) flat(b, [p.rect[0] + 0.2, p.rect[1] + 0.2, p.rect[2] - 0.2, p.rect[3] - 0.2], ON, LAWN);
      for (const bed of p.beds) flat(b, bed.rect, ON, bed.crop ? EARTH : DUG);
      if (p.shed) shed(b, p.shed, p.id.endsWith('-0') ? 1 : -1);
      b.detail(() => {
        for (const bed of p.beds) {
          if (!bed.crop) continue;
          const [x0, z0, x1, z1] = bed.rect;
          const step = low ? 0.9 : 0.45;
          for (let z = z0 + 0.2; z < z1 - 0.1; z += step) cube(b, [x0 + 0.1, z, x1 - 0.1, z + 0.14], OVER, OVER + 0.16, paint(bed.crop));
        }
        if (p.butt) b.add(new THREE.CylinderGeometry(0.2, 0.18, 0.55, 8).translate(p.butt[0], S + 0.28, p.butt[1]), BUTT);
      });
    }
    b.build(into, { cast: true, receive: true });
  });
}

export function registerFarHomes(low: boolean) {
  for (const h of BUNGALOWS) bungalow(h, low);
  // The allotments' paths and fence (a site for the paths, one a side of the fence)
  site('endsfar allotment paths', grow(ALLOTMENT.rect, 0.5), (into) => {
    const b = new Batch();
    for (const p of ALLOTMENT.paths) {
      const [x0, z0, x1, z1] = p;
      // (in pieces: a fixed triangle never much longer than a tile)
      const n = Math.max(1, Math.ceil(Math.max(x1 - x0, z1 - z0) / 15));
      for (let k = 0; k < n; k++) flat(b, x1 - x0 > z1 - z0 ? [x0 + ((x1 - x0) * k) / n, z0, x0 + ((x1 - x0) * (k + 1)) / n, z1] : [x0, z0 + ((z1 - z0) * k) / n, x1, z0 + ((z1 - z0) * (k + 1)) / n], ON, TROD);
    }
    b.build(into, { cast: false, receive: true });
  });
  ALLOTMENT.fence.forEach((r, i) =>
    site(`endsfar allotment fence ${i}`, grow(r, 0.5), (into) => {
      const b = new Batch();
      wire(b, r, low);
      b.build(into, { cast: false, receive: true });
    })
  );
  for (let i = 0; i < PLOTS.length; i += 2) plots(PLOTS.slice(i, i + 2), i / 2, low);
}
