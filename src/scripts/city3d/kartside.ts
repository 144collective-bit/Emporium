/*
 * The kart park's trackside furniture as data (docs/kart-west-plan.md Phase 2): the marshal posts round the outside
 * and each way round's guidance boards (chevron boards along the outside of the bends, the corners' numbers, the
 * braking markers before the hard ones). Each is placed only where it's clear of the run-off, the tyre walls and the
 * armco, the grass banks, everything built, the floodlights, the trees, the catch fencing, the flyover's columns, the
 * gantry's posts and everything placed before it, so nothing trackside stands in anything else (they were placed in
 * the drawing, and could stand in the armco or on a bank's slope). Free of the DOM and of scene code; drawn by
 * kartgrounds3d.ts, tested in tests/kartclip.test.ts.
 */
import { CIRCUIT, COURSES, COURSE_IDS, GANTRY, SUPPORTS, SUPPORT_HALF, enclosed, type Course, type CourseId } from './kartcircuit';
import { ARMCO_OUT, BANKS, BARRIERS, CATCH, FIXTURES, FLOOD, FLOODLIGHTS, KART_TREES, TYRE_R, TYRE_WALLS, bankAt, circuitDistance } from './kartfacility';
import { KART_PARK, frame, toLocal, toWorld, type Pt } from './kartpark';

/** Something standing trackside, as a circle round its middle (world) */
export interface Stand {
  x: number;
  z: number;
  r: number;
}
/** How far a board stands out from the centre line (behind the armco), and a marshal post (its booth's middle) */
export const BOARD_OUT = ARMCO_OUT + 0.45;
export const MARSHAL_OUT = ARMCO_OUT + 1.1;
/** A marshal post's booth (square) and a board's footprint (round its posts) */
export const BOOTH = 1.3;
const BOOTH_R = (BOOTH / 2) * Math.SQRT2;
const BOARD_R = { chevron: 0.75, number: 0.5, marker: 0.4 } as const;
/** How deep a board is across the track (its posts and face), for keeping it off the barriers */
const BOARD_D = 0.12;

/** The nearest a point comes to a segment */
export function segDist(p: Pt, a: Pt, b: Pt) {
  const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
  const l2 = vx * vx + vz * vz;
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / l2)) : 0;
  return Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vz * t);
}
/** The nearest a point comes to a run of points (world) */
const runDist = (p: Pt, run: Pt[]) => {
  let best = Infinity;
  for (let i = 1; i < run.length; i++) best = Math.min(best, segDist(p, run[i - 1], run[i]));
  return run.length === 1 ? Math.hypot(p[0] - run[0][0], p[1] - run[0][1]) : best;
};
/** The catch fencing in world numbers */
export const CATCH_WORLD: [Pt, Pt][] = CATCH.map(([a, b]) => [toWorld(a), toWorld(b)]);

/** Everything fixed trackside that the furniture keeps off (circles) */
export const FIXED: Stand[] = [
  ...FLOODLIGHTS.map((f) => ({ x: f.x, z: f.z, r: FLOOD.half * Math.SQRT2 + 0.2 })),
  ...KART_TREES.map(([x, z, s]) => ({ x, z, r: 0.5 * s + 0.3 })),
  ...SUPPORTS.map((s) => ({ x: s.x, z: s.z, r: SUPPORT_HALF * Math.SQRT2 + 0.1 })),
  ...GANTRY.posts.map((p) => ({ x: p.x, z: p.z, r: 0.35 })),
];

/**
 * Is a circle `r` round a point clear of everything trackside and of what's been placed so far; `d` is how deep the
 * thing is across the track (a board is thin, `r` reaching along it), kept off the circuit and its barriers
 */
function clear(x: number, z: number, r: number, placed: Stand[], d = r) {
  const K = KART_PARK;
  if (x - r < K.x0 + 0.8 || x + r > K.x1 - 0.8 || z - r < K.z0 + 0.8 || z + r > K.z1 - 0.8) return false;
  if (circuitDistance(x, z) < ARMCO_OUT + 0.15 + d) return false;
  const p: Pt = [x, z];
  for (const run of BARRIERS) if (runDist(p, run) < d + 0.2) return false;
  for (const run of TYRE_WALLS) if (runDist(p, run) < d + TYRE_R + 0.1) return false;
  for (const [a, b] of CATCH_WORLD) if (segDist(p, a, b) < r + 0.25) return false;
  const [u, v] = toLocal(p);
  for (const f of FIXTURES) if (u > f.u0 - r - 0.4 && u < f.u1 + r + 0.4 && v > f.v0 - r - 0.4 && v < f.v1 + r + 0.4) return false;
  for (const b of BANKS) for (const [du, dv] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) if (bankAt(b, u + du, v + dv) > 0) return false;
  for (const s of [...FIXED, ...placed]) if (Math.hypot(s.x - x, s.z - z) < s.r + r + 0.15) return false;
  return true;
}

/** A marshal post: its booth's middle, its facing (ry turns its front, +x, along the track) and the track's side it's on */
export interface Marshal extends Stand {
  ry: number;
  side: number;
}
/** A board: what kind, its middle, the track's tangent and left normal there, the number on it (a corner's or a marker's) */
export interface Board extends Stand {
  kind: 'chevron' | 'number' | 'marker';
  tx: number;
  tz: number;
  nx: number;
  nz: number;
  n: number;
  /** The track's side it stands on (left positive) */
  side: number;
}
/** A bend of a course: where it runs (s), its apex, which way it turns (left positive) and whether it's hard */
export interface Corner {
  s0: number;
  s1: number;
  apex: number;
  dir: number;
  hard: boolean;
}

/** The corners: where each bend runs (|k| over a threshold), its turn direction, its apex */
export function cornersOf(cc: Course): Corner[] {
  const N = cc.x.length;
  const corners: Corner[] = [];
  let cur: { s0: number; s1: number; apex: number; dir: number; peak: number } | null = null;
  for (let k = 0; k <= N; k++) {
    const s = (k % N) * cc.step;
    const kk = cc.k[k % N];
    const dir = Math.abs(kk) > 0.045 ? Math.sign(kk) : 0;
    if (cur && (dir !== cur.dir || k === N)) {
      if (cur.s1 - cur.s0 > 3) corners.push({ s0: cur.s0, s1: cur.s1, apex: cur.apex, dir: cur.dir, hard: cur.peak > 0.1 });
      cur = null;
    }
    if (dir && !cur) cur = { s0: s, s1: s, apex: s, dir, peak: Math.abs(kk) };
    if (cur) {
      cur.s1 = s;
      if (Math.abs(kk) > cur.peak) {
        cur.peak = Math.abs(kk);
        cur.apex = s;
      }
    }
  }
  return corners;
}

const placed: Stand[] = [];

/** Marshal posts every ~27 tiles round the outside (every other on phones: `trim`), past the barriers */
export const MARSHALS: (Marshal & { trim: boolean })[] = (() => {
  const c = CIRCUIT;
  const out: (Marshal & { trim: boolean })[] = [];
  let k = 0;
  for (let s = 9; s < c.L; s += 27, k++) {
    const f = frame(c, s);
    if (enclosed(f)) continue;
    const side = f.k ? -Math.sign(f.k) : 1;
    // The spot on the outside, or a little further out or along if that's taken
    for (const [more, ahead] of [
      [0, 0],
      [0.8, 0],
      [0, 2],
      [0, -2],
      [1.6, 0],
    ]) {
      const x = f.x + f.nx * (MARSHAL_OUT + more) * side + f.tx * ahead;
      const z = f.z + f.nz * (MARSHAL_OUT + more) * side + f.tz * ahead;
      if (!clear(x, z, BOOTH_R, placed, BOOTH / 2)) continue;
      const m = { x, z, r: BOOTH_R, ry: Math.atan2(-f.tz, f.tx), side, trim: k % 2 === 1 };
      out.push(m);
      placed.push(m);
      break;
    }
  }
  return out;
})();

/** Each way round's boards, clear of each other and of the marshal posts */
export const BOARDS: Record<CourseId, Board[]> = (() => {
  const out = Object.fromEntries(COURSE_IDS.map((id) => [id, [] as Board[]])) as Record<CourseId, Board[]>;
  // (each way round's boards are shown only while it's raced, kartgrounds3d.ts: they keep off the marshal posts and
  // their own way's, not the other's)
  const add = (id: CourseId, b: Board) => {
    if (!clear(b.x, b.z, b.r, [...placed, ...out[id]], BOARD_D)) return false;
    out[id].push(b);
    return true;
  };
  const board = (kind: Board['kind'], cc: Course, s: number, out: number, side: number, n: number, ahead = 0): Board => {
    const f = frame(cc, s);
    return { kind, x: f.x + f.nx * out * side + f.tx * ahead, z: f.z + f.nz * out * side + f.tz * ahead, r: BOARD_R[kind], tx: f.tx, tz: f.tz, nx: f.nx, nz: f.nz, n, side };
  };
  const bends = COURSE_IDS.map((id) => ({ id, cc: COURSES[id], corners: cornersOf(COURSES[id]) }));
  // The corners' numbers first (both ways), each at its own turn's apex on the outside, a little further out or along
  // if that's taken
  for (const { id, cc, corners } of bends)
    for (const t of cc.turns) {
      const gap = (a: number) => Math.min(Math.abs(a - t.s), cc.L - Math.abs(a - t.s));
      const k = frame(cc, t.s).k;
      const dir = Math.abs(k) > 0.02 ? Math.sign(k) : ([...corners].sort((a, b) => gap(a.apex) - gap(b.apex))[0]?.dir ?? 1);
      // (in the tunnel, just outside its portals)
      const along = [0, -3, 3, -6, 6, -9, 9].map((d) => t.s + d).filter((s) => !enclosed(frame(cc, s)));
      // (on the outside, or where the outside's hemmed in by the rest of the circuit, the inside)
      const tries = [-dir, dir].flatMap((side) => along.flatMap((s) => [0, 1.5, 3, 4.5].map((more) => [s, more, side])));
      tries.some(([s, more, side]) => add(id, board('number', cc, s, BOARD_OUT + more, side, t.n)));
    }
  // Then the braking markers 3, 2 and 1 before the hard corners, on the outside
  for (const { id, cc, corners } of bends)
    for (const corner of corners)
      if (corner.hard)
        for (const m of [3, 2, 1]) {
          const s = corner.s0 - m * 8;
          if (!enclosed(frame(cc, s))) [0, 1, -1].some((ahead) => add(id, board('marker', cc, s, BOARD_OUT, -corner.dir, m, ahead)));
        }
  // Then the chevron boards along the outside of the bends, facing the track
  for (const { id, cc, corners } of bends)
    for (const corner of corners)
      for (let s = corner.s0 + 1; s <= corner.s1; s += 4.5) if (!enclosed(frame(cc, s))) add(id, board('chevron', cc, s, BOARD_OUT, -corner.dir, 0));
  return out;
})();

/** What stands trackside while a way round is raced: the marshal posts and its boards */
export const tracksideOf = (id: CourseId): Stand[] => [...MARSHALS, ...BOARDS[id]];
