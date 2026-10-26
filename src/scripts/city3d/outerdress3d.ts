/*
 * The outer districts' lawns dressed (outerdress.ts holds where): paved walks
 * with a stone edge, round flower beds with a stone kerb, benches, bins and a
 * picnic table, and shrubs at the feet of some of the lawn trees. A site a
 * block (tilework.ts), built in the worker too (sitework.ts); the walks and
 * the beds' kerbs at every distance, the rest near only. Not solid.
 */
import * as THREE from 'three';
import { Batch, toon } from './kit';
import { SLAB as S } from './world';
import { site } from './tilework';
import { SOLID_GRID } from './solids';
import { OUTER_BLOCKS, inside, type Pt } from './outer';
import { PATH_W, dressing } from './outerdress';
import type { Rect } from './tiles';

/** Is a point on (or within m of) anything solid */
const solidAt = ([x, z]: Pt, m: number) => SOLID_GRID.near(x, z, m + 0.5).some((b) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m);
/** The dressing, worked out once (the boot's trees and the sites both read it) */
export const DRESS = dressing(solidAt);

const PATH = toon('#a9a3bf');
const EDGE = toon('#6e6a8c');
const KERB = toon('#8f8ab0');
const SOIL = toon('#4a3326');
const WOOD = toon('#8a5a3c');
const INK = toon('#1b1830');
const BIN = toon('#2f4b3c');
const SHRUB = toon('#2a7048');
const SHRUB_DARK = toon('#1f5a3a');
/** The beds' flowers, a scheme each: pinks, sunshine, violets, whites and reds */
const SCHEMES = [
  [toon('#ff6fa8'), toon('#ffc2dc'), toon('#c43d7a')],
  [toon('#ffd23f'), toon('#ff9a3d'), toon('#fff1a8')],
  [toon('#9d7ad6'), toon('#c8b6ff'), toon('#5a3d9a')],
  [toon('#f3f1ea'), toon('#e23b3b'), toon('#ff8a8a')],
];

/** A walk: paving a hair over the lawn, a darker edge either side (pieces never longer than a tile) */
function walk(b: Batch, a: Pt, c: Pt) {
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const ry = Math.atan2(c[0] - a[0], c[1] - a[1]);
  const mid: Pt = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
  const strip = (w: number, y: number, off: number, mat: THREE.Material) =>
    b.add(
      new THREE.PlaneGeometry(w, len)
        .rotateX(-Math.PI / 2)
        .translate(off, y, 0)
        .rotateY(ry)
        .translate(mid[0], 0, mid[1]),
      mat
    );
  strip(PATH_W, S + 0.014, 0, PATH);
  for (const s of [-1, 1]) strip(0.12, S + 0.02, s * (PATH_W / 2 + 0.03), EDGE);
}

function bed(b: Batch, at: Pt, r: number, kind: number) {
  const [x, z] = at;
  // A low stone kerb round soil, a clipped ball in the middle (at every distance)
  b.add(new THREE.CylinderGeometry(r, r, 0.22, 20, 1, true).translate(x, S + 0.11, z), KERB);
  b.add(new THREE.TorusGeometry(r, 0.06, 4, 20).rotateX(Math.PI / 2).translate(x, S + 0.22, z), KERB);
  b.add(new THREE.CircleGeometry(r - 0.04, 20).rotateX(-Math.PI / 2).translate(x, S + 0.16, z), SOIL);
  b.add(new THREE.IcosahedronGeometry(0.42, 1).scale(1, 0.85, 1).translate(x, S + 0.5, z), SHRUB);
  // Flowers in two rings round it (near only)
  const scheme = SCHEMES[kind % SCHEMES.length];
  b.detail(() => {
    for (const [ring, n] of [
      [r * 0.72, 12],
      [r * 0.42, 7],
    ] as const)
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + ring;
        b.add(new THREE.IcosahedronGeometry(0.15, 0).scale(1, 0.8, 1).translate(x + Math.cos(a) * ring, S + 0.26, z + Math.sin(a) * ring), scheme[(k + (ring > r * 0.5 ? 0 : 1)) % scheme.length]);
      }
  });
}

/** A bench, the sitter facing `ry` (as neighbourhoods.ts's) */
function bench(b: Batch, [x, z]: Pt, ry: number) {
  const g = (w: number, h: number, d: number, px: number, y: number, pz: number) =>
    new THREE.BoxGeometry(w, h, d)
      .translate(px, y + h / 2, pz)
      .rotateY(ry)
      .translate(x, S, z);
  b.add(g(0.9, 0.06, 0.3, 0, 0.24, 0), WOOD);
  b.add(g(0.9, 0.3, 0.05, 0, 0.32, -0.15), WOOD);
  for (const sx of [-0.36, 0.36]) b.add(g(0.05, 0.26, 0.28, sx, 0, 0), INK);
}

function picnic(b: Batch, [x, z]: Pt, ry: number) {
  const g = (w: number, h: number, d: number, px: number, y: number, pz: number) =>
    new THREE.BoxGeometry(w, h, d)
      .translate(px, y + h / 2, pz)
      .rotateY(ry)
      .translate(x, S, z);
  b.add(g(1.5, 0.06, 0.7, 0, 0.5, 0), WOOD);
  for (const s of [-1, 1]) {
    b.add(g(1.5, 0.05, 0.24, 0, 0.3, s * 0.6), WOOD);
    // (the A-frame legs at each end)
    for (const px of [-0.6, 0.6]) b.add(g(0.06, 0.5, 1.3, px, 0, 0), INK);
  }
}

export function buildOuterDress(low = false) {
  OUTER_BLOCKS.forEach((blk, i) => {
    const xs = blk.poly.map((p) => p[0]);
    const zs = blk.poly.map((p) => p[1]);
    const rect: Rect = [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
    const paths = DRESS.paths.filter((p) => p.block === blk.id);
    const beds = DRESS.beds.filter((p) => p.block === blk.id);
    const furniture = DRESS.furniture.filter((p) => p.block === blk.id);
    const trees = DRESS.trees.filter((t) => inside(blk.poly, t));
    if (!paths.length && !beds.length && !furniture.length && !trees.length) return;
    site(`outer dress ${blk.id}`, rect, (into) => {
      const b = new Batch();
      for (const p of paths) walk(b, p.a, p.b);
      for (const d of beds) bed(b, d.at, d.r, d.kind);
      b.detail(() => {
        for (const f of furniture) {
          if (f.kind === 'bench') bench(b, f.at, f.ry);
          else if (f.kind === 'picnic') picnic(b, f.at, f.ry);
          else {
            b.add(new THREE.CylinderGeometry(0.17, 0.15, 0.62, 8).translate(f.at[0], S + 0.31, f.at[1]), BIN);
            b.add(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 8).translate(f.at[0], S + 0.64, f.at[1]), INK);
          }
        }
        // Shrubs at the feet of every third lawn tree (phones: every sixth)
        trees.forEach(([x, z], k) => {
          if (k % (low ? 6 : 3)) return;
          for (let j = 0; j < 3; j++) {
            const a = j * 2.1 + k;
            b.add(new THREE.IcosahedronGeometry(0.3 + (j % 2) * 0.08, 0).scale(1, 0.7, 1).translate(x + Math.cos(a) * 0.6, S + 0.18, z + Math.sin(a) * 0.6), j % 2 ? SHRUB_DARK : SHRUB);
          }
        });
      });
      b.build(into, { cast: true, receive: true });
    });
  });
}
