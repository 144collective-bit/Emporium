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
  CARGO,
  CROPS,
  DELIVERY_BONUS,
  GARDEN_CAP,
  JOB_MAX,
  RECIPES,
  RECIPE_IDS,
  SHOP,
  UNIT_COUNT,
  UNIT_KINDS,
  UNIT_PRICES,
  WAREHOUSE_CAP,
  advance,
  buildUnit,
  buyUnit,
  cancelJob,
  canMake,
  cargoCap,
  holds,
  load,
  setCrop,
  startJob,
  total,
  unitPrice,
  unload,
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
  // Bought at the market, sold at the stall's Fair mark-up (raw goods aren't sold to the public)
  for (const g of GOODS.filter((x) => !x.raw)) assert.ok(retailPrice(g.id, 'fair', T0) > askPrice(g.id, T0), `${g.id} sells at a loss`);
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

/* ---------- Phase 2: making and moving goods ---------- */

/** A save with money to spend and all four units bought */
function rich() {
  const s = newSave(T0);
  s.dorras = 1e6;
  for (let i = 0; i < UNIT_COUNT; i++) assert.ok(buyUnit(s, i).ok);
  return s;
}

test('a Phase 1 save carries on: stall kept, no units, an empty Workshop and car', () => {
  const s = cleanSave({ v: 1, dorras: 900, till: 12, at: T0, stall: { level: 2, slots: [{ good: 'tees', qty: 7, price: 'high', carry: 0 }] } }, T0);
  assert.equal(s.v, 2);
  assert.equal(s.dorras, 900);
  assert.equal(s.stall.slots[0].qty, 7);
  assert.equal(s.units.length, UNIT_COUNT);
  assert.ok(s.units.every((u) => u === null));
  assert.deepEqual(s.workshop, { stock: {}, job: null });
  assert.deepEqual(s.cargo, {});
});

test('raw goods have market prices but never go on a stall or shop', () => {
  const s = rich();
  assert.ok(buildUnit(s, 0, 'shop').ok);
  for (const id of ['sugar', 'beans', 'cotton'] as const) {
    assert.ok(marketPrice(id, T0) >= 1);
    assert.equal(room(s, id, 'stall'), 0);
    assert.equal(room(s, id, 'u0'), 0);
    assert.deepEqual(buy(s, id, 1, T0, 'stall'), { ok: false, why: 'room' });
  }
});

test('units cost more as you buy them, and are built as a garden, shop or warehouse', () => {
  const s = newSave(T0);
  s.dorras = UNIT_PRICES[0];
  assert.equal(unitPrice(s), UNIT_PRICES[0]);
  assert.ok(buyUnit(s, 2).ok);
  assert.equal(s.dorras, 0);
  assert.deepEqual(buyUnit(s, 2), { ok: false, why: 'owned' });
  assert.equal(unitPrice(s), UNIT_PRICES[1]);
  assert.deepEqual(buildUnit(s, 2, 'garden'), { ok: false, why: 'money' });
  s.dorras = 5000;
  assert.ok(buildUnit(s, 2, 'garden', 'cotton').ok);
  assert.equal(s.dorras, 5000 - UNIT_KINDS.garden.cost);
  assert.equal(s.units[2]!.crop, 'cotton');
  assert.deepEqual(buildUnit(s, 0, 'shop'), { ok: false, why: 'place' }, 'a unit you don\'t own');
  const all = rich();
  assert.equal(unitPrice(all), null);
});

test('gardens grow their crop into their bins, also while you\'re away, until full', () => {
  const s = rich();
  buildUnit(s, 0, 'garden', 'sugar');
  advance(s, T0 + 1 * MIN);
  assert.equal(holds(s, 'u0', 'sugar'), Math.floor(CROPS.sugar));
  advance(s, T0 + 600 * MIN);
  assert.equal(holds(s, 'u0', 'sugar'), GARDEN_CAP);
  // A crop can only change once the bins are empty
  assert.deepEqual(setCrop(s, 0, 'beans'), { ok: false, why: 'stock' });
  assert.ok(load(s, 'u0', 'sugar', GARDEN_CAP, 1000).ok);
  assert.ok(setCrop(s, 0, 'beans').ok);
});

test('a unit has to be empty before it\'s rebuilt', () => {
  const s = rich();
  buildUnit(s, 1, 'warehouse');
  buy(s, 'neon', 3, T0, 'u1');
  assert.deepEqual(buildUnit(s, 1, 'shop'), { ok: false, why: 'stock' });
  sellBack(s, 'neon', 3, T0, 'u1');
  assert.ok(buildUnit(s, 1, 'shop').ok);
});

test('a shop sells like a bigger stall; standing at it serves its customers', () => {
  const s = rich();
  buildUnit(s, 0, 'shop');
  buildUnit(s, 1, 'shop');
  assert.equal(room(s, 'glow', 'u0'), SHOP.capacity);
  for (const p of ['u0', 'u1'] as const) buy(s, 'glow', SHOP.capacity, T0, p);
  const sales = advance(s, T0 + 2 * MIN, 'u1');
  assert.ok(holds(s, 'u1', 'glow') < holds(s, 'u0', 'glow'), 'serving made no difference');
  assert.ok(sales.earned > 0 && s.till === sales.earned);
});

test('the warehouse holds any goods up to its size', () => {
  const s = rich();
  buildUnit(s, 3, 'warehouse');
  assert.equal(room(s, 'cotton', 'u3'), WAREHOUSE_CAP);
  buy(s, 'cotton', 100, T0, 'u3');
  buy(s, 'glow', 1000, T0, 'u3');
  assert.equal(total(s.units[3]!.stock), WAREHOUSE_CAP);
  assert.equal(room(s, 'tees', 'u3'), 0);
});

test('the Workshop turns raw goods into products over time; a cancelled job gives the rest back', () => {
  const s = rich();
  buy(s, 'sugar', 30, T0, 'workshop');
  assert.equal(canMake(s, 'gummies'), 15);
  assert.deepEqual(startJob(s, 'tees', 1), { ok: false, why: 'stock' });
  assert.ok(startJob(s, 'gummies', 10).ok);
  assert.equal(holds(s, 'workshop', 'sugar'), 10, 'inputs are taken when the job starts');
  assert.deepEqual(startJob(s, 'gummies', 1), { ok: false, why: 'busy' });
  const each = RECIPES.gummies!.minutes;
  advance(s, T0 + Math.round(each * 4.5 * MIN));
  assert.equal(holds(s, 'workshop', 'gummies'), 4);
  assert.ok(cancelJob(s));
  assert.equal(holds(s, 'workshop', 'sugar'), 10 + 6 * 2);
  assert.equal(s.workshop.job, null);
  // A job runs to the end, and no further
  startJob(s, 'gummies', 3);
  advance(s, T0 + 60 * MIN);
  assert.equal(holds(s, 'workshop', 'gummies'), 4 + 3);
  assert.equal(s.workshop.job, null);
  assert.ok(RECIPE_IDS.length >= 3 && canMake(s, 'gummies') <= JOB_MAX);
});

test('making your own beats buying the product, for every recipe', () => {
  for (const id of RECIPE_IDS) {
    const r = RECIPES[id]!;
    const inputs = Object.entries(r.needs).reduce((a, [raw, n]) => a + askPrice(raw as 'sugar', T0) * n!, 0);
    assert.ok(inputs < askPrice(id, T0), `${id}: its raw goods cost more than the product`);
  }
});

test('your car carries what it has room for; stock on sale can\'t be loaded', () => {
  const s = rich();
  buildUnit(s, 0, 'garden');
  buildUnit(s, 1, 'shop');
  advance(s, T0 + 20 * MIN);
  const cap = cargoCap('hatch');
  assert.equal(cap, CARGO.hatch);
  const r = load(s, 'u0', 'sugar', 999, cap);
  assert.ok(r.ok && r.qty === Math.min(cap, holds(s, 'u0', 'sugar') + r.qty));
  assert.equal(total(s.cargo), cap);
  assert.deepEqual(load(s, 'u0', 'sugar', 1, cap), { ok: false, why: 'room' });
  buy(s, 'glow', 5, T0, 'u1');
  assert.deepEqual(load(s, 'u1', 'glow', 1, 100), { ok: false, why: 'place' });
  assert.deepEqual(load(s, 'stall', 'glow', 1, 100), { ok: false, why: 'place' });
  assert.ok(cargoCap('van') > cargoCap('hatch') && cargoCap('hatch') > cargoCap('coupe'));
});

test('unloading puts goods where they fit, with a bonus at a stall or shop', () => {
  const s = rich();
  buildUnit(s, 0, 'warehouse');
  buildUnit(s, 1, 'shop');
  buy(s, 'tees', 20, T0, 'u0');
  load(s, 'u0', 'tees', 20, 40);
  const before = s.dorras;
  const r = unload(s, 'u1', 'tees', 20, T0);
  assert.ok(r.ok && r.qty === 20);
  assert.equal(r.dorras, Math.floor(20 * marketPrice('tees', T0) * DELIVERY_BONUS));
  assert.equal(s.dorras, before + r.dorras);
  assert.equal(holds(s, 'u1', 'tees'), 20);
  assert.deepEqual(s.cargo, {});
  // Raw goods only unload where they're used or kept
  buy(s, 'sugar', 5, T0, 'u0');
  load(s, 'u0', 'sugar', 5, 40);
  assert.deepEqual(unload(s, 'u1', 'sugar', 5, T0), { ok: false, why: 'room' });
  const w = unload(s, 'workshop', 'sugar', 5, T0);
  assert.ok(w.ok && w.dorras === 0, 'no bonus for the Workshop');
});

test('cleanSave keeps units, the Workshop and the car within their limits', () => {
  const s = cleanSave(
    {
      units: [
        { kind: 'garden', crop: 'beans', stock: { beans: 9999, sugar: 4 } },
        { kind: 'castle' },
        'x',
        { kind: 'shop', slots: [{ good: 'sugar', qty: 4 }, { good: 'tees', qty: 999 }] },
        { kind: 'warehouse' },
      ],
      workshop: { stock: { cotton: 1e9 }, job: { make: 'neon', left: 4 } },
      cargo: { tees: 1e6, gold: 5 },
    },
    T0
  );
  assert.equal(s.units.length, UNIT_COUNT);
  assert.deepEqual(s.units[0]!.stock, { beans: GARDEN_CAP });
  assert.equal(s.units[1]!.kind, null);
  assert.equal(s.units[2], null);
  assert.equal(s.units[3]!.slots.length, 1);
  assert.equal(s.units[3]!.slots[0].qty, SHOP.capacity);
  assert.ok(total(s.workshop.stock) <= 200);
  assert.equal(s.workshop.job, null, 'neon has no recipe');
  assert.ok(total(s.cargo) <= Math.max(...Object.values(CARGO)));
  assert.equal(Object.keys(s.cargo).length, 1);
});
