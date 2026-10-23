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
 * - the gates: two stone piers with caps and lanterns, and over the Mall's,
 *   iron posts and a beam carrying the park's name both ways;
 * - benches round the lake and along the Mall (near only).
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, lit, neon, siteMat, toon } from './kit';
import { SLAB, WALK_W, flatPoly, waterMat, type Tick } from './world';
import { registerParkLife, registerParkSites } from './parklife3d';
import { site } from './tilework';
import { offsetLine } from './streetplan';
import { BENCHES, CAR_PARK, GATES, GATE_PIERS, LAKE_C, PATHS, PIER, RIM, STRIPS, lakeLine, type ParkPath, type Pt } from './westlake';
import { BAY, BAYS, ENTRANCES } from './stadium';

/** Its own address, for the site worker (sitework.ts) */
export const SELF = import.meta.url;

const GRAVEL = toon('#9a91b8');
const STONE = toon('#8f8ab0');
const CAP = toon('#b3aed2');
const IRON = toon('#1b1830');
const WOOD = toon('#8a5a3c');
const ASPHALT = toon('#2c2a44');
const LINES = toon('#e8e4f8');
/** The paths lie this far over the lawn (its grass is at SLAB + 0.003 to 0.005) */
const PATH_Y = SLAB + 0.012;

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

/** An upright band along an open polyline from y0 to y1, each quad facing towards `c` (`towards`) or away from it */
function band(line: Pt[], y0: number, y1: number, c: Pt, towards: boolean) {
  const pos: number[] = [];
  for (let i = 1; i < line.length; i++) {
    const [p, q] = [line[i - 1], line[i]];
    const quad = [
      [p[0], y0, p[1]],
      [q[0], y0, q[1]],
      [q[0], y1, q[1]],
      [p[0], y1, p[1]],
    ];
    // Wound 0-1-2, 0-2-3 it faces (-ez, ex); the other way round if that's not the way it should face
    const [ex, ez] = [q[0] - p[0], q[1] - p[1]];
    const dot = -ez * (c[0] - p[0]) + ex * (c[1] - p[1]);
    const order = dot > 0 === towards ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
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

/** The park's name over the Mall's gate: one small texture, both faces */
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

/** A bench, the sitter facing `ry` (0 is +z), as the town's (neighbourhoods.ts) */
function bench(b: Batch, at: Pt, ry: number) {
  const g = (w: number, h: number, d: number, x: number, y: number, z: number) =>
    new THREE.BoxGeometry(w, h, d)
      .translate(x, y + h / 2, z)
      .rotateY(ry)
      .translate(at[0], SLAB, at[1]);
  b.add(g(0.9, 0.06, 0.3, 0, 0.24, 0), WOOD);
  b.add(g(0.9, 0.3, 0.05, 0, 0.32, -0.15), WOOD);
  for (const sx of [-0.36, 0.36]) b.add(g(0.05, 0.26, 0.28, sx, 0, 0), IRON);
}

export function register({ low, scene, tick }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  // Step 3: the boathouse, the jetty, the courts and the picnics as sites; on the main thread, what moves
  registerParkSites();
  if (scene && tick) registerParkLife(scene, tick, low);
  // The paths: a site a stretch
  for (const q of PATHS)
    stretches(q).forEach((s, k) =>
      site(`westlake path ${q.id} ${k}`, s.rect, (into) => {
        const b = new Batch();
        b.add(ribbon(s.pts, q.half, PATH_Y), GRAVEL);
        b.build(into, { cast: false, receive: true });
      })
    );

  // The lake's rim, a quarter a site: a flat stone top, a wall down to the water inside and to the lawn outside
  const inner = lakeLine(0, 120);
  const outer = lakeLine(RIM.w, 120);
  const top = SLAB + RIM.h;
  const n = inner.length;
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
      for (let i = 1; i < ins.length; i++) {
        const [a, c, d, e] = [ins[i - 1], ins[i], outs[i], outs[i - 1]];
        for (const v of [a, d, c, a, e, d]) pos.push(v[0], top, v[1]);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
      b.add(g, CAP);
      // The walls: down to the water inside (facing it), down to the lawn outside (facing away)
      b.add(band(ins, SLAB, top, LAKE_C, true), STONE);
      b.add(band(outs, SLAB, top, LAKE_C, false), STONE);
      b.build(into, { cast: false, receive: true });
    });
  }

  // The gates: two piers each, the Mall's with its name over it
  const sign = nameSign();
  GATES.forEach((g, gi) => {
    const piers = GATE_PIERS.slice(gi * 2, gi * 2 + 2);
    const main = g.id === 'gate-mall';
    const xs = piers.flatMap((p) => [p[0], p[2]]);
    const zs = piers.flatMap((p) => [p[1], p[3]]);
    site(`westlake ${g.id}`, [Math.min(...xs) - 0.5, Math.min(...zs) - 0.5, Math.max(...xs) + 0.5, Math.max(...zs) + 0.5], (into) => {
      const b = new Batch();
      for (const [x0, z0, x1, z1, h] of piers) {
        b.box(x0, SLAB, z0, x1 - x0, h - SLAB, z1 - z0, STONE);
        b.box(x0 - 0.06, h, z0 - 0.06, x1 - x0 + 0.12, 0.1, z1 - z0 + 0.12, CAP);
        // A lantern on each (lit at night)
        b.detail(() => {
          b.box((x0 + x1) / 2 - 0.05, h + 0.1, (z0 + z1) / 2 - 0.05, 0.1, 0.12, 0.1, IRON);
          b.box((x0 + x1) / 2 - 0.09, h + 0.22, (z0 + z1) / 2 - 0.09, 0.18, 0.22, 0.18, neon('#ffe2a0', 0.6, 2.4));
          b.box((x0 + x1) / 2 - 0.12, h + 0.44, (z0 + z1) / 2 - 0.12, 0.24, 0.05, 0.24, IRON);
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

  // The stadium's car park (step 2): asphalt over the strip's lawn, its bays marked, two ways in across the sidewalk
  // from the avenue (its cars are the stadium's, parked at the boot: stadium3d.ts)
  const [cx0, cz0, cx1, cz1] = CAR_PARK;
  const edge = STRIPS[0].poly[0][1];
  const halves = [cx0, (cx0 + cx1) / 2, cx1];
  for (let h = 0; h < 2; h++)
    site(`westlake car park ${h}`, [halves[h], edge - 1, halves[h + 1], cz1], (into) => {
      const b = new Batch();
      const [x0, x1] = [halves[h], halves[h + 1]];
      b.add(new THREE.PlaneGeometry(x1 - x0, cz1 - cz0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, PATH_Y, (cz0 + cz1) / 2), ASPHALT);
      for (const e of ENTRANCES)
        if (e.x > x0 && e.x <= x1) b.add(new THREE.PlaneGeometry(e.w, cz0 - edge + WALK_W + 0.1).rotateX(-Math.PI / 2).translate(e.x, PATH_Y, (cz0 + edge - WALK_W - 0.1) / 2), ASPHALT);
      // The bays' lines: one either side of each bay, out from its row's edge
      b.detail(() => {
        for (const bay of BAYS) {
          if (bay.x <= x0 || bay.x > x1) continue;
          const back = bay.z < (cz0 + cz1) / 2 ? cz0 : cz1;
          const mid = back + Math.sign((cz0 + cz1) / 2 - back) * (BAY.d / 2);
          for (const sx of [-1, 1]) b.add(new THREE.PlaneGeometry(0.08, BAY.d).rotateX(-Math.PI / 2).translate(bay.x + (sx * BAY.w) / 2, PATH_Y + 0.006, mid), LINES);
        }
      });
      b.build(into, { cast: false, receive: true });
    });
  // A P sign by the east way in
  const pe = ENTRANCES[ENTRANCES.length - 1];
  site('westlake car park sign', [pe.x + 2, cz0 - 1, pe.x + 4, cz0 + 1], (into) => {
    const b = new Batch();
    b.box(pe.x + pe.w / 2 + 0.8, SLAB, cz0 - 0.5, 0.12, 2.6, 0.12, IRON);
    b.box(pe.x + pe.w / 2 + 0.35, SLAB + 2.0, cz0 - 0.47, 1.0, 1.0, 0.1, toon('#1d4fd6'));
    b.box(pe.x + pe.w / 2 + 0.55, SLAB + 2.2, cz0 - 0.52, 0.16, 0.6, 0.06, neon('#ffffff', 0.8, 1.4));
    b.box(pe.x + pe.w / 2 + 0.55, SLAB + 2.62, cz0 - 0.52, 0.42, 0.16, 0.06, neon('#ffffff', 0.8, 1.4));
    b.box(pe.x + pe.w / 2 + 0.87, SLAB + 2.4, cz0 - 0.52, 0.12, 0.38, 0.06, neon('#ffffff', 0.8, 1.4));
    b.box(pe.x + pe.w / 2 + 0.55, SLAB + 2.36, cz0 - 0.52, 0.42, 0.14, 0.06, neon('#ffffff', 0.8, 1.4));
    b.build(into, { cast: true, receive: true });
  });

  // The water: on the main thread only (the river's shader, one mesh, never in the tile meshes)
  if (scene) {
    const water = new THREE.Mesh(flatPoly(lakeLine(0.02, 120), SLAB + 0.04), waterMat);
    water.name = 'westlake-water';
    water.receiveShadow = false;
    scene.add(water);
  }
}
