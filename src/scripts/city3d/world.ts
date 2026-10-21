/*
 * The ground the city stands on: grass, roads with markings, the river and
 * its bridges, block slabs, trees, street lamps and a skyline in the haze.
 *
 * World units: 1 = one map tile. x and z match the 2D map's x and y; y is up.
 * The street plan is layout.ts and streetplan.ts (`PLAN`): downtown (0-60)
 * crossed by two cross streets each way and three diagonals, its blocks cut
 * into lots, triangles, pocket parks and the hangout square (downtown.ts);
 * ring avenues (two lanes each way and a median) round it, and the plot
 * districts (see plots.ts) beyond to the north, west and east. The river runs
 * south of the north-bank avenue; across its four bridges the south bank
 * avenue carries the south row of districts. Every block has a sidewalk, and
 * both banks a lamp-lit promenade.
 */
import * as THREE from 'three';
import { DISTRICTS } from '../../data/plots';
import { Batch, PAL, canvasTex, facadeMat, fx, glowMat, glowTex, lit, neon, rand, sidesBox, toon } from './kit';
import { BLOCKS, BS, CENTER_XZ, CITY_EXT, CORE_ROADS, DECK_WALK, DOWNTOWN, EW_ROADS, EXT, EXTRA_LOTS, LANE, LIBERTY_ROAD, MEDIAN, NS_ROADS, OUTER_HI, OUTER_LO, RIVER, SEATS, SOUTH_ROAD, WALK_W, type Road } from './layout';
import { PLAN, offsetLine, type Pt } from './streetplan';
import { DIAGONALS, DIAGONAL_LAMPS } from './downtown';
import { BENDS, BEND_REACH, KERB_RUNS, LIBERTY_END, OUTSIDE, PADS, PARKWAY, PROMENADE, SOUTHSIDE, inTown, onLiberty } from './outer';
import { KART_PARK, SLIP_ROAD } from './kartpark';
import { RUNWAY, SITE } from './airfield';

export { BLOCKS, BS, CORE_ROADS, EW_ROADS, EXT, NS_ROADS, RIVER, SOUTH_ROAD, WALK_W, type Road };
/** District blocks around the core: one large plot each (src/data/plots.ts). */
export { DISTRICTS };
export const SLAB = 0.15;
export const CENTER = new THREE.Vector3(CENTER_XZ.x, 0, CENTER_XZ.z);

export type Env = { t: number; dt: number; night: number; rain: number; day: number };
export type Tick = (env: Env) => void;

/* ---------- Trees and lamps are instanced: collect first, build once ---------- */

const trees: { x: number; z: number; s: number; pine: boolean; y: number }[] = [];
export function addTree(x: number, z: number, s = 0.8 + rand() * 0.45, pine = rand() < 0.3, y = SLAB) {
  trees.push({ x, z, s, pine, y });
}

const lamps: { x: number; z: number; ry: number; y: number }[] = [];
/** How many trees and lamps are placed so far (landmarks.ts moves a landmark's own ones with it) */
export const placedMark = () => ({ trees: trees.length, lamps: lamps.length });
export function shiftPlaced(from: { trees: number; lamps: number }, dx: number, dz: number) {
  for (const t of trees.slice(from.trees)) (t.x += dx), (t.z += dz);
  for (const l of lamps.slice(from.lamps)) (l.x += dx), (l.z += dz);
}
export function addLamp(x: number, z: number, ry = 0, y = SLAB) {
  lamps.push({ x, z, ry, y });
}
/** A pool of lamplight on the ground with no street lamp over it (alley wall lamps): drawn with the street lamps' pools */
const pools: { x: number; z: number; y: number; size: number }[] = [];
export function addPool(x: number, z: number, size: number, y = SLAB) {
  pools.push({ x, z, y, size });
}

/* ---------- Ground ---------- */

const paving = canvasTex(256, 256, (ctx) => {
  ctx.fillStyle = '#3a3470';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#4a4388';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }
});
paving.wrapS = paving.wrapT = THREE.RepeatWrapping;
paving.repeat.set(4, 4);

const LOTS: Record<string, THREE.Material> = {
  grass: toon('#2f7a52'),
  paving: new THREE.MeshToonMaterial({ map: paving, color: '#ffffff' }),
  concrete: toon('#4b4766'),
  dirt: toon('#6a4a3c'),
};
export type LotKind = keyof typeof LOTS;
/** The lot surfaces (grass, paving, concrete, dirt), for squares and pads drawn elsewhere */
export const lotMat = (k: LotKind) => LOTS[k];

/** A flat outline at height y, facing up (UVs one texture repeat per lot, like a block's) */
export function flatPoly(poly: Pt[], y: number) {
  const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, y, 0);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / (BS - 0.8), uv.getY(i) / (BS - 0.8));
  return g;
}
/** An outline raised from the ground to height h (a kerbed slab) */
export function slabPoly(poly: Pt[], h: number) {
  const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  return new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false }).rotateX(-Math.PI / 2);
}
/** An outline pulled in by d, corners mitred */
export function insetPoly(poly: Pt[], d: number): Pt[] {
  const n = poly.length;
  return poly.map((p, i) => {
    const a = poly[(i + n - 1) % n];
    const b = poly[(i + 1) % n];
    const e0 = [p[0] - a[0], p[1] - a[1]];
    const e1 = [b[0] - p[0], b[1] - p[1]];
    const l0 = Math.hypot(e0[0], e0[1]);
    const l1 = Math.hypot(e1[0], e1[1]);
    // Inward normals of a counter-clockwise outline (from above): to the left of travel
    const n0 = [e0[1] / l0, -e0[0] / l0];
    const n1 = [e1[1] / l1, -e1[0] / l1];
    const m = [n0[0] + n1[0], n0[1] + n1[1]];
    const k = d / (1 + n0[0] * n1[0] + n0[1] * n1[1]);
    return [p[0] + m[0] * k, p[1] + m[1] * k] as Pt;
  });
}
const PARKWAY_TOP = Math.min(...PARKWAY.map((p) => p[1]));
const SOUTHSIDE_BOTTOM = Math.max(...SOUTHSIDE.map((p) => p[1]));
const isRect = (poly: Pt[]) => poly.length === 4 && poly.every((p, i) => { const q = poly[(i + 1) % 4]; return p[0] === q[0] || p[1] === q[1]; });

/** Water: deep colour with drifting highlights and, at night, neon streaks. */
export const waterMat = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    night: { value: 1 },
    rain: { value: 0 },
    deep: { value: new THREE.Color('#123a6b') },
    sky: { value: new THREE.Color('#5fb0ff') },
  },
  vertexShader: /* glsl */ `
    varying vec3 vPos;
    void main() { vPos = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vPos, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform float time; uniform float night; uniform float rain; uniform vec3 deep; uniform vec3 sky;
    varying vec3 vPos;
    float h(float n) { return fract(sin(n) * 43758.5453); }
    void main() {
      float wave = sin(vPos.x * 0.9 + time * 1.3) * sin(vPos.z * 2.7 - time * 0.8);
      vec3 col = mix(deep, sky, 0.18 + 0.12 * wave);
      // Highlights drifting downstream
      float lane = floor(vPos.z * 3.0);
      float streak = smoothstep(0.92, 1.0, sin(vPos.x * 0.35 + time * (0.6 + h(lane) * 0.8) + h(lane) * 40.0));
      col += streak * mix(vec3(0.35), vec3(0.0), night) * 0.6;
      // Neon reflections at night
      vec3 neonCol = mix(vec3(1.0, 0.25, 0.85), vec3(0.0, 0.9, 1.0), h(lane + 3.0));
      float ref = smoothstep(0.75, 1.0, sin(vPos.x * 0.12 + h(lane) * 30.0)) * (0.5 + 0.5 * sin(time * 2.0 + vPos.x));
      col += neonCol * ref * night * 0.55;
      // Rain rings
      float ring = smoothstep(0.96, 1.0, sin(length(fract(vPos.xz * 0.8) - 0.5) * 40.0 - time * 8.0));
      col += ring * rain * 0.25;
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }
  `,
});

/** Wet-road sheen: neon streaks that show on the asphalt when it rains (driven by the rain level). */
export const puddleMat = new THREE.MeshBasicMaterial({
    map: canvasTex(64, 256, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,.9)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(20, 0, 24, 256);
    }),
    color: '#ffffff',
    transparent: true,
    blending: THREE.AdditiveBlending, fog: false,
    depthWrite: false,
});

/**
 * The ground. `lots` picks a surface for a block (by its plan id, like 'dt-c' or
 * 'district-N1') or for a landmark's own lot inside its block (by its old block, layout.ts SEATS).
 */
export function buildGround(scene: THREE.Scene, lots: Record<string, LotKind>) {
  const [e0, e1] = EXT;
  const L = e1 - e0;
  const mid = (e0 + e1) / 2;
  const b = new Batch();

  // Grass everywhere, then the river cut in on top
  b.box(e0, -0.5, e0, L, 0.5, L, toon('#245c45'));
  const water = new THREE.Mesh(new THREE.PlaneGeometry(L, RIVER[1] - RIVER[0]), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(mid, 0.01, (RIVER[0] + RIVER[1]) / 2);
  scene.add(water);
  const stone = toon('#6b6790');
  // (Broken under Liberty Bridge's deck, libertybridge.ts)
  const deck: [number, number] = [LIBERTY_ROAD.c - LIBERTY_ROAD.half - DECK_WALK, LIBERTY_ROAD.c + LIBERTY_ROAD.half + DECK_WALK];
  for (const [x0, x1] of [
    [e0, deck[0]],
    [deck[1], e1],
  ]) {
    b.box(x0, 0, RIVER[0] - 0.25, x1 - x0, 0.12, 0.25, stone);
    b.box(x0, 0, RIVER[1], x1 - x0, 0.12, 0.25, stone);
  }

  // A promenade on each bank: between the north-bank avenue and the water, and the water and the south bank avenue
  const northBank = EW_ROADS.filter((r) => r.c < RIVER[0]).at(-1)!;
  const southBank = EW_ROADS.find((r) => r.c === SOUTH_ROAD)!;
  const promenade = toon('#4a4388');
  for (const [z0, z1] of [
    [northBank.c + northBank.half, RIVER[0] - 0.25],
    [RIVER[1] + 0.25, southBank.c - southBank.half],
  ])
    b.box(e0, 0, z0, L, 0.05, z1 - z0, promenade);
  // Lamps along the water, reaching out over the walk (clear of the bridges)
  const nearBridge = (x: number) => NS_ROADS.some((r) => Math.abs(x - r.c) < r.half + WALK_W + 0.9) || Math.abs(x - LIBERTY_ROAD.c) < LIBERTY_ROAD.half + DECK_WALK + 0.9;
  for (let x = PROMENADE.x[0]; x <= PROMENADE.x[1]; x += 6)
    if (!nearBridge(x)) {
      addLamp(x, RIVER[0] - 0.4, Math.PI / 2, 0.05);
      addLamp(x, RIVER[1] + 0.4, -Math.PI / 2, 0.05);
    }

  // Roads: asphalt, and down each avenue a raised median (broken at crossings and over the river)
  const asphalt = toon('#26243f');
  for (const r of EW_ROADS) b.box(e0, 0, r.c - r.half, L, 0.03, r.half * 2, asphalt);
  for (const r of NS_ROADS) b.box(r.c - r.half, 0.002, e0, r.half * 2, 0.03, L, asphalt);
  const median = toon('#3f5a4a');
  const kerbTop = toon('#5a5290');
  /** Stretches of a road between the roads crossing it (and any other gaps, like the river) */
  const runsBetween = (cross: Road[], gaps: [number, number][] = []): [number, number][] => {
    const cuts = [...cross.map((r): [number, number] => [r.c - r.half - 0.2, r.c + r.half + 0.2]), ...gaps].sort((p, q) => p[0] - q[0]);
    const runs: [number, number][] = [];
    let at = e0;
    for (const [c0, c1] of cuts) {
      if (c0 > at) runs.push([at, c0]);
      at = Math.max(at, c1);
    }
    if (at < e1) runs.push([at, e1]);
    return runs;
  };
  const river: [number, number] = [RIVER[0] - 0.7, RIVER[1] + 0.7];
  /** The roads crossing an east-west road: the north-south ones, and Liberty Road where it reaches */
  const across = (r: Road) => (r.c >= LIBERTY_ROAD.z0 && r.c <= LIBERTY_END[1] ? [...NS_ROADS, LIBERTY_ROAD] : NS_ROADS);
  for (const r of EW_ROADS)
    if (r.lanes === 2)
      for (const [a0, a1] of runsBetween(across(r))) {
        b.box(a0, 0, r.c - MEDIAN / 2, a1 - a0, SLAB, MEDIAN, kerbTop);
        b.box(a0, SLAB, r.c - MEDIAN / 2 + 0.06, a1 - a0, 0.005, MEDIAN - 0.12, median);
      }
  for (const r of NS_ROADS)
    if (r.lanes === 2)
      for (const [a0, a1] of runsBetween(EW_ROADS, [river])) {
        b.box(r.c - MEDIAN / 2, 0, a0, MEDIAN, SLAB, a1 - a0, kerbTop);
        b.box(r.c - MEDIAN / 2 + 0.06, SLAB, a0, MEDIAN - 0.12, 0.005, a1 - a0, median);
      }

  // Bridges over the river: the road and its sidewalks, with rails
  const rail = toon('#c9c4e6');
  const span = RIVER[1] - RIVER[0] + 1.2;
  for (const r of NS_ROADS) {
    const w = r.half + WALK_W;
    b.box(r.c - w, 0, RIVER[0] - 0.6, w * 2, 0.06, span, toon('#34314f'));
    b.box(r.c - w, 0.06, RIVER[0] - 0.6, WALK_W, SLAB - 0.06, span, kerbTop);
    b.box(r.c + r.half, 0.06, RIVER[0] - 0.6, WALK_W, SLAB - 0.06, span, kerbTop);
    for (const side of [r.c - w - 0.05, r.c + w - 0.05]) {
      b.box(side, SLAB, RIVER[0] - 0.6, 0.1, 0.08, span, rail);
      for (let z = RIVER[0] - 0.6; z <= RIVER[1] + 0.6; z += 0.75) b.box(side, SLAB, z, 0.1, 0.45, 0.1, rail);
      b.box(side, SLAB + 0.45, RIVER[0] - 0.6, 0.1, 0.06, span, rail);
    }
  }

  // Diagonals: asphalt wide enough to fill the corners where their sidewalks meet the cross streets' (the kerbs cover the rest)
  for (const d of DIAGONALS) {
    const [ax, az] = d.from;
    const [bx, bz] = d.to;
    const len = Math.hypot(bx - ax, bz - az);
    const g = new THREE.BoxGeometry(len, 0.03, (LANE + WALK_W + 0.6) * 2).rotateY(Math.atan2(-(bz - az), bx - ax)).translate((ax + bx) / 2, 0.019, (az + bz) / 2);
    b.add(g, asphalt);
  }

  // Block slabs: the sidewalk round every block (the kerb) and the lot inside: downtown's blocks, the districts and the extra lots
  const kerb = toon('#5a5290');
  PLAN.blocks.forEach((blk, i) => {
    // (The bends' outer sidewalks are drawn as one kerb each, below)
    if (blk.id.startsWith('kerb-')) return;
    const slab = PLAN.slabs[i];
    const kind: LotKind =
      lots[blk.id] ??
      (blk.ref === 'garage' ? 'concrete' : blk.ref === 'market' || blk.ref === 'units' ? 'paving' : blk.use === 'park' ? 'grass' : blk.id.startsWith('dt-') ? 'paving' : 'grass');
    if (isRect(slab)) {
      const [x0, z0] = [Math.min(...slab.map((p) => p[0])), Math.min(...slab.map((p) => p[1]))];
      const [x1, z1] = [Math.max(...slab.map((p) => p[0])), Math.max(...slab.map((p) => p[1]))];
      b.box(x0, 0, z0, x1 - x0, SLAB, z1 - z0, kerb);
      b.box(x0 + WALK_W + 0.4, SLAB, z0 + WALK_W + 0.4, x1 - x0 - (WALK_W + 0.4) * 2, 0.005, z1 - z0 - (WALK_W + 0.4) * 2, LOTS[kind]);
    } else {
      b.add(slabPoly(slab, SLAB), kerb);
      // (A bend's outer sidewalk is all sidewalk: no lot)
      if (blk.walk) b.add(flatPoly(insetPoly(blk.poly, 0.4), SLAB + 0.003), LOTS[kind]);
    }
  });
  // The landmarks' own lots inside their blocks (grass round the Signal tower, concrete in the compound...)
  for (const [k, kind] of Object.entries(lots))
    if (SEATS[k]) {
      const [ox, oz] = SEATS[k];
      b.box(ox + 0.2, SLAB, oz + 0.2, BS - 0.4, 0.008, BS - 0.4, LOTS[kind]);
    }
  // The plots' and lots' pads on their blocks' lawns: a paved rim round each (the lots their own ground)
  const rim = toon('#4b4766');
  const padGround: Record<string, LotKind> = { garage: 'concrete', market: 'paving', units: 'paving' };
  for (const p of PADS) {
    const [x0, z0, x1, z1] = p.rect;
    b.box(x0, SLAB, z0, x1 - x0, 0.007, z1 - z0, rim);
    b.box(x0 + 0.3, SLAB, z0 + 0.3, x1 - x0 - 0.6, 0.01, z1 - z0 - 0.6, padGround[p.id] ? LOTS[padGround[p.id]] : toon('#367f5a'));
  }
  // The bending streets: asphalt wide enough to fill their corners at the avenues (the kerbs cover the rest)
  for (const bend of BENDS) {
    const hw = BEND_REACH + 0.4;
    const l = offsetLine(bend.pts, -hw);
    const r = offsetLine(bend.pts, hw);
    const pos: number[] = [];
    // Each triangle wound to face up (seen from above, whichever way the curve runs)
    const tri = (p: Pt, q: Pt, t: Pt) => {
      const up = (q[1] - p[1]) * (t[0] - p[0]) - (q[0] - p[0]) * (t[1] - p[1]) > 0;
      for (const v of up ? [p, q, t] : [p, t, q]) pos.push(v[0], 0.033, v[1]);
    };
    for (let i = 1; i < bend.pts.length; i++) {
      tri(l[i - 1], r[i - 1], r[i]);
      tri(l[i - 1], r[i], l[i]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    g.setIndex(Array.from({ length: pos.length / 3 }, (_, i) => i));
    b.add(g, asphalt);
  }

  // The bends' outer sidewalks: one continuous raised kerb, broken where a road crosses
  BENDS.forEach((bend, bi) => {
    const out = OUTSIDE[bi];
    const near = offsetLine(bend.pts, out * LANE);
    const far = offsetLine(bend.pts, out * BEND_REACH);
    const top: number[] = [];
    const wall: number[] = [];
    // A quad from four corners, wound to face `up` (the top) or away from the road / out of town (the walls)
    const quad = (list: number[], a: number[], c: number[], d: number[], e: number[], face: [number, number, number]) => {
      const cr = [(c[1] - a[1]) * (d[2] - a[2]) - (c[2] - a[2]) * (d[1] - a[1]), (c[2] - a[2]) * (d[0] - a[0]) - (c[0] - a[0]) * (d[2] - a[2]), (c[0] - a[0]) * (d[1] - a[1]) - (c[1] - a[1]) * (d[0] - a[0])];
      const ok = cr[0] * face[0] + cr[1] * face[1] + cr[2] * face[2] > 0;
      for (const v of ok ? [a, c, d, a, d, e] : [a, d, c, a, e, d]) list.push(...v);
    };
    const runs = KERB_RUNS[bi];
    for (let i = 1; i < bend.pts.length; i++) {
      if (!runs[i - 1]) continue;
      const [n0, n1, f0, f1] = [near[i - 1], near[i], far[i - 1], far[i]];
      quad(top, [n0[0], SLAB, n0[1]], [n1[0], SLAB, n1[1]], [f1[0], SLAB, f1[1]], [f0[0], SLAB, f0[1]], [0, 1, 0]);
      const towards = (from: Pt, to: Pt): [number, number, number] => [to[0] - from[0], 0, to[1] - from[1]];
      quad(wall, [n0[0], 0, n0[1]], [n1[0], 0, n1[1]], [n1[0], SLAB, n1[1]], [n0[0], SLAB, n0[1]], towards(f0, n0));
      quad(wall, [f0[0], 0, f0[1]], [f1[0], 0, f1[1]], [f1[0], SLAB, f1[1]], [f0[0], SLAB, f0[1]], towards(n0, f0));
      // Ends of a run
      if (i === 1 || !runs[i - 2]) quad(wall, [n0[0], 0, n0[1]], [f0[0], 0, f0[1]], [f0[0], SLAB, f0[1]], [n0[0], SLAB, n0[1]], towards(n1, n0));
      if (i === bend.pts.length - 1 || !runs[i]) quad(wall, [n1[0], 0, n1[1]], [f1[0], 0, f1[1]], [f1[0], SLAB, f1[1]], [n1[0], SLAB, n1[1]], towards(n0, n1));
    }
    for (const list of [top, wall]) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(list, 3));
      g.computeVertexNormals();
      b.add(g, kerb);
    }
  });

  // Lamps along the diagonals
  for (const l of DIAGONAL_LAMPS) addLamp(l.at[0], l.at[1], l.ry);
  b.build(scene, { cast: false, receive: true });

  // Lane markings and crosswalks, instanced: a dashed yellow centre line on streets,
  // white dashes between an avenue's lanes, zebra crossings on every arm of every crossing
  const dashes: THREE.Matrix4[] = [];
  const whites: THREE.Matrix4[] = [];
  const zebra: THREE.Matrix4[] = [];
  const m = new THREE.Matrix4();
  const q0 = new THREE.Quaternion();
  const lines = (r: Road) => (r.lanes === 1 ? [{ off: 0, yellow: true }] : [-1, 1].map((sd) => ({ off: sd * (MEDIAN / 2 + LANE), yellow: false })));
  for (const r of EW_ROADS)
    for (const { off, yellow } of lines(r))
      for (const [a0, a1] of runsBetween(across(r)))
        for (let p = a0 + 0.4; p < a1 - 0.3; p += 1.1) (yellow ? dashes : whites).push(m.clone().compose(new THREE.Vector3(p, 0.036, r.c + off), q0, new THREE.Vector3(0.55, 0.01, 0.07)));
  for (const r of NS_ROADS)
    for (const { off, yellow } of lines(r))
      for (const [a0, a1] of runsBetween(EW_ROADS, [river]))
        for (let p = a0 + 0.4; p < a1 - 0.3; p += 1.1) (yellow ? dashes : whites).push(m.clone().compose(new THREE.Vector3(r.c + off, 0.038, p), q0, new THREE.Vector3(0.07, 0.01, 0.55)));
  for (const nr of NS_ROADS)
    for (const er of EW_ROADS) {
      // A diagonal coming in from one corner: no zebras on the two arms it crosses
      const diag = DIAGONALS.map((d) => (d.from[0] === nr.c && d.from[1] === er.c ? d.to : d.to[0] === nr.c && d.to[1] === er.c ? d.from : null)).find(Boolean);
      const sx = diag ? Math.sign(diag[0] - nr.c) : 0;
      const sz = diag ? Math.sign(diag[1] - er.c) : 0;
      // Across the east-west road, either side of the crossing
      for (const side of [-1, 1])
        if (side !== sx)
          for (let k = er.c - er.half + 0.16; k < er.c + er.half - 0.1; k += 0.32) zebra.push(m.clone().compose(new THREE.Vector3(nr.c + side * (nr.half + 0.45), 0.04, k), q0, new THREE.Vector3(0.55, 0.01, 0.17)));
      // Across the north-south road
      for (const side of [-1, 1])
        if (side !== sz)
          for (let k = nr.c - nr.half + 0.16; k < nr.c + nr.half - 0.1; k += 0.32) zebra.push(m.clone().compose(new THREE.Vector3(k, 0.042, er.c + side * (er.half + 0.45)), q0, new THREE.Vector3(0.17, 0.01, 0.55)));
    }
  // A dashed centre line round each bend, clear of the roads it crosses
  for (const bend of BENDS) {
    let carry = 0;
    for (let i = 1; i < bend.pts.length; i++) {
      const [a, c] = [bend.pts[i - 1], bend.pts[i]];
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const [ux, uz] = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-uz, ux));
      for (let p = carry; p < len; p += 1.1) {
        const [x, z] = [a[0] + ux * p, a[1] + uz * p];
        if (NS_ROADS.some((r) => Math.abs(x - r.c) < r.half + 1.4) || EW_ROADS.some((r) => Math.abs(z - r.c) < r.half + 1.4) || onLiberty([x, z], 1.4)) continue;
        dashes.push(m.clone().compose(new THREE.Vector3(x, 0.037, z), q, new THREE.Vector3(0.55, 0.01, 0.07)));
      }
      carry = (carry - len) % 1.1;
      if (carry < 0) carry += 1.1;
    }
  }
  // A dashed centre line down each diagonal, clear of the crossings at its ends
  for (const d of DIAGONALS) {
    const [ax, az] = d.from;
    const [bx, bz] = d.to;
    const len = Math.hypot(bx - ax, bz - az);
    const [ux, uz] = [(bx - ax) / len, (bz - az) / len];
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-uz, ux));
    for (let p = 6; p < len - 3.6; p += 1.1) dashes.push(m.clone().compose(new THREE.Vector3(ax + ux * p, 0.037, az + uz * p), q, new THREE.Vector3(0.55, 0.01, 0.07)));
  }
  // Flat: two triangles a marking (thousands of them), lying on the asphalt
  const unit = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  for (const [list, mat] of [
    [dashes, neon('#f5d76e', 0.9, 1.1)],
    [whites, toon('#d9d5ee')],
    [zebra, toon('#e8e4f8')],
  ] as const) {
    const im = new THREE.InstancedMesh(unit, mat, list.length);
    list.forEach((mm, i) => im.setMatrixAt(i, mm));
    im.receiveShadow = true;
    scene.add(im);
  }

  // Neon streaks on wet asphalt (only visible in the rain, at dusk and night): one mesh,
  // shown only while it's raining (index.ts hides it when the sheen is off)
  const sb = new Batch();
  for (let i = 0; i < 70; i++) {
    const alongX = rand() < 0.5;
    const r = CORE_ROADS[Math.floor(rand() * CORE_ROADS.length)];
    const s = rand() * DOWNTOWN;
    const across = r - LANE + rand() * LANE * 2;
    const g = new THREE.PlaneGeometry(0.35, 2.4).rotateX(-Math.PI / 2);
    if (alongX) g.rotateY(Math.PI / 2).translate(s, 0.05, across);
    else g.translate(across, 0.05, s);
    sb.add(g, puddleMat);
  }
  const streaks = new THREE.Group();
  sb.build(streaks, { cast: false, receive: false });
  streaks.name = 'streaks';
  scene.add(fx(streaks));
  return { streaks };
}

/* ---------- Outskirts ---------- */

/**
 * Scatter trees outside town, off the roads and the river: `count` in the belt round the
 * city, and a lighter sprinkle (`count` * `sparse`) across the open land out to the world's edge.
 */
export function scatterOutskirts(count: number, sparse = 0.6) {
  // The belt: a band round the town (inside the Parkway and the Southside Loop), out to about 20 past them
  const belt: [number, number, number, number] = [PROMENADE.x[0] - 24, PROMENADE.x[1] + 24, PARKWAY_TOP - 24, SOUTHSIDE_BOTTOM + 24];
  scatterIn(count, [belt[0], belt[1]], [belt[2], belt[3]]);
  scatterIn(Math.round(count * sparse), [EXT[0] + 4, EXT[1] - 4], [EXT[0] + 4, EXT[1] - 4], belt);
}

/** Trees across x / z ranges, kept off the town, the roads and the river (and out of `skip`, a box already planted) */
function scatterIn(count: number, xr: [number, number], zr: [number, number], skip?: [number, number, number, number]) {
  let placed = 0;
  let guard = 0;
  while (placed < count && guard++ < count * 20) {
    const x = xr[0] + rand() * (xr[1] - xr[0]);
    const z = zr[0] + rand() * (zr[1] - zr[0]);
    if (skip && x > skip[0] && x < skip[1] && z > skip[2] && z < skip[3]) continue;
    // The kart park and its slip road (kartpark.ts)
    if (x > KART_PARK.x0 - 3 && x < KART_PARK.x1 + 3 && z > KART_PARK.z0 - 3 && z < KART_PARK.z1 + 3) continue;
    if (Math.abs(x - SLIP_ROAD.x) < SLIP_ROAD.half + 2 && z > SLIP_ROAD.z0 - 1 && z < SLIP_ROAD.z1 + 1) continue;
    // Clear of the town (inside the bends, the river and its banks) and of the bends themselves
    if (inTown([x, z], 1.2)) continue;
    // Clear of the airport and of the low end of its approach
    if (x > SITE[0] - 1 && x < SITE[2] + 1 && z > SITE[1] - 1 && z < SITE[3] + 1) continue;
    if (x > -40 && x < SITE[0] && Math.abs(z - RUNWAY.z) < 12) continue;
    if (EW_ROADS.some((r) => Math.abs(z - r.c) < r.half + 0.8) || NS_ROADS.some((r) => Math.abs(x - r.c) < r.half + 0.8)) continue;
    if (z > RIVER[0] - 1 && z < RIVER[1] + 0.8) continue;
    addTree(x, z, 0.8 + rand() * 0.6, rand() < 0.4, 0);
    placed++;
  }
}

/** A ring of towers on the horizon, past the world's edge, so the city reads as part of a metropolis. */
export function buildSkyline(scene: THREE.Scene, count: number, tick: (f: Tick) => void) {
  const mats = [
    facadeMat({ cols: 6, rows: 26, wall: '#241d4a', lit: [PAL.warm, PAL.cyan], litRatio: 0.45, seed: 11 }, 0.1, 1.4),
    facadeMat({ cols: 6, rows: 26, wall: '#2c1f55', lit: [PAL.pink, PAL.warm], litRatio: 0.4, seed: 12 }, 0.1, 1.4),
    facadeMat({ cols: 6, rows: 26, wall: '#1b2550', lit: [PAL.cyan], litRatio: 0.5, seed: 13 }, 0.1, 1.4),
  ];
  const roof = toon('#1a1636', { fog: false });
  // Out past the world's edge, the haze would swallow them whole: they stand clear of it, a skyline on the horizon
  for (const m of mats) m.fog = false;
  // Merged: one mesh per facade, one for the roofs and masts, one for the beacons
  const b = new Batch();
  const lights = new Batch();
  const beaconMat = neon('#ff3b3b', 0.4, 3);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rand() * 0.1;
    // A ring just past the world's edge, so the metropolis carries on beyond the land you can build on.
    // The world is square: the ring follows its edge (a rounded square), so no tower stands on the
    // land in the corners (the kart park fills the north-east one)
    const reach = (EXT[1] - EXT[0]) / 2;
    const rr = reach / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))) + 18 + rand() * 40;
    const x = (EXT[0] + EXT[1]) / 2 + Math.cos(a) * rr;
    const z = (EXT[0] + EXT[1]) / 2 + Math.sin(a) * rr;
    // None by the airport (it reaches nearly to the world's edge in the south-east): they'd loom over the runway
    const w = 7 + rand() * 9;
    const h = 22 + rand() * 50;
    if (Math.hypot(x - (SITE[0] + SITE[2]) / 2, z - (SITE[1] + SITE[3]) / 2) < 150) continue;
    const mat = mats[i % mats.length];
    const mesh = new THREE.Mesh(sidesBox(w, h, w), [mat, roof]);
    mesh.position.set(x, h / 2, z);
    mesh.rotation.y = rand() * Math.PI;
    b.mesh(mesh);
    if (h > 45) {
      lights.add(new THREE.SphereGeometry(0.6, 8, 6).translate(x, h + 2.6, z), beaconMat);
      b.add(new THREE.CylinderGeometry(0.14, 0.14, 2.6).translate(x, h + 1.3, z), roof);
    }
  }
  b.build(scene, { cast: false, receive: false });
  const beacons = new THREE.Group();
  lights.build(beacons, { cast: false, receive: false });
  scene.add(fx(beacons));
  tick(({ t }) => {
    beacons.visible = Math.sin(t * 3) > 0.3;
  });
}

/* ---------- Instanced trees and lamps ---------- */

export function buildTrees(scene: THREE.Scene) {
  const round = trees.filter((t) => !t.pine);
  const pines = trees.filter((t) => t.pine);
  // Open-ended: the canopy hides the top, the ground the bottom
  const trunkGeo = new THREE.CylinderGeometry(0.07, 0.09, 1, 6, 1, true);
  const canopyGeo = new THREE.IcosahedronGeometry(0.42, 1);
  const coneGeo = new THREE.ConeGeometry(0.42, 0.9, 7);
  const trunk = new THREE.InstancedMesh(trunkGeo, toon('#6b4630'), trees.length);
  const canopy = new THREE.InstancedMesh(canopyGeo, toon('#ffffff', { name: 'canopy' }), round.length);
  const cones = new THREE.InstancedMesh(coneGeo, toon('#1d7a55'), pines.length * 2);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const greens = ['#2fae6e', '#33b878', '#24995f', '#3fc485', '#2a9d63'].map((c) => new THREE.Color(c));
  trees.forEach((t, i) => {
    const h = t.pine ? 0.45 : 0.6;
    trunk.setMatrixAt(i, m.compose(new THREE.Vector3(t.x, t.y + (h * t.s) / 2, t.z), q, new THREE.Vector3(t.s, h * t.s, t.s)));
  });
  round.forEach((t, i) => {
    canopy.setMatrixAt(i, m.compose(new THREE.Vector3(t.x, t.y + 0.85 * t.s, t.z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6), new THREE.Vector3(t.s, t.s * 0.95, t.s)));
    canopy.setColorAt(i, greens[i % greens.length]);
  });
  q.identity();
  pines.forEach((t, i) => {
    cones.setMatrixAt(i * 2, m.compose(new THREE.Vector3(t.x, t.y + 0.75 * t.s, t.z), q, new THREE.Vector3(t.s, t.s, t.s)));
    cones.setMatrixAt(i * 2 + 1, m.compose(new THREE.Vector3(t.x, t.y + 1.2 * t.s, t.z), q, new THREE.Vector3(t.s * 0.75, t.s * 0.8, t.s * 0.75)));
  });
  for (const im of [trunk, canopy, cones]) {
    im.castShadow = true;
    im.receiveShadow = true;
    scene.add(im);
  }
}

export function buildLamps(scene: THREE.Scene) {
  const n = lamps.length;
  const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.05, 1.6, 6), toon('#1b1830'), n);
  const arm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.05, 0.05), toon('#1b1830'), n);
  const bulb = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.07, 0.12), neon('#fff1c2', 0.6, 2.4), n);
  // Halos are points, so they always face the camera
  const haloPos = new Float32Array(n * 3);
  const haloMat = lit(
    new THREE.PointsMaterial({ color: '#ffe2a0', map: glowTex, size: 1.1, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
    0,
    0.3
  );
  const pool = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), lit(glowMat('#ffd98a', 1), 0, 0.26), n + pools.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  lamps.forEach((l, i) => {
    q.setFromAxisAngle(up, l.ry);
    const dir = new THREE.Vector3(0.2, 0, 0).applyQuaternion(q);
    pole.setMatrixAt(i, m.compose(new THREE.Vector3(l.x, l.y + 0.8, l.z), q, new THREE.Vector3(1, 1, 1)));
    arm.setMatrixAt(i, m.compose(new THREE.Vector3(l.x + dir.x, l.y + 1.58, l.z + dir.z), q, new THREE.Vector3(1, 1, 1)));
    bulb.setMatrixAt(i, m.compose(new THREE.Vector3(l.x + dir.x * 2, l.y + 1.53, l.z + dir.z * 2), q, new THREE.Vector3(1, 1, 1)));
    haloPos.set([l.x + dir.x * 2, l.y + 1.5, l.z + dir.z * 2], i * 3);
    pool.setMatrixAt(i, m.compose(new THREE.Vector3(l.x + dir.x * 2, l.y + 0.02, l.z + dir.z * 2), flat, new THREE.Vector3(2.6, 2.6, 2.6)));
  });
  pools.forEach((p, i) => pool.setMatrixAt(n + i, m.compose(new THREE.Vector3(p.x, p.y + 0.02, p.z), flat, new THREE.Vector3(p.size, p.size, p.size))));
  pole.castShadow = arm.castShadow = true;
  const haloGeo = new THREE.BufferGeometry();
  haloGeo.setAttribute('position', new THREE.BufferAttribute(haloPos, 3));
  scene.add(pole, arm, bulb, fx(new THREE.Points(haloGeo, haloMat)), fx(pool));
}
