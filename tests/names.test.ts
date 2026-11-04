// Account names (net/names.ts, docs/account-plan.md Phase 4): typed, tidied, plain text only, and the
// same name whatever its case, spaces, dashes and underscores.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NAME_MAX, NAME_MIN, NAME_WHY, cleanName, nameKey } from '../src/scripts/net/names';
import { guestName } from '../src/scripts/net/profile-data';

test('a name is tidied: trimmed, spaces run together', () => {
  assert.deepEqual(cleanName('  Big   Duke '), { ok: true, name: 'Big Duke' });
  assert.deepEqual(cleanName('neo_42-x'), { ok: true, name: 'neo_42-x' });
});

test('too short, too long, odd characters and edges are turned away', () => {
  assert.deepEqual(cleanName('ab'), { ok: false, why: 'short' });
  assert.deepEqual(cleanName('x'.repeat(NAME_MAX + 1)), { ok: false, why: 'long' });
  assert.equal(cleanName('x'.repeat(NAME_MAX)).ok, true);
  assert.equal(cleanName('x'.repeat(NAME_MIN)).ok, true);
  for (const bad of ['Dégen', 'Dеgen' /* a Cyrillic е */, 'Big​Duke', 'a<b>c', 'name!', '😀😀😀']) assert.deepEqual(cleanName(bad), { ok: false, why: 'chars' }, bad);
  for (const bad of ['-abc', 'abc_', ' _abc']) assert.deepEqual(cleanName(bad), { ok: false, why: 'edge' }, bad);
  assert.deepEqual(cleanName(42), { ok: false, why: 'chars' });
  assert.deepEqual(cleanName(null), { ok: false, why: 'chars' });
});

test('two names are the same name whatever their case, spaces, - and _', () => {
  assert.equal(nameKey('Big Duke'), nameKey('big-duke'));
  assert.equal(nameKey('BIG_DUKE'), nameKey('bigduke'));
  assert.notEqual(nameKey('Big Duke'), nameKey('Big Duke 2'));
});

test("every word-list name is a name you could type, so a new account's starts as one", () => {
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 500; i++) {
    const n = guestName(r);
    const c = cleanName(n);
    assert.ok(c.ok && c.name === n, n);
  }
});

test('every reason has words', () => {
  for (const w of ['short', 'long', 'chars', 'edge', 'taken'] as const) assert.ok(NAME_WHY[w].length > 5);
});
