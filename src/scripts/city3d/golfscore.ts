/*
 * Golf's score and rewards (docs/golf-game-plan.md Phase 3): DOM-free (on `DOM_FREE`), the golf game's chunk's, tested
 * in tests/golfscore.test.ts. On the city's save (tycoon.ts `TycoonSave.golf`, v15), reached through the game's
 * `GameDeps` (`save()`, then `commit()`).
 *
 * - **A hole finished** (`finishGolfHole()`): counted (`golfHoles`, and `birdies`, `eagles`, `aces`), its best kept,
 *   its XP (`GOLF_XP`: a hole, more for par, a birdie, an eagle, an ace).
 * - **A round finished** (`finishGolfRound()`): its Dorras by each hole's score against par (`HOLE_PRIZES`; game
 *   numbers, never real money), under the daily prize cap as the kart park's races are (the day's first
 *   `PRIZE_CAP.rounds` rounds in full, then `PRIZE_CAP.share`; the owner's live `prizes` switch closed pays none), the
 *   ledger's `golf`, its XP (a nine, the eighteen, under par), the counters (`golfRounds` for a nine or more,
 *   `underPar`), the best nine or eighteen kept.
 * - **The round on the go** (`keepRound()`, `dropRound()`): kept on the save to carry on later.
 */
import { addXp, book, count, prizesToday, cappedPrize, type SavedRound, type TycoonSave } from './tycoon';
import { PRIZE_CAP } from './catalog';
import { HOLES } from './golf';

/** XP for golf */
export const GOLF_XP = { hole: 20, par: 20, birdie: 60, eagle: 150, ace: 300, nine: 100, eighteen: 250, underPar: 200 } as const;
/** Dorras for each hole of a finished round, by its score against par (an ace pays its own) */
export const HOLE_PRIZES = { ace: 2000, eagle: 900, birdie: 400, par: 150, bogey: 60 } as const;
const prizeOf = (strokes: number, par: number) => (strokes === 1 ? HOLE_PRIZES.ace : strokes - par <= -2 ? HOLE_PRIZES.eagle : strokes - par === -1 ? HOLE_PRIZES.birdie : strokes === par ? HOLE_PRIZES.par : strokes - par === 1 ? HOLE_PRIZES.bogey : 0);

export interface HoleResult {
  strokes: number;
  par: number;
  xp: number;
  /** Its fewest strokes yet */
  best: boolean;
  levels: number;
}
/** A hole holed out (or picked up): counted, its best kept, its XP */
export function finishGolfHole(s: TycoonSave, hole: number, strokes: number): HoleResult {
  const par = HOLES[hole].par;
  const n = Math.max(1, Math.min(20, Math.round(strokes)));
  count(s, 'golfHoles', 1);
  if (n === 1) count(s, 'aces', 1);
  if (n - par <= -2) count(s, 'eagles', 1);
  else if (n - par === -1) count(s, 'birdies', 1);
  const prev = s.golf.holes[hole] ?? 0;
  const best = prev === 0 || n < prev;
  if (best) s.golf.holes[hole] = n;
  const xp = GOLF_XP.hole + (n <= par ? GOLF_XP.par : 0) + (n - par === -1 ? GOLF_XP.birdie : 0) + (n - par <= -2 && n > 1 ? GOLF_XP.eagle : 0) + (n === 1 ? GOLF_XP.ace : 0);
  return { strokes: n, par, xp, best, levels: addXp(s, xp) };
}

export interface RoundResult {
  strokes: number;
  par: number;
  toPar: number;
  prize: number;
  /** Past the day's prize cap: paid a share */
  capped: boolean;
  xp: number;
  /** Which kind of round it was (a nine, the eighteen, or holes picked: no best kept) and if it's the best of its kind */
  kind: 'front' | 'back' | 'full' | null;
  best: boolean;
  levels: number;
}
/** What kind of round a list of holes is */
export function roundKind(holes: readonly number[]): 'front' | 'back' | 'full' | null {
  const is = (from: number, n: number) => holes.length === n && holes.every((h, i) => h === from + i);
  return is(0, 18) ? 'full' : is(0, 9) ? 'front' : is(9, 9) ? 'back' : null;
}
/**
 * A round finished: its prize by each hole's score (under the daily cap), its XP, its counters, its best. `card` is
 * the round's strokes, in the order of `holes`. `prizes` false: the owner's live `prizes` switch is closed (no Dorras).
 */
export function finishGolfRound(s: TycoonSave, r: { holes: readonly number[]; card: readonly number[]; now: number; prizes?: boolean }): RoundResult {
  const card = r.holes.map((_, i) => Math.max(1, Math.min(20, Math.round(r.card[i] ?? 20))));
  const par = r.holes.reduce((a, h) => a + HOLES[h].par, 0);
  const strokes = card.reduce((a, b) => a + b, 0);
  const toPar = strokes - par;
  const full = r.holes.reduce((a, h, i) => a + prizeOf(card[i], HOLES[h].par), 0);
  const paying = r.prizes !== false;
  const today = prizesToday(s, r.now);
  const prize = paying ? cappedPrize(full, today.rounds, PRIZE_CAP.rounds) : 0;
  const capped = paying && full > 0 && today.rounds >= PRIZE_CAP.rounds;
  today.rounds += 1;
  if (prize > 0) {
    s.dorras += prize;
    book(s, 'golf', prize);
    count(s, 'earned', prize);
  }
  const long = r.holes.length >= 9;
  if (long) count(s, 'golfRounds', 1);
  if (long && toPar < 0) count(s, 'underPar', 1);
  const kind = roundKind(r.holes);
  let best = false;
  if (kind) {
    best = s.golf[kind] === 0 || strokes < s.golf[kind];
    if (best) s.golf[kind] = strokes;
  }
  const xp = (r.holes.length >= 18 ? GOLF_XP.eighteen : long ? GOLF_XP.nine : 0) + (long && toPar < 0 ? GOLF_XP.underPar : 0);
  return { strokes, par, toPar, prize, capped, xp, kind, best, levels: xp > 0 ? addXp(s, xp) : 0 };
}

/** The round on the go kept on the save (to carry on later), or dropped */
export function keepRound(s: TycoonSave, r: SavedRound) {
  s.golf.round = JSON.parse(JSON.stringify(r)) as SavedRound;
}
export function dropRound(s: TycoonSave) {
  s.golf.round = null;
}
/** A score against par as words: "Level par", "3 over", "2 under" */
export const parWords = (toPar: number) => (toPar === 0 ? 'Level par' : toPar > 0 ? `${toPar} over` : `${-toPar} under`);
