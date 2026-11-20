// Degen dressed and posed on the CPU, the way the figure is skinned on the GPU (character.ts binds
// the skinned mesh to the skeleton at rest: each vertex moves with its bones' turn since then), and
// the checks that one layer of his clothes stays over another (docs/clothing-plan.md).
import * as THREE from 'three';
import { items, restSkin, type Outfit, type Piece, type Shell } from '../src/scripts/city3d/wardrobe';
import { makeSkeleton, type BoneName, type Influence, type Skeleton } from '../src/scripts/city3d/skeleton';

export interface Worn {
  piece: Piece;
  item: string;
  /** Where each vertex is at rest, three numbers a vertex, every three vertices a triangle */
  rest: Float32Array;
  skin: Influence[];
}
export interface Dressed {
  sk: Skeleton;
  worn: Worn[];
  /** Each bone's world matrix at rest, inverted */
  inv: Map<BoneName, THREE.Matrix4>;
}

/** Everything an outfit wears on the single figure (detail 2, the skinned body), at rest */
export function dress(o: Outfit, q: 0 | 1 | 2 | 3 = 2): Dressed {
  const sk = makeSkeleton();
  sk.root.updateMatrixWorld(true);
  const worn: Worn[] = [];
  for (const it of items(q, true)) {
    if (!it.when(o)) continue;
    for (const src of it.pieces) {
      // (held things and a hand's pieces without weights of their own ride the hand bone unbent, as in createDegen)
      const hand = src.joint === 'handL' || src.joint === 'handR';
      const p: Piece = it.held || (hand && !src.skin) ? { ...src, bone: src.joint as BoneName } : src;
      const { geo, skin } = restSkin(p, sk.j[p.joint].matrixWorld);
      worn.push({ piece: src, item: it.id, rest: Float32Array.from(geo.attributes.position.array as Float32Array), skin });
      geo.dispose();
    }
  }
  const inv = new Map<BoneName, THREE.Matrix4>();
  for (const [name, b] of Object.entries(sk.bones)) inv.set(name as BoneName, b.matrixWorld.clone().invert());
  return { sk, worn, inv };
}

const m = new THREE.Matrix4();
/**
 * Where each vertex of `w` is with the skeleton as it's posed now (call `sk.root.updateMatrixWorld(true)` first): each
 * bone's skinning matrix made once, the vertices in plain numbers (the same sums, in the same order, as three's
 * `applyMatrix4` and `addScaledVector`, so the same answers to the last bit)
 */
export function posed(d: Dressed, w: Worn, out = new Float32Array(w.rest.length)) {
  const skin = new Map<BoneName, number[]>();
  const r = w.rest;
  for (let i = 0; i < w.skin.length; i++) {
    let ax = 0;
    let ay = 0;
    let az = 0;
    const x = r[i * 3];
    const y = r[i * 3 + 1];
    const z = r[i * 3 + 2];
    for (const [b, wt] of w.skin[i]) {
      let e = skin.get(b);
      if (!e) skin.set(b, (e = m.multiplyMatrices(d.sk.bones[b].matrixWorld, d.inv.get(b)!).elements.slice()));
      const k = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
      ax += ((e[0] * x + e[4] * y + e[8] * z + e[12]) * k) * wt;
      ay += ((e[1] * x + e[5] * y + e[9] * z + e[13]) * k) * wt;
      az += ((e[2] * x + e[6] * y + e[10] * z + e[14]) * k) * wt;
    }
    out[i * 3] = ax;
    out[i * 3 + 1] = ay;
    out[i * 3 + 2] = az;
  }
  return out;
}

/* ---------- Inside a closed shell ---------- */

/**
 * Triangles of one or more closed shells, filed by height and depth (y and z) so a point only looks at those its ray
 * could cross: the ray runs along +x and drifts less than 0.014 a unit in y and z, so over the figure (well under a
 * unit across) it stays inside the 2 cm each triangle's filed with around it. Each triangle's furthest x too: one
 * wholly behind the point (the ray only goes forward) is passed over.
 */
export interface Shells {
  tris: Float32Array[];
  /** Each triangle's largest x, a number a triangle */
  far: Float32Array[];
  bins: Map<number, number[][]>;
}
const BIN = 0.02;
const PAD = 0.02;
// (a cell's key: its height and depth rows in one number, the depth row offset to keep it positive)
const cell = (ky: number, kz: number) => ky * 4096 + kz + 2048;
export function shells(list: Float32Array[]): Shells {
  const bins = new Map<number, number[][]>();
  const far = list.map((t) => new Float32Array(t.length / 9));
  list.forEach((t, s) => {
    for (let i = 0; i < t.length; i += 9) {
      far[s][i / 9] = Math.max(t[i], t[i + 3], t[i + 6]);
      const y0 = Math.floor((Math.min(t[i + 1], t[i + 4], t[i + 7]) - PAD) / BIN);
      const y1 = Math.floor((Math.max(t[i + 1], t[i + 4], t[i + 7]) + PAD) / BIN);
      const z0 = Math.floor((Math.min(t[i + 2], t[i + 5], t[i + 8]) - PAD) / BIN);
      const z1 = Math.floor((Math.max(t[i + 2], t[i + 5], t[i + 8]) + PAD) / BIN);
      for (let ky = y0; ky <= y1; ky++)
        for (let kz = z0; kz <= z1; kz++) {
          const k = cell(ky, kz);
          let b = bins.get(k);
          if (!b) bins.set(k, (b = list.map(() => [])));
          b[s].push(i);
        }
    }
  });
  return { tris: list, far, bins };
}
// (a ray just off the axes, so it never runs along an edge)
const DIR = new THREE.Vector3(1, 0.0137, 0.0091).normalize();
const [DX, DY, DZ] = [DIR.x, DIR.y, DIR.z];
/** Whether (x, y, z) is inside any of the shells (an odd number of crossings along a ray: Möller-Trumbore, in plain numbers) */
export function inside(sh: Shells, x: number, y: number, z: number) {
  const b = sh.bins.get(cell(Math.floor(y / BIN), Math.floor(z / BIN)));
  if (!b) return false;
  for (let s = 0; s < sh.tris.length; s++) {
    const t = sh.tris[s];
    const far = sh.far[s];
    let n = 0;
    for (const i of b[s]) {
      if (far[i / 9] < x) continue;
      const ax = t[i], ay = t[i + 1], az = t[i + 2];
      const e1x = t[i + 3] - ax, e1y = t[i + 4] - ay, e1z = t[i + 5] - az;
      const e2x = t[i + 6] - ax, e2y = t[i + 7] - ay, e2z = t[i + 8] - az;
      // pv = DIR x e2
      const px = DY * e2z - DZ * e2y, py = DZ * e2x - DX * e2z, pz = DX * e2y - DY * e2x;
      const det = e1x * px + e1y * py + e1z * pz;
      if (Math.abs(det) < 1e-12) continue;
      const tx = x - ax, ty = y - ay, tz = z - az;
      const u = (tx * px + ty * py + tz * pz) / det;
      if (u < 0 || u > 1) continue;
      // qv = tv x e1
      const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
      const w = (DX * qx + DY * qy + DZ * qz) / det;
      if (w < 0 || u + w > 1) continue;
      if ((e2x * qx + e2y * qy + e2z * qz) / det > 0) n++;
    }
    if (n % 2) return true;
  }
  return false;
}
const tri = new THREE.Triangle();
const v = new THREE.Vector3();
const cp = new THREE.Vector3();
/** How far (x, y, z) is from the nearest surface of the shells, and whether that's an underside (`under`: per shell, per triangle) */
export function distance(sh: Shells, x: number, y: number, z: number, under?: boolean[][]) {
  v.set(x, y, z);
  let best = Infinity;
  let floor = false;
  sh.tris.forEach((t, s) => {
    for (let i = 0; i < t.length; i += 9) {
      tri.a.fromArray(t, i);
      tri.b.fromArray(t, i + 3);
      tri.c.fromArray(t, i + 6);
      const d = tri.closestPointToPoint(v, cp).distanceTo(v);
      if (d < best) {
        best = d;
        floor = !!under?.[s][i / 9];
      }
    }
  });
  return { d: best, floor };
}
/**
 * Each triangle of the shells that's an underside at rest (facing down, at the very bottom: a top's
 * closed-over hem): the trousers coming out under the hem is only the trousers showing below it
 */
export function undersides(list: Float32Array[]) {
  const n = new THREE.Vector3();
  return list.map((t) => {
    let lo = Infinity;
    for (let i = 1; i < t.length; i += 3) lo = Math.min(lo, t[i]);
    const out: boolean[] = [];
    for (let i = 0; i < t.length; i += 9) {
      tri.a.fromArray(t, i);
      tri.b.fromArray(t, i + 3);
      tri.c.fromArray(t, i + 6);
      tri.getNormal(n);
      out.push(n.y < -0.7 && Math.max(t[i + 1], t[i + 4], t[i + 7]) < lo + 0.02);
    }
    return out;
  });
}

/** The pieces of a shell, posed (or at rest) */
export const ofShell = (d: Dressed, s: Shell, now: boolean) => d.worn.filter((w) => w.piece.shell === s).map((w) => (now ? posed(d, w) : w.rest));

export interface Through {
  /** The deepest a covered vertex of the inner layer came out through the outer, and how many came out past `tol` */
  out: number;
  outN: number;
  /** The deepest a vertex of the outer layer sank into the inner, and how many past `tol` */
  sunk: number;
  sunkN: number;
  /** Where the worst of each was at rest */
  outAt?: number[];
  sunkAt?: number[];
}
/**
 * The layers as they're posed now against how they were at rest: every vertex of `inner` inside
 * `outer` at rest (covered) must still be inside, and every vertex of `outer` outside `inner` at
 * rest must still be outside, each within `tol`
 */
export function layers(d: Dressed, inner: Shell, outer: Shell, tol: number, rest: { covered: boolean[][]; clear: boolean[][]; under: boolean[][] }): Through {
  const inNow = ofShell(d, inner, true);
  const outNow = ofShell(d, outer, true);
  const outSh = shells(outNow);
  const inSh = shells(inNow);
  const r: Through = { out: 0, outN: 0, sunk: 0, sunkN: 0 };
  inNow.forEach((p, s) => {
    for (let i = 0; i < p.length / 3; i++) {
      if (!rest.covered[s][i]) continue;
      const [x, y, z] = [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]];
      if (inside(outSh, x, y, z)) continue;
      const { d: dd, floor } = distance(outSh, x, y, z, rest.under);
      if (floor) continue;
      if (dd > r.out) r.outAt = Array.from(ofShell(d, inner, false)[s].slice(i * 3, i * 3 + 3));
      r.out = Math.max(r.out, dd);
      if (dd > tol) r.outN++;
    }
  });
  outNow.forEach((p, s) => {
    for (let i = 0; i < p.length / 3; i++) {
      if (!rest.clear[s][i]) continue;
      const [x, y, z] = [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]];
      if (!inside(inSh, x, y, z)) continue;
      const { d: dd } = distance(inSh, x, y, z);
      if (dd > r.sunk) r.sunkAt = Array.from(ofShell(d, outer, false)[s].slice(i * 3, i * 3 + 3));
      r.sunk = Math.max(r.sunk, dd);
      if (dd > tol) r.sunkN++;
    }
  });
  return r;
}
/** Which vertices of `inner` are covered by `outer` at rest, and which of `outer` are clear of `inner` */
export function atRest(d: Dressed, inner: Shell, outer: Shell) {
  const inR = ofShell(d, inner, false);
  const outR = ofShell(d, outer, false);
  const outSh = shells(outR);
  const inSh = shells(inR);
  const pts = (p: Float32Array, f: (x: number, y: number, z: number) => boolean) => Array.from({ length: p.length / 3 }, (_, i) => f(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]));
  return {
    covered: inR.map((p) => pts(p, (x, y, z) => inside(outSh, x, y, z))),
    clear: outR.map((p) => pts(p, (x, y, z) => !inside(inSh, x, y, z))),
    under: undersides(outR),
  };
}
