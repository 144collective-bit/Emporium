// Textures made at build time (performance phase 4, item 3 in docs/performance-plan.md). Run after
// `astro build` (`npm run bake:textures`; the "Build site" Action runs it). It opens the built site in a
// headless Chromium with ?bake-textures, where kit.ts's canvasTex() records every texture the boot paints
// with its key (what draws it, its size and how many like it came before), as phones see it ('low': big
// ones half size) and as everyone else does ('full'). Each set runs twice, with a fresh save at noon and a
// well-used one at midnight: only keys that come out the same both times are kept (a drawing function
// whose pictures or count differ is dropped whole), so a key always stands for the same picture. Those
// are GPU-compressed to KTX2 (Basis ETC1S, or UASTC where ETC1S loses too much: checked by decoding it
// again), written to _astro/tex/, and listed in the page (#city-tex in index.html) with the transcoder.
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import sharp from 'sharp';
import { chromium } from 'playwright-core';
import { encodeToKTX2 } from 'ktx2-encoder';

const DIST = resolve(process.argv[2] ?? 'dist');
/** Below this (dB) ETC1S lost too much against the canvas: UASTC instead */
const MIN_PSNR = 30;
const THREE_DIR = resolve('node_modules/three');
const THREE_VERSION = JSON.parse(readFileSync(join(THREE_DIR, 'package.json'), 'utf8')).version;
const log = (...a) => console.log('[bake:textures]', ...a);

/* ---------- The built site, served ---------- */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
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

/* ---------- A well-used save, made by the game's own rules ---------- */
async function richSave() {
  const dir = mkdtempSync(join(tmpdir(), 'tex-save-'));
  try {
    const city = resolve('src/scripts/city3d');
    const out = join(dir, 'save.mjs');
    await build({
      stdin: {
        contents: `
          import { newSave, addXp, buyUnit, buildUnit, buyLot, buildLot, buyCorner, buyPlot, buildPlot, upgradePlace, UNIT_KIND_IDS, LOT_KIND_IDS, CORNER_PLACES } from './tycoon';
          import { PLOT_IDS, BUILDINGS, cleanDesign } from '../../data/plots';
          export function make(now) {
            const s = newSave(now);
            s.dorras = 1e12;
            addXp(s, 1e9);
            for (let i = 0; i < 4; i++) { buyUnit(s, i); buildUnit(s, i, UNIT_KIND_IDS[i % UNIT_KIND_IDS.length]); }
            for (let i = 0; i < 3; i++) { buyLot(s, i); buildLot(s, i, LOT_KIND_IDS[i % LOT_KIND_IDS.length]); }
            for (let i = 0; i < CORNER_PLACES.length; i++) buyCorner(s, i);
            PLOT_IDS.slice(0, 10).forEach((id, i) => { buyPlot(s, id, now); buildPlot(s, id, cleanDesign({ type: BUILDINGS[i % BUILDINGS.length].type, rot: i % 4 })); });
            for (const p of ['stall', 'u0', 'u1', 'l0', 'c0', 'c1', 'workshop']) for (let k = 0; k < 2; k++) upgradePlace(s, p);
            return s;
          }`,
        resolveDir: city,
        loader: 'ts',
      },
      bundle: true,
      format: 'esm',
      platform: 'node',
      outfile: out,
      logLevel: 'error',
    });
    return (await import(pathToFileURL(out).href)).make(Date.parse('2026-06-01T00:00:00Z'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const RICH = await richSave();

/* ---------- What the boot paints ---------- */
const SETS = {
  low: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  full: { viewport: { width: 1280, height: 800 } },
};
const RUNS = [
  { name: 'fresh', time: '2026-06-01T12:00:00Z', save: null },
  { name: 'rich', time: '2026-06-01T23:30:00Z', save: RICH },
];
if (process.env.BAKE_SAME) RUNS[1] = { ...RUNS[0], name: 'fresh again' };
/** Anything going wrong: nothing is made at build time, and the site paints its textures as before */
async function notBaked(e) {
  console.log = silence;
  console.log(`::warning::[bake:textures] not baked: ${e?.message ?? e}`);
  await browser?.close().catch(() => {});
  server.close();
  process.exit(0);
}
const silence = console.log;
let browser = null;
browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  // (canvases painted on the CPU: the same pixels every run, so a picture that changed really did)
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-accelerated-2d-canvas', '--disable-gpu-rasterization'],
}).catch((e) => notBaked(e));

/** One run: every texture the boot painted, by key: its picture (PNG), a hash of it and its average colour */
async function paintRun(set, run) {
  const ctx = await browser.newContext(SETS[set]);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(run.time));
  await page.addInitScript((save) => {
    try {
      localStorage.setItem('city-card', 'hidden');
      if (save) localStorage.setItem('degen-city-tycoon-v1', JSON.stringify(save));
    } catch {}
  }, run.save);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${origin}/?bake-textures`);
  await page.waitForFunction(() => document.querySelector('[data-loader]')?.classList.contains('is-done'), null, { timeout: 600000, polling: 500 });
  // Painted with the site's own fonts, or not at all (a stand-in font would be baked in for everyone)
  const fonts = await page.evaluate(() => ['900 64px "Big Shoulders Display"', '700 32px "JetBrains Mono"'].every((f) => document.fonts.check(f)));
  if (!fonts) throw new Error(`${set}/${run.name}: the web fonts didn't load`);
  const got = await page.evaluate(async () => {
    const out = {};
    const tiny = document.createElement('canvas');
    tiny.width = tiny.height = 8;
    const t = tiny.getContext('2d', { willReadFrequently: true });
    for (const { key, canvas, src } of globalThis.__texBake ?? []) {
      // The far forms' average colour (lod.ts `average()`, worked out the same way)
      t.clearRect(0, 0, 8, 8);
      t.drawImage(canvas, 0, 0, 8, 8);
      const d = t.getImageData(0, 0, 8, 8).data;
      let r = 0, g = 0, b = 0, a = 0;
      for (let i = 0; i < d.length; i += 4) {
        const w = d[i + 3] / 255;
        r += d[i] * w;
        g += d[i + 1] * w;
        b += d[i + 2] * w;
        a += w;
      }
      const n = Math.max(a, 1e-3) * 255;
      out[key] = { src, png: canvas.toDataURL('image/png'), avg: [r / n, g / n, b / n, a / 64].map((v) => +v.toFixed(4)) };
    }
    return out;
  });
  await ctx.close();
  if (errors.length) log(`${set}/${run.name}: page errors`, errors.slice(0, 3));
  for (const v of Object.values(got)) v.hash = createHash('sha1').update(v.png).digest('hex');
  log(`${set}/${run.name}: ${Object.keys(got).length} textures painted`);
  return got;
}

/** The keys to keep: the same picture in every run, and every key of a drawing function with them */
function keep(runs) {
  const groups = new Map();
  const base = (k) => k.slice(0, k.lastIndexOf('-'));
  for (const run of runs) for (const k of Object.keys(run)) groups.set(base(k), new Set([...(groups.get(base(k)) ?? []), k]));
  const kept = [];
  let dropped = 0;
  for (const keys of groups.values()) {
    const ok = [...keys].every((k) => runs.every((r) => r[k] && r[k].hash === runs[0][k]?.hash));
    if (ok) kept.push(...keys);
    else {
      dropped += keys.size;
      if (process.env.BAKE_VERBOSE) log('dropped', [...keys][0], JSON.stringify((runs[0][[...keys][0]] ?? runs[1][[...keys][0]])?.src?.replace(/\s+/g, ' ').slice(0, 110)), runs.map((r) => [...keys].filter((k) => r[k]).length).join(' / '), [...keys].map((k) => (runs[0][k]?.png.length ?? 0) + (runs[1][k]?.png.length ?? 0)).reduce((a, b) => a + b, 0));
    }
  }
  return { kept, dropped };
}

/* ---------- GPU-compressed ---------- */
const BASIS = await (async () => {
  const file = join(THREE_DIR, 'examples/jsm/libs/basis/basis_transcoder.js');
  // (a script for browsers and Node alike: run here with Node's require)
  const factory = new Function('require', '__filename', '__dirname', `${readFileSync(file, 'utf8')}\nreturn BASIS;`)(createRequire(import.meta.url), file, resolve(file, '..'));
  const M = await factory({ wasmBinary: readFileSync(join(THREE_DIR, 'examples/jsm/libs/basis/basis_transcoder.wasm')) });
  M.initializeBasis();
  return M;
})();
/** A KTX2 file's top level as RGBA (to check it against the canvas) */
function decode(bytes) {
  const f = new BASIS.KTX2File(new Uint8Array(bytes));
  f.startTranscoding();
  const RGBA32 = 13;
  const dst = new Uint8Array(f.getImageTranscodedSizeInBytes(0, 0, 0, RGBA32));
  f.transcodeImage(dst, 0, 0, 0, RGBA32, 0, -1, -1);
  f.close();
  f.delete();
  return dst;
}
function psnr(a, b) {
  let se = 0;
  for (let i = 0; i < a.length; i += 4) {
    const w = a[i + 3] / 255;
    for (let k = 0; k < 3; k++) se += ((a[i + k] - b[i + k]) * w) ** 2;
    se += (a[i + 3] - b[i + 3]) ** 2;
  }
  const mse = se / a.length;
  return 10 * Math.log10(65025 / Math.max(mse, 1e-6));
}
const imageDecoder = async (buf) => {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
};
const encoded = new Map();
/**
 * A picture as KTX2: to a multiple of 4 (the GPU's blocks), upside down (a canvas texture goes up flipped,
 * a compressed one can't be), ETC1S, or UASTC when ETC1S strays too far from it
 */
async function encode(png) {
  const hash = createHash('sha1').update(png).digest('hex');
  if (encoded.has(hash)) return encoded.get(hash);
  const src = Buffer.from(png.split(',')[1], 'base64');
  const { width, height } = await sharp(src).metadata();
  const w = Math.ceil(width / 4) * 4;
  const h = Math.ceil(height / 4) * 4;
  const flipped = await sharp(src).resize(w, h, { fit: 'fill' }).flip().png().toBuffer();
  const raw = (await imageDecoder(flipped)).data;
  const common = { generateMipmap: true, isPerceptual: true, isKTX2File: true, imageDecoder };
  let bytes = await encodeToKTX2(new Uint8Array(flipped), { ...common, isUASTC: false, qualityLevel: 255, compressionLevel: 2 });
  let mode = 'etc1s';
  if (psnr(raw, decode(bytes)) < MIN_PSNR) {
    bytes = await encodeToKTX2(new Uint8Array(flipped), { ...common, isUASTC: true, needSupercompression: true, enableRDO: true, rdoQualityLevel: 1 });
    mode = 'uastc';
  }
  const out = { file: `tex/${createHash('sha1').update(bytes).digest('hex').slice(0, 16)}.ktx2`, bytes, mode, w, h };
  encoded.set(hash, out);
  return out;
}

/* ---------- Bake ---------- */
const sets = {};
const files = new Map();
try {
  for (const set of Object.keys(SETS)) {
    const runs = [];
    for (const run of RUNS) runs.push(await paintRun(set, run));
    const { kept, dropped } = keep(runs);
    const list = {};
    let etc1s = 0;
    let uastc = 0;
    let bytes = 0;
    for (const key of kept) {
      // (the encoder talks a lot)
      console.log = () => {};
      const e = await encode(runs[0][key].png).finally(() => (console.log = silence));
      list[key] = { file: e.file, w: e.w, h: e.h, avg: runs[0][key].avg };
      files.set(e.file, e.bytes);
      if (e.mode === 'etc1s') etc1s++;
      else uastc++;
      bytes += e.bytes.length;
    }
    sets[set] = list;
    log(`${set}: ${kept.length} kept (${etc1s} ETC1S, ${uastc} UASTC), ${dropped} left to paint, ${(bytes / 1e6).toFixed(2)} MB`);
  }
} catch (e) {
  await notBaked(e);
}
await browser.close();
server.close();

/* ---------- Into the site ---------- */
const ASTRO = join(DIST, '_astro');
mkdirSync(join(ASTRO, 'tex'), { recursive: true });
for (const [file, bytes] of files) writeFileSync(join(ASTRO, file), bytes);
// The transcoder, under three's version (its files' names carry no hash of their own)
const transcoder = `basis-${THREE_VERSION}/`;
cpSync(join(THREE_DIR, 'examples/jsm/libs/basis'), join(ASTRO, transcoder), { recursive: true, filter: (f) => !f.endsWith('.md') });
const manifest = JSON.stringify({ base: '/_astro/', transcoder, sets });
const page = join(DIST, 'index.html');
const html = readFileSync(page, 'utf8').replace(/<script type="application\/json" id="city-tex">.*?<\/script>/s, '');
// (before the page's own scripts, so the city's modules find it as they load)
writeFileSync(page, html.replace('</head>', `<script type="application/json" id="city-tex">${manifest}</script></head>`));
log(`${files.size} files, the list in index.html (${(manifest.length / 1024).toFixed(1)} KB)`);
