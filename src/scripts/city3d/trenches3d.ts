/*
 * The Trenches on screen, step 1 (docs/growth-plan.md Phase 9; the numbers
 * are trenches.ts): its streets as sites (tilework.ts), built as you go like
 * the rest of the fixed city: asphalt, Trench Avenue's median (broken at
 * its junctions; the el's pillars stand in it), lane lines (a yellow centre
 * line down the streets, white dashes between the avenue's lanes), zebra
 * crossings on every arm of every junction, and street lamps along both
 * sides. Its blocks are the street plan's (world.ts draws their slabs and
 * lawns). The towers, brownstones and The Block come in the next steps.
 */
import * as THREE from 'three';
import { Batch, neon, toon } from './kit';
import { LANE, MEDIAN } from './layout';
import { SLAB, addLamp, keepTreesOff } from './world';
import { site } from './tilework';
import { TRENCH_CROSSINGS, TRENCH_RECT, TRENCH_STREETS, type TrenchStreet } from './trenches';
import { PLAN } from './streetplan';
import type { Rect } from './downtown';

/** A street's stretches between its crossings (and the avenues it meets at its ends): from, to, along x or z */
function stretches(s: TrenchStreet) {
  const [a, b] = s.pts;
  const alongX = a[1] === b[1];
  const ax = alongX ? 0 : 1;
  const lo = Math.min(a[ax], b[ax]);
  const hi = Math.max(a[ax], b[ax]);
  // Every crossing on it, the street across's half width there
  const cuts = TRENCH_CROSSINGS.filter((c) => c.streets.includes(s.id))
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

/** The Trenches' streets, each stretch a site; and the lamps along them (before the city's lamps are built) */
export function buildTrenches() {
  keepTreesOff(TRENCH_RECT);
  const asphalt = toon('#26243f');
  const kerbTop = toon('#5a5290');
  const median = toon('#3f5a4a');
  const yellow = neon('#f5d76e', 0.9, 1.1);
  const white = toon('#d9d5ee');
  const zebra = toon('#e8e4f8');
  const unit = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  /** A flat mark at x, z, w along x and d along z */
  const mark = (list: THREE.Matrix4[], x: number, z: number, w: number, d: number, y: number) => list.push(m.clone().compose(new THREE.Vector3(x, y, z), q.identity(), new THREE.Vector3(w, 1, d)));

  for (const s of TRENCH_STREETS) {
    const { alongX, c, runs, cuts } = stretches(s);
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
      site(`trench street ${s.id} ${k}`, rect, (into) => {
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
  for (const c of TRENCH_CROSSINGS) {
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
    site(`trench crossing ${c.id}`, [c.at[0] - r, c.at[1] - r, c.at[0] + r, c.at[1] + r], (into) => {
      const b = new Batch();
      b.instances(unit, zebra, zs);
      b.build(into, { cast: false, receive: true });
    });
  }
}
