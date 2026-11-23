/*
 * Westlake Park on screen, step 1 (docs/growth-plan.md Phase 9b; the
 * numbers are westlake.ts). A chunk of its own, loaded as you approach
 * (districts.ts); the site worker loads it too (sitework.ts). Its blocks'
 * slabs and lawns are the street plan's (world.ts), its trees and lamps are
 * placed from its data at the boot with the town's (index.ts); this draws
 * the rest as sites (tilework.ts):
 *
 * - the paths, pale gravel laid on the lawn, a site for every stretch;
 * - the lake's stone rim, in quarters, and its water (on the main thread:
 *   one mesh with the river's shader, not a site);
 * - the gates: two stone piers with caps and lanterns, and over the Mall's
 *   north gate, iron posts and a beam carrying the park's name both ways;
 * - benches round the lake and along the Mall (near only);
 * - the rock outcrops (docs/westlake-plan.md Phase 1): layered grey stone, a site a tile, lichen near only.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, lit, neon, siteMat, toon } from './kit';
import { SLAB, flatPoly, waterMat, type Tick } from './world';
import { registerParkLife, registerParkSites } from './parklife3d';
import { register as registerGrounds } from './stadiumgrounds3d';
import { site } from './tilework';
import { PATH_Y, PAVE_Y, bench, registerGardens } from './gardens3d';
import { isMain } from './gardens';
import { offsetLine } from './streetplan';
import { BED_Y, BENCHES, LAKE_HOLE, LOOP_OUT, OVERLOOK, OVERLOOK_RAIL, lakeDist, onGrand, GATES, GATE_PIERS, PATHS, PIER, RIM, ROCKS, WATER_Y, lakeLine, onBridge, type ParkPath, type Pt, type Rock } from './westlake';
import { TILE, tileOf } from './tiles';
import { registerFringes } from './fringes3d';
import { registerBridges } from './parkbridges3d';
import { registerGrandTerrace } from './grandterrace3d';
import { registerParkTrees } from './parktrees3d';
import { registerStands, registerStandsLife } from './parkstands3d';
import { registerCivic } from './civic3d';
import { BANK, ORNATE, OUTCROP, PLANT, STONE as PAL_STONE } from './palette';

/** Its own address, for the site worker (sitework.ts) */
export const SELF = import.meta.url;

const GRAVEL = toon(PAL_STONE.gravel);
const STONE = toon(PAL_STONE.kerb);
const CAP = toon(PAL_STONE.cap);
const IRON = toon('#1b1830');
/** The main walks' paving (the gravel paths' is GRAVEL) */
const PAVING = toon(PAL_STONE.paving);
/** The lake's embankment: rough-cut stone down to its bed (Phase 3b) */
const EMBANKMENT = toon(ORNATE.rough);
/** The ornate stone (Phase 3c): the gates' piers, the overlook */
const ORN = toon(ORNATE.stone);
const ORN_DRESSED = toon(ORNATE.dressed);
const URN_STONE = toon(ORNATE.urn);
const FOLIAGE = toon(PLANT.shrub);
const BLOOMS = [toon('#d0567a'), toon('#e0b23a'), toon('#e8e0d0')];

/** A box from p to q along the ground (its length theirs), w wide, from y0 to y1 */
function along(p: Pt, q: Pt, w: number, y0: number, y1: number) {
  const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
  return new THREE.BoxGeometry(l + 0.02, y1 - y0, w).rotateY(-Math.atan2(q[1] - p[1], q[0] - p[0])).translate((p[0] + q[0]) / 2, (y0 + y1) / 2, (p[1] + q[1]) / 2);
}
/** An urn of flowers standing at x, y, z */
function urn(b: Batch, x: number, y: number, z: number, k: number) {
  b.add(new THREE.LatheGeometry([new THREE.Vector2(0.1, 0), new THREE.Vector2(0.17, 0.05), new THREE.Vector2(0.11, 0.17), new THREE.Vector2(0.24, 0.4), new THREE.Vector2(0.26, 0.46)], 10).translate(x, y, z), URN_STONE);
  b.add(new THREE.SphereGeometry(0.24, 7, 5).scale(1, 0.6, 1).translate(x, y + 0.5, z), FOLIAGE);
  b.detail(() => {
    for (let j = 0; j < 5; j++) {
      const a = (j / 5) * Math.PI * 2 + k;
      b.add(new THREE.SphereGeometry(0.06, 5, 4).translate(x + Math.cos(a) * 0.15, y + 0.6, z + Math.sin(a) * 0.15), BLOOMS[(j + k) % 3]);
    }
  });
}
const ROCK_FACE = toon(OUTCROP.face);
const ROCK_DARK = toon(OUTCROP.dark);
const ROCK_TOP = toon(OUTCROP.top);
const LICHEN = toon(OUTCROP.lichen);

/**
 * A rock outcrop: two or three slabs of stone stacked and staggered, each a flattened many-faced stone turned its own
 * way, the top one lighter (the layered grey of the park's knolls), and on the near side a few patches of lichen
 */
function rock(b: Batch, k: Rock, low: boolean) {
  let s = k.seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const layers = k.h > 0.9 ? 3 : 2;
  let y = 0;
  let [ox, oz] = [0, 0];
  for (let i = 0; i < layers; i++) {
    const t = 1 - (i / layers) * 0.45;
    const th = (k.h / layers) * (1.1 + r() * 0.3);
    const g = new THREE.DodecahedronGeometry(1, 0)
      .scale(k.r * t * (0.95 + r() * 0.2), th * 0.75, k.r * t * (0.7 + r() * 0.2))
      .rotateY(k.ry + (r() - 0.5) * 0.6)
      .translate(k.x + ox, SLAB + y + th * 0.45, k.z + oz);
    b.add(g, i === layers - 1 ? ROCK_TOP : i % 2 ? ROCK_DARK : ROCK_FACE);
    y += th * 0.72;
    ox += (r() - 0.5) * k.r * 0.35;
    oz += (r() - 0.5) * k.r * 0.35;
  }
  if (low) return;
  b.detail(() => {
    for (let i = 0; i < 3; i++) {
      const a = r() * Math.PI * 2;
      const d = k.r * (0.2 + r() * 0.4);
      b.add(new THREE.SphereGeometry(0.14 + r() * 0.12, 6, 3).scale(1, 0.25, 1).translate(k.x + ox + Math.cos(a) * d, SLAB + y + 0.02, k.z + oz + Math.sin(a) * d), LICHEN);
    }
  });
}
/** The outcrops, a site a tile */
function registerRocks(low: boolean) {
  const byTile = new Map<string, Rock[]>();
  for (const k of ROCKS) {
    const key = tileOf(k.x, k.z).join(',');
    if (!byTile.has(key)) byTile.set(key, []);
    byTile.get(key)!.push(k);
  }
  for (const [key, list] of byTile) {
    const [i, j] = key.split(',').map(Number);
    site(`westlake rocks ${key}`, [i * TILE - 4, j * TILE - 4, (i + 1) * TILE + 4, (j + 1) * TILE + 4], (into) => {
      const b = new Batch();
      for (const k of list) rock(b, k, low);
      b.build(into, { cast: true, receive: true });
    });
  }
}

/** A flat ribbon along a polyline (closed if `loop`), `half` either side, at y, facing up */
function ribbon(pts: Pt[], half: number, y: number, loop = false) {
  // (a loop's ends mitred with each other: offset with a point either side, then trimmed)
  const line = loop ? [pts.at(-1)!, ...pts, pts[0], pts[1]] : pts;
  let L = offsetLine(line, -half);
  let R = offsetLine(line, half);
  if (loop) {
    L = L.slice(1, -1);
    R = R.slice(1, -1);
  }
  const pos: number[] = [];
  const tri = (p: Pt, q: Pt, t: Pt) => {
    const up = (q[1] - p[1]) * (t[0] - p[0]) - (q[0] - p[0]) * (t[1] - p[1]) > 0;
    for (const v of up ? [p, q, t] : [p, t, q]) pos.push(v[0], y, v[1]);
  };
  for (let i = 1; i < L.length; i++) {
    tri(L[i - 1], R[i - 1], R[i]);
    tri(L[i - 1], R[i], L[i]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  return g;
}

/**
 * An upright band along an open stretch of the lake's shore from y0 to y1, each quad facing the water (`towards`) or
 * away from it: by the way the shore is wound (`sg`, its signed area's sign), not by its middle, since the arm bends
 * round (docs/westlake-plan.md Phase 1)
 */
function band(line: Pt[], y0: number, y1: number, sg: number, towards: boolean) {
  const pos: number[] = [];
  for (let i = 1; i < line.length; i++) {
    const [p, q] = [line[i - 1], line[i]];
    const quad = [
      [p[0], y0, p[1]],
      [q[0], y0, q[1]],
      [q[0], y1, q[1]],
      [p[0], y1, p[1]],
    ];
    // Wound 0-1-2, 0-2-3 it faces (-ez, ex), which is away from the water when the shore is wound negatively; the
    // other way round if that's not the way it should face
    const faceOut = sg < 0;
    const order = faceOut !== towards ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
    for (const k of order) pos.push(...quad[k]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** A path cut into stretches of about `len`, each with the rectangle it covers */
function stretches(q: ParkPath, len = 30) {
  const pts = q.loop ? [...q.pts, q.pts[0]] : q.pts;
  const out: { pts: Pt[]; rect: [number, number, number, number] }[] = [];
  let cur: Pt[] = [pts[0]];
  let run = 0;
  for (let i = 1; i < pts.length; i++) {
    cur.push(pts[i]);
    run += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (run >= len || i === pts.length - 1) {
      const xs = cur.map((p) => p[0]);
      const zs = cur.map((p) => p[1]);
      out.push({ pts: cur, rect: [Math.min(...xs) - q.half, Math.min(...zs) - q.half, Math.max(...xs) + q.half, Math.max(...zs) + q.half] });
      cur = [pts[i]];
      run = 0;
    }
  }
  return out;
}

/** The park's name over the Mall's north gate: one small texture, both faces */
function nameSign() {
  const tex = canvasTex(512, 96, (c) => {
    c.fillStyle = '#16301f';
    c.fillRect(0, 0, 512, 96);
    c.strokeStyle = '#c9f2d6';
    c.lineWidth = 4;
    c.strokeRect(6, 6, 500, 84);
    c.fillStyle = '#f2fff6';
    c.font = `900 58px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('WESTLAKE PARK', 256, 52);
  });
  return siteMat('westlake-sign', lit(new THREE.MeshBasicMaterial({ map: tex, toneMapped: true }), 0.95, 1.15));
}

export function register({ low, scene, tick }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  // Step 3: the boathouse, the jetty, the courts and the picnics as sites; on the main thread, what moves
  registerParkSites();
  // The stadium's grounds north of the highway, loaded with the park (stadiumgrounds3d.ts)
  registerGrounds();
  if (scene && tick) registerParkLife(scene, tick, low);
  // The walks' kerbs and edges, the park's wall, the formal garden, the planters and the terraces (stage 3)
  registerGardens(low);
  // The bridges over the arm and the inlet (parkbridges3d.ts, docs/westlake-plan.md Phase 3a)
  registerBridges(low);
  // The grand terrace at the west lobe's tip (grandterrace3d.ts, Phase 3b)
  registerGrandTerrace(low);
  // The park's planting: its trees, shrub beds, reeds and lilies (parktrees3d.ts, Phase 5)
  registerParkTrees(low);
  // The bandstand and the Lakehouse Café (parkstands3d.ts, Phase 6)
  registerStands(low);
  // ...and the band some evenings, the café's diners and waiter by day, the woodland walk's people (Phase 7)
  if (scene && tick) registerStandsLife(scene, tick, low);
  // The rock outcrops on the knolls and at the point (docs/westlake-plan.md Phase 1)
  registerRocks(low);
  // The civic square at its south end (civic3d.ts, docs/civic-plan.md)
  registerCivic(scene, tick);
  // The slivers by the highway beside it (fringes3d.ts, docs/blend-plan.md Phase 5c)
  registerFringes(['west', 'north'], low);
  // The paths: a site a stretch (the loop's paving stopping at each bridge, whose deck carries it over the water)
  const runsOf = (q: ParkPath): ParkPath[] => {
    if (q.id !== 'loop') return [q];
    const out: ParkPath[] = [];
    let cur: Pt[] = [];
    const n = q.pts.length;
    const start = q.pts.findIndex((p) => onBridge(p[0], p[1], -0.2));
    for (let i = 1; i <= n; i++) {
      const p = q.pts[(start + i) % n];
      if (onBridge(p[0], p[1], 0.3)) {
        if (cur.length > 1) out.push({ ...q, pts: cur, loop: false });
        cur = [];
      } else cur.push(p);
    }
    if (cur.length > 1) out.push({ ...q, pts: cur, loop: false });
    return out;
  };
  for (const q of PATHS.flatMap(runsOf))
    stretches(q).forEach((s, k) =>
      site(`westlake path ${q.id} ${q.pts[0].map((v) => Math.round(v)).join(',')} ${k}`, s.rect, (into) => {
        const b = new Batch();
        // The main walks paved (their kerbs and the gravel paths' edges are gardens3d.ts's)
        if (isMain(q)) b.add(ribbon(s.pts, q.half, PAVE_Y), PAVING);
        else b.add(ribbon(s.pts, q.half, PATH_Y), GRAVEL);
        b.build(into, { cast: false, receive: true });
      })
    );

  // The lake's rim, a quarter a site: a flat stone top, a wall down to the water inside and to the lawn outside
  const inner = lakeLine(0, 360);
  const outer = lakeLine(RIM.w, 360);
  const top = SLAB + RIM.h;
  const n = inner.length;
  const sg = Math.sign(inner.reduce((s, p, i) => s + p[0] * inner[(i + 1) % n][1] - inner[(i + 1) % n][0] * p[1], 0));
  for (let k = 0; k < 4; k++) {
    const i0 = (k * n) / 4;
    const i1 = ((k + 1) * n) / 4;
    const ins = inner.slice(i0, i1 + 1).concat(i1 === n ? [inner[0]] : []);
    const outs = outer.slice(i0, i1 + 1).concat(i1 === n ? [outer[0]] : []);
    const xs = outs.map((p) => p[0]);
    const zs = outs.map((p) => p[1]);
    site(`westlake rim ${k}`, [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)], (into) => {
      const b = new Batch();
      const pos: number[] = [];
      // (none through the grand terrace's sunken plaza, whose own walls stand there: Phase 3b)
      const off = (i: number) => onGrand((ins[i][0] + ins[i - 1][0]) / 2, (ins[i][1] + ins[i - 1][1]) / 2, -0.4);
      const runs: [number, number][] = [];
      for (let i = 1; i < ins.length; i++) {
        if (off(i)) continue;
        const [a, c, d, e] = [ins[i - 1], ins[i], outs[i], outs[i - 1]];
        for (const v of [a, d, c, a, e, d]) pos.push(v[0], top, v[1]);
        if (runs.length && runs.at(-1)![1] === i - 1) runs.at(-1)![1] = i;
        else runs.push([i - 1, i]);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
      b.add(g, CAP);
      // The walls: the embankment down past the water to its bed inside (facing it; Phase 3b), down to the lawn outside
      for (const [r0, r1] of runs) {
        b.add(band(ins.slice(r0, r1 + 1), SLAB + BED_Y, top, sg, true), EMBANKMENT);
        b.add(band(outs.slice(r0, r1 + 1), SLAB, top, sg, false), STONE);
      }
      b.build(into, { cast: false, receive: true });
    });
  }

  // The gates: two piers each, the Mall's with its name over it
  const sign = nameSign();
  GATES.forEach((g, gi) => {
    const piers = GATE_PIERS.slice(gi * 2, gi * 2 + 2);
    // (the park's name over the Mall's north gate: its south gate went with the civic square, civic.ts)
    const main = g.id === 'gate-n';
    const xs = piers.flatMap((p) => [p[0], p[2]]);
    const zs = piers.flatMap((p) => [p[1], p[3]]);
    site(`westlake ${g.id}`, [Math.min(...xs) - 0.5, Math.min(...zs) - 0.5, Math.max(...xs) + 0.5, Math.max(...zs) + 0.5], (into) => {
      const b = new Batch();
      for (const [k, [x0, z0, x1, z1, h]] of piers.entries()) {
        // A carved pier (Phase 3c): a plinth, the shaft with a sunk panel on each face, a moulded cap, an urn of
        // flowers on it (a lantern on the Mall's, under its sign's posts), an iron lantern on a bracket off its side
        const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
        b.box(x0 - 0.08, SLAB, z0 - 0.08, x1 - x0 + 0.16, 0.25, z1 - z0 + 0.16, ORN_DRESSED);
        b.box(x0, SLAB + 0.25, z0, x1 - x0, h - SLAB - 0.25, z1 - z0, ORN);
        b.box(x0 + 0.1, SLAB + 0.5, z0 - 0.02, x1 - x0 - 0.2, h - SLAB - 0.85, z1 - z0 + 0.04, ORN_DRESSED);
        b.box(x0 - 0.02, SLAB + 0.5, z0 + 0.1, x1 - x0 + 0.04, h - SLAB - 0.85, z1 - z0 - 0.2, ORN_DRESSED);
        b.box(x0 - 0.08, h - 0.12, z0 - 0.08, x1 - x0 + 0.16, 0.12, z1 - z0 + 0.16, ORN_DRESSED);
        b.box(x0 - 0.12, h, z0 - 0.12, x1 - x0 + 0.24, 0.1, z1 - z0 + 0.24, ORN_DRESSED);
        if (!main) urn(b, cx, h + 0.1, cz, gi + k);
        b.detail(() => {
          if (main) {
            b.box(cx - 0.05, h + 0.1, cz - 0.05, 0.1, 0.12, 0.1, IRON);
            b.box(cx - 0.09, h + 0.22, cz - 0.09, 0.18, 0.22, 0.18, neon('#ffe2a0', 0.6, 2.4));
            b.box(cx - 0.12, h + 0.44, cz - 0.12, 0.24, 0.05, 0.24, IRON);
            return;
          }
          // (the bracket out over the walk, towards the gate's middle)
          const [ox, oz] = [g.at[0] - cx, g.at[1] - cz];
          const l = Math.hypot(ox, oz) || 1;
          const [lx, lz] = [cx + (ox / l) * ((x1 - x0) / 2 + 0.3), cz + (oz / l) * ((z1 - z0) / 2 + 0.3)];
          b.add(along([cx, cz], [lx, lz], 0.05, h - 0.45, h - 0.4), IRON);
          b.box(lx - 0.09, h - 0.7, lz - 0.09, 0.18, 0.26, 0.18, neon('#ffe2a0', 0.6, 2.4));
          b.box(lx - 0.12, h - 0.44, lz - 0.12, 0.24, 0.05, 0.24, IRON);
        });
      }
      if (main) {
        // Iron posts up from the piers' caps, a beam across, the name on a board under it facing out and in
        const [a, c] = piers.map((p) => [(p[0] + p[2]) / 2, (p[1] + p[3]) / 2] as Pt);
        const y0 = PIER.h + 0.1;
        const y1 = y0 + 1.9;
        for (const p of [a, c]) b.box(p[0] - 0.06, y0, p[1] - 0.06, 0.12, y1 - y0, 0.12, IRON);
        const across = g.out[0] === 0;
        const [lo, hi] = across ? [Math.min(a[0], c[0]), Math.max(a[0], c[0])] : [Math.min(a[1], c[1]), Math.max(a[1], c[1])];
        const mid = across ? a[1] : a[0];
        if (across) b.box(lo - 0.1, y1 - 0.12, mid - 0.07, hi - lo + 0.2, 0.12, 0.14, IRON);
        else b.box(mid - 0.07, y1 - 0.12, lo - 0.1, 0.14, 0.12, hi - lo + 0.2, IRON);
        // The board: 4.4 by 0.82, both faces (each a plane a hair off the other)
        const w = Math.min(hi - lo - 0.3, 4.6);
        const face = new THREE.PlaneGeometry(w, w * (96 / 512));
        const ry = Math.atan2(g.out[0], g.out[1]);
        const cx = across ? (lo + hi) / 2 : mid;
        const cz = across ? mid : (lo + hi) / 2;
        const cy = y1 - 0.12 - (w * (96 / 512)) / 2 - 0.04;
        b.add(face.clone().rotateY(ry).translate(cx + g.out[0] * 0.035, cy, cz + g.out[1] * 0.035), sign);
        b.add(face.clone().rotateY(ry + Math.PI).translate(cx - g.out[0] * 0.035, cy, cz - g.out[1] * 0.035), sign);
        if (across) b.box(cx - w / 2 - 0.04, cy - (w * 96) / 512 / 2 - 0.04, mid - 0.03, w + 0.08, (w * 96) / 512 + 0.08, 0.06, IRON);
        else b.box(mid - 0.03, cy - (w * 96) / 512 / 2 - 0.04, cz - w / 2 - 0.04, 0.06, (w * 96) / 512 + 0.08, w + 0.08, IRON);
      }
      b.build(into, { cast: true, receive: true });
    });
  });

  // The overlook at the rocky point (Phase 3c): its paving from the rim back to the loop, a balustrade along the
  // embankment's edge, a pier at each end with an urn
  {
    const { tip, reach } = OVERLOOK;
    site('westlake overlook', [tip[0] - reach - 6, tip[1] - reach - 6, tip[0] + reach + 6, tip[1] + reach + 6], (into) => {
      const b = new Batch();
      const near = (p: Pt) => Math.hypot(p[0] - tip[0], p[1] - tip[1]) < reach;
      // (the back edge out from the rim along its own normals, point for point: away from the water)
      const inner = lakeLine(RIM.w, 480);
      const w = LOOP_OUT - 1.15 - RIM.w;
      const outer = inner.map((p, i): Pt => {
        const [a, c] = [inner[(i + inner.length - 1) % inner.length], inner[(i + 1) % inner.length]];
        const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
        let [nx, nz] = [(c[1] - a[1]) / l, -(c[0] - a[0]) / l];
        if (lakeDist(p[0] + nx, p[1] + nz) < lakeDist(p[0], p[1])) [nx, nz] = [-nx, -nz];
        return [p[0] + nx * w, p[1] + nz * w];
      });
      const pos: number[] = [];
      for (let i = 1; i < inner.length; i++) {
        if (!near(inner[i]) || !near(inner[i - 1])) continue;
        const [a, c, d, e] = [inner[i - 1], inner[i], outer[i], outer[i - 1]];
        // (each triangle wound to face up)
        for (const [p, q, t] of [[a, c, d], [a, d, e]] as Pt[][]) {
          const up = (q[1] - p[1]) * (t[0] - p[0]) - (q[0] - p[0]) * (t[1] - p[1]) > 0;
          for (const v of up ? [p, q, t] : [p, t, q]) pos.push(v[0], SLAB + 0.012, v[1]);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
      b.add(g, PAVING);
      const R = OVERLOOK_RAIL;
      for (let i = 1; i < R.length; i++) {
        b.add(along(R[i - 1], R[i], 0.3, SLAB, SLAB + 0.16), ORN_DRESSED);
        b.add(along(R[i - 1], R[i], 0.36, SLAB + 0.9, SLAB + 1.02), ORN_DRESSED);
      }
      for (const [k, p] of [R[0], R.at(-1)!].entries()) {
        b.box(p[0] - 0.22, SLAB, p[1] - 0.22, 0.44, 1.1, 0.44, ORN_DRESSED);
        urn(b, p[0], SLAB + 1.1, p[1], k);
      }
      b.detail(() => {
        if (low) return;
        // The balusters, a short turned post every 0.28 along it
        let carry = 0;
        for (let i = 1; i < R.length; i++) {
          const [a, c] = [R[i - 1], R[i]];
          const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
          for (let t = carry; t < l; t += 0.28) {
            const [x, z] = [a[0] + ((c[0] - a[0]) * t) / l, a[1] + ((c[1] - a[1]) * t) / l];
            b.add(new THREE.LatheGeometry([new THREE.Vector2(0.05, 0), new THREE.Vector2(0.08, 0.14), new THREE.Vector2(0.05, 0.36), new THREE.Vector2(0.09, 0.54), new THREE.Vector2(0.05, 0.74)], 6).translate(x, SLAB + 0.16, z), ORN);
          }
          carry = (((carry - l) % 0.28) + 0.28) % 0.28;
        }
      });
      b.build(into, { cast: true, receive: true });
    });
  }

  // Benches (near only), a site each tile's worth
  const byTile = new Map<string, typeof BENCHES>();
  for (const bn of BENCHES) {
    const key = `${Math.floor(bn.at[0] / 30)},${Math.floor(bn.at[1] / 30)}`;
    byTile.set(key, [...(byTile.get(key) ?? []), bn]);
  }
  for (const [key, list] of byTile) {
    const [i, j] = key.split(',').map(Number);
    site(`westlake benches ${key}`, [i * 30, j * 30, (i + 1) * 30, (j + 1) * 30], (into) => {
      const b = new Batch();
      b.lod = 'near';
      // (phones: every other one)
      list.forEach((bn, k) => !(low && k % 2) && bench(b, bn.at, bn.ry));
      b.build(into, { cast: true, receive: true });
    });
  }

  // The lake's bed, deep under the water inside the embankment (Phase 3b): what shows through it from close by
  site('westlake lake bed', LAKE_HOLE, (into) => {
    const b = new Batch();
    b.add(flatPoly(lakeLine(0.1, 240), SLAB + BED_Y + 0.02), toon(BANK.bed));
    b.build(into, { cast: false, receive: true });
  });

  // The water: on the main thread only (the river's shader, one mesh, never in the tile meshes)
  if (scene) {
    const water = new THREE.Mesh(flatPoly(lakeLine(0.02, 360), SLAB + WATER_Y), waterMat);
    water.name = 'westlake-water';
    water.receiveShadow = false;
    scene.add(water);
  }
}
