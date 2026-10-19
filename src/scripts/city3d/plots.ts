/*
 * The city builder in 3D: the large plots (one per district, its 3 x 3
 * squares merged into one), the overlay shown in build mode, picking plots
 * under the pointer, and the buildings owners put on them (eight types, each
 * customisable, drawn PLOT_SCALE times their base size).
 */
import * as THREE from 'three';
import { DISTRICTS, PLOT_PRICE, type BuildingType, type Design } from '../../data/plots';
import { Batch, FONT_MONO, PAL, canvasTex, facadeMat, fx, glowTex, lit, neon, neonSign, roundRect, shadeHex, toon } from './kit';
import { BS, SLAB, type Tick } from './world';

export type { Design };

export interface Plot {
  /** The district's id, e.g. "N3" */
  id: string;
  district: string;
  districtName: string;
  x0: number;
  z0: number;
  size: number;
  cx: number;
  cz: number;
  /** PLS */
  price: number;
}

/** Who has a plot: you, someone else, or a payment for it is being checked */
export type PlotState = 'mine' | 'taken' | 'pending';

/* ---------- The plots ---------- */

const KERB = 0.4;
export const PLOT_SIZE = BS - KERB * 2;
/** Buildings fill a large plot at this many times their base size */
export const PLOT_SCALE = 3;

export const PLOTS: Plot[] = DISTRICTS.map((d) => {
  const x0 = d.ox + KERB;
  const z0 = d.oz + KERB;
  return { id: d.id, district: d.id, districtName: d.name, x0, z0, size: PLOT_SIZE, cx: x0 + PLOT_SIZE / 2, cz: z0 + PLOT_SIZE / 2, price: PLOT_PRICE };
});
export const PLOT_BY_ID = new Map(PLOTS.map((p) => [p.id, p]));
export const plotById = (id: string) => PLOT_BY_ID.get(id) ?? null;

export function plotAt(x: number, z: number) {
  return PLOTS.find((p) => x >= p.x0 && x < p.x0 + p.size && z >= p.z0 && z < p.z0 + p.size) ?? null;
}

/** The nearest plot from `from` in a direction (for keyboard moves). */
export function plotToward(from: Plot, dx: number, dz: number) {
  let best: Plot | null = null;
  let score = Infinity;
  for (const p of PLOTS) {
    if (p === from) continue;
    const vx = p.cx - from.cx;
    const vz = p.cz - from.cz;
    const along = vx * dx + vz * dz;
    if (along <= 0.5) continue;
    const across = Math.abs(vx * dz - vz * dx);
    const s = along + across * 2.5;
    if (s < score) {
      score = s;
      best = p;
    }
  }
  return best;
}

/* ---------- Shared building materials (cached, so a hundred buildings share them) ---------- */

const cache = new Map<string, THREE.Material>();
function cached<M extends THREE.Material>(key: string, make: () => M): M {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key) as M;
}
const facadeOf = (key: string, o: Parameters<typeof facadeMat>[0]) => cached(`facade:${key}`, () => facadeMat(o, 0.15, 1.7));
const signOf = (text: string, color: string) =>
  cached(`sign:${text}:${color}`, () => lit(new THREE.MeshBasicMaterial({ map: neonSign(text, color, { board: null }), transparent: true, depthWrite: false }), 1, 2.4));
const glowOf = (color: string, day = 0.8, night = 2) => cached(`glow:${color}:${day}:${night}`, () => lit(new THREE.MeshBasicMaterial({ color }), day, night));

const degenBoard = (img: HTMLImageElement | null) =>
  cached('billboard', () => {
    const tex = canvasTex(1024, 640, (c) => {
      const g = c.createLinearGradient(0, 640, 1024, 0);
      g.addColorStop(0, '#5a0f6e');
      g.addColorStop(0.55, '#2a1a8a');
      g.addColorStop(1, '#0b5fa8');
      c.fillStyle = g;
      c.fillRect(0, 0, 1024, 640);
      if (img) {
        const h = 610;
        c.drawImage(img, 30, 640 - h, (img.width / img.height) * h, h);
      }
      c.font = `900 220px "Big Shoulders Display", Impact, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.lineWidth = 22;
      c.strokeStyle = PAL.ink;
      c.strokeText('GM', 760, 320);
      c.fillStyle = '#ffffff';
      c.fillText('GM', 760, 320);
      c.lineWidth = 24;
      c.strokeRect(12, 12, 1000, 616);
    });
    return lit(new THREE.MeshBasicMaterial({ map: tex }), 1, 1.3);
  });

const stripeOf = (color: string) =>
  cached(`stripe:${color}`, () => {
    const tex = canvasTex(256, 32, (c) => {
      for (let i = 0; i < 8; i++) {
        c.fillStyle = i % 2 ? '#f3f2f7' : color;
        c.fillRect(i * 32, 0, 32, 32);
      }
    });
    return new THREE.MeshToonMaterial({ map: tex });
  });

/* ---------- Building generators (plot centre at the origin, ground at y = 0) ---------- */

const V2 = (x: number, y: number) => new THREE.Vector2(x, y);
function geoBox(w: number, h: number, d: number, x: number, y: number, z: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y + h / 2, z);
  return g;
}
function shell(w: number, h: number, d: number, side: THREE.Material, top: THREE.Material, y = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, top, top, side, side]);
  m.position.y = y + h / 2;
  m.castShadow = m.receiveShadow = true;
  return m;
}
function signPlane(mat: THREE.Material, w: number, h: number, x: number, y: number, z: number) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  p.position.set(x, y, z);
  return fx(p);
}
const darker = (c: string, k = 0.45) => shadeHex(c, -k);

interface GenCtx {
  degen: HTMLImageElement | null;
  /** Things that animate on their own (arcade bulbs) */
  blinkers: THREE.Points[];
}

const GEN: Record<BuildingType, (o: Design, g: THREE.Group, b: Batch, ctx: GenCtx) => void> = {
  house(o, g, b) {
    const w = 1.7;
    const d = 1.4;
    const h = 0.95;
    g.add(shell(w, h, d, facadeOf(`house:${o.color}`, { cols: 3, rows: 1, wall: o.color, lit: [PAL.warm], litRatio: 0.85, seed: 61 }), toon(darker(o.color))));
    const roof = new THREE.ExtrudeGeometry(new THREE.Shape([V2(-d / 2 - 0.14, 0), V2(d / 2 + 0.14, 0), V2(0, 0.7)]), { depth: w + 0.24, bevelEnabled: false });
    roof.rotateY(Math.PI / 2);
    roof.translate(-(w + 0.24) / 2, h, 0);
    b.add(roof, toon(darker(o.color, 0.6)));
    b.add(geoBox(0.32, 0.55, 0.05, 0, 0, d / 2 + 0.02), toon('#2a1d55'));
    b.add(geoBox(0.4, 0.05, 0.1, 0, 0.6, d / 2 + 0.05), glowOf(o.neon));
    b.add(geoBox(0.2, 0.55, 0.2, 0.45, h + 0.15, -0.25), toon(darker(o.color, 0.3)));
    b.add(geoBox(0.5, 0.03, 0.5, 0, 0, d / 2 + 0.32), toon('#c9c4e6'));
  },

  shop(o, g, b) {
    const w = 2.0;
    const d = 1.6;
    const h = 1.5;
    g.add(shell(w, h, d, facadeOf(`shop:${o.color}`, { cols: 4, rows: 2, wall: o.color, lit: [PAL.warm, PAL.warm, PAL.cyan], litRatio: 0.75, seed: 62 }), toon(darker(o.color))));
    b.add(geoBox(w + 0.1, 0.1, d + 0.1, 0, h, 0), toon(darker(o.color, 0.55)));
    b.add(geoBox(w, 0.45, 0.1, 0, h, d / 2 - 0.05), toon('#14102a'));
    g.add(signPlane(signOf(o.sign, o.neon), 1.85, 0.46, 0, h + 0.23, d / 2 + 0.011));
    const awning = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.04, 0.5), stripeOf(o.neon));
    awning.position.set(0, 0.82, d / 2 + 0.22);
    awning.rotation.x = 0.4;
    awning.castShadow = true;
    g.add(awning);
  },

  tower(o, g, b) {
    const n = o.floors;
    const fh = 0.34;
    const w = 1.6;
    const h = n * fh;
    b.add(geoBox(1.95, 0.3, 1.95, 0, 0, 0), toon(o.color));
    g.add(
      shell(w, h, w, facadeOf(`tower:${o.color}:${n}`, { cols: 4, rows: n, wall: darker(o.color, 0.55), lit: [PAL.cyan, PAL.pink, PAL.warm, o.neon], litRatio: 0.62, seed: 63 + n, bands: darker(o.color, 0.3) }), toon(darker(o.color, 0.65)), 0.3)
    );
    const strip = glowOf(o.neon, 1, 3);
    for (const [x, z] of [
      [w / 2, w / 2],
      [-w / 2, w / 2],
      [w / 2, -w / 2],
      [-w / 2, -w / 2],
    ])
      b.add(geoBox(0.07, h, 0.07, x, 0.3, z), strip);
    b.add(geoBox(1.15, 0.32, 1.15, 0, h + 0.3, 0), toon(darker(o.color, 0.7)));
    const spire = new THREE.CylinderGeometry(0.03, 0.05, 1.0, 6);
    spire.translate(0, h + 0.62 + 0.5, 0);
    b.add(spire, toon('#1b1830'));
    b.add(geoBox(0.14, 0.14, 0.14, 0, h + 1.6, 0), glowOf(o.neon, 1.5, 4));
  },

  loft(o, g, b) {
    const n = o.floors;
    const fh = 0.42;
    const w = 2.0;
    const d = 1.5;
    const h = n * fh;
    g.add(shell(w, h, d, facadeOf(`loft:${o.color}:${n}`, { cols: 5, rows: n, wall: o.color, lit: [PAL.warm, PAL.warm, o.neon], litRatio: 0.7, seed: 70 + n }), toon(darker(o.color))));
    for (let k = 1; k < n; k++) {
      b.add(geoBox(1.8, 0.04, 0.3, 0, k * fh, d / 2 + 0.15), toon(darker(o.color, 0.3)));
      b.add(geoBox(1.8, 0.16, 0.03, 0, k * fh + 0.04, d / 2 + 0.29), toon('#c9c4e6'));
    }
    b.add(geoBox(1.8, 0.1, 1.3, 0, h, 0), toon('#2fae6e'));
    for (const [x, z] of [
      [-0.6, -0.3],
      [0.55, 0.25],
      [0.1, -0.35],
    ]) {
      const c = new THREE.ConeGeometry(0.16, 0.45, 7);
      c.translate(x, h + 0.1 + 0.22, z);
      b.add(c, toon('#1d7a55'));
    }
  },

  arcade(o, g, b, ctx) {
    const w = 2.1;
    const d = 1.7;
    const h = 1.0;
    b.add(geoBox(w, h, d, 0, 0, 0), toon(darker(o.color, 0.5)));
    b.add(geoBox(w + 0.08, 0.08, d + 0.08, 0, h, 0), toon(o.color));
    g.add(signPlane(glowOf(o.neon, 0.9, 2.2), 1.1, 0.6, 0, 0.32, d / 2 + 0.011));
    b.add(geoBox(2.0, 0.6, 0.08, 0, h + 0.05, 0.55), toon('#14102a'));
    g.add(signPlane(signOf(o.sign, o.neon), 1.9, 0.5, 0, h + 0.35, 0.6));
    // Marquee bulbs round the sign
    const pts: number[] = [];
    for (let i = 0; i <= 12; i++) {
      const x = -0.98 + (i / 12) * 1.96;
      pts.push(x, h + 0.08, 0.61, x, h + 0.62, 0.61);
    }
    for (let i = 1; i < 4; i++) {
      const y = h + 0.08 + (i / 4) * 0.54;
      pts.push(-0.98, y, 0.61, 0.98, y, 0.61);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const bulbs = new THREE.Points(geo, new THREE.PointsMaterial({ color: PAL.warm, map: glowTex, size: 0.16, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    g.add(fx(bulbs));
    ctx.blinkers.push(bulbs);
  },

  garden(o, g, b) {
    b.add(geoBox(2.3, 0.04, 2.3, 0, 0, 0), toon('#2f8a5a'));
    for (const [x, z] of [
      [-0.8, -0.8],
      [0.8, -0.8],
      [-0.8, 0.8],
      [0.8, 0.8],
    ]) {
      b.add(geoBox(0.5, 0.12, 0.5, x, 0.04, z), toon('#6b4630'));
      b.add(geoBox(0.42, 0.08, 0.42, x, 0.16, z), toon(o.color));
    }
    for (const [x, z, s] of [
      [-0.35, -0.75, 1],
      [0.75, 0.1, 0.8],
    ]) {
      const trunk = new THREE.CylinderGeometry(0.05, 0.06, 0.45, 6);
      trunk.translate(x, 0.27, z);
      b.add(trunk, toon('#6b4630'));
      const top = new THREE.IcosahedronGeometry(0.34 * s, 1);
      top.translate(x, 0.7, z);
      b.add(top, toon('#33b878'));
    }
    const pine = new THREE.ConeGeometry(0.28, 0.9, 7);
    pine.translate(-0.75, 0.5, 0.1);
    b.add(pine, toon('#1d7a55'));
    b.add(geoBox(0.7, 0.18, 0.25, 0.1, 0.04, 0.85), toon('#7a4fb0'));
    const basin = new THREE.CylinderGeometry(0.36, 0.38, 0.18, 18);
    basin.translate(0.15, 0.13, -0.1);
    b.add(basin, toon('#8f8ab0'));
    const water = new THREE.CylinderGeometry(0.3, 0.3, 0.02, 18);
    water.translate(0.15, 0.22, -0.1);
    b.add(water, toon('#3f98ff'));
    const jet = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6);
    jet.translate(0.15, 0.42, -0.1);
    b.add(jet, glowOf(o.neon, 0.8, 2));
  },

  warehouse(o, g, b) {
    const w = 2.1;
    const d = 1.8;
    const h = 0.9;
    g.add(shell(w, h, d, facadeOf(`warehouse:${o.color}`, { cols: 4, rows: 1, wall: o.color, lit: [PAL.warm], litRatio: 0.5, seed: 80 }), toon(darker(o.color))));
    const tooth = new THREE.Shape([V2(0, 0), V2(0.9, 0), V2(0.9, 0.5)]);
    for (let k = 0; k < 2; k++) {
      const t = new THREE.ExtrudeGeometry(tooth, { depth: w, bevelEnabled: false });
      t.rotateY(-Math.PI / 2);
      t.translate(w / 2, h, -d / 2 + k * 0.9);
      b.add(t, toon(darker(o.color, 0.35)));
      b.add(geoBox(w - 0.04, 0.48, 0.02, 0, h + 0.01, -d / 2 + (k + 1) * 0.9 + 0.005), glowOf(o.neon, 0.6, 1.8));
    }
    b.add(geoBox(1.1, 0.7, 0.04, 0, 0, d / 2 + 0.02), glowOf('#ffb347', 0.8, 1.9));
    b.add(geoBox(1.2, 0.08, 0.1, 0, 0.7, d / 2 + 0.04), toon('#1b1830'));
  },

  billboard(o, g, b, ctx) {
    b.add(geoBox(0.95, 0.75, 0.75, -0.5, 0, 0.45), toon(o.color));
    b.add(geoBox(1.05, 0.06, 0.85, -0.5, 0.75, 0.45), toon(darker(o.color, 0.5)));
    b.add(geoBox(0.5, 0.35, 0.03, -0.5, 0.25, 0.83), glowOf(PAL.warm, 0.8, 1.8));
    for (const x of [-0.75, 0.75]) b.add(geoBox(0.08, 1.45, 0.08, x, 0, -0.35), toon('#1b1830'));
    b.add(geoBox(2.1, 1.32, 0.08, 0, 1.4, -0.4), toon('#14102a'));
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.25), degenBoard(ctx.degen));
    board.position.set(0, 1.4 + 0.66, -0.355);
    g.add(fx(board));
    const trim = glowOf(o.neon, 1, 2.6);
    b.add(geoBox(2.1, 0.05, 0.1, 0, 1.38, -0.36), trim);
    b.add(geoBox(2.1, 0.05, 0.1, 0, 2.7, -0.36), trim);
  },
};

/* ---------- Overlay and for-sale signs ---------- */

const frameTex = canvasTex(128, 128, (c) => {
  c.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(c, 6, 6, 116, 116, 14);
  c.fill();
  c.lineWidth = 6;
  c.strokeStyle = '#ffffff';
  c.stroke();
});
const saleTex = canvasTex(256, 128, (c) => {
  c.fillStyle = '#14102a';
  c.fillRect(0, 0, 256, 128);
  c.lineWidth = 8;
  c.strokeStyle = PAL.cyan;
  c.strokeRect(6, 6, 244, 116);
  c.font = `700 46px ${FONT_MONO}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#ffffff';
  c.fillText('PLOT', 128, 48);
  c.font = `700 30px ${FONT_MONO}`;
  c.fillStyle = PAL.cyan;
  c.fillText('FOR SALE', 128, 92);
});

const COLORS = {
  free: new THREE.Color('#00eaff').multiplyScalar(0.55),
  mine: new THREE.Color('#ff6ad5'),
  taken: new THREE.Color('#8000ff').multiplyScalar(0.7),
  pending: new THREE.Color('#ffd36b'),
  hover: new THREE.Color('#7cf4ff'),
  selected: new THREE.Color('#ffffff'),
};

export interface PlotsApi {
  /** The plot under a ray */
  pick(ray: THREE.Ray): Plot | null;
  setOverlay(on: boolean): void;
  setHover(id: string | null): void;
  setSelected(id: string | null): void;
  /** Plots that aren't for sale (anything missing is free) */
  setStates(states: Map<string, PlotState>): void;
  /** Put a building on a plot (or clear it with null) */
  show(id: string, design: Design | null, animate?: boolean): void;
  /** Footprints and heights of placed buildings, for walk mode (parks are walkable) */
  solids(): [number, number, number, number, number][];
}

export function createPlots(scene: THREE.Scene, opts: { degen: HTMLImageElement | null; tick: (f: Tick) => void; reduced: boolean }): PlotsApi {
  const n = PLOTS.length;
  const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const m = new THREE.Matrix4();

  // Overlay: one frame per plot, coloured by state
  const overlay = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: frameTex, transparent: true, depthWrite: false, fog: false, toneMapped: false }),
    n
  );
  PLOTS.forEach((p, i) => {
    overlay.setMatrixAt(i, m.compose(new THREE.Vector3(p.cx, SLAB + 0.03, p.cz), flat, new THREE.Vector3(p.size * 0.97, p.size * 0.97, 1)));
    overlay.setColorAt(i, COLORS.free);
  });
  overlay.visible = false;
  overlay.renderOrder = 2;
  scene.add(fx(overlay));

  // A for-sale sign on every plot still for sale, at its corner
  const post = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), toon('#1b1830'), n);
  const board = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshToonMaterial({ map: saleTex, side: THREE.DoubleSide }), n);
  const ry = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
  const SIGN = 2;
  const signAt = (p: Plot, show: boolean) => {
    const i = PLOTS.indexOf(p);
    const s = show ? SIGN : 0;
    const x = p.x0 + p.size - 0.7;
    const z = p.z0 + p.size - 0.7;
    post.setMatrixAt(i, m.compose(new THREE.Vector3(x, SLAB + 0.25 * SIGN, z), ry, new THREE.Vector3(s, s, s)));
    board.setMatrixAt(i, m.compose(new THREE.Vector3(x, SLAB + 0.55 * SIGN, z), ry, new THREE.Vector3(s, s, s)));
  };
  PLOTS.forEach((p) => signAt(p, true));
  post.castShadow = true;
  scene.add(post, board);

  let states = new Map<string, PlotState>();
  let hover: string | null = null;
  let selected: string | null = null;
  const colorOf = (id: string) => {
    if (id === selected) return COLORS.selected;
    if (id === hover) return COLORS.hover;
    const st = states.get(id);
    return st ? COLORS[st] : COLORS.free;
  };
  const paint = () => {
    PLOTS.forEach((p, i) => overlay.setColorAt(i, colorOf(p.id)));
    overlay.instanceColor!.needsUpdate = true;
  };
  const resign = () => {
    for (const p of PLOTS) signAt(p, !buildings.has(p.id) && !states.has(p.id));
    post.instanceMatrix.needsUpdate = board.instanceMatrix.needsUpdate = true;
  };

  // Buildings
  const buildings = new Map<string, THREE.Group>();
  const designs = new Map<string, Design>();
  const rising: { g: THREE.Group; t0: number; s: number }[] = [];
  const blinkers: THREE.Points[] = [];
  let now = 0;

  function disposeGroup(g: THREE.Group) {
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if ((o as THREE.Points).isPoints) {
        const i = blinkers.indexOf(o as THREE.Points);
        if (i >= 0) blinkers.splice(i, 1);
        ((o as THREE.Points).material as THREE.Material).dispose();
      }
    });
    g.removeFromParent();
  }

  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -SLAB);
  const hit = new THREE.Vector3();
  const animate = (g: THREE.Group) => {
    // Grows up from the ground to its full height
    rising.push({ g, t0: now, s: g.scale.x });
    g.scale.y = 0.01 * g.scale.x;
  };

  opts.tick(({ t }) => {
    now = t;
    for (let i = rising.length - 1; i >= 0; i--) {
      const r = rising[i];
      const k = Math.min(1, (t - r.t0) / 0.7);
      r.g.scale.y = r.s * (0.01 + (1 - Math.pow(1 - k, 3)) * 0.99);
      if (k >= 1) rising.splice(i, 1);
    }
    const on = Math.floor(t * 4) % 2 === 0;
    for (const b of blinkers) (b.material as THREE.PointsMaterial).size = (on ? 0.17 : 0.1) * PLOT_SCALE;
    if (overlay.visible) (overlay.material as THREE.MeshBasicMaterial).opacity = 0.75 + Math.sin(t * 3) * 0.2;
  });

  return {
    pick(ray) {
      return ray.intersectPlane(plane, hit) ? plotAt(hit.x, hit.z) : null;
    },
    setOverlay(on) {
      overlay.visible = on;
    },
    setHover(id) {
      if (hover === id) return;
      hover = id;
      paint();
    },
    setSelected(id) {
      selected = id;
      paint();
    },
    setStates(next) {
      states = new Map(next);
      resign();
      paint();
    },
    solids() {
      const out: [number, number, number, number, number][] = [];
      const k = PLOT_SCALE;
      for (const [id, d] of designs) {
        if (d.type === 'garden') continue;
        const p = PLOT_BY_ID.get(id)!;
        const h = (d.type === 'tower' ? d.floors * 0.34 + 1.4 : d.type === 'loft' ? d.floors * 0.42 + 0.6 : d.type === 'billboard' ? 2.8 : 2) * k;
        out.push([p.cx - 1.1 * k, p.cz - 1.1 * k, p.cx + 1.1 * k, p.cz + 1.1 * k, h]);
      }
      return out;
    },
    show(id, design, anim = true) {
      const p = PLOT_BY_ID.get(id);
      if (!p) return;
      const old = buildings.get(id);
      if (old) disposeGroup(old);
      buildings.delete(id);
      designs.delete(id);
      if (design) {
        const g = new THREE.Group();
        const b = new Batch();
        GEN[design.type](design, g, b, { degen: opts.degen, blinkers });
        b.build(g);
        g.position.set(p.cx, SLAB, p.cz);
        g.rotation.y = (design.rot % 4) * (Math.PI / 2);
        g.scale.setScalar(PLOT_SCALE);
        scene.add(g);
        buildings.set(id, g);
        designs.set(id, { ...design });
        if (anim && !opts.reduced) animate(g);
      }
      resign();
    },
  };
}
