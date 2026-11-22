// The motorway exits' fit (docs/exits-plan.md, Phase 0): a top-down drawing of each interchange, now and as the
// plan proposes it, unrolled along the ring, with what stands in the new layout's way outlined in red. It reads the
// city's own DOM-free data (the ring, the ramps, the street plan, every solid, the metro's pillars, the places), so it
// redraws as the city changes:
//   node scripts/exits-fit.mjs      (writes docs/exits-shots/exit-<n>-<side>.png and exits-overview.png)
// The proposed layer is the plan's standard (`STD`, `SYS` below); once the new exits are data (the plan's Phase 3),
// draw them from that instead.
import { build } from 'esbuild';
import sharp from 'sharp';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const TMP = join(ROOT, 'node_modules', '.cache', 'exits-fit');
mkdirSync(TMP, { recursive: true });
const entry = join(TMP, 'entry.ts');
const root = join(ROOT, 'src', 'scripts', 'city3d');
const src = readFileSync(root + '/solids.ts', 'utf8');
const lines = [];
const names = [];
for (const m of src.matchAll(/^import \{([^}]*)\} from '\.\/([\w-]+)';/gm)) {
  const parts = m[1].split(',').map((s) => s.trim()).filter(Boolean);
  const keep = parts.filter((p) => /SOLIDS|LINK_WALLS/.test(p));
  if (!keep.length) continue;
  const spec = keep.map((p) => { const [a, b] = p.split(/\s+as\s+/); const alias = 'G_' + (b ?? a); names.push([b ?? a, alias]); return `${a} as ${alias}`; });
  lines.push(`import { ${spec.join(', ')} } from '${root}/${m[2]}';`);
}
lines.push(`import { DOWNTOWN_SOLIDS as G_DOWNTOWN_SOLIDS, DUMMY_SOLIDS as G_DUMMY_SOLIDS } from '${root}/solids';`);
names.push(['DOWNTOWN_SOLIDS', 'G_DOWNTOWN_SOLIDS'], ['DUMMY_SOLIDS', 'G_DUMMY_SOLIDS']);
lines.push(`import { EXITS, RAMPS, RING_LEN, exitS, ringS, ringPoint, DECK_HALF, RAMP_HALF, QUAD, SLIP, REACH, BESIDE, OUTER_LANE } from '${root}/viaduct';`);
lines.push(`import { PLAN } from '${root}/streetplan';`);
lines.push(`import { PLACES } from '${root}/places';`);
lines.push(`import { UNITS, BIG_LOTS, LANE } from '${root}/layout';`);
lines.push(`import { PADS } from '${root}/outer';`);
lines.push(`import { PILLARS } from '${root}/metro';`);
lines.push(`import { HIGHWAY_HALF } from '${root}/highway';`);
lines.push(`import { writeFileSync } from 'node:fs';`);
lines.push(`const groups: Record<string, unknown> = { ${names.map(([n, a]) => `${n}: ${a}`).join(', ')} };`);
lines.push(`writeFileSync(process.argv[2], JSON.stringify({
  ringLen: RING_LEN, deckHalf: DECK_HALF, rampHalf: RAMP_HALF, quad: QUAD, slip: SLIP, reach: REACH, beside: BESIDE, outerLane: OUTER_LANE, lane: LANE, highwayHalf: HIGHWAY_HALF,
  exits: EXITS.map((e) => ({ ...e, s: exitS(e) })),
  ramps: RAMPS,
  streets: PLAN.streets.map((s) => ({ id: s.id, kind: s.kind, pts: s.pts, half: s.half, lanes: s.lanes, ys: s.ys })),
  blocks: PLAN.blocks.map((b) => ({ id: b.id, use: b.use, ref: b.ref, poly: b.poly, places: b.places, pads: b.pads })),
  places: PLACES.map((p) => ({ id: p.id, kind: p.kind, name: p.name, at: p.at })),
  units: UNITS, bigLots: BIG_LOTS, pads: PADS,
  pillars: PILLARS,
  groups,
  ringPts: Array.from({ length: Math.ceil(RING_LEN / 2) }, (_, i) => { const s = i * 2; return { s, o: ringS(...(ringPoint(s, 0) as [number, number])).o, p: ringPoint(s, 0) }; }),
}));`);
writeFileSync(entry, lines.join('\n'));
await build({ entryPoints: [entry], outfile: join(TMP, 'entry.mjs'), bundle: true, format: 'esm', platform: 'node', packages: 'external', logLevel: 'error' });
const dataFile = join(TMP, 'data.json');
const run = spawnSync(process.execPath, [join(TMP, 'entry.mjs'), dataFile], { stdio: 'inherit' });
if (run.status) process.exit(run.status);
const D = JSON.parse(readFileSync(dataFile, 'utf8'));
rmSync(TMP, { recursive: true, force: true });

/* ---------- Along and across the ring ---------- */
const R = D.ringPts; const L = D.ringLen;
/** Where x, z is along the ring (`s`) and across it (`o`, outward positive): the nearest sample, refined along its tangent */
function so(x, z) {
  let bi = 0, bd = Infinity;
  for (let i = 0; i < R.length; i++) { const d = (R[i].p[0] - x) ** 2 + (R[i].p[1] - z) ** 2; if (d < bd) { bd = d; bi = i; } }
  const a = R[(bi - 1 + R.length) % R.length].p, b = R[(bi + 1) % R.length].p, p = R[bi].p;
  const tx = b[0] - a[0], tz = b[1] - a[1], tl = Math.hypot(tx, tz); const ux = tx / tl, uz = tz / tl;
  const dx = x - p[0], dz = z - p[1];
  const along = dx * ux + dz * uz;
  // (outward: heading +x along the north side, outward is -z)
  const nx = uz, nz = -ux;
  const o = dx * nx + dz * nz;
  return { s: ((R[bi].s + along) % L + L) % L, o };
}
/** The shortest way along the ring from a to b (signed) */
const ds = (a, b) => { let d = b - a; d = ((d % L) + L) % L; if (d > L / 2) d -= L; return d; };

/* ---------- The drawings ---------- */
const OUT = join(ROOT, 'docs', 'exits-shots');
mkdirSync(OUT, { recursive: true });
// The plan's standard (game units): the deck's half width with three lanes each way, the gap to a ramp, a two-lane
// ramp's width, the frontage road's sidewalk, the clearance to what's beside; F flat at a junction, R the ramp's climb
// (the deck's 3.8 at about 5%), Dd the deceleration lane, A the acceleration lane
const STD = { deck: 6.2, gap: 0.3, rampW: 4.4, walk: 1.2, clear: 1.5, F: 8, R: 80, Dd: 55, A: 80 };
const BAND = STD.deck + STD.gap + STD.rampW; // 10.9
const SYS = [
  { id: 'north', n: 1, title: 'Exit 1 (north): 1A Westlake · Northgate, 1B Starlight Mall · Sunridge', cross: [[1805, 'ns0', '1A'], [35, 'ns3', '1B']], old: [1, 2] },
  { id: 'east', n: 2, title: 'Exit 2 (east): 2A Crestmont · Sunridge, 2B Airport · Harbour', cross: [[380, 'ew0', '2A'], [402, 'ew1e'], [428, 'ew2e'], [449, 'ew3'], [522, 'ew4', '2B']], old: [3, 4] },
  { id: 'south', n: 3, title: 'Exit 3 (south): 3A Southfield · General Aviation, 3B Endswood · The Trenches', cross: [[885, 'ns3', '3A'], [907, 'ns2s'], [933, 'ns1s'], [954, 'ns0s', '3B']], old: [5, 6] },
  { id: 'west', n: 4, title: "Exit 4 (west): 4A Southbank Docks · Aldwyn's Green, 4B Uptown · Kart Park (exit 6A retired)", cross: [[1318, 'ew4', '4A'], [1390, 'ew3'], [1412, 'ew2'], [1438, 'ew1'], [1459, 'ew0', '4B']], old: [7, 8, 9] },
];
const boxes = [];
for (const [g, arr] of Object.entries(D.groups)) if (g !== 'DUMMY_SOLIDS') for (const b of arr) boxes.push({ g, b, big: (b[2] - b[0]) * (b[3] - b[1]) > 6 && b[4] > 1.5 });
const pre = boxes.map((x) => ({ ...x, r: [[x.b[0], x.b[1]], [x.b[2], x.b[1]], [x.b[2], x.b[3]], [x.b[0], x.b[3]]].map((p) => so(p[0], p[1])) }));
const streetsR = D.streets.filter((s) => s.kind !== 'highway' && s.kind !== 'ramp').map((s) => { const pts = []; for (let i = 1; i < s.pts.length; i++) { const a = s.pts[i - 1], b = s.pts[i]; const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2)); for (let k = (i === 1 ? 0 : 1); k <= n; k++) pts.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } return { ...s, r: pts.map((p) => so(p[0], p[1])) }; });
const blocksR = D.blocks.map((b) => ({ ...b, r: b.poly.map(([x, z]) => so(x, z)) }));
const rampsR = D.ramps.map((r) => ({ ...r, r: r.pts.map(([x, z]) => so(x, z)) }));
const pillarsR = D.pillars.map((p) => ({ ...p, r: so(p.at[0], p.at[1]) }));
const placesR = D.places.map((p) => ({ ...p, r: so(p.at.x, p.at.z) }));

function panel(sys, proposed, mid, U, O, k, y0) {
  const X = (u) => (u + U) * k, Y = (o) => y0 + (O - o) * k;
  const inWin = (r) => Math.abs(ds(mid, r.s)) <= U && Math.abs(r.o) <= O;
  const P = (r) => `${X(ds(mid, r.s)).toFixed(1)},${Y(r.o).toFixed(1)}`;
  const out = [];
  const cid = 'c' + y0;
  out.push(`<clipPath id="${cid}"><rect x="0" y="${y0}" width="${2 * U * k}" height="${2 * O * k}"/></clipPath><g clip-path="url(#${cid})">`);
  out.push(`<rect x="0" y="${y0}" width="${2 * U * k}" height="${2 * O * k}" fill="#eef1e8"/>`);
  for (const b of blocksR) if (b.r.some(inWin) && b.r.every((r) => Math.abs(ds(mid, r.s)) < U + 200 && Math.abs(r.o) < 65)) out.push(`<polygon points="${b.r.map(P).join(' ')}" fill="#dcd7cc" stroke="#c4bdb0" stroke-width="1"/>`);
  for (const s of streetsR) { const seg = []; let cur = []; for (const r of s.r) { if (Math.abs(ds(mid, r.s)) <= U + 5 && Math.abs(r.o) <= O + 5) cur.push(r); else { if (cur.length > 1) seg.push(cur); cur = []; } } if (cur.length > 1) seg.push(cur); for (const c of seg) out.push(`<polyline points="${c.map(P).join(' ')}" fill="none" stroke="#7d7b86" stroke-width="${(2 * s.half * k).toFixed(1)}" stroke-linejoin="round" opacity="0.85"/>`); }
  // what's in the way: inside the new layout's band within the system's span
  const span = sysSpan(sys);
  const inNew = (r) => { const u = ds(mid, r.s); return u >= span.lo && u <= span.hi && Math.abs(r.o) >= 4.5 && Math.abs(r.o) <= BAND + STD.walk + STD.clear; };
  for (const x of pre) if (x.r.some(inWin) && x.g !== 'PIER_SOLIDS' && x.g !== 'RAMP_PIER_SOLIDS') {
    const hit = proposed && x.r.some(inNew) && !['UNDER_SOLIDS'].includes(x.g);
    out.push(`<polygon points="${x.r.map(P).join(' ')}" fill="${x.big ? '#8d9bb3' : '#a9b59b'}" stroke="${hit ? '#e0262b' : '#5b6170'}" stroke-width="${hit ? 2.5 : 0.6}"/>`);
  }
  // deck
  const dh = proposed ? STD.deck : D.deckHalf;
  out.push(`<rect x="0" y="${Y(dh)}" width="${2 * U * k}" height="${2 * dh * k}" fill="#b9b2cf" stroke="#4a4560" stroke-width="1"/>`);
  out.push(`<line x1="0" y1="${Y(0)}" x2="${2 * U * k}" y2="${Y(0)}" stroke="#e9d05b" stroke-width="1.2"/>`);
  if (proposed) for (const q of [-1, 1]) for (const o of [D.highwayHalf - 0.5 - 1.7 * 2, D.highwayHalf - 0.5 - 1.7]) out.push(`<line x1="0" y1="${Y(q * (0.3 + 1.7 * (o === D.highwayHalf - 0.5 - 1.7 * 2 ? 1 : 2)))}" x2="${2 * U * k}" y2="${Y(q * (0.3 + 1.7 * (o === D.highwayHalf - 0.5 - 1.7 * 2 ? 1 : 2)))}" stroke="#fff" stroke-width="1" stroke-dasharray="6 6"/>`);
  else for (const q of [-1, 1]) out.push(`<line x1="0" y1="${Y(q * 2)}" x2="${2 * U * k}" y2="${Y(q * 2)}" stroke="#fff" stroke-width="1" stroke-dasharray="6 6"/>`);
  if (!proposed) {
    for (const r of rampsR) { const pts = r.r.filter(inWin); if (pts.length > 1) out.push(`<polyline points="${pts.map(P).join(' ')}" fill="none" stroke="#f08a00" stroke-width="${(2 * D.rampHalf * k).toFixed(1)}" stroke-linejoin="round" opacity="0.9"/>`); }
  } else drawNew(sys, mid, out, X, Y, k);
  for (const p of pillarsR) if (inWin(p.r)) { const hit = proposed && Math.abs(p.r.o) >= 4.5 && Math.abs(p.r.o) <= BAND + STD.clear; out.push(`<rect x="${X(ds(mid, p.r.s)) - 3}" y="${Y(p.r.o) - 3}" width="6" height="6" fill="${hit ? '#e0262b' : '#222'}"/>`); }
  for (const p of placesR) if (inWin(p.r)) out.push(`<circle cx="${X(ds(mid, p.r.s))}" cy="${Y(p.r.o)}" r="4" fill="#2a7de1"/><text x="${X(ds(mid, p.r.s)) + 6}" y="${Y(p.r.o) + 4}" font-size="12" fill="#1b4f8f">${(p.name || p.id).replace(/&/g, 'and')}</text>`);
  for (const [s, id, lab] of sys.cross) out.push(`<text x="${X(ds(mid, s)) + 4}" y="${y0 + 14}" font-size="12" fill="#333">${id}${lab && proposed ? ' (' + lab + ')' : ''}</text>`);
  out.push('</g>');
  out.push(`<rect x="4" y="${y0 + 2 * O * k - 24}" width="560" height="20" fill="#fff" opacity="0.85"/><text x="8" y="${y0 + 2 * O * k - 8}" font-size="14" font-weight="bold" fill="#222">${proposed ? 'PROPOSED' : 'NOW'}  (outside the ring up, inside down; unrolled along the ring)</text>`);
  return out.join('\n');
}
function sysSpan(sys) {
  const mid = sysMid(sys); const us = sys.cross.map(([s]) => ds(mid, s)); const c0 = Math.min(...us), c1 = Math.max(...us);
  return { c0, c1, lo: c0 - STD.F - STD.R - STD.Dd, hi: c1 + STD.F + STD.R + STD.A, loA: c0 - STD.F - STD.R - STD.A, hiD: c1 + STD.F + STD.R + STD.Dd };
}
function sysMid(sys) { const a = sys.cross[0][0], b = sys.cross.at(-1)[0]; return ((a + ds(a, b) / 2) % L + L) % L; }
function drawNew(sys, mid, out, X, Y, k) {
  const sp = sysSpan(sys);
  const band = (u0, u1, o0, o1, fill, extra = '') => out.push(`<rect x="${X(Math.min(u0, u1))}" y="${Y(Math.max(o0, o1))}" width="${Math.abs(u1 - u0) * k}" height="${Math.abs(o1 - o0) * k}" fill="${fill}" ${extra}/>`);
  const o0 = STD.deck + STD.gap, o1 = BAND;
  for (const q of [-1, 1]) {
    // inside (q -1): clockwise, +u. outside (q 1): anticlockwise, -u
    const [first, last] = q < 0 ? [sp.c0, sp.c1] : [sp.c1, sp.c0];
    const dir = q < 0 ? 1 : -1;
    const gore = first - dir * (STD.F + STD.R), decel = gore - dir * STD.Dd, down = first - dir * STD.F;
    const up = last + dir * STD.F, top = up + dir * STD.R, accel = top + dir * STD.A;
    // decel and accel lanes on the deck: the third lane highlighted
    band(decel, gore, q * 4.2, q * STD.deck, '#ffcf6e', 'opacity="0.9"');
    band(top, accel, q * 4.2, q * STD.deck, '#ffcf6e', 'opacity="0.9"');
    // ramps (raised) and the frontage road (at grade)
    band(gore, down, q * o0, q * o1, '#f08a00');
    band(up, top, q * o0, q * o1, '#f08a00');
    band(down, up, q * o0, q * o1, '#3f9f6a');
    band(down, up, q * o1, q * (o1 + STD.walk), '#cfc7b6');
    // gore chevrons
    for (const g of [gore, top]) { const gx = X(g), gy0 = Y(q * STD.deck), gy1 = Y(q * o0); out.push(`<polygon points="${gx},${gy0} ${gx + dir * 18},${gy0} ${gx},${gy1}" fill="#fff" stroke="#c22" stroke-width="1.5"/>`); }
    // arrows of travel
    const ay = Y(q * (o0 + o1) / 2); const ax = X((down + up) / 2);
    out.push(`<text x="${ax}" y="${ay + 4}" font-size="12" fill="#fff" font-weight="bold" text-anchor="middle">${dir > 0 ? 'frontage road  ⟶' : '⟵  frontage road'}</text>`);
    out.push(`<text x="${X((gore + down) / 2)}" y="${ay + 4}" font-size="11" fill="#fff" text-anchor="middle">off-ramp</text>`);
    out.push(`<text x="${X((up + top) / 2)}" y="${ay + 4}" font-size="11" fill="#fff" text-anchor="middle">on-ramp</text>`);
    // signals where the frontage road crosses each street
    for (const [s] of sys.cross) { const u = ds(mid, s); out.push(`<circle cx="${X(u - dir * 3)}" cy="${Y(q * (o0 + o1) / 2)}" r="4" fill="#d22" stroke="#111"/>`); }
  }
}
const files = [];
for (const sys of SYS) {
  const mid = sysMid(sys); const sp = sysSpan(sys);
  const U = Math.ceil(Math.max(-sp.lo, sp.hi, -sp.loA, sp.hiD) + 20), O = 42, k = 2.6;
  const H = 2 * O * k, W = 2 * U * k;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${2 * H + 80}" font-family="DejaVu Sans, Arial">
<rect width="100%" height="100%" fill="#fff"/>
<text x="10" y="24" font-size="18" font-weight="bold" fill="#111">${sys.title.replace(/&/g, 'and').replace(/'/g, '&#39;')}</text>
<text x="10" y="40" font-size="12" fill="#444">Units: 1 = 1.8 m. Orange: ramps (raised, two lanes). Green: one-way frontage road at grade (two lanes) with its sidewalk. Yellow: the deck's third lane where it is exit-only or an entry lane.</text>
<text x="10" y="52" font-size="12" fill="#444">Red outline: in the way of the new layout (to move or clear). Red dots: signals. Black squares: metro pillars (red: to move). Blue: places.</text>
${panel(sys, false, mid, U, O, k, 62)}
${panel(sys, true, mid, U, O, k, 62 + H + 10)}
</svg>`;
  const f = `${OUT}/exit-${sys.n}-${sys.id}.png`;
  await sharp(Buffer.from(svg)).png().toFile(f);
  files.push(f); console.log(f, W, 'x', 2 * H + 70, 'span', sp);
}
// Overview of the whole ring
{
  const pts = D.ringPts.map((r) => r.p); const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
  const x0 = Math.min(...xs) - 60, z0 = Math.min(...zs) - 60, x1 = Math.max(...xs) + 60, z1 = Math.max(...zs) + 60, k = 1.6;
  const X = (x) => (x - x0) * k, Y = (z) => (z - z0) * k;
  const o = [];
  for (const s of D.streets) if (s.kind === 'street' || s.kind === 'avenue') o.push(`<polyline points="${s.pts.map(([x, z]) => `${X(x)},${Y(z)}`).join(' ')}" fill="none" stroke="#ccc" stroke-width="${Math.max(1, s.half * k)}"/>`);
  o.push(`<polygon points="${pts.map(([x, z]) => `${X(x)},${Y(z)}`).join(' ')}" fill="none" stroke="#6b6390" stroke-width="${2 * STD.deck * k}"/>`);
  for (const e of D.exits) { const [x, z] = e.at; o.push(`<circle cx="${X(x)}" cy="${Y(z)}" r="7" fill="#999"/><text x="${X(x) + 9}" y="${Y(z) - 6}" font-size="13" fill="#888" text-decoration="line-through">${e.label}</text>`); }
  for (const sys of SYS) {
    const mid = sysMid(sys); const sp = sysSpan(sys);
    for (const [a, b, col] of [[sp.lo, sp.c0, '#f08a00'], [sp.c0, sp.c1, '#3f9f6a'], [sp.c1, sp.hi, '#f08a00']]) {
      const seg = []; for (let u = a; u <= b; u += 2) { const s = ((mid + u) % L + L) % L; const i = Math.round(s / 2) % D.ringPts.length; seg.push(D.ringPts[i].p); }
      o.push(`<polyline points="${seg.map(([x, z]) => `${X(x)},${Y(z)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="${2 * (BAND + 1) * k}" opacity="0.55"/>`);
    }
    const i = Math.round(mid / 2) % D.ringPts.length; const [x, z] = D.ringPts[i].p;
    o.push(`<text x="${X(x)}" y="${Y(z)}" font-size="22" font-weight="bold" fill="#111" text-anchor="middle" dy="7">${sys.n}</text>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${(x1 - x0) * k}" height="${(z1 - z0) * k + 40}" font-family="DejaVu Sans, Arial"><rect width="100%" height="100%" fill="#fff"/>
<text x="10" y="22" font-size="16" font-weight="bold">The ring: four interchanges (1-4) for the old nine exits (grey, struck through). Orange: ramps; green: frontage roads.</text>
<g transform="translate(0,30)">${o.join('\n')}</g></svg>`;
  const f = `${OUT}/exits-overview.png`; await sharp(Buffer.from(svg)).png().toFile(f); console.log(f);
}
