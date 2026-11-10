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
 * in its far form. Where the haze hides everything past a distance (`horizon`:
 * phones, on the ground), a tile out there lets go of all its sites drew, and
 * gets it back before it could show (tileplan.ts `toVanish()`, `toReturn()`).
 */
import * as THREE from 'three';
import type { TileBatches } from './tilebatch';
import type { BuiltSite, SiteWorker } from './sitework';
import { boxInView, tileKey, type Plane, type Rect, type TileIx } from './tiles';
import { HORIZON_OUT, bootSites, focusOf, keyRect, nextSite, rectDistance, sitesNear, tilesOfRect, toRebuild, toRelease, toReturn, toVanish } from './tileplan';

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
  /** How many sites are still waiting to be built (cheap: every frame) */
  pending(): number;
  /** Take on the sites registered since (a district loaded as you approach: districts.ts) */
  adopt(): number;
  /** Build now everything waiting within `r` of a point (walking in, a fly-in's end) */
  want(x: number, z: number, r: number): void;
  /** Build now everything waiting in a view (the intro) */
  wantView(planes: readonly Plane[], far: number, x: number, y: number, z: number): void;
  stats(): { built: number; waiting: number; atBoot: number; released: number; held: number; budget: number; rebuilt: number; gone: number; goneBytes: number; returned: number; trimmed: number; bootMs: number; laterMs: number; slowest: { ms: number; id: string }; offMain: number };
}

/** Past the haze: the meshes are made smaller once this much has been let go, and no more often than this (ms) */
const TRIM_AFTER = 6 * 2 ** 20;
const TRIM_EVERY = 4000;

/** Sites in the worker's hands at once (enough to keep it busy between frames) */
const IN_FLIGHT = 4;

/** The tallest the city's fixed geometry stands, for whether a tile is in view */
const TOP = 24;
/** The fastest the camera is taken to move over the ground, in tiles a second (an aircraft's cruise) */
const MAX_SPEED = 40;

export function createTileWork(
  scene: THREE.Scene,
  opts: {
    budget: number;
    compile(meshes: THREE.Object3D[]): void;
    worker?: SiteWorker | null;
    meshesOf?(b: BuiltSite): THREE.Group | null;
    /** How far anything can be seen through the haze, when tiles past it may be let go altogether (else Infinity) */
    horizon?(): number;
  }
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
  // Tiles past the haze that let everything go (tileplan.ts), what that freed, and how many came back
  const gone = new Set<string>();
  let goneBytes = 0;
  let returned = 0;
  let horizon = Infinity;
  let untrimmed = 0;
  let trimmed = -Infinity;
  let trimmedBytes = 0;
  // The camera's speed over the ground (smoothed), for building ahead
  const vel = { x: 0, z: 0, px: NaN, pz: NaN };
  let checked = -Infinity;
  let vanished = -Infinity;
  // Off the main thread (sitework.ts): the sites the worker is building (still in the queue: one wanted at
  // once is built here and its worker's copy dropped), those it couldn't send (built here), how many it built
  let worker = opts.worker ?? null;
  const flying = new Set<string>();
  const here = new Set<string>();
  let offMain = 0;
  const byWorker = (s: Site) => !!worker?.can(s.id) && !here.has(s.id);

  /** Run a site (or join one the worker built, `g`); `keep` limits what's kept (building near pieces again) */
  function run(s: Site, keep?: (tile: string, lod: string) => boolean, made0?: THREE.Group) {
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
    const [s] = queue.splice(i, 1);
    flying.delete(s.id);
    run(s);
    built++;
  }

  /** What the worker built, waiting to join (in up to `ms` a frame) */
  const arrived: BuiltSite[] = [];
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
      run(s, undefined, g);
      built++;
      offMain++;
    }
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

  /** Build again what the tiles in `keys` let go past the haze, but their near pieces (they're still far) */
  function regain(keys: string[]) {
    const want = new Set(keys);
    const sites = new Set(keys.flatMap((k) => tiled!.lostSites(k)));
    for (const id of sites) run(byId.get(id)!, (t, lod) => want.has(t) && lod !== 'near');
    for (const k of keys) {
      tiled!.regained(k);
      gone.delete(k);
    }
    returned += keys.length;
  }

  const releasedNear = (x: number, y: number, z: number) =>
    tiled!
      .held(x, y, z)
      .filter((t) => t.released && !t.gone)
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
      // Past the budget, far tiles let their near pieces go (checked twice a second)
      if (t0 - checked > 500) {
        checked = t0;
        const held = tiled.held(x, y, z).filter((h) => !h.released);
        for (const key of toRelease(held, opts.budget, far)) {
          if (tiled.release(key)) released.add(key);
        }
      }
      // Past the haze (phones, on the ground), a tile lets go of everything its sites drew
      horizon = opts.horizon?.() ?? Infinity;
      if (t0 - vanished > 500 && Number.isFinite(horizon)) {
        vanished = t0;
        for (const key of toVanish(tiled.held(x, y, z), horizon)) {
          const freed = tiled.vanish(key);
          if (!freed) continue;
          gone.add(key);
          released.add(key);
          goneBytes += freed;
          untrimmed += freed;
        }
        // The room that left is given back to the device once it adds up (the meshes are copied smaller: now and then)
        if (untrimmed > TRIM_AFTER && t0 - trimmed > TRIM_EVERY) {
          trimmed = t0;
          untrimmed = 0;
          trimmedBytes += tiled.trim();
        }
      }
      // ... and gets it back as it comes inside it again (all of them once the haze no longer hides them), nearest
      // first, in this frame's time
      if (gone.size) {
        const back = toReturn(tiled.held(x, y, z), horizon);
        for (let i = 0; i < back.length && (i === 0 || performance.now() - t0 < ms); i++) regain([back[i]]);
      }
      // Tiles coming back into reach first: they're needed soonest
      if (released.size) {
        const back = toRebuild(releasedNear(x, y, z), far);
        if (back.length) rebuild(back.slice(0, 4));
      }
      const [fx, fz] = focusOf(look ? look[0] : x, look ? look[1] : z, vel.x, vel.z);
      // (a site waiting past the haze waits on: built now, it would be let go at once)
      const inReach = (s: Site) => !Number.isFinite(horizon) || rectDistance(x, z, s.rect) <= horizon + HORIZON_OUT;
      if (worker?.ready()) {
        joinBuilt(t0, ms);
        // The worker's next ones, nearest first
        while (flying.size < IN_FLIGHT) {
          const theirs = queue.filter((s) => byWorker(s) && !flying.has(s.id) && inReach(s));
          if (!theirs.length) break;
          const s = theirs[nextSite(theirs, fx, fz)];
          flying.add(s.id);
          worker.ask(s.id);
        }
        // Every site built: it's let go (a tile built again later is the main thread's)
        if (!queue.length && !arrived.length) {
          worker.close();
          worker = null;
        }
      }
      // The rest here, in what's left of the time (all of them until the worker is ready)
      const mine = () => (worker?.ready() ? queue.filter((s) => !byWorker(s)) : queue).filter(inReach);
      for (let list = mine(); list.length && performance.now() - t0 < ms; list = mine()) build(queue.indexOf(list[nextSite(list, fx, fz)]));
    },
    want(x, z, r) {
      if (!tiled) return;
      for (const s of sitesNear(queue, x, z, r)) build(queue.indexOf(s));
      if (gone.size) {
        const back = [...gone].filter((k) => rectDistance(x, z, keyRect(k)) <= r);
        if (back.length) regain(back);
      }
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
      // (a view asked for whole, the intro: everything let go past the haze comes back)
      if (gone.size) regain([...gone]);
      if (released.size) {
        const back = releasedNear(x, y, z).filter((t) => t.d <= far);
        if (back.length) rebuild(back.map((t) => t.key));
      }
    },
    pending: () => queue.length,
    adopt() {
      const more = SITES.splice(0);
      for (const s of more) byId.set(s.id, s);
      queue.push(...more);
      return more.length;
    },
    stats: () => ({ built, waiting: queue.length, atBoot, released: released.size, held: tiled?.heldBytes() ?? 0, budget: opts.budget, rebuilt, bootMs, laterMs, slowest, offMain, gone: gone.size, goneBytes, returned, trimmed: trimmedBytes }),
  };
}
