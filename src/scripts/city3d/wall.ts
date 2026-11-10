/*
 * The wall round Sector 7 (docs/wall-plan.md, the owner's call, 2026-11): 200 ft of solid concrete, a smooth slab,
 * standing past the grass round the world's edge, so the city is locked in at its size. The storyline is a
 * dystopia: the conditions to leave come later, and so do the exits (none yet: solid all round). DOM-free:
 * the drawing, walking, the sky and the tests read it.
 *
 * Everything here is worked out from `EXT`, so the wall stands round whatever world a test run sets
 * (`WORLD_EXT`, `npm run test:wide`) as round the site's own.
 */
import { EXT, RIVER, WALL_OUT } from './layout';
import { WATER_Y } from './river';
import type { Box } from './solids';
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

/**
 * The wall solid (Phase 3, the owner's call: walk to the wall): each side to its full height, in every grid
 * (walking, driving, flying, the walk camera, bullets: solids.ts `SOLIDS`)
 */
export const WALL_SOLIDS: Box[] = WALL_RUNS.map(({ rect }) => [...rect, WALL.h] as Box);

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

/* ---------- Phase 4: the top and the night ---------- */

/**
 * The top (the owner's pick: wire and cameras, no towers): a concrete parapet along both edges (`parapet`, `h` over
 * the top, `w` thick), coils of razor wire along the inner one (`wire`: the big coil's radius, and a thinner strand on
 * top of it that phones leave out), and cameras on posts along the inner edge (`camera`: one every `every`, kept
 * `corner` clear of the corners, `post` tall, looking in over the city)
 */
export const TOP = {
  parapet: { h: 1.1, w: 0.5 },
  wire: { r: 0.45, small: 0.22 },
  camera: { every: 64, corner: 24, post: 2.4 },
};

/** Where a side's inner edge runs along the top: its axis, the inner face's line, which way is in, and its run */
interface Edge {
  side: WallSide;
  axis: 'x' | 'z';
  /** The inner face's coordinate (z for north and south, x for west and east) */
  at: number;
  /** +1 or -1: into the city from it */
  into: 1 | -1;
  /** Its run along the face (the inner face's corners) */
  from: number;
  to: number;
}
export const EDGES: Edge[] = (() => {
  const [i0, j0, i1, j1] = WALL_INNER;
  return [
    { side: 'n', axis: 'x', at: j0, into: 1, from: i0, to: i1 },
    { side: 's', axis: 'x', at: j1, into: -1, from: i0, to: i1 },
    { side: 'w', axis: 'z', at: i0, into: 1, from: j0, to: j1 },
    { side: 'e', axis: 'z', at: i1, into: -1, from: j0, to: j1 },
  ];
})();
/** A point on an edge: `u` along it, `v` from the inner face into the wall (positive) or into the city (negative) */
export function onEdge(e: Edge, u: number, v: number): [number, number] {
  const n = e.at - e.into * v;
  return e.axis === 'x' ? [u, n] : [n, u];
}
/** Its heading (yaw, x east and z south, 0 along +x) looking into the city */
export const lookIn = (e: Edge) => (e.axis === 'x' ? (e.into > 0 ? -Math.PI / 2 : Math.PI / 2) : e.into > 0 ? 0 : Math.PI);

/** The cameras on their posts along the inner edge of the top: where (on the top, `TOP.parapet.w` in), and which way they look */
export const CAMERAS: { x: number; z: number; yaw: number; side: WallSide }[] = EDGES.flatMap((e) => {
  const { every, corner } = TOP.camera;
  const n = Math.floor((e.to - e.from - 2 * corner) / every);
  const pad = (e.to - e.from - n * every) / 2;
  return Array.from({ length: n + 1 }, (_, k) => {
    const [x, z] = onEdge(e, e.from + pad + k * every, TOP.parapet.w + 0.35);
    return { x, z, yaw: lookIn(e), side: e.side };
  });
});

/**
 * The floodlights at the foot (the owner's pick: floodlit at night): a housing against the inner face every `every`,
 * kept `corner` clear of the corners and off the river's band (the culverts), each washing up the face `wash` high
 * and `spread` wide at night (wall3d.ts; under the bloom's threshold, the face never washes out). The housings are
 * solid (`FLOOD_SOLIDS`), low enough to see over
 */
export const FLOOD = { every: 36, corner: 14, w: 0.9, d: 0.55, h: 0.55, wash: 24, spread: 10 };
export const FLOODS: { x: number; z: number; yaw: number; side: WallSide }[] = EDGES.flatMap((e) => {
  const { every, corner } = FLOOD;
  const n = Math.floor((e.to - e.from - 2 * corner) / every);
  const pad = (e.to - e.from - n * every) / 2;
  return Array.from({ length: n + 1 }, (_, k) => e.from + pad + k * every)
    .filter((u) => e.axis === 'x' || u < RIVER[0] - 6 || u > RIVER[1] + 6)
    .map((u) => {
      const [x, z] = onEdge(e, u, -FLOOD.d / 2);
      return { x, z, yaw: lookIn(e), side: e.side };
    });
});
export const FLOOD_SOLIDS: Box[] = FLOODS.map(({ x, z, side }) => {
  const [hu, hv] = [FLOOD.w / 2, FLOOD.d / 2];
  const [hx, hz] = side === 'n' || side === 's' ? [hu, hv] : [hv, hu];
  return [x - hx, z - hz, x + hx, z + hz, FLOOD.h] as Box;
});

/* ---------- Phase 5: the river and the culverts ---------- */

/**
 * The culverts (the owner's pick: a barred culvert): where the river meets the west and east sides, a low arch
 * through the wall over the river's band, `pier` in from its edges; its sides rise straight from under the water
 * (`under` below the streets) to `spring`, then a flat segmental arch `rise` more to its crown, so the water runs
 * under the wall; heavy bars across it in the wall's middle (`bars`: `gap` apart, `r` thick, two rails across), so
 * nothing gets through: the boats stop at them (boat-sim.ts `WATER_SOLIDS`, `CULVERT_BARS`)
 */
export const ARCH = { pier: 2, under: 4, spring: 3.2, rise: 2.6, bars: { gap: 1.1, r: 0.11, rails: [0.6, 2.4] } };
/** The opening's span across the band (z0, z1) */
export const ARCH_SPAN: [number, number] = [RIVER[0] + ARCH.pier, RIVER[1] - ARCH.pier];
/** The arch's underside at z across its span (0 outside it) */
export function archTop(z: number) {
  const [a, b] = ARCH_SPAN;
  if (z <= a || z >= b) return 0;
  const half = (b - a) / 2;
  const t = (z - (a + b) / 2) / half;
  // (a segment of a circle through the springing points and the crown)
  const R = (half * half + ARCH.rise * ARCH.rise) / (2 * ARCH.rise);
  return ARCH.spring + Math.sqrt(Math.max(0, R * R - (t * half) ** 2)) - (R - ARCH.rise);
}
/** Where each culvert's bars stand (x, the wall's middle) */
export const CULVERT_X = CULVERTS.map((c) => (c.side === 'w' ? c.x - WALL.thick / 2 : c.x + WALL.thick / 2));
/** The bars as rects across the water, for the boats (x0, z0, x1, z1) */
export const CULVERT_BARS: Rect[] = CULVERT_X.map((x): Rect => [x - 0.3, RIVER[0], x + 0.3, RIVER[1]]);
/** The water's level in the culverts (the river's) and how deep the arch's sides go under the streets */
export const CULVERT_FLOOR = Math.min(WATER_Y, 0) - ARCH.under;
