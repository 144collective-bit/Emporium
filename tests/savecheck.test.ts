// Cloud saves' checks (net/savecheck.ts, docs/account-plan.md Phase 1): the keys are the backup's
// with the settings per kind of device; every value is cleaned on the way in; what grows faster
// than the game allows is turned away, while the most one sitting can legitimately bring in, and
// a fully built business left running, both pass; values split into pieces and join back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHUNK,
  CLOUD_KEYS,
  GHOSTS_KEY,
  GROW,
  KEY_MAX,
  SAVE_MAX,
  SCORE_KEY,
  SNAPSHOT_KEYS,
  SETTINGS_KEY,
  allowance,
  baselineOf,
  checkSaves,
  freshBaseline,
  isCloudKey,
  isSnapDay,
  join,
  settingsKey,
  snapDay,
  split,
  summaryOf,
  type Baseline,
} from '../src/scripts/net/savecheck';
import { BACKUP_KEYS, TYCOON_KEY } from '../src/scripts/city3d/backup';
import { COUNTER_IDS, gearValue, PLACE_IDS, PRICE_LEVEL_IDS, GOOD_IDS, addXp, advance, cleanSave, newSave, worth, type TycoonSave } from '../src/scripts/city3d/tycoon';
import { BADGES, MISSIONS, MISSIONS_MAX } from '../src/scripts/city3d/missions';
import { CAR_CATALOG, CHALLENGE_PRIZE, GUN_CATALOG, KART_CATALOG, WARDROBE_CATALOG, FIGHT_BOTS, SERIES_PRIZES, XP } from '../src/scripts/city3d/catalog';
import { CUPS } from '../src/scripts/city3d/kart-cups';

const NOW = Date.UTC(2026, 10, 4, 12);
const MIN = 60_000;
const game = (s: TycoonSave) => ({ [TYCOON_KEY]: JSON.parse(JSON.stringify(s)) });
const baseOf = (s: TycoonSave, at = NOW): Baseline => ({ game: cleanSave(s, at), gameAt: at, score: 0, scoreAt: at });
const sumTop = (ns: number[], n: number) => [...ns].sort((a, b) => b - a).slice(0, n).reduce((a, b) => a + b, 0);

test("the cloud's keys are the backup's, the settings kept apart for phones and desktops", () => {
  assert.equal(new Set(CLOUD_KEYS).size, CLOUD_KEYS.length);
  for (const k of BACKUP_KEYS) if (k !== SETTINGS_KEY) assert.ok(isCloudKey(k), k);
  assert.ok(!isCloudKey(SETTINGS_KEY), 'the plain settings key is the browser’s only');
  assert.ok(isCloudKey(settingsKey('phone')) && isCloudKey(settingsKey('desktop')));
  assert.ok(!isCloudKey('degen-city-account-v1') && !isCloudKey('degen-city-player-v1'), 'never the login tokens');
  for (const k of CLOUD_KEYS) assert.ok(KEY_MAX[k] > 0, k);
  assert.ok(SNAPSHOT_KEYS.includes(TYCOON_KEY as never) && SNAPSHOT_KEYS.includes(SCORE_KEY as never));
  assert.ok(!SNAPSHOT_KEYS.includes(GHOSTS_KEY as never), 'no ghosts in a snapshot');
  assert.ok(!SNAPSHOT_KEYS.some((k) => k.startsWith(SETTINGS_KEY)), 'a restore never touches the settings');
});

test("a new account's fresh game is taken, cleaned", () => {
  const s = newSave(NOW);
  const v = checkSaves(freshBaseline(NOW), { ...game(s), [TYCOON_KEY]: { ...game(s)[TYCOON_KEY], junk: 1 } }, NOW + MIN);
  assert.ok(v.ok);
  const stored = JSON.parse(v.writes[TYCOON_KEY]!);
  assert.equal(stored.junk, undefined);
  assert.equal(stored.dorras, s.dorras);
});

test('an edited save is turned away: Dorras, XP, a counter, things owned, a badge not earned', () => {
  const base = freshBaseline(NOW);
  const rich = newSave(NOW);
  rich.dorras = 10_000_000;
  assert.deepEqual(checkSaves(base, game(rich), NOW + MIN), { ok: false, why: ['worth'] });
  const xp = newSave(NOW);
  addXp(xp, 1_000_000);
  const v = checkSaves(base, game(xp), NOW + MIN);
  assert.ok(!v.ok && v.why.includes('xp'));
  const sold = newSave(NOW);
  sold.counters.sold = 1_000_000;
  const v2 = checkSaves(base, game(sold), NOW + MIN);
  assert.ok(!v2.ok && v2.why.includes('counter:sold'));
  // Everything the garage, the Armoury, Drop 001 and the kart hut sell, owned without paying: the
  // free-play preview's saves look like this
  const owns = newSave(NOW);
  owns.garage.owned = Object.keys(CAR_CATALOG) as TycoonSave['garage']['owned'];
  owns.armoury.owned = Object.keys(GUN_CATALOG) as TycoonSave['armoury']['owned'];
  owns.wardrobe = WARDROBE_CATALOG.map((w) => w.id);
  owns.karts.owned = Object.keys(KART_CATALOG) as TycoonSave['karts']['owned'];
  assert.ok(gearValue(cleanSave(owns, NOW)) > GROW.worth.burst, 'it all costs more than a burst');
  const v3 = checkSaves(base, game(owns), NOW + MIN);
  assert.ok(!v3.ok && v3.why.includes('worth'));
  const badge = newSave(NOW);
  badge.badges = ['kart-wins-25'];
  assert.deepEqual(checkSaves(base, game(badge), NOW + MIN), { ok: false, why: ['badge'] });
});

test('a badge earned in the save is taken, and growth is measured from the last game accepted', () => {
  const s = newSave(NOW);
  s.counters.kartRaces = 1;
  s.badges = ['karts-1'];
  assert.ok(checkSaves(freshBaseline(NOW), game(s), NOW + MIN).ok);
  // A day of play allows more than a minute does
  const a = newSave(NOW);
  a.dorras += GROW.worth.burst + GROW.worth.perMin * 30;
  assert.ok(!checkSaves(freshBaseline(NOW), game(a), NOW + MIN).ok);
  assert.ok(checkSaves(freshBaseline(NOW), game(a), NOW + 60 * MIN).ok);
});

test("the market's swings don't count: both sides are valued at the same moment", () => {
  const s = newSave(NOW);
  s.workshop.stock = { neon: 50 };
  const later = NOW + 7 * 60 * MIN;
  const v = checkSaves(baseOf(s), game(s), later);
  assert.ok(v.ok, 'the same goods, hours later, at other prices');
  assert.equal(worth(cleanSave(s, later), later) - worth(cleanSave(s, NOW), later), 0);
});

test('the most one sitting can bring in fits in the bursts', () => {
  // The three richest missions claimed together, a Neon series' last race and its trophy, the
  // daily challenge and the hardest bout's purse
  const cash =
    sumTop(MISSIONS.map((m) => m.reward), MISSIONS_MAX) +
    Math.max(...Object.values(CUPS).map((c) => c.prizes[0])) +
    Math.max(...Object.values(SERIES_PRIZES).map((p) => p[0])) +
    CHALLENGE_PRIZE +
    Math.max(...Object.values(FIGHT_BOTS).map((b) => b.prize));
  assert.ok(GROW.worth.burst >= cash * 1.3, `worth burst ${GROW.worth.burst} covers ${cash} with room`);
  const xp =
    sumTop(MISSIONS.map((m) => m.xp), MISSIONS_MAX) +
    sumTop(BADGES.map((b) => b.xp), 3) +
    XP.kartFinish + XP.kartPodium + XP.kartWin + XP.kartRecord + XP.parBeaten + XP.challenge + XP.seriesWin + XP.seriesPodium + XP.boutWin + XP.fightKo + XP.chain;
  assert.ok(GROW.xp.burst >= xp * 1.3, `xp burst ${GROW.xp.burst} covers ${xp} with room`);
});

test('a fully built business left running stays well inside the rates', () => {
  let rate = 0;
  let xpRate = 0;
  let soldRate = 0;
  for (const g of GOOD_IDS)
    for (const p of PRICE_LEVEL_IDS) {
      const slots = (n: number) => Array.from({ length: n }, () => ({ good: g, qty: 9999, price: p, carry: 0 }));
      const raw = {
        ...newSave(NOW),
        levels: Object.fromEntries(PLACE_IDS.filter((x) => x !== 'stall').map((x) => [x, 3])),
        stall: { level: 3, slots: slots(6) },
        units: [0, 1, 2, 3].map(() => ({ kind: 'shop', crop: null, stock: {}, slots: slots(4), carry: 0 })),
        lots: [0, 1, 2].map(() => ({ kind: 'superstore', stock: {}, slots: slots(6), job: null })),
        corners: [0, 1, 2, 3].map(() => ({ slots: slots(4) })),
        staff: [...PLACE_IDS],
      };
      const start = cleanSave(raw, NOW);
      for (const serving of [false, true, 'stall', 'l0'] as const) {
        const s = structuredClone(start);
        let now = NOW;
        for (let i = 0; i < 10; i++) advance(s, (now += MIN), serving);
        rate = Math.max(rate, (worth(s, NOW) - worth(start, NOW)) / 10);
        xpRate = Math.max(xpRate, (s.xp - start.xp) / 10);
        soldRate = Math.max(soldRate, (s.counters.sold - start.counters.sold) / 10);
        assert.ok(checkSaves(baseOf(start), game(s), now).ok, `${g} at ${p}, serving ${serving}`);
      }
    }
  assert.ok(rate > 0 && rate * 4 < GROW.worth.perMin, `worth ${rate.toFixed(0)}/min`);
  assert.ok(xpRate * 4 < GROW.xp.perMin, `xp ${xpRate.toFixed(0)}/min`);
  assert.ok(soldRate * 4 < GROW.counters.sold!.perMin, `sold ${soldRate.toFixed(0)}/min`);
});

test('every counter has a limit', () => {
  for (const c of COUNTER_IDS) assert.ok(allowance(GROW.counters[c] ?? GROW.counter, 0) > 0, c);
});

test('what isn’t a save is turned away', () => {
  const base = freshBaseline(NOW);
  assert.deepEqual(checkSaves(base, null, NOW), { ok: false, why: ['empty'] });
  assert.deepEqual(checkSaves(base, {}, NOW), { ok: false, why: ['empty'] });
  assert.deepEqual(checkSaves(base, { 'degen-city-player-v1': {} }, NOW), { ok: false, why: ['key'] });
  assert.deepEqual(checkSaves(base, { [TYCOON_KEY]: null }, NOW), { ok: false, why: ['game'] });
  assert.deepEqual(checkSaves(base, { 'degen-city-car-v1': 'red' }, NOW), { ok: false, why: ['shape'] });
  assert.deepEqual(checkSaves(base, { 'degen-city-car-v1': { pad: 'x'.repeat(KEY_MAX['degen-city-car-v1']) } }, NOW), { ok: false, why: ['size'] });
  // The whole save too big (the server passes what it already keeps)
  assert.deepEqual(checkSaves(base, { 'degen-city-car-v1': {} }, NOW, SAVE_MAX), { ok: false, why: ['size'] });
  // One bad key turns the whole upload away
  assert.ok(!checkSaves(base, { ...game(newSave(NOW)), nope: {} }, NOW).ok);
});

test('the other saves are cleaned, the ghosts kept as they are, any but the game cleared', () => {
  const base = freshBaseline(NOW);
  const v = checkSaves(
    base,
    {
      'degen-city-car-v1': { model: 'tank', paint: 'red' },
      'degen-city-look-v1': { hat: 'crown-of-gold' },
      [settingsKey('phone')]: { sens: 99, invert: 1, autoAds: 'nope' },
      [GHOSTS_KEY]: { 'circuit:sport': { t: 31.2, s: [1, 2, 3] } },
      [SCORE_KEY]: { total: 3000, skin: 'neon', weapon: 'dmr' },
    },
    NOW,
  );
  assert.ok(v.ok);
  assert.equal(JSON.parse(v.writes['degen-city-car-v1']!).model, 'hatch');
  const set = JSON.parse(v.writes[settingsKey('phone')]!);
  assert.equal(set.sens, 2.5);
  assert.equal(set.invert, true);
  assert.equal(set.autoAds, 'off');
  assert.deepEqual(JSON.parse(v.writes[GHOSTS_KEY]!), { 'circuit:sport': { t: 31.2, s: [1, 2, 3] } });
  const score = JSON.parse(v.writes[SCORE_KEY]!);
  assert.deepEqual(score, { total: 3000, skin: 'olive', weapon: 'rifle' }, 'neon and the Long Shot need more score');
  assert.deepEqual(checkSaves(base, { [SCORE_KEY]: { total: 1e9 } }, NOW), { ok: false, why: ['score'] });
  const cleared = checkSaves(base, { [GHOSTS_KEY]: null }, NOW);
  assert.ok(cleared.ok && cleared.writes[GHOSTS_KEY] === null);
});

test('the baseline comes from what the server keeps, a fresh game where there is none', () => {
  const s = newSave(NOW);
  s.xp = 500;
  const b = baselineOf({ [TYCOON_KEY]: JSON.stringify(s), [SCORE_KEY]: JSON.stringify({ total: 700 }) }, NOW, NOW - MIN);
  assert.equal(b.game.xp, 500);
  assert.equal(b.score, 700);
  assert.equal(b.scoreAt, NOW - MIN);
  const broken = baselineOf({ [TYCOON_KEY]: '{not json' }, NOW, NOW);
  assert.equal(broken.game.xp, 0);
  assert.equal(broken.score, 0);
});

test('values split into pieces and join back', () => {
  for (const s of ['', 'a', 'x'.repeat(CHUNK), 'y'.repeat(CHUNK + 1), 'Ünïcødé ✓ '.repeat(20_000)]) {
    const parts = split(s);
    assert.ok(parts.length >= 1 && parts.every((p) => p.length <= CHUNK));
    assert.equal(join(parts), s);
  }
  assert.equal(split('x'.repeat(CHUNK * 3)).length, 3);
  assert.ok(Math.ceil(SAVE_MAX / CHUNK) < 128, 'a whole save is under one storage write of 128 entries');
});

test("snapshots are kept by the day, and summed up for the history", () => {
  assert.equal(snapDay(NOW), '2026-11-04');
  assert.ok(isSnapDay('2026-11-04') && !isSnapDay('2026-11-4') && !isSnapDay('../x'));
  const s = newSave(NOW);
  addXp(s, 5000);
  const sum = summaryOf(snapDay(NOW), NOW, s);
  assert.equal(sum.xp, 5000);
  assert.ok(sum.level > 1);
  assert.equal(sum.dorras, s.dorras);
});
