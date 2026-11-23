/*
 * Golf's score and rewards and its place on the save (docs/golf-game-plan.md Phase 3): golfscore.ts, tycoon.ts v15.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GOLF_XP, HOLE_PRIZES, dropRound, finishGolfHole, finishGolfRound, keepRound, parWords, roundKind } from '../src/scripts/city3d/golfscore';
import { cleanSave, newSave, prizesLeft, type SavedRound } from '../src/scripts/city3d/tycoon';
import { PRIZE_CAP } from '../src/scripts/city3d/catalog';
import { HOLES } from '../src/scripts/city3d/golf';
import { newRound } from '../src/scripts/city3d/golfgame-sim';

const NOW = Date.UTC(2026, 10, 23, 12);
const par = (h: number) => HOLES[h].par;

test('a hole finished: its counters, its best, its XP by its score', () => {
  const s = newSave(NOW);
  // A par on the 1st
  const p = finishGolfHole(s, 0, par(0));
  assert.equal(p.xp, GOLF_XP.hole + GOLF_XP.par);
  assert.ok(p.best);
  assert.equal(s.golf.holes[0], par(0));
  assert.equal(s.counters.golfHoles, 1);
  // A birdie there: better, counted
  const b = finishGolfHole(s, 0, par(0) - 1);
  assert.equal(b.xp, GOLF_XP.hole + GOLF_XP.par + GOLF_XP.birdie);
  assert.ok(b.best);
  assert.equal(s.counters.birdies, 1);
  // A bogey there: no best, only the hole's XP
  const g = finishGolfHole(s, 0, par(0) + 1);
  assert.equal(g.xp, GOLF_XP.hole);
  assert.ok(!g.best);
  assert.equal(s.golf.holes[0], par(0) - 1);
  // An eagle and an ace
  finishGolfHole(s, 2, par(2) - 2);
  assert.equal(s.counters.eagles, 1);
  const threes = HOLES.findIndex((h) => h.par === 3);
  const ace = finishGolfHole(s, threes, 1);
  assert.equal(s.counters.aces, 1);
  // (an ace on a par 3 is the ace's XP, not an eagle's as well)
  assert.equal(ace.xp, GOLF_XP.hole + GOLF_XP.par + GOLF_XP.ace);
  assert.equal(s.counters.golfHoles, 5);
});

test('a round finished: Dorras by the holes against par under the daily cap, its XP, its counters, its best', () => {
  const s = newSave(NOW);
  const front = [...Array(9).keys()];
  assert.equal(roundKind(front), 'front');
  assert.equal(roundKind([...Array(9).keys()].map((i) => i + 9)), 'back');
  assert.equal(roundKind([...Array(18).keys()]), 'full');
  assert.equal(roundKind([3]), null);
  // The front nine at level par: par's prize a hole, a nine's XP
  const d0 = s.dorras;
  const r = finishGolfRound(s, { holes: front, card: front.map(par), now: NOW });
  assert.equal(r.toPar, 0);
  assert.equal(r.prize, 9 * HOLE_PRIZES.par);
  assert.equal(s.dorras, d0 + r.prize);
  assert.equal(r.xp, GOLF_XP.nine);
  assert.equal(r.kind, 'front');
  assert.ok(r.best);
  assert.equal(s.golf.front, r.strokes);
  assert.equal(s.counters.golfRounds, 1);
  assert.equal(s.counters.underPar, 0);
  // (booked in the ledger as golf prizes)
  assert.ok(JSON.stringify(s.ledger).includes('"golf"'));
  // Under par: counted, more XP; a worse one isn't the best
  const u = finishGolfRound(s, { holes: front, card: front.map((h, i) => par(h) - (i === 0 ? 1 : 0)), now: NOW });
  assert.equal(u.toPar, -1);
  assert.equal(u.xp, GOLF_XP.nine + GOLF_XP.underPar);
  assert.equal(s.counters.underPar, 1);
  const w = finishGolfRound(s, { holes: front, card: front.map((h) => par(h) + 2), now: NOW });
  assert.ok(!w.best);
  assert.equal(w.prize, 0);
  // A hole on its own: paid, no round's XP or count, no best of a kind
  const one = finishGolfRound(s, { holes: [4], card: [par(4)], now: NOW });
  assert.equal(one.prize, HOLE_PRIZES.par);
  assert.equal(one.xp, 0);
  assert.equal(one.kind, null);
  assert.equal(s.counters.golfRounds, 3);
  // The day's cap: past PRIZE_CAP.rounds rounds a day, a share of the prize
  assert.equal(prizesLeft(s, NOW).rounds, 0);
  const late = finishGolfRound(s, { holes: front, card: front.map(par), now: NOW });
  assert.ok(late.capped);
  assert.equal(late.prize, Math.floor(9 * HOLE_PRIZES.par * PRIZE_CAP.share));
  // A new day starts over; the live prizes switch closed pays nothing
  const tomorrow = NOW + 86400000;
  assert.equal(prizesLeft(s, tomorrow).rounds, PRIZE_CAP.rounds);
  assert.equal(finishGolfRound(s, { holes: front, card: front.map(par), now: tomorrow, prizes: false }).prize, 0);
  assert.equal(parWords(0), 'Level par');
  assert.equal(parWords(3), '3 over');
  assert.equal(parWords(-2), '2 under');
});

test('the save: v15 carries golf; an older save starts with none; a round on the go is kept and cleaned', () => {
  const old = cleanSave({ v: 14, dorras: 500 }, NOW);
  assert.equal(old.v, 15);
  assert.equal(old.golf.round, null);
  assert.equal(old.golf.holes.length, 18);
  assert.ok(old.golf.holes.every((h) => h === 0));
  assert.equal(old.prizes.rounds, 0);
  assert.equal(old.counters.golfHoles, 0);
  // A round on the go survives a save and a load
  const s = newSave(NOW);
  const r = newRound([0, 1, 2], 7);
  r.card[0] = 4;
  r.at = 1;
  r.play = { hole: 1, strokes: 2, ball: { x: 345, y: 0.5, z: -560 }, from: { x: 346, y: 0.4, z: -530 }, holed: false };
  keepRound(s, r as unknown as SavedRound);
  const back = cleanSave(JSON.parse(JSON.stringify(s)), NOW);
  assert.deepEqual(back.golf.round, s.golf.round);
  dropRound(s);
  assert.equal(s.golf.round, null);
  // A broken one is dropped: a hole off the course, a card the wrong length, a ball off the map, the hole not the one on
  const bad = (round: unknown) => cleanSave({ ...JSON.parse(JSON.stringify(newSave(NOW))), golf: { round } }, NOW).golf.round;
  const good = JSON.parse(JSON.stringify(r));
  assert.ok(bad(good));
  assert.equal(bad({ ...good, holes: [0, 1, 40] }), null);
  assert.equal(bad({ ...good, card: [4] }), null);
  assert.equal(bad({ ...good, play: { ...good.play, ball: { x: 'x', y: 0, z: 0 } } }), null);
  assert.equal(bad({ ...good, play: { ...good.play, hole: 2 } }), null);
  assert.equal(bad('junk'), null);
  // The bests clamped
  const c = cleanSave({ v: 15, golf: { holes: [3, -4, 99], front: 36, back: 'x', full: 1e9 } }, NOW).golf;
  assert.deepEqual(c.holes.slice(0, 3), [3, 0, 20]);
  assert.equal(c.front, 36);
  assert.equal(c.back, 0);
  assert.equal(c.full, 400);
});
