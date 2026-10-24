/*
 * Where the traffic drives, DOM-free like the street plan, and generated from
 * it (docs/growth-plan.md Phase 7): the plan's drivable streets and their
 * crossings make a graph (each street cut into stretches between crossings,
 * driven either way or the one way a one-way street allows), and every route
 * is a closed loop through it: a seeded drive of a few stretches, turning
 * where it likes, then the shortest way back to where it set off, until
 * every stretch is driven by at least one route; and the ring highway all
 * the way round, both ways, in both lanes. Turns are rounded off (tighter
 * for right turns, and through the slip lanes where the highway meets an
 * arterial), the lane on an avenue picked for the next turn. Stretches out
 * towards the world's edge go nowhere and carry no traffic. Each route knows
 * where along it it crosses each junction and on which phase, and the
 * lights' timing (two phases, or three where a diagonal comes in). life.ts
 * drives the cars along them, round and round.
 */
import { LANE, MEDIAN } from './layout';
import { PLAN, distToStreet, offsetLine, type Street } from './streetplan';
import { SLIP_CUT, cornerCurve } from './highway';
import { baked, rounded } from './baked';

export type Pt = [number, number];
/** Which way traffic crosses a junction: along x, along z, or down a diagonal (each gets its own green) */
export type Phase = 'x' | 'z' | 'd';
export const phaseOf = (dx: number, dz: number): Phase => (Math.abs(dx) > 2 * Math.abs(dz) ? 'x' : Math.abs(dz) > 2 * Math.abs(dx) ? 'z' : 'd');

/** A crossing on the plan, as traffic sees it */
export interface Junction {
  ix: number;
  at: Pt;
  streets: Street[];
  lit: boolean;
  /** A diagonal meets here: the lights run three phases */
  three: boolean;
  /** The highway meets an arterial here: right turns take the slip lanes */
  highway: boolean;
}
/**
 * A route a car drives, round and round: a closed centre line in its lane
 * (its last point is its first; turns rounded off), and where along it each
 * crossing starts and ends.
 */
export interface Route {
  pts: Pt[];
  cum: number[];
  len: number;
  stops: { j: Junction; enter: number; exit: number; phase: Phase }[];
}

/** Lights cycle each phase in turn: green, then yellow, then red while the others go */
const CYCLE2 = 22;
const CYCLE3 = 30;
export function lightState(j: Junction, phase: Phase, t: number): 'g' | 'y' | 'r' {
  if (j.three) {
    const k = (t + j.ix * 4.5) % CYCLE3;
    const start = phase === 'x' ? 0 : phase === 'z' ? 10 : 20;
    const d = k - start;
    return d >= 0 && d < 8 ? 'g' : d >= 8 && d < 10 ? 'y' : 'r';
  }
  const k = (t + j.ix * 5.5) % CYCLE2;
  if (phase !== 'z') return k < 9 ? 'g' : k < 11 ? 'y' : 'r';
  return k < 11 ? 'r' : k < 20 ? 'g' : 'y';
}

export const JUNCTIONS: Junction[] = PLAN.crossings.map((c, ix) => ({
  ix,
  at: c.at,
  streets: c.streets.map((id) => PLAN.streets.find((s) => s.id === id)!),
  lit: c.lights,
  three: c.streets.some((id) => id.startsWith('diag')),
  highway: c.streets.includes('highway'),
}));

/** The right-hand side of travel along (dx, dz) */
export const rightOf = (dx: number, dz: number): Pt => [-dz, dx];

/* ---------- The streets as a graph ---------- */

/** A street traffic drives, its crossings (stations) in order along it, and its ends where they aren't crossings */
interface Way {
  s: Street;
  len: number;
  /** Distances along the street, in order; `j` is the junction there (none at a dead end) */
  stations: { along: number; j?: Junction }[];
}
/** Where `p` lies along a street (its nearest point's distance from the start) */
function alongOf(s: Street, p: Pt) {
  let best = Infinity;
  let at = 0;
  let run = 0;
  for (let i = 1; i < s.pts.length; i++) {
    const [a, b] = [s.pts[i - 1], s.pts[i]];
    const v: Pt = [b[0] - a[0], b[1] - a[1]];
    const l = Math.hypot(v[0], v[1]);
    const t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * v[0] + (p[1] - a[1]) * v[1]) / (l * l))) : 0;
    const d = Math.hypot(p[0] - (a[0] + v[0] * t), p[1] - (a[1] + v[1] * t));
    if (d < best - 1e-9) {
      best = d;
      at = run + t * l;
    }
    run += l;
  }
  return at;
}
/** The street's line from `a` to `b` along it (going backwards if dir is -1; round past the seam on a loop) */
function between(w: Way, a: number, b: number, dir: 1 | -1): Pt[] {
  const s = w.s;
  // A loop goes round twice, so a stretch over its seam is one run
  const P = s.loop ? [...s.pts, ...s.pts.slice(1)] : s.pts;
  const cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const at = (d: number): Pt => {
    let i = 1;
    while (i < P.length - 1 && cum[i] < d) i++;
    const f = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f];
  };
  const fwd = (from: number, to: number): Pt[] => {
    if (s.loop && to <= from) to += w.len;
    const out: Pt[] = [at(from)];
    for (let i = 0; i < P.length; i++) if (cum[i] > from + 1e-6 && cum[i] < to - 1e-6) out.push(P[i]);
    out.push(at(to));
    return out;
  };
  return dir === 1 ? fwd(a, b) : fwd(b, a).reverse();
}

const WAYS: Way[] = PLAN.streets
  .filter((s) => s.lanes > 0 && s.kind !== 'slip')
  .map((s) => {
    let len = 0;
    for (let i = 1; i < s.pts.length; i++) len += Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1]);
    const stations: Way['stations'] = JUNCTIONS.filter((j) => j.streets.includes(s)).map((j) => ({ along: alongOf(s, j.at), j }));
    // Its ends, where they aren't crossings, are dead ends (out at the world's edge)
    if (!s.loop) for (const d of [0, len]) if (!stations.some((t) => Math.abs(t.along - d) < 0.5)) stations.push({ along: d });
    stations.sort((a, b) => a.along - b.along);
    return { s, len, stations };
  });

/** A car about to leave station `i` of way `w` going `d` (1 along its points, -1 against) */
type State = { w: number; i: number; d: 1 | -1 };
const key = (s: State) => `${s.w}:${s.i}:${s.d}`;
/** The station a stretch leads to, if it can be driven: from a junction (not a dead end), the right way down a one-way street, and on to a junction */
function next(s: State): number | null {
  const w = WAYS[s.w];
  if (!w.stations[s.i].j || (w.s.oneway && w.s.oneway !== s.d)) return null;
  let n = s.i + s.d;
  if (w.s.loop) n = (n + w.stations.length) % w.stations.length;
  if (n < 0 || n >= w.stations.length || !w.stations[n].j) return null;
  return n;
}
/** The direction a way runs at a station, going d */
function tangent(w: Way, along: number, d: 1 | -1): Pt {
  const pts = w.s.pts;
  let run = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    // The stretch it's on (going d: the one ahead of it)
    if (l > 1e-9 && (d === 1 ? along < run + l - 1e-6 : along <= run + l + 1e-6) && (d === 1 ? along >= run - 1e-6 : along > run + 1e-6)) return [((pts[i][0] - pts[i - 1][0]) / l) * d, ((pts[i][1] - pts[i - 1][1]) / l) * d];
    run += l;
  }
  // At the very end (or the loop's seam): its last or first stretch
  const [p, q] = d === 1 ? [pts[0], pts[1]] : [pts[pts.length - 2], pts[pts.length - 1]];
  const l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
  return [((q[0] - p[0]) / l) * d, ((q[1] - p[1]) / l) * d];
}
type Turn = 'straight' | 'right' | 'left';
/** Where a car arriving at station n of way w (going d) can go on to, and which way it turns (worked out once) */
const ONWARD = new Map<string, { to: State; turn: Turn }[]>();
function onward(w: number, n: number, d: 1 | -1): { to: State; turn: Turn }[] {
  const k = `${w}:${n}:${d}`;
  let o = ONWARD.get(k);
  if (!o) ONWARD.set(k, (o = onwardOf(w, n, d)));
  return o;
}
function onwardOf(w: number, n: number, d: 1 | -1): { to: State; turn: Turn }[] {
  const way = WAYS[w];
  const j = way.stations[n].j!;
  const uIn = tangent(way, way.stations[n].along, d);
  const out: { to: State; turn: Turn }[] = [];
  const straight: State = { w, i: n, d };
  if (next(straight) !== null) out.push({ to: straight, turn: 'straight' });
  for (const s of j.streets) {
    const w2 = WAYS.findIndex((x) => x.s === s);
    if (w2 < 0 || w2 === w) continue;
    const i2 = WAYS[w2].stations.findIndex((t) => t.j === j);
    for (const d2 of [1, -1] as const) {
      const to: State = { w: w2, i: i2, d: d2 };
      if (next(to) === null) continue;
      const uOut = tangent(WAYS[w2], WAYS[w2].stations[i2].along, d2);
      const cross = uOut[0] * rightOf(...uIn)[0] + uOut[1] * rightOf(...uIn)[1];
      const dot = uOut[0] * uIn[0] + uOut[1] * uIn[1];
      // No U-turns, and no running straight on from one street onto another
      if (dot < -0.7 || Math.abs(cross) < 0.4) continue;
      out.push({ to, turn: cross > 0 ? 'right' : 'left' });
    }
  }
  return out;
}

/* ---------- Routes ---------- */

/** A small seeded random generator: the same routes for everyone */
function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A lane's offset right of its street's centre: a street's one lane, an avenue's (or the highway's) inner or outer one */
const ST = LANE / 2;
const IN = MEDIAN / 2 + LANE / 2;
const OUT = MEDIAN / 2 + LANE * 1.5;

/** One leg of a route: a stretch of one street driven one way in one lane, and how it turns onto the next */
type Leg = { pts: Pt[]; off: number; turn: Turn; slip: boolean };

/** A route from legs, each a centre line and how far right of it the lane runs; each corner rounded off */
function joinLegs(list: Leg[]): Pt[] {
  const lanes = list.map((l) => offsetLine(l.pts, l.off));
  const dir = (a: Pt, b: Pt): Pt => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  };
  let out: Pt[] = [...lanes[0]];
  for (let i = 1; i < lanes.length; i++) {
    const A = out;
    const B = lanes[i];
    const a0 = A[A.length - 2];
    const uA = dir(a0, A[A.length - 1]);
    const uB = dir(B[0], B[1]);
    // Where the two lanes' lines meet
    const den = uA[0] * uB[1] - uA[1] * uB[0];
    const t = ((B[0][0] - a0[0]) * uB[1] - (B[0][1] - a0[1]) * uB[0]) / den;
    const P: Pt = [a0[0] + uA[0] * t, a0[1] + uA[1] * t];
    // Right turns (from the kerb-side lane) turn tight round the corner, or wide through a slip lane; left turns sweep wider
    const cut = list[i - 1].slip ? SLIP_CUT : den > 0 ? 1.4 : 2.6;
    const near = (q: Pt) => Math.hypot(q[0] - P[0], q[1] - P[1]) < cut;
    // Round the corner: drop what's within `cut` of it either side, and curve from a little before it to a little after
    while (A.length > 1 && near(A[A.length - 1])) A.pop();
    let k0 = 0;
    while (k0 < B.length - 1 && near(B[k0])) k0++;
    A.push(...cornerCurve(P, uA, uB, cut));
    out = [...A, ...B.slice(k0)];
  }
  return out;
}

/**
 * The legs of a closed drive (its moves in order, each with the turn it ends
 * in; the last turns onto the first): moves on one street run together into
 * one leg, each in the lane for its next turn
 */
function legsOf(cycle: { from: State; turn: Turn }[], r: () => number): Leg[] {
  // Start just after a turn, so no leg runs over the seam
  const k0 = cycle.findIndex((_, k) => cycle[(k - 1 + cycle.length) % cycle.length].turn !== 'straight');
  const moves = [...cycle.slice(k0), ...cycle.slice(0, k0)];
  const legs: (Leg & { first: State; last: State; lastIx: number; inSlip: boolean })[] = [];
  moves.forEach((m, k) => {
    const prev = legs.at(-1);
    if (prev && moves[k - 1].turn === 'straight') [prev.last, prev.lastIx] = [m.from, k];
    else legs.push({ pts: [], off: 0, turn: 'straight', slip: false, first: m.from, last: m.from, lastIx: k, inSlip: false });
  });
  for (const l of legs) {
    l.turn = moves[l.lastIx].turn;
    l.slip = l.turn === 'right' && !!WAYS[l.last.w].stations[next(l.last)!].j?.highway;
  }
  legs.forEach((l, k) => (legs[(k + 1) % legs.length].inSlip = l.slip));
  for (const l of legs) {
    const way = WAYS[l.first.w];
    l.pts = between(way, way.stations[l.first.i].along, way.stations[next(l.last)!].along, l.first.d);
    // An avenue's lane: the outer one into a right turn or out of a slip lane, the inner one into a left turn
    l.off = way.s.lanes === 2 ? (l.turn === 'right' || l.inSlip ? OUT : l.turn === 'left' ? IN : r() < 0.5 ? IN : OUT) : ST;
    if (way.s.oneway) l.off = 0;
  }
  return legs;
}

/**
 * The shortest way (fewest stretches) from a car arriving at station `n` of
 * way `w` to setting off from `goal`: the turn it takes there, and the moves
 * after it (each with the turn it ends in; the last turns onto the goal)
 */
function wayBack(w: number, n: number, d: 1 | -1, goal: State): { turn: Turn; moves: { from: State; turn: Turn }[] } | null {
  type Node = { prev: string | null; into: { from: State; turn: Turn } | null; w: number; n: number; d: 1 | -1 };
  const seen = new Map<string, Node>();
  const k0 = `${w}:${n}:${d}`;
  seen.set(k0, { prev: null, into: null, w, n, d });
  const queue = [k0];
  while (queue.length) {
    const k = queue.shift()!;
    const at = seen.get(k)!;
    for (const o of onward(at.w, at.n, at.d)) {
      if (key(o.to) === key(goal)) {
        // The moves that got here, each with the turn onto it; a move's own turn is the next one's
        const chain: { from: State; turn: Turn }[] = [];
        for (let c: string | null = k; c; c = seen.get(c)!.prev) {
          const e = seen.get(c)!;
          if (e.into) chain.unshift(e.into);
        }
        const turns = [...chain.map((m) => m.turn), o.turn];
        return { turn: turns[0], moves: chain.map((m, i) => ({ from: m.from, turn: turns[i + 1] })) };
      }
      const nn = next(o.to)!;
      const ak = `${o.to.w}:${nn}:${o.to.d}`;
      if (seen.has(ak)) continue;
      seen.set(ak, { prev: k, into: { from: o.to, turn: o.turn }, w: o.to.w, n: nn, d: o.to.d });
      queue.push(ak);
    }
  }
  return null;
}

/** Each junction's streets cut down to their segments within 24 of it (quicker to measure against) */
const NEAR: { half: number; segs: [Pt, Pt][] }[][] = JUNCTIONS.map((j) =>
  j.streets.map((s) => {
    const segs: [Pt, Pt][] = [];
    for (let i = 1; i < s.pts.length; i++) {
      const seg: Street = { ...s, pts: [s.pts[i - 1], s.pts[i]] };
      if (distToStreet(seg, j.at) < 24) segs.push([s.pts[i - 1], s.pts[i]]);
    }
    return { half: s.half, segs };
  })
);
/** How far q is from the nearest of some segments */
function toSegs(segs: [Pt, Pt][], q: Pt) {
  // (squared distances, rooted once: it runs hundreds of thousands of times as the routes are worked out)
  let best = Infinity;
  for (const [a, b] of segs) {
    const vx = b[0] - a[0];
    const vz = b[1] - a[1];
    const l2 = vx * vx + vz * vz;
    const t = l2 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * vx + (q[1] - a[1]) * vz) / l2)) : 0;
    const dx = q[0] - (a[0] + vx * t);
    const dz = q[1] - (a[1] + vz * t);
    const d2 = dx * dx + dz * dz;
    if (d2 < best) best = d2;
  }
  return Math.sqrt(best);
}

/** The junctions in cells of 12, for what's near a point (`junctionsNear()`: its cell and the eight round it) */
const J_CELL = 12;
let jGrid: Map<number, Junction[]> | null = null;
/** A cell's key (a number: no string built per look-up) */
const jKey = (cx: number, cz: number) => cx * 4096 + cz;
function junctionsNear([x, z]: Pt): Junction[] {
  if (!jGrid) {
    jGrid = new Map();
    for (const j of JUNCTIONS) {
      const key = jKey(Math.floor(j.at[0] / J_CELL), Math.floor(j.at[1] / J_CELL));
      const l = jGrid.get(key);
      if (l) l.push(j);
      else jGrid.set(key, [j]);
    }
  }
  const [cx, cz] = [Math.floor(x / J_CELL), Math.floor(z / J_CELL)];
  const out: Junction[] = [];
  for (let i = -1; i <= 1; i++)
    for (let k = -1; k <= 1; k++) {
      const l = jGrid.get(jKey(cx + i, cz + k));
      if (l) for (const j of l) out.push(j);
    }
  return out;
}

/** How far along a line each of its points is */
function cumOf(pts: Pt[]) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return cum;
}
function makeRoute(pts: Pt[]): Route {
  const cum = cumOf(pts);
  const route: Route = { pts, cum, len: cum.at(-1)!, stops: [] };
  // Where it crosses each junction: inside the asphalt of two of the streets meeting there. Coarsely first
  // (every half tile, which junctions it passes near), then finely round each pass
  const STEP = 0.5;
  const coarse: Pt[] = [];
  for (let p = 0, seg = 0; p <= route.len; p += STEP) {
    const o = pointOn(route, p, seg);
    seg = o.seg;
    coarse.push(o.at);
  }
  const inside = (j: Junction, q: Pt) => {
    let n = 0;
    for (const s of NEAR[j.ix]) if (toSegs(s.segs, q) < s.half + 0.2 && ++n >= 2) return true;
    return false;
  };
  // Which junctions each coarse point is within 12 of (through the junctions' grid, not every junction)
  const near = new Map<Junction, number[]>();
  coarse.forEach((q, k) => {
    for (const j of junctionsNear(q))
      if (Math.hypot(q[0] - j.at[0], q[1] - j.at[1]) <= 12) {
        let l = near.get(j);
        if (!l) near.set(j, (l = []));
        l.push(k);
      }
  });
  for (const j of JUNCTIONS) {
    const ks = near.get(j) ?? [];
    for (let i = 0; i < ks.length; i++) {
      const k = ks[i];
      // A pass near the junction: from here to where it's 12 away again, scanned finely
      let end = k;
      while (i + 1 < ks.length && ks[i + 1] === end + 1) end = ks[++i];
      let enter = -1;
      let exit = -1;
      for (let p = k * STEP, seg = 0; p <= Math.min(route.len, (end + 1) * STEP); p += 0.1) {
        const o = pointOn(route, p, seg);
        seg = o.seg;
        if (inside(j, o.at)) {
          if (enter < 0) enter = p;
          exit = p;
        }
      }
      if (enter >= 0) {
        const a = pointOn(route, enter, 0).dir;
        route.stops.push({ j, enter, exit, phase: phaseOf(a[0], a[1]) });
      }
    }
  }
  route.stops.sort((a, b) => a.enter - b.enter);
  return route;
}

/** The point `p` along a route (from segment `seg` on), its direction and segment */
export function pointOn(r: Route, p: number, seg: number): { at: Pt; dir: Pt; seg: number } {
  let i = Math.max(0, Math.min(seg, r.pts.length - 2));
  while (i < r.pts.length - 2 && r.cum[i + 1] < p) i++;
  while (i > 0 && r.cum[i] > p) i--;
  const a = r.pts[i];
  const b = r.pts[i + 1];
  const l = r.cum[i + 1] - r.cum[i] || 1;
  const f = Math.max(0, Math.min(1, (p - r.cum[i]) / l));
  return { at: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], dir: [(b[0] - a[0]) / l, (b[1] - a[1]) / l], seg: i };
}

/** A closed route from its legs (cyclic): it starts and ends halfway down the longest */
function loopOf(legs: Leg[]): Pt[] {
  // The longest leg first, so the seam is well clear of any corner
  const lens = legs.map((l) => offsetLine(l.pts, l.off).reduce((a, p, i, ps) => a + (i ? Math.hypot(p[0] - ps[i - 1][0], p[1] - ps[i - 1][1]) : 0), 0));
  const k = lens.indexOf(Math.max(...lens));
  const list = [...legs.slice(k), ...legs.slice(0, k)];
  const pts = joinLegs([...list, list[0]]);
  // From halfway down the first leg (untouched at the start) to halfway down its copy at the end
  const half = lens[k] / 2;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = cum.at(-1)!;
  const at = (d: number): Pt => {
    let i = 1;
    while (i < pts.length - 1 && cum[i] < d) i++;
    const f = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
  };
  const [a, b] = [half, total - half];
  const out: Pt[] = [at(a)];
  for (let i = 0; i < pts.length; i++) if (cum[i] > a + 1e-6 && cum[i] < b - 1e-6) out.push(pts[i]);
  out.push([...out[0]]);
  return out;
}

/** The ring highway all the way round, one way, in one lane */
function highwayLoop(d: 1 | -1, off: number): Pt[] {
  const w = WAYS.find((x) => x.s.kind === 'highway')!;
  const pts = d === 1 ? w.s.pts : [...w.s.pts].reverse();
  const lane = offsetLine(pts, off);
  lane[lane.length - 1] = [...lane[0]];
  return lane;
}

/** How long a seeded drive goes before heading back */
const DRIVE_MOVES = 9;

/** A route as plain data (its junctions by number), for the build to bake (baked.ts) */
export type PackedRoute = { pts: Pt[]; stops: [number, number, number, Phase][] };
export const packRoutes = (routes: Route[]): PackedRoute[] => routes.map((r) => ({ pts: r.pts, stops: r.stops.map((s): [number, number, number, Phase] => [s.j.ix, s.enter, s.exit, s.phase]) }));
export const unpackRoutes = (packed: PackedRoute[]): Route[] =>
  packed.map(({ pts, stops }) => {
    const cum = cumOf(pts);
    return { pts, cum, len: cum.at(-1)!, stops: stops.map(([ix, enter, exit, phase]) => ({ j: JUNCTIONS[ix], enter, exit, phase })) };
  });

/** Every route the traffic drives (worked out when the site is built: baked.ts) */
export const ROUTES: Route[] = baked('routes', allRoutes, packRoutes, unpackRoutes);
function allRoutes(): Route[] {
  const r = rng(7007);
  const routes: Pt[][] = [highwayLoop(1, IN), highwayLoop(1, OUT), highwayLoop(-1, IN), highwayLoop(-1, OUT)];
  // Every stretch that can be driven (some turn leads onto it: a one-way loop can leave a stretch nobody can
  // get to without a U-turn), and which are driven so far
  const all: State[] = [];
  WAYS.forEach((w, wi) => w.stations.forEach((_, i) => ([1, -1] as const).forEach((d) => next({ w: wi, i, d }) !== null && all.push({ w: wi, i, d }))));
  const reached = new Set(all.flatMap((s) => onward(s.w, next(s)!, s.d).map((o) => key(o.to))));
  const stretches = all.filter((s) => reached.has(key(s)));
  const driven = new Set<string>();
  for (const s of stretches) if (WAYS[s.w].s.kind === 'highway') driven.add(key(s));
  // And every turn through a slip lane (the right turns where the highway meets an arterial), each taken by some route
  const slipTurns = new Map<string, { from: State; o: { to: State; turn: Turn } }>();
  for (const s of stretches) {
    const n = next(s)!;
    if (!WAYS[s.w].stations[n].j?.highway) continue;
    for (const o of onward(s.w, n, s.d)) if (o.turn === 'right') slipTurns.set(`${key(s)}>${key(o.to)}`, { from: s, o });
  }
  const taken = new Set<string>();
  for (let tries = 0; tries < 2000; tries++) {
    // Set off down a stretch nobody drives yet, or into a slip lane nobody takes yet
    const todo = stretches.find((s) => !driven.has(key(s)));
    const turn = todo ? null : [...slipTurns.entries()].find(([k]) => !taken.has(k))?.[1];
    if (!todo && !turn) break;
    const start = todo ?? turn!.from;
    const moves: { from: State; turn: Turn }[] = [];
    let at = start;
    let ok = true;
    for (let k = 0; k < DRIVE_MOVES; k++) {
      const n = next(at)!;
      const opts = onward(at.w, n, at.d);
      // Keep on the highway a while, rather than off at the next junction
      const weight = (o: { turn: Turn }) => (o.turn === 'straight' ? (WAYS[at.w].s.kind === 'highway' ? 5 : 3) : 1.5);
      const total = opts.reduce((a, o) => a + weight(o), 0);
      let pick = r() * total;
      const o = k === 0 && turn ? turn.o : (opts.find((x) => (pick -= weight(x)) < 0) ?? opts[0]);
      if (!o) {
        ok = false;
        break;
      }
      moves.push({ from: at, turn: o.turn });
      at = o.to;
    }
    if (!ok) continue;
    // And the shortest way back to where it set off: `at` is still to be driven, then it turns onto the way back
    const back = wayBack(at.w, next(at)!, at.d, start);
    if (!back) continue;
    const cycle = [...moves, { from: at, turn: back.turn }, ...back.moves];
    cycle.forEach((m, k) => {
      driven.add(key(m.from));
      taken.add(`${key(m.from)}>${key(cycle[(k + 1) % cycle.length].from)}`);
    });
    routes.push(loopOf(legsOf(cycle, r)));
  }
  // (the points cut to 3 decimals, within 2 mm: the page carries them, baked.ts)
  return routes.map((pts) => makeRoute(rounded(pts)));
}

/**
 * Spots along the routes, every few tiles: where a car can be put on the
 * road (life.ts keeps the traffic round the camera: a car that's drifted far
 * off is put back at one of these near you, out of sight)
 */
export const SPOTS: { r: number; p: number; x: number; z: number }[] = ROUTES.flatMap((route, ri) => {
  const out: { r: number; p: number; x: number; z: number }[] = [];
  for (let p = 0; p < route.len; p += 7) {
    // Not inside a junction
    if (route.stops.some((s) => p > s.enter - 3 && p < s.exit + 2)) continue;
    const q = pointOn(route, p, 0).at;
    out.push({ r: ri, p, x: q[0], z: q[1] });
  }
  return out;
});

/* ---------- A drive from one place to another (a taxi's) ---------- */

/** Where a point is nearest the drivable streets: the way, how far along it, and the stretch it's on */
function project(p: Pt) {
  let best = { w: -1, along: 0, d: Infinity };
  WAYS.forEach((way, w) => {
    const along = alongOf(way.s, p);
    const q = between(way, along, along, 1)[0];
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (d < best.d) best = { w, along, d };
  });
  const way = WAYS[best.w];
  // The stretch it's on: between station i and the next (round the seam on a loop)
  let i = way.stations.length - 1;
  for (let k = 0; k < way.stations.length; k++) if (way.stations[k].along <= best.along + 1e-9) i = k;
  if (!way.s.loop && i === way.stations.length - 1) i = Math.max(0, i - 1);
  return { w: best.w, along: best.along, i, dist: best.d };
}
/** The next station along a way from station i going d (round a loop), or -1 past an end */
const stepFrom = (w: number, i: number, d: 1 | -1) => {
  const way = WAYS[w];
  const n = i + d;
  if (way.s.loop) return (n + way.stations.length) % way.stations.length;
  return n < 0 || n >= way.stations.length ? -1 : n;
};
/** How far along a way from `a` to `b` going d (round a loop if need be) */
const span = (w: number, a: number, b: number, d: 1 | -1) => {
  const way = WAYS[w];
  let x = (b - a) * d;
  if (way.s.loop && x < 0) x += way.len;
  return x;
};
/** Can a car arriving at a junction along way w (going d) set off along way w2 (going d2) from there: no U-turn, the right way down a one-way street */
function canTurn(w: number, n: number, d: 1 | -1, w2: number, n2: number, d2: 1 | -1): Turn | null {
  const way2 = WAYS[w2];
  if (way2.s.oneway && way2.s.oneway !== d2) return null;
  if (w === w2) return d === d2 ? 'straight' : null;
  const uIn = tangent(WAYS[w], WAYS[w].stations[n].along, d);
  const uOut = tangent(way2, way2.stations[n2].along, d2);
  const cross = uOut[0] * rightOf(...uIn)[0] + uOut[1] * rightOf(...uIn)[1];
  const dot = uOut[0] * uIn[0] + uOut[1] * uIn[1];
  if (dot < -0.7 || Math.abs(cross) < 0.4) return null;
  return cross > 0 ? 'right' : 'left';
}

/**
 * The shortest drive from near `a` to near `b` along the streets, the right
 * way down one-way streets, turning right through the slip lanes at the
 * highway: a route (open, not a loop) from the road nearest `a` to the kerb
 * nearest `b`, in its lane, with where it crosses each junction. Null when
 * there's no way (it never happens on today's plan).
 */
export function pathBetween(a: Pt, b: Pt): Route | null {
  const from = project(a);
  const to = project(b);
  type Node = { w: number; n: number; d: 1 | -1; cost: number; prev: string | null; turn: Turn };
  const nodes = new Map<string, Node>();
  const open: string[] = [];
  const push = (w: number, n: number, d: 1 | -1, cost: number, prev: string | null, turn: Turn) => {
    const k = `${w}:${n}:${d}`;
    const had = nodes.get(k);
    if (had && had.cost <= cost) return;
    nodes.set(k, { w, n, d, cost, prev, turn });
    open.push(k);
  };
  // Off down its stretch either way (the right way on a one-way street), to the junction at its end
  const W = WAYS[from.w];
  for (const d of [1, -1] as const) {
    if (W.s.oneway && W.s.oneway !== d) continue;
    const n = d === 1 ? stepFrom(from.w, from.i, 1) : from.i;
    if (n < 0 || !W.stations[n].j) continue;
    push(from.w, n, d, span(from.w, from.along, W.stations[n].along, d), null, 'straight');
  }
  // On the same stretch already, ahead: no junction at all (a place straight across the street is round the block)
  let best: { cost: number; at: string | null; d: 1 | -1 } = { cost: Infinity, at: null, d: 1 };
  if (from.w === to.w && from.i === to.i)
    for (const d of [1, -1] as const) {
      if (W.s.oneway && W.s.oneway !== d) continue;
      if ((to.along - from.along) * d > 1 && !W.s.loop) best = { cost: Math.abs(to.along - from.along), at: null, d };
    }
  const T = WAYS[to.w];
  while (open.length) {
    // Cheapest first (a short list: a few hundred junctions at most)
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (nodes.get(open[k])!.cost < nodes.get(open[bi])!.cost) bi = k;
    const key0 = open.splice(bi, 1)[0];
    const at = nodes.get(key0)!;
    if (at.cost >= best.cost) break;
    const j = WAYS[at.w].stations[at.n].j!;
    // Finish: off down the destination's stretch from this junction, to the kerb
    for (const [n2, d2] of [
      [to.i, 1],
      [stepFrom(to.w, to.i, 1), -1],
    ] as [number, 1 | -1][]) {
      if (n2 < 0 || T.stations[n2].j !== j) continue;
      if (!canTurn(at.w, at.n, at.d, to.w, n2, d2)) continue;
      const c = at.cost + span(to.w, T.stations[n2].along, to.along, d2);
      if (c < best.cost) best = { cost: c, at: key0, d: d2 };
    }
    for (const o of onward(at.w, at.n, at.d)) {
      const nn = next(o.to)!;
      push(o.to.w, nn, o.to.d, at.cost + span(o.to.w, WAYS[o.to.w].stations[o.to.i].along, WAYS[o.to.w].stations[nn].along, o.to.d), key0, o.turn);
    }
  }
  if (best.cost === Infinity) return null;
  // The junctions it passes, in order, and the legs between them
  const chain: Node[] = [];
  for (let k = best.at; k; k = nodes.get(k)!.prev) chain.unshift(nodes.get(k)!);
  type Run = { w: number; d: 1 | -1; a: number; b: number };
  const runs: Run[] = [];
  if (!chain.length) runs.push({ w: from.w, d: best.d, a: from.along, b: to.along });
  else {
    runs.push({ w: chain[0].w, d: chain[0].d, a: from.along, b: WAYS[chain[0].w].stations[chain[0].n].along });
    for (let k = 1; k < chain.length; k++) {
      const c = chain[k];
      const prevRun = runs[runs.length - 1];
      const end = WAYS[c.w].stations[c.n].along;
      // Straight on along the same street: the same leg goes further
      if (c.turn === 'straight' && prevRun.w === c.w && prevRun.d === c.d) prevRun.b = end;
      // (turning onto another street: from the junction, where it is along that one)
      else runs.push({ w: c.w, d: c.d, a: WAYS[c.w].stations[stepFrom(c.w, c.n, -c.d as 1 | -1)].along, b: end });
    }
    const lastRun = runs[runs.length - 1];
    const n2 = best.d === 1 ? to.i : stepFrom(to.w, to.i, 1);
    if (lastRun.w === to.w && lastRun.d === best.d) lastRun.b = to.along;
    else runs.push({ w: to.w, d: best.d, a: T.stations[n2].along, b: to.along });
  }
  // Each leg in its lane: the outer one into a right turn or out of a slip lane, and to the kerb at the end
  const legs: Leg[] = runs.map((r, k) => {
    const way = WAYS[r.w];
    const nextRun = runs[k + 1];
    let turn: Turn = 'straight';
    if (nextRun) {
      const uIn = tangent(way, r.b, r.d);
      const uOut = tangent(WAYS[nextRun.w], nextRun.a, nextRun.d);
      const cross = uOut[0] * rightOf(...uIn)[0] + uOut[1] * rightOf(...uIn)[1];
      turn = cross > 0 ? 'right' : 'left';
    }
    const at = way.stations.find((s) => Math.abs(s.along - r.b) < 0.5)?.j;
    return { pts: between(way, r.a, r.b, r.d), off: 0, turn, slip: turn === 'right' && !!at?.highway };
  });
  legs.forEach((l, k) => {
    const way = WAYS[runs[k].w];
    const inSlip = k > 0 && legs[k - 1].slip;
    l.off = way.s.oneway ? 0 : way.s.lanes === 2 ? (l.turn === 'right' || inSlip || k === legs.length - 1 ? OUT : l.turn === 'left' ? IN : OUT) : ST;
  });
  // (a leg too short to draw is dropped: the corners round over it)
  const kept = legs.filter((l) => Math.hypot(l.pts[0][0] - l.pts[l.pts.length - 1][0], l.pts[0][1] - l.pts[l.pts.length - 1][1]) > 0.05);
  return makeRoute(joinLegs(kept));
}
