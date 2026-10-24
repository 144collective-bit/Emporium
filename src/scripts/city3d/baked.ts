/*
 * Data worked out when the site is built, not on every visit (performance
 * phase 2): the traffic's routes, the crowd's walk cycles, The Trenches'
 * amenities. `baked(key, make)` returns what the build put in the page
 * (`__CITY_BAKED__`: astro.config.mjs runs scripts/bake.mjs, which loads the
 * modules in Node and records what each `make()` made), or with none (the
 * tests, the game server, a bake run) works it out with `make()`.
 * `pack` / `unpack` turn a value into plain data and back where it holds
 * references (a route's junctions); tests/baked.test.ts checks every key
 * comes back exactly as `make()` makes it.
 */
declare const __CITY_BAKED__: string | undefined;

// (a string for JSON.parse: much quicker for the browser than the same data as a literal in the code)
const FROM_BUILD: Record<string, unknown> = typeof __CITY_BAKED__ !== 'undefined' ? JSON.parse(__CITY_BAKED__) : {};
/** A bake run's record of what each key made (scripts/bake.mjs sets it before loading the modules) */
const BAKING = (globalThis as { __cityBake?: Map<string, unknown> }).__cityBake ?? null;

/**
 * Numbers cut to `places` decimals, all the way down (arrays and plain
 * objects), for what's baked: at 3 places a coordinate is within 2 mm and a
 * turn within 0.03°, and the page's data is less than half the size it
 * would be at full precision (scripts/budget.mjs). Round in `make()`, not
 * in `pack`, so what the page holds is exactly what `make()` makes.
 */
export function rounded<T>(v: T, places = 3): T {
  const k = 10 ** places;
  if (typeof v === 'number') return (Math.round(v * k) / k) as T;
  if (Array.isArray(v)) return v.map((x) => rounded(x, places)) as T;
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([key, x]) => [key, rounded(x, places)])) as T;
  return v;
}

export function baked<T, P = T>(key: string, make: () => T, pack?: (v: T) => P, unpack?: (p: P) => T): T {
  if (key in FROM_BUILD) {
    const raw = FROM_BUILD[key] as P;
    return unpack ? unpack(raw) : (raw as unknown as T);
  }
  const v = make();
  BAKING?.set(key, pack ? pack(v) : v);
  return v;
}
