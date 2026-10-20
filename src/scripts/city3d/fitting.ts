/*
 * The fitting room in Drop 001's panel: pick what your Degen wears (fit,
 * headwear, bag, extras, kicks) and see it on him, turning on a podium.
 * The original wardrobe is free. The premium wardrobe (WARDROBE_CATALOG in
 * catalog.ts: jackets, hats, bags, things for the hand, the watch and two
 * colour packs) costs Dorras earned in the city and needs a level: each
 * card carries its price and level, a tap asks "Buy the ... for ...?" and
 * Confirm pays through tycoon.ts (`buyWardrobe`). Pack colours sit in the
 * Jacket / Trousers rows under a lock until the pack is bought. Only for
 * your Degen in the city: never real money, never tied to the merch store.
 *
 * The look itself lives in profile-ui.ts (saved in the browser, and on the
 * player profile when online); this is the menu and the preview.
 *
 * The preview is a small second renderer with the city's own ink outlines,
 * drawing only while the panel is open. Under reduced motion he stands
 * still (drag still turns him).
 */
import * as THREE from 'three';
import { DEFAULT_LOOK, PACKS, PACK_IDS, PALETTE, type Bag, type Hat, type Held, type Look, type PackId } from '../net/profile-data';
import { wardrobeEntry, type WardrobeEntry } from './catalog';
import { createDegen, emotePose, idlePose, lookOutfit, type Degen } from './character';
import { canvasTex, lit, toon } from './kit';
import { createPost } from './post';
import { buyWardrobe, level, ownsWardrobe } from './tycoon';
import { D, LV, fmt, whyNot, type GameDeps } from './ui';

type ColorKey = 'top' | 'bottom' | 'tie' | 'shoes' | 'hatColor' | 'bagColor' | 'lens' | 'headphones';
interface Colors {
  key: ColorKey;
  label: string;
  list: string[];
}
interface Item {
  id: string;
  name: string;
  /** 24 x 24 line icon */
  icon: string;
  /** Wearing it now? */
  on(l: Look): boolean;
  /** Put it on (or, in a tab of toggles, take it off again) */
  wear(l: Look): Look;
  /** Colours to pick once it's on */
  colors?: Colors[];
  /** Only offered with some outfits (the hood needs the hoodie) */
  only?(l: Look): boolean;
  /** Premium: its id in WARDROBE_CATALOG (bought with Dorras) */
  catalog?: string;
}
/** What a card can do: the free originals, a premium piece owned, one on sale, one for a higher level */
type State = 'free' | 'owned' | 'buy' | 'locked';
interface Tab {
  id: string;
  label: string;
  items: Item[];
  /** Items here switch on and off independently (otherwise it's one of them) */
  toggles?: boolean;
  /** Colours that belong to the tab rather than an item (lenses, kicks) */
  colors?: Colors[];
}

/** The last headphones colour, so taking them off and on again keeps it */
let lastHeadphones = PALETTE.extra[1];

const NONE = 'M12 3a9 9 0 1 0 0.01 0z M6 6l12 12';
const LOCK = 'M7 11V8a5 5 0 0 1 10 0v3 M5 11h14v10H5z';
const hatColors: Colors[] = [{ key: 'hatColor', label: 'Colour', list: PALETTE.cap }];
const bagColors: Colors[] = [{ key: 'bagColor', label: 'Colour', list: PALETTE.extra }];
const hood = (l: Look) => l.kind === 'hoodie' && l.hood;
/** The premium pieces' names come from the catalog, so the card and the confirm say the same thing */
const named = (id: string, fallback: string) => wardrobeEntry(id)?.name ?? fallback;
const hat = (id: Hat, name: string, icon: string, colors = true, catalog?: string): Item => ({
  id,
  name: catalog ? named(catalog, name) : name,
  icon,
  on: (l) => l.hat === id && !hood(l),
  wear: (l) => ({ ...l, hat: id, hood: false }),
  colors: colors ? hatColors : undefined,
  catalog,
});
const bag = (id: Bag, name: string, icon: string, catalog?: string): Item => ({
  id,
  name: catalog ? named(catalog, name) : name,
  icon,
  on: (l) => l.bag === id,
  wear: (l) => ({ ...l, bag: id }),
  colors: bagColors,
  catalog,
});
const held = (id: Held | null, name: string, icon: string, catalog?: string): Item => ({
  id: id ?? 'nothing',
  name: catalog ? named(catalog, name) : name,
  icon,
  on: (l) => l.held === id,
  wear: (l) => ({ ...l, held: id }),
  catalog,
});

const TABS: Tab[] = [
  {
    id: 'fit',
    label: 'Fit',
    items: [
      {
        id: 'suit',
        name: 'Classic Suit',
        icon: 'M8 3l4 4 4-4 4 3-2 5h-2v10H8V11H6L4 6z M12 7v7',
        on: (l) => l.kind === 'suit',
        wear: (l) => ({ ...l, kind: 'suit', hood: false }),
        colors: [
          { key: 'top', label: 'Jacket', list: PALETTE.top },
          { key: 'bottom', label: 'Trousers', list: PALETTE.bottom },
          { key: 'tie', label: 'Tie', list: PALETTE.tie },
        ],
      },
      {
        id: 'hoodie',
        name: 'Drop Hoodie',
        icon: 'M8 4c0 2 2 3 4 3s4-1 4-3l4 3-2 5h-2v9H8v-9H6L4 7z M10 15h4',
        on: (l) => l.kind === 'hoodie',
        wear: (l) => ({ ...l, kind: 'hoodie' }),
        colors: [
          { key: 'top', label: 'Hoodie', list: PALETTE.top },
          { key: 'bottom', label: 'Joggers', list: PALETTE.bottom },
        ],
      },
      {
        id: 'track',
        name: 'Track Suit',
        icon: 'M9 4h6l5 3-2 5h-2v9H8v-9H6L4 7z M12 4v17 M6 8l1.5 3 M18 8l-1.5 3',
        on: (l) => l.kind === 'track',
        wear: (l) => ({ ...l, kind: 'track', hood: false }),
        colors: [
          { key: 'top', label: 'Jacket', list: PALETTE.top },
          { key: 'bottom', label: 'Pants', list: PALETTE.bottom },
        ],
      },
      {
        id: 'varsity',
        name: named('varsity', 'Varsity Jacket'),
        icon: 'M8 3l4 2 4-2 4 3-2 5h-2v10H8V11H6L4 6z M12 5v16 M8 18h2 M14 18h2 M9 12l1.5-1.5L12 12l-1.5 1.5z',
        on: (l) => l.kind === 'varsity',
        wear: (l) => ({ ...l, kind: 'varsity', hood: false }),
        colors: [
          { key: 'top', label: 'Jacket', list: PALETTE.top },
          { key: 'bottom', label: 'Pants', list: PALETTE.bottom },
        ],
        catalog: 'varsity',
      },
      {
        id: 'puffer',
        name: named('puffer', 'Puffer Jacket'),
        icon: 'M7 4h10l4 4-2 4h-2v9H7v-9H5L3 8z M7 11h10 M7 15h10 M7 19h10',
        on: (l) => l.kind === 'puffer',
        wear: (l) => ({ ...l, kind: 'puffer', hood: false }),
        colors: [
          { key: 'top', label: 'Jacket', list: PALETTE.top },
          { key: 'bottom', label: 'Joggers', list: PALETTE.bottom },
        ],
        catalog: 'puffer',
      },
    ],
  },
  {
    id: 'head',
    label: 'Head',
    items: [
      hat('cap', 'Diamond Cap', 'M5 15a7 7 0 0 1 14 0z M12 15h9 M10 11l2-2 2 2-2 2z'),
      hat('backcap', 'Backwards Cap', 'M5 15a7 7 0 0 1 14 0z M3 15h9 M10 11h4'),
      hat('beanie', 'Street Beanie', 'M6 15a6 7 0 0 1 12 0z M5 15h14v3H5z M12 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z'),
      hat('bucket', 'Bucket Hat', 'M8 7h8l1 7H7z M3 17l4-3h10l4 3z'),
      hat('crown', 'Gold Crown', 'M4 18l1-10 4 4 3-6 3 6 4-4 1 10z M4 18h16', false),
      hat('cowboy', 'Cowboy Hat', 'M8 12V7a4 4 0 0 1 8 0v5 M2 14c3 2 6 3 10 3s7-1 10-3c0 3-4 5-10 5S2 17 2 14z M8 12h8', true, 'cowboy'),
      hat('tophat', 'Top Hat', 'M7 4h10v12H7z M3 16h18 M3 16c0 2 4 3 9 3s9-1 9-3 M7 13h10', true, 'tophat'),
      hat('halo', 'Neon Halo', 'M12 7c5 0 8-1.3 8-3s-3-3-8-3-8 1.3-8 3 3 3 8 3z M8 22c0-5 1.7-9 4-9s4 4 4 9', false, 'halo'),
      {
        id: 'hood',
        name: 'Hood Up',
        icon: 'M5 20c0-8 3-14 7-14s7 6 7 14 M9 20c0-5 1.3-8 3-8s3 3 3 8',
        only: (l) => l.kind === 'hoodie',
        on: hood,
        wear: (l) => ({ ...l, hood: true }),
      },
      {
        id: 'bare',
        name: 'Nothing',
        icon: NONE,
        on: (l) => !l.hat && !hood(l),
        wear: (l) => ({ ...l, hat: null, hood: false }),
      },
    ],
  },
  {
    id: 'shades',
    label: 'Shades',
    items: [],
    colors: [{ key: 'lens', label: 'Lenses', list: PALETTE.lens }],
  },
  {
    id: 'bag',
    label: 'Bags',
    items: [
      bag('backpack', 'Backpack', 'M7 9a5 5 0 0 1 10 0v11H7z M9 15h6 M10 4.5a2 2 0 0 1 4 0'),
      bag('crossbody', 'Crossbody', 'M5 3l12 11 M13 13h7v7h-7z'),
      bag('board', 'Skate Deck', 'M9 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M5 7h2 M17 7h2 M5 17h2 M17 17h2'),
      bag('duffel', 'Duffel Bag', 'M4 9h16a3 3 0 0 1 0 6H4a3 3 0 0 1 0-6z M9 9V7h6v2 M12 9v6', 'duffel'),
      bag('wings', 'Neon Wings', 'M12 20V8 M12 10c-2-4-5-6-9-6 1 3 3 5 5 6-2 1-3 3-3 6 3 0 5-2 7-5 M12 10c2-4 5-6 9-6-1 3-3 5-5 6 2 1 3 3 3 6-3 0-5-2-7-5', 'wings'),
      { id: 'nobag', name: 'No bag', icon: NONE, on: (l) => !l.bag, wear: (l) => ({ ...l, bag: null }) },
    ],
  },
  {
    id: 'hand',
    label: 'Hand',
    items: [
      held('gummy', 'Gummy Bag', 'M7 7h10l-1 13H8z M9.5 7V4.5h5V7 M10 12h4'),
      held('coffee', 'Iced Coffee', 'M7 8h10l-1.5 13h-7z M6.5 8a5.5 3 0 0 1 11 0 M13 5l2-3 M8 13h8'),
      held('boombox', 'Boombox', 'M3 9h18v10H3z M8 9V6h8v3 M8 14m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0 M16 14m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0'),
      held('phone', 'Phone', 'M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z M10 18h4 M9 7l2 3 2-4 2 5', 'phone'),
      held('briefcase', 'Briefcase', 'M3 8h18v12H3z M9 8V5h6v3 M3 13h18 M11 12h2v3h-2z', 'briefcase'),
      held(null, 'Empty hand', NONE),
    ],
  },
  {
    id: 'extras',
    label: 'Extras',
    toggles: true,
    items: [
      {
        id: 'headphones',
        name: 'Headphones',
        icon: 'M4 15v-3a8 8 0 0 1 16 0v3 M4 14h3v6H4z M17 14h3v6h-3z',
        on: (l) => !!l.headphones,
        wear: (l) => ({ ...l, headphones: l.headphones ? null : lastHeadphones }),
        colors: [{ key: 'headphones', label: 'Headphones', list: PALETTE.extra }],
      },
      {
        id: 'necklace',
        name: 'Diamond Chain',
        icon: 'M5 4c0 7 3 11 7 11s7-4 7-11 M12 15l-2.5 2.5L12 21l2.5-3.5z',
        on: (l) => l.necklace,
        wear: (l) => ({ ...l, necklace: !l.necklace }),
      },
      {
        id: 'chain',
        name: 'Shades Chain',
        icon: 'M3 7h7v4H3z M14 7h7v4h-7z M10 9h4 M4 11c0 6 4 9 8 9s8-3 8-9',
        on: (l) => l.chain,
        wear: (l) => ({ ...l, chain: !l.chain }),
      },
      {
        id: 'watch',
        name: named('watch', 'Gold Watch'),
        icon: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M9 7V3h6v4 M9 17v4h6v-4 M12 10v2l1.5 1',
        on: (l) => l.watch,
        wear: (l) => ({ ...l, watch: !l.watch }),
        catalog: 'watch',
      },
    ],
  },
  {
    id: 'kicks',
    label: 'Kicks',
    items: [],
    colors: [{ key: 'shoes', label: 'Kicks', list: PALETTE.shoes }],
  },
];

const svg = (d: string, size = 22) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

export interface FittingDeps {
  /** The look Degen wears now */
  look(): Look;
  /** Wear a new look (saves it, dresses the walker, tells the server) */
  apply(l: Look): void;
  /** Called whenever the look changes, from here or anywhere else (the server) */
  onChange(fn: (l: Look) => void): void;
  /** The economy: the save (Dorras, level, what's owned), buying, toasts and sounds */
  game: GameDeps;
  reduced: boolean;
  /** Phones: fewer pixels and no multisampling in the preview */
  low: boolean;
}

/** A purchase waiting for Confirm: the catalog id, and the look to wear once it's paid for */
interface Pending {
  id: string;
  then?: (l: Look) => Look;
}

export function createFitting(d: FittingDeps) {
  let el: HTMLElement | null = null;
  let tab = TABS[0];
  let preview: Preview | null = null;
  let pending: Pending | null = null;
  let tick = 0;

  /** A premium card's state, from the save: owned, on sale, or locked behind a level */
  function stateOf(it: Item): { entry: WardrobeEntry | null; state: State } {
    const entry = it.catalog ? wardrobeEntry(it.catalog) : null;
    if (!entry) return { entry: null, state: 'free' };
    const s = d.game.save();
    if (ownsWardrobe(s, entry.id)) return { entry, state: 'owned' };
    return { entry, state: level(s) < entry.level ? 'locked' : 'buy' };
  }
  const owns = (id: string) => ownsWardrobe(d.game.save(), id);

  /** Your Dorras and level, in the fitting room's head (ticks while the panel is open) */
  function paintBalance() {
    const b = el?.querySelector<HTMLElement>('[data-fit-balance]');
    if (!b) return;
    const s = d.game.save();
    const html = `${D(s.dorras)} ${LV(level(s))}`;
    if (b.dataset.html !== html) {
      b.dataset.html = html;
      b.innerHTML = html;
    }
  }

  function paintConfirm() {
    const box = el?.querySelector<HTMLElement>('[data-fit-confirm]');
    if (!box) return;
    const entry = pending ? wardrobeEntry(pending.id) : null;
    box.hidden = !entry;
    if (!entry) {
      box.replaceChildren();
      return;
    }
    box.innerHTML = `<p class="fit-confirm-text"></p><div class="fit-confirm-row"><button type="button" class="chip-link fit-confirm-yes" data-fit-buy>Confirm</button><button type="button" class="chip-link fit-confirm-no" data-fit-cancel>Cancel</button></div>`;
    const p = box.querySelector('p')!;
    p.append(`Buy the ${entry.name} for `, Object.assign(document.createElement('b'), { textContent: fmt.format(entry.price) }), ' Dorras?');
    p.append(Object.assign(document.createElement('small'), { textContent: ` ${entry.pitch}` }));
  }

  function paint() {
    if (!el) return;
    const l = d.look();
    for (const b of el.querySelectorAll<HTMLButtonElement>('[data-fit-tab]')) b.setAttribute('aria-selected', String(b.dataset.fitTab === tab.id));
    const items = el.querySelector<HTMLElement>('[data-fit-items]')!;
    items.replaceChildren();
    let premium = false;
    for (const it of tab.items) {
      if (it.only && !it.only(l)) continue;
      const { entry, state } = stateOf(it);
      // The premium pieces follow the free ones under a header
      if (entry && !premium) {
        premium = true;
        const h = document.createElement('p');
        h.className = 'fit-section';
        h.innerHTML = '<span>Premium</span> <small>Dorras earned in the city</small>';
        items.append(h);
      }
      const on = it.on(l);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `fit-item${entry ? ' is-premium' : ''}${state === 'locked' ? ' is-locked' : ''}`;
      b.dataset.item = it.id;
      b.dataset.state = state;
      b.setAttribute('aria-pressed', String(on));
      if (state === 'locked') b.setAttribute('aria-disabled', 'true');
      b.innerHTML = `${svg(it.icon)}<b></b><small></small>`;
      b.querySelector('b')!.textContent = it.name;
      const small = b.querySelector('small')!;
      if (on) small.textContent = 'Wearing';
      else if (state === 'locked') {
        small.className = 'fit-lock';
        small.innerHTML = `${svg(LOCK, 10)}<span></span>`;
        small.querySelector('span')!.textContent = `Level ${entry!.level}`;
      } else if (state === 'buy') small.textContent = `Buy · ${fmt.format(entry!.price)}`;
      else small.textContent = tab.toggles ? 'Add' : 'Wear';
      if (entry) {
        const tag = document.createElement('span');
        tag.className = 'fit-tag';
        tag.innerHTML = `${state === 'owned' ? '<i>Owned</i>' : D(entry.price)} ${LV(entry.level)}`;
        b.append(tag);
      }
      items.append(b);
    }
    items.hidden = !tab.items.length;
    // Colours for what's on in this tab
    const rows = el.querySelector<HTMLElement>('[data-fit-colors]')!;
    rows.replaceChildren();
    const sets = [...(tab.colors ?? []), ...tab.items.filter((it) => it.on(l) && (!it.only || it.only(l))).flatMap((it) => it.colors ?? [])];
    for (const c of sets) {
      if (c.key === 'tie' && l.kind !== 'suit') continue;
      const row = document.createElement('div');
      row.className = 'fit-row';
      row.innerHTML = `<span></span><div class="sw-row" role="group"></div>`;
      row.querySelector('span')!.textContent = c.label;
      const sw = row.querySelector('.sw-row')!;
      sw.setAttribute('aria-label', `${c.label} colour`);
      const swatch = (col: string, label: string, pack?: PackId) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'sw-btn';
        b.style.setProperty('--c', col);
        b.dataset.key = c.key;
        b.dataset.value = col;
        b.setAttribute('aria-pressed', String(l[c.key] === col));
        if (pack) {
          b.dataset.pack = pack;
          const entry = wardrobeEntry(pack);
          if (!owns(pack)) {
            b.classList.add('is-locked');
            b.innerHTML = svg(LOCK, 9);
            label += entry ? `, locked: ${entry.name}, ${fmt.format(entry.price)} Dorras, level ${entry.level}` : ', locked';
          }
        }
        b.setAttribute('aria-label', label);
        sw.append(b);
      };
      c.list.forEach((col, i) => swatch(col, `${c.label} colour ${i + 1}`));
      // Tops and bottoms also come in the colour packs, locked until the pack is bought
      if (c.key === 'top' || c.key === 'bottom')
        for (const pack of PACK_IDS) {
          const entry = wardrobeEntry(pack);
          const name = entry?.name ?? pack;
          const sep = document.createElement('span');
          sep.className = `sw-pack${owns(pack) ? '' : ' is-locked'}`;
          sep.textContent = name.replace(/ Pack$/, '');
          sep.title = name;
          sw.append(sep);
          PACKS[pack].forEach((col, i) => swatch(col, `${c.label} ${name} colour ${i + 1}`, pack));
        }
      rows.append(row);
    }
    paintBalance();
    paintConfirm();
  }

  function wear(next: Look, showOff = true) {
    if (next.headphones) lastHeadphones = next.headphones;
    d.apply(next);
    if (showOff) preview?.showOff();
  }

  /** Ask before paying: the confirm row under the cards */
  function ask(id: string, then?: (l: Look) => Look) {
    const entry = wardrobeEntry(id);
    if (!entry) return;
    const s = d.game.save();
    if (level(s) < entry.level) {
      d.game.sfx('denied');
      d.game.toast(whyNot('level', entry.level));
      return;
    }
    if (s.dorras < entry.price) {
      d.game.sfx('denied');
      d.game.toast(whyNot('money'));
      return;
    }
    pending = { id, then };
    paintConfirm();
    // The row sits under the cards: bring it into view before the focus lands on Confirm
    el?.querySelector<HTMLElement>('[data-fit-confirm]')?.scrollIntoView({ block: 'nearest', behavior: d.reduced ? 'auto' : 'smooth' });
    el?.querySelector<HTMLButtonElement>('[data-fit-buy]')?.focus({ preventScroll: true });
  }

  /** Confirm: pay through the rules, then wear it */
  function buy() {
    if (!pending) return;
    const { id, then } = pending;
    pending = null;
    const entry = wardrobeEntry(id);
    if (!entry) return;
    const r = buyWardrobe(d.game.save(), id);
    if (!r.ok) {
      d.game.sfx('denied');
      d.game.toast(whyNot(r.why, entry.level));
      paint();
      return;
    }
    d.game.commit();
    d.game.sfx('buy');
    d.game.toast(`${entry.name} is yours.`);
    if (then) wear(then(d.look()));
    paint();
  }

  function onClick(e: Event) {
    const t = e.target as HTMLElement;
    const tb = t.closest<HTMLButtonElement>('[data-fit-tab]');
    if (tb) {
      tab = TABS.find((x) => x.id === tb.dataset.fitTab) ?? tab;
      pending = null;
      paint();
      return;
    }
    if (t.closest('[data-fit-buy]')) {
      buy();
      return;
    }
    if (t.closest('[data-fit-cancel]')) {
      pending = null;
      paintConfirm();
      return;
    }
    const ib = t.closest<HTMLButtonElement>('[data-item]');
    if (ib) {
      const it = tab.items.find((x) => x.id === ib.dataset.item);
      if (!it) return;
      const { entry, state } = stateOf(it);
      if (entry && state !== 'owned') {
        ask(entry.id, (l) => it.wear(l));
        return;
      }
      // In a one-of tab, picking what you already wear does nothing
      if (!tab.toggles && it.on(d.look())) return;
      wear(it.wear(d.look()));
      el?.querySelector<HTMLButtonElement>(`[data-item="${it.id}"]`)?.focus({ preventScroll: true });
      return;
    }
    const sb = t.closest<HTMLButtonElement>('.sw-btn[data-key]');
    if (sb) {
      const key = sb.dataset.key as ColorKey;
      const value = sb.dataset.value!;
      const pack = sb.dataset.pack as PackId | undefined;
      // A locked pack colour offers the pack; the colour goes on once it's bought
      if (pack && !owns(pack)) {
        ask(pack, (l) => ({ ...l, [key]: value }));
        return;
      }
      wear({ ...d.look(), [key]: value }, false);
      el?.querySelector<HTMLButtonElement>(`.sw-btn[data-key="${key}"][data-value="${value}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (t.closest('[data-fit-reset]')) wear({ ...DEFAULT_LOOK });
  }

  // Arrow keys move between the tabs
  function onKey(e: KeyboardEvent) {
    const tb = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-fit-tab]');
    if (!tb || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    const i = TABS.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : -1);
    tab = TABS[(i + TABS.length) % TABS.length];
    pending = null;
    paint();
    el?.querySelector<HTMLButtonElement>(`[data-fit-tab="${tab.id}"]`)?.focus();
    e.preventDefault();
  }

  d.onChange((l) => {
    paint();
    preview?.dress(l);
  });

  return {
    /** The Drop 001 panel just opened: wire up its fitting room. `focus` scrolls to it (from Profile). */
    mount(body: HTMLElement, focus = false) {
      this.unmount();
      el = body.querySelector<HTMLElement>('[data-fit]');
      if (!el) return;
      const tabs = el.querySelector<HTMLElement>('[data-fit-tabs]')!;
      for (const t of TABS) {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.dataset.fitTab = t.id;
        b.textContent = t.label;
        tabs.append(b);
      }
      el.addEventListener('click', onClick);
      el.addEventListener('keydown', onKey);
      pending = null;
      paint();
      // Takings keep coming in while you browse: keep the balance honest
      tick = window.setInterval(paintBalance, 1000);
      const canvas = el.querySelector<HTMLCanvasElement>('[data-fit-canvas]')!;
      preview ??= createPreview(d);
      preview.attach(canvas, d.look());
      if (focus) {
        el.scrollIntoView({ block: 'start', behavior: d.reduced ? 'auto' : 'smooth' });
        el.querySelector<HTMLButtonElement>('[data-fit-tab]')?.focus({ preventScroll: true });
      }
    },
    /** The panel closed (or changed): stop drawing */
    unmount() {
      preview?.detach();
      clearInterval(tick);
      tick = 0;
      pending = null;
      el = null;
    },
  };
}

/* ---------- The turning preview ---------- */

interface Preview {
  attach(canvas: HTMLCanvasElement, l: Look): void;
  detach(): void;
  dress(l: Look): void;
  showOff(): void;
}

function createPreview(d: { reduced: boolean; low: boolean }): Preview {
  // One renderer for the page, moved to whichever canvas the panel has now
  let renderer: THREE.WebGLRenderer | null = null;
  let post: ReturnType<typeof createPost> | null = null;
  const scene = new THREE.Scene();
  // A lit backdrop, light enough that his black ink outline (and a black suit) reads against it
  scene.background = canvasTex(256, 256, (c) => {
    const g = c.createRadialGradient(128, 96, 10, 128, 128, 190);
    g.addColorStop(0, '#6a5cc4');
    g.addColorStop(0.55, '#3a2f7a');
    g.addColorStop(1, '#17122e');
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
  });
  const camera = new THREE.PerspectiveCamera(26, 1, 0.5, 30);
  camera.position.set(0, 1.05, 3.6);
  camera.lookAt(0, 0.66, 0);
  scene.add(new THREE.HemisphereLight('#d6e2ff', '#3a2f6a', 1.8));
  const key = new THREE.DirectionalLight('#ffffff', 2.4);
  key.position.set(2, 4, 3);
  scene.add(key);
  // Neon rims either side pick out dark clothes
  const rimL = new THREE.DirectionalLight('#ff6ad5', 1.6);
  rimL.position.set(-3, 2, -2);
  const rimR = new THREE.DirectionalLight('#00eaff', 1.4);
  rimR.position.set(3, 1.5, -2.5);
  scene.add(rimL, rimR);

  // The podium: a dark drum with a neon ring
  const podium = new THREE.Group();
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.14, 40), toon('#2e2752'));
  drum.position.y = -0.07;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.016, 8, 64), lit(new THREE.MeshBasicMaterial({ color: '#00eaff', toneMapped: true }), 1.6, 1.6));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.005;
  podium.add(drum, ring);
  scene.add(podium);

  const turn = new THREE.Group();
  scene.add(turn);
  let fig: Degen | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let raf = 0;
  let last = 0;
  let t = 0;
  let spin = 0.5;
  let yaw = 0.35;
  let cheer = -1;
  let drag: { x: number; yaw: number } | null = null;
  let ro: ResizeObserver | null = null;

  function dress(l: Look) {
    if (fig) {
      turn.remove(fig.g);
      fig.g.traverse((m) => (m as THREE.Mesh).geometry?.dispose());
    }
    fig = createDegen(lookOutfit(l));
    fig.g.traverse((m) => ((m as THREE.Mesh).castShadow = false));
    turn.add(fig.g);
    frame();
  }

  function size() {
    if (!renderer || !canvas || !post) return;
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    const pr = Math.min(devicePixelRatio, d.low ? 1.5 : 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    post.setSize(w, h, pr);
    camera.aspect = w / h;
    // Keep all of him in view on wide and narrow stages
    camera.fov = camera.aspect < 0.9 ? 34 : 26;
    camera.updateProjectionMatrix();
    frame();
  }

  function frame() {
    if (!renderer || !post || !fig) return;
    turn.rotation.y = yaw;
    const P = fig.pose;
    idlePose(P, t);
    if (cheer >= 0) emotePose(P, 'cheer', cheer);
    fig.update();
    post.render();
  }

  function loop(now: number) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000 || 0);
    last = now;
    t += dt;
    if (!drag) yaw += spin * dt;
    if (cheer >= 0) {
      cheer += dt;
      if (cheer > 1.1) cheer = -1;
    }
    frame();
  }

  function down(e: PointerEvent) {
    drag = { x: e.clientX, yaw };
    canvas?.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (!drag) return;
    yaw = drag.yaw + (e.clientX - drag.x) * 0.012;
    if (d.reduced) frame();
  }
  function up() {
    drag = null;
  }

  return {
    attach(c, l) {
      canvas = c;
      if (!renderer) {
        try {
          renderer = new THREE.WebGLRenderer({ canvas: c, antialias: false, alpha: false, powerPreference: 'low-power' });
        } catch {
          c.hidden = true;
          return;
        }
        renderer.toneMapping = THREE.NeutralToneMapping;
        post = createPost(renderer, scene, camera, { msaa: d.low ? 0 : 4, bloomScale: 0.5, smaa: d.low });
        // Only the podium's neon ring glows; white clothes stay clothes
        post.bloom.strength = 0.4;
        post.bloom.threshold = 0.97;
        post.ink.uniforms.fadeNear.value = 40;
      } else {
        // The panel's markup is new each time it opens: move the drawing surface over
        c.replaceWith(renderer.domElement);
        renderer.domElement.className = c.className;
        renderer.domElement.setAttribute('aria-hidden', 'true');
        canvas = renderer.domElement;
      }
      canvas.addEventListener('pointerdown', down);
      canvas.addEventListener('pointermove', move);
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', up);
      ro = new ResizeObserver(size);
      ro.observe(canvas);
      dress(l);
      size();
      // Reduced motion: drawn when something changes, never on a loop
      if (d.reduced) return;
      last = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    },
    detach() {
      cancelAnimationFrame(raf);
      raf = 0;
      ro?.disconnect();
      ro = null;
      if (canvas) {
        canvas.removeEventListener('pointerdown', down);
        canvas.removeEventListener('pointermove', move);
        canvas.removeEventListener('pointerup', up);
        canvas.removeEventListener('pointercancel', up);
      }
      canvas = null;
      drag = null;
    },
    dress(l) {
      if (canvas) dress(l);
    },
    showOff() {
      if (!d.reduced) cheer = 0;
    },
  };
}

export type Fitting = ReturnType<typeof createFitting>;
