/*
 * The economy's screens (tycoon.ts holds the rules; the save, the tick, the
 * Dorras readout and the card's shell are tycoon-boot.ts's, in the boot;
 * this is a chunk fetched the first time the card or one of these panels
 * opens: the polish plan's Phase 4):
 *
 * - Your business card (`[data-biz]`, the hub's Business tab): the till and
 *   Collect on top, then five tabs:
 *   - Stall: its shelves, prices (Low / Fair / High), pace and upgrade;
 *   - Units: Makers' Row's four units: buy one, build it as a garden, shop or
 *     warehouse, then run it (a garden's crop and bins, a shop's shelves, a
 *     warehouse's stock);
 *   - Workshop: its bay (raw goods in, products out), the job running, and
 *     what it can make;
 *   - Car: what's in your car, and Load / Unload when it's parked at one of
 *     your places;
 *   - Bag: what Degen carries (inventory-ui.ts's `bagHtml()`), read-only,
 *     with the Armoury and the Night Market as ways in from the City view.
 *   It opens from the readout anywhere, and at your stall or a unit in walk
 *   mode (on that place).
 * - The market hall, inside the Emporium's state.panel (`[data-market]`): every
 *   good's price and trend; Buy delivers to, and Sell takes from, the place
 *   picked at the top.
 * - The Workshop's state.panel (`[data-workshop]`) shows the Workshop tab's view;
 *   the Signal tower's, the Post office's, the Apartments' and the Vault's
 *   panels take their parts here too (`PANELS` in tycoon-boot.ts). The
 *   Vault's downloads every city save as one backup file and loads one back
 *   (backup.ts checks it; a yes writes it and starts the city again).
 *
 * The views tick every second and are patched in place (`repaint()`), so a
 * button never changes under a finger.
 */
import {
  CROPS,
  DELIVERY_BONUS,
  GOODS,
  PRICE_LEVELS,
  PRICE_LEVEL_IDS,
  RAW_IDS,
  RECIPES,
  RECIPE_IDS,
  SHOP,
  UNIT_KINDS,
  UNIT_KIND_IDS,
  WAREHOUSE_CAP,
  askPrice,
  bidPrice,
  buildUnit,
  buy,
  buyUnit,
  cancelJob,
  canMake,
  cargoCap,
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
  type Slot,
  type Stock,
  type UnitKind,
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
  propertyValue,
  repay,
  shipFeeFrom,
  worth,
  type LotKind,
  capOf,
  capacityMul,
  gearValue,
  level,
  placeLevel,
  placeLevelCost,
  upgradePlace,
  CORNER,
  CORNER_LEVEL,
  buyCorner,
  cornerAt,
  cornerPrice,
} from './tycoon';
import { CORNER_SHOPS } from './projects';
import { DOORS } from './solids';
import { PLACE_LEVELS } from './catalog';
import { LV, whyNot } from './ui';
import { confirmHtml, focusConfirm } from './menukit';
import type { SpotId } from '../../lib/city';
import { BACKUP_KEYS, TYCOON_KEY as KEY, backupName, packBackup, readBackup, type ReadBackup } from './backup';
import { CORNER_IDS, LETTER, LOT_IDS, PLACE_LIST, ROW_IDS, STAND, TABS, UNIT_IDS, cornerName, fmt, type Tab, type TycoonCore, type TycoonScreens } from './tycoon-boot';

/** A car this close to a place is parked there */
const CAR_R = 9;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
/** The Dorras mark: a little coin */
const COIN = '<svg class="dorra" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor" opacity=".18"/><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 7h3.5a5 5 0 0 1 0 10H9zM7 12h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const D = (n: number) => `${COIN}<b>${fmt.format(Math.floor(n))}</b>`;
const dot = (id: GoodId) => `<span class="good-dot" style="--c:${good(id).color}"></span>`;
const perMin = (n: number) => (n >= 1 ? fmt.format(Math.round(n)) : n.toFixed(1));
const secs = (min: number) => (min >= 1 ? `${+min.toFixed(1)} min` : `${Math.max(1, Math.round(min * 60))} s`);

const PRODUCT_LIST = GOODS.filter((g) => !g.raw).map((g) => g.id);
const KIND_BLURB: Record<UnitKind | LotKind, string> = {
  garden: 'Grows raw goods for the Workshop',
  shop: `A bigger stall: ${SHOP.slots} shelves of ${SHOP.capacity}`,
  warehouse: `Holds ${WAREHOUSE_CAP} of anything`,
  superstore: `${SUPERSTORE.slots} aisles of ${SUPERSTORE.capacity}, big crowds`,
  factory: `${FACTORY.speed}x Workshop speed, jobs up to ${FACTORY.jobMax}`,
  depot: `Holds ${DEPOT_CAP}, half-price couriers`,
  offices: `HQ: your shops sell ${Math.round((HQ_BOOST - 1) * 100)}% faster`,
};

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};


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

export function createTycoonScreens(core: TycoonCore): TycoonScreens {
  const { save, h, card, cardBody, tabsEl, state, missions, changed, placeName, shortName, serving, cardOpen, openCard, closeCard } = core;
  /** The market hall's place: where Buy delivers and Sell takes from (or your car, parked at the Emporium) */
  let marketAt: PlaceId | 'car' = 'stall';
  /** The Post office's form: from where, to where */
  let sendFrom: PlaceId | null = null;
  let sendTo: PlaceId | null = null;
  /** A backup file read and waiting on a yes (the Vault) */
  let restoreAsk: Extract<ReadBackup, { ok: true }> | null = null;
  /** Give up was pressed on this contract: its row shows the confirm (menukit.ts; the board ticks, so the state paints it) */
  let askDrop: number | null = null;
  const stands = () => Object.entries(STAND) as [PlaceId, { x: number; z: number }][];

  function carAt(): PlaceId | null {
    const c = h.car();
    if (!c || Math.abs(c.speed) > 0.5) return null;
    let best: PlaceId | null = null;
    let bestD = CAR_R;
    for (const [p, s] of stands()) {
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
      if (id && isRaw(id) && sells(save, p)) return `${good(id).name} is raw. It can't go on shelves.`;
      if (id && sells(save, p) && !holds(save, p, id)) return `${placeName(p)} has no free shelf.`;
      return 'No room for that there.';
    }
    if (r.why === 'stock') return 'None there.';
    if (r.why === 'busy') return p && makes(save, p) && p !== 'workshop' ? 'That factory is already on a job.' : 'The Workshop is already on a job.';
    if (r.why === 'place') return "That can't be done there.";
    if (r.why === 'owned') return 'Already done.';
    if (r.why === 'time') return 'That contract has gone.';
    return 'Your stall is as big as it gets.';
  };


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
    const corner = cornerAt(save, p);
    const spec = corner ? CORNER : big ? SUPERSTORE : SHOP;
    const slots = p === 'stall' ? save.stall.slots : (corner ?? unitAt(save, p) ?? lotAt(save, p))!.slots;
    const max = p === 'stall' ? stallLevel(save.stall.level).slots : spec.slots;
    const capacity = p === 'stall' ? stallLevel(save.stall.level).capacity : Math.round(spec.capacity * capacityMul(save, p));
    const free = max - slots.length;
    return `${slots.length ? `<ul class="stall-slots">${slots.map((s) => slotRow(s, p, now, capacity)).join('')}</ul>` : ''}
      ${free > 0 ? `<p class="stall-empty">${free === max ? 'The shelves are empty.' : `${free} empty shel${free > 1 ? 'ves' : 'f'}.`} Stock up at the market hall.</p>` : ''}`;
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
  const carHere = (p: PlaceId) => (carAt() === p ? `<p class="biz-carhere"><span>Your car is here.</span><button type="button" class="chip-link" data-tab="car">Load / unload</button></p>` : '');
  /** "Level 2" on a place's status line, and the Upgrade button for the next level */
  const levelNote = (p: PlaceId) => (placeLevel(save, p) > 1 ? ` · <b class="stall-serving">Level ${placeLevel(save, p)}</b>` : '');
  const upgradeRow = (p: PlaceId) => {
    const cost = placeLevelCost(save, p);
    const l = placeLevel(save, p);
    if (cost === null && l < PLACE_LEVELS) return '';
    return `<div class="stall-actions biz-level">${
      cost === null
        ? `<span class="stall-max">Top level (${PLACE_LEVELS})</span>`
        : `<button type="button" class="chip-link" data-upgrade-place="${p}" ${save.dorras >= cost ? '' : 'disabled'}>Upgrade · ${fmt.format(cost)}</button><small class="biz-level-note">Level ${l + 1}: ${p === 'workshop' || makes(save, p) ? 'a bigger bay and faster jobs' : sells(save, p) ? 'fuller shelves, more customers' : unitAt(save, p)?.kind === 'garden' ? 'bigger bins and faster growth' : 'more room'}.</small>`
    }</div>`;
  };
  const serveNote = (p: PlaceId) =>
    (serving() === p ? ' · <b class="stall-serving">Serving: 2x customers</b>' : '') +
    (save.staff.includes(p) ? ` · <b class="stall-serving">${ROLES[roleAt(save, p)!].name} at work</b>` : '');

  function stallView(now: number) {
    const L = stallLevel(save.stall.level);
    const cost = upgradeCost(save);
    return `<p class="stall-status">Level ${L.level} stall · ${L.slots} kinds of goods, ${L.capacity} of each${serveNote('stall')}</p>
      ${shelvesView('stall', now)}
      ${carHere('stall')}
      <div class="stall-actions">
        <button type="button" class="shop-take" data-to-market>Market hall</button>
        ${cost !== null ? `<button type="button" class="chip-link" data-upgrade ${save.dorras >= cost ? '' : 'disabled'}>Upgrade · ${fmt.format(cost)}</button>` : '<span class="stall-max">Top level stall</span>'}
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
      body = `<p class="stall-empty">Lot ${LETTER[i]}, a big lot east of Makers' Row.</p>
        <div class="stall-actions"><button type="button" class="shop-take" data-buy-lot="${i}" ${price !== null && save.dorras >= price ? '' : 'disabled'}>Buy lot ${LETTER[i]} · ${fmt.format(price ?? 0)}</button></div>`;
    } else if (!l.kind) body = `<p class="stall-empty">Pick what to build.</p>${lotOptions(i)}`;
    else if (l.kind === 'superstore')
      body = `<p class="stall-status">Superstore · ${SUPERSTORE.slots} kinds of goods, ${Math.round(SUPERSTORE.capacity * capacityMul(save, p))} of each${levelNote(p)}${serveNote(p)}</p>
        ${shelvesView(p, now)}${carHere(p)}
        <div class="stall-actions"><button type="button" class="shop-take" data-to-market data-at="${p}">Market hall</button></div>`;
    else if (l.kind === 'factory') body = lineView(p);
    else if (l.kind === 'depot')
      body = `<p class="stall-status">Depot · ${total(l.stock)} / ${capOf(save, p)} · half-price couriers${levelNote(p)}</p>
        <i class="stall-bar" style="--v:${total(l.stock) / capOf(save, p)}"></i>
        ${stockList(l.stock, 'Empty. Fill it from the market hall.')}${carHere(p)}`;
    else body = `<p class="stall-status">Offices · your HQ${levelNote(p)}</p><p class="stall-empty">Your shops sell ${Math.round((HQ_BOOST - 1) * 100)}% faster.</p>`;
    const rebuild = l?.kind && total(stockAt(save, p)) === 0 && !l.job ? `<details class="biz-rebuild"><summary>Rebuild lot ${LETTER[i]}</summary>${lotOptions(i)}</details>` : '';
    return `${body}${l?.kind ? upgradeRow(p) : ''}${rebuild}`;
  }

  /** A corner shop's view (on the Units tab, after the big lots) */
  function cornerView(i: number, now: number) {
    const p = CORNER_IDS[i];
    if (!save.corners[i]) {
      const price = cornerPrice(save);
      const lv = level(save);
      return `<p class="stall-empty">${esc(cornerName(i))}, a corner shop in The Trenches. ${CORNER.slots} shelves, ${LV(CORNER_LEVEL)}.</p>
        <div class="stall-actions"><button type="button" class="shop-take" data-buy-corner="${i}" ${price !== null && save.dorras >= price && lv >= CORNER_LEVEL ? '' : 'disabled'}>Buy · ${fmt.format(price ?? 0)}</button>${lv < CORNER_LEVEL ? `<small class="biz-level-note">Needs level ${CORNER_LEVEL} (you're ${lv})</small>` : ''}</div>`;
    }
    return `<p class="stall-status">Corner shop · ${CORNER.slots} kinds of goods, ${Math.round(CORNER.capacity * capacityMul(save, p))} of each${levelNote(p)}${serveNote(p)}</p>
      ${shelvesView(p, now)}${carHere(p)}
      <div class="stall-actions"><button type="button" class="shop-take" data-to-market data-at="${p}">Market hall</button></div>
      ${upgradeRow(p)}`;
  }

  function unitView(now: number) {
    const chips = ROW_IDS.map((p, i) => {
      const k = kindAt(save, p);
      const owned = i < 4 ? save.units[i] : save.lots[i - 4];
      const name = k ? (i < 4 ? UNIT_KINDS[k as UnitKind].name : LOT_KINDS[k as LotKind].name) : owned ? 'Empty' : i < 4 ? 'To let' : 'For sale';
      return `<button type="button" data-unit="${i}" aria-pressed="${i === state.unitSel}">${i < 4 ? i + 1 : LETTER[i - 4]}<small>${name}</small></button>`;
    }).join('');
    const corners = CORNER_IDS.map((p, i) => {
      const k = ROW_IDS.length + i;
      return `<button type="button" data-unit="${k}" aria-pressed="${k === state.unitSel}">${esc(cornerName(i).split(' ')[0])}<small>${save.corners[i] ? 'Yours' : 'For sale'}</small></button>`;
    }).join('');
    const tabs = `<p class="biz-label">Makers' Row · big lots</p><div class="seg biz-units" role="group" aria-label="Your units and lots">${chips}</div>
      <p class="biz-label">The Trenches · corner shops</p><div class="seg biz-units" role="group" aria-label="The Trenches' corner shops">${corners}</div>`;
    if (state.unitSel >= ROW_IDS.length) return tabs + cornerView(state.unitSel - ROW_IDS.length, now);
    if (state.unitSel >= 4) return tabs + lotView(state.unitSel - 4, now);
    const i = state.unitSel;
    const p = UNIT_IDS[i];
    const u = save.units[i];
    let body = '';
    if (!u) {
      const price = unitPrice(save);
      body = `<p class="stall-empty">Unit ${i + 1} on Makers' Row, north of the market square.</p>
        <div class="stall-actions"><button type="button" class="shop-take" data-buy-unit="${i}" ${price !== null && save.dorras >= price ? '' : 'disabled'}>Buy unit ${i + 1} · ${fmt.format(price ?? 0)}</button></div>`;
    } else if (!u.kind) {
      body = `<p class="stall-empty">Pick what to build.</p>${buildOptions(i)}`;
    } else if (u.kind === 'garden') {
      const have = u.stock[u.crop] ?? 0;
      const crops = RAW_IDS.map((c) => `<button type="button" data-crop="${c}" aria-pressed="${u.crop === c}" ${have > 0 && u.crop !== c ? 'disabled' : ''}>${esc(good(c).name)}</button>`).join('');
      const cap = capOf(save, p);
      body = `<p class="stall-status">Garden · ${perMin(CROPS[u.crop] * [1, 1.3, 1.6][placeLevel(save, p) - 1])} ${esc(good(u.crop).name.toLowerCase())} a minute${levelNote(p)}${serveNote(p)}</p>
        <div class="seg stall-seg" role="group" aria-label="Crop">${crops}</div>
        <div class="stall-slot"><div class="stall-slot-top">${dot(u.crop)}<b>${esc(good(u.crop).name)} in the bins</b><span class="stall-qty">${have} / ${cap}</span></div><i class="stall-bar" style="--v:${have / cap}"></i>
        <small class="stall-pace">${have >= cap ? 'Full. Load or sell it to keep growing' : have > 0 ? 'Load it for the Workshop, or sell it' : 'Growing'}</small></div>
        ${carHere(p)}`;
    } else if (u.kind === 'shop') {
      body = `<p class="stall-status">Shop · ${SHOP.slots} kinds of goods, ${Math.round(SHOP.capacity * capacityMul(save, p))} of each${levelNote(p)}${serveNote(p)}</p>
        ${shelvesView(p, now)}${carHere(p)}
        <div class="stall-actions"><button type="button" class="shop-take" data-to-market data-at="${p}">Market hall</button></div>`;
    } else {
      const cap = capOf(save, p);
      body = `<p class="stall-status">Warehouse · ${total(u.stock)} / ${cap}${levelNote(p)}</p>
        <i class="stall-bar" style="--v:${total(u.stock) / cap}"></i>
        ${stockList(u.stock, 'Empty. Fill it from the market hall.')}${carHere(p)}`;
    }
    // Rebuilding: only once it's empty of goods
    const rebuild = u?.kind && total(stockAt(save, p)) === 0 ? `<details class="biz-rebuild"><summary>Rebuild unit ${i + 1}</summary>${buildOptions(i)}</details>` : '';
    return `${tabs}${body}${u?.kind ? upgradeRow(p) : ''}${rebuild}`;
  }

  const workshopView = () => lineView('workshop');
  /** A production line: the Workshop or a factory (its bay, its job, what it can make) */
  function lineView(p: PlaceId) {
    const ln = line(save, p)!;
    const j = ln.job;
    const each = (id: ProductId) => RECIPES[id]!.minutes / ln.speed;
    const bay = total(ln.stock);
    const cap = capOf(save, p);
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
    return `<p class="stall-status">${p === 'workshop' ? "The Workshop's bay" : 'Factory bay'} · ${bay} / ${cap}${levelNote(p)}${serveNote(p)}</p>
      ${stockList(ln.stock, 'Empty. Bring or buy raw goods.')}
      ${job}
      <ul class="market-list">${recipes}</ul>
      ${carHere(p)}
      ${upgradeRow(p)}
      <p class="city-panel-fine">Jobs keep going while you're away.</p>`;
  }

  function carView(now: number) {
    const c = h.car();
    const at = carAt();
    if (!c) return `<p class="stall-empty">Your car is at the garage on the south bank.</p>${stockList(save.cargo, '')}${contractsDue(now)}`;
    const cap = cargoCap(c.model, save);
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
    const loadNote = !at ? '' : inn ? '' : loadsFrom(save, at) ? '<p class="stall-empty">Nothing here to load.</p>' : '<p class="stall-empty">Goods on sale can\'t be loaded.</p>';
    return `<p class="stall-status">${esc(c.name)} · ${used} / ${cap} in the car${at ? ` · parked at ${esc(placeName(at))}` : ''}</p>
      <i class="stall-bar" style="--v:${used / cap}"></i>
      ${at ? '' : `${stockList(save.cargo, 'Empty.')}<p class="stall-empty">Park by one of your places to load.</p>`}
      ${out ? `<p class="biz-label">Unload here</p><ul class="market-list">${out}</ul>` : ''}
      ${inn ? `<p class="biz-label">Load from ${esc(placeName(at!))}</p><ul class="market-list">${inn}</ul>` : loadNote}
      ${contractsDue(now)}
      <p class="city-panel-fine">Delivering to your shelves pays a ${Math.round(DELIVERY_BONUS * 100)}% bonus.</p>`;
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
      down.d < -0.02 ? `${good(down.id).name}: prices falling.` : '',
      `${DESTS[offers[0].to]} is after ${good(offers[0].good).name.toLowerCase()}.`,
    ].filter(Boolean);
    const taken = (id: number) => save.taken.includes(id);
    const full = save.contracts.length >= CONTRACTS_MAX;
    const offerRows = offers
      .map(
        (k) => `<li class="market-row"><div class="market-top">${dot(k.good)}<b>${k.qty} ${esc(good(k.good).name)} → ${esc(DESTS[k.to])}</b><span class="market-price">${D(k.reward)}</span></div>
        <div class="market-acts"><small>Worth about ${fmt.format(k.qty * marketPrice(k.good, now))} · 30 min to deliver</small>
        <span class="market-btns"><button type="button" data-take="${k.id}" ${taken(k.id) || full ? 'disabled' : ''}>${taken(k.id) ? 'Taken' : 'Take it'}</button></span></div></li>`
      )
      .join('');
    const mine = save.contracts
      .map(
        (k) => `<li class="market-row"><div class="market-top">${dot(k.good)}<b>${k.qty} ${esc(good(k.good).name)} → ${esc(DESTS[k.to])}</b><span class="market-price">${D(k.reward)}</span></div>
        <div class="market-acts"><small>${Math.min(save.cargo[k.good] ?? 0, k.qty)} / ${k.qty} in your car · ${clock(k.expires - now)} left</small>
        ${askDrop === k.id ? confirmHtml('Give up?', 'Yes', 'Keep it', `data-drop="${k.id}"`, 'data-drop-keep') : `<span class="market-btns"><button type="button" data-drop-ask="${k.id}">Give up</button></span>`}</div></li>`
      )
      .join('');
    return `<ul class="biz-news">${news.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      ${mine ? `<p class="biz-label">Your contracts · ${save.contracts.length} / ${CONTRACTS_MAX}</p><ul class="market-list">${mine}</ul>` : ''}
      <p class="biz-label">On the board · new in ${clock(boardEnds(now) - now)}</p>
      <ul class="market-list">${offerRows}</ul>
      <p class="city-panel-fine">Load the goods, then park by the drop-off.</p>`;
  }

  /* ---------- The Post office: couriers ---------- */
  function couriersView(now: number) {
    const sources = PLACE_LIST.filter((p) => loadsFrom(save, p) && total(stockAt(save, p)) > 0);
    if (!sources.includes(sendFrom!)) sendFrom = sources[0] ?? null;
    const dests = PLACE_LIST.filter((p) => p !== sendFrom && (p === 'stall' || p === 'workshop' || ['shop', 'warehouse', 'superstore', 'depot', 'factory', 'corner'].includes(kindAt(save, p) ?? '')));
    if (!dests.includes(sendTo!)) sendTo = dests[0] ?? null;
    const transit = save.shipments
      .map(
        (sh) => `<li class="market-row"><div class="market-top">${dot(sh.good)}<b>${sh.qty} ${esc(good(sh.good).name)}</b><span class="stall-qty">${sh.arrives > now ? `${clock(sh.arrives - now)}` : 'waiting for room'}</span></div>
        <div class="market-acts"><small>${esc(shortName(sh.from))} → ${esc(shortName(sh.to))}</small></div></li>`
      )
      .join('');
    const busy = save.shipments.length >= SHIP_MAX;
    let form = '';
    if (!sendFrom) form = '<p class="stall-empty">Nothing to send yet.</p>';
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
      <p class="city-panel-fine">Up to ${SHIP_QTY} a trip, ${SHIP_MAX} out at once. No delivery bonus.</p>`;
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
      <p class="city-panel-fine">Staff keep ${Math.round(STAFF_CUT * 100)}% of what they handle. Unpaid staff leave.</p>`;
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
          <small class="stall-pace">${Math.round(LOAN_SHARE * 100)}% of takings pay it off</small>
          <span class="market-btns"><button type="button" data-repay="${Math.min(save.loan.owed, 1000)}" ${save.dorras >= 1 ? '' : 'disabled'}>Pay ${fmt.format(Math.min(save.loan.owed, 1000))}</button><button type="button" data-repay="${save.loan.owed}" ${save.dorras >= save.loan.owed ? '' : 'disabled'}>Pay it all</button></span></div>`
      : `<p class="stall-empty">Flat ${Math.round(LOAN_FEE * 100)}% fee, ${Math.round(LOAN_SHARE * 100)}% of takings repay it. Up to ${fmt.format(limit)}.</p>
        <span class="market-btns biz-loans">${amounts.map((n) => `<button type="button" data-borrow="${n}">Borrow ${fmt.format(n)}</button>`).join('')}</span>`;
    return `<ul class="biz-worth">
        <li><span>Balance</span><b>${D(save.dorras)}</b></li>
        <li><span>In the till</span><b>${D(save.till)}</b></li>
        <li><span>Goods</span><b>${D(goods)}</b></li>
        <li><span>Property</span><b>${D(prop)}</b></li>
        <li><span>Gear</span><b>${D(gearValue(save))}</b></li>
        ${save.loan ? `<li><span>Owed</span><b>-${fmt.format(save.loan.owed)}</b></li>` : ''}
        <li class="is-total"><span>You're worth</span><b>${D(worth(save, now))}</b></li>
      </ul>
      <p class="biz-label">Estate agent · corner shops</p>${cornersView()}
      <p class="biz-label">Loans</p>${loan}
      <div class="biz-ledger"><div><p class="biz-label">In, all time</p><ul>${rows(true)}</ul></div><div><p class="biz-label">Out, all time</p><ul>${rows(false)}</ul></div></div>
      ${recent ? `<p class="biz-label">Latest</p><ul class="biz-recent">${recent}</ul>` : ''}
      <p class="biz-label">Your save</p>${backupView(now)}`;
  }

  /* ---------- Your save (in the Vault): a backup file to download, and one to load ---------- */
  const day = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  function ago(t: number, now: number) {
    const d = Math.floor((now - t) / 86400e3);
    return d < 1 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
  }
  function backupView(now: number) {
    const ask = restoreAsk
      ? `<div class="stall-slot backup-ask"><p class="biz-ask">Load this backup? Level ${restoreAsk.level}, ${fmt.format(restoreAsk.dorras)} Dorras${restoreAsk.at ? `, saved ${day(restoreAsk.at)}` : ''}. It replaces this browser's save.</p>
          <span class="market-btns"><button type="button" data-restore-yes>Load it</button><button type="button" data-restore-no>Cancel</button></span></div>`
      : '';
    return `<p class="stall-empty">Saved in this browser only. Last backup: <b>${save.backup ? ago(save.backup, now) : 'never'}</b></p>
      ${ask}
      <span class="market-btns backup-btns"><button type="button" data-backup-save>Download backup</button><label class="backup-load"><input type="file" accept=".json,application/json" data-backup-file /><span>Load a backup</span></label></span>`;
  }
  function downloadBackup(now: number) {
    // The file carries the time it was made, and the guide's last step already done (so loading it doesn't pay that step again)
    save.backup = now;
    changed();
    const ls = (k: string) => {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    };
    const b = packBackup((k) => (k === KEY ? JSON.stringify(save) : ls(k)), now);
    const url = URL.createObjectURL(new Blob([JSON.stringify(b)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = backupName(now);
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    return backupName(now);
  }
  async function readFile(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const r = readBackup(await file.text(), Date.now());
    restoreAsk = r.ok ? r : null;
    state.note = r.ok
      ? ''
      : r.why === 'newer'
        ? 'That backup is newer. Reload and try again.'
        : r.why === 'size'
          ? 'That file is too big.'
          : "That file isn't a Sector 7 backup.";
    if (!r.ok) h.sfx('denied');
    paintPanel();
  }
  /** Put a backup back: every city save replaced, then the city starts again on it */
  function restore() {
    const r = restoreAsk;
    restoreAsk = null;
    if (!r) return;
    core.freeze(true);
    try {
      const keep = new Set(r.writes.map(([k]) => k));
      for (const k of BACKUP_KEYS) if (!keep.has(k)) localStorage.removeItem(k);
      for (const [k, v] of r.writes) localStorage.setItem(k, v);
    } catch {
      core.freeze(false);
      changed();
      state.note = "Can't load: this browser won't keep saves.";
      h.sfx('denied');
      return;
    }
    location.reload();
  }

  /** The corner shops at the estate agent: buy one, or go to yours */
  function cornersView() {
    const lv = level(save);
    const price = cornerPrice(save);
    const rows = CORNER_SHOPS.map((c, i) => {
      const mine = !!save.corners[i];
      const acts = mine
        ? `<span class="market-btns"><button type="button" data-open-corner="${i}">Run it</button></span>`
        : `<span class="market-btns"><button type="button" data-buy-corner="${i}" ${price !== null && lv >= CORNER_LEVEL && save.dorras >= price ? '' : 'disabled'}>Buy</button></span>`;
      return `<li class="market-row"><div class="market-top"><b>${esc(cornerName(i))}</b><span class="market-price">${mine ? '<span class="tag tag-mine">Yours</span>' : D(price ?? 0)}</span></div>
        <div class="market-acts"><small>${mine ? `Corner shop · level ${placeLevel(save, CORNER_IDS[i])}` : lv < CORNER_LEVEL ? `Needs level ${CORNER_LEVEL} (you're ${lv})` : `${CORNER.slots} shelves, busy sidewalks`}</small>${acts}</div></li>`;
    }).join('');
    return `<p class="stall-empty">Each one you own makes the next dearer.</p>
      <ul class="market-list biz-estate">${rows}</ul>`;
  }

  function paintCard() {
    if (!cardOpen()) return;
    const now = Date.now();
    tabsEl.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === state.tab)));
    const view = state.tab === 'stall' ? stallView(now) : state.tab === 'units' ? unitView(now) : state.tab === 'workshop' ? workshopView() : state.tab === 'car' ? carView(now) : bagView();
    repaint(
      cardBody,
      `<div class="stall-till">
        <div><small>Till · stall and shops</small><span class="stall-till-amount">${D(save.till)}</span></div>
        <button type="button" class="shop-take stall-collect" data-collect ${save.till > 0 ? '' : 'disabled'}>Collect</button>
      </div>
      ${view}
      ${state.note ? `<p class="shop-note" role="status">${esc(state.note)}</p>` : ''}`
    );
    card.querySelector<HTMLElement>('[data-biz-balance]')!.innerHTML = D(save.dorras);
  }
  /** The Bag tab: inventory-ui.ts's list, its chunk fetched the first time (walking fetches it too) */
  let inv: typeof import('./inventory-ui') | null = null;
  function bagView() {
    if (inv) return inv.bagHtml(save, { may: h.mayCarry, ways: !h.walker() });
    void import('./inventory-ui').then((m) => {
      inv = m;
      paintCard();
    });
    return '<p class="stall-empty">Opening your bag…</p>';
  }

  /** Every button on the card, the market hall and the Workshop's state.panel */
  function act(btn: HTMLButtonElement, now: number) {
    const ds = btn.dataset;
    const at = (ds.at as PlaceId | undefined) ?? 'stall';
    state.note = '';
    if ('bizClose' in ds) return void closeCard();
    if (ds.tab) return void openCard(ds.tab as Tab);
    if (ds.bagGo) {
      closeCard();
      h.openSpot(ds.bagGo as SpotId);
      return;
    }
    if ('openStall' in ds) return void openCard(marketAt === 'car' ? 'car' : marketAt);
    if ('toMarket' in ds) {
      marketAt = at;
      closeCard();
      h.openMarket();
      return;
    }
    if ('backupSave' in ds) {
      const name = downloadBackup(now);
      state.note = `Backup downloaded: ${name}`;
      h.sfx('buy', 0.6);
    } else if ('restoreNo' in ds) restoreAsk = null;
    else if ('restoreYes' in ds) return void restore();
    else if (ds.upgradePlace) {
      const p = ds.upgradePlace as PlaceId;
      const r = upgradePlace(save, p);
      state.note = r.ok ? `${placeName(p)} is now level ${placeLevel(save, p)}.` : whyNot(r.why);
      h.sfx(r.ok ? 'upgrade' : 'denied');
    } else if (ds.unit) state.unitSel = Number(ds.unit);
    else if (ds.openCorner) {
      openCard(CORNER_IDS[Number(ds.openCorner)]);
      return;
    }
    else if ('collect' in ds) {
      const n = collect(save);
      if (n) state.note = `Collected ${fmt.format(n)} Dorras.`;
    } else if (ds.price && ds.good) setPrice(save, ds.good as GoodId, ds.price as PriceLevel, at);
    else if (ds.clear) clearSlot(save, ds.clear as GoodId, at);
    else if ('upgrade' in ds) {
      const r = upgrade(save);
      state.note = r.ok ? `Your stall is now level ${save.stall.level}.` : why(r);
    } else if (ds.buyLot) {
      const i = Number(ds.buyLot);
      const r = buyLot(save, i);
      state.note = r.ok ? `Lot ${LETTER[i]} is yours. Build something big on it.` : why(r);
    } else if (ds.buildLot) {
      const i = Number(ds.lotI);
      const r = buildLot(save, i, ds.buildLot as LotKind);
      state.note = r.ok ? `Lot ${LETTER[i]} is now your ${LOT_KINDS[ds.buildLot as LotKind].name.toLowerCase()}.` : r.why === 'stock' ? 'Empty it and stop its job first.' : why(r);
    } else if (ds.borrow) {
      const r = borrow(save, Number(ds.borrow));
      state.note = r.ok ? `Borrowed ${fmt.format(r.dorras)} Dorras.` : r.why === 'busy' ? 'Pay off your loan first.' : 'More than the Vault will lend you.';
    } else if (ds.repay) {
      const r = repay(save, Number(ds.repay));
      state.note = r.ok ? (save.loan ? `Paid ${fmt.format(r.dorras)} Dorras off your loan.` : 'Your loan is paid off.') : why(r);
    } else if (ds.buyCorner) {
      const i = Number(ds.buyCorner);
      const r = buyCorner(save, i);
      state.note = r.ok ? `${cornerName(i)} is yours.` : whyNot(r.why, CORNER_LEVEL);
      h.sfx(r.ok ? 'buy' : 'denied');
    } else if (ds.buyUnit) {
      const r = buyUnit(save, Number(ds.buyUnit));
      state.note = r.ok ? `Unit ${Number(ds.buyUnit) + 1} is yours. Build something on it.` : why(r);
    } else if (ds.build) {
      const i = Number(ds.unitI);
      const r = buildUnit(save, i, ds.build as UnitKind);
      state.note = r.ok ? `Unit ${i + 1} is now a ${UNIT_KINDS[ds.build as UnitKind].name.toLowerCase()}.` : r.why === 'stock' ? 'Empty it of goods first.' : why(r);
    } else if (ds.crop) {
      const r = setCrop(save, state.unitSel, ds.crop as RawId);
      if (!r.ok) state.note = 'Empty the bins first.';
    } else if (ds.make) {
      const r = startJob(save, ds.make as ProductId, Number(ds.n), (ds.at as PlaceId) ?? 'workshop');
      state.note = r.ok ? `Making ${r.qty} ${good(ds.make as GoodId).name}.` : why(r, undefined, (ds.at as PlaceId) ?? 'workshop');
    } else if ('stop' in ds) {
      cancelJob(save, (ds.at as PlaceId) ?? 'workshop');
      state.note = 'Job stopped. Raw goods returned.';
    } else if (ds.load) {
      const c = h.car();
      const p = carAt();
      if (!c || !p) state.note = 'Park your car here first.';
      else {
        const run = () => {
          const r = load(save, p, ds.load as GoodId, Number(ds.n), cargoCap(c.model));
          return r.ok ? `Loaded ${r.qty} ${good(ds.load as GoodId).name}.` : r.why === 'room' ? 'Your car is full.' : why(r, ds.load as GoodId, p);
        };
        // (on foot, the crate is carried to the car first: moments.ts)
        if (carried('load', p, run)) return;
        state.note = run();
      }
    } else if (ds.unload) {
      const p = carAt();
      if (!p) state.note = 'Park your car at one of your places first.';
      else {
        const run = () => {
          const r = unload(save, p, ds.unload as GoodId, Number(ds.n), now);
          return r.ok ? `Unloaded ${r.qty} ${good(ds.unload as GoodId).name}${r.dorras ? `: ${fmt.format(r.dorras)} Dorras delivery bonus` : ''}.` : why(r, ds.unload as GoodId, p);
        };
        if (carried('unload', p, run)) return;
        state.note = run();
      }
    } else if (ds.buy) {
      const c = h.car();
      const r = marketAt === 'car' ? (c ? buyToCar(save, ds.buy as GoodId, Number(ds.n), now, cargoCap(c.model)) : ({ ok: false, why: 'place' } as Result)) : buy(save, ds.buy as GoodId, Number(ds.n), now, marketAt);
      const to = marketAt === 'car' ? 'your car' : placeName(marketAt);
      state.note = r.ok ? `Bought ${r.qty} ${good(ds.buy as GoodId).name} for ${fmt.format(r.dorras)} Dorras, delivered to ${to}.` : r.why === 'room' && marketAt === 'car' ? 'Your car is full.' : why(r, ds.buy as GoodId, marketAt === 'car' ? 'stall' : marketAt);
    } else if (ds.sell) {
      const r = marketAt === 'car' ? sellFromCar(save, ds.sell as GoodId, Number(ds.n), now) : sellBack(save, ds.sell as GoodId, Number(ds.n), now, marketAt);
      state.note = r.ok ? `Sold ${r.qty} ${good(ds.sell as GoodId).name} for ${fmt.format(r.dorras)} Dorras.` : why(r);
    } else if (ds.marketAt) marketAt = ds.marketAt as PlaceId | 'car';
    else if (ds.take) {
      const r = accept(save, Number(ds.take), now);
      state.note = r.ok ? 'Contract taken. Follow the beam.' : r.why === 'max' ? `You have ${CONTRACTS_MAX} contracts on the go already.` : why(r);
    } else if (ds.dropAsk) {
      // Give up asks once (docs/polish-plan.md Phase 3): the row shows the confirm, the keyboard on its Yes
      askDrop = Number(ds.dropAsk);
      queueMicrotask(() => state.panel && focusConfirm(state.panel.el));
    } else if ('dropKeep' in ds) {
      const was = askDrop;
      askDrop = null;
      queueMicrotask(() => state.panel?.el.querySelector<HTMLElement>(`[data-drop-ask="${was}"]`)?.focus({ preventScroll: true }));
    } else if (ds.drop) {
      askDrop = null;
      dropContract(save, Number(ds.drop));
      state.note = 'Contract given up';
    } else if (ds.deliver) {
      const d = carAtDest();
      const r = d ? deliver(save, Number(ds.deliver), d, now) : ({ ok: false, why: 'place' } as Result);
      state.note = r.ok ? `Delivered. ${fmt.format(r.dorras)} Dorras paid.` : r.why === 'stock' ? "The goods aren't all in your car." : r.why === 'place' ? 'Park by the drop-off first.' : why(r);
    } else if (ds.sendFrom) sendFrom = ds.sendFrom as PlaceId;
    else if (ds.sendTo) sendTo = ds.sendTo as PlaceId;
    else if (ds.send && sendFrom && sendTo) {
      const r = ship(save, sendFrom, sendTo, ds.send as GoodId, Number(ds.n), now);
      state.note = r.ok ? `Courier sent: ${r.qty} ${good(ds.send as GoodId).name}, ${fmt.format(r.dorras)} Dorras.` : r.why === 'busy' ? `All ${SHIP_MAX} couriers are out.` : why(r, ds.send as GoodId, sendTo);
    } else if (ds.hire) {
      const r = hire(save, ds.hire as PlaceId);
      state.note = r.ok ? `Hired a ${ROLES[roleAt(save, ds.hire as PlaceId)!].name.toLowerCase()} for ${placeName(ds.hire as PlaceId).replace('Your', 'your').replace('The', 'the')}.` : why(r);
    } else if (ds.letGo) {
      letGo(save, ds.letGo as PlaceId);
      state.note = 'Let go.';
    } else return;
    changed();
  }
  /** Walking at the place with the car parked by it: the goods go by hand (the card closes for the carry; `run` is the move, its note shown after) */
  function carried(dir: 'load' | 'unload', p: PlaceId, run: () => string) {
    const at = STAND[p];
    if (!at || !h.walker() || !h.carry?.(dir, at, () => {
      state.note = run();
      changed();
    }))
      return false;
    closeCard();
    return true;
  }
  const onClick = (e: Event) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    // The mission board's buttons first (on the Signal tower's state.panel), then the economy's
    if (btn && !btn.disabled && !missions.act(btn)) act(btn, Date.now());
  };
  card.addEventListener('click', onClick);
  // The Vault's Load a backup: a file picked
  const onChange = (e: Event) => {
    const input = (e.target as HTMLElement).closest<HTMLInputElement>('input[data-backup-file]');
    if (input) void readFile(input);
  };
  // Q / E step the card's tabs while the keyboard is in the card (the kit's way, docs/polish-plan.md Phase 3); the hub's
  // own strip keeps its Q / E for its tabs
  card.addEventListener('keydown', (e) => {
    const back = e.key === 'q' || e.key === 'Q';
    if (!(back || e.key === 'e' || e.key === 'E') || e.target instanceof HTMLInputElement) return;
    const i = TABS.findIndex((t) => t.id === state.tab);
    openCard(TABS[(i + (back ? -1 : 1) + TABS.length) % TABS.length].id);
    tabsEl.querySelector<HTMLButtonElement>(`[data-tab="${state.tab}"]`)?.focus({ preventScroll: true });
    e.preventDefault();
    e.stopPropagation();
  });

  /* ---------- The market hall ---------- */
  function marketView(now: number) {
    // Where Buy can deliver to and Sell can take from
    const car = h.car();
    const at: (PlaceId | 'car')[] = ['stall', ...ROW_IDS.filter((p) => kindAt(save, p) && kindAt(save, p) !== 'offices'), ...CORNER_IDS.filter((p) => cornerAt(save, p)), 'workshop', ...(car && carAtEmporium() ? (['car'] as const) : [])];
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
      ${state.note ? `<p class="shop-note" role="status">${esc(state.note)}</p>` : ''}
      <div class="city-panel-actions"><button type="button" class="chip-link" data-open-stall>Your business</button></div>
      <p class="city-panel-fine">Park your car outside to buy into it.</p>`;
  }
  /** Fill the building state.panel that's open */
  function paintPanel() {
    if (!state.panel) return;
    const now = Date.now();
    const noteHtml = state.note ? `<p class="shop-note" role="status">${esc(state.note)}</p>` : '';
    const toCard = (tabId: Tab) => `<div class="city-panel-actions"><button type="button" class="chip-link" data-tab="${tabId}">Your business</button></div>`;
    const html =
      state.panel.id === 'emporium'
        ? marketView(now)
        : state.panel.id === 'workshop'
          ? `${workshopView()}${noteHtml}${toCard('workshop')}`
          : state.panel.id === 'signal'
            ? `${contractsView(now)}${noteHtml}${missions.boardHtml(now)}${toCard('car')}`
            : state.panel.id === 'telegram'
              ? `${couriersView(now)}${noteHtml}${toCard('units')}`
              : state.panel.id === 'vault'
                ? `${bankView(now)}${noteHtml}${toCard('units')}`
                : `${staffView()}${noteHtml}${toCard('units')}`;
    repaint(state.panel.el, html);
  }


  return {
    paintCard,
    paintPanel,
    mounted(el) {
      el.addEventListener('click', onClick);
      el.addEventListener('change', onChange);
      restoreAsk = null;
      paintPanel();
    },
    unmounted(el) {
      el.removeEventListener('click', onClick);
      el.removeEventListener('change', onChange);
    },
  };
}
