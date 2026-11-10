/*
 * The wall round Sector 7 (docs/wall-plan.md, the owner's call, 2026-11): 200 ft of solid concrete, a smooth slab,
 * standing past the grass round the world's edge, so the city is locked in at its size. The storyline is a
 * dystopia: the conditions to leave come later, and so do the exits (none yet: solid all round). DOM-free:
 * the drawing, walking, the sky and the tests read it.
 *
 * Everything here is worked out from `EXT`, so the wall stands round whatever world a test run sets
 * (`WORLD_EXT`, `npm run test:wide`) as round the site's own.
 */
import { EXT, WALL_OUT } from './layout';
import { WATER_Y, edgesAt, topsAt } from './river';
import type { Rect } from './downtown';

/** 1 tile is about 1.8 m (layout.ts); 200 ft is 60.96 m */
export const TILE_M = 1.8;
/** 200 ft in tiles */
export const WALL_H = (200 * 0.3048) / TILE_M;

/**
 * The wall's numbers: its inner face `out` past the world's edge (where the grass ended before the wall, world.ts
 * `SKIRT`), `thick` through, `h` tall (200 ft, about 34 tiles: nearly three times the Emporium's roof)
 */
export const WALL = { out: WALL_OUT, thick: 8, h: WALL_H };

/** The wall's inner face, all round (x0, z0, x1, z1): the land you walk up to (layout.ts `WORLD_BOUNDS`, Phase 3) */
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

/**
 * The top (Phase 4, the owner's pick: wire and cameras, no towers): a parapet along each edge (`parapet`: `h` over
 * the top, `w` thick), razor wire coiled along each parapet (`wire`, how tall the coils stand on it), and a camera
 * on a post every `camEvery` along the inner parapet, looking down into the city
 */
export const TOP = { parapet: { h: 1.2, w: 0.5 }, wire: 1.1, camEvery: 48, post: 1.5 };
/** The wall's top with its parapets: what's solid goes up to here */
export const WALL_TOP = WALL.h + TOP.parapet.h;
/**
 * The floodlights at its foot (Phase 4, the owner's pick: floodlit at night): one every `every` along the inner
 * face, `out` from it, washing a pool of light up the face that reaches about `reach` (wall3d.ts's shader draws
 * the wash from the same spacing)
 */
export const FLOOD = { every: 36, out: 1.6, reach: 22 };

/** A spot along the inner face: where it is, the way into the city from it (nx, nz) and how far along its side it is */
export interface FaceSpot {
  x: number;
  z: number;
  nx: number;
  nz: number;
  s: number;
}
/** The length of each side of the inner face */
export const SIDE = WALL_INNER[2] - WALL_INNER[0];
/**
 * Where something stands every `every` along the inner face, `out` from it: each side from its corner clockwise
 * (north west to east, east north to south, south east to west, west south to north), the first half a spacing
 * from the corner, the last at least that far from the next
 */
export function alongFace(every: number, out: number): FaceSpot[] {
  const [i0, j0, i1, j1] = WALL_INNER;
  const sides = [
    { at: (s: number) => [i0 + s, j0 + out], n: [0, 1] },
    { at: (s: number) => [i1 - out, j0 + s], n: [-1, 0] },
    { at: (s: number) => [i1 - s, j1 - out], n: [0, -1] },
    { at: (s: number) => [i0 + out, j1 - s], n: [1, 0] },
  ];
  const out_: FaceSpot[] = [];
  for (const sd of sides)
    for (let s = every / 2; s <= SIDE - every / 2 + 1e-9; s += every) {
      const [x, z] = sd.at(s);
      out_.push({ x, z, nx: sd.n[0], nz: sd.n[1], s });
    }
  return out_;
}
/** The floodlights at the foot (Phase 4) */
export const FLOODS = alongFace(FLOOD.every, FLOOD.out);
/** The cameras on the inner parapet (Phase 4), each on the parapet's middle */
export const CAMERAS = alongFace(TOP.camEvery, TOP.parapet.w / 2);

/** The wall solid (Phase 3): each side's footprint to its top, for walking, driving, the camera and bullets (solids.ts `SOLIDS`) */
export const WALL_SOLIDS: [number, number, number, number, number][] = WALL_RUNS.map(({ rect: [x0, z0, x1, z1] }) => [x0, z0, x1, z1, WALL_TOP]);

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
 * The barred culverts (Phase 5, the owner's pick): where the river meets the wall at either end it runs on under it
 * through a row of low arches with heavy bars, and the boats stop at the bars. Each arch (`bay`, at most `bay`
 * across) rises straight from the water to `spring` over it and curves to its crown at `crown` over the water;
 * `pier` wide piers between the arches and at their ends stand `out` proud of the face, from the water to `cap` over
 * it, across the channel's whole width at the slopes' tops; the bars stand `barOut` from the face, `bar` apart.
 */
export const CULVERT = { bay: 12, spring: 2.4, crown: 5.6, cap: 7, pier: 1.4, out: 0.7, bar: 0.55, barW: 0.14, barOut: 0.35, lintel: 1.1 };
export interface Culvert {
  side: 'w' | 'e';
  /** The inner face's x, and the way into the city from it (+1 east, -1 west) */
  x: number;
  dir: 1 | -1;
  /** The water's edges and the slopes' tops across the channel there (river.ts) */
  water: [number, number];
  tops: [number, number];
  /** The arches, each across (z0, z1) */
  bays: [number, number][];
}
function culvertAt(side: 'w' | 'e'): Culvert {
  const x = side === 'w' ? WALL_INNER[0] : WALL_INNER[2];
  const water = edgesAt(x);
  const tops = topsAt(x);
  const width = water[1] - water[0];
  const n = Math.ceil((width + CULVERT.pier) / (CULVERT.bay + CULVERT.pier));
  const bay = (width - (n - 1) * CULVERT.pier) / n;
  const bays: [number, number][] = Array.from({ length: n }, (_, k) => {
    const z0 = water[0] + k * (bay + CULVERT.pier);
    return [z0, z0 + bay];
  });
  return { side, x, dir: side === 'w' ? 1 : -1, water, tops, bays };
}
/** Where the river meets the wall at either end (Phase 5) */
export const CULVERTS: Culvert[] = [culvertAt('w'), culvertAt('e')];
/** An arch's top over a point across it (z), or null outside it */
export function archY(b: [number, number], z: number): number | null {
  if (z < b[0] || z > b[1]) return null;
  const c = (b[0] + b[1]) / 2;
  const hw = (b[1] - b[0]) / 2;
  const u = (z - c) / hw;
  return WATER_Y + CULVERT.spring + (CULVERT.crown - CULVERT.spring) * Math.sqrt(Math.max(0, 1 - u * u));
}
/** How far the boats can go along the river: up to the bars at either end, the river's whole length inside the wall */
export const BOAT_ENDS: [number, number] = [WALL_INNER[0] + CULVERT.barOut + CULVERT.barW, WALL_INNER[2] - CULVERT.barOut - CULVERT.barW];

/**
 * Past the wall (Phase 2, the owner's pick: a little land shows before the haze takes it): the grass carries on
 * `land` past the outer face, and the grey murk stands on it in layers (`murk`: how far past the outer face each
 * stands), `h` tall, fading up from the ground
 */
export const BEYOND = { land: 120, murk: [16, 34, 56, 84] as readonly number[], h: 110 };
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
export const WALL_LOOK = { face: '#8f9aa8', murk: '#7d848d', std: 0.5 };

/**
 * Far off the wall fades into the sky's horizon (Phase 2): from `from` of the sky dome's radius to `to` past it, so
 * the far side, seen from the opposite wall about 3 km off, is the haze, not a cut edge where the sky dome ends.
 * Seen from town every side but the corners stands clear.
 */
export const WALL_HAZE = { from: 0.8, to: 1.015 };
