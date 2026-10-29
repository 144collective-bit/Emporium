/*
 * Crestmont's life (docs/crestmont-plan.md Phase 8; DOM-free, tested in tests/crestlife.test.ts): who's out in the
 * town, each a function of the time (the movers) or standing where they stand, the same for everyone.
 *
 * - **On the hill roads** (`CREST_PEOPLE`): joggers up and down Ridge Road, dog walkers on Canyon Drive, each road a
 *   lane out along its left shoulder and back along its right (clear of the lamps, the walls and the traffic), at
 *   the bed's height as it climbs; everyone in a lane at its pace and evenly spread, so nobody runs through anybody.
 *   A dog (`CREST_DOGS`) trots on its lead ahead of each dog walker. They're the park's kind of crowd person
 *   (parklife.ts `ParkPerson`; life.ts moves them with the park's).
 * - **Standing about** (`CREST_IDLE`): the valets by their stands on Coral Drive, doormen at the boutiques and the
 *   grand hotel, diners at the cafés' tables, people by the piazza's fountain, on the overlook, the clubhouse's
 *   terrace and the civic hall's walk, sunbathers on the pools' loungers (the estates', the mansions', the hotel's)
 *   and the estates' gardeners at work in the front gardens (`GARDENERS`: each with a wheelbarrow, drawn by
 *   crestlife3d.ts).
 * - **The Drive's shoppers** are the town's walkers round the Drive's blocks (life.ts: `DRIVE_BLOCKS` join its
 *   walks), most with a shopping bag in hand.
 * - **The traffic** (life.ts): a few cars of Crestmont's own (`CREST_MIX`: coupes, Midnight Execs and Hyper Comets)
 *   and its tour bus (`TOUR_PAINT`), put back on its streets (`CREST_RECT`) when they wander off.
 */
import { HILL_ROADS, type HillRoad } from './crestmont';
import { heightAt } from './terrain';
import { BOUTIQUES, FOUNTAINS, KERBS, SLAB_Y, TABLES, TABLE_R, VALET_STANDS, VIA, doorOf, outOf } from './coral';
import { COURT_HALF, ESTATES, toWorld } from './estates';
import { MANSIONS, toWorld as mansionAt } from './mansions';
import { CIVIC, CLUB, HOTEL, OVERLOOK } from './crestsites';
import type { Idle } from './landmarks';
import type { Moment, ParkPerson } from './parklife';
import type { CarId } from './mycar';

type Pt = [number, number];

/* ---------- The hill roads ---------- */

/** How far out from a hill road's centre line its lanes run: the left shoulder out, the right shoulder back (the lamps
 * stand on the right at its half + 0.45, the walls and rails at + 0.55) */
export const SHOULDER = { left: 0.2, right: 0.1 } as const;
/** Their paces (tiles a second): a jog as the park's, a dog walker's stroll */
export const JOG_PACE = 1.7;
export const WALK_PACE = 0.5;
/** Kept off a road's ends (its junctions) */
const ENDS = 5;

interface Lane {
  id: string;
  /** The hill road it runs along */
  road: string;
  pts: Pt[];
  ys: number[];
  cum: number[];
  len: number;
  pace: number;
  count: number;
  dogs: number[];
}
/** A hill road's lane: out along its left shoulder at the bed's height and back along its right */
function laneOf(r: HillRoad, id: string, pace: number, count: number, dogs: number[] = []): Lane {
  const len = r.cum[r.cum.length - 1];
  const out: Pt[] = [];
  const back: Pt[] = [];
  const yo: number[] = [];
  const yb: number[] = [];
  for (let d = ENDS; d <= len - ENDS; d += 1.5) {
    let i = 1;
    while (i < r.cum.length - 1 && r.cum[i] < d) i++;
    const [a, b] = [r.pts[i - 1], r.pts[i]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const f = (d - r.cum[i - 1]) / (r.cum[i] - r.cum[i - 1] || 1);
    const p: Pt = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    // (right of travel is (-u.z, u.x))
    const [nx, nz] = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
    const L = r.half + SHOULDER.left;
    const R = r.half + SHOULDER.right;
    const [o, k]: Pt[] = [[p[0] - nx * L, p[1] - nz * L], [p[0] + nx * R, p[1] + nz * R]];
    out.push(o);
    back.push(k);
    // (the ground there: the bed's, eased into the next road's at a junction and round a bend's shoulder)
    yo.push(heightAt(...o));
    yb.push(heightAt(...k));
  }
  const pts = [...out, ...back.reverse()];
  const ys = [...yo, ...yb.reverse()];
  const cum = [0];
  for (let i = 1; i <= pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i % pts.length][0] - pts[i - 1][0], pts[i % pts.length][1] - pts[i - 1][1]));
  return { id, road: r.id, pts, ys, cum, len: cum[cum.length - 1], pace, count, dogs };
}
const road = (id: string) => HILL_ROADS.find((r) => r.id === id)!;
export const LANES: Lane[] = [laneOf(road('crest-ridge'), 'ridge-jog', JOG_PACE, 4), laneOf(road('crest-canyon'), 'canyon-walk', WALK_PACE, 4, [0, 2])];

const scratch = { x: 0, z: 0, y: 0, dx: 0, dz: 0 };
/** The point `u` along a lane (wrapping): where, its height, the way along it */
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
  scratch.y = l.ys[lo] + (l.ys[n] - l.ys[lo]) * f;
  scratch.dx = (b[0] - a[0]) / seg;
  scratch.dz = (b[1] - a[1]) / seg;
  return scratch;
}
interface Mover {
  lane: Lane;
  u0: number;
}
const MOVERS: Mover[] = LANES.flatMap((l, li) => Array.from({ length: l.count }, (_, k) => ({ lane: l, u0: (li * 53.1 + (k / l.count) * l.len) % l.len })));
function moverAt(w: Mover, t: number, out: Moment, ahead = 0, side = 0) {
  const s = along(w.lane, w.u0 + w.lane.pace * t + ahead);
  out.x = s.x - s.dz * side;
  out.z = s.z + s.dx * side;
  out.y = s.y;
  out.ry = Math.atan2(s.dx, s.dz);
  out.clip = w.lane.pace > 1 ? 'jog' : 'walk';
  out.speed = w.lane.pace;
  return out;
}
export const CREST_PEOPLE: ParkPerson[] = MOVERS.map((w, i) => ({ id: `${w.lane.id}-${i}`, trim: i % 2 === 1, at: (t, m) => moverAt(w, t, m) }));

/** Each dog walker's dog: whose (an index into CREST_PEOPLE), its coat, how big; ahead of them on the lead */
export const LEAD = { ahead: 1.1, side: 0.25 };
export interface CrestDog {
  walker: number;
  coat: string;
  size: number;
  at(t: number, out: Moment): Moment;
}
const COATS = ['#f2ede3', '#c8915a', '#2b2622', '#d9c39a'];
export const CREST_DOGS: CrestDog[] = MOVERS.flatMap((w, i) => {
  const k = MOVERS.filter((v, j) => v.lane === w.lane && j < i).length;
  if (!w.lane.dogs.includes(k)) return [];
  const n = i % COATS.length;
  return [{ walker: i, coat: COATS[n], size: [0.8, 1.1, 0.9, 1][n], at: (t: number, m: Moment) => moverAt(w, t, m, LEAD.ahead, -LEAD.side) }];
});

/* ---------- Standing about ---------- */

const facing = (dx: number, dz: number) => Math.atan2(dx, dz);
/** A lounger's seat over its deck, and a café chair's (coral3d.ts) */
const LOUNGE_Y = 0.25;
const CHAIR_Y = 0.45;

/** The gardeners: in the front garden beside the forecourt of every third estate, facing the house; their wheelbarrows beside them */
export const GARDENERS: { x: number; z: number; ry: number; barrow: Pt; barrowRy: number }[] = ESTATES.flatMap((e, i) => {
  if (i % 3 !== 1) return [];
  const v = (e.court[0] + e.court[1]) / 2;
  const s = e.hc + COURT_HALF + 1.8 < e.W - 1.2 ? 1 : -1;
  const u = e.hc + s * (COURT_HALF + 1.8);
  if (u < 1.2 || u > e.W - 1.2) return [];
  const [x, z] = toWorld(e, u, v);
  const [hx, hz] = toWorld(e, u, v - 1);
  const [bx, bz] = toWorld(e, u + s * 0.85, v + 0.2);
  const [ax, az] = toWorld(e, u + s * 0.85, v + 1);
  // (both well inside its own lot)
  const within = (px: number, pz: number) => px > e.rect[0] + 0.8 && px < e.rect[2] - 0.8 && pz > e.rect[1] + 0.8 && pz < e.rect[3] - 0.8;
  if (!within(x, z) || !within(bx, bz)) return [];
  return [{ x, z, ry: facing(hx - x, hz - z), barrow: [bx, bz], barrowRy: Math.atan2(-(az - bz), ax - bx) }];
});

export const CREST_IDLE: Idle[] = (() => {
  const out: Idle[] = [];
  // The valets by their stands, a step along the kerb from each, facing the street
  for (const [x, z] of VALET_STANDS) out.push({ x, z: z + 0.7, y: SLAB_Y, ry: facing(x < (KERBS[0] + KERBS[1]) / 2 ? 1 : -1, 0), act: 'serve' });
  // A doorman at every other boutique's door, a little out from it and to one side
  BOUTIQUES.forEach((b, i) => {
    if (i % 2 || b.cafe) return;
    const [dx, dz] = doorOf(b);
    const [ox, oz] = outOf(b.face);
    out.push({ x: dx + ox * 0.95 + oz * 0.6, z: dz + oz * 0.95 + ox * 0.6, y: SLAB_Y, ry: facing(ox, oz), act: 'look' });
  });
  // The cafés' diners: one on each chair (either side of the table along z), facing it
  TABLES.forEach(([x, z]) => {
    for (const s of [-1, 1]) out.push({ x, z: z + s * (TABLE_R - 0.15), y: SLAB_Y + CHAIR_Y, ry: facing(0, -s), act: 'eat' });
  });
  // By the piazza's fountain: a pair chatting, someone reading their phone
  const big = FOUNTAINS[FOUNTAINS.length - 1];
  out.push({ x: big.x - big.r - 0.9, z: VIA.z - 0.45, y: SLAB_Y, ry: facing(0, 1), act: 'chat' });
  out.push({ x: big.x - big.r - 0.9, z: VIA.z + 0.45, y: SLAB_Y, ry: facing(0, -1), act: 'chat' });
  out.push({ x: big.x + big.r + 0.8, z: VIA.z + 1.3, y: SLAB_Y, ry: facing(-1, 0), act: 'phone' });
  // The hotel: two doormen under the porte-cochère either side of its door, and the pool garden's sunbathers and swimmers' friends
  const pz = (HOTEL.porte[1] + HOTEL.porte[3]) / 2;
  for (const s of [-1, 1]) out.push({ x: HOTEL.body[0] - 0.45, z: pz + s * 1.3, y: SLAB_Y, ry: facing(-1, 0), act: 'look' });
  const P = HOTEL.pool;
  [P[0] + 0.6, P[0] + 3.4, P[0] + 7.6].forEach((x, k) => {
    // (on the loungers along the pool's long sides: the north row's facing +z, the south row's -z; crestsites3d.ts)
    const north = k % 2 === 0;
    out.push({ x, z: north ? P[1] - 1.25 : P[3] + 1.25, y: SLAB_Y + LOUNGE_Y + 0.03, ry: facing(0, north ? 1 : -1), act: 'lounge' });
  });
  out.push({ x: P[2] + 1.4, z: P[1] + 1.2, y: SLAB_Y, ry: facing(0, 1), act: 'chat' });
  out.push({ x: P[2] + 1.4, z: P[1] + 2.1, y: SLAB_Y, ry: facing(0, -1), act: 'chat' });
  // The estates' sunbathers: on the first lounger of every other estate (estates3d.ts: beside the pool's end, its length back from it)
  ESTATES.forEach((e, i) => {
    if (i % 2) return;
    const [pu0, pv0] = e.pool;
    const [x, z] = toWorld(e, pu0 - 0.75, pv0 - 0.35);
    const [ax, az] = toWorld(e, pu0 - 0.75, pv0 - 1.2);
    out.push({ x, z, y: SLAB_Y + LOUNGE_Y + 0.03, ry: facing(ax - x, az - z), act: 'lounge' });
  });
  // The mansions': one on each pool's first lounger (mansions3d.ts), facing the water
  for (const m of MANSIONS) {
    const [pu0, pv0] = m.pool;
    const [x, z] = mansionAt(m, pu0 + 0.6, pv0 + 1.45);
    const [ax, az] = mansionAt(m, pu0 + 0.6, pv0 + 0.6);
    out.push({ x, z, y: m.y + LOUNGE_Y + 0.03, ry: facing(ax - x, az - z), act: 'lounge' });
  }
  // The gardeners, at work (looking over the beds)
  for (const g of GARDENERS) out.push({ x: g.x, z: g.z, y: SLAB_Y, ry: g.ry, act: 'look' });
  // On the overlook, two taking in the view
  const [ocx, ocz] = [(OVERLOOK.rect[0] + OVERLOOK.rect[2]) / 2, (OVERLOOK.rect[1] + OVERLOOK.rect[3]) / 2];
  const [lx, lz] = OVERLOOK.look;
  for (const s of [-1, 1]) out.push({ x: ocx + lx * 1.5 - lz * s * 0.7, z: ocz + lz * 1.5 + lx * s * 0.7, y: OVERLOOK.y + 0.02, ry: facing(lx, lz), act: 'look' });
  // On the clubhouse's terrace, a group chatting; on the civic hall's walk, a pair
  const tz = (CLUB.terrace[1] + CLUB.terrace[3]) / 2;
  for (const [x, z, ry] of [
    [CLUB.terrace[0] + 3, tz, facing(1, 0)],
    [CLUB.terrace[0] + 4, tz - 0.4, facing(-1, 0.3)],
    [CLUB.terrace[0] + 4, tz + 0.5, facing(-1, -0.4)],
  ] as [number, number, number][])
    out.push({ x, z, y: CLUB.y + 0.02, ry, act: 'chat' });
  const wx = (CIVIC.walk[0] + CIVIC.walk[2]) / 2;
  out.push({ x: wx - 0.45, z: -74, y: CIVIC.y + 0.02, ry: facing(1, 0), act: 'chat' });
  out.push({ x: wx + 0.45, z: -74, y: CIVIC.y + 0.02, ry: facing(-1, 0), act: 'chat' });
  return out;
})();

/* ---------- The traffic ---------- */

/** Crestmont's own cars (life.ts: after its tour bus), in turn */
export const CREST_MIX: CarId[] = ['coupe', 'exec', 'super', 'coupe', 'exec', 'super', 'coupe'];
/** The tour bus's livery: cream (the City Bus's own model) */
export const TOUR_PAINT = '#efe3c4';
