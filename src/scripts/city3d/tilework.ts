/*
 * Building as you go (docs/growth-plan.md Phase 3): the city's sites, built
 * round the home view at the boot and the rest a few at a time after it.
 *
 * A site is a piece of the fixed city drawn from data by a function that
 * only fills Batches (a tile's trees, the airport's runway, the kart park's
 * circuit): the same every time it runs, so it can run again. Builders
 * register them with `site()`; the boot builds those round the home view
 * (`boot()`), and `step()` builds the rest in a few milliseconds a frame,
 * nearest first and ahead of you when you're moving (tileplan.ts). Places
 * the camera is about to go (walking in, a panel's fly-in, the intro) ask
 * for theirs first (`want()`, `wantView()`).
 *
 * What a site draws joins the city's tile pieces (`TileBatches.add()`). A
 * tile far away lets its sites' near pieces go when the near forms held add
 * up past the tier's budget, and they're built again (the site runs once
 * more, keeping only those) before the tile is near; until then it's drawn
 * in its far form.
 */
import * as THREE from 'three';
import type { TileBatches } from './tilebatch';
import { boxInView, tileKey, type Plane, type Rect, type TileIx } from './tiles';
import { bootSites, focusOf, keyRect, nextSite, rectDistance, sitesNear, tilesOfRect, toRebuild, toRelease } from './tileplan';

export interface Site {
  id: string;
  /** The ground it covers */
  rect: Rect;
  /** Fill Batches onto `into` (nothing else: no ticks, crowds or solids) */
  build(into: THREE.Object3D): void;
}

const SITES: Site[] = [];
/** Register a site of the fixed city (built at the boot if it's round the home view, otherwise later) */
export function site(id: string, rect: Rect, build: (into: THREE.Object3D) => void) {
  SITES.push({ id, rect, build });
}

export interface TileWork {
  /** Build the sites touching `tiles` now; returns their groups, for `tileBatch()` to merge with the rest */
  boot(tiles: readonly TileIx[]): THREE.Group[];
  /** Spend up to `ms` building what's waiting, for a camera at x, y, z (`dt` since the last step) */
  step(ms: number, x: number, y: number, z: number, dt: number, far: number): void;
  /** Build now everything waiting within `r` of a point (walking in, a fly-in's end) */
  want(x: number, z: number, r: number): void;
  /** Build now everything waiting in a view (the intro) */
  wantView(planes: readonly Plane[], far: number, x: number, y: number, z: number): void;
  stats(): { built: number; waiting: number; atBoot: number; released: number; held: number; budget: number; rebuilt: number; bootMs: number; laterMs: number };
}

/** The tallest the city's fixed geometry stands, for whether a tile is in view */
const TOP = 24;
/** The fastest the camera is taken to move over the ground, in tiles a second (an aircraft's cruise) */
const MAX_SPEED = 40;

export function createTileWork(scene: THREE.Scene, opts: { budget: number; compile(meshes: THREE.Object3D[]): void }): TileWork & { attach(t: TileBatches): void } {
  let tiled: TileBatches | null = null;
  // (taken: the city is built once a page)
  const queue: Site[] = SITES.splice(0);
  const byId = new Map(queue.map((s) => [s.id, s]));
  let built = 0;
  let atBoot = 0;
  let rebuilt = 0;
  // Milliseconds spent building sites at the boot, and after it
  let bootMs = 0;
  let laterMs = 0;
  const released = new Set<string>();
  // The camera's speed over the ground (smoothed), for building ahead
  const vel = { x: 0, z: 0, px: NaN, pz: NaN };
  let checked = -Infinity;

  /** Run a site; `keep` limits what's kept (building near pieces again) */
  function run(s: Site, keep?: (tile: string, lod: string) => boolean) {
    const t0 = performance.now();
    const g = new THREE.Group();
    scene.add(g);
    s.build(g);
    const made = tiled!.add([g], { site: s.id, keep: keep as never });
    if (made.length) opts.compile(made);
    g.removeFromParent();
    // A site only fills Batches: anything else it left is let go
    g.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    laterMs += performance.now() - t0;
  }

  function build(i: number) {
    const [s] = queue.splice(i, 1);
    run(s);
    built++;
  }

  /** Build again the near pieces of the tiles in `keys` (each site touching them runs once) */
  function rebuild(keys: string[]) {
    const want = new Set(keys);
    const sites = new Set(keys.flatMap((k) => tiled!.lostSites(k)));
    for (const id of sites) run(byId.get(id)!, (t, lod) => want.has(t) && lod === 'near');
    for (const k of keys) {
      tiled!.restored(k);
      released.delete(k);
    }
    rebuilt += keys.length;
  }

  const releasedNear = (x: number, y: number, z: number) =>
    tiled!
      .held(x, y, z)
      .filter((t) => t.released)
      .map((t) => ({ key: t.key, d: t.d }));

  return {
    attach(t) {
      tiled = t;
    },
    boot(tiles) {
      const t0 = performance.now();
      const list = bootSites(queue, tiles);
      const groups: THREE.Group[] = [];
      for (const s of list) {
        queue.splice(queue.indexOf(s), 1);
        // Built onto the scene with the rest of the boot, and merged with it (`tileBatch()` reads the site's name)
        const g = new THREE.Group();
        g.userData.site = s.id;
        scene.add(g);
        s.build(g);
        groups.push(g);
        built++;
      }
      atBoot = list.length;
      bootMs = performance.now() - t0;
      return groups;
    },
    step(ms, x, y, z, dt, far) {
      if (!tiled) return;
      const t0 = performance.now();
      if (dt > 0 && dt < 0.5 && !Number.isNaN(vel.px)) {
        const k = Math.min(1, dt * 3);
        vel.x += ((x - vel.px) / dt - vel.x) * k;
        vel.z += ((z - vel.pz) / dt - vel.z) * k;
        // (a jump, a teleport or a cut, isn't a speed: no faster than an aircraft)
        const v = Math.hypot(vel.x, vel.z);
        if (v > MAX_SPEED) {
          vel.x *= MAX_SPEED / v;
          vel.z *= MAX_SPEED / v;
        }
      }
      vel.px = x;
      vel.pz = z;
      // Past the budget, far tiles let their near pieces go (checked twice a second)
      if (t0 - checked > 500) {
        checked = t0;
        const held = tiled.held(x, y, z).filter((h) => !h.released);
        for (const key of toRelease(held, opts.budget, far)) {
          if (tiled.release(key)) released.add(key);
        }
      }
      // Tiles coming back into reach first: they're needed soonest
      if (released.size) {
        const back = toRebuild(releasedNear(x, y, z), far);
        if (back.length) rebuild(back.slice(0, 4));
      }
      const [fx, fz] = focusOf(x, z, vel.x, vel.z);
      while (queue.length && performance.now() - t0 < ms) build(nextSite(queue, fx, fz));
    },
    want(x, z, r) {
      if (!tiled) return;
      for (const s of sitesNear(queue, x, z, r)) build(queue.indexOf(s));
      if (released.size) {
        const back = releasedNear(x, 0, z).filter((t) => rectDistance(x, z, keyRect(t.key)) <= r);
        if (back.length) rebuild(back.map((t) => t.key));
      }
    },
    wantView(planes, far, x, y, z) {
      if (!tiled) return;
      const inView = (s: Site) => tilesOfRect(s.rect).some(([i, j]) => {
        const [x0, z0, x1, z1] = keyRect(tileKey(i, j));
        return boxInView(planes, x0, 0, z0, x1, TOP, z1);
      });
      for (const s of queue.filter(inView)) build(queue.indexOf(s));
      if (released.size) {
        const back = releasedNear(x, y, z).filter((t) => t.d <= far);
        if (back.length) rebuild(back.map((t) => t.key));
      }
    },
    stats: () => ({ built, waiting: queue.length, atBoot, released: released.size, held: tiled?.heldBytes() ?? 0, budget: opts.budget, rebuilt, bootMs, laterMs }),
  };
}
