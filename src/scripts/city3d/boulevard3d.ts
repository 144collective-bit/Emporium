/*
 * Uptown's waterfront boulevard on screen (docs/finance-plan.md Phase 4; the
 * numbers are boulevard.ts and boulevarddress.ts), part of Uptown's chunk
 * (uptown3d.ts), as sites:
 *
 * - **The esplanade** in stretches no longer than `STRETCH`: the plaza's
 *   granite on a stone deck from the avenue's kerb out over the water, its
 *   fascia and piles at the water, a darker band along the tree rows, round
 *   stone planters (the trees are the boot's), benches facing the river
 *   (near) and a glass rail with a steel top at the water's edge, broken at
 *   the overlooks and the gangways; rails across its ends over the water.
 * - **The overlooks**: granite decks out over the water with their own glass
 *   rail; the axis's has two flagpoles with pennants and coin binoculars.
 * - **The marina**: timber gangways with handrails out to the pontoon on its
 *   floats, cleats along it, the yachts moored along its river side (a new
 *   boat model: a hull with a sheer stripe, a teak deck, a deck house with a
 *   dark window band, a flybridge on the bigger ones, a mast and navigation
 *   lights, near), and two tenders inside it.
 * - **The planted median**: a clipped hedge along the bank avenue's median
 *   with slim columnar trees.
 * - **The restaurant terraces** on the river row's podium roofs: timber
 *   decking, a glass balustrade along the podium's river edge, tables under
 *   umbrellas, planters, string lights, and the restaurant's name on a lit
 *   board facing the river (one small atlas, fixed made-up copy).
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, canvasTex, lit, neon, siteMat, toon } from './kit';
import { SLAB } from './world';
import { site } from './tilework';
import { RIVER } from './layout';
import { PODIUM } from './highrise';
import { DECK_Y } from './waterfront';
import {
  BENCH_XS,
  BENCH_Z,
  ESPLANADE,
  GANGWAYS,
  GANGWAY_HALF,
  LAND_TREES,
  OVERLOOKS,
  PLANTER_R,
  PONTOON,
  ROOF_TERRACES,
  WATER_TREES,
  clearOfMouths,
} from './boulevard';
import { HEDGE, MEDIAN_RUNS, MEDIAN_TREES, MEDIAN_Z, TENDERS, TERRACE_NAMES, YACHTS, type Yacht } from './boulevarddress';
import { GRANITE_TILE, bench, box, granite, quad, rod, table } from './plaza3d';
import type { Rect } from './uptown';

const [X0, Z0, X1, Z1] = ESPLANADE;
/** The deck's top, the granite laid on it, a band over that */
const TOP = DECK_Y;
const PAVE = TOP + 0.004;
const BAND = PAVE + 0.005;
/** The esplanade's stretches: none longer than this (nothing fixed much longer than a tile) */
const STRETCH = 26;

const STONE = toon('#cfc7b8');
const FASCIA = toon('#9a92a8');
const BAND_C = toon('#8c8499');
const PILE = toon('#4a4560');
const CAP = toon('#ece6da');
const SOIL = toon('#5a4436');
const GLASS = toon('#a9dcef');
const STEEL = toon('#2a2740');
const TIMBER = toon('#8a6a4c');
const TIMBER_DARK = toon('#6a4f38');
const FLOAT = toon('#e9e6f2');
const HEDGE_C = toon('#2c6a3c');
const HEDGE_TOP = toon('#3a8a4e');
const COLUMN = toon('#24603a');
const TRUNK = toon('#5a4232');
const TEAK = toon('#b5865a');
const WINDOW = toon('#1b2238');
const PENNANTS = [toon('#ff2bd6'), toon('#00c2ff')];
const UMBRELLAS = [toon('#f4ead6'), toon('#1c2a55')];
const RED = neon('#ff3344', 0.3, 2.4);
const GREEN = neon('#33ff88', 0.3, 2.4);
const BULB = neon('#ffd98a', 0.6, 2.4);

/** The terraces' names: one small atlas, a row each, lit (fixed made-up copy) */
const NAMES = (() => {
  const tex = canvasTex(512, 64 * TERRACE_NAMES.length, (c) => {
    TERRACE_NAMES.forEach((name, i) => {
      const y = i * 64;
      c.fillStyle = '#0d0c18';
      c.fillRect(0, y, 512, 64);
      c.fillStyle = '#ffe9c2';
      c.font = `800 38px ${FONT_DISPLAY}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(name, 256, y + 33);
    });
  });
  return siteMat('boulevard-names', lit(new THREE.MeshBasicMaterial({ map: tex, color: '#ffffff' }), 1, 1.4));
})();

/* ---------- The esplanade ---------- */

/** A glass rail along x at z, from a to b: glass panels, a steel top rail, posts (near) */
function railX(b: Batch, a: number, c: number, z: number) {
  if (c - a < 0.3) return;
  box(b, [a, z - 0.02, c, z + 0.02], TOP + 0.08, TOP + 0.62, GLASS);
  box(b, [a, z - 0.045, c, z + 0.045], TOP + 0.62, TOP + 0.68, STEEL);
  b.detail(() => {
    for (let x = a; x <= c + 0.01; x += 1.5) box(b, [x - 0.03, z - 0.03, x + 0.03, z + 0.03], TOP, TOP + 0.66, STEEL);
  });
}
/** ...and along z at x */
function railZ(b: Batch, a: number, c: number, x: number) {
  if (c - a < 0.3) return;
  box(b, [x - 0.02, a, x + 0.02, c], TOP + 0.08, TOP + 0.62, GLASS);
  box(b, [x - 0.045, a, x + 0.045, c], TOP + 0.62, TOP + 0.68, STEEL);
  b.detail(() => {
    for (let z = a; z <= c + 0.01; z += 1.5) box(b, [x - 0.03, z - 0.03, x + 0.03, z + 0.03], TOP, TOP + 0.66, STEEL);
  });
}
/** A deck out over the water: its stone body from below the water to the top, its fascia, the granite, piles under its edge (near) */
function waterDeck(b: Batch, r: Rect, piles: boolean) {
  box(b, r, -0.3, TOP, STONE);
  box(b, [r[0], r[3] - 0.03, r[2], r[3] + 0.004], -0.3, TOP - 0.02, FASCIA);
  b.add(quad(r, PAVE, GRANITE_TILE), granite);
  if (piles)
    b.detail(() => {
      for (let x = r[0] + 0.6; x < r[2] - 0.3; x += 2.4) b.add(new THREE.CylinderGeometry(0.13, 0.13, 0.6, 8, 1, true).translate(x, -0.3, r[3] - 0.12), PILE);
    });
}

function stretch(b: Batch, a: number, c: number) {
  // The deck: on the land from the kerb to the river's wall, out over the water past it; the granite over both
  box(b, [a, Z0, c, RIVER[0]], 0, TOP, STONE);
  waterDeck(b, [a, RIVER[0], c, Z1], true);
  b.add(quad([a, Z0, c, RIVER[0]], PAVE, GRANITE_TILE), granite);
  // A darker band along each row of trees
  b.add(quad([a, Z0 + 0.45, c, Z0 + 1.45], BAND), BAND_C);
  b.add(quad([a, Z1 - 2.05, c, Z1 - 1.05], BAND), BAND_C);
  // The planters (their trees are the boot's), the benches facing the river
  for (const [x, z] of [...LAND_TREES, ...WATER_TREES].filter(([x]) => x >= a && x < c)) {
    b.add(new THREE.CylinderGeometry(PLANTER_R, PLANTER_R + 0.03, 0.42, 14, 1, true).translate(x, TOP + 0.21, z), STONE);
    b.add(new THREE.RingGeometry(PLANTER_R - 0.06, PLANTER_R + 0.01, 14).rotateX(-Math.PI / 2).translate(x, TOP + 0.425, z), CAP);
    b.add(new THREE.CircleGeometry(PLANTER_R - 0.06, 14).rotateX(-Math.PI / 2).translate(x, TOP + 0.38, z), SOIL);
  }
  for (const x of BENCH_XS.filter((x) => x >= a && x < c)) bench(b, [x, BENCH_Z], 0, PAVE);
  // The glass rail at the water's edge, broken at the overlooks' and gangways' mouths
  let from: number | null = null;
  for (let x = a; x <= c + 1e-6; x += 0.25) {
    const open = clearOfMouths(x, 0) && x <= c;
    if (open && from === null) from = x;
    if ((!open || x + 0.25 > c) && from !== null) {
      railX(b, from, open ? c : x - 0.25, Z1 - 0.06);
      from = null;
    }
  }
}

/* ---------- The overlooks and the marina ---------- */

function overlooks(b: Batch) {
  for (const o of OVERLOOKS) {
    const r: Rect = [o.rect[0], Z1, o.rect[2], o.rect[3]];
    waterDeck(b, r, true);
    railX(b, r[0], r[2], r[3] - 0.06);
    for (const x of [r[0] + 0.06, r[2] - 0.06]) railZ(b, Z1 - 0.06, r[3] - 0.06, x);
  }
  // The axis's: two flagpoles with pennants, coin binoculars at its rail
  const o = OVERLOOKS[0];
  for (const [k, s] of [-1, 1].entries()) {
    const x = o.x + s * (o.w / 2 - 0.9);
    const z = o.rect[3] - 0.9;
    b.add(new THREE.CylinderGeometry(0.04, 0.06, 6, 8, 1, true).translate(x, TOP + 3, z), STEEL);
    b.add(new THREE.SphereGeometry(0.08, 8, 6).translate(x, TOP + 6.05, z), CAP);
    // (a pennant flying out east on the wind: a triangle each way round, so both sides are drawn)
    const [p, q, r] = [
      [x, TOP + 5.9, z],
      [x, TOP + 5.1, z],
      [x + 1.6, TOP + 5.55, z],
    ];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([...p, ...q, ...r, ...p, ...r, ...q], 3));
    g.computeVertexNormals();
    b.add(g, PENNANTS[k]);
  }
  b.detail(() => {
    for (const x of [o.x - 1.4, o.x + 1.4]) {
      const z = o.rect[3] - 0.45;
      b.add(new THREE.CylinderGeometry(0.05, 0.08, 0.95, 8, 1, true).translate(x, TOP + 0.47, z), STEEL);
      b.box(x - 0.16, TOP + 0.95, z - 0.12, 0.32, 0.2, 0.24, STEEL);
      b.box(x - 0.13, TOP + 0.99, z + 0.12, 0.26, 0.12, 0.06, WINDOW);
    }
  });
}

function marina(b: Batch) {
  // The gangways: timber, handrails both sides
  for (const gx of GANGWAYS) {
    const r: Rect = [gx - GANGWAY_HALF, Z1 - 0.02, gx + GANGWAY_HALF, PONTOON[1]];
    box(b, r, TOP - 0.12, TOP, TIMBER);
    for (const x of [r[0] + 0.04, r[2] - 0.04]) {
      box(b, [x - 0.025, r[1], x + 0.025, r[3]], TOP + 0.62, TOP + 0.67, STEEL);
      b.detail(() => {
        for (let z = r[1] + 0.3; z < r[3]; z += 0.6) box(b, [x - 0.02, z - 0.02, x + 0.02, z + 0.02], TOP, TOP + 0.65, STEEL);
      });
    }
  }
  // The pontoon on its floats in two halves (nothing fixed much longer than a tile), a timber edge, cleats along its river side (near)
  const pm = (PONTOON[0] + PONTOON[2]) / 2;
  for (const [a, c] of [
    [PONTOON[0], pm],
    [pm, PONTOON[2]],
  ]) {
    box(b, [a, PONTOON[1], c, PONTOON[3]], TOP - 0.1, TOP, TIMBER);
    box(b, [a, PONTOON[1] - 0.03, c, PONTOON[1] + 0.06], TOP, TOP + 0.06, TIMBER_DARK);
    box(b, [a, PONTOON[3] - 0.06, c, PONTOON[3] + 0.03], TOP, TOP + 0.06, TIMBER_DARK);
  }
  for (let x = PONTOON[0] + 0.5; x < PONTOON[2]; x += 2.2) box(b, [x - 0.4, PONTOON[1] + 0.06, x + 0.4, PONTOON[3] - 0.06], -0.18, TOP - 0.1, FLOAT);
  b.detail(() => {
    for (let x = PONTOON[0] + 1.2; x < PONTOON[2]; x += 2.6) {
      b.box(x - 0.12, TOP + 0.06, PONTOON[3] - 0.16, 0.24, 0.05, 0.08, STEEL);
      b.box(x - 0.04, TOP + 0.02, PONTOON[3] - 0.15, 0.08, 0.06, 0.06, STEEL);
    }
  });
  for (const y of YACHTS) yacht(b, y);
  for (const t of TENDERS) {
    b.box(t.x - t.len / 2, -0.08, t.z - 0.27, t.len, 0.24, 0.54, FLOAT);
    b.box(t.x - t.len / 2 + 0.1, 0.16, t.z - 0.22, t.len - 0.2, 0.02, 0.44, TEAK);
    b.box(t.x - t.len / 2 - 0.06, 0.02, t.z - 0.1, 0.12, 0.2, 0.2, STEEL);
  }
}

/** A yacht moored at (x, z), bow east: a pointed hull, its stripe, a teak deck, a deck house, a flybridge, a mast and lights */
function yacht(b: Batch, y: Yacht) {
  const { x, z, len, beam } = y;
  const [h, hb] = [len / 2, beam / 2];
  const plan = (k: number) => {
    const s = new THREE.Shape();
    const [hx, hz] = [h * k, hb * k];
    s.moveTo(-hx, -hz);
    s.lineTo(hx - beam * 0.9 * k, -hz);
    s.quadraticCurveTo(hx - beam * 0.2 * k, -hz * 0.8, hx, 0);
    s.quadraticCurveTo(hx - beam * 0.2 * k, hz * 0.8, hx - beam * 0.9 * k, hz);
    s.lineTo(-hx, hz);
    s.closePath();
    return s;
  };
  // (extruded up from y0 to y1, its plan in x and z)
  const solid = (k: number, y0: number, y1: number, mat: THREE.Material) =>
    b.add(new THREE.ExtrudeGeometry(plan(k), { depth: y1 - y0, bevelEnabled: false, curveSegments: 6 }).rotateX(-Math.PI / 2).translate(x, y0, z), mat);
  const HULL = toon(y.hull);
  solid(1, -0.12, 0.5, HULL);
  solid(1.012, 0.3, 0.38, toon(y.stripe));
  solid(0.94, 0.5, 0.505, TEAK);
  // The deck house over the rear half, its window band, a flybridge on the bigger ones
  const [d0, d1] = [x - h + 0.35, x + h * 0.25];
  b.box(d0, 0.5, z - hb * 0.72, d1 - d0, 0.5, beam * 0.72, HULL);
  b.box(d0 + 0.15, 0.68, z - hb * 0.72 - 0.006, d1 - d0 - 0.1, 0.18, beam * 0.72 + 0.012, WINDOW);
  b.box(d1 - 0.02, 0.62, z - hb * 0.6, 0.03, 0.3, beam * 0.6, WINDOW);
  if (y.fly) {
    b.box(d0 + 0.2, 1.0, z - hb * 0.6, (d1 - d0) * 0.6, 0.22, beam * 0.6, HULL);
    b.box(d0 + 0.15, 1.42, z - hb * 0.62, (d1 - d0) * 0.62, 0.04, beam * 0.62, STEEL);
    b.detail(() => {
      for (const s of [-1, 1]) b.box(d0 + 0.2, 1.22, z + s * hb * 0.55 - 0.02, 0.04, 0.2, 0.04, STEEL);
    });
  }
  b.detail(() => {
    // The mast and its radar, a rail round the bow, navigation lights (red to port, green to starboard)
    const mx = d0 + (d1 - d0) * 0.55;
    const top = y.fly ? 2.1 : 1.6;
    b.box(mx - 0.03, y.fly ? 1.46 : 1.0, z - 0.03, 0.06, top - (y.fly ? 1.46 : 1.0), 0.06, STEEL);
    b.box(mx - 0.22, top - 0.25, z - 0.04, 0.44, 0.05, 0.08, CAP);
    for (const s of [-1, 1]) rod(b, [x + h * 0.3, 0.75, z + s * hb * 0.75], [x + h - 0.2, 0.75, z + s * 0.12], 0.03, STEEL);
    b.box(x + h * 0.25 - 0.05, 0.55, z - hb * 0.8 - 0.05, 0.1, 0.07, 0.06, RED);
    b.box(x + h * 0.25 - 0.05, 0.55, z + hb * 0.8 - 0.01, 0.1, 0.07, 0.06, GREEN);
  });
}

/* ---------- The planted median ---------- */

function median(b: Batch, [a, c]: [number, number]) {
  const y = SLAB + 0.005;
  b.box(a, y, MEDIAN_Z - HEDGE.w / 2, c - a, HEDGE.h, HEDGE.w, HEDGE_C);
  b.box(a + 0.02, y + HEDGE.h, MEDIAN_Z - HEDGE.w / 2 + 0.02, c - a - 0.04, 0.006, HEDGE.w - 0.04, HEDGE_TOP);
  for (const x of MEDIAN_TREES.filter((x) => x >= a && x < c)) {
    b.add(new THREE.CylinderGeometry(0.05, 0.06, 0.7, 6, 1, true).translate(x, y + HEDGE.h + 0.25, MEDIAN_Z), TRUNK);
    b.add(new THREE.SphereGeometry(0.26, 8, 6).scale(1, 4.2, 1).translate(x, y + HEDGE.h + 1.5, MEDIAN_Z), COLUMN);
  }
}

/* ---------- The restaurant terraces ---------- */

function terrace(b: Batch, k: number) {
  const t = ROOF_TERRACES[k];
  const [x0, z0, x1, z1] = t.rect;
  const roof = SLAB + PODIUM.h - 0.02;
  const deck = roof + 0.006;
  b.add(quad(t.rect, deck), TIMBER);
  // A glass balustrade over the podium's parapet along its river edge
  box(b, [x0, z1 + 0.33, x1, z1 + 0.37], roof + 0.3, roof + 0.85, GLASS);
  box(b, [x0, z1 + 0.32, x1, z1 + 0.38], roof + 0.85, roof + 0.89, STEEL);
  // Tables under umbrellas (their chairs along x), planters at the corners
  t.tables.forEach((p, i) => table(b, p, UMBRELLAS[i % 2], deck, true));
  for (const [x, z] of [
    [x0 + 0.4, z0 + 0.4],
    [x1 - 0.4, z0 + 0.4],
  ]) {
    box(b, [x - 0.3, z - 0.3, x + 0.3, z + 0.3], deck, deck + 0.45, STONE);
    b.add(new THREE.IcosahedronGeometry(0.34, 0).scale(1, 0.8, 1).translate(x, deck + 0.7, z), HEDGE_C);
  }
  // String lights from posts at its corners, criss-crossed over the tables
  const posts: [number, number][] = [
    [x0 + 0.15, z0 + 0.15],
    [x1 - 0.15, z0 + 0.15],
    [x1 - 0.15, z1 - 0.15],
    [x0 + 0.15, z1 - 0.15],
  ];
  for (const [x, z] of posts) box(b, [x - 0.03, z - 0.03, x + 0.03, z + 0.03], deck, deck + 2.6, STEEL);
  for (const [p, q] of [
    [posts[0], posts[2]],
    [posts[1], posts[3]],
  ]) {
    const N = 12;
    const pts = Array.from({ length: N + 1 }, (_, i) => {
      const u = i / N;
      return [p[0] + (q[0] - p[0]) * u, deck + 2.55 - 0.5 * 4 * u * (1 - u), p[1] + (q[1] - p[1]) * u];
    });
    b.detail(() => {
      for (let i = 1; i <= N; i++) rod(b, pts[i - 1], pts[i], 0.02, STEEL);
    });
    for (let i = 1; i < N; i++) b.add(new THREE.OctahedronGeometry(0.06, 0).translate(pts[i][0], pts[i][1] - 0.07, pts[i][2]), BULB);
  }
  // The name on a lit board over the parapet, facing the river
  const w = Math.min(3.2, x1 - x0 - 0.4);
  const g = new THREE.PlaneGeometry(w, w / 8);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let v = 0; v < uv.count; v++) uv.setY(v, 1 - (k + 1 - uv.getY(v)) / TERRACE_NAMES.length);
  b.add(g.translate((x0 + x1) / 2, roof + 0.95 + w / 16, z1 + 0.385), NAMES);
}

/* ---------- Registering ---------- */

export function registerBoulevard() {
  // The esplanade, a site a stretch
  const n = Math.ceil((X1 - X0) / STRETCH);
  for (let i = 0; i < n; i++) {
    const [a, c] = [X0 + ((X1 - X0) * i) / n, X0 + ((X1 - X0) * (i + 1)) / n];
    site(`uptown esplanade ${i}`, [a - 1, Z0 - 1, c + 1, Z1 + 3], (into) => {
      const b = new Batch();
      stretch(b, a, c);
      // (rails across its ends over the water)
      if (i === 0) railZ(b, RIVER[0] - 0.3, Z1 - 0.06, X0 + 0.06);
      if (i === n - 1) railZ(b, RIVER[0] - 0.3, Z1 - 0.06, X1 - 0.06);
      b.build(into, { cast: true, receive: true });
    });
  }
  site('uptown overlooks', [OVERLOOKS[1].rect[0] - 1, Z1 - 1, OVERLOOKS[0].rect[2] + 1, Z1 + 3], (into) => {
    const b = new Batch();
    overlooks(b);
    b.build(into, { cast: true, receive: true });
  });
  site('uptown marina', [PONTOON[0] - 1, Z1 - 1, PONTOON[2] + 1, PONTOON[3] + 2], (into) => {
    const b = new Batch();
    marina(b);
    b.build(into, { cast: true, receive: true });
  });
  MEDIAN_RUNS.forEach((r, i) =>
    site(`uptown median ${i}`, [r[0] - 1, MEDIAN_Z - 1, r[1] + 1, MEDIAN_Z + 1], (into) => {
      const b = new Batch();
      median(b, r);
      b.build(into, { cast: true, receive: true });
    })
  );
  ROOF_TERRACES.forEach((t, k) =>
    site(`uptown terrace ${k}`, [t.rect[0] - 1, t.rect[1] - 1, t.rect[2] + 1, t.rect[3] + 2], (into) => {
      const b = new Batch();
      terrace(b, k);
      b.build(into, { cast: true, receive: true });
    })
  );
}
