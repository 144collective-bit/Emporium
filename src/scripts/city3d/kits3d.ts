/*
 * Drawing the building kits (docs/growth-plan.md Phase 4): what a recipe
 * laid (recipes.ts, kits.ts), into a Batch, in Degen's style and merge-ready
 * like downtown's infill (infill.ts, whose helpers it borrows): walls from
 * the one wall atlas, signs from the one sign atlas, plain colours in the
 * shared paint and neon in the shared neon, so a district of hundreds of
 * buildings is a handful of draws. Walls, roofs, signs and lit trims are
 * drawn at every distance (a building's far form); everything else is near
 * only (`Batch.detail()`), and phones leave out the finest details.
 *
 * The six downtown types are infill.ts's own (`infillBuilding()`); the
 * terrace, house, warehouse, factory, school, mall, stadium stand and crane
 * are drawn here. Nothing here goes into the city's own lists (trees, lamps,
 * crowds): a district is built in sites (tilework.ts), as you go.
 */
import * as THREE from 'three';
import { Batch, PAL, shadeHex, toon } from './kit';
import { SHOP_H, FLOOR, type Infill, type Pt, type Rect } from './downtown';
import { ATLAS, CREAM, INK, LEAF, METAL, ROOF, SIGN_ATLAS, STONE, WALL_COLOR, WOOD, acUnit, frameOf, glow, infillBuilding, kit, planter, roof, shell, soft, type Band, type Kit, type WallKind } from './infill';
import { KIT_TALLEST, RIDGE, bigParts, type BigKit, type Lot } from './kits';
import { rng } from './recipes';
import { SLAB as S } from './world';

const asInfill = (l: Lot) => l as unknown as Infill;

/** Draw one of a district's buildings */
export function drawLot(b: Batch, lot: Lot, low: boolean) {
  if (lot.type === 'brownstone' || lot.type === 'shop' || lot.type === 'diner' || lot.type === 'loft' || lot.type === 'office' || lot.type === 'hotel') {
    infillBuilding(b, asInfill(lot), low);
    return;
  }
  b.detail(() => {
    const r = rng(lot.seed);
    if (lot.type === 'terrace' || lot.type === 'house') home(b, lot, r, low);
    else if (lot.type === 'warehouse') warehouse(b, lot, r, low);
    else big(b, lot, r, low);
  });
}

/* ---------- Shared bits ---------- */

/** Four walls round a box in a building's frame (u along the front, v negative going back), from one atlas band */
function walls(k: Kit, band: Band, u0: number, u1: number, v0: number, v1: number, y0: number, y1: number, off = 0) {
  k.wall(band, [u0, v1], [u1, v1], y0, y1, [0, 1], off);
  k.wall(band, [u0, v0], [u0, v1], y0, y1, [-1, 0], off + 0.25);
  k.wall(band, [u1, v1], [u1, v0], y0, y1, [1, 0], off + 0.5);
  k.wall(band, [u1, v0], [u0, v0], y0, y1, [0, -1], off + 0.75);
}

/** A pitched roof over u0..u1, its eaves at y over v0..v1 (v1 the front), the ridge along u, RIDGE up; gable ends included */
function gable(k: Kit, u0: number, u1: number, v0: number, v1: number, y: number, mat: THREE.Material, over = 0.18) {
  const d = v1 - v0;
  const shape = new THREE.Shape([new THREE.Vector2(-over, -0.06), new THREE.Vector2(d + over, -0.06), new THREE.Vector2(d / 2, RIDGE)]);
  const g = new THREE.ExtrudeGeometry(shape, { depth: u1 - u0 + over * 2, bevelEnabled: false });
  // The shape's x runs back from the front (v), its extrusion along the front (u)
  g.rotateY(Math.PI / 2).translate(u0 - over, y, v1);
  k.put(g, mat);
}

const SLATE = ['#3a3466', '#4b3a5a', '#2a2547', '#6b3a3a'];

/** A small tree (in the district's own batch: the city's tree list was laid out at the boot) */
function tree(k: Kit, u: number, v: number, s = 1) {
  k.put(new THREE.CylinderGeometry(0.06 * s, 0.08 * s, 0.6 * s, 6, 1, true).translate(u, S + 0.3 * s, v), WOOD);
  k.put(new THREE.IcosahedronGeometry(0.42 * s, 1).translate(u, S + 0.85 * s, v), LEAF);
}

/** A run of fence posts and a rail, from a to c (u, v), h tall */
function fence(k: Kit, a: Pt, c: Pt, h: number, mat: THREE.Material, step = 0.5) {
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const n = Math.max(1, Math.round(len / step));
  for (let i = 0; i <= n; i++) {
    const u = a[0] + ((c[0] - a[0]) * i) / n;
    const v = a[1] + ((c[1] - a[1]) * i) / n;
    k.lbox(u - 0.025, u + 0.025, S, S + h, v - 0.025, v + 0.025, mat);
  }
  const [u0, u1] = [Math.min(a[0], c[0]), Math.max(a[0], c[0])];
  const [v0, v1] = [Math.min(a[1], c[1]), Math.max(a[1], c[1])];
  for (const y of [h * 0.45, h * 0.85]) k.lbox(u0 - 0.02, u1 + 0.02, S + y - 0.02, S + y + 0.02, v0 - 0.015, v1 + 0.015, mat);
}

/* ---------- Terraces and houses ---------- */

function home(b: Batch, lot: Lot, r: () => number, low: boolean) {
  const F = frameOf(asInfill(lot));
  const k = kit(b, F);
  const { w, d } = F;
  const top = S + lot.h;
  const terrace = lot.type === 'terrace';
  const kinds: WallKind[] = terrace ? ['brick', 'brownstone', 'stuccoPink', 'stuccoTeal', 'brick'] : ['stuccoTeal', 'stuccoPink', 'stuccoViolet', 'brick'];
  const kind = kinds[Math.floor(r() * kinds.length)];
  const { wall, trim } = WALL_COLOR[kind];
  const trimM = toon(trim);
  const roofM = toon(SLATE[Math.floor(r() * SLATE.length)]);
  const u0 = Math.floor(r() * 8) / 8;
  k.all(() => {
    walls(k, ATLAS.wall[kind], 0, w, -d, 0, S, top, u0);
    gable(k, 0, w, -d, 0, top, roofM, terrace ? 0.02 : 0.2);
  });
  // The door and its step, a lamp by it
  const du = terrace ? (r() < 0.5 ? 0.35 : w - 1.05) : w * 0.5 - 0.35;
  k.lbox(du - 0.08, du + 0.78, S, S + 1.25, 0, 0.06, trimM);
  k.lbox(du, du + 0.7, S, S + 1.15, 0.02, 0.07, toon(shadeHex(wall, -0.45)));
  k.lbox(du - 0.1, du + 0.8, S, S + 0.12, 0.07, 0.4, STONE);
  k.put(new THREE.SphereGeometry(0.05, 6, 4).translate(du + 0.9, S + 1.05, 0.09), glow(PAL.warm));
  // A chimney on the ridge (each terrace's own), a dish now and then
  const cu = terrace ? w - 0.35 : w * 0.25;
  k.lbox(cu - 0.2, cu + 0.2, top + RIDGE * 0.4, top + RIDGE + 0.35, -d / 2 - 0.2, -d / 2 + 0.2, toon(shadeHex(wall, -0.2)));
  k.lbox(cu - 0.24, cu + 0.24, top + RIDGE + 0.35, top + RIDGE + 0.42, -d / 2 - 0.24, -d / 2 + 0.24, INK);
  if (!low && r() < 0.3) k.put(new THREE.CylinderGeometry(0.22, 0.16, 0.05, 10).rotateX(1.1).translate(w * 0.6, top + 0.5, -0.4), CREAM);
  // The front garden: a low wall (terraces) or a picket fence (houses) with a gap at the path, a hedge or a planter
  const f = lot.front;
  const edge = f - 0.06;
  const pick = (mat: THREE.Material, h: number) => {
    if (du - 0.1 > 0.1) fence(k, [0.05, edge], [du - 0.1, edge], h, mat);
    if (du + 0.8 < w - 0.1) fence(k, [du + 0.8, edge], [w - 0.05, edge], h, mat);
  };
  if (terrace) {
    if (du - 0.1 > 0.1) k.lbox(0.02, du - 0.1, S, S + 0.32, edge - 0.08, edge + 0.04, toon(shadeHex(wall, -0.1)));
    if (du + 0.8 < w - 0.1) k.lbox(du + 0.8, w - 0.02, S, S + 0.32, edge - 0.08, edge + 0.04, toon(shadeHex(wall, -0.1)));
    planter(k, du > w / 2 ? 0.45 : w - 0.45, f * 0.45);
  } else {
    if (!low) pick(toon('#f3f2f7'), 0.42);
    // A porch over the door, on two posts
    k.lbox(du - 0.25, du + 0.95, S + 1.35, S + 1.45, 0, 0.75, roofM);
    for (const u of [du - 0.18, du + 0.88]) k.lbox(u - 0.04, u + 0.04, S, S + 1.35, 0.66, 0.74, CREAM);
    // A tree in the front yard, on the side away from the door
    tree(k, du > w / 2 ? 0.7 : w - 0.7, f * 0.5, 0.85);
    k.lbox(du + 0.95, du + 1.05, S, S + 0.7, edge - 0.1, edge, METAL);
    k.lbox(du + 0.88, du + 1.12, S + 0.7, S + 0.88, edge - 0.14, edge + 0.02, toon('#e23b3b'));
  }
}

/* ---------- Warehouses ---------- */

function warehouse(b: Batch, lot: Lot, r: () => number, low: boolean) {
  const F = frameOf(asInfill(lot));
  const k = kit(b, F);
  const { w, d } = F;
  const top = S + lot.h;
  const u0 = Math.floor(r() * 8) / 8;
  shell(k, F, top, ATLAS.wall.industrial, ATLAS.ground.loading, S + SHOP_H, u0);
  roof(k, F, top, toon('#3a2a30'), 0.18);
  // A loading dock along the front with bumpers, a steel canopy over it
  k.lbox(0.1, w - 0.1, S, S + 0.32, 0, 0.6, STONE);
  for (let u = 0.6; u < w - 0.4; u += 1.6) k.lbox(u - 0.08, u + 0.08, S + 0.05, S + 0.3, 0.6, 0.66, INK);
  k.lbox(-0.05, w + 0.05, S + SHOP_H + 0.05, S + SHOP_H + 0.12, 0, 0.75, METAL);
  // Yellow bollards at the corners, pallets stacked by the door
  const yellow = toon('#ffd23f');
  for (const u of [0.15, w - 0.15]) k.put(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 8).translate(u, S + 0.3, 0.8), yellow);
  if (!low)
    for (let i = 0; i < 3; i++) {
      const u = w - 0.8;
      k.lbox(u - 0.4, u + 0.4, S + i * 0.14, S + i * 0.14 + 0.12, 0.65 + 0.02 * i, 0.85 + 0.02 * i, WOOD);
    }
  // Skylights and vents along the roof, a light at the dock
  for (let u = 0.8; u < w - 0.6; u += 1.8) k.lbox(u - 0.4, u + 0.4, top, top + 0.16, -d * 0.6, -d * 0.35, toon('#6f8fc4'));
  if (r() < 0.5) acUnit(k, w * 0.75, -d * 0.75, top);
  k.put(new THREE.SphereGeometry(0.06, 6, 4).translate(w * 0.5, S + SHOP_H - 0.12, 0.14), glow(PAL.warm));
}

/* ---------- One to a block ---------- */

function big(b: Batch, lot: Lot, r: () => number, low: boolean) {
  // The whole lot's frame (no front strip): v back from the street is -v here
  const F = frameOf({ ...asInfill(lot), front: 0 });
  const k = kit(b, F);
  const { w, d } = F;
  const parts = bigParts(lot.type as BigKit, w, d);
  const [bu0, bv0, bu1, bv1] = parts.body;
  /** A box at (u0..u1, back v0..v1), y0 to y1 */
  const bx = (u0: number, v0: number, u1: number, v1: number, y0: number, y1: number, mat: THREE.Material) => k.lbox(u0, u1, y0, y1, -v1, -v0, mat);
  const top = S + lot.h;

  if (lot.type === 'factory') {
    k.all(() => {
      walls(k, ATLAS.wall.industrial, bu0, bu1, -bv1, -bv0, S, top);
      // The sawtooth roof over the sheds, its glazing to the front
      bx(bu0 - 0.01, bv0 - 0.01, bu1 + 0.01, bv1 + 0.01, top - 0.04, top, ROOF);
      const n = Math.max(3, Math.round((bu1 - bu0) / 2));
      const du = (bu1 - bu0) / n;
      for (let i = 0; i < n; i++) {
        const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(du, 0), new THREE.Vector2(du, 1)]);
        k.put(new THREE.ExtrudeGeometry(sh, { depth: bv1 - bv0 - 0.2, bevelEnabled: false }).translate(bu0 + i * du, top, -bv1 + 0.1), toon('#3a3466'));
      }
      // The chimney, red and white bands
      const [cu0, cv0, cu1, cv1, ch] = parts.extra[0];
      const cu = (cu0 + cu1) / 2;
      const cv = -(cv0 + cv1) / 2;
      const rad = (cu1 - cu0) / 2;
      const bands = 4;
      for (let i = 0; i < bands; i++) {
        const y0 = S + (ch * i) / bands;
        const y1 = S + (ch * (i + 1)) / bands;
        k.put(new THREE.CylinderGeometry(rad * (1 - (0.25 * (i + 1)) / bands), rad * (1 - (0.25 * i) / bands), y1 - y0, 12, 1, true).translate(cu, (y0 + y1) / 2, cv), toon(i % 2 ? '#f3f2f7' : '#e23b3b'));
      }
      k.put(new THREE.SphereGeometry(0.1, 6, 4).translate(cu, S + ch + 0.05, cv), glow('#ff3b3b'));
    });
    for (let i = 0; i < Math.max(3, Math.round((bu1 - bu0) / 2)); i++) {
      const du = (bu1 - bu0) / Math.max(3, Math.round((bu1 - bu0) / 2));
      k.lbox(bu0 + (i + 1) * du - 0.03, bu0 + (i + 1) * du + 0.005, top + 0.1, top + 0.9, -bv1 + 0.3, -bv0 - 0.3, toon('#6f8fc4'));
    }
    // Roller doors along the front, tanks and a pipe rack in the yard to the side
    for (let u = bu0 + 1.2; u < bu1 - 1.5; u += 3.6) k.wall(ATLAS.ground.loading, [u, -bv0 + 0.01], [u + 2.4, -bv0 + 0.01], S, S + SHOP_H, [0, 1], 0.1);
    const yu = bu1 + (w - bu1) / 2;
    for (const [dv, h] of [
      [bv0 + 2, 2.6],
      [bv0 + 4.5, 2.2],
    ] as [number, number][])
      if (w - bu1 > 2.4) {
        k.put(new THREE.CylinderGeometry(0.9, 0.9, h, 14).translate(yu, S + h / 2, -dv), toon('#c9c4e6'));
        k.put(new THREE.SphereGeometry(0.9, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(yu, S + h, -dv), toon('#c9c4e6'));
      }
    if (!low) for (const y of [1.6, 2.0]) bx(bu1, bv0 + 1, Math.min(w - 0.3, bu1 + 1.8), bv0 + 1.12, S + y, S + y + 0.12, toon('#8a5a3c'));
    // A fence and a gate along the street
    fence(k, [0.2, -0.3], [w * 0.4, -0.3], 1.1, METAL, 0.8);
    fence(k, [w * 0.4 + 3, -0.3], [w - 0.2, -0.3], 1.1, METAL, 0.8);
    return;
  }

  if (lot.type === 'school') {
    const kind: WallKind = r() < 0.5 ? 'stuccoTeal' : 'brick';
    const { trim } = WALL_COLOR[kind];
    k.all(() => {
      walls(k, ATLAS.wall[kind], bu0, bu1, -bv1, -bv0, S, top);
      bx(bu0 + 0.006, bv0 + 0.006, bu1 - 0.006, bv1 - 0.006, top - 0.04, top, ROOF);
      // The name over the doors
      const sw = Math.min(5, bu1 - bu0 - 2);
      const uc = (bu0 + bu1) / 2;
      bx(uc - sw / 2 - 0.08, bv0 - 0.14, uc + sw / 2 + 0.08, bv0 - 0.06, S + SHOP_H + 0.85, S + SHOP_H + 0.85 + sw / 4.2 + 0.16, INK);
      k.sign(SIGN_ATLAS.board('school'), uc, S + SHOP_H + 0.93 + sw / 8.4, -bv0 + 0.145, sw, sw / 4.2);
    });
    const trimM = toon(trim);
    // A parapet, the entrance canopy, a flagpole, steps
    for (const [a0, a1, c0, c1] of [
      [bu0, bu1, bv0, bv0 + 0.12],
      [bu0, bu1, bv1 - 0.12, bv1],
      [bu0, bu0 + 0.12, bv0, bv1],
      [bu1 - 0.12, bu1, bv0, bv1],
    ])
      bx(a0, c0, a1, c1, top, top + 0.25, trimM);
    const uc = (bu0 + bu1) / 2;
    bx(uc - 1.6, bv0 - 1.2, uc + 1.6, bv0, S + SHOP_H, S + SHOP_H + 0.1, METAL);
    bx(uc - 1.6, bv0 - 1.2, uc + 1.6, bv0 - 1.15, S + SHOP_H - 0.04, S + SHOP_H, soft(PAL.warm));
    for (const u of [uc - 1.5, uc + 1.5]) bx(u - 0.05, bv0 - 1.15, u + 0.05, bv0 - 1.05, S, S + SHOP_H, METAL);
    bx(uc - 1.4, bv0 - 0.8, uc + 1.4, bv0, S, S + 0.14, STONE);
    k.wall(ATLAS.ground.lobby, [uc - 1.2, -bv0 + 0.012], [uc + 1.2, -bv0 + 0.012], S, S + SHOP_H, [0, 1], 0);
    const fu = bu0 + 1;
    k.put(new THREE.CylinderGeometry(0.035, 0.045, 5, 6).translate(fu, S + 2.5, -bv0 + 1.4), METAL);
    k.lbox(fu + 0.04, fu + 0.9, S + 4.3, S + 4.85, -bv0 + 1.38, -bv0 + 1.42, toon('#00c2ff'));
    acUnit(k, bu0 + 2, -bv1 + 1.2, top);
    acUnit(k, bu1 - 2.5, -bv1 + 1.4, top);
    // The yard behind: a court with its lines and hoops, benches round it
    const cv0 = bv1 + 1.2;
    const cv1 = Math.min(d - 0.8, cv0 + 8);
    if (cv1 - cv0 > 5) {
      const cu0 = Math.max(1, (w - 14) / 2);
      const cu1 = Math.min(w - 1, cu0 + 14);
      bx(cu0, cv0, cu1, cv1, S, S + 0.012, toon('#2f6b8a'));
      const line = toon('#f3f2f7');
      for (const [a0, c0, a1, c1] of [
        [cu0 + 0.3, cv0 + 0.3, cu1 - 0.3, cv0 + 0.36],
        [cu0 + 0.3, cv1 - 0.36, cu1 - 0.3, cv1 - 0.3],
        [cu0 + 0.3, cv0 + 0.3, cu0 + 0.36, cv1 - 0.3],
        [cu1 - 0.36, cv0 + 0.3, cu1 - 0.3, cv1 - 0.3],
        [(cu0 + cu1) / 2 - 0.03, cv0 + 0.3, (cu0 + cu1) / 2 + 0.03, cv1 - 0.3],
      ])
        bx(a0, c0, a1, c1, S + 0.012, S + 0.02, line);
      for (const u of [cu0 + 0.6, cu1 - 0.6]) {
        const vm = (cv0 + cv1) / 2;
        bx(u - 0.04, vm - 0.04, u + 0.04, vm + 0.04, S, S + 2.2, METAL);
        bx(u - 0.3, vm - 0.25, u + 0.3, vm + 0.25, S + 2.1, S + 2.5, CREAM);
      }
    }
    return;
  }

  if (lot.type === 'mall') {
    k.all(() => {
      // Shops along the ground floor at the front, glass above, plain walls round the back
      k.wall(ATLAS.ground.shopCyan, [bu0, -bv0], [bu1, -bv0], S, S + SHOP_H, [0, 1], 0);
      k.wall(ATLAS.wall.glassTeal, [bu0, -bv0], [bu1, -bv0], S + SHOP_H, top, [0, 1], 0);
      k.wall(ATLAS.wall.stuccoViolet, [bu0, -bv1], [bu0, -bv0], S, top, [-1, 0], 0);
      k.wall(ATLAS.wall.stuccoViolet, [bu1, -bv0], [bu1, -bv1], S, top, [1, 0], 0);
      k.wall(ATLAS.wall.stuccoViolet, [bu1, -bv1], [bu0, -bv1], S, top, [0, -1], 0);
      bx(bu0 + 0.006, bv0 + 0.006, bu1 - 0.006, bv1 - 0.006, top - 0.04, top, ROOF);
      // A neon line along the top of the front, the name over the doors
      bx(bu0 - 0.02, bv0 - 0.06, bu1 + 0.02, bv0 - 0.01, top - 0.2, top - 0.14, glow(PAL.magenta));
      const sw = Math.min(6, bu1 - bu0 - 2);
      const uc = (bu0 + bu1) / 2;
      bx(uc - sw / 2 - 0.1, bv0 - 0.16, uc + sw / 2 + 0.1, bv0 - 0.08, top + 0.05, top + 0.25 + sw / 4.2, INK);
      k.sign(SIGN_ATLAS.board('mall'), uc, top + 0.15 + sw / 8.4, -bv0 + 0.165, sw, sw / 4.2);
    });
    const uc = (bu0 + bu1) / 2;
    // A glass canopy over the doors on four posts, a parapet, rooftop units
    bx(uc - 2.2, bv0 - 1.6, uc + 2.2, bv0, S + SHOP_H + 0.05, S + SHOP_H + 0.12, toon('#6f8fc4'));
    for (const u of [uc - 2.1, uc + 2.1]) bx(u - 0.05, bv0 - 1.55, u + 0.05, bv0 - 1.45, S, S + SHOP_H + 0.05, METAL);
    bx(bu0, bv0, bu1, bv0 + 0.12, top, top + 0.3, toon('#3a2a55'));
    for (let u = bu0 + 2; u < bu1 - 1.5; u += 4) acUnit(k, u, -(bv0 + bv1) / 2, top);
    // The car park out front: asphalt, bays, lamp posts, a trolley shelter
    const pv1 = bv0 - 0.4;
    bx(0.4, 0.5, w - 0.4, pv1, S, S + 0.012, toon('#2a2840'));
    const line = toon('#e6e3f2');
    for (const row of [1.4, pv1 - 1.6])
      for (let u = 0.9; u < w - 0.8; u += 1.15) bx(u - 0.03, row - 1, u + 0.03, row + 1, S + 0.012, S + 0.018, line);
    if (!low)
      for (const u of [w * 0.25, w * 0.75]) {
        bx(u - 0.05, pv1 / 2 - 0.05, u + 0.05, pv1 / 2 + 0.05, S, S + 2.4, METAL);
        bx(u - 0.3, pv1 / 2 - 0.08, u + 0.3, pv1 / 2 + 0.08, S + 2.4, S + 2.48, INK);
        bx(u - 0.25, pv1 / 2 - 0.06, u + 0.25, pv1 / 2 + 0.06, S + 2.36, S + 2.4, glow(PAL.warm));
      }
    return;
  }

  if (lot.type === 'stand') {
    // The pitch: grass, white lines, a centre circle, goals at the ends
    const pv1 = bv0 - 0.6;
    const pu0 = 1;
    const pu1 = w - 1;
    k.all(() => {
      bx(pu0, 0.6, pu1, pv1, S, S + 0.01, toon('#2fae6e'));
    });
    const line = toon('#f3f2f7');
    for (const [a0, c0, a1, c1] of [
      [pu0 + 0.3, 0.9, pu1 - 0.3, 0.96],
      [pu0 + 0.3, pv1 - 0.36, pu1 - 0.3, pv1 - 0.3],
      [pu0 + 0.3, 0.9, pu0 + 0.36, pv1 - 0.3],
      [pu1 - 0.36, 0.9, pu1 - 0.3, pv1 - 0.3],
      [(pu0 + pu1) / 2 - 0.03, 0.9, (pu0 + pu1) / 2 + 0.03, pv1 - 0.3],
    ])
      bx(a0, c0, a1, c1, S + 0.01, S + 0.016, line);
    const pc = -(0.6 + pv1) / 2;
    k.put(new THREE.RingGeometry(1.6, 1.68, 32).rotateX(-Math.PI / 2).translate((pu0 + pu1) / 2, S + 0.021, pc), line);
    for (const u of [pu0 + 0.33, pu1 - 0.33]) {
      for (const dv of [-0.9, 0.9]) bx(u - 0.04, -pc + dv - 0.04, u + 0.04, -pc + dv + 0.04, S, S + 0.8, line);
      bx(u - 0.04, -pc - 0.9, u + 0.04, -pc + 0.9, S + 0.76, S + 0.82, line);
    }
    // The stand: tiers stepping up to the back, seats in the club's colours, a back wall and a roof on columns
    const steps = 6;
    const sd = (bv1 - bv0) / steps;
    const seats = [toon('#e219e5'), toon('#00c2ff')];
    k.all(() => {
      for (let i = 0; i < steps; i++) bx(bu0, bv0 + i * sd, bu1, bv1, S, S + 0.4 + i * 0.5, toon('#8f8ab0'));
      bx(bu0, bv1 - 0.2, bu1, bv1, S, S + 4.2, toon('#4b4766'));
      // The roof over the top tiers, its name to the pitch
      bx(bu0 - 0.2, bv0 + sd * 2, bu1 + 0.2, bv1 + 0.1, S + 5, S + 5.15, ROOF);
      const sw = Math.min(6, bu1 - bu0 - 4);
      const uc = (bu0 + bu1) / 2;
      bx(uc - sw / 2 - 0.1, bv0 + sd * 2 - 0.1, uc + sw / 2 + 0.1, bv0 + sd * 2, S + 5.15, S + 5.35 + sw / 4.2, INK);
      k.sign(SIGN_ATLAS.board('stadium'), uc, S + 5.25 + sw / 8.4, -(bv0 + sd * 2) + 0.105, sw, sw / 4.2);
    });
    // The seats: runs of the club's two colours along each tier
    if (!low)
      for (let i = 0; i < steps - 1; i++)
        for (let u = bu0 + 0.3, n = 0; u < bu1 - 0.3; u += 3, n++) bx(u, bv0 + i * sd + 0.12, Math.min(u + 2.9, bu1 - 0.3), bv0 + i * sd + 0.4, S + 0.4 + i * 0.5, S + 0.55 + i * 0.5, seats[(i + n) % 2]);
    for (let u = bu0 + 1; u < bu1; u += 4) bx(u - 0.08, bv0 + sd * 2, u + 0.08, bv0 + sd * 2 + 0.16, S + 0.4 + 2 * 0.5, S + 5, METAL);
    // Floodlight masts at the ends, their lamps lit at night
    for (const [u0, v0, u1, v1, h] of parts.extra) {
      const u = (u0 + u1) / 2;
      const v = (v0 + v1) / 2;
      k.all(() => {
        bx(u - 0.08, v - 0.08, u + 0.08, v + 0.08, S, S + h, METAL);
        bx(u - 0.6, v - 0.25, u + 0.6, v - 0.05, S + h - 0.1, S + h + 0.5, INK);
        bx(u - 0.5, v - 0.28, u + 0.5, v - 0.25, S + h, S + h + 0.4, soft('#fff6c8'));
      });
    }
    return;
  }

  // The crane: a frame going up, a hoarding round the site, the tower crane over it
  const floors = lot.floors;
  const concrete = toon('#9a95b8');
  k.all(() => {
    // The floors poured so far, the top one half done
    for (let i = 0; i <= floors; i++) {
      const y = S + (i === 0 ? 0 : SHOP_H + (i - 1) * FLOOR);
      const u1 = i === floors ? bu0 + (bu1 - bu0) * 0.55 : bu1;
      bx(bu0, bv0, u1, bv1, y, y + 0.14, concrete);
    }
    for (let u = bu0; u <= bu1 + 1e-6; u += (bu1 - bu0) / 4)
      for (const v of [bv0, bv1]) bx(u - 0.12, v - (v === bv0 ? 0 : 0.24), u + 0.12, v + (v === bv0 ? 0.24 : 0), S, S + SHOP_H + (floors - 1) * FLOOR, concrete);
  });
  // Scaffolding up the front, a hoarding round the site
  if (!low)
    for (let u = bu0; u < bu1; u += 1.2)
      for (let i = 1; i < floors; i++) {
        const y = S + SHOP_H + (i - 1) * FLOOR;
        bx(u, bv0 - 0.55, u + 1.15, bv0 - 0.15, y - 0.03, y + 0.02, WOOD);
        bx(u - 0.02, bv0 - 0.57, u + 0.02, bv0 - 0.53, S, y + 0.9, METAL);
      }
  const hoard = toon('#2a2547');
  fence(k, [0.3, -0.4], [w - 0.3, -0.4], 1.6, hoard, 2.5);
  bx(0.3, 0.38, w - 0.3, 0.42, S, S + 1.6, hoard);
  bx(0.3, 0.42, w - 0.3, 0.44, S + 1.35, S + 1.45, toon('#ffd23f'));
  // The tower crane: a lattice mast, the slewing deck and cab, the jib out over the frame, a counter-jib with its weights
  const [mu0, mv0, mu1, mv1] = parts.extra[0];
  const mu = (mu0 + mu1) / 2;
  const mv = (mv0 + mv1) / 2;
  const yellow = toon('#ffc21f');
  const mh = KIT_TALLEST - 1.2;
  const m = 0.32;
  k.all(() => {
    bx(mu0, mv0, mu1, mv1, S, S + 0.5, concrete);
    for (const [du, dv] of [
      [-m, -m],
      [m, -m],
      [m, m],
      [-m, m],
    ])
      bx(mu + du - 0.05, mv + dv - 0.05, mu + du + 0.05, mv + dv + 0.05, S + 0.5, S + mh, yellow);
    bx(mu - 0.5, mv - 0.5, mu + 0.5, mv + 0.5, S + mh, S + mh + 0.3, yellow);
    // The jib reaches back over the frame (the way the crane faces: along -u), the counter-jib the other way
    const jl = Math.min(mu - 0.5, 13);
    bx(mu - jl, mv - 0.2, mu, mv + 0.2, S + mh + 0.3, S + mh + 0.6, yellow);
    bx(mu, mv - 0.25, mu + 3.2, mv + 0.25, S + mh + 0.3, S + mh + 0.55, yellow);
    bx(mu + 2.2, mv - 0.35, mu + 3.2, mv + 0.35, S + mh - 0.3, S + mh + 0.3, concrete);
    bx(mu - 0.1, mv - 0.1, mu + 0.1, mv + 0.1, S + mh + 0.6, S + mh + 1.2, yellow);
    bx(mu - 0.03, mv - 0.03, mu + 0.03, mv + 0.03, S + mh + 1.2, S + KIT_TALLEST, METAL);
  });
  k.put(new THREE.SphereGeometry(0.09, 6, 4).translate(mu, S + KIT_TALLEST, -mv), glow('#ff3b3b'));
  bx(mu + 0.5, mv - 0.45, mu + 1.1, mv - 0.05, S + mh - 0.3, S + mh + 0.25, toon('#3e5a8f'));
  // The lattice's bracing, the hook on its cable over the frame
  if (!low)
    for (let y = S + 0.8; y < S + mh - 0.4; y += 0.8) {
      k.beam(new THREE.Vector3(mu - m, y, -(mv - m)), new THREE.Vector3(mu + m, y + 0.8, -(mv - m)), 0.03, yellow);
      k.beam(new THREE.Vector3(mu + m, y, -(mv + m)), new THREE.Vector3(mu - m, y + 0.8, -(mv + m)), 0.03, yellow);
    }
  const hu = mu - Math.min(mu - 0.5, 13) * 0.6;
  bx(hu - 0.012, mv - 0.012, hu + 0.012, mv + 0.012, S + mh * 0.55, S + mh + 0.3, INK);
  bx(hu - 0.12, mv - 0.08, hu + 0.12, mv + 0.08, S + mh * 0.55 - 0.25, S + mh * 0.55, yellow);
  // A site hut and a skip
  bx(w - 3.2, d - 2.2, w - 0.6, d - 0.8, S, S + 1.2, toon('#3e8a6b'));
  bx(w - 3.2, d - 2.2, w - 0.6, d - 0.8, S + 1.2, S + 1.28, ROOF);
  bx(0.8, d - 2, 2.6, d - 0.9, S, S + 0.6, toon('#ff8a3d'));
}

/* ---------- The ground: blocks, streets, alleys ---------- */

const GROUND: Record<'paving' | 'grass' | 'concrete', string> = { paving: '#5d5888', grass: '#2f8f5c', concrete: '#6e6a8c' };

/** A block's raised slab (its sidewalk) and the ground inside, and the bollards and floor of its alleys */
export function drawBlock(b: Batch, slab: Rect, inner: Pt[], ground: keyof typeof GROUND, alleys: { box: Rect; bollards: Pt[] }[], low: boolean) {
  const [x0, z0, x1, z1] = slab;
  b.box(x0, 0, z0, x1 - x0, S, z1 - z0, toon('#5a5290'));
  const xs = inner.map((p) => p[0]);
  const zs = inner.map((p) => p[1]);
  b.box(Math.min(...xs), S, Math.min(...zs), Math.max(...xs) - Math.min(...xs), 0.005, Math.max(...zs) - Math.min(...zs), toon(GROUND[ground]));
  b.detail(() => {
    for (const a of alleys) {
      const [a0, c0, a1, c1] = a.box;
      b.box(a0, S + 0.004, c0, a1 - a0, 0.008, c1 - c0, toon('#3f3a5c'));
      for (const [x, z] of a.bollards) {
        b.add(new THREE.CylinderGeometry(0.08, 0.09, 0.6, 8).translate(x, S + 0.3, z), INK);
        b.add(new THREE.CylinderGeometry(0.085, 0.085, 0.06, 8).translate(x, S + 0.49, z), glow(PAL.warm));
      }
    }
    // Lamp posts round the sidewalk, their bulbs lit at night
    if (low) return;
    const lamp = (x: number, z: number) => {
      b.add(new THREE.CylinderGeometry(0.035, 0.05, 1.6, 6).translate(x, S + 0.8, z), INK);
      b.add(new THREE.BoxGeometry(0.2, 0.07, 0.2).translate(x, S + 1.62, z), glow('#fff1c2'));
    };
    for (let x = x0 + 2; x < x1 - 1; x += 8) {
      lamp(x, z0 + 0.25);
      lamp(x, z1 - 0.25);
    }
    for (let z = z0 + 6; z < z1 - 5; z += 8) {
      lamp(x0 + 0.25, z);
      lamp(x1 - 0.25, z);
    }
  });
}

/** A street: asphalt, a dashed line down the middle */
export function drawStreet(b: Batch, [x0, z0, x1, z1]: Rect) {
  b.box(x0, 0, z0, x1 - x0, 0.03, z1 - z0, toon('#26243f'));
  const along = x1 - x0 > z1 - z0;
  const dash = toon('#e6e3f2');
  b.detail(() => {
    if (along) for (let x = x0 + 1; x < x1 - 1; x += 2.4) b.box(x, 0.031, (z0 + z1) / 2 - 0.05, 1.2, 0.004, 0.1, dash);
    else for (let z = z0 + 1; z < z1 - 1; z += 2.4) b.box((x0 + x1) / 2 - 0.05, 0.031, z, 0.1, 0.004, 1.2, dash);
  });
}

