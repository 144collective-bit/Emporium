/*
 * The outskirts' trees (docs/growth-plan.md Phase 5; DOM-free, tested in
 * tests/outskirts.test.ts): seeded tile by tile with a density per area, not
 * a fixed number spread over the whole world, so a bigger world gets more
 * trees, never thinner ones, and a tile's trees are the same whatever the
 * world's size. A belt round the town (out past the Parkway and the
 * Southside Loop) is planted thickly, the open land out to the edge
 * lightly; both keep off the town, the roads, the river, the airport and
 * its approach, the kart park and its slip road, and any land kept clear
 * (the test district's).
 */
import { EW_ROADS, EXT, NS_ROADS, RIVER } from './layout';
import { PARKWAY, PROMENADE, SOUTHSIDE, inTown } from './outer';
import { KART_PARK, SLIP_ROAD } from './kartpark';
import { RUNWAY, SITE } from './airfield';
import { TILE, tileKey, tilesIn } from './tiles';
import { rng } from './recipes';
import type { Rect } from './downtown';

const PARKWAY_TOP = Math.min(...PARKWAY.map((p) => p[1]));
const SOUTHSIDE_BOTTOM = Math.max(...SOUTHSIDE.map((p) => p[1]));
/** The belt: a band round the town (inside the Parkway and the Southside Loop), out to about 20 past them (x0, z0, x1, z1) */
export const BELT: Rect = [PROMENADE.x[0] - 24, PARKWAY_TOP - 24, PROMENADE.x[1] + 24, SOUTHSIDE_BOTTOM + 24];

/**
 * How much land a tree may stand on, in today's world (the belt's, and the
 * open land's past it to 4 in from the edge): the densities are worked
 * out from these, so today's world keeps the trees it had (`count` in the
 * belt, `count` x `sparse` past it); the tests check they're still right
 */
export const BELT_FREE = 11570;
export const OPEN_FREE = 98100;

/** Whether a tree may stand at x, z */
export function treeSpot(x: number, z: number, clear: readonly Rect[] = []) {
  if (clear.some((c) => x > c[0] - 2 && x < c[2] + 2 && z > c[1] - 2 && z < c[3] + 2)) return false;
  // The kart park and its slip road (kartpark.ts)
  if (x > KART_PARK.x0 - 3 && x < KART_PARK.x1 + 3 && z > KART_PARK.z0 - 3 && z < KART_PARK.z1 + 3) return false;
  if (Math.abs(x - SLIP_ROAD.x) < SLIP_ROAD.half + 2 && z > SLIP_ROAD.z0 - 1 && z < SLIP_ROAD.z1 + 1) return false;
  // Clear of the town (inside the bends, the river and its banks) and of the bends themselves
  if (inTown([x, z], 1.2)) return false;
  // Clear of the airport and of the low end of its approach
  if (x > SITE[0] - 1 && x < SITE[2] + 1 && z > SITE[1] - 1 && z < SITE[3] + 1) return false;
  if (x > -40 && x < SITE[0] && Math.abs(z - RUNWAY.z) < 12) return false;
  if (EW_ROADS.some((r) => Math.abs(z - r.c) < r.half + 0.8) || NS_ROADS.some((r) => Math.abs(x - r.c) < r.half + 0.8)) return false;
  if (z > RIVER[0] - 1 && z < RIVER[1] + 0.8) return false;
  return true;
}

export interface OutskirtTree {
  x: number;
  z: number;
  s: number;
  pine: boolean;
}

const inside = ([x0, z0, x1, z1]: Rect, x: number, z: number) => x > x0 && x < x1 && z > z0 && z < z1;
const overlap = (a: Rect, b: Rect): Rect | null => {
  const r: Rect = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
  return r[2] > r[0] && r[3] > r[1] ? r : null;
};
const area = (r: Rect) => (r[2] - r[0]) * (r[3] - r[1]);

/**
 * The outskirts' trees: `count` is the belt's in today's world (the tier's),
 * `sparse` the open land's share of it. Tile by tile, each tile its own seed:
 * a number of tries in proportion to its land, each kept where a tree may
 * stand.
 */
export function outskirtsTrees(count: number, sparse = 0.6, clear: readonly Rect[] = [], ext: [number, number] = EXT): OutskirtTree[] {
  const belt = count / BELT_FREE;
  const open = (count * sparse) / OPEN_FREE;
  const land: Rect = [ext[0] + 4, ext[0] + 4, ext[1] - 4, ext[1] - 4];
  const out: OutskirtTree[] = [];
  for (const [i, j] of tilesIn(land[0], land[1], land[2] - 1e-6, land[3] - 1e-6)) {
    const tile: Rect = [i * TILE, j * TILE, (i + 1) * TILE, (j + 1) * TILE];
    const here = overlap(tile, land);
    if (!here) continue;
    const r = rng(hash(tileKey(i, j)));
    const plant = (where: Rect, density: number, keep: (x: number, z: number) => boolean) => {
      const want = density * area(where);
      const tries = Math.floor(want) + (r() < want - Math.floor(want) ? 1 : 0);
      for (let n = 0; n < tries; n++) {
        const x = where[0] + r() * (where[2] - where[0]);
        const z = where[1] + r() * (where[3] - where[1]);
        const s = 0.8 + r() * 0.6;
        const pine = r() < 0.4;
        if (keep(x, z) && treeSpot(x, z, clear)) out.push({ x, z, s, pine });
      }
    };
    const inBelt = overlap(here, BELT);
    if (inBelt) plant(inBelt, belt, () => true);
    plant(here, open, (x, z) => !inside(BELT, x, z));
  }
  return out;
}

/** A tile's own seed */
function hash(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return h | 0;
}

/** The land a tree may stand on in a rectangle, measured on a grid (`step` apart): for checking `BELT_FREE` and `OPEN_FREE` */
export function freeLand(rect: Rect, step: number, skip?: Rect) {
  let n = 0;
  for (let x = rect[0] + step / 2; x < rect[2]; x += step)
    for (let z = rect[1] + step / 2; z < rect[3]; z += step) if (!(skip && inside(skip, x, z)) && treeSpot(x, z)) n++;
  return n * step * step;
}
