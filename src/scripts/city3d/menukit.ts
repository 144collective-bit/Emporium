/*
 * The menus' kit (docs/menu-plan.md Phase 1): what every menu in the arcade
 * design does, on top of `menus.css`. A menu is a `.mk` section with:
 *
 * - tabs (`[data-mk-tabs]`, buttons with `data-tab`) and their pages
 *   (`[data-page]`): click or tap, swipe across the body on a phone
 *   (`[data-mk-swipe]`), Q / E or LB / RB (`tab()`); the lit underline
 *   glides to the tab (`--tab-x`, `--tab-w` on the strip);
 * - moving round it with the arrow keys or the d-pad (`move()`: menunav.ts
 *   `nextFocus()` over the buttons on the page showing), pressing what's
 *   focused with Enter or A (`press()`);
 * - the sheet's grabber (`[data-mk-grab]`): on a phone, drag it down or flick
 *   it to close (menunav.ts `swipeCloses()`);
 * - the hints row (`[data-mk-hints]`): the keys, the gamepad's buttons or
 *   nothing on touch, by what you last used (`input()`, and the menu's own
 *   pointer and key events).
 *
 * Menus keep their own logic; the kit only wires these. Under reduced motion
 * the CSS keeps everything still.
 */
import { nextFocus, swipeCloses, swipeTab, tabStep, type Dir, type Rect } from './menunav';

export type Input = 'keys' | 'pad' | 'touch';

export interface KitOpts {
  /** Close the menu (the grabber's swipe) */
  close(): void;
  /** A tab was shown */
  onTab?(id: string): void;
}

/** Something that scrolls sideways itself (a row of cards): a swipe that starts on it is its own */
const scrollsAcross = (n: HTMLElement) => /auto|scroll/.test(getComputedStyle(n).overflowX) && n.scrollWidth > n.clientWidth + 2;

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex="0"]';

export function menuKit(el: HTMLElement, o: KitOpts) {
  const strip = el.querySelector<HTMLElement>('[data-mk-tabs]');
  const tabBtns = () => Array.from(strip?.querySelectorAll<HTMLButtonElement>('[data-tab]') ?? []);
  const pages = () => Array.from(el.querySelectorAll<HTMLElement>('[data-page]'));
  let current = tabBtns()[0]?.dataset.tab ?? '';

  /** Show a tab and its page; the underline glides to it */
  function showTab(id: string, focus = false) {
    const btns = tabBtns();
    const btn = btns.find((b) => b.dataset.tab === id);
    if (!btn) return;
    current = id;
    for (const b of btns) {
      const on = b === btn;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    }
    for (const p of pages()) p.hidden = p.dataset.page !== id;
    placeUnderline();
    if (focus) btn.focus({ preventScroll: true });
    o.onTab?.(id);
  }
  function placeUnderline() {
    const btn = tabBtns().find((b) => b.dataset.tab === current);
    if (!strip || !btn) return;
    strip.style.setProperty('--tab-x', `${btn.offsetLeft}px`);
    strip.style.setProperty('--tab-w', `${btn.offsetWidth}px`);
  }
  /** On a tab (1) or back one (-1), wrapping, past any this mode leaves out (hidden, or not shown by the CSS) */
  function tab(dir: 1 | -1) {
    const ids = tabBtns()
      .filter((b) => !b.hidden && getComputedStyle(b).display !== 'none')
      .map((b) => b.dataset.tab!);
    if (ids.length < 2) return;
    showTab(ids[tabStep(ids.length, Math.max(0, ids.indexOf(current)), dir)], true);
  }

  /** What can take focus now: the header's and the tabs' buttons, and those on the page showing */
  function focusables() {
    return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((b) => {
      if (b.closest('[hidden]')) return false;
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  }
  /** The d-pad or an arrow key: the next button that way */
  function move(dir: Dir) {
    const items = focusables();
    if (!items.length) return;
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return void items[0].focus();
    const rects: Rect[] = items.map((b) => {
      const r = b.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    });
    const next = items[nextFocus(rects, at, dir)];
    if (next && next !== items[at]) {
      next.focus({ preventScroll: true });
      next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }
  /** Enter or A: press what's focused */
  function press() {
    const a = document.activeElement as HTMLElement | null;
    if (a && el.contains(a)) a.click();
    else focusables()[0]?.focus();
  }
  /** Focus the first thing on the page showing (on opening) */
  function focusFirst(sel?: string) {
    const want = sel ? el.querySelector<HTMLElement>(sel) : null;
    (want ?? focusables().find((b) => !b.closest('[data-mk-tabs], .mk-bar')) ?? focusables()[0])?.focus({ preventScroll: true });
  }

  /** What you last used: the hints row follows it */
  function input(kind: Input) {
    if (el.dataset.input !== kind) el.dataset.input = kind;
  }

  // Tabs: a click or tap
  strip?.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-tab]');
    if (b?.dataset.tab) showTab(b.dataset.tab);
  });
  // Keys: Q / E round the tabs, the arrows round the buttons (the walk's keys never hear them)
  el.addEventListener('keydown', (e) => {
    input('keys');
    if (e.target instanceof HTMLInputElement && e.target.type !== 'range' && e.target.type !== 'checkbox') return;
    const k = e.key;
    if (k === 'q' || k === 'Q') tab(-1);
    else if (k === 'e' || k === 'E') tab(1);
    else if (k === 'ArrowUp') move('up');
    else if (k === 'ArrowDown') move('down');
    else if (k === 'ArrowLeft') move('left');
    else if (k === 'ArrowRight') move('right');
    else return;
    e.preventDefault();
    e.stopPropagation();
  });
  el.addEventListener('pointerdown', (e) => input(e.pointerType === 'mouse' ? 'keys' : 'touch'));

  // The body: a sideways swipe on a phone steps a tab (not from inside something that scrolls sideways itself)
  const body = el.querySelector<HTMLElement>('[data-mk-swipe]');
  let sw: { id: number; x: number; y: number } | null = null;
  body?.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    for (let n = e.target as HTMLElement | null; n && n !== body; n = n.parentElement) if (scrollsAcross(n)) return;
    sw = { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  body?.addEventListener('pointerup', (e) => {
    if (!sw || e.pointerId !== sw.id) return;
    const s = swipeTab(e.clientX - sw.x, e.clientY - sw.y);
    sw = null;
    if (s) tab(s);
  });
  body?.addEventListener('pointercancel', () => (sw = null));

  // The grabber: drag the sheet down, let go far enough or flick it, and it closes
  const grab = el.querySelector<HTMLElement>('[data-mk-grab]');
  let drag: { id: number; y: number; t: number } | null = null;
  grab?.addEventListener('pointerdown', (e) => {
    drag = { id: e.pointerId, y: e.clientY, t: performance.now() };
    grab.setPointerCapture(e.pointerId);
    el.classList.add('is-dragging');
  });
  grab?.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    el.style.setProperty('--drag', `${Math.max(0, e.clientY - drag.y)}px`);
  });
  const letGo = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const shut = swipeCloses(e.clientY - drag.y, performance.now() - drag.t, el.offsetHeight);
    drag = null;
    el.classList.remove('is-dragging');
    el.style.removeProperty('--drag');
    if (shut) o.close();
  };
  grab?.addEventListener('pointerup', letGo);
  grab?.addEventListener('pointercancel', letGo);

  addEventListener('resize', placeUnderline);
  showTab(current);

  return {
    /** The tab showing */
    get tab() {
      return current;
    },
    showTab,
    /** LB / RB, Q / E: on or back a tab */
    step: tab,
    move,
    press,
    focusFirst,
    input,
    /** After the menu is shown (its sizes are known): the underline to its tab, and the hints for a touch screen until something else is used */
    shown() {
      if (matchMedia('(hover: none) and (pointer: coarse)').matches && el.dataset.input !== 'pad') input('touch');
      requestAnimationFrame(placeUnderline);
    },
  };
}

export type MenuKit = ReturnType<typeof menuKit>;
