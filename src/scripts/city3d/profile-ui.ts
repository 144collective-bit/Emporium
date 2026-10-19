/*
 * The Profile panel in walk mode: your player name and rank badge, lifetime
 * score and rifle finish (painted by combat.ts), and a way into the
 * wardrobe (the fitting room at Drop 001, fitting.ts). This module owns the
 * look itself.
 *
 * Offline, your look is saved in this browser (`degen-city-look-v1`) and the
 * rank comes from this browser's lifetime score. Online, the profile on the
 * game server takes over: it gives you a guest name (reroll with New name)
 * and follows you across visits.
 */
import { DEFAULT_LOOK, RANKS, cleanLook, rankFor, type Look } from '../net/profile-data';
import type { OwnProfile } from '../net/protocol';
import { lookOutfit, type Outfit } from './character';

const LOOK_KEY = 'degen-city-look-v1';

const same = (a: Look, b: Look) => JSON.stringify(a) === JSON.stringify(b);

export function createProfileUI(root: HTMLElement, d: { setLook(o: Outfit): void; onLifetime(fn: (total: number) => void): void; openFitting(): void }) {
  const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const nameEl = $('[data-profile-name]');
  const rankEl = $('[data-profile-rank]');
  const renameBtn = $<HTMLButtonElement>('[data-profile-rename]');
  const note = $('[data-profile-note]');

  let look: Look = (() => {
    try {
      return cleanLook(JSON.parse(localStorage.getItem(LOOK_KEY) || 'null'));
    } catch {
      return { ...DEFAULT_LOOK };
    }
  })();
  let online: OwnProfile | null = null;
  let localTotal = 0;
  /** Told about every new look, from the server or this browser (the fitting room repaints) */
  const changeFns: ((l: Look) => void)[] = [];
  /** Told about looks this browser picked (multiplayer sends them to the server) */
  const lookFns: ((l: Look) => void)[] = [];
  const renameFns: (() => void)[] = [];

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
    try {
      localStorage.setItem(LOOK_KEY, JSON.stringify(look));
    } catch {
      /* fine */
    }
    const changed = !same(before, look);
    if (changed || !share) d.setLook(lookOutfit(look));
    if (changed) for (const f of changeFns) f(look);
    if (share) for (const f of lookFns) f(look);
  }

  $('[data-open-fitting]').addEventListener('click', () => {
    root.querySelector<HTMLDetailsElement>('[data-profile]')!.open = false;
    d.openFitting();
  });
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
  paintName();
  if (!same(look, DEFAULT_LOOK)) d.setLook(lookOutfit(look));

  return {
    get look() {
      return look;
    },
    /** Wear a new look (from the fitting room) */
    wear(next: Look) {
      apply(next);
    },
    onChange(fn: (l: Look) => void) {
      changeFns.push(fn);
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
