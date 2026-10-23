/*
 * The kart park's facility round the circuit (the north side's stage 2,
 * docs/north-plan.md, the owner's call: "a more realistic track with more
 * than just a fence around it"), free of the DOM and of scene code, tested
 * in tests/kartfacility.test.ts. The circuit itself is kartcircuit.ts and
 * doesn't change; this is everything round it, in the park's local numbers
 * (u east, v south; kartpark.ts `toWorld()`) where it's on the site:
 *
 * - **Trackside** (`BARRIERS`, `TYRE_WALLS`, `CATCH`): armco along the
 *   run-off's edge wherever it's open ground and clear of the rest of the
 *   circuit and the pits, tyre walls in front of it round the outside of the
 *   bends, tall catch fencing in front of every spectator area. Nothing of
 *   it is solid (the owner's call: nothing to bump into on or beside the
 *   track); a kart that runs that wide is put back (kart-sim.ts `RESET_AT`).
 * - **Spectators**: the covered grandstand on the north side over the hill
 *   and the jump (`GRANDSTAND`, solid), three grass banks (`BANKS`, you can
 *   walk up them: `bankY()`), the viewing terrace on the hut's roof
 *   (`TERRACE`), and the people on them all (`KART_PEOPLE`).
 * - **The entrance and the paddock**: the paved plaza inside the gate
 *   (`PLAZA`) with the ticket kiosk (`KIOSK`) and the gate's arch, the
 *   timing tower at the pit lane's end (`TOWER`), the paddock behind the
 *   garages (`PADDOCK`, `TENTS`: team tents with karts on stands).
 * - **Lights**: floodlight towers round the circuit (`FLOODLIGHTS`).
 * - **The car park** (`CAR_PARK`, `BAYS`, `PARKED`) inside the one-way loop
 *   off Kart Road (kartpark.ts `ROAD`, `LOOP`), lamps along the road and
 *   round the loop (`KART_LAMPS`), trees on the lawns (`KART_TREES`).
 *
 * `FACILITY_SOLIDS` (in solids.ts `SOLIDS`) are the kiosk, the tower, the
 * grandstand, the terrace's stairs, the floodlight masts, the arch's posts
 * and the parked cars; `KART_RECTS` keep the outskirts' trees off it all.
 */
import { CIRCUIT, CLEAR, GANTRY, PIT_HALF, PIT_LANE, SITE, SUPPORTS, enclosed } from './kartcircuit';
import { GATE, KART_PARK, LOOP, ROAD, frame, toLocal, toWorld, type Line, type Pt } from './kartpark';
import type { Box } from './solids';
import type { Rect } from './tiles';

/** A rectangle in local numbers */
export interface LRect {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}
const inL = (r: LRect, u: number, v: number, m = 0) => u > r.u0 - m && u < r.u1 + m && v > r.v0 - m && v < r.v1 + m;
/** A local rectangle in world numbers (x0, z0, x1, z1) */
export const worldRect = (r: LRect): Rect => {
  const [x0, z0] = toWorld([r.u0, r.v0]);
  const [x1, z1] = toWorld([r.u1, r.v1]);
  return [x0, z0, x1, z1];
};

/* ---------- The buildings ---------- */

/**
 * The covered grandstand north of the hill and the jump, facing south over them: `tiers` steps of seats rising
 * north from its front (v1), `rise` each, the roof at `roof` over the ground on columns at the back, reaching out
 * over the front row
 */
export const GRANDSTAND = { u0: 40, v0: -13.5, u1: 70, v1: -1.6, tiers: 9, rise: 0.5, roof: 6.6 } as const;
/** The timing tower at the pit lane's east end, its lap board facing north over the straight */
export const TOWER = { u0: 56.4, v0: 76.8, u1: 59.4, v1: 79.8, h: 8.2 } as const;
/** The viewing terrace on the hut's roof (its parapet just inside the hut's walls), the stairs up its west side */
export const TERRACE = { y: SITE.hut.h, stairs: { u0: 15, v0: 76.8, u1: 16.8, v1: 81.2 } } as const;
/** The plaza inside the gate (paved, the gate's path to the hut's door across it) and the ticket kiosk on it */
export const PLAZA: LRect = { u0: -12, v0: 82.4, u1: 26, v1: 103.6 };
export const KIOSK = { u0: 10, v0: 98, u1: 13.4, v1: 101, h: 2.6 } as const;
/** The arch over the gate: its posts either side of the gap, its beam's height */
export const ARCH = { h: 4.6, post: 0.45 } as const;
/** The paddock behind the garages: paved, two rows of team tents facing the walk between them */
export const PADDOCK: LRect = { u0: 28, v0: 83.4, u1: 64, v1: 102.4 };
export const TENT = { w: 4.2, d: 3.6, h: 2.5 } as const;
export const TENTS: { u: number; v: number; face: 1 | -1; colour: number }[] = (() => {
  const out: { u: number; v: number; face: 1 | -1; colour: number }[] = [];
  const n = 7;
  const span = PADDOCK.u1 - PADDOCK.u0 - 2;
  for (const [row, v, face] of [
    [0, PADDOCK.v0 + 1.2 + TENT.d / 2, 1],
    [1, PADDOCK.v1 - 1.2 - TENT.d / 2, -1],
  ] as const)
    for (let k = 0; k < n; k++) out.push({ u: PADDOCK.u0 + 1 + (span * (k + 0.5)) / n, v, face, colour: (k + row * 3) % 5 });
  return out;
})();

/* ---------- The grass banks ---------- */

export interface Bank extends LRect {
  id: string;
  /** Its top's height over the lawn */
  h: number;
  /** The side it faces the track from (its low edge): s(outh), e(ast), w(est) */
  front: 's' | 'e' | 'w';
}
export const BANKS: Bank[] = [
  { id: 'north', u0: 4, v0: -13, u1: 36, v1: -0.6, h: 1.8, front: 's' },
  { id: 'west', u0: -12.5, v0: 12, u1: -0.6, v1: 66, h: 1.8, front: 'e' },
  { id: 'east', u0: 87.6, v0: 6, u1: 97, v1: 58, h: 1.8, front: 'w' },
];
/** How far up a bank its slope reaches before the flat top (a share of its depth), and the back's drop */
const SLOPE = 0.72;
const BACK = 0.12;
/** The bank's height at a point (local), 0 off it: up from its front, a flat top, down at the back */
export function bankAt(b: Bank, u: number, v: number) {
  if (!inL(b, u, v)) return 0;
  // t: 0 at the front edge, 1 at the back
  const t = b.front === 's' ? (b.v1 - v) / (b.v1 - b.v0) : b.front === 'e' ? (b.u1 - u) / (b.u1 - b.u0) : (u - b.u0) / (b.u1 - b.u0);
  // The ends taper down too, so it doesn't stand as a cliff
  const along = b.front === 's' ? Math.min(u - b.u0, b.u1 - u) : Math.min(v - b.v0, b.v1 - v);
  const end = Math.min(1, along / 2.5);
  const up = t < SLOPE ? t / SLOPE : t > 1 - BACK ? (1 - t) / BACK : 1;
  return b.h * up * end;
}
/** The banks' ground at a world point (0 off them): walking (walk.ts) and the people on them */
export function bankY(x: number, z: number) {
  const [u, v] = toLocal([x, z]);
  let y = 0;
  for (const b of BANKS) y = Math.max(y, bankAt(b, u, v));
  return y;
}

/* ---------- Where things may stand: clear of the circuit, its run-off, the pits and everything built ---------- */

/** The nearest a line comes to a point (world) */
function lineDistance(c: Line, x: number, z: number, every = 1) {
  let best = Infinity;
  for (let i = 0; i < c.x.length; i += every) {
    const d = (c.x[i] - x) ** 2 + (c.z[i] - z) ** 2;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}
/** The nearest the circuit or the pit lane comes to a point (world) */
export const circuitDistance = (x: number, z: number) => Math.min(lineDistance(CIRCUIT, x, z), lineDistance(PIT_LANE, x, z));
/** Everything built on the site (local), for keeping the dressing off it */
export const FIXTURES: LRect[] = [SITE.hut, SITE.garages, SITE.stand, GRANDSTAND, TOWER, TERRACE.stairs, KIOSK, PLAZA, PADDOCK, ...BANKS];
/** Is a spot (local) on open lawn: inside the fence, `margin` past the run-off, off everything built */
export function clearAt(u: number, v: number, margin: number, keepOff: LRect[] = FIXTURES) {
  const [x, z] = toWorld([u, v]);
  if (x < KART_PARK.x0 + 1 || x > KART_PARK.x1 - 1 || z < KART_PARK.z0 + 1 || z > KART_PARK.z1 - 1) return false;
  for (const r of keepOff) if (inL(r, u, v, 1.2)) return false;
  return circuitDistance(x, z) > CLEAR + margin;
}

/* ---------- Trackside: armco, tyre walls, catch fencing ---------- */

/** How far out from the centre line the armco and the tyre walls stand (past the run-off's edge) */
export const ARMCO_OUT = CLEAR + 0.45;
export const TYRE_OUT = CLEAR + 0.05;
/** The armco's height, and a tyre stack's (three tyres) */
export const ARMCO_H = 0.75;
export const TYRE_R = 0.3;

/** One side of the circuit at a sample: where a barrier at `out` stands, if it can */
function sidePoint(i: number, side: number, out: number): Pt | null {
  const c = CIRCUIT;
  const f = frame(c, i * c.step);
  if (enclosed(f)) return null;
  const p: Pt = [f.x + f.nx * out * side, f.z + f.nz * out * side];
  // Clear of every other stretch's run-off (the infield's tight spots, the inside of a bend folding over itself)
  if (lineDistance(c, p[0], p[1]) < out - 0.2) return null;
  // ...the pit lane where it crosses the run-off, the gantry's posts, the flyover's columns
  if (lineDistance(PIT_LANE, p[0], p[1]) < PIT_HALF + 0.8) return null;
  if (GANTRY.posts.some((g) => Math.hypot(g.x - p[0], g.z - p[1]) < 0.9)) return null;
  if (SUPPORTS.some((s) => Math.hypot(s.x - p[0], s.z - p[1]) < 0.7)) return null;
  const [u, v] = toLocal(p);
  if ([SITE.stand, SITE.garages, SITE.hut, TOWER, GRANDSTAND].some((r) => inL(r, u, v, 0.3))) return null;
  if (p[0] < KART_PARK.x0 + 0.6 || p[0] > KART_PARK.x1 - 0.6 || p[1] < KART_PARK.z0 + 0.6 || p[1] > KART_PARK.z1 - 0.6) return null;
  return p;
}
/** Runs of points (world) along one side where `keep` holds, about `gap` apart, at least `min` points long */
function sideRuns(side: number, out: number, gap: number, min: number, keep: (i: number) => boolean = () => true): Pt[][] {
  const c = CIRCUIT;
  const n = c.x.length;
  const runs: Pt[][] = [];
  let cur: Pt[] = [];
  // Start where a run breaks, so none wraps round the start
  let start = 0;
  while (start < n && sidePoint(start, side, out) && keep(start)) start++;
  for (let k = 0; k <= n; k++) {
    const i = (start + k) % n;
    const p = keep(i) ? sidePoint(i, side, out) : null;
    const last = cur[cur.length - 1];
    // (a point at least `gap` on from the last; the run's last point always, so it ends where it ends)
    if (p && (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= gap)) cur.push(p);
    else if (!p && cur.length) {
      const prev = keep((i - 1 + n) % n) ? sidePoint((i - 1 + n) % n, side, out) : null;
      if (prev && prev !== cur[cur.length - 1] && Math.hypot(prev[0] - cur[cur.length - 1][0], prev[1] - cur[cur.length - 1][1]) > 0.3) cur.push(prev);
    }
    if ((!p || k === n) && cur.length) {
      if (cur.length >= min) runs.push(cur);
      cur = [];
    }
  }
  return runs;
}
/** Which side a bend's outside is on (left positive) at a sample, 0 on the straights and gentle bends */
const outsideAt = (i: number) => (Math.abs(CIRCUIT.k[i]) > 0.06 ? -Math.sign(CIRCUIT.k[i]) : 0);
/** The armco: runs of posts two tiles apart (world), both sides */
export const BARRIERS: Pt[][] = [1, -1].flatMap((side) => sideRuns(side, ARMCO_OUT, 2, 3));
/** The tyre walls: stacks a tyre apart round the outside of the bends, in front of the armco (world) */
export const TYRE_WALLS: Pt[][] = [1, -1].flatMap((side) => sideRuns(side, TYRE_OUT, 0.62, 6, (i) => outsideAt(i) === side));
/** The catch fencing: straight runs (local, from and to) in front of the grandstand and along each bank's front, and its height */
export const CATCH_H = 3.2;
export const CATCH: [Pt, Pt][] = [
  [
    [GRANDSTAND.u0 - 1, GRANDSTAND.v1 + 0.5],
    [GRANDSTAND.u1 + 1, GRANDSTAND.v1 + 0.5],
  ],
  ...BANKS.map((b): [Pt, Pt] =>
    b.front === 's'
      ? [
          [b.u0, b.v1 + 0.3],
          [b.u1, b.v1 + 0.3],
        ]
      : b.front === 'e'
        ? [
            [b.u1 + 0.3, b.v0],
            [b.u1 + 0.3, b.v1],
          ]
        : [
            [b.u0 - 0.3, b.v0],
            [b.u0 - 0.3, b.v1],
          ]
  ),
];

/* ---------- Floodlights ---------- */

/** The floodlight towers: tall masts with a bank of lamps, facing the circuit's middle; under the Emporium */
export const FLOOD = { h: 9.6, head: 1.4, half: 0.35 } as const;
export const FLOODLIGHTS: { x: number; z: number; ry: number }[] = (() => {
  const spots: Pt[] = [
    [-7, 3],
    [38, -8],
    [76, -8],
    [93, 2],
    [93, 64],
    [-7, 72],
    [68, 80.5],
    [37.5, 22],
    [62, 40],
    [16, 74],
  ];
  const [mx, mz] = toWorld([42, 36]);
  return spots
    .filter(([u, v]) => clearAt(u, v, 1.2, FIXTURES.filter((r) => r !== PLAZA)))
    .map(([u, v]) => {
      const [x, z] = toWorld([u, v]);
      // ry turns the lamps' faces (+z) towards the middle
      return { x, z, ry: Math.atan2(mx - x, mz - z) };
    });
})();

/* ---------- The car park ---------- */

/** Inside the loop, clear of its asphalt (world x0, z0, x1, z1) */
export const CAR_PARK: Rect = [LOOP.x0 + LOOP.half + 0.3, LOOP.z1 + LOOP.half + 0.3, LOOP.x1 - LOOP.half - 0.3, ROAD.z - ROAD.half - 0.3];
/** A bay's width along its column, and how deep it is */
export const BAY = { w: 2.6, d: 4.4 } as const;
/** Four columns of bays running north-south: one along each side, two back to back in the middle, aisles between; each its x and facing */
export const BAY_COLS: { x: number; yaw: number }[] = (() => {
  const [x0, , x1] = CAR_PARK;
  // (cars.ts's yaw: 0 points +x; noses in, towards the bay's back)
  return [
    { x: x0 + BAY.d / 2, yaw: Math.PI },
    { x: x0 + BAY.d * 1.5 + 5, yaw: 0 },
    { x: x0 + BAY.d * 2.5 + 5, yaw: Math.PI },
    { x: x1 - BAY.d / 2, yaw: 0 },
  ];
})();
export const BAYS: { x: number; z: number; yaw: number }[] = (() => {
  const [, z0, , z1] = CAR_PARK;
  const out: { x: number; z: number; yaw: number }[] = [];
  // (the columns stop short of the ends, leaving the aisles' ends open to the loop)
  const n = Math.floor((z1 - z0 - 10) / BAY.w);
  for (const col of BAY_COLS) for (let i = 0; i < n; i++) out.push({ x: col.x, z: z0 + 5 + (i + 0.5) * BAY.w, yaw: col.yaw });
  return out;
})();
/** The cars parked: model, x, z, yaw, colour; about half the bays taken, seeded */
export const PARKED: [string, number, number, number, string][] = (() => {
  const models = ['hatch', 'sedan', 'pickup', 'van', 'coupe', 'suv'];
  const colours = ['#e23b3b', '#2aabee', '#ffd23f', '#f3f2f7', '#8000ff', '#1fbf6b', '#ff8a3d', '#2b2d3a', '#e219e5'];
  let s = 911;
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const out: [string, number, number, number, string][] = [];
  for (const b of BAYS) {
    if (r() > 0.55) continue;
    out.push([models[Math.floor(r() * models.length)], b.x, b.z, b.yaw + (r() < 0.15 ? Math.PI : 0), colours[Math.floor(r() * colours.length)]]);
  }
  return out;
})();
const CAR_HALF = { l: 1.5, w: 0.62 };

/* ---------- Lamps and trees ---------- */

/**
 * Lamps along Kart Road's north side (on its sidewalk, but at the loop's mouths), round the loop's outside and on the
 * plaza: x, z, which way the arm reaches (ry turns +x towards it) and the ground's height
 */
export const SIDEWALK = { z0: ROAD.z - ROAD.half - 0.8, z1: ROAD.z - ROAD.half } as const;
export const KART_LAMPS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  const north = ROAD.z - ROAD.half - 0.45;
  for (let x = ROAD.x0 + 8; x < ROAD.x1 - 2; x += 12) if (Math.abs(x - LOOP.x0) > LOOP.half + 2 && Math.abs(x - LOOP.x1) > LOOP.half + 2) out.push([x, north, -Math.PI / 2, 0.02]);
  for (let z = ROAD.z - 10; z > LOOP.z1 + 3; z -= 14) out.push([LOOP.x0 - LOOP.half - 0.45, z, 0, 0.02], [LOOP.x1 + LOOP.half + 0.45, z, Math.PI, 0.02]);
  for (let x = LOOP.x0 + 6; x < LOOP.x1 - 3; x += 14) out.push([x, LOOP.z1 - LOOP.half - 0.45, Math.PI / 2, 0.02]);
  for (const [u, v, ry] of [
    [-6, 94, 0],
    [18, 94, Math.PI],
    [2, 86, 0],
    [24, 86, Math.PI],
  ] as const) {
    const [x, z] = toWorld([u, v]);
    out.push([x, z, ry, 0.03]);
  }
  return out;
})();
/** Trees on the lawns: belts along the fence where there's room and clumps in the infield, seeded (x, z, scale, pine) */
export const KART_TREES: [number, number, number, boolean][] = (() => {
  let s = 4747;
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const out: [number, number, number, boolean][] = [];
  const taken: Pt[] = [...FLOODLIGHTS.map((f): Pt => toLocal([f.x, f.z]))];
  const free = (u: number, v: number, d: number) => taken.every(([a, b]) => Math.hypot(a - u, b - v) >= d);
  const tree = (u: number, v: number) => {
    const [x, z] = toWorld([u, v]);
    out.push([x, z, 0.85 + r() * 0.4, r() < 0.3]);
    taken.push([u, v]);
  };
  // Along the fence: the north-east and south-west corners, the east side past the bank
  for (let v = -14; v < 102; v += 3) for (const u of [-12.5, 96.5]) if (clearAt(u, v, 2) && free(u, v, 2.6)) tree(u + (r() - 0.5) * 0.6, v + (r() - 0.5) * 0.8);
  for (let u = -12; u < 97; u += 3) for (const v of [-14.5, 102.5]) if (clearAt(u, v, 2) && free(u, v, 2.6)) tree(u + (r() - 0.5) * 0.8, v + (r() - 0.5) * 0.6);
  // Clumps in the infield and the open lawns
  for (let v = 4; v < 80; v += 4.5)
    for (let u = 4; u < 82; u += 4.5) {
      const uu = u + (r() - 0.5) * 3;
      const vv = v + (r() - 0.5) * 3;
      if (r() > 0.5) continue;
      if (clearAt(uu, vv, 2.4) && free(uu, vv, 2.6)) tree(uu, vv);
    }
  return out;
})();

/* ---------- People ---------- */

/** Someone at the park: where, facing (0 is +z), the ground or seat under them, what they're doing; `trim` ones are left out on phones */
export interface KartFan {
  x: number;
  z: number;
  y: number;
  ry: number;
  act: 'look' | 'chat' | 'sit';
  trim: boolean;
}
/** Facing the nearest point of the circuit */
function towardTrack(x: number, z: number) {
  const c = CIRCUIT;
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < c.x.length; i += 2) {
    const d = (c.x[i] - x) ** 2 + (c.z[i] - z) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return Math.atan2(c.x[best] - x, c.z[best] - z);
}
/** The grandstand's seat height and depth at a tier (k: 0 the front row) */
export const tierAt = (k: number) => {
  const G = GRANDSTAND;
  const depth = (G.v1 - G.v0) / G.tiers;
  return { y: 0.45 + k * G.rise, v: G.v1 - (k + 0.5) * depth, depth };
};
export const KART_PEOPLE: KartFan[] = (() => {
  let s = 2024;
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const out: KartFan[] = [];
  let n = 0;
  const add = (u: number, v: number, y: number, act: KartFan['act'], ry?: number) => {
    const [x, z] = toWorld([u, v]);
    out.push({ x, z, y, ry: ry ?? towardTrack(x, z), act, trim: n++ % 2 === 1 });
  };
  // On the banks, in loose knots along the slope
  for (const b of BANKS) {
    const long = b.front === 's' ? b.u1 - b.u0 : b.v1 - b.v0;
    const count = Math.round(long / 2.2);
    for (let k = 0; k < count; k++) {
      if (r() < 0.35) continue;
      const a = (k + 0.5 + (r() - 0.5) * 0.6) / count;
      const d = 0.2 + r() * 0.55;
      const u = b.front === 's' ? b.u0 + 2.5 + (b.u1 - b.u0 - 5) * a : b.front === 'e' ? b.u1 - (b.u1 - b.u0) * d : b.u0 + (b.u1 - b.u0) * d;
      const v = b.front === 's' ? b.v1 - (b.v1 - b.v0) * d : b.v0 + 2.5 + (b.v1 - b.v0 - 5) * a;
      add(u, v, bankAt(b, u, v), r() < 0.25 ? 'chat' : 'look');
    }
  }
  // In the grandstand, sitting along the tiers
  const G = GRANDSTAND;
  for (let k = 0; k < G.tiers; k++) {
    const t = tierAt(k);
    for (let u = G.u0 + 1; u < G.u1 - 1; u += 1.1) if (r() < 0.32) add(u + (r() - 0.5) * 0.3, t.v - t.depth * 0.1, t.y, 'sit', 0);
  }
  // On the hut's terrace, along its north rail
  const h = SITE.hut;
  for (let u = h.u0 + 1; u < h.u1 - 1; u += 1.3) add(u, h.v0 + 0.8, TERRACE.y + 0.16, r() < 0.3 ? 'chat' : 'look', Math.PI);
  // At the kiosk's window and about the plaza
  for (let k = 0; k < 3; k++) add(KIOSK.u0 - 0.7 - k * 0.75, (KIOSK.v0 + KIOSK.v1) / 2, 0.03, 'look', Math.PI / 2);
  for (const [u, v] of [
    [0, 92],
    [0.8, 92.6],
    [16, 88],
    [-4, 98],
  ] as const)
    add(u, v, 0.03, 'chat', r() * Math.PI * 2);
  // In the paddock, at the tents
  for (const t of TENTS) if (r() < 0.6) add(t.u + (r() - 0.5) * 2, t.v + t.face * (TENT.d / 2 + 0.6), 0.03, r() < 0.5 ? 'chat' : 'look', t.face > 0 ? Math.PI : 0);
  return out;
})();

/* ---------- Solids and the land it covers ---------- */

const lbox = (r: LRect, h: number): Box => [...worldRect(r), h];
export const FACILITY_SOLIDS: Box[] = [
  // (the grandstand in strips front to back, so nothing pushed out of it is pushed far)
  ...[0, 1, 2, 3].map((k) => lbox({ ...GRANDSTAND, v0: GRANDSTAND.v0 + ((GRANDSTAND.v1 - GRANDSTAND.v0) * k) / 4, v1: GRANDSTAND.v0 + ((GRANDSTAND.v1 - GRANDSTAND.v0) * (k + 1)) / 4 }, GRANDSTAND.roof)),
  lbox(TOWER, TOWER.h),
  lbox(TERRACE.stairs, TERRACE.y),
  lbox(KIOSK, KIOSK.h),
  ...[GATE.x0 - 0.3, GATE.x1 + 0.3].map((x): Box => [x - ARCH.post / 2, GATE.z - ARCH.post / 2, x + ARCH.post / 2, GATE.z + ARCH.post / 2, ARCH.h]),
  ...FLOODLIGHTS.map(({ x, z }): Box => [x - FLOOD.half, z - FLOOD.half, x + FLOOD.half, z + FLOOD.half, FLOOD.h]),
  ...PARKED.map(([, x, z, yaw]): Box => {
    const along = Math.abs(Math.cos(yaw)) > 0.5;
    const [hx, hz] = along ? [CAR_HALF.l, CAR_HALF.w] : [CAR_HALF.w, CAR_HALF.l];
    return [x - hx, z - hz, x + hx, z + hz, 1.3];
  }),
];
/** What the outskirts' trees keep off: the site, Kart Road, the loop and its car park */
export const KART_RECTS: Rect[] = [
  [KART_PARK.x0, KART_PARK.z0, KART_PARK.x1, KART_PARK.z1],
  [ROAD.x0, ROAD.z - ROAD.half - 1, ROAD.x1 + 1, ROAD.z + ROAD.half + 1],
  [LOOP.x0 - LOOP.half - 1, LOOP.z1 - LOOP.half - 1, LOOP.x1 + LOOP.half + 1, ROAD.z],
];
/** All of it, for loading its drawing as you approach (districts.ts) */
export const KART_AREA: Rect = [Math.min(...KART_RECTS.map((r) => r[0])), Math.min(...KART_RECTS.map((r) => r[1])), Math.max(...KART_RECTS.map((r) => r[2])), Math.max(...KART_RECTS.map((r) => r[3]))];
