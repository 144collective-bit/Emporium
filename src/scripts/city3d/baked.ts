/*
 * Data worked out when the site is built, not on every visit (performance
 * phase 2): the traffic's routes, the crowd's walk cycles, The Trenches'
 * amenities, the blocks' verges, the rolls. `baked(key, make)` returns what
 * the build made (scripts/bake.mjs, run by astro.config.mjs, loads the
 * modules in Node and records what each `make()` made; the build writes it
 * all to one hashed JSON file under /_astro/, `__CITY_BAKED_URL__`, which
 * the service worker keeps like the code: polish plan Phase 4, where it was
 * a string in the boot's own code), or with none (the tests, the game
 * server, a bake run) works it out with `make()`.
 *
 * In the built site this module waits for that file (a top-level await: the
 * modules that bake read it as they load, `ROUTES` and the rest), so the
 * boot's code and its data download side by side: the page starts the fetch
 * as its own script runs (`__cityBakedP`, CityMap.astro), before it imports
 * the city, and the site worker is handed the data (sitework.ts), so neither
 * waits on a second fetch.
 *
 * `pack` / `unpack` turn a value into plain data and back where it holds
 * references (a route's junctions); tests/baked.test.ts checks every key
 * comes back exactly as `make()` makes it.
 */
declare const __CITY_BAKED_URL__: string | undefined;
declare const __CITY_BUILT__: boolean | undefined;
/**
 * The site's own build (astro.config.mjs): every key is in the baked file, so a `make()` passed as `BUILT ? undefined :
 * make` folds away with what only it uses (the traffic's route generator: what the boot downloads is the data)
 */
export const BUILT: boolean = typeof __CITY_BUILT__ !== 'undefined' && __CITY_BUILT__ === true;
/** Where the built site keeps its baked data (a hashed file under /_astro/); null in the tests, the server and a bake */
export const BAKED_URL: string | null = typeof __CITY_BAKED_URL__ !== 'undefined' ? __CITY_BAKED_URL__ : null;

type Baked = Record<string, unknown>;
type WithEarly = { __cityBakedP?: Promise<Baked> };

/**
 * Fetch the baked data (the page starts this before the city's code: CityMap.astro). A failed fetch is tried once
 * more; a page opened before a new version went live asks for a file the new version replaced, and the page reloads
 * once for that (its `vite:preloadError` handler's rule, on the error's `baked:` prefix)
 */
export function loadBaked(): Promise<Baked> {
  const url = new URL(BAKED_URL ?? '', import.meta.url).href;
  const once = () =>
    fetch(url).then((r) => {
      if (!r.ok) throw new Error(`baked: ${url} answered ${r.status}`);
      return r.json() as Promise<Baked>;
    });
  return once().catch(() => once());
}

const early = (globalThis as WithEarly).__cityBakedP;
/** The build's data (one fetch, awaited here so every module that bakes finds it as it loads) */
export const FROM_BUILD: Baked = BAKED_URL ? await (early ?? loadBaked()) : {};
/** A bake run's record of what each key made (scripts/bake.mjs sets it before loading the modules) */
const BAKING = (globalThis as { __cityBake?: Map<string, unknown> }).__cityBake ?? null;

export function baked<T, P = T>(key: string, make: (() => T) | undefined, pack?: (v: T) => P, unpack?: (p: P) => T): T {
  if (key in FROM_BUILD) {
    const raw = FROM_BUILD[key] as P;
    return unpack ? unpack(raw) : (raw as unknown as T);
  }
  if (!make) throw new Error(`baked: ${key} is missing from the build's data`);
  const v = make();
  BAKING?.set(key, pack ? pack(v) : v);
  return v;
}
