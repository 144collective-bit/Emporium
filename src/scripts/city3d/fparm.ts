/*
 * Degen's arms in first person with empty hands (the owner's call, 2026-11: "the arms look deformed and unnatural";
 * "we want this looking premium"): the shapes and the reach. DOM-free, tested in tests/fparm.test.ts; fistsview.ts
 * dresses and moves them.
 *
 * - Each arm is two pieces jointed at the elbow: the upper arm from the shoulder (out of shot, behind the eye) and
 *   the forearm with the fist on its end. They're his body's own arms (the owner's call, 2026-11: "use his real
 *   body's clips"): each frame his skeleton, posed by the motion capture and the fight's clips as third person
 *   shows him, is read from an eye in his head (`eyeFrame()`), and the arm laid on his shoulder, elbow and wrist
 *   (`bodyArm()`), the fist turned as his hand is. With the guard up a first-person correction (`FP_FIX`) carries
 *   the fists into shot without moving the body: the elbow is then solved again (`solveArm()`, a two-bone reach)
 *   round towards where his own elbow is, so the arm keeps its lengths and its bend.
 * - The fist is modelled for being seen up close (`fistGeometry()`), not the body's hand closed (body.ts
 *   `bakedHand()`, built to read from a distance): the back of the hand, four knuckles in a row that slopes off to the
 *   little finger, each finger folded in two under them, and the thumb wrapped across the front, all one smooth shape
 *   (`fistField()` meshed by `meshField()`), its creases drawn in (`paintFist()`). Its frame: the wrist at the origin,
 *   +y out to the knuckles, +z the back of the hand, the thumb on the side `thumb` says.
 * - Sleeves are turned (`sleeveGeometry()`): round at both ends, so the elbow bends without a seam, tapering a touch
 *   towards the cuff.
 * - Every piece carries its own colour (`paint()`), so an arm is two draws, the upper arm and the
 *   forearm with its cuff and fist, whatever the outfit (a `tint` attribute of its own, not three's vertex colours).
 *
 * Lengths are metres, life size (fistsview.ts builds them `FP_SCALE` times bigger and further out).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HAND, UPPER_ARM, WRIST_Y, WRIST_Z } from './skeleton';

/** The fist's wrist (its origin) to its knuckles, along +y */
export const KNUCKLES = 0.09;
/** His forearm in the body's units: the elbow to the hand bone, and on from it to his knuckles */
const BODY_FORE = Math.hypot(WRIST_Y, WRIST_Z);
const BODY_KNUCKLES = Math.abs(HAND.knuckleY);
/**
 * The arm's two lengths (metres): shoulder to elbow, elbow to the fist's wrist. In his body's proportions, so laid on
 * his skeleton the fist's knuckles land where his own do (`bodyArm()`)
 */
export const ARM = { upper: 0.29, fore: (0.29 * (BODY_FORE + BODY_KNUCKLES)) / UPPER_ARM - KNUCKLES };
/** How many of these metres to one of his body's units (his arm's length against `UPPER_ARM`) */
export const BODY_TO_ARM = ARM.upper / UPPER_ARM;
/**
 * The eye in his head, in his body's units from the head bone: up, and forward (the camera's own first-person height
 * is above his head, so the arms are read from here instead)
 */
export const EYE = { up: 0.07, fwd: 0.06 };

/** The fist's size: across the knuckles, wrist to the front of the folded fingers, and its depth (metres) */
export const FIST = { width: 0.094, length: 0.118, depth: 0.072 };

const UP = new THREE.Vector3(0, 1, 0);

/** Only the position and normal kept, not indexed, so every piece merges */
function plain(g: THREE.BufferGeometry) {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'tint') n.deleteAttribute(k);
  return n;
}

/** A piece's every vertex in one colour (its `tint`, linear), so pieces of different colours share one draw */
export function paint(g: THREE.BufferGeometry, color: string | THREE.Color) {
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('tint', new THREE.BufferAttribute(a, 3));
  return g;
}

/** Pieces made into one (each painted first) */
export function merge(parts: THREE.BufferGeometry[]) {
  return mergeGeometries(parts)!;
}

/**
 * The fist, closed tight (or `loose`, 0..1, as he runs): the wrist at the origin, +y out to the knuckles, +z the back of the hand, the thumb on the
 * `thumb` side of x (-1 or 1). Its index finger is next to the thumb; the knuckles' line slopes back to the little
 * finger, as a real fist's does.
 */
export function fistGeometry(thumb: -1 | 1, loose = 0): THREE.BufferGeometry {
  const key = `${thumb}:${loose}`;
  const had = FISTS.get(key);
  if (had) return had.clone();
  // (made once for the thumb on +x; the other hand is it mirrored, turned inside out back again)
  const field = fistField(1, loose);
  const crease = [0];
  const g: THREE.BufferGeometry =
    thumb === 1
      ? meshField(field, FIST_BOX, FIST_CELL, (x, y, z) => {
          crease[0] = 0;
          field(x, y, z, crease);
          return crease[0];
        })
      : mirrorX(fistGeometry(1, loose));
  FISTS.set(key, g);
  return g.clone();
}

/** A non-indexed geometry mirrored across x, its faces turned back out */
function mirrorX(g: THREE.BufferGeometry) {
  const out = g.clone();
  for (const k of ['position', 'normal'] as const) {
    const a = out.attributes[k] as THREE.BufferAttribute;
    for (let i = 0; i < a.count; i++) a.setX(i, -a.getX(i));
  }
  for (const a of Object.values(out.attributes) as THREE.BufferAttribute[])
    for (let t = 0; t < a.count; t += 3)
      for (let c = 0; c < a.itemSize; c++) {
        const s = a.array[(t + 1) * a.itemSize + c];
        a.array[(t + 1) * a.itemSize + c] = a.array[(t + 2) * a.itemSize + c];
        a.array[(t + 2) * a.itemSize + c] = s;
      }
  return out;
}
/** The fists made so far (each is a few milliseconds' work: made once) */
const FISTS = new Map<string, THREE.BufferGeometry>();
/** Where the fist's field is sampled, and how finely (metres): a cell of about 3 mm, smooth at the size it's seen */
const FIST_BOX = { min: [-0.068, -0.034, -0.082], max: [0.068, 0.124, 0.042] } as const;
const FIST_CELL = 0.0032;

/** (Math.hypot is slow; this runs a few hundred thousand times a fist) */
const len3 = (x: number, y: number, z: number) => Math.sqrt(x * x + y * y + z * z);
/** A smooth minimum: two shapes run into each other over `k` (a soft crease, not a seam); how deep in the crease a
 * point is (0-1) goes onto `crease[0]`, weighed by `w` */
const smin = (a: number, b: number, k: number, crease?: number[], w = 1) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  if (crease && h > 0) crease[0] = Math.max(crease[0], h * w);
  return Math.min(a, b) - h * h * k * 0.25;
};

/** The fist's creases drawn in, comic style: the skin darkened this much at the deepest, from this deep in */
export const CREASE = { dark: 0.2, from: 0.35, full: 1 };

/** The fist in one colour, its creases (from `fistGeometry()`'s tint) darkened in it */
export function paintFist(g: THREE.BufferGeometry, color: string | THREE.Color) {
  const c = new THREE.Color(color);
  const t = g.attributes.tint as THREE.BufferAttribute | undefined;
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const k = 1 - CREASE.dark * THREE.MathUtils.smoothstep(t ? t.getX(i) : 0, CREASE.from, CREASE.full);
    a.set([c.r * k, c.g * k, c.b * k], i * 3);
  }
  g.setAttribute('tint', new THREE.BufferAttribute(a, 3));
  return g;
}
/** How far (x, y, z) is outside a capsule from a to b of radius r (negative inside) */
function capsuleAt(x: number, y: number, z: number, a: readonly number[], b: readonly number[], r: number) {
  const px = x - a[0];
  const py = y - a[1];
  const pz = z - a[2];
  const bx = b[0] - a[0];
  const by = b[1] - a[1];
  const bz = b[2] - a[2];
  const h = Math.min(1, Math.max(0, (px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz || 1)));
  return len3(px - bx * h, py - by * h, pz - bz * h) - r;
}
/** How far (x, y, z) is outside a box of half sizes (hx, hy, hz) centred at c, its edges rounded by r */
function boxAt(x: number, y: number, z: number, c: readonly number[], hx: number, hy: number, hz: number, r: number) {
  const qx = Math.abs(x - c[0]) - hx + r;
  const qy = Math.abs(y - c[1]) - hy + r;
  const qz = Math.abs(z - c[2]) - hz + r;
  return len3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
}

/**
 * The fist as one soft shape (the owner's call, 2026-11: "smoother, more natural", a chunky cartoon fist): how far
 * a point is outside it. The back of the hand and the palm, the wrist, four fingers curled in two and the thumb,
 * each run into the next over a few millimetres, so it reads as one hand with creases, not a bundle of pieces
 */
function fistField(thumb: -1 | 1, loose: number): (x: number, y: number, z: number, crease?: number[]) => number {
  // (loose, as a runner carries his hands: the fingers eased open about their knuckles, the thumb along the index)
  const ease = 0.34 * loose;
  const turn = (ky: number, dy: number, dz: number, a: number): number[] => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [0, ky + dy * c - dz * s, 0.012 + dy * s + dz * c];
  };
  // Four fingers, index (by the thumb) to little: the knuckle, then the finger folded down the front and back under
  const at = [0.0315, 0.0105, -0.0105, -0.0305];
  const reach = [0.092, 0.095, 0.092, 0.086];
  const wide = [0.0225, 0.0235, 0.022, 0.0195];
  const fingers = at.map((x0, f) => {
    const x = x0 * thumb;
    const k = [x, reach[f] + 0.002, 0.009];
    const m = turn(reach[f], 0.0, -0.042, ease);
    const t = turn(reach[f], -0.026, -0.04, ease * 1.35);
    m[0] = t[0] = x;
    return { k, m, t, r: wide[f] * 0.5 };
  });
  const t0 = [0.04 * thumb, 0.024, -0.014];
  const t1 = new THREE.Vector3(0.037 * thumb, 0.06, -0.038).lerp(new THREE.Vector3(0.042 * thumb, 0.063, -0.032), loose).toArray();
  const t2 = new THREE.Vector3(0.008 * thumb, 0.074, -0.045).lerp(new THREE.Vector3(0.031 * thumb, 0.084, -0.036), loose).toArray();
  const back = [0, 0.052, -0.002];
  const palm = [0, 0.044, -0.022];
  return (x: number, y: number, z: number, cr?: number[]) => {
    // The back of the hand, narrowing a little to the wrist, and the palm under it
    const narrow = 0.84 + 0.16 * Math.min(1, Math.max(0, (y - 0.012) / 0.078));
    let d = boxAt(x / narrow, y, z, back, 0.044, 0.04, 0.02, 0.016) * Math.min(1, narrow);
    d = smin(d, boxAt(x, y, z, palm, 0.04, 0.03, 0.014, 0.012), 0.012);
    // The wrist, a flattened round into the cuff
    d = smin(d, capsuleAt(x / 1.12, y, z / 0.82, [0, -0.008, -0.005], [0, 0.022, -0.005], 0.025) * 0.82, 0.014);
    // The fingers: each finger's two bones run into each other, the fingers barely into their neighbours (the creases)
    let fs = Infinity;
    for (const f of fingers) {
      // (each knuckle a bump proud of the back of the hand)
      const kn = len3(x - f.k[0], y - f.k[1], z - f.k[2] - 0.004) - f.r * 0.92;
      const one = smin(smin(capsuleAt(x, y, z, f.k, f.m, f.r), capsuleAt(x, y, z, f.m, f.t, f.r * 0.94), 0.006), kn, 0.004);
      fs = smin(fs, one, 0.003, cr);
    }
    d = smin(d, fs, 0.008);
    // The thumb, round the side and across the front, and its ball filling the heel of the hand
    const th = smin(capsuleAt(x, y, z, t0, t1, 0.0165), capsuleAt(x, y, z, t1, t2, 0.0148), 0.006);
    const bx = (x - 0.028 * thumb) / 0.016;
    const by = (y - 0.03) / 0.022;
    const bz = (z + 0.024) / 0.015;
    const ball = (len3(bx, by, bz) - 1) * 0.015;
    d = smin(d, smin(th, ball, 0.01), 0.005, cr);
    return d;
  };
}

/**
 * A smooth mesh of where `field` is zero, sampled in `box` every `cell` (a surface net: one point per cell the
 * surface crosses, eased onto it; shaded by the field's own slope, so it's smooth however it was cut)
 */
export function meshField(
  field: (x: number, y: number, z: number) => number,
  box: { min: readonly number[]; max: readonly number[] },
  cell: number,
  shade?: (x: number, y: number, z: number) => number,
) {
  const n = [0, 1, 2].map((a) => Math.ceil((box.max[a] - box.min[a]) / cell) + 1);
  const [nx, ny, nz] = n;
  const at = (i: number, j: number, k: number) => i + nx * (j + ny * k);
  const val = new Float32Array(nx * ny * nz);
  // (first every `C`th point; a point whose nearest of those is well clear of the surface takes its value: only its
  // sign is ever read, so only the points near the surface are worked out)
  const C = 4;
  const cn = n.map((v) => Math.floor((v - 1) / C) + 1);
  const coarse = new Float32Array(cn[0] * cn[1] * cn[2]);
  for (let k = 0; k < cn[2]; k++)
    for (let j = 0; j < cn[1]; j++)
      for (let i = 0; i < cn[0]; i++) coarse[i + cn[0] * (j + cn[1] * k)] = field(box.min[0] + i * C * cell, box.min[1] + j * C * cell, box.min[2] + k * C * cell);
  // (a point is at most √3·C/2 cells from its nearest coarse point; half as much again, for the fields that stretch)
  const clear = 1.5 * Math.sqrt(3) * (C / 2) * cell;
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const ci = Math.min(cn[0] - 1, Math.round(i / C));
        const cj = Math.min(cn[1] - 1, Math.round(j / C));
        const ck = Math.min(cn[2] - 1, Math.round(k / C));
        const near = coarse[ci + cn[0] * (cj + cn[1] * ck)];
        val[at(i, j, k)] = Math.abs(near) > clear ? near : field(box.min[0] + i * cell, box.min[1] + j * cell, box.min[2] + k * cell);
      }
  const grad = (x: number, y: number, z: number, out: number[]) => {
    const e = cell * 0.25;
    out[0] = field(x + e, y, z) - field(x - e, y, z);
    out[1] = field(x, y + e, z) - field(x, y - e, z);
    out[2] = field(x, y, z + e) - field(x, y, z - e);
    const l = Math.hypot(out[0], out[1], out[2]) || 1;
    out[0] /= l;
    out[1] /= l;
    out[2] /= l;
  };
  // One point per cell the surface crosses: where its edges cross, averaged, then stepped onto the surface
  const vert = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cellAt = (i: number, j: number, k: number) => i + (nx - 1) * (j + (ny - 1) * k);
  const pos: number[] = [];
  const nor: number[] = [];
  const tone: number[] = [];
  const g = [0, 0, 0];
  const corner = [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1];
  const edges = [0, 1, 2, 3, 4, 5, 6, 7, 0, 2, 1, 3, 4, 6, 5, 7, 0, 4, 1, 5, 2, 6, 3, 7];
  for (let k = 0; k < nz - 1; k++)
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        // (a cell whose eight corners agree has nothing in it: most of them)
        const o = at(i, j, k);
        const s0 = val[o] < 0;
        if (
          s0 === val[o + 1] < 0 &&
          s0 === val[o + nx] < 0 &&
          s0 === val[o + nx + 1] < 0 &&
          s0 === val[o + nx * ny] < 0 &&
          s0 === val[o + nx * ny + 1] < 0 &&
          s0 === val[o + nx * ny + nx] < 0 &&
          s0 === val[o + nx * ny + nx + 1] < 0
        )
          continue;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let c = 0;
        for (let e = 0; e < 24; e += 2) {
          const a = edges[e] * 3;
          const b = edges[e + 1] * 3;
          const va = val[at(i + corner[a], j + corner[a + 1], k + corner[a + 2])];
          const vb = val[at(i + corner[b], j + corner[b + 1], k + corner[b + 2])];
          if (va < 0 === vb < 0) continue;
          const t = va / (va - vb);
          sx += corner[a] + (corner[b] - corner[a]) * t;
          sy += corner[a + 1] + (corner[b + 1] - corner[a + 1]) * t;
          sz += corner[a + 2] + (corner[b + 2] - corner[a + 2]) * t;
          c++;
        }
        if (!c) continue;
        let x = box.min[0] + (i + sx / c) * cell;
        let y = box.min[1] + (j + sy / c) * cell;
        let z = box.min[2] + (k + sz / c) * cell;
        // (onto the surface: a step down the slope by how far off it is; that slope shades it)
        const d = field(x, y, z);
        grad(x, y, z, g);
        x -= g[0] * d;
        y -= g[1] * d;
        z -= g[2] * d;
        vert[cellAt(i, j, k)] = pos.length / 3;
        pos.push(x, y, z);
        nor.push(g[0], g[1], g[2]);
        if (shade) {
          const v = shade(x, y, z);
          tone.push(v, v, v);
        }
      }
  // A quad round every grid edge the surface crosses, from the four cells that share it, facing out
  const idx: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) idx.push(a, c, b, a, d, c);
    else idx.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k++)
    for (let j = 1; j < ny - 1; j++)
      for (let i = 1; i < nx - 1; i++) {
        const v = val[at(i, j, k)] < 0;
        if (v !== val[at(i + 1, j, k)] < 0) quad(vert[cellAt(i, j - 1, k - 1)], vert[cellAt(i, j, k - 1)], vert[cellAt(i, j, k)], vert[cellAt(i, j - 1, k)], !v);
        if (v !== val[at(i, j + 1, k)] < 0) quad(vert[cellAt(i - 1, j, k - 1)], vert[cellAt(i - 1, j, k)], vert[cellAt(i, j, k)], vert[cellAt(i, j, k - 1)], !v);
        if (v !== val[at(i, j, k + 1)] < 0) quad(vert[cellAt(i - 1, j - 1, k)], vert[cellAt(i, j - 1, k)], vert[cellAt(i, j, k)], vert[cellAt(i - 1, j, k)], !v);
      }
  // (each face turned to agree with the field's slope, whatever way round the quad came)
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [idx[t] * 3, idx[t + 1] * 3, idx[t + 2] * 3];
    const ux = pos[b] - pos[a];
    const uy = pos[b + 1] - pos[a + 1];
    const uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a];
    const vy = pos[c + 1] - pos[a + 1];
    const vz = pos[c + 2] - pos[a + 2];
    const fx = uy * vz - uz * vy;
    const fy = uz * vx - ux * vz;
    const fz = ux * vy - uy * vx;
    if (fx * (nor[a] + nor[b] + nor[c]) + fy * (nor[a + 1] + nor[b + 1] + nor[c + 1]) + fz * (nor[a + 2] + nor[b + 2] + nor[c + 2]) < 0) {
      const s = idx[t + 1];
      idx[t + 1] = idx[t + 2];
      idx[t + 2] = s;
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  // (a shade, if asked for, rides in `tint` until the fist is painted: paintFist())
  if (shade) out.setAttribute('tint', new THREE.Float32BufferAttribute(tone, 3));
  out.setIndex(idx);
  return plain(out);
}

/**
 * A sleeve turned round +y from 0 to `len`, radius `r0` at 0 to `r1` at `len`, rounded off at both ends (so a joint
 * bends without a seam); `cap` false leaves the far end open-ended square (a cuff runs on from it)
 */
export function sleeveGeometry(r0: number, r1: number, len: number, cap = true, seg = 14) {
  const pts: THREE.Vector2[] = [];
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (i / steps) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.max(1e-4, r0 * Math.cos(a)), r0 * Math.sin(a)));
  }
  // (a little fullness through the middle: cloth over muscle, not a pipe)
  for (let i = 1; i < 6; i++) pts.push(new THREE.Vector2(sleeveRadius(r0, r1, len, (len * i) / 6), (len * i) / 6));
  if (cap)
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * (Math.PI / 2);
      pts.push(new THREE.Vector2(Math.max(1e-4, r1 * Math.cos(a)), len + r1 * Math.sin(a)));
    }
  else pts.push(new THREE.Vector2(r1, len));
  const g = new THREE.LatheGeometry(pts, seg);
  return plain(g);
}

/** A ribbed or plain cuff: a short tube round +y from `y0` to `y1` */
export function cuffGeometry(r0: number, r1: number, y0: number, y1: number, ribs = 0) {
  const parts: THREE.BufferGeometry[] = [];
  const g = new THREE.CylinderGeometry(r1, r0, y1 - y0, 16, 1, false);
  g.translate(0, (y0 + y1) / 2, 0);
  parts.push(plain(g));
  // (ribbing: a few raised rings, each an edge the ink picks out)
  for (let i = 0; i < ribs; i++) {
    const y = y0 + ((i + 0.5) / ribs) * (y1 - y0);
    const r = THREE.MathUtils.lerp(r0, r1, (y - y0) / (y1 - y0));
    const ring = new THREE.TorusGeometry(r, 0.0022, 4, 16);
    ring.rotateX(Math.PI / 2);
    ring.translate(0, y, 0);
    parts.push(plain(ring));
  }
  return merge(parts);
}

/** How far out a sleeve from `sleeveGeometry(r0, r1, len)` is at `y` along it (its fullness through the middle included) */
export function sleeveRadius(r0: number, r1: number, len: number, y: number) {
  const k = THREE.MathUtils.clamp(y / len, 0, 1);
  return THREE.MathUtils.lerp(r0, r1, k) * (1 + 0.06 * Math.sin(Math.PI * k));
}

/**
 * A stripe down a sleeve's side (the sleeve `sleeveGeometry(r0, r1, len)`): a thin strip `w` wide at angle `a` round
 * +y (0 is +x, π/2 is +z), from `y0` to `y1`, lying on the sleeve all the way along, however it tapers and fills out
 */
export function stripeGeometry(a: number, r0: number, r1: number, len: number, y0: number, y1: number, w = 0.01) {
  const g = new THREE.BoxGeometry(0.0024, y1 - y0, w, 1, 8, 1);
  g.translate(0, (y0 + y1) / 2, 0);
  const p = g.attributes.position as THREE.BufferAttribute;
  // (each row out to the sleeve's own radius there, a hair proud of it)
  for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + sleeveRadius(r0, r1, len, p.getY(i)) + 0.0014);
  g.computeVertexNormals();
  g.rotateY(-a);
  return plain(g);
}

/**
 * Where the elbow goes for a hand wanted at `target` from `shoulder` (a two-bone reach, lengths `upper` and
 * `fore`): the hand at the target when it's in reach, else as far as the straight arm goes towards it; the elbow
 * swung round the line from the shoulder towards `pole`. Fills `elbow` and `hand`.
 */
export function solveArm(
  shoulder: THREE.Vector3,
  target: THREE.Vector3,
  pole: THREE.Vector3,
  elbow: THREE.Vector3,
  hand: THREE.Vector3,
  upper = ARM.upper,
  fore = ARM.fore,
) {
  const dir = target.clone().sub(shoulder);
  let dist = dir.length();
  if (dist < 1e-6) dir.set(0, 0, -1);
  dir.normalize();
  // (never quite straight, so the elbow keeps its side; never folded through itself)
  dist = THREE.MathUtils.clamp(dist, Math.abs(upper - fore) + 0.02, (upper + fore) * 0.999);
  hand.copy(shoulder).addScaledVector(dir, dist);
  const a = (upper * upper + dist * dist - fore * fore) / (2 * dist);
  const h = Math.sqrt(Math.max(0, upper * upper - a * a));
  const side = pole.clone().addScaledVector(dir, -pole.dot(dir));
  if (side.lengthSq() < 1e-8) side.set(0, -1, 0).addScaledVector(dir, -dir.y);
  side.normalize();
  elbow.copy(shoulder).addScaledVector(dir, a).addScaledVector(side, h);
  return { elbow, hand };
}

/**
 * The turn of a piece reaching from `from` to `to` (+y along it), with +z as near `face` as it can be (the back of
 * the hand, or a sleeve's front): into `q`
 */
export function aimPiece(from: THREE.Vector3, to: THREE.Vector3, face: THREE.Vector3, q: THREE.Quaternion) {
  const y = to.clone().sub(from).normalize();
  const z = face.clone().addScaledVector(y, -face.dot(y));
  if (z.lengthSq() < 1e-8) z.set(0, 0, 1).addScaledVector(y, -y.z);
  z.normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  return q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

/**
 * The eye's frame in the world, from his head bone at `head` and his body's facing `forward` (level), `unit` the
 * world length of one of his body's units: x to his right, y up, -z the way he faces, as a camera's. Into `out`
 */
export function eyeFrame(head: THREE.Vector3, forward: THREE.Vector3, unit: number, out: THREE.Matrix4) {
  const f = new THREE.Vector3(forward.x, 0, forward.z);
  if (f.lengthSq() < 1e-9) f.set(0, 0, 1);
  f.normalize();
  const right = new THREE.Vector3().crossVectors(f, UP);
  const at = head.clone().addScaledVector(UP, EYE.up * unit).addScaledVector(f, EYE.fwd * unit);
  return out.makeBasis(right, UP, f.clone().negate()).setPosition(at);
}

/** One of his arms as the skeleton has it, in the world: the shoulder, elbow and hand bones, and which way the back of the hand faces */
export interface BodyJoints {
  shoulder: THREE.Vector3;
  elbow: THREE.Vector3;
  hand: THREE.Vector3;
  back: THREE.Vector3;
}

/** An arm laid in the eye's frame, in these metres: the shoulder, the elbow, the fist's wrist and the way its back faces */
export interface LaidArm {
  shoulder: THREE.Vector3;
  elbow: THREE.Vector3;
  wrist: THREE.Vector3;
  face: THREE.Vector3;
}
export const newLaidArm = (): LaidArm => ({ shoulder: new THREE.Vector3(), elbow: new THREE.Vector3(), wrist: new THREE.Vector3(), face: new THREE.Vector3() });

const toEye = new THREE.Matrix4();
const rotEye = new THREE.Matrix3();
const tA = new THREE.Vector3();
const tB = new THREE.Vector3();

/**
 * The first-person correction (the owner's call: the clips are made to read from behind him, and from his own eyes
 * their guard holds the fists at his chin, under and beside the eye, out of shot): with the guard up, each fist is
 * raised `lift`, drawn `pull` of the way in towards the middle, carried forward `reach` the more the arm is bent
 * (none at full stretch, where the clip already reaches), never nearer the eye than `near` (the clips bring a hand
 * back beside his face: from the eye it would fill the screen) and eased under `top` (`softTop()`: the uppercut's
 * fist would leave the top of the shot), the elbow solved again round towards his own.
 * These metres, the eye's frame.
 */
export const FP_FIX = { lift: 0.1, pull: 0.45, reach: 0.12, near: 0.3, top: -0.03, soft: 0.03 };
/** `y` eased under `top` (a soft minimum over `soft`): the uppercut's fist peaks at the eye's height instead of leaving the top of the shot, with no edge to slide along */
export const softTop = (y: number, top: number, soft: number) => -soft * Math.log(Math.exp(-y / soft) + Math.exp(-top / soft));
/**
 * Running with his hands down (the owner's calls, 2026-11: "a classic FPS pump", "his steps, a designed arc", loose
 * fists; then "his hands should just move up and down, but his whole arm locks out when sprinting"): his body sets
 * the timing (each arm's own swing, `pumpSwing()`), the arm a designed bob (`pumpArm()`): the fist rising from `low`
 * (its top just peeking over the bottom of the shot) to `high` in its lower corner and back, mostly up and down, the
 * elbow always bent (`pole`: down, back and out), higher and a touch bigger sprinting (`sprint`), lower and smaller
 * walking (`walk`: `walkLow`, `walkHigh`), the back of the loose fist facing out, thumb up (`face`), all from a
 * shoulder of its own (`shoulder`: his real one moves about the eye as he leans). For the arm on the right, the
 * eye's frame; the left mirrors it.
 */
export const PUMP = {
  shoulder: new THREE.Vector3(0.2, -0.21, 0.06),
  low: new THREE.Vector3(0.2, -0.33, -0.28),
  high: new THREE.Vector3(0.165, -0.19, -0.35),
  sprint: new THREE.Vector3(0.155, -0.15, -0.37),
  walkLow: new THREE.Vector3(0.215, -0.39, -0.27),
  walkHigh: new THREE.Vector3(0.2, -0.265, -0.31),
  /** (a touch forward through the middle of the bob, as a fist swings on a bent arm) */
  bulge: 0.02,
  pole: new THREE.Vector3(0.4, -0.7, 0.6),
  face: new THREE.Vector3(1, 0.3, 0.1),
};

/** How far out an arm laid in the eye's frame is (0 folded, 1 at full stretch) */
export const stretch = (l: LaidArm) => THREE.MathUtils.clamp(l.wrist.distanceTo(l.shoulder) / (ARM.upper + ARM.fore), 0, 1);

/**
 * His arm `j` (the world) read from the eye `eye` (`eyeFrame()`), `unit` the world length of one of his body's units,
 * into `out` in these metres: the fist's wrist set back along his forearm so its knuckles are where his are. `fix`
 * (0..1: the guard's share) lays the first-person correction (`FP_FIX`) on it without moving his body. `pull` (0..1)
 * scales the draw in towards the middle (less for the hand left in the guard while the other is out punching: the
 * punch has the middle).
 */
export function bodyArm(j: BodyJoints, eye: THREE.Matrix4, unit: number, out: LaidArm, fix = 0, pull = 1) {
  const k = BODY_TO_ARM / unit;
  toEye.copy(eye).invert();
  rotEye.setFromMatrix4(toEye);
  const put = (w: THREE.Vector3, o: THREE.Vector3) => o.copy(w).applyMatrix4(toEye).multiplyScalar(k);
  put(j.shoulder, out.shoulder);
  put(j.elbow, out.elbow);
  put(j.hand, tA);
  // (the fist's wrist: back from his hand bone along the forearm, by the fist's knuckles less his)
  const along = tB.copy(tA).sub(out.elbow).normalize();
  out.wrist.copy(out.elbow).addScaledVector(along, ARM.fore);
  out.face.copy(j.back).applyMatrix3(rotEye).normalize();
  if (fix > 0) {
    const bent = 1 - THREE.MathUtils.clamp(out.wrist.distanceTo(out.shoulder) / (ARM.upper + ARM.fore), 0, 1);
    const target = tA.set(-out.wrist.x * FP_FIX.pull * pull, FP_FIX.lift, -FP_FIX.reach * bent).multiplyScalar(fix).add(out.wrist);
    target.z = Math.min(target.z, THREE.MathUtils.lerp(target.z, -FP_FIX.near, fix));
    target.y = THREE.MathUtils.lerp(target.y, softTop(target.y, FP_FIX.top, FP_FIX.soft), fix);
    // (round towards his own elbow: its side of the line from the shoulder to the wrist)
    const pole = tB.copy(out.elbow).sub(out.shoulder).addScaledVector(out.wrist.clone().sub(out.shoulder), -0.5);
    solveArm(out.shoulder, target, pole, out.elbow, out.wrist);
  }
  return out;
}

/**
 * One arm's swing from his body (-1 back, 1 forward), the timing of the pump: how far ahead of the other arm its wrist
 * is (`ahead`: this arm's wrist forward of the other's, in these metres; the two swing opposite, so this stays centred
 * whatever his lean), against `amp`, the size of his swing as it's been lately (the caller keeps it)
 */
export function pumpSwing(ahead: number, amp: number) {
  return THREE.MathUtils.clamp(ahead / Math.max(amp * 1.4, 0.02), -1, 1);
}

const pDir = new THREE.Vector3();
const pFwd = new THREE.Vector3();
const pBack = new THREE.Vector3();

/**
 * The pump's arm on side `side` (1 the right of the eye, -1 the left), swung `swing` (-1 down .. 1 up, `pumpSwing()`),
 * `sprint` (0 a jog .. 1 a sprint) of the way to the sprint's height and `walk` (0 a jog .. 1 a walk) of the way down
 * to the walk's: into `out` (its own shoulder, the elbow bent, the wrist on its bob, the back of the fist out)
 */
export function pumpArm(side: number, swing: number, sprint: number, out: LaidArm, walk = 0) {
  side = Math.sign(side) || 1;
  const mirror = (v: THREE.Vector3, o: THREE.Vector3) => o.set(v.x * side, v.y, v.z);
  const low = mirror(PUMP.low, pBack).lerp(mirror(PUMP.walkLow, pDir), walk);
  const high = mirror(PUMP.high, pFwd).lerp(mirror(PUMP.sprint, pDir), sprint).lerp(mirror(PUMP.walkHigh, pDir), walk);
  // (eased at the ends, as an arm slows to turn at the top and the bottom of its swing)
  const t = THREE.MathUtils.smoothstep((swing + 1) / 2, 0, 1);
  const target = tA.copy(low).lerp(high, t);
  target.z -= PUMP.bulge * Math.sin(Math.PI * t);
  const shoulder = mirror(PUMP.shoulder, out.shoulder);
  solveArm(shoulder, target, mirror(PUMP.pole, tB), out.elbow, out.wrist);
  mirror(PUMP.face, out.face).normalize();
  return out;
}

/**
 * `a` eased `w` (0..1) of the way to `b`: the shoulder, the wrist and the way the fist faces between them, the elbow
 * solved again round between theirs (so the arm keeps its lengths), into `a`
 */
export function blendArm(a: LaidArm, b: LaidArm, w: number) {
  if (w <= 0) return a;
  const target = tA.copy(a.wrist).lerp(b.wrist, w);
  const mid = (l: LaidArm, o: THREE.Vector3) => o.copy(l.elbow).sub(l.shoulder).addScaledVector(tmpS.copy(l.wrist).sub(l.shoulder), -0.5);
  const pole = mid(a, tB).lerp(mid(b, pDir), w);
  a.face.lerp(b.face, w).normalize();
  a.shoulder.lerp(b.shoulder, w);
  solveArm(a.shoulder, target, pole, a.elbow, a.wrist);
  return a;
}
const tmpS = new THREE.Vector3();

/**
 * A punch's feel in first person (the owner's call, 2026-11: "subtle"): how far the view turns with the shoulder
 * behind each punch (radians, + to the left: a left hand turns him right, a right hand left) and leans with it (+ up),
 * how long a landed hit holds the fight (seconds: about three frames) and the view's kick forward (tiles, before his
 * scale) and how long it takes
 */
export const PUNCH_FEEL = {
  turn: { jab: -0.018, cross: 0.032, hook: -0.045, uppercut: 0.026 },
  lean: { jab: -0.008, cross: -0.014, hook: -0.01, uppercut: 0.022 },
  stop: 0.05,
  kick: 0.035,
  kickTime: 0.14,
};
/** A punch's share at frame `f` (0..1): up over its start-up, held through the active frames, eased back over the recovery */
export function punchEnvelope(f: number, startup: number, active: number, recovery: number) {
  if (f < startup) return THREE.MathUtils.smoothstep(f / startup, 0, 1);
  if (f < startup + active) return 1;
  return 1 - THREE.MathUtils.smoothstep((f - startup - active) / recovery, 0, 1);
}
