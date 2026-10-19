/*
 * Build mode's interface: the demo wallet, the plot panel (buy, choose a
 * building, customise it with a live preview, edit, demolish, release,
 * merge four plots in a 2 x 2 square into a big plot and split it again),
 * the simulated purchase dialog and toasts. The 3D side lives in plots.ts
 * and the state in store.ts.
 */
import { BUILDINGS, NEON_COLORS, SIGNS, TIER_INFO, WALL_COLORS, type BuildingDef } from '../../data/plots';
import { BIG_MAX_FLOORS, PLOT_BY_ID, plotById, plotToward, squaresWith, type Design, type Plot, type PlotsApi } from './plots';
import type { BuyStep, Store } from './store';

const fmt = new Intl.NumberFormat('en-US');
const pls = (n: number) => `${fmt.format(n)} PLS`;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const defOf = (t: Design['type']) => BUILDINGS.find((b) => b.type === t)!;
/** "N3-05" -> "05" */
const num = (id: string) => id.slice(-2);

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
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const toggle = $<HTMLButtonElement>('[data-build-toggle]');
  const bar = $('[data-builder-bar]');
  const walletEl = $('[data-wallet]');
  const panel = $('[data-plot-panel]');
  const body = $('[data-plot-body]');
  const modal = $('[data-buy-modal]');
  const modalBody = $('[data-buy-body]');
  const toastEl = $('[data-toast]');

  let building = false;
  let selected: Plot | null = null;
  /** Unsaved design being previewed on the selected plot */
  let draft: Design | null = null;
  let connecting = false;
  let buying = false;
  let toastTimer = 0;

  function toast(msg: string) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('is-on'), 3200);
  }

  /* ---------- Wallet chip ---------- */

  function renderWallet() {
    const w = store.wallet;
    walletEl.innerHTML = w
      ? `<span class="wallet-dot" aria-hidden="true"></span><span class="wallet-addr">${short(w.address)}</span><span class="wallet-bal">${pls(w.balance)}</span><span class="tag tag-demo">Demo</span>`
      : `<button type="button" class="btn-pulse btn-sm" data-connect ${connecting ? 'disabled' : ''}>${connecting ? 'Connecting…' : 'Connect demo wallet'}</button>`;
  }

  async function connect() {
    if (connecting || store.wallet) return;
    connecting = true;
    renderWallet();
    renderPanel();
    await store.connect();
    connecting = false;
    renderWallet();
    renderPanel();
    toast('Demo wallet connected with simulated PLS.');
  }

  /* ---------- Plot panel ---------- */

  function renderPanel() {
    if (!selected) return;
    const p = selected;
    const owned = store.owned(p.id);
    const tier = TIER_INFO[p.tier];
    const head = `
      <p class="kicker"><span class="kicker-num">${esc(p.district)}</span> ${esc(p.districtName)}</p>
      <h2 id="plot-title" class="city-panel-title">${p.parts ? 'Big plot' : 'Plot'} <span class="nowrap">${esc(p.id)}</span></h2>`;
    const mine = p.parts ? `<span class="tag tag-mine">Yours · big plot of 4</span>` : `<span class="tag tag-mine">Yours</span>`;

    if (!owned) {
      const w = store.wallet;
      const short_ = w && w.balance < p.price;
      body.innerHTML = `${head}
        <span class="tag">For sale</span>
        <dl class="plot-facts">
          <div><dt>Size</dt><dd>3 × 3 tiles</dd></div>
          <div><dt>Tier</dt><dd>${tier.label}<small>${esc(tier.note)}</small></dd></div>
          <div><dt>Price</dt><dd>${pls(p.price)}<small>Demo price</small></dd></div>
        </dl>
        <div class="city-panel-actions">
          ${
            w
              ? `<button type="button" class="btn-pulse" data-buy ${short_ ? 'disabled' : ''}>Buy for ${pls(p.price)}</button>`
              : `<button type="button" class="btn-pulse" data-connect ${connecting ? 'disabled' : ''}>${connecting ? 'Connecting…' : 'Connect demo wallet to buy'}</button>`
          }
        </div>
        ${short_ ? `<p class="city-panel-fine">Not enough demo PLS. Release a plot or reset the demo to get it back.</p>` : ''}
        <p class="city-panel-fine">Simulated purchase: nothing is charged and nothing touches PulseChain yet.</p>`;
      return;
    }

    if (draft) {
      const def = defOf(draft.type);
      const floors = floorRange(def);
      body.innerHTML = `${head}
        <p class="city-panel-text"><strong>${esc(def.name)}</strong> · ${esc(def.blurb)}</p>
        ${swatches('Walls', 'color', WALL_COLORS, draft.color)}
        ${swatches('Neon', 'neon', NEON_COLORS, draft.neon)}
        ${floors ? `<label class="builder-field"><span>Floors <output data-floors-out>${draft.floors}</output></span><input type="range" data-floors min="${floors[0]}" max="${floors[1]}" value="${draft.floors}"></label>` : ''}
        ${def.sign ? `<div class="builder-field"><span>Sign</span><div class="seg">${SIGNS.map((s) => `<button type="button" data-sign="${esc(s)}" aria-pressed="${s === draft!.sign}">${esc(s)}</button>`).join('')}</div></div>` : ''}
        <div class="city-panel-actions">
          <button type="button" class="chip-link" data-rotate>↻ Turn</button>
          <button type="button" class="btn-pulse" data-place>${owned.design ? 'Save changes' : 'Place building'}</button>
          <button type="button" class="chip-link" data-back>Back</button>
        </div>`;
      return;
    }

    if (owned.design) {
      const def = defOf(owned.design.type);
      body.innerHTML = `${head}
        ${mine}
        <p class="city-panel-text"><strong>${esc(def.name)}</strong>${owned.design.floors && def.floors ? ` · ${owned.design.floors} floors` : ''}${def.sign ? ` · “${esc(owned.design.sign)}” sign` : ''}</p>
        <div class="city-panel-actions">
          <button type="button" class="btn-pulse" data-edit>Edit building</button>
          <button type="button" class="chip-link" data-demolish>Demolish</button>
        </div>
        ${mergeBlock(p)}
        ${ownedFoot(p, owned)}`;
      return;
    }

    body.innerHTML = `${head}
      ${mine}
      <p class="city-panel-text">${p.parts ? 'Four plots in one: whatever you build here goes up twice the size.' : 'Pick something to build. You can change it any time.'}</p>
      <div class="builder-catalog">
        ${BUILDINGS.map((b) => `<button type="button" class="builder-card" data-pick="${b.type}"><span class="builder-card-name">${esc(b.name)}</span><span class="builder-card-blurb">${esc(b.blurb)}</span></button>`).join('')}
      </div>
      ${mergeBlock(p)}
      ${ownedFoot(p, owned)}`;
  }

  const ownedFoot = (p: Plot, o: { tx: string; design?: Design }) =>
    p.parts
      ? `
    <p class="city-panel-fine">Simulated transaction ${short(o.tx)}</p>
    <div class="city-panel-actions">
      <button type="button" class="chip-link" data-split ${o.design ? 'aria-disabled="true"' : ''}>Split into 4 plots</button>
      <button type="button" class="chip-link" data-release>Release all 4 plots (refund demo PLS)</button>
    </div>
    ${o.design ? `<p class="city-panel-fine">Demolish the building to split the plot again.</p>` : ''}`
      : `
    <p class="city-panel-fine">Simulated transaction ${short(o.tx)}</p>
    <div class="city-panel-actions"><button type="button" class="chip-link" data-release>Release plot (refund demo PLS)</button></div>`;

  /** What stops a 2 x 2 square from being merged (empty when it can be) */
  function mergeBlocker(big: Plot) {
    const parts = big.parts!;
    const missing = parts.filter((q) => !store.owned(q));
    if (missing.length) return `Buy ${missing.map(num).join(', ')} first`;
    const taken = parts.filter((q) => store.bigOf(q));
    if (taken.length) return `${taken.map(num).join(', ')} already in a big plot`;
    if (parts.some((q) => store.owned(q)?.design)) return 'Clear the buildings first';
    return '';
  }

  /** On a plot you own: the 2 x 2 squares it could be merged into */
  function mergeBlock(p: Plot) {
    if (p.parts) return '';
    const squares = squaresWith(p);
    return `
      <div class="builder-merge">
        <p class="builder-merge-head">Merge into a big plot</p>
        <p class="city-panel-fine">Four plots you own in a 2 × 2 square become one big plot, for a building twice the size.</p>
        <div class="builder-merge-list">
          ${squares
            .map((b) => {
              const why = mergeBlocker(b);
              const others = b.parts!.filter((q) => q !== p.id).map(num);
              return `<button type="button" class="builder-merge-opt" data-merge="${esc(b.id)}" ${why ? 'aria-disabled="true"' : ''}><b>With ${others.join(', ')}</b><small>${why ? esc(why) : 'Ready to merge'}</small></button>`;
            })
            .join('')}
        </div>
      </div>`;
  }

  /** Floors on offer: towers on big plots stop short of the Emporium */
  function floorRange(def: BuildingDef): [number, number] | null {
    if (!def.floors) return null;
    const max = selected?.parts && def.type === 'tower' ? Math.min(def.floors[1], BIG_MAX_FLOORS) : def.floors[1];
    return [def.floors[0], max];
  }

  const swatches = (label: string, key: string, list: string[], value: string) => `
    <div class="builder-field"><span>${label}</span><div class="swatches" role="radiogroup" aria-label="${label}">
      ${list.map((c) => `<button type="button" class="swatch" role="radio" aria-checked="${c === value}" aria-label="${c}" data-${key}="${c}" style="--c:${c}"></button>`).join('')}
    </div></div>`;

  function startDraft(def: BuildingDef, from?: Design) {
    draft = from
      ? { ...from }
      : { type: def.type, color: WALL_COLORS[Math.floor(Math.random() * 7)], neon: NEON_COLORS[0], floors: def.floors?.[2] ?? 1, sign: SIGNS[0], rot: 0 };
    const range = floorRange(def);
    if (range) draft.floors = Math.min(range[1], Math.max(range[0], draft.floors));
    preview();
    renderPanel();
  }
  const preview = () => selected && plots.show(selected.id, draft, false);
  function cancelDraft() {
    if (!selected) return;
    draft = null;
    plots.show(selected.id, store.owned(selected.id)?.design ?? null, false);
    renderPanel();
  }

  /* ---------- Selecting plots ---------- */

  function select(id: string | null) {
    // A plot that's part of a big plot selects the big plot
    if (id) id = store.bigOf(id) ?? id;
    if (draft && selected && selected.id !== id) cancelDraft();
    selected = id ? plotById(id) : null;
    plots.setMarked([]);
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

  /* ---------- Simulated purchase dialog ---------- */

  function openBuy() {
    if (!selected || !store.wallet) return;
    const p = selected;
    const w = store.wallet;
    modal.hidden = false;
    modalBody.innerHTML = `
      <p class="kicker"><span class="kicker-num">Demo</span> Simulated purchase</p>
      <h2 class="city-panel-title" id="buy-title">Buy plot ${esc(p.id)}?</h2>
      <dl class="plot-facts">
        <div><dt>Price</dt><dd>${pls(p.price)}</dd></div>
        <div><dt>Demo wallet</dt><dd>${pls(w.balance)}</dd></div>
        <div><dt>After</dt><dd>${pls(w.balance - p.price)}</dd></div>
      </dl>
      <p class="city-panel-fine">Nothing is charged and nothing touches PulseChain. This shows how buying will work once wallets are connected.</p>
      <div class="city-panel-actions">
        <button type="button" class="btn-pulse" data-confirm>Confirm purchase</button>
        <button type="button" class="chip-link" data-cancel>Cancel</button>
      </div>`;
    modalBody.querySelector<HTMLButtonElement>('[data-confirm]')!.focus();
  }

  const STEPS: [BuyStep, string][] = [
    ['wallet', 'Approve in wallet'],
    ['chain', 'Confirming on PulseChain'],
  ];
  async function confirmBuy() {
    if (!selected || buying) return;
    const p = selected;
    buying = true;
    const render = (step: BuyStep) => {
      const at = STEPS.findIndex(([s]) => s === step);
      modalBody.innerHTML = `
        <p class="kicker"><span class="kicker-num">Demo</span> Simulated purchase</p>
        <h2 class="city-panel-title" id="buy-title">Buying plot ${esc(p.id)}</h2>
        <ol class="buy-steps">${STEPS.map(([, label], i) => `<li class="${i < at || step === 'done' ? 'is-done' : i === at ? 'is-now' : ''}">${label}<small>simulated</small></li>`).join('')}</ol>`;
    };
    try {
      render('wallet');
      const owned = await store.buy(p, render);
      plots.setOwned(store.ownedIds());
      renderWallet();
      modalBody.innerHTML = `
        <p class="kicker"><span class="kicker-num">Demo</span> Simulated purchase</p>
        <h2 class="city-panel-title" id="buy-title">Plot ${esc(p.id)} is <span class="hl">yours</span></h2>
        <p class="city-panel-fine">Simulated transaction ${short(owned.tx)}</p>
        <div class="city-panel-actions"><button type="button" class="btn-pulse" data-start>Start building</button></div>`;
      modalBody.querySelector<HTMLButtonElement>('[data-start]')!.focus();
      renderPanel();
    } catch (e) {
      modalBody.innerHTML = `
        <h2 class="city-panel-title" id="buy-title">Couldn't buy plot ${esc(p.id)}</h2>
        <p class="city-panel-text">${esc((e as Error).message)}</p>
        <div class="city-panel-actions"><button type="button" class="chip-link" data-cancel>Close</button></div>`;
    } finally {
      buying = false;
    }
  }
  const closeModal = () => {
    if (buying) return;
    modal.hidden = true;
    panel.querySelector<HTMLElement>('button')?.focus();
  };

  /* ---------- Events ---------- */

  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!t || !root.contains(t)) return;
    const d = t.dataset;
    if ('connect' in d) connect();
    else if ('buy' in d) openBuy();
    else if ('confirm' in d) confirmBuy();
    else if ('cancel' in d) closeModal();
    else if ('start' in d) closeModal();
    else if (d.pick) startDraft(defOf(d.pick as Design['type']));
    else if (draft && d.color) ((draft.color = d.color), preview(), renderPanel());
    else if (draft && d.neon) ((draft.neon = d.neon), preview(), renderPanel());
    else if (draft && d.sign) ((draft.sign = d.sign), preview(), renderPanel());
    else if (draft && 'rotate' in d) ((draft.rot = (draft.rot + 1) % 4), preview());
    else if ('back' in d) cancelDraft();
    else if ('place' in d && draft && selected) {
      const isNew = !store.owned(selected.id)?.design;
      store.build(selected.id, draft);
      plots.show(selected.id, draft, isNew);
      draft = null;
      renderPanel();
      toast(isNew ? `Built on plot ${selected.id}.` : `Plot ${selected.id} updated.`);
    } else if ('edit' in d && selected) {
      const o = store.owned(selected.id);
      if (o?.design) startDraft(defOf(o.design.type), o.design);
    } else if ('demolish' in d && selected) {
      store.demolish(selected.id);
      plots.show(selected.id, null);
      renderPanel();
      toast(`Plot ${selected.id} cleared.`);
    } else if ('release' in d && selected) {
      const id = selected.id;
      const big = !!selected.parts;
      store.release(id);
      plots.show(id, null);
      plots.setMerged(store.bigIds());
      plots.setOwned(store.ownedIds());
      renderWallet();
      if (big) select(selected.parts![0]);
      else renderPanel();
      toast(big ? `Big plot ${id} released: all four plots. Demo PLS refunded.` : `Plot ${id} released. Demo PLS refunded.`);
    } else if (d.merge && selected) {
      const big = plotById(d.merge);
      const why = big ? mergeBlocker(big) : 'Not a 2 × 2 square';
      if (why || !big) return toast(`Can't merge yet: ${why}.`);
      store.merge(big);
      plots.setMarked([]);
      plots.setMerged(store.bigIds());
      select(big.id);
      toast(`Plots ${big.parts!.map(num).join(', ')} merged into big plot ${big.id}.`);
    } else if ('split' in d && selected?.parts) {
      if (store.owned(selected.id)?.design) return toast('Demolish the building first, then split the plot.');
      const big = selected;
      store.split(big.id);
      plots.setMerged(store.bigIds());
      select(big.parts![0]);
      toast(`Big plot ${big.id} split back into four plots.`);
    } else if ('plotClose' in d) select(null);
    else if ('builderExit' in d) setBuild(false);
    else if ('builderReset' in d) {
      if (!confirm('Reset the demo? This clears your demo wallet, plots and buildings in this browser.')) return;
      for (const id of [...store.ownedIds(), ...store.bigIds()]) plots.show(id, null, false);
      store.reset();
      plots.setMerged([]);
      plots.setOwned([]);
      select(null);
      renderWallet();
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
    // Step past the other plots of the same big plot
    let next = selected ? plotToward(selected, dir[0], dir[1]) : PLOT_BY_ID.get('N3-08');
    while (next && selected && store.bigOf(next.id) === selected.id) next = plotToward(next, dir[0], dir[1]);
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
      renderWallet();
      deps.overview();
    }
    deps.onMode(on);
  }

  plots.setOwned(store.ownedIds());
  plots.setMerged(store.bigIds());
  for (const id of [...store.ownedIds(), ...store.bigIds()]) {
    const d = store.owned(id)?.design;
    if (d) plots.show(id, d, false);
  }
  // Pointing at a merge option lights up its square
  body.addEventListener('pointerover', (e) => markFrom(e.target));
  body.addEventListener('focusin', (e) => markFrom(e.target));
  body.addEventListener('pointerout', () => plots.setMarked([]));
  function markFrom(t: EventTarget | null) {
    const id = (t as HTMLElement | null)?.closest<HTMLElement>('[data-merge]')?.dataset.merge;
    plots.setMarked(id ? (plotById(id)?.parts ?? []) : []);
  }
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
