// Player cards (net/card.ts), pinned badges and play time (docs/account-plan.md Phase 5): what a save shows others,
// never Dorras or an address; a card off the wire made safe; pins only on earned badges; play time no faster than the clock.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanCard, gameCard, ownsOf, playTime } from '../src/scripts/net/card';
import { PIN_MAX, cleanSave, newSave, recordKey } from '../src/scripts/city3d/tycoon';
import { BADGES, togglePin } from '../src/scripts/city3d/missions';
import { GROW, checkSaves, freshBaseline, type Baseline } from '../src/scripts/net/savecheck';
import { TYCOON_KEY } from '../src/scripts/city3d/backup';
import { levelFor, titleFor } from '../src/scripts/city3d/catalog';

const NOW = Date.UTC(2026, 10, 5, 12);

const played = () => {
  const s = newSave(NOW);
  s.xp = 5000;
  s.badges = ['karts-1', 'seller-100', 'drones-10', 'level-5'];
  s.pinned = ['karts-1', 'drones-10'];
  s.played = 7300;
  s.counters.kartRaces = 12;
  s.counters.kartWins = 3;
  s.counters.podiums = 6;
  s.counters.partnersBeaten = 2;
  s.karts.trophies = { rookie: 1, pro: 2 };
  s.karts.records[recordKey('circuit', 'street')] = { lap: 36.2, run: 110, kart: 'rocket', at: NOW };
  s.karts.records[recordKey('circuit', 'sport')] = { lap: 31.4, run: 96, kart: 'rocket', at: NOW };
  s.karts.records[recordKey('circuit-reverse', 'sport')] = { lap: 33, run: 100, kart: 'rocket', at: NOW };
  s.fight.wins = 4;
  s.fight.losses = 2;
  s.fight.kos = 1;
  s.fight.bestChain = 5;
  s.dorras = 987_654;
  return s;
};

test("a save's card: level, pins, play time and records, fastest lap a course", () => {
  const g = gameCard(played());
  assert.equal(g.level, levelFor(5000));
  assert.equal(g.title, titleFor(levelFor(5000)));
  assert.deepEqual(g.pinned, ['karts-1', 'drones-10']);
  assert.equal(g.badges, 4);
  assert.equal(g.played, 7300);
  assert.deepEqual(g.karts, { races: 12, wins: 3, podiums: 6, trophies: 1, laps: [{ key: 'circuit-reverse:sport', lap: 33 }, { key: 'circuit:sport', lap: 31.4 }] });
  assert.deepEqual(g.fights, { wins: 4, losses: 2, kos: 1, partners: 2, chain: 5 });
});

test('a card never carries Dorras, worth or an address', () => {
  const text = JSON.stringify(gameCard(played()));
  assert.ok(!text.includes('987654') && !/dorras|worth|till|wallet|0x/i.test(text), text);
});

test('what you own is counted from the save', () => {
  const s = played();
  s.garage.owned = ['muscle', 'streetbike'];
  s.wardrobe = ['cowboy'];
  s.units[1] = { kind: 'shop', crop: 'sugar', stock: {}, slots: [], carry: 0 };
  assert.deepEqual(ownsOf(s), { vehicles: 2, karts: 0, guns: 0, clothes: 1, places: 1, styles: 0 });
});

test('a card off the wire is made safe; a guest carries no game', () => {
  const g = gameCard(played());
  const c = cleanCard({ name: 'Big Duke', rank: 'cadet', score: 1200, account: true, since: NOW, game: g });
  assert.deepEqual(c, { name: 'Big Duke', rank: 'cadet', score: 1200, account: true, since: NOW, game: g });
  assert.equal(cleanCard({ name: 'Guest', rank: 'rookie', score: 5, account: false, game: g })?.game, undefined);
  assert.equal(cleanCard({ name: '' }), null);
  assert.equal(cleanCard(null), null);
  const bad = cleanCard({ name: 'x'.repeat(200), rank: 7, score: -4, account: true, game: { level: 'nine', pinned: ['<b>', 'ok-id', 1], karts: { laps: [{ key: 'a:b', lap: -1 }, { key: '<x>', lap: 3 }] }, fights: { wins: Infinity } } });
  assert.equal(bad!.name.length, 40);
  assert.equal(bad!.score, 0);
  assert.equal(bad!.rank, 'rookie');
  assert.equal(bad!.game!.level, 1);
  assert.deepEqual(bad!.game!.pinned, ['ok-id']);
  assert.deepEqual(bad!.game!.karts.laps, []);
  assert.equal(bad!.game!.fights.wins, 0);
});

test('pins: only earned badges, at most three, and a second tap takes one off', () => {
  const s = newSave(NOW);
  s.badges = BADGES.slice(0, 5).map((b) => b.id);
  assert.equal(togglePin(s, 'kos-25'), false, 'not earned');
  for (let i = 0; i < PIN_MAX; i++) assert.ok(togglePin(s, s.badges[i]));
  assert.equal(togglePin(s, s.badges[4]), false, 'full');
  assert.ok(togglePin(s, s.badges[0]));
  assert.deepEqual(s.pinned, s.badges.slice(1, PIN_MAX));
});

test('the save cleans pins and play time', () => {
  const s = cleanSave({ ...played(), pinned: ['karts-1', 'kos-25', 'karts-1', 'seller-100', 'drones-10', 'level-5'], played: -3 }, NOW);
  assert.deepEqual(s.pinned, ['karts-1', 'seller-100', 'drones-10']);
  assert.equal(s.played, 0);
  const old = cleanSave({ ...played(), pinned: undefined, played: undefined }, NOW);
  assert.deepEqual([old.pinned, old.played], [[], 0]);
});

test('play time may grow no faster than the clock (with room for two windows)', () => {
  const base: Baseline = { ...freshBaseline(NOW), game: newSave(NOW) };
  const at = (seconds: number, minutes: number) => {
    const g = newSave(NOW);
    g.played = seconds;
    return checkSaves(base, { [TYCOON_KEY]: g }, NOW + minutes * 60_000);
  };
  assert.ok(at(60 * 30, 30).ok, 'half an hour in half an hour');
  assert.ok(at(GROW.played.burst + 60 * 30 * 2, 30).ok, 'two windows');
  const v = at(60 * 60 * 5, 30);
  assert.ok(!v.ok && v.why.includes('played'), 'five hours in half an hour');
});

test('play time reads simply', () => {
  assert.equal(playTime(20), 'under a minute');
  assert.equal(playTime(45 * 60), '45 min');
  assert.equal(playTime(3 * 3600), '3 h');
  assert.equal(playTime(3 * 3600 + 20 * 60 + 5), '3 h 20 min');
});
