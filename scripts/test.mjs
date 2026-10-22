// Runs the tests in tests/ with Node's own test runner. They're TypeScript, so each
// one is bundled first with esbuild (packages like three stay as imports).
//   npm test                 every test
//   npm test -- drive        only files whose name contains "drive"
//   npm run test:wide        every test in a bigger world (growth plan Phase 5: WORLD_EXT=-420,460)
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const only = process.argv[2] ?? '';
const files = readdirSync('tests').filter((f) => f.endsWith('.test.ts') && f.includes(only));
if (!files.length) {
  console.error(`No tests match "${only}".`);
  process.exit(1);
}
const out = '.test-build';
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
await build({
  entryPoints: files.map((f) => join('tests', f)),
  outdir: out,
  outExtension: { '.js': '.mjs' },
  bundle: true,
  format: 'esm',
  platform: 'node',
  packages: 'external',
  logLevel: 'error',
  // WORLD_EXT=x0,x1: the world's edge somewhere else (layout.ts `EXT`)
  define: process.env.WORLD_EXT ? { __WORLD_EXT__: JSON.stringify(process.env.WORLD_EXT.split(',').map(Number)) } : {},
});
const run = spawnSync(process.execPath, ['--test', ...files.map((f) => join(out, f.replace(/\.ts$/, '.mjs')))], { stdio: 'inherit' });
process.exit(run.status ?? 1);
