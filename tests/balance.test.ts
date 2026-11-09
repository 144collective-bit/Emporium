// Balance (docs/polish-plan.md Phase 9, the owner's call): the daily soft cap on prize money (catalog.ts
// PRIZE_CAP, the save's `prizes`, v13), the business side's XP raised and the sold-out bonus (SOLD_OUT).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CUPS } from '../src/scripts/city3d/kart-cups';
import { CHALLENGE_PRIZE, FIGHT_BOTS, PRIZE_CAP, SERIES_PRIZES, SOLD_OUT, XP, xpForLevel } from '../src/scripts/city3d/catalog';
import {
  accept,
  advance,
  board,
  buy,
  cappedPrize,
  cleanSave,
  dailyChallenge,
  dayKey,
  deliver,
  emptyPrizes,
  finishKartRace,
  newSave,
  prizesLeft,
  prizesToday,
  retailPrice,
  seriesRace,
  ship,
  slotOf,
  startJob,
  startSeries,
  buildUnit,
  buyUnit,
} from '../src/scripts/city3d/tycoon';
import { finishFight } from '../src/scripts/city3d/fightsave';

const T0 = 1_700_000_000_000;
const DAY = 24 * 60 * 60000;
const MIN = 60000;
const rich = () => {
  const s = newSave(T0);
  s.dorras = 1e6;
  s.xp = xpForLevel(20);
  return s;
};
const race = (s: ReturnType<typeof newSave>, now: number, prizes?: boolean) => finishKartRace(s, { course: 'circuit', cup: 'rookie', cls: 'street', place: 1, seconds: 110, laps: [36, 37, 37], now, prizes });
const bout = (s: ReturnType<typeof newSave>, won: boolean, now: number, prizes?: boolean) => finishFight(s, { kind: 'bout', bot: 'medium', won, hits: 10, kos: 0, bestChain: 1, seconds: 80, now, prizes });

test('cappedPrize: in full under the cap, the share past it; prizesLeft counts down', () => {
  assert.equal(cappedPrize(1500, 0, 6), 1500);
  assert.equal(cappedPrize(1500, 5, 6), 1500);
  assert.equal(cappedPrize(1500, 6, 6), Math.floor(1500 * PRIZE_CAP.share));
  assert.equal(cappedPrize(0, 9, 6), 0);
  assert.ok(PRIZE_CAP.share > 0 && PRIZE_CAP.share < 1 && PRIZE_CAP.races >= 1 && PRIZE_CAP.bouts >= 1);
  const s = rich();
  assert.deepEqual(prizesLeft(s, T0), { races: PRIZE_CAP.races, bouts: PRIZE_CAP.bouts });
  assert.deepEqual(prizesToday(s, T0), { day: dayKey(T0), races: 0, bouts: 0 });
  s.prizes.races = 2;
  s.prizes.bouts = 99;
  assert.deepEqual(prizesLeft(s, T0), { races: PRIZE_CAP.races - 2, bouts: 0 });
  assert.deepEqual(prizesLeft(s, T0 + DAY), { races: PRIZE_CAP.races, bouts: PRIZE_CAP.bouts }, 'another day starts afresh');
});

test("the daily cap on race prizes: the day's first cup races pay in full, the rest the share; a new day starts over", () => {
  const s = rich();
  const full = CUPS.rookie.prizes[0];
  const part = Math.floor(full * PRIZE_CAP.share);
  let d = s.dorras;
  for (let i = 0; i < PRIZE_CAP.races; i++) {
    const r = race(s, T0 + i * MIN);
    assert.equal(r.prize, full, `race ${i + 1} pays in full`);
    assert.equal(r.capped, false);
  }
  assert.equal(s.dorras, d + full * PRIZE_CAP.races);
  assert.deepEqual(prizesLeft(s, T0), { races: 0, bouts: PRIZE_CAP.bouts });
  d = s.dorras;
  const r = race(s, T0 + 10 * MIN);
  assert.equal(r.prize, part);
  assert.equal(r.capped, true);
  assert.equal(r.xp, XP.kartFinish + XP.kartPodium + XP.kartWin, 'the XP is not capped');
  assert.equal(s.dorras, d + part);
  assert.equal(s.ledger.totals.karting, full * PRIZE_CAP.races + part);
  assert.equal(s.counters.kartWins, PRIZE_CAP.races + 1, 'a capped race still counts');
  // A time trial pays no prize and never counts
  const n = s.prizes.races;
  const t = finishKartRace(s, { course: 'circuit', cup: 'time', cls: 'street', place: 1, seconds: 100, laps: [40], now: T0 + 11 * MIN });
  assert.equal(t.prize, 0);
  assert.equal(t.capped, false);
  assert.equal(s.prizes.races, n);
  // The owner's prizes switch closed: nothing paid, nothing flagged, the race still one of the day's
  const shut = race(s, T0 + 12 * MIN, false);
  assert.equal(shut.prize, 0);
  assert.equal(shut.capped, false);
  assert.equal(s.prizes.races, n + 1);
  // Tomorrow pays in full again
  const next = race(s, T0 + DAY);
  assert.equal(next.prize, full);
  assert.equal(next.capped, false);
  assert.deepEqual(s.prizes, { day: dayKey(T0 + DAY), races: 1, bouts: 0 });
});

test('a series prize and the daily challenge are never capped', () => {
  const s = rich();
  for (let i = 0; i <= PRIZE_CAP.races; i++) race(s, T0 + i * MIN);
  assert.equal(prizesLeft(s, T0).races, 0);
  // The series: every race of it is a cup race (capped by place), the overall prize at the end is whole
  assert.ok(startSeries(s, 'rookie'));
  let r = null;
  for (let i = 0; i < 4; i++) r = seriesRace(s, [2, 3, 4, 5, 6, 7, 8, 1]);
  assert.ok(r && r.done && r.overall === 1);
  assert.equal(r!.prize, SERIES_PRIZES.rookie[0]);
  // The challenge: its prize whole, the time trial's own prize nothing
  const now = T0 + 20 * MIN;
  const ch = dailyChallenge(dayKey(now));
  const d = s.dorras;
  const c = finishKartRace(s, { course: ch.course, cup: 'time', cls: ch.cls, place: 1, seconds: 100, laps: [ch.target - 0.1, 50], now });
  assert.ok(c.challenge);
  assert.equal(c.prize, 0);
  assert.equal(s.dorras, d + CHALLENGE_PRIZE);
});

test("the daily cap on purses: the day's first bouts won pay in full, the rest the share; losses and spars don't count", () => {
  const s = rich();
  const full = FIGHT_BOTS.medium.prize;
  const part = Math.floor(full * PRIZE_CAP.share);
  // A spar and a loss first: not purses
  finishFight(s, { kind: 'spar', bot: 'easy', won: null, hits: 5, kos: 0, bestChain: 1, seconds: 30, now: T0 });
  bout(s, false, T0);
  assert.equal(s.prizes.bouts, 0);
  let d = s.dorras;
  for (let i = 0; i < PRIZE_CAP.bouts; i++) {
    const r = bout(s, true, T0 + i * MIN);
    assert.equal(r.prize, full, `purse ${i + 1} in full`);
    assert.equal(r.capped, false);
  }
  assert.equal(s.dorras, d + full * PRIZE_CAP.bouts);
  d = s.dorras;
  const r = bout(s, true, T0 + 10 * MIN);
  assert.equal(r.prize, part);
  assert.equal(r.capped, true);
  assert.equal(r.xp, XP.boutWin, 'the XP is not capped');
  assert.equal(s.dorras, d + part);
  assert.equal(s.fight.wins, PRIZE_CAP.bouts + 1);
  assert.equal(s.ledger.totals.fighting, full * PRIZE_CAP.bouts + part);
  // The switch closed: no purse, not flagged, still one of the day's
  const shut = bout(s, true, T0 + 11 * MIN, false);
  assert.equal(shut.prize, 0);
  assert.equal(shut.capped, false);
  assert.equal(s.prizes.bouts, PRIZE_CAP.bouts + 2);
  // Tomorrow pays in full; without a clock the save's own time is the day
  assert.equal(bout(s, true, T0 + DAY).prize, full);
  s.at = T0 + 2 * DAY;
  const own = finishFight(s, { kind: 'bout', bot: 'hard', won: true, hits: 10, kos: 0, bestChain: 1, seconds: 80 });
  assert.equal(own.prize, FIGHT_BOTS.hard.prize);
  assert.deepEqual(s.prizes, { day: dayKey(T0 + 2 * DAY), races: 0, bouts: 1 });
});

test("save v13: today's prize count is kept, another day's or an older save's starts at zero, junk is cleaned", () => {
  const s = rich();
  assert.equal(s.v, 14);
  assert.deepEqual(s.prizes, emptyPrizes());
  const today = cleanSave({ ...s, prizes: { day: dayKey(T0), races: 3.7, bouts: -1 } }, T0);
  assert.deepEqual(today.prizes, { day: dayKey(T0), races: 4, bouts: 0 });
  const other = cleanSave({ ...s, prizes: { day: dayKey(T0 - DAY), races: 5, bouts: 2 } }, T0);
  assert.deepEqual(other.prizes, emptyPrizes());
  const junk = cleanSave({ ...s, prizes: 'lots' }, T0);
  assert.deepEqual(junk.prizes, emptyPrizes());
  const old = cleanSave({ v: 12, dorras: 500 }, T0);
  assert.equal(old.v, 14);
  assert.deepEqual(old.prizes, emptyPrizes());
  assert.equal(old.dorras, 500, 'existing saves keep their Dorras');
  // The shelves' runs come through, never negative
  const shelf = cleanSave({ v: 12, stall: { level: 1, slots: [{ good: 'tees', qty: 7, price: 'fair', carry: 0, run: 12.9 }, { good: 'glow', qty: 1, price: 'low', run: -4 }] } }, T0);
  assert.equal(slotOf(shelf, 'tees')!.run, 12);
  assert.equal(slotOf(shelf, 'glow')!.run, 0);
});

test('the business side pays more XP: a sale, a contract, a courier sent, a job finished', () => {
  assert.equal(XP.sale, 3);
  assert.equal(XP.contract, 80);
  assert.equal(XP.ship, 20);
  assert.equal(XP.job, 20);
  const s = rich();
  // A contract
  const c = board(T0)[0];
  assert.ok(accept(s, c.id, T0).ok);
  s.cargo = { [c.good]: c.qty };
  let x = s.xp;
  assert.ok(deliver(s, c.id, c.to, T0).ok);
  assert.equal(s.xp - x, XP.contract);
  // A courier
  assert.ok(buyUnit(s, 0).ok && buildUnit(s, 0, 'warehouse').ok);
  assert.ok(buyUnit(s, 1).ok && buildUnit(s, 1, 'shop').ok);
  assert.ok(buy(s, 'tees', 30, T0, 'u0').ok);
  x = s.xp;
  assert.ok(ship(s, 'u0', 'u1', 'tees', 30, T0).ok);
  assert.equal(s.xp - x, XP.ship);
  assert.deepEqual(ship(s, 'u0', 'u1', 'tees', 30, T0), { ok: false, why: 'stock' });
  assert.equal(s.xp - x, XP.ship, 'a courier that never left pays nothing');
  // A job, once it's done (a save with nothing on its shelves, so no sales mix in)
  const w = rich();
  assert.ok(buy(w, 'sugar', 40, T0, 'workshop').ok);
  assert.ok(startJob(w, 'gummies', 20).ok);
  x = w.xp;
  advance(w, T0 + 2 * MIN);
  assert.equal(w.xp, x, 'half-way through: nothing yet');
  advance(w, T0 + 6 * MIN);
  assert.equal(w.workshop.job, null);
  assert.equal(w.xp - x, XP.job);
});

test('a shelf that sells out pays a bonus on its run and XP; a short run pays nothing', () => {
  const s = newSave(T0);
  s.dorras = 1e6;
  assert.ok(buy(s, 'glow', 20, T0).ok);
  const d = s.dorras;
  const x = s.xp;
  const now = T0 + 1000 * MIN;
  const sales = advance(s, now);
  assert.equal(slotOf(s, 'glow')!.qty, 0);
  const bonus = Math.floor(20 * retailPrice('glow', 'fair', now) * SOLD_OUT.share);
  assert.ok(bonus > 0);
  assert.equal(sales.bonus, bonus);
  assert.deepEqual(sales.soldOut, ['glow']);
  assert.equal(s.dorras, d + bonus, 'the bonus goes straight to your balance');
  assert.equal(s.till, sales.earned, 'the takings stay in the till');
  assert.equal(s.ledger.totals.soldOut, bonus);
  assert.equal(s.counters.earned, sales.earned + bonus);
  assert.equal(s.xp - x, 20 * XP.sale + XP.soldOut);
  assert.equal(slotOf(s, 'glow')!.run, 0, 'the run starts over');
  // Stocked one at a time it earns no more than its sales
  const short = newSave(T0);
  short.dorras = 1e6;
  assert.ok(buy(short, 'glow', SOLD_OUT.min - 1, T0).ok);
  const d2 = short.dorras;
  const x2 = short.xp;
  const few = advance(short, now);
  assert.equal(slotOf(short, 'glow')!.qty, 0);
  assert.equal(few.bonus, 0);
  assert.deepEqual(few.soldOut, []);
  assert.equal(short.dorras, d2);
  assert.equal(short.xp - x2, (SOLD_OUT.min - 1) * XP.sale);
  assert.equal(slotOf(short, 'glow')!.run, 0);
  // Topped up before it sells out, the run carries on
  const top = newSave(T0);
  top.dorras = 1e6;
  assert.ok(buy(top, 'glow', 6, T0).ok);
  advance(top, T0 + 1 * MIN);
  const sold = 6 - slotOf(top, 'glow')!.qty;
  assert.ok(sold > 0 && sold < 6);
  assert.equal(slotOf(top, 'glow')!.run, sold);
  assert.ok(buy(top, 'glow', 6, T0 + 1 * MIN).ok);
  const d3 = top.dorras;
  advance(top, now);
  assert.ok(top.dorras > d3, 'twelve in all: the bonus paid');
});
