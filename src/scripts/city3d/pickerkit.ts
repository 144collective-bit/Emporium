/*
 * One `‹ value ›` picker's wiring (docs/settings-plan.md, docs/header-plan.md): the Settings tab's rows
 * (settings-ui.ts), the Map tab's district and Profile's rifle finish (hubtabs-ui.ts). A picker is a `[data-pick]`
 * holding ◀ (`[data-pick-step="-1"]`), its value (`[data-pick-val]`, with `[data-pick-text]` and, for a range,
 * `[data-pick-bar]`) and ▶:
 *
 * - the arrow keys and the d-pad step it: the menus' kit sends a focused value `mk-step` (menukit.ts `move()`);
 * - a press on a choice's value steps it on, round to the first;
 * - ◀ ▶ step it under a finger or the mouse, and held, keep stepping (the screen reader's click too);
 * - a range's bar takes a tap or a drag (`at(share)`, 0 at its left to 1 at its right).
 */

/** A ◀ ▶ held: how long before it repeats, then how often (ms) */
const REPEAT_FIRST = 380;
const REPEAT_EVERY = 90;

export interface PickerHooks {
  /** Step it left (-1) or right (1); `wrap`, round past the end (a press on the value) */
  step(dir: 1 | -1, wrap: boolean): void;
  /** A range's bar was tapped or dragged to a share of its width */
  at?(share: number): void;
  /** A choice (a press on its value steps it), not a range */
  choice(): boolean;
}

export function bindPicker(p: HTMLElement, h: PickerHooks) {
  const val = p.querySelector<HTMLButtonElement>('[data-pick-val]')!;
  const bar = p.querySelector<HTMLElement>('[data-pick-bar]');
  val.addEventListener('mk-step', (e) => h.step((e as CustomEvent<1 | -1>).detail, false));
  val.addEventListener('click', () => {
    if (h.choice()) h.step(1, true);
  });
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
      h.step(dir, false);
      const again = (wait: number) => (timer = window.setTimeout(() => (h.step(dir, false), again(REPEAT_EVERY)), wait));
      again(REPEAT_FIRST);
      arr.setPointerCapture?.(e.pointerId);
    });
    arr.addEventListener('pointerup', stop);
    arr.addEventListener('pointercancel', stop);
    arr.addEventListener('lostpointercapture', stop);
    // (a click with no pointer: a screen reader's)
    arr.addEventListener('click', (e) => {
      if (e.detail === 0) h.step(dir, false);
    });
  }
  if (bar && h.at) {
    const at = (e: PointerEvent) => {
      const b = bar.getBoundingClientRect();
      h.at!((e.clientX - b.left) / b.width);
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

/** Paint a choice's value: its text, where it stands among `count`, and its ends' ◀ ▶ dimmed */
export function paintChoice(p: HTMLElement, text: string, index: number, count: number) {
  const val = p.querySelector<HTMLElement>('[data-pick-val]')!;
  const t = p.querySelector<HTMLElement>('[data-pick-text]')!;
  if (t.textContent !== text) t.textContent = text;
  val.setAttribute('aria-valuetext', text);
  val.setAttribute('aria-valuemin', '0');
  val.setAttribute('aria-valuemax', String(count - 1));
  val.setAttribute('aria-valuenow', String(Math.max(0, index)));
  p.dataset.end = index <= 0 ? 'min' : index >= count - 1 ? 'max' : '';
}
