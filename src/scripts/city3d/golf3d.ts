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
 * - **The cart paths** in the turf too (golf.ts `PATHS`, Phase 3), under what's mown.
 * - **Clubhouse Drive** (Phase 3): asphalt over the ground from the country road up to the grounds (`driveMesh()`), its
 *   lamps (`DRIVE_LAMPS`), stone pillars where it comes onto the club's land.
 * - **The club's edge** (Phase 3, near only): a white post-and-rail fence round it (`FENCE_RUNS`: open where the drive
 *   and the footpath come in, posts either side of the footpath's way), reeds round the lakes (`reedsOf()`).
 *
 * - **Its life** (Phase 5): golflife3d.ts `registerGolfLife()`, what stands on the course and its flags.
 *
 * The course's grass itself (its rough and native grass, its hills) is the boot's (world.ts), so the course stands
 * before this chunk comes; the woods between the holes are the outskirts' trees (landuse.ts keeps them off the play).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Batch, FONT_DISPLAY, canvasTex, fx, lit, neon, paintsHalf, siteMat, toon } from './kit';
import { hip } from './roofs3d';
import { site } from './tilework';
import { COVER, LAMP, LAMP_POST, ROAD, STONE } from './palette';
import { waterMat } from './world';
import { TILE } from './tiles';
import { registerGolfLife } from './golflife3d';
import type { Tick } from './world';
import { CLUB_NAME, DRIVE, DRIVE_HALF, FOOTPATH, GOLF_CLUBHOUSE, GOLF_RECT, PATH_HALF, clubLevel, golfIn, golfLift, golfMesh, golfWater } from './golflift';
import {
  COURSE,
  FIRST_CUT,
  PATHS,
  fromPaths,
  insetOf,
  surfaceAt,
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

/**
 * Pixels a tile, on every tier: one (the owner's call, 2026-11-24, to keep the full tier's textures in their budget).
 * Phones ask for two, as the texture is big enough for them to paint it at half (canvasTex), so both get one.
 */
export const TURF_SCALE = 1;
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
  // The cart paths (and the footpath's stretch on the course), under all that's mown
  ctx.strokeStyle = STONE.path;
  ctx.lineWidth = 2 * PATH_HALF * sx;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const line of [...PATHS.map((p) => p.pts), FOOTPATH]) {
    ctx.beginPath();
    line.forEach((p, i) => (i ? ctx.lineTo(...P(p)) : ctx.moveTo(...P(p))));
    ctx.stroke();
  }
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
  // The clubhouse's putting green (docs/golf-plan.md Phase 4), its fringe and stripes
  {
    const { at, r } = GOLF_CLUBHOUSE.putting;
    ctx.fillStyle = COVER.fringe;
    ellipse(at, [1, 0], [r[0] + FRINGE, r[1] + FRINGE]);
    ctx.fill();
    ctx.save();
    ellipse(at, [1, 0], r);
    ctx.fillStyle = COVER.green;
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = COVER.greenStripe;
    for (let u = -r[0], k = 0; u < r[0]; u += GREEN_STRIPE, k++) if (!(k % 2)) ctx.fillRect((at[0] + u - X0) * sx, (at[1] - r[1] - Z0) * sz, GREEN_STRIPE * sx, 2 * r[1] * sz);
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
  if (fromPaths(x, z) <= PATH_HALF + pad) return true;
  const { at, r } = GOLF_CLUBHOUSE.putting;
  if ((Math.hypot((x - at[0]) / r[0], (z - at[1]) / r[1]) - 1) * Math.min(...r) <= FRINGE + pad) return true;
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
    const k = TURF_SCALE * (paintsHalf() ? 2 : 1);
    TURF = canvasTex(Math.round((X1 - X0) * k), Math.round((Z1 - Z0) * k), drawTurf);
    TURF.anisotropy = 4;
    TURF_MAT = siteMat('golf-turf', toon('#ffffff', { map: TURF, alphaTest: 0.5 }));
  }
  return TURF_MAT;
}

/* ---------- Clubhouse Drive ---------- */

/** How far the drive's asphalt is laid over the ground */
export const DRIVE_LIFT = 0.05;
/** A line resampled every `step` along it (its ends kept) */
function resample(line: Pt[], step: number): Pt[] {
  const out: Pt[] = [line[0]];
  for (let k = 1; k < line.length; k++) {
    const [a, b] = [line[k - 1], line[k]];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let i = 1; i <= n; i++) out.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
  }
  return out;
}
/** The drive's asphalt between `from` and `to` along its resampled points: a strip a tile a step, on the ground */
export function driveMesh(pts: Pt[], half = DRIVE_HALF, lift = DRIVE_LIFT): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const across = 3;
  pts.forEach((p, k) => {
    const [a, b] = [pts[Math.max(0, k - 1)], pts[Math.min(pts.length - 1, k + 1)]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const [nx, nz] = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
    for (let i = 0; i < across; i++) {
      const o = -half + (2 * half * i) / (across - 1);
      const [x, z] = [p[0] + nx * o, p[1] + nz * o];
      pos.push(x, golfLift(x, z) + lift, z);
    }
    if (k)
      for (let i = 0; i + 1 < across; i++) {
        const [a0, a1, b0, b1] = [(k - 1) * across + i, (k - 1) * across + i + 1, k * across + i, k * across + i + 1];
        idx.push(a0, b0, a1, a1, b0, b1);
      }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  // (wound to face up whichever way the line runs)
  const n = new THREE.Vector3();
  g.computeVertexNormals();
  n.fromBufferAttribute(g.getAttribute('normal') as THREE.BufferAttribute, 0);
  if (n.y < 0) {
    for (let t = 0; t < idx.length; t += 3) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  return g;
}
/** The drive's lamps: along it every so far, on its east side (the course's), their heads' height */
export const DRIVE_LAMPS: { at: Pt; dir: Pt }[] = (() => {
  const pts = resample(DRIVE, 1);
  const out: { at: Pt; dir: Pt }[] = [];
  for (let k = 30; k < pts.length - 10; k += 70) {
    const [a, b] = [pts[k - 1], pts[k + 1]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const [ux, uz] = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    // (east of a drive running north is its right: -uz, ux)
    out.push({ at: [pts[k][0] - uz * (DRIVE_HALF + 0.9), pts[k][1] + ux * (DRIVE_HALF + 0.9)], dir: [-uz, ux] });
  }
  return out;
})();
export const LAMP_H = 3.2;

/* ---------- The club's edge ---------- */

/** Where a line crosses the club's edge (the drive, the footpath): a gap in the fence */
function crossings(line: Pt[]): Pt[] {
  const out: Pt[] = [];
  const pts = resample(line, 0.5);
  for (let i = 1; i < pts.length; i++) if (insetOf(...pts[i - 1]) <= 0 !== insetOf(...pts[i]) <= 0) out.push(pts[i]);
  return out;
}
/** Where the fence is open, and how wide either side of the middle */
export const FENCE_GAPS: { at: Pt; half: number; kind: 'drive' | 'path' }[] = [
  ...crossings(DRIVE).map((at) => ({ at, half: DRIVE_HALF + 1.2, kind: 'drive' as const })),
  ...crossings(FOOTPATH).map((at) => ({ at, half: PATH_HALF + 0.7, kind: 'path' as const })),
];
/** The fence's posts' spacing, height and the rails' heights */
export const FENCE = { gap: 2.5, h: 1.05, rails: [0.45, 0.88] };
/** The fence's runs: the club's edge, broken at the gaps */
export const FENCE_RUNS: Pt[][] = (() => {
  const pts = resample([...COURSE, COURSE[0]], FENCE.gap);
  const runs: Pt[][] = [];
  let run: Pt[] = [];
  for (const p of pts) {
    if (FENCE_GAPS.some((g) => Math.hypot(p[0] - g.at[0], p[1] - g.at[1]) < g.half)) {
      if (run.length > 1) runs.push(run);
      run = [];
    } else run.push(p);
  }
  if (run.length > 1) runs.push(run);
  return runs;
})();

/** The reeds round a lake: clumps along its shore where the bank isn't in play (a tee, a green, a fairway, a path) */
export function reedsOf(l: Lake): Pt[] {
  const shore = shoreOf(l, Math.round((Math.PI * (l.r[0] + l.r[1])) / 2.2));
  return shore.filter(([x, z], k) => {
    const [dx, dz] = [x - l.at[0], z - l.at[1]];
    const d = Math.hypot(dx, dz) || 1;
    const out: Pt = [x + (dx / d) * 1.5, z + (dz / d) * 1.5];
    return k % 3 !== 1 && ['rough', 'native'].includes(surfaceAt(...out) ?? '');
  });
}

/* ---------- Knob Hill Golf Club's clubhouse (Phase 4) ---------- */

/** The name over the porch: gold capitals on the club's green, a fine gold rule round it */
const NAME_W = 12;
const NAME_H = 1.1;
let NAME_MAT: THREE.Material | null = null;
function nameMat() {
  NAME_MAT ??= siteMat(
    'golf-name',
    lit(
      new THREE.MeshBasicMaterial({
        map: canvasTex(1024, 96, (c, w, h) => {
          c.fillStyle = '#1f4a33';
          c.fillRect(0, 0, w, h);
          c.strokeStyle = '#d9b45a';
          c.lineWidth = h * 0.05;
          c.strokeRect(h * 0.08, h * 0.08, w - h * 0.16, h - h * 0.16);
          c.fillStyle = '#e6c46a';
          c.font = `bold ${Math.round(h * 0.56)}px ${FONT_DISPLAY}`;
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText(CLUB_NAME, w / 2, h * 0.54);
        }),
      }),
      0.95,
      1.25
    )
  );
  return NAME_MAT;
}
/** A box from corner to corner (any order) */
const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, m: THREE.Material) => b.box(Math.min(x0, x1), y0, Math.min(z0, z1), Math.abs(x1 - x0), y1 - y0, Math.abs(z1 - z0), m);
/** A flat rect laid over the grounds */
const flatRect = (b: Batch, r: Rect, y: number, m: THREE.Material) => b.add(new THREE.PlaneGeometry(r[2] - r[0], r[3] - r[1]).rotateX(-Math.PI / 2).translate((r[0] + r[2]) / 2, y, (r[1] + r[3]) / 2), m);

/** The clubhouse and what stands round it on the grounds, into a Batch (a site's) */
export function drawClubhouse(b: Batch, low: boolean) {
  const C = GOLF_CLUBHOUSE;
  const y0 = clubLevel();
  const { ground, upper } = C.storey;
  const top = y0 + ground + upper;
  const wall = toon('#efe7d6');
  const trim = toon('#fbf8f0');
  const roof = toon('#2f5a3e');
  // (lit at night, warm: the course itself stays dark)
  const glass = siteMat('golf-window', lit(toon('#33465c', { emissive: '#ffd59a' }), 0, 0.8));
  const pave = toon(STONE.paving);
  const asphalt = toon(ROAD.asphalt);
  const line = toon(ROAD.line);
  const timber = toon('#7a5b40');
  const cart = toon('#f1ede2');
  const canopy = toon('#2f6a3a');
  const iron = toon(LAMP_POST.black);
  const mat = toon('#3f8a4c');
  const net = siteMat('golf-net', toon('#20232c', { transparent: true, opacity: 0.32, depthWrite: false }));
  const [hx0, hz0, hx1, hz1] = C.house;
  // The paving: round the house, the terrace, the porch, the walk from the car park
  flatRect(b, [hx0 - 1.2, hz0 - 0.6, hx1 + 1.2, hz1 + 1.2], y0 + 0.02, pave);
  flatRect(b, C.terrace, y0 + 0.025, pave);
  flatRect(b, [C.porch[0], C.porch[1], C.porch[2], C.carpark[1]], y0 + 0.025, pave);
  // The house: two storeys, a cornice between them and under the eaves, windows all round, the door in the porch
  box(b, hx0, y0, hz0, hx1, top, hz1, wall);
  box(b, hx0 - 0.08, y0 + ground - 0.12, hz0 - 0.08, hx1 + 0.08, y0 + ground + 0.08, hz1 + 0.08, trim);
  box(b, hx0 - 0.1, top - 0.18, hz0 - 0.1, hx1 + 0.1, top, hz1 + 0.1, trim);
  for (const [ya, hgt] of [[y0 + 0.9, 1.5], [y0 + ground + 0.6, 1.3]] as [number, number][]) {
    for (let x = hx0 + 2; x < hx1 - 1; x += 2.6) {
      // (the front's ground floor is the porch's: its doors there)
      if (ya < y0 + ground && x > C.porch[0] && x < C.porch[2]) continue;
      box(b, x, ya, hz1, x + 1.2, ya + hgt, hz1 + 0.05, glass);
      box(b, x, ya, hz0 - 0.05, x + 1.2, ya + hgt, hz0, glass);
    }
    for (let z = hz0 + 2; z < hz1 - 1; z += 2.6) {
      box(b, hx0 - 0.05, ya, z, hx0, ya + hgt, z + 1.2, glass);
      box(b, hx1, ya, z, hx1 + 0.05, ya + hgt, z + 1.2, glass);
    }
  }
  // (the terrace's glass doors along the back, onto the course)
  box(b, hx0 + 4, y0 + 0.05, hz0 - 0.05, hx1 - 4, y0 + 2.4, hz0, glass);
  const [r, soffit] = hip(hx0, hz1, hx1, hz0, top, C.roof, 0.5);
  b.add(r, roof);
  b.add(soffit, trim);
  // The porch: four columns, its roof, the doors under it, the club's name over its front
  const [px0, pz0, px1, pz1] = C.porch;
  for (let k = 0; k < 4; k++) {
    const x = px0 + 1 + ((px1 - px0 - 2) * k) / 3;
    b.add(new THREE.CylinderGeometry(0.2, 0.24, ground, 10).translate(x, y0 + ground / 2, pz1 - 0.25), trim);
  }
  box(b, px0 - 0.3, y0 + ground, pz0, px1 + 0.3, y0 + ground + 0.35, pz1 + 0.2, trim);
  box(b, (px0 + px1) / 2 - 1.2, y0 + 0.05, hz1, (px0 + px1) / 2 + 1.2, y0 + 2.5, hz1 + 0.06, glass);
  b.add(new THREE.PlaneGeometry(NAME_W, NAME_H).translate((px0 + px1) / 2, y0 + ground + 0.35 + NAME_H / 2 + 0.05, pz1 + 0.22), nameMat());
  // The terrace: a rail along its edge; tables under umbrellas (near only)
  const [tx0, tz0, tx1] = C.terrace;
  box(b, tx0, y0 + 0.95, tz0, tx1, y0 + 1.02, tz0 + 0.06, trim);
  for (let x = tx0 + 1; x <= tx1 - 0.9; x += 2) box(b, x, y0, tz0, x + 0.08, y0 + 0.95, tz0 + 0.08, trim);
  b.detail(() => {
    for (let x = tx0 + 3; x < tx1 - 2; x += 5) {
      const z = (tz0 + C.terrace[3]) / 2;
      b.add(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 12).translate(x, y0 + 0.75, z), trim);
      b.add(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 5).translate(x, y0 + 1.1, z), iron);
      b.add(new THREE.ConeGeometry(1.3, 0.45, 8, 1, true).translate(x, y0 + 2.3, z), canopy);
    }
  });
  // The car park: asphalt, its bays' lines either side of the aisle
  const [cx0, cz0, cx1, cz1] = C.carpark;
  flatRect(b, C.carpark, y0 + 0.03, asphalt);
  for (const [za, zb] of [[cz0, cz0 + 5], [cz1 - 5, cz1]])
    for (let x = cx0 + 0.5; x <= cx1 - 0.5; x += 2.6) box(b, x - 0.06, y0 + 0.04, za + 0.3, x + 0.06, y0 + 0.05, zb - 0.3, line);
  // The cart shed: a green roof on posts, a back wall, its carts in a row
  const [sx0, sz0, sx1, sz1] = C.shed;
  box(b, sx0, y0 + 2.4, sz0, sx1, y0 + 2.6, sz1, canopy);
  box(b, sx0, y0, sz0, sx1, y0 + 2.4, sz0 + 0.2, timber);
  for (const [x, z] of [[sx0, sz1], [sx1, sz1], [sx0, sz0], [sx1, sz0]]) box(b, x - 0.1, y0, z - 0.1, x + 0.1, y0 + 2.4, z + 0.1, timber);
  for (let x = sx0 + 1.4; x < sx1 - 1; x += 2.4) {
    const z = (sz0 + sz1) / 2;
    box(b, x - 0.5, y0 + 0.25, z - 1, x + 0.5, y0 + 0.75, z + 1, cart);
    box(b, x - 0.5, y0 + 1.6, z - 0.7, x + 0.5, y0 + 1.68, z + 1, canopy);
    for (const dz of [-0.65, 0.9]) for (const dx of [-0.45, 0.45]) box(b, x + dx - 0.02, y0 + 0.75, z + dz - 0.02, x + dx + 0.02, y0 + 1.6, z + dz + 0.02, iron);
    for (const dz of [-0.65, 0.65]) for (const dx of [-0.5, 0.5]) b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.12, low ? 6 : 10).rotateZ(Math.PI / 2).translate(x + dx, y0 + 0.2, z + dz), iron);
  }
  // The practice nets: three bays, a frame of posts, the nets hung round, a mat in each
  const [nx0, nz0, nx1, nz1] = C.nets;
  for (let z = nz0; z <= nz1 + 1e-6; z += (nz1 - nz0) / 3) {
    for (const x of [nx0, nx1]) box(b, x - 0.07, y0, z - 0.07, x + 0.07, y0 + 3, z + 0.07, iron);
    box(b, nx0, y0 + 2.95, z - 0.05, nx1, y0 + 3.02, z + 0.05, iron);
    b.add(new THREE.PlaneGeometry(nx1 - nx0, 3).translate((nx0 + nx1) / 2, y0 + 1.5, z), net);
  }
  b.add(new THREE.PlaneGeometry(nz1 - nz0, 3).rotateY(Math.PI / 2).translate(nx0, y0 + 1.5, (nz0 + nz1) / 2), net);
  b.add(new THREE.PlaneGeometry(nx1 - nx0, nz1 - nz0).rotateX(-Math.PI / 2).translate((nx0 + nx1) / 2, y0 + 3, (nz0 + nz1) / 2), net);
  for (let k = 0; k < 3; k++) {
    const z = nz0 + ((nz1 - nz0) * (k + 0.5)) / 3;
    box(b, nx1 - 2.2, y0 + 0.03, z - 0.8, nx1 - 0.6, y0 + 0.06, z + 0.8, mat);
  }
  // The putting green's flags (the green's in the turf)
  b.detail(() => {
    const { at, r } = C.putting;
    for (const [u, v] of [[-0.55, -0.3], [0.1, 0.4], [0.6, -0.2]]) {
      const [x, z] = [at[0] + u * r[0], at[1] + v * r[1]];
      b.add(new THREE.CylinderGeometry(0.025, 0.025, 1, 5).translate(x, y0 + 0.5, z), trim);
      box(b, x, y0 + 0.75, z, x + 0.35, y0 + 0.97, z + 0.02, toon('#e23b3b'));
    }
  });
}

export function register({ low, scene, tick }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
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
        // (out of the ink's pre-pass, kit.ts `fx()`: it draws every mesh solid, the texture's clear parts too, so the
        // turf's triangles came out as ink zig-zags across the rough; the turf is paint on the grass, with no edge of
        // its own to ink)
        const g = new THREE.Group();
        b.build(g, { cast: false, receive: true });
        fx(g);
        for (const c of [...g.children]) into.add(c);
      });
    }
  // Clubhouse Drive: its asphalt in stretches (a site each), its lamps, the pillars where it comes onto the course
  const asphalt = toon(ROAD.asphalt);
  const post = toon(LAMP_POST.black);
  const head = neon(LAMP.sodium.bulb, 0.25, 1.8);
  const pillar = toon(STONE.cap);
  const rail = toon('#ece8dc');
  const reed = toon('#7f9a52');
  const reedTop = toon('#9c7a4a');
  const drive = resample(DRIVE, 1);
  for (let k = 0; k < drive.length - 1; k += 40) {
    const part = drive.slice(k, Math.min(drive.length, k + 41));
    const xs = part.map((p) => p[0]);
    const zs = part.map((p) => p[1]);
    site(`golf drive ${k}`, [Math.min(...xs) - 4, Math.min(...zs) - 4, Math.max(...xs) + 4, Math.max(...zs) + 4], (into) => {
      const b = new Batch();
      b.add(driveMesh(part), asphalt);
      for (const l of DRIVE_LAMPS.filter((q) => part.some((p) => Math.hypot(p[0] - q.at[0], p[1] - q.at[1]) < 2.6))) {
        const y = golfLift(...l.at);
        b.add(new THREE.CylinderGeometry(0.06, 0.08, LAMP_H, 6).translate(l.at[0], y + LAMP_H / 2, l.at[1]), post);
        // (its arm out over the drive, the lamp's head at its end)
        const [hx, hz] = [l.at[0] - l.dir[0] * 0.9, l.at[1] - l.dir[1] * 0.9];
        b.add(new THREE.BoxGeometry(0.07, 0.07, 1).lookAt(new THREE.Vector3(-l.dir[0], 0, -l.dir[1])).translate((l.at[0] + hx) / 2, y + LAMP_H, (l.at[1] + hz) / 2), post);
        b.add(new THREE.BoxGeometry(0.3, 0.12, 0.3).translate(hx, y + LAMP_H - 0.06, hz), head);
      }
      b.build(into, { cast: true, receive: true });
    });
  }
  // The fence round the club's edge and the pillars and posts at its ways in (near only: far, the woods are the edge)
  for (let tx = Math.floor(X0 / TILE) * TILE; tx < X1; tx += TILE)
    for (let tz = Math.floor(Z0 / TILE) * TILE; tz < Z1; tz += TILE) {
      const r: Rect = [tx, tz, tx + TILE, tz + TILE];
      const inR = (p: Pt) => p[0] >= r[0] && p[0] < r[2] && p[1] >= r[1] && p[1] < r[3];
      const runs = FENCE_RUNS.map((run) => run.filter((_, i) => i < run.length - 1 && inR(run[i])).map((p) => [p, run[run.indexOf(p) + 1]] as [Pt, Pt])).filter((x) => x.length);
      const gaps = FENCE_GAPS.filter((g) => inR(g.at));
      const lakes = LAKES.filter((l) => inR(l.at));
      if (!runs.length && !gaps.length && !lakes.length) continue;
      site(`golf edge ${tx} ${tz}`, r, (into) => {
        const b = new Batch();
        b.detail(() => {
          for (const pairs of runs)
            for (const [p, q] of pairs) {
              const [yp, yq] = [golfLift(...p), golfLift(...q)];
              b.add(new THREE.BoxGeometry(0.12, FENCE.h, 0.12).translate(p[0], yp + FENCE.h / 2, p[1]), rail);
              const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
              for (const ry of FENCE.rails) {
                const g = new THREE.BoxGeometry(L, 0.07, 0.05);
                g.rotateZ(Math.atan2(yq - yp, L));
                g.rotateY(-Math.atan2(q[1] - p[1], q[0] - p[0]));
                b.add(g.translate((p[0] + q[0]) / 2, (yp + yq) / 2 + ry, (p[1] + q[1]) / 2), rail);
              }
            }
          for (const g of gaps) {
            // (either side of the way in: stone pillars for the drive, posts for the footpath)
            const dir = g.kind === 'drive' ? DRIVE : FOOTPATH;
            const k = resample(dir, 0.5).reduce((best, p, i, all) => (Math.hypot(p[0] - g.at[0], p[1] - g.at[1]) < Math.hypot(all[best][0] - g.at[0], all[best][1] - g.at[1]) ? i : best), 0);
            const pts = resample(dir, 0.5);
            const [a, c] = [pts[Math.max(0, k - 1)], pts[Math.min(pts.length - 1, k + 1)]];
            const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
            const [nx, nz] = [-(c[1] - a[1]) / l, (c[0] - a[0]) / l];
            for (const sgn of [-1, 1]) {
              const [x, z] = [g.at[0] + nx * sgn * g.half, g.at[1] + nz * sgn * g.half];
              const y = golfLift(x, z);
              if (g.kind === 'drive') {
                b.add(new THREE.BoxGeometry(0.7, 1.5, 0.7).translate(x, y + 0.75, z), pillar);
                b.add(new THREE.BoxGeometry(0.85, 0.12, 0.85).translate(x, y + 1.56, z), pillar);
              } else b.add(new THREE.BoxGeometry(0.16, 1.2, 0.16).translate(x, y + 0.6, z), rail);
            }
          }
          // Reeds round the lakes: a clump of blades and a seed head or two
          for (const l of lakes)
            for (const [x, z] of reedsOf(l)) {
              const y = golfLift(x, z);
              for (let j = 0; j < 3; j++) {
                const [ox, oz] = [Math.cos(x * 3.1 + j * 2.1) * 0.35, Math.sin(z * 2.7 + j * 2.1) * 0.35];
                const hgt = 0.9 + 0.25 * Math.sin(x + z + j);
                b.add(new THREE.ConeGeometry(0.07, hgt, 4).translate(x + ox, y + hgt / 2, z + oz), reed);
                if (j === 0) b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 5).translate(x + ox, y + hgt - 0.05, z + oz), reedTop);
              }
            }
        });
        b.build(into, { cast: false, receive: true });
      });
    }
  // Knob Hill Golf Club's clubhouse and its grounds (Phase 4)
  {
    const [gx0, gz0, gx1, gz1] = GOLF_CLUBHOUSE.grounds;
    site('golf clubhouse', [gx0 - 1, gz0 - 1, gx1 + 1, gz1 + 1], (into) => {
      const b = new Batch();
      drawClubhouse(b, low);
      b.build(into, { cast: true, receive: true });
    });
  }
  // What stands on the course, its flags and its life (Phase 5, golflife3d.ts)
  registerGolfLife({ low, scene, tick });
  // The lakes' water, on the main thread (the city's water shader), all in one mesh: one draw
  if (scene) {
    const lakes = LAKES.map((l, i) => {
      const shape = new THREE.Shape(shoreOf(l, 96).map(([x, z]) => new THREE.Vector2(x, -z)));
      return new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, golfWater(i), 0);
    });
    const water = new THREE.Mesh(mergeGeometries(lakes, false)!, waterMat);
    water.name = 'golf lakes water';
    water.matrixAutoUpdate = false;
    water.updateMatrix();
    scene.add(water);
  }
}
