/*
 * Riverside Raceway's grounds and track drawn (docs/kart-harbour-plan.md, Phase 3), behind `?karts=new`: a district
 * loaded as you approach (districts.ts `LAZY_DISTRICTS` id `karts2`, only with the switch on; the site worker loads it
 * too). The numbers are kartcircuit2.ts (the circuit, the pit lane), kartpark2.ts (the site's ground: the hill, the
 * cuttings, the west bank) and kartcourse2.ts (the courses as raced, the tunnel's and cuttings' walls).
 *
 * As sites (Batches only, built as you go):
 * - The ground: the lawn over the site, the hill and the west bank as a grid laid on `kart2Ground()` (left out where
 *   the run-off and the tunnel's roof are drawn), the run-off (grass laid on the park's ground out to CLEAR2, gravel on
 *   the outside of the flat bends).
 * - The track, swept along its centre line: asphalt with edge lines, red-and-white kerbs; the tunnel (its walls, its
 *   ceiling, its roof's top in the hill, the portals and their frames, neon strips inside); the cuttings' retaining
 *   walls; the start's chequered line, both ways' grid boxes and the gantry; the pit lane.
 * - Trackside: armco along the run-off's edge where it's clear of the rest of the lap and the pits, tyre walls round
 *   the outside of the tight bends, catch fencing along the riverside straight (where the grandstand goes, Phase 4).
 */
import * as THREE from 'three';
import { Batch, PAL, neon, place, toon } from './kit';
import { site } from './tilework';
import { CIRCUIT2, CLEAR2, KERB2, PIT2_HALF, PIT2_LANE, SITE2, TRACK2_HALF, TUNNEL_CLEAR, type Pt } from './kartcircuit2';
import { CUTTING_HALF, hillAt, kart2Ground, kart2GroundAt } from './kartpark2';
import { F_CUT, RIVER_COURSES, WALL2_T, gridSlots2Of } from './kartcourse2';
import { F, frame, type Line } from './kartpark';
import { buildFx, chainMesh } from './grime';
import type { Tick } from './world';
import { COVER, ROAD as PAL_ROAD } from './palette';

export const SELF = import.meta.url;

/** Heights over their ground: the lawn, the hill's grid, the run-off, the gravel, the asphalt, its lines and kerbs, the pit lane, paint */
const LAWN = 0.006;
const HILL_LIFT = 0.004;
const ROOF_LIFT = 0.012;
const RUNOFF_Y = 0.016;
const GRAVEL_Y = 0.024;
const RIBBON = 0.035;
const LINE_Y = 0.045;
const KERB_Y = 0.05;
const PIT_Y = 0.04;
const PAINT_Y = 0.052;
const EDGE = TRACK2_HALF + KERB2;
/** How wide the tunnel's roof's top is laid in the hill, and the hill's grid left out round it */
const ROOF_SPAN = EDGE + 0.7;

const ASPHALT = toon(PAL_ROAD.asphalt);
const LAWN_C = toon(COVER.lawn);
const GRASS = toon('#3a8a5b');
const HILL_C = toon('#357f55');
const GRAVEL = toon('#c2a878');
const CONCRETE = toon(COVER.concrete);
const PIT_C = toon('#34314f');
const INK = toon('#1b1830');
const STEEL = toon('#2b2a40');
const ARMCO = toon('#b9bccb');
const WHITE = toon('#e8e6f0');
const LINE_C = toon(PAL_ROAD.line);
const PAINT = toon(PAL_ROAD.zebra);
const RED = toon('#e23b3b');
const TUNNEL_IN = toon('#2b2550');
const CEILING = toon('#141226');
const PORTAL = toon('#4a3f7a');
const TYRE = toon('#17151f');
const soft = (c: string) => neon(c, 0.5, 1.3);

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const Z = new THREE.Vector3(0, 0, 1);

/** The forward course (the one surface; the reverse runs it the other way) */
const C: Line = RIVER_COURSES.riverside;
const N = C.x.length;
const flags = (i: number) => C.flags[((i % N) + N) % N];
const tunnel = (i: number) => !!(flags(i) & F.tunnel) && !(flags(i) & F_CUT);
const cut = (i: number) => !!(flags(i) & F_CUT);

/* ---------- Near the track: which samples are near a point (a bucket grid) ---------- */

const CELL = 4;
const [GX0, GZ0] = [SITE2.x0 - 10, SITE2.z0 - 10];
const GW = Math.ceil((SITE2.x1 - SITE2.x0 + 20) / CELL);
const GH = Math.ceil((SITE2.z1 - SITE2.z0 + 20) / CELL);
const CELLS: number[][] = Array.from({ length: GW * GH }, () => []);
for (let i = 0; i < N; i++) {
  const [a, b] = [Math.floor((C.x[i] - GX0) / CELL), Math.floor((C.z[i] - GZ0) / CELL)];
  if (a >= 0 && b >= 0 && a < GW && b < GH) CELLS[b * GW + a].push(i);
}
/** The samples within `r` of a point (any that `keep` says yes to), nearest first is not promised */
function near(x: number, z: number, r: number, keep: (i: number) => boolean = () => true): number[] {
  const out: number[] = [];
  const k = Math.ceil(r / CELL);
  const [a0, b0] = [Math.floor((x - GX0) / CELL), Math.floor((z - GZ0) / CELL)];
  for (let a = a0 - k; a <= a0 + k; a++)
    for (let b = b0 - k; b <= b0 + k; b++) {
      if (a < 0 || b < 0 || a >= GW || b >= GH) continue;
      for (const i of CELLS[b * GW + a]) if ((C.x[i] - x) ** 2 + (C.z[i] - z) ** 2 <= r * r && keep(i)) out.push(i);
    }
  return out;
}
/** Whether another stretch of the lap (more than `apart` along from sample `i`) is within `r` of a point */
const otherNear = (x: number, z: number, r: number, i: number, apart = 30) =>
  near(x, z, r).some((j) => {
    const d = Math.abs(j - i);
    return Math.min(d, N - d) * C.step > apart;
  });
/** How far a point is from the pit lane's middle */
function pitDistance(x: number, z: number) {
  let best = Infinity;
  for (let k = 0; k < PIT2_LANE.x.length; k++) best = Math.min(best, Math.hypot(PIT2_LANE.x[k] - x, PIT2_LANE.z[k] - z));
  return best;
}

/* ---------- Sweeps along the course ---------- */

/** A cross-section point: lateral (left positive) and its height, given the sample */
type XPt = [lat: number, h: (i: number, lat: number) => number];
/** The point at a lateral from a sample (the left normal is (tz, -tx)) */
const side = (i: number, lat: number): Pt => [C.x[i] + C.tz[i] * lat, C.z[i] - C.tx[i] * lat];
/** On the road's plane (no banking here), lifted */
const onRoad = (lift: number) => (i: number) => C.y[i] + lift;
/** On the park's ground at the point, lifted */
const onLand = (lift: number) => (i: number, lat: number) => kart2GroundAt(...side(i, lat)) + lift;
/** On the hill alone (no cutting), lifted: the tunnel's roof's top */
const onHill = (lift: number) => (i: number, lat: number) => {
  const [x, z] = side(i, lat);
  return hillAt(x - SITE2.x0, z - SITE2.z0) + lift;
};

/**
 * Quads swept along the course through the consecutive samples `run`, one strip per edge of the cross-section `poly`.
 * A section walked from a lower lateral to a higher one faces up; on the left side going up faces the road, on the
 * right going down does.
 */
function sweep(run: number[], poly: XPt[]) {
  const m = run.length;
  const E = poly.length - 1;
  const pos = new Float32Array(E * m * 2 * 3);
  const idx: number[] = [];
  let v = 0;
  for (let e = 0; e < E; e++) {
    const base = v;
    for (let k = 0; k < m; k++) {
      const i = ((run[k] % N) + N) % N;
      for (let j = 0; j < 2; j++) {
        const [l, h] = poly[e + j];
        const [x, z] = side(i, l);
        pos[v * 3] = Math.max(SITE2.x0 + 0.1, Math.min(SITE2.x1 - 0.1, x));
        pos[v * 3 + 1] = h(i, l);
        pos[v * 3 + 2] = Math.max(SITE2.z0 + 0.1, Math.min(SITE2.z1 - 0.1, z));
        v++;
      }
      if (k) {
        const a = base + (k - 1) * 2;
        const d = base + k * 2;
        idx.push(a, d, a + 1, a + 1, d, d + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/** Runs of consecutive samples that `keep` says yes to round the loop, each with the sample after its last */
function runs(keep: (i: number) => boolean) {
  const yes = Array.from({ length: N }, (_, i) => keep(i));
  if (yes.every(Boolean)) return [[...Array(N).keys(), 0]];
  const start = yes.findIndex((y, i) => y && !yes[(i - 1 + N) % N]);
  if (start < 0) return [];
  const out: number[][] = [];
  let cur: number[] = [];
  for (let k = 0; k < N; k++) {
    const i = (start + k) % N;
    if (yes[i]) cur.push(i);
    else if (cur.length) {
      out.push([...cur, i]);
      cur = [];
    }
  }
  if (cur.length) out.push([...cur, (cur[cur.length - 1] + 1) % N]);
  return out.filter((r) => r.length > 1);
}
/** Long runs cut into pieces of about `len` samples (sharing their ends) */
const pieces = (run: number[], len = 40) => {
  const out: number[][] = [];
  for (let k = 0; k < run.length - 1; k += len) out.push(run.slice(k, k + len + 1));
  return out;
};
/** A flat strip between two laterals at a height, facing up */
const strip = (l0: number, l1: number, h: XPt[1]): XPt[] => [
  [Math.min(l0, l1), h],
  [Math.max(l0, l1), h],
];
/** A strip across laterals l0 to l1 (l0 < l1) laid on a height in steps of about `step`, facing up */
function laid(l0: number, l1: number, h: XPt[1], step = 0.6): XPt[] {
  const n = Math.max(1, Math.ceil((l1 - l0) / step));
  return Array.from({ length: n + 1 }, (_, k): XPt => [l0 + ((l1 - l0) * k) / n, h]);
}
/** A square beam between two points */
function beam(b: Batch, a: THREE.Vector3, c: THREE.Vector3, t: number, mat: THREE.Material, tall = t) {
  const dir = c.clone().sub(a);
  const len = dir.length();
  const g = unitBox.clone();
  g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(Z, dir.normalize()), V(t, tall, len)));
  b.add(g, mat);
}
/** A quad through four corners, wound to face `facing` */
function quad(p: THREE.Vector3[], facing: THREE.Vector3) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(p.flatMap((q) => [q.x, q.y, q.z])), 3));
  const nrm = p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0]));
  g.setIndex(nrm.dot(facing) > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
  g.computeVertexNormals();
  return g;
}
/** A flat rectangle on the ground, cut into pieces no longer than `len` */
function flatRect(b: Batch, x0: number, z0: number, x1: number, z1: number, y: number, mat: THREE.Material, len = 14) {
  const nx = Math.max(1, Math.ceil((x1 - x0) / len));
  const nz = Math.max(1, Math.ceil((z1 - z0) / len));
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const [a0, a1] = [x0 + ((x1 - x0) * i) / nx, x0 + ((x1 - x0) * (i + 1)) / nx];
      const [c0, c1] = [z0 + ((z1 - z0) * j) / nz, z0 + ((z1 - z0) * (j + 1)) / nz];
      b.add(new THREE.PlaneGeometry(a1 - a0, c1 - c0).rotateX(-Math.PI / 2).translate((a0 + a1) / 2, y, (c0 + c1) / 2), mat);
    }
}
/** A run's world rect, grown by `m` */
function runRect(run: number[], m: number): [number, number, number, number] {
  const xs = run.map((i) => C.x[i]);
  const zs = run.map((i) => C.z[i]);
  return [Math.max(SITE2.x0, Math.min(...xs) - m), Math.max(SITE2.z0, Math.min(...zs) - m), Math.min(SITE2.x1, Math.max(...xs) + m), Math.min(SITE2.z1, Math.max(...zs) + m)];
}

/* ---------- The ground ---------- */

/** Where the hill's grid is left out: under the run-off's grass (drawn on the same ground) and the tunnel's roof */
function covered(x: number, z: number) {
  return near(x, z, CLEAR2 - 0.25, (i) => !tunnel(i)).length > 0 || near(x, z, ROOF_SPAN - 0.2, tunnel).length > 0;
}
/** The hill and the west bank in a square of the site (u0, v0 its corner, `n` tiles a side): a grid a tile a cell */
function hillPiece(b: Batch, u0: number, v0: number, n: number) {
  const pos: number[] = [];
  const idx: number[] = [];
  const H: number[] = [];
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++) {
      const [u, v] = [u0 + i, v0 + j];
      const h = kart2Ground(u, v);
      H.push(h);
      pos.push(SITE2.x0 + u, h + HILL_LIFT, SITE2.z0 + v);
    }
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i;
      const q = [a, a + 1, a + n + 1, a + n + 2];
      if (Math.max(...q.map((k) => H[k])) < 0.02) continue;
      // (left out only where all its corners are under the run-off or the tunnel's roof: under their edges it carries
      // on, a little lower, so no cut edge shows)
      if ([[0, 0], [1, 0], [0, 1], [1, 1]].every(([a, c]) => covered(SITE2.x0 + u0 + i + a, SITE2.z0 + v0 + j + c))) continue;
      idx.push(a, a + n + 1, a + 1, a + 1, a + n + 1, a + n + 2);
    }
  if (!idx.length) return;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  b.add(g, HILL_C);
}

/** The run-off: grass laid on the park's ground from the kerb's edge to CLEAR2, gravel on the outside of the flat bends */
function runoff(b: Batch, run: number[]) {
  for (const s of [1, -1]) b.add(sweep(run, s > 0 ? laid(EDGE, CLEAR2, onLand(RUNOFF_Y)) : laid(-CLEAR2, -EDGE, onLand(RUNOFF_Y))), GRASS);
  const outside = (i: number) => (Math.abs(C.k[i]) > 1 / 25 ? -Math.sign(C.k[i]) : 0);
  const flat = (i: number) => Math.abs(kart2GroundAt(...side(i, outside(i) * (CLEAR2 - 0.8))) - C.y[i]) < 0.08;
  for (const sd of [1, -1]) {
    let part: number[] = [];
    const flush = () => {
      if (part.length > 1) b.add(sweep(part, sd > 0 ? laid(EDGE + 0.5, CLEAR2 - 0.8, onLand(GRAVEL_Y)) : laid(-(CLEAR2 - 0.8), -(EDGE + 0.5), onLand(GRAVEL_Y))), GRAVEL);
      part = [];
    };
    for (const i of run) {
      if (outside(i) === sd && !cut(i) && flat(i)) part.push(i);
      else {
        if (part.length) part.push(i);
        flush();
      }
    }
    flush();
  }
}

/* ---------- The track ---------- */

/** The asphalt, its edge lines and the kerbs: red and white blocks a tile each, both sides */
function asphalt(b: Batch, run: number[]) {
  b.add(sweep(run, strip(-TRACK2_HALF, TRACK2_HALF, onRoad(RIBBON))), ASPHALT);
  for (const s of [1, -1]) b.add(sweep(run, strip(s * (TRACK2_HALF - 0.18), s * (TRACK2_HALF - 0.06), onRoad(LINE_Y))), LINE_C);
  for (let j = 0; j + 1 < run.length; j += 2) {
    const chunk = run.slice(j, j + 3);
    for (const s of [1, -1]) b.add(sweep(chunk, strip(s * TRACK2_HALF, s * EDGE, onRoad(KERB_Y))), Math.floor(run[j] / 2) % 2 ? WHITE : RED);
  }
}

/** The tunnel: its walls and ceiling (facing in), its roof's top in the hill, its portals and their frames, neon inside */
function tunnelRun(b: Batch, run: number[], low: boolean) {
  const floor = onRoad(0);
  const ceil = onRoad(TUNNEL_CLEAR);
  b.add(sweep(run, [[EDGE, floor], [EDGE, ceil]]), TUNNEL_IN);
  b.add(sweep(run, [[-EDGE, ceil], [-EDGE, floor]]), TUNNEL_IN);
  b.add(sweep(run, [[EDGE, ceil], [-EDGE, ceil]]), CEILING);
  // (its roof's top, where the hill's grid is left out; under the run-off of the run over it, the run-off's own)
  const open = (i: number) => near(C.x[i], C.z[i], CLEAR2 - ROOF_SPAN, (j) => !tunnel(j)).length === 0;
  let part: number[] = [];
  const flush = () => {
    if (part.length > 1) b.add(sweep(part, laid(-ROOF_SPAN, ROOF_SPAN, onHill(ROOF_LIFT))), HILL_C);
    part = [];
  };
  for (const i of run) {
    if (open(i)) part.push(i);
    else {
      if (part.length) part.push(i);
      flush();
    }
  }
  flush();
  // Neon strips along the walls inside
  for (const s of [1, -1]) {
    const l = s * (EDGE - 0.02);
    b.add(sweep(run, s > 0 ? [[l, onRoad(1.5)], [l, onRoad(1.65)]] : [[l, onRoad(1.65)], [l, onRoad(1.5)]]), soft(s > 0 ? PAL.cyan : PAL.pink));
  }
  // Ribs across the ceiling
  if (!low) for (let k = 3; k < run.length - 3; k += 6) b.add(sweep(run.slice(k, k + 2), [[EDGE - 0.01, onRoad(TUNNEL_CLEAR - 0.12)], [-EDGE + 0.01, onRoad(TUNNEL_CLEAR - 0.12)]]), INK);
  // The portals: the hill's face over the opening, facing out, and a frame round it
  for (const [i, out] of [
    [run[0], -1],
    [run[run.length - 1], 1],
  ] as const) {
    const f = frame(C, i * C.step);
    const facing = V(f.tx * out, 0, f.tz * out);
    const at = (lat: number, y: number) => V(f.x + f.nx * lat, y, f.z + f.nz * lat);
    const top = (lat: number) => hillAt(f.x + f.nx * lat - SITE2.x0, f.z + f.nz * lat - SITE2.z0) + ROOF_LIFT;
    const lats = [-ROOF_SPAN, -EDGE, 0, EDGE, ROOF_SPAN];
    for (let k = 0; k + 1 < lats.length; k++) {
      const [l0, l1] = [lats[k], lats[k + 1]];
      const y0 = Math.abs(l0) <= EDGE + 1e-6 && Math.abs(l1) <= EDGE + 1e-6 ? f.y + TUNNEL_CLEAR : f.y;
      b.add(quad([at(l0, y0), at(l1, y0), at(l1, Math.max(y0 + 0.05, top(l1))), at(l0, Math.max(y0 + 0.05, top(l0)))], facing), CONCRETE);
    }
    const lift = (p: THREE.Vector3) => p.add(V(f.tx * out * 0.05, 0, f.tz * out * 0.05));
    beam(b, lift(at(-EDGE - 0.25, f.y + TUNNEL_CLEAR + 0.15)), lift(at(EDGE + 0.25, f.y + TUNNEL_CLEAR + 0.15)), 0.3, PORTAL);
    for (const s of [1, -1]) beam(b, lift(at(s * (EDGE + 0.12), f.y)), lift(at(s * (EDGE + 0.12), f.y + TUNNEL_CLEAR + 0.3)), 0.25, PORTAL);
  }
}

/** A cutting's retaining walls: from the road up to the hill beside it, facing the road, with a coping on top */
function cuttingRun(b: Batch, run: number[]) {
  for (const s of [1, -1]) {
    const top = (i: number) => Math.max(C.y[i] + 0.3, kart2GroundAt(...side(i, s * (EDGE + WALL2_T))) + 0.06);
    b.add(sweep(run, s > 0 ? [[EDGE, onRoad(0)], [EDGE, top]] : [[-EDGE, top], [-EDGE, onRoad(0)]]), CONCRETE);
    b.add(sweep(run, s > 0 ? [[EDGE, top], [EDGE + 0.35, top]] : [[-EDGE - 0.35, top], [-EDGE, top]]), toon(COVER.paving));
  }
}

/** The start: the chequered line, both ways' grid boxes, the gantry over the line */
function start(b: Batch, low: boolean) {
  const c = RIVER_COURSES.riverside;
  const f = frame(c, c.start);
  const sq = 0.4;
  const n = Math.ceil((TRACK2_HALF * 2) / sq);
  for (let r = 0; r < 2; r++)
    for (let k = 0; k < n; k++) {
      const lat = -TRACK2_HALF + (k + 0.5) * (TRACK2_HALF * 2) / n;
      const ahead = (r - 0.5) * sq;
      const cx = f.x + f.tx * ahead + f.nx * lat;
      const cz = f.z + f.tz * ahead + f.nz * lat;
      b.add(new THREE.PlaneGeometry(sq, (TRACK2_HALF * 2) / n).rotateX(-Math.PI / 2).rotateY(Math.atan2(-f.tz, f.tx)).translate(cx, f.y + PAINT_Y, cz), (r + k) % 2 ? INK : WHITE);
    }
  for (const course of [RIVER_COURSES.riverside, RIVER_COURSES['riverside-reverse']])
    for (const slot of gridSlots2Of(course)) {
      const sf = frame(course, slot.s - 0.7);
      const cx = sf.x + sf.nx * slot.lateral;
      const cz = sf.z + sf.nz * slot.lateral;
      const ry = Math.atan2(-sf.tz, sf.tx);
      b.add(new THREE.PlaneGeometry(0.12, 1.5).rotateX(-Math.PI / 2).rotateY(ry).translate(cx, sf.y + PAINT_Y, cz), PAINT);
      for (const s of [1, -1]) b.add(new THREE.PlaneGeometry(0.6, 0.1).rotateX(-Math.PI / 2).rotateY(ry).translate(cx + sf.tx * 0.3 + sf.nx * s * 0.72, sf.y + PAINT_Y, cz + sf.tz * 0.3 + sf.nz * s * 0.72), PAINT);
    }
  // The gantry: two posts past the kerbs, a beam over the line, the start lights along it
  const H = 4.2;
  const post = (s: number) => [f.x + f.nx * s * (EDGE + 0.6), f.z + f.nz * s * (EDGE + 0.6)] as const;
  for (const s of [1, -1]) {
    const [x, z] = post(s);
    b.box(x - 0.15, f.y, z - 0.15, 0.3, H, 0.3, STEEL);
  }
  const [ax, az] = post(1);
  const [bx, bz] = post(-1);
  beam(b, V(ax, f.y + H, az), V(bx, f.y + H, bz), 0.45, INK, 0.7);
  if (!low)
    for (let k = 0; k < 5; k++) {
      const t = (k + 1) / 6;
      b.add(place(new THREE.SphereGeometry(0.14, 8, 6), ax + (bx - ax) * t - f.tx * 0.3, f.y + H - 0.55, az + (bz - az) * t - f.tz * 0.3), neon('#ff3b3b', 0.6, 1.6));
    }
}

/** The pit lane: paved on the park's ground between its edge lines */
function pitLane(b: Batch) {
  const { x, z } = PIT2_LANE;
  const n = x.length;
  const pos: number[] = [];
  const idx: number[] = [];
  const lines: number[][] = [[], []];
  for (let k = 0; k < n; k++) {
    const [a, c] = [Math.max(0, k - 1), Math.min(n - 1, k + 1)];
    const d = Math.hypot(x[c] - x[a], z[c] - z[a]) || 1;
    const [nx, nz] = [(z[c] - z[a]) / d, -(x[c] - x[a]) / d];
    for (const s of [1, -1]) {
      const [px, pz] = [x[k] + nx * s * PIT2_HALF, z[k] + nz * s * PIT2_HALF];
      pos.push(px, kart2GroundAt(px, pz) + PIT_Y, pz);
      lines[s > 0 ? 0 : 1].push(px - nx * s * 0.12, pz - nz * s * 0.12);
    }
    if (k) idx.push((k - 1) * 2, k * 2, (k - 1) * 2 + 1, (k - 1) * 2 + 1, k * 2, k * 2 + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  // (wound to face up whichever way the lane runs: its first triangle as indexed, 0, 2, 1)
  const P = (k: number) => new THREE.Vector3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]);
  const up = P(2).sub(P(0)).cross(P(1).sub(P(0))).y > 0;
  g.setIndex(up ? idx : idx.map((_, k) => idx[k - (k % 3) + [0, 2, 1][k % 3]]));
  g.computeVertexNormals();
  b.add(g, PIT_C);
  for (const l of lines)
    for (let k = 2; k < l.length; k += 2) {
      const [ax, az, cx, cz] = [l[k - 2], l[k - 1], l[k], l[k + 1]];
      const len = Math.hypot(cx - ax, cz - az);
      if (len < 0.01) continue;
      b.add(new THREE.PlaneGeometry(len + 0.02, 0.1).rotateX(-Math.PI / 2).rotateY(Math.atan2(-(cz - az), cx - ax)).translate((ax + cx) / 2, kart2GroundAt((ax + cx) / 2, (az + cz) / 2) + PIT_Y + 0.006, (az + cz) / 2), PAINT);
    }
}

/* ---------- Trackside ---------- */

/** How far out the barriers stand, and the tyre walls' bends (tighter than this radius) */
export const BARRIER2_OUT = CLEAR2 + 0.3;
const TYRE_BEND = 1 / 16;
/** Whether a barrier may stand at a sample's side: open track, in the site, clear of the rest of the lap and the pits */
function barrierOk(i: number, s: number) {
  if (flags(i) & F.tunnel) return false;
  const [x, z] = side(i, s * BARRIER2_OUT);
  if (x < SITE2.x0 + 0.8 || x > SITE2.x1 - 0.8 || z < SITE2.z0 + 0.8 || z > SITE2.z1 - 0.8) return false;
  if (otherNear(x, z, CLEAR2 + 0.4, i)) return false;
  return pitDistance(x, z) > PIT2_HALF + 1.2;
}
const tyreSide = (i: number) => (Math.abs(C.k[i]) > TYRE_BEND ? -Math.sign(C.k[i]) : 0);

/** Armco along the run-off's edge (both faces of its rail, posts every two tiles), tyre walls round the tight bends' outsides */
function barriers(b: Batch, low: boolean, run: number[]) {
  for (const s of [1, -1]) {
    let part: number[] = [];
    const flush = () => {
      if (part.length > 2) {
        const l = s * BARRIER2_OUT;
        const g = (lift: number) => (i: number) => kart2GroundAt(...side(i, l)) + lift;
        b.add(sweep(part, s > 0 ? [[l - 0.04, g(0.36)], [l - 0.04, g(0.62)]] : [[l + 0.04, g(0.62)], [l + 0.04, g(0.36)]]), ARMCO);
        b.add(sweep(part, s > 0 ? [[l + 0.04, g(0.62)], [l + 0.04, g(0.36)]] : [[l - 0.04, g(0.36)], [l - 0.04, g(0.62)]]), ARMCO);
        for (let k = 0; k < part.length; k += 4) {
          const [x, z] = side(part[k], l);
          b.box(x - 0.05, kart2GroundAt(x, z), z - 0.05, 0.1, 0.6, 0.1, STEEL);
        }
      }
      part = [];
    };
    for (const i of run) {
      if (barrierOk(i, s) && tyreSide(i) !== s) part.push(i);
      else flush();
    }
    flush();
  }
  // The tyre walls: stacks of two, a stack every 0.75 tiles
  b.detail(() => {
    const ring = new THREE.CylinderGeometry(0.33, 0.33, 0.24, low ? 6 : 9);
    let last: Pt | null = null;
    for (const i of run) {
      const s = tyreSide(i);
      if (!s || !barrierOk(i, s)) continue;
      const [x, z] = side(i, s * BARRIER2_OUT);
      if (last && Math.hypot(x - last[0], z - last[1]) < 0.72) continue;
      last = [x, z];
      const y = kart2GroundAt(x, z);
      for (let h = 0; h < 2; h++) b.add(place(ring, x, y + 0.12 + h * 0.25, z), h ? WHITE : TYRE);
    }
  });
}

/** Catch fencing along the riverside straight's north side (in front of where the grandstand goes): posts, a top rail, the mesh */
function catchFence(b: Batch, fxb: Batch) {
  const run: number[] = [];
  for (let i = 0; i < N; i++) {
    const v = C.z[i] - SITE2.z0;
    if (v < 32 && Math.abs(C.k[i]) < 1 / 40 && !(flags(i) & F.tunnel)) run.push(i);
  }
  const H = 2.6;
  const out = CLEAR2 + 1.2;
  let prev: Pt | null = null;
  let prevI = -10;
  for (let k = 0; k < run.length; k += 6) {
    const i = run[k];
    // (the left of the forward course along the north is the river side)
    const pick = [1, -1].find((s) => side(i, s * out)[1] < C.z[i]) ?? 1;
    const p = side(i, pick * out);
    if (p[1] < SITE2.z0 + 0.6 || otherNear(p[0], p[1], CLEAR2 + 0.6, i)) {
      prev = null;
      continue;
    }
    b.box(p[0] - 0.05, 0, p[1] - 0.05, 0.1, H, 0.1, STEEL);
    if (prev && i - prevI <= 6) {
      beam(b, V(prev[0], H, prev[1]), V(p[0], H, p[1]), 0.05, STEEL);
      chainMesh(fxb, prev, p, 0.05, H - 0.1);
    }
    prev = p;
    prevI = i;
  }
}

export function register({ low }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  // The lawn over the site
  site('riverside lawn', [SITE2.x0, SITE2.z0, SITE2.x1, SITE2.z1], (into) => {
    const b = new Batch();
    flatRect(b, SITE2.x0 + 0.2, SITE2.z0 + 0.2, SITE2.x1 - 0.2, SITE2.z1 - 0.2, LAWN, LAWN_C, 25);
    b.build(into, { cast: false, receive: true });
  });
  // The hill and the west bank, in squares of the site
  const SQ = 25;
  for (let u0 = 0; u0 < SITE2.x1 - SITE2.x0; u0 += SQ)
    for (let v0 = 0; v0 < SITE2.z1 - SITE2.z0; v0 += SQ) {
      site(`riverside hill ${u0} ${v0}`, [SITE2.x0 + u0, SITE2.z0 + v0, SITE2.x0 + u0 + SQ, SITE2.z0 + v0 + SQ], (into) => {
        const b = new Batch();
        hillPiece(b, u0, v0, SQ);
        b.build(into, { cast: false, receive: true });
      });
    }
  // The track in pieces round the lap (the run-off, the asphalt, the tunnel and cuttings, the barriers)
  const all = runs(() => true)[0];
  for (const part of pieces(all, 60)) {
    site(`riverside track ${part[0]}`, runRect(part, CLEAR2 + 1.5), (into) => {
      const b = new Batch();
      for (const r of runs((i) => part.includes(i) && i !== part[part.length - 1] && !tunnel(i))) for (const p of pieces(r)) runoff(b, p);
      asphalt(b, part);
      for (const r of runs((i) => part.includes(i) && i !== part[part.length - 1] && cut(i))) cuttingRun(b, r);
      barriers(b, low, part);
      b.build(into);
    });
  }
  site('riverside tunnel', runRect(runs(tunnel).flat(), ROOF_SPAN + 2), (into) => {
    const b = new Batch();
    for (const r of runs(tunnel)) tunnelRun(b, r, low);
    b.build(into);
  });
  const c = RIVER_COURSES.riverside;
  const sf = frame(c, c.start);
  site('riverside start', [sf.x - 26, sf.z - 8, sf.x + 8, sf.z + 8], (into) => {
    const b = new Batch();
    start(b, low);
    b.build(into);
  });
  site('riverside pit lane', [Math.min(...PIT2_LANE.x) - 2, Math.min(...PIT2_LANE.z) - 2, Math.max(...PIT2_LANE.x) + 2, Math.max(...PIT2_LANE.z) + 2], (into) => {
    const b = new Batch();
    pitLane(b);
    b.build(into, { cast: false, receive: true });
  });
  site('riverside catch fence', [SITE2.x0, SITE2.z0, SITE2.x1, SITE2.z0 + 40], (into) => {
    const b = new Batch();
    const fxb = new Batch();
    catchFence(b, fxb);
    b.build(into);
    buildFx(fxb, into);
  });
}

/** (for the tests: the drawn tunnel's samples, and the cutting's half width the drawing leaves at the road's level) */
export const DRAWN = { tunnel: runs(tunnel).flat().length, cuttingHalf: CUTTING_HALF, points: CIRCUIT2.x.length };
