/*
 * South of The Trenches drawn (docs/south-plan.md Phase 1b; the data is south.ts and endswood.ts), a district loaded as
 * you approach (districts.ts `LAZY_DISTRICTS` id `south`), as sites (tilework.ts): its streets (asphalt following
 * their curves, a dashed centre line down the main roads and links, the turning circles), the Circus's island, the
 * footpaths out of every close and their bollards, the brook between its banks and its bridge, the hedges round the
 * fields, the rec ground's grass, St Aldwyn's churchyard, Degen's compound on its paved plot (home3d.ts) and Lot 9's
 * tunnel under the ring road (tunnel3d.ts). Its blocks' slabs are world.ts's (the street plan's), its lamps are placed
 * at the boot (index.ts, endswood.ts `ENDS_LAMPS`).
 */
import * as THREE from 'three';
import type { Tick } from './world';
import { SLAB } from './world';
import { Batch, PAL, fx, glowMat, lit, toon } from './kit';
import { site } from './tilework';
import { dashes, pieces, ribbon, unit } from './roads3d';
import { COVER, KERB, PLANT, ROAD, STONE, VERGE } from './palette';
import { BRIDGES, BROOK, BROOK_HALF, BULB, CHURCHYARD, CIRCUS, FOOTPATHS, HEDGES, PATH_HALF, REC, SOUTH_CROSSINGS, SOUTH_STREETS, type Pt } from './south';
import { BOLLARD, PATH_BOLLARDS } from './endswood';
import { PLOT } from './endsfar';
import { registerHome } from './home3d';
import { HOME_POOLS } from './home';
import { registerTunnel } from './tunnel3d';

export const SELF = import.meta.url;

type Rect = [number, number, number, number];

/** The asphalt, level with the city's other district streets; the Circus's a hair over the spokes where they meet */
const Y = 0.031;
const RING_Y = 0.034;
const LINE_Y = 0.041;
/** On a block: over the slab's top, and what lies over that */
const ON = SLAB + 0.006;
const OVER = ON + 0.006;
/** On the open ground (the brook's banks, the rec ground) */
const GROUND = 0.02;

const ASPHALT = toon(ROAD.asphalt);
const LINE = toon(ROAD.line);
const PATH = toon(STONE.path);
const POST = toon(STONE.kerb);
const KERB_GRIT = toon(KERB.grit);
const ISLAND = toon(COVER.planted);
const WATER = toon('#2c4f6e');
const BANKS = toon(COVER.bank);
const HEDGE = toon(VERGE.hedge);
const HEDGE_TOP = toon(VERGE.hedgeTop);
const SHRUB = toon(PLANT.shrub);
const REC_GRASS = toon(COVER.lawn);
const YARD_GRASS = toon(COVER.wornLawn);
const PAVING = toon('#6d6672');
const PAVING_DARK = toon('#5f5965');

const rectOf = (pts: Pt[], pad: number): Rect => [Math.min(...pts.map((p) => p[0])) - pad, Math.min(...pts.map((p) => p[1])) - pad, Math.max(...pts.map((p) => p[0])) + pad, Math.max(...pts.map((p) => p[1])) + pad];
/** A flat outline at y, facing up */
function flatPoly(b: Batch, poly: Pt[], y: number, m: THREE.Material) {
  const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, y, 0);
  g.deleteAttribute('uv');
  b.add(g, m);
}
/** A box along a segment a to c, `w` across, from y0 to y1 */
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
/** A rect cut into pieces no longer than about `most` either way */
function cutRect([x0, z0, x1, z1]: Rect, most = 13): Rect[] {
  const [nx, nz] = [Math.max(1, Math.ceil((x1 - x0) / most)), Math.max(1, Math.ceil((z1 - z0) / most))];
  const out: Rect[] = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) out.push([x0 + ((x1 - x0) * i) / nx, z0 + ((z1 - z0) * j) / nz, x0 + ((x1 - x0) * (i + 1)) / nx, z0 + ((z1 - z0) * (j + 1)) / nz]);
  return out;
}

/** The streets: asphalt along each, a dashed centre line down the main roads and links, the turning circles */
function registerStreets(low: boolean) {
  const crossings = SOUTH_CROSSINGS.map((c) => c.at);
  const nearCrossing = (x: number, z: number, r: number) => crossings.some((c) => Math.hypot(c[0] - x, c[1] - z) < r);
  for (const s of SOUTH_STREETS) {
    const lined = !s.loop && (s.kind === 'main' || s.kind === 'link');
    const y = s.loop ? RING_Y : Y;
    pieces(s.pts, s.half + 0.5).forEach((pc, k) =>
      site(`south street ${s.id} ${k}`, pc.rect, (into) => {
        const b = new Batch();
        b.add(ribbon(pc.pts, -s.half, s.half, () => y), ASPHALT);
        if (lined) {
          const ds: THREE.Matrix4[] = [];
          dashes(ds, pc.pts, 0, 1.6, 1.2, 0.09, () => LINE_Y, (x, z) => nearCrossing(x, z, s.half + 4));
          b.instances(unit, LINE, ds);
        }
        b.build(into, { cast: false, receive: true });
      })
    );
    if (s.bulb) {
      const e = s.pts[s.pts.length - 1];
      site(`south bulb ${s.id}`, [e[0] - BULB - 1, e[1] - BULB - 1, e[0] + BULB + 1, e[1] + BULB + 1], (into) => {
        const b = new Batch();
        b.add(new THREE.CircleGeometry(BULB, low ? 20 : 32).rotateX(-Math.PI / 2).translate(e[0], Y + 0.002, e[1]), ASPHALT);
        b.build(into, { cast: false, receive: true });
      });
    }
  }
  // Each junction's mouth filled: where two curved streets meet, the gap between their ribbons' edges is asphalt too (a
  // disc under them; the blocks' slabs stand over its rim)
  for (const [i, c] of SOUTH_CROSSINGS.entries()) {
    // (as far as the kerbs' corners reach at a sharpish junction, short of showing on open ground beyond)
    const r = c.streets.includes('south-circus') ? 6.2 : 4.4;
    site(`south junction ${i}`, [c.at[0] - r - 0.5, c.at[1] - r - 0.5, c.at[0] + r + 0.5, c.at[1] + r + 0.5], (into) => {
      const b = new Batch();
      b.add(new THREE.CircleGeometry(r, low ? 16 : 24).rotateX(-Math.PI / 2).translate(c.at[0], Y - 0.003, c.at[1]), ASPHALT);
      b.build(into, { cast: false, receive: true });
    });
  }
  // The Circus's island: a kerb round a planted mound (the well under it is Phase 4's)
  const r = CIRCUS.r - CIRCUS.half;
  site('south circus island', [CIRCUS.x - r - 1, CIRCUS.z - r - 1, CIRCUS.x + r + 1, CIRCUS.z + r + 1], (into) => {
    const b = new Batch();
    b.add(new THREE.CylinderGeometry(r, r, SLAB, low ? 24 : 40).translate(CIRCUS.x, SLAB / 2, CIRCUS.z), KERB_GRIT);
    b.add(new THREE.CircleGeometry(r - 0.3, low ? 24 : 40).rotateX(-Math.PI / 2).translate(CIRCUS.x, SLAB + 0.005, CIRCUS.z), ISLAND);
    b.detail(() => {
      if (low) return;
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2 + 0.4;
        b.add(new THREE.SphereGeometry(0.7 + (k % 3) * 0.15, 8, 6).scale(1, 0.7, 1).translate(CIRCUS.x + Math.cos(a) * (r - 2.2), SLAB + 0.35, CIRCUS.z + Math.sin(a) * (r - 2.2)), SHRUB);
      }
    });
    b.build(into, { cast: true, receive: true });
  });
}

/** The footpaths out of the closes (paved, over the blocks they cross) and the bollards at their ends */
function registerFootpaths(low: boolean) {
  for (const f of FOOTPATHS) {
    const [a, c] = f.pts;
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const own = SOUTH_STREETS.find((s) => s.id === f.from);
    const tunnel = f.id.endsWith('tunnel-path');
    // (from its turning circle's kerb, or its street's, to the far street's kerb: what's between is the blocks')
    const from = tunnel ? 0 : own?.bulb && !own.id.endsWith('underhill') ? BULB : (own?.half ?? 1.7);
    const to = l - 1.7;
    if (to - from < 0.5) continue;
    const [ux, uz] = [(c[0] - a[0]) / l, (c[1] - a[1]) / l];
    const p0: Pt = [a[0] + ux * from, a[1] + uz * from];
    const p1: Pt = [a[0] + ux * to, a[1] + uz * to];
    site(`south path ${f.id}`, rectOf([p0, p1], PATH_HALF + 0.5), (into) => {
      const b = new Batch();
      b.add(ribbon([p0, p1], -PATH_HALF, PATH_HALF, () => (tunnel ? Y + 0.004 : OVER)), PATH);
      b.build(into, { cast: false, receive: true });
    });
  }
  const posts: THREE.Matrix4[] = PATH_BOLLARDS.map(([x, z]) => new THREE.Matrix4().compose(new THREE.Vector3(x, SLAB + BOLLARD.h / 2, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)));
  const post = new THREE.CylinderGeometry(BOLLARD.r, BOLLARD.r, BOLLARD.h, low ? 6 : 10);
  // (in a site a run of a few: near each other's ends)
  for (let i = 0; i < posts.length; i += 8) {
    const run = PATH_BOLLARDS.slice(i, i + 8);
    site(`south bollards ${i}`, rectOf(run, 1), (into) => {
      const b = new Batch();
      b.instances(post, POST, posts.slice(i, i + 8));
      b.build(into, { cast: true, receive: true });
    });
  }
}

/** The brook between its banks, and its bridge where Southfold Lane crosses */
function registerBrook() {
  pieces(BROOK, BROOK_HALF + 1.8).forEach((pc, k) =>
    site(`south brook ${k}`, pc.rect, (into) => {
      const b = new Batch();
      b.add(ribbon(pc.pts, -BROOK_HALF - 1.4, BROOK_HALF + 1.4, () => GROUND), BANKS);
      b.add(ribbon(pc.pts, -BROOK_HALF, BROOK_HALF, () => GROUND + 0.005), WATER);
      b.build(into, { cast: false, receive: true });
    })
  );
  for (const [i, br] of BRIDGES.entries()) {
    const s = SOUTH_STREETS.find((q) => q.id === br.street)!;
    const k = s.pts.findIndex((p) => p[0] === br.at[0] && p[1] === br.at[1]);
    const [a, c] = [s.pts[Math.max(0, k - 3)], s.pts[Math.min(s.pts.length - 1, k + 3)]];
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
    const [nx, nz] = [-(c[1] - a[1]) / l, (c[0] - a[0]) / l];
    site(`south bridge ${i}`, rectOf([a, c], s.half + 2), (into) => {
      const b = new Batch();
      for (const side of [-1, 1]) {
        const off = s.half + 0.45;
        const [p, q]: [Pt, Pt] = [
          [a[0] + nx * off * side, a[1] + nz * off * side],
          [c[0] + nx * off * side, c[1] + nz * off * side],
        ];
        wallBox(b, p, q, 0.3, 0, 0.75, KERB_GRIT);
        wallBox(b, p, q, 0.38, 0.75, 0.82, POST);
      }
      b.build(into, { cast: true, receive: true });
    });
  }
}

/** The hedges along the old field lines (a clipped hedge, its top a shade lighter) */
function registerHedges(low: boolean) {
  for (const [h, hedge] of HEDGES.entries())
    pieces(hedge, 1.5).forEach((pc, k) =>
      site(`south hedge ${h} ${k}`, pc.rect, (into) => {
        const b = new Batch();
        for (let i = 1; i < pc.pts.length; i++) {
          const [a, c] = [pc.pts[i - 1], pc.pts[i]];
          // (each length a little longer, so they meet round a bend; a gap now and then where the field gate is)
          const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
          const [ux, uz] = [(c[0] - a[0]) / l, (c[1] - a[1]) / l];
          const [p, q]: [Pt, Pt] = [
            [a[0] - ux * 0.2, a[1] - uz * 0.2],
            [c[0] + ux * 0.2, c[1] + uz * 0.2],
          ];
          const tall = 1.0 + 0.15 * Math.sin(a[0] * 0.7 + a[1] * 0.3);
          wallBox(b, p, q, 0.9, 0, tall, HEDGE);
          if (!low) wallBox(b, p, q, 0.7, tall, tall + 0.08, HEDGE_TOP);
        }
        b.build(into, { cast: true, receive: true });
      })
    );
}

/** The rec ground's mown grass by the brook, St Aldwyn's churchyard's on its hill (what stands on them is Phase 3's) */
function registerGreens() {
  site('south rec', rectOf(REC, 1), (into) => {
    const b = new Batch();
    flatPoly(b, REC, GROUND + 0.004, REC_GRASS);
    b.build(into, { cast: false, receive: true });
  });
  site('south churchyard', rectOf(CHURCHYARD, 1), (into) => {
    const b = new Batch();
    flatPoly(b, CHURCHYARD, OVER, YARD_GRASS);
    b.build(into, { cast: false, receive: true });
  });
}

/** Degen's compound's plot: block paving in two tones (courses across it); its wall, gates and buildings are home3d.ts's */
function registerPlot() {
  cutRect(PLOT, 13).forEach((p, j) =>
    site(`south plot ${j}`, [p[0] - 0.5, p[1] - 0.5, p[2] + 0.5, p[3] + 0.5], (into) => {
      const b = new Batch();
      flatPoly(b, [[p[0], p[1]], [p[0], p[3]], [p[2], p[3]], [p[2], p[1]]], ON, PAVING);
      b.detail(() => {
        for (let z = Math.ceil(p[1] / 1.2) * 1.2; z < p[3]; z += 2.4) {
          const z1 = Math.min(p[3], z + 1.2);
          flatPoly(b, [[p[0], z], [p[0], z1], [p[2], z1], [p[2], z]], OVER, PAVING_DARK);
        }
      });
      b.build(into, { cast: false, receive: true });
    })
  );
}

export function register({ low, scene }: { low: boolean; scene: THREE.Scene | null; tick?: (f: Tick) => void }) {
  registerStreets(low);
  registerFootpaths(low);
  registerBrook();
  registerHedges(low);
  registerGreens();
  registerPlot();
  // Degen's compound on its plot (home.ts, home3d.ts: docs/ends-far-west-plan.md Phase 2)
  registerHome(low);
  // Lot 9's tunnel under the ring road, its mouth on Underhill Lane
  registerTunnel(low);
  // The compound's pools of light at night (home.ts `HOME_POOLS`): flat glows on the main thread, dark by day (as the
  // lamps' pools), one instanced mesh in the FX layer
  if (!scene) return;
  const flatQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), lit(glowMat(PAL.warm, 1), 0, 0.24), HOME_POOLS.length);
  const [m4, v, sv] = [new THREE.Matrix4(), new THREE.Vector3(), new THREE.Vector3()];
  HOME_POOLS.forEach(([x, z, size], i) => pools.setMatrixAt(i, m4.compose(v.set(x, SLAB + 0.04, z), flatQ, sv.setScalar(size))));
  pools.frustumCulled = false;
  pools.name = 'home-pools';
  scene.add(fx(pools));
}
