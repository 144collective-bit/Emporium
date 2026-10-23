/*
 * Districts loaded as you approach (performance phase 4, item 10 in
 * docs/performance-plan.md; built with the first district after it, Westlake
 * Park). A district's drawing is a module of its own, a chunk the boot never
 * downloads: it's loaded when what the camera looks at comes within the
 * tier's `far` and `LEAD` of the district's land, and it registers its sites
 * then (and, on the main thread, anything else it draws: the lake's water).
 * The site worker loads the same module and builds those sites too
 * (sitework.ts). Everything the rest of the city needs to know about it
 * (its blocks in the street plan, its solids, where its trees and lamps
 * stand) is DOM-free data in the boot already, so walking, driving, traffic
 * and the world map never wait for it.
 *
 * Once built, it's held like the rest of the city: its tiles' near pieces go
 * when far away and the near forms held pass the budget (tilework.ts).
 */
import type * as THREE from 'three';
import type { DistrictModule, SiteWorker } from './sitework';
import { rectDistance } from './tileplan';
import type { Rect } from './tiles';
import { WESTLAKE_RECT } from './westlake';

export interface LazyDistrict {
  id: string;
  /** Its land (x0, z0, x1, z1) */
  rect: Rect;
  load(): Promise<DistrictModule>;
}

export const LAZY_DISTRICTS: LazyDistrict[] = [{ id: 'westlake', rect: WESTLAKE_RECT, load: () => import('./westlake3d') }];

/** How far past the tier's `far` a district starts loading (time to download it and build what's nearest) */
export const LEAD = 90;

export interface Districts {
  /** Load any district within reach of what the camera looks at (x, z), every frame (cheap) */
  step(x: number, z: number, far: number): void;
  /** Load every district now (the benchmark: it measures the whole city) */
  all(): void;
  /** How many are loading, or within reach and not loaded yet */
  pending(): number;
  loaded(): string[];
}

export function createDistricts(opts: { scene: THREE.Scene; low: boolean; worker: SiteWorker | null; adopt(): void; list?: LazyDistrict[] }): Districts {
  const list = opts.list ?? LAZY_DISTRICTS;
  const state = new Map<string, 'loading' | 'done' | 'failed'>();
  let near = 0;
  function load(d: LazyDistrict) {
    if (state.has(d.id)) return;
    state.set(d.id, 'loading');
    d.load()
      .then(async (m) => {
        m.register({ low: opts.low, scene: opts.scene });
        // The worker registers the same sites before they're queued here, so it can take them (a few seconds at most)
        if (opts.worker) await Promise.race([opts.worker.load(m.SELF), new Promise((r) => setTimeout(r, 4000))]);
        opts.adopt();
        state.set(d.id, 'done');
      })
      .catch(() => {
        // (a chunk that wouldn't load: tried again when it comes into reach again)
        state.delete(d.id);
      });
  }
  return {
    step(x, z, far) {
      near = 0;
      for (const d of list) {
        if (state.get(d.id) === 'done') continue;
        if (rectDistance(x, z, d.rect) > far + LEAD) continue;
        near++;
        load(d);
      }
    },
    all() {
      list.forEach(load);
    },
    pending: () => Math.max(near, [...state.values()].filter((s) => s === 'loading').length),
    loaded: () => list.filter((d) => state.get(d.id) === 'done').map((d) => d.id),
  };
}
