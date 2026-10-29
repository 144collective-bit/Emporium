/**
 * Crestmont's planting and the hill roads' walls (docs/crestmont-plan.md Phase 3, the owner's call: palm trees and
 * hills). DOM-free, tested in tests/landscape.test.ts; drawn by crestmont3d.ts as sites.
 *
 * - **Palms** (`PALMS`), new to the city, three kinds (`PalmKind`): tall fan palms (`fan`, thin trunks with a
 *   skirt of dead fronds under a small crown) down the boulevard's median and along the Flats' streets on the
 *   lots' street edges (clear of the lamps, the junctions and the corners), canary date palms (`date`, thick
 *   trunks, big arching crowns) along Foothill Road and at the overlook, and a few fan palms up Ridge Road.
 * - **Jacarandas** (`JACARANDAS`, purple in bloom) along downtown's east-west roads through the Flats.
 * - **The hills' own planting**: live oaks in the canyons and on the gentler slopes (`OAKS`) and chaparral scrub
 *   in clumps everywhere up the slopes (`SCRUB`), seeded tile by tile, off the hill roads and their beds; the
 *   outskirts' trees and the pine woods keep off the hills (outskirts.ts `treeSpot()`).
 * - **The roads' edges** (`WALLS`): where a hill road is cut into the slope, a stone retaining wall along its bed's
 *   edge as high as the bank behind it; where it stands out over the slope on fill, a white post-and-rail guard.
 *
 * Nothing of it is solid (the city's trees aren't); every height is the ground's (terrain.ts). Palms stay well
 * under the Emporium (`PALM_TALLEST`).
 */
import { EW_ROADS, LANE, WALK_W } from './layout';
import { BED, BOULEVARD, CREST_LAMPS, FLATS_X, FLATS_EAST, FOOTHILL_Z, HILL_ROADS, flatsHalf, nearHillRoad, roadY, type HillRoad } from './crestmont';
import { HILLS, TERRAIN_RECT } from './hills';
import { heightAt, naturalAt, slopeAt } from './terrain';
import { rng } from './recipes';

type Pt = [number, number];

export type PalmKind = 'fan' | 'date';
export interface Palm {
  x: number;
  z: number;
  /** The ground under it */
  y: number;
  kind: PalmKind;
  /** Its trunk's height (tiles) */
  h: number;
  /** Which way it leans, and which of the trunk's bends it takes (0 straight, 1 or 2 curved more) */
  turn: number;
  bend: 0 | 1 | 2;
  /** Its size (the crown and the trunk's girth) */
  s: number;
}
/** The tallest a palm stands over its own ground, crown and all (the Emporium's roof is 12.5) */
export const PALM_TALLEST = 11.5;

const BANK = EW_ROADS[3];
/** The east-west roads the Flats' streets cross (z, half) */
const CROSS = EW_ROADS.filter((r) => r.c <= BANK.c).map((r) => ({ z: r.c, half: r.half }));
/** Clear of a junction along a north-south street (z) */
const offJunction = (z: number, m: number) => CROSS.every((c) => Math.abs(z - c.z) > c.half + m) && Math.abs(z - FOOTHILL_Z) > LANE + m;
/** Clear of every lamp by `m` */
const offLamps = (x: number, z: number, m: number) => CREST_LAMPS.every(([lx, lz]) => Math.hypot(lx - x, lz - z) > m);

function palms(): Palm[] {
  const r = rng(7171);
  const out: Palm[] = [];
  const fan = (x: number, z: number, h = 7.2 + r() * 2.2) => out.push({ x, z, y: heightAt(x, z), kind: 'fan', h, turn: r() * Math.PI * 2, bend: Math.floor(r() * 3) as 0 | 1 | 2, s: 0.9 + r() * 0.2 });
  const date = (x: number, z: number) => out.push({ x, z, y: heightAt(x, z), kind: 'date', h: 3.6 + r() * 1.4, turn: r() * Math.PI * 2, bend: 0, s: 1 + r() * 0.2 });
  // The boulevard's median: a fan palm every 9, clear of its junctions
  const blvd = FLATS_X[BOULEVARD];
  for (let z = FOOTHILL_Z + 6; z < BANK.c - 4; z += 9) if (offJunction(z, 3)) fan(blvd, z, 8.4 + r() * 1.6);
  // The other streets: both sides, on the lots' street edges, every 8, clear of the junctions and the lamps
  FLATS_X.forEach((x, i) => {
    if (i === BOULEVARD) return;
    const off = flatsHalf(i) + WALK_W + 0.7;
    for (const side of [-1, 1]) {
      // (the last street's east side is the last row of blocks; its west side every street's)
      for (let z = FOOTHILL_Z + 7; z < BANK.c - 5; z += 8) {
        const px = x + side * off;
        if (!offJunction(z, 4) || !offLamps(px, z, 1.8) || px > FLATS_EAST - 0.5) continue;
        fan(px, z);
      }
    }
  });
  // Foothill Road: date palms along its south side, every 14 between the streets
  for (let x = FLATS_X[0] + 8; x < FLATS_X[FLATS_X.length - 1] - 6; x += 14) {
    const z = FOOTHILL_Z + LANE + WALK_W + 0.9;
    if (FLATS_X.every((c, i) => Math.abs(x - c) > flatsHalf(i) + 5) && offLamps(x, z, 2.5)) date(x, z);
  }
  // Up Ridge Road: a fan palm every 34 on its left verge (its lamps are on the right), and date palms at the overlook
  const ridge = HILL_ROADS.find((q) => q.id === 'crest-ridge')!;
  for (let d = 30; d < ridge.cum[ridge.cum.length - 1] - 12; d += 34) {
    const { p, n } = frameAt(ridge, d);
    const [x, z] = [p[0] - n[0] * (ridge.half + 1.4), p[1] - n[1] * (ridge.half + 1.4)];
    if (!nearHillRoad(x, z, 0.9)) out.push({ x, z, y: roadY(ridge, d), kind: 'fan', h: 7 + r() * 2, turn: r() * Math.PI * 2, bend: Math.floor(r() * 3) as 0 | 1 | 2, s: 0.9 + r() * 0.2 });
  }
  const end = ridge.pts[ridge.pts.length - 1];
  for (const [dx, dz] of [
    [-4.5, 1.5],
    [3.5, -3.5],
    [-1.5, -5],
  ] as Pt[]) {
    const [x, z] = [end[0] + dx, end[1] + dz];
    if (!nearHillRoad(x, z, 0.9)) date(x, z);
  }
  return out;
}

/** A road's point, its way along and the right of it, at a distance along it */
export function frameAt(r: HillRoad, d: number): { p: Pt; u: Pt; n: Pt } {
  let i = 1;
  while (i < r.cum.length - 1 && r.cum[i] < d) i++;
  const [a, b] = [r.pts[i - 1], r.pts[i]];
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const f = Math.min(1, Math.max(0, (d - r.cum[i - 1]) / (r.cum[i] - r.cum[i - 1] || 1)));
  const u: Pt = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  return { p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], u, n: [-u[1], u[0]] };
}

export const PALMS: Palm[] = palms();

/** Jacarandas along downtown's east-west roads through the Flats: both sides, on the lots' edges, every 11 */
export const JACARANDAS: { x: number; z: number; s: number }[] = (() => {
  const r = rng(7272);
  const out: { x: number; z: number; s: number }[] = [];
  for (const c of CROSS)
    for (const side of [-1, 1]) {
      // (none on the bank avenue's river side: that's the promenade)
      if (c.z === BANK.c && side > 0) continue;
      const z = c.z + side * (c.half + WALK_W + 0.8);
      for (let x = FLATS_X[0] + 6; x < FLATS_EAST - 3; x += 11)
        if (FLATS_X.every((s, i) => Math.abs(x - s) > flatsHalf(i) + WALK_W + 2.5)) out.push({ x, z, s: 0.95 + r() * 0.3 });
    }
  return out;
})();

/* ---------- The hills' own planting ---------- */

/** A tile's share of the hills, seeded by where it is (the same whatever else changes) */
const CELL = 10;
/** Off the hill roads and their beds, the Flats, the overlook's date palms, and the steepest banks */
const HILL_PALMS = PALMS.filter((p) => p.z < HILLS.foot.z);
const plantable = (x: number, z: number, m: number) =>
  z < HILLS.foot.z - 2 && x > TERRAIN_RECT[0] + 4 && !nearHillRoad(x, z, BED.shoulder + m) && HILL_PALMS.every((p) => Math.hypot(p.x - x, p.z - z) > 2.5) && slopeAt(x, z) < 0.9;

export interface Plant {
  x: number;
  z: number;
  y: number;
  s: number;
  /** Which of its kind's colours */
  tone: number;
}
/**
 * The live oaks: in the canyons (where the hills sit lower than their own swell would put them) and on the gentler
 * slopes low down, a few to a cell; and the scrub, in clumps all up the slopes, thicker higher up where the oaks thin
 */
function planting(): { oaks: Plant[]; scrub: Plant[] } {
  const oaks: Plant[] = [];
  // (the oaks by cell, for the "not too near an oak" tests)
  const near = new Map<number, Plant[]>();
  const nearOak = (x: number, z: number, d: number) => {
    const [cx, cz] = [Math.floor(x / CELL), Math.floor(z / CELL)];
    for (let i = cx - 1; i <= cx + 1; i++) for (let j = cz - 1; j <= cz + 1; j++) for (const o of near.get(i * 100003 + j) ?? []) if (Math.hypot(o.x - x, o.z - z) < d) return true;
    return false;
  };
  const scrub: Plant[] = [];
  const [x0, z0, x1, z1] = TERRAIN_RECT;
  for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++)
    for (let cz = Math.floor(z0 / CELL); cz <= Math.floor(z1 / CELL); cz++) {
      const r = rng(9001 + cx * 7919 + cz * 104729);
      const [bx, bz] = [cx * CELL, cz * CELL];
      const mid = naturalAt(bx + CELL / 2, bz + CELL / 2);
      if (mid < 0.6) continue;
      // How much of a canyon: the hills here lower than the cells round them
      const round = [
        [-CELL, 0],
        [CELL, 0],
        [0, -CELL],
        [0, CELL],
      ].map(([dx, dz]) => naturalAt(bx + CELL / 2 + dx, bz + CELL / 2 + dz));
      const canyon = Math.max(0, round.reduce((a, b) => a + b, 0) / 4 - mid);
      const oakCount = Math.min(4, Math.floor(canyon * 1.4 + (mid < 14 ? 1.2 : 0.3) + r() * 1.2));
      for (let k = 0; k < oakCount; k++) {
        const [x, z] = [bx + r() * CELL, bz + r() * CELL];
        if (nearOak(x, z, 3.2) || !plantable(x, z, 2.2)) continue;
        const oak: Plant = { x, z, y: heightAt(x, z), s: 1.1 + r() * 0.6, tone: Math.floor(r() * 3) };
        oaks.push(oak);
        const key = Math.floor(x / CELL) * 100003 + Math.floor(z / CELL);
        if (!near.has(key)) near.set(key, []);
        near.get(key)!.push(oak);
      }
      // The scrub: a clump or two to a cell, three to five bushes each
      const clumps = 1 + Math.floor(r() * (mid > 12 ? 3 : 2));
      for (let k = 0; k < clumps; k++) {
        const [cx0, cz0] = [bx + r() * CELL, bz + r() * CELL];
        const n = 3 + Math.floor(r() * 3);
        for (let j = 0; j < n; j++) {
          const [x, z] = [cx0 + (r() - 0.5) * 3, cz0 + (r() - 0.5) * 3];
          if (nearOak(x, z, 1.6) || !plantable(x, z, 1.2)) continue;
          scrub.push({ x, z, y: heightAt(x, z), s: 0.45 + r() * 0.5, tone: Math.floor(r() * 3) });
        }
      }
    }
  return { oaks, scrub };
}
const PLANTING = planting();
export const OAKS: Plant[] = PLANTING.oaks;
export const SCRUB: Plant[] = PLANTING.scrub;

/* ---------- The hill roads' edges: retaining walls and guard rails ---------- */

export interface Edge {
  road: string;
  /** Its two ends at the bed's edge (x, z), and the bed's height at each */
  a: Pt;
  b: Pt;
  ya: number;
  yb: number;
  /** A retaining wall's height over the bed (a cut), or 0 for a guard rail (fill); and at each end, eased between pieces */
  h: number;
  ha: number;
  hb: number;
  kind: 'wall' | 'rail';
  /** Which side of the road (right of its points' way is 1) */
  side: 1 | -1;
}
/** How deep a cut or how high a fill is before it gets a wall or a rail */
export const EDGE_AT = { cut: 0.6, fill: 0.9, step: 1.5 } as const;
/** How far out from the centre line the walls and rails stand: just past the asphalt, on the bed's shoulder */
export const EDGE_OUT = LANE + 0.55;

/** Along every hill road, both sides, in pieces `step` long: a wall where it's cut in, a rail where it's built up */
export const WALLS: Edge[] = (() => {
  const out: Edge[] = [];
  for (const r of HILL_ROADS) {
    const len = r.cum[r.cum.length - 1];
    for (const side of [-1, 1])
      for (let d = 4; d + EDGE_AT.step < len - 3; d += EDGE_AT.step) {
        const f0 = frameAt(r, d);
        const f1 = frameAt(r, d + EDGE_AT.step);
        const a: Pt = [f0.p[0] + f0.n[0] * side * EDGE_OUT, f0.p[1] + f0.n[1] * side * EDGE_OUT];
        const b: Pt = [f1.p[0] + f1.n[0] * side * EDGE_OUT, f1.p[1] + f1.n[1] * side * EDGE_OUT];
        const mid = d + EDGE_AT.step / 2;
        const fm = frameAt(r, mid);
        const y = roadY(r, mid);
        // The hills as they were, a little out past the bed: above the road a cut, below it a fill
        const out4: Pt = [fm.p[0] + fm.n[0] * side * (EDGE_OUT + 4), fm.p[1] + fm.n[1] * side * (EDGE_OUT + 4)];
        const there = naturalAt(...out4);
        // (not where another road comes in, nor at a junction's mouth)
        if (HILL_ROADS.some((o) => o !== r && o.pts.some((q) => Math.hypot(q[0] - a[0], q[1] - a[1]) < o.half + 3 || Math.hypot(q[0] - b[0], q[1] - b[1]) < o.half + 3))) continue;
        if (a[1] > HILLS.foot.z - 4 || b[1] > HILLS.foot.z - 4) continue;
        const base = { road: r.id, a, b, ya: roadY(r, d), yb: roadY(r, d + EDGE_AT.step), side: side as 1 | -1 };
        if (there - y > EDGE_AT.cut) {
          const h = Math.min(1.8, 0.35 + (there - y) * 0.35);
          out.push({ ...base, h, ha: h, hb: h, kind: 'wall' });
        } else if (y - there > EDGE_AT.fill) out.push({ ...base, h: 0, ha: 0, hb: 0, kind: 'rail' });
      }
  }
  // A wall's height eased from piece to piece (where one runs on into the next, the two meet at their mean; a run's
  // ends step down to a low cheek)
  for (const [i, e] of out.entries()) {
    if (e.kind !== 'wall') continue;
    const prev = out[i - 1];
    const next = out[i + 1];
    const joins = (p: Edge | undefined, q: Edge, end: 'a' | 'b') => !!p && p.kind === 'wall' && p.road === q.road && p.side === q.side && Math.hypot(p[end === 'a' ? 'b' : 'a'][0] - q[end][0], p[end === 'a' ? 'b' : 'a'][1] - q[end][1]) < 1e-6;
    e.ha = joins(prev, e, 'a') ? (prev.h + e.h) / 2 : Math.min(e.h, 0.4);
    e.hb = joins(next, e, 'b') ? (next.h + e.h) / 2 : Math.min(e.h, 0.4);
  }
  return out;
})();
