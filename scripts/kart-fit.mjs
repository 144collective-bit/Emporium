// Riverside Raceway's fit (docs/kart-harbour-plan.md, Phase 0 and 1): the new circuit (kartcircuit2.ts) drawn to scale on
// its site west of the Docks, with what's round it and where the venue's parts go, and its numbers checked.
//   npm run kart-fit            writes docs/kart-shots/riverside.webp and prints the numbers
// Bundled with esbuild first, as the seams report is (kartcircuit2.ts is DOM-free).
import { build } from 'esbuild';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const dir = mkdtempSync(join(tmpdir(), 'kart-fit-'));
try {
  const out = join(dir, 'k.mjs');
  await build({
    stdin: { contents: `export * from './kartcircuit2'; export { CIRCUIT } from './kartcircuit'; export { DOCKS_RECT } from './docks';`, resolveDir: resolve('src/scripts/city3d'), loader: 'ts' },
    outfile: out,
    bundle: true,
    format: 'esm',
    platform: 'node',
    packages: 'external',
    logLevel: 'error',
  });
  const m = await import(pathToFileURL(out).href);
  const C = m.CIRCUIT2;
  const S = m.SITE2;
  const n = C.x.length;
  // The numbers
  let rmin = Infinity;
  let slope = 0;
  for (let i = 0; i < n; i++) {
    rmin = Math.min(rmin, m.radius3([C.x[(i - 3 + n) % n], C.z[(i - 3 + n) % n]], [C.x[i], C.z[i]], [C.x[(i + 3) % n], C.z[(i + 3) % n]]));
    slope = Math.max(slope, Math.abs(C.y[(i + 1) % n] - C.y[i]) / C.step);
  }
  let gap = Infinity;
  for (let i = 0; i < n; i += 2)
    for (let j = i + 2; j < n; j += 2) {
      if (Math.min(j - i, n - (j - i)) * C.step < 40 || Math.abs(C.y[i] - C.y[j]) >= m.STACKED) continue;
      gap = Math.min(gap, Math.hypot(C.x[i] - C.x[j], C.z[i] - C.z[j]));
    }
  const r = (v, k = 1) => +v.toFixed(k);
  const report = { lap: r(C.L), today: r(m.CIRCUIT.L), times: r(C.L / m.CIRCUIT.L, 2), width: m.TRACK2_W, tightest: r(rmin), steepest: r(slope, 3), closest: r(gap), needed: r(2 * m.CLEAR2), tunnelPasses: C.crossings.length, hill: m.HILL_TOP };
  console.log(report);

  // The drawing: 4 px a unit, in world numbers, north up
  const P = 4;
  const [W0, Z0] = [S.x0 - 40, 60];
  const [W, H] = [(S.x1 - S.x0 + 110) * P, (S.z1 - Z0 + 40) * P];
  const wx = (x) => (x - W0) * P;
  const wz = (z) => (z - Z0) * P;
  const fu = (u) => wx(S.x0 + u);
  const fv = (v) => wz(S.z0 + v);
  const rect = (x0, z0, x1, z1, fill, extra = '') => `<rect x="${wx(x0)}" y="${wz(z0)}" width="${(x1 - x0) * P}" height="${(z1 - z0) * P}" fill="${fill}" ${extra}/>`;
  const zone = (u0, v0, u1, v1, name, fill) =>
    `${rect(S.x0 + u0, S.z0 + v0, S.x0 + u1, S.z0 + v1, fill, 'rx="6" opacity="0.9"')}<text x="${fu((u0 + u1) / 2)}" y="${fv((v0 + v1) / 2) + 6}" font-size="17" text-anchor="middle" fill="#1b1830" font-family="sans-serif" font-weight="700">${name}</text>`;
  const lab = (u, v, t) => `<text x="${fu(u)}" y="${fv(v)}" font-size="18" fill="#ffe9a8" font-family="sans-serif" font-style="italic" text-anchor="middle">${t}</text>`;
  const path = C.u.map((u, i) => `${i ? 'L' : 'M'}${fu(u).toFixed(1)},${fv(C.v[i]).toFixed(1)}`).join(' ') + 'Z';
  // The raised run drawn lighter (over the hill)
  const raised = [];
  for (let i = 0; i < n; i++) if (C.y[i] > 0.05) raised.push(`${raised.length && C.y[(i - 1 + n) % n] > 0.05 ? 'L' : 'M'}${fu(C.u[i]).toFixed(1)},${fv(C.v[i]).toFixed(1)}`);
  const [hu, hv] = [C.crossings.reduce((s, c) => s + C.u[c.lower], 0) / C.crossings.length, C.crossings.reduce((s, c) => s + C.v[c.lower], 0) / C.crossings.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="#2e6b46"/>
${rect(W0, 71, W0 + W / P, 131, '#2b5e9c')}<text x="20" y="${wz(101)}" font-size="26" fill="#dfe9ff" font-family="sans-serif">The river (the city across it, north)</text>
${rect(W0, 134, m.DOCKS_RECT[0], 140, '#4a4760')}<text x="20" y="${wz(139) + 24}" font-size="18" fill="#fff" font-family="sans-serif">riverside road ew4-w</text>
${rect(m.DOCKS_RECT[0], 131, W0 + W / P, S.z1 + 30, '#6b6880')}<text x="${wx(m.DOCKS_RECT[0] + 10)}" y="${wz(220)}" font-size="24" fill="#fff" font-family="sans-serif" transform="rotate(90 ${wx(m.DOCKS_RECT[0] + 10)} ${wz(220)})">Southbank Docks</text>
${rect(S.x0, S.z0, S.x1, S.z1, 'none', 'stroke="#f4c542" stroke-width="4" stroke-dasharray="14 10"')}
${zone(30, 2, 145, 12, 'Grandstand · café deck (river side)', '#ffd9a8')}
${zone(72, -14, 102, -2, 'River bus pier · gate', '#bfe3ff')}
${zone(4, 132, 62, 153, 'Workshops · tyres · hire', '#c8f0d0')}
${zone(66, 132, 122, 153, 'Paddock · kart wash', '#d9c8ff')}
${zone(126, 132, 172, 153, 'Race control', '#ffb3c7')}
<ellipse cx="${fu(hu)}" cy="${fv(hv)}" rx="${26 * P}" ry="${19 * P}" fill="#7a6a3c" opacity="0.85"/>
<path d="${path}" fill="none" stroke="#e6e2d8" stroke-width="${2 * m.CLEAR2 * P}" stroke-linejoin="round" opacity="0.3"/>
<path d="${path}" fill="none" stroke="#24222e" stroke-width="${m.TRACK2_W * P}" stroke-linejoin="round"/>
<path d="${raised.join(' ')}" fill="none" stroke="#5a5668" stroke-width="${m.TRACK2_W * P}" stroke-linejoin="round"/>
<path d="${path}" fill="none" stroke="#f4c542" stroke-width="2" stroke-dasharray="10 12"/>
${C.crossings.map((c) => `<circle cx="${fu(C.u[c.lower])}" cy="${fv(C.v[c.lower])}" r="18" fill="none" stroke="#ff5aa8" stroke-width="6"/>`).join('')}
${lab(128, 20, 'riverside straight')}${lab(176, 70, 'Docks wiggles')}${lab(160, 22, 'hairpin')}${lab(120, 44, 'winding descent')}${lab(120, 86, 'chicane')}${lab(12, 22, 'keyhole')}${lab(-2, 64, 'the esses')}${lab(26, 140, 'carousel')}${lab(118, 128, 'pit straight')}
<text x="20" y="${H - 84}" font-size="20" fill="#ffd1e6" font-family="sans-serif">grey: the raised hill-top run over the tunnel; pink rings: the two passes through the tunnel</text>
<text x="20" y="${H - 52}" font-size="24" fill="#fff" font-family="sans-serif" font-weight="700">Riverside Raceway: lap ${report.lap} (today ${report.today}, ${report.times}x), track ${report.width} wide</text>
<text x="20" y="${H - 20}" font-size="20" fill="#fff" font-family="sans-serif">tightest corner ${report.tightest} · steepest ramp ${report.steepest} · closest two runs ${report.closest} apart (${report.needed} needed) · hill ${report.hill} over the tunnel</text>
</svg>`;
  mkdirSync('docs/kart-shots', { recursive: true });
  await sharp(Buffer.from(svg)).webp({ quality: 82 }).toFile('docs/kart-shots/riverside.webp');
  console.log('drawn: docs/kart-shots/riverside.webp');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
