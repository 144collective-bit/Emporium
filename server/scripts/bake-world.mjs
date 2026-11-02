// What the game server needs of the city's geometry, worked out once when the Worker is built, not every
// time it starts. Building it in the Worker (solids.ts pulls in every district's layout) took about 0.4 s
// of CPU at startup, over Cloudflare's startup limit: deploys failed with "Script startup exceeded CPU time
// limit" [code: 10021]. `build` in wrangler.jsonc runs this; it writes src/world.gen.txt (not in git),
// which src/world.ts reads (a Text module: wrangler's default rules bundle *.txt as a string).
import { build } from 'esbuild';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const city = resolve(here, '../../src/scripts/city3d');
const out = resolve(here, '../src/world.gen.txt');

const t0 = performance.now();
const dir = mkdtempSync(join(tmpdir(), 'world-bake-'));
try {
  const entry = `
import { CAMERA_ONLY, RACK, SHOT_SOLIDS } from ${JSON.stringify(join(city, 'solids.ts'))};
import { ARMS } from ${JSON.stringify(join(city, 'avenue.ts'))};
export default {
  // What bullets stop on: solids.ts's SHOT_GRID, in its order
  shots: [...SHOT_SOLIDS, ...CAMERA_ONLY],
  // Where a player may gear up: the gun stores' counters (the Armoury's, Trench Arms' hatch)
  counters: [RACK, ARMS.counter].map(({ x, z }) => ({ x, z })),
};`;
  const file = join(dir, 'bake.mjs');
  await build({ stdin: { contents: entry, resolveDir: city, loader: 'js' }, bundle: true, format: 'esm', platform: 'node', outfile: file, logLevel: 'error' });
  const world = (await import(pathToFileURL(file).href)).default;
  const text = JSON.stringify(world);
  writeFileSync(out, text);
  console.log(`[world] ${world.shots.length} boxes, ${world.counters.length} counters, ${Math.round(text.length / 1024)} KB in ${Math.round(performance.now() - t0)} ms`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
