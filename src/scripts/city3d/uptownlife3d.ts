/*
 * Uptown's cyclists' bikes (docs/finance-plan.md Phase 6; the riders and
 * where they are: uptownlife.ts, drawn in the crowd by life.ts): one
 * instanced mesh, the frame painted per bike, moved on the main thread's tick
 * under their riders (not while the camera is far off).
 */
import * as THREE from 'three';
import { paintMat } from './kit';
import { bikeGeometry } from './bike3d';
import type { Tick } from './world';
import { CROWD_VIEW } from './character';
import { UPTOWN_RECT } from './uptown';
import { CYCLISTS, cyclistAt } from './uptownlife';

/** The bikes' paint, one each */
const PAINTS = ['#e219e5', '#00b8d8', '#f3f2f7', '#8000ff'];

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
