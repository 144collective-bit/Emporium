/*
 * Crestmont's life drawn (docs/crestmont-plan.md Phase 8; the data is crestlife.ts), from crestmont3d.ts's
 * `register()`: the dogs trotting ahead of their walkers up Canyon Drive and their leads (on the main thread, with
 * the city's tick, only while the camera is near enough to see them), and the gardeners' wheelbarrows (a site each,
 * near only). The people themselves are the city's crowd (life.ts).
 */
import * as THREE from 'three';
import { Batch, paintMat, toon } from './kit';
import { site } from './tilework';
import { CROWD_VIEW } from './character';
import { CREST_RECT } from './crestmont';
import { CREST_DOGS, CREST_PEOPLE, GARDENERS } from './crestlife';
import { SLAB_Y } from './coral';
import { moment } from './parklife';
import { dogGeometry, leadEnds } from './dogs3d';
import type { Tick } from './world';

const TRAY = toon('#3f7a54');
const RIM = toon('#2f5d40');
const WOOD = toon('#a8743f');
const TYRE = toon('#1b1830');
const SOIL = toon('#4e3d2f');
const LEAVES = toon('#5f9a45');

export function registerLife(scene: THREE.Scene | null, tick: ((f: Tick) => void) | undefined, low: boolean) {
  // The wheelbarrows: a green tray of clippings on one wheel, its handles back on two legs (+x its wheel)
  for (const [k, g] of GARDENERS.entries())
    site(`crestmont barrow ${k}`, [g.barrow[0] - 1, g.barrow[1] - 1, g.barrow[0] + 1, g.barrow[1] + 1], (into) => {
      const b = new Batch();
      b.lod = 'near';
      const M = new THREE.Matrix4().compose(new THREE.Vector3(g.barrow[0], SLAB_Y, g.barrow[1]), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), g.barrowRy), new THREE.Vector3(1, 1, 1));
      const add = (geo: THREE.BufferGeometry, m: THREE.Material) => b.add(geo.applyMatrix4(M), m);
      add(new THREE.BoxGeometry(0.62, 0.22, 0.46).translate(0.05, 0.36, 0), TRAY);
      add(new THREE.BoxGeometry(0.66, 0.04, 0.5).translate(0.05, 0.47, 0), RIM);
      add(new THREE.BoxGeometry(0.5, 0.06, 0.36).translate(0.05, 0.47, 0), SOIL);
      if (!low) for (const [x, z] of [[-0.08, 0.06], [0.12, -0.08]]) add(new THREE.IcosahedronGeometry(0.11, 0).translate(x, 0.53, z), LEAVES);
      add(new THREE.CylinderGeometry(0.13, 0.13, 0.07, low ? 8 : 12).rotateX(Math.PI / 2).translate(0.46, 0.13, 0), TYRE);
      for (const s of [-1, 1]) {
        add(new THREE.BoxGeometry(1.05, 0.04, 0.04).translate(-0.05, 0.4, s * 0.21), WOOD);
        add(new THREE.BoxGeometry(0.04, 0.3, 0.04).translate(-0.18, 0.15, s * 0.19), WOOD);
      }
      b.build(into, { cast: true, receive: true });
    });

  if (!scene || !tick || !CREST_DOGS.length) return;
  // The dogs: coat coloured per dog; phones leave out the trimmed walkers' dogs
  const shown = CREST_DOGS.filter((d) => !(low && CREST_PEOPLE[d.walker].trim));
  const group = new THREE.Group();
  group.name = 'crestmont-life';
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
  const [x0, z0, x1, z1] = CREST_RECT;
  const update = (t: number) => {
    shown.forEach((d, k) => {
      d.at(t, dm);
      // A trot: a quick bob and a rock fore and aft
      const ph = t * 9 + k;
      e.set(0, dm.ry - Math.PI / 2, Math.sin(ph) * 0.06, 'YXZ');
      m4.compose(v.set(dm.x, dm.y + Math.abs(Math.sin(ph)) * 0.025, dm.z), q.setFromEuler(e), sv.setScalar(d.size));
      dogs.setMatrixAt(k, m4);
      CREST_PEOPLE[d.walker].at(t, wm);
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
