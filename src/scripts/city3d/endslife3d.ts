/*
 * Endswood's life drawn (docs/estate-plan.md Phase 7; the data is endslife.ts), from endswood3d.ts's `register()`: its
 * people into the crowd's spare slots (life.ts `addPeople()`), and on the main thread with the city's tick, only while
 * the camera is near enough to see them: the dogs on their leads, the kids' BMXs (up on the back wheel now and then),
 * the mopeds up and down the Close, the old lady's shopping trolley. Phones get every other idle person and the
 * movers' trimmed half left out, as the park's.
 */
import * as THREE from 'three';
import { Batch, paintMat, toon } from './kit';
import { CROWD_VIEW } from './character';
import { ENDSWOOD_RECT, SLAB_Y } from './endswood';
import { BMX, BMX_KIDS, ENDS_DOGS, ENDS_IDLE, ENDS_PEOPLE, MOPEDS, bmxAt, mopedAt, trolleyAt } from './endslife';
import { addPeople } from './life';
import { moment } from './parklife';
import { dogGeometry, leadEnds } from './dogs3d';
import type { Tick } from './world';

const TYRE = toon('#1d1c22');
const WHITE = toon('#f3f2f7');
const STEEL = toon('#8f93ad');
const BLACK = toon('#22212a');

function rod(b: Batch, a: THREE.Vector3, c: THREE.Vector3, r: number, m: THREE.Material, seg = 5) {
  const g = new THREE.CylinderGeometry(r, r, a.distanceTo(c), seg, 1, true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.clone().sub(a).normalize()));
  b.add(g.translate((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2), m);
}
/** A Batch's one mesh's geometry (its colours per vertex; the instances tint it) */
function geometryOf(b: Batch) {
  const g = new THREE.Group();
  b.build(g);
  return (g.children[0] as THREE.Mesh).geometry;
}
/** A kid's BMX along +z (its front): small fat wheels, a low frame (painted per bike), the bars up high */
function bmx() {
  const b = new Batch();
  const R = 0.2;
  for (const z of [-0.3, 0.3]) b.add(new THREE.TorusGeometry(R, 0.04, 4, 14).rotateY(Math.PI / 2).translate(0, R, z), TYRE);
  const V = (y: number, z: number) => new THREE.Vector3(0, y, z);
  rod(b, V(R, -0.3), V(0.22, -0.05), 0.022, WHITE);
  rod(b, V(0.22, -0.05), V(0.42, -0.1), 0.024, WHITE);
  rod(b, V(0.42, -0.1), V(0.4, 0.2), 0.024, WHITE);
  rod(b, V(0.22, -0.05), V(0.4, 0.2), 0.026, WHITE);
  rod(b, V(0.4, 0.2), V(R, 0.3), 0.022, WHITE);
  b.box(-0.05, 0.43, -0.18, 0.1, 0.035, 0.16, BLACK);
  rod(b, V(0.4, 0.2), V(0.58, 0.18), 0.02, STEEL);
  b.add(new THREE.CylinderGeometry(0.016, 0.016, 0.4, 5).rotateZ(Math.PI / 2).translate(0, 0.58, 0.18), STEEL);
  return geometryOf(b);
}
/** A moped along +z: small wheels, the step-through body and its leg shield (painted per moped), the seat, the bars,
 * a top box on the back (the takeaway delivery's) */
function moped() {
  const b = new Batch();
  const R = 0.17;
  for (const z of [-0.42, 0.42]) b.add(new THREE.TorusGeometry(R, 0.055, 5, 14).rotateY(Math.PI / 2).translate(0, R, z), TYRE);
  const BODY = toon('#ffffff');
  b.box(-0.13, 0.2, -0.5, 0.26, 0.24, 0.42, BODY);
  b.box(-0.08, 0.14, -0.1, 0.16, 0.12, 0.42, BODY);
  b.box(-0.16, 0.18, 0.28, 0.32, 0.5, 0.08, BODY);
  b.box(-0.12, 0.44, -0.46, 0.24, 0.07, 0.42, BLACK);
  const V = (y: number, z: number) => new THREE.Vector3(0, y, z);
  rod(b, V(0.6, 0.32), V(R, 0.42), 0.022, STEEL);
  b.add(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 5).rotateZ(Math.PI / 2).translate(0, 0.68, 0.3), BLACK);
  b.box(-0.16, 0.5, -0.66, 0.32, 0.3, 0.28, toon('#d8d4ce'));
  return geometryOf(b);
}
/** The shopping trolley along +z (towards her): a tartan bag on a frame, two wheels, its handle up to her hand,
 * leaning back on its wheels as it's pulled */
function trolley() {
  const b = new Batch();
  const TARTAN = toon('#7a2a3a');
  const CHECK = toon('#2f4a3a');
  const lean = new THREE.Matrix4().makeRotationX(0.42);
  const g = (geo: THREE.BufferGeometry, m: THREE.Material) => b.add(geo.applyMatrix4(lean), m);
  g(new THREE.BoxGeometry(0.3, 0.46, 0.22).translate(0, 0.36, 0), TARTAN);
  g(new THREE.BoxGeometry(0.31, 0.06, 0.23).translate(0, 0.42, 0), CHECK);
  g(new THREE.BoxGeometry(0.31, 0.06, 0.23).translate(0, 0.28, 0), CHECK);
  g(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 5).translate(0, 0.78, -0.08), STEEL);
  g(new THREE.CylinderGeometry(0.016, 0.016, 0.24, 5).rotateZ(Math.PI / 2).translate(0, 0.99, -0.08), BLACK);
  for (const x of [-0.17, 0.17]) b.add(new THREE.CylinderGeometry(0.075, 0.075, 0.04, 10).rotateZ(Math.PI / 2).translate(x, 0.075, -0.08), TYRE);
  return geometryOf(b);
}

export function registerLife(scene: THREE.Scene | null, tick: ((f: Tick) => void) | undefined, low: boolean) {
  // (the site worker loads this module too: nothing of this is a site)
  if (!scene) return;
  addPeople(
    ENDS_IDLE.filter((_, i) => !low || i % 2 === 0),
    ENDS_PEOPLE.filter((p) => !(low && p.trim))
  );
  if (!tick) return;
  const group = new THREE.Group();
  group.name = 'endswood-life';
  scene.add(group);
  const inst = (geo: THREE.BufferGeometry, n: number) => {
    const m = new THREE.InstancedMesh(geo, paintMat(), n);
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(m);
    return m;
  };
  const c = new THREE.Color();
  // The dogs and their leads (phones leave out the trimmed walkers' dogs)
  const shown = ENDS_DOGS.filter((d) => !(low && ENDS_PEOPLE[d.walker].trim));
  const dogs = inst(dogGeometry(), Math.max(1, shown.length));
  shown.forEach((d, i) => dogs.setColorAt(i, c.set(d.coat)));
  const leadPos = new Float32Array(Math.max(1, shown.length) * 6);
  const leadGeo = new THREE.BufferGeometry();
  leadGeo.setAttribute('position', new THREE.BufferAttribute(leadPos, 3).setUsage(THREE.DynamicDrawUsage));
  const leads = new THREE.LineSegments(leadGeo, new THREE.LineBasicMaterial({ color: '#1b1830' }));
  leads.frustumCulled = false;
  group.add(leads);
  // The kids' BMXs, the mopeds, the trolley
  const bikeN = low ? BMX_KIDS - 1 : BMX_KIDS;
  const bikes = inst(bmx(), bikeN);
  ['#00b8d8', '#e219e5', '#ffd23f'].forEach((col, i) => i < bikeN && bikes.setColorAt(i, c.set(col)));
  const mopedN = low ? MOPEDS - 1 : MOPEDS;
  const mopeds = inst(moped(), mopedN);
  ['#c92a2a', '#2a3a5a'].forEach((col, i) => i < mopedN && mopeds.setColorAt(i, c.set(col)));
  const cart = inst(trolley(), 1);
  cart.setColorAt(0, c.set('#ffffff'));

  const m4 = new THREE.Matrix4();
  const tilt = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const sv = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const dm = moment();
  const wm = moment();
  // (the BMX's back axle, about which a wheelie lifts its front)
  const REAR = -0.3 * BMX.bike;
  const update = (t: number) => {
    shown.forEach((d, k) => {
      d.at(t, dm);
      const ph = t * 9 + k;
      e.set(0, dm.ry - Math.PI / 2, Math.sin(ph) * 0.06, 'YXZ');
      dogs.setMatrixAt(k, m4.compose(v.set(dm.x, dm.y + Math.abs(Math.sin(ph)) * 0.025, dm.z), q.setFromEuler(e), sv.setScalar(d.size)));
      ENDS_PEOPLE[d.walker].at(t, wm);
      leadEnds(leadPos, k, wm, dm, d.size, wm.y, dm.y);
    });
    dogs.instanceMatrix.needsUpdate = true;
    leadGeo.attributes.position.needsUpdate = true;
    for (let k = 0; k < bikeN; k++) {
      const p = bmxAt(k, t);
      m4.compose(v.set(p.x, SLAB_Y, p.z), q.setFromAxisAngle(up, p.ry), sv.setScalar(BMX.bike));
      // (a wheelie: the frame turned up about the back axle)
      tilt.makeTranslation(0, 0, REAR / BMX.bike).multiply(new THREE.Matrix4().makeRotationX(-p.pitch)).multiply(new THREE.Matrix4().makeTranslation(0, 0, -REAR / BMX.bike));
      bikes.setMatrixAt(k, m4.multiply(tilt));
    }
    bikes.instanceMatrix.needsUpdate = true;
    for (let k = 0; k < mopedN; k++) {
      const p = mopedAt(k, t);
      mopeds.setMatrixAt(k, m4.compose(v.set(p.x, SLAB_Y, p.z), q.setFromAxisAngle(up, p.ry), sv.setScalar(1)));
    }
    mopeds.instanceMatrix.needsUpdate = true;
    const tr = trolleyAt(t);
    cart.setMatrixAt(0, m4.compose(v.set(tr.x, SLAB_Y, tr.z), q.setFromAxisAngle(up, tr.ry), sv.setScalar(1)));
    cart.instanceMatrix.needsUpdate = true;
  };
  update(0);
  const [x0, z0, x1, z1] = ENDSWOOD_RECT;
  tick(({ t }) => {
    // Only while the camera is near enough to see them (the crowd draws nobody past 170)
    const ex = CROWD_VIEW.eye.x;
    const ez = CROWD_VIEW.eye.z;
    group.visible = Math.hypot(Math.max(x0 - ex, ex - x1, 0), Math.max(z0 - ez, ez - z1, 0)) < 180;
    if (group.visible) update(t);
  });
}
