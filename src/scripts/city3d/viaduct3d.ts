/*
 * The raised ring highway drawn (docs/highway-plan.md Phase 2, the owner's pick: a modern concrete box girder; the
 * numbers are viaduct.ts and viapiers.ts), a district loaded as you approach (districts.ts `LAZY_DISTRICTS` id
 * `viaduct`: its land is the whole ring, so it comes in just after the boot), as sites a stretch of the ring each
 * (tilework.ts): the box girder (a smooth pale deck, its wings cantilevered over sloping webs down to the soffit), the
 * asphalt with its lane lines (dashes between each way's two lanes, solid edge lines, a yellow line along the median),
 * a concrete parapet along each edge with a steel rail on posts, the concrete median barrier, expansion joints across
 * it every few piers, and the hammerhead piers (a slim stem with its corners cut, the head flaring out under the
 * soffit, bearings on it; down into the water over the river). Its lamps stand on the median barrier (viapiers.ts
 * `DECK_LAMPS`, placed at the boot with the town's). Nothing on it is solid but the piers (solids.ts); the camera
 * keeps under or over the deck (`DECK_CAMERA`).
 */
import * as THREE from 'three';
import { Batch, toon } from './kit';
import { site } from './tilework';
import { LANE, MEDIAN } from './layout';
import { HIGHWAY_HALF } from './highway';
import { WATER_Y, inChannel, shoreY } from './river';
import { DECK_HALF, DECK_Y, GIRDER, PARAPET, PIER, RING_LEN, ringAt, ringPoint, type Pt } from './viaduct';
import { BARRIER_TOP, JOINT_EVERY, PIERS } from './viapiers';

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
      for (const side of [1, -1]) {
        const sec = PARAPET_SECTION.map(([o, y]): Pt => [o * side, y]);
        b.add(sweep(sec, s0, s1, [side * (HIGHWAY_HALF + 0.2), DECK_Y + 0.2]), concrete);
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
        for (const side of [1, -1]) {
          const o = side * (DECK_HALF - 0.09);
          b.add(sweep([[o - 0.04, DECK_Y + PARAPET + 0.3], [o + 0.04, DECK_Y + PARAPET + 0.3], [o + 0.04, DECK_Y + PARAPET + 0.36], [o - 0.04, DECK_Y + PARAPET + 0.36]], s0, s1, [o, DECK_Y + PARAPET + 0.33], true), steel);
          for (let d = Math.ceil(s0 / 2.5) * 2.5; d < s1; d += 2.5) b.add(ringBox(d, o, DECK_Y + PARAPET, 0.06, 0.06, 0.32), steel);
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
  void low;
}
