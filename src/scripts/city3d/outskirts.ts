/*
 * The outskirts' trees (docs/growth-plan.md Phases 5 and 6; DOM-free,
 * tested in tests/outskirts.test.ts): seeded tile by tile with a density per
 * area, not a fixed number spread over the whole world, so a bigger world
 * gets more trees, never thinner ones, and a tile's trees are the same
 * whatever the world's size. A belt round the town (out past the Parkway
 * and the Southside Loop) is planted thickly, the open land out to the edge
 * lightly (the belt easing out into it, no edge), and well away from the
 * city pine woods stand in patches; all keep off what the one clearing rule
 * lists (landuse.ts) and any land kept clear.
 */
import { CITY_EXT, EXT } from './layout';
import { KART_PARK } from './kartpark';
import { AIRPORT_AREAS } from './airfield';
import { TILE, tileKey, tilesIn } from './tiles';
import { rng } from './recipes';
import { TOWN_BOX, keptOff } from './landuse';
import type { Rect } from './downtown';

/** The belt: a band round the town (inside the Parkway and the Southside Loop), out to about 20 past them (x0, z0, x1, z1); where its density was measured */
export const BELT: Rect = [TOWN_BOX[0] - 24, TOWN_BOX[1] - 24, TOWN_BOX[2] + 24, TOWN_BOX[3] + 24];
/**
 * The belt's density eased out (docs/blend-plan.md Phase 1: no cliff where it ends): the belt's own out to `full`
 * past the town's box, easing to the open land's by `fade`; the band's trees as many as the belt's were (`full`
 * plus half the ease is the belt's 24)
 */
export const BELT_EASE = { full: 8, fade: 40 };
/** How far x, z is outside the town's box (0 inside it) */
const fromTown = (x: number, z: number) => Math.hypot(Math.max(TOWN_BOX[0] - x, 0, x - TOWN_BOX[2]), Math.max(TOWN_BOX[1] - z, 0, z - TOWN_BOX[3]));
/** The belt's share at x, z: 1 by the town, 0 on the open land past the ease */
export function beltShare(x: number, z: number) {
  const d = fromTown(x, z);
  if (d <= BELT_EASE.full) return 1;
  if (d >= BELT_EASE.fade) return 0;
  const t = (d - BELT_EASE.full) / (BELT_EASE.fade - BELT_EASE.full);
  return 1 - t * t * (3 - 2 * t);
}
/** Where the belt reaches (its ease's end) */
const NEAR: Rect = [TOWN_BOX[0] - BELT_EASE.fade, TOWN_BOX[1] - BELT_EASE.fade, TOWN_BOX[2] + BELT_EASE.fade, TOWN_BOX[3] + BELT_EASE.fade];

/**
 * How much land a tree may stand on in the world before Phase 6 (-200 to
 * 240: the belt's, and the open land's past it to 4 in from that edge): the
 * densities are worked out from these, so that world kept the trees it had
 * (`count` in the belt, `count` x `sparse` past it); the tests check they're
 * still right (measured again when the river was widened, river plan step 1)
 */
export const BELT_FREE = 11790;
export const OPEN_FREE = 86920;

/**
 * Whether a tree may stand at x, z: clear of land kept clear (`clear`, 2 round) and of everything the one rule keeps
 * the trees off (landuse.ts: the streets, the districts, the river, the metro, with their margins wobbled). `all`
 * false is the land as it was when the densities were worked out (no ring highway, nothing built since, the margins
 * not wobbled)
 */
export function treeSpot(x: number, z: number, clear: readonly Rect[] = [], all = true) {
  if (clear.some((c) => x > c[0] - 2 && x < c[2] + 2 && z > c[1] - 2 && z < c[3] + 2)) return false;
  return keptOff(x, z, all) === null;
}

/**
 * The woods (growth plan Phase 6): patches where a smooth seeded noise (on a
 * lattice `cell` apart) is over `over`, only further than `clear` from the
 * built-up area (so none on the land the world had before, -200 to 240);
 * planted `density` times as thickly as the belt, `pine` of them pines,
 * and bigger than the town's trees
 */
export const WOODS = { clear: 120, cell: 90, over: 0.66, density: 2.5, pine: 0.8 };

/**
 * What the woods keep `clear` of: the town and the kart park, with the land the airport stood on before it moved out
 * to the world's south edge (docs/airport-plan.md Phase 3: open land, kept for later), all in one box as the built-up
 * area was; and the airport where it is now, its parts each on their own (one box round them all would clear the
 * whole east side)
 */
export const WOODS_OFF: Rect[] = [
  [Math.min(CITY_EXT[0], KART_PARK.x0), Math.min(CITY_EXT[0], KART_PARK.z0), Math.max(CITY_EXT[1], KART_PARK.x1, 234), Math.max(CITY_EXT[1], KART_PARK.z1, 279)],
  ...AIRPORT_AREAS,
];
/** How far a point is from the built-up area (0 inside it) */
const fromCity = (x: number, z: number) => Math.min(...WOODS_OFF.map((b) => Math.hypot(Math.max(b[0] - x, 0, x - b[2]), Math.max(b[1] - z, 0, z - b[3]))));
/** A lattice point's own number, 0-1 */
const corner = (i: number, j: number, k: number) => ((hash(`woods ${k} ${i},${j}`) >>> 0) % 10007) / 10007;
/** Smooth noise on a lattice 1 apart, eased between its points (0-1) */
function lattice(u: number, v: number, k: number) {
  const [i, j] = [Math.floor(u), Math.floor(v)];
  const ease = (t: number) => t * t * (3 - 2 * t);
  const [a, b] = [ease(u - i), ease(v - j)];
  const top = corner(i, j, k) * (1 - a) + corner(i + 1, j, k) * a;
  const bottom = corner(i, j + 1, k) * (1 - a) + corner(i + 1, j + 1, k) * a;
  return top * (1 - b) + bottom * b;
}
/** The woods' noise at x, z (0-1): two layers on lattices turned off the world's grid, so the patches come out round, not boxy */
function woodsNoise(x: number, z: number) {
  const c = WOODS.cell;
  const big = lattice((x * 0.8 + z * 0.6) / c, (z * 0.8 - x * 0.6) / c, 0);
  const small = lattice((x * 0.34 - z * 0.94) / (c * 0.4), (z * 0.34 + x * 0.94) / (c * 0.4), 1);
  return big * 0.7 + small * 0.3;
}
/** Whether x, z is in the woods (a tree may still not stand there: `treeSpot()`) */
export function inWoods(x: number, z: number) {
  return fromCity(x, z) > WOODS.clear && woodsNoise(x, z) > WOODS.over;
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
 * The outskirts' trees: `count` is the belt's (the tier's),
 * `sparse` the open land's share of it (the woods' comes from the belt's).
 * Tile by tile, each tile its own seed: a number of tries in proportion to
 * its land, each kept where a tree may stand.
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
    // Near the town at the belt's density, kept in the share the ease gives (the open land's at least); past it the open land's
    const near = overlap(here, NEAR);
    if (near) plant(near, belt, (x, z) => r() < open / belt + (1 - open / belt) * beltShare(x, z));
    plant(here, open, (x, z) => !inside(NEAR, x, z));
    // The woods, after the rest (so the trees before them stay as they were), in tiles reaching out past the clearance
    // (the distance is greatest at a corner)
    if (Math.max(fromCity(here[0], here[1]), fromCity(here[2], here[1]), fromCity(here[0], here[3]), fromCity(here[2], here[3])) > WOODS.clear) {
      const want = belt * WOODS.density * area(here);
      const tries = Math.floor(want) + (r() < want - Math.floor(want) ? 1 : 0);
      for (let n = 0; n < tries; n++) {
        const x = here[0] + r() * (here[2] - here[0]);
        const z = here[1] + r() * (here[3] - here[1]);
        const pine = r() < WOODS.pine;
        // Old woods: taller than the town's trees, so they read as woods without standing any thicker
        const s = pine ? 1.8 + r() * 1.4 : 1.5 + r() * 0.9;
        if (inWoods(x, z) && treeSpot(x, z, clear)) out.push({ x, z, s, pine });
      }
    }
  }
  return out;
}

/** A tile's own seed */
function hash(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return h | 0;
}

/** The land a tree could stand on in a rectangle when the densities were worked out, measured on a grid (`step` apart): for checking `BELT_FREE` and `OPEN_FREE` */
export function freeLand(rect: Rect, step: number, skip?: Rect) {
  let n = 0;
  for (let x = rect[0] + step / 2; x < rect[2]; x += step)
    for (let z = rect[1] + step / 2; z < rect[3]; z += step) if (!(skip && inside(skip, x, z)) && treeSpot(x, z, [], false)) n++;
  return n * step * step;
}
