/*
 * The Profile panel in walk mode: your player name and rank badge, lifetime
 * score and rifle finish (painted by combat.ts), and the wardrobe.
 *
 * Offline, your look is saved in this browser (`degen-city-look-v1`) and the
 * rank comes from this browser's lifetime score. Online, the profile on the
 * game server takes over: it gives you a guest name (reroll with New name)
 * and follows you across visits.
 */
import { DEFAULT_LOOK, PALETTE, RANKS, cleanLook, rankFor, type Look } from '../net/profile-data';
import type { OwnProfile } from '../net/protocol';
import { lookOutfit, type Outfit } from './character';

const LOOK_KEY = 'degen-city-look-v1';

type Row = { key: 'top' | 'bottom' | 'cap' | 'tie' | 'headphones' | 'backpack'; label: string; colors: string[]; optional: boolean };
const ROWS: Row[] = [
  { key: 'top', label: 'Top', colors: PALETTE.top, optional: false },
  { key: 'bottom', label: 'Bottom', colors: PALETTE.bottom, optional: false },
  { key: 'cap', label: 'Cap', colors: PALETTE.cap, optional: true },
  { key: 'tie', label: 'Tie', colors: PALETTE.tie, optional: false },
  { key: 'headphones', label: 'Headphones', colors: PALETTE.extra, optional: true },
  { key: 'backpack', label: 'Backpack', colors: PALETTE.extra, optional: true },
];

const same = (a: Look, b: Look) => JSON.stringify(a) === JSON.stringify(b);

export function createProfileUI(root: HTMLElement, d: { setLook(o: Outfit): void; onLifetime(fn: (total: number) => void): void }) {
  const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const nameEl = $('[data-profile-name]');
  const rankEl = $('[data-profile-rank]');
  const renameBtn = $<HTMLButtonElement>('[data-profile-rename]');
  const note = $('[data-profile-note]');
  const rows = $('[data-wardrobe-rows]');
  const hoodRow = $('[data-hood-row]');
  const hood = $<HTMLInputElement>('[data-hood]');
  const chain = $<HTMLInputElement>('[data-chain]');

  let look: Look = (() => {
    try {
      return cleanLook(JSON.parse(localStorage.getItem(LOOK_KEY) || 'null'));
    } catch {
      return { ...DEFAULT_LOOK };
    }
  })();
  let online: OwnProfile | null = null;
  let localTotal = 0;
  const lookFns: ((l: Look) => void)[] = [];
  const renameFns: (() => void)[] = [];

  // Colour swatches for each part of the outfit
  for (const r of ROWS) {
    const row = document.createElement('div');
    row.className = 'wardrobe-row';
    row.dataset.row = r.key;
    row.innerHTML = `<span>${r.label}</span><div class="sw-row"></div>`;
    const sw = row.querySelector('.sw-row')!;
    const opts = r.optional ? [null, ...r.colors] : r.colors;
    opts.forEach((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = c ? 'sw-btn' : 'sw-btn sw-none';
      if (c) b.style.setProperty('--c', c);
      b.dataset.value = c ?? '';
      b.setAttribute('aria-label', c ? `${r.label} colour ${i + (r.optional ? 0 : 1)}` : `No ${r.label.toLowerCase()}`);
      sw.append(b);
    });
    rows.append(row);
  }

  function paintLook() {
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-kind]')) b.setAttribute('aria-pressed', String(b.dataset.kind === look.kind));
    for (const r of ROWS) {
      const row = rows.querySelector<HTMLElement>(`[data-row="${r.key}"]`)!;
      row.hidden = (r.key === 'tie' && look.kind !== 'suit') || (r.key === 'cap' && look.hood);
      const v = look[r.key] ?? '';
      for (const b of row.querySelectorAll<HTMLButtonElement>('.sw-btn')) b.setAttribute('aria-pressed', String(b.dataset.value === v));
    }
    hoodRow.hidden = look.kind !== 'hoodie';
    hood.checked = look.hood;
    chain.checked = look.chain;
  }

  function paintName() {
    const total = online ? online.total : localTotal;
    const rank = online ? (RANKS.find((k) => k.id === online!.rank) ?? rankFor(total)) : rankFor(total);
    nameEl.textContent = online ? online.name : 'Degen';
    rankEl.textContent = rank.name;
    rankEl.dataset.rank = rank.id;
    renameBtn.hidden = !online;
    note.textContent = online
      ? 'Your player profile is saved online and follows you on this browser.'
      : 'Go online to get your player name. Your look and rifle finish are saved in this browser.';
  }

  /** Apply a look: dress Degen, save it here, and tell the server when online */
  function apply(next: Look, share = true) {
    const before = look;
    look = cleanLook(next);
    paintLook();
    try {
      localStorage.setItem(LOOK_KEY, JSON.stringify(look));
    } catch {
      /* fine */
    }
    if (!same(before, look) || !share) d.setLook(lookOutfit(look));
    if (share) for (const f of lookFns) f(look);
  }

  rows.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.sw-btn');
    if (!b) return;
    const key = b.closest<HTMLElement>('[data-row]')!.dataset.row as Row['key'];
    apply({ ...look, [key]: b.dataset.value || null });
  });
  for (const b of root.querySelectorAll<HTMLButtonElement>('[data-kind]')) b.addEventListener('click', () => apply({ ...look, kind: b.dataset.kind as Look['kind'] }));
  hood.addEventListener('change', () => apply({ ...look, hood: hood.checked, cap: hood.checked ? null : look.cap ?? DEFAULT_LOOK.cap }));
  chain.addEventListener('change', () => apply({ ...look, chain: chain.checked }));
  renameBtn.addEventListener('click', () => renameFns.forEach((f) => f()));
  // One panel open at a time in walk mode's top-left row (Controls, Profile, Online, Emote)
  for (const det of root.querySelectorAll<HTMLDetailsElement>('[data-pop]')) {
    det.addEventListener('toggle', () => {
      if (!det.open) return;
      for (const other of root.querySelectorAll<HTMLDetailsElement>('[data-pop]')) if (other !== det) other.open = false;
    });
  }

  d.onLifetime((total) => {
    localTotal = total;
    paintName();
  });
  paintLook();
  paintName();
  if (!same(look, DEFAULT_LOOK)) d.setLook(lookOutfit(look));

  return {
    get look() {
      return look;
    },
    /** Signed in (the server's profile) or back offline (null) */
    setOnline(p: OwnProfile | null) {
      const first = !online && !!p;
      online = p;
      if (p && first) {
        // A brand-new server profile still wears the default: bring this browser's look along
        if (same(p.look, DEFAULT_LOOK) && !same(look, DEFAULT_LOOK)) lookFns.forEach((f) => f(look));
        else if (!same(p.look, look)) apply(p.look, false);
      }
      paintName();
    },
    onLookChange(fn: (l: Look) => void) {
      lookFns.push(fn);
    },
    onRename(fn: () => void) {
      renameFns.push(fn);
    },
  };
}

export type ProfileUI = ReturnType<typeof createProfileUI>;
