/*
 * The kart park in 3D: the rebuild's circuit (kartcircuit.ts holds it, the
 * site and the line maths are kartpark.ts; kart-sim.ts races on it, kart.ts
 * is the race's view). Outside the Parkway in the north-east, on flat ground
 * (y = 0, no slab):
 *
 * - The site: a lawn inside a railing fence (the gate on the south side under
 *   a KART PARK arch, two lamps), the paving along the south for the pits,
 *   the garages and the hut, the gate path, and the slip road from the gate
 *   down to the Parkway.
 * - The circuit, swept once along its centre line: asphalt with edge lines,
 *   red-and-white kerbs both sides, then the run-off: grass, and gravel on
 *   the outside of the bends, easing down from the kerb to the lawn
 *   (`groundAt()`, the sim's own ground) so the banked sweepers' high side,
 *   the hill and the flyover's ramps stand on grass banks. Nothing on or
 *   beside it is solid (the owner's call). The tunnel is a tube with ribs,
 *   portals and neon strips inside; the jump a striped lip; the flyover a
 *   railed deck on columns just past its edges, open underneath where the
 *   run below passes; abutments close the ramps' ends.
 * - The start: the chequered line, both ways' grids painted on the straight,
 *   the gantry (posts outside the run-off, a beam, five red lights, the
 *   banner). The pit lane off the straight with its bays, cones across its
 *   mouths while a race is on (`racing()`), eight garages along it with
 *   their numbers and the big screen on their roof, the kart hut at its
 *   west end. The grandstand in the infield facing south over the straight,
 *   with a canopy, flags and fans bobbing. Tyre stacks set back from the
 *   bends, marshal posts, light poles and trees, all past the run-off.
 * - Per course (`setCourse()`, the way round being raced): boost pad
 *   chevrons on the asphalt, chevron boards on the outside of the bends,
 *   arrows painted before the turns, numbered corner boards and 3-2-1
 *   braking markers before the hard corners, all pointing that way round.
 *
 * Draw calls: everything static goes through one Batch (shared paint, neon
 * per brightness); each course's guidance is a Batch of its own (its boards
 * share one sign atlas); the fence posts, fans, tyres, cones and light poles
 * are instanced; the signs, the screen and the start line keep their own
 * textures. The hut, the stand, the garages and the screen sit in the
 * spot's own group (what City view lifts on hover); the ground and the track
 * stay put.
 */
import * as THREE from 'three';
import { site } from './tilework';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { SpotId } from '../../lib/city';
import { Batch, FONT_DISPLAY, FONT_MONO, PAL, canvasTex, fx, glowMat, lit, neon, neonSign, occlude, place, plane, rng, toon } from './kit';
import { F, GATE, KART_PARK, SITE_U, SITE_V, SLIP_ROAD, frame, toLocal, toWorld, type Frame, type Line } from './kartpark';
import {
  BAYS,
  CIRCUIT,
  CLEAR,
  COURSES,
  COURSE_IDS,
  GANTRY,
  HUT_DOOR,
  KERB,
  PIT_HALF,
  PIT_LANE,
  SITE,
  SUPPORTS,
  TRACK_HALF,
  enclosed,
  gridSlots,
  groundAt,
  type Course,
  type CourseId,
} from './kartcircuit';
import type { KartPark } from './kart-types';
import type { Spot } from './landmarks';
import { SLAB, addLamp, addTree, type Tick } from './world';

/** The place's id (city.ts adds it to SpotId) */
const ID = 'karts' as unknown as SpotId;

/* ---------- Heights (over the ground at 0, or over the circuit's own ground) ---------- */

const LAWN = 0.006;
const PAVING = 0.025;
/** The run-off, the gravel on it, the asphalt, its lines and kerbs, and the decals on top */
const RUNOFF_Y = 0.014;
const GRAVEL_Y = 0.02;
const RIBBON = 0.035;
const LINE_Y = 0.045;
const KERB_Y = 0.05;
const DECAL = 0.06;
/** The pit lane rides over the run-off where it crosses it */
const PIT_Y = 0.04;
/** The edge of the kerbs (where the run-off starts) */
const EDGE = TRACK_HALF + KERB;
/** The deck under the flyover's asphalt, and its railing's height */
const DECK = 0.35;
const RAIL_H = 0.9;
/** The tunnel: the tube's radius round the centre line, and its thickness */
const TUBE_R = EDGE + 0.6;
const TUBE_T = 0.3;
/** Tyre stacks and boards stand this far past the run-off */
const SET_BACK = 1.2;
/** Where the paving along the south begins (local v) */
const PAVED_V = SITE.garages.v0 - 0.6;

/* ---------- Materials ---------- */

const ASPHALT = toon('#26243f');
const LAWN_C = toon('#2f7a52');
const GRASS = toon('#3a8a5b');
const GRAVEL = toon('#c2a878');
const EARTH = toon('#3b6447');
const PAVE = toon('#4b4766');
const PIT_C = toon('#34314f');
const INK = toon('#1b1830');
const STEEL = toon('#2b2a40');
const DECK_C = toon('#3f3b5e');
const RAIL = toon('#c9c4e6');
const WHITE = toon('#e8e6f0');
const LINE_C = toon('#d9d4ef');
const RED = toon('#e23b3b');
const YELLOW = toon('#ffd23f');
const KERB_C = toon('#5a5290');
const TUBE_C = toon('#2b2550');
const TUBE_IN = toon('#141226');
const PORTAL = toon('#4a3f7a');
const GARAGE_C = toon('#3d4a6b');
const GARAGE_IN = toon('#16142a');
const soft = (c: string) => neon(c, 0.5, 1.3);
const glow = (c: string) => neon(c, 0.6, 2.4);
/** Fixed copy only */
const ARCH_SIGN = 'KART PARK';
const HUT_SIGN = 'KART HUT';
const BANNER = 'KART PARK · START / FINISH';
const SCREEN_TITLE = 'KART PARK';
const SCREEN_SUB = 'SECTOR 7 CIRCUIT';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const Z = new THREE.Vector3(0, 0, 1);
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);

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

/** A flat strip between two laterals at a height function, facing up whichever way round they come */
const strip = (l0: number, l1: number, h: XPt[1]): XPt[] => [
  [Math.min(l0, l1), h],
  [Math.max(l0, l1), h],
];

/** A square beam between two points (cables, braces, ropes) */
function beam(b: Batch, a: THREE.Vector3, c: THREE.Vector3, t: number, mat: THREE.Material) {
  const dir = c.clone().sub(a);
  const len = dir.length();
  const g = unitBox.clone();
  g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(Z, dir.normalize()), V(t, t, len)));
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

/**
 * A quad from its centre, the axis its texture's u runs along (unit, in x / z), its size and its
 * atlas cell: standing up (`up`) or lying on the ground. Faces the side cross(u, up) points to
 * (standing) or up (lying, when u, v and up are right-handed).
 */
function quad(cx: number, cy: number, cz: number, ux: number, uz: number, w: number, h: number, cell: number, lying: false | { vx: number; vz: number }) {
  const [u0, v0, u1, v1] = cellUv(cell);
  const hw = w / 2;
  const hh = h / 2;
  const corner = (su: number, sv: number): number[] =>
    lying ? [cx + ux * hw * su + lying.vx * hh * sv, cy, cz + uz * hw * su + lying.vz * hh * sv] : [cx + ux * hw * su, cy + hh * sv, cz + uz * hw * su];
  const pos = [...corner(-1, -1), ...corner(1, -1), ...corner(1, 1), ...corner(-1, 1)];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([u0, v0, u1, v0, u1, v1, u0, v1]), 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  return g;
}

/* ---------- Textures ---------- */

/** Black and white squares for the start line: two across the line, eleven along it */
const chequerTex = () =>
  canvasTex(64, 352, (c, w, h) => {
    for (let y = 0; y < h; y += 32)
      for (let x = 0; x < w; x += 32) {
        c.fillStyle = ((x + y) / 32) % 2 ? '#1a1830' : '#e8e6f0';
        c.fillRect(x, y, 32, 32);
      }
  });

/** Chequered bands along the top and bottom of a board */
function chequerBands(c: CanvasRenderingContext2D, w: number, h: number, size: number) {
  for (let x = 0; x < w; x += size) {
    c.fillStyle = (x / size) % 2 ? '#e8e6f0' : '#1a1830';
    c.fillRect(x, 0, size, size * 0.6);
    c.fillStyle = (x / size) % 2 ? '#1a1830' : '#e8e6f0';
    c.fillRect(x, h - size * 0.6, size, size * 0.6);
  }
}

/** Glowing lettering with a white core */
function glowText(c: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, blur: number) {
  c.shadowColor = color;
  c.shadowBlur = blur;
  c.fillStyle = color;
  c.fillText(text, x, y);
  c.shadowBlur = 0;
  c.fillStyle = '#ffffff';
  c.globalAlpha = 0.7;
  c.fillText(text, x, y);
  c.globalAlpha = 1;
}
const spacing = (c: CanvasRenderingContext2D, px: number) => ((c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`);

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

/** The big screen's face */
const screenTex = () =>
  canvasTex(1024, 512, (c, w, h) => {
    c.fillStyle = '#0b0a18';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffffff08';
    for (let y = 0; y < h; y += 8) c.fillRect(0, y, w, 3);
    chequerBands(c, w, h, 36);
    c.strokeStyle = PAL.cyan;
    c.lineWidth = 6;
    c.strokeRect(14, 34, w - 28, h - 68);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `900 210px ${FONT_DISPLAY}`;
    spacing(c, 12);
    glowText(c, SCREEN_TITLE, w / 2, 220, PAL.pink, 36);
    c.font = `700 60px ${FONT_MONO}`;
    spacing(c, 10);
    c.fillStyle = PAL.cyan;
    c.fillText(SCREEN_SUB, w / 2, 390);
  });

/**
 * The guidance's sign atlas, 5 x 4 cells: a chevron board (arrows pointing along +u), an arrow to
 * paint on the asphalt (straight on, then turning towards +u), corner numbers 1-12 (white on ink, a
 * cyan rim) and the braking markers 3, 2, 1 (ink stripes on white, the count big).
 */
const ATLAS_W = 5;
const ATLAS_H = 4;
const CELL = 128;
const CELL_CHEVRON = 0;
const CELL_ARROW = 1;
const cellNumber = (n: number) => 1 + n;
const cellMarker = (n: number) => 13 + (3 - n);
function cellUv(cell: number): [number, number, number, number] {
  const cx = cell % ATLAS_W;
  const cy = Math.floor(cell / ATLAS_W);
  const pad = 2 / (CELL * ATLAS_W);
  const u0 = cx / ATLAS_W + pad;
  const u1 = (cx + 1) / ATLAS_W - pad;
  // Canvas rows run down, texture v runs up
  const v1 = 1 - cy / ATLAS_H - pad;
  const v0 = 1 - (cy + 1) / ATLAS_H + pad;
  return [u0, v0, u1, v1];
}
const atlasTex = () =>
  canvasTex(CELL * ATLAS_W, CELL * ATLAS_H, (c) => {
    const at = (cell: number) => [(cell % ATLAS_W) * CELL, Math.floor(cell / ATLAS_W) * CELL] as const;
    // The chevron board: red, three white chevrons pointing right
    {
      const [x, y] = at(CELL_CHEVRON);
      c.fillStyle = '#d42a3a';
      c.fillRect(x, y, CELL, CELL);
      c.fillStyle = '#ffffff';
      for (let k = 0; k < 3; k++) {
        const ox = x + 14 + k * 36;
        c.beginPath();
        c.moveTo(ox, y + 22);
        c.lineTo(ox + 26, y + 64);
        c.lineTo(ox, y + 106);
        c.lineTo(ox + 14, y + 106);
        c.lineTo(ox + 40, y + 64);
        c.lineTo(ox + 14, y + 22);
        c.closePath();
        c.fill();
      }
    }
    // The painted arrow: up from the bottom, curving right, on a clear ground
    {
      const [x, y] = at(CELL_ARROW);
      c.strokeStyle = '#f3f2f7';
      c.lineWidth = 18;
      c.lineCap = 'butt';
      c.beginPath();
      c.moveTo(x + 44, y + CELL);
      c.lineTo(x + 44, y + 70);
      c.quadraticCurveTo(x + 44, y + 40, x + 74, y + 40);
      c.stroke();
      c.fillStyle = '#f3f2f7';
      c.beginPath();
      c.moveTo(x + 72, y + 14);
      c.lineTo(x + 112, y + 40);
      c.lineTo(x + 72, y + 66);
      c.closePath();
      c.fill();
    }
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    // Corner numbers
    for (let n = 1; n <= 12; n++) {
      const [x, y] = at(cellNumber(n));
      c.fillStyle = '#16142a';
      c.fillRect(x, y, CELL, CELL);
      c.strokeStyle = PAL.cyan;
      c.lineWidth = 8;
      c.strokeRect(x + 6, y + 6, CELL - 12, CELL - 12);
      c.fillStyle = '#ffffff';
      c.font = `900 ${n > 9 ? 78 : 92}px ${FONT_DISPLAY}`;
      c.fillText(String(n), x + CELL / 2, y + CELL / 2 + 6);
    }
    // Braking markers: white, n diagonal ink stripes, the count
    for (let n = 1; n <= 3; n++) {
      const [x, y] = at(cellMarker(n));
      c.fillStyle = '#f3f2f7';
      c.fillRect(x, y, CELL, CELL);
      c.fillStyle = '#16142a';
      for (let k = 0; k < n; k++) c.fillRect(x + 10, y + 12 + k * 18, CELL - 20, 10);
      c.font = `900 70px ${FONT_DISPLAY}`;
      c.fillText(String(n), x + CELL / 2, y + 92);
    }
  });

/* ---------- Where the dressing stands (clear of the circuit, its run-off, the pits and the buildings) ---------- */

/** The buildings' and the paving's rectangles (local u, v), kept clear of trees and posts */
const FIXTURES: [number, number, number, number][] = [
  [SITE.hut.u0, SITE.hut.v0, SITE.hut.u1, SITE.hut.v1],
  [SITE.garages.u0, SITE.garages.v0, SITE.garages.u1, SITE.garages.v1],
  [SITE.stand.u0, SITE.stand.v0, SITE.stand.u1, SITE.stand.v1],
  [SITE.path.u0 - 3, SITE.path.v - SITE.path.half, SITE.path.u1, SITE.path.v + SITE.path.half],
];
/** The nearest the circuit (or the pit lane) comes to a point (world x, z) */
function circuitDistance(x: number, z: number) {
  let best = Infinity;
  for (const c of [CIRCUIT, PIT_LANE] as Line[])
    for (let i = 0; i < c.x.length; i += 2) {
      const d = (c.x[i] - x) ** 2 + (c.z[i] - z) ** 2;
      if (d < best) best = d;
    }
  return Math.sqrt(best);
}
function clearAt(u: number, v: number, margin: number) {
  if (u < 1.6 || u > SITE_U + 0.4 || v < 0 || v > PAVED_V - 1) return false;
  for (const [u0, v0, u1, v1] of FIXTURES) if (u > u0 - 2 && u < u1 + 2 && v > v0 - 2 && v < v1 + 2) return false;
  const [x, z] = toWorld([u, v]);
  return circuitDistance(x, z) > CLEAR + margin;
}

/* ---------- The park's grounds and the circuit: sites of the fixed city, built as you go (tilework.ts) ---------- */

/** The lawn, the paving and the run-off */
function grounds(b: Batch) {
  const P = KART_PARK;
  const c = CIRCUIT;
  const W = (u: number, v: number) => toWorld([u, v]);
  const flat = (batch: Batch, x0: number, z0: number, x1: number, z1: number, y: number, mat: THREE.Material) =>
    batch.add(place(new THREE.PlaneGeometry(x1 - x0, z1 - z0), (x0 + x1) / 2, y, (z0 + z1) / 2, 1, 1, 1, -Math.PI / 2), mat);
  const open = (i: number) => !enclosed(fr(c, i));
  /** Which side a bend's outside is on (left positive), 0 on the straight */
  const outside = (i: number) => (Math.abs(c.k[i]) > 0.04 ? -Math.sign(c.k[i]) : 0);

  /* ----- The ground ----- */

  flat(b, P.x0 + 0.3, P.z0 + 0.3, P.x1 - 0.3, P.z1 - 0.3, LAWN, LAWN_C);
  {
    // The paving along the south (the garages, the hut), the gate path, a pad under the stand
    const [px0, pz0] = W(SITE.hut.u0 - 2, PAVED_V);
    const [px1, pz1] = W(SITE.garages.u1 + 2, SITE.garages.v1 + 1.2);
    flat(b, px0, pz0, px1, pz1, PAVING, PAVE);
    const [gx0, gz0] = W(SITE.path.u0 - SITE.path.half * 2, SITE.path.v - SITE.path.half);
    const [gx1, gz1] = W(SITE.path.u1 + 1, SITE.path.v + SITE.path.half);
    flat(b, gx0, gz0, gx1, gz1, PAVING, PAVE);
    flat(b, GATE.x0, gz1 - 0.1, GATE.x1, P.z1 - 0.3, PAVING, PAVE);
    const [sx0, sz0] = W(SITE.stand.u0 - 1, SITE.stand.v0 - 1);
    const [sx1, sz1] = W(SITE.stand.u1 + 1, SITE.stand.v1 + 0.8);
    flat(b, sx0, sz0, sx1, sz1, PAVING, PAVE);
  }

  /* ----- The circuit ----- */

  // The run-off: grass from the kerb's edge to CLEAR (easing down to the lawn), gravel on the outside of the bends
  for (const run of runs(c, open)) {
    for (const s of [1, -1]) b.add(sweep(c, run, strip(s * EDGE, s * CLEAR, onGround(c, RUNOFF_Y))), GRASS);
  }
  // (only where the run-off lies flat: on the hill's and the sweepers' grass banks it stays grass)
  for (const run of runs(c, (i) => open(i) && outside(i) !== 0 && groundAt(fr(c, i), outside(i) * EDGE) < 0.25)) {
    // Split by side so the gravel follows each bend's own outside
    for (const side of [1, -1]) for (const part of splitRun(run, (i) => outside(i) === side)) b.add(sweep(c, part, strip(side * (EDGE + 0.5), side * (CLEAR - 0.8), onGround(c, GRAVEL_Y))), GRAVEL);
  }
}

/** The asphalt, its lines and kerbs, the flyover, the tunnel, the jump's lip and the banked sweepers */
function track(b: Batch, low: boolean) {
  const P = KART_PARK;
  const c = CIRCUIT;
  const fl = (i: number) => c.flags[i];

  // The asphalt, its edge lines and the kerbs: red and white blocks a tile each, both sides
  b.add(sweep(c, runs(c, () => true)[0], strip(-TRACK_HALF, TRACK_HALF, onPlane(c, RIBBON))), ASPHALT);
  for (const s of [1, -1]) b.add(sweep(c, runs(c, () => true)[0], strip(s * (TRACK_HALF - 0.16), s * (TRACK_HALF - 0.05), onPlane(c, LINE_Y))), LINE_C);
  {
    const all = runs(c, () => true)[0];
    for (let j = 0; j + 1 < all.length; j += 2) {
      const chunk = all.slice(j, j + 3);
      for (const s of [1, -1]) b.add(sweep(c, chunk, strip(s * TRACK_HALF, s * EDGE, onPlane(c, KERB_Y))), (j / 2) % 2 ? WHITE : RED);
    }
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
      for (let k = 8; k < run.length - 8; k += 22) {
        const i = run[k];
        const f = frame(c, i * c.step);
        const posts: THREE.Vector3[] = [];
        for (const s of [1, -1]) {
          const l = s * (CLEAR + 0.6);
          const x = f.x + f.nx * l;
          const z = f.z + f.nz * l;
          if (x < P.x0 + 0.5 || x > P.x1 - 0.5 || z < P.z0 + 0.5 || z > P.z1 - 0.5 || circuitDistance(x, z) < CLEAR + 0.3) continue;
          b.box(x - 0.06, 0, z - 0.06, 0.12, 5.2, 0.12, INK);
          posts.push(V(x, 5.2, z));
        }
        if (posts.length === 2) bunting(b, posts[0], posts[1], 0.5);
      }
  }

}

/* ---------- The park ---------- */

export function buildKartPark(scene: THREE.Scene, opts: { tick: (f: Tick) => void; reduced: boolean; low: boolean }): KartPark {
  const { low, reduced } = opts;
  const r = rng(4747);
  const group = new THREE.Group();
  group.name = 'kartpark';
  scene.add(group);
  /** The hut, the stand, the garages and the screen: the spot's group, lifted on hover */
  const places = new THREE.Group();
  places.name = ID;
  group.add(places);
  const b = new Batch();
  const pb = new Batch();
  const P = KART_PARK;
  const c = CIRCUIT;
  const n = c.x.length;
  const W = (u: number, v: number) => toWorld([u, v]);
  const flat = (batch: Batch, x0: number, z0: number, x1: number, z1: number, y: number, mat: THREE.Material) =>
    batch.add(place(new THREE.PlaneGeometry(x1 - x0, z1 - z0), (x0 + x1) / 2, y, (z0 + z1) / 2, 1, 1, 1, -Math.PI / 2), mat);
  /** Which side a bend's outside is on (left positive), 0 on the straight */
  const outside = (i: number) => (Math.abs(c.k[i]) > 0.04 ? -Math.sign(c.k[i]) : 0);

  // The grounds and the circuit: sites (growth plan Phase 3), built when there's time unless they're in the home view
  site('kart park grounds', [P.x0, P.z0, P.x1, P.z1], (into) => {
    const gb = new Batch();
    grounds(gb);
    gb.build(into);
  });
  site('kart park circuit', [P.x0, P.z0, P.x1, P.z1], (into) => {
    const tb = new Batch();
    track(tb, low);
    tb.build(into);
  });

  /* ----- The start: the line, both ways' grids, the gantry ----- */

  {
    const f = frame(c, c.start);
    const yaw = Math.atan2(-f.tz, f.tx);
    const g = new THREE.PlaneGeometry(1, TRACK_HALF * 2).rotateX(-Math.PI / 2).rotateY(yaw).translate(f.x, f.y + DECAL, f.z);
    const m = new THREE.Mesh(g, lit(new THREE.MeshBasicMaterial({ map: chequerTex() }), 0.85, 0.75));
    m.matrixAutoUpdate = false;
    group.add(fx(m));
    // The grid boxes: an open bracket round each slot, the front painted across
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
  }
  {
    const G = GANTRY;
    const top = G.h;
    for (const p of G.posts) {
      b.box(p.x - 0.22, 0, p.z - 0.22, 0.44, top, 0.44, STEEL);
      b.box(p.x - 0.3, 0, p.z - 0.3, 0.6, 0.14, 0.6, INK);
    }
    const f = frame(c, c.start);
    const nx = f.nx;
    const nz = f.nz;
    const ryN = Math.atan2(-nz, nx);
    const span = G.half * 2 + 0.44;
    b.add(place(unitBox, G.x, top - 0.15, G.z, span, 0.3, 0.3, 0, ryN), STEEL);
    // (its ends just inside the posts' faces: level with them, they flicker)
    b.add(place(unitBox, G.x, top - 0.32, G.z, span - 0.02, 0.04, 0.32, 0, ryN), soft(PAL.cyan));
    // Five start lights in a housing over the track, steady red both ways (the countdown is in the HUD)
    b.add(place(unitBox, G.x, top + 0.17, G.z, 2.8, 0.34, 0.4, 0, ryN), INK);
    const bulb = new THREE.SphereGeometry(0.085, 8, 6);
    const redGlow = glow('#ff3b3b');
    for (let k = -2; k <= 2; k++) for (const side of [1, -1]) b.add(bulb.clone().translate(G.x + nx * k * 0.55 + f.tx * 0.2 * side, top + 0.17, G.z + nz * k * 0.55 + f.tz * 0.2 * side), redGlow);
    // The banner under the beam, over the track, readable both ways
    const BW = 6.2;
    const BH = 0.8;
    const by = top - 0.36 - BH / 2;
    const bmat = lit(new THREE.MeshBasicMaterial({ map: bannerTex() }), 0.9, 1.6);
    const faces = [1, -1].map((side) => new THREE.PlaneGeometry(BW, BH).rotateY(Math.atan2(f.tx, f.tz) + (side > 0 ? 0 : Math.PI)).translate(G.x + f.tx * 0.03 * side, by, G.z + f.tz * 0.03 * side));
    const banner = new THREE.Mesh(mergeGeometries(faces, false)!, bmat);
    banner.matrixAutoUpdate = false;
    group.add(fx(banner));
    if (!low) {
      const [p0, p1] = G.posts;
      bunting(b, V(p0.x, 3.4, p0.z), V(p1.x, 3.4, p1.z), 0.35);
    }
  }

  /* ----- The pits: the lane, the bays, the cones ----- */

  const pit = PIT_LANE;
  {
    const all = [...Array(pit.x.length).keys()];
    // The lane over the run-off and the kerbs where it crosses them, then flat on the paving
    const pitY = (i: number) => {
      const loc = nearestOnCircuit(pit.x[i], pit.z[i]);
      return Math.max(PAVING, loc) + PIT_Y;
    };
    b.add(sweep(pit, all, strip(-PIT_HALF, PIT_HALF, (i) => pitY(i))), PIT_C);
    // A white line along both edges, and a dashed one down the middle for the speed limit's sake
    for (const s of [1, -1]) b.add(sweep(pit, all, strip(s * (PIT_HALF - 0.14), s * (PIT_HALF - 0.04), (i) => pitY(i) + 0.006)), LINE_C);
    for (let k = 4; k + 2 < all.length; k += 6) b.add(sweep(pit, all.slice(k, k + 3), strip(-0.05, 0.05, (i) => pitY(i) + 0.006)), YELLOW);
    // The bays: a painted box in front of each garage
    for (const [x, z] of BAYS) {
      const y = PAVING + PIT_Y + 0.008;
      b.box(x - 1.1, y, z - 0.05, 2.2, 0.004, 0.06, LINE_C);
      for (const s of [-1, 1]) b.box(x + s * 1.1 - 0.03, y, z - 0.05, 0.06, 0.004, 1.15, LINE_C);
    }
  }
  // The cones that close the pit lane's mouths during a race (instanced, shown by racing())
  const coneSpots: [number, number][] = [];
  for (const end of [0, 1]) {
    const s = end ? pit.L - 4 : 4;
    const f = frame(pit, s);
    for (let k = -2; k <= 2; k++) coneSpots.push([f.x + f.nx * k * 0.65, f.z + f.nz * k * 0.65]);
  }
  const cones = new THREE.InstancedMesh(new THREE.ConeGeometry(0.17, 0.5, 10).translate(0, 0.25, 0), toon('#ff8a3d', { name: 'cones' }), coneSpots.length);
  coneSpots.forEach(([x, z], i) => cones.setMatrixAt(i, _m.compose(_p.set(x, PAVING + PIT_Y, z), _q, _s)));
  cones.castShadow = true;
  cones.visible = false;
  cones.computeBoundingSphere();
  group.add(cones);

  /* ----- The garages, the big screen on their roof, the hut (in the spot's group) ----- */

  const [gx0, gz0] = W(SITE.garages.u0, SITE.garages.v0);
  const [gx1, gz1] = W(SITE.garages.u1, SITE.garages.v1);
  const GH = SITE.garages.h;
  {
    const depth = gz1 - gz0;
    // The back block, the roof over the open fronts, the dividing walls, a dark floor in each bay
    pb.box(gx0, -0.3, gz0 + depth * 0.55, gx1 - gx0, GH + 0.3, depth * 0.45, GARAGE_C);
    pb.box(gx0 - 0.15, GH, gz0 - 0.15, gx1 - gx0 + 0.3, 0.22, depth + 0.3, toon('#25223a'));
    pb.box(gx0 - 0.16, GH + 0.22, gz0 - 0.16, gx1 - gx0 + 0.32, 0.05, 0.05, soft(PAL.pink));
    const bays = BAYS.length;
    const bw = (gx1 - gx0) / bays;
    for (let k = 0; k <= bays; k++) pb.box(gx0 + k * bw - 0.12, 0, gz0, 0.24, GH, depth * 0.55, GARAGE_C);
    for (let k = 0; k < bays; k++) {
      flat(pb, gx0 + k * bw + 0.12, gz0, gx0 + (k + 1) * bw - 0.12, gz0 + depth * 0.55, PAVING + 0.004, GARAGE_IN);
      // A strip light at the back of each bay, a tool chest
      pb.box(gx0 + k * bw + 0.5, GH - 0.5, gz0 + depth * 0.55 - 0.06, bw - 1, 0.08, 0.05, soft(PAL.warm));
      pb.box(gx0 + k * bw + 0.4, 0, gz0 + depth * 0.55 - 0.55, 0.7, 0.8, 0.45, k % 2 ? RED : toon('#2aabee'));
    }
    // The bays' numbers over the fronts (the atlas' corner numbers, facing the pit lane)
    const nb = new Batch();
    const nm = lit(new THREE.MeshBasicMaterial({ map: atlasTex(), alphaTest: 0.5 }), 0.95, 1.2);
    for (let k = 0; k < bays; k++) nb.add(quad(gx0 + (k + 0.5) * bw, GH - 0.45, gz0 - 0.02, -1, 0, 0.7, 0.7, cellNumber(k + 1), false), nm);
    nb.build(places, { cast: false, receive: false });
    // The big screen on the roof, facing north over the straight
    const [cx] = W(SITE.screen.u, SITE.screen.v);
    const SW = SITE.screen.w;
    const SH = SITE.screen.h;
    const cz = gz0 + depth * 0.5;
    const base = GH + 0.6;
    for (const px of [cx - SW / 2 + 0.6, cx + SW / 2 - 0.6]) pb.box(px - 0.12, GH, cz - 0.12, 0.24, 0.8, 0.24, STEEL);
    pb.box(cx - SW / 2, base, cz - 0.3, SW, SH, 0.6, toon('#1b1830'));
    pb.box(cx - SW / 2 - 0.05, base - 0.05, cz - 0.35, SW + 0.1, 0.1, 0.7, STEEL);
    pb.box(cx - SW / 2 - 0.05, base + SH - 0.05, cz - 0.35, SW + 0.1, 0.1, 0.7, STEEL);
    const face = plane(SW - 0.2, SH - 0.2, lit(new THREE.MeshBasicMaterial({ map: screenTex() }), 0.9, 1.25));
    face.position.set(cx, base + SH / 2, cz - 0.31);
    face.rotation.y = Math.PI;
    places.add(fx(face));
  }
  const [hx0, hz0] = W(SITE.hut.u0, SITE.hut.v0);
  const [hx1, hz1] = W(SITE.hut.u1, SITE.hut.v1);
  const HUT_H = SITE.hut.h;
  {
    pb.box(hx0, -0.3, hz0, hx1 - hx0, HUT_H + 0.3, hz1 - hz0, toon('#3d4a6b'));
    pb.box(hx0 - 0.12, HUT_H, hz0 - 0.12, hx1 - hx0 + 0.24, 0.16, hz1 - hz0 + 0.24, toon('#25223a'));
    for (const z of [hz0 - 0.13, hz1 + 0.08]) pb.box(hx0 - 0.13, HUT_H + 0.16, z, hx1 - hx0 + 0.26, 0.05, 0.05, soft(PAL.pink));
    pb.box(hx0 - 0.02, 2.08, hz0 - 0.02, hx1 - hx0 + 0.04, 0.2, hz1 - hz0 + 0.04, toon('#e219e5'));
    // The door on the south side (HUT_DOOR is where you stand, just outside it), a lit window beside it, a shutter on the north side to the pits
    const dx = HUT_DOOR.x;
    pb.box(dx - 0.42, 0, hz1 - 0.03, 0.84, 1.6, 0.06, toon('#14102a'));
    pb.box(dx - 0.34, 0.7, hz1 + 0.02, 0.68, 0.5, 0.02, soft(PAL.warm));
    pb.box(dx - 0.5, 1.6, hz1 - 0.05, 1.0, 0.08, 0.3, INK);
    pb.box(dx + 1.4, 1.0, hz1 - 0.02, 1.6, 0.8, 0.05, soft(PAL.warm));
    for (let k = 0; k < 9; k++) pb.box(hx0 + 2, 0.75 + k * 0.13, hz0 - 0.03, 3, 0.12, 0.05, k % 2 ? toon('#8a86a8') : toon('#6f6a8f'));
    pb.box(hx0 + 1.95, 0.68, hz0 - 0.04, 3.1, 0.08, 0.07, YELLOW);
    // The signs: over the door, and over the shutter facing the pits
    const tex = neonSign(HUT_SIGN, PAL.pink, { board: null, w: 1024, h: 256, size: 180, tracking: 14 });
    for (const [x, z, ry] of [
      [dx, hz1 + 0.04, 0],
      [hx0 + 3.5, hz0 - 0.04, Math.PI],
    ] as const) {
      const sign = plane(2.6, 0.65, lit(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }), 1, 1.7));
      sign.position.set(x, 2.74, z);
      sign.rotation.y = ry;
      occlude(sign, tex);
      places.add(fx(sign));
    }
    // Tyres stacked and two drums against the hut's west wall
    for (let k = 0; k < 4; k++) pb.add(new THREE.CylinderGeometry(0.28, 0.28, 0.17, 12).translate(hx0 - 0.4, 0.09 + k * 0.18, hz1 - 1.0), toon('#17151f'));
    pb.add(new THREE.CylinderGeometry(0.2, 0.2, 0.55, 12).translate(hx0 - 0.4, 0.28, hz1 - 1.8), toon('#2aabee'));
    pb.add(new THREE.CylinderGeometry(0.2, 0.2, 0.55, 12).translate(hx0 - 0.4, 0.28, hz1 - 2.3), RED);
  }

  /* ----- The grandstand in the infield, facing south over the straight (in the spot's group) ----- */

  const seatCols = ['#0fb3c6', '#e35bc0', '#7a3fd6', '#2d7bff'].map((k) => toon(k));
  const fanSpots: { x: number; y: number; z: number }[] = [];
  const [sx0, sz0] = W(SITE.stand.u0, SITE.stand.v0);
  const [sx1, sz1] = W(SITE.stand.u1, SITE.stand.v1);
  {
    // Tiers rising to the north (the front is the south edge), as many as its depth holds, seats along each tread, fans in them
    const COUNT = Math.max(3, Math.min(5, Math.floor((sz1 - sz0) / 0.9)));
    const TIER = (sz1 - sz0) / COUNT;
    const RISE = Math.min(0.85, TIER * 0.75);
    const perTier = Math.round(((sx1 - sx0) / 42) * (low ? 10 : 30));
    /** The canopy over the top tier, with head room for a fan standing there */
    const ROOF = 0.5 + (COUNT - 1) * RISE + 1.7;
    for (let k = 0; k < COUNT; k++) {
      const h = 0.5 + k * RISE;
      const front = sz1 - k * TIER;
      pb.box(sx0, -0.3, sz0, sx1 - sx0, h + 0.3, front - sz0, toon('#3b3658'));
      const back = front - TIER;
      pb.box(sx0 + 0.1, h, back + 0.04, sx1 - sx0 - 0.2, 0.28, 0.34, seatCols[k % seatCols.length]);
      for (let j = 0; j < perTier; j++) {
        const x = sx0 + 0.6 + ((sx1 - sx0 - 1.2) * (j + 0.5)) / perTier + (r() - 0.5) * 0.25;
        if (r() < 0.12) continue;
        fanSpots.push({ x, y: h + 0.58, z: back + 0.24 });
      }
    }
    // The back wall, posts and a canopy over it all, a neon edge on the canopy's front
    pb.box(sx0 - 0.1, 0, sz0 - 0.12, sx1 - sx0 + 0.2, ROOF - 1, 0.12, toon('#2b2550'));
    for (const px of [sx0 + 0.1, (sx0 + sx1) / 2, sx1 - 0.1]) for (const pz of [sz0 + 0.05]) pb.box(px - 0.07, 0, pz - 0.07, 0.14, ROOF, 0.14, STEEL);
    pb.box(sx0 - 0.4, ROOF, sz0 - 0.4, sx1 - sx0 + 0.8, 0.14, sz1 - sz0 - 0.6, toon('#2b2550'));
    pb.box(sx0 - 0.39, ROOF + 0.02, sz1 - 1.04, sx1 - sx0 + 0.78, 0.1, 0.05, soft(PAL.cyan));
    // Flags at the ends (PulseChain colours, no logos)
    for (const [px, col, col2] of [
      [sx0 - 0.8, PAL.cyan, PAL.violet],
      [sx1 + 0.8, PAL.pink, PAL.blue],
    ] as const) {
      const pz = sz0 + 0.6;
      const top = ROOF + 0.8;
      pb.add(new THREE.CylinderGeometry(0.04, 0.05, top, 6).translate(px, top / 2, pz), INK);
      pb.add(new THREE.SphereGeometry(0.08, 6, 5).translate(px, top + 0.02, pz), toon(PAL.gold));
      pb.box(px - 0.015, top - 0.7, pz + 0.04, 0.03, 0.5, 0.9, toon(col));
      pb.box(px - 0.015, top - 1.4, pz + 0.04, 0.03, 0.4, 0.7, toon(col2));
    }
  }
  const fans = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.16, 0.28, 2, 8), toon('#ffffff', { name: 'fans' }), fanSpots.length);
  {
    const cols = [PAL.violet, PAL.cyan, PAL.pink, '#f2c94c', '#2aabee', '#e8e6f0'].map((k) => new THREE.Color(k));
    fanSpots.forEach((_, i) => fans.setColorAt(i, cols[Math.floor(r() * cols.length)]));
    fans.castShadow = true;
    fans.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    places.add(fans);
  }
  const fanPhase = fanSpots.map(() => r() * 6.28);
  const paintFans = (t: number) => {
    fanSpots.forEach((f, i) => {
      const bob = reduced ? 0 : Math.max(0, Math.sin(t * 2.6 + fanPhase[i])) * 0.07;
      fans.setMatrixAt(i, _m.compose(_p.set(f.x, f.y + bob, f.z), _q, _s));
    });
    fans.instanceMatrix.needsUpdate = true;
  };
  paintFans(0);
  fans.computeBoundingSphere();

  /* ----- The fence, the gate and the arch ----- */

  {
    const every = low ? 4 : 2;
    const posts: [number, number][] = [];
    for (let x = P.x0; x < P.x1; x += every) posts.push([x, P.z0]);
    for (let z = P.z0; z < P.z1; z += every) posts.push([P.x1, z]);
    for (let x = P.x1; x > P.x0; x -= every) if (x < GATE.x0 - 0.3 || x > GATE.x1 + 0.3) posts.push([x, P.z1]);
    for (let z = P.z1; z > P.z0; z -= every) posts.push([P.x0, z]);
    const fence = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), INK, posts.length);
    posts.forEach(([x, z], i) => fence.setMatrixAt(i, _m.compose(_p.set(x, 0.6, z), _q, _s)));
    fence.castShadow = true;
    fence.computeBoundingSphere();
    group.add(fence);
    for (const y of [0.42, 0.78, 1.14]) {
      b.box(P.x0, y, P.z0 - 0.025, P.x1 - P.x0, 0.05, 0.05, INK);
      b.box(P.x1 - 0.025, y, P.z0, 0.05, 0.05, P.z1 - P.z0, INK);
      b.box(P.x0 - 0.025, y, P.z0, 0.05, 0.05, P.z1 - P.z0, INK);
      b.box(P.x0, y, P.z1 - 0.025, GATE.x0 - 0.15 - P.x0, 0.05, 0.05, INK);
      b.box(GATE.x1 + 0.15, y, P.z1 - 0.025, P.x1 - GATE.x1 - 0.15, 0.05, 0.05, INK);
    }
    const ARCH_H = 3.3;
    for (const x of [GATE.x0 - 0.15, GATE.x1 + 0.15]) {
      b.box(x - 0.125, 0, GATE.z - 0.125, 0.25, ARCH_H, 0.25, STEEL);
      b.box(x - 0.2, 0, GATE.z - 0.2, 0.4, 0.12, 0.4, INK);
    }
    b.box(GATE.x0 - 0.3, ARCH_H - 0.3, GATE.z - 0.15, GATE.x1 - GATE.x0 + 0.6, 0.3, 0.3, STEEL);
    b.box(GATE.x0 - 0.3, ARCH_H - 0.33, GATE.z - 0.17, GATE.x1 - GATE.x0 + 0.6, 0.03, 0.34, soft(PAL.cyan));
    const tex = neonSign(ARCH_SIGN, PAL.cyan, { board: null, w: 1024, h: 256, size: 190, tracking: 16 });
    const smat = lit(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }), 1, 1.8);
    const faces = [0, Math.PI].map((ry, k) => new THREE.PlaneGeometry(3.6, 0.8).rotateY(ry).translate((GATE.x0 + GATE.x1) / 2, ARCH_H + 0.42, GATE.z + (k ? -0.02 : 0.02)));
    const sign = new THREE.Mesh(mergeGeometries(faces, false)!, smat);
    sign.matrixAutoUpdate = false;
    occlude(sign, tex);
    group.add(fx(sign));
  }

  /* ----- The slip road down to the Parkway ----- */

  {
    const R = SLIP_ROAD;
    b.box(R.x - R.half, 0, R.z0, R.half * 2, 0.028, R.z1 - R.z0, ASPHALT);
    for (let z = R.z0 + 0.8; z < R.z1 - 4.5; z += 1.6) b.box(R.x - 0.05, 0.03, z, 0.1, 0.004, 0.7, LINE_C);
    b.box(R.x + R.half, 0, R.z0 - 0.3, 0.8, SLAB, R.z1 - 4 - R.z0 + 0.3, KERB_C);
  }

  /* ----- Dressing: tyre stacks set back from the bends, marshal posts, light poles, trees, lamps ----- */

  {
    const stacks: { x: number; z: number; h: number }[] = [];
    const step = low ? 3 : 1.5;
    for (let s = 0; s < c.L; s += step) {
      const f = frame(c, s);
      const i = Math.round(s / c.step) % n;
      const side = outside(i);
      if (!side || Math.abs(f.k) < 0.06 || enclosed(f)) continue;
      const x = f.x + f.nx * (CLEAR + SET_BACK) * side;
      const z = f.z + f.nz * (CLEAR + SET_BACK) * side;
      const [u, v] = toLocal([x, z]);
      if (!clearAt(u, v, 0.6)) continue;
      stacks.push({ x, z, h: 2 + (stacks.length % 3 === 0 ? 1 : 0) });
    }
    const count = stacks.reduce((a, s) => a + s.h, 0);
    const tyres = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10), toon('#ffffff', { name: 'tyres' }), Math.max(1, count));
    const dark = new THREE.Color('#17151f');
    const pale = new THREE.Color('#e8e6f0');
    let i = 0;
    stacks.forEach((s, k) => {
      for (let j = 0; j < s.h; j++) {
        tyres.setMatrixAt(i, _m.compose(_p.set(s.x, 0.1 + j * 0.2, s.z), _q, _s));
        tyres.setColorAt(i, j === s.h - 1 && k % 2 ? pale : dark);
        i++;
      }
    });
    tyres.count = count;
    tyres.castShadow = true;
    tyres.computeBoundingSphere();
    group.add(tyres);
  }
  const taken: [number, number][] = [];
  const free = (u: number, v: number, d: number) => taken.every(([a, bb]) => Math.hypot(a - u, bb - v) >= d);
  // Marshal posts every ~27 tiles round the outside, past the run-off
  {
    let col = 0;
    for (let s = 9; s < c.L; s += low ? 54 : 27) {
      const f = frame(c, s);
      if (enclosed(f)) continue;
      const side = f.k ? -Math.sign(f.k) : 1;
      const x = f.x + f.nx * (CLEAR + 1.4) * side;
      const z = f.z + f.nz * (CLEAR + 1.4) * side;
      const [u, v] = toLocal([x, z]);
      if (!clearAt(u, v, 1) || !free(u, v, 4)) continue;
      taken.push([u, v]);
      b.box(x - 0.05, 0, z - 0.05, 0.1, 2.4, 0.1, INK);
      b.box(x - 0.2, 0, z - 0.2, 0.4, 0.1, 0.4, STEEL);
      b.add(place(unitBox, x, 2.1, z, 0.56, 0.38, 0.03, 0, Math.atan2(-f.tz, f.tx)), col++ % 2 ? toon(PAL.gold) : toon(PAL.cyan));
    }
  }
  // Light poles: tall, a crossarm with four lamp heads, instanced (the heads lit), facing the middle of the park
  {
    const spots: [number, number][] = [
      [3, 3],
      [28, 3],
      [58, 3],
      [SITE_U - 3, 3],
      [SITE_U - 3, 28],
      [SITE_U - 3, 58],
      [3, 28],
      [3, 58],
      [37.5, 22],
      [58.5, 28],
      [16, 40],
      [43.5, 59],
      [62, 64],
      [14, 74],
    ];
    const poles: { x: number; z: number }[] = [];
    for (const [u, v] of spots) {
      if (!clearAt(u, v, 1) || !free(u, v, 6)) continue;
      taken.push([u, v]);
      const [x, z] = W(u, v);
      poles.push({ x, z });
    }
    const use = low ? poles.filter((_, k) => k % 2 === 0) : poles;
    const H = 6;
    const parts = [new THREE.CylinderGeometry(0.08, 0.11, H, 7).translate(0, H / 2, 0), new THREE.BoxGeometry(0.3, 0.12, 0.3).translate(0, 0.06, 0), new THREE.BoxGeometry(1.9, 0.1, 0.1).translate(0, H - 0.1, 0)];
    const heads: THREE.BufferGeometry[] = [];
    for (const k of [-0.75, -0.25, 0.25, 0.75]) {
      parts.push(new THREE.BoxGeometry(0.34, 0.14, 0.24).translate(k, H - 0.22, 0));
      heads.push(new THREE.BoxGeometry(0.3, 0.03, 0.2).translate(k, H - 0.3, 0));
    }
    const pm = new THREE.InstancedMesh(mergeGeometries(parts, false)!, toon('#1b1830', { name: 'lightpoles' }), Math.max(1, use.length));
    const lampsOn = new THREE.InstancedMesh(mergeGeometries(heads, false)!, soft(PAL.warm), Math.max(1, use.length));
    const [mx, mz] = W(SITE_U / 2, SITE_V * 0.42);
    use.forEach((pl, k) => {
      const ry = Math.atan2(-(mz - pl.z), mx - pl.x) + Math.PI / 2;
      _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
      _m.compose(_p.set(pl.x, 0, pl.z), _q, _s);
      pm.setMatrixAt(k, _m);
      lampsOn.setMatrixAt(k, _m);
    });
    _q.identity();
    pm.count = lampsOn.count = use.length;
    pm.castShadow = true;
    pm.computeBoundingSphere();
    lampsOn.computeBoundingSphere();
    group.add(pm, fx(lampsOn));
  }
  // Trees: belts along the north and east fences and clusters in the infields, past the run-off
  {
    const belt = low ? 6 : 3;
    const tree = (u: number, v: number) => {
      const [x, z] = W(u, v);
      addTree(x, z, 0.85 + r() * 0.4, r() < 0.3, 0);
      taken.push([u, v]);
    };
    for (let u = 4; u < SITE_U - 2; u += belt) if (clearAt(u, 1.6, 2) && free(u, 1.6, 2.4)) tree(u + (r() - 0.5) * 0.8, 1.6 + r() * 0.8);
    for (let v = 4; v < PAVED_V - 2; v += belt) if (clearAt(SITE_U - 1, v, 2) && free(SITE_U - 1, v, 2.4)) tree(SITE_U - 1 + (r() - 0.5) * 0.6, v + (r() - 0.5) * 0.8);
    for (let v = 4; v < PAVED_V - 2; v += 4.5)
      for (let u = 4; u < SITE_U - 2; u += 4.5) {
        const uu = u + (r() - 0.5) * 3;
        const vv = v + (r() - 0.5) * 3;
        if (r() > (low ? 0.3 : 0.55)) continue;
        if (clearAt(uu, vv, 2.4) && free(uu, vv, 2.6)) tree(uu, vv);
      }
  }
  {
    const R = SLIP_ROAD;
    for (let z = R.z0 + 2; z < R.z1 - 4.5; z += 4.5) addLamp(R.x + R.half + 0.45, z, Math.PI, z > P.z1 + 1 ? SLAB : 0);
    addLamp(GATE.x0 - 0.8, GATE.z + 0.7, 0, SLAB);
    addLamp(GATE.x1 + 0.8, GATE.z + 0.7, Math.PI, SLAB);
  }

  b.build(group);
  pb.build(places);

  /* ----- The spot ----- */

  let bx0 = Infinity;
  let bx1 = -Infinity;
  let bz0 = Infinity;
  let bz1 = -Infinity;
  for (let i = 0; i < n; i++) {
    bx0 = Math.min(bx0, c.x[i]);
    bx1 = Math.max(bx1, c.x[i]);
    bz0 = Math.min(bz0, c.z[i]);
    bz1 = Math.max(bz1, c.z[i]);
  }
  const focus = V((bx0 + bx1) / 2, 0, (bz0 + bz1) / 2);
  const pin = V((hx0 + hx1) / 2, HUT_H + 1.3, (hz0 + hz1) / 2);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.64, 48), glowMat(PAL.cyan, 0, null));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(HUT_DOOR.x, PAVING + 0.014, HUT_DOOR.z);
  group.add(fx(ring));
  const spot: Spot = { id: ID, group: places, focus, size: 95, pin, ring };
  // The show kart waits in the middle bay, nose to the pit lane (kart.ts: yaw π/2 faces -z)
  const [bayX, bayZ] = BAYS[3];
  const showSpot = { x: bayX, y: PAVING + PIT_Y, z: bayZ + 0.45, yaw: Math.PI / 2 };

  /* ----- Per course: the guidance, pointing the way round being raced ----- */

  const atlas = lit(new THREE.MeshBasicMaterial({ map: atlasTex(), alphaTest: 0.5, side: THREE.DoubleSide }), 0.95, 1.25);
  const courses = new Map<CourseId, THREE.Group>();
  for (const id of COURSE_IDS) {
    const course = COURSES[id];
    const cg = new THREE.Group();
    cg.name = `karts-${id}`;
    cg.visible = false;
    const gb = new Batch();
    const signs = new Batch();
    const pads = new Batch();
    guidance(course, gb, signs, pads);
    gb.build(cg);
    signs.build(cg, { cast: false, receive: false });
    const pg = new THREE.Group();
    pads.build(pg, { cast: false, receive: false });
    cg.add(fx(pg));
    group.add(cg);
    courses.set(id, cg);
  }
  /** One way round's guidance: posts in `gb`, boards and arrows (the atlas) in `signs`, the pads' chevrons in `pads` */
  function guidance(cc: Course, gb: Batch, signs: Batch, pads: Batch) {
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
    /** Somewhere a board can stand: past the run-off, off everything else */
    const standAt = (x: number, z: number) => {
      const [u, v] = toLocal([x, z]);
      return u > 1 && u < SITE_U + 1 && v > 0 && v < PAVED_V - 0.5 && circuitDistance(x, z) > CLEAR + 0.2;
    };
    const post = (x: number, z: number, h: number) => gb.box(x - 0.05, 0, z - 0.05, 0.1, h, 0.1, INK);
    for (const corner of corners) {
      const side = -corner.dir;
      // Chevron boards along the outside of the bend, facing the track, the arrows pointing this way round
      for (let s = corner.s0 + 1; s <= corner.s1; s += 4.5) {
        const f = frame(cc, s);
        if (enclosed(f)) continue;
        const lat = side * (CLEAR + 0.5);
        const x = f.x + f.nx * lat;
        const z = f.z + f.nz * lat;
        if (!standAt(x, z)) continue;
        post(x - f.tx * 0.5, z - f.tz * 0.5, 1.0);
        post(x + f.tx * 0.5, z + f.tz * 0.5, 1.0);
        signs.add(quad(x, 1.25, z, f.tx, f.tz, 1.3, 0.65, CELL_CHEVRON, false), atlas);
      }
      // The corner's number on the outside at its apex, facing the karts coming into it
      {
        const f = frame(cc, corner.apex);
        for (const extra of [0.5, 2.5, 5]) {
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
          const lat = side * (CLEAR + 0.6);
          const x = f.x + f.nx * lat;
          const z = f.z + f.nz * lat;
          if (!standAt(x, z)) continue;
          post(x, z, 1.1);
          signs.add(quad(x, 1.4, z, -f.nx, -f.nz, 0.7, 0.7, cellMarker(m), false), atlas);
        }
    }
  }
  let current: CourseId | null = null;
  function setCourse(id: CourseId) {
    if (id === current) return;
    current = id;
    for (const [k, cg] of courses) cg.visible = k === id;
  }
  setCourse('circuit');

  opts.tick(({ t }) => {
    if (reduced) return;
    paintFans(t);
  });

  return {
    group,
    spot,
    setCourse,
    racing(on) {
      cones.visible = on;
    },
    showSpot,
  };
}

/* ---------- Helpers that read the circuit ---------- */

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
