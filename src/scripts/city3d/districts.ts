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
import type { Tick } from './world';
import { WESTLAKE_RECT } from './westlake';
import { STADIUM_AREA } from './stadium';
import { KART_AREA } from './kartfacility';
import { UPTOWN_RECT } from './uptown';
import { SITE } from './airfield';
import { EXT, RIVER } from './layout';
import { MALL_AREA } from './mall';
import { CREST_RECT } from './crestmont';
import { DOCKS_RECT } from './docks';
import { SUNRIDGE_RECT } from './sunridge';

/** How much further out than its land Uptown loads (its towers stand over the whole town) */
const UPTOWN_REACH = 240;

export interface LazyDistrict {
  id: string;
  /** Its land (x0, z0, x1, z1) */
  rect: Rect;
  load(): Promise<DistrictModule>;
}

const union = (a: Rect, b: Rect): Rect => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
export const LAZY_DISTRICTS: LazyDistrict[] = [
  // (with the stadium's grounds north of the highway beside it: its road, car park and footbridge, stadiumgrounds3d.ts)
  { id: 'westlake', rect: union(WESTLAKE_RECT, STADIUM_AREA), load: () => import('./westlake3d') },
  // The kart park's grounds north of the highway: the circuit, trackside, the paddock, Kart Road and the car park (kartgrounds3d.ts)
  { id: 'karts', rect: KART_AREA, load: () => import('./kartgrounds3d') },
  // The airport's grounds on the world's south edge (airportgrounds3d.ts): the runway, taxiways and aprons, the
  // concourses and airbridges, the maintenance hangar, the fire station, the fuel farm, the fence and the landside roads
  { id: 'airport', rect: SITE, load: () => import('./airportgrounds3d') },
  // Uptown, the financial centre west of town (uptown.ts, highrise.ts): its towers, open lots and lanes (uptown3d.ts),
  // loaded from well out (`UPTOWN_REACH`): its skyline is seen from across town
  { id: 'uptown', rect: [UPTOWN_RECT[0] - UPTOWN_REACH, UPTOWN_RECT[1] - UPTOWN_REACH, UPTOWN_RECT[2] + UPTOWN_REACH, UPTOWN_RECT[3] + UPTOWN_REACH], load: () => import('./uptown3d') },
  // The river's life (river plan step 4a, riverlife.ts): the cruise boat, the rowing eight and the dinghies (riverlife3d.ts)
  { id: 'river', rect: [EXT[0], RIVER[0], EXT[1], RIVER[1]], load: () => import('./riverlife3d') },
  // Palm Court and Starlight Mall north of downtown (mall.ts, docs/mall-plan.md): the shops, the cinema, the mall, the
  // loop, the car parks (mall3d.ts)
  { id: 'mall', rect: MALL_AREA, load: () => import('./mall3d') },
  // Crestmont, the north-east town (crestmont.ts, docs/crestmont-plan.md): its streets in the Flats and up the hills (crestmont3d.ts)
  { id: 'crestmont', rect: CREST_RECT, load: () => import('./crestmont3d') },
  // The Docks, the port west of The Trenches past the highway (docks.ts, docs/docks-plan.md): its streets and quays (docks3d.ts)
  { id: 'docks', rect: DOCKS_RECT, load: () => import('./docks3d') },
  // Sunridge, the suburb north-east inside the highway (sunridge.ts, docs/suburb-plan.md): its streets and walls (sunridge3d.ts)
  { id: 'sunridge', rect: SUNRIDGE_RECT, load: () => import('./sunridge3d') },
];


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

export function createDistricts(opts: { scene: THREE.Scene; low: boolean; worker: SiteWorker | null; adopt(): void; tick?: (f: Tick) => void; list?: LazyDistrict[] }): Districts {
  const list = opts.list ?? LAZY_DISTRICTS;
  const state = new Map<string, 'loading' | 'done' | 'failed'>();
  let near = 0;
  function load(d: LazyDistrict) {
    if (state.has(d.id)) return;
    state.set(d.id, 'loading');
    d.load()
      .then(async (m) => {
        m.register({ low: opts.low, scene: opts.scene, tick: opts.tick });
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
