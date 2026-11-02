/*
 * Sunridge's life (docs/suburb-plan.md Phase 5; DOM-free, the chunk's, tested in tests/sunlife.test.ts): who's out in
 * the suburb, each a function of the time (the movers) or standing where they stand, the same for everyone. The
 * houses, yards and amenities are the chunk's, so all of it comes with the chunk and goes into the crowd's spare
 * slots when it loads (life.ts `addPeople()`); the dogs and the residents' cars are drawn by sunlife3d.ts.
 *
 * - **On the sidewalks** (`SUN_PEOPLE`): walkers and dog walkers round Sunridge Parkway, joggers along Mesa Drive, each
 *   street a lane out along one sidewalk's kerb and back along the other (clear of the lamps, which stand further in),
 *   everyone in a lane at its pace and evenly spread, so nobody walks through anybody; a dog (`SUN_DOGS`) trots on
 *   its lead ahead of each dog walker.
 * - **In the park:** joggers one way round the park's walk and walkers (one with a dog) the other; kids running a loop
 *   on the lawn and on the swings; on the school's field two kids running.
 * - **Standing about** (`SUN_IDLE`): at the club the sunbathers on the loungers, the lifeguard in the chair, a pair
 *   at the splash pool and the pickleball players; in the park people on the benches and at the ramada's tables,
 *   parents by the playground, a kid at the slide's foot, someone at the drinking fountain; at the school kids on
 *   its playground and someone at the flagpole; the residents on their porches, at their grills (`cook`), at the
 *   patio tables and on the pools' loungers (about 90 standing about in all, under the crowd's spare slots).
 * - **The residents' cars** (`DRIVEWAY_CARS`): a car on about one driveway in three, nosed up to the garage, solid
 *   (`DRIVEWAY_SOLIDS`, joined when the chunk loads).
 * - **The traffic** (life.ts): a few family cars of Sunridge's own and the school bus (`SUN_MIX`, `SCHOOL_BUS_PAINT`
 *   in sunridge.ts, the boot's), put back on its streets (`SUNRIDGE_RECT`) when they wander off.
 */
import { MESA, PARKWAY_LOOP, SUN_CROSSINGS, type Pt } from './sunridge';
import { SLAB_Y } from './sunplaces';
import { COURTS as PICKLEBALL, DRINK, FIELD, LIFEGUARD, LOUNGERS, PARK_BENCHES, PARK_TABLES, PARK_WALK, PLAY, SCHOOL_PLAY_TOWER, SPLASH, FLAG } from './sunamenities';
import { FLOOR, HOUSES, partBoxes, toWorld } from './sunhouses';
import { YARDS } from './sunyards';
import { KID, KID_RUN, loopOf } from './play';
import { JOG_PACE, WALK_PACE, type Moment, type ParkPerson } from './parklife';
import { CARS } from './carspec';
import type { Idle } from './landmarks';
import type { CarId } from './mycar';

type Box = [number, number, number, number, number];

/* ---------- The sidewalks ---------- */

/** How far out from a street's asphalt edge its lane runs: along the kerb, inside the lamps (at + 0.45) */
export const KERB_IN = 0.12;
/** Kept off a street's ends and its junctions */
const ENDS = 6;

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
const closeLoop = (pts: Pt[]) => {
  const cum = [0];
  for (let i = 1; i <= pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i % pts.length][0] - pts[i - 1][0], pts[i % pts.length][1] - pts[i - 1][1]));
  return { cum, len: cum[cum.length - 1] };
};
/** A street's lane: out along its right-hand kerb and back along its left (a loop street: round it on the one side, then the other) */
function kerbLane(id: string, line: Pt[], half: number, loop: boolean, junctions: Pt[], pace: number, count: number, dogs: number[] = []): Lane {
  const pts = loop ? line.slice(0, -1) : line;
  const out: Pt[] = [];
  const back: Pt[] = [];
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = cum[cum.length - 1];
  const n = loop ? pts.length : pts.length - 1;
  for (let d = loop ? 0 : ENDS; d <= (loop ? len : len - ENDS); d += 1.5) {
    let i = 1;
    while (i < n && cum[i] < d) i++;
    const [a, b] = [pts[i - 1], pts[i % pts.length]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const f = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    const p: Pt = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    // (the junctions' mouths left clear: the people cross them in a straight line from kerb to kerb)
    if (junctions.some((c) => Math.hypot(c[0] - p[0], c[1] - p[1]) < half + 3)) continue;
    const [nx, nz] = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
    const k = half + KERB_IN;
    out.push([p[0] + nx * k, p[1] + nz * k]);
    back.push([p[0] - nx * k, p[1] - nz * k]);
  }
  const all = [...out, ...back.reverse()];
  return { id, pts: all, ...closeLoop(all), pace, count, dogs };
}
/** A path's lane: along it, `side` off its middle (right of its way) */
function pathLane(id: string, line: Pt[], side: number, pace: number, count: number, dogs: number[] = []): Lane {
  const pts = line.slice(0, -1);
  const out: Pt[] = pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    return [p[0] - ((q[1] - p[1]) / l) * side, p[1] + ((q[0] - p[0]) / l) * side];
  });
  if (side < 0) out.reverse();
  return { id, pts: out, ...closeLoop(out), pace, count, dogs };
}
const junctions = SUN_CROSSINGS.map((c) => c.at);
export const LANES: Lane[] = [
  kerbLane('loop-walk', PARKWAY_LOOP, 1.7, true, junctions, WALK_PACE, 10, [1, 4, 7]),
  kerbLane('mesa-jog', MESA.pts, 1.7, false, junctions, JOG_PACE, 4),
  pathLane('park-jog', PARK_WALK, 0.28, JOG_PACE, 2),
  pathLane('park-walk', PARK_WALK, -0.28, WALK_PACE, 3, [1]),
];

const scratch = { x: 0, z: 0, dx: 0, dz: 0 };
/** The point `u` along a lane (wrapping): where, the way along it */
function along(l: Lane, u: number) {
  u = ((u % l.len) + l.len) % l.len;
  let lo = 0;
  let hi = l.pts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (l.cum[mid] <= u) lo = mid;
    else hi = mid - 1;
  }
  const n = (lo + 1) % l.pts.length;
  const [a, b] = [l.pts[lo], l.pts[n]];
  const seg = l.cum[lo + 1] - l.cum[lo] || 1;
  const f = (u - l.cum[lo]) / seg;
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
const MOVERS: Mover[] = LANES.flatMap((l, li) => Array.from({ length: l.count }, (_, k) => ({ lane: l, u0: (li * 37.3 + (k / l.count) * l.len) % l.len })));
function moverAt(w: Mover, t: number, out: Moment, ahead = 0, side = 0) {
  const s = along(w.lane, w.u0 + w.lane.pace * t + ahead);
  out.x = s.x - s.dz * side;
  out.z = s.z + s.dx * side;
  out.y = SLAB_Y;
  out.ry = Math.atan2(s.dx, s.dz);
  out.clip = w.lane.pace > 1 ? 'jog' : 'walk';
  out.speed = w.lane.pace;
  return out;
}
/** Someone standing (or sitting, `y` the seat) in one spot playing `clip` */
function still(id: string, x: number, z: number, ry: number, clip: Moment['clip'], scale: number | undefined, trim: boolean, y = SLAB_Y): ParkPerson {
  return {
    id,
    trim,
    scale,
    at(_t, out) {
      out.x = x;
      out.z = z;
      out.ry = ry;
      out.y = y;
      out.clip = clip;
      out.speed = 0;
      return out;
    },
  };
}
/** A kid running round a loop on the grass */
function runner(id: string, rect: [number, number, number, number], phase: number, trim: boolean): ParkPerson {
  const loop = loopOf(rect, 0);
  return {
    id,
    trim,
    scale: KID,
    at(t, out) {
      const p = loop.at(phase * loop.len + t * KID_RUN);
      out.x = p.x;
      out.z = p.z;
      out.ry = Math.atan2(p.dx, p.dz);
      out.y = SLAB_Y;
      out.clip = 'jog';
      out.speed = KID_RUN;
      return out;
    },
  };
}
/** The kids' loop on the park's lawn, between the playground, the ramada and the trees */
export const LAWN_LOOP: [number, number, number, number] = [182, -47.5, 190, -40];
/** ...and on the school's field, inside the goals */
export const FIELD_LOOP: [number, number, number, number] = [FIELD[0] + 2.5, FIELD[1] + 2, FIELD[2] - 2.5, FIELD[3] - 2];
/** The swings' seats (sunamenities3d: three on the bar, their tops at 0.46) and which a kid sits on, facing into the playground */
export const SWING_SEATS: Pt[] = [0, 2].map((k) => [PLAY.swings.x0 + ((PLAY.swings.x1 - PLAY.swings.x0) * (k + 0.5)) / 3, PLAY.swings.z]);

export const SUN_PEOPLE: ParkPerson[] = [
  ...MOVERS.map((w, i): ParkPerson => ({ id: `${w.lane.id}-${i}`, trim: i % 2 === 1, at: (t, m) => moverAt(w, t, m) })),
  ...[0, 1 / 3, 2 / 3].map((f, k) => runner(`lawn-run-${k}`, LAWN_LOOP, f, k === 1)),
  ...[0, 0.5].map((f, k) => runner(`field-run-${k}`, FIELD_LOOP, f, k === 1)),
  ...SWING_SEATS.map(([x, z], k) => still(`swing-${k}`, x, z, 0, 'swing', KID, k === 1, SLAB_Y + 0.5)),
];

/** Each dog walker's dog: whose (an index into SUN_PEOPLE), its coat, how big; ahead of them on the lead */
export const LEAD = { ahead: 1.1, side: 0.25 };
export interface SunDog {
  walker: number;
  coat: string;
  size: number;
  at(t: number, out: Moment): Moment;
}
const COATS = ['#f2ede3', '#c8915a', '#2b2622', '#d9c39a'];
export const SUN_DOGS: SunDog[] = MOVERS.flatMap((w, i) => {
  const k = MOVERS.filter((v, j) => v.lane === w.lane && j < i).length;
  if (!w.lane.dogs.includes(k)) return [];
  const n = i % COATS.length;
  return [{ walker: i, coat: COATS[n], size: [0.8, 1.1, 0.9, 1][n], at: (t: number, m: Moment) => moverAt(w, t, m, LEAD.ahead, -LEAD.side) }];
});

/* ---------- Standing about ---------- */

const facing = (dx: number, dz: number) => Math.atan2(dx, dz);
/** A lounger's seat over its deck (sunyards3d, sunamenities3d: 0.24 to its top), a chair's, a bench's, a picnic table's */
const LOUNGE_Y = 0.27;
const CHAIR_Y = 0.45;
const BENCH_Y = 0.45;
const TABLE_Y = 0.48;
/** The facing of a house's +v (into the lot) in the world */
const inward = (h: (typeof HOUSES)[number]) => facing(h.v[0], h.v[1]);

export const SUN_IDLE: Idle[] = (() => {
  const out: Idle[] = [];
  // The club: sunbathers on three of the loungers (they face the lap pool), the lifeguard in the chair, a pair chatting
  // at the splash pool's edge, a pair on each pickleball court either side of the net
  LOUNGERS.forEach(({ x, z }, k) => k % 2 === 0 && out.push({ x, z: z - 0.1, y: SLAB_Y + LOUNGE_Y, ry: facing(0, -1), act: 'lounge' }));
  out.push({ x: LIFEGUARD[0], z: LIFEGUARD[1], y: SLAB_Y + 1.51, ry: facing(0, -1), act: 'sit' });
  for (const s of [-1, 1]) out.push({ x: SPLASH.x - SPLASH.r - 0.6, z: SPLASH.z + s * 0.45, y: SLAB_Y, ry: facing(0, -s), act: 'chat' });
  for (const [x0, z0, x1, z1] of PICKLEBALL) {
    const cx = (x0 + x1) / 2;
    out.push({ x: cx - 0.3, z: z0 + 1.5, y: SLAB_Y, ry: facing(0, 1), act: 'look' }, { x: cx + 0.3, z: z1 - 1.5, y: SLAB_Y, ry: facing(0, -1), act: 'look' });
  }
  // The park: someone on every bench, two at each of the ramada's tables, parents by the playground, a kid at the
  // slide's foot, someone at the drinking fountain
  for (const b of PARK_BENCHES) out.push({ x: b.x, z: b.z, y: SLAB_Y + BENCH_Y, ry: b.yaw, act: 'sit' });
  for (const [x, z] of PARK_TABLES) out.push({ x: x - 0.45, z: z - 0.7, y: SLAB_Y + TABLE_Y, ry: facing(0, 1), act: 'eat' }, { x: x + 0.45, z: z + 0.7, y: SLAB_Y + TABLE_Y, ry: facing(0, -1), act: 'eat' });
  out.push({ x: 178.5, z: -47.8, y: SLAB_Y, ry: facing(0, -1), act: 'phone' }, { x: 183.3, z: -47.8, y: SLAB_Y, ry: facing(-0.3, -1), act: 'look' });
  out.push({ x: PLAY.slide.x, z: PLAY.slide.z1 + 0.4, y: SLAB_Y, ry: facing(0, -1), act: 'look', scale: KID });
  out.push({ x: DRINK[0] + 0.5, z: DRINK[1], y: SLAB_Y, ry: facing(-1, 0), act: 'look' });
  // The school: two kids by its playground's tower, someone at the flagpole
  const [tx, tz] = SCHOOL_PLAY_TOWER;
  out.push({ x: tx - 1.5, z: tz, y: SLAB_Y, ry: facing(1, 0), act: 'look', scale: KID }, { x: tx, z: tz + 1.7, y: SLAB_Y, ry: facing(0, -1), act: 'chat', scale: KID });
  out.push({ x: FLAG[0] + 0.7, z: FLAG[1] - 0.8, y: SLAB_Y, ry: facing(-0.6, 1), act: 'look' });
  // The residents: on every other porch (looking out at the street, or reading their phone), at every fifth grill, at
  // every eighth patio's table (two eating), on every other pool's first lounger (about 65 in all: the crowd keeps
  // 128 slots for a district's people, life.ts `reserve`)
  HOUSES.forEach((h, i) => {
    const y = YARDS[i];
    if (h.porch && i % 2 === 0) {
      const [u0, u1, d] = h.porch;
      const main = h.parts.find((p) => p.kind === 'main')!;
      // (a step in from the porch's front, behind its posts and off them, clear of a tower or wing standing forward of
      // the rooms' front: the first spot across the porch that is)
      const v = main.v0 - d + 0.5;
      const posts = [u0 + 0.12, (u0 + u1) / 2, u1 - 0.12];
      const clear = (u: number) => u > u0 + 0.25 && u < u1 - 0.25 && posts.every((q) => Math.abs(q - u) > 0.28) && !h.parts.some((q) => u > q.u0 - 0.3 && u < q.u1 + 0.3 && v > q.v0 - 0.3 && v < q.v1 + 0.3);
      const u = [0.25, 0.75, 0.4, 0.6].map((f) => u0 + (u1 - u0) * f).find(clear);
      if (u !== undefined) {
        const [x, z] = toWorld(h, u, v);
        out.push({ x, z, y: SLAB_Y + FLOOR, ry: inward(h) + Math.PI, act: (i >> 1) % 2 ? 'phone' : 'look' });
      }
    }
    if (i % 5 === 1) {
      // (beside the grill on the patio, facing it along the house's back)
      const [x, z] = toWorld(h, y.grill.u - 0.6, y.grill.v);
      out.push({ x, z, y: SLAB_Y, ry: facing(h.u[0], h.u[1]), act: 'cook' });
    }
    if (i % 8 === 2) {
      const [pu0, pv0, pu1, pv1] = y.patio;
      const tu = (pu0 + pu1) / 2 - 0.4;
      const tv = (pv0 + pv1) / 2 + 0.1;
      for (const s of [-1, 1]) {
        const [x, z] = toWorld(h, tu + s * 0.55, tv);
        out.push({ x, z, y: SLAB_Y + CHAIR_Y, ry: inward(h) + (s < 0 ? Math.PI / 2 : -Math.PI / 2), act: 'eat' });
      }
    }
    if (y.pool && i % 2 === 0) {
      // (sunyards3d: the first lounger's seat along v0 - 1.32 .. v0 - 0.42, its back at the pool's end)
      const [x, z] = toWorld(h, y.pool.u0 + 0.4, y.pool.v0 - 0.87);
      out.push({ x, z, y: SLAB_Y + LOUNGE_Y, ry: inward(h) + Math.PI, act: 'lounge' });
    }
  });
  return out;
})();

/* ---------- The residents' cars ---------- */

/** The cars on the driveways: a model, where (world), its yaw (cars.ts: +x forward, turned about y), its paint */
export type ParkedCar = [CarId, number, number, number, string];
const PAINTS = ['#f3f2f7', '#2b2a40', '#8c1d2c', '#3b5f8f', '#9a96b8', '#e8e0c8', '#1f3a2e'];
/** Nosed up to the garage, this far off its door; a driveway shorter than the car and this is left empty */
export const NOSE_GAP = 0.3;
export const DRIVEWAY_CARS: ParkedCar[] = HOUSES.flatMap((h, i): ParkedCar[] => {
  if (i % 3) return [];
  const room = h.garageDoor.v - NOSE_GAP - 0.4;
  // (the longest family car that fits, in turn)
  const models: CarId[] = ['sedan', 'hatch', 'van', 'coupe', 'pickup', 'hatch', 'sedan'];
  const model = models.slice(i % models.length).concat(models).find((m) => CARS[m].L <= room);
  if (!model) return [];
  const L = CARS[model].L;
  const [x, z] = toWorld(h, (h.drive[0] + h.drive[1]) / 2, h.garageDoor.v - NOSE_GAP - L / 2);
  return [[model, x, z, Math.atan2(-h.v[1], h.v[0]), PAINTS[(i * 7) % PAINTS.length]]];
});
/** Their footprints, in the house's frame (a box where the lot is square to the axes, small cells where it's turned) */
export const DRIVEWAY_SOLIDS: Box[] = HOUSES.flatMap((h, i) => {
  if (i % 3) return [];
  const car = DRIVEWAY_CARS.find(([, x, z]) => {
    const [hx, hz] = toWorld(h, (h.drive[0] + h.drive[1]) / 2, h.garageDoor.v - 1.5);
    return Math.hypot(hx - x, hz - z) < 2.5;
  });
  if (!car) return [];
  const { L, W } = CARS[car[0]];
  const u = (h.drive[0] + h.drive[1]) / 2;
  const v = h.garageDoor.v - NOSE_GAP - L / 2;
  return partBoxes(h, u - W / 2, u + W / 2, v - L / 2, v + L / 2, SLAB_Y + 1.2);
});
