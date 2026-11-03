/*
 * The hub (docs/menu-plan.md Phase 2): one menu for everything that isn't a place or a shop, the game's pause
 * screen, in the menus' arcade kit (menus.css `.mk-hub`, menukit.ts). Markup `[data-hub]` in CityMap.astro.
 *
 * - Its tabs: Map (the world map, every place, the comic and the links), Bag, Business (the business card,
 *   tycoon-ui.ts), Missions (your level and badges, missions-ui.ts), Profile (profile-ui.ts), Settings (the city's
 *   time, weather and sound, the walk controls, the credits) and Online when there's a game server
 *   (multiplayer.ts). Tabs a mode can't use are hidden (`data-hub-walk`: walking only).
 * - It opens from the header's hub button (`[data-hub-open]`), Esc (index.ts: after whatever else Esc closes),
 *   Start on a gamepad (walk.ts) and the header's pills on a tab (`[data-hub-tab]`: the Dorras readout on
 *   Business, the level on Missions). The page makes it (CityMap.astro), so it works before the 3D city is up
 *   and where it can't run; the city fills in its hooks.
 * - Walking it pauses the walk (hooks.opened / closed); in the City view the city keeps turning behind it.
 * - Esc, its ×, B on a gamepad and a tap outside it close it. What opens a screen of its own from inside it (the
 *   world map, the inventory, a place's panel, the fitting room, the character screen) closes it first.
 */
import { menuKit, type Input } from './menukit';
import type { Dir } from './menunav';

export type HubTab = 'map' | 'bag' | 'business' | 'missions' | 'profile' | 'settings' | 'online';

export interface HubHooks {
  /** It opened, or closed (walking: Degen stands still, then carries on) */
  opened?(): void;
  closed?(): void;
  /** A tab is showing (Business paints the card, Missions the badges) */
  tab?(id: HubTab): void;
}

/** Phones, upright or on their side: the header's one slim row (controls.css) */
const PHONE = '(max-width: 640px), (pointer: coarse) and (max-height: 500px)';

/** Inside the hub, these open screens of their own: the hub closes first */
const OWN_SCREENS = '[data-worldmap-open], [data-inv-open], [data-dir-spot], [data-open-char], [data-open-fitting], [data-hub-leave], [data-account-open]';

export function createHub(root: HTMLElement) {
  const el = root.querySelector<HTMLElement>('[data-hub]')!;
  const openers = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-hub-open]'));
  const hooks: HubHooks = {};
  let shown = false;
  let back: HTMLElement | null = null;
  const kit = menuKit(el, {
    close: () => void close(),
    onTab: (id) => {
      if (shown) hooks.tab?.(id as HubTab);
    },
  });

  const strip = el.querySelector<HTMLElement>('[data-mk-tabs]')!;
  const tabBtn = (id: string) => strip.querySelector<HTMLButtonElement>(`[data-tab="${id}"]`);
  /** A tab this mode shows (not hidden, nor left out by the CSS: without the 3D city only Map) */
  const usable = (id: string) => {
    const b = tabBtn(id);
    return !!b && !b.hidden && getComputedStyle(b).display !== 'none';
  };
  /** Walking only, or not: the tabs and the lines that depend on the mode */
  function fit() {
    const walking = root.dataset.mode === 'walk';
    el.querySelectorAll<HTMLElement>('[data-hub-walk]').forEach((n) => (n.hidden = !walking));
    el.querySelectorAll<HTMLElement>('[data-hub-city]').forEach((n) => (n.hidden = walking));
    el.dataset.walking = String(walking);
  }

  /** Open it, on a tab (or the last one) */
  function show(tab?: HubTab) {
    fit();
    const first = Array.from(strip.querySelectorAll<HTMLButtonElement>('[data-tab]')).find((b) => usable(b.dataset.tab!))?.dataset.tab;
    const want = tab && usable(tab) ? tab : usable(kit.tab) ? kit.tab : first;
    const opening = !shown;
    if (opening) {
      shown = true;
      back = document.activeElement as HTMLElement | null;
      el.hidden = false;
      root.classList.add('is-hub', 'is-shopping');
      openers.forEach((b) => b.setAttribute('aria-expanded', 'true'));
      hooks.opened?.();
      kit.shown();
    }
    // (showing a tab tells the hooks; so does opening on the tab already showing)
    if (want) kit.showTab(want, opening && el.dataset.input !== 'touch');
    else hooks.tab?.(kit.tab as HubTab);
  }
  /** Close it (true if it was open) */
  function close() {
    if (!shown) return false;
    shown = false;
    el.hidden = true;
    root.classList.remove('is-hub', 'is-shopping');
    openers.forEach((b) => b.setAttribute('aria-expanded', 'false'));
    hooks.closed?.();
    // (the keyboard goes back where it was, if that's still there)
    if (back && back.isConnected && !el.contains(back)) back.focus({ preventScroll: true });
    back = null;
    return true;
  }

  openers.forEach((b) => b.addEventListener('click', () => (shown ? close() : show())));
  // The header's pills open it on their tab
  root.querySelectorAll<HTMLElement>('[data-hub-tab]').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.preventDefault();
      const t = b.dataset.hubTab as HubTab;
      shown && kit.tab === t ? close() : show(t);
    })
  );
  el.querySelector('[data-hub-close]')?.addEventListener('click', () => close());
  // What opens a screen of its own closes the hub first (in the capture phase, so before that screen opens)
  el.addEventListener(
    'click',
    (e) => {
      if ((e.target as HTMLElement).closest(OWN_SCREENS)) close();
    },
    true
  );
  // A tab within it (`data-hub-go`): Bag's "what you carry" goes to Business
  el.addEventListener('click', (e) => {
    const go = (e.target as HTMLElement).closest<HTMLElement>('[data-hub-go]');
    if (go) show(go.dataset.hubGo as HubTab);
  });
  el.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    close();
  });
  // A tap outside it closes it (not on its own buttons in the header, nor on the wallet's card)
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (!shown) return;
      const t = e.target as Element;
      if (el.contains(t) || t.closest?.('[data-hub-open], [data-hub-tab], [data-hub-keep], [data-account], [data-char]')) return;
      close();
    },
    true
  );

  // Phones: the emotes (multiplayer.ts) live in the Online tab, not the header (docs/controls-plan.md Phase 3).
  // Open there for good; picking one (which closes it) closes the hub, so you see the emote play.
  const emotes = root.querySelector<HTMLDetailsElement>('[data-emotes]');
  const home = emotes?.parentElement ?? null;
  const slot = el.querySelector<HTMLElement>('[data-hub-emotes]');
  const phone = matchMedia(PHONE);
  const seat = () => {
    if (!emotes || !home || !slot) return;
    const inHub = phone.matches;
    (inHub ? slot : home).append(emotes);
    emotes.open = inHub;
  };
  seat();
  phone.addEventListener('change', seat);
  emotes?.addEventListener('toggle', () => {
    if (emotes.open || !phone.matches || !slot?.contains(emotes)) return;
    emotes.open = true;
    if (!emotes.hidden) close();
  });

  return {
    hooks,
    show,
    close,
    get open() {
      return shown;
    },
    get tab() {
      return kit.tab as HubTab;
    },
    /** The tabs and lines for the mode it's in (index.ts calls it when walking starts or stops) */
    fit,
    move: (dir: Dir) => kit.move(dir),
    input: (kind: Input) => kit.input(kind),
    /** A gamepad while it's open (`edge(i)`: button i just pressed): the d-pad moves, LB / RB the tabs, A presses, B or Start closes */
    pad(edge: (i: number) => boolean, any: boolean) {
      if (any) kit.input('pad');
      if (edge(12)) kit.move('up');
      if (edge(13)) kit.move('down');
      if (edge(14)) kit.move('left');
      if (edge(15)) kit.move('right');
      if (edge(4)) kit.step(-1);
      if (edge(5)) kit.step(1);
      if (edge(0)) kit.press();
      if (edge(1) || edge(9)) close();
    },
  };
}

export type Hub = ReturnType<typeof createHub>;
