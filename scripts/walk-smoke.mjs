// A smoke test of walk mode in the built site (`npm run smoke` after `npm run build`): a headless Chromium opens the
// city and plays through it a scene at a time, each from a fresh page at its own spot: waking in his room (out of
// the front door once the street is in), home (in through Degen's front
// door, down the hall, out again), his garage's menu, the car (in at his garage, out through its door, a drive, out), on foot (walk, sprint,
// jump, crouch, the hub open and closed), the gun store's counter, the metro (the station's card, a ride, skipped to
// the end), a kart race (the clubhouse's menu, a single race, quit), flying (into your aircraft in the hangar,
// rolling out) and the gamepad (a made-up pad: the stick, A, Start, B). It fails on any page error, any NaN geometry
// in the console, or a step that didn't happen.
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
  // Geometry with NaN corners fails it too (three's bounding-box warning, or the city leaving the triangles out): on
  // a real GPU it can black the screen out (docs/stability-plan.md), though this software renderer draws on
  page.on('console', (m) => {
    if (/NaN/.test(m.text())) errors.push(m.text().slice(0, 300));
  });
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
    // (no spot given: he wakes where everyone does, in his room at home, docs/spawn-plan.md)
    await page.goto(`http://127.0.0.1:${server.address().port}/?fps${spawn ? `&spawn=${spawn}` : ''}`);
    await t.click('[data-start-guest]');
    // (Single player goes straight into walking)
    await t.click('[data-start-single]');
    await until('the start menu to go', () => !document.querySelector('.has-start'), null, 600000);
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

// Waking up (docs/spawn-plan.md): no spot given, so he starts where every visit does, in his room; the front door
// waits ("Getting ready…") until the street outside is built, then out he goes
await scene('wake', null, async (t) => {
  const [x, z] = await t.where();
  if (!(z > 385.0 && z < 391.3 && x > -237.7 && x < -228.9)) throw new Error(`woke at ${x}, ${z}, not in the room`);
  await t.step(`woke in the room, at ${x}, ${z}`);
  // (sat on the sofa: up off it a moment after the menu's gone, onto the spot in front of it, the view swung behind him)
  await t.until('him to stand up', () => {
    const m = document.querySelector('.city-stats')?.textContent.match(/at (-?[\d.]+), (-?[\d.]+)/);
    return !!m && Number(m[1]) < -235.0;
  });
  await t.step(`stood up, at ${(await t.where()).join(', ')}`);
  // (the camera looking west, at the media wall: its forward is -z of its matrix, so -x of the world is its +x)
  await t.until('the view to swing round behind him', () => (window.__city?.camera.matrixWorld.elements[8] ?? 0) > 0.85);
  await t.step('the view behind him');
  // (to the front door: he faces the telly on the media wall, west (docs/interior-plan.md Phase 1), so W takes him a
  // step off the sofa, D north past its end and S back east along the front wall to the hall and the door; its prompt
  // reads "Getting ready…" until the street is in)
  await t.go('w', 0.2, 'stepped off the sofa');
  await t.go('d', 1.3, 'past the sofa\'s end');
  // (asked short: at a frame or two a second he coasts on half a tile or more, and the door's prompt is within 1 of it)
  await t.go('s', 1.6, 'and along to the front door');
  await t.prompt('Front door');
  await t.until('him to be outside', () => {
    const m = document.querySelector('.city-stats')?.textContent.match(/at (-?[\d.]+), (-?[\d.]+)/);
    return !!m && Number(m[2]) < 384.5;
  });
  await t.step('out by the front door');
});

// Turning while he gets up (the owner's report, 2026-11-18: after the couch the view wouldn't turn): the view dragged
// round by hand as he stands must stay where it's put, not be pulled back behind him
await scene('wakelook', null, async (t) => {
  await t.until('him to stand up', () => {
    const m = document.querySelector('.city-stats')?.textContent.match(/at (-?[\d.]+), (-?[\d.]+)/);
    return !!m && Number(m[2]) > 385.95;
  });
  await t.step('stood up');
  // (a drag across the canvas: the view turns, walk.ts look())
  const yawOf = () => t.page.evaluate(() => { const e = window.__city.camera.matrixWorld.elements; return Math.atan2(-e[8], -e[10]); });
  const box = await t.page.locator('canvas').first().boundingBox();
  const [cx, cy] = [box.x + box.width / 2, box.y + box.height / 2];
  await t.page.mouse.move(cx, cy);
  await t.page.mouse.down();
  for (let i = 1; i <= 10; i++) await t.page.mouse.move(cx + i * 30, cy);
  await t.page.mouse.up();
  const turned = await yawOf();
  await t.step(`turned the view by hand, to ${turned.toFixed(2)}`);
  // (some frames later it's still where it was put: the swing behind him let go)
  await t.until('a few frames', () => true);
  await t.page.waitForTimeout(4000);
  const after = await yawOf();
  const off = Math.abs(Math.atan2(Math.sin(after - turned), Math.cos(after - turned)));
  if (off > 0.15) throw new Error(`the view was pulled back: ${turned.toFixed(2)} to ${after.toFixed(2)}`);
  await t.step(`still there (${after.toFixed(2)})`);
});

// Home (home.ts): in the yard of Degen's compound in the far west, in through his front door (a fade into the room), a
// few steps in, and out again by the same door
await scene('home', '-232.8,383.45,3.14', async (t) => {
  const inside = () => t.until('him to be inside', () => {
    const m = document.querySelector('.city-stats')?.textContent.match(/at (-?[\d.]+), (-?[\d.]+)/);
    return !!m && Number(m[2]) > 385.0 && Number(m[2]) < 391.3;
  });
  await t.prompt('Go in');
  await inside();
  await t.step(`inside, at ${(await t.where()).join(', ')}`);
  // (back as far as he went: a fixed 1.0 left him wherever the walk in's coasting put him, at a frame or two a
  // second sometimes nearer another prompt than the door's)
  const hall = await t.where();
  await t.go('w', 1.2, 'walked down the hall');
  const down = await t.where();
  await t.go('s', Math.hypot(down[0] - hall[0], down[1] - hall[1]), 'and back to the door');
  await t.prompt('Front door');
  await t.until('him to be outside', () => {
    const m = document.querySelector('.city-stats')?.textContent.match(/at (-?[\d.]+), (-?[\d.]+)/);
    return !!m && Number(m[2]) < 384.5;
  });
  await t.step('out by the front door');
});

// His garage's menu: in the yard by the pier between its two doors, the garage menu open and closed
await scene('homegarage', '-238.35,380', async (t) => {
  await t.prompt('Garage');
  await t.until('the garage menu', () => !!document.querySelector('[data-garage]:not([hidden])'));
  await t.step('the garage menu opened at home');
  await t.click('[data-garage-close]');
  await t.until('the garage menu to close', () => !document.querySelector('[data-garage]:not([hidden])'), null, 60000);
  await t.step('the garage menu closed');
});

// Up through the house (docs/compound-plan.md Phase 3): at the stairs' foot in his room, up to the landing (a fade),
// on up through the hatch to the roof terrace, a few steps along the rail, and down to the landing again
const shows = (label) => (l) => (document.querySelector('[data-walk-prompt]:not([hidden])')?.textContent ?? '').includes(l);
await scene('hometerrace', '-230.25,387.5,3.14', async (t) => {
  await t.prompt('Upstairs');
  await t.until('the way up to the roof to show (he is on the landing)', shows(), 'Roof', 120000);
  await t.step(`up on the landing, at ${(await t.where()).join(', ')}`);
  await t.prompt('Roof');
  await t.until('the way down to show (he is on the terrace)', shows(), 'Downstairs', 120000);
  await t.step(`up on the terrace, at ${(await t.where()).join(', ')}`);
  await t.go('w', 1.5, 'walked along the terrace');
  await t.go('s', 1.3, 'and back to the hatch');
  await t.prompt('Downstairs');
  await t.until('the way up to the roof to show (he is back on the landing)', shows(), 'Roof', 120000);
  await t.step('down on the landing again');
});

// Upstairs, the office's desk (docs/compound-plan.md Phase 3): it opens the business card, which closes again
await scene('homedesk', '-235.25,389.95,3.14,1.45', async (t) => {
  await t.prompt('Desk');
  await t.until('the business card', () => !!document.querySelector('.city.is-hub'), null, 60000);
  await t.step('the business card opened at the desk');
  await t.page.keyboard.press('Escape');
  await t.until('the card to close', () => !document.querySelector('.city.is-hub'), null, 60000);
  await t.step('the card closed');
});

// Down to his basement (docs/compound-plan.md Phase 4): by the stairs in his room, down the steps (a fade), a few
// steps into the den, back, and up again
await scene('homeden', '-230.25,385.65,3.14', async (t) => {
  const z = () => Number(document.querySelector('.city-stats')?.textContent.match(/at (-?[\d.]+), (-?[\d.]+)/)?.[2] ?? NaN);
  await t.prompt('Basement');
  await t.until('him down in the den (past the steps\' foot)', `(${z})() > 387.3`, null, 120000);
  await t.step(`down in the den, at ${(await t.where()).join(', ')}`);
  const foot = await t.where();
  await t.go('w', 1.2, 'walked into the den');
  const there = await t.where();
  await t.go('s', Math.hypot(there[0] - foot[0], there[1] - foot[1]), 'and back to the steps');
  await t.prompt('Upstairs');
  await t.until('him back in the room by the stairs', `(${z})() < 387`, null, 120000);
  await t.step('up in the room again');
});

// His workshop's roller door (docs/ends-far-west-plan.md Phase 2): the garage's menu, opened on its kit
await scene('homeworkshop', '-233.7,373.15', async (t) => {
  await t.prompt('Workshop');
  await t.until('the garage menu on its kit', () => !!document.querySelector('[data-garage]:not([hidden]) [data-tab="kit"][aria-selected="true"], [data-garage]:not([hidden]) [data-tab="kit"].is-on, [data-garage]:not([hidden]) [data-tab="kit"][aria-pressed="true"]'));
  await t.step('the garage menu opened on its kit at the workshop');
  await t.click('[data-garage-close]');
  await t.until('the garage menu to close', () => !document.querySelector('[data-garage]:not([hidden])'), null, 60000);
  await t.step('the garage menu closed');
});

// In his house (home.ts HOME_USES): at the den's vault (docs/interior-plan.md Phase 1), the stash's card opens and
// closes; at the wardrobe upstairs, the fitting room opens in Drop 001's panel and closes
await scene('homestash', '-232.5,385.55,0,-1.17', async (t) => {
  await t.prompt('Stash');
  await t.until('the stash card', () => !!document.querySelector('[data-stash]:not([hidden]) [data-stash-inv]'));
  await t.step('the stash opened');
  await t.click('[data-stash-close]');
  await t.until('the stash to close', () => !document.querySelector('[data-stash]:not([hidden])'), null, 60000);
  await t.step('the stash closed');
});
// (the wardrobe is the dressing room's rails upstairs now, docs/interior-plan.md Phase 3)
await scene('homewardrobe', '-233.05,387.27,3.14,1.45', async (t) => {
  await t.prompt('Wardrobe');
  await t.until('the fitting room', () => !!document.querySelector('[data-panel]:not([hidden]) [data-fit-items]'));
  await t.step('the fitting room opened at the wardrobe');
  await t.click('[data-panel-close]');
  await t.until('the fitting room to close', () => !document.querySelector('[data-panel] [data-fit-items]') || !!document.querySelector('[data-panel][hidden]'), null, 60000);
  await t.step('the fitting room closed');
});

// The car: beside it in Degen's garage at home (home.ts CAR_HOME), in, out through the door and down the driveway, out
await scene('car', '-241.3,379.3', async (t) => {
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

// Things worth carrying (docs/inventory-plan.md Phase 5): an energy drink bought at an Uptown coffee cart (inventory.ts
// SELLERS), drunk from the hotbar, its boost's chip counting down
await scene('items', '-184.3,0.55', async (t) => {
  await t.prompt('Energy drink');
  await t.until('an energy drink in the hotbar', () => [...document.querySelectorAll('.hb-slot')].some((s) => /Energy/.test(s.getAttribute('aria-label') ?? '')));
  await t.step('an energy drink bought');
  const i = await t.page.evaluate(() => [...document.querySelectorAll('.hb-slot')].findIndex((s) => /Energy/.test(s.getAttribute('aria-label') ?? '')));
  await t.page.keyboard.press(`Digit${i + 1}`);
  await t.until('its chip counting down', () => /\d+s/.test(document.querySelector('[data-boosts]:not([hidden])')?.textContent ?? ''), null, 60000);
  await t.step('drunk: its chip counting down');
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
  await t.until('the station card', () => !!document.querySelector('[data-metro]:not([hidden]) [data-trip^="metro:"]'));
  await t.step('the station card opened (both lines)');
  await t.click('[data-metro] [data-trip^="metro:"]');
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

// Endswood's sky network (southsky.ts): at The Core's lift door (its north face), up to the third floor and down again;
// then from the foot of its stair (its south face, facing up it) walked up to its landing
const upNow = () => Number(document.querySelector('.city-stats')?.textContent.match(/ · up ([\d.]+)/)?.[1] ?? 0);
await scene('sky', '-50.15,370.6,2.926', async (t) => {
  await t.prompt('Lift');
  await t.until('the lift card', () => !!document.querySelector('[data-metro]:not([hidden]) [data-lift-to="3"]'));
  await t.step('the lift card opened');
  await t.click('[data-lift-to="3"]');
  await t.until('up on the third floor', (f) => Number(document.querySelector('.city-stats')?.textContent.match(/ · up ([\d.]+)/)?.[1] ?? 0) > 3, null, 120000);
  await t.step(`up on the third floor (${(await t.page.evaluate(upNow)).toFixed(1)})`);
  await t.prompt('Lift');
  await t.until('the lift card again', () => !!document.querySelector('[data-metro]:not([hidden]) [data-lift-to="0"]'));
  await t.click('[data-lift-to="0"]');
  await t.until('back on the ground', () => !/ · up /.test(document.querySelector('.city-stats')?.textContent ?? ''), null, 120000);
  await t.step('back on the ground');
});
await scene('stair', '-56.6,377.6,-1.786', async (t) => {
  await t.go('w', 4, 'walked up the stair');
  await t.until('up the stair', () => Number(document.querySelector('.city-stats')?.textContent.match(/ · up ([\d.]+)/)?.[1] ?? 0) > 2, null, 60000);
  await t.step(`up the stair (${(await t.page.evaluate(upNow)).toFixed(1)})`);
});

// The Circus below ground (circus.ts, docs/south-plan.md Phase 4b): from the top of the north-east subway's ramp, down it,
// under the road and out on to the sunken plaza's floor
const downNow = () => Number(document.querySelector('.city-stats')?.textContent.match(/ · down ([\d.]+)/)?.[1] ?? 0);
await scene('circus', '-76.05,395.78,2.88', async (t) => {
  await t.go('w', 8, 'walked down the ramp');
  await t.until('down in the subway', () => Number(document.querySelector('.city-stats')?.textContent.match(/ · down ([\d.]+)/)?.[1] ?? 0) > 1.5, null, 60000);
  await t.step(`down in the subway (${(await t.page.evaluate(downNow)).toFixed(1)})`);
  await t.go('w', 9, 'walked under the road into the plaza');
  await t.until('on the plaza floor', () => Number(document.querySelector('.city-stats')?.textContent.match(/ · down ([\d.]+)/)?.[1] ?? 0) > 1.8, null, 60000);
  await t.step(`on the plaza floor (${(await t.page.evaluate(downNow)).toFixed(1)})`);
});

// An underpass (underpasses.ts, docs/south-plan.md Phase 4c): through the one under Endswood Road's bend, down one
// side, under the road and up the other
await scene('underpass', '23.67,384.43,1.198', async (t) => {
  await t.go('w', 10, 'walked down under the road');
  await t.until('down under the road', () => Number(document.querySelector('.city-stats')?.textContent.match(/ · down ([\d.]+)/)?.[1] ?? 0) > 1.5, null, 60000);
  await t.step(`under the road (${(await t.page.evaluate(downNow)).toFixed(1)})`);
  await t.go('w', 12, 'walked up the far side');
  await t.until('up at street level again', () => !/ · down /.test(document.querySelector('.city-stats')?.textContent ?? ''), null, 60000);
  await t.step('up at street level on the far side');
});

// The High Road's underground station (southline.ts, docs/south-plan.md Phase 4e): from the sidewalk in through its
// door, down its stairs (west), along the ticket hall and down the escalator to the platform
await scene('station', '-158.47,389.10,-0.295', async (t) => {
  await t.go('w', 2.9, 'in through the door to the middle of the landing');
  await t.go('a', 9, 'down the stairs to the ticket hall');
  await t.until('down in the ticket hall', () => Number(document.querySelector('.city-stats')?.textContent.match(/ · down ([\d.]+)/)?.[1] ?? 0) > 1.7, null, 60000);
  await t.step(`in the ticket hall (${(await t.page.evaluate(downNow)).toFixed(1)})`);
  await t.go('a', 16, 'along the hall and down the escalator');
  await t.until('down on the platform', () => Number(document.querySelector('.city-stats')?.textContent.match(/ · down ([\d.]+)/)?.[1] ?? 0) > 6, null, 60000);
  await t.step(`on the platform (${(await t.page.evaluate(downNow)).toFixed(1)})`);
});

// The Trenches' underground station (southline.ts, Phase 4f): from The Block's plaza by the raised station's tower,
// down its stairs (south-east) and on into the side of its ticket hall (the High Road's walk goes on down to a platform)
await scene('trenches', '-101.03,180.75,-2.581', async (t) => {
  await t.go('w', 12, 'down the stairs into the ticket hall');
  await t.until('down in the ticket hall', () => Number(document.querySelector('.city-stats')?.textContent.match(/ · down ([\d.]+)/)?.[1] ?? 0) > 1.7, null, 60000);
  await t.step(`in the ticket hall (${(await t.page.evaluate(downNow)).toFixed(1)})`);
});

// Lot 9's and Aldwyn's Green's underground stations (Phase 4f): down each one's stairs from the street into its ticket hall
for (const [name, spawn, far] of [
  ['lot9station', '-115.58,471.00,-3.062', 10],
  ['aldwynsstation', '-230.49,458.34,-1.736', 27],
]) {
  await scene(name, spawn, async (t) => {
    await t.go('w', far, 'down the stairs into the ticket hall');
    await t.until('down in the ticket hall', () => Number(document.querySelector('.city-stats')?.textContent.match(/ · down ([\d.]+)/)?.[1] ?? 0) > 1.7, null, 60000);
    await t.step(`in the ticket hall (${(await t.page.evaluate(downNow)).toFixed(1)})`);
  });
}

// The tube (tube-ui.ts, docs/south-plan.md Phase 4g): on Aldwyn's Green's platform, its card, a ride to the High Road
// seen from inside the carriage, skipped, stepping out on the High Road's platform
await scene('tube', '-213.5,440.4,0,-6.55', async (t) => {
  await t.prompt('Tube');
  await t.until('the tube card', () => !!document.querySelector('[data-metro]:not([hidden]) [data-trip="tube:highroad"]'));
  await t.step('the tube card opened');
  await t.click('[data-metro] [data-trip="tube:highroad"]');
  await t.until('the ride', () => !!document.querySelector('.city.is-riding'));
  await t.step('riding, inside the carriage');
  await t.page.waitForTimeout(7000);
  await t.step('riding on, the tunnel going by');
  await t.click('[data-metro-skip]');
  await t.until('the ride to end', () => !document.querySelector('.city.is-riding'));
  // (by the High Road platform's Tube door: the readout's once a second, so not the train's last place mid-ride)
  await t.until('him to step out at the High Road', ([x, z]) => {
    const m = document.querySelector('.city-stats')?.textContent.match(/at (-?[\d.]+), (-?[\d.]+)/);
    return !!m && Math.hypot(Number(m[1]) - x, Number(m[2]) - z) < 3;
  }, [-189.1, 376.8], 60000);
  await t.step(`stepped out at ${(await t.where()).join(', ')} (${(await t.page.evaluate(downNow)).toFixed(1)} down)`);
});

// Changing lines (trips.ts, tube-ui.ts, docs/south-plan.md Phase 4h): at Downtown's metro door, the card for both
// lines, a trip to the tube's High Road (the metro to The Trenches, the change, the tube on), skipped to its very end
await scene('change', '68.4,37.5', async (t) => {
  await t.prompt('Metro');
  await t.until('the card for both lines', () => !!document.querySelector('[data-metro]:not([hidden]) [data-trip="tube:highroad"]'));
  await t.step('the card for both lines');
  await t.click('[data-metro] [data-trip="tube:highroad"]');
  await t.until('the ride', () => !!document.querySelector('.city.is-riding'));
  await t.step('riding the metro towards The Trenches');
  await t.click('[data-metro-skip]');
  await t.until('the ride to end', () => !document.querySelector('.city.is-riding'));
  // (on the High Road's platform, by its Tube door)
  await t.until('him to step out at the High Road', ([x, z]) => {
    const m = document.querySelector('.city-stats')?.textContent.match(/at (-?[\d.]+), (-?[\d.]+)/);
    return !!m && Math.hypot(Number(m[1]) - x, Number(m[2]) - z) < 3;
  }, [-189.1, 376.8], 60000);
  await t.step(`stepped out at ${(await t.where()).join(', ')} (${(await t.page.evaluate(downNow)).toFixed(1)} down)`);
});

// The world map and a taxi (worldmap.ts, taxi.ts, loaded the first time one's called): the map open (M), the tube's
// Trenches station found (its line drawn, docs/south-plan.md Phase 4h), Taxi here, the taxi on its way, cancelled
await scene('taxi', '68.4,37.5', async (t) => {
  await t.page.keyboard.press('KeyM');
  await t.until('the world map', () => !!document.querySelector('[data-worldmap]:not([hidden])'));
  await t.page.selectOption('[data-wm-find]', 'tube-trenches');
  await t.until("the tube station's card", () => !!document.querySelector('[data-wm-card]:not([hidden]) [data-wm-act="taxi"]:not(:disabled)'));
  await t.step("the map: the tube's Trenches station");
  await t.click('[data-wm-act="taxi"]');
  await t.until('the taxi on its way', () => !!document.querySelector('[data-taxi]:not([hidden])'));
  await t.step(`the taxi called: ${await t.page.evaluate(() => document.querySelector('[data-taxi-text]')?.textContent ?? '')}`);
  await t.click('[data-taxi-cancel]');
  await t.until('the taxi sent away', () => !!document.querySelector('[data-taxi][hidden]'));
  await t.step('the taxi cancelled');
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
    // (held longer: headless, in software, the hub's frames come a second or two apart, so a shorter press can fall
    // between two of them; a real pad is read every frame)
    await press(1, 4000);
    await t.until('B to close the hub', () => !document.querySelector('.city.is-hub'), null, 60000);
    await t.step('B closed the hub');
  },
  () => {
    window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    navigator.getGamepads = () => [window.__pad];
  }
);

// The touch controls (walktouch.ts): fingers made up in the page (pointer events of the touch kind): the stick pushed
// up walks him and lets go when its finger lifts, Aim presses, a finger on Gas holds the pedal until it lifts
await scene('touch', '86,138.5', async (t) => {
  const finger = (sel, type, o = {}) =>
    t.page.evaluate(
      ([sel, type, o]) => {
        const el = sel === 'window' ? window : document.querySelector(sel);
        const r = sel === 'window' ? null : el.getBoundingClientRect();
        const at = r ? { clientX: r.left + r.width / 2 + (o.dx ?? 0), clientY: r.top + r.height / 2 + (o.dy ?? 0) } : { clientX: o.x ?? 0, clientY: o.y ?? 0 };
        el.dispatchEvent(new PointerEvent(type, { pointerId: o.id ?? 11, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true, ...at }));
      },
      [sel, type, o]
    );
  const from = await t.where();
  // (pushed well past the ring's top edge: full ahead, whatever size the ring is drawn)
  await finger('[data-walk-stick]', 'pointerdown', { id: 11, dy: -400 });
  await t.until('the stick to walk him', ([x, z]) => {
    const m = document.querySelector('.city-stats')?.textContent.match(/at (-?[\d.]+), (-?[\d.]+)/);
    return !!m && Math.hypot(Number(m[1]) - x, Number(m[2]) - z) >= 1.5;
  }, from);
  await t.until('the stick to be held', () => document.querySelector('[data-walk-stick]').classList.contains('is-held'), null, 30000);
  await t.step('the stick walked him');
  await finger('window', 'pointerup', { id: 11 });
  await t.until('the stick to be let go', () => !document.querySelector('[data-walk-stick]').classList.contains('is-held'), null, 30000);
  await t.step('the stick let go');
  await finger('[data-walk-aim]', 'pointerdown', { id: 12 });
  await t.until('Aim to be pressed', () => document.querySelector('[data-walk-aim]').getAttribute('aria-pressed') === 'true', null, 30000);
  await t.step('Aim pressed');
  await finger('[data-walk-aim]', 'pointerup', { id: 12 });
  await finger('[data-drive-gas]', 'pointerdown', { id: 13 });
  await t.until('Gas to be held', () => document.querySelector('[data-drive-gas]').classList.contains('is-held'), null, 30000);
  await finger('window', 'pointerup', { id: 13 });
  await t.until('Gas to be let go', () => !document.querySelector('[data-drive-gas]').classList.contains('is-held'), null, 30000);
  await t.step('Gas held and let go');
});

await browser.close();
server.close();
if (failed) {
  console.error(`[smoke] ${failed} scene${failed > 1 ? 's' : ''} failed`);
  process.exit(1);
}
console.log('[smoke] walk mode is fine');
