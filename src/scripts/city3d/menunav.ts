/*
 * How you move round a menu (docs/menu-plan.md Phase 1): DOM-free, tested in
 * tests/menunav.test.ts; menukit.ts reads the rectangles off the page and
 * asks these.
 *
 * - `nextFocus()`: the d-pad or the arrow keys from one button to the next
 *   the way pressed: the nearest whose middle lies that way, one in line
 *   with the button you're on (overlapping it across) before one off to the
 *   side, never back the other way. Nothing that way: stay put.
 * - `tabStep()`: LB / RB or Q / E round the tabs, wrapping at the ends.
 * - `swipeCloses()`: a sheet dragged down far enough, or flicked down, closes.
 * - `swipeTab()`: a sideways swipe across a menu's body, clearly more across
 *   than down, steps a tab (left swipe: the next one).
 */

export type Dir = 'up' | 'down' | 'left' | 'right';
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** How much being off to the side counts against a button, against how far along it is */
export const SIDEWAYS = 2.5;

/** The button to go to from `from` moving `dir` (an index into `items`), or `from` when there's none that way */
export function nextFocus(items: Rect[], from: number, dir: Dir): number {
  const a = items[from];
  if (!a) return items.length ? 0 : -1;
  const across = dir === 'left' || dir === 'right';
  const sign = dir === 'right' || dir === 'down' ? 1 : -1;
  let best = from;
  let bestScore = Infinity;
  items.forEach((b, i) => {
    if (i === from) return;
    // How far along the way pressed (its near edge past ours), and how far off to the side its middle is
    const along = across ? (sign > 0 ? b.x - (a.x + a.w) : a.x - (b.x + b.w)) : sign > 0 ? b.y - (a.y + a.h) : a.y - (b.y + b.h);
    // (its middle must be that way, even where the two overlap a little)
    const mid = across ? (b.x + b.w / 2 - (a.x + a.w / 2)) * sign : (b.y + b.h / 2 - (a.y + a.h / 2)) * sign;
    if (mid <= 1) return;
    const lo = across ? Math.max(a.y, b.y) : Math.max(a.x, b.x);
    const hi = across ? Math.min(a.y + a.h, b.y + b.h) : Math.min(a.x + a.w, b.x + b.w);
    // In line (overlapping across): no sideways cost; else the gap between them sideways
    const side = hi > lo ? 0 : lo - hi;
    const score = Math.max(0, along) + side * SIDEWAYS;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

/** The tab `dir` steps from tab `i` of `n`, wrapping round */
export const tabStep = (n: number, i: number, dir: number) => (n ? (((i + Math.sign(dir)) % n) + n) % n : 0);

/** A sheet's drag: closes past a quarter of its height (at most `far`), or flicked down faster than `flick` px/ms */
export const SHEET = { far: 140, flick: 0.6, flickMin: 40 };
export function swipeCloses(dy: number, ms: number, height: number) {
  if (dy >= Math.min(SHEET.far, height * 0.25)) return true;
  return dy >= SHEET.flickMin && dy / Math.max(1, ms) >= SHEET.flick;
}

/** A sideways swipe across a menu's body: -1 (back a tab), 1 (on a tab) or 0 */
export const SWIPE = { min: 60, ratio: 1.6 };
export function swipeTab(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < SWIPE.min || Math.abs(dx) < Math.abs(dy) * SWIPE.ratio) return 0;
  return dx < 0 ? 1 : -1;
}
