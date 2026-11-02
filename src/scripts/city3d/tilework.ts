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
 *
 * Far districts let go (phones, `reach`; docs/performance-plan.md, the
 * start-up pass's item 5): a site well past the swap distance from what the
 * camera looks at isn't built at all until it comes closer (it waits in the
 * queue, out of `pending()`), and a built tile that far lets go of everything
 * its sites drew, near and far (`TileBatches.drop()`), whatever the budget;
 * it's built again whole before it's in view (`DROP_BACK`), on the main
 * thread as near pieces are. A desktop (no `reach`) builds and keeps it all.
 */
import * as THREE from 'three';
import type { TileBatches } from './tilebatch';
import type { BuiltSite, SiteWorker } from './sitework';
import { boxInView, tileKey, type Plane, type Rect, type TileIx } from './tiles';
import { DROP_BACK, bootSites, focusOf, inReach, keyRect, nextSite, rectDistance, sitesNear, tilesOfRect, toDrop, toRebuild, toRelease } from './tileplan';

export interface Site {
  id: string;
  /** The ground it covers */
  rect: Rect;
  /** Fill Batches onto `into` (nothing else: no ticks, crowds or solids) */
  build(into: THREE.Object3D): void;
}

const SITES: Site[] = [];
/** The sites registered so far, taken (the site worker builds its own from them: sitework.ts) */
export const takeSites = () => SITES.splice(0);
/** Register a site of the fixed city (built at the boot if it's round the home view, otherwise later) */
export function site(id: string, rect: Rect, build: (into: THREE.Object3D) => void) {
  SITES.push({ id, rect, build });
}

export interface TileWork {
  /** Build the sites touching `tiles` now; returns their groups, for `tileBatch()` to merge with the rest */
  boot(tiles: readonly TileIx[]): THREE.Group[];
  /**
   * Spend up to `ms` building what's waiting, for a camera at x, y, z (`dt` since the last step); `look`
   * is where on the ground it looks (the City view: what's on screen fills first), else round the camera
   */
  step(ms: number, x: number, y: number, z: number, dt: number, far: number, look?: readonly [number, number]): void;
  /** How many sites are still waiting to be built within reach (cheap: every frame) */
  pending(): number;
  /** Take on the sites registered since (a district loaded as you approach: districts.ts) */
  adopt(): number;
  /** Build now everything waiting within `r` of a point (walking in, a fly-in's end) */
  want(x: number, z: number, r: number): void;
  /** Build now everything waiting in a view (the intro) */
  wantView(planes: readonly Plane[], far: number, x: number, y: number, z: number): void;
  stats(): { built: number; waiting: number; beyond: number; atBoot: number; released: number; dropped: number; held: number; sites: number; budget: number; rebuilt: number; bootMs: number; laterMs: number; slowest: { ms: number; id: string }; offMain: number };
}

/** Sites in the worker's hands at once (enough to keep it busy between frames) */
const IN_FLIGHT = 4;

/** The tallest the city's fixed geometry stands, for whether a tile is in view */
const TOP = 24;
/** The fastest the camera is taken to move over the ground, in tiles a second (an aircraft's cruise) */
const MAX_SPEED = 40;

export function createTileWork(
  scene: THREE.Scene,
  opts: { budget: number; compile(meshes: THREE.Object3D[]): void; worker?: SiteWorker | null; meshesOf?(b: BuiltSite): THREE.Group | null; reach?: number }
): TileWork & { attach(t: TileBatches): void } {
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
  // The longest one site took to build after the boot (a frame's hitch), and which
  let slowest = { ms: 0, id: '' };
  const released = new Set<string>();
  // The tiles that let go of everything their sites drew (phones)
  const dropped = new Set<string>();
  // The camera's speed over the ground (smoothed), for building ahead
  const vel = { x: 0, z: 0, px: NaN, pz: NaN };
  let checked = -Infinity;
  // What the camera looked at last (the focus) and the tier's swap distance: what's within reach is measured from there
  const at = { x: NaN, z: NaN, far: Infinity };
  const reachable = (s: Site) => Number.isNaN(at.x) || inReach(rectDistance(at.x, at.z, s.rect), at.far, opts.reach);
  // How many of the queue are within reach (counted again when the focus or the queue changes)
  let reachN = -1;
  const waiting = () => {
    if (opts.reach === undefined) return queue.length;
    if (reachN < 0) reachN = queue.filter(reachable).length;
    return reachN;
  };
  // Off the main thread (sitework.ts): the sites the worker is building (still in the queue: one wanted at
  // once is built here and its worker's copy dropped), those it couldn't send (built here), how many it built
  let worker = opts.worker ?? null;
  const flying = new Set<string>();
  const here = new Set<string>();
  let offMain = 0;
  const byWorker = (s: Site) => !!worker?.can(s.id) && !here.has(s.id);

  /** Run a site (or join one the worker built, `g`); `keep` limits what's kept (building near pieces again) */
  function run(s: Site, keep?: (tile: string, lod: string, shared: boolean) => boolean, made0?: THREE.Group) {
    const t0 = performance.now();
    const g = made0 ?? new THREE.Group();
    scene.add(g);
    if (!made0) s.build(g);
    const made = tiled!.add([g], { site: s.id, keep: keep as never });
    if (made.length) opts.compile(made);
    g.removeFromParent();
    // A site only fills Batches: anything else it left is let go
    g.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    const ms = performance.now() - t0;
    laterMs += ms;
    if (ms > slowest.ms) slowest = { ms, id: s.id };
  }

  function build(i: number) {
    reachN = -1;
    const [s] = queue.splice(i, 1);
    flying.delete(s.id);
    run(s);
    built++;
  }

  /** What the worker built, waiting to join (in up to `ms` a frame) */
  let arrived: BuiltSite[] = [];
  function joinBuilt(t0: number, ms: number) {
    arrived.push(...worker!.take());
    while (arrived.length && performance.now() - t0 < ms) {
      const b = arrived.shift()!;
      flying.delete(b.id);
      // (a site wanted meanwhile was built here: this copy is dropped)
      const i = queue.findIndex((s) => s.id === b.id);
      if (i < 0) continue;
      const g = b.meshes && opts.meshesOf ? opts.meshesOf(b) : null;
      if (!g) {
        here.add(b.id);
        continue;
      }
      const [s] = queue.splice(i, 1);
      reachN = -1;
      run(s, undefined, g);
      built++;
      offMain++;
    }
  }

  /** Build again the pieces the tiles in `keys` let go: the near ones, or all of a tile let go whole (each site touching them runs once) */
  function rebuild(keys: string[]) {
    const want = new Set(keys);
    const sites = new Set(keys.flatMap((k) => tiled!.lostSites(k)));
    for (const id of sites) run(byId.get(id)!, (t, lod, shared) => want.has(t) && (dropped.has(t) || (shared && lod === 'near')));
    for (const k of keys) {
      tiled!.restored(k);
      released.delete(k);
      dropped.delete(k);
    }
    rebuilt += keys.length;
  }

  /** The tiles that let pieces go, from the eye (near pieces) or the focus (whole tiles), with how far back they're wanted */
  const letGo = (x: number, y: number, z: number, which: 'released' | 'dropped') =>
    tiled!
      .held(x, y, z)
      .filter((t) => t[which])
      .map((t) => ({ key: t.key, d: t.d }));
  /** Tiles that let go that are wanted back within `r` of a point */
  function wantBack(x: number, z: number, r: number) {
    const back = (which: 'released' | 'dropped') => letGo(x, 0, z, which).filter((t) => rectDistance(x, z, keyRect(t.key)) <= r);
    const keys = [...(released.size ? back('released') : []), ...(dropped.size ? back('dropped') : [])];
    if (keys.length) rebuild(keys.map((t) => t.key));
  }

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
    step(ms, x, y, z, dt, far, look) {
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
      const [fx, fz] = focusOf(look ? look[0] : x, look ? look[1] : z, vel.x, vel.z);
      if (at.x !== fx || at.z !== fz || at.far !== far) {
        Object.assign(at, { x: fx, z: fz, far });
        reachN = -1;
      }
      // Past the budget, far tiles let their near pieces go, and on phones tiles far from the focus go whole (checked twice a second)
      if (t0 - checked > 500) {
        checked = t0;
        const held = tiled.held(x, y, z).filter((h) => !h.released && !h.dropped);
        for (const key of toRelease(held, opts.budget, far)) {
          if (tiled.release(key)) released.add(key);
        }
        if (opts.reach !== undefined) {
          const whole = tiled.held(fx, 0, fz).filter((h) => !h.dropped && (h.all > 0 || h.released));
          for (const key of toDrop(whole, far, opts.reach)) {
            if (tiled.drop(key) || released.has(key)) {
              dropped.add(key);
              released.delete(key);
            }
          }
          // (one mesh a check gives its room back: a copy of its geometry)
          tiled.shrink();
        }
      }
      // Tiles coming back into reach first: they're needed soonest (a tile let go whole is heavier to build again)
      if (dropped.size) {
        const back = toRebuild(letGo(fx, 0, fz, 'dropped'), far, DROP_BACK);
        if (back.length) rebuild(back.slice(0, 2));
      } else if (released.size) {
        const back = toRebuild(letGo(x, y, z, 'released'), far);
        if (back.length) rebuild(back.slice(0, 4));
      }
      if (worker?.ready()) {
        joinBuilt(t0, ms);
        // The worker's next ones, nearest first
        while (flying.size < IN_FLIGHT) {
          const theirs = queue.filter((s) => byWorker(s) && !flying.has(s.id) && reachable(s));
          if (!theirs.length) break;
          const s = theirs[nextSite(theirs, fx, fz)];
          flying.add(s.id);
          worker.ask(s.id);
        }
        // Every site within reach built: it's let go (a tile built again later, or a site beyond reach, is the main thread's)
        if (!queue.some(reachable) && !arrived.length && !flying.size) {
          worker.close();
          worker = null;
        }
      }
      // The rest here, in what's left of the time (all of them until the worker is ready)
      const mine = () => (worker?.ready() ? queue.filter((s) => !byWorker(s) && reachable(s)) : queue.filter(reachable));
      for (let list = mine(); list.length && performance.now() - t0 < ms; list = mine()) build(queue.indexOf(list[nextSite(list, fx, fz)]));
    },
    want(x, z, r) {
      if (!tiled) return;
      for (const s of sitesNear(queue, x, z, r)) build(queue.indexOf(s));
      wantBack(x, z, r);
    },
    wantView(planes, far, x, y, z) {
      if (!tiled) return;
      const inView = (s: Site) => tilesOfRect(s.rect).some(([i, j]) => {
        const [x0, z0, x1, z1] = keyRect(tileKey(i, j));
        return boxInView(planes, x0, 0, z0, x1, TOP, z1);
      });
      // (a phone leaves what's beyond its reach: it's let go there anyway)
      for (const s of queue.filter((s) => inView(s) && reachable(s))) build(queue.indexOf(s));
      if (released.size) {
        const back = toRebuild(letGo(x, y, z, 'released'), far, 0);
        if (back.length) rebuild(back);
      }
      if (dropped.size) {
        const back = toRebuild(letGo(x, y, z, 'dropped'), far, DROP_BACK);
        if (back.length) rebuild(back);
      }
    },
    pending: waiting,
    adopt() {
      const more = SITES.splice(0);
      for (const s of more) byId.set(s.id, s);
      queue.push(...more);
      reachN = -1;
      return more.length;
    },
    stats: () => {
      const n = waiting();
      return { built, waiting: n, beyond: queue.length - n, atBoot, released: released.size, dropped: dropped.size, held: tiled?.heldBytes() ?? 0, sites: tiled?.siteBytes() ?? 0, budget: opts.budget, rebuilt, bootMs, laterMs, slowest, offMain };
    },
  };
}
