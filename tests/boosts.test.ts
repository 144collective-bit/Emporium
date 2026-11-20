// Things worth carrying (docs/inventory-plan.md Phase 5): the energy drink, the nitro can and the flyers. What each does
// (boosts.ts), where each is used (inventory.ts `useItem()`), where each is sold (`SELLERS`), the nitro in the car's rules
// (drive-sim.ts) under the game server's limit, and the flyers' customers at your stall (tycoon.ts `advance()`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENERGY, FLYERS, NITRO, createBoosts, flyersShare, nitroAccel, nitroTop } from '../src/scripts/city3d/boosts';
import { ITEM_CATALOG, ITEM_IDS, ITEM_MAX } from '../src/scripts/city3d/catalog';
import { SELLERS, SNACK_BARS, buyItem, slotKey, slots, touchFirst, useItem, type Here } from '../src/scripts/city3d/inventory';
import { HOT_SLOTS } from '../src/scripts/city3d/touchlayout';
import { CARTS } from '../src/scripts/city3d/streetlife';
import { SHOPS, doorOf } from '../src/scripts/city3d/highroad';
import { SOLID_GRID } from '../src/scripts/city3d/solids';
import { advance, cleanSave, newSave, type TycoonSave } from '../src/scripts/city3d/tycoon';
import { newCar, stepCar, tune, type DriveWorld } from '../src/scripts/city3d/drive-sim';
import { GAITS } from '../src/scripts/city3d/movesim';
import { SPEEDS } from '../src/scripts/net/protocol';

const NOW = Date.UTC(2026, 10, 19, 12);
const stocked = (n: number) => {
  const s = newSave(NOW);
  s.dorras = 1e6;
  for (const id of ITEM_IDS) s.inventory.items[id] = n;
  s.stall.slots.push({ good: 'tees', qty: 500, price: 'fair', carry: 0, run: 0 });
  return s;
};

test('four consumables, each priced in Dorras, used somewhere of its own, sold somewhere of its own', () => {
  assert.deepEqual(ITEM_IDS, ['snack', 'energy', 'nitro', 'flyers']);
  for (const id of ITEM_IDS) {
    const c = ITEM_CATALOG[id];
    assert.ok(c.price > 0 && c.level >= 1 && c.blurb && c.where && c.use, id);
    assert.ok(SELLERS.some((b) => b.sells === id), `${id} is sold somewhere`);
  }
  // The hotbar has room for all of them: the two weapon slots, the thing in his hand and the four
  const s = stocked(2);
  s.inventory.held = 'coffee';
  assert.equal(slots(s).length, 7);
  // A touch screen's bar is HOT_SLOTS long: the weapons, the thing in his hand and the consumable that works where he is
  assert.deepEqual(slots(s, HOT_SLOTS, touchFirst(false)).map(slotKey), ['gun0', 'gun1', 'held', 'item:energy']);
  assert.deepEqual(slots(s, HOT_SLOTS, touchFirst(true)).map(slotKey), ['gun0', 'gun1', 'held', 'item:flyers']);
  // (with no energy drink, the next he has)
  delete s.inventory.items.energy;
  assert.deepEqual(slots(s, HOT_SLOTS, touchFirst(false)).map(slotKey), ['gun0', 'gun1', 'held', 'item:snack']);
});

test('each is used only where it works, one at a time, and comes out of the bag', () => {
  const s = stocked(ITEM_MAX);
  const on = new Set<string>();
  const here = (h: Here): Here => ({ now: NOW, on: (id) => on.has(id), ...h });
  // The snack in a spar only
  assert.deepEqual(useItem(s, 'snack', here({ onFoot: true })), { ok: false, why: 'place' });
  assert.equal(useItem(s, 'snack', here({ spar: true })).ok, true);
  // The energy drink on foot, not at the wheel; not a second while one's on
  assert.deepEqual(useItem(s, 'energy', here({ car: true })), { ok: false, why: 'place' });
  assert.equal(useItem(s, 'energy', here({ onFoot: true })).ok, true);
  on.add('energy');
  assert.deepEqual(useItem(s, 'energy', here({ onFoot: true })), { ok: false, why: 'active' });
  // The nitro at the wheel of your car (or bike), not on foot
  assert.deepEqual(useItem(s, 'nitro', here({ onFoot: true })), { ok: false, why: 'place' });
  assert.equal(useItem(s, 'nitro', here({ car: true })).ok, true);
  on.add('nitro');
  assert.deepEqual(useItem(s, 'nitro', here({ car: true })), { ok: false, why: 'active' });
  // The flyers at your stall, while it has something to sell, not twice while they're out
  assert.deepEqual(useItem(s, 'flyers', here({ onFoot: true })), { ok: false, why: 'place' });
  const bare = stocked(1);
  bare.stall.slots = [];
  assert.deepEqual(useItem(bare, 'flyers', here({ atStall: true })), { ok: false, why: 'empty' });
  assert.equal(useItem(s, 'flyers', here({ atStall: true })).ok, true);
  assert.equal(s.flyers, NOW + FLYERS.minutes * 60000);
  assert.deepEqual(useItem(s, 'flyers', here({ atStall: true, now: NOW + 60000 })), { ok: false, why: 'active' });
  assert.equal(useItem(s, 'flyers', here({ atStall: true, now: s.flyers + 1 })).ok, true);
  // Each used one came out of the bag; none left is 'stock'
  assert.deepEqual(s.inventory.items, { snack: ITEM_MAX - 1, energy: ITEM_MAX - 1, nitro: ITEM_MAX - 1, flyers: ITEM_MAX - 2 });
  const none = newSave(NOW);
  assert.deepEqual(useItem(none, 'nitro', here({ car: true })), { ok: false, why: 'stock' });
  // Bought like the snack: Dorras, a level, ITEM_MAX at most
  const b = newSave(NOW);
  b.dorras = 1e6;
  b.xp = 0;
  assert.equal(buyItem(b, 'energy').ok, true);
  assert.deepEqual(buyItem(b, 'nitro'), { ok: false, why: 'level' });
});

test('the boosts run for their time, one clock, and clear', () => {
  const b = createBoosts();
  assert.equal(b.on('energy', 10), false);
  b.start('energy', 10);
  b.start('nitro', 12);
  assert.equal(b.on('energy', 10 + ENERGY.seconds - 0.01), true);
  assert.equal(b.on('energy', 10 + ENERGY.seconds), false);
  assert.ok(Math.abs(b.left('nitro', 13) - (NITRO.seconds - 1)) < 1e-9);
  assert.ok(Math.abs(b.share('nitro', 12) - 1) < 1e-9);
  b.clear();
  assert.equal(b.on('nitro', 13), false);
});

test('the energy drink and the nitro stay inside what the game server lets a walker and a car do', () => {
  // On foot: the sprint with the drink on, well under the walk's limit
  assert.ok(GAITS.sprint * ENERGY.speed < SPEEDS.walk);
  // In a car: the fastest a car can be tuned, with the nitro on, still under the car's limit; and it gets there
  const t = tune({ speed: 1.15, accel: 1.15, grip: 1 }, { L: 2.5, W: 1, wheelbase: 1.6 });
  assert.ok(nitroTop(t.top, 1) < SPEEDS.drive - 2);
  const OPEN: DriveWorld = { boxes: [], soft: [] };
  const bounds = [-1e4, -1e4, 1e4, 1e4, 99] as [number, number, number, number, number];
  const run = (boost: number) => {
    const c = newCar(0, 0, 0);
    for (let i = 0; i < 60 * 20; i++) stepCar(c, { throttle: 1, steer: 0, handbrake: false, boost }, t, 1 / 60, OPEN, bounds);
    return c.speed;
  };
  const plain = run(0);
  const boosted = run(1);
  assert.ok(boosted > plain * 1.2, `${boosted} over ${plain}`);
  assert.ok(boosted < SPEEDS.drive);
  // A second of it picks up faster than without
  const c0 = newCar(0, 0, 0);
  const c1 = newCar(0, 0, 0);
  for (let i = 0; i < 60; i++) {
    stepCar(c0, { throttle: 1, steer: 0, handbrake: false }, t, 1 / 60, OPEN, bounds);
    stepCar(c1, { throttle: 1, steer: 0, handbrake: false, boost: 1 }, t, 1 / 60, OPEN, bounds);
  }
  assert.ok(c1.speed > c0.speed * 1.5);
  assert.ok(nitroAccel(t.accel, 0) === t.accel && nitroTop(t.top, 0) === t.top);
});

test('the flyers: twice the customers at your stall while they are out, the share of a tick they were out, not while away', () => {
  assert.equal(flyersShare(0, NOW, NOW + 60000), 0);
  const until = NOW + FLYERS.minutes * 60000;
  assert.equal(flyersShare(until, NOW, NOW + 60000), 1);
  assert.ok(Math.abs(flyersShare(until, until - 30000, until + 30000) - 0.5) < 1e-9);
  assert.equal(flyersShare(until, until, until + 60000), 0);
  // The same minute sold with and without them
  // (the flyers' five minutes, a tick every 10 s as the game ticks: a longer gap would count as time away)
  const sold = (s: TycoonSave) => {
    s.at = NOW;
    let n = 0;
    // (standing at it, priced low: enough sold to see the difference)
    s.stall.slots[0].price = 'low';
    for (let t = NOW + 10000; t <= until; t += 10000) n += advance(s, t, true).sold.tees ?? 0;
    return n;
  };
  const plain = stocked(0);
  const out = stocked(0);
  out.flyers = until;
  const a = sold(plain);
  const b = sold(out);
  assert.ok(a >= 8 && b >= 2 * a - 1 && b <= 2 * a + 1, `${a} then ${b}`);
  // A save keeps them out, never longer than a fresh lot; a save from before them has none
  const back = cleanSave(JSON.parse(JSON.stringify({ ...out, flyers: NOW + 1e9 })), NOW);
  assert.equal(back.flyers, NOW + FLYERS.minutes * 60000);
  const old = JSON.parse(JSON.stringify(plain));
  delete old.flyers;
  assert.equal(cleanSave(old, NOW).flyers, 0);
});

test('where they are sold: the snack bars, the coffee carts, the newsstands and the petrol station, each spot clear', () => {
  assert.equal(new Set(SELLERS.map((b) => b.id)).size, SELLERS.length);
  assert.deepEqual(
    SELLERS.filter((b) => b.sells === 'snack').map((b) => b.id),
    SNACK_BARS.map((b) => b.id)
  );
  assert.equal(SELLERS.filter((b) => b.sells === 'energy').length, CARTS.filter((c) => c.kind === 'coffee').length);
  assert.equal(SELLERS.filter((b) => b.sells === 'flyers').length, CARTS.filter((c) => c.kind === 'news').length);
  const fuel = SHOPS.filter((s) => s.kind === 'petrol');
  assert.ok(fuel.length >= 1);
  assert.equal(SELLERS.filter((b) => b.sells === 'nitro').length, fuel.length);
  for (const b of SELLERS) {
    const hit = SOLID_GRID.near(b.x, b.z, 0.2).some(([x0, z0, x1, z1]) => b.x > x0 - 0.2 && b.x < x1 + 0.2 && b.z > z0 - 0.2 && b.z < z1 + 0.2);
    assert.ok(!hit, `${b.name} (${b.sells}) at ${b.x.toFixed(2)}, ${b.z.toFixed(2)}`);
    assert.ok(b.name && !/[^A-Za-z '&]/.test(b.name), b.name);
  }
  // The kiosk's prompt is well away from the petrol station's own door (its panel's prompt)
  for (const [i, sh] of fuel.entries()) {
    const k = SELLERS.find((b) => b.id === `fuel${i}`)!;
    const [dx, dz] = doorOf(sh);
    assert.ok(Math.hypot(k.x - dx, k.z - dz) > 3, `${sh.name}'s kiosk`);
  }
  // No two prompts so close they'd fight (the nearest within 1 wins)
  for (const a of SELLERS) for (const b of SELLERS) if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 1.2, `${a.id} and ${b.id}`);
});
