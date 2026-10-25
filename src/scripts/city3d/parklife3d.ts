/*
 * Westlake Park's life on screen (step 3; the numbers are westlake.ts and
 * parklife.ts), part of the park's own chunk (westlake3d.ts registers it):
 *
 * - **Sites** (tilework.ts): the boathouse on the lake's north shore (cream
 *   boards, a red roof, its boat bay open to the water, WESTLAKE BOATHOUSE
 *   over it between two lanterns), the jetty (planks on posts, mooring posts,
 *   a lamp at its end) and the picnics' blankets and baskets (near only).
 * - **What moves** (on the main thread, a tick of its own): the boats
 *   (rowing boats in their colours with their oars sweeping, swan pedalos),
 *   and the dogs trotting on their leads. Each kind is one
 *   instanced mesh (the rowing boats' hulls take their colour per boat);
 *   none of it is drawn while the camera is far from the park.
 *
 * The people (walkers, joggers, picnickers, boaters) are the city's
 * crowd, placed by life.ts from parklife.ts.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, lit, neon, paintMat, siteMat, toon } from './kit';
import { SLAB, type Tick } from './world';
import { site } from './tilework';
import { CROWD_VIEW } from './character';
import { BOATHOUSE, JETTY, WESTLAKE_RECT } from './westlake';
import { BOATS, BOAT_Y, DOGS, HULL, PARK_PEOPLE, PICNICS, moment } from './parklife';
import { setWakes, type Wake } from './wakes';

const CREAM = toon('#ece4d0');
const TRIM = toon('#2f6152');
const ROOF = toon('#9b3c3c');
const DARK = toon('#2a2438');
const PLANK = toon('#8a6a4c');
const POST = toon('#5a4232');
const IRON = toon('#1b1830');
const WHITE = toon('#f2f0f8');
const LAMP = neon('#ffe2a0', 0.6, 2.4);
const padded = (r: readonly number[], m: number): [number, number, number, number] => [r[0] - m, r[1] - m, r[2] + m, r[3] + m];

/* ---------- The boathouse and the jetty ---------- */

/** A pitched roof over x0..x1 by z0..z1: eaves at y0 along both long sides, the ridge along x at y1; gables at the ends */
function roof(x0: number, z0: number, x1: number, z1: number, y0: number, y1: number) {
  const zm = (z0 + z1) / 2;
  const pos = [
    // The two slopes (north, then south), facing up and out
    x0, y0, z0, x0, y1, zm, x1, y1, zm, x0, y0, z0, x1, y1, zm, x1, y0, z0,
    x0, y0, z1, x1, y1, zm, x0, y1, zm, x0, y0, z1, x1, y0, z1, x1, y1, zm,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
/** A gable end: a triangle at x from the eaves (z0..z1 at y0) up to the ridge (y1), facing out along ±x */
function gable(x: number, z0: number, z1: number, y0: number, y1: number, out: 1 | -1) {
  const zm = (z0 + z1) / 2;
  const pos = out > 0 ? [x, y0, z0, x, y1, zm, x, y0, z1] : [x, y0, z0, x, y0, z1, x, y1, zm];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function boathouseSign() {
  const tex = canvasTex(512, 96, (c) => {
    c.fillStyle = '#2f6152';
    c.fillRect(0, 0, 512, 96);
    c.strokeStyle = '#ece4d0';
    c.lineWidth = 4;
    c.strokeRect(6, 6, 500, 84);
    c.fillStyle = '#fff8e8';
    c.font = `900 50px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('WESTLAKE BOATHOUSE', 256, 52);
  });
  return siteMat('westlake-boathouse-sign', lit(new THREE.MeshBasicMaterial({ map: tex, toneMapped: true }), 0.95, 1.15));
}

function boathouse(b: Batch, sign: THREE.Material) {
  const [x0, z0, x1, z1] = BOATHOUSE.rect;
  const y0 = SLAB;
  const y1 = SLAB + BOATHOUSE.h;
  const yr = SLAB + BOATHOUSE.ridge;
  const t = 0.18;
  // The walls: back, ends, and the front either side of the boat bay (its opening 3.6 wide, 2.3 high)
  b.box(x0, y0, z0, x1 - x0, y1 - y0, t, CREAM);
  b.box(x0, y0, z0, t, y1 - y0, z1 - z0, CREAM);
  b.box(x1 - t, y0, z0, t, y1 - y0, z1 - z0, CREAM);
  const bay = 3.6;
  const bayH = 2.3;
  const cx = (x0 + x1) / 2;
  b.box(x0, y0, z1 - t, cx - bay / 2 - x0, y1 - y0, t, CREAM);
  b.box(cx + bay / 2, y0, z1 - t, x1 - cx - bay / 2, y1 - y0, t, CREAM);
  b.box(cx - bay / 2, y0 + bayH, z1 - t, bay, y1 - y0 - bayH, t, CREAM);
  // Inside the bay: dark, with a floor
  b.box(cx - bay / 2, y0, z0 + t, bay, 0.02, z1 - z0 - 2 * t, PLANK);
  b.box(cx - bay / 2 + 0.01, y0, z0 + t + 0.01, bay - 0.02, bayH - 0.02, 0.02, DARK);
  // The roof, red, overhanging; gables cream; a green fascia and trims at the corners
  const o = 0.35;
  b.add(roof(x0 - o, z0 - o, x1 + o, z1 + o, y1 - 0.05, yr), ROOF);
  b.add(gable(x0, z0, z1, y1 - 0.004, yr - 0.25, -1), CREAM);
  b.add(gable(x1, z0, z1, y1 - 0.004, yr - 0.25, 1), CREAM);
  b.box(x0 - 0.06, y0, z1 - 0.06, 0.12, y1 - y0, 0.12, TRIM);
  b.box(x1 - 0.06, y0, z1 - 0.06, 0.12, y1 - y0, 0.12, TRIM);
  b.box(x0 - 0.06, y0, z0 - 0.06, 0.12, y1 - y0, 0.12, TRIM);
  b.box(x1 - 0.06, y0, z0 - 0.06, 0.12, y1 - y0, 0.12, TRIM);
  b.box(cx - bay / 2 - 0.12, y0, z1 - 0.02, 0.12, bayH + 0.12, 0.08, TRIM);
  b.box(cx + bay / 2, y0, z1 - 0.02, 0.12, bayH + 0.12, 0.08, TRIM);
  b.box(cx - bay / 2 - 0.12, y0 + bayH, z1 - 0.02, bay + 0.24, 0.12, 0.08, TRIM);
  // The doors folded back either side of the bay
  b.box(cx - bay / 2 - 1.0, y0 + 0.05, z1 + 0.02, 0.9, bayH - 0.1, 0.06, TRIM);
  b.box(cx + bay / 2 + 0.1, y0 + 0.05, z1 + 0.02, 0.9, bayH - 0.1, 0.06, TRIM);
  // The name over the bay, a lantern either side
  const sw = 3.4;
  const sh = sw * (96 / 512);
  b.add(new THREE.PlaneGeometry(sw, sh).translate(cx, y1 - sh / 2 - 0.12, z1 + 0.012), sign);
  b.box(cx - sw / 2 - 0.05, y1 - sh - 0.16, z1 - 0.02, sw + 0.1, sh + 0.08, 0.03, TRIM);
  b.detail(() => {
    for (const sx of [-1, 1]) {
      const lx = cx + sx * (sw / 2 + 0.35);
      b.box(lx - 0.04, y1 - 0.9, z1, 0.08, 0.08, 0.22, IRON);
      b.box(lx - 0.09, y1 - 1.08, z1 + 0.14, 0.18, 0.22, 0.18, LAMP);
    }
    // Windows in the back and the ends, dark glass
    for (const x of [x0 + 1.2, x1 - 1.2]) b.box(x - 0.45, y0 + 1.2, z0 - 0.03, 0.9, 0.8, 0.04, DARK);
    for (const xx of [x0, x1]) b.box(xx - 0.03, y0 + 1.2, (z0 + z1) / 2 - 0.4, 0.06, 0.8, 0.8, DARK);
    // A pair of oars and a life ring on the front wall
    b.box(x0 + 0.5, y0 + 0.3, z1 + 0.01, 0.06, 1.7, 0.04, PLANK);
    b.box(x0 + 0.68, y0 + 0.3, z1 + 0.01, 0.06, 1.7, 0.04, PLANK);
    b.add(new THREE.TorusGeometry(0.26, 0.06, 6, 14).translate(x1 - 0.7, y0 + 1.5, z1 + 0.05), toon('#e2462f'));
  });
}

function jetty(b: Batch) {
  const { x, half, z0, z1, y } = JETTY;
  const top = SLAB + y;
  b.box(x - half, top - 0.07, z0, half * 2, 0.07, z1 - z0, PLANK);
  // Posts down into the water at its sides
  for (let z = z1 - 0.2; z > z0 + 2.4; z -= 1.3) for (const sx of [-1, 1]) b.box(x + sx * (half + 0.02) - 0.07, SLAB - 0.4, z - 0.07, 0.14, top - SLAB + 0.42, 0.14, POST);
  b.detail(() => {
    // The planks' gaps, across it
    for (let z = z0 + 0.3; z < z1; z += 0.3) b.box(x - half + 0.02, top + 0.002, z, half * 2 - 0.04, 0.004, 0.025, POST);
    // Mooring posts at its end and a lamp
    for (const sx of [-1, 1]) b.box(x + sx * (half - 0.15) - 0.07, top, z1 - 0.25, 0.14, 0.32, 0.14, POST);
    b.box(x + half - 0.18, top, z1 - 0.9, 0.08, 1.6, 0.08, IRON);
    b.box(x + half - 0.24, top + 1.6, z1 - 0.96, 0.2, 0.24, 0.2, LAMP);
    b.box(x + half - 0.27, top + 1.84, z1 - 0.99, 0.26, 0.05, 0.26, IRON);
  });
}

/* ---------- Picnics ---------- */

const BLANKETS = ['#d93a4a', '#2aabee', '#ffd23f', '#8000ff', '#1fbf6b'];
function picnic(b: Batch, p: (typeof PICNICS)[number], i: number) {
  // Gingham: a check of the blanket's colour and white, laid on the lawn, turned
  const [hx, hz] = p.half;
  const n = 4;
  const col = BLANKETS[i % BLANKETS.length];
  for (let a = 0; a < n; a++)
    for (let c = 0; c < n; c++) {
      const w = (2 * hx) / n;
      const d = (2 * hz) / n;
      const g = new THREE.BoxGeometry(w, 0.02, d)
        .translate(-hx + w * (a + 0.5), SLAB + 0.012, -hz + d * (c + 0.5))
        .rotateY(p.ry)
        .translate(p.at[0], 0, p.at[1]);
      b.add(g, toon((a + c) % 2 ? col : '#f4f0e6'));
    }
  // A basket with its handle, a bottle
  const put = (g: THREE.BufferGeometry, x: number, z: number) => g.rotateY(p.ry).translate(p.at[0] + x, 0, p.at[1] + z);
  const [ox, oz] = [Math.cos(p.ry) * 0.3, -Math.sin(p.ry) * 0.3];
  b.add(put(new THREE.BoxGeometry(0.42, 0.24, 0.28).translate(0, SLAB + 0.14, 0), ox, oz), toon('#b07a40'));
  b.add(put(new THREE.TorusGeometry(0.14, 0.02, 4, 10, Math.PI).translate(0, SLAB + 0.26, 0), ox, oz), toon('#8a5a3c'));
  b.add(put(new THREE.CylinderGeometry(0.035, 0.04, 0.24, 6).translate(0, SLAB + 0.14, 0), -ox * 1.6, -oz * 1.6 + 0.15), toon('#2f7a4a'));
}

/* ---------- The sites ---------- */

export function registerParkSites() {
  const sign = boathouseSign();
  site('westlake boathouse', padded(BOATHOUSE.rect, 1.5), (into) => {
    const b = new Batch();
    boathouse(b, sign);
    b.build(into, { cast: true, receive: true });
  });
  site('westlake jetty', [JETTY.x - 2, JETTY.z0 - 0.5, JETTY.x + 2, JETTY.z1 + 0.5], (into) => {
    const b = new Batch();
    jetty(b);
    b.build(into, { cast: true, receive: true });
  });
  PICNICS.forEach((p, i) =>
    site(`westlake picnic ${i}`, [p.at[0] - 2, p.at[1] - 2, p.at[0] + 2, p.at[1] + 2], (into) => {
      const b = new Batch();
      b.lod = 'near';
      picnic(b, p, i);
      b.build(into, { cast: false, receive: true });
    })
  );
}

/* ---------- What moves ---------- */

/** Shapes drawn in plain colours, merged into one geometry coloured per vertex (for an instanced mesh) */
function shape(draw: (b: Batch) => void) {
  const b = new Batch();
  draw(b);
  const g = new THREE.Group();
  b.build(g);
  return (g.children[0] as THREE.Mesh).geometry;
}
/** A boat's hull: its outline from above (+x its bow) walled `wall` thick, `h` tall from just under the water, with a floor */
function hull(outlineAt: (s: THREE.Shape | THREE.Path, inset: number) => void, h: number, wall: number) {
  const s = new THREE.Shape();
  outlineAt(s, 0);
  const hole = new THREE.Path();
  outlineAt(hole, wall);
  s.holes.push(hole);
  // (drawn in x, -z: extruded up after turning it over)
  return new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 6 }).rotateX(-Math.PI / 2).translate(0, -0.08, 0);
}
const rowOutline = (s: THREE.Shape | THREE.Path, i: number) => {
  const { l, w } = HULL.row;
  const [hl, hw] = [l / 2 - i, w / 2 - i];
  s.moveTo(-hl, -hw * 0.82);
  s.lineTo(-0.2, -hw);
  s.quadraticCurveTo(hl * 0.62, -hw * 0.95, hl - i * 0.6, 0);
  s.quadraticCurveTo(hl * 0.62, hw * 0.95, -0.2, hw);
  s.lineTo(-hl, hw * 0.82);
  s.closePath();
};
const swanOutline = (s: THREE.Shape | THREE.Path, i: number) => {
  const { l, w } = HULL.swan;
  s.absellipse(0, 0, l / 2 - i, w / 2 - i, 0, Math.PI * 2, false, 0);
};

export function registerParkLife(scene: THREE.Scene, tick: (f: Tick) => void, low: boolean) {
  const group = new THREE.Group();
  group.name = 'westlake-life';
  scene.add(group);
  const inst = (geo: THREE.BufferGeometry, n: number, mat: THREE.Material, cast = true) => {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
    m.count = n;
    m.castShadow = cast;
    m.receiveShadow = true;
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(m);
    return m;
  };
  // Every shape below is the Batches' one toon material, coloured per vertex (and per instance where it says)
  const vc = paintMat();

  // The rowing boats: the hull (white, coloured per boat), and what's inside (thwarts, the floor, oarlocks)
  const rows = BOATS.filter((b) => b.kind === 'row');
  const swans = BOATS.filter((b) => b.kind === 'swan');
  const rowHull = inst(
    shape((b) => {
      b.add(hull(rowOutline, 0.34, 0.06), WHITE);
      b.add(new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); rowOutline(s, 0.05); return s; })()).rotateX(-Math.PI / 2).translate(0, -0.02, 0), WHITE);
    }),
    rows.length,
    vc
  );
  const rowInside = inst(
    shape((b) => {
      b.add(new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); rowOutline(s, 0.06); return s; })()).rotateX(-Math.PI / 2).translate(0, -0.015, 0), PLANK);
      // The thwarts, each as wide as the hull is inside there
      for (const [x, hw] of [[-0.75, 0.33], [0.05, 0.38], [0.7, 0.28]]) b.box(x - 0.12, 0.12, -hw, 0.24, 0.04, hw * 2, toon('#b08a64'));
      for (const z of [-0.44, 0.44]) b.box(-0.04, 0.26, z - 0.03, 0.08, 0.06, 0.06, IRON);
      // A band of trim round the top (its colour stays)
      b.box(-1.0, 0.24, -0.02, 0.15, 0.02, 0.04, PLANK);
    }),
    rows.length,
    vc
  );
  const swanMesh = inst(
    shape((b) => {
      const W = toon('#f7f5f0');
      b.add(hull(swanOutline, 0.42, 0.07), W);
      b.add(new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); swanOutline(s, 0.06); return s; })()).rotateX(-Math.PI / 2).translate(0, 0.0, 0), toon('#2aabee'));
      b.box(-0.35, 0.12, -0.45, 0.3, 0.06, 0.9, toon('#2aabee'));
      // Wings raised along its sides at the back
      for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(0.9, 0.36, 0.08).translate(-0.35, 0.42, s * 0.52).rotateX(s * -0.25), W);
      // The neck in an S up from the bow, the head, its orange beak and black eyes
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.75, 0.25, 0), new THREE.Vector3(0.95, 0.6, 0), new THREE.Vector3(0.82, 1.0, 0), new THREE.Vector3(0.9, 1.25, 0)]);
      b.add(new THREE.TubeGeometry(curve, 10, 0.08, 6, false), W);
      b.add(new THREE.SphereGeometry(0.13, 8, 6).translate(0.95, 1.3, 0), W);
      b.add(new THREE.ConeGeometry(0.06, 0.2, 6).rotateZ(-Math.PI / 2).translate(1.13, 1.28, 0), toon('#ff8a1a'));
      for (const s of [-1, 1]) b.add(new THREE.SphereGeometry(0.025, 5, 4).translate(1.0, 1.35, s * 0.1), toon('#16121f'));
    }),
    swans.length,
    vc
  );
  // The oars, two a rowing boat on the move: the handle at the origin, out along +z to the blade
  const moving = rows.filter((b) => !b.moored);
  const oars = inst(
    shape((b) => {
      // (pivoting at the oarlock, 0.45 from the handle)
      b.add(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 5).rotateX(Math.PI / 2).translate(0, 0, 0.3), PLANK);
      b.box(-0.01, -0.07, 0.8, 0.02, 0.14, 0.45, toon('#d8c8a8'));
    }),
    moving.length * 2,
    vc,
    false
  );
  // The dogs: coat coloured per dog (white here), dark nose and collar
  const dogsShown = DOGS.filter((d) => !(low && PARK_PEOPLE[d.walker].trim));
  const dogs = inst(
    shape((b) => {
      const C = WHITE;
      b.add(new THREE.CapsuleGeometry(0.085, 0.26, 3, 8).rotateZ(Math.PI / 2).translate(0, 0.29, 0), C);
      b.add(new THREE.SphereGeometry(0.085, 8, 6).translate(0.23, 0.39, 0), C);
      b.box(0.28, 0.33, -0.04, 0.1, 0.07, 0.08, C);
      b.box(0.375, 0.36, -0.018, 0.025, 0.035, 0.036, toon('#16121f'));
      for (const s of [-1, 1]) b.box(0.18, 0.43, s * 0.06 - 0.02, 0.05, 0.08, 0.04, toon('#5b4636'));
      for (const [lx, lz] of [[0.14, 0.05], [0.14, -0.05], [-0.14, 0.05], [-0.14, -0.05]]) b.box(lx - 0.022, 0, lz - 0.022, 0.044, 0.25, 0.044, C);
      b.add(new THREE.CylinderGeometry(0.015, 0.02, 0.18, 4).rotateZ(-0.9).translate(-0.24, 0.38, 0), C);
      b.add(new THREE.TorusGeometry(0.06, 0.015, 4, 8).rotateY(Math.PI / 2).translate(0.17, 0.36, 0), toon('#d93a4a'));
    }),
    dogsShown.length,
    vc
  );
  const c = new THREE.Color();
  rows.forEach((b, i) => rowHull.setColorAt(i, c.set(b.colour)));
  dogsShown.forEach((d, i) => dogs.setColorAt(i, c.set(d.coat)));
  // The leads: a line from each walker's hand to their dog's collar
  const leadPos = new Float32Array(dogsShown.length * 6);
  const leadGeo = new THREE.BufferGeometry();
  leadGeo.setAttribute('position', new THREE.BufferAttribute(leadPos, 3).setUsage(THREE.DynamicDrawUsage));
  const leads = new THREE.LineSegments(leadGeo, new THREE.LineBasicMaterial({ color: '#1b1830' }));
  leads.frustumCulled = false;
  group.add(leads);

  const m4 = new THREE.Matrix4();
  const b4 = new THREE.Matrix4();
  const o4 = new THREE.Matrix4();
  const w4 = new THREE.Matrix4();
  const sv = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const bp = { x: 0, z: 0, yaw: 0 };
  const dp = { x: 0, z: 0, ry: 0, speed: 0 };
  const wm = moment();
  const [px0, pz0, px1, pz1] = WESTLAKE_RECT;
  /** The boats' wakes (the water's shader draws them, wakes.ts): moving round their rings, or at rest at the jetty */
  const wakes: Wake[] = BOATS.map((b) => ({ x: 0, z: 0, yaw: 0, speed: 0, len: HULL[b.kind].l, beam: HULL[b.kind].w }));
  const update = (t: number) => {
    // Bob on the water, a little roll
    const boat = (b: (typeof BOATS)[number], i: number, mesh: THREE.InstancedMesh, k: number) => {
      b.at(t, bp);
      // (its speed from where it was a moment ago)
      const w = wakes[i];
      const [px, pz] = [bp.x, bp.z];
      b.at(t - 0.25, bp);
      Object.assign(w, { speed: b.moored ? 0 : Math.hypot(px - bp.x, pz - bp.z) / 0.25 });
      b.at(t, bp);
      Object.assign(w, { x: bp.x, z: bp.z, yaw: bp.yaw });
      e.set(Math.sin(t * 1.3 + i) * 0.03, bp.yaw, Math.sin(t * 1.1 + i * 2) * 0.02, 'YXZ');
      m4.compose(v.set(bp.x, BOAT_Y + Math.sin(t * 1.6 + i) * 0.015, bp.z), q.setFromEuler(e), one);
      mesh.setMatrixAt(k, m4);
      return m4;
    };
    let oi = 0;
    rows.forEach((b, k) => {
      const at = boat(b, BOATS.indexOf(b), rowHull, k);
      rowInside.setMatrixAt(k, at);
      if (b.moored) return;
      // The oars sweep from the oarlocks: forward and back, the blades dipping as they pull
      const base = b4.copy(at);
      const sweep = Math.sin(t * 2.4 + k) * 0.5;
      const dip = 0.25 + Math.cos(t * 2.4 + k) * 0.18;
      for (const s of [-1, 1]) {
        // Out to its side (+z or, turned round, -z), swept fore and aft, the blade down into the water
        o4.compose(v.set(-0.04, 0.29, s * 0.44), q.setFromEuler(e.set(dip, s * sweep + (s < 0 ? Math.PI : 0), 0, 'YXZ')), one);
        oars.setMatrixAt(oi++, w4.multiplyMatrices(base, o4));
      }
    });
    swans.forEach((b, k) => boat(b, BOATS.indexOf(b), swanMesh, k));
    dogsShown.forEach((d, k) => {
      d.at(t, dp);
      // A trot: a quick bob and a rock fore and aft
      const ph = t * 9 + k;
      e.set(0, dp.ry - Math.PI / 2, Math.sin(ph) * 0.06, 'YXZ');
      m4.compose(v.set(dp.x, SLAB + Math.abs(Math.sin(ph)) * 0.025, dp.z), q.setFromEuler(e), sv.setScalar(d.size));
      dogs.setMatrixAt(k, m4);
      // The lead: from the walker's hand (on their right, at the hip) to the collar
      PARK_PEOPLE[d.walker].at(t, wm);
      const [fx, fz] = [Math.sin(wm.ry), Math.cos(wm.ry)];
      leadPos.set([wm.x - fz * 0.2 + fx * 0.1, SLAB + 0.42, wm.z + fx * 0.2 + fz * 0.1, dp.x + Math.sin(dp.ry) * 0.17 * d.size, SLAB + 0.36 * d.size, dp.z + Math.cos(dp.ry) * 0.17 * d.size], k * 6);
    });
    for (const mesh of [rowHull, rowInside, swanMesh, oars, dogs]) mesh.instanceMatrix.needsUpdate = true;
    setWakes('lake-boats', wakes);
    leadGeo.attributes.position.needsUpdate = true;
  };
  update(0);
  tick(({ t }) => {
    // Only while the camera is near enough to see it (the crowd draws nobody past 170)
    const ex = CROWD_VIEW.eye.x;
    const ez = CROWD_VIEW.eye.z;
    const d = Math.hypot(Math.max(px0 - ex, ex - px1, 0), Math.max(pz0 - ez, ez - pz1, 0));
    group.visible = d < 200;
    if (group.visible) update(t);
    else setWakes('lake-boats', []);
  });
}
