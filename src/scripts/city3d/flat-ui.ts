/*
 * Degen's flat in Kite Point (docs/brutalist-plan.md Phase 7a): its card, at its door on the 15th-floor bridge, loaded
 * when it first opens. Till it's his: what it is and its price (Dorras, a flat game price, from its level; never an
 * investment); once it's his: where he wakes, at home or here (the save's `flat.wake`, tycoon.ts `setWake()`).
 *
 * The card is the metro's (the arcade kit, `.mk-skin.metro-card`): x or Esc closes it. Nothing here is real money.
 */
import { FLAT_LEVEL, buyFlat, flatPrice, setWake, wakeAt, type WakeAt } from './tycoon';
import { D, whyNot, type GameDeps } from './ui';

export interface FlatDeps {
  game: GameDeps;
  /** The card opened (one card at a time; the mouse is freed) */
  opened(): void;
  /** It's his now: its door opens (southsky.ts `setFlatOpen()`) */
  owned(): void;
}

export function createFlatUI(root: HTMLElement, d: FlatDeps) {
  const card = root.querySelector<HTMLElement>('[data-flat]')!;
  const body = card.querySelector<HTMLElement>('[data-flat-body]')!;
  let note = '';

  function paint() {
    const s = d.game.save();
    const price = flatPrice(s);
    if (price !== null) {
      body.innerHTML =
        `<p class="metro-note">A flat of your own, high over the estate. Yours to live in.</p>` +
        (note ? `<p class="metro-note" role="status">${note}</p>` : '') +
        `<ul class="metro-list"><li><button type="button" class="metro-go" data-flat-buy><span>Buy</span><small>${price ? D(price) : 'Free'}</small></button></li></ul>`;
      return;
    }
    const at = wakeAt(s);
    const opt = (v: WakeAt, label: string) => `<li><button type="button" class="metro-go" data-flat-wake="${v}" aria-pressed="${at === v}"><span>${label}</span>${at === v ? '<small>Set</small>' : ''}</button></li>`;
    body.innerHTML =
      `<p class="metro-note">${note || 'Yours. Where do you wake?'}</p>` +
      `<ul class="metro-list">${opt('flat', 'Wake here')}${opt('home', 'Wake at home')}</ul>`;
  }
  function open() {
    d.opened();
    note = '';
    paint();
    card.hidden = false;
    (body.querySelector<HTMLButtonElement>('button') ?? card.querySelector<HTMLButtonElement>('[data-flat-close]'))?.focus({ preventScroll: true });
  }
  function close() {
    if (card.hidden) return false;
    card.hidden = true;
    return true;
  }
  card.querySelector('[data-flat-close]')?.addEventListener('click', close);
  body.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!b || b.disabled) return;
    const s = d.game.save();
    if (b.matches('[data-flat-buy]')) {
      const r = buyFlat(s);
      if (r.ok) {
        d.game.commit();
        d.game.sfx('buy');
        d.owned();
        note = 'The keys are yours.';
      } else {
        d.game.sfx('denied');
        note = whyNot(r.why, FLAT_LEVEL);
      }
    } else if (b.dataset.flatWake) {
      if (setWake(s, b.dataset.flatWake as WakeAt)) {
        d.game.commit();
        d.game.sfx('door', 0.5);
        note = b.dataset.flatWake === 'flat' ? "You'll wake here." : "You'll wake at home.";
      }
    }
    paint();
    body.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  });
  return { open, close };
}
export type FlatUI = ReturnType<typeof createFlatUI>;
