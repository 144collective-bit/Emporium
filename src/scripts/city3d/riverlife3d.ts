/*
 * The river's life on screen (river plan step 4a; riverlife.ts has the
 * numbers): a district loaded as you approach the river (districts.ts,
 * `LAZY_DISTRICTS` id `river`), nothing in it fixed, so no sites: on the
 * main thread with the city's tick,
 *
 * - the cruise boat: a navy hull with a white stripe, a cabin with a band of
 *   windows (lit at night), a wheelhouse, an open top deck with a rail and
 *   a string of bulbs, benches and its passengers, a flag at the stern;
 * - the rowing eight: a long white shell, eight rowers and a cox, the oars
 *   sweeping together (one instanced mesh);
 * - the dinghies: white hulls, a mast, a coloured mainsail and a sailor,
 *   heeling into their turn.
 *
 * Each boat is a group of its own (its parts merged per material through a
 * Batch), placed every frame from the clock, the same for everyone; under
 * reduced motion they stand where they are at the start.
 */
import * as THREE from 'three';
import { Batch, moving, neon, paintMat, toon } from './kit';
import type { Tick } from './world';
import { CROWD_VIEW } from './character';
import { WATER_Y } from './river';
import { CREW, CRUISE, DINGHIES, DINGHY, crewAt, cruiseAt, dinghyAt } from './riverlife';

export const SELF = import.meta.url;

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const WHITE = toon('#eeeaf4');
const NAVY = toon('#1d2a4f');
const INK = toon('#262233');
const TEAK = toon('#9a6a40');
const WINDOW = neon('#ffc66e', 0.15, 1.1);
const BULB = neon('#ffe2a0', 0.4, 2.4);

/** A box from (x0, y0, z0) to (x1, y1, z1) */
const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: THREE.Material) => b.box(x0, y0, z0, x1 - x0, y1 - y0, z1 - z0, mat);
/** A hull's plan from above, +x its bow: square at the stern, drawn to a point (`k` scales it) */
function plan(len: number, beam: number, k = 1) {
  const [h, w] = [(len / 2) * k, (beam / 2) * k];
  const s = new THREE.Shape();
  s.moveTo(-h, -w);
  s.lineTo(h - beam * 1.1 * k, -w);
  s.quadraticCurveTo(h - beam * 0.25 * k, -w * 0.75, h, 0);
  s.quadraticCurveTo(h - beam * 0.25 * k, w * 0.75, h - beam * 1.1 * k, w);
  s.lineTo(-h, w);
  s.closePath();
  return s;
}
/** The plan extruded from y0 to y1 */
const solid = (b: Batch, len: number, beam: number, k: number, y0: number, y1: number, mat: THREE.Material) =>
  b.add(new THREE.ExtrudeGeometry(plan(len, beam, k), { depth: y1 - y0, bevelEnabled: false, curveSegments: 6 }).rotateX(-Math.PI / 2).translate(0, y0, 0), mat);
/** A seated figure (a block body and a round head) at (x, y, z), facing +x or -x */
function sitter(b: Batch, x: number, y: number, z: number, coat: string, s = 1) {
  box(b, x - 0.09 * s, y, z - 0.11 * s, x + 0.09 * s, y + 0.26 * s, z + 0.11 * s, toon(coat));
  b.add(new THREE.SphereGeometry(0.075 * s, 8, 6).translate(x, y + 0.34 * s, z), toon('#2b2236'));
}
/** A group of the Batch's meshes, moving (the shadow map's second light), never in a far form */
function group(b: Batch) {
  const g = new THREE.Group();
  b.build(g);
  g.userData.keep = true;
  return moving(g);
}

/* ---------- The cruise boat ---------- */

function cruiseBoat() {
  const b = new Batch();
  const { len, beam } = CRUISE.hull;
  const [h, w] = [len / 2, beam / 2];
  solid(b, len, beam, 1, -0.3, 0.55, NAVY);
  solid(b, len, beam, 1.012, 0.38, 0.48, WHITE);
  solid(b, len, beam, 0.97, 0.55, 0.57, TEAK);
  // The cabin with its band of windows, the wheelhouse forward of it
  const [c0, c1] = [-h + 0.3, h - 1.5];
  box(b, c0, 0.57, -w + 0.12, c1, 1.15, w - 0.12, WHITE);
  for (const e of [-1, 1]) box(b, c0 + 0.2, 0.74, e > 0 ? w - 0.12 : -w + 0.1, c1 - 0.2, 1.02, e > 0 ? w - 0.1 : -w + 0.12, WINDOW);
  box(b, c1, 0.57, -0.4, c1 + 0.6, 1.3, 0.4, WHITE);
  box(b, c1 + 0.58, 0.95, -0.34, c1 + 0.61, 1.2, 0.34, WINDOW);
  box(b, c1 - 0.02, 1.3, -0.45, c1 + 0.65, 1.35, 0.45, NAVY);
  // The top deck on the cabin's roof: its floor, a rail round it with a string of bulbs, benches and passengers
  box(b, c0 - 0.05, 1.15, -w + 0.08, c1 + 0.05, 1.2, w - 0.08, TEAK);
  for (const e of [-1, 1]) {
    box(b, c0, 1.2, e * (w - 0.12) - 0.02, c1, 1.55, e * (w - 0.12) + 0.02, INK);
    box(b, c0, 1.51, e * (w - 0.12) - 0.04, c1, 1.55, e * (w - 0.12) + 0.04, WHITE);
  }
  for (const x of [c0, c1]) box(b, x - 0.02, 1.2, -w + 0.1, x + 0.02, 1.55, w - 0.1, INK);
  for (let x = c0 + 0.25; x < c1; x += 0.5) for (const e of [-1, 1]) box(b, x - 0.03, 1.56, e * (w - 0.12) - 0.03, x + 0.03, 1.6, e * (w - 0.12) + 0.03, BULB);
  const coats = ['#e2197a', '#2aabee', '#ffd23f', '#f3f2f7', '#7a4cff', '#2fae6b'];
  let k = 0;
  for (let x = c0 + 0.4; x < c1 - 0.2; x += 0.75) {
    box(b, x - 0.12, 1.2, -0.45, x + 0.12, 1.32, 0.45, toon('#c03a3a'));
    for (const z of [-0.25, 0.25]) if ((k++ * 7) % 3) sitter(b, x, 1.32, z, coats[k % coats.length], 0.85);
  }
  // A flag at the stern
  box(b, -h + 0.1, 0.55, -0.02, -h + 0.14, 1.62, 0.02, INK);
  box(b, -h - 0.4, 1.3, -0.01, -h + 0.1, 1.6, 0.01, toon('#e2197a'));
  return group(b);
}

/* ---------- The rowing eight ---------- */

const SEATS = 8;
function crewBoat() {
  const b = new Batch();
  const { len, beam } = CREW.hull;
  solid(b, len, beam, 1, -0.08, 0.16, WHITE);
  solid(b, len, beam, 1.02, 0.06, 0.1, toon('#e2197a'));
  // Eight rowers facing the stern, the cox at the stern facing them
  for (let i = 0; i < SEATS; i++) sitter(b, -len / 2 + 0.9 + i * 0.47, 0.12, 0, i % 2 ? '#2aabee' : '#7a4cff', 0.8);
  sitter(b, -len / 2 + 0.35, 0.12, 0, '#ffd23f', 0.75);
  return group(b);
}

/* ---------- A dinghy ---------- */

function dinghy(sail: string) {
  const b = new Batch();
  const { len, beam } = DINGHY;
  solid(b, len, beam, 1, -0.12, 0.2, WHITE);
  solid(b, len, beam, 0.92, 0.2, 0.22, TEAK);
  b.add(new THREE.CylinderGeometry(0.025, 0.03, 2.0, 6).translate(0.15, 1.2, 0), INK);
  box(b, -0.65, 0.42, -0.02, 0.15, 0.46, 0.02, INK);
  // The mainsail: a triangle from the mast's top down to the boom (both faces)
  const sailGeo = new THREE.BufferGeometry().setFromPoints([V(0.12, 2.15, 0), V(0.12, 0.48, 0), V(-0.62, 0.48, 0)]);
  sailGeo.setIndex([0, 1, 2, 0, 2, 1]);
  sailGeo.computeVertexNormals();
  b.add(sailGeo, toon(sail));
  sitter(b, -0.45, 0.2, 0.18, '#262233', 0.8);
  return group(b);
}

/* ---------- Building it ---------- */

export function register({ scene, tick, low }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  if (!scene || !tick) return;
  const root = new THREE.Group();
  root.name = 'river-life';
  scene.add(root);
  const cruise = cruiseBoat();
  const crew = crewBoat();
  const dinghies = DINGHIES.map((d) => dinghy(d.sail));
  root.add(cruise, crew, ...dinghies);
  // The eight's oars: one instanced mesh, each oar pivoting at its rigger, sweeping together
  const oarGeo = new THREE.BoxGeometry(1.4, 0.025, 0.04).translate(0.7, 0, 0);
  const oars = new THREE.InstancedMesh(oarGeo, paintMat(), SEATS);
  oars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < SEATS; i++) oars.setColorAt(i, new THREE.Color(i % 2 ? '#2aabee' : '#7a4cff'));
  oars.frustumCulled = false;
  moving(oars);
  oars.userData.keep = true;
  crew.add(oars);
  if (low) for (const d of dinghies.slice(2)) d.visible = false;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = Date.now() / 1000;
  const M = new THREE.Matrix4();
  const Q = new THREE.Quaternion();
  const E = new THREE.Euler();
  const S = new THREE.Vector3(1, 1, 1);
  const P = new THREE.Vector3();
  const place = (g: THREE.Object3D, p: { x: number; z: number; yaw: number }, t: number, roll = 0) => {
    g.position.set(p.x, WATER_Y + 0.02 + Math.sin(t * 1.3 + p.x * 0.1) * 0.025, p.z);
    g.rotation.set(roll, p.yaw, Math.sin(t * 1.1 + p.z) * 0.02, 'YXZ');
  };
  tick(() => {
    const t = reduced ? t0 : Date.now() / 1000;
    // (only while the camera's near the river: nothing out there is seen from far off anyway)
    const e = CROWD_VIEW.eye;
    root.visible = e.z > 71 - 220 && e.z < 131 + 220;
    if (!root.visible) return;
    place(cruise, cruiseAt(t), t);
    place(crew, crewAt(t), t);
    dinghies.forEach((g, i) => {
      const d = dinghyAt(i, t);
      // (heeling to the outside of its turn, away from the wind)
      place(g, d, t, d.heel * -DINGHIES[i].way);
    });
    // The stroke: the oars sweep back in the water and come forward feathered over it
    const stroke = reduced ? 0 : t * 2.2;
    for (let i = 0; i < SEATS; i++) {
      const side = i % 2 ? 1 : -1;
      const sw = Math.sin(stroke) * 0.45;
      const dip = Math.cos(stroke) > 0 ? -0.08 : 0.06;
      E.set(side * dip, side > 0 ? -Math.PI / 2 + sw : Math.PI / 2 - sw, 0, 'YXZ');
      Q.setFromEuler(E);
      P.set(-CREW.hull.len / 2 + 0.9 + i * 0.47, 0.22, side * 0.25);
      oars.setMatrixAt(i, M.compose(P, Q, S));
    }
    oars.instanceMatrix.needsUpdate = true;
  });
}
