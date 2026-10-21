/*
 * Missions, levels and badges on screen (missions.ts and catalog.ts hold the
 * rules; tycoon.ts the save):
 *
 * - The level pill in the mode header (`[data-level]`, next to the Dorras
 *   readout): "Lv 7" over a thin XP bar, the title in its tooltip. In the
 *   city it drops a small card (level, title, XP to go, badges); while
 *   walking it opens the Profile tab on its badges.
 * - The mission board, at the end of the Signal tower's panel (tycoon-ui.ts
 *   appends `boardHtml()` after the contracts and routes its buttons through
 *   `act()`): your missions with a progress bar, Claim and Give up; the board
 *   by level, with Take (and why not, when you can't); the ones done.
 * - The mission tracker in the walk HUD (`[data-missions-tracker]`): a line
 *   and a mini bar per active mission, hidden when there are none; on phones
 *   a pill with the count that opens on a tap.
 * - The Profile tab's level and badges (`[data-badges]`): level, title and
 *   XP bar, the badges earned, the rest dimmed.
 * - Getting started (guide.ts): the step you're on as a card under the header
 *   in the City view (`[data-guide]`, with a way there and an ×), the top row
 *   of the walk tracker, and the list of steps at the top of the Signal
 *   tower's board (where a hidden guide can be shown again).
 * - `onCommit()`, after every save change: finishes guide steps, awards
 *   badges, spots level-ups (a pop under the header and a sound for each),
 *   repaints the lot.
 *
 * Everything here is game progress for fun: Dorras and XP only, no prizes.
 */
import { BADGES, COUNTER_NAMES, MISSIONS, MISSIONS_MAX, abandonMission, acceptMission, activeMissions, checkBadges, claimMission, hasBadge, mission, missionProgress, missionState, type Mission } from './missions';
import { MAX_LEVEL, levelProgress, titleFor } from './catalog';
import { GUIDE_STEPS, level, type ActiveMission, type TycoonSave } from './tycoon';
import { GUIDE, advanceGuide, guideDone, guideStep, hideGuide, type GuideStep } from './guide';
import { D, esc, fmt, repaint, whyNot, type GameDeps } from './ui';

/** A pop stays this long */
const POP_MS = 2500;
/** The tiers on the board: the levels missions come in */
const TIERS = [...new Set(MISSIONS.map((m) => m.level))].sort((a, b) => a - b);
/** A guide step's way in from the City view, in words */
const GO_LABEL: Record<string, string> = { emporium: 'Open the market hall', signal: 'Open the Signal tower', vault: 'Open the Vault' };
const goLabel = (g: GuideStep) => ('open' in g.go ? (GO_LABEL[g.go.open] ?? 'Open it') : 'Walk there');
/** The backup reminder on a level-up: never backed up, or not for this long */
const BACKUP_STALE = 7 * 24 * 3600e3;

export interface MissionsHooks {
  /** A guide step's way in, from the City view: open its building's panel or start walking there */
  go(g: GuideStep): void;
}

export function createMissionsUI(root: HTMLElement, game: GameDeps, hooks: MissionsHooks) {
  const levelEl = root.querySelector<HTMLDetailsElement>('[data-level]');
  const levelSummary = levelEl?.querySelector<HTMLElement>('summary') ?? null;
  const levelTag = levelEl?.querySelector<HTMLElement>('[data-level-tag]') ?? null;
  const levelBar = levelEl?.querySelector<HTMLElement>('[data-level-bar]') ?? null;
  const levelBody = levelEl?.querySelector<HTMLElement>('[data-level-body]') ?? null;
  const tracker = root.querySelector<HTMLElement>('[data-missions-tracker]');
  const trackerPill = tracker?.querySelector<HTMLButtonElement>('[data-tracker-toggle]') ?? null;
  const trackerCount = tracker?.querySelector<HTMLElement>('[data-tracker-count]') ?? null;
  const trackerList = tracker?.querySelector<HTMLElement>('[data-tracker-list]') ?? null;
  const badgesEl = root.querySelector<HTMLElement>('[data-badges]');
  const popsEl = root.querySelector<HTMLElement>('[data-mission-pops]');
  const guideEl = root.querySelector<HTMLElement>('[data-guide]');
  const guideBody = guideEl?.querySelector<HTMLElement>('[data-guide-body]') ?? null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let lastLevel = level(game.save());
  /** The first pass catches an older save up (badges it already earned): pops and toasts, no sounds (the sound engine comes after the economy) */
  let booted = false;

  /* ---------- Copy ---------- */

  /** What a mission asks for, and how far along it is */
  function goalText(m: Mission, p?: { done: number; need: number; complete: boolean }) {
    const g = m.goal;
    if ('counter' in g) return `${fmt.format(p?.done ?? 0)} / ${fmt.format(g.n)} ${COUNTER_NAMES[g.counter]}`;
    return `${p?.done ?? 0} / ${g.plots} district plot${g.plots > 1 ? 's' : ''} owned`;
  }
  const reward = (m: { reward: number; xp: number }) => `<span class="market-price mission-reward">${D(m.reward)}<small class="mission-xp">+${fmt.format(m.xp)} XP</small></span>`;

  /* ---------- The Signal tower's board ---------- */

  function activeRow(s: TycoonSave, a: ActiveMission) {
    const m = mission(a.id)!;
    const p = missionProgress(s, a);
    return `<li class="market-row mission-row${p.complete ? ' is-done' : ''}">
      <div class="market-top"><b>${esc(m.name)}</b>${reward(m)}</div>
      <i class="stall-bar" style="--v:${p.need ? p.done / p.need : 0}"></i>
      <div class="market-acts"><small>${p.complete ? '<b class="stall-serving">Done</b> · claim your reward' : esc(goalText(m, p))}</small>
        <span class="market-btns"><button type="button" data-claim="${m.id}" ${p.complete ? '' : 'disabled'}>Claim</button><button type="button" data-abandon="${m.id}">Give up</button></span></div>
    </li>`;
  }
  function boardRow(m: Mission, lv: number, full: boolean) {
    const locked = lv < m.level;
    const why = locked ? `Needs level ${m.level}.` : full ? `${MISSIONS_MAX} on the go already: finish or give up one first.` : '';
    return `<li class="market-row mission-row${locked ? ' is-locked' : ''}">
      <div class="market-top"><b>${esc(m.name)}</b>${reward(m)}</div>
      <div class="market-acts"><small>${esc(m.blurb)}${why ? ` <span class="mission-why">${esc(why)}</span>` : ''}</small>
        <span class="market-btns"><button type="button" data-take="${m.id}" ${why ? 'disabled' : ''}>Take</button></span></div>
    </li>`;
  }
  /** The board: your missions, then the ones on offer by level, then the ones done */
  function boardHtml(now: number) {
    void now;
    const s = game.save();
    const lv = level(s);
    const active = activeMissions(s);
    const full = active.length >= MISSIONS_MAX;
    const mine = active.length
      ? `<p class="biz-label">Your missions · ${active.length} / ${MISSIONS_MAX}</p><ul class="market-list">${active.map((a) => activeRow(s, a)).join('')}</ul>`
      : `<p class="biz-label">Your missions</p><p class="stall-empty">None on the go. Take one from the board: up to ${MISSIONS_MAX} at once, Dorras and XP when it's done.</p>`;
    const tiers = TIERS.map((t) => {
      const list = MISSIONS.filter((m) => m.level === t && missionState(s, m.id) !== 'done' && missionState(s, m.id) !== 'active');
      if (!list.length) return '';
      const rows = `<ul class="market-list">${list.map((m) => boardRow(m, lv, full)).join('')}</ul>`;
      // Tiers above your level fold up, so the board stays short
      return lv >= t
        ? `<p class="biz-label mission-tier">Level ${t}</p>${rows}`
        : `<details class="mission-fold"><summary>Level ${t} · ${list.length} mission${list.length > 1 ? 's' : ''} · needs level ${t}</summary>${rows}</details>`;
    }).join('');
    const done = s.missions.done.map((id) => mission(id)).filter((m): m is Mission => !!m);
    const doneHtml = done.length
      ? `<details class="mission-fold mission-done"><summary>Done · ${done.length}</summary><ul class="mission-done-list">${done.map((m) => `<li><span>${esc(m.name)}</span>${reward(m)}</li>`).join('')}</ul></details>`
      : '';
    return `<div class="mission-board">${guideBoardHtml(s)}${mine}
      <p class="biz-label">On the board</p>${tiers || '<p class="stall-empty">Every mission on the board is done. More come with the city.</p>'}
      ${doneHtml}
      <p class="city-panel-fine">Only what you do after taking a mission counts towards it. Giving one up costs nothing. Rewards are Dorras and XP for the city's game, nothing more.</p></div>`;
  }

  /** Getting started on the board: every step, done or to do, and Show / Hide */
  function guideBoardHtml(s: TycoonSave) {
    if (guideDone(s)) return '';
    const rows = GUIDE.map((g, i) => {
      const st = i < s.guide.step ? 'is-done' : i === s.guide.step ? 'is-now' : '';
      return `<li class="guide-step ${st}"><i aria-hidden="true">${i < s.guide.step ? '✓' : i + 1}</i><span><b>${esc(g.name)}</b>${i === s.guide.step ? `<small>${esc(g.hint)}</small>` : ''}</span>${reward(g)}</li>`;
    }).join('');
    return `<p class="biz-label">Getting started · ${s.guide.step} / ${GUIDE_STEPS}</p>
      <ol class="guide-list">${rows}</ol>
      <div class="market-btns guide-toggle"><small>${s.guide.hidden ? 'The guide is hidden.' : 'A beam of light marks where to go.'}</small><button type="button" ${s.guide.hidden ? 'data-guide-show' : 'data-guide-hide'}>${s.guide.hidden ? 'Show the guide' : 'Hide the guide'}</button></div>`;
  }

  /** A Take, Claim or Give up button on the board (or the guide's Show / Hide): true when it was one */
  function act(btn: HTMLButtonElement) {
    const ds = btn.dataset;
    const s = game.save();
    if (ds.guideShow !== undefined || ds.guideHide !== undefined) hideGuide(s, ds.guideHide !== undefined);
    else if (ds.claim !== undefined) {
      const m = mission(ds.claim);
      const r = claimMission(s, ds.claim);
      if (r.ok && m) {
        game.toast(`Mission done: ${m.name}. ${fmt.format(r.reward)} Dorras and ${fmt.format(r.xp)} XP.`);
        game.sfx('mission');
      } else {
        game.toast(r.ok ? 'Claimed.' : whyNot(r.why));
        game.sfx('denied');
      }
    } else if (ds.abandon !== undefined) {
      const m = mission(ds.abandon);
      if (abandonMission(s, ds.abandon)) game.toast(`${m?.name ?? 'Mission'} given up.`, 3500);
      else return false;
    } else if (ds.take !== undefined && mission(ds.take)) {
      const m = mission(ds.take)!;
      const r = acceptMission(s, ds.take, Date.now());
      if (r.ok) {
        game.toast(`Mission taken: ${m.name}. ${m.blurb}`);
        game.sfx('mission', 0.6);
      } else {
        game.toast(r.why === 'max' ? `You have ${MISSIONS_MAX} missions on the go already.` : r.why === 'level' ? whyNot('level', m.level) : whyNot(r.why));
        game.sfx('denied');
      }
    } else return false;
    game.commit();
    return true;
  }

  /* ---------- The level pill ---------- */

  function paintLevel() {
    if (!levelEl) return;
    const s = game.save();
    const lp = levelProgress(s.xp);
    const title = titleFor(lp.level);
    const earned = BADGES.filter((b) => hasBadge(s, b.id)).length;
    const toGo = lp.level >= MAX_LEVEL ? 'Top level' : `${fmt.format(lp.toGo)} XP to level ${lp.level + 1}`;
    if (levelTag && levelTag.textContent !== `Lv ${lp.level}`) levelTag.textContent = `Lv ${lp.level}`;
    levelBar?.style.setProperty('--v', String(lp.into));
    const label = `Level ${lp.level}, ${title}. ${toGo}. ${earned} of ${BADGES.length} badges`;
    if (levelSummary && levelSummary.getAttribute('aria-label') !== label) {
      levelSummary.setAttribute('aria-label', label);
      levelSummary.title = `${title} · ${toGo}`;
    }
    if (levelBody)
      repaint(
        levelBody,
        `<p class="level-row"><b class="level-title">${esc(title)}</b><span class="level-xp">${fmt.format(s.xp)} XP</span></p>
        <i class="stall-bar" style="--v:${lp.into}"></i>
        <small class="level-togo">${esc(toGo)}</small>
        <p class="level-row level-badges"><span>Badges</span><b>${earned} / ${BADGES.length}</b></p>
        <p class="level-fine">XP comes from selling, delivering, racing, target practice and the mission board at the Signal tower. Badges and the Profile tab show while walking.</p>`
      );
  }
  // Walking: the pill opens the Profile tab on its badges instead of its own card
  levelSummary?.addEventListener('click', (e) => {
    if (root.dataset.mode !== 'walk') return;
    e.preventDefault();
    if (levelEl) levelEl.open = false;
    const profile = root.querySelector<HTMLDetailsElement>('[data-profile]');
    if (!profile) return;
    profile.open = true;
    requestAnimationFrame(() => badgesEl?.scrollIntoView({ block: 'start', behavior: reduced.matches ? 'auto' : 'smooth' }));
  });

  /* ---------- The Profile tab: level and badges ---------- */

  function badgesHtml() {
    const s = game.save();
    const lp = levelProgress(s.xp);
    const earned = BADGES.filter((b) => hasBadge(s, b.id));
    const locked = BADGES.filter((b) => !hasBadge(s, b.id));
    const row = (b: (typeof BADGES)[number], on: boolean) =>
      `<li class="${on ? 'is-earned' : 'is-locked'}"><i class="badge-mark" aria-hidden="true"></i><b>${esc(b.name)}</b><small>${esc(b.blurb)}${b.xp ? ` +${fmt.format(b.xp)} XP` : ''}</small></li>`;
    return `<p class="walk-skins-head"><span>Level ${lp.level} · ${esc(titleFor(lp.level))}</span><span>${fmt.format(s.xp)} XP</span></p>
      <i class="stall-bar" style="--v:${lp.into}"></i>
      <small class="level-togo">${lp.level >= MAX_LEVEL ? 'Top level' : `${fmt.format(lp.toGo)} XP to level ${lp.level + 1}`}</small>
      <p class="walk-skins-head"><span>Badges</span><span><b>${earned.length}</b> / ${BADGES.length}</span></p>
      <ul class="badge-list">${earned.map((b) => row(b, true)).join('')}${locked.map((b) => row(b, false)).join('')}</ul>`;
  }
  const paintProfile = () => badgesEl && repaint(badgesEl, badgesHtml());

  /* ---------- The walk HUD's tracker ---------- */

  function paintTracker() {
    if (!tracker || !trackerList) return;
    const s = game.save();
    const active = activeMissions(s);
    const g = s.guide.hidden ? null : guideStep(s);
    const n = active.length + (g ? 1 : 0);
    tracker.hidden = !n;
    if (!n) return;
    if (trackerCount && trackerCount.textContent !== String(n)) trackerCount.textContent = String(n);
    trackerPill?.setAttribute('aria-label', `${g ? 'Getting started and ' : ''}${active.length} mission${active.length === 1 ? '' : 's'} on the go`);
    const guideRow = g
      ? `<li class="is-guide"><span class="mt-top"><b>${esc(g.name)}</b><small>Guide · ${s.guide.step + 1} / ${GUIDE_STEPS}</small><button type="button" class="mt-hide" data-guide-hide aria-label="Hide the getting started guide"><svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" /></svg></button></span><small class="mt-hint">${esc(g.hint)}</small></li>`
      : '';
    repaint(
      trackerList,
      guideRow +
      active
        .map((a) => {
          const m = mission(a.id)!;
          const p = missionProgress(s, a);
          return `<li class="${p.complete ? 'is-done' : ''}"><span class="mt-top"><b>${esc(m.name)}</b><small>${p.complete ? 'Claim at the Signal tower' : 'counter' in m.goal || 'plots' in m.goal ? `${fmt.format(p.done)} / ${fmt.format(p.need)}` : 'Race'}</small></span><i class="stall-bar" style="--v:${p.need ? p.done / p.need : 0}"></i></li>`;
        })
        .join('')
    );
  }
  trackerPill?.addEventListener('click', () => {
    const open = tracker!.classList.toggle('is-open');
    trackerPill.setAttribute('aria-expanded', String(open));
  });
  trackerList?.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('[data-guide-hide]')) return;
    hideGuide(game.save(), true);
    game.toast('Guide hidden. Show it again from the board at the Signal tower.', 4000);
    game.commit();
  });

  /* ---------- Getting started in the City view: a card under the header ---------- */

  function paintGuide() {
    if (!guideEl || !guideBody) return;
    const s = game.save();
    const g = s.guide.hidden ? null : guideStep(s);
    guideEl.hidden = !g;
    if (!g) return;
    repaint(
      guideBody,
      `<p class="guide-kicker">Getting started · ${s.guide.step + 1} / ${GUIDE_STEPS}</p>
      <p class="guide-name"><b>${esc(g.name)}</b><span class="guide-reward">${D(g.reward)}<small class="mission-xp">+${fmt.format(g.xp)} XP</small></span></p>
      <p class="guide-hint">${esc(g.hint)}</p>
      <button type="button" class="chip-link" data-guide-go>${esc(goLabel(g))}</button>`
    );
  }
  guideEl?.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const s = game.save();
    if (t.closest('[data-guide-go]')) {
      const g = guideStep(s);
      if (g) hooks.go(g);
    } else if (t.closest('[data-guide-close]')) {
      hideGuide(s, true);
      game.toast('Guide hidden. Show it again from the board at the Signal tower.', 4000);
      game.commit();
    }
  });

  /* ---------- Pops: a level-up, a badge ---------- */

  function pop(big: string, label: string, kind: string) {
    if (!popsEl) return;
    const el = document.createElement('div');
    el.className = `mission-pop ${kind}`;
    el.innerHTML = '<b></b><span></span>';
    el.querySelector('b')!.textContent = big;
    el.querySelector('span')!.textContent = label;
    popsEl.append(el);
    while (popsEl.children.length > 3) popsEl.firstElementChild?.remove();
    window.setTimeout(() => el.remove(), POP_MS);
  }

  /** After every save change: new badges, a level-up, and every view brought up to date */
  function onCommit() {
    const s = game.save();
    for (const g of advanceGuide(s)) {
      const next = guideStep(s);
      game.toast(`Step done: ${g.name}. ${fmt.format(g.reward)} Dorras and ${fmt.format(g.xp)} XP.${next ? ` Next: ${next.name}.` : " That's the city's basics: more missions wait at the Signal tower."}`, 5000);
      pop(g.name, next ? `Getting started · ${s.guide.step} / ${GUIDE_STEPS}` : 'Getting started · done', 'is-badge');
      if (booted) game.sfx('mission');
    }
    for (const b of checkBadges(s)) {
      game.toast(`Badge earned: ${b.name}. ${b.blurb}${b.xp ? ` +${fmt.format(b.xp)} XP.` : ''}`, 4000);
      pop(b.name, `Badge · ${b.blurb}`, 'is-badge');
    }
    const lv = level(s);
    if (lv > lastLevel) {
      const title = titleFor(lv);
      const newTitle = title !== titleFor(lastLevel);
      pop(`Level ${lv}`, newTitle ? `New title · ${title}` : title, 'is-level');
      // Past the guide's level, now and then: the save lives in this browser only
      const remind = booted && lv >= 3 && guideDone(s) && Date.now() - s.backup > BACKUP_STALE ? ' Back up your save at the Vault: it lives in this browser only.' : '';
      game.toast(`${newTitle ? `Level ${lv}! You're now a ${title}.` : `Level ${lv}!`}${remind}`, remind ? 6000 : 4000);
      if (booted) game.sfx('levelup');
    }
    lastLevel = lv;
    booted = true;
    paintLevel();
    paintTracker();
    paintProfile();
    paintGuide();
  }

  paintLevel();
  paintTracker();
  paintProfile();
  paintGuide();
  return { boardHtml, act, paintLevel, badgesHtml, paintTracker, paintProfile, paintGuide, onCommit };
}

export type MissionsUI = ReturnType<typeof createMissionsUI>;
