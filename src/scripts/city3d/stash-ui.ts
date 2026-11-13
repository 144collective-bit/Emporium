/*
 * The stash: the trunk in Degen's house (home.ts, docs/home-plan.md Phase 4), loaded when its card first opens.
 * At the trunk ("Stash", F or a tap) a card shows what he carries and what's put away: a consumable goes in or
 * comes out one at a time (inventory.ts `stashItem()` / `takeItem()`; the save's `stash`), and the guns he owns
 * and doesn't carry are listed, with the way to the inventory, which changes his weapons.
 *
 * The card is the metro's (the arcade kit, `.mk-skin.metro-card`): x or Esc closes it. Nothing here is real money.
 */
import { ITEM_CATALOG, ITEM_IDS, ITEM_MAX, type ItemId } from './catalog';
import { WEAPONS, type WeaponId } from './combat-sim';
import { STASH_MAX, racked, stashItem, takeItem } from './inventory';
import { esc, type GameDeps } from './ui';

export interface StashDeps {
  game: GameDeps;
  /** May he carry this gun (a starter his score unlocked, or one he bought) */
  may(id: WeaponId): boolean;
  /** On foot, in the house */
  free(): boolean;
  /** The card opened (one card at a time; the mouse is freed) */
  opened(): void;
  /** The inventory (Tab's screen): his weapons are changed there */
  inventory(): void;
}

export function createStashUI(root: HTMLElement, d: StashDeps) {
  const card = root.querySelector<HTMLElement>('[data-stash]')!;
  const body = card.querySelector<HTMLElement>('[data-stash-body]')!;

  function paint() {
    const s = d.game.save();
    const rows = ITEM_IDS.map((id) => {
      const [have, put] = [s.inventory.items[id] ?? 0, s.stash[id] ?? 0];
      const name = esc(ITEM_CATALOG[id].name);
      return (
        `<li class="stash-row"><p class="stash-name"><b>${name}s</b><small>Carried ${have} / ${ITEM_MAX} · Stashed ${put} / ${STASH_MAX}</small></p>` +
        `<button type="button" class="metro-go" data-stash-put="${id}"${have > 0 && put < STASH_MAX ? '' : ' disabled'}><span>Put away</span></button>` +
        `<button type="button" class="metro-go" data-stash-take="${id}"${put > 0 && have < ITEM_MAX ? '' : ' disabled'}><span>Take</span></button></li>`
      );
    }).join('');
    const guns = racked(s, d.may);
    const rack = guns.length ? guns.map((id) => esc(WEAPONS[id].short)).join(' · ') : 'Empty';
    body.innerHTML =
      `<ul class="metro-list">${rows}</ul>` +
      `<p class="metro-note stash-rack"><b>Gun rack</b> ${rack}</p>` +
      `<button type="button" class="metro-go" data-stash-inv><span>Change weapons</span><small>Tab</small></button>`;
  }
  function open() {
    if (!d.free()) return;
    d.opened();
    paint();
    card.hidden = false;
    (body.querySelector<HTMLButtonElement>('button:not([disabled])') ?? card.querySelector<HTMLButtonElement>('[data-stash-close]'))?.focus({ preventScroll: true });
  }
  function close() {
    if (card.hidden) return false;
    card.hidden = true;
    return true;
  }
  card.querySelector('[data-stash-close]')?.addEventListener('click', close);
  body.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!b || b.disabled) return;
    if (b.matches('[data-stash-inv]')) {
      close();
      return d.inventory();
    }
    const put = b.dataset.stashPut as ItemId | undefined;
    const id = put ?? (b.dataset.stashTake as ItemId | undefined);
    if (!id) return;
    const r = put ? stashItem(d.game.save(), id) : takeItem(d.game.save(), id);
    if (r.ok) {
      d.game.commit();
      d.game.sfx('door', 0.5);
    } else d.game.sfx('denied');
    const again = put ? `[data-stash-put="${id}"]` : `[data-stash-take="${id}"]`;
    paint();
    // (the button pressed keeps the focus while it can be pressed again; then the other way's)
    (body.querySelector<HTMLButtonElement>(`${again}:not([disabled])`) ?? body.querySelector<HTMLButtonElement>('button:not([disabled])'))?.focus({ preventScroll: true });
  });
  return { open, close };
}
export type StashUI = ReturnType<typeof createStashUI>;
