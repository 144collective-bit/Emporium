/*
 * The garage menu, opened at the garage office's door in walk mode: the
 * dealership and tuning shop. Cards for the eight models (PLAYER_CARS): the
 * five starters are yours from the start, the other three are for sale for
 * Dorras (CAR_CATALOG in catalog.ts, with a level each; a card you can't buy
 * yet is dimmed with its level). Picking any card shows it on the showroom
 * turntable out front while the camera looks on, with its stat bars (the
 * model's numbers plus a bright bonus for the mods fitted), how much it
 * carries (the roof rack counts), the paint picker (paint is free) and:
 *
 * - for a car you don't own, a Buy button that asks once ("Buy the ... for
 *   18,000 Dorras?") and then goes through the rules (buyCar in tycoon.ts;
 *   a refusal is said in words, whyNot);
 * - for one you own, the Tune section: the four mods (CAR_MODS), three
 *   levels each with the next level's cost, bought with modCar.
 *
 * Every change goes through the shared GameDeps (ui.ts): the save, commit()
 * to keep it and repaint the other screens, a toast and the sounds. The
 * balance sits in the header and the whole panel is painted again after
 * every change (and once a second while it's open, as takings come in).
 *
 * Keep saves the car you're driving (in the browser, mycar.ts) and only
 * works on a car you own; closing without keeping puts your saved car back.
 * If your car is out on the streets, Keep also calls it home. Nothing here
 * is real money and nothing is tied to the store or the token.
 *
 * The tabs (vehicle plan Phase 5): Model (the cards, the stats and the
 * deal), Paint, and the free customisation, Wheels, Kit, Livery and Glow
 * (`STYLE`: rows of choices from carlook.ts; every pick shows on the
 * turntable, Keep saves it with the car as its `look`).
 *
 * Bikes (vehicle plan Phase 7): the Model tab's Cars / Bikes switch shows
 * your motorbikes instead (`kind`), bought and tuned the same way (the save's
 * garage holds both; the roof rack is a top box), painted on the Paint tab,
 * shown on their stand by the turntable; the four style tabs are the cars'.
 * Keep saves the car and the bike you've picked (each only if it's yours).
 *
 * Arrow keys or the D-pad pick a model (up / down on the pad: the paint; the
 * bumpers: the tabs), Enter / A keeps it, Esc / B / F closes.
 */
import { CAR_CATALOG, CAR_MODS, CAR_MOD_IDS, MOD_LEVELS, garageEntry, type CarModId, type GarageId } from './catalog';
import { BIKES, BIKE_CARGO, BIKE_DRIVE, BIKE_KEY, PLAYER_BIKES, loadBike, type BikeId, type MyBike } from './mybike';
import { CARS } from './cars';
import {
  CAR_KEY,
  CAR_MARKS,
  CAR_PAINTS,
  CARGO,
  DIFFUSERS,
  DRIVE,
  GLOWS,
  LIVERIES,
  PLAYER_CARS,
  RIMS,
  RIM_COLOURS,
  RIM_SIZES,
  SKIRTS,
  SPLITTERS,
  SPOILERS,
  loadCar,
  type CarLook,
  type MyCar,
  type PaintId,
  type PlayerCar,
} from './mycar';
import {
  DIFFUSER_NAMES,
  GLOW_HEX,
  GLOW_NAMES,
  LIVERY_NAMES,
  MARK_NAMES,
  NUMBERS,
  RIM_COLOUR_NAMES,
  RIM_HEX,
  RIM_NAMES,
  RIM_SIZE_NAMES,
  SKIRT_NAMES,
  SPLITTER_NAMES,
  SPOILER_NAMES,
  STOCK_PARTS,
  sameLook,
} from './carlook';
import { buyCar, carModCost, carMods, carStatsOf, level, modCar, ownsCar } from './tycoon';
import { COIN, D, LV, esc, fmt, repaint, whyNot, type GameDeps } from './ui';

function saveCar(c: MyCar) {
  try {
    localStorage.setItem(CAR_KEY, JSON.stringify(c));
  } catch {
    /* fine: the car just won't stick */
  }
}

function saveBike(b: MyBike) {
  try {
    localStorage.setItem(BIKE_KEY, JSON.stringify(b));
  } catch {
    /* fine: the bike just won't stick */
  }
}

/** A bike side-on at the cars' scale: its wheels, and its line from the tail over the seat to the bars */
function bikeArt(id: BikeId) {
  const s = BIKES[id];
  const k = 32;
  const pt = (x: number, y: number) => `${(55 + x * k).toFixed(1)},${(44 - y * k).toFixed(1)}`;
  const [ra, fa] = s.axles;
  const body = [pt(-s.L / 2 + 0.05, s.seat[1] - 0.04), pt(s.seat[0] + 0.25, s.seat[1] + 0.06), pt(s.bars[0] + 0.1, s.bars[1]), pt(fa, s.r), pt(fa - s.r, s.r * 1.6), pt(ra + s.r, s.r * 1.6), pt(ra, s.r)];
  const wheels = [ra, fa].map((x) => `<circle class="wheel" cx="${(55 + x * k).toFixed(1)}" cy="${(44 - s.r * k).toFixed(1)}" r="${(s.r * k).toFixed(1)}"/>`).join('');
  return `<svg viewBox="0 0 110 46" aria-hidden="true"><path d="M${body.join('L')}Z"/>${wheels}</svg>`;
}

/** A side-on silhouette from the model's own outline, all at one scale so sizes compare (110 x 46) */
function art(id: PlayerCar) {
  const s = CARS[id];
  const k = 32;
  const pt = ([x, y]: readonly [number, number]) => `${(55 + x * k).toFixed(1)},${(44 - y * k).toFixed(1)}`;
  const body = [[s.L / 2, s.clr] as const, ...s.top, [-s.L / 2, s.clr] as const];
  const wheels = s.axles.map((x) => `<circle class="wheel" cx="${(55 + x * k).toFixed(1)}" cy="${(44 - s.r * k).toFixed(1)}" r="${(s.r * k).toFixed(1)}"/>`).join('');
  return `<svg viewBox="0 0 110 46" aria-hidden="true"><path d="M${s.cabin.map(pt).join('L')}Z"/><path d="M${body.map(pt).join('L')}Z"/>${wheels}</svg>`;
}

/** A bike's fourth mod: the roof rack's place, a top box */
const TOP_BOX = { name: 'Top box', blurb: 'Carries a quarter more goods each level.' };

/** The three stat bars, and the mod that raises each */
const STATS: { key: 'speed' | 'accel' | 'grip'; label: string; mod: CarModId }[] = [
  { key: 'speed', label: 'Top speed', mod: 'engine' },
  { key: 'accel', label: 'Pick-up', mod: 'turbo' },
  { key: 'grip', label: 'Grip', mod: 'tyres' },
];

/** The menu's tabs */
const TABS = [
  ['model', 'Model'],
  ['paint', 'Paint'],
  ['wheels', 'Wheels'],
  ['kit', 'Kit'],
  ['livery', 'Livery'],
  ['glow', 'Glow'],
] as const;
type Tab = (typeof TABS)[number][0];

/** A row of choices on a style tab: which part of the look, its label, the ids and their names, and swatches if they're colours */
interface Row {
  key: keyof CarLook;
  label: string;
  ids: readonly (string | number)[];
  name(v: string | number): string;
  swatch?(v: string | number, car: PlayerCar): string;
}
const row = <K extends keyof CarLook>(key: K, label: string, ids: readonly CarLook[K][], names: Record<string, string> | ((v: CarLook[K]) => string), swatch?: Row['swatch']): Row => ({
  key,
  label,
  ids: ids as readonly (string | number)[],
  name: (v) => (typeof names === 'function' ? names(v as CarLook[K]) : names[String(v)]),
  swatch,
});
const paintName = (v: string | number) => CAR_PAINTS.find((p) => p.id === v)!.name;
const STYLE: Record<Exclude<Tab, 'model' | 'paint'>, Row[]> = {
  wheels: [
    row('rim', 'Rims', RIMS, RIM_NAMES),
    row('rimColour', 'Rim colour', RIM_COLOURS, RIM_COLOUR_NAMES, (v, car) => (v === 'stock' ? (CARS[car].rim ?? RIM_HEX.silver) : RIM_HEX[v as keyof typeof RIM_HEX])),
    row('rimSize', 'Size', RIM_SIZES, RIM_SIZE_NAMES),
  ],
  kit: [
    row('splitter', 'Splitter', SPLITTERS, SPLITTER_NAMES),
    row('skirts', 'Side skirts', SKIRTS, SKIRT_NAMES),
    row('diffuser', 'Diffuser', DIFFUSERS, DIFFUSER_NAMES),
    row('spoiler', 'Spoiler', SPOILERS, SPOILER_NAMES),
  ],
  livery: [
    row('livery', 'Livery', LIVERIES, LIVERY_NAMES),
    row('accent', 'Its colour', CAR_PAINTS.map((p) => p.id), paintName, (v) => CAR_PAINTS.find((p) => p.id === v)!.hex),
    row('number', 'Number', NUMBERS, (v) => (v ? String(v) : 'None')),
    row('mark', 'Mark', CAR_MARKS, MARK_NAMES),
  ],
  glow: [row('glow', 'Underglow', GLOWS, GLOW_NAMES, (v) => (v === 'off' ? '#2a2838' : GLOW_HEX[v as keyof typeof GLOW_HEX]))],
};

export interface GarageDeps {
  /** Show a car on the turntable (each pick, and the saved car again on close) */
  preview(c: MyCar): void;
  /** A new car was kept (or your car, out on the streets, was called home) */
  keep(c: MyCar): void;
  /** Closed without keeping: the saved car goes back on the turntable (or it empties, if your car is out) */
  cancel(saved: MyCar): void;
  /** Is your car out on the streets? */
  away(): boolean;
  /** Your motorbike on its stand, as the car on the turntable: each pick shown, kept, put back; is it out? */
  previewBike(b: MyBike): void;
  keepBike(b: MyBike): void;
  cancelBike(saved: MyBike): void;
  bikeAway(): boolean;
  /** The economy: the save the rules change, commit(), a toast and the sounds */
  game: GameDeps;
  /** Opening frees the mouse and turns the camera to the turntable; closing hands control back */
  onOpen(): void;
  onClose(): void;
}

export function createGarageUI(root: HTMLElement, d: GarageDeps) {
  const el = root.querySelector<HTMLElement>('[data-garage]')!;
  const list = el.querySelector<HTMLElement>('[data-garage-list]')!;
  const paints = el.querySelector<HTMLElement>('[data-garage-paints]')!;
  const keepBtn = el.querySelector<HTMLButtonElement>('[data-garage-keep]')!;
  const dorrasEl = el.querySelector<HTMLElement>('[data-garage-dorras]')!;
  const statsEl = el.querySelector<HTMLElement>('[data-garage-stats]')!;
  const dealEl = el.querySelector<HTMLElement>('[data-garage-deal]')!;
  const tabsEl = el.querySelector<HTMLElement>('[data-garage-tabs]')!;
  const styleEl = el.querySelector<HTMLElement>('[data-garage-style]')!;
  const paintHead = el.querySelector<HTMLElement>('.garage-paint-head')!;
  /** What each tab shows (the name row and Keep show on all of them) */
  // Cars or bikes (vehicle plan Phase 7): the switch over the cards
  const kindsEl = document.createElement('div');
  kindsEl.className = 'garage-kinds';
  kindsEl.setAttribute('role', 'radiogroup');
  kindsEl.setAttribute('aria-label', 'Cars or bikes');
  const kindBtns = (['car', 'bike'] as const).map((k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'garage-chip';
    b.dataset.kind = k;
    b.setAttribute('role', 'radio');
    b.textContent = k === 'car' ? 'Cars' : 'Bikes';
    b.addEventListener('click', () => setKind(k));
    kindsEl.append(b);
    return b;
  });
  list.before(kindsEl);
  const PANES: Record<'model' | 'paint' | 'style', HTMLElement[]> = {
    model: [kindsEl, list, ...['[data-garage-kind]', '[data-garage-blurb]', '[data-garage-pitch]'].map((q) => el.querySelector<HTMLElement>(q)!), statsEl, dealEl],
    paint: [paintHead, paints],
    style: [styleEl],
  };
  let tab: Tab = 'model';
  let saved = loadCar();
  let pick: MyCar = { ...saved };
  /** Showing the cars or the bikes; your bike as saved and as picked */
  let kind: 'car' | 'bike' = 'car';
  let bsaved = loadBike();
  let bpick: MyBike = { ...bsaved };
  /** What's picked, of the kind showing */
  const cur = (): GarageId => (kind === 'car' ? pick.model : bpick.model);
  const nameOf = (id: GarageId) => (id in BIKES ? BIKES[id as BikeId].name : CARS[id as PlayerCar].name);
  let open = false;
  /** The Buy button was pressed: Confirm / Cancel are showing */
  let asking = false;
  let ticker = 0;

  const cards = PLAYER_CARS.map((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'shop-card garage-card';
    b.dataset.car = id;
    b.setAttribute('role', 'option');
    b.innerHTML = `${art(id)}<b></b><small></small>`;
    b.querySelector('b')!.textContent = CARS[id].name;
    b.addEventListener('click', () => select({ ...pick, model: id }));
    list.append(b);
    return b;
  });
  const bikeCards = PLAYER_BIKES.map((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'shop-card garage-card';
    b.dataset.bike = id;
    b.setAttribute('role', 'option');
    b.innerHTML = `${bikeArt(id)}<b></b><small></small>`;
    b.querySelector('b')!.textContent = BIKES[id].name;
    b.addEventListener('click', () => selectBike({ ...bpick, model: id }));
    b.hidden = true;
    list.append(b);
    return b;
  });
  const tabBtns = TABS.map(([id, name]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'garage-tab';
    b.dataset.tab = id;
    b.setAttribute('role', 'tab');
    b.textContent = name;
    b.addEventListener('click', () => setTab(id));
    tabsEl.append(b);
    return b;
  });
  // A style tab's choices are painted from the pick, so they're handled here
  styleEl.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-look]');
    if (!b) return;
    const key = b.dataset.look as keyof CarLook;
    const raw = b.dataset.val!;
    const value = key === 'number' ? Number(raw) : raw;
    select({ ...pick, look: { ...pick.look, [key]: value } as CarLook });
  });
  for (const p of CAR_PAINTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'garage-paint';
    b.dataset.paint = p.id;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', p.name);
    b.title = p.name;
    b.style.setProperty('--paint', p.hex);
    b.addEventListener('click', () => (kind === 'car' ? select({ ...pick, paint: p.id }) : selectBike({ ...bpick, paint: p.id })));
    paints.append(b);
  }
  el.querySelector('[data-garage-close]')!.addEventListener('click', () => close());
  keepBtn.addEventListener('click', () => keep());
  // The deal section is painted from the save, so its buttons are handled here
  dealEl.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!b || b.disabled) return;
    if (b.hasAttribute('data-garage-buy')) askBuy();
    else if (b.hasAttribute('data-garage-confirm')) buy();
    else if (b.hasAttribute('data-garage-cancel')) {
      asking = false;
      paint();
      dealEl.querySelector<HTMLButtonElement>('[data-garage-buy]')?.focus({ preventScroll: true });
    } else if (b.dataset.garageUp) upgrade(b.dataset.garageUp as CarModId);
  });

  const same = (a: MyCar, b: MyCar) => a.model === b.model && a.paint === b.paint && sameLook(a.look, b.look);
  const sameBike = (a: MyBike, b: MyBike) => a.model === b.model && a.paint === b.paint;

  function setKind(k: 'car' | 'bike') {
    if (k === kind) return;
    kind = k;
    asking = false;
    paint();
    list.querySelector<HTMLButtonElement>(k === 'car' ? `[data-car="${pick.model}"]` : `[data-bike="${bpick.model}"]`)?.focus({ preventScroll: true });
  }

  function setTab(t: Tab) {
    tab = t;
    paint();
    tabBtns.find((b) => b.dataset.tab === t)?.focus({ preventScroll: true });
  }
  /** The style tab's rows, from the pick: chips, or swatches for colours */
  function styleRows(t: Exclude<Tab, 'model' | 'paint'>) {
    const car = pick.model;
    return STYLE[t]
      .map((r) => {
        const now = pick.look[r.key];
        // (a kit part the model has its own of: its stock choice is that one, and any other takes it off)
        const own = (STOCK_PARTS[car] as string[]).includes(r.key);
        const name = (v: string | number) => (own && v === 'stock' ? 'Its own' : r.name(v));
        const opts = r.ids
          .map((v) => {
            const on = v === now;
            const label = esc(name(v));
            const sw = r.swatch?.(v, car);
            return sw
              ? `<button type="button" class="garage-paint" role="radio" aria-checked="${on}" aria-label="${label}" title="${label}" style="--paint:${sw}" data-look="${r.key}" data-val="${v}"></button>`
              : `<button type="button" class="garage-chip" role="radio" aria-checked="${on}" data-look="${r.key}" data-val="${v}">${label}</button>`;
          })
          .join('');
        const kind = r.swatch ? 'garage-paints garage-swatches' : 'garage-chips';
        return `<p class="garage-paint-head">${esc(r.label)} <span>${esc(name(now))}</span></p><div class="${kind}" role="radiogroup" aria-label="${esc(r.label)}">${opts}</div>`;
      })
      .join('')
      .concat(t === 'glow' ? '<p class="shop-note">It lights up after dark.</p>' : '');
  }
  const fill = (n: number) => Math.max(0, Math.min(1, n)).toFixed(3);

  /** Bring the whole panel up to date with the pick and the save */
  function paint() {
    const save = d.game.save();
    const lv = level(save);
    const id = cur();
    const bike = kind === 'bike';
    const name = nameOf(id);
    const entry = garageEntry(id);
    const owned = ownsCar(save, id);
    const mods = carMods(save, id);
    const st = carStatsOf(save, id);
    const paintId = bike ? bpick.paint : pick.paint;
    for (const b of kindBtns) b.setAttribute('aria-checked', String(b.dataset.kind === kind));
    for (const b of cards) b.hidden = bike;
    for (const b of bikeCards) {
      b.hidden = !bike;
      const bid = b.dataset.bike as BikeId;
      const mine = ownsCar(save, bid);
      const c = garageEntry(bid);
      const locked = !mine && lv < c.level;
      b.setAttribute('aria-selected', String(bid === id));
      b.classList.toggle('is-locked', locked);
      b.classList.toggle('is-owned', mine);
      const price = `<span class="garage-price">${COIN}${fmt.format(c.price)}</span>`;
      repaint(b.querySelector('small')!, bid === bsaved.model ? 'Your bike' : mine ? 'Yours' : locked ? `${LV(c.level)}${price}` : `<span class="garage-sale-tag">For sale</span>${price}`);
    }

    repaint(dorrasEl, D(save.dorras));
    for (const b of cards) {
      const cid = b.dataset.car as PlayerCar;
      const c = CAR_CATALOG[cid];
      const mine = ownsCar(save, cid);
      const locked = !mine && lv < c.level;
      b.setAttribute('aria-selected', String(cid === id));
      b.classList.toggle('is-locked', locked);
      b.classList.toggle('is-owned', mine);
      // On sale: the tag (or the level it needs) over the price; the tag goes on small screens
      const price = `<span class="garage-price">${COIN}${fmt.format(c.price)}</span>`;
      const state = cid === saved.model ? 'Your car' : mine ? 'Yours' : locked ? `${LV(c.level)}${price}` : `<span class="garage-sale-tag">For sale</span>${price}`;
      repaint(b.querySelector('small')!, state);
    }
    for (const b of paints.querySelectorAll<HTMLButtonElement>('[data-paint]')) {
      const on = b.dataset.paint === paintId;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    }

    const dr = bike ? BIKE_DRIVE[id as BikeId] : DRIVE[id as PlayerCar];
    const cargo = bike ? BIKE_CARGO[id as BikeId] : CARGO[id as PlayerCar];
    el.querySelector('[data-garage-name]')!.textContent = name;
    el.querySelector('[data-garage-kind]')!.textContent = `${dr.kind} · carries ${st.cargo} goods${mods.rack ? ` (${cargo} + ${st.cargo - cargo} ${bike ? 'in the top box' : 'on the rack'})` : ''}`;
    el.querySelector('[data-garage-blurb]')!.textContent = dr.blurb;
    el.querySelector('[data-garage-pitch]')!.textContent = entry.pitch;
    el.querySelector('[data-garage-paint-name]')!.textContent = CAR_PAINTS.find((p) => p.id === paintId)!.name;
    // Stat bars: the model's number, and a bright segment on top for the mods fitted
    repaint(
      statsEl,
      STATS.map(({ key, label, mod }) => {
        const base = dr[key];
        const lvl = mods[mod];
        const bonus = st[key] > base ? `<em class="garage-bonus" style="--v:${fill(base)};--b:${fill(st[key] - base)}"></em>` : '';
        return `<div data-car-stat="${key}"><dt>${label}${lvl ? `<span class="garage-plus">+${lvl}</span>` : ''}</dt><dd><i style="--v:${fill(base)}"></i>${bonus}</dd></div>`;
      }).join('')
    );

    // The deal: Buy (then Confirm / Cancel) for a car on sale, the Tune section for one you own
    let deal: string;
    if (!owned && asking) {
      deal = `<div class="garage-sale is-asking"><p class="garage-ask">Buy the ${esc(name)} for ${fmt.format(entry.price)} Dorras?</p><div class="garage-confirm"><button type="button" class="shop-take" data-garage-confirm>Confirm</button><button type="button" class="garage-cancel" data-garage-cancel>Cancel</button></div></div>`;
    } else if (!owned) {
      const note = lv < entry.level ? `Needs level ${entry.level} (you're level ${lv}).` : save.dorras < entry.price ? `You're ${fmt.format(entry.price - save.dorras)} Dorras short.` : '';
      deal = `<div class="garage-sale"><button type="button" class="shop-take garage-buy" data-garage-buy>Buy · ${D(entry.price)} Dorras</button>${note ? `<p class="shop-note">${note}</p>` : ''}</div>`;
    } else {
      const rows = CAR_MOD_IDS.map((m) => {
        // (a bike's roof rack is a top box)
        const info = bike && m === 'rack' ? TOP_BOX : CAR_MODS[m];
        const lvl = mods[m];
        const cost = carModCost(id, m, mods);
        const pips = Array.from({ length: MOD_LEVELS }, (_, i) => `<i${i < lvl ? ' class="on"' : ''}></i>`).join('');
        const btn =
          cost === null
            ? `<button type="button" class="garage-up" disabled><span>Maxed</span></button>`
            : `<button type="button" class="garage-up" data-garage-up="${m}"${save.dorras < cost ? ' disabled' : ''}><span>Upgrade</span><small>${D(cost)}</small></button>`;
        return `<li class="garage-mod"><div class="garage-mod-info"><b>${esc(info.name)}</b><small>${esc(info.blurb)}</small></div><span class="garage-pips" role="img" aria-label="Level ${lvl} of ${MOD_LEVELS}">${pips}</span>${btn}</li>`;
      }).join('');
      deal = `<section class="garage-tune" aria-label="Tune"><h4 class="garage-tune-head">Tune</h4><ul class="garage-mods">${rows}</ul></section>`;
    }
    repaint(dealEl, deal);

    // The tabs: the one open lit, its panes shown
    for (const b of tabBtns) {
      const on = b.dataset.tab === tab;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    }
    const pane = tab === 'model' || tab === 'paint' ? tab : 'style';
    for (const [k, els] of Object.entries(PANES)) for (const e of els) e.hidden = k !== pane;
    if (pane === 'style') repaint(styleEl, bike ? '<p class="shop-note">Wheels, kits, liveries and glow are for the cars.</p>' : styleRows(tab as Exclude<Tab, 'model' | 'paint'>));

    keepBtn.disabled = !owned;
    const changed = bike ? !sameBike(bpick, bsaved) : !same(pick, saved);
    const away = bike ? d.bikeAway() : d.away();
    const what = bike ? 'bike' : 'car';
    keepBtn.textContent = !owned ? 'Buy it first' : changed ? 'Keep this one' : away ? `Bring my ${what} home` : `Your ${what} · done`;
  }

  function select(c: MyCar) {
    if (c.model !== pick.model) asking = false;
    pick = c;
    d.preview(pick);
    paint();
  }
  function selectBike(b: MyBike) {
    if (b.model !== bpick.model) asking = false;
    bpick = b;
    d.previewBike(bpick);
    paint();
  }

  /* ---------- Buying and tuning (the rules in tycoon.ts decide) ---------- */

  function askBuy() {
    const save = d.game.save();
    const entry = garageEntry(cur());
    // No point asking when the rules will say no: say why instead
    if (level(save) < entry.level || save.dorras < entry.price) return buy();
    asking = true;
    paint();
    dealEl.querySelector<HTMLButtonElement>('[data-garage-confirm]')?.focus({ preventScroll: true });
  }
  function buy() {
    asking = false;
    const id = cur();
    const r = buyCar(d.game.save(), id);
    if (r.ok) {
      d.game.commit();
      d.game.sfx('buy');
      d.game.toast(`The ${nameOf(id)} is yours. Keep it to take it out.`);
    } else {
      d.game.sfx('denied');
      d.game.toast(whyNot(r.why, garageEntry(id).level));
    }
    paint();
    if (r.ok) keepBtn.focus({ preventScroll: true });
  }
  function upgrade(mod: CarModId) {
    const id = cur();
    const r = modCar(d.game.save(), id, mod);
    if (r.ok) {
      d.game.commit();
      d.game.sfx('upgrade');
      d.game.toast(`${(kind === 'bike' && mod === 'rack' ? TOP_BOX : CAR_MODS[mod]).name} level ${carMods(d.game.save(), id)[mod]} fitted to the ${nameOf(id)}.`);
    } else {
      d.game.sfx('denied');
      d.game.toast(whyNot(r.why));
    }
    paint();
  }

  let kept = false;
  function keep() {
    const save = d.game.save();
    if (!ownsCar(save, cur())) {
      d.game.sfx('denied');
      d.game.toast(`Buy the ${nameOf(cur())} first.`);
      return;
    }
    // The car and the bike picked, each if it's yours (the one showing calls yours home if it's out)
    if (ownsCar(save, pick.model) && (!same(pick, saved) || (kind === 'car' && d.away()))) {
      saved = { ...pick };
      saveCar(saved);
      d.keep(saved);
    } else d.cancel(saved);
    if (ownsCar(save, bpick.model) && (!sameBike(bpick, bsaved) || (kind === 'bike' && d.bikeAway()))) {
      bsaved = { ...bpick };
      saveBike(bsaved);
      d.keepBike(bsaved);
    } else d.cancelBike(bsaved);
    kept = true;
    close();
  }
  function show() {
    if (open) return;
    open = true;
    saved = loadCar();
    pick = { ...saved };
    bsaved = loadBike();
    bpick = { ...bsaved };
    kind = 'car';
    kept = false;
    asking = false;
    tab = 'model';
    // Your car (or bike) is out: show it on the turntable (its stand) while you look
    if (d.away()) d.preview(saved);
    if (d.bikeAway()) d.previewBike(bsaved);
    paint();
    el.hidden = false;
    el.scrollTop = 0;
    root.classList.add('is-shopping', 'is-garage');
    d.onOpen();
    list.querySelector<HTMLButtonElement>(`[data-car="${pick.model}"]`)?.focus({ preventScroll: true });
    // Takings come in while you browse: keep the balance and the buttons honest
    ticker = window.setInterval(paint, 1000);
  }
  function close() {
    if (!open) return false;
    open = false;
    clearInterval(ticker);
    el.hidden = true;
    root.classList.remove('is-shopping', 'is-garage');
    if (!kept) {
      d.cancel(saved);
      d.cancelBike(bsaved);
    }
    d.onClose();
    return true;
  }
  /** Step through the models, or the paints */
  function step(dir: number) {
    if (kind === 'bike') {
      const i = PLAYER_BIKES.indexOf(bpick.model);
      selectBike({ ...bpick, model: PLAYER_BIKES[(i + dir + PLAYER_BIKES.length) % PLAYER_BIKES.length] });
      list.querySelector<HTMLButtonElement>(`[data-bike="${bpick.model}"]`)?.focus({ preventScroll: true });
      return;
    }
    const i = PLAYER_CARS.indexOf(pick.model);
    select({ ...pick, model: PLAYER_CARS[(i + dir + PLAYER_CARS.length) % PLAYER_CARS.length] });
    list.querySelector<HTMLButtonElement>(`[data-car="${pick.model}"]`)?.focus({ preventScroll: true });
  }
  function stepPaint(dir: number) {
    if (kind === 'bike') {
      const i = CAR_PAINTS.findIndex((p) => p.id === bpick.paint);
      selectBike({ ...bpick, paint: CAR_PAINTS[(i + dir + CAR_PAINTS.length) % CAR_PAINTS.length].id as PaintId });
      return;
    }
    const i = CAR_PAINTS.findIndex((p) => p.id === pick.paint);
    select({ ...pick, paint: CAR_PAINTS[(i + dir + CAR_PAINTS.length) % CAR_PAINTS.length].id as PaintId });
  }

  /** The next tab, or the one before */
  function stepTab(dir: number) {
    const i = TABS.findIndex(([id]) => id === tab);
    setTab(TABS[(i + dir + TABS.length) % TABS.length][0]);
  }

  el.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    // The deal's buttons (Buy, Confirm, Upgrade) and the style tabs' choices keep their own keys
    if (t.closest('[data-garage-deal]') || t.closest('[data-garage-style]')) return;
    if (t.closest('[data-tab]')) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') stepTab(e.key === 'ArrowRight' ? 1 : -1);
      return;
    }
    const inPaints = !!t.closest('[data-paint]');
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') inPaints ? stepPaint(1) : step(1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') inPaints ? stepPaint(-1) : step(-1);
    else if (e.key === 'Enter' && t.closest('[data-car], [data-bike]')) keep();
    else return;
    if (inPaints) paints.querySelector<HTMLButtonElement>(`[data-paint="${pick.paint}"]`)?.focus({ preventScroll: true });
    e.preventDefault();
  });

  return {
    get open() {
      return open;
    },
    /** The panel, so the camera can frame the turntable beside (or above) it */
    panel: el,
    show,
    close,
    step,
    stepPaint,
    stepTab,
    keep,
  };
}

export type GarageUI = ReturnType<typeof createGarageUI>;
