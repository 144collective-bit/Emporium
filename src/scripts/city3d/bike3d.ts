/*
 * A bicycle for the crowd's cyclists (Uptown's in its bike lanes, uptownlife3d.ts; Crestmont's on Ridge Road,
 * crestleisure3d.ts): one geometry, drawn instanced under its riders, the frame white so each instance takes its paint.
 */
import * as THREE from 'three';
import { Batch, toon } from './kit';

const WHITE = toon('#f3f2f7');
const TYRE = toon('#16141f');
const STEEL = toon('#8f93ad');
const SADDLE = toon('#2a2740');

/** A bike along +z (its front), on the road: two wheels, the frame (white: painted per bike), saddle and bars */
export function bikeGeometry() {
  const b = new Batch();
  const R = 0.17;
  for (const z of [-0.3, 0.3]) {
    b.add(new THREE.TorusGeometry(R, 0.025, 4, 14).rotateY(Math.PI / 2).translate(0, R, z), TYRE);
    b.add(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 6).rotateZ(Math.PI / 2).translate(0, R, z), STEEL);
  }
  const bar = (a: THREE.Vector3, c: THREE.Vector3, w: number, mat: THREE.Material) => {
    const g = new THREE.CylinderGeometry(w, w, a.distanceTo(c), 5, 1, true);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.clone().sub(a).normalize()));
    b.add(g.translate((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2), mat);
  };
  const V = (y: number, z: number) => new THREE.Vector3(0, y, z);
  // The frame: chainstay, seat tube, top tube, down tube, fork
  bar(V(R, -0.3), V(0.17, -0.02), 0.018, WHITE);
  bar(V(0.17, -0.02), V(0.4, -0.1), 0.02, WHITE);
  bar(V(0.4, -0.1), V(0.4, 0.2), 0.02, WHITE);
  bar(V(0.17, -0.02), V(0.4, 0.2), 0.022, WHITE);
  bar(V(0.4, 0.2), V(R, 0.3), 0.018, WHITE);
  bar(V(R, -0.3), V(0.4, -0.1), 0.014, WHITE);
  // Saddle, stem and bars
  b.box(-0.05, 0.42, -0.2, 0.1, 0.035, 0.18, SADDLE);
  bar(V(0.4, 0.2), V(0.5, 0.22), 0.016, STEEL);
  b.add(new THREE.CylinderGeometry(0.014, 0.014, 0.36, 5).rotateZ(Math.PI / 2).translate(0, 0.5, 0.22), STEEL);
  const g = new THREE.Group();
  b.build(g);
  return (g.children[0] as THREE.Mesh).geometry;
}
