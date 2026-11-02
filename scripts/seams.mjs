// The seam map's report (docs/blend-plan.md Phase 0): every seam between the city's areas, ranked, and the open
// land inside the ring highway in patches. `npm run seams` prints it; `npm run seams -- --md` prints it as the
// plan's tables. Bundled with esbuild first, as the tests are (seams.ts is DOM-free).
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const md = process.argv.includes('--md');
const dir = mkdtempSync(join(tmpdir(), 'seams-'));
try {
  const out = join(dir, 'seams.mjs');
  await build({
    stdin: { contents: `export * from './seams';`, resolveDir: resolve('src/scripts/city3d'), loader: 'ts' },
    outfile: out,
    bundle: true,
    format: 'esm',
    platform: 'node',
    packages: 'external',
    logLevel: 'error',
    define: process.env.WORLD_EXT ? { __WORLD_EXT__: JSON.stringify(process.env.WORLD_EXT.split(',').map(Number)) } : {},
  });
  const m = await import(pathToFileURL(out).href);
  const name = (id) => m.AREAS.find((a) => a.id === id)?.name ?? { open: 'open land (inside the highway)', outside: 'open land (outside the highway)', water: 'the water' }[id] ?? id;
  const t0 = performance.now();
  const seams = m.seams();
  const gaps = m.gaps();
  const ms = Math.round(performance.now() - t0);
  const share = Math.round(m.openShare() * 100);
  if (md) {
    console.log('| # | One side | The other | Between | Length | Where (x, z) |');
    console.log('|---|---|---|---|---|---|');
    seams.forEach((s, i) => console.log(`| ${i + 1} | ${name(s.a)} | ${name(s.b)} | ${s.between} | ${s.length} | ${s.at.join(', ')} |`));
    console.log('\n| Gap | Area (sq tiles) | Box (x0, z0, x1, z1) | Next to |');
    console.log('|---|---|---|---|');
    for (const g of gaps) console.log(`| ${g.name} (\`${g.id}\`) | ${g.area} | ${g.box.join(', ')} | ${g.neighbours.map(name).join(', ') || 'nothing'} |`);
    console.log(`\nOpen land: ${share}% of the land inside the ring highway.`);
  } else {
    console.log(`Seams: ${seams.length}  (worked out in ${ms} ms)`);
    seams.forEach((s, i) => console.log(`${String(i + 1).padStart(3)}. ${name(s.a).padEnd(28).slice(0, 28)} | ${name(s.b).padEnd(30).slice(0, 30)} | ${s.between.padEnd(7)} | ${String(s.length).padStart(5)} long | at ${s.at.join(', ')} | rank ${s.rank}`));
    console.log(`\nGaps (open land inside the highway, ${share}% of it open):`);
    for (const g of gaps) console.log(`  ${g.id.padEnd(14)} ${g.name.padEnd(30)} ${String(g.area).padStart(6)} sq · at ${g.at.join(', ')} · box ${g.box.join(', ')} · next to ${g.neighbours.join(', ')}`);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
