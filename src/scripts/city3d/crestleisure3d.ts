/*
 * Crestmont's residents at leisure and its road cyclists drawn (docs/crestmont-plan.md, the premium upgrade's Phase 6;
 * the data is crestleisure.ts), from crestmont3d.ts's `register()`: the people into the crowd's spare slots (life.ts
 * `addPeople()`; phones get every other one standing or sitting and the movers' trimmed half left out, as Sunridge's),
 * and the cyclists' bikes under them, one instanced mesh moved on the main thread's tick, pitched with the road, only
 * while the camera is near enough to see them.
 */
import * as THREE from 'three';
import { paintMat } from './kit';
import { addPeople } from './life';
import { CROWD_VIEW } from './character';
import { CREST_RECT } from './crestmont';
import { LEISURE_IDLE, LEISURE_PEOPLE, RIDERS, rideAt, type RidePose } from './crestleisure';
import { bikeGeometry } from './bike3d';
import type { Tick } from './world';

/** The bikes' paint, one each: carbon, white, champagne, cyan, magenta */
const PAINTS = ['#1b1830', '#f3f2f7', '#c8b27a', '#00b8d8', '#e219e5'];

export function registerLeisure(scene: THREE.Scene | null, tick: ((f: Tick) => void) | undefined, low: boolean) {
  // (the site worker loads this module too: nothing of this is a site)
  if (!scene) return;
  addPeople(
    LEISURE_IDLE.filter((_, i) => !low || i % 2 === 0),
    LEISURE_PEOPLE.filter((p) => !(low && p.trim))
  );
  const shown = RIDERS.map((r, k) => ({ r, k })).filter(({ r }) => !(low && r.trim));
  if (!tick || !shown.length) return;
  const mesh = new THREE.InstancedMesh(bikeGeometry(), paintMat(), shown.length);
  mesh.name = 'crestmont-bikes';
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  shown.forEach(({ k }, i) => mesh.setColorAt(i, new THREE.Color(PAINTS[k % PAINTS.length])));
  scene.add(mesh);
  const at: RidePose = { x: 0, z: 0, y: 0, ry: 0, pitch: 0, pace: 0 };
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const update = (t: number) => {
    shown.forEach(({ k }, i) => {
      rideAt(k, t, at);
      // (its nose up the grade: about its own x, after its heading)
      e.set(-at.pitch, at.ry, 0, 'YXZ');
      mesh.setMatrixAt(i, m.compose(pos.set(at.x, at.y, at.z), q.setFromEuler(e), one));
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0);
  const [x0, z0, x1, z1] = CREST_RECT;
  tick(({ t }) => {
    // Only while the camera is near enough to see them (the crowd draws nobody past 170)
    const ex = CROWD_VIEW.eye.x;
    const ez = CROWD_VIEW.eye.z;
    mesh.visible = Math.hypot(Math.max(x0 - ex, ex - x1, 0), Math.max(z0 - ez, ez - z1, 0)) < 200;
    if (mesh.visible) update(t);
  });
}
