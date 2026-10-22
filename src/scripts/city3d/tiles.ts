/*
 * The tile grid (docs/growth-plan.md Phase 1; DOM-free, tested in
 * tests/tiles.test.ts). The world is cut into square tiles, and the city's
 * fixed geometry is merged per tile instead of per district (`tileBatch()`
 * in kit.ts), so a tile out of view, or out of the sun's shadow box, isn't
 * drawn at all. Later phases build tiles as you go and keep a near and a far
 * form of each.
 */
import { EXT } from './layout';

/** A tile's side, in tiles of the city (about 54 m): the sun's shadow box (60 across) covers four to nine */
export const TILE = 30;

export type TileIx = [number, number];
/** x0, z0, x1, z1 */
export type Rect = [number, number, number, number];

/** The tile a point is in */
export const tileOf = (x: number, z: number): TileIx => [Math.floor(x / TILE), Math.floor(z / TILE)];
export const tileKey = (i: number, j: number) => `${i},${j}`;
/** A tile's footprint */
export const tileRect = (i: number, j: number): Rect => [i * TILE, j * TILE, (i + 1) * TILE, (j + 1) * TILE];

/** Every tile with a footprint inside the rectangle x0..x1, z0..z1 */
export function tilesIn(x0: number, z0: number, x1: number, z1: number): TileIx[] {
  const out: TileIx[] = [];
  const [i0, j0] = tileOf(x0, z0);
  const [i1, j1] = tileOf(x1, z1);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) out.push([i, j]);
  return out;
}

/** The world's tiles, edge to edge */
export const WORLD_TILES: TileIx[] = tilesIn(EXT[0], EXT[0], EXT[1] - 1e-6, EXT[1] - 1e-6);

/** The tiles within `r` of a point */
export function tilesNear(x: number, z: number, r: number): TileIx[] {
  return tilesIn(x - r, z - r, x + r, z + r).filter(([i, j]) => {
    const [x0, z0, x1, z1] = tileRect(i, j);
    const dx = Math.max(x0 - x, 0, x - x1);
    const dz = Math.max(z0 - z, 0, z - z1);
    return dx * dx + dz * dz <= r * r;
  });
}

/** A frustum's plane: inside where nx x + ny y + nz z + d >= 0 (as three's Plane) */
export type Plane = [number, number, number, number];

/**
 * Whether an upright box might be in view: false only when it's wholly
 * outside one of the planes (the test three's Frustum.intersectsBox makes)
 */
export function boxInView(planes: readonly Plane[], x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
  for (const [nx, ny, nz, d] of planes) {
    // The corner furthest along the plane's normal
    const px = nx > 0 ? x1 : x0;
    const py = ny > 0 ? y1 : y0;
    const pz = nz > 0 ? z1 : z0;
    if (nx * px + ny * py + nz * pz + d < 0) return false;
  }
  return true;
}

/** The tiles a view can see, each taken as a box from `y0` to `y1` (the ground to its tallest building) */
export function tilesInView(planes: readonly Plane[], y0: number, y1: number, tiles: readonly TileIx[] = WORLD_TILES): TileIx[] {
  return tiles.filter(([i, j]) => {
    const [x0, z0, x1, z1] = tileRect(i, j);
    return boxInView(planes, x0, y0, z0, x1, y1, z1);
  });
}

/* ---------- Near and far (growth plan Phase 2) ---------- */

/** How far a point is from an upright box (0 inside it) */
export function boxDistance(x: number, y: number, z: number, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
  const dx = Math.max(x0 - x, 0, x - x1);
  const dy = Math.max(y0 - y, 0, y - y1);
  const dz = Math.max(z0 - z, 0, z - z1);
  return Math.hypot(dx, dy, dz);
}

/** How much further than the swap distance something already near stays near, so a tile on the line doesn't flicker */
export const FAR_MARGIN = 8;

/**
 * Whether something `d` from the camera is drawn in its near form: within
 * `far` it is; once near, it stays near until `FAR_MARGIN` past it
 */
export const isNear = (d: number, far: number, wasNear: boolean) => d <= (wasNear ? far + FAR_MARGIN : far);
