/**
 * The control card (docs/views-plan.md Phase 4, the owner's call): a mode's jobs and their keys, gamepad buttons or
 * touch buttons for the input in use, from keymap.ts. walk.ts shows it the first time you're in each mode and on
 * request (/ or ?, the d-pad's down, the hub's Settings > Keys), and fetches this chunk the first time it does, so
 * the boot never carries the key table. Fixed copy only.
 */
import { cardBinds, KEYMAP, type ModeId } from './keymap';

export type CardInput = 'keys' | 'pad' | 'touch';

/** How to bring it back, on the input in use */
const AGAIN: Record<CardInput, string> = {
  keys: '/ shows this again · Esc or × closes',
  pad: 'D-pad ↓ shows this again or closes it',
  touch: '☰ › Settings › Keys shows it again · × closes',
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Fill the card (`[data-ctrlcard]`) for `mode` on `input` */
export function paint(el: HTMLElement, mode: ModeId, input: CardInput) {
  const title = el.querySelector<HTMLElement>('[data-ctrlcard-title]');
  const list = el.querySelector<HTMLElement>('[data-ctrlcard-list]');
  const foot = el.querySelector<HTMLElement>('[data-ctrlcard-foot]');
  if (title) title.textContent = KEYMAP[mode].name;
  if (foot) foot.textContent = AGAIN[input];
  if (!list) return;
  list.innerHTML = cardBinds(mode)
    .map((b) => {
      const on = input === 'touch' ? (b.touch ? [b.touch] : []) : input === 'pad' ? b.pad : b.keys;
      if (!on.length) return '';
      const keys = input === 'touch' ? `<span>${esc(on[0])}</span>` : on.map((k) => `<kbd>${esc(k)}</kbd>`).join('');
      return `<dt>${keys}</dt><dd>${esc(b.label)}</dd>`;
    })
    .join('');
}
