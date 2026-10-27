/*
 * The save's side of the inventory (docs/inventory-plan.md; the rules are
 * inventory.ts): what the boot needs, kept apart so the hotbar's and the
 * loadout's rules load with the screens that use them.
 *
 * - `Inventory`, the save's `inventory` (v11), and `cleanInventory()`, which
 *   tycoon.ts's `cleanSave()` runs (a save from before it carries the rifle
 *   and the first gun it bought).
 * - `setHeld()`: the thing in his hand, kept in step with the look.
 *
 * DOM-free; nothing here is real money.
 */
import { ITEM_IDS, ITEM_MAX, STARTER_GUNS, GUN_IDS, wardrobeEntry, type ItemId } from './catalog';
import type { WeaponId } from './combat-sim';
import { HELD, type Held } from '../net/profile-data';
import type { TycoonSave } from './tycoon';

export interface Inventory {
  /** The loadout: gun 1 always, gun 2 when he's picked one */
  guns: [WeaponId, WeaponId | null];
  /** The thing in his hand (the look's), as a slot */
  held: Held | null;
  /** Consumables and how many of each */
  items: Partial<Record<ItemId, number>>;
}
export const emptyInventory = (): Inventory => ({ guns: ['rifle', null], held: null, items: {} });

/** A gun he owns: a starter, or one he bought (tycoon.ts's `ownsGun()`, without the save module) */
const owned = (s: Pick<TycoonSave, 'armoury'>, id: WeaponId) => STARTER_GUNS.includes(id) || s.armoury.owned.includes(id);
/** A premium thing in the hand (catalog.ts) is carried only once it's bought */
const heldOk = (s: Pick<TycoonSave, 'wardrobe'>, h: Held) => !wardrobeEntry(h) || s.wardrobe.includes(h);

/**
 * The save's inventory made safe: guns he owns, never one twice (gun 1 the rifle
 * if it was anything else), a thing in the hand he has, whole counts up to ITEM_MAX.
 * A save from before it (v10 and older) carries the rifle and the first gun it bought.
 */
export function cleanInventory(raw: unknown, s: Pick<TycoonSave, 'armoury' | 'wardrobe'>): Inventory {
  const own = (id: unknown): id is WeaponId => typeof id === 'string' && (GUN_IDS as string[]).includes(id) && owned(s, id as WeaponId);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    const bought = GUN_IDS.find((id) => s.armoury.owned.includes(id) && id !== 'rifle') ?? null;
    return { guns: ['rifle', bought], held: null, items: {} };
  }
  const o = raw as Record<string, unknown>;
  const g = Array.isArray(o.guns) ? o.guns : [];
  const first = own(g[0]) ? g[0] : 'rifle';
  const second = own(g[1]) && g[1] !== first ? g[1] : null;
  const held = HELD.find((h) => h === o.held && heldOk(s, h)) ?? null;
  const items: Partial<Record<ItemId, number>> = {};
  const it = o.items && typeof o.items === 'object' ? (o.items as Record<string, unknown>) : {};
  for (const id of ITEM_IDS) {
    const n = it[id];
    const k = typeof n === 'number' && Number.isFinite(n) ? Math.min(ITEM_MAX, Math.max(0, Math.floor(n))) : 0;
    if (k > 0) items[id] = k;
  }
  return { guns: [first, second], held, items };
}

/** The thing in his hand, kept in step with the look (the fitting room's Hand tab picks it) */
export function setHeld(s: TycoonSave, held: Held | null) {
  const h = held && HELD.includes(held) && heldOk(s, held) ? held : null;
  if (s.inventory.held === h) return false;
  s.inventory.held = h;
  return true;
}
