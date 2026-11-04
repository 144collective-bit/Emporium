/*
 * The raised highway's shape (docs/highway-plan.md Phase 1, the owner's calls: raised all the way round on a modern
 * concrete box-girder viaduct, eight exits as partial cloverleafs). DOM-free, tested in tests/viaduct.test.ts.
 * Nothing reads it yet: the street plan, the drawing and the traffic take it up in Phases 2 and 3.
 *
 * - **The ring** (`ringAt()`, `ringS()`, `ringPoint()`): the highway's centre line worked out exactly on its rounded
 *   box (highway.ts `HIGHWAY_BOX`, `HIGHWAY_R`), measured by `s` along it from the middle of its north side heading
 *   east (clockwise seen from above), and `o` across it, outward positive. The clockwise carriageway keeps to the
 *   inside (traffic keeps right), the anticlockwise one to the outside.
 * - **The deck** (`DECK_Y`): its surface over the ground all the way round, deep enough under it (`GIRDER`) to leave
 *   every street passing under `CLEARANCE`, the parapets `PARAPET` over it.
 * - **The exits** (`EXITS`): eight, numbered clockwise from the stadium, each at an arterial's junction today. The
 *   arterials cross the ring in clusters 18 to 26 apart along its sides, far too close for a ramp to climb between
 *   them, so every exit lays its four ramps on its corner side (`side`: the way along the ring with room): a
 *   partial cloverleaf (`RAMPS`). In each of the two quadrants there (inside and outside the ring) a loop (`loop`)
 *   nearest the junction and a straight ramp (`straight`) round the outside of it, each meeting the arterial at a
 *   terminal of its own (`TERMINAL`), so every direction can get off and on.
 * - **The piers** (`PIER_GAP`, `PIER`; placed by viapiers.ts, `PIERS`): under the median, clear of every street
 *   that passes under, the river's boat lanes (its spans' piers are the bridges' today), the metro and Lot 9's tunnel.
 */
import { HIGHWAY_BOX, HIGHWAY_HALF, HIGHWAY_R } from './highway';
import { LANE, MEDIAN } from './layout';

export type Pt = [number, number];

/* ---------- The ring ---------- */

const [X0, Z0, X1, Z1] = HIGHWAY_BOX;
const R = HIGHWAY_R;
const CX = (X0 + X1) / 2;
const SIDE_X = X1 - X0 - 2 * R;
const SIDE_Z = Z1 - Z0 - 2 * R;
const ARC = (Math.PI / 2) * R;

type Seg = { len: number; at(u: number): { x: number; z: number; tx: number; tz: number } };
const line = (ax: number, az: number, tx: number, tz: number, len: number): Seg => ({ len, at: (u) => ({ x: ax + tx * u, z: az + tz * u, tx, tz }) });
const arc = (cx: number, cz: number, a0: number): Seg => ({
  len: ARC,
  at: (u) => {
    const a = a0 + u / R;
    return { x: cx + Math.cos(a) * R, z: cz + Math.sin(a) * R, tx: -Math.sin(a), tz: Math.cos(a) };
  },
});
/** The ring's pieces in order, from the middle of the north side heading east */
const SEGS: Seg[] = [
  line(CX, Z0, 1, 0, X1 - R - CX),
  arc(X1 - R, Z0 + R, -Math.PI / 2),
  line(X1, Z0 + R, 0, 1, SIDE_Z),
  arc(X1 - R, Z1 - R, 0),
  line(X1 - R, Z1, -1, 0, SIDE_X),
  arc(X0 + R, Z1 - R, Math.PI / 2),
  line(X0, Z1 - R, 0, -1, SIDE_Z),
  arc(X0 + R, Z0 + R, Math.PI),
  line(X0 + R, Z0, 1, 0, CX - X0 - R),
];
const STARTS = SEGS.reduce<number[]>((a, s, i) => [...a, i ? a[i - 1] + SEGS[i - 1].len : 0], []);
/** The ring's length */
export const RING_LEN = STARTS.at(-1)! + SEGS.at(-1)!.len;

/** `s` brought into 0..RING_LEN */
export const wrapS = (s: number) => ((s % RING_LEN) + RING_LEN) % RING_LEN;
/** The signed way from `a` to `b` along the ring, the short way round */
export const sGap = (a: number, b: number) => {
  const d = wrapS(b - a);
  return d > RING_LEN / 2 ? d - RING_LEN : d;
};

export interface RingAt {
  x: number;
  z: number;
  /** The way along it (clockwise) */
  tx: number;
  tz: number;
  /** Outward */
  nx: number;
  nz: number;
}
/** The ring's centre line at `s` */
export function ringAt(s: number): RingAt {
  const w = wrapS(s);
  let i = SEGS.length - 1;
  while (i > 0 && STARTS[i] > w) i--;
  const p = SEGS[i].at(Math.min(w - STARTS[i], SEGS[i].len));
  return { ...p, nx: p.tz, nz: -p.tx };
}
/** The point `o` out from the centre line at `s` (outward positive) */
export function ringPoint(s: number, o: number): Pt {
  const r = ringAt(s);
  return [r.x + r.nx * o, r.z + r.nz * o];
}
/** Where x, z is on the ring: its `s` and its offset `o` (outward positive) from the nearest point of the centre line */
export function ringS(x: number, z: number): { s: number; o: number } {
  let best = { s: 0, o: 0 };
  let bestD = Infinity;
  SEGS.forEach((seg, i) => {
    // Each piece is short enough to search in a few steps, then refine
    let lo = 0;
    let hi = seg.len;
    for (let k = 0; k < 40; k++) {
      const a = lo + (hi - lo) / 3;
      const b = hi - (hi - lo) / 3;
      const pa = seg.at(a);
      const pb = seg.at(b);
      if (Math.hypot(pa.x - x, pa.z - z) < Math.hypot(pb.x - x, pb.z - z)) hi = b;
      else lo = a;
    }
    const u = (lo + hi) / 2;
    const p = seg.at(u);
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bestD) {
      bestD = d;
      best = { s: STARTS[i] + u, o: (x - p.x) * p.tz + (z - p.z) * -p.tx };
    }
  });
  return { s: wrapS(best.s), o: best.o };
}

/* ---------- The deck ---------- */

/** The deck's surface over the ground (about 6.8 m) */
export const DECK_Y = 3.8;
/** The box girder's depth under the surface */
export const GIRDER = 1.0;
/** What's left under it for the streets that pass under (about 5 m) */
export const CLEARANCE = DECK_Y - GIRDER;
/** The parapets over the deck */
export const PARAPET = 0.6;
/** The deck's half width: the highway's (the median, two lanes and the hard shoulder each way) and the parapet */
export const DECK_HALF = HIGHWAY_HALF + 0.3;
/** The outer lane's centre, each way */
export const OUTER_LANE = MEDIAN / 2 + LANE * 1.5;

/* ---------- The exits ---------- */

export interface Exit {
  /** Numbered clockwise from the stadium */
  n: number;
  /** The crossing at the arterial today (streetplan.ts) */
  crossing: string;
  /** The arterial (its street in the plan) */
  street: string;
  /** Where the arterial passes under (the crossing's point) */
  at: Pt;
  /** Made-up names for the signs */
  name: string;
  /** The way along the ring (+1 clockwise) its ramps lie: the corner side, with room */
  side: 1 | -1;
}

/** Each exit's arterial crossing today, its names and the way its ramps lie */
const EXIT_DATA: [string, string, Pt, string, 1 | -1][] = [
  ['highway-ns0-1', 'ns0', [-4.5, -170], 'Stadium · Westlake Park', -1],
  ['highway-ns3-0', 'ns3', [64.5, -170], 'Kart Park · Starlight Mall', 1],
  ['highway-ew0-0', 'ew0', [275, -4.5], 'Crestmont · Sunridge', -1],
  ['highway-ew4-0', 'ew4', [275, 137], 'Airport · Harbour', 1],
  ['highway-ns3-1', 'ns3', [64.5, 320], 'Southfield · General Aviation', -1],
  ['highway-ns0-0', 'ns0s', [-4.5, 320], 'Lot 9 · The Trenches', 1],
  ['highway-ew4-1', 'ew4', [-215, 137], 'Southbank Docks', -1],
  ['highway-ew0-1', 'ew0', [-215, -4.5], 'Uptown · Westlake Park', 1],
];
export const EXITS: Exit[] = EXIT_DATA.map(([crossing, street, at, name, side], i) => ({ n: i + 1, crossing, street, at, name, side }));
/** Each exit's place along the ring */
export const exitS = (e: Exit) => ringS(e.at[0], e.at[1]).s;

/* ---------- The ramps ---------- */

/** A ramp's half width (one lane and its kerbs) */
export const RAMP_HALF = 1.3;
/** The steepest a ramp climbs */
export const RAMP_GRADE = 0.07;
/** A ramp's lane alongside the deck before it joins (or after it leaves) the outer lane */
export const BESIDE = DECK_HALF + RAMP_HALF;
/**
 * A partial cloverleaf's quadrant (along `s` from the junction, `o` out from the centre line): the loop's radius, the
 * loop's turn (`c`, along `s`), where it joins the deck (`join`), its terminal's offset on the arterial (`loopAt`);
 * the straight ramp's terminal offset (`straightAt`), how far it runs out round the loop at that offset (`out`), where
 * it's alongside the deck (`beside`) and where it joins (`join2`); `flat` at grade by the terminal; `taper` to merge
 */
export const QUAD = { r: 9, c: 38, join: 26, loopAt: BESIDE + 18, straightAt: BESIDE + 18 + 9.5, out: 50, beside: 74, join2: 80, flat: 5, taper: 12 };
/** How far along the ring from the junction a cloverleaf reaches */
export const REACH = QUAD.join2 + QUAD.taper;

export type RampKind = 'off' | 'on';
export interface Ramp {
  id: string;
  /** Its exit's number */
  exit: number;
  kind: RampKind;
  /** The loop by the junction or the straight ramp round it */
  shape: 'loop' | 'straight';
  /** Inside (-1) or outside (+1) the ring */
  q: 1 | -1;
  /** Its centre line the way traffic drives it: an off-ramp from the deck to its terminal, an on-ramp the other way */
  pts: Pt[];
  /** The road's height at each point */
  ys: number[];
  /** Its terminal on the arterial (the end at grade) */
  terminal: Pt;
}

/** A smooth step from 0 at a to 1 at b */
const ease = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A path in (s, o) round the quadrant, from the terminal out to where it joins the deck, every tile or so */
function quadPath(shape: 'loop' | 'straight', q: 1 | -1): [number, number][] {
  const Q = QUAD;
  const out: [number, number][] = [];
  if (shape === 'loop') {
    // Out along the arterial's side at `loopAt`, round the turn towards the deck, and back alongside it to join
    for (let u = 0; u < Q.c; u += 1) out.push([u, Q.loopAt]);
    const mid = (Q.loopAt + BESIDE) / 2;
    const rr = (Q.loopAt - BESIDE) / 2;
    const n = Math.ceil((Math.PI * rr) / 1);
    for (let k = 0; k <= n; k++) {
      const a = (k / n) * Math.PI;
      out.push([Q.c + Math.sin(a) * rr, mid + Math.cos(a) * rr]);
    }
    for (let u = Q.c - 1; u >= Q.join - Q.taper; u -= 1) out.push([u, u > Q.join ? BESIDE : BESIDE - (BESIDE - OUTER_LANE) * ease(Q.join, Q.join - Q.taper, u)]);
  } else {
    // Out at `straightAt` past the loop, in to alongside the deck, and on to join
    for (let u = 0; u <= Q.join2 + Q.taper; u += 1) {
      const o = Q.straightAt - (Q.straightAt - BESIDE) * ease(Q.out, Q.beside, u);
      out.push([u, u <= Q.join2 ? o : BESIDE - (BESIDE - OUTER_LANE) * ease(Q.join2, Q.join2 + Q.taper, u)]);
    }
  }
  return out.map(([u, o]) => [u, o * q] as [number, number]);
}

/** Eased into and out of the climb over this, each end (a vertical curve) */
const EASE = 6;
/**
 * Heights along a path from its terminal (0) up to the deck: flat by the terminal (`QUAD.flat`), then an even climb
 * eased in and out, at the deck's height from point `joinFrom` on (alongside the deck to join it)
 */
function heights(pts: Pt[], joinFrom: number) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[joinFrom] - QUAD.flat;
  const E = Math.min(EASE, L / 3);
  const g = DECK_Y / (L - E);
  return cum.map((d) => {
    const t = d - QUAD.flat;
    if (t <= 0) return 0;
    if (t >= L) return DECK_Y;
    if (t < E) return (g * t * t) / (2 * E);
    if (t > L - E) return DECK_Y - (g * (L - t) * (L - t)) / (2 * E);
    return g * (t - E / 2);
  });
}

/** The quadrants' ramps for an exit */
function rampsOf(e: Exit): Ramp[] {
  const s0 = exitS(e);
  const out: Ramp[] = [];
  for (const q of [-1, 1] as const) {
    // The carriageway on this side heads clockwise inside, anticlockwise outside
    const dir = q < 0 ? 1 : -1;
    // Away from the junction towards the corner, traffic there leaves past the junction (the loop is its off-ramp)
    // and joins from the straight ramp; coming in from the corner it leaves by the straight ramp and joins by the loop
    const away = dir === e.side;
    for (const shape of ['loop', 'straight'] as const) {
      const path = quadPath(shape, q);
      const world = path.map(([u, o]) => ringPoint(s0 + e.side * u, o));
      // Where it's alongside the deck and climbing no more: the loop from its turn back, the straight from `beside`
      const joinIx = shape === 'loop' ? path.findIndex(([u], i) => i > 0 && path[i - 1][0] > u && u <= QUAD.c) : path.findIndex(([u]) => u >= QUAD.beside);
      const ys = heights(world, joinIx);
      const kind: RampKind = (shape === 'loop') === away ? 'off' : 'on';
      // An off-ramp is driven from the deck down: the path reversed
      const pts = kind === 'off' ? [...world].reverse() : world;
      out.push({ id: `exit${e.n}-${q < 0 ? 'in' : 'out'}-${shape}`, exit: e.n, kind, shape, q, pts, ys: kind === 'off' ? [...ys].reverse() : ys, terminal: world[0] });
    }
  }
  return out;
}

export const RAMPS: Ramp[] = EXITS.flatMap(rampsOf);

/** The steepest stretch of a ramp */
export function steepest(r: Ramp) {
  let g = 0;
  for (let i = 1; i < r.pts.length; i++) {
    const d = Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]);
    if (d > 1e-6) g = Math.max(g, Math.abs(r.ys[i] - r.ys[i - 1]) / d);
  }
  return g;
}

/* ---------- The piers ---------- */

/** Between the piers along the ring, at most */
export const PIER_GAP = 14;
/** A pier's footprint across the ring (its stem) and along it */
export const PIER = { across: 2.2, along: 1.2, head: 2 * DECK_HALF - 1 };
