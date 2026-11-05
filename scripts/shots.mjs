// The blending plan's review shots (docs/blend-plan.md Phase 0). Run after `npm run build` (and the texture bake):
//   npm run shots -- <label>          e.g. phase-0, or phase-2-after
// It serves the built site and opens it in a headless Chromium with ?shots (shots.ts) as a desktop and as a phone,
// by day and at night, still (reduced motion: no traffic, so the same view is the same picture), at a fixed clock;
// waits for every site to be built, then puts the camera on each review view (blendviews.ts) in turn and shoots it.
// Full-size pictures go to shots/<label>/ (not kept in git); a contact sheet per tier and time of day (every view,
// small, with its name) to docs/blend-shots/<label>/, for the PR.
//   SHOTS_ONLY=view1,view2   only these views        SHOTS_SETS=full   only one tier        SHOTS_TIMES=day   only day
//   SHOTS_RESUME=1           keep the pictures already taken under this label (a long run cut short goes on)
//   SHOTS_EXTRA='[{"id":"x","name":"...","pos":[x,y,z],"target":[x,y,z]}]'  one-off cameras too (a close look, not a review view)
//   SHOTS_AT=2026-06-21T12:00:58Z  the clock at this time instead (what runs on the clock: the swing bridge, the tall ship)
//   SHOTS_MOTION=1           without reduced motion (what moves on the clock stands where it is at SHOTS_AT)
//   SHOTS_BENCH=1            also run ?bench on each tier (bench.ts) and keep its draws and triangles (headless and
//                            on the CPU: its frame times mean nothing, its draws, triangles and memory do)
//   CHROMIUM_PATH=...        the browser (default: Playwright's own, else /opt/pw-browsers/chromium)
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const resume = !!process.env.SHOTS_RESUME;
import { extname, join, resolve } from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright-core';

const label = (process.argv[2] ?? 'now').replace(/[^\w.-]/g, '-');
const DIST = resolve(process.env.DIST ?? 'dist');
if (!existsSync(join(DIST, 'index.html'))) {
  console.error('[shots] no built site: run `npm run build` first');
  process.exit(1);
}
const log = (...a) => console.log('[shots]', ...a);

/* ---------- The built site, served ---------- */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.ktx2': 'image/ktx2', '.bin': 'application/octet-stream', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = join(DIST, p);
  if (!f.startsWith(DIST) || !existsSync(f)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream' }).end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

/* ---------- The runs ---------- */
// (the phone: coarse pointer and a small screen, so the city picks the low tier, as the texture bake's 'low')
const SETS = {
  full: { viewport: { width: 1280, height: 800 } },
  low: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};
const TIMES = { day: '2026-06-01T12:00:00Z', night: '2026-06-01T23:30:00Z' };
const pick = (env, all) => (process.env[env] ? process.env[env].split(',').filter((k) => all.includes(k)) : all);
const sets = pick('SHOTS_SETS', Object.keys(SETS));
const times = pick('SHOTS_TIMES', Object.keys(TIMES));
const only = process.env.SHOTS_ONLY?.split(',');

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const out = resolve('shots', label);
const sheets = resolve('docs/blend-shots', label);
mkdirSync(out, { recursive: true });
mkdirSync(sheets, { recursive: true });

try {
  for (const set of sets)
    for (const time of times) {
      // (resuming: a set whose every view is taken is only made into its sheet again)
      const done = (id) => resume && existsSync(join(out, `${set}-${time}-${id}.png`));
      const ctx = await browser.newContext({ ...SETS[set], reducedMotion: process.env.SHOTS_MOTION ? 'no-preference' : 'reduce' });
      const page = await ctx.newPage();
      await page.clock.setFixedTime(new Date(process.env.SHOTS_AT || TIMES[time]));
      await page.addInitScript(() => {
        try {
          localStorage.setItem('city-card', 'hidden');
        } catch {}
      });
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      const t0 = Date.now();
      await page.goto(`${origin}/?shots${time === 'night' ? '=night' : ''}`);
      await page.waitForFunction(() => globalThis.__shots?.ready, null, { timeout: 1800000, polling: 1000 });
      log(`${set} ${time}: the city built in ${Math.round((Date.now() - t0) / 1000)} s`);
      const extra = process.env.SHOTS_EXTRA ? JSON.parse(process.env.SHOTS_EXTRA) : [];
      const all = [...(await page.evaluate(() => globalThis.__shots.views)), ...extra].filter((v) => !only || only.includes(v.id));
      const views = all.filter((v) => !done(v.id));
      // (the 3D view's box: the page screenshot clipped to it, with time for the software renderer's frame)
      const clip = await page.locator('[data-city3d]').boundingBox();
      const shot = all.filter((v) => done(v.id)).map((v) => ({ ...v, file: join(out, `${set}-${time}-${v.id}.png`) }));
      for (const v of views) {
        await page.evaluate((w) => globalThis.__shots.show(w.pos ? w : w.id), v);
        // A few frames drawn on the view, and what it asked for built
        await page.waitForFunction(() => globalThis.__shots.frames >= 12, null, { timeout: 600000, polling: 250 });
        await page.waitForTimeout(1500);
        const file = join(out, `${set}-${time}-${v.id}.png`);
        await page.screenshot({ path: file, clip, timeout: 600000 });
        shot.push({ ...v, file });
        log(`  ${v.id}`);
      }
      if (errors.length) log(`${set} ${time}: page errors:\n  ${errors.join('\n  ')}`);
      await ctx.close();
      shot.sort((a, b) => all.findIndex((v) => v.id === a.id) - all.findIndex((v) => v.id === b.id));
      await contactSheet(shot, join(sheets, `${set}-${time}.webp`), `${label} · ${set === 'low' ? 'phone' : 'desktop'} · ${time}`);
    }
  if (process.env.SHOTS_BENCH) {
    const rows = ['| Tier | View | Draws | Triangles | Shadow draws |', '|---|---|---|---|---|'];
    const mem = [];
    for (const set of sets) {
      const ctx = await browser.newContext(SETS[set]);
      const page = await ctx.newPage();
      await page.clock.setFixedTime(new Date(TIMES.day));
      await page.goto(`${origin}/?bench`);
      await page.waitForFunction(() => globalThis.__bench, null, { timeout: 3600000, polling: 2000 });
      const r = await page.evaluate(() => globalThis.__bench);
      writeFileSync(join(out, `bench-${set}.json`), JSON.stringify(r, null, 2));
      for (const v of r.views) rows.push(`| ${r.tier} | ${v.name} | ${v.draws} | ${(v.tris / 1e6).toFixed(2)}M | ${v.shadowDraws} |`);
      rows.push(`| ${r.tier} | Route | ${r.route.draws} | ${(r.route.tris / 1e6).toFixed(2)}M | ${r.route.shadowDraws} |`);
      mem.push(`- ${r.tier}: geometry ${(r.memory.geometry / 2 ** 20).toFixed(1)} MB, textures ${(r.memory.textures / 2 ** 20).toFixed(1)} MB, ${r.memory.objects} objects`);
      log(`bench ${set}: done`);
      await ctx.close();
    }
    writeFileSync(join(sheets, 'bench.md'), [`# ${label}: ?bench, headless (draws, triangles and memory only)`, '', ...rows, '', ...mem, ''].join('\n'));
  }
} finally {
  await browser.close();
  server.close();
}
log(`done: ${out} (full size), ${sheets} (contact sheets)`);

/** Every view small in a grid, each with its name under it, one picture */
async function contactSheet(shots, file, title) {
  if (!shots.length) return;
  const W = 480;
  const meta = await sharp(shots[0].file).metadata();
  const H = Math.round((W * meta.height) / meta.width);
  const cols = meta.width > meta.height ? 3 : 5;
  const cap = 26;
  const head = 40;
  const rows = Math.ceil(shots.length / cols);
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  const tiles = await Promise.all(
    shots.map(async (s, i) => {
      const img = await sharp(s.file).resize(W, H).toBuffer();
      const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${cap}"><rect width="100%" height="100%" fill="#0b0b14"/><text x="8" y="18" font-family="sans-serif" font-size="14" fill="#e8e8f0">${esc(s.name)}</text></svg>`);
      const x = (i % cols) * W;
      const y = head + Math.floor(i / cols) * (H + cap);
      return [
        { input: img, left: x, top: y },
        { input: text, left: x, top: y + H },
      ];
    })
  );
  const banner = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cols * W}" height="${head}"><text x="10" y="27" font-family="sans-serif" font-size="20" fill="#e8e8f0">${esc(title)}</text></svg>`);
  await sharp({ create: { width: cols * W, height: head + rows * (H + cap), channels: 3, background: '#0b0b14' } })
    .composite([{ input: banner, left: 0, top: 0 }, ...tiles.flat()])
    .webp({ quality: 72 })
    .toFile(file);
  log(`  sheet ${file}`);
}
