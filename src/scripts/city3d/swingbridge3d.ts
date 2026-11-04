/*
 * The swing bridge drawn (docs/highway-plan.md Phase 5; the numbers are swingbridge.ts), a district loaded as you
 * approach (districts.ts `LAZY_DISTRICTS` id `swing`):
 *
 * - As sites: the fixed approaches up their ramps from each bank (asphalt, the centre line, the footways a step up,
 *   steel railings on a concrete plinth over the water, the deck's steel edge), the piers in the river (the pivot's
 *   round drum with its turning ring, the rest pier and the approach's, stone with cutwaters, a dark band at the
 *   water), the barriers' posts and their warning lights' heads.
 * - On the main thread: the swing span, turning on its pier with the timetable (`swingAt()`; still and shut under
 *   reduced motion): its deck and footways, two steel camelback trusses between the roadway and the footways, the
 *   bracing over the road where they're high, the operator's cabin on top (KESTREL BRIDGE on its ends, made up), red
 *   and green lights at its ends; the barriers' booms coming down over the lanes and the footways while they're
 *   shut, their red lights flashing.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, lit, moving, neon, toon } from './kit';
import type { Tick } from './world';
import { CROWD_VIEW } from './character';
import { site } from './tilework';
import { WATER_Y } from './river';
import {
  BARRIERS,
  DEPTH,
  FOOT,
  FOOT_H,
  H,
  HALF,
  PARAPET_H,
  PARAPET_Z,
  PIER_HX,
  PIER_TOP,
  PIVOT,
  REST,
  ROAD,
  SOUTH_PIER,
  SPAN,
  SWING_NAME,
  SX,
  Z0,
  Z1,
  deckY,
  swingAt,
} from './swingbridge';

/** This module's address, for the site worker (districts.ts) */
export const SELF = import.meta.url;

/** The fixed deck's pieces along z (none longer than a tile's share) */
const STEP = 1.5;
const steelCol = '#3d6f73';

/** A flat strip from x0 to x1 following the deck's height (`up` over it) from z0 to z1, facing up */
function strip(x0: number, x1: number, z0: number, z1: number, up: number, y = deckY): THREE.BufferGeometry {
  const pos: number[] = [];
  const n = Math.max(1, Math.ceil((z1 - z0) / 0.75));
  for (let k = 0; k < n; k++) {
    const [a, b] = [z0 + ((z1 - z0) * k) / n, z0 + ((z1 - z0) * (k + 1)) / n];
    const [ya, yb] = [y(a) + up, y(b) + up];
    pos.push(x0, ya, a, x0, yb, b, x1, yb, b, x0, ya, a, x1, yb, b, x1, ya, a);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
/** A wall along z at x (facing +x when `face` is 1) from y(z)+lo to y(z)+hi */
function side(x: number, z0: number, z1: number, lo: number, hi: number, face: 1 | -1, y = deckY): THREE.BufferGeometry {
  const pos: number[] = [];
  const n = Math.max(1, Math.ceil((z1 - z0) / 0.75));
  for (let k = 0; k < n; k++) {
    const [a, b] = [z0 + ((z1 - z0) * k) / n, z0 + ((z1 - z0) * (k + 1)) / n];
    const [p, q, r, s] = [
      [x, y(a) + lo, a],
      [x, y(b) + lo, b],
      [x, y(b) + hi, b],
      [x, y(a) + hi, a],
    ];
    const quad = face > 0 ? [p, q, r, p, r, s] : [p, r, q, p, s, r];
    for (const v of quad) pos.push(...v);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

interface Paint {
  asphalt: THREE.Material;
  foot: THREE.Material;
  kerb: THREE.Material;
  white: THREE.Material;
  yellow: THREE.Material;
  steel: THREE.Material;
  concrete: THREE.Material;
  stone: THREE.Material;
  dark: THREE.Material;
}
const paint = (): Paint => ({
  asphalt: toon('#2f2c3f'),
  foot: toon('#8d8aa0'),
  kerb: toon('#aeabbf'),
  white: toon('#d9d5ee'),
  yellow: toon('#e8c65a'),
  steel: toon(steelCol),
  concrete: toon('#a19eb2'),
  stone: toon('#8f8576'),
  dark: toon('#3a3542'),
});

/** The roadway, the footways and their kerbs, the centre line, the railings, the steel edge: from z0 to z1 on `y` */
function deck(b: Batch, m: Paint, z0: number, z1: number, y: (z: number) => number, opts: { rails: [number, number] | null; x?: number }) {
  const x = opts.x ?? SX;
  b.add(strip(x - ROAD, x + ROAD, z0, z1, 0.012, y), m.asphalt);
  for (const s of [-1, 1] as const) {
    const [i0, i1] = s < 0 ? [x - FOOT[1], x - FOOT[0]] : [x + FOOT[0], x + FOOT[1]];
    b.add(strip(i0, i1, z0, z1, FOOT_H, y), m.foot);
    // (the kerb's face to the road, and the deck's edge outside the footway)
    b.add(side(s < 0 ? x - FOOT[0] : x + FOOT[0], z0, z1, 0.012, FOOT_H, s < 0 ? 1 : -1, y), m.kerb);
    b.add(strip(s < 0 ? x - FOOT[0] - 0.05 : x + ROAD, s < 0 ? x - ROAD : x + FOOT[0] + 0.05, z0, z1, 0.011, y), m.kerb);
    b.add(side(x + s * HALF, z0, z1, -DEPTH, FOOT_H, s, y), m.steel);
    b.add(strip(s < 0 ? x - HALF : x + FOOT[1], s < 0 ? x - FOOT[1] : x + HALF, z0, z1, FOOT_H, y), m.concrete);
  }
  // The soffit
  const under = strip(x - HALF, x + HALF, z0, z1, -DEPTH, y);
  const idx = under.getAttribute('position').array as Float32Array;
  // (flip it to face down)
  for (let i = 0; i < idx.length; i += 9) for (const k of [0, 1, 2]) [idx[i + 3 + k], idx[i + 6 + k]] = [idx[i + 6 + k], idx[i + 3 + k]];
  under.computeVertexNormals();
  b.add(under, m.steel);
  // The centre line: dashes
  for (let z = Math.ceil(z0 / 2.4) * 2.4; z < z1 - 0.2; z += 2.4) b.add(strip(x - 0.05, x + 0.05, z, Math.min(z + 1.1, z1), 0.02, y), m.yellow);
  // The railings: a concrete plinth along the deck's edge, posts and two rails (near only)
  if (opts.rails) {
    const [r0, r1] = [Math.max(z0, opts.rails[0]), Math.min(z1, opts.rails[1])];
    if (r1 > r0 + 0.05)
      for (const s of [-1, 1] as const) {
        const o = x + (s * (FOOT[1] + HALF)) / 2;
        b.add(side(x + s * FOOT[1], r0, r1, FOOT_H, FOOT_H + 0.25, (-s) as 1 | -1, y), m.concrete);
        b.add(side(x + s * HALF, r0, r1, FOOT_H, FOOT_H + 0.25, s, y), m.concrete);
        b.add(strip(s < 0 ? x - HALF : x + FOOT[1], s < 0 ? x - FOOT[1] : x + HALF, r0, r1, FOOT_H + 0.25, y), m.concrete);
        b.detail(() => {
          for (const hh of [0.62, PARAPET_H]) b.add(strip(o - 0.04, o + 0.04, r0, r1, FOOT_H + hh, y), m.steel);
          for (let z = Math.ceil(r0 / 1.2) * 1.2; z < r1; z += 1.2) b.box(o - 0.03, y(z) + FOOT_H + 0.25, z - 0.03, 0.06, PARAPET_H - 0.25, 0.06, m.steel);
        });
      }
  }
}

/** A pier in the river from under the water up to under the deck: the pivot's a drum, the others stone with cutwaters */
function pier(b: Batch, m: Paint, z: number, hz: number, round: boolean) {
  const y0 = WATER_Y - 1.2;
  if (round) {
    b.add(new THREE.CylinderGeometry(PIVOT.r, PIVOT.r + 0.15, PIER_TOP - y0, 28, 1, true).translate(SX, (PIER_TOP + y0) / 2, z), m.stone);
    b.add(new THREE.CircleGeometry(PIVOT.r, 28).rotateX(-Math.PI / 2).translate(SX, PIER_TOP, z), m.stone);
    b.add(new THREE.CylinderGeometry(PIVOT.r + 0.02, PIVOT.r + 0.02, 0.18, 28, 1, true).translate(SX, WATER_Y + 0.05, z), m.dark);
    // (the turning ring the span rides on)
    b.add(new THREE.TorusGeometry(PIVOT.r * 0.7, 0.08, 6, 28).rotateX(Math.PI / 2).translate(SX, PIER_TOP + 0.05, z), m.steel);
    return;
  }
  b.box(SX - PIER_HX, y0, z - hz, PIER_HX * 2, PIER_TOP - y0, hz * 2, m.stone);
  b.box(SX - PIER_HX - 0.02, WATER_Y - 0.05, z - hz - 0.02, PIER_HX * 2 + 0.04, 0.18, hz * 2 + 0.04, m.dark);
  // The cutwaters up and down the river
  for (const s of [-1, 1]) {
    const g = new THREE.CylinderGeometry(hz, hz, PIER_TOP - y0, 3, 1).rotateY(s < 0 ? Math.PI / 6 : -Math.PI / 6 + Math.PI);
    b.add(g.translate(SX + s * PIER_HX, (PIER_TOP + y0) / 2, z), m.stone);
  }
}

/** The barriers' fixed parts: a post each side of the roadway and each footway's outer edge, a lamp head */
function barrierPosts(b: Batch, m: Paint) {
  for (const z of [BARRIERS.n, BARRIERS.s])
    for (const x of [SX - ROAD - 0.12, SX + ROAD + 0.12]) {
      const y = deckY(z) + FOOT_H;
      b.box(x - 0.1, y, z - 0.1, 0.2, 1.0, 0.2, m.kerb);
      b.box(x - 0.11, y + 0.9, z - 0.11, 0.22, 0.04, 0.22, m.dark);
      b.box(x - 0.06, y + 1.0, z - 0.06, 0.12, 0.5, 0.12, m.dark);
      // (its warning lights' housing; the lights themselves flash on the main thread)
      b.box(x - 0.12, y + 1.25, z - 0.08, 0.24, 0.2, 0.16, m.dark);
    }
}

/** The cabin's name board: one small texture, fixed made-up copy */
const NAME_TEX = canvasTex(512, 96, (c) => {
  c.fillStyle = '#1d3b3d';
  c.fillRect(0, 0, 512, 96);
  c.strokeStyle = '#e8e4f8';
  c.lineWidth = 5;
  c.strokeRect(6, 6, 500, 84);
  c.fillStyle = '#f2f0ea';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `800 54px ${FONT_DISPLAY}`;
  c.fillText(SWING_NAME, 256, 52);
});

/** The truss's top chord over the span (local z from its middle): high over the pivot, down to the deck at its ends */
const chordY = (u: number) => H + 0.9 + 1.9 * Math.cos((Math.PI / 2) * Math.min(1, Math.abs(u) / (SPAN.half - 0.3)));

/** The swing span, built round its pivot (local x across, z along, y up from the street) */
function span(low: boolean): THREE.Group {
  const g = new THREE.Group();
  g.name = 'swing-span';
  const m = paint();
  const b = new Batch();
  const flat = () => H;
  // Its deck from end to end (a hair short of the approaches' ends, so their faces don't meet)
  deck(b, m, -SPAN.half + 0.05, SPAN.half - 0.05, flat, { rails: [-SPAN.half, SPAN.half], x: 0 });
  // Its ends' steel faces
  for (const s of [-1, 1]) b.box(-HALF, H - DEPTH, s * (SPAN.half - 0.05) - (s > 0 ? 0.04 : 0), HALF * 2, DEPTH + FOOT_H, 0.04, m.steel);
  // The two camelback trusses between the road and the footways: bottom chord, top chord, verticals, diagonals
  const TX = ROAD + 0.03;
  for (const s of [-1, 1]) {
    const x = s * TX;
    b.box(x - 0.08, H, -SPAN.half + 0.1, 0.16, 0.22, SPAN.half * 2 - 0.2, m.steel);
    const N = 10;
    for (let k = 0; k < N; k++) {
      const [u0, u1] = [-SPAN.half + 0.3 + ((SPAN.half * 2 - 0.6) * k) / N, -SPAN.half + 0.3 + ((SPAN.half * 2 - 0.6) * (k + 1)) / N];
      const [y0, y1] = [chordY(u0), chordY(u1)];
      // (the top chord between panel points)
      const len = Math.hypot(u1 - u0, y1 - y0);
      b.add(new THREE.BoxGeometry(0.16, 0.18, len).rotateX(-Math.atan2(y1 - y0, u1 - u0)).translate(x, (y0 + y1) / 2, (u0 + u1) / 2), m.steel);
      // (a vertical at each panel point, a diagonal across each panel)
      b.box(x - 0.05, H + 0.2, u1 - 0.05, 0.1, y1 - H - 0.2, 0.1, m.steel);
      if (!low) {
        const [da, db] = k < N / 2 ? [u1, u0] : [u0, u1];
        const [ya, yb] = [H + 0.2, chordY(db)];
        const l = Math.hypot(db - da, yb - ya);
        b.add(new THREE.BoxGeometry(0.07, 0.07, l).rotateX(-Math.atan2(yb - ya, db - da)).translate(x, (ya + yb) / 2, (da + db) / 2), m.steel);
      }
    }
    // (its end posts down to the deck)
    for (const e of [-1, 1]) b.box(x - 0.08, H, e * (SPAN.half - 0.3) - 0.08, 0.16, 0.95, 0.16, m.steel);
  }
  // The bracing over the road where the trusses are high (clear of a bus), and the operator's cabin on it
  const clear = H + 2.85;
  for (let u = -SPAN.half; u <= SPAN.half; u += 1.1) {
    if (chordY(u) < clear + 0.15) continue;
    b.box(-TX, clear, u - 0.06, TX * 2, 0.12, 0.12, m.steel);
  }
  const cab = { w: TX * 2 + 0.3, d: 2.4, h: 1.2, y: chordY(0) + 0.05 };
  b.box(-cab.w / 2, cab.y, -cab.d / 2, cab.w, 0.12, cab.d, m.dark);
  b.box(-cab.w / 2 + 0.1, cab.y + 0.12, -cab.d / 2 + 0.1, cab.w - 0.2, cab.h, cab.d - 0.2, toon('#d7d2c4'));
  b.box(-cab.w / 2, cab.y + 0.12 + cab.h, -cab.d / 2, cab.w, 0.12, cab.d, m.dark);
  // (its windows, lit at night, a hair proud of the walls)
  for (const s of [-1, 1]) b.box(s * (cab.w / 2 - 0.1) - (s > 0 ? 0 : 0.01), cab.y + 0.5, -cab.d / 2 + 0.3, 0.01, 0.55, cab.d - 0.6, neon('#ffd98a', 0.35, 1.25));
  b.build(g, { cast: true, receive: true });
  // The name on the cabin's ends, both ways
  const nameMat = lit(new THREE.MeshBasicMaterial({ map: NAME_TEX }), 0.95, 1.1);
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(cab.w - 0.4, 0.42), nameMat);
    p.position.set(0, cab.y + 0.12 + cab.h / 2 + 0.05, s * (cab.d / 2 - 0.09));
    p.rotation.y = s > 0 ? 0 : Math.PI;
    g.add(p);
  }
  // The ends' lights: red at the corners for the boats, green over the middle of the channel
  const red = neon('#ff3a4a', 0.6, 2.4);
  const green = neon('#3aff8a', 0.6, 2.4);
  const lb = new Batch();
  for (const e of [-1, 1]) for (const s of [-1, 1]) lb.box(s * (HALF - 0.1) - 0.06, H - DEPTH - 0.14, e * (SPAN.half - 0.15) - 0.06, 0.12, 0.12, 0.12, red);
  lb.box(-0.07, H - DEPTH - 0.16, -0.07, 0.14, 0.14, 0.14, green);
  lb.build(g, { cast: false, receive: false });
  return g;
}

export function register({ low, scene, tick }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  // The fixed approaches, a site each piece, and the piers and barriers' posts
  const pieces: [number, number][] = [];
  for (const [a, c] of [
    [Z0, SPAN.z0],
    [SPAN.z1, Z1],
  ])
    for (let z = a; z < c - 1e-6; z += STEP * 4) pieces.push([z, Math.min(c, z + STEP * 4)]);
  pieces.forEach(([z0, z1], i) =>
    site(`swing bridge ${i}`, [SX - HALF - 1, z0 - 1, SX + HALF + 1, z1 + 1], (into) => {
      const b = new Batch();
      const m = paint();
      // (the north approach's end a hair short of the span's)
      deck(b, m, z0, z1 === SPAN.z0 ? z1 - 0.05 : z1, deckY, { rails: PARAPET_Z });
      b.build(into, { cast: true, receive: true });
    })
  );
  site('swing bridge piers', [SX - HALF - 3, PIVOT.z - PIVOT.r - 1, SX + HALF + 3, SOUTH_PIER.z + 2], (into) => {
    const b = new Batch();
    const m = paint();
    pier(b, m, PIVOT.z, PIVOT.r, true);
    pier(b, m, REST.z, REST.hz, false);
    pier(b, m, SOUTH_PIER.z, SOUTH_PIER.hz, false);
    barrierPosts(b, m);
    b.build(into, { cast: true, receive: true });
  });
  if (!scene || !tick) return;

  // The span, on the main thread: it turns
  const root = new THREE.Group();
  root.name = 'swing-bridge';
  scene.add(root);
  const s = span(low);
  s.position.set(SX, 0, PIVOT.z);
  moving(s);
  s.userData.keep = true;
  root.add(s);
  // The barriers' booms (one over each lane, a short one over each footway) and their flashing lights
  const boomMat = toon('#e8e4f8');
  const stripeMat = toon('#e2463b');
  const flash = [0, 1].map(() => new THREE.MeshBasicMaterial({ color: '#2a0a0e' }));
  const booms: { g: THREE.Group; down: number }[] = [];
  for (const [end, z] of [
    [-1, BARRIERS.n],
    [1, BARRIERS.s],
  ] as const) {
    const y = deckY(z) + FOOT_H + 0.9;
    for (const [x, len, dir] of [
      [SX - ROAD - 0.12, ROAD - 0.05, 1],
      [SX + ROAD + 0.12, ROAD - 0.05, -1],
      [SX - ROAD - 0.12, FOOT[1] - FOOT[0] - 0.1, -1],
      [SX + ROAD + 0.12, FOOT[1] - FOOT[0] - 0.1, 1],
    ] as const) {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      const arm = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.06).translate(dir * (len / 2 + 0.1), 0, 0), boomMat);
      arm.add(bar);
      for (let k = 0; k < 3; k++) arm.add(new THREE.Mesh(new THREE.BoxGeometry(len / 7, 0.082, 0.062).translate(dir * (0.1 + (len * (2 * k + 1)) / 6), 0, 0), stripeMat));
      g.add(arm);
      moving(g);
      root.add(g);
      booms.push({ g: arm, down: dir });
    }
    // The lights on the posts: two lamps a post, flashing in turn
    for (const x of [SX - ROAD - 0.12, SX + ROAD + 0.12])
      for (const k of [0, 1]) {
        const l = new THREE.Mesh(new THREE.CircleGeometry(0.06, 10), flash[k]);
        l.position.set(x + (k ? 0.06 : -0.06), deckY(z) + FOOT_H + 1.35, z - end * 0.09);
        l.rotation.y = end < 0 ? Math.PI : 0;
        root.add(l);
      }
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let k = 0;
  let last = Date.now() / 1000;
  const on = new THREE.Color('#ff2a3a');
  const off = new THREE.Color('#2a0a0e');
  tick(() => {
    const e = CROWD_VIEW.eye;
    root.visible = Math.abs(e.x - SX) < 260 && Math.abs(e.z - PIVOT.z) < 260;
    if (!root.visible) return;
    const t = Date.now() / 1000;
    const dt = Math.min(0.2, t - last);
    last = t;
    const w = reduced ? { angle: 0, shut: false } : swingAt(t);
    s.rotation.y = w.angle;
    // (the booms come down over a few seconds, flat across, and go back up)
    k = THREE.MathUtils.clamp(k + (w.shut ? 1 : -1) * dt * 0.35, 0, 1);
    const ease = k * k * (3 - 2 * k);
    for (const bm of booms) bm.g.rotation.z = bm.down * (1 - ease) * (Math.PI / 2 - 0.05);
    const blink = w.shut && Math.floor(t * 2) % 2;
    flash[0].color.copy(w.shut && blink ? on : off);
    flash[1].color.copy(w.shut && !blink ? on : off);
  });
}
