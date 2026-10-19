/*
 * Build mode's interface: the wallet chip, the plot panel (buy a large plot,
 * choose a building, customise it with a live preview, edit, demolish), the
 * purchase dialog and toasts. The 3D side lives in plots.ts; ownership in a
 * Store: live (real wallet + game server, land.ts) or the demo (store.ts).
 */
import { BUILDINGS, NEON_COLORS, SIGNS, WALL_COLORS, type BuildingDef } from '../../data/plots';
import { shortAddr } from '../net/land';
import { PLOTS, PLOT_BY_ID, plotById, plotToward, type Design, type Plot, type PlotsApi } from './plots';
import type { BuyStep, Store } from './store';

const fmt = new Intl.NumberFormat('en-US');
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const defOf = (t: Design['type']) => BUILDINGS.find((b) => b.type === t)!;

interface Deps {
  store: Store;
  plots: PlotsApi;
  /** Camera to a plot */
  focus(p: Plot): void;
  /** Camera out to see the districts */
  overview(): void;
  /** Mode changed (index.ts hides pins, swaps click handling) */
  onMode(build: boolean): void;
}

export function createBuilderUI(root: HTMLElement, deps: Deps) {
  const { store, plots } = deps;
  // The Online / Offline switch can change the store from live to the demo and back
  let live = store.mode === 'live';
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const toggle = $<HTMLButtonElement>('[data-build-toggle]');
  const bar = $('[data-builder-bar]');
  const walletEl = $('[data-wallet]');
  const panel = $('[data-plot-panel]');
  const body = $('[data-plot-body]');
  const modal = $('[data-buy-modal]');
  const modalBody = $('[data-buy-body]');
  const modalClose = $('[data-buy-close]');
  const toastEl = $('[data-toast]');
  const panelNote = $('[data-plot-note]');

  let building = false;
  let selected: Plot | null = null;
  /** Unsaved design being previewed on the selected plot */
  let draft: Design | null = null;
  let connecting = false;
  let buying = false;
  let saving = false;
  let toastTimer = 0;

  const symbol = () => store.network?.symbol ?? 'PLS';
  const pls = (n: number) => `${fmt.format(n)} ${symbol()}`;
  // Live on the testnet: test PLS only; the demo: play money; mainnet: real sales
  const tagline = () => (!live ? 'Demo · purchases are simulated · no real PLS' : store.network?.testnet ? `${store.network.name} · test PLS only, no real value` : `${store.network?.name ?? 'PulseChain'} · real PLS`);

  function toast(msg: string) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('is-on'), 4200);
  }

  /* ---------- Wallet chip ---------- */

  function renderWallet() {
    const w = store.wallet;
    const net = live && store.network ? `<span class="tag tag-demo">${esc(store.network.short)}</span>` : live ? '' : '<span class="tag tag-demo">Demo</span>';
    walletEl.innerHTML = w
      ? `<span class="wallet-dot" aria-hidden="true"></span><span class="wallet-addr">${shortAddr(w.address)}</span><span class="wallet-bal">${pls(w.balance)}</span>${net}<button type="button" class="wallet-off" data-disconnect aria-label="Disconnect wallet">×</button>`
      : `<button type="button" class="btn-pulse btn-sm" data-connect ${connecting ? 'disabled' : ''}>${connecting ? 'Connecting…' : live ? 'Connect wallet' : 'Connect demo wallet'}</button>${net}`;
    panelNote.textContent = tagline();
    root.dataset.sales = !live ? 'demo' : store.network?.testnet ? 'testnet' : 'live';
    $('[data-builder-reset]').hidden = live;
  }

  async function connect(walletId?: string) {
    if (connecting || store.wallet) return;
    if (live && !walletId) {
      const list = await store.wallets();
      if (list.length !== 1) return pickWallet(list);
      walletId = list[0].id;
    }
    connecting = true;
    closeModal();
    renderWallet();
    renderPanel();
    try {
      await store.connect(walletId);
      toast(live ? `Wallet connected on ${store.network?.name ?? 'PulseChain'}.` : 'Demo wallet connected with simulated PLS.');
    } catch (e) {
      toast((e as Error).message);
    }
    connecting = false;
    renderWallet();
    renderPanel();
  }

  /** Several wallets in this browser: which one? None: how to get one. */
  function pickWallet(list: { id: string; name: string; icon: string }[]) {
    openModal(
      list.length
        ? `<p class="kicker"><span class="kicker-num">Wallet</span> Connect</p>
           <h2 class="city-panel-title" id="buy-title">Pick your wallet</h2>
           <div class="wallet-picks">${list
             .map((w) => `<button type="button" class="wallet-pick" data-wallet-id="${esc(w.id)}">${w.icon ? `<img src="${esc(w.icon)}" alt="" width="24" height="24">` : ''}<b>${esc(w.name)}</b></button>`)
             .join('')}</div>
           <p class="city-panel-fine">Your wallet asks before it shares your address or sends anything.</p>`
        : `<p class="kicker"><span class="kicker-num">Wallet</span> Connect</p>
           <h2 class="city-panel-title" id="buy-title">No wallet found</h2>
           <p class="city-panel-text">Buying a plot needs a crypto wallet that works with PulseChain.</p>
           <p class="city-panel-fine">On a phone, open this page in your wallet app's own browser. On a computer, add a wallet extension to your browser, then reload this page.</p>
           <div class="city-panel-actions"><button type="button" class="chip-link" data-cancel>Close</button></div>`
    );
  }

  /* ---------- Plot panel ---------- */

  function renderPanel() {
    if (!selected) return;
    const p = selected;
    const rec = store.get(p.id);
    const mine = store.mine(p.id);
    const head = `
      <p class="kicker"><span class="kicker-num">${esc(p.district)}</span> ${esc(p.districtName)}</p>
      <h2 id="plot-title" class="city-panel-title">Plot <span class="nowrap">${esc(p.id)}</span></h2>`;

    if (!rec && store.pending(p.id)) {
      body.innerHTML = `${head}
        <span class="tag tag-pending">Sale pending</span>
        <p class="city-panel-text">A payment for this plot is being checked on PulseChain. If it goes through, the plot is taken; if not, it's back on sale in a few minutes.</p>`;
      return;
    }

    if (!rec) {
      const w = store.wallet;
      const short = w && w.balance < store.price;
      const action = !store.open
        ? `<button type="button" class="btn-pulse" disabled>Sales open soon</button>`
        : w
          ? `<button type="button" class="btn-pulse" data-buy ${short ? 'disabled' : ''}>Buy for ${pls(store.price)}</button>`
          : `<button type="button" class="btn-pulse" data-connect ${connecting ? 'disabled' : ''}>${connecting ? 'Connecting…' : live ? 'Connect wallet to buy' : 'Connect demo wallet to buy'}</button>`;
      body.innerHTML = `${head}
        <span class="tag">For sale</span>
        <dl class="plot-facts">
          <div><dt>Size</dt><dd>One large plot<small>All 9 squares of ${esc(p.districtName)} in one</small></dd></div>
          <div><dt>Price</dt><dd>${pls(store.price)}${live ? '' : '<small>Demo: play money</small>'}</dd></div>
          ${live && store.network ? `<div><dt>Network</dt><dd>${esc(store.network.name)}${store.network.testnet ? '<small>Test PLS, no real value</small>' : ''}</dd></div>` : ''}
        </dl>
        <div class="city-panel-actions">${action}</div>
        ${short ? `<p class="city-panel-fine">Not enough ${symbol()} in this wallet for this plot.${live ? '' : ' Release a plot or reset the demo to get it back.'}</p>` : ''}
        <p class="city-panel-fine">${live ? 'Whoever owns a plot decides what stands on it, and everyone in the city sees it.' : 'Simulated purchase: nothing is charged and nothing touches PulseChain.'}</p>`;
      return;
    }

    if (!mine) {
      const def = rec.design ? defOf(rec.design.type) : null;
      body.innerHTML = `${head}
        <span class="tag tag-taken">Owned</span>
        <dl class="plot-facts">
          <div><dt>Owner</dt><dd>${shortAddr(rec.owner)}</dd></div>
          <div><dt>Building</dt><dd>${def ? esc(def.name) : 'Nothing yet'}</dd></div>
        </dl>
        <p class="city-panel-fine">This plot isn't for sale.</p>`;
      return;
    }

    if (draft) {
      const def = defOf(draft.type);
      body.innerHTML = `${head}
        <p class="city-panel-text"><strong>${esc(def.name)}</strong> · ${esc(def.blurb)}</p>
        ${swatches('Walls', 'color', WALL_COLORS, draft.color)}
        ${swatches('Neon', 'neon', NEON_COLORS, draft.neon)}
        ${def.floors ? `<label class="builder-field"><span>Floors <output data-floors-out>${draft.floors}</output></span><input type="range" data-floors min="${def.floors[0]}" max="${def.floors[1]}" value="${draft.floors}"></label>` : ''}
        ${def.sign ? `<div class="builder-field"><span>Sign</span><div class="seg">${SIGNS.map((s) => `<button type="button" data-sign="${esc(s)}" aria-pressed="${s === draft!.sign}">${esc(s)}</button>`).join('')}</div></div>` : ''}
        <div class="city-panel-actions">
          <button type="button" class="chip-link" data-rotate>↻ Turn</button>
          <button type="button" class="btn-pulse" data-place ${saving ? 'disabled' : ''}>${saving ? 'Saving…' : rec.design ? 'Save changes' : 'Place building'}</button>
          <button type="button" class="chip-link" data-back>Back</button>
        </div>
        ${live ? '<p class="city-panel-fine">The first change in a visit asks your wallet to sign in: free, no gas, no transaction.</p>' : ''}`;
      return;
    }

    if (rec.design) {
      const def = defOf(rec.design.type);
      body.innerHTML = `${head}
        <span class="tag tag-mine">Yours</span>
        <p class="city-panel-text"><strong>${esc(def.name)}</strong>${rec.design.floors && def.floors ? ` · ${rec.design.floors} floors` : ''}${def.sign ? ` · “${esc(rec.design.sign)}” sign` : ''}</p>
        <div class="city-panel-actions">
          <button type="button" class="btn-pulse" data-edit>Edit building</button>
          <button type="button" class="chip-link" data-demolish ${saving ? 'disabled' : ''}>Demolish</button>
        </div>
        ${ownedFoot(rec.tx)}`;
      return;
    }

    body.innerHTML = `${head}
      <span class="tag tag-mine">Yours</span>
      <p class="city-panel-text">Nine squares in one: each design fills the whole plot, grounds and all. You can change it any time.</p>
      <div class="builder-catalog">
        ${BUILDINGS.map((b) => `<button type="button" class="builder-card" data-pick="${b.type}"><span class="builder-card-name">${esc(b.name)}</span><span class="builder-card-blurb">${esc(b.blurb)}</span></button>`).join('')}
      </div>
      ${ownedFoot(rec.tx)}`;
  }

  const ownedFoot = (tx: string) =>
    live
      ? `<p class="city-panel-fine">Bought with transaction ${shortAddr(tx)}</p>`
      : `<p class="city-panel-fine">Simulated transaction ${shortAddr(tx)}</p>
         <div class="city-panel-actions"><button type="button" class="chip-link" data-release>Release plot (refund demo PLS)</button></div>`;

  const swatches = (label: string, key: string, list: string[], value: string) => `
    <div class="builder-field"><span>${label}</span><div class="swatches" role="radiogroup" aria-label="${label}">
      ${list.map((c) => `<button type="button" class="swatch" role="radio" aria-checked="${c === value}" aria-label="${c}" data-${key}="${c}" style="--c:${c}"></button>`).join('')}
    </div></div>`;

  function startDraft(def: BuildingDef, from?: Design) {
    draft = from
      ? { ...from }
      : { type: def.type, color: WALL_COLORS[Math.floor(Math.random() * 7)], neon: NEON_COLORS[0], floors: def.floors?.[2] ?? 1, sign: SIGNS[0], rot: 0 };
    if (def.floors) draft.floors = Math.min(def.floors[1], Math.max(def.floors[0], draft.floors));
    preview();
    renderPanel();
  }
  const preview = () => selected && plots.show(selected.id, draft, false);
  function cancelDraft() {
    if (!selected) return;
    draft = null;
    plots.show(selected.id, store.get(selected.id)?.design ?? null, false);
    shown.set(selected.id, JSON.stringify(store.get(selected.id)?.design ?? null));
    renderPanel();
  }

  /* ---------- Buildings and plot colours follow the store (everyone's plots, live) ---------- */

  const shown = new Map<string, string>();
  function sync(first = false) {
    plots.setStates(store.states());
    for (const p of PLOTS) {
      if (draft && selected?.id === p.id) continue;
      const design = store.get(p.id)?.design ?? null;
      const key = JSON.stringify(design);
      if ((shown.get(p.id) ?? 'null') === key) continue;
      plots.show(p.id, design, !first && !!design);
      shown.set(p.id, key);
    }
    if (!draft && !buying) renderPanel();
    renderWallet();
  }

  /* ---------- Selecting plots ---------- */

  function select(id: string | null) {
    if (draft && selected && selected.id !== id) cancelDraft();
    selected = id ? plotById(id) : null;
    draft = null;
    plots.setSelected(selected?.id ?? null);
    root.classList.toggle('has-plot', !!selected);
    if (!selected) {
      panel.classList.remove('is-open');
      setTimeout(() => {
        if (!selected) panel.hidden = true;
      }, 300);
      return;
    }
    renderPanel();
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    deps.focus(selected);
  }

  /* ---------- Purchase dialog ---------- */

  function openModal(html: string) {
    modal.hidden = false;
    modalBody.innerHTML = html;
    modalBody.querySelector<HTMLButtonElement>('button')?.focus();
  }

  function openBuy() {
    if (!selected || !store.wallet) return;
    const p = selected;
    const w = store.wallet;
    if (!live) {
      openModal(`
        <p class="kicker"><span class="kicker-num">Demo</span> Simulated purchase</p>
        <h2 class="city-panel-title" id="buy-title">Buy plot ${esc(p.id)}?</h2>
        <dl class="plot-facts">
          <div><dt>Price</dt><dd>${pls(store.price)}</dd></div>
          <div><dt>Demo wallet</dt><dd>${pls(w.balance)}</dd></div>
          <div><dt>After</dt><dd>${pls(w.balance - store.price)}</dd></div>
        </dl>
        <p class="city-panel-fine">Nothing is charged and nothing touches PulseChain.</p>
        <div class="city-panel-actions">
          <button type="button" class="btn-pulse" data-confirm>Confirm purchase</button>
          <button type="button" class="chip-link" data-cancel>Cancel</button>
        </div>`);
      return;
    }
    const net = store.network!;
    openModal(`
      <p class="kicker"><span class="kicker-num">${esc(net.short)}</span> Buy a plot</p>
      <h2 class="city-panel-title" id="buy-title">Buy plot ${esc(p.id)}?</h2>
      <dl class="plot-facts">
        <div><dt>Price</dt><dd>${pls(store.price)}<small>plus a little gas</small></dd></div>
        <div><dt>Pays to</dt><dd>${shortAddr(store.payee ?? '')}<small>The Degen City wallet</small></dd></div>
        <div><dt>Network</dt><dd>${esc(net.name)}${net.testnet ? '<small>Test PLS, no real value</small>' : ''}</dd></div>
        <div><dt>Your wallet</dt><dd>${pls(w.balance)}</dd></div>
      </dl>
      <p class="city-panel-fine">Your wallet will ask you to approve the payment. The plot is yours once it has ${store.confirmations} confirmations on PulseChain, usually within a minute. If someone else's payment for this plot lands first, yours is recorded for a refund.</p>
      <div class="city-panel-actions">
        <button type="button" class="btn-pulse" data-confirm>Continue in wallet</button>
        <button type="button" class="chip-link" data-cancel>Cancel</button>
      </div>`);
  }

  const STEPS: [BuyStep, string, string][] = [
    ['wallet', 'Approve in your wallet', 'Check the amount and the address'],
    ['chain', 'Confirming on PulseChain', 'The game server checks the payment'],
  ];
  async function confirmBuy() {
    if (!selected || buying) return;
    const p = selected;
    buying = true;
    // No way out mid-purchase: it settles either way, and closing would hide the result
    modalClose.hidden = true;
    const kicker = live ? `<span class="kicker-num">${esc(store.network?.short ?? 'PulseChain')}</span> Buying` : '<span class="kicker-num">Demo</span> Simulated purchase';
    const render = (step: BuyStep) => {
      const at = STEPS.findIndex(([s]) => s === step);
      modalBody.innerHTML = `
        <p class="kicker">${kicker}</p>
        <h2 class="city-panel-title" id="buy-title">Buying plot ${esc(p.id)}</h2>
        <ol class="buy-steps">${STEPS.map(([, label, note], i) => `<li class="${i < at || step === 'done' ? 'is-done' : i === at ? 'is-now' : ''}">${label}<small>${live ? note : 'simulated'}</small></li>`).join('')}</ol>
        ${live && step === 'chain' ? '<p class="city-panel-fine">You can keep exploring: this finishes on its own, even if you close the page.</p>' : ''}`;
    };
    try {
      render('wallet');
      const owned = await store.buy(p, render);
      modalBody.innerHTML = `
        <p class="kicker">${kicker}</p>
        <h2 class="city-panel-title" id="buy-title">Plot ${esc(p.id)} is <span class="hl">yours</span></h2>
        <p class="city-panel-fine">${live ? 'Transaction' : 'Simulated transaction'} ${shortAddr(owned.tx)}</p>
        <div class="city-panel-actions"><button type="button" class="btn-pulse" data-start>Start building</button></div>`;
      modalBody.querySelector<HTMLButtonElement>('[data-start]')!.focus();
    } catch (e) {
      modalBody.innerHTML = `
        <h2 class="city-panel-title" id="buy-title">Couldn't buy plot ${esc(p.id)}</h2>
        <p class="city-panel-text">${esc((e as Error).message)}</p>
        <div class="city-panel-actions"><button type="button" class="chip-link" data-cancel>Close</button></div>`;
    } finally {
      buying = false;
      modalClose.hidden = false;
      sync();
    }
  }
  const closeModal = () => {
    if (buying) return;
    modal.hidden = true;
    panel.querySelector<HTMLElement>('button')?.focus();
  };

  async function save(id: string, design: Design | null) {
    if (saving) return;
    saving = true;
    renderPanel();
    if (live && design) toast('Saving… your wallet may ask you to sign in (free, no gas).');
    try {
      const isNew = !store.get(id)?.design;
      if (design) await store.build(id, design);
      else await store.demolish(id);
      if (draft && selected?.id === id) draft = null;
      shown.delete(id);
      sync();
      toast(design ? (isNew ? `Built on plot ${id}.` : `Plot ${id} updated.`) : `Plot ${id} cleared.`);
    } catch (e) {
      toast(`Couldn't save: ${(e as Error).message}`);
    } finally {
      saving = false;
      renderPanel();
    }
  }

  /* ---------- Events ---------- */

  // A tap on the dimmed backdrop closes the purchase dialog
  modal.addEventListener('click', (e) => e.target === modal && closeModal());

  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!t || !root.contains(t)) return;
    const d = t.dataset;
    if ('connect' in d) connect();
    else if (d.walletId) connect(d.walletId);
    else if ('disconnect' in d) {
      store.disconnect();
      sync();
      toast('Wallet disconnected.');
    } else if ('buy' in d) openBuy();
    else if ('confirm' in d) confirmBuy();
    else if ('cancel' in d) closeModal();
    else if ('start' in d) closeModal();
    else if (d.pick) startDraft(defOf(d.pick as Design['type']));
    else if (draft && d.color) ((draft.color = d.color), preview(), renderPanel());
    else if (draft && d.neon) ((draft.neon = d.neon), preview(), renderPanel());
    else if (draft && d.sign) ((draft.sign = d.sign), preview(), renderPanel());
    else if (draft && 'rotate' in d) ((draft.rot = (draft.rot + 1) % 4), preview());
    else if ('back' in d) cancelDraft();
    else if ('place' in d && draft && selected) save(selected.id, { ...draft });
    else if ('edit' in d && selected) {
      const o = store.get(selected.id);
      if (o?.design) startDraft(defOf(o.design.type), o.design);
    } else if ('demolish' in d && selected) save(selected.id, null);
    else if ('release' in d && selected && store.release) {
      store.release(selected.id);
      sync();
      toast(`Plot ${selected.id} released. Demo PLS refunded.`);
    } else if ('plotClose' in d) select(null);
    else if ('builderExit' in d) setBuild(false);
    else if ('builderReset' in d && store.reset) {
      if (!confirm('Reset the demo? This clears your demo wallet, plots and buildings in this browser.')) return;
      store.reset();
      select(null);
      sync();
      toast('Demo reset.');
    }
  });
  root.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (!draft || !t.matches('[data-floors]')) return;
    draft.floors = Number(t.value);
    root.querySelector('[data-floors-out]')!.textContent = t.value;
    preview();
  });
  // Build in the mode header's switch (City in the header leaves it)
  toggle.addEventListener('click', () => setBuild(true));

  /** Arrow keys walk between plots; Escape steps back. Returns true if handled. */
  function key(e: KeyboardEvent) {
    if (!building) return false;
    if (e.key === 'Escape') {
      if (!modal.hidden) closeModal();
      else if (draft) cancelDraft();
      else if (selected) select(null);
      else setBuild(false);
      return true;
    }
    const dirs: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
    const dir = dirs[e.key];
    if (!dir || !modal.hidden || (e.target as HTMLElement).matches('input, select, textarea')) return false;
    const next = selected ? plotToward(selected, dir[0], dir[1]) : PLOT_BY_ID.get('N3');
    if (next) select(next.id);
    e.preventDefault();
    return true;
  }

  function setBuild(on: boolean) {
    if (building === on) return;
    building = on;
    root.dataset.mode = on ? 'build' : 'explore';
    toggle.setAttribute('aria-pressed', String(on));
    bar.hidden = !on;
    plots.setOverlay(on);
    if (!on) {
      if (draft) cancelDraft();
      select(null);
      plots.setHover(null);
    } else {
      store.refresh();
      renderWallet();
      deps.overview();
    }
    deps.onMode(on);
  }

  store.subscribe(() => {
    if (live !== (store.mode === 'live')) {
      // Switched online / offline: the other store's plots, wallet and dialogs
      live = store.mode === 'live';
      // (a payment already in flight keeps its dialog: it finishes on its own)
      if (draft) cancelDraft();
      closeModal();
    }
    sync();
  });
  sync(true);
  toggle.hidden = false;

  return {
    get active() {
      return building;
    },
    select,
    key,
    setBuild,
  };
}
