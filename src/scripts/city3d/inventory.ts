/*
 * The inventory (docs/inventory-plan.md, Phase 1): what Degen carries, kept
 * free of the DOM and of scene code like the rest of the city's game.
 *
 * - The save's `inventory` (save v11): his loadout of two guns (picked at the
 *   Armoury's counter or Trench Arms' hatch from the guns he owns; the rest
 *   wait in the locker there), the thing in his hand (the look's `held`,
 *   kept in step with it by the view) and his consumables (the snack first).
 * - The hotbar's slots, in his order: fists (always slot 1), gun 1, gun 2
 *   (an empty slot while there's none), the thing in his hand, then the
 *   consumables he has. 1-7 pick them; X, the wheel, the touch Swap button
 *   and the d-pad step through the fists and the guns.
 * - Ammo stays free (every gun comes full, the counter refills all) and no
 *   counter is needed to draw a gun in the loadout.
 * - Snacks are sold at the diners downtown and the Night Market's stalls
 *   (`SNACK_BARS`) for Dorras, `ITEM_MAX` at most; they restore health in a
 *   spar (Phase 3), so using one anywhere else does nothing yet.
 *
 * The save's side (its shape and cleaning, the hand) is inventory-save.ts, which the boot needs; this file loads with the
 * hotbar and the gun store. Nothing here is real money or tied to the token
 * or the store.
 */
import { GUN_IDS, ITEM_CATALOG, ITEM_IDS, ITEM_MAX, type ItemId } from './catalog';
import type { WeaponId } from './combat-sim';
import type { Held } from '../net/profile-data';
import { ownsGun, pay, type BuyResult, type TycoonSave } from './tycoon';
import { INFILL, SIGNS, bodyOf } from './downtown';
import { STALLS } from './nightmarket';

// The save's side (the boot's): its shape and cleaning, the hand kept in step with the look, where snacks are sold
export { cleanInventory, emptyInventory, setHeld, type Inventory } from './inventory-save';

/* ---------- The hotbar ---------- */

export type Slot =
  | { kind: 'fists' }
  | { kind: 'gun'; i: 0 | 1; weapon: WeaponId | null }
  | { kind: 'held'; held: Held }
  | { kind: 'item'; item: ItemId; n: number };
/** The most slots a hotbar holds (1-7) */
export const SLOTS_MAX = 7;
/** The hotbar in his order: fists, gun 1, gun 2 (empty or not), the thing in his hand, the consumables he has */
export function slots(s: Pick<TycoonSave, 'inventory'>): Slot[] {
  const inv = s.inventory;
  const out: Slot[] = [{ kind: 'fists' }, { kind: 'gun', i: 0, weapon: inv.guns[0] }, { kind: 'gun', i: 1, weapon: inv.guns[1] }];
  if (inv.held) out.push({ kind: 'held', held: inv.held });
  for (const id of ITEM_IDS) {
    const n = inv.items[id] ?? 0;
    if (n > 0) out.push({ kind: 'item', item: id, n });
  }
  return out.slice(0, SLOTS_MAX);
}
/** A slot's key, the same while it's the same thing (the view compares them) */
export const slotKey = (x: Slot) => (x.kind === 'gun' ? `gun${x.i}` : x.kind === 'held' ? 'held' : x.kind === 'item' ? `item:${x.item}` : 'fists');

/** What picking a slot does */
export type SlotAction =
  /** Holster the gun, hands free (the guard comes with fists on the street, Phase 2) */
  | { do: 'fists' }
  /** Draw this gun (anywhere: no counter needed) */
  | { do: 'draw'; weapon: WeaponId }
  /** An empty gun slot: say where to fill it */
  | { do: 'empty' }
  /** Holster the gun and take the thing in his hand out */
  | { do: 'held'; held: Held }
  /** Use a consumable */
  | { do: 'use'; item: ItemId };
export function pickSlot(x: Slot | undefined): SlotAction | null {
  if (!x) return null;
  if (x.kind === 'fists') return { do: 'fists' };
  if (x.kind === 'gun') return x.weapon ? { do: 'draw', weapon: x.weapon } : { do: 'empty' };
  if (x.kind === 'held') return { do: 'held', held: x.held };
  return { do: 'use', item: x.item };
}

/**
 * X, the wheel, the touch Swap button and the d-pad: the next (or previous) of
 * the fists and the guns he carries from `at` (a slot key), round and round.
 */
export function stepKey(s: Pick<TycoonSave, 'inventory'>, at: string, dir: 1 | -1) {
  const ring = ['fists', 'gun0', ...(s.inventory.guns[1] ? ['gun1'] : [])];
  const i = ring.indexOf(at);
  // (from the thing in his hand or a consumable, a step forward is the first gun, back the last)
  if (i < 0) return dir > 0 ? 'gun0' : ring[ring.length - 1];
  return ring[(i + dir + ring.length) % ring.length];
}

/* ---------- Changing it ---------- */

export type InvResult = { ok: true } | { ok: false; why: 'owned' | 'place' | 'max' | 'money' | 'level' | 'stock' };

/**
 * The loadout, picked at a gun store's counter: guns he may carry (`may`: owned,
 * and for the starters unlocked by score, which the browser's combat profile
 * knows), never the same one twice. Gun 2 may be left empty.
 */
export function setLoadout(s: TycoonSave, guns: [WeaponId, WeaponId | null], may: (id: WeaponId) => boolean = (id) => ownsGun(s, id)): InvResult {
  const [a, b] = guns;
  if (!GUN_IDS.includes(a) || !may(a) || (b !== null && (!GUN_IDS.includes(b) || !may(b)))) return { ok: false, why: 'place' };
  if (a === b) return { ok: false, why: 'owned' };
  s.inventory.guns = [a, b];
  return { ok: true };
}
/** Put a gun in one of the two loadout slots; one already in the other slot trades places with what was here */
export function carryGun(s: TycoonSave, i: 0 | 1, weapon: WeaponId | null, may?: (id: WeaponId) => boolean): InvResult {
  const g: [WeaponId, WeaponId | null] = [...s.inventory.guns];
  if (i === 0) {
    if (!weapon) return { ok: false, why: 'place' };
    if (g[1] === weapon) g[1] = g[0];
    g[0] = weapon;
  } else {
    if (weapon && g[0] === weapon) {
      // Gun 1 can't be left empty: the two trade places
      if (!g[1]) return { ok: false, why: 'owned' };
      g[0] = g[1];
    }
    g[1] = weapon;
  }
  return setLoadout(s, g, may);
}
/** Buy one consumable (a snack at a diner or the Night Market) */
export function buyItem(s: TycoonSave, id: ItemId): BuyResult | { ok: false; why: 'max' } {
  const c = ITEM_CATALOG[id];
  if (!c) return { ok: false, why: 'place' };
  const have = s.inventory.items[id] ?? 0;
  if (have >= ITEM_MAX) return { ok: false, why: 'max' };
  const r = pay(s, c.price, c.level, 'items');
  if (!r.ok) return r;
  // (not counted as a thing bought: three snacks aren't the Fleet mission's three buys)
  s.inventory.items[id] = have + 1;
  return r;
}
/** Use one up: only in a spar (Phase 3), where a snack restores health; anywhere else nothing happens */
export function useItem(s: TycoonSave, id: ItemId, inSpar: boolean): InvResult {
  const have = s.inventory.items[id] ?? 0;
  if (have <= 0) return { ok: false, why: 'stock' };
  if (!inSpar) return { ok: false, why: 'place' };
  if (have > 1) s.inventory.items[id] = have - 1;
  else delete s.inventory.items[id];
  return { ok: true };
}

/* ---------- Where snacks are sold ---------- */

export interface SnackBar {
  id: string;
  /** Where to stand for the prompt: at the door or the counter */
  x: number;
  z: number;
  /** As the prompt says it */
  name: string;
}
const title = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
/** Ahead of a diner's door, out in its front strip (the tables are at its ends) */
const DOOR_OUT = 0.45;
/** Ahead of a stall's counter, in the queue's lane */
const COUNTER_OUT = 0.5;
/** Downtown's diners (at their doors) and the Night Market's stalls (at their counters) */
export const SNACK_BARS: SnackBar[] = [
  ...INFILL.filter((f) => f.type === 'diner').map((f, i): SnackBar => {
    const [x0, z0, x1, z1] = bodyOf(f);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const at =
      f.face === 'n' ? { x: cx, z: z0 - DOOR_OUT } : f.face === 's' ? { x: cx, z: z1 + DOOR_OUT } : f.face === 'w' ? { x: x0 - DOOR_OUT, z: cz } : { x: x1 + DOOR_OUT, z: cz };
    return { id: `diner${i}`, ...at, name: title(SIGNS[f.sign ?? 'diner'].name) };
  }),
  ...STALLS.map((st, i): SnackBar => ({ id: `market${i}`, x: (st.rect[0] + st.rect[2]) / 2, z: st.front + COUNTER_OUT, name: title(st.name) })),
];
