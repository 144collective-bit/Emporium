// The inventory (inventory.ts, docs/inventory-plan.md): the save's two weapon slots (either may be empty:
// empty hands are his fists), the thing in his hand, his consumables and the 4 x 4 grid's order; the
// hotbar's slots and steps; dragging round the grid and in and out of the weapon slots; snacks bought
// at the diners and the Night Market; the sim swapping only within the weapon slots; them on the wire;
// free play off everywhere but a test build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GUN_CATALOG, ITEM_CATALOG, ITEM_MAX, PLOT_DORRAS } from '../src/scripts/city3d/catalog';
import { addXp, buyGun, buyWardrobe, cleanSave, newSave, pay } from '../src/scripts/city3d/tycoon';
import {
  GRID_SIZE,
  SLOTS_MAX,
  SNACK_BARS,
  buyItem,
  carried,
  carryGun,
  cleanInventory,
  equipCell,
  layout,
  moveCell,
  pickSlot,
  setHeld,
  setLoadout,
  slotKey,
  slots,
  stepKey,
  swapSlots,
  unequip,
  useItem,
} from '../src/scripts/city3d/inventory';
import { WEAPONS, createSim } from '../src/scripts/city3d/combat-sim';
import { FREE_PLAY } from '../src/scripts/city3d/freeplay';
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

test('a new save carries the rifle in weapon slot 1 and nothing else', () => {
  const s = newSave(NOW);
  assert.deepEqual(s.inventory, { guns: ['rifle', null], held: null, items: {}, grid: [] });
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

test('a loaded inventory is cleaned: owned guns, no gun twice, a bought thing in the hand, counts in range, known keys', () => {
  const s = cleanSave(
    { v: 11, armoury: { owned: ['burst'] }, wardrobe: [], inventory: { guns: ['lmg', 'lmg'], held: 'briefcase', items: { snack: 99, laser: 3 }, grid: ['gun:burst', 'junk', 7, 'item:snack'] } },
    NOW
  );
  // The Belt Feeder isn't bought: the rifle stands in; slot 2 can't be the same as slot 1 anyway
  assert.deepEqual(s.inventory.guns, ['rifle', null]);
  // The briefcase is premium and not bought
  assert.equal(s.inventory.held, null);
  assert.deepEqual(s.inventory.items, { snack: ITEM_MAX });
  assert.deepEqual(s.inventory.grid, ['gun:burst', '', '', 'item:snack']);
  const t = cleanSave({ v: 11, armoury: { owned: ['burst'] }, wardrobe: ['briefcase'], inventory: { guns: ['burst', 'rifle'], held: 'briefcase', items: { snack: 2.7 } } }, NOW);
  assert.deepEqual(t.inventory, { guns: ['burst', 'rifle'], held: 'briefcase', items: { snack: 2 }, grid: [] });
  // Both weapon slots emptied on purpose stay empty (empty hands)
  assert.deepEqual(cleanSave({ v: 11, inventory: { guns: [null, null] } }, NOW).inventory.guns, [null, null]);
  assert.deepEqual(cleanInventory('junk', { armoury: { owned: [], mods: {} }, wardrobe: [] }).guns, ['rifle', null]);
});

test('the weapon slots: guns he may carry, never one twice, either may be empty', () => {
  const s = rich();
  assert.equal(setLoadout(s, ['lmg', null]).ok, false, 'not bought');
  assert.equal(buyGun(s, 'lmg').ok, true);
  assert.equal(setLoadout(s, ['lmg', 'lmg']).ok, false);
  assert.equal(setLoadout(s, ['lmg', 'rifle']).ok, true);
  assert.deepEqual(s.inventory.guns, ['lmg', 'rifle']);
  // A starter his score hasn't unlocked (the browser's combat profile says so)
  assert.equal(setLoadout(s, ['rifle', 'dmr'], (id) => id !== 'dmr').ok, false);
  assert.deepEqual(s.inventory.guns, ['lmg', 'rifle']);
  assert.equal(setLoadout(s, [null, null]).ok, true);
  assert.deepEqual(s.inventory.guns, [null, null]);
});

test('carrying a gun in a slot (the gun store): one already in the other slot trades places', () => {
  const s = rich();
  buyGun(s, 'revolver');
  assert.equal(carryGun(s, 1, 'revolver').ok, true);
  assert.deepEqual(s.inventory.guns, ['rifle', 'revolver']);
  assert.equal(carryGun(s, 0, 'revolver').ok, true);
  assert.deepEqual(s.inventory.guns, ['revolver', 'rifle']);
  assert.equal(carryGun(s, 1, null).ok, true);
  assert.deepEqual(s.inventory.guns, ['revolver', null]);
  assert.equal(carryGun(s, 0, null).ok, true);
  assert.deepEqual(s.inventory.guns, [null, null]);
});

test('the hotbar: weapon slots 1 and 2, the thing in his hand, then the consumables he has', () => {
  const s = rich();
  assert.deepEqual(slots(s).map(slotKey), ['gun0', 'gun1']);
  assert.ok(setHeld(s, 'coffee'));
  assert.equal(setHeld(s, 'coffee'), false, 'no change');
  s.inventory.items.snack = 3;
  const sl = slots(s);
  assert.deepEqual(sl.map(slotKey), ['gun0', 'gun1', 'held', 'item:snack']);
  assert.ok(sl.length <= SLOTS_MAX);
  assert.deepEqual(pickSlot(sl[0]), { do: 'draw', weapon: 'rifle' });
  assert.deepEqual(pickSlot(sl[1]), { do: 'empty' });
  assert.deepEqual(pickSlot(sl[2]), { do: 'held', held: 'coffee' });
  assert.deepEqual(pickSlot(sl[3]), { do: 'use', item: 'snack' });
  assert.equal(pickSlot(sl[9]), null);
  // A premium thing in the hand needs buying first
  assert.equal(setHeld(s, 'phone'), true);
  assert.equal(s.inventory.held, null);
});

test('stepping goes round the weapons carried and empty hands (his fists)', () => {
  const s = rich();
  assert.equal(stepKey(s, 'hands', 1), 'gun0');
  assert.equal(stepKey(s, 'gun0', 1), 'hands', 'one gun: back to empty hands');
  buyGun(s, 'burst');
  setLoadout(s, ['rifle', 'burst']);
  assert.equal(stepKey(s, 'gun0', 1), 'gun1');
  assert.equal(stepKey(s, 'gun1', 1), 'hands');
  assert.equal(stepKey(s, 'hands', -1), 'gun1');
  assert.equal(stepKey(s, 'held', 1), 'gun0');
  assert.equal(stepKey(s, 'held', -1), 'gun1');
  // Only slot 2 filled
  setLoadout(s, [null, 'burst']);
  assert.equal(stepKey(s, 'hands', 1), 'gun1');
  setLoadout(s, [null, null]);
  assert.equal(stepKey(s, 'hands', 1), 'hands');
});

test('the grid: everything he carries outside the weapon slots, where he put it, never more than 16', () => {
  const s = rich();
  for (const id of ['revolver', 'burst', 'lmg'] as const) buyGun(s, id);
  for (const id of ['phone', 'briefcase']) buyWardrobe(s, id);
  s.inventory.items.snack = 2;
  // Every gun (the starters unlocked), every thing for his hand, the snacks: well under 16
  const all = carried(s, () => true);
  assert.ok(all.length <= GRID_SIZE, `${all.length} things`);
  assert.ok(!all.includes('gun:rifle'), 'the rifle is in weapon slot 1');
  assert.ok(all.includes('gun:lmg') && all.includes('held:coffee') && all.includes('held:phone') && all.includes('item:snack'));
  // The starters his score hasn't unlocked aren't carried
  assert.ok(!carried(s, (id) => WEAPONS[id].need === 0 || GUN_CATALOG[id].price > 0).includes('gun:dmr'));
  const cells = layout(s);
  assert.equal(cells.length, GRID_SIZE);
  assert.deepEqual(cells.filter(Boolean).sort(), carried(s).sort());
  // Moved: it stays where it was put, and what was there trades places
  const from = cells.indexOf('gun:lmg');
  assert.equal(moveCell(s, from, 15).ok, true);
  assert.equal(layout(s)[15], 'gun:lmg');
  assert.equal(layout(s)[from], cells[15]);
  assert.equal(moveCell(s, 3, 99).ok, false);
});

test('dragging guns in and out of the weapon slots, anywhere', () => {
  const s = rich();
  buyGun(s, 'lmg');
  const at = (k: string) => layout(s).indexOf(k);
  // The Belt Feeder into slot 2 (empty): its space empties
  const lmg = at('gun:lmg');
  assert.equal(equipCell(s, lmg, 1).ok, true);
  assert.deepEqual(s.inventory.guns, ['rifle', 'lmg']);
  assert.equal(layout(s)[lmg], '');
  // A snack can't go in a weapon slot
  s.inventory.items.snack = 1;
  assert.equal(equipCell(s, at('item:snack'), 0).ok, false);
  // The SMG into slot 1: the rifle takes its space
  const smg = at('gun:smg');
  assert.equal(equipCell(s, smg, 0).ok, true);
  assert.deepEqual(s.inventory.guns, ['smg', 'lmg']);
  assert.equal(layout(s)[smg], 'gun:rifle');
  // Slot 2 back into the bag on an empty space, then slot 1 onto the rifle's space: they trade
  assert.equal(unequip(s, 1, 15).ok, true);
  assert.deepEqual(s.inventory.guns, ['smg', null]);
  assert.equal(layout(s)[15], 'gun:lmg');
  assert.equal(unequip(s, 0, smg).ok, true);
  assert.deepEqual(s.inventory.guns, ['rifle', null]);
  assert.equal(layout(s)[smg], 'gun:smg');
  // Onto a snack: no room there
  const r = unequip(s, 0, at('item:snack'));
  assert.equal(!r.ok && r.why, 'room');
  // Back in the bag anywhere: the first free space; both slots empty is empty hands
  assert.equal(unequip(s, 0).ok, true);
  assert.deepEqual(s.inventory.guns, [null, null]);
  assert.equal(unequip(s, 0).ok, false, 'nothing there');
  // The slots trade guns
  setLoadout(s, ['rifle', 'smg']);
  swapSlots(s);
  assert.deepEqual(s.inventory.guns, ['smg', 'rifle']);
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

test('the sim swaps only within the weapon slots; a gun put back swaps out, none left puts it away', () => {
  const sim = createSim({ ground: 0.15, rayWorld: () => 200 });
  const p = sim.addPlayer('me');
  sim.setKit('me', ['rifle', 'burst']);
  sim.equip('me', 'rifle');
  assert.equal(sim.swap('me', 'smg'), false);
  assert.equal(sim.swap('me', 'burst'), true);
  p.mag = 3;
  sim.swap('me', 'rifle');
  assert.deepEqual(p.stash.burst, [3, p.stash.burst![1]]);
  // The Tri-Tap goes back in the bag: its ammo is dropped, and the gun in hand carries on
  sim.setKit('me', ['rifle', 'smg']);
  assert.equal(p.stash.burst, undefined);
  assert.equal(p.weapon, 'rifle');
  // The gun in hand isn't carried any more: swapped for the first that is
  sim.drain();
  sim.setKit('me', ['lmg']);
  assert.equal(p.weapon, 'lmg');
  assert.ok(sim.drain().some((e) => e.type === 'swap'));
  assert.ok(p.armed);
  // Both slots empty: put away, and nothing to swap to
  sim.setKit('me', []);
  assert.equal(p.armed, false);
  assert.equal(sim.swap('me', 'dmr'), false);
  // No weapon slots at all (an old client): any gun
  p.kit = null;
  assert.equal(sim.swap('me', 'dmr'), true);
});

test('weapon slots on the wire: two known guns at most, never one twice, none for empty hands', () => {
  assert.deepEqual(cleanKit(['rifle', 'burst', 'lmg']), ['rifle', 'burst']);
  assert.deepEqual(cleanKit(['rifle', 'rifle']), ['rifle']);
  assert.deepEqual(cleanKit(['laser', 'smg']), ['smg']);
  assert.equal(cleanKit('rifle'), null);
  assert.deepEqual(cleanKit([]), []);
  assert.deepEqual(cleanKit([7]), []);
});

test('free play is off in the tests, the server and the live build: the real prices and levels hold', () => {
  assert.equal(FREE_PLAY, false);
  assert.ok(GUN_CATALOG.lmg.price > 0 && GUN_CATALOG.lmg.level > 1);
  assert.ok(PLOT_DORRAS > 0 && ITEM_CATALOG.snack.price > 0 && WEAPONS.dmr.need > 0);
  const s = newSave(NOW);
  s.dorras = 0;
  assert.equal(pay(s, 100, 1, 'gear').ok, false);
});
