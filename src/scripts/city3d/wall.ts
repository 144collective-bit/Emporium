/*
 * The wall round Sector 7 (docs/wall-plan.md, the owner's call, 2026-11): 200 ft of solid concrete, a smooth slab,
 * standing past the grass round the world's edge, so the city is locked in at its size. The storyline is a
 * dystopia: the conditions to leave come later, and so do the exits (none yet: solid all round). DOM-free:
 * the drawing, walking, the sky and the tests read it.
 *
 * Everything here is worked out from `EXT`, so the wall stands round whatever world a test run sets
 * (`WORLD_EXT`, `npm run test:wide`) as round the site's own.
 */
import { EXT, RIVER } from './layout';
import type { Rect } from './downtown';

/** 1 tile is about 1.8 m (layout.ts); 200 ft is 60.96 m */
export const TILE_M = 1.8;
/** 200 ft in tiles */
export const WALL_H = (200 * 0.3048) / TILE_M;

/**
 * The wall's numbers: its inner face `out` past the world's edge (where the grass ended before the wall, world.ts
 * `SKIRT`), `thick` through, `h` tall (200 ft, about 34 tiles: nearly three times the Emporium's roof)
 */
export const WALL = { out: 80, thick: 8, h: WALL_H };

/** The wall's inner face, all round (x0, z0, x1, z1): the land you'll walk up to (Phase 3) */
export const WALL_INNER: Rect = [EXT[0] - WALL.out, EXT[0] - WALL.out, EXT[1] + WALL.out, EXT[1] + WALL.out];
/** Its outer face */
export const WALL_OUTER: Rect = [WALL_INNER[0] - WALL.thick, WALL_INNER[1] - WALL.thick, WALL_INNER[2] + WALL.thick, WALL_INNER[3] + WALL.thick];

export type WallSide = 'n' | 's' | 'w' | 'e';
/** One side of the wall: its footprint (x0, z0, x1, z1), the sides meeting at the corners with no gap */
export interface WallRun {
  side: WallSide;
  rect: Rect;
}
/**
 * The four sides, each its full thickness: north and south run corner to corner over the outer face, west and east
 * between them, so the corners are solid and nothing overlaps
 */
export const WALL_RUNS: WallRun[] = (() => {
  const [i0, j0, i1, j1] = WALL_INNER;
  const [o0, p0, o1, p1] = WALL_OUTER;
  return [
    { side: 'n', rect: [o0, p0, o1, j0] },
    { side: 's', rect: [o0, j1, o1, p1] },
    { side: 'w', rect: [o0, j0, i0, j1] },
    { side: 'e', rect: [i1, j0, o1, j1] },
  ];
})();

/** Whether a point is in the wall's footprint, `m` further out each way */
export function inWall(x: number, z: number, m = 0) {
  const [o0, p0, o1, p1] = WALL_OUTER;
  const [i0, j0, i1, j1] = WALL_INNER;
  const outside = x < o0 - m || x > o1 + m || z < p0 - m || z > p1 + m;
  const inside = x > i0 + m && x < i1 - m && z > j0 + m && z < j1 - m;
  return !outside && !inside;
}

/** How far a point inside is from the wall's inner face (negative past it) */
export function fromWall(x: number, z: number) {
  const [i0, j0, i1, j1] = WALL_INNER;
  return Math.min(x - i0, i1 - x, z - j0, j1 - z);
}

/**
 * Where the river meets the wall at either end (the owner's pick: a barred culvert, Phase 5): the river's band
 * between the quay lines, where it crosses the west and east sides. Reserved for now: the wall is solid there too,
 * and the river ends against its inner face (the grass skirt's end, world.ts `SKIRT`).
 */
export const CULVERTS: { side: 'w' | 'e'; x: number; z0: number; z1: number }[] = [
  { side: 'w', x: WALL_INNER[0], z0: RIVER[0], z1: RIVER[1] },
  { side: 'e', x: WALL_INNER[2], z0: RIVER[0], z1: RIVER[1] },
];

/**
 * Past the wall (Phase 2, the owner's pick: a little land shows before the haze takes it): the grass carries on
 * `land` past the outer face, and the grey murk stands on it in layers (`murk`: how far past the outer face each
 * stands), `h` tall, fading up from the ground
 */
export const BEYOND = { land: 48, murk: [16, 28, 40] as readonly number[], h: 80 };
/** The land past the wall, to where the grass ends (x0, z0, x1, z1) */
export const WALL_LAND: Rect = [WALL_OUTER[0] - BEYOND.land, WALL_OUTER[1] - BEYOND.land, WALL_OUTER[2] + BEYOND.land, WALL_OUTER[3] + BEYOND.land];

/** The corners of everything drawn out there (the land past the wall), which the sky dome must reach past seen from town (bounds.ts `SKY_RADIUS`) */
export const WALL_CORNERS: [number, number][] = [
  [WALL_LAND[0], WALL_LAND[1]],
  [WALL_LAND[2], WALL_LAND[1]],
  [WALL_LAND[0], WALL_LAND[3]],
  [WALL_LAND[2], WALL_LAND[3]],
];

/**
 * The look (the owner's picks): a smooth slab in cold blue-grey concrete, one flat colour, a blank face; the murk
 * past it a cold grey, shaded with the sky (wall3d.ts). `std`: how much of the city's haze the wall takes (it stands
 * out of it, so it's seen from town, but not as a cut-out: some of the air between)
 */
export const WALL_LOOK = { face: '#8f9aa8', murk: '#9aa1aa', std: 0.5 };

/**
 * Far off the wall fades into the sky's horizon (Phase 2): from `from` of the sky dome's radius to `to` past it, so
 * the far side, seen from the opposite wall about 3 km off, is the haze, not a cut edge where the sky dome ends.
 * Seen from town every side but the corners stands clear.
 */
export const WALL_HAZE = { from: 0.8, to: 1.015 };
