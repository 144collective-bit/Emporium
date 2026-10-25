/*
 * Inside Starlight Mall on screen (docs/mall-plan.md step 2; the numbers are
 * mallinside.ts), in the mall's chunk (mall3d.ts calls `registerInside()`):
 * sites, near only (nothing in here is seen from afar), and on the main thread
 * the escalators' steps running.
 *
 * - **The floors:** terrazzo with 80s confetti on both floors, the upper floor's
 *   slabs with neon along their edges and light panels under them.
 * - **The units:** a pastel front each, a chrome frame, its windows, the door,
 *   a fascia with its made-up name (one sign atlas, `mall-signs-in`).
 * - **The atrium:** the fountain, benches, palms, chrome columns, glass
 *   balustrades round the upper floor, neon stars hung from the roof, the
 *   FOOD COURT board, STARLIGHT MALL over the doors.
 * - **The escalators:** pastel trusses down to the floor, glass sides, black
 *   handrails, steps that run (still under reduced motion).
 * - **The food court:** six stalls along the north wall (counter, kitchen,
 *   menu boards with no prices, the name on the fascia), tables and stools.
 * - **Downstairs under the terrace:** a rocket and a car ride, the
 *   information desk, the photo booth, the department stores' doors; the
 *   directory boards in the lobby.
 */
import * as THREE from 'three';
import { Batch } from './kit';
import type { Tick } from './world';
import { site } from './tilework';
import { ANCHORS, HALL, MALL_NAME, PASTELS } from './mall';
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
  CHROME,
  CYAN_NEON,
  DARK,
  GLASS,
  INK,
  LILAC,
  NAVY,
  NEONS,
  PANEL,
  PEACH,
  PINK_NEON,
  POT,
  PURPLE_NEON,
  SPRAY,
  TEAL,
  TERRAZZO,
  WATER,
  WHITE,
  WOOD,
  Y,
  YELLOW,
  YELLOW_NEON,
  box,
  cyl,
  flat,
  glassX,
  palm,
  sign,
  signAtlas,
  stepsMat,
  wallOf,
} from './mallkit';

/** The inside's signs: the units, the stalls and the rest (fixed made-up words) */
const signIn = signAtlas('mall-signs-in', [...UNIT_NAMES, ...FOOD_NAMES, 'FOOD COURT', 'DIRECTORY', 'PHOTOS', 'INFO', 'KIDS RIDES']);
const STEPS_UP = stepsMat(1);
const STEPS_DOWN = stepsMat(-1);

const H = HALL.h;
const XM = (IN[0] + IN[2]) / 2;
/** The ceiling (the roof's underside) and the ground floor's (the upper floor's underside) */
const CEIL = Y + H - 0.25;
const LOW_CEIL = Y + UP - FLOOR_T;

/* ---------- The floors ---------- */

function floors(b: Batch) {
  // The ground floor, and the upper floor's slabs (the terrace from the north wall, its stalls on it)
  flat(b, IN[0], IN[1], IN[2], IN[3], Y + 0.006, TERRAZZO, 8);
  const slabs: [number, number, number, number][] = [
    [IN[0], IN[1], IN[2], TERRACE_Z],
    [IN[0] + UNIT_D, TERRACE_Z, VOID[0], LOBBY_Z],
    [VOID[2], TERRACE_Z, IN[2] - UNIT_D, LOBBY_Z],
  ];
  for (const [x0, z0, x1, z1] of slabs) {
    box(b, x0, LOW_CEIL, z0, x1, Y + UP, z1, WHITE);
    flat(b, x0, z0, x1, z1, Y + UP + 0.006, TERRAZZO, 8);
  }
  // Neon along the upper floor's edges over the atrium and the lobby, and light panels under it
  box(b, VOID[0], Y + UP - 0.2, TERRACE_Z, VOID[0] + 0.05, Y + UP - 0.1, LOBBY_Z, PINK_NEON);
  box(b, VOID[2] - 0.05, Y + UP - 0.2, TERRACE_Z, VOID[2], Y + UP - 0.1, LOBBY_Z, PINK_NEON);
  box(b, VOID[0], Y + UP - 0.2, TERRACE_Z, VOID[2], Y + UP - 0.1, TERRACE_Z + 0.05, CYAN_NEON);
  box(b, IN[0] + UNIT_D, Y + UP - 0.2, LOBBY_Z, VOID[0], Y + UP - 0.1, LOBBY_Z + 0.05, CYAN_NEON);
  box(b, VOID[2], Y + UP - 0.2, LOBBY_Z, IN[2] - UNIT_D, Y + UP - 0.1, LOBBY_Z + 0.05, CYAN_NEON);
  const panel = (x0: number, z0: number, x1: number, z1: number, y: number) => b.add(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(Math.PI / 2).translate((x0 + x1) / 2, y - 0.006, (z0 + z1) / 2), PANEL);
  for (let z = TERRACE_Z + 1.5; z < LOBBY_Z - 1; z += 3.5) {
    panel(IN[0] + UNIT_D + 0.8, z, VOID[0] - 0.8, z + 1.4, LOW_CEIL);
    panel(VOID[2] + 0.8, z, IN[2] - UNIT_D - 0.8, z + 1.4, LOW_CEIL);
  }
  for (let x = IN[0] + 2; x < IN[2] - 2; x += 4.5) panel(x, STALL_Z + 1.2, x + 2.4, TERRACE_Z - 1.2, LOW_CEIL);
  // (and in the roof over the galleries and the terrace, either side of the skylight)
  for (let z = TERRACE_Z + 1.5; z < LOBBY_Z - 1; z += 3.5) {
    panel(IN[0] + UNIT_D + 0.8, z, VOID[0] - 0.8, z + 1.4, CEIL);
    panel(VOID[2] + 0.8, z, IN[2] - UNIT_D - 0.8, z + 1.4, CEIL);
  }
}

/* ---------- The units ---------- */

function unit(b: Batch, u: Unit) {
  const [, z0, , z1] = u.rect;
  const fx = u.face === 1 ? u.rect[2] : u.rect[0];
  const f = u.face;
  const y0 = Y + u.level * UP;
  const top = u.level ? CEIL : LOW_CEIL;
  const wall = wallOf(PASTELS[u.k % PASTELS.length]);
  const zm = (z0 + z1) / 2;
  // Its front: pastel beside the window, chrome posts at its ends
  const out = (d: number) => fx + f * d;
  const bx = (d0: number, d1: number, ya: number, yb: number, za: number, zb: number, mat: THREE.Material) => box(b, Math.min(out(d0), out(d1)), ya, za, Math.max(out(d0), out(d1)), yb, zb, mat);
  bx(0, 0.04, y0, top, z0, z0 + 0.35, wall);
  bx(0, 0.04, y0, top, z1 - 0.35, z1, wall);
  bx(0, 0.1, y0, top, z0 + 0.3, z0 + 0.42, CHROME);
  bx(0, 0.1, y0, top, z1 - 0.42, z1 - 0.3, CHROME);
  glassX(b, fx, f, z0 + 0.42, z1 - 0.42, y0 + 0.1, top - 0.75);
  // The door in the middle, open (dark inside), and the fascia with its name and a neon line under it
  bx(0.015, 0.03, y0, top - 0.85, zm - 0.65, zm + 0.65, DARK);
  bx(0, 0.14, top - 0.62, top - 0.04, z0 + 0.3, z1 - 0.3, NAVY);
  signIn(b, u.name, out(0.15), top - 0.33, zm, Math.min(3.8, z1 - z0 - 1), 0.45, f * (Math.PI / 2));
  bx(0.12, 0.16, top - 0.7, top - 0.65, z0 + 0.4, z1 - 0.4, NEONS[u.k % NEONS.length]);
}

function units(b: Batch) {
  // The two strips the units are in (both floors), their ends' walls
  for (const x0 of [IN[0], IN[2] - UNIT_D]) box(b, x0, Y, NORTH_Z, x0 + UNIT_D, CEIL, LOBBY_Z, LILAC);
  for (const u of UNITS) unit(b, u);
}

/* ---------- The atrium ---------- */

function star(b: Batch, x: number, y: number, z: number, r: number, mat: THREE.Material, ry = 0) {
  const s = new THREE.Shape();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + Math.PI / 2;
    const q = k % 2 ? r * 0.42 : r;
    if (k) s.lineTo(Math.cos(a) * q, Math.sin(a) * q);
    else s.moveTo(Math.cos(a) * q, Math.sin(a) * q);
  }
  b.add(new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false }).translate(0, 0, -0.06).rotateY(ry).translate(x, y, z), mat);
  // (hung from the roof)
  box(b, x - 0.015, y + r * 0.9, z - 0.015, x + 0.015, CEIL, z + 0.015, CHROME);
}

/** A glass balustrade along a line (x0, z0) to (x1, z1) on the upper floor, a chrome rail along its top, posts */
function balustrade(b: Batch, x0: number, z0: number, x1: number, z1: number) {
  const y = Y + UP;
  const along = x1 - x0 !== 0;
  const len = Math.hypot(x1 - x0, z1 - z0);
  const g = new THREE.PlaneGeometry(len, 0.9);
  if (!along) g.rotateY(Math.PI / 2);
  b.add(g.translate((x0 + x1) / 2, y + 0.5, (z0 + z1) / 2), GLASS);
  if (along) box(b, x0, y + 0.95, z0 - 0.04, x1, y + 1.02, z0 + 0.04, CHROME);
  else box(b, x0 - 0.04, y + 0.95, z0, x0 + 0.04, y + 1.02, z1, CHROME);
  const n = Math.max(1, Math.round(len / 1.6));
  for (let i = 0; i <= n; i++) {
    const [x, z] = [x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n];
    box(b, x - 0.03, y, z - 0.03, x + 0.03, y + 0.98, z + 0.03, CHROME);
  }
}

function atrium(b: Batch) {
  // The fountain: a pastel basin, its water, a column with a bowl and a spray, a neon ring
  const { x, z, r } = FOUNTAIN_IN;
  cyl(b, r, 0.55, x, Y, z, wallOf('#ff9ec7'), 28);
  b.add(new THREE.TorusGeometry(r, 0.04, 4, 32).rotateX(Math.PI / 2).translate(x, Y + 0.57, z), CYAN_NEON);
  b.add(new THREE.CircleGeometry(r - 0.22, 28).rotateX(-Math.PI / 2).translate(x, Y + 0.48, z), WATER);
  cyl(b, 0.18, 1.2, x, Y + 0.4, z, WHITE, 10);
  cyl(b, 0.75, 0.16, x, Y + 1.5, z, TEAL, 18, 0.26);
  b.add(new THREE.CircleGeometry(0.66, 18).rotateX(-Math.PI / 2).translate(x, Y + 1.65, z), WATER);
  b.add(new THREE.ConeGeometry(0.6, 0.7, 12, 1, true).rotateX(Math.PI).translate(x, Y + 2.35, z), SPRAY);
  cyl(b, 0.04, 1.0, x, Y + 1.66, z, SPRAY, 6, 0.08);
  // Benches either side of it, their backs away from it
  for (const s of BENCHES_IN) {
    const back = s.ry > 0 ? -1 : 1;
    box(b, s.x - 0.22, Y + 0.38, s.z - 1.05, s.x + 0.22, Y + 0.45, s.z + 1.05, WOOD);
    box(b, s.x + back * 0.2 - 0.03, Y + 0.45, s.z - 1.05, s.x + back * 0.2 + 0.03, Y + 0.9, s.z + 1.05, wallOf('#7fe0d0'));
    for (const sd of [-1, 1]) box(b, s.x - 0.18, Y, s.z + sd * 0.9 - 0.04, s.x + 0.18, Y + 0.38, s.z + sd * 0.9 + 0.04, CHROME);
  }
  for (const [px, pz] of PALMS_IN) palm(b, px, pz, Y, 0.78);
  // The columns under the upper floor's edges: chrome, a pastel collar
  for (const [cx, cz] of COLUMNS) {
    cyl(b, COLUMN_R, LOW_CEIL - Y, cx, Y, cz, CHROME, 12);
    cyl(b, COLUMN_R + 0.06, 0.25, cx, Y + 0.8, cz, wallOf('#c7a6ff'), 12);
  }
  // The balustrades round the upper floor's edges (open at the escalators' tops)
  const [a, c] = ESCALATORS;
  balustrade(b, VOID[0], TERRACE_Z, VOID[0], LOBBY_Z);
  balustrade(b, VOID[2], TERRACE_Z, VOID[2], LOBBY_Z);
  balustrade(b, VOID[0], TERRACE_Z, a.x0 - BALUSTRADE, TERRACE_Z);
  balustrade(b, c.x1 + BALUSTRADE, TERRACE_Z, VOID[2], TERRACE_Z);
  balustrade(b, IN[0] + UNIT_D, LOBBY_Z, VOID[0], LOBBY_Z);
  balustrade(b, VOID[2], LOBBY_Z, IN[2] - UNIT_D, LOBBY_Z);
  // Neon stars hung over the atrium, the big one over the fountain
  star(b, x, Y + 4.7, z, 1.1, YELLOW_NEON);
  star(b, VOID[0] + 2.4, Y + 5.2, FOOT_Z + 1.5, 0.55, PINK_NEON, 0.6);
  star(b, VOID[2] - 2.4, Y + 5.0, FOOT_Z + 3.5, 0.55, CYAN_NEON, -0.5);
  star(b, VOID[0] + 2.2, Y + 4.9, LOBBY_Z - 2.5, 0.45, PURPLE_NEON, 0.3);
  star(b, VOID[2] - 2.2, Y + 5.3, LOBBY_Z - 3, 0.45, PINK_NEON, -0.2);
  // The FOOD COURT board hung over the terrace's edge, both ways
  const fy = Y + UP + 2.0;
  box(b, XM - 2.6, fy - 0.5, TERRACE_Z + 0.25, XM + 2.6, fy + 0.5, TERRACE_Z + 0.35, INK);
  signIn(b, 'FOOD COURT', XM, fy, TERRACE_Z + 0.36, 4.8, 0.9, 0);
  signIn(b, 'FOOD COURT', XM, fy, TERRACE_Z + 0.24, 4.8, 0.9, Math.PI);
  for (const sx of [-2.3, 2.3]) box(b, XM + sx - 0.015, fy + 0.5, TERRACE_Z + 0.285, XM + sx + 0.015, CEIL, TERRACE_Z + 0.315, CHROME);
  // STARLIGHT MALL over the doors, inside, and a neon line round the lobby
  box(b, XM - 3.8, Y + 3.9, IN[3] - 0.08, XM + 3.8, Y + 4.9, IN[3], INK);
  sign(b, MALL_NAME, XM, Y + 4.4, IN[3] - 0.09, 7.2, 0.8, Math.PI);
  box(b, IN[0], Y + 5.6, IN[3] - 0.06, IN[2], Y + 5.68, IN[3], PINK_NEON);
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
  // The trusses: from the floor to just over the steps (the one between the two shared), pastel
  const truss: [number, number][] = [[0, 0], [L, 0], ...line(0.15).reverse()];
  for (const [x0, x1, k] of [
    [a.x0 - BALUSTRADE, a.x0, 0],
    [a.x1, c.x0, 1],
    [c.x1, c.x1 + BALUSTRADE, 2],
  ] as const) {
    side(b, truss, x0, x1 - x0, wallOf(k === 1 ? '#c7a6ff' : '#ff9ec7'));
    // (and the glass over it, a neon line along its foot)
    const glass: [number, number][] = [...line(0.15), ...line(1.0).reverse()];
    side(b, glass, (x0 + x1) / 2 - 0.02, 0.04, GLASS);
  }
  // Closed off under the landing, from the ground floor
  box(b, a.x0 - BALUSTRADE, Y, TERRACE_Z, c.x1 + BALUSTRADE, LOW_CEIL, TERRACE_Z + 0.12, wallOf('#ff9ec7'));
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
    box(b, e.x0, Y, FOOT_Z + 0.55, e.x1, Y + 0.03, FOOT_Z + 0.8, CHROME);
    box(b, e.x0, Y + UP, TERRACE_Z - 0.01, e.x1, Y + UP + 0.03, TERRACE_Z + 0.25, CHROME);
  }
}

/* ---------- The food court ---------- */

function foodCourt(b: Batch) {
  const y0 = Y + UP;
  // Over the stalls: the bulkhead to the roof; under them, the strip's ground-floor face
  box(b, IN[0], y0 + 2.9, IN[1], IN[2], CEIL, STALL_Z, LILAC);
  box(b, IN[0], Y, IN[1], IN[2], LOW_CEIL, STALL_Z, LILAC);
  box(b, IN[0], Y + 2.2, STALL_Z, IN[2], Y + 2.3, STALL_Z + 0.05, PURPLE_NEON);
  FOOD_STALLS.forEach((s, i) => {
    const { x0, x1 } = s;
    const xm = (x0 + x1) / 2;
    const wall = wallOf(PASTELS[(i + 2) % PASTELS.length]);
    // Partitions, the kitchen's back with its menu boards (colour, no prices), the grill
    if (i) box(b, x0 - 0.06, y0, IN[1], x0 + 0.06, y0 + 2.9, STALL_Z, WHITE);
    box(b, x0, y0, IN[1], x1, y0 + 2.9, IN[1] + 0.05, wall);
    box(b, xm - 1.4, y0 + 1.6, IN[1] + 0.05, xm + 1.4, y0 + 2.5, IN[1] + 0.1, INK);
    for (let k = 0; k < 3; k++) {
      box(b, xm - 1.25 + k * 0.88, y0 + 2.2, IN[1] + 0.1, xm - 0.55 + k * 0.88, y0 + 2.4, IN[1] + 0.12, [PEACH, TEAL, POT][k]);
      for (let r = 0; r < 3; r++) box(b, xm - 1.25 + k * 0.88, y0 + 1.75 + r * 0.13, IN[1] + 0.1, xm - 0.75 + k * 0.88, y0 + 1.8 + r * 0.13, IN[1] + 0.12, WHITE);
    }
    box(b, xm - 1.2, y0, IN[1] + 0.15, xm + 0.4, y0 + 0.95, IN[1] + 0.75, CHROME);
    box(b, xm + 0.7, y0, IN[1] + 0.15, xm + 1.6, y0 + 1.6, IN[1] + 0.7, DARK);
    // The counter, its top, the fascia over it with the name and a neon line
    box(b, x0 + 0.2, y0, STALL_Z - 0.7, x1 - 0.2, y0 + 1.0, STALL_Z - 0.05, wall);
    box(b, x0 + 0.15, y0 + 1.0, STALL_Z - 0.75, x1 - 0.15, y0 + 1.06, STALL_Z, CHROME);
    box(b, x0, y0 + 2.4, STALL_Z - 0.3, x1, y0 + 2.9, STALL_Z + 0.22, NAVY);
    signIn(b, s.name, xm, y0 + 2.65, STALL_Z + 0.23, Math.min(3.6, x1 - x0 - 0.6), 0.42, 0);
    box(b, x0 + 0.2, y0 + 2.36, STALL_Z + 0.16, x1 - 0.2, y0 + 2.4, STALL_Z + 0.2, NEONS[i % NEONS.length]);
  });
  // Tables: a round top on a pedestal, a stool each side
  for (const [x, z] of TABLES) {
    cyl(b, TABLE_R, 0.05, x, y0 + 0.72, z, WHITE, 16);
    cyl(b, 0.06, 0.72, x, y0, z, CHROME, 8);
    cyl(b, 0.25, 0.03, x, y0, z, CHROME, 12);
    for (const sx of [-1, 1]) {
      cyl(b, 0.22, 0.08, x + sx * (TABLE_R + 0.3), y0 + 0.42, z, wallOf(sx < 0 ? '#ff9ec7' : '#7fe0d0'), 12);
      cyl(b, 0.04, 0.42, x + sx * (TABLE_R + 0.3), y0, z, CHROME, 6);
    }
  }
}

/* ---------- Downstairs and the lobby ---------- */

function downstairs(b: Batch) {
  for (const t of GROUND_THINGS) {
    const [x0, z0, x1, z1] = t.rect;
    const [xm, zm] = [(x0 + x1) / 2, (z0 + z1) / 2];
    if (t.kind === 'ride') {
      cyl(b, 0.65, 0.25, xm, Y, zm, CHROME, 18);
      if (x0 < XM) {
        // A rocket: its body, nose, fins and a porthole
        cyl(b, 0.3, 1.2, xm, Y + 0.25, zm, wallOf('#f6f3fb'), 14);
        b.add(new THREE.ConeGeometry(0.3, 0.6, 14).translate(xm, Y + 1.75, zm), wallOf('#ff4f8b'));
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2;
          b.add(new THREE.BoxGeometry(0.05, 0.45, 0.32).rotateY(a).translate(xm + Math.cos(a) * 0.36, Y + 0.5, zm - Math.sin(a) * 0.36), wallOf('#ff4f8b'));
        }
        b.add(new THREE.CircleGeometry(0.11, 12).translate(xm, Y + 1.15, zm + 0.302), CYAN_NEON);
      } else {
        // A little car
        box(b, xm - 0.32, Y + 0.3, zm - 0.55, xm + 0.32, Y + 0.7, zm + 0.55, YELLOW);
        box(b, xm - 0.25, Y + 0.7, zm - 0.15, xm + 0.25, Y + 0.95, zm + 0.3, wallOf('#8fd3ff'));
        for (const [wx, wz] of [
          [-0.34, -0.35],
          [0.34, -0.35],
          [-0.34, 0.35],
          [0.34, 0.35],
        ])
          b.add(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 10).rotateZ(Math.PI / 2).translate(xm + wx, Y + 0.38, zm + wz), DARK);
      }
      // (a coin box beside it, and the sign)
      box(b, x1 - 0.3, Y, z1 - 0.3, x1 - 0.05, Y + 0.9, z1 - 0.05, wallOf('#ff4f8b'));
      if (x0 < XM) signIn(b, 'KIDS RIDES', xm, LOW_CEIL - 0.45, z1 + 0.6, 1.8, 0.45, 0);
    } else if (t.kind === 'desk') {
      // The information desk: a pastel counter, a chrome top, INFO hung over it both ways
      box(b, x0, Y, z0, x1, Y + 1.0, z1, wallOf('#7fe0d0'));
      box(b, x0 - 0.05, Y + 1.0, z0 - 0.05, x1 + 0.05, Y + 1.05, z1 + 0.05, CHROME);
      box(b, xm - 0.7, LOW_CEIL - 0.75, zm - 0.04, xm + 0.7, LOW_CEIL - 0.25, zm + 0.04, INK);
      signIn(b, 'INFO', xm, LOW_CEIL - 0.5, zm + 0.05, 1.3, 0.42, 0);
      signIn(b, 'INFO', xm, LOW_CEIL - 0.5, zm - 0.05, 1.3, 0.42, Math.PI);
    } else {
      // The photo booth: a box, its curtain, PHOTOS on top
      box(b, x0, Y, z0, x1, Y + 2.1, z1, PEACH);
      box(b, xm - 0.35, Y + 0.1, z1, xm + 0.35, Y + 1.8, z1 + 0.04, wallOf('#ff4f8b'));
      signIn(b, 'PHOTOS', xm, Y + 2.3, z1 - 0.05, 1.3, 0.35, 0);
    }
  }
  // The department stores' doors on the walls under the terrace: a chrome frame, windows, the name over them
  ANCHOR_DOORS.forEach((d, k) => {
    const zm = (d.z0 + d.z1) / 2;
    const fx = d.x + d.face * 0.01;
    box(b, Math.min(fx, fx + d.face * 0.1), Y, d.z0 - 0.15, Math.max(fx, fx + d.face * 0.1), Y + 2.75, d.z1 + 0.15, CHROME);
    glassX(b, fx + d.face * 0.1, d.face, d.z0, d.z1, Y, Y + 2.55);
    sign(b, ANCHORS[k].name, fx + d.face * 0.12, LOW_CEIL - 0.3, zm, Math.min(3.4, d.z1 - d.z0), 0.45, d.face * (Math.PI / 2));
  });
  // The directory boards in the lobby: a map of the floors in pastel blocks, DIRECTORY over it, both ways
  for (const [x, z] of DIRECTORY) {
    box(b, x - 0.9, Y, z - 0.15, x + 0.9, Y + 2.2, z + 0.15, NAVY);
    for (const s of [-1, 1]) {
      const zf = z + s * 0.151;
      signIn(b, 'DIRECTORY', x, Y + 1.95, zf + s * 0.005, 1.6, 0.36, s === 1 ? 0 : Math.PI);
      for (let r = 0; r < 4; r++)
        for (let q = 0; q < 3; q++) {
          const [bx, by] = [x - 0.6 + q * 0.42, Y + 0.6 + r * 0.3];
          box(b, bx, by, Math.min(zf, zf + s * 0.02), bx + 0.34, by + 0.22, Math.max(zf, zf + s * 0.02), wallOf(PASTELS[(r * 3 + q) % PASTELS.length]));
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
      box(b, x0, y0, IN[3] - 0.03, x1, y1, IN[3], wallOf('#bfe6f6'));
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
