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
 *
 * Building as you go (Phase 3): sites built after the boot (tilework.ts)
 * join the same meshes (`add()`; a mesh grows when it's full, after taking
 * back the room let go), and a tile far away can let go of its sites' near
 * pieces in the shared materials (`release()`): it's drawn in its far form
 * until they're built again (`add()` with `keep`).
 */
import * as THREE from 'three';
import { TILE, boxDistance, isNear, tileKey, tileRect } from './tiles';
import type { Lod } from './kit';

/** One tile's share of one material: a geometry and its one instance in a batched mesh */
interface Piece {
  set: MatSet;
  geo: number;
  id: number;
  lod: Lod;
  /** Which site built it ('' for the boot's monolithic builders): only a site's pieces can be let go */
  site: string;
  bytes: number;
}

/** A tile with pieces: whether it's drawn near, and whether it let its near pieces go */
interface Tile {
  key: string;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  top: number;
  near: boolean;
  /** It has near or far pieces to swap */
  lod: boolean;
  /** Its sites' near pieces were let go: drawn far until they're built again */
  released: boolean;
  /** Past the haze (phones, on the ground): every piece its sites drew in the shared materials was let go */
  gone: boolean;
  pieces: Piece[];
  /** The sites that drew into it */
  sites: Set<string>;
  /** The sites whose near pieces it let go (to run again) */
  lost: Set<string>;
}

/** A batched mesh and what decides which meshes may join it */
interface MatSet {
  bm: THREE.BatchedMesh;
  /** Pieces deleted since the last `optimize()` (their room can be taken back) */
  holes: number;
}

/** What the merge made: the batched meshes, and how many tile pieces they hold */
export interface TileBatches {
  meshes: THREE.BatchedMesh[];
  /** How many tile pieces they hold */
  pieces(): number;
  /** How many pieces were drawn in the last frame's camera view (the ?fps readout) */
  drawn(): number;
  /** Swap each tile's near and far pieces for a camera at x, y, z: near within `far` of it */
  update(x: number, y: number, z: number, far: number): void;
  /** How many tiles are drawn near (the ?fps readout) */
  nearTiles(): number;
  /**
   * Merge Batches built later onto `parents` (a site, `site` its name), as
   * at the boot. `keep` picks which tiles' and levels' pieces are kept
   * (building a tile's near pieces again). Returns the batched meshes it
   * made (new materials), to compile.
   */
  add(parents: THREE.Object3D[], opts?: { site?: string; keep?: (tile: string, lod: Lod) => boolean }): THREE.BatchedMesh[];
  /** Let a tile's sites' near pieces in the shared materials go; the bytes freed */
  release(tile: string): number;
  /** Mark a tile's near pieces built again */
  restored(tile: string): void;
  /** The tiles holding near pieces that could be let go, and those that let them go */
  /** What the pieces held take, by level and whether they can be let go (for the ?fps console) */
  bytesBy(): Record<string, number>;
  held(x: number, y: number, z: number): { key: string; d: number; bytes: number; near: boolean; released: boolean; all: number; gone: boolean }[];
  /**
   * Let go of everything a tile's sites drew in the shared materials, at every level (a tile past the haze on a
   * phone: tileplan.ts `toVanish()`); nothing of them is drawn until the sites run again. Returns the bytes freed
   */
  vanish(tile: string): number;
  /**
   * Give back the room let go: each mesh with holes packs its pieces together and, where that leaves a fair share
   * of it empty (`TRIM`), is made again the size of what it holds and `ROOM`. Returns the bytes given back. It
   * copies every mesh it shrinks, so call it now and then, not every frame
   */
  trim(): number;
  /** A tile's pieces drawn at every distance and its far ones were built again (its near ones are still let go) */
  regained(tile: string): void;
  /** The sites whose near pieces a tile let go */
  lostSites(tile: string): string[];
  /** Bytes of near pieces that could be let go, held now */
  heldBytes(): number;
}

/**
 * The triangles of `g` whose middle falls in each tile, each as its own compact geometry (the tiles in the order
 * their first triangle comes, each tile's vertices in the order its triangles use them). Every site that joins the
 * city comes through here, so it reads the arrays themselves and keys the tiles by number, where it
 * went through the accessors, a string a triangle and a map of vertices: about a third of the time over many tiles, an eighth for one
 */
/** Triangles left out of the city because a corner wasn't a finite number (`splitByTile()`; ?fps and the smoke test read it) */
export const DROPPED = { tris: 0 };
/** The sites that have warned about it (once each) */
const warned = new Set<string>();
export function splitByTile(g: THREE.BufferGeometry): Map<string, THREE.BufferGeometry> {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const index = g.index!.array;
  const plain = !(pos as unknown as { isInterleavedBufferAttribute?: boolean }).isInterleavedBufferAttribute && pos.itemSize === 3;
  const pa = pos.array;
  // A tile as one number (its indices offset to stay positive: the world is a few dozen tiles across)
  const OFF = 1 << 15;
  const n = index.length / 3;
  // Each triangle's tile first: most of what comes is all in one tile, and goes back as it is
  const keys = new Float64Array(n);
  let one = true;
  // (a triangle with a corner that isn't a number, or is infinite, is left out: on a GPU it can write NaN pixels,
  // which the bloom spreads over the screen as black; `DROPPED` counts them, docs/stability-plan.md)
  let bad = 0;
  for (let t = 0; t < n; t++) {
    const a = index[t * 3];
    const b = index[t * 3 + 1];
    const c = index[t * 3 + 2];
    const x = plain ? pa[a * 3] + pa[b * 3] + pa[c * 3] : pos.getX(a) + pos.getX(b) + pos.getX(c);
    const y = plain ? pa[a * 3 + 1] + pa[b * 3 + 1] + pa[c * 3 + 1] : pos.getY(a) + pos.getY(b) + pos.getY(c);
    const z = plain ? pa[a * 3 + 2] + pa[b * 3 + 2] + pa[c * 3 + 2] : pos.getZ(a) + pos.getZ(b) + pos.getZ(c);
    if (!Number.isFinite(x + y + z)) {
      keys[t] = NaN;
      bad++;
      one = false;
      continue;
    }
    const k = (keys[t] = (Math.floor(x / 3 / TILE) + OFF) * 65536 + Math.floor(z / 3 / TILE) + OFF);
    if (k !== keys[0]) one = false;
  }
  DROPPED.tris += bad;
  const tris = new Map<number, number[]>();
  if (one) tris.set(keys[0], []);
  else {
    let lastKey = NaN;
    let last: number[] | undefined;
    for (let t = 0; t < n; t++) {
      const k = keys[t];
      if (k !== k) continue;
      if (k !== lastKey) {
        lastKey = k;
        last = tris.get(k);
        if (!last) tris.set(k, (last = []));
      }
      last!.push(index[t * 3], index[t * 3 + 1], index[t * 3 + 2]);
    }
  }
  const name = (k: number) => tileKey(Math.floor(k / 65536) - OFF, (k % 65536) - OFF);
  const out = new Map<string, THREE.BufferGeometry>();
  if (tris.size === 1 && !bad) {
    out.set(name(tris.keys().next().value!), g);
    return out;
  }
  const attrs = Object.entries(g.attributes) as [string, THREE.BufferAttribute][];
  // Where each vertex goes in the tile being made (-1: not used yet), put back after each tile
  const to = new Int32Array(pos.count).fill(-1);
  for (const [k, list] of tris) {
    // Only the vertices this tile's triangles use, renumbered in the order they come
    const idx = new Uint32Array(list.length);
    const from: number[] = [];
    for (let n = 0; n < list.length; n++) {
      const v = list[n];
      let m = to[v];
      if (m < 0) {
        m = to[v] = from.length;
        from.push(v);
      }
      idx[n] = m;
    }
    const part = new THREE.BufferGeometry();
    for (const [attr_name, attr] of attrs) {
      const size = attr.itemSize;
      const src = attr.array;
      const dst = new (src.constructor as new (n: number) => typeof src)(from.length * size);
      for (let n = 0; n < from.length; n++) {
        const f = from[n] * size;
        const d = n * size;
        for (let q = 0; q < size; q++) dst[d + q] = src[f + q];
      }
      part.setAttribute(attr_name, new THREE.BufferAttribute(dst, size, attr.normalized));
    }
    part.setIndex(new THREE.BufferAttribute(idx, 1));
    out.set(name(k), part);
    for (const v of from) to[v] = -1;
  }
  return out;
}

/** The attributes a geometry carries, for grouping (a BatchedMesh needs the same ones on every piece) */
const shapeOf = (g: THREE.BufferGeometry) =>
  Object.entries(g.attributes)
    .map(([n, a]) => `${n}:${a.itemSize}`)
    .sort()
    .join(',');

/** What a geometry takes in memory */
const bytesOf = (g: THREE.BufferGeometry) =>
  Object.values(g.attributes).reduce((n, a) => n + (a as THREE.BufferAttribute).array.byteLength, 0) + (g.index ? g.index.count * 4 : 0);

/**
 * A piece's vertices packed smaller before they go in a batched mesh (the phones' memory: performance-plan.md).
 * Normals as signed bytes (a 127th of a unit: half a degree, under anything the toon shading or the ink's normal
 * pass can tell apart) in place of three floats, and the shared paint's colours, which are all 0 to 1, as 16-bit
 * shares in place of three floats: 29 bytes a vertex where there were 44. Both are `normalized`, so the shaders
 * read the same numbers as before. Every piece of a material goes through here, so a mesh's pieces always match.
 */
/** Colour values past 0 to 1 the packing had to clamp (none expected: a check for the ?fps console) */
export const PACKED = { clamped: 0 };
export function compact(g: THREE.BufferGeometry, paint: boolean) {
  const n = g.attributes.normal as THREE.BufferAttribute | undefined;
  if (n && n.array instanceof Float32Array) {
    const src = n.array;
    const dst = new Int8Array(src.length);
    for (let i = 0; i < src.length; i++) dst[i] = Math.round(Math.max(-1, Math.min(1, src[i])) * 127);
    g.setAttribute('normal', new THREE.BufferAttribute(dst, 3, true));
  }
  const c = g.attributes.color as THREE.BufferAttribute | undefined;
  if (paint && c && c.array instanceof Float32Array) {
    const src = c.array;
    const dst = new Uint16Array(src.length);
    for (let i = 0; i < src.length; i++) {
      if (src[i] < -1e-4 || src[i] > 1 + 1e-4) PACKED.clamped++;
      dst[i] = Math.round(Math.max(0, Math.min(1, src[i])) * 65535);
    }
    g.setAttribute('color', new THREE.BufferAttribute(dst, c.itemSize, true));
  }
  return g;
}

/** How much room a batched mesh is made with past what it holds, so sites built later mostly fit */
const ROOM = 1.25;
/** A mesh is made smaller only when what it holds (and `ROOM`) is under this share of it */
const TRIM = 0.8;

/**
 * Merge the Batches built onto `parents` (`userData.batched` meshes) into
 * one BatchedMesh per material, layer and shadow setting, in tile pieces,
 * culled per piece. The meshes it takes are removed and freed.
 */
export function tileBatch(scene: THREE.Scene, parents: THREE.Object3D[]): TileBatches {
  const sets = new Map<string, MatSet>();
  const tiles = new Map<string, Tile>();
  const meshes: THREE.BatchedMesh[] = [];
  // Where the camera was at the last update (pieces added later start as their tile is drawn)
  const cam = { x: 0, y: 0, z: 0, far: Infinity, set: false };

  const tileOfKey = (t: string) => {
    let tile = tiles.get(t);
    if (!tile) {
      const [i, j] = t.split(',').map(Number);
      const [x0, z0, x1, z1] = tileRect(i, j);
      tiles.set(t, (tile = { key: t, x0, z0, x1, z1, top: 0, near: true, lod: false, released: false, gone: false, pieces: [], sites: new Set(), lost: new Set() }));
    }
    return tile;
  };
  const shown = (tile: Tile, lod: Lod) => (lod === 'all' ? true : lod === 'near' ? tile.near : !tile.near);
  const nearOf = (t: Tile) => !t.released && isNear(boxDistance(cam.x, cam.y, cam.z, t.x0, 0, t.z0, t.x1, t.top, t.z1), cam.far, t.near);

  function add(list: THREE.Object3D[], opts: { site?: string; keep?: (tile: string, lod: Lod) => boolean } = {}) {
    for (const p of list) p.updateWorldMatrix(true, true);
    // Each material set's new tile pieces
    interface Incoming {
      key: string;
      site: string;
      mat: THREE.Material;
      layers: number;
      cast: boolean;
      receive: boolean;
      order: number;
      pieces: Map<string, THREE.BufferGeometry[]>;
    }
    const incoming = new Map<string, Incoming>();
    const taken: THREE.Mesh[] = [];
    for (const parent of list) {
      // (a site's group carries its name: the boot merges the sites round the home view with the rest)
      const site: string = opts.site ?? parent.userData.site ?? '';
      for (const c of [...parent.children]) {
        const m = c as THREE.Mesh;
        if (!m.isMesh || !m.userData.batched || Array.isArray(m.material) || !m.visible || !m.geometry.index) continue;
        taken.push(m);
        const lod: Lod = m.userData.lod ?? 'all';
        // Building near pieces again: only the shared materials' (the only ones let go)
        if (opts.keep && !m.material.userData.shared) continue;
        const g = compact(m.geometry.clone().applyMatrix4(m.matrixWorld), !!m.material.userData.paint);
        const key = `${m.material.uuid}|${m.layers.mask}|${m.castShadow}|${m.receiveShadow}|${m.renderOrder}|${shapeOf(g)}`;
        const k2 = `${key}|${site}`;
        let inc = incoming.get(k2);
        if (!inc) incoming.set(k2, (inc = { key, site, mat: m.material, layers: m.layers.mask, cast: m.castShadow, receive: m.receiveShadow, order: m.renderOrder, pieces: new Map() }));
        const was = DROPPED.tris;
        const parts = splitByTile(g);
        if (DROPPED.tris > was && !warned.has(site)) {
          warned.add(site);
          console.warn(`[city] left out ${DROPPED.tris - was} triangles with NaN corners (site "${site || 'boot'}", ${m.material.name || m.material.type})`);
        }
        for (const [t, part] of parts) {
          if (opts.keep && !opts.keep(t, lod)) {
            part.dispose();
            continue;
          }
          const k = `${t}|${lod}`;
          let pl = inc.pieces.get(k);
          if (!pl) inc.pieces.set(k, (pl = []));
          pl.push(part);
        }
      }
    }
    const made: THREE.BatchedMesh[] = [];
    // Each material's new pieces, all sites together (a new mesh is made the size of all of them)
    const need = new Map<string, { count: number; verts: number; indices: number }>();
    for (const inc of incoming.values())
      for (const pl of inc.pieces.values()) {
        const n = need.get(inc.key) ?? { count: 0, verts: 0, indices: 0 };
        n.count++;
        for (const g of pl) {
          n.verts += g.attributes.position.count;
          n.indices += g.index!.count;
        }
        need.set(inc.key, n);
      }
    const grown = new Set<string>();
    const touched = new Set<MatSet>();
    for (const inc of incoming.values()) {
      if (!inc.pieces.size) continue;
      const site = inc.site;
      // One geometry a tile (and level)
      const keys = [...inc.pieces.keys()];
      const geos = [...inc.pieces.values()].map((pl) => {
        if (pl.length === 1) return pl[0];
        const merged = mergeIndexed(pl);
        for (const g of pl) g.dispose();
        return merged;
      });
      let set = sets.get(inc.key);
      const all = need.get(inc.key)!;
      if (!set) {
        // A new material: its own batched mesh, with room to grow (only past the boot, where more may come)
        const room = cam.set ? ROOM : 1;
        const bm = new THREE.BatchedMesh(Math.ceil(all.count * room), Math.ceil(all.verts * room), Math.ceil(all.indices * room), inc.mat);
        // Opaque city geometry: no need to sort the pieces every frame
        bm.sortObjects = false;
        bm.perObjectFrustumCulled = true;
        bm.castShadow = inc.cast;
        bm.receiveShadow = inc.receive;
        bm.layers.mask = inc.layers;
        bm.renderOrder = inc.order;
        bm.userData.tiled = true;
        sets.set(inc.key, (set = { bm, holes: 0 }));
        scene.add(bm);
        meshes.push(bm);
        made.push(bm);
        grown.add(inc.key);
      } else if (!grown.has(inc.key)) {
        fit(set, all.count, all.verts, all.indices);
        grown.add(inc.key);
      }
      touched.add(set);
      const bm = set.bm;
      geos.forEach((g, n) => {
        // (its box first: the batched mesh keeps a copy for culling the piece, rather than working it out)
        g.computeBoundingBox();
        const geo = bm.addGeometry(g);
        const id = bm.addInstance(geo);
        const [t, lod] = keys[n].split('|') as [string, Lod];
        const tile = tileOfKey(t);
        if (site) tile.sites.add(site);
        // The mesh's bounds grow with each piece (working them out again from every piece, each site,
        // was two thirds of the time a site took to join)
        if (bm.boundingBox) bm.boundingBox.union(g.boundingBox!);
        else bm.boundingBox = g.boundingBox!.clone();
        if (lod !== 'all') {
          tile.top = Math.max(tile.top, g.boundingBox!.max.y);
          if (!tile.lod) {
            tile.lod = true;
            if (cam.set) tile.near = nearOf(tile);
          }
        }
        tile.pieces.push({ set: set!, geo, id, lod, site, bytes: bytesOf(g) });
        if (!shown(tile, lod)) bm.setVisibleAt(id, false);
        g.dispose();
      });
    }
    for (const { bm } of touched) bm.boundingBox!.getBoundingSphere((bm.boundingSphere ??= new THREE.Sphere()));
    for (const m of taken) {
      m.removeFromParent();
      m.geometry.dispose();
    }
    return made;
  }

  /** Make room in a set's mesh for `count` more pieces of `verts` vertices and `indices` indices */
  function fit(set: MatSet, count: number, verts: number, indices: number) {
    const bm = set.bm;
    if ((bm.unusedVertexCount < verts || bm.unusedIndexCount < indices) && set.holes) {
      // Take back the room let go first
      bm.optimize();
      set.holes = 0;
    }
    const fields = bm as unknown as { _maxVertexCount: number; _maxIndexCount: number };
    if (bm.unusedVertexCount < verts || bm.unusedIndexCount < indices) {
      const usedV = fields._maxVertexCount - bm.unusedVertexCount;
      const usedI = fields._maxIndexCount - bm.unusedIndexCount;
      bm.setGeometrySize(Math.ceil((usedV + verts) * ROOM), Math.ceil((usedI + indices) * ROOM));
    }
    if (bm.instanceCount + count > bm.maxInstanceCount) bm.setInstanceCount(Math.ceil((bm.instanceCount + count) * ROOM));
  }

  const evictable = (p: Piece) => p.lod === 'near' && p.site !== '' && !!p.set.bm.material && !!(p.set.bm.material as THREE.Material).userData.shared;

  /** What a tile past the haze lets go: everything a site drew in the shared materials, whatever its level */
  const losable = (p: Piece) => p.site !== '' && !!(p.set.bm.material as THREE.Material)?.userData.shared;

  add(parents);
  return {
    meshes,
    pieces: () => meshes.reduce((n, m) => n + m.instanceCount, 0),
    drawn: () => meshes.reduce((n, m) => n + (m as unknown as { _multiDrawCount: number })._multiDrawCount, 0),
    update(x, y, z, far) {
      Object.assign(cam, { x, y, z, far, set: true });
      for (const t of tiles.values()) {
        if (!t.lod) continue;
        const near = nearOf(t);
        if (near === t.near) continue;
        t.near = near;
        for (const p of t.pieces) if (p.lod !== 'all') p.set.bm.setVisibleAt(p.id, shown(t, p.lod));
      }
    },
    nearTiles: () => [...tiles.values()].filter((t) => t.lod && t.near).length,
    add,
    release(key) {
      const t = tiles.get(key);
      if (!t || t.released || t.near) return 0;
      let freed = 0;
      t.pieces = t.pieces.filter((p) => {
        if (!evictable(p)) return true;
        p.set.bm.deleteGeometry(p.geo);
        p.set.holes++;
        t.lost.add(p.site);
        freed += p.bytes;
        return false;
      });
      if (freed) t.released = true;
      return freed;
    },
    vanish(key) {
      const t = tiles.get(key);
      // (a tile with nothing to swap is never marked near or far: its distance is the caller's business)
      if (!t || t.gone || (t.lod && t.near)) return 0;
      let freed = 0;
      t.pieces = t.pieces.filter((p) => {
        if (!losable(p)) return true;
        p.set.bm.deleteGeometry(p.geo);
        p.set.holes++;
        t.lost.add(p.site);
        freed += p.bytes;
        return false;
      });
      if (freed) t.gone = t.released = true;
      return freed;
    },
    trim() {
      let back = 0;
      const size = (g: THREE.BufferGeometry) => bytesOf(g) - (g.index ? g.index.count * 4 : 0) + (g.index ? (g.index.array as Uint32Array).byteLength : 0);
      for (const set of sets.values()) {
        if (!set.holes) continue;
        const bm = set.bm;
        const f = bm as unknown as { _maxVertexCount: number; _maxIndexCount: number };
        bm.optimize();
        set.holes = 0;
        const v = Math.max(1, Math.ceil((f._maxVertexCount - bm.unusedVertexCount) * ROOM));
        const i = Math.max(1, Math.ceil((f._maxIndexCount - bm.unusedIndexCount) * ROOM));
        if (v > f._maxVertexCount * TRIM && i > f._maxIndexCount * TRIM) continue;
        const before = size(bm.geometry);
        bm.setGeometrySize(Math.min(v, f._maxVertexCount), Math.min(i, f._maxIndexCount));
        back += before - size(bm.geometry);
      }
      return back;
    },
    regained(key) {
      const t = tiles.get(key);
      if (t) t.gone = false;
    },
    restored(key) {
      const t = tiles.get(key);
      if (!t) return;
      t.released = false;
      t.lost.clear();
    },
    held(x, y, z) {
      const out: { key: string; d: number; bytes: number; near: boolean; released: boolean; all: number; gone: boolean }[] = [];
      for (const t of tiles.values()) {
        if (!t.sites.size) continue;
        const bytes = t.pieces.reduce((n, p) => n + (evictable(p) ? p.bytes : 0), 0);
        const all = t.pieces.reduce((n, p) => n + (losable(p) ? p.bytes : 0), 0);
        if (!bytes && !all && !t.released) continue;
        out.push({ key: t.key, d: boxDistance(x, y, z, t.x0, 0, t.z0, t.x1, t.top, t.z1), bytes, near: t.lod && t.near, released: t.released, all, gone: t.gone });
      }
      return out;
    },
    bytesBy: () => {
      const out: Record<string, number> = {};
      for (const t of tiles.values()) for (const p of t.pieces) {
        const k = `${p.lod}${evictable(p) ? ' evictable' : p.site ? ' site' : ' boot'}`;
        out[k] = (out[k] ?? 0) + p.bytes;
      }
      return out;
    },
    lostSites: (key) => [...(tiles.get(key)?.lost ?? [])],
    heldBytes: () => {
      let n = 0;
      for (const t of tiles.values()) for (const p of t.pieces) if (evictable(p)) n += p.bytes;
      return n;
    },
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
