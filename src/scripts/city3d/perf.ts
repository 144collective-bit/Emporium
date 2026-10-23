/*
 * What the city holds in memory, for the ?fps readout and the benchmark
 * (docs/growth-plan.md Phase 0): the bytes of every geometry and texture the
 * scene draws, counted once each however many meshes share them. An
 * estimate (the GPU pads and may keep copies), but the same estimate every
 * time, so it shows what a change costs.
 */
import * as THREE from 'three';

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

export const mb = (bytes: number) => `${(bytes / 1048576).toFixed(bytes < 10 * 1048576 ? 1 : 0)} MB`;
