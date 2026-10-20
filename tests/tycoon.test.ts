// The economy (tycoon.ts): Dorras, the market hall's moving prices, your stall.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ASK,
  BID,
  GOODS,
  OFFLINE_CAP,
  PRICE_LEVELS,
  START_DORRAS,
  STALL_LEVELS,
  advance,
  askPrice,
  bidPrice,
  buy,
  cleanSave,
  clearSlot,
  collect,
  marketPrice,
  newSave,
  retailPrice,
  room,
  sellBack,
  setPrice,
  slotOf,
  upgrade,
  type TycoonSave,
} from '../src/scripts/city3d/tycoon';

const T0 = Date.UTC(2026, 9, 20, 12, 0, 0);
const MIN = 60000;

test('everyone starts with the same Dorras and an empty level 1 stall', () => {
  const s = newSave(T0);
  assert.equal(s.dorras, START_DORRAS);
  assert.equal(s.till, 0);
  assert.equal(s.stall.level, 1);
  assert.equal(s.stall.slots.length, 0);
});

test('market prices swing round each good\'s base, the same for everyone, never free', () => {
  for (const g of GOODS) {
    const seen: number[] = [];
    for (let m = 0; m < 24 * 60; m += 7) seen.push(marketPrice(g.id, T0 + m * MIN));
    const lo = Math.min(...seen);
    const hi = Math.max(...seen);
    assert.ok(lo >= 1);
    assert.ok(lo < g.base && hi > g.base, `${g.id} never moves round its base`);
    assert.ok(hi <= Math.ceil(g.base * 1.27) && lo >= Math.floor(g.base * 0.73), `${g.id} swings too far`);
    // Deterministic: the same moment gives the same price
    assert.equal(marketPrice(g.id, T0 + 1234567), marketPrice(g.id, T0 + 1234567));
  }
});

test('the market sells above its price and buys back below it', () => {
  for (const g of GOODS) {
    assert.ok(askPrice(g.id, T0) >= marketPrice(g.id, T0));
    assert.ok(bidPrice(g.id, T0) <= marketPrice(g.id, T0));
  }
  assert.ok(ASK > 1 && BID < 1);
});

test('buying fills the stall up to its room and your Dorras', () => {
  const s = newSave(T0);
  const each = askPrice('gummies', T0);
  const r = buy(s, 'gummies', 5, T0);
  assert.deepEqual(r, { ok: true, qty: 5, dorras: 5 * each });
  assert.equal(s.dorras, START_DORRAS - 5 * each);
  assert.equal(slotOf(s, 'gummies')!.qty, 5);
  // No more than the stall holds
  buy(s, 'gummies', 999, T0);
  assert.equal(slotOf(s, 'gummies')!.qty, STALL_LEVELS[0].capacity);
  assert.deepEqual(buy(s, 'gummies', 1, T0), { ok: false, why: 'room' });
  // Three kinds of goods on a level 1 stall
  buy(s, 'glow', 1, T0);
  buy(s, 'coffee', 1, T0);
  assert.equal(room(s, 'tees'), 0);
  assert.deepEqual(buy(s, 'tees', 1, T0), { ok: false, why: 'room' });
});

test('you can\'t spend Dorras you don\'t have', () => {
  const s = newSave(T0);
  s.dorras = 10;
  assert.deepEqual(buy(s, 'neon', 1, T0), { ok: false, why: 'money' });
  assert.equal(s.dorras, 10);
});

test('selling back pays a little under the market, and frees an emptied slot', () => {
  const s = newSave(T0);
  buy(s, 'tees', 4, T0);
  const before = s.dorras;
  const r = sellBack(s, 'tees', 4, T0);
  assert.ok(r.ok);
  assert.equal(s.dorras, before + 4 * bidPrice('tees', T0));
  assert.equal(slotOf(s, 'tees'), undefined);
  assert.deepEqual(sellBack(s, 'tees', 1, T0), { ok: false, why: 'stock' });
});

test('customers buy from the stall over time; takings go in the till, then your balance', () => {
  const s = newSave(T0);
  buy(s, 'glow', 20, T0);
  const sales = advance(s, T0 + 1 * MIN);
  assert.ok((sales.sold.glow ?? 0) >= 1, 'nobody bought anything in a minute');
  assert.equal(s.till, sales.earned);
  assert.equal(sales.earned, (sales.sold.glow ?? 0) * retailPrice('glow', 'fair', T0 + MIN));
  const dorras = s.dorras;
  assert.equal(collect(s), sales.earned);
  assert.equal(s.dorras, dorras + sales.earned);
  assert.equal(s.till, 0);
});

test('a stall makes a profit at Fair prices', () => {
  // Bought at the market, sold at the stall's Fair mark-up
  for (const g of GOODS) assert.ok(retailPrice(g.id, 'fair', T0) > askPrice(g.id, T0), `${g.id} sells at a loss`);
});

test('Low sells faster, High earns more per sale', () => {
  const run = (level: 'low' | 'high') => {
    const s = newSave(T0);
    s.dorras = 1e6;
    buy(s, 'coffee', 20, T0);
    setPrice(s, 'coffee', level);
    return advance(s, T0 + 2 * MIN);
  };
  const low = run('low');
  const high = run('high');
  assert.ok((low.sold.coffee ?? 0) > (high.sold.coffee ?? 0));
  assert.ok(PRICE_LEVELS.high.markup > PRICE_LEVELS.low.markup);
});

test('standing at your stall sells faster', () => {
  const a = newSave(T0);
  const b = newSave(T0);
  for (const s of [a, b]) buy(s, 'glow', 20, T0);
  const alone = advance(a, T0 + 2 * MIN).sold.glow ?? 0;
  const serving = advance(b, T0 + 2 * MIN, true).sold.glow ?? 0;
  assert.ok(serving > alone);
});

test('while you\'re away it sells slower, for four hours at most', () => {
  const s = newSave(T0);
  s.dorras = 1e6;
  s.stall.level = 3;
  buy(s, 'neon', 80, T0);
  const sales = advance(s, T0 + 24 * 60 * MIN);
  assert.equal(sales.away, OFFLINE_CAP);
  // Four hours at a quarter pace, level 3: well under a full day's worth
  assert.ok((sales.sold.neon ?? 0) < 80);
  assert.ok((sales.sold.neon ?? 0) > 0);
});

test('stock never goes below zero, however long it runs', () => {
  const s = newSave(T0);
  buy(s, 'glow', 5, T0);
  advance(s, T0 + 1000 * MIN);
  assert.equal(slotOf(s, 'glow')!.qty, 0);
  assert.ok(clearSlot(s, 'glow'));
  assert.equal(slotOf(s, 'glow'), undefined);
});

test('upgrades cost Dorras and add room', () => {
  const s = newSave(T0);
  assert.deepEqual(upgrade(s), { ok: false, why: 'money' });
  s.dorras = 20000;
  assert.ok(upgrade(s).ok);
  assert.equal(s.stall.level, 2);
  assert.equal(s.dorras, 20000 - STALL_LEVELS[1].cost);
  assert.ok(upgrade(s).ok);
  assert.deepEqual(upgrade(s), { ok: false, why: 'max' });
});

test('cleanSave makes anything safe', () => {
  for (const junk of [null, 5, 'x', [], { dorras: 'lots' }]) {
    const s = cleanSave(junk, T0);
    assert.equal(s.stall.level, 1);
    assert.ok(Number.isFinite(s.dorras));
  }
  const s = cleanSave(
    {
      dorras: -50,
      till: 1e20,
      at: T0 + 1e9,
      stall: { level: 9, slots: [{ good: 'neon', qty: 9999, price: 'free' }, { good: 'neon', qty: 1 }, { good: 'gold', qty: 3 }] },
    },
    T0
  ) as TycoonSave;
  assert.equal(s.dorras, 0);
  assert.ok(s.till <= 1e12);
  assert.ok(s.at <= T0, 'a save can\'t be from the future');
  assert.equal(s.stall.level, STALL_LEVELS.length);
  assert.equal(s.stall.slots.length, 1, 'duplicates and unknown goods dropped');
  assert.equal(s.stall.slots[0].qty, STALL_LEVELS[STALL_LEVELS.length - 1].capacity);
  assert.equal(s.stall.slots[0].price, 'fair');
});
