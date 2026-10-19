/*
 * The gun store at the Armoury's counter: browse the guns, compare them, and
 * take one (full of ammo). Guns unlock with lifetime score; nothing is ever
 * bought and there's no money involved.
 *
 * Opens from the counter prompt in walk mode (E, a tap, or Y on a gamepad).
 * Arrow keys or the D-pad pick a gun, Enter / A takes it, Esc / B / E closes.
 */
import { WEAPONS, WEAPON_IDS, type WeaponId } from './combat-sim';

/** Small side-on silhouettes for the cards (SVG paths, 120 x 40) */
const ART: Record<WeaponId, string> = {
  rifle:
    'M6 18h18v-3h4v-3h22v3h44v4h20v5H90v4H62l-4 2-2 9h-8l1-10h-8l-6 6h-6v-6H24v3H6z M44 10h12v-4h-12z',
  smg: 'M20 16h12v-4h16v4h30v3h12v5H80v3H62v12h-7V27h-6l-3 10h-7l2-11h-6v4h-8v-4H20z M48 9h10v-3H48z',
  shotgun: 'M4 20h14l10-6h20v3h66v4H48v4h36v4H48l-6 3-2 7h-8l1-9H26l-8 4H4z M50 13h3v-2h-3z',
  dmr: 'M2 18h20l4-4h28v-5h30v5h6v5h28v4H84v4H64l-4 2-2 9h-8l1-10h-6l-5 6h-6v-6H22l-4 3H2z M58 7h22v-4H58z',
};

/** How each gun compares (0..1) for the stat bars */
const STATS: { key: string; label: string; of: (id: WeaponId) => number }[] = [
  { key: 'dmg', label: 'Damage', of: (id) => Math.min(1, (WEAPONS[id].damage * WEAPONS[id].pellets) / 90) },
  { key: 'rate', label: 'Fire rate', of: (id) => Math.min(1, WEAPONS[id].rate / 15) },
  { key: 'range', label: 'Range', of: (id) => Math.min(1, WEAPONS[id].range / 120) },
  { key: 'acc', label: 'Accuracy', of: (id) => 1 - Math.min(1, WEAPONS[id].spreadAim / 0.05) * 0.9 },
  { key: 'mag', label: 'Magazine', of: (id) => Math.min(1, WEAPONS[id].mag / 40) },
];

export interface ShopDeps {
  /** Lifetime score (decides what's unlocked) */
  lifetime(): number;
  /** The gun Degen carries, and whether he's geared up at all */
  weapon(): WeaponId;
  geared(): boolean;
  /** Take a gun (and its ammo); false if it isn't unlocked */
  equip(id: WeaponId): boolean;
  /** Opening frees the mouse; closing hands control back */
  onOpen(): void;
  onClose(): void;
}

export function createGunShop(root: HTMLElement, d: ShopDeps) {
  const el = root.querySelector<HTMLElement>('[data-shop]')!;
  const list = el.querySelector<HTMLElement>('[data-shop-list]')!;
  const score = el.querySelector<HTMLElement>('[data-shop-score]')!;
  const detail = el.querySelector<HTMLElement>('[data-shop-detail]')!;
  const takeBtn = el.querySelector<HTMLButtonElement>('[data-shop-take]')!;
  const note = el.querySelector<HTMLElement>('[data-shop-note]')!;
  let open = false;
  let pick: WeaponId = 'rifle';
  const fmt = (n: number) => Math.floor(n).toLocaleString('en');

  // One card per gun: art, name, and its state (carrying, ready to take, or locked)
  for (const id of WEAPON_IDS) {
    const w = WEAPONS[id];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'shop-card';
    b.dataset.gun = id;
    b.setAttribute('role', 'option');
    b.innerHTML = `<svg viewBox="0 0 120 40" aria-hidden="true"><path d="${ART[id]}"/></svg><b></b><small></small>`;
    b.querySelector('b')!.textContent = w.name;
    b.addEventListener('click', () => select(id));
    list.append(b);
  }
  el.querySelector('[data-shop-close]')!.addEventListener('click', () => close());
  takeBtn.addEventListener('click', () => take());

  function paint() {
    const total = d.lifetime();
    score.textContent = fmt(total);
    const carrying = d.geared() ? d.weapon() : null;
    for (const b of list.querySelectorAll<HTMLButtonElement>('[data-gun]')) {
      const id = b.dataset.gun as WeaponId;
      const w = WEAPONS[id];
      const locked = total < w.need;
      b.classList.toggle('is-locked', locked);
      b.setAttribute('aria-selected', String(id === pick));
      b.querySelector('small')!.textContent = carrying === id ? 'Carrying' : locked ? `${fmt(w.need)} pts` : 'Ready';
    }
    // The picked gun: blurb, stat bars, and what the button does
    const w = WEAPONS[pick];
    const locked = total < w.need;
    detail.querySelector('[data-shop-name]')!.textContent = w.name;
    detail.querySelector('[data-shop-blurb]')!.textContent = w.blurb;
    detail.querySelector('[data-shop-mode]')!.textContent = `${w.auto ? 'Full auto' : 'One shot per pull'} · ${w.mag} round magazine${w.pellets > 1 ? ` · ${w.pellets} pellets a shot` : ''}`;
    for (const s of STATS) {
      const bar = detail.querySelector<HTMLElement>(`[data-stat="${s.key}"] i`)!;
      bar.style.setProperty('--v', String(Math.max(0.06, s.of(pick))));
    }
    takeBtn.disabled = locked;
    takeBtn.textContent = locked ? `Unlocks at ${fmt(w.need)} pts` : carrying === pick ? 'Refill ammo' : 'Take it & gear up';
    note.textContent = locked
      ? `${fmt(w.need - total)} more points to unlock. Score by knocking down dummies and drones.`
      : 'Guns unlock with your lifetime score. Free to take, swap any time.';
  }

  function select(id: WeaponId) {
    pick = id;
    paint();
  }
  function take() {
    if (!d.equip(pick)) return;
    close();
  }
  function show() {
    if (open) return;
    open = true;
    pick = d.weapon();
    paint();
    el.hidden = false;
    root.classList.add('is-shopping');
    d.onOpen();
    // Focus the picked card so the keyboard (and screen readers) start there
    list.querySelector<HTMLButtonElement>(`[data-gun="${pick}"]`)?.focus({ preventScroll: true });
  }
  function close() {
    if (!open) return false;
    open = false;
    el.hidden = true;
    root.classList.remove('is-shopping');
    d.onClose();
    return true;
  }
  /** Step through the guns (keys, D-pad) */
  function step(dir: number) {
    const i = WEAPON_IDS.indexOf(pick);
    select(WEAPON_IDS[(i + dir + WEAPON_IDS.length) % WEAPON_IDS.length]);
    list.querySelector<HTMLButtonElement>(`[data-gun="${pick}"]`)?.focus({ preventScroll: true });
  }

  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') step(1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') step(-1);
    // Enter on a gun card takes it (instead of just picking it)
    else if (e.key === 'Enter' && (e.target as HTMLElement).closest('[data-gun]')) take();
    else return;
    e.preventDefault();
  });

  return {
    get open() {
      return open;
    },
    show,
    close,
    step,
    take,
    /** Score changed while it's open (online profile updates) */
    refresh() {
      if (open) paint();
    },
  };
}

export type GunShop = ReturnType<typeof createGunShop>;
