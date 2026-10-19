/*
 * The ground the city stands on: grass, roads with markings, the river and
 * its bridges, block slabs, trees, street lamps and a skyline in the haze.
 *
 * World units: 1 = one map tile. x and z match the 2D map's x and y; y is up.
 * The street plan is in layout.ts: the core city's blocks at 0-9, 14-23 and
 * 28-37 with core streets (one lane each way) between them, ring avenues
 * (two lanes each way and a median) round them, and the plot districts
 * (see plots.ts) beyond to the north, west and east. The river runs south of
 * the north-bank avenue; across its four bridges the south bank avenue
 * carries the south row of districts. Every block has a sidewalk, and both
 * banks a lamp-lit promenade.
 */
import * as THREE from 'three';
import { DISTRICTS } from '../../data/plots';
import { Batch, PAL, canvasTex, facadeMat, fx, glowMat, glowTex, lit, neon, rand, toon } from './kit';
import { BLOCKS, BS, CENTER_XZ, CORE_ROADS, EW_ROADS, EXT, LANE, MEDIAN, NS_ROADS, RIVER, SOUTH_ROAD, WALK_W, type Road } from './layout';

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

export function buildGround(scene: THREE.Scene, lots: Record<string, keyof typeof LOTS>) {
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
  b.box(e0, 0, RIVER[0] - 0.25, L, 0.12, 0.25, stone);
  b.box(e0, 0, RIVER[1], L, 0.12, 0.25, stone);

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
  const nearBridge = (x: number) => NS_ROADS.some((r) => Math.abs(x - r.c) < r.half + WALK_W + 0.9);
  for (let x = -20; x <= 58; x += 6)
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
  for (const r of EW_ROADS)
    if (r.lanes === 2)
      for (const [a0, a1] of runsBetween(NS_ROADS)) {
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

  // Block slabs: the sidewalk round every block (the kerb) and the lot inside, core and districts
  const kerb = toon('#5a5290');
  const slabs: [number, number][] = [...BLOCKS.flatMap((ox) => BLOCKS.map((oz) => [ox, oz] as [number, number])), ...DISTRICTS.map((d) => [d.ox, d.oz] as [number, number])];
  for (const [ox, oz] of slabs) {
    b.box(ox - WALK_W, 0, oz - WALK_W, BS + WALK_W * 2, SLAB, BS + WALK_W * 2, kerb);
    const lot = LOTS[lots[`${ox},${oz}`] ?? 'grass'];
    b.box(ox + 0.4, SLAB, oz + 0.4, BS - 0.8, 0.005, BS - 0.8, lot);
  }
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
      for (const [a0, a1] of runsBetween(NS_ROADS))
        for (let p = a0 + 0.4; p < a1 - 0.3; p += 1.1) (yellow ? dashes : whites).push(m.clone().compose(new THREE.Vector3(p, 0.036, r.c + off), q0, new THREE.Vector3(0.55, 0.01, 0.07)));
  for (const r of NS_ROADS)
    for (const { off, yellow } of lines(r))
      for (const [a0, a1] of runsBetween(EW_ROADS, [river]))
        for (let p = a0 + 0.4; p < a1 - 0.3; p += 1.1) (yellow ? dashes : whites).push(m.clone().compose(new THREE.Vector3(r.c + off, 0.038, p), q0, new THREE.Vector3(0.07, 0.01, 0.55)));
  for (const nr of NS_ROADS)
    for (const er of EW_ROADS) {
      // Across the east-west road, either side of the crossing
      for (const at of [nr.c - nr.half - 0.45, nr.c + nr.half + 0.45])
        for (let k = er.c - er.half + 0.16; k < er.c + er.half - 0.1; k += 0.32) zebra.push(m.clone().compose(new THREE.Vector3(at, 0.04, k), q0, new THREE.Vector3(0.55, 0.01, 0.17)));
      // Across the north-south road
      for (const at of [er.c - er.half - 0.45, er.c + er.half + 0.45])
        for (let k = nr.c - nr.half + 0.16; k < nr.c + nr.half - 0.1; k += 0.32) zebra.push(m.clone().compose(new THREE.Vector3(k, 0.042, at), q0, new THREE.Vector3(0.17, 0.01, 0.55)));
    }
  const unit = new THREE.BoxGeometry(1, 1, 1);
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

  // Neon streaks on wet asphalt (only visible in the rain, at dusk and night)
  const streaks = new THREE.Group();
  const sg = new THREE.PlaneGeometry(0.35, 2.4);
  for (let i = 0; i < 70; i++) {
    const alongX = rand() < 0.5;
    const r = CORE_ROADS[Math.floor(rand() * CORE_ROADS.length)];
    const s = rand() * (BLOCKS[2] + BS);
    const mesh = new THREE.Mesh(sg, puddleMat);
    mesh.rotation.x = -Math.PI / 2;
    const across = r - LANE + rand() * LANE * 2;
    if (alongX) {
      mesh.rotation.z = Math.PI / 2;
      mesh.position.set(s, 0.05, across);
    } else mesh.position.set(across, 0.05, s);
    streaks.add(mesh);
  }
  scene.add(fx(streaks));
}

/* ---------- Outskirts ---------- */

/** Scatter trees outside town, off the roads and the river. */
export function scatterOutskirts(count: number) {
  let placed = 0;
  let guard = 0;
  while (placed < count && guard++ < count * 20) {
    const x = -44 + rand() * 125;
    const z = -44 + rand() * 132;
    // Clear of the core city, the districts round it and the south row across the river
    const [lo, hi] = [DISTRICTS[0].ox - WALK_W - 0.6, DISTRICTS[4].ox + BS + WALK_W + 0.6];
    if (x > lo && x < hi && z > lo && z < RIVER[0]) continue;
    const south = DISTRICTS[DISTRICTS.length - 1];
    if (x > lo && x < hi && z > RIVER[1] && z < south.oz + BS + WALK_W + 0.6) continue;
    if (EW_ROADS.some((r) => Math.abs(z - r.c) < r.half + 0.8) || NS_ROADS.some((r) => Math.abs(x - r.c) < r.half + 0.8)) continue;
    if (z > RIVER[0] - 1 && z < RIVER[1] + 0.8) continue;
    addTree(x, z, 0.8 + rand() * 0.6, rand() < 0.4, 0);
    placed++;
  }
}

/** A ring of towers in the haze, so the city reads as part of a metropolis. */
export function buildSkyline(scene: THREE.Scene, count: number, tick: (f: Tick) => void) {
  const mats = [
    facadeMat({ cols: 4, rows: 12, wall: '#241d4a', lit: [PAL.warm, PAL.cyan], litRatio: 0.45, seed: 11 }, 0.1, 1.4),
    facadeMat({ cols: 4, rows: 12, wall: '#2c1f55', lit: [PAL.pink, PAL.warm], litRatio: 0.4, seed: 12 }, 0.1, 1.4),
    facadeMat({ cols: 4, rows: 12, wall: '#1b2550', lit: [PAL.cyan], litRatio: 0.5, seed: 13 }, 0.1, 1.4),
  ];
  const roof = toon('#1a1636');
  const beacons: THREE.Mesh[] = [];
  const beaconMat = neon('#ff3b3b', 0.4, 3);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rand() * 0.1;
    // A ring round all the districts (the south row across the river included), well clear of them
    const rr = 72 + rand() * 30;
    const x = CENTER.x + Math.cos(a) * rr;
    const z = CENTER.z + 8 + Math.sin(a) * rr;
    const w = 3 + rand() * 4;
    const h = 7 + rand() * 22;
    const mat = mats[i % mats.length];
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), [mat, mat, roof, roof, mat, mat]);
    mesh.position.set(x, h / 2, z);
    mesh.rotation.y = rand() * Math.PI;
    scene.add(mesh);
    if (h > 20) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), beaconMat);
      b.position.set(x, h + 1.2, z);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2), roof);
      mast.position.set(x, h + 0.6, z);
      scene.add(mast, fx(b));
      beacons.push(b);
    }
  }
  tick(({ t }) => {
    const on = Math.sin(t * 3) > 0.3;
    for (const b of beacons) b.visible = on;
  });
}

/* ---------- Instanced trees and lamps ---------- */

export function buildTrees(scene: THREE.Scene) {
  const round = trees.filter((t) => !t.pine);
  const pines = trees.filter((t) => t.pine);
  const trunkGeo = new THREE.CylinderGeometry(0.07, 0.09, 1, 6);
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
  const bulb = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.07, 0.12), neon('#fff1c2', 0.6, 3.2), n);
  // Halos are points, so they always face the camera
  const haloPos = new Float32Array(n * 3);
  const haloMat = lit(
    new THREE.PointsMaterial({ color: '#ffe2a0', map: glowTex, size: 1.1, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
    0,
    0.38
  );
  const pool = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), lit(glowMat('#ffd98a', 1), 0, 0.26), n);
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
  pole.castShadow = arm.castShadow = true;
  const haloGeo = new THREE.BufferGeometry();
  haloGeo.setAttribute('position', new THREE.BufferAttribute(haloPos, 3));
  scene.add(pole, arm, bulb, fx(new THREE.Points(haloGeo, haloMat)), fx(pool));
}
