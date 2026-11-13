/*
 * Endswood carried west, its life (docs/ends-west-plan.md Phase 4; DOM-free, the chunk's, tested in
 * tests/endswestlife.test.ts). The owner's picks: a busy estate, the washing out and the kids' things out front, the
 * porch lights on at night. Each mover a function of the time, everyone else standing where they stand, the same for
 * everyone; it all comes with the chunk and goes into the crowd's spare slots when it loads (life.ts `addPeople()`),
 * the dogs and what's out in the gardens drawn by endswestlife3d.ts.
 *
 * - **Walking** (`WEST_PEOPLE`): round each pair of rows on their front paths (out along one, back along the other,
 *   on the path's outer half, clear of the porches and bins), some with a dog (`WEST_DOGS`); along the Close's
 *   sidewalks, over at the zebra and at the service lanes' mouth; up and down the north block's cross path.
 * - **Playing:** kids running round the playground, on the swings, round the roundabout and on a springer; a
 *   kickabout on the green between its goals, a keeper at each.
 * - **Standing about** (`WEST_IDLE`): neighbours on their doorsteps and chatting at their doors side by side, someone
 *   at the washing in a back garden, a queue at the chippy, a few at the parade's other doors, a parent pushing the
 *   swings and on the benches, someone in an open garage.
 * - **What's out** (`WASHING`, `FRONT_BITS`): a rotary airer or a line of washing in some back gardens, a kid's bike
 *   against the front wall and toys on the green by some houses. Nothing of it is solid.
 * - **At night** (`PORCH_POOLS`): each house's porch light's pool on its front path, and the corner shop's and the
 *   chippy's light on the forecourt, open late; the playground stays dark, the green under the sodium lamps
 *   (endswest.ts `WEST_LAMPS`).
 *
 * In world numbers, x across, z north (-) to south (+).
 */
import { HOME, HOME_HOUSE } from './home';
import { ROAD_HALF, ROAD_Z, SLAB_Y, type Pt } from './endswood';
import { GREENS, LANE, ROW_X, CROSS_PATHS, N_EDGE, ZEBRA } from './endswest';
import { BIN, BIN_OFF, CANOPY, HOUSES, PORCH, TERRACES, binsOf, toWorld, type House, type Terrace } from './endsterraces';
import { BENCHES_W, CANOPY_W, GARAGES, GARAGE_W, GOALS, KICKABOUT, PARADE_W, PLAY_W, ROUNDABOUT, SPRINGERS, SWINGS, unitAt } from './endsweststreet';
import { KID, KID_RUN, loopOf } from './play';
import { WALK_PACE, type Moment, type ParkPerson } from './parklife';
import { rng } from './recipes';
import type { Idle } from './landmarks';

/* ---------- Lanes ---------- */

interface Lane {
  id: string;
  pts: Pt[];
  cum: number[];
  len: number;
  pace: number;
  count: number;
  /** Which of its people walk a dog */
  dogs: number[];
}
function lane(id: string, pts: Pt[], pace: number, count: number, dogs: number[] = []): Lane {
  const cum = [0];
  for (let i = 1; i <= pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i % pts.length][0] - pts[i - 1][0], pts[i % pts.length][1] - pts[i - 1][1]));
  return { id, pts, cum, len: cum[cum.length - 1], pace, count, dogs };
}
const scratch = { x: 0, z: 0, dx: 0, dz: 0 };
function along(l: Lane, u: number) {
  u = ((u % l.len) + l.len) % l.len;
  let i = 0;
  while (i < l.pts.length - 1 && l.cum[i + 1] <= u) i++;
  const [a, b] = [l.pts[i], l.pts[(i + 1) % l.pts.length]];
  const seg = l.cum[i + 1] - l.cum[i] || 1;
  const f = (u - l.cum[i]) / seg;
  scratch.x = a[0] + (b[0] - a[0]) * f;
  scratch.z = a[1] + (b[1] - a[1]) * f;
  scratch.dx = (b[0] - a[0]) / seg;
  scratch.dz = (b[1] - a[1]) / seg;
  return scratch;
}

/** How far out from a row's front its path's walkers go: on the path's outer half (it's 1.5 wide), past the porches */
export const PATH_OUT = 1.3;
/** The front paths' loops' ends: by the service lane, and on the green's east end short of the cross path */
const LOOP_X: [number, number] = [LANE.x1 + 0.8, ROW_X[1] - 0.8];
/** The Close's sidewalks: between the kerb and the lamps (as the old estate's road), from the zebra to the lanes' mouth */
export const CLOSE_OFF = ROAD_HALF + 0.2;
export const LANE_MOUTH = (LANE.x0 + LANE.x1) / 2;

const LANES: Lane[] = [
  ...GREENS.map((g, i) => {
    const [za, zc] = [g[1] - 1.5 + PATH_OUT, g[3] + 1.5 - PATH_OUT];
    return lane(
      `rows-${i}`,
      [
        [LOOP_X[0], za],
        [LOOP_X[1], za],
        [LOOP_X[1], zc],
        [LOOP_X[0], zc],
      ],
      WALK_PACE,
      3,
      [i % 3]
    );
  }),
  lane(
    'close',
    [
      [ZEBRA.x, ROAD_Z - CLOSE_OFF],
      [LANE_MOUTH, ROAD_Z - CLOSE_OFF],
      [LANE_MOUTH, ROAD_Z + CLOSE_OFF],
      [ZEBRA.x, ROAD_Z + CLOSE_OFF],
    ],
    WALK_PACE * 1.05,
    4,
    [1]
  ),
  (() => {
    const [x0, z0, x1, z1] = CROSS_PATHS[0];
    const mx = (x0 + x1) / 2;
    return lane(
      'cross',
      [
        [mx - 0.35, z0 + 1.2],
        [mx - 0.35, z1 - 0.6],
        [mx + 0.35, z1 - 0.6],
        [mx + 0.35, z0 + 1.2],
      ],
      WALK_PACE * 0.9,
      2
    );
  })(),
];

interface Mover {
  lane: Lane;
  u0: number;
}
const MOVERS: Mover[] = LANES.flatMap((l, li) => Array.from({ length: l.count }, (_, k) => ({ lane: l, u0: (li * 17.3 + (k / l.count) * l.len) % l.len })));
function moverAt(w: Mover, t: number, out: Moment, ahead = 0) {
  const s = along(w.lane, w.u0 + w.lane.pace * t + ahead);
  return Object.assign(out, { x: s.x, z: s.z, y: SLAB_Y, ry: Math.atan2(s.dx, s.dz), clip: 'walk' as const, speed: w.lane.pace });
}

/* ---------- Play ---------- */

/** The playground's runners: round the inside of its fence, clear of what's on it */
export const PLAY_IN = 0.45;
const PLAY_LOOP = loopOf(PLAY_W.rect, PLAY_IN);
/** Round the roundabout: a kid running it round, a little out from its edge */
export const ROUND_R = ROUNDABOUT.r + 0.75;
/** The swings' two seats, and the kickabout's loop between the goals */
export const SWING_SEATS: Pt[] = [SWINGS[0] + 0.8, SWINGS[2] - 0.8].map((x): Pt => [x, (SWINGS[1] + SWINGS[3]) / 2]);
const PITCH_LOOP = loopOf([KICKABOUT[0] + 1.6, GOALS[0].at[1] + 2.2, KICKABOUT[2] - 1.6, GOALS[1].at[1] - 2.2], 0);

const still = (id: string, x: number, z: number, ry: number, clip: Moment['clip'], scale: number | undefined, trim: boolean, y = SLAB_Y): ParkPerson => ({
  id,
  trim,
  scale,
  at: (_t, out) => Object.assign(out, { x, z, ry, y, clip, speed: 0 }),
});

export const WEST_PEOPLE: ParkPerson[] = [
  ...MOVERS.map((w, i): ParkPerson => ({ id: `endsw-${w.lane.id}-${i}`, trim: i % 2 === 1, at: (t, m) => moverAt(w, t, m) })),
  // The playground: three running round, one running the roundabout round, two on the swings
  ...[0, 0.33, 0.66].map((f, k): ParkPerson => ({
    id: `endsw-play-${k}`,
    trim: k === 2,
    scale: KID,
    at(t, m) {
      const p = PLAY_LOOP.at(f * PLAY_LOOP.len + KID_RUN * t);
      return Object.assign(m, { x: p.x, z: p.z, ry: Math.atan2(p.dx, p.dz), y: SLAB_Y, clip: 'jog' as const, speed: KID_RUN });
    },
  })),
  {
    id: 'endsw-roundabout',
    trim: false,
    scale: KID,
    at(t, m) {
      const a = (t * KID_RUN * 0.7) / ROUND_R;
      const [cx, cz] = ROUNDABOUT.c;
      // (anticlockwise seen from above, facing the way round)
      return Object.assign(m, { x: cx + Math.cos(a) * ROUND_R, z: cz - Math.sin(a) * ROUND_R, ry: Math.atan2(-Math.sin(a), -Math.cos(a)), y: SLAB_Y, clip: 'jog' as const, speed: KID_RUN * 0.7 });
    },
  },
  ...SWING_SEATS.map(([x, z], k) => still(`endsw-swing-${k}`, x, z, 0, 'swing', KID, k === 1, SLAB_Y + 0.5)),
  // The kickabout: four running round between the goals, a keeper in each
  ...[0, 0.25, 0.5, 0.75].map((f, k): ParkPerson => ({
    id: `endsw-ball-${k}`,
    trim: k % 2 === 1,
    scale: KID,
    at(t, m) {
      const p = PITCH_LOOP.at(f * PITCH_LOOP.len + KID_RUN * t);
      return Object.assign(m, { x: p.x, z: p.z, ry: Math.atan2(p.dx, p.dz), y: SLAB_Y, clip: 'jog' as const, speed: KID_RUN });
    },
  })),
  ...GOALS.map((g, k) => still(`endsw-keeper-${k}`, g.at[0], g.at[1] + g.faces * 0.7, g.faces > 0 ? 0 : Math.PI, 'look', KID, k === 1)),
];

/** Each dog walker's dog: whose (an index into WEST_PEOPLE), its coat, how big; ahead of them on the lead */
export const LEAD = 1.05;
export interface WestDog {
  walker: number;
  coat: string;
  size: number;
  at(t: number, out: Moment): Moment;
}
const COATS = ['#3a2c26', '#c9a27a', '#e8e2d6', '#24232a'];
export const WEST_DOGS: WestDog[] = MOVERS.flatMap((w, i) => {
  const k = MOVERS.filter((v, j) => v.lane === w.lane && j < i).length;
  if (!w.lane.dogs.includes(k)) return [];
  const n = i % COATS.length;
  return [{ walker: i, coat: COATS[n], size: n === 1 ? 1.1 : 0.9, at: (t: number, out: Moment) => moverAt(w, t, out, LEAD) }];
});

/* ---------- Standing about ---------- */

const E = Math.PI / 2;
const W = -Math.PI / 2;
const S = Math.PI;
const idle = (x: number, z: number, ry: number, act: Idle['act'] = 'look', y = SLAB_Y, scale?: number): Idle => ({ x, z, ry, act, y, ...(scale ? { scale } : {}) });
const terraceOf = (h: House) => TERRACES.find((t) => t.houses.includes(h))!;
const outOf = (T: Terrace) => Math.atan2(T.n[0], T.n[1]);
const alongOf = (T: Terrace, s: number) => Math.atan2(T.t[0] * s, T.t[1] * s);

/** A springer's seat: the top of its body (endsweststreet3d.ts draws it 0.32 to 0.56 up, along x) */
export const SPRINGER_TOP = 0.56;

/** Where someone stands on a canopied doorstep: in front of the step, under the canopy's edge */
export const STEP_OUT = CANOPY.d - 0.12;

/** The doorsteps: neighbours side by side at a mirrored pair's doors chatting, and others out on their own */
function doorsteps(): Idle[] {
  const out: Idle[] = [];
  const used = new Set<House>();
  for (const T of TERRACES)
    for (let i = 0; i + 1 < T.houses.length; i++) {
      const [a, b] = [T.houses[i], T.houses[i + 1]];
      if (a.porch !== 'canopy' || b.porch !== 'canopy' || Math.abs(a.door - b.door) > 2 || rng(7300 + HOUSES.indexOf(a))() > 0.55) continue;
      const [pa, pb] = [toWorld(T, a.door, STEP_OUT), toWorld(T, b.door, STEP_OUT)];
      const s = Math.sign(b.door - a.door);
      out.push(idle(pa[0], pa[1], alongOf(T, s) * 0.6 + outOf(T) * 0.4, 'chat'), idle(pb[0], pb[1], alongOf(T, -s) * 0.6 + outOf(T) * 0.4, 'chat'));
      used.add(a).add(b);
    }
  HOUSES.forEach((h, k) => {
    if (used.has(h) || h.porch !== 'canopy' || rng(7400 + k)() > 0.3) return;
    const T = terraceOf(h);
    const [x, z] = toWorld(T, h.door, STEP_OUT);
    out.push(idle(x, z, outOf(T), k % 3 === 0 ? 'phone' : 'look'));
  });
  return out;
}

/* ---------- What's out: washing, bikes, toys ---------- */

export type WashKind = 'rotary' | 'line';
export interface Washing {
  house: string;
  kind: WashKind;
  /** A rotary airer's pole (world), or a line's two posts (world) */
  at: Pt[];
  /** The colours hung on it */
  clothes: string[];
}
/** A rotary airer's arms' reach and height; a line's height, and how far back from the house's back wall it runs */
export const AIRER = { r: 0.6, h: 1.25 };
export const LINE = { h: 1.2, back: 1.2 };
const CLOTHES = ['#ecebe6', '#2b4c86', '#c9302b', '#e6c13c', '#5a5d66', '#e7a1b6', '#3f7f88', '#1c1b21', '#9ccfe0'];
export const WASHING: Washing[] = HOUSES.flatMap((h, k): Washing[] => {
  const r = rng(7500 + k);
  // (Degen's home, home.ts: his garage fills its garden)
  if (r() > 0.4 || h.id === HOME_HOUSE) return [];
  const T = terraceOf(h);
  const mid = (h.u0 + h.u1) / 2;
  const clothes = Array.from({ length: 4 + Math.floor(r() * 3) }, () => CLOTHES[Math.floor(r() * CLOTHES.length)]);
  if (r() < 0.5) return [{ house: h.id, kind: 'rotary', at: [toWorld(T, mid, -T.d - 1.6)], clothes }];
  return [{ house: h.id, kind: 'line', at: [toWorld(T, h.u0 + 0.4, -T.d - LINE.back), toWorld(T, h.u1 - 0.4, -T.d - LINE.back)], clothes }];
});

export type BitKind = 'bike' | 'trike' | 'ball' | 'scooter' | 'car';
export interface FrontBit {
  house: string;
  kind: BitKind;
  at: Pt;
  /** Its facing (ry, 0 is +z) */
  ry: number;
  colour: string;
}
const TOYS = ['#e23b3b', '#2f8fd8', '#ffd23f', '#3ab36a', '#e219e5'];
/** A kid's bike leans against the front wall between the bins and the door; toys lie on the green in front */
export const FRONT_BITS: FrontBit[] = HOUSES.flatMap((h, k): FrontBit[] => {
  const r = rng(7600 + k);
  if (r() > 0.3) return [];
  const T = terraceOf(h);
  const out: FrontBit[] = [];
  const colour = TOYS[Math.floor(r() * TOYS.length)];
  // (the gap between the last bin's end and the porch, by the wall)
  const bins = binsOf(h);
  const binEnd = h.binU < h.door ? Math.max(...bins) + BIN.w : Math.min(...bins);
  const porch = h.door + Math.sign(h.binU - h.door) * ((h.porch === 'canopy' ? CANOPY.w : PORCH.w) / 2 + 0.15);
  if (Math.abs(porch - binEnd) > 1.4) {
    const [x, z] = toWorld(T, (porch + binEnd) / 2, BIN_OFF + 0.14);
    out.push({ house: h.id, kind: r() < 0.7 ? 'bike' : 'scooter', at: [x, z], ry: alongOf(T, 1), colour });
  }
  const toys: BitKind[] = ['trike', 'ball', 'car'];
  const n = 1 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const [x, z] = toWorld(T, h.u0 + 0.6 + r() * (h.u1 - h.u0 - 1.2), 2.1 + r() * 0.8);
    out.push({ house: h.id, kind: toys[Math.floor(r() * toys.length)], at: [x, z], ry: r() * Math.PI * 2, colour: TOYS[Math.floor(r() * TOYS.length)] });
  }
  return out;
});

/* ---------- At night ---------- */

/** Each porch light's pool on its path, and the two late shops' on the forecourt: x, z, size */
export const PORCH_POOLS: [number, number, number][] = [
  ...HOUSES.map((h): [number, number, number] => {
    const T = terraceOf(h);
    const [x, z] = toWorld(T, h.door, h.porch === 'canopy' ? 0.55 : PORCH.d + 0.4);
    return [x, z, 1.5];
  }),
  // (the lamp over Degen's garage door, home.ts, on his driveway)
  [HOME.garageDoor.x - 0.9, (HOME.garageDoor.z0 + HOME.garageDoor.z1) / 2, 2.4],
  // (the corner shop's and the chippy's light out under the canopy: open late)
  ...[0, 1].map((k): [number, number, number] => {
    const [a, b] = unitAt(k);
    return [(a + b) / 2, PARADE_W.front + CANOPY_W.out * 0.6, 2.4];
  }),
];
/** The units that keep their lights on late (the corner shop, the chippy) */
export const LATE_UNITS = [0, 1];

export const WEST_IDLE: Idle[] = [
  ...doorsteps(),
  // At the washing in a few back gardens, facing the line
  ...WASHING.filter((_, i) => i % 3 === 0).map((w) => {
    const h = HOUSES.find((x) => x.id === w.house)!;
    const T = terraceOf(h);
    const [x, z] = w.kind === 'rotary' ? toWorld(T, (h.u0 + h.u1) / 2, -T.d - 1.6 - AIRER.r - 0.45) : toWorld(T, (h.u0 + h.u1) / 2, -T.d - LINE.back - 0.6);
    return idle(x, z, outOf(T), 'look');
  }),
  // The parade: a queue at the chippy along its front, someone at the corner shop's door, two at the launderette's
  ...[0, 1, 2].map((k) => {
    const [a, b] = unitAt(1);
    return idle((a + b) / 2 + 0.15 + k * 0.62, PARADE_W.front + 0.5, k === 0 ? S : W, k === 0 ? 'look' : 'queue');
  }),
  idle((unitAt(0)[0] + unitAt(0)[1]) / 2 - 0.4, PARADE_W.front + 0.55, S, 'phone'),
  idle(unitAt(2)[0] + 0.7, PARADE_W.front + 0.6, E, 'chat'),
  idle(unitAt(2)[0] + 1.35, PARADE_W.front + 0.6, W, 'chat'),
  // The playground: a parent pushing the swings, a kid on a springer, two on the benches outside the fence
  idle(SWING_SEATS[0][0], SWINGS[3] + 0.5, S, 'look'),
  idle(SPRINGERS[0][0], SPRINGERS[0][1], E, 'sit', SLAB_Y + SPRINGER_TOP, KID),
  idle(BENCHES_W[0].at[0], BENCHES_W[0].at[1], Math.atan2(...BENCHES_W[0].faces), 'sit', SLAB_Y + 0.48),
  idle(BENCHES_W[1].at[0], BENCHES_W[1].at[1], Math.atan2(...BENCHES_W[1].faces), 'phone', SLAB_Y + 0.48),
  // The green: on a bench watching the game, and someone stood by it
  idle(BENCHES_W[2].at[0], BENCHES_W[2].at[1], E, 'sit', SLAB_Y + 0.48),
  idle(KICKABOUT[0] + 0.7, (BENCHES_W[2].at[1] + BENCHES_W[3].at[1]) / 2, E, 'chat'),
  // In one of the open garages, at the back of its car
  idle(GARAGES.rect[0] - 0.5, GARAGES.rect[1] + (GARAGES.open[1] + 0.5) * GARAGE_W, E, 'look'),
  // At the board by the Close, reading it
  idle(CROSS_PATHS[0][2] + 0.9, N_EDGE + 0.05, S, 'look'),
];
