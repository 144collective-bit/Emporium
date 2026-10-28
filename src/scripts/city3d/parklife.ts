/*
 * Westlake Park's life (step 3, docs/growth-plan.md Phase 9b, the owner's
 * call; DOM-free, tested in tests/parklife.test.ts): who's out in the park
 * and what's moving on it, every one of them a function of the time, the
 * same for everyone (and for the tests).
 *
 * - **Walkers, joggers and dog walkers** (`PARK_PEOPLE`) round the lake
 *   loop and the ring walk, up and down the Mall: each
 *   path in lanes (walkers near its middle, joggers by its edges, either
 *   way), everyone in a lane at its pace, spread evenly so nobody walks
 *   through anybody. A dog (`DOGS`) trots on its lead ahead of each dog
 *   walker.
 * - **Sitting about:** people on some of the benches, and picnics on the
 *   lawns (`PICNICS`: a blanket in a glade, a basket, two or three sitting
 *   round it).
 * - **Boats on the lake** (`BOATS`): rowing boats and swan pedalos going
 *   round in rings (each ring its own pace and way round, so none ever
 *   meet), people aboard, and two moored at the jetty.
 *
 * The view: the people are the city's crowd (life.ts), the dogs, boats,
 * oars and leads are drawn by westlake3d.ts when the park's chunk
 * is loaded.
 */
import { offsetLine } from './streetplan';
/** The lawn's top (world.ts's SLAB: that file draws, so it can't be imported here) */
const SLAB = 0.15;
import {
  BENCHES,
  BIG,
  JETTY,
  LOOP_OUT,
  MALL,
  PARK_TREES,
  RING_IN,
  GARDEN_SITE,
  BRIDGE_FOOT,
  ZS,
  inLake,
  inPark,
  inset,
  lakeLine,
  onPath,
  type Pt,
} from './westlake';

/** What a person in the park is doing at a moment: where, facing (0 is +z), standing (or seat) height, the crowd clip, how fast */
export type ParkClip = 'walk' | 'jog' | 'look' | 'idle' | 'chat' | 'sit' | 'picnic' | 'row' | 'pedal' | 'shoot' | 'swing';
export interface Moment {
  x: number;
  z: number;
  ry: number;
  /** Standing height, or for `sit` and `picnic` the seat's */
  y: number;
  clip: ParkClip;
  /** How fast they're going (their walk or jog is played at its stride from it) */
  speed: number;
}
export interface ParkPerson {
  id: string;
  /** Left out on phones (the trim: half the park's people) */
  trim: boolean;
  /** How big (the crowd's own size unless set: kids, play.ts) */
  scale?: number;
  at(t: number, out: Moment): Moment;
}
export const moment = (): Moment => ({ x: 0, z: 0, ry: 0, y: SLAB, clip: 'look', speed: 0 });

/** Their paces (tiles a second at the crowd's scale): a stroll as the town's, a jog as the jog clip's (crowdclips.ts) */
export const WALK_PACE = 0.5;
export const JOG_PACE = 1.7;

/* ---------- Lanes: closed lines people go round ---------- */

interface Loop {
  pts: Pt[];
  cum: number[];
  len: number;
}
function loopOf(pts: Pt[]): Loop {
  const cum = [0];
  for (let i = 1; i <= pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i % pts.length][0] - pts[i - 1][0], pts[i % pts.length][1] - pts[i - 1][1]));
  return { pts, cum, len: cum.at(-1)! };
}
/** The point `u` along a loop (wrapping), and the way along it there */
function along(l: Loop, u: number, out: { x: number; z: number; dx: number; dz: number }) {
  u = ((u % l.len) + l.len) % l.len;
  let lo = 0;
  let hi = l.pts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (l.cum[mid] <= u) lo = mid;
    else hi = mid - 1;
  }
  const a = l.pts[lo];
  const b = l.pts[(lo + 1) % l.pts.length];
  const seg = l.cum[lo + 1] - l.cum[lo] || 1;
  const f = (u - l.cum[lo]) / seg;
  out.x = a[0] + (b[0] - a[0]) * f;
  out.z = a[1] + (b[1] - a[1]) * f;
  out.dx = (b[0] - a[0]) / seg;
  out.dz = (b[1] - a[1]) / seg;
  return out;
}
const scratch = { x: 0, z: 0, dx: 0, dz: 0 };

/** A lane: a closed line, the way round, its pace, how many go round it (evenly spaced) and which of them walk a dog */
export interface Lane {
  id: string;
  loop: Loop;
  dir: 1 | -1;
  pace: number;
  count: number;
  dogs: number[];
}
/** A path both ways as one thin loop: out `off` to one side of its centre line and back on the other */
const thin = (pts: Pt[], off: number): Pt[] => [...offsetLine(pts, off), ...offsetLine(pts, -off).reverse()];

export const LANES: Lane[] = (() => {
  const out: Lane[] = [];
  const lane = (id: string, pts: Pt[], dir: 1 | -1, pace: number, count: number, dogs: number[] = []) => out.push({ id, loop: loopOf(pts), dir, pace, count, dogs });
  // The lake loop (1.1 either side of its line): walkers 0.35 off its middle, joggers 0.8, either way
  lane('loop-in', lakeLine(LOOP_OUT - 0.35, 240), 1, WALK_PACE, 4, [1]);
  lane('loop-out', lakeLine(LOOP_OUT + 0.35, 240), -1, WALK_PACE, 4, [2]);
  lane('loop-jog-in', lakeLine(LOOP_OUT - 0.8, 240), -1, JOG_PACE, 2);
  lane('loop-jog-out', lakeLine(LOOP_OUT + 0.8, 240), 1, JOG_PACE, 2);
  // The ring walk round the big block (1.2 either side)
  lane('ring-in', inset(BIG, RING_IN + 0.35), 1, WALK_PACE, 4, [0]);
  lane('ring-out', inset(BIG, RING_IN - 0.35), -1, WALK_PACE, 4, [3]);
  lane('ring-jog-in', inset(BIG, RING_IN + 0.85), -1, JOG_PACE, 3);
  lane('ring-jog-out', inset(BIG, RING_IN - 0.85), 1, JOG_PACE, 2);
  // The Mall, up one side and down the other
  lane('mall', thin([[MALL.x, ZS - 0.6], [MALL.x, BRIDGE_FOOT + 1.2]], 1.0), 1, WALK_PACE, 6, [3]);
  return out;
})();

/** Each walker's lane and place in it; each dog walker's dog this far ahead of them along the lane, this far to their right */
export const LEAD = { ahead: 1.15, side: 0.3 };
interface Walker {
  lane: Lane;
  /** Where along the lane at t = 0 */
  u0: number;
}
const WALKERS: Walker[] = LANES.flatMap((l, li) => {
  // (each lane from its own place round, so the lanes don't line up)
  const off = (li * 37.3) % l.loop.len;
  return Array.from({ length: l.count }, (_, k) => ({ lane: l, u0: off + (k / l.count) * l.loop.len }));
});
function walkerAt(w: Walker, t: number, out: Moment, ahead = 0, side = 0) {
  const l = w.lane;
  const u = w.u0 + l.dir * (l.pace * t + ahead);
  along(l.loop, u, scratch);
  const [dx, dz] = [scratch.dx * l.dir, scratch.dz * l.dir];
  // (right of the way they're going: (-dz, dx))
  out.x = scratch.x - dz * side;
  out.z = scratch.z + dx * side;
  out.ry = Math.atan2(dx, dz);
  out.y = SLAB;
  out.clip = l.pace > 1 ? 'jog' : 'walk';
  out.speed = l.pace;
  return out;
}

/* ---------- Picnics ---------- */

export interface Picnic {
  at: Pt;
  ry: number;
  /** The blanket's half sizes */
  half: Pt;
  /** Who's sitting round it: where and facing */
  people: { x: number; z: number; ry: number }[];
}
/** In the glades: on the big block's lawns, well off the paths, the water, the stadium and every tree; seeded */
export const PICNICS: Picnic[] = (() => {
  let s = 4242;
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const out: Picnic[] = [];
  const [x0, x1] = [Math.min(...BIG.map((p) => p[0])), Math.max(...BIG.map((p) => p[0]))];
  const [z0, z1] = [Math.min(...BIG.map((p) => p[1])), Math.max(...BIG.map((p) => p[1]))];
  for (let tries = 0; tries < 4000 && out.length < 9; tries++) {
    const p: Pt = [x0 + r() * (x1 - x0), z0 + r() * (z1 - z0)];
    if (!inPark(p, 4) || onPath(p, 3.2) || inLake(p[0], p[1], LOOP_OUT + 3.5)) continue;
    if (p[0] > GARDEN_SITE[0] - 5 && p[0] < GARDEN_SITE[2] + 5 && p[1] > GARDEN_SITE[1] - 5 && p[1] < GARDEN_SITE[3] + 5) continue;
    if (PARK_TREES.some((t) => Math.hypot(t.x - p[0], t.z - p[1]) < 3.2)) continue;
    if (out.some((o) => Math.hypot(o.at[0] - p[0], o.at[1] - p[1]) < 16)) continue;
    const ry = r() * Math.PI;
    const n = 2 + Math.floor(r() * 2);
    const people = Array.from({ length: n }, (_, k) => {
      // Round the blanket, at its edge, facing its middle
      const a = ry + (k / n) * 2 * Math.PI + 0.4;
      const [x, z] = [p[0] + Math.sin(a) * 0.95, p[1] + Math.cos(a) * 0.75];
      return { x, z, ry: Math.atan2(p[0] - x, p[1] - z) };
    });
    out.push({ at: p, ry, half: [0.9, 0.7], people });
  }
  return out;
})();

/* ---------- Boats ---------- */

/** The water's top (westlake3d.ts lays it at SLAB + 0.04), and a seat's height in a boat over it */
export const BOAT_Y = SLAB + 0.04;
export const BOAT_SEAT = 0.16;
/** A boat's length and beam (rowing boat, swan) */
export const HULL = { row: { l: 2.2, w: 0.9 }, swan: { l: 2.0, w: 1.15 } };
export interface Boat {
  kind: 'row' | 'swan';
  colour: string;
  moored: boolean;
  /** Its ring (how far in from the water's edge), or none (moored) */
  ring: number;
  /** Position and heading (cars.ts's yaw: 0 points +x) */
  at(t: number, out: { x: number; z: number; yaw: number }): { x: number; z: number; yaw: number };
}
const bp = { x: 0, z: 0, yaw: 0 };
/** A ring this far in from the water's edge, along its normals (a radial offset would bunch the rings where the shore slants) */
export function ringLine(d: number): Pt[] {
  const edge = lakeLine(0, 240);
  const wrap = [edge.at(-1)!, ...edge, edge[0]];
  const a = offsetLine(wrap, d).slice(1, -1);
  // (whichever side is the water's)
  const b = offsetLine(wrap, -d).slice(1, -1);
  const inside = (pts: Pt[]) => pts.filter((p) => inLake(p[0], p[1])).length;
  return inside(a) >= inside(b) ? a : b;
}
/** The rings the boats go round: this far in from the water's edge, the way round and the pace (a ring's boats spread evenly) */
export const RINGS = [
  { in: 5.2, dir: 1, pace: 0.55, boats: ['row', 'swan', 'row'] },
  { in: 6.6, dir: -1, pace: 0.42, boats: ['swan', 'row'] },
  { in: 8.0, dir: 1, pace: 0.5, boats: ['swan'] },
] as const;
const HULLS = ['#f3f2f7', '#e23b3b', '#2aabee', '#ffd23f', '#1fbf6b'];
export const BOATS: Boat[] = (() => {
  const out: Boat[] = [];
  let k = 0;
  RINGS.forEach((ring, ri) => {
    const loop = loopOf(ringLine(ring.in));
    ring.boats.forEach((kind, j) => {
      const u0 = (ri * 41 + (j / ring.boats.length) * loop.len) % loop.len;
      const o = { x: 0, z: 0, dx: 0, dz: 0 };
      out.push({
        kind,
        colour: kind === 'swan' ? '#f7f5f0' : HULLS[k++ % HULLS.length],
        moored: false,
        ring: ring.in,
        at: (t, p) => {
          along(loop, u0 + ring.dir * ring.pace * t, o);
          p.x = o.x;
          p.z = o.z;
          p.yaw = Math.atan2(-o.dz * ring.dir, o.dx * ring.dir);
          return p;
        },
      });
    });
  });
  // Two rowing boats moored side by side on the jetty's west side (where the shore drops away), along it, bows out
  for (const k of [0, 1]) {
    const x = JETTY.x - (JETTY.half + HULL.row.w / 2 + 0.12 + k * (HULL.row.w + 0.15));
    const z = JETTY.z1 - HULL.row.l / 2 - 0.2;
    out.push({ kind: 'row', colour: HULLS[(k + 2) % HULLS.length], moored: true, ring: 0, at: (_, p) => Object.assign(p, { x, z, yaw: -Math.PI / 2 }) });
  }
  return out;
})();

/* ---------- Everyone ---------- */

export const PARK_PEOPLE: ParkPerson[] = (() => {
  const out: ParkPerson[] = [];
  WALKERS.forEach((w, i) => out.push({ id: `${w.lane.id}-${i}`, trim: i % 2 === 1, at: (t, m) => walkerAt(w, t, m) }));
  // On every third bench (a seat 0.3 up), facing where it faces
  BENCHES.forEach((b, i) => {
    if (i % 3) return;
    out.push({ id: `bench-${i}`, trim: i % 2 === 1, at: (_, m) => Object.assign(m, { x: b.at[0] - Math.sin(b.ry) * 0.04, z: b.at[1] - Math.cos(b.ry) * 0.04, ry: b.ry, y: SLAB + 0.3, clip: 'sit' as const, speed: 0 }) });
  });
  PICNICS.forEach((p, i) =>
    p.people.forEach((q, k) => out.push({ id: `picnic-${i}-${k}`, trim: i % 2 === 1, at: (_, m) => Object.assign(m, { x: q.x, z: q.z, ry: q.ry, y: SLAB + 0.03, clip: 'picnic' as const, speed: 0 }) }))
  );
  // Aboard the boats (below): a rower facing the stern at the oars, two side by side in a swan at the pedals
  BOATS.forEach((b, i) => {
    if (b.moored) return;
    const seats: [number, number, number][] = b.kind === 'row' ? [[0.05, 0, Math.PI]] : [[-0.05, -0.24, 0], [-0.05, 0.24, 0]];
    seats.forEach(([fx, sx, turn], k) =>
      out.push({
        id: `boat-${i}-${k}`,
        trim: k === 1,
        at: (t, m) => {
          b.at(t, bp);
          // (the boat's forward is (cos yaw, -sin yaw); its right (sin yaw, cos yaw)... as cars.ts)
          const [fx0, fz0] = [Math.cos(bp.yaw), -Math.sin(bp.yaw)];
          const [rx, rz] = [Math.sin(bp.yaw), Math.cos(bp.yaw)];
          m.x = bp.x + fx0 * fx + rx * sx;
          m.z = bp.z + fz0 * fx + rz * sx;
          m.ry = Math.atan2(fx0, fz0) + turn;
          m.y = BOAT_Y + BOAT_SEAT;
          m.clip = b.kind === 'row' ? 'row' : 'pedal';
          m.speed = 0;
          return m;
        },
      })
    );
  });
  return out;
})();

/* ---------- Dogs ---------- */

/** A dog: whose (an index into PARK_PEOPLE), its coat, how big */
export interface Dog {
  walker: number;
  coat: string;
  size: number;
  at(t: number, out: { x: number; z: number; ry: number; speed: number }): { x: number; z: number; ry: number; speed: number };
}
const COATS = ['#c8915a', '#2b2622', '#f2ede3', '#8a6a4a', '#d9c39a', '#5b4636'];
export const DOGS: Dog[] = (() => {
  const out: Dog[] = [];
  let k = 0;
  WALKERS.forEach((w, i) => {
    const n = WALKERS.filter((v, j) => v.lane === w.lane && j < i).length;
    if (!w.lane.dogs.includes(n)) return;
    const m = moment();
    out.push({
      walker: i,
      coat: COATS[k % COATS.length],
      size: [1, 0.8, 1.15, 0.9][k++ % 4],
      at: (t, o) => {
        walkerAt(w, t, m, LEAD.ahead, LEAD.side);
        o.x = m.x;
        o.z = m.z;
        o.ry = m.ry;
        o.speed = m.speed;
        return o;
      },
    });
  });
  return out;
})();
