/*
 * Endswood Estate, "the Ends" (docs/estate-plan.md, the owner's call; DOM-free, the boot's, tested in
 * tests/endswood.test.ts): a rough London council estate, a brutalist concrete jungle with subways, underpasses and
 * abandoned buildings, on the land south of the ring highway under The Trenches (Lot 9's old land, Lot 9 moved south
 * of it, lot9.ts `MOVED`) and the three strips east of the south avenue to the east one. Today's world numbers (south of
 * the highway, after both of the river's widenings). Every name here is made up.
 *
 * - **The land** (`ENDSWOOD_RECT`): from the highway's south edge to the common over Lot 9, from the path down from
 *   The Trenches' tunnel (lot9.ts `FOOTPATH`, kept west of the blocks) to the east avenue's west kerb.
 * - **The streets** (`ENDS_STREETS` / `ENDS_CROSSINGS`, in the street plan): Endswood Road from the roundabout east
 *   across the south avenue (lit), ns1s and ns2s to the east avenue (lit); the roundabout, **Endswood Circus**
 *   (`CIRCUS`: a one-way loop, its traffic giving way where the road joins it, as Uptown Circle's); and the Close west
 *   off it, a dead end with bollards across its end (a walker gets through, no car does).
 * - **The blocks** (`ENDS_BLOCKS`, ref `endswood`: grey sidewalks over worn concrete): four round the Circus, cut round
 *   it, either side of the walk north and south of it (the spine, `SPINE`), and two in each strip east of the avenue.
 * - **The subways** (`SUBWAYS`, `WELL`): the Circus's middle is sunk to a round place open to the sky, the well, and
 *   a subway runs north and south from it under the Circus and its island, up a ramp into the spine either side: the
 *   only way into the middle on foot. They're the underground kit's (underground.ts), with The Trenches' tunnel.
 * - Sodium lamps (`ENDS_LAMPS`, lampmix.ts), what's solid (`ENDS_SOLIDS`: the subways' parapets, headwalls and
 *   bollards, the well's railing, the Close's bollards).
 */
import { HIGHWAY_BOX, HIGHWAY_HALF } from './highway';
import { NS_ROADS, WALK_W, nsStreet } from './layout';
import { holesOf, wellHole, type Box, type Passage, type Pt, type Rect, type Well } from './underground';

export type { Rect, Pt, Box };

export const ENDSWOOD_NAME = 'Endswood Estate';
/** What everyone calls it (the tags and murals, docs/estate-plan.md) */
export const ENDS_NICK = 'THE ENDS';

/** The open ground's height, a block's slab's (world.ts `SLAB`) */
export const GROUND_Y = 0.035;
export const SLAB_Y = 0.15;

/** The avenues and streets running through it: the south avenue (ns0s), ns1s, ns2s and the east avenue (ns3) */
const AVE = NS_ROADS[0];
const NS1 = NS_ROADS[1];
const NS2 = NS_ROADS[2];
const EAST = NS_ROADS[3];
/** The highway's paved south edge */
export const HW_EDGE = HIGHWAY_BOX[3] + HIGHWAY_HALF;

/* ---------- The land ---------- */

/** The blocks' west edge (the path from The Trenches' tunnel runs west of it), their north and south edges (clear of
 * the exit's ramp and piers north, the common south) */
export const WEST_X = -106;
export const NORTH_Z = 335;
export const SOUTH_Z = 428;
/** The estate's land: the highway's south edge to the common, Lot 9's old west fence to the east avenue's west kerb */
export const ENDSWOOD_RECT: Rect = [-130, HW_EDGE + 2, EAST.c - EAST.half, SOUTH_Z + 2];
/**
 * The estate carried west (docs/ends-west-plan.md, the owner's call: still Endswood, an extension): its land west of
 * Lot 9's tunnel's footpath, outside the highway's south-west bend, to the near half's west edge; what's on it is
 * endswest.ts's. Reaching east to the old land, so the Close's run between them is the estate's too
 */
export const WEST_RECT: Rect = [-204, HW_EDGE + 6, -128, 466];
/**
 * ...and further west (docs/ends-far-west-plan.md, the owner's call: still Endswood): the land west of the rows, the
 * half that plan kept for later, as far as its first part is built; what's on it is endsfar.ts's. Reaching east into
 * the rows' land, so the two read as one
 */
export const FAR_RECT: Rect = [-264, 340, -200, 420];
/** The lane across the Close's far end there (endsfar.ts `LANE_X`): its centre line's x */
export const FAR_LANE_X = -216;
const inR = (r: Rect, x: number, z: number, m: number) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
/** The band the two share, across both (inside them both together): so a margin taken further in (lampmix.ts's depth)
 * reads the join between them as the estate's middle, not an edge */
const JOIN: Rect = [WEST_RECT[0], Math.max(ENDSWOOD_RECT[1], WEST_RECT[1]), ENDSWOOD_RECT[2], Math.min(ENDSWOOD_RECT[3], WEST_RECT[3])];
/** On the estate's land, the old and the extension's (`m` more round it; negative, further in) */
/** ...and the band the rows' land and the far west's share, the same way */
const JOIN_FAR: Rect = [FAR_RECT[0], Math.max(FAR_RECT[1], WEST_RECT[1]), WEST_RECT[2], Math.min(FAR_RECT[3], WEST_RECT[3])];
export const inEndswood = (x: number, z: number, m = 0) => inR(ENDSWOOD_RECT, x, z, m) || inR(WEST_RECT, x, z, m) || inR(JOIN, x, z, m) || inR(FAR_RECT, x, z, m) || inR(JOIN_FAR, x, z, m);

/* ---------- The streets ---------- */

/** Endswood Road's line and half its asphalt (a town street, one lane each way) */
export const ROAD_Z = 380;
export const ROAD_HALF = NS1.half;
/** Endswood Circus: its middle, its centre line's radius and half its carriageway (one wide lane, one way round) */
export const CIRCUS = { x: -56, z: ROAD_Z, r: 11, half: 2 };
/** Its island's edge (the carriageway's inner kerb) */
export const ISLAND_R = CIRCUS.r - CIRCUS.half;
/** How far from its middle the blocks round it keep (its outer kerb and the sidewalk), a hair more for the arcs' chords */
export const CIRCUS_OUT = CIRCUS.r + CIRCUS.half + WALK_W + 0.1;
/** Where the Close's old stretch ends (the blocks' west edge's sidewalk): the old estate's drawing of it stops here,
 * and it runs on west from here into the extension (endswest.ts) */
export const CLOSE_END = WEST_X - WALK_W;
/** The extension's blocks' west edge, and the Close's far end (their west sidewalks' outer edge): bollards across it,
 * the land past it kept for later (docs/ends-west-plan.md: the near half now) */
export const WEST_X0 = -200;
export const CLOSE_WEST = WEST_X0 - WALK_W;
/** The Close's bollards across its far end (x, z): a walker gets between them, no car does (the owner's pick: moved
 * from the old end to the far one when the Close was carried west) */
export const BOLLARD = { r: 0.14, h: 0.9 };
// (taken up when the Close was carried on to the far west, docs/ends-far-west-plan.md Phase 1, the owner's call: you
// drive on to the lane and Degen's gates)
export const CLOSE_BOLLARDS: Pt[] = [];

export interface EndsStreet {
  id: string;
  pts: Pt[];
  half: number;
  loop?: true;
  oneway?: 1;
}
/** The Circus's centre line, anticlockwise seen from above (north up) from its east point, every 15 degrees, closed */
const circusPts = (): Pt[] =>
  Array.from({ length: 25 }, (_, k): Pt => {
    const a = (-k * Math.PI) / 12;
    return [CIRCUS.x + CIRCUS.r * Math.cos(a), CIRCUS.z + CIRCUS.r * Math.sin(a)];
  });
export const ENDS_STREETS: EndsStreet[] = [
  // Endswood Road: from the Circus east over the south avenue, ns1s and ns2s to the east avenue
  {
    id: 'ends-road',
    pts: [
      [CIRCUS.x + CIRCUS.r, ROAD_Z],
      [AVE.c, ROAD_Z],
      [NS1.c, ROAD_Z],
      [NS2.c, ROAD_Z],
      [EAST.c, ROAD_Z],
    ],
    half: ROAD_HALF,
  },
  { id: 'ends-circus', pts: circusPts(), half: CIRCUS.half, loop: true, oneway: 1 },
  // The Close: west off the Circus, over the tunnel's footpath, on through the extension and to the far west's lane
  {
    id: 'ends-close',
    pts: [
      [CIRCUS.x - CIRCUS.r, ROAD_Z],
      [CLOSE_END, ROAD_Z],
      [CLOSE_WEST, ROAD_Z],
      // (and on to the lane across its end in the far west, endsfar.ts: one street, so a route runs the length of it)
      [FAR_LANE_X, ROAD_Z],
    ],
    half: ROAD_HALF,
  },
];
export const ENDS_CROSSINGS: { id: string; at: Pt; streets: string[]; lights: boolean }[] = [
  { id: 'ends-ave', at: [AVE.c, ROAD_Z], streets: [nsStreet(0, ROAD_Z), 'ends-road'], lights: true },
  { id: 'ends-ns1', at: [NS1.c, ROAD_Z], streets: [nsStreet(1, ROAD_Z), 'ends-road'], lights: false },
  { id: 'ends-ns2', at: [NS2.c, ROAD_Z], streets: [nsStreet(2, ROAD_Z), 'ends-road'], lights: false },
  { id: 'ends-east', at: [EAST.c, ROAD_Z], streets: [nsStreet(3, ROAD_Z), 'ends-road'], lights: true },
  { id: 'ends-circus-e', at: [CIRCUS.x + CIRCUS.r, ROAD_Z], streets: ['ends-road', 'ends-circus'], lights: false },
  { id: 'ends-circus-w', at: [CIRCUS.x - CIRCUS.r, ROAD_Z], streets: ['ends-close', 'ends-circus'], lights: false },
];

/* ---------- The blocks ---------- */

/** Half the walk north and south of the Circus between the blocks (the spine): the subways' ramps come up in it (narrower
 * than a verge needs, so the blocks' edges stay square, verges.ts `DEEP`) */
export const SPINE = 3.2;

/** A rect as an outline (the street plan's way round: x0 z0, down its west side, along its south, up its east) */
const rectPoly = ([x0, z0, x1, z1]: Rect): Pt[] => [
  [x0, z0],
  [x0, z1],
  [x1, z1],
  [x1, z0],
];
/**
 * A rect's outline with one corner cut round the Circus (the land within `CIRCUS_OUT` of its middle left out): the
 * corner (0 to 3, `rectPoly()`'s order) swapped for an arc between where its two edges meet the circle
 */
function cutCorner(r: Rect, k: number): Pt[] {
  const poly = rectPoly(r);
  const [cx, cz, R] = [CIRCUS.x, CIRCUS.z, CIRCUS_OUT];
  const prev = poly[(k + 3) % 4];
  const corner = poly[k];
  const next = poly[(k + 1) % 4];
  /** Where the edge from a (outside) to b (the corner, inside) meets the circle */
  const meet = (a: Pt, b: Pt): Pt => {
    let [lo, hi] = [0, 1];
    for (let i = 0; i < 40; i++) {
      const m = (lo + hi) / 2;
      const p: Pt = [a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m];
      if (Math.hypot(p[0] - cx, p[1] - cz) < R) hi = m;
      else lo = m;
    }
    return [a[0] + (b[0] - a[0]) * lo, a[1] + (b[1] - a[1]) * lo];
  };
  const p = meet(prev, corner);
  const q = meet(next, corner);
  let [ap, aq] = [Math.atan2(p[1] - cz, p[0] - cx), Math.atan2(q[1] - cz, q[0] - cx)];
  // (the short way round, the arc inside the rect)
  if (aq - ap > Math.PI) aq -= Math.PI * 2;
  if (ap - aq > Math.PI) aq += Math.PI * 2;
  const n = Math.max(2, Math.ceil(Math.abs(aq - ap) / (Math.PI / 32)));
  const arc: Pt[] = Array.from({ length: n + 1 }, (_, i): Pt => {
    const a = ap + ((aq - ap) * i) / n;
    return [cx + R * Math.cos(a), cz + R * Math.sin(a)];
  });
  return [...poly.slice(0, k), ...arc, ...poly.slice(k + 1)];
}

export interface EndsBlock {
  id: string;
  poly: Pt[];
}
/** The blocks' edges either side of Endswood Road */
const N_EDGE = ROAD_Z - ROAD_HALF - WALK_W;
const S_EDGE = ROAD_Z + ROAD_HALF + WALK_W;
/** The strips east of the south avenue: between it, ns1s, ns2s and the east avenue */
const STRIP_X: [number, number][] = [
  [AVE.c + AVE.half + WALK_W, NS1.c - NS1.half - WALK_W],
  [NS1.c + NS1.half + WALK_W, NS2.c - NS2.half - WALK_W],
  [NS2.c + NS2.half + WALK_W, EAST.c - EAST.half - WALK_W],
];
const W_EDGE = AVE.c - AVE.half - WALK_W;
export const ENDS_BLOCKS: EndsBlock[] = [
  // Round the Circus: north-west, north-east, south-west, south-east, each cut round it (corners: 2 the south-east,
  // 1 the south-west, 3 the north-east, 0 the north-west)
  { id: 'ends-nw', poly: cutCorner([WEST_X, NORTH_Z, CIRCUS.x - SPINE, N_EDGE], 2) },
  { id: 'ends-ne', poly: cutCorner([CIRCUS.x + SPINE, NORTH_Z, W_EDGE, N_EDGE], 1) },
  { id: 'ends-sw', poly: cutCorner([WEST_X, S_EDGE, CIRCUS.x - SPINE, SOUTH_Z], 3) },
  { id: 'ends-se', poly: cutCorner([CIRCUS.x + SPINE, S_EDGE, W_EDGE, SOUTH_Z], 0) },
  // East of the avenue: two to a strip, either side of the road
  ...STRIP_X.flatMap(([x0, x1], i): EndsBlock[] => [
    { id: `ends-e${i}n`, poly: rectPoly([x0, NORTH_Z, x1, N_EDGE]) },
    { id: `ends-e${i}s`, poly: rectPoly([x0, S_EDGE, x1, SOUTH_Z]) },
  ]),
];

/* ---------- The subways and the well ---------- */

/** The well in the Circus's middle: sunk to the subways' floor, open to the sky, a railing round its rim */
export const WELL: Well = { id: 'ends-well', x: CIRCUS.x, z: CIRCUS.z, r: 6, floor: -1.9, wall: 0.3, rail: 1.05 };
/** A subway's walkable half width, walls, ceiling under the ground, its ramp's length (no steeper than one in four) and
 * the flat at its top */
export const SUBWAY = { half: 1.25, wall: 0.25, ceil: -0.25, ramp: 7.6, top: 0.6 };
/** How far out from the well's middle a subway's roof reaches: over the island, the carriageway and its kerb's sidewalk */
export const ROOF_OUT = CIRCUS.r + CIRCUS.half + WALK_W + 0.4;
/** The subways: north and south from the well under the Circus, each up a ramp into the spine */
export const SUBWAYS: Passage[] = [-1, 1].map((k): Passage => {
  const base = { axis: 'z' as const, c: CIRCUS.x, half: SUBWAY.half, wall: SUBWAY.wall, floor: WELL.floor, ceil: SUBWAY.ceil, rail: 0.95 };
  const [inner, roof, top, end] = [CIRCUS.z + k * (WELL.r - 0.6), CIRCUS.z + k * ROOF_OUT, CIRCUS.z + k * (ROOF_OUT + SUBWAY.top), CIRCUS.z + k * (ROOF_OUT + SUBWAY.top + SUBWAY.ramp)];
  // (north: its ramp from the spine down at a0, the well at a1; south the other way round)
  return k < 0
    ? { id: 'ends-subway-n', ...base, a0: end, ramp0: top, ramp1: inner, a1: inner, roofs: [[roof, CIRCUS.z - WELL.r]] }
    : { id: 'ends-subway-s', ...base, a0: inner, ramp0: inner, ramp1: top, a1: end, roofs: [[CIRCUS.z + WELL.r, roof]] };
});
/** The ground cut away over the subways' open cuttings and the well (world.ts; the island's paving covers the well's corners) */
export const SUBWAY_HOLES: Rect[] = [...SUBWAYS.flatMap(holesOf), wellHole(WELL)];

/** A subway's outer end (its ramp's top), its portal (where the roof starts) and which way is out of it */
export const subwayEnds = (p: Passage) => {
  const north = p.id.endsWith('-n');
  return { top: north ? p.a0 : p.a1, ramp: north ? p.ramp0 : p.ramp1, portal: north ? p.roofs[0][0] : p.roofs[0][1], out: north ? -1 : 1 };
};
/** The bollards across each subway's ramp top (x, z): a walker gets between the middle two, no car does */
export const SUBWAY_BOLLARDS: Pt[] = SUBWAYS.flatMap((p) => {
  const { top, out } = subwayEnds(p);
  return [-0.6, 0.6].map((o): Pt => [p.c + o, top - out * 0.3]);
});

/** The well's railing round its rim, as posts close enough that nothing gets between (x, z) */
export const RAIL_POSTS: Pt[] = (() => {
  const R = WELL.r + WELL.wall / 2;
  const n = Math.ceil((Math.PI * 2 * R) / 0.45);
  return Array.from({ length: n }, (_, i): Pt => [WELL.x + R * Math.cos((i / n) * Math.PI * 2), WELL.z + R * Math.sin((i / n) * Math.PI * 2)]);
})();

const square = ([x, z]: Pt, r: number, h: number): Box => [x - r, z - r, x + r, z + r, h];
/** What's solid: the subways' parapets along their cuttings, the headwalls over their portals, the bollards at their
 * tops, the well's railing and the Close's bollards */
export const ENDS_SOLIDS: Box[] = [
  ...SUBWAYS.flatMap((p): Box[] => {
    const { top, portal, out } = subwayEnds(p);
    const [s0, s1] = [Math.min(top, portal), Math.max(top, portal)];
    const [w0, w1] = [p.c - p.half - p.wall, p.c - p.half];
    const [e0, e1] = [p.c + p.half, p.c + p.half + p.wall];
    return [
      [w0, s0, w1, s1, p.rail],
      [e0, s0, e1, s1, p.rail],
      // (the headwall over the portal, on the cutting's side)
      out < 0 ? [w0, portal - 0.3, e1, portal, p.rail] : [w0, portal, e1, portal + 0.3, p.rail],
    ];
  }),
  ...SUBWAY_BOLLARDS.map((p) => square(p, BOLLARD.r, BOLLARD.h)),
  ...RAIL_POSTS.map((p) => square(p, 0.16, WELL.rail)),
  ...CLOSE_BOLLARDS.map((p) => square(p, BOLLARD.r, BOLLARD.h)),
];

/* ---------- Lamps ---------- */

/** Sodium lamps (x, z, the way the arm reaches, the ground's height; lampmix.ts): along Endswood Road's sidewalks, round
 * the Circus's outer sidewalk, down the spine either side of the subways' ramps, and round the well on its island. A
 * lamp's arm reaches along (cos ry, -sin ry) (world.ts `buildLamps()`): the roads' over the carriageway, the Circus's
 * and the well's in towards their middles */
export const ENDS_LAMPS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  const IN = ROAD_HALF + 0.45;
  /** Clear of a crossing by this much */
  const clear = (x: number) => [AVE.c, NS1.c, NS2.c, EAST.c].every((c) => Math.abs(x - c) > 7) && x > CIRCUS.x + CIRCUS_OUT + 2;
  for (let x = CIRCUS.x + CIRCUS_OUT + 4; x < EAST.c - 4; x += 13) {
    if (clear(x)) out.push([x, ROAD_Z - IN, -Math.PI / 2, SLAB_Y]);
    if (clear(x + 6.5)) out.push([x + 6.5, ROAD_Z + IN, Math.PI / 2, SLAB_Y]);
  }
  // The Close's, one each side
  for (const [x, k] of [
    [-84, -1],
    [-96, 1],
  ] as const)
    out.push([x, ROAD_Z + k * IN, (k * Math.PI) / 2, SLAB_Y]);
  // Round the Circus on its outer sidewalk, between the road and the spine (arms reaching in over the carriageway)
  const R = CIRCUS.r + CIRCUS.half + 0.45;
  for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) out.push([CIRCUS.x + R * Math.cos(a), CIRCUS.z + R * Math.sin(a), Math.PI - a, SLAB_Y]);
  // Round the well on the island, reaching in over it
  const r = WELL.r + WELL.wall + 0.9;
  for (const a of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((v) => v + Math.PI / 4)) out.push([WELL.x + r * Math.cos(a), WELL.z + r * Math.sin(a), Math.PI - a, GROUND_Y]);
  // Down the spine beside each subway's cutting, at its top
  for (const p of SUBWAYS) {
    const { top, out: o } = subwayEnds(p);
    out.push([p.c + SPINE - 0.9, top + o * 1.2, Math.PI, GROUND_Y]);
  }
  return out;
})();
