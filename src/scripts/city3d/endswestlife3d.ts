/*
 * Endswood carried west, its life drawn (docs/ends-west-plan.md Phase 4; the data is endswestlife.ts), from
 * endswest3d.ts's `register()`:
 *
 * - **What's out**, as sites, near only: the washing in the back gardens (rotary airers and lines, the clothes on
 *   them), the kids' bikes and scooters against the front walls and their toys on the greens; the corner shop's and
 *   the chippy's lights under the parade's canopy, open late.
 * - **On the main thread** (the scene given): the people into the crowd's spare slots (life.ts `addPeople()`), and
 *   with the city's tick, only while the camera is near: the dogs on their leads; the porch lights' pools on the front
 *   paths and the late shops' on the forecourt, one additive mesh dark by day.
 *
 * Phones get every other person standing about and the movers' trimmed half left out, as the old estate's.
 */
import * as THREE from 'three';
import { Batch, PAL, fx, glowMat, lit, paintMat, toon } from './kit';
import { site } from './tilework';
import { CROWD_VIEW } from './character';
import { SLAB_Y, WEST_RECT, type Pt, type Rect } from './endswood';
import { TERRACES } from './endsterraces';
import { CANOPY_W, PARADE_W, unitAt } from './endsweststreet';
import { AIRER, FRONT_BITS, LATE_UNITS, LINE, PORCH_POOLS, WASHING, WEST_DOGS, WEST_IDLE, WEST_PEOPLE, type FrontBit, type Washing } from './endswestlife';
import { addPeople } from './life';
import { moment } from './parklife';
import { dogGeometry, leadEnds } from './dogs3d';
import { glow } from './infill';
import { LAMP_POST } from './palette';
import type { Tick } from './world';

const S = SLAB_Y;
const STEEL = toon('#9a9db0');
const TYRE = toon('#1d1c22');
const POST = toon('#c9c6bc');

/** A shape into the Batch at (x, z), turned to ry */
function put(b: Batch, g: THREE.BufferGeometry, x: number, z: number, ry: number, m: THREE.Material) {
  b.add(g.rotateY(ry).translate(x, S, z), m);
}
/** A thin rod from a to c (local, before turning) */
function rod(a: THREE.Vector3, c: THREE.Vector3, r: number) {
  const g = new THREE.CylinderGeometry(r, r, a.distanceTo(c), 4, 1, true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.clone().sub(a).normalize()));
  return g.translate((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2);
}
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** The clothes on a run from a to c at height y (world), hung in turn with gaps, a hair off the line */
function hang(b: Batch, a: Pt, c: Pt, y: number, clothes: string[], from: number) {
  const [dx, dz] = [c[0] - a[0], c[1] - a[1]];
  const len = Math.hypot(dx, dz);
  const ry = Math.atan2(dx, dz) + Math.PI / 2;
  const n = Math.max(1, Math.floor(len / 0.42));
  for (let i = 0; i < n; i++) {
    const col = clothes[(from + i) % clothes.length];
    const f = (i + 0.5) / n;
    const h = 0.26 + ((from + i) % 3) * 0.07;
    b.add(new THREE.BoxGeometry(0.3, h, 0.02).rotateY(ry).translate(a[0] + dx * f, S + y - 0.03 - h / 2, a[1] + dz * f), toon(col));
  }
}

function washing(b: Batch, w: Washing, low: boolean) {
  if (w.kind === 'rotary') {
    const [x, z] = w.at[0];
    b.add(new THREE.CylinderGeometry(0.025, 0.025, AIRER.h + 0.1, 5, 1, true).translate(x, S + (AIRER.h + 0.1) / 2, z), STEEL);
    const tips: Pt[] = [0, 1, 2, 3].map((k): Pt => [x + Math.cos(k * (Math.PI / 2) + 0.4) * AIRER.r, z + Math.sin(k * (Math.PI / 2) + 0.4) * AIRER.r]);
    for (const [tx, tz] of tips) b.add(rod(V(x, S + AIRER.h + 0.08, z), V(tx, S + AIRER.h, tz), 0.012), STEEL);
    tips.forEach((p, k) => {
      const q = tips[(k + 1) % 4];
      if (!low) b.add(rod(V(p[0], S + AIRER.h, p[1]), V(q[0], S + AIRER.h, q[1]), 0.006), STEEL);
      // (the clothes on two sides of the square, the others bare)
      if (k % 2 === 0 || !low) hang(b, p, q, AIRER.h, w.clothes, k * 2);
    });
    return;
  }
  const [a, c] = w.at;
  for (const [x, z] of [a, c]) b.add(new THREE.CylinderGeometry(0.035, 0.04, LINE.h + 0.1, 5, 1, true).translate(x, S + (LINE.h + 0.1) / 2, z), POST);
  if (!low) b.add(rod(V(a[0], S + LINE.h, a[1]), V(c[0], S + LINE.h, c[1]), 0.006), STEEL);
  hang(b, a, c, LINE.h, w.clothes, 0);
}

function bit(b: Batch, f: FrontBit) {
  const [x, z] = f.at;
  const paint = toon(f.colour);
  // (each shape turned to its facing and stood at its place)
  const g = {
    add: (geo: THREE.BufferGeometry, m: THREE.Material) => put(b, geo, x, z, f.ry, m),
    box: (bx: number, by: number, bz: number, w: number, h: number, d: number, m: THREE.Material) => put(b, new THREE.BoxGeometry(w, h, d).translate(bx + w / 2, by + h / 2, bz + d / 2), x, z, f.ry, m),
  };
  if (f.kind === 'bike') {
    // A kid's bike along its facing on its stand: two wheels, the frame, the saddle and bars
    for (const zz of [-0.32, 0.32]) g.add(new THREE.TorusGeometry(0.2, 0.03, 4, 12).rotateY(Math.PI / 2).translate(0, 0.2, zz), TYRE);
    g.add(rod(V(0, 0.2, -0.32), V(0, 0.42, -0.05), 0.022), paint);
    g.add(rod(V(0, 0.42, -0.05), V(0, 0.46, 0.22), 0.022), paint);
    g.add(rod(V(0, 0.2, 0.32), V(0, 0.46, 0.22), 0.022), paint);
    g.add(rod(V(0, 0.2, -0.32), V(0, 0.46, 0.22), 0.02), paint);
    g.box(-0.05, 0.5, -0.12, 0.1, 0.04, 0.16, TYRE);
    g.add(new THREE.CylinderGeometry(0.014, 0.014, 0.34, 4, 1, true).rotateZ(Math.PI / 2).translate(0, 0.6, 0.24), STEEL);
  } else if (f.kind === 'scooter') {
    g.box(-0.07, 0.05, -0.3, 0.14, 0.03, 0.55, paint);
    for (const zz of [-0.32, 0.3]) g.add(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 8).rotateZ(Math.PI / 2).translate(0, 0.05, zz), TYRE);
    g.add(rod(V(0, 0.06, 0.3), V(0, 0.72, 0.26), 0.018), STEEL);
    g.add(new THREE.CylinderGeometry(0.016, 0.016, 0.3, 4, 1, true).rotateZ(Math.PI / 2).translate(0, 0.72, 0.26), TYRE);
  } else if (f.kind === 'trike') {
    g.add(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 10).rotateZ(Math.PI / 2).translate(0, 0.12, 0.2), TYRE);
    for (const xx of [-0.14, 0.14]) g.add(new THREE.CylinderGeometry(0.08, 0.08, 0.035, 8).rotateZ(Math.PI / 2).translate(xx, 0.08, -0.18), TYRE);
    g.box(-0.06, 0.12, -0.2, 0.12, 0.06, 0.38, paint);
    g.box(-0.08, 0.2, -0.14, 0.16, 0.05, 0.14, paint);
    g.add(rod(V(0, 0.12, 0.2), V(0, 0.34, 0.14), 0.016), paint);
    g.add(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 4, 1, true).rotateZ(Math.PI / 2).translate(0, 0.34, 0.14), STEEL);
  } else if (f.kind === 'ball') {
    g.add(new THREE.IcosahedronGeometry(0.11, 1).translate(0, 0.11, 0), paint);
  } else {
    // A ride-on car: a rounded body, a cab, four little wheels
    g.box(-0.16, 0.08, -0.3, 0.32, 0.18, 0.6, paint);
    g.box(-0.14, 0.26, -0.12, 0.28, 0.16, 0.24, toon('#f3f2f7'));
    for (const [xx, zz] of [[-0.17, -0.2], [0.17, -0.2], [-0.17, 0.2], [0.17, 0.2]]) g.add(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 8).rotateZ(Math.PI / 2).translate(xx, 0.07, zz), TYRE);
  }
}

/** What's out round each terrace (its washing, its bikes and toys), a site a terrace, near only */
function registerBits(low: boolean) {
  for (const T of TERRACES) {
    const mine = (id: string) => id.startsWith(`${T.id}-`);
    const wash = WASHING.filter((w) => mine(w.house));
    const bits = FRONT_BITS.filter((f) => mine(f.house));
    if (!wash.length && !bits.length) continue;
    const pts = [...wash.flatMap((w) => w.at), ...bits.map((f) => f.at)];
    const r: Rect = [Math.min(...pts.map((p) => p[0])) - 1, Math.min(...pts.map((p) => p[1])) - 1, Math.max(...pts.map((p) => p[0])) + 1, Math.max(...pts.map((p) => p[1])) + 1];
    site(`endswest life ${T.id}`, r, (into) => {
      const b = new Batch();
      b.detail(() => {
        for (const w of wash) washing(b, w, low);
        for (const f of bits) if (!low || f.kind !== 'ball') bit(b, f);
      });
      b.build(into, { cast: true, receive: true });
    });
  }
  // The corner shop's and the chippy's tubes under the canopy, lit late
  const [x0, z0, x1] = [PARADE_W.rect[0], PARADE_W.rect[1], PARADE_W.rect[2]];
  site('endswest late shops', [x0 - 1, z0, x1 + 1, PARADE_W.front + 2], (into) => {
    const b = new Batch();
    for (const k of LATE_UNITS) {
      const [a, c] = unitAt(k);
      b.box(a + 0.35, CANOPY_W.y - 0.035, PARADE_W.front + CANOPY_W.out * 0.45, c - a - 0.7, 0.03, 0.05, glow(PAL.warm));
    }
    b.build(into, { cast: false, receive: false });
  });
}

/** The people, the dogs and the porch lights' pools (the main thread's) */
function registerMain(scene: THREE.Scene, tick: ((f: Tick) => void) | undefined, low: boolean) {
  addPeople(
    WEST_IDLE.filter((_, i) => !low || i % 2 === 0),
    WEST_PEOPLE.filter((p) => !(low && p.trim))
  );
  const group = new THREE.Group();
  group.name = 'endswest-life';
  scene.add(group);
  // The porch lights' pools: flat glows on the paths, dark by day (as the lamps' pools)
  const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), lit(glowMat(PAL.warm, 1), 0, 0.24), PORCH_POOLS.length);
  const m4 = new THREE.Matrix4();
  const v = new THREE.Vector3();
  const sv = new THREE.Vector3();
  PORCH_POOLS.forEach(([x, z, size], i) => pools.setMatrixAt(i, m4.compose(v.set(x, S + 0.025, z), flat, sv.setScalar(size))));
  pools.frustumCulled = false;
  group.add(fx(pools));
  if (!tick) return;
  // The dogs and their leads (phones leave out the trimmed walkers' dogs)
  const shown = WEST_DOGS.filter((d) => !(low && WEST_PEOPLE[d.walker].trim));
  const dogs = new THREE.InstancedMesh(dogGeometry(), paintMat(), Math.max(1, shown.length));
  dogs.castShadow = true;
  dogs.receiveShadow = true;
  dogs.frustumCulled = false;
  dogs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const c = new THREE.Color();
  shown.forEach((d, i) => dogs.setColorAt(i, c.set(d.coat)));
  group.add(dogs);
  const leadPos = new Float32Array(Math.max(1, shown.length) * 6);
  const leadGeo = new THREE.BufferGeometry();
  leadGeo.setAttribute('position', new THREE.BufferAttribute(leadPos, 3).setUsage(THREE.DynamicDrawUsage));
  const leads = new THREE.LineSegments(leadGeo, new THREE.LineBasicMaterial({ color: LAMP_POST.ink }));
  leads.frustumCulled = false;
  group.add(leads);
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const dm = moment();
  const wm = moment();
  const update = (t: number) => {
    shown.forEach((d, k) => {
      d.at(t, dm);
      const ph = t * 9 + k;
      e.set(0, dm.ry - Math.PI / 2, Math.sin(ph) * 0.06, 'YXZ');
      dogs.setMatrixAt(k, m4.compose(v.set(dm.x, dm.y + Math.abs(Math.sin(ph)) * 0.025, dm.z), q.setFromEuler(e), sv.setScalar(d.size)));
      WEST_PEOPLE[d.walker].at(t, wm);
      leadEnds(leadPos, k, wm, dm, d.size, wm.y, dm.y);
    });
    dogs.instanceMatrix.needsUpdate = true;
    leadGeo.attributes.position.needsUpdate = true;
  };
  update(0);
  const [x0, z0, x1, z1] = WEST_RECT;
  tick(({ t }) => {
    // Only while the camera is near enough to see them (the crowd draws nobody past 170)
    const ex = CROWD_VIEW.eye.x;
    const ez = CROWD_VIEW.eye.z;
    group.visible = Math.hypot(Math.max(x0 - ex, ex - x1, 0), Math.max(z0 - ez, ez - z1, 0)) < 180;
    if (group.visible) update(t);
  });
}

export function registerWestLife(low: boolean, scene: THREE.Scene | null, tick?: (f: Tick) => void) {
  registerBits(low);
  if (scene) registerMain(scene, tick, low);
}
