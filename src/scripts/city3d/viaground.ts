/*
 * The raised highway as ground (docs/highway-plan.md Phase 3; DOM-free, tested in tests/viaduct.test.ts): the deck's
 * surface and its ramps' for your car, your bike and a taxi, by how high they are (as the airport's departures deck:
 * the street under it stays the street), the walls up there (the parapets, open where a ramp leaves or joins the
 * deck; each ramp's sides), and where walking is kept off (a ramp's climb: you're turned back at its foot).
 *
 * - `rampAt()`: the nearest ramp to a point, how far off its centre line and its road's height there.
 * - `viaductSurface()`: the road's height at a point on the deck or a ramp; `viaductY()` the same when you're up there
 *   (or near enough to drive onto it), else null.
 * - `VIA_WALLS` (a collision grid, `viaWallsNear()`): boxes along the deck's parapets (`deck`: only for what's up
 *   there, below they'd be walls in the open) and along the ramps' sides (`ramp`: always; nothing drives under a ramp).
 * - `walkOff()`: a walker's step onto a ramp where it's climbed off the ground but not yet high enough to walk under.
 */
import { BoxGrid } from './boxgrid';
import type { Box } from './solids';
import { HIGHWAY_HALF, fromHighway } from './highway';
import { PLAN, distToStreet } from './streetplan';
import { BESIDE, DECK_HALF, DECK_Y, EXITS, PARAPET, RAMPS, RAMP_HALF, RING_LEN, ringPoint, ringS, type Pt, type Ramp } from './viaduct';

/** How far under a surface you can be and still drive up onto it (a kerb's worth, and the step of a climb) */
export const VIA_STEP = 0.6;
/** A ramp's road this high or more: walked under (its girder over a walker's head) */
export const WALK_UNDER = 2.6;
/** A ramp's road this high or more over the ground: walked onto no further */
export const WALK_OFF = 0.35;

/** Each ramp's segments in cells of 4 (a look-up touches the cell and the eight round it) */
const CELL = 4;
type Seg = { r: Ramp; k: number; a: Pt; b: Pt; ya: number; yb: number };
const GRID = new Map<number, Seg[]>();
const gkey = (i: number, j: number) => (i + 2048) * 4096 + (j + 2048);
for (const r of RAMPS)
  for (let k = 1; k < r.pts.length; k++) {
    const [a, b] = [r.pts[k - 1], r.pts[k]];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-9) continue;
    const seg: Seg = { r, k, a, b, ya: r.ys[k - 1], yb: r.ys[k] };
    const [i0, i1] = [Math.floor((Math.min(a[0], b[0]) - RAMP_HALF) / CELL), Math.floor((Math.max(a[0], b[0]) + RAMP_HALF) / CELL)];
    const [j0, j1] = [Math.floor((Math.min(a[1], b[1]) - RAMP_HALF) / CELL), Math.floor((Math.max(a[1], b[1]) + RAMP_HALF) / CELL)];
    for (let i = i0; i <= i1; i++)
      for (let j = j0; j <= j1; j++) {
        const l = GRID.get(gkey(i, j));
        if (l) l.push(seg);
        else GRID.set(gkey(i, j), [seg]);
      }
  }

/** The ramp nearest x, z (within a cell or so): which, how far off its centre line, its road's height there */
export function rampAt(x: number, z: number): { r: Ramp; d: number; y: number } | null {
  const l = GRID.get(gkey(Math.floor(x / CELL), Math.floor(z / CELL)));
  if (!l) return null;
  let best: { r: Ramp; d: number; y: number } | null = null;
  for (const s of l) {
    const [vx, vz] = [s.b[0] - s.a[0], s.b[1] - s.a[1]];
    const t = Math.max(0, Math.min(1, ((x - s.a[0]) * vx + (z - s.a[1]) * vz) / (vx * vx + vz * vz)));
    const d = Math.hypot(x - s.a[0] - vx * t, z - s.a[1] - vz * t);
    if (!best || d < best.d) best = { r: s.r, d, y: s.ya + (s.yb - s.ya) * t };
  }
  return best;
}

/** The road's height at x, z on the deck (inside its parapets, `m` in from them) or a ramp (`m` in from its kerbs), else null */
export function viaductSurface(x: number, z: number, m = 0): number | null {
  const rp = rampAt(x, z);
  const onRamp = rp && rp.d <= RAMP_HALF - m ? rp.y : null;
  const onDeck = fromHighway(x, z) <= HIGHWAY_HALF - m ? DECK_Y : null;
  return onDeck ?? onRamp;
}
/** The deck or a ramp under you: its surface when you're up there (or near enough to drive up onto it), else null */
export function viaductY(x: number, z: number, y: number, m = 0): number | null {
  const s = viaductSurface(x, z, m);
  return s !== null && s > 0.01 && y >= s - VIA_STEP ? s : null;
}
/** A walker's step onto a ramp where it's off the ground and still too low to walk under (`m` round them) */
export function walkOff(x: number, z: number, m = 0) {
  const rp = rampAt(x, z);
  return !!rp && rp.d <= RAMP_HALF + m && rp.y > WALK_OFF && rp.y < WALK_UNDER;
}

/* ---------- The walls ---------- */

/** The walls' thickness and how far they reach over the road */
const T = 0.15;
const UP = PARAPET + 0.4;
/**
 * Where along the ring each side's parapet is open for a ramp joining or leaving the deck (s from, to; inside -1,
 * outside 1): its taper, where it's in from alongside the deck to its outer lane (alongside, the parapet's between)
 */
export const DECK_GAPS: { q: 1 | -1; s0: number; s1: number }[] = RAMPS.map((r) => {
  const ss = r.pts.filter((p) => fromHighway(p[0], p[1]) < BESIDE - 0.3).map((p) => ringS(p[0], p[1]).s);
  // (the stretch doesn't straddle the ring's seam: no exit is at s 0)
  return { q: r.q, s0: Math.min(...ss) - 0.5, s1: Math.max(...ss) + 0.5 };
});
/** Is the deck's parapet on side q open at s */
export const deckGap = (q: 1 | -1, s: number) => DECK_GAPS.some((g) => g.q === q && s >= g.s0 && s <= g.s1);
/** A thin box round a stretch from a to b, up to `top` (none longer than a step: a box round a slanting one is wide) */
const wallBox = (a: Pt, b: Pt, top: number): Box => [Math.min(a[0], b[0]) - T / 2, Math.min(a[1], b[1]) - T / 2, Math.max(a[0], b[0]) + T / 2, Math.max(a[1], b[1]) + T / 2, top];

/** The deck's parapets (both sides, a box a tile along, broken at the ramps' gaps) */
const DECK_BOXES: Box[] = (() => {
  const out: Box[] = [];
  const n = Math.ceil(RING_LEN);
  for (let k = 0; k < n; k++) {
    const [s0, s1] = [(k * RING_LEN) / n, ((k + 1) * RING_LEN) / n];
    for (const q of [-1, 1] as const) {
      if (deckGap(q, (s0 + s1) / 2)) continue;
      const o = q * (HIGHWAY_HALF + T / 2);
      out.push(wallBox(ringPoint(s0, o), ringPoint(s1, o), DECK_Y + UP));
    }
  }
  return out;
})();
/** A ramp's parapet: its inner face and outer face off the centre line (the wall stands between them) */
export const RAMP_PARAPET = { in: RAMP_HALF - 0.2, out: RAMP_HALF + 0.05 };
/** A ramp's sides, segment by segment: off its arterial's asphalt, not over the deck, and each with its parapet or not */
export interface RampSeg {
  k: number;
  a: Pt;
  b: Pt;
  /** Its left (+1, of the way it's driven) and right (-1) sides: a parapet there */
  left: boolean;
  right: boolean;
  /** Within its arterial's asphalt (its foot: drawn by the arterial's) */
  foot: boolean;
}
/**
 * A ramp's segments with their parapets: none within its arterial's asphalt, none over the deck, and none on its side
 * by the deck where it runs alongside or joins it (the deck's own parapet is the wall there, open where it joins)
 */
export function rampSegs(r: Ramp): RampSeg[] {
  const art = PLAN.streets.find((s) => s.id === EXITS.find((e) => e.n === r.exit)!.street)!;
  const out: RampSeg[] = [];
  for (let k = 1; k < r.pts.length; k++) {
    const [a, b] = [r.pts[k - 1], r.pts[k]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l < 1e-9) continue;
    const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const foot = distToStreet(art, mid) < art.half + 0.3;
    const [nx, nz] = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
    const mc = fromHighway(mid[0], mid[1]);
    const side = (sd: number) => {
      if (foot) return false;
      const w = sd * RAMP_HALF;
      const m = fromHighway(mid[0] + nx * w, mid[1] + nz * w);
      if (m < DECK_HALF - 0.1) return false;
      return !(m < mc && mc < BESIDE + 0.6);
    };
    out.push({ k, a, b, left: side(1), right: side(-1), foot });
  }
  return out;
}
/** Each ramp's sides as walls (the parapets' middles, up to a car's door over the road), always: nothing drives under a ramp */
const RAMP_BOXES: Box[] = RAMPS.flatMap((r) =>
  rampSegs(r).flatMap((sg) => {
    const l = Math.hypot(sg.b[0] - sg.a[0], sg.b[1] - sg.a[1]);
    const [nx, nz] = [-(sg.b[1] - sg.a[1]) / l, (sg.b[0] - sg.a[0]) / l];
    const top = Math.max(r.ys[sg.k - 1], r.ys[sg.k]) + UP;
    const w0 = (RAMP_PARAPET.in + RAMP_PARAPET.out) / 2;
    return ([[1, sg.left], [-1, sg.right]] as const)
      .filter(([, on]) => on)
      .map(([sd]): Box => wallBox([sg.a[0] + nx * w0 * sd, sg.a[1] + nz * w0 * sd], [sg.b[0] + nx * w0 * sd, sg.b[1] + nz * w0 * sd], top));
  })
);
/** How far apart a ramp's piers are, and how high it must be for piers (lower, it stands on a filled bank between walls) */
export const RAMP_PIER = { gap: 10, from: 1.6, half: 0.3 };
/** A ramp's piers: under its centre line where it's high, clear of the deck (x, z, the road's height there) */
export const RAMP_PIERS: [number, number, number][] = RAMPS.flatMap((r) => {
  const out: [number, number, number][] = [];
  let run = RAMP_PIER.gap / 2;
  for (let k = 1; k < r.pts.length; k++) {
    const [a, b] = [r.pts[k - 1], r.pts[k]];
    run += Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (run < RAMP_PIER.gap) continue;
    if (r.ys[k] < RAMP_PIER.from || fromHighway(b[0], b[1]) < DECK_HALF + RAMP_PIER.half + 0.6) continue;
    run = 0;
    out.push([b[0], b[1], r.ys[k]]);
  }
  return out;
});
/** What's solid of the ramps: their piers (to under the road) */
export const RAMP_PIER_SOLIDS: Box[] = RAMP_PIERS.map(([x, z, y]): Box => [x - RAMP_PIER.half, z - RAMP_PIER.half, x + RAMP_PIER.half, z + RAMP_PIER.half, y - 0.5]);
/** Every wall, in one grid; a box's kind by its place in it (the deck's first) */
const VIA_GRID = new BoxGrid([...DECK_BOXES, ...RAMP_BOXES]);
const DECK_N = DECK_BOXES.length;
const DECK_SET = new Set<Box>(DECK_BOXES);
export const VIA_WALLS = { deck: DECK_N, ramp: RAMP_BOXES.length };
/**
 * The walls near x, z for a car `y` up (within `r`): the ramps' sides always; the deck's parapets only up there (down
 * below they'd be walls in the open)
 */
export function viaWallsNear(x: number, z: number, r: number, y: number, out: Box[] = []): Box[] {
  for (const b of VIA_GRID.near(x, z, r)) if (y > 1 || !DECK_SET.has(b)) out.push(b);
  return out;
}
