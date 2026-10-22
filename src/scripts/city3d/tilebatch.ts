/*
 * The city's fixed geometry, merged per tile (docs/growth-plan.md Phase 1).
 *
 * Every Batch built straight onto the scene (and onto the few fixed groups
 * passed in: the airport, the kart park) used to be merged into one mesh
 * per material for the whole map, so all of it was drawn in every pass,
 * wherever the camera looked. Now each material's triangles are split by
 * the tile (tiles.ts) their middle is in, and each tile's share becomes one
 * piece of a BatchedMesh: still one draw call per material, but three.js
 * draws only the pieces in view (and, for the shadow map, only those in the
 * sun's shadow box). The landmarks keep theirs (they lift on hover).
 *
 * Near and far (Phase 2): a Batch's details are marked near only (`Lod`,
 * `Batch.detail()`), and stand-ins far only; each tile's near and far pieces
 * are swapped together by the camera's distance from the tile (`update()`,
 * `isNear()` in tiles.ts), so a building's details go when it's too far
 * away to see them and come back before it's close.
 */
import * as THREE from 'three';
import { boxDistance, isNear, tileKey, tileOf, tileRect } from './tiles';
import type { Lod } from './kit';

/** What the merge made: the batched meshes, and how many tile pieces they hold */
export interface TileBatches {
  meshes: THREE.BatchedMesh[];
  pieces: number;
  /** How many pieces were drawn in the last frame's camera view (the ?fps readout) */
  drawn(): number;
  /** Swap each tile's near and far pieces for a camera at x, y, z: near within `far` of it */
  update(x: number, y: number, z: number, far: number): void;
  /** How many tiles are drawn near (the ?fps readout) */
  nearTiles(): number;
}

/** A tile with near or far pieces, and whether it's drawn near */
interface LodTile {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  top: number;
  near: boolean;
  pieces: { bm: THREE.BatchedMesh; id: number; lod: Lod }[];
}

/** The triangles of `g` whose middle falls in each tile, each as its own compact geometry */
function splitByTile(g: THREE.BufferGeometry): Map<string, THREE.BufferGeometry> {
  const pos = g.attributes.position;
  const index = g.index!.array;
  const tris = new Map<string, number[]>();
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t];
    const b = index[t + 1];
    const c = index[t + 2];
    const x = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3;
    const z = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;
    const [i, j] = tileOf(x, z);
    const k = tileKey(i, j);
    let list = tris.get(k);
    if (!list) tris.set(k, (list = []));
    list.push(a, b, c);
  }
  const out = new Map<string, THREE.BufferGeometry>();
  if (tris.size === 1) {
    out.set(tris.keys().next().value!, g);
    return out;
  }
  for (const [k, list] of tris) {
    // Only the vertices this tile's triangles use, renumbered
    const remap = new Map<number, number>();
    const idx = new Uint32Array(list.length);
    list.forEach((v, n) => {
      let m = remap.get(v);
      if (m === undefined) remap.set(v, (m = remap.size));
      idx[n] = m;
    });
    const part = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(g.attributes) as [string, THREE.BufferAttribute][]) {
      const size = attr.itemSize;
      const src = attr.array;
      const dst = new (src.constructor as new (n: number) => typeof src)(remap.size * size);
      for (const [from, to] of remap) for (let s = 0; s < size; s++) dst[to * size + s] = src[from * size + s];
      part.setAttribute(name, new THREE.BufferAttribute(dst, size, attr.normalized));
    }
    part.setIndex(new THREE.BufferAttribute(idx, 1));
    out.set(k, part);
  }
  return out;
}

/** The attributes a geometry carries, for grouping (a BatchedMesh needs the same ones on every piece) */
const shapeOf = (g: THREE.BufferGeometry) =>
  Object.entries(g.attributes)
    .map(([n, a]) => `${n}:${a.itemSize}`)
    .sort()
    .join(',');

/**
 * Merge the Batches built onto `parents` (`userData.batched` meshes) into
 * one BatchedMesh per material, layer and shadow setting, in tile pieces,
 * culled per piece. The meshes it takes are removed and freed.
 */
export function tileBatch(scene: THREE.Scene, parents: THREE.Object3D[]): TileBatches {
  scene.updateMatrixWorld(true);
  interface Set_ {
    mat: THREE.Material;
    layers: number;
    cast: boolean;
    receive: boolean;
    order: number;
    shape: string;
    pieces: Map<string, THREE.BufferGeometry[]>;
  }
  const sets = new Map<string, Set_>();
  const taken: THREE.Mesh[] = [];
  for (const parent of parents)
    for (const c of [...parent.children]) {
      const m = c as THREE.Mesh;
      if (!m.isMesh || !m.userData.batched || Array.isArray(m.material) || !m.visible || !m.geometry.index) continue;
      const g = m.geometry.clone().applyMatrix4(m.matrixWorld);
      const shape = shapeOf(g);
      const key = `${m.material.uuid}|${m.layers.mask}|${m.castShadow}|${m.receiveShadow}|${m.renderOrder}|${shape}`;
      let set = sets.get(key);
      if (!set) sets.set(key, (set = { mat: m.material, layers: m.layers.mask, cast: m.castShadow, receive: m.receiveShadow, order: m.renderOrder, shape, pieces: new Map() }));
      const lod: Lod = m.userData.lod ?? 'all';
      for (const [t, part] of splitByTile(g)) {
        const k = `${t}|${lod}`;
        let list = set.pieces.get(k);
        if (!list) set.pieces.set(k, (list = []));
        list.push(part);
      }
      taken.push(m);
    }
  const meshes: THREE.BatchedMesh[] = [];
  const lodTiles = new Map<string, LodTile>();
  let pieces = 0;
  for (const set of sets.values()) {
    // One geometry a tile (and level)
    const keys = [...set.pieces.keys()];
    const tiles = [...set.pieces.values()].map((list) => {
      if (list.length === 1) return list[0];
      const merged = mergeIndexed(list);
      for (const g of list) g.dispose();
      return merged;
    });
    const verts = tiles.reduce((n, g) => n + g.attributes.position.count, 0);
    const indices = tiles.reduce((n, g) => n + g.index!.count, 0);
    const bm = new THREE.BatchedMesh(tiles.length, verts, indices, set.mat);
    // Opaque city geometry: no need to sort the pieces every frame
    bm.sortObjects = false;
    bm.perObjectFrustumCulled = true;
    tiles.forEach((g, n) => {
      const id = bm.addInstance(bm.addGeometry(g));
      const [t, lod] = keys[n].split('|') as [string, Lod];
      if (lod !== 'all') {
        // Near and far pieces of a tile swap together; it starts near
        let lt = lodTiles.get(t);
        if (!lt) {
          const [i, j] = t.split(',').map(Number);
          const [x0, z0, x1, z1] = tileRect(i, j);
          lodTiles.set(t, (lt = { x0, z0, x1, z1, top: 0, near: true, pieces: [] }));
        }
        g.computeBoundingBox();
        lt.top = Math.max(lt.top, g.boundingBox!.max.y);
        lt.pieces.push({ bm, id, lod });
        if (lod === 'far') bm.setVisibleAt(id, false);
      }
      g.dispose();
    });
    bm.castShadow = set.cast;
    bm.receiveShadow = set.receive;
    bm.layers.mask = set.layers;
    bm.renderOrder = set.order;
    bm.userData.tiled = true;
    bm.computeBoundingBox();
    bm.computeBoundingSphere();
    scene.add(bm);
    meshes.push(bm);
    pieces += tiles.length;
  }
  for (const m of taken) {
    m.removeFromParent();
    m.geometry.dispose();
  }
  return {
    meshes,
    pieces,
    drawn: () => meshes.reduce((n, m) => n + (m as unknown as { _multiDrawCount: number })._multiDrawCount, 0),
    update(x, y, z, far) {
      for (const t of lodTiles.values()) {
        const near = isNear(boxDistance(x, y, z, t.x0, 0, t.z0, t.x1, t.top, t.z1), far, t.near);
        if (near === t.near) continue;
        t.near = near;
        for (const p of t.pieces) p.bm.setVisibleAt(p.id, p.lod === 'near' ? near : !near);
      }
    },
    nearTiles: () => [...lodTiles.values()].filter((t) => t.near).length,
  };
}

/** Indexed geometries with the same attributes, one after another */
function mergeIndexed(list: THREE.BufferGeometry[]) {
  const out = new THREE.BufferGeometry();
  const verts = list.reduce((n, g) => n + g.attributes.position.count, 0);
  const total = list.reduce((n, g) => n + g.index!.count, 0);
  for (const [name, ref] of Object.entries(list[0].attributes) as [string, THREE.BufferAttribute][]) {
    const dst = new (ref.array.constructor as new (n: number) => THREE.TypedArray)(verts * ref.itemSize);
    let at = 0;
    for (const g of list) {
      const a = g.attributes[name] as THREE.BufferAttribute;
      dst.set(a.array as ArrayLike<number>, at);
      at += a.array.length;
    }
    out.setAttribute(name, new THREE.BufferAttribute(dst, ref.itemSize, ref.normalized));
  }
  const idx = new Uint32Array(total);
  let at = 0;
  let base = 0;
  for (const g of list) {
    const src = g.index!.array;
    for (let i = 0; i < src.length; i++) idx[at + i] = src[i] + base;
    at += src.length;
    base += g.attributes.position.count;
  }
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

