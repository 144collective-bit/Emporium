/*
 * The river bus's stops (river plan step 4b, the owner's pick), as data:
 * DOM-free, tested in tests/riverbus.test.ts; the boot reads them (the
 * places, the gangways' prompts, the railings opening at each). Each is a
 * landing on the water with a gangway down from the quay:
 *
 * - **Uptown** (`uptown`): off the esplanade, west of its east overlook;
 * - **Downtown** (`downtown`): off the town's north promenade;
 * - **South Row** (`southrow`): off the south promenade, where the jetty
 *   stood, west of Liberty Bridge, its landing out as far as the boardwalk;
 * - **Pier 7** (`pier7`): off the boardwalk east of Pier 7.
 *
 * Its loop, timetable and rides are riverroute.ts (only what's loaded when
 * it's used reads them).
 *
 * x east, z south; world tiles (1 = about 1.8 m).
 */
import { RIVER } from './layout';
import { BOARDWALK, DECK_Y } from './waterfront';

/** A boat's size: its length, beam and how high its top stands over the water */
export interface Hull {
  len: number;
  beam: number;
  top: number;
}
/** The river bus: its hull, cruising pace, pick-up (and slowing), how long it waits at a stop */
export const BUS = { hull: { len: 6, beam: 1.6, top: 1.3 } as Hull, v: 3.0, a: 0.5, dwell: 12 };

export type StopId = 'uptown' | 'downtown' | 'southrow' | 'pier7';
export interface Stop {
  id: StopId;
  name: string;
  /** What it's called on the map, its card and the toast: the stop's pier (Pier 7's a landing beside the pier itself) */
  pier: string;
  bank: 'north' | 'south';
  /** The landing's middle (x) and the line the boat lies along beside it (z) */
  x: number;
  berth: number;
  /** The landing on the water (x0, z0, x1, z1) and the edge of the quay or deck the gangway comes down from (z) */
  landing: [number, number, number, number];
  quay: number;
  /** How high the quay (or deck) is: the town's promenades' paving, or the decks' */
  y: number;
  /** Where its "River bus" prompt is (at the top of the gangway) and where you stand when you arrive, facing the river */
  door: { x: number; z: number };
  arrive: { x: number; z: number; yaw: number };
}
/** A landing: 7 long, its far edge 3 out from the quay (or deck) edge: a gangway down to a pontoon (`GANGWAY`, `PONTOON_W`) */
/** The town's promenades' paving (world.ts) */
export const PAVING_Y = 0.05;
export const LANDING = { half: 3.5, out: 3 };
/** The gangway: its half width, and how far out it reaches (onto the pontoon, which is the outer `PONTOON_W` of the landing) */
export const GANGWAY = { half: 0.55, out: 1.9 };
export const PONTOON_W = 1.4;
function stop(id: StopId, name: string, bank: 'north' | 'south', x: number, quay: number, y: number, out = LANDING.out): Stop {
  const s = bank === 'north' ? 1 : -1;
  const edge = quay + s * out;
  const berth = edge + s * (BUS.hull.beam / 2 + 0.1);
  const door = { x: x - 2.2, z: quay - s * 0.6 };
  return {
    id,
    name,
    pier: id === 'pier7' ? `${name} landing` : `${name} pier`,
    bank,
    x,
    berth,
    landing: [x - LANDING.half, Math.min(quay, edge), x + LANDING.half, Math.max(quay, edge)],
    quay,
    y,
    door,
    // (walk.ts's yaw 0 looks north: facing the river from the north bank is south)
    arrive: { x: door.x - 1.2, z: door.z - s * 0.3, yaw: s > 0 ? Math.PI : 0 },
  };
}
export const STOPS: Stop[] = [
  // (off the esplanade's edge, 3 out over the water: boulevard.ts `ESPLANADE`, which keeps its railing open and its benches clear here)
  stop('uptown', 'Uptown', 'north', -90, RIVER[0] + 3, DECK_Y),
  stop('downtown', 'Downtown', 'north', 8, RIVER[0], PAVING_Y),
  // (its landing reaches out to the line the boat runs along the boardwalk, Pier 7's)
  stop('southrow', 'South Row', 'south', -38, RIVER[1], PAVING_Y, RIVER[1] - BOARDWALK[1] + LANDING.out),
  // (its gangway between a lamp and a bollard on the boardwalk)
  stop('pier7', 'Pier 7', 'south', -74.3, BOARDWALK[1], DECK_Y),
];
/**
 * Is x on a bank's quay (or deck) in a gangway's mouth, or within `m` of it: the railings open there (neighbourhoods.ts,
 * boulevard.ts, waterfront3d.ts), and nothing stands in the way
 */
export const atGangway = (bank: 'north' | 'south', x: number, m = 0) => STOPS.some((s) => s.bank === bank && Math.abs(x - s.door.x) < GANGWAY.half + m);
