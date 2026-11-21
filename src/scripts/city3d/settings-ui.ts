/*
 * The hub's Settings tab (docs/settings-plan.md), its own chunk, loaded the first time the tab shows (hub.ts). The
 * rows are the page's (CityMap.astro, made from settings.ts `ROWS`); this paints them from the one record
 * (settings-store.ts) and works them:
 *
 * - the sub-tabs (`[data-set-tab]`): a click, the keyboard on the strip (a tab is picked as it's reached), LT / RT
 *   on a gamepad (hub.ts sends `mk-subtab`);
 * - every row a `‹ value ›` picker (`[data-pick]`): left and right step it (the arrow keys and the d-pad through the
 *   kit's `mk-step`, the ◀ ▶ under a finger or the mouse), held they keep stepping; a press on the value steps a
 *   choice on, round to the first; a range's bar takes a tap or a drag;
 * - a dot beside a row (and its sub-tab) away from its default; each sub-tab's Reset, and Reset all (asks first);
 * - Quality's reload: Reload now, or Later (the next visit);
 * - the keys a mode at a time (`[data-km]`), for the input in use.
 */
import { confirm } from './menukit';
import { actions, boot, onActed, onSettings, setSettings, settings } from './settings-store';
import { changed, label, patchFor, resetPatch, row as rowOf, share, stepValue, tabChanged, TABS, valueAt, valueOf, type Row, type TabId, type Value } from './settings-rows';
import type { HoldInput } from './comfort';

/** A ◀ ▶ held: how long before it repeats, then how often (ms) */
const REPEAT_FIRST = 380;
const REPEAT_EVERY = 90;

export function createSettingsUI(root: HTMLElement, hub: HTMLElement) {
  const box = hub.querySelector<HTMLElement>('[data-settings]')!;
  const tabBtns = [...box.querySelectorAll<HTMLButtonElement>('[data-set-tab]')];
  const pages = [...box.querySelectorAll<HTMLElement>('[data-set-page]')];
  const pickers = [...box.querySelectorAll<HTMLElement>('[data-pick]')];
  const kms = [...box.querySelectorAll<HTMLElement>('[data-km]')];
  const reload = box.querySelector<HTMLElement>('[data-set-reload]');
  let current: TabId = (tabBtns.find((b) => b.getAttribute('aria-selected') === 'true')?.dataset.setTab as TabId) ?? 'game';
  /** The keys' mode showing (null: as the mode you're in) */
  let km: string | null = null;
  /** Quality's reload put off for this value (Later) */
  let later: string | null = null;

  /** The input in use, as the hub has it */
  const input = (): HoldInput => (hub.dataset.input === 'pad' ? 'pad' : hub.dataset.input === 'touch' ? 'touch' : 'keys');
  const shows = (n: HTMLElement) => !n.hidden && getComputedStyle(n).display !== 'none';

  /* ---------- The sub-tabs ---------- */
  function pick(id: TabId, focus = false) {
    current = id;
    for (const b of tabBtns) {
      const on = b.dataset.setTab === id;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus({ preventScroll: true });
    }
    for (const p of pages) p.hidden = p.dataset.setPage !== id;
    paint();
  }
  for (const b of tabBtns) {
    b.addEventListener('click', () => pick(b.dataset.setTab as TabId));
    // (the arrows along the strip pick as they go)
    b.addEventListener('focus', () => b.dataset.setTab !== current && pick(b.dataset.setTab as TabId));
  }
  hub.addEventListener('mk-subtab', (e) => {
    const page = hub.querySelector<HTMLElement>('[data-page="settings"]');
    if (!page || page.hidden) return;
    const ids = tabBtns.filter(shows).map((b) => b.dataset.setTab as TabId);
    if (ids.length < 2) return;
    const dir = (e as CustomEvent<number>).detail;
    pick(ids[(ids.indexOf(current) + dir + ids.length) % ids.length], true);
  });

  /* ---------- The rows ---------- */
  /** The keys' modes this input has (City view's free camera is the keys' and the mouse's) */
  const kmIds = () => kms.filter((k) => k.dataset.km !== 'city' || input() === 'keys').map((k) => k.dataset.km!);
  const kmRow: Row = {
    id: 'km',
    tab: 'controls',
    label: 'Mode',
    get opts() {
      return kmIds().map((v) => ({ v, label: kms.find((k) => k.dataset.km === v)!.dataset.kmName! }));
    },
  };
  const rowFor = (id: string) => (id === 'km' ? kmRow : rowOf(id));
  const kmNow = () => {
    const ids = kmIds();
    const want = km ?? (root.dataset.mode === 'walk' || input() !== 'keys' ? 'foot' : 'city');
    return ids.includes(want) ? want : ids[0];
  };

  function get(id: string): Value {
    if (id === 'km') return kmNow();
    if (id === 'sound') return actions.sound ? actions.sound.on() : !!actions.soundWanted;
    if (id === 'fp') return !!actions.fp?.on();
    return valueOf(settings(), id, input());
  }
  function set(id: string, v: Value) {
    if (v === get(id)) return;
    if (id === 'km') {
      km = String(v);
      return paint();
    }
    if (id === 'sound') {
      // (before the city is up, it's turned on when the sound is made)
      if (actions.sound) void Promise.resolve(actions.sound.set(!!v)).then(paint);
      else actions.soundWanted = !!v;
      return paint();
    }
    if (id === 'fp') {
      actions.fp?.set(!!v);
      return paint();
    }
    setSettings(patchFor(settings(), id, v));
  }
  const step = (id: string, dir: 1 | -1, wrap = false) => {
    const r = rowFor(id);
    if (r) set(id, stepValue(r, get(id), dir, wrap));
  };

  for (const p of pickers) {
    const id = p.dataset.pick!;
    const val = p.querySelector<HTMLButtonElement>('[data-pick-val]')!;
    const bar = p.querySelector<HTMLElement>('[data-pick-bar]');
    // The arrow keys and the d-pad (menukit.ts `move()`)
    val.addEventListener('mk-step', (e) => step(id, (e as CustomEvent<1 | -1>).detail));
    // A press on the value: a choice steps on, round to the first (a range's bar is its own, below)
    val.addEventListener('click', () => {
      if (rowFor(id)?.opts) step(id, 1, true);
    });
    // ◀ ▶: a step, and held, more
    for (const arr of p.querySelectorAll<HTMLElement>('[data-pick-step]')) {
      const dir = Number(arr.dataset.pickStep) as 1 | -1;
      let timer = 0;
      const stop = () => {
        clearTimeout(timer);
        timer = 0;
      };
      arr.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        val.focus({ preventScroll: true });
        step(id, dir);
        const again = (wait: number) => (timer = window.setTimeout(() => (step(id, dir), again(REPEAT_EVERY)), wait));
        again(REPEAT_FIRST);
        arr.setPointerCapture?.(e.pointerId);
      });
      arr.addEventListener('pointerup', stop);
      arr.addEventListener('pointercancel', stop);
      arr.addEventListener('lostpointercapture', stop);
      // (a click with no pointer: a screen reader's)
      arr.addEventListener('click', (e) => {
        if (e.detail === 0) step(id, dir);
      });
    }
    // A range's bar: tapped or dragged to a value
    if (bar) {
      const r = rowFor(id)!;
      const at = (e: PointerEvent) => {
        const b = bar.getBoundingClientRect();
        set(id, valueAt(r, (e.clientX - b.left) / b.width));
      };
      bar.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        val.focus({ preventScroll: true });
        bar.setPointerCapture?.(e.pointerId);
        at(e);
        const move = (m: PointerEvent) => at(m);
        const up = () => {
          bar.removeEventListener('pointermove', move);
          bar.removeEventListener('pointerup', up);
          bar.removeEventListener('pointercancel', up);
        };
        bar.addEventListener('pointermove', move);
        bar.addEventListener('pointerup', up);
        bar.addEventListener('pointercancel', up);
      });
    }
  }

  /* ---------- Resets and the reload ---------- */
  for (const b of box.querySelectorAll<HTMLButtonElement>('[data-set-reset]'))
    b.addEventListener('click', () => {
      if (b.getAttribute('aria-disabled') === 'true') return;
      setSettings(resetPatch(b.dataset.setReset as TabId));
    });
  const all = box.querySelector<HTMLButtonElement>('[data-set-reset-all]');
  all?.addEventListener('click', () => {
    if (all.getAttribute('aria-disabled') === 'true') return;
    confirm(all, { text: 'Reset every setting? Your game is kept.', yes: 'Reset', no: 'Keep', onYes: () => setSettings(resetPatch()) });
  });
  box.querySelector('[data-set-reload-now]')?.addEventListener('click', () => location.reload());
  box.querySelector('[data-set-reload-later]')?.addEventListener('click', () => {
    later = settings().quality;
    paint();
    box.querySelector<HTMLElement>('[data-pick="quality"] [data-pick-val]')?.focus({ preventScroll: true });
  });

  /* ---------- Painting ---------- */
  function paint() {
    const s = settings();
    const inp = input();
    for (const p of pickers) {
      const id = p.dataset.pick!;
      const r = rowFor(id);
      if (!r) continue;
      const v = get(id);
      const val = p.querySelector<HTMLElement>('[data-pick-val]')!;
      const text = label(r, v);
      p.querySelector('[data-pick-text]')!.textContent = text;
      val.setAttribute('aria-valuetext', text);
      if (r.opts) {
        const i = r.opts.findIndex((o) => o.v === v);
        val.setAttribute('aria-valuemin', '0');
        val.setAttribute('aria-valuemax', String(r.opts.length - 1));
        val.setAttribute('aria-valuenow', String(Math.max(0, i)));
        p.dataset.end = i <= 0 ? 'min' : i >= r.opts.length - 1 ? 'max' : '';
      } else {
        const n = v as number;
        val.setAttribute('aria-valuemin', String(r.min));
        val.setAttribute('aria-valuemax', String(r.max));
        val.setAttribute('aria-valuenow', String(n));
        p.style.setProperty('--p', String(share(r, n)));
        p.dataset.end = n <= r.min! ? 'min' : n >= r.max! ? 'max' : '';
      }
      const rowEl = p.closest<HTMLElement>('[data-set-row]');
      if (rowEl) rowEl.dataset.changed = String(!r.act && id !== 'km' && changed(s, id, inp));
    }
    for (const b of tabBtns) b.dataset.changed = String(tabChanged(s, b.dataset.setTab as TabId, inp));
    for (const b of box.querySelectorAll<HTMLElement>('[data-set-reset]')) b.setAttribute('aria-disabled', String(!tabChanged(s, b.dataset.setReset as TabId, inp)));
    all?.setAttribute('aria-disabled', String(!TABS.some((t) => tabChanged(s, t.id, inp))));
    // The keys: the mode picked
    const shown = kmNow();
    for (const k of kms) k.hidden = k.dataset.km !== shown;
    // Quality: a reload to apply, unless put off for this value
    if (reload) {
      const q = settings().quality;
      reload.hidden = boot.quality === undefined || q === boot.quality || q === later;
    }
  }

  onSettings(paint);
  onActed(paint);
  // (the input in use changes the keys and what hold or toggle does unpicked)
  new MutationObserver(paint).observe(hub, { attributes: true, attributeFilter: ['data-input', 'data-walking'] });
  pick(current);
  return {
    paint,
    /** The tab showing again: the keys start from the mode you're in */
    shown() {
      km = null;
      paint();
    },
  };
}
