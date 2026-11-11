// Runs the tests in tests/ with Node's own test runner. They're TypeScript, so each
// one is bundled first with esbuild (packages like three stay as imports).
//   npm test                 every test
//   npm test -- drive        only files whose name contains "drive"
//   npm run test:wide        every test in a bigger world than the site's (WORLD_EXT=-940,980; the site's is -680 to 720)
import { build } from 'esbuild';
import { bake } from './bake.mjs';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

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
// The city's baked data (scripts/bake.mjs: the traffic's routes, the verges, the rolls...) worked out once for the
// whole run and handed to every test file as it starts (scripts/test-baked.mjs), in place of each file working it
// out again as its modules load: about a second a file, in most of them. The files that test what's baked are left
// to make it themselves (tests/baked.test.ts holds the two to the same thing). TEST_BAKED=0 turns it off.
const shared = process.env.TEST_BAKED !== '0';
if (shared) writeFileSync(join(out, 'baked.json'), JSON.stringify(await bake({ quiet: true })));
// Node's own report, and a line per file with how long it took (scripts/test-reporter.mjs: the slowest five at the end)
const run = spawnSync(
  process.execPath,
  [
    '--test',
    ...(shared ? [`--import=${pathToFileURL(join(import.meta.dirname, 'test-baked.mjs')).href}`] : []),
    '--test-reporter=spec',
    '--test-reporter-destination=stdout',
    `--test-reporter=${pathToFileURL(join(import.meta.dirname, 'test-reporter.mjs')).href}`,
    '--test-reporter-destination=stdout',
    ...files.map((f) => join(out, f.replace(/\.ts$/, '.mjs'))),
  ],
  { stdio: 'inherit', env: { ...process.env, TEST_BAKED_FILE: join(process.cwd(), out, 'baked.json') } }
);
process.exit(run.status ?? 1);
