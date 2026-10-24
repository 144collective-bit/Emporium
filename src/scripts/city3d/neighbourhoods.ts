/*
 * The outer districts in 3D (outer.ts holds the layout): the four small
 * squares round their centrepieces (North Square's fountain, West Green's
 * statue with the Emporium diamond, East Square's bandstand, South Square's
 * clock tower), the pocket parks, trees across the lawns, lamps along the
 * Parkway and the Southside Loop, and the waterfront promenade (railings,
 * trees in planters, benches facing the water, viewing decks over it).
 *
 * Merge-ready like infill.ts: everything goes through one Batch (shared
 * paint and neon), trees and lamps are instanced by world.ts. Footprints
 * are SQUARE_SOLIDS (outer.ts, used by solids.ts).
 */
import * as THREE from 'three';
import { Batch, PAL, neon, toon } from './kit';
import { BENDS, BEND_REACH, JETTIES, LAWN_TREES, OUTER_PARKS, PROMENADE, SQUARE_LAYOUTS, offBridges, offFootbridge, type Pt, type SquareLayout } from './outer';
import { EW_ROADS, LANE, NS_ROADS, RIVER } from './layout';
import { SLAB as S, addLamp, addTree, lotMat, waterMat, type Tick } from './world';
import type { Idle } from './landmarks';

const INK = toon('#1b1830');
const STONE = toon('#8f8ab0');
const WOOD = toon('#8a5a3c');
const METAL = toon('#2a2b38');
const HEDGE = toon('#2a8a55');
const glow = (c: string) => neon(c, 0.6, 2.4);
const soft = (c: string) => neon(c, 0.5, 1.3);
const SEAT = S + 0.3;

const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: THREE.Material) => b.box(x0, y0, z0, x1 - x0, y1 - y0, z1 - z0, mat);
const cyl = (b: Batch, r: number, h: number, x: number, y: number, z: number, mat: THREE.Material, seg = 12, r0 = r) =>
  b.add(new THREE.CylinderGeometry(r, r0, h, seg).translate(x, y + h / 2, z), mat);

/** A bench, the sitter facing `ry` (0 is +z), seat top at y + 0.3 */
function bench(b: Batch, at: Pt, ry: number, y = S) {
  const g = (w: number, h: number, d: number, x: number, yy: number, z: number) =>
    new THREE.BoxGeometry(w, h, d)
      .translate(x, yy + h / 2, z)
      .rotateY(ry)
      .translate(at[0], y, at[1]);
  // Too small to see from far away: near only (growth plan Phase 2)
  b.detail(() => {
    b.add(g(0.9, 0.06, 0.3, 0, 0.24, 0), WOOD);
    b.add(g(0.9, 0.3, 0.05, 0, 0.32, -0.15), WOOD);
    for (const sx of [-0.36, 0.36]) b.add(g(0.05, 0.26, 0.28, sx, 0, 0), INK);
  });
}

/* ---------- The squares ---------- */

function centrepiece(b: Batch, scene: THREE.Scene, l: SquareLayout, tick: (f: Tick) => void, reduced: boolean) {
  const [cx, cz] = l.centre;
  const kind = l.square.feature;
  if (kind === 'fountain') {
    cyl(b, 1.4, 0.45, cx, S, cz, STONE, 24);
    cyl(b, 1.46, 0.06, cx, S + 0.45, cz, toon('#a9a4c9'), 24);
    const water = new THREE.Mesh(new THREE.CircleGeometry(1.3, 24).rotateX(-Math.PI / 2), waterMat);
    water.position.set(cx, S + 0.4, cz);
    scene.add(water);
    cyl(b, 0.14, 0.9, cx, S + 0.4, cz, STONE, 10);
    cyl(b, 0.5, 0.1, cx, S + 1.2, cz, STONE, 16, 0.25);
    cyl(b, 0.06, 0.4, cx, S + 1.3, cz, glow(PAL.cyan), 8);
    return;
  }
  if (kind === 'statue') {
    // A stone plinth with the Emporium diamond turning slowly over it in neon
    box(b, cx - 0.7, S, cz - 0.7, cx + 0.7, S + 0.25, cz + 0.7, STONE);
    box(b, cx - 0.5, S + 0.25, cz - 0.5, cx + 0.5, S + 1.2, cz + 0.5, toon('#6f6a9a'));
    box(b, cx - 0.58, S + 1.2, cz - 0.58, cx + 0.58, S + 1.32, cz + 0.58, STONE);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0).scale(1, 1.35, 1), neon(PAL.magenta, 0.9, 2.6));
    gem.position.set(cx, S + 2.1, cz);
    scene.add(gem);
    if (!reduced)
      tick(({ t }) => {
        gem.rotation.y = t * 0.6;
        gem.position.y = S + 2.1 + Math.sin(t * 1.3) * 0.08;
      });
    return;
  }
  if (kind === 'bandstand') {
    // An eight-sided stage with posts, a roof and a neon ring under its eaves
    cyl(b, 2.0, 0.4, cx, S, cz, STONE, 8);
    cyl(b, 2.05, 0.05, cx, S + 0.4, cz, toon('#d6d2ea'), 8);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      cyl(b, 0.06, 2.0, cx + Math.cos(a) * 1.8, S + 0.45, cz + Math.sin(a) * 1.8, toon('#d6d2ea'), 6);
    }
    b.add(new THREE.ConeGeometry(2.5, 1.1, 8).rotateY(Math.PI / 8).translate(cx, S + 3.0, cz), toon('#3a1f45'));
    b.add(new THREE.TorusGeometry(2.1, 0.04, 4, 16).rotateX(Math.PI / 2).translate(cx, S + 2.42, cz), glow(PAL.pink));
    return;
  }
  // A slim clock tower: four faces, a lit ring under its cap
  box(b, cx - 0.6, S, cz - 0.6, cx + 0.6, S + 0.3, cz + 0.6, STONE);
  box(b, cx - 0.45, S + 0.3, cz - 0.45, cx + 0.45, S + 4.6, cz + 0.45, toon('#4f3d8a'));
  box(b, cx - 0.55, S + 4.6, cz - 0.55, cx + 0.55, S + 4.75, cz + 0.55, STONE);
  b.add(new THREE.ConeGeometry(0.62, 0.6, 4).rotateY(Math.PI / 4).translate(cx, S + 5.05, cz), toon('#2a2547'));
  for (const [nx, nz] of [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ]) {
    const fx = cx + nx * 0.46;
    const fz = cz + nz * 0.46;
    const face = new THREE.CylinderGeometry(0.34, 0.34, 0.04, 16)
      .rotateX(Math.PI / 2)
      .rotateY(Math.atan2(nx, nz))
      .translate(fx, S + 3.9, fz);
    b.add(face, toon('#e8e2f0'));
    const ring = new THREE.TorusGeometry(0.36, 0.03, 4, 16).rotateY(Math.atan2(nx, nz)).translate(fx + nx * 0.02, S + 3.9, fz + nz * 0.02);
    b.add(ring, glow(PAL.warm));
    // The hands: ten past ten
    for (const [len, ang] of [
      [0.22, 0.95],
      [0.3, -0.5],
    ]) {
      const hand = new THREE.BoxGeometry(0.04, len, 0.02)
        .translate(0, len / 2, 0)
        .rotateZ(ang)
        .rotateY(Math.atan2(nx, nz))
        .translate(fx + nx * 0.035, S + 3.9, fz + nz * 0.035);
      b.add(hand, INK);
    }
  }
}

function square(b: Batch, scene: THREE.Scene, l: SquareLayout, crowd: Idle[], tick: (f: Tick) => void, low: boolean, reduced: boolean) {
  const [x0, z0, x1, z1] = l.square.rect;
  // Paving with a border, the centrepiece, trees in the corners, benches round it, a kiosk, lamps
  box(b, x0, S, z0, x1, S + 0.012, z1, toon('#4b4766'));
  b.box(x0 + 0.25, S, z0 + 0.25, x1 - x0 - 0.5, 0.016, z1 - z0 - 0.5, lotMat('paving'));
  centrepiece(b, scene, l, tick, reduced);
  for (const [x, z] of l.planters) {
    box(b, x - 0.45, S, z - 0.45, x + 0.45, S + 0.5, z + 0.45, toon('#6e6a8c'));
    box(b, x - 0.38, S + 0.5, z - 0.38, x + 0.38, S + 0.52, z + 0.38, toon('#3b2a22'));
    addTree(x, z, 0.9, false, S + 0.52);
  }
  l.benches.forEach((q, k) => {
    bench(b, q.at, q.ry);
    if (k % 2 === 0 && (!low || k === 0)) crowd.push({ x: q.at[0], z: q.at[1], y: SEAT, ry: q.ry, act: 'sit' });
  });
  if (l.kiosk) {
    const [kx0, kz0, kx1, kz1] = l.kiosk;
    const col = l.square.feature === 'fountain' ? PAL.cyan : PAL.pink;
    box(b, kx0, S, kz0, kx1, S + 1.55, kz1, toon('#2b2550'));
    box(b, kx1, S + 0.7, kz0 + 0.35, kx1 + 0.02, S + 1.25, kz1 - 0.35, soft(PAL.warm));
    box(b, kx1, S + 0.66, kz0 + 0.3, kx1 + 0.28, S + 0.72, kz1 - 0.3, toon('#c9c4e6'));
    box(b, kx0 - 0.18, S + 1.55, kz0 - 0.18, kx1 + 0.18, S + 1.7, kz1 + 0.18, toon(col));
    // A neon trim round the canopy's edge, not a glowing roof
    box(b, kx0 - 0.19, S + 1.6, kz0 - 0.19, kx1 + 0.19, S + 1.66, kz1 + 0.19, glow(col));
    crowd.push({ x: kx1 + 0.85, z: (kz0 + kz1) / 2, ry: -Math.PI / 2, act: 'queue' });
  }
  for (const [x, z] of l.lamps) addLamp(x, z, x < (x0 + x1) / 2 ? 0 : Math.PI);
  // Light bollards at the ways in, uplights round the centrepiece (near only)
  b.detail(() => {
    for (const [x, z] of l.bollards) {
      cyl(b, 0.08, 0.45, x, S, z, METAL, 8, 0.09);
      cyl(b, 0.085, 0.1, x, S + 0.45, z, soft(PAL.warm), 8);
    }
    for (const [x, z] of l.uplights) cyl(b, 0.09, 0.02, x, S + 0.012, z, soft(PAL.warm), 8);
  });
  // A pair chatting by the centrepiece
  if (!low) {
    const [cx, cz] = l.centre;
    const r = l.feature.half + 0.9;
    crowd.push({ x: cx + r * 0.7, z: cz - r * 0.7, ry: -2.3, act: 'chat' }, { x: cx + r * 0.7 + 0.55, z: cz - r * 0.7 - 0.25, ry: 1.1, act: 'chat' });
  }
}

/* ---------- Pocket parks, lawns ---------- */

function parks(b: Batch, crowd: Idle[], low: boolean) {
  for (const p of OUTER_PARKS) {
    const [x0, z0, x1, z1] = p.rect;
    // A low hedge round it, open in the middle of each side
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const gap = 1.2;
    for (const [a0, a1] of [
      [x0, cx - gap],
      [cx + gap, x1],
    ])
      for (const z of [z0, z1 - 0.3]) box(b, a0, S, z, a1, S + 0.4, z + 0.3, HEDGE);
    for (const [a0, a1] of [
      [z0 + 0.3, cz - gap],
      [cz + gap, z1 - 0.3],
    ])
      for (const x of [x0, x1 - 0.3]) box(b, x, S, a0, x + 0.3, S + 0.4, a1, HEDGE);
    p.trees.forEach(([x, z], i) => addTree(x, z, 0.8 + ((i * 37) % 10) / 20, i % 4 === 0));
    p.benches.forEach((q, k) => {
      bench(b, q.at, q.ry);
      if (k === 0 && !low) crowd.push({ x: q.at[0], z: q.at[1], y: SEAT, ry: q.ry, act: 'sit' });
    });
    addLamp(cx, cz, 0);
  }
  // Phones plant every other one
  LAWN_TREES.forEach(([x, z], i) => (!low || i % 2 === 0) && addTree(x, z, 0.85 + ((i * 53) % 10) / 22, i % 3 === 0));
}

/** Lamps along the town side of each bend, every so often, clear of the roads it crosses */
function bendLamps() {
  for (const bend of BENDS)
    for (let i = 3; i < bend.pts.length - 3; i += 6) {
      const [a, c] = [bend.pts[i - 1], bend.pts[i]];
      const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
      let n: Pt = [-(c[1] - a[1]) / l, (c[0] - a[0]) / l];
      if ((bend.centre[0] - c[0]) * n[0] + (bend.centre[1] - c[1]) * n[1] < 0) n = [-n[0], -n[1]];
      const [x, z] = [c[0] + n[0] * (LANE + 0.15), c[1] + n[1] * (LANE + 0.15)];
      if (NS_ROADS.some((r) => Math.abs(x - r.c) < r.half + BEND_REACH + 1) || EW_ROADS.some((r) => Math.abs(z - r.c) < r.half + BEND_REACH + 1)) continue;
      // The arm reaches back over the road
      addLamp(x, z, Math.atan2(n[1], -n[0]));
    }
}

/* ---------- The waterfront promenade ---------- */

function promenade(b: Batch, low: boolean) {
  const rail = toon('#c9c4e6');
  const step = low ? 3 : 1.5;
  for (const bank of ['north', 'south'] as const) {
    // (west of the town Uptown's esplanade carries it on: boulevard.ts)
    const [x0, x1] = PROMENADE.x;
    const edge = bank === 'north' ? RIVER[0] - 0.3 : RIVER[1] + 0.3;
    const inner = bank === 'north' ? PROMENADE.north[0] : PROMENADE.south[1];
    const toWater = bank === 'north' ? 1 : -1;
    // A railing along the water, broken at the bridges and the decks
    let run: number | null = null;
    const deckAt = (x: number) => JETTIES.some((j) => j.bank === bank && Math.abs(x - j.x) < 1.2);
    for (let x = x0; x <= x1 + 0.01; x += step) {
      const open = offBridges(x, 0.3) && !deckAt(x);
      if (open) {
        // (the posts near only: the rails still draw the line from far away)
        b.detail(() => box(b, x - 0.04, 0, edge - 0.04, x + 0.04, 0.55, edge + 0.04, rail));
        if (run === null) run = x;
      }
      // (a run ends at a gap, the end, or after 24: nothing fixed much longer than a tile, tilebatch.ts)
      const long: boolean = run !== null && open && x - run >= 24;
      if ((!open || x + step > x1 || long) && run !== null) {
        const end = open ? x : x - step;
        if (end > run) for (const y of [0.3, 0.55]) box(b, run, y - 0.03, edge - 0.03, end, y + 0.03, edge + 0.03, rail);
        run = long ? x : null;
      }
    }
    // Trees in planters and benches facing the water, between the lamps (which stand every 6 from x0)
    for (let x = x0 + 3; x < x1; x += 12) {
      if (!offBridges(x, 1.2) || !offFootbridge(x, 1.2) || deckAt(x)) continue;
      const z = (inner + edge) / 2 - toWater * 0.15;
      cyl(b, 0.42, 0.4, x, 0, z, toon('#6e6a8c'), 10);
      addTree(x, z, 0.8, false, 0.4);
    }
    for (let x = x0 + 9; x < x1; x += 12) {
      if (!offBridges(x, 1.2) || !offFootbridge(x, 1.2) || deckAt(x)) continue;
      bench(b, [x, edge - toWater * 0.75], toWater > 0 ? 0 : Math.PI, 0.02);
    }
    // Viewing decks out over the water, with a rail round them
    for (const j of JETTIES.filter((q) => q.bank === bank)) {
      const out = edge + toWater * 0.65;
      box(b, j.x - 1.1, 0.06, Math.min(edge, out), j.x + 1.1, 0.14, Math.max(edge, out), WOOD);
      for (const px of [j.x - 1.0, j.x + 1.0]) cyl(b, 0.06, 0.5, px, -0.4, out - toWater * 0.06, METAL, 6);
      box(b, j.x - 1.1, 0.5, out - 0.03, j.x + 1.1, 0.56, out + 0.03, rail);
      for (const px of [j.x - 1.07, j.x + 1.07]) box(b, px - 0.03, 0.5, Math.min(edge, out), px + 0.03, 0.56, Math.max(edge, out), rail);
      for (const px of [j.x - 1.07, j.x, j.x + 1.07]) box(b, px - 0.03, 0.14, out - 0.03, px + 0.03, 0.56, out + 0.03, rail);
    }
  }
}

/** The outer districts: squares, parks, lawns, lamps along the bends, the promenade. `low`: phones (fewer people, sparser rails) */
export function buildNeighbourhoods(scene: THREE.Scene, crowd: Idle[], tick: (f: Tick) => void, opts: { low: boolean; reduced: boolean }) {
  const b = new Batch();
  for (const l of SQUARE_LAYOUTS) square(b, scene, l, crowd, tick, opts.low, opts.reduced);
  parks(b, crowd, opts.low);
  bendLamps();
  promenade(b, opts.low);
  b.build(scene);
}
