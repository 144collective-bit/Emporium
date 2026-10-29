/*
 * Roofs drawn from their outlines (Crestmont's houses and Sunridge's): triangles turned to face out of a convex
 * roof, a hipped roof over a box with its soffit under the overhang.
 */
import * as THREE from 'three';

type V3 = [number, number, number];

/** Triangles, each turned to face away from `mid` (a convex roof's middle) */
export function tris(list: V3[][], mid: V3) {
  const pos: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (const [p, q, r] of list) {
    a.set(...p);
    b.set(...q);
    c.set(...r);
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    const out = new THREE.Vector3().addVectors(a, b).add(c).divideScalar(3).sub(new THREE.Vector3(...mid));
    for (const v of n.dot(out) >= 0 ? [p, q, r] : [p, r, q]) pos.push(...v);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
/** A hipped roof over u0..u1, v0..v1 (v1 < v0) at y, `h` high, overhanging `o` (h with no ridge: a pyramid) */
export function hip(u0: number, v0: number, u1: number, v1: number, y: number, h: number, o: number) {
  const [x0, x1, z0, z1] = [u0 - o, u1 + o, v1 - o, v0 + o];
  const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
  const [w, d] = [x1 - x0, z1 - z0];
  const ridge = Math.abs(w - d) / 2;
  const top = y + h;
  const [r0, r1]: V3[] = w >= d ? [[cx - ridge, top, cz], [cx + ridge, top, cz]] : [[cx, top, cz - ridge], [cx, top, cz + ridge]];
  const c: V3[] = [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]];
  const mid: V3 = [cx, y + h * 0.2, cz];
  const list: V3[][] =
    w >= d
      ? [[c[0], c[1], r1], [c[0], r1, r0], [c[3], c[2], r1], [c[3], r1, r0], [c[0], c[3], r0], [c[1], c[2], r1]]
      : [[c[0], c[3], r1], [c[0], r1, r0], [c[1], c[2], r1], [c[1], r1, r0], [c[0], c[1], r0], [c[3], c[2], r1]];
  // (its soffit under the overhang)
  const soffit = new THREE.PlaneGeometry(w, d).rotateX(Math.PI / 2).translate(cx, y - 0.005, cz);
  return [tris(list, mid), soffit];
}
