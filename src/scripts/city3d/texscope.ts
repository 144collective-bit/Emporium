/*
 * What a painted texture's key counts within (docs/stability-plan.md, Phase 4.3). DOM-free, tested in
 * tests/texscope.test.ts; kit.ts's `texKey()` asks for the count, tilework.ts's `site()` sets the scope.
 *
 * A key is what draws a texture (its function's source and size) and how many like it came before, so the
 * build's textures (scripts/bake-textures.mjs) can stand in for the painted ones. Counted across the whole city,
 * "how many came before" depends on what was built first: the sites build nearest the camera first, so a texture
 * a site's builder paints would take another number on every visit. Inside a site the count is the site's own
 * (its id is fixed: tests/snapshot.test.ts), and starts again each time the site is built (a site let go and
 * built again paints the same pictures, under the same keys).
 */

/** The site being built ('' outside any: the boot's own code, a district's module) */
let scope = '';
const counts = new Map<string, Map<string, number>>([['', new Map()]]);

/** Run `fn` as site `id`'s builder: the textures it paints are counted from 0, within the site */
export function inTexScope<T>(id: string, fn: () => T): T {
  const was = scope;
  scope = id;
  counts.set(id, new Map());
  try {
    return fn();
  } finally {
    scope = was;
  }
}

/** The scope now ('' outside any site) */
export const texScope = () => scope;

/** The key for one more texture drawn as `base` (what draws it and its size), in the scope now */
export function scopedKey(base: string): string {
  const own = counts.get(scope)!;
  const n = own.get(base) ?? 0;
  own.set(base, n + 1);
  return scope ? `${scope}|${base}-${n}` : `${base}-${n}`;
}
