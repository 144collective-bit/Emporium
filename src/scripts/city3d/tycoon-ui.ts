/*
 * The economy on screen (tycoon.ts holds the rules):
 *
 * - The Dorras readout in the mode header (`[data-dorras]`): your balance,
 *   with a dot when your stall's till has takings to collect. It opens
 *   your stall's card.
 * - Your stall's card (`[data-stall]`, on the gun store's `.shop` panel):
 *   the till and Collect, each kind of stock with its price (Low / Fair /
 *   High) and how fast it's selling, the upgrade, and a way to the market
 *   hall. Opens from the readout anywhere, and at the stall in walk mode.
 * - The market hall, inside the Emporium's panel (`[data-market]`): every
 *   good's price and trend, what your stall holds, Buy and Sell.
 *
 * The save lives in the browser (`degen-city-tycoon-v1`) and is brought up to
 * date every second (and on return, counting the time away).
 */
import {
  GOODS,
  PRICE_LEVELS,
  PRICE_LEVEL_IDS,
  START_DORRAS,
  advance,
  askPrice,
  bidPrice,
  buy,
  cleanSave,
  clearSlot,
  collect,
  good,
  marketPrice,
  pace,
  retailPrice,
  sellBack,
  setPrice,
  slotOf,
  stallLevel,
  trend,
  upgrade,
  upgradeCost,
  type GoodId,
  type PriceLevel,
  type Result,
  type Slot,
  type TycoonSave,
} from './tycoon';

const KEY = 'degen-city-tycoon-v1';
const fmt = new Intl.NumberFormat('en-US');
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
/** The Dorras mark: a little coin */
const COIN = '<svg class="dorra" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor" opacity=".18"/><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 7h3.5a5 5 0 0 1 0 10H9zM7 12h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const D = (n: number) => `${COIN}<b>${fmt.format(Math.floor(n))}</b>`;

export interface TycoonHooks {
  /** Standing at your stall in walk mode (customers come faster) */
  serving(): boolean;
  /** Open the Emporium's market hall */
  openMarket(): void;
  /** The stall's stock changed (the market square shows it) */
  stock(slots: Slot[], level: number): void;
  /** The card opened (walk mode frees the mouse) */
  opened(): void;
}

/**
 * Put new markup in only when it changed (the panels tick every second, and a
 * rebuilt button under a finger or the keyboard's focus would be lost); the
 * focused button gets its focus back.
 */
function repaint(el: HTMLElement, html: string) {
  if (el.dataset.html === html) return;
  el.dataset.html = html;
  const f = document.activeElement as HTMLElement | null;
  const key = f && el.contains(f) ? [...Object.entries(f.dataset)].map(([k, v]) => `[data-${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}="${v}"]`).join('') : '';
  el.innerHTML = html;
  if (key) el.querySelector<HTMLElement>(key)?.focus({ preventScroll: true });
}

function load(now: number): { save: TycoonSave; fresh: boolean } {
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
  const card = root.querySelector<HTMLElement>('[data-stall]')!;
  const cardBody = card.querySelector<HTMLElement>('[data-stall-body]')!;
  const toastEl = root.querySelector<HTMLElement>('[data-econ-toast]')!;
  let { save, fresh } = load(Date.now());
  let market: HTMLElement | null = null;
  let note = '';
  let toastTimer = 0;

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
  const why = (r: Result, id?: GoodId) => {
    if (r.ok) return '';
    if (r.why === 'money') return 'Not enough Dorras.';
    if (r.why === 'room') return slotOf(save, id!) ? 'That shelf is full.' : `Your stall holds ${stallLevel(save.stall.level).slots} kinds of goods. Sell one out or upgrade the stall.`;
    if (r.why === 'stock') return 'None in your stall to sell.';
    return 'Your stall is as big as it gets.';
  };

  /* ---------- The readout ---------- */
  function paintPill() {
    const v = fmt.format(save.dorras);
    // Short in the header (12.5K), in full on the card and to screen readers
    const short = save.dorras < 10000 ? v : compact.format(save.dorras);
    if (pillAmount.textContent !== short) pillAmount.textContent = short;
    pill.classList.toggle('has-till', save.till > 0);
    pill.setAttribute('aria-label', `${v} Dorras${save.till > 0 ? `, ${fmt.format(save.till)} in your stall's till` : ''}. Open your stall`);
  }

  /* ---------- Your stall ---------- */
  function slotRow(s: Slot, now: number) {
    const g = good(s.good);
    const L = stallLevel(save.stall.level);
    const per = pace(save, s) * (h.serving() ? 2 : 1);
    const levels = PRICE_LEVEL_IDS.map(
      (p) => `<button type="button" data-price="${p}" data-good="${s.good}" aria-pressed="${s.price === p}">${PRICE_LEVELS[p].label}</button>`
    ).join('');
    return `<li class="stall-slot">
      <div class="stall-slot-top"><span class="good-dot" style="--c:${g.color}"></span><b>${esc(g.name)}</b><span class="stall-qty">${s.qty} / ${L.capacity}</span></div>
      <i class="stall-bar" style="--v:${s.qty / L.capacity}"></i>
      <div class="stall-slot-row">
        <div class="seg stall-seg" role="group" aria-label="${esc(g.name)} price">${levels}</div>
        <span class="stall-each">${D(retailPrice(s.good, s.price, now))} each</span>
      </div>
      <small class="stall-pace">${s.qty > 0 ? `About ${per >= 1 ? Math.round(per) : per.toFixed(1)} a minute` : 'Sold out'}${s.qty === 0 ? ` · <button type="button" class="chip-link stall-clear" data-clear="${s.good}">Free the shelf</button>` : ''}</small>
    </li>`;
  }
  function paintCard() {
    if (card.hidden) return;
    const now = Date.now();
    const L = stallLevel(save.stall.level);
    const cost = upgradeCost(save);
    const free = L.slots - save.stall.slots.length;
    const serving = h.serving();
    repaint(
      cardBody,
      `
      <div class="stall-till">
        <div><small>Till</small><span class="stall-till-amount">${D(save.till)}</span></div>
        <button type="button" class="shop-take stall-collect" data-collect ${save.till > 0 ? '' : 'disabled'}>Collect</button>
      </div>
      <p class="stall-status">Level ${L.level} stall · ${L.slots} kinds of goods, ${L.capacity} of each${serving ? ' · <b class="stall-serving">You\'re serving: customers come twice as fast</b>' : ''}</p>
      ${save.stall.slots.length ? `<ul class="stall-slots">${save.stall.slots.map((s) => slotRow(s, now)).join('')}</ul>` : ''}
      ${free > 0 ? `<p class="stall-empty">${free === L.slots ? 'Your stall is empty.' : `${free} empty shelf${free > 1 ? 'ves' : ''}.`} Buy stock at the Emporium's market hall, then set your prices here: Low sells fast, High earns more each.</p>` : ''}
      ${note ? `<p class="shop-note" role="status">${esc(note)}</p>` : ''}
      <div class="stall-actions">
        <button type="button" class="shop-take" data-to-market>Market hall</button>
        ${cost !== null ? `<button type="button" class="chip-link" data-upgrade ${save.dorras >= cost ? '' : 'disabled'}>Upgrade to level ${L.level + 1} · ${fmt.format(cost)} Dorras</button>` : '<span class="stall-max">Top level stall</span>'}
      </div>`
    );
    card.querySelector<HTMLElement>('[data-stall-balance]')!.innerHTML = D(save.dorras);
  }
  function openCard() {
    if (!card.hidden) return;
    note = '';
    card.hidden = false;
    root.classList.add('is-shopping', 'is-stall');
    h.opened();
    paintCard();
    card.querySelector<HTMLButtonElement>('[data-stall-close]')?.focus({ preventScroll: true });
  }
  function closeCard() {
    if (card.hidden) return false;
    card.hidden = true;
    root.classList.remove('is-shopping', 'is-stall');
    return true;
  }
  card.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!btn) return;
    const ds = btn.dataset;
    note = '';
    if ('stallClose' in ds) return void closeCard();
    if ('collect' in ds) {
      const n = collect(save);
      if (n) note = `Collected ${fmt.format(n)} Dorras.`;
    } else if (ds.price && ds.good) setPrice(save, ds.good as GoodId, ds.price as PriceLevel);
    else if (ds.clear) clearSlot(save, ds.clear as GoodId);
    else if ('upgrade' in ds) {
      const r = upgrade(save);
      note = r.ok ? `Your stall is now level ${save.stall.level}.` : why(r);
      if (r.ok) h.stock(save.stall.slots, save.stall.level);
    } else if ('toMarket' in ds) {
      closeCard();
      h.openMarket();
      return;
    }
    changed();
  });
  pill.addEventListener('click', () => (card.hidden ? openCard() : closeCard()));
  // Esc closes the card first (before it can close a panel or leave walk mode)
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && closeCard()) e.stopImmediatePropagation();
    },
    true
  );

  /* ---------- The market hall ---------- */
  function paintMarket() {
    if (!market) return;
    const now = Date.now();
    const L = stallLevel(save.stall.level);
    const rows = GOODS.map((g) => {
      const t = trend(g.id, now);
      const held = slotOf(save, g.id)?.qty ?? 0;
      return `<li class="market-row">
        <div class="market-top">
          <span class="good-dot" style="--c:${g.color}"></span><b>${esc(g.name)}</b>
          <span class="market-price">${D(marketPrice(g.id, now))}<i class="trend" data-t="${t}" aria-label="${t > 0 ? 'rising' : t < 0 ? 'falling' : 'steady'}">${t > 0 ? '▲' : t < 0 ? '▼' : '•'}</i></span>
        </div>
        <div class="market-acts">
          <small>Buy ${fmt.format(askPrice(g.id, now))} · sell ${fmt.format(bidPrice(g.id, now))} · in stall <b>${held}</b></small>
          <span class="market-btns">
            <button type="button" data-buy="${g.id}" data-n="1">Buy 1</button>
            <button type="button" data-buy="${g.id}" data-n="${L.capacity}">Fill</button>
            <button type="button" data-sell="${g.id}" data-n="1" ${held ? '' : 'disabled'}>Sell 1</button>
            <button type="button" data-sell="${g.id}" data-n="${held}" ${held ? '' : 'disabled'}>Sell all</button>
          </span>
        </div>
      </li>`;
    }).join('');
    repaint(
      market,
      `
      <div class="market-head"><span>Your Dorras</span><span class="market-balance">${D(save.dorras)}</span></div>
      <ul class="market-list">${rows}</ul>
      ${note ? `<p class="shop-note" role="status">${esc(note)}</p>` : ''}
      <div class="city-panel-actions"><button type="button" class="chip-link" data-open-stall>Your stall</button></div>
      <p class="city-panel-fine">Prices move through the day, the same for everyone. Buying puts stock straight on your stall; customers buy it from there.</p>`
    );
  }
  function onMarketClick(e: Event) {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!btn) return;
    const ds = btn.dataset;
    const now = Date.now();
    note = '';
    if (ds.buy) {
      const r = buy(save, ds.buy as GoodId, Number(ds.n), now);
      note = r.ok ? `Bought ${r.qty} ${good(ds.buy as GoodId).name} for ${fmt.format(r.dorras)} Dorras.` : why(r, ds.buy as GoodId);
    } else if (ds.sell) {
      const r = sellBack(save, ds.sell as GoodId, Number(ds.n), now);
      note = r.ok ? `Sold ${r.qty} ${good(ds.sell as GoodId).name} for ${fmt.format(r.dorras)} Dorras.` : why(r, ds.sell as GoodId);
    } else if ('openStall' in ds) return void openCard();
    else return;
    changed();
    h.stock(save.stall.slots, save.stall.level);
  }

  /* ---------- Ticking ---------- */
  function changed() {
    store();
    paintPill();
    paintCard();
    paintMarket();
  }
  function tick() {
    const before = save.till;
    const sales = advance(save, Date.now(), h.serving());
    if (sales.earned > 0 || save.till !== before) h.stock(save.stall.slots, save.stall.level);
    // Back after a while: say what sold
    if (sales.away > 0 && sales.earned > 0) {
      const n = Object.values(sales.sold).reduce((a, b) => a + (b ?? 0), 0);
      toast(`While you were away your stall sold ${n} item${n === 1 ? '' : 's'}: ${fmt.format(sales.earned)} Dorras in the till.`);
    }
    changed();
  }
  tick();
  h.stock(save.stall.slots, save.stall.level);
  if (fresh) toast(`You have ${fmt.format(START_DORRAS)} Dorras and a market stall. Stock it at the Emporium's market hall.`, 7000);
  window.setInterval(tick, 1000);
  document.addEventListener('visibilitychange', () => !document.hidden && tick());

  return {
    openCard,
    closeCard,
    get cardOpen() {
      return !card.hidden;
    },
    /** The Emporium's panel opened: fill its market hall */
    mountMarket(panelBody: HTMLElement) {
      market = panelBody.querySelector<HTMLElement>('[data-market]');
      market?.addEventListener('click', onMarketClick);
      note = '';
      paintMarket();
    },
    unmountMarket() {
      market?.removeEventListener('click', onMarketClick);
      market = null;
    },
  };
}

export type TycoonUI = ReturnType<typeof createTycoonUI>;
