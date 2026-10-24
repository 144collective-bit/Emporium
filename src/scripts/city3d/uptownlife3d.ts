/*
 * Uptown's cyclists' bikes (docs/finance-plan.md Phase 6; the riders and
 * where they are: uptownlife.ts, drawn in the crowd by life.ts): one
 * instanced mesh, the frame painted per bike, moved on the main thread's tick
 * under their riders (not while the camera is far off).
 */
import * as THREE from 'three';
import { Batch, paintMat, toon } from './kit';
import type { Tick } from './world';
import { CROWD_VIEW } from './character';
import { UPTOWN_RECT } from './uptown';
import { CYCLISTS, cyclistAt } from './uptownlife';

const WHITE = toon('#f3f2f7');
const TYRE = toon('#16141f');
const STEEL = toon('#8f93ad');
const SADDLE = toon('#2a2740');
/** The bikes' paint, one each */
const PAINTS = ['#e219e5', '#00b8d8', '#f3f2f7', '#8000ff'];

/** A bike along +z (its front), on the road: two wheels, the frame (white: painted per bike), saddle and bars */
function bikeGeometry() {
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

export function registerUptownLife(scene: THREE.Scene, tick?: (f: Tick) => void) {
  const mesh = new THREE.InstancedMesh(bikeGeometry(), paintMat(), CYCLISTS.length);
  mesh.name = 'uptown-bikes';
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  CYCLISTS.forEach((_, i) => mesh.setColorAt(i, new THREE.Color(PAINTS[i % PAINTS.length])));
  scene.add(mesh);
  const at = { x: 0, z: 0, ry: 0 };
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const update = (t: number) => {
    CYCLISTS.forEach((c, i) => {
      cyclistAt(c, t, at);
      mesh.setMatrixAt(i, m.compose(pos.set(at.x, 0.035, at.z), q.setFromAxisAngle(up, at.ry), one));
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0);
  const [x0, z0, x1, z1] = UPTOWN_RECT;
  tick?.(({ t }) => {
    const ex = CROWD_VIEW.eye.x;
    const ez = CROWD_VIEW.eye.z;
    mesh.visible = Math.hypot(Math.max(x0 - ex, ex - x1, 0), Math.max(z0 - ez, ez - z1, 0)) < 180;
    if (mesh.visible) update(t);
  });
}
