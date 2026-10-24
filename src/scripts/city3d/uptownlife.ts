/*
 * Uptown's people (docs/finance-plan.md Phase 6; DOM-free, tested in
 * tests/uptownlife.test.ts): who the district's sidewalks, esplanade and bike
 * lanes carry, each a function of the time as the park's are (parklife.ts),
 * so life.ts draws them in the crowd like the park's (kind `park`).
 *
 * - **Walkers** (`UPTOWN_WALKS`): the blocks round the plaza and the
 *   diagonal that life.ts's walkers go round (with walkers of their own, as
 *   The Trenches'), crossing at the lit junctions. The town's mix is mostly
 *   suits, and couriers with their bags.
 * - **Joggers on the esplanade** (`JOG`): out and back along its open walk
 *   between the trees by the avenue and the benches by the water, eastbound
 *   on the avenue's side, westbound on the water's, evenly spread at one
 *   pace, so none meets another.
 * - **Cyclists** (`CYCLISTS`, `cyclistAt()`): riders in the one-way pair's
 *   bike lanes (uptown.ts `BIKE`, on the kerb side right of travel), from
 *   avenue to avenue the way the street runs, two to a lane; uptownlife3d.ts
 *   draws their bikes under them (`BIKE_SEAT`: the saddle).
 */
import type { Pt } from './uptown';
import { BIKE, COUPLET, ROWS_Z } from './uptown';
import { ESPLANADE } from './boulevard';
import { DECK_Y } from './waterfront';
import { JOG_PACE, type Moment, type ParkPerson } from './parklife';

/** The street's top (world.ts's road level, just over the ground) */
const ROAD_Y = 0.035;

/** The blocks Uptown's walkers go round: the plaza's and those either side of it, and those along the diagonal */
export const UPTOWN_WALKS = ['uptown-n1', 'uptown-m1', 'uptown-s1', 'uptown-m2w', 'uptown-s2', 'uptown-n2e'];

/* ---------- The esplanade ---------- */

const [EX0, EZ0, EX1, EZ1] = ESPLANADE;
/** The open walk between the land trees (by the kerb) and the benches (by the water): its two jogging lines (z) */
export const JOG = { east: EZ0 + 1.75, west: EZ1 - 2.45, x0: EX0 + 1.2, x1: EX1 - 1.2, count: 4 };
/** Out along one line and back along the other: the place `u` along that loop (wrapping) and which way they face */
function jogLine(u: number, out: Moment, back: number) {
  const len = JOG.x1 - JOG.x0;
  const L = 2 * len + 2 * (JOG.west - JOG.east);
  u = ((u % L) + L) % L;
  if (u < len) Object.assign(out, { x: JOG.x0 + u, z: JOG.east, ry: Math.PI / 2 });
  else if (u < len + (JOG.west - JOG.east)) Object.assign(out, { x: JOG.x1, z: JOG.east + (u - len), ry: 0 });
  else if (u < 2 * len + (JOG.west - JOG.east)) Object.assign(out, { x: JOG.x1 - (u - len - (JOG.west - JOG.east)), z: JOG.west, ry: -Math.PI / 2 });
  else Object.assign(out, { x: JOG.x0, z: JOG.west - (u - 2 * len - (JOG.west - JOG.east)), ry: Math.PI });
  out.y = DECK_Y;
  out.speed = back;
  return out;
}
/** The joggers' loop's length */
export const JOG_LOOP = 2 * (JOG.x1 - JOG.x0) + 2 * (JOG.west - JOG.east);

/* ---------- The bike lanes ---------- */

const [RING, , , BANK] = ROWS_Z;
/** A bike lane: its x, the way it runs (+1 south, -1 north) and where it starts and ends (the avenues' kerbs) */
export interface BikeLane {
  x: number;
  dir: 1 | -1;
  z0: number;
  z1: number;
}
export const BIKE_LANES: BikeLane[] = [
  // (northbound on the pair's west street, its east kerb; southbound on the east street, its west kerb: uptown.ts)
  { x: COUPLET.north + BIKE.off, dir: -1, z0: RING.c + RING.half, z1: BANK.c - BANK.half },
  { x: COUPLET.south - BIKE.off, dir: 1, z0: RING.c + RING.half, z1: BANK.c - BANK.half },
];
/** A cyclist's pace (tiles a second: about 5 m/s), and the saddle's height over the road (the crowd's scale) */
export const BIKE_PACE = 2.9;
export const BIKE_SEAT = 0.44;
export interface Cyclist {
  lane: BikeLane;
  /** Where along the lane at t = 0 */
  u0: number;
}
export const CYCLISTS: Cyclist[] = BIKE_LANES.flatMap((lane, i) => {
  const len = lane.z1 - lane.z0;
  return [0, 1].map((k) => ({ lane, u0: (i * 17.3 + (k / 2) * len) % len }));
});
/** Where a cyclist is at t: x, z, the way they face (life.ts's ry: atan2 of the way along x and z), on the road */
export function cyclistAt(c: Cyclist, t: number, out: { x: number; z: number; ry: number }) {
  const len = c.lane.z1 - c.lane.z0;
  const u = (((c.u0 + BIKE_PACE * t) % len) + len) % len;
  out.x = c.lane.x;
  out.z = c.lane.dir === 1 ? c.lane.z0 + u : c.lane.z1 - u;
  out.ry = c.lane.dir === 1 ? 0 : Math.PI;
  return out;
}

/* ---------- Everyone ---------- */

export const UPTOWN_PEOPLE: ParkPerson[] = (() => {
  const out: ParkPerson[] = [];
  // Joggers (half on phones, the trim), evenly spread round the loop at one pace, so none meets another
  for (let k = 0; k < JOG.count; k++)
    out.push({
      id: `esplanade-jog-${k}`,
      trim: k % 2 === 1,
      at: (t, m) => {
        jogLine((k / JOG.count) * JOG_LOOP + JOG_PACE * t, m, JOG_PACE);
        m.clip = 'jog';
        return m;
      },
    });
  // The cyclists, sitting on their saddles
  const at = { x: 0, z: 0, ry: 0 };
  CYCLISTS.forEach((c, k) =>
    out.push({
      id: `cyclist-${k}`,
      trim: false,
      at: (t, m) => {
        cyclistAt(c, t, at);
        Object.assign(m, { x: at.x, z: at.z, ry: at.ry, y: ROAD_Y + BIKE_SEAT, clip: 'sit' as const, speed: 0 });
        return m;
      },
    })
  );
  return out;
})();

/** For the tests: every point a person can be at (sampled), and the bike lanes' lines */
export const samplePeople = (step = 0.5, until = 120): { id: string; at: Pt; y: number; clip: string }[] => {
  const out: { id: string; at: Pt; y: number; clip: string }[] = [];
  const m: Moment = { x: 0, z: 0, ry: 0, y: 0, clip: 'look', speed: 0 };
  for (let t = 0; t < until; t += step) for (const p of UPTOWN_PEOPLE) {
    p.at(t, m);
    out.push({ id: p.id, at: [m.x, m.z], y: m.y, clip: m.clip });
  }
  return out;
};
