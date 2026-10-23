/*
 * The kart park's grounds (the north side's stage 2, docs/north-plan.md):
 * everything round the circuit but the place itself (the hut, the garages,
 * the stands, the timing tower and the gate are built at the boot,
 * kartpark3d.ts). A district loaded as you approach (`LAZY_DISTRICTS` in
 * districts.ts: its own chunk; the site worker loads it too). The numbers
 * are kartcircuit.ts (the circuit, the pits), kartfacility.ts (everything
 * round it) and kartpark.ts (the site, Kart Road, the car park's loop).
 *
 * As sites (Batches only, built as you go):
 * - The ground: the lawn, the paving (the pits' strip, the plaza inside the
 *   gate, the paddock, the stand's pad), the run-off (grass, gravel on the
 *   outside of the bends, easing down from the kerb to the lawn: the sim's
 *   own `groundAt()`), the three grass banks (`bankAt()`).
 * - The circuit, swept once along its centre line: asphalt with edge lines,
 *   red-and-white kerbs, the flyover's railed deck on its columns, the
 *   tunnel's tube, the jump's striped lip, the banked sweepers' bands and
 *   bunting; the start's grid boxes and gantry; the pit lane and its bays.
 * - Trackside: armco along the run-off's edge, tyre walls round the outside
 *   of the bends, catch fencing in front of the stands and banks (the mesh
 *   in the FX layer), marshal posts with their flags and booths, the
 *   floodlight towers (their lamps lit at night), the fence with its gap at
 *   the gate.
 * - The paddock's team tents with karts on stands, tool chests and tyres;
 *   the plaza's flags, benches and bollards.
 * - Kart Road (asphalt, a dashed line, the sidewalk on its north side), the
 *   car park's loop and the car park (bays, one-way arrows, a P sign).
 *
 * On the main thread (textures, and what changes): the chequered start line
 * and the gantry's banner, the cones that close the pit lane in a race and
 * each course's guidance (boost pad chevrons, chevron boards, arrows, corner
 * numbers, braking markers: `KART_VIEW` in kartpark3d.ts says which, and
 * whether a race is on).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Batch, FONT_DISPLAY, PAL, canvasTex, fx, lit, neon, place, toon } from './kit';
import { site } from './tilework';
import { F, GATE, KART_PARK, LOOP, ROAD, frame, toLocal, toWorld, type Frame, type Line, type Pt } from './kartpark';
import { BAYS, CIRCUIT, CLEAR, COURSES, COURSE_IDS, GANTRY, KERB, PIT_HALF, PIT_LANE, SITE, SUPPORTS, TRACK_HALF, enclosed, gridSlots, groundAt, type Course, type CourseId } from './kartcircuit';
import {
  ARMCO_H,
  BANKS,
  BARRIERS,
  BAY,
  BAYS as CAR_BAYS,
  CAR_PARK,
  CATCH,
  CATCH_H,
  FLOOD,
  FLOODLIGHTS,
  GRANDSTAND,
  PADDOCK,
  PLAZA,
  SIDEWALK,
  TENT,
  TENTS,
  TOWER,
  TYRE_R,
  TYRE_WALLS,
  bankAt,
  circuitDistance,
  type LRect,
} from './kartfacility';
import { CELL_ARROW, CELL_CHEVRON, atlasTex, cellMarker, cellNumber, chequerBands, glowText, quad, spacing } from './kartsigns';
import { KART_VIEW } from './kartpark3d';
import { buildFx, chainMesh } from './grime';
import type { Tick } from './world';

export const SELF = import.meta.url;

/* ---------- Heights (each layer a few mm over the one under it) and colours ---------- */

const LAWN = 0.006;
const PAVING = 0.025;
const RUNOFF_Y = 0.014;
const GRAVEL_Y = 0.02;
const RIBBON = 0.035;
const LINE_Y = 0.045;
const KERB_Y = 0.05;
const DECAL = 0.06;
const PIT_Y = 0.04;
const ROAD_Y = 0.036;
const LOT_Y = 0.04;
const PAINT_Y = 0.046;
const EDGE = TRACK_HALF + KERB;
const DECK = 0.35;
const RAIL_H = 0.9;
const TUBE_R = EDGE + 0.6;
const TUBE_T = 0.3;
/** Where the pits' paving starts (local v) */
const PAVED_V = SITE.garages.v0 - 0.6;

const ASPHALT = toon('#26243f');
const LAWN_C = toon('#2f7a52');
const GRASS = toon('#3a8a5b');
const BANK_C = toon('#357f55');
const GRAVEL = toon('#c2a878');
const EARTH = toon('#3b6447');
const PAVE = toon('#4b4766');
const PLAZA_C = toon('#56506f');
const PIT_C = toon('#34314f');
const INK = toon('#1b1830');
const STEEL = toon('#2b2a40');
const ARMCO = toon('#b9bccb');
const DECK_C = toon('#3f3b5e');
const RAIL = toon('#c9c4e6');
const WHITE = toon('#e8e6f0');
const LINE_C = toon('#d9d4ef');
const RED = toon('#e23b3b');
const YELLOW = toon('#ffd23f');
const GREEN = toon('#1fbf6b');
const TUBE_C = toon('#2b2550');
const TUBE_IN = toon('#141226');
const PORTAL = toon('#4a3f7a');
const TYRE = toon('#17151f');
const TYRE_W = toon('#e8e6f0');
const CANVAS = ['#e23b3b', '#2aabee', '#ffd23f', '#8000ff', '#1fbf6b'].map((c) => toon(c));
const soft = (c: string) => neon(c, 0.5, 1.3);
const glow = (c: string) => neon(c, 0.6, 2.4);

const BANNER = 'KART PARK · START / FINISH';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const Z = new THREE.Vector3(0, 0, 1);
const W = (u: number, v: number) => toWorld([u, v]);

/* ---------- Sweeps along the circuit ---------- */

/** A sample's frame, as groundAt() wants it */
const fr = (c: Line, i: number) => ({ y: c.y[i], roll: c.roll[i], flags: c.flags[i] }) as Frame;
/** A cross-section point: lateral (left positive) and its height, given the sample */
type XPt = [lat: number, h: (i: number, lat: number) => number];
/** On the circuit's ground (the asphalt's plane, the run-off's slope), lifted */
const onGround =
  (c: Line, lift: number) =>
  (i: number, lat: number): number =>
    groundAt(fr(c, i), lat) + lift;
/** Over the asphalt's plane (the banking), not the run-off's slope: decks, rails, the tube */
const onPlane =
  (c: Line, lift: number) =>
  (i: number, lat: number): number =>
    c.y[i] - c.roll[i] * lat + lift;

/**
 * Quads swept along a line through the consecutive samples `run`, one strip per edge of the
 * cross-section `poly`. A section walked from a lower lateral to a higher one faces up; one going
 * down on the left side (or up on the right side) faces outward. Every vertex stays inside the site.
 */
function sweep(c: Line, run: number[], poly: XPt[]) {
  const n = c.x.length;
  const m = run.length;
  const E = poly.length - 1;
  const pos = new Float32Array(E * m * 2 * 3);
  const uv = new Float32Array(E * m * 2 * 2);
  const idx: number[] = [];
  const P = KART_PARK;
  let v = 0;
  for (let e = 0; e < E; e++) {
    const base = v;
    for (let k = 0; k < m; k++) {
      const i = ((run[k] % n) + n) % n;
      // The left normal, as frame() has it
      const nx = c.tz[i];
      const nz = -c.tx[i];
      for (let j = 0; j < 2; j++) {
        const [l, h] = poly[e + j];
        pos[v * 3] = Math.max(P.x0 + 0.1, Math.min(P.x1 - 0.1, c.x[i] + nx * l));
        pos[v * 3 + 1] = h(i, l);
        pos[v * 3 + 2] = Math.max(P.z0 + 0.1, Math.min(P.z1 - 0.1, c.z[i] + nz * l));
        uv[v * 2] = (k * c.step) / 4;
        uv[v * 2 + 1] = j;
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
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Runs of consecutive samples that `keep` says yes to, round a closed line (or along an open one).
 * Each run takes the sample after its last too, so no segment is left out between runs.
 */
function runs(c: Line, keep: (i: number) => boolean) {
  const n = c.x.length;
  const yes = Array.from({ length: n }, (_, i) => keep(i));
  if (yes.every(Boolean)) return [[...Array(n).keys(), ...(c.closed ? [0] : [])]];
  // Start where a run begins, so a run through the loop's seam isn't cut in two
  const start = c.closed ? yes.findIndex((y, i) => y && !yes[(i - 1 + n) % n]) : 0;
  const out: number[][] = [];
  let cur: number[] = [];
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    if (yes[i]) cur.push(i);
    else if (cur.length) {
      out.push([...cur, i]);
      cur = [];
    }
  }
  if (cur.length) out.push(c.closed ? [...cur, (cur[cur.length - 1] + 1) % n] : cur);
  return out.filter((r) => r.length > 1);
}
/** A run split where `keep` changes, each part with the sample after its last */
function splitRun(run: number[], keep: (i: number) => boolean) {
  const out: number[][] = [];
  let cur: number[] = [];
  for (const i of run) {
    if (keep(i)) cur.push(i);
    else if (cur.length) {
      out.push([...cur, i]);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out.filter((r) => r.length > 1);
}
/** Long runs cut into pieces of about `len` samples (sharing their ends), so no triangle strip outgrows its tile */
const pieces = (run: number[], len = 40) => {
  const out: number[][] = [];
  for (let k = 0; k < run.length - 1; k += len) out.push(run.slice(k, k + len + 1));
  return out;
};

/** A flat strip between two laterals at a height function, facing up whichever way round they come */
const strip = (l0: number, l1: number, h: XPt[1]): XPt[] => [
  [Math.min(l0, l1), h],
  [Math.max(l0, l1), h],
];

/** A square beam between two points (cables, braces, ropes, rails) */
function beam(b: Batch, a: THREE.Vector3, c: THREE.Vector3, t: number, mat: THREE.Material, tall = t) {
  const dir = c.clone().sub(a);
  const len = dir.length();
  const g = unitBox.clone();
  g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(Z, dir.normalize()), V(t, tall, len)));
  b.add(g, mat);
}

/** A string of little triangle flags between two points */
function bunting(b: Batch, from: THREE.Vector3, to: THREE.Vector3, sag: number) {
  const n = Math.max(2, Math.round(from.distanceTo(to) / 0.45));
  const pt = (t: number) => V(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t - sag * 4 * t * (1 - t), from.z + (to.z - from.z) * t);
  const cols = [PAL.cyan, PAL.pink, '#ffffff', PAL.violet].map((c) => toon(c));
  for (let k = 0; k < n; k++) {
    const a = pt(k / n);
    const c = pt((k + 1) / n);
    beam(b, a, c, 0.02, INK);
    const l = a.clone().lerp(c, 0.12);
    const r = a.clone().lerp(c, 0.88);
    const tip = a.clone().lerp(c, 0.5);
    tip.y -= 0.3;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...l.toArray(), ...r.toArray(), ...tip.toArray(), ...l.toArray(), ...tip.toArray(), ...r.toArray()]), 3));
    g.computeVertexNormals();
    b.add(g, cols[k % cols.length]);
  }
}

/** A flat rectangle on the asphalt at a frame: `along` by `across`, centred `ahead` tiles past it, tilted with the banking */
function quadOnTrack(f: Frame, along: number, across: number, lift: number, ahead = 0) {
  const cx = f.x + f.tx * ahead;
  const cz = f.z + f.tz * ahead;
  const pts: number[] = [];
  for (const [a, l] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const lat = (l * across) / 2;
    pts.push(cx + f.tx * a * (along / 2) + f.nx * lat, f.y - f.roll * lat + lift, cz + f.tz * a * (along / 2) + f.nz * lat);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
  // One winding, facing up whichever way the frame turns (both windings on shared corners cancel the normals to nothing,
  // which the toon shader turns into NaN and the bloom spreads over the whole picture)
  const ax = pts[3] - pts[0];
  const az = pts[5] - pts[2];
  const bx = pts[9] - pts[0];
  const bz = pts[11] - pts[2];
  // The y of (p1 - p0) x (p3 - p0): positive when 0, 1, 2 already winds facing up
  const up = az * bx - ax * bz > 0;
  g.setIndex(up ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
  g.computeVertexNormals();
  return g;
}

/** The circuit's ground under a point near it (for the pit lane where it crosses the run-off), 0 off it */
function nearestOnCircuit(x: number, z: number) {
  const c = CIRCUIT;
  let best = Infinity;
  let bi = -1;
  for (let i = 0; i < c.x.length; i++) {
    const d = (c.x[i] - x) ** 2 + (c.z[i] - z) ** 2;
    if (d < best) {
      best = d;
      bi = i;
    }
  }
  if (bi < 0 || Math.sqrt(best) > CLEAR) return 0;
  const f = frame(c, bi * c.step);
  const lat = (x - f.x) * f.nx + (z - f.z) * f.nz;
  return groundAt(f, lat) + (Math.abs(lat) <= EDGE ? KERB_Y : RUNOFF_Y);
}

/** A flat rectangle on the ground (world), cut into pieces no longer than `len` (a tile's triangles stay in it) */
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
/** A local rectangle flat on the ground */
const flatL = (b: Batch, r: LRect, y: number, mat: THREE.Material) => {
  const [x0, z0] = W(r.u0, r.v0);
  const [x1, z1] = W(r.u1, r.v1);
  flatRect(b, x0, z0, x1, z1, y, mat);
};
/** A local rectangle's world rect */
const rectOf = (r: LRect, m = 0): [number, number, number, number] => {
  const [x0, z0] = W(r.u0 - m, r.v0 - m);
  const [x1, z1] = W(r.u1 + m, r.v1 + m);
  return [x0, z0, x1, z1];
};

/* ---------- The ground ---------- */

/** The lawn, the paving, the run-off and the banks */
function grounds(b: Batch) {
  const P = KART_PARK;
  const c = CIRCUIT;
  const open = (i: number) => !enclosed(fr(c, i));
  /** Which side a bend's outside is on (left positive), 0 on the straight */
  const outside = (i: number) => (Math.abs(c.k[i]) > 0.04 ? -Math.sign(c.k[i]) : 0);

  flatRect(b, P.x0 + 0.3, P.z0 + 0.3, P.x1 - 0.3, P.z1 - 0.3, LAWN, LAWN_C);
  // The paving along the pits (the garages, the hut, the tower), the plaza and the paddock, a pad under the stand
  flatL(b, { u0: SITE.hut.u0 - 2, v0: PAVED_V, u1: TOWER.u1 + 1.5, v1: SITE.garages.v1 + 1.2 }, PAVING, PAVE);
  flatL(b, PLAZA, PAVING, PLAZA_C);
  flatL(b, { ...PADDOCK, v0: SITE.garages.v1 + 1.2 }, PAVING, PAVE);
  flatL(b, { u0: SITE.stand.u0 - 1, v0: SITE.stand.v0 - 1, u1: SITE.stand.u1 + 1, v1: SITE.stand.v1 + 0.8 }, PAVING, PAVE);
  flatL(b, { u0: GRANDSTAND.u0 - 1, v0: GRANDSTAND.v0 - 0.5, u1: GRANDSTAND.u1 + 1, v1: GRANDSTAND.v1 + 0.3 }, PAVING, PAVE);
  // (the plaza's way out through the gate)
  flatRect(b, GATE.x0, W(0, PLAZA.v1)[1] - 0.01, GATE.x1, P.z1, PAVING, PLAZA_C);

  // The run-off: grass from the kerb's edge to CLEAR (easing down to the lawn), gravel on the outside of the bends
  for (const run of runs(c, open)) for (const part of pieces(run)) for (const s of [1, -1]) b.add(sweep(c, part, strip(s * EDGE, s * CLEAR, onGround(c, RUNOFF_Y))), GRASS);
  // (only where the run-off lies flat: on the hill's and the sweepers' grass banks it stays grass)
  for (const run of runs(c, (i) => open(i) && outside(i) !== 0 && groundAt(fr(c, i), outside(i) * EDGE) < 0.25)) {
    // Split by side so the gravel follows each bend's own outside
    for (const side of [1, -1]) for (const part of splitRun(run, (i) => outside(i) === side)) b.add(sweep(c, part, strip(side * (EDGE + 0.5), side * (CLEAR - 0.8), onGround(c, GRAVEL_Y))), GRAVEL);
  }

  // The banks: a grid laid on bankAt(), a tile a cell
  for (const bank of BANKS) {
    const nu = Math.ceil(bank.u1 - bank.u0);
    const nv = Math.ceil(bank.v1 - bank.v0);
    for (let j0 = 0; j0 < nv; j0 += 12)
      for (let i0 = 0; i0 < nu; i0 += 12) {
        const pos: number[] = [];
        const idx: number[] = [];
        const ni = Math.min(12, nu - i0);
        const nj = Math.min(12, nv - j0);
        for (let j = 0; j <= nj; j++)
          for (let i = 0; i <= ni; i++) {
            const u = bank.u0 + ((bank.u1 - bank.u0) * (i0 + i)) / nu;
            const v = bank.v0 + ((bank.v1 - bank.v0) * (j0 + j)) / nv;
            const [x, z] = W(u, v);
            pos.push(x, bankAt(bank, u, v) + LAWN + 0.004, z);
          }
        for (let j = 0; j < nj; j++)
          for (let i = 0; i < ni; i++) {
            const a = j * (ni + 1) + i;
            idx.push(a, a + ni + 1, a + 1, a + 1, a + ni + 1, a + ni + 2);
          }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
        g.setIndex(idx);
        g.computeVertexNormals();
        b.add(g, BANK_C);
      }
  }
}

/* ---------- The circuit ---------- */

/** The asphalt, its lines and kerbs, the flyover, the tunnel, the jump's lip and the banked sweepers */
function track(b: Batch, low: boolean) {
  const P = KART_PARK;
  const c = CIRCUIT;
  const fl = (i: number) => c.flags[i];
  const all = runs(c, () => true)[0];

  // The asphalt, its edge lines and the kerbs: red and white blocks a tile each, both sides
  for (const part of pieces(all)) {
    b.add(sweep(c, part, strip(-TRACK_HALF, TRACK_HALF, onPlane(c, RIBBON))), ASPHALT);
    for (const s of [1, -1]) b.add(sweep(c, part, strip(s * (TRACK_HALF - 0.16), s * (TRACK_HALF - 0.05), onPlane(c, LINE_Y))), LINE_C);
  }
  for (let j = 0; j + 1 < all.length; j += 2) {
    const chunk = all.slice(j, j + 3);
    for (const s of [1, -1]) b.add(sweep(c, chunk, strip(s * TRACK_HALF, s * EDGE, onPlane(c, KERB_Y))), (j / 2) % 2 ? WHITE : RED);
  }
  // The flyover: a deck under the asphalt (to the kerbs' edge and a little past), railed, on columns past its edges
  for (const run of runs(c, (i) => !!(fl(i) & F.deck) && c.y[i] > 0.6)) {
    const o = EDGE + 0.35;
    b.add(sweep(c, run, [[-o, onPlane(c, -DECK)], [-o, onPlane(c, 0)], [o, onPlane(c, 0)], [o, onPlane(c, -DECK)], [-o, onPlane(c, -DECK)]]), DECK_C);
    for (const s of [1, -1]) {
      const l = s * (o - 0.05);
      b.add(sweep(c, run, s > 0 ? [[l, onPlane(c, RAIL_H)], [l, onPlane(c, RAIL_H - 0.08)]] : [[l, onPlane(c, RAIL_H - 0.08)], [l, onPlane(c, RAIL_H)]]), RAIL);
      b.add(sweep(c, run, s > 0 ? [[l + 0.02, onPlane(c, 0.32)], [l + 0.02, onPlane(c, 0.28)]] : [[l - 0.02, onPlane(c, 0.28)], [l - 0.02, onPlane(c, 0.32)]]), soft(s > 0 ? PAL.cyan : PAL.pink));
      for (let k = 0; k < run.length; k += low ? 8 : 4) {
        const i = run[k];
        b.add(place(unitBox, c.x[i] + c.tz[i] * l, c.y[i] - c.roll[i] * l + RAIL_H / 2, c.z[i] - c.tx[i] * l, 0.06, RAIL_H, 0.06), RAIL);
      }
    }
    // The abutments where the ramps meet the deck: a wall from the lawn up to the run-off's slope and the deck
    for (const end of [run[0], run[run.length - 1]]) {
      const i = end;
      const pts: number[] = [];
      const lats = [-CLEAR, -EDGE - 1, -EDGE, 0, EDGE, EDGE + 1, CLEAR];
      const nx = c.tz[i];
      const nz = -c.tx[i];
      for (const l of lats) pts.push(c.x[i] + nx * l, 0, c.z[i] + nz * l, c.x[i] + nx * l, Math.max(0.02, groundAt(fr(c, i), l) - (Math.abs(l) <= EDGE ? DECK : 0)), c.z[i] + nz * l);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
      const idx: number[] = [];
      for (let k = 0; k + 1 < lats.length; k++) {
        const a = k * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3, a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      g.setIndex(idx);
      g.computeVertexNormals();
      b.add(g, EARTH);
    }
  }
  for (const { x, z, h } of SUPPORTS) {
    b.box(x - 0.22, 0, z - 0.22, 0.44, h - DECK + 0.05, 0.44, STEEL);
    b.box(x - 0.3, 0, z - 0.3, 0.6, 0.16, 0.6, INK);
    b.box(x - 0.3, h - DECK - 0.12, z - 0.3, 0.6, 0.14, 0.6, INK);
  }
  // The tunnel: a tube over the asphalt (outer skin, dark inside, ribs, portal frames, neon strips along the inside walls)
  for (const run of runs(c, (i) => !!(fl(i) & F.tunnel))) {
    const arc = (radius: number, out: boolean): XPt[] => {
      const pts: XPt[] = [];
      const N = 10;
      for (let k = 0; k <= N; k++) {
        const a = Math.PI - (Math.PI * k) / N;
        pts.push([radius * Math.cos(a), (i) => c.y[i] + radius * Math.sin(a) - 0.05]);
      }
      return out ? pts : pts.reverse();
    };
    b.add(sweep(c, run, arc(TUBE_R, true)), TUBE_C);
    b.add(sweep(c, run, arc(TUBE_R - TUBE_T, false)), TUBE_IN);
    for (let k = 2; k < run.length - 2; k += 5) b.add(sweep(c, run.slice(k, k + 2), arc(TUBE_R + 0.1, true)), INK);
    b.add(sweep(c, run.slice(0, 3), arc(TUBE_R + 0.22, true)), PORTAL);
    b.add(sweep(c, run.slice(-3), arc(TUBE_R + 0.22, true)), PORTAL);
    for (const s of [1, -1]) {
      const l = s * (TUBE_R - TUBE_T - 0.3);
      b.add(sweep(c, run, s > 0 ? [[l, onPlane(c, 1.5)], [l, onPlane(c, 1.7)]] : [[l, onPlane(c, 1.7)], [l, onPlane(c, 1.5)]]), soft(s > 0 ? PAL.cyan : PAL.pink));
    }
  }
  // The jump's lip: yellow and ink stripes across the asphalt up to it
  for (const id of COURSE_IDS) {
    const cc = COURSES[id];
    if (cc.reverse || cc.jump < 0) continue;
    for (let k = 0; k < 4; k++) {
      const f = frame(cc, cc.jump - 2.4 + k * 0.6);
      b.add(quadOnTrack(f, 0.6, TRACK_HALF * 2 - 0.4, LINE_Y + 0.004), k % 2 ? INK : YELLOW);
    }
  }
  // The banked sweepers: a cyan band along the low edge, bunting over the outside
  for (const run of runs(c, (i) => !!(fl(i) & F.bank))) {
    const lo = c.roll[run[Math.floor(run.length / 2)]] > 0 ? 1 : -1;
    b.add(sweep(c, run, strip(lo * (TRACK_HALF - 1.2), lo * (TRACK_HALF - 0.5), onPlane(c, LINE_Y))), toon(PAL.cyan));
    if (!low)
      b.detail(() => {
        for (let k = 8; k < run.length - 8; k += 22) {
          const i = run[k];
          const f = frame(c, i * c.step);
          const posts: THREE.Vector3[] = [];
          for (const s of [1, -1]) {
            const l = s * (CLEAR + 1.2);
            const x = f.x + f.nx * l;
            const z = f.z + f.nz * l;
            if (x < P.x0 + 0.5 || x > P.x1 - 0.5 || z < P.z0 + 0.5 || z > P.z1 - 0.5 || circuitDistance(x, z) < CLEAR + 0.9) continue;
            b.box(x - 0.06, 0, z - 0.06, 0.12, 5.2, 0.12, INK);
            posts.push(V(x, 5.2, z));
          }
          if (posts.length === 2) bunting(b, posts[0], posts[1], 0.5);
        }
      });
  }
}

/** The start: both ways' grid boxes, the gantry (its posts, beam, lights and bunting; the banner is on the main thread) */
function start(b: Batch, low: boolean) {
  const c = CIRCUIT;
  for (const id of COURSE_IDS) {
    const cc = COURSES[id];
    for (const slot of gridSlots(cc)) {
      const sf = frame(cc, slot.s);
      const cx = sf.x + sf.nx * slot.lateral;
      const cz = sf.z + sf.nz * slot.lateral;
      const tf = { ...sf, x: cx, z: cz } as Frame;
      b.add(quadOnTrack(tf, 0.08, 1.1, LINE_Y, 0.55), LINE_C);
      for (const s of [1, -1]) b.add(quadOnTrack({ ...tf, x: cx + sf.nx * s * 0.55, z: cz + sf.nz * s * 0.55 } as Frame, 0.9, 0.08, LINE_Y, 0.1), LINE_C);
    }
  }
  const G = GANTRY;
  const top = G.h;
  for (const p of G.posts) {
    b.box(p.x - 0.22, 0, p.z - 0.22, 0.44, top, 0.44, STEEL);
    b.box(p.x - 0.3, 0, p.z - 0.3, 0.6, 0.14, 0.6, INK);
  }
  const f = frame(c, c.start);
  const ryN = Math.atan2(-f.nz, f.nx);
  const span = G.half * 2 + 0.44;
  b.add(place(unitBox, G.x, top - 0.15, G.z, span, 0.3, 0.3, 0, ryN), STEEL);
  // (its ends just inside the posts' faces: level with them, they flicker)
  b.add(place(unitBox, G.x, top - 0.32, G.z, span - 0.02, 0.04, 0.32, 0, ryN), soft(PAL.cyan));
  // Five start lights in a housing over the track, steady red both ways (the countdown is in the HUD)
  b.add(place(unitBox, G.x, top + 0.17, G.z, 2.8, 0.34, 0.4, 0, ryN), INK);
  const bulb = new THREE.SphereGeometry(0.085, 8, 6);
  const redGlow = glow('#ff3b3b');
  for (let k = -2; k <= 2; k++) for (const side of [1, -1]) b.add(bulb.clone().translate(G.x + f.nx * k * 0.55 + f.tx * 0.2 * side, top + 0.17, G.z + f.nz * k * 0.55 + f.tz * 0.2 * side), redGlow);
  if (!low) {
    const [p0, p1] = G.posts;
    b.detail(() => bunting(b, V(p0.x, 3.4, p0.z), V(p1.x, 3.4, p1.z), 0.35));
  }
}

/** The pit lane (over the run-off and the kerbs where it crosses them, then flat on the paving), its lines and bays */
function pits(b: Batch) {
  const pit = PIT_LANE;
  const all = [...Array(pit.x.length).keys()];
  const pitY = (i: number) => Math.max(PAVING, nearestOnCircuit(pit.x[i], pit.z[i])) + PIT_Y;
  for (const part of pieces(all)) {
    b.add(sweep(pit, part, strip(-PIT_HALF, PIT_HALF, (i) => pitY(i))), PIT_C);
    // A white line along both edges
    for (const s of [1, -1]) b.add(sweep(pit, part, strip(s * (PIT_HALF - 0.14), s * (PIT_HALF - 0.04), (i) => pitY(i) + 0.006)), LINE_C);
  }
  // A dashed one down the middle for the speed limit's sake
  for (let k = 4; k + 2 < all.length; k += 6) b.add(sweep(pit, all.slice(k, k + 3), strip(-0.05, 0.05, (i) => pitY(i) + 0.006)), YELLOW);
  // The bays: a painted box in front of each garage
  for (const [x, z] of BAYS) {
    const y = PAVING + PIT_Y + 0.008;
    b.box(x - 1.1, y, z - 0.05, 2.2, 0.004, 0.06, LINE_C);
    for (const s of [-1, 1]) b.box(x + s * 1.1 - 0.03, y, z - 0.05, 0.06, 0.004, 1.15, LINE_C);
  }
}

/* ---------- Trackside ---------- */

/** The armco: posts and a double rail along each run */
function armco(b: Batch, run: Pt[]) {
  for (let k = 0; k < run.length; k++) {
    const [x, z] = run[k];
    b.box(x - 0.05, 0, z - 0.05, 0.1, ARMCO_H, 0.1, STEEL);
    if (!k) continue;
    const [px, pz] = run[k - 1];
    for (const y of [0.42, 0.66]) beam(b, V(px, y, pz), V(x, y, z), 0.04, ARMCO, 0.18);
  }
}

/** Armco, tyre walls and catch fencing (the mesh in `fxb`, for the FX layer) */
function trackside(b: Batch, fxb: Batch, low: boolean, near: (p: Pt) => boolean) {
  for (const run of BARRIERS) {
    const mine = run.filter(near);
    if (mine.length > 1) armco(b, mine);
  }
  // Tyre walls: a stack of three a tyre apart, the top of every fourth painted white
  const stack = new THREE.CylinderGeometry(TYRE_R, TYRE_R, 0.6, low ? 6 : 9).translate(0, 0.3, 0);
  const top = new THREE.CylinderGeometry(TYRE_R + 0.004, TYRE_R + 0.004, 0.2, low ? 6 : 9).translate(0, 0.5, 0);
  const dark: THREE.Matrix4[] = [];
  const white: THREE.Matrix4[] = [];
  for (const run of TYRE_WALLS)
    run.forEach(([x, z], k) => {
      if (!near([x, z])) return;
      const m = new THREE.Matrix4().makeTranslation(x, 0, z);
      dark.push(m);
      if (k % 4 === 0) white.push(m);
    });
  b.instances(stack, TYRE, dark);
  b.instances(top, TYRE_W, white);
  // Catch fencing: posts every three tiles, a top and bottom rail, the mesh between
  for (const [a, c] of CATCH) {
    const [ax, az] = W(a[0], a[1]);
    const [cx, cz] = W(c[0], c[1]);
    if (!near([ax, az]) && !near([cx, cz])) continue;
    const len = Math.hypot(cx - ax, cz - az);
    const n = Math.max(1, Math.round(len / 3));
    for (let k = 0; k <= n; k++) {
      const x = ax + ((cx - ax) * k) / n;
      const z = az + ((cz - az) * k) / n;
      b.box(x - 0.05, 0, z - 0.05, 0.1, CATCH_H, 0.1, STEEL);
    }
    for (const y of [0.05, CATCH_H - 0.05]) beam(b, V(ax, y, az), V(cx, y, cz), 0.05, STEEL);
    // (in pieces of a post's spacing, so each stays in its tile)
    for (let k = 0; k < n; k++) {
      const p: Pt = [ax + ((cx - ax) * k) / n, az + ((cz - az) * k) / n];
      const q: Pt = [ax + ((cx - ax) * (k + 1)) / n, az + ((cz - az) * (k + 1)) / n];
      chainMesh(fxb, p, q, 0.08, CATCH_H - 0.16);
    }
  }
}

/** Marshal posts every ~27 tiles round the outside, past the barriers: a booth with a roof, a yellow and a green flag */
function marshals(b: Batch, low: boolean, near: (p: Pt) => boolean) {
  const c = CIRCUIT;
  const taken: Pt[] = [];
  for (let s = 9; s < c.L; s += low ? 54 : 27) {
    const f = frame(c, s);
    if (enclosed(f)) continue;
    const side = f.k ? -Math.sign(f.k) : 1;
    const x = f.x + f.nx * (CLEAR + 1.6) * side;
    const z = f.z + f.nz * (CLEAR + 1.6) * side;
    const [u, v] = toLocal([x, z]);
    if (circuitDistance(x, z) < CLEAR + 1.2 || taken.some(([a, bb]) => Math.hypot(a - u, bb - v) < 4) || !near([x, z])) continue;
    if (BANKS.some((bk) => u > bk.u0 - 0.5 && u < bk.u1 + 0.5 && v > bk.v0 - 0.5 && v < bk.v1 + 0.5)) continue;
    const P = KART_PARK;
    if (x < P.x0 + 1 || x > P.x1 - 1 || z < P.z0 + 1 || z > P.z1 - 1) continue;
    taken.push([u, v]);
    const ry = Math.atan2(-f.tz, f.tx);
    // The booth: four posts, a roof, a low front
    for (const [a, d] of [
      [-0.5, -0.5],
      [0.5, -0.5],
      [-0.5, 0.5],
      [0.5, 0.5],
    ])
      b.add(place(unitBox, x + Math.cos(ry) * a + Math.sin(ry) * d, 1.05, z - Math.sin(ry) * a + Math.cos(ry) * d, 0.07, 2.1, 0.07), INK);
    b.add(place(unitBox, x, 2.15, z, 1.3, 0.1, 1.3, 0, ry), toon('#e8e6f0'));
    b.add(place(unitBox, x - Math.sin(ry) * side * 0.5, 0.45, z - Math.cos(ry) * side * 0.5, 1.1, 0.9, 0.05, 0, ry), toon('#f28c28'));
    // The flags, furled on short poles at the booth's track side
    b.detail(() => {
      for (const [k, mat] of [
        [-0.35, YELLOW],
        [0.35, GREEN],
      ] as const) {
        const px = x + Math.cos(ry) * k - Math.sin(ry) * side * 0.62;
        const pz = z - Math.sin(ry) * k - Math.cos(ry) * side * 0.62;
        b.box(px - 0.02, 0.9, pz - 0.02, 0.04, 1.4, 0.04, INK);
        b.add(place(unitBox, px + Math.cos(ry) * 0.22, 2.05, pz - Math.sin(ry) * 0.22, 0.42, 0.3, 0.02, 0, ry), mat);
      }
    });
  }
}

/** The floodlight towers: a tapering mast on a plinth, a frame at the top tilted at the circuit with six lamps (lit at night) */
function floodlights(b: Batch, near: (p: Pt) => boolean) {
  const lamp = soft('#fff4d6');
  for (const { x, z, ry } of FLOODLIGHTS) {
    if (!near([x, z])) continue;
    const H = FLOOD.h;
    b.box(x - 0.5, 0, z - 0.5, 1.0, 0.3, 1.0, toon('#6f6a8f'));
    b.add(new THREE.CylinderGeometry(0.12, 0.24, H, 8).translate(x, H / 2, z), STEEL);
    // A ladder up the back, a platform under the frame
    b.detail(() => {
      const bx = x - Math.sin(ry) * 0.3;
      const bz = z - Math.cos(ry) * 0.3;
      b.add(place(unitBox, bx, H / 2, bz, 0.36, H - 1, 0.03, 0, ry), INK);
      b.add(place(unitBox, x, H - 0.25, z, 2.2, 0.08, 1.0, 0, ry), STEEL);
    });
    // The frame: tilted down towards the circuit, its lamps on the face
    const frameGeo = (g: THREE.BufferGeometry) => g.rotateX(0.45).rotateY(ry).translate(x, H + FLOOD.head / 2, z);
    b.add(frameGeo(new THREE.BoxGeometry(2.4, FLOOD.head, 0.2)), STEEL);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 2; j++) b.add(frameGeo(new THREE.BoxGeometry(0.62, 0.58, 0.06).translate(-0.76 + i * 0.76, -0.38 + j * 0.76, 0.12)), lamp);
  }
}

/** The fence round the site (posts and three rails), the gap at the gate */
function fence(b: Batch, low: boolean, near: (p: Pt) => boolean) {
  const P = KART_PARK;
  const every = low ? 4 : 2;
  const posts: THREE.Matrix4[] = [];
  const add = (x: number, z: number) => {
    if (near([x, z])) posts.push(new THREE.Matrix4().makeTranslation(x, 0.6, z));
  };
  for (let x = P.x0; x < P.x1; x += every) add(x, P.z0);
  for (let z = P.z0; z < P.z1; z += every) add(P.x1, z);
  for (let x = P.x1; x > P.x0; x -= every) if (x < GATE.x0 - 0.5 || x > GATE.x1 + 0.5) add(x, P.z1);
  for (let z = P.z1; z > P.z0; z -= every) add(P.x0, z);
  b.instances(new THREE.BoxGeometry(0.08, 1.2, 0.08), INK, posts);
  // The rails, in stretches of about a tile
  const rail = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.ceil(len / 14));
    for (let k = 0; k < n; k++) {
      const a: Pt = [x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n];
      const c: Pt = [x0 + ((x1 - x0) * (k + 1)) / n, z0 + ((z1 - z0) * (k + 1)) / n];
      if (!near([(a[0] + c[0]) / 2, (a[1] + c[1]) / 2])) continue;
      for (const y of [0.42, 0.78, 1.14]) beam(b, V(a[0], y, a[1]), V(c[0], y, c[1]), 0.05, INK);
    }
  };
  rail(P.x0, P.z0, P.x1, P.z0);
  rail(P.x1, P.z0, P.x1, P.z1);
  rail(P.x0, P.z0, P.x0, P.z1);
  rail(P.x0, P.z1, GATE.x0 - 0.6, P.z1);
  rail(GATE.x1 + 0.6, P.z1, P.x1, P.z1);
}

/* ---------- The paddock and the plaza ---------- */

/** A kart on a stand (a low block, the kart on top: chassis, seat, wheel, four tyres), its nose towards ry */
function kartOnStand(b: Batch, x: number, z: number, ry: number, paint: THREE.Material) {
  const at = (g: THREE.BufferGeometry) => g.rotateY(ry).translate(x, 0, z);
  b.add(at(new THREE.BoxGeometry(0.9, 0.42, 0.5).translate(0, 0.21, 0)), STEEL);
  b.add(at(new THREE.BoxGeometry(1.2, 0.08, 0.7).translate(0, 0.5, 0)), paint);
  b.add(at(new THREE.BoxGeometry(0.3, 0.32, 0.4).translate(-0.18, 0.68, 0)), INK);
  b.add(at(new THREE.BoxGeometry(0.3, 0.12, 0.6).translate(0.48, 0.58, 0)), paint);
  b.add(at(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 8).rotateZ(1.1).translate(0.18, 0.78, 0)), INK);
  for (const [a, d] of [
    [-0.42, 0.4],
    [-0.42, -0.4],
    [0.42, 0.4],
    [0.42, -0.4],
  ])
    b.add(at(new THREE.CylinderGeometry(0.17, 0.17, 0.16, 8).rotateX(Math.PI / 2).translate(a, 0.6, d)), TYRE);
}

/** The team tents: four legs, a canopy and its valance in the team's colour, a back wall, a kart on its stand, a chest, tyres */
function paddock(b: Batch) {
  for (const t of TENTS) {
    const [x, z] = W(t.u, t.v);
    const mat = CANVAS[t.colour];
    const hw = TENT.w / 2;
    const hd = TENT.d / 2;
    for (const [a, d] of [
      [-hw, -hd],
      [hw, -hd],
      [-hw, hd],
      [hw, hd],
    ])
      b.box(x + a - 0.04, PAVING, z + d - 0.04, 0.08, TENT.h, 0.08, RAIL);
    // The canopy: a low four-sided roof, its valance round the edge
    b.add(new THREE.ConeGeometry(Math.SQRT1_2, 0.6, 4, 1, true).rotateY(Math.PI / 4).scale(TENT.w + 0.1, 1, TENT.d + 0.1).translate(x, TENT.h + 0.3, z), mat);
    b.box(x - hw - 0.05, TENT.h - 0.25, z - hd - 0.05, TENT.w + 0.1, 0.25, TENT.d + 0.1, mat);
    b.detail(() => {
      // The back wall (away from the walk), a kart on its stand facing out, a chest and a stack of tyres
      const back = z - t.face * (hd - 0.04);
      b.box(x - hw, PAVING, back - 0.02, TENT.w, TENT.h - 0.25, 0.04, mat);
      kartOnStand(b, x - 0.4, z + t.face * 0.2, t.face > 0 ? -Math.PI / 2 : Math.PI / 2, mat);
      b.box(x + hw - 0.9, PAVING, back + t.face * 0.55 - 0.25, 0.7, 0.8, 0.5, RED);
      for (let k = 0; k < 4; k++) b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 8).translate(x + hw - 0.5, PAVING + 0.07 + k * 0.15, z + t.face * 0.9), TYRE);
    });
  }
}

/** The plaza's dressing: flags along the road side, benches, bollards at the gate */
function plaza(b: Batch) {
  const flagCols = [PAL.cyan, PAL.pink, PAL.violet, PAL.blue, '#ffd23f'].map((c) => toon(c));
  for (let k = 0; k < 6; k++) {
    const [x, z] = W(-10 + k * 3.2, PLAZA.v1 - 1);
    if (Math.abs(x - (GATE.x0 + GATE.x1) / 2) < 3.5) continue;
    b.add(new THREE.CylinderGeometry(0.04, 0.05, 5, 6).translate(x, 2.5, z), INK);
    b.detail(() => b.box(x + 0.05, 3.6, z - 0.02, 0.9, 1.3, 0.03, flagCols[k % flagCols.length]));
  }
  b.detail(() => {
    for (const [u, v, ry] of [
      [-8, 90, 0],
      [-8, 96, 0],
      [20, 92, Math.PI],
    ] as const) {
      const [x, z] = W(u, v);
      const g = (w: number, h: number, d: number, ox: number, oy: number, oz: number) => new THREE.BoxGeometry(w, h, d).translate(ox, oy + h / 2, oz).rotateY(ry + Math.PI / 2).translate(x, PAVING, z);
      b.add(g(1.4, 0.06, 0.4, 0, 0.4, 0), toon('#6b4a2f'));
      b.add(g(1.4, 0.36, 0.06, 0, 0.46, -0.2), toon('#6b4a2f'));
      for (const sx of [-0.6, 0.6]) b.add(g(0.06, 0.4, 0.36, sx, 0, 0), INK);
    }
    // Bollards either side of the gate, a pair of planters
    for (const x of [GATE.x0 - 1.4, GATE.x0 - 2.6, GATE.x1 + 1.4, GATE.x1 + 2.6]) b.add(new THREE.CylinderGeometry(0.1, 0.12, 0.8, 8).translate(x, 0.4, KART_PARK.z1 - 0.8), YELLOW);
  });
}

/* ---------- Kart Road and the car park ---------- */

function road(b: Batch, x0: number, x1: number) {
  flatRect(b, x0, ROAD.z - ROAD.half, x1, ROAD.z + ROAD.half, ROAD_Y, ASPHALT);
  // The sidewalk along its north side, but at the loop's mouths
  const mouths = [LOOP.x0, LOOP.x1];
  let a = x0;
  for (const m of [...mouths.map((mx) => [mx - LOOP.half, mx + LOOP.half]), [Infinity, Infinity]])
    if (m[0] > a) {
      const e = Math.min(x1, m[0]);
      if (e > a) flatRect(b, a, SIDEWALK.z0, e, SIDEWALK.z1, ROAD_Y + 0.004, PAVE);
      a = Math.max(a, m[1]);
    } else a = Math.max(a, m[1]);
  b.detail(() => {
    for (let p = x0 + 0.8; p < x1 - 0.4; p += 1.1) {
      if (mouths.some((mx) => Math.abs(p - mx) < LOOP.half + 0.6)) continue;
      b.add(new THREE.PlaneGeometry(0.55, 0.07).rotateX(-Math.PI / 2).translate(p, PAINT_Y, ROAD.z), neon('#f5d76e', 0.9, 1.1));
    }
  });
}

/* ---------- Main thread: the start line and banner, the cones, the guidance ---------- */

/** Black and white squares for the start line: two across the line, eleven along it */
const chequerTex = () =>
  canvasTex(64, 352, (c, w, h) => {
    for (let y = 0; y < h; y += 32)
      for (let x = 0; x < w; x += 32) {
        c.fillStyle = ((x + y) / 32) % 2 ? '#1a1830' : '#e8e6f0';
        c.fillRect(x, y, 32, 32);
      }
  });
/** The gantry's banner (a lit board, the same face both ways) */
const bannerTex = () =>
  canvasTex(1024, 160, (c, w, h) => {
    c.fillStyle = '#0b0a18';
    c.fillRect(0, 0, w, h);
    chequerBands(c, w, h, 20);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `900 84px ${FONT_DISPLAY}`;
    spacing(c, 8);
    glowText(c, BANNER, w / 2, h / 2 + 4, PAL.cyan, 24);
  });

function mainThread(scene: THREE.Scene) {
  const group = new THREE.Group();
  group.name = 'kartgrounds';
  scene.add(group);
  const c = CIRCUIT;
  // The start line
  {
    const f = frame(c, c.start);
    const yaw = Math.atan2(-f.tz, f.tx);
    const g = new THREE.PlaneGeometry(1, TRACK_HALF * 2).rotateX(-Math.PI / 2).rotateY(yaw).translate(f.x, f.y + DECAL, f.z);
    const m = new THREE.Mesh(g, lit(new THREE.MeshBasicMaterial({ map: chequerTex() }), 0.85, 0.75));
    m.matrixAutoUpdate = false;
    group.add(fx(m));
    // The banner under the gantry's beam, over the track, readable both ways
    const G = GANTRY;
    const BW = 6.2;
    const BH = 0.8;
    const by = G.h - 0.36 - BH / 2;
    const bmat = lit(new THREE.MeshBasicMaterial({ map: bannerTex() }), 0.9, 1.6);
    const faces = [1, -1].map((side) => new THREE.PlaneGeometry(BW, BH).rotateY(Math.atan2(f.tx, f.tz) + (side > 0 ? 0 : Math.PI)).translate(G.x + f.tx * 0.03 * side, by, G.z + f.tz * 0.03 * side));
    const banner = new THREE.Mesh(mergeGeometries(faces, false)!, bmat);
    banner.matrixAutoUpdate = false;
    group.add(fx(banner));
  }
  // The cones that close the pit lane's mouths during a race (instanced, shown by racing())
  const pit = PIT_LANE;
  const coneSpots: [number, number][] = [];
  for (const end of [0, 1]) {
    const s = end ? pit.L - 4 : 4;
    const f = frame(pit, s);
    for (let k = -2; k <= 2; k++) coneSpots.push([f.x + f.nx * k * 0.65, f.z + f.nz * k * 0.65]);
  }
  const cones = new THREE.InstancedMesh(new THREE.ConeGeometry(0.17, 0.5, 10).translate(0, 0.25, 0), toon('#ff8a3d', { name: 'cones' }), coneSpots.length);
  const m4 = new THREE.Matrix4();
  coneSpots.forEach(([x, z], i) => cones.setMatrixAt(i, m4.makeTranslation(x, PAVING + PIT_Y, z)));
  cones.castShadow = true;
  cones.visible = false;
  cones.computeBoundingSphere();
  group.add(cones);

  // Per course: the guidance, pointing the way round being raced
  const atlas = lit(new THREE.MeshBasicMaterial({ map: atlasTex(), alphaTest: 0.5, side: THREE.DoubleSide }), 0.95, 1.25);
  const courses = new Map<CourseId, THREE.Group>();
  for (const id of COURSE_IDS) {
    const cg = new THREE.Group();
    cg.name = `karts-${id}`;
    cg.visible = false;
    const gb = new Batch();
    const signs = new Batch();
    const pads = new Batch();
    guidance(COURSES[id], gb, signs, pads, atlas);
    gb.build(cg);
    signs.build(cg, { cast: false, receive: false });
    const pg = new THREE.Group();
    pads.build(pg, { cast: false, receive: false });
    cg.add(fx(pg));
    group.add(cg);
    courses.set(id, cg);
  }
  // What the race (kart.ts, through kartpark3d.ts's KartPark) asks for: which way round, and whether the pits are closed
  KART_VIEW.apply = () => {
    for (const [k, cg] of courses) cg.visible = k === KART_VIEW.course;
    cones.visible = KART_VIEW.racing;
  };
  KART_VIEW.apply();
}

/** One way round's guidance: posts in `gb`, boards and arrows (the atlas) in `signs`, the pads' chevrons in `pads` */
function guidance(cc: Course, gb: Batch, signs: Batch, pads: Batch, atlas: THREE.Material) {
  const N = cc.x.length;
  const kAt = (s: number) => frame(cc, s).k;
  // Boost pads: chevrons on the asphalt pointing this way, tilted with the banking and the slope
  const chevron = soft(PAL.cyan);
  for (const pad of cc.pads)
    for (const f3 of [0.15, 0.5, 0.85]) {
      const f = frame(cc, pad.s + pad.len * f3);
      for (const side of [1, -1]) {
        // Two arms meeting ahead on the centre line
        const ax = f.x + f.nx * side * 1.6 - f.tx * 0.5;
        const az = f.z + f.nz * side * 1.6 - f.tz * 0.5;
        const bx = f.x + f.tx * 0.6;
        const bz = f.z + f.tz * 0.6;
        const g = new THREE.BufferGeometry();
        const w = 0.32;
        const dx = bx - ax;
        const dz = bz - az;
        const d = Math.hypot(dx, dz);
        const px = (-dz / d) * w * 0.5;
        const pz = (dx / d) * w * 0.5;
        const y = (lat: number) => f.y - f.roll * lat + DECAL;
        const la = side * 1.6;
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([ax + px, y(la), az + pz, bx + px, y(0), bz + pz, bx - px, y(0), bz - pz, ax - px, y(la), az - pz]), 3));
        g.setIndex([0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2]);
        g.computeVertexNormals();
        pads.add(g, chevron);
      }
    }
  // The corners: where each bend runs (|k| over a threshold), its turn direction, its apex
  const corners: { s0: number; s1: number; apex: number; dir: number; hard: boolean }[] = [];
  {
    let cur: { s0: number; s1: number; apex: number; dir: number; peak: number } | null = null;
    for (let k = 0; k <= N; k++) {
      const s = (k % N) * cc.step;
      const kk = cc.k[k % N];
      const dir = Math.abs(kk) > 0.045 ? Math.sign(kk) : 0;
      if (cur && (dir !== cur.dir || k === N)) {
        if (cur.s1 - cur.s0 > 3) corners.push({ s0: cur.s0, s1: cur.s1, apex: cur.apex, dir: cur.dir, hard: cur.peak > 0.1 });
        cur = null;
      }
      if (dir && !cur) cur = { s0: s, s1: s, apex: s, dir, peak: Math.abs(kk) };
      if (cur) {
        cur.s1 = s;
        if (Math.abs(kk) > cur.peak) {
          cur.peak = Math.abs(kk);
          cur.apex = s;
        }
      }
    }
  }
  /** Somewhere a board can stand: past the run-off, off everything else, in front of the barriers */
  const standAt = (x: number, z: number) => {
    const [u, v] = toLocal([x, z]);
    return u > -12 && u < 96 && v > -14 && v < PAVED_V - 0.5 && circuitDistance(x, z) > CLEAR + 0.2;
  };
  const post = (x: number, z: number, h: number) => gb.box(x - 0.05, 0, z - 0.05, 0.1, h, 0.1, INK);
  for (const corner of corners) {
    const side = -corner.dir;
    // Chevron boards along the outside of the bend, facing the track, the arrows pointing this way round
    for (let s = corner.s0 + 1; s <= corner.s1; s += 4.5) {
      const f = frame(cc, s);
      if (enclosed(f)) continue;
      const lat = side * (CLEAR + 0.8);
      const x = f.x + f.nx * lat;
      const z = f.z + f.nz * lat;
      if (!standAt(x, z)) continue;
      post(x - f.tx * 0.5, z - f.tz * 0.5, 1.2);
      post(x + f.tx * 0.5, z + f.tz * 0.5, 1.2);
      signs.add(quad(x, 1.45, z, f.tx, f.tz, 1.3, 0.65, CELL_CHEVRON, false), atlas);
    }
    // The corner's number on the outside at its apex, facing the karts coming into it
    {
      const f = frame(cc, corner.apex);
      for (const extra of [1, 2.5, 5]) {
        const lat = side * (CLEAR + extra);
        const x = f.x + f.nx * lat;
        const z = f.z + f.nz * lat;
        if (!standAt(x, z)) continue;
        post(x, z, 2.2);
        signs.add(quad(x, 2.45, z, -f.nx, -f.nz, 0.9, 0.9, cellNumber(cc.turns.find((t) => Math.abs(t.s - corner.apex) < 25)?.n ?? corners.indexOf(corner) + 1), false), atlas);
        break;
      }
    }
    // An arrow painted on the asphalt before the turn, curving its way
    {
      const f = frame(cc, corner.s0 - 7);
      if (Math.abs(kAt(corner.s0 - 7)) < 0.03 && !enclosed(f)) {
        const right = corner.dir < 0;
        // Lying flat: v along the track, u to the turn's side
        const ux = right ? -f.nx : f.nx;
        const uz = right ? -f.nz : f.nz;
        signs.add(quad(f.x, f.y + DECAL, f.z, ux, uz, 2.2, 3.2, CELL_ARROW, { vx: f.tx, vz: f.tz }), atlas);
      }
    }
    // Braking markers 3, 2 and 1 before the hard corners, on the outside, facing the karts coming
    if (corner.hard)
      for (const m of [3, 2, 1]) {
        const s = corner.s0 - m * 8;
        const f = frame(cc, s);
        if (enclosed(f)) continue;
        const lat = side * (CLEAR + 0.9);
        const x = f.x + f.nx * lat;
        const z = f.z + f.nz * lat;
        if (!standAt(x, z)) continue;
        post(x, z, 1.2);
        signs.add(quad(x, 1.5, z, -f.nx, -f.nz, 0.7, 0.7, cellMarker(m), false), atlas);
      }
  }
}

/* ---------- Registering ---------- */

/** The site's tiles: pieces 30 on a side over the whole park, each drawing what's in it of the trackside, the fence and the lights */
const SITE_TILE = 30;

export function register({ low, scene }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  const P = KART_PARK;
  site('kart park grounds', [P.x0, P.z0, P.x1, P.z1], (into) => {
    const b = new Batch();
    grounds(b);
    b.build(into, { cast: false, receive: true });
  });
  site('kart park circuit', [P.x0, P.z0, P.x1, P.z1], (into) => {
    const b = new Batch();
    track(b, low);
    start(b, low);
    pits(b);
    b.build(into);
  });
  // Trackside, the fence and the floodlights in pieces of the park, so the near ones come first
  for (let x0 = P.x0; x0 < P.x1; x0 += SITE_TILE)
    for (let z0 = P.z0; z0 < P.z1; z0 += SITE_TILE) {
      const r: [number, number, number, number] = [x0, z0, Math.min(P.x1, x0 + SITE_TILE), Math.min(P.z1, z0 + SITE_TILE)];
      const near = ([x, z]: Pt) => x >= r[0] && x < r[2] && z >= r[1] && z < r[3];
      site(`kart park trackside ${x0} ${z0}`, [r[0] - 1, r[1] - 1, r[2] + 1, r[3] + 1], (into) => {
        const b = new Batch();
        const fxb = new Batch();
        b.detail(() => trackside(b, fxb, low, near));
        marshals(b, low, near);
        floodlights(b, near);
        fence(b, low, near);
        b.build(into);
        buildFx(fxb, into);
      });
    }
  site('kart park paddock', rectOf(PADDOCK), (into) => {
    const b = new Batch();
    paddock(b);
    b.build(into);
  });
  site('kart park plaza', rectOf(PLAZA, 1), (into) => {
    const b = new Batch();
    plaza(b);
    b.build(into);
  });
  // Kart Road in stretches, the loop's sides and the car park inside it in pieces
  for (let x = ROAD.x0 + 3.7; x < ROAD.x1; x += 28) {
    const x1 = Math.min(ROAD.x1, x + 28);
    site(`kart road ${Math.round(x)}`, [x, SIDEWALK.z0, x1, ROAD.z + ROAD.half], (into) => {
      const b = new Batch();
      road(b, x, x1);
      b.build(into, { cast: false, receive: true });
    });
  }
  const [cx0, cz0, cx1, cz1] = CAR_PARK;
  const parts: [number, number, number, number][] = [
    [LOOP.x0 - LOOP.half, LOOP.z1 - LOOP.half, LOOP.x0 + LOOP.half, ROAD.z - ROAD.half],
    [LOOP.x0 - LOOP.half, LOOP.z1 - LOOP.half, LOOP.x1 + LOOP.half, LOOP.z1 + LOOP.half],
    [LOOP.x1 - LOOP.half, LOOP.z1 - LOOP.half, LOOP.x1 + LOOP.half, ROAD.z - ROAD.half],
  ];
  for (let z = cz0; z < cz1 - 0.01; z += 21) parts.push([cx0, z, cx1, Math.min(cz1, z + 21)]);
  const PAINT = toon('#e8e4f8');
  parts.forEach((r, i) =>
    site(`kart car park ${i}`, r, (into) => {
      const b = new Batch();
      // (the loop's own asphalt, and the car park's a hair over it, filling the gap between)
      flatRect(b, r[0], r[1], r[2], r[3], i < 3 ? ROAD_Y : LOT_Y, ASPHALT);
      if (i >= 3) {
        if (r[1] === cz0) flatRect(b, r[0], LOOP.z1 + LOOP.half, r[2], cz0 + 0.01, ROAD_Y + 0.001, ASPHALT);
        if (r[3] === cz1) flatRect(b, r[0], cz1 - 0.01, r[2], ROAD.z - ROAD.half, ROAD_Y + 0.001, ASPHALT);
        flatRect(b, LOOP.x0 + LOOP.half - 0.01, r[1], cx0 + 0.01, r[3], ROAD_Y + 0.001, ASPHALT);
        flatRect(b, cx1 - 0.01, r[1], LOOP.x1 - LOOP.half + 0.01, r[3], ROAD_Y + 0.001, ASPHALT);
        b.detail(() => {
          for (const bay of CAR_BAYS) {
            if (bay.z < r[1] || bay.z >= r[3]) continue;
            for (const sz of [-1, 1]) b.add(new THREE.PlaneGeometry(BAY.d, 0.08).rotateX(-Math.PI / 2).translate(bay.x, PAINT_Y, bay.z + (sz * BAY.w) / 2), PAINT);
          }
        });
      } else
        b.detail(() => {
          // One-way arrows round the loop (driven north up its east side, west, south down its west side)
          const arrow = (x: number, z: number, ry: number) => {
            b.add(new THREE.PlaneGeometry(1.4, 0.18).rotateX(-Math.PI / 2).rotateY(ry).translate(x, PAINT_Y, z), PAINT);
            for (const s of [-1, 1]) b.add(new THREE.PlaneGeometry(0.7, 0.18).rotateX(-Math.PI / 2).rotateY(ry + s * 0.7).translate(x + Math.cos(ry) * 0.5 - Math.cos(ry + s * 0.7) * 0.3, PAINT_Y, z - Math.sin(ry) * 0.5 + Math.sin(ry + s * 0.7) * 0.3), PAINT);
          };
          if (i === 2) for (let z = ROAD.z - 8; z > LOOP.z1 + 4; z -= 12) arrow(LOOP.x1, z, Math.PI / 2);
          if (i === 1) for (let x = LOOP.x1 - 8; x > LOOP.x0 + 4; x -= 14) arrow(x, LOOP.z1, Math.PI);
          if (i === 0) for (let z = LOOP.z1 + 8; z < ROAD.z - 4; z += 12) arrow(LOOP.x0, z, -Math.PI / 2);
        });
      b.build(into, { cast: false, receive: true });
    })
  );
  // A P sign at the loop's way in
  site('kart car park sign', [LOOP.x1 - 4, ROAD.z - 4, LOOP.x1 - 1, ROAD.z - 1], (into) => {
    const b = new Batch();
    const [x, z] = [LOOP.x1 - LOOP.half - 0.9, ROAD.z - ROAD.half - 1.2];
    b.box(x - 0.06, 0, z - 0.06, 0.12, 2.6, 0.12, INK);
    b.box(x - 0.5, 2.0, z - 0.05, 1.0, 1.0, 0.1, toon('#1d4fd6'));
    const Wn = neon('#ffffff', 0.8, 1.4);
    b.box(x - 0.3, 2.2, z + 0.05, 0.16, 0.6, 0.06, Wn);
    b.box(x - 0.3, 2.62, z + 0.05, 0.42, 0.16, 0.06, Wn);
    b.box(x + 0.02, 2.4, z + 0.05, 0.12, 0.38, 0.06, Wn);
    b.box(x - 0.3, 2.36, z + 0.05, 0.42, 0.14, 0.06, Wn);
    b.build(into, { cast: true, receive: true });
  });
  if (scene) mainThread(scene);
}
