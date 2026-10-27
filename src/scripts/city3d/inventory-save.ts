/*
 * The save's side of the inventory (docs/inventory-plan.md; the rules are
 * inventory.ts): what the boot needs, kept apart so the hotbar's and the
 * loadout's rules load with the screens that use them.
 *
 * - `Inventory`, the save's `inventory` (v11), and `cleanInventory()`, which
 *   tycoon.ts's `cleanSave()` runs (a save from before it carries the rifle
 *   and the first gun it bought): the two weapon slots (either may be empty:
 *   then his hands are his fists), the thing in his hand, the consumables
 *   and where things sit in the 4 x 4 grid (`grid`, a key a space).
 * - `setHeld()`: the thing in his hand, kept in step with the look.
 *
 * DOM-free; nothing here is real money.
 */
import { ITEM_IDS, ITEM_MAX, STARTER_GUNS, GUN_IDS, wardrobeEntry, type ItemId } from './catalog';
import type { WeaponId } from './combat-sim';
import { HELD, type Held } from '../net/profile-data';
import type { TycoonSave } from './tycoon';

export interface Inventory {
  /** The two weapon slots (keys 1 and 2); either may be empty */
  guns: [WeaponId | null, WeaponId | null];
  /** The thing in his hand (the look's), as a slot */
  held: Held | null;
  /** Consumables and how many of each */
  items: Partial<Record<ItemId, number>>;
  /**
   * Where things sit in the grid: GRID_SIZE spaces, each the key of what's there (`gun:rifle`,
   * `held:coffee`, `item:snack`) or '' (inventory.ts's `layout()` puts anything new in a free space)
   */
  grid: string[];
}
/** The inventory's grid: 4 x 4 spaces */
export const GRID_COLS = 4;
export const GRID_SIZE = 16;
export const emptyInventory = (): Inventory => ({ guns: ['rifle', null], held: null, items: {}, grid: [] });
const KEY = /^(gun|held|item):[a-z]{1,16}$/;

/** A gun he owns: a starter, or one he bought (tycoon.ts's `ownsGun()`, without the save module) */
const owned = (s: Pick<TycoonSave, 'armoury'>, id: WeaponId) => STARTER_GUNS.includes(id) || s.armoury.owned.includes(id);
/** A premium thing in the hand (catalog.ts) is carried only once it's bought */
export const heldOk = (s: Pick<TycoonSave, 'wardrobe'>, h: Held) => !wardrobeEntry(h) || s.wardrobe.includes(h);

/**
 * The save's inventory made safe: guns he owns, never one twice (slot 1 the rifle
 * if it held anything unknown), a thing in the hand he has, whole counts up to ITEM_MAX,
 * the grid's spaces known keys or empty.
 * A save from before it (v10 and older) carries the rifle and the first gun it bought.
 */
export function cleanInventory(raw: unknown, s: Pick<TycoonSave, 'armoury' | 'wardrobe'>): Inventory {
  const own = (id: unknown): id is WeaponId => typeof id === 'string' && (GUN_IDS as string[]).includes(id) && owned(s, id as WeaponId);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    const bought = GUN_IDS.find((id) => s.armoury.owned.includes(id) && id !== 'rifle') ?? null;
    return { guns: ['rifle', bought], held: null, items: {}, grid: [] };
  }
  const o = raw as Record<string, unknown>;
  const g = Array.isArray(o.guns) ? o.guns : [];
  // (a slot left empty on purpose stays empty; anything else unknown is the rifle in slot 1)
  const first = own(g[0]) ? g[0] : g[0] === null ? null : 'rifle';
  const second = own(g[1]) && g[1] !== first ? g[1] : null;
  const held = HELD.find((h) => h === o.held && heldOk(s, h)) ?? null;
  const items: Partial<Record<ItemId, number>> = {};
  const it = o.items && typeof o.items === 'object' ? (o.items as Record<string, unknown>) : {};
  for (const id of ITEM_IDS) {
    const n = it[id];
    const k = typeof n === 'number' && Number.isFinite(n) ? Math.min(ITEM_MAX, Math.max(0, Math.floor(n))) : 0;
    if (k > 0) items[id] = k;
  }
  const grid = (Array.isArray(o.grid) ? o.grid : []).slice(0, GRID_SIZE).map((k) => (typeof k === 'string' && KEY.test(k) ? k : ''));
  return { guns: [first, second], held, items, grid };
}

/** The thing in his hand, kept in step with the look (the fitting room's Hand tab picks it) */
export function setHeld(s: TycoonSave, held: Held | null) {
  const h = held && HELD.includes(held) && heldOk(s, held) ? held : null;
  if (s.inventory.held === h) return false;
  s.inventory.held = h;
  return true;
}
