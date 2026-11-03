/*
 * The touch controls on the page (docs/controls-plan.md Phases 1 and 2): puts touchlayout.ts's places for the
 * screen and the mode (on foot with empty hands or a gun out, at the wheel, in a kart race, in the ring) onto
 * the buttons, the stick, the hotbar and the door prompt as CSS variables (`--tc-x`, `--tc-y`, `--tc-d` and
 * `data-tc` for the side; `--hb-*`; `--pr-*`), which controls.css reads. Run again when the screen turns or
 * resizes, or the mode changes (the root's classes). Touch screens only.
 */
import { layoutFor, type Action, type Mode, type Spot } from './touchlayout';

/** Each action's button (fists borrow the fight's Punch, Block and Kick) */
const BUTTONS: Record<Action, string> = {
  jump: '[data-walk-jump]',
  sprint: '[data-walk-run]',
  crouch: '[data-walk-crouch]',
  punch: '[data-fight-punch]',
  block: '[data-fight-block]',
  kick: '[data-fight-kick]',
  fire: '[data-walk-fire]',
  aim: '[data-walk-aim]',
  reload: '[data-walk-reload]',
  swap: '[data-walk-swap]',
  gas: '[data-drive-gas]',
  brake: '[data-drive-brake]',
  horn: '[data-drive-horn]',
  view: '[data-drive-view]',
  drift: '[data-kart-drift]',
  dodge: '[data-fight-dodge]',
};

/** Which mode the page is in, by the root's classes (fight.ts, kart.ts, drive.ts / fly.ts / boat.ts, combat.ts) */
function modeOf(root: HTMLElement): Mode {
  const c = root.classList;
  if (c.contains('is-fighting')) return 'ring';
  if (c.contains('is-karting')) return 'kart';
  if (c.contains('is-driving')) return 'drive';
  return c.contains('is-armed') ? 'armed' : 'fists';
}

function put(el: HTMLElement | null, s: Spot) {
  if (!el) return;
  el.dataset.tc = s.side;
  el.style.setProperty('--tc-x', `${s.x}px`);
  el.style.setProperty('--tc-y', `${s.y}px`);
  el.style.setProperty('--tc-d', `${s.d}px`);
}

export function layoutControls(root: HTMLElement) {
  if (!matchMedia('(pointer: coarse)').matches) return;
  const q = (s: string) => root.querySelector<HTMLElement>(s);
  // The safe areas, read off a probe padded by them (the CSS adds them back)
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;inset:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  root.append(probe);
  let last = '';
  const apply = () => {
    const cs = getComputedStyle(probe);
    const w = root.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = root.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (w <= 0 || h <= 0) return;
    const mode = modeOf(root);
    const key = `${Math.round(w)}x${Math.round(h)}:${mode}`;
    if (key === last) return;
    last = key;
    const L = layoutFor(w, h, mode);
    for (const [action, s] of Object.entries(L.buttons) as [Action, Spot][]) put(q(BUTTONS[action]), s);
    put(q('[data-walk-stick]'), L.stick);
    const bar = q('[data-hotbar]');
    if (bar) {
      bar.style.setProperty('--hb-right', `${L.hotbar.right}px`);
      bar.style.setProperty('--hb-bottom', `${L.hotbar.bottom}px`);
      bar.style.setProperty('--hb-slot', `${L.hotbar.slot}px`);
    }
    const prompt = q('[data-walk-prompt]');
    prompt?.style.setProperty('--pr-cx', `${L.prompt.cx}px`);
    prompt?.style.setProperty('--pr-bottom', `${L.prompt.bottom}px`);
    root.dataset.tcShape = L.shape;
    root.dataset.tcMode = mode;
  };
  apply();
  addEventListener('resize', apply);
  new ResizeObserver(apply).observe(root);
  // (a gun drawn or put away: combat.ts toggles is-armed on the root)
  new MutationObserver(apply).observe(root, { attributes: true, attributeFilter: ['class'] });
}
