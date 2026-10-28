/*
 * The Fight Club's screens (fight-sim.ts holds the rules, fightsite.ts the
 * site, tycoon.ts the save, fight.ts the fight on screen): the trainer's
 * menu, the fight HUD, the bell's big text, the pops and the bout card.
 * Implements `FightUI` from fight-types.ts; walk.ts and index.ts wire it to
 * the gym and the fight, the way the kart hut's `createKartUI` is wired.
 *
 * - The trainer's menu (`data-fight`, built on the gun store's `.shop`
 *   panel; the head and the tabs stay put, the body scrolls) has four tabs.
 *   Spar: the three partners from `FIGHT_BOTS` (name, blurb, style, a
 *   difficulty row), each with a Spar button; a spar has no clock and no
 *   prize, and ends when you quit from the ring.
 *   Bout: the same three as opponents for a bout of three rounds, first to
 *   two, 90 seconds a round: the prize, the level it needs (locked below
 *   it: the button says the level and a tap says why), your record against
 *   them (beaten n times, your best time), and Fight.
 *   Record: wins, losses, knock-outs, best chain, bouts, spars, and each
 *   opponent's line.
 *   Styles: the three styles from `STYLES` with their moves by name, the
 *   price and level from `STYLE_CATALOG` (docs/fight-plan.md Phase 3): the
 *   Brawler is everyone's; the others are bought (Buy, then a confirm) and
 *   picked straight away; a style you own is picked with "Fight in it".
 *   The style you fight in goes into the ring and onto the street.
 *   The Spar tab names the sparring partners waiting on the street, and the
 *   Record tab carries each partner's line (brawlsite.ts).
 * - The HUD (`data-fight-hud`): the two health bars facing each other
 *   under the header with the names (yours left, the opponent's right,
 *   filling from the right), your stamina under yours (red when you're
 *   out), the round and its clock in the middle for a bout (a spar says
 *   "Spar") with the rounds won as pips under it; a chain pill from the
 *   second hit of a chain, a Blocking tag while you block, and Quit top
 *   right. The knockdown count is a big number in the centre stack under
 *   the bell's text ("Get up!" when it's you, the opponent's name when
 *   it's them). The touch Punch / Kick / Block / Dodge buttons
 *   (`data-fight-*`) sit where Fire, Aim and Jump do; walk.ts reads them.
 *   `.city.is-fighting` goes on the root with the HUD.
 * - `count()` shows the big centre text (the bell's "Round 1", "FIGHT",
 *   "K.O."), `pop()` a short line under the HUD, `showResult()` the card:
 *   the result, the opponent, a bout's rounds, the hits landed and taken,
 *   the best chain, knock-outs, knockdowns and the time, then what it paid
 *   (Dorras and XP, a level-up) and Done.
 *
 * Arrow keys or the D-pad move between the buttons (step), Enter / A takes
 * the one picked, Esc / B / F closes (walk.ts calls close()). Prizes are
 * Dorras and XP only: never real money, nothing to do with the token.
 */
import { BOT_LEVELS, FIGHT_BOTS, SPAR_HIT_CAP, STYLE_CATALOG, XP, type BotLevel } from './catalog';
import { PARTNERS } from './brawlsite';
import { MOVES, STYLES, type StyleId } from './fight-moves';
import { level, type TycoonSave } from './tycoon';
import { buyStyle, pickStyle } from './fightsave';
import { botLine, botsHtml, clock, countsHtml, fightOf, times, type FightSave } from './fight-records';
import { D, LV, esc, fmt, repaint, whyNot } from './ui';
import type { FightHud, FightResultView, FightUI, FightUIDeps } from './fight-types';

/** A bout, as the trainer describes it (fight.ts sets the sim up to match) */
export const BOUT = { rounds: 3, seconds: 90 };
/** How long a pop stays (ms) and how many at once */
const POP_MS = 1400;
const POPS_MAX = 3;
/** The bell's "FIGHT" clears itself after this (the rest stays until the next count or '') */
const FIGHT_MS = 900;
/** Your health bar turns red under this */
const LOW_HEALTH = 0.25;
/** The difficulty row's pips */
const PIPS = 5;

const STYLE_IDS = Object.keys(STYLES) as StyleId[];
/** One line on each style's card */
const PITCH: Record<StyleId, string> = {
  brawler: "Everyone's from day one: the jab, the cross, the hook and the front kick.",
  kickboxer: 'The roundhouse, and every kick hits harder.',
  street: 'The uppercut, the parry, and a dodge that steps further.',
};
/** Each sparring partner's line on the Record tab: sparred and beaten */
const partnersHtml = (f: FightSave) =>
  PARTNERS.map((p) => {
    const r = f.partners?.[p.id];
    const line = !r || r.spars <= 0 ? '<span class="race-none">Not sparred yet</span>' : `Sparred ${times(r.spars)}${r.beaten > 0 ? ` · beaten ${times(r.beaten)}` : ''}`;
    return `  <div class="fight-record-bot"><dt>${esc(p.name)}</dt><dd>${line}</dd></div>`;
  }).join('\n');

/** The difficulty row: five pips, the bot's skill lit */
const pips = (skill: number) => {
  const lit = Math.max(1, Math.min(PIPS, Math.round(skill * PIPS)));
  return `<span class="fight-pips" role="img" aria-label="Difficulty ${lit} of ${PIPS}">${Array.from({ length: PIPS }, (_, i) => `<i${i < lit ? ' class="on"' : ''}></i>`).join('')}</span>`;
};
/** The style's name as a small tag */
const styleTag = (id: StyleId) => `<span class="fight-style-tag is-${id}">${esc(STYLES[id].name)}</span>`;
type Tab = 'spar' | 'bout' | 'record' | 'styles';

export function createFightUI(root: HTMLElement, d: FightUIDeps): FightUI {
  const el = root.querySelector<HTMLElement>('[data-fight]')!;
  const tabsEl = el.querySelector<HTMLElement>('[data-fight-tabs]')!;
  const body = el.querySelector<HTMLElement>('[data-fight-body]')!;
  const dorrasEl = el.querySelector<HTMLElement>('[data-fight-dorras]')!;
  const lvEl = el.querySelector<HTMLElement>('[data-fight-level]')!;
  const countEl = root.querySelector<HTMLElement>('[data-fight-count]')!;
  const hud = root.querySelector<HTMLElement>('[data-fight-hud]')!;
  const youEl = hud.querySelector<HTMLElement>('[data-fight-you]')!;
  const oppEl = hud.querySelector<HTMLElement>('[data-fight-opponent]')!;
  const healthEl = hud.querySelector<HTMLElement>('[data-fight-health]')!;
  const staminaEl = hud.querySelector<HTMLElement>('[data-fight-stamina]')!;
  const oppHealthEl = hud.querySelector<HTMLElement>('[data-fight-opp-health]')!;
  const roundEl = hud.querySelector<HTMLElement>('[data-fight-round]')!;
  const clockEl = hud.querySelector<HTMLElement>('[data-fight-clock]')!;
  const pipsYou = hud.querySelector<HTMLElement>('[data-fight-pips-you]')!;
  const pipsThem = hud.querySelector<HTMLElement>('[data-fight-pips-them]')!;
  const chainEl = hud.querySelector<HTMLElement>('[data-fight-chain]')!;
  const blockingEl = hud.querySelector<HTMLElement>('[data-fight-blocking]')!;
  const kdEl = root.querySelector<HTMLElement>('[data-fight-knockdown]')!;
  const kdN = kdEl.querySelector<HTMLElement>('[data-fight-count-n]')!;
  const kdWho = kdEl.querySelector<HTMLElement>('[data-fight-count-who]')!;
  const pops = root.querySelector<HTMLElement>('[data-fight-pops]')!;
  const result = root.querySelector<HTMLElement>('[data-fight-result]')!;
  const resultTitle = result.querySelector<HTMLElement>('[data-fight-result-title]')!;
  const resultBody = result.querySelector<HTMLElement>('[data-fight-result-body]')!;
  const snackBtn = hud.querySelector<HTMLButtonElement>('[data-fight-snack]')!;
  const snackN = snackBtn.querySelector<HTMLElement>('[data-fight-snack-n]')!;
  const doneBtn = result.querySelector<HTMLButtonElement>('[data-fight-result-ok]')!;

  let menuOpen = false;
  let resultOpen = false;
  let tab: Tab = 'spar';
  let sinceRepaint = 0;
  let fightTimer = 0;
  /** What the HUD showed last, so only changes touch the DOM */
  let pipsFor = 0;
  let chainShown = 0;
  /** The style whose Buy is waiting for its confirm */
  let confirming: StyleId | null = null;

  /* ---------- The menu ---------- */

  function sparTab(s: TycoonSave) {
    const f = fightOf(s);
    const cards = BOT_LEVELS.map((b) => {
      const bot = FIGHT_BOTS[b];
      return `<div class="fight-card" role="listitem">
  <div class="fight-card-head"><b class="race-name">${esc(bot.name)}</b>${styleTag(bot.style)}${pips(bot.skill)}</div>
  <p class="race-blurb">${esc(bot.blurb)}</p>
  <p class="fight-card-meta"><span><em>XP</em> +${XP.spar}</span><span><em>a hit</em> +${XP.sparHit}, up to ${SPAR_HIT_CAP}</span></p>
  <div class="fight-card-act"><button type="button" class="fight-go" data-fight-spar="${b}"><span>Spar</span></button></div>
</div>`;
    }).join('');
    return `<section class="fight-sect" aria-label="Spar">
  <div class="fight-sect-head"><b class="race-name">Spar</b><span class="race-cps">a partner · no clock · no prize</span></div>
  <div class="fight-cards" role="list">${cards}</div>
</section>
<p class="race-note">A spar never ends: fight until you've had enough. Quit from the ring.${f.spars > 0 ? ` You've sparred ${times(f.spars)}.` : ''}</p>
<p class="race-note">Out on the street, sparring partners wait for a round with health: ${PARTNERS.map((p) => `${esc(p.name)} on ${esc(p.where)}`).join(', ')}. Walk up and spar; a knock-out ends it.</p>`;
  }

  function boutTab(s: TycoonSave) {
    const f = fightOf(s);
    const lv = level(s);
    const cards = BOT_LEVELS.map((b) => {
      const bot = FIGHT_BOTS[b];
      const locked = lv < bot.level;
      return `<div class="fight-card${locked ? ' is-locked' : ''}" role="listitem">
  <div class="fight-card-head"><b class="race-name">${esc(bot.name)}</b>${LV(bot.level)}${styleTag(bot.style)}${pips(bot.skill)}</div>
  <p class="race-blurb">${esc(bot.blurb)}</p>
  <p class="fight-card-meta"><span class="fight-prize"><em>Prize</em> ${D(bot.prize)}</span><span><em>Win</em> +${XP.boutWin} XP</span><span><em>K.O.</em> +${XP.fightKo} XP</span></p>
  <p class="fight-card-rec">${botLine(f, b)}</p>
  <div class="fight-card-act"><button type="button" class="fight-go" data-fight-bout="${b}"${locked ? ' aria-disabled="true"' : ''}><span>${locked ? `Lv ${bot.level}` : 'Fight'}</span></button></div>
</div>`;
    }).join('');
    return `<section class="fight-sect" aria-label="Bout">
  <div class="fight-sect-head"><b class="race-name">Bout</b><span class="race-cps">${BOUT.rounds} rounds · first to two · ${BOUT.seconds} seconds a round</span></div>
  <p class="race-blurb">A bout of three rounds, first to two, ${BOUT.seconds} seconds a round; a knock-out ends it early. Win and the prize is yours, in Dorras.</p>
  <div class="fight-cards" role="list">${cards}</div>
</section>
<p class="race-note">A bout quit from the ring counts as a loss.</p>`;
  }

  function recordTab(s: TycoonSave) {
    const f = fightOf(s);
    return `<dl class="race-meta fight-records">
${countsHtml(f)}
  <div><dt>Bouts</dt><dd>${fmt.format(f.bouts)}</dd></div>
  <div><dt>Spars</dt><dd>${fmt.format(f.spars)}</dd></div>
</dl>
<h4 class="fight-sub">Opponents</h4>
<dl class="race-meta fight-records fight-records-bots">
${botsHtml(f)}
</dl>
<h4 class="fight-sub">On the street</h4>
<dl class="race-meta fight-records fight-records-bots">
${partnersHtml(f)}
</dl>`;
  }

  function stylesTab(s: TycoonSave) {
    const f = fightOf(s);
    const lv = level(s);
    const cards = STYLE_IDS.map((id) => {
      const st = STYLES[id];
      const c = STYLE_CATALOG[id];
      const yours = f.style === id;
      const owned = yours || f.styles.includes(id);
      const locked = !owned && lv < c.level;
      const moves = st.moves.map((m) => `<li>${esc(MOVES[m].name)}</li>`).join('') + (st.parry ? '<li>Parry</li>' : '');
      const act = yours
        ? '<span class="fight-state">Your style</span>'
        : owned
          ? `<button type="button" class="fight-go" data-fight-style-pick="${id}"><span>Fight in it</span></button>`
          : confirming === id
            ? `<button type="button" class="fight-go" data-fight-style-buy="${id}" data-confirm="1"><span>Buy for ${fmt.format(c.price)}</span></button><button type="button" class="fight-go is-plain" data-fight-style-cancel><span>Cancel</span></button>`
            : `<button type="button" class="fight-go" data-fight-style-buy="${id}"${locked ? ' aria-disabled="true"' : ''}><span>${locked ? `Lv ${c.level}` : `Buy · ${fmt.format(c.price)}`}</span></button>`;
      return `<div class="fight-card fight-style${yours ? ' is-picked' : ''}${locked ? ' is-locked' : ''}" role="listitem">
  <div class="fight-card-head"><b class="race-name">${esc(st.name)}</b>${owned || c.price === 0 ? '' : LV(c.level)}${owned ? '' : `<span class="fight-prize">${D(c.price)}</span>`}</div>
  <p class="race-blurb">${esc(PITCH[id])}</p>
  <ul class="fight-moves" aria-label="Moves">${moves}</ul>
  <div class="fight-card-act">${act}</div>
</div>`;
    }).join('');
    return `<section class="fight-sect" aria-label="Styles">
  <div class="fight-sect-head"><b class="race-name">Styles</b><span class="race-cps">a complete fighter each</span></div>
  <div class="fight-cards" role="list">${cards}</div>
</section>
<p class="race-note">The style you fight in goes into the ring and onto the street. Styles are Dorras earned in the city: nothing here is real money.</p>`;
  }
  function onStyleBuy(id: StyleId, confirmed: boolean) {
    const s = d.game.save();
    const c = STYLE_CATALOG[id];
    if (level(s) < c.level) {
      d.game.sfx('denied');
      d.game.toast(`The ${STYLES[id].name} style needs level ${c.level}.`);
      return;
    }
    if (!confirmed) {
      confirming = id;
      paint();
      body.querySelector<HTMLButtonElement>(`[data-fight-style-buy="${id}"]`)?.focus({ preventScroll: true });
      return;
    }
    confirming = null;
    const r = buyStyle(s, id);
    if (!r.ok) {
      d.game.sfx('denied');
      d.game.toast(whyNot(r.why, c.level));
      paint();
      return;
    }
    d.game.commit();
    d.game.sfx('buy');
    d.game.toast(`The ${STYLES[id].name} style is yours. You fight in it now.`);
    paint();
  }
  function onStylePick(id: StyleId) {
    if (!pickStyle(d.game.save(), id)) return;
    d.game.commit();
    d.game.toast(`You fight ${STYLES[id].name} now.`);
    paint();
  }

  function paint() {
    const s = d.game.save();
    repaint(dorrasEl, D(s.dorras));
    lvEl.innerHTML = `Level <b>${level(s)}</b>`;
    for (const b of tabsEl.querySelectorAll<HTMLButtonElement>('[data-fight-tab]')) b.setAttribute('aria-pressed', String(b.dataset.fightTab === tab));
    el.dataset.tab = tab;
    repaint(body, tab === 'spar' ? sparTab(s) : tab === 'bout' ? boutTab(s) : tab === 'record' ? recordTab(s) : stylesTab(s));
  }
  function setTab(t: Tab) {
    if (tab === t) return;
    tab = t;
    confirming = null;
    paint();
    body.scrollTop = 0;
    focusFirst();
  }
  function focusFirst() {
    const b = body.querySelector<HTMLButtonElement>('button:not(:disabled):not([aria-disabled="true"])') ?? tabsEl.querySelector<HTMLButtonElement>(`[data-fight-tab="${tab}"]`);
    b?.focus({ preventScroll: true });
  }

  /* ---------- Starting a spar or a bout ---------- */

  function startSpar(bot: BotLevel) {
    close();
    d.start({ kind: 'spar', bot });
  }
  function startBout(bot: BotLevel) {
    const need = FIGHT_BOTS[bot].level;
    if (level(d.game.save()) < need) {
      d.game.sfx('denied');
      d.game.toast(`${FIGHT_BOTS[bot].name} needs level ${need}.`);
      return;
    }
    close();
    d.start({ kind: 'bout', bot });
  }

  /* ---------- Opening and closing ---------- */

  function show() {
    if (menuOpen) return;
    menuOpen = true;
    resultOpen = false;
    result.hidden = true;
    tab = 'spar';
    confirming = null;
    paint();
    el.hidden = false;
    el.scrollTop = 0;
    body.scrollTop = 0;
    root.classList.add('is-shopping', 'is-fightclub');
    d.onOpen();
    focusFirst();
  }
  function hide() {
    menuOpen = resultOpen = false;
    el.hidden = true;
    result.hidden = true;
    root.classList.remove('is-shopping', 'is-fightclub');
  }
  function close() {
    if (!menuOpen && !resultOpen) return false;
    hide();
    d.onClose();
    return true;
  }
  /** Every button that can take the focus, top to bottom (a locked Fight says why on a tap, so it stays out of the ring) */
  const buttons = () =>
    [...(menuOpen ? el : result).querySelectorAll<HTMLButtonElement>('button')].filter((b) => !b.disabled && !b.hidden && b.getAttribute('aria-disabled') !== 'true' && b.offsetParent !== null);
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

  el.querySelector('[data-fight-close]')!.addEventListener('click', () => close());
  tabsEl.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-fight-tab]');
    if (b) setTab(b.dataset.fightTab as Tab);
  });
  body.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!b || b.disabled) return;
    if (b.dataset.fightSpar) startSpar(b.dataset.fightSpar as BotLevel);
    else if (b.dataset.fightBout) startBout(b.dataset.fightBout as BotLevel);
    else if (b.dataset.fightStyleBuy) onStyleBuy(b.dataset.fightStyleBuy as StyleId, !!b.dataset.confirm);
    else if (b.dataset.fightStylePick) onStylePick(b.dataset.fightStylePick as StyleId);
    else if ('fightStyleCancel' in b.dataset) {
      confirming = null;
      paint();
    }
  });
  const arrows = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') step(-1);
    else return;
    e.preventDefault();
  };
  el.addEventListener('keydown', arrows);
  result.addEventListener('keydown', arrows);

  /* ---------- The bell's text, the HUD and the pops ---------- */

  function count(text: string) {
    clearTimeout(fightTimer);
    fightTimer = 0;
    if (!text) {
      countEl.hidden = true;
      countEl.classList.remove('is-pop');
      return;
    }
    countEl.textContent = text;
    countEl.hidden = false;
    countEl.classList.toggle('is-ko', /^k\.?o/i.test(text));
    // Start the pop again for each text
    countEl.classList.remove('is-pop');
    void countEl.offsetWidth;
    countEl.classList.add('is-pop');
    if (text === 'FIGHT') fightTimer = window.setTimeout(() => count(''), FIGHT_MS);
  }
  const set = (e: HTMLElement, text: string) => {
    if (e.textContent !== text) e.textContent = text;
  };
  const showIf = (e: HTMLElement, on: boolean) => {
    if (e.hidden === on) e.hidden = !on;
  };
  /** A bar's fill, 0..1, as a CSS variable (the bar scales with it) */
  const bar = (e: HTMLElement, v: number) => {
    const s = Math.max(0, Math.min(1, v)).toFixed(3);
    if (e.style.getPropertyValue('--v') !== s) e.style.setProperty('--v', s);
  };
  /** The rounds-won pips: as many as it takes to win (first to two in three), yours and theirs */
  function paintPips(rounds: number, score: [number, number]) {
    const need = Math.max(1, Math.ceil(rounds / 2));
    if (need !== pipsFor) {
      pipsFor = need;
      const dots = Array.from({ length: need }, () => '<i></i>').join('');
      pipsYou.innerHTML = dots;
      pipsThem.innerHTML = dots;
    }
    pipsYou.querySelectorAll('i').forEach((p, i) => p.classList.toggle('on', i < score[0]));
    pipsThem.querySelectorAll('i').forEach((p, i) => p.classList.toggle('on', i < score[1]));
  }
  function showHud(on: boolean) {
    hud.hidden = !on;
    root.classList.toggle('is-fighting', on);
    ghosts.you = { v: 1, at: 0 };
    ghosts.opp = { v: 1, at: 0 };
    if (!on) {
      count('');
      pops.replaceChildren();
      chainShown = 0;
      pipsFor = 0;
    }
  }
  // The pale ghost behind each health bar: a hit chips the bar at once, the ghost drains after a beat
  const ghostYouEl = hud.querySelector<HTMLElement>('[data-fight-health-ghost]');
  const ghostOppEl = hud.querySelector<HTMLElement>('[data-fight-opp-health-ghost]');
  const ghosts = { you: { v: 1, at: 0 }, opp: { v: 1, at: 0 } };
  function ghost(g: { v: number; at: number }, el: HTMLElement | null, v: number) {
    const now = performance.now();
    if (v >= g.v) {
      g.v = v;
      g.at = 0;
    } else {
      if (!g.at) g.at = now;
      if (now - g.at > 380) g.v = Math.max(v, g.v - 0.012);
    }
    if (el) bar(el, g.v);
  }
  function paintHud(h: FightHud) {
    set(youEl, h.you);
    set(oppEl, h.opponent);
    bar(healthEl, h.health);
    bar(staminaEl, h.stamina);
    bar(oppHealthEl, h.oppHealth);
    ghost(ghosts.you, ghostYouEl, h.health);
    ghost(ghosts.opp, ghostOppEl, h.oppHealth);
    const spar = h.kind !== 'bout';
    hud.classList.toggle('is-spar', spar);
    // The snack, in a spar or a street spar, while there's one in the bag
    const snack = h.canSnack && h.snacks > 0;
    showIf(snackBtn, snack);
    if (snack) set(snackN, String(h.snacks));
    hud.classList.toggle('is-empty', h.empty);
    hud.classList.toggle('is-low', h.health < LOW_HEALTH);
    hud.classList.toggle('is-rest', h.phase === 'rest');
    hud.classList.toggle('is-over', h.phase === 'over');
    showIf(blockingEl, h.blocking);
    // The round and the clock (a spar has neither), the rounds won
    if (spar) set(roundEl, h.kind === 'street' ? 'Street spar' : 'Spar');
    else {
      set(roundEl, `Round ${Math.max(1, Math.min(h.round, h.rounds))}/${h.rounds}`);
      set(clockEl, clock(h.clock));
      paintPips(h.rounds, h.score);
    }
    // The chain pill from the second hit, popping again as it grows
    const chain = h.chain >= 2 ? h.chain : 0;
    showIf(chainEl, chain > 0);
    if (chain > 0) {
      set(chainEl, `${chain} hit chain`);
      if (chain !== chainShown) {
        chainEl.classList.remove('is-pop');
        void chainEl.offsetWidth;
        chainEl.classList.add('is-pop');
      }
    }
    chainShown = chain;
    // The count while someone's down
    const down = h.count > 0 && h.down !== null;
    showIf(kdEl, down);
    if (down) {
      set(kdN, String(Math.max(1, Math.ceil(h.count))));
      set(kdWho, h.down === 'you' ? 'Get up!' : h.opponent);
      kdEl.classList.toggle('is-you', h.down === 'you');
      kdEl.classList.toggle('is-them', h.down === 'them');
    }
  }
  function pop(text: string, kind: 'good' | 'bad' | 'plain' = 'plain') {
    const p = document.createElement('p');
    p.className = `fight-pop is-${kind}`;
    p.textContent = text;
    pops.append(p);
    while (pops.children.length > POPS_MAX) pops.firstElementChild?.remove();
    setTimeout(() => p.remove(), POP_MS);
  }

  /* ---------- The bout card ---------- */

  function showResult(r: FightResultView) {
    const res = r.result;
    const bout = r.kind === 'bout';
    resultTitle.textContent = r.won === true ? 'You win' : r.won === false ? 'You lose' : r.kind === 'spar' ? 'Spar over' : 'Quit';
    const label = bout ? 'Bout' : r.kind === 'street' ? 'Street spar' : 'Spar';
    result.classList.toggle('is-won', r.won === true);
    result.classList.toggle('is-lost', r.won === false);
    const tags = [
      r.kos > 0 ? '<span class="race-tag is-best">Knock-out</span>' : '',
      r.quit && r.kind !== 'spar' ? '<span class="race-tag is-over">Quit · counts as a loss</span>' : r.quit ? '<span class="race-tag is-over">Quit</span>' : '',
      r.bestChain >= 3 ? `<span class="race-tag">${r.bestChain} hit chain</span>` : '',
    ].join('');
    const paid =
      res.prize > 0 || res.xp > 0
        ? `<dl class="race-meta race-result-meta fight-paid">${res.prize > 0 ? `
  <div><dt>Prize</dt><dd>${D(res.prize)}</dd></div>` : ''}
  <div><dt>XP</dt><dd>+${fmt.format(res.xp)}</dd></div>
</dl>`
        : '<p class="shop-note">Nothing paid: a spar is practice, and a quit pays nothing.</p>';
    resultBody.innerHTML = `<p class="race-result-name">${label} · ${esc(r.opponent)} · ${esc(STYLES[r.style].name)}</p>
${bout ? `<p class="fight-result-rounds" aria-label="Rounds won, you and ${esc(r.opponent)}"><b>${r.rounds[0]}</b><span>–</span><b>${r.rounds[1]}</b></p>` : `<p class="fight-result-time">${clock(r.seconds)}</p>`}
<p class="race-result-tags">${tags}</p>
<dl class="race-meta race-result-meta fight-result-meta">
  <div><dt>Hits landed</dt><dd>${fmt.format(r.hits)}</dd></div>
  <div><dt>Hits taken</dt><dd>${fmt.format(r.taken)}</dd></div>
  <div><dt>Best chain</dt><dd>${r.bestChain}</dd></div>
  <div><dt>Knock-outs</dt><dd>${r.kos}</dd></div>
  <div><dt>Knockdowns</dt><dd>${r.knockdowns}</dd></div>
  <div><dt>Time</dt><dd>${clock(r.seconds)}</dd></div>
</dl>
${paid}${res.levels > 0 ? `<p class="race-levelup">Level up! You're now ${LV(level(d.game.save()))}</p>` : ''}`;
    menuOpen = false;
    el.hidden = true;
    resultOpen = true;
    result.hidden = false;
    result.scrollTop = 0;
    resultBody.scrollTop = 0;
    root.classList.add('is-shopping', 'is-fightclub');
    d.onOpen();
    doneBtn.focus({ preventScroll: true });
  }
  result.querySelector('[data-fight-result-close]')!.addEventListener('click', () => close());
  doneBtn.addEventListener('click', () => close());
  hud.querySelector('[data-fight-quit]')!.addEventListener('click', () => d.quit());
  snackBtn.addEventListener('click', () => d.snack());

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
