/*
 * Riverside Raceway's site and its ground (docs/kart-harbour-plan.md, Phase 2): the land round the new circuit
 * (kartcircuit2.ts) on the south bank west of the Docks. DOM-free, tested in tests/kartpark2.test.ts. Nothing in the
 * city reads it yet: the ground, the trees' keep-off and the solids join the city's own (groundheight.ts, ground.ts,
 * landuse.ts, outskirts.ts) when the park is first drawn behind `?karts=new` (Phase 3), since those are built when
 * they load and can't read the switch.
 *
 * The site's natural ground is level (0 under all of it), so the circuit lies on it as it is, but for:
 * - **the hill**: an embankment carrying the raised switchbacks over the tunnel, its sides falling at `HILL_SIDE` to the
 *   level, the tunnel through it where its cover is deep enough and a cutting either side of the tunnel's mouths;
 * - **the west bank**: a grass spectator bank between the esses and the site's west edge.
 * And round it: the gate path from the riverside road (ew4-w) at the north, and a service road to the paddock from the
 * Southfield road at the south.
 */

import { CIRCUIT2, CLEAR2, HILL_TOP, KERB2, SITE2, TRACK2_HALF, TUNNEL_CLEAR, type Pt } from './kartcircuit2';

export type Rect = [number, number, number, number];

/** The site's level (its natural ground: 0 throughout, measured 2026-11-23) */
export const KART2_LEVEL = 0;
/** How steeply the hill's sides fall (rise per tile of run), and how wide its top stays flat either side of the road */
export const HILL_SIDE = 0.45;
export const HILL_SHOULDER = TRACK2_HALF + KERB2 + 0.4;
/** The tunnel's cutting: the lower run's ground held at the level this far either side of its middle */
export const CUTTING_HALF = TRACK2_HALF + KERB2 + 0.3;
/** The least cover over the tunnel's roof (the hill's height over the tunnel's floor, less its clear height) */
export const TUNNEL_COVER = 0.5;

const n = CIRCUIT2.u.length;
/** The raised run's samples (the hill-top switchbacks and their ramps) and the rest */
const RAISED = CIRCUIT2.y.map((y, i) => (y > 1e-3 ? i : -1)).filter((i) => i >= 0);

/** Cones of embankment from `sources` (each a sample and the height its top holds), falling at HILL_SIDE past HILL_SHOULDER */
function cones(sources: { i: number; y: number }[], u: number, v: number): number {
  let h = 0;
  for (const { i, y: top } of sources) {
    const d = Math.hypot(CIRCUIT2.u[i] - u, CIRCUIT2.v[i] - v);
    const y = top - Math.max(0, d - HILL_SHOULDER) * HILL_SIDE;
    if (y > h) h = y;
  }
  return h;
}
/** The hill the raised run alone makes (before the tunnel's own cover) */
const hillOfRaised = (u: number, v: number) => cones(RAISED.map((i) => ({ i, y: CIRCUIT2.y[i] })), u, v);

/** The lower run through the hill: the samples near the crossings, at the level, that the raised run passes over */
const LOWER = new Set<number>();
for (const c of CIRCUIT2.crossings) for (let d = -80; d <= 80; d++) LOWER.add((c.lower + d + n) % n);


/**
 * The tunnel: the lower run's samples where the hill over it is deep enough to roof it (its clear height and
 * `TUNNEL_COVER`), one run of them from mouth to mouth (s of its first and last sample, in the forward course's order)
 */
export const TUNNEL2: { from: number; to: number; samples: number[] } = (() => {
  const covered = [...LOWER].filter((i) => hillOfRaised(CIRCUIT2.u[i], CIRCUIT2.v[i]) >= TUNNEL_CLEAR + TUNNEL_COVER).sort((a, b) => a - b);
  // (the one run: from the first covered sample to the last, the lower run between them all under the hill or its cutting)
  const [a, b] = [covered[0], covered[covered.length - 1]];
  const samples = Array.from({ length: b - a + 1 }, (_, k) => a + k);
  return { from: a * CIRCUIT2.step, to: b * CIRCUIT2.step, samples };
})();

/** The hill: the raised run's embankment, and the tunnel's own cover (its clear height and `TUNNEL_COVER`) all along it */
const HILL_SOURCES = [...RAISED.map((i) => ({ i, y: CIRCUIT2.y[i] })), ...TUNNEL2.samples.map((i) => ({ i, y: TUNNEL_CLEAR + TUNNEL_COVER }))];
/** The open track (all but the tunnel): where the ground is the road's own height, cut into the hill where it must be */
const TUNNEL_SET = new Set(TUNNEL2.samples);
const OPEN_TRACK = CIRCUIT2.u.map((_, i) => i).filter((i) => !TUNNEL_SET.has(i));

/** A bucket grid over the site's frame (the ground's asked every tick in a race, and every frame on foot) */
const CELL = 6;
const [GU0, GV0, GU1, GV1] = [-20, -20, SITE2.x1 - SITE2.x0 + 20, SITE2.z1 - SITE2.z0 + 20];
const [GW, GH] = [Math.ceil((GU1 - GU0) / CELL), Math.ceil((GV1 - GV0) / CELL)];
function bucket<T>(items: T[], where: (t: T) => [number, number], reach: number): (u: number, v: number) => T[] {
  const cells: T[][] = Array.from({ length: GW * GH }, () => []);
  const r = Math.ceil(reach / CELL);
  for (const t of items) {
    const [u, v] = where(t);
    const [cu, cv] = [Math.floor((u - GU0) / CELL), Math.floor((v - GV0) / CELL)];
    for (let a = cu - r; a <= cu + r; a++) for (let b = cv - r; b <= cv + r; b++) if (a >= 0 && b >= 0 && a < GW && b < GH) cells[b * GW + a].push(t);
  }
  const none: T[] = [];
  return (u, v) => {
    const [cu, cv] = [Math.floor((u - GU0) / CELL), Math.floor((v - GV0) / CELL)];
    return cu < 0 || cv < 0 || cu >= GW || cv >= GH ? none : cells[cv * GW + cu];
  };
}
const openNear = bucket(OPEN_TRACK, (i) => [CIRCUIT2.u[i], CIRCUIT2.v[i]], CUTTING_HALF + 0.5);
/** How far a hill source reaches before it's fallen to the level */
const SOURCE_REACH = HILL_SHOULDER + HILL_TOP / HILL_SIDE + 0.5;
const sourcesNear = bucket(HILL_SOURCES, ({ i }) => [CIRCUIT2.u[i], CIRCUIT2.v[i]], SOURCE_REACH);

/** The nearest open-track sample to a point within `r` (at most CUTTING_HALF), or -1 */
function openTrackNear(u: number, v: number, r: number): number {
  let [best, at] = [r, -1];
  for (const i of openNear(u, v)) {
    const d = Math.hypot(CIRCUIT2.u[i] - u, CIRCUIT2.v[i] - v);
    if (d < best) [best, at] = [d, i];
  }
  return at;
}
/** The hill alone at a point (the raised run's embankment and the tunnel's cover), no cutting */
export const hillAt = (u: number, v: number) => cones(sourcesNear(u, v), u, v);

/** The west bank: a grass spectator bank between the esses' run-off and the site's west edge (site frame) */
export const WEST_BANK = { u0: 0, u1: 0, v0: 30, v1: 112, h: 0.8 };
{
  // (its east side: clear of the west part of the lap's run-off, its west side the site's edge)
  let west = Infinity;
  for (let i = 0; i < n; i++) if (CIRCUIT2.v[i] > WEST_BANK.v0 && CIRCUIT2.v[i] < WEST_BANK.v1) west = Math.min(west, CIRCUIT2.u[i]);
  WEST_BANK.u1 = west - CLEAR2 - 0.5;
}
function bankAt(u: number, v: number): number {
  const b = WEST_BANK;
  if (u < b.u0 || u > b.u1 || v < b.v0 || v > b.v1) return 0;
  // (a berm: rising at the hill's slope from all four edges, flat on top)
  const e = Math.min(u - b.u0, b.u1 - u, v - b.v0, b.v1 - v);
  return Math.min(b.h, e * HILL_SIDE);
}

/** The ground over the site's level at a point in the site's frame: the hill (its cutting left at the level), the bank */
export function kart2Ground(u: number, v: number): number {
  // (on the track and its kerbs, the road's own height: a cutting through the hill where the hill stands higher)
  const on = openTrackNear(u, v, CUTTING_HALF);
  if (on >= 0) return CIRCUIT2.y[on];
  return Math.max(hillAt(u, v), bankAt(u, v));
}
/** The same in the world */
export const kart2GroundAt = (x: number, z: number) => KART2_LEVEL + kart2Ground(x - SITE2.x0, z - SITE2.z0);

/** The gate: on the site's north edge, the river bus pier's side, a path north to the riverside road (ew4-w, z 137) */
export const GATE2 = { x: SITE2.x0 + 87, z: SITE2.z0, half: 3 } as const;
export const GATE2_PATH: Rect = [GATE2.x - GATE2.half, 137 + 1.7, GATE2.x + GATE2.half, SITE2.z0];
/** The service road: off the Southfield road's west end (-424, 342), north past the site's corner, west along its south edge to the paddock */
export const SERVICE2_HALF = 2.2;
export const SERVICE2: Pt[] = [
  [-424, 342],
  [-424, 309],
  [-428, 304.5],
  [-480, 304.5],
  [-485, 300],
];
/** The land the park takes (trees, cover and the outskirts keep off): the site, its gate path, the service road's strip */
export const KART2_RECTS: Rect[] = [
  [SITE2.x0, SITE2.z0, SITE2.x1, SITE2.z1],
  GATE2_PATH,
  [-424 - SERVICE2_HALF - 1, 304.5 - SERVICE2_HALF - 1, -424 + SERVICE2_HALF + 1, 342],
  [-485 - SERVICE2_HALF, 304.5 - SERVICE2_HALF - 1, -424 + SERVICE2_HALF + 1, 304.5 + SERVICE2_HALF + 1],
];
export const KART2_AREA: Rect = [
  Math.min(...KART2_RECTS.map((r) => r[0])),
  Math.min(...KART2_RECTS.map((r) => r[1])),
  Math.max(...KART2_RECTS.map((r) => r[2])),
  Math.max(...KART2_RECTS.map((r) => r[3])),
];
