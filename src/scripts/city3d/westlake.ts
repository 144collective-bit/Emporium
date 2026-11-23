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
 *   lake, the Mall (a wide straight walk with trees either side, from City
 *   Hall's back door (civic.ts) to the stadium) and the ways in from the gates
 *   (`GATES`).
 * - **The stadium's old site** (`GARDEN_SITE`), kept clear for the formal
 *   garden (the north side's stage 3, docs/north-plan.md): the stadium moved
 *   north of the ring highway (stadium.ts), the Mall carried on to it out of
 *   the north gate (`gate-n`), under the raised highway (stadium.ts `WALK`).
 */
import { EW_ROADS, WALK_W } from './layout';
import { BUILT, baked } from './baked';
import { HIGHWAY_BOX, HIGHWAY_HALF, HIGHWAY_R } from './highway';
import { RAMP_CLEAR, quadrantEdge } from './viaduct';
import { BEND_REACH, PARKWAY } from './outer';
import { BEHIND_Z, EAST_WALK_FROM, HALL, WALK_HALF, WEST_WALK, WEST_WALK_X, inCivic } from './civic';

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

/**
 * The south-west corner the raised highway's exit 8 takes (docs/highway-plan.md Phase 1b, the owner's call: open
 * land moves): its inside quadrant's edge, a sidewalk and a little more further in (the seam map's cells are 2
 * across), from the west edge down to the block's south edge
 */
export const EXIT_NOTCH: Pt[] = (() => {
  const edge = quadrantEdge(8, -1, RAMP_CLEAR + 2.5 + WALK_W).filter((p) => p[0] > X0 + 2.5 && p[1] < ZS - 0.5);
  // (from the west edge southwards: the edge comes from the arterial northwards, so it's turned round), its
  // straight run down to the south edge in one piece
  const pts = [...edge].reverse();
  const bend = pts.filter((p, i) => i === 0 || Math.abs(p[0] - pts.at(-1)![0]) > 0.05);
  return [[X0, pts[0][1] - 3], ...bend, [pts.at(-1)![0], ZS]];
})();

/** The big block, inside its sidewalk, counter-clockwise seen from above (the order the street plan's blocks keep) */
export const BIG: Pt[] = (() => {
  // Where the bend meets the west edge: from straight up (the north edge) round to there
  const aW = -Math.PI + Math.acos((BEND_C[0] - X0) / BEND_IN);
  const bend = arc(-Math.PI / 2, aW, 16);
  return [[X0, bend.at(-1)![1]], ...EXIT_NOTCH, [X1, ZS], [X1, Z0], ...bend.slice(0, -1)];
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
/** The old lake's radius at angle a (from +x towards +z): a sum of a few slow waves, longest east to west */
const baseR = (a: number) => 24 * (1 + 0.3 * Math.cos(2 * (a - 0.15)) + 0.1 * Math.cos(3 * a + 1.1) + 0.05 * Math.cos(5 * a + 2.3));

/*
 * The lake as redesigned (docs/westlake-plan.md Phase 1), its centre where it was: the old shore, its north side by
 * the boathouse and the jetty as it was, given two coves and a rocky point pushing into the water (`LAKE_COVES`,
 * `LAKE_POINT`: out along the shore's normal, by angle round the centre), and two arms spliced in (`LAKE_ARM` curving
 * north from the north shore into the woods, `LAKE_INLET` running south-east: each a centre line and its widths,
 * crossed by bridges in Phase 3), joined softly and traced (`LAKE_POLY`, baked). Not a radius by angle any more: the arm bends, so the lake is an outline,
 * and what asks of it asks the outline (`inLake()`, `lakeDist()`, `lakeLine()`).
 */
export const LAKE_COVES = [
  { a: (-150 * Math.PI) / 180, reach: 3.5, w: 0.2 },
  { a: (70 * Math.PI) / 180, reach: 3, w: 0.18 },
];
export const LAKE_POINT = { a: (150 * Math.PI) / 180, reach: -4.2, w: 0.17 };
export interface LakeArm {
  /** Its centre line from the open water out, and its width at each point (its tip rounded) */
  line: Pt[];
  w: number[];
}
export const LAKE_ARM: LakeArm = {
  line: [[-75.5, -62], [-74.5, -73], [-72, -82], [-68.5, -89], [-66.5, -96]],
  w: [9, 7.4, 7, 6.6, 6],
};
export const LAKE_INLET: LakeArm = {
  line: [[-75, -39], [-71.5, -31.5], [-68.5, -26.5]],
  w: [7, 5, 4.4],
};
/** The open water: the old shore with its coves and point, no arms (the boats' rings keep inside it) */
function makeCore(): Pt[] {
  const n = 360;
  const pts = Array.from({ length: n }, (_, k) => {
    const a = (-2 * Math.PI * k) / n;
    return [LAKE_C[0] + Math.cos(a) * baseR(a), LAKE_C[1] + Math.sin(a) * baseR(a)] as Pt;
  });
  const nrm = normals(pts);
  return pts.map((p, k) => {
    const a = (-2 * Math.PI * k) / n;
    const d = [...LAKE_COVES, LAKE_POINT].reduce((s, c) => {
      const da = Math.atan2(Math.sin(a - c.a), Math.cos(a - c.a));
      return s + c.reach * Math.exp(-((da / c.w) ** 2));
    }, 0);
    return [p[0] + nrm[k][0] * d, p[1] + nrm[k][1] * d] as Pt;
  });
}
/** A closed outline's outward normals at its points (the outline wound as the old lake's: clockwise from above, +x right, +z down the page) */
function normals(pts: Pt[]): Pt[] {
  const n = pts.length;
  const area = pts.reduce((s, p, i) => s + p[0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * p[1], 0);
  const sg = area > 0 ? 1 : -1;
  return pts.map((_, i) => {
    const [a, b] = [pts[(i + n - 1) % n], pts[(i + 1) % n]];
    const [dx, dz] = [b[0] - a[0], b[1] - a[1]];
    const l = Math.hypot(dx, dz) || 1;
    return [(sg * dz) / l, (-sg * dx) / l] as Pt;
  });
}
/** Corners cut, so the splices and the tips round off (Chaikin's, a closed outline) */
function chaikin(pts: Pt[], times: number): Pt[] {
  let p = pts;
  for (let t = 0; t < times; t++) {
    const q: Pt[] = [];
    for (let i = 0; i < p.length; i++) {
      const [a, b] = [p[i], p[(i + 1) % p.length]];
      q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    p = q;
  }
  return p;
}
/** A closed outline n points round, evenly along its length (from the point nearest a start, so it reads as before) */
function resample(pts: Pt[], n: number): Pt[] {
  const m = pts.length;
  const cum = [0];
  for (let i = 0; i < m; i++) cum.push(cum[i] + Math.hypot(pts[(i + 1) % m][0] - pts[i][0], pts[(i + 1) % m][1] - pts[i][1]));
  const L = cum[m];
  const out: Pt[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const d = (k / n) * L;
    while (cum[j + 1] < d) j++;
    const t = (d - cum[j]) / (cum[j + 1] - cum[j] || 1);
    const [a, b] = [pts[j], pts[(j + 1) % m]];
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}
/** The open water's outline, rounded (no arms) */
const CORE_POLY: Pt[] = baked('lake-core', BUILT ? undefined : () => resample(makeCore(), 360).map((p) => [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000] as Pt));
/** How far a point is from an arm: out from its sides positive (its width eased along its line) */
function armDist(arm: LakeArm, x: number, z: number) {
  let best = Infinity;
  for (let i = 1; i < arm.line.length; i++) {
    const [a, b] = [arm.line[i - 1], arm.line[i]];
    const [dx, dz] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    const d = Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z) - (arm.w[i - 1] + (arm.w[i] - arm.w[i - 1]) * t) / 2;
    best = Math.min(best, d);
  }
  return best;
}
/** Two shapes' distances joined softly (a rounded fillet about `k` across where they meet) */
const smin = (a: number, b: number, k: number) => -k * Math.log(Math.exp(-a / k) + Math.exp(-b / k));
/**
 * The whole lake: the open water and its arms as one field (each its distance, joined softly so the mouths round off),
 * its edge traced on a fine grid (marching squares, the crossings eased along each cell's sides), the longest ring
 * kept, wound and started as the old lake's outline was (so a line n points round reads from the same place). Baked:
 * the build works it out once.
 */
function makeLake(): Pt[] {
  const RES = 0.3;
  const all = [...CORE_POLY, ...LAKE_ARM.line, ...LAKE_INLET.line];
  const [x0, z0] = [Math.min(...all.map((p) => p[0])) - 6, Math.min(...all.map((p) => p[1])) - 6];
  const [x1, z1] = [Math.max(...all.map((p) => p[0])) + 6, Math.max(...all.map((p) => p[1])) + 6];
  const [nx, nz] = [Math.ceil((x1 - x0) / RES) + 1, Math.ceil((z1 - z0) / RES) + 1];
  const f = new Float64Array(nx * nz);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const [x, z] = [x0 + i * RES, z0 + j * RES];
      const core = inPoly(CORE_POLY, [x, z]) ? -distToLine(CORE_POLY, [x, z], true) : distToLine(CORE_POLY, [x, z], true);
      f[j * nx + i] = smin(smin(core, armDist(LAKE_ARM, x, z), 2.2), armDist(LAKE_INLET, x, z), 1.8);
    }
  // The edge: each cell's crossings, a segment a pair, keyed by the cell side they sit on (so they chain up)
  const at = (i: number, j: number) => f[j * nx + i];
  const cross = (i0: number, j0: number, i1: number, j1: number): Pt => {
    const [a, b] = [at(i0, j0), at(i1, j1)];
    const t = a / (a - b);
    return [x0 + (i0 + (i1 - i0) * t) * RES, z0 + (j0 + (j1 - j0) * t) * RES];
  };
  const links = new Map<string, string[]>();
  const pos = new Map<string, Pt>();
  const link = (a: string, b: string) => {
    links.set(a, [...(links.get(a) ?? []), b]);
    links.set(b, [...(links.get(b) ?? []), a]);
  };
  for (let j = 0; j < nz - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      // (the corners: top left, top right, bottom right, bottom left, each in the water under nought; the sides: top,
      // right, bottom, left, each keyed so its neighbour cell shares it)
      const v = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
      const c = v.map((x) => (x < 0 ? 1 : 0));
      const idx = c[0] | (c[1] << 1) | (c[2] << 2) | (c[3] << 3);
      if (idx === 0 || idx === 15) continue;
      const key = [`h${i},${j}`, `v${i + 1},${j}`, `h${i},${j + 1}`, `v${i},${j}`];
      const ends = [
        [i, j, i + 1, j],
        [i + 1, j, i + 1, j + 1],
        [i, j + 1, i + 1, j + 1],
        [i, j, i, j + 1],
      ] as const;
      const cut = [0, 1, 2, 3].filter((k) => c[k] !== c[(k + 1) % 4]);
      // (side k lies between corners k and k+1: top 0-1, right 1-2, bottom 2-3, left 3-0)
      for (const k of cut) if (!pos.has(key[k])) pos.set(key[k], cross(...ends[k]));
      if (cut.length === 2) link(key[cut[0]], key[cut[1]]);
      else {
        // A saddle: the middle's value says which corners join
        // (the middle on the top left's side: the other two corners are cut off on their own; otherwise those two are)
        const mid = (v[0] + v[1] + v[2] + v[3]) / 4 < 0;
        if ((c[0] === 1) === mid) {
          link(key[0], key[1]);
          link(key[2], key[3]);
        } else {
          link(key[3], key[0]);
          link(key[1], key[2]);
        }
      }
    }
  // Walk the links into rings; keep the longest
  const seen = new Set<string>();
  let best: Pt[] = [];
  for (const start of links.keys()) {
    if (seen.has(start)) continue;
    const ring: Pt[] = [];
    let [prev, k]: [string | undefined, string | undefined] = [undefined, start];
    while (k && !seen.has(k)) {
      seen.add(k);
      ring.push(pos.get(k)!);
      const nb: string[] = links.get(k) ?? [];
      const nxt: string | undefined = nb.find((q) => q !== prev && !seen.has(q));
      [prev, k] = [k, nxt];
    }
    if (ring.length > best.length) best = ring;
  }
  // Wound as the old outline (its signed area's sign), eased, evenly spaced, started due east of the middle
  const area = (p: Pt[]) => p.reduce((s, q, i) => s + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0);
  if (Math.sign(area(best)) !== Math.sign(area(CORE_POLY))) best.reverse();
  const out = resample(chaikin(resample(best, 600), 2), 480);
  let k0 = 0;
  const score = (p: Pt) => Math.abs(p[1] - LAKE_C[1]) + (p[0] < LAKE_C[0] ? 1e3 : 0);
  for (let k = 1; k < out.length; k++) if (score(out[k]) < score(out[k0])) k0 = k;
  return [...out.slice(k0), ...out.slice(0, k0)].map((p) => [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000] as Pt);
}
export const LAKE_POLY: Pt[] = baked('lake', BUILT ? undefined : makeLake);
/** The way the shore is wound (its signed area's sign: the outward normal of an edge (dx, dz) is this times (dz, -dx)) */
const LAKE_SG = Math.sign(LAKE_POLY.reduce((s, p, i) => s + p[0] * LAKE_POLY[(i + 1) % LAKE_POLY.length][1] - LAKE_POLY[(i + 1) % LAKE_POLY.length][0] * p[1], 0));
/** The lake's box (x0, z0, x1, z1) */
const LAKE_BOX: Rect = [Math.min(...LAKE_POLY.map((p) => p[0])), Math.min(...LAKE_POLY.map((p) => p[1])), Math.max(...LAKE_POLY.map((p) => p[0])), Math.max(...LAKE_POLY.map((p) => p[1]))];
/** How far out the lake reaches from its centre at most (its arm's tip) */
export const LAKE_REACH = Math.max(...LAKE_POLY.map((p) => Math.hypot(p[0] - LAKE_C[0], p[1] - LAKE_C[1])));
/** How far a point is from the water: out from the shore positive, in from it negative */
export function lakeDist(x: number, z: number) {
  const d = distToLine(LAKE_POLY, [x, z], true);
  return inPoly(LAKE_POLY, [x, z]) ? -d : d;
}
/** Is a point in the lake (`m` short of its edge, out along the shore's normal: a walker's radius; negative, that far in from it) */
export function inLake(x: number, z: number, m = 0) {
  if (x < LAKE_BOX[0] - m || x > LAKE_BOX[2] + m || z < LAKE_BOX[1] - m || z > LAKE_BOX[3] + m) return false;
  const inn = inPoly(LAKE_POLY, [x, z]);
  if (m === 0) return inn;
  if (m > 0) return inn || distToLine(LAKE_POLY, [x, z], true) < m;
  return inn && distToLine(LAKE_POLY, [x, z], true) > -m;
}
/** A closed line `out` off an outline along its normals, its loops cut out (where an offset folds over itself at a bend) */
function offset(poly: Pt[], out: number): Pt[] {
  if (!out) return poly.slice();
  const nrm = normals(poly);
  let p = poly.map((q, i) => [q[0] + nrm[i][0] * out, q[1] + nrm[i][1] * out] as Pt);
  // (a fold: two edges crossing; the stretch between them cut out, the crossing kept)
  const cross = (a: Pt, b: Pt, c: Pt, d: Pt): Pt | null => {
    const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
    if (Math.abs(den) < 1e-12) return null;
    const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den;
    const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den;
    return t > 0 && t < 1 && u > 0 && u < 1 ? [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] : null;
  };
  for (let guard = 0; guard < 64; guard++) {
    const n = p.length;
    let cut = false;
    for (let i = 0; i < n && !cut; i++)
      // (a fold is short: look ahead a third of the way round)
      for (let k = 2; k < n / 3 && !cut; k++) {
        const j = (i + k) % n;
        if ((j + 1) % n === i) continue;
        const x = cross(p[i], p[(i + 1) % n], p[j], p[(j + 1) % n]);
        if (!x) continue;
        const keep: Pt[] = [];
        for (let m = 0; m < n; m++) {
          const idx = (j + 1 + m) % n;
          if (idx === (i + 1) % n) break;
          keep.push(p[idx]);
        }
        p = [x, ...keep];
        // (rotated back so it starts near where it did)
        cut = true;
      }
    if (!cut) break;
  }
  return p;
}
/** The lake's outline, `n` points round (wound as the old lake's), `out` off it along its normals (negative: over the water) */
export const lakeLine = (out = 0, n = 96): Pt[] => resample(offset(LAKE_POLY, out), n);
/** The open water's outline (no arm or inlet), `out` off it: the boats' rings are inside it */
export const lakeCoreLine = (out = 0, n = 96): Pt[] => resample(offset(CORE_POLY, out), n);
/** Where a ray from the lake's middle at angle a (from +x towards +z) last leaves the water, `out` off the shore there along its normal */
export const lakeAt = (a: number, out = 0): Pt => {
  const [dx, dz] = [Math.cos(a), Math.sin(a)];
  let best = -1;
  let at: Pt = LAKE_C;
  let k = 0;
  const P = LAKE_POLY;
  for (let i = 0; i < P.length; i++) {
    const [p, q] = [P[i], P[(i + 1) % P.length]];
    const [ex, ez] = [q[0] - p[0], q[1] - p[1]];
    const den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((p[0] - LAKE_C[0]) * ez - (p[1] - LAKE_C[1]) * ex) / den;
    const u = ((p[0] - LAKE_C[0]) * dz - (p[1] - LAKE_C[1]) * dx) / den;
    if (t > 0 && u >= 0 && u < 1 && t > best) [best, at, k] = [t, [LAKE_C[0] + dx * t, LAKE_C[1] + dz * t], i];
  }
  if (!out) return at;
  // (out along the edge's normal, by the whole shore's winding)
  const [p, q] = [P[k], P[(k + 1) % P.length]];
  const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
  return [at[0] + ((LAKE_SG * (q[1] - p[1])) / l) * out, at[1] + ((-LAKE_SG * (q[0] - p[0])) / l) * out];
};
/** How far the shore is from the lake's middle along angle a (where the ray last leaves the water) */
export const lakeR = (a: number) => Math.hypot(lakeAt(a)[0] - LAKE_C[0], lakeAt(a)[1] - LAKE_C[1]);
/**
 * The water's top under the lawn's slab (docs/westlake-plan.md Phase 3b, the owner's call: the lake lowered into a
 * carved stone embankment all round, so the grand terrace steps down to it); its bed under it
 */
export const WATER_Y = -2.2;
export const BED_Y = WATER_Y - 0.7;
/**
 * The lake cut into convex pieces (out to just under the rim's coping): the lawn's slab holed over it (world.ts, as
 * the Circus's cuts are), and the ground's grass under its box. Worked out once at the build (baked): an ear-clipped
 * triangulation, its triangles merged two by two wherever the merge stays convex
 */
export const LAKE_PARTS: Pt[][] = baked('lake-parts', BUILT ? undefined : () => convexParts(lakeLine(0.15, 240)).map((q) => q.map((p) => [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000] as Pt)));
/** The lake's box out to its coping, for the ground's grass to be cut away under */
export const LAKE_HOLE: Rect = (() => {
  const all = LAKE_PARTS.flat();
  return [Math.min(...all.map((p) => p[0])) - 0.5, Math.min(...all.map((p) => p[1])) - 0.5, Math.max(...all.map((p) => p[0])) + 0.5, Math.max(...all.map((p) => p[1])) + 0.5];
})();
function convexParts(poly: Pt[]): Pt[][] {
  const signed = poly.reduce((t, p, i) => t + p[0] * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * p[1], 0);
  const P = signed > 0 ? poly.slice() : poly.slice().reverse();
  const cr = (a: Pt, b: Pt, c: Pt) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inTri = (p: Pt, a: Pt, b: Pt, c: Pt) => cr(a, b, p) > 1e-9 && cr(b, c, p) > 1e-9 && cr(c, a, p) > 1e-9;
  // Ear-clipping (counter-clockwise: an ear turns left and holds no other corner)
  const idx = P.map((_, i) => i);
  const tris: number[][] = [];
  let guard = 0;
  while (idx.length > 3 && guard++ < 100000) {
    let cut = false;
    for (let i = 0; i < idx.length; i++) {
      const [a, b, c] = [idx[(i + idx.length - 1) % idx.length], idx[i], idx[(i + 1) % idx.length]];
      if (cr(P[a], P[b], P[c]) <= 1e-12) continue;
      if (idx.some((k) => k !== a && k !== b && k !== c && inTri(P[k], P[a], P[b], P[c]))) continue;
      tris.push([a, b, c]);
      idx.splice(i, 1);
      cut = true;
      break;
    }
    if (!cut) break;
  }
  if (idx.length === 3) tris.push(idx.slice());
  // Merge neighbours sharing a diagonal wherever the merged piece stays convex
  let polys = tris;
  const convex = (q: number[]) => q.every((_, i) => cr(P[q[i]], P[q[(i + 1) % q.length]], P[q[(i + 2) % q.length]]) >= -1e-9);
  for (let merged = true; merged; ) {
    merged = false;
    outer: for (let i = 0; i < polys.length; i++)
      for (let j = i + 1; j < polys.length; j++) {
        const [A, B] = [polys[i], polys[j]];
        for (let a = 0; a < A.length; a++) {
          const [u, v] = [A[a], A[(a + 1) % A.length]];
          const b = B.findIndex((x, k) => x === v && B[(k + 1) % B.length] === u);
          if (b < 0) continue;
          // (A round from v back to u, then B round from u to v, the shared edge dropped)
          const m = [...Array.from({ length: A.length }, (_, k) => A[(a + 1 + k) % A.length]), ...Array.from({ length: B.length - 2 }, (_, k) => B[(b + 2 + k) % B.length])];
          if (!convex(m)) continue;
          polys = polys.filter((_, k) => k !== i && k !== j).concat([m]);
          merged = true;
          break outer;
        }
      }
  }
  return polys.map((q) => q.map((k) => P[k]));
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
  return { x, half, z0: loopZ(x, 4.5 - 0.7) - 0.1, z1: loopZ(x, -3.4), y: 0.16 };
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
 * over the water), height over the lawn's slab: a step up off the loop, the platform, then a flight down the embankment
 * to a landing just over the water (`WATER_Y` under the slab, Phase 3b)
 */
export const TERRACE_STEPS: [number, number, number][] = [
  [3.2, 2.6, 0.1],
  [2.6, 0.8, 0.18],
  // (then a flight down the embankment, a step every 0.28, to a landing just over the water, short of the boats: Phase 3b)
  ...Array.from({ length: 12 }, (_, k): [number, number, number] => [0.8 - k * 0.28, 0.8 - (k + 1) * 0.28, 0.18 - ((k + 1) * (0.18 - (WATER_Y + 0.25))) / 13]),
  [0.8 - 12 * 0.28, 0.8 - 12 * 0.28 - 1.0, WATER_Y + 0.25],
];
/** Two terraces: on the south shore by the lake's south walk and the east shore (the west one's site the grand terrace's, Phase 3b) */
export const TERRACES: Terrace[] = [Math.PI / 2 + 0.35, 0.05].map((a) => {
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

/* ---------- The overlook (docs/westlake-plan.md Phase 3c) ---------- */

/**
 * The overlook at the rocky point: the lawn paved from the rim back to the loop over the shore within `reach` of the
 * point's tip (`tip`), a carved balustrade along the embankment's edge there (`OVERLOOK_RAIL`, solid)
 */
export const OVERLOOK = { tip: lakeAt((150 * Math.PI) / 180), reach: 5.5 };
/** The overlook's balustrade: its line along the rim, a little in from the water */
export const OVERLOOK_RAIL: Pt[] = lakeLine(RIM.w * 0.5, 480).filter((p) => Math.hypot(p[0] - OVERLOOK.tip[0], p[1] - OVERLOOK.tip[1]) < OVERLOOK.reach);
/** Is a point on the overlook's paving (`m` more round it) */
export const onOverlook = (x: number, z: number, m = 0) => Math.hypot(x - OVERLOOK.tip[0], z - OVERLOOK.tip[1]) < OVERLOOK.reach + m && !inLake(x, z) && lakeDist(x, z) < LOOP_OUT - 1.1 + m;

/* ---------- The grand terrace (docs/westlake-plan.md Phase 3b) ---------- */

/** The lawn's slab's top (world.ts SLAB): the grand terrace's walls stand over it */
const SLAB_TOP = 0.15;

/**
 * The grand terrace at the west lobe's tip, where the walk from the promenade behind City Hall meets the lake: a
 * plaza sunk into the land and out over the water at the water's level (`plaza`, under the slab), open to the lake
 * past its balustrade (`front`), its landward wall the arcade under the lawn (`back`, the arches `arches` either side of
 * the middle, `recess` deep), and a flight of steps down from the lawn along that wall on either side (from `half`
 * across, at the lawn, down to `foot`, at the plaza; `flight` deep from the wall); the winged figure's fountain in the
 * plaza's middle (`fountain`). In its own frame: `d` out of the water (along `u`), `s` along the shore (`t`).
 */
function makeGrandFrame() {
  const want: Pt = [-128.4, -66];
  let k = 0;
  LAKE_POLY.forEach((p, i) => {
    if (Math.hypot(p[0] - want[0], p[1] - want[1]) < Math.hypot(LAKE_POLY[k][0] - want[0], LAKE_POLY[k][1] - want[1])) k = i;
  });
  const n = LAKE_POLY.length;
  const [a, b] = [LAKE_POLY[(k + n - 4) % n], LAKE_POLY[(k + 4) % n]];
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const t: Pt = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  const at = LAKE_POLY[k];
  let u: Pt = [t[1], -t[0]];
  if (lakeDist(at[0] + u[0], at[1] + u[1]) < 0) u = [-u[0], -u[1]];
  return { at, u, t, front: -7, back: 1.5, half: 7, foot: 2.8, flight: 2.0, recess: 1.2, plaza: WATER_Y + 0.2, steps: 12, fountain: { d: -3.8, r: 2.2 } };
}
/** The grand terrace's frame, its cut in the lawn, its hole in the ground and its solids: worked out once at the build (baked) */
const GRAND_BAKED = baked('grand', BUILT ? undefined : () => {
  const frame = makeGrandFrame();
  return { frame, cut: grandCut(frame), hole: grandHole(frame), solids: grandSolids(frame) };
});
export const GRAND = GRAND_BAKED.frame;
/** A point in the grand terrace's frame */
export const grandLocal = (x: number, z: number) => {
  const [dx, dz] = [x - GRAND.at[0], z - GRAND.at[1]];
  return { d: dx * GRAND.u[0] + dz * GRAND.u[1], s: dx * GRAND.t[0] + dz * GRAND.t[1] };
};
/** A point from the grand terrace's frame */
export const grandAt = (d: number, s: number): Pt => [GRAND.at[0] + GRAND.u[0] * d + GRAND.t[0] * s, GRAND.at[1] + GRAND.u[1] * d + GRAND.t[1] * s];
/** Is a point on the grand terrace's plaza or its steps (`m` in from their edges; negative, out past them) */
export const onGrand = (x: number, z: number, m = 0) => {
  const { d, s } = grandLocal(x, z);
  return d > GRAND.front + m && d < GRAND.back - m && Math.abs(s) < GRAND.half - m;
};
/** The grand terrace's ground under a point over the lawn's slab (below it: the plaza and the steps down), or null off it */
export function grandY(x: number, z: number): number | null {
  const { d, s } = grandLocal(x, z);
  if (d <= GRAND.front || d >= GRAND.back || Math.abs(s) >= GRAND.half) return null;
  const a = Math.abs(s);
  if (d < GRAND.back - GRAND.flight || a <= GRAND.foot) return GRAND.plaza;
  // (a step every (half - foot) / steps, the top one the lawn's)
  const k = Math.floor(((a - GRAND.foot) / (GRAND.half - GRAND.foot)) * GRAND.steps);
  return GRAND.plaza + ((k + 1) * -GRAND.plaza) / (GRAND.steps + 1);
}
type GrandFrame = ReturnType<typeof makeGrandFrame>;
function frameAt(G: GrandFrame, d: number, s: number): Pt {
  return [G.at[0] + G.u[0] * d + G.t[0] * s, G.at[1] + G.u[1] * d + G.t[1] * s];
}
function grandCut(G: GrandFrame): Pt[] {
  return [frameAt(G, G.front, -G.half), frameAt(G, G.front, G.half), frameAt(G, G.back, G.half), frameAt(G, G.back, -G.half)];
}
function grandHole(G: GrandFrame): Rect {
  const c = [...grandCut(G), frameAt(G, G.back + G.recess + 0.3, -G.half), frameAt(G, G.back + G.recess + 0.3, G.half)];
  return [Math.min(...c.map((p) => p[0])) - 0.3, Math.min(...c.map((p) => p[1])) - 0.3, Math.max(...c.map((p) => p[0])) + 0.3, Math.max(...c.map((p) => p[1])) + 0.3];
}
/** The lawn cut over the plaza (its outline, convex: world.ts holes the slab over it as it does the lake) */
export const GRAND_CUT: Pt[] = GRAND_BAKED.cut;
/** The ground's grass cut away under the plaza and the arcade's recess behind it */
export const GRAND_HOLE: Rect = GRAND_BAKED.hole;
/**
 * What's solid about it: its walls and balustrades as cells along them (the arcade's wall and the steps' sides, the
 * balustrades on the lawn round the cut but where the steps come up, along the steps over the plaza, along its front
 * over the water), and the fountain's basin
 */
export const GRAND_SOLIDS: [number, number, number, number, number][] = GRAND_BAKED.solids;
function grandSolids(GRAND: GrandFrame): [number, number, number, number, number][] {
  const grandAt = (d: number, s: number) => frameAt(GRAND, d, s);
  const out: [number, number, number, number, number][] = [];
  const wall = (d0: number, s0: number, d1: number, s1: number, top: number) => {
    const n = Math.max(1, Math.ceil(Math.hypot(d1 - d0, s1 - s0) / 0.6));
    for (let i = 0; i < n; i++) {
      const [p, q] = [grandAt(d0 + ((d1 - d0) * i) / n, s0 + ((s1 - s0) * i) / n), grandAt(d0 + ((d1 - d0) * (i + 1)) / n, s0 + ((s1 - s0) * (i + 1)) / n)];
      out.push([Math.min(p[0], q[0]) - 0.15, Math.min(p[1], q[1]) - 0.15, Math.max(p[0], q[0]) + 0.15, Math.max(p[1], q[1]) + 0.15, top]);
    }
  };
  const { front: f, back: bk, half: h, foot, flight } = GRAND;
  const lawn = SLAB_TOP + 1.0;
  // (the back wall, the arcade's, and the balustrade on the lawn over it and the steps)
  wall(bk + 0.15, -h, bk + 0.15, h, lawn);
  // (the sides: on the lawn by the plaza, the steps coming up between)
  for (const sg of [-1, 1]) wall(f, sg * (h + 0.15), bk - flight, sg * (h + 0.15), lawn);
  // (the steps' sides over the plaza)
  for (const sg of [-1, 1]) wall(bk - flight - 0.15, sg * foot, bk - flight - 0.15, sg * h, lawn);
  // (the front over the water)
  // (walls by the plaza over the water top out at nought: two metres over anyone on it, nobody on the lawn there)
  wall(f - 0.15, -h, f - 0.15, h, 0);
  const c = grandAt(GRAND.fountain.d, 0);
  const r = GRAND.fountain.r;
  out.push([c[0] - r * 0.8, c[1] - r * 0.8, c[0] + r * 0.8, c[1] + r * 0.8, 0]);
  return out;
}

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
    // Inward: to the left of travel (counter-clockwise from above, as streetplan.ts insetPoly)
    return [(q[1] - p[1]) / l, -(q[0] - p[0]) / l] as Pt;
  });
  return poly.map((p, i) => {
    const a = nrm[(i + n - 1) % n];
    const b = nrm[i];
    const k = d / (1 + a[0] * b[0] + a[1] * b[1]);
    return [p[0] + (a[0] + b[0]) * k, p[1] + (a[1] + b[1]) * k] as Pt;
  });
}

/** The Mall: a wide walk from City Hall's back door (civic.ts) north through the garden's site to the north gate (x, and its half width) */
export const MALL = { x: -140, half: 2.4 };
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
/** The south-west gate (east of the corner exit 8 takes) */
const SW_GATE_X = EXIT_NOTCH.at(-1)![0] + 12;
const southGate = (id: string, x: number, half = 1.3): Gate => ({ id, at: [x, ZS], out: [0, 1], half });
const eastGate = (id: string, z: number, half = 1.3): Gate => ({ id, at: [X1, z], out: [1, 0], half });
export const GATES: Gate[] = [
  // (the Mall's south gate went with the civic square, civic.ts: the square opens onto the avenue all along its side)
  // (the Mall's north end, out under the raised highway to the stadium: stadium.ts WALK, docs/highway-plan.md Phase 2)
  { id: 'gate-n', at: [MALL.x, Z0], out: [0, -1], half: MALL.half },
  southGate('gate-sw', SW_GATE_X),
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

/**
 * The ring walk round the big block (docs/westlake-plan.md Phase 2): its line pulled in from the edge, its corners
 * rounded (but those by the civic quarter, which it passes close), wandering a little either
 * side where it has room, straight past the civic quarter and the gates (so their walks meet it as before)
 */
const RING_BASE: Pt[] = (() => {
  // (each corner a curve, about 10 round, but those by the civic quarter, which the ring passes close)
  const poly = inset(BIG, RING_IN);
  const n = poly.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const [p, v, q] = [poly[(i + n - 1) % n], poly[i], poly[(i + 1) % n]];
    const [l1, l2] = [Math.hypot(v[0] - p[0], v[1] - p[1]), Math.hypot(q[0] - v[0], q[1] - v[1])];
    const [d1, d2] = [[(v[0] - p[0]) / l1, (v[1] - p[1]) / l1], [(q[0] - v[0]) / l2, (q[1] - v[1]) / l2]];
    const turn = Math.acos(Math.max(-1, Math.min(1, d1[0] * d2[0] + d1[1] * d2[1])));
    if (turn < 0.15 || inCivic(v, 12)) {
      out.push(v);
      continue;
    }
    const t = Math.min(10 * Math.tan(turn / 2), l1 * 0.45, l2 * 0.45);
    const [a, b]: Pt[] = [[v[0] - d1[0] * t, v[1] - d1[1] * t], [v[0] + d2[0] * t, v[1] + d2[1] * t]];
    for (let k = 0; k <= 8; k++) {
      const u = k / 8;
      out.push([(1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * v[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * v[1] + u * u * b[1]]);
    }
  }
  return resample(out, 480);
})();
export const RING_WALK: Pt[] = (() => {
  const n = RING_BASE.length;
  const nrm = normals(RING_BASE);
  let s0 = 0;
  const along = RING_BASE.map((p, i) => (i ? (s0 += Math.hypot(p[0] - RING_BASE[i - 1][0], p[1] - RING_BASE[i - 1][1])) : 0));
  const quiet = (p: Pt) => inCivic(p, 9) || GATES.some((g) => Math.hypot(p[0] - g.at[0], p[1] - g.at[1]) < 16);
  const raw = RING_BASE.map((p) => (quiet(p) ? 0 : 1));
  // (eased in and out along the walk, so it never jinks)
  const amp = raw.map((_, i) => {
    let t = 0;
    for (let k = -14; k <= 14; k++) t += raw[(i + k + n) % n];
    return t / 29;
  });
  return RING_BASE.map((p, i) => {
    const w = 1.2 * amp[i] * Math.sin((along[i] / 52) * Math.PI * 2 + 0.7);
    return [p[0] + nrm[i][0] * w, p[1] + nrm[i][1] * w] as Pt;
  });
})();
/** The Mall's promenade: from City Hall's back door to the formal garden, wide and paved, a double avenue either side */
export const PROMENADE_HALF = 3.6;
/** The Great Lawn north of the lake: the open meadow, a walk round it (its middle, its half widths across and along) */
export const LAWN = { c: [-93, -121] as Pt, rx: 12.5, rz: 25 };
const LAWN_LINE: Pt[] = Array.from({ length: 120 }, (_, k) => {
  const a = (-2 * Math.PI * k) / 120;
  return [LAWN.c[0] + Math.cos(a) * LAWN.rx, LAWN.c[1] + Math.sin(a) * LAWN.rz] as Pt;
});
/** Is a point on the Great Lawn (inside its walk, `m` in from it; negative, out past it): kept open, no trees or rocks on it */
export function onLawn(p: Pt, m = 0) {
  return ((p[0] - LAWN.c[0]) / (LAWN.rx - m)) ** 2 + ((p[1] - LAWN.c[1]) / (LAWN.rz - m)) ** 2 < 1;
}
/** Where the lawn's walk is, at a depth z, on its west (-1) or east (1) side */
const lawnAt = (side: number, z: number): Pt => [LAWN.c[0] + side * LAWN.rx * Math.sqrt(Math.max(0, 1 - ((z - LAWN.c[1]) / LAWN.rz) ** 2)), z];
/** Where the lake loop is nearest a point (for paths that join it) */
const LOOP_LINE = lakeLine(LOOP_OUT, 360);

/* ---------- The bridges (docs/westlake-plan.md Phase 3a) ---------- */

/**
 * A bridge: its deck straight across the water, square to it, from one end on the land to the other (`a` to `b`, `u`
 * the way, `len` long; the loop joined to each end), `half` wide either side, rising in an arch to `rise` over the
 * lawn at its middle: the cast-iron one over the arm, the stone arch over the inlet
 */
export interface Bridge {
  id: 'iron' | 'stone';
  a: Pt;
  b: Pt;
  u: Pt;
  len: number;
  half: number;
  rise: number;
}
/**
 * A bridge across an arm of the lake at `f` along its stretch `i` (from its point i to i + 1): square across it, its
 * ends on the land a few metres past the water either side (the loop joins them by a short link: the nearest points of
 * its line, `segs`)
 */
function bridgeOver(id: Bridge['id'], arm: LakeArm, i: number, f: number, half: number, rise: number): Bridge & { segs: [number, number] } {
  const [p0, p1] = [arm.line[i], arm.line[i + 1]];
  const p: Pt = [p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f];
  const l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  const across: Pt = [-(p1[1] - p0[1]) / l, (p1[0] - p0[0]) / l];
  // (out each way to the water's edge, then on past it onto the land)
  const end = (sg: number): Pt => {
    let t = 0;
    while (inLake(p[0] + across[0] * sg * t, p[1] + across[1] * sg * t) && t < 30) t += 0.05;
    t += 3.2;
    return [p[0] + across[0] * sg * t, p[1] + across[1] * sg * t];
  };
  const [A, B] = [end(-1), end(1)];
  const near = (q: Pt) => LOOP_LINE.reduce((best, r, k) => (Math.hypot(r[0] - q[0], r[1] - q[1]) < Math.hypot(LOOP_LINE[best][0] - q[0], LOOP_LINE[best][1] - q[1]) ? k : best), 0);
  const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
  return { id, a: A, b: B, u: [(B[0] - A[0]) / len, (B[1] - A[1]) / len], len, half, rise, segs: [near(A), near(B)] };
}
/** The bridges, the loop over them and the walks round the arm and the inlet: worked out once at the build (baked) */
function makeRoute() {
  const spans = [bridgeOver('iron', LAKE_ARM, 0, 0.85, 1.5, 1.6), bridgeOver('stone', LAKE_INLET, 1, 0.35, 1.4, 1.5)];
  const mm = (p: Pt): Pt => [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000];
  const r = routeOver(spans);
  // (and round behind the grand terrace, Phase 3b: no nearer the water there than a walk's width behind its arcade,
  // easing back to the shore's line either side)
  const clear = GRAND.back + 2.5;
  const loop = r.loop.map((p): Pt => {
    const { d, s } = grandLocal(p[0], p[1]);
    const a = Math.abs(s);
    const min = a <= GRAND.half ? clear : clear - (a - GRAND.half) * 1.5;
    // (only the loop's stretch round this end of the lake: not the far shore's, out in front of the terrace)
    return d >= min || d < GRAND.front - 2 ? p : grandAt(min, s);
  });
  return { bridges: spans.map(({ segs: _s, ...b }) => b), loop: loop.map(mm), arm: r.arm.map(mm), inlet: r.inlet.map(mm) };
}
const ROUTE = baked('park-route', BUILT ? undefined : makeRoute);
export const BRIDGES: Bridge[] = ROUTE.bridges;
/** Where a point is along a bridge and across it */
const onSpan = (k: Bridge, x: number, z: number) => {
  const [dx, dz] = [x - k.a[0], z - k.a[1]];
  return { s: dx * k.u[0] + dz * k.u[1], w: -dx * k.u[1] + dz * k.u[0] };
};
/** Is a point on a bridge's deck (`m` in from its edges and its ends) */
export const onBridge = (x: number, z: number, m = 0) =>
  BRIDGES.some((k) => {
    const { s, w } = onSpan(k, x, z);
    return Math.abs(w) < k.half - m && s > m && s < k.len - m;
  });
/** A bridge's deck over the lawn's slab under a point (its low arch), or null off them */
export function bridgeY(x: number, z: number): number | null {
  for (const k of BRIDGES) {
    const { s, w } = onSpan(k, x, z);
    if (Math.abs(w) < k.half && s >= 0 && s <= k.len) return k.rise * Math.sin((Math.PI * s) / k.len);
  }
  return null;
}
/**
 * The lake loop as walked: the loop's line, but across each bridge where it went round the arm and the inlet; and the
 * stretches it went round them by, walks of their own (`arm-walk`, `inlet-walk`), from one bridge's end to the other
 */
function routeOver(spans: ReturnType<typeof bridgeOver>[]) {
  const n = LOOP_LINE.length;
  const cut: { from: number; to: number; span: ReturnType<typeof bridgeOver>; round: Pt[] }[] = [];
  for (const span of spans) {
    const [i, j] = span.segs;
    // (the stretch round the arm: whichever way from one landing to the other passes its tip)
    const tip = (span.id === 'iron' ? LAKE_ARM : LAKE_INLET).line.at(-1)!;
    const way = (from: number, to: number) => {
      const out: Pt[] = [];
      for (let k = (from + 1) % n; k !== (to + 1) % n; k = (k + 1) % n) out.push(LOOP_LINE[k]);
      return out;
    };
    const near = (pts: Pt[]) => Math.min(...pts.map((q) => Math.hypot(q[0] - tip[0], q[1] - tip[1])));
    const [w1, w2] = [way(i, j), way(j, i)];
    cut.push(near(w1) < near(w2) ? { from: i, to: j, span, round: w1 } : { from: j, to: i, span, round: w2 });
  }
  const skip = new Set<number>();
  for (const c of cut) for (let k = (c.from + 1) % n; k !== (c.to + 1) % n; k = (k + 1) % n) skip.add(k);
  const loop: Pt[] = [];
  for (let k = 0; k < n; k++) {
    if (skip.has(k)) continue;
    loop.push(LOOP_LINE[k]);
    const c = cut.find((q) => q.from === k);
    if (!c) continue;
    // (across the bridge, a point a metre, from the landing at this end to the other)
    const { a, b } = c.span;
    const [p, q] = Math.hypot(a[0] - LOOP_LINE[k][0], a[1] - LOOP_LINE[k][1]) < Math.hypot(b[0] - LOOP_LINE[k][0], b[1] - LOOP_LINE[k][1]) ? [a, b] : [b, a];
    const m = Math.ceil(c.span.len);
    for (let t = 0; t <= m; t++) loop.push([p[0] + ((q[0] - p[0]) * t) / m, p[1] + ((q[1] - p[1]) * t) / m]);
  }
  const ends = (c: (typeof cut)[number]): Pt[] => {
    const { a, b } = c.span;
    const first = c.round[0];
    const [p, q] = Math.hypot(a[0] - first[0], a[1] - first[1]) < Math.hypot(b[0] - first[0], b[1] - first[1]) ? [a, b] : [b, a];
    return [p, ...c.round, q];
  };
  return { loop, arm: ends(cut[0]), inlet: ends(cut[1]) };
}
/** A line alongside the lake loop's centre, `d` off it (out from the water positive): its people's lanes, over the bridges */
export const loopLine = (d: number, n = 240): Pt[] => resample(offset(ROUTE.loop, d), n);
/** A line alongside the ring walk's centre, `d` off it (out towards the park's edge positive): its people's lanes */
export const ringLine = (d: number, n = 360): Pt[] => resample(offset(RING_WALK, d), n);
const toLoop = (p: Pt): Pt => LOOP_LINE.reduce((b, q) => (Math.hypot(q[0] - p[0], q[1] - p[1]) < Math.hypot(b[0] - p[0], b[1] - p[1]) ? q : b));
/** The lake loop's west side where it crosses a line (z): for a walk straight across to it */
const loopWestAt = (z: number): Pt => {
  let best: Pt = toLoop([LAKE_C[0] - 40, z]);
  for (const p of lakeLine(LOOP_OUT, 720)) if (p[0] < LAKE_C[0] && Math.abs(p[1] - z) < Math.abs(best[1] - z)) best = p;
  return [best[0], z];
};
/** The formal garden's cross walk (the north side's stage 3): its line (z), from the ring walk's west side through the garden to the Great Lawn's walk */
export const GARDEN_Z = (GARDEN_SITE[1] + GARDEN_SITE[3]) / 2;

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
/** Where the ring walk crosses an east-west line on its west side (x) */
const ringWestX = (z: number) => {
  let x = Infinity;
  for (let i = 0; i < RING_WALK.length; i++) {
    const [a, b] = [RING_WALK[i], RING_WALK[(i + 1) % RING_WALK.length]];
    if ((a[1] - z) * (b[1] - z) <= 0 && a[1] !== b[1]) x = Math.min(x, a[0] + ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]));
  }
  return x;
};

export const PATHS: ParkPath[] = [
  { id: 'ring', pts: RING_WALK, half: 1.2, loop: true },
  { id: 'loop', pts: ROUTE.loop, half: 1.1, loop: true },
  // (the walks round the arm and the inlet, from one end of its bridge to the other: docs/westlake-plan.md Phase 3a)
  { id: 'arm-walk', pts: ROUTE.arm, half: 1.1 },
  { id: 'inlet-walk', pts: ROUTE.inlet, half: 1.1 },
  // The Mall: its promenade from City Hall's back door (the civic quarter, civic.ts) to the formal garden, then on
  // through the garden's site to the north gate
  // (the promenade laid over the Mall, its rounded ends short of City Hall's lot and the garden's hedges)
  { id: 'mall', pts: [[MALL.x, HALL.rear[1]], [MALL.x, Z0]], half: MALL.half },
  { id: 'promenade', pts: [[MALL.x, HALL.rear[1] - PROMENADE_HALF - 1.1], [MALL.x, GARDEN_SITE[3] + PROMENADE_HALF + 0.5]], half: PROMENADE_HALF },
  // The civic quarter's walks: from the square up City Hall's west side and round behind it to the Mall, and from
  // the square's north-east corner to the lake loop
  { id: 'civic-w', pts: WEST_WALK, half: WALK_HALF },
  { id: 'civic-e', pts: [EAST_WALK_FROM, toLoop(EAST_WALK_FROM)], half: WALK_HALF },
  // From the Mall behind City Hall across to the lake, and the lake's south and east gates in to the loop
  { id: 'mall-lake', pts: [[MALL.x, BEHIND_Z], loopWestAt(BEHIND_Z)], half: 1.1 },
  { id: 'lake-s', pts: smooth([[-96, ZS], [-96, -16], [-92, -24], toLoop([-92, -26])]), half: 1.1 },
  { id: 'lake-se', pts: smooth([[-58, ZS], [-60, -15], toLoop([-62, -19])]), half: 1.1 },
  { id: 'lake-e', pts: smooth([[X1, -28], [-50, -30], [-56, -36], toLoop([-58, -40])]), half: 1.1 },
  { id: 'lake-ne', pts: smooth([[X1, -78], [-54, -76], [-62, -70], toLoop([-66, -66])]), half: 1.1 },
  // The Great Lawn's walk round it (docs/westlake-plan.md Phase 2), and the walks to it: from the promenade by the
  // garden's south-east corner, up from the ring walk's north side, down to the lake by the boathouse
  { id: 'lawn', pts: LAWN_LINE, half: 1.1, loop: true },
  { id: 'mall-lawn', pts: smooth([[MALL.x + PROMENADE_HALF - 0.3, -79.5], [-122, -80.5], [-112, -83], [-104.5, -90.5], lawnAt(-1, -104)]), half: 1.1 },
  { id: 'lawn-n', pts: [lawnAt(0, LAWN.c[1] - LAWN.rz), [LAWN.c[0], ringNorthZ(LAWN.c[0])]], half: 1.1 },
  { id: 'lawn-lake', pts: smooth([lawnAt(0, LAWN.c[1] + LAWN.rz), [-97, -89], [-100.5, -83], toLoop([-101, -78])]), half: 1.1 },
  // The ramble: narrow paths winding through the woods and among the rocks north-east of the lake, from the east
  // gate, the ring walk's north side and the arm's tip to the lawn and the lake
  { id: 'ramble-e', pts: smooth([[X1, -128], [-52, -127.5], [-60, -131], [-67, -126], [-73, -120], lawnAt(1, -117)]), half: 0.9 },
  { id: 'ramble-n', pts: smooth([[-66, ringNorthZ(-66)], [-68, -146], [-63.5, -139], [-58.5, -132], [-62, -123], [-58.5, -115], toLoop([-60, -104])]), half: 0.9 },
  { id: 'ramble-w', pts: smooth([toLoop([-68, -108]), [-72.5, -111.5], lawnAt(1, -108)]), half: 0.9 },
  // The garden's cross walk, from the ring walk through the garden (across the Mall) to the Great Lawn's walk
  { id: 'garden-cross', pts: [[ringWestX(GARDEN_Z), GARDEN_Z], lawnAt(-1, GARDEN_Z)], half: 1.2 },
  // (the west one on out of the garden's south wall down to the civic quarter's west walk, the east one to the walk
  // from the promenade to the Great Lawn: neither a dead end, docs/westlake-plan.md Phase 2)
  { id: 'garden-w', pts: [[GARDEN_XS[0], ringNorthZ(GARDEN_XS[0])], [GARDEN_XS[0], GARDEN_SITE[3] - 0.5], ...smooth([[GARDEN_XS[0], GARDEN_SITE[3] + 2], [GARDEN_XS[0] + 0.5, -76], [WEST_WALK_X, BEHIND_Z]])], half: 1.1 },
  { id: 'garden-e', pts: [[GARDEN_XS[1], ringNorthZ(GARDEN_XS[1])], [GARDEN_XS[1], -80.5]], half: 1.1 },
  // The south-west gate up to the ring walk
  { id: 'sw', pts: [[SW_GATE_X, ZS], [SW_GATE_X, ZS - RING_IN]], half: 1.1 },
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
/** Each path's centre line's bounds (a point further than its half and `m` out from them is off it: not measured) */
const PATH_BOX = new Map(PATHS.map((q) => [q, [Math.min(...q.pts.map((p) => p[0])), Math.min(...q.pts.map((p) => p[1])), Math.max(...q.pts.map((p) => p[0])), Math.max(...q.pts.map((p) => p[1]))] as Rect]));
/** Is a point on a path (`m` more either side) */
export const onPath = (p: Pt, m = 0) =>
  PATHS.some((q) => {
    const b = PATH_BOX.get(q)!;
    const e = q.half + m;
    return p[0] > b[0] - e && p[0] < b[2] + e && p[1] > b[1] - e && p[1] < b[3] + e && distToLine(q.pts, p, q.loop) < e;
  });

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

/* ---------- Rock outcrops (docs/westlake-plan.md Phase 1) ---------- */

export interface Rock {
  x: number;
  z: number;
  /** Its footprint's half size and its height over the lawn, its turn (radians), its shape's seed */
  r: number;
  h: number;
  ry: number;
  seed: number;
}
/**
 * Outcrops of the park's grey stone in low layered clusters: on the knolls in the woods north and east of the lake,
 * either bank of the arm, round the meadow's edge and at the rocky point on the south-west shore (by the water, inside
 * the loop). Each clear of the paths, the water's rim, the civic quarter, the garden's site, the boathouse and jetty,
 * the terraces and the gates; solid (`ROCK_SOLIDS`), and the trees, picnics and planters keep off them (`nearRock()`).
 */
export const ROCKS: Rock[] = baked('park-rocks', BUILT ? undefined : () => {
  const r = rng(4402);
  const out: Rock[] = [];
  // (the knolls' clusters, then the point's: smaller stones by the water, between it and the loop)
  const clusters: [number, number, number, boolean][] = [
    [-58, -112, 9, false],
    [-66, -106, 7, false],
    [-56, -96, 6, false],
    [-74, -126, 7, false],
    [-88, -96, 7, false],
    [-110, -94, 5, false],
    [-80, -138, 6, false],
    [-54, -140, 6, false],
    // (on the point's flanks: its tip is the overlook's, Phase 3c)
    ...[136, 164].map((deg) => [...lakeAt((deg * Math.PI) / 180, 1.5), 5, true] as [number, number, number, boolean]),
  ];
  for (const [cx, cz, n, shore] of clusters)
    for (let k = 0; k < n; k++) {
      const big = k === 0;
      const rr = shore ? 0.45 + r() * 0.4 : big ? 1.4 + r() * 0.6 : 0.55 + r() * 0.75;
      const a = r() * Math.PI * 2;
      const d = big ? 0 : (shore ? 0.6 : 1.2) + r() * (shore ? 0.9 : 2.4);
      const [x, z] = [cx + Math.cos(a) * d, cz + Math.sin(a) * d];
      const p: Pt = [x, z];
      // (by the water the stones come to its rim and to the loop's edge)
      const [wet, walk] = shore ? [rr * 0.5 + RIM.w + 0.1, rr * 0.7 + 0.2] : [rr + 0.5, rr + 0.5];
      if (!inPark(p, 2) || onLawn(p, -1) || onGrand(x, z, -2) || onOverlook(x, z, rr + 0.3) || onPath(p, walk) || inLake(x, z, wet) || inCivic(p, 2) || inRect(GARDEN_SITE, p, 2) || nearTerrace(p, rr + 0.5)) continue;
      if (inRect(BOATHOUSE.rect, p, rr + 1.5) || inRect([JETTY.x - JETTY.half, JETTY.z0, JETTY.x + JETTY.half, JETTY.z1], p, rr + 1.2)) continue;
      if (GATES.some((g) => Math.hypot(x - g.at[0], z - g.at[1]) < 5)) continue;
      // (a rock may lean on its neighbour, not sit inside it)
      if (out.some((o) => Math.hypot(o.x - x, o.z - z) < (o.r + rr) * 0.75)) continue;
      out.push({ x, z, r: rr, h: (big ? 0.9 : 0.4) + r() * (big ? 0.6 : 0.5), ry: r() * Math.PI, seed: Math.floor(r() * 1e6) });
    }
  return out;
});
/** Is a point within `m` of a rock's footprint */
export const nearRock = (p: Pt, m = 0) => ROCKS.some((k) => Math.hypot(p[0] - k.x, p[1] - k.z) < k.r + m);
/** The outcrops as solids: a box round each rock's middle, up to its top */
export const ROCK_SOLIDS: [number, number, number, number, number][] = ROCKS.map((k) => [k.x - k.r * 0.75, k.z - k.r * 0.75, k.x + k.r * 0.75, k.z + k.r * 0.75, k.h]);

export const treeFree = (p: Pt) =>
  !onOverlook(p[0], p[1], 1.5) &&
  !onGrand(p[0], p[1], -2.5) &&
  !nearRock(p, 1.2) &&
  !onLawn(p, -1.5) &&
  inPark(p, 1.6) && !inCivic(p, 2.2) && !onPath(p, 1.4) && !inLake(p[0], p[1], LOOP_OUT + 2.6) && !inRect(GARDEN_SITE, p, 3) && !nearTerrace(p, 1.5) && !inRect(BOATHOUSE.rect, p, 2.2) && GATES.every((g) => Math.hypot(p[0] - g.at[0], p[1] - g.at[1]) > 4);

/* (the park's trees are parktrees.ts's: out of the boot, docs/westlake-plan.md Phase 5) */

/** Lamps along the paths: [x, z, ry] (the arm reaching over the path: ry turns +x towards it) */
export const PARK_LAMPS: [number, number, number][] = baked('park-lamps', BUILT ? undefined : () => {
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
        if (!inLake(x, z, 1.2) && inPark([x, z], 0.3)) out.push([x, z, Math.atan2(nz, -nx)]);
      }
      carry = (((carry - len) % every) + every) % every;
    }
  };
  for (const q of PATHS) {
    if (q.id === 'mall' || q.id === 'promenade') along(q, 9, true);
    else if (q.id === 'loop') along(q, 13, false);
    else if (q.id === 'ring') along(q, 18, false);
    else along(q, 15, false);
  }
  // Not on another path where paths meet, nor two on top of each other, nor by the boathouse and its jetty
  // (and none in the formal garden, which has its own, nor on a terrace)
  const clear = (l: [number, number, number]) => !onOverlook(l[0], l[1], 0.6) && !onGrand(l[0], l[1], -0.8) && !onBridge(l[0], l[1], -0.8) && !nearRock([l[0], l[1]], 0.8) && !inCivic([l[0], l[1]], 0.6) && !inRect(GARDEN_SITE, [l[0], l[1]], 1) && !nearTerrace([l[0], l[1]], 0.6) && !inRect(BOATHOUSE.rect, [l[0], l[1]], 0.8) && !inRect([JETTY.x - JETTY.half, JETTY.z0, JETTY.x + JETTY.half, JETTY.z1], [l[0], l[1]], 1.2);
  return out.filter((l, i) => clear(l) && !onPath([l[0], l[1]], 0.25) && out.slice(0, i).every((o) => Math.hypot(o[0] - l[0], o[1] - l[1]) > 3));
});

/** Benches along the lake loop (facing the water) and the Mall (facing across it): where, and which way the sitter faces (ry, +z turned) */
export const BENCHES: { at: Pt; ry: number }[] = baked('park-benches', BUILT ? undefined : () => {
  const out: { at: Pt; ry: number }[] = [];
  // Round the lake, evenly along the loop on its water side, each facing the nearest water
  const side = lakeLine(LOOP_OUT - 1.1 - 0.55, 22);
  for (const at of side) {
    const w = LAKE_POLY.reduce((b, p) => (Math.hypot(p[0] - at[0], p[1] - at[1]) < Math.hypot(b[0] - at[0], b[1] - at[1]) ? p : b));
    const [dx, dz] = [w[0] - at[0], w[1] - at[1]];
    out.push({ at, ry: Math.atan2(dx, dz) });
  }
  // Along the Mall, either side, facing across it
  // (the promenade's: along its edges between the avenue's trees, a pair every few trees, facing across it)
  for (let z = HALL.rear[1] - 6.5; z > GARDEN_SITE[3] + 3; z -= 5)
    for (const side of [-1, 1]) out.push({ at: [MALL.x + side * (PROMENADE_HALF + 0.45), z], ry: side > 0 ? -Math.PI / 2 : Math.PI / 2 });
  // (none where another path comes in, nor on a terrace)
  return out.filter((b) => !onOverlook(b.at[0], b.at[1], 0.5) && !nearTerrace(b.at, 0.8) && !inCivic(b.at, 0.6) && !nearRock(b.at, 1) && !onGrand(b.at[0], b.at[1], -0.8)).filter((b) => Math.abs(b.at[0] - JETTY.x) > JETTY.half + 1.6 || b.at[1] > JETTY.z1 + 1 || b.at[1] < JETTY.z0 - 1.5).filter((b) => PATHS.every((q) => q.id === 'loop' || q.id === 'mall' || q.id === 'promenade' || distToLine(q.pts, b.at, q.loop) > q.half + 0.8));
});

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
/** The overlook's balustrade as cells along it, waist high */
const OVERLOOK_SOLIDS: [number, number, number, number, number][] = OVERLOOK_RAIL.slice(1).map((p, i) => {
  const q = OVERLOOK_RAIL[i];
  return [Math.min(p[0], q[0]) - 0.15, Math.min(p[1], q[1]) - 0.15, Math.max(p[0], q[0]) + 0.15, Math.max(p[1], q[1]) + 0.15, 0.15 + 1.0];
});
export const WESTLAKE_SOLIDS = [...GATE_PIERS, BOATHOUSE_SOLID, ...ROCK_SOLIDS, ...GRAND_SOLIDS, ...OVERLOOK_SOLIDS];

/** The lake as walls for cars (drive-sim.ts): strips across it, a tile deep, each its width there */
export const LAKE_WALLS: [number, number, number, number, number][] = (() => {
  const out: [number, number, number, number, number][] = [];
  const R = Math.ceil(LAKE_REACH) + 1;
  for (let z = LAKE_C[1] - R; z < LAKE_C[1] + R; z += 1) {
    let lo = Infinity;
    let hi = -Infinity;
    // (its widest across the strip: sampled at its edges and between)
    for (let x = LAKE_C[0] - R; x <= LAKE_C[0] + R; x += 0.25)
      for (const dz of [0, 0.25, 0.5, 0.75, 1])
        if (inLake(x, z + dz)) {
          lo = Math.min(lo, x);
          hi = Math.max(hi, x);
        }
    if (hi > lo) out.push([lo - 0.3, z, hi + 0.3, z + 1, 2]);
  }
  return out;
})();
