// Budgets that fail the build (performance phase 2): what a visitor downloads before the city
// is up, held to fixed sizes. Run after `astro build` (`npm run budget`); the "Build site" Action
// runs it, so a change that makes the start heavier than this fails before it reaches the site.
// Raise a budget only on purpose (and say why in the commit), never just to get a build through.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

/** Kilobytes, gzipped (what goes over the wire) */
const BUDGETS = {
  /** The homepage's HTML */
  page: 110,
  /** The script the page starts with, and everything it imports straight away */
  pageJs: 8,
  /**
   * The 3D city's code before it's up: its chunk and everything that chunk imports straight away (raised from 640
   * on purpose for Uptown's plaza, finance plan Phase 3: its solids, trees, lamps and people must be there at the
   * boot; its drawing and drawing-only data are Uptown's own chunk's; and from 642 for Uptown's redesign, Phase 5,
   * the owner's call: the traffic's routes round its new streets (baked, 5 KB), the street plan and the slim towers
   * (4 KB), the lay-bys' cars and the alleys' solids (2 KB), its streets' asphalt and lamps at the boot (2 KB); and
   * from 654 for Phase 6, the owner's picks: Sector 7 Tower as a place (its spot, the lift and walking on the sky
   * deck), Uptown's joggers and cyclists in the crowd, its sound and the executive helicopter's flight (2 KB); the
   * tower's drawing, the night lights and the bikes are Uptown's own chunk's; and from 658 for the river four times
   * as wide, docs/river-plan.md step 1, the owner's call: its natural shape (river.ts), the water's mesh and its banks
   * (world.ts), the walls the cars stop at and the traffic's new routes without the avenue bridges (3 KB): the water
   * is seen from the home view, so it's drawn at the boot; and from 662 for step 2, the owner's design: Harbour
   * Bridge as a place (its towers, deck, cables and stays, harbour3d.ts, 4 KB) and the water lowered under the
   * streets (the banks' slopes and quay walls): a landmark seen from the home view, drawn at the boot as Liberty
   * Bridge is; and from 666 for step 4, the owner's picks: more boats (the lane boats doubled, the police launch, the
   * river's life loaded as you approach) and the river bus's stops as places (their gangways' prompts, the railings
   * and the promenades' lamps, trees and benches opening round them, the stops on the world map), 2 KB: the boats,
   * the landings, the bus's loop, its timetable and its rides are their own chunks')
   */
  bootJs: 670,
  /** Any one piece loaded later (a feature, when it's used) */
  lazyJs: 60,
  /** All the CSS */
  css: 60,
  /** The textures made at build time (scripts/bake-textures.mjs), as phones fetch them (KTX2, already compressed) */
  texLow: 2300,
  /** ... and as everyone else does */
  texFull: 3500,
  /** Their transcoder (three's Basis wasm and its script) */
  transcoder: 300,
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
// The textures made at build time, if they were (without them the city paints its own, as before)
const tex = html.match(/<script type="application\/json" id="city-tex">(.*?)<\/script>/s);
if (tex) {
  const { transcoder, sets } = JSON.parse(tex[1]);
  const bytes = (set) => [...new Set(Object.values(sets[set]).map((t) => t.file))].reduce((s, f) => s + readFileSync(join(astro, f)).length, 0) / 1024;
  const tdir = join(astro, transcoder);
  rows.push(['texLow', bytes('low'), `${Object.keys(sets.low).length} textures`]);
  rows.push(['texFull', bytes('full'), `${Object.keys(sets.full).length} textures`]);
  rows.push(['transcoder', readdirSync(tdir).reduce((s, f) => s + gz(join(tdir, f)), 0), transcoder]);
} else console.log('(no textures made at build time: the city paints them)');
let failed = false;
for (const [key, kb, what] of rows) {
  const over = kb > BUDGETS[key];
  failed ||= over;
  console.log(`${over ? 'OVER' : 'ok  '} ${key.padEnd(10)} ${kb.toFixed(1).padStart(7)} KB of ${String(BUDGETS[key]).padStart(4)} KB${key.startsWith('tex') ? '   ' : ' gz'}  ${what}`);
}
if (failed) {
  console.error('A budget is blown (scripts/budget.mjs): make the start lighter, or load the new part when it is used.');
  process.exit(1);
}
