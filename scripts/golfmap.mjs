// The golf course's design map (docs/golf-plan.md): the course from its data (golf.ts, golfground.ts, both DOM-free),
// drawn from above: what's underfoot, the ground's shading and its contours every tile (about 1.8 m), each hole's line
// and number, the lakes, the clubhouse's grounds and the drive in. For the owner's sign-off on each phase's design.
//   npm run golfmap -- <label>        writes docs/golf-shots/<label>.png (default: layout)
//   GOLF_SCALE=3                      pixels a tile (default 2)
import { build } from 'esbuild';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const label = (process.argv[2] ?? 'layout').replace(/[^\w.-]/g, '-');
const S = Number(process.env.GOLF_SCALE ?? 2);
const dir = mkdtempSync(join(tmpdir(), 'golfmap-'));
try {
  const out = join(dir, 'golf.mjs');
  await build({
    stdin: { contents: `export * from './golf'; export * from './golfground';`, resolveDir: resolve('src/scripts/city3d'), loader: 'ts' },
    outfile: out,
    bundle: true,
    format: 'esm',
    platform: 'node',
    packages: 'external',
    logLevel: 'error',
  });
  const g = await import(pathToFileURL(out).href);
  const PAD = 30;
  const [X0, Z0, X1, Z1] = [g.COURSE_RECT[0] - PAD, g.COURSE_RECT[1] - PAD, g.COURSE_RECT[2] + PAD, g.COURSE_RECT[3] + PAD];
  const [W, H] = [Math.round((X1 - X0) * S), Math.round((Z1 - Z0) * S)];
  const COL = {
    water: [70, 140, 205],
    bunker: [236, 218, 160],
    green: [92, 196, 96],
    fringe: [110, 186, 100],
    tee: [104, 190, 104],
    fairway: [128, 196, 104],
    cut: [116, 176, 92],
    rough: [96, 150, 78],
    native: [128, 140, 84],
    grounds: [190, 184, 170],
    off: [150, 156, 150],
  };
  // The heights on the pixels' corners, then each pixel shaded by its slope towards the light (from the north-west)
  const hs = new Float32Array((W + 1) * (H + 1));
  for (let j = 0; j <= H; j++) for (let i = 0; i <= W; i++) hs[j * (W + 1) + i] = g.golfHeightAt(X0 + i / S, Z0 + j / S);
  const buf = Buffer.alloc(W * H * 3);
  const ci = 1; // contour interval (tiles)
  let [lo, hi] = [Infinity, -Infinity];
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const [x, z] = [X0 + (i + 0.5) / S, Z0 + (j + 0.5) / S];
      const s = g.surfaceAt(x, z);
      let c = COL[s ?? 'off'];
      const [a, b, d, e] = [hs[j * (W + 1) + i], hs[j * (W + 1) + i + 1], hs[(j + 1) * (W + 1) + i], hs[(j + 1) * (W + 1) + i + 1]];
      lo = Math.min(lo, a);
      hi = Math.max(hi, a);
      const gx = ((b - a + e - d) / 2) * S;
      const gz = ((d - a + e - b) / 2) * S;
      const shade = Math.max(0.55, Math.min(1.35, 1 - (gx + gz) * 1.6));
      c = c.map((v) => v * shade);
      // (a contour where a pixel's corners straddle a multiple of the interval; off the water)
      const k = Math.floor(Math.min(a, b, d, e) / ci);
      if (s !== 'water' && Math.floor(Math.max(a, b, d, e) / ci) > k && Math.max(a, b, d, e) - Math.min(a, b, d, e) < ci) c = c.map((v) => v * 0.72);
      buf.set(c.map((v) => Math.max(0, Math.min(255, Math.round(v)))), (j * W + i) * 3);
    }
  // The overlay: the club's edge, the drive, each hole's line and number, the clubhouse
  const px = ([x, z]) => `${((x - X0) * S).toFixed(1)},${((z - Z0) * S).toFixed(1)}`;
  const parts = [];
  parts.push(`<polygon points="${g.COURSE.map(px).join(' ')}" fill="none" stroke="#3b3b3b" stroke-width="${S}" stroke-dasharray="${4 * S},${3 * S}"/>`);
  parts.push(`<polyline points="${g.DRIVE.map(px).join(' ')}" fill="none" stroke="#6b5b4b" stroke-width="${3 * S}"/>`);
  const [gx0, gz0, gx1, gz1] = g.CLUB_GROUNDS;
  parts.push(`<rect x="${(gx0 - X0) * S}" y="${(gz0 - Z0) * S}" width="${(gx1 - gx0) * S}" height="${(gz1 - gz0) * S}" fill="none" stroke="#5a4a3a" stroke-width="${S}"/>`);
  const font = `font-family="DejaVu Sans, Arial, sans-serif" font-weight="bold"`;
  parts.push(`<text x="${(gx0 - X0 + 4) * S}" y="${(gz0 - Z0 + 16) * S}" ${font} font-size="${7 * S}" fill="#3a2a1a">CLUBHOUSE</text>`);
  for (const h of g.HOLES) {
    parts.push(`<polyline points="${h.line.map(px).join(' ')}" fill="none" stroke="#ffffff" stroke-opacity="0.75" stroke-width="${0.8 * S}" stroke-dasharray="${3 * S},${2 * S}"/>`);
    const [tx, tz] = h.line[0];
    const r = 6 * S;
    parts.push(`<circle cx="${(tx - X0) * S}" cy="${(tz - Z0) * S}" r="${r}" fill="#1d2b5a" stroke="#fff" stroke-width="${0.6 * S}"/>`);
    parts.push(`<text x="${(tx - X0) * S}" y="${(tz - Z0) * S + 2.6 * S}" text-anchor="middle" ${font} font-size="${7 * S}" fill="#fff">${h.n}</text>`);
    const [fx, fz] = g.flagOf ? g.flagOf(h) : h.line.at(-1);
    parts.push(`<circle cx="${(fx - X0) * S}" cy="${(fz - Z0) * S}" r="${1.2 * S}" fill="#d22"/>`);
  }
  for (const l of g.LAKES) parts.push(`<text x="${(l.at[0] - X0) * S}" y="${(l.at[1] - Z0) * S + 2 * S}" text-anchor="middle" ${font} font-size="${4.5 * S}" fill="#e8f4ff">${l.name}</text>`);
  for (const f of g.FEATURES.filter((f) => f.h >= 3))
    parts.push(`<text x="${(f.at[0] - X0) * S}" y="${(f.at[1] - Z0) * S}" text-anchor="middle" ${font} font-size="${5 * S}" fill="#24361d" fill-opacity="0.8">${f.name.replace(/'/g, '&#39;')}</text>`);
  // The key, top left
  const par = g.HOLES.reduce((s, h) => s + h.par, 0);
  const len = Math.round(g.HOLES.reduce((s, h) => s + g.lengthOf(h), 0));
  const rows = [`Sector 7 golf course: ${label}`, `18 holes, par ${par}, ${len} tiles (about ${Math.round((len * 1.8) / 10) * 10} m)`, `Contours every tile (1.8 m); ground ${lo.toFixed(1)} to ${hi.toFixed(1)} tiles`, `North is up; x ${Math.round(X0)} to ${Math.round(X1)}, z ${Math.round(Z0)} to ${Math.round(Z1)}`];
  rows.forEach((t, k) => parts.push(`<text x="${6 * S}" y="${(10 + k * 7) * S}" ${font} font-size="${5 * S}" fill="#111">${t}</text>`));
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${parts.join('')}</svg>`);
  mkdirSync('docs/golf-shots', { recursive: true });
  const file = join('docs/golf-shots', `${label}.png`);
  await sharp(buf, { raw: { width: W, height: H, channels: 3 } })
    .composite([{ input: svg, top: 0, left: 0 }])
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toFile(file);
  console.log(`[golfmap] ${file} (${W}x${H}); ground ${lo.toFixed(2)} to ${hi.toFixed(2)}; par ${par}, ${len} tiles`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
