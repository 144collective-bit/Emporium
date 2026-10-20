/*
 * Build mode's interface: the Plots button in the mode header (what you
 * own, your Dorras, the price of the next plot), the plot panel (buy a
 * district plot, choose a building, customise it with a live preview, edit,
 * demolish, sell it back), the confirmation dialog and toasts. The 3D side
 * lives in plots.ts; ownership in the Store (store.ts), over the city's own
 * game: plots cost Dorras and need a level (catalog.ts), never real money.
 */
import { BUILDINGS, NEON_COLORS, SIGNS, WALL_COLORS, type BuildingDef } from '../../data/plots';
import { BUILD_COSTS } from './catalog';
import { PLOTS, PLOT_BY_ID, plotById, plotToward, type Design, type Plot, type PlotsApi } from './plots';
import type { Store } from './store';
import { D, esc, fmt, whyNot } from './ui';

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
  /** A sound through the sound switch */
  sfx(kind: 'buy' | 'denied' | 'upgrade'): void;
}

export function createBuilderUI(root: HTMLElement, deps: Deps) {
  const { store, plots } = deps;
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const toggle = $<HTMLButtonElement>('[data-build-toggle]');
  // The Plots button in the city header (a drop-down while building)
  const bar = $<HTMLDetailsElement>('[data-builder-bar]');
  const barLabel = $('[data-plots-label]');
  const barBody = $('[data-plots-summary]');
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
  let toastTimer = 0;

  function toast(msg: string) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('is-on'), 4200);
  }

  /* ---------- The Plots button ---------- */

  function renderBar() {
    const owned = PLOTS.filter((p) => store.mine(p.id));
    barLabel.textContent = owned.length ? `${owned.length} plot${owned.length === 1 ? '' : 's'}` : 'Plots';
    const level = store.level();
    const need = store.needLevel();
    barBody.innerHTML = `
      <ul class="plots-facts">
        <li><span>Your Dorras</span><b>${D(store.dorras())}</b></li>
        <li><span>Next plot</span><b>${D(store.price())}</b></li>
        <li><span>Level needed</span><b>${need}${level < need ? ` <small>(you're ${level})</small>` : ''}</b></li>
        <li><span>Yours</span><b>${owned.length ? owned.map((p) => esc(p.id)).join(', ') : 'none yet'}</b></li>
      </ul>`;
    bar.querySelector('summary')!.setAttribute('aria-label', owned.length ? `Your plots: ${owned.map((p) => p.id).join(', ')}` : 'Plots');
    panelNote.textContent = 'Plots are game property: Dorras only, never real money';
  }

  /* ---------- Plot panel ---------- */

  function renderPanel() {
    if (!selected) return;
    const p = selected;
    const rec = store.get(p.id);
    const head = `
      <p class="kicker"><span class="kicker-num">${esc(p.district)}</span> ${esc(p.districtName)}</p>
      <h2 id="plot-title" class="city-panel-title">Plot <span class="nowrap">${esc(p.id)}</span></h2>`;

    if (!rec) {
      const price = store.price();
      const level = store.level();
      const need = store.needLevel();
      const short = store.dorras() < price;
      const locked = level < need;
      body.innerHTML = `${head}
        <span class="tag">For sale</span>
        <dl class="plot-facts">
          <div><dt>Size</dt><dd>One large plot<small>All 9 squares of ${esc(p.districtName)} in one</small></dd></div>
          <div><dt>Price</dt><dd>${D(price)}<small>Dorras, the city's own money</small></dd></div>
          <div><dt>Level</dt><dd>${need}${locked ? `<small>You're level ${level}: keep playing</small>` : '<small>Reached</small>'}</dd></div>
        </dl>
        <div class="city-panel-actions"><button type="button" class="btn-pulse" data-buy ${short || locked ? 'disabled' : ''}>Buy for ${fmt.format(price)} Dorras</button></div>
        ${short && !locked ? `<p class="city-panel-fine">Not enough Dorras yet. Sell, deliver, race and run missions to earn more.</p>` : ''}
        <p class="city-panel-fine">Whoever owns a plot decides what stands on it. Each plot you own makes the next a little dearer; selling one back pays 60% of what you paid for it and its building.</p>`;
      return;
    }

    if (draft) {
      const def = defOf(draft.type);
      const cost = store.buildCost(p.id, draft);
      body.innerHTML = `${head}
        <p class="city-panel-text"><strong>${esc(def.name)}</strong> · ${esc(def.blurb)}</p>
        ${swatches('Walls', 'color', WALL_COLORS, draft.color)}
        ${swatches('Neon', 'neon', NEON_COLORS, draft.neon)}
        ${def.floors ? `<label class="builder-field"><span>Floors <output data-floors-out>${draft.floors}</output></span><input type="range" data-floors min="${def.floors[0]}" max="${def.floors[1]}" value="${draft.floors}"></label>` : ''}
        ${def.sign ? `<div class="builder-field"><span>Sign</span><div class="seg">${SIGNS.map((s) => `<button type="button" data-sign="${esc(s)}" aria-pressed="${s === draft!.sign}">${esc(s)}</button>`).join('')}</div></div>` : ''}
        <div class="city-panel-actions">
          <button type="button" class="chip-link" data-rotate>↻ Turn</button>
          <button type="button" class="btn-pulse" data-place ${store.dorras() < cost ? 'disabled' : ''}>${rec.design ? 'Save changes' : 'Place building'}${cost ? ` · ${fmt.format(cost)}` : ''}</button>
          <button type="button" class="chip-link" data-back>Back</button>
        </div>
        <p class="city-panel-fine">${cost ? `Building costs ${fmt.format(cost)} Dorras${rec.design ? ' (the difference from what stands there now)' : ''}.` : 'No charge: a cheaper design, a new look or a turn is free.'}</p>`;
      return;
    }

    if (rec.design) {
      const def = defOf(rec.design.type);
      body.innerHTML = `${head}
        <span class="tag tag-mine">Yours</span>
        <p class="city-panel-text"><strong>${esc(def.name)}</strong>${rec.design.floors && def.floors ? ` · ${rec.design.floors} floors` : ''}${def.sign ? ` · “${esc(rec.design.sign)}” sign` : ''}</p>
        <div class="city-panel-actions">
          <button type="button" class="btn-pulse" data-edit>Edit building</button>
          <button type="button" class="chip-link" data-demolish>Demolish</button>
        </div>
        ${ownedFoot(p.id)}`;
      return;
    }

    body.innerHTML = `${head}
      <span class="tag tag-mine">Yours</span>
      <p class="city-panel-text">Nine squares in one: each design fills the whole plot, grounds and all. You can change it any time.</p>
      <div class="builder-catalog">
        ${BUILDINGS.map((b) => `<button type="button" class="builder-card" data-pick="${b.type}"><span class="builder-card-name">${esc(b.name)}<em class="builder-card-cost">${fmt.format(BUILD_COSTS[b.type])}</em></span><span class="builder-card-blurb">${esc(b.blurb)}</span></button>`).join('')}
      </div>
      ${ownedFoot(p.id)}`;
  }

  const ownedFoot = (id: string) =>
    `<p class="city-panel-fine">Paid ${fmt.format(store.get(id)?.paid ?? 0)} Dorras so far. Selling it back pays ${fmt.format(store.refund(id))}.</p>
     <div class="city-panel-actions"><button type="button" class="chip-link" data-sell>Sell plot back</button></div>`;

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

  /* ---------- Buildings and plot colours follow the store ---------- */

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
    if (!draft) renderPanel();
    renderBar();
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

  /* ---------- Confirmation dialog ---------- */

  function openModal(html: string) {
    modal.hidden = false;
    modalBody.innerHTML = html;
    modalBody.querySelector<HTMLButtonElement>('button')?.focus();
  }
  function openBuy() {
    if (!selected) return;
    const p = selected;
    const price = store.price();
    openModal(`
      <p class="kicker"><span class="kicker-num">Plot</span> Buy a district plot</p>
      <h2 class="city-panel-title" id="buy-title">Buy plot ${esc(p.id)}?</h2>
      <dl class="plot-facts">
        <div><dt>Price</dt><dd>${D(price)}</dd></div>
        <div><dt>Your Dorras</dt><dd>${D(store.dorras())}</dd></div>
        <div><dt>After</dt><dd>${D(store.dorras() - price)}</dd></div>
      </dl>
      <p class="city-panel-fine">Dorras are the city's own money, earned by playing. Nothing real changes hands.</p>
      <div class="city-panel-actions">
        <button type="button" class="btn-pulse" data-confirm>Buy the plot</button>
        <button type="button" class="chip-link" data-cancel>Cancel</button>
      </div>`);
  }
  function openSell() {
    if (!selected || !store.mine(selected.id)) return;
    const p = selected;
    openModal(`
      <p class="kicker"><span class="kicker-num">Plot</span> Sell it back</p>
      <h2 class="city-panel-title" id="buy-title">Sell plot ${esc(p.id)}?</h2>
      <dl class="plot-facts">
        <div><dt>You paid</dt><dd>${D(store.get(p.id)?.paid ?? 0)}</dd></div>
        <div><dt>You get back</dt><dd>${D(store.refund(p.id))}</dd></div>
      </dl>
      <p class="city-panel-fine">The building goes with it, and the plot is back on the market.</p>
      <div class="city-panel-actions">
        <button type="button" class="btn-pulse" data-confirm-sell>Sell it back</button>
        <button type="button" class="chip-link" data-cancel>Cancel</button>
      </div>`);
  }
  function confirmBuy() {
    if (!selected) return;
    const p = selected;
    const r = store.buy(p);
    closeModal();
    if (!r.ok) {
      deps.sfx('denied');
      toast(whyNot(r.why, store.needLevel()));
      return;
    }
    deps.sfx('buy');
    toast(`Plot ${p.id} is yours. Pick a building for it.`);
    sync();
  }
  function confirmSell() {
    if (!selected) return;
    const p = selected;
    const r = store.sell(p.id);
    closeModal();
    if (!r.ok) {
      deps.sfx('denied');
      toast(whyNot(r.why));
      return;
    }
    deps.sfx('buy');
    shown.delete(p.id);
    toast(`Plot ${p.id} sold back for ${fmt.format(r.dorras)} Dorras.`);
    sync();
  }
  const closeModal = () => {
    modal.hidden = true;
    panel.querySelector<HTMLElement>('button')?.focus();
  };

  function save(id: string, design: Design | null) {
    const isNew = !store.get(id)?.design;
    const r = design ? store.build(id, design) : store.demolish(id);
    if (!r.ok) {
      deps.sfx('denied');
      toast(whyNot(r.why));
      renderPanel();
      return;
    }
    if (draft && selected?.id === id) draft = null;
    shown.delete(id);
    sync();
    if (design) deps.sfx(r.dorras ? 'buy' : 'upgrade');
    toast(design ? (isNew ? `Built on plot ${id}${r.dorras ? ` for ${fmt.format(r.dorras)} Dorras` : ''}.` : `Plot ${id} updated${r.dorras ? ` for ${fmt.format(r.dorras)} Dorras` : ''}.`) : `Plot ${id} cleared.`);
  }

  /* ---------- Events ---------- */

  // A tap on the dimmed backdrop closes the dialog
  modal.addEventListener('click', (e) => e.target === modal && closeModal());

  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!t || !root.contains(t)) return;
    const d = t.dataset;
    if ('buy' in d && building) openBuy();
    else if ('confirm' in d) confirmBuy();
    else if ('confirmSell' in d) confirmSell();
    else if ('sell' in d) openSell();
    else if ('cancel' in d) closeModal();
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
    else if ('plotClose' in d) select(null);
    else if ('builderExit' in d) setBuild(false);
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
    if (!on) bar.open = false;
    plots.setOverlay(on);
    if (!on) {
      if (draft) cancelDraft();
      select(null);
      plots.setHover(null);
    } else {
      renderBar();
      deps.overview();
    }
    deps.onMode(on);
  }

  store.subscribe(() => sync());
  sync(true);
  toggle.hidden = false;

  return {
    get active() {
      return building;
    },
    select,
    key,
    setBuild,
    /** The save changed elsewhere (the Vault's estate agent, a sale): repaint */
    refresh: () => sync(),
  };
}
