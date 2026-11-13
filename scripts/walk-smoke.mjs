// A smoke test of walk mode in the built site (`npm run smoke` after `npm run build`): a headless Chromium opens the
// city and plays through it a scene at a time, each from a fresh page at its own spot: home (Degen's front door, his
// panel), his garage's menu, the car (in at his garage, out through its door, a drive, out), on foot (walk, sprint,
// jump, crouch, the hub open and closed), the gun store's counter, the metro (the station's card, a ride, skipped to
// the end), a kart race (the clubhouse's menu, a single race, quit), flying (into your aircraft in the hangar,
// rolling out) and the gamepad (a made-up pad: the stick, A, Start, B). It fails on any page error or a step that
// didn't happen.
//   npm run smoke -- car,foot    only these scenes
// walk.ts has little of its own under unit tests (it's
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
const only = process.argv[2]?.split(',');
let failed = 0;

/** One scene: a fresh page at `spawn` (x,z), walking, then `play(t)`; a page error or a throw fails it */
async function scene(name, spawn, play, init) {
  if (only && !only.includes(name)) return;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  if (init) await page.addInitScript(init);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let n = 0;
  const step = async (what) => {
    console.log(`[smoke] ${name}: ok  ${what}`);
    if (shots) await page.screenshot({ path: join(shots, `${name}-${String(++n).padStart(2, '0')}.png`), timeout: 300000 }).catch(() => {});
  };
  /** Where Degen (or what he's in) is, from the ?fps readout ("at x, z") */
  const where = () =>
    page.evaluate(() => {
      const m = document.querySelector('.city-stats')?.textContent.match(/at (-?[\d.]+), (-?[\d.]+)/);
      return m ? [Number(m[1]), Number(m[2])] : null;
    });
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  /** Wait for something in the page, or fail saying what */
  const until = async (what, fn, arg, timeout = 180000) => {
    await page.waitForFunction(fn, arg, { timeout, polling: 500 }).catch(() => {
      throw new Error(`waited for: ${what}`);
    });
  };
  const t = {
    page,
    step,
    where,
    until,
    has: (sel) => page.evaluate((s) => !!document.querySelector(s), sel),
    click: (sel) => page.evaluate((s) => document.querySelector(s).click(), sel),
    /** Hold a key (and any `extra`) until he has moved `far` from where he was */
    async go(key, far, what, extra = []) {
      const from = await where();
      for (const k of [...extra, key]) await page.keyboard.down(k);
      try {
        await until(
          `${what}: ${far} tiles from ${from.join(', ')}`,
          ([x, z, far]) => {
            const m = document.querySelector('.city-stats')?.textContent.match(/at (-?[\d.]+), (-?[\d.]+)/);
            return !!m && Math.hypot(Number(m[1]) - x, Number(m[2]) - z) >= far;
          },
          [from[0], from[1], far]
        );
      } finally {
        for (const k of [key, ...extra]) await page.keyboard.up(k);
      }
      await step(`${what} (${dist(from, await where()).toFixed(1)} tiles)`);
    },
    /** The walk prompt reading `label`, then F */
    async prompt(label) {
      await until(`the "${label}" prompt`, (l) => (document.querySelector('[data-walk-prompt]:not([hidden])')?.textContent ?? '').toLowerCase().includes(l), label.toLowerCase(), 120000);
      await step(`the "${label}" prompt shows`);
      await page.keyboard.press('f');
    },
  };
  let why = '';
  try {
    // (no spot given: walking starts where it does for everyone, at home)
    await page.goto(`http://127.0.0.1:${server.address().port}/?fps${spawn ? `&spawn=${spawn}` : ''}`);
    await t.click('[data-start-guest]');
    await t.click('[data-start-single]');
    await until('the start menu to go', () => !document.querySelector('.has-start'), null, 600000);
    await t.click('[data-walk-toggle]');
    await until('walk mode', () => document.body.classList.contains('is-walking') && /at -?[\d.]+, -?[\d.]+/.test(document.querySelector('.city-stats')?.textContent ?? ''), null, 300000);
    await step(`walking, at ${(await where()).join(', ')}`);
    await play(t);
  } catch (e) {
    why = e.message.split('\n')[0];
    if (shots) await page.screenshot({ path: join(shots, `${name}-failed.png`), timeout: 300000 }).catch(() => {});
  }
  await ctx.close();
  if (why) console.error(`[smoke] ${name}: FAILED: ${why}`);
  for (const e of errors) console.error(`[smoke] ${name}: page error: ${e}`);
  if (why || errors.length) failed++;
}

// Home (home.ts): on Degen's front path in the Ends his door's prompt opens his panel (a new player's first walk
// starts downtown, so the spot is given)
await scene('home', '-189.75,363.25,3.14', async (t) => {
  await t.prompt('Home');
  await t.until('his panel', () => document.querySelector('#city-panel-title')?.textContent === 'Home');
  await t.step('the door opened his panel');
});

// His garage's menu: by its door on the driveway, the garage menu open and closed
await scene('homegarage', '-191.55,372.35', async (t) => {
  await t.prompt('Garage');
  await t.until('the garage menu', () => !!document.querySelector('[data-garage]:not([hidden])'));
  await t.step('the garage menu opened at home');
  await t.click('[data-garage-close]');
  await t.until('the garage menu to close', () => !document.querySelector('[data-garage]:not([hidden])'), null, 60000);
  await t.step('the garage menu closed');
});

// The car: beside it in Degen's garage at home (home.ts CAR_HOME), in, out through the door and down the driveway, out
await scene('car', '-188.7,375.2', async (t) => {
  await t.prompt('Get in');
  await t.until('in the car', () => !!document.querySelector('.city.is-driving'));
  await t.step('in the car');
  await t.go('w', 4, 'drove out of the garage');
  await t.page.keyboard.press('f');
  await t.until('out of the car', () => !document.querySelector('.city.is-driving'));
  await t.step('out of the car');
});

// On foot, out on the garage's forecourt (open ground all round): walk, sprint, jump, crouch, and the hub
await scene('foot', '86,138.5', async (t) => {
  await t.go('w', 1.5, 'walked');
  await t.go('w', 2.5, 'sprinted', ['Shift']);
  await t.page.keyboard.press('Space');
  await t.page.waitForTimeout(3000);
  await t.step('jumped');
  await t.page.keyboard.press('c');
  await t.go('s', 0.6, 'crouched and backed up');
  await t.page.keyboard.press('c');
  // (a first Esc may only free the mouse)
  for (let i = 0; i < 2 && !(await t.has('.city.is-hub')); i++) {
    await t.page.keyboard.press('Escape');
    await t.page.waitForTimeout(2500);
  }
  if (!(await t.has('.city.is-hub'))) throw new Error('the hub did not open on Esc');
  await t.step('the hub opened');
  await t.page.keyboard.press('Escape');
  await t.until('the hub to close', () => !document.querySelector('.city.is-hub'), null, 60000);
  if (!(await t.page.evaluate(() => document.body.classList.contains('is-walking')))) throw new Error('walking ended when the hub closed');
  await t.step('the hub closed, still walking');
});

// The gun store: at the Armoury's counter (solids.ts RACK), the store open and closed
await scene('guns', '50.7,54.7', async (t) => {
  await t.prompt('Gun store');
  await t.until('the gun store', () => !!document.querySelector('[data-shop]:not([hidden])'));
  await t.step('the gun store opened');
  await t.click('[data-shop-close]');
  await t.until('the gun store to close', () => !document.querySelector('[data-shop]:not([hidden])'), null, 60000);
  await t.step('the gun store closed');
});

// The metro: at Downtown station's door (metro.ts STATIONS), its card, a ride, skipped to the end
await scene('metro', '68.4,37.5', async (t) => {
  const from = await t.where();
  await t.prompt('Metro');
  await t.until('the station card', () => !!document.querySelector('[data-metro]:not([hidden]) [data-metro-to]'));
  await t.step('the station card opened');
  await t.click('[data-metro] [data-metro-to]');
  await t.until('the ride', () => !!document.querySelector('.city.is-riding'));
  await t.step('riding');
  await t.page.waitForTimeout(4000);
  await t.click('[data-metro-skip]');
  await t.until('the ride to end', () => !document.querySelector('.city.is-riding'));
  // (the readout is painted once a second: wait for it to say where he stepped out)
  await t.until('him to step out at another station', ([x, z]) => {
    const m = document.querySelector('.city-stats')?.textContent.match(/at (-?[\d.]+), (-?[\d.]+)/);
    return !!m && Math.hypot(Number(m[1]) - x, Number(m[2]) - z) > 30;
  }, from, 60000);
  await t.step(`stepped out at ${(await t.where()).join(', ')}`);
});

// A kart race: at the clubhouse's door (kartcircuit.ts HUT_DOOR), a single race started, driven a little, quit
await scene('karts', '-338.8,-46.9', async (t) => {
  await t.prompt('Clubhouse');
  await t.until('the clubhouse menu', () => !!document.querySelector('[data-karts]:not([hidden]) [data-kart-single]'));
  await t.step('the clubhouse menu opened');
  await t.click('[data-karts] [data-kart-single]');
  await t.until('the race', () => !!document.querySelector('.city.is-karting'), null, 300000);
  await t.step('on the grid');
  // (the lights, then the clock runs)
  await t.page.keyboard.down('w');
  const clock = () => t.page.evaluate(() => document.querySelector('[data-kart-clock]')?.textContent ?? '');
  const c0 = await clock();
  await t.until('the race clock to run', (c) => (document.querySelector('[data-kart-clock]')?.textContent ?? '') !== c, c0, 240000);
  await t.page.waitForTimeout(6000);
  await t.page.keyboard.up('w');
  await t.step(`racing, the clock at ${await clock()}`);
  // (two presses quit a race, the second while the first's ask still shows)
  for (let i = 0; i < 4 && (await t.has('.city.is-karting')); i++) {
    await t.page.keyboard.press('Escape');
    await t.page.waitForTimeout(500);
    await t.page.keyboard.press('Escape');
    await t.page.waitForTimeout(3000);
  }
  if (await t.has('.city.is-karting')) throw new Error('the race did not end on Esc');
  await t.step('quit the race');
});

// Flying: beside your aircraft in Hangar 1 (airfield.ts HANGAR_SPOT), in, rolling out under power
await scene('fly', '126.8,347.4', async (t) => {
  await t.prompt('Fly the');
  await t.until('in the aircraft', () => !!document.querySelector('.city.is-flying'));
  await t.step('in the aircraft');
  await t.go('w', 4, 'rolled out');
});

// The gamepad (walkpad.ts): a made-up pad in the page, the left stick pushed, A, then Start for the hub
await scene(
  'pad',
  '86,138.5',
  async (t) => {
    const from = await t.where();
    await t.page.evaluate(() => (window.__pad.axes[1] = -1));
    await t.until('the stick to walk him', ([x, z]) => {
      const m = document.querySelector('.city-stats')?.textContent.match(/at (-?[\d.]+), (-?[\d.]+)/);
      return !!m && Math.hypot(Number(m[1]) - x, Number(m[2]) - z) >= 1.5;
    }, from);
    await t.page.evaluate(() => (window.__pad.axes[1] = 0));
    await t.step('the left stick walked him');
    const press = async (i, ms = 1500) => {
      await t.page.evaluate((i) => (window.__pad.buttons[i] = { pressed: true, value: 1 }), i);
      await t.page.waitForTimeout(ms);
      await t.page.evaluate((i) => (window.__pad.buttons[i] = { pressed: false, value: 0 }), i);
      await t.page.waitForTimeout(ms);
    };
    await press(0);
    await t.step('A (jump)');
    await press(9);
    await t.until('Start to open the hub', () => !!document.querySelector('.city.is-hub'), null, 60000);
    await t.step('Start opened the hub');
    await press(1);
    await t.until('B to close the hub', () => !document.querySelector('.city.is-hub'), null, 60000);
    await t.step('B closed the hub');
  },
  () => {
    window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    navigator.getGamepads = () => [window.__pad];
  }
);

await browser.close();
server.close();
if (failed) {
  console.error(`[smoke] ${failed} scene${failed > 1 ? 's' : ''} failed`);
  process.exit(1);
}
console.log('[smoke] walk mode is fine');
