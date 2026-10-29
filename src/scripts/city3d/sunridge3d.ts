/*
 * Sunridge drawn (docs/suburb-plan.md Phase 1; the data is sunridge.ts), a district loaded as you approach
 * (districts.ts `LAZY_DISTRICTS`), as sites (tilework.ts): its streets (asphalt, a dashed yellow centre line down the
 * loop and Mesa Drive, stop bars where a street meets another, the main entrance's planted median, the turning
 * circles, zebras at the main entrance's lights), the block wall round the land (stucco, a cap, pilasters), the
 * monument walls at the entrances (stone base, stucco, the name in bronze, uplights) and the footpath from Palm
 * Court. Its blocks' slabs are world.ts's (the street plan's), its lamps are placed at the boot (index.ts,
 * `SUN_LAMPS`).
 */
import * as THREE from 'three';
import type { Tick } from './world';
import { SLAB } from './world';
import { Batch, canvasTex, lit, neon, siteMat, toon } from './kit';
import { site } from './tilework';
import { registerHouses } from './sunhouses3d';
import { COURT } from './mall';
import { EW_ROADS, MEDIAN, WALK_W } from './layout';
import { along, dashes, pieces, ribbon, unit } from './roads3d';
import { BULB, COURTS, ENTRIES, ENTRY_MEDIAN, MONUMENTS, PATH, SUN_CROSSINGS, SUN_NAME, SUN_STREETS, WALL, WALL_RUNS, WEST_EDGE, type Pt, type Rect } from './sunridge';

export const SELF = import.meta.url;

/** The asphalt, level with the city's other district streets */
const Y = 0.031;
const AVENUE = EW_ROADS[0];

const ASPHALT = toon('#26243f');
const KERB = toon('#5a5290');
const GRASS = toon('#3f7a4a');
const YELLOW = neon('#f5d76e', 0.9, 1.1);
const WHITE = toon('#d9d5ee');
const ZEBRA = toon('#e8e4f8');
const STUCCO = toon('#d9c29a');
const STUCCO_DARK = toon('#c4a77a');
const CAP = toon('#b39468');
const STONE = toon('#8b7b68');
const PAVING = toon('#cbbfa6');
const UPLIGHT = neon('#ffd9a0', 0.15, 1.3);

/** The name on the monuments: bronze letters on a stone plaque */
const NAME = siteMat(
  'sunridge-name',
  lit(
    new THREE.MeshBasicMaterial({
      map: canvasTex(512, 96, (c) => {
        // (a stone plaque set in the stucco, a bevelled frame round it)
        c.fillStyle = '#8f7a5e';
        c.fillRect(0, 0, 512, 96);
        c.fillStyle = '#b9a27e';
        c.fillRect(7, 7, 498, 82);
        c.strokeStyle = '#6f5c43';
        c.lineWidth = 3;
        c.strokeRect(12, 12, 488, 72);
        c.fillStyle = '#4a321b';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = '600 64px "Big Shoulders Display", Georgia, serif';
        const word = SUN_NAME.toUpperCase().split('').join(String.fromCharCode(8202));
        c.fillText(word, 256, 52);
      }),
    }),
    0.85,
    1.05
  )
);

/** A box along a segment a to b, `w` across, from y0 to y1 */
function wallBox(b: Batch, a: Pt, c: Pt, w: number, y0: number, y1: number, m: THREE.Material) {
  const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
  if (l < 1e-3) return;
  b.add(
    new THREE.BoxGeometry(l, y1 - y0, w)
      .rotateY(-Math.atan2(c[1] - a[1], c[0] - a[0]))
      .translate((a[0] + c[0]) / 2, (y0 + y1) / 2, (a[1] + c[1]) / 2),
    m
  );
}
const rectOf = (pts: Pt[], pad: number): Rect => [Math.min(...pts.map((p) => p[0])) - pad, Math.min(...pts.map((p) => p[1])) - pad, Math.max(...pts.map((p) => p[0])) + pad, Math.max(...pts.map((p) => p[1])) + pad];

export function register({ low, scene }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  // The houses (Phase 2: sunhouses3d.ts)
  registerHouses(low, scene);
  const crossings = SUN_CROSSINGS.map((c) => c.at);
  const nearCrossing = (x: number, z: number, r: number) => crossings.some((c) => Math.hypot(c[0] - x, c[1] - z) < r);

  /* ---------- The streets ---------- */
  for (const s of SUN_STREETS) {
    // (an entrance from the avenue's north edge: its own asphalt is the avenue's south of that)
    const line: Pt[] = s.id.startsWith('sun-entry') ? along([s.pts[0][0], AVENUE.c - AVENUE.half], s.pts[1], 3) : s.pts;
    const centre = s.loop || s.id === 'sun-mesa';
    pieces(line, s.half + 0.5).forEach((pc, k) =>
      site(`sunridge street ${s.id} ${k}`, pc.rect, (into) => {
        const b = new Batch();
        b.add(ribbon(pc.pts, -s.half, s.half, () => Y), ASPHALT);
        const ys: THREE.Matrix4[] = [];
        if (centre) dashes(ys, pc.pts, 0, 1.1, 0.55, 0.07, () => Y + 0.006, (x, z) => nearCrossing(x, z, 4.6));
        b.instances(unit, YELLOW, ys);
        b.build(into, { cast: false, receive: true });
      })
    );
  }

  // The main entrance's planted median, from the avenue's kerb to short of the loop
  const main = ENTRIES[0];
  {
    const [x, z0, z1] = [main.pts[0][0], AVENUE.c - AVENUE.half - 1.2, main.pts[1][1] + main.half + 2.2];
    const m = ENTRY_MEDIAN;
    site('sunridge median', [x - m, z1 - 1, x + m, z0 + 1], (into) => {
      const b = new Batch();
      b.box(x - m / 2, 0, z1, m, SLAB, z0 - z1, KERB);
      b.box(x - m / 2 + 0.1, SLAB, z1 + 0.1, m - 0.2, 0.006, z0 - z1 - 0.2, GRASS);
      b.build(into, { cast: false, receive: true });
    });
  }

  // The turning circles
  for (const c of COURTS) {
    const e = c.pts[c.pts.length - 1];
    site(`sunridge bulb ${c.id}`, [e[0] - BULB - 1, e[1] - BULB - 1, e[0] + BULB + 1, e[1] + BULB + 1], (into) => {
      const b = new Batch();
      b.add(new THREE.CircleGeometry(BULB, low ? 20 : 32).rotateX(-Math.PI / 2).translate(e[0], Y + 0.002, e[1]), ASPHALT);
      b.build(into, { cast: false, receive: true });
    });
  }

  // Stop bars where Mesa Drive, the cul-de-sacs and the entrances meet another street: across the lane coming in,
  // a little back from the other street's kerb
  const bars: { at: Pt; u: Pt; half: number }[] = [];
  const barAt = (pts: Pt[], fromEnd: boolean, back: number, half: number) => {
    const [p, q] = fromEnd ? [pts[pts.length - 1], pts[pts.length - 2]] : [pts[0], pts[1]];
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const u: Pt = [(q[0] - p[0]) / l, (q[1] - p[1]) / l];
    bars.push({ at: [p[0] + u[0] * back, p[1] + u[1] * back], u, half });
  };
  const KERB_BACK = 1.7 + 1.1;
  barAt(SUN_STREETS.find((s) => s.id === 'sun-mesa')!.pts, false, KERB_BACK, 1.7);
  barAt(SUN_STREETS.find((s) => s.id === 'sun-mesa')!.pts, true, KERB_BACK, 1.7);
  for (const c of COURTS) barAt(c.pts, false, KERB_BACK, 1.7);
  for (const e of ENTRIES) barAt(e.pts, true, KERB_BACK, e.half);
  barAt(ENTRIES[1].pts, false, AVENUE.half + 1.1, ENTRIES[1].half);
  for (const [i, bar] of bars.entries()) {
    // (the lane coming in is on the right of the way in: left of the bar's way out, u)
    const [nx, nz] = [bar.u[1], -bar.u[0]];
    const [ax, az] = [bar.at[0] + nx * 0.05, bar.at[1] + nz * 0.05];
    const [cx, cz] = [bar.at[0] + nx * (bar.half - 0.1), bar.at[1] + nz * (bar.half - 0.1)];
    site(`sunridge stop ${i}`, rectOf([bar.at], 3), (into) => {
      const b = new Batch();
      b.add(ribbon([[ax, az], [cx, cz]], -0.12, 0.12, () => Y + 0.007), WHITE);
      b.build(into, { cast: false, receive: true });
    });
  }

  // Zebras across the main entrance at the avenue's lights: across the entrance (not its median), and across the avenue either side
  {
    const zs: THREE.Matrix4[] = [];
    const stripe = (x: number, z: number, w: number, d: number) => zs.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0.04, z), new THREE.Quaternion(), new THREE.Vector3(w, 1, d)));
    const [x, c] = [main.pts[0][0], AVENUE.c];
    const zi = c - AVENUE.half - 0.75;
    for (let w = -main.half + 0.16; w < main.half - 0.1; w += 0.32) if (Math.abs(w) > ENTRY_MEDIAN / 2 + 0.05) stripe(x + w, zi, 0.17, 0.55);
    for (const dir of [-1, 1]) {
      const xx = x + dir * (main.half + 0.75);
      for (let w = -AVENUE.half + 0.16; w < AVENUE.half - 0.1; w += 0.32) if (Math.abs(w) > MEDIAN / 2 + 0.1) stripe(xx, c + w, 0.55, 0.17);
    }
    site('sunridge zebras', [x - 9, c - 9, x + 9, c + 9], (into) => {
      const b = new Batch();
      b.instances(unit, ZEBRA, zs);
      b.build(into, { cast: false, receive: true });
    });
  }

  /* ---------- The wall round the land ---------- */
  const [y0, y1] = [SLAB, WALL.top];
  for (const run of WALL_RUNS)
    pieces(run, 1).forEach((pc, k) =>
      site(`sunridge wall ${WALL_RUNS.indexOf(run)} ${k}`, pc.rect, (into) => {
        const b = new Batch();
        for (let i = 1; i < pc.pts.length; i++) {
          const [a, c] = [pc.pts[i - 1], pc.pts[i]];
          wallBox(b, a, c, WALL.thick, y0, y1, STUCCO);
          // (its cap a touch wider and longer, so the pieces' caps meet round a bend)
          const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
          const [ux, uz] = [(c[0] - a[0]) / l, (c[1] - a[1]) / l];
          wallBox(b, [a[0] - ux * 0.03, a[1] - uz * 0.03], [c[0] + ux * 0.03, c[1] + uz * 0.03], WALL.thick + 0.07, y1, y1 + 0.05, CAP);
        }
        // Pilasters every six tiles or so, near only
        b.detail(() => {
          let d = 0;
          for (let i = 1; i < pc.pts.length; i++) {
            const [a, c] = [pc.pts[i - 1], pc.pts[i]];
            d += Math.hypot(c[0] - a[0], c[1] - a[1]);
            if (d >= 6 || i === pc.pts.length - 1) {
              d = 0;
              if (low) continue;
              b.box(c[0] - 0.17, y0, c[1] - 0.17, 0.34, y1 - y0 + 0.08, 0.34, STUCCO_DARK);
            }
          }
        });
        b.build(into, { cast: true, receive: true });
      })
    );

  /* ---------- The monuments at the entrances ---------- */
  for (const [i, m] of MONUMENTS.entries()) {
    const [x0, z0, x1, z1] = m.rect;
    const top = SLAB + m.top;
    site(`sunridge monument ${i}`, [x0 - 1, z0 - 1, x1 + 1, z1 + 2], (into) => {
      const b = new Batch();
      // A stone base, the stucco wall stepping up towards the street, its cap
      b.box(x0 - 0.06, SLAB, z0 - 0.06, x1 - x0 + 0.12, 0.32, z1 - z0 + 0.12, STONE);
      const inner = m.side < 0 ? x1 : x0;
      const step = (x1 - x0) * 0.4;
      const [sx0, sx1] = m.side < 0 ? [x0, x1 - step] : [x0 + step, x1];
      const [hx0, hx1] = m.side < 0 ? [x1 - step, x1] : [x0, x0 + step];
      b.box(sx0, SLAB + 0.32, z0, sx1 - sx0, top - SLAB - 0.52, z1 - z0, STUCCO);
      b.box(hx0, SLAB + 0.32, z0, hx1 - hx0, top - SLAB - 0.32, z1 - z0, STUCCO);
      b.box(sx0 - 0.04, top - 0.2, z0 - 0.04, sx1 - sx0 + 0.04, 0.07, z1 - z0 + 0.08, CAP);
      b.box(hx0 - 0.04, top, z0 - 0.04, hx1 - hx0 + 0.08, 0.08, z1 - z0 + 0.08, CAP);
      // The name, facing the avenue, on the lower length
      const w = sx1 - sx0 - 0.5;
      const h = w * (96 / 512);
      b.add(
        new THREE.PlaneGeometry(w, h).translate((sx0 + sx1) / 2, SLAB + 0.32 + (top - SLAB - 0.52 - 0.32) / 2 + 0.16, z1 + 0.008),
        NAME
      );
      // Uplights in the ground in front, near only
      b.detail(() => {
        for (const f of [0.25, 0.75]) b.add(new THREE.CircleGeometry(0.1, 10).rotateX(-Math.PI / 2).translate(sx0 + (sx1 - sx0) * f, SLAB + 0.008, z1 + 0.35), UPLIGHT);
        // (a planter at the tall end, where the wall meets the street)
        b.box(inner - (m.side < 0 ? 0.9 : -0.1), SLAB, z1 + 0.1, 0.8, 0.28, 0.6, STONE);
      });
      b.build(into, { cast: true, receive: true });
    });
  }

  /* ---------- The footpath from Palm Court ---------- */
  {
    const [x0, z0, x1, z1] = PATH;
    // (on the ground between Palm Court's sidewalk and Sunridge's, then on Sunridge's slab to the loop's sidewalk)
    const palm = COURT[2] + WALK_W;
    site('sunridge path', [palm - 1, z0 - 1, x1 + 1, z1 + 1], (into) => {
      const b = new Batch();
      b.box(palm, 0, z0, WEST_EDGE - WALK_W - palm, 0.012, z1 - z0, PAVING);
      b.box(x0, SLAB, z0, x1 - x0, 0.006, z1 - z0, PAVING);
      b.build(into, { cast: false, receive: true });
    });
  }
}
