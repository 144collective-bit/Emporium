/*
 * South of The Trenches redesigned (docs/south-plan.md Phase 1a, the owner's calls, 2026-11-14; DOM-free, tested in
 * tests/south.test.ts): the street web, as data, that the city's south is to be re-laid on. Not in the city yet:
 * Phase 1b puts it in the street plan and draws it, and takes up what stands in its way.
 *
 * The story it's laid to (the owner's pick): an old village on winding lanes, the estate dropped into part of it.
 * - **The Circus** (`CIRCUS`), the heart, moved south-west of the old one: five lanes ("spokes") leave it at odd
 *   angles and bend away: the High Road west to Degen's gates, Underhill Lane north to the tunnel's mouth, Church Road
 *   south-west over the village's hill, Southfold Lane south past Lot 9 to the country, and Endswood Road east, which
 *   is ns1s bent in off its straight line.
 * - **The avenues bend** where they reach the estate (the owner's pick): ns1s into Endswood Road, ns2s into Marsh
 *   Lane down to Southfold Lane; the south avenue (ns0s, the city's arterial, its buses and Lot 9's road) and ns3 (the
 *   airport's edge) stay straight.
 * - **Links** between the spokes, meeting them at angles; the village's own streets curving with the ground; and the
 *   closes and crescents grown off them (seeded, the same every time), every one with a footpath through to the next
 *   street (the owner's rule: nowhere is a dead end on foot).
 * - **The brook** from the fields along the village's south edge, under Southfold Lane and on past Lot 9; the rec
 *   ground on its south bank; **Lot 9** shrunk to the south-east inside a fence that wanders with the land, its west
 *   side along the brook's bank; **the hedged fields** round the town.
 * - **Degen's compound** stays exactly where it is (endsfar.ts `PLOT`, its gates on Gate Lane at `HEAD`).
 *
 * The blocks are the faces of the street graph (streetfaces.ts), each with the zone it's in (`zoneAt()`): the tall
 * band along the ring road, the estate round the Circus, the council rows, the village, the bungalows.
 */
import { GATES, HEAD, PLOT } from './endsfar';
import { NS_SOUTH_END } from './layout';
import { area, cross, distTo, faces, inside, nearestIndex, node, seeded, selfCrossings, smooth, type FaceBlock, type GraphLine, type Pt } from './streetfaces';

export type { Pt };
type Rect = [number, number, number, number];

/** A sidewalk's width (layout.ts `WALK_W`) */
const WALK = 0.8;
/** The south's streets' asphalt: one lane each way (layout.ts `LANE`, as the estate's and Sunridge's) */
export const HALF = 1.7;
/** A cul-de-sac's turning circle: its asphalt's radius (as Sunridge's) */
export const BULB = 4.6;
/** A footpath's half width (walk and bikes only, bollards at its ends) */
export const PATH_HALF = 0.9;
/** The avenues' half widths where they cross the south (layout.ts `NS_ROADS`) */
const AVE = { ns0s: { x: -4.5, half: 3.7 }, ns1s: { x: 17, half: 1.7 }, ns2s: { x: 43, half: 1.7 }, ns3: { x: 64.5, half: 3.7 } };
/** The land's edge along the ring road: south of exit 6's slip ramp (it runs to z 328.3), where the old estate's
 * blocks began */
export const EDGE_Z = 335;

/* ---------- The Circus ---------- */

/** The Circus: its middle, its centre line's radius and its half width (one way round, as Uptown's) */
export const CIRCUS = { x: -82, z: 418, r: 11, half: 2 };
/** A point on the Circus's centre line, `deg` round from east (+x) towards south (+z): every 15 a point of its line */
const onCircus = (deg: number, r = CIRCUS.r): Pt => [CIRCUS.x + r * Math.cos((deg * Math.PI) / 180), CIRCUS.z + r * Math.sin((deg * Math.PI) / 180)];
const CIRCUS_PTS: Pt[] = Array.from({ length: 25 }, (_, k): Pt => onCircus(-k * 15 + (k === 24 ? 0 : 0)));
CIRCUS_PTS[24] = [CIRCUS_PTS[0][0], CIRCUS_PTS[0][1]];
/** A spoke's first two points: on the Circus at `deg`, and out from it */
const spoke = (deg: number): Pt[] => [onCircus(deg), onCircus(deg, CIRCUS.r + 6)];

/* ---------- The lines ---------- */

export interface SouthStreet {
  id: string;
  name: string;
  pts: Pt[];
  half: number;
  /** A closed loop (the Circus), one way round it */
  loop?: true;
  oneway?: 1;
  /** A cul-de-sac: its last point its turning circle's middle */
  bulb?: true;
  /** What it is: a spoke or main road, a link, a village street, a close or a crescent */
  kind: 'main' | 'link' | 'street' | 'close' | 'crescent';
}
const S = (id: string, name: string, kind: SouthStreet['kind'], ctrl: Pt[], half = HALF): SouthStreet => ({ id, name, kind, pts: smooth(ctrl), half });
/** A street's point nearest `p` (so a street joining it starts or ends exactly on it) */
const on = (s: SouthStreet, p: Pt): Pt => {
  const q = s.pts[nearestIndex(s.pts, p)];
  return [q[0], q[1]];
};

// The spokes, the lane at Degen's gates and the road out west to the fields
export const HIGH_ROAD = S('south-high', 'High Road', 'main', [...spoke(195), [-114, 409], [-130, 401], [-152, 393], [-176, 386], [-200, 381.2], [-210, 380.2], HEAD]);
export const UNDERHILL = S('south-underhill', 'Underhill Lane', 'main', [...spoke(255), [-90, 392], [-96, 380], [-102, 368], [-106, 358], [-107, 350]]);
UNDERHILL.bulb = true;
export const CHURCH_ROAD = S('south-church', 'Church Road', 'main', [
  ...spoke(150), [-104, 433], [-122, 440], [-142, 446], [-160, 445], [-176, 442], [-192, 440], [-208, 440], [-222, 442], [-236, 446], [-252, 451], [-266, 456], [-284, 465], [-300, 473], [-318, 476], [-340, 475], [-360, 470], [-378, 466], [-400, 469], [-424, 474],
]);
export const SOUTHFOLD = S('south-southfold', 'Southfold Lane', 'main', [
  ...spoke(105), [-91, 445], [-102, 454], [-118, 459], [-134, 464], [-143, 474], [-148, 486], [-151, 500], [-153, 514], [-154, 526], [-155, 540], [-157, 556], [-160, 572], [-162, 588], [-163, 604],
]);
export const GATE_LANE = S('south-gate', 'Gate Lane', 'main', [[-229, 340.5], [-221, 343], [-216.3, 350], [-216, 358], HEAD, [-216, 402], [-216.5, 410], [-221, 420], [-229, 432], on(CHURCH_ROAD, [-236, 446])]);
export const FIELD_LANE = S('south-field', 'Field Lane', 'main', [[-229, 340.5], [-245, 338.5], [-262, 338.5], [-282, 341], [-300, 343], [-320, 341], [-340, 339], [-360, 342], [-380, 346], [-400, 344], [-424, 342]]);
// ns1s bent in to the Circus (Endswood Road), ns2s down to Southfold Lane (Marsh Lane)
const NS1_BEND: Pt = [AVE.ns1s.x, NS_SOUTH_END[1]];
const NS2_BEND: Pt = [AVE.ns2s.x, NS_SOUTH_END[2]];
/** Where the bent avenues' straight runs end (streetplan.ts ends ns1s and ns2s there: the south's streets go on) */
export const NS_BENDS: Record<'ns1s' | 'ns2s', number> = { ns1s: NS1_BEND[1], ns2s: NS2_BEND[1] };
/** Where Lot Lane meets Lot 9's own lane, through its west gate (lot9.ts `lot9-road`'s west end) */
export const LOT9_W: Pt = [-118, 507];
export const ENDSWOOD_ROAD = S('south-endswood', 'Endswood Road', 'main', [NS1_BEND, [16.5, 362], [14, 376], [9, 387], [2, 392.4], [-11, 393.6], [-26, 397], [-41, 405], [-54, 412], ...spoke(345).reverse()]);
export const MARSH_LANE = S('south-marsh', 'Marsh Lane', 'main', [NS2_BEND, [42.5, 376], [41, 394], [36, 410], [28, 424], [16, 434], [3, 440.2], [-12, 441.6], [-30, 446], [-52, 452], [-76, 454.5], on(SOUTHFOLD, [-98, 452])]);
// The links between the spokes
export const FENNEL_WAY = S('south-fennel', 'Fennel Way', 'link', [on(UNDERHILL, [-102, 368]), [-114, 371], [-128, 372], [-150, 366], [-176, 353], [-200, 346], on(GATE_LANE, [-216.5, 352])]);
export const RUNWAY_VIEW = S('south-runway', 'Runway View', 'link', [on(MARSH_LANE, [36, 410]), [46, 420], [56, 428], [AVE.ns3.x, 434]]);
export const LOT_LANE = S('south-lot', 'Lot Lane', 'link', [on(SOUTHFOLD, [-151, 500]), [-142, 505], [-134, 506.6], [-126, 507.2], LOT9_W]);
export const BRAMBLE_LANE = S('south-bramble', 'Bramble Lane', 'link', [on(FIELD_LANE, [-262, 338.5]), [-268, 352], [-274, 368], [-282, 388], [-288, 408], [-292, 428], [-290, 446], [-286, 458], on(CHURCH_ROAD, [-284, 465])]);
export const BROOKSIDE = S('south-brookside', 'Brookside', 'link', [
  on(CHURCH_ROAD, [-160, 445]), [-164, 460], [-167, 476], [-171, 492], [-179, 506], [-190, 515], [-202, 520], [-212, 524], [-230, 525], [-248, 522], [-266, 515], [-282, 506], [-296, 496], [-308, 486], on(CHURCH_ROAD, [-318, 476]),
]);
// The village's streets (the owner's photo: red-brick terraces), curving with the ground
export const BELL_STREET = S('south-bell', 'Bell Street', 'street', [on(HIGH_ROAD, [-152, 393]), [-156, 404], [-160, 414], [-165, 428], [-171, 436], on(CHURCH_ROAD, [-176, 442])]);
export const YEW_WALK = S('south-yew', 'Yew Walk', 'street', [on(BELL_STREET, [-160, 414]), [-146, 417], [-134, 424], on(CHURCH_ROAD, [-122, 440])]);
export const CHAPEL_ROW = S('south-chapel', 'Chapel Row', 'street', [on(CHURCH_ROAD, [-192, 440]), [-186, 450], [-184, 466], [-188, 480], [-200, 489], [-216, 492], [-232, 491], [-246, 486], [-256, 476], [-262, 465], on(CHURCH_ROAD, [-266, 456])]);
export const ORCHARD_STREET = S('south-orchard', 'Orchard Street', 'street', [on(BROOKSIDE, [-167, 476]), [-177, 479], on(CHAPEL_ROW, [-188, 480])]);
export const LARK_STREET = S('south-lark', 'Lark Street', 'street', [on(CHAPEL_ROW, [-216, 492]), [-214, 502], [-212, 513], on(BROOKSIDE, [-212, 524])]);
export const HILL_STREET = S('south-hill', 'Hill Street', 'street', [on(CHAPEL_ROW, [-246, 486]), [-250, 498], [-252, 510], on(BROOKSIDE, [-248, 522])]);
export const MILL_STREET = S('south-mill', 'Mill Street', 'street', [on(SOUTHFOLD, [-148, 486]), [-157, 489], on(BROOKSIDE, [-171, 492])]);
export const THORN_STREET = S('south-thorn', 'Thorn Street', 'street', [on(CHURCH_ROAD, [-252, 451]), [-262, 444], [-276, 436], on(BRAMBLE_LANE, [-292, 428])]);

/** The Circus itself: one way round */
export const CIRCUS_STREET: SouthStreet = { id: 'south-circus', name: 'The Circus', kind: 'main', pts: CIRCUS_PTS, half: CIRCUS.half, loop: true, oneway: 1 };

const MAIN: SouthStreet[] = [
  CIRCUS_STREET, HIGH_ROAD, UNDERHILL, CHURCH_ROAD, SOUTHFOLD, GATE_LANE, FIELD_LANE, ENDSWOOD_ROAD, MARSH_LANE,
  FENNEL_WAY, RUNWAY_VIEW, LOT_LANE, BRAMBLE_LANE, BROOKSIDE,
  BELL_STREET, YEW_WALK, CHAPEL_ROW, ORCHARD_STREET, LARK_STREET, HILL_STREET, MILL_STREET, THORN_STREET,
];

/** The avenues' runs through the south (in the graph, so the blocks keep off them; they're the street plan's own) */
const AVENUE_RUNS: GraphLine[] = [
  { pts: smooth([[AVE.ns0s.x, EDGE_Z], [AVE.ns0s.x, 560]], 6), w: AVE.ns0s.half + WALK, street: 'ns0s' },
  { pts: smooth([[AVE.ns1s.x, EDGE_Z], NS1_BEND], 3), w: AVE.ns1s.half + WALK, street: 'ns1s' },
  { pts: smooth([[AVE.ns2s.x, EDGE_Z], NS2_BEND], 3), w: AVE.ns2s.half + WALK, street: 'ns2s' },
  { pts: smooth([[AVE.ns3.x, EDGE_Z], [AVE.ns3.x, 560]], 6), w: AVE.ns3.half + WALK, street: 'ns3' },
];
/** The land's edge by the ring road: along it to the bend, then round with it to Gate Lane's top */
const RING_EDGE: Pt[] = [
  ...Array.from({ length: 38 }, (_, k): Pt => [AVE.ns3.x - k * 6, EDGE_Z]).filter((p) => p[0] > -160),
  ...smooth([[-160, EDGE_Z], [-178, 336.5], [-196, 338], [-212, 339.5], [-229, 340.5]], 3),
];
// (the avenues' tops on it exactly)
for (const a of Object.values(AVE)) if (!RING_EDGE.some((p) => Math.abs(p[0] - a.x) < 1e-9)) RING_EDGE.push([a.x, EDGE_Z]);
RING_EDGE.sort((p, q) => q[0] - p[0]);

/* ---------- What the streets keep off ---------- */

/** Degen's compound (endsfar.ts: it stays exactly where it is) */
export const COMPOUND: Rect = [PLOT[0], PLOT[1], PLOT[2], PLOT[3]];
/** St Aldwyn's churchyard, on the village's hilltop (the church moves here in Phase 3) */
export const CHURCHYARD: Pt[] = [[-219, 451], [-205, 449], [-192, 451], [-190, 462], [-193, 473], [-207, 475], [-220, 472], [-222, 461]];
/** Lot 9's new fence (the owner's pick: it hugs the brook's bank on its west side and wanders with the slope) */
export const LOT9_EDGE: Pt[] = [
  [-128, 470], [-112, 468.5], [-96, 470], [-80, 468], [-64, 469.5], [-48, 468], [-32, 470], [-21, 474], [-19, 490], [-20, 506], [-18.5, 522], [-20, 538], [-18.5, 554], [-20, 570], [-18.5, 586], [-20, 602], [-21, 618], [-38, 621], [-56, 619.5], [-74, 621.5], [-92, 619.5], [-110, 621], [-119.5, 610], [-118, 594], [-120, 578], [-118.5, 562], [-120, 548], [-129, 545], [-130, 530], [-128.5, 514], [-130, 498], [-128.5, 484],
];
/** The land Lot 9's fence keeps inside (its agreed bounds: the park, its camp moved south of it, the strip between) */
export const LOT9_BOUNDS: Rect[] = [[-131, 467, -17, 546], [-121, 546, -17, 623]];
/** The brook's centre line, from the fields in the west along the village's south edge, on past Lot 9 */
export const BROOK: Pt[] = smooth([
  [-430, 490], [-400, 491], [-372, 498], [-340, 512], [-318, 522], [-300, 530], [-280, 537], [-262, 540], [-240, 539], [-214, 537], [-190, 535], [-170, 534], [-155, 533], [-147, 535], [-141, 541], [-137, 552], [-134, 566], [-132, 586], [-131, 610],
], 2);
/** Its water's half width */
export const BROOK_HALF = 1.2;
/** The rec ground on its south bank: pitches, a pavilion, a skate park (Phase 3) */
export const REC: Pt[] = [[-282, 547], [-250, 546], [-214, 545], [-198, 551], [-200, 566], [-230, 572], [-266, 570], [-284, 560]];
/** The hedges round the fields (the old field lines: the lanes follow them too) */
export const HEDGES: Pt[][] = [
  [[-424, 318], [-392, 316], [-360, 320], [-330, 316], [-300, 320], [-272, 318]],
  [[-396, 350], [-392, 372], [-396, 396], [-390, 430], [-392, 462]],
  [[-346, 344], [-350, 368], [-346, 394], [-352, 424], [-348, 466]],
  [[-424, 392], [-396, 396], [-370, 388], [-346, 394], [-318, 388], [-298, 392]],
  [[-424, 432], [-390, 430], [-352, 424], [-320, 430], [-298, 428]],
  [[-424, 520], [-398, 516], [-372, 524], [-352, 540], [-330, 560], [-320, 600]],
  [[-372, 524], [-380, 560], [-376, 600]],
  [[-292, 578], [-250, 584], [-214, 580], [-190, 590], [-170, 600]],
  [[-214, 580], [-220, 610]],
].map((h) => smooth(h as Pt[], 3));

/* ---------- The zones ---------- */

export type Zone = 'tall' | 'estate' | 'council' | 'village' | 'bungalow' | 'lot9' | 'fields';
/** A line's z at x (its point nearest in x) */
const zAt = (pts: Pt[], x: number) => pts.reduce((b, p) => (Math.abs(p[0] - x) < Math.abs(b[0] - x) ? p : b))[1];
/** Which part of the south a point is in: the tall band along the ring road, the estate round the Circus and east,
 * the council rows north of the High Road, the old village, the bungalows round Degen's compound, Lot 9, the fields */
export function zoneAt(x: number, z: number): Zone {
  if (inside(LOT9_EDGE, [x, z])) return 'lot9';
  if (z < 362 && x > -176 && x < AVE.ns3.x) return 'tall';
  if (x > -104 && x < AVE.ns3.x && z < 470) return 'estate';
  if (x > -216 && x <= -104) return z < zAt(HIGH_ROAD.pts, x) ? 'council' : z < 532 ? 'village' : 'fields';
  if (x <= -216 && x > -294) {
    if (z < zAt(CHURCH_ROAD.pts, x)) return z < EDGE_Z + 2 ? 'fields' : 'bungalow';
    return z < zAt(BROOK, x) - 4 ? 'village' : 'fields';
  }
  if (x <= -294 && x > -322 && z > zAt(CHURCH_ROAD.pts, x) && z < zAt(BROOK, x) - 4) return 'village';
  return 'fields';
}

/* ---------- The closes and crescents, grown off the streets (seeded: the same every time) ---------- */

/** How far apart two streets' centre lines stay (room for a row of houses with gardens each side) */
export const CLEAR = 11;
/** Where closes grow: the council rows, the village and the bungalows (the estate keeps its own courts, Phase 2) */
const GROWS: Zone[] = ['council', 'village', 'bungalow'];
const NAMES = ['Alder', 'Birch', 'Cobble', 'Dove', 'Elder', 'Fern', 'Gorse', 'Heron', 'Ivy', 'Juniper', 'Linden', 'Larch', 'Moss', 'Nettle', 'Oriel', 'Poppy', 'Quince', 'Rowan', 'Sedge', 'Teal', 'Willow', 'Yarrow', 'Aspen', 'Bracken', 'Clover', 'Daisy', 'Ember', 'Foxglove', 'Hazel', 'Iris', 'Kingfisher', 'Lupin', 'Mallow', 'Nightjar', 'Osprey', 'Plover', 'Reed', 'Sparrow', 'Thistle', 'Vetch', 'Wagtail', 'Bluebell', 'Campion', 'Dunnock', 'Finch', 'Goldcrest', 'Holly', 'Jay', 'Kale', 'Lapwing', 'Medlar', 'Nuthatch', 'Orchid', 'Pippin', 'Robin', 'Swift', 'Tansy', 'Umber', 'Violet', 'Warbler'];

/** A spatial hash of every line's points, to ask how near the nearest is */
class Near {
  cell = 6;
  map = new Map<string, { p: Pt; tag: number }[]>();
  add(pts: Pt[], tag: number) {
    for (const p of pts) {
      const k = `${Math.floor(p[0] / this.cell)},${Math.floor(p[1] / this.cell)}`;
      if (!this.map.has(k)) this.map.set(k, []);
      this.map.get(k)!.push({ p, tag });
    }
  }
  /** The nearest point within `r` of p, not of the tags skipped (or of `skipNear` within its radius) */
  dist(p: Pt, r: number, skip: (tag: number, q: Pt) => boolean) {
    let m = Infinity;
    const c = Math.ceil(r / this.cell);
    const [cx, cz] = [Math.floor(p[0] / this.cell), Math.floor(p[1] / this.cell)];
    for (let i = -c; i <= c; i++)
      for (let j = -c; j <= c; j++)
        for (const e of this.map.get(`${cx + i},${cz + j}`) ?? []) {
          if (skip(e.tag, e.p)) continue;
          m = Math.min(m, Math.hypot(e.p[0] - p[0], e.p[1] - p[1]));
        }
    return m;
  }
}

/** Kept clear of streets: the compound, the churchyard, Lot 9, the brook and the rec ground */
const keptOff = (x: number, z: number, m: number) =>
  (x > COMPOUND[0] - m && x < COMPOUND[2] + m && z > COMPOUND[1] - m && z < COMPOUND[3] + m) ||
  inside(CHURCHYARD, [x, z]) || distTo(CHURCHYARD, [x, z], true) < m ||
  inside(LOT9_EDGE, [x, z]) || distTo(LOT9_EDGE, [x, z], true) < m ||
  LOT9_BOUNDS.some((r) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m) ||
  distTo(BROOK, [x, z]) < BROOK_HALF + m + 2 ||
  inside(REC, [x, z]);

export interface Footpath {
  id: string;
  /** From a close's turning circle (or a crescent's far side) through to the next street or the green */
  pts: Pt[];
  /** The close or crescent it leads out of */
  from: string;
}

const grown = (() => {
  const rnd = seeded(14112026);
  const streets: SouthStreet[] = [];
  const paths: Footpath[] = [];
  const near = new Near();
  const all = [...MAIN];
  all.forEach((s, i) => near.add(s.pts, i));
  near.add(RING_EDGE, -1);
  for (const a of AVENUE_RUNS) near.add(a.pts, -2);
  const parents = MAIN.filter((s) => !s.loop);
  /** A straight path from a to b clear of every street but the ones it joins, and of what's kept off */
  const pathClear = (a: Pt, b: Pt, own: number[]) => {
    // (over no street but the ones it joins)
    const [bx0, bz0, bx1, bz1] = [Math.min(a[0], b[0]) - 1, Math.min(a[1], b[1]) - 1, Math.max(a[0], b[0]) + 1, Math.max(a[1], b[1]) + 1];
    for (let si = 0; si < all.length; si++) {
      if (own.includes(si)) continue;
      const P = all[si].pts;
      for (let k = 1; k < P.length; k++) {
        if (Math.max(P[k][0], P[k - 1][0]) < bx0 || Math.min(P[k][0], P[k - 1][0]) > bx1 || Math.max(P[k][1], P[k - 1][1]) < bz0 || Math.min(P[k][1], P[k - 1][1]) > bz1) continue;
        if (cross(a, b, P[k - 1], P[k])) return false;
      }
    }
    const n = Math.max(3, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.2));
    for (let k = 1; k < n; k++) {
      const p: Pt = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n];
      if (keptOff(p[0], p[1], 1)) return false;
      if (k > 2 && k < n - 2 && near.dist(p, 4, (t) => own.includes(t)) < HALF + PATH_HALF + 0.5) return false;
      for (const fp of paths) if (distTo(fp.pts, p) < 3) return false;
    }
    return true;
  };
  /** From a point, a footpath out to the nearest other street (not those given) within reach */
  const pathFrom = (e: Pt, own: number[], notTo: number, ahead: Pt): Pt | null => {
    const cands: [number, Pt, number][] = [];
    all.forEach((s, i) => {
      if (own.includes(i) || i === notTo) return;
      for (const q of s.pts) {
        const d = Math.hypot(q[0] - e[0], q[1] - e[1]);
        // (on ahead, out past the close's end or the crescent's back: never back the way it came)
        if (d > 4 && d < 36 && ((q[0] - e[0]) * ahead[0] + (q[1] - e[1]) * ahead[1]) / d > 0.35) cands.push([d, q, i]);
      }
    });
    cands.sort((p, q) => p[0] - q[0]);
    for (const [, q, i] of cands.slice(0, 80)) if (pathClear(e, q, [...own, i])) return [q[0], q[1]];
    return null;
  };
  let tries = 0;
  let crescents = 0;
  while (tries++ < 16000 && streets.length < NAMES.length) {
    const pi = Math.floor(rnd() * parents.length);
    const par = parents[pi];
    const parIdx = MAIN.indexOf(par);
    const i = 4 + Math.floor(rnd() * Math.max(1, par.pts.length - 8));
    if (i >= par.pts.length - 4) continue;
    const [x, z] = par.pts[i];
    const [a, b] = [par.pts[i - 1], par.pts[i + 1]];
    let [tx, tz] = [b[0] - a[0], b[1] - a[1]];
    const tl = Math.hypot(tx, tz) || 1;
    [tx, tz] = [tx / tl, tz / tl];
    const side = rnd() < 0.5 ? 1 : -1;
    // (never square on: off at an angle)
    const turn = (0.25 + rnd() * 0.3) * (rnd() < 0.5 ? 1 : -1);
    const [nx0, nz0] = [-tz * side, tx * side];
    const [nx, nz] = [nx0 * Math.cos(turn) - nz0 * Math.sin(turn), nz0 * Math.cos(turn) + nx0 * Math.sin(turn)];
    const zone = zoneAt(x + nx * 12, z + nz * 12);
    if (!GROWS.includes(zone)) continue;
    // (the crescents first, while there's room for their sweep; the closes after, into what's left)
    const crescent = tries < 3000 ? crescents < 7 && rnd() < (zone === 'village' ? 0.8 : 0.5) : false;
    if (tries < 3000 && !crescent) continue;
    let ctrl: Pt[];
    if (crescent) {
      const j = i + 12 + Math.floor(rnd() * 9);
      if (j >= par.pts.length - 3) continue;
      const [ex, ez] = par.pts[j];
      const d = 12 + rnd() * 7;
      ctrl = [[x, z], [x + nx * d * 0.75, z + nz * d * 0.75], [(x + ex) / 2 + nx0 * d * 1.05, (z + ez) / 2 + nz0 * d * 1.05], [ex + nx0 * d * 0.75, ez + nz0 * d * 0.75], [ex, ez]];
    } else {
      const L = 14 + rnd() * 16;
      const bend = (rnd() - 0.5) * 0.8;
      const [mx, mz] = [x + nx * L * 0.55, z + nz * L * 0.55];
      ctrl = [[x, z], [mx, mz], [mx + (nx * Math.cos(bend) - nz * Math.sin(bend)) * L * 0.5, mz + (nz * Math.cos(bend) + nx * Math.sin(bend)) * L * 0.5]];
    }
    // (a crescent's span of its parent free of junctions: no other street meets it there)
    if (crescent) {
      const jIdx = nearestIndex(par.pts, ctrl[4]);
      let busy = false;
      for (let k = Math.max(0, i - 8); k <= Math.min(par.pts.length - 1, jIdx + 8) && !busy; k++) busy = near.dist(par.pts[k], 6, (t) => t === parIdx) < 6;
      if (busy) continue;
    }
    const pts = smooth(ctrl);
    // (a crescent round enough ground for a row of houses inside it)
    if (crescent && Math.abs(area(pts)) < 200) continue;
    const [sx0, sz0] = pts[0];
    const end = pts[pts.length - 1];
    let ok = true;
    for (let k = 1; k < pts.length && ok; k++) {
      const p = pts[k];
      const zn = zoneAt(p[0], p[1]);
      if (!GROWS.includes(zn) || keptOff(p[0], p[1], crescent ? 3 : 4)) ok = false;
      // (and over no footpath laid already)
      if (ok && paths.some((fp) => distTo(fp.pts, p) < HALF + PATH_HALF + 0.5)) ok = false;
      // (clear of every other street; of its parent but where it leaves it, and comes back to it)
      const fromStart = Math.hypot(p[0] - sx0, p[1] - sz0);
      const fromEnd = Math.hypot(p[0] - end[0], p[1] - end[1]);
      if (ok && fromStart > (crescent ? 8 : 4) && (!crescent || fromEnd > 8)) {
        // (a crescent wraps its parent: the ground between them is its row of houses, kept by its area above)
        const d = near.dist(p, CLEAR + 1, (t, q) => t === parIdx && (crescent || Math.hypot(q[0] - sx0, q[1] - sz0) < 14));
        if (d < (k === pts.length - 1 && !crescent ? CLEAR - 1 + BULB - HALF : CLEAR)) ok = false;
      }
    }
    if (!ok) continue;
    // ...and its way through on foot: out of its turning circle, or off its far side
    const id = `south-c${streets.length}`;
    // (its path joins it and the street it reaches, and crosses nothing else: not even the street it grew off)
    const own = [all.length];
    const from = crescent ? pts[Math.floor(pts.length / 2)] : end;
    all.push({ id, name: '', kind: 'close', pts, half: HALF });
    // (the way on: past a close's end along its last stretch; out from a crescent's back, away from its parent)
    const tail = pts.length - 1;
    const ahead: Pt = crescent ? [nx0, nz0] : [pts[tail][0] - pts[tail - 3][0], pts[tail][1] - pts[tail - 3][1]];
    const al = Math.hypot(ahead[0], ahead[1]) || 1;
    const to = pathFrom(from, own, parIdx, [ahead[0] / al, ahead[1] / al]);
    if (!to) {
      all.pop();
      continue;
    }
    const name = `${NAMES[streets.length]} ${crescent ? 'Crescent' : zone === 'bungalow' ? 'Gardens' : 'Close'}`;
    all[all.length - 1] = { id, name, kind: crescent ? 'crescent' : 'close', pts, half: HALF, ...(crescent ? {} : { bulb: true as const }) };
    streets.push(all[all.length - 1]);
    if (crescent) crescents++;
    near.add(pts, all.length - 1);
    paths.push({ id: `${id}-path`, pts: [[from[0], from[1]], to], from: id });
    if (streets.length >= 64) break;
  }
  return { streets, paths };
})();

/** Every street the south adds to the street plan */
export const SOUTH_STREETS: SouthStreet[] = [...MAIN, ...grown.streets];

/** The tunnel's mouth (lot9.ts `TUNNEL`, under the ring road from The Trenches) to Underhill Lane's turning circle */
const TUNNEL_PATH: Footpath = { id: 'south-tunnel-path', pts: [[-112, 337], [-109.5, 345.6]], from: UNDERHILL.id };
/** The footpaths: out of every close and crescent, and from the tunnel */
export const FOOTPATHS: Footpath[] = [...grown.paths, TUNNEL_PATH];

/* ---------- The graph, its crossings and its blocks ---------- */

const GRAPH = node([
  ...SOUTH_STREETS.map((s): GraphLine => ({ pts: s.pts, w: s.half + WALK, street: s.id, ...(s.loop ? { closed: true } : {}) })),
  ...AVENUE_RUNS,
  { pts: RING_EDGE, w: 0 },
]);
/** The streets' lines as noded (a crossing's point in each street that meets it) */
export const NODED: Record<string, Pt[]> = Object.fromEntries(GRAPH.lines.filter((l) => l.street).map((l) => [l.street!, l.pts]));

export interface SouthCrossing {
  id: string;
  at: Pt;
  streets: string[];
}
/** Where streets meet: two or more of them at a node (the avenues by their street plan ids) */
export const SOUTH_CROSSINGS: SouthCrossing[] = (() => {
  const out: SouthCrossing[] = [];
  for (const n of GRAPH.nodes) {
    const ids = GRAPH.lines.filter((l) => l.street && l.pts.some((p) => Math.abs(p[0] - n[0]) < 1e-4 && Math.abs(p[1] - n[1]) < 1e-4)).map((l) => l.street!);
    const uniq = [...new Set(ids)];
    if (uniq.length < 2) continue;
    // (where a bent avenue carries on as a south street, end to end: a join, straight on only, routes.ts)
    const bend = Object.entries(NS_BENDS).find(([id, z]) => uniq.includes(id) && Math.abs(n[1] - z) < 1e-6);
    out.push({ id: bend ? `south-${bend[0]}-join` : `south-x${out.length}`, at: [n[0], n[1]], streets: uniq });
  }
  return out;
})();

export interface SouthBlock extends FaceBlock {
  zone: Zone;
}
const centroid = (poly: Pt[]): Pt => {
  let [a, cx, cz] = [0, 0, 0];
  for (let i = 0; i < poly.length; i++) {
    const [p, q] = [poly[i], poly[(i + 1) % poly.length]];
    const c = p[0] * q[1] - q[0] * p[1];
    a += c;
    cx += (p[0] + q[0]) * c;
    cz += (p[1] + q[1]) * c;
  }
  return a ? [cx / (3 * a), cz / (3 * a)] : poly[0];
};
/** The blocks between the streets, each with the zone it's mostly in */
const FACES = faces(GRAPH, SOUTH_STREETS.filter((s) => s.bulb).map((s) => ({ at: s.pts[s.pts.length - 1], r: BULB })), 'south-b', WALK);
/** A face too thin for anything to stand on (inside a tight crescent, say): left as the grass of the verge */
const sliver = (b: FaceBlock) => Math.abs(area(b.poly)) < 120 || selfCrossings(b.poly) > 0;
/** The slivers' outlines (the greens between a crescent and its street) */
export const SOUTH_GREENS: Pt[][] = FACES.filter(sliver).map((b) => b.poly);
export const SOUTH_BLOCKS: SouthBlock[] = FACES.filter((b) => !sliver(b)).map((b, i) => ({ ...b, id: `south-b${i}` })).map((b) => {
  const c = centroid(b.poly);
  const zone = inside(b.poly, c) ? zoneAt(c[0], c[1]) : zoneAt(b.poly[0][0], b.poly[0][1]);
  return { ...b, zone };
});

/** Where a street crosses the brook (a bridge each) */
export const BRIDGES: { street: string; at: Pt }[] = (() => {
  const out: { street: string; at: Pt }[] = [];
  for (const s of SOUTH_STREETS)
    for (let i = 1; i < s.pts.length; i++) {
      const p = s.pts[i];
      if (distTo(BROOK, p) < 1 && !out.some((b) => b.street === s.id && Math.hypot(b.at[0] - p[0], b.at[1] - p[1]) < 6)) out.push({ street: s.id, at: [p[0], p[1]] });
    }
  return out;
})();

/** The estate's land round the Circus and along the ring road, and the village's and the rows' (ground.ts: what
 * covers their ground) */
export const ESTATE_LAND: Rect = [-176, EDGE_Z, AVE.ns3.x, 470];
export const VILLAGE_LAND: Rect = [-322, EDGE_Z, -104, 530];

/** What the south's drawing covers (districts.ts: its chunk loads as you come near): the streets, the brook, the
 * hedges and the fields' edge, the tunnel's mouth */
export const SOUTH_DRAWN: Rect = [-432, 300, 66, 615];

/** The compound's gates face Gate Lane (endsfar.ts `GATES`), at `HEAD` */
export const COMPOUND_GATES = { ...GATES, on: GATE_LANE.id };
