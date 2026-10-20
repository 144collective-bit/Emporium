/*
 * The kart park's screens (kart-sim.ts holds the rules, kartpark.ts the
 * courses, kart.ts the race on screen): the hut's menu, the countdown, the
 * race HUD, the pops and the results card. Implements `KartUI` from
 * kart-types.ts; walk.ts and index.ts wire it to the park and the race.
 *
 * - The hut menu (`data-karts`, built on the gun store's `.shop` panel) has
 *   three tabs. Race: a row per cup (its level, blurb and what the first
 *   three places pay) with a button per course, then the time trial (both
 *   courses, free, your best time each). Karts: cards for the four karts
 *   (the Pocket Rocket is yours, the others cost Dorras at a level), the
 *   picked one's stat bars with the mods' bonus on top, Buy with an inline
 *   confirm, the three mods with their pips and Upgrade buttons, and the
 *   paints. Picking a kart or a paint goes through pickKart() and commit();
 *   hovering or picking a card previews it in the pits (d.preview).
 *   Records: your time-trial bests and the counters the save keeps.
 * - The HUD (`data-kart-hud`): the place and "of 8" top left over the drift
 *   meter (three segments by tier) and the Boost / Shield tags, the lap and
 *   the clock top centre, the item slot top right (the icons spin while the
 *   roulette runs; "?" under reduced motion) with Quit under it. The touch
 *   Drift and Item buttons sit above the pedals; walk.ts wires them.
 * - `count()` shows the big digits, `pop()` a short line over the HUD,
 *   `showResult()` the card: place, time, best lap, prize, XP, a level-up
 *   and the standings.
 *
 * Arrow keys or the D-pad move between the buttons (step), Enter / A takes
 * the one picked, Esc / B / E closes (walk.ts calls close()). Prizes and
 * prices are Dorras only: never real money, nothing to do with the token.
 */
import { CUPS, CUP_IDS, ITEMS, ITEM_IDS, LAPS, type CupId, type ItemId } from './kart-sim';
import { COURSES, COURSE_IDS, type CourseId } from './kartpark';
import { KART_SPECS, PLAYER_KARTS, type KartId } from './mykart';
import { KART_CATALOG, KART_MODS, KART_MOD_IDS, MOD_LEVELS, type KartModId } from './catalog';
import { buyKart, kartModCost, kartMods, kartStatsOf, level, modKart, ownsKart, pickKart, type TycoonSave } from './tycoon';
import { CAR_PAINTS, paintHex, type PaintId } from './mycar';
import { clockOf } from './races';
import { D, LV, esc, fmt, repaint, whyNot } from './ui';
import type { KartHud, KartResultView, KartUI, KartUIDeps } from './kart-types';

/** How many karts race a cup (you and seven rivals) */
const FIELD = 8;
/** How long a pop stays (ms) and how many at once */
const POP_MS = 1400;
const POPS_MAX = 3;

/* ---------- Icons: the six items (24 x 24, stroked in currentColor) ---------- */

const I = (body: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
export const ITEM_ICONS: Record<ItemId, string> = {
  rocket: I('<path d="M14.5 3.5c2.5-.5 5 0 6 1 1 1 1.5 3.5 1 6l-5 5-4.5-4.5zM12 11l-3 1-4 4 2 .5.5 2 4-4 1-3M8.5 15.5L5 19"/><circle cx="16" cy="8" r="1.4" fill="currentColor" stroke="none"/><path d="M4 12.5l1.5-1.5M11.5 20l1.5-1.5"/>'),
  oil: I('<path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z"/><path d="M9.5 15.5a2.5 2.5 0 0 0 2 2"/>'),
  gummy: I('<circle cx="8" cy="7" r="2"/><circle cx="16" cy="7" r="2"/><path d="M9 8.5a4 4 0 0 1 6 0c1 1.5 1 3 1 3.5 1.5 0 3 1 3 2.5s-1.5 2.5-3 2.5c0 1.5-.5 3-1.5 3.5h-5c-1-.5-1.5-2-1.5-3.5-1.5 0-3-1-3-2.5s1.5-2.5 3-2.5c0-.5 0-2 1-3.5z"/><path d="M10.5 11h.01M13.5 11h.01"/>'),
  pigeon: I('<path d="M3 13c3 0 5-1 7-3l2-2c2-1.5 4-2 6-1l3 1-3 1.5c0 3-2 5.5-5 6.5l-1 3-1-2.5c-3 .5-6-.5-8-3.5z"/><circle cx="16.5" cy="8.5" r=".7" fill="currentColor" stroke="none"/><path d="M9 11.5c1 1 1.5 2.5 1.5 4"/>'),
  shield: I('<path d="M12 3l7 2.5v6c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5v-6z"/><path d="M9 12l2 2 4-4"/>'),
  trail: I('<path d="M3 15c3-5 5 5 8 0s5-5 8 0 2 0 2 0" stroke-width="2.2"/><path d="M3 19c3-3 5 3 8 0s5-3 8 0" opacity=".45"/>'),
};

/* ---------- Icons: the karts, side on (64 x 32, the body in currentColor) ---------- */

const K = (body: string, wheels: string) => `<svg viewBox="0 0 64 32" aria-hidden="true"><g class="kart-ink">${body}</g>${wheels}</svg>`;
const wheel = (cx: number, r: number) => `<circle class="kart-wheel" cx="${cx}" cy="${26 - r + 2}" r="${r}"/><circle class="kart-rim" cx="${cx}" cy="${26 - r + 2}" r="${(r * 0.45).toFixed(1)}"/>`;
const driver = (x: number, y: number) => `<circle class="kart-helmet" cx="${x}" cy="${y}" r="4"/><path class="kart-visor" d="M${x - 3} ${y - 0.5}h5"/>`;
const KART_ICONS: Record<KartId, string> = {
  rocket: K(`<path class="kart-body" d="M6 22h4l3-7h22l5 7h18l2-3-4-5H40l-3-6H14l-4 6H8z"/><path class="kart-hoop" d="M30 15v-6h3"/>${driver(27, 9)}`, wheel(14, 6) + wheel(50, 6)),
  bigwheel: K(`<path class="kart-body" d="M4 20h5l4-7h22l6 7h17l2-3-5-6H42l-3-5H16l-5 6H6z"/><path class="kart-hoop" d="M31 13v-7h3"/>${driver(28, 7)}<path class="kart-pipe" d="M44 15h8"/>`, wheel(14, 8) + wheel(50, 8)),
  zip: K(`<path class="kart-body" d="M10 24h3l2-6h20l4 6h17l1-2-4-4H40l-2-5H16l-3 5h-2z"/><path class="kart-hoop" d="M28 18v-5h3"/>${driver(25, 12)}`, wheel(16, 4.5) + wheel(48, 4.5)),
  tank: K(`<path class="kart-body" d="M5 22h6l1-5h4v-6h20v6h5l4 5h14l2-3-3-4H44l-2-6H16l-4 6H7z"/><path class="kart-plate" d="M17 12h19M18 15h18"/><circle class="kart-rivet" cx="20" cy="18" r=".8"/><circle class="kart-rivet" cx="34" cy="18" r=".8"/><path class="kart-hoop" d="M31 11v-5h3"/>${driver(26, 7)}`, wheel(14, 6.5) + wheel(50, 6.5)),
};

const ord = (n: number) => (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
const fill = (n: number) => Math.max(0, Math.min(1, n)).toFixed(3);

/** The four stat bars and the mod that raises each */
const STATS: { key: 'speed' | 'accel' | 'handling' | 'weight'; label: string; mod: KartModId | null }[] = [
  { key: 'speed', label: 'Top speed', mod: 'motor' },
  { key: 'accel', label: 'Pick-up', mod: 'motor' },
  { key: 'handling', label: 'Handling', mod: 'tyres' },
  { key: 'weight', label: 'Weight', mod: null },
];

/** Your records at the park, for the Records tab and the City-view panel (index.ts) */
export function kartRecordsHtml(s: TycoonSave) {
  const c = s.counters;
  const owned = PLAYER_KARTS.filter((id) => ownsKart(s, id)).length;
  const best = (id: CourseId) => {
    const t = s.karts.records[id];
    return t === undefined ? '<span class="race-none">No time yet</span>' : clockOf(t);
  };
  return `<dl class="race-meta kart-records">
${COURSE_IDS.map((id) => `  <div class="kart-record-time"><dt>${esc(COURSES[id].name)}</dt><dd>${best(id)}</dd></div>`).join('\n')}
  <div><dt>Kart races</dt><dd>${fmt.format(c.kartRaces)}</dd></div>
  <div><dt>Podiums</dt><dd>${fmt.format(c.podiums)}</dd></div>
  <div><dt>Wins</dt><dd>${fmt.format(c.kartWins)}</dd></div>
  <div><dt>Item hits</dt><dd>${fmt.format(c.kartHits)}</dd></div>
  <div><dt>Karts</dt><dd>${owned} of ${PLAYER_KARTS.length}</dd></div>
</dl>`;
}

type Tab = 'race' | 'karts' | 'records';
const TABS: { id: Tab; name: string }[] = [
  { id: 'race', name: 'Race' },
  { id: 'karts', name: 'Karts' },
  { id: 'records', name: 'Records' },
];

export function createKartUI(root: HTMLElement, d: KartUIDeps): KartUI {
  const el = root.querySelector<HTMLElement>('[data-karts]')!;
  const tabsEl = el.querySelector<HTMLElement>('[data-karts-tabs]')!;
  const body = el.querySelector<HTMLElement>('[data-karts-body]')!;
  const dorrasEl = el.querySelector<HTMLElement>('[data-karts-dorras]')!;
  const lvEl = el.querySelector<HTMLElement>('[data-karts-level]')!;
  const countEl = root.querySelector<HTMLElement>('[data-kart-count]')!;
  const hud = root.querySelector<HTMLElement>('[data-kart-hud]')!;
  const placeEl = hud.querySelector<HTMLElement>('[data-kart-place]')!;
  const ordEl = hud.querySelector<HTMLElement>('[data-kart-ord]')!;
  const ofEl = hud.querySelector<HTMLElement>('[data-kart-of]')!;
  const lapEl = hud.querySelector<HTMLElement>('[data-kart-lap]')!;
  const clockEl = hud.querySelector<HTMLElement>('[data-kart-clock]')!;
  const slot = hud.querySelector<HTMLElement>('[data-kart-slot]')!;
  const slotIcon = slot.querySelector<HTMLElement>('[data-kart-slot-icon]')!;
  const slotStrip = slot.querySelector<HTMLElement>('[data-kart-slot-strip]')!;
  const slotName = slot.querySelector<HTMLElement>('[data-kart-slot-name]')!;
  const meter = hud.querySelector<HTMLElement>('[data-kart-meter]')!;
  const boostEl = hud.querySelector<HTMLElement>('[data-kart-boost]')!;
  const shieldEl = hud.querySelector<HTMLElement>('[data-kart-shield]')!;
  const pops = root.querySelector<HTMLElement>('[data-kart-pops]')!;
  const itemBtnIcon = root.querySelector<HTMLElement>('[data-kart-item-icon]');
  const result = root.querySelector<HTMLElement>('[data-kart-result]')!;
  const resultTitle = result.querySelector<HTMLElement>('[data-kart-result-title]')!;
  const resultBody = result.querySelector<HTMLElement>('[data-kart-result-body]')!;

  // The roulette strip: every item's icon, cycled by CSS while it spins
  slotStrip.innerHTML = ITEM_IDS.map((id) => `<i>${ITEM_ICONS[id]}</i>`).join('');

  let menuOpen = false;
  let resultOpen = false;
  let tab: Tab = 'race';
  /** The kart whose details show (not always the pick: a kart on sale can be looked at) */
  let sel: KartId = 'rocket';
  /** Buy was pressed: Confirm / Cancel are showing */
  let asking = false;
  let sinceRepaint = 0;
  let goTimer = 0;
  let slotKey = '';

  /* ---------- The menu ---------- */

  const kartOf = (s: TycoonSave) => ({ model: s.karts.model, paint: s.karts.paint });
  const paintName = (id: PaintId) => CAR_PAINTS.find((p) => p.id === id)?.name ?? '';
  /** Show a kart in the pits, once per change (kart.ts builds a kart for each call) */
  let shown = '';
  function preview(model: KartId, paint: PaintId) {
    const key = `${model}/${paint}`;
    if (key === shown) return;
    shown = key;
    d.preview({ model, paint });
  }

  function raceTab(s: TycoonSave) {
    const lv = level(s);
    const mine = kartOf(s);
    const courses = (cup: CupId | 'time', locked: boolean, need: number) =>
      COURSE_IDS.map((id) => {
        const best = cup === 'time' ? s.karts.records[id] : undefined;
        const sub = cup === 'time' ? `<small>${best === undefined ? 'No time yet' : clockOf(best)}</small>` : '';
        return `<button type="button" class="kart-go" data-kart-start="${id}" data-kart-cup="${cup}"${locked ? ' disabled' : ''}><span>${locked ? `LV ${need}` : esc(COURSES[id].name)}</span>${sub}</button>`;
      }).join('');
    const cups = CUP_IDS.map((id) => {
      const c = CUPS[id];
      const locked = lv < c.level;
      return `<div class="kart-cup${locked ? ' is-locked' : ''}" role="listitem">
  <div class="kart-cup-head"><b class="race-name">${esc(c.name)}</b>${LV(c.level)}<span class="race-cps">${LAPS} laps · ${FIELD - 1} rivals</span></div>
  <p class="race-blurb">${esc(c.blurb)}</p>
  <p class="kart-prizes"><span>Wins</span>${['1st', '2nd', '3rd'].map((p, i) => `<span class="kart-prize"><em>${p}</em> ${D(c.prizes[i] ?? 0)}</span>`).join('')}</p>
  <div class="kart-courses">${courses(id, locked, c.level)}</div>
</div>`;
    }).join('');
    const trial = `<div class="kart-cup kart-trial" role="listitem">
  <div class="kart-cup-head"><b class="race-name">Time trial</b><span class="race-cps">${LAPS} laps · just you · free</span></div>
  <p class="race-blurb">The loop on your own, against the clock. Your best time per course is kept.</p>
  <div class="kart-courses">${courses('time', false, 0)}</div>
</div>`;
    return `<div class="kart-cups" role="list" aria-label="Cups">${cups}${trial}</div>
<p class="race-note">You'll race the <b>${esc(KART_SPECS[mine.model].name)}</b> in ${esc(paintName(mine.paint))}. Pick another in the Karts tab.</p>`;
  }

  function kartsTab(s: TycoonSave) {
    const lv = level(s);
    const mine = kartOf(s);
    const cards = PLAYER_KARTS.map((id) => {
      const c = KART_CATALOG[id];
      const owned = ownsKart(s, id);
      const locked = !owned && lv < c.level;
      const state = id === mine.model ? 'Picked' : owned ? 'Owned' : `${LV(c.level)}<span class="kart-price">${D(c.price)}</span>`;
      return `<button type="button" class="shop-card kart-card${locked ? ' is-locked' : ''}${owned ? ' is-owned' : ''}" data-kart="${id}" role="option" aria-selected="${id === sel}" style="--paint:${paintHex(mine.paint)}">${KART_ICONS[id]}<b>${esc(KART_SPECS[id].name)}</b><small>${state}</small></button>`;
    }).join('');

    const id = sel;
    const spec = KART_SPECS[id];
    const entry = KART_CATALOG[id];
    const owned = ownsKart(s, id);
    const mods = kartMods(s, id);
    const st = kartStatsOf(s, id);
    const stats = STATS.map(({ key, label, mod }) => {
      const base = spec[key];
      const lvl = mod ? mods[mod] : 0;
      const bonus = st[key] > base ? `<em class="garage-bonus" style="--v:${fill(base)};--b:${fill(st[key] - base)}"></em>` : '';
      return `<div><dt>${label}${lvl ? `<span class="garage-plus">+${lvl}</span>` : ''}</dt><dd><i style="--v:${fill(base)}"></i>${bonus}</dd></div>`;
    }).join('');

    let deal: string;
    if (!owned && asking) {
      deal = `<div class="garage-sale is-asking"><p class="garage-ask">Buy the ${esc(spec.name)} for ${fmt.format(entry.price)} Dorras?</p><div class="garage-confirm"><button type="button" class="shop-take" data-kart-confirm>Confirm</button><button type="button" class="garage-cancel" data-kart-cancel>Cancel</button></div></div>`;
    } else if (!owned) {
      const note = lv < entry.level ? `Needs level ${entry.level} (you're level ${lv}).` : s.dorras < entry.price ? `You're ${fmt.format(entry.price - s.dorras)} Dorras short.` : '';
      deal = `<div class="garage-sale"><button type="button" class="shop-take garage-buy" data-kart-buy>Buy · ${D(entry.price)} Dorras</button>${note ? `<p class="shop-note">${note}</p>` : ''}</div>`;
    } else {
      const rows = KART_MOD_IDS.map((m) => {
        const info = KART_MODS[m];
        const lvl = mods[m];
        const cost = kartModCost(id, m, mods);
        const pips = Array.from({ length: MOD_LEVELS }, (_, i) => `<i${i < lvl ? ' class="on"' : ''}></i>`).join('');
        const btn =
          cost === null
            ? `<button type="button" class="garage-up" disabled><span>Maxed</span></button>`
            : `<button type="button" class="garage-up" data-kart-up="${m}"${s.dorras < cost ? ' disabled' : ''}><span>Upgrade</span><small>${D(cost)}</small></button>`;
        return `<li class="garage-mod"><div class="garage-mod-info"><b>${esc(info.name)}</b><small>${esc(info.blurb)}</small></div><span class="garage-pips" role="img" aria-label="Level ${lvl} of ${MOD_LEVELS}">${pips}</span>${btn}</li>`;
      }).join('');
      const pick = id === mine.model ? '' : `<button type="button" class="shop-take kart-pick" data-kart-pick="${id}">Race this one</button>`;
      deal = `${pick}<section class="garage-tune" aria-label="Tune"><h4 class="garage-tune-head">Tune${st.boost > 1 ? `<span class="garage-plus">boosts +${Math.round((st.boost - 1) * 100)}%</span>` : ''}</h4><ul class="garage-mods">${rows}</ul></section>`;
    }

    const paints = CAR_PAINTS.map(
      (p) => `<button type="button" class="garage-paint" data-kart-paint="${p.id}" role="radio" aria-checked="${p.id === mine.paint}" aria-label="${esc(p.name)}" title="${esc(p.name)}" tabindex="${p.id === mine.paint ? 0 : -1}" style="--paint:${p.hex}"></button>`
    ).join('');

    return `<div class="shop-list kart-list" role="listbox" aria-label="Karts">${cards}</div>
<div class="shop-detail kart-detail">
  <div class="shop-name-row"><h3 class="shop-name">${esc(spec.name)}</h3><p class="shop-mode">${esc(spec.kind)}${id === mine.model ? ' · your pick' : owned ? ' · yours' : ''}</p></div>
  <p class="shop-blurb">${esc(spec.blurb)}</p>
  <p class="garage-pitch">${esc(entry.pitch)}</p>
  <dl class="shop-stats kart-stats">${stats}</dl>
  <div class="garage-deal">${deal}</div>
  <p class="garage-paint-head">Paint <span>${esc(paintName(mine.paint))}</span></p>
  <div class="garage-paints kart-paints" role="radiogroup" aria-label="Paint">${paints}</div>
</div>`;
  }

  function paint() {
    const s = d.game.save();
    repaint(dorrasEl, D(s.dorras));
    lvEl.innerHTML = `Level <b>${level(s)}</b>`;
    for (const b of tabsEl.querySelectorAll<HTMLButtonElement>('[data-karts-tab]')) b.setAttribute('aria-pressed', String(b.dataset.kartsTab === tab));
    el.dataset.tab = tab;
    repaint(body, tab === 'race' ? raceTab(s) : tab === 'karts' ? kartsTab(s) : kartRecordsHtml(s));
  }

  function setTab(t: Tab) {
    if (tab === t) return;
    tab = t;
    asking = false;
    paint();
    body.scrollTop = 0;
    focusFirst();
  }
  function focusFirst() {
    const b = body.querySelector<HTMLButtonElement>(tab === 'karts' ? `[data-kart="${sel}"]` : 'button:not(:disabled)') ?? tabsEl.querySelector<HTMLButtonElement>(`[data-karts-tab="${tab}"]`);
    b?.focus({ preventScroll: true });
  }

  /* ---------- Picking, buying and tuning (the rules in tycoon.ts decide) ---------- */

  function select(id: KartId) {
    if (id !== sel) asking = false;
    sel = id;
    preview(id, d.game.save().karts.paint);
    paint();
  }
  function pick(id: KartId, paintId?: PaintId) {
    const s = d.game.save();
    const p = paintId ?? s.karts.paint;
    if (!pickKart(s, id, p)) {
      d.game.sfx('denied');
      d.game.toast(`Buy the ${KART_SPECS[id].name} first.`);
      return false;
    }
    d.game.commit();
    preview(id, p);
    paint();
    return true;
  }
  function askBuy() {
    const s = d.game.save();
    const entry = KART_CATALOG[sel];
    // No point asking when the rules will say no: say why instead
    if (level(s) < entry.level || s.dorras < entry.price) return buy();
    asking = true;
    paint();
    body.querySelector<HTMLButtonElement>('[data-kart-confirm]')?.focus({ preventScroll: true });
  }
  function buy() {
    asking = false;
    const id = sel;
    const r = buyKart(d.game.save(), id);
    if (r.ok) {
      d.game.commit();
      d.game.sfx('buy');
      d.game.toast(`The ${KART_SPECS[id].name} is yours. It's your pick for the next race.`);
      pick(id);
    } else {
      d.game.sfx('denied');
      d.game.toast(whyNot(r.why, KART_CATALOG[id].level));
      paint();
    }
  }
  function upgrade(mod: KartModId) {
    const id = sel;
    const r = modKart(d.game.save(), id, mod);
    if (r.ok) {
      d.game.commit();
      d.game.sfx('upgrade');
      d.game.toast(`${KART_MODS[mod].name} level ${kartMods(d.game.save(), id)[mod]} fitted to the ${KART_SPECS[id].name}.`);
    } else {
      d.game.sfx('denied');
      d.game.toast(whyNot(r.why));
    }
    paint();
  }

  /* ---------- Opening and closing ---------- */

  function show() {
    if (menuOpen) return;
    menuOpen = true;
    resultOpen = false;
    result.hidden = true;
    tab = 'race';
    asking = false;
    shown = '';
    sel = d.game.save().karts.model;
    paint();
    el.hidden = false;
    el.scrollTop = 0;
    body.scrollTop = 0;
    root.classList.add('is-shopping', 'is-karts');
    d.onOpen();
    focusFirst();
  }
  function close() {
    if (!menuOpen && !resultOpen) return false;
    menuOpen = resultOpen = false;
    el.hidden = true;
    result.hidden = true;
    root.classList.remove('is-shopping', 'is-karts');
    d.onClose();
    return true;
  }
  /** Every button that can take the focus, top to bottom */
  const buttons = () => [...(menuOpen ? el : result).querySelectorAll<HTMLButtonElement>('button')].filter((b) => !b.disabled && !b.hidden && b.offsetParent !== null);
  function step(dir: number) {
    const list = buttons();
    if (!list.length) return;
    const i = list.indexOf(document.activeElement as HTMLButtonElement);
    const next = i < 0 ? (dir > 0 ? 0 : list.length - 1) : (i + dir + list.length) % list.length;
    list[next].focus({ preventScroll: true });
  }
  function take() {
    const a = document.activeElement as HTMLButtonElement | null;
    if (a && buttons().includes(a)) a.click();
    else focusFirst();
  }

  el.querySelector('[data-karts-close]')!.addEventListener('click', () => close());
  tabsEl.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-karts-tab]');
    if (b) setTab(b.dataset.kartsTab as Tab);
  });
  body.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!b || b.disabled) return;
    if (b.dataset.kartStart) {
      const course = b.dataset.kartStart as CourseId;
      const cup = b.dataset.kartCup as CupId | 'time';
      if (cup !== 'time' && level(d.game.save()) < CUPS[cup].level) {
        d.game.toast(`${CUPS[cup].name} needs level ${CUPS[cup].level}.`);
        d.game.sfx('denied');
        return;
      }
      close();
      d.start({ course, cup });
    } else if (b.dataset.kart) {
      const id = b.dataset.kart as KartId;
      // A kart you own: one click picks it; a kart on sale shows its details
      if (ownsKart(d.game.save(), id)) {
        sel = id;
        pick(id);
      } else select(id);
    } else if (b.hasAttribute('data-kart-buy')) askBuy();
    else if (b.hasAttribute('data-kart-confirm')) buy();
    else if (b.hasAttribute('data-kart-cancel')) {
      asking = false;
      paint();
      body.querySelector<HTMLButtonElement>('[data-kart-buy]')?.focus({ preventScroll: true });
    } else if (b.dataset.kartUp) upgrade(b.dataset.kartUp as KartModId);
    else if (b.dataset.kartPick) pick(b.dataset.kartPick as KartId);
    else if (b.dataset.kartPaint) {
      const s = d.game.save();
      const p = b.dataset.kartPaint as PaintId;
      // Paint is one choice for all your karts: it goes on your pick, and shows on the kart you're looking at
      if (pickKart(s, s.karts.model, p)) d.game.commit();
      preview(sel, p);
      paint();
      body.querySelector<HTMLButtonElement>(`[data-kart-paint="${p}"]`)?.focus({ preventScroll: true });
    }
  });
  // Hovering a card shows that kart in the pits
  body.addEventListener('pointerover', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-kart]');
    if (b && b.dataset.kart) preview(b.dataset.kart as KartId, d.game.save().karts.paint);
  });
  body.addEventListener('focusin', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-kart]');
    if (b && b.dataset.kart && b.dataset.kart !== sel) select(b.dataset.kart as KartId);
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') step(-1);
    else return;
    e.preventDefault();
  });
  result.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') step(-1);
    else return;
    e.preventDefault();
  });

  /* ---------- The countdown, the HUD and the pops ---------- */

  function count(text: string) {
    clearTimeout(goTimer);
    goTimer = 0;
    if (!text) {
      countEl.hidden = true;
      countEl.classList.remove('is-pop');
      return;
    }
    countEl.textContent = text;
    countEl.hidden = false;
    // Start the pop again for each count
    countEl.classList.remove('is-pop');
    void countEl.offsetWidth;
    countEl.classList.add('is-pop');
    if (text === 'GO') goTimer = window.setTimeout(() => count(''), 900);
  }
  const set = (e: HTMLElement, text: string) => {
    if (e.textContent !== text) e.textContent = text;
  };
  function showHud(on: boolean) {
    hud.hidden = !on;
    if (!on) {
      count('');
      pops.replaceChildren();
      slotKey = '';
    }
  }
  function paintHud(h: KartHud) {
    set(placeEl, String(h.place));
    set(ordEl, ord(h.place));
    set(ofEl, `of ${h.of}`);
    set(lapEl, `Lap ${Math.max(1, Math.min(h.lap, h.laps))}/${h.laps}`);
    set(clockEl, clockOf(Math.max(0, h.time)));
    hud.classList.toggle('is-trial', h.timeTrial);
    hud.classList.toggle('is-counting', h.time < 0);
    hud.classList.toggle('is-finished', h.finished);
    // The item slot: the icon and name, or the spinning strip
    const key = h.roulette ? 'roulette' : (h.item ?? 'none');
    if (key !== slotKey) {
      slotKey = key;
      const icon = h.item && !h.roulette ? ITEM_ICONS[h.item] : '';
      slotIcon.innerHTML = icon;
      if (itemBtnIcon) itemBtnIcon.innerHTML = icon;
      set(slotName, h.roulette ? '?' : h.item ? ITEMS[h.item].name : 'No item');
      slot.dataset.item = key;
      slot.classList.toggle('is-spinning', h.roulette);
      slot.classList.toggle('is-empty', !h.item && !h.roulette);
    }
    const tier = Math.max(0, Math.min(3, Math.floor(h.driftTier)));
    if (meter.dataset.tier !== String(tier)) {
      meter.dataset.tier = String(tier);
      meter.querySelectorAll('i').forEach((seg, i) => seg.classList.toggle('on', i < tier));
    }
    if (boostEl.hidden === h.boost) boostEl.hidden = !h.boost;
    if (shieldEl.hidden === h.shield) shieldEl.hidden = !h.shield;
  }
  function pop(text: string, kind: 'good' | 'bad' | 'plain' = 'plain') {
    const p = document.createElement('p');
    p.className = `kart-pop is-${kind}`;
    p.textContent = text;
    pops.append(p);
    while (pops.children.length > POPS_MAX) pops.firstElementChild?.remove();
    setTimeout(() => p.remove(), POP_MS);
  }

  /* ---------- The results card ---------- */

  function showResult(r: KartResultView) {
    const res = r.result;
    const trial = r.cup === 'time';
    const cupName = trial ? 'Time trial' : CUPS[r.cup as CupId]?.name ?? 'Cup';
    resultTitle.textContent = trial ? 'Time trial' : res.place === 1 ? 'Winner!' : res.place <= 3 ? 'Podium' : 'Finished';
    const tags = [
      trial && res.record ? '<span class="race-tag is-best">New best!</span>' : '',
      trial ? '' : `<span class="race-tag${res.place <= 3 ? '' : ' is-over'}">${res.place}${ord(res.place)} of ${r.of}</span>`,
    ].join('');
    const standings = r.standings.length
      ? `<ol class="kart-standings" aria-label="Standings">${r.standings
          .map((k) => `<li${k.you ? ' class="is-you"' : ''}><b>${k.place}${ord(k.place)}</b><span class="kart-standing-name">${esc(k.name)}</span><small>${esc(KART_SPECS[k.kart]?.name ?? '')}</small><span class="kart-standing-time">${k.time === null ? '—' : clockOf(k.time)}</span></li>`)
          .join('')}</ol>`
      : '';
    resultBody.innerHTML = `<p class="race-result-name">${esc(COURSES[r.course]?.name ?? '')} · ${esc(cupName)}</p>
<p class="race-result-time">${clockOf(res.seconds)}</p>
<p class="race-result-tags">${tags}</p>
<dl class="race-meta race-result-meta">
  <div><dt>Best lap</dt><dd>${clockOf(r.bestLap)}</dd></div>${trial ? '' : `
  <div><dt>Prize</dt><dd>${D(res.prize)}</dd></div>`}
  <div><dt>XP</dt><dd>+${fmt.format(res.xp)}</dd></div>
</dl>${res.levels ? `<p class="race-levelup">Level up! You're now ${LV(level(d.game.save()))}</p>` : ''}${standings}`;
    menuOpen = false;
    el.hidden = true;
    resultOpen = true;
    result.hidden = false;
    result.scrollTop = 0;
    root.classList.add('is-shopping', 'is-karts');
    d.onOpen();
    result.querySelector<HTMLButtonElement>('[data-kart-result-ok]')?.focus({ preventScroll: true });
  }
  result.querySelector('[data-kart-result-close]')!.addEventListener('click', () => close());
  result.querySelector('[data-kart-result-ok]')!.addEventListener('click', () => close());
  hud.querySelector('[data-kart-quit]')!.addEventListener('click', () => d.quit());

  return {
    get open() {
      return menuOpen || resultOpen;
    },
    show,
    close,
    step,
    take,
    showHud,
    paintHud,
    count,
    pop,
    showResult,
    update(dt: number) {
      if (menuOpen && (sinceRepaint += dt) > 1) {
        sinceRepaint = 0;
        paint();
      }
    },
  };
}
