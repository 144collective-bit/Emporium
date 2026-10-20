/*
 * Street races in walk mode (races.ts holds the rules, racesite.ts the
 * start line and the checkpoint markers): the race board's menu, the
 * countdown, the race HUD and the results card.
 *
 * - The menu (`data-races`, built on the gun store's `.shop` panel) lists the
 *   four races: name, blurb, the level it needs, par, the prize at par and
 *   your best time. It opens at the race board on foot, or from your car
 *   when it's nearly stopped at the start line. Starting needs your car out
 *   and you in it within START_R of the line.
 * - Starting closes the menu, freezes the car and counts down in big digits
 *   (a beep each, 'go' lets the car loose), then the HUD shows the clock,
 *   "checkpoint n / m", the distance to the next one and a Quit button. The
 *   run steps every frame from the car's position; the site lights the next
 *   checkpoint and the one after.
 * - Finishing pays through finishRun() and commit(), then shows the results
 *   card (time, par, prize, a new best, XP, a level-up). Getting out, leaving
 *   walk mode, Esc or Quit abandons the run: no prize.
 *
 * Arrow keys or the D-pad move between races, Enter / A starts the one
 * picked, Esc / B / E closes.
 */
import { RACES, START_LINE, START_R, clockOf, finishRun, race, startRun, stepRun, type Race, type RaceRun } from './races';
import { level } from './tycoon';
import { D, LV, esc, fmt, repaint, type GameDeps } from './ui';
import type { RaceSite } from './racesite';

/** Tiles to metres (a tile is about 1.8 m) */
const M = 1.8;

export interface RaceDeps {
  game: GameDeps;
  /** Your car, if it's out of the garage: where it is, how fast, and whether you're in it */
  car(): { x: number; z: number; speed: number; driving: boolean } | null;
  /** Lock the car (no throttle or steering) during the countdown */
  onFreeze(on: boolean): void;
  /** The start line's checkpoint markers */
  site: RaceSite;
  /** Opening the menu or the results frees the mouse; closing hands control back */
  onOpen(): void;
  onClose(): void;
}

export function createRaceUI(root: HTMLElement, d: RaceDeps) {
  const el = root.querySelector<HTMLElement>('[data-races]')!;
  const list = el.querySelector<HTMLElement>('[data-races-list]')!;
  const note = el.querySelector<HTMLElement>('[data-races-note]')!;
  const lvEl = el.querySelector<HTMLElement>('[data-races-level]')!;
  const count = root.querySelector<HTMLElement>('[data-race-count]')!;
  const hud = root.querySelector<HTMLElement>('[data-race-hud]')!;
  const clockEl = hud.querySelector<HTMLElement>('[data-race-clock]')!;
  const cpEl = hud.querySelector<HTMLElement>('[data-race-cp]')!;
  const distEl = hud.querySelector<HTMLElement>('[data-race-dist]')!;
  const result = root.querySelector<HTMLElement>('[data-race-result]')!;
  const resultTitle = result.querySelector<HTMLElement>('[data-result-title]')!;
  const resultBody = result.querySelector<HTMLElement>('[data-result-body]')!;

  let open = false;
  let resultOpen = false;
  let run: RaceRun | null = null;
  let pick = 0;
  let sinceRepaint = 0;
  let goTimer = 0;

  /** Why a race can't start from where the car is (null: it can) */
  function carWhy() {
    const c = d.car();
    if (!c || Math.hypot(c.x - START_LINE.x, c.z - START_LINE.z) > START_R) return 'Bring your car to the start line first. The garage is on the south bank, east of here.';
    if (!c.driving) return 'Get in your car to start.';
    return null;
  }

  function paint() {
    const s = d.game.save();
    const lv = level(s);
    const why = carWhy();
    lvEl.innerHTML = `Level <b>${lv}</b>`;
    repaint(
      list,
      RACES.map((r) => {
        const locked = lv < r.level;
        const best = s.races[r.id];
        return `<div class="race-row${locked ? ' is-locked' : ''}" role="listitem" data-race="${r.id}">
  <div class="race-row-head"><b class="race-name">${esc(r.name)}</b>${LV(r.level)}<span class="race-cps">${r.checkpoints.length} checkpoints</span></div>
  <p class="race-blurb">${esc(r.blurb)}</p>
  <dl class="race-meta">
    <div><dt>Par</dt><dd>${clockOf(r.par)}</dd></div>
    <div><dt>Prize at par</dt><dd>${D(r.prize)}</dd></div>
    <div><dt>Your best</dt><dd>${best === undefined ? '<span class="race-none">No time yet</span>' : clockOf(best)}</dd></div>
  </dl>
  <button type="button" class="race-start" data-race-start="${r.id}"${locked || why ? ' disabled' : ''}>${locked ? `LV ${r.level}` : 'Start'}</button>
</div>`;
      }).join('')
    );
    note.textContent = why ?? 'Drive through the checkpoints in order. Any road, any line: only the order counts.';
    note.classList.toggle('is-warn', !!why);
  }

  /* ---------- The countdown and the HUD ---------- */

  function showCount(text: string) {
    count.textContent = text;
    count.hidden = false;
    // Start the pop again for each count
    count.classList.remove('is-pop');
    void count.offsetWidth;
    count.classList.add('is-pop');
  }
  function hideCount() {
    clearTimeout(goTimer);
    goTimer = 0;
    count.hidden = true;
    count.classList.remove('is-pop');
  }
  /** Light the next checkpoint and the one after */
  function markers() {
    if (!run) return d.site.show(null, null);
    const r = race(run.race)!;
    const at = (i: number) => (r.checkpoints[i] ? { x: r.checkpoints[i][0], z: r.checkpoints[i][1] } : null);
    d.site.show(at(run.next), at(run.next + 1));
  }
  const set = (e: HTMLElement, text: string) => {
    if (e.textContent !== text) e.textContent = text;
  };
  function paintHud(c: { x: number; z: number }) {
    if (!run) return;
    const r = race(run.race)!;
    const m = r.checkpoints.length;
    set(clockEl, clockOf(run.t));
    set(cpEl, `${Math.min(run.next + 1, m)} / ${m}`);
    const [cx, cz] = r.checkpoints[Math.min(run.next, m - 1)];
    set(distEl, `${Math.round(Math.hypot(cx - c.x, cz - c.z) * M)} m`);
    hud.classList.toggle('is-counting', run.countdown > 0);
  }

  /* ---------- Starting, finishing, abandoning ---------- */

  function start(id: string) {
    const r = race(id);
    if (!r || run) return;
    const s = d.game.save();
    if (level(s) < r.level) {
      d.game.toast(`${r.name} needs level ${r.level}.`);
      d.game.sfx('denied');
      return;
    }
    const why = carWhy();
    if (why) {
      d.game.toast(why);
      d.game.sfx('denied');
      return;
    }
    run = startRun(id);
    if (!run) return;
    close();
    d.onFreeze(true);
    root.dataset.race = r.name;
    root.classList.add('is-racing');
    hud.hidden = false;
    paintHud(d.car()!);
    markers();
    showCount(String(Math.ceil(run.countdown)));
    d.game.sfx('countdown');
  }
  /** Over: the HUD, the markers and the freeze go, whatever happened */
  function clear() {
    run = null;
    hideCount();
    hud.hidden = true;
    hud.classList.remove('is-counting');
    d.site.show(null, null);
    d.onFreeze(false);
    delete root.dataset.race;
    root.classList.remove('is-racing');
  }
  function finish() {
    if (!run) return;
    const r = race(run.race)!;
    const res = finishRun(d.game.save(), run);
    clear();
    if (!res) return;
    d.game.commit();
    d.game.sfx('finish');
    if (res.levels) setTimeout(() => d.game.sfx('levelup'), 700);
    showResult(r, res);
  }
  function showResult(r: Race, res: NonNullable<ReturnType<typeof finishRun>>) {
    resultTitle.textContent = res.underPar ? 'Under par' : 'Finished';
    resultBody.innerHTML = `<p class="race-result-name">${esc(r.name)}</p>
<p class="race-result-time">${clockOf(res.seconds)}</p>
<p class="race-result-tags">${res.record ? '<span class="race-tag is-best">New best time</span>' : ''}<span class="race-tag${res.underPar ? '' : ' is-over'}">${res.underPar ? `${clockOf(r.par - res.seconds)} under par` : `${clockOf(res.seconds - r.par)} over par`}</span></p>
<dl class="race-meta race-result-meta">
  <div><dt>Par</dt><dd>${clockOf(r.par)}</dd></div>
  <div><dt>Prize</dt><dd>${D(res.prize)}</dd></div>
  <div><dt>XP</dt><dd>+${fmt.format(res.xp)}</dd></div>
</dl>${res.levels ? `<p class="race-levelup">Level up! You're now ${LV(level(d.game.save()))}</p>` : ''}`;
    resultOpen = true;
    result.hidden = false;
    root.classList.add('is-shopping');
    d.onOpen();
    result.querySelector<HTMLButtonElement>('[data-result-ok]')?.focus({ preventScroll: true });
  }
  /** Abandon the run (no prize). True if there was one. */
  function abort() {
    if (!run) return false;
    clear();
    d.game.toast('Race abandoned. No prize this time.', 3500);
    return true;
  }

  /* ---------- The menu ---------- */

  function show() {
    if (open || run) return;
    open = true;
    resultOpen = false;
    result.hidden = true;
    paint();
    el.hidden = false;
    root.classList.add('is-shopping', 'is-races');
    d.onOpen();
    focusPick();
  }
  /** Close the menu or the results card (true if one was open) */
  function close() {
    if (!open && !resultOpen) return false;
    open = resultOpen = false;
    el.hidden = true;
    result.hidden = true;
    root.classList.remove('is-shopping', 'is-races');
    d.onClose();
    return true;
  }
  const focusPick = () => list.querySelector<HTMLButtonElement>(`[data-race-start="${RACES[pick].id}"]`)?.focus({ preventScroll: true });
  function step(dir: number) {
    pick = (pick + dir + RACES.length) % RACES.length;
    focusPick();
  }
  const take = () => start(RACES[pick].id);

  el.querySelector('[data-races-close]')!.addEventListener('click', () => close());
  result.querySelector('[data-result-close]')!.addEventListener('click', () => close());
  result.querySelector('[data-result-ok]')!.addEventListener('click', () => close());
  hud.querySelector('[data-race-quit]')!.addEventListener('click', () => abort());
  list.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-race-start]');
    if (!b || b.disabled) return;
    pick = Math.max(0, RACES.findIndex((r) => r.id === b.dataset.raceStart));
    start(b.dataset.raceStart!);
  });
  list.addEventListener('focusin', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-race-start]');
    if (b) pick = Math.max(0, RACES.findIndex((r) => r.id === b.dataset.raceStart));
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') step(-1);
    else return;
    e.preventDefault();
  });

  return {
    get open() {
      return open || resultOpen;
    },
    /** A race is on (counting down or running) */
    get racing() {
      return !!run;
    },
    show,
    close,
    abort,
    step,
    take,
    /** Every frame while walking: step the run from the car's position, keep the HUD and the menu fresh */
    update(dt: number) {
      if (open && (sinceRepaint += dt) > 1) {
        sinceRepaint = 0;
        paint();
      }
      if (!run) return;
      const c = d.car();
      if (!c || !c.driving) {
        abort();
        return;
      }
      for (const ev of stepRun(run, c.x, c.z, dt)) {
        if (ev === 'count') {
          showCount(String(Math.ceil(run.countdown)));
          d.game.sfx('countdown');
        } else if (ev === 'go') {
          showCount('GO');
          d.game.sfx('go');
          d.onFreeze(false);
          goTimer = window.setTimeout(hideCount, 900);
        } else if (ev === 'checkpoint') {
          d.game.sfx('checkpoint');
          markers();
        } else if (ev === 'finish') {
          finish();
          return;
        }
      }
      paintHud(c);
    },
  };
}

export type RaceUI = ReturnType<typeof createRaceUI>;
