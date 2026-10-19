/*
 * Shared building blocks for the 3D city: toon materials, lights that follow
 * the time of day, canvas-drawn textures (windows, signs) and a batcher that
 * merges static geometry into a few draw calls.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ---------- Layers ---------- */

/** Solid geometry: drawn into the normal/depth pre-pass, so it gets ink lines. */
export const SOLID = 0;
/** Glows, glass, particles, signs: drawn normally but never inked. */
export const FX = 1;
/** Stand-ins that only exist in the ink pre-pass, so a floating sign hides the outlines behind it. */
export const OCC = 2;
export function fx<T extends THREE.Object3D>(o: T): T {
  o.traverse((c) => {
    if (c.layers.mask !== 1 << OCC) c.layers.set(FX);
  });
  return o;
}

/**
 * Give a cut-out sign (an FX plane with a transparent texture) a stand-in in
 * the ink pre-pass. Without one, the outlines of whatever is behind the sign
 * get drawn across it.
 */
export function occlude(mesh: THREE.Mesh, map: THREE.Texture) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { map: { value: map } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vN;
      void main() { vUv = uv; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D map; varying vec2 vUv; varying vec3 vN;
      void main() {
        if (texture2D(map, vUv).a < 0.5) discard;
        vec3 n = gl_FrontFacing ? vN : -vN;
        gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
      }
    `,
  });
  const stand = new THREE.Mesh(mesh.geometry, mat);
  stand.layers.set(OCC);
  mesh.add(stand);
  return mesh;
}

/* ---------- Randomness ---------- */

export function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rand = rng(144);
export const pick = <T,>(a: readonly T[], r = rand) => a[Math.floor(r() * a.length)];

/* ---------- Palette ---------- */

export const PAL = {
  ink: '#05050a',
  red: '#e23b3b',
  pink: '#ff6ad5',
  magenta: '#e219e5',
  violet: '#8000ff',
  blue: '#037dff',
  cyan: '#00eaff',
  warm: '#ffd36b',
  gold: '#f2c94c',
  telegram: '#2aabee',
  craneYellow: '#f5c400',
};

/* ---------- Toon materials ---------- */

const gradient = (() => {
  const t = new THREE.DataTexture(new Uint8Array([70, 150, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();

const toonCache = new Map<string, THREE.MeshToonMaterial>();
/** A flat cartoon material; same colour returns the same material. */
export function toon(color: THREE.ColorRepresentation, opts: THREE.MeshToonMaterialParameters = {}) {
  const key = Object.keys(opts).length ? '' : new THREE.Color(color).getHexString();
  if (key && toonCache.has(key)) return toonCache.get(key)!;
  const m = new THREE.MeshToonMaterial({ color, gradientMap: gradient, ...opts });
  if (key) toonCache.set(key, m);
  return m;
}

/* ---------- Lights that follow the time of day ---------- */

interface Lit {
  mat: THREE.Material;
  day: number;
  night: number;
  flicker: number;
  seed: number;
  base?: THREE.Color;
}
const lits: Lit[] = [];

/**
 * Register a glowing material. Its brightness runs from `day` to `night` as the
 * sun sets; `flicker` (0-1) makes it stutter like a tired neon tube.
 */
export function lit<M extends THREE.Material>(mat: M, day: number, night: number, flicker = 0): M {
  const entry: Lit = { mat, day, night, flicker, seed: rand() * 100 };
  // Unlit materials (basic, points) are driven through their colour, lit ones through emissive
  const m = mat as unknown as { color?: THREE.Color; emissive?: THREE.Color };
  if (m.color && !m.emissive) entry.base = m.color.clone();
  lits.push(entry);
  return mat;
}

/** Stop driving a material that's being thrown away (guns that come and go) */
export function unlit(mat: THREE.Material) {
  const i = lits.findIndex((l) => l.mat === mat);
  if (i >= 0) lits.splice(i, 1);
}

export function updateLights(night: number, t: number) {
  for (const l of lits) {
    let v = l.day + (l.night - l.day) * night;
    if (l.flicker) {
      const p = Math.sin(t * 1.7 + l.seed) + Math.sin(t * 13.1 + l.seed * 3.1) * 0.5;
      if (p > 1.38) v *= 1 - l.flicker * 0.75;
    }
    if (l.base) (l.mat as unknown as { color: THREE.Color }).color.copy(l.base).multiplyScalar(v);
    else (l.mat as THREE.MeshStandardMaterial).emissiveIntensity = v;
  }
}

/** Unlit glowing colour (neon, bulbs). */
export function neon(color: THREE.ColorRepresentation, day = 1, night = 2.4, flicker = 0) {
  return lit(new THREE.MeshBasicMaterial({ color, toneMapped: true }), day, night, flicker);
}

/* ---------- Canvas textures ---------- */

export function canvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export const FONT_DISPLAY = '"Big Shoulders Display", Impact, "Arial Narrow", sans-serif';
export const FONT_MONO = '"JetBrains Mono", ui-monospace, monospace';

/** Neon lettering on a transparent background, glow baked in. */
export function neonSign(text: string, color: string, opts: { w?: number; h?: number; size?: number; font?: string; board?: string | null; tracking?: number } = {}) {
  const { w = 1024, h = 256, size = 170, font = FONT_DISPLAY, board = '#0b0a18', tracking = 6 } = opts;
  return canvasTex(w, h, (ctx) => {
    if (board) {
      ctx.fillStyle = board;
      roundRect(ctx, 6, 6, w - 12, h - 12, 22);
      ctx.fill();
      ctx.lineWidth = 10;
      ctx.strokeStyle = PAL.ink;
      ctx.stroke();
    }
    ctx.font = `900 ${size}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${tracking}px`;
    ctx.shadowColor = color;
    for (const blur of [40, 18]) {
      ctx.shadowBlur = blur;
      ctx.fillStyle = color;
      ctx.fillText(text, w / 2, h / 2 + 6);
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.65;
    ctx.fillText(text, w / 2, h / 2 + 6);
  });
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

interface FacadeOpts {
  cols: number;
  rows: number;
  wall: string;
  glass?: string;
  lit?: string[];
  litRatio?: number;
  seed?: number;
  /** Draw horizontal floor slabs between rows */
  bands?: string | null;
  /** Leave the bottom N rows as a lit shopfront */
  shopRows?: number;
}

/** Window grid for a facade: a day map and a matching night-glow map. */
export function facade(o: FacadeOpts) {
  const { cols, rows, wall, glass = '#1c2246', lit: litCols = [PAL.warm], litRatio = 0.55, seed = 7, bands = null } = o;
  const r = rng(seed);
  const cw = 48;
  const ch = 64;
  const W = cols * cw;
  const H = rows * ch;
  const cells: { x: number; y: number; w: number; h: number; on: string | null }[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const on = r() < litRatio ? pick(litCols, r) : null;
      cells.push({ x: x * cw + 9, y: y * ch + 12, w: cw - 18, h: ch - 22, on });
    }
  }
  const map = canvasTex(W, H, (ctx) => {
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, H);
    if (bands) {
      ctx.fillStyle = bands;
      for (let y = 0; y < rows; y++) ctx.fillRect(0, y * ch, W, 6);
    }
    for (const c of cells) {
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(c.x - 3, c.y - 3, c.w + 6, c.h + 6);
      const g = ctx.createLinearGradient(c.x, c.y, c.x + c.w, c.y + c.h);
      g.addColorStop(0, '#3b4a8a');
      g.addColorStop(0.45, glass);
      g.addColorStop(1, '#0d1030');
      ctx.fillStyle = c.on ? c.on : g;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      // mullion
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(c.x + c.w / 2 - 1.5, c.y, 3, c.h);
    }
  });
  const emissiveMap = canvasTex(W, H, (ctx) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    for (const c of cells) {
      if (!c.on) continue;
      const g = ctx.createLinearGradient(0, c.y, 0, c.y + c.h);
      g.addColorStop(0, c.on);
      g.addColorStop(1, shadeHex(c.on, -0.35));
      ctx.fillStyle = g;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = '#000';
      ctx.fillRect(c.x + c.w / 2 - 1.5, c.y, 3, c.h);
    }
  });
  return { map, emissiveMap };
}

export function shadeHex(hex: string, amt: number) {
  const c = new THREE.Color(hex);
  if (amt < 0) c.lerp(new THREE.Color('#000'), -amt);
  else c.lerp(new THREE.Color('#fff'), amt);
  return '#' + c.getHexString();
}

/** A toon facade material whose lit windows glow at night. */
export function facadeMat(o: FacadeOpts, dayGlow = 0.15, nightGlow = 1.8) {
  const { map, emissiveMap } = facade(o);
  const m = new THREE.MeshToonMaterial({ map, emissiveMap, emissive: '#ffffff', gradientMap: gradient });
  return lit(m, dayGlow, nightGlow);
}

/* ---------- Geometry ---------- */

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

export function place(geo: THREE.BufferGeometry, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
  _q.setFromEuler(_e.set(rx, ry, rz));
  _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
  const g = geo.clone();
  g.applyMatrix4(_m);
  return g;
}

/** Box from its min corner (x, y, z) and size, like the 2D map's prisms. */
export function boxAt(x: number, y: number, z: number, w: number, h: number, d: number) {
  return place(unitBox, x + w / 2, y + h / 2, z + d / 2, w, h, d);
}

function ensureIndexed(g: THREE.BufferGeometry) {
  if (g.index) return g;
  const n = g.attributes.position.count;
  const idx = new (n > 65535 ? Uint32Array : Uint16Array)(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

function ensureUv(g: THREE.BufferGeometry) {
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

/** Collects static geometry per material and merges it into one mesh each. */
export class Batch {
  private parts = new Map<THREE.Material, THREE.BufferGeometry[]>();

  add(geo: THREE.BufferGeometry, mat: THREE.Material) {
    const g = ensureIndexed(ensureUv(geo));
    g.clearGroups();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat)!.push(g);
    return this;
  }

  box(x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material) {
    return this.add(boxAt(x, y, z, w, h, d), mat);
  }

  build(parent: THREE.Object3D, { cast = true, receive = true } = {}) {
    for (const [mat, geos] of this.parts) {
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = cast;
      mesh.receiveShadow = receive;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      parent.add(mesh);
    }
    this.parts.clear();
    return parent;
  }
}

/** A flat plane facing +z (or rotated), for signs and decals. */
export function plane(w: number, h: number, mat: THREE.Material) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

/** Soft round glow sprite texture, shared. */
export const glowTex = canvasTex(128, 128, (ctx) => {
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
});

/** Additive glow material (light pools, halos, beams). */
export function glowMat(color: THREE.ColorRepresentation, opacity = 1, map: THREE.Texture | null = glowTex) {
  return new THREE.MeshBasicMaterial({
    color,
    map,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending, fog: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Load an image into a texture (resolves even on failure, with a blank). */
export function loadTex(url: string) {
  return new Promise<THREE.Texture>((resolve) => {
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        resolve(t);
      },
      undefined,
      () => resolve(new THREE.Texture())
    );
  });
}

export function loadImage(url: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
