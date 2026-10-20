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
  BOARD_SIZE,
  CONTRACTS_MAX,
  DESTS,
  DEST_IDS,
  ROLES,
  SHIP_MAX,
  SHIP_QTY,
  STAFF_CUT,
  STAFF_HIRE,
  accept,
  board,
  boardEnds,
  buyToCar,
  deliver,
  destAt,
  dropContract,
  hire,
  letGo,
  roleAt,
  sellFromCar,
  ship,
  shipFee,
  shipMinutes,
  type DestId,
  DEPOT_CAP,
  ENTRIES,
  ENTRY_IDS,
  FACTORY,
  HQ_BOOST,
  LOAN_FEE,
  LOAN_SHARE,
  LOT_KINDS,
  LOT_KIND_IDS,
  SUPERSTORE,
  borrow,
  buildLot,
  buyLot,
  goodsValue,
  hasHQ,
  kindAt,
  line,
  loanLimit,
  lotAt,
  lotPrice,
  makes,
  placeAt,
  propertyValue,
  repay,
  shipFeeFrom,
  worth,
  type LotKind,
} from './tycoon';
import { DOORS, LOT_SITE, STALL_SPOT, UNIT_SITE } from './solids';
import type { Sfx } from './combat';
import { createMissionsUI } from './missions-ui';

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
const PLACE_LIST: PlaceId[] = ['stall', 'u0', 'u1', 'u2', 'u3', 'l0', 'l1', 'l2', 'workshop'];
const STAND = Object.fromEntries(PLACE_LIST.map((p) => [p, placeAt(p)])) as Record<PlaceId, { x: number; z: number }>;
/** Standing this close serves a stall's or shop's customers; a car this close is parked there */
const SERVE_R = 2.2;
const CAR_R = 9;
const UNIT_IDS = ['u0', 'u1', 'u2', 'u3'] as const;
const LOT_IDS = ['l0', 'l1', 'l2'] as const;
/** The Units tab's places: Makers' Row's four units, then the three big lots */
const ROW_IDS: PlaceId[] = [...UNIT_IDS, ...LOT_IDS];
const LETTER = 'ABC';
const PRODUCT_LIST = GOODS.filter((g) => !g.raw).map((g) => g.id);
type Tab = 'stall' | 'units' | 'workshop' | 'car';
const TABS: { id: Tab; label: string }[] = [
  { id: 'stall', label: 'Stall' },
  { id: 'units', label: 'Units' },
  { id: 'workshop', label: 'Workshop' },
  { id: 'car', label: 'Car' },
];
const KIND_BLURB: Record<UnitKind | LotKind, string> = {
  garden: 'Grows sugar, coffee beans or cotton for the Workshop.',
  shop: `Sells like a bigger stall: ${SHOP.slots} shelves of ${SHOP.capacity}, more customers.`,
  warehouse: `Holds ${WAREHOUSE_CAP} of anything, ready to load into your car.`,
  superstore: `${SUPERSTORE.slots} aisles of ${SUPERSTORE.capacity}, and crowds of customers.`,
  factory: `Its own production line: ${FACTORY.speed}x the Workshop's speed, jobs of up to ${FACTORY.jobMax}.`,
  depot: `Holds ${DEPOT_CAP} of anything; couriers from it cost half.`,
  offices: `Your HQ: every stall, shop and superstore sells ${Math.round((HQ_BOOST - 1) * 100)}% faster.`,
};

/** The building panels the economy fills in, by spot (the Emporium's market hall, the Workshop, the Signal tower's contracts, the Post office's couriers, the Apartments' staff) */
const PANELS = {
  emporium: '[data-market]',
  workshop: '[data-workshop]',
  signal: '[data-contracts]',
  telegram: '[data-couriers]',
  apartments: '[data-staff]',
  vault: '[data-bank]',
} as const;
type PanelId = keyof typeof PANELS;
const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

export interface TycoonHooks {
  /** Where Degen is standing in walk mode, on foot (null otherwise) */
  walker(): { x: number; z: number } | null;
  /** Your car, if it's out of the garage */
  car(): { x: number; z: number; model: string; name: string; speed: number } | null;
  /** Open the Emporium's market hall */
  openMarket(): void;
  /** Something the city shows changed (the stall's crates, the units, where contracts go) */
  stock(s: TycoonSave): void;
  /** The card opened (walk mode frees the mouse) */
  opened(): void;
  /** The sound switch (missions claimed, level-ups) */
  sfx(kind: Sfx, gain?: number): void;
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
  /** The building panel the economy is showing in, if any */
  let panel: { id: PanelId; el: HTMLElement } | null = null;
  let note = '';
  let toastTimer = 0;
  let tab: Tab = 'stall';
  let unitSel = 0;
  /** The market hall's place: where Buy delivers and Sell takes from (or your car, parked at the Emporium) */
  let marketAt: PlaceId | 'car' = 'stall';
  /** The Post office's form: from where, to where */
  let sendFrom: PlaceId | null = null;
  let sendTo: PlaceId | null = null;

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
  // Missions, the level pill and badges (missions-ui.ts) run on the same save; `changed()` is hoisted
  const missions = createMissionsUI(root, { save: () => save, commit: () => changed(), toast, sfx: (kind, gain) => h.sfx(kind, gain) });

  /* ---------- Places ---------- */
  function placeName(p: PlaceId) {
    if (p === 'stall') return 'Your stall';
    if (p === 'workshop') return 'The Workshop';
    const i = Number(p.slice(1));
    if (p.startsWith('l')) {
      const l = save.lots[i];
      return `Lot ${LETTER[i]}${l?.kind ? ` · ${LOT_KINDS[l.kind].name}` : ''}`;
    }
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
      if (d < bestD && (p === 'stall' || p === 'workshop' || kindAt(save, p))) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }
  /** The car parked (or stopped) near a building's door: the Emporium (buying into it) or a contract's drop-off */
  function carNear(at: { x: number; z: number }) {
    const c = h.car();
    return !!c && Math.abs(c.speed) <= 0.5 && Math.hypot(at.x - c.x, at.z - c.z) < CAR_R;
  }
  const carAtEmporium = () => carNear(DOORS.find((d) => d.id === 'emporium')!);
  const carAtDest = (): DestId | null => DEST_IDS.find((d) => carNear(destAt(d))) ?? null;
  const why = (r: Result, id?: GoodId, p: PlaceId = 'stall') => {
    if (r.ok) return '';
    if (r.why === 'money') return 'Not enough Dorras.';
    if (r.why === 'room') {
      if (id && isRaw(id) && sells(save, p)) return `${good(id).name} is a raw good: it goes to the Workshop or a warehouse, not on shelves.`;
      if (id && sells(save, p) && !holds(save, p, id)) return `${placeName(p)} has no free shelf. Sell one out first.`;
      return 'No room for that there.';
    }
    if (r.why === 'stock') return 'None there.';
    if (r.why === 'busy') return p && makes(save, p) && p !== 'workshop' ? 'That factory is already on a job.' : 'The Workshop is already on a job.';
    if (r.why === 'place') return "That can't be done there.";
    if (r.why === 'owned') return 'Already done.';
    if (r.why === 'time') return 'Too late: that contract has gone.';
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
    const big = kindAt(save, p) === 'superstore';
    const slots = p === 'stall' ? save.stall.slots : (unitAt(save, p) ?? lotAt(save, p))!.slots;
    const max = p === 'stall' ? stallLevel(save.stall.level).slots : big ? SUPERSTORE.slots : SHOP.slots;
    const capacity = p === 'stall' ? stallLevel(save.stall.level).capacity : big ? SUPERSTORE.capacity : SHOP.capacity;
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
  const serveNote = (p: PlaceId) =>
    (serving() === p ? ' · <b class="stall-serving">You\'re serving: customers come twice as fast</b>' : '') +
    (save.staff.includes(p) ? ` · <b class="stall-serving">${ROLES[roleAt(save, p)!].name} at work</b>` : '');

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

  const lotOptions = (i: number) =>
    `<ul class="biz-build">${LOT_KIND_IDS.filter((k) => k !== save.lots[i]?.kind)
      .map((k) => {
        const blocked = k === 'offices' && hasHQ(save);
        return `<li><div><b>${LOT_KINDS[k].name}</b><small>${blocked ? 'You have your offices already.' : KIND_BLURB[k]}</small></div>
        <button type="button" class="chip-link" data-build-lot="${k}" data-lot-i="${i}" ${save.dorras >= LOT_KINDS[k].cost && !blocked ? '' : 'disabled'}>Build · ${fmt.format(LOT_KINDS[k].cost)}</button></li>`;
      })
      .join('')}</ul>`;

  /** A big lot's view (on the Units tab) */
  function lotView(i: number, now: number) {
    const p = LOT_IDS[i];
    const l = save.lots[i];
    let body = '';
    if (!l) {
      const price = lotPrice(save);
      body = `<p class="stall-empty">Lot ${LETTER[i]}, a big lot east of Makers' Row: room for a superstore, a factory, a depot or your offices. Bought with Dorras.</p>
        <div class="stall-actions"><button type="button" class="shop-take" data-buy-lot="${i}" ${price !== null && save.dorras >= price ? '' : 'disabled'}>Buy lot ${LETTER[i]} · ${fmt.format(price ?? 0)} Dorras</button></div>`;
    } else if (!l.kind) body = `<p class="stall-empty">Your lot is ready. What should it be?</p>${lotOptions(i)}`;
    else if (l.kind === 'superstore')
      body = `<p class="stall-status">Superstore · ${SUPERSTORE.slots} kinds of goods, ${SUPERSTORE.capacity} of each${serveNote(p)}</p>
        ${shelvesView(p, now)}${carHere(p)}
        <div class="stall-actions"><button type="button" class="shop-take" data-to-market data-at="${p}">Market hall</button></div>`;
    else if (l.kind === 'factory') body = lineView(p);
    else if (l.kind === 'depot')
      body = `<p class="stall-status">Depot · ${total(l.stock)} / ${DEPOT_CAP} · couriers from here cost half</p>
        <i class="stall-bar" style="--v:${total(l.stock) / DEPOT_CAP}"></i>
        ${stockList(l.stock, 'Empty. Buy stock into it at the market hall, or unload your car here.')}${carHere(p)}`;
    else body = `<p class="stall-status">Offices · your HQ</p><p class="stall-empty">Every stall, shop and superstore you own sells ${Math.round((HQ_BOOST - 1) * 100)}% faster while you have offices.</p>`;
    const rebuild = l?.kind && total(stockAt(save, p)) === 0 && !l.job ? `<details class="biz-rebuild"><summary>Rebuild lot ${LETTER[i]}</summary>${lotOptions(i)}</details>` : '';
    return `${body}${rebuild}`;
  }

  function unitView(now: number) {
    const chips = ROW_IDS.map((p, i) => {
      const k = kindAt(save, p);
      const owned = i < 4 ? save.units[i] : save.lots[i - 4];
      const name = k ? (i < 4 ? UNIT_KINDS[k as UnitKind].name : LOT_KINDS[k as LotKind].name) : owned ? 'Empty' : i < 4 ? 'To let' : 'For sale';
      return `<button type="button" data-unit="${i}" aria-pressed="${i === unitSel}">${i < 4 ? i + 1 : LETTER[i - 4]}<small>${name}</small></button>`;
    }).join('');
    const tabs = `<p class="biz-label">Makers' Row · big lots</p><div class="seg biz-units" role="group" aria-label="Your units and lots">${chips}</div>`;
    if (unitSel >= 4) return tabs + lotView(unitSel - 4, now);
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
      body = `<p class="stall-status">Garden · ${perMin(CROPS[u.crop])} ${esc(good(u.crop).name.toLowerCase())} a minute, also while you're away${serveNote(p)}</p>
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
    return `${tabs}${body}${rebuild}`;
  }

  const workshopView = () => lineView('workshop');
  /** A production line: the Workshop or a factory (its bay, its job, what it can make) */
  function lineView(p: PlaceId) {
    const ln = line(save, p)!;
    const j = ln.job;
    const each = (id: ProductId) => RECIPES[id]!.minutes / ln.speed;
    const bay = total(ln.stock);
    const cap = p === 'workshop' ? WORKSHOP_CAP : FACTORY.cap;
    const job = j
      ? `<div class="stall-slot biz-job"><div class="stall-slot-top">${dot(j.make)}<b>Making ${esc(good(j.make).name)}</b><span class="stall-qty">${j.left} to go</span></div>
          <i class="stall-bar" style="--v:${j.t / RECIPES[j.make]!.minutes}"></i>
          <small class="stall-pace">${secs(each(j.make))} each · done in about ${secs((j.left * RECIPES[j.make]!.minutes - j.t) / ln.speed)} · <button type="button" class="chip-link stall-clear" data-stop data-at="${p}">Stop</button></small></div>`
      : '';
    const recipes = RECIPE_IDS.map((id) => {
      const r = RECIPES[id]!;
      const n = canMake(save, id, p);
      const needs = Object.entries(r.needs)
        .map(([raw, k]) => `${k} ${esc(good(raw as RawId).name.toLowerCase())}`)
        .join(' + ');
      return `<li class="market-row">
        <div class="market-top">${dot(id)}<b>${esc(good(id).name)}</b><span class="stall-qty">${secs(each(id))} each</span></div>
        <div class="market-acts"><small>Needs ${needs} · enough for <b>${n}</b></small>
          <span class="market-btns"><button type="button" data-make="${id}" data-at="${p}" data-n="10" ${n && !j ? '' : 'disabled'}>Make ${Math.min(10, n) || 10}</button><button type="button" data-make="${id}" data-at="${p}" data-n="${n}" ${n && !j ? '' : 'disabled'}>Make all</button></span></div>
      </li>`;
    }).join('');
    return `<p class="stall-status">${p === 'workshop' ? "The Workshop's bay" : 'Factory bay'} · ${bay} / ${cap}${serveNote(p)}</p>
      ${stockList(ln.stock, `Empty. Bring raw goods from your gardens in your car, or buy them into ${p === 'workshop' ? 'the Workshop' : 'the factory'} at the market hall.`)}
      ${job}
      <ul class="market-list">${recipes}</ul>
      ${carHere(p)}
      <p class="city-panel-fine">Raw goods leave the bay when a job starts; products land in it as they're made, also while you're away. Load them into your car for your stall and shops, or sell them at the market hall.</p>`;
  }

  function carView(now: number) {
    const c = h.car();
    const at = carAt();
    if (!c) return `<p class="stall-empty">Your car is at the garage on the south bank. Walk there, get in, and drive it to your places to load and unload goods.</p>${stockList(save.cargo, '')}${contractsDue(now)}`;
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
      ${contractsDue(now)}
      <p class="city-panel-fine">Delivering to your stall or a shop yourself pays a bonus of ${Math.round(DELIVERY_BONUS * 100)}% of the goods' price.</p>`;
  }

  /** Your contracts, with Deliver where the car is parked at the drop-off */
  function contractsDue(now: number) {
    if (!save.contracts.length) return '';
    const here = carAtDest();
    const rows = save.contracts
      .map((k) => {
        const have = save.cargo[k.good] ?? 0;
        const ready = here === k.to && have >= k.qty;
        return `<li class="market-row"><div class="market-top">${dot(k.good)}<b>${k.qty} ${esc(good(k.good).name)} → ${esc(DESTS[k.to])}</b><span class="market-price">${D(k.reward)}</span></div>
          <div class="market-acts"><small>${have >= k.qty ? 'In the car' : `${have} / ${k.qty} in the car`} · ${clock(k.expires - now)} left${here === k.to ? ' · you\'re here' : ''}</small>
          <span class="market-btns"><button type="button" data-deliver="${k.id}" ${ready ? '' : 'disabled'}>Deliver</button></span></div></li>`;
      })
      .join('');
    return `<p class="biz-label">Your contracts</p><ul class="market-list">${rows}</ul>`;
  }

  /* ---------- The Signal tower: news and contracts ---------- */
  function contractsView(now: number) {
    // News: what's moving at the market hall
    const moves = PRODUCT_LIST.map((id) => ({ id, d: (marketPrice(id, now + 10 * 60000) - marketPrice(id, now)) / good(id).base })).sort((a, b) => b.d - a.d);
    const up = moves[0];
    const down = moves[moves.length - 1];
    const offers = board(now);
    const news = [
      up.d > 0.02 ? `${good(up.id).name}: prices climbing at the market hall.` : `Market hall prices are holding steady.`,
      down.d < -0.02 ? `${good(down.id).name}: prices falling, a good time to stock up.` : '',
      `${DESTS[offers[0].to]} is after ${good(offers[0].good).name.toLowerCase()}.`,
    ].filter(Boolean);
    const taken = (id: number) => save.taken.includes(id);
    const full = save.contracts.length >= CONTRACTS_MAX;
    const offerRows = offers
      .map(
        (k) => `<li class="market-row"><div class="market-top">${dot(k.good)}<b>${k.qty} ${esc(good(k.good).name)} → ${esc(DESTS[k.to])}</b><span class="market-price">${D(k.reward)}</span></div>
        <div class="market-acts"><small>Goods worth about ${fmt.format(k.qty * marketPrice(k.good, now))} · 30 minutes to deliver</small>
        <span class="market-btns"><button type="button" data-take="${k.id}" ${taken(k.id) || full ? 'disabled' : ''}>${taken(k.id) ? 'Taken' : 'Take it'}</button></span></div></li>`
      )
      .join('');
    const mine = save.contracts
      .map(
        (k) => `<li class="market-row"><div class="market-top">${dot(k.good)}<b>${k.qty} ${esc(good(k.good).name)} → ${esc(DESTS[k.to])}</b><span class="market-price">${D(k.reward)}</span></div>
        <div class="market-acts"><small>${Math.min(save.cargo[k.good] ?? 0, k.qty)} / ${k.qty} in your car · ${clock(k.expires - now)} left</small>
        <span class="market-btns"><button type="button" data-drop="${k.id}">Give up</button></span></div></li>`
      )
      .join('');
    return `<ul class="biz-news">${news.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      ${mine ? `<p class="biz-label">Your contracts · ${save.contracts.length} / ${CONTRACTS_MAX}</p><ul class="market-list">${mine}</ul>` : ''}
      <p class="biz-label">On the board · new in ${clock(boardEnds(now) - now)}</p>
      <ul class="market-list">${offerRows}</ul>
      <p class="city-panel-fine">Get the goods into your car (a warehouse, the Workshop, or buy them into it at the market hall with your car parked outside), drive to the building and park by its door: Deliver is on your business card's Car tab. A beam of light marks each drop-off. Up to ${CONTRACTS_MAX} at once; giving one up costs nothing. ${BOARD_SIZE} new contracts every 20 minutes.</p>`;
  }

  /* ---------- The Post office: couriers ---------- */
  function couriersView(now: number) {
    const sources = PLACE_LIST.filter((p) => loadsFrom(save, p) && total(stockAt(save, p)) > 0);
    if (!sources.includes(sendFrom!)) sendFrom = sources[0] ?? null;
    const dests = PLACE_LIST.filter((p) => p !== sendFrom && (p === 'stall' || p === 'workshop' || ['shop', 'warehouse', 'superstore', 'depot', 'factory'].includes(kindAt(save, p) ?? '')));
    if (!dests.includes(sendTo!)) sendTo = dests[0] ?? null;
    const transit = save.shipments
      .map(
        (sh) => `<li class="market-row"><div class="market-top">${dot(sh.good)}<b>${sh.qty} ${esc(good(sh.good).name)}</b><span class="stall-qty">${sh.arrives > now ? `${clock(sh.arrives - now)}` : 'waiting for room'}</span></div>
        <div class="market-acts"><small>${esc(shortName(sh.from))} → ${esc(shortName(sh.to))}</small></div></li>`
      )
      .join('');
    const busy = save.shipments.length >= SHIP_MAX;
    let form = '';
    if (!sendFrom) form = '<p class="stall-empty">Couriers pick up from a garden, a warehouse or the Workshop. Nothing to send yet.</p>';
    else {
      const here = stockAt(save, sendFrom);
      const rows = GOODS.map((g) => g.id)
        .filter((id) => (here[id] ?? 0) > 0)
        .map((id) => {
          const n = Math.min(here[id]!, SHIP_QTY, sendTo ? room(save, id, sendTo) : 0);
          return `<li class="market-row"><div class="market-top">${dot(id)}<b>${esc(good(id).name)}</b><span class="stall-qty">${here[id]} here</span></div>
            <div class="market-acts"><small>${n > 0 ? `${n} for ${fmt.format(shipFeeFrom(save, sendFrom!, id, n, now))} Dorras · ${shipMinutes(sendFrom!, sendTo!)} min` : 'No room for it there'}</small>
            <span class="market-btns"><button type="button" data-send="${id}" data-n="${Math.min(10, n)}" ${n > 0 && !busy ? '' : 'disabled'}>Send ${Math.min(10, n) || 10}</button><button type="button" data-send="${id}" data-n="${n}" ${n > 0 && !busy ? '' : 'disabled'}>Send ${n || 'all'}</button></span></div></li>`;
        })
        .join('');
      form = `<div class="market-at"><small>From</small><div class="seg stall-seg" role="group" aria-label="Send from">${sources.map((p) => `<button type="button" data-send-from="${p}" aria-pressed="${p === sendFrom}">${esc(shortName(p))}</button>`).join('')}</div></div>
        <div class="market-at"><small>To</small><div class="seg stall-seg" role="group" aria-label="Send to">${dests.map((p) => `<button type="button" data-send-to="${p}" aria-pressed="${p === sendTo}">${esc(shortName(p))}</button>`).join('')}</div></div>
        <ul class="market-list">${rows}</ul>`;
    }
    return `${transit ? `<p class="biz-label">On the way · ${save.shipments.length} / ${SHIP_MAX}</p><ul class="market-list">${transit}</ul>` : ''}
      <p class="biz-label">Send goods</p>${form}
      <p class="city-panel-fine">Couriers carry up to ${SHIP_QTY} at a time, ${SHIP_MAX} out at once, and arrive while you're away too. No delivery bonus: that's for driving it yourself. Contracts need your own car.</p>`;
  }

  /* ---------- The Apartments: staff ---------- */
  function staffView() {
    const rows = PLACE_LIST.filter((p) => roleAt(save, p))
      .map((p) => {
        const role = ROLES[roleAt(save, p)!];
        const on = save.staff.includes(p);
        return `<li class="market-row"><div class="market-top"><b>${esc(placeName(p))}</b><span class="stall-qty">${role.name}</span></div>
          <div class="market-acts"><small>${on ? '<b class="stall-serving">At work</b> · ' : ''}${esc(role.blurb)}</small>
          <span class="market-btns">${on ? `<button type="button" data-let-go="${p}">Let go</button>` : `<button type="button" data-hire="${p}" ${save.dorras >= STAFF_HIRE ? '' : 'disabled'}>Hire · ${fmt.format(STAFF_HIRE)}</button>`}</span></div></li>`;
      })
      .join('');
    return `<ul class="market-list">${rows}</ul>
      <p class="city-panel-fine">Hiring costs ${fmt.format(STAFF_HIRE)} Dorras. Then each keeps ${Math.round(STAFF_CUT * 100)}% of the value of what they sell, grow or make, paid from the till (or your balance), so they only cost anything while there's work. If they can't be paid, they leave. Build a garden or shop on a unit to hire for it.</p>`;
  }

  /* ---------- The Vault: what your business is worth, the ledger, loans ---------- */
  function bankView(now: number) {
    const goods = goodsValue(save, now);
    const prop = propertyValue(save);
    const limit = loanLimit(save);
    const rows = (inn: boolean) =>
      ENTRY_IDS.filter((e) => ENTRIES[e].in === inn && (save.ledger.totals[e] ?? 0) > 0)
        .map((e) => `<li><span>${ENTRIES[e].name}</span><b>${fmt.format(save.ledger.totals[e]!)}</b></li>`)
        .join('') || '<li><span>Nothing yet</span><b>·</b></li>';
    const recent = save.ledger.recent
      .slice(-8)
      .reverse()
      .map((x) => `<li><span>${ENTRIES[x.e].name}</span><b class="${ENTRIES[x.e].in ? 'is-in' : 'is-out'}">${ENTRIES[x.e].in ? '+' : '-'}${fmt.format(x.n)}</b></li>`)
      .join('');
    const amounts = [1000, 5000, 10000, 25000, 50000].filter((n) => n <= limit);
    const loan = save.loan
      ? `<div class="stall-slot"><div class="stall-slot-top"><b>Your loan</b><span class="stall-qty">${fmt.format(save.loan.owed)} owed</span></div>
          <i class="stall-bar" style="--v:${1 - save.loan.owed / Math.max(1, Math.ceil(save.loan.borrowed * (1 + LOAN_FEE)))}"></i>
          <small class="stall-pace">${Math.round(LOAN_SHARE * 100)}% of your takings go to it until it's paid off.</small>
          <span class="market-btns"><button type="button" data-repay="${Math.min(save.loan.owed, 1000)}" ${save.dorras >= 1 ? '' : 'disabled'}>Pay ${fmt.format(Math.min(save.loan.owed, 1000))}</button><button type="button" data-repay="${save.loan.owed}" ${save.dorras >= save.loan.owed ? '' : 'disabled'}>Pay it all</button></span></div>`
      : `<p class="stall-empty">Borrow to grow faster: a flat ${Math.round(LOAN_FEE * 100)}% fee on top, and ${Math.round(LOAN_SHARE * 100)}% of your takings go to it until it's paid off (or pay it off any time). The more property you own, the more the Vault lends: up to ${fmt.format(limit)} now.</p>
        <span class="market-btns biz-loans">${amounts.map((n) => `<button type="button" data-borrow="${n}">Borrow ${fmt.format(n)}</button>`).join('')}</span>`;
    return `<ul class="biz-worth">
        <li><span>Balance</span><b>${D(save.dorras)}</b></li>
        <li><span>In the till</span><b>${D(save.till)}</b></li>
        <li><span>Goods</span><b>${D(goods)}</b></li>
        <li><span>Property</span><b>${D(prop)}</b></li>
        ${save.loan ? `<li><span>Owed</span><b>-${fmt.format(save.loan.owed)}</b></li>` : ''}
        <li class="is-total"><span>Your business is worth</span><b>${D(worth(save, now))}</b></li>
      </ul>
      <p class="biz-label">Loans</p>${loan}
      <div class="biz-ledger"><div><p class="biz-label">In, all time</p><ul>${rows(true)}</ul></div><div><p class="biz-label">Out, all time</p><ul>${rows(false)}</ul></div></div>
      ${recent ? `<p class="biz-label">Latest</p><ul class="biz-recent">${recent}</ul>` : ''}
      <p class="city-panel-fine">Dorras are the city's own money, earned by playing. They can't be bought or cashed out.</p>`;
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
    else if (at?.startsWith('u') || at?.startsWith('l')) {
      tab = 'units';
      unitSel = ROW_IDS.indexOf(at);
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
    if ('openStall' in ds) return void openCard(marketAt === 'car' ? 'car' : marketAt);
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
    } else if (ds.buyLot) {
      const i = Number(ds.buyLot);
      const r = buyLot(save, i);
      note = r.ok ? `Lot ${LETTER[i]} is yours. Build something big on it.` : why(r);
    } else if (ds.buildLot) {
      const i = Number(ds.lotI);
      const r = buildLot(save, i, ds.buildLot as LotKind);
      note = r.ok ? `Lot ${LETTER[i]} is now your ${LOT_KINDS[ds.buildLot as LotKind].name.toLowerCase()}.` : r.why === 'stock' ? 'Empty it of goods (and stop its job) first.' : why(r);
    } else if (ds.borrow) {
      const r = borrow(save, Number(ds.borrow));
      note = r.ok ? `Borrowed ${fmt.format(r.dorras)} Dorras.` : r.why === 'busy' ? 'Pay off your loan first.' : 'More than the Vault will lend you.';
    } else if (ds.repay) {
      const r = repay(save, Number(ds.repay));
      note = r.ok ? (save.loan ? `Paid ${fmt.format(r.dorras)} Dorras off your loan.` : 'Your loan is paid off.') : why(r);
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
      const r = startJob(save, ds.make as ProductId, Number(ds.n), (ds.at as PlaceId) ?? 'workshop');
      note = r.ok ? `Making ${r.qty} ${good(ds.make as GoodId).name}.` : why(r, undefined, (ds.at as PlaceId) ?? 'workshop');
    } else if ('stop' in ds) {
      cancelJob(save, (ds.at as PlaceId) ?? 'workshop');
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
      const c = h.car();
      const r = marketAt === 'car' ? (c ? buyToCar(save, ds.buy as GoodId, Number(ds.n), now, cargoCap(c.model)) : ({ ok: false, why: 'place' } as Result)) : buy(save, ds.buy as GoodId, Number(ds.n), now, marketAt);
      const to = marketAt === 'car' ? 'your car' : placeName(marketAt);
      note = r.ok ? `Bought ${r.qty} ${good(ds.buy as GoodId).name} for ${fmt.format(r.dorras)} Dorras, delivered to ${to}.` : r.why === 'room' && marketAt === 'car' ? 'Your car is full.' : why(r, ds.buy as GoodId, marketAt === 'car' ? 'stall' : marketAt);
    } else if (ds.sell) {
      const r = marketAt === 'car' ? sellFromCar(save, ds.sell as GoodId, Number(ds.n), now) : sellBack(save, ds.sell as GoodId, Number(ds.n), now, marketAt);
      note = r.ok ? `Sold ${r.qty} ${good(ds.sell as GoodId).name} for ${fmt.format(r.dorras)} Dorras.` : why(r);
    } else if (ds.marketAt) marketAt = ds.marketAt as PlaceId | 'car';
    else if (ds.take) {
      const r = accept(save, Number(ds.take), now);
      note = r.ok ? 'Contract taken: a beam of light marks the drop-off.' : r.why === 'max' ? `You have ${CONTRACTS_MAX} contracts on the go already.` : why(r);
    } else if (ds.drop) {
      dropContract(save, Number(ds.drop));
      note = 'Contract given up.';
    } else if (ds.deliver) {
      const d = carAtDest();
      const r = d ? deliver(save, Number(ds.deliver), d, now) : ({ ok: false, why: 'place' } as Result);
      note = r.ok ? `Delivered! ${fmt.format(r.dorras)} Dorras paid.` : r.why === 'stock' ? "The goods aren't all in your car." : r.why === 'place' ? 'Park by the drop-off first.' : why(r);
    } else if (ds.sendFrom) sendFrom = ds.sendFrom as PlaceId;
    else if (ds.sendTo) sendTo = ds.sendTo as PlaceId;
    else if (ds.send && sendFrom && sendTo) {
      const r = ship(save, sendFrom, sendTo, ds.send as GoodId, Number(ds.n), now);
      note = r.ok ? `A courier is on the way with ${r.qty} ${good(ds.send as GoodId).name} (${fmt.format(r.dorras)} Dorras).` : r.why === 'busy' ? `All ${SHIP_MAX} couriers are out.` : why(r, ds.send as GoodId, sendTo);
    } else if (ds.hire) {
      const r = hire(save, ds.hire as PlaceId);
      note = r.ok ? `Hired a ${ROLES[roleAt(save, ds.hire as PlaceId)!].name.toLowerCase()} for ${placeName(ds.hire as PlaceId).replace('Your', 'your').replace('The', 'the')}.` : why(r);
    } else if (ds.letGo) {
      letGo(save, ds.letGo as PlaceId);
      note = 'Let go.';
    } else return;
    changed();
  }
  const onClick = (e: Event) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    // The mission board's buttons first (on the Signal tower's panel), then the economy's
    if (btn && !btn.disabled && !missions.act(btn)) act(btn, Date.now());
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
  function marketView(now: number) {
    // Where Buy can deliver to and Sell can take from
    const car = h.car();
    const at: (PlaceId | 'car')[] = ['stall', ...ROW_IDS.filter((p) => kindAt(save, p) && kindAt(save, p) !== 'offices'), 'workshop', ...(car && carAtEmporium() ? (['car'] as const) : [])];
    if (!at.includes(marketAt)) marketAt = 'stall';
    const row = (id: GoodId) => {
      const t = trend(id, now);
      const held = marketAt === 'car' ? (save.cargo[id] ?? 0) : holds(save, marketAt, id);
      const fits = marketAt === 'car' ? Math.max(0, cargoCap(car!.model) - total(save.cargo)) : room(save, id, marketAt);
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
    return `
      <div class="market-head"><span>Your Dorras</span><span class="market-balance">${D(save.dorras)}</span></div>
      <div class="market-at"><small>Deliver to and sell from</small>
        <div class="seg stall-seg" role="group" aria-label="Deliver to and sell from">${at.map((p) => `<button type="button" data-market-at="${p}" aria-pressed="${p === marketAt}">${p === 'car' ? 'Your car' : esc(shortName(p))}</button>`).join('')}</div>
      </div>
      <ul class="market-list">${GOODS.filter((g) => !g.raw)
        .map((g) => row(g.id))
        .join('')}</ul>
      <p class="biz-label">Raw goods · for the Workshop</p>
      <ul class="market-list">${RAW_IDS.map(row).join('')}</ul>
      ${note ? `<p class="shop-note" role="status">${esc(note)}</p>` : ''}
      <div class="city-panel-actions"><button type="button" class="chip-link" data-open-stall>Your business</button></div>
      <p class="city-panel-fine">Prices move through the day, the same for everyone. Raw goods only go to the Workshop, a warehouse or your car; customers buy products from your stall and shops. Park your car outside to buy straight into it.</p>`;
  }
  /** Fill the building panel that's open */
  function paintPanel() {
    if (!panel) return;
    const now = Date.now();
    const noteHtml = note ? `<p class="shop-note" role="status">${esc(note)}</p>` : '';
    const toCard = (tabId: Tab) => `<div class="city-panel-actions"><button type="button" class="chip-link" data-tab="${tabId}">Your business</button></div>`;
    const html =
      panel.id === 'emporium'
        ? marketView(now)
        : panel.id === 'workshop'
          ? `${workshopView()}${noteHtml}${toCard('workshop')}`
          : panel.id === 'signal'
            ? `${contractsView(now)}${noteHtml}${missions.boardHtml(now)}${toCard('car')}`
            : panel.id === 'telegram'
              ? `${couriersView(now)}${noteHtml}${toCard('units')}`
              : panel.id === 'vault'
                ? `${bankView(now)}${noteHtml}${toCard('units')}`
                : `${staffView()}${noteHtml}${toCard('units')}`;
    repaint(panel.el, html);
  }

  /* ---------- Ticking ---------- */
  let lastShown = '';
  function changed() {
    // Badges and level-ups first, so their XP is in the save that's stored
    missions.onCommit();
    store();
    paintPill();
    paintCard();
    paintPanel();
    // The city only redraws what changed (crate stacks, units, the contracts' beams)
    const shown = JSON.stringify([save.stall, save.units, save.lots, save.contracts.map((c) => c.to)]);
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
      s.arrived.length ? `took in ${s.arrived.length} courier${s.arrived.length > 1 ? 's' : ''}` : '',
      s.wages ? `paid ${fmt.format(s.wages)} Dorras to staff` : '',
      s.repaid ? `paid ${fmt.format(s.repaid)} off your loan` : '',
    ].filter(Boolean);
    const extra = [s.quit.length ? `${s.quit.length > 1 ? 'Some staff' : 'A member of staff'} left: there wasn't enough to pay them.` : '', s.expired.length ? `${s.expired.length} contract${s.expired.length > 1 ? 's' : ''} ran out.` : '']
      .filter(Boolean)
      .join(' ');
    return `${parts.length ? `While you were away your business ${parts.join(', ')}.` : ''} ${extra}`.trim();
  }
  function tick() {
    const sales = advance(save, Date.now(), serving() ?? false);
    // Back after a while: say what happened
    if (sales.away > 0) {
      const msg = awayNote(sales);
      if (msg) toast(msg, 7000);
    } else if (sales.quit.length) toast(`Your ${sales.quit.map((p) => ROLES[roleAt(save, p) ?? 'hand'].name.toLowerCase()).join(' and ')} left: there wasn't enough to pay them.`);
    else if (sales.expired.length) toast(`A contract ran out: ${sales.expired[0].qty} ${good(sales.expired[0].good).name} for ${DESTS[sales.expired[0].to]}.`);
    else if (sales.arrived.length) toast(`A courier delivered ${sales.arrived[0].qty} ${good(sales.arrived[0].good).name} to ${placeName(sales.arrived[0].to)}.`, 4000);
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
        ...save.contracts.map((c) => ({ id: 'car', ...destAt(c.to), label: `Deliver · ${DESTS[c.to]}` })),
      ];
    },
    /** A building's panel opened: fill in its part of the economy, if it has one */
    mountPanel(id: string, panelBody: HTMLElement) {
      this.unmountPanel();
      if (!(id in PANELS)) return;
      const el = panelBody.querySelector<HTMLElement>(PANELS[id as PanelId]);
      if (!el) return;
      el.addEventListener('click', onClick);
      panel = { id: id as PanelId, el };
      note = '';
      paintPanel();
    },
    unmountPanel() {
      panel?.el.removeEventListener('click', onClick);
      panel = null;
    },

  };
}

export type TycoonUI = ReturnType<typeof createTycoonUI>;
