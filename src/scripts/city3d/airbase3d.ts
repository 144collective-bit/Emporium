/*
 * Northgate Air Base drawn, Phase 1 (docs/military-plan.md; the numbers are airbase.ts): a district loaded as you
 * approach (districts.ts `LAZY_DISTRICTS` id `airbase-camp`), as sites:
 *
 * - the fence, a stretch of each run a site: galvanised posts and a top rail, the chain-link's mesh in the FX layer
 *   (see-through: the owner's pick), and near only the arms leaning out from each post's top with the wire along them;
 * - each gate: its posts, its sliding gate shut, the barrier down outside it (red and white), the guardhouse inside on
 *   its east, the apron from the turning loop to the barrier; the base's name on a low wall by the main gate;
 * - the parade avenue's asphalt north from the main gate (no traffic till the plan's Phase 4);
 * - the visitors' car park and its drive, and the visitors' centre (a place, coming soon) with its roof's terrace.
 *
 * The lamps along the fence, at the gates and round the car park are the city's own (airbase.ts `AIRBASE_LAMPS`).
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, fx, lit, moving, siteMat, toon } from './kit';
import { nearGate } from './nearby';
import { addPeople } from './life';
import { BASE_IDLE, BASE_MOVERS, BASE_VEHICLES, vehicleAt } from './airbaselife';
import { carGeometry, carMaterials } from './cars';
import type { Tick } from './world';
import { site } from './tilework';
import { COVER, ROAD, STONE } from './palette';
import { cyl, light } from './airportkit';
import { buildFx, chainMesh } from './grime';
import {
  AVENUE,
  AVENUE_HALF,
  BARRIER_Y,
  FENCE_H,
  FENCE_RUNS,
  GATES,
  GUARDHOUSE_H,
  LOOP_SHORT,
  SIGN_WALL,
  SIGN_WALL_H,
  VISITORS,
  VISITORS_DRIVE,
  VISITOR_CENTRE,
  VISITOR_CENTRE_H,
  barrierOf,
  guardhouseOf,
  inAirbase,
  type Gate,
  BARRACKS,
  BARRACKS_H,
  BERM,
  BERM_H,
  FLAGPOLES,
  FLAG_H,
  GATEHOUSE_H,
  HELI_HUT,
  HELI_PADS,
  HQ,
  HQ_H,
  MONUMENT,
  MOTOR_POOL,
  MOTOR_SHED,
  MOTOR_SHED_H,
  PARADE,
  RADAR,
  RANGE,
  RANGE_HOUSE,
  RANGE_LANES,
  SERVICES,
  SERVICE_ROAD,
  WALL_GATE,
  WATCHTOWERS,
  WATCHTOWER_H,
  WATER_TOWER,
  AIRBASE_RECT,
  BEAM_L,
  SWEEP,
  searchRest,
} from './airbase';
import type { Pt } from './streetplan';
import type { Rect } from './tiles';

/** This module's address, for the site worker (districts.ts) */
export const SELF = import.meta.url;

/** A site's stretch of fence, and the posts' spacing */
const PIECE = 30;
const POST_GAP = 3.5;
/** The mesh's foot, and where the arms start (the chain-link up to there, the wire above) */
const MESH_Y = 0.04;
const ARM_Y = FENCE_H - 0.4;
const Y = { apron: 0.024, avenue: 0.026, line: 0.032, park: 0.025, bay: 0.031 };

const STEEL = toon('#8d93a6');
const STEEL_DARK = toon('#5f6478');
const WIRE = toon('#4d5163');
const ASPHALT = toon(ROAD.asphalt);
const LINE = toon(ROAD.line);
const KERB = toon(STONE.kerb);
const CONCRETE = toon('#c3bfd2');
const CONCRETE_DARK = toon('#9e99b2');
const ROOF = toon('#4a4b5e');
const GLASS = toon('#33405e');
const DOOR = toon('#2c3046');
const RED = toon('#c8302c');
const WHITE = toon('#ecebf2');
const BRICK = toon('#6d4a52');

/** The signs: the base's name, the service gate's and the visitors' centre's, a row each */
const SIGNS = ['NORTHGATE AIR BASE', 'SERVICE GATE', "VISITORS' CENTRE"] as const;
const ROWS = 4;
const ATLAS = canvasTex(1024, 512, (c) => {
  c.fillStyle = '#10142a';
  c.fillRect(0, 0, 1024, 512);
  SIGNS.forEach((text, i) => {
    const y = i * 128;
    c.fillStyle = '#1a2148';
    c.fillRect(0, y, 1024, 128);
    c.strokeStyle = '#d9dcef';
    c.lineWidth = 6;
    c.strokeRect(10, y + 10, 1004, 108);
    c.fillStyle = '#f1f2fa';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    let size = 76;
    c.font = `800 ${size}px ${FONT_DISPLAY}`;
    const w = c.measureText(text).width;
    if (w > 940) {
      size = Math.floor((size * 940) / w);
      c.font = `800 ${size}px ${FONT_DISPLAY}`;
    }
    c.fillText(text, 512, y + 68);
  });
});
const SIGN = siteMat('airbase-sign', lit(new THREE.MeshBasicMaterial({ map: ATLAS }), 0.92, 1.1));
/** A sign's plane: row `row` of the atlas, w by h, its middle at x, y, z, facing ry (0: south, +z) */
function sign(b: Batch, row: number, w: number, h: number, x: number, y: number, z: number, ry = 0) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (row + 1 - uv.getY(i)) / ROWS);
  b.add(g.rotateY(ry).translate(x, y, z), SIGN);
}

/** A box between two corners of a rect, y0 to y1 */
const block = (b: Batch, r: Rect, y0: number, y1: number, m: THREE.Material) => b.add(new THREE.BoxGeometry(r[2] - r[0], y1 - y0, r[3] - r[1]).translate((r[0] + r[2]) / 2, (y0 + y1) / 2, (r[1] + r[3]) / 2), m);
/** A bar from a to c (on the ground's plane) at height y, w thick */
function bar(b: Batch, a: Pt, c: Pt, y: number, w: number, m: THREE.Material, h = w) {
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  if (len < 0.01) return;
  b.add(new THREE.BoxGeometry(len, h, w).rotateY(-Math.atan2(c[1] - a[1], c[0] - a[0])).translate((a[0] + c[0]) / 2, y, (a[1] + c[1]) / 2), m);
}
/** A flat strip from a to c, `half` either side, at y */
function strip(b: Batch, a: Pt, c: Pt, half: number, y: number, m: THREE.Material) {
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  if (len < 0.01) return;
  b.add(new THREE.PlaneGeometry(len, half * 2).rotateX(-Math.PI / 2).rotateY(-Math.atan2(c[1] - a[1], c[0] - a[0])).translate((a[0] + c[0]) / 2, y, (a[1] + c[1]) / 2), m);
}
const rectOf = (pts: Pt[], pad: number): Rect => [Math.min(...pts.map((p) => p[0])) - pad, Math.min(...pts.map((p) => p[1])) - pad, Math.max(...pts.map((p) => p[0])) + pad, Math.max(...pts.map((p) => p[1])) + pad];

/** A stretch of fence from a to c: its posts and top rail, the mesh (into `fx`), near only the arms and the wire */
function fence(b: Batch, fxb: Batch, a: Pt, c: Pt, low: boolean) {
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const [ux, uz] = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
  // (which side is out: the arms lean out over it)
  const mid: Pt = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
  const out = inAirbase(mid[0] - uz, mid[1] + ux) ? -1 : 1;
  const [nx, nz] = [-uz * out, ux * out];
  const n = Math.max(1, Math.round(len / POST_GAP));
  const posts: Pt[] = Array.from({ length: n + 1 }, (_, k) => [a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n]);
  for (const [x, z] of posts) b.add(new THREE.BoxGeometry(0.08, ARM_Y, 0.08).translate(x, ARM_Y / 2, z), STEEL);
  bar(b, a, c, ARM_Y - 0.04, 0.05, STEEL);
  chainMesh(fxb, a, c, MESH_Y, ARM_Y - MESH_Y - 0.06);
  if (low) return;
  b.detail(() => {
    // The arms leaning out at the top, and three strands of wire along them
    const lean = 0.32;
    // (each tipped out about the line along the fence: up crossed with out)
    const tip = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(nz, 0, -nx), Math.atan2(lean, 0.4));
    for (const [x, z] of posts) b.add(new THREE.BoxGeometry(0.04, 0.5, 0.04).translate(0, 0.25, 0).applyMatrix4(tip).translate(x, ARM_Y, z), STEEL_DARK);
    for (const k of [0.33, 0.66, 1]) {
      const [ox, oz, y] = [nx * lean * k, nz * lean * k, ARM_Y + 0.4 * k];
      bar(b, [a[0] + ox, a[1] + oz], [c[0] + ox, c[1] + oz], y, 0.015, WIRE);
    }
  });
}

/** A gate: its posts, its sliding gate shut, the barrier outside it, the guardhouse inside, the apron to it */
function gate(b: Batch, fxb: Batch, g: Gate, low: boolean) {
  const [w, e]: [Pt, Pt] = [
    [g.x - g.half, g.z],
    [g.x + g.half, g.z],
  ];
  // The apron: from the turning loop's asphalt to the gate, and on in to the guardhouse
  const loopEdge = g.z + LOOP_SHORT - 7.6;
  block(b, [g.x - g.half + 0.2, g.z - 10, g.x + g.half - 0.2, loopEdge], Y.apron - 0.01, Y.apron, ASPHALT);
  for (const s of [-1, 1]) strip(b, [g.x + s * (g.half - 0.5), g.z - 10], [g.x + s * (g.half - 0.5), loopEdge - 0.3], 0.06, Y.line, LINE);
  // (the stop line before the barrier)
  strip(b, [g.x - g.half + 0.6, g.z + 2.6], [g.x + g.half - 0.6, g.z + 2.6], 0.15, Y.line, LINE);
  // The gate's posts and its shut sliding gate: a frame round chain-link
  for (const [x, z] of [w, e]) b.add(new THREE.BoxGeometry(0.3, FENCE_H + 0.2, 0.3).translate(x, (FENCE_H + 0.2) / 2, z), STEEL_DARK);
  for (const y of [0.15, FENCE_H - 0.1]) bar(b, w, e, y, 0.07, STEEL);
  for (let k = 1; k < 4; k++) {
    const x = w[0] + ((e[0] - w[0]) * k) / 4;
    b.add(new THREE.BoxGeometry(0.06, FENCE_H - 0.25, 0.06).translate(x, (FENCE_H - 0.25) / 2 + 0.12, g.z), STEEL);
  }
  chainMesh(fxb, w, e, 0.18, FENCE_H - 0.3);
  // The barrier, down: its post on the west, the arm across in red and white
  const [p, q] = barrierOf(g);
  block(b, [p[0] - 0.2, p[1] - 0.2, p[0] + 0.2, p[1] + 0.2], 0, BARRIER_Y + 0.15, WHITE);
  const seg = 0.9;
  const n = Math.round((q[0] - p[0]) / seg);
  for (let k = 0; k < n; k++) bar(b, [p[0] + 0.2 + k * seg, p[1]], [p[0] + 0.2 + (k + 1) * seg, p[1]], BARRIER_Y, 0.09, k % 2 ? WHITE : RED, 0.12);
  // The guardhouse: walls, a band of windows all round, a door to the road, the roof over
  const r = guardhouseOf(g);
  block(b, r, 0, GUARDHOUSE_H - 0.3, CONCRETE);
  block(b, [r[0] - 0.3, r[1] - 0.3, r[2] + 0.3, r[3] + 0.3], GUARDHOUSE_H - 0.3, GUARDHOUSE_H, ROOF);
  block(b, [r[0] - 0.02, r[1] - 0.02, r[2] + 0.02, r[3] + 0.02], 1.2, 2.2, GLASS);
  block(b, [r[0] - 0.03, r[1] + 0.8, r[0], r[1] + 1.8], 0, 2.1, DOOR);
  if (!low) b.detail(() => block(b, [r[0] - 0.4, r[1] - 0.4, r[2] + 0.4, r[3] + 0.4], GUARDHOUSE_H - 0.05, GUARDHOUSE_H + 0.08, STEEL_DARK));
}

/** The parade avenue: asphalt north from the main gate (past the apron), its edges lined, in pieces */
function avenue(b: Batch, a: Pt, c: Pt) {
  strip(b, a, c, AVENUE_HALF, Y.avenue, ASPHALT);
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const [nx, nz] = [-(c[1] - a[1]) / len, (c[0] - a[0]) / len];
  for (const s of [-1, 1]) strip(b, [a[0] + nx * s * (AVENUE_HALF - 0.3), a[1] + nz * s * (AVENUE_HALF - 0.3)], [c[0] + nx * s * (AVENUE_HALF - 0.3), c[1] + nz * s * (AVENUE_HALF - 0.3)], 0.07, Y.line, LINE);
}

/** The visitors' car park, its drive and its bays */
function carPark(b: Batch) {
  const r = VISITORS;
  b.add(new THREE.PlaneGeometry(r[2] - r[0], r[3] - r[1]).rotateX(-Math.PI / 2).translate((r[0] + r[2]) / 2, Y.park, (r[1] + r[3]) / 2), ASPHALT);
  const d = VISITORS_DRIVE;
  b.add(new THREE.PlaneGeometry(d[2] - d[0] + 0.6, d[3] - d[1]).rotateX(-Math.PI / 2).translate((d[0] + d[2]) / 2 - 0.3, Y.park, (d[1] + d[3]) / 2), ASPHALT);
  // (a kerb round it, and two rows of bays facing each other across the middle, clear of the centre's front)
  for (const [a, c] of [
    [[r[0], r[1]], [r[0], r[3]]],
    [[r[0], r[3]], [r[2], r[3]]],
    [[r[2], r[3]], [r[2], d[3]]],
    [[r[2], d[1]], [r[2], r[1]]],
  ] as [Pt, Pt][])
    bar(b, a, c, 0.06, 0.2, KERB, 0.12);
  for (const z of [r[3] - 5.2, r[1] + 22]) {
    for (let x = r[0] + 3; x <= r[2] - 3; x += 2.6) strip(b, [x, z - 2.4], [x, z + 2.4], 0.05, Y.bay, LINE);
  }
}

/** The visitors' centre: low, concrete, glass to the car park, a door, its name, the terrace on its roof */
function centre(b: Batch, low: boolean) {
  const r = VISITOR_CENTRE;
  const H = VISITOR_CENTRE_H;
  block(b, r, 0, H - 0.4, CONCRETE);
  block(b, [r[0] - 0.2, r[1] - 0.2, r[2] + 0.2, r[3] + 0.2], H - 0.4, H, CONCRETE_DARK);
  // (glass along its south face, the door in the middle, the name over it)
  block(b, [r[0] + 1.5, r[3], r[2] - 1.5, r[3] + 0.02], 0.5, H - 1.3, GLASS);
  const cx = (r[0] + r[2]) / 2;
  block(b, [cx - 1.1, r[3] + 0.02, cx + 1.1, r[3] + 0.05], 0, 2.3, DOOR);
  block(b, [cx - 5.2, r[3] + 0.2, cx + 5.2, r[3] + 0.5], H - 1.2, H - 0.45, BRICK);
  sign(b, 2, 9.6, 1.2, cx, H - 0.83, r[3] + 0.506);
  if (low) return;
  b.detail(() => {
    // The roof's terrace: a rail round it, posts every couple of metres
    const pts: Pt[] = [
      [r[0] - 0.1, r[1] - 0.1],
      [r[2] + 0.1, r[1] - 0.1],
      [r[2] + 0.1, r[3] + 0.1],
      [r[0] - 0.1, r[3] + 0.1],
    ];
    for (let i = 0; i < 4; i++) {
      const [a, c] = [pts[i], pts[(i + 1) % 4]];
      bar(b, a, c, H + 1.0, 0.05, STEEL);
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const n = Math.max(1, Math.round(len / 2));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        b.add(new THREE.BoxGeometry(0.05, 1.0, 0.05).translate(a[0] + (c[0] - a[0]) * t, H + 0.5, a[1] + (c[1] - a[1]) * t), STEEL);
      }
    }
  });
}

/** The base's name on its low wall by the main gate */
function nameWall(b: Batch) {
  const s = SIGN_WALL;
  block(b, s, 0, SIGN_WALL_H, BRICK);
  block(b, [s[0] - 0.05, s[1] - 0.05, s[2] + 0.05, s[3] + 0.05], SIGN_WALL_H, SIGN_WALL_H + 0.08, CONCRETE_DARK);
  sign(b, 0, s[2] - s[0] - 0.6, 0.85, (s[0] + s[2]) / 2, SIGN_WALL_H / 2 + 0.1, s[3] + 0.006);
}
/** The service gate's board by its barrier, on two posts, facing the way in */
const BOARD: Pt = [GATES[1].x + GATES[1].half + 1.6, GATES[1].z + 3];
function board(b: Batch) {
  const [x, z] = BOARD;
  for (const dx of [-1.2, 1.2]) block(b, [x + dx - 0.05, z - 0.05, x + dx + 0.05, z + 0.05], 0, 2.1, STEEL);
  block(b, [x - 1.45, z - 0.02, x + 1.45, z + 0.05], 1.64, 2.06, STEEL_DARK);
  sign(b, 1, 2.8, 0.36, x, 1.85, z + 0.056);
}

/* ---------- The base itself (Phase 3) ---------- */

const PAVE = toon(STONE.paving);
const GRASS = toon(COVER.lawn);
const EARTH = toon(COVER.dirt);
const HQ_WALL = toon('#b8b2c9');
const BLOCK_WALL = toon('#a59fb8');
const TRIM = toon('#6b6884');
const OLIVE = toon('#5d6b52');
const YELLOW = toon(ROAD.yellow);
const FLAG_M = toon('#e219e5');
const FLAG_C = toon('#00c2ff');
const MED = toon('#3d8f5a');
const DOME = toon('#e3e1ee');
const DARK = toon('#191a28');

/** A block's window bands on its two long faces (along x), a band a storey */
function bands(b: Batch, r: Rect, storeys: number, storeyH: number) {
  for (let k = 0; k < storeys; k++) {
    const [y0, y1] = [k * storeyH + storeyH * 0.38, k * storeyH + storeyH * 0.78];
    for (const z of [r[1] - 0.03, r[3]]) block(b, [r[0] + 0.8, z, r[2] - 0.8, z + 0.03], y0, y1, GLASS);
  }
}
/** A plain flat-roofed block: walls, its parapet, window bands, a door on its south face at x */
function building(b: Batch, r: Rect, h: number, storeys: number, wall: THREE.Material, doorX: number, low: boolean) {
  block(b, r, 0, h - 0.3, wall);
  block(b, [r[0] - 0.15, r[1] - 0.15, r[2] + 0.15, r[3] + 0.15], h - 0.3, h, TRIM);
  bands(b, r, storeys, (h - 0.3) / storeys);
  block(b, [doorX - 0.9, r[3], doorX + 0.9, r[3] + 0.05], 0, 2.3, DOOR);
  if (!low) b.detail(() => block(b, [doorX - 1.6, r[3], doorX + 1.6, r[3] + 1.2], 2.5, 2.7, TRIM));
}

/** The parade ground: paved, its edge kerbed; the three flags on their poles; the monument by the HQ */
function parade(b: Batch, low: boolean) {
  const r = PARADE;
  block(b, r, 0.004, 0.034, PAVE);
  for (const [a, c] of [
    [[r[0], r[1]], [r[2], r[1]]],
    [[r[0], r[3]], [r[2], r[3]]],
    [[r[0], r[1]], [r[0], r[3]]],
  ] as [Pt, Pt][])
    bar(b, a, c, 0.07, 0.2, KERB, 0.1);
  FLAGPOLES.forEach(([x, z], i) => {
    cyl(b, 0.07, FLAG_H, x, 0, z, STEEL, 8);
    // (the city's colours: magenta over cyan, the middle one the other way)
    const [top, bottom] = i === 1 ? [FLAG_C, FLAG_M] : [FLAG_M, FLAG_C];
    block(b, [x + 0.08, z - 0.01, x + 2.4, z + 0.01], FLAG_H - 0.75, FLAG_H - 0.15, top);
    block(b, [x + 0.08, z - 0.012, x + 2.4, z + 0.012], FLAG_H - 1.35, FLAG_H - 0.75, bottom);
  });
  const [mx, mz] = MONUMENT;
  block(b, [mx - 1.6, mz - 1.6, mx + 1.6, mz + 1.6], 0, 0.6, HQ_WALL);
  block(b, [mx - 0.9, mz - 0.9, mx + 0.9, mz + 0.9], 0.6, 1.4, TRIM);
  cyl(b, 0.18, 4.6, mx, 1.4, mz, HQ_WALL, low ? 4 : 8, 0.5);
}

/** The HQ: three storeys, a portico over its door onto the parade ground */
function hq(b: Batch, low: boolean) {
  const r = HQ;
  const cx = (r[0] + r[2]) / 2;
  building(b, r, HQ_H, 3, HQ_WALL, cx, low);
  block(b, [cx - 5, r[3], cx + 5, r[3] + 3], 3.2, 3.5, TRIM);
  for (const x of [cx - 4.6, cx + 4.6]) block(b, [x - 0.25, r[3] + 2.5, x + 0.25, r[3] + 3], 0, 3.2, HQ_WALL);
}

/** A barracks block: two storeys, window bands, a door at each end of its south face */
function barracks(b: Batch, r: Rect, low: boolean) {
  building(b, r, BARRACKS_H, 2, BLOCK_WALL, r[0] + 4, low);
  block(b, [r[2] - 4.9, r[3], r[2] - 3.1, r[3] + 0.05], 0, 2.3, DOOR);
}

/** The mess hall, the gym (taller, a clerestory) and the medical centre (its green band) */
function services(b: Batch, low: boolean) {
  for (const { id, rect, h } of SERVICES) {
    building(b, rect, h, id === 'gym' ? 1 : 1, BLOCK_WALL, (rect[0] + rect[2]) / 2, low);
    if (id === 'medical') block(b, [rect[0] - 0.02, rect[3], rect[2] + 0.02, rect[3] + 0.04], h - 1.2, h - 0.7, MED);
  }
}

/** The motor pool: its concrete yard, the shed along its north side (open bays), its trucks in a row, its road in */
function motorPool(b: Batch, low: boolean) {
  const r = MOTOR_POOL;
  block(b, r, 0.004, 0.03, CONCRETE_DARK);
  const s = MOTOR_SHED;
  block(b, [s[0], s[1], s[2], s[1] + 1], 0, MOTOR_SHED_H, BLOCK_WALL);
  for (const x of [s[0], s[2] - 0.4]) block(b, [x, s[1], x + 0.4, s[3]], 0, MOTOR_SHED_H, BLOCK_WALL);
  block(b, [s[0] - 0.3, s[1] - 0.3, s[2] + 0.3, s[3] + 0.6], MOTOR_SHED_H, MOTOR_SHED_H + 0.35, ROOF);
  block(b, [s[0] + 0.4, s[1] + 1, s[2] - 0.4, s[1] + 1.05], 0.03, MOTOR_SHED_H - 0.1, DARK);
  // (the trucks: a cab and a covered back each, olive, nose south)
  for (let k = 0; k < 6; k++) {
    const x = r[0] + 10 + k * 11;
    const z = r[1] + 30;
    block(b, [x - 1.2, z - 3, x + 1.2, z + 1.2], 0.5, 2.9, OLIVE);
    block(b, [x - 1.2, z + 1.3, x + 1.2, z + 3.2], 0.5, 2.3, OLIVE);
    block(b, [x - 1.1, z + 2.2, x + 1.1, z + 3.22], 1.5, 2.1, GLASS);
    if (!low) for (const [wx, wz] of [[x - 1.2, z - 2], [x + 1.2, z - 2], [x - 1.2, z + 2.3], [x + 1.2, z + 2.3]] as Pt[]) cyl(b, 0.5, 0.35, wx - 0.17, 0, wz, DARK, 10);
  }
  for (let i = 1; i < SERVICE_ROAD.length; i++) strip(b, SERVICE_ROAD[i - 1], SERVICE_ROAD[i], 3.5, Y.avenue, ASPHALT);
}

/** The heliport: four concrete pads, each its yellow ring and H, and the hut */
function heliport(b: Batch) {
  for (const [x, z, r] of HELI_PADS) {
    b.add(new THREE.CircleGeometry(r, 28).rotateX(-Math.PI / 2).translate(x, Y.park, z), CONCRETE);
    b.add(new THREE.RingGeometry(r - 0.9, r - 0.6, 28).rotateX(-Math.PI / 2).translate(x, Y.line, z), YELLOW);
    for (const dx of [-1.6, 1.6]) block(b, [x + dx - 0.3, z - 2.4, x + dx + 0.3, z + 2.4], Y.line - 0.004, Y.line, WHITE);
    block(b, [x - 1.6, z - 0.3, x + 1.6, z + 0.3], Y.line - 0.004, Y.line, WHITE);
  }
  building(b, HELI_HUT, 3, 1, BLOCK_WALL, (HELI_HUT[0] + HELI_HUT[2]) / 2, true);
}

/** The radar dome on its grassy mound, its plinth */
function radar(b: Batch, low: boolean) {
  const { x, z, mound, moundH, r, plinth } = RADAR;
  b.add(new THREE.CylinderGeometry(mound * 0.55, mound, moundH, low ? 14 : 24).translate(x, moundH / 2, z), GRASS);
  block(b, [x - r * 0.8, z - r * 0.8, x + r * 0.8, z + r * 0.8], moundH, moundH + plinth, CONCRETE);
  b.add(new THREE.SphereGeometry(r, low ? 14 : 22, low ? 8 : 12, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, moundH + plinth, z), DOME);
}

/** The water tower: four legs, the tank, its cap */
function waterTower(b: Batch, low: boolean) {
  const { x, z, half, tank, r, top } = WATER_TOWER;
  for (const [dx, dz] of [[-half, -half], [half, -half], [-half, half], [half, half]] as Pt[]) block(b, [x + dx - 0.15, z + dz - 0.15, x + dx + 0.15, z + dz + 0.15], 0, tank[0], STEEL);
  if (!low) b.detail(() => {
    for (const s of [-1, 1]) bar(b, [x - half, z + s * half], [x + half, z + s * half], tank[0] * 0.5, 0.08, STEEL);
  });
  cyl(b, r, tank[1] - tank[0], x, tank[0], z, CONCRETE, low ? 12 : 20);
  cyl(b, 0.3, top - tank[1], x, tank[1], z, ROOF, low ? 12 : 20, r);
}

/** The firing range: its lanes on the ground, the earth berm they face, the range house (scenery: no targets) */
function range(b: Batch) {
  const r = RANGE;
  block(b, [r[0] + 8, r[1] + 6, RANGE_HOUSE[0] - 1, r[3] - 6], 0.004, 0.024, toon(COVER.bare));
  const w = (r[3] - r[1] - 12) / RANGE_LANES;
  for (let k = 0; k <= RANGE_LANES; k++) {
    const z = r[1] + 6 + k * w;
    strip(b, [r[0] + 8, z], [RANGE_HOUSE[0] - 1, z], 0.08, Y.line, WHITE);
  }
  // (the berm: a long earth bank, its sides sloping)
  const [bx0, bz0, bx1, bz1] = BERM;
  const bank = new THREE.CylinderGeometry(1, (bx1 - bx0) / 2, BERM_H, 4, 1).rotateY(Math.PI / 4).scale(1, 1, (bz1 - bz0) / (bx1 - bx0));
  b.add(bank.translate((bx0 + bx1) / 2, BERM_H / 2, (bz0 + bz1) / 2), EARTH);
  building(b, RANGE_HOUSE, 4, 1, BLOCK_WALL, (RANGE_HOUSE[0] + RANGE_HOUSE[2]) / 2, true);
}

/** A watchtower: four legs, a platform, a cabin with windows all round, its roof and searchlight */
function watchtower(b: Batch, x: number, z: number, low: boolean) {
  const H = WATCHTOWER_H;
  for (const [dx, dz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]] as Pt[]) block(b, [x + dx - 0.1, z + dz - 0.1, x + dx + 0.1, z + dz + 0.1], 0, H - 2.4, STEEL);
  block(b, [x - 1.5, z - 1.5, x + 1.5, z + 1.5], H - 2.5, H - 2.3, TRIM);
  block(b, [x - 1.3, z - 1.3, x + 1.3, z + 1.3], H - 2.3, H - 0.6, BLOCK_WALL);
  block(b, [x - 1.32, z - 1.32, x + 1.32, z + 1.32], H - 1.7, H - 0.9, GLASS);
  block(b, [x - 1.6, z - 1.6, x + 1.6, z + 1.6], H - 0.6, H - 0.35, ROOF);
  block(b, [x - 0.2, z - 0.2, x + 0.2, z + 0.2], H - 0.35, H - 0.05, light('#fff1d0'));
  if (!low) b.detail(() => {
    for (const s of [-1, 1]) bar(b, [x - 1.2, z + s * 1.2], [x + 1.2, z + s * 1.2], (H - 2.4) / 2, 0.06, STEEL);
  });
}

/** The wall gate's gatehouse against the wall: its blast doors shut on its south face, hazard bands across them */
function gatehouse(b: Batch, low: boolean) {
  const r = WALL_GATE;
  const H = GATEHOUSE_H;
  block(b, [r[0], r[1], r[2], r[3] - 0.6], 0, H, CONCRETE_DARK);
  block(b, [r[0] - 0.3, r[1], r[2] + 0.3, r[3] - 0.3], H - 0.6, H, TRIM);
  const cx = (r[0] + r[2]) / 2;
  for (const s of [-1, 1]) block(b, [cx + (s < 0 ? -9 : 0.06), r[3] - 0.6, cx + (s < 0 ? -0.06 : 9), r[3] - 0.2], 0, 7, STEEL_DARK);
  if (!low)
    b.detail(() => {
      for (let k = 0; k < 9; k++) block(b, [cx - 9 + k * 2, r[3] - 0.2, cx - 8 + k * 2, r[3] - 0.17], 0.4, 0.9, k % 2 ? DARK : YELLOW);
    });
}

/**
 * The watchtowers' searchlights at night (Phase 4): one instanced cone, each beam from its tower's top down to the
 * ground, sweeping slowly either side of the way into the base (`SWEEP`); held still under reduced motion (the Strip's
 * searchlights' way, stripmarks3d.ts)
 */
function searchlights(scene: THREE.Scene, tick: ((f: Tick) => void) | undefined) {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const g = new THREE.CylinderGeometry(2.4, 0.2, BEAM_L, 14, 1, true).translate(0, BEAM_L / 2, 0);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) col.set([1, 1, 1, Math.max(0, 1 - pos.getY(i) / BEAM_L) ** 1.4], i * 4);
  g.setAttribute('color', new THREE.BufferAttribute(col, 4));
  const mat = new THREE.MeshBasicMaterial({ color: '#fff4dc', vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const beams = new THREE.InstancedMesh(g, mat, WATCHTOWERS.length);
  beams.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  beams.frustumCulled = false;
  beams.userData.keep = true;
  beams.name = 'airbase-searchlights';
  scene.add(fx(moving(beams)));
  const [M, Q, V, D, UP, ONE] = [new THREE.Matrix4(), new THREE.Quaternion(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 1, 1)];
  const set = (t: number, night: number) => {
    mat.opacity = 0.07 * night;
    beams.visible = night > 0.05;
    if (!beams.visible) return;
    WATCHTOWERS.forEach(([x, z], i) => {
      // (its yaw: at rest in towards the base, swinging either side; the beam down to the ground some 20 off)
      const a = searchRest([x, z]) + (reduced ? 0 : Math.sin(t * 0.22 + i * 1.7) * SWEEP);
      D.set(Math.cos(a), -0.42, -Math.sin(a)).normalize();
      M.compose(V.set(x, WATCHTOWER_H - 0.2, z), Q.setFromUnitVectors(UP, D), ONE);
      beams.setMatrixAt(i, M);
    });
    beams.instanceMatrix.needsUpdate = true;
  };
  set(0, 0);
  const near = nearGate(400);
  tick?.((env) => {
    if (!near(...AIRBASE_RECT)) return;
    set(Date.now() / 1000, env.night);
  });
}

/** The base's vehicles on their loops (airbaselife.ts), olive, as the Docks' truck: on the clock while the camera's
 * near, still under reduced motion */
function vehicles(scene: THREE.Scene, tick: ((f: Tick) => void) | undefined) {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const paint = toon('#5d6b52');
  const cars = BASE_VEHICLES.map((v) => {
    const geo = carGeometry(v.car);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo.paint, paint), new THREE.Mesh(geo.detail, carMaterials().detail));
    for (const m of g.children) m.castShadow = m.receiveShadow = true;
    g.name = v.id;
    scene.add(moving(g));
    return { v, g };
  });
  const place = (t: number) => {
    for (const { v, g } of cars) {
      const p = vehicleAt(v, t);
      g.position.set(p.x, 0, p.z);
      g.rotation.y = p.yaw;
    }
  };
  place(reduced ? 0 : Date.now() / 1000);
  if (reduced) return;
  const near = nearGate(300);
  tick?.(() => {
    if (!near(...AIRBASE_RECT)) return;
    place(Date.now() / 1000);
  });
}

export function register({ low, scene, tick }: { low: boolean; scene?: THREE.Scene | null; tick?: (f: Tick) => void }) {
  // The fence, a stretch a site
  FENCE_RUNS.forEach(([a, c], i) => {
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const n = Math.max(1, Math.ceil(len / PIECE));
    for (let k = 0; k < n; k++) {
      const p: Pt = [a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n];
      const q: Pt = [a[0] + ((c[0] - a[0]) * (k + 1)) / n, a[1] + ((c[1] - a[1]) * (k + 1)) / n];
      site(`airbase fence ${i} ${k}`, rectOf([p, q], 1), (into) => {
        const b = new Batch();
        const fxb = new Batch();
        fence(b, fxb, p, q, low);
        b.build(into, { cast: true, receive: true });
        buildFx(fxb, into);
      });
    }
  });
  // The gates
  for (const g of GATES)
    site(`airbase gate ${g.id}`, [g.x - g.half - 3, g.z - 11, g.x + g.half + 6, g.z + LOOP_SHORT - 7], (into) => {
      const b = new Batch();
      const fxb = new Batch();
      gate(b, fxb, g, low);
      b.build(into, { cast: true, receive: true });
      buildFx(fxb, into);
    });
  // The parade avenue, past the main gate's apron, in pieces
  const [start, ...rest] = AVENUE;
  let prev: Pt = [start[0], start[1] - 10];
  for (const c of rest) {
    const len = Math.hypot(c[0] - prev[0], c[1] - prev[1]);
    const n = Math.max(1, Math.ceil(len / 40));
    for (let k = 0; k < n; k++) {
      const p: Pt = [prev[0] + ((c[0] - prev[0]) * k) / n, prev[1] + ((c[1] - prev[1]) * k) / n];
      const q: Pt = [prev[0] + ((c[0] - prev[0]) * (k + 1)) / n, prev[1] + ((c[1] - prev[1]) * (k + 1)) / n];
      site(`airbase avenue ${Math.round(p[1])}`, rectOf([p, q], AVENUE_HALF + 1), (into) => {
        const b = new Batch();
        avenue(b, p, q);
        b.build(into, { cast: false, receive: true });
      });
    }
    prev = c;
  }
  // The visitors' area and the base's names
  site('airbase visitors', [VISITORS[0] - 1, VISITORS[1] - 1, VISITORS_DRIVE[2] + 1, VISITORS[3] + 1], (into) => {
    const b = new Batch();
    carPark(b);
    centre(b, low);
    b.build(into, { cast: true, receive: true });
  });
  site('airbase name', [SIGN_WALL[0] - 1, SIGN_WALL[1] - 1, SIGN_WALL[2] + 1, SIGN_WALL[3] + 1], (into) => {
    const b = new Batch();
    nameWall(b);
    b.build(into, { cast: true, receive: true });
  });
  site('airbase service board', [BOARD[0] - 2, BOARD[1] - 1, BOARD[0] + 2, BOARD[1] + 1], (into) => {
    const b = new Batch();
    board(b);
    b.build(into, { cast: true, receive: true });
  });
  // The base itself (Phase 3), a site each (the barracks a row a site, the watchtowers each their own)
  const one = (id: string, r: Rect, draw: (b: Batch) => void) =>
    site(id, [r[0] - 2, r[1] - 2, r[2] + 2, r[3] + 2], (into) => {
      const b = new Batch();
      draw(b);
      b.build(into, { cast: true, receive: true });
    });
  one('airbase parade', [PARADE[0], MONUMENT[1] - 2, PARADE[2], PARADE[3]], (b) => parade(b, low));
  one('airbase hq', [HQ[0], HQ[1], HQ[2], HQ[3] + 3], (b) => hq(b, low));
  for (let i = 0; i < BARRACKS.length; i += 4) {
    const row = BARRACKS.slice(i, i + 4);
    one(`airbase barracks ${i / 4}`, [row[0][0], row[0][1], row[row.length - 1][2], row[0][3]], (b) => row.forEach((r) => barracks(b, r, low)));
  }
  one('airbase services', [Math.min(...SERVICES.map((q) => q.rect[0])), Math.min(...SERVICES.map((q) => q.rect[1])), Math.max(...SERVICES.map((q) => q.rect[2])), Math.max(...SERVICES.map((q) => q.rect[3]))], (b) => services(b, low));
  one('airbase motor pool', [SERVICE_ROAD[0][0] - 4, MOTOR_POOL[1], MOTOR_POOL[2], SERVICE_ROAD[0][1]], (b) => motorPool(b, low));
  one('airbase heliport', [Math.min(...HELI_PADS.map((p) => p[0] - p[2])), Math.min(...HELI_PADS.map((p) => p[1] - p[2])), Math.max(...HELI_PADS.map((p) => p[0] + p[2])), Math.max(...HELI_PADS.map((p) => p[1] + p[2]))], (b) => heliport(b));
  one('airbase radar', [RADAR.x - RADAR.mound, RADAR.z - RADAR.mound, RADAR.x + RADAR.mound, RADAR.z + RADAR.mound], (b) => radar(b, low));
  one('airbase water tower', [WATER_TOWER.x - WATER_TOWER.r, WATER_TOWER.z - WATER_TOWER.r, WATER_TOWER.x + WATER_TOWER.r, WATER_TOWER.z + WATER_TOWER.r], (b) => waterTower(b, low));
  one('airbase range', RANGE, (b) => range(b));
  WATCHTOWERS.forEach(([x, z], i) => one(`airbase watchtower ${i}`, [x - 1.6, z - 1.6, x + 1.6, z + 1.6], (b) => watchtower(b, x, z, low)));
  one('airbase wall gate', WALL_GATE, (b) => gatehouse(b, low));
  // The watchtowers' searchlights and the base's people (main thread only: the city's crowd takes them; every other one
  // left out on phones)
  if (!scene) return;
  searchlights(scene, tick);
  addPeople(
    BASE_IDLE.filter((_, i) => !low || i % 2 === 0),
    BASE_MOVERS.filter((p) => !(low && p.trim))
  );
  vehicles(scene, tick);
}
