/*
 * The Sector 7 Metro (docs/growth-plan.md Phase 8; DOM-free, tested in
 * tests/metro.test.ts): one elevated line on a viaduct over the east ring
 * avenue's median, from the kart park in the north to the airport in the
 * south, over downtown's east side and the river. Four stations, each a
 * platform beside the track with a stair tower on the lawn east of the avenue
 * (its door at street level is where you board: "Metro"). One train shuttles
 * up and down the line on a timetable (`trainAt()`); a ride goes straight to
 * the station you pick (`rideAt()`), and the train carries on its timetable
 * from there. Built over the avenue's median and on lawns clear of the pads,
 * so nothing that exists moves.
 */
import { NS_ROADS } from './layout';
import type { Box } from './solids';

/** The line runs along x (the east ring avenue's centre line) */
export const LINE_X = NS_ROADS[NS_ROADS.length - 1].c;
/** Its ends (z) */
export const LINE: [number, number] = [-56, 136.4];
/** The viaduct: the top of its deck, its half width, how thick the deck is */
export const DECK_Y = 5.2;
export const DECK_HALF = 1.0;
export const DECK_T = 0.5;
/** The platforms: east of the track, from the deck's edge out over the avenue's east lanes */
export const PLATFORM = { x0: LINE_X + DECK_HALF, x1: LINE_X + DECK_HALF + 2, half: 5.2 };

export interface Station {
  id: string;
  name: string;
  /** The platform's middle (z) */
  z: number;
  /** The stair tower on the lawn east of the avenue (x0, z0, x1, z1), and its door at street level, facing west */
  tower: [number, number, number, number];
  door: { x: number; z: number };
}
/** A stair tower 2.4 by 2.5, its west face at x 69.6, centred on z */
const towerAt = (z: number): [number, number, number, number] => [69.6, z - 1.25, 72, z + 1.25];

export const STATIONS: Station[] = [
  { id: 'kart', name: 'Kart Park', z: -48, tower: towerAt(-48), door: { x: 69.2, z: -48 } },
  { id: 'downtown', name: 'Downtown', z: 33, tower: towerAt(37.5), door: { x: 69.2, z: 37.5 } },
  { id: 'southbank', name: 'South Bank', z: 109, tower: towerAt(109.5), door: { x: 69.2, z: 109.5 } },
  { id: 'airport', name: 'Airport', z: 130.5, tower: towerAt(130.5), door: { x: 69.2, z: 130.5 } },
];
export const STATION_IDS = STATIONS.map((s) => s.id);

/** Where pillars can stand (z): the avenue's median between its junctions, the river and the promenades either side of it */
const FREE: [number, number][] = [
  [LINE[0] + 1, -42.5],
  [-36.5, -9],
  [0, 14.5],
  [19.5, 40.5],
  [45.5, 60],
  [68.8, 70.2],
  [86.8, 88.1],
  [96.5, 119.5],
  [124.5, LINE[1] - 1],
];
/** Pillars down the median: at each end of every free stretch and evenly between, never more than 12 apart there */
export const PILLARS: number[] = FREE.flatMap(([a, b]) => {
  if (b - a < 2) return [(a + b) / 2];
  const n = Math.ceil((b - a) / 12);
  return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
});
/** Pillar half width (they stand in the median, 0.6 across) */
export const PILLAR_HALF = 0.25;

/** What's solid: the pillars and the stair towers (the deck is overhead) */
export const METRO_SOLIDS: Box[] = [
  ...PILLARS.map((z): Box => [LINE_X - PILLAR_HALF, z - PILLAR_HALF, LINE_X + PILLAR_HALF, z + PILLAR_HALF, DECK_Y]),
  ...STATIONS.map((s): Box => [...s.tower, DECK_Y + 2.2]),
];

/** The train: its length (two cars), top speed, how hard it pulls away and brakes, how long it waits at a station */
export const TRAIN = { len: 10, speed: 10, accel: 2.5, dwell: 8 };

/**
 * A run from z0 to z1 (either way): how far along it is t seconds in (0 to
 * its length), easing out of one station and into the next
 */
export function runAt(z0: number, z1: number, t: number) {
  const d = Math.abs(z1 - z0);
  const { speed: v, accel: a } = TRAIN;
  // Long enough to reach full speed, or a triangle profile
  const ta = Math.min(v / a, Math.sqrt(d / a));
  const vmax = a * ta;
  const cruise = Math.max(0, (d - a * ta * ta) / vmax);
  const total = 2 * ta + cruise;
  const s = (() => {
    if (t <= 0) return 0;
    if (t >= total) return d;
    if (t < ta) return 0.5 * a * t * t;
    if (t < ta + cruise) return 0.5 * a * ta * ta + vmax * (t - ta);
    const u = total - t;
    return d - 0.5 * a * u * u;
  })();
  return { z: z0 + Math.sign(z1 - z0) * s, total, speed: t > 0 && t < total ? (t < ta ? a * t : t < ta + cruise ? vmax : a * (total - t)) : 0 };
}

/** The timetable's legs: down the line stopping at every station, then back up */
const STOPS = [...STATIONS.map((s) => s.z), ...STATIONS.slice(1, -1).map((s) => s.z).reverse()];
const LEGS = STOPS.map((z, i) => ({ from: z, to: STOPS[(i + 1) % STOPS.length], run: runAt(z, STOPS[(i + 1) % STOPS.length], 0).total }));
/** One round trip, in seconds */
export const ROUND_TRIP = LEGS.reduce((a, l) => a + TRAIN.dwell + l.run, 0);

/**
 * Where the train is at time t (seconds, any clock): its z, which way it
 * faces (1 south, -1 north), its speed, and the station it's standing at
 */
export function trainAt(t: number): { z: number; dir: 1 | -1; speed: number; at: string | null } {
  let k = ((t % ROUND_TRIP) + ROUND_TRIP) % ROUND_TRIP;
  for (const l of LEGS) {
    const dir = l.to > l.from ? 1 : -1;
    if (k < TRAIN.dwell) return { z: l.from, dir, speed: 0, at: STATIONS.find((s) => s.z === l.from)!.id };
    k -= TRAIN.dwell;
    if (k < l.run) {
      const r = runAt(l.from, l.to, k);
      return { z: r.z, dir, speed: r.speed, at: null };
    }
    k -= l.run;
  }
  return { z: STATIONS[0].z, dir: 1, speed: 0, at: STATIONS[0].id };
}

/**
 * When the timetable stands the train at a station facing a way (the time
 * into the round trip it pulls in), so after a ride it carries on from there
 */
export function timetableAt(station: string, dir: 1 | -1) {
  let k = 0;
  for (const l of LEGS) {
    const d = l.to > l.from ? 1 : -1;
    // (a moment into its wait there)
    if (STATIONS.find((s) => s.z === l.from)?.id === station && d === dir) return k + 1e-3;
    k += TRAIN.dwell + l.run;
  }
  // An end of the line faces one way only
  k = 0;
  for (const l of LEGS) {
    if (STATIONS.find((s) => s.z === l.from)?.id === station) return k + 1e-3;
    k += TRAIN.dwell + l.run;
  }
  return 1e-3;
}

/** A ride straight from one station to another: the train's z t seconds in, and how long it takes */
export function rideAt(from: string, to: string, t: number) {
  const a = STATIONS.find((s) => s.id === from)!;
  const b = STATIONS.find((s) => s.id === to)!;
  return runAt(a.z, b.z, t);
}
