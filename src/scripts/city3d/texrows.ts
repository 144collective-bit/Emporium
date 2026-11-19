/*
 * Where the texture memory is, texture by texture (`window.__mem().textureRows` under ?fps; docs/stability-plan.md
 * Phase 4). Its own chunk, loaded only with ?fps or ?bench (index.ts), so the start-up code doesn't carry it
 * (`bootJs` in scripts/budget.mjs).
 */
import * as THREE from 'three';
import { textureBytes } from './perf';

/** One texture of the breakdown: its size, what holds it and how often */
export interface TextureRow {
  /** The first mesh drawing with it (its name, or its nearest named parent's), the material's slot, and where it stands */
  what: string;
  bytes: number;
  /** Width x height, and whether it's compressed (made at build time) or painted in the browser */
  size: string;
  /** Materials using it */
  uses: number;
}

/**
 * Where the texture memory is, biggest first (`window.__mem().textureRows` under ?fps; docs/stability-plan.md
 * Phase 4): a row a texture the scene draws with. For finding what to draw smaller, not for the game.
 */
export function textureRows(scene: THREE.Object3D): TextureRow[] {
  const rows = new Map<THREE.Texture, TextureRow>();
  const seenMats = new Set<THREE.Material>();
  const at = new THREE.Vector3();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.material) return;
    let p: THREE.Object3D | null = o;
    let name = '';
    while (p && !name) {
      name = p.name;
      p = p.parent;
    }
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      const first = !seenMats.has(mat);
      seenMats.add(mat);
      const slots: [string, unknown][] = [...Object.entries(mat), ...Object.entries((mat as THREE.ShaderMaterial).uniforms ?? {}).map(([k, u]) => [k, (u as { value: unknown }).value] as [string, unknown])];
      for (const [slot, v] of slots) {
        const t = v as THREE.Texture;
        if (!t?.isTexture) continue;
        const row = rows.get(t);
        if (row) {
          if (first) row.uses++;
          continue;
        }
        const img = t.image as { width?: number; height?: number } | null;
        const kind = (t as THREE.CompressedTexture).isCompressedTexture ? 'built' : (t as THREE.DataTexture).isDataTexture ? 'data' : 'painted';
        o.getWorldPosition(at);
        rows.set(t, { what: `${t.name ? `«${t.name}» ` : ''}${name || '?'} / ${mat.name || mat.type}.${slot} @ ${at.x.toFixed(0)},${at.y.toFixed(0)},${at.z.toFixed(0)}`, bytes: textureBytes(t), size: `${img?.width ?? '?'}x${img?.height ?? '?'} ${kind}`, uses: 1 });
      }
    }
  });
  return [...rows.values()].sort((a, b) => b.bytes - a.bytes);
}
