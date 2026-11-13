// The memory ceilings (docs/stability-plan.md, Phase 5; the owner's pick: run on demand, `npm run memcheck` after
// `npm run build` and `npm run bake:textures`, or the "Memory" Action). A headless Chromium opens the built site as a
// phone (390 x 844, touch: the low tier) under ?bench, which loads every district and builds the whole city, waits
// for every site to be built, and holds what the city holds in the City view (which keeps every tile) to
// MEMORY_CEILINGS in targets.ts: geometry, textures and render targets. It also holds targets.ts's formula for the
// render targets to what the phone really has (so the desktop's ceilings, which only the formula checks, stay true),
// and fails on any page error or NaN warning in the console.
//   npm run memcheck -- soak   then the leak check: SOAK_MIN minutes (20), half in the City view, half walking,
//                              red if geometry or textures keep climbing once the city is built
//   CHROMIUM_PATH=...          the browser (default: Playwright's own, else /opt/pw-browsers/chromium)
// Slow (about 20 minutes to build the city in the software renderer), so it isn't in the Build site Action.
import { createServer } from 'node:http';
import { existsSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';

const DIST = resolve(process.env.DIST ?? 'dist');
if (!existsSync(join(DIST, 'index.html'))) {
  console.error('[memcheck] no built site: run `npm run build` (and `npm run bake:textures`) first');
  process.exit(1);
}
const SOAK = process.argv.includes('soak');
const SOAK_MIN = Number(process.env.SOAK_MIN ?? 20);
const MiB = 1048576;

// The ceilings and the formula, from the city's own DOM-free rules file
const out = join(mkdtempSync(join(tmpdir(), 'memcheck-')), 'targets.mjs');
await build({ entryPoints: ['src/scripts/city3d/targets.ts'], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const { MEMORY_CEILINGS, pictureBytes } = await import(pathToFileURL(out).href);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.bin': 'application/octet-stream', '.ktx2': 'image/ktx2', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = join(DIST, p);
  if (!f.startsWith(DIST) || !existsSync(f)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream' }).end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const VIEW = { width: 390, height: 844 };
const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`page error: ${e.message}`));
page.on('console', (m) => {
  if (/NaN/.test(m.text())) errors.push(`NaN: ${m.text().slice(0, 200)}`);
});
const t0 = Date.now();
const secs = () => Math.round((Date.now() - t0) / 1000);
const fail = [];

/** What the city holds now (?fps's `__mem()`), in MiB, and the pixel ratio it draws at */
const sample = () =>
  page.evaluate(() => {
    const m = window.__mem?.();
    const stats = document.querySelector('.city-stats')?.textContent ?? '';
    const px = Number(stats.match(/px ([\d.]+)/)?.[1] ?? 0);
    return m ? { geometry: m.total.geometry / 1048576, textures: m.total.textures / 1048576, targets: m.targets / 1048576, waiting: m.works.waiting, tier: m.tier, px } : null;
  });

try {
  await page.goto(`http://127.0.0.1:${server.address().port}/?bench&fps`, { timeout: 600000 });
  // Every site built: nothing waiting twice in a row (a district arriving adds more), 40 minutes at the most
  let still = 0;
  let s = null;
  for (let last = -1; secs() < 2400; ) {
    await page.waitForTimeout(15000);
    s = await sample();
    if (!s) continue;
    if (s.waiting !== last) console.log(`[memcheck] ${secs()}s: ${s.waiting} sites waiting, geometry ${s.geometry.toFixed(0)} MiB`);
    last = s.waiting;
    still = s.waiting === 0 ? still + 1 : 0;
    if (still >= 2) break;
  }
  if (!s || still < 2) throw new Error('the city never finished building (40 minutes)');
  if (s.tier !== 'low') fail.push(`the phone took the ${s.tier} tier, not low`);

  // The ceilings
  const c = MEMORY_CEILINGS.phone;
  const row = (what, v, max) => {
    const over = v > max;
    console.log(`${over ? 'OVER' : 'ok  '} ${what.padEnd(10)} ${v.toFixed(1).padStart(6)} MiB of ${String(max).padStart(4)} MiB`);
    if (over) fail.push(`${what} ${v.toFixed(1)} MiB, over its ${max} MiB ceiling`);
  };
  row('geometry', s.geometry, c.geometry);
  row('textures', s.textures, c.textures);
  row('targets', s.targets, c.targets);

  // The formula against what the phone holds (the low tier: no MSAA, SMAA or shadows, the bloom at 0.3)
  const formula = pictureBytes({ width: VIEW.width * s.px, height: VIEW.height * s.px, msaa: 0, smaa: false, bloomScale: 0.3, shadowMap: 0 }) / MiB;
  const off = Math.abs(formula - s.targets) / Math.max(s.targets, 1e-6);
  console.log(`${off > 0.1 ? 'OFF ' : 'ok  '} formula    ${formula.toFixed(1).padStart(6)} MiB for ${s.targets.toFixed(1)} MiB measured (px ${s.px})`);
  if (off > 0.1) fail.push(`targets.ts's formula is ${(off * 100).toFixed(0)}% off what the phone holds: post.ts or sky.ts changed without it`);

  if (SOAK) {
    // Half in the City view (the benchmark's route, then still), half walking: sampled every 30 s, or ten times
    // each half if that's shorter
    const half = (SOAK_MIN * 60000) / 2;
    const every = Math.min(30000, half / 10);
    const series = { city: [], walk: [] };
    const watch = async (into, until, step) => {
      while (Date.now() < until) {
        if (step) await step();
        await page.waitForTimeout(every);
        const v = await sample();
        if (v) into.push(v);
      }
    };
    console.log(`[memcheck] soak: ${SOAK_MIN} minutes, half in the City view, half walking`);
    await watch(series.city, Date.now() + half);
    await page.evaluate(() => document.querySelector('[data-walk-toggle]')?.click());
    await page.waitForFunction(() => document.body.classList.contains('is-walking'), null, { timeout: 300000, polling: 1000 });
    let turn = 0;
    await page.keyboard.down('w');
    await watch(series.walk, Date.now() + half, async () => {
      // (a turn now and then, so he walks somewhere new rather than into one wall)
      const key = ++turn % 2 ? 'a' : 'd';
      await page.keyboard.down(key);
      await page.waitForTimeout(600);
      await page.keyboard.up(key);
    });
    await page.keyboard.up('w');
    const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
    for (const [part, list] of Object.entries(series)) {
      if (list.length < 6) {
        fail.push(`soak (${part}): too few samples (${list.length})`);
        continue;
      }
      const third = Math.floor(list.length / 3);
      for (const k of ['geometry', 'textures']) {
        const first = mean(list.slice(0, third).map((v) => v[k]));
        const last = mean(list.slice(-third).map((v) => v[k]));
        const max = Math.max(...list.map((v) => v[k]));
        // (climbing: the last third over the first by more than 10% and 4 MiB; and never over the ceiling)
        const climbs = last > first * 1.1 + 4;
        console.log(`${climbs ? 'LEAK' : 'ok  '} soak ${part.padEnd(4)} ${k.padEnd(9)} ${first.toFixed(0).padStart(4)} to ${last.toFixed(0).padStart(4)} MiB (most ${max.toFixed(0)})`);
        if (climbs) fail.push(`soak (${part}): ${k} climbed from ${first.toFixed(0)} to ${last.toFixed(0)} MiB`);
        if (max > MEMORY_CEILINGS.phone[k]) fail.push(`soak (${part}): ${k} reached ${max.toFixed(0)} MiB, over its ceiling`);
      }
    }
  }
} catch (e) {
  fail.push(e.message.split('\n')[0]);
}
await browser.close();
server.close();
for (const e of errors.slice(0, 10)) fail.push(e);
if (fail.length) {
  for (const f of fail) console.error(`[memcheck] FAILED: ${f}`);
  if (fail.some((f) => /ceiling/.test(f))) console.error('[memcheck] over a ceiling: make it lighter, or raise MEMORY_CEILINGS (targets.ts) on purpose, saying why');
  process.exit(1);
}
console.log(`[memcheck] the city is within its memory ceilings (${secs()} s)`);
