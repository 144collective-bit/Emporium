// The mocap pipeline: the takes listed in assets/mocap/takes.json (BVH files
// beside it) retargeted onto Degen's bones, written to src/data/mocap/clips.bin
// (and clips-<pack>.bin for any take in another pack; mocap-build.ts does the
// work, tests/mocap.test.ts checks the files are what it makes). Run it after
// changing a take or the retargeting:
//   npm run mocap
import { build } from 'esbuild';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = '.mocap-build';
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
await build({
  stdin: {
    contents: `export { buildMocap, packs } from './src/scripts/city3d/mocap-build';
export { parseBvh } from './src/scripts/city3d/bvh';
export { encodeMocap } from './src/scripts/city3d/mocap';`,
    resolveDir: '.',
    loader: 'ts',
  },
  outfile: join(out, 'mocap.mjs'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  packages: 'external',
  logLevel: 'error',
});
const { buildMocap, packs, parseBvh, encodeMocap } = await import(pathToFileURL(join(out, 'mocap.mjs')).href);
const takes = JSON.parse(readFileSync('assets/mocap/takes.json', 'utf8'));
const data = buildMocap(takes, (file) => parseBvh(readFileSync(join('assets/mocap', file), 'utf8')));
mkdirSync('src/data/mocap', { recursive: true });
// One file a pack: the core (fetched when walking starts) and any pack fetched on first use
for (const { pack, file, data: d } of packs(data)) {
  const bytes = encodeMocap(d);
  writeFileSync(join('src/data/mocap', file), bytes);
  const frames = d.clips.reduce((n, c) => n + c.frames, 0);
  console.log(`${pack}: ${d.clips.length} clips, ${frames} frames (${(frames / d.fps).toFixed(1)} s), ${(bytes.length / 1024).toFixed(0)} KB (${file})`);
}
rmSync(out, { recursive: true, force: true });
