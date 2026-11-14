/*
 * Streets that follow the land, as a graph (docs/south-plan.md Phase 1; DOM-free, tested in tests/south.test.ts):
 * smooth lines through control points, the lines noded where they meet or cross (a shared point in both), and the
 * blocks between them traced as the faces of that graph, each outlined by its streets' kerbs and sidewalks, round a
 * cul-de-sac's turning circle where one ends inside it. Sunridge's blocks (sunridge.ts `faces()`) were the first
 * worked out this way; this is that, made general (any lines, crossings found rather than given, open ends allowed).
 */
export type Pt = [number, number];

/** A smooth line through control points (Catmull-Rom), a point every `step` or so; its ends exactly the first and
 * last control points (closed: round and back to the first) */
export function smooth(ctrl: Pt[], step = 1.5, closed = false): Pt[] {
  const n = ctrl.length;
  if (n < 2) return ctrl.map((p): Pt => [p[0], p[1]]);
  const at = (i: number) => ctrl[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  const out: Pt[] = [];
  const spans = closed ? n : n - 1;
  for (let i = 0; i < spans; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const m = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < m; k++) {
      const t = k / m;
      const [t2, t3] = [t * t, t * t * t];
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push(k === 0 ? [p1[0], p1[1]] : [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(closed ? [out[0][0], out[0][1]] : [ctrl[n - 1][0], ctrl[n - 1][1]]);
  return out;
}

/** A polygon's signed area (negative: wound as the street plan's blocks) */
export function area(poly: Pt[]) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [p, q] = [poly[i], poly[(i + 1) % poly.length]];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}
/** Is a point inside an outline (even-odd) */
export function inside(poly: Pt[], [x, z]: Pt) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
/** How far a point is from a line (closed: back to its first point too) */
export function distTo(pts: Pt[], [x, z]: Pt, closed = false) {
  let m = Infinity;
  const n = pts.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [a, b] = [pts[i], pts[(i + 1) % n]];
    const [dx, dz] = [b[0] - a[0], b[1] - a[1]];
    const l2 = dx * dx + dz * dz;
    const t = l2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)) : 0;
    m = Math.min(m, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t));
  }
  return m;
}
/** A line's length */
export const lengthOf = (pts: Pt[]) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
/** The point of a line nearest another point (its index) */
export function nearestIndex(pts: Pt[], p: Pt) {
  let best = 0;
  let bd = Infinity;
  pts.forEach((q, i) => {
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (d < bd) [best, bd] = [i, d];
  });
  return best;
}

/** A line moved `d` to its right (as streetplan.ts `offsetLine()`, longer at a bend so its width holds) */
export function shift(pts: Pt[], d: number): Pt[] {
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
export function cross(a: Pt, b: Pt, c: Pt, d: Pt): [number, number] | null {
  const [rx, rz, sx, sz] = [b[0] - a[0], b[1] - a[1], d[0] - c[0], d[1] - c[1]];
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((c[0] - a[0]) * sz - (c[1] - a[1]) * sx) / den;
  const u = ((c[0] - a[0]) * rz - (c[1] - a[1]) * rx) / den;
  return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9 ? [t, u] : null;
}
const at = (pts: Pt[], s: number): Pt => {
  const i = Math.min(pts.length - 2, Math.max(0, Math.floor(s)));
  const f = s - i;
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f];
};
const cut = (pts: Pt[], s0: number, s1: number): Pt[] => {
  const out: Pt[] = [at(pts, s0)];
  for (let k = Math.floor(s0) + 1; k < s1 - 1e-9; k++) if (k > s0 + 1e-9) out.push(pts[k]);
  out.push(at(pts, s1));
  return out;
};
const same = (p: Pt, q: Pt, e = 1e-6) => Math.abs(p[0] - q[0]) < e && Math.abs(p[1] - q[1]) < e;

/** A line of the graph: a street's centre line (`w` its asphalt's half and its sidewalk, the kerb line the blocks
 * keep behind) or an edge of the land (`w` 0: the blocks run up to it) */
export interface GraphLine {
  pts: Pt[];
  w: number;
  street?: string;
  closed?: boolean;
}

/**
 * Lines noded: wherever two meet or cross, the point put in both (exactly the same numbers), so the graph's nodes are
 * shared points. A line's end on another (a T) is found the same way. Returns new lines (the inputs are left alone)
 * and the nodes: every crossing and every open line's ends.
 */
export function node(lines: GraphLine[]): { lines: GraphLine[]; nodes: Pt[] } {
  const L = lines.map((l) => ({ ...l, pts: l.pts.map((p): Pt => [p[0], p[1]]) }));
  const box = (pts: Pt[]) => {
    const xs = pts.map((p) => p[0]);
    const zs = pts.map((p) => p[1]);
    return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
  };
  const hits: Pt[] = [];
  // (each line's insertions: at a param, the point)
  const ins: { s: number; p: Pt }[][] = L.map(() => []);
  for (let i = 0; i < L.length; i++)
    for (let j = i + 1; j < L.length; j++) {
      const [A, B] = [box(L[i].pts), box(L[j].pts)];
      if (A[0] > B[2] + 1e-6 || B[0] > A[2] + 1e-6 || A[1] > B[3] + 1e-6 || B[1] > A[3] + 1e-6) continue;
      const P = L[i].pts;
      const Q = L[j].pts;
      for (let a = 0; a < P.length - 1; a++) {
        const [ax0, ax1] = [Math.min(P[a][0], P[a + 1][0]), Math.max(P[a][0], P[a + 1][0])];
        const [az0, az1] = [Math.min(P[a][1], P[a + 1][1]), Math.max(P[a][1], P[a + 1][1])];
        if (ax1 < B[0] - 1e-6 || ax0 > B[2] + 1e-6 || az1 < B[1] - 1e-6 || az0 > B[3] + 1e-6) continue;
        for (let b = 0; b < Q.length - 1; b++) {
          if (Math.max(Q[b][0], Q[b + 1][0]) < ax0 - 1e-6 || Math.min(Q[b][0], Q[b + 1][0]) > ax1 + 1e-6) continue;
          if (Math.max(Q[b][1], Q[b + 1][1]) < az0 - 1e-6 || Math.min(Q[b][1], Q[b + 1][1]) > az1 + 1e-6) continue;
          const c = cross(P[a], P[a + 1], Q[b], Q[b + 1]);
          if (!c) continue;
          // (at a line's own point, that point; else where they cross)
          const p: Pt = c[0] < 1e-6 ? P[a] : c[0] > 1 - 1e-6 ? P[a + 1] : c[1] < 1e-6 ? Q[b] : c[1] > 1 - 1e-6 ? Q[b + 1] : at(P, a + c[0]);
          if (hits.some((h) => same(h, p, 1e-4))) continue;
          hits.push([p[0], p[1]]);
          ins[i].push({ s: a + c[0], p });
          ins[j].push({ s: b + c[1], p });
        }
      }
    }
  const out = L.map((l, i) => {
    const list = ins[i].sort((p, q) => p.s - q.s);
    const pts: Pt[] = [];
    let k = 0;
    for (let v = 0; v < l.pts.length; v++) {
      while (k < list.length && list[k].s < v - 1e-6) {
        const p = list[k++].p;
        if (!pts.length || !same(pts[pts.length - 1], p, 1e-4)) pts.push([p[0], p[1]]);
      }
      // (a crossing at this very point: the point moved onto it exactly)
      const here = list.find((q) => Math.abs(q.s - v) < 1e-6);
      const p = here ? here.p : l.pts[v];
      if (!pts.length || !same(pts[pts.length - 1], p, 1e-4)) pts.push([p[0], p[1]]);
      else if (here) pts[pts.length - 1] = [p[0], p[1]];
      while (k < list.length && Math.abs(list[k].s - v) < 1e-6) k++;
    }
    while (k < list.length) {
      const p = list[k++].p;
      if (!same(pts[pts.length - 1], p, 1e-4)) pts.push([p[0], p[1]]);
    }
    // (a crossing found a hair from an existing point snaps it: the hits are the nodes' exact numbers)
    for (const h of hits) for (const q of pts) if (same(q, h, 1e-4)) [q[0], q[1]] = [h[0], h[1]];
    if (l.closed) pts[pts.length - 1] = [pts[0][0], pts[0][1]];
    return { ...l, pts };
  });
  const nodes: Pt[] = [...hits];
  for (const l of out) if (!l.closed) for (const e of [l.pts[0], l.pts[l.pts.length - 1]]) if (!nodes.some((n) => same(n, e, 1e-4))) nodes.push([e[0], e[1]]);
  return { lines: out, nodes };
}

/** A run of a block's edge: a street's kerb line (what stands on the block faces it) or the land's edge */
export interface Run {
  pts: Pt[];
  street?: string;
}
export interface FaceBlock {
  id: string;
  /** Its outline inside the sidewalk, wound as the street plan's blocks (negative area) */
  poly: Pt[];
  runs: Run[];
}

/**
 * The blocks between noded lines: the graph's faces (at each node turning to the next line round), each outlined by
 * its lines moved in by their `w`, joined where those cross near the node, round a turning circle (`bulbs`: a dead
 * end's middle and its asphalt's radius; any other dead end rounds the street's end at its width). The outside face
 * (the biggest) is left out, and so is every face with an open end on it that isn't a turning circle (the land beyond
 * the town).
 */
export function faces(noded: { lines: GraphLine[]; nodes: Pt[] }, bulbs: { at: Pt; r: number }[], prefix: string, walk: number): FaceBlock[] {
  const nodes: Pt[] = [];
  const nodeOf = (p: Pt) => {
    const k = nodes.findIndex((q) => same(q, p, 1e-4));
    return k >= 0 ? k : nodes.push([p[0], p[1]]) - 1;
  };
  for (const n of noded.nodes) nodeOf(n);
  const isNode = (p: Pt) => nodes.some((q) => same(q, p, 1e-4));
  interface Edge {
    a: number;
    b: number;
    pts: Pt[];
    w: number;
    street?: string;
  }
  const edges: Edge[] = [];
  for (const l of noded.lines) {
    const P = l.closed ? l.pts.slice(0, -1) : l.pts;
    const cuts = P.map((p, i) => (isNode(p) || (!l.closed && (i === 0 || i === P.length - 1)) ? i : -1)).filter((i) => i >= 0);
    if (l.closed) {
      if (!cuts.length) cuts.push(0);
      for (let k = 0; k < cuts.length; k++) {
        const [i, j] = [cuts[k], cuts[(k + 1) % cuts.length]];
        const run: Pt[] = [];
        for (let m = i; ; m = (m + 1) % P.length) {
          run.push(P[m]);
          if (m === j && run.length > 1) break;
        }
        edges.push({ a: nodeOf(P[i]), b: nodeOf(P[j]), pts: run, w: l.w, street: l.street });
      }
    } else for (let k = 1; k < cuts.length; k++) edges.push({ a: nodeOf(P[cuts[k - 1]]), b: nodeOf(P[cuts[k]]), pts: P.slice(cuts[k - 1], cuts[k] + 1), w: l.w, street: l.street });
  }
  const bulbAt = new Map<number, number>();
  for (const b of bulbs) bulbAt.set(nodeOf(b.at), b.r);
  const H = edges.length * 2;
  const from = (h: number) => (h % 2 ? edges[h >> 1].b : edges[h >> 1].a);
  const to = (h: number) => (h % 2 ? edges[h >> 1].a : edges[h >> 1].b);
  const line = (h: number) => (h % 2 ? [...edges[h >> 1].pts].reverse() : edges[h >> 1].pts);
  const outOf = new Map<number, number[]>();
  const ang = new Map<number, number>();
  for (let h = 0; h < H; h++) {
    const l = line(h);
    ang.set(h, Math.atan2(l[1][1] - l[0][1], l[1][0] - l[0][0]));
    if (!outOf.has(from(h))) outOf.set(from(h), []);
    outOf.get(from(h))!.push(h);
  }
  for (const list of outOf.values()) list.sort((p, q) => ang.get(p)! - ang.get(q)!);
  const next = (h: number) => {
    const t = h ^ 1;
    const list = outOf.get(from(t))!;
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
  const shapes = cycles.map((cyc) => ({ cyc, a: area(cyc.flatMap((h) => line(h).slice(0, -1))) }));
  const outside = shapes.reduce((p, q) => (Math.abs(q.a) > Math.abs(p.a) ? q : p));
  const blocks: FaceBlock[] = [];
  for (const { cyc, a } of shapes) {
    if (cyc === outside.cyc) continue;
    // (a face with an open end on it, not a turning circle, is land beyond the town: no block)
    const open = cyc.some((h, i) => cyc[(i + 1) % cyc.length] === (h ^ 1) && !bulbAt.has(to(h)));
    if (open) continue;
    const d = a < 0 ? -1 : 1;
    const offs = cyc.map((h) => {
      const w = edges[h >> 1].w;
      return w ? shift(line(h), d * w) : line(h);
    });
    const n = cyc.length;
    const joins = cyc.map((h, i) => {
      const [P, Q] = [offs[i], offs[(i + 1) % n]];
      const v = nodes[to(h)];
      if (cyc[(i + 1) % n] === (h ^ 1)) {
        // A dead end: round its turning circle's kerb
        const R = bulbAt.get(to(h))! + walk;
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
      // Two lines' kerbs crossing near the node: the crossing nearest it
      let best: { s1: number; s0: number; d: number } | null = null;
      for (let p = Math.max(0, P.length - 40); p < P.length - 1; p++)
        for (let q = 0; q < Math.min(Q.length - 1, 40); q++) {
          const c = cross(P[p], P[p + 1], Q[q], Q[q + 1]);
          if (!c) continue;
          const pt = at(P, p + c[0]);
          const dd = Math.hypot(pt[0] - v[0], pt[1] - v[1]);
          if (!best || dd < best.d) best = { s1: p + c[0], s0: q + c[1], d: dd };
        }
      if (best) return { s1: best.s1, s0: best.s0, arc: [] as Pt[] };
      return { s1: P.length - 1, s0: 0, arc: [] as Pt[] };
    });
    const runs: Run[] = [];
    const poly: Pt[] = [];
    cyc.forEach((h, i) => {
      const s0 = joins[(i + n - 1) % n].s0;
      const s1 = joins[i].s1;
      const pts = s1 > s0 ? [...cut(offs[i], s0, s1), ...joins[i].arc] : [at(offs[i], s1), ...joins[i].arc];
      const street = edges[h >> 1].street;
      const prev = runs[runs.length - 1];
      if (prev && prev.street === street) prev.pts.push(...pts.slice(1));
      else runs.push({ pts, ...(street ? { street } : {}) });
    });
    if (runs.length > 1 && runs[0].street === runs[runs.length - 1].street) {
      const last = runs.pop()!;
      runs[0].pts = [...last.pts, ...runs[0].pts.slice(1)];
    }
    for (const r of runs) for (const p of r.pts) if (!poly.length || Math.hypot(poly[poly.length - 1][0] - p[0], poly[poly.length - 1][1] - p[1]) > 0.05) poly.push(p);
    if (poly.length > 2 && Math.hypot(poly[0][0] - poly[poly.length - 1][0], poly[0][1] - poly[poly.length - 1][1]) < 0.05) poly.pop();
    if (area(poly) > 0) {
      poly.reverse();
      runs.reverse();
      for (const r of runs) r.pts.reverse();
    }
    blocks.push({ id: `${prefix}${blocks.length}`, poly, runs });
  }
  return blocks;
}

/** A polygon's edges crossing each other (not at a shared corner): none in a simple outline */
export function selfCrossings(poly: Pt[]) {
  let n = 0;
  const N = poly.length;
  for (let i = 0; i < N; i++)
    for (let j = i + 2; j < N; j++) {
      if (i === 0 && j === N - 1) continue;
      const c = cross(poly[i], poly[(i + 1) % N], poly[j], poly[(j + 1) % N]);
      if (c && c[0] > 1e-6 && c[0] < 1 - 1e-6 && c[1] > 1e-6 && c[1] < 1 - 1e-6) n++;
    }
  return n;
}

/** A seeded generator (the same lines every time) */
export function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
