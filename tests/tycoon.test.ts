// The economy (tycoon.ts): Dorras, the market hall's moving prices, your stall.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEPOT_CAP,
  FACTORY,
  HQ_BOOST,
  LOAN_FEE,
  LOAN_SHARE,
  LOT_KINDS,
  LOT_PRICES,
  SUPERSTORE,
  borrow,
  buildLot,
  buyLot,
  goodsValue,
  lotPrice,
  loanLimit,
  propertyValue,
  repay,
  shipFeeFrom,
  worth,
  BOARD_MINUTES,
  BOARD_SIZE,
  CONTRACTS_MAX,
  CONTRACT_TIME,
  SHIP_MAX,
  STAFF_BOOST,
  STAFF_CUT,
  STAFF_HIRE,
  DEST_IDS,
  accept,
  board,
  buyToCar,
  deliver,
  destAt,
  dropContract,
  hire,
  letGo,
  roleAt,
  sellFromCar,
  ship,
  shipFee,
  shipMinutes,
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
  CORNER,
  CORNER_COUNT,
  CORNER_LEVEL,
  CORNER_PRICES,
  buyCorner,
  sells,
  cornerPrice,
  placeLevel,
  placeLevelCost,
} from '../src/scripts/city3d/tycoon';
import { CORNER_LEVEL_COSTS, xpForLevel } from '../src/scripts/city3d/catalog';

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
  assert.equal(s.v, 11);
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
  assert.ok(total(s.cargo) <= Math.max(...Object.values(CARGO)) * 2, 'the biggest boot, with a full roof rack');
  assert.equal(Object.keys(s.cargo).length, 1);
});

/* ---------- Phase 3: staff, couriers, contracts ---------- */

test('a Phase 2 save carries on into Phase 3: no staff, couriers or contracts yet', () => {
  const s = cleanSave({ v: 2, dorras: 100, units: [{ kind: 'shop', slots: [] }], workshop: { stock: { sugar: 4 }, job: null }, cargo: { tees: 2 } }, T0);
  assert.equal(s.v, 11);
  assert.equal(s.units[0]!.kind, 'shop');
  assert.deepEqual(s.cargo, { tees: 2 });
  assert.deepEqual([s.staff, s.shipments, s.contracts, s.taken], [[], [], [], []]);
});

test('staff: one per place, the right role, hired up front', () => {
  const s = rich();
  buildUnit(s, 0, 'garden');
  buildUnit(s, 1, 'warehouse');
  assert.equal(roleAt(s, 'stall'), 'clerk');
  assert.equal(roleAt(s, 'u0'), 'gardener');
  assert.equal(roleAt(s, 'u1'), null);
  assert.equal(roleAt(s, 'workshop'), 'hand');
  const before = s.dorras;
  assert.ok(hire(s, 'stall').ok);
  assert.equal(s.dorras, before - STAFF_HIRE);
  assert.deepEqual(hire(s, 'stall'), { ok: false, why: 'owned' });
  assert.deepEqual(hire(s, 'u1'), { ok: false, why: 'place' });
  const poor = newSave(T0);
  poor.dorras = STAFF_HIRE - 1;
  assert.deepEqual(hire(poor, 'stall'), { ok: false, why: 'money' });
  // Rebuilding a unit lets its staff go
  hire(s, 'u0');
  buildUnit(s, 0, 'shop');
  assert.ok(!s.staff.includes('u0'));
  assert.ok(letGo(s, 'stall') && !s.staff.includes('stall'));
});

test('a clerk sells more (full pace while you\'re away) and keeps a share of the takings', () => {
  const run = (clerk: boolean, minutes: number) => {
    const s = newSave(T0);
    s.dorras = 1e6;
    s.stall.level = 3;
    buy(s, 'glow', 80, T0);
    if (clerk) hire(s, 'stall');
    const sales = advance(s, T0 + minutes * MIN);
    return { s, sales };
  };
  const here = [run(false, 2), run(true, 2)];
  assert.ok((here[1].sales.sold.glow ?? 0) > (here[0].sales.sold.glow ?? 0));
  const n = here[1].sales.sold.glow!;
  const pay = n * retailPrice('glow', 'fair', T0 + 2 * MIN);
  assert.equal(here[1].sales.wages, Math.floor(pay * STAFF_CUT));
  assert.equal(here[1].s.till, pay - here[1].sales.wages);
  // Away for 30 minutes: a clerk keeps selling at full pace
  const away = [run(false, 30), run(true, 30)];
  assert.ok((away[1].sales.sold.glow ?? 0) >= (away[0].sales.sold.glow ?? 0) * 3);
  assert.ok(STAFF_BOOST > 1);
});

test('a gardener and a workshop hand speed things up and are paid from the till, then your balance', () => {
  const s = rich();
  buildUnit(s, 0, 'garden');
  buildUnit(s, 1, 'garden');
  hire(s, 'u1');
  buy(s, 'sugar', 40, T0, 'workshop');
  startJob(s, 'gummies', 20);
  const plain = newSave(T0);
  plain.dorras = 1e6;
  buy(plain, 'sugar', 40, T0, 'workshop');
  startJob(plain, 'gummies', 20);
  hire(s, 'workshop');
  s.till = 0;
  const d0 = s.dorras;
  const sales = advance(s, T0 + 2 * MIN);
  advance(plain, T0 + 2 * MIN);
  assert.ok(holds(s, 'u1', 'sugar') > holds(s, 'u0', 'sugar'), 'the gardener made no difference');
  assert.ok(holds(s, 'workshop', 'gummies') > holds(plain, 'workshop', 'gummies'), 'the hand made no difference');
  assert.ok(sales.wages > 0 && s.dorras === d0 - sales.wages);
});

test('staff who can\'t be paid leave', () => {
  const s = rich();
  buildUnit(s, 0, 'garden');
  hire(s, 'u0');
  s.dorras = 0;
  s.till = 0;
  const sales = advance(s, T0 + 3 * MIN);
  assert.deepEqual(sales.quit, ['u0']);
  assert.ok(!s.staff.includes('u0'));
});

test('couriers carry goods between your places for a fee, arriving later', () => {
  const s = rich();
  buildUnit(s, 0, 'warehouse');
  buildUnit(s, 1, 'shop');
  buy(s, 'tees', 30, T0, 'u0');
  const d0 = s.dorras;
  const r = ship(s, 'u0', 'u1', 'tees', 30, T0);
  assert.ok(r.ok && r.qty === 30 && r.dorras === shipFee('tees', 30, T0));
  assert.equal(s.dorras, d0 - r.dorras);
  assert.equal(holds(s, 'u0', 'tees'), 0, 'the goods leave straight away');
  const mins = shipMinutes('u0', 'u1');
  assert.ok(mins >= 1);
  advance(s, T0 + (mins - 0.5) * MIN);
  assert.equal(holds(s, 'u1', 'tees'), 0, 'arrived early');
  const sales = advance(s, T0 + (mins + 0.1) * MIN);
  assert.equal(sales.arrived[0].qty, 30);
  assert.ok(holds(s, 'u1', 'tees') > 0);
  assert.deepEqual(s.shipments, []);
  // Not from a stall or shop, never to the same place, and only so many at once
  assert.deepEqual(ship(s, 'u1', 'u0', 'tees', 1, T0), { ok: false, why: 'place' });
  assert.deepEqual(ship(s, 'u0', 'u0', 'tees', 1, T0), { ok: false, why: 'place' });
  buy(s, 'glow', 100, T0, 'u0');
  for (let k = 0; k < SHIP_MAX; k++) assert.ok(ship(s, 'u0', 'workshop', 'glow', 5, T0).ok);
  assert.deepEqual(ship(s, 'u0', 'workshop', 'glow', 5, T0), { ok: false, why: 'busy' });
});

test('the contract board is the same for everyone, changes every few minutes, and pays more than the goods are worth', () => {
  const a = board(T0);
  assert.equal(a.length, BOARD_SIZE);
  assert.deepEqual(board(T0 + 1000), a);
  assert.notDeepEqual(board(T0 + BOARD_MINUTES * MIN), a);
  for (let k = 0; k < 50; k++)
    for (const c of board(T0 + k * BOARD_MINUTES * MIN)) {
      const g = GOODS.find((x) => x.id === c.good)!;
      assert.ok(!g.raw, 'contracts are for products');
      assert.ok(c.qty >= 2 && c.qty <= 60);
      assert.ok(c.reward > c.qty * askPrice(c.good, T0 + k * BOARD_MINUTES * MIN), `contract ${c.id} pays less than buying the goods`);
      assert.ok(destAt(c.to), `no drop-off for ${c.to}`);
    }
});

test('take a contract, deliver it from your car at the drop-off, get paid', () => {
  const s = rich();
  const c = board(T0)[0];
  assert.ok(accept(s, c.id, T0).ok);
  assert.deepEqual(accept(s, c.id, T0), { ok: false, why: 'owned' });
  const other = DEST_IDS.find((d) => d !== c.to)!;
  assert.deepEqual(deliver(s, c.id, c.to, T0), { ok: false, why: 'stock' });
  s.cargo[c.good] = c.qty;
  assert.deepEqual(deliver(s, c.id, other, T0), { ok: false, why: 'place' });
  const d0 = s.dorras;
  const r = deliver(s, c.id, c.to, T0 + MIN);
  assert.ok(r.ok && r.dorras === c.reward);
  assert.equal(s.dorras, d0 + c.reward);
  assert.deepEqual(s.cargo, {});
  assert.equal(s.stats.contracts, 1);
  assert.deepEqual(accept(s, c.id, T0), { ok: false, why: 'owned' }, 'a delivered contract can\'t be taken again');
});

test('contracts run out, only so many at once, and only from the board on show', () => {
  const s = rich();
  const b = board(T0);
  for (let k = 0; k < CONTRACTS_MAX; k++) assert.ok(accept(s, b[k].id, T0).ok);
  assert.deepEqual(accept(s, b[CONTRACTS_MAX].id, T0), { ok: false, why: 'max' });
  assert.ok(dropContract(s, b[0].id));
  assert.deepEqual(accept(s, b[CONTRACTS_MAX].id, T0 + BOARD_MINUTES * MIN), { ok: false, why: 'time' }, 'yesterday\'s board');
  const sales = advance(s, T0 + (CONTRACT_TIME + 1) * MIN);
  assert.equal(sales.expired.length, CONTRACTS_MAX - 1);
  assert.deepEqual(s.contracts, []);
});

test('your car can be filled at the market hall and sold from', () => {
  const s = newSave(T0);
  const r = buyToCar(s, 'coffee', 99, T0, 16);
  assert.ok(r.ok && r.qty === 16 && s.cargo.coffee === 16);
  assert.deepEqual(buyToCar(s, 'coffee', 1, T0, 16), { ok: false, why: 'room' });
  const back = sellFromCar(s, 'coffee', 16, T0);
  assert.ok(back.ok && back.dorras === 16 * bidPrice('coffee', T0));
  assert.deepEqual(s.cargo, {});
});

test('cleanSave keeps Phase 3 within the rules', () => {
  const s = cleanSave(
    {
      units: [{ kind: 'warehouse' }],
      staff: ['stall', 'stall', 'u0', 'u3', 'moon'],
      shipments: [{ from: 'u0', to: 'stall', good: 'tees', qty: 9999, arrives: T0 + 1e12 }, { from: 'x' }],
      contracts: [{ id: 5, good: 'neon', qty: 3, to: 'vault', reward: 1e12, expires: T0 + 1e12 }, { id: 6, good: 'sugar', qty: 3, to: 'vault' }],
      taken: [1, 'two', -3, 4.5, 7],
    },
    T0
  );
  assert.deepEqual(s.staff, ['stall'], 'staff only where there\'s a job for them, once');
  assert.equal(s.shipments.length, 1);
  assert.ok(s.shipments[0].qty <= 50 && s.shipments[0].arrives <= T0 + 60 * MIN);
  assert.equal(s.contracts.length, 1, 'contracts are for products');
  assert.ok(s.contracts[0].reward <= 3 * 260 * 1.8 && s.contracts[0].expires <= T0 + CONTRACT_TIME * MIN);
  assert.deepEqual(s.taken, [1, 7]);
});

/* ---------- Phase 4: the big lots and the Vault ---------- */

/** All three big lots bought */
function tycoon() {
  const s = rich();
  for (let i = 0; i < 3; i++) assert.ok(buyLot(s, i).ok);
  return s;
}

test('a Phase 3 save carries on into Phase 4: no big lots, an empty ledger, no loan', () => {
  const s = cleanSave({ v: 3, dorras: 100, staff: ['stall'] }, T0);
  assert.equal(s.v, 11);
  assert.deepEqual(s.lots, [null, null, null]);
  assert.deepEqual(s.ledger, { totals: {}, recent: [] });
  assert.equal(s.loan, null);
  assert.deepEqual(s.staff, ['stall']);
});

test('big lots cost Dorras (more each time) and are built as a superstore, factory, depot or offices', () => {
  const s = newSave(T0);
  s.dorras = LOT_PRICES[0] - 1;
  assert.deepEqual(buyLot(s, 0), { ok: false, why: 'money' });
  s.dorras = 1e6;
  assert.ok(buyLot(s, 1).ok);
  assert.equal(s.dorras, 1e6 - LOT_PRICES[0]);
  assert.equal(lotPrice(s), LOT_PRICES[1]);
  assert.deepEqual(buyLot(s, 1), { ok: false, why: 'owned' });
  assert.ok(buildLot(s, 1, 'offices').ok);
  assert.equal(s.dorras, 1e6 - LOT_PRICES[0] - LOT_KINDS.offices.cost);
  assert.ok(buyLot(s, 0).ok);
  assert.deepEqual(buildLot(s, 0, 'offices'), { ok: false, why: 'owned' }, 'one set of offices is enough');
});

test('a superstore sells like a big shop and takes a clerk', () => {
  const s = tycoon();
  buildLot(s, 0, 'superstore');
  assert.equal(room(s, 'neon', 'l0'), SUPERSTORE.capacity);
  assert.equal(room(s, 'sugar', 'l0'), 0);
  buy(s, 'glow', SUPERSTORE.capacity, T0, 'l0');
  buy(s, 'glow', 20, T0, 'stall');
  const sales = advance(s, T0 + 2 * MIN);
  assert.ok((sales.sold.glow ?? 0) > 0);
  assert.ok(SUPERSTORE.capacity - holds(s, 'l0', 'glow') > 20 - holds(s, 'stall', 'glow'), 'the superstore sells faster than the stall');
  assert.equal(roleAt(s, 'l0'), 'clerk');
});

test('a factory runs jobs faster than the Workshop, from its own bay', () => {
  const s = tycoon();
  buildLot(s, 1, 'factory');
  buy(s, 'cotton', 300, T0, 'l1');
  buy(s, 'cotton', 200, T0, 'workshop');
  assert.equal(canMake(s, 'tees', 'l1'), FACTORY.jobMax);
  assert.ok(startJob(s, 'tees', 20, 'l1').ok);
  assert.ok(startJob(s, 'tees', 20).ok);
  advance(s, T0 + 3 * MIN);
  assert.ok(holds(s, 'l1', 'tees') > holds(s, 'workshop', 'tees'));
  assert.equal(roleAt(s, 'l1'), 'hand');
  assert.deepEqual(buildLot(s, 1, 'depot'), { ok: false, why: 'stock' }, 'a busy factory can\'t be rebuilt');
  assert.ok(cancelJob(s, 'l1'));
});

test('a depot holds a lot, loads into your car, and its couriers cost half', () => {
  const s = tycoon();
  buildLot(s, 2, 'depot');
  buildUnit(s, 0, 'shop');
  assert.equal(room(s, 'tees', 'l2'), DEPOT_CAP);
  buy(s, 'tees', 100, T0, 'l2');
  assert.equal(shipFeeFrom(s, 'l2', 'tees', 40, T0), Math.ceil(shipFee('tees', 40, T0) / 2));
  assert.ok(ship(s, 'l2', 'u0', 'tees', 40, T0).ok);
  assert.ok(load(s, 'l2', 'tees', 10, 80).ok);
  assert.equal(roleAt(s, 'l2'), null);
});

test('offices make every stall, shop and superstore sell faster', () => {
  const run = (hq: boolean) => {
    const s = tycoon();
    if (hq) buildLot(s, 0, 'offices');
    buy(s, 'glow', 20, T0);
    return advance(s, T0 + 2 * MIN).sold.glow ?? 0;
  };
  assert.ok(run(true) > run(false));
  assert.ok(HQ_BOOST > 1);
});

test('the ledger keeps where Dorras came from and went, a minute\'s run of one kind on one line', () => {
  const s = newSave(T0);
  s.dorras = 10000;
  buy(s, 'glow', 10, T0);
  buy(s, 'gummies', 10, T0);
  assert.equal(s.ledger.totals.bought, 10 * askPrice('glow', T0) + 10 * askPrice('gummies', T0));
  assert.equal(s.ledger.recent.length, 1);
  buyUnit(s, 0);
  assert.equal(s.ledger.totals.property, UNIT_PRICES[0]);
  advance(s, T0 + 2 * MIN);
  assert.ok((s.ledger.totals.sales ?? 0) > 0);
  assert.ok(s.ledger.recent.length <= 30);
});

test('property, goods and worth add up', () => {
  const s = rich();
  buildUnit(s, 0, 'warehouse');
  assert.equal(propertyValue(s), UNIT_PRICES.reduce((a, b) => a + b, 0) + UNIT_KINDS.warehouse.cost);
  buy(s, 'tees', 10, T0, 'u0');
  assert.equal(goodsValue(s, T0), 10 * marketPrice('tees', T0));
  assert.equal(worth(s, T0), s.dorras + s.till + goodsValue(s, T0) + propertyValue(s));
});

test('loans: a flat fee, limited by your property, paid back from takings and by hand', () => {
  const s = newSave(T0);
  assert.equal(loanLimit(s), 1000);
  assert.deepEqual(borrow(s, 5000), { ok: false, why: 'max' });
  assert.ok(borrow(s, 1000).ok);
  assert.equal(s.dorras, 600 + 1000);
  assert.equal(s.loan!.owed, Math.ceil(1000 * (1 + LOAN_FEE)));
  assert.deepEqual(borrow(s, 100), { ok: false, why: 'busy' });
  // A share of the takings goes to the loan
  buy(s, 'glow', 20, T0);
  const owed = s.loan!.owed;
  const sales = advance(s, T0 + 3 * MIN);
  assert.ok(sales.repaid > 0 && s.loan!.owed === owed - sales.repaid);
  assert.ok(sales.repaid <= Math.ceil(sales.earned * LOAN_SHARE / (1 - LOAN_SHARE)) + 1);
  // Paid off by hand
  s.dorras = 5000;
  assert.ok(repay(s, 99999).ok);
  assert.equal(s.loan, null);
  assert.deepEqual(repay(s, 1), { ok: false, why: 'place' });
  // More property, more credit
  const big = tycoon();
  assert.ok(loanLimit(big) > 10000 && loanLimit(big) <= 50000);
});

test('cleanSave keeps Phase 4 within the rules', () => {
  const s = cleanSave(
    {
      lots: [{ kind: 'superstore', slots: [{ good: 'tees', qty: 9999 }] }, { kind: 'casino' }, { kind: 'factory', stock: { cotton: 1e9 }, job: { make: 'tees', left: 9999 } }],
      ledger: { totals: { sales: 50, bogus: 9, staff: -4 }, recent: [{ t: T0 + 1e9, e: 'sales', n: 5 }, { e: 'nope' }] },
      loan: { owed: 1e12, borrowed: 1e12 },
    },
    T0
  );
  assert.equal(s.lots[0]!.slots[0].qty, SUPERSTORE.capacity);
  assert.equal(s.lots[1]!.kind, null);
  assert.ok(total(s.lots[2]!.stock) <= FACTORY.cap && s.lots[2]!.job!.left <= FACTORY.jobMax);
  assert.deepEqual(s.ledger.totals, { sales: 50 });
  assert.equal(s.ledger.recent.length, 1);
  assert.ok(s.ledger.recent[0].t <= T0);
  assert.ok(s.loan!.owed <= 50000 * 1.1 && s.loan!.borrowed <= 50000);
});

/* ---------- The Trenches' corner shops (save v10) ---------- */

test('corner shops: from level 5, dearer each time, a shop straight away that sells faster than a unit shop', () => {
  const s = newSave(T0);
  s.dorras = 1e6;
  assert.deepEqual(buyCorner(s, 0), { ok: false, why: 'level' }, 'a new player can\'t buy one');
  s.xp = xpForLevel(CORNER_LEVEL);
  assert.equal(cornerPrice(s), CORNER_PRICES[0]);
  assert.ok(buyCorner(s, 2).ok);
  assert.equal(s.dorras, 1e6 - CORNER_PRICES[0]);
  assert.equal(cornerPrice(s), CORNER_PRICES[1]);
  assert.deepEqual(buyCorner(s, 2), { ok: false, why: 'owned' });
  assert.deepEqual(buyCorner(s, 4), { ok: false, why: 'place' });
  assert.equal(s.ledger.totals.property, CORNER_PRICES[0]);
  assert.equal(propertyValue(s), CORNER_PRICES[0]);
  // A shop: products on its shelves, never raw goods; a clerk can work it; it levels up
  assert.ok(sells(s, 'c2') && !sells(s, 'c0'));
  assert.equal(room(s, 'sugar', 'c2'), 0);
  assert.equal(room(s, 'tees', 'c2'), CORNER.capacity);
  assert.equal(roleAt(s, 'c2'), 'clerk');
  assert.equal(placeLevelCost(s, 'c2'), CORNER_LEVEL_COSTS[1]);
  assert.equal(placeLevelCost(s, 'c0'), null, 'nothing to level where you don\'t own it');
  // Customers come faster than at a unit shop
  assert.ok(buyUnit(s, 0).ok && buildUnit(s, 0, 'shop').ok);
  buy(s, 'glow', 50, T0, 'c2');
  buy(s, 'glow', 50, T0, 'u0');
  advance(s, T0 + 2 * MIN);
  assert.ok(holds(s, 'u0', 'glow') > 0, 'neither sold out');
  assert.ok(50 - holds(s, 'c2', 'glow') > 50 - holds(s, 'u0', 'glow'));
  // Your car unloads into it, with the delivery bonus; couriers bring stock to it
  s.cargo = { tees: 10 };
  const r = unload(s, 'c2', 'tees', 10, T0 + 2 * MIN);
  assert.ok(r.ok && r.dorras > 0);
  assert.equal(load(s, 'c2', 'tees', 5, 80).ok, false, 'stock on sale stays on the shelves');
});

test('a v9 save carries on into v10 owning no corner shops; a v10 save keeps its shelves, clamped', () => {
  const old = cleanSave({ v: 9, dorras: 500, lots: [null, null, null] }, T0);
  assert.equal(old.v, 11);
  assert.deepEqual(old.corners, [null, null, null, null]);
  const s = cleanSave(
    { v: 10, levels: { c1: 2 }, corners: [null, { slots: [{ good: 'tees', qty: 9999, price: 'high' }, { good: 'sugar', qty: 5 }] }, 'junk', null, { slots: [] }] },
    T0
  );
  assert.equal(s.corners.length, CORNER_COUNT);
  assert.equal(s.corners[0], null);
  assert.equal(s.corners[2], null);
  assert.deepEqual(s.corners[1]!.slots.map((x) => [x.good, x.qty, x.price]), [['tees', Math.round(CORNER.capacity * 1.5), 'high']]);
  assert.equal(placeLevel(s, 'c1'), 2);
});
