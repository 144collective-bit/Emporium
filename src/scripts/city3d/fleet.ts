/*
 * The traffic's other vehicles (vehicle plan Phase 8). DOM-free: life.ts
 * draws them, tests/fleet.test.ts checks the rules.
 *
 * - **Delivery trucks** (the box truck and the big rig) pull over at
 *   loading bays (`BAYS`: data from the street plan, along the avenues in
 *   town each way, halfway between the bus stops so a truck never stands in
 *   one, `BAY_CLEAR` from any crossing so a rig's trailer is clear of the
 *   junction behind it, never on a bridge) and stand there unloading a while
 *   (`BAY_DWELL`), their hazard lights blinking; the buses' rules
 *   (transit.ts `routeStops()`, `pullIn()`, `busStep()`) with these bays.
 * - **The big rig** is a tractor and its trailer, each placed along the
 *   route (`rigAlong()`): the tractor ahead, its fifth wheel where the
 *   trailer's kingpin is, the trailer's axles further back, so it swings
 *   round a corner behind the tractor as a real one does.
 * - **Patrol cars** drive like the rest and never chase, stop or bother
 *   you; now and then their light bar flashes blue and magenta for a few
 *   seconds (`barLit()`), each car at its own time.
 * - **Bikes and scooters** (Phase 7's models) ride in the lanes with a
 *   rider from the crowd; they lean a little into turns (`trafficLean()`),
 *   never so far the rider looks wrong upright on it.
 */
import { LANE, RIVER } from './layout';
import { PLAN, pointAt, streetLength, type Pt, type Street } from './streetplan';
import { inTown } from './outer';
import { inTrenches } from './trenches';
import { rightOf } from './routes';
import { BUS_STOPS, STOP_GAP, type BusStop } from './transit';
import { CARS, FIFTH_WHEEL, TRAILER } from './carspec';
import { G } from './bike-sim';
import type { BikeId } from './mybike';

/* ---------- Loading bays ---------- */

/** The rig's whole length, the tractor's nose to the trailer's tail (life.ts follows and stops it by this) */
export const RIG_LEN = CARS.rig.L / 2 - FIFTH_WHEEL + TRAILER.pin + TRAILER.L / 2;
/**
 * How far a loading bay keeps from a crossing ahead of it (the junction's stop line) and behind it (a rig standing
 * there, nose at the bay, has its whole length behind it and the junction's own width past that)
 */
export const BAY_AHEAD = 7;
export const BAY_BEHIND = RIG_LEN + 5.5;
/** A bus standing at its stop reaches this far back from it (the bus's length) */
const BUS_BACK = CARS.bus.L;
/** How long a truck stands unloading, the shortest and the longest (seconds) */
export const BAY_DWELL: [number, number] = [10, 18];

/**
 * The loading bays along one avenue, each way: one between each two of its bus stops, as near halfway as is clear
 * of the crossings (`BAY_AHEAD`, `BAY_BEHIND`) and of the stops either side (a rig at the bay and a bus at a stop
 * never overlap; exported for the tests)
 */
export function baysOn(s: Street, crossings: Pt[]): BusStop[] {
  const out: BusStop[] = [];
  const len = streetLength(s);
  for (const way of [1, -1] as const) {
    // (the bus stops are at STOP_GAP / 2 + k STOP_GAP, the other way 6 further on: halfway between is STOP_GAP + k STOP_GAP)
    for (let mid = STOP_GAP + (way === -1 ? 6 : 0), k = 0; mid < len - 3; mid += STOP_GAP, k++) {
      for (const off of [0, 2, -2, 4, -4, 6, -6]) {
        const d = mid + off;
        if (d < 1 || d > len - 1) continue;
        const { at, dir } = pointAt(s, d);
        const u: Pt = way === 1 ? dir : [-dir[0], -dir[1]];
        const r = rightOf(u[0], u[1]);
        if (!inTown(at, 2) && !inTrenches(at[0], at[1])) break;
        if (at[1] > RIVER[0] - 6 && at[1] < RIVER[1] + 6 && Math.abs(dir[1]) > 0.5) break;
        const ahead = (c: Pt) => (c[0] - at[0]) * u[0] + (c[1] - at[1]) * u[1];
        if (crossings.some((c) => Math.hypot(c[0] - at[0], c[1] - at[1]) < BAY_BEHIND + 1 && (ahead(c) >= 0 ? ahead(c) < BAY_AHEAD : -ahead(c) < BAY_BEHIND))) continue;
        // (a stop's front `back` behind the bay: the rig from the bay back RIG_LEN, the bus from its stop back its length)
        const lane: Pt = [at[0] + r[0] * (s.half - LANE / 2), at[1] + r[1] * (s.half - LANE / 2)];
        const back = (st: Pt) => -((st[0] - lane[0]) * u[0] + (st[1] - lane[1]) * u[1]);
        if (BUS_STOPS.some((st) => st.street === s.id && st.dir[0] * u[0] + st.dir[1] * u[1] > 0.9 && back(st.at) > -(BUS_BACK + 2) && back(st.at) < RIG_LEN + 2)) continue;
        const kerb: Pt = [at[0] + r[0] * s.half, at[1] + r[1] * s.half];
        out.push({ id: `${s.id}:bay-${way === 1 ? 'a' : 'b'}${k}`, street: s.id, at: lane, dir: u, kerb, face: [-r[0], -r[1]] });
        break;
      }
    }
  }
  return out;
}

/** Every loading bay in the city */
export const BAYS: BusStop[] = PLAN.streets
  .filter((s) => s.kind === 'avenue')
  .flatMap((s) =>
    baysOn(
      s,
      PLAN.crossings.filter((c) => c.streets.includes(s.id)).map((c) => c.at)
    )
  );

/* ---------- The big rig ---------- */

/** From the kingpin back to the middle of the trailer's axles */
const PIN_TO_AXLES = TRAILER.pin - (TRAILER.axles[0] + TRAILER.axles[1]) / 2;

/**
 * Where the rig's parts are along its route, given `p`, the middle of the whole rig (as every vehicle's `p`):
 * the tractor's middle, the kingpin (on the tractor's fifth wheel) and the trailer's axles, each a distance along
 * the route; the trailer lies from its axles to its kingpin
 */
export function rigAlong(p: number) {
  const nose = p + RIG_LEN / 2;
  const tractor = nose - CARS.rig.L / 2;
  const pin = tractor + FIFTH_WHEEL;
  return { tractor, pin, axles: pin - PIN_TO_AXLES };
}

/** Where the trailer's middle is from its kingpin, back along it */
export const PIN_TO_MIDDLE = TRAILER.pin;

/* ---------- Patrol cars ---------- */

/** The light bar: every `period` seconds (its own time in it from its seed) it flashes for `on` seconds, `rate` flashes a second */
export const BAR_FLASH = { period: 42, on: 8, rate: 3 };

/** Which of a patrol car's lenses is lit at `t`: 0 none, 1 the blue (left), 2 the magenta (right) */
export function barLit(t: number, seed: number): 0 | 1 | 2 {
  const w = (((t + seed * BAR_FLASH.period) % BAR_FLASH.period) + BAR_FLASH.period) % BAR_FLASH.period;
  if (w > BAR_FLASH.on) return 0;
  return Math.floor(w * BAR_FLASH.rate * 2) % 2 === 0 ? 1 : 2;
}

/* ---------- Bikes and scooters ---------- */

/** The bikes in the traffic, in turn (the scooters most) */
export const BIKE_MIX: BikeId[] = ['scooter', 'streetbike', 'scooter', 'sportbike', 'streetbike', 'scooter'];
/** The paints they come in */
export const BIKE_PAINTS = ['#e23b3b', '#ffd23f', '#00c2ff', '#1fbf6b', '#f3f2f7', '#e219e5', '#14121f', '#ff8a3d'];
/** As far as a bike in the traffic leans (radians): its rider sits upright on it, so never further */
export const TRAFFIC_LEAN = 0.16;
/**
 * A bike's lean into a turn at `speed` (tiles/s) turning at `yawRate` (rad/s, the cars' way: a right turn's is
 * negative), within `TRAFFIC_LEAN`: positive tips its top to its right (bike-sim.ts's, into a right turn)
 */
export function trafficLean(speed: number, yawRate: number) {
  return Math.max(-TRAFFIC_LEAN, Math.min(TRAFFIC_LEAN, -Math.atan((speed * yawRate) / G)));
}
