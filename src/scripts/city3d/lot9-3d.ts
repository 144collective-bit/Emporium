/*
 * Lot 9 drawn (docs/trailer-plan.md; the data is lot9.ts), a district loaded as you approach (districts.ts
 * `LAZY_DISTRICTS` id `lot9`), as sites (tilework.ts): the gravel lanes, the lots' pads, every home a site (single-wides
 * with their curved roofs, double-wides under shingle, round-ended caravans, campers, the bus conversion; their decks,
 * windows (TV glow and lamplight at night, boarded on the rough ones), skirting or cinder blocks, tarps weighed down
 * with tyres, dishes, AC units, lean-tos, carports, sheds, dog runs, junk, KEEP OUT on their posts; the burnt-out shell
 * charred to its studs), the chain-link fence (its mesh in the FX layer) with the gate, its LOT 9 board and the hole
 * cut by the footpath, the office and the coin laundry, the fire pit (the burn barrel's flames, couches and lawn chairs,
 * string lights, the bug zapper, the radio), the junk corner (the boat on its trailer, the mechanic's bay, tyre stacks,
 * scrap), the tunnel under the highway (its ramps, walls, parapets and bollards, the passage with its fluorescent
 * strips, some flickering, tags, a puddle) and its footpath. On the main thread: the parked cars, the kids' bikes, the
 * loose and chained dogs, the fire's glow on the ground. One sign atlas of fixed made-up copy. Phones leave out the
 * finest details.
 */
import * as THREE from 'three';
import type { Tick } from './world';
import { Batch, FONT_DISPLAY, canvasTex, fx, glowMat, lit, neon, paintMat, siteMat, toon } from './kit';
import { site } from './tilework';
import { along } from './roads3d';
import { buildFx, chainMesh, tag, poster } from './grime';
import { parkedCars } from './cars';
import { CROWD_VIEW } from './character';
import { dogGeometry } from './dogs3d';
import { COVER, ROAD } from './palette';
import {
  AVE_EDGE, BAY, BOAT, BOLLARD, FENCE, FENCE_H, FENCE_RUNS, FIRE, FIRE_LOT, FIRE_POLES, FIRE_SEATS, FOOTPATH, GATE, GROUND_Y, HOIST, HOLE, KIDS_ON_BIKES, LAUNDRY, LOT9_CARS,
  LOT9_DOGS, LOT9_RECT, LOT9_SIGNS, LOT9_STREETS, MAILBOXES, OFFICE, RADIO, RIDER, ROAD_Z, SCRAP, TOOLS, TUNNEL, TUNNEL_BOLLARDS, TYRES, ZAPPER, riderAt, rng, runnerAt, tunnelFloor,
  type Pt, type Rect,
} from './lot9';
import { CHAINED_DOGS, HOME_CARS, HOME_SOLIDS, LOTS, PORCH_SITTERS, type Home, type Lot } from './lot9homes';
import { addSolids } from './solids';
import { addPeople } from './life';

export const SELF = import.meta.url;

/* ---------- Paint ---------- */

/** The gravel's height over the ground, the pads' a hair over it */
const Y = 0.03;
const PAD_Y = 0.034;
const GRAVEL = toon('#6f6b66');
const GRAVEL_DARK = toon('#5d5955');
const PAD = toon('#77736a');
const PUDDLE = toon('#2a2b3b');
const CONCRETE = toon('#8a8794');
const CONCRETE_DARK = toon('#6c6977');
const TUNNEL_WALL = toon('#77748a');
const TUNNEL_FLOOR = toon('#55525f');
const TUNNEL_CEIL = toon('#3a3843');
const POST = toon('#9ea2b4');
const RUST = toon('#7a4a32');
const RUST_DARK = toon('#5a3626');
const WOOD = toon('#8a6a48');
const WOOD_GREY = toon('#857c70');
const PLY = toon('#a8885a');
const BLOCK = toon('#7c7a82');
const UNDER = toon('#24222c');
const GLASS = toon('#1e2033');
const SOOT = toon('#1b1818');
const CHAR = toon('#2c2523');
const TYRE = toon('#1a1820');
const YELLOW = toon('#d9b43a');
const BLACK = toon('#1c1b22');
const WEEDS = [toon(COVER.worn), toon(COVER.meadow), toon(COVER.dryGrass)];
const TARPS = [toon('#2f5fa8'), toon('#3d7a4a'), toon('#8a6a3c'), toon('#5a6b8a')];
const SIDING = ['#c9c2a8', '#9fb3a6', '#b8a07a', '#a7b4c2', '#d0c9bc', '#8f8c7e', '#c4a58a', '#b9b08f'].map((c) => toon(c));
const ACCENT = ['#7a5a3a', '#4a6a8a', '#8a3a32', '#3d5a44', '#6a5a7a', '#9a7a3a'].map((c) => toon(c));
const DOORS = ['#5a4636', '#6a6f7a', '#8a3a32', '#3d4a5c', '#b9b3a6'].map((c) => toon(c));
const SHINGLE = toon('#4a4652');
const CARAVAN = ['#e0d8c0', '#d8cfae', '#cfd8d0'].map((c) => toon(c));
const BUS = toon('#c9a23a');
const ROOF_TIN = toon('#9a9aa2');
/** Lamplight in a window at night, a TV's blue glow, a porch bulb, the fire, the zapper, the tunnel's tubes */
const WARM = neon('#ffd9a0', 0.03, 1.1);
const TV = neon('#8fb4ff', 0.03, 1.15);
const BULB = neon('#ffc870', 0.2, 2.2);
const FLAME = neon('#ff8a2a', 0.9, 2.2, 0.6);
const FLAME_CORE = neon('#ffd23f', 0.9, 2.4, 0.4);
const ZAP = neon('#5aa8ff', 0.3, 2.2, 0.5);
const STRING = neon('#ffd9a0', 0.15, 2.0);
const TUBE = neon('#e8f0ff', 0.6, 1.25);
const TUBE_TIRED = neon('#e8f0ff', 0.6, 1.25, 0.9);
const TUBE_DEAD = toon('#8a8f9a');
const FLOWERS = [neon('#e23b6b', 0.6, 0.6), neon(ROAD.yellow, 0.6, 0.6), neon('#b06ae0', 0.6, 0.6)];

/* ---------- Signs: one small atlas, a row each ---------- */

const ROWS: { text: string; bg: string; fg: string; worn?: boolean }[] = [
  { text: LOT9_SIGNS.gate, bg: '#d9d2bc', fg: '#1b1a20', worn: true },
  { text: LOT9_SIGNS.office, bg: '#2a3346', fg: '#e8e2cc', worn: true },
  { text: LOT9_SIGNS.laundry, bg: '#b8392f', fg: '#f3ecd8', worn: true },
  { text: LOT9_SIGNS.keepOut, bg: '#f1ece0', fg: '#b8261f' },
  { text: LOT9_SIGNS.dog, bg: '#f2c230', fg: '#17161c' },
  { text: LOT9_SIGNS.condemned, bg: '#f2e14a', fg: '#17161c' },
  { text: LOT9_SIGNS.private, bg: '#f1ece0', fg: '#1b1a20' },
  { text: LOT9_SIGNS.slow, bg: '#f2c230', fg: '#17161c' },
];
const ATLAS = canvasTex(512, 512, (c) => {
  c.fillStyle = '#000';
  c.fillRect(0, 0, 512, 512);
  const r = rng(909);
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
    let size = 42;
    c.font = `800 ${size}px ${FONT_DISPLAY}`;
    const w = c.measureText(row.text).width;
    if (w > 470) {
      size = Math.floor((size * 470) / w);
      c.font = `800 ${size}px ${FONT_DISPLAY}`;
    }
    c.fillText(row.text, 256, y + 35);
    // (worn: flakes of paint off, rust streaks down from the bolts)
    c.fillStyle = 'rgba(60,40,30,0.35)';
    for (let k = 0; k < (row.worn ? 40 : 14); k++) c.fillRect(r() * 512, y + r() * 64, 2 + r() * 9, 1 + r() * 4);
    c.fillStyle = 'rgba(120,60,30,0.35)';
    for (const x of [18, 494]) c.fillRect(x - 2, y + 12, 4, 30 + r() * 18);
  });
});
const SIGN = siteMat('lot9-sign', lit(new THREE.MeshBasicMaterial({ map: ATLAS }), 0.9, 1.05));
const SIGN_ROW = { gate: 0, office: 1, laundry: 2, keepOut: 3, dog: 4, condemned: 5, private: 6, slow: 7 } as const;
/** A sign from the atlas facing n (x, z), its middle at (x, y, z) */
function sign(b: Batch, row: number, x: number, y: number, z: number, n: Pt, w: number, h: number) {
  const g = new THREE.PlaneGeometry(w, h);
  const [v0, v1] = [1 - (row * 64 + 64) / 512, 1 - (row * 64) / 512];
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, v1, 1, v1, 0, v0, 1, v0], 2));
  b.add(g.rotateY(Math.atan2(n[0], n[1])).translate(x + n[0] * 0.012, y, z + n[1] * 0.012), SIGN);
}

/* ---------- Helpers ---------- */

const grow = (r: Rect, m: number): Rect => [r[0] - m, r[1] - m, r[2] + m, r[3] + m];
/** A rect's box from y0 up h */
const rbox = (b: Batch, r: Rect, y0: number, h: number, m: THREE.Material) => b.box(r[0], y0, r[1], r[2] - r[0], h, r[3] - r[1], m);
/** A thin flat rect at y (a pad, a puddle) */
const flat = (b: Batch, r: Rect, y: number, m: THREE.Material) => b.box(r[0], y - 0.004, r[1], r[2] - r[0], 0.004, r[3] - r[1], m);
/** A cylinder post from y0 up h */
const post = (b: Batch, x: number, z: number, y0: number, h: number, r: number, m: THREE.Material, seg = 6) => b.add(new THREE.CylinderGeometry(r, r, h, seg, 1, true).translate(x, y0 + h / 2, z), m);
/** A box along a segment a to c, w across, from y0 to y1 */
function bar(b: Batch, a: Pt, c: Pt, w: number, y0: number, y1: number, m: THREE.Material) {
  const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
  if (l < 1e-3) return;
  b.add(
    new THREE.BoxGeometry(l, y1 - y0, w)
      .rotateY(-Math.atan2(c[1] - a[1], c[0] - a[0]))
      .translate((a[0] + c[0]) / 2, (y0 + y1) / 2, (a[1] + c[1]) / 2),
    m
  );
}
/** A rod between two points in space */
function rod(b: Batch, a: THREE.Vector3, c: THREE.Vector3, r: number, m: THREE.Material, seg = 5) {
  const g = new THREE.CylinderGeometry(r, r, a.distanceTo(c), seg, 1, true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.clone().sub(a).normalize()));
  b.add(g.translate((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2), m);
}
/** A gravel strip along a straight run from a to c, `half` either side, at y */
function strip(b: Batch, a: Pt, c: Pt, half: number, y: number, m: THREE.Material) {
  const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
  if (l < 1e-3) return;
  b.add(
    new THREE.PlaneGeometry(l, half * 2)
      .rotateX(-Math.PI / 2)
      .rotateY(-Math.atan2(c[1] - a[1], c[0] - a[0]))
      .translate((a[0] + c[0]) / 2, y, (a[1] + c[1]) / 2),
    m
  );
}
/** A tyre lying flat (or stood up: `up`) */
const tyre = (b: Batch, x: number, y: number, z: number, low: boolean, up = false) => {
  const g = new THREE.TorusGeometry(0.3, 0.11, low ? 4 : 6, low ? 8 : 12);
  b.add((up ? g : g.rotateX(Math.PI / 2)).translate(x, y + (up ? 0.41 : 0.11), z), TYRE);
};
/** A cross-section (x across, y up) extruded along z from z0 for `len` */
function extrudeZ(shape: THREE.Shape, len: number, x: number, z0: number, curve = 6) {
  return new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false, curveSegments: curve }).translate(x, 0, z0);
}
/** A side profile (s along the length, y up) extruded across x from x0 for `w` (s runs along +z from z0) */
function extrudeX(shape: THREE.Shape, w: number, x0: number, z0: number, curve = 6) {
  // (a turn of -90 degrees about y takes the shape's x to z and its depth to -x)
  return new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false, curveSegments: curve })
    .rotateY(-Math.PI / 2)
    .translate(x0 + w, 0, z0);
}

/* ---------- The homes ---------- */

/** The way into a lot from its lane (unit, x z) */
const outOf = (lot: Lot): Pt => (lot.face === 'n' ? [0, -1] : [0, 1]);

/** A home's shell: its body by kind, its roof (and a tarp), skirting or blocks under it; returns the walls' top */
function shell(b: Batch, h: Home, low: boolean, r: () => number) {
  const [x0, z0, x1, z1] = h.body;
  const [w, L] = [x1 - x0, z1 - z0];
  const cx = (x0 + x1) / 2;
  const burnt = h.cond === 'burnt';
  const wall = burnt ? CHAR : h.kind === 'bus' ? BUS : h.kind === 'caravan' ? CARAVAN[h.seed % CARAVAN.length] : SIDING[h.seed % SIDING.length];
  const accent = burnt ? SOOT : ACCENT[(h.seed >> 3) % ACCENT.length];
  const y0 = h.y0;
  let top = h.h;
  if (h.kind === 'single') {
    // Straight sides and a gently curved roof (the burnt one's roof gone over its front half)
    const s = new THREE.Shape();
    s.moveTo(-w / 2, y0);
    s.lineTo(w / 2, y0);
    s.lineTo(w / 2, h.h - 0.08);
    s.quadraticCurveTo(0, h.h + 0.1, -w / 2, h.h - 0.08);
    s.closePath();
    if (burnt) {
      const box = new THREE.Shape();
      box.moveTo(-w / 2, y0);
      box.lineTo(w / 2, y0);
      box.lineTo(w / 2, y0 + 0.55);
      box.lineTo(-w / 2, y0 + 0.55);
      box.closePath();
      // (the back half still roofed, the front half burnt down to its sills, its studs standing)
      b.add(extrudeZ(box, L, cx, z0), wall);
      const back = h.lot.face === 'n' ? [z0 + L * 0.5, z1] : [z0, z0 + L * 0.5];
      b.add(extrudeZ(s, back[1] - back[0], cx, back[0], low ? 4 : 6), wall);
      const front = h.lot.face === 'n' ? [z0, z0 + L * 0.5] : [z0 + L * 0.5, z1];
      for (let z = front[0] + 0.3; z < front[1] - 0.1; z += 0.55)
        for (const x of [x0 + 0.06, x1 - 0.06]) b.box(x - 0.05, y0 + 0.5, z - 0.05, 0.1, (h.h - y0 - 0.6) * (0.5 + r() * 0.5), 0.1, SOOT);
      // (a charred beam fallen across, ash on the floor)
      bar(b, [x0 + 0.2, front[0] + 0.4], [x1 - 0.3, front[1] - 0.5], 0.12, y0 + 0.6, y0 + 0.72, SOOT);
      b.box(x0 + 0.08, y0 + 0.5, front[0] + 0.05, w - 0.16, 0.02, front[1] - front[0] - 0.1, SOOT);
      return top;
    }
    b.add(extrudeZ(s, L, cx, z0, low ? 4 : 6), wall);
  } else if (h.kind === 'double') {
    // Walls under a shallow shingled gable, its eaves over the sides
    const wt = h.h - 0.32;
    const s = new THREE.Shape();
    s.moveTo(-w / 2, y0);
    s.lineTo(w / 2, y0);
    s.lineTo(w / 2, wt);
    s.lineTo(-w / 2, wt);
    s.closePath();
    b.add(extrudeZ(s, L, cx, z0), wall);
    const roof = new THREE.Shape();
    roof.moveTo(-w / 2 - 0.2, wt - 0.04);
    roof.lineTo(w / 2 + 0.2, wt - 0.04);
    roof.lineTo(0, h.h + 0.12);
    roof.closePath();
    b.add(extrudeZ(roof, L + 0.3, cx, z0 - 0.15), SHINGLE);
    top = wt;
  } else if (h.kind === 'bus') {
    // The bus conversion: rounded all along, a black band at the windows, a stovepipe through its roof
    const s = new THREE.Shape();
    s.moveTo(-w / 2, y0);
    s.lineTo(w / 2, y0);
    s.lineTo(w / 2, h.h - 0.32);
    s.quadraticCurveTo(w / 2, h.h, 0, h.h);
    s.quadraticCurveTo(-w / 2, h.h, -w / 2, h.h - 0.32);
    s.closePath();
    b.add(extrudeZ(s, L, cx, z0, low ? 4 : 6), wall);
    for (const x of [x0 - 0.012, x1]) b.box(x, y0 + 0.62, z0 + 0.4, 0.012, 0.5, L - 0.8, BLACK);
    post(b, cx + w * 0.2, (z0 + z1) / 2 + L * 0.25, h.h - 0.05, 0.45, 0.06, BLACK);
    // (its wheels, the tyres gone flat)
    for (const z of [z0 + 1.2, z1 - 1.4]) for (const x of [x0 - 0.02, x1 + 0.02]) b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.2, low ? 8 : 12).rotateZ(Math.PI / 2).translate(x, 0.27, z), TYRE);
    top = h.h - 0.32;
  } else {
    // The caravan (a loaf: rounded ends) and the camper (a box with its cab-over) as side profiles, s = 0 at the
    // lane's end (mirrored in the shape for a lot whose lane is south: its lane end is the body's far z)
    const S = h.lot.face === 'n' ? (v: number) => v : (v: number) => L - v;
    const s = {
      sh: new THREE.Shape(),
      moveTo(a: number, y: number) {
        this.sh.moveTo(S(a), y);
      },
      lineTo(a: number, y: number) {
        this.sh.lineTo(S(a), y);
      },
      quadraticCurveTo(ca: number, cy: number, a: number, y: number) {
        this.sh.quadraticCurveTo(S(ca), cy, S(a), y);
      },
      closePath() {
        this.sh.closePath();
      },
    };
    if (h.kind === 'caravan') {
      const R = 0.55;
      s.moveTo(0.2, y0);
      s.lineTo(L - 0.2, y0);
      s.quadraticCurveTo(L, y0, L, y0 + 0.45);
      s.lineTo(L, h.h - R);
      s.quadraticCurveTo(L, h.h, L - R, h.h);
      s.lineTo(R, h.h);
      s.quadraticCurveTo(0, h.h, 0, h.h - R);
      s.lineTo(0, y0 + 0.45);
      s.quadraticCurveTo(0, y0, 0.2, y0);
    } else {
      // (the cab-over at the lane end: s = 0 is the lane's end)
      s.moveTo(0.3, y0);
      s.lineTo(L, y0);
      s.lineTo(L, h.h - 0.1);
      s.quadraticCurveTo(L, h.h, L - 0.1, h.h);
      s.lineTo(0.15, h.h);
      s.lineTo(0, h.h - 0.45);
      s.lineTo(0.9, h.h - 0.6);
      s.lineTo(0.9, h.h - 0.75);
      s.lineTo(0.3, y0 + 0.5);
      s.closePath();
    }
    b.add(extrudeX(s.sh, w, x0, z0, low ? 4 : 6), wall);
    // A band of colour along each side, the wheels
    for (const x of [x0 - 0.012, x1]) b.box(x, y0 + 0.5, z0 + 0.3, 0.012, 0.14, L - 0.6, accent);
    const zw = (z0 + z1) / 2 + (h.lot.face === 'n' ? 0.4 : -0.4);
    for (const x of [x0 - 0.02, x1 + 0.02]) b.add(new THREE.CylinderGeometry(0.24, 0.24, 0.18, low ? 8 : 12).rotateZ(Math.PI / 2).translate(x, 0.24, zw), TYRE);
    // (the caravan's hitch on blocks at its lane end)
    if (h.kind === 'caravan') {
      const zf = h.lot.face === 'n' ? z0 : z1;
      const d = h.lot.face === 'n' ? -1 : 1;
      bar(b, [cx - w * 0.35, zf], [cx, zf + d * 0.9], 0.06, 0.28, 0.34, BLACK);
      bar(b, [cx + w * 0.35, zf], [cx, zf + d * 0.9], 0.06, 0.28, 0.34, BLACK);
      b.box(cx - 0.15, 0, zf + d * 0.9 - 0.15, 0.3, 0.28, 0.3, BLOCK);
    }
    top = h.h - 0.1;
    return top;
  }
  // The stripe along its sides (the singles' and doubles')
  if (h.kind !== 'bus') for (const x of [x0 - 0.012, x1]) b.box(x, y0 + 0.82, z0 + 0.1, 0.012, 0.1, L - 0.2, accent);
  // Skirting, or cinder blocks and the dark underside
  if (h.skirting) {
    const sk = h.cond === 'kept' ? WOOD : WOOD_GREY;
    rbox(b, grow(h.body, -0.04), 0, y0, sk);
  } else {
    rbox(b, grow(h.body, -0.25), 0.02, y0 - 0.02, UNDER);
    b.detail(() => {
      if (low) return;
      for (let z = z0 + 0.6; z < z1 - 0.4; z += 1.8) for (const x of [x0 + 0.3, x1 - 0.5]) b.box(x, 0, z, 0.2, y0, 0.36, BLOCK);
    });
  }
  // A tarp over a leaking roof, weighed down with tyres
  if (h.tarp) {
    const tm = TARPS[h.seed % TARPS.length];
    const [ta, tb] = h.lot.face === 'n' ? [z0 + L * 0.35, z1 - 0.3] : [z0 + 0.3, z1 - L * 0.35];
    b.box(x0 - 0.06, h.h + 0.02, ta, w + 0.12, 0.03, tb - ta, tm);
    b.detail(() => {
      if (low) return;
      for (const z of [ta + 0.6, (ta + tb) / 2, tb - 0.6]) tyre(b, cx + (r() - 0.5) * w * 0.4, h.h + 0.04, z, low);
    });
  }
  return top;
}

/** A home's front, back and sides: windows (lit or boarded), its door and deck, the add-ons */
function dress(b: Batch, h: Home, top: number, low: boolean, r: () => number) {
  const [x0, z0, x1, z1] = h.body;
  const L = z1 - z0;
  const lot = h.lot;
  const yard = h.side === 1 ? x1 : x0;
  const away = h.side === 1 ? x0 : x1;
  const y0 = h.y0;
  const burnt = h.cond === 'burnt';
  const lived = h.cond !== 'condemned' && !burnt;
  // Windows down both long sides (none over the door), lit at night in a lived-in home (one with the TV's blue)
  const winY = y0 + 0.55;
  const winH = h.kind === 'bus' ? 0.4 : 0.46;
  let k = 0;
  for (let z = z0 + 0.8; z < z1 - 0.6; z += h.kind === 'bus' ? 0.9 : 1.7) {
    for (const x of [yard, away]) {
      if (x === yard && Math.abs(z - h.door[1]) < 0.7) continue;
      const out = x === x1 ? 1 : -1;
      const wx = out > 0 ? x : x - 0.03;
      const boarded = h.boarded && (k + (x === yard ? 0 : 1)) % 3 !== 2;
      const mat = burnt ? SOOT : boarded ? PLY : lived && (h.tv && k === 1) ? TV : lived && h.bulb && k % 2 === 0 ? WARM : GLASS;
      b.box(wx, winY, z - 0.31, 0.03, winH, 0.62, mat);
      // (soot up from the burnt one's windows)
      if (burnt) b.box(out > 0 ? x : x - 0.015, winY + winH, z - 0.25, 0.015, 0.4, 0.5, SOOT);
      k++;
    }
  }
  // The door on the yard side: a panel, the bulb over it, a CONDEMNED notice on the condemned ones
  const dx = h.side === 1 ? x1 : x0 - 0.03;
  const doorM = burnt ? SOOT : h.cond === 'condemned' ? PLY : DOORS[h.seed % DOORS.length];
  b.box(dx, y0, h.door[1] - 0.31, 0.03, 1.05, 0.62, doorM);
  if (h.cond === 'condemned') sign(b, SIGN_ROW.condemned, h.side === 1 ? x1 + 0.03 : x0 - 0.03, y0 + 0.7, h.door[1], [h.side, 0], 0.5, 0.07 * 1.5);
  if (h.bulb && lived) {
    b.box(dx + (h.side === 1 ? 0.03 : -0.06), y0 + 1.16, h.door[1] - 0.05, 0.06, 0.1, 0.1, BLACK);
    b.add(new THREE.SphereGeometry(0.05, 6, 4).translate(dx + h.side * 0.1, y0 + 1.12, h.door[1]), BULB);
  }
  // The deck (or plain steps) up to it, a rail round the deck near only
  const [px0, pz0, px1, pz1] = h.porch;
  rbox(b, h.porch, 0, h.porchY, burnt ? CHAR : h.cond === 'kept' ? WOOD : WOOD_GREY);
  b.detail(() => {
    if (low || burnt) return;
    const rail = h.cond === 'rough' ? RUST : WOOD_GREY;
    const outer = h.side === 1 ? px1 : px0;
    for (const z of [pz0 + 0.05, pz1 - 0.05]) post(b, outer, z, h.porchY, 0.5, 0.03, rail, 4);
    bar(b, [outer, pz0], [outer, pz1], 0.04, h.porchY + 0.46, h.porchY + 0.5, rail);
    // Lawn chairs on it, facing the lane (a sitter in one: life.ts draws them)
    for (let c = 0; c < h.chairs; c++) {
      const cz = (pz0 + pz1) / 2 + (c - (h.chairs - 1) / 2) * 0.7;
      const cxp = (px0 + px1) / 2 + (h.side === 1 ? -0.1 : 0.1);
      const fz = outOf(lot)[1];
      const m = TARPS[(h.seed + c) % TARPS.length];
      b.box(cxp - 0.2, h.porchY + 0.24, cz - 0.2, 0.4, 0.05, 0.4, m);
      b.box(cxp - 0.2, h.porchY + 0.29, cz - fz * 0.2 - 0.025, 0.4, 0.38, 0.05, m);
      for (const ox of [-0.18, 0.18]) for (const oz of [-0.18, 0.18]) b.box(cxp + ox - 0.015, h.porchY, cz + oz - 0.015, 0.03, 0.24, 0.03, POST);
    }
    // A flower box under a window or two on a kept home
    if (h.flowers)
      for (const z of [z0 + 0.8, z0 + 2.5]) {
        if (Math.abs(z - h.door[1]) < 0.7) continue;
        const fx0 = h.side === 1 ? x1 : x0 - 0.18;
        b.box(fx0, winY - 0.16, z - 0.3, 0.18, 0.12, 0.6, WOOD);
        for (let i = 0; i < 4; i++) b.add(new THREE.SphereGeometry(0.06, 5, 3).translate(fx0 + 0.09, winY - 0.02, z - 0.22 + i * 0.15), FLOWERS[(i + h.seed) % 3]);
      }
  });
  // An AC unit out of a window on the far side, a dish up on the roof
  if (h.ac) b.box(h.side === 1 ? x0 - 0.36 : x1, winY - 0.05, z0 + L * 0.55, 0.36, 0.34, 0.44, CONCRETE);
  if (h.dish)
    b.detail(() => {
      if (low) return;
      const zd = h.lot.face === 'n' ? z1 - 0.6 : z0 + 0.6;
      const xd = (x0 + x1) / 2 + (x1 - x0) * 0.25;
      post(b, xd, zd, top, 0.35, 0.025, POST, 4);
      b.add(new THREE.CylinderGeometry(0.26, 0.2, 0.05, 10).rotateX(0.7).rotateY(h.seed).translate(xd, top + 0.42, zd), CONCRETE);
    });
  // The lean-to against the home: posts and a sloping tin roof
  if (h.leanTo) {
    const [lx0, lz0, lx1, lz1] = h.leanTo;
    const near = h.side === 1 ? lx0 : lx1;
    const far = h.side === 1 ? lx1 : lx0;
    const [hiY, loY] = [top - 0.15, top - 0.6];
    for (const z of [lz0 + 0.06, lz1 - 0.06]) post(b, far, z, 0, loY, 0.04, WOOD_GREY, 4);
    const g = new THREE.BoxGeometry(Math.hypot(lx1 - lx0, hiY - loY), 0.03, lz1 - lz0 + 0.1);
    g.rotateZ((h.side === 1 ? -1 : 1) * Math.atan2(hiY - loY, lx1 - lx0)).translate((near + far) / 2, (hiY + loY) / 2, (lz0 + lz1) / 2);
    b.add(g, h.cond === 'rough' ? RUST : ROOF_TIN);
  }
  // The carport: four poles and a tarp, sagging
  if (h.carport) {
    const [cx0, cz0, cx1, cz1] = h.carport;
    for (const x of [cx0 + 0.05, cx1 - 0.05]) for (const z of [cz0 + 0.05, cz1 - 0.05]) post(b, x, z, 0, 1.35, 0.035, POST, 4);
    b.box(cx0 - 0.05, 1.33, cz0 - 0.05, cx1 - cx0 + 0.1, 0.03, cz1 - cz0 + 0.1, TARPS[(h.seed >> 2) % TARPS.length]);
  }
  // The shed out back
  if (h.shed) {
    rbox(b, h.shed, 0, 1.2, h.seed % 2 ? WOOD_GREY : SIDING[(h.seed >> 4) % SIDING.length]);
    rbox(b, grow(h.shed, 0.08), 1.2, 0.06, h.cond === 'kept' ? ROOF_TIN : RUST);
    const n = outOf(lot);
    const [sx0, sz0, sx1, sz1] = h.shed;
    b.box((sx0 + sx1) / 2 - 0.3, 0, n[1] < 0 ? sz0 - 0.02 : sz1, 0.6, 0.95, 0.02, WOOD);
  }
  // The dog's run: posts and chain-link (the FX layer's), the kennel; BEWARE OF DOG on the post at the front
  if (h.dogRun) {
    const [rx0, rz0, rx1, rz1] = h.dogRun;
    for (const [x, z] of [
      [rx0, rz0],
      [rx1, rz0],
      [rx1, rz1],
      [rx0, rz1],
    ])
      post(b, x, z, 0, 1.1, 0.03, POST, 4);
    b.box(rx0 + 0.15, 0, rz1 - 0.95, 0.75, 0.6, 0.8, WOOD);
    b.add(new THREE.CylinderGeometry(0.1, 0.12, 0.05, 8).translate(rx1 - 0.35, 0.05, rz0 + 0.35), RUST);
  }
  // A junk heap: a mattress against the fence, crates, a dead fridge, a tyre
  if (h.junk) {
    const [jx0, jz0, jx1, jz1] = h.junk;
    b.box(jx0 + 0.05, 0, jz0 + 0.1, 0.18, 0.7, jz1 - jz0 - 0.3, toon('#bfb49a'));
    b.box(jx1 - 0.6, 0, jz0 + 0.2, 0.5, 0.65, 0.5, toon('#d9d6cc'));
    b.box(jx0 + 0.3, 0, jz1 - 0.6, 0.45, 0.3, 0.45, WOOD);
    tyre(b, (jx0 + jx1) / 2, 0, (jz0 + jz1) / 2, low);
  }
  // KEEP OUT on its post at the lot's front
  if (h.keepOut) {
    const [kx, kz] = h.keepOut;
    post(b, kx, kz, 0, 1.05, 0.03, WOOD_GREY, 4);
    const n = outOf(lot);
    const row = h.dogRun ? SIGN_ROW.dog : h.cond === 'condemned' ? SIGN_ROW.keepOut : (h.seed & 1) === 1 ? SIGN_ROW.private : SIGN_ROW.keepOut;
    sign(b, row, kx, 0.88, kz + n[1] * 0.04, n, 0.62, 0.62 * 0.125 * 1.6);
  }
}

/** A lot's ground: the gravel pad under the home and the drive, weeds round the edges near only */
function ground(b: Batch, lot: Lot, low: boolean, r: () => number) {
  const [x0, z0, x1, z1] = lot.rect;
  if (lot.home) {
    flat(b, grow(lot.home.body, 0.3), PAD_Y, PAD);
    if (lot.home.car) {
      const c = lot.home.car;
      flat(b, [c.x - 0.75, Math.min(z0, z1) + (lot.face === 'n' ? 0 : z1 - z0 - 3.6), c.x + 0.75, lot.face === 'n' ? z0 + 3.6 : z1], PAD_Y + 0.001, GRAVEL_DARK);
    }
  } else if (lot.use === 'vacant') {
    // An old slab where a home stood, cracked; weeds through it
    const [ux0, uz0] = [x0 + 1.8, z0 + 1.2];
    flat(b, [ux0, uz0, ux0 + 2.6, uz0 + 7], PAD_Y, CONCRETE_DARK);
    b.detail(() => {
      if (low) return;
      for (let i = 0; i < 10; i++) b.add(new THREE.ConeGeometry(0.14 + r() * 0.1, 0.3 + r() * 0.35, 4, 1, true).translate(x0 + 0.5 + r() * (x1 - x0 - 1), 0.2, z0 + 0.5 + r() * (z1 - z0 - 1)), WEEDS[i % 3]);
    });
  }
  b.detail(() => {
    if (low) return;
    // (tufts of weeds along the lot's edges)
    for (let i = 0; i < 4; i++) {
      const x = r() < 0.5 ? x0 + 0.2 : x1 - 0.2;
      b.add(new THREE.ConeGeometry(0.12, 0.28, 4, 1, true).translate(x, 0.14, z0 + 0.6 + r() * (z1 - z0 - 1.2)), WEEDS[i % 3]);
    }
  });
}

/* ---------- The tunnel ---------- */

/** A vertical quad from (a, ya0..ya1) to (c, yc0..yc1), facing n */
function wallQuad(b: Batch, a: Pt, c: Pt, ya0: number, ya1: number, yc0: number, yc1: number, n: Pt, m: THREE.Material) {
  const g = new THREE.BufferGeometry();
  const p = [a[0], ya0, a[1], c[0], yc0, c[1], c[0], yc1, c[1], a[0], ya1, a[1]];
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  const e = new THREE.Vector3(c[0] - a[0], yc0 - ya0, c[1] - a[1]);
  const u = new THREE.Vector3(0, 1, 0);
  const face = e.clone().cross(u);
  g.setIndex(face.dot(new THREE.Vector3(n[0], 0, n[1])) >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
  g.computeVertexNormals();
  b.add(g, m);
}
/** A sloping floor quad across the tunnel from za to zc (its height each end) */
function floorQuad(b: Batch, za: number, zc: number, ya: number, yc: number, m: THREE.Material) {
  const T = TUNNEL;
  const g = new THREE.BufferGeometry();
  const [xa, xc] = [T.x - T.half, T.x + T.half];
  g.setAttribute('position', new THREE.Float32BufferAttribute([xa, ya, za, xc, ya, za, xc, yc, zc, xa, yc, zc], 3));
  g.setIndex([0, 2, 1, 0, 3, 2]);
  g.computeVertexNormals();
  if (g.attributes.normal.getY(0) < 0) g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  b.add(g, m);
}

function registerTunnel(low: boolean) {
  const T = TUNNEL;
  const [wx, ex] = [T.x - T.half, T.x + T.half];
  // The stretches: the north ramp, the north cutting's flat, the passage, the south cutting's flat, the south ramp
  const breaks = [T.z0, T.ramp0, T.roof0, T.roof1, T.ramp1, T.z1];
  const pieces: [number, number][] = [
    [T.z0, T.roof0],
    [T.roof0, T.roof1],
    [T.roof1, T.z1],
  ];
  pieces.forEach(([za, zc], i) =>
    site(`lot9 tunnel ${i}`, [wx - 1, za - 1, ex + 1, zc + 1], (into) => {
      const b = new Batch();
      const fx0 = new Batch();
      const roofed = i === 1;
      const zs = breaks.filter((z) => z >= za && z <= zc);
      // Floor and walls, a piece between each break
      for (let k = 1; k < zs.length; k++) {
        const [a, c] = [zs[k - 1], zs[k]];
        const [ya, yc] = [tunnelFloor(a), tunnelFloor(c)];
        floorQuad(b, a, c, ya, yc, TUNNEL_FLOOR);
        const top = roofed ? T.ceil : 0;
        wallQuad(b, [wx, a], [wx, c], ya, top, yc, top, [1, 0], TUNNEL_WALL);
        wallQuad(b, [ex, a], [ex, c], ya, top, yc, top, [-1, 0], TUNNEL_WALL);
        // (a drain channel along the west wall's foot)
        if (!low) {
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.Float32BufferAttribute([wx, ya + 0.004, a, wx + 0.18, ya + 0.004, a, wx + 0.18, yc + 0.004, c, wx, yc + 0.004, c], 3));
          g.setIndex([0, 2, 1, 0, 3, 2]);
          g.computeVertexNormals();
          b.add(g, BLACK);
        }
      }
      if (roofed) {
        // The ceiling (facing down), the fluorescent strips along it: a few tired and flickering, one dead
        b.add(new THREE.PlaneGeometry(ex - wx, zc - za).rotateX(Math.PI / 2).translate(T.x, T.ceil, (za + zc) / 2), TUNNEL_CEIL);
        let n = 0;
        for (let z = za + 1.2; z < zc - 0.8; z += 2.4, n++) {
          const m = n === 3 ? TUBE_DEAD : n % 3 === 1 ? TUBE_TIRED : TUBE;
          b.box(T.x - 0.06, T.ceil - 0.05, z - 0.6, 0.12, 0.04, 1.2, m);
          b.box(T.x - 0.09, T.ceil - 0.02, z - 0.65, 0.18, 0.02, 1.3, CONCRETE_DARK);
        }
        // A puddle where the roof drips, rubbish against the wall
        flat(b, [T.x - 0.5, 318, T.x + 0.4, 319.6], T.floor + 0.006, PUDDLE);
        b.detail(() => {
          if (low) return;
          b.box(ex - 0.35, T.floor, 322.4, 0.25, 0.18, 0.35, toon('#cfc9b8'));
          b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 6).rotateZ(Math.PI / 2).translate(ex - 0.5, T.floor + 0.06, 323.1), toon('#3d7a4a'));
        });
        // Tags down both walls, a bill or two (the FX layer)
        [314.2, 317.6, 321.4, 324.8].forEach((z, j) => {
          tag(fx0, j * 3 + 1, 1.3, [1, 0], wx + 0.01, T.floor + 0.75 + (j % 2) * 0.25, z);
          tag(fx0, j * 3 + 2, 1.1, [-1, 0], ex - 0.01, T.floor + 0.7 + ((j + 1) % 2) * 0.3, z + 1.3);
        });
        poster(fx0, 3, 1, [1, 0], wx + 0.012, T.floor + 1.05, 319.4);
      } else {
        // The open cutting: its walls' tops at the ground, the parapets over them, the headwall over the portal
        const z1 = zc;
        for (const x of [wx - T.wall, ex]) b.box(x, 0, za, T.wall, T.rail, z1 - za, CONCRETE);
        // (a coping along each parapet)
        for (const x of [wx - T.wall - 0.03, ex - 0.03]) b.box(x, T.rail, za, T.wall + 0.06, 0.05, z1 - za, CONCRETE_DARK);
        const north = i === 0;
        const portal = north ? T.roof0 : T.roof1;
        const [hz0, hz1] = north ? [portal, portal + 0.3] : [portal - 0.3, portal];
        b.box(wx - T.wall, T.ceil, hz0, ex - wx + 2 * T.wall, T.rail - T.ceil, hz1 - hz0, CONCRETE);
        b.box(wx - T.wall - 0.03, T.rail, hz0 - 0.02, ex - wx + 2 * T.wall + 0.06, 0.05, hz1 - hz0 + 0.04, CONCRETE_DARK);
        // A lamp in a cage over the portal
        const pz = north ? portal - 0.02 : portal + 0.02;
        b.box(T.x - 0.15, T.ceil - 0.18, pz - (north ? 0.12 : 0), 0.3, 0.12, 0.12, BLACK);
        b.box(T.x - 0.1, T.ceil - 0.24, pz - (north ? 0.1 : -0.02), 0.2, 0.06, 0.08, BULB);
        // Tags on the headwall's face and the cutting's walls, a SLOW / PRIVATE board at the top of the ramp
        tag(fx0, north ? 7 : 9, 1.6, [0, north ? -1 : 1], T.x, (T.ceil + T.rail) / 2 + 0.1, portal + (north ? -0.012 : 0.012));
        tag(fx0, north ? 4 : 10, 1.4, [1, 0], wx + 0.01, (tunnelFloor((za + z1) / 2) + 0) / 2, (za + z1) / 2);
        // The bollards across the top of the ramp, yellow and black
        for (const [x, z] of TUNNEL_BOLLARDS.filter(([, z]) => z > za - 0.5 && z < z1 + 0.5)) {
          post(b, x, z, 0, BOLLARD.h, BOLLARD.r * 0.85, YELLOW, low ? 6 : 8);
          b.add(new THREE.CylinderGeometry(BOLLARD.r * 0.86, BOLLARD.r * 0.86, 0.14, low ? 6 : 8, 1, true).translate(x, BOLLARD.h - 0.2, z), BLACK);
        }
      }
      b.build(into, { cast: true, receive: true });
      buildFx(fx0, into);
    })
  );
  // The footpath on Lot 9's side: worn dirt from the top of the ramp through the hole to the north lane
  site('lot9 footpath', [FOOTPATH[0][0] - 3, FOOTPATH[0][1] - 1, FOOTPATH[0][0] + 3, FOOTPATH[FOOTPATH.length - 1][1] + 1], (into) => {
    const b = new Batch();
    for (let i = 1; i < FOOTPATH.length; i++) strip(b, FOOTPATH[i - 1], FOOTPATH[i], 0.6, Y + 0.002, toon(COVER.bare));
    b.build(into, { cast: false, receive: true });
  });
  // On Bottom Street's side: a worn path between the blocks from the sidewalk to the top of the ramp
  site('lot9 tunnel path', [T.x - 2, 296, T.x + 2, T.z0 + 1], (into) => {
    const b = new Batch();
    strip(b, [T.x, 297.6], [T.x, T.z0 + 0.2], 0.75, Y + 0.002, toon(COVER.bare));
    b.build(into, { cast: false, receive: true });
  });
}

/* ---------- The rest ---------- */

export function register({ low, scene, tick }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  registerTunnel(low);

  // The lanes: gravel, a darker rut down each wheel track, potholes with puddles near only
  for (const s of LOT9_STREETS)
    for (let i = 1; i < s.pts.length; i++) {
      // (the lane in from the avenue's asphalt's edge, not over it)
      const a: Pt = s.id === 'lot9-road' && i === 1 ? [AVE_EDGE, s.pts[0][1]] : s.pts[i - 1];
      const c = s.pts[i];
      const runs = along(a, c, 20);
      for (let k = 1; k < runs.length; k++) {
        const [p, q] = [runs[k - 1], runs[k]];
        site(`lot9 lane ${s.id} ${i} ${k}`, [Math.min(p[0], q[0]) - 2, Math.min(p[1], q[1]) - 2, Math.max(p[0], q[0]) + 2, Math.max(p[1], q[1]) + 2], (into) => {
          const b = new Batch();
          const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
          const [ux, uz] = [(q[0] - p[0]) / l, (q[1] - p[1]) / l];
          // (carried on past its ends by its half width, so the corners close)
          const [pa, qa]: [Pt, Pt] = [
            [p[0] - ux * s.half, p[1] - uz * s.half],
            [q[0] + ux * s.half, q[1] + uz * s.half],
          ];
          strip(b, pa, qa, s.half, Y, GRAVEL);
          // (the ruts: two darker tracks)
          for (const o of s.oneway ? [-0.38, 0.38] : [-0.95, -0.25, 0.25, 0.95]) {
            const [ox, oz] = [-uz * o, ux * o];
            strip(b, [p[0] + ox, p[1] + oz], [q[0] + ox, q[1] + oz], 0.12, Y + 0.002, GRAVEL_DARK);
          }
          b.detail(() => {
            if (low) return;
            const r = rng(Math.round(p[0] * 7 + p[1] * 13));
            for (let j = 0; j < Math.floor(l / 6); j++) {
              const t = r();
              const o = (r() - 0.5) * s.half * 1.4;
              const [x, z] = [p[0] + (q[0] - p[0]) * t - uz * o, p[1] + (q[1] - p[1]) * t + ux * o];
              b.add(new THREE.CircleGeometry(0.25 + r() * 0.3, 8).rotateX(-Math.PI / 2).scale(1, 1, 0.7).translate(x, Y + 0.004, z), PUDDLE);
            }
          });
          b.build(into, { cast: false, receive: true });
        });
      }
    }
  // Where the lane meets the avenue: the gravel to the asphalt's edge, a SLOW board by the gate
  site('lot9 lane mouth', [GATE.x - 1, ROAD_Z - 4, GATE.x + 16, ROAD_Z + 4], (into) => {
    const b = new Batch();
    post(b, GATE.x + 2.2, ROAD_Z + GATE.half + 0.6, 0, 1.1, 0.03, POST, 4);
    sign(b, SIGN_ROW.slow, GATE.x + 2.2, 1.0, ROAD_Z + GATE.half + 0.64, [1, 0], 0.5, 0.5 * 0.125 * 1.6);
    b.build(into, { cast: true, receive: true });
  });

  // The homes, a site each; the lots' ground with them (the vacant ones and the fire pit's on their own)
  for (const lot of LOTS) {
    if (lot.use === 'firepit') continue;
    site(`lot9 ${lot.id}`, grow(lot.rect, 0.6), (into) => {
      const b = new Batch();
      const fx0 = new Batch();
      const r = rng(lot.home ? lot.home.seed : 4040 + lot.row * 31 + lot.col);
      ground(b, lot, low, r);
      if (lot.home) {
        const top = shell(b, lot.home, low, r);
        dress(b, lot.home, top, low, r);
        if (lot.home.dogRun) {
          const [rx0, rz0, rx1, rz1] = lot.home.dogRun;
          for (const [a, c] of [
            [[rx0, rz0], [rx1, rz0]],
            [[rx1, rz0], [rx1, rz1]],
            [[rx1, rz1], [rx0, rz1]],
            [[rx0, rz1], [rx0, rz0]],
          ] as [Pt, Pt][])
            chainMesh(fx0, a, c, 0.02, 1.05);
        }
        // Tags on the rough ones' sides
        if (lot.home.cond !== 'kept' && lot.home.cond !== 'worn' && !low) {
          const h = lot.home;
          const x = h.side === 1 ? h.body[0] - 0.01 : h.body[2] + 0.01;
          tag(fx0, h.seed % 12, 1.2, [h.side === 1 ? -1 : 1, 0], x, h.y0 + 0.5, (h.body[1] + h.body[3]) / 2);
        }
      }
      b.build(into, { cast: true, receive: true });
      buildFx(fx0, into);
    });
  }

  // The fence: posts every three tiles, a top rail, the mesh in the FX layer; the hole's cut flap bent back
  FENCE_RUNS.forEach(([a, c], i) => {
    const runs = along(a, c, 18);
    for (let k = 1; k < runs.length; k++) {
      const [p, q] = [runs[k - 1], runs[k]];
      site(`lot9 fence ${i} ${k}`, [Math.min(p[0], q[0]) - 1, Math.min(p[1], q[1]) - 1, Math.max(p[0], q[0]) + 1, Math.max(p[1], q[1]) + 1], (into) => {
        const b = new Batch();
        const fx0 = new Batch();
        const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
        const n = Math.max(1, Math.round(l / 3));
        for (let j = 0; j <= n; j++) post(b, p[0] + ((q[0] - p[0]) * j) / n, p[1] + ((q[1] - p[1]) * j) / n, 0, FENCE_H, 0.035, POST, low ? 4 : 6);
        bar(b, p, q, 0.05, FENCE_H - 0.05, FENCE_H, POST);
        chainMesh(fx0, p, q, 0.02, FENCE_H - 0.08);
        b.build(into, { cast: true, receive: true });
        buildFx(fx0, into);
      });
    }
  });
  site('lot9 hole', [HOLE.x - 2, FENCE[1] - 1.5, HOLE.x + 2, FENCE[1] + 1.5], (into) => {
    const fx0 = new Batch();
    const b = new Batch();
    // (the cut mesh peeled back on either side, the posts either side of the gap)
    chainMesh(fx0, [HOLE.x - HOLE.half, FENCE[1]], [HOLE.x - HOLE.half + 0.5, FENCE[1] + 0.85], 0.02, 1.0);
    chainMesh(fx0, [HOLE.x + HOLE.half, FENCE[1]], [HOLE.x + HOLE.half - 0.35, FENCE[1] - 0.7], 0.3, 0.8);
    for (const x of [HOLE.x - HOLE.half, HOLE.x + HOLE.half]) post(b, x, FENCE[1], 0, FENCE_H, 0.04, POST);
    // (and tagged)
    b.build(into, { cast: true, receive: true });
    buildFx(fx0, into);
  });
  // The gate: its posts, the two leaves swung open against the fence inside, the LOT 9 board over the lane on two poles
  site('lot9 gate', [GATE.x - 5, GATE.z - 6, GATE.x + 2, GATE.z + 6], (into) => {
    const b = new Batch();
    const fx0 = new Batch();
    for (const d of [-1, 1]) {
      const z = GATE.z + d * GATE.half;
      post(b, GATE.x, z, 0, FENCE_H + 0.2, 0.07, POST, 8);
      // (each leaf swung in to lie along the inside of the fence, one sagging)
      const leaf: [Pt, Pt] = [
        [GATE.x - 0.15, z + d * 0.1],
        [GATE.x - 0.15, z + d * (GATE.half - 0.1)],
      ];
      bar(b, leaf[0], leaf[1], 0.04, FENCE_H - 0.1, FENCE_H - 0.05, POST);
      bar(b, leaf[0], leaf[1], 0.04, 0.1, 0.14, POST);
      chainMesh(fx0, leaf[0], leaf[1], 0.12, FENCE_H - 0.25);
    }
    // The board on its two poles, over the lane (both ways)
    const [y0, y1] = [2.3, 2.75];
    for (const d of [-1, 1]) post(b, GATE.x + 0.3, GATE.z + d * (GATE.half + 0.3), 0, y1 + 0.1, 0.06, WOOD_GREY);
    b.box(GATE.x + 0.24, y0, GATE.z - GATE.half - 0.1, 0.12, y1 - y0, 2 * GATE.half + 0.2, WOOD_GREY);
    sign(b, SIGN_ROW.gate, GATE.x + 0.36, (y0 + y1) / 2, GATE.z, [1, 0], 2 * GATE.half - 0.2, y1 - y0 - 0.08);
    sign(b, SIGN_ROW.gate, GATE.x + 0.24, (y0 + y1) / 2, GATE.z, [-1, 0], 2 * GATE.half - 0.2, y1 - y0 - 0.08);
    // (and PRIVATE PROPERTY on the fence by it)
    sign(b, SIGN_ROW.private, GATE.x + 0.05, 1.0, GATE.z + GATE.half + 1.6, [1, 0], 0.9, 0.18);
    b.build(into, { cast: true, receive: true });
    buildFx(fx0, into);
  });

  // The office: an old trailer on blocks, OFFICE over its door, a light, the mailboxes on their post; the laundry:
  // cinder block, COIN LAUNDRY on its front, its windows lit pale at night, a bench outside
  site('lot9 office', grow(OFFICE.rect, 1.2), (into) => {
    const b = new Batch();
    const [x0, , x1, z1] = OFFICE.rect;
    rbox(b, OFFICE.rect, 0.36, OFFICE.h - 0.36, SIDING[1]);
    rbox(b, grow(OFFICE.rect, 0.08), OFFICE.h, 0.06, ROOF_TIN);
    rbox(b, grow(OFFICE.rect, -0.1), 0, 0.36, WOOD_GREY);
    const [dx] = OFFICE.door;
    b.box(dx - 0.33, 0.36, z1, 0.66, 1.05, 0.03, DOORS[0]);
    rbox(b, [dx - 0.8, z1, dx + 0.8, z1 + 0.6], 0, 0.36, WOOD_GREY);
    for (const x of [x0 + 0.7, x1 - 1.4]) b.box(x, 0.9, z1, 0.7, 0.45, 0.03, WARM);
    sign(b, SIGN_ROW.office, (x0 + x1) / 2, OFFICE.h - 0.25, z1 + 0.03, [0, 1], 1.8, 0.3);
    b.add(new THREE.SphereGeometry(0.05, 6, 4).translate(dx + 0.45, 1.5, z1 + 0.1), BULB);
    // The mailboxes: a row of dented boxes on a post
    const [mx, mz] = MAILBOXES;
    post(b, mx, mz, 0, 0.9, 0.04, WOOD_GREY, 4);
    b.box(mx - 0.5, 0.9, mz - 0.14, 1.0, 0.24, 0.28, POST);
    b.detail(() => {
      if (low) return;
      for (let i = 0; i < 5; i++) b.box(mx - 0.48 + i * 0.2, 0.92, mz + 0.14, 0.14, 0.18, 0.01, i % 2 ? CONCRETE : RUST);
    });
    b.build(into, { cast: true, receive: true });
  });
  site('lot9 laundry', grow(LAUNDRY.rect, 1.2), (into) => {
    const b = new Batch();
    const [x0, z0, x1] = LAUNDRY.rect;
    rbox(b, LAUNDRY.rect, 0, LAUNDRY.h, BLOCK);
    rbox(b, grow(LAUNDRY.rect, 0.06), LAUNDRY.h, 0.08, CONCRETE_DARK);
    const [dx] = LAUNDRY.door;
    b.box(dx - 0.35, 0, z0 - 0.03, 0.7, 1.1, 0.03, GLASS);
    for (const x of [x0 + 0.4, x1 - 1.6]) b.box(x, 0.55, z0 - 0.03, 1.2, 0.6, 0.03, neon('#dfe8ff', 0.05, 1.05));
    sign(b, SIGN_ROW.laundry, (x0 + x1) / 2, LAUNDRY.h - 0.22, z0 - 0.03, [0, -1], 2.4, 0.3);
    b.box(x1 - 1.8, 0, z0 - 0.75, 1.4, 0.4, 0.4, WOOD_GREY);
    b.build(into, { cast: true, receive: true });
  });

  // The fire pit: packed dirt, the burn barrel and its flames, couches and lawn chairs round it, the string lights
  // across on their poles, the bug zapper, the radio on a crate, a cooler, empty cans near only
  site('lot9 fire pit', grow(FIRE_LOT, 1), (into) => {
    const b = new Batch();
    flat(b, grow(FIRE_LOT, -0.4), PAD_Y, toon(COVER.bare));
    // The barrel: rusted, open, the flames in it (they flicker)
    b.add(new THREE.CylinderGeometry(FIRE.r, FIRE.r * 0.95, FIRE.h, low ? 8 : 12, 1, true).translate(FIRE.x, FIRE.h / 2, FIRE.z), RUST);
    b.add(new THREE.CircleGeometry(FIRE.r * 0.96, low ? 8 : 12).rotateX(-Math.PI / 2).translate(FIRE.x, FIRE.h - 0.12, FIRE.z), SOOT);
    for (let i = 0; i < (low ? 3 : 5); i++) {
      const a = (i / 5) * Math.PI * 2;
      const o = i ? 0.12 : 0;
      b.add(new THREE.ConeGeometry(0.11, 0.42 + (i % 2) * 0.14, 5, 1, true).translate(FIRE.x + Math.cos(a) * o, FIRE.h + 0.1, FIRE.z + Math.sin(a) * o), i ? FLAME : FLAME_CORE);
    }
    // The couches and chairs
    FIRE_SEATS.forEach((s, i) => {
      const m = s.couch ? toon(['#8a6a2a', '#6a3a32', '#4a5a3a'][i % 3]) : TARPS[i % TARPS.length];
      // (in the seat's own frame, its front towards +z: turned to face the barrel)
      const box = (x0: number, y0: number, z0: number, w: number, h: number, d: number, mat: THREE.Material) =>
        b.add(new THREE.BoxGeometry(w, h, d).translate(x0 + w / 2, y0 + h / 2, z0 + d / 2).rotateY(s.ry).translate(s.x, 0.02, s.z), mat);
      if (s.couch) {
        box(-0.85, 0, -0.38, 1.7, 0.3, 0.76, m);
        box(-0.85, 0.3, -0.38, 1.7, 0.42, 0.18, m);
        for (const x of [-0.85, 0.67]) box(x, 0.3, -0.2, 0.18, 0.18, 0.58, m);
      } else {
        box(-0.22, 0.26, -0.22, 0.44, 0.05, 0.44, m);
        box(-0.22, 0.31, -0.22, 0.44, 0.4, 0.05, m);
        for (const ox of [-0.2, 0.2]) for (const oz of [-0.2, 0.2]) box(ox - 0.015, 0, oz - 0.015, 0.03, 0.26, 0.03, POST);
      }
    });
    // The string lights between the poles, criss-crossed over the fire
    for (const [x, z] of FIRE_POLES) post(b, x, z, 0, 2.3, 0.05, WOOD_GREY, 5);
    b.detail(() => {
      for (const [a, c] of [
        [FIRE_POLES[0], FIRE_POLES[2]],
        [FIRE_POLES[1], FIRE_POLES[3]],
        [FIRE_POLES[0], FIRE_POLES[1]],
      ] as [Pt, Pt][]) {
        const n = low ? 6 : 10;
        for (let j = 1; j < n; j++) {
          const t = j / n;
          const sag = Math.sin(t * Math.PI) * 0.45;
          b.add(new THREE.SphereGeometry(0.045, 5, 3).translate(a[0] + (c[0] - a[0]) * t, 2.25 - sag, a[1] + (c[1] - a[1]) * t), STRING);
        }
      }
      // The radio on its crate, a cooler, cans
      b.box(RADIO[0] - 0.25, 0, RADIO[1] - 0.2, 0.5, 0.35, 0.4, WOOD);
      b.box(RADIO[0] - 0.18, 0.35, RADIO[1] - 0.08, 0.36, 0.2, 0.14, BLACK);
      b.box(FIRE.x - 1.4, 0, FIRE.z - 1.4, 0.55, 0.32, 0.36, toon('#2f5fa8'));
      if (!low) {
        const r = rng(77);
        for (let i = 0; i < 6; i++) b.add(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 5).rotateZ(Math.PI / 2).rotateY(r() * 3).translate(FIRE.x + (r() - 0.5) * 3, 0.04, FIRE.z + (r() - 0.5) * 3), toon(['#c23b3b', '#d9d6cc', '#2f5fa8'][i % 3]));
      }
    });
    // The bug zapper on its pole
    post(b, ZAPPER[0], ZAPPER[1], 0, 1.7, 0.03, POST, 4);
    b.box(ZAPPER[0] - 0.1, 1.7, ZAPPER[1] - 0.1, 0.2, 0.26, 0.2, ZAP);
    b.build(into, { cast: true, receive: true });
  });

  // The junk corner: the boat on its trailer, the mechanic's bay (a tarp on poles, the hoist, the tool chest), the
  // tyre stacks, the scrap pile
  site('lot9 junk north', [BOAT[0] - 1, BOAT[1] - 1, BAY[2] + 1, HOIST[1] + 1], (into) => {
    const b = new Batch();
    // The boat: a hull on its trailer, gone green, a tarp half off it
    const [bx0, bz0, bx1, bz1] = BOAT;
    const [cx, w] = [(bx0 + bx1) / 2, Math.min(1.6, bx1 - bx0)];
    bar(b, [cx, bz0 - 0.4], [cx, bz1], 0.12, 0.28, 0.36, BLACK);
    for (const z of [bz0 + 1.2, bz1 - 1.4]) b.add(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 10).rotateZ(Math.PI / 2).translate(cx - w / 2 - 0.05, 0.22, z), TYRE);
    const hull = new THREE.Shape();
    hull.moveTo(-w / 2, 1.2);
    hull.lineTo(w / 2, 1.2);
    hull.quadraticCurveTo(w / 2, 0.5, 0, 0.36);
    hull.quadraticCurveTo(-w / 2, 0.5, -w / 2, 1.2);
    b.add(extrudeZ(hull, bz1 - bz0 - 0.8, cx, bz0 + 0.6), toon('#5f7a5a'));
    b.box(cx - w / 2 - 0.02, 1.2, bz0 + 1.8, w + 0.04, 0.03, (bz1 - bz0) * 0.45, TARPS[0]);
    // The bay's tarp canopy on four poles, the tool chest, the engine hoist (an A-frame with its arm)
    const [ax0, az0, ax1, az1] = BAY;
    for (const x of [ax0 + 0.1, ax1 - 0.1]) for (const z of [az0 + 0.1, az1 - 0.1]) post(b, x, z, 0, 2.1, 0.04, POST, 5);
    b.box(ax0, 2.08, az0, ax1 - ax0, 0.03, az1 - az0, TARPS[2]);
    rbox(b, TOOLS, 0, 0.58, toon('#b8261f'));
    // (its drawers' lines)
    for (let k = 1; k < 4; k++) b.box(TOOLS[0] + 0.03, k * 0.14, TOOLS[1] - 0.006, TOOLS[2] - TOOLS[0] - 0.06, 0.012, 0.006, BLACK);
    const [hx, hz] = HOIST;
    rod(b, new THREE.Vector3(hx - 0.4, 0, hz), new THREE.Vector3(hx, 1.8, hz), 0.05, toon('#d23b2a'));
    rod(b, new THREE.Vector3(hx + 0.4, 0, hz), new THREE.Vector3(hx, 1.8, hz), 0.05, toon('#d23b2a'));
    rod(b, new THREE.Vector3(hx, 1.75, hz), new THREE.Vector3(hx + 1.2, 1.6, hz - 0.6), 0.045, toon('#d23b2a'));
    b.detail(() => {
      if (low) return;
      // (an engine block hanging from the hoist's chain, oil stains under the bay)
      b.box(hx + 1.0, 0.9, hz - 0.85, 0.5, 0.42, 0.4, CONCRETE_DARK);
      rod(b, new THREE.Vector3(hx + 1.2, 1.6, hz - 0.6), new THREE.Vector3(hx + 1.2, 1.32, hz - 0.65), 0.012, BLACK, 3);
      b.add(new THREE.CircleGeometry(0.6, 10).rotateX(-Math.PI / 2).scale(1, 1, 0.7).translate((ax0 + ax1) / 2 + 0.3, PAD_Y + 0.002, (az0 + az1) / 2 - 0.5), toon('#1a1820'));
    });
    flat(b, BAY, PAD_Y, CONCRETE_DARK);
    b.build(into, { cast: true, receive: true });
  });
  site('lot9 junk south', [FENCE[0], TYRES[0][1] - 2, BAY[2] + 2, FENCE[3]], (into) => {
    const b = new Batch();
    for (const [x, z, n] of TYRES) for (let j = 0; j < n; j++) tyre(b, x + (j % 2) * 0.04, j * 0.22, z, low);
    // The scrap pile: heaps of rusty sheet, pipes, a washing machine, a bike frame
    const r = rng(5150);
    for (const [x, z, s] of SCRAP) {
      for (let j = 0; j < (low ? 4 : 9); j++) {
        const g = new THREE.BoxGeometry(0.2 + r() * s * 0.8, 0.08 + r() * 0.35, 0.2 + r() * s * 0.6)
          .rotateX((r() - 0.5) * 0.8)
          .rotateY(r() * 3)
          .rotateZ((r() - 0.5) * 0.8);
        b.add(g.translate(x + (r() - 0.5) * s * 1.4, 0.1 + r() * s * 0.5, z + (r() - 0.5) * s * 1.1), [RUST, RUST_DARK, CONCRETE, WOOD_GREY][j % 4]);
      }
      if (!low) rod(b, new THREE.Vector3(x - s * 0.6, 0.2, z), new THREE.Vector3(x + s * 0.5, s * 0.7, z + 0.3), 0.05, RUST);
    }
    b.build(into, { cast: true, receive: true });
  });

  /* ---------- The main thread: cars, bikes, dogs, the fire's glow ---------- */
  if (!scene) return;
  // The homes and the residents' cars join the collision grids, the porch sitters the crowd's spare slots (phones: half)
  addSolids(HOME_SOLIDS);
  addPeople(PORCH_SITTERS.filter((_, i) => !low || i % 2 === 0), []);
  parkedCars(scene, GROUND_Y, [...LOT9_CARS, ...HOME_CARS]);
  const group = new THREE.Group();
  group.name = 'lot9-life';
  scene.add(group);
  // The fire's warm glow on the ground round the barrel (the FX layer)
  // (faint by day, warm at night)
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(6, 6).rotateX(-Math.PI / 2), lit(glowMat('#ff8a3a', 0.55), 0.15, 1));
  glow.position.set(FIRE.x, 0.05, FIRE.z);
  scene.add(fx(glow));
  // The dogs: the loose ones after the kids, the chained ones in their runs
  const dogN = LOT9_DOGS.length + CHAINED_DOGS.length;
  const dogs = new THREE.InstancedMesh(dogGeometry(), paintMat(), dogN);
  dogs.castShadow = true;
  dogs.frustumCulled = false;
  dogs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const col = new THREE.Color();
  LOT9_DOGS.forEach((d, i) => dogs.setColorAt(i, col.set(d.coat)));
  CHAINED_DOGS.forEach((d, i) => dogs.setColorAt(LOT9_DOGS.length + i, col.set(d.coat)));
  group.add(dogs);
  // The kids' bikes (BMX: small wheels, a low frame), under their riders
  const bikes = new THREE.InstancedMesh(bmx(), paintMat(), KIDS_ON_BIKES);
  bikes.castShadow = true;
  bikes.frustumCulled = false;
  bikes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ['#e219e5', '#00b8d8', '#ffd23f'].forEach((c, i) => i < KIDS_ON_BIKES && bikes.setColorAt(i, col.set(c)));
  group.add(bikes);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const sv = new THREE.Vector3();
  const update = (t: number) => {
    LOT9_DOGS.forEach((d, k) => {
      const p = runnerAt(d.kid, t, d.back);
      const ph = t * 10 + k;
      e.set(0, p.ry - Math.PI / 2, Math.sin(ph) * 0.06, 'YXZ');
      dogs.setMatrixAt(k, m4.compose(v.set(p.x, GROUND_Y + Math.abs(Math.sin(ph)) * 0.03, p.z), q.setFromEuler(e), sv.setScalar(d.size)));
    });
    CHAINED_DOGS.forEach((d, k) => {
      // (pacing a little in its run, now and then)
      const sway = Math.sin(t * 0.7 + k * 2) * 0.25;
      e.set(0, d.ry + sway - Math.PI / 2, 0, 'YXZ');
      dogs.setMatrixAt(LOT9_DOGS.length + k, m4.compose(v.set(d.x, GROUND_Y, d.z), q.setFromEuler(e), sv.setScalar(1)));
    });
    dogs.instanceMatrix.needsUpdate = true;
    for (let k = 0; k < KIDS_ON_BIKES; k++) {
      const p = riderAt(k, t);
      bikes.setMatrixAt(k, m4.compose(v.set(p.x, GROUND_Y, p.z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.ry), sv.setScalar(RIDER.bike)));
    }
    bikes.instanceMatrix.needsUpdate = true;
  };
  update(0);
  const [x0, z0, x1, z1] = LOT9_RECT;
  tick?.(({ t }) => {
    const ex = CROWD_VIEW.eye.x;
    const ez = CROWD_VIEW.eye.z;
    group.visible = Math.hypot(Math.max(x0 - ex, ex - x1, 0), Math.max(z0 - ez, ez - z1, 0)) < 200;
    if (group.visible) update(t);
  });
}

/** A kid's BMX along +z (its front): small fat wheels, a low frame (painted per bike), the bars up high */
function bmx() {
  const b = new Batch();
  const R = 0.2;
  const WHITE = toon('#f3f2f7');
  const STEEL = toon('#8f93ad');
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
  const g = new THREE.Group();
  b.build(g);
  return (g.children[0] as THREE.Mesh).geometry;
}
