/*
 * The city builder in 3D: the large plots (one per district, its 3 x 3
 * squares merged into one), the overlay shown in build mode, picking plots
 * under the pointer, and the buildings owners put on them: eight designs,
 * each customisable, drawn at the large plot's own scale with the site
 * dressed around them (paving, trees, lamps, benches, fences).
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
  cached(`sign:${text}:${color}`, () => lit(new THREE.MeshBasicMaterial({ map: neonSign(text, color, { board: null }), transparent: true, depthWrite: false }), 1, 1.8));
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

/** Glass doors with a warm glow behind them, tinted by the neon */
const doorOf = (neonColor: string) =>
  cached(`door:${neonColor}`, () => {
    const tex = canvasTex(128, 256, (c) => {
      c.fillStyle = PAL.ink;
      c.fillRect(0, 0, 128, 256);
      const g = c.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, shadeHex(neonColor, 0.35));
      g.addColorStop(1, PAL.warm);
      c.fillStyle = g;
      c.fillRect(10, 10, 51, 236);
      c.fillRect(67, 10, 51, 236);
      c.fillStyle = PAL.ink;
      c.fillRect(48, 110, 6, 40);
      c.fillRect(74, 110, 6, 40);
    });
    return lit(new THREE.MeshBasicMaterial({ map: tex }), 0.95, 1.5);
  });

/** A lit shop window: shelves and goods in a warm glow */
const shopWindowOf = (accent: string) =>
  cached(`shopwin:${accent}`, () => {
    const tex = canvasTex(256, 128, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, '#fff3c4');
      g.addColorStop(1, '#ffc46b');
      c.fillStyle = g;
      c.fillRect(0, 0, 256, 128);
      c.fillStyle = '#6b4630';
      for (const y of [44, 88]) c.fillRect(0, y, 256, 6);
      const goods = [accent, '#e23b3b', '#1fbf6b', '#037dff', '#8000ff', '#f3f2f7'];
      for (let row = 0; row < 2; row++)
        for (let i = 0; i < 9; i++) {
          c.fillStyle = goods[(i * 5 + row * 3) % goods.length];
          const h = 18 + ((i * 7 + row * 11) % 14);
          c.fillRect(10 + i * 27, (row ? 88 : 44) - h, 18, h);
        }
      c.fillStyle = PAL.ink;
      c.fillRect(0, 0, 256, 5);
      c.fillRect(126, 0, 5, 128);
    });
    return lit(new THREE.MeshBasicMaterial({ map: tex }), 0.9, 1.5);
  });

/** Roller doors (garage, loading dock) */
const rollerMat = cached('roller', () => {
  const tex = canvasTex(64, 128, (c) => {
    c.fillStyle = '#7c7898';
    c.fillRect(0, 0, 64, 128);
    c.fillStyle = '#5c5878';
    for (let y = 0; y < 128; y += 10) c.fillRect(0, y, 64, 4);
  });
  return new THREE.MeshToonMaterial({ map: tex });
});

/** Neon checkerboard paving in front of the arcade */
const checkerOf = (neonColor: string) =>
  cached(`checker:${neonColor}`, () => {
    const tex = canvasTex(256, 256, (c) => {
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++) {
          c.fillStyle = (x + y) % 2 ? '#14102a' : shadeHex(neonColor, -0.25);
          c.fillRect(x * 32, y * 32, 32, 32);
        }
    });
    return lit(new THREE.MeshBasicMaterial({ map: tex }), 0.55, 1.2);
  });

/** Pixel-art game screens for the arcade's windows */
const screenOf = (neonColor: string, seed: number) =>
  cached(`screen:${neonColor}:${seed}`, () => {
    const tex = canvasTex(128, 96, (c) => {
      c.fillStyle = '#0b0a1a';
      c.fillRect(0, 0, 128, 96);
      const invader = ['00100000100', '00010001000', '00111111100', '01101110110', '11111111111', '10111111101', '10100000101', '00011011000'];
      const colors = [neonColor, PAL.cyan, PAL.warm, PAL.pink];
      for (let k = 0; k < 3; k++) {
        c.fillStyle = colors[(k + seed) % colors.length];
        invader.forEach((row, y) => [...row].forEach((v, x) => v === '1' && c.fillRect(8 + k * 40 + x * 3, 14 + ((k + seed) % 2) * 10 + y * 3, 3, 3)));
      }
      c.fillStyle = PAL.warm;
      c.fillRect(56, 80, 16, 6);
      c.fillStyle = '#ffffff';
      for (let i = 0; i < 12; i++) c.fillRect(((i * 37 + seed * 13) % 120) + 4, ((i * 23) % 50) + 60, 2, 2);
    });
    return lit(new THREE.MeshBasicMaterial({ map: tex }), 1, 1.8);
  });

/** Ribbed shipping container sides */
const containerOf = (color: string) =>
  cached(`container:${color}`, () => {
    const tex = canvasTex(256, 64, (c) => {
      c.fillStyle = color;
      c.fillRect(0, 0, 256, 64);
      c.fillStyle = shadeHex(color, -0.3);
      for (let x = 4; x < 256; x += 16) c.fillRect(x, 0, 5, 64);
    });
    return new THREE.MeshToonMaterial({ map: tex });
  });

/* ---------- Building generators: native plot scale, plot centre at the origin, ground at y = 0, front facing +z ---------- */

/** A footprint that blocks walking: x0, z0, x1, z1, height (plot-local, before turning) */
type Solid = [number, number, number, number, number];

const V2 = (x: number, y: number) => new THREE.Vector2(x, y);
function geoBox(w: number, h: number, d: number, x: number, y: number, z: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y + h / 2, z);
  return g;
}
function shell(w: number, h: number, d: number, side: THREE.Material, top: THREE.Material, y = 0, x = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, top, top, side, side]);
  m.position.set(x, y + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}
function signPlane(mat: THREE.Material, w: number, h: number, x: number, y: number, z: number, ry = 0) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  p.position.set(x, y, z);
  p.rotation.y = ry;
  return fx(p);
}
/** A flat panel (doors, windows) just proud of a wall facing +z, drawn with the solid scene */
function panel(mat: THREE.Material, w: number, h: number, x: number, y: number, z: number, ry = 0) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  p.position.set(x, y + h / 2, z);
  p.rotation.y = ry;
  return p;
}
const darker = (c: string, k = 0.45) => shadeHex(c, -k);
const lighter = (c: string, k = 0.35) => shadeHex(c, k);
const cyl = (rt: number, rb: number, h: number, x: number, y: number, z: number, seg = 10) => {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y + h / 2, z);
  return g;
};

const INK = '#1b1830';
const PAVE = '#9b97b8';
const GRASS = '#2f8a5a';
const LEAF = ['#33b878', '#1f9d55', '#3fc48a'];

interface GenCtx {
  degen: HTMLImageElement | null;
  /** Things that blink on their own (marquee bulbs, string lights) */
  blinkers: THREE.Points[];
  solids: Solid[];
}

/* Site dressing, shared by the buildings */
function paving(b: Batch, x0: number, z0: number, x1: number, z1: number, color = PAVE, y = 0) {
  b.add(geoBox(x1 - x0, 0.04, z1 - z0, (x0 + x1) / 2, y, (z0 + z1) / 2), toon(color));
}
function tree(b: Batch, x: number, z: number, s = 1, k = 0) {
  b.add(cyl(0.07 * s, 0.1 * s, 0.9 * s, x, 0, z, 7), toon('#6b4630'));
  const top = new THREE.IcosahedronGeometry(0.55 * s, 1);
  top.translate(x, 1.25 * s, z);
  b.add(top, toon(LEAF[k % LEAF.length]));
  const top2 = new THREE.IcosahedronGeometry(0.38 * s, 1);
  top2.translate(x + 0.22 * s, 1.65 * s, z - 0.12 * s);
  b.add(top2, toon(LEAF[(k + 1) % LEAF.length]));
}
function pine(b: Batch, x: number, z: number, s = 1) {
  b.add(cyl(0.06 * s, 0.08 * s, 0.4 * s, x, 0, z, 6), toon('#6b4630'));
  for (const [r, h, y] of [
    [0.55, 0.9, 0.3],
    [0.42, 0.8, 0.85],
    [0.28, 0.6, 1.35],
  ]) {
    const c = new THREE.ConeGeometry(r * s, h * s, 8);
    c.translate(x, (y + h / 2) * s, z);
    b.add(c, toon('#1d7a55'));
  }
}
function lamp(b: Batch, x: number, z: number, armX = 0, armZ = 0.35, color: string = PAL.warm) {
  b.add(cyl(0.035, 0.05, 2.1, x, 0, z, 8), toon(INK));
  b.add(geoBox(Math.abs(armX) + 0.06, 0.05, Math.abs(armZ) + 0.06, x + armX / 2, 2.05, z + armZ / 2), toon(INK));
  b.add(geoBox(0.22, 0.08, 0.22, x + armX, 1.95, z + armZ), glowOf(color, 0.35, 2.6));
}
function bench(b: Batch, x: number, z: number, along: 'x' | 'z' = 'x') {
  const [w, d] = along === 'x' ? [0.9, 0.3] : [0.3, 0.9];
  b.add(geoBox(w, 0.06, d, x, 0.32, z), toon('#8a5a3c'));
  const back = along === 'x' ? geoBox(w, 0.28, 0.05, x, 0.38, z - 0.14) : geoBox(0.05, 0.28, d, x - 0.14, 0.38, z);
  b.add(back, toon('#8a5a3c'));
  for (const s of [-1, 1]) b.add(along === 'x' ? geoBox(0.05, 0.32, 0.28, x + s * (w / 2 - 0.08), 0, z) : geoBox(0.28, 0.32, 0.05, x, 0, z + s * (d / 2 - 0.08)), toon(INK));
}
function planter(b: Batch, x: number, z: number, w: number, d: number, flower: string, y = 0) {
  b.add(geoBox(w, 0.35, d, x, y, z), toon('#6e6a8c'));
  b.add(geoBox(w - 0.1, 0.06, d - 0.1, x, y + 0.33, z), toon('#3b2a22'));
  const n = Math.max(2, Math.round((w * d) / 0.12));
  for (let i = 0; i < n; i++) {
    const s = new THREE.IcosahedronGeometry(0.11 + ((i * 7) % 3) * 0.02, 0);
    s.translate(x - w / 2 + 0.14 + ((i * 0.37) % 1) * Math.max(0, w - 0.28), y + 0.46, z - d / 2 + 0.14 + ((i * 0.61) % 1) * Math.max(0, d - 0.28));
    b.add(s, toon(i % 3 ? '#2f9f62' : flower));
  }
}
function bollards(b: Batch, x0: number, x1: number, z: number, n: number, glow: string) {
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * i) / (n - 1);
    b.add(cyl(0.07, 0.08, 0.5, x, 0, z, 8), toon(INK));
    b.add(cyl(0.075, 0.075, 0.06, x, 0.42, z, 8), glowOf(glow, 0.6, 2.2));
  }
}
/** Posts and two rails between two points */
function fence(b: Batch, x0: number, z0: number, x1: number, z1: number, color = '#f3f2f7', h = 0.55) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(2, Math.round(len / 0.32));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    b.add(geoBox(0.06, h, 0.06, x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t), toon(color));
  }
  const ang = Math.atan2(z1 - z0, x1 - x0);
  for (const y of [h * 0.35, h * 0.8]) {
    const r = new THREE.BoxGeometry(len, 0.05, 0.04);
    r.rotateY(-ang);
    r.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
    b.add(r, toon(color));
  }
}
/** Air conditioner on a roof */
function acUnit(b: Batch, x: number, y: number, z: number) {
  b.add(geoBox(0.7, 0.4, 0.5, x, y, z), toon('#c9c4e6'));
  const fan = new THREE.CylinderGeometry(0.16, 0.16, 0.03, 12);
  fan.translate(x, y + 0.41, z);
  b.add(fan, toon('#5c5878'));
}
/** A string of little lights between two points, sagging a little */
function lightString(g: THREE.Group, ctx: GenCtx, from: THREE.Vector3, to: THREE.Vector3, n = 10, color: string = PAL.warm) {
  const pts: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 0.25, from.z + (to.z - from.z) * t);
  }
  blinkPoints(g, ctx, pts, color, 0.22);
}
function blinkPoints(g: THREE.Group, ctx: GenCtx, pts: number[], color: string, size: number) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const mat = new THREE.PointsMaterial({ color, map: glowTex, size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  mat.userData.size = size;
  const p = new THREE.Points(geo, mat);
  g.add(fx(p));
  ctx.blinkers.push(p);
}

const GEN: Record<BuildingType, (o: Design, g: THREE.Group, b: Batch, ctx: GenCtx) => void> = {
  /* Two floors, a porch, a dormer, a garage wing, a picket fence and a pool out back */
  house(o, g, b, ctx) {
    const wall = o.color;
    const roof = darker(o.color, 0.62);
    // Garden, driveway and path
    paving(b, -3.95, -3.95, 3.95, 3.95, GRASS, -0.02);
    paving(b, 1.55, 0.7, 3.45, 3.95, '#8f8ab0');
    paving(b, -1.6, 1.7, -0.8, 3.95, '#c9c4e6');
    // The house: 4.4 x 3.2, two floors
    const W = 4.4;
    const D = 3.2;
    const H = 2.8;
    const cx = -1.0;
    const cz = -1.0;
    g.add(shell(W, H, D, facadeOf(`house2:${wall}`, { cols: 5, rows: 2, wall, lit: [PAL.warm], litRatio: 0.8, seed: 61 }), toon(darker(wall)), 0, cx, cz));
    b.add(geoBox(W + 0.1, 0.12, D + 0.1, cx, 0, cz), toon(darker(wall, 0.55)));
    b.add(geoBox(W + 0.06, 0.08, D + 0.06, cx, 1.4, cz), toon(lighter(wall, 0.25)));
    // Gable roof along x, with eaves
    const ov = 0.28;
    const ridge = 1.35;
    const r = new THREE.ExtrudeGeometry(new THREE.Shape([V2(-D / 2 - ov, 0), V2(D / 2 + ov, 0), V2(0, ridge)]), { depth: W + ov * 2, bevelEnabled: false });
    r.rotateY(Math.PI / 2);
    r.translate(cx - W / 2 - ov, H, cz);
    b.add(r, toon(roof));
    // Dormer on the front slope
    b.add(geoBox(0.9, 0.7, 0.8, cx + 0.6, H + 0.15, cz + 0.85), toon(wall));
    g.add(panel(doorOf(o.neon), 0.5, 0.45, cx + 0.6, H + 0.27, cz + 1.26));
    const dr = new THREE.ExtrudeGeometry(new THREE.Shape([V2(-0.55, 0), V2(0.55, 0), V2(0, 0.45)]), { depth: 0.95, bevelEnabled: false });
    dr.translate(cx + 0.6, H + 0.85, cz + 0.4);
    b.add(dr, toon(roof));
    // Chimney
    b.add(geoBox(0.45, 2.9, 0.45, cx - 1.5, 1.8, cz - 0.6), toon(darker(wall, 0.2)));
    b.add(geoBox(0.55, 0.1, 0.55, cx - 1.5, 4.7, cz - 0.6), toon(INK));
    // Flower boxes under the upper windows
    for (let i = 0; i < 5; i++) {
      const x = cx - W / 2 + (i + 0.5) * (W / 5);
      b.add(geoBox(0.5, 0.12, 0.16, x, 1.5, cz + D / 2 + 0.08), toon(darker(wall, 0.4)));
      for (let k = 0; k < 3; k++) {
        const f = new THREE.IcosahedronGeometry(0.07, 0);
        f.translate(x - 0.15 + k * 0.15, 1.66, cz + D / 2 + 0.1);
        b.add(f, toon(k === 1 ? o.neon : '#2f9f62'));
      }
    }
    // Porch: deck, steps, posts, a little roof, the front door
    const px = cx - 0.2;
    const pz = cz + D / 2;
    b.add(geoBox(2.2, 0.2, 1.1, px, 0, pz + 0.55), toon('#a0714f'));
    b.add(geoBox(0.9, 0.1, 0.35, px, 0, pz + 1.27), toon('#a0714f'));
    for (const s of [-1, 1]) b.add(geoBox(0.1, 1.3, 0.1, px + s * 1.0, 0.2, pz + 1.0), toon('#f3f2f7'));
    const porchRoof = new THREE.BoxGeometry(2.5, 0.08, 1.3);
    porchRoof.rotateX(0.22);
    porchRoof.translate(px, 1.62, pz + 0.6);
    b.add(porchRoof, toon(roof));
    g.add(panel(doorOf(o.neon), 0.62, 1.15, px, 0.2, pz + 0.011));
    b.add(geoBox(0.4, 0.06, 0.08, px, 1.38, pz + 0.04), glowOf(o.neon, 0.6, 2.2));
    // Garage wing with a flat roof
    const gx = 2.5;
    b.add(geoBox(2.1, 1.75, 2.8, gx, 0, -0.8), toon(lighter(wall, 0.12)));
    b.add(geoBox(2.25, 0.14, 2.95, gx, 1.75, -0.8), toon(darker(wall, 0.5)));
    g.add(panel(rollerMat, 1.7, 1.3, gx, 0, 0.61));
    b.add(geoBox(0.25, 0.08, 0.2, gx, 1.45, 0.7), glowOf(PAL.warm, 0.4, 2.2));
    // Pool out back
    b.add(geoBox(2.4, 0.16, 1.5, 2.4, 0, -3.1), toon('#f3f2f7'));
    b.add(geoBox(2.1, 0.03, 1.2, 2.4, 0.15, -3.1), glowOf(lighter(PAL.cyan, 0.1), 0.85, 1.6));
    b.add(geoBox(0.5, 0.05, 1.0, 0.75, 0.02, -3.1), toon('#e8e4f8'));
    // Fence, trees, mailbox, a lamp by the path
    fence(b, -3.9, 3.9, 1.4, 3.9);
    fence(b, -3.9, 3.9, -3.9, -3.9);
    tree(b, -3.0, 2.6, 1.05, 0);
    tree(b, 0.5, 2.9, 0.85, 1);
    pine(b, -3.2, -3.2, 1.1);
    b.add(geoBox(0.06, 0.8, 0.06, 1.25, 0, 3.6), toon(INK));
    b.add(geoBox(0.3, 0.22, 0.4, 1.25, 0.8, 3.6), toon(o.neon));
    lamp(b, -0.55, 3.3, 0, -0.3);
    ctx.solids.push([cx - W / 2, cz - D / 2, cx + W / 2, cz + D / 2, H + ridge], [gx - 1.05, -2.2, gx + 1.05, 0.6, 1.9]);
  },

  /* Two-storey shop: lit display windows, striped awning, a café terrace and a neon sign on the roof */
  shop(o, g, b, ctx) {
    const W = 5.8;
    const D = 3.8;
    const H = 3.0;
    const z0 = -1.4; // centre
    const front = z0 + D / 2;
    paving(b, -3.95, front, 3.95, 3.95);
    g.add(shell(W, H, D, facadeOf(`shop2:${o.color}`, { cols: 6, rows: 2, wall: o.color, lit: [PAL.warm, PAL.warm, PAL.cyan], litRatio: 0.75, seed: 62 }), toon(darker(o.color)), 0, 0, z0));
    // Cornice and parapet
    b.add(geoBox(W + 0.24, 0.2, D + 0.24, 0, H, z0), toon(darker(o.color, 0.55)));
    b.add(geoBox(W + 0.1, 0.3, 0.12, 0, H + 0.2, front - 0.06), toon(darker(o.color, 0.4)));
    b.add(geoBox(W + 0.1, 0.1, D + 0.1, 0, 1.55, z0), toon(lighter(o.color, 0.2)));
    // Shopfront: dark frame, two display windows, glass doors
    b.add(geoBox(W - 0.2, 1.5, 0.08, 0, 0, front + 0.02), toon(PAL.ink));
    for (const x of [-1.7, 1.7]) g.add(panel(shopWindowOf(o.neon), 2.1, 1.05, x, 0.32, front + 0.07));
    g.add(panel(doorOf(o.neon), 0.95, 1.35, 0, 0.05, front + 0.07));
    b.add(geoBox(W - 0.3, 0.06, 0.16, 0, 0.26, front + 0.1), toon(darker(o.color, 0.3)));
    // Striped awning
    const awning = new THREE.Mesh(new THREE.BoxGeometry(W - 0.3, 0.05, 1.1), stripeOf(o.neon));
    awning.position.set(0, 1.78, front + 0.5);
    awning.rotation.x = 0.38;
    awning.castShadow = true;
    g.add(awning);
    // Neon sign standing on the roof, and a blade sign at the corner
    b.add(geoBox(3.9, 1.0, 0.14, 0, H + 0.4, z0 + 0.6), toon('#14102a'));
    for (const x of [-1.6, 1.6]) b.add(geoBox(0.1, 0.5, 0.6, x, H + 0.2, z0 + 0.35), toon(INK));
    g.add(signPlane(signOf(o.sign, o.neon), 3.7, 0.92, 0, H + 0.9, z0 + 0.68));
    b.add(geoBox(0.12, 1.25, 0.6, W / 2 + 0.08, 1.75, front - 0.35), toon('#14102a'));
    b.add(geoBox(0.14, 1.15, 0.03, W / 2 + 0.08, 1.8, front - 0.06), glowOf(o.neon, 1, 2.6));
    // Roof clutter
    acUnit(b, -1.9, H + 0.2, z0 - 1.0);
    acUnit(b, -0.9, H + 0.2, z0 - 1.1);
    b.add(cyl(0.08, 0.08, 0.8, 2.0, H + 0.2, z0 - 1.2), toon('#8f8ab0'));
    // Café terrace: tables with umbrellas, chairs, an A-board, planters, lamps
    for (const x of [-2.1, 2.1]) {
      b.add(cyl(0.32, 0.32, 0.05, x, 0.68, 2.8, 14), toon('#f3f2f7'));
      b.add(cyl(0.04, 0.04, 0.68, x, 0, 2.8), toon(INK));
      b.add(cyl(0.02, 0.02, 1.5, x, 0.7, 2.8), toon(INK));
      const um = new THREE.ConeGeometry(0.75, 0.32, 10);
      um.translate(x, 2.2, 2.8);
      b.add(um, toon(o.neon));
      for (const dx of [-0.48, 0.48]) {
        b.add(geoBox(0.3, 0.04, 0.3, x + dx, 0.42, 2.8), toon('#8a5a3c'));
        b.add(geoBox(0.04, 0.35, 0.3, x + dx + Math.sign(dx) * 0.14, 0.42, 2.8), toon('#8a5a3c'));
        for (const ez of [-0.12, 0.12]) b.add(geoBox(0.03, 0.42, 0.03, x + dx, 0, 2.8 + ez), toon(INK));
      }
    }
    const aBoard = new THREE.BoxGeometry(0.45, 0.65, 0.04);
    aBoard.rotateX(0.2);
    aBoard.translate(0, 0.32, 3.3);
    b.add(aBoard, toon('#14102a'));
    planter(b, -3.4, front + 0.5, 0.8, 0.8, o.neon);
    planter(b, 3.4, front + 0.5, 0.8, 0.8, o.neon);
    lamp(b, -3.6, 3.6, 0.3, 0);
    lamp(b, 3.6, 3.6, -0.3, 0);
    ctx.solids.push([-W / 2, z0 - D / 2, W / 2, front, H + 1.4]);
  },

  /* Glass lobby podium, a tower with a crown and an LED band, a mast, and a plaza with fountains */
  tower(o, g, b, ctx) {
    const n = o.floors;
    const fh = 0.95;
    const P = 1.7; // podium height
    const tw = 3.8;
    const tz = -1.1;
    const h = n * fh;
    paving(b, -3.95, -3.95, 3.95, 3.95, '#8f8ab0');
    // Podium: lit glass lobby
    const pw = 6.2;
    const pd = 5.0;
    const pz = -1.2;
    g.add(shell(pw, P, pd, facadeOf(`podium:${o.color}`, { cols: 9, rows: 1, wall: darker(o.color, 0.6), glass: '#2a3a7a', lit: [PAL.warm, '#fff3c4'], litRatio: 0.85, seed: 90 }), toon(darker(o.color, 0.5)), 0, 0, pz));
    b.add(geoBox(pw + 0.2, 0.18, pd + 0.2, 0, P, pz), toon(o.color));
    // Neon edge round the podium roof
    const edge = glowOf(o.neon, 0.9, 2.6);
    for (const s of [-1, 1]) {
      b.add(geoBox(pw + 0.24, 0.07, 0.07, 0, P + 0.18, pz + s * (pd / 2 + 0.11)), edge);
      b.add(geoBox(0.07, 0.07, pd + 0.24, s * (pw / 2 + 0.11), P + 0.18, pz), edge);
    }
    // Entrance: canopy on posts, revolving door
    const ez = pz + pd / 2;
    b.add(geoBox(2.6, 0.14, 1.4, 0, 1.35, ez + 0.7), toon(darker(o.color, 0.6)));
    b.add(geoBox(2.4, 0.03, 1.2, 0, 1.33, ez + 0.7), glowOf(PAL.warm, 0.3, 2.2));
    for (const s of [-1, 1]) b.add(cyl(0.05, 0.05, 1.35, s * 1.15, 0, ez + 1.3), toon(INK));
    b.add(cyl(0.5, 0.5, 1.2, 0, 0, ez, 16), toon('#9fe8ff'));
    b.add(cyl(0.52, 0.52, 0.1, 0, 1.2, ez, 16), toon(INK));
    // The tower
    g.add(
      shell(tw, h, tw, facadeOf(`tower2:${o.color}:${n}`, { cols: 5, rows: n, wall: darker(o.color, 0.55), lit: [PAL.cyan, PAL.pink, PAL.warm, o.neon], litRatio: 0.62, seed: 63 + n, bands: darker(o.color, 0.3) }), toon(darker(o.color, 0.65)), P + 0.18, 0, tz)
    );
    const strip = glowOf(o.neon, 1, 3);
    for (const [x, z] of [
      [tw / 2, tw / 2],
      [-tw / 2, tw / 2],
      [tw / 2, -tw / 2],
      [-tw / 2, -tw / 2],
    ])
      b.add(geoBox(0.09, h, 0.09, x, P + 0.18, tz + z), strip);
    // Floor bands every other floor
    for (let k = 2; k < n; k += 2) b.add(geoBox(tw + 0.1, 0.06, tw + 0.1, 0, P + 0.18 + k * fh, tz), toon(darker(o.color, 0.3)));
    // Crown: cornice, LED band, a setback top, mast and a beacon
    const top = P + 0.18 + h;
    b.add(geoBox(tw + 0.3, 0.22, tw + 0.3, 0, top, tz), toon(o.color));
    b.add(geoBox(tw - 0.6, 0.8, tw - 0.6, 0, top + 0.22, tz), toon(darker(o.color, 0.7)));
    b.add(geoBox(tw - 0.5, 0.16, tw - 0.5, 0, top + 0.52, tz), glowOf(o.neon, 1.2, 3.2));
    acUnit(b, -0.8, top + 1.02, tz - 0.6);
    b.add(cyl(0.04, 0.07, 1.2, 0.6, top + 1.02, tz + 0.4, 6), toon(INK));
    b.add(geoBox(0.16, 0.16, 0.16, 0.6, top + 2.22, tz + 0.4), glowOf('#ff3b3b', 1.4, 4));
    // Plaza: fountains, trees, benches, bollards, lamps
    for (const x of [-2.6, 2.6]) {
      b.add(cyl(0.75, 0.8, 0.35, x, 0, 2.9, 18), toon('#c9c4e6'));
      b.add(cyl(0.65, 0.65, 0.04, x, 0.32, 2.9, 18), glowOf(lighter(PAL.cyan, 0.1), 0.8, 1.6));
      b.add(cyl(0.05, 0.05, 0.7, x, 0.35, 2.9, 6), glowOf(o.neon, 0.9, 2.4));
    }
    tree(b, -3.5, -3.5, 1.0, 0);
    tree(b, 3.5, -3.5, 1.0, 1);
    bench(b, -1.6, 3.5);
    bench(b, 1.6, 3.5);
    bollards(b, -0.9, 0.9, 3.75, 4, o.neon);
    lamp(b, -3.7, 3.7, 0.3, -0.2);
    lamp(b, 3.7, 3.7, -0.3, -0.2);
    ctx.solids.push([-pw / 2, pz - pd / 2, pw / 2, pz + pd / 2, P + 0.2], [-tw / 2, tz - tw / 2, tw / 2, tz + tw / 2, top + 1.0]);
  },

  /* Apartments with balconies, a fire escape, a rooftop garden with a pergola, and a water tank */
  loft(o, g, b, ctx) {
    const n = o.floors;
    const fh = 1.0;
    const W = 6.0;
    const D = 3.4;
    const z0 = -1.5;
    const front = z0 + D / 2;
    const H = n * fh;
    paving(b, -3.95, front, 3.95, 3.95);
    g.add(shell(W, H, D, facadeOf(`loft2:${o.color}:${n}`, { cols: 6, rows: n, wall: o.color, lit: [PAL.warm, PAL.warm, o.neon], litRatio: 0.7, seed: 70 + n, bands: darker(o.color, 0.25) }), toon(darker(o.color)), 0, 0, z0));
    b.add(geoBox(W + 0.2, 0.2, D + 0.2, 0, H, z0), toon(darker(o.color, 0.5)));
    b.add(geoBox(W + 0.1, 0.35, 0.1, 0, H + 0.2, front - 0.05), toon(darker(o.color, 0.35)));
    // Entrance: steps, door, canopy, house number glow
    b.add(geoBox(1.4, 0.15, 0.6, 0, 0, front + 0.3), toon('#c9c4e6'));
    g.add(panel(doorOf(o.neon), 0.8, 1.1, 0, 0.15, front + 0.011));
    b.add(geoBox(1.3, 0.08, 0.7, 0, 1.4, front + 0.35), toon(INK));
    b.add(geoBox(1.1, 0.03, 0.5, 0, 1.38, front + 0.35), glowOf(PAL.warm, 0.3, 2.2));
    // Balconies: two per floor above the ground floor
    for (let k = 1; k < n; k++) {
      const y = k * fh;
      for (const x of [-1.8, 1.8]) {
        b.add(geoBox(1.7, 0.08, 0.7, x, y, front + 0.35), toon(darker(o.color, 0.3)));
        b.add(geoBox(1.7, 0.4, 0.04, x, y + 0.08, front + 0.68), toon('#9fe8ff', { transparent: true, opacity: 0.55 }));
        b.add(geoBox(1.72, 0.04, 0.06, x, y + 0.48, front + 0.68), toon(INK));
        if ((k + (x > 0 ? 1 : 0)) % 2) planter(b, x - 0.55, front + 0.4, 0.4, 0.3, o.neon, y + 0.08);
      }
    }
    // Fire escape on the right-hand wall
    for (let k = 1; k < n; k++) {
      const y = k * fh;
      b.add(geoBox(0.7, 0.05, 1.6, W / 2 + 0.35, y, z0 + 0.3), toon(INK));
      b.add(geoBox(0.04, 0.45, 1.6, W / 2 + 0.68, y, z0 + 0.3), toon(INK));
      if (k < n - 1) {
        const st = new THREE.BoxGeometry(0.5, 0.05, 1.5);
        st.rotateX(Math.atan2(fh, 1.3) * (k % 2 ? 1 : -1));
        st.translate(W / 2 + 0.35, y + fh / 2, z0 + 0.3);
        b.add(st, toon(INK));
      }
    }
    // Rooftop garden: lawn, planters, pergola with string lights, water tank on legs
    b.add(geoBox(W - 0.6, 0.06, D - 0.6, 0, H + 0.2, z0), toon(GRASS));
    for (const [x, z] of [
      [-2.2, z0 - 0.9],
      [-1.0, z0 - 0.9],
    ]) {
      b.add(geoBox(0.7, 0.3, 0.7, x, H + 0.26, z), toon('#6e6a8c'));
      const t = new THREE.IcosahedronGeometry(0.35, 1);
      t.translate(x, H + 0.95, z);
      b.add(t, toon(LEAF[0]));
    }
    for (const [x, z] of [
      [0.6, z0 + 0.9],
      [2.4, z0 + 0.9],
      [0.6, z0 - 0.5],
      [2.4, z0 - 0.5],
    ])
      b.add(geoBox(0.08, 1.2, 0.08, x, H + 0.26, z), toon('#8a5a3c'));
    for (let i = 0; i < 6; i++) b.add(geoBox(0.08, 0.06, 1.55, 0.6 + i * 0.36, H + 1.46, z0 + 0.2), toon('#8a5a3c'));
    lightString(g, ctx, new THREE.Vector3(0.6, H + 1.4, z0 + 0.9), new THREE.Vector3(2.4, H + 1.4, z0 + 0.9), 8);
    lightString(g, ctx, new THREE.Vector3(0.6, H + 1.4, z0 - 0.5), new THREE.Vector3(2.4, H + 1.4, z0 - 0.5), 8);
    b.add(cyl(0.45, 0.45, 0.9, -2.0, H + 1.1, z0 + 0.7, 12), toon('#a0714f'));
    const cone = new THREE.ConeGeometry(0.5, 0.35, 12);
    cone.translate(-2.0, H + 2.18, z0 + 0.7);
    b.add(cone, toon(darker('#a0714f', 0.3)));
    for (const [dx, dz] of [
      [-0.3, -0.3],
      [0.3, -0.3],
      [-0.3, 0.3],
      [0.3, 0.3],
    ])
      b.add(geoBox(0.06, 0.85, 0.06, -2.0 + dx, H + 0.26, z0 + 0.7 + dz), toon(INK));
    // Courtyard: trees, bike rack, bench, lamps
    tree(b, -3.4, 3.3, 0.95, 1);
    tree(b, 3.4, 3.3, 0.95, 2);
    for (let i = 0; i < 4; i++) {
      const hoop = new THREE.TorusGeometry(0.18, 0.025, 6, 12, Math.PI);
      hoop.translate(-2.2 + i * 0.3, 0, 2.6);
      hoop.rotateY(0);
      b.add(hoop, toon(INK));
    }
    bench(b, 2.0, 2.6);
    lamp(b, -1.2, 3.6, 0, -0.3);
    lamp(b, 1.2, 3.6, 0, -0.3);
    ctx.solids.push([-W / 2, z0 - D / 2, W / 2 + 0.7, front, H + 0.5]);
  },

  /* A neon box with a bulb marquee, game-screen windows, a giant joystick and coin on the roof, and a checkerboard forecourt */
  arcade(o, g, b, ctx) {
    const W = 6.2;
    const D = 4.2;
    const H = 2.7;
    const z0 = -1.6;
    const front = z0 + D / 2;
    const body = darker(o.color, 0.55);
    b.add(geoBox(W, H, D, 0, 0, z0), toon(body));
    const trim = glowOf(o.neon, 1, 2.8);
    for (const y of [0.05, H - 0.1]) b.add(geoBox(W + 0.04, 0.08, D + 0.04, 0, y, z0), trim);
    for (const x of [-W / 2, W / 2]) b.add(geoBox(0.1, H, 0.1, x, 0, front), trim);
    b.add(geoBox(W + 0.2, 0.18, D + 0.2, 0, H, z0), toon(o.color));
    // Forecourt
    const fc = new THREE.Mesh(new THREE.PlaneGeometry(W, 3.95 - front), checkerOf(o.neon));
    fc.rotation.x = -Math.PI / 2;
    fc.position.set(0, 0.025, (front + 3.95) / 2);
    g.add(fc);
    // Entrance: glowing doors under a pointed canopy lined with bulbs
    g.add(panel(doorOf(o.neon), 1.9, 1.7, 0, 0, front + 0.011));
    const can = new THREE.ExtrudeGeometry(new THREE.Shape([V2(-1.5, 0), V2(1.5, 0), V2(0, 0.55)]), { depth: 1.1, bevelEnabled: false });
    can.translate(0, 1.85, front);
    b.add(can, toon(o.color));
    // Game screens either side of the door
    g.add(panel(screenOf(o.neon, 1), 1.5, 1.15, -2.0, 0.55, front + 0.011));
    g.add(panel(screenOf(o.neon, 2), 1.5, 1.15, 2.0, 0.55, front + 0.011));
    for (const x of [-2.0, 2.0]) b.add(geoBox(1.66, 1.31, 0.06, x, 0.47, front - 0.01), toon(PAL.ink));
    // Marquee on the roof edge, bulbs all round
    b.add(geoBox(5.0, 1.35, 0.2, 0, H + 0.18, front - 0.3), toon('#14102a'));
    g.add(signPlane(signOf(o.sign, o.neon), 4.7, 1.2, 0, H + 0.85, front - 0.19));
    const pts: number[] = [];
    for (let i = 0; i <= 16; i++) {
      const x = -2.45 + (i / 16) * 4.9;
      pts.push(x, H + 0.22, front - 0.17, x, H + 1.48, front - 0.17);
    }
    for (let i = 1; i < 5; i++) {
      const y = H + 0.22 + (i / 5) * 1.26;
      pts.push(-2.45, y, front - 0.17, 2.45, y, front - 0.17);
    }
    for (let i = 0; i <= 10; i++) pts.push(-1.5 + (i / 10) * 3, 1.82, front + 1.12);
    blinkPoints(g, ctx, pts, PAL.warm, 0.26);
    // Giant joystick and coin on the roof
    b.add(geoBox(1.6, 0.4, 1.6, -1.6, H + 0.18, z0 - 0.6), toon(INK));
    b.add(cyl(0.12, 0.12, 1.6, -1.6, H + 0.58, z0 - 0.6), toon('#c9c4e6'));
    const ball = new THREE.SphereGeometry(0.45, 16, 12);
    ball.translate(-1.6, H + 2.4, z0 - 0.6);
    b.add(ball, toon(o.neon));
    for (const [dx, c] of [
      [0.5, '#ff3b3b'],
      [0.85, PAL.cyan],
    ] as [number, string][])
      b.add(cyl(0.16, 0.16, 0.12, -1.6 + dx, H + 0.58, z0 - 0.1, 12), glowOf(c, 0.9, 2.4));
    const coin = new THREE.CylinderGeometry(0.85, 0.85, 0.18, 24);
    coin.rotateX(Math.PI / 2);
    coin.translate(1.7, H + 1.15, z0 - 0.8);
    b.add(coin, toon(PAL.gold));
    b.add(geoBox(0.3, 0.3, 0.3, 1.7, H + 0.18, z0 - 0.8), toon(INK));
    // Bollards and lamps
    bollards(b, -3.6, 3.6, 3.75, 6, o.neon);
    lamp(b, -3.6, front + 0.4, 0.3, 0, o.neon);
    lamp(b, 3.6, front + 0.4, -0.3, 0, o.neon);
    ctx.solids.push([-W / 2, z0 - D / 2, W / 2, front, H + 1.6]);
  },

  /* The whole plot as a park: hedges, crossing paths, a fountain, a gazebo, a pond, flower beds, trees and benches */
  garden(o, g, b, ctx) {
    paving(b, -3.95, -3.95, 3.95, 3.95, GRASS, -0.02);
    paving(b, -0.55, -3.95, 0.55, 3.95, '#d8c9a8');
    paving(b, -3.95, -0.55, 3.95, 0.55, '#d8c9a8');
    // Hedges round the edge, with a gap where each path comes in
    for (const s of [-1, 1]) {
      for (const [a, c] of [
        [-3.95, -0.7],
        [0.7, 3.95],
      ]) {
        b.add(geoBox(c - a, 0.55, 0.35, (a + c) / 2, 0, s * 3.75), toon('#1f7a4a'));
        b.add(geoBox(0.35, 0.55, c - a, s * 3.75, 0, (a + c) / 2), toon('#1f7a4a'));
      }
    }
    // Fountain in the middle
    b.add(cyl(1.15, 1.2, 0.4, 0, 0, 0, 24), toon('#c9c4e6'));
    b.add(cyl(1.0, 1.0, 0.04, 0, 0.36, 0, 24), glowOf(lighter(PAL.cyan, 0.1), 0.8, 1.6));
    b.add(cyl(0.3, 0.38, 0.75, 0, 0.36, 0, 12), toon('#c9c4e6'));
    b.add(cyl(0.55, 0.55, 0.08, 0, 1.1, 0, 16), toon('#c9c4e6'));
    b.add(cyl(0.05, 0.05, 0.9, 0, 1.18, 0, 6), glowOf(o.neon, 0.9, 2.4));
    // Flower beds in two quadrants
    for (const [x, z] of [
      [-2.2, -2.2],
      [2.2, 2.2],
    ]) {
      b.add(cyl(1.0, 1.05, 0.2, x, 0, z, 18), toon('#5a3b28'));
      for (let i = 0; i < 18; i++) {
        const a = i * 2.4;
        const r = 0.25 + (i % 3) * 0.25;
        const f = new THREE.IcosahedronGeometry(0.12, 0);
        f.translate(x + Math.cos(a) * r, 0.3, z + Math.sin(a) * r);
        b.add(f, toon([o.color, o.neon, PAL.warm][i % 3]));
      }
    }
    // Gazebo in a third quadrant
    const gx = 2.3;
    const gz = -2.3;
    b.add(cyl(1.0, 1.0, 0.15, gx, 0, gz, 6), toon('#a0714f'));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      b.add(geoBox(0.08, 1.4, 0.08, gx + Math.cos(a) * 0.85, 0.15, gz + Math.sin(a) * 0.85), toon('#f3f2f7'));
    }
    const groof = new THREE.ConeGeometry(1.25, 0.8, 6);
    groof.translate(gx, 1.95, gz);
    b.add(groof, toon(o.color));
    b.add(geoBox(0.1, 0.1, 0.1, gx, 2.38, gz), glowOf(o.neon, 0.8, 2.4));
    // Pond with lily pads in the fourth
    const pond = new THREE.CylinderGeometry(1.0, 1.0, 0.04, 20);
    pond.scale(1.25, 1, 0.9);
    pond.translate(-2.2, 0.02, 2.2);
    b.add(pond, toon('#3f98ff'));
    for (const [dx, dz] of [
      [0.3, 0.2],
      [-0.4, -0.1],
      [0.1, -0.4],
    ]) {
      const pad = new THREE.CylinderGeometry(0.14, 0.14, 0.03, 10);
      pad.translate(-2.2 + dx, 0.05, 2.2 + dz);
      b.add(pad, toon('#33b878'));
    }
    // Trees, benches facing the fountain, lamps at the path ends
    tree(b, -3.1, -0.95, 0.85, 0);
    tree(b, 3.1, 0.95, 0.85, 1);
    tree(b, -0.95, -3.1, 0.8, 2);
    tree(b, 0.95, 3.1, 0.8, 0);
    pine(b, -3.2, 3.2, 0.9);
    pine(b, 3.2, -3.4, 0.8);
    bench(b, -1.8, 0.85, 'x');
    bench(b, 1.8, -0.85, 'x');
    bench(b, 0.85, 1.8, 'z');
    bench(b, -0.85, -1.8, 'z');
    for (const [x, z] of [
      [0.75, 3.5],
      [-0.75, -3.5],
      [3.5, -0.75],
      [-3.5, 0.75],
    ])
      lamp(b, x, z, 0, 0);
    // Only the fountain gets in the way: the rest of the park is for walking
    ctx.solids.push([-1.2, -1.2, 1.2, 1.2, 0.5]);
  },

  /* Sawtooth-roofed warehouse with a loading dock, an office, a container, crates and a forklift */
  warehouse(o, g, b, ctx) {
    const W = 6.0;
    const D = 4.2;
    const H = 2.5;
    const x0 = -0.7;
    const z0 = -1.6;
    const front = z0 + D / 2;
    paving(b, -3.95, -3.95, 3.95, 3.95, '#7c7898', -0.01);
    g.add(shell(W, H, D, facadeOf(`warehouse2:${o.color}`, { cols: 6, rows: 1, wall: o.color, lit: [PAL.warm], litRatio: 0.45, seed: 80, bands: darker(o.color, 0.2) }), toon(darker(o.color)), 0, x0, z0));
    // Sawtooth roof: three teeth, glowing glazing on the steep faces
    const teeth = 3;
    const step = D / teeth;
    for (let k = 0; k < teeth; k++) {
      const t = new THREE.ExtrudeGeometry(new THREE.Shape([V2(0, 0), V2(step, 0), V2(step, 0.9)]), { depth: W, bevelEnabled: false });
      t.rotateY(-Math.PI / 2);
      t.translate(x0 + W / 2, H, z0 - D / 2 + k * step);
      b.add(t, toon(darker(o.color, 0.35)));
      // Tinted glazing by day, lit from inside at night
      b.add(geoBox(W - 0.06, 0.82, 0.03, x0, H + 0.03, z0 - D / 2 + (k + 1) * step + 0.005), glowOf(darker(o.neon, 0.5), 0.35, 1.5));
    }
    // Loading dock: platform, bumpers, two roller doors with lamps
    b.add(geoBox(4.6, 0.6, 1.0, x0 - 0.4, 0, front + 0.5), toon('#8f8ab0'));
    for (const x of [-2.6, -0.2]) {
      g.add(panel(rollerMat, 1.6, 1.7, x, 0.6, front + 0.011));
      b.add(geoBox(1.8, 0.1, 0.1, x, 2.32, front + 0.06), toon(INK));
      b.add(geoBox(0.3, 0.1, 0.2, x, 2.45, front + 0.12), glowOf(PAL.warm, 0.4, 2.4));
      for (const s of [-1, 1]) b.add(geoBox(0.16, 0.28, 0.12, x + s * 0.7, 0.2, front + 1.03), toon(INK));
    }
    b.add(geoBox(0.9, 0.6, 0.6, x0 + 1.9, 0, front + 0.3), toon('#8f8ab0'));
    // Office annex with windows and a door
    const ox = x0 + W / 2 + 0.75;
    g.add(shell(1.5, 1.9, 2.4, facadeOf(`office:${o.color}`, { cols: 2, rows: 1, wall: lighter(o.color, 0.25), lit: [PAL.warm, PAL.cyan], litRatio: 0.9, seed: 81 }), toon(darker(o.color, 0.3)), 0, ox, front - 1.2));
    b.add(geoBox(1.65, 0.12, 2.55, ox, 1.9, front - 1.2), toon(INK));
    // Yard: a container, crates on pallets, drums, a forklift
    const cont = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.15, 1.1), containerOf(darker(o.neon, 0.2)));
    cont.position.set(-2.4, 0.575, 3.2);
    cont.castShadow = cont.receiveShadow = true;
    g.add(cont);
    for (const [x, z, n] of [
      [0.6, 3.2, 2],
      [1.5, 3.3, 3],
    ] as [number, number, number][]) {
      b.add(geoBox(0.8, 0.1, 0.8, x, 0, z), toon('#a0714f'));
      for (let k = 0; k < n; k++) b.add(geoBox(0.66, 0.42, 0.66, x, 0.1 + k * 0.44, z), toon(k % 2 ? '#c99a5b' : '#b5824a'));
    }
    for (const x of [3.1, 3.5]) {
      b.add(cyl(0.18, 0.18, 0.55, x, 0, 3.4, 10), toon(x > 3.3 ? '#e23b3b' : PAL.craneYellow));
    }
    const fx0 = 2.9;
    const fz0 = 2.0;
    b.add(geoBox(0.6, 0.45, 0.9, fx0, 0.15, fz0), toon(PAL.craneYellow));
    b.add(geoBox(0.5, 0.06, 0.6, fx0, 0.95, fz0 - 0.05), toon(INK));
    for (const s of [-1, 1]) b.add(geoBox(0.05, 0.85, 0.05, fx0 + s * 0.22, 0.6, fz0 - 0.25), toon(INK));
    for (const s of [-1, 1]) b.add(geoBox(0.08, 1.4, 0.06, fx0 + s * 0.2, 0, fz0 - 0.5), toon(INK));
    for (const s of [-1, 1]) b.add(geoBox(0.08, 0.04, 0.6, fx0 + s * 0.15, 0.04, fz0 - 0.85), toon('#8f8ab0'));
    for (const [dx, dz] of [
      [-0.3, 0.3],
      [0.3, 0.3],
      [-0.3, -0.3],
      [0.3, -0.3],
    ]) {
      const wh = new THREE.CylinderGeometry(0.15, 0.15, 0.12, 10);
      wh.rotateZ(Math.PI / 2);
      wh.translate(fx0 + dx, 0.15, fz0 + dz);
      b.add(wh, toon(INK));
    }
    // Chain-link fence posts down the side
    for (let i = 0; i < 8; i++) b.add(geoBox(0.06, 1.3, 0.06, -3.85, 0, -3.8 + i * 1.08), toon('#8f8ab0'));
    b.add(geoBox(0.03, 0.05, 7.6, -3.85, 1.25, 0), toon('#8f8ab0'));
    ctx.solids.push([x0 - W / 2, z0 - D / 2, x0 + W / 2, front + 1.0, H + 0.9], [ox - 0.75, front - 2.4, ox + 0.75, front, 2.0], [-3.7, 2.65, -1.1, 3.75, 1.15]);
  },

  /* A giant billboard on a steel frame with spotlights, a food truck, picnic tables and string lights */
  billboard(o, g, b, ctx) {
    paving(b, -3.95, -3.95, 3.95, 3.95, '#7c7898', -0.01);
    const bz = -2.6;
    const by = 3.4;
    const bw = 6.6;
    const bh = 3.6;
    // Steel legs, cross-bracing and a catwalk
    for (const x of [-2.4, 2.4]) {
      b.add(geoBox(0.3, by, 0.3, x, 0, bz - 0.3), toon('#5c5878'));
      for (let k = 0; k < 3; k++) {
        const br = new THREE.BoxGeometry(0.06, 1.4, 0.06);
        br.rotateZ(k % 2 ? 0.6 : -0.6);
        br.translate(x, 0.6 + k * 1.05, bz - 0.15);
        b.add(br, toon(INK));
      }
      b.add(geoBox(1.2, 0.12, 1.2, x, 0, bz - 0.3), toon(INK));
    }
    b.add(geoBox(bw, 0.08, 0.8, 0, by - 0.12, bz + 0.1), toon(INK));
    b.add(geoBox(bw, 0.04, 0.04, 0, by + 0.45, bz + 0.48), toon(INK));
    b.add(geoBox(bw + 0.2, bh + 0.2, 0.14, 0, by, bz - 0.35), toon('#14102a'));
    const board = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), degenBoard(ctx.degen));
    board.position.set(0, by + 0.1 + bh / 2, bz - 0.27);
    g.add(fx(board));
    const trim = glowOf(o.neon, 1, 2.8);
    b.add(geoBox(bw + 0.2, 0.08, 0.12, 0, by, bz - 0.26), trim);
    b.add(geoBox(bw + 0.2, 0.08, 0.12, 0, by + bh + 0.12, bz - 0.26), trim);
    // Spotlights on arms along the catwalk
    for (const x of [-2.2, 0, 2.2]) {
      b.add(geoBox(0.05, 0.05, 0.6, x, by + 0.02, bz + 0.45), toon(INK));
      b.add(geoBox(0.3, 0.2, 0.25, x, by - 0.05, bz + 0.75), toon(INK));
      b.add(geoBox(0.24, 0.04, 0.2, x, by + 0.15, bz + 0.75), glowOf('#fff3c4', 0.4, 2.6));
    }
    // Food truck: body, cab, serving hatch with an awning, wheels
    const tx = -0.6;
    const tz = 1.2;
    b.add(geoBox(2.8, 1.5, 1.4, tx, 0.3, tz), toon(o.color));
    b.add(geoBox(1.0, 1.1, 1.4, tx + 1.9, 0.3, tz), toon(darker(o.color, 0.3)));
    b.add(geoBox(0.05, 0.5, 1.1, tx + 2.42, 0.8, tz), toon('#9fe8ff'));
    g.add(panel(shopWindowOf(o.neon), 1.7, 0.75, tx, 0.95, tz + 0.711));
    const aw = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.04, 0.7), stripeOf(o.neon));
    aw.position.set(tx, 1.82, tz + 1.0);
    aw.rotation.x = 0.35;
    g.add(aw);
    b.add(geoBox(2.6, 0.12, 0.25, tx, 0.85, tz + 0.82), toon('#c9c4e6'));
    for (const [dx, dz] of [
      [-1.0, 0.72],
      [1.0, 0.72],
      [1.9, 0.72],
      [-1.0, -0.72],
      [1.0, -0.72],
      [1.9, -0.72],
    ]) {
      const wh = new THREE.CylinderGeometry(0.28, 0.28, 0.16, 12);
      wh.rotateX(Math.PI / 2);
      wh.translate(tx + dx, 0.28, tz + dz);
      b.add(wh, toon(INK));
    }
    b.add(geoBox(1.2, 0.3, 0.06, tx, 1.95, tz + 0.72), toon('#14102a'));
    // Picnic tables
    for (const [x, z] of [
      [-2.4, 3.2],
      [1.4, 3.3],
    ]) {
      b.add(geoBox(1.3, 0.06, 0.6, x, 0.62, z), toon('#a0714f'));
      for (const s of [-1, 1]) {
        b.add(geoBox(1.3, 0.05, 0.22, x, 0.38, z + s * 0.48), toon('#a0714f'));
        b.add(geoBox(0.06, 0.62, 0.9, x + s * 0.5, 0, z), toon('#8a5a3c'));
      }
    }
    // Poles and string lights over the tables
    for (const [x, z] of [
      [-3.7, 3.7],
      [3.7, 3.7],
      [-3.7, 0.6],
      [3.7, 0.6],
    ])
      b.add(cyl(0.05, 0.06, 2.6, x, 0, z, 6), toon(INK));
    lightString(g, ctx, new THREE.Vector3(-3.7, 2.55, 3.7), new THREE.Vector3(3.7, 2.55, 3.7), 14);
    lightString(g, ctx, new THREE.Vector3(-3.7, 2.55, 0.6), new THREE.Vector3(3.7, 2.55, 0.6), 14, o.neon);
    lightString(g, ctx, new THREE.Vector3(-3.7, 2.55, 0.6), new THREE.Vector3(-3.7, 2.55, 3.7), 6);
    lightString(g, ctx, new THREE.Vector3(3.7, 2.55, 0.6), new THREE.Vector3(3.7, 2.55, 3.7), 6);
    ctx.solids.push([tx - 1.4, tz - 0.7, tx + 2.45, tz + 0.7, 1.9], [-2.6, bz - 0.5, -2.2, bz - 0.1, by], [2.2, bz - 0.5, 2.6, bz - 0.1, by]);
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
  /** Walk-mode footprints of each placed building, in world space */
  const footprints = new Map<string, Solid[]>();
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
    for (const b of blinkers) {
      const m = b.material as THREE.PointsMaterial;
      m.size = (m.userData.size ?? 0.2) * (on ? 1 : 0.6);
    }
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
      return [...footprints.values()].flat();
    },
    show(id, design, anim = true) {
      const p = PLOT_BY_ID.get(id);
      if (!p) return;
      const old = buildings.get(id);
      if (old) disposeGroup(old);
      buildings.delete(id);
      designs.delete(id);
      footprints.delete(id);
      if (design) {
        const g = new THREE.Group();
        const b = new Batch();
        const local: Solid[] = [];
        GEN[design.type](design, g, b, { degen: opts.degen, blinkers, solids: local });
        b.build(g);
        g.position.set(p.cx, SLAB, p.cz);
        const turn = ((design.rot % 4) + 4) % 4;
        g.rotation.y = turn * (Math.PI / 2);
        // Footprints turned with the building and moved onto the plot
        const c = [1, 0, -1, 0][turn];
        const sn = [0, 1, 0, -1][turn];
        footprints.set(
          id,
          local.map(([x0, z0, x1, z1, h]) => {
            const xs = [x0 * c + z0 * sn, x1 * c + z1 * sn];
            const zs = [-x0 * sn + z0 * c, -x1 * sn + z1 * c];
            return [p.cx + Math.min(...xs), p.cz + Math.min(...zs), p.cx + Math.max(...xs), p.cz + Math.max(...zs), h] as Solid;
          })
        );
        scene.add(g);
        buildings.set(id, g);
        designs.set(id, { ...design });
        if (anim && !opts.reduced) animate(g);
      }
      resign();
    },
  };
}
