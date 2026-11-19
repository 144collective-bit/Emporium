// One-off: City-view pictures of the compound from one page: into the game, out of walking, the free camera on each
// view, Day then Night by the Settings buttons. Copied into the repo's root to run (playwright-core resolves from there)
import { createServer } from 'node:http';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
const [, , outDir, viewsArg, timesArg] = process.argv;
const views = JSON.parse(viewsArg);
const times = timesArg.split(',');
const DIST = resolve('dist');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.webp': 'image/webp', '.bin': 'application/octet-stream', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.ktx2': 'image/ktx2', '.avif': 'image/avif' };
const server = createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = join(DIST, p); if (!f.startsWith(DIST) || !existsSync(f)) return r.writeHead(404).end(); r.writeHead(200, { 'content-type': T[extname(f)] ?? 'application/octet-stream' }).end(readFileSync(f)); });
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
mkdirSync(outDir, { recursive: true });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' })).newPage();
page.on('pageerror', (e) => console.log('pageerror', String(e.stack ?? e).slice(0, 600)));
await page.goto(`http://127.0.0.1:${server.address().port}/?fps`, { timeout: 600000 });
const click = async (sel) => { await page.waitForSelector(sel, { state: 'attached', timeout: 600000 }); await page.evaluate((s) => document.querySelector(s).click(), sel); };
await click('[data-start-guest]');
await click('[data-start-single]');
await page.waitForFunction(() => document.body.classList.contains('is-walking'), null, { timeout: 900000, polling: 1000 });
console.log('walking');
await page.waitForTimeout(20000);
await click('[data-hub-leave]');
await page.waitForFunction(() => !document.body.classList.contains('is-walking'), null, { timeout: 300000, polling: 1000 });
console.log('city view');
await page.evaluate(() => {
  const st = document.createElement('style');
  st.textContent = '.city-stats,[data-ctrlcard]{display:none!important}';
  document.head.append(st);
});
const put = (v) =>
  page.evaluate((w) => {
    const c = globalThis.__city;
    c.camera.position.set(...w.pos);
    c.controls.target.set(...w.target);
    c.camera.lookAt(c.controls.target);
    c.controls.update();
    c.works?.want?.(w.target[0], w.target[2], 40);
  }, v);
for (const time of times) {
  await page.evaluate((t) => document.querySelector(`[data-time="${t}"]`)?.click(), time);
  for (const [i, v] of views.entries()) {
    await put(v);
    await page.waitForTimeout(i === 0 && time === times[0] ? 90000 : 25000);
    await put(v);
    await page.waitForTimeout(6000);
    await page.screenshot({ path: join(outDir, `${time}-${v.id}.png`), timeout: 600000 });
    console.log('shot', time, v.id);
  }
}
await b.close(); server.close();
console.log('ALLDONE');
