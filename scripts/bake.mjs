// The city's data worked out once, when the site is built (src/scripts/city3d/baked.ts): the modules
// that bake something are loaded here in Node with a recorder switched on, and what each `baked()` made
// goes into the page (astro.config.mjs: Vite's `define`), so a visitor's browser doesn't work it out again.
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Every module that calls `baked()` */
const MODULES = ['routes', 'crowdclips', 'commons'];

export async function bake({ quiet = false } = {}) {
  const t0 = performance.now();
  const dir = mkdtempSync(join(tmpdir(), 'city-bake-'));
  try {
    const city = resolve('src/scripts/city3d');
    // Dynamic imports, so the recorder is switched on before any of them is loaded
    const entry = `globalThis.__cityBake = new Map();\n${MODULES.map((m) => `await import(${JSON.stringify(join(city, `${m}.ts`))});`).join('\n')}\nexport default globalThis.__cityBake;`;
    const out = join(dir, 'bake.mjs');
    await build({
      stdin: { contents: entry, resolveDir: city, loader: 'js' },
      bundle: true,
      format: 'esm',
      platform: 'node',
      outfile: out,
      logLevel: 'error',
      // (the tests' bigger world, as scripts/test.mjs sets it: the site itself never has one)
      define: process.env.WORLD_EXT ? { __WORLD_EXT__: JSON.stringify(process.env.WORLD_EXT.split(',').map(Number)) } : {},
    });
    const made = (await import(pathToFileURL(out).href)).default;
    const data = Object.fromEntries(made);
    if (!quiet) console.log(`[bake] ${[...made.keys()].join(', ')} in ${Math.round(performance.now() - t0)} ms (${Math.round(JSON.stringify(data).length / 1024)} KB)`);
    return data;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
