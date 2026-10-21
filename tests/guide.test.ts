// Getting started (guide.ts) and the save backup file (backup.ts): the steps run in order and
// pay once, older saves skip what's long behind them, every way in from the City view is a
// place to stand, and a backup round-trips while anything that isn't one is turned away.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GUIDE, advanceGuide, guideAt, guideDone, guideStep, hideGuide } from '../src/scripts/city3d/guide';
import { BACKUP_KEYS, BACKUP_MAX, TYCOON_KEY, backupName, packBackup, readBackup } from '../src/scripts/city3d/backup';
import { GUIDE_STEPS, addXp, cleanSave, level, newSave } from '../src/scripts/city3d/tycoon';
import { DOORS, SOLIDS } from '../src/scripts/city3d/solids';
import { pointIn, pointOnSlab } from './world';

const NOW = Date.UTC(2026, 9, 21, 12);
/** Degen's radius in walk mode (walk.ts RADIUS) */
const R = 0.22;

test('the guide has GUIDE_STEPS steps with their own ids, and ends on the backup', () => {
  assert.equal(GUIDE.length, GUIDE_STEPS);
  assert.equal(new Set(GUIDE.map((g) => g.id)).size, GUIDE.length);
  assert.equal(GUIDE[GUIDE.length - 1].id, 'backup');
  for (const g of GUIDE) {
    assert.ok(g.reward > 0 && g.reward <= 500, `${g.id}: a small reward`);
    assert.ok(g.xp > 0 && g.xp <= 100, `${g.id}: a little XP`);
    if ('open' in g.go) assert.ok(DOORS.some((d) => d.id === (g.go as { open: string }).open), `${g.id} opens a place`);
  }
});

test('a fresh save starts on the first step, and nothing is done yet', () => {
  const s = newSave(NOW);
  assert.equal(guideStep(s)?.id, 'stock');
  assert.deepEqual(advanceGuide(s), []);
  assert.equal(s.dorras, newSave(NOW).dorras);
});

test('steps finish in order, pay once, and the beam follows the step', () => {
  const s = newSave(NOW);
  const start = s.dorras;
  // Selling counts for the first two steps, but driving doesn't skip the queue
  s.counters.driven = 500;
  s.counters.sold = 5;
  const done = advanceGuide(s);
  assert.deepEqual(
    done.map((g) => g.id),
    ['stock', 'sell', 'drive']
  );
  assert.equal(s.dorras, start + done.reduce((a, g) => a + g.reward, 0));
  assert.equal(s.ledger.totals.missions, done.reduce((a, g) => a + g.reward, 0));
  assert.equal(guideStep(s)?.id, 'contract');
  assert.deepEqual(guideAt(s), { x: GUIDE[3].at.x, z: GUIDE[3].at.z });
  assert.deepEqual(advanceGuide(s), [], 'nothing pays twice');
  hideGuide(s, true);
  assert.equal(guideAt(s), null, 'hidden: no beam');
  s.counters.contracts = 1;
  assert.deepEqual(
    advanceGuide(s).map((g) => g.id),
    ['contract'],
    'hidden, it still counts'
  );
  hideGuide(s, false);
  s.counters.drones = 3;
  s.counters.races = 1;
  s.backup = NOW;
  advanceGuide(s);
  assert.ok(guideDone(s));
  assert.equal(guideStep(s), null);
  assert.equal(guideAt(s), null);
});

test('the guide carries through a save, and older saves past level 1 have it done', () => {
  const s = newSave(NOW);
  s.guide = { step: 3, hidden: true };
  s.backup = NOW - 1000;
  const back = cleanSave(JSON.parse(JSON.stringify(s)), NOW);
  assert.deepEqual(back.guide, { step: 3, hidden: true });
  assert.equal(back.backup, NOW - 1000);
  assert.equal(cleanSave({ ...s, guide: { step: 99 } }, NOW).guide.step, GUIDE_STEPS, 'clamped');
  assert.equal(cleanSave({ ...s, backup: NOW + 1e9 }, NOW).backup, NOW, 'no backup from the future');
  // A save from before the guide
  const old = JSON.parse(JSON.stringify(newSave(NOW)));
  delete old.guide;
  delete old.backup;
  assert.equal(cleanSave(old, NOW).guide.step, 0, 'a level 1 save gets the guide');
  const vet = newSave(NOW);
  addXp(vet, 5000);
  const vetRaw = JSON.parse(JSON.stringify(vet));
  delete vetRaw.guide;
  assert.ok(level(vet) > 1);
  assert.ok(guideDone(cleanSave(vetRaw, NOW)), 'a veteran skips it');
});

test('every way in on foot is a free spot on the ground, facing the right way', () => {
  for (const g of GUIDE) {
    assert.ok(Number.isFinite(g.at.x) && Number.isFinite(g.at.z), `${g.id} has a beam`);
    if (!('walk' in g.go)) continue;
    const w = g.go.walk;
    assert.ok(Number.isFinite(w.yaw), `${g.id} faces somewhere`);
    assert.ok(!SOLIDS.some((b) => pointIn(w.x, w.z, b, R)), `${g.id}: the walk starts inside something solid`);
    assert.ok(Math.hypot(w.x - g.at.x, w.z - g.at.z) < 6, `${g.id}: the walk starts by the beam`);
  }
  const stall = GUIDE.find((g) => g.id === 'sell')!;
  assert.ok(pointOnSlab(stall.at.x, stall.at.z), 'the stall spot is on the market square');
});

/* ---------- Backups ---------- */

/** A fake localStorage */
const store = (o: Record<string, string>) => (k: string) => (k in o ? o[k] : null);

test('a backup packs the city saves and leaves the login tokens out', () => {
  const s = newSave(NOW);
  s.dorras = 12345;
  const b = packBackup(
    store({
      [TYCOON_KEY]: JSON.stringify(s),
      'degen-city-car-v1': JSON.stringify({ model: 'gt', paint: 'cyan' }),
      'degen-city-walk-v1': '{broken',
      'degen-city-player-v1': 'secret-token',
      'degen-city-account-v1': '{"token":"x"}',
      'city-card': 'hidden',
    }),
    NOW
  );
  assert.equal(b.kind, 'sector7-save');
  assert.equal(b.at, NOW);
  assert.deepEqual(Object.keys(b.saves).sort(), [TYCOON_KEY, 'degen-city-car-v1'].sort());
  for (const k of Object.keys(b.saves)) assert.ok((BACKUP_KEYS as readonly string[]).includes(k));
  assert.ok(!JSON.stringify(b).includes('secret-token'));
  assert.equal(backupName(NOW), 'sector-7-save-2026-10-21.json');
});

test('a backup reads back as it was', () => {
  const s = newSave(NOW);
  s.dorras = 4321;
  addXp(s, 900);
  s.backup = NOW;
  const text = JSON.stringify(packBackup(store({ [TYCOON_KEY]: JSON.stringify(s), 'degen-city-ghosts-v2': '{"a":{"lap":30}}' }), NOW));
  const r = readBackup(text, NOW + 5000);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.dorras, 4321);
  assert.equal(r.level, level(s));
  assert.equal(r.at, NOW);
  const writes = Object.fromEntries(r.writes);
  assert.deepEqual(Object.keys(writes).sort(), [TYCOON_KEY, 'degen-city-ghosts-v2'].sort());
  const back = cleanSave(JSON.parse(writes[TYCOON_KEY]), NOW + 5000);
  assert.equal(back.dorras, 4321);
  assert.equal(back.xp, s.xp);
  assert.equal(back.backup, NOW);
  assert.deepEqual(JSON.parse(writes['degen-city-ghosts-v2']), { a: { lap: 30 } });
});

test('anything that is not a backup is turned away, and a bad save is cleaned', () => {
  const why = (t: string) => {
    const r = readBackup(t, NOW);
    return r.ok ? 'ok' : r.why;
  };
  assert.equal(why('not json'), 'json');
  assert.equal(why('[1,2]'), 'kind');
  assert.equal(why('{"kind":"something-else","v":1,"saves":{}}'), 'kind');
  assert.equal(why('{"kind":"sector7-save","v":99,"saves":{}}'), 'newer');
  assert.equal(why('{"kind":"sector7-save","v":1,"saves":{}}'), 'empty');
  assert.equal(why('{"kind":"sector7-save","v":1,"saves":{"degen-city-tycoon-v1":"text"}}'), 'empty');
  assert.equal(why(' '.repeat(BACKUP_MAX + 1)), 'size');
  // Numbers out of range are clamped, unknown saves dropped
  const r = readBackup(JSON.stringify({ kind: 'sector7-save', v: 1, at: NOW + 1e9, saves: { [TYCOON_KEY]: { dorras: -50, xp: 'lots' }, 'other-key': { x: 1 } } }), NOW);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.dorras, 0);
  assert.equal(r.level, 1);
  assert.equal(r.at, NOW, 'no backup from the future');
  assert.deepEqual(
    r.writes.map(([k]) => k),
    [TYCOON_KEY]
  );
});
