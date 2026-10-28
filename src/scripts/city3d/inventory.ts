/*
 * The inventory (docs/inventory-plan.md, Phase 1): what Degen carries, kept
 * free of the DOM and of scene code like the rest of the city's game.
 *
 * - The save's `inventory` (save v11): his two weapon slots (either may be
 *   empty), the thing in his hand (the look's `held`, kept in step with it
 *   by the view), his consumables (the snack first) and the grid's order.
 * - The grid (Tab, the owner's call): 4 x 4 spaces holding everything he
 *   carries that isn't in a weapon slot (`carried()`, `layout()`): his other
 *   guns, the things for his hand, his consumables stacked. Things are
 *   moved round it (`moveCell()`), guns into a weapon slot (`equipCell()`)
 *   and back (`unequip()`), anywhere.
 * - The hotbar's slots, in his order: weapon slots 1 and 2 (an empty slot
 *   while there's none), the thing in his hand, then the consumables he
 *   has. 1-7 pick them (the gun out again puts it away: empty hands are his
 *   fists); X, the wheel, the touch Swap button and the d-pad step through
 *   the weapons and empty hands.
 * - Ammo stays free (every gun comes full, the counter refills all) and no
 *   counter is needed to draw or change the weapons.
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
import { HELD, type Held } from '../net/profile-data';
import { ownsGun, pay, type BuyResult, type TycoonSave } from './tycoon';
import { INFILL, SIGNS, bodyOf } from './downtown';
import { STALLS } from './nightmarket';

// The save's side (the boot's): its shape and cleaning, the hand kept in step with the look, where snacks are sold
import { GRID_SIZE, heldOk } from './inventory-save';
export { GRID_COLS, GRID_SIZE, cleanInventory, emptyInventory, setHeld, type Inventory } from './inventory-save';

/* ---------- The hotbar ---------- */

export type Slot =
  | { kind: 'gun'; i: 0 | 1; weapon: WeaponId | null }
  | { kind: 'held'; held: Held }
  | { kind: 'item'; item: ItemId; n: number };
/** The most slots a hotbar holds (1-7) */
export const SLOTS_MAX = 7;
/** The hotbar in his order: weapon slots 1 and 2 (empty or not), the thing in his hand, the consumables he has */
export function slots(s: Pick<TycoonSave, 'inventory'>): Slot[] {
  const inv = s.inventory;
  const out: Slot[] = [{ kind: 'gun', i: 0, weapon: inv.guns[0] }, { kind: 'gun', i: 1, weapon: inv.guns[1] }];
  if (inv.held) out.push({ kind: 'held', held: inv.held });
  for (const id of ITEM_IDS) {
    const n = inv.items[id] ?? 0;
    if (n > 0) out.push({ kind: 'item', item: id, n });
  }
  return out.slice(0, SLOTS_MAX);
}
/** A slot's key, the same while it's the same thing (the view compares them); 'hands' is nothing out (his fists) */
export const slotKey = (x: Slot) => (x.kind === 'gun' ? `gun${x.i}` : x.kind === 'held' ? 'held' : `item:${x.item}`);

/** What picking a slot does */
export type SlotAction =
  /** Draw this gun (anywhere: no counter needed), or put it away if it's the one out */
  | { do: 'draw'; weapon: WeaponId }
  /** An empty weapon slot: say how to fill it */
  | { do: 'empty' }
  /** Take the thing in his hand out (the gun goes away), or put it away if it's out */
  | { do: 'held'; held: Held }
  /** Use a consumable */
  | { do: 'use'; item: ItemId };
export function pickSlot(x: Slot | undefined): SlotAction | null {
  if (!x) return null;
  if (x.kind === 'gun') return x.weapon ? { do: 'draw', weapon: x.weapon } : { do: 'empty' };
  if (x.kind === 'held') return { do: 'held', held: x.held };
  return { do: 'use', item: x.item };
}

/**
 * X, the wheel, the touch Swap button and the d-pad: the next (or previous) of the
 * weapons he carries and his empty hands (his fists) from `at`, round and round.
 */
export function stepKey(s: Pick<TycoonSave, 'inventory'>, at: string, dir: 1 | -1) {
  const g = s.inventory.guns;
  const ring = [...(g[0] ? ['gun0'] : []), ...(g[1] ? ['gun1'] : []), 'hands'];
  const i = ring.indexOf(at);
  // (from the thing in his hand or a consumable: forward is the first weapon, back the last)
  if (i < 0) return dir > 0 ? ring[0] : ring[Math.max(0, ring.length - 2)];
  return ring[(i + dir + ring.length) % ring.length];
}

/* ---------- The grid (Tab): everything he carries ---------- */

export type GridKey = string;
export const gunKey = (w: WeaponId) => `gun:${w}`;
export const heldKey = (h: Held) => `held:${h}`;
export const itemKey = (id: ItemId) => `item:${id}`;
/** What a grid key stands for */
export function parseKey(k: GridKey): { kind: 'gun'; weapon: WeaponId } | { kind: 'held'; held: Held } | { kind: 'item'; item: ItemId } | null {
  const [kind, id] = k.split(':');
  if (kind === 'gun' && (GUN_IDS as string[]).includes(id)) return { kind, weapon: id as WeaponId };
  if (kind === 'held' && (HELD as string[]).includes(id)) return { kind, held: id as Held };
  if (kind === 'item' && (ITEM_IDS as string[]).includes(id)) return { kind, item: id as ItemId };
  return null;
}
/**
 * Everything he carries that goes in the grid: the guns he owns and may carry (`may`: the
 * starters unlock with score) that aren't in a weapon slot, the things for his hand he owns,
 * and the consumables he has (a kind to a space, stacked). Never more than GRID_SIZE today.
 */
export function carried(s: TycoonSave, may: (id: WeaponId) => boolean = (id) => ownsGun(s, id)): GridKey[] {
  const g = s.inventory.guns;
  return [
    ...GUN_IDS.filter((w) => ownsGun(s, w) && may(w) && !g.includes(w)).map(gunKey),
    ...HELD.filter((h) => heldOk(s, h)).map(heldKey),
    ...ITEM_IDS.filter((id) => (s.inventory.items[id] ?? 0) > 0).map(itemKey),
  ];
}
/** The grid's GRID_SIZE spaces: what he carries where he put it, anything new in the first free spaces */
export function layout(s: TycoonSave, may?: (id: WeaponId) => boolean): GridKey[] {
  const have = carried(s, may);
  const cells: GridKey[] = Array.from({ length: GRID_SIZE }, (_, i) => {
    const k = s.inventory.grid[i] ?? '';
    return have.includes(k) ? k : '';
  });
  // (a key saved twice keeps its first space)
  cells.forEach((k, i) => {
    if (k && cells.indexOf(k) !== i) cells[i] = '';
  });
  for (const k of have) {
    if (cells.includes(k)) continue;
    const free = cells.indexOf('');
    if (free < 0) break;
    cells[free] = k;
  }
  return cells;
}
/** Write the layout back to the save (before moving things round in it) */
function settle(s: TycoonSave, may?: (id: WeaponId) => boolean) {
  s.inventory.grid = layout(s, may);
  return s.inventory.grid;
}
const inGrid = (i: number) => Number.isInteger(i) && i >= 0 && i < GRID_SIZE;
/** Drag one space onto another: what's in them trades places */
export function moveCell(s: TycoonSave, from: number, to: number, may?: (id: WeaponId) => boolean): InvResult {
  if (!inGrid(from) || !inGrid(to)) return { ok: false, why: 'place' };
  const cells = settle(s, may);
  if (!cells[from]) return { ok: false, why: 'stock' };
  [cells[from], cells[to]] = [cells[to], cells[from]];
  return { ok: true };
}
/** A gun from the grid into a weapon slot: whatever was in the slot takes its space */
export function equipCell(s: TycoonSave, cell: number, slot: 0 | 1, may?: (id: WeaponId) => boolean): InvResult {
  if (!inGrid(cell) || (slot !== 0 && slot !== 1)) return { ok: false, why: 'place' };
  const cells = settle(s, may);
  const it = parseKey(cells[cell]);
  if (it?.kind !== 'gun') return { ok: false, why: 'place' };
  const old = s.inventory.guns[slot];
  s.inventory.guns[slot] = it.weapon;
  cells[cell] = old ? gunKey(old) : '';
  return { ok: true };
}
/**
 * A gun out of a weapon slot back into the grid: into `cell` if it's free (a gun there
 * trades places with it), or the first free space; 'room' when the grid is full.
 */
export function unequip(s: TycoonSave, slot: 0 | 1, cell?: number, may?: (id: WeaponId) => boolean): InvResult {
  const w = s.inventory.guns[slot];
  if (!w) return { ok: false, why: 'stock' };
  const cells = settle(s, may);
  if (cell !== undefined && inGrid(cell) && cells[cell]) {
    const there = parseKey(cells[cell]);
    if (there?.kind !== 'gun') return { ok: false, why: 'room' };
    s.inventory.guns[slot] = there.weapon;
    cells[cell] = gunKey(w);
    return { ok: true };
  }
  const to = cell !== undefined && inGrid(cell) ? cell : cells.indexOf('');
  if (to < 0) return { ok: false, why: 'room' };
  s.inventory.guns[slot] = null;
  cells[to] = gunKey(w);
  return { ok: true };
}
/** Drag one weapon slot onto the other: they trade guns */
export function swapSlots(s: TycoonSave) {
  const g = s.inventory.guns;
  s.inventory.guns = [g[1], g[0]];
}

/* ---------- Changing it ---------- */

export type InvResult = { ok: true } | { ok: false; why: 'owned' | 'place' | 'max' | 'money' | 'level' | 'stock' | 'room' };

/**
 * The two weapon slots at once: guns he may carry (`may`: owned, and for the starters
 * unlocked by score, which the browser's combat profile knows), never the same one twice;
 * either may be empty.
 */
export function setLoadout(s: TycoonSave, guns: [WeaponId | null, WeaponId | null], may: (id: WeaponId) => boolean = (id) => ownsGun(s, id)): InvResult {
  if (guns.some((w) => w !== null && (!GUN_IDS.includes(w) || !may(w)))) return { ok: false, why: 'place' };
  if (guns[0] && guns[0] === guns[1]) return { ok: false, why: 'owned' };
  s.inventory.guns = [guns[0], guns[1]];
  return { ok: true };
}
/** Put a gun in one weapon slot (null empties it); one already in the other slot trades places with what was here */
export function carryGun(s: TycoonSave, i: 0 | 1, weapon: WeaponId | null, may?: (id: WeaponId) => boolean): InvResult {
  const g: [WeaponId | null, WeaponId | null] = [...s.inventory.guns];
  const o = i === 0 ? 1 : 0;
  if (weapon && g[o] === weapon) g[o] = g[i];
  g[i] = weapon;
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
