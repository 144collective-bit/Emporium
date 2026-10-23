/*
 * Sites built off the main thread (performance phase 4, item 9 in
 * docs/performance-plan.md).
 *
 * A site (tilework.ts) is a piece of the fixed city drawn from data into
 * Batches, the same every time it runs. Here a worker builds them, and the
 * main thread only joins what comes back into the tile meshes.
 *
 * The worker imports the city's own chunk (already in the browser's cache:
 * nothing more to download) and registers the same sites the boot does: The
 * Trenches' (its builders, called as the boot calls them) and every tile's
 * trees and lamps (from the main thread's own list of them, `placed()`). A
 * site comes back as each of its meshes' arrays and its material's name
 * (`siteMat()` in kit.ts), and the main thread draws it with its own
 * material of that name. A site the worker can't send (a material with no
 * name) or the main thread can't draw (a name it hasn't made yet) is built
 * on the main thread instead: slower, never wrong. The airport's and the kart
 * park's few sites stay on the main thread (their builders do much more), and
 * so does anything wanted at once (`want()`, the boot, building near pieces
 * again). The worker closes once every site is built.
 */
import * as THREE from 'three';
import { initFarCars } from './cars';
import { siteMatOf } from './kit';
import { takeSites } from './tilework';
import { buildLamps, buildTrees, usePlaced, type Placed } from './world';
import { buildTrenches } from './trenches3d';
import { buildProjects } from './projects3d';
import { buildCommons } from './commons3d';
import { buildGrit } from './grit3d';
import { buildStreetWalls } from './streetwall3d';
import { buildRiverside } from './riverside3d';
import { buildWaterfront } from './waterfront3d';

export interface SiteInit {
  low: boolean;
  placed: Placed;
}

/** One of a built site's meshes, as arrays */
interface SentMesh {
  key: string;
  matrix: number[];
  layers: number;
  cast: boolean;
  receive: boolean;
  order: number;
  lod?: string;
  attrs: [name: string, array: Float32Array | Uint16Array | Uint32Array, size: number, normalized: boolean][];
  index: Uint16Array | Uint32Array;
}
/** A site the worker built (`meshes` null: it couldn't send it, so the main thread builds it) */
export interface BuiltSite {
  id: string;
  meshes: SentMesh[] | null;
}
type FromWorker = { ready: string[]; loaded?: string } | { failed: string } | BuiltSite;

interface Scope {
  postMessage(m: unknown, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent<{ id: string } | { load: string }>) => void) | null;
}

/** A district's module, loaded as you approach (districts.ts): it registers its sites (and on the main thread the rest of it) */
export interface DistrictModule {
  /** Its own address, for the site worker to load it too */
  SELF: string;
  register(opts: { low: boolean; scene: THREE.Scene | null }): void;
}

/** In the worker: register the sites, then build each one when it's asked for */
export function serveSites(scope: Scope, init: SiteInit) {
  // The boot's own builders, in its order (what they make besides sites stays here, unused)
  const scene = new THREE.Scene();
  // (the parked cars go into the far cars' mesh, made first at the boot)
  initFarCars(scene, 400, init.low);
  buildTrenches();
  buildProjects(init.low);
  buildCommons(scene, [], { low: init.low });
  buildGrit(scene, [], { low: init.low });
  buildStreetWalls(scene, [], { low: init.low });
  buildRiverside(init.low);
  buildWaterfront(init.low);
  // (the trees and lamps every builder placed: the main thread's list, not these builders' few)
  usePlaced(init.placed);
  buildTrees(init.low);
  buildLamps(scene, init.low);
  const sites = new Map(takeSites().map((s) => [s.id, s]));
  scope.onmessage = (e) => {
    // A district loaded as you approach (districts.ts): its module, and the sites it registers
    if ('load' in e.data) {
      const url = e.data.load;
      import(/* @vite-ignore */ url)
        .then((m: DistrictModule) => {
          m.register({ low: init.low, scene: null });
          const more = takeSites();
          for (const s of more) sites.set(s.id, s);
          scope.postMessage({ ready: more.map((s) => s.id), loaded: url });
        })
        .catch(() => scope.postMessage({ ready: [], loaded: url }));
      return;
    }
    const { id } = e.data;
    const s = sites.get(id);
    if (!s) return scope.postMessage({ id, meshes: null });
    const g = new THREE.Group();
    s.build(g);
    g.updateMatrixWorld(true);
    const meshes: SentMesh[] = [];
    const transfer = new Set<ArrayBuffer>();
    // What the tile meshes take (tilebatch.ts `add()`): the rest of what a site makes is let go anyway
    for (const c of g.children) {
      const m = c as THREE.Mesh;
      if (!m.isMesh || !m.userData.batched || Array.isArray(m.material) || !m.visible || !m.geometry.index) continue;
      const key = (m.material as THREE.Material).userData.siteKey as string | undefined;
      if (!key) return scope.postMessage({ id, meshes: null });
      const attrs: SentMesh['attrs'] = [];
      for (const [name, a] of Object.entries(m.geometry.attributes)) {
        if ((a as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute) return scope.postMessage({ id, meshes: null });
        const attr = a as THREE.BufferAttribute;
        // (an array two meshes share goes once as itself, then as a copy)
        const array = transfer.has(attr.array.buffer as ArrayBuffer) ? attr.array.slice() : attr.array;
        transfer.add(array.buffer as ArrayBuffer);
        attrs.push([name, array as SentMesh['attrs'][number][1], attr.itemSize, attr.normalized]);
      }
      const ix = m.geometry.index.array as Uint16Array | Uint32Array;
      const index = transfer.has(ix.buffer as ArrayBuffer) ? ix.slice() : ix;
      transfer.add(index.buffer as ArrayBuffer);
      meshes.push({ key, matrix: m.matrixWorld.toArray(), layers: m.layers.mask, cast: m.castShadow, receive: m.receiveShadow, order: m.renderOrder, lod: m.userData.lod, attrs, index });
    }
    scope.postMessage({ id, meshes }, [...transfer]);
  };
  scope.postMessage({ ready: [...sites.keys()] });
}

// The worker finds it here once it has imported the city's chunk (an export nobody imports is left out of the build)
(globalThis as { serveCitySites?: typeof serveSites }).serveCitySites = serveSites;

/** A built site's meshes again, with the main thread's materials (null: one it hasn't made, so it builds the site itself) */
export function meshesOf(b: BuiltSite): THREE.Group | null {
  const g = new THREE.Group();
  for (const s of b.meshes ?? []) {
    const mat = siteMatOf(s.key);
    if (!mat) return null;
    const geo = new THREE.BufferGeometry();
    for (const [name, array, size, normalized] of s.attrs) geo.setAttribute(name, new THREE.BufferAttribute(array, size, normalized));
    geo.setIndex(new THREE.BufferAttribute(s.index, 1));
    const m = new THREE.Mesh(geo, mat);
    m.matrixAutoUpdate = false;
    m.matrix.fromArray(s.matrix);
    m.layers.mask = s.layers;
    m.castShadow = s.cast;
    m.receiveShadow = s.receive;
    m.renderOrder = s.order;
    m.userData = { batched: true, lod: s.lod };
    g.add(m);
  }
  return g;
}

export interface SiteWorker {
  /** Whether it's ready, and which sites it builds */
  ready(): boolean;
  can(id: string): boolean;
  ask(id: string): void;
  /** Load a district's module too (its address), resolved once its sites are registered there (or it can't) */
  load(url: string): Promise<void>;
  /** The sites built since the last call */
  take(): BuiltSite[];
  close(): void;
}

/**
 * The worker, from the main thread: `chunk` is the city's own module (index.ts's `import.meta.url`), which
 * it imports. Null where there are no module workers; if it fails, it's never ready and the main thread
 * builds everything, as before.
 */
export function startSiteWorker(chunk: string, init: SiteInit): SiteWorker | null {
  if (typeof Worker === 'undefined') return null;
  const src = `self.onmessage = (e) => { self.onmessage = null; import(e.data.chunk).then(() => self.serveCitySites(self, e.data.init)).catch((err) => postMessage({ failed: String(err) })); };`;
  let w: Worker;
  try {
    w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })), { type: 'module' });
  } catch {
    return null;
  }
  let ids: Set<string> | null = null;
  let done: BuiltSite[] = [];
  let closed = false;
  const loading = new Map<string, () => void>();
  const close = () => {
    if (closed) return;
    closed = true;
    ids = null;
    w.terminate();
    for (const f of loading.values()) f();
    loading.clear();
  };
  w.onmessage = (e: MessageEvent<FromWorker>) => {
    const d = e.data;
    if ('ready' in d) {
      ids = new Set([...(ids ?? []), ...d.ready]);
      if (d.loaded) {
        loading.get(d.loaded)?.();
        loading.delete(d.loaded);
      }
    } else if ('failed' in d) close();
    else done.push(d);
  };
  w.onerror = () => close();
  w.postMessage({ chunk, init });
  return {
    ready: () => !!ids,
    can: (id) => !!ids?.has(id),
    ask: (id) => w.postMessage({ id }),
    load(url) {
      if (closed) return Promise.resolve();
      return new Promise((r) => {
        loading.set(url, r);
        w.postMessage({ load: url });
      });
    },
    take() {
      const out = done;
      done = [];
      return out;
    },
    close,
  };
}
