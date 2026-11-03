/*
 * Where the outskirts' trees may stand: one clearing rule (docs/blend-plan.md
 * Phase 1; DOM-free, tested in tests/landuse.test.ts and
 * tests/outskirts.test.ts). Everything the trees keep off is here as data, in
 * one list (`KEEPS`): the ring highway and every street of the plan with its
 * slip lanes, each district's land, the airport and the low end of its
 * approach, the river, the hills (which carry their own planting) and the
 * metro's line. Before, the list was spread over five modules
 * (`keepTreesOff()` calls, some made after the trees were placed), with a box
 * round every highway junction and a strip along every arterial.
 *
 * Every margin is wobbled (`wobble()`: a smooth seeded noise, 0 to `WOBBLE`
 * further out), so a tree line along a street or a district's edge comes out
 * ragged, as it grows, never as straight as a ruler. The wobble only ever
 * adds to a margin: nowhere a tree couldn't stand before can it stand now
 * (but where the junctions' boxes were wider than their slip lanes).
 *
 * The list is filed by tile (`TILE`) so a spot asks only what's near it.
 */
import { EXT, LANE, RIVER } from './layout';
import { PLAN, type Pt } from './streetplan';
import { HIGHWAY_HALF, fromHighway } from './highway';
import { MALL_AREA } from './mall';
import { BED, CREST_RECT, FOOTHILL_Z, nearHillRoad } from './crestmont';
import { naturalAt } from './terrain';
import { KART_RECTS } from './kartfacility';
import { DOCKS_RECT, inDocks } from './docks';
import { SUNRIDGE_RECT, inSunridge } from './sunridge';
import { STRIP_RECT } from './strip';
import { BEND_REACH, PARKWAY, PROMENADE, SOUTHSIDE, inTown } from './outer';
import { TERRAIN_RECT } from './hills';
import { AIRPORT_AREAS, RUNWAY } from './airfield';
import { inChannel } from './river';
import { TRENCH_RECT } from './trenches';
import { WATERFRONT_RECT } from './waterfront';
import { UPTOWN_RECT } from './uptown';
import { WESTLAKE_RECT } from './westlake';
import { STADIUM_RECTS } from './stadium';
import { TRACKS } from './metro';
import { RAMP, VERGES } from './verges';
import { TILE, tileKey } from './tiles';
import type { Rect } from './tiles';

/** How far further out a margin may wobble (tiles), and the noise's size (tiles across a swell) */
export const WOBBLE = 3;
export const WOBBLE_CELL = 14;
/** A street's verge: trees keep this far off its asphalt (and its slip lanes', the highway's own is `HIGHWAY_VERGE`) */
export const STREET_VERGE = 0.8;
export const HIGHWAY_VERGE = 1.5;
/** How far the metro's line keeps the trees off (no tree under the el) */
export const EL_CLEAR = 6;

/** What a tree keeps off: its box (with its margin and the wobble's most, for filing it) and the test, given the wobble at the spot */
export interface Keep {
  id: string;
  box: Rect;
  /** Part of the ring highway */
  highway?: boolean;
  /** Land kept clear since the densities were measured (the districts built since, their streets, the metro): left
   * out with the highway when measuring the land as it was (`freeLand()` in outskirts.ts) */
  since?: boolean;
  hit(x: number, z: number, w: number): boolean;
}

/* ---------- The wobble ---------- */

/** A lattice point's own number, 0-1 (integer hash: asked for every tree tried) */
function corner(i: number, j: number) {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/** A smooth seeded noise, 0-1, on a lattice `WOBBLE_CELL` apart, turned off the world's grid so its swells come out round */
export function noise(x: number, z: number) {
  const u = (x * 0.8 + z * 0.6) / WOBBLE_CELL;
  const v = (z * 0.8 - x * 0.6) / WOBBLE_CELL;
  const [i, j] = [Math.floor(u), Math.floor(v)];
  const ease = (t: number) => t * t * (3 - 2 * t);
  const [a, b] = [ease(u - i), ease(v - j)];
  const top = corner(i, j) * (1 - a) + corner(i + 1, j) * a;
  const bottom = corner(i, j + 1) * (1 - a) + corner(i + 1, j + 1) * a;
  return top * (1 - b) + bottom * b;
}
/** How much further out than its margin a tree keeps at x, z (0 to `WOBBLE`) */
export const wobble = (x: number, z: number) => WOBBLE * noise(x, z);

/* ---------- What the trees keep off ---------- */

const grow = (r: Rect, m: number): Rect => [r[0] - m, r[1] - m, r[2] + m, r[3] + m];
const inRect = (r: Rect, x: number, z: number, m: number) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
/** A district's land as a rectangle, kept off by `m` (and the wobble) */
const land = (id: string, r: Rect, m: number, since = false): Keep => ({ id, since, box: grow(r, m + WOBBLE), hit: (x, z, w) => inRect(r, x, z, m + w) });
/** Land with a test of its own (`m` its margin), inside a box */
const shaped = (id: string, box: Rect, m: number, test: (x: number, z: number, m: number) => boolean): Keep => ({ id, box: grow(box, m + WOBBLE), hit: (x, z, w) => test(x, z, m + w) });
/** A line kept clear of by `m` either side (its segments' boxes, each its own keep) */
function line(id: string, pts: readonly Pt[], m: number, highway = false, since = false): Keep[] {
  const out: Keep[] = [];
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    const vx = b[0] - a[0];
    const vz = b[1] - a[1];
    const l2 = vx * vx + vz * vz;
    out.push({
      id,
      highway,
      since,
      box: [Math.min(a[0], b[0]) - m - WOBBLE, Math.min(a[1], b[1]) - m - WOBBLE, Math.max(a[0], b[0]) + m + WOBBLE, Math.max(a[1], b[1]) + m + WOBBLE],
      hit: (x, z, w) => {
        const t = l2 ? Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l2)) : 0;
        const dx = x - (a[0] + vx * t);
        const dz = z - (a[1] + vz * t);
        const r = m + w;
        return dx * dx + dz * dz < r * r;
      },
    });
  }
  return out;
}
const WORLD: Rect = [EXT[0] - 50, EXT[0] - 50, EXT[1] + 50, EXT[1] + 50];
/** The town's box: the promenades' reach, the Parkway's top and the Southside Loop's bottom (outer.ts) */
export const TOWN_BOX: Rect = [PROMENADE.x[0], Math.min(...PARKWAY.map((p) => p[1])), PROMENADE.x[1], Math.max(...SOUTHSIDE.map((p) => p[1]))];

/** Everything the outskirts' trees keep off */
export const KEEPS: Keep[] = [
  // The ring highway and its verges (highway.ts)...
  { id: 'highway', highway: true, box: WORLD, hit: (x, z, w) => fromHighway(x, z) < HIGHWAY_HALF + HIGHWAY_VERGE + w },
  // ...and every street of the plan, its slip lanes too (the arterials out to the world's edge among them)
  // (the arterials, `ns`/`ew`, were the only streets out of town when the densities were measured)
  ...PLAN.streets.filter((s) => s.kind !== 'highway').flatMap((s) => line(`street:${s.id}`, s.loop ? [...s.pts, s.pts[0]] : s.pts, s.half + STREET_VERGE, s.kind === 'slip', !/^(ns|ew)\d/.test(s.id))),
  // The town (inside the bends, the river and its banks) and the bends themselves (outer.ts)
  shaped('town', grow(TOWN_BOX, BEND_REACH), 1.2, (x, z, m) => inTown([x, z], m)),
  // The shopping plaza, the mall, its loop and car parks, and Uptown North (mall.ts)
  land('mall', MALL_AREA, 0),
  // Crestmont: the Flats (their own planting), the hill roads and their beds, and the hills, which carry their own oaks and scrub
  land('crest-flats', [CREST_RECT[0], FOOTHILL_Z - LANE - 2, CREST_RECT[2], CREST_RECT[3]], 0),
  shaped('crest-roads', CREST_RECT, BED.shoulder + 1.5, (x, z, m) => nearHillRoad(x, z, m)),
  { id: 'hills', box: TERRAIN_RECT, hit: (x, z) => naturalAt(x, z) > 0.4 },
  // The kart park, Kart Road and the car park (kartfacility.ts)
  ...KART_RECTS.map((r, i) => land(`karts-${i}`, r, 3)),
  // The Docks (their own quays and yards, the basin), Sunridge (its own planting), The Trenches and its waterfront
  shaped('docks', DOCKS_RECT, 3, (x, z, m) => inDocks(x, z, m)),
  shaped('sunridge', SUNRIDGE_RECT, 2, (x, z, m) => inSunridge(x, z, m)),
  // The Neon Mile: its boulevard and lots, laid out on the kart park's old land since (strip.ts)
  land('strip', STRIP_RECT, 3, true),
  land('trenches', TRENCH_RECT, 2, true),
  land('waterfront', WATERFRONT_RECT, 2, true),
  // Uptown, Westlake Park and the stadium's block, road, car park and footbridge
  land('uptown', UPTOWN_RECT, 2, true),
  land('westlake', WESTLAKE_RECT, 2, true),
  ...STADIUM_RECTS.map((r, i) => land(`stadium-${i}`, r, 2, true)),
  // The airport (airside, landside, the forecourt) and the low end of its approach, off the runway's west end
  ...AIRPORT_AREAS.map((r, i) => land(`airport-${i}`, r, 1)),
  land('approach', [RUNWAY.x0 - 200, RUNWAY.z - 14, RUNWAY.x0, RUNWAY.z + 14], 0),
  // The river: the promenades along the quay lines, and the water wherever its edges curve (trees grow on the banks it leaves)
  { id: 'quay-north', box: [WORLD[0], RIVER[0] - 2.8 - WOBBLE, WORLD[2], RIVER[0] + 0.5 + WOBBLE], hit: (_x, z, w) => z > RIVER[0] - 2.8 - w && z < RIVER[0] + 0.5 },
  { id: 'quay-south', box: [WORLD[0], RIVER[1] - 0.5 - WOBBLE, WORLD[2], RIVER[1] + 2.6 + WOBBLE], hit: (_x, z, w) => z > RIVER[1] - 0.5 && z < RIVER[1] + 2.6 + w },
  shaped('river', [WORLD[0], RIVER[0] - 30, WORLD[2], RIVER[1] + 30], 0.8, (x, z, m) => inChannel(x, z, m)),
  // The blocks' banks onto open land and the hedges and walls along their feet (verges.ts): a tree stands past them
  ...VERGES.flatMap((v) => line(`verge:${v.block}`, [[v.a[0] + v.n[0] * RAMP * 0.6, v.a[1] + v.n[1] * RAMP * 0.6], [v.b[0] + v.n[0] * RAMP * 0.6, v.b[1] + v.n[1] * RAMP * 0.6]], RAMP, false, true)),
  // The metro's line: no tree under the el (metro.ts)
  ...Object.values(TRACKS).flatMap((t) => line(`metro:${t.id}`, t.pts, EL_CLEAR, false, true)),
];

/* ---------- Filed by tile ---------- */

const BY_TILE = new Map<string, Keep[]>();
for (const k of KEEPS) {
  const [i0, j0, i1, j1] = [Math.floor(k.box[0] / TILE), Math.floor(k.box[1] / TILE), Math.floor(k.box[2] / TILE), Math.floor(k.box[3] / TILE)];
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++) {
      const key = tileKey(i, j);
      (BY_TILE.get(key) ?? BY_TILE.set(key, []).get(key)!).push(k);
    }
}
/** What's kept off near x, z (the keeps filed under its tile) */
export const keepsNear = (x: number, z: number) => BY_TILE.get(tileKey(Math.floor(x / TILE), Math.floor(z / TILE))) ?? [];

/**
 * What keeps a tree off x, z, if anything (its keep's id). `all` false leaves out what came after the densities
 * were measured (the ring highway with its slip lanes, and `since`), and asks with the margins as they are, not
 * wobbled: for measuring the land a tree could stand on then
 */
export function keptOff(x: number, z: number, all = true): string | null {
  const w = all ? wobble(x, z) : 0;
  for (const k of keepsNear(x, z)) if ((all || !(k.highway || k.since)) && k.hit(x, z, w)) return k.id;
  return null;
}
