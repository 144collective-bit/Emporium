/*
 * Crestmont's planting and the hill roads' walls drawn (docs/crestmont-plan.md Phase 3; the data is landscape.ts),
 * from crestmont3d.ts's `register()`, a site a tile: palms (a fan palm's tall bending trunk, its skirt of dead
 * fronds and a small crown; a date palm's thick trunk, the crown's knob and long arching fronds; the crowns
 * swaying in the wind, dusk.ts `SWAY`), jacarandas in bloom, live oaks and chaparral scrub on the hills, and the
 * hill roads' stone retaining walls with their caps and white post-and-rail guards. Phones leave out half the
 * scrub, fewer fronds to a crown and the rails' posts.
 */
import * as THREE from 'three';
import { Batch, toon } from './kit';
import { site } from './tilework';
import { TILE } from './tiles';
import { SWAY } from './dusk';
import { JACARANDAS, OAKS, PALMS, SCRUB, WALLS, type Edge, type Palm, type Plant } from './landscape';

const UP = new THREE.Vector3(0, 1, 0);

/** How far each of a fan palm's trunk bends lean its top over (tiles, at a trunk's full size) */
const BENDS = [0, 0.55, 1.05];

/** A trunk a unit high, its foot at the origin, bending over towards +x by `lean` at its top */
function trunk(r0: number, r1: number, lean: number, sides: number) {
  const g = new THREE.CylinderGeometry(r1, r0, 1, sides, 6, true).translate(0, 0.5, 0);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i);
    pos.setX(i, pos.getX(i) + lean * t * t);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * A crown of `n` fronds radiating from the origin, each `len` long and `w` wide, rising and then drooping by `droop`
 * (both faces wound, so a frond seen from under shows)
 */
function crown(n: number, len: number, w: number, rise: number, droop: number, tilt = 0) {
  const pos: number[] = [];
  const SEG = 4;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + (k % 2) * 0.2;
    const [ca, sa] = [Math.cos(a), Math.sin(a)];
    // (every other frond a little higher, so the crown isn't one flat ring)
    const up = (k % 2 ? 0.12 : 0) + tilt * Math.sin(a * 3);
    const at = (t: number, side: number): number[] => {
      const r = len * t;
      const half = w * Math.sin(Math.PI * Math.min(1, t * 1.15)) * 0.5;
      const y = up + rise * t - droop * t * t;
      return [ca * r - sa * half * side, y, sa * r + ca * half * side];
    };
    for (let s = 0; s < SEG; s++) {
      const [t0, t1] = [s / SEG, (s + 1) / SEG];
      const [a0, b0, a1, b1] = [at(t0, -1), at(t0, 1), at(t1, -1), at(t1, 1)];
      for (const tri of [
        [a0, b0, b1],
        [a0, b1, a1],
      ]) {
        pos.push(...tri[0], ...tri[1], ...tri[2]);
        pos.push(...tri[0], ...tri[2], ...tri[1]);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * A slab along a line from `a` to `b`, `t` thick across it, its bottom and top at each end's own height (a wall or
 * its cap following a road's grade): its two long faces, its top and its ends
 */
function prism(a: [number, number], b: [number, number], ya0: number, yb0: number, ya1: number, yb1: number, t: number) {
  const [dx, dz] = [b[0] - a[0], b[1] - a[1]];
  const l = Math.hypot(dx, dz) || 1;
  const [nx, nz] = [(-dz / l) * (t / 2), (dx / l) * (t / 2)];
  // The eight corners: a or b, near or far side, bottom or top
  const c = (end: 0 | 1, side: -1 | 1, top: 0 | 1): number[] => {
    const p = end ? b : a;
    const y = top ? (end ? yb1 : ya1) : end ? yb0 : ya0;
    return [p[0] + nx * side, y, p[1] + nz * side];
  };
  const quads: number[][][] = [
    [c(0, 1, 0), c(1, 1, 0), c(1, 1, 1), c(0, 1, 1)],
    [c(1, -1, 0), c(0, -1, 0), c(0, -1, 1), c(1, -1, 1)],
    [c(0, 1, 1), c(1, 1, 1), c(1, -1, 1), c(0, -1, 1)],
    [c(0, -1, 0), c(0, 1, 0), c(0, 1, 1), c(0, -1, 1)],
    [c(1, 1, 0), c(1, -1, 0), c(1, -1, 1), c(1, 1, 1)],
  ];
  const pos: number[] = [];
  // (both windings: which way a side faces depends on the road's way round, and nobody sees inside)
  for (const [p, q, r, s] of quads) pos.push(...p, ...q, ...r, ...p, ...r, ...s, ...p, ...r, ...q, ...p, ...s, ...r);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** What stands in one tile */
interface TileShare {
  palms: Palm[];
  jacarandas: { x: number; z: number; s: number }[];
  oaks: Plant[];
  scrub: Plant[];
  edges: Edge[];
}
/** Everything by the tile it stands in (an edge by its middle) */
function byTile(low: boolean) {
  const tiles = new Map<string, TileShare>();
  const at = (x: number, z: number) => {
    const key = `${Math.floor(x / TILE)},${Math.floor(z / TILE)}`;
    let t = tiles.get(key);
    if (!t) tiles.set(key, (t = { palms: [], jacarandas: [], oaks: [], scrub: [], edges: [] }));
    return t;
  };
  for (const p of PALMS) at(p.x, p.z).palms.push(p);
  for (const j of JACARANDAS) at(j.x, j.z).jacarandas.push(j);
  for (const o of OAKS) at(o.x, o.z).oaks.push(o);
  SCRUB.forEach((p, i) => (!low || i % 2 === 0) && at(p.x, p.z).scrub.push(p));
  for (const e of WALLS) at((e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2).edges.push(e);
  return tiles;
}

export function registerLandscape(low: boolean) {
  const fanTrunks = BENDS.map((l) => trunk(0.19, 0.13, l, low ? 5 : 7));
  const dateTrunk = trunk(0.42, 0.33, 0, low ? 6 : 8);
  const skirt = new THREE.ConeGeometry(0.4, 1, low ? 6 : 8, 1, true).translate(0, -0.5, 0);
  const fanCrown = crown(low ? 9 : 14, 1.05, 0.34, 0.45, 0.85, 0.05);
  const dateCrown = crown(low ? 11 : 18, 2.2, 0.42, 0.9, 1.7, 0.08);
  const knob = new THREE.IcosahedronGeometry(0.36, 0).scale(1, 1.2, 1);
  const ball = new THREE.IcosahedronGeometry(0.42, low ? 0 : 1);
  const bush = new THREE.DodecahedronGeometry(0.42, 0);
  const stick = new THREE.CylinderGeometry(0.06, 0.09, 1, low ? 4 : 5, 1, true).translate(0, 0.5, 0);
  const block = new THREE.BoxGeometry(1, 1, 1);

  const paint = {
    fanTrunk: toon('#8f7458'),
    dateTrunk: toon('#7a5c3c'),
    skirt: toon('#a3845a'),
    frond: [toon('#3d9a4c'), toon('#4aa95a')],
    dateFrond: toon('#3a8f45'),
    knob: toon('#9a7a48'),
    jacaranda: [toon('#9b7ddb'), toon('#b294ea')],
    bark: toon('#5f4630'),
    oak: [toon('#4d6b38'), toon('#57703c'), toon('#46613a')],
    scrub: [toon('#6f7d45'), toon('#7e8751'), toon('#877b4f')],
    stone: toon('#b9ab8f'),
    cap: toon('#d3c8b0'),
    rail: toon('#dcd8cf'),
  };

  const tiles = byTile(low);
  const m = (x: number, y: number, z: number, yaw: number, sx: number, sy = sx, sz = sx) =>
    new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, yaw), new THREE.Vector3(sx, sy, sz));

  for (const [key, rec] of tiles) {
    const [i, j] = key.split(',').map(Number);
    site(`crestmont landscape ${key}`, [i * TILE, j * TILE, (i + 1) * TILE, (j + 1) * TILE], (into) => {
      const b = new Batch();
      // The palms: trunks, the fan palms' skirts, the crowns at the tops of their bends
      const palms = rec.palms;
      const trunks: THREE.Matrix4[][] = BENDS.map(() => []);
      const dates: THREE.Matrix4[] = [];
      const skirts: THREE.Matrix4[] = [];
      const crowns: THREE.Matrix4[][] = [[], []];
      const dateCrowns: THREE.Matrix4[] = [];
      const knobs: THREE.Matrix4[] = [];
      for (const [k, p] of palms.entries()) {
        if (p.kind === 'fan') {
          trunks[p.bend].push(m(p.x, p.y - 0.05, p.z, p.turn, p.s, p.h + 0.05, p.s));
          // (the top of its bend, turned its way: +x turned by `turn` about y)
          const lean = BENDS[p.bend] * p.s;
          const [tx, tz] = [p.x + Math.cos(p.turn) * lean, p.z - Math.sin(p.turn) * lean];
          skirts.push(m(tx, p.y + p.h, tz, p.turn, p.s, 1.25 * p.s, p.s));
          crowns[k % 2].push(m(tx, p.y + p.h, tz, p.turn, p.s));
        } else {
          dates.push(m(p.x, p.y - 0.05, p.z, p.turn, p.s, p.h + 0.05, p.s));
          knobs.push(m(p.x, p.y + p.h + 0.1, p.z, p.turn, p.s));
          dateCrowns.push(m(p.x, p.y + p.h + 0.25, p.z, p.turn, p.s));
        }
      }
      fanTrunks.forEach((g, k) => b.instances(g, paint.fanTrunk, trunks[k]));
      b.instances(dateTrunk, paint.dateTrunk, dates);
      b.instances(skirt, paint.skirt, skirts);
      crowns.forEach((list, k) => b.instances(fanCrown, paint.frond[k], list, low ? 0 : SWAY));
      b.instances(knob, paint.knob, knobs);
      b.instances(dateCrown, paint.dateFrond, dateCrowns, low ? 0 : SWAY);

      // Jacarandas: a trunk and a broad purple canopy
      const jac = rec.jacarandas;
      b.instances(stick, paint.bark, jac.map((t) => m(t.x, 0.1, t.z, 0, t.s * 1.5, 1.5 * t.s, t.s * 1.5)));
      paint.jacaranda.forEach((mat, k) =>
        b.instances(ball, mat, jac.filter((_, n) => n % 2 === k).map((t) => m(t.x, 0.1 + 1.95 * t.s, t.z, t.x * 0.7, 2.7 * t.s, 1.5 * t.s, 2.7 * t.s)), low ? 0 : SWAY)
      );

      // Live oaks: a stout trunk and two broad lumps of canopy, the second off to one side
      const oaks = rec.oaks;
      b.instances(stick, paint.bark, oaks.map((o) => m(o.x, o.y - 0.05, o.z, 0, o.s * 2.2, 1.1 * o.s, o.s * 2.2)));
      paint.oak.forEach((mat, k) => {
        const mine = oaks.filter((o) => o.tone === k);
        b.instances(ball, mat, mine.map((o) => m(o.x, o.y + 1.35 * o.s, o.z, o.x, 2.9 * o.s, 1.35 * o.s, 2.6 * o.s)), low ? 0 : SWAY * 0.5);
        b.instances(
          ball,
          mat,
          mine.map((o) => m(o.x + Math.cos(o.z) * 0.8 * o.s, o.y + 1.15 * o.s, o.z + Math.sin(o.z) * 0.8 * o.s, o.z, 2.1 * o.s, 1.1 * o.s, 2 * o.s)),
          low ? 0 : SWAY * 0.5
        );
      });

      // Scrub: low lumps on the slopes (near only on phones)
      if (low) b.lod = 'near';
      const scrub = rec.scrub;
      paint.scrub.forEach((mat, k) =>
        b.instances(bush, mat, scrub.filter((p) => p.tone === k).map((p) => m(p.x, p.y + 0.12 * p.s, p.z, p.x * 1.3, 1.4 * p.s, 0.85 * p.s, 1.3 * p.s)))
      );
      b.lod = 'all';

      // The hill roads' edges: stone walls with a cap where they're cut in; a white rail on posts where built up
      const edges = rec.edges;
      const rails: THREE.Matrix4[] = [];
      const posts: THREE.Matrix4[] = [];
      for (const e of edges) {
        const [dx, dz] = [e.b[0] - e.a[0], e.b[1] - e.a[1]];
        const len = Math.hypot(dx, dz) + 0.06;
        const yaw = Math.atan2(-dz, dx);
        const [cx, cz] = [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2];
        const y = (e.ya + e.yb) / 2;
        if (e.kind === 'wall') {
          // Along the road's grade, its top eased from piece to piece, its foot a little under the bed; the cap over it
          b.add(prism(e.a, e.b, e.ya - 0.15, e.yb - 0.15, e.ya + e.ha, e.yb + e.hb, 0.34), paint.stone);
          b.add(prism(e.a, e.b, e.ya + e.ha - 0.02, e.yb + e.hb - 0.02, e.ya + e.ha + 0.08, e.yb + e.hb + 0.08, 0.46), paint.cap);
        } else {
          rails.push(m(cx, y + 0.62, cz, yaw, len, 0.1, 0.07));
          if (!low) posts.push(m(e.a[0], y + 0.3, e.a[1], yaw, 0.1, 0.75, 0.1));
        }
      }
      b.instances(block, paint.rail, rails);
      b.instances(block, paint.rail, posts);
      b.build(into);
    });
  }
}
