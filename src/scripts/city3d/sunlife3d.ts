/*
 * Sunridge's life drawn (docs/suburb-plan.md Phase 5; the data is sunlife.ts), from sunridge3d.ts's `register()`: its
 * people into the crowd's spare slots (life.ts `addPeople()`), the dogs trotting ahead of their walkers and their leads
 * (on the main thread, with the city's tick, only while the camera is near enough to see them), and the residents'
 * cars on the driveways (`parkedCars()`, solid). Phones get every other idle person and the movers' trimmed half left
 * out, as the park's.
 */
import * as THREE from 'three';
import { paintMat } from './kit';
import { CROWD_VIEW } from './character';
import { SUNRIDGE_RECT } from './sunridge';
import { SLAB_Y } from './sunplaces';
import { DRIVEWAY_CARS, DRIVEWAY_SOLIDS, SUN_DOGS, SUN_IDLE, SUN_PEOPLE } from './sunlife';
import { addPeople } from './life';
import { moment } from './parklife';
import { dogGeometry, leadEnds } from './dogs3d';
import { parkedCars } from './cars';
import { addSolids } from './solids';
import type { Tick } from './world';

export function registerLife(scene: THREE.Scene | null, tick: ((f: Tick) => void) | undefined, low: boolean) {
  // (the site worker loads this module too: nothing of this is a site)
  if (!scene) return;
  addPeople(
    SUN_IDLE.filter((_, i) => !low || i % 2 === 0),
    SUN_PEOPLE.filter((p) => !(low && p.trim))
  );
  // The residents' cars on the driveways, solid
  parkedCars(scene, SLAB_Y, DRIVEWAY_CARS);
  addSolids(DRIVEWAY_SOLIDS);

  if (!tick || !SUN_DOGS.length) return;
  // The dogs: coat coloured per dog; phones leave out the trimmed walkers' dogs
  const shown = SUN_DOGS.filter((d) => !(low && SUN_PEOPLE[d.walker].trim));
  if (!shown.length) return;
  const group = new THREE.Group();
  group.name = 'sunridge-life';
  scene.add(group);
  const dogs = new THREE.InstancedMesh(dogGeometry(), paintMat(), shown.length);
  dogs.castShadow = true;
  dogs.receiveShadow = true;
  dogs.frustumCulled = false;
  dogs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const c = new THREE.Color();
  shown.forEach((d, i) => dogs.setColorAt(i, c.set(d.coat)));
  group.add(dogs);
  const leadPos = new Float32Array(shown.length * 6);
  const leadGeo = new THREE.BufferGeometry();
  leadGeo.setAttribute('position', new THREE.BufferAttribute(leadPos, 3).setUsage(THREE.DynamicDrawUsage));
  const leads = new THREE.LineSegments(leadGeo, new THREE.LineBasicMaterial({ color: '#1b1830' }));
  leads.frustumCulled = false;
  group.add(leads);

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const sv = new THREE.Vector3();
  const dm = moment();
  const wm = moment();
  const [x0, z0, x1, z1] = SUNRIDGE_RECT;
  const update = (t: number) => {
    shown.forEach((d, k) => {
      d.at(t, dm);
      // A trot: a quick bob and a rock fore and aft
      const ph = t * 9 + k;
      e.set(0, dm.ry - Math.PI / 2, Math.sin(ph) * 0.06, 'YXZ');
      m4.compose(v.set(dm.x, dm.y + Math.abs(Math.sin(ph)) * 0.025, dm.z), q.setFromEuler(e), sv.setScalar(d.size));
      dogs.setMatrixAt(k, m4);
      SUN_PEOPLE[d.walker].at(t, wm);
      leadEnds(leadPos, k, wm, dm, d.size, wm.y, dm.y);
    });
    dogs.instanceMatrix.needsUpdate = true;
    leadGeo.attributes.position.needsUpdate = true;
  };
  update(0);
  tick(({ t }) => {
    // Only while the camera is near enough to see them (the crowd draws nobody past 170)
    const ex = CROWD_VIEW.eye.x;
    const ez = CROWD_VIEW.eye.z;
    group.visible = Math.hypot(Math.max(x0 - ex, ex - x1, 0), Math.max(z0 - ez, ez - z1, 0)) < 200;
    if (group.visible) update(t);
  });
}
