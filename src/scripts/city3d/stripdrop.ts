/*
 * The Neon Mile's drop-offs (docs/strip-plan.md Phase 7: the porte-cochères' drives, promised since Phase 2),
 * DOM-free (tested in tests/stripdrop.test.ts). Each resort's own car under its porte-cochère comes and goes on the
 * clock, the same for everyone: in along the boulevard's kerb lane from its far end, right in across the sidewalk
 * and under the canopy (between its posts) into the bay by the door, a while there with the valets, then out
 * through the canopy's other end and back into the lane, and on to the boulevard's other end. The north row's cars
 * come westbound (the north side's lanes), the south row's eastbound; each car faces east in its bay, as it always
 * stood. Away, the bay is empty. Under reduced motion resorts3d.ts draws each at `DROP_STILL`, parked.
 *
 * Resorts whose way in or out a pylon or the coaster's land would block are left out of `DROPS` (their cars stay
 * parked: `PARKED`); the tests hold every path clear of the solids, the people and the other cars.
 */
import { CARS, type CarId } from './carspec';
import { STRIP_BLVD, STRIP_EAST_X } from './layout';
import { BLVD_WEST, STRIP_LAMPS } from './strip';
import { RESORTS, type Resort } from './resorts';

type Pt = [number, number];

/** The kerb lanes' middles: the north side's westbound, the south side's eastbound (routes.ts: the median's lanes pushed out, the outer lane) */
const KERB = 4.55;
export const LANE_N = STRIP_BLVD.z - KERB;
export const LANE_S = STRIP_BLVD.z + KERB;
/** Where a car comes on and goes off the boulevard: a little in from each end's junction */
export const ENDS: [number, number] = [BLVD_WEST + 3, STRIP_EAST_X - 3];
/** Speeds (tiles a second): along the boulevard, and in the drive under the canopy */
export const CRUISE = 3.8;
export const CRAWL = 1.4;
/** How long it stands in the bay, and how often each resort's car comes round */
export const STAND = 55;
export const PERIOD = 150;
/** The turns' radii: off the lane, into the bay, out of the bay, back onto the lane */
const R_OFF = 2.4;
const R_BAY = 1.6;
const R_OUT = 1.2;
/** How far a car keeps from a lamp's post (its post and a little) */
const LAMP_CLEAR = 0.3;
/** The moment shown under reduced motion: every car parked in its bay */
export const DROP_STILL = -1;

const arc = (cx: number, cz: number, r: number, a0: number, a1: number, n = 8): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos(a0 + ((a1 - a0) * i) / n), cz + r * Math.sin(a0 + ((a1 - a0) * i) / n)]);
const lengthOf = (pts: Pt[]) => pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
/** A point along a path d from its start, with its heading as a car's yaw (+x is 0, turned about y: -z is PI / 2) */
function along(pts: Pt[], d: number): { x: number; z: number; yaw: number } {
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= l || i === pts.length - 1) {
      const k = Math.min(1, Math.max(0, d / Math.max(l, 1e-9)));
      return { x: a[0] + (b[0] - a[0]) * k, z: a[1] + (b[1] - a[1]) * k, yaw: Math.atan2(-(b[1] - a[1]), b[0] - a[0]) };
    }
    d -= l;
  }
  const p = pts[pts.length - 1];
  return { x: p[0], z: p[1], yaw: 0 };
}

export interface Drop {
  id: Resort['id'];
  car: CarId;
  paint: string;
  /** Its bay: where it stands under the canopy, facing east */
  bay: Pt;
  /** The way in: along the boulevard from its far end, into the bay (the part off the lane crawled) */
  road: Pt[];
  drive: Pt[];
  /** The way out: out of the bay and onto the lane (crawled), then along to the boulevard's other end */
  exit: Pt[];
  away: Pt[];
  /** Seconds into the period it sets off from the boulevard's end */
  phase: number;
}

/** A resort's way in and out (its bay is where its car always stood) */
function wayOf(r: Resort, phase: number): Drop {
  const [id, bx, bz, , paint] = r.cars[0];
  const [px0, , px1] = r.porte.rect;
  const half = CARS[id].L / 2;
  // In across the canopy's west part, out through its east end: the nearest ways whose sweep keeps clear of the
  // sidewalk's lamps on that side (each tried as the tests try it, the car's footprint along the path)
  const side = r.row === 'north' ? -1 : 1;
  const lamps = STRIP_LAMPS.filter(([, z]) => Math.sign(z - STRIP_BLVD.z) === side).map(([x, z]): Pt => [x, z]);
  const { L: len, W: wid } = CARS[id];
  const clear = (pts: Pt[]) => !sweeps(pts, len, wid, lamps);
  const L = r.row === 'north' ? LANE_N : LANE_S;
  const ins = (xn: number) => (r.row === 'north' ? inNorth(xn, bx, bz, L) : inSouth(xn, bx, bz, L));
  const outs = (xe: number) => (r.row === 'north' ? outNorth(xe, bx, bz, L) : outSouth(xe, bx, bz, L));
  // (in: between the canopy's west posts and far enough short of the bay to turn into it; out: past its east posts)
  const nearest = (base: number, lo: number, hi: number, ok: (x: number) => boolean) => {
    for (let k = 0; k <= 40; k++) for (const x of [base + k * 0.1, base - k * 0.1]) if (x >= lo && x <= hi && ok(x)) return x;
    return NaN;
  };
  const xn = nearest(px0 + 1.6, px0 + 1.15, bx - R_BAY, (x) => clear(ins(x).drive));
  const xe = nearest(Math.max(px1 + 0.6, bx + half + 0.2), Math.max(px1 + 0.6, bx + half + 0.2), px1 + 4, (x) => clear(outs(x).exit));
  return { id: r.id, car: id, paint, bay: [bx, bz], ...ins(xn), ...outs(xe), phase };
}

/** The north row's: westbound along the north side; right off the lane (north), right again into the bay (east) */
function inNorth(xn: number, bx: number, bz: number, L: number) {
  const road: Pt[] = [[ENDS[1], L], [xn + R_OFF, L]];
  const drive: Pt[] = [...arc(xn + R_OFF, L - R_OFF, R_OFF, Math.PI / 2, Math.PI), ...arc(xn + R_BAY, bz + R_BAY, R_BAY, Math.PI, (3 * Math.PI) / 2).slice(1), [bx, bz]];
  return { road, drive };
}
/** ...out of the bay east, right (south) towards the boulevard, right again onto the lane (west) */
function outNorth(xe: number, bx: number, bz: number, L: number) {
  const exit: Pt[] = [[bx, bz], ...arc(xe, bz + R_OUT, R_OUT, -Math.PI / 2, 0), ...arc(xe + R_OUT - R_OFF, L - R_OFF, R_OFF, 0, Math.PI / 2).slice(1)];
  return { exit, away: [exit[exit.length - 1], [ENDS[0], L]] as Pt[] };
}
/** The south row's: eastbound along the south side; right off the lane (south), left into the bay (east) */
function inSouth(xn: number, bx: number, bz: number, L: number) {
  const road: Pt[] = [[ENDS[0], L], [xn - R_OFF, L]];
  const drive: Pt[] = [...arc(xn - R_OFF, L + R_OFF, R_OFF, -Math.PI / 2, 0), ...arc(xn + R_BAY, bz - R_BAY, R_BAY, Math.PI, Math.PI / 2).slice(1), [bx, bz]];
  return { road, drive };
}
/** ...out of the bay east, left (north) towards the boulevard, right onto the lane (east) */
function outSouth(xe: number, bx: number, bz: number, L: number) {
  const exit: Pt[] = [[bx, bz], ...arc(xe, bz - R_OUT, R_OUT, Math.PI / 2, 0), ...arc(xe + R_OUT + R_OFF, L + R_OFF, R_OFF, Math.PI, (3 * Math.PI) / 2).slice(1)];
  return { exit, away: [exit[exit.length - 1], [ENDS[1], L]] as Pt[] };
}
/** Whether a car len x wid driven along a path comes within a lamp post's reach of any lamp */
function sweeps(pts: Pt[], len: number, wid: number, lamps: Pt[]) {
  const total = lengthOf(pts);
  for (let d = 0; d <= total; d += 0.1) {
    const p = along(pts, d);
    const [c, s] = [Math.cos(p.yaw), -Math.sin(p.yaw)];
    for (const [lx, lz] of lamps) {
      const [dx, dz] = [lx - p.x, lz - p.z];
      if (Math.abs(dx * c + dz * s) < len / 2 + LAMP_CLEAR && Math.abs(-dx * s + dz * c) < wid / 2 + LAMP_CLEAR) return true;
    }
  }
  return false;
}

/** The resorts whose car comes and goes (Big City's pylon stands across its way out: its car stays parked) */
export const DROP_IDS: Resort['id'][] = ['wildace', 'dragonspire', 'scarab', 'gondolier', 'lagoon', 'orbit'];
export const DROPS: Drop[] = DROP_IDS.map((id, i) => wayOf(RESORTS.find((r) => r.id === id)!, (i * PERIOD) / DROP_IDS.length));
/** The canopy cars that stay parked */
export const PARKED = RESORTS.filter((r) => !DROP_IDS.includes(r.id)).flatMap((r) => r.cars);

/** How long each leg takes */
export function legsOf(d: Drop) {
  return { road: lengthOf(d.road) / CRUISE, drive: lengthOf(d.drive) / CRAWL, exit: lengthOf(d.exit) / CRAWL, away: lengthOf(d.away) / CRUISE };
}

/** A drop-off's car at t (x, z, its yaw as a car's: +x its front), whether it's standing in its bay, or null while it's away */
export function dropAt(d: Drop, t: number): { x: number; z: number; yaw: number; parked: boolean } | null {
  if (t === DROP_STILL) return { x: d.bay[0], z: d.bay[1], yaw: 0, parked: true };
  const g = legsOf(d);
  let u = (((t - d.phase) % PERIOD) + PERIOD) % PERIOD;
  if (u < g.road) return { ...along(d.road, u * CRUISE), parked: false };
  u -= g.road;
  if (u < g.drive) return { ...along(d.drive, u * CRAWL), parked: false };
  u -= g.drive;
  if (u < STAND) return { x: d.bay[0], z: d.bay[1], yaw: 0, parked: true };
  u -= STAND;
  if (u < g.exit) return { ...along(d.exit, u * CRAWL), parked: false };
  u -= g.exit;
  if (u < g.away) return { ...along(d.away, u * CRUISE), parked: false };
  return null;
}
