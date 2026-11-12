// A smoke test of walk mode in the built site (`npm run smoke` after `npm run build`): a headless Chromium opens the
// city, walks, sprints, jumps and crouches, opens and closes the hub, gets into the car on the garage's turntable,
// drives and gets out, and fails on any page error or a step that didn't happen. walk.ts has no unit tests (it's
// the view), so this is the check to run before and after changing it. It's slow in the headless software
// renderer (a few frames a second), so every step waits on what it expects, not on the clock.
//   CHROMIUM_PATH=...   the browser (default: Playwright's own, else /opt/pw-browsers/chromium)
//   SMOKE_SHOTS=dir     keep a picture after each step
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const DIST = resolve(process.env.DIST ?? 'dist');
if (!existsSync(join(DIST, 'index.html'))) {
  console.error('[smoke] no built site: run `npm run build` first');
  process.exit(1);
}
const shots = process.env.SMOKE_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.bin': 'application/octet-stream', '.ktx2': 'image/ktx2', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
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
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

/** Where Degen stands, from the ?fps readout ("at x, z") */
const where = () =>
  page.evaluate(() => {
    const m = document.querySelector('.city-stats')?.textContent.match(/at (-?[\d.]+), (-?[\d.]+)/);
    return m ? [Number(m[1]), Number(m[2])] : null;
  });
const moved = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
/** Hold a key until Degen (or what he's in) has moved `far` from where he was, or fail */
async function go(key, far, what, extra = []) {
  const from = await where();
  for (const k of [...extra, key]) await page.keyboard.down(k);
  try {
    await page.waitForFunction(
      ([x, z, far]) => {
        const m = document.querySelector('.city-stats')?.textContent.match(/at (-?[\d.]+), (-?[\d.]+)/);
        return !!m && Math.hypot(Number(m[1]) - x, Number(m[2]) - z) >= far;
      },
      [from[0], from[1], far],
      { timeout: 180000, polling: 500 }
    );
  } finally {
    for (const k of [key, ...extra]) await page.keyboard.up(k);
  }
  await step(`${what} (${moved(from, await where()).toFixed(1)} tiles)`);
}
let n = 0;
const step = async (what) => {
  console.log(`[smoke] ok  ${what}`);
  if (shots) await page.screenshot({ path: join(shots, `${String(++n).padStart(2, '0')}.png`), timeout: 300000 }).catch(() => {});
};
const has = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);

let failed = '';
try {
  // (straight onto the garage's turntable beside the car: solids.ts GARAGE_SITE)
  await page.goto(`http://127.0.0.1:${server.address().port}/?fps&spawn=83.9,143.35`);
  await page.evaluate(() => document.querySelector('[data-start-guest]').click());
  await page.evaluate(() => document.querySelector('[data-start-single]').click());
  await page.waitForFunction(() => !document.querySelector('.has-start'), null, { timeout: 600000, polling: 500 });
  await step('the city is up and the start menu gone');
  await page.evaluate(() => document.querySelector('[data-walk-toggle]').click());
  await page.waitForFunction(() => document.body.classList.contains('is-walking') && /at -?[\d.]+, -?[\d.]+/.test(document.querySelector('.city-stats')?.textContent ?? ''), null, { timeout: 300000, polling: 500 });
  await step(`walking, at ${(await where()).join(', ')}`);

  // The car first, while he stands by it: the prompt, in, a drive, out
  await page.waitForFunction(() => /get in/i.test(document.querySelector('[data-walk-prompt]:not([hidden])')?.textContent ?? ''), null, { timeout: 120000, polling: 500 });
  await step('the "Get in" prompt shows by the car');
  await page.keyboard.press('f');
  await page.waitForFunction(() => !!document.querySelector('.city.is-driving'), null, { timeout: 180000, polling: 500 });
  await step('in the car');
  await go('w', 4, 'drove');
  await page.keyboard.press('f');
  await page.waitForFunction(() => !document.querySelector('.city.is-driving'), null, { timeout: 180000, polling: 500 });
  await step('out of the car');

  // On foot
  await go('w', 1.5, 'walked');
  await go('w', 2.5, 'sprinted', ['Shift']);
  await page.keyboard.press('Space');
  await page.waitForTimeout(3000);
  await step('jumped');
  await page.keyboard.press('c');
  await go('s', 0.6, 'crouched and backed up');
  await page.keyboard.press('c');

  // The hub: Esc opens it (a first Esc may only free the mouse), Esc closes it
  for (let i = 0; i < 2 && !(await has('.city.is-hub')); i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2500);
  }
  if (!(await has('.city.is-hub'))) throw new Error('the hub did not open on Esc');
  await step('the hub opened');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.city.is-hub'), null, { timeout: 60000, polling: 500 });
  await step('the hub closed');
  if (!(await page.evaluate(() => document.body.classList.contains('is-walking')))) throw new Error('walking ended when the hub closed');
} catch (e) {
  failed = e.message.split('\n')[0];
  if (shots) await page.screenshot({ path: join(shots, 'failed.png'), timeout: 300000 }).catch(() => {});
}
await browser.close();
server.close();
if (failed) console.error(`[smoke] FAILED: ${failed}`);
for (const e of errors) console.error(`[smoke] page error: ${e}`);
if (failed || errors.length) process.exit(1);
console.log('[smoke] walk mode is fine');
