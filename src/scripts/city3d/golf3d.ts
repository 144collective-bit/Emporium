/*
 * The golf course drawn (docs/golf-plan.md Phase 2; the layout is golf.ts, the ground golfground.ts as the city reads it,
 * golflift.ts), a district loaded as you approach (districts.ts `LAZY_DISTRICTS`), as sites (tilework.ts):
 *
 * - **The turf**: what's mown over the course's grass, in one texture (`TURF`: the first cut, the fairways in stripes,
 *   the fringes, the greens in finer stripes, the tees, the bunkers' sand with its lip; clear everywhere else and over
 *   the water), laid on the course's ground's own triangles a hair over the grass (`turfMesh()`: only where it shows,
 *   on golflift.ts `golfMesh()` as the grass is, near and far, so it never sinks into it nor parts from a neighbour),
 *   its edges the texture's (alpha-tested), so they're crisp however coarse the triangles.
 * - **The water**: each lake at its level (golflift.ts `golfWater()`), the city's water shader, on the main thread.
 *
 * The course's grass itself (its rough and native grass, its hills) is the boot's (world.ts), so the course stands
 * before this chunk comes; the woods between the holes are the outskirts' trees (landuse.ts keeps them off the play).
 */
import * as THREE from 'three';
import { Batch, canvasTex, siteMat, toon } from './kit';
import { site } from './tilework';
import { COVER } from './palette';
import { waterMat } from './world';
import { TILE } from './tiles';
import { GOLF_RECT, golfIn, golfLift, golfMesh, golfWater } from './golflift';
import {
  FIRST_CUT,
  FRINGE,
  HOLES,
  LAKES,
  TEE,
  along,
  bunkersOf,
  ellipseAt,
  fairwayEnd,
  fairwayHalf,
  framePt,
  greenOf,
  lakeAt,
  nearestOn,
  teeOf,
  type Hole,
  type Lake,
  type Pt,
} from './golf';

export const SELF = import.meta.url;

type Rect = [number, number, number, number];

/* ---------- The turf's texture ---------- */

/** Pixels a tile (phones get half: canvasTex) */
export const TURF_SCALE = 2;
const [X0, Z0, X1, Z1] = GOLF_RECT;
/** How far apart a fairway's mown stripes are (tiles along it), and a green's */
const FAIRWAY_STRIPE = 7;
const GREEN_STRIPE = 1.8;
/** A bunker's lip round its sand */
const LIP = 0.35;

/** A lake's shore, `n` points round */
export function shoreOf(l: Lake, n = 72): Pt[] {
  const [c, s] = [Math.cos(l.turn), Math.sin(l.turn)];
  const out: Pt[] = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const [u, v] = [Math.cos(a) * l.r[0], Math.sin(a) * l.r[1]];
    const [dx, dz] = [u * c - v * s, u * s + v * c];
    // (lakeAt() is its distance from the middle over the shore's in that direction: one step finds the shore)
    const r = 1 / lakeAt(l, l.at[0] + dx, l.at[1] + dz);
    out.push([l.at[0] + dx * r, l.at[1] + dz * r]);
  }
  return out;
}
/** A fairway's outline (its edges every 2 along, `pad` past its half width), and its ends' round caps */
function fairwayOutline(h: Hole, pad: number): { edge: Pt[]; caps: [Pt, number][] } {
  const f = h.fairway!;
  const end = fairwayEnd(h);
  const left: Pt[] = [];
  const right: Pt[] = [];
  const ss: number[] = [];
  for (let s = f.from; s < end; s += 2) ss.push(s);
  ss.push(end);
  for (const s of ss) {
    const w = fairwayHalf(h, s) + pad;
    left.push(framePt(h, s, -w));
    right.push(framePt(h, s, w));
  }
  return { edge: [...left, ...right.reverse()], caps: [[along(h, f.from).at, fairwayHalf(h, f.from) + pad], [along(h, end).at, fairwayHalf(h, end) + pad]] };
}

/** Draws the turf into a canvas `w` x `h` over the course's grid's box */
export function drawTurf(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const [sx, sz] = [w / (X1 - X0), h / (Z1 - Z0)];
  const P = ([x, z]: Pt): Pt => [(x - X0) * sx, (z - Z0) * sz];
  const poly = (pts: Pt[]) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(...P(p)) : ctx.moveTo(...P(p))));
    ctx.closePath();
  };
  const circle = ([x, z]: Pt, r: number) => {
    ctx.moveTo(...P([x + r, z]));
    ctx.arc((x - X0) * sx, (z - Z0) * sz, r * sx, 0, Math.PI * 2);
  };
  const ellipse = (c: Pt, dir: Pt, r: Pt) => {
    ctx.beginPath();
    ctx.ellipse((c[0] - X0) * sx, (c[1] - Z0) * sz, r[0] * sx, r[1] * sz, Math.atan2(dir[1], dir[0]), 0, Math.PI * 2);
  };
  ctx.clearRect(0, 0, w, h);
  // The first cut round each fairway, then the fairway, mown in stripes across it
  for (const hole of HOLES) {
    if (!hole.fairway) continue;
    const cut = fairwayOutline(hole, FIRST_CUT);
    ctx.fillStyle = COVER.firstCut;
    poly(cut.edge);
    ctx.fill();
    ctx.beginPath();
    for (const [c, r] of cut.caps) circle(c, r);
    ctx.fill();
  }
  for (const hole of HOLES) {
    if (!hole.fairway) continue;
    const fw = fairwayOutline(hole, 0);
    ctx.save();
    ctx.beginPath();
    fw.edge.forEach((p, i) => (i ? ctx.lineTo(...P(p)) : ctx.moveTo(...P(p))));
    ctx.closePath();
    for (const [c, r] of fw.caps) circle(c, r);
    ctx.fillStyle = COVER.fairway;
    ctx.fill('nonzero');
    ctx.clip('nonzero');
    ctx.fillStyle = COVER.fairwayStripe;
    for (let s = hole.fairway.from - 20, k = 0; s < fairwayEnd(hole) + 20; s += FAIRWAY_STRIPE, k++) {
      if (k % 2) continue;
      poly([framePt(hole, s, -30), framePt(hole, s + FAIRWAY_STRIPE, -30), framePt(hole, s + FAIRWAY_STRIPE, 30), framePt(hole, s, 30)]);
      ctx.fill();
    }
    ctx.restore();
  }
  // The tees
  for (const hole of HOLES) {
    const t = teeOf(hole);
    const at = (u: number, v: number): Pt => [t.at[0] + t.dir[0] * u - t.dir[1] * v, t.at[1] + t.dir[1] * u + t.dir[0] * v];
    ctx.fillStyle = COVER.tee;
    poly([at(-TEE[0], -TEE[1]), at(TEE[0], -TEE[1]), at(TEE[0], TEE[1]), at(-TEE[0], TEE[1])]);
    ctx.fill();
  }
  // The fringes, then the greens in fine stripes
  for (const hole of HOLES) {
    const g = greenOf(hole);
    ctx.fillStyle = COVER.fringe;
    ellipse(g.at, g.dir, [hole.green[0] + FRINGE, hole.green[1] + FRINGE]);
    ctx.fill();
  }
  for (const hole of HOLES) {
    const g = greenOf(hole);
    ctx.save();
    ellipse(g.at, g.dir, hole.green);
    ctx.fillStyle = COVER.green;
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = COVER.greenStripe;
    const R = Math.max(...hole.green) + 1;
    for (let u = -R, k = 0; u < R; u += GREEN_STRIPE, k++) {
      if (k % 2) continue;
      const at = (a: number, v: number): Pt => [g.at[0] + g.dir[0] * a - g.dir[1] * v, g.at[1] + g.dir[1] * a + g.dir[0] * v];
      poly([at(u, -R), at(u + GREEN_STRIPE, -R), at(u + GREEN_STRIPE, R), at(u, R)]);
      ctx.fill();
    }
    ctx.restore();
  }
  // The bunkers: the lip, then the sand
  for (const hole of HOLES)
    for (const b of bunkersOf(hole)) {
      ctx.fillStyle = COVER.sandLip;
      ellipse(b.at, b.dir, [b.r[0] + LIP, b.r[1] + LIP]);
      ctx.fill();
      ctx.fillStyle = COVER.sand;
      ellipse(b.at, b.dir, b.r);
      ctx.fill();
    }
  // Nothing mown over the water
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000000';
  for (const l of LAKES) {
    poly(shoreOf(l));
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

/* ---------- Where the turf shows ---------- */

/** Whether anything's mown within `pad` of x, z (a fairway with its first cut, a green with its fringe, a tee, a
 * bunker with its lip) */
export function mownNear(x: number, z: number, pad: number) {
  for (const h of HOLES) {
    const n = nearestOn(h, x, z);
    if (n.d > Math.max(h.fairway ? h.fairway.half + 4 : 0, ...h.green, TEE[0]) + FRINGE + FIRST_CUT + 16 + pad) continue;
    if (h.fairway) {
      const s = Math.max(h.fairway.from, Math.min(fairwayEnd(h), n.s));
      const p = along(h, s).at;
      const reach = fairwayHalf(h, s) + FIRST_CUT + pad;
      if (n.s >= h.fairway.from && n.s <= fairwayEnd(h) ? n.d <= reach : Math.hypot(x - p[0], z - p[1]) <= reach) return true;
    }
    const g = greenOf(h);
    if ((ellipseAt(g.at, g.dir, h.green, x, z) - 1) * Math.min(...h.green) <= FRINGE + pad) return true;
    const t = teeOf(h);
    const [dx, dz] = [x - t.at[0], z - t.at[1]];
    if (Math.abs(dx * t.dir[0] + dz * t.dir[1]) <= TEE[0] + pad && Math.abs(-dx * t.dir[1] + dz * t.dir[0]) <= TEE[1] + pad) return true;
    for (const b of bunkersOf(h)) if ((ellipseAt(b.at, b.dir, b.r, x, z) - 1) * Math.min(...b.r) <= LIP + pad) return true;
  }
  return false;
}
/** How far the turf is laid over the grass as drawn (the same near and far: a step where a tile drawn near meets one
 * drawn far would be inked) */
export const TURF_LIFT = 0.04;

/** The turf over a box, near or far: the course's ground's own triangles (golflift.ts `golfMesh()`, as the grass is
 * drawn on, so it never sinks into it nor parts from its neighbour's) where it shows, `lift` over the grass, its uv the
 * texture's */
export function turfMesh(r: Rect, far: boolean, lift: number): THREE.BufferGeometry | null {
  const m = golfMesh(r, far);
  const at = new Map<number, number>();
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const vert = (k: number) => {
    let v = at.get(k);
    if (v === undefined) {
      const [x, z] = [m.xz[k * 2], m.xz[k * 2 + 1]];
      v = pos.length / 3;
      pos.push(x, golfLift(x, z) + lift, z);
      uv.push((x - X0) / (X1 - X0), 1 - (z - Z0) / (Z1 - Z0));
      at.set(k, v);
    }
    return v;
  };
  for (let t = 0; t < m.tri.length; t += 3) {
    const ks = [m.tri[t], m.tri[t + 1], m.tri[t + 2]];
    const cx = (m.xz[ks[0] * 2] + m.xz[ks[1] * 2] + m.xz[ks[2] * 2]) / 3;
    const cz = (m.xz[ks[0] * 2 + 1] + m.xz[ks[1] * 2 + 1] + m.xz[ks[2] * 2 + 1]) / 3;
    const reach = Math.max(...ks.map((k) => Math.hypot(m.xz[k * 2] - cx, m.xz[k * 2 + 1] - cz)));
    if (!mownNear(cx, cz, reach + 0.5)) continue;
    idx.push(...ks.map(vert));
  }
  if (!idx.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ---------- The district ---------- */

let TURF: THREE.Texture | null = null;
let TURF_MAT: THREE.Material | null = null;
/** The turf's material (made once: its texture painted, or downloaded as the build made it) */
function turfMat() {
  if (!TURF_MAT) {
    TURF = canvasTex(Math.round((X1 - X0) * TURF_SCALE), Math.round((Z1 - Z0) * TURF_SCALE), drawTurf);
    TURF.anisotropy = 4;
    TURF_MAT = siteMat('golf-turf', toon('#ffffff', { map: TURF, alphaTest: 0.5 }));
  }
  return TURF_MAT;
}

export function register({ scene }: { low: boolean; scene: THREE.Scene | null }) {
  const mat = turfMat();
  // The turf, a site a tile, over every tile the course's land comes into
  for (let tx = Math.floor(X0 / TILE) * TILE; tx < X1; tx += TILE)
    for (let tz = Math.floor(Z0 / TILE) * TILE; tz < Z1; tz += TILE) {
      const r: Rect = [tx, tz, tx + TILE, tz + TILE];
      if (!golfIn(...r)) continue;
      site(`golf turf ${tx} ${tz}`, r, (into) => {
        const b = new Batch();
        const near = turfMesh(r, false, TURF_LIFT);
        const far = turfMesh(r, true, TURF_LIFT);
        if (near) b.detail(() => b.add(near, mat), 'near');
        if (far) b.detail(() => b.add(far, mat), 'far');
        b.build(into, { cast: false, receive: true });
      });
    }
  // The lakes' water, on the main thread (the city's water shader)
  if (scene)
    LAKES.forEach((l, i) => {
      const shape = new THREE.Shape(shoreOf(l, 96).map(([x, z]) => new THREE.Vector2(x, -z)));
      const water = new THREE.Mesh(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, golfWater(i), 0), waterMat);
      water.name = `golf ${l.id} water`;
      water.matrixAutoUpdate = false;
      water.updateMatrix();
      scene.add(water);
    });
}
