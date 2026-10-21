/*
 * The kart park's screens (kart-sim.ts holds the rules, kartpark.ts the
 * courses, tycoon.ts the save, kart.ts the race on screen): the hut's menu,
 * the countdown, the race HUD, the pops and the results card. Implements
 * `KartUI` from kart-types.ts; walk.ts and index.ts wire it to the park and
 * the race.
 *
 * - The hut menu (`data-karts`, built on the gun store's `.shop` panel; the
 *   head and the tabs stay put, the body scrolls) has three tabs.
 *   Race: the three cups as series of four races (the class, the level, the
 *   courses in order, what the series pays, your trophy) with one button
 *   each: Start series, or Continue · race n/4 with a Drop beside it when
 *   that cup's series is on the go. Then the time trial: a class picker
 *   (locked classes say the level) and the six courses with your record lap
 *   and run at that class and the par ghost's lap. Then today's challenge:
 *   the day's course and class, the lap to beat and the prize.
 *   Karts: cards for the four karts (the Pocket Rocket is yours, the others
 *   cost Dorras at a level), the picked one's stat bars with the mods' bonus
 *   on top, Buy with an inline confirm, the three mods with their pips and
 *   Upgrade buttons, and the paints. Picking a kart or a paint goes through
 *   pickKart() and commit(); hovering or picking a card previews it in the
 *   pits (d.preview).
 *   Boards: a course and a class picker, the fastest lap, the par ghost,
 *   your own top-ten of time trials for that key, then your trophies and
 *   the counters the save keeps. Global boards come with the game server.
 * - The HUD (`data-kart-hud`): the place and "of 8" top left (a time trial
 *   shows the gap to the ghost there instead) over the drift meter (three
 *   segments by tier) and the tags (Boost, Shield, the surface when it's
 *   not dry, Shortcut); the lap with the class and the series' race top
 *   centre over the clock and the last / best lap; the item slot top right
 *   (the icons spin while the roulette runs; "?" under reduced motion) with
 *   Quit under it. The touch Drift and Item buttons sit above the pedals;
 *   walk.ts wires them.
 * - `count()` shows the big digits, `pop()` a short line over the HUD,
 *   `showResult()` the card: place, time, the laps with the best lit, the
 *   par lap, the tags (lap record, best run, par ghost, the daily
 *   challenge), prize, XP, a level-up, the standings and, in a series, the
 *   points table with Next race beside Done (or the overall place, the
 *   series prize and the trophy after the last race).
 *
 * Arrow keys or the D-pad move between the buttons (step), Enter / A takes
 * the one picked, Esc / B / E closes (walk.ts calls close()). Prizes and
 * prices are Dorras only: never real money, nothing to do with the token.
 */
import { CUPS, CUP_IDS, type CupId } from './kart-sim';
import { CONDS, COURSES, COURSE_IDS, type CourseId } from './kartcircuit';
import { KART_SPECS, PLAYER_KARTS, type KartId } from './mykart';
import { CHALLENGE_PRIZE, CLASS_IDS, KART_CATALOG, KART_CLASSES, KART_MODS, KART_MOD_IDS, MOD_LEVELS, SERIES_PRIZES, type ClassId, type KartModId } from './catalog';
import {
  buyKart,
  dailyChallenge,
  dayKey,
  kartModCost,
  kartMods,
  kartStatsOf,
  level,
  modKart,
  ownsKart,
  parLap,
  pickKart,
  recordKey,
  seriesNext,
  type KartTime,
  type TycoonSave,
} from './tycoon';
import { CAR_PAINTS, paintHex, type PaintId } from './mycar';
import { clockOf } from './races';
import { D, LV, esc, fmt, repaint, whyNot } from './ui';
import type { KartHud, KartResultView, KartUI, KartUIDeps } from './kart-types';

/** How many karts race a cup (you and seven rivals) */
const FIELD = 8;
/** How long a pop stays (ms) and how many at once */
const POP_MS = 1400;
const POPS_MAX = 3;

const I = (body: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
/** A trophy (a cup on a plinth), for the series */
const TROPHY = I('<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5.5a2.5 2.5 0 0 0 2.5 4M16 6h2.5a2.5 2.5 0 0 1-2.5 4M12 13v4M9 20h6l-.5-3h-5z"/>');

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
const placeOf = (n: number) => `${n}${ord(n)}`;
/** A course's name without " · reverse", and a small tag when it is the reverse */
const courseLabel = (id: CourseId) => {
  const c = COURSES[id];
  return `${esc(c.name.replace(' · reverse', ''))}${c.reverse ? '<i class="kart-rev">rev</i>' : ''}`;
};
/** The engine class as a small tag */
const classTag = (cls: ClassId) => `<span class="kart-cls-tag is-${cls}">${esc(KART_CLASSES[cls].name)}</span>`;
/** The highest class your level unlocks */
const classFor = (lv: number) => [...CLASS_IDS].reverse().find((c) => lv >= KART_CLASSES[c].level) ?? CLASS_IDS[0];
/** A date on the board: day and month, with the year when it isn't this one */
const dateOf = (at: number) => {
  const d = new Date(at);
  const thisYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-GB', thisYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
};
const kartName = (id: KartId) => KART_SPECS[id]?.name ?? '';
const NONE = '<span class="race-none">No time yet</span>';

/** The four stat bars and the mod that raises each */
const STATS: { key: 'speed' | 'accel' | 'handling' | 'weight'; label: string; mod: KartModId | null }[] = [
  { key: 'speed', label: 'Top speed', mod: 'motor' },
  { key: 'accel', label: 'Pick-up', mod: 'motor' },
  { key: 'handling', label: 'Handling', mod: 'tyres' },
  { key: 'weight', label: 'Weight', mod: null },
];

/** Your trophies, one line: "Rookie Cup 1st · Pro Cup 3rd" (or none yet) */
function trophyLine(s: TycoonSave) {
  const won = CUP_IDS.filter((id) => s.karts.trophies[id]);
  return won.length ? won.map((id) => `<span class="kart-trophy is-${s.karts.trophies[id]}">${TROPHY}${esc(CUPS[id].name)} ${placeOf(s.karts.trophies[id]!)}</span>`).join('') : '<span class="race-none">None yet</span>';
}
/** The lifetime counters the park keeps */
function countersHtml(s: TycoonSave) {
  const c = s.counters;
  return `  <div><dt>Kart races</dt><dd>${fmt.format(c.kartRaces)}</dd></div>
  <div><dt>Podiums</dt><dd>${fmt.format(c.podiums)}</dd></div>
  <div><dt>Wins</dt><dd>${fmt.format(c.kartWins)}</dd></div>
  <div><dt>Clean laps</dt><dd>${fmt.format(c.cleanLaps)}</dd></div>
  <div><dt>Overtakes</dt><dd>${fmt.format(c.overtakes)}</dd></div>`;
}

/** A compact summary of your records at the park, for the City-view panel (index.ts): best lap per course at Sport, trophies, counters */
export function kartRecordsHtml(s: TycoonSave) {
  const owned = PLAYER_KARTS.filter((id) => ownsKart(s, id)).length;
  const best = (id: CourseId) => {
    const t = s.karts.records[recordKey(id, 'sport')];
    return t === undefined ? NONE : clockOf(t.lap);
  };
  return `<p class="kart-records-head">Best laps · Sport class</p>
<dl class="race-meta kart-records">
${COURSE_IDS.map((id) => `  <div class="kart-record-time"><dt>${courseLabel(id)}</dt><dd>${best(id)}</dd></div>`).join('\n')}
  <div class="kart-record-wide"><dt>Trophies</dt><dd class="kart-trophies">${trophyLine(s)}</dd></div>
${countersHtml(s)}
  <div><dt>Karts</dt><dd>${owned} of ${PLAYER_KARTS.length}</dd></div>
</dl>`;
}

type Tab = 'race' | 'karts' | 'boards';
const TABS: { id: Tab; name: string }[] = [
  { id: 'race', name: 'Race' },
  { id: 'karts', name: 'Karts' },
  { id: 'boards', name: 'Boards' },
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
  const gapEl = hud.querySelector<HTMLElement>('[data-kart-gap]')!;
  const lapEl = hud.querySelector<HTMLElement>('[data-kart-lap]')!;
  const clsEl = hud.querySelector<HTMLElement>('[data-kart-cls]')!;
  const seriesEl = hud.querySelector<HTMLElement>('[data-kart-series]')!;
  const clockEl = hud.querySelector<HTMLElement>('[data-kart-clock]')!;
  const lapsEl = hud.querySelector<HTMLElement>('[data-kart-laps]')!;
  const lastEl = lapsEl.querySelector<HTMLElement>('[data-kart-last]')!;
  const bestEl = lapsEl.querySelector<HTMLElement>('[data-kart-best]')!;
  const meter = hud.querySelector<HTMLElement>('[data-kart-meter]')!;
  const boostEl = hud.querySelector<HTMLElement>('[data-kart-boost]')!;
  const surfaceEl = hud.querySelector<HTMLElement>('[data-kart-surface]')!;
  const pops = root.querySelector<HTMLElement>('[data-kart-pops]')!;
  const result = root.querySelector<HTMLElement>('[data-kart-result]')!;
  const resultTitle = result.querySelector<HTMLElement>('[data-kart-result-title]')!;
  const resultBody = result.querySelector<HTMLElement>('[data-kart-result-body]')!;
  const nextBtn = result.querySelector<HTMLButtonElement>('[data-kart-next]')!;

  // Pure racing since the rebuild: the item slot, the Shield and Shortcut tags and the touch Item button are put away (Phase 4 takes them out of the markup)
  for (const el of [hud.querySelector('[data-kart-slot]'), hud.querySelector('[data-kart-shield]'), hud.querySelector('[data-kart-shortcut]'), root.querySelector('[data-kart-item]')]) if (el instanceof HTMLElement) el.style.display = 'none';

  let menuOpen = false;
  let resultOpen = false;
  let tab: Tab = 'race';
  /** The kart whose details show (not always the pick: a kart on sale can be looked at) */
  let sel: KartId = 'rocket';
  /** Buy was pressed: Confirm / Cancel are showing */
  let asking = false;
  /** The time trial's class, and the board being looked at */
  let trialCls: ClassId = 'street';
  let boardCourse: CourseId = COURSE_IDS[0];
  let boardCls: ClassId = 'street';
  let sinceRepaint = 0;
  let goTimer = 0;

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

  /** A class picker: three pills, the locked ones saying their level */
  const classPicker = (attr: string, picked: ClassId, lv: number, label: string) =>
    `<div class="seg kart-seg" role="group" aria-label="${label}"><span class="seg-label">Class</span>${CLASS_IDS.map((c) => {
      const locked = lv < KART_CLASSES[c].level;
      return `<button type="button" ${attr}="${c}" aria-pressed="${c === picked}"${locked ? ' disabled' : ''} title="${esc(KART_CLASSES[c].blurb)}">${esc(KART_CLASSES[c].name)}${locked ? `<small>LV ${KART_CLASSES[c].level}</small>` : ''}</button>`;
    }).join('')}</div>`;

  function raceTab(s: TycoonSave) {
    const lv = level(s);
    const mine = kartOf(s);
    const sr = s.karts.series;
    if (lv < KART_CLASSES[trialCls].level) trialCls = classFor(lv);

    // The cups: a series of four races each
    const cups = CUP_IDS.map((id) => {
      const c = CUPS[id];
      const locked = lv < c.level;
      const going = sr?.cup === id;
      const courses = `<ol class="kart-series-courses" aria-label="Races">${c.races
        .map((r, i) => `<li${going && i < sr.race ? ' class="is-done"' : going && i === sr.race ? ' class="is-next"' : ''}><span>${courseLabel(r.course)}</span><small>${r.laps} laps${r.cond === 'day' ? '' : ` · ${CONDS[r.cond].name}`}</small></li>`)
        .join('')}</ol>`;
      const prizes = SERIES_PRIZES[id];
      const trophy = s.karts.trophies[id];
      const act = going
        ? `<button type="button" class="kart-go" data-kart-series="${id}"><span>Continue · race ${sr.race + 1}/${c.races.length}</span></button><button type="button" class="kart-drop" data-kart-drop>Drop</button>`
        : `<button type="button" class="kart-go" data-kart-series="${id}"${locked ? ' disabled' : ''}><span>${locked ? `LV ${c.level}` : 'Start series'}</span></button>`;
      return `<div class="kart-cup${locked ? ' is-locked' : ''}${going ? ' is-going' : ''}" role="listitem">
  <div class="kart-cup-head"><b class="race-name">${esc(c.name)}</b>${LV(c.level)}${classTag(c.cls)}<span class="race-cps">${c.races.length} races · ${FIELD - 1} rivals</span></div>
  <p class="race-blurb">${esc(c.blurb)}</p>
  ${courses}
  <p class="kart-prizes"><span>Series</span>${['1st', '2nd', '3rd'].map((p, i) => `<span class="kart-prize"><em>${p}</em> ${D(prizes[i] ?? 0)}</span>`).join('')}<span class="kart-prize"><em>a race win</em> ${D(c.prizes[0] ?? 0)}</span></p>
  <div class="kart-cup-act">${act}${trophy ? `<span class="kart-trophy is-${trophy}">${TROPHY}${placeOf(trophy)} overall</span>` : ''}</div>
</div>`;
    }).join('');

    // The time trial: pick a class, then a course
    const rows = COURSE_IDS.map((id) => {
      const c = COURSES[id];
      const rec = s.karts.records[recordKey(id, trialCls)];
      return `<div class="kart-course">
  <div class="kart-course-info">
    <b class="kart-course-name">${courseLabel(id)}</b>
    <p class="kart-course-blurb">${esc(c.blurb)}</p>
    <p class="kart-course-meta"><span>${c.laps} laps</span><span>Lap <b>${rec ? clockOf(rec.lap) : '—'}</b></span><span>Run <b>${rec ? clockOf(rec.run) : '—'}</b></span><span>Par <b>${clockOf(parLap(id, trialCls))}</b></span></p>
  </div>
  <button type="button" class="kart-go kart-go-sm" data-kart-start="${id}" data-kart-cup="time" data-kart-cls="${trialCls}"><span>Start</span></button>
</div>`;
    }).join('');
    const trial = `<section class="kart-sect kart-trial" aria-label="Time trial">
  <div class="kart-cup-head"><b class="race-name">Time trial</b><span class="race-cps">just you · free · the par ghost</span></div>
  <p class="race-blurb">A course on your own, against the clock and the par ghost. Your best lap and run at each class go on your board.</p>
  ${classPicker('data-kart-cls', trialCls, lv, 'Time trial class')}
  <div class="kart-course-list">${rows}</div>
</section>`;

    // Today's challenge: the day's course and class, a lap to beat
    const ch = dailyChallenge(dayKey(Date.now()));
    const done = s.karts.challenge?.day === ch.day;
    const chLocked = lv < KART_CLASSES[ch.cls].level;
    const chAct = done
      ? `<span class="kart-done">Done · ${clockOf(s.karts.challenge!.lap)}</span>`
      : `<button type="button" class="kart-go kart-go-sm" data-kart-challenge${chLocked ? ' disabled' : ''}><span>${chLocked ? `LV ${KART_CLASSES[ch.cls].level}` : 'Start'}</span></button>`;
    const challenge = `<section class="kart-sect kart-challenge${done ? ' is-done' : ''}" aria-label="Today's challenge">
  <div class="kart-cup-head"><b class="race-name">Today's challenge</b><span class="race-cps">a time trial · new every day</span></div>
  <div class="kart-course">
    <div class="kart-course-info">
      <b class="kart-course-name">${courseLabel(ch.course)}${classTag(ch.cls)}</b>
      <p class="kart-course-meta"><span>Beat a lap of <b>${clockOf(ch.target)}</b></span><span class="kart-prize"><em>Prize</em> ${D(CHALLENGE_PRIZE)}</span></p>
      ${chLocked && !done ? `<p class="shop-note">The ${esc(KART_CLASSES[ch.cls].name)} class needs level ${KART_CLASSES[ch.cls].level}.</p>` : ''}
    </div>
    ${chAct}
  </div>
</section>`;

    return `<section class="kart-sect" aria-label="Cups">
  <div class="kart-cup-head"><b class="race-name">Cups</b><span class="race-cps">a series of four races · points by place</span></div>
  <div class="kart-cups" role="list">${cups}</div>
</section>
${trial}
${challenge}
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

  function boardsTab(s: TycoonSave) {
    const lv = level(s);
    if (lv < KART_CLASSES[boardCls].level) boardCls = classFor(lv);
    const key = recordKey(boardCourse, boardCls);
    const rec: KartTime | undefined = s.karts.records[key];
    const board = s.karts.boards[key] ?? [];
    const par = parLap(boardCourse, boardCls);
    const beaten = s.karts.parBeaten.includes(key);
    const coursePicker = `<div class="seg kart-seg" role="group" aria-label="Course"><span class="seg-label">Course</span>${COURSE_IDS.map(
      (id) => `<button type="button" data-kart-board-course="${id}" aria-pressed="${id === boardCourse}">${courseLabel(id)}</button>`
    ).join('')}</div>`;
    const rows = board.length
      ? `<ol class="kart-board" aria-label="Your time trials">${board
          .map((t, i) => `<li${i === 0 ? ' class="is-top"' : ''}><b>${i + 1}</b><span class="kart-board-run">${clockOf(t.run)}</span><small>lap ${clockOf(t.lap)}</small><span class="kart-board-kart">${esc(kartName(t.kart))}</span><span class="kart-board-date">${dateOf(t.at)}</span></li>`)
          .join('')}</ol>`
      : `<p class="kart-board-empty">${NONE} <span>Run a time trial on this course at ${esc(KART_CLASSES[boardCls].name)} class and it goes here.</span></p>`;
    return `${coursePicker}
${classPicker('data-kart-board-cls', boardCls, lv, 'Board class')}
<div class="kart-board-head">
  <div class="kart-board-card"><dt>Fastest lap</dt><dd>${rec ? clockOf(rec.lap) : NONE}</dd>${rec ? `<small>${esc(kartName(rec.kart))} · ${dateOf(rec.at)}</small>` : ''}</div>
  <div class="kart-board-card${beaten ? ' is-beaten' : ''}"><dt>Par ghost</dt><dd>${clockOf(par)}</dd><small>${beaten ? 'Beaten' : 'Not beaten yet'}</small></div>
</div>
<h4 class="kart-board-title">Your top ten · time trials</h4>
${rows}
<p class="race-note">This board is yours alone for now: the global boards come with the game server.</p>
<h4 class="kart-board-title">Trophies</h4>
<p class="kart-trophies">${trophyLine(s)}</p>
<dl class="race-meta kart-records">
${countersHtml(s)}
</dl>`;
  }

  function paint() {
    const s = d.game.save();
    repaint(dorrasEl, D(s.dorras));
    lvEl.innerHTML = `Level <b>${level(s)}</b>`;
    for (const b of tabsEl.querySelectorAll<HTMLButtonElement>('[data-karts-tab]')) b.setAttribute('aria-pressed', String(b.dataset.kartsTab === tab));
    el.dataset.tab = tab;
    repaint(body, tab === 'race' ? raceTab(s) : tab === 'karts' ? kartsTab(s) : boardsTab(s));
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
  /** Repaint after a pick and put the focus back on what was pressed */
  function refocus(selector: string) {
    paint();
    body.querySelector<HTMLButtonElement>(selector)?.focus({ preventScroll: true });
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

  /* ---------- Starting: a time trial, a cup's series, the challenge ---------- */

  /** A class you haven't reached: say so (true when it's fine) */
  function classOk(cls: ClassId) {
    const need = KART_CLASSES[cls].level;
    if (level(d.game.save()) >= need) return true;
    d.game.toast(`The ${KART_CLASSES[cls].name} class needs level ${need}.`);
    d.game.sfx('denied');
    return false;
  }
  function startTrial(course: CourseId, cls: ClassId) {
    if (!classOk(cls)) return;
    close();
    d.start({ course, cup: 'time', cls });
  }
  function startSeries(cup: CupId) {
    const s = d.game.save();
    const c = CUPS[cup];
    if (level(s) < c.level) {
      d.game.toast(`${c.name} needs level ${c.level}.`);
      d.game.sfx('denied');
      return;
    }
    // Carry on with this cup's series where it stands; any other starts from its first race
    const race = (s.karts.series?.cup === cup ? seriesNext(s) : null) ?? c.races[0];
    close();
    d.start({ course: race.course, cup, cls: c.cls, laps: race.laps, cond: race.cond });
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
    const s = d.game.save();
    sel = s.karts.model;
    trialCls = classFor(level(s));
    boardCls = trialCls;
    paint();
    el.hidden = false;
    el.scrollTop = 0;
    body.scrollTop = 0;
    root.classList.add('is-shopping', 'is-karts');
    d.onOpen();
    focusFirst();
  }
  /** Hide both cards without handing control back (the next race of a series follows at once) */
  function hide() {
    menuOpen = resultOpen = false;
    el.hidden = true;
    result.hidden = true;
    root.classList.remove('is-shopping', 'is-karts');
  }
  function close() {
    if (!menuOpen && !resultOpen) return false;
    hide();
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
    if (b.dataset.kartStart) startTrial(b.dataset.kartStart as CourseId, (b.dataset.kartCls as ClassId) ?? trialCls);
    else if (b.dataset.kartSeries) startSeries(b.dataset.kartSeries as CupId);
    else if (b.hasAttribute('data-kart-drop')) {
      d.quitSeries();
      d.game.sfx('holster');
      d.game.toast('Series dropped. Start it again any time.');
      paint();
      focusFirst();
    } else if (b.hasAttribute('data-kart-challenge')) {
      const ch = dailyChallenge(dayKey(Date.now()));
      startTrial(ch.course, ch.cls);
    } else if (b.dataset.kartCls) {
      trialCls = b.dataset.kartCls as ClassId;
      refocus(`[data-kart-cls="${trialCls}"]`);
    } else if (b.dataset.kartBoardCourse) {
      boardCourse = b.dataset.kartBoardCourse as CourseId;
      refocus(`[data-kart-board-course="${boardCourse}"]`);
    } else if (b.dataset.kartBoardCls) {
      boardCls = b.dataset.kartBoardCls as ClassId;
      refocus(`[data-kart-board-cls="${boardCls}"]`);
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
      refocus('[data-kart-buy]');
    } else if (b.dataset.kartUp) upgrade(b.dataset.kartUp as KartModId);
    else if (b.dataset.kartPick) pick(b.dataset.kartPick as KartId);
    else if (b.dataset.kartPaint) {
      const s = d.game.save();
      const p = b.dataset.kartPaint as PaintId;
      // Paint is one choice for all your karts: it goes on your pick, and shows on the kart you're looking at
      if (pickKart(s, s.karts.model, p)) d.game.commit();
      preview(sel, p);
      refocus(`[data-kart-paint="${p}"]`);
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
  const arrows = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') step(-1);
    else return;
    e.preventDefault();
  };
  el.addEventListener('keydown', arrows);
  result.addEventListener('keydown', arrows);

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
  const showIf = (e: HTMLElement, on: boolean) => {
    if (e.hidden === on) e.hidden = !on;
  };
  function showHud(on: boolean) {
    hud.hidden = !on;
    if (!on) {
      count('');
      pops.replaceChildren();
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
    // The class beside the lap, and the series' race
    set(clsEl, KART_CLASSES[h.cls]?.name ?? '');
    if (clsEl.dataset.cls !== h.cls) clsEl.dataset.cls = h.cls;
    showIf(seriesEl, !!h.series);
    if (h.series) set(seriesEl, `Race ${h.series.race}/${h.series.of}`);
    // The last and the best lap under the clock, once there is one
    const anyLap = h.lastLap !== null || h.bestLap !== null;
    showIf(lapsEl, anyLap);
    if (anyLap) {
      set(lastEl, `Last ${h.lastLap === null ? '—' : clockOf(h.lastLap)}`);
      set(bestEl, `Best ${h.bestLap === null ? '—' : clockOf(h.bestLap)}`);
    }
    // The gap to the ghost (a time trial): pink behind, cyan ahead
    showIf(gapEl, h.ghostGap !== null);
    if (h.ghostGap !== null) {
      const behind = h.ghostGap > 0;
      set(gapEl, `${behind ? '+' : '−'}${Math.abs(h.ghostGap).toFixed(2)}`);
      gapEl.classList.toggle('is-behind', behind);
      gapEl.classList.toggle('is-ahead', !behind);
    }
    // The surface when it's not plain asphalt (a kerb, the run-off, banking, the tunnel)
    showIf(surfaceEl, h.surface !== 'dry');
    if (h.surface !== 'dry') {
      set(surfaceEl, h.surface === 'runoff' ? 'run-off' : h.surface);
      if (surfaceEl.dataset.surface !== h.surface) surfaceEl.dataset.surface = h.surface;
    }
    const tier = Math.max(0, Math.min(3, Math.floor(h.driftTier)));
    if (meter.dataset.tier !== String(tier)) {
      meter.dataset.tier = String(tier);
      meter.querySelectorAll('i').forEach((seg, i) => seg.classList.toggle('on', i < tier));
    }
    showIf(boostEl, h.boost);
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
    const sr = r.series;
    const cupName = trial ? 'Time trial' : CUPS[r.cup as CupId]?.name ?? 'Cup';
    resultTitle.textContent = sr?.done
      ? sr.overall === 1
        ? 'Series won!'
        : sr.overall <= 3
          ? 'Series podium'
          : 'Series over'
      : trial
        ? 'Time trial'
        : res.place === 1
          ? 'Winner!'
          : res.place <= 3
            ? 'Podium'
            : 'Finished';
    const tags = [
      trial ? '' : `<span class="race-tag${res.place <= 3 ? '' : ' is-over'}">${placeOf(res.place)} of ${r.of}</span>`,
      res.lapRecord ? '<span class="race-tag is-best">New lap record</span>' : '',
      trial && res.record ? '<span class="race-tag is-best">New best run</span>' : '',
      res.parBeaten ? '<span class="race-tag is-par">Par ghost beaten!</span>' : '',
      res.challenge ? `<span class="race-tag is-par">Daily challenge done! +${D(CHALLENGE_PRIZE)}</span>` : '',
    ].join('');
    // Your laps, the best lit, and the par ghost's lap beside them
    const bestLap = r.laps.length ? Math.min(...r.laps) : 0;
    const laps = r.laps.length
      ? `<ol class="kart-lap-list" aria-label="Your laps">${r.laps.map((t, i) => `<li${t === bestLap ? ' class="is-best"' : ''}><small>Lap ${i + 1}</small><b>${clockOf(t)}</b></li>`).join('')}<li class="is-par"><small>Par</small><b>${clockOf(r.par)}</b></li></ol>`
      : '';
    const standings = r.standings.length
      ? `<ol class="kart-standings" aria-label="Standings">${r.standings
          .map((k) => `<li${k.you ? ' class="is-you"' : ''}><b>${placeOf(k.place)}</b><span class="kart-standing-name">${esc(k.name)}</span><small>${esc(kartName(k.kart))}</small><span class="kart-standing-time">${k.time === null ? '—' : clockOf(k.time)}</span></li>`)
          .join('')}</ol>`
      : '';
    // A series: the points table after this race, and after the last one the overall place and the prize
    let series = '';
    if (sr) {
      const table = sr.names
        .map((n, i) => ({ ...n, points: sr.points[i] ?? 0, place: sr.places[i] ?? i + 1 }))
        .sort((a, b) => a.place - b.place);
      const youTrophy = sr.done && sr.overall <= 3;
      series = `<div class="kart-series">
  <p class="kart-series-head"><b>${esc(cupName)}</b><span>${sr.done ? `All ${sr.of} races run` : `Race ${sr.race} of ${sr.of}`}</span></p>
  ${
    sr.done
      ? `<p class="kart-series-final${youTrophy ? ' is-trophy' : ''}">${youTrophy ? TROPHY : ''}<span>${placeOf(sr.overall)} overall</span>${sr.prize > 0 ? `<span class="kart-series-prize">+${D(sr.prize)}</span>` : ''}</p>
  <p class="kart-series-note">${youTrophy ? `A ${placeOf(sr.overall)}-place trophy for the ${esc(cupName)} goes on your board.` : 'No trophy this time: the first three overall take one.'}</p>`
      : ''
  }
  <ol class="kart-points" aria-label="Series standings">${table
    .map((t) => `<li${t.you ? ' class="is-you"' : ''}><b>${placeOf(t.place)}</b><span class="kart-standing-name">${esc(t.name)}</span><small>${esc(kartName(t.kart))}</small><span class="kart-points-n">${t.points} pts</span></li>`)
    .join('')}</ol>
</div>`;
    }
    resultBody.innerHTML = `<p class="race-result-name">${courseLabel(r.course)} · ${esc(cupName)} · ${esc(KART_CLASSES[r.cls]?.name ?? '')}</p>
<p class="race-result-time">${clockOf(res.seconds)}</p>
<p class="race-result-tags">${tags}</p>
${laps}
<dl class="race-meta race-result-meta">
  <div><dt>Best lap</dt><dd>${clockOf(res.bestLap)}</dd></div>${trial ? '' : `
  <div><dt>Prize</dt><dd>${D(res.prize)}</dd></div>`}
  <div><dt>XP</dt><dd>+${fmt.format(res.xp + (sr?.xp ?? 0))}</dd></div>
</dl>${res.levels + (sr?.levels ?? 0) > 0 ? `<p class="race-levelup">Level up! You're now ${LV(level(d.game.save()))}</p>` : ''}${standings}${series}`;
    // Next race, for a series with races still to run
    nextBtn.hidden = !sr || sr.done;
    if (sr && !sr.done) nextBtn.innerHTML = `Next race <small>${courseLabel(CUPS[r.cup as CupId]?.races[sr.race]?.course ?? r.course)}</small>`;
    menuOpen = false;
    el.hidden = true;
    resultOpen = true;
    result.hidden = false;
    result.scrollTop = 0;
    root.classList.add('is-shopping', 'is-karts');
    d.onOpen();
    (nextBtn.hidden ? result.querySelector<HTMLButtonElement>('[data-kart-result-ok]') : nextBtn)?.focus({ preventScroll: true });
  }
  result.querySelector('[data-kart-result-close]')!.addEventListener('click', () => close());
  result.querySelector('[data-kart-result-ok]')!.addEventListener('click', () => close());
  // Straight into the series' next race: the card goes without handing control back (kart.ts starts it)
  nextBtn.addEventListener('click', () => {
    if (!resultOpen) return;
    hide();
    d.nextRace();
  });
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
