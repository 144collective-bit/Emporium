// The inventory (inventory.ts, docs/inventory-plan.md Phase 1): the save's loadout, the thing in his
// hand and his consumables; the hotbar's slots and steps; snacks bought at the diners and the Night
// Market; the sim swapping only within the loadout; the loadout on the wire.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEM_CATALOG, ITEM_MAX } from '../src/scripts/city3d/catalog';
import { addXp, buyGun, cleanSave, newSave } from '../src/scripts/city3d/tycoon';
import { SLOTS_MAX, SNACK_BARS, buyItem, carryGun, cleanInventory, pickSlot, setHeld, setLoadout, slotKey, slots, stepKey, useItem } from '../src/scripts/city3d/inventory';
import { createSim } from '../src/scripts/city3d/combat-sim';
import { cleanKit } from '../src/scripts/net/protocol';
import { SOLID_GRID } from '../src/scripts/city3d/solids';
import { INFILL, bodyOf } from '../src/scripts/city3d/downtown';
import { STALLS } from '../src/scripts/city3d/nightmarket';

const NOW = 1_700_000_000_000;
const rich = () => {
  const s = newSave(NOW);
  s.dorras = 1e6;
  addXp(s, 1e6);
  return s;
};

test('a new save carries the rifle and nothing else', () => {
  const s = newSave(NOW);
  assert.deepEqual(s.inventory, { guns: ['rifle', null], held: null, items: {} });
  assert.deepEqual(cleanSave(null, NOW).inventory, s.inventory);
});

test('a v10 save carries on into v11 with the rifle and the first gun it bought, catalog order', () => {
  const old = cleanSave({ v: 10, dorras: 5, armoury: { owned: ['lmg', 'revolver'] } }, NOW);
  assert.equal(old.v, 11);
  assert.deepEqual(old.inventory.guns, ['rifle', 'revolver']);
  assert.equal(old.inventory.held, null);
  // Nothing bought: the rifle alone
  assert.deepEqual(cleanSave({ v: 10 }, NOW).inventory.guns, ['rifle', null]);
});

test('a loaded inventory is cleaned: owned guns, no gun twice, a bought thing in the hand, counts in range', () => {
  const s = cleanSave(
    { v: 11, armoury: { owned: ['burst'] }, wardrobe: [], inventory: { guns: ['lmg', 'lmg'], held: 'briefcase', items: { snack: 99, laser: 3 } } },
    NOW
  );
  // The Belt Feeder isn't bought: the rifle stands in; gun 2 can't be the same as gun 1 anyway
  assert.deepEqual(s.inventory.guns, ['rifle', null]);
  // The briefcase is premium and not bought
  assert.equal(s.inventory.held, null);
  assert.deepEqual(s.inventory.items, { snack: ITEM_MAX });
  const t = cleanSave({ v: 11, armoury: { owned: ['burst'] }, wardrobe: ['briefcase'], inventory: { guns: ['burst', 'rifle'], held: 'briefcase', items: { snack: 2.7 } } }, NOW);
  assert.deepEqual(t.inventory, { guns: ['burst', 'rifle'], held: 'briefcase', items: { snack: 2 } });
  assert.deepEqual(cleanInventory('junk', { armoury: { owned: [], mods: {} }, wardrobe: [] }).guns, ['rifle', null]);
});

test('the loadout: guns he may carry, never one twice; gun 2 can be left empty', () => {
  const s = rich();
  assert.equal(setLoadout(s, ['lmg', null]).ok, false, 'not bought');
  assert.equal(buyGun(s, 'lmg').ok, true);
  assert.equal(setLoadout(s, ['lmg', 'lmg']).ok, false);
  assert.equal(setLoadout(s, ['lmg', 'rifle']).ok, true);
  assert.deepEqual(s.inventory.guns, ['lmg', 'rifle']);
  // A starter his score hasn't unlocked (the browser's combat profile says so)
  assert.equal(setLoadout(s, ['rifle', 'dmr'], (id) => id !== 'dmr').ok, false);
  assert.deepEqual(s.inventory.guns, ['lmg', 'rifle']);
  assert.equal(setLoadout(s, ['rifle', null]).ok, true);
  assert.deepEqual(s.inventory.guns, ['rifle', null]);
});

test('carrying a gun in a slot: one already in the other slot trades places', () => {
  const s = rich();
  buyGun(s, 'revolver');
  assert.equal(carryGun(s, 1, 'revolver').ok, true);
  assert.deepEqual(s.inventory.guns, ['rifle', 'revolver']);
  assert.equal(carryGun(s, 0, 'revolver').ok, true);
  assert.deepEqual(s.inventory.guns, ['revolver', 'rifle']);
  assert.equal(carryGun(s, 1, 'revolver').ok, true);
  assert.deepEqual(s.inventory.guns, ['rifle', 'revolver']);
  assert.equal(carryGun(s, 1, null).ok, true);
  assert.deepEqual(s.inventory.guns, ['rifle', null]);
  // Gun 1 is never empty
  assert.equal(carryGun(s, 0, null).ok, false);
  assert.equal(carryGun(s, 1, 'rifle').ok, false);
});

test('the hotbar: fists, the two gun slots, the thing in his hand, then the consumables he has', () => {
  const s = rich();
  assert.deepEqual(slots(s).map(slotKey), ['fists', 'gun0', 'gun1']);
  assert.ok(setHeld(s, 'coffee'));
  assert.equal(setHeld(s, 'coffee'), false, 'no change');
  s.inventory.items.snack = 3;
  const sl = slots(s);
  assert.deepEqual(sl.map(slotKey), ['fists', 'gun0', 'gun1', 'held', 'item:snack']);
  assert.ok(sl.length <= SLOTS_MAX);
  assert.deepEqual(pickSlot(sl[0]), { do: 'fists' });
  assert.deepEqual(pickSlot(sl[1]), { do: 'draw', weapon: 'rifle' });
  assert.deepEqual(pickSlot(sl[2]), { do: 'empty' });
  assert.deepEqual(pickSlot(sl[3]), { do: 'held', held: 'coffee' });
  assert.deepEqual(pickSlot(sl[4]), { do: 'use', item: 'snack' });
  assert.equal(pickSlot(sl[9]), null);
  // A premium thing in the hand needs buying first
  assert.equal(setHeld(s, 'phone'), true);
  assert.equal(s.inventory.held, null);
});

test('stepping goes round the fists and the guns carried', () => {
  const s = rich();
  assert.equal(stepKey(s, 'fists', 1), 'gun0');
  assert.equal(stepKey(s, 'gun0', 1), 'fists', 'one gun: back to the fists');
  buyGun(s, 'burst');
  setLoadout(s, ['rifle', 'burst']);
  assert.equal(stepKey(s, 'gun0', 1), 'gun1');
  assert.equal(stepKey(s, 'gun1', 1), 'fists');
  assert.equal(stepKey(s, 'fists', -1), 'gun1');
  assert.equal(stepKey(s, 'held', 1), 'gun0');
  assert.equal(stepKey(s, 'held', -1), 'gun1');
});

test('snacks: bought for Dorras at a level, ITEM_MAX at most, booked in the ledger; used only in a spar', () => {
  const s = newSave(NOW);
  s.dorras = ITEM_CATALOG.snack.price * 10;
  for (let i = 0; i < ITEM_MAX; i++) assert.equal(buyItem(s, 'snack').ok, true);
  const r = buyItem(s, 'snack');
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.why, 'max');
  assert.equal(s.inventory.items.snack, ITEM_MAX);
  assert.equal(s.dorras, ITEM_CATALOG.snack.price * (10 - ITEM_MAX));
  assert.equal(s.ledger.totals.items, ITEM_CATALOG.snack.price * ITEM_MAX);
  // (not things bought for the missions: three snacks aren't the Fleet mission's three buys)
  assert.equal(s.counters.bought, 0);
  // Outside a spar nothing is used up
  assert.equal(useItem(s, 'snack', false).ok, false);
  assert.equal(s.inventory.items.snack, ITEM_MAX);
  assert.equal(useItem(s, 'snack', true).ok, true);
  assert.equal(s.inventory.items.snack, ITEM_MAX - 1);
  const poor = newSave(NOW);
  poor.dorras = 0;
  const p = buyItem(poor, 'snack');
  assert.equal(!p.ok && p.why, 'money');
  assert.equal(useItem(poor, 'snack', true).ok, false);
});

test('snacks are sold at every diner downtown and every Night Market stall, each spot standing clear', () => {
  const diners = INFILL.filter((f) => f.type === 'diner');
  assert.ok(diners.length >= 1);
  assert.equal(SNACK_BARS.length, diners.length + STALLS.length);
  assert.equal(new Set(SNACK_BARS.map((b) => b.id)).size, SNACK_BARS.length);
  for (const b of SNACK_BARS) {
    // Nobody stands inside anything solid to buy one
    const hit = SOLID_GRID.near(b.x, b.z, 0.2).some(([x0, z0, x1, z1]) => b.x > x0 - 0.2 && b.x < x1 + 0.2 && b.z > z0 - 0.2 && b.z < z1 + 0.2);
    assert.ok(!hit, `${b.name} at ${b.x.toFixed(2)}, ${b.z.toFixed(2)}`);
    assert.ok(b.name && !/[^A-Za-z '&]/.test(b.name), b.name);
  }
  // A diner's spot is just ahead of its front
  for (const [i, f] of diners.entries()) {
    const b = SNACK_BARS[i];
    const [x0, z0, x1, z1] = bodyOf(f);
    const outside = b.x < x0 || b.x > x1 || b.z < z0 || b.z > z1;
    assert.ok(outside, `diner ${i} spot outside its building`);
  }
});

test('the sim swaps only within the loadout, and putting a gun back swaps it out', () => {
  const sim = createSim({ ground: 0.15, rayWorld: () => 200 });
  const p = sim.addPlayer('me');
  sim.setKit('me', ['rifle', 'burst']);
  sim.equip('me', 'rifle');
  assert.equal(sim.swap('me', 'smg'), false);
  assert.equal(sim.swap('me', 'burst'), true);
  p.mag = 3;
  sim.swap('me', 'rifle');
  assert.deepEqual(p.stash.burst, [3, p.stash.burst![1]]);
  // The Tri-Tap goes back in the locker: its ammo is dropped, and the gun in hand carries on
  sim.setKit('me', ['rifle', 'smg']);
  assert.equal(p.stash.burst, undefined);
  assert.equal(p.weapon, 'rifle');
  // The gun in hand isn't carried any more: swapped for the first that is
  sim.drain();
  sim.setKit('me', ['lmg']);
  assert.equal(p.weapon, 'lmg');
  assert.ok(sim.drain().some((e) => e.type === 'swap'));
  assert.ok(p.armed);
  // No loadout at all (an old client): any gun
  sim.setKit('me', []);
  assert.equal(sim.swap('me', 'dmr'), true);
});

test('a loadout on the wire: two known guns at most, never one twice', () => {
  assert.deepEqual(cleanKit(['rifle', 'burst', 'lmg']), ['rifle', 'burst']);
  assert.deepEqual(cleanKit(['rifle', 'rifle']), ['rifle']);
  assert.deepEqual(cleanKit(['laser', 'smg']), ['smg']);
  assert.equal(cleanKit('rifle'), null);
  assert.equal(cleanKit([]), null);
  assert.equal(cleanKit([7]), null);
});
