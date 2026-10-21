/*
 * The kart park in 3D (kartpark.ts holds the layout; kart-sim.ts races on
 * it, kart.ts is the race's view). Outside the Parkway in the north-east,
 * on flat ground (y = 0, no slab):
 *
 * - The site: a lawn inside a railing fence (the gate on the south side under
 *   a KART PARK arch, two lamps), a paved strip along the south for the hut,
 *   the pits and the big screen, and the slip road from the gate down to the
 *   Parkway (dashed centre line, a kerb on its east side, lamps).
 * - The track: the network's PIECES, each swept once along its samples: a
 *   ribbon of asphalt (wet stretches darker and bluer with puddles, the dirt
 *   shortcut brown with tyre ruts) on a dark apron, edge lines, red / white
 *   kerbs on the inside of the bends, the chequered start line and the start
 *   gantry (posts, a beam, five red lights, a banner). Every cross-section
 *   follows the banking (`heightAt`), so the bowls tilt with their kerbs,
 *   walls and stripes. Edges: a continuous low kerb along both edges with a
 *   neon strip on top (cyan on the piece's left, pink on its right) and
 *   no barrier blocks: the edges are open to walk and drive over (nothing on
 *   the track is in KART_SOLIDS). At the nodes the kerbs stop and a flat apron widens the junction
 *   into a Y. Raised stretches get a deck (a slab on the PILLARS, railed)
 *   where the data flags one, an embankment where it doesn't (the hill, the
 *   hump). The tunnel is a half-cylinder tube with ribs, portal frames and
 *   neon strips inside; the bowls get velodrome stripes, taller outer walls
 *   and bunting; the shortcut has low wooden posts and a rope.
 * - The grandstand beside the start straight (four tiers facing east, a
 *   canopy on posts, flags at its ends, fans bobbing in the seats), a second
 *   small stand outside the north-west bowl, the kart hut (shutter, door,
 *   KART HUT sign, tyres and a drum beside it), the big screen facing the
 *   track, the scoreboard at the hairpin, the pits with the show kart's bay,
 *   festoon lights from the hut over the pits to the stand, tyre walls round
 *   the hairpin's bend, marshal posts with flags round the outside of the
 *   track, tall light poles, trees in belts along the fences and clusters in
 *   the infields (`siteDressing()`, kept off every lane).
 * - Per course (setCourse): boost pad chevrons on the asphalt (pointing the
 *   course's way) and the item boxes (one InstancedMesh, turning; showBoxes
 *   hides the taken ones).
 *
 * Draw calls: everything static goes through one Batch (shared paint, neon
 * per brightness); the fence posts, the fans, the tyres, the light poles and
 * the item boxes are instanced; the signs, the screen and the start line keep
 * their own textures. The hut, the stand and the screen sit in the spot's own
 * group (what City view lifts on hover); the ground and the track stay put.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { SpotId } from '../../lib/city';
import { Batch, FONT_DISPLAY, FONT_MONO, PAL, canvasTex, fx, glowMat, lit, neon, neonSign, occlude, place, plane, rng, toon } from './kit';
import {
  BOX_LATERALS,
  COURSES,
  F,
  GANTRY,
  GATE,
  HUT_DOOR,
  KART_PARK,
  NODES,
  NODE_REACH,
  PIECES,
  PILLARS,
  SITE,
  SLIP_ROAD,
  TRACK_HALF,
  WALL_EVERY,
  at,
  frame,
  nearNode,
  toLocal,
  toWorld,
  type CourseId,
  type Line,
  type Piece,
} from './kartpark';
import type { KartPark } from './kart-types';
import type { Spot } from './landmarks';
import { SLAB, addLamp, addTree, type Tick } from './world';

/** The place's id (city.ts adds it to SpotId) */
const ID = 'karts' as unknown as SpotId;

/* ---------- Heights (over the ground at 0, or over a sample's own surface) ---------- */

const LAWN = 0.006;
const APRON = 0.015;
const PAVING = 0.025;
/** The junction aprons, under every ribbon */
const NODE_Y = 0.029;
/** The ribbon's top over the surface (each piece a touch higher than the last, so overlaps at the nodes never fight), then the decals on it */
const RIBBON = 0.035;
const PIECE_STEP = 0.003;
const EDGE = 0.01;
const LINE = 0.015;
/** Decals the courses lay on the asphalt (pads, the start line): over every piece's lines */
const DECAL = RIBBON + PIECE_STEP * PIECES.length + 0.025;
/** The walls: 0.3 thick, centred half + 0.3 out (KART_SOLIDS matches), the kerb and the blocks on it */
const WALL_IN = 0.15;
const WALL_OUT = 0.45;
const KERB_H = 0.16;
/** The bowls' outer walls */
const BANK_WALL_H = 0.9;
/** A deck under a raised ribbon */
const DECK = 0.3;
/** How far an embankment's foot reaches past the walls (steep: the hill runs close to the fence) */
const BANK_FOOT = 1.2;
/** How wide the apron reaches past the walls */
const APRON_REACH = TRACK_HALF + WALL_OUT + 1.2;
/** The tunnel: the tube's radius round the centre line (headroom at the ribbon's edge is about 3.5) */
const TUBE_R = TRACK_HALF + WALL_OUT + 0.6;
const TUBE_T = 0.3;
/** Within this of a shortcut's end the walls are left out (KART_SOLIDS does the same) */
const SC_END = 12;

/* ---------- Materials ---------- */

const ASPHALT = toon('#26243f');
const WET_C = toon('#1d2742');
const PUDDLE = toon('#33456e');
const DIRT_C = toon('#6e4b30');
const RUT_C = toon('#4f3522');
const WOOD = toon('#8a6a45');
const APRON_C = toon('#1c1a2e');
const LAWN_C = toon('#2f7a52');
const EARTH = toon('#3b6447');
const PAVE = toon('#4b4766');
const PITS_C = toon('#5a5574');
const INK = toon('#1b1830');
const STEEL = toon('#2b2a40');
const DECK_C = toon('#34314f');
const RAIL = toon('#c9c4e6');
const WHITE = toon('#e8e6f0');
const LINE_C = toon('#d9d4ef');
const RED = toon('#e23b3b');
const KERB_C = toon('#5a5290');
const TUBE_C = toon('#2b2550');
const TUBE_IN = toon('#141226');
const PORTAL = toon('#4a3f7a');
const soft = (c: string) => neon(c, 0.5, 1.3);
const glow = (c: string) => neon(c, 0.6, 2.4);
/** Fixed copy only */
const ARCH_SIGN = 'KART PARK';
const HUT_SIGN = 'KART HUT';
const BANNER = 'KART PARK · START / FINISH';
const SCREEN_TITLE = 'KART PARK';
const SCREEN_SUB = 'THREE CIRCUITS · SIX COURSES';
const BOARD_TITLE = 'KART PARK';
const BOARD_SUB = 'NEON LOOP · SUMMIT RUN · GRAND CIRCUIT';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const Z = new THREE.Vector3(0, 0, 1);
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);

/* ---------- Sweeps along a piece ---------- */

/** A cross-section point: lateral (left positive) and a height from the surface's own height there (the sample's y with the banking) */
type H = (ys: number, i: number) => number;
type XPt = [lat: number, h: H];
const rel = (h: number): H => (ys) => ys + h;
const abs = (h: number): H => () => h;

/**
 * Quads swept along a line through the consecutive samples `run`, one strip per edge of the
 * cross-section `poly`. Walk the section from the right side (negative lateral) up, over the
 * top from left to right... in short: an edge from a lower lateral to a higher one faces up, an
 * edge going down on the positive side (or up on the negative side) faces outward. Every vertex
 * is kept inside the site.
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
      const i = Math.max(0, Math.min(n - 1, run[k]));
      // The left normal, as frame() has it
      const nx = c.tz[i];
      const nz = -c.tx[i];
      for (let j = 0; j < 2; j++) {
        const [l, h] = poly[e + j];
        pos[v * 3] = Math.max(P.x0 + 0.1, Math.min(P.x1 - 0.1, c.x[i] + nx * l));
        pos[v * 3 + 1] = h(c.y[i] - c.roll[i] * l, i);
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
 * Runs of consecutive samples that `keep` says yes to, along an open line. Each run takes the
 * sample after its last too, so the segment between one run and the next is drawn once (by the
 * earlier run) and never left out.
 */
function runs(c: Line, keep: (i: number) => boolean) {
  const n = c.x.length;
  const out: number[][] = [];
  let cur: number[] = [];
  for (let i = 0; i < n; i++) {
    if (keep(i)) cur.push(i);
    else if (cur.length) {
      out.push([...cur, i]);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out.filter((r) => r.length > 1);
}

/** A flat quad facing up from four corners (x, z) walked round in order */
function flatQuad(pts: [number, number][], y: number) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts.flatMap(([x, z]) => [x, y, z])), 3));
  g.setIndex([0, 1, 3, 1, 2, 3]);
  g.computeVertexNormals();
  // Whichever way the corners were walked, the quad faces up
  if (g.attributes.normal.getY(0) < 0) {
    g.setIndex([0, 3, 1, 1, 3, 2]);
    g.computeVertexNormals();
  }
  return g;
}

/** A flat bar from (x0, z0) to (x1, z1), w wide, in the local plane of a decal */
function bar(x0: number, z0: number, x1: number, z1: number, w: number): [number, number][] {
  const d = Math.hypot(x1 - x0, z1 - z0) || 1;
  const nx = (-(z1 - z0) / d) * (w / 2);
  const nz = ((x1 - x0) / d) * (w / 2);
  return [
    [x0 + nx, z0 + nz],
    [x1 + nx, z1 + nz],
    [x1 - nx, z1 - nz],
    [x0 - nx, z0 - nz],
  ];
}

/** A square beam between two points (cables, braces, ropes) */
function beam(b: Batch, a: THREE.Vector3, c: THREE.Vector3, t: number, mat: THREE.Material) {
  const dir = c.clone().sub(a);
  const len = dir.length();
  const g = unitBox.clone();
  g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(Z, dir.normalize()), V(t, t, len)));
  b.add(g, mat);
}

/** A sagging cable with bulbs hung under it (festoon lights) */
function festoon(b: Batch, from: THREE.Vector3, to: THREE.Vector3, sag: number, bulb: THREE.Material) {
  const n = Math.max(2, Math.round(from.distanceTo(to) / 1.1));
  const pt = (t: number) => V(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t - sag * 4 * t * (1 - t), from.z + (to.z - from.z) * t);
  const sphere = new THREE.SphereGeometry(0.06, 6, 5);
  for (let k = 0; k < n; k++) {
    beam(b, pt(k / n), pt((k + 1) / n), 0.025, INK);
    const p = pt((k + 0.5) / n);
    b.add(sphere.clone().translate(p.x, p.y - 0.1, p.z), bulb);
  }
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
    // The flag hangs from the string's segment, drawn both ways round so it shows from both sides
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

/** The gantry's banner (a lit board, the same face both ways) */
const bannerTex = () =>
  canvasTex(1024, 160, (c, w, h) => {
    c.fillStyle = '#0b0a18';
    c.fillRect(0, 0, w, h);
    chequerBands(c, w, h, 20);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `900 84px ${FONT_DISPLAY}`;
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '8px';
    glowText(c, BANNER, w / 2, h / 2 + 4, PAL.cyan, 24);
  });

/** The big screen's face */
const screenTex = () =>
  canvasTex(1024, 600, (c, w, h) => {
    c.fillStyle = '#0b0a18';
    c.fillRect(0, 0, w, h);
    // Faint scan lines
    c.fillStyle = '#ffffff08';
    for (let y = 0; y < h; y += 8) c.fillRect(0, y, w, 3);
    chequerBands(c, w, h, 36);
    c.strokeStyle = PAL.cyan;
    c.lineWidth = 6;
    c.strokeRect(14, 34, w - 28, h - 68);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `900 230px ${FONT_DISPLAY}`;
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '12px';
    glowText(c, SCREEN_TITLE, w / 2, 250, PAL.pink, 36);
    c.font = `700 56px ${FONT_MONO}`;
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '10px';
    c.fillStyle = PAL.cyan;
    c.fillText(SCREEN_SUB, w / 2, 440);
  });

/** The scoreboard at the hairpin: the park's name and its three circuits */
const boardTex = () =>
  canvasTex(1024, 320, (c, w, h) => {
    c.fillStyle = '#0b0a18';
    c.fillRect(0, 0, w, h);
    chequerBands(c, w, h, 24);
    c.strokeStyle = PAL.violet;
    c.lineWidth = 5;
    c.strokeRect(12, 24, w - 24, h - 48);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `900 150px ${FONT_DISPLAY}`;
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '12px';
    glowText(c, BOARD_TITLE, w / 2, 120, PAL.cyan, 28);
    c.font = `700 40px ${FONT_MONO}`;
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '4px';
    c.fillStyle = PAL.pink;
    c.fillText(BOARD_SUB, w / 2, 236);
  });

/* ---------- The site's dressing (DOM-free: where the trees, lamps, marshal posts and light poles stand) ---------- */

export interface Dressing {
  trees: { x: number; z: number; s: number; pine: boolean }[];
  lamps: { x: number; z: number; ry: number }[];
  /** Marshal posts: where, which way the flag faces, and its colour */
  marshals: { x: number; z: number; yaw: number; col: number }[];
  /** Tall light poles */
  poles: { x: number; z: number }[];
}

/** The fixtures' rectangles on the site (local u, v), kept clear of trees and posts */
const FIXTURES: [number, number, number, number][] = [
  [SITE.hut.u0, SITE.hut.v0, SITE.hut.u1, SITE.hut.v1],
  [SITE.pits.u0, SITE.pits.v0, SITE.pits.u1, SITE.pits.v1],
  [SITE.stand.u0, SITE.stand.v0, SITE.stand.u1, SITE.stand.v1],
  [SITE.screen.u - SITE.screen.w / 2, SITE.screen.v - 1, SITE.screen.u + SITE.screen.w / 2, SITE.screen.v + 1],
];
/** The second stand, outside the north-west bowl, facing east over it (local u, v) */
const STAND2 = { u0: 0.6, v0: 11, u1: 5.4, v1: 25 };
/** The scoreboard outside the hairpin's bend, facing north-west over it (local u, v, its yaw and width) */
const BOARD = { u: 113, v: 128.5, ry: 0.436, w: 7 };
/** Where the paved strip along the south begins (local v) */
const PAVED_V = 126;
FIXTURES.push([STAND2.u0 - 0.6, STAND2.v0 - 0.6, STAND2.u1 + 0.6, STAND2.v1 + 0.6], [BOARD.u - 4, BOARD.v - 2, BOARD.u + 4, BOARD.v + 2]);

/**
 * Where something standing on the lawn keeps off everything: `margin` past every piece's
 * half width, off the junctions, the fixtures, the gate path and the paving, inside the fence.
 */
function clearAt(u: number, v: number, margin: number, fixtureMargin = 2.2) {
  if (u < 1.6 || u > 136 - 1.6 + 2 || v < -2 + 1.6 || v > PAVED_V - 1) return false;
  if (u > 2.5 && u < 9.5 && v > 116) return false;
  for (const [u0, v0, u1, v1] of FIXTURES) if (u > u0 - fixtureMargin && u < u1 + fixtureMargin && v > v0 - fixtureMargin && v < v1 + fixtureMargin) return false;
  const [x, z] = toWorld([u, v]);
  for (const nd of NODES) if (Math.hypot(nd.x - x, nd.z - z) < NODE_REACH - 1) return false;
  for (const p of PIECES) {
    const reach = p.half + margin;
    for (let i = 0; i < p.x.length; i += 2) if (Math.abs(p.x[i] - x) < reach && Math.abs(p.z[i] - z) < reach && Math.hypot(p.x[i] - x, p.z[i] - z) < reach) return false;
  }
  for (const g of GANTRY.posts) if (Math.hypot(g.x - x, g.z - z) < 2.5) return false;
  for (const pl of PILLARS) if (Math.hypot(pl.x - x, pl.z - z) < 1.6) return false;
  return true;
}

/** The dressing, from the layout: deterministic, halved on phones */
export function siteDressing(low: boolean): Dressing {
  const r = rng(9191);
  const out: Dressing = { trees: [], lamps: [], marshals: [], poles: [] };
  const taken: [number, number][] = [];
  const free = (u: number, v: number, d: number) => taken.every(([a, b]) => Math.hypot(a - u, b - v) >= d);
  const take = (u: number, v: number) => taken.push([u, v]);
  const tree = (u: number, v: number) => {
    const [x, z] = toWorld([u, v]);
    out.trees.push({ x, z, s: 0.85 + r() * 0.4, pine: r() < 0.3 });
    take(u, v);
  };
  // Light poles first (they need the room): along the fences and in the infields, where the track keeps away
  const poleSpots: [number, number][] = [
    [3, 3],
    [40, 3],
    [120, 3],
    [133.5, 60],
    [133.5, 118],
    [45, 122],
    [85, 122],
    [120, 122],
    [3, 60],
    [3, 122],
    [32, 86],
    [98, 88],
    [92, 23],
    [45, 47],
  ];
  for (const [u, v] of poleSpots) {
    if (!clearAt(u, v, 1.8, 1.4) || !free(u, v, 6)) continue;
    const [x, z] = toWorld([u, v]);
    out.poles.push({ x, z });
    take(u, v);
  }
  if (low) out.poles = out.poles.filter((_, i) => i % 2 === 0);
  // Marshal posts every ~40 tiles along the outside of each sector, on the ground, clear of the other pieces
  let flagCol = 0;
  for (const p of PIECES) {
    if (p.id === 'shortcut') continue;
    for (let s = 20; s < p.L - 10; s += low ? 80 : 40) {
      const f = frame(p, s);
      if (f.y > 0.05) continue;
      const side = f.k ? -Math.sign(f.k) : (Math.round(s / 40) % 2 ? 1 : -1);
      const x = f.x + f.nx * (p.half + 2.0) * side;
      const z = f.z + f.nz * (p.half + 2.0) * side;
      const [u, v] = toLocal([x, z]);
      // Off its own lane by construction: the clearance test is against everything else
      const others = PIECES.every((q) => q === p || !near(q, x, z, q.half + 1.5));
      if (!others || !inSite(u, v) || nearNode(x, z) || !fixturesClear(u, v) || !free(u, v, 4)) continue;
      out.marshals.push({ x, z, yaw: Math.atan2(-f.tz, f.tx), col: flagCol++ % 2 });
      take(u, v);
    }
  }
  // Belts along the north and east fences (where the track keeps away)
  const belt = low ? 6 : 3;
  for (let u = 4; u < 134; u += belt) if (clearAt(u, 1.6, 1.9) && free(u, 1.6, 2.4)) tree(u + (r() - 0.5) * 0.8, 1.6 + r() * 0.8);
  for (let v = 4; v < PAVED_V - 2; v += belt) if (clearAt(134.6, v, 1.9) && free(134.6, v, 2.4)) tree(134.6 + (r() - 0.5) * 0.8, v + (r() - 0.5) * 0.8);
  // Clusters in the infields: a jittered grid, thinned
  for (let v = 4; v < PAVED_V - 2; v += 4.5)
    for (let u = 4; u < 134; u += 4.5) {
      const uu = u + (r() - 0.5) * 3;
      const vv = v + (r() - 0.5) * 3;
      if (r() > (low ? 0.3 : 0.55)) continue;
      if (clearAt(uu, vv, 2.4) && free(uu, vv, 2.6)) tree(uu, vv);
    }
  // Lamps along the slip road and either side of the gate
  const R = SLIP_ROAD;
  for (let z = R.z0 + 2; z < R.z1 - 4.5; z += 4.5) out.lamps.push({ x: R.x + R.half + 0.45, z, ry: Math.PI });
  out.lamps.push({ x: GATE.x0 - 0.8, z: GATE.z + 0.7, ry: 0 }, { x: GATE.x1 + 0.8, z: GATE.z + 0.7, ry: Math.PI });
  return out;
}
const near = (p: Piece, x: number, z: number, d: number) => {
  for (let i = 0; i < p.x.length; i += 2) if (Math.hypot(p.x[i] - x, p.z[i] - z) < d) return true;
  return false;
};
const inSite = (u: number, v: number) => u > 1.2 && u < 136.8 && v > -0.8 && v < PAVED_V - 1;
const fixturesClear = (u: number, v: number) => FIXTURES.every(([u0, v0, u1, v1]) => u < u0 - 1.5 || u > u1 + 1.5 || v < v0 - 1.5 || v > v1 + 1.5);

/* ---------- The park ---------- */

export function buildKartPark(scene: THREE.Scene, opts: { tick: (f: Tick) => void; reduced: boolean; low: boolean }): KartPark {
  const { low, reduced } = opts;
  const r = rng(4747);
  const group = new THREE.Group();
  group.name = 'kartpark';
  scene.add(group);
  /** The hut, the stand and the screen: the spot's group, lifted on hover */
  const places = new THREE.Group();
  places.name = ID;
  group.add(places);
  const b = new Batch();
  const pb = new Batch();
  const P = KART_PARK;
  const W = (u: number, v: number) => toWorld([u, v]);
  const flat = (x0: number, z0: number, x1: number, z1: number, y: number, mat: THREE.Material) =>
    b.add(place(new THREE.PlaneGeometry(x1 - x0, z1 - z0), (x0 + x1) / 2, y, (z0 + z1) / 2, 1, 1, 1, -Math.PI / 2), mat);
  const scPiece = PIECES.find((p) => p.id === 'shortcut')!;
  const scEnds = [frame(scPiece, 0), frame(scPiece, scPiece.L)];
  const nearScEnd = (x: number, z: number) => scEnds.some((e) => Math.hypot(e.x - x, e.z - z) < SC_END);
  /** The surface's height at a sample's edges: the higher and the lower */
  const edgeTop = (p: Piece, i: number) => p.y[i] + Math.abs(p.roll[i]) * p.half;

  /* ----- The ground ----- */

  flat(P.x0 + 0.3, P.z0 + 0.3, P.x1 - 0.3, P.z1 - 0.3, LAWN, LAWN_C);
  // The paved strip along the south (the hut, the pits, the screen), a pad under the stand
  const [, pavedZ] = W(0, PAVED_V);
  flat(P.x0 + 0.3, pavedZ, P.x1 - 0.3, P.z1 - 0.3, PAVING, PAVE);
  {
    const [sx0, sz0] = W(SITE.stand.u0 - 0.5, SITE.stand.v0 - 1.2);
    const [sx1, sz1] = W(SITE.stand.u1 + 0.6, SITE.stand.v1 + 1.2);
    flat(sx0, sz0, sx1, sz1, PAVING, PAVE);
  }
  // The junction aprons: a disc of asphalt at each node under the ribbons, so the Y reads as one surface (tilted with the banking where the bowl meets)
  for (const nd of NODES) {
    const piece = PIECES.find((p) => Math.hypot(p.x[0] - nd.x, p.z[0] - nd.z) < 0.5) ?? PIECES[0];
    const f = frame(piece, 0);
    const radius = nd.id === 'N' ? 10 : NODE_REACH - 2;
    const g = new THREE.CircleGeometry(radius, 40).rotateX(-Math.PI / 2);
    if (f.roll) g.rotateX(-Math.asin(f.roll)).rotateY(Math.atan2(-f.tz, f.tx));
    // Keep the disc inside the fence
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setX(i, Math.max(P.x0 + 0.1 - nd.x, Math.min(P.x1 - 0.1 - nd.x, pos.getX(i))));
      pos.setZ(i, Math.max(P.z0 + 0.1 - nd.z, Math.min(P.z1 - 0.1 - nd.z, pos.getZ(i))));
    }
    b.add(g.translate(nd.x, NODE_Y, nd.z), ASPHALT);
  }

  /* ----- The track: every piece once ----- */

  PIECES.forEach((p, pi) => {
    const n = p.x.length;
    const half = p.half;
    const dirt = p.id === 'shortcut';
    const ribbonY = RIBBON + pi * PIECE_STEP;
    const fl = (i: number) => p.flags[i];
    const atNode = (i: number) => nearNode(p.x[i], p.z[i]);
    const open = (i: number) => atNode(i) || (!dirt && nearScEnd(p.x[i], p.z[i]));
    /** A flat strip between two laterals, facing up whichever way round they come */
    const strip = (l0: number, l1: number, h: H): XPt[] => [[Math.min(l0, l1), h], [Math.max(l0, l1), h]];

    // The apron at ground level (the decks, the hills and the bowls carry their own)
    for (const run of runs(p, (i) => !(fl(i) & (F.deck | F.bank)) && edgeTop(p, i) < 0.05)) b.add(sweep(p, run, strip(-APRON_REACH, APRON_REACH, abs(APRON))), APRON_C);

    // The ribbon, by surface
    for (const run of runs(p, (i) => !(fl(i) & (F.wet | F.dirt)))) b.add(sweep(p, run, strip(-half, half, rel(ribbonY))), ASPHALT);
    for (const run of runs(p, (i) => !!(fl(i) & F.wet))) {
      b.add(sweep(p, run, strip(-half, half, rel(ribbonY))), WET_C);
      // A few puddles across the wet stretch
      for (let k = 2; k < run.length - 2; k += 7) {
        const i = run[k];
        const lat = ((k / 7) % 3) * 2.2 - 2.2 + (r() - 0.5);
        const f = frame(p, i * p.step);
        const g = new THREE.CircleGeometry(1, 10).scale(1.3 + r() * 0.5, 0.7, 1).rotateX(-Math.PI / 2).rotateY(Math.atan2(-f.tz, f.tx) + (r() - 0.5));
        b.add(g.translate(f.x + f.nx * lat, p.y[i] - p.roll[i] * lat + ribbonY + EDGE, f.z + f.nz * lat), PUDDLE);
      }
    }
    for (const run of runs(p, (i) => !!(fl(i) & F.dirt))) {
      b.add(sweep(p, run, strip(-half, half, rel(ribbonY))), DIRT_C);
      // Tyre ruts worn into it
      for (const s of [1, -1]) b.add(sweep(p, run, strip(s * 0.9, s * 1.35, rel(ribbonY + EDGE))), RUT_C);
    }
    if (!dirt) {
      // Edge lines (not across the junctions)
      for (const run of runs(p, (i) => !atNode(i))) for (const s of [1, -1]) b.add(sweep(p, run, strip(s * (half - 0.16), s * (half - 0.04), rel(ribbonY + EDGE))), LINE_C);
      // Red / white kerbs on the inside of the bends, a tile each
      for (const run of runs(p, (i) => Math.abs(p.k[i]) > 0.08 && !atNode(i))) {
        for (let j = 0; j + 1 < run.length; j += 2) {
          const chunk = run.slice(j, j + 3);
          const side = Math.sign(p.k[Math.min(n - 1, chunk[1] ?? chunk[0])]) || 1;
          b.add(sweep(p, chunk, strip(side * (half - 0.5), side * (half - 0.02), rel(ribbonY + LINE))), (j / 2) % 2 ? WHITE : RED);
        }
      }
      // The bowls: velodrome stripes (a band along the low edge, a red line and a blue one)
      for (const run of runs(p, (i) => !!(fl(i) & F.bank))) {
        const lo = p.roll[run[0]] > 0 ? 1 : -1;
        b.add(sweep(p, run, strip(lo * (half - 1.2), lo * (half - 0.5), rel(ribbonY + LINE))), toon(PAL.cyan));
        b.add(sweep(p, run, strip(lo * 2.2, lo * 2.4, rel(ribbonY + LINE))), RED);
        b.add(sweep(p, run, strip(-lo * 1.8, -lo * 1.6, rel(ribbonY + LINE))), toon(PAL.blue));
      }
      // The edges: a low kerb both sides with a neon strip on top (taller on a bowl's high side); nothing solid, a kart drives over it
      for (const run of runs(p, (i) => !open(i))) {
        for (const s of [1, -1]) {
          const top: H = (ys, i) => ys + (fl(i) & F.bank && (p.roll[i] > 0 ? -1 : 1) === s ? BANK_WALL_H : KERB_H);
          const [i0, i1] = s > 0 ? [half + WALL_IN, half + WALL_OUT] : [-(half + WALL_OUT), -(half + WALL_IN)];
          b.add(sweep(p, run, [[i0, rel(-0.06)], [i0, top], [i1, top], [i1, rel(-0.06)]]), STEEL);
          const mid = s * (half + 0.3);
          b.add(sweep(p, run, [[mid - 0.045, (ys, i) => top(ys, i) + 0.012], [mid + 0.045, (ys, i) => top(ys, i) + 0.012]]), soft(s > 0 ? PAL.cyan : PAL.pink));
        }
      }
      // The decks: a slab under a raised ribbon, railed; the embankments: a wedge of earth up to it
      for (const run of runs(p, (i) => !!(fl(i) & F.deck) && p.y[i] > 0.05)) {
        const o = half + WALL_OUT;
        b.add(sweep(p, run, [[-o, rel(-DECK)], [-o, rel(-0.05)], [o, rel(-0.05)], [o, rel(-DECK)], [-o, rel(-DECK)]]), DECK_C);
        for (const s of [1, -1]) {
          const l = s * (o + 0.02);
          b.add(sweep(p, run, s > 0 ? [[l, rel(0.98)], [l, rel(0.9)]] : [[l, rel(0.9)], [l, rel(0.98)]]), RAIL);
        }
        if (!low)
          for (let k = 0; k < run.length; k += 6) {
            const i = run[k];
            for (const s of [1, -1]) {
              const l = s * (o + 0.02);
              b.add(place(unitBox, p.x[i] + p.tz[i] * l, p.y[i] + 0.55, p.z[i] - p.tx[i] * l, 0.06, 0.8, 0.06), RAIL);
            }
          }
      }
      for (const run of runs(p, (i) => !(fl(i) & F.deck) && edgeTop(p, i) > 0.05)) {
        const o = half + WALL_OUT;
        b.add(sweep(p, run, [[-(o + BANK_FOOT), abs(-0.05)], [-o, rel(-0.04)], [o, rel(-0.04)], [o + BANK_FOOT, abs(-0.05)]]), EARTH);
      }
      // The tunnel: a tube over the track (outer skin, dark inside, ribs, portal frames, neon strips along the inside walls)
      for (const run of runs(p, (i) => !!(fl(i) & F.tunnel))) {
        const arc = (radius: number, out: boolean): XPt[] => {
          const pts: XPt[] = [];
          const N = 10;
          for (let k = 0; k <= N; k++) {
            const a = Math.PI - (Math.PI * k) / N;
            pts.push([radius * Math.cos(a), rel(radius * Math.sin(a) - 0.05)]);
          }
          return out ? pts : pts.reverse();
        };
        b.add(sweep(p, run, arc(TUBE_R, true)), TUBE_C);
        b.add(sweep(p, run, arc(TUBE_R - TUBE_T, false)), TUBE_IN);
        for (let k = 2; k < run.length - 2; k += 5) b.add(sweep(p, run.slice(k, k + 2), arc(TUBE_R + 0.1, true)), INK);
        b.add(sweep(p, run.slice(0, 3), arc(TUBE_R + 0.22, true)), PORTAL);
        b.add(sweep(p, run.slice(-3), arc(TUBE_R + 0.22, true)), PORTAL);
        for (const s of [1, -1]) {
          const l = s * (TUBE_R - TUBE_T - 0.3);
          b.add(sweep(p, run, s > 0 ? [[l, rel(1.5)], [l, rel(1.7)]] : [[l, rel(1.7)], [l, rel(1.5)]]), soft(s > 0 ? PAL.cyan : PAL.pink));
        }
      }
      // Bunting over the bowls
      if (!low)
        for (const run of runs(p, (i) => !!(fl(i) & F.bank)))
          for (let k = 10; k < run.length - 10; k += 24) {
            const i = run[k];
            const f = frame(p, i * p.step);
            if (NODES.some((nd) => Math.hypot(nd.x - f.x, nd.z - f.z) < 6)) continue;
            const posts: THREE.Vector3[] = [];
            for (const s of [1, -1]) {
              const l = s * (half + 1.0);
              const x = f.x + f.nx * l;
              const z = f.z + f.nz * l;
              if (x < P.x0 + 0.5 || x > P.x1 - 0.5 || z < P.z0 + 0.5 || z > P.z1 - 0.5 || PIECES.some((q) => q !== p && near(q, x, z, q.half + 0.5))) continue;
              b.box(x - 0.06, 0, z - 0.06, 0.12, 4.8, 0.12, INK);
              posts.push(V(x, 4.8, z));
            }
            if (posts.length === 2) bunting(b, posts[0], posts[1], 0.4);
          }
    } else {
      // The shortcut: low wooden posts with a rope between them instead of walls (at the solids' spots)
      let prev: (THREE.Vector3 | null)[] = [null, null];
      for (let s = 1.5; s < p.L - 1; s += WALL_EVERY) {
        const f = frame(p, s);
        const next: (THREE.Vector3 | null)[] = [null, null];
        [1, -1].forEach((side, k) => {
          if (nearScEnd(f.x, f.z) && (s < SC_END || s > p.L - SC_END)) return;
          const lat = (half + 0.3) * side;
          const x = f.x + f.nx * lat;
          const z = f.z + f.nz * lat;
          b.box(x - 0.07, 0, z - 0.07, 0.14, 0.7, 0.14, WOOD);
          next[k] = V(x, 0.62, z);
        });
        for (let k = 0; k < 2; k++) if (prev[k] && next[k]) beam(b, prev[k]!, next[k]!, 0.03, INK);
        prev = next;
      }
    }
  });

  // The bridges' pillars
  for (const { x, z, h } of PILLARS) {
    b.box(x - 0.2, 0, z - 0.2, 0.4, h - DECK + 0.05, 0.4, toon('#3f3b5e'));
    b.box(x - 0.26, 0, z - 0.26, 0.52, 0.18, 0.52, INK);
  }
  // The chequered start line across the track
  {
    const c = COURSES['neon-loop'];
    const f = frame(c, c.start);
    const yaw = Math.atan2(-f.tz, f.tx);
    const g = new THREE.PlaneGeometry(1, TRACK_HALF * 2).rotateX(-Math.PI / 2).rotateY(yaw).translate(f.x, f.y + DECAL + 0.004, f.z);
    const m = new THREE.Mesh(g, lit(new THREE.MeshBasicMaterial({ map: chequerTex() }), 0.85, 0.75));
    m.matrixAutoUpdate = false;
    group.add(fx(m));
  }

  /* ----- The start gantry ----- */

  {
    const G = GANTRY;
    const top = G.h;
    for (const p of G.posts) {
      b.box(p.x - 0.22, 0, p.z - 0.22, 0.44, top, 0.44, STEEL);
      b.box(p.x - 0.3, 0, p.z - 0.3, 0.6, 0.14, 0.6, INK);
      b.box(p.x - 0.26, top - 0.04, p.z - 0.26, 0.52, 0.08, 0.52, INK);
    }
    // The beam across, along the left normal
    const nx = G.tz;
    const nz = -G.tx;
    const ryN = Math.atan2(-nz, nx);
    const span = G.half * 2 + 0.44;
    b.add(place(unitBox, G.x, top - 0.15, G.z, span, 0.3, 0.3, 0, ryN), STEEL);
    // Five start lights in a housing on the beam, steady red both ways (the countdown is in the HUD)
    b.add(place(unitBox, G.x, top + 0.17, G.z, 2.8, 0.34, 0.4, 0, ryN), INK);
    const bulb = new THREE.SphereGeometry(0.085, 8, 6);
    const redGlow = glow('#ff3b3b');
    for (let k = -2; k <= 2; k++)
      for (const side of [1, -1]) b.add(bulb.clone().translate(G.x + nx * k * 0.55 + G.tx * 0.2 * side, top + 0.17, G.z + nz * k * 0.55 + G.tz * 0.2 * side), redGlow);
    // The banner hung under the beam, readable both ways
    const BW = 5.2;
    const BH = 0.7;
    const by = top - 0.32 - BH / 2;
    const bmat = lit(new THREE.MeshBasicMaterial({ map: bannerTex() }), 0.9, 1.6);
    const faces = [1, -1].map((side) =>
      new THREE.PlaneGeometry(BW, BH)
        .rotateY(Math.atan2(G.tx, G.tz) + (side > 0 ? 0 : Math.PI))
        .translate(G.x + G.tx * 0.03 * side, by, G.z + G.tz * 0.03 * side)
    );
    const banner = new THREE.Mesh(mergeGeometries(faces, false)!, bmat);
    banner.matrixAutoUpdate = false;
    group.add(fx(banner));
    b.add(place(unitBox, G.x, by + BH / 2 + 0.03, G.z, BW + 0.1, 0.06, 0.1, 0, ryN), INK);
    for (const k of [-1, 1]) b.add(place(unitBox, G.x + nx * k * (BW / 2 - 0.3), top - 0.3 - 0.01, G.z + nz * k * (BW / 2 - 0.3), 0.04, 0.04, 0.04, 0, ryN), STEEL);
    // Bunting between the posts, under the banner
    if (!low) {
      const [p0, p1] = G.posts;
      bunting(b, V(p0.x, 2.95, p0.z), V(p1.x, 2.95, p1.z), 0.25);
    }
  }

  /* ----- The grandstands ----- */

  const seatCols = ['#0fb3c6', '#e35bc0', '#7a3fd6', '#2d7bff'].map((k) => toon(k));
  const fanSpots: { x: number; y: number; z: number }[] = [];
  /** Tiers facing east (the front is the east edge), seats along the back of each tread, fans in them */
  const tiers = (batch: Batch, x0: number, z0: number, x1: number, z1: number, count: number, perTier: number) => {
    const TIER = (x1 - x0) / count;
    for (let k = 0; k < count; k++) {
      const h = 0.55 + k * 0.95;
      const front = x1 - k * TIER;
      batch.box(x0, -0.3, z0, front - x0, h + 0.3, z1 - z0, toon('#3b3658'));
      const back = front - TIER;
      batch.box(back + 0.04, h, z0 + 0.1, 0.34, 0.28, z1 - z0 - 0.2, seatCols[k % seatCols.length]);
      for (let j = 0; j < perTier; j++) {
        const z = z0 + 0.6 + ((z1 - z0 - 1.2) * (j + 0.5)) / perTier + (r() - 0.5) * 0.25;
        if (r() < 0.12) continue;
        fanSpots.push({ x: back + 0.24, y: h + 0.28 + 0.3, z });
      }
    }
  };
  // The main stand beside the start straight (in the spot's group): four tiers, a back wall, a canopy on posts, flags
  const [sx0, sz0] = W(SITE.stand.u0, SITE.stand.v0);
  const [sx1, sz1] = W(SITE.stand.u1, SITE.stand.v1);
  tiers(pb, sx0, sz0, sx1, sz1, 4, low ? 5 : 15);
  pb.box(sx0 - 0.1, 0, sz0 - 0.1, 0.12, 3.6, sz1 - sz0 + 0.2, toon('#2b2550'));
  for (const [px, pz] of [
    [sx0 + 0.06, sz0 - 0.05],
    [sx0 + 0.06, sz1 + 0.05],
    [sx1 - 0.06, sz0 - 0.05],
    [sx1 - 0.06, sz1 + 0.05],
  ])
    pb.box(px - 0.06, 0, pz - 0.06, 0.12, 4.6, 0.12, STEEL);
  pb.box(sx0 - 0.3, 4.6, sz0 - 0.35, sx1 - sx0 + 0.9, 0.14, sz1 - sz0 + 0.7, toon('#2b2550'));
  pb.box(sx1 + 0.56, 4.62, sz0 - 0.35, 0.05, 0.1, sz1 - sz0 + 0.7, soft(PAL.cyan));
  // Flags on poles at the stand's ends (PulseChain colours, no logos)
  for (const [pz, col, col2] of [
    [sz0 - 0.8, PAL.cyan, PAL.violet],
    [sz1 + 0.8, PAL.pink, PAL.blue],
  ] as const) {
    const px = sx0 + 1.1;
    pb.add(new THREE.CylinderGeometry(0.04, 0.05, 5.6, 6).translate(px, 2.8, pz), INK);
    pb.add(new THREE.SphereGeometry(0.08, 6, 5).translate(px, 5.62, pz), toon(PAL.gold));
    pb.box(px + 0.04, 4.9, pz - 0.015, 0.9, 0.5, 0.03, toon(col));
    pb.box(px + 0.04, 4.2, pz - 0.015, 0.7, 0.4, 0.03, toon(col2));
  }
  // The second stand, two tiers outside the north-west bowl, a rail along its back
  {
    const [x0, z0] = W(STAND2.u0, STAND2.v0);
    const [x1, z1] = W(STAND2.u1, STAND2.v1);
    flat(x0 - 0.4, z0 - 0.6, x1 + 0.5, z1 + 0.6, PAVING, PAVE);
    tiers(b, x0, z0, x1, z1, 2, low ? 3 : 8);
    b.box(x0 - 0.05, 0, z0 - 0.05, 0.08, 2.3, z1 - z0 + 0.1, RAIL);
    b.box(x0 - 0.2, 2.3, z0 - 0.2, 0.3, 0.06, z1 - z0 + 0.4, soft(PAL.pink));
  }
  // The fans: seated blobs in track-suit colours, instanced, bobbing
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

  /* ----- The kart hut (in the spot's group) ----- */

  const [hx0, hz0] = W(SITE.hut.u0, SITE.hut.v0);
  const [hx1, hz1] = W(SITE.hut.u1, SITE.hut.v1);
  const HUT_H = 3.2;
  pb.box(hx0, -0.3, hz0, hx1 - hx0, HUT_H + 0.3, hz1 - hz0, toon('#3d4a6b'));
  pb.box(hx0 - 0.12, HUT_H, hz0 - 0.12, hx1 - hx0 + 0.24, 0.16, hz1 - hz0 + 0.24, toon('#25223a'));
  pb.box(hx0 - 0.13, HUT_H + 0.16, hz0 - 0.13, hx1 - hx0 + 0.26, 0.05, 0.05, soft(PAL.pink));
  pb.box(hx0 - 0.13, HUT_H + 0.16, hz1 + 0.08, hx1 - hx0 + 0.26, 0.05, 0.05, soft(PAL.pink));
  // A band of colour round the walls, the door (HUT_DOOR is where you stand, just south of it), a lit window
  pb.box(hx0 - 0.02, 2.08, hz0 - 0.02, hx1 - hx0 + 0.04, 0.2, hz1 - hz0 + 0.04, toon('#e219e5'));
  const dx = HUT_DOOR.x;
  pb.box(dx - 0.42, 0, hz1 - 0.03, 0.84, 1.6, 0.06, toon('#14102a'));
  pb.box(dx - 0.34, 0.7, hz1 + 0.02, 0.68, 0.5, 0.02, soft(PAL.warm));
  pb.box(dx + 0.26, 0.72, hz1 + 0.03, 0.06, 0.12, 0.04, toon('#c9c4e6'));
  pb.box(dx - 0.5, 1.6, hz1 - 0.05, 1.0, 0.08, 0.3, INK);
  // A roller shutter east of the door: slats in two greys, a hazard rail along the bottom
  for (let k = 0; k < 9; k++) pb.box(hx1 - 2.6, 0.75 + k * 0.13, hz1 - 0.02, 2.0, 0.12, 0.05, k % 2 ? toon('#8a86a8') : toon('#6f6a8f'));
  pb.box(hx1 - 2.65, 0.68, hz1 - 0.03, 2.1, 0.08, 0.07, toon('#ffd23f'));
  pb.box(hx1 - 2.65, 1.92, hz1 - 0.05, 2.1, 0.1, 0.12, INK);
  // The sign over the door
  {
    const tex = neonSign(HUT_SIGN, PAL.pink, { board: null, w: 1024, h: 256, size: 180, tracking: 14 });
    const sign = plane(2.6, 0.65, lit(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }), 1, 1.7));
    sign.position.set(dx, 2.74, hz1 + 0.04);
    occlude(sign, tex);
    places.add(fx(sign));
  }
  // Tyres stacked and an oil drum against the hut's east wall
  for (let k = 0; k < 4; k++) pb.add(new THREE.CylinderGeometry(0.28, 0.28, 0.17, 12).translate(hx1 + 0.4, 0.09 + k * 0.18, hz1 - 1.0), toon('#17151f'));
  pb.add(new THREE.CylinderGeometry(0.2, 0.2, 0.55, 12).translate(hx1 + 0.4, 0.28, hz1 - 1.8), toon('#2aabee'));
  pb.add(new THREE.CylinderGeometry(0.2, 0.2, 0.55, 12).translate(hx1 + 0.4, 0.28, hz1 - 2.3), toon('#e23b3b'));

  /* ----- The big screen (in the spot's group) and the scoreboard at the hairpin ----- */

  {
    const [cx, cz] = W(SITE.screen.u, SITE.screen.v);
    const SW = SITE.screen.w;
    const SH = 3.5;
    const base = 1.4;
    for (const px of [cx - SW / 2 + 0.4, cx + SW / 2 - 0.4]) pb.box(px - 0.12, 0, cz - 0.12, 0.24, base + 0.2, 0.24, STEEL);
    pb.box(cx - SW / 2, base, cz - 0.3, SW, SH, 0.6, toon('#1b1830'));
    pb.box(cx - SW / 2 - 0.05, base - 0.05, cz - 0.35, SW + 0.1, 0.1, 0.7, toon('#2b2a40'));
    pb.box(cx - SW / 2 - 0.05, base + SH - 0.05, cz - 0.35, SW + 0.1, 0.1, 0.7, toon('#2b2a40'));
    const face = plane(SW - 0.2, SH - 0.2, lit(new THREE.MeshBasicMaterial({ map: screenTex() }), 0.9, 1.25));
    face.position.set(cx, base + SH / 2, cz - 0.31);
    face.rotation.y = Math.PI;
    places.add(fx(face));
  }
  {
    const [cx, cz] = W(BOARD.u, BOARD.v);
    const BW = BOARD.w;
    const BH = 2.2;
    const base = 1.6;
    const ry = BOARD.ry;
    // Its front faces (-sin ry, -cos ry): north-west, over the hairpin's bend
    const ax = Math.cos(ry);
    const az = -Math.sin(ry);
    for (const k of [-1, 1]) {
      const px = cx + ax * k * (BW / 2 - 0.4);
      const pz = cz + az * k * (BW / 2 - 0.4);
      b.box(px - 0.12, 0, pz - 0.12, 0.24, base + 0.2, 0.24, STEEL);
    }
    b.add(place(unitBox, cx, base + BH / 2, cz, BW, BH, 0.5, 0, ry), toon('#1b1830'));
    b.add(place(unitBox, cx, base - 0.05, cz, BW + 0.1, 0.1, 0.6, 0, ry), STEEL);
    b.add(place(unitBox, cx, base + BH + 0.05, cz, BW + 0.1, 0.1, 0.6, 0, ry), STEEL);
    b.add(place(unitBox, cx, base + BH + 0.13, cz, BW + 0.1, 0.05, 0.05, 0, ry), soft(PAL.violet));
    const face = plane(BW - 0.2, BH - 0.2, lit(new THREE.MeshBasicMaterial({ map: boardTex() }), 0.9, 1.25));
    face.position.set(cx - Math.sin(ry) * 0.26, base + BH / 2, cz - Math.cos(ry) * 0.26);
    face.rotation.y = ry + Math.PI;
    group.add(fx(face));
  }

  /* ----- The pits ----- */

  const [px0, pz0] = W(SITE.pits.u0, SITE.pits.v0);
  const [px1, pz1] = W(SITE.pits.u1, SITE.pits.v1);
  flat(px0, pz0, px1, pz1, PAVING + 0.008, PITS_C);
  const showSpot = { x: (px0 + px1) / 2, y: 0, z: (pz0 + pz1) / 2, yaw: Math.PI / 2 };
  {
    // The painted bay round the show spot
    const bw = 1.4;
    const bl = 1.9;
    const y = PAVING + 0.02;
    const [cx, cz] = [showSpot.x, showSpot.z];
    b.box(cx - bw, y, cz - bl, 0.06, 0.004, bl * 2, LINE_C);
    b.box(cx + bw - 0.06, y, cz - bl, 0.06, 0.004, bl * 2, LINE_C);
    b.box(cx - bw, y, cz + bl - 0.06, bw * 2, 0.004, 0.06, LINE_C);
    b.box(cx - bw, y, cz - bl, bw * 2, 0.004, 0.06, toon('#ffd23f'));
    // A tool chest and a jack at the west end
    b.box(px0 + 0.3, 0, pz0 + 0.5, 0.7, 0.75, 0.45, RED);
    b.box(px0 + 0.3, 0.75, pz0 + 0.5, 0.7, 0.04, 0.45, INK);
    b.box(px0 + 0.35, 0, pz0 + 1.7, 0.6, 0.14, 0.26, toon('#ffd23f'));
    b.add(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6).rotateZ(0.5).translate(px0 + 0.75, 0.3, pz0 + 1.83), STEEL);
    // Festoon lights from the hut's roof over the pits to the stand's canopy
    if (!low) {
      const pole = V(px0 - 0.5, 3.6, pz0 - 0.4);
      b.add(new THREE.CylinderGeometry(0.04, 0.05, 3.6, 6).translate(pole.x, 1.8, pole.z), INK);
      const warm = glow(PAL.warm);
      festoon(b, V(hx0, HUT_H + 0.1, hz0), pole, 0.6, warm);
      festoon(b, pole, V(sx1 - 0.06, 4.6, sz1 + 0.05), 0.6, warm);
    }
  }

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
    // Three rails round, the south one broken at the gate
    for (const y of [0.42, 0.78, 1.14]) {
      b.box(P.x0, y, P.z0 - 0.025, P.x1 - P.x0, 0.05, 0.05, INK);
      b.box(P.x1 - 0.025, y, P.z0, 0.05, 0.05, P.z1 - P.z0, INK);
      b.box(P.x0 - 0.025, y, P.z0, 0.05, 0.05, P.z1 - P.z0, INK);
      b.box(P.x0, y, P.z1 - 0.025, GATE.x0 - 0.15 - P.x0, 0.05, 0.05, INK);
      b.box(GATE.x1 + 0.15, y, P.z1 - 0.025, P.x1 - GATE.x1 - 0.15, 0.05, 0.05, INK);
    }
    // The arch over the gate: two posts, a beam, KART PARK in neon on top (readable from the road and from inside)
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
    // A kerbed sidewalk on the east side, stopping short of the Parkway's own
    b.box(R.x + R.half, 0, R.z0 - 0.3, 0.8, SLAB, R.z1 - 4 - R.z0 + 0.3, KERB_C);
  }

  /* ----- Dressing: tyre walls at the hairpin, marshal posts, light poles, trees and lamps ----- */

  {
    // Tyre stacks round the outside of the hairpin's bend (the first forty tiles of its piece, out of the node)
    const p = PIECES.find((q) => q.id === 'hairpin')!;
    const stacks: { x: number; z: number; h: number }[] = [];
    const step = low ? 1.5 : 0.75;
    for (let s = 2; s < 42; s += step) {
      const f = frame(p, s);
      if (nearNode(f.x, f.z) || Math.abs(f.k) < 0.02) continue;
      const side = -Math.sign(f.k);
      const x = f.x + f.nx * (p.half + 0.95) * side;
      const z = f.z + f.nz * (p.half + 0.95) * side;
      if (x < P.x0 + 0.6 || x > P.x1 - 0.6 || z < P.z0 + 0.6 || z > P.z1 - 0.6) continue;
      stacks.push({ x, z, h: 2 + (stacks.length % 3 === 0 ? 1 : 0) });
    }
    const count = stacks.reduce((a, s) => a + s.h, 0);
    const tyres = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10), toon('#ffffff', { name: 'tyres' }), count);
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
    tyres.castShadow = true;
    tyres.computeBoundingSphere();
    group.add(tyres);
  }
  const dressing = siteDressing(low);
  // Marshal posts: a pole, a base and a flag (cyan or gold) facing along the track
  for (const m of dressing.marshals) {
    b.box(m.x - 0.05, 0, m.z - 0.05, 0.1, 2.4, 0.1, INK);
    b.box(m.x - 0.2, 0, m.z - 0.2, 0.4, 0.1, 0.4, STEEL);
    b.add(place(unitBox, m.x, 2.1, m.z, 0.56, 0.38, 0.03, 0, m.yaw), m.col ? toon(PAL.gold) : toon(PAL.cyan));
  }
  // Light poles: tall, a crossarm with four lamp heads, instanced (the heads lit)
  {
    const H = 7;
    const parts = [new THREE.CylinderGeometry(0.08, 0.11, H, 7).translate(0, H / 2, 0), new THREE.BoxGeometry(0.3, 0.12, 0.3).translate(0, 0.06, 0), new THREE.BoxGeometry(1.9, 0.1, 0.1).translate(0, H - 0.1, 0)];
    const heads: THREE.BufferGeometry[] = [];
    for (const k of [-0.75, -0.25, 0.25, 0.75]) {
      parts.push(new THREE.BoxGeometry(0.34, 0.14, 0.24).translate(k, H - 0.22, 0));
      heads.push(new THREE.BoxGeometry(0.3, 0.03, 0.2).translate(k, H - 0.3, 0));
    }
    const n = dressing.poles.length;
    const poles = new THREE.InstancedMesh(mergeGeometries(parts, false)!, toon('#1b1830', { name: 'lightpoles' }), n);
    const lampsOn = new THREE.InstancedMesh(mergeGeometries(heads, false)!, soft(PAL.warm), n);
    dressing.poles.forEach((pl, i) => {
      // The crossarm faces the track's middle
      const [fu, fv] = [68, 62];
      const [fx0, fz0] = W(fu, fv);
      const ry = Math.atan2(-(fz0 - pl.z), fx0 - pl.x) + Math.PI / 2;
      _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
      _m.compose(_p.set(pl.x, 0, pl.z), _q, _s);
      poles.setMatrixAt(i, _m);
      lampsOn.setMatrixAt(i, _m);
    });
    _q.identity();
    poles.castShadow = true;
    poles.computeBoundingSphere();
    lampsOn.computeBoundingSphere();
    group.add(poles, fx(lampsOn));
  }
  for (const t of dressing.trees) addTree(t.x, t.z, t.s, t.pine, 0);
  for (const l of dressing.lamps) addLamp(l.x, l.z, l.ry, l.z > P.z1 + 1 ? SLAB : 0);

  b.build(group);
  pb.build(places);

  /* ----- The spot ----- */

  let bx0 = Infinity;
  let bx1 = -Infinity;
  let bz0 = Infinity;
  let bz1 = -Infinity;
  for (const p of PIECES)
    for (let i = 0; i < p.x.length; i++) {
      bx0 = Math.min(bx0, p.x[i]);
      bx1 = Math.max(bx1, p.x[i]);
      bz0 = Math.min(bz0, p.z[i]);
      bz1 = Math.max(bz1, p.z[i]);
    }
  const focus = V((bx0 + bx1) / 2, 0, (bz0 + bz1) / 2);
  const pin = V((hx0 + hx1) / 2, HUT_H + 1.3, (hz0 + hz1) / 2);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.64, 48), glowMat(PAL.cyan, 0, null));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(HUT_DOOR.x, PAVING + 0.014, HUT_DOOR.z);
  group.add(fx(ring));
  const spot: Spot = { id: ID, group: places, focus, size: 150, pin, ring };

  /* ----- Per course: boost pads and item boxes ----- */

  const courses = new Map<CourseId, THREE.Group>();
  for (const id of Object.keys(COURSES) as CourseId[]) {
    const course = COURSES[id];
    const cg = new THREE.Group();
    cg.name = `karts-${id}`;
    cg.visible = false;
    const cb = new Batch();
    const chevron = soft(PAL.cyan);
    for (const pad of course.pads) {
      for (const f3 of [0.2, 0.5, 0.8]) {
        const f = frame(course, pad.s + pad.len * f3);
        const yaw = Math.atan2(-f.tz, f.tx);
        // Two arms meeting at the apex, pointing the way you drive; tilted with the banking and the slope
        for (const side of [1, -1]) {
          const q = bar(-0.45, side * 1.0, 0.3, side * 0.12, 0.26);
          const g = flatQuad(q, 0)
            .rotateX(-Math.asin(Math.max(-1, Math.min(1, f.roll))))
            .rotateZ(Math.atan(f.slope))
            .rotateY(yaw)
            .translate(f.x, f.y + DECAL, f.z);
          cb.add(g, chevron);
        }
      }
    }
    cb.build(cg, { cast: false, receive: false });
    group.add(fx(cg));
    courses.set(id, cg);
  }
  // The item boxes: a translucent cube in a neon frame, instanced, repositioned per course
  const BOX = 0.55;
  const maxBoxes = Math.max(...Object.values(COURSES).map((k) => k.boxes.length)) * BOX_LATERALS.length;
  const cube = new THREE.InstancedMesh(new THREE.BoxGeometry(BOX, BOX, BOX), lit(new THREE.MeshBasicMaterial({ color: PAL.cyan, transparent: true, opacity: 0.35, depthWrite: false }), 0.8, 1.1), maxBoxes);
  const edgeGeo = (() => {
    const t = 0.04;
    const h = BOX / 2;
    const parts: THREE.BufferGeometry[] = [];
    for (const [sx, sy, sz, x, y, z] of [
      [BOX, t, t, 0, h, h],
      [BOX, t, t, 0, h, -h],
      [BOX, t, t, 0, -h, h],
      [BOX, t, t, 0, -h, -h],
      [t, BOX, t, h, 0, h],
      [t, BOX, t, h, 0, -h],
      [t, BOX, t, -h, 0, h],
      [t, BOX, t, -h, 0, -h],
      [t, t, BOX, h, h, 0],
      [t, t, BOX, h, -h, 0],
      [t, t, BOX, -h, h, 0],
      [t, t, BOX, -h, -h, 0],
    ])
      parts.push(new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z));
    return mergeGeometries(parts, false)!;
  })();
  const edges = new THREE.InstancedMesh(edgeGeo, neon(PAL.pink, 0.7, 2.2), maxBoxes);
  cube.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  edges.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(fx(cube), fx(edges));
  let boxSpots: { x: number; y: number; z: number }[] = [];
  let gone: number[] | null = null;
  const _e = new THREE.Euler();
  const paintBoxes = (t: number) => {
    for (let i = 0; i < maxBoxes; i++) {
      const p = boxSpots[i];
      const hidden = !p || (gone && (gone[i] ?? 0) > 0);
      if (hidden) _m.makeScale(0, 0, 0);
      else {
        const spin = reduced ? 0.6 : t * 0.9 + i * 0.7;
        _q.setFromEuler(_e.set(0.5, spin, 0.3));
        _m.compose(_p.set(p.x, p.y + (reduced ? 0 : Math.sin(t * 1.8 + i) * 0.05), p.z), _q, _s);
      }
      cube.setMatrixAt(i, _m);
      edges.setMatrixAt(i, _m);
    }
    _q.identity();
    cube.instanceMatrix.needsUpdate = true;
    edges.instanceMatrix.needsUpdate = true;
  };
  let current: CourseId | null = null;
  function setCourse(id: CourseId) {
    if (id === current) return;
    current = id;
    for (const [k, cg] of courses) cg.visible = k === id;
    const course = COURSES[id];
    boxSpots = course.boxes.flatMap((s) => BOX_LATERALS.map((lateral) => at(course, s, lateral))).map((p) => ({ x: p.x, y: p.y + 0.9, z: p.z }));
    gone = null;
    cube.count = edges.count = boxSpots.length;
    paintBoxes(0);
    cube.computeBoundingSphere();
    edges.computeBoundingSphere();
  }
  setCourse('neon-loop');

  let clock = 0;
  opts.tick(({ t }) => {
    if (reduced) return;
    clock = t;
    paintFans(t);
    paintBoxes(t);
  });

  return {
    group,
    spot,
    setCourse,
    showBoxes(g) {
      gone = g;
      paintBoxes(clock);
    },
    showSpot,
  };
}
