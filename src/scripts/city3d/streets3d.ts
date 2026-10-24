/*
 * Streets that join the street plan from a district of their own, drawn as
 * sites (tilework.ts) like the rest of the fixed city: asphalt, an avenue's
 * median (broken at its junctions), lane lines (a yellow centre line down a
 * street, white dashes between an avenue's lanes), zebra crossings on every
 * arm of every junction, and street lamps along both sides. The Trenches'
 * (trenches3d.ts, worn: patched asphalt, cracks, manholes) and Uptown's
 * (uptown.ts, clean) are drawn by `drawStreets()`.
 */
import * as THREE from 'three';
import { Batch, neon, rng, toon } from './kit';
import { LANE, MEDIAN } from './layout';
import { SLAB, addLamp, keepTreesOff } from './world';
import { site } from './tilework';
import { PLAN, offsetLine, type Pt, type Street } from './streetplan';
import type { Rect } from './downtown';
import { AXIS_X, AXIS_ZEBRAS, CIRCLE, LANE_HALF, LAYBYS, UPTOWN_CROSSINGS, UPTOWN_LAMPS, UPTOWN_RECT, UPTOWN_STREETS, laybyRect } from './uptown';

/** A street a district adds to the plan: straight, along x or z */
export interface DistrictStreet {
  id: string;
  kind: 'avenue' | 'street';
  pts: [number, number][];
  half: number;
}
export interface DistrictCrossing {
  id: string;
  at: [number, number];
  streets: string[];
}

const unit = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
/** A flat mark at x, z, w along x and d along z */
const mark = (list: THREE.Matrix4[], x: number, z: number, w: number, d: number, y: number) => list.push(m.clone().compose(new THREE.Vector3(x, y, z), q.identity(), new THREE.Vector3(w, 1, d)));

/** A street's stretches between its crossings (and the avenues it meets at its ends): from, to, along x or z */
function stretches(s: DistrictStreet, crossings: DistrictCrossing[]) {
  const [a, b] = s.pts;
  const alongX = a[1] === b[1];
  const ax = alongX ? 0 : 1;
  const lo = Math.min(a[ax], b[ax]);
  const hi = Math.max(a[ax], b[ax]);
  // Every crossing on it, the street across's half width there
  const cuts = crossings.filter((c) => c.streets.includes(s.id))
    .map((c) => {
      const other = PLAN.streets.find((o) => o.id === c.streets.find((id) => id !== s.id))!;
      return { v: c.at[ax], half: other.half };
    })
    .sort((p, q) => p.v - q.v);
  const out: { v0: number; v1: number }[] = [];
  let at = lo;
  for (const c of cuts) {
    if (c.v - c.half > at + 0.5) out.push({ v0: at, v1: c.v - c.half });
    at = Math.max(at, c.v + c.half);
  }
  if (hi > at + 0.5) out.push({ v0: at, v1: hi });
  return { alongX, c: alongX ? a[1] : a[0], runs: out, cuts };
}

/**
 * A district's streets, each stretch a site (its ids from `key`), worn if `wear` (patches, cracks and manholes); the
 * zebras on every arm of its junctions; and the lamps along them (before the city's lamps are built)
 */
export function drawStreets(streets: DistrictStreet[], crossings: DistrictCrossing[], key: string, wear: boolean) {
  const asphalt = toon('#26243f');
  const kerbTop = toon('#5a5290');
  const median = toon('#3f5a4a');
  const yellow = neon('#f5d76e', 0.9, 1.1);
  const white = toon('#d9d5ee');
  const zebra = toon('#e8e4f8');
  // (a manhole cover: a disc a unit across)
  const disc = new THREE.CircleGeometry(0.5, 14).rotateX(-Math.PI / 2);

  for (const s of streets) {
    const { alongX, c, runs, cuts } = stretches(s, crossings);
    // The asphalt runs its whole length, from the avenues' edges at its ends (their own asphalt covers their width)
    const [lo, hi] = [Math.min(s.pts[0][alongX ? 0 : 1], s.pts[1][alongX ? 0 : 1]), Math.max(s.pts[0][alongX ? 0 : 1], s.pts[1][alongX ? 0 : 1])];
    const ends = cuts.filter((k) => Math.abs(k.v - lo) < 1e-6 || Math.abs(k.v - hi) < 1e-6);
    const endHalf = (v: number) => ends.find((k) => Math.abs(k.v - v) < 1e-6 && k.half > s.half + 1)?.half ?? 0;
    const a0 = lo + endHalf(lo);
    const a1 = hi - endHalf(hi);
    // In pieces of a tile or so, each a site
    const n = Math.max(1, Math.ceil((a1 - a0) / 30));
    for (let k = 0; k < n; k++) {
      const p0 = a0 + ((a1 - a0) * k) / n;
      const p1 = a0 + ((a1 - a0) * (k + 1)) / n;
      const rect: Rect = alongX ? [p0, c - s.half, p1, c + s.half] : [c - s.half, p0, c + s.half, p1];
      site(`${key} street ${s.id} ${k}`, rect, (into) => {
        const b = new Batch();
        const box = (u0: number, u1: number, w0: number, w1: number, y: number, h: number, mat: THREE.Material) =>
          alongX ? b.box(u0, y, w0, u1 - u0, h, w1 - w0, mat) : b.box(w0, y, u0, w1 - w0, h, u1 - u0, mat);
        // (east-west streets a hair under the north-south ones where they cross: never flush)
        box(p0, p1, c - s.half, c + s.half, alongX ? 0 : 0.004, 0.03, asphalt);
        // The avenue's median between its junctions
        const mine = runs.map((r): [number, number] => [Math.max(r.v0 + 0.2, p0), Math.min(r.v1 - 0.2, p1)]).filter(([u, v]) => v - u > 0.3);
        if (s.kind === 'avenue')
          for (const [u, v] of mine) {
            box(u, v, c - MEDIAN / 2, c + MEDIAN / 2, 0, SLAB, kerbTop);
            box(u, v, c - MEDIAN / 2 + 0.06, c + MEDIAN / 2 - 0.06, SLAB, 0.005, median);
          }
        // Lane lines, clear of the junctions
        const ys: THREE.Matrix4[] = [];
        const ws: THREE.Matrix4[] = [];
        for (const [u, v] of mine)
          for (let p = u + 0.4; p < v - 0.3; p += 1.1)
            if (s.kind === 'avenue') for (const off of [-(MEDIAN / 2 + LANE), MEDIAN / 2 + LANE]) alongX ? mark(ws, p, c + off, 0.55, 0.07, 0.036) : mark(ws, c + off, p, 0.07, 0.55, 0.038);
            else alongX ? mark(ys, p, c, 0.55, 0.07, 0.036) : mark(ys, c, p, 0.07, 0.55, 0.038);
        b.instances(unit, yellow, ys).instances(unit, white, ws);
        // Wear: patches inside the lanes (never across a line), cracks and manholes near
        if (!wear) {
          b.build(into, { cast: false, receive: true });
          return;
        }
        const r = rng(Math.round(c * 13 + p0 * 7));
        const top = (alongX ? 0.03 : 0.034) + 0.0016;
        const lanes = s.kind === 'avenue' ? [-(MEDIAN / 2 + LANE * 1.5), -(MEDIAN / 2 + LANE / 2), MEDIAN / 2 + LANE / 2, MEDIAN / 2 + LANE * 1.5] : [-LANE / 2, LANE / 2];
        const patches: THREE.Matrix4[][] = [[], []];
        const cracks: THREE.Matrix4[] = [];
        const holes: THREE.Matrix4[] = [];
        for (const [u, v] of mine)
          for (let p = u + 1 + r() * 4, len = 0; p < v - 2; p += len + 1 + r() * 5) {
            const lane = lanes[Math.floor(r() * lanes.length)];
            len = 1.2 + r() * 2.6;
            const wid = 0.6 + r() * 0.6;
            if (p + len > v - 0.5) break;
            const k = r();
            if (k < 0.55) alongX ? mark(patches[k < 0.3 ? 0 : 1], p + len / 2, c + lane, len, wid, top) : mark(patches[k < 0.3 ? 0 : 1], c + lane, p + len / 2, wid, len, top);
            else if (k < 0.85)
              for (let q = 0; q < 3; q++) {
                // A crack: a few short dark strokes wandering down the lane
                const off = lane + (r() - 0.5) * 0.8;
                const at = p + q * 0.5;
                alongX ? mark(cracks, at, c + off, 0.5, 0.025, top + 0.0004) : mark(cracks, c + off, at, 0.025, 0.5, top + 0.0004);
              }
            else alongX ? mark(holes, p, c + lane, 0.55, 0.55, top + 0.0004) : mark(holes, c + lane, p, 0.55, 0.55, top + 0.0004);
          }
        b.instances(unit, toon('#1d1b2f'), patches[0]).instances(unit, toon('#2f2c45'), patches[1]);
        b.detail(() => b.instances(unit, toon('#121020'), cracks).instances(disc, toon('#47445a'), holes));
        b.build(into, { cast: false, receive: true });
      });
    }
    // Street lamps along both sides, on the sidewalks, their arms reaching over the road; none in a junction
    for (const r of runs)
      for (let p = r.v0 + 4; p < r.v1 - 3; p += 12)
        for (const side of [-1, 1]) {
          const off = side * (s.half + 0.45);
          const [x, z] = alongX ? [p, c + off] : [c + off, p];
          const [nx, nz] = alongX ? [0, side] : [side, 0];
          addLamp(x, z, Math.atan2(nz, -nx));
        }
  }

  // Zebra crossings on every arm of every junction, just outside it
  for (const c of crossings) {
    const streets = c.streets.map((id) => PLAN.streets.find((s) => s.id === id)!);
    const zs: THREE.Matrix4[] = [];
    for (const s of streets) {
      const other = streets.find((o) => o !== s)!;
      const alongX = s.pts[0][1] === s.pts[s.pts.length - 1][1];
      const ax = alongX ? 0 : 1;
      const vs = s.pts.map((p) => p[ax]);
      for (const side of [-1, 1]) {
        const v = c.at[ax] + side * (other.half + 0.45);
        // Only where the street carries on that way
        if (v < Math.min(...vs) || v > Math.max(...vs)) continue;
        const cc = alongX ? c.at[1] : c.at[0];
        for (let k = cc - s.half + 0.16; k < cc + s.half - 0.1; k += 0.32) alongX ? mark(zs, v, k, 0.55, 0.17, 0.04) : mark(zs, k, v, 0.17, 0.55, 0.042);
      }
    }
    const r = 6;
    site(`${key} crossing ${c.id}`, [c.at[0] - r, c.at[1] - r, c.at[0] + r, c.at[1] + r], (into) => {
      const b = new Batch();
      b.instances(unit, zebra, zs);
      b.build(into, { cast: false, receive: true });
    });
  }
}

/* ---------- Uptown's streets (uptown.ts, Phase 5): any line, a loop, a median ---------- */

/** A street's line as distances: its length, and the point and direction `d` along it */
function measure(pts: Pt[]) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = cum[cum.length - 1];
  const at = (d: number): { p: Pt; u: Pt } => {
    let i = 1;
    while (i < pts.length - 1 && cum[i] < d) i++;
    const l = cum[i] - cum[i - 1] || 1;
    const f = (d - cum[i - 1]) / l;
    const u: Pt = [(pts[i][0] - pts[i - 1][0]) / l, (pts[i][1] - pts[i - 1][1]) / l];
    return { p: [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f], u };
  };
  /** The line from a to b, its corners kept */
  const piece = (a: number, b: number): Pt[] => [at(a).p, ...pts.filter((_, i) => cum[i] > a + 1e-6 && cum[i] < b - 1e-6), at(b).p];
  /** How far along it a point lies (its nearest point) */
  const along = (q: Pt) => {
    let best = Infinity;
    let at0 = 0;
    for (let i = 1; i < pts.length; i++) {
      const [a, b] = [pts[i - 1], pts[i]];
      const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
      const l2 = vx * vx + vz * vz || 1;
      const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * vx + (q[1] - a[1]) * vz) / l2));
      const d = Math.hypot(q[0] - a[0] - vx * t, q[1] - a[1] - vz * t);
      if (d < best) [best, at0] = [d, cum[i - 1] + t * Math.sqrt(l2)];
    }
    return at0;
  };
  return { cum, len, at, piece, along };
}
/** A flat strip along a line, from l to r right of it (seen from above, north up), at y, wound to face up */
function band(pts: Pt[], l: number, r: number, y: number) {
  const L = offsetLine(pts, l);
  const R = offsetLine(pts, r);
  const pos: number[] = [];
  const tri = (p: Pt, q: Pt, t: Pt) => {
    const up = (q[1] - p[1]) * (t[0] - p[0]) - (q[0] - p[0]) * (t[1] - p[1]) > 0;
    for (const v of up ? [p, q, t] : [p, t, q]) pos.push(v[0], y, v[1]);
  };
  for (let i = 1; i < pts.length; i++) {
    tri(L[i - 1], R[i - 1], R[i]);
    tri(L[i - 1], R[i], L[i]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  return g;
}
/** Where along a street its crossings are, each with the other streets' widest half there and the sine of the angle it meets at */
function cutsOf(s: Street, m: ReturnType<typeof measure>) {
  return PLAN.crossings
    .filter((c) => c.streets.includes(s.id))
    .map((c) => {
      const d = m.along(c.at);
      const u = m.at(Math.min(m.len - 0.01, Math.max(0.01, d))).u;
      let reach = 0;
      for (const id of c.streets) {
        if (id === s.id) continue;
        const o = PLAN.streets.find((q) => q.id === id)!;
        const mo = measure(o.pts);
        const uo = mo.at(Math.min(mo.len - 0.01, Math.max(0.01, mo.along(c.at)))).u;
        const sin = Math.max(0.35, Math.abs(u[0] * uo[1] - u[1] * uo[0]));
        const cot = Math.sqrt(Math.max(0, 1 - sin * sin)) / sin;
        // (along this street, how far the other's asphalt reaches: its half across at this angle, and this one's half slanting past it)
        reach = Math.max(reach, o.half / sin + s.half * cot);
      }
      return { c, d, reach };
    })
    .sort((p, q) => p.d - q.d);
}
/** A street's runs clear of its crossings (each trimmed `pad` more), its ends too where they meet a wider street */
function clearRuns(s: Street, m: ReturnType<typeof measure>, pad: number): [number, number][] {
  const cuts = cutsOf(s, m);
  if (s.loop) {
    // (round a loop, between each crossing and the next)
    return cuts.map((k, i) => {
      const n = cuts[(i + 1) % cuts.length];
      return [k.d + k.reach + pad, (i + 1 < cuts.length ? n.d : n.d + m.len) - n.reach - pad] as [number, number];
    }).filter(([a, b]) => b - a > 0.5);
  }
  const out: [number, number][] = [];
  let at = 0;
  for (const k of cuts) {
    if (k.d - k.reach - pad > at + 0.5) out.push([at, k.d - k.reach - pad]);
    at = Math.max(at, k.d + k.reach + pad);
  }
  if (m.len - at > 0.5) out.push([at, m.len]);
  return out;
}

/** Uptown's streets (uptown.ts, Phase 5), clean: asphalt along any line, the circle's ring, planted medians, centre lines, zebras on every arm, the lay-bys, lamps */
function drawUptown() {
  const asphalt = toon('#26243f');
  const kerbTop = toon('#5a5290');
  const grass = toon('#3f7a4a');
  const shrub = toon('#2f6a3c');
  const yellow = neon('#f5d76e', 0.9, 1.1);
  const zebra = toon('#e8e4f8');
  const Y = 0.031;
  const streets = UPTOWN_STREETS.map((u) => PLAN.streets.find((s) => s.id === u.id)!);
  for (const s of streets) {
    const m = measure(s.loop ? s.pts : s.pts);
    // Its asphalt, from a wider street's edge at its ends (that one's own asphalt covers its width), in pieces of 24 or so
    const ends = cutsOf(s, m).filter((k) => !s.loop && (k.d < 0.5 || k.d > m.len - 0.5));
    const trim = (end: number) => {
      const k = ends.find((e) => Math.abs(e.d - end) < 0.5);
      const o = k && k.c.streets.map((id) => PLAN.streets.find((q) => q.id === id)!).find((q) => q.id !== s.id && q.half > s.half + 1);
      return o ? k!.reach - s.half * 0.5 : 0;
    };
    const [a0, a1] = s.loop ? [0, m.len] : [trim(0), m.len - trim(m.len)];
    const n = Math.max(1, Math.ceil((a1 - a0) / 24));
    for (let k = 0; k < n; k++) {
      const [p0, p1] = [a0 + ((a1 - a0) * k) / n, a0 + ((a1 - a0) * (k + 1)) / n];
      const line = m.piece(p0, p1);
      const xs = line.map((p) => p[0]);
      const zs = line.map((p) => p[1]);
      const rect: Rect = [Math.min(...xs) - s.half, Math.min(...zs) - s.half, Math.max(...xs) + s.half, Math.max(...zs) + s.half];
      site(`uptown street ${s.id} ${k}`, rect, (into) => {
        const b = new Batch();
        b.add(band(line, -s.half, s.half, Y), asphalt);
        // The median, planted, clear of the junctions
        if (s.median)
          for (const [u0, u1] of clearRuns(s, m, 1.2)) {
            const [q0, q1] = [Math.max(u0, p0), Math.min(u1, p1)];
            if (q1 - q0 < 0.6) continue;
            const mid = m.piece(q0, q1);
            b.add(band(mid, -s.median / 2, s.median / 2, SLAB), kerbTop);
            b.add(band(mid, -s.median / 2 + 0.08, s.median / 2 - 0.08, SLAB + 0.006), grass);
            // (its kerb's sides: the slab's edge)
            for (const side of [-1, 1]) b.add(band(mid, side * (s.median / 2) - 0.001, side * (s.median / 2) + 0.001, Y + 0.002), kerbTop);
            b.detail(() => {
              for (let d = q0 + 0.8; d < q1 - 0.6; d += 1.6) {
                const { p } = m.at(d);
                b.add(new THREE.IcosahedronGeometry(0.34, 0).scale(1, 0.7, 1).translate(p[0], SLAB + 0.24, p[1]), shrub);
              }
            });
          }
        // A dashed yellow centre line down a two-way street without a median, clear of its junctions
        const ys: THREE.Matrix4[] = [];
        if (!s.median && !s.oneway && !s.loop)
          for (const [u0, u1] of clearRuns(s, m, 0.4))
            for (let d = Math.max(u0, p0) + 0.3; d < Math.min(u1, p1) - 0.3; d += 1.1) {
              const { p, u } = m.at(d);
              ys.push(new THREE.Matrix4().compose(new THREE.Vector3(p[0], Y + 0.006, p[1]), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-u[1], u[0])), new THREE.Vector3(0.55, 1, 0.07)));
            }
        b.instances(unit, yellow, ys);
        b.build(into, { cast: false, receive: true });
      });
    }
    // Street lamps along both sides on the sidewalks, their arms over the road; none in a junction, a lay-by or another street
    const lampRuns = clearRuns(s, m, 1.5);
    for (const [u0, u1] of lampRuns)
      for (let d = u0 + 3; d < u1 - 2; d += 12)
        for (const side of [-1, 1]) {
          const { p, u } = m.at(d);
          // (right of travel, seen from above with north up, is (-u.z, u.x))
          const [nx, nz] = [-u[1] * side, u[0] * side];
          const [x, z] = [p[0] + nx * (s.half + 0.45), p[1] + nz * (s.half + 0.45)];
          if (s.loop && side < 0) continue;
          if (LAYBYS.some((l) => {
            const r = laybyRect(l);
            return x > r[0] - 0.6 && x < r[2] + 0.6 && z > r[1] - 0.6 && z < r[3] + 0.6;
          })) continue;
          if (PLAN.streets.some((o) => o !== s && o.kind !== 'alley' && measure(o.pts).at(measure(o.pts).along([x, z])).p.every((v, i) => Math.abs(v - [x, z][i]) < o.half + 0.3))) continue;
          addLamp(x, z, Math.atan2(nz, -nx));
        }
  }

  // The lay-bys' asphalt, level with the streets'
  for (const l of LAYBYS) {
    const r = laybyRect(l);
    site(`uptown layby ${l.id}`, r, (into) => {
      const b = new Batch();
      b.box(r[0], 0, r[1], r[2] - r[0], Y, r[3] - r[1], asphalt);
      b.build(into, { cast: false, receive: true });
    });
  }

  // Zebras across every arm of every lit junction, just clear of the streets across it (the circle's arms give way: kerbside3d.ts paints them)
  for (const c of UPTOWN_CROSSINGS) {
    if (!c.lights) continue;
    const zs: THREE.Matrix4[] = [];
    for (const id of c.streets) {
      const s = PLAN.streets.find((q) => q.id === id)!;
      const m = measure(s.pts);
      const k = cutsOf(s, m).find((q) => q.c.id === c.id)!;
      for (const dir of [-1, 1]) {
        const d = k.d + dir * (k.reach + 0.45);
        if (d < 0.2 || d > m.len - 0.2) continue;
        const { p, u } = m.at(d);
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-u[1], u[0]));
        const [nx, nz] = [-u[1], u[0]];
        // (across an avenue's lanes, not its median)
        for (let w = -s.half + 0.16; w < s.half - 0.1; w += 0.32) {
          if (s.lanes === 2 && Math.abs(w) < MEDIAN / 2 + 0.1) continue;
          if (s.median && Math.abs(w) < s.median / 2 + 0.05) continue;
          zs.push(new THREE.Matrix4().compose(new THREE.Vector3(p[0] + nx * w, 0.04, p[1] + nz * w), q, new THREE.Vector3(0.55, 1, 0.17)));
        }
      }
    }
    const r = 9;
    site(`uptown crossing ${c.id}`, [c.at[0] - r, c.at[1] - r, c.at[0] + r, c.at[1] + r], (into) => {
      const b = new Batch();
      b.instances(unit, zebra, zs);
      b.build(into, { cast: false, receive: true });
    });
  }
  // Lamps round the circle's outside, between its streets
  for (let k = 0; k < 6; k++) {
    const a = (k + 0.5) * (Math.PI / 3);
    const [x, z] = [CIRCLE.x + Math.cos(a) * (CIRCLE.r + CIRCLE.half + 0.45), CIRCLE.z + Math.sin(a) * (CIRCLE.r + CIRCLE.half + 0.45)];
    if (UPTOWN_STREETS.some((s) => s.id !== 'uptown-circle' && s.pts.some((p, i) => i > 0 && Math.abs(Math.atan2(p[1] - CIRCLE.z, p[0] - CIRCLE.x) - Math.atan2(z - CIRCLE.z, x - CIRCLE.x)) < 0.4))) continue;
    // (its arm reaching in over the carriageway, towards the island)
    addLamp(x, z, Math.atan2(z - CIRCLE.z, CIRCLE.x - x));
  }
}

/** Uptown's streets (uptown.ts), clean (`drawUptown()`); the lamps along its avenues and cross streets; the axis's zebras over them */
export function buildUptownStreets() {
  keepTreesOff(UPTOWN_RECT);
  drawUptown();
  for (const [x, z, ry] of UPTOWN_LAMPS) addLamp(x, z, ry);
  // Zebras where the Mall's axis crosses each avenue and cross street (either side of an avenue's median)
  const zs: THREE.Matrix4[] = [];
  for (const r of AXIS_ZEBRAS)
    for (let k = r.z - r.half + 0.16; k < r.z + r.half - 0.1; k += 0.32) if (r.half < 2 || Math.abs(k - r.z) > MEDIAN / 2 + 0.1) mark(zs, AXIS_X, k, LANE_HALF * 2, 0.17, 0.04);
  site('uptown axis zebras', [AXIS_X - 3, AXIS_ZEBRAS[0].z - 5, AXIS_X + 3, AXIS_ZEBRAS.at(-1)!.z + 5], (into) => {
    const b = new Batch();
    b.instances(unit, toon('#e8e4f8'), zs);
    b.build(into, { cast: false, receive: true });
  });
}
