/*
 * A dog on its lead (Westlake Park's, parklife3d.ts; Crestmont's, crestlife3d.ts): one shape coloured per vertex in
 * the Batches' one toon material, its coat near white so each instance's colour is its coat; +x its nose, the ground under
 * its middle at the origin.
 */
import * as THREE from 'three';
import { Batch, toon } from './kit';

export function dogGeometry() {
  const b = new Batch();
  const C = toon('#f2f0f8');
  b.add(new THREE.CapsuleGeometry(0.085, 0.26, 3, 8).rotateZ(Math.PI / 2).translate(0, 0.29, 0), C);
  b.add(new THREE.SphereGeometry(0.085, 8, 6).translate(0.23, 0.39, 0), C);
  b.box(0.28, 0.33, -0.04, 0.1, 0.07, 0.08, C);
  b.box(0.375, 0.36, -0.018, 0.025, 0.035, 0.036, toon('#16121f'));
  for (const s of [-1, 1]) b.box(0.18, 0.43, s * 0.06 - 0.02, 0.05, 0.08, 0.04, toon('#5b4636'));
  for (const [lx, lz] of [[0.14, 0.05], [0.14, -0.05], [-0.14, 0.05], [-0.14, -0.05]]) b.box(lx - 0.022, 0, lz - 0.022, 0.044, 0.25, 0.044, C);
  b.add(new THREE.CylinderGeometry(0.015, 0.02, 0.18, 4).rotateZ(-0.9).translate(-0.24, 0.38, 0), C);
  b.add(new THREE.TorusGeometry(0.06, 0.015, 4, 8).rotateY(Math.PI / 2).translate(0.17, 0.36, 0), toon('#d93a4a'));
  const g = new THREE.Group();
  b.build(g);
  return (g.children[0] as THREE.Mesh).geometry;
}
/** Where a lead runs: from the walker's hand (on their right, at the hip) to the collar, both over `y` (their ground) */
export function leadEnds(out: Float32Array, k: number, w: { x: number; z: number; ry: number }, d: { x: number; z: number; ry: number }, size: number, wy: number, dy: number) {
  const [fx, fz] = [Math.sin(w.ry), Math.cos(w.ry)];
  out.set([w.x - fz * 0.2 + fx * 0.1, wy + 0.42, w.z + fx * 0.2 + fz * 0.1, d.x + Math.sin(d.ry) * 0.17 * size, dy + 0.36 * size, d.z + Math.cos(d.ry) * 0.17 * size], k * 6);
}
