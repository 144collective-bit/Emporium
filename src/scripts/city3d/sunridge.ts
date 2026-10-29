/**
 * Sunridge, the suburb (docs/suburb-plan.md Phase 1, the owner's call: a middle-class suburb of Southwest stucco tract
 * houses on the north-east land inside the ring highway, after an aerial of an Arizona suburb). DOM-free: the street
 * plan (streetplan.ts `cityPlan()`), traffic, walking, the world map, the lamps at the boot and the drawing
 * (sunridge3d.ts, a district loaded as you approach) read it; the lots on its blocks are sunridgelots.ts (the chunk's).
 *
 * - **The land** (`LAND`, `SUNRIDGE_RECT`, `inSunridge()`): east of Palm Court and the Parkway's bend, north of the
 *   north ring avenue (ew0), clear of the ring highway's north and east sides and its north-east bend by enough for the
 *   raised highway's ramps (docs/highway-plan.md). Its edge is its blocks' outer edge: the perimeter wall stands on it.
 * - **Sunridge Parkway** (`PARKWAY_LOOP`): the collector, a soft loop through the land a lot's depth in from its edge,
 *   in from the avenue at two entrances (`ENTRIES`: the main one with a planted median and lights, the other plain).
 * - **Mesa Drive** (`MESA`): across the loop from west to east, gently bending; the amenities' land south of it
 *   (`ZONES`: the community centre by the main entrance, the park, the school), the houses north of it round three
 *   cul-de-sacs off it (`COURTS`, each ending in a turning circle, `BULB`).
 * - **The blocks** (`SUN_BLOCKS`): every piece of land the streets leave, worked out from their lines (`faces()`: the
 *   streets and the land's edge as a graph, each face's outline the streets' kerb lines (their asphalt and sidewalk
 *   off) and the land's edge, round the turning circles), with the runs of the land's edge on each (`walls`: the
 *   perimeter wall) and of each street (`fronts`: where the lots face).
 * - **The footpath** from Palm Court's way out east (`PATH`, mall.ts `EAST_GAP`) through the lots to the loop.
 * - **Lamps** (`SUN_LAMPS`) along both sidewalks of every street.
 *
 * Names are made up. Written in fixed world numbers (north of the river: no `SOUTH_SHIFT` / `WIDEN`).
 */
import { EW_ROADS, LANE, WALK_W } from './layout';
import { curve } from './crestmont';

export type Pt = [number, number];
export type Rect = [number, number, number, number];

export const SUN_NAME = 'Sunridge';

/** The north ring avenue (ew0), which the land fronts */
const AVENUE = EW_ROADS[0];
/** The land's south edge: the back of the avenue's north sidewalk */
export const SOUTH_EDGE = AVENUE.c - AVENUE.half - WALK_W;
/** The land's other edges: west (clear of Palm Court, mall.ts `COURT`), north and east (clear of the highway) */
export const WEST_EDGE = 106;
export const NORTH_EDGE = -150;
export const EAST_EDGE = 255;
/** Its south-west corner cut along the Parkway's bend, clear of its outer kerb (outer.ts `BEND_KERBS`) */
const SW: [Pt, Pt] = [
  [WEST_EDGE, -44],
  [128, SOUTH_EDGE],
];
/** Its north-east corner rounded, its centre the highway's bend's (highway.ts: corner radius 70) */
const NE = { c: [205, -100] as Pt, r: 50 };

/** The land's outline, wound as the street plan's squares (down its west side, along the south, up the east) */
export const LAND: Pt[] = (() => {
  const out: Pt[] = [[WEST_EDGE, NORTH_EDGE], SW[0], SW[1], [EAST_EDGE, SOUTH_EDGE], [EAST_EDGE, NE.c[1]]];
  for (let k = 1; k < 12; k++) {
    const a = (k / 12) * (Math.PI / 2);
    out.push([NE.c[0] + Math.cos(a) * NE.r, NE.c[1] - Math.sin(a) * NE.r]);
  }
  out.push([NE.c[0], NORTH_EDGE]);
  return out;
})();
const xs = LAND.map((p) => p[0]);
const zs = LAND.map((p) => p[1]);
/** The box round the land (the outskirts' trees keep off; the drawing's district) */
export const SUNRIDGE_RECT: Rect = [Math.min(...xs) - WALK_W, Math.min(...zs) - WALK_W, Math.max(...xs) + WALK_W, AVENUE.c];

/** Is a point inside an outline (even-odd) */
export function inside(poly: Pt[], [x, z]: Pt) {
  let o = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) o = !o;
  }
  return o;
}
/** The distance from a point to a line of points (closed: back to its first) */
export function distTo(pts: Pt[], [x, z]: Pt, closed = false) {
  let best = Infinity;
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const [a, b] = [pts[i], pts[(i + 1) % pts.length]];
    const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz || 1)));
    best = Math.min(best, Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t));
  }
  return best;
}
/** In Sunridge's land (padded `m`, its sidewalk's width by default) */
export const inSunridge = (x: number, z: number, m = WALK_W) => x > SUNRIDGE_RECT[0] - m && x < SUNRIDGE_RECT[2] + m && z > SUNRIDGE_RECT[1] - m && z < SUNRIDGE_RECT[3] + m && (inside(LAND, [x, z]) || distTo(LAND, [x, z], true) < m);

/* ---------- The streets ---------- */

/** A smooth closed line through control points (Catmull-Rom, wrapping round), a point every `step` or so */
function loopCurve(ctrl: Pt[], step = 1.5): Pt[] {
  const n = ctrl.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [ctrl[(i + n - 1) % n], ctrl[i], ctrl[(i + 1) % n], ctrl[(i + 2) % n]];
    const m = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < m; k++) {
      const t = k / m;
      const [t2, t3] = [t * t, t * t * t];
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push([...out[0]]);
  return out;
}
const nearest = (pts: Pt[], p: Pt) => {
  let best = 0;
  for (let i = 1; i < pts.length; i++) if (Math.hypot(pts[i][0] - p[0], pts[i][1] - p[1]) < Math.hypot(pts[best][0] - p[0], pts[best][1] - p[1])) best = i;
  return best;
};

/** Sunridge's streets' asphalt: one lane each way */
export const HALF = LANE;
/** The main entrance's planted median, its lane each way either side */
export const ENTRY_MEDIAN = 2.4;
/** A cul-de-sac's turning circle: the asphalt's radius */
export const BULB = 4.6;
/** The lots' depth (sunridgelots.ts), and so the loop's way in from the land's edge (a lot and the loop's half and sidewalk) */
export const LOT_D = 13;

/** Sunridge Parkway, the loop (its last point its first) */
export const PARKWAY_LOOP: Pt[] = loopCurve([
  [122, -120],
  [130, -133],
  [150, -133.5],
  [175, -130.5],
  [203, -133.5],
  [227, -123],
  [238.5, -100],
  [237.5, -75],
  [235, -53],
  [235.5, -35],
  [222, -27],
  [195, -27],
  [168, -29],
  [145, -26.5],
  [132.5, -37],
  [122.5, -60],
  [122.5, -90],
]);

export interface SunStreet {
  id: string;
  name: string;
  pts: Pt[];
  half: number;
  median?: number;
  loop?: boolean;
  /** A cul-de-sac: its last point is its turning circle's middle */
  bulb?: boolean;
}

/** The two ways in from the avenue: north from its centre line to the loop */
const entry = (id: string, name: string, x: number, median?: number): SunStreet => {
  // (the loop's point nearest, on its south side)
  const j = nearest(PARKWAY_LOOP.slice(0, -1), [x, -27]);
  const top = PARKWAY_LOOP[j];
  return { id, name, pts: [[top[0], AVENUE.c], top], half: HALF + (median ? median / 2 : 0), ...(median ? { median } : {}) };
};
export const ENTRIES: SunStreet[] = [entry('sun-entry-w', 'Sunridge Parkway', 150, ENTRY_MEDIAN), entry('sun-entry-e', 'Desert Bloom Way', 228)];

/** Mesa Drive across the loop, its ends on it */
export const MESA: SunStreet = (() => {
  const loop = PARKWAY_LOOP.slice(0, -1);
  const [w, e] = [loop[nearest(loop, [122.5, -78])], loop[nearest(loop, [237.5, -82])]];
  const pts = curve([w, [150, -74], [180, -80], [210, -86], e], 1.5);
  pts[0] = w;
  pts[pts.length - 1] = e;
  return { id: 'sun-mesa', name: 'Mesa Drive', pts, half: HALF };
})();

/** The cul-de-sacs north off Mesa Drive: where they leave it (x), how far up, and a bend */
const COURT_SPECS: { id: string; name: string; x: number; up: number; bend: number }[] = [
  { id: 'sun-court-0', name: 'Saguaro Court', x: 146, up: 26, bend: -3 },
  { id: 'sun-court-1', name: 'Ocotillo Court', x: 181, up: 25, bend: 3 },
  { id: 'sun-court-2', name: 'Palo Verde Court', x: 215, up: 19, bend: -2 },
];
export const COURTS: SunStreet[] = COURT_SPECS.map((c) => {
  const j = nearest(MESA.pts, [c.x, -80]);
  const a = MESA.pts[j];
  const end: Pt = [a[0] + c.bend, a[1] - c.up];
  const pts = curve([a, [a[0] + c.bend * 0.2, a[1] - c.up * 0.5], end], 1.5);
  pts[0] = a;
  return { id: c.id, name: c.name, pts, half: HALF, bulb: true };
});

/** Every street Sunridge adds to the street plan */
export const SUN_STREETS: SunStreet[] = [{ id: 'sun-parkway', name: 'Sunridge Parkway', pts: PARKWAY_LOOP, half: HALF, loop: true }, ...ENTRIES, MESA, ...COURTS];

export interface SunCrossing {
  id: string;
  at: Pt;
  streets: string[];
  lights: boolean;
}
export const SUN_CROSSINGS: SunCrossing[] = [
  // The entrances on the avenue (the main one lit) and on the loop
  ...ENTRIES.flatMap((e, i): SunCrossing[] => [
    { id: `${e.id}-ew0`, at: e.pts[0], streets: [e.id, 'ew0'], lights: i === 0 },
    { id: `${e.id}-loop`, at: e.pts[1], streets: [e.id, 'sun-parkway'], lights: false },
  ]),
  { id: 'sun-mesa-w', at: MESA.pts[0], streets: ['sun-mesa', 'sun-parkway'], lights: false },
  { id: 'sun-mesa-e', at: MESA.pts[MESA.pts.length - 1], streets: ['sun-mesa', 'sun-parkway'], lights: false },
  ...COURTS.map((c): SunCrossing => ({ id: `${c.id}-mesa`, at: c.pts[0], streets: [c.id, 'sun-mesa'], lights: false })),
];

/* ---------- The land kept off the lots ---------- */

/** The amenities' land south of Mesa Drive (built in Phase 4): the community centre by the main entrance, the park, the school */
export const ZONES: { id: 'club' | 'park' | 'school'; rect: Rect }[] = [
  { id: 'club', rect: [141, -57, 172, -26] },
  { id: 'park', rect: [172, -62, 200, -26] },
  { id: 'school', rect: [200, -64, 240, -26] },
];
/** The footpath from Palm Court's way out east (mall.ts `EAST_GAP`, z -115 to -109) through the lots to the loop */
export const PATH: Rect = [WEST_EDGE - WALK_W, -113.6, 121, -110.4];

/* ---------- The blocks ---------- */

/** A run of a block's edge: a street's kerb line (the lots face it) or the land's edge (the perimeter wall) */
export interface Run {
  pts: Pt[];
  /** The street it fronts (none: the land's edge) */
  street?: string;
}
export interface SunBlock {
  id: string;
  /** Its outline inside the sidewalk, wound as the street plan's squares */
  poly: Pt[];
  /** Its edge in runs, in order round it */
  runs: Run[];
}

const area = (poly: Pt[]) => {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [p, q] = [poly[i], poly[(i + 1) % poly.length]];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
};
/** A line moved `d` to its right (as streetplan.ts `offsetLine()`) */
function shift(pts: Pt[], d: number): Pt[] {
  const side = (a: Pt, b: Pt): Pt => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
  };
  return pts.map((p, i) => {
    let n: Pt;
    if (i === 0) n = side(pts[0], pts[1]);
    else if (i === pts.length - 1) n = side(pts[i - 1], pts[i]);
    else {
      const [n0, n1] = [side(pts[i - 1], pts[i]), side(pts[i], pts[i + 1])];
      const m: Pt = [n0[0] + n1[0], n0[1] + n1[1]];
      const ml = Math.hypot(m[0], m[1]) || 1;
      const k = 1 / Math.max(0.3, (m[0] * n0[0] + m[1] * n0[1]) / ml);
      n = [(m[0] / ml) * k, (m[1] / ml) * k];
    }
    return [p[0] + n[0] * d, p[1] + n[1] * d];
  });
}
/** Where two segments cross (their params, 0-1 along each), if they do */
function cross(a: Pt, b: Pt, c: Pt, d: Pt): [number, number] | null {
  const [rx, rz, sx, sz] = [b[0] - a[0], b[1] - a[1], d[0] - c[0], d[1] - c[1]];
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((c[0] - a[0]) * sz - (c[1] - a[1]) * sx) / den;
  const u = ((c[0] - a[0]) * rz - (c[1] - a[1]) * rx) / den;
  return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9 ? [t, u] : null;
}
/** A point along a line at a param (segment index + fraction) */
const at = (pts: Pt[], s: number): Pt => {
  const i = Math.min(pts.length - 2, Math.max(0, Math.floor(s)));
  const f = s - i;
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f];
};
/** A line's points from param s0 to s1 */
const cut = (pts: Pt[], s0: number, s1: number): Pt[] => {
  const out: Pt[] = [at(pts, s0)];
  for (let k = Math.floor(s0) + 1; k < s1 - 1e-9; k++) if (k > s0 + 1e-9) out.push(pts[k]);
  out.push(at(pts, s1));
  return out;
};

/**
 * The blocks, worked out from the streets' lines and the land's edge: those lines as a graph (nodes where they meet,
 * the turning circles as dead ends), each face of it traced (at each node turning to the next line round), and each
 * face's outline made of its lines moved in by their asphalt and sidewalk (the land's edge not at all), joined where
 * they cross and round a turning circle at its kerb
 */
function faces(): SunBlock[] {
  const nodes: Pt[] = [];
  const node = (p: Pt) => {
    const k = nodes.findIndex((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-6);
    return k >= 0 ? k : nodes.push(p) - 1;
  };
  interface Edge {
    a: number;
    b: number;
    pts: Pt[];
    w: number;
    street?: string;
  }
  const edges: Edge[] = [];
  const bulbs = new Map<number, number>();
  /** A line cut into edges at the nodes on it (its own points) */
  const addLine = (pts: Pt[], w: number, street: string | undefined, closed: boolean) => {
    const P = closed ? pts.slice(0, -1) : pts;
    const cuts = P.map((p, i) => (nodes.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-6) || (!closed && (i === 0 || i === P.length - 1)) ? i : -1)).filter((i) => i >= 0);
    if (closed) {
      for (let k = 0; k < cuts.length; k++) {
        const [i, j] = [cuts[k], cuts[(k + 1) % cuts.length]];
        const run: Pt[] = [];
        for (let m = i; ; m = (m + 1) % P.length) {
          run.push(P[m]);
          if (m === j && run.length > 1) break;
        }
        edges.push({ a: node(P[i]), b: node(P[j]), pts: run, w, street });
      }
    } else for (let k = 1; k < cuts.length; k++) edges.push({ a: node(P[cuts[k - 1]]), b: node(P[cuts[k]]), pts: P.slice(cuts[k - 1], cuts[k] + 1), w, street });
  };
  // The nodes first: every crossing, the entrances' mouths on the land's edge, the turning circles
  for (const c of SUN_CROSSINGS) if (!c.streets.includes('ew0')) node(c.at);
  const mouths = ENTRIES.map((e): Pt => [e.pts[0][0], SOUTH_EDGE]);
  for (const m of mouths) node(m);
  for (const c of COURTS) bulbs.set(node(c.pts[c.pts.length - 1]), BULB);
  // The land's edge, the entrances' mouths put on its south side
  const edge: Pt[] = [];
  LAND.forEach((p, i) => {
    edge.push(p);
    if (i === 2) for (const m of [...mouths].sort((a, b) => a[0] - b[0])) edge.push(m);
  });
  edge.push([...edge[0]]);
  addLine(edge, 0, undefined, true);
  for (const s of SUN_STREETS) {
    const w = s.half + WALK_W;
    if (s.loop) addLine(s.pts, w, s.id, true);
    else if (s.id.startsWith('sun-entry')) addLine([[s.pts[0][0], SOUTH_EDGE], s.pts[1]], w, s.id, false);
    else addLine(s.pts, w, s.id, false);
  }
  // Half-edges: 2e runs a to b, 2e + 1 back; round each node in order of the way they leave it
  const H = edges.length * 2;
  const from = (h: number) => (h % 2 ? edges[h >> 1].b : edges[h >> 1].a);
  const line = (h: number) => (h % 2 ? [...edges[h >> 1].pts].reverse() : edges[h >> 1].pts);
  const out = new Map<number, number[]>();
  const ang = new Map<number, number>();
  for (let h = 0; h < H; h++) {
    const l = line(h);
    ang.set(h, Math.atan2(l[1][1] - l[0][1], l[1][0] - l[0][0]));
    if (!out.has(from(h))) out.set(from(h), []);
    out.get(from(h))!.push(h);
  }
  for (const list of out.values()) list.sort((p, q) => ang.get(p)! - ang.get(q)!);
  const next = (h: number) => {
    const t = h ^ 1;
    const list = out.get(from(t))!;
    return list[(list.indexOf(t) + list.length - 1) % list.length];
  };
  const seen = new Set<number>();
  const cycles: number[][] = [];
  for (let h = 0; h < H; h++) {
    if (seen.has(h)) continue;
    const cyc: number[] = [];
    for (let g = h; !seen.has(g); g = next(g)) {
      seen.add(g);
      cyc.push(g);
    }
    cycles.push(cyc);
  }
  // Each face's outline from its centre lines; the outside of the land (the biggest) left out
  const shapes = cycles.map((cyc) => ({ cyc, a: area(cyc.flatMap((h) => line(h).slice(0, -1))) }));
  const outside = shapes.reduce((p, q) => (Math.abs(q.a) > Math.abs(p.a) ? q : p));
  const blocks: SunBlock[] = [];
  for (const { cyc, a } of shapes) {
    if (cyc === outside.cyc) continue;
    // (the face on the left of travel when its area is negative: its inside is to the left, so the lines move left)
    const d = a < 0 ? -1 : 1;
    const offs = cyc.map((h) => {
      const w = edges[h >> 1].w;
      return w ? shift(line(h), d * w) : line(h);
    });
    const n = cyc.length;
    // Where each line meets the next: [end param on this one, start param on the next, the turning circle's arc between]
    const joins = cyc.map((h, i) => {
      const [P, Q] = [offs[i], offs[(i + 1) % n]];
      const v = nodes[edges[h >> 1][h % 2 ? 'a' : 'b']];
      if (cyc[(i + 1) % n] === (h ^ 1)) {
        // A dead end: round its turning circle's kerb
        const R = bulbs.get(edges[h >> 1][h % 2 ? 'a' : 'b'])! + WALK_W;
        const enter = (L: Pt[], rev: boolean) => {
          const idx = L.map((_, k) => k);
          if (rev) idx.reverse();
          for (let m = 1; m < idx.length; m++) {
            const [p, q] = [L[idx[m - 1]], L[idx[m]]];
            const [dp, dq] = [Math.hypot(p[0] - v[0], p[1] - v[1]), Math.hypot(q[0] - v[0], q[1] - v[1])];
            if (dp >= R && dq < R) {
              const f = (dp - R) / (dp - dq);
              return rev ? idx[m] + (1 - f) : idx[m - 1] + f;
            }
          }
          return rev ? 0 : L.length - 1;
        };
        const sP = enter(P, false);
        const sQ = enter(Q, true);
        const [pe, qs] = [at(P, sP), at(Q, sQ)];
        const a0 = Math.atan2(pe[1] - v[1], pe[0] - v[0]);
        const a1 = Math.atan2(qs[1] - v[1], qs[0] - v[0]);
        const l = line(h);
        const far = Math.atan2(l[l.length - 1][1] - l[l.length - 2][1], l[l.length - 1][0] - l[l.length - 2][0]);
        const tau = Math.PI * 2;
        const ccw = (((a1 - a0) % tau) + tau) % tau;
        const toFar = (((far - a0) % tau) + tau) % tau;
        const sweep = toFar < ccw ? ccw : ccw - tau;
        const steps = Math.ceil(Math.abs(sweep) / 0.2);
        const arc: Pt[] = [];
        for (let k = 1; k < steps; k++) arc.push([v[0] + Math.cos(a0 + (sweep * k) / steps) * R, v[1] + Math.sin(a0 + (sweep * k) / steps) * R]);
        return { s1: sP, s0: sQ, arc };
      }
      // Two lines crossing near the node: the crossing nearest it
      let best: { s1: number; s0: number; d: number } | null = null;
      for (let p = Math.max(0, P.length - 30); p < P.length - 1; p++)
        for (let q = 0; q < Math.min(Q.length - 1, 30); q++) {
          const c = cross(P[p], P[p + 1], Q[q], Q[q + 1]);
          if (!c) continue;
          const pt = at(P, p + c[0]);
          const dd = Math.hypot(pt[0] - v[0], pt[1] - v[1]);
          if (!best || dd < best.d) best = { s1: p + c[0], s0: q + c[1], d: dd };
        }
      if (best) return { s1: best.s1, s0: best.s0, arc: [] as Pt[] };
      // (the same line carried on through the node: joined end to start)
      return { s1: P.length - 1, s0: 0, arc: [] as Pt[] };
    });
    const runs: Run[] = [];
    const poly: Pt[] = [];
    cyc.forEach((h, i) => {
      const s0 = joins[(i + n - 1) % n].s0;
      const s1 = joins[i].s1;
      const pts = [...cut(offs[i], s0, s1), ...joins[i].arc];
      const street = edges[h >> 1].street;
      const prev = runs[runs.length - 1];
      // (a run carries on round a turning circle and through a node on the same street)
      if (prev && prev.street === street) prev.pts.push(...pts.slice(1));
      else runs.push({ pts, ...(street ? { street } : {}) });
    });
    // (the first and last runs are one where they're the same line)
    if (runs.length > 1 && runs[0].street === runs[runs.length - 1].street) {
      const last = runs.pop()!;
      runs[0].pts = [...last.pts, ...runs[0].pts.slice(1)];
    }
    for (const r of runs) for (const p of r.pts) if (!poly.length || Math.hypot(poly[poly.length - 1][0] - p[0], poly[poly.length - 1][1] - p[1]) > 0.05) poly.push(p);
    if (Math.hypot(poly[0][0] - poly[poly.length - 1][0], poly[0][1] - poly[poly.length - 1][1]) < 0.05) poly.pop();
    // (wound as the plan's squares: their area is negative)
    if (area(poly) > 0) {
      poly.reverse();
      runs.reverse();
      for (const r of runs) r.pts.reverse();
    }
    blocks.push({ id: `sun-${blocks.length}`, poly, runs });
  }
  return blocks;
}
export const SUN_BLOCKS: SunBlock[] = faces();

/* ---------- Lamps ---------- */

/** Lamps: x, z, the way the arm reaches, the ground's height (the sidewalk's top: world.ts SLAB) */
export const SUN_LAMPS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  const crossings = SUN_CROSSINGS.map((c) => c.at);
  for (const s of SUN_STREETS) {
    const step = 14;
    let next = s.loop ? 0 : 7;
    let run = 0;
    for (let i = 1; i < s.pts.length; i++) {
      const [a, b] = [s.pts[i - 1], s.pts[i]];
      const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (seg < 1e-6) continue;
      const [ux, uz] = [(b[0] - a[0]) / seg, (b[1] - a[1]) / seg];
      for (; next < run + seg; next += step) {
        const d = next - run;
        const p: Pt = [a[0] + ux * d, a[1] + uz * d];
        if (crossings.some((c) => Math.hypot(c[0] - p[0], c[1] - p[1]) < 8) || (s.bulb && Math.hypot(s.pts[s.pts.length - 1][0] - p[0], s.pts[s.pts.length - 1][1] - p[1]) < BULB + 2)) continue;
        for (const side of [-1, 1]) {
          // (right of travel is (-uz, ux))
          const [nx, nz] = [-uz * side, ux * side];
          const k = s.half + 0.45;
          out.push([p[0] + nx * k, p[1] + nz * k, Math.atan2(nz, -nx), 0.15]);
        }
      }
      run += seg;
    }
  }
  // (none in the path's way)
  return out.filter(([x, z]) => !(x > PATH[0] - 0.5 && x < PATH[2] + 0.5 && z > PATH[1] - 0.5 && z < PATH[3] + 0.5));
})();

/* ---------- The perimeter wall and the monuments ---------- */

/** The block wall round the land: in from its edge, thick, its top over the lots' ground (world.ts SLAB, 0.15) */
export const WALL = { in: 0.25, thick: 0.2, top: 1.2 } as const;
/** The monument walls either side of each entrance, along the avenue: how long (the main entrance's longer), how high, how deep, how far in */
export const MONUMENT = { len: [6, 4.5], top: [1.5, 1.25], deep: 0.55, in: 0.7 } as const;

/** Each monument: its entrance, the side (west -1, east 1), its box (x0, z0, x1, z1) and top */
export const MONUMENTS = ENTRIES.flatMap((e, i) =>
  [-1, 1].map((side) => {
    const x0 = e.pts[0][0] + side * (e.half + WALK_W + 0.6);
    const x1 = x0 + side * MONUMENT.len[i];
    const z1 = SOUTH_EDGE - MONUMENT.in;
    return { entry: e.id, side, rect: [Math.min(x0, x1), z1 - MONUMENT.deep, Math.max(x0, x1), z1] as Rect, top: MONUMENT.top[i] };
  })
);

/** Where the wall stops: the entrances' mouths with their monuments, and the footpath */
const wallGap = ([x, z]: Pt) =>
  ENTRIES.some((e, i) => z > SOUTH_EDGE - 2 && Math.abs(x - e.pts[0][0]) < e.half + WALK_W + 0.6 + MONUMENT.len[i] + 0.3) || (x > PATH[0] - 0.3 && x < PATH[2] && z > PATH[1] - 0.3 && z < PATH[3] + 0.3);

/** The wall's centre lines: each block's runs along the land's edge, moved in, cut at the gaps (a point every tile or less) */
export const WALL_RUNS: Pt[][] = (() => {
  const out: Pt[][] = [];
  for (const b of SUN_BLOCKS)
    for (const r of b.runs) {
      if (r.street) continue;
      // (the block's inside is left of its edge's way: a line moved right by minus `in`)
      const line = shift(r.pts, -WALL.in);
      let run: Pt[] = [];
      for (let i = 1; i < line.length; i++) {
        const [a, c] = [line[i - 1], line[i]];
        const n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1])));
        for (let k = i === 1 ? 0 : 1; k <= n; k++) {
          const p: Pt = [a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n];
          if (wallGap(p)) {
            if (run.length > 1) out.push(run);
            run = [];
          } else run.push(p);
        }
      }
      if (run.length > 1) out.push(run);
    }
  return out;
})();

type Box = [number, number, number, number, number];
/** What of Sunridge is solid (in `SOLIDS`): the wall (a box a straight, or a tile where it slants or curves) and the monuments */
export const SUN_SOLIDS: Box[] = (() => {
  const out: Box[] = [];
  const t = WALL.thick / 2;
  for (const run of WALL_RUNS) {
    let i = 0;
    while (i < run.length - 1) {
      let j = i + 1;
      const [a, b] = [run[i], run[j]];
      const ax = Math.abs(b[0] - a[0]) < 1e-6 ? 0 : Math.abs(b[1] - a[1]) < 1e-6 ? 1 : -1;
      // (straight along x or z: as far as it goes)
      if (ax >= 0) while (j + 1 < run.length && Math.abs(run[j + 1][ax === 0 ? 0 : 1] - a[ax === 0 ? 0 : 1]) < 1e-6) j++;
      const c = run[j];
      out.push([Math.min(a[0], c[0]) - t, Math.min(a[1], c[1]) - t, Math.max(a[0], c[0]) + t, Math.max(a[1], c[1]) + t, WALL.top]);
      i = j;
    }
  }
  for (const m of MONUMENTS) out.push([...m.rect, 0.15 + m.top]);
  return out;
})();
