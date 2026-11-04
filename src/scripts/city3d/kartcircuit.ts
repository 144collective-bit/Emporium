/*
 * The kart park's circuit as data (docs/kart-plan.md): one closed loop with
 * no junctions, raced forward and in reverse, 4.4 wide (four or five karts
 * abreast), with kerbs and grass-and-gravel run-off either side and nothing
 * solid on or near it. Free of the DOM and of scene code, tested in
 * tests/kartcircuit.test.ts.
 *
 * Built in Phase 1 at 589 tiles a lap and 5.6 wide; scaled down to 60%
 * afterwards (the owner's call: faster paced and more lifelike), so a lap is
 * about 350 tiles (some 630 m), the corners come quicker and the park's
 * fence pulled in round it. It uses the park's site, its local numbers (u
 * east, v south) and its sampling (`sampleLine()`, `frame()`, `locate()`)
 * from kartpark.ts.
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
import { F, GATE, KART_PARK, KART_W, STEP, frame, heightAt, locate, sampleLine, toLocal, toWorld, type CPt, type Frame, type Line, type Pt } from './kartpark';

/** The track's width and half width (four or five karts abreast) */
export const TRACK_W = 4.4;
export const TRACK_HALF = TRACK_W / 2;
/** The red-and-white kerbs either side, and the grass and gravel run-off beyond them */
export const KERB = 0.5;
export const RUNOFF = 3;
/** From the centre line to the run-off's outer edge: nothing solid stands closer */
export const CLEAR = TRACK_HALF + KERB + RUNOFF;
/**
 * Beyond this far from the centre line a kart is put back on the track (kart-sim.ts): far enough out that its side
 * has crossed most of the run-off, short of the tyre walls by a hand, so a kart never drives into a barrier it can't
 * touch (docs/kart-west-plan.md Phase 2: it was half a tile past the run-off, and a kart's side went a tile into the
 * tyres and the armco before it was put back)
 */
export const RESET_AT = CLEAR - KART_W / 2 - 0.15;
/** The flyover's deck over the diagonal it crosses */
export const FLY_H = 2.6;
/**
 * The flyover's deck: how deep its slab is under the asphalt, how far out it reaches from the centre line and its
 * railing's height. It reaches well past where a kart's side can get before the sim puts it back (the kerb's edge plus
 * half a kart), so no kart ever pokes through the railing (docs/kart-west-plan.md Phase 2: it was 0.35 past the kerb,
 * and a kart at the kerb's edge stuck 0.13 out through it)
 */
export const DECK_DEPTH = 0.35;
export const DECK_OUT = TRACK_HALF + KERB + 0.8;
export const RAIL_H = 0.9;
/**
 * The tunnel's tube: its radius round the centre line at the asphalt and its wall's thickness. The inside wall stands
 * clear of a kart scraping along the sim's wall (the kerb's edge, a kart's half width more) with room for the driver's
 * head and the chase camera (it was 0.3 past the kerb, and a kart's side went 0.18 into it)
 */
export const TUBE_R = TRACK_HALF + KERB + 1.15;
export const TUBE_T = 0.3;
export const TUBE_IN = TUBE_R - TUBE_T;
/** The sweepers' banking (the surface's slope across the track) and the centre line's lift so the low edge rests on the ground */
export const BANK = 0.28;
export const BANK_H = BANK * TRACK_HALF;
/** The hill's crest, and the jump's lip */
export const HILL_H = 2;
export const JUMP_H = 0.7;
/** The steepest a ramp may climb (height per tile) */
export const MAX_SLOPE = 0.3;
/** The tightest a corner may be (radius in tiles) */
export const MIN_RADIUS = 4;

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

/** The start/finish straight's line (local v) */
export const STRAIGHT_V = 67;

/**
 * The centre line raced forward (clockwise on the map), starting on the start/finish straight.
 * Corners are numbered in the forward direction (`turn-n` tags at their apexes), for the boards
 * Phase 3 puts up.
 */
const PTS: CirPt[] = [
  // The start/finish straight, heading west (the line is at START_U)
  P(61.5, STRAIGHT_V, { tag: 'line' }),
  P(30, STRAIGHT_V, { pad: true }),
  P(20.7, STRAIGHT_V),
  // Turn 1: right, up the west side
  P(13.5, 65.5),
  P(10.8, 60.4, { tag: 'turn-1' }),
  // Turns 2 and 3: the west esses, out towards the fence and back
  P(10.5, 54.4, { pad: true }),
  P(9.3, 49.3),
  P(7.2, 44.2, { tag: 'turn-2' }),
  P(7.2, 38.2),
  P(9.3, 33.4, { tag: 'turn-3' }),
  P(10.5, 28),
  P(10.8, 23.8),
  // Turn 4: the banked north-west sweeper
  banked(11.4, 18.4),
  banked(14.4, 11.8, { tag: 'turn-4' }),
  banked(20.1, 8.2),
  // Turns 5 and 6: the hill, dipping south over its crest and back (one long climb and one long drop, the tunnel on its
  // lower slope), then the jump, far enough on that a kart flying off it either way lands clear of the tunnel
  P(25.5, 7.6, { pad: true }),
  P(30.3, 8.5, { glide: true }),
  P(35.1, 10.8, { glide: true, tag: 'turn-5' }),
  P(39.9, 11.8, { h: HILL_H }),
  P(44.7, 10.5, { glide: true, f: F.tunnel }),
  P(48.9, 8.5, { glide: true, tag: 'turn-6', f: F.tunnel }),
  P(53.1, 7.2),
  P(57.3, 7.1),
  P(61.5, 7.4, { h: JUMP_H, tag: 'jump' }),
  P(65.7, 8.2),
  // Turn 7: the banked north-east sweeper, round to the south
  banked(71.1, 10.6),
  banked(75.3, 16, { tag: 'turn-7' }),
  banked(76.5, 22.6),
  // Turn 8: the hairpin, right round and back north (an arc of radius 5.1 round (71.4, 28))
  P(76.5, 28),
  P(75.8, 30.6),
  P(74, 32.4),
  P(71.4, 33.1, { tag: 'turn-8' }),
  P(68.8, 32.4),
  P(67, 30.6),
  P(66.3, 28),
  // Turns 9 and 10: a long left-hander (radius 6.6 round (59.7, 24.7)), back south into the infield
  P(66.3, 24.7),
  P(64.4, 20.7, { tag: 'turn-9' }),
  P(59.7, 18.9),
  P(55, 20.7, { tag: 'turn-10' }),
  P(53.1, 24.7),
  // Down the middle at ground level, under the flyover
  P(51.9, 31, { pad: true }),
  P(49.3, 37),
  P(47.3, 43.2),
  P(45.3, 48.7),
  // Turn 11: the west loop, a long right-hander in the infield
  P(39.9, 52),
  P(33.9, 52),
  P(28.2, 51.1),
  P(24, 47.2),
  P(23.4, 41.2, { tag: 'turn-11' }),
  P(25.8, 35.5),
  P(30.6, 32.2),
  // The flyover: one climb off the loop to the deck, over the run below, one drop into Turn 12
  P(35.7, 33, { glide: true, f: F.deck }),
  P(39.6, 36.2, { glide: true, f: F.deck }),
  P(43.2, 39.3, { h: FLY_H, f: F.deck }),
  P(47.3, 43.2, { h: FLY_H, f: F.deck }),
  P(51.3, 47.2, { h: FLY_H, f: F.deck }),
  P(55.2, 50.5, { glide: true, f: F.deck }),
  P(59.7, 53.4, { glide: true }),
  // Turn 12: the tight south-east right-hander onto the straight (an arc of radius 5.4 round (63.9, 61.6))
  P(63.3, 55.3),
  P(66.7, 57),
  P(68.6, 58.9),
  P(69.3, 61.6, { tag: 'turn-12' }),
  P(68.6, 64.3),
  P(66.6, 66.3),
  P(63.9, STRAIGHT_V),
];

/** The start / finish line crosses the straight here (local u) */
export const START_U = 48;

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
    if (v0 > STRAIGHT_V - 2 && ((u0 >= START_U && u1 < START_U) || (u0 <= START_U && u1 > START_U))) {
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

export { KART_W, GATE };
/** How many race in a grid, and the grid's two columns either side of the centre line */
export const GRID = 8;
export const GRID_LATERAL = 1;
/** The grid: on the straight behind the line, two abreast and staggered; slot 0 is pole */
export function gridSlots(c: Course): { s: number; lateral: number }[] {
  return Array.from({ length: GRID }, (_, i) => ({ s: c.start - 2 - Math.floor(i / 2) * 2.6 - (i % 2) * 1.2, lateral: (i % 2 ? -1 : 1) * GRID_LATERAL }));
}

/* ---------- The pits, the hut, the garages, the grandstand, the gate path ---------- */

/** The pit lane's half width */
export const PIT_HALF = 1.2;
/**
 * The pit lane, forward: off the straight before the line (the east end), west along the garages
 * beyond the run-off, back on after Turn 1's approach (the west end). Coned off during a race.
 */
const PIT_PTS: CirPt[] = [P(61, 67.7, { tag: 'pit-in' }), P(58.6, 69.6), P(56.2, 73.6), P(52.5, 74.5), P(40, 74.5), P(28, 74.5), P(24.6, 73.6), P(22.2, 69.6), P(19.6, 67.6, { tag: 'pit-out' })];
export const PIT_LANE: Line = sampleLine(PIT_PTS, STEP, false);
/** Where the pit lane runs straight along the garages (local u), clear of the run-off */
export const PIT_STRAIGHT = { u0: 27, u1: 54, v: 74.5 } as const;

/** Where things stand on the site (local u, v; boxes u0, v0, u1, v1) */
export const SITE = {
  /** The garages along the pit lane's south side, a bay for each kart; the big screen stands on their roof */
  garages: { u0: 27.5, v0: 76.4, u1: 54, v1: 81, h: 3 },
  /**
   * The clubhouse at the pit lane's west end (docs/kart-west-plan.md Phase 3: it was the kart hut, one storey, 8.5
   * long): two storeys, the reception and café downstairs behind a glass front on the plaza, the lounge upstairs over
   * the pits, the roof terrace; its door on the south side towards the gate path, where the hut's was
   */
  hut: { u0: 9.5, v0: 76.4, u1: 26.4, v1: 81.5, h: 6.2, door: [21.2, 82.2] as Pt },
  /** The grandstand in the infield, facing south over the straight */
  stand: { u0: 30.5, v0: 58.1, u1: 53.5, v1: 61, h: 3 },
  /** The big screen on the garages' roof, facing north over the straight */
  screen: { u: 41, v: 78.7, w: 9, h: 3 },
  /** The path from the gate (kartpark.ts GATE, where it's always been, at the slip road) to the hut's door */
  path: { v: 84, u0: 6, u1: 21.2, half: 1.1 },
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
  return { x: f.x, z: f.z, posts: [1, -1].map((side) => ({ x: f.x + f.nx * reach * side, z: f.z + f.nz * reach * side })), h: 4.4, half: reach };
})();

/**
 * The flyover's supports: every six tiles along the deck where it's up, a column either side just past
 * the deck's edge, and never in the run-off of the track below (so the span over it is open).
 */
/** How far past the deck's edge its columns stand (their middles), and their half width */
export const SUPPORT_OUT = 0.35;
export const SUPPORT_HALF = 0.22;
export const SUPPORTS: { x: number; z: number; h: number }[] = (() => {
  const c = CIRCUIT;
  const out: { x: number; z: number; h: number }[] = [];
  const nearGround = (x: number, z: number) => {
    for (let i = 0; i < c.x.length; i++) if (c.y[i] < 0.5 && Math.hypot(c.x[i] - x, c.z[i] - z) < CLEAR + 0.3) return true;
    return false;
  };
  for (let s = 0; s < c.L; s += 4) {
    const f = frame(c, s);
    if (!(f.flags & F.deck) || f.y < 0.8) continue;
    for (const side of [1, -1]) {
      const x = f.x + f.nx * (DECK_OUT + SUPPORT_OUT) * side;
      const z = f.z + f.nz * (DECK_OUT + SUPPORT_OUT) * side;
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
 * The ground across the circuit at a frame: the asphalt and the kerbs follow the banking; the
 * run-off carries on from the kerb's edge and eases down to the lawn at CLEAR (a grass bank where
 * the track is raised: the hill, the banked sweepers' high side, the flyover's ramps). The sim
 * and the drawing both use it, so a kart on the run-off sits on what's drawn.
 */
export function groundAt(f: Frame, lateral: number) {
  const edge = TRACK_HALF + KERB;
  const side = Math.abs(lateral);
  if (side <= edge) return heightAt(f, lateral);
  const top = heightAt(f, Math.sign(lateral) * edge);
  return top * Math.max(0, 1 - (side - edge) / RUNOFF);
}
/** No run-off on the deck or in the tunnel: off their kerbs a kart is put back on the track */
export const enclosed = (f: Frame) => !!(f.flags & F.tunnel) || (!!(f.flags & F.deck) && f.y > 0.6);

/**
 * The circuit's surface under a point, for driving on it off a race: the height and banking of the
 * nearest stretch whose track or run-off covers the point and whose height is near `yNow` (so a
 * kart under the flyover stays under it, and one on the deck stays up). Null off it.
 */
export function circuitSurfaceAt(x: number, z: number, yNow: number): { y: number; roll: number } | null {
  const c = CIRCUIT;
  let best: { y: number; roll: number } | null = null;
  let bestDy = Infinity;
  // Every stretch within reach (the flyover and the run under it are both candidates)
  for (let i = 0; i < c.x.length; i++) {
    const d2 = (c.x[i] - x) ** 2 + (c.z[i] - z) ** 2;
    if (d2 > CLEAR * CLEAR) continue;
    const f = frame(c, i * c.step);
    const lat = (x - f.x) * f.nx + (z - f.z) * f.nz;
    const reach = enclosed(f) ? TRACK_HALF + KERB : CLEAR;
    if (Math.abs(lat) > reach) continue;
    const y = groundAt(f, lat);
    const dy = Math.abs(y - yNow);
    if (dy > 1.8 || dy >= bestDy) continue;
    bestDy = dy;
    best = { y, roll: Math.abs(lat) <= TRACK_HALF + KERB ? f.roll : 0 };
  }
  return best;
}

/** How far the race camera keeps from the tunnel's wall, the deck's underside and the ground */
export const CAM_GAP = 0.3;
/**
 * The race camera's room (docs/kart-west-plan.md Phase 2): a chase camera wanted at x, y, z behind a kart at kx, ky,
 * kz, moved where it can be. With the kart in the tunnel the camera's pulled inside the tube (it swung out through
 * its wall in the turns, and from outside the tube the kart's hidden); under the flyover, with the kart on the run
 * below, it's kept under the deck's slab (it went up into it at speed); everywhere it stays over the circuit's ground.
 */
export function camRoom(x: number, y: number, z: number, kx: number, ky: number, kz: number): [number, number, number] {
  const c = CIRCUIT;
  const n = c.x.length;
  let [cx, cy, cz] = [x, y, z];
  // (the tube's drawn over its samples and the one after the last, kartgrounds3d.ts runs())
  const tube = (i: number) => !!(c.flags[i] & F.tunnel) || !!(c.flags[(i - 1 + n) % n] & F.tunnel);
  /** The sample a point's beside (its stretch of track, not the next one's), within `reach` across, near height `y` */
  const beside = (px: number, pz: number, py: number, reach: number, keep: (i: number) => boolean) => {
    for (let i = 0; i < n; i++) {
      if (!keep(i) || (c.x[i] - px) ** 2 + (c.z[i] - pz) ** 2 > (reach + 1) ** 2 || Math.abs(c.y[i] - py) > TUBE_R + 2) continue;
      const f = frame(c, i * c.step);
      const lat = (px - f.x) * f.nx + (pz - f.z) * f.nz;
      const ahead = (px - f.x) * f.tx + (pz - f.z) * f.tz;
      if (Math.abs(ahead) <= c.step * 0.6 && Math.abs(lat) <= reach) return { f, lat, ahead };
    }
    return null;
  };
  const kartIn = !!beside(kx, kz, ky, TUBE_IN, tube);
  const inTube = beside(cx, cz, cy, kartIn ? TUBE_R + 4 : TUBE_R + 0.2, tube);
  if (inTube && (kartIn || Math.hypot(inTube.lat, cy - inTube.f.y) < TUBE_R + 0.2)) {
    // In the tube: as far from its axis (the centre line at the asphalt) as the wall less the gap, at most
    const { f, lat, ahead } = inTube;
    const up = Math.max(0, cy - f.y);
    const r = Math.hypot(lat, up);
    const most = TUBE_IN - CAM_GAP;
    if (r > most) {
      const k = most / r;
      cx = f.x + f.nx * lat * k + f.tx * ahead;
      cz = f.z + f.nz * lat * k + f.tz * ahead;
      cy = f.y + up * k;
    }
  }
  // Under the deck with the kart below: under its slab
  if (ky < 1)
    for (let i = 0; i < n; i++) {
      if (!(c.flags[i] & F.deck) || c.y[i] < 0.6 || (c.x[i] - cx) ** 2 + (c.z[i] - cz) ** 2 > (DECK_OUT + 1) ** 2) continue;
      const f = frame(c, i * c.step);
      const lat = (cx - f.x) * f.nx + (cz - f.z) * f.nz;
      const ahead = (cx - f.x) * f.tx + (cz - f.z) * f.tz;
      if (Math.abs(lat) < DECK_OUT + 0.2 && Math.abs(ahead) <= c.step * 0.6 && ky < f.y - 1) cy = Math.min(cy, f.y - DECK_DEPTH - CAM_GAP);
    }
  // Over the ground: the circuit's where it's on it, the lawn's elsewhere
  // (the stretch nearest the kart's height: the deck with the kart up on it, the run below with the kart under it)
  for (const yNow of [ky, ky + 0.5]) {
    const surf = circuitSurfaceAt(cx, cz, yNow);
    cy = Math.max(cy, (surf ? surf.y : 0) + CAM_GAP);
  }
  return [cx, cy, cz];
}
