/*
 * The economy on screen (tycoon.ts holds the rules):
 *
 * - The Dorras readout in the mode header (`[data-dorras]`): your balance,
 *   with a dot when the till has takings to collect. It opens your business.
 * - Your business card (`[data-biz]`, on the gun store's `.shop` panel): the
 *   till and Collect on top, then four tabs:
 *   - Stall: its shelves, prices (Low / Fair / High), pace and upgrade;
 *   - Units: Makers' Row's four units: buy one, build it as a garden, shop or
 *     warehouse, then run it (a garden's crop and bins, a shop's shelves, a
 *     warehouse's stock);
 *   - Workshop: its bay (raw goods in, products out), the job running, and
 *     what it can make;
 *   - Car: what's in your car, and Load / Unload when it's parked at one of
 *     your places.
 *   It opens from the readout anywhere, and at your stall or a unit in walk
 *   mode (on that place).
 * - The market hall, inside the Emporium's panel (`[data-market]`): every
 *   good's price and trend; Buy delivers to, and Sell takes from, the place
 *   picked at the top.
 * - The Workshop's panel (`[data-workshop]`) shows the Workshop tab's view.
 *
 * The save lives in the browser (`degen-city-tycoon-v1`) and is brought up to
 * date every second (and on return, counting the time away).
 */
import {
  CROPS,
  DELIVERY_BONUS,
  GARDEN_CAP,
  GOODS,
  PRICE_LEVELS,
  PRICE_LEVEL_IDS,
  RAW_IDS,
  RECIPES,
  RECIPE_IDS,
  SHOP,
  START_DORRAS,
  UNIT_KINDS,
  UNIT_KIND_IDS,
  WAREHOUSE_CAP,
  WORKSHOP_CAP,
  advance,
  askPrice,
  bidPrice,
  buildUnit,
  buy,
  buyUnit,
  cancelJob,
  canMake,
  cargoCap,
  cleanSave,
  clearSlot,
  collect,
  good,
  holds,
  isRaw,
  load,
  loadsFrom,
  marketPrice,
  pace,
  retailPrice,
  room,
  sellBack,
  sells,
  setCrop,
  setPrice,
  startJob,
  stallLevel,
  stockAt,
  total,
  trend,
  unitAt,
  unitPrice,
  unload,
  upgrade,
  upgradeCost,
  type GoodId,
  type PlaceId,
  type PriceLevel,
  type ProductId,
  type RawId,
  type Result,
  type Sales,
  type Slot,
  type Stock,
  type TycoonSave,
  type UnitKind,
} from './tycoon';
import { DOORS, STALL_SPOT, UNIT_SITE } from './solids';

const KEY = 'degen-city-tycoon-v1';
const fmt = new Intl.NumberFormat('en-US');
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
/** The Dorras mark: a little coin */
const COIN = '<svg class="dorra" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor" opacity=".18"/><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 7h3.5a5 5 0 0 1 0 10H9zM7 12h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const D = (n: number) => `${COIN}<b>${fmt.format(Math.floor(n))}</b>`;
const dot = (id: GoodId) => `<span class="good-dot" style="--c:${good(id).color}"></span>`;
const perMin = (n: number) => (n >= 1 ? fmt.format(Math.round(n)) : n.toFixed(1));
const secs = (min: number) => (min >= 1 ? `${+min.toFixed(1)} min` : `${Math.max(1, Math.round(min * 60))} s`);

/** Where you stand to run a place, and where your car parks to load and unload */
const STAND: Record<PlaceId, { x: number; z: number }> = {
  stall: STALL_SPOT,
  workshop: DOORS.find((d) => d.id === 'workshop')!,
  u0: UNIT_SITE[0].door,
  u1: UNIT_SITE[1].door,
  u2: UNIT_SITE[2].door,
  u3: UNIT_SITE[3].door,
};
/** Standing this close serves a stall's or shop's customers; a car this close is parked there */
const SERVE_R = 2.2;
const CAR_R = 9;
const UNIT_IDS = ['u0', 'u1', 'u2', 'u3'] as const;
type Tab = 'stall' | 'units' | 'workshop' | 'car';
const TABS: { id: Tab; label: string }[] = [
  { id: 'stall', label: 'Stall' },
  { id: 'units', label: 'Units' },
  { id: 'workshop', label: 'Workshop' },
  { id: 'car', label: 'Car' },
];
const KIND_BLURB: Record<UnitKind, string> = {
  garden: 'Grows sugar, coffee beans or cotton for the Workshop.',
  shop: `Sells like a bigger stall: ${SHOP.slots} shelves of ${SHOP.capacity}, more customers.`,
  warehouse: `Holds ${WAREHOUSE_CAP} of anything, ready to load into your car.`,
};

export interface TycoonHooks {
  /** Where Degen is standing in walk mode, on foot (null otherwise) */
  walker(): { x: number; z: number } | null;
  /** Your car, if it's out of the garage */
  car(): { x: number; z: number; model: string; name: string; speed: number } | null;
  /** Open the Emporium's market hall */
  openMarket(): void;
  /** Something the city shows changed (the stall's crates, the units) */
  stock(s: TycoonSave): void;
  /** The card opened (walk mode frees the mouse) */
  opened(): void;
}

/** Make `to` match `from` in place: same elements kept, only what differs is changed */
function morph(to: Node, from: Node) {
  if (to.nodeType === Node.TEXT_NODE) {
    if (to.nodeValue !== from.nodeValue) to.nodeValue = from.nodeValue;
    return;
  }
  if (to instanceof Element && from instanceof Element) {
    // (an opened <details> stays open)
    for (const a of [...to.attributes]) if (!from.hasAttribute(a.name) && !(a.name === 'open' && to.tagName === 'DETAILS')) to.removeAttribute(a.name);
    for (const a of [...from.attributes]) if (to.getAttribute(a.name) !== a.value) to.setAttribute(a.name, a.value);
  }
  morphChildren(to, from);
}
function morphChildren(to: Node, from: Node) {
  const a = [...to.childNodes];
  const b = [...from.childNodes];
  b.forEach((n, i) => {
    const o = a[i];
    if (o && o.nodeType === n.nodeType && o.nodeName === n.nodeName) morph(o, n);
    else if (o) to.replaceChild(n, o);
    else to.appendChild(n);
  });
  for (let i = b.length; i < a.length; i++) a[i].remove();
}
/**
 * Bring a view up to date. The panels tick every second (prices move every
 * few seconds), so the markup is patched in place rather than replaced: a
 * button under a finger, the mouse or the keyboard's focus stays the same
 * button.
 */
function repaint(el: HTMLElement, html: string) {
  if (el.dataset.html === html) return;
  el.dataset.html = html;
  const t = document.createElement('template');
  t.innerHTML = html;
  const tmp = document.createElement('div');
  tmp.append(t.content);
  morphChildren(el, tmp);
}

function loadSave(now: number): { save: TycoonSave; fresh: boolean } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { save: cleanSave(JSON.parse(raw), now), fresh: false };
  } catch {
    /* a broken save starts over */
  }
  return { save: cleanSave(null, now), fresh: true };
}

export function createTycoonUI(root: HTMLElement, h: TycoonHooks) {
  const pill = root.querySelector<HTMLButtonElement>('[data-dorras]')!;
  const pillAmount = pill.querySelector<HTMLElement>('[data-dorras-amount]')!;
  const card = root.querySelector<HTMLElement>('[data-biz]')!;
  const cardBody = card.querySelector<HTMLElement>('[data-biz-body]')!;
  const tabsEl = card.querySelector<HTMLElement>('[data-biz-tabs]')!;
  const toastEl = root.querySelector<HTMLElement>('[data-econ-toast]')!;
  const { save, fresh } = loadSave(Date.now());
  let market: HTMLElement | null = null;
  let workshopPanel: HTMLElement | null = null;
  let note = '';
  let toastTimer = 0;
  let tab: Tab = 'stall';
  let unitSel = 0;
  /** The market hall's place: where Buy delivers and Sell takes from */
  let marketAt: PlaceId = 'stall';

  const store = () => {
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

  /* ---------- Places ---------- */
  function placeName(p: PlaceId) {
    if (p === 'stall') return 'Your stall';
    if (p === 'workshop') return 'The Workshop';
    const i = Number(p.slice(1));
    const u = save.units[i];
    return `Unit ${i + 1}${u?.kind ? ` · ${UNIT_KINDS[u.kind].name}` : ''}`;
  }
  const shortName = (p: PlaceId) => (p === 'stall' ? 'Stall' : p === 'workshop' ? 'Workshop' : placeName(p));
  const places = () => Object.entries(STAND) as [PlaceId, { x: number; z: number }][];
  /** The place you're standing at, on foot */
  function standingAt(): PlaceId | null {
    const w = h.walker();
    if (!w) return null;
    for (const [p, s] of places()) if (Math.hypot(s.x - w.x, s.z - w.z) < SERVE_R) return p;
    return null;
  }
  /** Standing at a stall or shop serves its customers */
  const serving = () => {
    const p = standingAt();
    return p && sells(save, p) ? p : null;
  };
  /** The place your car is parked (or stopped) at, if any */
  function carAt(): PlaceId | null {
    const c = h.car();
    if (!c || Math.abs(c.speed) > 0.5) return null;
    let best: PlaceId | null = null;
    let bestD = CAR_R;
    for (const [p, s] of places()) {
      const d = Math.hypot(s.x - c.x, s.z - c.z);
      if (d < bestD && (p === 'stall' || p === 'workshop' || unitAt(save, p)?.kind)) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }
  const why = (r: Result, id?: GoodId, p: PlaceId = 'stall') => {
    if (r.ok) return '';
    if (r.why === 'money') return 'Not enough Dorras.';
    if (r.why === 'room') {
      if (id && isRaw(id) && sells(save, p)) return `${good(id).name} is a raw good: it goes to the Workshop or a warehouse, not on shelves.`;
      if (id && sells(save, p) && !holds(save, p, id)) return `${placeName(p)} has no free shelf. Sell one out first.`;
      return 'No room for that there.';
    }
    if (r.why === 'stock') return 'None there.';
    if (r.why === 'busy') return 'The Workshop is already on a job.';
    if (r.why === 'place') return "That can't be done there.";
    if (r.why === 'owned') return 'Already done.';
    return 'Your stall is as big as it gets.';
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

  /* ---------- Views ---------- */
  function slotRow(s: Slot, p: PlaceId, now: number, capacity: number) {
    const g = good(s.good);
    const per = pace(save, s, p) * (serving() === p ? 2 : 1);
    const levels = PRICE_LEVEL_IDS.map(
      (lv) => `<button type="button" data-price="${lv}" data-good="${s.good}" data-at="${p}" aria-pressed="${s.price === lv}">${PRICE_LEVELS[lv].label}</button>`
    ).join('');
    return `<li class="stall-slot">
      <div class="stall-slot-top">${dot(s.good)}<b>${esc(g.name)}</b><span class="stall-qty">${s.qty} / ${capacity}</span></div>
      <i class="stall-bar" style="--v:${s.qty / capacity}"></i>
      <div class="stall-slot-row">
        <div class="seg stall-seg" role="group" aria-label="${esc(g.name)} price">${levels}</div>
        <span class="stall-each">${D(retailPrice(s.good, s.price, now))} each</span>
      </div>
      <small class="stall-pace">${s.qty > 0 ? `About ${perMin(per)} a minute` : 'Sold out'}${s.qty === 0 ? ` · <button type="button" class="chip-link stall-clear" data-clear="${s.good}" data-at="${p}">Free the shelf</button>` : ''}</small>
    </li>`;
  }
  /** A stall's or shop's shelves */
  function shelvesView(p: PlaceId, now: number) {
    const slots = p === 'stall' ? save.stall.slots : unitAt(save, p)!.slots;
    const max = p === 'stall' ? stallLevel(save.stall.level).slots : SHOP.slots;
    const capacity = p === 'stall' ? stallLevel(save.stall.level).capacity : SHOP.capacity;
    const free = max - slots.length;
    return `${slots.length ? `<ul class="stall-slots">${slots.map((s) => slotRow(s, p, now, capacity)).join('')}</ul>` : ''}
      ${free > 0 ? `<p class="stall-empty">${free === max ? 'The shelves are empty.' : `${free} empty shel${free > 1 ? 'ves' : 'f'}.`} Buy stock at the Emporium's market hall, or bring it from the Workshop or a warehouse in your car. Low sells fast, High earns more each.</p>` : ''}`;
  }
  /** A plain stock list (a warehouse, the Workshop's bay, your car) */
  const stockList = (st: Stock, empty: string) => {
    const ids = GOODS.map((g) => g.id).filter((id) => (st[id] ?? 0) > 0);
    return ids.length
      ? `<ul class="biz-stock">${ids.map((id) => `<li>${dot(id)}<span>${esc(good(id).name)}</span><b>${st[id]}</b></li>`).join('')}</ul>`
      : empty
        ? `<p class="stall-empty">${empty}</p>`
        : '';
  };
  /** "Your car is here": a way to the Car tab, on a place's view */
  const carHere = (p: PlaceId) => (carAt() === p ? `<p class="biz-carhere"><span>Your car is parked here.</span><button type="button" class="chip-link" data-tab="car">Load / unload</button></p>` : '');
  const serveNote = (p: PlaceId) => (serving() === p ? ' · <b class="stall-serving">You\'re serving: customers come twice as fast</b>' : '');

  function stallView(now: number) {
    const L = stallLevel(save.stall.level);
    const cost = upgradeCost(save);
    return `<p class="stall-status">Level ${L.level} stall · ${L.slots} kinds of goods, ${L.capacity} of each${serveNote('stall')}</p>
      ${shelvesView('stall', now)}
      ${carHere('stall')}
      <div class="stall-actions">
        <button type="button" class="shop-take" data-to-market>Market hall</button>
        ${cost !== null ? `<button type="button" class="chip-link" data-upgrade ${save.dorras >= cost ? '' : 'disabled'}>Upgrade to level ${L.level + 1} · ${fmt.format(cost)} Dorras</button>` : '<span class="stall-max">Top level stall</span>'}
      </div>`;
  }

  const buildOptions = (i: number) =>
    `<ul class="biz-build">${UNIT_KIND_IDS.filter((k) => k !== save.units[i]?.kind)
      .map(
        (k) => `<li><div><b>${UNIT_KINDS[k].name}</b><small>${KIND_BLURB[k]}</small></div>
        <button type="button" class="chip-link" data-build="${k}" data-unit-i="${i}" ${save.dorras >= UNIT_KINDS[k].cost ? '' : 'disabled'}>Build · ${fmt.format(UNIT_KINDS[k].cost)}</button></li>`
      )
      .join('')}</ul>`;

  function unitView(now: number) {
    const chips = UNIT_IDS.map((_, i) => {
      const u = save.units[i];
      return `<button type="button" data-unit="${i}" aria-pressed="${i === unitSel}">${i + 1}<small>${u ? (u.kind ? UNIT_KINDS[u.kind].name : 'Empty') : 'To let'}</small></button>`;
    }).join('');
    const i = unitSel;
    const p = UNIT_IDS[i];
    const u = save.units[i];
    let body = '';
    if (!u) {
      const price = unitPrice(save);
      body = `<p class="stall-empty">Unit ${i + 1} on Makers' Row, across the street north of the market square. Buy it, then build a garden, a shop or a warehouse on it.</p>
        <div class="stall-actions"><button type="button" class="shop-take" data-buy-unit="${i}" ${price !== null && save.dorras >= price ? '' : 'disabled'}>Buy unit ${i + 1} · ${fmt.format(price ?? 0)} Dorras</button></div>`;
    } else if (!u.kind) {
      body = `<p class="stall-empty">Your unit is ready. What should it be?</p>${buildOptions(i)}`;
    } else if (u.kind === 'garden') {
      const have = u.stock[u.crop] ?? 0;
      const crops = RAW_IDS.map((c) => `<button type="button" data-crop="${c}" aria-pressed="${u.crop === c}" ${have > 0 && u.crop !== c ? 'disabled' : ''}>${esc(good(c).name)}</button>`).join('');
      body = `<p class="stall-status">Garden · ${perMin(CROPS[u.crop])} ${esc(good(u.crop).name.toLowerCase())} a minute, also while you're away</p>
        <div class="seg stall-seg" role="group" aria-label="Crop">${crops}</div>
        <div class="stall-slot"><div class="stall-slot-top">${dot(u.crop)}<b>${esc(good(u.crop).name)} in the bins</b><span class="stall-qty">${have} / ${GARDEN_CAP}</span></div><i class="stall-bar" style="--v:${have / GARDEN_CAP}"></i>
        <small class="stall-pace">${have >= GARDEN_CAP ? 'Full: it stops growing until you load it into your car or sell it.' : have > 0 ? 'Load it into your car for the Workshop, or sell it at the market hall.' : 'Growing. Pick another crop while the bins are empty.'}</small></div>
        ${carHere(p)}`;
    } else if (u.kind === 'shop') {
      body = `<p class="stall-status">Shop · ${SHOP.slots} kinds of goods, ${SHOP.capacity} of each${serveNote(p)}</p>
        ${shelvesView(p, now)}${carHere(p)}
        <div class="stall-actions"><button type="button" class="shop-take" data-to-market data-at="${p}">Market hall</button></div>`;
    } else {
      body = `<p class="stall-status">Warehouse · ${total(u.stock)} / ${WAREHOUSE_CAP}</p>
        <i class="stall-bar" style="--v:${total(u.stock) / WAREHOUSE_CAP}"></i>
        ${stockList(u.stock, 'Empty. Buy stock into it at the market hall, or unload your car here.')}${carHere(p)}`;
    }
    // Rebuilding: only once it's empty of goods
    const rebuild = u?.kind && total(stockAt(save, p)) === 0 ? `<details class="biz-rebuild"><summary>Rebuild unit ${i + 1}</summary>${buildOptions(i)}</details>` : '';
    return `<div class="seg biz-units" role="group" aria-label="Your units">${chips}</div>${body}${rebuild}`;
  }

  function workshopView() {
    const j = save.workshop.job;
    const bay = total(save.workshop.stock);
    const job = j
      ? `<div class="stall-slot biz-job"><div class="stall-slot-top">${dot(j.make)}<b>Making ${esc(good(j.make).name)}</b><span class="stall-qty">${j.left} to go</span></div>
          <i class="stall-bar" style="--v:${j.t / RECIPES[j.make]!.minutes}"></i>
          <small class="stall-pace">${secs(RECIPES[j.make]!.minutes)} each · done in about ${secs(j.left * RECIPES[j.make]!.minutes - j.t)} · <button type="button" class="chip-link stall-clear" data-stop>Stop</button></small></div>`
      : '';
    const recipes = RECIPE_IDS.map((id) => {
      const r = RECIPES[id]!;
      const n = canMake(save, id);
      const needs = Object.entries(r.needs)
        .map(([raw, k]) => `${k} ${esc(good(raw as RawId).name.toLowerCase())}`)
        .join(' + ');
      return `<li class="market-row">
        <div class="market-top">${dot(id)}<b>${esc(good(id).name)}</b><span class="stall-qty">${secs(r.minutes)} each</span></div>
        <div class="market-acts"><small>Needs ${needs} · enough for <b>${n}</b></small>
          <span class="market-btns"><button type="button" data-make="${id}" data-n="10" ${n && !j ? '' : 'disabled'}>Make ${Math.min(10, n) || 10}</button><button type="button" data-make="${id}" data-n="${n}" ${n && !j ? '' : 'disabled'}>Make all</button></span></div>
      </li>`;
    }).join('');
    return `<p class="stall-status">The Workshop's bay · ${bay} / ${WORKSHOP_CAP}</p>
      ${stockList(save.workshop.stock, 'Empty. Bring raw goods from your gardens in your car, or buy them into the Workshop at the market hall.')}
      ${job}
      <ul class="market-list">${recipes}</ul>
      ${carHere('workshop')}
      <p class="city-panel-fine">Raw goods leave the bay when a job starts; products land in it as they're made, also while you're away. Load them into your car for your stall and shops, or sell them at the market hall.</p>`;
  }

  function carView(now: number) {
    const c = h.car();
    const at = carAt();
    if (!c) return `<p class="stall-empty">Your car is at the garage on the south bank. Walk there, get in, and drive it to your places to load and unload goods.</p>${stockList(save.cargo, '')}`;
    const cap = cargoCap(c.model);
    const used = total(save.cargo);
    const ids = GOODS.map((g) => g.id);
    const row = (id: GoodId, qty: string, info: string, verb: 'load' | 'unload', n: number, ok: boolean) =>
      `<li class="market-row"><div class="market-top">${dot(id)}<b>${esc(good(id).name)}</b><span class="stall-qty">${qty}</span></div>
        <div class="market-acts"><small>${info}</small>
        <span class="market-btns"><button type="button" data-${verb}="${id}" data-n="1" ${ok ? '' : 'disabled'}>${verb === 'load' ? 'Load' : 'Unload'} 1</button><button type="button" data-${verb}="${id}" data-n="${n}" ${ok ? '' : 'disabled'}>${verb === 'load' ? 'Load' : 'Unload'} all</button></span></div></li>`;
    // (a garden takes nothing in)
    const out = at && unitAt(save, at)?.kind !== 'garden'
      ? ids
          .filter((id) => (save.cargo[id] ?? 0) > 0)
          .map((id) => {
            const fits = room(save, id, at);
            return row(id, `${save.cargo[id]} in the car`, `${fits > 0 ? `Room for ${fits} here` : 'No room here'}${fits > 0 && sells(save, at) ? ' · delivery bonus' : ''}`, 'unload', save.cargo[id]!, fits > 0);
          })
          .join('')
      : '';
    const here = at && loadsFrom(save, at) ? stockAt(save, at) : {};
    const inn = ids
      .filter((id) => (here[id] ?? 0) > 0)
      .map((id) => row(id, `${here[id]} here`, `Worth about ${fmt.format(marketPrice(id, now))} each`, 'load', here[id]!, used < cap))
      .join('');
    const loadNote = !at ? '' : inn ? '' : loadsFrom(save, at) ? '<p class="stall-empty">Nothing here to load.</p>' : '<p class="stall-empty">Goods on sale stay on the shelves: load at a garden, a warehouse or the Workshop.</p>';
    return `<p class="stall-status">${esc(c.name)} · ${used} / ${cap} in the car${at ? ` · parked at ${esc(placeName(at))}` : ''}</p>
      <i class="stall-bar" style="--v:${used / cap}"></i>
      ${at ? '' : `${stockList(save.cargo, 'Empty.')}<p class="stall-empty">Park within a few steps of your stall, a unit or the Workshop to load and unload. Bigger cars carry more: the Box Van most, the Street GT least.</p>`}
      ${out ? `<p class="biz-label">Unload here</p><ul class="market-list">${out}</ul>` : ''}
      ${inn ? `<p class="biz-label">Load from ${esc(placeName(at!))}</p><ul class="market-list">${inn}</ul>` : loadNote}
      <p class="city-panel-fine">Delivering to your stall or a shop yourself pays a bonus of ${Math.round(DELIVERY_BONUS * 100)}% of the goods' price.</p>`;
  }

  function paintCard() {
    if (card.hidden) return;
    const now = Date.now();
    tabsEl.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === tab)));
    const view = tab === 'stall' ? stallView(now) : tab === 'units' ? unitView(now) : tab === 'workshop' ? workshopView() : carView(now);
    repaint(
      cardBody,
      `<div class="stall-till">
        <div><small>Till · stall and shops</small><span class="stall-till-amount">${D(save.till)}</span></div>
        <button type="button" class="shop-take stall-collect" data-collect ${save.till > 0 ? '' : 'disabled'}>Collect</button>
      </div>
      ${view}
      ${note ? `<p class="shop-note" role="status">${esc(note)}</p>` : ''}`
    );
    card.querySelector<HTMLElement>('[data-biz-balance]')!.innerHTML = D(save.dorras);
  }
  /** Open the card on a tab, or on a place (a unit opens the Units tab on it) */
  function openCard(at?: PlaceId | Tab) {
    if (at === 'stall' || at === 'units' || at === 'workshop' || at === 'car') tab = at;
    else if (at?.startsWith('u')) {
      tab = 'units';
      unitSel = Number(at.slice(1));
    }
    note = '';
    if (card.hidden) {
      card.hidden = false;
      root.classList.add('is-shopping', 'is-stall');
      h.opened();
      card.querySelector<HTMLButtonElement>('[data-biz-close]')?.focus({ preventScroll: true });
    }
    paintCard();
  }
  function closeCard() {
    if (card.hidden) return false;
    card.hidden = true;
    root.classList.remove('is-shopping', 'is-stall');
    return true;
  }

  /** Every button on the card, the market hall and the Workshop's panel */
  function act(btn: HTMLButtonElement, now: number) {
    const ds = btn.dataset;
    const at = (ds.at as PlaceId | undefined) ?? 'stall';
    note = '';
    if ('bizClose' in ds) return void closeCard();
    if (ds.tab) return void openCard(ds.tab as Tab);
    if ('openStall' in ds) return void openCard(marketAt);
    if ('toMarket' in ds) {
      marketAt = at;
      closeCard();
      h.openMarket();
      return;
    }
    if (ds.unit) unitSel = Number(ds.unit);
    else if ('collect' in ds) {
      const n = collect(save);
      if (n) note = `Collected ${fmt.format(n)} Dorras.`;
    } else if (ds.price && ds.good) setPrice(save, ds.good as GoodId, ds.price as PriceLevel, at);
    else if (ds.clear) clearSlot(save, ds.clear as GoodId, at);
    else if ('upgrade' in ds) {
      const r = upgrade(save);
      note = r.ok ? `Your stall is now level ${save.stall.level}.` : why(r);
    } else if (ds.buyUnit) {
      const r = buyUnit(save, Number(ds.buyUnit));
      note = r.ok ? `Unit ${Number(ds.buyUnit) + 1} is yours. Build something on it.` : why(r);
    } else if (ds.build) {
      const i = Number(ds.unitI);
      const r = buildUnit(save, i, ds.build as UnitKind);
      note = r.ok ? `Unit ${i + 1} is now a ${UNIT_KINDS[ds.build as UnitKind].name.toLowerCase()}.` : r.why === 'stock' ? 'Empty it of goods first.' : why(r);
    } else if (ds.crop) {
      const r = setCrop(save, unitSel, ds.crop as RawId);
      if (!r.ok) note = 'Empty the bins first.';
    } else if (ds.make) {
      const r = startJob(save, ds.make as ProductId, Number(ds.n));
      note = r.ok ? `Making ${r.qty} ${good(ds.make as GoodId).name}.` : why(r);
    } else if ('stop' in ds) {
      cancelJob(save);
      note = 'Job stopped. Its raw goods are back in the bay.';
    } else if (ds.load) {
      const c = h.car();
      const p = carAt();
      if (!c || !p) note = 'Park your car here first.';
      else {
        const r = load(save, p, ds.load as GoodId, Number(ds.n), cargoCap(c.model));
        note = r.ok ? `Loaded ${r.qty} ${good(ds.load as GoodId).name}.` : r.why === 'room' ? 'Your car is full.' : why(r, ds.load as GoodId, p);
      }
    } else if (ds.unload) {
      const p = carAt();
      if (!p) note = 'Park your car at one of your places first.';
      else {
        const r = unload(save, p, ds.unload as GoodId, Number(ds.n), now);
        note = r.ok ? `Unloaded ${r.qty} ${good(ds.unload as GoodId).name}${r.dorras ? `: ${fmt.format(r.dorras)} Dorras delivery bonus` : ''}.` : why(r, ds.unload as GoodId, p);
      }
    } else if (ds.buy) {
      const r = buy(save, ds.buy as GoodId, Number(ds.n), now, marketAt);
      note = r.ok ? `Bought ${r.qty} ${good(ds.buy as GoodId).name} for ${fmt.format(r.dorras)} Dorras, delivered to ${placeName(marketAt)}.` : why(r, ds.buy as GoodId, marketAt);
    } else if (ds.sell) {
      const r = sellBack(save, ds.sell as GoodId, Number(ds.n), now, marketAt);
      note = r.ok ? `Sold ${r.qty} ${good(ds.sell as GoodId).name} for ${fmt.format(r.dorras)} Dorras.` : why(r, ds.sell as GoodId, marketAt);
    } else if (ds.marketAt) marketAt = ds.marketAt as PlaceId;
    else return;
    changed();
  }
  const onClick = (e: Event) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (btn && !btn.disabled) act(btn, Date.now());
  };
  card.addEventListener('click', onClick);
  pill.addEventListener('click', () => (card.hidden ? openCard() : closeCard()));
  // Esc closes the card first (before it can close a panel or leave walk mode)
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && closeCard()) e.stopImmediatePropagation();
    },
    true
  );
  tabsEl.innerHTML = TABS.map((t) => `<button type="button" data-tab="${t.id}" aria-pressed="false">${t.label}</button>`).join('');

  /* ---------- The market hall ---------- */
  function paintMarket() {
    if (!market) return;
    const now = Date.now();
    // Where Buy can deliver to and Sell can take from
    const at: PlaceId[] = ['stall', ...UNIT_IDS.filter((p) => unitAt(save, p)?.kind), 'workshop'];
    if (!at.includes(marketAt)) marketAt = 'stall';
    const row = (id: GoodId) => {
      const t = trend(id, now);
      const held = holds(save, marketAt, id);
      const fits = room(save, id, marketAt);
      return `<li class="market-row">
        <div class="market-top">
          ${dot(id)}<b>${esc(good(id).name)}</b>
          <span class="market-price">${D(marketPrice(id, now))}<i class="trend" data-t="${t}" aria-label="${t > 0 ? 'rising' : t < 0 ? 'falling' : 'steady'}">${t > 0 ? '▲' : t < 0 ? '▼' : '•'}</i></span>
        </div>
        <div class="market-acts">
          <small>Buy ${fmt.format(askPrice(id, now))} · sell ${fmt.format(bidPrice(id, now))} · here <b>${held}</b></small>
          <span class="market-btns">
            <button type="button" data-buy="${id}" data-n="1" ${fits ? '' : 'disabled'}>Buy 1</button>
            <button type="button" data-buy="${id}" data-n="${fits}" ${fits ? '' : 'disabled'}>Fill</button>
            <button type="button" data-sell="${id}" data-n="1" ${held ? '' : 'disabled'}>Sell 1</button>
            <button type="button" data-sell="${id}" data-n="${held}" ${held ? '' : 'disabled'}>Sell all</button>
          </span>
        </div>
      </li>`;
    };
    repaint(
      market,
      `
      <div class="market-head"><span>Your Dorras</span><span class="market-balance">${D(save.dorras)}</span></div>
      <div class="market-at"><small>Deliver to and sell from</small>
        <div class="seg stall-seg" role="group" aria-label="Deliver to and sell from">${at.map((p) => `<button type="button" data-market-at="${p}" aria-pressed="${p === marketAt}">${esc(shortName(p))}</button>`).join('')}</div>
      </div>
      <ul class="market-list">${GOODS.filter((g) => !g.raw)
        .map((g) => row(g.id))
        .join('')}</ul>
      <p class="biz-label">Raw goods · for the Workshop</p>
      <ul class="market-list">${RAW_IDS.map(row).join('')}</ul>
      ${note ? `<p class="shop-note" role="status">${esc(note)}</p>` : ''}
      <div class="city-panel-actions"><button type="button" class="chip-link" data-open-stall>Your business</button></div>
      <p class="city-panel-fine">Prices move through the day, the same for everyone. Raw goods only go to the Workshop or a warehouse; customers buy products from your stall and shops.</p>`
    );
  }
  function paintWorkshop() {
    if (workshopPanel)
      repaint(workshopPanel, `${workshopView()}${note ? `<p class="shop-note" role="status">${esc(note)}</p>` : ''}<div class="city-panel-actions"><button type="button" class="chip-link" data-tab="workshop">Your business</button></div>`);
  }

  /* ---------- Ticking ---------- */
  let lastShown = '';
  function changed() {
    store();
    paintPill();
    paintCard();
    paintMarket();
    paintWorkshop();
    // The city only redraws what changed (crate stacks, units)
    const shown = JSON.stringify([save.stall, save.units]);
    if (shown !== lastShown) {
      lastShown = shown;
      h.stock(save);
    }
  }
  function awayNote(s: Sales) {
    const n = (m: Partial<Record<GoodId, number>>) => Object.values(m).reduce<number>((a, b) => a + (b ?? 0), 0);
    const parts = [
      s.earned > 0 ? `sold ${n(s.sold)} item${n(s.sold) === 1 ? '' : 's'} (${fmt.format(s.earned)} Dorras in the till)` : '',
      n(s.grown) ? `grew ${n(s.grown)} raw goods` : '',
      n(s.made) ? `made ${n(s.made)} at the Workshop` : '',
    ].filter(Boolean);
    return parts.length ? `While you were away your business ${parts.join(', ')}.` : '';
  }
  function tick() {
    const sales = advance(save, Date.now(), serving() ?? false);
    // Back after a while: say what happened
    if (sales.away > 0) {
      const msg = awayNote(sales);
      if (msg) toast(msg, 7000);
    }
    changed();
  }
  tick();
  if (fresh) toast(`You have ${fmt.format(START_DORRAS)} Dorras and a market stall. Stock it at the Emporium's market hall.`, 7000);
  window.setInterval(tick, 1000);
  document.addEventListener('visibilitychange', () => !document.hidden && tick());

  return {
    openCard,
    closeCard,
    get cardOpen() {
      return !card.hidden;
    },
    get save() {
      return save;
    },
    /** Your places on foot (walk-mode prompts): your stall and the four units */
    places() {
      return [
        { id: 'stall', ...STALL_SPOT, label: 'Your stall' },
        ...UNIT_IDS.map((p, i) => ({ id: p as string, ...UNIT_SITE[i].door, label: save.units[i] ? placeName(p) : `Unit ${i + 1} · To let` })),
      ];
    },
    /** The Emporium's panel opened: fill its market hall */
    mountMarket(panelBody: HTMLElement) {
      market = panelBody.querySelector<HTMLElement>('[data-market]');
      market?.addEventListener('click', onClick);
      note = '';
      paintMarket();
    },
    unmountMarket() {
      market?.removeEventListener('click', onClick);
      market = null;
    },
    /** The Workshop's panel opened: its bay, job and recipes */
    mountWorkshop(panelBody: HTMLElement) {
      workshopPanel = panelBody.querySelector<HTMLElement>('[data-workshop]');
      workshopPanel?.addEventListener('click', onClick);
      note = '';
      paintWorkshop();
    },
    unmountWorkshop() {
      workshopPanel?.removeEventListener('click', onClick);
      workshopPanel = null;
    },
  };
}

export type TycoonUI = ReturnType<typeof createTycoonUI>;
