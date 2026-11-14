/*
 * What the city holds in memory, for the ?fps readout and the benchmark
 * (docs/growth-plan.md Phase 0): the bytes of every geometry and texture the
 * scene draws, counted once each however many meshes share them. An
 * estimate (the GPU pads and may keep copies), but the same estimate every
 * time, so it shows what a change costs.
 */
import * as THREE from 'three';
import { targetBytes } from './targets';

export interface SceneMemory {
  /** Geometry: vertex attributes, indices, instance matrices and colours, in bytes */
  geometry: number;
  /** Textures, mipmaps included, in bytes */
  textures: number;
  /** How many of each */
  geometries: number;
  textureCount: number;
  /** Objects in the scene (meshes, groups, lights, bones) */
  objects: number;
}

const bytesOf = (a: { array: ArrayLike<number> & { byteLength?: number } } | null | undefined) => (a?.array && 'byteLength' in a.array ? (a.array.byteLength ?? 0) : 0);

function textureBytes(t: THREE.Texture) {
  // A compressed one (made at build time, kit.ts): what its levels hold on the GPU
  const mips = (t as THREE.CompressedTexture).isCompressedTexture ? ((t as THREE.CompressedTexture).mipmaps as { data?: ArrayBufferView }[]) : null;
  if (mips?.length) return mips.reduce((n, m) => n + (m.data?.byteLength ?? 0), 0);
  const img = t.image as { width?: number; height?: number; data?: ArrayBufferView } | null;
  if (!img) return 0;
  let bytes = img.data ? img.data.byteLength : (img.width ?? 0) * (img.height ?? 0) * 4;
  if (t.generateMipmaps && t.minFilter !== THREE.NearestFilter && t.minFilter !== THREE.LinearFilter) bytes *= 4 / 3;
  return bytes;
}

/** Everything the scene draws, counted once each */
export function sceneMemory(scene: THREE.Object3D): SceneMemory {
  const geos = new Set<THREE.BufferGeometry>();
  const bufs = new Set<unknown>();
  const texs = new Set<THREE.Texture>();
  const mats = new Set<THREE.Material>();
  let geometry = 0;
  let objects = 0;
  const attr = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute | null | undefined) => {
    if (!a) return;
    // Interleaved attributes share one buffer: count it once
    const key = 'data' in a && a.data ? a.data : a;
    if (bufs.has(key)) return;
    bufs.add(key);
    geometry += bytesOf('data' in a && a.data ? a.data : (a as THREE.BufferAttribute));
  };
  const tex = (v: unknown) => {
    if (v && (v as THREE.Texture).isTexture) texs.add(v as THREE.Texture);
  };
  scene.traverse((o) => {
    objects++;
    const m = o as THREE.Mesh & Partial<THREE.InstancedMesh>;
    if (m.geometry && !geos.has(m.geometry)) {
      geos.add(m.geometry);
      for (const a of Object.values(m.geometry.attributes)) attr(a);
      attr(m.geometry.index);
    }
    if (m.instanceMatrix) attr(m.instanceMatrix);
    if (m.instanceColor) attr(m.instanceColor);
    const list = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
    for (const mat of [...list, m.customDepthMaterial, m.customDistanceMaterial]) if (mat) mats.add(mat);
  });
  for (const mat of mats) {
    for (const v of Object.values(mat)) tex(v);
    const u = (mat as THREE.ShaderMaterial).uniforms;
    if (u) for (const { value } of Object.values(u)) tex(value);
  }
  let textures = 0;
  for (const t of texs) textures += textureBytes(t);
  return { geometry, textures, geometries: geos.size, textureCount: texs.size, objects };
}

/** Bytes a colour pixel of a render target's texture takes (RGBA: 4 a byte channel, 8 half-float, 16 float) */
const pixelBytes = (t: THREE.Texture) => (t.type === THREE.HalfFloatType ? 8 : t.type === THREE.FloatType ? 16 : 4) * (t.format === THREE.RedFormat ? 0.25 : t.format === THREE.RGFormat ? 0.5 : 1);

/**
 * What render targets hold on the GPU (docs/stability-plan.md, Phase 2): the picture's own (post.ts `targets()`) and
 * every light's shadow map in the scene, each counted once. Not in `sceneMemory()`, which counts what the scene's
 * materials draw with: these are what the frame is drawn into
 */
export function targetMemory(targets: (THREE.WebGLRenderTarget | null | undefined)[], scene?: THREE.Object3D): number {
  const seen = new Set<THREE.WebGLRenderTarget>();
  const all = [...targets];
  scene?.traverse((o) => {
    const l = o as THREE.Light & { shadow?: { map?: THREE.WebGLRenderTarget | null } };
    if (l.isLight && l.shadow?.map) all.push(l.shadow.map);
  });
  let bytes = 0;
  for (const rt of all) {
    if (!rt || seen.has(rt)) continue;
    seen.add(rt);
    bytes += targetBytes({ width: rt.width, height: rt.height, bpp: pixelBytes(rt.texture), samples: rt.samples, depthBuffer: rt.depthBuffer && !rt.depthTexture, depthTexture: !!rt.depthTexture });
  }
  return bytes;
}

/** One texture the scene draws with: what it is (its name, or what draws with it), its size and its bytes */
export interface TextureRow {
  what: string;
  size: string;
  bytes: number;
  /** Made at build time (GPU-compressed) or painted in the browser */
  kind: 'built' | 'painted' | 'image' | 'other';
  /** How many materials draw with it */
  users: number;
}
/**
 * Where the texture memory is, biggest first (`window.__mem().textures` under ?fps; the stability plan's Phase 4): a
 * row a texture, named by its own name or the first mesh drawing with it. For finding what to make smaller.
 */
export function textureRows(scene: THREE.Object3D): TextureRow[] {
  const rows = new Map<THREE.Texture, TextureRow>();
  const seenMats = new Set<THREE.Material>();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    const list = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
    for (const mat of list) {
      if (seenMats.has(mat)) continue;
      seenMats.add(mat);
      const found: THREE.Texture[] = [];
      for (const v of Object.values(mat)) if (v && (v as THREE.Texture).isTexture) found.push(v as THREE.Texture);
      const u = (mat as THREE.ShaderMaterial).uniforms;
      if (u) for (const { value } of Object.values(u)) if (value && (value as THREE.Texture).isTexture) found.push(value as THREE.Texture);
      for (const t of found) {
        const row = rows.get(t);
        if (row) {
          row.users++;
          continue;
        }
        let name = t.name;
        for (let p: THREE.Object3D | null = o; !name && p; p = p.parent) name = p.name;
        const img = t.image as { width?: number; height?: number } | null;
        const kind = (t as THREE.CompressedTexture).isCompressedTexture ? 'built' : (t as THREE.CanvasTexture).isCanvasTexture ? 'painted' : img && 'naturalWidth' in img ? 'image' : 'other';
        rows.set(t, { what: `${name || '?'} / ${mat.name || mat.type}`, size: `${img?.width ?? '?'}x${img?.height ?? '?'}`, bytes: textureBytes(t), kind, users: 1 });
      }
    }
  });
  return [...rows.values()].sort((a, b) => b.bytes - a.bytes);
}

export const mb = (bytes: number) => `${(bytes / 1048576).toFixed(bytes < 10 * 1048576 ? 1 : 0)} MB`;

/** One line of the breakdown: what holds the bytes */
export interface MemoryRow {
  /** What it is: the mesh's kind and name, and its material's name */
  what: string;
  bytes: number;
  /** For a batched mesh: the share of its buffers its pieces fill (the rest is room kept) */
  used?: number;
}

/**
 * Where the geometry memory is, biggest first (`window.__mem()` under ?fps): a row a geometry, named after the
 * mesh that draws it. For finding what to let go, not for the game.
 */
export function memoryRows(scene: THREE.Object3D): MemoryRow[] {
  const seen = new Set<THREE.BufferGeometry>();
  const rows: MemoryRow[] = [];
  const size = (g: THREE.BufferGeometry) => {
    const bufs = new Set<unknown>();
    let n = 0;
    for (const a of [...Object.values(g.attributes), g.index]) {
      if (!a) continue;
      const key = 'data' in a && a.data ? a.data : a;
      if (bufs.has(key)) continue;
      bufs.add(key);
      n += bytesOf('data' in a && a.data ? a.data : (a as THREE.BufferAttribute));
    }
    return n;
  };
  scene.traverse((o) => {
    const m = o as THREE.Mesh & Partial<THREE.InstancedMesh> & Partial<THREE.BatchedMesh>;
    if (!m.geometry) return;
    let bytes = (m.instanceMatrix ? bytesOf(m.instanceMatrix) : 0) + (m.instanceColor ? bytesOf(m.instanceColor) : 0);
    if (!seen.has(m.geometry)) {
      seen.add(m.geometry);
      bytes += size(m.geometry);
    }
    if (!bytes) return;
    const mat = Array.isArray(m.material) ? m.material[0] : m.material;
    const kind = m.isBatchedMesh ? 'batched' : m.isInstancedMesh ? 'instanced' : (m as unknown as THREE.SkinnedMesh).isSkinnedMesh ? 'skinned' : 'mesh';
    let p: THREE.Object3D | null = o;
    let name = '';
    while (p && !name) {
      name = p.name;
      p = p.parent;
    }
    const attrs = [...Object.entries(m.geometry.attributes), ['index', m.geometry.index] as const].map(([n, at]) => (at ? `${n}:${(at as THREE.BufferAttribute).array.constructor.name.replace('Array', '')}x${(at as THREE.BufferAttribute).itemSize}` : '')).join(' ');
    const row: MemoryRow = { what: `${kind} ${name || '?'} / ${mat?.name || mat?.type || '?'} [${attrs}]`, bytes };
    if (m.isBatchedMesh) {
      const b = m as unknown as { unusedVertexCount: number; maxVertexCount?: number; _maxVertexCount?: number };
      const max = b.maxVertexCount ?? b._maxVertexCount ?? 0;
      if (max) row.used = 1 - b.unusedVertexCount / max;
    }
    rows.push(row);
  });
  return rows.sort((a, b) => b.bytes - a.bytes);
}
