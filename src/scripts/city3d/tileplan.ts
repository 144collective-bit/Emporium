/*
 * Building as you go (docs/growth-plan.md Phase 3; DOM-free, tested in
 * tests/tileplan.test.ts): the choices, apart from the drawing.
 *
 * The city's fixed geometry outside the places is made of sites: a piece of
 * the city (a tile's trees, the airport's runway, the kart park's circuit)
 * that a function draws from data, the same every time it runs. The boot
 * builds only the sites round the home view; the rest wait in a queue and
 * are built a few at a time, nearest first (ahead of you when you're moving
 * fast). A tile far from the camera can let its near pieces go when the
 * near forms held add up past the tier's budget, furthest first, and they're
 * built again from the same data before it comes near.
 */
import { TILE, boxDistance, tileKey, tilesIn, type Rect, type TileIx } from './tiles';

/** A site as the plan sees it: its name and the ground it covers */
export interface SiteArea {
  id: string;
  rect: Rect;
}

/** The tiles a rectangle covers */
export const tilesOfRect = ([x0, z0, x1, z1]: Rect): TileIx[] => tilesIn(x0, z0, x1 - 1e-6, z1 - 1e-6);

/** How far a point is from a rectangle on the ground (0 inside it) */
export const rectDistance = (x: number, z: number, [x0, z0, x1, z1]: Rect) => boxDistance(x, 0, z, x0, 0, z0, x1, 0, z1);

/**
 * The sites the boot builds: those touching any of `tiles` (the tiles in the
 * home view). What lies elsewhere costs the boot nothing, however much of it
 * there is.
 */
export function bootSites<S extends SiteArea>(sites: readonly S[], tiles: readonly TileIx[]): S[] {
  const want = new Set(tiles.map(([i, j]) => tileKey(i, j)));
  return sites.filter((s) => tilesOfRect(s.rect).some(([i, j]) => want.has(tileKey(i, j))));
}

/** How far ahead of you the queue looks while you're moving, in seconds */
export const LOOK_AHEAD = 2.5;

/**
 * Where the queue builds towards: the camera, or where it will be in
 * `LOOK_AHEAD` seconds at velocity vx, vz (walking or driving fast pulls the
 * tiles ahead first)
 */
export const focusOf = (x: number, z: number, vx: number, vz: number): [number, number] => [x + vx * LOOK_AHEAD, z + vz * LOOK_AHEAD];

/** The nearest waiting site to the focus (its index in `queue`), or -1 */
export function nextSite(queue: readonly SiteArea[], fx: number, fz: number): number {
  let best = -1;
  let bestD = Infinity;
  queue.forEach((s, i) => {
    const d = rectDistance(fx, fz, s.rect);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

/** The sites waiting within `r` of a point (what a fly-in, a panel or walking in needs built before it gets there) */
export const sitesNear = <S extends SiteArea>(queue: readonly S[], x: number, z: number, r: number) => queue.filter((s) => rectDistance(x, z, s.rect) <= r);

/**
 * How much further than the swap distance a tile's near pieces are always
 * kept (so it never lets them go just before it might need them), and how
 * much closer a tile that let them go is built again (before it's near)
 */
export const KEEP_LEAD = 40;
export const REBUILD_LEAD = 24;

/** A tile holding near pieces that could be let go (or that has let them go) */
export interface HeldTile {
  key: string;
  /** The camera's distance to the tile */
  d: number;
  /** What its near pieces take, in bytes */
  bytes: number;
  /** Whether it's drawn near now */
  near: boolean;
}

/**
 * The tiles to let go of their near pieces: none while what's held fits
 * `budget`; past it, the furthest first until it fits, never one drawn near
 * or within `far` + `KEEP_LEAD` of the camera
 */
export function toRelease(held: readonly HeldTile[], budget: number, far: number): string[] {
  let total = held.reduce((n, t) => n + t.bytes, 0);
  if (total <= budget) return [];
  const out: string[] = [];
  for (const t of [...held].filter((t) => !t.near && t.d > far + KEEP_LEAD).sort((a, b) => b.d - a.d)) {
    if (total <= budget) break;
    out.push(t.key);
    total -= t.bytes;
  }
  return out;
}

/** The tiles that let their near pieces go and are now close enough to need them back, nearest first */
export function toRebuild(released: readonly { key: string; d: number }[], far: number): string[] {
  return released
    .filter((t) => t.d <= far + REBUILD_LEAD)
    .sort((a, b) => a.d - b.d)
    .map((t) => t.key);
}

/** A tile's footprint from its key */
export function keyRect(key: string): Rect {
  const [i, j] = key.split(',').map(Number);
  return [i * TILE, j * TILE, (i + 1) * TILE, (j + 1) * TILE];
}
