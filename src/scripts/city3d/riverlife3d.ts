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
 *   heeling into their turn;
 * - the river bus (step 4b, riverbus.ts): its two boats (a white hull with
 *   cyan and magenta stripes, a cabin with a band of windows lit at night,
 *   the wheelhouse, an open stern deck), the one you ride held where the
 *   ride has it (`BUS_VIEW`).
 *
 * Each boat is a group of its own (its parts merged per material through a
 * Batch), placed every frame from the clock, the same for everyone; under
 * reduced motion they stand where they are at the start.
 *
 * The river bus's landings are sites (tilework.ts), registered in the site
 * worker too: a pontoon on the water held by two piles, its fenders, rails
 * and lanterns, the gangway down to it from the quay (South Row's from the
 * end of a jetty out to the boardwalk's line), and a RIVER BUS board with the
 * stop's name, both ways, from one small atlas. The boat for hire (step 4c,
 * boat-sim.ts) is moored east of Downtown's landing, a ladder down the quay
 * wall to it and a BOAT HIRE board (`hireBoat()` is its model, for boat.ts
 * too: a white runabout with a cyan stripe, a wooden deck inside its rim, a
 * console with its windscreen and wheel, a bench, the outboard and a flag);
 * it's hidden while you're out in it (`HIRE_VIEW`).
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, lit, moving, neon, paintMat, siteMat, toon } from './kit';
import type { Tick } from './world';
import { CROWD_VIEW } from './character';
import { WATER_Y } from './river';
import { CREW, CRUISE, DINGHIES, DINGHY, crewAt, cruiseAt, dinghyAt } from './riverlife';
import { BUS, GANGWAY, HIRE, LANDING, PONTOON_W, STOPS, type Stop } from './riverbus';
import { BOAT, HIRE_VIEW } from './boat-sim';
import { BUSES, BUS_VIEW, busAt } from './riverroute';
import { site } from './tilework';
import { TINT, onBoat, setMovingLights, type WaterLight } from './waterlights';
import { setWakes, speedTracker, type Wake } from './wakes';

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

/* ---------- The river bus ---------- */

const CYAN = toon('#1fb5d6');
const MAGENTA = toon('#e2197a');
const GREY = toon('#5b5f73');
function busBoat() {
  const b = new Batch();
  const { len, beam, top } = BUS.hull;
  const [h, w] = [len / 2, beam / 2];
  solid(b, len, beam, 1, -0.3, 0.42, WHITE);
  solid(b, len, beam, 1.012, 0.22, 0.32, CYAN);
  solid(b, len, beam, 1.012, 0.08, 0.13, MAGENTA);
  solid(b, len, beam, 0.97, 0.42, 0.44, GREY);
  // The cabin: white below a band of windows, a dark roof overhanging it; the wheelhouse raised at its front
  const [c0, c1] = [-h + 1.1, h - 1.25];
  box(b, c0, 0.44, -w + 0.1, c1, 0.66, w - 0.1, WHITE);
  box(b, c0, 0.66, -w + 0.12, c1, 1.0, w - 0.12, toon('#26304a'));
  for (const e of [-1, 1]) box(b, c0 + 0.15, 0.7, e > 0 ? w - 0.12 : -w + 0.1, c1 - 0.15, 0.96, e > 0 ? w - 0.1 : -w + 0.12, WINDOW);
  box(b, c0 - 0.05, 1.0, -w + 0.06, c1 + 0.08, 1.07, w - 0.06, NAVY);
  box(b, c1 - 0.7, 1.07, -0.42, c1, top - 0.05, 0.42, WHITE);
  box(b, c1 + 0.005, 1.1, -0.36, c1 + 0.02, top - 0.1, 0.36, WINDOW);
  box(b, c1 - 0.75, top - 0.05, -0.47, c1 + 0.05, top, 0.47, NAVY);
  // The open stern deck: a rail round it, a bench
  for (const e of [-1, 1]) box(b, -h + 0.1, 0.44, e * (w - 0.1) - 0.02, c0, 0.82, e * (w - 0.1) + 0.02, INK);
  box(b, -h + 0.08, 0.78, -w + 0.12, -h + 0.12, 0.82, w - 0.12, INK);
  box(b, -h + 0.3, 0.44, -0.5, -h + 0.55, 0.6, 0.5, TEAK);
  // Navigation lights and a mast on the wheelhouse
  box(b, c1 - 0.4, top, -0.02, c1 - 0.36, top + 0.35, 0.02, INK);
  box(b, c1 - 0.42, top + 0.33, -0.03, c1 - 0.34, top + 0.39, 0.03, BULB);
  return group(b);
}

/* ---------- The landings (sites) ---------- */

/** The atlas's rows: RIVER BUS over each stop's name, then BOAT HIRE */
const SIGN_ROWS: [string, string][] = [...STOPS.map((s): [string, string] => ['RIVER BUS', s.name.toUpperCase()]), ['BOAT HIRE', 'TAKE A BOAT']];
/** One small atlas, a row each (`SIGN_ROWS`) */
function landingSigns() {
  const [W, H] = [512, 64 * SIGN_ROWS.length];
  const tex = canvasTex(W, H, (c) => {
    SIGN_ROWS.forEach(([top, name], i) => {
      const y = i * 64;
      c.fillStyle = '#122a3e';
      c.fillRect(0, y, W, 64);
      c.strokeStyle = '#1fb5d6';
      c.lineWidth = 4;
      c.strokeRect(4, y + 4, W - 8, 56);
      // A roundel: the river bus's mark
      c.fillStyle = '#1fb5d6';
      c.beginPath();
      c.arc(40, y + 32, 20, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#122a3e';
      c.fillRect(24, y + 29, 32, 6);
      c.fillStyle = '#f4f2fa';
      c.textBaseline = 'middle';
      c.font = `900 26px ${FONT_DISPLAY}`;
      c.fillText(top, 74, y + 20);
      c.font = `800 22px ${FONT_DISPLAY}`;
      c.fillStyle = '#ffe2a0';
      c.fillText(name, 74, y + 45);
    });
  });
  return siteMat('river-bus-signs', lit(new THREE.MeshBasicMaterial({ map: tex, toneMapped: true }), 0.95, 1.15));
}
/** A board w x h from the atlas's row, its middle at (x, y, z), facing +z (or -z) */
function board(row: number, w: number, h: number, x: number, y: number, z: number, toward: 1 | -1) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const [v0, v1] = [1 - (row + 1) / SIGN_ROWS.length, 1 - row / SIGN_ROWS.length];
  for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) > 0.5 ? v1 - 0.004 : v0 + 0.004);
  return (toward > 0 ? g : g.rotateY(Math.PI)).translate(x, y, z);
}
/** A sloping plank from (x, y0, z0) to (x, y1, z1), w wide and t thick (its top face along the line) */
function slope(b: Batch, x: number, y0: number, z0: number, y1: number, z1: number, w: number, t: number, mat: THREE.Material) {
  const len = Math.hypot(z1 - z0, y1 - y0);
  const g = new THREE.BoxGeometry(w, t, len).translate(0, -t / 2, 0);
  g.rotateX(-Math.atan2(y1 - y0, z1 - z0));
  b.add(g.translate(x, (y0 + y1) / 2, (z0 + z1) / 2), mat);
}
const FLOAT = toon('#2c2f40');
const RAIL = toon('#c9c4e6');
function landing(b: Batch, s: Stop, row: number, sign: THREE.Material) {
  // k: towards the water from the quay
  const k = s.bank === 'north' ? 1 : -1;
  const [x0, , x1] = s.landing;
  const edge = k > 0 ? s.landing[3] : s.landing[1];
  const inner = edge - k * PONTOON_W;
  const head = edge - k * LANDING.out;
  const top = WATER_Y + 0.32;
  const [za, zb] = [Math.min(inner, edge), Math.max(inner, edge)];
  // The pontoon: its float and deck
  box(b, x0, WATER_Y - 0.25, za, x1, top - 0.05, zb, FLOAT);
  box(b, x0 + 0.04, top - 0.05, za + 0.04, x1 - 0.04, top, zb - 0.04, TEAK);
  // The piles that hold it, at its ends
  for (const x of [x0 - 0.22, x1 + 0.22]) b.add(new THREE.CylinderGeometry(0.16, 0.16, s.y + 1.4 - (WATER_Y - 0.6), 10, 1, true).translate(x, (s.y + 1.4 + WATER_Y - 0.6) / 2, (za + zb) / 2), FLOAT);
  for (const x of [x0 - 0.22, x1 + 0.22]) b.add(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 10).translate(x, s.y + 1.44, (za + zb) / 2), CYAN);
  // The gangway down from the quay (or the jetty's end) onto it, its handrails
  const foot = inner + k * (GANGWAY.out - LANDING.out + PONTOON_W);
  slope(b, s.door.x, s.y + 0.04, head, top + 0.04, foot, GANGWAY.half * 2, 0.06, TEAK);
  for (const e of [-1, 1]) {
    const x = s.door.x + e * (GANGWAY.half - 0.03);
    slope(b, x, s.y + 0.62, head, top + 0.62, foot, 0.05, 0.05, RAIL);
    for (const [y, z] of [[s.y, head], [top, foot]] as const) box(b, x - 0.025, y, z - 0.025, x + 0.025, y + 0.62, z + 0.025, RAIL);
  }
  // South Row's jetty out to the boardwalk's line, railed both sides
  if (Math.abs(head - s.quay) > 0.1) {
    const [ja, jb] = [Math.min(head, s.quay), Math.max(head, s.quay)];
    const [xa, xb] = [s.door.x - GANGWAY.half - 0.15, s.door.x + GANGWAY.half + 0.15];
    box(b, xa, s.y - 0.12, ja, xb, s.y + 0.03, jb, TEAK);
    for (const x of [xa + 0.1, xb - 0.1]) b.add(new THREE.CylinderGeometry(0.07, 0.07, s.y - WATER_Y + 0.3, 6, 1, true).translate(x, (s.y + WATER_Y - 0.3) / 2, (ja + jb) / 2), FLOAT);
    for (const x of [xa, xb]) {
      box(b, x - 0.025, s.y + 0.55, ja, x + 0.025, s.y + 0.6, jb, RAIL);
      for (let z = ja; z <= jb + 0.01; z += (jb - ja) / 2) box(b, x - 0.025, s.y + 0.03, z - 0.025, x + 0.025, s.y + 0.6, z + 0.025, RAIL);
    }
  }
  // The pontoon's rails: along its quay side (open at the gangway's foot) and its ends; the boat side is open
  const railY = top + 0.55;
  const zq = inner + k * 0.05;
  for (const [a, c] of [[x0 + 0.05, s.door.x - GANGWAY.half - 0.05], [s.door.x + GANGWAY.half + 0.05, x1 - 0.05]]) {
    box(b, a, railY, zq - 0.025, c, railY + 0.05, zq + 0.025, RAIL);
    for (let x = a; x <= c + 0.01; x += (c - a) / Math.max(1, Math.round((c - a) / 1.2))) box(b, x - 0.025, top, zq - 0.025, x + 0.025, railY, zq + 0.025, RAIL);
  }
  for (const x of [x0 + 0.05, x1 - 0.05]) {
    box(b, x - 0.025, railY, za + 0.05, x + 0.025, railY + 0.05, zb - 0.05, RAIL);
    for (const z of [za + 0.075, zb - 0.075]) box(b, x - 0.025, top, z - 0.025, x + 0.025, railY, z + 0.025, RAIL);
  }
  b.detail(() => {
    // Fenders along the boat side
    for (let x = x0 + 0.5; x < x1 - 0.3; x += 1.0) b.add(new THREE.CylinderGeometry(0.09, 0.09, 0.32, 8).translate(x, top - 0.18, edge + k * 0.06), INK);
    // Lanterns at its ends, on posts
    for (const x of [x0 + 0.3, x1 - 0.3]) {
      box(b, x - 0.04, top, edge - k * 0.3 - 0.04, x + 0.04, top + 1.1, edge - k * 0.3 + 0.04, INK);
      box(b, x - 0.08, top + 1.1, edge - k * 0.3 - 0.08, x + 0.08, top + 1.26, edge - k * 0.3 + 0.08, BULB);
    }
  });
  // The RIVER BUS board on a post at the gangway's head, on the quay, facing the walk (and the river)
  const bx = s.door.x + GANGWAY.half + 0.75;
  const bz = s.quay - k * 0.3;
  box(b, bx - 0.05, s.y, bz - 0.05, bx + 0.05, s.y + 1.6, bz + 0.05, INK);
  box(b, bx - 0.68, s.y + 1.55, bz - 0.04, bx + 0.68, s.y + 1.95, bz + 0.04, toon('#122a3e'));
  b.add(board(row, 1.28, 0.32, bx, s.y + 1.75, bz - k * 0.045, -k as 1 | -1), sign);
  b.add(board(row, 1.28, 0.32, bx, s.y + 1.75, bz + k * 0.045, k as 1 | -1), sign);
}

/* ---------- The boat for hire ---------- */

/** The hull's plan with a hole: its rim (the gunwale) round the open cockpit */
function rim(len: number, beam: number, y0: number, y1: number) {
  const outer = plan(len, beam, 1);
  outer.holes.push(new THREE.Path(plan(len - 0.3, beam - 0.2, 1).getPoints(8).reverse()));
  return new THREE.ExtrudeGeometry(outer, { depth: y1 - y0, bevelEnabled: false, curveSegments: 6 }).rotateX(-Math.PI / 2).translate(0, y0, 0);
}
/** The hire boat: its model (bow +x, the waterline at 0), where the driver's hips go and the wheel's middle */
export function hireBoat() {
  const b = new Batch();
  const { len, beam } = BOAT;
  const h = len / 2;
  solid(b, len, beam, 1, -0.22, 0.3, WHITE);
  solid(b, len, beam, 1.012, 0.16, 0.23, CYAN);
  solid(b, len - 0.3, beam - 0.2, 1, 0.3, 0.32, TEAK);
  b.add(rim(len, beam, 0.3, 0.46), WHITE);
  // The console with its windscreen, the wheel on its face; the bench behind it
  box(b, 0.2, 0.32, -0.3, 0.55, 0.72, 0.3, WHITE);
  const screen = new THREE.PlaneGeometry(0.62, 0.26).rotateY(-Math.PI / 2).rotateZ(-0.5).translate(0.6, 0.83, 0);
  b.add(screen, toon('#26304a'));
  b.add(new THREE.TorusGeometry(0.11, 0.018, 6, 14).rotateY(Math.PI / 2).rotateZ(0.5).translate(0.14, 0.74, 0), INK);
  box(b, -0.5, 0.32, -0.42, -0.12, 0.5, 0.42, toon('#c03a3a'));
  box(b, -0.52, 0.5, -0.42, -0.44, 0.66, 0.42, toon('#c03a3a'));
  // The outboard on the transom, its leg down into the water
  box(b, -h - 0.28, 0.28, -0.16, -h + 0.02, 0.72, 0.16, toon('#2c2f40'));
  box(b, -h - 0.2, -0.32, -0.05, -h - 0.08, 0.3, 0.05, toon('#2c2f40'));
  box(b, -h - 0.26, 0.6, -0.17, -h + 0.03, 0.66, 0.17, CYAN);
  // A flag at the stern, a light on the bow
  box(b, -h + 0.18, 0.46, 0.38, -h + 0.21, 1.1, 0.41, INK);
  box(b, -h - 0.2, 0.86, 0.39, -h + 0.19, 1.08, 0.4, toon('#1fb5d6'));
  box(b, h - 0.35, 0.46, -0.03, h - 0.29, 0.52, 0.03, BULB);
  return { group: group(b), seat: new THREE.Vector3(-0.3, 0.5, 0), wheel: new THREE.Vector3(0.14, 0.74, 0) };
}
/** Its ladder down the quay wall and its board */
function hireBerth(b: Batch, sign: THREE.Material) {
  const { x } = HIRE.door;
  const q = HIRE.z - BOAT.beam / 2 - 0.3;
  for (const e of [-1, 1]) box(b, x + e * HIRE.ladder - 0.03, WATER_Y - 0.2, q + 0.02, x + e * HIRE.ladder + 0.03, 0.75, q + 0.08, RAIL);
  for (let y = WATER_Y + 0.1; y < 0; y += 0.3) box(b, x - HIRE.ladder, y, q + 0.03, x + HIRE.ladder, y + 0.04, q + 0.07, RAIL);
  const bx = x + HIRE.ladder + 0.75;
  const bz = q - 0.3;
  box(b, bx - 0.05, 0.05, bz - 0.05, bx + 0.05, 1.65, bz + 0.05, INK);
  box(b, bx - 0.68, 1.6, bz - 0.04, bx + 0.68, 2.0, bz + 0.04, toon('#122a3e'));
  const row = SIGN_ROWS.length - 1;
  b.add(board(row, 1.28, 0.32, bx, 1.8, bz - 0.045, -1), sign);
  b.add(board(row, 1.28, 0.32, bx, 1.8, bz + 0.045, 1), sign);
}

/* ---------- Building it ---------- */

export function register({ scene, tick, low }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  const sign = landingSigns();
  STOPS.forEach((s, i) =>
    site(`river bus ${s.id}`, [s.landing[0] - 2, Math.min(s.landing[1], s.quay) - 2, s.landing[2] + 2, Math.max(s.landing[3], s.quay) + 2], (into) => {
      const b = new Batch();
      landing(b, s, i, sign);
      b.build(into, { cast: true, receive: true });
    })
  );
  site('river bus hire', [HIRE.x - 4, HIRE.door.z - 2, HIRE.x + 4, HIRE.z + 2], (into) => {
    const b = new Batch();
    hireBerth(b, sign);
    b.build(into, { cast: true, receive: true });
  });
  if (!scene || !tick) return;
  const root = new THREE.Group();
  root.name = 'river-life';
  scene.add(root);
  const cruise = cruiseBoat();
  const crew = crewBoat();
  const dinghies = DINGHIES.map((d) => dinghy(d.sail));
  const buses = Array.from({ length: BUSES }, busBoat);
  // The boat for hire at its mooring (hidden while you're out in it: boat.ts draws that one)
  const hire = hireBoat().group;
  root.add(cruise, crew, ...dinghies, ...buses, hire);
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
  const lights: WaterLight[] = [];
  /** Their wakes (the water's shader draws them, wakes.ts), each boat's speed from where it was */
  const wakes: Wake[] = [];
  const speed = speedTracker();
  const wake = (id: string, p: { x: number; z: number; yaw: number }, h: { len: number; beam: number }, t: number) =>
    wakes.push({ x: p.x, z: p.z, yaw: p.yaw, speed: speed(id, p.x, p.z, t), len: h.len, beam: h.beam });
  tick(() => {
    const t = reduced ? t0 : Date.now() / 1000;
    // (only while the camera's near the river: nothing out there is seen from far off anyway)
    const e = CROWD_VIEW.eye;
    root.visible = e.z > 71 - 220 && e.z < 131 + 220;
    lights.length = 0;
    wakes.length = 0;
    setMovingLights('river-boats', lights);
    setWakes('river-boats', wakes);
    if (!root.visible) return;
    const cp = cruiseAt(t);
    const rp = crewAt(t);
    place(cruise, cp, t);
    place(crew, rp, t);
    wake('cruise', cp, CRUISE.hull, t);
    wake('crew', rp, CREW.hull, t);
    // (the cruise boat's lit windows and the river buses' show in the water: reflections.ts)
    for (const u of [-1.6, 0, 1.6]) lights.push(onBoat(cp.x, cp.z, cp.yaw, u, 1.0, TINT.warm, 0.3));
    buses.forEach((g, i) => {
      const bp = i === 0 && BUS_VIEW.ride ? BUS_VIEW.ride : busAt(i, t + BUS_VIEW.offset);
      place(g, bp, t);
      for (const u of [-1.2, 1.2]) lights.push(onBoat(bp.x, bp.z, bp.yaw, u, 0.9, TINT.warm, 0.28));
      wake(`bus${i}`, bp, BUS.hull, t);
    });
    hire.visible = !HIRE_VIEW.out;
    if (hire.visible) {
      place(hire, HIRE, t);
      wakes.push({ x: HIRE.x, z: HIRE.z, yaw: HIRE.yaw, speed: 0, len: BOAT.len, beam: BOAT.beam });
    }
    dinghies.forEach((g, i) => {
      const d = dinghyAt(i, t);
      // (heeling to the outside of its turn, away from the wind)
      place(g, d, t, d.heel * -DINGHIES[i].way);
      if (g.visible) wake(`dinghy${i}`, d, DINGHY, t);
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
