/*
 * Westlake Park's walks, walls and gardens on screen (the north side's stage
 * 3; the numbers are gardens.ts and westlake.ts). Part of the park's chunk,
 * loaded as you approach (districts.ts); all sites (tilework.ts):
 *
 * - the kerbs along the paved main walks and the flush stone edges of the
 *   gravel paths, and the park's low stone wall with its coping, a site per
 *   tile of what runs through it;
 * - the formal garden: its wall, the round places with their fountains,
 *   the parterres (clipped hedges, the beds in bands of flowers, a topiary
 *   cone in each), urns on plinths, its benches;
 * - the planters along the Mall and round the walks, flowers in them;
 * - the lakeside terraces: stone steps from the loop down to the water,
 *   low walls along the platform, a lantern post at each corner.
 *
 * The paving itself is westlake3d.ts's (the paths), and `bench()` is shared
 * with it. Flowers, benches and lanterns are near only.
 */
import * as THREE from 'three';
import { Batch, neon, place, toon } from './kit';
import { SLAB } from './world';
import { site } from './tilework';
import { inPoly, offsetLine } from './streetplan';
import { EDGE_W, FOUNTAIN, GARDEN_BENCHES, GARDEN_WALLS, HEDGE, KERB, MALL_BEDS, PARTERRES, PERGOLA, PERGOLA_COLUMNS, PLANTER, PLANTERS, ROUNDS, URN, URNS, WALL, WALLS } from './gardens';
import { EDGES, KERBS } from './gardenedges';
import { BED_Y, GARDEN_SITE, TERRACES, TERRACE_STEPS, type Pt } from './westlake';
import { COVER, ORNATE, PLANT, SOIL as PAL_SOIL, STONE as PAL_STONE } from './palette';

/** The gravel paths lie this far over the lawn (westlake3d.ts), the paving of the main walks over that, the edges between */
export const PATH_Y = SLAB + 0.012;
export const PAVE_Y = PATH_Y + 0.01;
const EDGE_Y = PATH_Y + 0.005;

const STONE = toon(PAL_STONE.kerb);
const CAP = toon(PAL_STONE.cap);
const KERB_C = toon('#cfc9e6');
const EDGE_C = toon('#bdb7d6');
const HEDGE_C = toon(PLANT.hedge);
const HEDGE_TOP = toon(PLANT.hedgeTop);
const SOIL = toon(PAL_SOIL.garden);
const GRAVEL = toon(PAL_STONE.gravel);
const WATER = toon('#4fb0dc');
const SPRAY = toon('#cdeeff');
const IRON = toon('#1b1830');
const WOOD = toon('#8a5a3c');
const FLOWERS = ['#ff5c9a', '#ffd23f', '#e23b3b', '#b06cff', '#f7f5f0', '#ff8a3d'].map((c) => toon(c));
/** The beds' colour sets (FLOWERS: pink, yellow, red, violet, white, orange) */
const SETS = [
  [0, 4, 3],
  [1, 5, 2],
  [3, 4, 0],
  [2, 1, 4],
].map((ks) => ks.map((k) => FLOWERS[k]));
const unitBox = new THREE.BoxGeometry(1, 1, 1);
/** The formal garden as made ornate (docs/westlake-plan.md Phase 4) */
const ORN = toon(ORNATE.stone);
const ORN_DRESSED = toon(ORNATE.dressed);
const LAWN = toon(COVER.garden);
const BOX = toon(PLANT.box);
const TIMBER = toon(ORNATE.plank);
const WISTERIA = toon(PLANT.wisteria);
const WISTERIA_LEAF = toon(PLANT.wisteriaLeaf);

/* ---------- Shapes along lines ---------- */

/** A triangle wound to face `n` (pushed onto `pos`) */
function tri(pos: number[], a: number[], b: number[], c: number[], n: number[]) {
  const [ux, uy, uz] = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const [vx, vy, vz] = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const dot = (uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2];
  for (const p of dot >= 0 ? [a, b, c] : [a, c, b]) pos.push(p[0], p[1], p[2]);
}
const geo = (pos: number[]) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
};
/**
 * A wall along a polyline: its top `w` wide at y1 (in `top`), its two sides down to y0 (in `side`), its two ends
 * closed. Each face wound to face out.
 */
function extrude(b: Batch, line: Pt[], w: number, y0: number, y1: number, side: THREE.Material, top = side) {
  if (line.length < 2) return;
  const L = offsetLine(line, -w / 2);
  const R = offsetLine(line, w / 2);
  const t: number[] = [];
  const s: number[] = [];
  for (let i = 1; i < line.length; i++) {
    const [l0, l1, r0, r1] = [L[i - 1], L[i], R[i - 1], R[i]];
    tri(t, [l0[0], y1, l0[1]], [r0[0], y1, r0[1]], [r1[0], y1, r1[1]], [0, 1, 0]);
    tri(t, [l0[0], y1, l0[1]], [r1[0], y1, r1[1]], [l1[0], y1, l1[1]], [0, 1, 0]);
    // The sides face away from the line
    for (const [a, c, o] of [
      [l0, l1, R[i]],
      [r0, r1, L[i]],
    ] as [Pt, Pt, Pt][]) {
      const n = [a[0] - o[0], 0, a[1] - o[1]];
      tri(s, [a[0], y0, a[1]], [c[0], y0, c[1]], [c[0], y1, c[1]], n);
      tri(s, [a[0], y0, a[1]], [c[0], y1, c[1]], [a[0], y1, a[1]], n);
    }
  }
  // The two ends
  for (const [i, j] of [
    [0, 1],
    [line.length - 1, line.length - 2],
  ]) {
    const n = [line[i][0] - line[j][0], 0, line[i][1] - line[j][1]];
    const [l, r] = [L[i], R[i]];
    tri(s, [l[0], y0, l[1]], [r[0], y0, r[1]], [r[0], y1, r[1]], n);
    tri(s, [l[0], y0, l[1]], [r[0], y1, r[1]], [l[0], y1, l[1]], n);
  }
  b.add(geo(t), top);
  b.add(geo(s), side);
}
/** A flat strip along a polyline, `w` wide, at y */
function flatStrip(b: Batch, line: Pt[], w: number, y: number, mat: THREE.Material) {
  if (line.length < 2) return;
  const L = offsetLine(line, -w / 2);
  const R = offsetLine(line, w / 2);
  const t: number[] = [];
  for (let i = 1; i < line.length; i++) {
    tri(t, [L[i - 1][0], y, L[i - 1][1]], [R[i - 1][0], y, R[i - 1][1]], [R[i][0], y, R[i][1]], [0, 1, 0]);
    tri(t, [L[i - 1][0], y, L[i - 1][1]], [R[i][0], y, R[i][1]], [L[i][0], y, L[i][1]], [0, 1, 0]);
  }
  b.add(geo(t), mat);
}
/** Runs cut into pieces about `len` long (sharing their ends), each filed under the tile its middle is in */
function byTile<T>(runs: Pt[][], kind: T, len = 12) {
  const out = new Map<string, { kind: T; pts: Pt[] }[]>();
  for (const run of runs)
    for (let i = 0; i < run.length - 1; ) {
      let j = i + 1;
      let d = 0;
      while (j < run.length - 1 && d < len) {
        d += Math.hypot(run[j + 1][0] - run[j][0], run[j + 1][1] - run[j][1]);
        j++;
      }
      const pts = run.slice(i, j + 1);
      const m = pts[Math.floor(pts.length / 2)];
      const key = `${Math.floor(m[0] / 30)},${Math.floor(m[1] / 30)}`;
      if (!out.has(key)) out.set(key, []);
      out.get(key)!.push({ kind, pts });
      i = j;
    }
  return out;
}

/** A bench, the sitter facing `ry` (0 is +z), as the town's (neighbourhoods.ts) */
export function bench(b: Batch, at: Pt, ry: number) {
  const g = (w: number, h: number, d: number, x: number, y: number, z: number) =>
    new THREE.BoxGeometry(w, h, d)
      .translate(x, y + h / 2, z)
      .rotateY(ry)
      .translate(at[0], SLAB, at[1]);
  b.add(g(0.9, 0.06, 0.3, 0, 0.24, 0), WOOD);
  b.add(g(0.9, 0.3, 0.05, 0, 0.32, -0.15), WOOD);
  for (const sx of [-0.36, 0.36]) b.add(g(0.05, 0.26, 0.28, sx, 0, 0), IRON);
}

/** Flowers: little squashed clumps on a grid over an area (`inside` says where), coloured in bands across z */
const clump = new THREE.OctahedronGeometry(0.2, 0).scale(1, 0.75, 1);
function flowers(b: Batch, x0: number, z0: number, x1: number, z1: number, y: number, inside: (p: Pt) => boolean, step: number, seed: number) {
  // Three colours to a bed, in bands about two tiles deep
  const set = SETS[seed % SETS.length];
  let k = seed + 1;
  for (let z = z0 + step / 2; z < z1; z += step) {
    const band = set[Math.floor((z - z0) / 1.8) % set.length];
    for (let x = x0 + step / 2; x < x1; x += step) {
      k = (k * 16807) % 2147483647;
      const jx = x + ((k % 100) / 100 - 0.5) * step * 0.4;
      const jz = z + (((k / 100) % 100) / 100 - 0.5) * step * 0.4;
      if (!inside([jx, jz])) continue;
      b.add(clump.clone().translate(jx, y + 0.1, jz), band);
    }
  }
}
/** A flat filled outline at y (concave allowed) */
function fill(b: Batch, poly: Pt[], y: number, mat: THREE.Material) {
  const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  // (drawn in x, -z, laid down so it faces up)
  b.add(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, y, 0), mat);
}

/**
 * A balustrade along a run (the formal garden's, in place of its low wall, Phase 4): a plinth, a rail on top, a pier
 * every few metres and at its ends; the balusters near only
 */
function balustrade(b: Batch, run: Pt[], low: boolean) {
  extrude(b, run, WALL.w, SLAB - 0.05, SLAB + 0.16, ORN_DRESSED);
  extrude(b, run, WALL.w + 0.06, SLAB + 0.72, SLAB + 0.82, ORN_DRESSED);
  let carry = 0;
  const piers: Pt[] = [run[0], run.at(-1)!];
  const posts: Pt[] = [];
  for (let i = 1; i < run.length; i++) {
    const [a, c] = [run[i - 1], run[i]];
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
    for (let t = carry; t < l; t += 0.28) {
      const p: Pt = [a[0] + ((c[0] - a[0]) * t) / l, a[1] + ((c[1] - a[1]) * t) / l];
      posts.push(p);
      if (posts.length % 12 === 0) piers.push(p);
    }
    carry = (((carry - l) % 0.28) + 0.28) % 0.28;
  }
  for (const [x, z] of piers) {
    b.box(x - 0.2, SLAB, z - 0.2, 0.4, 0.92, 0.4, ORN_DRESSED);
    b.box(x - 0.24, SLAB + 0.92, z - 0.24, 0.48, 0.06, 0.48, ORN_DRESSED);
  }
  b.detail(() => {
    if (low) return;
    for (const [x, z] of posts) b.add(new THREE.LatheGeometry([new THREE.Vector2(0.045, 0), new THREE.Vector2(0.07, 0.12), new THREE.Vector2(0.045, 0.3), new THREE.Vector2(0.08, 0.44), new THREE.Vector2(0.045, 0.56)], 6).translate(x, SLAB + 0.16, z), ORN);
  });
}

/** The wisteria pergola along the garden's north side: its gravel floor, columns, beams, the vine over it and its blooms */
function pergola(b: Batch, low: boolean) {
  const { x0, x1, z0, z1, h, col } = PERGOLA;
  b.box(x0, PATH_Y + 0.004, z0, x1 - x0, 0.004, z1 - z0, GRAVEL);
  for (const [x, z] of PERGOLA_COLUMNS) {
    b.box(x - col / 2 - 0.06, SLAB, z - col / 2 - 0.06, col + 0.12, 0.2, col + 0.12, ORN_DRESSED);
    b.add(new THREE.CylinderGeometry(col * 0.42, col * 0.5, h - 0.35, 10).translate(x, SLAB + 0.2 + (h - 0.35) / 2, z), ORN);
    b.box(x - col / 2 - 0.05, SLAB + h - 0.15, z - col / 2 - 0.05, col + 0.1, 0.15, col + 0.1, ORN_DRESSED);
  }
  // Two long beams along it over the columns, joists across every half metre, their ends cut past the beams
  for (const z of [z0 + 0.3, z1 - 0.3]) b.box(x0 - 0.3, SLAB + h, z - 0.1, x1 - x0 + 0.6, 0.22, 0.2, TIMBER);
  for (let x = x0; x <= x1; x += 0.55) b.box(x - 0.05, SLAB + h + 0.22, z0 - 0.15, 0.1, 0.14, z1 - z0 + 0.3, TIMBER);
  // The vine: leafy masses along the top, the blooms hanging under in long clusters
  let k = 7;
  const r = () => ((k = (k * 16807) % 2147483647) / 2147483647);
  for (let x = x0 + 0.4; x < x1; x += 1.1) b.add(new THREE.IcosahedronGeometry(0.75, 0).scale(1.1, 0.35, (z1 - z0) / 1.7).translate(x + (r() - 0.5) * 0.4, SLAB + h + 0.4, (z0 + z1) / 2), WISTERIA_LEAF);
  b.detail(() => {
    const n = low ? 0.5 : 1;
    for (let x = x0 + 0.3; x < x1; x += 0.42 / n)
      for (const z of [z0 + 0.25, (z0 + z1) / 2, z1 - 0.25]) {
        if (r() < 0.35) continue;
        const l = 0.22 + r() * 0.28;
        b.add(new THREE.ConeGeometry(0.06, l, 5).rotateX(Math.PI).translate(x + (r() - 0.5) * 0.2, SLAB + h - l / 2 + 0.02, z + (r() - 0.5) * 0.4), WISTERIA);
      }
  });
}

/**
 * A parterre's bed in a pattern on lawn (Phase 4, in place of the grid of flowers on soil): its lawn, a knot of low
 * clipped box (a diamond, and a ring round the middle), rings and corners of colour, a topiary on a plinth in the
 * middle
 */
function patternBed(b: Batch, pt: (typeof PARTERRES)[number], i: number, low: boolean) {
  fill(b, pt.bed, PATH_Y + 0.01, LAWN);
  const xs = pt.bed.map((p) => p[0]);
  const zs = pt.bed.map((p) => p[1]);
  // (the pattern round the bed's own middle: its box's, not its outline's points', which crowd round the arc)
  const [cx, cz] = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2];
  const inside = (p: Pt) => inPoly(pt.bed, p);
  // (the knot: the diamond as big as fits a hand inside the bed, and a ring)
  let [hx, hz] = [0, 0];
  for (let f = 0.86; f > 0.4; f -= 0.04) {
    [hx, hz] = [((Math.max(...xs) - Math.min(...xs)) / 2) * f, ((Math.max(...zs) - Math.min(...zs)) / 2) * f];
    const test: Pt[] = Array.from({ length: 16 }, (_, k) => {
      const t = (k % 4) / 4;
      const [a, c] = [[[cx + hx, cz], [cx, cz + hz], [cx - hx, cz], [cx, cz - hz]][Math.floor(k / 4)], [[cx, cz + hz], [cx - hx, cz], [cx, cz - hz], [cx + hx, cz]][Math.floor(k / 4)]] as Pt[];
      return [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t];
    });
    if (test.every((p) => inside(p) && inside([p[0] + 0.4, p[1]]) && inside([p[0] - 0.4, p[1]]) && inside([p[0], p[1] + 0.4]) && inside([p[0], p[1] - 0.4]))) break;
  }
  const diamond: Pt[] = [[cx + hx, cz], [cx, cz + hz], [cx - hx, cz], [cx, cz - hz], [cx + hx, cz]];
  extrude(b, diamond, 0.3, PATH_Y, PATH_Y + 0.32, BOX, HEDGE_TOP);
  const rr = Math.min(hx, hz) * 0.45;
  const ring: Pt[] = Array.from({ length: 25 }, (_, k) => [cx + Math.cos((k / 24) * Math.PI * 2) * rr, cz + Math.sin((k / 24) * Math.PI * 2) * rr]);
  extrude(b, ring, 0.26, PATH_Y, PATH_Y + 0.28, BOX, HEDGE_TOP);
  // The colour: a ring of one between the knot's ring and the topiary, the diamond's corners of another
  const set = SETS[i % SETS.length];
  const inDiamond = (p: Pt, m: number) => Math.abs(p[0] - cx) / (hx - m) + Math.abs(p[1] - cz) / (hz - m) < 1;
  b.add(new THREE.RingGeometry(1.05, rr - 0.25, 24).rotateX(-Math.PI / 2).translate(cx, PATH_Y + 0.016, cz), SOIL);
  b.detail(() => {
    const step = low ? 0.6 : 0.42;
    for (let x = cx - rr; x < cx + rr; x += step)
      for (let z = cz - rr; z < cz + rr; z += step) {
        const d = Math.hypot(x - cx, z - cz);
        if (d > 1.15 && d < rr - 0.35) b.add(clump.clone().translate(x, PATH_Y + 0.11, z), set[0]);
      }
    for (let x = Math.min(...xs); x < Math.max(...xs); x += step)
      for (let z = Math.min(...zs); z < Math.max(...zs); z += step) {
        const p: Pt = [x, z];
        if (!inside(p) || inDiamond(p, -0.35)) continue;
        if (pt.bed.some((q, k) => {
          const e = pt.bed[(k + 1) % pt.bed.length];
          const [dx, dz] = [e[0] - q[0], e[1] - q[1]];
          const t = Math.max(0, Math.min(1, ((x - q[0]) * dx + (z - q[1]) * dz) / (dx * dx + dz * dz || 1)));
          return Math.hypot(q[0] + dx * t - x, q[1] + dz * t - z) < 0.55;
        })) continue;
        b.add(clump.clone().translate(x, PATH_Y + 0.11, z), set[1 + (Math.floor((x + z) / 1.6) & 1)]);
      }
  });
  b.add(new THREE.CylinderGeometry(0.55, 0.6, 0.35, 12).translate(cx, PATH_Y + 0.17, cz), ORN_DRESSED);
  b.add(new THREE.SphereGeometry(0.5, 10, 8).scale(1, 1.3, 1).translate(cx, PATH_Y + 0.95, cz), HEDGE_C);
  b.add(new THREE.SphereGeometry(0.32, 10, 8).translate(cx, PATH_Y + 1.75, cz), HEDGE_C);
  b.add(new THREE.SphereGeometry(0.16, 8, 6).translate(cx, PATH_Y + 2.2, cz), HEDGE_TOP);
}

/* ---------- The pieces ---------- */

/** A planter: a low stone wall round (or a box round an oblong), soil, flowers near only */
function roundPlanter(b: Batch, at: Pt, r: number, seed: number) {
  const H = SLAB + PLANTER.h;
  b.add(new THREE.CylinderGeometry(r, r, PLANTER.h, 14, 1, true).translate(at[0], SLAB + PLANTER.h / 2, at[1]), STONE);
  b.add(new THREE.RingGeometry(r - PLANTER.wall, r + 0.02, 14).rotateX(-Math.PI / 2).translate(at[0], H + 0.005, at[1]), CAP);
  b.add(new THREE.CircleGeometry(r - PLANTER.wall, 14).rotateX(-Math.PI / 2).translate(at[0], H - 0.06, at[1]), SOIL);
  b.detail(() => flowers(b, at[0] - r, at[1] - r, at[0] + r, at[1] + r, H - 0.06, (p) => Math.hypot(p[0] - at[0], p[1] - at[1]) < r - PLANTER.wall - 0.12, 0.34, seed));
}
function oblongPlanter(b: Batch, [x0, z0, x1, z1]: [number, number, number, number], seed: number) {
  const H = SLAB + PLANTER.h;
  const t = PLANTER.wall;
  b.box(x0, SLAB, z0, x1 - x0, PLANTER.h, t, STONE);
  b.box(x0, SLAB, z1 - t, x1 - x0, PLANTER.h, t, STONE);
  b.box(x0, SLAB, z0 + t, t, PLANTER.h, z1 - z0 - 2 * t, STONE);
  b.box(x1 - t, SLAB, z0 + t, t, PLANTER.h, z1 - z0 - 2 * t, STONE);
  b.box(x0 - 0.02, H, z0 - 0.02, x1 - x0 + 0.04, 0.04, t + 0.02, CAP);
  b.box(x0 - 0.02, H, z1 - t, x1 - x0 + 0.04, 0.04, t + 0.02, CAP);
  b.add(new THREE.PlaneGeometry(x1 - x0 - 2 * t, z1 - z0 - 2 * t).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, H - 0.06, (z0 + z1) / 2), SOIL);
  b.detail(() => flowers(b, x0 + t, z0 + t, x1 - t, z1 - t, H - 0.06, () => true, 0.3, seed));
}
/** A fountain: a round stone basin with water in it, a pedestal, a bowl and its spray */
function fountain(b: Batch, c: Pt) {
  const F = FOUNTAIN;
  const at = (g: THREE.BufferGeometry, y: number, m: THREE.Material) => b.add(g.translate(c[0], SLAB + y, c[1]), m);
  // The basin (carved, Phase 4): a moulded base, its wall with eight piers round it, a rounded coping, the water
  at(new THREE.CylinderGeometry(F.r + 0.1, F.r + 0.18, 0.14, 32, 1, true), 0.07, ORN_DRESSED);
  at(new THREE.CylinderGeometry(F.r, F.r + 0.04, F.h, 32, 1, true), F.h / 2, ORN);
  at(new THREE.CylinderGeometry(F.r - 0.25, F.r - 0.25, F.h, 28, 1, true), F.h / 2, ORN);
  at(new THREE.TorusGeometry(F.r - 0.1, 0.14, 5, 32).rotateX(Math.PI / 2), F.h + 0.02, ORN_DRESSED);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    b.box(c[0] + Math.cos(a) * (F.r + 0.02) - 0.13, SLAB, c[1] + Math.sin(a) * (F.r + 0.02) - 0.13, 0.26, F.h + 0.1, 0.26, ORN_DRESSED);
  }
  at(new THREE.CircleGeometry(F.r - 0.25, 28).rotateX(-Math.PI / 2), F.h - 0.13, WATER);
  // The pedestal (turned), the lower bowl, a stem, the upper bowl, a pineapple finial
  at(new THREE.LatheGeometry([new THREE.Vector2(0.45, 0), new THREE.Vector2(0.3, 0.15), new THREE.Vector2(0.18, 0.6), new THREE.Vector2(0.26, F.top - 0.15), new THREE.Vector2(0.14, F.top)], 12), 0, ORN);
  const bowl = (r: number) => new THREE.LatheGeometry([new THREE.Vector2(0.12, 0), new THREE.Vector2(r * 0.55, 0.06), new THREE.Vector2(r, 0.22), new THREE.Vector2(r * 0.95, 0.26)], 18);
  at(bowl(F.bowl + 0.3), F.top - 0.05, ORN_DRESSED);
  at(new THREE.CircleGeometry(F.bowl + 0.22, 18).rotateX(-Math.PI / 2), F.top + 0.19, WATER);
  at(new THREE.CylinderGeometry(0.08, 0.12, 0.55, 8), F.top + 0.48, ORN);
  at(bowl(0.45), F.top + 0.7, ORN_DRESSED);
  at(new THREE.CircleGeometry(0.4, 14).rotateX(-Math.PI / 2), F.top + 0.94, WATER);
  at(new THREE.SphereGeometry(0.11, 8, 6).scale(1, 1.5, 1), F.top + 1.1, ORN_DRESSED);
  b.detail(() => {
    // Water spilling from the bowls' lips in thin streams, and a jet over the top
    for (const [rad, y0, y1, n] of [
      [0.43, F.top + 0.96, F.top + 0.2, 8],
      [F.bowl + 0.27, F.top + 0.2, F.h - 0.1, 12],
    ] as const)
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        b.add(new THREE.CylinderGeometry(0.014, 0.024, y0 - y1, 4).translate(c[0] + Math.cos(a) * rad, SLAB + (y0 + y1) / 2, c[1] + Math.sin(a) * rad), SPRAY);
      }
  });
}

/* ---------- Registering ---------- */

export function registerGardens(low: boolean) {
  // The kerbs, the edges, the park's wall: a site per tile of what runs through it
  type Kind = 'kerb' | 'edge' | 'wall';
  const tiles = new Map<string, { kind: Kind; pts: Pt[] }[]>();
  for (const [kind, runs] of [
    ['kerb', KERBS.map((k) => k.pts)],
    ['edge', EDGES.map((k) => k.pts)],
    ['wall', WALLS],
  ] as [Kind, Pt[][]][])
    for (const [key, list] of byTile(runs, kind)) tiles.set(key, [...(tiles.get(key) ?? []), ...list]);
  for (const [key, list] of tiles) {
    const [i, j] = key.split(',').map(Number);
    site(`westlake lines ${key}`, [i * 30 - 9, j * 30 - 9, (i + 1) * 30 + 9, (j + 1) * 30 + 9], (into) => {
      const b = new Batch();
      for (const { kind, pts } of list) {
        if (kind === 'kerb') extrude(b, pts, KERB.w, PATH_Y, PAVE_Y + KERB.h, KERB_C);
        else if (kind === 'edge') flatStrip(b, pts, EDGE_W, EDGE_Y, EDGE_C);
        else {
          extrude(b, pts, WALL.w, SLAB - 0.05, SLAB + WALL.h - 0.07, STONE);
          extrude(b, pts, WALL.w + 0.08, SLAB + WALL.h - 0.07, SLAB + WALL.h, CAP);
        }
      }
      b.build(into, { cast: true, receive: true });
    });
  }

  // The formal garden: its wall, the round places and fountains, the parterres, urns, benches
  const [gx0, gz0, gx1, gz1] = GARDEN_SITE;
  site('westlake garden', [gx0 - 1, gz0 - 1, gx1 + 1, gz1 + 1], (into) => {
    const b = new Batch();
    // Its wall a balustrade now, and the pergola along its north side (Phase 4)
    for (const run of GARDEN_WALLS) balustrade(b, run, low);
    pergola(b, low);
    for (const r of ROUNDS) {
      b.add(new THREE.CircleGeometry(r.r, 40).rotateX(-Math.PI / 2).translate(r.c[0], PATH_Y + 0.002, r.c[1]), GRAVEL);
      fountain(b, r.c);
    }
    PARTERRES.forEach((pt, i) => {
      // The hedge, clipped low, open at its gap
      for (const run of pt.hedge) extrude(b, run, HEDGE.w, SLAB, SLAB + HEDGE.h, HEDGE_C, HEDGE_TOP);
      // The gravel border inside it, a stone rim, the bed in its pattern on lawn (Phase 4)
      fill(b, pt.line, PATH_Y, GRAVEL);
      flatStrip(b, [...pt.bed, pt.bed[0]], 0.14, PATH_Y + 0.016, ORN_DRESSED);
      patternBed(b, pt, i, low);
    });
    for (const [x, z] of URNS) {
      const P = URN.plinth;
      b.box(x - P / 2, SLAB, z - P / 2, P, P, P, STONE);
      b.box(x - P / 2 - 0.04, SLAB + P, z - P / 2 - 0.04, P + 0.08, 0.06, P + 0.08, CAP);
      b.add(new THREE.CylinderGeometry(0.3, 0.16, URN.h * 0.8, 12).translate(x, SLAB + P + 0.06 + URN.h * 0.4, z), CAP);
      b.add(new THREE.CylinderGeometry(0.33, 0.33, 0.06, 12).translate(x, SLAB + P + 0.06 + URN.h * 0.8, z), CAP);
      b.detail(() => {
        for (let k = 0; k < 5; k++) b.add(clump.clone().scale(1.2, 1.2, 1.2).translate(x + Math.cos(k * 1.26) * 0.16, SLAB + P + URN.h + 0.12, z + Math.sin(k * 1.26) * 0.16), FLOWERS[k % FLOWERS.length]);
      });
    }
    b.detail(() => {
      for (const bn of GARDEN_BENCHES) bench(b, bn.at, bn.ry);
    });
    b.build(into, { cast: true, receive: true });
  });

  // The planters, a site per tile of them
  const beds = new Map<string, { oblong?: [number, number, number, number]; at?: Pt; r?: number }[]>();
  const file = (x: number, z: number, v: { oblong?: [number, number, number, number]; at?: Pt; r?: number }) => {
    const key = `${Math.floor(x / 30)},${Math.floor(z / 30)}`;
    beds.set(key, [...(beds.get(key) ?? []), v]);
  };
  for (const r of MALL_BEDS) file((r[0] + r[2]) / 2, (r[1] + r[3]) / 2, { oblong: r });
  for (const p of PLANTERS) file(p.at[0], p.at[1], { at: p.at, r: p.r });
  for (const [key, list] of beds) {
    const [i, j] = key.split(',').map(Number);
    site(`westlake beds ${key}`, [i * 30 - 2, j * 30 - 2, (i + 1) * 30 + 2, (j + 1) * 30 + 2], (into) => {
      const b = new Batch();
      list.forEach((v, k) => (v.oblong ? oblongPlanter(b, v.oblong, k) : roundPlanter(b, v.at!, v.r!, k)));
      b.build(into, { cast: true, receive: true });
    });
  }

  // The lakeside terraces: each step a stone block turned to the shore, low walls along the platform, lantern posts
  TERRACES.forEach((tr, i) => {
    const ry = Math.atan2(-tr.u[1], tr.u[0]);
    const at = (d: number, s: number): Pt => [tr.at[0] + tr.u[0] * d + tr.t[0] * s, tr.at[1] + tr.u[1] * d + tr.t[1] * s];
    const ends = [TERRACE_STEPS[0][0], TERRACE_STEPS.at(-1)![1]].flatMap((d) => [at(d, -tr.half), at(d, tr.half)]);
    const xs = ends.map((p) => p[0]);
    const zs = ends.map((p) => p[1]);
    site(`westlake terrace ${i}`, [Math.min(...xs) - 1, Math.min(...zs) - 1, Math.max(...xs) + 1, Math.max(...zs) + 1], (into) => {
      const b = new Batch();
      for (const [d0, d1, h] of TERRACE_STEPS) {
        const [cx, cz] = at((d0 + d1) / 2, 0);
        // (from the lake's bed up, for the steps down the embankment over the water: Phase 3b)
        const y0 = SLAB + BED_Y;
        b.add(place(unitBox, cx, (y0 + SLAB + h) / 2, cz, d0 - d1, SLAB + h - y0, tr.half * 2, 0, ry), STONE);
        // Its walls either side, stepping down with it, where the flight goes down past the lawn
        if (h < 0.15)
          for (const sd of [-1, 1]) {
            const [wx, wz] = at((d0 + d1) / 2, sd * (tr.half + 0.15));
            const wt = Math.max(SLAB + h + 0.55, SLAB + 0.12);
            b.add(place(unitBox, wx, (y0 + wt) / 2, wz, d0 - d1 + 0.01, wt - y0, 0.3, 0, ry), STONE);
            b.add(place(unitBox, wx, wt + 0.03, wz, d0 - d1 + 0.04, 0.06, 0.38, 0, ry), CAP);
          }
        // A paler nosing along each step's edge towards the water
        const [nx, nz] = at(d1 + 0.06, 0);
        b.add(place(unitBox, nx, SLAB + h + 0.006, nz, 0.12, 0.012, tr.half * 2 - 0.02, 0, ry), CAP);
      }
      // Low walls along the platform's sides, lantern posts at the corners over the water
      const [p0, p1] = [TERRACE_STEPS[1][0], TERRACE_STEPS[1][1]];
      const top = TERRACE_STEPS[1][2];
      for (const s of [-1, 1]) {
        const [cx, cz] = at((p0 + p1) / 2, s * (tr.half - 0.15));
        b.add(place(unitBox, cx, SLAB + top + 0.22, cz, p0 - p1, 0.44, 0.3, 0, ry), STONE);
        b.add(place(unitBox, cx, SLAB + top + 0.47, cz, p0 - p1 + 0.06, 0.06, 0.38, 0, ry), CAP);
        const [lx, lz] = at(TERRACE_STEPS.at(-1)![1] + 0.3, s * (tr.half - 0.3));
        const lh = SLAB + TERRACE_STEPS.at(-1)![2];
        b.box(lx - 0.05, lh, lz - 0.05, 0.1, 1.5, 0.1, IRON);
        b.detail(() => {
          b.box(lx - 0.1, lh + 1.5, lz - 0.1, 0.2, 0.24, 0.2, neon('#ffe2a0', 0.6, 2.4));
          b.box(lx - 0.13, lh + 1.74, lz - 0.13, 0.26, 0.05, 0.26, IRON);
        });
      }
      b.build(into, { cast: true, receive: true });
    });
  });
}
