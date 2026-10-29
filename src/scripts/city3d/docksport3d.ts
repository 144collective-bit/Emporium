/*
 * Southbank Docks' port drawn (docs/docks-plan.md Phase 3; the numbers are docksport.ts's), in the docks' chunk
 * (docks3d.ts `register()`), as sites, a piece of the port each:
 *
 * - **The container terminal:** the three ship-to-shore cranes in red and white on their rails (legs on bogies, the
 *   portal beams, the girders and booms with a cyan neon line under them, the A-frame with its stays, the machinery
 *   house, the trolley, the cab and the spreader on its ropes; one boom raised; red warning lights on top), the
 *   container ship at the berth (its hull in pieces, the boxes on deck, the bridge, the funnel, its name, its lines
 *   to the bollards), the stacks (a box each, in its line's colour; near, ribs, doors and the line's name), the gate
 *   (the gantry with SOUTHBANK DOCKS both ways, the booth, its barriers, the lanes' paint), the straddle carriers and
 *   the reach stacker, the cranes' rails.
 * - **The old docks:** SHED 3, the dry dock's coaster on its blocks with its shores and the railing round the pit,
 *   the tugs and the pilot boat, the old rails set in the east quay.
 * - **The yards:** the brick warehouses (the city's wall atlas), the fuel farm, the truck park (the rigs are the
 *   cars' own, `parkedCars()`, on the main thread; their trailers and boxes here).
 * - **Landmarks:** the Harbour Master's office (its clock tower and flag), the lighthouse, the floodlight masts.
 *
 * One sign atlas of fixed made-up copy (painted, and the gate's lit). Walls, roofs, hulls and the cranes' main
 * members at every distance (their far form); the fine details near only, and phones leave out the finest.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, lit, neon, siteMat, toon } from './kit';
import { site } from './tilework';
import { ATLAS, kit } from './infill';
import { WORLD, flatRoof, walls } from './riverside3d';
import { parkedCars } from './cars';
import type { CarId } from './carspec';
import { WATER_Y } from './river';
import { BASIN, CAISSON, DOCK_FLOOR, DRY_DOCK, type Rect } from './docks';
import {
  BOX,
  BOOM,
  COASTER,
  CRANE,
  CRANES,
  FUEL,
  GATE,
  HARBOUR_MASTER,
  HINGE,
  LAND_RAIL,
  LIGHTHOUSE,
  LINES,
  MAST_H,
  MASTS,
  REACH_STACKER,
  S,
  SEA_RAIL,
  SHED,
  SHIP,
  SHIP_STACKS,
  STACKS,
  STACK_BLOCKS,
  STRADDLE,
  STRADDLES,
  TRUCKS,
  TRUCK_BODY,
  TUGS,
  WAREHOUSES,
  craneRect,
  type Stack,
} from './docksport';

type Pt = [number, number];
type V3 = [number, number, number];

/* ---------- Paint ---------- */

const RED = toon('#d9462b');
const WHITE = toon('#eceaf2');
const STEEL = toon('#2b2a33');
const GREY = toon('#6b6878');
const RAIL = toon('#55525e');
const YELLOW = toon('#e8b422');
const NAVY = toon('#1b2a4a');
const BOOT = toon('#a5302b');
const DECK = toon('#5d6a5a');
const RUST = toon('#8a4a32');
const GREEN = toon('#2f4a3a');
const BLACK = toon('#17161c');
const ORANGE = toon('#e0702a');
const CONCRETE = toon('#9c98a6');
const CLAD = toon('#6f8a7a');
const CLAD_ROOF = toon('#4a4f5c');
const CLAD_RIB = toon('#62796c');
const DOOR = toon('#3b3f4a');
const STONE = toon('#d4cbb6');
const COPPER = toon('#3f8f7a');
const TANK = toon('#e9e7ee');
const TYRE = toon('#1e1d22');
const GLASS = siteMat('docks-glass', lit(toon('#2b3a52', { emissive: '#ffd59a' }), 0, 0.9));
const CYAN = neon('#2ef2ff', 0.5, 2.4);
const WARN = neon('#ff2d3a', 0.8, 2.4);
const SODIUM = neon('#ffb35a', 0.3, 1.3);
const LANTERN = neon('#fff1b8', 0.4, 1.3);
const BAR = toon('#f3f2f7');
const BAR_RED = toon('#e23b3b');
const PAINT_Y = toon('#f2c53d');
/** A line's colour, and a shade darker for its ribs */
const LINE_MAT = LINES.map((l) => toon(l.color));
const RIB_MAT = LINES.map((l) => toon(shade(l.color, -0.22)));
function shade(hex: string, amt: number) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return '#' + new THREE.Color().setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l * (1 + amt)))).getHexString();
}

/* ---------- The sign atlas: fixed made-up copy, 32 cells of 512 x 64 ---------- */

interface Cell {
  text: string;
  bg: string;
  fg: string;
  border?: string;
}
const CELLS: Cell[] = [
  { text: 'SOUTHBANK DOCKS', bg: '#10234a', fg: '#ffffff', border: '#2ef2ff' },
  { text: 'HARBOUR MASTER', bg: '#122038', fg: '#e8c56a', border: '#e8c56a' },
  { text: SHED.name, bg: '#f1efe8', fg: '#1b1830' },
  ...WAREHOUSES.map((w): Cell => ({ text: `WAREHOUSE ${w.n}`, bg: '#1f3b2e', fg: '#efe6c8', border: '#efe6c8' })),
  ...LINES.map((l): Cell => ({ text: l.name, bg: l.color, fg: '#ffffff' })),
  { text: SHIP.name, bg: '#1b2a4a', fg: '#ffffff' },
  { text: COASTER.name, bg: '#2f4a3a', fg: '#ffffff' },
  ...TUGS.map((t): Cell => (t.kind === 'pilot' ? { text: t.name, bg: '#e0702a', fg: '#17161c' } : { text: t.name, bg: '#17161c', fg: '#ffffff' })),
];
const CELL_OF = (text: string) => CELLS.findIndex((c) => c.text === text);
const CLOCK_CELL = CELLS.length;
const ATLAS_TEX = canvasTex(1024, 1024, (c) => {
  c.fillStyle = '#000';
  c.fillRect(0, 0, 1024, 1024);
  CELLS.forEach((cell, i) => {
    const [x, y] = [(i % 2) * 512, Math.floor(i / 2) * 64];
    c.fillStyle = cell.bg;
    c.fillRect(x, y, 512, 64);
    if (cell.border) {
      c.strokeStyle = cell.border;
      c.lineWidth = 4;
      c.strokeRect(x + 5, y + 5, 502, 54);
    }
    if (!cell.text) return;
    c.fillStyle = cell.fg;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    let size = 46;
    c.font = `800 ${size}px ${FONT_DISPLAY}`;
    const w = c.measureText(cell.text).width;
    if (w > 460) {
      size = Math.floor((size * 460) / w);
      c.font = `800 ${size}px ${FONT_DISPLAY}`;
    }
    c.fillText(cell.text, x + 256, y + 34);
  });
  // The Harbour Master's clock face: white, ticks, its hands at ten past ten
  const [x, y] = [(CLOCK_CELL % 2) * 512, Math.floor(CLOCK_CELL / 2) * 64];
  c.fillStyle = '#122038';
  c.fillRect(x, y, 64, 64);
  c.fillStyle = '#f6f3ec';
  c.beginPath();
  c.arc(x + 32, y + 32, 28, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#1b1830';
  c.lineWidth = 2;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    c.beginPath();
    c.moveTo(x + 32 + Math.sin(a) * 22, y + 32 - Math.cos(a) * 22);
    c.lineTo(x + 32 + Math.sin(a) * 26, y + 32 - Math.cos(a) * 26);
    c.stroke();
  }
  c.lineWidth = 3;
  for (const [a, r] of [
    [(10 / 12) * Math.PI * 2 + (10 / 60) * (Math.PI / 6), 14],
    [(10 / 60) * Math.PI * 2, 21],
  ]) {
    c.beginPath();
    c.moveTo(x + 32, y + 32);
    c.lineTo(x + 32 + Math.sin(a) * r, y + 32 - Math.cos(a) * r);
    c.stroke();
  }
});
/** Painted on (containers, hulls, boards): lit by the scene. The gate's and the Harbour Master's: lit a little at night */
const PAINTED = siteMat('docks-paint', toon('#ffffff', { map: ATLAS_TEX }));
const LIT_SIGN = siteMat('docks-lit-sign', lit(new THREE.MeshBasicMaterial({ map: ATLAS_TEX }), 0.95, 1.3));
const cellUV = (i: number, f0 = 0, f1 = 1): [number, number, number, number] => {
  const [x, y] = [(i % 2) * 512, Math.floor(i / 2) * 64];
  return [(x + f0 * 512) / 1024, 1 - (y + 64) / 1024, (x + f1 * 512) / 1024, 1 - y / 1024];
};

/* ---------- Helpers ---------- */

const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, m: THREE.Material) =>
  b.box(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), m);
const cyl = (b: Batch, r: number, h: number, x: number, y: number, z: number, m: THREE.Material, seg = 12, r0 = r) => b.add(new THREE.CylinderGeometry(r, r0, h, seg, 1).translate(x, y + h / 2, z), m);
/** A square bar between two points */
function beam(b: Batch, p: V3, q: V3, th: number, m: THREE.Material) {
  const d = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
  const g = new THREE.BoxGeometry(th, d.length(), th);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  b.add(g.translate((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2), m);
}
/** A flat plane facing n (x, z), its middle at (x, y, z), w x h, laid `off` proud */
function pane(b: Batch, x: number, y: number, z: number, n: Pt, w: number, h: number, m: THREE.Material, off = 0.008) {
  b.add(new THREE.PlaneGeometry(w, h).rotateY(Math.atan2(n[0], n[1])).translate(x + n[0] * off, y, z + n[1] * off), m);
}
/** A sign from the atlas facing n, its middle at (x, y, z) */
function sign(b: Batch, cell: number, x: number, y: number, z: number, n: Pt, w: number, h: number, m: THREE.Material = PAINTED, f0 = 0, f1 = 1, off = 0.012) {
  const g = new THREE.PlaneGeometry(w, h);
  const [u0, v0, u1, v1] = cellUV(cell, f0, f1);
  g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v1, u1, v1, u0, v0, u1, v0], 2));
  b.add(g.rotateY(Math.atan2(n[0], n[1])).translate(x + n[0] * off, y, z + n[1] * off), m);
}
/** A hull's outline (a pointed bow at one end) extruded from `y0` to `y1`: along z (bow north) or x (bow west) */
function hull(b: Batch, r: Rect, bow: number, y0: number, y1: number, m: THREE.Material, alongX = false) {
  const [x0, z0, x1, z1] = r;
  // In the hull's own numbers: a across (from -half), l along from the bow (0) to the stern
  const half = (alongX ? z1 - z0 : x1 - x0) / 2;
  const len = alongX ? x1 - x0 : z1 - z0;
  const mid = alongX ? (z0 + z1) / 2 : (x0 + x1) / 2;
  const at = (a: number, l: number): Pt => (alongX ? [x0 + l, mid + a] : [mid + a, z0 + l]);
  // The bow: a shape from its tip back to `bow`, pieces of the rest no longer than 14
  const pts: Pt[] = [at(-half, bow), at(-half * 0.55, bow * 0.35), at(-half * 0.18, 0.05), at(half * 0.18, 0.05), at(half * 0.55, bow * 0.35), at(half, bow)];
  const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  b.add(new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, y0, 0), m);
  const n = Math.max(1, Math.ceil((len - bow) / 14));
  for (let i = 0; i < n; i++) {
    const [la, lb] = [bow + ((len - bow) * i) / n, bow + ((len - bow) * (i + 1)) / n];
    const [p, q] = [at(-half, la), at(half, lb)];
    box(b, p[0], y0, p[1], q[0], y1, q[1], m);
  }
}

/** One container: its box, and near, the ribs down its long sides, the doors at one end and its line's name */
function container(b: Batch, r: Rect, y: number, line: number, low: boolean, named: boolean) {
  const [x0, z0, x1, z1] = r;
  const alongX = x1 - x0 > z1 - z0;
  box(b, x0, y, z0, x1, y + BOX.H - 0.02, z1, LINE_MAT[line]);
  if (low) return;
  b.detail(() => {
    const len = alongX ? x1 - x0 : z1 - z0;
    const [cy, h] = [y + BOX.H / 2 - 0.01, BOX.H - 0.2];
    for (let k = 1; k < 8; k++) {
      const u = (len * k) / 8;
      if (alongX) for (const [z, n] of [[z0, -1], [z1, 1]] as const) pane(b, x0 + u, cy, z, [0, n], 0.1, h, RIB_MAT[line]);
      else for (const [x, n] of [[x0, -1], [x1, 1]] as const) pane(b, x, cy, z0 + u, [n, 0], 0.1, h, RIB_MAT[line]);
    }
    // The doors' bars at the far end
    const w = alongX ? z1 - z0 : x1 - x0;
    for (const f of [0.28, 0.72]) {
      if (alongX) pane(b, x1, cy, z0 + w * f, [1, 0], 0.06, h, STEEL);
      else pane(b, x0 + w * f, cy, z1, [0, 1], 0.06, h, STEEL);
    }
    if (named && LINES[line].name) {
      // (a little proud of the ribs)
      if (alongX) sign(b, CELL_OF(LINES[line].name), (x0 + x1) / 2, cy + 0.12, z0, [0, -1], 3.6, 0.45, PAINTED, 0, 1, 0.016);
      else sign(b, CELL_OF(LINES[line].name), x1, cy + 0.12, (z0 + z1) / 2, [1, 0], 3.6, 0.45, PAINTED, 0, 1, 0.016);
    }
  });
}
function stack(b: Batch, k: Stack, y0: number, low: boolean, seed: number) {
  k.tiers.forEach((line, i) => container(b, k.rect, y0 + i * BOX.H, line, low, (seed + i) % 3 === 0));
}

/* ---------- The cranes ---------- */

function drawCrane(b: Batch, c: (typeof CRANES)[number], low: boolean) {
  const { z } = c;
  const G = CRANE.girder;
  const top = G + CRANE.depth;
  const back = LAND_RAIL - CRANE.back;
  const tip = SEA_RAIL + CRANE.out;
  const GZ = 1.6;
  // The legs on their bogies, the portal beams along the rail between them, braces across
  for (const x of [LAND_RAIL, SEA_RAIL]) {
    for (const s of [-1, 1]) {
      const lz = z + s * CRANE.leg;
      box(b, x - 0.45, S, lz - CRANE.bogie, x + 0.45, S + 0.7, lz + CRANE.bogie, STEEL);
      box(b, x - 0.35, S + 0.7, lz - 0.35, x + 0.35, G - 0.2, lz + 0.35, RED);
    }
    box(b, x - 0.4, G - 1.4, z - CRANE.leg - 0.35, x + 0.4, G - 0.2, z + CRANE.leg + 0.35, RED);
    box(b, x - 0.25, 3.2, z - CRANE.leg, x + 0.25, 3.7, z + CRANE.leg, RED);
  }
  for (const s of [-1, 1]) box(b, LAND_RAIL, G - 1.2, z + s * CRANE.leg - 0.3, SEA_RAIL, G - 0.4, z + s * CRANE.leg + 0.3, RED);
  // The girders: back from the hinge over the machinery house, and the boom out over the water (or raised)
  for (const s of [-1, 1]) {
    box(b, back, G, z + s * GZ - 0.28, HINGE[0], top, z + s * GZ + 0.28, RED);
    if (c.raised) {
      const g = new THREE.BoxGeometry(BOOM, CRANE.depth, 0.56).translate(BOOM / 2, 0, 0).rotateZ(CRANE.raised).translate(HINGE[0], HINGE[1], z + s * GZ);
      b.add(g, RED);
    } else box(b, HINGE[0], G, z + s * GZ - 0.28, tip, top, z + s * GZ + 0.28, RED);
    // ...and a cyan neon line under each, for the night
    box(b, back + 0.4, G - 0.06, z + s * GZ - 0.05, HINGE[0], G - 0.01, z + s * GZ + 0.05, CYAN);
    if (!c.raised) box(b, HINGE[0], G - 0.06, z + s * GZ - 0.05, tip - 0.4, G - 0.01, z + s * GZ + 0.05, CYAN);
  }
  // Cross girders under them at the legs, the A-frame up to its apex, the stays
  for (const x of [LAND_RAIL, SEA_RAIL]) box(b, x - 0.3, G - 0.3, z - CRANE.leg, x + 0.3, G, z + CRANE.leg, RED);
  const apex: V3 = [CRANE.apexX, CRANE.apex, z];
  for (const s of [-1, 1]) {
    beam(b, [LAND_RAIL, top, z + s * GZ], [apex[0], apex[1], z + s * GZ], 0.5, RED);
    beam(b, [SEA_RAIL, top, z + s * GZ], [apex[0], apex[1], z + s * GZ], 0.5, RED);
  }
  box(b, apex[0] - 0.4, apex[1] - 0.4, z - GZ - 0.3, apex[0] + 0.4, apex[1] + 0.2, z + GZ + 0.3, RED);
  const boomTip: V3 = c.raised ? [HINGE[0] + BOOM * Math.cos(CRANE.raised), HINGE[1] + BOOM * Math.sin(CRANE.raised), z] : [tip, top, z];
  const boomMid: V3 = c.raised ? [HINGE[0] + BOOM * 0.55 * Math.cos(CRANE.raised), HINGE[1] + BOOM * 0.55 * Math.sin(CRANE.raised), z] : [HINGE[0] + BOOM * 0.55, top, z];
  for (const s of [-1, 1]) {
    beam(b, [apex[0], apex[1], z + s * GZ], [boomTip[0], boomTip[1], z + s * GZ], 0.14, STEEL);
    beam(b, [apex[0], apex[1], z + s * GZ], [boomMid[0], boomMid[1], z + s * GZ], 0.14, STEEL);
    beam(b, [apex[0], apex[1], z + s * GZ], [back, top, z + s * GZ], 0.14, STEEL);
  }
  // The machinery house on the back reach, white, and the warning lights
  box(b, back, top, z - 2.4, back + CRANE.house, top + 2.4, z + 2.4, WHITE);
  box(b, back - 0.05, top + 2.4, z - 2.45, back + CRANE.house + 0.05, top + 2.6, z + 2.45, RED);
  box(b, apex[0] - 0.15, apex[1] + 0.2, z - 0.15, apex[0] + 0.15, apex[1] + 0.55, z + 0.15, WARN);
  box(b, boomTip[0] - 0.15, boomTip[1] + 0.1, z - 0.15, boomTip[0] + 0.15, boomTip[1] + 0.4, z + 0.15, WARN);
  // The trolley on the girders, the cab under it, the spreader on its ropes (a box in it over the ship's deck)
  const t = c.trolley;
  box(b, t - 1.3, top, z - GZ - 0.5, t + 1.3, top + 0.9, z + GZ + 0.5, GREY);
  box(b, t + 0.2, G - 1.7, z + 0.4, t + 1.6, G - 0.2, z + 1.6, WHITE);
  pane(b, t + 1.6, G - 0.95, z + 1.0, [1, 0], 1.0, 0.9, GLASS, 0.006);
  const lift = c.raised ? G - 3 : c.z === CRANES[1].z ? 9.6 : 11.2;
  box(b, t - 1.2, lift, z - 3.5, t + 1.2, lift + 0.35, z + 3.5, YELLOW);
  if (!c.raised && c.z === CRANES[1].z) container(b, [t - BOX.W / 2, z - BOX.L / 2, t + BOX.W / 2, z + BOX.L / 2], lift - BOX.H, 1, low, false);
  b.detail(() => {
    for (const [dx, dz] of [
      [-0.8, -3],
      [0.8, -3],
      [-0.8, 3],
      [0.8, 3],
    ])
      box(b, t + dx - 0.03, lift + 0.35, z + dz - 0.03, t + dx + 0.03, G, z + dz + 0.03, STEEL);
    // The bogies' wheels, a ladder up a land leg, the walkway's rails along the girders
    for (const x of [LAND_RAIL, SEA_RAIL])
      for (const s of [-1, 1])
        for (const d of [-0.5, 0.5]) b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.2, low ? 6 : 10).rotateX(Math.PI / 2).translate(x, S + 0.3, z + s * CRANE.leg + d), TYRE);
    if (!low) {
      for (let y = S + 1; y < G - 0.4; y += 0.45) box(b, LAND_RAIL - 0.62, y, z - CRANE.leg - 0.2, LAND_RAIL - 0.36, y + 0.04, z - CRANE.leg + 0.2, STEEL);
      for (const s of [-1, 1]) box(b, back, top + 0.9, z + s * (GZ + 0.3) - 0.02, HINGE[0], top + 0.94, z + s * (GZ + 0.3) + 0.02, YELLOW);
    }
  });
}

/* ---------- The ship ---------- */

function drawShip(b: Batch, low: boolean) {
  const [x0, z0, x1, z1] = SHIP.rect;
  const r = SHIP.rect;
  hull(b, r, SHIP.bow, SHIP.keel, SHIP.deck - 0.3, NAVY);
  hull(b, [x0 + 0.004, z0 + 0.004, x1 - 0.004, z1 - 0.004], SHIP.bow, SHIP.deck - 0.3, SHIP.deck, WHITE);
  // The boot top just over the water, a hair proud of the hull's sides
  box(b, x0 - 0.01, WATER_Y - 0.1, z0 + SHIP.bow, x1 + 0.01, WATER_Y + 0.22, z1 + 0.01, BOOT);
  // Hatch coamings under the boxes, the boxes on deck
  for (let bay = 0; bay < 4; bay++) box(b, x0 + 0.4, SHIP.deck, 157.2 + bay * (BOX.L + 0.2), x1 - 0.4, SHIP.deck + 0.28, 157.2 + bay * (BOX.L + 0.2) + BOX.L + 0.4, DECK);
  SHIP_STACKS.forEach((k, i) => stack(b, k, SHIP.deck + 0.3, low, i));
  // The bridge: five decks of white, its windows, the wings and the mast; the funnel in the line's colour
  const { bridge, funnel } = SHIP;
  box(b, x0 + 0.7, SHIP.deck, bridge.z0, x1 - 0.7, bridge.top, bridge.z1, WHITE);
  box(b, x0 - 0.2, bridge.top - 1.25, bridge.z0, x1 + 0.2, bridge.top - 1.0, bridge.z0 + 1.6, WHITE);
  pane(b, (x0 + x1) / 2, bridge.top - 0.6, bridge.z0, [0, -1], x1 - x0 - 1.8, 0.7, GLASS);
  box(b, (x0 + x1) / 2 - 0.12, bridge.top, (bridge.z0 + bridge.z1) / 2 - 0.12, (x0 + x1) / 2 + 0.12, bridge.top + 1.4, (bridge.z0 + bridge.z1) / 2 + 0.12, STEEL);
  box(b, (x0 + x1) / 2 - 0.12, bridge.top + 1.4, (bridge.z0 + bridge.z1) / 2 - 0.12, (x0 + x1) / 2 + 0.12, bridge.top + 1.65, (bridge.z0 + bridge.z1) / 2 + 0.12, WARN);
  const fx = (x0 + x1) / 2;
  box(b, fx - 1.2, SHIP.deck, funnel.z0, fx + 1.2, funnel.top - 1.4, funnel.z1, LINE_MAT[SHIP.line]);
  box(b, fx - 1.2, funnel.top - 1.4, funnel.z0, fx + 1.2, funnel.top - 1.0, funnel.z1, WHITE);
  box(b, fx - 1.2, funnel.top - 1.0, funnel.z0, fx + 1.2, funnel.top, funnel.z1, BLACK);
  // Its name at the bow both sides and on the stern
  for (const [x, n] of [
    [x1, 1],
    [x0, -1],
  ] as const)
    sign(b, CELL_OF(SHIP.name), x, SHIP.deck - 0.95, z0 + SHIP.bow + 3, [n, 0], 4.4, 0.62);
  sign(b, CELL_OF(SHIP.name), (x0 + x1) / 2, SHIP.deck - 0.95, z1, [0, 1], 4.2, 0.6);
  b.detail(() => {
    // Windows down the bridge's decks, its lines to the quay's bollards
    for (let d = 0; d < 4; d++) for (let k = 0; k < 5; k++) pane(b, x0 + 1.6 + k * ((x1 - x0 - 3.2) / 4), SHIP.deck + 1.0 + d * 1.6, bridge.z0, [0, -1], 0.5, 0.45, GLASS);
    if (!low)
      // (to the quay's bollards, every 8 along it from 4 in: docks3d.ts)
      for (const [zs, zq] of [
        [z0 + SHIP.bow + 1, BASIN[1] + 4],
        [z0 + SHIP.bow + 3, BASIN[1] + 12],
        [z1 - 3, BASIN[1] + 36],
        [z1 - 1, BASIN[1] + 44],
      ])
        beam(b, [x0 + 0.1, SHIP.deck, zs], [BASIN[0] - 0.55, S + 0.32, zq], 0.05, STEEL);
  });
}

/* ---------- The terminal's ground: rails, the gate, the carriers ---------- */

function drawRails(b: Batch) {
  for (const x of [LAND_RAIL, SEA_RAIL])
    for (let z = 142.6; z < 199.4 - 1e-6; z += 19) box(b, x - 0.06, S + 0.004, z, x + 0.06, S + 0.016, Math.min(199.4, z + 19), RAIL);
}
function drawGate(b: Batch, low: boolean) {
  const { x, z0, z1, h, booth } = GATE;
  for (const z of [z0 + 0.3, z1 - 0.3]) box(b, x - 0.2, S, z - 0.2, x + 0.2, h - 1.2, z + 0.2, STEEL);
  box(b, x - 0.3, h - 1.2, z0, x + 0.3, h, z1, STEEL);
  for (const n of [-1, 1] as const) sign(b, 0, x + n * 0.3, h - 0.6, (z0 + z1) / 2, [n, 0], (z1 - z0) * 0.86, 1.0, LIT_SIGN);
  const [bx0, bz0, bx1, bz1] = booth;
  box(b, bx0, S, bz0, bx1, 2.0, bz1, WHITE);
  box(b, bx0 - 0.003, 1.2, bz0 - 0.003, bx1 + 0.003, 1.9, bz1 + 0.003, GLASS);
  box(b, bx0 - 0.4, 2.0, bz0 - 0.4, bx1 + 0.4, 2.25, bz1 + 0.4, RED);
  // The lanes' paint: a centre line from the booth through the gate to the apron
  for (let px = bx1 + 0.5; px < -358; px += 2.2) box(b, px, S + 0.004, (z0 + z1) / 2 - 0.06, px + 1.2, S + 0.012, (z0 + z1) / 2 + 0.06, PAINT_Y);
  b.detail(() => {
    // The barriers, a striped arm across each lane from the booth
    for (const [za, zb] of [
      [bz0, z0 + 0.9],
      [bz1, z1 - 0.9],
    ]) {
      const n = 6;
      for (let k = 0; k < n; k++) {
        const [a, c] = [za + ((zb - za) * k) / n, za + ((zb - za) * (k + 1)) / n];
        box(b, bx1 - 0.05, 1.0, a, bx1 + 0.05, 1.1, c, k % 2 ? BAR_RED : BAR);
      }
    }
    if (!low) for (const z of [z0 + 0.3, z1 - 0.3]) box(b, x - 0.25, h - 0.15, z - 0.25, x + 0.25, h - 0.05, z + 0.25, SODIUM);
  });
}
function straddle(b: Batch, x: number, z: number, low: boolean) {
  const { L, W, H } = STRADDLE;
  const [hl, hw] = [L / 2, W / 2];
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      box(b, x + sx * hl - 0.35 * sx - 0.2, S + 0.55, z + sz * hw - 0.2, x + sx * hl - 0.35 * sx + 0.2, H - 0.9, z + sz * hw + 0.2, YELLOW);
      b.add(new THREE.CylinderGeometry(0.45, 0.45, 0.4, low ? 8 : 12).rotateX(Math.PI / 2).translate(x + sx * (hl - 0.35), S + 0.45, z + sz * hw), TYRE);
    }
  for (const sz of [-1, 1]) box(b, x - hl, H - 1.4, z + sz * hw - 0.25, x + hl, H - 0.9, z + sz * hw + 0.25, YELLOW);
  box(b, x - hl + 0.3, H - 0.9, z - hw, x - hl + 1.3, H - 0.6, z + hw, YELLOW);
  box(b, x + hl - 1.3, H - 0.9, z - hw, x + hl - 0.3, H - 0.6, z + hw, YELLOW);
  box(b, x + hl - 1.4, H - 0.6, z - 0.6, x + hl - 0.3, H, z + 0.6, WHITE);
  pane(b, x + hl - 0.3, H - 0.3, z, [1, 0], 0.9, 0.4, GLASS);
  box(b, x - 0.15, H - 0.05, z - 0.15, x + 0.15, H + 0.1, z + 0.15, ORANGE);
}
function reachStacker(b: Batch, low: boolean) {
  const { x, z, L, W, H } = REACH_STACKER;
  box(b, x - L / 2, S + 0.5, z - W / 2, x + L / 2 - 1.4, S + 1.6, z + W / 2, YELLOW);
  box(b, x - 0.6, S + 1.6, z - W / 2 + 0.2, x + 0.6, H, z - W / 2 + 1.3, WHITE);
  pane(b, x + 0.6, H - 0.55, z - W / 2 + 0.75, [1, 0], 0.9, 0.6, GLASS);
  beam(b, [x - L / 2 + 0.6, S + 1.8, z + 0.3], [x + L / 2 + 0.6, S + 3.0, z + 0.3], 0.45, YELLOW);
  box(b, x + L / 2 + 0.4, S + 2.6, z + 0.3 - 2.4, x + L / 2 + 0.8, S + 2.9, z + 0.3 + 2.4, YELLOW);
  for (const sx of [-1.8, 1.4]) for (const sz of [-1, 1]) b.add(new THREE.CylinderGeometry(0.5, 0.5, 0.45, low ? 8 : 12).rotateX(Math.PI / 2).translate(x + sx, S + 0.5, z + sz * (W / 2 - 0.2)), TYRE);
}

/* ---------- The old docks ---------- */

function drawShed(b: Batch, low: boolean) {
  const [x0, z0, x1, z1] = SHED.rect;
  const { eaves, ridge } = SHED;
  box(b, x0, S, z0, x1, eaves, z1, CLAD);
  // The gable roof along it (its ends close the gables), a hair over the walls' tops
  const s = new THREE.Shape([new THREE.Vector2(x0 - 0.3, eaves), new THREE.Vector2(x1 + 0.3, eaves), new THREE.Vector2((x0 + x1) / 2, ridge)]);
  b.add(new THREE.ExtrudeGeometry(s, { depth: z1 - z0 + 0.6, bevelEnabled: false }).translate(0, 0.004, z0 - 0.3), CLAD_ROOF);
  // Its big doors on the quay side (west) and the yard side, its name on the west front and the north gable
  const doors = (n: number) => (n < 0 ? [0, 1, 2].map((k) => z0 + 3 + k * 5.8) : [0, 1].map((k) => z0 + 5 + k * 7.6));
  const doorAt = (z: number, n: number) => doors(n).some((d) => Math.abs(z - d) < 1.8);
  for (const n of [-1, 1]) for (const d of doors(n)) pane(b, n < 0 ? x0 : x1, S + 1.75, d, [n, 0], 3.4, 3.2, DOOR);
  sign(b, CELL_OF(SHED.name), x0, eaves - 0.55, (z0 + z1) / 2, [-1, 0], 3.6, 0.6);
  sign(b, CELL_OF(SHED.name), (x0 + x1) / 2, eaves + 0.4, z0 - 0.3, [0, -1], 3.0, 0.5);
  b.detail(() => {
    // The cladding's ribs (near), a strip of windows under the eaves
    if (!low)
      for (let z = z0 + 0.6; z < z1 - 0.3; z += 0.9)
        for (const [x, n] of [[x0, -1], [x1, 1]] as const) if (!doorAt(z, n)) pane(b, x, (S + eaves - 1.0) / 2, z, [n, 0], 0.07, eaves - 1.0 - S, CLAD_RIB);
    for (let z = z0 + 1; z < z1 - 0.8; z += 1.8) for (const [x, n] of [[x0, -1], [x1, 1]] as const) pane(b, x, eaves - 0.5, z, [n, 0], 1.2, 0.45, GLASS);
  });
}
/** The old rails set in the east quay, from the avenue's sidewalk to Quay Road's */
function drawOldRails(b: Batch) {
  for (const x of [-252.4, -251.6]) for (let z = 142.4; z < 199.6 - 1e-6; z += 19) box(b, x - 0.04, S + 0.004, z, x + 0.04, S + 0.014, Math.min(199.6, z + 19), RAIL);
}
function drawDryDock(b: Batch, low: boolean) {
  const [x0, z0, x1, z1] = COASTER.rect;
  // On its keel blocks, its hull rust red below where the water comes, dark green over it
  for (let x = x0 + 0.8; x < x1 - 0.6; x += 1.6) box(b, x - 0.3, DOCK_FLOOR, (z0 + z1) / 2 - 0.5, x + 0.3, COASTER.keel, (z0 + z1) / 2 + 0.5, toon('#6b5a44'));
  hull(b, COASTER.rect, 3.2, COASTER.keel, -0.6, RUST, true);
  hull(b, [x0 + 0.004, z0 + 0.004, x1 - 0.004, z1 - 0.004], 3.2, -0.6, COASTER.deck, GREEN, true);
  const { bridge } = COASTER;
  box(b, bridge.x0, COASTER.deck, z0 + 0.5, bridge.x1, bridge.top, z1 - 0.5, WHITE);
  pane(b, bridge.x0, bridge.top - 0.5, (z0 + z1) / 2, [-1, 0], z1 - z0 - 1.4, 0.5, GLASS);
  box(b, bridge.x0 + 1.2, bridge.top, (z0 + z1) / 2 - 0.1, bridge.x0 + 1.4, bridge.top + 1.5, (z0 + z1) / 2 + 0.1, STEEL);
  for (const [z, n] of [
    [z1, 1],
    [z0, -1],
  ] as const)
    sign(b, CELL_OF(COASTER.name), x0 + 4.6, COASTER.deck - 0.6, z, [0, n], 3.0, 0.45);
  // The railing round the pit: yellow posts and two rails on its three quay sides and along the caisson
  const [dx0, dz0, dx1, dz1] = DRY_DOCK;
  const cx = dx0 + CAISSON;
  const rail = (ax: number, az: number, bx: number, bz: number) => {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / 1.6));
    for (let k = 0; k <= n; k++) {
      const [x, z] = [ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n];
      box(b, x - 0.04, S, z - 0.04, x + 0.04, S + 1.0, z + 0.04, PAINT_Y);
    }
    for (const y of [0.5, 0.95]) beam(b, [ax, S + y, az], [bx, S + y, bz], 0.05, PAINT_Y);
  };
  rail(cx + 0.25, dz0 - 0.25, dx1 + 0.25, dz0 - 0.25);
  rail(cx + 0.25, dz1 + 0.25, dx1 + 0.25, dz1 + 0.25);
  rail(dx1 + 0.25, dz0 - 0.25, dx1 + 0.25, dz1 + 0.25);
  rail(cx - 0.15, dz0 + 0.1, cx - 0.15, dz1 - 0.1);
  b.detail(() => {
    // Shores from the pit's walls to the hull's sides, steps down the east wall
    for (let x = x0 + 2; x < x1 - 1; x += 2.6)
      for (const [zw, zh] of [
        [dz0, z0],
        [dz1, z1],
      ])
        beam(b, [x, -1.4, zw], [x, -0.9, zh], 0.18, toon('#6b5a44'));
    if (!low) for (let k = 0; k < 8; k++) box(b, dx1 - 0.6, DOCK_FLOOR + k * 0.45, dz0 + 1 + k * 0.45, dx1, DOCK_FLOOR + (k + 1) * 0.45, dz0 + 1.45 + k * 0.45, CONCRETE);
  });
}
function drawTugs(b: Batch, low: boolean) {
  for (const t of TUGS) {
    const r: Rect = [t.x - t.B / 2, t.z - t.L / 2, t.x + t.B / 2, t.z + t.L / 2];
    const hullTop = WATER_Y + (t.kind === 'tug' ? 1.3 : 1.0);
    hull(b, r, t.L * 0.3, WATER_Y - 0.5, hullTop, t.kind === 'tug' ? BLACK : ORANGE);
    // A red fender round the bow, the wheelhouse forward of the middle, a stack behind it
    box(b, r[0] - 0.08, hullTop - 0.35, r[1] + t.L * 0.3, r[2] + 0.08, hullTop - 0.1, r[3] - 0.2, t.kind === 'tug' ? BOOT : BLACK);
    // The deckhouse, the wheelhouse on it glazed all round under a dark roof, a mast with its lights; a tug's stack
    const [hw, f0, f1] = [t.B / 2 - 0.3, t.z - t.L * 0.2, t.z + t.L * 0.22];
    const dy = hullTop + 0.75;
    box(b, t.x - hw, hullTop, f0, t.x + hw, dy, f1, WHITE);
    const [ww, w0, w1] = [hw - 0.18, f0 + 0.1, t.z + t.L * 0.02];
    const hy = dy + (t.kind === 'tug' ? 0.95 : 0.8);
    box(b, t.x - ww, dy, w0, t.x + ww, hy, w1, WHITE);
    const gy = hy - 0.32;
    pane(b, t.x, gy, w0, [0, -1], ww * 2 - 0.12, 0.4, GLASS);
    pane(b, t.x, gy, w1, [0, 1], ww * 2 - 0.12, 0.4, GLASS);
    for (const s of [-1, 1] as const) pane(b, t.x + s * ww, gy, (w0 + w1) / 2, [s, 0], w1 - w0 - 0.12, 0.4, GLASS);
    box(b, t.x - ww - 0.12, hy, w0 - 0.15, t.x + ww + 0.12, hy + 0.1, w1 + 0.12, t.kind === 'tug' ? BLACK : ORANGE);
    box(b, t.x - 0.04, hy + 0.1, (w0 + w1) / 2 - 0.04, t.x + 0.04, hy + 1.0, (w0 + w1) / 2 + 0.04, STEEL);
    box(b, t.x - 0.07, hy + 1.0, (w0 + w1) / 2 - 0.07, t.x + 0.07, hy + 1.12, (w0 + w1) / 2 + 0.07, WARN);
    sign(b, CELL_OF(t.name), t.x + hw, (hullTop + dy) / 2, (f0 + f1) / 2, [1, 0], 1.3, 0.26);
    if (t.kind === 'tug')
      for (const s of [-1, 1]) {
        box(b, t.x + s * 0.32 - 0.16, dy, w1 + 0.25, t.x + s * 0.32 + 0.16, hy + 0.35, w1 + 0.6, ORANGE);
        box(b, t.x + s * 0.32 - 0.16, hy + 0.35, w1 + 0.25, t.x + s * 0.32 + 0.16, hy + 0.5, w1 + 0.6, BLACK);
      }
    if (!low)
      b.detail(() => {
        for (let k = 0; k < 4; k++)
          for (const s of [-1, 1]) b.add(new THREE.TorusGeometry(0.2, 0.08, 6, 10).rotateY(Math.PI / 2).translate(t.x + s * (t.B / 2 + 0.05), hullTop - 0.35, t.z - t.L * 0.2 + k * 0.9), TYRE);
      });
  }
}

/* ---------- The yards ---------- */

function drawWarehouse(b: Batch, w: (typeof WAREHOUSES)[number], low: boolean) {
  const k = kit(b, WORLD);
  const [x0, z0, x1, z1] = w.rect;
  const top = S + w.h;
  const band = ATLAS.wall[w.brick];
  k.all(() => walls(k, band, w.rect, S, top, w.n * 0.13));
  flatRoof(b, w.rect, top, toon('#4a2f35'), 0.5, 0.2);
  // A stone base and a band of stone at the top, its number on a board over the front
  box(b, x0 - 0.04, S, z0 - 0.04, x1 + 0.04, S + 0.5, z1 + 0.04, STONE);
  box(b, x0 - 0.08, top - 0.6, z0 - 0.08, x1 + 0.08, top - 0.35, z1 + 0.08, STONE);
  sign(b, CELL_OF(`WAREHOUSE ${w.n}`), (x0 + x1) / 2, top - 1.3, z0 - 0.08, [0, -1], 6.4, 0.8);
  // The loading dock behind: a platform the trucks back up to, roll-up doors over it
  box(b, x0 + 1, S, z1, x1 - 1, S + 0.95, z1 + 1.6, CONCRETE);
  for (let u = x0 + 2.5; u < x1 - 2; u += 4.2) pane(b, u + 1.4, S + 0.95 + 1.5, z1, [0, 1], 2.8, 3.0, DOOR);
  b.detail(() => {
    for (let u = x0 + 2.5; u < x1 - 2; u += 4.2) box(b, u + 0.3, S + 0.2, z1 + 1.6, u + 0.6, S + 0.85, z1 + 1.75, TYRE);
    if (!low) for (let u = x0 + 3; u < x1 - 2; u += 6) box(b, u, top, (z0 + z1) / 2 - 0.6, u + 1.4, top + 0.9, (z0 + z1) / 2 + 0.6, GREY);
  });
}
function drawFuel(b: Batch, low: boolean) {
  const [x0, z0, x1, z1] = FUEL.bund;
  const h = FUEL.wall;
  const gap = [(x0 + x1) / 2 - 1.5, (x0 + x1) / 2 + 1.5];
  box(b, x0, S, z0, x0 + 0.3, h, z1, CONCRETE);
  box(b, x1 - 0.3, S, z0, x1, h, z1, CONCRETE);
  box(b, x0 + 0.3, S, z1 - 0.3, x1 - 0.3, h, z1, CONCRETE);
  box(b, x0 + 0.3, S, z0, gap[0], h, z0 + 0.3, CONCRETE);
  box(b, gap[1], S, z0, x1 - 0.3, h, z0 + 0.3, CONCRETE);
  for (const t of FUEL.tanks) {
    cyl(b, t.r, t.h - S, t.x, S, t.z, TANK, low ? 16 : 28);
    cyl(b, t.r + 0.01, 0.5, t.x, t.h - 1.4, t.z, toon('#b0302d'), low ? 16 : 28);
    b.add(new THREE.ConeGeometry(t.r, 0.6, low ? 16 : 28).translate(t.x, t.h + 0.3, t.z), TANK);
    b.detail(() => {
      // A stair up its side, a rail round its roof
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 0.8;
        const y = S + ((t.h - S) * k) / 14;
        box(b, t.x + Math.cos(a) * (t.r + 0.25) - 0.25, y, t.z + Math.sin(a) * (t.r + 0.25) - 0.25, t.x + Math.cos(a) * (t.r + 0.25) + 0.25, y + 0.06, t.z + Math.sin(a) * (t.r + 0.25) + 0.25, STEEL);
      }
      if (!low) b.add(new THREE.TorusGeometry(t.r - 0.2, 0.04, 4, 32).rotateX(Math.PI / 2).translate(t.x, t.h + 0.7, t.z), STEEL);
    });
  }
}
function drawTrucks(b: Batch, low: boolean) {
  for (const { x, z, line } of TRUCKS) {
    // The trailer's chassis (its front over the rig's fifth wheel), its wheels, a box on it
    const [c0, c1] = [z - TRUCK_BODY / 2 + 1.4, z + TRUCK_BODY / 2];
    box(b, x - 0.55, S + 0.75, c0, x + 0.55, S + 1.0, c1, STEEL);
    for (const dz of [c1 - 1.1, c1 - 0.5]) for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.22, low ? 6 : 10).rotateZ(Math.PI / 2).translate(x + s * 0.5, S + 0.3, dz), TYRE);
    container(b, [x - BOX.W / 2, c1 - BOX.L, x + BOX.W / 2, c1], S + 1.0, line, low, line % 2 === 0);
  }
}

/* ---------- Landmarks ---------- */

function drawHarbourMaster(b: Batch, low: boolean) {
  const H = HARBOUR_MASTER;
  const k = kit(b, WORLD);
  const [x0, z0, x1, z1] = H.rect;
  const top = S + H.h - 0.15;
  const [tx0, tz0, tx1, tz1] = H.tower;
  const ttop = S + H.towerH - 0.15;
  k.all(() => {
    walls(k, ATLAS.wall.brickTan, [x0, z0, tx0, z1], S, top, 0.2);
    walls(k, ATLAS.wall.brickTan, H.tower, S, ttop, 0.6);
  });
  flatRoof(b, [x0, z0, tx0, z1], top, STONE);
  // The tower's cornice, its copper pyramid, the mast with its yard and flag
  box(b, tx0 - 0.15, ttop - 0.4, tz0 - 0.15, tx1 + 0.15, ttop, tz1 + 0.15, STONE);
  const [cx, cz] = [(tx0 + tx1) / 2, (tz0 + tz1) / 2];
  b.add(new THREE.ConeGeometry(Math.hypot(tx1 - tx0, tz1 - tz0) / 2 + 0.1, 1.2, 4).rotateY(Math.PI / 4).translate(cx, ttop + 0.6, cz), COPPER);
  box(b, cx - 0.06, ttop + 1.0, cz - 0.06, cx + 0.06, S + H.mast, cz + 0.06, WHITE);
  box(b, cx - 1.0, S + H.mast - 1.2, cz - 0.04, cx + 1.0, S + H.mast - 1.12, cz + 0.04, WHITE);
  box(b, cx + 0.06, S + H.mast - 0.8, cz - 0.02, cx + 1.3, S + H.mast - 0.1, cz + 0.02, toon('#1f4e8c'));
  // The clock on three faces of the tower, its name over the door, the door with its stone surround and a canopy
  for (const [x, z, n] of [
    [cx, tz0 - 0.15, [0, -1]],
    [tx1 + 0.15, cz, [1, 0]],
    [tx0 - 0.15, cz, [-1, 0]],
  ] as [number, number, Pt][])
    sign(b, CLOCK_CELL, x, ttop - 1.6, z, n, 1.5, 1.5, PAINTED, 0, 0.125);
  sign(b, 1, (x0 + tx0) / 2, top - 0.9, z0 - 0.05, [0, -1], 5.2, 0.66, LIT_SIGN);
  const { x: dx } = H.door;
  box(b, dx - 0.95, S, z0 - 0.12, dx + 0.95, S + 2.6, z0, STONE);
  pane(b, dx, S + 1.15, z0 - 0.12, [0, -1], 1.2, 2.1, toon('#3a2a20'));
  box(b, dx - 1.3, S + 2.6, z0 - 1.0, dx + 1.3, S + 2.75, z0, toon('#122038'));
  box(b, x0 - 0.05, S, z0 - 0.05, x1 + 0.05, S + 0.45, z1 + 0.05, STONE);
  b.detail(() => {
    for (const s of [-1, 1]) box(b, dx + s * 1.15 - 0.1, S + 2.0, z0 - 0.3, dx + s * 1.15 + 0.1, S + 2.35, z0 - 0.1, LANTERN);
    if (!low) for (const s of [-1, 1]) box(b, dx + s * 1.25 - 0.04, S + 2.75, z0 - 0.95, dx + s * 1.25 + 0.04, S, z0 - 0.88, toon('#122038'));
  });
}
function drawLighthouse(b: Batch, low: boolean) {
  const { x, z, r, gallery, top } = LIGHTHOUSE;
  const seg = low ? 12 : 20;
  // A tapering tower in red and white bands, the gallery, the lantern, a red dome
  const bands = 6;
  for (let i = 0; i < bands; i++) {
    const [y0, y1] = [S + ((gallery - S) * i) / bands, S + ((gallery - S) * (i + 1)) / bands];
    const [ra, rb] = [r - (r - 0.9) * (i / bands), r - (r - 0.9) * ((i + 1) / bands)];
    b.add(new THREE.CylinderGeometry(rb, ra, y1 - y0, seg, 1, true).translate(x, (y0 + y1) / 2, z), i % 2 ? WHITE : RED);
  }
  cyl(b, 1.3, 0.2, x, gallery, z, STEEL, seg);
  cyl(b, 0.7, 1.1, x, gallery + 0.2, z, LANTERN, seg);
  b.add(new THREE.SphereGeometry(0.78, seg, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, gallery + 1.3, z), RED);
  box(b, x - 0.04, gallery + 2.05, z - 0.04, x + 0.04, top, z + 0.04, STEEL);
  b.detail(() => {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      box(b, x + Math.cos(a) * 1.22 - 0.03, gallery + 0.2, z + Math.sin(a) * 1.22 - 0.03, x + Math.cos(a) * 1.22 + 0.03, gallery + 0.85, z + Math.sin(a) * 1.22 + 0.03, STEEL);
    }
    b.add(new THREE.TorusGeometry(1.22, 0.035, 4, seg).rotateX(Math.PI / 2).translate(x, gallery + 0.85, z), STEEL);
    pane(b, x, S + 1.0, z - r * 0.98, [0, -1], 0.7, 1.6, toon('#2a2b38'));
  });
}
function drawMast(b: Batch, x: number, z: number, low: boolean) {
  cyl(b, 0.14, MAST_H - 0.6 - S, x, S, z, STEEL, low ? 6 : 8, 0.22);
  box(b, x - 0.9, MAST_H - 0.8, z - 0.9, x + 0.9, MAST_H - 0.55, z + 0.9, STEEL);
  for (const [dx, dz] of [
    [-0.55, -0.55],
    [0.55, -0.55],
    [-0.55, 0.55],
    [0.55, 0.55],
  ])
    box(b, x + dx - 0.28, MAST_H - 0.55, z + dz - 0.28, x + dx + 0.28, MAST_H - 0.25, z + dz + 0.28, SODIUM);
  if (!low) b.detail(() => box(b, x + 0.18, S + 2.4, z - 0.15, x + 0.24, MAST_H - 0.8, z + 0.15, STEEL));
}

/* ---------- Sites ---------- */

const pad = (r: Rect, m: number): Rect => [r[0] - m, r[1] - m, r[2] + m, r[3] + m];
const each = (id: string, rect: Rect, draw: (b: Batch) => void, cast = true) =>
  site(id, rect, (into) => {
    const b = new Batch();
    draw(b);
    b.build(into, { cast, receive: true });
  });

export function register({ low, scene }: { low: boolean; scene?: THREE.Scene | null }) {
  CRANES.forEach((c, i) => each(`docks crane ${i}`, craneRect(c), (b) => drawCrane(b, c, low)));
  each('docks ship', pad(SHIP.rect, 3), (b) => drawShip(b, low));
  each('docks crane rails', [LAND_RAIL - 1, 142, SEA_RAIL + 1, 200], drawRails, false);
  STACK_BLOCKS.forEach((r, i) =>
    each(`docks stacks ${i}`, pad(r, 0.5), (b) =>
      STACKS.forEach((k, j) => k.rect[0] >= r[0] - 1e-6 && k.rect[2] <= r[2] + 1e-6 && k.rect[1] >= r[1] - 1e-6 && k.rect[3] <= r[3] + 1e-6 && stack(b, k, S, low, j))
    )
  );
  each('docks gate', [GATE.x - 2, GATE.z0 - 1, -357, GATE.z1 + 1], (b) => drawGate(b, low));
  each('docks carriers', [SEA_RAIL - 10, 143, SEA_RAIL + 1, 185], (b) => {
    for (const [x, z] of STRADDLES) straddle(b, x, z, low);
    reachStacker(b, low);
  });
  each('docks shed', pad(SHED.rect, 1), (b) => drawShed(b, low));
  each('docks old rails', [-253, 142, -251, 200], drawOldRails, false);
  each('docks dry dock', pad(DRY_DOCK, 1), (b) => drawDryDock(b, low));
  each('docks tugs', [BASIN[2] - 4, 148, BASIN[2], 170], (b) => drawTugs(b, low));
  WAREHOUSES.forEach((w, i) => each(`docks warehouse ${i}`, pad(w.rect, 2), (b) => drawWarehouse(b, w, low)));
  each('docks fuel', pad(FUEL.bund, 1), (b) => drawFuel(b, low));
  each('docks truck park', [-358, 235, -300, 274], (b) => drawTrucks(b, low));
  each('docks harbour master', pad(HARBOUR_MASTER.rect, 2), (b) => drawHarbourMaster(b, low));
  each('docks lighthouse', pad([LIGHTHOUSE.x, LIGHTHOUSE.z, LIGHTHOUSE.x, LIGHTHOUSE.z], 2), (b) => drawLighthouse(b, low));
  MASTS.forEach(([x, z], i) => each(`docks mast ${i}`, [x - 2, z - 2, x + 2, z + 2], (b) => drawMast(b, x, z, low)));
  // The truck park's rigs: the traffic's own Heavy Haul tractors, parked facing north (+x turned to -z; the main thread's)
  const paints = ['#e23b3b', '#2a3b66', '#f3f2f7', '#1f6b4a', '#ff8a3d'];
  if (scene) parkedCars(scene, S, TRUCKS.map(({ x, z }, i): [CarId, number, number, number, string] => ['rig', x, z - TRUCK_BODY / 2 + 1.5, Math.PI / 2, paints[i % paints.length]]));
}
