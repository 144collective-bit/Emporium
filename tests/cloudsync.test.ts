// A profile's saves in the browser (saveslot.ts) and keeping a wallet's in step with the server
// (cloudsync.ts), docs/account-plan.md Phase 2: a guest's keys are what they always were, a
// wallet's sit beside them and never touch; what comes down and what goes up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACCOUNT_KEY, createSlot, loggedIn, slotKey, tokenOf, type KeyStore } from '../src/scripts/city3d/saveslot';
import { LOCAL_KEYS, cleanMeta, deviceOf, freshMeta, pullPlan, retryIn, settle, toCloud, uploadBody } from '../src/scripts/city3d/cloudsync';
import { BACKUP_KEYS, TYCOON_KEY } from '../src/scripts/city3d/backup';
import { SETTINGS_KEY, checkSaves, freshBaseline, isCloudKey, settingsKey, type CloudSave } from '../src/scripts/net/savecheck';
import { newSave } from '../src/scripts/city3d/tycoon';

const NOW = Date.UTC(2026, 10, 4, 12);
const A = '0x' + 'ab'.repeat(20);
const B = '0x' + 'cd'.repeat(20);
const TOKEN = 'e'.repeat(64);
const memory = () => {
  const m = new Map<string, string>();
  const store: KeyStore = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
  return { m, store };
};
const has = (o: Record<string, string>) => (k: string) => k in o;

test("a guest's saves keep the keys they always had", () => {
  for (const k of BACKUP_KEYS) assert.equal(slotKey(k, null), k);
  const { m, store } = memory();
  const guest = createSlot(store, null);
  guest.set(TYCOON_KEY, '{"dorras":1}');
  assert.deepEqual([...m.keys()], [TYCOON_KEY]);
  assert.equal(guest.get(TYCOON_KEY), '{"dorras":1}');
});

test("a wallet's saves sit beside the guest's and never touch them, or another wallet's", () => {
  const { m, store } = memory();
  const guest = createSlot(store, null);
  const a = createSlot(store, A);
  const b = createSlot(store, B);
  guest.set(TYCOON_KEY, 'guest');
  a.set(TYCOON_KEY, 'a');
  b.set(TYCOON_KEY, 'b');
  assert.equal(m.get(`${TYCOON_KEY}@${A}`), 'a');
  assert.deepEqual([guest.get(TYCOON_KEY), a.get(TYCOON_KEY), b.get(TYCOON_KEY)], ['guest', 'a', 'b']);
  a.remove(TYCOON_KEY);
  assert.equal(a.get(TYCOON_KEY), null);
  assert.equal(guest.get(TYCOON_KEY), 'guest');
});

test('the slot tells its listeners of every write but the quiet ones, and never throws', () => {
  const { store } = memory();
  const s = createSlot(store, A);
  const told: string[] = [];
  const off = s.subscribe((k) => told.push(k));
  s.set('x', '1');
  s.set('y', '1', true);
  s.remove('x');
  s.remove('y', true);
  assert.deepEqual(told, ['x', 'x']);
  off();
  s.set('z', '1');
  assert.deepEqual(told, ['x', 'x']);
  const broken: KeyStore = {
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {
      throw new Error('full');
    },
    removeItem: () => {
      throw new Error('denied');
    },
  };
  const bs = createSlot(broken, null);
  assert.equal(bs.get('x'), null);
  assert.equal(bs.set('x', '1'), false);
  assert.doesNotThrow(() => bs.remove('x'));
  assert.equal(createSlot(null, null).set('x', '1'), false);
});

test('whose save it is comes from the login kept in the browser', () => {
  const { store } = memory();
  assert.equal(loggedIn(store), null);
  store.setItem(ACCOUNT_KEY, JSON.stringify({ address: A, token: TOKEN }));
  assert.equal(loggedIn(store), A);
  assert.equal(tokenOf(store), TOKEN);
  for (const bad of ['{', 'null', JSON.stringify({ address: A }), JSON.stringify({ address: 'me', token: TOKEN }), JSON.stringify({ address: A.toUpperCase().replace('0X', '0x'), token: TOKEN })]) {
    store.setItem(ACCOUNT_KEY, bad);
    assert.equal(loggedIn(store), null, bad);
  }
  assert.equal(loggedIn(null), null);
});

test('every slot key has its name in the cloud, the settings by kind of device', () => {
  for (const k of LOCAL_KEYS) {
    assert.ok(isCloudKey(toCloud(k, 'phone')), k);
    assert.ok(isCloudKey(toCloud(k, 'desktop')), k);
  }
  assert.equal(toCloud(SETTINGS_KEY, 'phone'), settingsKey('phone'));
  assert.equal(toCloud(SETTINGS_KEY, 'desktop'), settingsKey('desktop'));
  assert.equal(toCloud(TYCOON_KEY, 'phone'), TYCOON_KEY);
  assert.equal(deviceOf(true), 'phone');
  assert.equal(deviceOf(false), 'desktop');
});

test('the note kept with the slot is cleaned', () => {
  assert.deepEqual(cleanMeta(null), freshMeta());
  assert.deepEqual(cleanMeta({ rev: 4, lease: 'f'.repeat(32), dirty: [TYCOON_KEY, TYCOON_KEY, 'nope'] }), { rev: 4, lease: 'f'.repeat(32), dirty: [TYCOON_KEY] });
  assert.deepEqual(cleanMeta({ rev: -1, lease: 'short', dirty: 'x' }), freshMeta());
});

test('in step: nothing comes down', () => {
  const server: CloudSave = { rev: 3, at: NOW, saves: { [TYCOON_KEY]: { dorras: 1 } } };
  assert.deepEqual(pullPlan({ rev: 3, lease: null, dirty: [TYCOON_KEY] }, server, 'phone', () => true), { kind: 'same' });
});

test('a revision this device made itself (its answer lost as the page closed) keeps this copy', () => {
  const server: CloudSave = { rev: 6, at: NOW, saves: { [TYCOON_KEY]: { dorras: 1 } }, held: true };
  assert.deepEqual(pullPlan({ rev: 5, lease: 'f'.repeat(32), dirty: [TYCOON_KEY] }, server, 'phone', () => true), { kind: 'ours', rev: 6 });
  assert.equal(pullPlan({ rev: 5, lease: 'f'.repeat(32), dirty: [] }, { ...server, held: false }, 'phone', () => true).kind, 'load', 'another device took it: the server wins');
});

test("a new account's first contact sends up everything kept here", () => {
  const local = { [TYCOON_KEY]: '{}', 'degen-city-car-v1': '{}' };
  const p = pullPlan(freshMeta(), { rev: 0, at: 0, saves: {} }, 'desktop', has(local));
  assert.equal(p.kind, 'first');
  assert.deepEqual(p.kind === 'first' && p.dirty.sort(), [TYCOON_KEY, 'degen-city-car-v1'].sort());
});

test("the server's copy wins when it moved on: another device's settings stay up there, this one's own stay here", () => {
  const server: CloudSave = { rev: 9, at: NOW, saves: { [TYCOON_KEY]: { dorras: 5 }, [settingsKey('desktop')]: { sens: 2 } } };
  const local = { [TYCOON_KEY]: '{"dorras":1}', 'degen-city-car-v1': '{"model":"van"}', [SETTINGS_KEY]: '{"sens":1}' };
  const p = pullPlan({ rev: 4, lease: null, dirty: [TYCOON_KEY] }, server, 'phone', has(local));
  assert.equal(p.kind, 'load');
  if (p.kind !== 'load') return;
  const w = Object.fromEntries(p.writes);
  assert.equal(w[TYCOON_KEY], '{"dorras":5}');
  assert.equal(w['degen-city-car-v1'], null, 'the car the server has none of is cleared');
  assert.ok(!(SETTINGS_KEY in w), "a phone never takes the desktop's settings");
  assert.deepEqual(p.meta.dirty, [SETTINGS_KEY], "and this phone's go up");
  assert.equal(p.meta.rev, 9);
  assert.equal(p.lost, true, 'what changed here and never went up is lost, and said so');
  assert.equal(p.wiped, false);
  const phone = pullPlan(freshMeta(), { ...server, saves: { ...server.saves, [settingsKey('phone')]: { sens: 1.5 } } }, 'phone', has(local));
  assert.ok(phone.kind === 'load' && Object.fromEntries(phone.writes)[SETTINGS_KEY] === '{"sens":1.5}');
  assert.ok(phone.kind === 'load' && !phone.lost, 'a new device with nothing waiting loses nothing');
});

test('an account deleted and started again: the old copy here goes', () => {
  const p = pullPlan({ rev: 7, lease: null, dirty: [] }, { rev: 0, at: 0, saves: {} }, 'desktop', () => true);
  assert.ok(p.kind === 'load' && p.wiped && p.writes.every(([k, v]) => v === null && k !== SETTINGS_KEY));
});

test('what goes up: parsed values, cleared keys as null, never the city game cleared or a value that won’t parse', () => {
  const local: Record<string, string> = { [TYCOON_KEY]: '{"dorras":3}', [SETTINGS_KEY]: '{"sens":1}', 'degen-city-look-v1': '{bad' };
  const read = (k: string) => local[k] ?? null;
  const up = uploadBody([TYCOON_KEY, SETTINGS_KEY, 'degen-city-look-v1', 'degen-city-car-v1'], read, 'phone');
  assert.deepEqual(up.saves, { [TYCOON_KEY]: { dorras: 3 }, [settingsKey('phone')]: { sens: 1 }, 'degen-city-car-v1': null });
  assert.deepEqual(up.drop, ['degen-city-look-v1']);
  const gone = uploadBody([TYCOON_KEY], () => null, 'phone');
  assert.deepEqual(gone.drop, [TYCOON_KEY]);
  assert.deepEqual(gone.sent, []);
});

test("a fresh wallet's first upload is what the server's checks take", () => {
  const local: Record<string, string> = { [TYCOON_KEY]: JSON.stringify(newSave(NOW)), [SETTINGS_KEY]: '{"sens":1.2,"invert":false}', 'degen-city-car-v1': '{"model":"hatch","paint":"cyan"}' };
  const p = pullPlan(freshMeta(), { rev: 0, at: 0, saves: {} }, 'desktop', has(local));
  assert.equal(p.kind, 'first');
  const up = uploadBody(p.kind === 'first' ? p.dirty : [], (k) => local[k] ?? null, 'desktop');
  const v = checkSaves(freshBaseline(NOW), up.saves, NOW + 60_000);
  assert.ok(v.ok, JSON.stringify(v));
});

test('after an upload, only what changed again on the way or wasn’t sent is still waiting', () => {
  assert.deepEqual(settle(['a', 'b', 'c', 'd'], ['a', 'b'], ['d'], new Set(['b'])), ['b', 'c']);
  assert.deepEqual(settle(['a'], ['a'], [], new Set()), []);
});

test('tries again sooner, then less often', () => {
  assert.equal(retryIn(0), 5_000);
  assert.equal(retryIn(1), 10_000);
  assert.equal(retryIn(10), 60_000);
});
