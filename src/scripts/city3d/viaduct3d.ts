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
 * or out, `deckGap()`). Its lamps stand on the median barrier (viapiers.ts
 * `DECK_LAMPS`, placed at the boot with the town's). Nothing on it is solid but the piers (solids.ts); the camera
 * keeps under or over the deck (`DECK_CAMERA`).
 */
import * as THREE from 'three';
import { Batch, toon } from './kit';
import { site } from './tilework';
import { LANE, MEDIAN } from './layout';
import { HIGHWAY_HALF } from './highway';
import { WATER_Y, inChannel, shoreY } from './river';
import { fromHighway } from './highway';
import { DECK_HALF, DECK_Y, GIRDER, PARAPET, PIER, RAMPS, RAMP_HALF, RING_LEN, ringAt, ringPoint, type Pt, type Ramp } from './viaduct';
import { BARRIER_TOP, JOINT_EVERY, PIERS } from './viapiers';
import { RAMP_PARAPET, RAMP_PIER, RAMP_PIERS, deckGap, rampSegs } from './viaground';

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

export function register({ low }: { low: boolean; scene: THREE.Scene | null }) {
  const concrete = toon('#c9c5d6');
  const pier = toon('#bdb9cb');
  const asphalt = toon('#2c2a3a');
  const white = toon('#d9d5ee');
  const yellow = toon('#e8c65a');
  const steel = toon('#7e7b90');
  const joint = toon('#55526a');
  const bearing = toon('#3b3950');

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
          for (const [a0, a1] of openRuns(side, s0, s1)) {
            b.add(sweep([[o - 0.04, DECK_Y + PARAPET + 0.3], [o + 0.04, DECK_Y + PARAPET + 0.3], [o + 0.04, DECK_Y + PARAPET + 0.36], [o - 0.04, DECK_Y + PARAPET + 0.36]], a0, a1, [o, DECK_Y + PARAPET + 0.33], true), steel);
            for (let d = Math.ceil(a0 / 2.5) * 2.5; d < a1; d += 2.5) b.add(ringBox(d, o, DECK_Y + PARAPET, 0.06, 0.06, 0.32), steel);
          }
        }
      });
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
        b.detail(() => {
          for (const o of [-(DECK_HALF - WEB) + 0.5, DECK_HALF - WEB - 0.5]) b.add(ringBox(p.s, o, top, 0.5, 0.5, 0.11), bearing);
        });
        if (p.i % JOINT_EVERY === 0) b.add(ringBox(p.s, 0, DECK_Y + ROAD_UP, 0.12, 2 * HIGHWAY_HALF - 0.02, 0.005), joint);
      }
      b.build(into, { cast: true, receive: true });
    });
  }
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
