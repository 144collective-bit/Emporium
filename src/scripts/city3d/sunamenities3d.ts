/*
 * Sunridge's club, park and school drawn (docs/suburb-plan.md Phase 4; their numbers are sunplaces.ts's and
 * sunamenities.ts's), sites in Sunridge's chunk: the clubhouse (stucco, a tile roof like the houses', a glass front,
 * its portico), its pool yard (the deck, the lap pool with its lanes, the splash pool under a shade sail, umbrellas,
 * loungers, the lifeguard's chair, the black iron fence), the pickleball courts in their windscreened fence, the car
 * park and its drive; the park (its walk, the lawn, the playground on red rubber under shade sails, the ramada and its
 * tables, trees, benches, the drinking fountain); the school (its stucco wings under flat roofs with parapets and lit
 * classroom windows, the hall, the blue covered walks, the field with its lines and goals, the playground, the bus
 * bay, the flagpole); the names on low walls from one small atlas (fixed made-up copy); on the main thread the cars
 * and the bus (`parkedCars()`) and what's solid (`addSolids()`).
 */
import * as THREE from 'three';
import { Batch, canvasTex, lit, siteMat, toon } from './kit';
import { site } from './tilework';
import { SLAB } from './world';
import { parkedCars, type CarId } from './cars';
import { addSolids } from './solids';
import { ribbon } from './roads3d';
import { GLASS, GLASS_LIT, ROOF_MATS, roofOf } from './sunhouses3d';
import { CLUBHOUSE, CLUB_LAND, PARK_LAND, SCHOOL, SCHOOL_LAND } from './sunplaces';
import { PARKWAY_LOOP, type Rect } from './sunridge';
import {
  AMENITY_SOLIDS,
  BAY,
  BUS_BAY,
  CANOPIES,
  CANOPY_H,
  CAR_PARK,
  CLUB_BAYS,
  CLUB_CARS,
  CLUB_DRIVE,
  CLUB_SIGN,
  COURTS,
  COURT_FENCE,
  COURT_FENCE_H,
  COURT_GATE,
  DRINK,
  FIELD,
  FLAG,
  FLAG_H,
  GOAL,
  GOALS,
  LAP_POOL,
  LIFEGUARD,
  LOUNGERS,
  PARK_BENCHES,
  PARK_SPUR,
  PARK_TABLES,
  PARK_TREES,
  PARK_WALK,
  PLAY,
  PLAYGROUND,
  POOL_FENCE_H,
  POOL_GATE,
  POOL_YARD,
  PORTICO,
  RAMADA,
  RAMADA_H,
  SCHOOL_BUS,
  SCHOOL_PLAY,
  SCHOOL_PLAY_TOWER,
  SIGN,
  SPLASH,
  UMBRELLAS,
  WALK_W,
} from './sunamenities';

type Pt = [number, number];

const STUCCO = toon('#e4d6b8');
const STUCCO_TRIM = toon('#f2e8d2');
const SCHOOL_WALL = toon('#d6bf96');
const SCHOOL_BASE = toon('#9c7f5f');
const PARAPET = toon('#c9ae84');
const ROOF_FLAT = toon('#8c8a84');
const BLUE_METAL = toon('#3a6896');
const STEEL = toon('#2e2e34');
const WHITE = toon('#e9e4da');
const DECK = toon('#d8cdb6');
const COPING = toon('#e6dcc6');
const CONCRETE = toon('#c8c0b0');
const ASPHALT = toon('#3a3846');
const LINE = toon('#e8e4f0');
const COURT_IN = toon('#3a6ea6');
const COURT_OUT = toon('#3f7d5a');
const WINDSCREEN = toon('#1f3a2c');
const LAWN = toon('#4f9a49');
const FIELD_GRASS = toon('#4c9446');
const RUBBER = toon('#a24f3b');
const RUBBER_BLUE = toon('#3d6fa3');
const PLAY_RED = toon('#d6452e');
const PLAY_YELLOW = toon('#f2c21b');
const SAIL = toon('#e9d8b0');
const SAIL_TEAL = toon('#3aa39a');
const UMBRELLA = [toon('#2f7f9e'), toon('#e9e4da'), toon('#d6452e')];
const TRUNK = toon('#6b4e36');
const LEAF = toon('#5a8c3d');
const WOOD = toon('#8a6a4a');
const LANE = toon('#24456e');
const FLAG_A = toon('#7b3fbf');
const FLAG_B = toon('#2ec4d6');
const POOL = siteMat('sun-pool-club', lit(toon('#4fb5d6', { emissive: '#2fd2ff' }), 0, 0.55));
const AC = toon('#c9cbc8');
const LAMP = siteMat('sun-club-lamp', lit(toon('#fff1d0', { emissive: '#ffd9a0' }), 0.1, 1.2));

/** The names on the low walls: one small atlas, a row each (fixed made-up copy) */
const SIGN_TEX = siteMat(
  'sun-place-signs',
  new THREE.MeshBasicMaterial({
    map: canvasTex(512, 128, (c) => {
      for (const [row, text] of [CLUB_SIGN.text, SIGN.text].entries()) {
        const y = row * 64;
        c.fillStyle = '#8f7a5e';
        c.fillRect(0, y, 512, 64);
        c.fillStyle = '#b9a27e';
        c.fillRect(5, y + 5, 502, 54);
        c.fillStyle = '#3e2a16';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = '600 34px "Big Shoulders Display", Georgia, serif';
        c.fillText(text, 256, y + 34);
      }
    }),
  })
);

/** A world-numbers box from x0, z0 to x1, z1 and y0 to y1 over the lots' top */
const boxOn = (b: Batch, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, m: THREE.Material) => b.box(Math.min(x0, x1), SLAB + y0, Math.min(z0, z1), Math.abs(x1 - x0), y1 - y0, Math.abs(z1 - z0), m);
/** A flat rect on the lots' top, `y` over it */
const flat = (b: Batch, r: Rect, y: number, m: THREE.Material) => b.add(new THREE.PlaneGeometry(r[2] - r[0], r[3] - r[1]).rotateX(-Math.PI / 2).translate((r[0] + r[2]) / 2, SLAB + y, (r[1] + r[3]) / 2), m);
const cyl = (b: Batch, x: number, z: number, r: number, y0: number, y1: number, m: THREE.Material, seg = 8) => b.add(new THREE.CylinderGeometry(r, r, y1 - y0, seg, 1, true).translate(x, SLAB + (y0 + y1) / 2, z), m);
/** A plane on a wall facing +z (south), -z (north), +x (east) or -x (west), its middle at (x, z) on the wall's face */
function pane(b: Batch, face: 'n' | 's' | 'e' | 'w', x: number, z: number, w: number, y0: number, h: number, m: THREE.Material, off = 0.015) {
  const g = new THREE.PlaneGeometry(w, h).translate(0, SLAB + y0 + h / 2, 0);
  if (face === 's') g.translate(x, 0, z + off);
  else if (face === 'n') g.rotateY(Math.PI).translate(x, 0, z - off);
  else if (face === 'e') g.rotateY(Math.PI / 2).translate(x + off, 0, z);
  else g.rotateY(-Math.PI / 2).translate(x - off, 0, z);
  b.add(g, m);
}
/** A tile-roofed hip over a world box (the houses' roofs), its soffit */
function tileRoof(b: Batch, r: Rect, top: number, roof = 0) {
  const p = { kind: 'main' as const, u0: r[0], u1: r[2], v0: -r[3], v1: -r[1], top, storeys: 1 as const };
  const ro = roofOf(p);
  b.add(ro.roof.translate(0, SLAB, 0), ROOF_MATS[roof]);
  b.add(ro.soffit.translate(0, SLAB, 0), STUCCO_TRIM);
}
/** A fence round a box: posts every `step`, rails top and bottom, a gate gap on its south side */
function fenceAround(b: Batch, r: Rect, gate: { x: number; w: number }, h: number, m: THREE.Material, step = 0.75, screen?: THREE.Material) {
  const [x0, z0, x1, z1] = r;
  const sides: [Pt, Pt][] = [
    [[x0, z0], [x1, z0]],
    [[x0, z0], [x0, z1]],
    [[x1, z0], [x1, z1]],
    [[x0, z1], [gate.x - gate.w / 2, z1]],
    [[gate.x + gate.w / 2, z1], [x1, z1]],
  ];
  for (const [a, c] of sides) {
    const along = Math.abs(c[0] - a[0]) > Math.abs(c[1] - a[1]);
    const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (L < 0.05) continue;
    for (const y of [0.12, h - 0.05]) boxOn(b, a[0] - (along ? 0 : 0.03), a[1] - (along ? 0.03 : 0), c[0] + (along ? 0 : 0.03), c[1] + (along ? 0.03 : 0), y, y + 0.05, m);
    const n = Math.max(1, Math.round(L / step));
    for (let k = 0; k <= n; k++) {
      const [x, z] = [a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n];
      boxOn(b, x - 0.035, z - 0.035, x + 0.035, z + 0.035, 0, h, m);
    }
    if (screen) {
      // (a windscreen on the court fence, both its faces)
      const mid: Pt = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
      for (const turn of [0, Math.PI]) {
        const g = new THREE.PlaneGeometry(L, h - 0.3).rotateY(turn + (along ? 0 : Math.PI / 2)).translate(mid[0], SLAB + 0.15 + (h - 0.3) / 2, mid[1]);
        b.add(g, screen);
      }
    }
  }
}
/** A flat triangle (a shade sail) through three points at height h, seen from both sides */
function sail(b: Batch, pts: Pt[], h: number, m: THREE.Material) {
  const [a, c, d] = pts.map(([x, z]): [number, number, number] => [x, SLAB + h, z]);
  const pos = [...a, ...c, ...d, ...a, ...d, ...c];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  b.add(g, m);
}
/** A shade tree */
function tree(b: Batch, x: number, z: number, s: number, low: boolean) {
  cyl(b, x, z, 0.09 * s, 0, 1.3 * s, TRUNK, 6);
  b.add(new THREE.IcosahedronGeometry(0.85 * s, low ? 0 : 1).scale(1, 0.85, 1).translate(x, SLAB + 1.75 * s, z), LEAF);
}
/** A bench facing (sin yaw, cos yaw) */
function bench(b: Batch, x: number, z: number, yaw: number) {
  const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, SLAB, z);
  const parts: [number, number, number, number, number, number, THREE.Material][] = [
    [-0.7, 0.36, -0.2, 0.7, 0.42, 0.2, WOOD],
    [-0.7, 0.42, -0.22, 0.7, 0.8, -0.17, WOOD],
    [-0.62, 0, -0.18, -0.55, 0.36, 0.18, STEEL],
    [0.55, 0, -0.18, 0.62, 0.36, 0.18, STEEL],
  ];
  for (const [x0, y0, z0, x1, y1, z1, mat] of parts) b.add(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2).applyMatrix4(m), mat);
}
/** A picnic table along x */
function picnic(b: Batch, x: number, z: number) {
  boxOn(b, x - 0.9, z - 0.38, x + 0.9, z + 0.38, 0.7, 0.76, WOOD);
  for (const dz of [-0.7, 0.7]) boxOn(b, x - 0.9, z + dz - 0.14, x + 0.9, z + dz + 0.14, 0.4, 0.45, WOOD);
  for (const dx of [-0.7, 0.7]) boxOn(b, x + dx - 0.05, z - 0.8, x + dx + 0.05, z + 0.8, 0, 0.7, STEEL);
}
/** The loop's kerb on its inner side at x (where a drive comes in from it) */
const kerbAt = (x: number) => PARKWAY_LOOP.filter((p) => p[1] > -45).reduce((a, c) => (Math.abs(c[0] - x) < Math.abs(a[0] - x) ? c : a))[1] - 1.72;

function drawClub(b: Batch, low: boolean) {
  const [x0, z0, x1, z1] = CLUBHOUSE.rect;
  const top = CLUBHOUSE.h;
  // The clubhouse: walls, a base, a tile roof; its glass front either side of the portico, side and back windows
  boxOn(b, x0 - 0.04, z0 - 0.04, x1 + 0.04, z1 + 0.04, 0, 0.12, PARAPET);
  boxOn(b, x0, z0, x1, z1, 0.1, top, STUCCO);
  tileRoof(b, CLUBHOUSE.rect, top, 0);
  for (const x of [x0 + 1.4, x0 + 3.2, x1 - 3.2, x1 - 1.4]) {
    pane(b, 's', x, z1, 1.5, 0.75, 1.0, STUCCO_TRIM, 0.02);
    pane(b, 's', x, z1, 1.3, 0.85, 0.82, GLASS_LIT, 0.03);
  }
  // The door under the portico, its glass
  pane(b, 's', 150.5, z1, 1.6, 0.1, 1.5, STUCCO_TRIM, 0.02);
  pane(b, 's', 150.5, z1, 1.3, 0.1, 1.35, GLASS, 0.03);
  // The portico: two columns, a small tile roof over the door
  const [qx0, , qx1, qz1] = PORTICO;
  for (const x of [qx0 + 0.25, qx1 - 0.25]) boxOn(b, x - 0.16, qz1 - 0.36, x + 0.16, qz1 - 0.04, 0, 1.7, STUCCO_TRIM);
  tileRoof(b, [qx0, z1 - 0.3, qx1, qz1], 1.7, 0);
  b.detail(() => {
    // Side and back windows, the back door to the pool, lamps by the front door
    for (const z of [z0 + 2, z1 - 2]) {
      pane(b, 'w', x0, z, 1.2, 0.8, 0.8, GLASS, 0.02);
      pane(b, 'e', x1, z, 1.2, 0.8, 0.8, GLASS, 0.02);
    }
    for (const x of [x0 + 2.5, x1 - 2.5]) pane(b, 'n', x, z0, 1.4, 0.8, 0.85, GLASS_LIT, 0.02);
    pane(b, 'n', 150.5, z0, 1.2, 0.1, 1.35, GLASS, 0.02);
    for (const x of [149.4, 151.6]) boxOn(b, x - 0.07, z1, x + 0.07, z1 + 0.08, 1.05, 1.25, LAMP);
  });
  // The name on its low wall
  {
    const [sx0, sz0, sx1, sz1] = CLUB_SIGN.rect;
    boxOn(b, sx0, sz0, sx1, sz1, 0, CLUB_SIGN.h, STUCCO);
    boxOn(b, sx0 - 0.04, sz0 - 0.04, sx1 + 0.04, sz1 + 0.04, CLUB_SIGN.h, CLUB_SIGN.h + 0.06, PARAPET);
    const w = sx1 - sx0 - 0.4;
    b.add(signPlane(w, 0).translate((sx0 + sx1) / 2, SLAB + CLUB_SIGN.h / 2 + 0.05, sz1 + 0.008), SIGN_TEX);
  }

  // The pool yard: its deck, the lap pool with lanes, the splash pool under its sail, the fence
  flat(b, POOL_YARD, 0.012, DECK);
  const [lx0, lz0, lx1, lz1] = LAP_POOL;
  const c = 0.14;
  for (const r of [
    [lx0 - c, lz0 - c, lx1 + c, lz0],
    [lx0 - c, lz1, lx1 + c, lz1 + c],
    [lx0 - c, lz0, lx0, lz1],
    [lx1, lz0, lx1 + c, lz1],
  ] as Rect[])
    boxOn(b, r[0], r[1], r[2], r[3], 0, 0.08, COPING);
  flat(b, LAP_POOL, 0.045, POOL);
  for (let k = 1; k < 4; k++) {
    const z = lz0 + ((lz1 - lz0) * k) / 4;
    flat(b, [lx0 + 0.4, z - 0.05, lx1 - 0.4, z + 0.05], 0.052, LANE);
  }
  b.add(new THREE.CircleGeometry(SPLASH.r, low ? 16 : 28).rotateX(-Math.PI / 2).translate(SPLASH.x, SLAB + 0.045, SPLASH.z), POOL);
  b.add(new THREE.RingGeometry(SPLASH.r, SPLASH.r + 0.14, low ? 16 : 28).rotateX(-Math.PI / 2).translate(SPLASH.x, SLAB + 0.08, SPLASH.z), COPING);
  const sailPts: Pt[] = [
    [SPLASH.x - 2, SPLASH.z + 1.9],
    [SPLASH.x + 2.1, SPLASH.z + 1.2],
    [SPLASH.x, SPLASH.z - 2.1],
  ];
  sail(b, sailPts, 2.5, SAIL_TEAL);
  for (const [x, z] of sailPts) cyl(b, x, z, 0.05, 0, 2.55, STEEL, 6);
  fenceAround(b, POOL_YARD, POOL_GATE, POOL_FENCE_H, STEEL);
  b.detail(() => {
    // Umbrellas, loungers facing the water, the lifeguard's chair
    for (const [i, [x, z]] of UMBRELLAS.entries()) {
      cyl(b, x, z, 0.03, 0, 1.75, STEEL, 5);
      b.add(new THREE.ConeGeometry(0.95, 0.32, low ? 6 : 10, 1, true).translate(x, SLAB + 1.85, z), UMBRELLA[i % UMBRELLA.length]);
    }
    if (!low)
      for (const { x, z } of LOUNGERS) {
        boxOn(b, x - 0.25, z - 0.5, x + 0.25, z + 0.5, 0.18, 0.24, WHITE);
        boxOn(b, x - 0.25, z + 0.3, x + 0.25, z + 0.5, 0.24, 0.52, WHITE);
      }
    const [gx, gz] = LIFEGUARD;
    for (const dx of [-0.25, 0.25]) boxOn(b, gx + dx - 0.04, gz - 0.04, gx + dx + 0.04, gz + 0.04, 0, 1.4, WHITE);
    boxOn(b, gx - 0.3, gz - 0.3, gx + 0.3, gz + 0.3, 1.4, 1.48, WHITE);
    boxOn(b, gx - 0.3, gz + 0.24, gx + 0.3, gz + 0.3, 1.48, 1.9, WHITE);
  });

  // The pickleball courts: the surround, the courts, their lines and nets; the windscreened fence
  flat(b, COURT_FENCE, 0.01, COURT_OUT);
  for (const r of COURTS) {
    flat(b, r, 0.016, COURT_IN);
    const [cx0, cz0, cx1, cz1] = r;
    const t = 0.03;
    const mid = (cz0 + cz1) / 2;
    const kitchen = 1.18;
    for (const lr of [
      [cx0, cz0, cx1, cz0 + t],
      [cx0, cz1 - t, cx1, cz1],
      [cx0, cz0, cx0 + t, cz1],
      [cx1 - t, cz0, cx1, cz1],
      [cx0, mid - kitchen - t / 2, cx1, mid - kitchen + t / 2],
      [cx0, mid + kitchen - t / 2, cx1, mid + kitchen + t / 2],
      [(cx0 + cx1) / 2 - t / 2, cz0, (cx0 + cx1) / 2 + t / 2, mid - kitchen],
      [(cx0 + cx1) / 2 - t / 2, mid + kitchen, (cx0 + cx1) / 2 + t / 2, cz1],
    ] as Rect[])
      flat(b, lr, 0.022, LINE);
    // The net across the middle
    boxOn(b, cx0 - 0.15, mid - 0.02, cx1 + 0.15, mid + 0.02, 0.05, 0.5, WINDSCREEN);
    boxOn(b, cx0 - 0.15, mid - 0.025, cx1 + 0.15, mid + 0.025, 0.45, 0.52, WHITE);
    for (const x of [cx0 - 0.15, cx1 + 0.15]) cyl(b, x, mid, 0.035, 0, 0.55, STEEL, 5);
  }
  fenceAround(b, COURT_FENCE, COURT_GATE, COURT_FENCE_H, STEEL, 1.6, WINDSCREEN);

  // The car park: its asphalt, the bays' lines, the drive out across the sidewalk to the loop
  flat(b, CAR_PARK, 0.01, ASPHALT);
  for (let i = 0; i <= CLUB_BAYS.length; i++) {
    const x = CLUB_BAYS[0][0] + i * BAY.w;
    flat(b, [x - 0.05, CAR_PARK[1] + 0.1, x + 0.05, CAR_PARK[1] + BAY.d], 0.018, LINE);
  }
  const [d0, d1] = CLUB_DRIVE;
  flat(b, [d0, CAR_PARK[3], d1, kerbAt((d0 + d1) / 2)], 0.012, CONCRETE);
}

function drawPark(b: Batch, low: boolean) {
  // The lawn, the walk round it and its way in
  flat(b, [PARK_LAND[0] + 0.5, PARK_LAND[1] + 0.5, PARK_LAND[2] - 0.5, PARK_LAND[3] - 0.3], 0.006, LAWN);
  b.add(ribbon(PARK_WALK, -WALK_W / 2, WALK_W / 2, () => SLAB + 0.014), CONCRETE);
  flat(b, PARK_SPUR, 0.016, CONCRETE);
  // The playground on red rubber with a blue path through it
  flat(b, PLAYGROUND, 0.012, RUBBER);
  flat(b, [PLAYGROUND[0] + 0.3, -53.2, PLAYGROUND[2] - 0.3, -51.2], 0.018, RUBBER_BLUE);
  for (const [x, z] of PLAY.towers) {
    const t = PLAY.tower;
    for (const [dx, dz] of [
      [-t, -t],
      [t, -t],
      [-t, t],
      [t, t],
    ])
      boxOn(b, x + dx - 0.06, z + dz - 0.06, x + dx + 0.06, z + dz + 0.06, 0, PLAY.roof, PLAY_RED);
    boxOn(b, x - t, z - t, x + t, z + t, PLAY.deck - 0.08, PLAY.deck, PLAY_YELLOW);
    b.add(new THREE.ConeGeometry(t * 1.45, 0.6, 4).rotateY(Math.PI / 4).translate(x, SLAB + PLAY.roof + 0.3, z), PLAY_RED);
  }
  // The bridge between the towers, its rails; the slide off the east one
  const [[ax], [bx]] = PLAY.towers;
  const bz = PLAY.towers[0][1];
  boxOn(b, ax + PLAY.tower, bz - 0.4, bx - PLAY.tower, bz + 0.4, PLAY.deck - 0.06, PLAY.deck, PLAY_YELLOW);
  for (const dz of [-0.4, 0.4]) boxOn(b, ax + PLAY.tower, bz + dz - 0.03, bx - PLAY.tower, bz + dz + 0.03, PLAY.deck + 0.55, PLAY.deck + 0.6, PLAY_RED);
  {
    const { x, z0, z1 } = PLAY.slide;
    const L = Math.hypot(z1 - z0, PLAY.deck);
    b.add(new THREE.BoxGeometry(0.6, 0.06, L).rotateX(-Math.atan2(PLAY.deck, z1 - z0)).translate(x, SLAB + PLAY.deck / 2 + 0.04, (z0 + z1) / 2), PLAY_YELLOW);
  }
  // The swings: an A-frame each end, the top bar, three seats on their chains
  {
    const { x0, x1, z, h } = PLAY.swings;
    for (const x of [x0, x1])
      for (const dz of [-0.45, 0.45]) b.add(new THREE.CylinderGeometry(0.03, 0.03, h + 0.1, 5).rotateX(dz > 0 ? 0.26 : -0.26).translate(x, SLAB + h / 2, z + dz / 2), STEEL);
    b.add(new THREE.CylinderGeometry(0.04, 0.04, x1 - x0, 6).rotateZ(Math.PI / 2).translate((x0 + x1) / 2, SLAB + h, z), STEEL);
    b.detail(() => {
      for (let k = 0; k < 3; k++) {
        const x = x0 + ((x1 - x0) * (k + 0.5)) / 3;
        boxOn(b, x - 0.22, z - 0.1, x + 0.22, z + 0.1, 0.42, 0.46, STEEL);
        for (const dx of [-0.2, 0.2]) boxOn(b, x + dx - 0.007, z - 0.007, x + dx + 0.007, z + 0.007, 0.46, h, STEEL);
      }
    });
  }
  // The shade sails over it, on their poles
  for (const [i, pts] of PLAY.sails.entries()) {
    sail(b, pts as Pt[], PLAY.sailH + (i ? 0.25 : 0), i ? SAIL_TEAL : SAIL);
    for (const [x, z] of pts) cyl(b, x, z, 0.06, 0, PLAY.sailH + 0.35, STEEL, 6);
  }
  // The ramada: its slab, posts, a tile roof, the picnic tables under it
  flat(b, RAMADA, 0.016, CONCRETE);
  for (const x of [RAMADA[0] + 0.15, RAMADA[2] - 0.15]) for (const z of [RAMADA[1] + 0.15, RAMADA[3] - 0.15]) boxOn(b, x - 0.12, z - 0.12, x + 0.12, z + 0.12, 0, RAMADA_H, STUCCO);
  tileRoof(b, [RAMADA[0] + 0.15, RAMADA[1] + 0.15, RAMADA[2] - 0.15, RAMADA[3] - 0.15], RAMADA_H, 1);
  for (const [x, z] of PARK_TABLES) picnic(b, x, z);
  // Trees round the field, benches on the walk, the drinking fountain
  for (const t of PARK_TREES) tree(b, t.x, t.z, t.s, low);
  b.detail(() => {
    for (const s of PARK_BENCHES) bench(b, s.x, s.z, s.yaw);
    const [x, z] = DRINK;
    boxOn(b, x - 0.15, z - 0.15, x + 0.15, z + 0.15, 0, 0.8, STEEL);
    boxOn(b, x - 0.25, z - 0.2, x + 0.25, z + 0.2, 0.8, 0.88, STEEL);
  });
}

function drawSchool(b: Batch, low: boolean) {
  // The wings and the hall: a dark base, stucco, a flat roof inside a parapet with a cap
  const block = (r: Rect, h: number) => {
    const [x0, z0, x1, z1] = r;
    boxOn(b, x0, z0, x1, z1, 0, 0.35, SCHOOL_BASE);
    boxOn(b, x0, z0, x1, z1, 0.35, h, SCHOOL_WALL);
    // (the roof slab 6 mm in from the walls, hidden by the parapet)
    boxOn(b, x0 + 0.006, z0 + 0.006, x1 - 0.006, z1 - 0.006, h - 0.1, h - 0.04, ROOF_FLAT);
    const t = 0.14;
    for (const pr of [
      [x0 - 0.02, z0 - 0.02, x1 + 0.02, z0 + t],
      [x0 - 0.02, z1 - t, x1 + 0.02, z1 + 0.02],
      [x0 - 0.02, z0, x0 + t, z1],
      [x1 - t, z0, x1 + 0.02, z1],
    ] as Rect[])
      boxOn(b, pr[0], pr[1], pr[2], pr[3], h, h + 0.3, PARAPET);
  };
  for (const r of SCHOOL.wings) block(r, SCHOOL.h);
  block(SCHOOL.hall.rect, SCHOOL.hall.h);
  // Air conditioners on the flat roofs, near only
  b.detail(() => {
    const units: [number, number, number][] = [
      [205, -37.2, SCHOOL.h],
      [210.5, -37.2, SCHOOL.h],
      [217, -37.2, SCHOOL.h],
      [205, -46, SCHOOL.h],
      [205, -53, SCHOOL.h],
      [217.5, -46, SCHOOL.hall.h],
    ];
    for (const [x, z, h] of units) {
      boxOn(b, x - 0.55, z - 0.4, x + 0.55, z + 0.4, h - 0.04, h + 0.5, AC);
      boxOn(b, x - 0.25, z - 0.25, x + 0.25, z + 0.25, h + 0.5, h + 0.56, STEEL);
    }
  });
  // Classroom windows along the front wing's street face and the side wing's courtyard face, about half lit at night
  const [fx0, , fx1, fz1] = SCHOOL.wings[0];
  for (let x = fx0 + 1.2; x < fx1 - 0.8; x += 1.8) {
    if (Math.abs(x - 212) < 1.4) continue;
    pane(b, 's', x, fz1, 1.46, 0.54, 1.06, STUCCO_TRIM, 0.012);
    pane(b, 's', x, fz1, 1.3, 0.62, 0.9, (x * 7) % 3 < 1.5 ? GLASS_LIT : GLASS, 0.02);
  }
  const [, sz0, sx1, sz1] = SCHOOL.wings[1];
  for (let z = sz0 + 1.2; z < sz1 - 0.6; z += 1.8) {
    pane(b, 'e', sx1, z, 1.46, 0.54, 1.06, STUCCO_TRIM, 0.012);
    pane(b, 'e', sx1, z, 1.3, 0.62, 0.9, (z * 5) % 3 < 1.5 ? GLASS_LIT : GLASS, 0.02);
  }
  // The hall's clerestory band
  {
    const [hx0, , hx1, hz1] = SCHOOL.hall.rect;
    for (let x = hx0 + 1; x < hx1 - 0.6; x += 1.6) pane(b, 's', x, hz1, 1.1, SCHOOL.hall.h - 0.9, 0.5, GLASS_LIT, 0.02);
  }
  // The main door: glass under a blue metal canopy
  pane(b, 's', 212, fz1, 1.8, 0.1, 1.45, GLASS, 0.02);
  boxOn(b, 210.4, fz1, 213.6, fz1 + 1.6, 1.62, 1.72, BLUE_METAL);
  for (const x of [210.6, 213.4]) boxOn(b, x - 0.05, fz1 + 1.45, x + 0.05, fz1 + 1.55, 0, 1.62, STEEL);
  // The covered walks round the courtyard: blue metal roofs on posts
  for (const [x0, z0, x1, z1] of CANOPIES) {
    boxOn(b, x0, z0, x1, z1, CANOPY_H, CANOPY_H + 0.08, BLUE_METAL);
    flat(b, [x0, z0, x1, z1], 0.012, CONCRETE);
    const along = x1 - x0 > z1 - z0;
    const L = along ? x1 - x0 : z1 - z0;
    const n = Math.max(1, Math.round(L / 2.4));
    for (let k = 0; k <= n; k++) {
      const [x, z] = along ? [x0 + 0.1 + ((L - 0.2) * k) / n, z0 + 0.12] : [x1 - 0.12, z0 + 0.1 + ((L - 0.2) * k) / n];
      boxOn(b, x - 0.05, z - 0.05, x + 0.05, z + 0.05, 0, CANOPY_H, STEEL);
    }
  }
  // The field: its grass, the lines, the goals
  flat(b, FIELD, 0.008, FIELD_GRASS);
  {
    const [x0, z0, x1, z1] = FIELD;
    const t = 0.06;
    const m = 0.4;
    for (const lr of [
      [x0 + m, z0 + m, x1 - m, z0 + m + t],
      [x0 + m, z1 - m - t, x1 - m, z1 - m],
      [x0 + m, z0 + m, x0 + m + t, z1 - m],
      [x1 - m - t, z0 + m, x1 - m, z1 - m],
      [(x0 + x1) / 2 - t / 2, z0 + m, (x0 + x1) / 2 + t / 2, z1 - m],
    ] as Rect[])
      flat(b, lr, 0.014, LINE);
    b.add(new THREE.RingGeometry(1.7, 1.76, low ? 20 : 36).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, SLAB + 0.014, (z0 + z1) / 2), LINE);
  }
  for (const g of GOALS) {
    for (const dz of [-GOAL.w / 2, GOAL.w / 2]) cyl(b, g.x, g.z + dz, 0.05, 0, GOAL.h, WHITE, 6);
    b.add(new THREE.CylinderGeometry(0.05, 0.05, GOAL.w, 6).rotateX(Math.PI / 2).translate(g.x, SLAB + GOAL.h, g.z), WHITE);
    b.detail(() => {
      // (its net back from the frame)
      const back = g.x - g.face * GOAL.d;
      const L = Math.hypot(GOAL.d, GOAL.h);
      b.add(new THREE.PlaneGeometry(L, GOAL.w).rotateX(-Math.PI / 2).rotateZ(g.face * Math.atan2(GOAL.h, GOAL.d)).translate((g.x + back) / 2, SLAB + GOAL.h / 2, g.z), WINDSCREEN);
    });
  }
  // The playground: rubber, a tower with its slide, a shade sail
  flat(b, SCHOOL_PLAY, 0.012, RUBBER_BLUE);
  {
    const [x, z] = SCHOOL_PLAY_TOWER;
    const t = 0.7;
    for (const [dx, dz] of [
      [-t, -t],
      [t, -t],
      [-t, t],
      [t, t],
    ])
      boxOn(b, x + dx - 0.06, z + dz - 0.06, x + dx + 0.06, z + dz + 0.06, 0, 2, PLAY_YELLOW);
    boxOn(b, x - t, z - t, x + t, z + t, 1.05, 1.13, PLAY_RED);
    b.add(new THREE.BoxGeometry(0.6, 0.06, 2.4).rotateX(Math.atan2(1.1, 2.1)).translate(x, SLAB + 0.6, z + t + 1.05), PLAY_RED);
    const sp: Pt[] = [
      [x - 2.6, z - 2.2],
      [x + 2.4, z - 1.6],
      [x + 0.4, z + 2.4],
    ];
    sail(b, sp, 2.6, SAIL);
    for (const [px, pz] of sp) cyl(b, px, pz, 0.06, 0, 2.7, STEEL, 6);
  }
  // The bus bay and its drive from the loop
  flat(b, BUS_BAY, 0.01, ASPHALT);
  flat(b, [BUS_BAY[0] + 0.3, BUS_BAY[1] + 0.25, BUS_BAY[2] - 0.3, BUS_BAY[1] + 0.33], 0.018, PLAY_YELLOW);
  flat(b, [227.4, BUS_BAY[3], 229.6, kerbAt(228.5)], 0.012, CONCRETE);
  // The flagpole and its flag (made up: Sector 7's colours), the name on its low wall, the front walk
  {
    const [x, z] = FLAG;
    cyl(b, x, z, 0.045, 0, FLAG_H, WHITE, 6);
    b.add(new THREE.SphereGeometry(0.08, 6, 4).translate(x, SLAB + FLAG_H + 0.05, z), WHITE);
    b.add(new THREE.PlaneGeometry(1.1, 0.35).translate(x + 0.6, SLAB + FLAG_H - 0.3, z), FLAG_A);
    b.add(new THREE.PlaneGeometry(1.1, 0.35).rotateY(Math.PI).translate(x + 0.6, SLAB + FLAG_H - 0.3, z - 0.004), FLAG_A);
    b.add(new THREE.PlaneGeometry(1.1, 0.12).translate(x + 0.6, SLAB + FLAG_H - 0.3, z + 0.006), FLAG_B);
  }
  {
    const [sx0, sz0, sx1, sz1] = SIGN.rect;
    boxOn(b, sx0, sz0, sx1, sz1, 0, SIGN.h, SCHOOL_WALL);
    boxOn(b, sx0 - 0.04, sz0 - 0.04, sx1 + 0.04, sz1 + 0.04, SIGN.h, SIGN.h + 0.06, PARAPET);
    const w = sx1 - sx0 - 0.4;
    b.add(signPlane(w, 1).translate((sx0 + sx1) / 2, SLAB + SIGN.h / 2 + 0.05, sz1 + 0.008), SIGN_TEX);
  }
  flat(b, [211.3, fz1, 212.7, kerbAt(212)], 0.012, CONCRETE);
}

/** A sign plane `w` wide showing its row of the signs' atlas (two rows, eight to one across) */
function signPlane(w: number, row: number) {
  const g = new THREE.PlaneGeometry(w, w / 8);
  const uv = g.getAttribute('uv');
  // (the canvas's top row is the texture's top half)
  for (let i = 0; i < uv.count; i++) uv.setY(i, row === 0 ? 0.5 + uv.getY(i) * 0.5 : uv.getY(i) * 0.5);
  return g;
}

export function registerAmenities(low: boolean, scene: THREE.Scene | null) {
  site('sunridge club', [CLUB_LAND[0] - 2, CLUB_LAND[1] - 2, CLUB_LAND[2] + 2, CLUB_LAND[3] + 4], (into) => {
    const b = new Batch();
    drawClub(b, low);
    b.build(into, { cast: true, receive: true });
  });
  site('sunridge park', [PARK_LAND[0] - 2, PARK_LAND[1] - 2, PARK_LAND[2] + 2, PARK_LAND[3] + 3], (into) => {
    const b = new Batch();
    drawPark(b, low);
    b.build(into, { cast: true, receive: true });
  });
  site('sunridge school', [SCHOOL_LAND[0] - 2, SCHOOL_LAND[1] - 2, SCHOOL_LAND[2] + 2, SCHOOL_LAND[3] + 4], (into) => {
    const b = new Batch();
    drawSchool(b, low);
    b.build(into, { cast: true, receive: true });
  });
  // (on the main thread: the cars, the bus and what's solid)
  if (scene) {
    parkedCars(scene, SLAB, [...CLUB_CARS, SCHOOL_BUS].map(([id, x, z, yaw, c]) => [id as CarId, x, z, yaw, c]));
    addSolids(AMENITY_SOLIDS);
  }
}
