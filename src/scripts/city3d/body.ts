/*
 * The new body's own shapes (DOM-free like skeleton.ts, so the tests can
 * build them): the head and the hands. The clothes are in character.ts.
 *
 * - The head, after the brand art: a tall balaclava, narrower than it's
 *   deep, flatter on the front than the back, a crown that flattens under
 *   the cap, a nose ridge down from between the shades, cheekbones, a brow
 *   over the eye opening, a defined jaw and chin, and the long neck tube
 *   down into the collar (`headGeometry()`; `headFront()` is its front, for
 *   laying the eye opening and the shades onto it). In the head bone's
 *   space: the eyes at `EYE_Y`, the crown at about 0.232.
 * - The hands: a palm and wrist, four fingers in two joints each and a
 *   thumb, every vertex weighted to its bones (`handParts()`), in the hand
 *   bone's space (the old hand socket, the palm's middle). The fingers curl
 *   towards the palm: the -x side of the rig's +x hand, +x of the -x one.
 *   `bakedHand()` is one posed and set solid (the first-person hands).
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HAND, THUMB_REST, fingerWeigh, makeSkeleton, newPose, poseSkeleton, step, type BoneName, type Influence } from './skeleton';

/* ---------- The head ---------- */

/** The eye opening's middle (and the shades'), in the head's space */
export const EYE_Y = 0.126;

/** A row of the head: height, half width, depth to the front and to the back, the middle's z, squareness (2 an ellipse) */
type Row = [y: number, hw: number, front: number, back: number, zc: number, n: number];
export const HEAD_ROWS: Row[] = [
  // The neck tube, from inside the collar up under the jaw
  [-0.085, 0.05, 0.051, 0.05, -0.01, 2],
  [-0.045, 0.047, 0.048, 0.049, -0.009, 2],
  [-0.008, 0.046, 0.05, 0.048, -0.008, 2],
  // Under the chin, the chin and the jaw
  [0.01, 0.05, 0.066, 0.052, -0.006, 2.2],
  [0.026, 0.058, 0.082, 0.06, -0.004, 2.4],
  [0.045, 0.067, 0.09, 0.07, -0.002, 2.6],
  // Cheeks, the eyes, the brow
  [0.07, 0.074, 0.095, 0.08, 0, 2.7],
  [0.1, 0.079, 0.097, 0.088, 0, 2.6],
  [0.13, 0.083, 0.096, 0.094, -0.001, 2.5],
  [0.16, 0.086, 0.093, 0.097, -0.003, 2.4],
  // The crown, flattening under the cap
  [0.188, 0.082, 0.086, 0.095, -0.005, 2.3],
  [0.208, 0.072, 0.074, 0.084, -0.007, 2.2],
  [0.221, 0.054, 0.055, 0.063, -0.008, 2.1],
  [0.229, 0.027, 0.028, 0.032, -0.008, 2],
  [0.232, 0.004, 0.004, 0.004, -0.008, 2],
];
export const HEAD_TOP = HEAD_ROWS[HEAD_ROWS.length - 1][0];
export const HEAD_BOTTOM = HEAD_ROWS[0][0];

function rowAt(y: number): Row {
  const R = HEAD_ROWS;
  let i = 0;
  while (i < R.length - 2 && y > R[i + 1][0]) i++;
  const a = R[i];
  const b = R[i + 1];
  const f = THREE.MathUtils.clamp((y - a[0]) / (b[0] - a[0]), 0, 1);
  return a.map((v, k) => (k === 0 ? y : v + (b[k] - v) * f)) as Row;
}
const bell = (x: number, at: number, w: number) => Math.exp(-(((x - at) / w) ** 2));
/** The face's features, pushed out (or in) from the plain oval at (x, y): nose, cheekbones, brow over the eye sockets, chin, the line of the mouth */
function features(x: number, y: number) {
  const ax = Math.abs(x);
  const nose = 0.016 * step(0.046, 0.074, y) * (1 - 0.78 * step(0.074, 0.128, y)) * step(0.152, 0.126, y) * bell(x, 0, 0.016);
  const cheeks = 0.005 * bell(ax, 0.052, 0.018) * bell(y, 0.095, 0.02);
  const brow = 0.008 * bell(y, 0.163, 0.012) * step(0.078, 0.04, ax);
  const sockets = -0.004 * bell(y, 0.128, 0.016) * bell(ax, 0.042, 0.02);
  const chin = 0.009 * bell(y, 0.03, 0.016) * bell(x, 0, 0.03);
  const mouth = -0.003 * bell(y, 0.052, 0.006) * bell(x, 0, 0.022);
  return nose + cheeks + brow + sockets + chin + mouth;
}
/** How far round to the front a point is (1 dead ahead, 0 at the side): features fade out round the sides */
const frontness = (w: number) => w ** 4;

/** The front of the head at (x, y): its z, features and all */
export function headFront(x: number, y: number) {
  const [, hw, front, , zc, n] = rowAt(y);
  const u = Math.min(0.995, Math.abs(x) / hw);
  const w = (1 - u ** n) ** (1 / n);
  return zc + front * w + features(x, y) * frontness(w);
}

/** The heights the head's rings sit at: close together over the face, wider on the neck and crown */
function rings(q: number) {
  const ys: number[] = [-0.085, -0.06, -0.035, -0.015, -0.004];
  const step = q >= 2 ? 0.009 : 0.015;
  for (let y = 0.006; y < 0.2; y += step) ys.push(y);
  ys.push(0.2, 0.21, 0.218, 0.224, 0.228, 0.231, HEAD_TOP);
  return ys;
}

/** The head and its neck tube, `seg` round, closed at the bottom and domed at the top */
export function headGeometry(seg: number, q = 2) {
  const ys = rings(q);
  const pos: number[] = [];
  const idx: number[] = [];
  for (const y of ys) {
    const [, hw, front, back, zc, n] = rowAt(y);
    const e = 2 / n;
    for (let k = 0; k < seg; k++) {
      const a = (k / seg) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const x = Math.sign(c) * Math.abs(c) ** e * hw;
      const w = Math.abs(s) ** e;
      const z = s >= 0 ? zc + front * w + features(x, y) * frontness(w) : zc - back * w;
      pos.push(x, y, z);
    }
  }
  const R = ys.length;
  for (let i = 0; i < R - 1; i++)
    for (let k = 0; k < seg; k++) {
      const a = i * seg + k;
      const b = i * seg + ((k + 1) % seg);
      idx.push(a, a + seg, b, b, a + seg, b + seg);
    }
  const lo = R * seg;
  pos.push(0, ys[0], rowAt(ys[0])[4], 0, ys[R - 1], rowAt(ys[R - 1])[4]);
  for (let k = 0; k < seg; k++) {
    const k1 = (k + 1) % seg;
    idx.push(lo, k, k1, lo + 1, (R - 1) * seg + k1, (R - 1) * seg + k);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ---------- The hands ---------- */

/** A geometry with its own weights, one per vertex (non-indexed, in the hand's space) */
export interface SkinnedPart {
  geo: THREE.BufferGeometry;
  skin: Influence[];
}

/** A round finger (or thumb) down -y from its root at the origin: `len` long, `r` thick, a joint at `at` */
function digit(len: number, r: number, at: number, seg: number, root: number) {
  const rows: [number, number][] = [
    [root, r * 1.05],
    [0, r],
    [-at + 0.004, r * 0.96],
    [-at, r * 0.97],
    [-at - 0.004, r * 0.94],
    [-len + r * 0.8, r * 0.86],
    [-len + r * 0.3, r * 0.66],
    [-len, 0.0015],
  ];
  const pts = rows.reverse().map(([y, rr]) => new THREE.Vector2(rr, y));
  return new THREE.LatheGeometry(pts, seg).scale(1, 1, 0.9).toNonIndexed();
}

/**
 * Hand `side` (-1 the left, the rig's -x; 1 the right): the wrist, the palm
 * with the thumb's pad, four fingers and the thumb, weighted to the hand and
 * finger bones. `seg` is how round the fingers are.
 */
export function handParts(side: -1 | 1, seg: number): SkinnedPart[] {
  const S = side < 0 ? 'L' : 'R';
  const s = side;
  const hand = `hand${S}` as BoneName;
  const parts: SkinnedPart[] = [];
  const rigid = (geo: THREE.BufferGeometry, fore = false) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.attributes.position as THREE.BufferAttribute;
    const skin: Influence[] = [];
    for (let i = 0; i < p.count; i++) {
      // The wrist's top tucks into the sleeve with the forearm
      const f = fore ? 0.5 * step(0.035, 0.065, p.getY(i)) : 0;
      skin.push(f > 1e-4 ? [[hand, 1 - f], [`fore${S}` as BoneName, f]] : [[hand, 1]]);
    }
    parts.push({ geo: g, skin });
  };
  // (closed, and its top just inside the cuff, so no open rim shows up the sleeve)
  rigid(new THREE.CylinderGeometry(0.023, 0.026, 0.026, seg + 2, 2).translate(0, 0.041, -0.002), true);
  rigid(new RoundedBoxGeometry(0.035, 0.066, 0.064, 2, 0.013).translate(s * 0.003, 0.009, -0.001));
  // The pad at the root of the thumb, on the palm side
  rigid(new THREE.SphereGeometry(0.016, seg, Math.max(4, seg - 2)).scale(0.62, 1.15, 0.9).translate(-s * 0.009, 0.012, 0.018));
  const { knuckleY, fingers, mid, thumb } = HAND;
  fingers.forEach((f, i) => {
    const at = f.len * mid;
    const g = digit(f.len, f.r, at, seg, 0.01);
    const p = g.attributes.position as THREE.BufferAttribute;
    const [first, second] = (i === 0 ? ['idx1', 'idx2'] : ['fin1', 'fin2']).map((b) => `${b}${S}` as BoneName);
    const skin: Influence[] = [];
    for (let k = 0; k < p.count; k++) skin.push(fingerWeigh(hand, first, second, -p.getY(k), at));
    // A touch of spread: the index leans forward, the little finger back
    g.rotateX([-0.07, -0.02, 0.04, 0.11][i]).translate(0, knuckleY, f.z);
    parts.push({ geo: g, skin });
  });
  {
    const at = thumb.len * thumb.mid;
    const g = digit(thumb.len, thumb.r, at, seg, 0.012);
    const p = g.attributes.position as THREE.BufferAttribute;
    const skin: Influence[] = [];
    for (let k = 0; k < p.count; k++) skin.push(fingerWeigh(hand, `thb1${S}` as BoneName, `thb2${S}` as BoneName, -p.getY(k), at));
    // Onto the thumb's root, turned as the skeleton's thumb rests
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(-s * thumb.x, thumb.y, thumb.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(THUMB_REST.x, 0, -s * THUMB_REST.z)),
      new THREE.Vector3(1, 1, 1)
    );
    g.applyMatrix4(m);
    parts.push({ geo: g, skin });
  }
  for (const pt of parts) pt.geo.computeVertexNormals();
  return parts;
}

/**
 * Hand `side` closed to `grip` (0 open, 1 a fist) and set solid: one
 * geometry in the posed hand's space, positions and normals (the
 * first-person hands, which aren't skinned).
 */
export function bakedHand(side: -1 | 1, grip: number, seg = 9) {
  const S = side < 0 ? 'L' : 'R';
  const sk = makeSkeleton();
  sk.root.updateMatrixWorld(true);
  const rest = new Map(sk.list.map((b) => [b.name, b.matrixWorld.clone().invert()]));
  const hand = sk.bones[`hand${S}`];
  const handRest = hand.matrixWorld.clone();
  poseSkeleton(sk, newPose(), [grip, grip]);
  sk.root.updateMatrixWorld(true);
  const toHand = hand.matrixWorld.clone().invert();
  // Each bone's move from rest, seen from the posed hand
  const move = new Map(sk.list.map((b) => [b.name, toHand.clone().multiply(b.matrixWorld).multiply(rest.get(b.name)!)]));
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const sumP = new THREE.Vector3();
  const sumN = new THREE.Vector3();
  const geos = handParts(side, seg).map(({ geo, skin }) => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const nor = geo.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      sumP.set(0, 0, 0);
      sumN.set(0, 0, 0);
      for (const [b, w] of skin[i]) {
        const m = move.get(b)!;
        sumP.addScaledVector(v.fromBufferAttribute(pos, i).applyMatrix4(handRest).applyMatrix4(m), w);
        sumN.addScaledVector(n.fromBufferAttribute(nor, i).transformDirection(handRest).transformDirection(m), w);
      }
      pos.setXYZ(i, sumP.x, sumP.y, sumP.z);
      nor.setXYZ(i, ...sumN.normalize().toArray());
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', pos);
    out.setAttribute('normal', nor);
    return out;
  });
  return mergeGeometries(geos)!;
}
