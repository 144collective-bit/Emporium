/*
 * Crestmont's streets drawn (docs/crestmont-plan.md Phase 2; the data is crestmont.ts), a district loaded as you
 * approach (districts.ts `LAZY_DISTRICTS`), as sites (tilework.ts): the Flats' streets (asphalt, a yellow centre
 * line down each, the boulevard's planted median broken at its junctions, zebras on every arm of the lit junctions
 * at the avenues, Foothill Road), and the hill roads following their beds up the hills (terrain.ts: the asphalt
 * laid on the ground's own height, white edge lines, a yellow centre line). Clean, like Uptown's: no wear. Its
 * lamps are placed at the boot (index.ts, `CREST_LAMPS`).
 */
import * as THREE from 'three';
import { Batch, neon, toon } from './kit';
import { site } from './tilework';
import { offsetLine, type Pt } from './streetplan';
import { EW_ROADS, MEDIAN } from './layout';
import { SLAB } from './world';
import { heightAt } from './terrain';
import { registerLandscape } from './landscape3d';
import { registerCoral } from './coral3d';
import { registerEstates } from './estates3d';
import { CREST_CROSSINGS, FLATS_STREETS, FOOTHILL_Z, HILL_ROADS, type Rect } from './crestmont';

export const SELF = import.meta.url;

/** The Flats' asphalt, level with the city's other district streets */
const Y = 0.031;
/** How far over the hills' ground the hill roads' asphalt lies */
const ON = 0.04;
/** Pieces of road no longer than this (a site each: nothing much longer than a tile, tileBatch()) */
const PIECE = 24;

const unit = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const UP = new THREE.Vector3(0, 1, 0);
const SIDE = new THREE.Vector3(0, 0, 1);

/** A strip along a line from l to r right of it, each vertex at `y(x, z)`, wound to face up */
function ribbon(pts: Pt[], l: number, r: number, y: (x: number, z: number) => number) {
  const L = offsetLine(pts, l);
  const R = offsetLine(pts, r);
  const pos: number[] = [];
  const v = (p: Pt) => [p[0], y(p[0], p[1]), p[1]];
  const tri = (p: Pt, q: Pt, t: Pt) => {
    const up = (q[1] - p[1]) * (t[0] - p[0]) - (q[0] - p[0]) * (t[1] - p[1]) > 0;
    for (const w of up ? [p, q, t] : [p, t, q]) pos.push(...v(w));
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

/** A line's pieces: runs of points no longer than PIECE, each with its box (padded `pad`) */
function pieces(pts: Pt[], pad: number) {
  const out: { pts: Pt[]; rect: Rect }[] = [];
  let run: Pt[] = [pts[0]];
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    run.push(pts[i]);
    if (len >= PIECE || i === pts.length - 1) {
      const xs = run.map((p) => p[0]);
      const zs = run.map((p) => p[1]);
      out.push({ pts: run, rect: [Math.min(...xs) - pad, Math.min(...zs) - pad, Math.max(...xs) + pad, Math.max(...zs) + pad] });
      run = [pts[i]];
      len = 0;
    }
  }
  return out;
}

/** A straight line cut into points every `step` */
const along = (a: Pt, b: Pt, step = 6): Pt[] => {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
  return Array.from({ length: n + 1 }, (_, k): Pt => [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
};

/** Dashes along a line every `gap`, each `l` long and `w` wide, at `y(x, z)` tipped along its slope; skipping where `skip` says */
function dashes(list: THREE.Matrix4[], pts: Pt[], off: number, gap: number, l: number, w: number, y: (x: number, z: number) => number, skip: (x: number, z: number) => boolean) {
  const line = off ? offsetLine(pts, off) : pts;
  let carry = gap / 2;
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [line[i - 1], line[i]];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (seg < 1e-6) continue;
    const [ux, uz] = [(b[0] - a[0]) / seg, (b[1] - a[1]) / seg];
    for (let d = carry; d < seg; d += gap) {
      const [x, z] = [a[0] + ux * d, a[1] + uz * d];
      carry = d + gap - seg;
      if (skip(x, z)) continue;
      const rise = (y(x + ux * 0.4, z + uz * 0.4) - y(x - ux * 0.4, z - uz * 0.4)) / 0.8;
      const q = new THREE.Quaternion().setFromAxisAngle(UP, Math.atan2(-uz, ux)).multiply(new THREE.Quaternion().setFromAxisAngle(SIDE, Math.atan(rise)));
      list.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y(x, z), z), q, new THREE.Vector3(l, 1, w)));
    }
    if (carry < 0) carry = 0;
  }
}

export function register({ low, scene }: { low: boolean; scene: THREE.Scene | null }) {
  // The palms, jacarandas, oaks and scrub, the hill roads' walls and rails (Phase 3: landscape3d.ts)
  registerLandscape(low);
  // The Drive: the boutiques, Via Coral, the bays and their cars (Phase 4: coral3d.ts)
  registerCoral(low, scene);
  // The Flats' estates (Phase 5: estates3d.ts)
  registerEstates(low, scene);
  const asphalt = toon('#26243f');
  const kerbTop = toon('#5a5290');
  const grass = toon('#3f7a4a');
  const yellow = neon('#f5d76e', 0.9, 1.1);
  const white = toon('#d9d5ee');
  const zebra = toon('#e8e4f8');

  // Where the Flats' streets cross the east-west roads (z) and the boulevard's kerb stops short of them
  const crossZ = EW_ROADS.filter((r) => r.c <= EW_ROADS[3].c).map((r) => ({ z: r.c, half: r.half }));
  const inJunction = (x: number, z: number) =>
    crossZ.some((c) => Math.abs(z - c.z) < c.half + 0.6) ||
    (Math.abs(z - FOOTHILL_Z) < 2.4 && FLATS_STREETS.some((s) => s.id !== 'crest-foothill' && Math.abs(x - s.pts[0][0]) < s.half + 0.6));

  /* ---------- The Flats' streets and Foothill Road ---------- */
  for (const s of FLATS_STREETS) {
    const line = along(s.pts[0], s.pts[1]);
    pieces(line, s.half + 0.5).forEach((pc, k) =>
      site(`crestmont street ${s.id} ${k}`, pc.rect, (into) => {
        const b = new Batch();
        b.add(ribbon(pc.pts, -s.half, s.half, () => Y), asphalt);
        // The boulevard's median, planted, broken at its junctions
        if (s.median) {
          const runs: Pt[][] = [];
          let run: Pt[] = [];
          for (const p of along(pc.pts[0], pc.pts[pc.pts.length - 1], 0.5)) {
            if (inJunction(p[0], p[1]) || Math.abs(p[1] - FOOTHILL_Z) < 3) {
              if (run.length > 1) runs.push(run);
              run = [];
            } else run.push(p);
          }
          if (run.length > 1) runs.push(run);
          for (const r of runs) {
            const [a, c] = [r[0], r[r.length - 1]];
            const mid = [a, c];
            b.add(ribbon(mid, -s.median / 2, s.median / 2, () => SLAB), kerbTop);
            b.add(ribbon(mid, -s.median / 2 + 0.08, s.median / 2 - 0.08, () => SLAB + 0.006), grass);
            // (its kerb's sides down to the asphalt)
            for (const side of [-1, 1]) {
              const [p, q] = offsetLine(mid, (side * s.median) / 2);
              // (wound to face out from the median: west on its west side, east on its east)
              const quad = [p[0], Y, p[1], q[0], Y, q[1], q[0], SLAB, q[1], p[0], Y, p[1], q[0], SLAB, q[1], p[0], SLAB, p[1]];
              const out = (q[1] - p[1]) * side < 0;
              const g = new THREE.BufferGeometry();
              g.setAttribute('position', new THREE.Float32BufferAttribute(out ? quad : [...quad.slice(0, 3), ...quad.slice(6, 9), ...quad.slice(3, 6), ...quad.slice(9, 12), ...quad.slice(15, 18), ...quad.slice(12, 15)], 3));
              g.computeVertexNormals();
              b.add(g, kerbTop);
            }
          }
        }
        // A dashed yellow centre line down a street without a median, clear of its junctions
        const ys: THREE.Matrix4[] = [];
        if (!s.median) dashes(ys, pc.pts, 0, 1.1, 0.55, 0.07, () => Y + 0.006, inJunction);
        b.instances(unit, yellow, ys);
        b.build(into, { cast: false, receive: true });
      })
    );
  }

  // Zebras across every arm of the lit junctions (the Flats' streets at the avenues)
  for (const c of CREST_CROSSINGS) {
    if (!c.lights) continue;
    const ns = FLATS_STREETS.find((s) => c.streets.includes(s.id))!;
    const ew = EW_ROADS.find((r) => r.c === c.at[1])!;
    const zs: THREE.Matrix4[] = [];
    const stripe = (x: number, z: number, w: number, d: number) => zs.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0.04, z), new THREE.Quaternion(), new THREE.Vector3(w, 1, d)));
    // Across the Flats' street (north and south of the avenue), not its median
    for (const dir of [-1, 1]) {
      const z = c.at[1] + dir * (ew.half + 0.75);
      for (let w = -ns.half + 0.16; w < ns.half - 0.1; w += 0.32) if (!ns.median || Math.abs(w) > ns.median / 2 + 0.05) stripe(c.at[0] + w, z, 0.17, 0.55);
    }
    // Across the avenue (east and west of the street), not its median
    for (const dir of [-1, 1]) {
      const x = c.at[0] + dir * (ns.half + 0.75);
      for (let w = -ew.half + 0.16; w < ew.half - 0.1; w += 0.32) if (Math.abs(w) > MEDIAN / 2 + 0.1) stripe(x, c.at[1] + w, 0.55, 0.17);
    }
    const r = 9;
    site(`crestmont crossing ${c.id}`, [c.at[0] - r, c.at[1] - r, c.at[0] + r, c.at[1] + r], (into) => {
      const b = new Batch();
      b.instances(unit, zebra, zs);
      b.build(into, { cast: false, receive: true });
    });
  }

  /* ---------- The hill roads, on their beds ---------- */
  const ground = (x: number, z: number) => heightAt(x, z) + ON;
  const atFoot = (_x: number, z: number) => z > FOOTHILL_Z - 3;
  for (const r of HILL_ROADS)
    pieces(r.pts, r.half + 0.5).forEach((pc, k) =>
      site(`crestmont hill road ${r.id} ${k}`, pc.rect, (into) => {
        const b = new Batch();
        b.add(ribbon(pc.pts, -r.half, r.half, ground), asphalt);
        // White edge lines, a little in from each side, and a dashed yellow centre line (none where it leaves Foothill Road)
        for (const side of [-1, 1]) b.add(ribbon(pc.pts, side * (r.half - 0.2) - 0.05, side * (r.half - 0.2) + 0.05, (x, z) => ground(x, z) + 0.006), white);
        const ys: THREE.Matrix4[] = [];
        dashes(ys, pc.pts, 0, 1.1, 0.55, 0.07, (x, z) => ground(x, z) + 0.008, atFoot);
        b.instances(unit, yellow, ys);
        b.build(into, { cast: false, receive: true });
      })
    );
}
