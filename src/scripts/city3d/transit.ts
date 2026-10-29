/*
 * Buses that stop (city life plan, Phase 4). DOM-free: life.ts draws it,
 * transit3d.ts builds the shelters, tests/transit.test.ts checks it.
 *
 * - Bus stops (`BUS_STOPS`) are data from the street plan: along every
 *   avenue in town (the ring, the bank avenues, Trench Avenue), each way,
 *   every `STOP_GAP` tiles or so, in the kerb lane, `STOP_CLEAR` from any
 *   crossing, never on a bridge, never inside something solid on the
 *   sidewalk. A stop is where the bus's front halts (`at`), the way it
 *   faces (`dir`), and where its shelter stands on the sidewalk (`kerb`,
 *   facing the road).
 * - `routeStops()` finds where a route passes the stops (a bus takes any
 *   route; it serves the stops it passes in their direction).
 * - `busStep()` is the rule: a bus coming up to its next stop slows to a
 *   halt with its front at the stop, dwells `DWELL` seconds (the doors
 *   hiss open and shut), then carries on; the traffic behind it waits
 *   (life.ts's following), and its brake lights are on while it stands.
 */
import { LANE, RIVER, WALK_W } from './layout';
import { PLAN, pointAt, streetLength, type Pt, type Street } from './streetplan';
import { inTown } from './outer';
import { inTrenches } from './trenches';
import { SOLIDS, type Box } from './solids';
import { pointOn, rightOf, type Route } from './routes';

export interface BusStop {
  id: string;
  /** The street it's on */
  street: string;
  /** Where the bus's front halts: in the kerb lane */
  at: Pt;
  /** The way the bus faces there (unit) */
  dir: Pt;
  /** Where the shelter stands, on the sidewalk, and the way it faces (towards the road, unit) */
  kerb: Pt;
  face: Pt;
}

/** About how far apart the stops are along an avenue */
export const STOP_GAP = 32;
/** How far a stop keeps from a crossing (the junction's queue) */
export const STOP_CLEAR = 9;
/** Half the shelter's length along the kerb */
export const SHELTER_HALF = 1.2;
/** How long a bus stands at a stop, the shortest and the longest */
export const DWELL: [number, number] = [4, 7];
/** A bus coming up to its stop starts slowing this far before it */
export const APPROACH = 12;

const inBox = (p: Pt, b: Box, m: number) => p[0] > b[0] - m && p[0] < b[2] + m && p[1] > b[1] - m && p[1] < b[3] + m;

/** The stops along one avenue, each way (exported for the tests) */
export function stopsOn(s: Street, crossings: Pt[], solids: readonly Box[] = SOLIDS): BusStop[] {
  const out: BusStop[] = [];
  const len = streetLength(s);
  for (const way of [1, -1] as const) {
    // Staggered: the two directions' stops don't face each other across the avenue
    for (let d = STOP_GAP / 2 + (way === -1 ? 6 : 0), k = 0; d < len - 3; d += STOP_GAP, k++) {
      const { at, dir } = pointAt(s, d);
      const u: Pt = way === 1 ? dir : [-dir[0], -dir[1]];
      const r = rightOf(u[0], u[1]);
      // In town only (an avenue runs on to the world's edge), never on a bridge or by a junction
      if (!inTown(at, 2) && !inTrenches(at[0], at[1])) continue;
      if (at[1] > RIVER[0] - 6 && at[1] < RIVER[1] + 6 && Math.abs(dir[1]) > 0.5) continue;
      if (crossings.some((c) => Math.hypot(c[0] - at[0], c[1] - at[1]) < STOP_CLEAR)) continue;
      const lane: Pt = [at[0] + r[0] * (s.half - LANE / 2), at[1] + r[1] * (s.half - LANE / 2)];
      const kerb: Pt = [at[0] + r[0] * (s.half + WALK_W * 0.55), at[1] + r[1] * (s.half + WALK_W * 0.55)];
      // Nothing solid standing on the sidewalk where the shelter goes (a building behind the sidewalk is fine)
      const spots: Pt[] = [kerb, [kerb[0] + u[0] * SHELTER_HALF, kerb[1] + u[1] * SHELTER_HALF], [kerb[0] - u[0] * SHELTER_HALF, kerb[1] - u[1] * SHELTER_HALF]];
      if (spots.some((q) => solids.some((b) => inBox(q, b, 0.05)))) continue;
      out.push({ id: `${s.id}:${way === 1 ? 'a' : 'b'}${k}`, street: s.id, at: lane, dir: u, kerb, face: [-r[0], -r[1]] });
    }
  }
  return out;
}

/** Every bus stop in the city */
export const BUS_STOPS: BusStop[] = PLAN.streets
  .filter((s) => s.kind === 'avenue')
  .flatMap((s) =>
    stopsOn(
      s,
      PLAN.crossings.filter((c) => c.streets.includes(s.id)).map((c) => c.at)
    )
  );

/** A stop a route passes: how far along the route the bus's front halts there, and how far it pulls in to the kerb (0 in the kerb lane already) */
export interface RouteStop {
  p: number;
  off: number;
  stop: BusStop;
}

/** A bus pulls in to the kerb over this long before a stop, and back out over this long after it */
export const PULL_IN = APPROACH;
export const PULL_OUT = 8;

/**
 * Where a route passes the stops in their direction: in the kerb lane, or the
 * lane inside it (the bus pulls in to the kerb there). Sampled every half tile;
 * the sample level with each stop.
 */
export function routeStops(route: Route, stops: readonly BusStop[] = BUS_STOPS): RouteStop[] {
  const best = new Map<BusStop, { p: number; off: number; along: number }>();
  let seg = 0;
  for (let p = 0; p < route.len; p += 0.5) {
    const o = pointOn(route, p, seg);
    seg = o.seg;
    const r = rightOf(o.dir[0], o.dir[1]);
    for (const s of stops) {
      if (o.dir[0] * s.dir[0] + o.dir[1] * s.dir[1] < 0.9) continue;
      const [dx, dz] = [s.at[0] - o.at[0], s.at[1] - o.at[1]];
      const along = Math.abs(dx * o.dir[0] + dz * o.dir[1]);
      const off = dx * r[0] + dz * r[1];
      if (along > 0.6 || off < -0.3 || off > LANE + 0.4) continue;
      const b = best.get(s);
      if (!b || along < b.along) best.set(s, { p, off: Math.max(0, off), along });
    }
  }
  return [...best].map(([stop, b]) => ({ p: b.p, off: b.off, stop })).sort((a, b) => a.p - b.p);
}

/** How far a bus at `p` along its route has pulled in towards the kerb: in over PULL_IN before a stop, out over PULL_OUT after */
export function pullIn(p: number, len: number, stops: readonly RouteStop[]): number {
  let out = 0;
  for (const s of stops) {
    if (!s.off) continue;
    let d = s.p - p;
    if (d > len / 2) d -= len;
    if (d < -len / 2) d += len;
    const k = d >= 0 ? 1 - d / PULL_IN : 1 + d / PULL_OUT;
    if (k <= 0) continue;
    const e = k * k * (3 - 2 * k);
    out = Math.max(out, s.off * e);
  }
  return out;
}

/** A bus's stopping: the stop it stands at (or -1), how long it has left there, and the one it last left */
export interface Bus {
  at: number;
  dwell: number;
  left: number;
}
export const newBus = (): Bus => ({ at: -1, dwell: 0, left: -1 });

/**
 * One frame of a bus's stops: `p` is its front along the route, `v` its
 * speed. Returns how fast it may go (Infinity: no stop ahead) and what the
 * doors did this frame. A delivery truck takes its loading bays the same way,
 * standing longer (fleet.ts `BAY_DWELL`).
 */
export function busStep(b: Bus, p: number, v: number, len: number, stops: readonly RouteStop[], dt: number, seed: number, dwell: readonly [number, number] = DWELL): { cap: number; doors: 'open' | 'shut' | null } {
  if (!stops.length) return { cap: Infinity, doors: null };
  if (b.at >= 0) {
    b.dwell -= dt;
    if (b.dwell > 0) return { cap: 0, doors: null };
    b.left = b.at;
    b.at = -1;
    return { cap: Infinity, doors: 'shut' };
  }
  // The next stop ahead (round the loop), not the one it's just left (that one counts again once it's well past it)
  let next = -1;
  let ahead = Infinity;
  stops.forEach((s, i) => {
    const raw = s.p - p;
    if (i === b.left) {
      if (raw > -1.5 && raw < 2) return;
      b.left = -1;
    }
    const d = raw < -0.3 ? raw + len : raw;
    if (d < ahead) [ahead, next] = [d, i];
  });
  if (next < 0 || ahead > APPROACH) return { cap: Infinity, doors: null };
  if (ahead < 0.5 && v < 0.05) {
    b.at = next;
    b.dwell = dwell[0] + (dwell[1] - dwell[0]) * seed;
    return { cap: 0, doors: 'open' };
  }
  return { cap: Math.max(0, (ahead - 0.3) * 1.3), doors: null };
}
