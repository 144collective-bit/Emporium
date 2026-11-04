/*
 * Degen's hands, smooth (the owner's call: "smooth the hands design ... in first person they look very basic"):
 * DOM-free, tested in tests/hands.test.ts. For single figures (detail 3 on desktops, 2 on phones) and the
 * first-person hands (body.ts `bakedHand()`); the crowd keeps body.ts's `handParts()`.
 *
 * - `smoothHand()`: the palm and the wrist one smooth loft (`PALM`: rows from inside the cuff down to the
 *   knuckles, narrowing at the wrist, padded at the heel and the ball of the thumb, a hollow in the middle, the
 *   knuckles standing on the back), four tapered fingers (`FINGER`: a swell at each joint, a rounded tip) and the
 *   thumb rising out of its pad, each built indexed with smooth normals; where a finger or the thumb comes out of
 *   the palm its normals are eased onto the palm's (`BLEND`), so the ink outlines draw no seam there.
 * - `gloveParts()`: a glove over it (`GloveKind`: fingerless, full, driving), the hand pushed out along its normals
 *   (`GLOVE.t`), a fingerless one's fingers cut off at the first joint's middle with a rolled hem, a full one's
 *   cuff flared a touch, a driving glove's strap round the wrist.
 *
 * The hand's frame is the skeleton's (skeleton.ts `HAND`): fingers down -y from the knuckles' line, the index at
 * +z, the palm towards -side x. Everything is built for side -1 (the palm +x) and mirrored for side 1.
 */
import * as THREE from 'three';
import { HAND, THUMB_REST, fingerWeigh, step, type BoneName, type Influence } from './skeleton';

/** A geometry with its own weights, one per vertex (non-indexed, in the hand's space) */
export interface HandPart {
  geo: THREE.BufferGeometry;
  skin: Influence[];
}
export type HandLevel = 2 | 3;
export type GloveKind = 'fingerless' | 'full' | 'driving';
export const GLOVE_KINDS: GloveKind[] = ['fingerless', 'full', 'driving'];

/** How fine each level is: points round the palm and a finger, the palm's and a finger's rows apart, the tip's rows */
export const RES: Record<HandLevel, { palm: number; palmStep: number; finger: number; fingerStep: number; tip: number }> = {
  3: { palm: 24, palmStep: 0.006, finger: 10, fingerStep: 0.0045, tip: 3 },
  2: { palm: 16, palmStep: 0.009, finger: 8, fingerStep: 0.0075, tip: 2 },
};

/**
 * The palm's rows, top (inside the cuff) to the knuckles' dome: height, half width (z), how far it reaches to the
 * palm side and to the back (from the fingers' line), the middle's z, squareness (2 an ellipse)
 */
type PalmRow = [y: number, hz: number, palm: number, back: number, cz: number, n: number];
const K = HAND.knuckleY;
export const PALM: PalmRow[] = [
  [0.056, 0.0185, 0.0128, 0.0128, -0.001, 2.2],
  [0.044, 0.019, 0.0126, 0.0125, -0.001, 2.2],
  // The wrist, a little narrower
  [0.031, 0.0198, 0.0122, 0.0118, -0.0005, 2.3],
  // The heel of the hand
  [0.02, 0.0238, 0.013, 0.0113, 0, 2.5],
  [0.01, 0.0279, 0.0134, 0.0108, 0.0005, 2.7],
  [0, 0.0302, 0.013, 0.0104, 0.0005, 2.9],
  [-0.01, 0.0311, 0.0123, 0.0101, 0.0004, 3.1],
  [K + 0.004, 0.0308, 0.0113, 0.0099, 0.0003, 3.1],
  // Rounding over the knuckles, into the fingers
  [K, 0.0292, 0.0101, 0.0094, 0.0002, 3],
  [K - 0.004, 0.0246, 0.0078, 0.0076, 0.0001, 2.8],
  [K - 0.007, 0.0158, 0.0047, 0.0047, 0, 2.5],
  [K - 0.0085, 0.006, 0.0018, 0.0018, 0, 2.2],
];
const PALM_BOTTOM = K - 0.009;

/** The fingers a touch slimmer than the skeleton's (so a relaxed hand's fingers lie together, not through each other) */
export const FINGER = { r: 0.93, root: -0.009, tip: 0.82 };
/** How far out of the palm a finger's normals take the palm's, and how much */
export const BLEND = { reach: 0.0035, most: 0.9 };
/** A glove: how far off the hand, a fingerless one's cut (of the first joint), the hem's roll and the strap's */
export const GLOVE = { t: 0.0011, cut: 0.8, hem: 0.0008, strap: { y0: 0.013, y1: 0.02, t: 0.0019 }, cuff: { y: 0.04, t: 0.0009 } };

const lerp = THREE.MathUtils.lerp;
const ease = (a: number, b: number, t: number) => lerp(a, b, (1 - Math.cos(Math.PI * THREE.MathUtils.clamp(t, 0, 1))) / 2);
/** Catmull-Rom through four values */
const cr = (p0: number, p1: number, p2: number, p3: number, t: number) =>
  0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
const spow = (v: number, e: number) => Math.sign(v) * Math.abs(v) ** e;
const bump = (v: number, at: number, w: number) => Math.exp(-(((v - at) / w) ** 2));

/** The palm's row at a height (smooth through PALM's rows) */
function palmAt(y: number): number[] {
  const R = PALM;
  let i = 0;
  while (i < R.length - 2 && y < R[i + 1][0]) i++;
  const a = R[i];
  const b = R[i + 1];
  const t = THREE.MathUtils.clamp((y - a[0]) / (b[0] - a[0]), 0, 1);
  const pa = R[Math.max(0, i - 1)];
  const pb = R[Math.min(R.length - 1, i + 2)];
  return a.map((_, k) => (k === 0 ? y : cr(pa[k], a[k], b[k], pb[k], t)));
}

/** A point on the palm at height y and angle a round it (0 the palm side, pi/2 the index's): x (palm +), z */
function palmPoint(y: number, a: number): [number, number] {
  const [, hz, palm, back, cz, n] = palmAt(y);
  const c = Math.cos(a);
  const s = Math.sin(a);
  const e = 2 / n;
  const z = cz + hz * spow(s, e);
  let x = (c >= 0 ? palm : back) * spow(c, e);
  if (c > 0) {
    // The ball of the thumb and the heel's other side, a hollow between
    const pad = 0.0042 * bump(z, 0.016, 0.011) * bump(y, 0.011, 0.013) + 0.0019 * bump(z, -0.019, 0.009) * bump(y, 0.008, 0.012) - 0.0013 * bump(z, -0.001, 0.009) * bump(y, -0.004, 0.008);
    x += pad * c;
  } else {
    // The knuckles on the back, each over its finger, and the wrist's bone on the little finger's side
    let k = 0;
    for (const f of HAND.fingers) k += 0.0023 * (f.r / 0.0076) * bump(z, f.z, 0.0042);
    x -= (k * bump(y, K + 0.0015, 0.0042) + 0.0012 * bump(z, -0.016, 0.006) * bump(y, 0.033, 0.006)) * -c;
  }
  return [x, z];
}

/** Rows of rings as one indexed geometry, a point closing each end (rows run down -y-ish; normals outward) */
function tube(rows: THREE.Vector3[][], top: THREE.Vector3, bottom: THREE.Vector3) {
  const N = rows[0].length;
  const pos: number[] = [];
  for (const r of rows) for (const v of r) pos.push(v.x, v.y, v.z);
  const T = rows.length * N;
  pos.push(top.x, top.y, top.z, bottom.x, bottom.y, bottom.z);
  const idx: number[] = [];
  for (let r = 0; r < rows.length - 1; r++)
    for (let k = 0; k < N; k++) {
      const a = r * N + k;
      const b = r * N + ((k + 1) % N);
      const c = (r + 1) * N + k;
      const d = (r + 1) * N + ((k + 1) % N);
      idx.push(a, b, c, b, d, c);
    }
  const L = (rows.length - 1) * N;
  for (let k = 0; k < N; k++) {
    idx.push(T, (k + 1) % N, k);
    idx.push(T + 1, L + k, L + ((k + 1) % N));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Heights from a to b, about `step` apart, both ends in */
function heights(a: number, b: number, step: number) {
  const n = Math.max(1, Math.round(Math.abs(b - a) / step));
  return Array.from({ length: n + 1 }, (_, i) => lerp(a, b, i / n));
}

/** The palm and the wrist, in the side -1 frame */
function palmGeometry(q: HandLevel) {
  const { palm: N, palmStep } = RES[q];
  const ys = heights(PALM[0][0], PALM[PALM.length - 1][0], palmStep);
  // (more rows where it rounds over the knuckles)
  for (const y of [K + 0.002, K - 0.002, K - 0.0055]) if (!ys.some((v) => Math.abs(v - y) < palmStep * 0.3)) ys.push(y);
  ys.sort((a, b) => b - a);
  // (round from the palm side: an even count puts a point on the middle of the back and of the palm)
  const rows = ys.map((y) => Array.from({ length: N }, (_, k) => {
    const [x, z] = palmPoint(y, (k / N) * Math.PI * 2);
    return new THREE.Vector3(x, y, z);
  }));
  return tube(rows, new THREE.Vector3(0, PALM[0][0], PALM[0][4]), new THREE.Vector3(0, PALM_BOTTOM, 0));
}

/** A finger's (or the thumb's) half size along it: keys of (distance from the knuckle, times the radius) */
function digitRows(len: number, r: number, keys: [number, number][], q: HandLevel, flat: number, wide: number) {
  const { finger: N, fingerStep, tip } = RES[q];
  const rt = r * FINGER.tip;
  const end = len - rt;
  const at = (d: number) => {
    let i = 0;
    while (i < keys.length - 2 && d > keys[i + 1][0]) i++;
    return ease(keys[i][1], keys[i + 1][1], (d - keys[i][0]) / (keys[i + 1][0] - keys[i][0]));
  };
  const ds = heights(keys[0][0], end, fingerStep).map((d) => [d, at(d) * r] as [number, number]);
  const last = at(end) * r;
  for (let i = 1; i <= tip; i++) {
    const phi = (i / (tip + 1)) * (Math.PI / 2);
    ds.push([end + rt * Math.sin(phi), last * Math.cos(phi)]);
  }
  const rows = ds.map(([d, rr]) => ({
    d,
    ring: Array.from({ length: N }, (_, k) => {
      const a = (k / N) * Math.PI * 2;
      return new THREE.Vector3(rr * flat * spow(Math.cos(a), 2 / 2.3), -d, rr * wide * spow(Math.sin(a), 2 / 2.3));
    }),
  }));
  const g = tube(
    rows.map((r) => r.ring),
    new THREE.Vector3(0, -keys[0][0], 0),
    new THREE.Vector3(0, -len, 0)
  );
  // Each vertex's distance along it (the two ends' points last)
  const along = [...rows.flatMap((r) => r.ring.map(() => r.d)), keys[0][0], len];
  return { g, along };
}

interface Built {
  geo: THREE.BufferGeometry;
  /** Per (indexed) vertex: its weights, and how far along its finger (palm: -1) */
  skin: Influence[];
  along: number[];
  /** The finger's first joint (palm: 0) */
  joint: number;
}

const cache = new Map<string, Built[]>();
/** The hand's parts, indexed, in the side -1 frame */
function build(q: HandLevel): Built[] {
  const hit = cache.get(`${q}`);
  if (hit) return hit;
  const parts: Built[] = [];
  const hand = 'handL' as BoneName;
  // The palm: the hand's, its top up into the sleeve with the forearm (as the old wrist)
  {
    const geo = palmGeometry(q);
    const p = geo.attributes.position as THREE.BufferAttribute;
    const skin: Influence[] = [];
    for (let i = 0; i < p.count; i++) {
      const f = 0.5 * step(0.035, 0.065, p.getY(i));
      skin.push(f > 1e-4 ? [[hand, 1 - f], ['foreL' as BoneName, f]] : [[hand, 1]]);
    }
    parts.push({ geo, skin, along: Array(p.count).fill(-1), joint: 0 });
  }
  const { fingers, mid, thumb } = HAND;
  fingers.forEach((f, i) => {
    const len = f.len;
    const r = f.r * FINGER.r;
    const at = len * mid;
    const dj = at + (len - at) * 0.55;
    const keys: [number, number][] = [
      [FINGER.root, 1.12],
      [0, 1.07],
      [0.006, 1],
      [at - 0.004, 0.96],
      [at, 1.0],
      [at + 0.004, 0.95],
      [dj - 0.003, 0.9],
      [dj, 0.92],
      [dj + 0.003, 0.88],
      [len, 0.85],
    ];
    const { g, along } = digitRows(len, r, keys, q, 0.9, 1);
    const [first, second] = (i === 0 ? ['idx1L', 'idx2L'] : ['fin1L', 'fin2L']) as BoneName[];
    const skin = along.map((d) => fingerWeigh(hand, first, second, d, at));
    // (a touch of spread, as the old fingers: the index leans forward, the little finger back)
    g.rotateX([-0.07, -0.02, 0.04, 0.11][i]).translate(0, K, f.z);
    g.computeVertexNormals();
    parts.push({ geo: g, skin, along, joint: at });
  });
  {
    const len = thumb.len;
    const r = thumb.r * 0.95;
    const at = len * thumb.mid;
    const keys: [number, number][] = [
      [-0.005, 1.08],
      [0, 1.1],
      [0.006, 1.04],
      [at - 0.004, 0.99],
      [at, 1.02],
      [at + 0.005, 0.96],
      [len, 0.9],
    ];
    const { g, along } = digitRows(len, r, keys, q, 0.86, 1.05);
    const skin = along.map((d) => fingerWeigh(hand, 'thb1L' as BoneName, 'thb2L' as BoneName, d, at));
    g.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(thumb.x, thumb.y, thumb.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(THUMB_REST.x, 0, THUMB_REST.z)),
        new THREE.Vector3(1, 1, 1)
      )
    );
    g.computeVertexNormals();
    parts.push({ geo: g, skin, along, joint: at });
  }
  blend(parts);
  cache.set(`${q}`, parts);
  return parts;
}

/** Where a finger comes out of the palm, its normals eased onto the palm's (no crease for the ink to draw) */
function blend(parts: Built[]) {
  const palm = parts[0].geo;
  const P = palm.attributes.position as THREE.BufferAttribute;
  const PN = palm.attributes.normal as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const w = new THREE.Vector3();
  const n = new THREE.Vector3();
  const m = new THREE.Vector3();
  for (const part of parts.slice(1)) {
    const pos = part.geo.attributes.position as THREE.BufferAttribute;
    const nor = part.geo.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      if (part.along[i] > 0.014) continue;
      v.fromBufferAttribute(pos, i);
      let best = Infinity;
      let at = 0;
      for (let k = 0; k < P.count; k++) {
        const dd = v.distanceToSquared(w.fromBufferAttribute(P, k));
        if (dd < best) {
          best = dd;
          at = k;
        }
      }
      w.fromBufferAttribute(P, at);
      m.fromBufferAttribute(PN, at);
      const out = v.sub(w).dot(m);
      // (either side of the palm's surface: deep inside, a finger keeps its own)
      const k = BLEND.most * (1 - THREE.MathUtils.smoothstep(Math.abs(out), 0, BLEND.reach));
      n.fromBufferAttribute(nor, i);
      // (only where the two face much the same way: a side facing away from the palm isn't on its surface)
      if (k <= 0 || n.dot(m) < 0.2) continue;
      n.lerp(m, k).normalize();
      nor.setXYZ(i, n.x, n.y, n.z);
    }
  }
}

/** A built part for a side (mirrored for side 1, its weights on that side's bones), non-indexed */
function forSide(b: Built, side: -1 | 1, move?: (pos: THREE.BufferAttribute, nor: THREE.BufferAttribute) => void): HandPart {
  const g = b.geo.clone();
  if (move) move(g.attributes.position as THREE.BufferAttribute, g.attributes.normal as THREE.BufferAttribute);
  const S = side < 0 ? 'L' : 'R';
  const idx = g.index!.array;
  const skinIdx: Influence[] = b.skin.map((inf) => inf.map(([bone, wt]) => [(bone.slice(0, -1) + S) as BoneName, wt]));
  if (side > 0) {
    g.scale(-1, 1, 1);
    const flipped = Array.from(idx);
    for (let t = 0; t < flipped.length; t += 3) [flipped[t + 1], flipped[t + 2]] = [flipped[t + 2], flipped[t + 1]];
    g.setIndex(flipped);
  }
  const out = g.toNonIndexed();
  const order = g.index!.array;
  return { geo: out, skin: Array.from(order, (i) => skinIdx[i]) };
}

/** Hand `side` (-1 the rig's -x, 1 its +x): the palm, four fingers and the thumb, smooth, weighted to its bones */
export function smoothHand(side: -1 | 1, q: HandLevel): HandPart[] {
  return build(q).map((b) => forSide(b, side));
}

/**
 * A glove of `kind` over hand `side`: the hand pushed out along its normals; a fingerless one's fingers and thumb cut
 * off past their first joints with a rolled hem; a full one's cuff flared a touch; a driving glove's strap at the wrist
 */
export function gloveParts(side: -1 | 1, q: HandLevel, kind: GloveKind): HandPart[] {
  const out: HandPart[] = [];
  for (const b of build(q)) {
    const cut = b.joint > 0 && kind === 'fingerless' ? b.joint * GLOVE.cut : Infinity;
    const part = forSide(b, side, (pos, nor) => {
      const v = new THREE.Vector3();
      const n = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        n.fromBufferAttribute(nor, i);
        const d = b.along[i];
        // (where a finger is buried in the palm the palm's glove covers it: none of its own there)
        let t = b.joint > 0 ? GLOVE.t * step(-0.004, 0.001, d) : GLOVE.t;
        // (a rolled hem at a fingerless one's cut)
        if (d > cut - 0.0025 && d <= cut + 1e-6) t += GLOVE.hem * Math.sin(((d - (cut - 0.0025)) / 0.0025) * Math.PI);
        if (b.joint === 0) {
          if (kind === 'driving') t += GLOVE.strap.t * (step(GLOVE.strap.y0 - 0.0015, GLOVE.strap.y0, v.y) - step(GLOVE.strap.y1, GLOVE.strap.y1 + 0.0015, v.y));
          if (kind === 'full') t += GLOVE.cuff.t * step(GLOVE.cuff.y - 0.006, GLOVE.cuff.y, v.y);
        }
        v.addScaledVector(n, t);
        pos.setXYZ(i, v.x, v.y, v.z);
      }
    });
    if (cut < Infinity) {
      // Only the triangles wholly before the cut (the rows fall on it closely enough: the hem hides the edge)
      const keep: number[] = [];
      const S = part.geo.attributes.position as THREE.BufferAttribute;
      const along = alongFor(b, side);
      for (let t = 0; t < S.count; t += 3) if (along[t] <= cut && along[t + 1] <= cut && along[t + 2] <= cut) keep.push(t);
      part.geo = pick(part.geo, keep);
      part.skin = keep.flatMap((t) => [part.skin[t], part.skin[t + 1], part.skin[t + 2]]);
    }
    out.push(part);
  }
  return out;
}

/** A built part's distances along it, per non-indexed vertex (in the side's winding) */
function alongFor(b: Built, side: -1 | 1) {
  const idx = Array.from(b.geo.index!.array);
  if (side > 0) for (let t = 0; t < idx.length; t += 3) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
  return idx.map((i) => b.along[i]);
}

/** The triangles starting at the given vertices of a non-indexed geometry */
function pick(g: THREE.BufferGeometry, tris: number[]) {
  const out = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(g.attributes)) {
    const a = attr as THREE.BufferAttribute;
    const s = a.itemSize;
    const arr = new Float32Array(tris.length * 3 * s);
    tris.forEach((t, j) => arr.set((a.array as Float32Array).subarray(t * s, (t + 3) * s), j * 3 * s));
    out.setAttribute(name, new THREE.BufferAttribute(arr, s));
  }
  return out;
}
