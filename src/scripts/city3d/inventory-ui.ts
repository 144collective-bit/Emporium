/*
 * The inventory on screen (docs/inventory-plan.md, Phase 1; the rules are
 * inventory.ts):
 *
 * - The hotbar (`[data-hotbar]` in the walk HUD): a slot each for the fists,
 *   gun 1, gun 2, the thing in his hand and the consumables he has, the
 *   number under each, the picked one lit, ammo on the guns and a count on
 *   the snack. 1-7 pick a slot, X (the wheel with the mouse captured, the
 *   touch Swap button, RB and the d-pad) steps through the fists and the
 *   guns, a tap or a click picks. Fists put the gun away with his hands
 *   free (the guard comes in Phase 2), the thing in his hand puts it away
 *   and takes that out, a gun is drawn anywhere.
 * - The Bag tab in the walk pop (`[data-bag]`): the loadout with each gun's
 *   ammo and mods, the locker, the thing in his hand, the consumables with
 *   Use, and where to get more.
 * - `bagHtml()`: the same list for the business card's Bag tab
 *   (tycoon-ui.ts), read-only in the City view, with the Armoury and the
 *   Night Market as ways in.
 * - `buySnack()`: a snack bought at a diner's door or a Night Market stall
 *   (walk mode's prompts, `SNACK_BARS`).
 *
 * The hand (fists or the thing he holds) is this view's: the save keeps
 * what he carries, not what's out.
 */
import { GUN_MODS, GUN_MOD_IDS, ITEM_CATALOG, ITEM_MAX, applyGunMods, type ItemId } from './catalog';
import { WEAPONS, type WeaponId } from './combat-sim';
import { ART } from './gunart';
import { buyItem, pickSlot, slotKey, slots, stepKey, useItem, type Slot } from './inventory';
import { gunMods, ownsGun, type TycoonSave } from './tycoon';
import { D, esc, fmt, repaint, whyNot, type GameDeps } from './ui';
import type { Held } from '../net/profile-data';

export const HELD_NAMES: Record<Held, string> = { coffee: 'Iced coffee', boombox: 'Boombox', phone: 'Phone', briefcase: 'Briefcase' };
/** Line icons in a 24 box (the fitting room's Hand tab draws the same) */
const HELD_ICONS: Record<Held, string> = {
  coffee: 'M7 8h10l-1.5 13h-7z M6.5 8a5.5 3 0 0 1 11 0 M13 5l2-3 M8 13h8',
  boombox: 'M3 9h18v10H3z M8 9V6h8v3 M8 14m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0 M16 14m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
  phone: 'M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z M10 18h4 M9 7l2 3 2-4 2 5',
  briefcase: 'M3 8h18v12H3z M9 8V5h6v3 M3 13h18 M11 12h2v3h-2z',
};
/** A fist, knuckles forward */
const FISTS_ICON = 'M6 10V8a2 2 0 0 1 4 0v1 M10 9V7a2 2 0 0 1 4 0v2 M14 9V8a2 2 0 0 1 4 0v5c0 4-3 7-6.5 7S5 18 5 15v-3a2 2 0 0 1 3-1.7 M8 14l3-1';
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
/** The name a slot goes by */
function slotName(x: Slot) {
  if (x.kind === 'fists') return 'Fists';
  if (x.kind === 'gun') return x.weapon ? WEAPONS[x.weapon].short : 'Empty';
  if (x.kind === 'held') return HELD_NAMES[x.held];
  return ITEM_CATALOG[x.item].name;
}

/* ---------- The Bag: the walk pop's tab and the business card's ---------- */

/** The guns he owns and may carry, in store order */
const ownedGuns = (save: TycoonSave, may: (id: WeaponId) => boolean) => (Object.keys(WEAPONS) as WeaponId[]).filter((id) => ownsGun(save, id) && may(id));

export interface BagOpts {
  /** A gun's ammo as he carries it (walk mode); without it, its magazine and spare rounds */
  ammo?(id: WeaponId): [number, number];
  /** May he carry this gun (the starters unlock with score) */
  may(id: WeaponId): boolean;
  /** Walk mode: the snacks have Use */
  live: boolean;
  /** The City view: ways in to the Armoury and the Night Market */
  ways?: boolean;
}
export function bagHtml(save: TycoonSave, o: BagOpts) {
  const inv = save.inventory;
  const gun = (i: 0 | 1, id: WeaponId | null) => {
    if (!id) return `<li class="bag-row is-empty"><span class="bag-art"></span><span class="bag-info"><b>Gun ${i + 1} · Empty</b><small>Pick one at the Armoury or Trench Arms</small></span></li>`;
    const w = applyGunMods(WEAPONS[id], gunMods(save, id));
    const [mag, res] = o.ammo?.(id) ?? [w.mag, w.reserve];
    return (
      `<li class="bag-row"><span class="bag-art">${gunArt(id)}</span><span class="bag-info"><b>Gun ${i + 1} · ${esc(WEAPONS[id].name)}</b><small>${esc(modLine(save, id))}</small></span>` +
      `<span class="bag-count"><b>${mag}</b>/${res}</span></li>`
    );
  };
  const locker = ownedGuns(save, o.may).filter((id) => !inv.guns.includes(id));
  const lockerHtml = locker.length
    ? `<ul class="bag-chips">${locker.map((id) => `<li>${gunArt(id)}<span>${esc(WEAPONS[id].short)}</span></li>`).join('')}</ul><p class="walk-pad">Swap them into your loadout at the Armoury or Trench Arms.</p>`
    : '<p class="walk-pad">Nothing else yet. More guns unlock with your score or are for sale at the Armoury.</p>';
  const held = inv.held
    ? `<li class="bag-row"><span class="bag-art bag-icon">${icon(HELD_ICONS[inv.held])}</span><span class="bag-info"><b>${HELD_NAMES[inv.held]}</b><small>Put it away with the fists or a gun</small></span></li>`
    : `<li class="bag-row is-empty"><span class="bag-art bag-icon"></span><span class="bag-info"><b>Nothing</b><small>Pick something in Drop 001's fitting room (Hand)</small></span></li>`;
  const items = (Object.keys(ITEM_CATALOG) as ItemId[])
    .map((id) => {
      const c = ITEM_CATALOG[id];
      const n = inv.items[id] ?? 0;
      return (
        `<li class="bag-row${n ? '' : ' is-empty'}"><span class="bag-art bag-icon">${icon(ITEM_ICONS[id])}</span><span class="bag-info"><b>${esc(c.name)} · ${n} of ${ITEM_MAX}</b><small>${esc(c.blurb)} ${D(c.price)} each at ${esc(c.where)}.</small></span>` +
        (o.live && n ? `<button type="button" class="chip-link" data-bag-use="${id}">Use</button>` : '') +
        '</li>'
      );
    })
    .join('');
  const ways = !o.ways
    ? ''
    : `<div class="city-panel-actions bag-ways"><button type="button" class="chip-link" data-bag-go="plan">The Armoury</button><button type="button" class="chip-link" data-bag-go="nightmarket">The Night Market</button></div>`;
  return (
    `<p class="bag-head">Loadout</p><ul class="bag-list">${gun(0, inv.guns[0])}${gun(1, inv.guns[1])}</ul>` +
    `<p class="walk-pad">Ammo is free: every gun comes full, the counter refills them. Draw either anywhere from the hotbar.</p>` +
    `<p class="bag-head">Locker</p>${lockerHtml}` +
    `<p class="bag-head">In your hand</p><ul class="bag-list">${held}</ul>` +
    `<p class="bag-head">Snacks</p><ul class="bag-list">${items}</ul>${ways}`
  );
}

/** Use a consumable from the Bag or the hotbar: only in a spar (Phase 3), so for now it says so */
function useOne(game: GameDeps, id: ItemId) {
  const r = useItem(game.save(), id, false);
  if (r.ok) game.commit();
  else game.toast(r.why === 'stock' ? `No ${ITEM_CATALOG[id].name.toLowerCase()}s left. ${ITEM_CATALOG[id].where}.` : `Save it for a spar: a ${ITEM_CATALOG[id].name.toLowerCase()} restores health in a fight (coming soon).`, 4200);
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

/* ---------- The hotbar ---------- */

export interface HotbarCombat {
  readonly armed: boolean;
  readonly geared: boolean;
  readonly weapon: WeaponId;
  draw(id: WeaponId): boolean;
  holster(): void;
  ammo(id: WeaponId): [number, number];
  canTake(id: WeaponId): boolean;
}
export interface HotbarDeps {
  game: GameDeps;
  combat: HotbarCombat;
  touched(): void;
}

export function createHotbar(root: HTMLElement, d: HotbarDeps) {
  const bar = root.querySelector<HTMLElement>('[data-hotbar]')!;
  const bag = root.querySelector<HTMLDetailsElement>('[data-bag]')!;
  const bagBody = bag.querySelector<HTMLElement>('[data-bag-body]')!;
  /** With the gun away: his hands free (fists) or the thing he holds out */
  let hand: 'fists' | 'held' = 'held';
  let shown = '';
  let bagShown = '';

  const inv = () => d.game.save().inventory;
  /** The slot lit now */
  function current() {
    const g = inv().guns;
    if (d.combat.armed) return d.combat.weapon === g[1] ? 'gun1' : 'gun0';
    return hand === 'held' && inv().held ? 'held' : 'fists';
  }
  function pickAt(x: Slot | undefined) {
    const a = pickSlot(x);
    if (!a) return false;
    d.touched();
    switch (a.do) {
      case 'fists':
        hand = 'fists';
        d.combat.holster();
        break;
      case 'held':
        hand = 'held';
        d.combat.holster();
        break;
      case 'draw':
        if (!d.combat.draw(a.weapon)) d.game.toast(`The ${WEAPONS[a.weapon].name} isn't unlocked yet: change your loadout at the Armoury.`);
        break;
      case 'empty':
        d.game.toast('Gun 2 is empty: carry a second gun from the Armoury or Trench Arms.');
        break;
      case 'use':
        useOne(d.game, a.item);
        break;
    }
    paint();
    return true;
  }
  /** Pick the slot numbered n + 1 (1-7) */
  const pick = (n: number) => pickAt(slots(d.game.save())[n]);
  /** Step to the next (or previous) of the fists and the guns */
  function step(dir: 1 | -1) {
    const key = stepKey(d.game.save(), current(), dir);
    return pickAt(slots(d.game.save()).find((x) => slotKey(x) === key));
  }

  function paint() {
    const save = d.game.save();
    const list = slots(save);
    const at = current();
    // (a signature first: the bar is checked every frame, painted only when it changes)
    const sig = `${at}|${list.map((x) => (x.kind === 'gun' && x.weapon ? `${x.weapon}:${d.combat.ammo(x.weapon).join('/')}` : x.kind === 'item' ? `${x.item}:${x.n}` : slotKey(x))).join(',')}`;
    if (sig !== shown) {
      shown = sig;
      const html = list
        .map((x, i) => {
          const k = slotKey(x);
          const art = x.kind === 'fists' ? icon(FISTS_ICON) : x.kind === 'gun' ? (x.weapon ? gunArt(x.weapon) : '') : x.kind === 'held' ? icon(HELD_ICONS[x.held]) : icon(ITEM_ICONS[x.item]);
          const count = x.kind === 'gun' && x.weapon ? `<span class="hb-count">${d.combat.ammo(x.weapon)[0]}</span>` : x.kind === 'item' ? `<span class="hb-count">×${x.n}</span>` : '';
          const name = slotName(x);
          return (
            `<button type="button" class="hb-slot hb-${x.kind}${x.kind === 'gun' && !x.weapon ? ' is-empty' : ''}" data-hb="${i}" aria-pressed="${k === at}" aria-label="${i + 1}: ${esc(name)}">` +
            `<span class="hb-art">${art}</span><span class="hb-name">${esc(name)}</span>${count}<kbd class="hb-key">${i + 1}</kbd></button>`
          );
        })
        .join('');
      repaint(bar, html);
    }
    if (bag.open) paintBag();
  }
  function paintBag() {
    const save = d.game.save();
    const sig = `${shown}|${save.inventory.guns.join()}|${save.armoury.owned.join()}|${JSON.stringify(save.armoury.mods)}|${save.inventory.held}`;
    if (sig === bagShown) return;
    bagShown = sig;
    repaint(bagBody, bagHtml(save, { ammo: (id) => d.combat.ammo(id), may: (id) => d.combat.canTake(id), live: true }));
  }

  bar.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-hb]');
    if (b) pick(Number(b.dataset.hb));
  });
  bag.addEventListener('toggle', () => {
    bagShown = '';
    if (bag.open) paintBag();
  });
  bagBody.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-bag-use]');
    if (b) useOne(d.game, b.dataset.bagUse as ItemId);
  });

  return {
    pick,
    step,
    /** Per frame on foot: the bar (and the Bag while it's open) kept up to date */
    update: paint,
    /** The thing in his hand is out (no gun drawn, and the hand slot picked) */
    get heldOut() {
      return !d.combat.armed && hand === 'held';
    },
    /** Walking starts with the thing in his hand out, as before the inventory */
    reset() {
      hand = 'held';
      shown = '';
    },
  };
}

export type Hotbar = ReturnType<typeof createHotbar>;
