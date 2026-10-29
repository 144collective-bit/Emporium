/*
 * The Docks drawn (docs/docks-plan.md Phase 1; the data is docks.ts), a district loaded as you approach (districts.ts
 * `LAZY_DISTRICTS`), as sites (tilework.ts): the streets (asphalt, a dashed yellow centre line, zebras on every arm of
 * the lit junctions at the avenue), the avenue's bridge over the basin's mouth (railings on both sides), and the quays'
 * dressing (a pale stone coping along the water's edge, and near only, mooring bollards and ladders down the walls).
 * Worn, like The Trenches: a working port. The basin's water, its walls, the bridge's deck and the blocks are the
 * boot's (world.ts), its lamps too (index.ts, `DOCK_LAMPS`).
 */
import * as THREE from 'three';
import { Batch, neon, toon } from './kit';
import { site } from './tilework';
import { offsetLine, type Pt } from './streetplan';
import { EW_ROADS, MEDIAN, SOUTH_ROAD } from './layout';
import { SLAB } from './world';
import { WATER_Y } from './river';
import { AVENUE_KERB, BASIN, CAISSON, CHANNEL, DOCK_BRIDGE, DOCK_CROSSINGS, DOCK_STREETS, DRY_DOCK, HALF, type Rect } from './docks';
import { register as registerPort } from './docksport3d';

export const SELF = import.meta.url;

/** The streets' asphalt, level with the city's other district streets */
const Y = 0.031;
/** Pieces of road no longer than this (a site each: nothing much longer than a tile, tileBatch()) */
const PIECE = 24;
const unit = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const AVENUE = EW_ROADS.find((r) => r.c === SOUTH_ROAD)!;

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
const boxOf = ([a, b]: [Pt, Pt], pad: number): Rect => [Math.min(a[0], b[0]) - pad, Math.min(a[1], b[1]) - pad, Math.max(a[0], b[0]) + pad, Math.max(a[1], b[1]) + pad];

export function register({ low, scene }: { low: boolean; scene: THREE.Scene | null }) {
  const asphalt = toon('#2a2838');
  const yellow = neon('#f5d76e', 0.9, 1.1);
  const zebra = toon('#e8e4f8');
  const coping = toon('#9a96a8');
  const iron = toon('#2b2a33');
  const rust = toon('#7a4a34');
  const rail = toon('#c9c4e6');

  /** Junctions on the docks' streets: no centre line through them */
  const junctions: Pt[] = DOCK_CROSSINGS.map((c) => c.at);
  const inJunction = (x: number, z: number) => junctions.some(([jx, jz]) => Math.abs(x - jx) < HALF + 1 && Math.abs(z - jz) < (jz === SOUTH_ROAD ? AVENUE.half : HALF) + 1);

  /* ---------- The streets ---------- */
  for (const s of DOCK_STREETS) {
    // (the ring from the avenue's south kerb: the avenue's own asphalt is the junction)
    const pts = s.pts.map((p): Pt => (p[1] === SOUTH_ROAD ? [p[0], AVENUE_KERB] : p));
    for (let i = 1; i < pts.length; i++)
      cut(pts[i - 1], pts[i]).forEach((seg, k) =>
        site(`docks street ${s.id} ${i} ${k}`, boxOf(seg, s.half + 0.5), (into) => {
          const b = new Batch();
          // (the corners filled: each piece carried on past its ends by the street's half where it turns)
          const [a, c] = seg;
          const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
          const [ux, uz] = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
          const atCorner = (p: Pt) => s.pts.slice(1, -1).some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-6);
          const a2: Pt = atCorner(a) ? [a[0] - ux * s.half, a[1] - uz * s.half] : a;
          const c2: Pt = atCorner(c) ? [c[0] + ux * s.half, c[1] + uz * s.half] : c;
          b.add(ribbon([a2, c2], -s.half, s.half, Y), asphalt);
          // A dashed yellow centre line, clear of the junctions and the corners
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

  // Zebras on every arm of the lit junctions at the avenue: across the ring's end and the avenue either side of it
  for (const c of DOCK_CROSSINGS) {
    if (!c.lights) continue;
    const zs: THREE.Matrix4[] = [];
    const stripe = (x: number, z: number, w: number, d: number) => zs.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0.04, z), new THREE.Quaternion(), new THREE.Vector3(w, 1, d)));
    const z = AVENUE_KERB + 0.75;
    for (let w = -HALF + 0.16; w < HALF - 0.1; w += 0.32) stripe(c.at[0] + w, z, 0.17, 0.55);
    for (const dir of [-1, 1]) {
      const x = c.at[0] + dir * (HALF + 0.75);
      for (let w = -AVENUE.half + 0.16; w < AVENUE.half - 0.1; w += 0.32) if (Math.abs(w) > MEDIAN / 2 + 0.1) stripe(x, c.at[1] + w, 0.55, 0.17);
    }
    const r = 9;
    site(`docks crossing ${c.id}`, [c.at[0] - r, c.at[1] - r, c.at[0] + r, c.at[1] + r], (into) => {
      const b = new Batch();
      b.instances(unit, zebra, zs);
      b.build(into, { cast: false, receive: true });
    });
  }

  /* ---------- The bridge over the mouth ---------- */
  const [dx0, dz0, dx1, dz1] = DOCK_BRIDGE;
  site('docks bridge', [dx0 - 1, dz0 - 1, dx1 + 1, dz1 + 1], (into) => {
    const b = new Batch();
    // Railings along both sides: on the river's coping (north) and the bridge's sidewalk (south), over the water
    for (const [z, y] of [
      [dz0 + 0.12, 0.12],
      [dz1 - 0.06, SLAB],
    ] as const) {
      b.box(dx0, y + 0.42, z - 0.05, dx1 - dx0, 0.06, 0.1, rail);
      b.box(dx0, y + 0.18, z - 0.04, dx1 - dx0, 0.05, 0.08, rail);
      for (let x = dx0 + 0.05; x <= dx1 - 0.05; x += 0.9) b.box(x - 0.04, y, z - 0.04, 0.08, 0.42, 0.08, rail);
    }
    b.build(into, { cast: true, receive: true });
  });

  /* ---------- The quays: coping, bollards and ladders ---------- */
  // The edges along the water (x0, z0, x1, z1: a line), with the way out to the water from each
  const [bx0, bz0, bx1, bz1] = BASIN;
  const [cx0, , cx1] = CHANNEL;
  // (the east wall broken by the dry dock's caisson; the dry dock's own edges take the coping, its railing is the port's)
  const [, ddz0, ddx1, ddz1] = DRY_DOCK;
  const pitX = bx1 + CAISSON;
  const edges: { a: Pt; b: Pt; out: Pt; pit?: true }[] = [
    { a: [cx0, dz1], b: [cx0, bz0], out: [1, 0] },
    { a: [cx1, dz1], b: [cx1, bz0], out: [-1, 0] },
    { a: [bx0, bz0], b: [cx0, bz0], out: [0, 1] },
    { a: [cx1, bz0], b: [bx1, bz0], out: [0, 1] },
    { a: [bx0, bz0], b: [bx0, bz1], out: [1, 0] },
    { a: [bx1, bz0], b: [bx1, ddz0], out: [-1, 0] },
    { a: [bx1, ddz1], b: [bx1, bz1], out: [-1, 0] },
    { a: [bx0, bz1], b: [bx1, bz1], out: [0, -1] },
    { a: [pitX, ddz0], b: [ddx1, ddz0], out: [0, 1], pit: true },
    { a: [pitX, ddz1], b: [ddx1, ddz1], out: [0, -1], pit: true },
    { a: [ddx1, ddz0], b: [ddx1, ddz1], out: [-1, 0], pit: true },
  ];
  const COPE = 0.35;
  edges.forEach((e, i) =>
    cut(e.a, e.b).forEach((seg, k) =>
      site(`docks quay ${i} ${k}`, boxOf(seg, 1.5), (into) => {
        const b = new Batch();
        const [a, c] = seg;
        // (the coping on the quay's edge, a hair over the sidewalk's ring, laid in from the water)
        const [x0, x1] = [Math.min(a[0], c[0]) - (e.out[0] > 0 ? COPE : 0), Math.max(a[0], c[0]) + (e.out[0] < 0 ? COPE : 0)];
        const [z0, z1] = [Math.min(a[1], c[1]) - (e.out[1] > 0 ? COPE : 0), Math.max(a[1], c[1]) + (e.out[1] < 0 ? COPE : 0)];
        b.box(x0, SLAB + 0.002, z0, Math.max(x1 - x0, COPE), 0.008, Math.max(z1 - z0, COPE), coping);
        if (!e.pit)
          b.detail(() => {
          const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
          const [ux, uz] = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
          // Mooring bollards every 8 along the edge, a little back from it
          for (let d = 4; d < len - 1; d += 8) {
            const [x, z] = [a[0] + ux * d - e.out[0] * 0.55, a[1] + uz * d - e.out[1] * 0.55];
            b.add(new THREE.CylinderGeometry(0.14, 0.17, 0.32, low ? 6 : 10).translate(x, SLAB + 0.16, z), iron);
            b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.06, low ? 6 : 10).translate(x, SLAB + 0.35, z), iron);
          }
          // An iron ladder down the wall into the water every 24, between the bollards: two stiles and the rungs
          // across them, against the wall
          if (!low)
            for (let d = 12; d < len - 1; d += 24) {
              const [x, z] = [a[0] + ux * d + e.out[0] * 0.04, a[1] + uz * d + e.out[1] * 0.04];
              const [px, pz] = [ux * 0.22, uz * 0.22];
              for (const s of [-1, 1]) b.box(x + px * s - 0.03, WATER_Y - 0.3, z + pz * s - 0.03, 0.06, SLAB + 0.5 - (WATER_Y - 0.3), 0.06, rust);
              const [w, dd] = [Math.abs(px) * 2 + 0.05, Math.abs(pz) * 2 + 0.05];
              for (let y = WATER_Y - 0.1; y < SLAB; y += 0.3) b.box(x - w / 2, y, z - dd / 2, w, 0.04, dd, rust);
            }
        });
        b.build(into, { cast: true, receive: true });
      })
    )
  );

  /* ---------- The port (Phase 3): docksport3d.ts ---------- */
  registerPort({ low, scene });
}
