/*
 * The underground's south line's stations drawn (docs/south-plan.md Phase 4e; southline.ts the rules), each finished as
 * the land over it (the owner's call: tiled at Aldwyn's Green and the High Road, the blocks' concrete at Lot 9 and the
 * Circus, gritty at The Trenches): the way in (its steps down, its walls, the header where its roof starts), the ticket
 * hall (its floor, walls with a band in the line's colour, the ticket machines, the gate line, its name board, strip
 * lights), the escalator (its steps, balustrades and handrails down its shaft) and the island platform (its yellow
 * edges, the tracks either side down in their beds, the tunnel's walls with the station's name boards across the
 * tracks, the strip lights, benches, a buffer stop at the line's end). The city's own M mark and type (as the raised
 * metro's, metro3d.ts). Only the stations built so far (`BUILT_STATIONS`). Registered by south3d.ts (the south's chunk),
 * a site each.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, PAL, canvasTex, lit, neon, siteMat, toon } from './kit';
import { site } from './tilework';
import { CONCRETE } from './southblocks';
import { BUILT_STATIONS, ESC_HALF, LINE_COLOUR, STAIR_INFILL, surfaceAt, HALL_CEIL, HALL_Y, PLAT_CEIL, PLAT_HALF, PLAT_Y, SOUTH_STATIONS, TRACK_OFF, TUNNEL_HALF, type Station, type StationId } from './southline';
import { acrossOf, alongOf, floorOf, pointOf, type Passage } from './underground';
import { buildFx, poster, tag } from './grime';
import { holedPoly } from './world';
import { colourAt } from './ground';
import { P, along, alongDir, upQuad, wallQuad } from './circus3d';

type Style = 'tiled' | 'concrete' | 'gritty';
const STYLE: Record<StationId, Style> = { trenches: 'gritty', circus: 'concrete', lot9: 'concrete', aldwyns: 'tiled', highroad: 'tiled' };

const WALLS: Record<Style, THREE.Material> = { tiled: toon('#e9e1cc'), concrete: toon(CONCRETE), gritty: toon('#8b8896') };
const LOW: Record<Style, THREE.Material> = { tiled: toon('#c9bfa6'), concrete: toon('#8b8277'), gritty: toon('#6d6a78') };
const BAND = toon(LINE_COLOUR);
const FLOOR = toon('#6b6661');
const CEIL = toon('#3d3a44');
const DARK = toon('#121018');
const EDGE = toon('#e8c23a');
const BALLAST = toon('#55504a');
const SLEEPER = toon('#4a3b30');
const RAIL = toon('#9aa0aa');
const STEP = toon('#5a5f66');
const BALUSTRADE = toon('#c9c3b8');
const HANDRAIL = toon('#1b1a20');
const MACHINE = toon('#2a3f66');
const BENCH = toon('#6a4a32');
const BUFFER = toon('#c0392b');
const TUBE = neon('#eef4ff', 0.6, 1.3);
const SCREEN = neon('#7fe3ff', 0.5, 1.1);

/* ---------- The name boards: the M mark and the station's name, a row a station ---------- */

const W = 1024;
const H = 160;
const BOARDS = canvasTex(W, H * SOUTH_STATIONS.length, (c) => {
  SOUTH_STATIONS.forEach((st, i) => {
    const y = i * H;
    c.fillStyle = '#100d1e';
    c.fillRect(0, y, W, H);
    c.fillStyle = PAL.magenta;
    c.beginPath();
    c.arc(84, y + H / 2, 56, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.font = `900 80px ${FONT_DISPLAY}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('M', 84, y + H / 2 + 5);
    c.textAlign = 'left';
    let size = 92;
    c.font = `900 ${size}px ${FONT_DISPLAY}`;
    const name = st.name.toUpperCase();
    while (c.measureText(name).width > W - 210 && size > 40) c.font = `900 ${(size -= 4)}px ${FONT_DISPLAY}`;
    c.fillText(name, 170, y + H / 2 + 6);
    c.strokeStyle = LINE_COLOUR;
    c.lineWidth = 10;
    c.strokeRect(6, y + 6, W - 12, H - 12);
  });
});
const BOARD = siteMat('line-boards', lit(new THREE.MeshBasicMaterial({ map: BOARDS }), 0.9, 1.15));
/** A name board facing n, its middle at (x, y, z), row `row` */
function board(b: Batch, row: number, x: number, y: number, z: number, n: [number, number], w: number) {
  const h = (w * H) / W;
  const g = new THREE.PlaneGeometry(w, h);
  const [v0, v1] = [1 - (row + 1) / SOUTH_STATIONS.length, 1 - row / SOUTH_STATIONS.length];
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, v1, 1, v1, 0, v0, 1, v0], 2));
  b.add(g.rotateY(Math.atan2(n[0], n[1])).translate(x, y, z), BOARD);
}

/* ---------- Helpers ---------- */

const yawOf = (p: Passage) => {
  const [dx, dz] = alongDir(p);
  return Math.atan2(-dz, dx);
};
/** A box `len` along a passage at s, across from u0 to u1, from y0 to y1, tilted to rise `rise` over its length */
function tilted(b: Batch, p: Passage, s0: number, s1: number, u0: number, u1: number, y0: number, y1: number, rise: number, m: THREE.Material) {
  const [a, c] = [P(p, s0, (u0 + u1) / 2), P(p, s1, (u0 + u1) / 2)];
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const pitch = Math.atan2(rise, len);
  const g = new THREE.BoxGeometry(Math.hypot(len, rise), y1 - y0, Math.abs(u1 - u0)).rotateZ(pitch).rotateY(yawOf(p));
  b.add(g.translate((a[0] + c[0]) / 2, (y0 + y1) / 2 + rise / 2, (a[1] + c[1]) / 2), m);
}
/** A ceiling across a passage from s0 to s1, u0 to u1, at y, facing down */
function ceiling(b: Batch, p: Passage, s0: number, s1: number, u0: number, u1: number, y: number, m: THREE.Material) {
  const cs = [P(p, s0, u0), P(p, s1, u0), P(p, s1, u1), P(p, s0, u1)];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(cs.flatMap(([x, z]) => [x, y, z]), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  if (g.attributes.normal.getY(0) > 0) g.setIndex([0, 2, 1, 0, 3, 2]);
  g.computeVertexNormals();
  b.add(g, m);
}
/** A flat floor across a passage from s0 to s1, u0 to u1, at y, facing up */
const floor = (b: Batch, p: Passage, s0: number, s1: number, u0: number, u1: number, y: number, m: THREE.Material) =>
  upQuad(b, [P(p, s0, u0), P(p, s1, u0), P(p, s1, u1), P(p, s0, u1)].map(([x, z]) => [x, y, z] as [number, number, number]), m);
/** A wall face along a passage at u, from s0 to s1, from y0 to y1, facing in (towards u = 0) */
const face = (b: Batch, p: Passage, s0: number, s1: number, u: number, y0: number, y1: number, m: THREE.Material) => {
  const mid = P(p, (s0 + s1) / 2, u);
  const c = P(p, (s0 + s1) / 2, 0);
  wallQuad(b, P(p, s0, u), P(p, s1, u), y0, y1, y0, y1, [c[0] - mid[0], c[1] - mid[1]], m);
};
/** A wall across a passage at s, from u0 to u1, from y0 to y1, facing the way `dir` (+1: along it) */
const across = (b: Batch, p: Passage, s: number, u0: number, u1: number, y0: number, y1: number, dir: number, m: THREE.Material) => {
  const [dx, dz] = alongDir(p);
  wallQuad(b, P(p, s, u0), P(p, s, u1), y0, y1, y0, y1, [dx * dir, dz * dir], m);
};

/* ---------- A station ---------- */

/** Where along `p` a point along `q` is (the pieces of a station each measure along their own line) */
const sIn = (p: Passage, q: Passage, s: number) => alongOf(p, ...pointOf(q, s));

function drawPlatform(b: Batch, st: Station, style: Style, row: number, low: boolean) {
  const p = st.platform;
  const [a0, a1] = [p.a0, p.a1];
  const trackY = PLAT_Y - 0.95;
  const wall = WALLS[style];
  // The island: its slab and top, its yellow edges
  along(b, p, a0, a1, -PLAT_HALF, PLAT_HALF, trackY, PLAT_Y - 0.01, LOW[style]);
  floor(b, p, a0, a1, -PLAT_HALF, PLAT_HALF, PLAT_Y, FLOOR);
  for (const s of [-1, 1]) floor(b, p, a0, a1, s * (PLAT_HALF - 0.28), s * (PLAT_HALF - 0.12), PLAT_Y + 0.004, EDGE);
  // The tracks in their beds either side: ballast, sleepers, rails (on past the platform's ends a little, into the dark)
  const [t0, t1] = [a0 - 3, a1 + 3];
  for (const side of [-1, 1]) {
    const u = side * TRACK_OFF;
    floor(b, p, t0, t1, u - 1.1, u + 1.1, trackY, BALLAST);
    for (const r of [-0.42, 0.42]) along(b, p, t0, t1, u + r - 0.04, u + r + 0.04, trackY, trackY + 0.16, RAIL);
    if (!low) for (let s = t0 + 0.3; s < t1; s += 0.7) along(b, p, s - 0.12, s + 0.12, u - 0.62, u + 0.62, trackY, trackY + 0.06, SLEEPER);
  }
  // The tunnel's walls past the tracks (tiled to the band, the band, above it), the ceiling, the strip lights
  for (const side of [-1, 1]) {
    const u = side * TUNNEL_HALF;
    face(b, p, t0, t1, u, trackY, PLAT_Y + 0.5, LOW[style]);
    face(b, p, t0, t1, u * 0.999, PLAT_Y + 0.5, PLAT_Y + 0.75, BAND);
    face(b, p, t0, t1, u, PLAT_Y + 0.75, PLAT_CEIL, wall);
    // (the station's name across the tracks, every few metres)
    for (let s = a0 + 4; s < a1 - 2; s += 7) {
      const [x, z] = P(p, s, u * 0.995);
      const c = P(p, s, 0);
      board(b, row, x, PLAT_Y + 1.35, z, [c[0] - x, c[1] - z], 2.6);
    }
  }
  ceiling(b, p, t0, t1, -TUNNEL_HALF, TUNNEL_HALF, PLAT_CEIL, CEIL);
  for (let s = a0 + 1; s < a1 - 0.5; s += 2.2) {
    const [x, z] = P(p, s, 0);
    b.add(new THREE.BoxGeometry(1.2, 0.04, 0.1).rotateY(yawOf(p)).translate(x, PLAT_CEIL - 0.03, z), TUBE);
  }
  // The ends: the tunnel's mouths beyond (dark), or a buffer stop where the line ends
  const i = SOUTH_STATIONS.indexOf(st);
  for (const [s, dir] of [
    [t0, 1],
    [t1, -1],
  ] as const) {
    // (the line's ends: before the first station's platform, past the last's)
    const end = (i === 0 && dir > 0) || (i === SOUTH_STATIONS.length - 1 && dir < 0) ? 'end' : 'on';
    across(b, p, s - dir * 0.6, -TUNNEL_HALF, TUNNEL_HALF, trackY, PLAT_CEIL, dir, end === 'end' ? wall : DARK);
    if (end === 'end') for (const side of [-1, 1]) along(b, p, s + dir * 0.2 - 0.25, s + dir * 0.2 + 0.25, side * TRACK_OFF - 0.6, side * TRACK_OFF + 0.6, trackY, trackY + 0.6, BUFFER);
  }
  // Benches down the middle, away from the escalator's foot
  const esc = sIn(p, st.escalator, (st.escalator.a0 + st.escalator.a1) / 2);
  for (const s of [a0 + 5, (a0 + a1) / 2, a1 - 5]) if (Math.abs(s - esc) > 6) along(b, p, s - 0.8, s + 0.8, -0.25, 0.25, PLAT_Y, PLAT_Y + 0.28, BENCH);
}

function drawEscalator(b: Batch, st: Station, style: Style, low: boolean) {
  const e = st.escalator;
  // (its top and its foot: which end is up)
  const up = floorOf(e, e.a1) > floorOf(e, e.a0) ? 1 : -1;
  const [foot, top] = up > 0 ? [e.ramp1, e.a1] : [e.ramp0, e.a0];
  const [lo, hi] = [Math.min(foot, top), Math.max(foot, top)];
  const rise = HALL_Y - PLAT_Y;
  const slope = rise / (hi - lo);
  const yAt = (s: number) => floorOf(e, s);
  // The steps, the balustrades either side, the handrails, the shaft's walls and its ceiling, a light every few metres
  const n = low ? 14 : 26;
  for (let i = 0; i < n; i++) {
    const [s0, s1] = [lo + ((hi - lo) * i) / n, lo + ((hi - lo) * (i + 1)) / n];
    const y = Math.max(yAt(s0), yAt(s1));
    along(b, e, s0, s1, -ESC_HALF + 0.25, ESC_HALF - 0.25, Math.min(yAt(s0), yAt(s1)) - 0.1, y, STEP);
  }
  // (everything tilted from its lower-along end's height by the climb to its other)
  const [yLo, r] = [yAt(lo), yAt(hi) - yAt(lo)];
  for (const side of [-1, 1]) {
    const u = side * (ESC_HALF - 0.15);
    tilted(b, e, lo, hi, u - 0.06, u + 0.06, yLo, yLo + 0.8, r, BALUSTRADE);
    tilted(b, e, lo, hi, u - 0.07, u + 0.07, yLo + 0.8, yLo + 0.86, r, HANDRAIL);
    tilted(b, e, lo, hi, side * (ESC_HALF + 0.2) - 0.1, side * (ESC_HALF + 0.2) + 0.1, yLo - 0.3, yLo + 2.4, r, WALLS[style]);
  }
  tilted(b, e, lo, hi, -ESC_HALF - 0.3, ESC_HALF + 0.3, yLo + 2.4, yLo + 2.5, r, CEIL);
  for (let s = lo + 1.5; s < hi - 1; s += 2) {
    const [x, z] = P(e, s, 0);
    b.add(new THREE.BoxGeometry(0.8, 0.04, 0.1).rotateY(yawOf(e)).translate(x, yAt(s) + 2.36, z), TUBE);
  }
  void slope;
}

function drawHall(b: Batch, st: Station, style: Style, row: number, low: boolean) {
  const h = st.hall;
  const wall = WALLS[style];
  const [a0, a1] = [h.a0, h.a1];
  floor(b, h, a0, a1, -h.half, h.half, HALL_Y, FLOOR);
  ceiling(b, h, a0, a1, -h.half, h.half, HALL_CEIL, CEIL);
  // Its sides: open where the way in comes through one (its stairs or the plaza's corridor at an angle to it)
  const gaps = [-1, 1].map((side) => sideGap(h, st.way, side));
  for (const side of [-1, 1]) {
    const g = gaps[(side + 1) / 2];
    const runs: [number, number][] = g ? [[a0, g.at - g.half], [g.at + g.half, a1]] : [[a0, a1]];
    for (const [r0, r1] of runs) {
      if (r1 - r0 < 0.05) continue;
      face(b, h, r0, r1, side * h.half, HALL_Y, HALL_Y + 0.45, LOW[style]);
      face(b, h, r0, r1, side * h.half * 0.999, HALL_Y + 0.45, HALL_Y + 0.6, BAND);
      face(b, h, r0, r1, side * h.half, HALL_Y + 0.6, HALL_CEIL, wall);
    }
  }
  // (the ticket machines and the name board on the side without the way in)
  const quiet = gaps[1] ? -1 : 1;
  // Its ends: open where the escalator goes down (one end) and the way comes in (the other end, or its side)
  const escAt = sIn(h, st.escalator, floorOf(st.escalator, st.escalator.a0) > floorOf(st.escalator, st.escalator.a1) ? st.escalator.a0 : st.escalator.a1);
  const escEnd = Math.abs(escAt - a0) < Math.abs(escAt - a1) ? a0 : a1;
  const wayIn = sIn(h, st.way, st.way.a1);
  const wayEnd = escEnd === a0 ? a1 : a0;
  // (the way in comes through the hall's far end when it runs along the hall; from its side otherwise: 4f)
  const [hd, wd] = [alongDir(h), alongDir(st.way)];
  const wayAlong = Math.abs(hd[0] * wd[1] - hd[1] * wd[0]) < 0.3;
  void wayIn;
  for (const [s, dir, gap] of [
    [escEnd, escEnd === a0 ? 1 : -1, ESC_HALF + 0.2],
    [wayEnd, wayEnd === a0 ? 1 : -1, wayAlong ? st.way.half + 0.25 : 0],
  ] as const) {
    if (gap > 0) {
      for (const [u0, u1] of [
        [-h.half, -gap],
        [gap, h.half],
      ])
        across(b, h, s, u0, u1, HALL_Y, HALL_CEIL, dir, wall);
      across(b, h, s, -gap, gap, HALL_Y + 1.5, HALL_CEIL, dir, wall);
    } else across(b, h, s, -h.half, h.half, HALL_Y, HALL_CEIL, dir, wall);
  }
  // Strip lights, the ticket machines and the gate line (posts with gaps, nothing in the way), its name board
  for (let s = a0 + 1.2; s < a1 - 0.8; s += 2) {
    const [x, z] = P(h, s, 0);
    b.add(new THREE.BoxGeometry(1.2, 0.04, 0.1).rotateY(yawOf(h)).translate(x, HALL_CEIL - 0.03, z), TUBE);
  }
  const mid = (a0 + a1) / 2;
  for (const s of [mid - 1.6, mid - 0.6]) {
    along(b, h, s - 0.35, s + 0.35, quiet * (h.half - 0.45), quiet * (h.half - 0.05), HALL_Y, HALL_Y + 1.1, MACHINE);
    const [x, z] = P(h, s, quiet * (h.half - 0.46));
    const c = P(h, s, 0);
    const g = new THREE.PlaneGeometry(0.4, 0.25).rotateY(Math.atan2(c[0] - x, c[1] - z)).translate(x, HALL_Y + 0.8, z);
    g.deleteAttribute('uv');
    b.add(g, SCREEN);
  }
  const gate = escEnd === a0 ? a0 + 2.6 : a1 - 2.6;
  if (!low) for (let u = -h.half + 0.5; u < h.half - 0.3; u += 0.9) along(b, h, gate - 0.25, gate + 0.25, u - 0.08, u + 0.08, HALL_Y, HALL_Y + 0.75, HANDRAIL);
  const [bx, bz] = P(h, mid + 1.6, quiet * h.half * 0.995);
  const c = P(h, mid + 1.6, 0);
  board(b, row, bx, HALL_Y + 1.15, bz, [c[0] - bx, c[1] - bz], 2.2);
}

function drawWay(b: Batch, st: Station, style: Style): void {
  const w = st.way;
  if (st.entrance.kind === 'plaza') return drawPlazaCorridor(b, st, style);
  const wall = WALLS[style];
  const top = floorOf(w, w.a0);
  // (it ends where it meets the hall: its walls go no further in)
  const hallEdge = edgeOf(st);
  // The steps down, a flight
  const n = 10;
  for (let i = 0; i < n; i++) {
    const [s0, s1] = [w.a0 + ((w.ramp0 - w.a0) * i) / n, w.a0 + ((w.ramp0 - w.a0) * (i + 1)) / n];
    along(b, w, s0, s1, -w.half, w.half, HALL_Y - 0.05, floorOf(w, s1) + (top - HALL_Y) / n, STEP);
  }
  floor(b, w, w.ramp0, hallEdge, -w.half, w.half, HALL_Y + 0.002, FLOOR);
  // Its walls: down beside the steps from the street (or the building's floor) and on to the hall, the ceiling over the
  // level part, the header where the roof starts over the steps
  for (const side of [-1, 1]) {
    // (beside the steps, up to the surface there: in pieces, the ground rolling; inside the station building, its floor)
    const n = Math.max(2, Math.ceil((w.ramp0 - w.a0) / 0.8));
    for (let i = 0; i < n; i++) {
      const [s0, s1] = [w.a0 + ((w.ramp0 - w.a0) * i) / n, w.a0 + ((w.ramp0 - w.a0) * (i + 1)) / n];
      const u = side * (w.half + w.wall / 2);
      const g = st.entrance.kind === 'building' ? top : Math.max(top, surfaceAt(...P(w, s0, u)), surfaceAt(...P(w, s1, u)));
      along(b, w, s0, s1, side * w.half, side * (w.half + w.wall), HALL_Y - 0.05, g, wall);
    }
    along(b, w, w.ramp0, hallEdge, side * w.half, side * (w.half + w.wall), HALL_Y - 0.05, HALL_CEIL, wall);
    face(b, w, w.ramp0, hallEdge, side * (w.half - 0.004), HALL_Y, HALL_Y + 0.45, LOW[style]);
  }
  ceiling(b, w, w.ramp0, hallEdge, -w.half - w.wall, w.half + w.wall, HALL_CEIL, CEIL);
  const headTop = st.entrance.kind === 'building' ? top : Math.max(top, surfaceAt(...P(w, w.ramp0, -w.half)), surfaceAt(...P(w, w.ramp0, w.half)));
  across(b, w, w.ramp0, -w.half - w.wall, w.half + w.wall, HALL_CEIL, headTop, -1, wall);
  // (handrails down the steps)
  for (const side of [-1, 1]) tilted(b, w, w.a0, w.ramp0, side * (w.half - 0.06) - 0.03, side * (w.half - 0.06) + 0.03, HALL_Y + 0.85 - 0.03, HALL_Y + 0.85 + 0.03, top - HALL_Y, HANDRAIL);
  const [x, z] = P(w, (w.ramp0 + hallEdge) / 2, 0);
  b.add(new THREE.BoxGeometry(1.0, 0.04, 0.1).rotateY(yawOf(w)).translate(x, HALL_CEIL - 0.03, z), TUBE);
}

/** Where a way in crosses a hall's side `side` (u = side * half): its middle along the hall and its half width there
 * (wider the more slanting it crosses), or null if it doesn't */
function sideGap(h: Passage, w: Passage, side: number): { at: number; half: number } | null {
  const f = (s: number) => acrossOf(h, ...pointOf(w, s)) - side * h.half;
  const [f0, f1] = [f(w.a0), f(w.a1)];
  if (Math.sign(f0) === Math.sign(f1) || f0 === f1) return null;
  const s = w.a0 + ((w.a1 - w.a0) * f0) / (f0 - f1);
  const [hd, wd] = [alongDir(h), alongDir(w)];
  const sin = Math.abs(hd[0] * wd[1] - hd[1] * wd[0]);
  if (sin < 0.3) return null;
  return { at: alongOf(h, ...pointOf(w, s)), half: (w.half + 0.05) / sin };
}

/** The city's M mark on a disc (as the raised metro's, metro3d.ts), for the stairs' posts */
let markMat: THREE.Material | null = null;
const MARK = () =>
  (markMat ??= siteMat(
    'line-mark',
    lit(
      new THREE.MeshBasicMaterial({
        map: canvasTex(128, 128, (c) => {
          c.fillStyle = '#100d1e';
          c.fillRect(0, 0, 128, 128);
          c.fillStyle = PAL.magenta;
          c.beginPath();
          c.arc(64, 64, 58, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = '#ffffff';
          c.font = `900 84px ${FONT_DISPLAY}`;
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText('M', 64, 70);
        }),
      }),
      0.9,
      1.2
    )
  ));
const POST = toon('#2a2838');

/** The stairs down from the street: parapets round their opening, coping, railings on them, the M mark on a post at the
 * mouth (the near end, open) */
function drawStreetStairs(b: Batch, st: Station, style: Style, low: boolean) {
  const w = st.way;
  const wall = WALLS[style];
  const k = w.wall;
  // (in pieces along the opening, each on the surface beside it: Aldwyn's Green's goes down its hill)
  const n = Math.max(3, Math.ceil((w.ramp0 - w.a0) / 0.8));
  const ground = (s: number, u: number) => surfaceAt(...P(w, s, u));
  for (const side of [-1, 1]) {
    const u = side * (w.half + k / 2);
    for (let i = 0; i < n; i++) {
      const [s0, s1] = [w.a0 + ((w.ramp0 + k - w.a0) * i) / n, w.a0 + ((w.ramp0 + k - w.a0) * (i + 1)) / n];
      const g = Math.max(ground(s0, u), ground(s1, u));
      along(b, w, s0, s1, side * w.half, side * (w.half + k), g, g + 0.3, wall);
      along(b, w, s0 - 0.01, s1 + 0.01, side * (w.half - 0.03), side * (w.half + k + 0.03), g + 0.3, g + 0.36, BALUSTRADE);
      along(b, w, s0, s1, u - 0.03, u + 0.03, g + 0.92, g + 0.98, POST);
      if (!low || i % 2 === 0) along(b, w, s0 - 0.03, s0 + 0.03, u - 0.03, u + 0.03, g + 0.36, g + 0.95, POST);
    }
  }
  // (across the far end, over its header)
  const ge = Math.max(ground(w.ramp0, -w.half), ground(w.ramp0, w.half));
  along(b, w, w.ramp0, w.ramp0 + k, -w.half, w.half, ge, ge + 0.3, wall);
  along(b, w, w.ramp0 - 0.03, w.ramp0 + k + 0.03, -w.half - k, w.half + k, ge + 0.3, ge + 0.36, BALUSTRADE);
  along(b, w, w.ramp0 + k / 2 - 0.03, w.ramp0 + k / 2 + 0.03, -w.half - k / 2, w.half + k / 2, ge + 0.92, ge + 0.98, POST);
  // The M mark on its post by the mouth, facing out
  const [px, pz] = P(w, w.a0 - 0.35, w.half + k + 0.25);
  const gp = surfaceAt(px, pz);
  b.add(new THREE.CylinderGeometry(0.05, 0.05, 1.9, 6, 1, true).translate(px, gp + 0.95, pz), POST);
  const [dx, dz] = alongDir(w);
  for (const facing of [-1, 1]) {
    const g = new THREE.CircleGeometry(0.32, low ? 16 : 24).rotateY(Math.atan2(-dx * facing, -dz * facing)).translate(px - dx * facing * 0.03, gp + 2.0, pz - dz * facing * 0.03);
    b.add(g, MARK());
  }
}

/** The Circus's way: the corridor out of its sunken plaza's wall to the hall (as its subways are, circus3d.ts) */
function drawPlazaCorridor(b: Batch, st: Station, style: Style) {
  const w = st.way;
  const from = w.a0 - 4.6 + 7.2;
  const hallEdge = edgeOf(st);
  floor(b, w, from, hallEdge, -w.half, w.half, HALL_Y + 0.003, FLOOR);
  for (const side of [-1, 1]) {
    along(b, w, from, hallEdge, side * w.half, side * (w.half + w.wall), HALL_Y - 0.05, HALL_CEIL, WALLS[style]);
    face(b, w, from, hallEdge, side * (w.half - 0.004), HALL_Y, HALL_Y + 0.45, LOW[style]);
  }
  ceiling(b, w, from, hallEdge, -w.half - w.wall, w.half + w.wall, HALL_CEIL, CEIL);
  for (let s = from + 0.9; s < hallEdge - 0.3; s += 1.6) {
    const [x, z] = P(w, s, 0);
    b.add(new THREE.BoxGeometry(1.0, 0.04, 0.1).rotateY(yawOf(w)).translate(x, HALL_CEIL - 0.03, z), TUBE);
  }
}
/** Where a station's way meets its hall (its walls go no further in) */
function edgeOf(st: Station) {
  const [w, h] = [st.way, st.hall];
  for (let s = w.a0; s <= w.a1; s += 0.05) {
    const t = alongOf(h, ...pointOf(w, s));
    if (t > h.a0 && t < h.a1 && Math.abs(acrossOf(h, ...pointOf(w, s))) < h.half) return s;
  }
  return w.a1;
}

/** Tags and a bill or two on The Trenches' walls (the gritty finish), on the FX layer */
function grit(fx: Batch, st: Station) {
  const h = st.hall;
  const p = st.platform;
  for (const [piece, u, y, n] of [
    [h, h.half - 0.012, HALL_Y + 1.0, 4],
    [h, -h.half + 0.012, HALL_Y + 0.9, 3],
    [p, TUNNEL_HALF - 0.012, PLAT_Y + 1.0, 5],
    [p, -TUNNEL_HALF + 0.012, PLAT_Y + 1.1, 5],
  ] as const) {
    for (let i = 0; i < n; i++) {
      const s = piece.a0 + ((i + 0.6) / (n + 0.2)) * (piece.a1 - piece.a0);
      const [x, z] = P(piece, s, u);
      const c = P(piece, s, 0);
      const nn: [number, number] = [c[0] - x, c[1] - z];
      const l = Math.hypot(...nn) || 1;
      if (i % 3 === 2) poster(fx, i + 3, 1, [nn[0] / l, nn[1] / l], x, y + 0.2, z);
      else tag(fx, i * 5 + 2, 1.0, [nn[0] / l, nn[1] / l], x, y, z);
    }
  }
}

const RGB: [number, number, number] = [0, 0, 0];
/** Each built station, a site */
export function registerLine(low: boolean) {
  for (const st of SOUTH_STATIONS) {
    if (!BUILT_STATIONS.includes(st.id)) continue;
    const style = STYLE[st.id];
    const row = SOUTH_STATIONS.indexOf(st);
    const pts = [st.platform, st.hall, st.escalator, st.way].flatMap((p) => [P(p, p.a0 - 4, -TUNNEL_HALF - 1), P(p, p.a0 - 4, TUNNEL_HALF + 1), P(p, p.a1 + 4, -TUNNEL_HALF - 1), P(p, p.a1 + 4, TUNNEL_HALF + 1)]);
    const xs = pts.map((q) => q[0]);
    const zs = pts.map((q) => q[1]);
    site(`line ${st.id}`, [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)], (into) => {
      const b = new Batch();
      drawPlatform(b, st, style, row, low);
      drawEscalator(b, st, style, low);
      drawHall(b, st, style, row, low);
      drawWay(b, st, style);
      if (st.entrance.kind === 'stairs') drawStreetStairs(b, st, style, low);
      // (on open ground, the grass laid back round its opening in the ground's own colour: underpasses.ts cuts a box)
      for (const f of STAIR_INFILL)
        if (f.cut.some((p) => Math.hypot(p[0] - pointOf(st.way, st.way.a0)[0], p[1] - pointOf(st.way, st.way.a0)[1]) < 6))
          b.shade(holedPoly(f.box, 0.002, [f.cut]), (x, _y, z, c) => {
            const [r, g, bl] = colourAt(x, z, RGB);
            c.setRGB(r, g, bl, THREE.SRGBColorSpace);
          });
      const fx = new Batch();
      if (style === 'gritty') grit(fx, st);
      b.build(into, { cast: false, receive: true, lift: false });
      buildFx(fx, into);
    });
  }
}
