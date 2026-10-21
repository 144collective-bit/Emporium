/*
 * The kart park in 3D (kartpark.ts holds the layout; kart-sim.ts races on
 * it, kart.ts is the race's view). Outside the Parkway in the north-east,
 * on flat ground (y = 0, no slab):
 *
 * - The site: a lawn inside a railing fence (the gate on the south side under
 *   a KART PARK arch, two lamps), a paved strip along the south for the hut,
 *   the pits and the big screen, and the slip road from the gate down to the
 *   Parkway (dashed centre line, a kerb on its east side, lamps).
 * - The track: a ribbon of asphalt swept along the Neon Loop's samples (so
 *   the flyover and the hump rise with it) on a dark apron, edge lines,
 *   red / white kerbs on the inside of the bends, the chequered start line
 *   and the start gantry (posts, a beam, five red lights, a banner). Walls:
 *   a continuous low kerb along both edges with a neon strip on top (cyan on
 *   the left, pink on the right) and red / white barrier blocks every two
 *   tiles (the blocks are what KART_SOLIDS makes solid; the kerb is a step).
 *   The flyover's deck hangs under the raised ribbon on the eight pillars,
 *   and the hump is filled down to the ground.
 * - The grandstand beside the start straight (four tiers facing east, a
 *   canopy on posts, flags at its ends, fans bobbing in the seats), the kart
 *   hut (shutter, door, KART HUT sign, tyres and a drum beside it), the big
 *   screen facing the track, the pits with the show kart's bay, festoon
 *   lights from the hut over the pits to the stand, tyre walls round the
 *   hairpin's outside and trees in the corners.
 * - Per course (setCourse): boost pad chevrons on the asphalt and the item
 *   boxes (one InstancedMesh, turning; showBoxes hides the taken ones).
 *
 * Draw calls: everything static goes through one Batch (shared paint, neon
 * per brightness); the fence posts, the fans, the tyres and the item boxes
 * are instanced; the signs, the screen and the start line keep their own
 * textures. The hut, the stand and the screen sit in the spot's own group
 * (what City view lifts on hover); the ground and the track stay put.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { SpotId } from '../../lib/city';
import { Batch, FONT_DISPLAY, FONT_MONO, PAL, canvasTex, fx, glowMat, lit, neon, neonSign, occlude, place, plane, rng, toon } from './kit';
import { BOX_LATERALS, COURSES, FLYOVER_W, GANTRY, GATE, HUT_DOOR, KART_PARK, LOOP_SCALE, PILLARS, SITE, SLIP_ROAD, TRACK_HALF, WALL_EVERY, along, at, frame, locate, toWorld, type Course, type CourseId } from './kartpark';
import type { KartPark } from './kart-types';
import type { Spot } from './landmarks';
import { SLAB, addLamp, addTree, type Tick } from './world';

/** The place's id (city.ts adds it to SpotId) */
const ID = 'karts' as unknown as SpotId;

/* ---------- Heights (over the ground at 0, or over a sample's own height) ---------- */

const LAWN = 0.006;
const APRON = 0.015;
const PAVING = 0.025;
/** The ribbon's top over the sample's y, then the decals on it */
const RIBBON = 0.035;
const EDGE = 0.045;
const LINE = 0.05;
const DECAL = 0.058;
/** The walls: 0.3 thick, centred TRACK_HALF + 0.3 out (KART_SOLIDS matches), the kerb and the blocks on it */
const WALL_IN = TRACK_HALF + 0.15;
const WALL_OUT = TRACK_HALF + 0.45;
const KERB_H = 0.16;
const BLOCK_H = 0.55;
/** The flyover's deck under the ribbon */
const DECK = 0.3;
/** How wide the apron reaches past the walls */
const APRON_REACH = WALL_OUT + 1.2;

/* ---------- Materials ---------- */

const ASPHALT = toon('#26243f');
const APRON_C = toon('#1c1a2e');
const LAWN_C = toon('#2f7a52');
const PAVE = toon('#4b4766');
const PITS_C = toon('#5a5574');
const INK = toon('#1b1830');
const STEEL = toon('#2b2a40');
const WHITE = toon('#e8e6f0');
const LINE_C = toon('#d9d4ef');
const RED = toon('#e23b3b');
const KERB_C = toon('#5a5290');
const soft = (c: string) => neon(c, 0.5, 1.3);
const glow = (c: string) => neon(c, 0.6, 2.4);
/** Fixed copy only */
const ARCH_SIGN = 'KART PARK';
const HUT_SIGN = 'KART HUT';
const BANNER = 'KART PARK · NEON LOOP';
const SCREEN_TITLE = 'KART PARK';
const SCREEN_SUB = 'NEON LOOP · 3 LAPS';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const Z = new THREE.Vector3(0, 0, 1);

/* ---------- Sweeps along the loop ---------- */

/** A cross-section point: lateral (left positive) and a height from the sample's own y */
type H = (y: number, i: number) => number;
type XPt = [lat: number, h: H];
const rel = (h: number): H => (y) => y + h;
const abs = (h: number): H => () => h;

/**
 * Quads swept along the loop through the consecutive samples `run` (indices, wrapping),
 * one strip per edge of the cross-section `poly`. Walk the section clockwise (lateral to
 * the right, height up) and the faces point outward; a single edge from left to right is
 * a flat strip facing up.
 */
function sweep(c: Course, run: number[], poly: XPt[]) {
  const n = c.x.length;
  const m = run.length;
  const E = poly.length - 1;
  const pos = new Float32Array(E * m * 2 * 3);
  const uv = new Float32Array(E * m * 2 * 2);
  const idx: number[] = [];
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
        pos[v * 3] = c.x[i] + nx * l;
        pos[v * 3 + 1] = h(c.y[i], i);
        pos[v * 3 + 2] = c.z[i] + nz * l;
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

/** Runs of consecutive samples that `keep` says yes to, walked once round from `from` (a run that goes all the way round closes on itself) */
function runs(c: Course, keep: (i: number) => boolean, from = 0) {
  const n = c.x.length;
  const out: number[][] = [];
  let cur: number[] = [];
  for (let k = 0; k <= n; k++) {
    if (keep((from + k) % n)) cur.push(from + k);
    else if (cur.length) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
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

/** A square beam between two points (cables, braces) */
function beam(b: Batch, a: THREE.Vector3, c: THREE.Vector3, t: number, mat: THREE.Material) {
  const dir = c.clone().sub(a);
  const len = dir.length();
  const g = unitBox.clone();
  g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(Z, dir.normalize()), V(t, t, len)));
  b.add(g, mat);
}

/** A sagging cable with bulbs hung under it (festoon lights) */
function festoon(b: Batch, from: THREE.Vector3, to: THREE.Vector3, sag: number, bulb: THREE.Material) {
  const n = Math.max(2, Math.round(from.distanceTo(to) / 0.9));
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

/** The gantry's banner (a lit board, the same face both ways) */
const bannerTex = () =>
  canvasTex(1024, 160, (c, w, h) => {
    c.fillStyle = '#0b0a18';
    c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 20) {
      c.fillStyle = (x / 20) % 2 ? '#e8e6f0' : '#1a1830';
      c.fillRect(x, 0, 20, 12);
      c.fillStyle = (x / 20) % 2 ? '#1a1830' : '#e8e6f0';
      c.fillRect(x, h - 12, 20, 12);
    }
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `900 84px ${FONT_DISPLAY}`;
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '8px';
    c.shadowColor = PAL.cyan;
    c.shadowBlur = 24;
    c.fillStyle = PAL.cyan;
    c.fillText(BANNER, w / 2, h / 2 + 4);
    c.shadowBlur = 0;
    c.fillStyle = '#ffffff';
    c.globalAlpha = 0.7;
    c.fillText(BANNER, w / 2, h / 2 + 4);
  });

/** The big screen's face */
const screenTex = () =>
  canvasTex(1024, 600, (c, w, h) => {
    c.fillStyle = '#0b0a18';
    c.fillRect(0, 0, w, h);
    // Faint scan lines
    c.fillStyle = '#ffffff08';
    for (let y = 0; y < h; y += 8) c.fillRect(0, y, w, 3);
    // Chequered bands top and bottom
    for (let x = 0; x < w; x += 32) {
      c.fillStyle = (x / 32) % 2 ? '#e8e6f0' : '#1a1830';
      c.fillRect(x, 0, 32, 22);
      c.fillStyle = (x / 32) % 2 ? '#1a1830' : '#e8e6f0';
      c.fillRect(x, h - 22, 32, 22);
    }
    c.strokeStyle = PAL.cyan;
    c.lineWidth = 6;
    c.strokeRect(14, 34, w - 28, h - 68);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `900 230px ${FONT_DISPLAY}`;
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '12px';
    c.shadowColor = PAL.pink;
    c.shadowBlur = 36;
    c.fillStyle = PAL.pink;
    c.fillText(SCREEN_TITLE, w / 2, 250);
    c.shadowBlur = 0;
    c.fillStyle = '#ffffff';
    c.globalAlpha = 0.7;
    c.fillText(SCREEN_TITLE, w / 2, 250);
    c.globalAlpha = 1;
    c.font = `700 56px ${FONT_MONO}`;
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '10px';
    c.fillStyle = PAL.cyan;
    c.fillText(SCREEN_SUB, w / 2, 440);
  });

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
  const c = COURSES['neon-loop'];
  const n = c.x.length;
  const W = (u: number, v: number) => toWorld([u, v]);
  const flat = (x0: number, z0: number, x1: number, z1: number, y: number, mat: THREE.Material) =>
    b.add(place(new THREE.PlaneGeometry(x1 - x0, z1 - z0), (x0 + x1) / 2, y, (z0 + z1) / 2, 1, 1, 1, -Math.PI / 2), mat);

  /* ----- The ground ----- */

  flat(P.x0 + 0.3, P.z0 + 0.3, P.x1 - 0.3, P.z1 - 0.3, LAWN, LAWN_C);
  // The paved strip along the south (the hut, the pits, the screen), a pad under the stand
  const [, pavedZ] = W(0, 33);
  flat(P.x0 + 0.3, pavedZ, P.x1 - 0.3, P.z1 - 0.3, PAVING, PAVE);
  {
    const [sx0, sz0] = W(SITE.stand.u0 - 0.5, SITE.stand.v0 - 1.2);
    const [sx1, sz1] = W(SITE.stand.u1 + 0.6, SITE.stand.v1 + 1.2);
    flat(sx0, sz0, sx1, sz1, PAVING, PAVE);
  }
  // The apron round the track, at ground level (none under the flyover's high part: that's the ground pass's)
  const atCross = (i: number) => Math.abs(along(c, i * c.step, c.crossing));
  const crossI = Math.round(c.crossing / c.step);
  for (const run of runs(c, (i) => atCross(i) > 9.3, crossI)) b.add(sweep(c, run, [[-APRON_REACH, abs(APRON)], [APRON_REACH, abs(APRON)]]), APRON_C);

  /* ----- The track ----- */

  const loop = runs(c, () => true)[0];
  b.add(sweep(c, loop, [[-TRACK_HALF, rel(RIBBON)], [TRACK_HALF, rel(RIBBON)]]), ASPHALT);
  /** A flat strip between two laterals, facing up whichever way round they come */
  const strip = (l0: number, l1: number, h: H): XPt[] => [[Math.min(l0, l1), h], [Math.max(l0, l1), h]];
  for (const s of [1, -1]) b.add(sweep(c, loop, strip(s * (TRACK_HALF - 0.16), s * (TRACK_HALF - 0.04), rel(EDGE))), LINE_C);
  // Red / white kerbs on the inside of the bends, a tile each
  for (const run of runs(c, (i) => Math.abs(c.k[i]) > 0.08)) {
    for (let j = 0; j + 1 < run.length; j += 2) {
      const chunk = run.slice(j, j + 3);
      const side = Math.sign(c.k[((chunk[1] ?? chunk[0]) % n + n) % n]) || 1;
      b.add(sweep(c, chunk, strip(side * (TRACK_HALF - 0.5), side * (TRACK_HALF - 0.02), rel(LINE))), (j / 2) % 2 ? WHITE : RED);
    }
  }
  // The chequered start line across the track
  {
    const f = frame(c, c.start);
    const yaw = Math.atan2(-f.tz, f.tx);
    const g = new THREE.PlaneGeometry(1, TRACK_HALF * 2).rotateX(-Math.PI / 2).rotateY(yaw).translate(f.x, f.y + LINE + 0.004, f.z);
    const m = new THREE.Mesh(g, lit(new THREE.MeshBasicMaterial({ map: chequerTex() }), 0.85, 0.75));
    m.matrixAutoUpdate = false;
    group.add(fx(m));
  }

  // The walls: a low kerb both sides with a neon strip on top, then the barrier blocks
  for (const s of [1, -1]) {
    const [i0, i1] = s > 0 ? [WALL_IN, WALL_OUT] : [-WALL_OUT, -WALL_IN];
    b.add(sweep(c, loop, [[i0, rel(-0.06)], [i0, rel(KERB_H)], [i1, rel(KERB_H)], [i1, rel(-0.06)]]), STEEL);
    const mid = s * (TRACK_HALF + 0.3);
    b.add(sweep(c, loop, [[mid - 0.045, rel(KERB_H + 0.012)], [mid + 0.045, rel(KERB_H + 0.012)]]), soft(s > 0 ? PAL.cyan : PAL.pink));
  }
  for (let s = 0; s < c.L; s += WALL_EVERY) {
    const f = frame(c, s);
    const yaw = Math.atan2(-f.tz, f.tx);
    for (const side of [1, -1]) {
      const x = f.x + f.nx * (TRACK_HALF + 0.3) * side;
      const z = f.z + f.nz * (TRACK_HALF + 0.3) * side;
      b.add(place(unitBox, x, f.y + 0.08 + (BLOCK_H - 0.08) / 2, z, 1, BLOCK_H - 0.08, 0.3, 0, yaw), (s / 2) % 2 ? WHITE : RED);
    }
  }

  // The flyover's deck under the raised ribbon (the hump is filled to the ground), and its pillars
  const onFlyover = (i: number) => atCross(i) < FLYOVER_W - 1;
  for (const run of runs(c, (i) => c.y[i] > 0.05, crossI)) {
    const bottom: H = (y, i) => (onFlyover(i) ? y - DECK : -0.05);
    b.add(sweep(c, run, [[WALL_OUT, rel(-0.05)], [WALL_OUT, bottom], [-WALL_OUT, bottom], [-WALL_OUT, rel(-0.05)]]), toon('#34314f'));
  }
  for (const [x, z] of PILLARS) {
    const top = locate(c, x, z, c.crossing).y - DECK + 0.05;
    b.box(x - 0.2, 0, z - 0.2, 0.4, top, 0.4, toon('#3f3b5e'));
    b.box(x - 0.26, 0, z - 0.26, 0.52, 0.18, 0.52, INK);
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

  /* ----- The grandstand (in the spot's group) ----- */

  const [sx0, sz0] = W(SITE.stand.u0, SITE.stand.v0);
  const [sx1, sz1] = W(SITE.stand.u1, SITE.stand.v1);
  const TIER = (sx1 - sx0) / 4;
  const seatCols = ['#0fb3c6', '#e35bc0', '#7a3fd6', '#2d7bff'].map((k) => toon(k));
  const fanSpots: { x: number; y: number; z: number }[] = [];
  for (let k = 0; k < 4; k++) {
    const h = 0.55 + k * 0.95;
    const front = sx1 - k * TIER;
    pb.box(sx0, -0.3, sz0, front - sx0, h + 0.3, sz1 - sz0, toon('#3b3658'));
    // A bench along the back of the tread
    const back = front - TIER;
    pb.box(back + 0.04, h, sz0 + 0.1, 0.34, 0.28, sz1 - sz0 - 0.2, seatCols[k]);
    const per = low ? 5 : 15;
    for (let j = 0; j < per; j++) {
      const z = sz0 + 0.6 + ((sz1 - sz0 - 1.2) * (j + 0.5)) / per + (r() - 0.5) * 0.25;
      if (r() < 0.12) continue;
      fanSpots.push({ x: back + 0.24, y: h + 0.28 + 0.3, z });
    }
  }
  // The back wall, the canopy on four posts with a neon trim along its front
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
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _p = new THREE.Vector3();
  const _s = new THREE.Vector3(1, 1, 1);
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

  /* ----- The big screen (in the spot's group) ----- */

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
      festoon(b, V(hx0, HUT_H + 0.1, hz0), pole, 0.5, warm);
      festoon(b, pole, V(sx1 - 0.06, 4.6, sz1 + 0.05), 0.55, warm);
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
    // Lamps either side of the gate, leaning in over it
    addLamp(GATE.x0 - 0.8, GATE.z + 0.7, 0, 0);
    addLamp(GATE.x1 + 0.8, GATE.z + 0.7, Math.PI, 0);
  }

  /* ----- The slip road down to the Parkway ----- */

  {
    const R = SLIP_ROAD;
    b.box(R.x - R.half, 0, R.z0, R.half * 2, 0.028, R.z1 - R.z0, ASPHALT);
    for (let z = R.z0 + 0.8; z < R.z1 - 4.5; z += 1.6) b.box(R.x - 0.05, 0.03, z, 0.1, 0.004, 0.7, LINE_C);
    // A kerbed sidewalk on the east side, stopping short of the Parkway's own
    b.box(R.x + R.half, 0, R.z0 - 0.3, 0.8, SLAB, R.z1 - 4 - R.z0 + 0.3, KERB_C);
    for (let z = R.z0 + 2; z < R.z1 - 4.5; z += 4.5) addLamp(R.x + R.half + 0.45, z, Math.PI, SLAB);
  }

  /* ----- Dressing: tyre walls at the hairpin, trees in the corners ----- */

  {
    const [hairpinX] = W(40.3 * LOOP_SCALE, 0);
    const stacks: { x: number; z: number; h: number }[] = [];
    const step = low ? 1.5 : 0.75;
    for (let s = 0; s < c.L; s += step) {
      const f = frame(c, s);
      if (f.x < hairpinX) continue;
      // The outside of the hairpin is east: the side the left normal points east on
      const side = f.nx > 0 ? 1 : -1;
      stacks.push({ x: f.x + f.nx * (TRACK_HALF + 0.85) * side, z: f.z + f.nz * (TRACK_HALF + 0.85) * side, h: 2 + (stacks.length % 3 === 0 ? 1 : 0) });
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
  const trees: [number, number, number, boolean][] = [
    [1.2, 1.0, 1.1, false],
    [3.4, 2.2, 0.9, true],
    [1.0, 4.2, 1.0, false],
    [42.8, 1.0, 1.1, false],
    [40.6, 2.4, 0.9, true],
    [43.0, 4.4, 1.0, false],
    [43.0, 42.6, 1.1, false],
    [41.0, 40.8, 0.9, true],
    [43.2, 38.4, 1.0, false],
    [0.8, 42.6, 1.1, false],
    [1.8, 39.6, 0.9, true],
    [0.8, 36.4, 1.0, false],
    [12, 0.9, 1.0, false],
    [20, 1.1, 0.9, true],
    [28, 0.9, 1.0, false],
    [36, 1.1, 0.9, true],
  ];
  trees.forEach(([u, v, s, pine], i) => {
    if (low && i % 2) return;
    const [x, z] = W(u, v);
    addTree(x, z, s, pine, 0);
  });

  b.build(group);
  pb.build(places);

  /* ----- The spot ----- */

  const [fx0, fz0] = W(4.9 * LOOP_SCALE, 6.1 * LOOP_SCALE);
  const [fx1, fz1] = W(41.7 * LOOP_SCALE, 29.6 * LOOP_SCALE);
  const focus = V((fx0 + fx1) / 2, 0, (fz0 + fz1) / 2);
  const pin = V((hx0 + hx1) / 2, HUT_H + 1.3, (hz0 + hz1) / 2);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.64, 48), glowMat(PAL.cyan, 0, null));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(HUT_DOOR.x, PAVING + 0.014, HUT_DOOR.z);
  group.add(fx(ring));
  const spot: Spot = { id: ID, group: places, focus, size: 40 * LOOP_SCALE, pin, ring };

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
        // Two arms meeting at the apex, pointing the way you drive
        for (const side of [1, -1]) {
          const q = bar(-0.45, side * 1.0, 0.3, side * 0.12, 0.26);
          const g = flatQuad(q, 0).rotateY(yaw).translate(f.x, f.y + DECAL, f.z);
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
