/*
 * Drawing streets along lines (Crestmont's and Sunridge's): a strip of asphalt or paint along a centre line following
 * the ground, a line cut into pieces about a tile long (a site each), dashes along a line.
 */
import * as THREE from 'three';
import { offsetLine, type Pt } from './streetplan';

type Rect = [number, number, number, number];

/** Pieces of road no longer than this (a site each: nothing much longer than a tile, tileBatch()) */
export const PIECE = 24;

export const unit = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const UP = new THREE.Vector3(0, 1, 0);
const SIDE = new THREE.Vector3(0, 0, 1);

/** A strip along a line from l to r right of it, each vertex at `y(x, z)`, wound to face up */
export function ribbon(pts: Pt[], l: number, r: number, y: (x: number, z: number) => number) {
  const L = offsetLine(pts, l);
  const R = offsetLine(pts, r);
  const pos: number[] = [];
  const v = (p: Pt) => [p[0], y(p[0], p[1]), p[1]];
  const tri = (p: Pt, q: Pt, t: Pt) => {
    const up = (q[1] - p[1]) * (t[0] - p[0]) - (q[0] - p[0]) * (t[1] - p[1]) > 0;
    for (const w of up ? [p, q, t] : [p, t, q]) pos.push(...v(w));
  };
  for (let i = 1; i < pts.length; i++) {
    tri(L[i - 1], R[i - 1], R[i]);
    tri(L[i - 1], R[i], L[i]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** A line's pieces: runs of points no longer than PIECE, each with its box (padded `pad`) */
export function pieces(pts: Pt[], pad: number) {
  const out: { pts: Pt[]; rect: Rect }[] = [];
  let run: Pt[] = [pts[0]];
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    run.push(pts[i]);
    if (len >= PIECE || i === pts.length - 1) {
      const xs = run.map((p) => p[0]);
      const zs = run.map((p) => p[1]);
      out.push({ pts: run, rect: [Math.min(...xs) - pad, Math.min(...zs) - pad, Math.max(...xs) + pad, Math.max(...zs) + pad] });
      run = [pts[i]];
      len = 0;
    }
  }
  return out;
}

/** A straight line cut into points every `step` */
export const along = (a: Pt, b: Pt, step = 6): Pt[] => {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
  return Array.from({ length: n + 1 }, (_, k): Pt => [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
};

/** Dashes along a line every `gap`, each `l` long and `w` wide, at `y(x, z)` tipped along its slope; skipping where `skip` says */
export function dashes(list: THREE.Matrix4[], pts: Pt[], off: number, gap: number, l: number, w: number, y: (x: number, z: number) => number, skip: (x: number, z: number) => boolean) {
  const line = off ? offsetLine(pts, off) : pts;
  let carry = gap / 2;
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [line[i - 1], line[i]];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (seg < 1e-6) continue;
    const [ux, uz] = [(b[0] - a[0]) / seg, (b[1] - a[1]) / seg];
    for (let d = carry; d < seg; d += gap) {
      const [x, z] = [a[0] + ux * d, a[1] + uz * d];
      carry = d + gap - seg;
      if (skip(x, z)) continue;
      const rise = (y(x + ux * 0.4, z + uz * 0.4) - y(x - ux * 0.4, z - uz * 0.4)) / 0.8;
      const q = new THREE.Quaternion().setFromAxisAngle(UP, Math.atan2(-uz, ux)).multiply(new THREE.Quaternion().setFromAxisAngle(SIDE, Math.atan(rise)));
      list.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y(x, z), z), q, new THREE.Vector3(l, 1, w)));
    }
    if (carry < 0) carry = 0;
  }
}

