/*
 * How the people on the sidewalks behave (city life plan, Phase 3): the
 * rules life.ts draws on the crowd it already has, and the benches Degen
 * can sit on (walk.ts). DOM-free and tested (tests/pedestrians.test.ts).
 *
 * - Crossings (`crossingLinks()`): where a walked block's corner faces
 *   another's across one street at a lit junction (the zebra), the walkers'
 *   way over. A walker may step across while that street's cars have red
 *   with time enough to get over (`walkLight()`, `redLeft()`); avenues are
 *   too wide for the red and get no links.
 * - Stepping aside: a walker within `NOTICE` of you (further for your car)
 *   stops and looks until you've passed, then carries on (`noticing()`).
 * - The rain hurries them (`hurry()`); late at night fewer are out
 *   (`outAtNight()`).
 * - `BENCHES`: every bench on the map with the way its sitter faces, the
 *   seat `SEAT_H` above the ground there.
 */
import { JUNCTIONS, lightState, phaseOf, type Junction, type Phase, type Pt } from './routes';
import { distToStreet, pointAt, streetLength, type Street } from './streetplan';
import { PARKS, SQUARE } from './downtown';
import { OUTER_PARKS, SQUARE_LAYOUTS } from './outer';
import { THE_BLOCK } from './projects';

/** A way across a street for walkers: from block `a`'s corner `from` to block `b`'s corner `to` */
export interface Link {
  a: number;
  from: Pt;
  b: number;
  to: Pt;
  /** The junction whose lights it waits on, and the phase of the cars it crosses */
  j: Junction;
  phase: Phase;
  len: number;
}

/** The longest crossing a walker takes (tiles): a street with its sidewalks, never an avenue */
export const LINK_MAX = 8;
/** How fast walkers go on a crossing, over their pace */
export const CROSS_PACE = 1.3;
/** Seconds of red a crossing needs beyond its own time, before anyone steps off the kerb */
export const CROSS_MARGIN = 1.5;

/** The nearest point of a street to p: the street's direction there, and how far off it is */
function nearestOn(s: Street, p: Pt): { dir: Pt; d: number } {
  const len = streetLength(s);
  let best = { dir: [1, 0] as Pt, d: Infinity };
  for (let a = 0; a <= len; a += 0.5) {
    const q = pointAt(s, a);
    const d = Math.hypot(q.at[0] - p[0], q.at[1] - p[1]);
    if (d < best.d) best = { dir: q.dir, d };
  }
  return best;
}

/**
 * The crossings between walked blocks (`blocks`: their outlines, in the order the walkers know them):
 * a corner of one and a corner of another, LINK_MAX or less apart, whose middle lies on exactly one
 * street (never across a junction's middle), the way over roughly square to it, at a lit junction
 * within reach that the street runs through. Both ways of each are listed (a to b and b to a).
 */
export function crossingLinks(blocks: Pt[][], streets: Street[], junctions: Junction[] = JUNCTIONS): Link[] {
  const out: Link[] = [];
  const roads = streets.filter((s) => s.lanes > 0 && s.kind !== 'highway' && s.kind !== 'slip');
  const lit = junctions.filter((j) => j.lit);
  for (let a = 0; a < blocks.length; a++)
    for (let b = a + 1; b < blocks.length; b++)
      for (const A of blocks[a])
        for (const B of blocks[b]) {
          const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
          if (len < 2.5 || len > LINK_MAX) continue;
          const M: Pt = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
          const ux = (B[0] - A[0]) / len;
          const uz = (B[1] - A[1]) / len;
          // The streets the middle is on or beside (a corner's crossing hugs the junction: its middle is
          // beside the other street too): the one it's roughly square to is crossed (a triangle's corner
          // sits short of the junction, so its crossing is a little skewed); square to two, it would cut
          // across the junction's middle
          const on = roads.filter((s) => distToStreet(s, M) < s.half + 1.2).map((s) => ({ s, near: nearestOn(s, M) }));
          const across = on.filter(({ near }) => Math.abs(ux * near.dir[0] + uz * near.dir[1]) < 0.65);
          if (across.length !== 1) continue;
          const { s, near } = across[0];
          if (distToStreet(s, M) > 0.6) continue;
          // (on one street's asphalt only: in a junction's middle it would be on two or three)
          if (on.filter((o) => distToStreet(o.s, M) < o.s.half).length !== 1) continue;
          // Over the whole paved width, not clipping a corner
          if (len < s.half * 2 + 1) continue;
          const j = lit.filter((q) => q.streets.includes(s)).sort((p, q) => Math.hypot(p.at[0] - M[0], p.at[1] - M[1]) - Math.hypot(q.at[0] - M[0], q.at[1] - M[1]))[0];
          if (!j || Math.hypot(j.at[0] - M[0], j.at[1] - M[1]) > LINK_MAX) continue;
          const phase = phaseOf(near.dir[0], near.dir[1]);
          out.push({ a, from: A, b, to: B, j, phase, len });
          out.push({ a: b, from: B, b: a, to: A, j, phase, len });
        }
  return out;
}

/** How long the cars' light stays red for `phase` from t (0 if it isn't red), to the half second */
export function redLeft(j: Junction, phase: Phase, t: number): number {
  let k = 0;
  while (k < 60 && lightState(j, phase, t + k) === 'r') k += 0.5;
  return k;
}

/** May a walker at `pace` (tiles/s) step onto this crossing now: red for the cars, with time to get over? */
export function walkLight(link: Link, t: number, pace: number): boolean {
  return redLeft(link.j, link.phase, t) >= link.len / (pace * CROSS_PACE) + CROSS_MARGIN;
}

/** Whether a walker takes the nth crossing they reach (a steady share, each their own pattern) */
export const takesCrossing = (seed: number, n: number) => ((seed + n * 0.618034) % 1) < 0.45;

/** How close you come before a walker stops and looks (tiles), more for a car (`r`: life.ts walker.r) */
export const NOTICE = 1.3;
/** How long they keep looking after you've gone (seconds) */
export const NOTICE_HOLD = 0.7;

/**
 * Noticing you: `hold` counts down once you're out of range. Returns whether the walker is stopped and
 * looking this frame, and leaves `hold` on the state.
 */
export function noticing(state: { hold: number }, dist: number, r: number, on: boolean, dt: number): boolean {
  if (on && dist < NOTICE + r * 0.8) state.hold = NOTICE_HOLD;
  else state.hold = Math.max(0, state.hold - dt);
  return state.hold > 0;
}

/** The walkers' pace in the rain (0 dry to 1 pouring): up to 40% quicker */
export const hurry = (rain: number) => 1 + 0.4 * Math.max(0, Math.min(1, rain));

/** Is the nth walker out at this hour? Late at night (1 to 5) every other one has gone home. */
export const outAtNight = (n: number, hour: number) => !(hour >= 1 && hour < 5 && n % 2 === 1);

/** A bench's seat, above the ground it stands on */
export const SEAT_H = 0.3;

/** Every bench on the map: where, and the way its sitter faces (0 is +z) */
export const BENCHES: { x: number; z: number; ry: number }[] = [
  ...SQUARE.benches.map((b) => ({ x: b.at[0], z: b.at[1], ry: b.ry })),
  ...PARKS.flatMap((p) => p.benches.map((b) => ({ x: b.at[0], z: b.at[1], ry: b.ry }))),
  ...OUTER_PARKS.flatMap((p) => p.benches.map((b) => ({ x: b.at[0], z: b.at[1], ry: b.ry }))),
  ...SQUARE_LAYOUTS.flatMap((p) => p.benches.map((b) => ({ x: b.at[0], z: b.at[1], ry: b.ry }))),
  ...THE_BLOCK.benches.map(([x, z, ry]) => ({ x, z, ry })),
];
