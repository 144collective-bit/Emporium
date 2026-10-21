/*
 * The kart park rebuild, Phase 1 (docs/kart-plan.md): the new circuit as
 * data. One closed loop with no junctions, raced forward and in reverse,
 * narrower than the old network (TRACK_W 5.6, six karts abreast), with
 * kerbs and grass-and-gravel run-off either side and nothing solid on or
 * near it. Free of the DOM and of scene code, tested in
 * tests/kartcircuit.test.ts.
 *
 * It's built beside the old track network (kartpark.ts) so the park keeps
 * running until the racing rules (Phase 2) and the drawing (Phase 3) move
 * onto it; it shares the park's site, its local numbers (u east, v south)
 * and its sampling (`sampleLine()`, `frame()`, `locate()`).
 *
 * Raced forward, the loop goes clockwise, twelve corners, lefts and rights:
 * - the start/finish straight west along the south, the grandstand on its
 *   infield side, the pit lane and the garages beyond its run-off;
 * - Turn 1 up the west side, the west esses (2, 3) out towards the fence
 *   and back, a banked sweeper in the north-west corner (4);
 * - the hill along the north, dipping south over its crest and back (5, 6),
 *   down into the tunnel, over the jump;
 * - a banked sweeper in the north-east corner (7), a tight right hairpin
 *   (8), a long double-apex left-hander (9, 10) back south into the infield,
 *   down the middle at ground level, round the west loop (11, a long
 *   right-hander);
 * - back across the middle on the flyover (open underneath, FLY_H over the
 *   run below), and the tight south-east turn onto the straight (12).
 * Reverse runs the same surface the other way: every corner flipped, the
 * flyover before the west loop.
 */
import { F, KART_PARK, STEP, at, frame, heightAt, locate, sampleLine, toLocal, toWorld, type CPt, type Line, type Pt } from './kartpark';

/** The track's width and half width (six karts abreast) */
export const TRACK_W = 5.6;
export const TRACK_HALF = TRACK_W / 2;
/** The red-and-white kerbs either side, and the grass and gravel run-off beyond them */
export const KERB = 0.6;
export const RUNOFF = 4.6;
/** From the centre line to the run-off's outer edge: nothing solid stands closer */
export const CLEAR = TRACK_HALF + KERB + RUNOFF;
/** The flyover's deck over the diagonal it crosses */
export const FLY_H = 2.6;
/** The sweepers' banking (the surface's slope across the track) and the centre line's lift so the low edge rests on the ground */
export const BANK = 0.28;
export const BANK_H = BANK * TRACK_HALF;
/** The hill's crest, and the jump's lip */
export const HILL_H = 3;
export const JUMP_H = 0.9;
/** The steepest a ramp may climb (height per tile) */
export const MAX_SLOPE = 0.3;
/** The tightest a corner may be (radius in tiles) */
export const MIN_RADIUS = 6;

export type Tag = 'line' | 'jump' | 'pit-in' | 'pit-out' | `turn-${number}`;
type Opt = Omit<CPt, 'u' | 'v'> & { tag?: Tag; pad?: boolean };
interface CirPt extends CPt {
  tag?: Tag;
  /** A boost pad starts here (in whichever direction it's raced) */
  pad?: boolean;
}
const P = (u: number, v: number, o: Opt = {}): CirPt => ({ u, v, ...o });
/** Banked: right-handers forward, so the outside (left) edge is up (roll negative: the right side down) */
const banked = (u: number, v: number, o: Opt = {}): CirPt => P(u, v, { roll: -BANK, h: BANK_H, f: F.bank, ...o });

/**
 * The centre line raced forward (clockwise on the map), starting on the start/finish straight.
 * Corners are numbered in the forward direction (`turn-n` tags at their apexes), for the boards
 * Phase 3 puts up.
 */
const PTS: CirPt[] = [
  // The start/finish straight, heading west (the line is at START_U)
  P(100, 115, { tag: 'line' }),
  P(60, 115),
  P(32, 115),
  // Turn 1: right, up the west side
  P(20, 112.5),
  P(15.5, 104, { tag: 'turn-1' }),
  // Turns 2 and 3: the west esses, out towards the fence and back
  P(15, 94, { pad: true }),
  P(13, 85.5),
  P(9.5, 77, { tag: 'turn-2' }),
  P(9.5, 67),
  P(13, 59, { tag: 'turn-3' }),
  P(15, 50),
  P(15.5, 43),
  // Turn 4: the banked north-west sweeper
  banked(16.5, 34),
  banked(21.5, 23, { tag: 'turn-4' }),
  banked(31, 17),
  // Turns 5 and 6: the hill, dipping south over its crest and back, down into the tunnel, over the jump
  P(40, 16, { pad: true }),
  P(48, 17.5, { h: 0.8 }),
  P(56, 22.5, { h: 2, tag: 'turn-5' }),
  P(64, 24.5, { h: HILL_H }),
  P(72, 22, { h: 2 }),
  P(79, 17.5, { h: 0.8, tag: 'turn-6' }),
  P(86, 16, { f: F.tunnel }),
  P(93, 16.2, { pad: true }),
  P(100, 16.6, { h: JUMP_H, tag: 'jump' }),
  P(107, 17.6),
  // Turn 7: the banked north-east sweeper, round to the south
  banked(116, 21),
  banked(123, 30, { tag: 'turn-7' }),
  banked(125, 41),
  // Turn 8: the hairpin, right round and back north (an arc of radius 8.5 round (116.5, 50))
  P(125, 50),
  P(123.9, 54.3),
  P(120.8, 57.4),
  P(116.5, 58.5, { tag: 'turn-8' }),
  P(112.2, 57.4),
  P(109.1, 54.3),
  P(108, 50),
  // Turns 9 and 10: a long left-hander (radius 11 round (97, 44.5)), back south into the infield
  P(108, 44.5),
  P(104.8, 36.7, { tag: 'turn-9' }),
  P(97, 33.5),
  P(89.2, 36.7, { tag: 'turn-10' }),
  P(86, 44.5),
  // Down the middle at ground level, under the flyover
  P(84, 55, { pad: true }),
  P(79.6, 65),
  P(76.3, 75.3),
  P(73, 84.5),
  // Turn 11: the west loop, a long right-hander in the infield
  P(64, 90),
  P(54, 90),
  P(44.5, 88.5),
  P(37.5, 82),
  P(36.5, 72, { tag: 'turn-11' }),
  P(40.5, 62.5),
  P(48.5, 57),
  // The flyover: up off the loop, over the run below, down to the south-east
  P(57, 58.3, { pad: true }),
  P(63.5, 63.6, { h: FLY_H / 2, f: F.deck }),
  P(69.5, 68.8, { h: FLY_H, f: F.deck }),
  P(76.3, 75.3, { h: FLY_H, f: F.deck }),
  P(83, 82, { h: FLY_H, f: F.deck }),
  P(89.5, 87.5, { h: FLY_H / 2, f: F.deck }),
  P(97, 92.3),
  // Turn 12: the tight south-east right-hander onto the straight (an arc of radius 9 round (104, 106))
  P(103, 95.5),
  P(108.6, 98.3),
  P(111.8, 101.5),
  P(113, 106, { tag: 'turn-12' }),
  P(111.8, 110.5),
  P(108.5, 113.8),
  P(104, 115),
];

/** The start / finish line crosses the straight here (local u) */
export const START_U = 84;

/* ---------- The two courses: the circuit forward and in reverse ---------- */

export type CourseId = 'circuit' | 'circuit-reverse';
export const COURSE_IDS: CourseId[] = ['circuit', 'circuit-reverse'];
/** A boost pad's length along the track (it spans the track's width) */
export const PAD_LEN = 4;
/** The usual lap count */
export const LAPS = 3;
const NAMES: Record<CourseId, { name: string; blurb: string }> = {
  circuit: { name: 'Sector 7 Circuit', blurb: 'Twelve corners: the west esses, the banked sweepers, the hill and its jump, the hairpin, the loop and the flyover.' },
  'circuit-reverse': { name: 'Sector 7 Circuit · reverse', blurb: 'The same circuit the other way round: every corner flipped, the flyover before the loop, the jump off the hill the other side.' },
};
/** The conditions a race runs in: night is the looks only; rain takes grip away everywhere (kart-sim.ts) */
export type Cond = 'day' | 'night' | 'rain';
export const CONDS: Record<Cond, { name: string }> = { day: { name: 'Day' }, night: { name: 'Night' }, rain: { name: 'Rain' } };
export interface Course extends Line {
  id: CourseId;
  name: string;
  blurb: string;
  reverse: boolean;
  laps: number;
  /** Where the start line crosses (s), and the jump's lip */
  start: number;
  jump: number;
  /** The boost pads: where each starts (s) and how long it is, in this direction */
  pads: { s: number; len: number }[];
  /** The numbered corners' apexes (s), numbered in this direction */
  turns: { n: number; s: number }[];
}

function makeCourse(id: CourseId): Course {
  const reverse = id === 'circuit-reverse';
  // Reversed: the same points the other way round, and the banking flips with the left and right
  const pts: CirPt[] = reverse ? [PTS[0], ...PTS.slice(1).reverse()].map((p) => (p.roll ? { ...p, roll: -p.roll } : p)) : PTS;
  const line = sampleLine(pts, STEP, true);
  const n = line.x.length;
  // The start line: where the straight passes START_U
  let start = 0;
  for (let i = 0; i < n; i++) {
    const [u0, v0] = toLocal([line.x[i], line.z[i]]);
    const [u1] = toLocal([line.x[(i + 1) % n], line.z[(i + 1) % n]]);
    if (v0 > 105 && ((u0 >= START_U && u1 < START_U) || (u0 <= START_U && u1 > START_U))) {
      start = (i + (START_U - u0) / (u1 - u0)) * line.step;
      break;
    }
  }
  const tagged = (t: (tag: Tag) => boolean) => pts.flatMap((p, i) => (p.tag && t(p.tag) ? [{ tag: p.tag, s: line.at[i] }] : []));
  const jump = tagged((t) => t === 'jump')[0]?.s ?? -1;
  // Corners numbered in the order they come after the line
  const turns = tagged((t) => t.startsWith('turn-'))
    .map((t) => t.s)
    .sort((a, b) => ((a - start + line.L) % line.L) - ((b - start + line.L) % line.L))
    .map((s, i) => ({ n: i + 1, s }));
  // A pad starts at its point and runs on in the direction raced
  const pads = pts.flatMap((p, i) => (p.pad ? [{ s: line.at[i], len: PAD_LEN }] : []));
  return { ...line, id, ...NAMES[id], reverse, laps: LAPS, start, jump, pads, turns };
}
export const COURSES: Record<CourseId, Course> = { circuit: makeCourse('circuit'), 'circuit-reverse': makeCourse('circuit-reverse') };
/** The forward circuit: the one physical track (the reverse is the same surface) */
export const CIRCUIT = COURSES.circuit;

/** A kart's width (karts.ts keeps to it) */
export const KART_W = 0.95;
/** How many race in a grid, and the grid's two columns either side of the centre line */
export const GRID = 8;
export const GRID_LATERAL = 1.3;
/** The grid: on the straight behind the line, two abreast and staggered; slot 0 is pole */
export function gridSlots(c: Course): { s: number; lateral: number }[] {
  return Array.from({ length: GRID }, (_, i) => ({ s: c.start - 2.6 - Math.floor(i / 2) * 3.2 - (i % 2) * 1.4, lateral: (i % 2 ? -1 : 1) * GRID_LATERAL }));
}

/* ---------- The pits, the hut, the garages, the grandstand, the gate path ---------- */

/** The pit lane's half width */
export const PIT_HALF = 1.5;
/**
 * The pit lane, forward: off the straight before the line (the east end), west along the garages
 * beyond the run-off, back on after Turn 1's approach (the west end). Coned off during a race.
 */
const PIT_PTS: CirPt[] = [P(101, 116.4, { tag: 'pit-in' }), P(97, 119.5), P(92.5, 124.4), P(86, 125), P(66, 125), P(46, 125), P(40.5, 124.4), P(36, 119.5), P(31, 116.2, { tag: 'pit-out' })];
export const PIT_LANE: Line = sampleLine(PIT_PTS, STEP, false);
/** Where the pit lane runs straight along the garages (local u), clear of the run-off */
export const PIT_STRAIGHT = { u0: 43, u1: 90, v: 125 } as const;

/** Where things stand on the site (local u, v; boxes u0, v0, u1, v1) */
export const SITE = {
  /** The garages along the pit lane's south side, a bay for each kart; the big screen stands on their roof */
  garages: { u0: 44, v0: 127.2, u1: 90, v1: 133.5, h: 3.4 },
  /** The kart hut at the pit lane's west end, its door on the south side towards the gate path */
  hut: { u0: 30, v0: 127.2, u1: 42, v1: 134, h: 3.2, door: [36, 134.7] as Pt },
  /** The grandstand in the infield, facing south over the straight */
  stand: { u0: 50, v0: 100, u1: 92, v1: 106, h: 4.5 },
  /** The big screen on the garages' roof, facing north over the straight */
  screen: { u: 67, v: 130, w: 14, h: 4.5 },
  /** The gate in the south fence (where it's always been, at the slip road), and the path from it to the hut's door */
  gate: { u: 6, w: 5 },
  path: { v: 137.2, u0: 6, u1: 36, half: 1.2 },
} as const;
/** The bays: where each kart waits in front of its garage, on the pit lane's south edge */
export const BAYS: Pt[] = Array.from({ length: GRID }, (_, i) => {
  const w = (SITE.garages.u1 - SITE.garages.u0) / GRID;
  return toWorld([SITE.garages.u0 + w * (i + 0.5), PIT_STRAIGHT.v + 0.6]);
});

/** World footprints: x0, z0, x1, z1, height (solids.ts Box) */
type Box = [number, number, number, number, number];
const box = (b: { u0: number; v0: number; u1: number; v1: number; h: number }): Box => {
  const [x0, z0] = toWorld([b.u0, b.v0]);
  const [x1, z1] = toWorld([b.u1, b.v1]);
  return [x0, z0, x1, z1, b.h];
};
/** The gate's world x range in the south fence */
export const GATE = (() => {
  const [gx] = toWorld([SITE.gate.u, 0]);
  return { x0: gx - SITE.gate.w / 2, x1: gx + SITE.gate.w / 2, z: KART_PARK.z1, inside: [gx, KART_PARK.z1 - 2] as Pt };
})();
/** The hut's door in world numbers, facing south to the gate path */
export const HUT_DOOR = (() => {
  const [x, z] = toWorld(SITE.hut.door);
  return { x, z };
})();
/**
 * What's solid at the park: only the fence (the gate open), the hut, the garages and the grandstand,
 * all well clear of the track and its run-off. The gantry's posts and the flyover's supports stand
 * outside the run-off and aren't solid (the owner's call: nothing to bump into).
 */
export const CIRCUIT_SOLIDS: Box[] = (() => {
  const K = KART_PARK;
  const t = 0.25;
  return [
    [K.x0 - t, K.z0 - t, K.x1 + t, K.z0 + t, 1.2],
    [K.x0 - t, K.z0 - t, K.x0 + t, K.z1 + t, 1.2],
    [K.x1 - t, K.z0 - t, K.x1 + t, K.z1 + t, 1.2],
    [K.x0 - t, K.z1 - t, GATE.x0, K.z1 + t, 1.2],
    [GATE.x1, K.z1 - t, K.x1 + t, K.z1 + t, 1.2],
    box(SITE.hut),
    box(SITE.garages),
    box(SITE.stand),
  ];
})();

/** The start gantry: its posts just outside the run-off either side of the line */
export const GANTRY = (() => {
  const f = frame(CIRCUIT, CIRCUIT.start);
  const reach = CLEAR + 0.5;
  return { x: f.x, z: f.z, posts: [1, -1].map((side) => ({ x: f.x + f.nx * reach * side, z: f.z + f.nz * reach * side })), h: 5.5, half: reach };
})();

/**
 * The flyover's supports: every six tiles along the deck where it's up, either side just outside the
 * run-off, and never in the run-off of the track below.
 */
export const SUPPORTS: { x: number; z: number; h: number }[] = (() => {
  const c = CIRCUIT;
  const out: { x: number; z: number; h: number }[] = [];
  const nearGround = (x: number, z: number) => {
    for (let i = 0; i < c.x.length; i++) if (c.y[i] < 0.5 && Math.hypot(c.x[i] - x, c.z[i] - z) < CLEAR + 0.3) return true;
    return false;
  };
  for (let s = 0; s < c.L; s += 6) {
    const f = frame(c, s);
    if (!(f.flags & F.deck) || f.y < 0.8) continue;
    for (const side of [1, -1]) {
      const x = f.x + f.nx * (CLEAR + 0.4) * side;
      const z = f.z + f.nz * (CLEAR + 0.4) * side;
      if (!nearGround(x, z)) out.push({ x, z, h: f.y });
    }
  }
  return out;
})();

/** Is a point on the circuit's asphalt (or its kerbs), and how far round: for the minimap and the run-off rules */
export function onCircuit(x: number, z: number, hint: number | null = null) {
  const loc = locate(CIRCUIT, x, z, hint);
  const off = Math.abs(loc.lateral);
  return { s: loc.s, lateral: loc.lateral, track: off <= TRACK_HALF, kerb: off > TRACK_HALF && off <= TRACK_HALF + KERB, runoff: off > TRACK_HALF + KERB && off <= CLEAR };
}

/**
 * The circuit's surface under a point, for driving on it off a race: the height and banking of the
 * nearest stretch whose lane covers the point and whose height is near `yNow` (so a kart under the
 * flyover stays under it, and one on the deck stays up). Null off the track.
 */
export function circuitSurfaceAt(x: number, z: number, yNow: number): { y: number; roll: number } | null {
  const c = CIRCUIT;
  const reach = TRACK_HALF + KERB;
  let best: { y: number; roll: number } | null = null;
  let bestDy = Infinity;
  // Every stretch within reach (the flyover and the diagonal under it are both candidates)
  for (let i = 0; i < c.x.length; i++) {
    const d2 = (c.x[i] - x) ** 2 + (c.z[i] - z) ** 2;
    if (d2 > reach * reach) continue;
    const f = frame(c, i * c.step);
    const lat = (x - f.x) * f.nx + (z - f.z) * f.nz;
    if (Math.abs(lat) > reach) continue;
    const y = heightAt(f, Math.max(-TRACK_HALF, Math.min(TRACK_HALF, lat)));
    const dy = Math.abs(y - yNow);
    if (dy > 1.8 || dy >= bestDy) continue;
    bestDy = dy;
    best = { y, roll: f.roll };
  }
  return best;
}

/** A point on the circuit: s along, lateral across (left positive), in world numbers */
export const circuitAt = (c: Course, s: number, lateral = 0) => at(c, s, lateral);
