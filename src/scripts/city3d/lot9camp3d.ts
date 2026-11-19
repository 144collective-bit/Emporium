/*
 * The Field drawn (docs/trailer-plan.md's polish round; the data is lot9camp.ts), part of Lot 9's chunk (lot9-3d.ts
 * `register()` calls `registerCamp()`): its dirt track in stretches, a site a pitch (domes, ridge and cabin tents,
 * travel trailers and teardrops, vans' awnings, pallet-and-tarp shacks, bus conversions; fire rings, camp chairs,
 * canopies over tables, stoves, washing lines, coolers, jerrycans, generators, firewood, solar panels, pallets,
 * dishes, flags, lanterns, potted plants, decks, the dogs' stakes), the commons (the shower and toilet block, the
 * porta-potties, the standpipe and trough, the big fire circle and its logs, the camp kitchen, the firewood pile, the
 * washing line, the dumpster corral, the notice board, THE FIELD over the old fence's gap, the vegetable patch and
 * the chicken coop) and by the park's gate the dumpsters, the ice chest, the drinks machine and the propane cage. One
 * sign atlas of fixed made-up copy. On the main thread: the fires' glow (one mesh). Phones leave out the finest.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Batch, FONT_DISPLAY, canvasTex, fx, glowMat, lit, neon, siteMat, toon } from './kit';
import { site } from './tilework';
import { buildFx, chainMesh, poster } from './grime';
import { COVER } from './palette';
import { CAMP_X1, FIELD, FIELD_TREES, TRACK_HALF, TRACK_LOOP, TRACK_SPUR, rng, type Pt, type Rect } from './lot9';
import { DROPS, POLE, POLE_LINES, type Home, type YardThing } from './lot9homes';
import {
  BEDS, CIRCLE, COOP, COOP_RUN, CORRAL, DUMPSTERS, FIELD_ARCH, GARDEN, GATE_DUMPSTERS, GRILL, ICE, KITCHEN, KITCHEN_TABLES, LOGS, NOTICE, PITCHES, POTTIES, POTTY_H, PROPANE_CAGE,
  SHOWERS, SHOWER_DOORS, SINK, STANDPIPE, TROUGH, VENDING, WASHING, WOODPILE, aabbOf, type Item,
} from './lot9camp';

/* ---------- Paint ---------- */

const DIRT = toon(COVER.dirt);
const DIRT_DARK = toon(COVER.bare);
const ASH = toon('#3a3634');
const PUDDLE = toon('#2a2b3b');
const STONE = toon('#8a8794');
const STONE_DARK = toon('#6c6977');
const BLOCK = toon('#7c7a82');
const ROOF_TIN = toon('#9a9aa2');
const RUST = toon('#7a4a32');
const WOOD = toon('#8a6a48');
const WOOD_GREY = toon('#857c70');
const PALLET = toon('#b0905e');
const POST = toon('#9ea2b4');
const STEEL = toon('#5a5d6e');
const BLACK = toon('#1c1b22');
const TYRE = toon('#1a1820');
const GLASS = toon('#1e2033');
const WHITE = toon('#e8e4d8');
const SOOT = toon('#1b1818');
const GREEN = toon('#4f7a3a');
const LEAF = toon('#3d6a34');
const SOIL = toon('#4a3a2c');
const TERRACOTTA = toon('#b0603a');
const TENTS = ['#d8641f', '#2f6a4a', '#3a5f9a', '#8a8a7a', '#b8392f', '#c9a23a', '#5a4a7a', '#3d7a7a'].map((c) => toon(c));
const TARPS = ['#2f5fa8', '#3d7a4a', '#8a6a3c', '#5a6b8a', '#a0a29a'].map((c) => toon(c));
const CLOTH = ['#c23b3b', '#e8e4d8', '#2f5fa8', '#f2c230', '#3d7a4a', '#d27aa0', '#2a2622', '#8a6a48'].map((c) => toon(c));
const CREAM = ['#e0d8c0', '#d8cfae', '#cfd8d0', '#e2d2c0'].map((c) => toon(c));
const STRIPE = ['#b8572f', '#3d6a8a', '#6a8a3d', '#8a3a5a'].map((c) => toon(c));
const BUS_PAINT = ['#c9a23a', '#5f7a5a', '#d8d0c0'].map((c) => toon(c));
const FLAME = neon('#ff8a2a', 0.9, 2.2, 0.6);
const FLAME_CORE = neon('#ffd23f', 0.9, 2.4, 0.4);
const EMBER = neon('#ff5a2a', 0.5, 1.6, 0.3);
const LAMP = neon('#ffc870', 0.15, 2.0);
const STRING = neon('#ffd9a0', 0.15, 2.0);
const WARM = neon('#ffd9a0', 0.03, 1.1);
const DRINKS = neon('#e6f0ff', 0.5, 1.2);
const XMAS = [neon('#ff3b3b', 0.2, 2.0), neon('#3bff6a', 0.2, 2.0), neon('#3b8aff', 0.2, 2.0), neon('#ffd23f', 0.2, 2.0)];

/* ---------- Signs: one small atlas, a row each ---------- */

const ROWS: { text: string; bg: string; fg: string }[] = [
  { text: 'THE FIELD', bg: '#3d4a33', fg: '#e8e2cc' },
  { text: 'SHOWERS', bg: '#2a3346', fg: '#e8e2cc' },
  { text: 'TOILETS', bg: '#2a3346', fg: '#e8e2cc' },
  { text: 'FIREWOOD · HONOUR BOX', bg: '#7a5a3a', fg: '#f3ecd8' },
  { text: 'DRINKING WATER', bg: '#2f5fa8', fg: '#f3ecd8' },
  { text: 'QUIET AFTER 10', bg: '#f1ece0', fg: '#1b1a20' },
  { text: 'PROPANE', bg: '#b8261f', fg: '#f3ecd8' },
  { text: 'ICE', bg: '#dfe8ff', fg: '#2f5fa8' },
];
const SIGN_ROW = { field: 0, showers: 1, toilets: 2, firewood: 3, water: 4, quiet: 5, propane: 6, ice: 7 } as const;
const ATLAS = canvasTex(512, 512, (c) => {
  const r = rng(4242);
  ROWS.forEach((row, i) => {
    const y = i * 64;
    c.fillStyle = row.bg;
    c.fillRect(0, y, 512, 64);
    c.strokeStyle = row.fg;
    c.lineWidth = 3;
    c.strokeRect(5, y + 5, 502, 54);
    c.fillStyle = row.fg;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    let size = 40;
    c.font = `800 ${size}px ${FONT_DISPLAY}`;
    const w = c.measureText(row.text).width;
    if (w > 470) {
      size = Math.floor((size * 470) / w);
      c.font = `800 ${size}px ${FONT_DISPLAY}`;
    }
    c.fillText(row.text, 256, y + 35);
    // (hand-painted and weathered)
    c.fillStyle = 'rgba(60,40,30,0.3)';
    for (let k = 0; k < 26; k++) c.fillRect(r() * 512, y + r() * 64, 2 + r() * 8, 1 + r() * 3);
  });
});
const SIGN = siteMat('lot9-camp-sign', lit(new THREE.MeshBasicMaterial({ map: ATLAS }), 0.9, 1.05));
/** A sign from the atlas facing n (x, z), its middle at (x, y, z) */
function sign(b: Batch, row: number, x: number, y: number, z: number, n: Pt, w: number, h: number) {
  const g = new THREE.PlaneGeometry(w, h);
  const [v0, v1] = [1 - (row * 64 + 64) / 512, 1 - (row * 64) / 512];
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, v1, 1, v1, 0, v0, 1, v0], 2));
  b.add(g.rotateY(Math.atan2(n[0], n[1])).translate(x + n[0] * 0.012, y, z + n[1] * 0.012), SIGN);
}

/* ---------- Helpers ---------- */

/** A box round the origin: w across (its own x), h up from y, d deep (its own z), its middle at (x, z) */
const bx = (w: number, h: number, d: number, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);
/** A geometry made in an item's own frame, turned and set where the item is */
const at = (b: Batch, it: { x: number; z: number; ry: number }, g: THREE.BufferGeometry, m: THREE.Material) => b.add(g.rotateY(it.ry).translate(it.x, 0, it.z), m);
const rbox = (b: Batch, r: Rect, y0: number, h: number, m: THREE.Material) => b.box(r[0], y0, r[1], r[2] - r[0], h, r[3] - r[1], m);
const post = (b: Batch, x: number, z: number, y0: number, h: number, r: number, m: THREE.Material, seg = 5) => b.add(new THREE.CylinderGeometry(r, r, h, seg, 1, true).translate(x, y0 + h / 2, z), m);
/** A rod between two points */
function rod(b: Batch, a: THREE.Vector3, c: THREE.Vector3, r: number, m: THREE.Material, seg = 4) {
  const g = new THREE.CylinderGeometry(r, r, a.distanceTo(c), seg, 1, true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.clone().sub(a).normalize()));
  b.add(g.translate((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2), m);
}
/** A sagging line from a to c (a few straight pieces, `sag` down at the middle) */
function sagLine(b: Batch, a: THREE.Vector3, c: THREE.Vector3, sag: number, r: number, m: THREE.Material, n = 5) {
  let p = a.clone();
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    const q = a.clone().lerp(c, t);
    q.y -= Math.sin(t * Math.PI) * sag;
    rod(b, p, q, r, m, 3);
    p = q;
  }
}
/** A profile (its own x along, y up) extruded d deep across its own z, centred */
function profile(shape: THREE.Shape, d: number, curve = 6) {
  return new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, curveSegments: curve }).translate(0, 0, -d / 2);
}
/** A flat patch on the ground (its own ellipse) */
const patch = (b: Batch, x: number, z: number, rx: number, rz: number, ry: number, y: number, m: THREE.Material, seg = 10) =>
  b.add(new THREE.CircleGeometry(1, seg).rotateX(-Math.PI / 2).scale(rx, 1, rz).rotateY(ry).translate(x, y, z), m);
const tyre = (b: Batch, it: { x: number; z: number; ry: number }, x: number, z: number, r: number, low: boolean) =>
  at(b, it, new THREE.CylinderGeometry(r, r, 0.18, low ? 8 : 12).rotateX(Math.PI / 2).translate(x, r, z), TYRE);

/* ---------- The shelters ---------- */

/** A dome tent: a squashed half sphere, its door on its front (the track's side, its own -z), the fly's poles over it */
function dome(b: Batch, it: Item, low: boolean) {
  const m = TENTS[it.tone % TENTS.length];
  at(b, it, new THREE.SphereGeometry(1, low ? 8 : 12, low ? 3 : 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(it.w / 2, it.h, it.d / 2), m);
  // (the door: a darker panel of the dome on its front, a hair outside it)
  const door = new THREE.SphereGeometry(1, 4, 3, (3 * Math.PI) / 2 - 0.38, 0.76, 0.7, Math.PI / 2 - 0.7).scale(it.w / 2 + 0.012, it.h + 0.012, it.d / 2 + 0.012);
  at(b, it, door, TENTS[(it.tone + 3) % TENTS.length]);
  b.detail(() => {
    if (low) return;
    // (the poles crossing over it)
    for (const s of [-1, 1]) {
      const g = new THREE.TorusGeometry(1, 0.012, 3, 10, Math.PI).scale(it.w / 2 + 0.01, it.h + 0.01, 1).rotateY((s * Math.PI) / 4);
      at(b, it, g, BLACK);
    }
  });
}
/** A ridge tent: a triangle along its own z, its door on the front */
function ridge(b: Batch, it: Item, low: boolean) {
  const m = TENTS[it.tone % TENTS.length];
  const s = new THREE.Shape();
  s.moveTo(-it.w / 2, 0);
  s.lineTo(it.w / 2, 0);
  s.lineTo(0, it.h);
  s.closePath();
  // (along its own z: the profile is across x, extruded along z)
  at(b, it, profile(s, it.d), m);
  // The door flap, a pole at each end
  const door = new THREE.Shape();
  door.moveTo(-it.w * 0.22, 0);
  door.lineTo(it.w * 0.22, 0);
  door.lineTo(0, it.h * 0.75);
  door.closePath();
  at(b, it, new THREE.ShapeGeometry(door).rotateY(Math.PI).translate(0, 0, -it.d / 2 - 0.01), TENTS[(it.tone + 2) % TENTS.length]);
  if (!low) for (const z of [-it.d / 2 - 0.05, it.d / 2 + 0.05]) at(b, it, new THREE.CylinderGeometry(0.015, 0.015, it.h + 0.1, 3, 1, true).translate(0, (it.h + 0.1) / 2, z), BLACK);
}
/** A family cabin tent: upright walls with windows, a low ridge roof in another colour, the door on the front */
function cabin(b: Batch, it: Item, low: boolean) {
  const wall = 1.3;
  const [m, roof] = [TENTS[it.tone % TENTS.length], TENTS[(it.tone + 3) % TENTS.length]];
  at(b, it, bx(it.w, wall, it.d), m);
  const s = new THREE.Shape();
  s.moveTo(-it.w / 2 - 0.08, 0);
  s.lineTo(it.w / 2 + 0.08, 0);
  s.lineTo(0, it.h - wall);
  s.closePath();
  // (the roof's ridge along its own x: the profile across z, so turned a quarter)
  at(b, it, profile(s, it.w + 0.1).rotateY(Math.PI / 2).scale(1, 1, (it.d + 0.16) / (it.w + 0.16)).translate(0, wall, 0), roof);
  at(b, it, bx(1.0, 1.15, 0.02, -0.3, 0, -it.d / 2 - 0.01), roof);
  b.detail(() => {
    if (low) return;
    for (const x of [-it.w / 2 + 0.6, it.w / 2 - 0.6]) at(b, it, bx(0.7, 0.4, 0.02, x, 0.7, -it.d / 2 - 0.01), GLASS);
    for (const z of [-it.d / 4, it.d / 4]) for (const sx of [-1, 1]) at(b, it, bx(0.02, 0.38, 0.6, sx * (it.w / 2 + 0.01), 0.7, z), GLASS);
  });
}
/** A travel trailer: its rounded body on its axle along its own x, a stripe, windows, the door on the front, the
 * A-frame hitch with the propane bottles and the jack, stabiliser legs, a skirt of tarp on the long stays */
function trailer(b: Batch, it: Item, low: boolean) {
  const [L, D, H] = [it.w, it.d, it.h];
  const y0 = 0.38;
  const s = new THREE.Shape();
  const R = 0.45;
  s.moveTo(-L / 2, y0);
  s.lineTo(L / 2, y0);
  s.lineTo(L / 2, H - R);
  s.quadraticCurveTo(L / 2, H, L / 2 - R, H);
  s.lineTo(-L / 2 + R, H);
  s.quadraticCurveTo(-L / 2, H, -L / 2, H - R);
  s.closePath();
  at(b, it, profile(s, D), CREAM[it.tone % CREAM.length]);
  // The stripe down both sides, the windows, the door
  for (const sz of [-1, 1]) at(b, it, bx(L - 0.1, 0.12, 0.02, 0, H - 0.75, sz * (D / 2 + 0.01)), STRIPE[it.tone % STRIPE.length]);
  for (const x of [-L / 2 + 0.7, L / 2 - 0.9]) at(b, it, bx(0.8, 0.42, 0.02, x, 0.95, -D / 2 - 0.012), (it.tone & 1) === 0 ? WARM : GLASS);
  at(b, it, bx(0.55, 0.5, 0.02, 0.3, 0.95, D / 2 + 0.012), GLASS);
  at(b, it, bx(0.6, 1.05, 0.02, -0.25, y0 + 0.05, -D / 2 - 0.014), CREAM[(it.tone + 1) % CREAM.length]);
  tyre(b, it, 0.2, -D / 2 - 0.02, 0.28, low);
  tyre(b, it, 0.2, D / 2 + 0.02, 0.28, low);
  // The hitch, the bottles, the jack
  rod(b, w(it, -L / 2, 0.42, -0.45), w(it, -L / 2 - 0.9, 0.42, 0), 0.04, BLACK);
  rod(b, w(it, -L / 2, 0.42, 0.45), w(it, -L / 2 - 0.9, 0.42, 0), 0.04, BLACK);
  for (const z of [-0.18, 0.18]) at(b, it, new THREE.CylinderGeometry(0.13, 0.13, 0.5, 8).translate(-L / 2 - 0.35, 0.67, z), WHITE);
  at(b, it, new THREE.CylinderGeometry(0.03, 0.03, 0.42, 4).translate(-L / 2 - 0.8, 0.21, 0), STEEL);
  b.detail(() => {
    if (low) return;
    for (const x of [-L / 2 + 0.25, L / 2 - 0.25]) for (const z of [-D / 2 + 0.2, D / 2 - 0.2]) at(b, it, bx(0.05, y0, 0.05, x, 0, z), STEEL);
    // (the long stays: a tarp skirt round the bottom, a vent and the AC on the roof)
    if (it.tone % 3 === 0) for (const sz of [-1, 1]) at(b, it, bx(L - 0.6, y0 - 0.02, 0.02, 0.2, 0, sz * (D / 2 - 0.05)), TARPS[it.tone % TARPS.length]);
    at(b, it, bx(0.7, 0.24, 0.6, 0.4, H - 0.02, 0), WHITE);
  });
}
/** A teardrop: the rounded profile, a door each side, the galley hatch at its back */
function teardrop(b: Batch, it: Item, low: boolean) {
  const [L, D, H] = [it.w, it.d, it.h];
  const y0 = 0.32;
  const s = new THREE.Shape();
  s.moveTo(-L / 2, y0);
  s.lineTo(L / 2, y0);
  s.quadraticCurveTo(L / 2 + 0.05, H, L / 2 - 0.9, H);
  s.quadraticCurveTo(-L / 2 + 0.2, H, -L / 2, y0 + 0.3);
  s.closePath();
  at(b, it, profile(s, D, low ? 4 : 8), (it.tone & 1) ? WHITE : STEEL);
  for (const sz of [-1, 1]) at(b, it, bx(0.55, 0.55, 0.02, -0.1, 0.45, sz * (D / 2 + 0.01)), BLACK);
  tyre(b, it, 0, -D / 2 - 0.02, 0.24, low);
  tyre(b, it, 0, D / 2 + 0.02, 0.24, low);
  rod(b, w(it, -L / 2, 0.35, 0), w(it, -L / 2 - 0.7, 0.35, 0), 0.04, BLACK);
}
/** A shack of pallets and tarp: its walls, the gaps between the slats, a tin roof sloping back, a tarp down one side,
 * the doorway with a cloth over it, a plastic window, the stove's pipe through the roof, blocks under the corners */
function shack(b: Batch, it: Item, low: boolean) {
  const [W, D] = [it.w, it.d];
  const wall = 1.55;
  at(b, it, bx(W, wall, D), PALLET);
  b.detail(() => {
    if (low) return;
    // (the slats: dark gaps across the walls)
    for (let y = 0.2; y < wall - 0.1; y += 0.24) {
      at(b, it, bx(W + 0.01, 0.03, 0.02, 0, y, -D / 2 - 0.005), WOOD_GREY);
      at(b, it, bx(W + 0.01, 0.03, 0.02, 0, y, D / 2 + 0.005), WOOD_GREY);
    }
  });
  // The roof: corrugated tin, high at the front, overhanging
  const roof = bx(W + 0.4, 0.04, D + 0.5).rotateX(-0.22).translate(0, wall + 0.12, 0);
  at(b, it, roof, it.tone % 2 ? RUST : ROOF_TIN);
  // A tarp down one side, weighed with a tyre on the roof
  const side = it.tone % 2 ? 1 : -1;
  at(b, it, bx(0.02, wall + 0.05, D + 0.1, side * (W / 2 + 0.015), 0, 0), TARPS[it.tone % TARPS.length]);
  at(b, it, new THREE.TorusGeometry(0.25, 0.09, 4, 8).rotateX(Math.PI / 2).translate(side * 0.6, wall + 0.24, 0), TYRE);
  // The doorway and its cloth, a window of plastic sheet
  at(b, it, bx(0.75, 1.3, 0.02, -W * 0.2, 0, -D / 2 - 0.012), CLOTH[it.tone % CLOTH.length]);
  at(b, it, bx(0.6, 0.4, 0.02, W * 0.25, 0.75, -D / 2 - 0.012), (it.tone & 2) ? WARM : GLASS);
  // The stove's pipe, its cap
  at(b, it, new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6, 1, true).translate(W * 0.3, wall + 0.25, D * 0.15), STEEL);
  at(b, it, new THREE.ConeGeometry(0.13, 0.12, 6).translate(W * 0.3, wall + 0.75, D * 0.15), SOOT);
}
/** A bus conversion: its body, the rounded roof, the windows (some lit at night), the windscreen, bumpers, wheels, the
 * stove's pipe, solar panels and a roof rack */
function bus(b: Batch, it: Item, low: boolean) {
  const [L, D, H] = [it.w, it.d, it.h];
  const y0 = 0.4;
  const paint = BUS_PAINT[it.tone % BUS_PAINT.length];
  at(b, it, bx(L, H - y0 - 0.3, D, 0, y0), paint);
  at(b, it, new THREE.CylinderGeometry(D / 2, D / 2, L, low ? 6 : 10, 1, false, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2).scale(1, 0.3 / (D / 2), 1).translate(0, H - 0.3, 0), paint);
  for (let k = 0; k < 8; k++) {
    const x = -L / 2 + 1.1 + k * 0.78;
    for (const sz of [-1, 1]) at(b, it, bx(0.6, 0.42, 0.02, x, 0.95, sz * (D / 2 + 0.01)), (k + it.tone) % 3 === 0 ? WARM : GLASS);
  }
  at(b, it, bx(0.02, 0.6, D - 0.3, L / 2 + 0.01, 0.9, 0), GLASS);
  at(b, it, bx(0.08, 0.2, D + 0.04, L / 2 + 0.04, 0.4, 0), BLACK);
  at(b, it, bx(0.08, 0.2, D + 0.04, -L / 2 - 0.04, 0.4, 0), BLACK);
  for (const x of [L / 2 - 1.3, -L / 2 + 1.6]) for (const sz of [-1, 1]) tyre(b, it, x, sz * (D / 2 - 0.05), 0.36, low);
  // The door on the front side, the stove's pipe, the panels and rack up top
  at(b, it, bx(0.7, 1.2, 0.02, L / 2 - 0.7, y0, -D / 2 - 0.012), GLASS);
  at(b, it, new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6, 1, true).translate(-L / 2 + 1.2, H + 0.3, D * 0.2), STEEL);
  b.detail(() => {
    if (low) return;
    for (const x of [-1.0, 0.4]) at(b, it, bx(1.2, 0.05, D - 0.5, x, H + 0.05, 0).rotateZ(0.08), toon('#22305a'));
    at(b, it, bx(1.6, 0.04, D - 0.4, L / 2 - 1.4, H + 0.1, 0), STEEL);
    at(b, it, bx(1.2, 0.35, 0.8, L / 2 - 1.4, H + 0.14, 0), TARPS[it.tone % TARPS.length]);
  });
}
/** A world point in an item's own frame */
function w(it: { x: number; z: number; ry: number }, x: number, y: number, z: number) {
  const [c, s] = [Math.cos(it.ry), Math.sin(it.ry)];
  return new THREE.Vector3(it.x + c * x + s * z, y, it.z - s * x + c * z);
}

/* ---------- The living ---------- */

/** A fire ring: stones round the ash, the logs, burning or cold; a grate on two stones on some */
function fire(b: Batch, it: Item, low: boolean) {
  const n = low ? 7 : 10;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    b.add(new THREE.DodecahedronGeometry(0.11 + (k % 3) * 0.02, 0).scale(1, 0.7, 1).translate(it.x + Math.cos(a) * 0.4, 0.06, it.z + Math.sin(a) * 0.4), k % 2 ? STONE : STONE_DARK);
  }
  patch(b, it.x, it.z, 0.34, 0.34, 0, 0.026, ASH, 8);
  for (let k = 0; k < 3; k++) {
    const a = it.ry + (k / 3) * Math.PI;
    b.add(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 5).rotateZ(Math.PI / 2).rotateY(a).translate(it.x, 0.08 + k * 0.04, it.z), k === 1 ? SOOT : WOOD);
  }
  if (it.lit) {
    for (let i = 0; i < (low ? 2 : 4); i++) {
      const a = (i / 4) * Math.PI * 2 + it.ry;
      const o = i ? 0.1 : 0;
      b.add(new THREE.ConeGeometry(0.08, 0.32 + (i % 2) * 0.12, 5, 1, true).translate(it.x + Math.cos(a) * o, 0.28, it.z + Math.sin(a) * o), i ? FLAME : FLAME_CORE);
    }
    patch(b, it.x, it.z, 0.2, 0.2, 0, 0.03, EMBER, 6);
  } else if (it.tone % 3 === 0 && !low) {
    b.box(it.x - 0.3, 0.2, it.z - 0.22, 0.6, 0.02, 0.44, STEEL);
  }
}
/** A camp chair, its front to its own +z (turned to face the fire) */
function chair(b: Batch, it: Item, low: boolean) {
  const m = TARPS[it.tone % TARPS.length];
  at(b, it, bx(0.46, 0.04, 0.42, 0, 0.3, 0), m);
  at(b, it, bx(0.46, 0.44, 0.04, 0, 0.32, -0.2).rotateX(-0.18), m);
  if (low) return;
  for (const sx of [-1, 1]) {
    at(b, it, bx(0.03, 0.03, 0.4, sx * 0.24, 0.48, 0), BLACK);
    rod(b, w(it, sx * 0.23, 0, -0.2), w(it, sx * 0.23, 0.32, 0.2), 0.012, BLACK, 3);
    rod(b, w(it, sx * 0.23, 0, 0.2), w(it, sx * 0.23, 0.32, -0.2), 0.012, BLACK, 3);
  }
}
/** A picnic table: its top, the benches either side, the legs */
function table(b: Batch, it: Item, low: boolean) {
  const m = it.tone % 2 ? WOOD : WOOD_GREY;
  at(b, it, bx(it.w, 0.06, it.d * 0.5, 0, it.h - 0.06, 0), m);
  for (const sz of [-1, 1]) at(b, it, bx(it.w, 0.05, 0.25, 0, 0.42, sz * (it.d / 2 - 0.14)), m);
  for (const sx of [-1, 1]) {
    at(b, it, bx(0.08, it.h - 0.06, 0.08, sx * (it.w / 2 - 0.2), 0, 0), m);
    at(b, it, bx(0.08, 0.06, it.d - 0.1, sx * (it.w / 2 - 0.2), 0.36, 0), m);
  }
  if (!low && it.tone % 3 === 0) at(b, it, bx(0.4, 0.18, 0.3, it.w * 0.2, it.h, 0), CLOTH[it.tone % CLOTH.length]);
}
/** A canopy: four poles, a sagging tarp top and its valance; string lights along its front on some */
function canopy(b: Batch, it: Item, low: boolean) {
  const m = TARPS[it.tone % TARPS.length];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) at(b, it, new THREE.CylinderGeometry(0.025, 0.025, it.h, 4, 1, true).translate(sx * (it.w / 2 - 0.05), it.h / 2, sz * (it.d / 2 - 0.05)), POST);
  at(b, it, bx(it.w, 0.03, it.d, 0, it.h - 0.05, 0), m);
  at(b, it, bx(it.w, 0.14, 0.02, 0, it.h - 0.17, -it.d / 2), m);
  if (!low && it.tone % 2 === 0)
    b.detail(() => {
      for (let k = 1; k < 8; k++) {
        const t = k / 8;
        const p = w(it, -it.w / 2 + it.w * t, it.h - 0.2 - Math.sin(t * Math.PI) * 0.15, -it.d / 2 - 0.02);
        b.add(new THREE.SphereGeometry(0.035, 4, 3).translate(p.x, p.y, p.z), STRING);
      }
    });
}
/** A van's awning: a sloping tarp from its roof's edge to two poles */
function awning(b: Batch, it: Item) {
  const m = TARPS[it.tone % TARPS.length];
  for (const sx of [-1, 1]) at(b, it, new THREE.CylinderGeometry(0.025, 0.025, 1.75, 4, 1, true).translate(sx * (it.w / 2 - 0.05), 0.875, it.d / 2 - 0.05), POST);
  at(b, it, bx(it.w, 0.03, Math.hypot(it.d, 0.2), 0, -0.015, 0).rotateX(0.1).translate(0, 1.84, 0), m);
}
/** A washing line between two T-posts, clothes pegged out along it */
function line(b: Batch, it: Item, low: boolean) {
  const a = w(it, -it.w / 2, 0, 0);
  const c = w(it, it.w / 2, 0, 0);
  for (const p of [a, c]) {
    post(b, p.x, p.z, 0, it.h, 0.03, WOOD_GREY, 4);
  }
  const [pa, pc] = [a.clone().setY(it.h - 0.05), c.clone().setY(it.h - 0.05)];
  sagLine(b, pa, pc, 0.12, 0.008, WHITE, 4);
  const n = low ? 3 : Math.max(3, Math.floor(it.w / 0.45));
  for (let k = 1; k < n; k++) {
    const t = k / n;
    const p = pa.clone().lerp(pc, t);
    p.y -= Math.sin(t * Math.PI) * 0.12;
    const sz = 0.25 + ((k * 7 + it.tone) % 4) * 0.08;
    at(b, { x: p.x, z: p.z, ry: it.ry }, bx(0.32, sz, 0.015, 0, p.y - sz - 0.02, 0), CLOTH[(k + it.tone) % CLOTH.length]);
  }
}
/** What a stay gathers */
function small(b: Batch, it: Item, low: boolean) {
  switch (it.kind) {
    case 'cooler':
      at(b, it, bx(it.w, it.h - 0.06, it.d), CLOTH[(it.tone % 3) * 2]);
      at(b, it, bx(it.w + 0.02, 0.06, it.d + 0.02, 0, it.h - 0.06, 0), WHITE);
      break;
    case 'jerry':
      for (const k of [0, 1]) at(b, it, bx(0.22, it.h, 0.18, -0.12 + k * 0.26, 0, 0), k === 0 ? CLOTH[0] : CLOTH[2]);
      break;
    case 'generator':
      at(b, it, bx(it.w - 0.1, it.h - 0.1, it.d - 0.1, 0, 0.05, 0), CLOTH[3]);
      if (!low) for (const sx of [-1, 1]) at(b, it, bx(0.04, 0.04, it.d, sx * (it.w / 2 - 0.02), it.h - 0.04, 0), BLACK);
      break;
    case 'wood':
      for (let k = 0; k < (low ? 3 : 6); k++) {
        const row = k < 3 ? 0 : k < 5 ? 1 : 2;
        const x = -it.w / 2 + 0.2 + (k - [0, 3, 5][row]) * 0.2 + row * 0.1;
        at(b, it, new THREE.CylinderGeometry(0.09, 0.09, it.d, 6).rotateX(Math.PI / 2).translate(x * (it.w / 1.2), 0.09 + row * 0.16, 0), k % 2 ? WOOD : PALLET);
      }
      break;
    case 'lantern':
      post(b, it.x, it.z, 0, it.h, 0.015, BLACK, 3);
      rod(b, w(it, 0, it.h, 0), w(it, 0.22, it.h - 0.05, 0), 0.012, BLACK, 3);
      b.add(new THREE.SphereGeometry(0.07, 6, 4).translate(w(it, 0.22, it.h - 0.22, 0).x, it.h - 0.22, w(it, 0.22, it.h - 0.22, 0).z), LAMP);
      break;
    case 'flag': {
      post(b, it.x, it.z, 0, it.h, 0.02, POST, 4);
      at(b, it, bx(0.75, 0.45, 0.02, 0.4, it.h - 0.52, 0), CLOTH[(it.tone * 3) % CLOTH.length]);
      at(b, it, bx(0.75, 0.15, 0.026, 0.4, it.h - 0.37, 0), CLOTH[(it.tone * 3 + 1) % CLOTH.length]);
      break;
    }
    case 'solar':
      for (const sx of [-1, 1]) at(b, it, bx(0.04, 0.6, 0.04, sx * (it.w / 2 - 0.1), 0, 0.15), STEEL);
      at(b, it, bx(it.w, 0.04, it.d, 0, 0, 0).rotateX(0.55).translate(0, 0.55, 0), toon('#22305a'));
      break;
    case 'pallets':
      for (let k = 0; k < Math.floor(it.w / 1.05); k++) {
        const x = -it.w / 2 + 0.55 + k * 1.05;
        at(b, it, bx(1.0, it.h, 0.1, x, 0, 0), PALLET);
        if (!low) for (const y of [0.2, 0.55, 0.9]) at(b, it, bx(1.0, 0.05, 0.02, x, y, -0.06), WOOD_GREY);
      }
      break;
    case 'dish':
      post(b, it.x, it.z, 0, 0.9, 0.02, POST, 4);
      at(b, it, new THREE.CylinderGeometry(0.28, 0.2, 0.05, 10).rotateX(0.7).translate(0, 0.95, 0), STONE);
      break;
    case 'plants':
      for (let k = 0; k < 3; k++) {
        const x = -it.w / 2 + 0.15 + k * 0.25;
        at(b, it, new THREE.CylinderGeometry(0.1, 0.08, 0.2, 7).translate(x, 0.1, 0), TERRACOTTA);
        at(b, it, new THREE.SphereGeometry(0.13, 6, 4).translate(x, 0.3, 0), k % 2 ? LEAF : GREEN);
      }
      break;
    case 'stake':
      post(b, it.x, it.z, 0, 0.3, 0.02, STEEL, 3);
      at(b, it, new THREE.CylinderGeometry(0.1, 0.08, 0.06, 8).translate(-0.3, 0, 0.2), CLOTH[2]);
      break;
    case 'stove':
      at(b, it, bx(it.w, it.h, it.d, 0, 0.75, 0), GREEN);
      at(b, it, bx(it.w, 0.25, 0.02, 0, 0.75 + it.h, it.d / 2), GREEN);
      break;
    case 'deck':
      at(b, it, bx(it.w, it.h, it.d), PALLET);
      if (!low) for (let k = 0; k < 6; k++) at(b, it, bx(it.w, 0.01, 0.03, 0, it.h, -it.d / 2 + 0.12 + k * 0.23), WOOD_GREY);
      break;
    default:
      break;
  }
}
function drawItem(b: Batch, it: Item, low: boolean) {
  switch (it.kind) {
    case 'dome':
      return dome(b, it, low);
    case 'ridge':
      return ridge(b, it, low);
    case 'cabin':
      return cabin(b, it, low);
    case 'trailer':
      return trailer(b, it, low);
    case 'teardrop':
      return teardrop(b, it, low);
    case 'shack':
      return shack(b, it, low);
    case 'bus':
      return bus(b, it, low);
    case 'fire':
      return fire(b, it, low);
    case 'chair':
      return chair(b, it, low);
    case 'table':
      return table(b, it, low);
    case 'canopy':
      return canopy(b, it, low);
    case 'awning':
      return awning(b, it);
    case 'line':
      return line(b, it, low);
    default:
      return b.detail(() => small(b, it, low));
  }
}

/* ---------- The sites ---------- */

/** Points every `step` along a polyline */
function along(pts: readonly Pt[], step: number): Pt[] {
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [a, c] = [pts[i - 1], pts[i]];
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const n = Math.max(1, Math.round(l / step));
    for (let k = 1; k <= n; k++) out.push([a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n]);
  }
  return out;
}
/** A strip of dirt along a to c, `half` either side, at y (carried on past its ends so its corners close) */
function strip(b: Batch, a: Pt, c: Pt, half: number, y: number, m: THREE.Material) {
  const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
  if (l < 1e-3) return;
  b.add(
    new THREE.PlaneGeometry(l + half, half * 2)
      .rotateX(-Math.PI / 2)
      .rotateY(-Math.atan2(c[1] - a[1], c[0] - a[0]))
      .translate((a[0] + c[0]) / 2, y, (a[1] + c[1]) / 2),
    m
  );
}

/** The fires' glow on the ground, all in one mesh (the FX layer), faint by day, warm at night: the main thread's */
export function campGlow(scene: THREE.Scene) {
  const parts: THREE.BufferGeometry[] = [new THREE.PlaneGeometry(6, 6).rotateX(-Math.PI / 2).translate(CIRCLE.x, 0.05, CIRCLE.z)];
  for (const p of PITCHES) for (const it of p.items) if (it.kind === 'fire' && it.lit) parts.push(new THREE.PlaneGeometry(3.4, 3.4).rotateX(-Math.PI / 2).translate(it.x, 0.05, it.z));
  const glow = new THREE.Mesh(mergeGeometries(parts, false)!, lit(glowMat('#ff8a3a', 0.5), 0.12, 1));
  glow.name = 'lot9-camp-glow';
  scene.add(fx(glow));
}

export function registerCamp(low: boolean) {
  // The track: dirt with darker ruts and puddles, a stretch a site
  for (const line0 of [TRACK_SPUR, TRACK_LOOP]) {
    const pts = along(line0, 1.5);
    for (let i = 0; i < pts.length - 1; i += 10) {
      const run = pts.slice(i, Math.min(pts.length, i + 11));
      const xs = run.map((p) => p[0]);
      const zs = run.map((p) => p[1]);
      site(`lot9 field track ${line0 === TRACK_SPUR ? 's' : 'l'}${i}`, [Math.min(...xs) - 2, Math.min(...zs) - 2, Math.max(...xs) + 2, Math.max(...zs) + 2], (into) => {
        const b = new Batch();
        const r = rng(i * 31 + (line0 === TRACK_SPUR ? 7 : 0));
        for (let k = 1; k < run.length; k++) {
          const [a, c] = [run[k - 1], run[k]];
          strip(b, a, c, TRACK_HALF, 0.026, DIRT);
          const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
          const [nx, nz] = [-(c[1] - a[1]) / l, (c[0] - a[0]) / l];
          for (const o of [-0.45, 0.45]) strip(b, [a[0] + nx * o, a[1] + nz * o], [c[0] + nx * o, c[1] + nz * o], 0.14, 0.028, DIRT_DARK);
        }
        b.detail(() => {
          if (low) return;
          for (let k = 0; k < run.length / 3; k++) {
            const p = run[Math.floor(r() * run.length)];
            patch(b, p[0] + (r() - 0.5) * 1.4, p[1] + (r() - 0.5) * 1.4, 0.3 + r() * 0.3, 0.22 + r() * 0.2, r() * 3, 0.031, PUDDLE, 8);
          }
        });
        b.build(into, { cast: false, receive: true });
      });
    }
  }
  // A site a pitch: the trampled ground under it, everything on it
  for (const p of PITCHES) {
    const boxes = p.items.map(aabbOf);
    const rect: Rect = [Math.min(...boxes.map((q) => q[0])) - 1, Math.min(...boxes.map((q) => q[1])) - 1, Math.max(...boxes.map((q) => q[2])) + 1, Math.max(...boxes.map((q) => q[3])) + 1];
    site(`lot9 ${p.id}`, rect, (into) => {
      const b = new Batch();
      const r = rng(p.seed);
      // (the ground worn bare round the shelter and the fire)
      for (const it of p.items)
        if (it.kind === p.kind || it.kind === 'fire' || it.kind === 'awning' || it.kind === 'canopy')
          patch(b, it.x, it.z, it.w / 2 + 0.7, it.d / 2 + 0.6, it.ry, 0.018 + (it.kind === 'fire' ? 0.002 : 0), DIRT_DARK, 10);
      for (const it of p.items) drawItem(b, it, low);
      // Tent pegs and guy lines, litter, a bike: near only
      b.detail(() => {
        if (low) return;
        for (const it of p.items)
          if (it.kind === 'dome' || it.kind === 'ridge' || it.kind === 'cabin')
            for (const [sx, sz] of [
              [-1, -1],
              [1, -1],
              [1, 1],
              [-1, 1],
            ]) {
              const top = w(it, (sx * it.w) / 4, it.h * 0.7, (sz * it.d) / 4);
              const peg = w(it, sx * (it.w / 2 + 0.45), 0.02, sz * (it.d / 2 + 0.45));
              rod(b, top, peg, 0.006, WHITE, 3);
            }
        for (let k = 0; k < 3; k++) {
          const it = p.items[Math.floor(r() * p.items.length)];
          b.add(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 5).rotateZ(Math.PI / 2).rotateY(r() * 3).translate(it.x + (r() - 0.5) * 2.4, 0.04, it.z + (r() - 0.5) * 2.4), CLOTH[k * 2]);
        }
      });
      b.build(into, { cast: true, receive: true });
    });
  }

  // The shower and toilet block: cinder block, a tin roof overhanging, its doors and signs, a light over them; the
  // porta-potties beside it
  site('lot9 field showers', [SHOWERS.rect[0] - 1.5, SHOWERS.rect[1] - 1.5, POTTIES[2][2] + 1, SHOWERS.rect[3] + 1.5], (into) => {
    const b = new Batch();
    const [x0, z0, x1, z1] = SHOWERS.rect;
    rbox(b, SHOWERS.rect, 0, SHOWERS.h, BLOCK);
    b.box(x0 - 0.3, SHOWERS.h, z0 - 0.3, x1 - x0 + 0.6, 0.05, z1 - z0 + 0.8, ROOF_TIN);
    SHOWER_DOORS.forEach(([dx, dz], i) => b.box(dx - 0.35, 0, dz, 0.7, 1.3, 0.03, i < 2 ? toon('#4a6a8a') : toon('#6a4a3a')));
    sign(b, SIGN_ROW.showers, (SHOWER_DOORS[0][0] + SHOWER_DOORS[1][0]) / 2, 1.65, z1 + 0.03, [0, 1], 1.8, 0.24);
    sign(b, SIGN_ROW.toilets, SHOWER_DOORS[2][0], 1.65, z1 + 0.03, [0, 1], 1.5, 0.2);
    sign(b, SIGN_ROW.quiet, x1 + 0.03, 1.2, (z0 + z1) / 2, [1, 0], 1.6, 0.2);
    for (const x of [x0 + 0.8, x1 - 0.8]) b.box(x - 0.3, 1.7, z1, 0.6, 0.18, 0.03, WARM);
    b.add(new THREE.SphereGeometry(0.06, 6, 4).translate((x0 + x1) / 2, 1.92, z1 + 0.12), LAMP);
    // (a slab out the front, wet)
    b.box(x0, 0.002, z1, x1 - x0, 0.02, 1.0, STONE_DARK);
    POTTIES.forEach((q, i) => {
      rbox(b, q, 0, POTTY_H - 0.12, [toon('#3a6a9a'), toon('#3d7a4a'), toon('#3a6a9a')][i]);
      b.add(new THREE.CylinderGeometry((q[2] - q[0]) / 2 + 0.02, (q[2] - q[0]) / 2 + 0.02, 0.14, 8, 1).scale(1, 1, 0.95).translate((q[0] + q[2]) / 2, POTTY_H - 0.07, (q[1] + q[3]) / 2), WHITE);
      b.box((q[0] + q[2]) / 2 - 0.3, 0.05, q[3], 0.6, 1.7, 0.02, toon('#2a4a7a'));
    });
    b.build(into, { cast: true, receive: true });
  });
  // The standpipe and its trough, DRINKING WATER on the post, a puddle
  site('lot9 field water', [TROUGH[0] - 1, STANDPIPE[1] - 1.2, TROUGH[2] + 1, TROUGH[3] + 1], (into) => {
    const b = new Batch();
    post(b, STANDPIPE[0], STANDPIPE[1], 0, 0.95, 0.06, STEEL, 6);
    rod(b, new THREE.Vector3(STANDPIPE[0], 0.85, STANDPIPE[1]), new THREE.Vector3(STANDPIPE[0], 0.85, STANDPIPE[1] + 0.25), 0.025, STEEL, 4);
    rbox(b, TROUGH, 0, 0.5, STONE);
    b.box(TROUGH[0] + 0.08, 0.45, TROUGH[1] + 0.08, TROUGH[2] - TROUGH[0] - 0.16, 0.02, TROUGH[3] - TROUGH[1] - 0.16, PUDDLE);
    sign(b, SIGN_ROW.water, STANDPIPE[0], 1.15, STANDPIPE[1] - 0.07, [0, -1], 1.0, 0.13);
    post(b, STANDPIPE[0] - 0.3, STANDPIPE[1] - 0.05, 0, 1.25, 0.025, WOOD_GREY, 4);
    patch(b, STANDPIPE[0], STANDPIPE[1] - 0.4, 0.6, 0.4, 0, 0.031, PUDDLE, 8);
    b.build(into, { cast: true, receive: true });
  });
  // The big fire circle: a ring of stones round a big fire, the log benches, a stump table
  site('lot9 field circle', [CIRCLE.x - 5, CIRCLE.z - 5, CIRCLE.x + 5, CIRCLE.z + 5], (into) => {
    const b = new Batch();
    patch(b, CIRCLE.x, CIRCLE.z, 4.4, 4.4, 0, 0.018, DIRT_DARK, 16);
    fire(b, { kind: 'fire', x: CIRCLE.x, z: CIRCLE.z, ry: 0.3, w: 1.6, d: 1.6, h: 0.3, tone: 0, lit: true }, low);
    for (let k = 0; k < (low ? 8 : 14); k++) {
      const a = (k / 14) * Math.PI * 2;
      b.add(new THREE.DodecahedronGeometry(0.15, 0).scale(1, 0.7, 1).translate(CIRCLE.x + Math.cos(a) * CIRCLE.r, 0.08, CIRCLE.z + Math.sin(a) * CIRCLE.r), k % 2 ? STONE : STONE_DARK);
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      b.add(new THREE.ConeGeometry(0.13, 0.55 + (i % 2) * 0.2, 5, 1, true).translate(CIRCLE.x + Math.cos(a) * 0.18, 0.4, CIRCLE.z + Math.sin(a) * 0.18), i % 2 ? FLAME : FLAME_CORE);
    }
    for (const l of LOGS) at(b, l, new THREE.CylinderGeometry(l.d / 2, l.d / 2, l.w, low ? 6 : 9).rotateZ(Math.PI / 2).translate(0, l.d / 2, 0), WOOD);
    b.build(into, { cast: true, receive: true });
  });
  // The camp kitchen: a tarp roof on posts, its tables, the grill, the sink on its stand, pots and a kettle
  site('lot9 field kitchen', [KITCHEN[0] - 1, KITCHEN[1] - 1, KITCHEN[2] + 1, KITCHEN[3] + 1], (into) => {
    const b = new Batch();
    const [x0, z0, x1, z1] = KITCHEN;
    for (const x of [x0 + 0.1, (x0 + x1) / 2, x1 - 0.1]) for (const z of [z0 + 0.1, z1 - 0.1]) post(b, x, z, 0, 2.3, 0.05, WOOD_GREY, 5);
    b.add(new THREE.BoxGeometry(x1 - x0 + 0.4, 0.03, z1 - z0 + 0.4).rotateX(0.08).translate((x0 + x1) / 2, 2.32, (z0 + z1) / 2), TARPS[0]);
    patch(b, (x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2 + 0.6, (z1 - z0) / 2 + 0.6, 0, 0.018, DIRT_DARK, 12);
    for (const t of KITCHEN_TABLES) table(b, t, low);
    rbox(b, GRILL, 0, 0.8, BLACK);
    b.box(GRILL[0] - 0.05, 0.8, GRILL[1], GRILL[2] - GRILL[0] + 0.1, 0.05, GRILL[3] - GRILL[1], STEEL);
    rbox(b, SINK, 0, 0.85, WOOD_GREY);
    b.box(SINK[0] + 0.15, 0.85, SINK[1] + 0.1, 0.6, 0.03, 0.4, STEEL);
    b.detail(() => {
      if (low) return;
      for (let k = 0; k < 3; k++) b.add(new THREE.CylinderGeometry(0.12, 0.1, 0.16, 8).translate(KITCHEN_TABLES[0].x - 0.5 + k * 0.5, 0.79, KITCHEN_TABLES[0].z), k === 1 ? STEEL : BLACK);
      b.add(new THREE.SphereGeometry(0.06, 6, 4).translate((x0 + x1) / 2, 2.15, (z0 + z1) / 2), LAMP);
      for (let k = 1; k < 9; k++) {
        const t = k / 9;
        b.add(new THREE.SphereGeometry(0.035, 4, 3).translate(x0 + (x1 - x0) * t, 2.18 - Math.sin(t * Math.PI) * 0.12, z0 + 0.05), STRING);
      }
    });
    b.build(into, { cast: true, receive: true });
  });
  // The firewood pile and its honour box, the commons' washing line
  site('lot9 field woodpile', [WOODPILE[0] - 1, WOODPILE[1] - 1, WASHING[1][0] + 1, WASHING[1][1] + 1], (into) => {
    const b = new Batch();
    const [x0, z0, x1, z1] = WOODPILE;
    for (let row = 0; row < 4; row++)
      for (let k = 0; k < 7 - row; k++) b.add(new THREE.CylinderGeometry(0.13, 0.13, z1 - z0, 6).rotateX(Math.PI / 2).translate(x0 + 0.25 + k * 0.4 + row * 0.2, 0.13 + row * 0.24, (z0 + z1) / 2), (k + row) % 2 ? WOOD : PALLET);
    post(b, x1 + 0.4, (z0 + z1) / 2, 0, 1.2, 0.04, WOOD_GREY, 4);
    b.box(x1 + 0.25, 0.95, (z0 + z1) / 2 - 0.15, 0.3, 0.3, 0.3, WOOD);
    sign(b, SIGN_ROW.firewood, (x0 + x1) / 2, 1.25, z0 - 0.05, [0, -1], 2.4, 0.2);
    for (const k of [0, 1]) post(b, x0 + 0.3 + k * 2.4, z0 - 0.06, 1.05, 0.3, 0.02, WOOD_GREY, 3);
    b.box(x0 + 0.2, 1.05, z0 - 0.07, 2.6, 0.32, 0.02, WOOD_GREY);
    const [a, c] = WASHING;
    const dx = c[0] - a[0];
    const dz = c[1] - a[1];
    line(b, { kind: 'line', x: (a[0] + c[0]) / 2, z: (a[1] + c[1]) / 2, ry: Math.atan2(-dz, dx), w: Math.hypot(dx, dz), d: 0.3, h: 1.65, tone: 3 }, low);
    b.build(into, { cast: true, receive: true });
  });
  // The dumpster corral (pallets round three sides), the notice board with its bills, THE FIELD over the old fence's gap
  site('lot9 field corral', [CORRAL[0] - 1, NOTICE[1] - 1, CAMP_X1 + 1, CORRAL[3] + 1], (into) => {
    const b = new Batch();
    const fx0 = new Batch();
    for (const q of DUMPSTERS) {
      rbox(b, q, 0.1, 1.05, toon('#2f5a3a'));
      b.box(q[0] - 0.03, 1.15, q[1] - 0.05, q[2] - q[0] + 0.06, 0.06, q[3] - q[1] + 0.1, BLACK);
    }
    const [x0, z0, x1, z1] = CORRAL;
    for (const [p, q] of [
      [[x0, z0], [x0, z1]],
      [[x0, z1], [x1, z1]],
      [[x1, z0], [x1, z1]],
    ] as [Pt, Pt][]) {
      const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
      b.add(new THREE.BoxGeometry(l, 1.1, 0.1).rotateY(-Math.atan2(q[1] - p[1], q[0] - p[0])).translate((p[0] + q[0]) / 2, 0.55, (p[1] + q[1]) / 2), PALLET);
    }
    // (bags spilling over beside them)
    if (!low) for (let k = 0; k < 4; k++) b.add(new THREE.SphereGeometry(0.22, 6, 4).scale(1, 0.8, 1).translate(x1 + 0.35, 0.16, z0 + 0.5 + k * 0.5), BLACK);
    const [nx, nz] = NOTICE;
    for (const sx of [-0.6, 0.6]) post(b, nx + sx, nz, 0, 1.75, 0.04, WOOD_GREY, 4);
    b.box(nx - 0.7, 1.0, nz - 0.03, 1.4, 0.75, 0.06, WOOD);
    b.box(nx - 0.8, 1.75, nz - 0.25, 1.6, 0.04, 0.5, ROOF_TIN);
    if (!low) for (let k = 0; k < 4; k++) poster(fx0, k + 1, 0.36, [0, 1], nx - 0.48 + k * 0.32, 1.22 + (k % 2) * 0.28, nz + 0.04);
    // THE FIELD on its two poles over the gap
    const [p, q] = FIELD_ARCH;
    for (const [x, z] of [p, q]) post(b, x, z, 0, 2.75, 0.06, WOOD_GREY, 5);
    b.box(p[0] - 0.06, 2.3, p[1], 0.12, 0.42, q[1] - p[1], WOOD_GREY);
    sign(b, SIGN_ROW.field, p[0] - 0.06, 2.51, (p[1] + q[1]) / 2, [-1, 0], q[1] - p[1] - 0.3, 0.34);
    sign(b, SIGN_ROW.field, p[0] + 0.06, 2.51, (p[1] + q[1]) / 2, [1, 0], q[1] - p[1] - 0.3, 0.34);
    b.build(into, { cast: true, receive: true });
    buildFx(fx0, into);
  });
  // The vegetable patch (raised beds with their rows) and the chicken coop with its wire run
  site('lot9 field garden', [GARDEN[0] - 1, GARDEN[1] - 1, COOP_RUN[2] + 1, GARDEN[3] + 1], (into) => {
    const b = new Batch();
    const fx0 = new Batch();
    for (const q of BEDS) {
      rbox(b, q, 0, 0.3, WOOD_GREY);
      b.box(q[0] + 0.06, 0.25, q[1] + 0.06, q[2] - q[0] - 0.12, 0.06, q[3] - q[1] - 0.12, SOIL);
      b.detail(() => {
        if (low) return;
        for (let z = q[1] + 0.35; z < q[3] - 0.2; z += 0.45) for (const x of [q[0] + 0.4, q[2] - 0.4]) b.add(new THREE.SphereGeometry(0.15, 5, 4).scale(1, 0.8, 1).translate(x, 0.4, z), (Math.round(z * 3) % 3 === 0) ? LEAF : GREEN);
      });
    }
    rbox(b, COOP, 0.35, 0.8, WOOD);
    b.add(new THREE.BoxGeometry(COOP[2] - COOP[0] + 0.3, 0.04, COOP[3] - COOP[1] + 0.3).rotateX(0.25).translate((COOP[0] + COOP[2]) / 2, 1.3, (COOP[1] + COOP[3]) / 2), RUST);
    for (const x of [COOP[0] + 0.1, COOP[2] - 0.1]) for (const z of [COOP[1] + 0.1, COOP[3] - 0.1]) post(b, x, z, 0, 0.36, 0.04, WOOD_GREY, 4);
    const [rx0, rz0, rx1, rz1] = COOP_RUN;
    for (const [x, z] of [
      [rx0, rz0],
      [rx1, rz0],
      [rx1, rz1],
      [rx0, rz1],
    ])
      post(b, x, z, 0, 0.95, 0.025, WOOD_GREY, 4);
    for (const [a, c] of [
      [[rx0, rz0], [rx1, rz0]],
      [[rx1, rz0], [rx1, rz1]],
      [[rx1, rz1], [rx0, rz1]],
      [[rx0, rz1], [rx0, rz0]],
    ] as [Pt, Pt][])
      chainMesh(fx0, a, c, 0.02, 0.9);
    // (the hens: white and brown lumps)
    if (!low) for (let k = 0; k < 4; k++) b.add(new THREE.SphereGeometry(0.12, 6, 4).scale(1.2, 0.9, 0.9).translate(rx0 + 0.6 + (k % 2) * 1.2, 0.12, rz0 + 0.7 + Math.floor(k / 2) * 1.4), k % 2 ? WHITE : toon('#8a5a3a'));
    b.build(into, { cast: true, receive: true });
    buildFx(fx0, into);
  });
  // By the park's gate: the dumpsters, the ice chest, the drinks machine, the propane cage
  site('lot9 gate extras', [GATE_DUMPSTERS[0][0] - 1, GATE_DUMPSTERS[0][1] - 1, -21.5, PROPANE_CAGE[3] + 1], (into) => {
    const b = new Batch();
    const fx0 = new Batch();
    for (const q of GATE_DUMPSTERS) {
      rbox(b, q, 0.1, 1.05, toon('#3a5a8a'));
      b.box(q[0] - 0.03, 1.15, q[1] - 0.05, q[2] - q[0] + 0.06, 0.06, q[3] - q[1] + 0.1, BLACK);
    }
    rbox(b, ICE, 0, 1.0, WHITE);
    sign(b, SIGN_ROW.ice, ICE[0] - 0.01, 0.72, (ICE[1] + ICE[3]) / 2, [-1, 0], 0.7, 0.18);
    rbox(b, VENDING, 0, 1.75, toon('#8a2e2e'));
    b.box(VENDING[0] - 0.02, 0.6, VENDING[1] + 0.1, 0.02, 1.0, VENDING[3] - VENDING[1] - 0.2, DRINKS);
    const [px0, pz0, px1, pz1] = PROPANE_CAGE;
    rbox(b, [px0, pz0, px1, pz1], 1.38, 0.07, STEEL);
    for (const x of [px0 + 0.03, px1 - 0.03]) for (const z of [pz0 + 0.03, pz1 - 0.03]) post(b, x, z, 0, 1.4, 0.025, STEEL, 4);
    for (let k = 0; k < 6; k++) b.add(new THREE.CylinderGeometry(0.15, 0.15, 0.5, 8).translate(px0 + 0.3 + (k % 3) * 0.6, 0.25 + Math.floor(k / 3) * 0.6, (pz0 + pz1) / 2), WHITE);
    for (const [a, c] of [
      [[px0, pz0], [px1, pz0]],
      [[px1, pz0], [px1, pz1]],
      [[px1, pz1], [px0, pz1]],
      [[px0, pz1], [px0, pz0]],
    ] as [Pt, Pt][])
      chainMesh(fx0, a, c, 0.02, 1.36);
    sign(b, SIGN_ROW.propane, px0 - 0.03, 1.2, (pz0 + pz1) / 2, [-1, 0], 1.2, 0.2);
    b.build(into, { cast: true, receive: true });
    buildFx(fx0, into);
  });
  // A tyre swing on the big tree in the middle
  const [tx, tz] = FIELD_TREES[9];
  site('lot9 field swing', [tx - 2, tz - 2, tx + 2, tz + 2], (into) => {
    const b = new Batch();
    const [sx, sz] = [tx + 1.1, tz - 0.3];
    rod(b, new THREE.Vector3(sx, 2.6, sz), new THREE.Vector3(sx, 0.75, sz), 0.012, WHITE, 3);
    b.add(new THREE.TorusGeometry(0.3, 0.1, 5, 10).translate(sx, 0.5, sz), TYRE);
    patch(b, sx, sz, 0.7, 0.7, 0, 0.018, DIRT_DARK, 8);
    b.build(into, { cast: true, receive: true });
  });
  void FIELD;
}

/** The park's homes' Christmas lights left up: bulbs along the roof's edge (drawn with the home, lot9-3d.ts) */
export function xmasLights(b: Batch, x0: number, x1: number, z0: number, z1: number, y: number, seed: number) {
  const n = Math.max(3, Math.round((z1 - z0) / 0.35));
  for (const x of [x0, x1])
    for (let k = 0; k <= n; k++) {
      const z = z0 + ((z1 - z0) * k) / n;
      b.add(new THREE.SphereGeometry(0.035, 4, 3).translate(x, y - 0.06 - (k % 2) * 0.04, z), XMAS[(k + seed) % XMAS.length]);
    }
}

/* ---------- The old park's yards, hookups and power ---------- */

const BINS = [toon('#2f5a3a'), toon('#4a4a52'), toon('#2f4a7a')];
const POOL_WALL = toon('#8fa4b8');
const WATER = toon('#4a9ac8');
const PINK = toon('#e86aa0');
const RED = toon('#c23b3b');
const BLUE = toon('#2f5fa8');
const YELLOW = toon('#f2c230');

/** One of a home's yard things, in its rect */
export function yardThing(b: Batch, t: YardThing, low: boolean, seed: number) {
  const [x0, z0, x1, z1] = t.rect;
  const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
  const [W, D] = [x1 - x0, z1 - z0];
  // (along its long side: its own x)
  const it = { x: cx, z: cz, ry: t.alongZ ? -Math.PI / 2 : 0 };
  const [L, S] = t.alongZ ? [D, W] : [W, D];
  switch (t.kind) {
    case 'bins':
      for (const k of [0, 1]) {
        const x = -L / 2 + 0.26 + k * 0.53;
        at(b, it, bx(0.46, 0.88, S - 0.06, x, 0, 0), BINS[(seed + k) % BINS.length]);
        at(b, it, bx(0.48, 0.05, S - 0.02, x, 0.88, 0), BLACK);
      }
      return;
    case 'propane':
      b.add(new THREE.CylinderGeometry(0.19, 0.19, 0.8, low ? 6 : 10).translate(cx, 0.4, cz), WHITE);
      b.add(new THREE.SphereGeometry(0.19, low ? 6 : 10, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(cx, 0.8, cz), WHITE);
      b.add(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 6, 1, true).translate(cx, 0.98, cz), STEEL);
      return;
    case 'line':
      return line(b, { kind: 'line', x: cx, z: cz, ry: it.ry, w: L - 0.1, d: S, h: 1.6, tone: seed }, low);
    case 'pool': {
      const r = Math.min(W, D) / 2 - 0.05;
      b.add(new THREE.CylinderGeometry(r, r, 0.85, low ? 12 : 20, 1, true).translate(cx, 0.425, cz), POOL_WALL);
      b.add(new THREE.CylinderGeometry(r + 0.04, r + 0.04, 0.06, low ? 12 : 20, 1, true).translate(cx, 0.85, cz), WHITE);
      b.add(new THREE.CircleGeometry(r - 0.02, low ? 12 : 20).rotateX(-Math.PI / 2).translate(cx, 0.72, cz), WATER);
      if (!low) rod(b, new THREE.Vector3(cx + r, 0, cz - 0.2), new THREE.Vector3(cx + r + 0.05, 1.0, cz - 0.2), 0.02, STEEL);
      return;
    }
    case 'trampoline': {
      const r = Math.min(W, D) / 2 - 0.05;
      b.add(new THREE.CircleGeometry(r - 0.15, low ? 12 : 18).rotateX(-Math.PI / 2).translate(cx, 0.7, cz), BLACK);
      b.add(new THREE.TorusGeometry(r - 0.07, 0.07, 3, low ? 12 : 18).rotateX(Math.PI / 2).translate(cx, 0.7, cz), BLUE);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.4;
        post(b, cx + Math.cos(a) * (r - 0.1), cz + Math.sin(a) * (r - 0.1), 0, 0.7, 0.025, STEEL, 3);
      }
      return;
    }
    case 'kiddiepool':
      b.add(new THREE.CylinderGeometry(Math.min(W, D) / 2 - 0.05, Math.min(W, D) / 2 - 0.05, 0.2, 12, 1, true).translate(cx, 0.1, cz), BLUE);
      b.add(new THREE.CircleGeometry(Math.min(W, D) / 2 - 0.08, 12).rotateX(-Math.PI / 2).translate(cx, 0.14, cz), WATER);
      return;
    case 'grill':
      b.add(new THREE.SphereGeometry(0.24, low ? 6 : 10, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(cx, 0.72, cz), BLACK);
      b.add(new THREE.SphereGeometry(0.24, low ? 6 : 10, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1).translate(cx, 0.72, cz), BLACK);
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        rod(b, new THREE.Vector3(cx + Math.cos(a) * 0.2, 0, cz + Math.sin(a) * 0.2), new THREE.Vector3(cx + Math.cos(a) * 0.12, 0.55, cz + Math.sin(a) * 0.12), 0.015, STEEL, 3);
      }
      return;
    case 'table':
      return table(b, { kind: 'table', x: cx, z: cz, ry: it.ry, w: L, d: S, h: 0.75, tone: seed }, low);
    case 'flamingos':
      if (low) return;
      for (const k of [0, 1]) {
        const x = cx + (t.alongZ ? 0 : -0.18 + k * 0.36);
        const z = cz + (t.alongZ ? -0.18 + k * 0.36 : 0);
        rod(b, new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 0.42, z), 0.008, BLACK, 3);
        b.add(new THREE.SphereGeometry(0.1, 6, 4).scale(1.4, 0.8, 0.7).translate(x, 0.48, z), PINK);
        rod(b, new THREE.Vector3(x + 0.1, 0.5, z), new THREE.Vector3(x + 0.12, 0.72, z), 0.02, PINK, 3);
      }
      return;
    case 'gnome':
      if (low) return;
      b.add(new THREE.CylinderGeometry(0.06, 0.08, 0.16, 6).translate(cx, 0.08, cz), BLUE);
      b.add(new THREE.SphereGeometry(0.06, 6, 4).translate(cx, 0.2, cz), WHITE);
      b.add(new THREE.ConeGeometry(0.06, 0.16, 6).translate(cx, 0.32, cz), RED);
      return;
    case 'toys':
      if (low) return;
      b.add(new THREE.SphereGeometry(0.12, 6, 4).translate(cx - 0.25, 0.12, cz + 0.2), RED);
      b.box(cx, 0, cz - 0.3, 0.3, 0.12, 0.4, YELLOW);
      b.add(new THREE.TorusGeometry(0.1, 0.03, 3, 8).translate(cx + 0.2, 0.12, cz + 0.2), BLUE);
      b.add(new THREE.TorusGeometry(0.1, 0.03, 3, 8).translate(cx + 0.2, 0.12, cz - 0.05), BLUE);
      b.box(cx + 0.1, 0.18, cz - 0.05, 0.2, 0.04, 0.3, RED);
      return;
    case 'woodpile':
      for (let row = 0; row < 3; row++)
        for (let k = 0; k < 4 - row; k++) at(b, it, new THREE.CylinderGeometry(0.1, 0.1, S - 0.05, 6).rotateX(Math.PI / 2).translate(-L / 2 + 0.15 + k * 0.2 + row * 0.1, 0.1 + row * 0.18, 0), (k + row) % 2 ? WOOD : PALLET);
      return;
    case 'bed':
      b.box(x0, 0, z0, W, 0.28, D, WOOD_GREY);
      b.box(x0 + 0.05, 0.24, z0 + 0.05, W - 0.1, 0.06, D - 0.1, SOIL);
      if (!low) for (let k = 0; k < 3; k++) at(b, it, new THREE.SphereGeometry(0.14, 5, 4).translate(-L / 2 + 0.3 + k * ((L - 0.6) / 2), 0.38, 0), k === 1 ? LEAF : GREEN);
      return;
    case 'flag':
      post(b, cx, cz, 0, 2.4, 0.02, POST, 4);
      b.box(cx, 1.9, cz - 0.01, 0.7, 0.42, 0.02, CLOTH[seed % CLOTH.length]);
      b.box(cx, 2.04, cz - 0.013, 0.7, 0.14, 0.026, CLOTH[(seed + 1) % CLOTH.length]);
      return;
  }
}
/** A home's hookup pedestal: a post with its meter and outlet box, the hose and cable to the home when it's lived in */
export function hookupOf(b: Batch, h: Home, low: boolean) {
  const [x, z] = h.hookup;
  b.box(x - 0.08, 0, z - 0.08, 0.16, 0.75, 0.16, STEEL);
  b.box(x - 0.13, 0.5, z - 0.11, 0.26, 0.26, 0.04, toon('#c9c6bc'));
  if (low || h.cond === 'condemned' || h.cond === 'burnt') return;
  const hx = h.side === 1 ? h.body[0] + 0.05 : h.body[2] - 0.05;
  const hz = h.lot.face === 'n' ? h.body[1] + 0.3 : h.body[3] - 0.3;
  sagLine(b, new THREE.Vector3(x, 0.45, z), new THREE.Vector3(hx, h.y0 * 0.6, hz), 0.15, 0.018, BLACK, 3);
  sagLine(b, new THREE.Vector3(x, 0.2, z), new THREE.Vector3(hx, 0.15, hz), 0.08, 0.02, GREEN, 3);
}

/** The power: a site a stretch of poles along each lane (the poles, crossarms, insulators, a transformer on every
 * third, the lines between them, the drops from each to its homes), near only but the poles */
export function registerPower(low: boolean) {
  POLE_LINES.forEach((line, li) => {
    for (let i = 0; i < line.length - 1; i += 2) {
      const run = line.slice(i, Math.min(line.length, i + 3));
      const xs = run.map((p) => p[0]);
      const zs = run.map((p) => p[1]);
      site(`lot9 power ${li} ${i}`, [Math.min(...xs) - 3, Math.min(...zs) - 12, Math.max(...xs) + 3, Math.max(...zs) + 12], (into) => {
        const b = new Batch();
        for (let k = 0; k < run.length; k++) {
          if (k === run.length - 1 && i + k !== line.length - 1) continue;
          const [x, z] = run[k];
          post(b, x, z, 0, POLE.h, POLE.r, WOOD_GREY, low ? 5 : 7);
          b.box(x - 0.6, POLE.arm, z - 0.05, 1.2, 0.1, 0.1, WOOD_GREY);
          for (const o of [-0.5, 0, 0.5]) b.add(new THREE.CylinderGeometry(0.03, 0.04, 0.12, 5).translate(x + o, POLE.arm + 0.16, z), toon('#4a6a5a'));
          if ((i + k) % 3 === 1) b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.55, 8).translate(x, POLE.arm - 0.55, z + 0.25), STONE);
        }
        b.detail(() => {
          // The lines along the lane, sagging pole to pole
          for (let k = 1; k < run.length; k++)
            for (const o of [-0.5, 0, 0.5]) sagLine(b, new THREE.Vector3(run[k - 1][0] + o, POLE.arm + 0.2, run[k - 1][1]), new THREE.Vector3(run[k][0] + o, POLE.arm + 0.2, run[k][1]), 0.35, 0.012, BLACK, low ? 3 : 6);
          // The drops to the homes fed from these poles
          for (const d of DROPS)
            if (run.some((p, k) => (k < run.length - 1 || i + k === line.length - 1) && p[0] === d.from[0] && p[1] === d.from[1]))
              sagLine(b, new THREE.Vector3(d.from[0], POLE.arm - 0.2, d.from[1]), new THREE.Vector3(...d.to), 0.4, 0.01, BLACK, low ? 3 : 5);
        });
        b.build(into, { cast: true, receive: true });
      });
    }
  });
}
