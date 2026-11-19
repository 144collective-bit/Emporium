/*
 * The raised ring highway drawn (docs/highway-plan.md Phase 2, the owner's pick: a modern concrete box girder; the
 * numbers are viaduct.ts and viapiers.ts), a district loaded as you approach (districts.ts `LAZY_DISTRICTS` id
 * `viaduct`: its land is the whole ring, so it comes in just after the boot), as sites a stretch of the ring each
 * (tilework.ts): the box girder (a smooth pale deck, its wings cantilevered over sloping webs down to the soffit), the
 * asphalt with its lane lines (dashes between each way's two lanes, solid edge lines, a yellow line along the median),
 * a concrete parapet along each edge with a steel rail on posts, the concrete median barrier, expansion joints across
 * it every few piers, and the hammerhead piers (a slim stem with its corners cut, the head flaring out under the
 * soffit, bearings on it; down into the water over the river), and its exits' ramps (docs/highway-plan.md Phase 3:
 * each a concrete deck following its climb, its asphalt and edge lines, parapets where `rampSegs()` puts them, on
 * piers where it's high and a filled bank between walls where it's low; the deck's parapet open where one tapers in
 * or out, `deckGap()`); Phase 4 (viadress.ts): the green gantries over the carriageways before each off-ramp and the
 * signs by the on-ramps' feet (one sign atlas, the exits' own made-up names), the sound walls past homes, and under the
 * deck its car parks, lock-ups, courts, the murals on its piers and the lights where streets pass under. Its lamps stand on the median barrier (viapiers.ts
 * `DECK_LAMPS`, placed at the boot with the town's). Nothing on it is solid but the piers (solids.ts); the camera
 * keeps under or over the deck (`DECK_CAMERA`).
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, lit, neon, siteMat, toon } from './kit';
import { parkedCars } from './cars';
import { site } from './tilework';
import { LANE, MEDIAN } from './layout';
import { HIGHWAY_HALF } from './highway';
import { WATER_Y, inChannel, shoreY } from './river';
import { fromHighway } from './highway';
import { DECK_HALF, DECK_Y, GIRDER, OUTER_LANE, PARAPET, PIER, RAMPS, RAMP_HALF, RING_LEN, ringAt, ringPoint, type Pt, type Ramp } from './viaduct';
import { BARRIER_TOP, JOINT_EVERY, PIERS } from './viapiers';
import { RAMP_PARAPET, RAMP_PIER, RAMP_PIERS, deckGap, rampSegs } from './viaground';
import { BAY, LOCKUP, SOFFIT_Y, UNDER, UNDER_CARS, UNDER_LIGHTS, skateParts, type Under } from './viadress';
import { buildFx, poster, tag } from './grime';
import { EXIT_SIGNS, GANTRIES, GANTRY, MURALS, MURAL_ART, RAMP_SIGNS, SOUND_WALL, gantryPanel, soundWall, type Gantry } from './viasigns';
import { ROAD, STONE } from './palette';

export const SELF = import.meta.url;

/** A site's stretch of the ring (short enough that nothing in it is much longer than a tile, tileBatch()) */
const STRETCH = 12;
/** The section's sample along the ring (the corners are arcs) */
const STEP = 2;
/** The girder's cross-section under the deck, from the outer edge round under the soffit to the inner: (o, y) */
const WING = 1.3;
const WEB = 1.7;
const SECTION: Pt[] = [
  [DECK_HALF, DECK_Y],
  [DECK_HALF, DECK_Y - 0.28],
  [DECK_HALF - WING, DECK_Y - 0.46],
  [DECK_HALF - WEB, DECK_Y - GIRDER],
  [-(DECK_HALF - WEB), DECK_Y - GIRDER],
  [-(DECK_HALF - WING), DECK_Y - 0.46],
  [-DECK_HALF, DECK_Y - 0.28],
  [-DECK_HALF, DECK_Y],
];
/** A parapet's section on the outer edge (mirrored for the inner): a low safety-shape wall, its back the deck's edge */
const PARAPET_SECTION: Pt[] = [
  [HIGHWAY_HALF, DECK_Y],
  [HIGHWAY_HALF + 0.05, DECK_Y + 0.14],
  [HIGHWAY_HALF + 0.12, DECK_Y + PARAPET],
  [DECK_HALF, DECK_Y + PARAPET],
  [DECK_HALF, DECK_Y],
];
/** The median barrier's section */
const BARRIER = BARRIER_TOP;
const BARRIER_SECTION: Pt[] = [
  [0.25, DECK_Y],
  [0.17, DECK_Y + 0.16],
  [0.08, DECK_Y + BARRIER],
  [-0.08, DECK_Y + BARRIER],
  [-0.17, DECK_Y + 0.16],
  [-0.25, DECK_Y],
];
/** The asphalt's top over the concrete, and the lines' over it */
const ROAD_UP = 0.006;
const LINE_UP = 0.016;

/** Samples of the ring from s0 to s1 (both in), every STEP at most */
function samples(s0: number, s1: number) {
  const n = Math.max(1, Math.ceil((s1 - s0) / STEP));
  return Array.from({ length: n + 1 }, (_, k) => s0 + ((s1 - s0) * k) / n);
}

/**
 * A section swept along the ring from s0 to s1: a quad strip for each of its sides, each facing away from `inside`
 * (a point in the section's own plane, o and y, the faces turned out from it)
 */
function sweep(sec: Pt[], s0: number, s1: number, inside: Pt, closed = false) {
  const ss = samples(s0, s1);
  const pos: number[] = [];
  const at = (s: number, [o, y]: Pt) => {
    const [x, z] = ringPoint(s, o);
    return new THREE.Vector3(x, y, z);
  };
  const sides = closed ? sec.length : sec.length - 1;
  for (let i = 0; i < sides; i++) {
    const [p, q] = [sec[i], sec[(i + 1) % sec.length]];
    // Which way this side faces in its section: away from the inside point
    const mid: Pt = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    for (let k = 1; k < ss.length; k++) {
      const [a, b] = [ss[k - 1], ss[k]];
      const v = [at(a, p), at(a, q), at(b, q), at(b, p)];
      const n = new THREE.Vector3().subVectors(v[1], v[0]).cross(new THREE.Vector3().subVectors(v[3], v[0]));
      const r = ringAt((a + b) / 2);
      const out = new THREE.Vector3(r.nx * (mid[0] - inside[0]), mid[1] - inside[1], r.nz * (mid[0] - inside[0]));
      const quad = n.dot(out) >= 0 ? [v[0], v[1], v[2], v[0], v[2], v[3]] : [v[0], v[2], v[1], v[0], v[3], v[2]];
      for (const w of quad) pos.push(w.x, w.y, w.z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
/** A flat band on the deck from o0 to o1 across it, s0 to s1 along it, at y, facing up */
function band(o0: number, o1: number, s0: number, s1: number, y: number) {
  const ss = samples(s0, s1);
  const pos: number[] = [];
  for (let k = 1; k < ss.length; k++) {
    const [a, b] = [ss[k - 1], ss[k]];
    const v = [ringPoint(a, o0), ringPoint(a, o1), ringPoint(b, o1), ringPoint(b, o0)].map(([x, z]) => new THREE.Vector3(x, y, z));
    const n = new THREE.Vector3().subVectors(v[1], v[0]).cross(new THREE.Vector3().subVectors(v[3], v[0]));
    const quad = n.y >= 0 ? [v[0], v[1], v[2], v[0], v[2], v[3]] : [v[0], v[2], v[1], v[0], v[3], v[2]];
    for (const w of quad) pos.push(w.x, w.y, w.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  return g;
}
/** A box in the ring's frame at s: `along` it, `across` (outward) and `up`, its middle at o across and its foot at y */
function ringBox(s: number, o: number, y: number, along: number, across: number, up: number) {
  const r = ringAt(s);
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(r.tx, 0, r.tz), new THREE.Vector3(0, 1, 0), new THREE.Vector3(r.nx, 0, r.nz));
  return new THREE.BoxGeometry(along, up, across).translate(0, y + up / 2, o).applyMatrix4(m).translate(r.x, 0, r.z);
}

/** The lane lines across the deck: dashes between each way's two lanes, the edge lines, the median's yellow */
const DASH_AT = MEDIAN / 2 + LANE;
const EDGE_AT = MEDIAN / 2 + 2 * LANE + 0.06;
const INNER_AT = MEDIAN / 2 + 0.12;

/** The stretches of [s0, s1] where the deck's parapet on side q stands (broken where a ramp tapers in or out) */
function openRuns(q: 1 | -1, s0: number, s1: number): [number, number][] {
  const out: [number, number][] = [];
  const n = Math.max(1, Math.ceil((s1 - s0) / 0.5));
  let from: number | null = null;
  for (let k = 0; k <= n; k++) {
    const s = s0 + ((s1 - s0) * k) / n;
    const open = !deckGap(q, s);
    if (open && from === null) from = s;
    if ((!open || k === n) && from !== null) {
      if (s - from > 0.05) out.push([from, s]);
      from = null;
    }
  }
  return out;
}

/** Within [s0, s1], the stretches with a sound wall on side q (viadress.ts) */
function wallRuns(q: 1 | -1, s0: number, s1: number): [number, number][] {
  return splitBy(s0, s1, (s) => soundWall(q, s));
}
/** ...and without one (where the rail runs along the parapet's top) */
function railRuns(q: 1 | -1, s0: number, s1: number): [number, number][] {
  return splitBy(s0, s1, (s) => !soundWall(q, s));
}
function splitBy(s0: number, s1: number, keep: (s: number) => boolean): [number, number][] {
  const out: [number, number][] = [];
  const n = Math.max(1, Math.ceil((s1 - s0) / 0.5));
  let from: number | null = null;
  for (let k = 0; k <= n; k++) {
    const s = s0 + ((s1 - s0) * k) / n;
    const on = keep(s);
    if (on && from === null) from = s;
    if ((!on || k === n) && from !== null) {
      if (s - from > 0.05) out.push([from, s]);
      from = null;
    }
  }
  return out;
}

/* ---------- Phase 4: the signs, under the deck ---------- */

/** The sign atlas: each exit's advance panel and its exit panel (a row each), then the on-ramps' sign */
const SIGN_ROWS = EXIT_SIGNS.length * 2 + 1;
const ROW_H = 96;
const SIGN_TEX = canvasTex(1024, SIGN_ROWS * ROW_H, (c) => {
  const green = '#1d6b40';
  const row = (i: number, draw: (y: number) => void) => {
    const y = i * ROW_H;
    c.fillStyle = green;
    c.fillRect(0, y, 1024, ROW_H);
    c.strokeStyle = '#f2f0ea';
    c.lineWidth = 5;
    c.strokeRect(8, y + 8, 1008, ROW_H - 16);
    draw(y);
  };
  const fit = (text: string, max: number, size: number) => {
    c.font = `800 ${size}px ${FONT_DISPLAY}`;
    const w = c.measureText(text).width;
    if (w > max) c.font = `800 ${Math.floor((size * max) / w)}px ${FONT_DISPLAY}`;
  };
  EXIT_SIGNS.forEach((e, k) => {
    // Advance: the exit's number on a yellow tab, its names
    row(k * 2, (y) => {
      c.fillStyle = '#f2c230';
      c.fillRect(24, y + 20, 150, ROW_H - 40);
      c.fillStyle = '#17161c';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      fit(`EXIT ${e.n}`, 130, 40);
      c.fillText(`EXIT ${e.n}`, 99, y + ROW_H / 2 + 2);
      c.fillStyle = '#f2f0ea';
      c.textAlign = 'left';
      fit(e.name.toUpperCase(), 800, 50);
      c.fillText(e.name.toUpperCase(), 200, y + ROW_H / 2 + 3);
    });
    // Where it leaves: EXIT n and an arrow up and to the side
    row(k * 2 + 1, (y) => {
      c.fillStyle = '#f2f0ea';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      fit(`EXIT ${e.n}`, 600, 60);
      c.fillText(`EXIT ${e.n}`, 420, y + ROW_H / 2 + 3);
      c.lineWidth = 10;
      c.strokeStyle = '#f2f0ea';
      c.beginPath();
      c.moveTo(800, y + 74);
      c.lineTo(870, y + 22);
      c.moveTo(830, y + 22);
      c.lineTo(870, y + 22);
      c.lineTo(870, y + 60);
      c.stroke();
    });
  });
  row(SIGN_ROWS - 1, (y) => {
    c.fillStyle = '#f2f0ea';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fit('RING HIGHWAY', 900, 58);
    c.fillText('RING HIGHWAY', 512, y + ROW_H / 2 + 3);
  });
});
const SIGN_MAT = siteMat('viaduct-signs', lit(new THREE.MeshBasicMaterial({ map: SIGN_TEX, toneMapped: true }), 0.95, 1.15));
/** A sign facing n (x, z) from the atlas's row, its middle at (x, y, z), w by h */
function sign(b: Batch, row: number, x: number, y: number, z: number, n: Pt, w: number, h: number) {
  const g = new THREE.PlaneGeometry(w, h);
  const [v0, v1] = [1 - (row + 1) / SIGN_ROWS + 0.002, 1 - row / SIGN_ROWS - 0.002];
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, v1, 1, v1, 0, v0, 1, v0], 2));
  b.add(g.rotateY(Math.atan2(n[0], n[1])).translate(x, y, z), SIGN_MAT);
}
/** The murals' atlas: a row each of made-up words in spray colours on a pale ground */
const MURAL_TEX = canvasTex(512, MURAL_ART.length * 64, (c) => {
  const cols = ['#e2463b', '#2f8fd6', '#f2c230', '#36b37e', '#c04fd6', '#ff7a2f', '#3fc9c9', ROAD.zebra];
  MURAL_ART.forEach((text, i) => {
    const y = i * 64;
    c.fillStyle = ['#2a2838', '#3a3156', '#2c3b4a', '#41302e'][i % 4];
    c.fillRect(0, y, 512, 64);
    for (let k = 0; k < 6; k++) {
      c.fillStyle = cols[(i + k) % cols.length] + '88';
      c.beginPath();
      c.arc(40 + k * 90, y + 32 + ((k * 13) % 20) - 10, 26 + ((k * 7) % 12), 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = cols[i % cols.length];
    c.strokeStyle = '#111';
    c.lineWidth = 4;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `900 ${text.length > 12 ? 34 : 42}px ${FONT_DISPLAY}`;
    c.strokeText(text, 256, y + 34);
    c.fillText(text, 256, y + 34);
  });
});
const MURAL_MAT = siteMat('viaduct-murals', lit(new THREE.MeshBasicMaterial({ map: MURAL_TEX, toneMapped: true }), 0.85, 0.7));

/** A gantry over its carriageway: posts on the median barrier and the parapet, a truss beam, the panel facing its traffic */
function gantry(b: Batch, g: Gantry, m: { steel: THREE.Material; back: THREE.Material }) {
  const r = ringAt(g.s);
  const [p0, p1] = [ringPoint(g.s, g.q * 0.15), ringPoint(g.s, g.q * (DECK_HALF - 0.15))];
  for (const [x, z] of [p0, p1]) b.box(x - 0.11, DECK_Y + 0.4, z - 0.11, 0.22, GANTRY.top - 0.4, 0.22, m.steel);
  // The beam: two chords and the ties between, across the carriageway
  for (const dy of [GANTRY.under + GANTRY.panel.h + 0.05, GANTRY.top - 0.15]) b.add(ringBox(g.s - g.dir * 0.2, g.q * (DECK_HALF / 2), DECK_Y + dy, 0.12, DECK_HALF - 0.1, 0.12), m.steel);
  const pan = gantryPanel(g);
  // (facing the traffic coming: against the way it runs)
  const face: Pt = [-r.tx * g.dir, -r.tz * g.dir];
  const row = EXIT_SIGNS.findIndex((e) => e.n === g.exit) * 2 + (g.kind === 'exit' ? 1 : 0);
  const [fx, fz] = [pan.x + face[0] * 0.03, pan.z + face[1] * 0.03];
  b.add(ringBox(g.s, g.q * (OUTER_LANE - 0.8), pan.y - GANTRY.panel.h / 2, 0.05, GANTRY.panel.w, GANTRY.panel.h), m.back);
  sign(b, row, fx, pan.y, fz, face, GANTRY.panel.w, GANTRY.panel.h);
}

/** A shape drawn in the ring's frame at s (its x along the ring from s, its y up), extruded `across` either side of o */
function ringShape(s: number, o: number, y: number, shape: THREE.Shape, across: number) {
  const r = ringAt(s);
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(r.tx, 0, r.tz), new THREE.Vector3(0, 1, 0), new THREE.Vector3(r.nx, 0, r.nz));
  return new THREE.ExtrudeGeometry(shape, { depth: across, bevelEnabled: false, curveSegments: 8 })
    .translate(0, y, o - across / 2)
    .applyMatrix4(m)
    .translate(r.x, 0, r.z);
}
/** A skate spot under the deck by Endswood (viadress.ts `skateParts()`): smooth concrete, a ledge with a steel edge, a
 * manual pad, a flat rail, a quarter pipe at the far end with its coping, tags on the ledge and the pipe's back */
function skate(b: Batch, fx: Batch, u: Under, m: Record<'steel' | 'smooth' | 'concrete' | 'paint' | 'joint', THREE.Material>, low: boolean) {
  const Y = 0.03;
  b.add(band(-3.4, 3.4, u.s0 + 0.6, u.s1, Y), m.smooth);
  // (the map polish plan's Phase 3: the slab's joints every 2, a painted kerb along the ledge's top edge and the pad's,
  // more tags; it was grey on grey)
  for (let s = u.s0 + 2.6; s < u.s1 - 2; s += 2) b.add(band(-3.4, 3.4, s - 0.025, s + 0.025, Y + 0.006), m.joint);
  for (const o of [-3.35, 3.35]) b.add(band(o - 0.05, o + 0.05, u.s0 + 0.6, u.s1, Y + 0.006), m.paint);
  if (!low)
    for (const [k, sa] of [u.s0 + 6.2, (u.s0 + u.s1) / 2 - 1.4].entries()) {
      const r = ringAt(sa);
      const [x, z] = ringPoint(sa, -1.4);
      tag(fx, 13 + k * 17, 1.0, [r.nx, r.nz], x, Y + 0.012, z, Math.PI / 2);
    }
  for (const p of skateParts(u)) {
    const [sm, om] = [(p.s0 + p.s1) / 2, (p.o0 + p.o1) / 2];
    if (p.kind === 'ledge' || p.kind === 'pad') {
      b.add(ringBox(sm, om, Y, p.s1 - p.s0, p.o1 - p.o0, p.h), m.concrete);
      if (p.kind === 'ledge') b.add(ringBox(sm, p.o0 + 0.03, Y + p.h - 0.04, p.s1 - p.s0 + 0.01, 0.07, 0.05), m.steel);
      // (its long face painted yellow at the foot, where the boards scuff it)
      b.add(ringBox(sm, p.o1 + 0.006, Y, p.s1 - p.s0, 0.012, 0.12), m.paint);
      if (p.kind === 'ledge') {
        const r = ringAt(sm);
        const [x, z] = ringPoint(sm, p.o0 - 0.012);
        tag(fx, 5, 0.9, [-r.nx, -r.nz], x, Y + p.h / 2, z);
      }
    } else if (p.kind === 'rail') {
      for (const at of [p.s0 + 0.2, p.s1 - 0.2]) b.add(ringBox(at, om, Y, 0.06, 0.06, p.h), m.steel);
      b.add(ringBox(sm, om, Y + p.h - 0.06, p.s1 - p.s0, 0.08, 0.06), m.steel);
    } else {
      // (its curve rising towards the far end: a quarter circle up to its deck, then straight down at the back)
      const R = p.h;
      const len = p.s1 - p.s0;
      const sh = new THREE.Shape();
      sh.moveTo(0, 0);
      for (let k = 1; k <= 8; k++) {
        const a = (k / 8) * (Math.PI / 2);
        sh.lineTo(R * Math.sin(a), R - R * Math.cos(a));
      }
      sh.lineTo(len, R);
      sh.lineTo(len, 0);
      sh.lineTo(0, 0);
      b.add(ringShape(p.s0, om, Y, sh, p.o1 - p.o0), m.concrete);
      b.add(ringBox(p.s0 + R, om, Y + R - 0.02, 0.08, p.o1 - p.o0, 0.08), m.steel);
      // (its deck's top painted, a yellow line along the coping)
      b.add(ringBox(p.s0 + R + 0.12, om, Y + R, 0.06, p.o1 - p.o0, 0.012), m.paint);
      const r = ringAt(p.s1);
      const [x, z] = ringPoint(p.s1 + 0.012, om + 1.2);
      tag(fx, 9, 1.0, [r.tx, r.tz], x, Y + R / 2, z);
    }
  }
}

/** Under the deck between two piers: a car park's bays, lock-ups, or a court (its hoop at the far end) */
/**
 * A lock-up (the map polish plan's Phase 3: they were beige boxes with a blank cream slab): its walls in one of a few
 * paints, a felt cap over its roof, a concrete frame round its roller door, the door's slats near, its number plate and
 * a padlock; one in six left half up, the dark inside under it; bills or a tag on some
 */
const LOCKUP_PAINT = ['#8a7f6a', '#6f7a86', '#7d4a3a', '#5f6e58', '#9a9182'].map((c) => toon(c));
const LOCKUP_DOOR = ['#c9c5b8', '#9aa3ad', '#b9a27a', '#7f8c7a'].map((c) => toon(c));
const LM = { felt: toon('#2c2a33'), frame: toon('#b9b3a6'), inside: toon('#141218'), plate: toon('#f3f0e6'), slat: toon('#8d897e'), lock: toon('#d6a12a') };
function lockup(b: Batch, fx: Batch, s: number, q: number, seed: number, low: boolean) {
  const Y = 0.03;
  const h = (k: number) => (((Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453) % 1) + 1) % 1;
  const { w, d, h: H, from } = LOCKUP;
  b.add(ringBox(s, q * (from + d / 2), Y, w, d, H), LOCKUP_PAINT[Math.floor(h(1) * LOCKUP_PAINT.length)]);
  b.add(ringBox(s, q * (from + d / 2), Y + H, w + 0.14, d + 0.14, 0.08), LM.felt);
  const face = q * (from + d);
  const [dw, dh] = [w - 0.5, H - 0.45];
  // (the frame: two jambs and a lintel standing off the face)
  for (const e of [-1, 1]) b.add(ringBox(s + e * (dw / 2 + 0.08), face + q * 0.04, Y, 0.16, 0.08, dh + 0.12), LM.frame);
  b.add(ringBox(s, face + q * 0.04, Y + dh + 0.05, dw + 0.32, 0.08, 0.16), LM.frame);
  const open = h(2) < 1 / 6;
  const top = open ? dh * 0.55 : 0;
  const door = LOCKUP_DOOR[Math.floor(h(3) * LOCKUP_DOOR.length)];
  b.add(ringBox(s, face + q * 0.01, Y + 0.05 + top, dw, 0.02, dh - top), door);
  // (the dark inside under a half-up door: a panel just proud of the face, the door's opening)
  if (open) b.add(ringBox(s, face + q * 0.005, Y + 0.02, dw, 0.006, top + 0.06), LM.inside);
  // (its number up on the lintel; the slats and the padlock up close)
  b.add(ringBox(s + dw / 2 - 0.25, face + q * 0.085, Y + dh + 0.08, 0.3, 0.01, 0.1), LM.plate);
  if (!low)
    b.detail(() => {
      for (let y = top + 0.2; y < dh - 0.05; y += 0.2) b.add(ringBox(s, face + q * 0.025, Y + 0.05 + y, dw, 0.012, 0.025), LM.slat);
      if (!open) b.add(ringBox(s, face + q * 0.03, Y + 0.12, 0.08, 0.03, 0.1), LM.lock);
    });
  // (bills or a tag on some: grime.ts's atlases, on the door's face)
  const r = ringAt(s);
  const n: Pt = [r.nx * q, r.nz * q];
  if (h(4) < 0.35) {
    const [x, z] = ringPoint(s - dw * 0.2, face + q * 0.03);
    tag(fx, Math.floor(h(5) * 97), 1.1, n, x, Y + 0.7 + top, z);
  } else if (h(4) < 0.55) {
    const [x, z] = ringPoint(s + dw * 0.25, face + q * 0.03);
    poster(fx, Math.floor(h(6) * 97), 0.9, n, x, Y + 1.2, z);
  }
}
/**
 * The ground under the deck where something stands on it (the map polish plan's Phase 3, the blend plan's Phase 9):
 * worn gravel a little wider than the deck, its edges and ends wandering, not a ruler-straight slab on the grass
 */
function underGravel(b: Batch, u: Under, m: THREE.Material) {
  const [s0, s1] = [u.s0 - 1.4, u.s1 + 1.4];
  const n = Math.max(2, Math.ceil((s1 - s0) / 1.2));
  const wob = (k: number, e: number) => Math.sin(u.s0 * 3.1 + k * 1.7 + e * 4.4) * 0.35 + Math.sin(k * 0.61 + e * 2.3 + u.s1) * 0.25;
  const pos: number[] = [];
  const y = 0.022;
  for (let k = 0; k < n; k++) {
    const [sa, sb] = [s0 + ((s1 - s0) * k) / n, s0 + ((s1 - s0) * (k + 1)) / n];
    // (the ends taper in: the first and last steps narrower)
    const taper = (j: number) => (j === 0 || j === n ? 0.55 : 1);
    const edge = (j: number, e: number) => e * (DECK_HALF + 0.7 + wob(j, e)) * taper(j);
    const v = [ringPoint(sa, edge(k, -1)), ringPoint(sa, edge(k, 1)), ringPoint(sb, edge(k + 1, 1)), ringPoint(sb, edge(k + 1, -1))].map(([x, z]) => new THREE.Vector3(x, y, z));
    const nn = new THREE.Vector3().subVectors(v[1], v[0]).cross(new THREE.Vector3().subVectors(v[3], v[0]));
    const quad = nn.y >= 0 ? [v[0], v[1], v[2], v[0], v[2], v[3]] : [v[0], v[2], v[1], v[0], v[3], v[2]];
    for (const w of quad) pos.push(w.x, w.y, w.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  g.setIndex([...Array(pos.length / 3).keys()]);
  b.add(g, m);
}
function under(b: Batch, fx: Batch, u: Under, m: Record<'asphalt' | 'white' | 'yellow' | 'steel' | 'court' | 'board', THREE.Material>, low: boolean) {
  const Y = 0.03;
  if (u.kind === 'park') {
    b.add(band(-(DECK_HALF - 0.3), DECK_HALF - 0.3, u.s0, u.s1, Y), m.asphalt);
    const n = Math.floor((u.s1 - u.s0) / BAY.len);
    for (const q of [-1, 1]) {
      for (let k = 0; k <= n; k++) {
        const s = u.s0 + (k * (u.s1 - u.s0)) / n;
        b.add(band(q > 0 ? 1.5 : -4.2, q > 0 ? 4.2 : -1.5, s - 0.05, s + 0.05, Y + 0.006), m.white);
      }
      b.add(band(q * 1.5 - 0.05, q * 1.5 + 0.05, u.s0, u.s1, Y + 0.006), m.white);
    }
  } else if (u.kind === 'store') {
    b.add(band(-(DECK_HALF - 0.3), DECK_HALF - 0.3, u.s0, u.s1, Y), m.asphalt);
    const n = Math.floor((u.s1 - u.s0) / (LOCKUP.w + 0.2));
    for (let k = 0; k < n; k++)
      for (const q of [-1, 1]) {
        lockup(b, fx, u.s0 + (k + 0.5) * ((u.s1 - u.s0) / n), q, Math.floor(u.s0 * 7.31) + k * 2 + (q + 1) / 2, low);
      }
  } else {
    // A half court: its asphalt in court green, the lines, a hoop on a post at the far end
    b.add(band(-4, 4, u.s0, u.s1, Y), m.court);
    const line = (a0: number, a1: number, s0: number, s1: number) => b.add(band(a0, a1, s0, s1, Y + 0.006), m.white);
    line(-4, -3.9, u.s0, u.s1);
    line(3.9, 4, u.s0, u.s1);
    line(-4, 4, u.s0, u.s0 + 0.1);
    line(-4, 4, u.s1 - 0.1, u.s1);
    line(-1.5, 1.5, u.s1 - 4.8, u.s1 - 4.7);
    line(-1.55, -1.45, u.s1 - 4.8, u.s1);
    line(1.45, 1.55, u.s1 - 4.8, u.s1);
    b.add(ringBox(u.s1 - 0.6, 0, Y, 0.16, 0.16, 2.3), m.steel);
    b.add(ringBox(u.s1 - 0.85, 0, Y + 1.85, 0.05, 1.4, 0.85), m.board);
    b.add(ringBox(u.s1 - 1.15, 0, Y + 2.0, 0.45, 0.45, 0.03), m.yellow);
  }
}

/** Triangles for a quad (corners in order round it), wound to face `want` */
function quad(pos: number[], v: THREE.Vector3[], want: THREE.Vector3) {
  const n = new THREE.Vector3().subVectors(v[1], v[0]).cross(new THREE.Vector3().subVectors(v[3], v[0]));
  const q = n.dot(want) >= 0 ? [v[0], v[1], v[2], v[0], v[2], v[3]] : [v[0], v[2], v[1], v[0], v[3], v[2]];
  for (const w of q) pos.push(w.x, w.y, w.z);
}
const geo = (pos: number[]) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
};
/** A ramp's road over the ground at a point (its asphalt a hair over the deck's where it runs onto it) */
const RAMP_UP = 0.04;
/** How deep a ramp's deck is where it stands on piers (lower, a filled bank between walls down to the ground) */
const RAMP_DEPTH = 0.55;
const FILL = RAMP_PIER.from - 0.4;

/** A piece of a ramp (its points from i0 to i1) into a Batch: its deck, asphalt, edge lines, parapets */
function rampPiece(b: Batch, r: Ramp, i0: number, i1: number, m: { concrete: THREE.Material; asphalt: THREE.Material; white: THREE.Material; pier: THREE.Material }) {
  const segs = rampSegs(r).filter((sg) => sg.k > i0 && sg.k <= i1);
  const P = (i: number, o: number, y: number) => {
    const [a, c] = [r.pts[Math.max(0, i - 1)], r.pts[Math.min(r.pts.length - 1, i + 1)]];
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
    const [nx, nz] = [-(c[1] - a[1]) / l, (c[0] - a[0]) / l];
    return new THREE.Vector3(r.pts[i][0] + nx * o, y, r.pts[i][1] + nz * o);
  };
  const UPV = new THREE.Vector3(0, 1, 0);
  const DOWN = new THREE.Vector3(0, -1, 0);
  const road: number[] = [];
  const body: number[] = [];
  const lines: number[] = [];
  for (const sg of segs) {
    if (sg.foot) continue;
    const [i, j] = [sg.k - 1, sg.k];
    const [yi, yj] = [r.ys[i], r.ys[j]];
    const top = (k: number) => r.ys[k] + RAMP_UP;
    const bot = (k: number) => (r.ys[k] < FILL ? -0.05 : r.ys[k] - RAMP_DEPTH);
    const mid: Pt = [(sg.a[0] + sg.b[0]) / 2, (sg.a[1] + sg.b[1]) / 2];
    const overDeck = fromHighway(mid[0], mid[1]) < DECK_HALF;
    // The asphalt, and its edge lines (not where it's joining the deck: the lane runs on)
    quad(road, [P(i, -RAMP_HALF, top(i)), P(i, RAMP_HALF, top(i)), P(j, RAMP_HALF, top(j)), P(j, -RAMP_HALF, top(j))], UPV);
    if (!overDeck)
      for (const sd of [-1, 1]) {
        const w = sd * (RAMP_PARAPET.in - 0.25);
        quad(lines, [P(i, w - 0.05, top(i) + 0.008), P(i, w + 0.05, top(i) + 0.008), P(j, w + 0.05, top(j) + 0.008), P(j, w - 0.05, top(j) + 0.008)], UPV);
      }
    // Its body: the sides down to its underside (or the ground), the underside where it's up on piers; none over the deck
    if (!overDeck) {
      for (const sd of [-1, 1]) {
        const w = sd * RAMP_HALF;
        const pi = P(i, w, 0);
        // (not its side against the deck's own edge, where it runs alongside)
        if (fromHighway(pi.x, pi.z) < DECK_HALF + 0.05) continue;
        const out = new THREE.Vector3().subVectors(P(i, w, 0), P(i, 0, 0));
        quad(body, [P(i, w, top(i) - 0.01), P(j, w, top(j) - 0.01), P(j, w, bot(j)), P(i, w, bot(i))], out);
      }
      if (yi >= FILL || yj >= FILL) quad(body, [P(i, -RAMP_HALF, bot(i)), P(i, RAMP_HALF, bot(i)), P(j, RAMP_HALF, bot(j)), P(j, -RAMP_HALF, bot(j))], DOWN);
    }
    // The parapets: a low concrete wall each side where rampSegs() puts one
    for (const [sd, on] of [
      [1, sg.left],
      [-1, sg.right],
    ] as const) {
      if (!on) continue;
      const [a, c] = [sd * RAMP_PARAPET.in, sd * RAMP_PARAPET.out];
      const h = PARAPET;
      const inward = new THREE.Vector3().subVectors(P(i, -sd, 0), P(i, 0, 0));
      const outward = inward.clone().negate();
      quad(body, [P(i, a, top(i) - 0.01), P(j, a, top(j) - 0.01), P(j, a, top(j) + h), P(i, a, top(i) + h)], inward);
      quad(body, [P(i, c, bot(i)), P(j, c, bot(j)), P(j, c, top(j) + h), P(i, c, top(i) + h)], outward);
      quad(body, [P(i, a, top(i) + h), P(i, c, top(i) + h), P(j, c, top(j) + h), P(j, a, top(j) + h)], UPV);
    }
  }
  if (road.length) b.add(geo(road), m.asphalt);
  if (body.length) b.add(geo(body), m.concrete);
  if (lines.length) b.add(geo(lines), m.white);
  // Its piers in this piece: a square column under its centre line, a cap under the deck
  for (const [x, z, y] of RAMP_PIERS) {
    const k = r.pts.findIndex((p) => p[0] === x && p[1] === z);
    if (k < i0 || k > i1) continue;
    const h = RAMP_PIER.half;
    b.box(x - h, -0.05, z - h, h * 2, y - RAMP_DEPTH + 0.05, h * 2, m.pier);
  }
}

export function register({ low, scene }: { low: boolean; scene: THREE.Scene | null }) {
  const concrete = toon('#c9c5d6');
  const pier = toon('#bdb9cb');
  const asphalt = toon('#2c2a3a');
  const white = toon(ROAD.line);
  const yellow = toon('#e8c65a');
  const steel = toon('#7e7b90');
  const joint = toon('#55526a');
  const bearing = toon('#3b3950');
  const wallPanel = toon('#a9a6b8');
  const wallCap = toon('#8c889e');

  const n = Math.ceil(RING_LEN / STRETCH);
  const len = RING_LEN / n;
  for (let k = 0; k < n; k++) {
    const [s0, s1] = [k * len, (k + 1) * len];
    const corners = [ringPoint(s0, -DECK_HALF - 2), ringPoint(s0, DECK_HALF + 2), ringPoint(s1, -DECK_HALF - 2), ringPoint(s1, DECK_HALF + 2), ringPoint((s0 + s1) / 2, DECK_HALF + 2), ringPoint((s0 + s1) / 2, -DECK_HALF - 2)];
    const rect: [number, number, number, number] = [Math.min(...corners.map((c) => c[0])), Math.min(...corners.map((c) => c[1])), Math.max(...corners.map((c) => c[0])), Math.max(...corners.map((c) => c[1]))];
    const piers = PIERS.map((p, i) => ({ ...p, i })).filter((p) => p.s >= s0 && p.s < s1);
    site(`viaduct ${k}`, rect, (into) => {
      const b = new Batch();
      // The box girder: wings, webs, soffit (its top is the asphalt and the parapets)
      const g = sweep(SECTION, s0, s1, [0, DECK_Y - GIRDER / 2]);
      b.add(g, concrete);
      // The asphalt, both carriageways and the median between, and the parapets either side
      b.add(band(-HIGHWAY_HALF, HIGHWAY_HALF, s0, s1, DECK_Y + ROAD_UP), asphalt);
      // (open where a ramp tapers in or out: viaground.ts deckGap)
      for (const side of [1, -1] as const)
        for (const [a0, a1] of openRuns(side, s0, s1)) {
          const sec = PARAPET_SECTION.map(([o, y]): Pt => [o * side, y]);
          b.add(sweep(sec, a0, a1, [side * (HIGHWAY_HALF + 0.2), DECK_Y + 0.2]), concrete);
        }
      b.add(sweep(BARRIER_SECTION, s0, s1, [0, DECK_Y + 0.05]), concrete);
      // The lines: solid along both edges and the median, dashes between the lanes (near only: thin, and many)
      for (const side of [1, -1]) {
        b.add(band(side * (EDGE_AT - 0.06), side * (EDGE_AT + 0.06), s0, s1, DECK_Y + LINE_UP), white);
        b.add(band(side * (INNER_AT - 0.05), side * (INNER_AT + 0.05), s0, s1, DECK_Y + LINE_UP), yellow);
      }
      b.detail(() => {
        for (const side of [1, -1])
          for (let d = Math.ceil(s0 / 3) * 3; d < s1; d += 3) b.add(band(side * DASH_AT - 0.06, side * DASH_AT + 0.06, d, Math.min(d + 1.2, s1), DECK_Y + LINE_UP), white);
        // The rail along each parapet's top on posts
        for (const side of [1, -1] as const) {
          const o = side * (DECK_HALF - 0.09);
          for (const [a0, a1] of openRuns(side, s0, s1).flatMap(([x0, x1]) => railRuns(side, x0, x1))) {
            b.add(sweep([[o - 0.04, DECK_Y + PARAPET + 0.3], [o + 0.04, DECK_Y + PARAPET + 0.3], [o + 0.04, DECK_Y + PARAPET + 0.36], [o - 0.04, DECK_Y + PARAPET + 0.36]], a0, a1, [o, DECK_Y + PARAPET + 0.33], true), steel);
            for (let d = Math.ceil(a0 / 2.5) * 2.5; d < a1; d += 2.5) b.add(ringBox(d, o, DECK_Y + PARAPET, 0.06, 0.06, 0.32), steel);
          }
        }
      });
      // The sound walls past homes (viadress.ts): panels on the parapet between steel posts
      for (const side of [1, -1] as const)
        for (const [a0, a1] of openRuns(side, s0, s1)) {
          const runs = wallRuns(side, a0, a1);
          for (const [w0, w1] of runs) {
            const o = side * (DECK_HALF - 0.14);
            const [y0, y1] = [DECK_Y + PARAPET, DECK_Y + SOUND_WALL.top];
            b.add(sweep([[o - 0.06, y0], [o + 0.06, y0], [o + 0.06, y1], [o - 0.06, y1]], w0, w1, [o, (y0 + y1) / 2], true), wallPanel);
            b.add(sweep([[o - 0.08, y1 - 0.25], [o + 0.08, y1 - 0.25], [o + 0.08, y1], [o - 0.08, y1]], w0, w1, [o, y1 - 0.12], true), wallCap);
            for (let d = Math.ceil(w0 / 3) * 3; d < w1; d += 3) b.add(ringBox(d, o, DECK_Y + PARAPET - 0.02, 0.18, 0.2, SOUND_WALL.top - PARAPET + 0.1), steel);
          }
        }
      // The piers: a stem with its corners cut, the hammerhead flaring out under the soffit, bearings on it, and an
      // expansion joint across the deck over every few
      for (const p of piers) {
        const [x, z] = p.at;
        // (from the river's bed, or its bank's slope, where it stands in the channel)
        const foot = inChannel(x, z) ? Math.min(shoreY(x, z), WATER_Y) - 0.4 : -0.05;
        const head = 0.9;
        const top = DECK_Y - GIRDER - 0.12;
        const cut = 0.25;
        b.add(ringBox(p.s, 0, foot, PIER.along, PIER.across - 2 * cut, top - head - foot), pier);
        b.add(ringBox(p.s, 0, foot, PIER.along - 2 * cut, PIER.across, top - head - foot), pier);
        // The head: a wedge across, from the stem's width up to the soffit's
        const w0 = PIER.across;
        const w1 = 2 * (DECK_HALF - WEB) + 0.3;
        const hd = new THREE.BufferGeometry();
        const r = ringAt(p.s);
        const corner = (u: number, o: number, y: number) => {
          const [cx, cz] = ringPoint(p.s, o);
          return [cx + r.tx * u, y, cz + r.tz * u];
        };
        const A = PIER.along / 2;
        const yb = top - head;
        const v = [corner(-A, -w0 / 2, yb), corner(A, -w0 / 2, yb), corner(A, w0 / 2, yb), corner(-A, w0 / 2, yb), corner(-A, -w1 / 2, top), corner(A, -w1 / 2, top), corner(A, w1 / 2, top), corner(-A, w1 / 2, top)];
        const faces = [
          [0, 1, 2, 3],
          [4, 7, 6, 5],
          [0, 4, 5, 1],
          [1, 5, 6, 2],
          [2, 6, 7, 3],
          [3, 7, 4, 0],
        ];
        const pos: number[] = [];
        const c = [r.x, (yb + top) / 2, r.z];
        for (const f of faces) {
          const [a, bq, cq, d] = f.map((i) => new THREE.Vector3(...(v[i] as [number, number, number])));
          const nn = new THREE.Vector3().subVectors(bq, a).cross(new THREE.Vector3().subVectors(d, a));
          const mid = a.clone().add(cq).multiplyScalar(0.5);
          const out = mid.sub(new THREE.Vector3(c[0], c[1], c[2]));
          const quad = nn.dot(out) >= 0 ? [a, bq, cq, a, cq, d] : [a, cq, bq, a, d, cq];
          for (const w of quad) pos.push(w.x, w.y, w.z);
        }
        hd.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        hd.computeVertexNormals();
        b.add(hd, pier);
        // (at every distance, and up into the girder by 5 mm: near only, the deck floated 12 cm over its piers from afar)
        for (const o of [-(DECK_HALF - WEB) + 0.5, DECK_HALF - WEB - 0.5]) b.add(ringBox(p.s, o, top, 0.5, 0.5, 0.125), bearing);
        if (p.i % JOINT_EVERY === 0) b.add(ringBox(p.s, 0, DECK_Y + ROAD_UP, 0.12, 2 * HIGHWAY_HALF - 0.02, 0.005), joint);
      }
      b.build(into, { cast: true, receive: true });
    });
  }
  // Phase 4: the gantries, the on-ramps' signs, under the deck (car parks, lock-ups, courts), the murals, the lights
  const sm = { steel: toon('#4a5563'), back: toon('#3b4a52') };
  for (const g of GANTRIES) {
    const [x, z] = ringPoint(g.s, 0);
    site(`viaduct gantry ${g.id}`, [x - DECK_HALF - 1, z - DECK_HALF - 1, x + DECK_HALF + 1, z + DECK_HALF + 1], (into) => {
      const b = new Batch();
      gantry(b, g, sm);
      b.build(into, { cast: true, receive: true });
    });
  }
  RAMP_SIGNS.forEach((rs, i) =>
    site(`viaduct ramp sign ${i}`, [rs.at[0] - 2, rs.at[1] - 2, rs.at[0] + 2, rs.at[1] + 2], (into) => {
      const b = new Batch();
      for (const k of [-1, 1]) b.box(rs.at[0] + rs.face[1] * k * 1.1 - 0.05, 0, rs.at[1] - rs.face[0] * k * 1.1 - 0.05, 0.1, 2.2, 0.1, sm.steel);
      sign(b, SIGN_ROWS - 1, rs.at[0] + rs.face[0] * 0.07, 1.8, rs.at[1] + rs.face[1] * 0.07, rs.face, 2.4, 0.6);
      b.build(into, { cast: true, receive: true });
    })
  );
  const SKATE_SMOOTH = toon('#9c99a6');
  const SKATE_CONCRETE = toon('#c4bfb2');
  const SKATE_PAINT = toon('#d6a12a');
  const SKATE_JOINT = toon('#7d7a88');
  const um = { asphalt, white, yellow, steel: sm.steel, court: toon('#3f6b56'), board: toon(ROAD.zebra) };
  const gravel = toon(STONE.gravel);
  UNDER.forEach((u, i) => {
    const pts = [ringPoint(u.s0, -DECK_HALF), ringPoint(u.s0, DECK_HALF), ringPoint(u.s1, -DECK_HALF), ringPoint(u.s1, DECK_HALF)];
    site(`viaduct under ${i}`, [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))], (into) => {
      const b = new Batch();
      const fx = new Batch();
      underGravel(b, u, gravel);
      if (u.kind === 'skate') skate(b, fx, u, { steel: sm.steel, smooth: SKATE_SMOOTH, concrete: SKATE_CONCRETE, paint: SKATE_PAINT, joint: SKATE_JOINT }, low);
      else under(b, fx, u, um, low);
      b.build(into, { cast: false, receive: true });
      buildFx(fx, into);
    });
  });
  MURALS.forEach((mu, i) =>
    site(`viaduct mural ${i}`, [mu.at[0] - 2, mu.at[1] - 2, mu.at[0] + 2, mu.at[1] + 2], (into) => {
      const b = new Batch();
      const r = ringAt(mu.s);
      const n: Pt = [r.tx * mu.face, r.tz * mu.face];
      const g = new THREE.PlaneGeometry(1.6, 1.4);
      const row = mu.art;
      const [v0, v1] = [1 - (row + 1) / MURAL_ART.length + 0.004, 1 - row / MURAL_ART.length - 0.004];
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, v1, 1, v1, 0, v0, 1, v0], 2));
      b.add(g.rotateY(Math.atan2(n[0], n[1])).translate(mu.at[0] + n[0] * (PIER.along / 2 + 0.012), 0.95, mu.at[1] + n[1] * (PIER.along / 2 + 0.012)), MURAL_MAT);
      b.build(into, { cast: false, receive: true });
    })
  );
  const glow = neon('#fff1c9', 0.25, 1.3);
  UNDER_LIGHTS.forEach(([x, z], i) =>
    site(`viaduct under light ${i}`, [x - 1, z - 1, x + 1, z + 1], (into) => {
      const b = new Batch();
      b.box(x - 0.35, SOFFIT_Y - 0.1, z - 0.15, 0.7, 0.08, 0.3, sm.steel);
      b.box(x - 0.3, SOFFIT_Y - 0.115, z - 0.1, 0.6, 0.015, 0.2, glow);
      b.build(into, { cast: false, receive: true });
    })
  );
  // (the car parks' cars on the main thread, with the city's other parked cars)
  if (scene) parkedCars(scene, 0.03, UNDER_CARS);
  // The exits' ramps: a site every so many of their points
  const PIECE = 14;
  for (const r of RAMPS)
    for (let i0 = 0; i0 < r.pts.length - 1; i0 += PIECE) {
      const i1 = Math.min(r.pts.length - 1, i0 + PIECE);
      const ps = r.pts.slice(i0, i1 + 1);
      const m = RAMP_HALF + 1;
      const rect: [number, number, number, number] = [Math.min(...ps.map((p) => p[0])) - m, Math.min(...ps.map((p) => p[1])) - m, Math.max(...ps.map((p) => p[0])) + m, Math.max(...ps.map((p) => p[1])) + m];
      site(`viaduct ramp ${r.id} ${i0}`, rect, (into) => {
        const b = new Batch();
        rampPiece(b, r, i0, i1, { concrete, asphalt, white, pier });
        b.build(into, { cast: true, receive: true });
      });
    }
  void low;
}
