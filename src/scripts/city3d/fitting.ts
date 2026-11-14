/*
 * The fitting room in Drop 001's panel: pick what your Degen wears (fit,
 * headwear, bag, extras, kicks, merch) and see it on him, turning on a
 * podium. Everything is free and open to everyone, at any level, in any
 * colour (docs/wardrobe-plan.md Phase 1, the owner's call): each colour row
 * has quick swatches and a picker for any colour (`safeColour()` keeps it a
 * shade under white). Only for your Degen in the city: never real money,
 * never tied to the merch store.
 *
 * The look itself lives in profile-ui.ts (saved in the browser, and on the
 * player profile when online); this is the menu and the preview.
 *
 * The preview is the podium stage (stage.ts): a small second renderer with
 * the city's own ink outlines, drawing only while the panel is open.
 */
import { DEFAULT_LOOK, MARKS, MARK_SLOTS, PALETTE, PATTERNS, RANGES, safeColour, type Bag, type Bottoms, type Hat, type Look, type MarkId, type PatternId, type Range, type ShoeStyle } from '../net/profile-data';
import { MARK_ART } from './marks';
import type { Stage } from './stage';

type ColorKey = 'top' | 'bottom' | 'tie' | 'shirt' | 'shoes' | 'hatColor' | 'bagColor' | 'lens' | 'headphones' | 'ink';
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
  /** Or an icon of its own (a mark's art) */
  iconHtml?: string;
  /** Wearing it now? */
  on(l: Look): boolean;
  /** Put it on (or, in a tab of toggles, take it off again) */
  wear(l: Look): Look;
  /** Colours to pick once it's on */
  colors?: Colors[];
  /** Only offered with some outfits (the hood needs the hoodie) */
  only?(l: Look): boolean;
  /** The ranges it's shown in (docs/wardrobe-plan.md Phase 2); left out, every range ("Nothing", the shades chain) */
  in?: Range[];
}
/** A slot: what part of him its cards dress (tops, bottoms, shoes, head, ...) */
interface Tab {
  id: string;
  label: string;
  items: Item[];
  /** Items here switch on and off independently (otherwise it's one of them) */
  toggles?: boolean;
  /** Colours that belong to the slot rather than an item (the lenses) */
  colors?: Colors[];
}
const STREET: Range[] = ['street'];
const BUSINESS: Range[] = ['business'];

/** The last headphones colour, so taking them off and on again keeps it */
let lastHeadphones = PALETTE.extra[1];

const NONE = 'M12 3a9 9 0 1 0 0.01 0z M6 6l12 12';
/** The picker's icon: an eyedropper */
const PICK = 'M14.5 4.5l5 5 M17 7l-9.5 9.5-3 1 1-3L15 5 M7 14l3 3';
const hatColors: Colors[] = [{ key: 'hatColor', label: 'Colour', list: PALETTE.cap }];
const bagColors: Colors[] = [{ key: 'bagColor', label: 'Colour', list: PALETTE.extra }];
const hood = (l: Look) => l.kind === 'hoodie' && l.hood;
const hat = (id: Hat, name: string, icon: string, ranges: Range[]): Item => ({
  id,
  name,
  icon,
  on: (l) => l.hat === id && !hood(l),
  wear: (l) => ({ ...l, hat: id, hood: false }),
  colors: hatColors,
  in: ranges,
});
const bag = (id: Bag, name: string, icon: string, ranges: Range[]): Item => ({
  id,
  name,
  icon,
  on: (l) => l.bag === id,
  wear: (l) => ({ ...l, bag: id }),
  colors: bagColors,
  in: ranges,
});
/** A top: the fit's kind (the bottoms and shoes are chosen on their own) */
const top = (kind: Look['kind'], name: string, icon: string, label: string, ranges: Range[], more: Colors[] = []): Item => ({
  id: kind,
  name,
  icon,
  on: (l) => l.kind === kind,
  wear: (l) => ({ ...l, kind, hood: kind === 'hoodie' && l.hood }),
  colors: [{ key: 'top', label, list: PALETTE.top }, ...more],
  in: ranges,
});
const bottomColors: Colors[] = [{ key: 'bottom', label: 'Colour', list: PALETTE.bottom }];
const bottoms = (id: Bottoms, name: string, icon: string, ranges: Range[]): Item => ({
  id,
  name,
  icon,
  on: (l) => l.bottoms === id,
  wear: (l) => ({ ...l, bottoms: id }),
  colors: bottomColors,
  in: ranges,
});
const shoeColors: Colors[] = [{ key: 'shoes', label: 'Colour', list: PALETTE.shoes }];
const shoes = (id: ShoeStyle, name: string, icon: string, ranges: Range[]): Item => ({
  id,
  name,
  icon,
  on: (l) => l.shoeStyle === id,
  wear: (l) => ({ ...l, shoeStyle: id }),
  colors: shoeColors,
  in: ranges,
});
/** The range his top is from: where the fitting room opens */
const rangeOf = (l: Look): Range => (l.kind === 'suit' ? 'business' : 'street');

/* ----- The merch: marks for the top, the hat and the sneakers, and prints for the top ----- */

type MerchFor = 'top' | 'hat' | 'kicks' | 'print';
const MERCH_FOR: { id: MerchFor; name: string }[] = [
  { id: 'top', name: 'Top' },
  { id: 'hat', name: 'Hat' },
  { id: 'kicks', name: 'Kicks' },
  { id: 'print', name: 'Print' },
];
/** A mark's art as an icon, in the card's own colour */
const markIcon = (id: MarkId, size = 26) => {
  const a = MARK_ART[id];
  const path = (d: string | undefined, attrs: string) => (d ? `<path d="${d}" ${attrs}/>` : '');
  return (
    `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" stroke-linejoin="round" stroke-linecap="round">` +
    path(a.stroke, `fill="none" stroke="currentColor" stroke-width="${a.width ?? 8}"`) +
    path(a.fill, 'fill="currentColor" stroke="#0b0a12" stroke-width="4"') +
    path(a.dark, 'fill="#0b0a12"') +
    path(a.line, 'fill="none" stroke="#0b0a12" stroke-width="5"') +
    '</svg>'
  );
};
const PRINT_ICONS: Record<PatternId, string> = {
  plain: 'M4 4h16v16H4z',
  stripes: 'M4 4h16v16H4z M4 9.3h16 M4 14.7h16',
  checks: 'M4 4h16v16H4z M12 4v16 M4 12h16 M4 4h8v8H4z M12 12h8v8h-8z',
  fade: 'M4 4h16v16H4z M4 16h16 M4 12h16 M7 20v-4 M11 20v-4 M15 20v-4 M9 16v-4 M13 16v-4',
  camo: 'M4 4h16v16H4z M7 9c1-2 4-2 5 0s-1 3-3 3-3-1-2-3z M13 15c1-1.5 4-1.5 4.5 0s-1 2.5-2.5 2.5-2.5-1-2-2.5z M15 7.5c.7-1 2.3-1 2.7 0',
};
/** The cards for what the Merch tab is dressing */
function merchItems(of: MerchFor): Item[] {
  const markCard = (id: MarkId, key: 'mark' | 'hatMark' | 'shoeMark'): Item => ({
    id: `${key}-${id}`,
    name: MARKS.find((m) => m.id === id)!.name,
    icon: '',
    iconHtml: markIcon(id),
    on: (l) => l[key] === id,
    wear: (l) => ({ ...l, [key]: id }),
  });
  if (of === 'print')
    return PATTERNS.map((p) => ({
      id: `print-${p.id}`,
      name: p.name,
      icon: PRINT_ICONS[p.id],
      on: (l) => l.pattern === p.id,
      wear: (l) => ({ ...l, pattern: p.id }),
    }));
  const key = of === 'top' ? 'mark' : of === 'hat' ? 'hatMark' : 'shoeMark';
  const cards = MARKS.map((m) => markCard(m.id, key));
  // A hat always carries its patch; the top and the sneakers can go without
  if (of !== 'hat') cards.unshift({ id: `${key}-none`, name: 'No mark', icon: NONE, on: (l) => !l[key], wear: (l) => ({ ...l, [key]: null }) });
  return cards;
}
/** Can what the Merch tab is dressing be seen? (Else a note says what shows it) */
function merchNote(of: MerchFor, l: Look): string | null {
  if (of === 'hat' && !((l.hat === 'cap' || l.hat === 'backcap' || l.hat === 'beanie') && !(l.kind === 'hoodie' && l.hood))) return 'Shows on a cap or beanie';
  if (of === 'kicks' && l.shoeStyle !== 'sneaker') return 'Shows on sneakers';
  return null;
}

/** The slots, each across every range (docs/wardrobe-plan.md Phase 2): a card shows in the ranges it's in */
const TABS: Tab[] = [
  {
    id: 'tops',
    label: 'Tops',
    items: [
      top('suit', 'Classic Suit', 'M8 3l4 4 4-4 4 3-2 5h-2v10H8V11H6L4 6z M12 7v7', 'Jacket', BUSINESS, [
        { key: 'shirt', label: 'Shirt', list: PALETTE.shirt },
        { key: 'tie', label: 'Tie', list: PALETTE.tie },
      ]),
      top('hoodie', 'Drop Hoodie', 'M8 4c0 2 2 3 4 3s4-1 4-3l4 3-2 5h-2v9H8v-9H6L4 7z M10 15h4', 'Hoodie', STREET),
      top('track', 'Track Jacket', 'M9 4h6l5 3-2 5h-2v9H8v-9H6L4 7z M12 4v17 M6 8l1.5 3 M18 8l-1.5 3', 'Jacket', STREET),
      top('varsity', 'Varsity Jacket', 'M8 3l4 2 4-2 4 3-2 5h-2v10H8V11H6L4 6z M12 5v16 M8 18h2 M14 18h2 M9 12l1.5-1.5L12 12l-1.5 1.5z', 'Jacket', STREET),
      top('puffer', 'Puffer Jacket', 'M7 4h10l4 4-2 4h-2v9H7v-9H5L3 8z M7 11h10 M7 15h10 M7 19h10', 'Jacket', STREET),
    ],
  },
  {
    id: 'bottoms',
    label: 'Bottoms',
    items: [
      bottoms('trousers', 'Suit Trousers', 'M7 3h10l1 18h-4l-2-11-2 11H6z M12 3v4', BUSINESS),
      bottoms('joggers', 'Joggers', 'M7 3h10l1 16h-4l-2-9-2 9H6z M6 19h4 M14 19h4 M7 6h10', STREET),
      bottoms('trackpants', 'Track Pants', 'M7 3h10l1 16h-4l-2-9-2 9H6z M6 19h4 M14 19h4 M7.5 4l-1 14 M16.5 4l1 14', STREET),
    ],
  },
  {
    id: 'shoes',
    label: 'Shoes',
    items: [
      shoes('dress', 'Dress Shoes', 'M3 16h14c2 0 4 1 4 2.5V19H3z M3 16v-3h5l3 3', BUSINESS),
      shoes('sneaker', 'Sneakers', 'M3 13h5l3 3h6c2 0 4 1 4 3v1H3z M3 18h18 M10 15l1-1 M12 16l1-1', STREET),
    ],
  },
  {
    id: 'head',
    label: 'Head',
    items: [
      hat('cap', 'Diamond Cap', 'M5 15a7 7 0 0 1 14 0z M12 15h9 M10 11l2-2 2 2-2 2z', ['street', 'work']),
      hat('backcap', 'Backwards Cap', 'M5 15a7 7 0 0 1 14 0z M3 15h9 M10 11h4', STREET),
      hat('beanie', 'Street Beanie', 'M6 15a6 7 0 0 1 12 0z M5 15h14v3H5z M12 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z', ['street', 'work']),
      hat('bucket', 'Bucket Hat', 'M8 7h8l1 7H7z M3 17l4-3h10l4 3z', STREET),
      {
        id: 'hood',
        name: 'Hood Up',
        icon: 'M5 20c0-8 3-14 7-14s7 6 7 14 M9 20c0-5 1.3-8 3-8s3 3 3 8',
        only: (l) => l.kind === 'hoodie',
        on: hood,
        wear: (l) => ({ ...l, hood: true }),
        in: STREET,
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
      bag('backpack', 'Backpack', 'M7 9a5 5 0 0 1 10 0v11H7z M9 15h6 M10 4.5a2 2 0 0 1 4 0', ['street', 'work']),
      bag('crossbody', 'Crossbody', 'M5 3l12 11 M13 13h7v7h-7z', STREET),
      bag('board', 'Skate Deck', 'M9 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M5 7h2 M17 7h2 M5 17h2 M17 17h2', STREET),
      bag('duffel', 'Duffel Bag', 'M4 9h16a3 3 0 0 1 0 6H4a3 3 0 0 1 0-6z M9 9V7h6v2 M12 9v6', ['street', 'business', 'work']),
      { id: 'nobag', name: 'No bag', icon: NONE, on: (l) => !l.bag, wear: (l) => ({ ...l, bag: null }) },
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
        in: ['street', 'work'],
      },
      {
        id: 'necklace',
        name: 'Diamond Chain',
        icon: 'M5 4c0 7 3 11 7 11s7-4 7-11 M12 15l-2.5 2.5L12 21l2.5-3.5z',
        on: (l) => l.necklace,
        wear: (l) => ({ ...l, necklace: !l.necklace }),
        in: STREET,
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
        name: 'Gold Watch',
        icon: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M9 7V3h6v4 M9 17v4h6v-4 M12 10v2l1.5 1',
        on: (l) => l.watch,
        wear: (l) => ({ ...l, watch: !l.watch }),
      },
    ],
  },
  // (its cards depend on what it's dressing: merchItems(); every range)
  { id: 'merch', label: 'Merch', items: [] },
];
/** A slot's cards in a range (and the hood only with the hoodie) */
const cardsIn = (items: Item[], r: Range, l: Look) => items.filter((it) => (!it.in || it.in.includes(r)) && (!it.only || it.only(l)));
/** Whether a range has anything of its own in a slot (not only "Nothing" or "No bag") */
const ownIn = (items: Item[], r: Range) => items.some((it) => it.in?.includes(r));

const svg = (d: string, size = 22) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

export interface FittingDeps {
  /** The look Degen wears now */
  look(): Look;
  /** Wear a new look (saves it, dresses the walker, tells the server) */
  apply(l: Look): void;
  /** Called whenever the look changes, from here or anywhere else (the server) */
  onChange(fn: (l: Look) => void): void;
  reduced: boolean;
  /** Phones: fewer pixels and no multisampling in the preview */
  low: boolean;
}

/** While a colour is dragged round the picker, the look changes at most this often (ms): each change dresses him again */
const PICK_EVERY = 120;

export function createFitting(d: FittingDeps) {
  let el: HTMLElement | null = null;
  let tab = TABS[0];
  /** The range browsed (Streetwear, Business, Work): set from his top when the room opens */
  let range: Range = 'street';
  let preview: Stage | null = null;
  let merchFor: MerchFor = 'top';
  /** A colour being picked: the latest, worn at most every PICK_EVERY ms, and at once when the picker closes */
  let picked: { key: ColorKey; value: string } | null = null;
  let pickTimer = 0;
  const itemsOf = (t: Tab) => (t.id === 'merch' ? merchItems(merchFor) : t.items);

  /** The Merch tab's own rows over its cards: what it's dressing, where the top's mark goes, and a note if it won't show */
  function paintMerch(l: Look) {
    const box = el?.querySelector<HTMLElement>('[data-fit-merch]');
    if (!box) return;
    box.hidden = tab.id !== 'merch';
    if (box.hidden) return box.replaceChildren();
    const chips = (label: string, attr: string, opts: { id: string; name: string; on: boolean }[]) =>
      `<div class="fit-row"><span>${label}</span><div class="fit-chips" role="group" aria-label="${label}">` +
      opts.map((o) => `<button type="button" class="fit-chip" ${attr}="${o.id}" aria-pressed="${o.on}">${o.name}</button>`).join('') +
      '</div></div>';
    let html = chips(
      'Dress',
      'data-merch-for',
      MERCH_FOR.map((m) => ({ ...m, on: m.id === merchFor }))
    );
    if (merchFor === 'top' && l.mark)
      html += chips(
        'Where',
        'data-mark-at',
        MARK_SLOTS.map((m) => ({ id: m.id, name: m.id === 'centre' && l.kind === 'suit' ? 'Front (pin)' : m.name, on: m.id === l.markAt }))
      );
    const note = merchNote(merchFor, l);
    if (note) html += `<p class="fit-note">${note}</p>`;
    if (box.dataset.html !== html) {
      box.dataset.html = html;
      box.innerHTML = html;
    }
  }

  /** The colour rows for what's on in this tab */
  function colourSets(l: Look): Colors[] {
    // (what he wears in this slot, whichever range it's from: a suit's colours while browsing Streetwear)
    const list = itemsOf(tab);
    const sets = [...(tab.colors ?? []), ...list.filter((it) => it.on(l) && (!it.only || it.only(l))).flatMap((it) => it.colors ?? [])];
    // (the marks' ink, shared by the top, the hat and the sneakers)
    if (tab.id === 'merch' && merchFor !== 'print') sets.push({ key: 'ink', label: 'Ink', list: PALETTE.ink });
    return sets.filter((c) => c.key !== 'tie' || l.kind === 'suit');
  }

  /**
   * The colour rows: quick swatches and a picker for any colour. Built again only when the rows themselves change
   * (another item, another tab); otherwise brought up to date where they are, so a picker that's open stays open
   * while its colour goes on him.
   */
  function paintColours(l: Look) {
    const rows = el?.querySelector<HTMLElement>('[data-fit-colors]');
    if (!rows) return;
    const sets = colourSets(l);
    const sig = sets.map((c) => c.key).join(',');
    if (rows.dataset.sig !== sig) {
      rows.dataset.sig = sig;
      rows.replaceChildren();
      for (const c of sets) {
        const row = document.createElement('div');
        row.className = 'fit-row';
        row.innerHTML = `<span></span><div class="sw-row" role="group"></div>`;
        row.querySelector('span')!.textContent = c.label;
        const sw = row.querySelector('.sw-row')!;
        sw.setAttribute('aria-label', `${c.label} colour`);
        c.list.forEach((col, i) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'sw-btn';
          b.style.setProperty('--c', col);
          b.dataset.key = c.key;
          b.dataset.value = col;
          b.setAttribute('aria-label', `${c.label} colour ${i + 1}`);
          sw.append(b);
        });
        // Any colour: the browser's own picker, under a swatch of its own
        const pick = document.createElement('label');
        pick.className = 'sw-pick';
        pick.dataset.pickFor = c.key;
        pick.title = 'Any colour';
        pick.innerHTML = `${svg(PICK, 13)}<input type="color" data-pick="${c.key}">`;
        pick.querySelector('input')!.setAttribute('aria-label', `${c.label}: any colour`);
        sw.append(pick);
        rows.append(row);
      }
    }
    // (what's worn now: its swatch pressed, or the picker lit in it)
    for (const c of sets) {
      const now = (l[c.key] as string | null) ?? '';
      let listed = false;
      for (const b of rows.querySelectorAll<HTMLButtonElement>(`.sw-btn[data-key="${c.key}"]`)) {
        const on = b.dataset.value === now;
        listed ||= on;
        b.setAttribute('aria-pressed', String(on));
      }
      const pick = rows.querySelector<HTMLElement>(`[data-pick-for="${c.key}"]`);
      const input = pick?.querySelector<HTMLInputElement>('input');
      if (!pick || !input) continue;
      pick.classList.toggle('is-on', !!now && !listed);
      if (now && !listed) pick.style.setProperty('--c', now);
      else pick.style.removeProperty('--c');
      if (now && picked?.key !== c.key && document.activeElement !== input) input.value = now;
    }
  }

  function paint() {
    if (!el) return;
    const l = d.look();
    for (const b of el.querySelectorAll<HTMLButtonElement>('[data-fit-range]')) b.setAttribute('aria-pressed', String(b.dataset.fitRange === range));
    for (const b of el.querySelectorAll<HTMLButtonElement>('[data-fit-tab]')) b.setAttribute('aria-selected', String(b.dataset.fitTab === tab.id));
    const items = el.querySelector<HTMLElement>('[data-fit-items]')!;
    items.replaceChildren();
    const all = itemsOf(tab);
    const list = cardsIn(all, range, l);
    // (a slot the range has nothing of its own in yet: say so over its "Nothing" card)
    const empty = el.querySelector<HTMLElement>('[data-fit-empty]');
    if (empty) {
      const none = tab.items.length > 0 && !ownIn(tab.items, range);
      empty.hidden = !none;
      empty.textContent = none ? (range === 'work' ? 'Work wear is coming soon.' : `No ${tab.label.toLowerCase()} in ${RANGES.find((r) => r.id === range)!.name} yet.`) : '';
    }
    for (const it of list) {
      const on = it.on(l);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'fit-item';
      b.dataset.item = it.id;
      b.setAttribute('aria-pressed', String(on));
      b.innerHTML = `${it.iconHtml ?? svg(it.icon)}<b></b><small></small>`;
      // A mark's card shows it in your ink
      if (it.iconHtml) {
        b.classList.add('is-mark');
        b.style.setProperty('--mark', l.ink);
      }
      b.querySelector('b')!.textContent = it.name;
      b.querySelector('small')!.textContent = on ? 'Wearing' : tab.toggles ? 'Add' : 'Wear';
      items.append(b);
    }
    items.hidden = !list.length;
    paintMerch(l);
    paintColours(l);
  }

  function wear(next: Look, showOff = true) {
    if (next.headphones) lastHeadphones = next.headphones;
    d.apply(next);
    if (showOff) preview?.showOff();
  }

  /** Wear the colour being picked (the picker's latest) */
  function wearPicked() {
    clearTimeout(pickTimer);
    pickTimer = 0;
    if (!picked) return;
    const { key, value } = picked;
    if (d.look()[key] !== value) wear({ ...d.look(), [key]: value }, false);
  }
  function onPick(e: Event) {
    const input = (e.target as HTMLElement).closest<HTMLInputElement>('input[data-pick]');
    if (!input) return;
    const value = safeColour(input.value);
    if (!value) return;
    picked = { key: input.dataset.pick as ColorKey, value };
    // (the picker closed: the colour goes on now, and the picker's own value is worn as it was kept)
    if (e.type === 'change') {
      wearPicked();
      picked = null;
      paintColours(d.look());
    } else if (!pickTimer) pickTimer = window.setTimeout(wearPicked, PICK_EVERY);
  }

  function onClick(e: Event) {
    const t = e.target as HTMLElement;
    const tb = t.closest<HTMLButtonElement>('[data-fit-tab]');
    if (tb) {
      tab = TABS.find((x) => x.id === tb.dataset.fitTab) ?? tab;
      paint();
      return;
    }
    const rb = t.closest<HTMLButtonElement>('[data-fit-range]');
    if (rb) {
      range = (rb.dataset.fitRange as Range) ?? range;
      paint();
      el?.querySelector<HTMLButtonElement>(`[data-fit-range="${range}"]`)?.focus({ preventScroll: true });
      return;
    }
    const mf = t.closest<HTMLButtonElement>('[data-merch-for]');
    if (mf) {
      merchFor = mf.dataset.merchFor as MerchFor;
      paint();
      el?.querySelector<HTMLButtonElement>(`[data-merch-for="${merchFor}"]`)?.focus({ preventScroll: true });
      return;
    }
    const ma = t.closest<HTMLButtonElement>('[data-mark-at]');
    if (ma) {
      wear({ ...d.look(), markAt: ma.dataset.markAt as Look['markAt'] }, false);
      el?.querySelector<HTMLButtonElement>(`[data-mark-at="${ma.dataset.markAt}"]`)?.focus({ preventScroll: true });
      return;
    }
    const ib = t.closest<HTMLButtonElement>('[data-item]');
    if (ib) {
      const it = itemsOf(tab).find((x) => x.id === ib.dataset.item);
      if (!it) return;
      // In a one-of tab, picking what you already wear does nothing
      if (!tab.toggles && it.on(d.look())) return;
      wear(it.wear(d.look()));
      el?.querySelector<HTMLButtonElement>(`[data-item="${it.id}"]`)?.focus({ preventScroll: true });
      return;
    }
    const sb = t.closest<HTMLButtonElement>('.sw-btn[data-key]');
    if (sb) {
      wear({ ...d.look(), [sb.dataset.key as ColorKey]: sb.dataset.value! }, false);
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
      // The ranges, then the slots (docs/wardrobe-plan.md Phase 2); it opens on his top's range
      range = rangeOf(d.look());
      const ranges = el.querySelector<HTMLElement>('[data-fit-ranges]');
      for (const r of RANGES) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'fit-chip';
        b.dataset.fitRange = r.id;
        b.textContent = r.name;
        ranges?.append(b);
      }
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
      el.addEventListener('input', onPick);
      el.addEventListener('change', onPick);
      paint();
      const canvas = el.querySelector<HTMLCanvasElement>('[data-fit-canvas]')!;
      // (the stage comes in its own chunk the first time: it's only for this and the character screen)
      const at = el;
      void import('./stage').then(({ createStage }) => {
        if (el !== at || !at.contains(canvas)) return;
        preview ??= createStage(d);
        preview.attach(canvas, d.look());
      });
      if (focus) {
        el.scrollIntoView({ block: 'start', behavior: d.reduced ? 'auto' : 'smooth' });
        el.querySelector<HTMLButtonElement>('[data-fit-tab]')?.focus({ preventScroll: true });
      }
    },
    /** The panel closed (or changed): stop drawing (a colour mid-pick goes on first) */
    unmount() {
      wearPicked();
      picked = null;
      preview?.detach();
      el = null;
    },
  };
}

export type Fitting = ReturnType<typeof createFitting>;
