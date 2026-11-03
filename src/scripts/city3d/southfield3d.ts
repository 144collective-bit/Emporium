/*
 * Southfield drawn (docs/blend-plan.md Phase 5a; the data is southfield.ts), a district loaded as you approach
 * (districts.ts `LAZY_DISTRICTS`), as sites (tilework.ts):
 *
 * - the yards' streets (asphalt, a dashed yellow centre line clear of the junctions and corners, zebras across the
 *   ring's ends and the avenue at its lit junctions), worn like the Docks';
 * - the yards' buildings: the warehouses and the works (kits3d.ts `drawLot()`), the bus depot's shed (three walls, an
 *   open front on steel columns, a sawtooth of roof lights, its name), the gatehouse and its barrier, the builder's
 *   merchant (its store, the material bays with their heaps, the pallets), the truck depot's office and the lock-ups
 *   (roller doors in a row);
 * - the park: its gravel paths, the pond in a stone rim, the community garden (raised beds, a shed, a polytunnel, a
 *   table), benches and a name board at its way in;
 * - the allotments: each plot's dug soil with rows of crops (near only), its edging and a shed on some, the path down
 *   the strip, the society's hut; the east strip's garden;
 * - the railside walk under the airport branch and the walk under the main line: gravel, shrubs, benches.
 *
 * The blocks' slabs and lawns are the street plan's (world.ts), the lamps, trees and people the boot's (index.ts),
 * the parked buses, trucks and the van the main thread's (`parkedCars()`). Signs are one small atlas of fixed copy.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, neon, siteMat, toon } from './kit';
import { site } from './tilework';
import { offsetLine, type Pt } from './streetplan';
import { EW_ROADS, MEDIAN, SOUTH_ROAD } from './layout';
import { SLAB as S } from './world';
import { COVER } from './palette';
import { drawLot } from './kits3d';
import { parkedCars } from './cars';
import { LINES } from './docksport';
import {
  AVENUE_KERB, BAYS, CONTAINERS, SKIPS, SKIP_H, DEPOT_GATE, DEPOT_SHED, EAST_BEDS, EAST_GARDEN, EAST_TUNNEL, GARDEN_LOT, GARDEN_TUNNEL, HALF, HUTS, LOCKUP_W, LOCKUPS,
  MERCHANT, PARK_BENCHES, PARK_LOT, PARK_PATHS, PATH_W, PLOTS, POND, RAIL_BENCHES, RAIL_WALK, RAISED_BEDS, SF_CARS, SF_CROSSINGS, SF_SIGNS, SF_STREETS,
  SHED_H, STACKS, STRIPS, STRIP_WALK, TABLES, TRUCK_OFFICE, WALK_PATH_W, WEST_LOCKUPS, YARD_LOTS, shedOf, type Rect, type Shed,
} from './southfield';

export const SELF = import.meta.url;

/** The streets' asphalt, level with the city's other district streets */
const Y = 0.031;
/** Pieces of road or path no longer than this (a site each: nothing much longer than a tile, tileBatch()) */
const PIECE = 24;
const unit = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const AVENUE = EW_ROADS.find((r) => r.c === SOUTH_ROAD)!;

/* ---------- Signs: one small atlas, a row each ---------- */

const ROWS: { text: string; bg: string; fg: string }[] = [
  { text: SF_SIGNS.depot, bg: '#1d2b4a', fg: '#ffd23f' },
  { text: SF_SIGNS.merchant, bg: '#e0702a', fg: '#17161c' },
  { text: SF_SIGNS.allotments, bg: '#2f4a32', fg: '#f1ead0' },
  { text: SF_SIGNS.garden, bg: '#6a3e78', fg: '#f6f0ff' },
  { text: SF_SIGNS.park, bg: '#23463a', fg: '#f1ead0' },
];
const ATLAS = canvasTex(512, 512, (c) => {
  c.fillStyle = '#000';
  c.fillRect(0, 0, 512, 512);
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
    c.fillText(row.text, 256, y + 34);
  });
});
const SIGN = siteMat('southfield-sign', toon('#ffffff', { map: ATLAS }));
/** A sign from the atlas facing n (x, z), its middle at (x, y, z) */
function sign(b: Batch, row: number, x: number, y: number, z: number, n: Pt, w: number, h: number) {
  const g = new THREE.PlaneGeometry(w, h);
  const [v0, v1] = [1 - (row * 64 + 64) / 512, 1 - (row * 64) / 512];
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, v1, 1, v1, 0, v0, 1, v0], 2));
  b.add(g.rotateY(Math.atan2(n[0], n[1])).translate(x + n[0] * 0.012, y, z + n[1] * 0.012), SIGN);
}

/* ---------- Helpers ---------- */

/** A flat strip along a line from l to r right of it at y, wound to face up */
function ribbon(pts: Pt[], l: number, r: number, y: number) {
  const L = offsetLine(pts, l);
  const R = offsetLine(pts, r);
  const pos: number[] = [];
  const tri = (p: Pt, q: Pt, t: Pt) => {
    const up = (q[1] - p[1]) * (t[0] - p[0]) - (q[0] - p[0]) * (t[1] - p[1]) > 0;
    for (const w of up ? [p, q, t] : [p, t, q]) pos.push(w[0], y, w[1]);
  };
  for (let i = 1; i < pts.length; i++) {
    tri(L[i - 1], R[i - 1], R[i]);
    tri(L[i - 1], R[i], L[i]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
/** A straight run cut into pieces no longer than PIECE */
function cut(a: Pt, b: Pt): [Pt, Pt][] {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / PIECE));
  return Array.from({ length: n }, (_, k): [Pt, Pt] => [
    [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n],
    [a[0] + ((b[0] - a[0]) * (k + 1)) / n, a[1] + ((b[1] - a[1]) * (k + 1)) / n],
  ]);
}
const segBox = ([a, b]: [Pt, Pt], pad: number): Rect => [Math.min(a[0], b[0]) - pad, Math.min(a[1], b[1]) - pad, Math.max(a[0], b[0]) + pad, Math.max(a[1], b[1]) + pad];
const grow = (r: Rect, m: number): Rect => [r[0] - m, r[1] - m, r[2] + m, r[3] + m];
/** A rect's box from y0 up h */
const rbox = (b: Batch, r: Rect, y0: number, h: number, m: THREE.Material) => b.box(r[0], y0, r[1], r[2] - r[0], h, r[3] - r[1], m);
/** The outward normal of a face, and the line along it */
const NORMAL: Record<string, Pt> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };

export function register({ low, scene }: { low: boolean; scene: THREE.Scene | null }) {
  const asphalt = toon('#2a2838');
  const yellow = neon('#f5d76e', 0.9, 1.1);
  const zebra = toon('#e8e4f8');
  const gravel = toon(COVER.gravel);
  const dirt = toon(COVER.dirt);
  const bare = toon(COVER.bare);
  const crop = toon(COVER.planted);
  const leafy = toon(COVER.garden);
  const shrub = toon(COVER.bank);
  const stone = toon('#a7a2b8');
  const water = toon('#2c6f9e');
  const steel = toon('#3d4152');
  const cladding = toon('#8f97a6');
  const claddingDark = toon('#5b6170');
  const roofGrey = toon('#4a4d5c');
  const brick = toon('#8a4a3a');
  const timber = toon('#7a5a3a');
  const shedGreen = toon('#3f6b4a');
  const shedBlue = toon('#4b6a8a');
  const door = toon('#b8bcc8');
  const doorDark = toon('#6d7282');
  const glass = toon('#7fa6c4');
  const film = toon('#e9eef2');
  const sand = toon('#d8bf7a');
  const pebbles = toon('#9c968a');
  const pallet = toon('#a07a4c');
  const blocks = toon('#b5b0a8');
  const redPaint = toon('#d8473a');
  const white = toon('#f1eff6');
  const lamp = neon('#ffe2a0', 0.25, 1.6);

  /* ---------- The yards' streets ---------- */
  const junctions: Pt[] = SF_CROSSINGS.map((c) => c.at);
  const inJunction = (x: number, z: number) => junctions.some(([jx, jz]) => Math.abs(x - jx) < HALF + 1 && Math.abs(z - jz) < (jz === SOUTH_ROAD ? AVENUE.half : HALF) + 1);
  for (const s of SF_STREETS) {
    // (from the avenue's south kerb: the avenue's own asphalt is the junction)
    const pts = s.pts.map((p): Pt => (p[1] === SOUTH_ROAD ? [p[0], AVENUE_KERB] : p));
    for (let i = 1; i < pts.length; i++)
      cut(pts[i - 1], pts[i]).forEach((seg, k) =>
        site(`southfield street ${s.id} ${i} ${k}`, segBox(seg, s.half + 0.5), (into) => {
          const b = new Batch();
          const [a, c] = seg;
          const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
          const [ux, uz] = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
          const atCorner = (p: Pt) => s.pts.slice(1, -1).some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-6);
          const a2: Pt = atCorner(a) ? [a[0] - ux * s.half, a[1] - uz * s.half] : a;
          const c2: Pt = atCorner(c) ? [c[0] + ux * s.half, c[1] + uz * s.half] : c;
          b.add(ribbon([a2, c2], -s.half, s.half, Y), asphalt);
          const ys: THREE.Matrix4[] = [];
          const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-uz, ux));
          for (let d = 0.55; d < len; d += 1.1) {
            const [x, z] = [a[0] + ux * d, a[1] + uz * d];
            if (inJunction(x, z) || s.pts.slice(1, -1).some((p) => Math.hypot(p[0] - x, p[1] - z) < s.half + 0.6)) continue;
            ys.push(new THREE.Matrix4().compose(new THREE.Vector3(x, Y + 0.006, z), q, new THREE.Vector3(0.55, 1, 0.07)));
          }
          b.instances(unit, yellow, ys);
          b.build(into, { cast: false, receive: true });
        })
      );
  }
  // Zebras at the lit junctions: across the ring's end, and the avenue either side of it
  for (const c of SF_CROSSINGS) {
    if (!c.lights) continue;
    const zs: THREE.Matrix4[] = [];
    const stripe = (x: number, z: number, w: number, d: number) => zs.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0.04, z), new THREE.Quaternion(), new THREE.Vector3(w, 1, d)));
    for (let w = -HALF + 0.16; w < HALF - 0.1; w += 0.32) stripe(c.at[0] + w, AVENUE_KERB + 0.75, 0.17, 0.55);
    for (const dir of [-1, 1]) {
      const x = c.at[0] + dir * (HALF + 0.75);
      for (let w = -AVENUE.half + 0.16; w < AVENUE.half - 0.1; w += 0.32) if (Math.abs(w) > MEDIAN / 2 + 0.1) stripe(x, c.at[1] + w, 0.55, 0.17);
    }
    const r = 9;
    site(`southfield crossing ${c.id}`, [c.at[0] - r, c.at[1] - r, c.at[0] + r, c.at[1] + r], (into) => {
      const b = new Batch();
      b.instances(unit, zebra, zs);
      b.build(into, { cast: false, receive: true });
    });
  }

  /* ---------- The yards' kit buildings ---------- */
  YARD_LOTS.forEach((lot, i) =>
    site(`southfield lot ${i}`, grow(lot.box, 1), (into) => {
      const b = new Batch();
      drawLot(b, lot, low);
      b.build(into, { cast: true, receive: true });
    })
  );

  /* ---------- Sheds, stores, lock-ups, huts ---------- */
  /** A plain low building: walls, a flat roof just inside them, its door on its face */
  function block(b: Batch, s: Shed, wall: THREE.Material, roofM: THREE.Material) {
    rbox(b, s.rect, S, s.h, wall);
    rbox(b, grow(s.rect, -0.006), S + s.h, 0.08, roofM);
    // (a coping round the roof's edge)
    const [x0, z0, x1, z1] = s.rect;
    for (const [r, k] of [
      [[x0, z0, x1, z0 + 0.12], 0],
      [[x0, z1 - 0.12, x1, z1], 0],
      [[x0, z0, x0 + 0.12, z1], 0],
      [[x1 - 0.12, z0, x1, z1], 0],
    ] as [Rect, number][])
      rbox(b, r, S + s.h + k, 0.16, steel);
  }
  /** A point on a shed's face (u along it from its left as you look at it, `out` proud) */
  function onFace(s: Shed, u: number, out = 0.01): [number, number] {
    const [x0, z0, x1, z1] = s.rect;
    return s.face === 'n' ? [x1 - u, z0 - out] : s.face === 's' ? [x0 + u, z1 + out] : s.face === 'w' ? [x0 - out, z0 + u] : [x1 + out, z1 - u];
  }
  const faceLen = (s: Shed) => (s.face === 'n' || s.face === 's' ? s.rect[2] - s.rect[0] : s.rect[3] - s.rect[1]);
  /** A panel on a shed's face: u from its left, w wide, from y0 up h */
  function panel(b: Batch, s: Shed, u: number, w: number, y0: number, h: number, m: THREE.Material, out = 0.012) {
    const n = NORMAL[s.face];
    const [x, z] = onFace(s, u + w / 2, out);
    b.add(new THREE.PlaneGeometry(w, h).rotateY(Math.atan2(n[0], n[1])).translate(x, S + y0 + h / 2, z), m);
  }

  // The bus depot's shed: walls on three sides, its north side open between steel columns, roof lights, its name
  site('southfield depot', grow(DEPOT_SHED.rect, 2), (into) => {
    const b = new Batch();
    const [x0, z0, x1, z1] = DEPOT_SHED.rect;
    const h = DEPOT_SHED.h;
    const t = 0.3;
    rbox(b, [x0, z1 - t, x1, z1], S, h, cladding);
    rbox(b, [x0, z0, x0 + t, z1], S, h, cladding);
    rbox(b, [x1 - t, z0, x1, z1], S, h, cladding);
    // (a brick plinth along the walls' foot, just proud)
    rbox(b, [x0 - 0.02, z1 - t - 0.02, x1 + 0.02, z1 + 0.02], S, 0.9, brick);
    // The open front: columns between the bays, a deep fascia over them with the name
    for (let k = 0; k <= 4; k++) rbox(b, [x0 + (k * (x1 - x0)) / 4 - (k === 4 ? 0.4 : 0), z0, x0 + (k * (x1 - x0)) / 4 + (k === 0 ? 0.4 : 0) + (k > 0 && k < 4 ? 0.2 : 0), z0 + 0.4], S, h - 1, steel);
    rbox(b, [x0, z0, x1, z0 + 0.6], S + h - 1, 1, claddingDark);
    sign(b, 0, (x0 + x1) / 2, S + h - 0.5, z0, [0, -1], 14, 0.8);
    // The roof: flat, with a sawtooth of north lights across it
    rbox(b, [x0, z0, x1, z1], S + h, 0.12, roofGrey);
    for (let z = z0 + 3; z < z1 - 3; z += 5) {
      const g = new THREE.BoxGeometry(x1 - x0 - 1, 0.9, 1.2).translate((x0 + x1) / 2, S + h + 0.55, z);
      b.add(g, roofGrey);
      b.add(new THREE.PlaneGeometry(x1 - x0 - 1.2, 0.7).rotateY(Math.PI).translate((x0 + x1) / 2, S + h + 0.55, z - 0.61), glass);
    }
    b.detail(() => {
      // Inside the bays: painted bay lines on the floor, a pit's edge, lights hanging
      for (let k = 1; k < 4; k++) b.box(x0 + (k * (x1 - x0)) / 4 - 0.06, S + 0.004, z0 + 1, 0.12, 0.004, z1 - z0 - 2, white);
      for (let k = 0; k < 4; k++) b.box(x0 + ((k + 0.5) * (x1 - x0)) / 4 - 0.4, S + h - 1.3, (z0 + z1) / 2 - 0.2, 0.8, 0.12, 0.4, lamp);
    });
    b.build(into, { cast: true, receive: true });
  });
  // The gatehouse and its barrier across the way in
  site('southfield gate', grow(DEPOT_GATE.rect, 4), (into) => {
    const b = new Batch();
    block(b, DEPOT_GATE, white, roofGrey);
    panel(b, DEPOT_GATE, 0.4, 2.2, 1, 0.9, glass);
    b.detail(() => {
      const [x1, z0] = [DEPOT_GATE.rect[2], DEPOT_GATE.rect[1]];
      rbox(b, [x1 + 0.2, z0 - 0.3, x1 + 0.5, z0], S, 1, steel);
      rbox(b, [x1 + 0.3, z0 - 0.25, x1 + 6, z0 - 0.15], S + 0.9, 0.1, redPaint);
    });
    b.build(into, { cast: true, receive: true });
  });
  // The builder's merchant: its store (glazed front, name), the bays with their heaps, the pallets of blocks
  site('southfield merchant', grow(MERCHANT.rect, 1), (into) => {
    const b = new Batch();
    block(b, MERCHANT, toon('#d9d4c6'), roofGrey);
    const L = faceLen(MERCHANT);
    panel(b, MERCHANT, 1, L - 6, 0.3, 1.6, glass);
    panel(b, MERCHANT, L - 4.2, 3, 0, 2.4, doorDark);
    panel(b, MERCHANT, 1, L - 2, MERCHANT.h - 0.95, 0.8, toon('#e0702a'));
    sign(b, 1, (MERCHANT.rect[0] + MERCHANT.rect[2]) / 2, S + MERCHANT.h - 0.55, MERCHANT.rect[1] - 0.02, [0, -1], 11, 0.62);
    b.build(into, { cast: true, receive: true });
  });
  site('southfield bays', grow([BAYS[0][0], STACKS[0][1], BAYS[3][2], BAYS[0][3]], 1), (into) => {
    const b = new Batch();
    const heaps = [sand, pebbles, sand, pebbles];
    BAYS.forEach(([x0, z0, x1, z1], i) => {
      rbox(b, [x0, z1 - 0.3, x1, z1], S, 1.4, stone);
      rbox(b, [x0, z0, x0 + 0.3, z1], S, 1.4, stone);
      rbox(b, [x1 - 0.3, z0, x1, z1], S, 1.4, stone);
      // (the heap: a low mound against the back wall)
      const g = new THREE.SphereGeometry(1, low ? 8 : 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale((x1 - x0) / 2 - 0.4, 1.1, (z1 - z0) / 2 - 0.4).translate((x0 + x1) / 2, S, (z0 + z1) / 2 + 0.6);
      b.add(g, heaps[i]);
    });
    for (const [x, z, w, d, h] of STACKS) {
      b.box(x, S, z, w, 0.14, d, pallet);
      b.box(x + 0.05, S + 0.14, z + 0.05, w - 0.1, h - 0.14, d - 0.1, blocks);
    }
    b.build(into, { cast: true, receive: true });
  });
  // The truck depot's office
  site('southfield truck office', grow(TRUCK_OFFICE.rect, 1), (into) => {
    const b = new Batch();
    block(b, TRUCK_OFFICE, cladding, roofGrey);
    panel(b, TRUCK_OFFICE, 0.6, 1, 0, 2.1, doorDark);
    panel(b, TRUCK_OFFICE, 2.2, 3, 1, 1, glass);
    b.build(into, { cast: true, receive: true });
  });
  // Lock-ups: a row of roller doors in a low block
  for (const s of [...LOCKUPS, ...WEST_LOCKUPS])
    site(`southfield ${s.id}`, grow(s.rect, 1), (into) => {
      const b = new Batch();
      block(b, s, s.id.startsWith('west') ? brick : claddingDark, roofGrey);
      const L = faceLen(s);
      const n = Math.floor(L / LOCKUP_W);
      const pad = (L - n * LOCKUP_W) / 2;
      for (let k = 0; k < n; k++) {
        panel(b, s, pad + k * LOCKUP_W + 0.3, LOCKUP_W - 0.6, 0, 2, k % 3 === 1 ? doorDark : door);
        if (!low) for (let y = 0.25; y < 2; y += 0.25) b.detail(() => panel(b, s, pad + k * LOCKUP_W + 0.3, LOCKUP_W - 0.6, y, 0.03, steel, 0.018));
      }
      b.build(into, { cast: true, receive: true });
    });
  // The huts (the allotment society's, the community garden's shed): timber, a pitched roof, a sign over the door
  for (const s of HUTS)
    site(`southfield ${s.id}`, grow(s.rect, 1), (into) => {
      const b = new Batch();
      const [x0, z0, x1, z1] = s.rect;
      rbox(b, s.rect, S, s.h, s.id === 'allotment-hut' ? shedGreen : shedBlue);
      // (a pitched roof: a ridge along x over eaves a little past the walls, its gables closed)
      const over = 0.25;
      const half = (z1 - z0) / 2 + over;
      const tri = new THREE.Shape([new THREE.Vector2(-half, 0), new THREE.Vector2(half, 0), new THREE.Vector2(0, 0.9)]);
      b.add(new THREE.ExtrudeGeometry(tri, { depth: x1 - x0 + over * 2, bevelEnabled: false }).rotateY(Math.PI / 2).translate(x0 - over, S + s.h, (z0 + z1) / 2), roofGrey);
      panel(b, s, faceLen(s) / 2 - 0.45, 0.9, 0, 1.8, timber);
      const [sx, sz] = onFace(s, faceLen(s) / 2, 0.02);
      sign(b, s.id === 'allotment-hut' ? 2 : 3, sx, S + s.h - 0.3, sz, NORMAL[s.face], Math.min(faceLen(s) - 0.4, 4), 0.42);
      b.build(into, { cast: true, receive: true });
    });
  // The polytunnels: white film over hoops
  for (const s of [GARDEN_TUNNEL, EAST_TUNNEL])
    site(`southfield ${s.id}`, grow(s.rect, 1), (into) => {
      const b = new Batch();
      const [x0, z0, x1, z1] = s.rect;
      const r = (x1 - x0) / 2;
      b.add(new THREE.CylinderGeometry(r, r, z1 - z0, low ? 8 : 14, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).scale(1, s.h / r, 1).translate((x0 + x1) / 2, S, (z0 + z1) / 2), film);
      b.build(into, { cast: true, receive: true });
    });

  // The works' back yard: the containers (corrugated sides near only), the skips
  const lineMats = LINES.map((l) => toon(l.color));
  site('southfield containers', grow([Math.min(...CONTAINERS.map((c) => c.rect[0])), Math.min(...CONTAINERS.map((c) => c.rect[1])), Math.max(...SKIPS.map((r) => r[2])), Math.max(...CONTAINERS.map((c) => c.rect[3]))], 1), (into) => {
    const b = new Batch();
    for (const c of CONTAINERS) {
      const tiers = Math.round(c.h / 1.44);
      for (let t = 0; t < tiers; t++) {
        const m = lineMats[(c.line + t) % lineMats.length];
        rbox(b, grow(c.rect, -0.01 * t), S + t * 1.44, 1.42, m);
        b.detail(() => {
          if (low) return;
          // (ribs down its long sides)
          for (let x = c.rect[0] + 0.3; x < c.rect[2] - 0.2; x += 0.45) {
            b.box(x, S + t * 1.44 + 0.08, c.rect[1] - 0.012, 0.06, 1.26, 0.012, m);
            b.box(x, S + t * 1.44 + 0.08, c.rect[3], 0.06, 1.26, 0.012, m);
          }
        });
      }
    }
    const skip = toon('#d8a23a');
    for (const [x0, z0, x1, z1] of SKIPS) {
      rbox(b, [x0, z0, x1, z1], S, SKIP_H, skip);
      b.box(x0 + 0.1, S + SKIP_H - 0.2, z0 + 0.1, x1 - x0 - 0.2, 0.012, z1 - z0 - 0.2, toon(COVER.bare));
    }
    b.build(into, { cast: true, receive: true });
  });

  /* ---------- The park ---------- */
  // Its paths: pale gravel a hair over the lawn, in pieces
  for (const p of PARK_PATHS)
    for (let i = 1; i < p.pts.length; i++)
      cut(p.pts[i - 1], p.pts[i]).forEach((seg, k) =>
        site(`southfield path ${p.id} ${i} ${k}`, segBox(seg, p.w), (into) => {
          const b = new Batch();
          const [a, c] = seg;
          const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
          const [ux, uz] = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
          // (carried on past its ends by half its width, so the turns close)
          b.add(ribbon([[a[0] - (ux * p.w) / 2, a[1] - (uz * p.w) / 2], [c[0] + (ux * p.w) / 2, c[1] + (uz * p.w) / 2]], -p.w / 2, p.w / 2, S + 0.006 + (p.id === 'loop' ? 0 : 0.002)), gravel);
          b.build(into, { cast: false, receive: true });
        })
      );
  // The pond: water a little under the rim, the rim's stones round it
  site('southfield pond', [POND.x - POND.rx - 1, POND.z - POND.rz - 1, POND.x + POND.rx + 1, POND.z + POND.rz + 1], (into) => {
    const b = new Batch();
    const seg = low ? 24 : 40;
    const ring = new THREE.RingGeometry(1 - POND.rim / POND.rx, 1, seg, 1).rotateX(-Math.PI / 2);
    // (the ring's inner edge scaled with the oval: a stone kerb POND.rim wide)
    b.add(new THREE.CylinderGeometry(1, 1, POND.h, seg, 1, true).scale(POND.rx, 1, POND.rz).translate(POND.x, S + POND.h / 2, POND.z), stone);
    b.add(ring.scale(POND.rx, 1, POND.rz).translate(POND.x, S + POND.h, POND.z), stone);
    b.add(new THREE.CircleGeometry(1, seg).rotateX(-Math.PI / 2).scale(POND.rx - POND.rim, 1, POND.rz - POND.rim).translate(POND.x, S + POND.h - 0.08, POND.z), water);
    b.detail(() => {
      // Lily pads and reeds at its edge
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2 + 0.3;
        b.add(new THREE.CircleGeometry(0.35, 6).rotateX(-Math.PI / 2).translate(POND.x + Math.cos(a) * (POND.rx - 2.2), S + POND.h - 0.07, POND.z + Math.sin(a) * (POND.rz - 1.8)), leafy);
      }
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + 1.1;
        b.add(new THREE.ConeGeometry(0.25, 0.9, 4).translate(POND.x + Math.cos(a) * (POND.rx - 0.9), S + POND.h + 0.2, POND.z + Math.sin(a) * (POND.rz - 0.8)), crop);
      }
    });
    b.build(into, { cast: false, receive: true });
  });
  // The community garden: raised beds, a table; its name on a board by the way in
  site('southfield garden', grow(GARDEN_LOT, 1), (into) => {
    const b = new Batch();
    for (const [x, z, w, d] of RAISED_BEDS) {
      b.box(x, S, z, w, 0.35, d, timber);
      b.box(x + 0.08, S + 0.35, z + 0.08, w - 0.16, 0.01, d - 0.16, dirt);
      b.detail(() => {
        for (let k = 0; k < 4; k++) b.add(new THREE.DodecahedronGeometry(0.22, 0).translate(x + 0.4 + k * ((w - 0.8) / 3), S + 0.52, z + d / 2), k % 2 ? leafy : crop);
      });
    }
    b.build(into, { cast: true, receive: true });
  });
  // Picnic tables
  TABLES.forEach(([x, z, alongX], i) =>
    site(`southfield table ${i}`, [x - 2, z - 2, x + 2, z + 2], (into) => {
      const b = new Batch();
      const [w, d] = alongX ? [1.8, 0.7] : [0.7, 1.8];
      b.box(x - w / 2, S + 0.7, z - d / 2, w, 0.06, d, timber);
      for (const s of [-1, 1]) b.box(alongX ? x - w / 2 : x + s * 0.7 - 0.12, S + 0.42, alongX ? z + s * 0.7 - 0.12 : z - d / 2, alongX ? w : 0.24, 0.05, alongX ? 0.24 : d, timber);
      for (const s of [-1, 1]) b.box(alongX ? x + s * (w / 2 - 0.2) - 0.05 : x - 0.05, S, alongX ? z - 0.05 : z + s * (d / 2 - 0.2) - 0.05, 0.1, 0.7, 0.1, timber);
      b.build(into, { cast: true, receive: true });
    })
  );
  // Benches: the park's and the railside walk's (facing ry: 0 is +z)
  const bench = (b: Batch, x: number, z: number, ry: number, y: number) => {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.42));
    seat.position.set(0, y + 0.45, 0);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 0.06));
    back.position.set(0, y + 0.72, -0.2);
    g.add(seat, back);
    for (const s of [-0.6, 0.6]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.36));
      leg.position.set(s, y + 0.22, 0);
      g.add(leg);
    }
    g.rotation.y = ry;
    g.position.set(x, 0, z);
    g.updateMatrixWorld(true);
    for (const m of g.children as THREE.Mesh[]) b.add(m.geometry.clone().applyMatrix4(m.matrixWorld), timber);
  };
  [...PARK_BENCHES.map(([x, z, ry]) => [x, z, ry, S] as const), ...RAIL_BENCHES.map(([x, z, ry]) => [x, z, ry, 0] as const)].forEach(([x, z, ry, y], i) =>
    site(`southfield bench ${i}`, [x - 1.5, z - 1.5, x + 1.5, z + 1.5], (into) => {
      const b = new Batch();
      b.detail(() => bench(b, x, z, ry, y));
      b.build(into, { cast: true, receive: true });
    })
  );
  // The park's name board at its way in from the ring avenue
  site('southfield park board', [PARK_LOT[0] - 1, 206, PARK_LOT[0] + 3, 214], (into) => {
    const b = new Batch();
    const [x, z] = [PARK_LOT[0] + 0.6, 213];
    for (const dz of [-1.3, 1.3]) b.box(x - 0.06, S, z + dz - 0.06, 0.12, 1.5, 0.12, timber);
    b.box(x - 0.05, S + 1.05, z - 1.45, 0.1, 0.6, 2.9, timber);
    sign(b, 4, x - 0.06, S + 1.35, z, [-1, 0], 2.6, 0.42);
    b.build(into, { cast: true, receive: true });
  });

  /* ---------- The allotments ---------- */
  // A site a stretch of each strip: the path down its middle, its plots (dug soil, edging, the crops' rows near only, a shed on some)
  const stripPlots = (strip: Rect) => PLOTS.filter((p) => p.rect[0] >= strip[0] - 0.1 && p.rect[2] <= strip[2] + 0.1);
  for (const [name, strip] of [
    ['mid', STRIPS.mid],
    ['east', STRIPS.east],
  ] as const) {
    const plots = stripPlots(strip);
    if (!plots.length) continue;
    const z0 = Math.min(...plots.map((p) => p.rect[1]));
    const z1 = Math.max(...plots.map((p) => p.rect[3]));
    const mid = (strip[0] + strip[2]) / 2;
    for (let za = z0; za < z1; za += PIECE) {
      const zb = Math.min(z1, za + PIECE);
      site(`southfield allotments ${name} ${za}`, [strip[0], za - 0.5, strip[2], zb + 0.5], (into) => {
        const b = new Batch();
        b.box(mid - PATH_W / 2, S, za, PATH_W, 0.008, zb - za, gravel);
        for (const p of plots) {
          if (p.rect[1] < za - 0.01 || p.rect[1] >= zb - 0.01) continue;
          const [x0, pz0, x1, pz1] = p.rect;
          b.box(x0, S, pz0, x1 - x0, 0.012, pz1 - pz0, p.seed % 5 === 0 ? bare : dirt);
          // (edging boards round it)
          for (const r of [
            [x0, pz0, x1, pz0 + 0.08],
            [x0, pz1 - 0.08, x1, pz1],
            [x0, pz0, x0 + 0.08, pz1],
            [x1 - 0.08, pz0, x1, pz1],
          ] as Rect[])
            rbox(b, r, S, 0.12, timber);
          b.detail(() => {
            // Rows of crops across it, the odd one gone over (phones every third row)
            const rows = Math.floor((pz1 - pz0 - 1) / 0.8);
            for (let k = 0; k < rows; k++) {
              if ((p.seed + k) % 4 === 3 || (low && k % 3)) continue;
              const z = pz0 + 0.7 + k * 0.8;
              b.box(x0 + 0.5, S + 0.012, z - 0.14, x1 - x0 - 1, 0.18, 0.28, (p.seed + k) % 3 ? crop : leafy);
            }
            // Canes for the beans on some (not on phones)
            if (!low && p.seed % 3 === 1) for (let k = 0; k < 5; k++) b.add(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 3).translate(x0 + 0.8 + k * 0.6, S + 0.7, pz1 - 0.6), timber);
          });
          if (p.shed) {
            const r = shedOf(p);
            rbox(b, r, S, SHED_H, p.seed % 2 ? shedGreen : shedBlue);
            rbox(b, grow(r, 0.08), S + SHED_H, 0.08, roofGrey);
            // (a water butt by it)
            b.detail(() => b.add(new THREE.CylinderGeometry(0.28, 0.28, 0.8, 8).translate(p.face === 'e' ? r[2] + 0.4 : r[0] - 0.4, S + 0.4, r[1] + 0.35), steel));
          }
        }
        b.build(into, { cast: true, receive: true });
      });
    }
  }
  // The east strip's garden: its beds in rows, a path down the middle
  site('southfield east garden', grow(EAST_GARDEN, 0.5), (into) => {
    const b = new Batch();
    const mid = (EAST_GARDEN[0] + EAST_GARDEN[2]) / 2;
    b.box(mid - 0.8, S, EAST_GARDEN[1] + 12, 1.6, 0.008, EAST_GARDEN[3] - EAST_GARDEN[1] - 13, gravel);
    for (const [x, z, w, d] of EAST_BEDS) {
      b.box(x, S, z, w, 0.35, d, timber);
      b.box(x + 0.08, S + 0.35, z + 0.08, w - 0.16, 0.01, d - 0.16, dirt);
      b.detail(() => {
        for (let k = 0; k < 5; k++) b.add(new THREE.DodecahedronGeometry(0.22, 0).translate(x + 0.4 + k * ((w - 0.8) / 4), S + 0.52, z + d / 2), k % 2 ? leafy : crop);
      });
    }
    b.build(into, { cast: true, receive: true });
  });

  /* ---------- The walks ---------- */
  // Gravel on the open land (a hair over the ground), shrubs along their far side, near only
  for (const [name, pts] of [
    ['rail', RAIL_WALK],
    ['strip', STRIP_WALK],
  ] as const)
    for (let i = 1; i < pts.length; i++)
      cut(pts[i - 1], pts[i]).forEach((seg, k) =>
        site(`southfield walk ${name} ${i} ${k}`, segBox(seg, 3), (into) => {
          const b = new Batch();
          const [a, c] = seg;
          const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
          const [ux, uz] = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
          // (across the small streets the walk is the road's: skip the stretches over them)
          const onRoad = (x: number) => name === 'strip' && [17, 43].some((rx) => Math.abs(x - rx) < HALF + 0.2);
          const parts: [number, number][] = [];
          let from = -1;
          for (let d = 0; d <= len + 1e-6; d += 0.5) {
            const x = a[0] + ux * d;
            if (!onRoad(x) && from < 0) from = d;
            if ((onRoad(x) || d + 0.5 > len + 1e-6) && from >= 0) {
              parts.push([from, onRoad(x) ? d - 0.5 : len]);
              from = -1;
            }
          }
          for (const [d0, d1] of parts)
            if (d1 - d0 > 0.2) b.add(ribbon([[a[0] + ux * d0, a[1] + uz * d0], [a[0] + ux * d1, a[1] + uz * d1]], -WALK_PATH_W / 2, WALK_PATH_W / 2, 0.014), gravel);
          b.detail(() => {
            for (let d = 2; d < len; d += 3.3) {
              const side = name === 'rail' ? 1.9 : -1.6;
              const [x, z] = [a[0] + ux * d - uz * side, a[1] + uz * d + ux * side];
              if (onRoad(x)) continue;
              b.add(new THREE.DodecahedronGeometry(0.42 + ((d * 7) % 3) * 0.08, 0).scale(1, 0.75, 1).translate(x, 0.3, z), shrub);
            }
          });
          b.build(into, { cast: false, receive: true });
        })
      );

  /* ---------- Parked: the buses, the trucks, the van (the main thread's) ---------- */
  if (scene) parkedCars(scene, S, SF_CARS);
}
