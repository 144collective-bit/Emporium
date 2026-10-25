/*
 * Inside Starlight Mall on screen (docs/mall-plan.md step 2; the numbers are
 * mallinside.ts), in the mall's chunk (mall3d.ts calls `registerInside()`):
 * sites, near only (nothing in here is seen from afar), and on the main thread
 * the escalators' steps running. A modern fit-out, as the outside (the owner's
 * call): pale stone floors, white slabs with timber soffits, black steel.
 *
 * - **The floors:** pale polished stone on both floors, the upper floor's
 *   white slabs with a warm LED line along their edges, timber soffits under
 *   them with slots of light, light panels in the roof.
 * - **The units:** white surrounds, black steel frames, their windows, the
 *   door, a charcoal or white fascia with its made-up name (one sign atlas,
 *   `mall-signs-in`).
 * - **The atrium:** the fountain (a stone basin, a ring of jets), timber
 *   benches, trees in white planters, white columns, glass balustrades with
 *   steel rails round the upper floor, the ring of light hung over the
 *   fountain, the FOOD COURT board, the two kiosks, the glass lift by the
 *   east gallery, STARLIGHT MALL over the doors.
 * - **The escalators:** grey trusses down to the floor, glass sides, black
 *   handrails, steps that run (still under reduced motion).
 * - **The food court:** six stalls along the north wall (timber counter,
 *   kitchen, dark menu boards with no prices, the name on the fascia), tables
 *   and stools.
 * - **Downstairs under the terrace:** a rocket and a car ride, the
 *   information desk, the photo booth, the department stores' doors; the
 *   directory boards in the lobby.
 */
import * as THREE from 'three';
import { Batch, toon } from './kit';
import type { Tick } from './world';
import { site } from './tilework';
import { ANCHORS, HALL, MALL_NAME } from './mall';
import {
  ANCHOR_DOORS,
  BALUSTRADE,
  BENCHES_IN,
  COLUMNS,
  COLUMN_R,
  DIRECTORY,
  ESCALATORS,
  FLOOR_T,
  FOOD_NAMES,
  FOOD_STALLS,
  FOOT_Z,
  FOUNTAIN_IN,
  GROUND_THINGS,
  IN,
  KIOSKS,
  LIFT_SHAFT,
  LOBBY_Z,
  NORTH_Z,
  PALMS_IN,
  RUN,
  STALL_Z,
  TABLES,
  TABLE_R,
  TERRACE_Z,
  UNITS,
  UNIT_D,
  UNIT_NAMES,
  UP,
  VOID,
  type Unit,
} from './mallinside';
import {
  CHARCOAL,
  DARK,
  FLOOR,
  FRONT,
  GLASS,
  GREY,
  LED,
  LIGHT,
  MID,
  PANEL,
  SPRAY,
  STEEL,
  STONE,
  TEAL,
  TIMBER,
  WATER,
  WHITE,
  WOOD,
  Y,
  YELLOW,
  box,
  cyl,
  flat,
  glassX,
  signAtlas,
  stepsMat,
  tree,
} from './mallkit';

/** The inside's signs: the units, the stalls and the rest (fixed made-up words; 32, the atlas's all) */
const LIGHT_IN = new Set([...UNIT_NAMES.filter((_, k) => k % 2), 'PHOTOS', 'KIDS RIDES', ...KIOSKS.map((k) => k.name)]);
const signIn = signAtlas('mall-signs-in', [...UNIT_NAMES, ...FOOD_NAMES, 'FOOD COURT', 'DIRECTORY', 'PHOTOS', 'INFO', 'KIDS RIDES', ...KIOSKS.map((k) => k.name), MALL_NAME, ...ANCHORS.map((a) => a.name)], LIGHT_IN);
const STEPS_UP = stepsMat(1);
const STEPS_DOWN = stepsMat(-1);
/** A few plain colours of the fit-out's own (folded into the shared paint) */
const PALE_GLASS = toon('#c9dbe4');
const MENU = toon('#26282c');
const TIMBER_SLAT = toon('#8f5f33');

const H = HALL.h;
const XM = (IN[0] + IN[2]) / 2;
/** The ceiling (the roof's underside) and the ground floor's (the upper floor's underside) */
const CEIL = Y + H - 0.25;
const LOW_CEIL = Y + UP - FLOOR_T;

/** A ceiling or soffit facing down at y */
function under(b: Batch, x0: number, z0: number, x1: number, z1: number, y: number, mat: THREE.Material) {
  const rep = mat.userData.worldUV as [number, number] | undefined;
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  if (rep) {
    const uv = g.attributes.uv;
    const pos = g.attributes.position;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, pos.getX(k) / rep[0], pos.getZ(k) / rep[1]);
  }
  b.add(g, mat);
}

/* ---------- The floors ---------- */

function floors(b: Batch) {
  // The ground floor, and the upper floor's slabs (the terrace from the north wall, its stalls on it)
  flat(b, IN[0], IN[1], IN[2], IN[3], Y + 0.006, FLOOR, 8);
  const slabs: [number, number, number, number][] = [
    [IN[0], IN[1], IN[2], TERRACE_Z],
    [IN[0] + UNIT_D, TERRACE_Z, VOID[0], LOBBY_Z],
    [VOID[2], TERRACE_Z, IN[2] - UNIT_D, LOBBY_Z],
  ];
  for (const [x0, z0, x1, z1] of slabs) {
    box(b, x0, LOW_CEIL, z0, x1, Y + UP, z1, WHITE);
    flat(b, x0, z0, x1, z1, Y + UP + 0.006, FLOOR, 8);
  }
  // Timber soffits under the galleries and the terrace (a hand in from their edges), slots of light in them
  const soffit = (x0: number, z0: number, x1: number, z1: number) => under(b, x0, z0, x1, z1, LOW_CEIL - 0.006, TIMBER);
  soffit(IN[0] + UNIT_D + 0.3, TERRACE_Z + 0.3, VOID[0] - 0.3, LOBBY_Z - 0.3);
  soffit(VOID[2] + 0.3, TERRACE_Z + 0.3, IN[2] - UNIT_D - 0.3, LOBBY_Z - 0.3);
  soffit(IN[0] + 0.3, STALL_Z + 0.3, IN[2] - 0.3, TERRACE_Z - 0.3);
  const slot = (x0: number, z0: number, x1: number, z1: number, y: number) => b.add(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2), PANEL);
  for (let z = TERRACE_Z + 1.5; z < LOBBY_Z - 1; z += 2.4) {
    slot(IN[0] + UNIT_D + 0.6, z, VOID[0] - 0.6, z + 0.12, LOW_CEIL - 0.012);
    slot(VOID[2] + 0.6, z, IN[2] - UNIT_D - 0.6, z + 0.12, LOW_CEIL - 0.012);
  }
  for (let x = IN[0] + 1.5; x < IN[2] - 1; x += 2.4) slot(x, STALL_Z + 0.8, x + 0.12, TERRACE_Z - 0.8, LOW_CEIL - 0.012);
  // A warm LED line along the slabs' edges over the atrium and the lobby
  const edge = Y + UP - 0.16;
  box(b, VOID[0], edge, TERRACE_Z, VOID[0] + 0.03, edge + 0.05, LOBBY_Z, LED);
  box(b, VOID[2] - 0.03, edge, TERRACE_Z, VOID[2], edge + 0.05, LOBBY_Z, LED);
  box(b, VOID[0], edge, TERRACE_Z, VOID[2], edge + 0.05, TERRACE_Z + 0.03, LED);
  box(b, IN[0] + UNIT_D, edge, LOBBY_Z, VOID[0], edge + 0.05, LOBBY_Z + 0.03, LED);
  box(b, VOID[2], edge, LOBBY_Z, IN[2] - UNIT_D, edge + 0.05, LOBBY_Z + 0.03, LED);
  // Light panels in the roof over the galleries and the terrace, either side of the skylight
  for (let z = TERRACE_Z + 1.5; z < LOBBY_Z - 1; z += 3.5) {
    slot(IN[0] + UNIT_D + 0.8, z, VOID[0] - 0.8, z + 1.4, CEIL - 0.006);
    slot(VOID[2] + 0.8, z, IN[2] - UNIT_D - 0.8, z + 1.4, CEIL - 0.006);
  }
}

/* ---------- The units ---------- */

function unit(b: Batch, u: Unit) {
  const [, z0, , z1] = u.rect;
  const fx = u.face === 1 ? u.rect[2] : u.rect[0];
  const f = u.face;
  const y0 = Y + u.level * UP;
  const top = u.level ? CEIL : LOW_CEIL;
  const zm = (z0 + z1) / 2;
  const pale = u.k % 2 === 1;
  // Its front: white piers beside the window, black steel frames at its ends
  const out = (d: number) => fx + f * d;
  const bx = (d0: number, d1: number, ya: number, yb: number, za: number, zb: number, mat: THREE.Material) => box(b, Math.min(out(d0), out(d1)), ya, za, Math.max(out(d0), out(d1)), yb, zb, mat);
  bx(0, 0.06, y0, top, z0, z0 + 0.35, WHITE);
  bx(0, 0.06, y0, top, z1 - 0.35, z1, WHITE);
  bx(0, 0.1, y0, top - 0.7, z0 + 0.32, z0 + 0.42, STEEL);
  bx(0, 0.1, y0, top - 0.7, z1 - 0.42, z1 - 0.32, STEEL);
  bx(0, 0.1, y0 + 0.08, y0 + 0.14, z0 + 0.42, z1 - 0.42, STEEL);
  glassX(b, fx, f, z0 + 0.42, z1 - 0.42, y0 + 0.14, top - 0.75);
  // The door in the middle, open (warm inside), a steel frame; the fascia with its name, a LED line under it
  bx(0.015, 0.03, y0, top - 0.85, zm - 0.65, zm + 0.65, PALE_GLASS);
  bx(0.03, 0.08, y0, top - 0.8, zm - 0.7, zm - 0.65, STEEL);
  bx(0.03, 0.08, y0, top - 0.8, zm + 0.65, zm + 0.7, STEEL);
  bx(0, 0.12, top - 0.7, top - 0.04, z0 + 0.3, z1 - 0.3, pale ? WHITE : CHARCOAL);
  signIn(b, u.name, out(0.13), top - 0.37, zm, Math.min(3.6, z1 - z0 - 1.2), 0.42, f * (Math.PI / 2));
  bx(0.1, 0.13, top - 0.74, top - 0.71, z0 + 0.4, z1 - 0.4, LED);
}

function units(b: Batch) {
  // The two strips the units are in (both floors), their ends' walls
  for (const x0 of [IN[0], IN[2] - UNIT_D]) box(b, x0, Y, NORTH_Z, x0 + UNIT_D, CEIL, LOBBY_Z, LIGHT);
  for (const u of UNITS) unit(b, u);
}

/* ---------- The atrium ---------- */

/** A glass balustrade along a line (x0, z0) to (x1, z1) on the upper floor, a steel rail along its top, posts */
function balustrade(b: Batch, x0: number, z0: number, x1: number, z1: number) {
  const y = Y + UP;
  const along = x1 - x0 !== 0;
  const len = Math.hypot(x1 - x0, z1 - z0);
  const g = new THREE.PlaneGeometry(len, 0.9);
  if (!along) g.rotateY(Math.PI / 2);
  b.add(g.translate((x0 + x1) / 2, y + 0.5, (z0 + z1) / 2), GLASS);
  if (along) box(b, x0, y + 0.95, z0 - 0.035, x1, y + 1.0, z0 + 0.035, STEEL);
  else box(b, x0 - 0.035, y + 0.95, z0, x0 + 0.035, y + 1.0, z1, STEEL);
  const n = Math.max(1, Math.round(len / 1.6));
  for (let i = 0; i <= n; i++) {
    const [x, z] = [x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n];
    box(b, x - 0.025, y, z - 0.025, x + 0.025, y + 0.96, z + 0.025, STEEL);
  }
}

/** A tree in a round white planter */
function indoorTree(b: Batch, x: number, z: number, s: number) {
  cyl(b, 0.55, 0.6, x, Y, z, WHITE, 18);
  cyl(b, 0.6, 0.05, x, Y + 0.6, z, STEEL, 18);
  b.add(new THREE.CircleGeometry(0.5, 16).rotateX(-Math.PI / 2).translate(x, Y + 0.55, z), STONE);
  tree(b, x, z, Y + 0.55, s);
}

function atrium(b: Batch) {
  // The fountain: a stone basin, its water, a ring of jets round a low dark plinth, a LED line in the rim
  const { x, z, r } = FOUNTAIN_IN;
  cyl(b, r, 0.45, x, Y, z, STONE, 28);
  b.add(new THREE.CircleGeometry(r - 0.2, 28).rotateX(-Math.PI / 2).translate(x, Y + 0.38, z), WATER);
  b.add(new THREE.TorusGeometry(r - 0.02, 0.022, 4, 32).rotateX(Math.PI / 2).translate(x, Y + 0.46, z), LED);
  cyl(b, 0.4, 0.5, x, Y + 0.2, z, CHARCOAL, 16);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    b.add(new THREE.CylinderGeometry(0.012, 0.03, 0.9, 5, 1, true).translate(0, 0.45, 0).rotateZ(0.35).rotateY(-a).translate(x + Math.cos(a) * (r - 0.55), Y + 0.38, z + Math.sin(a) * (r - 0.55)), SPRAY);
  }
  cyl(b, 0.03, 1.1, x, Y + 0.7, z, SPRAY, 6, 0.07);
  // Benches either side of it: timber on steel, a back away from it
  for (const s of BENCHES_IN) {
    const back = s.ry > 0 ? -1 : 1;
    box(b, s.x - 0.24, Y + 0.38, s.z - 1.05, s.x + 0.24, Y + 0.45, s.z + 1.05, WOOD);
    box(b, s.x + back * 0.22 - 0.03, Y + 0.45, s.z - 1.05, s.x + back * 0.22 + 0.03, Y + 0.85, s.z + 1.05, WOOD);
    for (const sd of [-1, 1]) box(b, s.x - 0.2, Y, s.z + sd * 0.9 - 0.04, s.x + 0.2, Y + 0.38, s.z + sd * 0.9 + 0.04, STEEL);
  }
  for (const [px, pz] of PALMS_IN) indoorTree(b, px, pz, 0.85);
  // The columns under the upper floor's edges: white, a steel shoe at the foot
  for (const [cx, cz] of COLUMNS) {
    cyl(b, COLUMN_R, LOW_CEIL - Y, cx, Y, cz, WHITE, 14);
    cyl(b, COLUMN_R + 0.03, 0.12, cx, Y, cz, STEEL, 14);
  }
  // The balustrades round the upper floor's edges (open at the escalators' tops, and at the lift's door)
  const [a, c] = ESCALATORS;
  balustrade(b, VOID[0], TERRACE_Z, VOID[0], LOBBY_Z);
  balustrade(b, VOID[2], TERRACE_Z, VOID[2], LIFT_SHAFT[1]);
  balustrade(b, VOID[2], LIFT_SHAFT[3], VOID[2], LOBBY_Z);
  balustrade(b, VOID[0], TERRACE_Z, a.x0 - BALUSTRADE, TERRACE_Z);
  balustrade(b, c.x1 + BALUSTRADE, TERRACE_Z, VOID[2], TERRACE_Z);
  balustrade(b, IN[0] + UNIT_D, LOBBY_Z, VOID[0], LOBBY_Z);
  balustrade(b, VOID[2], LOBBY_Z, IN[2] - UNIT_D, LOBBY_Z);
  // The ring of light hung over the fountain: a white ring, a warm LED line under it, on steel wires
  const ry = Y + 5.4;
  b.add(new THREE.TorusGeometry(2.4, 0.09, 6, 48).rotateX(Math.PI / 2).translate(x, ry, z), WHITE);
  b.add(new THREE.TorusGeometry(2.4, 0.035, 4, 48).rotateX(Math.PI / 2).translate(x, ry - 0.09, z), LED);
  b.add(new THREE.TorusGeometry(1.5, 0.06, 6, 40).rotateX(Math.PI / 2).translate(x, ry - 0.7, z), WHITE);
  b.add(new THREE.TorusGeometry(1.5, 0.025, 4, 40).rotateX(Math.PI / 2).translate(x, ry - 0.76, z), LED);
  for (let k = 0; k < 4; k++) {
    const t = (k / 4) * Math.PI * 2 + Math.PI / 4;
    box(b, x + Math.cos(t) * 2.4 - 0.01, ry, z + Math.sin(t) * 2.4 - 0.01, x + Math.cos(t) * 2.4 + 0.01, CEIL, z + Math.sin(t) * 2.4 + 0.01, STEEL);
    box(b, x + Math.cos(t) * 1.5 - 0.01, ry - 0.7, z + Math.sin(t) * 1.5 - 0.01, x + Math.cos(t) * 1.5 + 0.01, CEIL, z + Math.sin(t) * 1.5 + 0.01, STEEL);
  }
  // The FOOD COURT board hung over the terrace's edge, both ways: a charcoal panel in a timber frame
  const fy = Y + UP + 2.0;
  box(b, XM - 2.7, fy - 0.55, TERRACE_Z + 0.22, XM + 2.7, fy + 0.55, TERRACE_Z + 0.38, WOOD);
  box(b, XM - 2.55, fy - 0.45, TERRACE_Z + 0.21, XM + 2.55, fy + 0.45, TERRACE_Z + 0.39, CHARCOAL);
  signIn(b, 'FOOD COURT', XM, fy, TERRACE_Z + 0.4, 4.8, 0.85, 0);
  signIn(b, 'FOOD COURT', XM, fy, TERRACE_Z + 0.2, 4.8, 0.85, Math.PI);
  for (const sx of [-2.3, 2.3]) box(b, XM + sx - 0.01, fy + 0.55, TERRACE_Z + 0.29, XM + sx + 0.01, CEIL, TERRACE_Z + 0.31, STEEL);
  // STARLIGHT MALL over the doors, inside, on a timber band; a LED line round the lobby
  box(b, XM - 4.2, Y + 3.85, IN[3] - 0.08, XM + 4.2, Y + 4.95, IN[3], WOOD);
  signIn(b, MALL_NAME, XM, Y + 4.4, IN[3] - 0.09, 7.2, 0.8, Math.PI);
  box(b, IN[0], Y + 5.6, IN[3] - 0.04, IN[2], Y + 5.64, IN[3], LED);
  // The kiosks: a timber counter, a white top, a steel frame and a lit canopy with the name both ways
  for (const k of KIOSKS) {
    const [x0, z0, x1, z1] = k.rect;
    const xm = (x0 + x1) / 2;
    const zm = (z0 + z1) / 2;
    box(b, x0 + 0.1, Y, z0 + 0.1, x1 - 0.1, Y + 1.0, z1 - 0.1, WOOD);
    box(b, x0, Y + 1.0, z0, x1, Y + 1.06, z1, WHITE);
    for (const [px, pz] of [
      [x0 + 0.05, z0 + 0.05],
      [x1 - 0.1, z0 + 0.05],
      [x0 + 0.05, z1 - 0.1],
      [x1 - 0.1, z1 - 0.1],
    ])
      box(b, px, Y + 1.06, pz, px + 0.05, Y + 2.1, pz + 0.05, STEEL);
    box(b, x0 - 0.1, Y + 2.1, z0 - 0.1, x1 + 0.1, Y + 2.4, z1 + 0.1, WHITE);
    for (const s of [1, -1]) signIn(b, k.name, xm, Y + 2.25, s === 1 ? z1 + 0.11 : z0 - 0.11, x1 - x0 - 0.1, 0.26, s === 1 ? 0 : Math.PI);
    box(b, x0 - 0.1, Y + 2.08, z1 + 0.08, x1 + 0.1, Y + 2.1, z1 + 0.1, LED);
    // (what's on the counter: a coffee machine or a rack of shades)
    box(b, xm - 0.35, Y + 1.06, zm - 0.2, xm + 0.15, Y + 1.5, zm + 0.15, k.rect[0] < XM ? STEEL : MID);
  }
  // The glass lift: a steel frame at its corners and floors, glass all round, its car waiting downstairs
  const [lx0, lz0, lx1, lz1] = LIFT_SHAFT;
  for (const [px, pz] of [
    [lx0, lz0],
    [lx1 - 0.08, lz0],
    [lx0, lz1 - 0.08],
    [lx1 - 0.08, lz1 - 0.08],
  ])
    box(b, px, Y, pz, px + 0.08, CEIL, pz + 0.08, STEEL);
  for (const y of [Y + UP - 0.1, Y + UP + 2.6, CEIL - 0.15]) {
    box(b, lx0, y, lz0, lx1, y + 0.1, lz0 + 0.06, STEEL);
    box(b, lx0, y, lz1 - 0.06, lx1, y + 0.1, lz1, STEEL);
    box(b, lx0, y, lz0, lx0 + 0.06, y + 0.1, lz1, STEEL);
    box(b, lx1 - 0.06, y, lz0, lx1, y + 0.1, lz1, STEEL);
  }
  for (const [gx0, gz0, gx1, gz1] of [
    [lx0, lz0 + 0.02, lx1, lz0 + 0.02],
    [lx0, lz1 - 0.02, lx1, lz1 - 0.02],
    [lx0 + 0.02, lz0, lx0 + 0.02, lz1],
    [lx1 - 0.02, lz0, lx1 - 0.02, lz1],
  ]) {
    const along = gz0 === gz1;
    const g = new THREE.PlaneGeometry(along ? gx1 - gx0 : gz1 - gz0, CEIL - Y - 0.1);
    if (!along) g.rotateY(Math.PI / 2);
    b.add(g.translate((gx0 + gx1) / 2, (Y + CEIL) / 2, (gz0 + gz1) / 2), GLASS);
  }
  box(b, lx0 + 0.15, Y + 0.02, lz0 + 0.15, lx1 - 0.15, Y + 0.12, lz1 - 0.15, STEEL);
  box(b, lx0 + 0.15, Y + 2.3, lz0 + 0.15, lx1 - 0.15, Y + 2.45, lz1 - 0.15, WHITE);
  box(b, lx0 + 0.15, Y + 2.28, lz0 + 0.15, lx1 - 0.15, Y + 2.3, lz1 - 0.15, LED);
  for (const pz of [lz0 + 0.15, lz1 - 0.2]) box(b, lx0 + 0.15, Y + 0.12, pz, lx1 - 0.15, Y + 2.28, pz + 0.05, STEEL);
  box(b, lx1 - 0.2, Y + 0.9, lz0 + 0.2, lx1 - 0.15, Y + 0.95, lz1 - 0.2, STEEL);
}

/* ---------- The escalators ---------- */

/** A side profile along the escalator (u north from just past its foot, v up), extruded `w` across at x */
function side(b: Batch, pts: [number, number][], x: number, w: number, mat: THREE.Material) {
  const s = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, v)));
  // (u, v, w) to (x + w, Y + v, z0 - u): turned a quarter round
  b.add(new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }).rotateY(Math.PI / 2).translate(x, Y, FOOT_Z + 0.8), mat);
}

function escalators(b: Batch) {
  const L = FOOT_Z + 0.8 - TERRACE_Z;
  const [u1, u2] = [0.8, 0.8 + RUN];
  /** The step line along it (u: its height) */
  const line = (lift: number): [number, number][] => [
    [0, lift],
    [u1, lift],
    [u2, UP + lift],
    [L, UP + lift],
  ];
  const [a, c] = ESCALATORS;
  // The trusses: from the floor to just over the steps (the one between the two shared), grey panels
  const truss: [number, number][] = [[0, 0], [L, 0], ...line(0.15).reverse()];
  for (const [x0, x1, k] of [
    [a.x0 - BALUSTRADE, a.x0, 0],
    [a.x1, c.x0, 1],
    [c.x1, c.x1 + BALUSTRADE, 2],
  ] as const) {
    side(b, truss, x0, x1 - x0, k === 1 ? LIGHT : GREY);
    // (and the glass over it)
    const glass: [number, number][] = [...line(0.15), ...line(1.0).reverse()];
    side(b, glass, (x0 + x1) / 2 - 0.02, 0.04, GLASS);
  }
  // Closed off under the landing, from the ground floor
  box(b, a.x0 - BALUSTRADE, Y, TERRACE_Z, c.x1 + BALUSTRADE, LOW_CEIL, TERRACE_Z + 0.12, LIGHT);
  for (const e of ESCALATORS) {
    // The steps: a strip along the step line, its texture a step every 0.4 (it runs: `registerInside()`)
    const pts = line(0.01);
    const pos: number[] = [];
    const uv: number[] = [];
    let dist = 0;
    pts.forEach(([u, v], i) => {
      if (i) dist += Math.hypot(u - pts[i - 1][0], v - pts[i - 1][1]);
      for (const x of [e.x0, e.x1]) {
        pos.push(x, Y + v, FOOT_Z + 0.8 - u);
        uv.push(x === e.x0 ? 0 : 1, dist / 0.4);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const idx: number[] = [];
    for (let i = 0; i < pts.length - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    g.setIndex(idx);
    g.computeVertexNormals();
    b.add(g, e.dir === 1 ? STEPS_UP : STEPS_DOWN);
    // The handrails either side, black, over the glass
    for (const hx of [e.x0 + 0.04, e.x1 - 0.04]) {
      const rail = line(1.02);
      for (let i = 0; i < rail.length - 1; i++) {
        const p0 = new THREE.Vector3(hx, Y + rail[i][1], FOOT_Z + 0.8 - rail[i][0]);
        const p1 = new THREE.Vector3(hx, Y + rail[i + 1][1], FOOT_Z + 0.8 - rail[i + 1][0]);
        b.add(new THREE.TubeGeometry(new THREE.LineCurve3(p0, p1), 1, 0.05, 6), DARK);
      }
    }
    // Comb plates at the foot and the top
    box(b, e.x0, Y, FOOT_Z + 0.55, e.x1, Y + 0.03, FOOT_Z + 0.8, STEEL);
    box(b, e.x0, Y + UP, TERRACE_Z - 0.01, e.x1, Y + UP + 0.03, TERRACE_Z + 0.25, STEEL);
  }
}

/* ---------- The food court ---------- */

function foodCourt(b: Batch) {
  const y0 = Y + UP;
  // Over the stalls: the bulkhead to the roof in timber over a charcoal band; under them, the strip's ground-floor face
  box(b, IN[0], y0 + 2.9, IN[1], IN[2], CEIL, STALL_Z, LIGHT);
  box(b, IN[0], Y, IN[1], IN[2], LOW_CEIL, STALL_Z, LIGHT);
  box(b, IN[0], Y + 2.2, STALL_Z, IN[2], Y + 2.24, STALL_Z + 0.03, LED);
  FOOD_STALLS.forEach((s, i) => {
    const { x0, x1 } = s;
    const xm = (x0 + x1) / 2;
    // Partitions, the kitchen's tiled back with its dark menu boards (no prices), the grill and a fridge
    if (i) box(b, x0 - 0.06, y0, IN[1], x0 + 0.06, y0 + 2.9, STALL_Z, WHITE);
    box(b, x0, y0, IN[1], x1, y0 + 2.9, IN[1] + 0.05, i % 2 ? WHITE : LIGHT);
    box(b, xm - 1.4, y0 + 1.6, IN[1] + 0.05, xm + 1.4, y0 + 2.5, IN[1] + 0.1, MENU);
    for (let k = 0; k < 3; k++) {
      box(b, xm - 1.25 + k * 0.88, y0 + 2.22, IN[1] + 0.1, xm - 0.55 + k * 0.88, y0 + 2.38, IN[1] + 0.12, [WOOD, TEAL, YELLOW][k]);
      for (let r = 0; r < 3; r++) box(b, xm - 1.25 + k * 0.88, y0 + 1.75 + r * 0.13, IN[1] + 0.1, xm - 0.75 + k * 0.88, y0 + 1.8 + r * 0.13, IN[1] + 0.12, WHITE);
    }
    box(b, xm - 1.2, y0, IN[1] + 0.15, xm + 0.4, y0 + 0.95, IN[1] + 0.75, GREY);
    box(b, xm + 0.7, y0, IN[1] + 0.15, xm + 1.6, y0 + 1.8, IN[1] + 0.7, STEEL);
    b.add(new THREE.PlaneGeometry(0.75, 1.5).translate(xm + 1.15, y0 + 0.95, IN[1] + 0.705), FRONT);
    // The counter in timber slats, a white top, the fascia over it with the name and a LED line
    box(b, x0 + 0.2, y0, STALL_Z - 0.7, x1 - 0.2, y0 + 1.0, STALL_Z - 0.05, WOOD);
    for (let x = x0 + 0.35; x < x1 - 0.3; x += 0.18) box(b, x, y0 + 0.05, STALL_Z - 0.06, x + 0.1, y0 + 0.95, STALL_Z - 0.03, TIMBER_SLAT);
    box(b, x0 + 0.15, y0 + 1.0, STALL_Z - 0.75, x1 - 0.15, y0 + 1.06, STALL_Z, WHITE);
    box(b, x0, y0 + 2.4, STALL_Z - 0.3, x1, y0 + 2.9, STALL_Z + 0.22, CHARCOAL);
    signIn(b, s.name, xm, y0 + 2.65, STALL_Z + 0.23, Math.min(3.6, x1 - x0 - 0.6), 0.42, 0);
    box(b, x0 + 0.2, y0 + 2.37, STALL_Z + 0.18, x1 - 0.2, y0 + 2.4, STALL_Z + 0.21, LED);
  });
  // Tables: a round white top on a steel pedestal, a timber stool each side
  for (const [x, z] of TABLES) {
    cyl(b, TABLE_R, 0.04, x, y0 + 0.72, z, WHITE, 16);
    cyl(b, 0.05, 0.72, x, y0, z, STEEL, 8);
    cyl(b, 0.25, 0.03, x, y0, z, STEEL, 12);
    for (const sx of [-1, 1]) {
      cyl(b, 0.2, 0.06, x + sx * (TABLE_R + 0.3), y0 + 0.42, z, WOOD, 12);
      cyl(b, 0.035, 0.42, x + sx * (TABLE_R + 0.3), y0, z, STEEL, 6);
    }
  }
}

/* ---------- Downstairs and the lobby ---------- */

function downstairs(b: Batch) {
  for (const t of GROUND_THINGS) {
    const [x0, z0, x1, z1] = t.rect;
    const [xm, zm] = [(x0 + x1) / 2, (z0 + z1) / 2];
    if (t.kind === 'ride') {
      cyl(b, 0.65, 0.25, xm, Y, zm, GREY, 18);
      if (x0 < XM) {
        // A rocket: white, teal nose and fins, a porthole
        cyl(b, 0.3, 1.2, xm, Y + 0.25, zm, WHITE, 14);
        b.add(new THREE.ConeGeometry(0.3, 0.6, 14).translate(xm, Y + 1.75, zm), TEAL);
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2;
          b.add(new THREE.BoxGeometry(0.05, 0.45, 0.32).rotateY(a).translate(xm + Math.cos(a) * 0.36, Y + 0.5, zm - Math.sin(a) * 0.36), TEAL);
        }
        b.add(new THREE.CircleGeometry(0.11, 12).translate(xm, Y + 1.15, zm + 0.302), PALE_GLASS);
      } else {
        // A little car
        box(b, xm - 0.32, Y + 0.3, zm - 0.55, xm + 0.32, Y + 0.7, zm + 0.55, YELLOW);
        box(b, xm - 0.25, Y + 0.7, zm - 0.15, xm + 0.25, Y + 0.95, zm + 0.3, PALE_GLASS);
        for (const [wx, wz] of [
          [-0.34, -0.35],
          [0.34, -0.35],
          [-0.34, 0.35],
          [0.34, 0.35],
        ])
          b.add(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 10).rotateZ(Math.PI / 2).translate(xm + wx, Y + 0.38, zm + wz), DARK);
      }
      // (a coin box beside it, and the sign)
      box(b, x1 - 0.3, Y, z1 - 0.3, x1 - 0.05, Y + 0.9, z1 - 0.05, CHARCOAL);
      if (x0 < XM) signIn(b, 'KIDS RIDES', xm, LOW_CEIL - 0.45, z1 + 0.6, 1.8, 0.45, 0);
    } else if (t.kind === 'desk') {
      // The information desk: a timber-slatted counter, a white top, INFO hung over it both ways
      box(b, x0, Y, z0, x1, Y + 1.0, z1, WOOD);
      box(b, x0 - 0.05, Y + 1.0, z0 - 0.05, x1 + 0.05, Y + 1.05, z1 + 0.05, WHITE);
      box(b, xm - 0.7, LOW_CEIL - 0.75, zm - 0.04, xm + 0.7, LOW_CEIL - 0.25, zm + 0.04, CHARCOAL);
      signIn(b, 'INFO', xm, LOW_CEIL - 0.5, zm + 0.05, 1.3, 0.42, 0);
      signIn(b, 'INFO', xm, LOW_CEIL - 0.5, zm - 0.05, 1.3, 0.42, Math.PI);
    } else {
      // The photo booth: a charcoal box, its grey curtain, PHOTOS on top
      box(b, x0, Y, z0, x1, Y + 2.1, z1, CHARCOAL);
      box(b, xm - 0.35, Y + 0.1, z1, xm + 0.35, Y + 1.8, z1 + 0.04, MID);
      signIn(b, 'PHOTOS', xm, Y + 2.3, z1 - 0.05, 1.3, 0.35, 0);
    }
  }
  // The department stores' doors on the walls under the terrace: a steel frame, windows, the name over them
  ANCHOR_DOORS.forEach((d, k) => {
    const zm = (d.z0 + d.z1) / 2;
    const fx = d.x + d.face * 0.01;
    box(b, Math.min(fx, fx + d.face * 0.1), Y, d.z0 - 0.15, Math.max(fx, fx + d.face * 0.1), Y + 2.75, d.z1 + 0.15, STEEL);
    glassX(b, fx + d.face * 0.1, d.face, d.z0, d.z1, Y, Y + 2.55);
    signIn(b, ANCHORS[k].name, fx + d.face * 0.12, LOW_CEIL - 0.3, zm, Math.min(3.4, d.z1 - d.z0), 0.45, d.face * (Math.PI / 2));
  });
  // The directory boards in the lobby: a map of the floors in pale blocks on charcoal, DIRECTORY over it, both ways
  for (const [x, z] of DIRECTORY) {
    box(b, x - 0.9, Y, z - 0.15, x + 0.9, Y + 2.2, z + 0.15, CHARCOAL);
    for (const s of [-1, 1]) {
      const zf = z + s * 0.151;
      signIn(b, 'DIRECTORY', x, Y + 1.95, zf + s * 0.005, 1.6, 0.36, s === 1 ? 0 : Math.PI);
      for (let r = 0; r < 4; r++)
        for (let q = 0; q < 3; q++) {
          const [bx, by] = [x - 0.6 + q * 0.42, Y + 0.6 + r * 0.3];
          box(b, bx, by, Math.min(zf, zf + s * 0.02), bx + 0.34, by + 0.22, Math.max(zf, zf + s * 0.02), (r * 3 + q) % 5 === 2 ? TEAL : (r + q) % 2 ? LIGHT : WHITE);
        }
    }
  }
  // The lobby's inside: the windows in the south wall either side of the doors (pale glass from in here)
  for (const [x0, x1] of [
    [IN[0] + 2.5, IN[0] + UNIT_D + 3.1],
    [IN[2] - UNIT_D - 3.1, IN[2] - 2.5],
  ])
    for (const [y0, y1] of [
      [Y + 0.4, Y + 2.7],
      [Y + 3.6, Y + 5.6],
    ])
      box(b, x0, y0, IN[3] - 0.03, x1, y1, IN[3], PALE_GLASS);
}

/* ---------- Registering ---------- */

/** The inside's sites (near only) and, on the main thread, the escalators' steps running */
export function registerInside({ tick }: { tick?: (f: Tick) => void }) {
  const build = (draw: (b: Batch) => void) => (into: THREE.Object3D) => {
    const b = new Batch();
    b.detail(() => draw(b));
    b.build(into, { cast: false, receive: true });
  };
  const all: [number, number, number, number] = [IN[0], IN[1], IN[2], IN[3]];
  site('mall inside floors', all, build(floors));
  site('mall inside units', [IN[0], NORTH_Z, IN[2], LOBBY_Z], build(units));
  site('mall inside atrium', [VOID[0] - 4, TERRACE_Z, VOID[2] + 4, IN[3]], build(atrium));
  site('mall inside escalators', [ESCALATORS[0].x0 - 1, TERRACE_Z, ESCALATORS[1].x1 + 1, FOOT_Z + 1], build(escalators));
  site('mall inside food court', [IN[0], IN[1], IN[2], TERRACE_Z], build(foodCourt));
  site('mall inside downstairs', all, build(downstairs));
  // The steps run: up the one, down the other (a step every 0.4, at an escalator's pace)
  tick?.(({ dt }) => {
    STEPS_UP.map!.offset.y = (STEPS_UP.map!.offset.y - dt * 1.2) % 1;
    STEPS_DOWN.map!.offset.y = (STEPS_DOWN.map!.offset.y + dt * 1.2) % 1;
  });
}
