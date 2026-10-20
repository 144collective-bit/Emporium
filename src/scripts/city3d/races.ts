/*
 * Street races against the clock. The courses are checkpoints along the
 * city's roads (layout.ts), run from the start line on the south bank
 * avenue between South 4 and South 5. Free of the DOM and of scene code
 * (racesite.ts draws the gantry and the checkpoint rings, race-ui.ts the
 * menu and the HUD), so the rules can be tested and a server could run them.
 *
 * - Pick a race at the start line with your car nearby, count down, go.
 * - Drive through each checkpoint in order (a ring you can see from afar);
 *   the last one is the finish. Any road, any line: only the order counts.
 * - The prize scales with how far under (or over) par you finish, best times
 *   are kept per race, and beating par or your record pays extra XP.
 */
import { CORE_ROADS, RING_HI, RING_LO, SOUTH_ROAD } from './layout';
import { XP } from './catalog';
import { addXp, book, count, type TycoonSave } from './tycoon';

export interface Race {
  id: string;
  name: string;
  blurb: string;
  /** Level needed to enter */
  level: number;
  /** Prize at par (Dorras) and par time (seconds) */
  prize: number;
  par: number;
  /** Checkpoints in order (x, z); the last is the finish */
  checkpoints: [number, number][];
}

/**
 * Where the start line is: a gantry over the south bank avenue in front of South 4, cantilevered
 * from one post on the district's sidewalk (the river side has no sidewalk to stand a post on),
 * with the race board beside the post. `spot` is where you stand to read the board.
 */
export const START_LINE = { x: 55, z: SOUTH_ROAD, heading: Math.PI };
export const RACE_SITE = {
  gantry: { x: START_LINE.x, post: SOUTH_ROAD + 4.0, reach: SOUTH_ROAD - 3.9, h: 3.2 },
  board: { x: START_LINE.x + 1.5, z: SOUTH_ROAD + 4.15 },
  spot: { x: START_LINE.x + 1.5, z: SOUTH_ROAD + 3.3 },
};
/** How close a car has to come to a checkpoint (tiles): any lane of an avenue counts */
export const CHECK_R = 4.2;
/** Your car has to be this near the start line to enter */
export const START_R = 9;
/** Seconds of countdown before the clock starts */
export const COUNTDOWN = 3;

const W = RING_LO;
const E = RING_HI;
const N = RING_LO;
const NB = RING_HI;
const S = SOUTH_ROAD;
const [X1, X2] = CORE_ROADS;
const FINISH: [number, number] = [START_LINE.x + 1, S];

/** West along the south bank, over the west bridge, east along the north bank, back over the east bridge */
const RIVER_LOOP: [number, number][] = [[X2, S], [X1, S], [W, S], [W, NB], [X1, NB], [X2, NB], [E, NB], [E, S], FINISH];
/** The whole ring round downtown */
const RING: [number, number][] = [[X2, S], [W, S], [W, NB], [W, X2], [W, N], [X1, N], [E, N], [E, X1], [E, NB], [E, S], FINISH];
/** Through downtown's cross streets, then round the north and west */
const DASH: [number, number][] = [[X2, S], [X2, NB], [X2, X2], [X1, X2], [X1, X1], [X2, X1], [X2, N], [W, N], [W, X1], [W, NB], [W, S], [X1, S], FINISH];

export const RACES: Race[] = [
  { id: 'river-loop', name: 'River Loop', blurb: 'Both banks and both bridges. A sprint to learn the roads.', level: 1, prize: 1500, par: 32, checkpoints: RIVER_LOOP },
  { id: 'ring-circuit', name: 'Ring Circuit', blurb: 'One lap of the avenues round downtown. Long straights, four big corners.', level: 3, prize: 3500, par: 50, checkpoints: RING },
  { id: 'downtown-dash', name: 'Downtown Dash', blurb: 'In through the cross streets and out round the ring. Corner after corner.', level: 5, prize: 6000, par: 62, checkpoints: DASH },
  { id: 'grand-tour', name: 'Grand Tour', blurb: 'Two laps of the ring. Pace yourself, then don\'t.', level: 8, prize: 12000, par: 98, checkpoints: [...RING.slice(0, -1), ...RING] },
];
export const RACE_IDS = RACES.map((r) => r.id);
export const race = (id: string) => RACES.find((r) => r.id === id) ?? null;

/** A race in progress */
export interface RaceRun {
  race: string;
  /** Seconds on the clock (counts down through the countdown, then up) */
  t: number;
  /** Seconds of countdown left (0: racing) */
  countdown: number;
  /** The next checkpoint to take */
  next: number;
  splits: number[];
  done: boolean;
}
export function startRun(id: string): RaceRun | null {
  if (!race(id)) return null;
  return { race: id, t: 0, countdown: COUNTDOWN, next: 0, splits: [], done: false };
}
export type RunEvent = 'count' | 'go' | 'checkpoint' | 'finish';
/** One frame: the countdown ticks, then the clock runs and checkpoints are taken in order */
export function stepRun(run: RaceRun, x: number, z: number, dt: number): RunEvent[] {
  const out: RunEvent[] = [];
  if (run.done) return out;
  if (run.countdown > 0) {
    const before = Math.ceil(run.countdown);
    run.countdown = Math.max(0, run.countdown - dt);
    const after = Math.ceil(run.countdown);
    if (run.countdown === 0) out.push('go');
    else if (after < before) out.push('count');
    return out;
  }
  run.t += dt;
  const r = race(run.race)!;
  const [cx, cz] = r.checkpoints[run.next];
  if (Math.hypot(cx - x, cz - z) <= CHECK_R) {
    run.splits.push(Math.round(run.t * 100) / 100);
    run.next += 1;
    if (run.next >= r.checkpoints.length) {
      run.done = true;
      out.push('finish');
    } else out.push('checkpoint');
  }
  return out;
}
/** The prize for a time: full at par, up to half as much again when well under it, less when over */
export const prizeFor = (r: Race, seconds: number) => Math.round(r.prize * Math.max(0.4, Math.min(1.5, r.par / Math.max(1, seconds))));

export interface RaceResult {
  seconds: number;
  prize: number;
  xp: number;
  underPar: boolean;
  record: boolean;
  /** Levels gained */
  levels: number;
}
/** A finished run: pay the prize, keep the best time, count it */
export function finishRun(s: TycoonSave, run: RaceRun): RaceResult | null {
  const r = race(run.race);
  if (!r || !run.done) return null;
  const seconds = Math.round(run.t * 100) / 100;
  const prize = prizeFor(r, seconds);
  const underPar = seconds <= r.par;
  const best = s.races[r.id];
  const record = best === undefined || seconds < best;
  if (record) s.races[r.id] = seconds;
  s.dorras += prize;
  book(s, 'races', prize);
  count(s, 'races', 1);
  count(s, 'earned', prize);
  if (underPar) count(s, 'pars', 1);
  if (record) count(s, 'records', 1);
  const xp = XP.raceFinish + (underPar ? XP.racePar : 0) + (record ? XP.raceRecord : 0);
  const levels = addXp(s, xp);
  return { seconds, prize, xp, underPar, record, levels };
}
/** m:ss.hh */
export function clockOf(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
}
