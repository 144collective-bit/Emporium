/*
 * The economy's part of the boot (tycoon.ts holds the rules, tycoon-ui.ts
 * the screens): the save (`degen-city-tycoon-v1`, brought up to date every
 * second and on return, counting the time away), the Dorras readout in the
 * header (`[data-dorras]`: your balance, a dot when the till has takings), the
 * toasts of what happened (couriers in, a contract run out, staff gone), the
 * missions, level pill and badges (missions-ui.ts) and the business card's
 * shell (its tabs, open and close). The screens themselves (the card's
 * views, the market hall and the building panels' parts) are tycoon-ui.ts, a
 * chunk fetched the first time the card or one of those panels opens (the
 * polish plan's Phase 4): nothing of the economy changes, the boot's code is
 * just smaller. `TycoonCore` is what the screens get from here.
 */
import {
  LOT_KINDS,
  START_DORRAS,
  UNIT_KINDS,
  advance,
  cleanSave,
  destAt,
  good,
  placeAt,
  plotRefund,
  roleAt,
  sells,
  DESTS,
  ROLES,
  type GoodId,
  type PlaceId,
  type Sales,
  type TycoonSave,
} from './tycoon';
import { CORNER_SHOPS } from './projects';
import { MY_STALL_DOOR, MY_STALL_NAME } from './nightmarket';
import { LOT_SITE, STALL_SPOT, UNIT_SITE } from './solids';
import type { Sfx } from './combat';
import type { WeaponId } from './combat-sim';
import type { SpotId } from '../../lib/city';
import { createMissionsUI } from './missions-ui';
import { guideAt, type GuideStep } from './guide';
import { TYCOON_KEY as KEY } from './backup';
import { lazy } from './lazy';

export const fmt = new Intl.NumberFormat('en-US');
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/** Where you stand to run a place, and where your car parks to load and unload */
export const PLACE_LIST: PlaceId[] = ['stall', 'u0', 'u1', 'u2', 'u3', 'l0', 'l1', 'l2', 'c0', 'c1', 'c2', 'c3', 'm0', 'workshop'];
export const STAND = Object.fromEntries(PLACE_LIST.map((p) => [p, placeAt(p)])) as Record<PlaceId, { x: number; z: number }>;
/** Standing this close serves a stall's or shop's customers */
const SERVE_R = 2.2;
export const UNIT_IDS = ['u0', 'u1', 'u2', 'u3'] as const;
export const LOT_IDS = ['l0', 'l1', 'l2'] as const;
/** The Units tab's places: Makers' Row's four units, then the three big lots */
export const ROW_IDS: PlaceId[] = [...UNIT_IDS, ...LOT_IDS];
/** The Trenches' corner shops (on the Units tab after them), and their names as you'd say them ("Block Bodega") */
export const CORNER_IDS = ['c0', 'c1', 'c2', 'c3'] as const;
export const cornerName = (i: number) => CORNER_SHOPS[i].name.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
/** The Night Market's stall (the polish plan's Phase 10): on the Units tab after the corner shops */
export const NIGHT_ID = 'm0' as const;
export const nightName = () => MY_STALL_NAME;
export const LETTER = 'ABC';
export type Tab = 'stall' | 'units' | 'workshop' | 'car' | 'bag';
export const TABS: { id: Tab; label: string }[] = [
  { id: 'stall', label: 'Stall' },
  { id: 'units', label: 'Units' },
  { id: 'workshop', label: 'Workshop' },
  { id: 'car', label: 'Car' },
  { id: 'bag', label: 'Bag' },
];
/** The building panels the economy fills in, by spot (the Emporium's market hall, the Workshop, the Signal tower's contracts, the Post office's couriers, the Apartments' staff) */
export const PANELS = {
  emporium: '[data-market]',
  workshop: '[data-workshop]',
  signal: '[data-contracts]',
  telegram: '[data-couriers]',
  apartments: '[data-staff]',
  vault: '[data-bank]',
} as const;
export type PanelId = keyof typeof PANELS;

export interface TycoonHooks {
  /** The hub (hub.ts): the business card is its Business tab */
  hub?: { show(tab: 'business'): void; close(): boolean; readonly open: boolean; readonly tab: string };
  /** Where Degen is standing in walk mode, on foot (null otherwise) */
  walker(): { x: number; z: number } | null;
  /** Your car, if it's out of the garage */
  car(): { x: number; z: number; model: string; name: string; speed: number } | null;
  /** Open the Emporium's market hall */
  openMarket(): void;
  /** Walking: carry a crate between the place (`at`) and your car's boot (moments.ts), then `done` moves the goods; false if he can't now (they move at once) */
  carry?(dir: 'load' | 'unload', at: { x: number; z: number }, done: () => void): boolean;
  /** Something the city shows changed (the stall's crates, the units, where contracts go) */
  stock(s: TycoonSave): void;
  /** The card opened (walk mode frees the mouse) */
  opened(): void;
  /** The sound switch (purchases, upgrades, missions claimed, level-ups) */
  sfx(kind: Sfx, gain?: number): void;
  /** Getting started's way in from the City view: open a building's panel or start walking there */
  guideGo(g: GuideStep): void;
  /** The Bag's ways in from the City view: a building's panel (the Armoury, the Night Market) */
  openSpot(id: SpotId): void;
  /** May he carry this gun (a starter his score unlocked, or one he bought): the Bag's locker */
  mayCarry(id: WeaponId): boolean;
}

/** What the screens (tycoon-ui.ts) share with the boot: the save, the card's state and the ways to repaint */
export interface TycoonCore {
  save: TycoonSave;
  h: TycoonHooks;
  root: HTMLElement;
  card: HTMLElement;
  cardBody: HTMLElement;
  tabsEl: HTMLElement;
  /** The card's tab and the Units tab's pick, the note under a view, and the building panel the economy is showing in */
  state: { tab: Tab; unitSel: number; note: string; panel: { id: PanelId; el: HTMLElement } | null };
  missions: ReturnType<typeof createMissionsUI>;
  toast(text: string, ms?: number): void;
  /** The rules changed the save: keep it and repaint everything */
  changed(): void;
  /** Nothing more is stored (a backup is being put back and the city starts again on it) */
  freeze(on: boolean): void;
  placeName(p: PlaceId): string;
  shortName(p: PlaceId): string;
  /** The place you're standing at, on foot */
  standingAt(): PlaceId | null;
  /** Standing at a stall or shop serves its customers */
  serving(): PlaceId | null;
  cardOpen(): boolean;
  openCard(at?: PlaceId | Tab): void;
  closeCard(): boolean;
}

/** The screens' side (tycoon-ui.ts), once fetched */
export interface TycoonScreens {
  paintCard(): void;
  paintPanel(): void;
  /** A building panel's part was mounted (its element is `state.panel.el`): listen on it and paint it */
  mounted(el: HTMLElement): void;
  unmounted(el: HTMLElement): void;
}

function loadSave(now: number): { save: TycoonSave; fresh: boolean; refund: number } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const o = JSON.parse(raw);
      return { save: cleanSave(o, now), fresh: false, refund: plotRefund(o) };
    }
  } catch {
    /* a broken save starts over */
  }
  return { save: cleanSave(null, now), fresh: true, refund: 0 };
}

export function createTycoonUI(root: HTMLElement, h: TycoonHooks) {
  const pill = root.querySelector<HTMLButtonElement>('[data-dorras]')!;
  const pillAmount = pill.querySelector<HTMLElement>('[data-dorras-amount]')!;
  const card = root.querySelector<HTMLElement>('[data-biz]')!;
  const cardBody = card.querySelector<HTMLElement>('[data-biz-body]')!;
  const tabsEl = card.querySelector<HTMLElement>('[data-biz-tabs]')!;
  const toastEl = root.querySelector<HTMLElement>('[data-econ-toast]')!;
  const { save, fresh, refund } = loadSave(Date.now());
  const state: TycoonCore['state'] = { tab: 'stall', unitSel: 0, note: '', panel: null };
  let toastTimer = 0;
  /** Set while a backup is being put back: nothing more is stored before the city starts again */
  let frozen = false;
  /** The screens, once their chunk is in */
  let screens: TycoonScreens | null = null;

  const store = () => {
    if (frozen) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(save));
    } catch {
      /* fine: progress just won't stick */
    }
  };
  function toast(text: string, ms = 5200) {
    toastEl.textContent = text;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('is-on'), ms);
  }
  // Missions, the level pill and badges (missions-ui.ts) run on the same save; `changed()` is hoisted
  const missions = createMissionsUI(root, { save: () => save, commit: () => changed(), toast, sfx: (kind, gain) => h.sfx(kind, gain) }, { go: (g) => h.guideGo(g) });

  /* ---------- Places ---------- */
  function placeName(p: PlaceId) {
    if (p === 'stall') return 'Your stall';
    if (p === 'workshop') return 'The Workshop';
    if (p === NIGHT_ID) return nightName();
    const i = Number(p.slice(1));
    if (p.startsWith('c')) return cornerName(i);
    if (p.startsWith('l')) {
      const l = save.lots[i];
      return `Lot ${LETTER[i]}${l?.kind ? ` · ${LOT_KINDS[l.kind].name}` : ''}`;
    }
    const u = save.units[i];
    return `Unit ${i + 1}${u?.kind ? ` · ${UNIT_KINDS[u.kind].name}` : ''}`;
  }
  const shortName = (p: PlaceId) => (p === 'stall' ? 'Stall' : p === 'workshop' ? 'Workshop' : placeName(p));
  const stands = () => Object.entries(STAND) as [PlaceId, { x: number; z: number }][];
  function standingAt(): PlaceId | null {
    const w = h.walker();
    if (!w) return null;
    for (const [p, s] of stands()) if (Math.hypot(s.x - w.x, s.z - w.z) < SERVE_R) return p;
    return null;
  }
  const serving = () => {
    const p = standingAt();
    return p && sells(save, p) ? p : null;
  };

  /* ---------- The readout ---------- */
  function paintPill() {
    const v = fmt.format(save.dorras);
    // Short in the header (12.5K), in full on the card and to screen readers
    const short = save.dorras < 10000 ? v : compact.format(save.dorras);
    if (pillAmount.textContent !== short) pillAmount.textContent = short;
    pill.classList.toggle('has-till', save.till > 0);
    pill.setAttribute('aria-label', `${v} Dorras${save.till > 0 ? `, ${fmt.format(save.till)} in the till` : ''}. Open your business`);
  }

  /* ---------- The card's shell: the screens draw into it once they're in ---------- */
  /** The card is showing: the hub open on Business (or, without a hub, the card's own panel) */
  const cardOpen = () => (h.hub ? h.hub.open && h.hub.tab === 'business' : !card.hidden);
  /** The screens' chunk (tycoon-ui.ts), fetched the first time the card or a panel's part is shown */
  const load = lazy(() => import('./tycoon-ui'), 'your business');
  function withScreens(then: (s: TycoonScreens) => void) {
    if (screens) return then(screens);
    void load().then((m) => {
      screens ??= m.createTycoonScreens(core);
      then(screens);
    });
  }
  /** Open the card on a tab, or on a place (a unit opens the Units tab on it) */
  function openCard(at?: PlaceId | Tab) {
    if (at === 'stall' || at === 'units' || at === 'workshop' || at === 'car' || at === 'bag') state.tab = at;
    else if (at?.startsWith('u') || at?.startsWith('l')) {
      state.tab = 'units';
      state.unitSel = ROW_IDS.indexOf(at);
    } else if (at?.startsWith('c')) {
      state.tab = 'units';
      state.unitSel = ROW_IDS.length + Number(at.slice(1));
    } else if (at === NIGHT_ID) {
      state.tab = 'units';
      state.unitSel = ROW_IDS.length + CORNER_IDS.length;
    }
    state.note = '';
    if (!cardOpen()) {
      if (h.hub) h.hub.show('business');
      else {
        card.hidden = false;
        root.classList.add('is-shopping', 'is-stall');
        card.querySelector<HTMLButtonElement>('[data-biz-close]')?.focus({ preventScroll: true });
      }
      h.opened();
    }
    tabsEl.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === state.tab)));
    withScreens((s) => s.paintCard());
  }
  function closeCard() {
    if (!cardOpen()) return false;
    if (h.hub) return h.hub.close();
    card.hidden = true;
    root.classList.remove('is-shopping', 'is-stall');
    return true;
  }
  pill.addEventListener('click', () => (cardOpen() ? closeCard() : openCard()));
  // Esc closes the card first (before it can close a panel or leave walk mode)
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && closeCard()) e.stopImmediatePropagation();
    },
    true
  );
  tabsEl.innerHTML = TABS.map((t) => `<button type="button" data-tab="${t.id}" aria-pressed="false">${t.label}</button>`).join('');
  // (a tab tapped before the screens are in: the screens take the card's clicks once they are)
  tabsEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-tab]');
    if (btn && !screens) openCard(btn.dataset.tab as Tab);
  });

  /* ---------- Ticking ---------- */
  let lastShown = '';
  function changed() {
    // Badges and level-ups first, so their XP is in the save that's stored
    missions.onCommit();
    store();
    paintPill();
    screens?.paintCard();
    screens?.paintPanel();
    // The city only redraws what changed (crate stacks, units, the contracts' beams)
    const shown = JSON.stringify([save.stall, save.units, save.lots, save.corners, save.contracts.map((c) => c.to), save.levels, guideAt(save)]);
    if (shown !== lastShown) {
      lastShown = shown;
      h.stock(save);
    }
  }
  /** Back after a while: one line, the two things that matter most (the short-copy rule, docs/polish-plan.md Phase 3) */
  function awayNote(s: Sales) {
    const n = (m: Partial<Record<GoodId, number>>) => Object.values(m).reduce<number>((a, b) => a + (b ?? 0), 0);
    const parts = [
      s.quit.length ? 'staff left unpaid' : '',
      s.expired.length ? `${s.expired.length} contract${s.expired.length > 1 ? 's' : ''} expired` : '',
      s.earned > 0 ? `${fmt.format(s.earned)} Dorras in the till` : '',
      n(s.grown) ? `${n(s.grown)} grown` : '',
      n(s.made) ? `${n(s.made)} made` : '',
      s.arrived.length ? `${s.arrived.length} courier${s.arrived.length > 1 ? 's' : ''} in` : '',
    ].filter(Boolean);
    return parts.length ? `While away · ${parts.slice(0, 2).join(' · ')}` : '';
  }
  function tick() {
    const sales = advance(save, Date.now(), serving() ?? false);
    // Back after a while: say what happened
    if (sales.away > 0) {
      const msg = awayNote(sales);
      if (msg) toast(msg, 7000);
    } else if (sales.quit.length) toast(`Your ${sales.quit.map((p) => ROLES[roleAt(save, p) ?? 'hand'].name.toLowerCase()).join(' and ')} left · unpaid`);
    else if (sales.expired.length) toast(`Contract expired · ${sales.expired[0].qty} ${good(sales.expired[0].good).name}`);
    else if (sales.arrived.length) toast(`Delivered · ${sales.arrived[0].qty} ${good(sales.arrived[0].good).name} to ${placeName(sales.arrived[0].to)}`, 4000);
    // (the sold-out bonus, docs/polish-plan.md Phase 9: paid straight to your balance)
    else if (sales.bonus > 0) toast(`${good(sales.soldOut[0]).name} sold out · +${fmt.format(sales.bonus)} Dorras`, 4000);
    changed();
  }

  const core: TycoonCore = {
    save,
    h,
    root,
    card,
    cardBody,
    tabsEl,
    state,
    missions,
    toast,
    changed,
    freeze: (on) => void (frozen = on),
    placeName,
    shortName,
    standingAt,
    serving,
    cardOpen,
    openCard,
    closeCard,
  };

  tick();
  if (fresh) {
    // A fresh save's first line waits until the welcome card is closed, or 20 s (the first-run pile-up,
    // docs/polish-plan.md Phase 3); phones never show the card
    const hud = root.querySelector<HTMLElement>('[data-city-hud]');
    const cardUp = () => !!hud && hud.dataset.card !== 'hidden' && !matchMedia('(max-width: 640px)').matches;
    let said = false;
    const say = () => {
      if (said) return;
      said = true;
      watch?.disconnect();
      toast(`${fmt.format(START_DORRAS)} Dorras to start · stock your stall at the market hall`, 7000);
    };
    const watch = hud && cardUp() ? new MutationObserver(() => !cardUp() && say()) : null;
    if (!watch) say();
    else {
      watch.observe(hud!, { attributes: true, attributeFilter: ['data-card'] });
      window.setTimeout(say, 20_000);
    }
  }
  // (once: Build mode was retired, and what the save's district plots cost came back)
  else if (refund) toast(`Build mode closed · ${fmt.format(refund)} Dorras refunded`, 9000);
  window.setInterval(tick, 1000);
  document.addEventListener('visibilitychange', () => !document.hidden && tick());

  return {
    openCard,
    closeCard,
    get cardOpen() {
      return cardOpen();
    },
    /** Paint the card (the hub showed its Business tab) */
    paint: () => {
      if (cardOpen()) withScreens((s) => s.paintCard());
    },
    get save() {
      return save;
    },
    /** A game screen changed the save with the rules: keep it, repaint everything */
    commit() {
      changed();
    },
    toast,
    /** The mission board, level pill and badges (missions-ui.ts) */
    missions,
    /** Your places on foot (walk-mode prompts): your stall, the four units, and your contracts' drop-offs */
    places() {
      return [
        { id: 'stall', ...STALL_SPOT, label: 'Your stall' },
        ...UNIT_IDS.map((p, i) => ({ id: p as string, ...UNIT_SITE[i].door, label: save.units[i] ? placeName(p) : `Unit ${i + 1} · To let` })),
        ...LOT_IDS.map((p, i) => ({ id: p as string, ...LOT_SITE[i].door, label: save.lots[i] ? placeName(p) : `Lot ${LETTER[i]} · For sale` })),
        ...CORNER_IDS.map((p, i) => ({ id: p as string, ...CORNER_SHOPS[i].door, label: save.corners[i] ? placeName(p) : `${cornerName(i)} · For sale` })),
        { id: NIGHT_ID as string, ...MY_STALL_DOOR, label: save.night ? nightName() : `${nightName()} · For sale` },
        ...save.contracts.map((c) => ({ id: 'car', ...destAt(c.to), label: `Deliver · ${DESTS[c.to]}` })),
      ];
    },
    /** A building's panel opened: fill in its part of the economy, if it has one (the screens' chunk fetched the first time) */
    mountPanel(id: string, panelBody: HTMLElement) {
      this.unmountPanel();
      if (!(id in PANELS)) return;
      const el = panelBody.querySelector<HTMLElement>(PANELS[id as PanelId]);
      if (!el) return;
      state.panel = { id: id as PanelId, el };
      state.note = '';
      // (the panel may have closed again before the chunk came)
      withScreens((s) => state.panel?.el === el && s.mounted(el));
    },
    unmountPanel() {
      if (state.panel) screens?.unmounted(state.panel.el);
      state.panel = null;
    },
  };
}

export type TycoonUI = ReturnType<typeof createTycoonUI>;
