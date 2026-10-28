/*
 * The inventory on screen (docs/inventory-plan.md; the rules are inventory.ts):
 *
 * - The hotbar (`[data-hotbar]` in the walk HUD): weapon slots 1 and 2, the
 *   thing in his hand and the consumables he has, the number on each, the
 *   one out lit, ammo on the guns and a count on the snack. 1-7 pick a slot
 *   (the gun out again puts it away: empty hands are his fists), X (the
 *   wheel with the mouse captured, the touch Swap button, RB and the d-pad)
 *   steps through the weapons and empty hands, a tap or a click picks.
 * - The inventory (Tab, the Bag button in the walk header, View on a
 *   gamepad; `[data-inv]`): the two weapon slots over a 4 x 4 grid of
 *   everything else he carries. The mouse is freed and Degen stands still.
 *   Drag anything (mouse or finger): round the grid, a gun onto a weapon
 *   slot (what was there takes its space), a weapon back into the grid,
 *   one slot onto the other. A tap selects and the bar under the grid says
 *   what it is with its actions (To / Swap slot 1 or 2, Draw, Back in bag, Hold,
 *   Use) and a gun's stat bars; a double tap, a double click or Enter does
 *   the first. With a mouse, hovering shows the same in a tip and a
 *   right-click does the quick move (a gun to a weapon slot, a weapon back
 *   in the bag, the rest their first action). What's dropped settles with a
 *   small bounce and the panel rises in (neither under reduced motion).
 *   Arrow keys (the d-pad) move round it; Tab, Esc or × close it.
 * - `bagHtml()`: the weapons and the grid for the business card's Bag tab
 *   (tycoon-ui.ts), read-only, with the Armoury and the Night Market as
 *   ways in from the City view.
 * - `buySnack()`: a snack bought at a diner's door or a Night Market stall
 *   (walk mode's prompts, `SNACK_BARS`).
 *
 * The hand (empty or the thing he holds out) is this view's: the save keeps
 * what he carries, not what's out.
 */
import { GUN_MODS, GUN_MOD_IDS, ITEM_CATALOG, ITEM_MAX, applyGunMods, type ItemId } from './catalog';
import { WEAPONS, type Weapon, type WeaponId } from './combat-sim';
import { ART, STATS } from './gunart';
import {
  GRID_COLS,
  GRID_SIZE,
  buyItem,
  equipCell,
  layout,
  moveCell,
  parseKey,
  pickSlot,
  slotKey,
  slots,
  stepKey,
  swapSlots,
  unequip,
  useItem,
  SNACK_BARS,
  type InvResult,
  type Slot,
} from './inventory';
import { gunMods, type TycoonSave } from './tycoon';
import { esc, fmt, repaint, whyNot, type GameDeps } from './ui';
import type { Held } from '../net/profile-data';

export const HELD_NAMES: Record<Held, string> = { coffee: 'Iced coffee', boombox: 'Boombox', phone: 'Phone', briefcase: 'Briefcase' };
/** Line icons in a 24 box (the fitting room's Hand tab draws the same) */
const HELD_ICONS: Record<Held, string> = {
  coffee: 'M7 8h10l-1.5 13h-7z M6.5 8a5.5 3 0 0 1 11 0 M13 5l2-3 M8 13h8',
  boombox: 'M3 9h18v10H3z M8 9V6h8v3 M8 14m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0 M16 14m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
  phone: 'M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z M10 18h4 M9 7l2 3 2-4 2 5',
  briefcase: 'M3 8h18v12H3z M9 8V5h6v3 M3 13h18 M11 12h2v3h-2z',
};
/** A bun with a filling */
const ITEM_ICONS: Record<ItemId, string> = { snack: 'M4 11a8 5.5 0 0 1 16 0z M3 14h18 M4 17h16a2 2 0 0 1-2 3H6a2 2 0 0 1-2-3z M9 7.5h.01 M13 6.5h.01' };

const icon = (d: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const gunArt = (id: WeaponId) => `<svg class="hb-gun" viewBox="0 0 120 40" aria-hidden="true"><path d="${ART[id]}"/></svg>`;
/** A gun's mods in a few words ("Barrel 2 · Mag 1"), or "Stock" */
function modLine(save: TycoonSave, id: WeaponId) {
  const m = gunMods(save, id);
  const on = GUN_MOD_IDS.filter((k) => m[k] > 0).map((k) => `${GUN_MODS[k].name} ${m[k]}`);
  return on.length ? on.join(' · ') : 'Stock';
}
/** A gun's first three stat bars with its mods on (damage, fire rate, range) */
function statBars(w: Weapon) {
  return `<dl class="inv-stats">${STATS.slice(0, 3)
    .map((st) => `<div><dt>${st.label}</dt><dd><i style="--v:${Math.max(0.06, st.of(w)).toFixed(3)}"></i></dd></div>`)
    .join('')}</dl>`;
}
/** The name a hotbar slot goes by */
function slotName(x: Slot) {
  if (x.kind === 'gun') return x.weapon ? WEAPONS[x.weapon].short : 'Empty';
  if (x.kind === 'held') return HELD_NAMES[x.held];
  return ITEM_CATALOG[x.item].name;
}
/** A grid key's art, name and count */
function thing(save: TycoonSave, key: string, ammo?: (id: WeaponId) => [number, number]) {
  const it = parseKey(key);
  if (!it) return null;
  if (it.kind === 'gun') {
    const w = applyGunMods(WEAPONS[it.weapon], gunMods(save, it.weapon));
    const [mag, res] = ammo?.(it.weapon) ?? [w.mag, w.reserve];
    return { art: gunArt(it.weapon), name: WEAPONS[it.weapon].name, short: WEAPONS[it.weapon].short, count: String(mag), about: `${modLine(save, it.weapon)} · ${mag} / ${res}`, stats: statBars(w), it };
  }
  if (it.kind === 'held') return { art: icon(HELD_ICONS[it.held]), name: HELD_NAMES[it.held], short: HELD_NAMES[it.held], count: '', about: 'For your hand: hold it out walking about.', it };
  const n = save.inventory.items[it.item] ?? 0;
  const c = ITEM_CATALOG[it.item];
  return { art: icon(ITEM_ICONS[it.item]), name: c.name, short: c.name, count: `×${n}`, about: `${c.blurb} ${n} of ${ITEM_MAX}; ${fmt.format(c.price)} Dorras each at ${c.where}.`, it };
}

/* ---------- The weapons and the grid (the inventory, the business card's Bag) ---------- */

export interface GridOpts {
  /** A gun's ammo as he carries it (walk mode); without it, its magazine and spare rounds */
  ammo?(id: WeaponId): [number, number];
  /** May he carry this gun (the starters unlock with score) */
  may(id: WeaponId): boolean;
  /** Buttons to drag and tap (the inventory) or a picture of it (the business card) */
  live: boolean;
  /** What's selected: a grid space (0-15) or a weapon slot (-1, -2) */
  sel?: number | null;
  /** The weapon slot whose gun is out, and whether the thing in his hand is out */
  out?: { slot: 0 | 1 | null; held: boolean };
  /** Where something was just dropped (it settles with a bounce) */
  land?: number | null;
}
/** The two weapon slots, then the 4 x 4 grid, as two strings of markup */
export function gridParts(save: TycoonSave, o: GridOpts) {
  const tag = o.live ? 'button type="button"' : 'div';
  const end = o.live ? 'button' : 'div';
  const weapons = ([0, 1] as const)
    .map((i) => {
      const w = save.inventory.guns[i];
      const t = w ? thing(save, `gun:${w}`, o.ammo) : null;
      const on = o.sel === -1 - i;
      const out = o.out?.slot === i;
      return (
        `<${tag} class="inv-slot${t ? '' : ' is-empty'}${on ? ' is-sel' : ''}${out ? ' is-out' : ''}${o.land === -1 - i ? ' is-landed' : ''}" data-slot="${i}"${o.live ? ` aria-pressed="${on}"` : ''} aria-label="Weapon slot ${i + 1}: ${t ? esc(t.name) : 'empty'}">` +
        `<span class="inv-key">${i + 1}</span>${t ? `<span class="inv-art">${t.art}</span><span class="inv-name">${esc(t.short)}</span><span class="inv-count">${t.count}</span>` : '<span class="inv-name">Empty</span>'}` +
        `${out ? '<span class="inv-badge">Out</span>' : ''}</${end}>`
      );
    })
    .join('');
  const cells = layout(save, o.may)
    .map((k, i) => {
      const t = k ? thing(save, k, o.ammo) : null;
      const on = o.sel === i;
      const out = !!t && t.it.kind === 'held' && o.out?.held && save.inventory.held === t.it.held;
      return (
        `<${tag} class="inv-cell${t ? '' : ' is-empty'}${on ? ' is-sel' : ''}${out ? ' is-out' : ''}${o.land === i ? ' is-landed' : ''}" data-cell="${i}"${o.live ? ` aria-pressed="${on}"` : ''} aria-label="${t ? esc(t.name) : `Space ${i + 1}: empty`}">` +
        (t ? `<span class="inv-art">${t.art}</span><span class="inv-name">${esc(t.short)}</span>${t.count ? `<span class="inv-count">${t.count}</span>` : ''}${out ? '<span class="inv-badge">Out</span>' : ''}` : '') +
        `</${end}>`
      );
    })
    .join('');
  return { weapons, cells };
}
/** The business card's Bag tab: the weapons and the grid, read-only, and the ways in */
export function bagHtml(save: TycoonSave, o: { may(id: WeaponId): boolean; ways?: boolean }) {
  const { weapons, cells } = gridParts(save, { may: o.may, live: false });
  const ways = o.ways
    ? `<div class="city-panel-actions bag-ways"><button type="button" class="chip-link" data-bag-go="plan">The Armoury</button><button type="button" class="chip-link" data-bag-go="nightmarket">The Night Market</button></div>`
    : '';
  return (
    `<p class="bag-head">Weapons</p><div class="inv-weapons is-card">${weapons}</div>` +
    `<p class="bag-head">Your bag</p><div class="inv-grid is-card">${cells}</div>` +
    `<p class="walk-pad">Walking, press Tab (or the Bag button) to move things round, put guns in the weapon slots and use what you carry. Ammo is free: every gun comes full.</p>${ways}`
  );
}

/** Use a consumable from the inventory or the hotbar: only in a spar (Phase 3), so for now it says so */
function useOne(game: GameDeps, id: ItemId) {
  const r = useItem(game.save(), id, false);
  if (r.ok) game.commit();
  else game.toast(r.why === 'stock' ? `No ${ITEM_CATALOG[id].name.toLowerCase()}s left. ${ITEM_CATALOG[id].where}.` : `Save it for a spar: a ${ITEM_CATALOG[id].name.toLowerCase()} restores health in a fight (the Snack button, or E). Spar at the Fight Club, or with a partner on the street.`, 4200);
}

/** A snack at a diner's door or a Night Market stall: one into the bag, if there's room and the Dorras */
export function buySnack(game: GameDeps, where: string) {
  const s = game.save();
  const r = buyItem(s, 'snack');
  if (!r.ok) {
    game.toast(r.why === 'max' ? `Your bag holds ${ITEM_MAX} snacks.` : whyNot(r.why, ITEM_CATALOG.snack.level));
    game.sfx('denied');
    return false;
  }
  game.commit();
  game.sfx('buy');
  game.toast(`${where}: a snack for ${fmt.format(ITEM_CATALOG.snack.price)} Dorras (${s.inventory.items.snack} of ${ITEM_MAX} in your bag).`, 3600);
  return true;
}

/* ---------- The hotbar and the inventory ---------- */

export interface HotbarCombat {
  readonly armed: boolean;
  readonly geared: boolean;
  readonly weapon: WeaponId;
  draw(id: WeaponId): boolean;
  holster(): void;
  ammo(id: WeaponId): [number, number];
  canTake(id: WeaponId): boolean;
  /** The weapon slots changed in the save: the rules read them again */
  setLoadout(): void;
}
export interface HotbarDeps {
  game: GameDeps;
  combat: HotbarCombat;
  touched(): void;
  /** Put a thing in his hand (the look's `held`, which the save follows) */
  hold(held: Held): void;
  /** The inventory opened (free the mouse, stand him still) and closed */
  opened(): void;
  closed(): void;
}

/** Two taps on the same thing this close together (ms) are a double tap */
const DOUBLE = 380;
/** A press that moves this far (px) is a drag */
const DRAG = 6;
/** The mouse wheel steps the hotbar at most this often (ms) */
const WHEEL_GAP = 120;
/** How long what's dropped keeps its settling bounce (ms; the animation's own length is in inventory.css) */
const LAND_MS = 400;

export function createHotbar(root: HTMLElement, d: HotbarDeps) {
  const bar = root.querySelector<HTMLElement>('[data-hotbar]')!;
  const panel = root.querySelector<HTMLElement>('[data-inv]')!;
  const weaponsEl = panel.querySelector<HTMLElement>('[data-inv-weapons]')!;
  const gridEl = panel.querySelector<HTMLElement>('[data-inv-grid]')!;
  const infoEl = panel.querySelector<HTMLElement>('[data-inv-info]')!;
  /** With no gun out: his hands empty (his fists) or the thing he holds out */
  let hand: 'hands' | 'held' = 'held';
  let shown = '';
  let open = false;
  /** Selected in the inventory: a grid space (0-15) or a weapon slot (-1 slot 1, -2 slot 2) */
  let sel: number | null = null;
  let tapped = { at: -99, t: 0 };
  let wheelAt = 0;
  /** Where something was just dropped, and when */
  let land = { at: null as number | null, t: 0 };
  /** A mouse that hovers: the tip and the right-click */
  const fine = matchMedia('(hover: hover) and (pointer: fine)');

  const save = () => d.game.save();
  const may = (id: WeaponId) => d.combat.canTake(id);
  /** The hotbar slot lit now ('hands': nothing out) */
  function current() {
    const g = save().inventory.guns;
    if (d.combat.armed) return d.combat.weapon === g[1] && g[1] !== g[0] ? 'gun1' : d.combat.weapon === g[0] ? 'gun0' : 'hands';
    return hand === 'held' && save().inventory.held ? 'held' : 'hands';
  }
  const outSlot = (): 0 | 1 | null => {
    const c = current();
    return c === 'gun0' ? 0 : c === 'gun1' ? 1 : null;
  };
  /** Nothing in his hands: his fists */
  function hands() {
    hand = 'hands';
    d.combat.holster();
  }
  function drawGun(w: WeaponId) {
    if (!d.combat.draw(w)) d.game.toast(`The ${WEAPONS[w].name} isn't unlocked yet.`);
  }
  function holdOut(h: Held) {
    if (save().inventory.held !== h) d.hold(h);
    hand = 'held';
    d.combat.holster();
  }
  function pickAt(x: Slot | undefined) {
    const a = pickSlot(x);
    if (!a || !x) return false;
    d.touched();
    const at = current();
    switch (a.do) {
      case 'draw':
        // (the gun out already: put it away, empty hands)
        if (at === slotKey(x)) hands();
        else drawGun(a.weapon);
        break;
      case 'held':
        if (at === 'held') hand = 'hands';
        else holdOut(a.held);
        break;
      case 'empty':
        // (empty hands are his fists: the gun out goes away)
        hands();
        d.game.toast(`Weapon slot ${x.kind === 'gun' ? x.i + 1 : ''} is empty, so your hands are free. Press Tab (or Bag) and drag a gun into it.`);
        break;
      case 'use':
        useOne(d.game, a.item);
        break;
    }
    paint();
    return true;
  }
  /** Pick the hotbar slot numbered n + 1 (1-7) */
  const pick = (n: number) => pickAt(slots(save())[n]);
  /** Step to the next (or previous) of the weapons and empty hands */
  function step(dir: 1 | -1) {
    const key = stepKey(save(), current(), dir);
    if (key === 'hands') {
      hands();
      paint();
      return true;
    }
    return pickAt(slots(save()).find((x) => slotKey(x) === key));
  }

  /* ----- The inventory ----- */

  /** A rule changed the save: keep it, let the rules read the weapons again, repaint */
  function done(r: InvResult, sfx = true) {
    if (!r.ok) {
      d.game.toast(r.why === 'room' ? 'No room there: drop it on an empty space or on another gun.' : r.why === 'place' ? 'Only guns go in the weapon slots.' : whyNot(r.why === 'stock' ? 'stock' : 'place'));
      d.game.sfx('denied');
      paint();
      return false;
    }
    d.game.commit();
    d.combat.setLoadout();
    if (sfx) d.game.sfx('gear');
    paint();
    return true;
  }
  /** Something just landed at `i`: it settles with a bounce, and the selection goes with it */
  function landed(i: number) {
    land = { at: i, t: performance.now() };
    sel = i;
    paint();
  }
  /** Drop what was dragged from `from` onto `to` (grid spaces 0-15, weapon slots -1 and -2) */
  function drop(from: number, to: number) {
    if (from === to) return;
    const s = save();
    let r: InvResult = { ok: true };
    if (from >= 0 && to >= 0) r = moveCell(s, from, to, may);
    else if (from >= 0) r = equipCell(s, from, (-1 - to) as 0 | 1, may);
    else if (to >= 0) r = unequip(s, (-1 - from) as 0 | 1, to, may);
    else swapSlots(s);
    if (done(r, !(from >= 0 && to >= 0))) landed(to);
  }
  /** What's at a selection: its key and the thing */
  function at(i: number | null) {
    if (i === null) return null;
    const s = save();
    const key = i >= 0 ? layout(s, may)[i] : s.inventory.guns[-1 - i] ? `gun:${s.inventory.guns[-1 - i]}` : '';
    return key ? thing(s, key, (w) => d.combat.ammo(w)) : null;
  }
  /** The actions on the selected thing, the first the one a double tap or Enter does */
  function actions(i: number | null): { id: string; label: string }[] {
    const t = at(i);
    if (!t || i === null) return [];
    if (i < 0) {
      const slot = -1 - i;
      return [outSlot() === slot ? { id: 'away', label: 'Put away' } : { id: 'draw', label: 'Draw' }, { id: 'unequip', label: 'Back in bag' }];
    }
    if (t.it.kind === 'gun') {
      const g = save().inventory.guns;
      const out = outSlot();
      const first = !g[0] ? 0 : !g[1] ? 1 : out === 0 ? 1 : 0;
      return [first, 1 - first].map((k) => ({ id: `slot${k}`, label: `${g[k] ? 'Swap' : 'To'} slot ${k + 1}` }));
    }
    if (t.it.kind === 'held') return [current() === 'held' && save().inventory.held === t.it.held ? { id: 'away', label: 'Put away' } : { id: 'hold', label: 'Hold it' }];
    return [{ id: 'use', label: 'Use' }];
  }
  /** A right-click's quick move: a weapon back in the bag, the rest their first action */
  const quick = (i: number) => (i < 0 ? (at(i) ? { id: 'unequip', label: 'Back in bag' } : undefined) : actions(i)[0]);
  function act(id: string, i: number | null = sel) {
    const t = at(i);
    if (!t || i === null) return;
    d.touched();
    if (id === 'slot0' || id === 'slot1') {
      const k = id === 'slot0' ? 0 : 1;
      if (done(equipCell(save(), i, k, may))) landed(-1 - k);
      return;
    }
    if (id === 'unequip') {
      const key = t.it.kind === 'gun' ? `gun:${t.it.weapon}` : '';
      if (done(unequip(save(), (-1 - i) as 0 | 1, undefined, may))) {
        const to = layout(save(), may).indexOf(key);
        if (to >= 0) landed(to);
        else sel = null;
      }
      return paint();
    }
    if (id === 'draw' && t.it.kind === 'gun') drawGun(t.it.weapon);
    else if (id === 'away') hands();
    else if (id === 'hold' && t.it.kind === 'held') holdOut(t.it.held);
    else if (id === 'use' && t.it.kind === 'item') useOne(d.game, t.it.item);
    paint();
  }
  const primary = (i: number) => {
    const a = actions(i)[0];
    if (a) act(a.id, i);
  };
  function select(i: number | null) {
    sel = i;
    paint();
  }

  function paint() {
    const s = save();
    const list = slots(s);
    const now = current();
    // (a signature first: the bar is checked every frame, painted only when it changes)
    const sig = `${now}|${list.map((x) => (x.kind === 'gun' && x.weapon ? `${x.weapon}:${d.combat.ammo(x.weapon).join('/')}` : x.kind === 'item' ? `${x.item}:${x.n}` : slotKey(x))).join(',')}`;
    if (sig !== shown) {
      shown = sig;
      repaint(
        bar,
        list
          .map((x, i) => {
            const k = slotKey(x);
            const art = x.kind === 'gun' ? (x.weapon ? gunArt(x.weapon) : '') : x.kind === 'held' ? icon(HELD_ICONS[x.held]) : icon(ITEM_ICONS[x.item]);
            const count = x.kind === 'gun' && x.weapon ? `<span class="hb-count">${d.combat.ammo(x.weapon)[0]}</span>` : x.kind === 'item' ? `<span class="hb-count">×${x.n}</span>` : '';
            const name = slotName(x);
            return (
              `<button type="button" class="hb-slot hb-${x.kind}${x.kind === 'gun' && !x.weapon ? ' is-empty' : ''}" data-hb="${i}" aria-pressed="${k === now}" aria-label="${i + 1}: ${esc(name)}">` +
              `<span class="hb-art">${art}</span><span class="hb-name">${esc(name)}</span>${count}<kbd class="hb-key">${i + 1}</kbd></button>`
            );
          })
          .join('')
      );
    }
    if (!open) return;
    const out = { slot: outSlot(), held: now === 'held' };
    const landing = land.at !== null && performance.now() - land.t < LAND_MS ? land.at : null;
    const { weapons, cells } = gridParts(s, { ammo: (w) => d.combat.ammo(w), may, live: true, sel, out, land: landing });
    repaint(weaponsEl, weapons);
    repaint(gridEl, cells);
    const t = at(sel);
    repaint(
      infoEl,
      t
        ? `<div class="inv-about"><b>${esc(t.name)}</b><small>${esc(t.about)}</small>${t.stats ?? ''}</div><div class="inv-acts">${actions(sel)
            .map((a) => `<button type="button" class="chip-link" data-inv-act="${a.id}">${a.label}</button>`)
            .join('')}</div>`
        : `<div class="inv-about"><b>Your bag</b><small>${
            fine.matches
              ? 'Drag a gun onto weapon slot 1 or 2, and back. Click anything to see what it does; double click or right-click to use it.'
              : 'Drag a gun onto weapon slot 1 or 2, and back. Tap anything to see what it does; double tap to use it.'
          }</small></div>`
    );
    // (the tip follows what it shows: ammo after a reload, a space emptied under it)
    if (tipAt !== null) tipFor(tipAt);
  }

  /* The tip under a mouse: what's hovered, its stats and its right-click */
  let tip: HTMLElement | null = null;
  let tipAt: number | null = null;
  function tipFor(i: number | null, el?: Element) {
    const t = i === null || drag?.moved ? null : at(i);
    if (!t || i === null) {
      tip?.remove();
      tip = null;
      tipAt = null;
      return;
    }
    tipAt = i;
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'inv-tip';
      tip.setAttribute('role', 'tooltip');
      document.body.append(tip);
    }
    const q = quick(i);
    repaint(tip, `<b>${esc(t.name)}</b><small>${esc(t.about)}</small>${t.stats ?? ''}${q ? `<span class="inv-tip-hint">Right-click · ${q.label}</span>` : ''}`);
    if (!el) return;
    // Over the thing if there's room, under it if not, inside the window
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const top = r.top - h - 8 >= 8 ? r.top - h - 8 : r.bottom + 8;
    tip.style.left = `${Math.round(Math.min(innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2)))}px`;
    tip.style.top = `${Math.round(top)}px`;
  }

  function show() {
    if (open) return;
    open = true;
    sel = null;
    panel.hidden = false;
    root.classList.add('is-inv');
    d.opened();
    paint();
    // (the keyboard starts on weapon slot 1)
    weaponsEl.querySelector<HTMLElement>('[data-slot="0"]')?.focus({ preventScroll: true });
  }
  function close() {
    if (!open) return false;
    open = false;
    drag = null;
    ghost?.remove();
    ghost = null;
    panel.hidden = true;
    tipFor(null);
    root.classList.remove('is-inv');
    d.closed();
    return true;
  }
  /** Where a press landed: a grid space (0-15) or a weapon slot (-1, -2) */
  const targetOf = (el: Element | null) => {
    const c = el?.closest<HTMLElement>('[data-cell], [data-slot]');
    if (!c || !panel.contains(c)) return null;
    return c.dataset.cell !== undefined ? Number(c.dataset.cell) : -1 - Number(c.dataset.slot);
  };
  const filled = (i: number) => !!at(i);

  // Dragging (mouse or finger): a press that moves becomes a drag with a ghost under the pointer; one that doesn't is a tap
  let drag: { from: number; id: number; x: number; y: number; moved: boolean } | null = null;
  let ghost: HTMLElement | null = null;
  let over: Element | null = null;
  panel.addEventListener('pointerdown', (e) => {
    const i = targetOf(e.target as Element);
    if (i === null || e.button > 0) return;
    drag = { from: i, id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > DRAG && filled(drag.from)) {
      drag.moved = true;
      const src = panel.querySelector(drag.from >= 0 ? `[data-cell="${drag.from}"]` : `[data-slot="${-1 - drag.from}"]`);
      ghost = document.createElement('div');
      ghost.className = 'inv-ghost';
      ghost.innerHTML = src?.querySelector('.inv-art')?.outerHTML ?? '';
      document.body.append(ghost);
      src?.classList.add('is-lifted');
      tipFor(null);
    }
    if (!drag.moved || !ghost) return;
    e.preventDefault();
    ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-cell], [data-slot]') ?? null;
    if (el !== over) {
      over?.classList.remove('is-over');
      over = el && panel.contains(el) ? el : null;
      over?.classList.add('is-over');
    }
  });
  const endDrag = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { from, moved } = drag;
    drag = null;
    over?.classList.remove('is-over');
    over = null;
    panel.querySelector('.is-lifted')?.classList.remove('is-lifted');
    if (ghost) {
      ghost.remove();
      ghost = null;
    }
    if (e.type === 'pointercancel') return;
    if (moved) {
      const to = targetOf(document.elementFromPoint(e.clientX, e.clientY));
      if (to !== null) {
        sel = to;
        drop(from, to);
      }
      return;
    }
    // A tap: select it; a second tap on it soon after does its first action
    const now = performance.now();
    const twice = tapped.at === from && now - tapped.t < DOUBLE;
    tapped = { at: from, t: now };
    sel = from;
    if (twice) primary(from);
    else paint();
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  // A mouse: the tip over what's hovered, and the right-click's quick move
  panel.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse' || !fine.matches || drag?.moved) return;
    const el = (e.target as Element).closest('[data-cell], [data-slot]');
    const i = targetOf(el);
    if (i !== tipAt) tipFor(i, el ?? undefined);
  });
  panel.addEventListener('pointerleave', () => tipFor(null));
  panel.addEventListener('contextmenu', (e) => {
    const i = targetOf(e.target as Element);
    if (i === null) return;
    e.preventDefault();
    const q = quick(i);
    if (!q) return;
    sel = i;
    act(q.id, i);
  });
  panel.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-inv-close]')) return void close();
    const a = t.closest<HTMLElement>('[data-inv-act]')?.dataset.invAct;
    if (a) return act(a);
    // (Enter or Space on a space or a slot: a click with no pointer: its first action)
    const i = targetOf(t);
    if (i !== null && e.detail === 0) {
      sel = i;
      primary(i);
    }
  });
  /** Arrow keys (the d-pad): round the grid, up from its top row to the weapon slots */
  function move(dx: number, dy: number) {
    let i = sel ?? -1;
    if (i < 0) {
      if (dy > 0) i = i === -1 ? 0 : 2;
      else if (dx) i = i === -1 ? -2 : -1;
    } else {
      const col = i % GRID_COLS;
      if (dy < 0 && i < GRID_COLS) i = col < GRID_COLS / 2 ? -1 : -2;
      else if (dx) i = Math.floor(i / GRID_COLS) * GRID_COLS + ((col + dx + GRID_COLS) % GRID_COLS);
      else i = Math.min(GRID_SIZE - 1, Math.max(0, i + dy * GRID_COLS));
    }
    select(i);
    panel.querySelector<HTMLElement>(i >= 0 ? `[data-cell="${i}"]` : `[data-slot="${-1 - i}"]`)?.focus({ preventScroll: true });
  }
  panel.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'ArrowLeft') move(-1, 0);
    else if (k === 'ArrowRight') move(1, 0);
    else if (k === 'ArrowUp') move(0, -1);
    else if (k === 'ArrowDown') move(0, 1);
    else return;
    e.preventDefault();
  });
  // Focus follows the selection when it's moved with the keyboard
  panel.addEventListener('focusin', (e) => {
    const i = targetOf(e.target as Element);
    if (i !== null && i !== sel && !drag) {
      sel = i;
      paint();
    }
  });

  bar.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-hb]');
    if (b) pick(Number(b.dataset.hb));
  });
  root.querySelector('[data-inv-open]')?.addEventListener('click', () => (open ? close() : show()));

  return {
    pick,
    step,
    /** Per frame on foot: the bar (and the inventory while it's open) kept up to date */
    update: paint,
    /** The thing in his hand is out (no gun drawn, and his hand on it) */
    get heldOut() {
      return !d.combat.armed && hand === 'held';
    },
    /** Nothing in his hands (no gun drawn, nothing held out): his fists (brawl.ts) */
    get handsEmpty() {
      return !d.combat.armed && (hand === 'hands' || !save().inventory.held);
    },
    /** Walking starts with the thing in his hand out, as before the inventory */
    reset() {
      hand = 'held';
      shown = '';
    },
    /** The inventory (Tab, the Bag button, View on a gamepad) */
    get open() {
      return open;
    },
    toggle() {
      return open ? close() : (show(), true);
    },
    close,
    /** A gamepad in the inventory (`edge(i)`: button i just pressed): the d-pad moves, A does the selected thing's first action, B or View closes */
    pad(edge: (i: number) => boolean) {
      if (!open) return;
      if (edge(1) || edge(8)) return void close();
      if (edge(0) && sel !== null) primary(sel);
      if (edge(14) || edge(15)) move(edge(14) ? -1 : 1, 0);
      if (edge(12) || edge(13)) move(0, edge(12) ? -1 : 1);
    },
    /** The snack bars' prompts on foot (the diners' doors, the Night Market's stalls), and buying one there */
    doors: SNACK_BARS.map((b) => ({ id: `snack:${b.id}`, x: b.x, z: b.z, label: `${b.name} · Snack` })),
    snack(id: string) {
      const bar = SNACK_BARS.find((b) => b.id === id);
      if (bar) buySnack(d.game, bar.name);
    },
    /** A key while the inventory is open: Tab closes it, the rest wait (its own arrows and Enter go to it) */
    key(e: KeyboardEvent, down: boolean) {
      if (e.code !== 'Tab') return false;
      if (down && !e.repeat) close();
      e.preventDefault();
      return true;
    },
    /** The mouse wheel with the mouse captured: a step a notch, at most one every 120 ms (a trackpad sends a stream) */
    wheel(dir: 1 | -1) {
      const now = performance.now();
      if (now - wheelAt < WHEEL_GAP) return;
      wheelAt = now;
      step(dir);
    },
  };
}

export type Hotbar = ReturnType<typeof createHotbar>;
