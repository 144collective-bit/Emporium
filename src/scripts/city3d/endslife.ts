/*
 * Endswood's life (docs/estate-plan.md Phase 7; DOM-free, the chunk's, tested in tests/endslife.test.ts): who's out
 * on the estate, each mover a function of the time and everyone else standing where they stand, the same for everyone.
 * It all comes with the chunk and goes into the crowd's spare slots when it loads (life.ts `addPeople()`); the dogs,
 * the bikes, the mopeds and the shopping trolley are drawn by endslife3d.ts.
 *
 * - **Walking** (`ENDS_PEOPLE`): along Endswood Road's sidewalks (a lane out along one kerb and back along the other,
 *   inside the lamps), down the spine either side of the subways' cuttings, and along Fennel House's third-floor
 *   gallery over the street in the sky (out on one side, back on the other); a few walk a dog (`ENDS_DOGS`); the old
 *   lady with her shopping trolley (`TROLLEY_LADY`, `trolleyAt()`), slowly, from the parade along the road.
 * - **Riding**: kids on BMXs round the garage court behind Hawthorn Terrace, now and then up on the back wheel
 *   (`BMX_KIDS`, `bmxAt()`, `WHEELIE`); mopeds up and down the Close (`MOPEDS`, `mopedAt()`).
 * - **Playing**: a kickabout on the ball court (kids running a loop, a keeper at each end), kids on the swings.
 * - **Standing about** (`ENDS_IDLE`): neighbours on the deck railings (Fennel House's, Marten House's, Linnet
 *   Court's), outside the parade's shops and the corner shops, on Bunker Sound's sofa and at its door, at the
 *   church's lychgate and by a grave, at the bus stops, two in the well, on the green's and the playground's benches,
 *   watching the game through the fence.
 */
import { CIRCUS, CLOSE_END, ROAD_HALF, ROAD_Z, SLAB_Y, SPINE, WELL, type Pt, type Rect } from './endswood';
import { BLOCKS, deckRect, topOf } from './endsblocks';
import { CORNER_SHOPS, GREEN, LYCHGATE, PARADE, PITCH, PLAYGROUND, SOFA_H, STUDIO, ZEBRAS, unitX } from './endsstreet';
import { KID, KID_RUN, loopOf } from './play';
import { WALK_PACE, type Moment, type ParkPerson } from './parklife';
import type { Idle } from './landmarks';

/* ---------- Lanes ---------- */

interface Lane {
  id: string;
  pts: Pt[];
  cum: number[];
  len: number;
  pace: number;
  count: number;
  /** Its height (a gallery's floor) */
  y: number;
  /** Which of its people walk a dog */
  dogs: number[];
}
const close = (pts: Pt[]) => {
  const cum = [0];
  for (let i = 1; i <= pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i % pts.length][0] - pts[i - 1][0], pts[i % pts.length][1] - pts[i - 1][1]));
  return { cum, len: cum[cum.length - 1] };
};
/** A loop out along one line and back along another (each a straight run from a to b, `off` either side of it) */
function there(id: string, a: Pt, b: Pt, off: number, pace: number, count: number, y = SLAB_Y, dogs: number[] = []): Lane {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const [nx, nz] = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
  const pts: Pt[] = [
    [a[0] + nx * off, a[1] + nz * off],
    [b[0] + nx * off, b[1] + nz * off],
    [b[0] - nx * off, b[1] - nz * off],
    [a[0] - nx * off, a[1] - nz * off],
  ];
  return { id, pts, ...close(pts), pace, count, y, dogs };
}
/** Endswood Road's sidewalks: out along one, back along the other, between the kerb and the lamps and beacons (at
 * half + 0.45: the parade's bollards, the lychgate and the shops' fronts are further in), crossing at the zebras
 * (endsstreet.ts `ZEBRAS`) */
export const KERB_OFF = ROAD_HALF + 0.2;
const ROAD_FROM: Pt = [ZEBRAS[0], ROAD_Z];
const ROAD_TO: Pt = [ZEBRAS[1], ROAD_Z];
/** The spine either side of the subways' cuttings */
const SPINE_OFF = SPINE - 0.9;
/** Fennel House's third-floor gallery, both halves and the street in the sky between */
const FENNEL = BLOCKS.find((b) => b.id === 'fennel-w')!;
const FENNEL_E = BLOCKS.find((b) => b.id === 'fennel-e')!;
const GALLERY = deckRect(FENNEL, FENNEL.decks[0]);
const GALLERY_Y = topOf(2);
const GALLERY_MID = (GALLERY[1] + GALLERY[3]) / 2;

export const LANES: Lane[] = [
  there('road', ROAD_FROM, ROAD_TO, KERB_OFF, WALK_PACE, 8, SLAB_Y, [2, 6]),
  there('spine-n', [CIRCUS.x, 339], [CIRCUS.x, ROAD_Z - CIRCUS.r - CIRCUS.half - 0.6], SPINE_OFF, WALK_PACE, 3),
  there('spine-s', [CIRCUS.x, ROAD_Z + CIRCUS.r + CIRCUS.half + 0.6], [CIRCUS.x, 425.5], SPINE_OFF, WALK_PACE, 3, SLAB_Y, [1]),
  there('gallery', [FENNEL.shells[0].rect[0] + 1, GALLERY_MID], [FENNEL_E.shells[0].rect[2] - 1, GALLERY_MID], 0.2, WALK_PACE * 0.9, 4, GALLERY_Y),
];

const scratch = { x: 0, z: 0, dx: 0, dz: 0 };
function along(l: { pts: Pt[]; cum: number[]; len: number }, u: number) {
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
interface Mover {
  lane: Lane;
  u0: number;
}
const MOVERS: Mover[] = LANES.flatMap((l, li) => Array.from({ length: l.count }, (_, k) => ({ lane: l, u0: (li * 23.7 + (k / l.count) * l.len) % l.len })));
function moverAt(w: Mover, t: number, out: Moment, ahead = 0) {
  const s = along(w.lane, w.u0 + w.lane.pace * t + ahead);
  out.x = s.x;
  out.z = s.z;
  out.y = w.lane.y;
  out.ry = Math.atan2(s.dx, s.dz);
  out.clip = 'walk';
  out.speed = w.lane.pace;
  return out;
}

/* ---------- The old lady and her trolley ---------- */

/** Her pace (a slow walk), her lane: along the parade's side of the road behind the lamps, from by the parade to the
 * playground's corner and back */
export const TROLLEY = { pace: 0.3, behind: 0.62 };
const LADY_Z = ROAD_Z + ROAD_HALF + 0.8;
const LADY_LANE = there('lady', [ZEBRAS[0] + 2.2, LADY_Z], [ZEBRAS[1] - 3.4, LADY_Z], 0, TROLLEY.pace, 1);
/** Where the trolley is at t, pulled behind her (x, z, facing her way) */
export function trolleyAt(t: number) {
  const s = along(LADY_LANE, TROLLEY.pace * t - TROLLEY.behind);
  return { x: s.x, z: s.z, ry: Math.atan2(s.dx, s.dz) };
}
const TROLLEY_LADY: ParkPerson = {
  id: 'ends-lady',
  trim: false,
  at(t, out) {
    const s = along(LADY_LANE, TROLLEY.pace * t);
    return Object.assign(out, { x: s.x, z: s.z, y: SLAB_Y, ry: Math.atan2(s.dx, s.dz), clip: 'walk' as const, speed: TROLLEY.pace });
  },
};

/* ---------- Bikes ---------- */

/** The garage court behind Hawthorn Terrace (between its two rows of lock-ups): the kids' loop on their BMXs */
export const BMX_COURT: Rect = [-98, 416.2, -82, 421.6];
export const BMX = { scale: 0.62, bike: 0.72, seat: 0.44 * 0.72, pace: 1.7 };
export const BMX_KIDS = 3;
/** A wheelie: up on the back wheel now and then (every `every` seconds, for `hold`), the front at most `lift` up */
export const WHEELIE = { every: 7, hold: 2.4, lift: 0.42 };
const BMX_LOOP = loopOf(BMX_COURT, 0);
/** Where a kid's bike is at t, facing which way, and how far up the front wheel is (radians) */
export function bmxAt(k: number, t: number) {
  const p = BMX_LOOP.at((k / BMX_KIDS) * BMX_LOOP.len + BMX.pace * t);
  const ph = (t + k * 2.3) % WHEELIE.every;
  const up = ph < WHEELIE.hold ? Math.sin((ph / WHEELIE.hold) * Math.PI) : 0;
  return { x: p.x, z: p.z, ry: Math.atan2(p.dx, p.dz), pitch: up * WHEELIE.lift };
}
/** The Close: mopeds up and down it, past the garages (the bollards at its end, the Circus at the other) */
export const MOPED_RUN: Rect = [CLOSE_END + 2.5, ROAD_Z - ROAD_HALF * 0.5, CIRCUS.x - CIRCUS.r - CIRCUS.half - 3, ROAD_Z + ROAD_HALF * 0.5];
export const MOPED = { scale: 0.66, seat: 0.52, pace: 3.2 };
export const MOPEDS = 2;
const MOPED_LOOP = loopOf(MOPED_RUN, 0);
export function mopedAt(k: number, t: number) {
  const p = MOPED_LOOP.at((k / MOPEDS) * MOPED_LOOP.len + MOPED.pace * t);
  return { x: p.x, z: p.z, ry: Math.atan2(p.dx, p.dz) };
}

/* ---------- Play ---------- */

const PITCH_LOOP = loopOf(PITCH.rect, 1.6);
const SWING_SEATS: Pt[] = [PLAYGROUND.swings.x0 + 1.3, PLAYGROUND.swings.x1 - 1.3].map((x): Pt => [x, PLAYGROUND.swings.z]);

const still = (id: string, x: number, z: number, ry: number, clip: Moment['clip'], scale: number | undefined, trim: boolean, y = SLAB_Y): ParkPerson => ({
  id,
  trim,
  scale,
  at: (_t, out) => Object.assign(out, { x, z, ry, y, clip, speed: 0 }),
});

export const ENDS_PEOPLE: ParkPerson[] = [
  ...MOVERS.map((w, i): ParkPerson => ({ id: `ends-${w.lane.id}-${i}`, trim: i % 2 === 1, at: (t, m) => moverAt(w, t, m) })),
  TROLLEY_LADY,
  ...Array.from({ length: BMX_KIDS }, (_, k): ParkPerson => ({
    id: `ends-bmx-${k}`,
    trim: k === 2,
    scale: BMX.scale,
    at(t, m) {
      const p = bmxAt(k, t);
      // (up a little as the front comes up: the saddle's on the back half of the frame)
      return Object.assign(m, { x: p.x, z: p.z, ry: p.ry, y: SLAB_Y + BMX.seat + p.pitch * 0.22, clip: 'sit' as const, speed: 0 });
    },
  })),
  ...Array.from({ length: MOPEDS }, (_, k): ParkPerson => ({
    id: `ends-moped-${k}`,
    trim: k === 1,
    scale: MOPED.scale,
    at(t, m) {
      const p = mopedAt(k, t);
      return Object.assign(m, { x: p.x, z: p.z, ry: p.ry, y: SLAB_Y + MOPED.seat, clip: 'sit' as const, speed: 0 });
    },
  })),
  // The kickabout: four kids running round the court, a keeper at each end
  ...[0, 0.25, 0.5, 0.75].map((f, k): ParkPerson => ({
    id: `ends-pitch-${k}`,
    trim: k % 2 === 1,
    scale: KID,
    at(t, m) {
      const p = PITCH_LOOP.at(f * PITCH_LOOP.len + KID_RUN * t);
      return Object.assign(m, { x: p.x, z: p.z, ry: Math.atan2(p.dx, p.dz), y: SLAB_Y, clip: 'jog' as const, speed: KID_RUN });
    },
  })),
  still('ends-keeper-n', (PITCH.rect[0] + PITCH.rect[2]) / 2, PITCH.rect[1] + 0.8, 0, 'look', KID, false),
  still('ends-keeper-s', (PITCH.rect[0] + PITCH.rect[2]) / 2, PITCH.rect[3] - 0.8, Math.PI, 'look', KID, true),
  ...SWING_SEATS.map(([x, z], k) => still(`ends-swing-${k}`, x, z, 0, 'swing', KID, k === 1, SLAB_Y + 0.5)),
];

/** Each dog walker's dog: whose (an index into ENDS_PEOPLE), its coat, how big; ahead of them on the lead */
export const LEAD = { ahead: 1.05, side: 0 };
export interface EndsDog {
  walker: number;
  coat: string;
  size: number;
  at(t: number, out: Moment): Moment;
}
// (staffies and a lurcher: an estate's dogs)
const COATS = ['#3a2c26', '#e8e2d6', '#8a6a4a', '#5a5d66'];
export const ENDS_DOGS: EndsDog[] = MOVERS.flatMap((w, i) => {
  const k = MOVERS.filter((v, j) => v.lane === w.lane && j < i).length;
  if (!w.lane.dogs.includes(k)) return [];
  const n = i % COATS.length;
  return [
    {
      walker: i,
      coat: COATS[n],
      size: n === 3 ? 1.15 : 0.95,
      at(t: number, out: Moment) {
        moverAt(w, t, out, LEAD.ahead);
        out.x += Math.cos(out.ry) * LEAD.side;
        out.z -= Math.sin(out.ry) * LEAD.side;
        return out;
      },
    },
  ];
});

/* ---------- Standing about ---------- */

const S = Math.PI;
const E = Math.PI / 2;
const W = -Math.PI / 2;
const idle = (x: number, z: number, ry: number, act: Idle['act'] = 'look', y = SLAB_Y, scale?: number): Idle => ({ x, z, ry, act, y, ...(scale ? { scale } : {}) });

/** Leaning on a gallery's parapet, looking out (`side` the way the gallery faces), at its floor */
function railers(id: string, floors: number[], at: number[], acts: Idle['act'][]): Idle[] {
  const b = BLOCKS.find((x) => x.id === id)!;
  const d = b.decks[0];
  const r = deckRect(b, d);
  const out: Idle[] = [];
  floors.forEach((f, i) => {
    const y = d.ys[f];
    const u = at[i % at.length];
    const act = acts[i % acts.length];
    if (d.side === 's') out.push(idle(u, r[3] - 0.38, 0, act, y));
    else if (d.side === 'w') out.push(idle(r[0] + 0.38, u, W, act, y));
    else if (d.side === 'e') out.push(idle(r[2] - 0.38, u, E, act, y));
    else out.push(idle(u, r[1] + 0.38, S, act, y));
  });
  return out;
}

export const ENDS_IDLE: Idle[] = [
  // On the deck railings, looking out over the estate
  // (none on the third floor, where the gallery's walkers go: the rest lean there)
  ...railers('fennel-w', [0, 2, 2, 3, 0], [-94.5, -86.3, -85.6, -76.1, -66.4], ['look', 'chat', 'chat', 'phone', 'look']),
  ...railers('fennel-e', [0, 2, 3, 3], [-42.8, -33.2, -26.1, -20.4], ['phone', 'look', 'look', 'look']),
  ...railers('marten', [0, 1, 2, 3], [393.6, 401.2, 408.8, 416.4], ['look', 'phone', 'look', 'chat']),
  ...railers('linnet', [0, 1], [-91.2, -86.4], ['look', 'look']),
  // Outside the parade: a queue at the chicken shop, two at the barber's, one by the offy, one at the newsagent's
  ...[0, 1, 2].map((k) => idle((unitX(1)[0] + unitX(1)[1]) / 2 - 0.2 + k * 0.05, PARADE.z - 0.55 - k * 0.62, S, k === 0 ? 'look' : 'queue')),
  idle(unitX(3)[0] + 0.6, PARADE.z - 1.15, E, 'chat'),
  idle(unitX(3)[0] + 1.25, PARADE.z - 1.1, W, 'chat'),
  idle((unitX(0)[0] + unitX(0)[1]) / 2, PARADE.z - 0.75, S, 'phone'),
  idle((unitX(5)[0] + unitX(5)[1]) / 2, PARADE.z - 0.7, S),
  // At the corner shops' doors
  // (round the corner on the side street, out of the road's walkers' way)
  ...CORNER_SHOPS.map((c) => (c.side === 'e' ? idle(c.rect[2] + 0.5, c.rect[3] - 0.9, W, 'phone') : idle(c.rect[0] - 0.5, c.rect[3] - 0.9, E, 'phone'))),
  // Bunker Sound: two on the sofa, one at its door with the engineer
  idle(STUDIO.sofa[0] + 0.6, (STUDIO.sofa[1] + STUDIO.sofa[3]) / 2, 0, 'sit', SLAB_Y + SOFA_H - 0.03),
  idle(STUDIO.sofa[2] - 0.6, (STUDIO.sofa[1] + STUDIO.sofa[3]) / 2, 0, 'sit', SLAB_Y + SOFA_H - 0.03),
  idle(STUDIO.door[0] + 1.1, STUDIO.door[1] - 0.7, W, 'chat'),
  idle(STUDIO.door[0] + 0.25, STUDIO.door[1] - 0.6, E, 'chat'),
  // The church: someone at the lychgate, someone by a grave
  idle(LYCHGATE.x1 + 0.9, LYCHGATE.z1 + 0.45, S),
  idle(24.4, 372.6, S),
  // The bus stops on the south avenue (transit.ts: its kerb at x -8.64, z 345 and x -0.36, z 415)
  idle(-9.45, 344.3, E, 'phone'),
  idle(-9.5, 345.9, E, 'queue'),
  idle(0.45, 415.4, W),
  // Two in the well, out of the wind
  idle(WELL.x + 2.4, WELL.z - 2.6, W, 'chat', WELL.floor),
  idle(WELL.x + 1.4, WELL.z - 3.2, E + 0.4, 'chat', WELL.floor),
  // On the benches: the green's two, the playground's
  idle(GREEN.benches[0][0], GREEN.benches[0][1], S, 'sit', SLAB_Y + 0.48),
  idle(GREEN.benches[1][0], GREEN.benches[1][1], E, 'sit', SLAB_Y + 0.48),
  idle(PLAYGROUND.benches[0][0], PLAYGROUND.benches[0][1], S, 'sit', SLAB_Y + 0.48),
  // Watching the game through the ball court's fence
  idle(PITCH.gate[0] - 1.2, PITCH.rect[3] + 0.75, S),
  idle(PITCH.gate[1] + 1.3, PITCH.rect[3] + 0.8, S, 'chat'),
];
