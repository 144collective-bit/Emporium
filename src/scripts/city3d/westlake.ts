/*
 * Westlake Park (docs/growth-plan.md Phase 9b, the owner's call; DOM-free,
 * tested in tests/westlake.test.ts): the park district on the open land west
 * of town, north of the river, between the ring highway and the Parkway.
 * Step 1 is the land: its block (north of the west ring avenue; the three
 * strips south of it became Uptown, uptown.ts), the lake, the paths, the
 * gates, its trees, lamps and benches, and the site kept clear for the
 * stadium (step 2). The park's own life (boats, the boathouse, people) is
 * step 3.
 *
 * - **The big block** (`BIG`): from the highway's west side (clear of its
 *   slip lanes) to the Parkway's west leg, and from the highway's north side
 *   (round its north-west bend) down to the west ring avenue.
 * - **The lake** (`LAKE_C`, `lakeR()`): a smooth outline round a centre,
 *   its radius a sum of a few waves; `inLake()` keeps walkers and cars out.
 * - **The paths** (`PATHS`): a walk round the big block, a loop round the
 *   lake, the Mall (a wide straight walk with trees either side, from the
 *   south gate to the stadium) and the ways in from the gates (`GATES`).
 * - **The stadium's old site** (`GARDEN_SITE`), kept clear for the formal
 *   garden (the north side's stage 3, docs/north-plan.md): the stadium moved
 *   north of the ring highway (stadium.ts), the Mall carried on to it over
 *   a footbridge (`BRIDGE_FOOT`).
 */
import { EW_ROADS, WALK_W } from './layout';
import { HIGHWAY_BOX, HIGHWAY_HALF, HIGHWAY_R } from './highway';
import { BEND_REACH, PARKWAY } from './outer';

export type Pt = [number, number];
export type Rect = [number, number, number, number];

/** How far the park keeps from the highway's centre line (as The Trenches do: its half, a shoulder and a verge) */
export const HIGHWAY_CLEAR = HIGHWAY_HALF + 6;
const [HX0, HZ0] = HIGHWAY_BOX;
/** The highway's north-west bend: its centre, and how far from it the park may reach */
export const BEND_C: Pt = [HX0 + HIGHWAY_R, HZ0 + HIGHWAY_R];
export const BEND_IN = HIGHWAY_R - HIGHWAY_CLEAR;

/** The west edge: clear of the highway and of the slip lanes where it meets the avenues (they reach in to about -202) */
export const X0 = -200.5;
/** The east edge: past the Parkway's west leg and its sidewalk (the park's own sidewalk alongside) */
export const X1 = Math.min(...PARKWAY.map((p) => p[0])) - BEND_REACH - WALK_W - 0.05;
/** The north edge: the highway's north side */
export const Z0 = HZ0 + HIGHWAY_CLEAR;
/** The west ring avenue (z): the big block is north of it */
const RING_AVE = EW_ROADS[0];
/** The big block's south edge (inside its sidewalk) */
export const ZS = RING_AVE.c - RING_AVE.half - WALK_W;

/** The arc of the highway's bend between two angles, `n` points */
const arc = (a0: number, a1: number, n: number): Pt[] => Array.from({ length: n + 1 }, (_, k) => [BEND_C[0] + Math.cos(a0 + ((a1 - a0) * k) / n) * BEND_IN, BEND_C[1] + Math.sin(a0 + ((a1 - a0) * k) / n) * BEND_IN] as Pt);

/** The big block, inside its sidewalk, counter-clockwise seen from above (the order the street plan's blocks keep) */
export const BIG: Pt[] = (() => {
  // Where the bend meets the west edge: from straight up (the north edge) round to there
  const aW = -Math.PI + Math.acos((BEND_C[0] - X0) / BEND_IN);
  const bend = arc(-Math.PI / 2, aW, 16);
  return [[X0, bend.at(-1)![1]], [X0, ZS], [X1, ZS], [X1, Z0], ...bend.slice(0, -1)];
})();

export interface ParkBlock {
  id: string;
  poly: Pt[];
}
/** The park's block, for the street plan (the strips south of it are Uptown's, uptown.ts) */
export const WESTLAKE_BLOCKS: ParkBlock[] = [{ id: 'westlake-big', poly: BIG }];
/** The park's land, for the outskirts' trees to keep off (x0, z0, x1, z1) */
export const WESTLAKE_RECT: Rect = [X0 - WALK_W, Z0 - WALK_W, X1 + WALK_W, RING_AVE.c - RING_AVE.half];

/* ---------- The stadium's old site ---------- */

/** Where the stadium stood (step 2) until it moved north of the highway: kept clear for the formal garden (x0, z0, x1, z1) */
export const GARDEN_SITE: Rect = [-172, -138, -108, -86];

/* ---------- The lake ---------- */

export const LAKE_C: Pt = [-92, -52];
/** The lake's radius at angle a (from +x towards +z): a sum of a few slow waves, longest east to west */
export const lakeR = (a: number) => 24 * (1 + 0.3 * Math.cos(2 * (a - 0.15)) + 0.1 * Math.cos(3 * a + 1.1) + 0.05 * Math.cos(5 * a + 2.3));
/** A point on the lake's edge, `out` beyond it */
export const lakeAt = (a: number, out = 0): Pt => {
  const r = lakeR(a) + out;
  return [LAKE_C[0] + Math.cos(a) * r, LAKE_C[1] + Math.sin(a) * r];
};
/** The lake's outline, `n` points round (counter-clockwise from above, as the blocks are) */
export const lakeLine = (out = 0, n = 96): Pt[] => Array.from({ length: n }, (_, k) => lakeAt((-2 * Math.PI * k) / n, out));
/** Is a point in the lake (`m` short of its edge: a walker's radius) */
export function inLake(x: number, z: number, m = 0) {
  const dx = x - LAKE_C[0];
  const dz = z - LAKE_C[1];
  const d = Math.hypot(dx, dz);
  if (d > 36 + m) return false;
  return d < lakeR(Math.atan2(dz, dx)) + m;
}
/** The stone rim round the water: how wide and how high above the lawn */
export const RIM = { w: 0.35, h: 0.12 };

/* ---------- What step 3 puts on the land: the boathouse ---------- */

/** The lake loop's line, `out` beyond the water (as PATHS' loop, LOOP_OUT; declared below) */
const loopZ = (x: number, out: number) => {
  // (its north side, where the boathouse stands: the furthest north it comes over x-0.5..x+0.5)
  let z = Infinity;
  for (const p of lakeLine(out, 720)) if (Math.abs(p[0] - x) < 0.5 && p[1] < LAKE_C[1]) z = Math.min(z, p[1]);
  return z;
};
/**
 * The boathouse on the lake's north shore, across the loop from the water, its front (south, +z) to the lake;
 * its jetty from the loop's water side out over the rim into the water, the boats moored either side of it
 */
export const BOATHOUSE = (() => {
  const x = LAKE_C[0];
  const w = 7.2;
  const d = 4.6;
  // Clear of the loop (4.5 out, 1.1 either side) all along its front
  let front = Infinity;
  for (let dx = -w / 2 - 0.5; dx <= w / 2 + 0.5; dx += 0.25) front = Math.min(front, loopZ(x + dx, 4.5) - 1.1 - 0.9);
  return { x, w, d, h: 3.0, ridge: 4.5, rect: [x - w / 2, front - d, x + w / 2, front] as Rect };
})();
/** The jetty: over the rim and 3.4 out into the water, a little above the lawn (x0, z0, x1, z1, deck height over SLAB) */
export const JETTY = (() => {
  const x = LAKE_C[0];
  const half = 0.8;
  return { x, half, z0: loopZ(x, 4.5 - 1.1) - 0.1, z1: loopZ(x, -3.4), y: 0.16 };
})();
/** Is a point on the jetty's deck (`m` in from its edges) */
export const onJetty = (x: number, z: number, m = 0) => Math.abs(x - JETTY.x) < JETTY.half - m && z > JETTY.z0 + m && z < JETTY.z1 - m;

/* ---------- The lakeside terraces (the north side's stage 3) ---------- */

export interface Terrace {
  /** The angle round the lake, the point on the water's edge, out of the water (u) and along the shore (t), its half width */
  a: number;
  at: Pt;
  u: Pt;
  t: Pt;
  half: number;
}
/**
 * The terraces' levels from the lake loop down to the water: from d to d (out from the water's edge along u, negative
 * over the water), height over the lawn's slab: a step up off the loop, the platform, then three steps down to just over
 * the water (which lies at SLAB + 0.04)
 */
export const TERRACE_STEPS: [number, number, number][] = [
  [3.2, 2.6, 0.12],
  [2.6, 0.6, 0.24],
  [0.6, -0.4, 0.17],
  [-0.4, -1.4, 0.11],
  [-1.4, -2.4, 0.065],
];
/** Three terraces: on the south shore by the lake's south walk, the west shore and the east shore */
export const TERRACES: Terrace[] = [Math.PI / 2 + 0.35, Math.PI + 0.45, 0.05].map((a) => {
  const at = lakeAt(a);
  const [p, q] = [lakeAt(a - 0.01), lakeAt(a + 0.01)];
  const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
  const t: Pt = [(q[0] - p[0]) / l, (q[1] - p[1]) / l];
  // Out of the water: the normal pointing away from the lake's middle
  let u: Pt = [t[1], -t[0]];
  if (u[0] * (at[0] - LAKE_C[0]) + u[1] * (at[1] - LAKE_C[1]) < 0) u = [-u[0], -u[1]];
  return { a, at, u, t, half: 4 };
});
/** Where a point is on a terrace: out from the water's edge (d) and along the shore (s); null off them all */
function terraceOf(x: number, z: number, m = 0) {
  for (const tr of TERRACES) {
    const [dx, dz] = [x - tr.at[0], z - tr.at[1]];
    const d = dx * tr.u[0] + dz * tr.u[1];
    const s = dx * tr.t[0] + dz * tr.t[1];
    if (Math.abs(s) < tr.half - m && d > TERRACE_STEPS.at(-1)![1] + m && d < TERRACE_STEPS[0][0] - m) return { tr, d, s };
  }
  return null;
}
/** Is a point on a terrace (`m` in from its edges) */
export const onTerrace = (x: number, z: number, m = 0) => terraceOf(x, z, m) !== null;
/** The terrace's top under a point (over the lawn's slab), or null off them */
export function terraceY(x: number, z: number) {
  const o = terraceOf(x, z);
  if (!o) return null;
  for (const [d0, d1, h] of TERRACE_STEPS) if (o.d <= d0 && o.d > d1) return h;
  return null;
}
/** What a terrace covers (its footprint's corners), for keeping benches, lamps and trees off */
export const nearTerrace = (p: Pt, m = 0) => terraceOf(p[0], p[1], -m) !== null;

/* ---------- Paths and gates ---------- */

export interface ParkPath {
  id: string;
  /** Its centre line (closed: its last point back to its first) */
  pts: Pt[];
  half: number;
  loop?: boolean;
}

/** An outline pulled in by d (a convex one: the big block) */
export function inset(poly: Pt[], d: number): Pt[] {
  const n = poly.length;
  const nrm = poly.map((p, i) => {
    const q = poly[(i + 1) % n];
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    // Inward: to the left of travel (counter-clockwise from above, as world.ts insetPoly)
    return [(q[1] - p[1]) / l, -(q[0] - p[0]) / l] as Pt;
  });
  return poly.map((p, i) => {
    const a = nrm[(i + n - 1) % n];
    const b = nrm[i];
    const k = d / (1 + a[0] * b[0] + a[1] * b[1]);
    return [p[0] + (a[0] + b[0]) * k, p[1] + (a[1] + b[1]) * k] as Pt;
  });
}

/** The Mall: a wide walk from the south gate north through the garden's site to the footbridge (x, and its half width) */
export const MALL = { x: -140, half: 2.4 };
/** Where the Mall meets the footbridge's stairs up over the highway to the stadium (stadium.ts `BRIDGE`), and what the bridge covers in the park */
export const BRIDGE_FOOT = -140.5;
export const BRIDGE_PARK: Rect = [MALL.x - 2.2, Z0 - 1, MALL.x + 2.2, BRIDGE_FOOT + 0.6];
/** The walk round the big block: this far in from its edge */
export const RING_IN = 6;
/** The lake loop: this far out from the water's edge */
export const LOOP_OUT = 4.5;

/** The ways in: on the block's edge, facing out (the gate's two stone piers either side of its path) */
export interface Gate {
  id: string;
  at: Pt;
  /** Outward, along the path */
  out: Pt;
  half: number;
}
const southGate = (id: string, x: number, half = 1.3): Gate => ({ id, at: [x, ZS], out: [0, 1], half });
const eastGate = (id: string, z: number, half = 1.3): Gate => ({ id, at: [X1, z], out: [1, 0], half });
export const GATES: Gate[] = [
  southGate('gate-mall', MALL.x, MALL.half),
  southGate('gate-sw', -182),
  southGate('gate-lake', -96),
  southGate('gate-se', -58),
  eastGate('gate-e1', -28),
  eastGate('gate-e2', -78),
  eastGate('gate-e3', -128),
];

/** A path through control points, rounded off (centripetal Catmull-Rom), a point about every `step` */
function smooth(ctrl: Pt[], step = 1.5): Pt[] {
  if (ctrl.length < 3) return ctrl;
  const P = [ctrl[0], ...ctrl, ctrl.at(-1)!];
  const out: Pt[] = [ctrl[0]];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}

/** The ring walk round the big block */
export const RING_WALK: Pt[] = inset(BIG, RING_IN);
/** Where the lake loop is nearest a point (for paths that join it) */
const toLoop = (p: Pt): Pt => lakeAt(Math.atan2(p[1] - LAKE_C[1], p[0] - LAKE_C[0]), LOOP_OUT);
/** The meadow walk: from the east gate up north-west across the lawns to the Mall, by the garden */
const MEADOW = smooth([[X1, -128], [-62, -124], [-84, -106], [-102, -84], [-122, -80], [MALL.x + MALL.half - 0.3, -80]]);
/** The formal garden's cross walk (the north side's stage 3): its line (z), from the ring walk's west side through the garden to the meadow walk */
export const GARDEN_Z = (GARDEN_SITE[1] + GARDEN_SITE[3]) / 2;
const MEADOW_X = (() => {
  // (where the meadow walk crosses the cross walk's line)
  for (let i = 1; i < MEADOW.length; i++) {
    const [a, b] = [MEADOW[i - 1], MEADOW[i]];
    if ((a[1] - GARDEN_Z) * (b[1] - GARDEN_Z) <= 0 && a[1] !== b[1]) return a[0] + ((b[0] - a[0]) * (GARDEN_Z - a[1])) / (b[1] - a[1]);
  }
  return GARDEN_SITE[2];
})();

/** The formal garden's two walks, either side of the Mall: from the ring walk's north side down to the garden's south wall */
export const GARDEN_XS = [MALL.x - 17, MALL.x + 17];
/** Where the ring walk crosses a north-south line on its north side (z) */
const ringNorthZ = (x: number) => {
  let z = Infinity;
  for (let i = 0; i < RING_WALK.length; i++) {
    const [a, b] = [RING_WALK[i], RING_WALK[(i + 1) % RING_WALK.length]];
    if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) z = Math.min(z, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]));
  }
  return z;
};

export const PATHS: ParkPath[] = [
  { id: 'ring', pts: RING_WALK, half: 1.2, loop: true },
  { id: 'loop', pts: lakeLine(LOOP_OUT, 120), half: 1.1, loop: true },
  // The Mall, from the south gate through the garden's site to the footbridge
  { id: 'mall', pts: [[MALL.x, ZS], [MALL.x, BRIDGE_FOOT]], half: MALL.half },
  // From the Mall across to the lake, and the lake's south and east gates in to the loop
  { id: 'mall-lake', pts: [[MALL.x, -50], toLoop([MALL.x, -50])], half: 1.1 },
  { id: 'lake-s', pts: smooth([[-96, ZS], [-96, -16], [-92, -24], toLoop([-92, -26])]), half: 1.1 },
  { id: 'lake-se', pts: smooth([[-58, ZS], [-62, -18], [-70, -26], toLoop([-72, -30])]), half: 1.1 },
  { id: 'lake-e', pts: smooth([[X1, -28], [-50, -30], [-56, -36], toLoop([-58, -40])]), half: 1.1 },
  { id: 'lake-ne', pts: smooth([[X1, -78], [-54, -76], [-62, -70], toLoop([-66, -66])]), half: 1.1 },
  // From the east gate up north-west across the lawns to the Mall, by the garden's site
  { id: 'meadow', pts: MEADOW, half: 1.1 },
  // The garden's cross walk, from the ring walk through the garden (across the Mall) to the meadow walk
  { id: 'garden-cross', pts: [[X0 + RING_IN, GARDEN_Z], [MEADOW_X, GARDEN_Z]], half: 1.2 },
  ...GARDEN_XS.map((x, i): ParkPath => ({ id: i ? 'garden-e' : 'garden-w', pts: [[x, ringNorthZ(x)], [x, GARDEN_SITE[3] - 0.5]], half: 1.1 })),
  // The south-west gate up to the ring walk
  { id: 'sw', pts: [[-182, ZS], [-182, ZS - RING_IN]], half: 1.1 },
];

/** How far a point is from a polyline (closed if `loop`) */
export function distToLine(pts: Pt[], p: Pt, loop = false) {
  let best = Infinity;
  const n = pts.length;
  for (let i = 0; i < (loop ? n : n - 1); i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const vx = b[0] - a[0];
    const vz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / (vx * vx + vz * vz || 1)));
    best = Math.min(best, Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vz * t));
  }
  return best;
}
/** Is a point on a path (`m` more either side) */
export const onPath = (p: Pt, m = 0) => PATHS.some((q) => distToLine(q.pts, p, q.loop) < q.half + m);

/* ---------- What stands in it ---------- */

/** Is a point inside an outline */
function inPoly(poly: Pt[], p: Pt) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
/** On the park's land (one of its blocks, `m` in from their edges) */
export const inPark = (p: Pt, m = 0) => WESTLAKE_BLOCKS.some((b) => inPoly(m ? inset(b.poly, m) : b.poly, p));
const inRect = (r: Rect, p: Pt, m = 0) => p[0] > r[0] - m && p[0] < r[2] + m && p[1] > r[1] - m && p[1] < r[3] + m;

/** A seeded generator (the same park for everyone) */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Smooth noise 0-1 (clumps of trees and the glades between) */
function noise(x: number, z: number) {
  const h = (i: number, j: number) => {
    const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const [i, j] = [Math.floor(x), Math.floor(z)];
  const [u, v] = [x - i, z - j];
  const [su, sv] = [u * u * (3 - 2 * u), v * v * (3 - 2 * v)];
  return h(i, j) * (1 - su) * (1 - sv) + h(i + 1, j) * su * (1 - sv) + h(i, j + 1) * (1 - su) * sv + h(i + 1, j + 1) * su * sv;
}

export interface ParkTree {
  x: number;
  z: number;
  s: number;
  pine: boolean;
  /** Left out on phones (the trim: half the lawns' clumps) */
  clump: boolean;
}

/** Where a tree may stand: on the park, off the paths, the lake and its loop, the stadium's site and the gates */
export const treeFree = (p: Pt) =>
  inPark(p, 1.6) && !onPath(p, 1.4) && !inLake(p[0], p[1], LOOP_OUT + 2.6) && !inRect(GARDEN_SITE, p, 3) && !nearTerrace(p, 1.5) && !inRect(BRIDGE_PARK, p, 1.8) && !inRect(BOATHOUSE.rect, p, 2.2) && GATES.every((g) => Math.hypot(p[0] - g.at[0], p[1] - g.at[1]) > 4);

export const PARK_TREES: ParkTree[] = (() => {
  const r = rng(808);
  const out: ParkTree[] = [];
  const put = (x: number, z: number, s: number, pine: boolean, clump: boolean) => {
    if (treeFree([x, z]) && out.every((t) => Math.hypot(t.x - x, t.z - z) > 2.2)) out.push({ x, z, s, pine, clump });
  };
  // The Mall: an avenue of trees either side, evenly spaced
  for (let z = ZS - 3; z > GARDEN_SITE[3] + 6; z -= 4.5) for (const side of [-1, 1]) put(MALL.x + side * (MALL.half + 1.7), z, 1.05, false, false);
  // The lawns: clumps where the noise is high, glades where it's low; pines towards the highway
  for (let x = X0; x < X1; x += 3.2)
    for (let z = Z0; z < ZS; z += 3.2) {
      const n = noise(x / 22, z / 22);
      if (n < 0.36 || r() > (n - 0.36) * 2.6) continue;
      const jx = x + (r() - 0.5) * 2.6;
      const jz = z + (r() - 0.5) * 2.6;
      const pine = r() < (jx < -170 || jz < -140 ? 0.55 : 0.15);
      put(jx, jz, 0.85 + r() * 0.5, pine, true);
    }
  return out;
})();

/** Lamps along the paths: [x, z, ry] (the arm reaching over the path: ry turns +x towards it) */
export const PARK_LAMPS: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  /** Along a path every `every`, `off` to one side (alternating if `zig`), the arm back over it */
  const along = (q: ParkPath, every: number, zig: boolean) => {
    const pts = q.loop ? [...q.pts, q.pts[0]] : q.pts;
    let carry = every / 2;
    let k = 0;
    for (let i = 1; i < pts.length; i++) {
      const [a, b] = [pts[i - 1], pts[i]];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 1e-6) continue;
      const [ux, uz] = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
      for (let d = carry; d < len; d += every) {
        const side = zig && k++ % 2 ? -1 : 1;
        // Right of travel: (-uz, ux)
        const [nx, nz] = [-uz * side, ux * side];
        const off = q.half + 0.5;
        const [x, z] = [a[0] + ux * d + nx * off, a[1] + uz * d + nz * off];
        // (the arm points back across the path: from the lamp towards -n)
        if (!inLake(x, z, 1.2) && !inRect(BRIDGE_PARK, [x, z], 0.8) && inPark([x, z], 0.3)) out.push([x, z, Math.atan2(nz, -nx)]);
      }
      carry = (((carry - len) % every) + every) % every;
    }
  };
  for (const q of PATHS) {
    if (q.id === 'mall') along(q, 9, true);
    else if (q.id === 'loop') along(q, 13, false);
    else if (q.id === 'ring') along(q, 18, false);
    else along(q, 15, false);
  }
  // Not on another path where paths meet, nor two on top of each other, nor by the boathouse and its jetty
  // (and none in the formal garden, which has its own, nor on a terrace)
  const clear = (l: [number, number, number]) => !inRect(GARDEN_SITE, [l[0], l[1]], 1) && !nearTerrace([l[0], l[1]], 0.6) && !inRect(BOATHOUSE.rect, [l[0], l[1]], 0.8) && !inRect([JETTY.x - JETTY.half, JETTY.z0, JETTY.x + JETTY.half, JETTY.z1], [l[0], l[1]], 1.2);
  return out.filter((l, i) => clear(l) && !onPath([l[0], l[1]], 0.25) && out.slice(0, i).every((o) => Math.hypot(o[0] - l[0], o[1] - l[1]) > 3));
})();

/** Benches along the lake loop (facing the water) and the Mall (facing across it): where, and which way the sitter faces (ry, +z turned) */
export const BENCHES: { at: Pt; ry: number }[] = (() => {
  const out: { at: Pt; ry: number }[] = [];
  // Round the lake, on the loop's water side, facing the water
  for (let k = 0; k < 18; k++) {
    const a = (2 * Math.PI * (k + 0.5)) / 18;
    const at = lakeAt(a, LOOP_OUT - 1.1 - 0.55);
    const [dx, dz] = [LAKE_C[0] - at[0], LAKE_C[1] - at[1]];
    out.push({ at, ry: Math.atan2(dx, dz) });
  }
  // Along the Mall, either side, facing across it
  for (let z = ZS - 6; z > GARDEN_SITE[3] + 8; z -= 13.5)
    for (const side of [-1, 1]) out.push({ at: [MALL.x + side * (MALL.half + 0.45), z], ry: side > 0 ? -Math.PI / 2 : Math.PI / 2 });
  // (none where another path comes in, nor on a terrace)
  return out.filter((b) => !nearTerrace(b.at, 0.8)).filter((b) => Math.abs(b.at[0] - JETTY.x) > JETTY.half + 1.6 || b.at[1] > JETTY.z1 + 1 || b.at[1] < JETTY.z0 - 1.5).filter((b) => PATHS.every((q) => q.id === 'loop' || q.id === 'mall' || distToLine(q.pts, b.at, q.loop) > q.half + 0.8));
})();

/** Each gate's two stone piers (x0, z0, x1, z1, height): solid, the path between them */
export const PIER = { w: 0.7, h: 1.5 };
export const GATE_PIERS: [number, number, number, number, number][] = GATES.flatMap((g) => {
  const across: Pt = [g.out[1], -g.out[0]];
  return [-1, 1].map((side) => {
    const c: Pt = [g.at[0] + across[0] * side * (g.half + 0.2 + PIER.w / 2), g.at[1] + across[1] * side * (g.half + 0.2 + PIER.w / 2)];
    return [c[0] - PIER.w / 2, c[1] - PIER.w / 2, c[0] + PIER.w / 2, c[1] + PIER.w / 2, PIER.h] as [number, number, number, number, number];
  });
});
/** The boathouse to its ridge */
export const BOATHOUSE_SOLID: [number, number, number, number, number] = [...BOATHOUSE.rect, BOATHOUSE.ridge];
/**
 * What's solid in the park: the gates' piers, the boathouse (the lake keeps walkers out through `inLake()` but on the
 * jetty, cars through `LAKE_WALLS`)
 */
export const WESTLAKE_SOLIDS = [...GATE_PIERS, BOATHOUSE_SOLID];

/** The lake as walls for cars (drive-sim.ts): strips across it, a tile deep, each its width there */
export const LAKE_WALLS: [number, number, number, number, number][] = (() => {
  const out: [number, number, number, number, number][] = [];
  for (let z = LAKE_C[1] - 36; z < LAKE_C[1] + 36; z += 1) {
    let lo = Infinity;
    let hi = -Infinity;
    // (its widest across the strip: sampled at its edges and between)
    for (let x = LAKE_C[0] - 37; x <= LAKE_C[0] + 37; x += 0.25)
      for (const dz of [0, 0.25, 0.5, 0.75, 1])
        if (inLake(x, z + dz)) {
          lo = Math.min(lo, x);
          hi = Math.max(hi, x);
        }
    if (hi > lo) out.push([lo - 0.3, z, hi + 0.3, z + 1, 2]);
  }
  return out;
})();
