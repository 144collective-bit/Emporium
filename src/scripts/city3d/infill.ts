/*
 * Downtown round the landmarks (downtown.ts): tight rows of infill buildings
 * with shopfronts, walk-only alleys with bollards at their mouths, the
 * courtyard lanes, three pocket parks and the hangout square (stage, big
 * screen, fountain, kiosks, benches, string lights and a crowd), lamps along
 * the cross streets, and the GM water tower up on a rooftop.
 *
 * Written merge-ready: walls share six facade materials and three shopfront
 * materials (their UVs in world units, so windows keep their size on any
 * wall), every plain colour folds into the shared paint material, neon into
 * the shared neon, and all the string lights are one set of points.
 * Footprints are DOWNTOWN_SOLIDS in solids.ts.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, PAL, canvasTex, facade, fx, glowTex, lit, neon, rng, shadeHex, toon } from './kit';
import { ALLEYS, DIAGONALS, FLOOR, INFILL, LANES, PARKS, SHOP_H, SQUARE, WATER_TOWER, type Infill, type Pt } from './downtown';
import { CORE_ROADS, DOWNTOWN, LANE } from './layout';
import { SLAB as S, addLamp, addTree, waterMat, type Tick } from './world';
import type { Idle } from './landmarks';

/* ---------- Materials ---------- */

/**
 * Every infill wall and shopfront is drawn from one atlas, so they all share
 * one material: six wall facades (window grids, WALL_COLS x WALL_ROWS cells,
 * a cell CELL_W wide and a floor tall) stacked over three shopfronts (two bays
 * each, SHOP_W wide). Each band repeats across (u, in world units) and is
 * never taller than a building, so it never wraps up into the next band.
 */
const CELL_W = 0.75;
const WALL_COLS = 8;
const WALL_ROWS = 7;
const TEX_W = CELL_W * WALL_COLS;
const TEX_H = FLOOR * WALL_ROWS;
const SHOP_W = 3.2;
/** Wall colours and the colours their lit windows glow */
const WALL_KINDS: [string, string[]][] = [
  ['#3d2f6e', [PAL.warm, PAL.cyan]],
  ['#5a2c5e', [PAL.warm, PAL.pink]],
  ['#26456b', [PAL.cyan, PAL.warm]],
  ['#6b3a3f', [PAL.warm]],
  ['#2f5550', [PAL.warm, PAL.cyan]],
  ['#4a3a82', [PAL.pink, PAL.cyan]],
];
/** Shopfront frames and the glow of their glass */
const SHOP_KINDS: [string, string][] = [
  ['#2b2550', PAL.warm],
  ['#3a1f45', PAL.pink],
  ['#1c3448', PAL.cyan],
];
/** A band of the atlas: where it starts (v, from the bottom) and how tall it is, and how tall that is in the world */
interface Band {
  v0: number;
  vh: number;
  th: number;
  tw: number;
}
const ATLAS = (() => {
  const W = WALL_COLS * 48;
  const WH = WALL_ROWS * 64;
  const SH = Math.round((W * SHOP_H) / SHOP_W);
  const H = WALL_KINDS.length * WH + SHOP_KINDS.length * SH;
  const walls = WALL_KINDS.map(([wall, glow], i) => facade({ cols: WALL_COLS, rows: WALL_ROWS, wall, lit: glow, litRatio: 0.38, seed: 60 + i, bands: shadeHex(wall, -0.3) }));
  // A shopfront: a window, then a door and a window, under a header (drawn in 256 x 100 and scaled to the band)
  const glass = [
    [10, 16, 108, 62],
    [190, 16, 56, 62],
  ];
  const door = [140, 22, 40, 78];
  const shop = (c: CanvasRenderingContext2D, y: number, [frame, glow]: [string, string], lit: boolean) => {
    c.save();
    c.translate(0, y);
    c.scale(W / 256, SH / 100);
    c.fillStyle = lit ? '#000' : frame;
    c.fillRect(0, 0, 256, 100);
    if (!lit) {
      c.fillStyle = shadeHex(frame, -0.35);
      c.fillRect(0, 0, 256, 10);
      c.fillRect(0, 84, 256, 16);
    }
    for (const [x, gy, w, h] of [...glass, door]) {
      if (lit) {
        c.fillStyle = glow;
        c.fillRect(x, gy, w, h);
        continue;
      }
      c.fillStyle = PAL.ink;
      c.fillRect(x - 3, gy - 3, w + 6, h + 6);
      const g = c.createLinearGradient(x, gy, x, gy + h);
      g.addColorStop(0, shadeHex(glow, -0.25));
      g.addColorStop(1, shadeHex(glow, -0.65));
      c.fillStyle = g;
      c.fillRect(x, gy, w, h);
    }
    // The door's frame and handle
    c.fillStyle = lit ? '#000' : PAL.ink;
    c.fillRect(door[0] + door[2] / 2 - 1.5, door[1], 3, door[3]);
    if (!lit) {
      c.fillStyle = '#f3f2f7';
      c.fillRect(door[0] + door[2] / 2 + 5, door[1] + 36, 3, 10);
    }
    c.restore();
  };
  const draw = (lit: boolean) => (c: CanvasRenderingContext2D) => {
    walls.forEach((f, i) => c.drawImage((lit ? f.emissiveMap : f.map).image as CanvasImageSource, 0, i * WH));
    SHOP_KINDS.forEach((k, i) => shop(c, WALL_KINDS.length * WH + i * SH, k, lit));
  };
  const map = canvasTex(W, H, draw(false));
  const emissiveMap = canvasTex(W, H, draw(true));
  for (const t of [map, emissiveMap]) t.wrapS = THREE.RepeatWrapping;
  // Canvas textures are flipped: the canvas's top row is v = 1
  const band = (top: number, h: number, th: number, tw: number): Band => ({ v0: 1 - (top + h) / H, vh: h / H, th, tw });
  return {
    mat: lit(toon('#ffffff', { map, emissiveMap, emissive: '#ffffff' }), 0.15, 1.5),
    walls: WALL_KINDS.map(([color], i) => ({ color, band: band(i * WH, WH, TEX_H, TEX_W) })),
    shops: SHOP_KINDS.map((_, i) => band(WALL_KINDS.length * WH + i * SH + 1, SH - 2, SHOP_H, SHOP_W)),
  };
})();
const AWNINGS = ['#e23b3b', '#ffd23f', '#00c2ff', '#e219e5', '#1fbf6b', '#ff8a3d', '#8000ff'];
const NEONS = [PAL.cyan, PAL.pink, PAL.warm, PAL.magenta, '#2bff88'];
/** Every neon downtown glows the same (one shared material, its colour per vertex) */
const glow = (color: string) => neon(color, 0.6, 2.4);
const INK = toon('#1b1830');
const STONE = toon('#8f8ab0');

/* ---------- Geometry helpers ---------- */

/**
 * A wall: the upright quad from a to c on the ground, y0 to y1, facing `n`, its
 * band of the atlas laid on in world units from u0.
 */
function quad(b: Batch, band: Band, a: Pt, c: Pt, y0: number, y1: number, n: Pt, u0: number) {
  const { tw, th } = band;
  // Wind it so it faces n: (c - a) x up points along n
  const [ex, ez] = [c[0] - a[0], c[1] - a[1]];
  if (-ez * n[0] + ex * n[1] < 0) [a, c] = [c, a];
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([a[0], y0, a[1], c[0], y0, c[1], c[0], y1, c[1], a[0], y1, a[1]], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([n[0], 0, n[1], n[0], 0, n[1], n[0], 0, n[1], n[0], 0, n[1]], 3));
  const u1 = u0 + len / tw;
  const v0 = band.v0;
  const v1 = band.v0 + Math.min(1, (y1 - y0) / th) * band.vh;
  g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v0, u1, v0, u1, v1, u0, v1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  b.add(g, ATLAS.mat);
}
const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: THREE.Material) => b.box(x0, y0, z0, x1 - x0, y1 - y0, z1 - z0, mat);
const cyl = (b: Batch, r: number, h: number, x: number, y: number, z: number, mat: THREE.Material, seg = 10, r0 = r) =>
  b.add(new THREE.CylinderGeometry(r, r0, h, seg).translate(x, y + h / 2, z), mat);

/** A bench, the sitter facing `ry` (0 is +z), seat top at S + 0.3 */
function bench(b: Batch, at: Pt, ry: number) {
  const g = (w: number, h: number, d: number, x: number, y: number, z: number) =>
    new THREE.BoxGeometry(w, h, d)
      .translate(x, y + h / 2, z)
      .rotateY(ry)
      .translate(at[0], S, at[1]);
  const wood = toon('#8a5a3c');
  b.add(g(0.9, 0.06, 0.3, 0, 0.24, 0), wood);
  b.add(g(0.9, 0.3, 0.05, 0, 0.32, -0.15), wood);
  for (const sx of [-0.36, 0.36]) b.add(g(0.05, 0.26, 0.28, sx, 0, 0), INK);
}
const SEAT = S + 0.3;

/* ---------- Infill buildings ---------- */

function building(b: Batch, f: Infill) {
  const r = rng(f.seed);
  const [x0, z0, x1, z1] = f.box;
  const top = S + f.h;
  const wall = ATLAS.walls[Math.floor(r() * ATLAS.walls.length)];
  const shop = ATLAS.shops[Math.floor(r() * ATLAS.shops.length)];
  const sides: { a: Pt; c: Pt; n: Pt; front: boolean }[] = [
    { a: [x0, z0], c: [x1, z0], n: [0, -1], front: f.face === 'n' },
    { a: [x1, z1], c: [x0, z1], n: [0, 1], front: f.face === 's' },
    { a: [x0, z1], c: [x0, z0], n: [-1, 0], front: f.face === 'w' },
    { a: [x1, z0], c: [x1, z1], n: [1, 0], front: f.face === 'e' },
  ];
  const u0 = Math.floor(r() * WALL_COLS) / WALL_COLS;
  for (const sd of sides) {
    if (!sd.front) {
      quad(b, wall.band, sd.a, sd.c, S, top, sd.n, u0);
      continue;
    }
    quad(b, shop, sd.a, sd.c, S, S + SHOP_H, sd.n, r());
    // Upper floors: their windows start a floor above the shop
    quad(b, wall.band, sd.a, sd.c, S + SHOP_H, top, sd.n, u0);
    // A ledge over the shop, an awning or a neon strip (or both)
    const [ax, az] = sd.a;
    const [cx, cz] = sd.c;
    const [nx, nz] = sd.n;
    const span = (out: number, inset: number, y0: number, y1: number, mat: THREE.Material) => {
      const lo: Pt = [Math.min(ax, cx) + (nx ? 0 : inset), Math.min(az, cz) + (nz ? 0 : inset)];
      const hi: Pt = [Math.max(ax, cx) - (nx ? 0 : inset), Math.max(az, cz) - (nz ? 0 : inset)];
      // Out from the wall along its normal
      const [ox0, ox1] = nx > 0 ? [hi[0], hi[0] + out] : nx < 0 ? [lo[0] - out, lo[0]] : [lo[0], hi[0]];
      const [oz0, oz1] = nz > 0 ? [hi[1], hi[1] + out] : nz < 0 ? [lo[1] - out, lo[1]] : [lo[1], hi[1]];
      box(b, ox0, y0, oz0, ox1, y1, oz1, mat);
    };
    span(0.08, 0, S + SHOP_H - 0.02, S + SHOP_H + 0.07, toon(shadeHex(wall.color, -0.35)));
    const width = Math.hypot(cx - ax, cz - az);
    if (r() < 0.6) {
      const awning = toon(AWNINGS[Math.floor(r() * AWNINGS.length)]);
      span(0.42, 0.18, S + SHOP_H - 0.12, S + SHOP_H - 0.06, awning);
      span(0.44, 0.18, S + SHOP_H - 0.3, S + SHOP_H - 0.12, awning);
    }
    if (r() < 0.55) span(0.05, Math.max(0.3, width * 0.22), S + SHOP_H + 0.14, S + SHOP_H + 0.2, glow(NEONS[Math.floor(r() * NEONS.length)]));
  }
  // The roof, its parapet, and what stands on it
  const roof = toon('#2a2547');
  box(b, x0, top - 0.04, z0, x1, top, z1, roof);
  const par = toon(shadeHex(wall.color, -0.25));
  const t = 0.12;
  const ph = 0.22;
  box(b, x0, top, z0, x1, top + ph, z0 + t, par);
  box(b, x0, top, z1 - t, x1, top + ph, z1, par);
  box(b, x0, top, z0 + t, x0 + t, top + ph, z1 - t, par);
  box(b, x1 - t, top, z0 + t, x1, top + ph, z1 - t, par);
  const [mx, mz] = [(x0 + x1) / 2, (z0 + z1) / 2];
  const ac = toon('#c9c4e6');
  const units = Math.floor(r() * 3);
  for (let i = 0; i < units; i++) {
    const ux = mx + (r() - 0.5) * (x1 - x0 - 1.2);
    const uz = mz + (r() - 0.5) * (z1 - z0 - 1.2);
    box(b, ux - 0.3, top, uz - 0.22, ux + 0.3, top + 0.36, uz + 0.22, ac);
    box(b, ux - 0.2, top + 0.36, uz - 0.12, ux + 0.2, top + 0.38, uz + 0.12, INK);
  }
  if (r() < 0.35) box(b, mx - 0.45, top, mz - 0.45, mx + 0.25, top + 0.75, mz + 0.35, par);
  if (r() < 0.3) cyl(b, 0.025, 1.1, x0 + 0.4, top, z0 + 0.4, INK, 5);
}

/** The GM water tower, on a rooftop (scaled from the one that stood in the old park) */
function waterTower(b: Batch, f: Infill) {
  const [x0, z0, x1, z1] = f.box;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const base = S + f.h;
  const k = 0.72;
  const legTop = base + 4.2 * k;
  const steel = toon('#3a3466');
  const spread = 0.8 * k;
  const pts: Pt[] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  const beam = (a: THREE.Vector3, c: THREE.Vector3, w: number) => {
    const d = c.clone().sub(a);
    const g = new THREE.BoxGeometry(w, d.length(), w);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
    g.translate((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2);
    b.add(g, steel);
  };
  for (const [sx, sz] of pts) beam(new THREE.Vector3(cx + sx * spread, base, cz + sz * spread), new THREE.Vector3(cx + sx * spread * 0.6, legTop, cz + sz * spread * 0.6), 0.08);
  for (const y of [0.35, 0.7]) {
    const f2 = 1 - y * 0.4;
    for (let i = 0; i < 4; i++) {
      const [ax, az] = pts[i];
      const [bx, bz] = pts[(i + 1) % 4];
      const yy = base + (legTop - base) * y;
      beam(new THREE.Vector3(cx + ax * spread * f2, yy, cz + az * spread * f2), new THREE.Vector3(cx + bx * spread * f2, yy, cz + bz * spread * f2), 0.04);
    }
  }
  const gm = canvasTex(1024, 256, (c) => {
    c.fillStyle = '#5d4f9a';
    c.fillRect(0, 0, 1024, 256);
    c.strokeStyle = 'rgba(0,0,0,.25)';
    c.lineWidth = 4;
    for (let x = 0; x < 1024; x += 64) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, 256);
      c.stroke();
    }
    c.font = `900 170px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 16;
    c.strokeStyle = PAL.ink;
    for (const x of [128, 640]) {
      c.strokeText('GM', x, 136);
      c.fillStyle = PAL.pink;
      c.fillText('GM', x, 136);
    }
  });
  const lid = toon('#41377a');
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.05 * k, 1.05 * k, 1.7 * k, 24), [toon('#ffffff', { map: gm }), lid, lid]);
  tank.position.set(cx, legTop + 0.85 * k, cz);
  tank.rotation.y = -Math.PI / 4;
  b.mesh(tank);
  b.add(new THREE.ConeGeometry(1.15 * k, 0.8 * k, 24).translate(cx, legTop + 1.7 * k + 0.4 * k, cz), lid);
}

/* ---------- String lights (all of them one set of points) ---------- */

const bulbs: number[] = [];
function string(a: THREE.Vector3, c: THREE.Vector3, n = 10, sag = 0.25) {
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    bulbs.push(a.x + (c.x - a.x) * t, a.y + (c.y - a.y) * t - Math.sin(t * Math.PI) * sag, a.z + (c.z - a.z) * t);
  }
}
/** Zigzag strings down a lane between two walls, `h` up */
function zigzag(r: [number, number, number, number], h: number, step = 1.6) {
  const [x0, z0, x1, z1] = r;
  const alongX = x1 - x0 > z1 - z0;
  const len = alongX ? x1 - x0 : z1 - z0;
  const n = Math.max(1, Math.round(len / step));
  for (let i = 0; i < n; i++) {
    const p0 = i / n;
    const p1 = (i + 1) / n;
    const side = i % 2;
    const at = (p: number, s: number) => (alongX ? new THREE.Vector3(x0 + len * p, h, s ? z1 - 0.05 : z0 + 0.05) : new THREE.Vector3(s ? x1 - 0.05 : x0 + 0.05, h, z0 + len * p));
    string(at(p0, side), at(p1, 1 - side), 5, 0.12);
  }
}

/* ---------- The scene ---------- */

/** `low`: phones (a smaller crowd on the square) */
export function buildInfill(scene: THREE.Scene, crowd: Idle[], tick: (f: Tick) => void, low = false) {
  const b = new Batch();

  for (const f of INFILL) building(b, f);
  waterTower(b, WATER_TOWER);

  // Alleys: bollards at the mouth, bins and crates at the back, string lights overhead
  const bin = toon('#2f6b4f');
  const crate = toon('#8a6a3c');
  for (const a of ALLEYS) {
    for (const [x, z] of a.bollards) {
      cyl(b, 0.08, 0.6, x, S, z, INK, 8, 0.09);
      cyl(b, 0.085, 0.06, x, S + 0.46, z, glow(PAL.warm), 8);
    }
    const [x0, z0, x1, z1] = a.box;
    const alongX = x1 - x0 > z1 - z0;
    // The far end from the bollards (the back of the block)
    const [bx, bz] = a.bollards[0];
    const back: Pt = alongX ? [Math.abs(bx - x0) < Math.abs(bx - x1) ? x1 - 0.7 : x0 + 0.7, z0 + 0.45] : [x0 + 0.45, Math.abs(bz - z0) < Math.abs(bz - z1) ? z1 - 0.7 : z0 + 0.7];
    box(b, back[0] - 0.3, S, back[1] - 0.25, back[0] + 0.3, S + 0.55, back[1] + 0.25, bin);
    box(b, back[0] - 0.32, S + 0.55, back[1] - 0.27, back[0] + 0.32, S + 0.6, back[1] + 0.27, INK);
    const c2: Pt = alongX ? [back[0], z1 - 0.35] : [x1 - 0.35, back[1]];
    box(b, c2[0] - 0.22, S, c2[1] - 0.22, c2[0] + 0.22, S + 0.42, c2[1] + 0.22, crate);
    zigzag(a.box, S + 2.2);
  }
  // The courtyard lanes: string lights, planters and a pair chatting
  for (const [i, l] of LANES.entries()) {
    zigzag(l, S + 2.4, 2);
    const [x0, z0, x1, z1] = l;
    const alongX = x1 - x0 > z1 - z0;
    const mid: Pt = [(x0 + x1) / 2, (z0 + z1) / 2];
    if (alongX) {
      for (const x of [x0 + 1.2, x1 - 1.2]) {
        box(b, x - 0.35, S, z0 + 0.15, x + 0.35, S + 0.35, z0 + 0.55, toon('#6e6a8c'));
        addTree(x, z0 + 0.35, 0.55, false, S + 0.35);
      }
    }
    if (i > 0) crowd.push({ x: mid[0] - 0.35, z: mid[1], ry: Math.PI / 2, act: 'chat' }, { x: mid[0] + 0.35, z: mid[1], ry: -Math.PI / 2, act: 'chat' });
  }

  // Pocket parks: a low hedge along the straight sides (open in the middle), trees, benches with people on, a lamp
  const hedge = toon('#2a8a55');
  for (const p of PARKS) {
    const n = p.poly.length;
    for (let i = 0; i < n; i++) {
      const a = p.poly[i];
      const c = p.poly[(i + 1) % n];
      // Straight sides only (the diagonal side stays open to its sidewalk)
      if (a[0] !== c[0] && a[1] !== c[1]) continue;
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const gap = 1.4;
      for (const [t0, t1] of [
        [0.6, len / 2 - gap / 2],
        [len / 2 + gap / 2, len - 0.6],
      ]) {
        if (t1 - t0 < 0.4) continue;
        const ux = (c[0] - a[0]) / len;
        const uz = (c[1] - a[1]) / len;
        // Inward: a counter-clockwise outline's inside is on the left of travel
        const [ix, iz] = [uz, -ux];
        const p0: Pt = [a[0] + ux * t0 + ix * 0.3, a[1] + uz * t0 + iz * 0.3];
        const p1: Pt = [a[0] + ux * t1 + ix * 0.3, a[1] + uz * t1 + iz * 0.3];
        box(b, Math.min(p0[0], p1[0]) - 0.17, S, Math.min(p0[1], p1[1]) - 0.17, Math.max(p0[0], p1[0]) + 0.17, S + 0.4, Math.max(p0[1], p1[1]) + 0.17, hedge);
      }
    }
    for (const t of p.trees) addTree(t[0], t[1]);
    p.benches.forEach((q, k) => {
      bench(b, q.at, q.ry);
      if (k === 0) crowd.push({ x: q.at[0], z: q.at[1], y: SEAT, ry: q.ry, act: 'sit' });
    });
    for (const l of p.lamps) addLamp(l[0], l[1], 0);
  }

  square(scene, b, crowd, tick, low);
  streetLamps();

  b.build(scene);
  // Every string light downtown: one set of points, lit at night
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(bulbs, 3));
  const mat = lit(
    new THREE.PointsMaterial({ color: PAL.warm, map: glowTex, size: 0.24, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
    0.25,
    1.4
  );
  scene.add(fx(new THREE.Points(geo, mat)));
}

/** The hangout square: the stage and screen at the north end facing the square, the fountain, kiosks, planters, benches, poles with string lights, and its crowd */
function square(scene: THREE.Scene, b: Batch, crowd: Idle[], tick: (f: Tick) => void, low: boolean) {
  const sq = SQUARE;
  const [x0, z0, x1, z1] = sq.box;
  // A stone ring round the fountain and a dance floor in front of the stage
  b.add(new THREE.RingGeometry(sq.fountain.r + 0.1, sq.fountain.r + 1.1, 32).rotateX(-Math.PI / 2).translate(sq.fountain.at[0], S + 0.008, sq.fountain.at[1]), toon('#6f6a9a'));
  // The stage's back is sz0 (north), its front sz1 faces the square
  const [s0, sz0, s1, sz1] = sq.stage;
  box(b, s0 + 0.5, S, sz1 + 0.4, s1 - 0.5, S + 0.012, sz1 + 4.2, toon('#2c2650'));
  box(b, s0 + 0.5, S, sz1 + 4.1, s1 - 0.5, S + 0.016, sz1 + 4.2, glow(PAL.pink));
  box(b, s0 + 0.5, S, sz1 + 0.4, s1 - 0.5, S + 0.016, sz1 + 0.5, glow(PAL.pink));

  // The stage: a deck with a neon edge, steps either side, a truss over it, speakers at the front
  const H = sq.stageH;
  box(b, s0, S, sz0, s1, S + H, sz1, toon('#1f1b38'));
  box(b, s0, S + H, sz0, s1, S + H + 0.03, sz1, toon('#3a335f'));
  box(b, s0, S + H - 0.08, sz1, s1, S + H - 0.02, sz1 + 0.02, glow(PAL.cyan));
  for (const x of [s0 - 0.5, s1]) box(b, x, S, sz0 + 0.2, x + 0.5, S + H * 0.5, sz1 - 0.6, toon('#3a335f'));
  const truss = toon('#2b2848');
  for (const x of [s0 + 0.15, s1 - 0.35]) box(b, x, S + H, sz0 + 0.15, x + 0.2, S + 5.4, sz0 + 0.35, truss);
  box(b, s0 + 0.15, S + 5.2, sz0 + 0.15, s1 - 0.15, S + 5.4, sz0 + 0.35, truss);
  for (const x of [s0 + 0.2, s1 - 0.8]) {
    box(b, x, S + H, sz1 - 0.65, x + 0.6, S + H + 1.0, sz1 - 0.15, INK);
    cyl(b, 0.16, 0.02, x + 0.3, S + H + 0.55, sz1 - 0.15, toon('#4b4766'), 12);
  }
  // Stage lights hanging off the truss
  for (let k = 0; k < 6; k++) {
    const x = s0 + 1 + k * ((s1 - s0 - 2) / 5);
    box(b, x - 0.1, S + 4.95, sz0 + 0.4, x + 0.1, S + 5.2, sz0 + 0.6, glow([PAL.pink, PAL.cyan, PAL.warm][k % 3]));
  }

  // The big screen at the back of the stage, facing the square: fixed copy only
  const sc = sq.screen;
  const tex = canvasTex(1024, 448, (c) => {
    const g = c.createLinearGradient(0, 0, 1024, 448);
    g.addColorStop(0, '#2a0b52');
    g.addColorStop(1, '#0b1f4a');
    c.fillStyle = g;
    c.fillRect(0, 0, 1024, 448);
    const border = c.createLinearGradient(0, 0, 1024, 0);
    border.addColorStop(0, PAL.violet);
    border.addColorStop(0.5, PAL.magenta);
    border.addColorStop(1, PAL.cyan);
    c.strokeStyle = border;
    c.lineWidth = 18;
    c.strokeRect(9, 9, 1006, 430);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `900 168px ${FONT_DISPLAY}`;
    c.lineWidth = 14;
    c.strokeStyle = PAL.ink;
    c.strokeText('DEGEN CITY', 512, 190);
    c.fillStyle = '#ffffff';
    c.fillText('DEGEN CITY', 512, 190);
    c.font = `800 64px ${FONT_DISPLAY}`;
    c.fillStyle = PAL.cyan;
    c.fillText('GM DEGENS  ·  GAME ON', 512, 340);
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(sc.x1 - sc.x0, sc.y1 - sc.y0), lit(new THREE.MeshBasicMaterial({ map: tex }), 0.95, 1.5));
  screen.position.set((sc.x0 + sc.x1) / 2, S + (sc.y0 + sc.y1) / 2, sc.z + 0.06);
  scene.add(screen);
  box(b, sc.x0 - 0.12, S + sc.y0 - 0.12, sc.z - 0.12, sc.x1 + 0.12, S + sc.y1 + 0.12, sc.z + 0.05, INK);
  for (const x of [sc.x0 + 0.6, sc.x1 - 0.8]) box(b, x, S + H, sc.z - 0.12, x + 0.2, S + sc.y0, sc.z + 0.02, INK);

  // The fountain: a stone basin, water, a column with a bowl and a jet
  const f = sq.fountain;
  const [fx0, fz0] = f.at;
  cyl(b, f.r, 0.45, fx0, S, fz0, STONE, 28);
  cyl(b, f.r + 0.06, 0.06, fx0, S + 0.45, fz0, toon('#a9a4c9'), 28);
  const water = new THREE.Mesh(new THREE.CircleGeometry(f.r - 0.1, 28).rotateX(-Math.PI / 2), waterMat);
  water.position.set(fx0, S + 0.4, fz0);
  scene.add(water);
  cyl(b, 0.16, 1.0, fx0, S + 0.4, fz0, STONE, 12);
  cyl(b, 0.6, 0.12, fx0, S + 1.3, fz0, STONE, 20, 0.3);
  const jet = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.9, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#bfefff', transparent: true, opacity: 0.45, depthWrite: false }));
  jet.position.set(fx0, S + 1.85, fz0);
  jet.rotation.x = Math.PI;
  scene.add(fx(jet));
  tick(({ t }) => {
    jet.scale.y = 1 + Math.sin(t * 5) * 0.08;
  });

  // Kiosks: a booth with a counter hatch, a canopy and a neon strip; someone queueing at each
  sq.kiosks.forEach((k, i) => {
    const [kx0, kz0, kx1, kz1] = k;
    const col = ['#e219e5', '#00c2ff'][i % 2];
    box(b, kx0, S, kz0, kx1, S + 1.6, kz1, toon('#2b2550'));
    // The hatch faces the middle of the square
    const inward = i === 0 ? 1 : -1;
    const hx = inward > 0 ? kx1 : kx0;
    box(b, Math.min(hx, hx + inward * 0.02), S + 0.7, kz0 + 0.4, Math.max(hx, hx + inward * 0.02), S + 1.3, kz1 - 0.4, glow(PAL.warm));
    box(b, Math.min(hx, hx + inward * 0.3), S + 0.68, kz0 + 0.35, Math.max(hx, hx + inward * 0.3), S + 0.74, kz1 - 0.35, toon('#c9c4e6'));
    box(b, kx0 - 0.2, S + 1.6, kz0 - 0.2, kx1 + 0.2, S + 1.75, kz1 + 0.2, toon(col));
    box(b, kx0 - 0.2, S + 1.75, kz0 - 0.2, kx1 + 0.2, S + 1.8, kz1 + 0.2, glow(col));
    crowd.push({ x: hx + inward * 0.9, z: (kz0 + kz1) / 2, ry: inward > 0 ? -Math.PI / 2 : Math.PI / 2, act: 'queue' });
  });

  // Trees in planters round the edge
  for (const [x, z] of sq.trees) {
    box(b, x - 0.45, S, z - 0.45, x + 0.45, S + 0.5, z + 0.45, toon('#6e6a8c'));
    box(b, x - 0.38, S + 0.5, z - 0.38, x + 0.38, S + 0.52, z + 0.38, toon('#3b2a22'));
    addTree(x, z, 0.95, false, S + 0.52);
  }
  // Benches facing the stage, with people watching
  sq.benches.forEach((q, k) => {
    bench(b, q.at, q.ry);
    if (!low || k % 2) crowd.push({ x: q.at[0] + (k % 2 ? 0.2 : -0.2), z: q.at[1], y: SEAT, ry: q.ry, act: 'sit' });
  });
  // A crowd on the dance floor, facing the stage, and a couple of groups talking
  const r = rng(77);
  for (let i = 0; i < (low ? 4 : 9); i++) {
    const x = s0 + 1.4 + r() * (s1 - s0 - 2.8);
    const z = sz1 + 1.0 + r() * 2.6;
    crowd.push({ x, z, ry: Math.PI + (r() - 0.5) * 0.5, act: 'look' });
  }
  for (const [gx, gz] of (
    [
      [x0 + 3.2, z1 - 6.6],
      [x1 - 3.4, z1 - 6.2],
    ] as Pt[]
  ).slice(0, low ? 1 : 2)) {
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + gx;
      const px = gx + Math.cos(a) * 0.5;
      const pz = gz + Math.sin(a) * 0.5;
      crowd.push({ x: px, z: pz, ry: Math.atan2(gx - px, gz - pz), act: 'chat' });
    }
  }

  // Poles at the corners, strings of lights round the edge and across to the stage truss
  const top = S + 3;
  const poles = sq.poles.map(([x, z]) => {
    cyl(b, 0.06, 3, x, S, z, INK, 6);
    return new THREE.Vector3(x, top, z);
  });
  for (let i = 0; i < 4; i++) string(poles[i], poles[(i + 1) % 4], 16, 0.35);
  const truss0 = new THREE.Vector3(s0 + 0.25, S + 5.2, sz0 + 0.25);
  const truss1 = new THREE.Vector3(s1 - 0.25, S + 5.2, sz0 + 0.25);
  string(poles[3], truss1, 18, 0.6);
  string(poles[2], truss0, 18, 0.6);
}

/** Lamps along downtown's cross streets, both sides, kept off the crossings and the diagonals' mouths */
function streetLamps() {
  const off = LANE + 0.1;
  const nearDiag = (x: number, z: number) =>
    DIAGONALS.some((d) => {
      const [ax, az] = d.from;
      const [bx, bz] = d.to;
      const L = Math.hypot(bx - ax, bz - az);
      const t = Math.max(0, Math.min(L, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / L));
      return Math.hypot(x - (ax + ((bx - ax) * t) / L), z - (az + ((bz - az) * t) / L)) < LANE + 1.8;
    });
  for (const c of CORE_ROADS)
    for (let s = 4; s < DOWNTOWN - 2; s += 8) {
      if (CORE_ROADS.some((k) => Math.abs(s - k) < 4.5)) continue;
      for (const side of [-1, 1]) {
        // Along the north-south street at x = c, then the east-west street at z = c
        const [x, z] = [c + side * off, s];
        if (!nearDiag(x, z)) addLamp(x, z, side < 0 ? 0 : Math.PI);
        const [x2, z2] = [s + 3, c + side * off];
        if (!nearDiag(x2, z2)) addLamp(x2, z2, side < 0 ? -Math.PI / 2 : Math.PI / 2);
      }
    }
}
