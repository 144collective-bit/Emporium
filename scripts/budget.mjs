// Budgets that fail the build (performance phase 2): what a visitor downloads before the city
// is up, held to fixed sizes. Run after `astro build` (`npm run budget`); the "Build site" Action
// runs it, so a change that makes the start heavier than this fails before it reaches the site.
// Raise a budget only on purpose (and say why in the commit), never just to get a build through.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

/** Kilobytes, gzipped (what goes over the wire) */
const BUDGETS = {
  /** The homepage's HTML (the 2D map waits in it, inert, for whoever picks it) */
  page: 110,
  /** The script the page starts with, and everything it imports straight away */
  pageJs: 8,
  /** The 3D city's code before it's up: its chunk and everything that chunk imports straight away */
  bootJs: 640,
  /** Any one piece loaded later (a feature, when it's used) */
  lazyJs: 60,
  /** All the CSS */
  css: 60,
};

const dist = process.argv[2] ?? 'dist';
const astro = join(dist, '_astro');
const gz = (file) => gzipSync(readFileSync(file)).length / 1024;
const read = (name) => readFileSync(join(astro, name), 'utf8');
const files = readdirSync(astro);

/** A chunk and the chunks it imports statically (`from"./x.js"`, `import"./x.js"`), all the way down */
function closure(start) {
  const seen = new Set();
  const walk = (name) => {
    if (seen.has(name)) return;
    seen.add(name);
    for (const m of read(name).matchAll(/(?:from|import)\s*["']\.\/([\w.-]+\.js)["']/g)) walk(m[1]);
  };
  start.forEach(walk);
  return seen;
}
const sum = (names) => [...names].reduce((s, n) => s + gz(join(astro, n)), 0);

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const entries = [...html.matchAll(/<script[^>]*type="module"[^>]*src="\/_astro\/([\w.-]+\.js)"/g)].map((m) => m[1]);
const page = closure(entries);
const city = files.find((f) => /^city3d\.[\w-]+\.js$/.test(f));
if (!city) throw new Error('no city3d chunk in ' + astro);
const boot = closure([city]);
for (const n of page) boot.delete(n);
const lazy = files.filter((f) => f.endsWith('.js') && !boot.has(f) && !page.has(f));
const biggestLazy = lazy.map((f) => [f, gz(join(astro, f))]).sort((a, b) => b[1] - a[1])[0] ?? ['-', 0];
const css = files.filter((f) => f.endsWith('.css'));

const rows = [
  ['page', gz(join(dist, 'index.html')), 'index.html'],
  ['pageJs', sum(page), [...page].join(' ')],
  ['bootJs', sum(boot), [...boot].join(' ')],
  ['lazyJs', biggestLazy[1], `${biggestLazy[0]} (the biggest of ${lazy.length})`],
  ['css', sum(css), `${css.length} files`],
];
let failed = false;
for (const [key, kb, what] of rows) {
  const over = kb > BUDGETS[key];
  failed ||= over;
  console.log(`${over ? 'OVER' : 'ok  '} ${key.padEnd(7)} ${kb.toFixed(1).padStart(7)} KB of ${String(BUDGETS[key]).padStart(4)} KB gz  ${what}`);
}
if (failed) {
  console.error('A budget is blown (scripts/budget.mjs): make the start lighter, or load the new part when it is used.');
  process.exit(1);
}
