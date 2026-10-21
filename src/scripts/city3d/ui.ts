/*
 * Small helpers shared by the city's game screens (the business card, the
 * shops, the mission board, the kart hut's menu): escaping, number formats, the
 * Dorras coin, the race clock, and `repaint()`, which patches markup in place
 * so a button under a finger never changes while a view ticks.
 */
import type { Sfx } from './combat';
import type { TycoonSave } from './tycoon';

/**
 * What a game screen (the garage, the Armoury, Drop 001, the kart hut's menu,
 * the mission board) needs from the economy: the save to read and change with
 * the rules in tycoon.ts / missions.ts, `commit()` once it has
 * (saves, repaints every screen, checks badges and level-ups), a toast and
 * the sound switch.
 */
export interface GameDeps {
  save(): TycoonSave;
  commit(): void;
  toast(text: string, ms?: number): void;
  sfx(kind: Sfx, gain?: number): void;
}

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export const fmt = new Intl.NumberFormat('en-US');
export const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
/** The Dorras mark: a little coin */
export const COIN =
  '<svg class="dorra" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor" opacity=".18"/><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 7h3.5a5 5 0 0 1 0 10H9zM7 12h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
/** An amount of Dorras with the coin */
export const D = (n: number) => `${COIN}<b>${fmt.format(Math.floor(n))}</b>`;
/** "Lv 7" tag */
export const LV = (n: number) => `<span class="lv-tag">Lv ${n}</span>`;
/** A lap or run time as m:ss.hh (the kart park's clocks, records and boards) */
export function clockOf(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
}

/** Make `to` match `from` in place: same elements kept, only what differs is changed */
export function morph(to: Node, from: Node) {
  if (to.nodeType === Node.TEXT_NODE) {
    if (to.nodeValue !== from.nodeValue) to.nodeValue = from.nodeValue;
    return;
  }
  if (to instanceof Element && from instanceof Element) {
    // (an opened <details> stays open)
    for (const a of [...to.attributes]) if (!from.hasAttribute(a.name) && !(a.name === 'open' && to.tagName === 'DETAILS')) to.removeAttribute(a.name);
    for (const a of [...from.attributes]) if (to.getAttribute(a.name) !== a.value) to.setAttribute(a.name, a.value);
  }
  morphChildren(to, from);
}
export function morphChildren(to: Node, from: Node) {
  const a = [...to.childNodes];
  const b = [...from.childNodes];
  b.forEach((n, i) => {
    const o = a[i];
    if (o && o.nodeType === n.nodeType && o.nodeName === n.nodeName) morph(o, n);
    else if (o) to.replaceChild(n, o);
    else to.appendChild(n);
  });
  for (let i = b.length; i < a.length; i++) a[i].remove();
}
/**
 * Bring a view up to date. Views tick every second, so the markup is patched
 * in place rather than replaced: a button under a finger, the mouse or the
 * keyboard's focus stays the same button.
 */
export function repaint(el: HTMLElement, html: string) {
  if (el.dataset.html === html) return;
  el.dataset.html = html;
  const t = document.createElement('template');
  t.innerHTML = html;
  const tmp = document.createElement('div');
  tmp.append(t.content);
  morphChildren(el, tmp);
}
/** Why a purchase or upgrade didn't go through, in words */
export function whyNot(why: 'money' | 'level' | 'owned' | 'max' | 'place' | 'stock' | 'progress', need?: number) {
  switch (why) {
    case 'money':
      return 'Not enough Dorras.';
    case 'level':
      return need ? `Needs level ${need}.` : 'Your level is too low.';
    case 'owned':
      return 'Already yours.';
    case 'max':
      return 'Already at the top level.';
    case 'stock':
      return 'Empty it first.';
    case 'progress':
      return 'Not done yet.';
    default:
      return "That can't be done here.";
  }
}
