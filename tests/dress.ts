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
const v = new THREE.Vector3();
const acc = new THREE.Vector3();
/** Where each vertex of `w` is with the skeleton as it's posed now (call `sk.root.updateMatrixWorld(true)` first) */
export function posed(d: Dressed, w: Worn, out = new Float32Array(w.rest.length)) {
  const skin = new Map<BoneName, THREE.Matrix4>();
  for (let i = 0; i < w.skin.length; i++) {
    acc.set(0, 0, 0);
    for (const [b, wt] of w.skin[i]) {
      let s = skin.get(b);
      if (!s) skin.set(b, (s = m.multiplyMatrices(d.sk.bones[b].matrixWorld, d.inv.get(b)!).clone()));
      acc.addScaledVector(v.fromArray(w.rest, i * 3).applyMatrix4(s), wt);
    }
    acc.toArray(out, i * 3);
  }
  return out;
}

/* ---------- Inside a closed shell ---------- */

/** Triangles of one or more closed shells, filed by height so a point only looks at those near it */
export interface Shells {
  tris: Float32Array[];
  bins: Map<number, number[][]>;
}
const BIN = 0.02;
export function shells(list: Float32Array[]): Shells {
  const bins = new Map<number, number[][]>();
  list.forEach((t, s) => {
    for (let i = 0; i < t.length; i += 9) {
      const lo = Math.min(t[i + 1], t[i + 4], t[i + 7]);
      const hi = Math.max(t[i + 1], t[i + 4], t[i + 7]);
      for (let k = Math.floor((lo - 0.02) / BIN); k <= Math.floor((hi + 0.02) / BIN); k++) {
        let b = bins.get(k);
        if (!b) bins.set(k, (b = list.map(() => [])));
        b[s].push(i);
      }
    }
  });
  return { tris: list, bins };
}
// (a ray just off the axes, so it never runs along an edge)
const DIR = new THREE.Vector3(1, 0.0137, 0.0091).normalize();
const e1 = new THREE.Vector3();
const e2 = new THREE.Vector3();
const pv = new THREE.Vector3();
const tv = new THREE.Vector3();
const qv = new THREE.Vector3();
/** Whether (x, y, z) is inside any of the shells (an odd number of crossings along a ray) */
export function inside(sh: Shells, x: number, y: number, z: number) {
  const b = sh.bins.get(Math.floor(y / BIN));
  if (!b) return false;
  for (let s = 0; s < sh.tris.length; s++) {
    const t = sh.tris[s];
    let n = 0;
    for (const i of b[s]) {
      e1.set(t[i + 3] - t[i], t[i + 4] - t[i + 1], t[i + 5] - t[i + 2]);
      e2.set(t[i + 6] - t[i], t[i + 7] - t[i + 1], t[i + 8] - t[i + 2]);
      pv.crossVectors(DIR, e2);
      const det = e1.dot(pv);
      if (Math.abs(det) < 1e-12) continue;
      tv.set(x - t[i], y - t[i + 1], z - t[i + 2]);
      const u = tv.dot(pv) / det;
      if (u < 0 || u > 1) continue;
      qv.crossVectors(tv, e1);
      const w = DIR.dot(qv) / det;
      if (w < 0 || u + w > 1) continue;
      if (e2.dot(qv) / det > 0) n++;
    }
    if (n % 2) return true;
  }
  return false;
}
const tri = new THREE.Triangle();
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
