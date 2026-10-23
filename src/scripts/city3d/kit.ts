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
/**
 * A flat cartoon material; same colour returns the same material. Plain ones
 * (no options) are marked `paint`: a Batch folds them all into one shared
 * material, the colour carried per vertex, so a building's colours cost one
 * draw call, not one each. Never change a plain one's colour at runtime.
 */
export function toon(color: THREE.ColorRepresentation, opts: THREE.MeshToonMaterialParameters = {}) {
  const key = Object.keys(opts).length ? '' : new THREE.Color(color).getHexString();
  if (key && toonCache.has(key)) return toonCache.get(key)!;
  const m = new THREE.MeshToonMaterial({ color, gradientMap: gradient, ...opts });
  if (key) {
    m.userData.paint = true;
    toonCache.set(key, m);
  }
  return m;
}

/* ---------- Shared materials (colours per vertex) ---------- */

let paintShared: THREE.MeshToonMaterial | null = null;
/**
 * The wind in the trees (city life plan, Phase 4): x is the time, y how far a canopy's top sways (tiles)
 * for each unit of the sway its normals carry (`Batch.instances()`'s `sway`). Set by `updateWind()`.
 */
export const windU = { value: new THREE.Vector3(0, 0, 0) };
/**
 * What marks a vertex that sways, in its uv's y (`Batch.instances()`): a number no shape's own coordinates
 * land on (a shape's uv is its coordinates), and exact in a float, so the shader can match it exactly
 */
export const SWAY_MARK = -7.3125;
/**
 * The sway in a vertex shader: a canopy's vertices carry how much they sway in their `uv` (the shared
 * paint has no texture, so the uv is free: x the sway, y `SWAY_MARK`; `Batch.add()` zeroes everything
 * else's, and nothing else moves), read back here and swung by the wind. Into the shared paint and the
 * ink outlines' normal pass (post.ts), so the outlines follow; the shadow map's depth pass leaves it
 * out (a tree's shadow holding still is never seen). (Not the normals' lengths: merging a tile's
 * geometry re-normalises them.)
 */
export function injectWind(sh: { vertexShader: string; uniforms: Record<string, THREE.IUniform> }) {
  sh.uniforms.uWind = windU;
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nuniform vec3 uWind;')
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
  {
    float sway = abs(uv.y - (${SWAY_MARK.toFixed(4)})) < 0.001 ? uv.x : 0.0;
    if (sway > 0.0) {
      float ph = transformed.x * 0.37 + transformed.z * 0.23;
      float g = sin(uWind.x * 1.1 + ph) * 0.6 + sin(uWind.x * 2.9 + ph * 1.7) * 0.4;
      transformed.x += g * sway * uWind.y;
      transformed.z += cos(uWind.x * 0.8 + ph * 0.9) * 0.5 * sway * uWind.y;
    }
  }`
    );
}
/** The wind this frame: the time and how far the canopies' tops sway (tiles), over the sway they carry (`sway` in `Batch.instances()`) */
export function updateWind(t: number, strength: number, sway: number) {
  windU.value.set(t, sway > 0 ? strength / sway : 0, 0);
}
/** The one toon material every Batch's plain colours share */
export function paintMat() {
  if (!paintShared) {
    paintShared = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: gradient, vertexColors: true });
    paintShared.userData.shared = true;
    paintShared.userData.siteKey = 'paint';
    paintShared.onBeforeCompile = (sh) => injectWind(sh);
    paintShared.customProgramCacheKey = () => 'paint-wind';
  }
  return paintShared;
}
const neonShared = new Map<string, THREE.MeshBasicMaterial>();
/** How dark it is, 0 by day to 1 at night, for the shared neon's shader (and the far forms', lod.ts) */
export const nightU = { value: 0 };
let neonAll: THREE.MeshBasicMaterial | null = null;
/**
 * The one material every steady neon in a Batch shares: its colour per
 * vertex, and each vertex's own day and night brightness in a `lit`
 * attribute, mixed by the time of day in the shader. So a Batch's neon is
 * one draw whatever brightnesses it mixes. Flickering neon keeps a material
 * per brightness (`neonMat`), since the flicker is driven on the material.
 */
function neonAllMat() {
  if (neonAll) return neonAll;
  neonAll = new THREE.MeshBasicMaterial({ color: '#ffffff', vertexColors: true, toneMapped: true });
  neonAll.userData.shared = true;
  neonAll.userData.siteKey = 'neon';
  neonAll.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = nightU;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 lit;\nuniform float uNight;')
      .replace('#include <color_vertex>', '#include <color_vertex>\nvColor.rgb *= mix(lit.x, lit.y, uNight);');
  };
  neonAll.customProgramCacheKey = () => 'neon-lit';
  return neonAll;
}
/** Flickering neon with the same brightness by day and night shares one material; its colour is per vertex */
function neonMat(day: number, night: number, flicker: number) {
  const key = `${day}|${night}|${flicker}`;
  let m = neonShared.get(key);
  if (!m) {
    neonShared.set(key, (m = lit(new THREE.MeshBasicMaterial({ color: '#ffffff', vertexColors: true, toneMapped: true }), day, night, flicker)));
    m.userData.shared = true;
    m.userData.siteKey = `neon|${key}`;
  }
  return m;
}

/* ---------- Sites built off the main thread (performance phase 4, sitework.ts) ---------- */

/** No DOM here: the site worker (canvases aren't painted there: the main thread's are the ones drawn) */
export const NO_DOM = typeof document === 'undefined';
const SITE_MATS = new Map<string, THREE.Material>();
/**
 * Name a material sites draw with (anything but the shared ones, which are named already): a site built
 * in the worker comes back as geometry and these names, drawn with the main thread's own materials.
 * One name, one material; a site drawing with a material without a name is built on the main thread.
 */
export function siteMat<M extends THREE.Material>(key: string, m: M): M {
  m.userData.siteKey = key;
  if (!SITE_MATS.has(key)) SITE_MATS.set(key, m);
  return m;
}
/** The main thread's material for a site material's name (null: not made here yet) */
export function siteMatOf(key: string): THREE.Material | null {
  if (key === 'paint') return paintMat();
  if (key === 'neon') return neonAllMat();
  if (key.startsWith('neon|')) {
    const [day, night, flicker] = key.slice(5).split('|').map(Number);
    return neonMat(day, night, flicker);
  }
  return SITE_MATS.get(key) ?? null;
}

/** Paint every vertex of a geometry one colour (for the shared materials) */
export function paintVertices(g: THREE.BufferGeometry, c: THREE.Color) {
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < a.length; i += 3) {
    a[i] = c.r;
    a[i + 1] = c.g;
    a[i + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

/** Give every vertex the same day and night brightness (for the shared neon) */
function litVertices(g: THREE.BufferGeometry, day: number, night: number) {
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 2);
  for (let i = 0; i < a.length; i += 2) {
    a[i] = day;
    a[i + 1] = night;
  }
  g.setAttribute('lit', new THREE.BufferAttribute(a, 2));
  return g;
}

/**
 * The shared material a material folds into in a Batch, and the colour its
 * vertices take (null if it keeps its own: textures, glass, special shaders).
 */
export function sharedFor(mat: THREE.Material): { mat: THREE.Material; color: THREE.Color; lit?: [number, number] } | null {
  const u = mat.userData as { paint?: boolean; neon?: { color: THREE.Color; day: number; night: number; flicker: number } };
  if (u.paint) return { mat: paintMat(), color: (mat as THREE.MeshToonMaterial).color };
  if (u.neon) {
    if (u.neon.flicker) return { mat: neonMat(u.neon.day, u.neon.night, u.neon.flicker), color: u.neon.color };
    return { mat: neonAllMat(), color: u.neon.color, lit: [u.neon.day, u.neon.night] };
  }
  return null;
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

/** How bright a registered glowing material is by day and at night (`lit()`), or null */
export function litOf(mat: THREE.Material): { day: number; night: number; base?: THREE.Color } | null {
  const l = lits.find((e) => e.mat === mat);
  // (`base`: an unlit material's own colour, before the time of day scales it)
  return l ? { day: l.day, night: l.night, base: l.base } : null;
}

/** Glowing materials that flicker (`lit()` with a flicker) going out together: a lamp's bulb, halo and pool */
export function flickerTogether(mats: THREE.Material[], seed: number) {
  for (const l of lits) if (mats.includes(l.mat)) l.seed = seed;
}

/** Stop driving a material that's being thrown away (guns that come and go) */
export function unlit(mat: THREE.Material) {
  const i = lits.findIndex((l) => l.mat === mat);
  if (i >= 0) lits.splice(i, 1);
}

export function updateLights(night: number, t: number) {
  nightU.value = night;
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
  const m = lit(new THREE.MeshBasicMaterial({ color, toneMapped: true }), day, night, flicker);
  // Its colour before the time of day scales it, for a Batch's shared neon (sharedFor)
  m.userData.neon = { color: new THREE.Color(color), day, night, flicker };
  return m;
}

/* ---------- Canvas textures ---------- */

/**
 * Phones (a coarse pointer or a small screen: index.ts's `low` tier) draw the big canvas textures at
 * half size, a quarter of the memory; their screens can't show the difference
 */
const HALF_TEX = typeof matchMedia !== 'undefined' && (matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 700);
/** What counts as big (a 512 x 512 canvas's pixels or more): the atlases and the long signs */
const BIG_TEX = 512 * 512;

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

/**
 * A canvas texture `w` x `h`, drawn by `draw` in those numbers (on phones a big one is drawn into a
 * canvas half the size, scaled to fit, so `draw` never knows). Never draw into its canvas afterwards
 * in pixels: the textures redrawn live (the LED wall) stay small enough to keep their size, and are
 * `liveTex()`. Made at build time where it can be (below): then it's downloaded, not painted.
 */
export function canvasTex(w: number, h: number, draw: Draw): THREE.CanvasTexture {
  // (in the site worker: a texture to name a material by, never painted or drawn)
  if (NO_DOM) {
    const t = new THREE.Texture();
    t.colorSpace = THREE.SRGBColorSpace;
    return t as THREE.CanvasTexture;
  }
  const key = texKey(w, h, draw);
  const made = BUILT?.[key];
  if (made) return builtTexture(made, () => paint(w, h, draw));
  const c = paint(w, h, draw);
  if (BAKING) BAKING.push({ key, canvas: c, src: draw.toString().slice(0, 160) });
  return canvasTexOf(c);
}

/**
 * A canvas texture that's never made at build time: drawn from the save, the look or the visitor's own
 * things (plots, units, the car), or drawn into afterwards (the LED wall). Painted here every time.
 */
export function liveTex(w: number, h: number, draw: Draw): THREE.CanvasTexture {
  if (NO_DOM) return canvasTex(w, h, draw);
  return canvasTexOf(paint(w, h, draw));
}

function paint(w: number, h: number, draw: Draw) {
  const k = HALF_TEX && w * h >= BIG_TEX ? 0.5 : 1;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k));
  c.height = Math.max(1, Math.round(h * k));
  const ctx = c.getContext('2d')!;
  if (k !== 1) ctx.scale(c.width / w, c.height / h);
  draw(ctx, w, h);
  return c;
}
function canvasTexOf(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ---------- Textures made at build time (performance phase 4, scripts/bake-textures.mjs) ---------- */

/**
 * Which build-time set this device takes: phones' (their big textures half size, `HALF_TEX`, which is
 * also index.ts's `low` tier) or everyone else's
 */
export const TEX_SET = HALF_TEX ? 'low' : 'full';
/** One texture made at build time: its file (GPU-compressed, KTX2), size and average colour (the far forms', lod.ts) */
export interface BuiltTex {
  file: string;
  w: number;
  h: number;
  avg: [number, number, number, number];
}
/** ?bake-textures: the build's own run, recording what's painted (each texture's key and canvas) */
const BAKING: { key: string; canvas: HTMLCanvasElement; src: string }[] | null =
  !NO_DOM && /[?&]bake-textures\b/.test(location.search) ? ((globalThis as { __texBake?: unknown[] }).__texBake = []) as never : null;
/** Where the build put them, and the transcoder (three's, under its version) */
let builtBase = '';
let builtTranscoder = '';
/** The build's own run (?bake-textures): the boot waits for the web fonts however long they take */
export const BAKING_TEXTURES = !!BAKING;
/**
 * The textures made at build time for this device, from the page (the build writes them in, `#city-tex`).
 * None while baking, with ?textures=0, or with the options that change what the boot paints (?fight, ?district)
 */
const BUILT: Record<string, BuiltTex> | null = (() => {
  if (NO_DOM || BAKING || /[?&](textures=0|fight|district)\b/.test(location.search)) return null;
  try {
    const all = JSON.parse(document.getElementById('city-tex')?.textContent ?? 'null') as { base: string; transcoder: string; sets: Record<string, Record<string, BuiltTex>> } | null;
    if (!all) return null;
    builtBase = all.base;
    builtTranscoder = all.base + all.transcoder;
    return all.sets[TEX_SET] ?? null;
  } catch {
    return null;
  }
})();
/**
 * A texture's key: what draws it (its function's source), its size, and how many like it came before
 * (the boot paints in the same order every time). The build keeps only the keys that came out the same
 * with two different saves and clocks, so a key always stands for the same picture.
 */
const texCounts = new Map<string, number>();
function texKey(w: number, h: number, draw: Draw) {
  const src = draw.toString();
  let x = 2166136261;
  for (let i = 0; i < src.length; i++) x = Math.imul(x ^ src.charCodeAt(i), 16777619);
  const base = `${(x >>> 0).toString(36)}-${w}x${h}`;
  const n = texCounts.get(base) ?? 0;
  texCounts.set(base, n + 1);
  return `${base}-${n}`;
}

/** One made at build time: the texture standing in for it, and its painted fallback */
interface Waiting {
  tex: THREE.CompressedTexture;
  made: BuiltTex;
  paint: () => HTMLCanvasElement;
  ready: () => void;
}
/** Those asked for before there was a renderer to load them with */
const waiting: Waiting[] = [];
/** The loader, once there's a renderer (which compressed formats this GPU takes), and the loads under way */
let loading: Promise<import('three/addons/loaders/KTX2Loader.js').KTX2Loader> | null = null;
let loads: Promise<void>[] = [];
/**
 * A texture made at build time: empty until its file is in, and never sent to the GPU before (three
 * would try to upload nothing); the materials take it as they'd take the canvas
 */
function builtTexture(made: BuiltTex, paint: () => HTMLCanvasElement) {
  const t = new THREE.CompressedTexture([], made.w, made.h);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.userData.average = made.avg;
  let ready = false;
  Object.defineProperty(t, 'needsUpdate', {
    set(v: boolean) {
      if (v && ready) {
        t.version++;
        t.source.needsUpdate = true;
      }
    },
  });
  const w: Waiting = { tex: t, made, paint, ready: () => (ready = true) };
  // (downloading at once if it can, while the rest of the city is built)
  if (loading) loads.push(fill(w));
  else {
    waiting.push(w);
    // (after the boot: a new loader)
    if (loader3d) void loadBuiltTextures(loader3d);
  }
  return t as unknown as THREE.CanvasTexture;
}

/** Fetch and decode one texture's file into it; one that won't load is painted after all */
async function fill({ tex, made, paint, ready }: Waiting) {
  try {
    const k = await (await loading!).loadAsync(builtBase + made.file);
    tex.mipmaps = k.mipmaps;
    tex.format = k.format;
    tex.type = k.type;
    tex.image = k.image;
    tex.minFilter = k.minFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
  } catch {
    // (the canvas, as if it had never been made at build time)
    const c = paint();
    (tex as unknown as { isCompressedTexture: boolean }).isCompressedTexture = false;
    tex.image = c;
    tex.mipmaps = [];
    tex.flipY = true;
    tex.generateMipmaps = true;
  }
  ready();
  tex.needsUpdate = true;
}

/**
 * Start loading the textures made at build time, now there's a renderer (those asked for since start
 * loading as they're asked for); resolves when every one asked for so far is in. `done()` lets the
 * loader's workers go once the boot is over.
 */
let loader3d: THREE.WebGLRenderer | null = null;
export function loadBuiltTextures(renderer: THREE.WebGLRenderer) {
  loader3d = renderer;
  if (!loading && (waiting.length || BUILT))
    loading = import('three/addons/loaders/KTX2Loader.js').then(({ KTX2Loader }) => new KTX2Loader().setTranscoderPath(builtTranscoder).detectSupport(renderer));
  for (const w of waiting.splice(0)) loads.push(fill(w));
  return Promise.all(loads).then(() => undefined);
}
/** The boot is over: the loader's workers go (anything made at build time after this loads with a new one) */
export function builtTexturesDone() {
  const l = loading;
  if (!l) return;
  void Promise.all(loads).then(() => l.then((x) => x.dispose()));
  loading = null;
  loads = [];
}

export const FONT_DISPLAY = '"Big Shoulders Display", Impact, "Arial Narrow", sans-serif';
export const FONT_MONO = '"JetBrains Mono", ui-monospace, monospace';

/** Neon lettering on a transparent background, glow baked in. */
export function neonSign(text: string, color: string, opts: { w?: number; h?: number; size?: number; font?: string; board?: string | null; tracking?: number; live?: boolean } = {}) {
  const { w = 1024, h = 256, size = 170, font = FONT_DISPLAY, board = '#0b0a18', tracking = 6 } = opts;
  // (`live`: drawn from the save, never made at build time: liveTex())
  return (opts.live ? liveTex : canvasTex)(w, h, (ctx) => {
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
  /** Drawn from the save (a plot's, a lot's): never made at build time (liveTex()) */
  live?: boolean;
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
  const tex = o.live ? liveTex : canvasTex;
  const map = tex(W, H, (ctx) => {
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
  const emissiveMap = tex(W, H, (ctx) => {
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

/**
 * Collects static geometry per material and merges it into one mesh each.
 * Plain colours (`toon()` without options) and `neon()` fold into shared
 * materials with the colour per vertex (`sharedFor()`), so all of a Batch's
 * plain colours are one draw call and its steady neon another (each vertex
 * carries its day and night brightness; only flickering neon is one per
 * brightness).
 */
/**
 * Which distances a piece of geometry is drawn at (growth plan Phase 2):
 * 'all' always, 'near' only close to the camera (the details: stoops,
 * cornices, rooftop clutter, props), 'far' only further away (a stand-in
 * for details left out). `tileBatch()` swaps them per tile.
 */
export type Lod = 'all' | 'near' | 'far';

export class Batch {
  private parts = new Map<string, { mat: THREE.Material; lod: Lod; geos: THREE.BufferGeometry[] }>();
  /** The level what's added now is drawn at (see `Lod`; `detail()` sets it for a while) */
  lod: Lod = 'all';

  /** Add what `draw` adds at level `lod` (the details of a building: near only) */
  detail(draw: () => void, lod: Lod = 'near') {
    const was = this.lod;
    this.lod = lod;
    try {
      draw();
    } finally {
      this.lod = was;
    }
    return this;
  }

  private file(mat: THREE.Material) {
    const key = `${mat.uuid}|${this.lod}`;
    let part = this.parts.get(key);
    if (!part) this.parts.set(key, (part = { mat, lod: this.lod, geos: [] }));
    return part.geos;
  }

  add(geo: THREE.BufferGeometry, mat: THREE.Material) {
    const g = ensureIndexed(ensureUv(geo));
    g.clearGroups();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    const shared = sharedFor(mat);
    if (shared) {
      paintVertices(g, shared.color);
      if (shared.lit) litVertices(g, shared.lit[0], shared.lit[1]);
      // The shared materials have no texture: the uv is free, and the paint's shader reads the wind's sway
      // from it (`injectWind()`), so it must be zero here. An extruded or lathed shape carries its own
      // coordinates as uv (three's world uv generator), which read as a sway of whole tiles: Liberty Bridge's
      // arches once stretched across the river in the wind.
      (g.attributes.uv as THREE.BufferAttribute).array.fill(0);
      mat = shared.mat;
    }
    this.file(mat).push(g);
    this.lastAdded = { geo: g, mat };
    return this;
  }

  /** A mesh as it stands (its own transform), split by its material groups */
  mesh(m: THREE.Mesh) {
    m.updateMatrix();
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const src = m.geometry.index ? m.geometry : ensureIndexed(m.geometry.clone());
    // One material covers the whole geometry, whatever groups it has (a BoxGeometry has six)
    const groups = Array.isArray(m.material) && src.groups.length ? src.groups : [{ start: 0, count: src.index!.count, materialIndex: 0 }];
    for (const gr of groups) {
      const g = src.clone();
      g.setIndex(Array.from(src.index!.array.slice(gr.start, gr.start + gr.count)));
      g.applyMatrix4(m.matrix);
      this.add(g, mats[gr.materialIndex ?? 0]);
    }
    return this;
  }

  box(x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material) {
    return this.add(boxAt(x, y, z, w, h, d), mat);
  }

  /**
   * Many copies of one shape, each placed by its matrix (what an
   * InstancedMesh would draw), merged with the rest: fixed things spread
   * over the whole map (trees, lamps, road markings), so they're split by
   * tile with everything else (`tileBatch()`) and only the copies in view
   * are drawn.
   */
  instances(geo: THREE.BufferGeometry, mat: THREE.Material, matrices: readonly THREE.Matrix4[], sway = 0) {
    if (!matrices.length) return this;
    // The shape made ready once (indexed, its colour per vertex), then copied
    const first = this.add(geo.clone(), mat).lastAdded!;
    const list = this.file(first.mat);
    list.pop();
    // Something that sways in the wind (a tree's canopy) carries how much each vertex sways in its uv (the
    // shared paint has no texture, and `add()` has just zeroed it): `sway` at its top, 0.4 of that at its
    // foot, and `SWAY_MARK` as the mark (`injectWind()` reads it back; zero memory: the uv is there anyway)
    if (sway > 0) {
      const pos = first.geo.attributes.position;
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = 0; i < pos.count; i++) {
        lo = Math.min(lo, pos.getY(i));
        hi = Math.max(hi, pos.getY(i));
      }
      const uv = first.geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, sway * (0.4 + 0.6 * (hi > lo ? (pos.getY(i) - lo) / (hi - lo) : 1)), SWAY_MARK);
    }
    for (const m of matrices) list.push(first.geo.clone().applyMatrix4(m));
    first.geo.dispose();
    return this;
  }
  /** The geometry and material the last `add()` filed (for `instances()`) */
  private lastAdded: { geo: THREE.BufferGeometry; mat: THREE.Material } | null = null;

  build(parent: THREE.Object3D, { cast = true, receive = true } = {}) {
    for (const { mat, lod, geos } of this.parts.values()) {
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat);
      if (lod !== 'all') mesh.userData.lod = lod;
      mesh.castShadow = cast;
      mesh.receiveShadow = receive;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      mesh.userData.batched = true;
      parent.add(mesh);
    }
    this.parts.clear();
    return parent;
  }
}

/**
 * Merge the meshes Batches built (`userData.batched`) that share a parent, a
 * material, a layer and shadow flags: a landmark made from several Batches
 * ends up with one mesh per material, not one per Batch. Only for parts of
 * the city that are never rebuilt (the units, lots and plots rebuild theirs).
 */
export function consolidate(parents: THREE.Object3D[]) {
  for (const parent of parents) {
    const sets = new Map<string, THREE.Mesh[]>();
    for (const c of parent.children) {
      const m = c as THREE.Mesh;
      if (!m.isMesh || !m.userData.batched || Array.isArray(m.material)) continue;
      const key = `${m.material.uuid}|${m.layers.mask}|${m.castShadow}|${m.receiveShadow}|${m.visible}|${m.userData.lod ?? 'all'}`;
      if (!sets.has(key)) sets.set(key, []);
      sets.get(key)!.push(m);
    }
    for (const list of sets.values()) {
      if (list.length < 2) continue;
      const geos = list.map((m) => {
        m.updateMatrix();
        return m.geometry.clone().applyMatrix4(m.matrix);
      });
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      const first = list[0];
      const mesh = new THREE.Mesh(merged, first.material);
      mesh.castShadow = first.castShadow;
      mesh.receiveShadow = first.receiveShadow;
      mesh.layers.mask = first.layers.mask;
      mesh.matrixAutoUpdate = false;
      mesh.userData.batched = true;
      if (first.userData.lod) mesh.userData.lod = first.userData.lod;
      for (const m of list) {
        parent.remove(m);
        m.geometry.dispose();
      }
      for (const g of geos) g.dispose();
      parent.add(mesh);
    }
  }
}

/**
 * A box in two material groups: the faces in `first` (BoxGeometry's order:
 * 0 +x, 1 -x, 2 +y, 3 -y, 4 +z, 5 -z) in group 0, the rest in group 1. Two
 * draw calls instead of BoxGeometry's six. By default the four sides, then
 * the top and bottom.
 */
export function sidesBox(w: number, h: number, d: number, first = [0, 1, 4, 5]) {
  const g = new THREE.BoxGeometry(w, h, d);
  const idx = g.index!.array;
  const face = (k: number) => Array.from(idx.slice(k * 6, k * 6 + 6));
  const rest = [0, 1, 2, 3, 4, 5].filter((k) => !first.includes(k));
  g.setIndex([...first.flatMap(face), ...rest.flatMap(face)]);
  g.clearGroups();
  g.addGroup(0, first.length * 6, 0);
  g.addGroup(first.length * 6, rest.length * 6, 1);
  return g;
}

/**
 * Merge meshes (each with its own transform) into a group of as few meshes as
 * a Batch makes: one for all plain colours, one per other material. For the
 * parts of something that moves as one (a boat, a drone's body).
 */
export function mergeMeshes(meshes: THREE.Mesh[], opts: { cast?: boolean; receive?: boolean } = {}) {
  const b = new Batch();
  for (const m of meshes) b.mesh(m);
  const g = new THREE.Group();
  b.build(g, opts);
  for (const c of g.children) c.matrixAutoUpdate = true;
  return g;
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
