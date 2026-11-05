/*
 * Your profile and other players' cards (docs/account-plan.md Phase 5), a
 * chunk of its own: fetched the first time the hub's Profile tab opens or a
 * player's card is asked for (index.ts `loadCard()`), so the boot doesn't
 * carry it.
 *
 * - The Profile tab's top (`[data-pcard-own]`): your card as others see it
 *   (name, rank, level and title, pinned badges, play time, records), what
 *   you own (yours only: never on a card), pinning badges (up to PIN_MAX,
 *   earned ones, `togglePin()`), and "See my player card".
 * - The card (`[data-pcard]`, the menus' kit's modal): another player's,
 *   tapped in the hub's Online list (multiplayer.ts asks the room), or your
 *   own. A guest's is their name, rank and target score only; a wallet's
 *   carries its game (net/card.ts, worked out on the server from the save it
 *   checked). Never Dorras, never a wallet address. Names are put on the page
 *   escaped.
 */
import { BADGES, togglePin } from './missions';
import { KART_CLASSES, type ClassId } from './catalog';
import { COURSES, type CourseId } from './kartcircuit';
import { courseLabel } from './kart-records';
import { RANKS, rankFor } from '../net/profile-data';
import { gameCard, ownsOf, playTime, type PlayerCard } from '../net/card';
import { PARTNER_IDS } from './fight-moves';
import { PIN_MAX } from './tycoon';
import { clockOf, esc, fmt, repaint, type GameDeps } from './ui';

/** Who you are, for your own card (index.ts puts it together from the profile and the account) */
export interface Who {
  name: string;
  rank: string;
  score: number;
  account: boolean;
  since?: number;
}

const since = (ms?: number) => (ms ? new Date(ms).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '');
const fact = (dt: string, dd: string) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`;
const rankOf = (id: string, score: number) => RANKS.find((k) => k.id === id) ?? rankFor(score);

/** The badges' row: pinned ones by name, and (yours, on the Profile tab) the empty slots */
function pinsHtml(pinned: string[], empty: boolean) {
  const named = pinned.map((id) => BADGES.find((b) => b.id === id)).filter((b) => !!b);
  const slots = empty ? Array.from({ length: PIN_MAX - named.length }, () => '<li class="is-empty"><i class="badge-mark" aria-hidden="true"></i><span>Pin a badge</span></li>') : [];
  if (!named.length && !slots.length) return '';
  return `<ul class="pcard-pins" aria-label="Pinned badges">${named.map((b) => `<li><i class="badge-mark" aria-hidden="true"></i><span>${esc(b.name)}</span></li>`).join('')}${slots.join('')}</ul>`;
}

/** A card: yours (`own`) or another player's; `slots` shows the pins' empty places (the Profile tab) */
export function cardHtml(c: PlayerCard, own = false, slots = false) {
  const rank = rankOf(c.rank, c.score);
  const g = c.game;
  const head = `<p class="modal-kicker">${own ? 'Your player card' : c.account ? 'Player card' : 'Guest'}</p>
    <h2 class="modal-title pcard-name" id="pcard-title">${esc(c.name)}</h2>
    <p class="pcard-tags"><span class="mp-rank" data-rank="${esc(rank.id)}">${esc(rank.name)}</span>${g ? `<span class="pcard-level">Lv ${g.level} · ${esc(g.title)}</span>` : ''}</p>`;
  if (!g)
    return `${head}<dl class="city-facts pcard-facts">${fact('Target score', fmt.format(c.score))}${c.since ? fact('Playing since', since(c.since)) : ''}</dl>
      <p class="modal-fine">${own ? 'Playing as a guest: others see your name, rank and target score. Log in with a wallet to show your level, badges and records.' : c.account ? 'No game saved yet: their level, badges and records show here once they’ve played.' : 'Playing as a guest: only a wallet’s game shows on its card.'}</p>`;
  const laps = g.karts.laps
    .map(({ key, lap }) => {
      const [course, cls] = key.split(':');
      if (!(course in COURSES)) return '';
      const k = KART_CLASSES[cls as ClassId];
      return fact(`Best lap · ${courseLabel(course as CourseId)}`, `${clockOf(lap)}${k ? ` <small>${esc(k.name)}</small>` : ''}`);
    })
    .join('');
  return `${head}${pinsHtml(g.pinned, slots)}
    <dl class="city-facts pcard-facts">
      ${fact('Badges', `${fmt.format(g.badges)} <small>of ${BADGES.length}</small>`)}
      ${fact('Played', playTime(g.played))}
      ${fact('Target score', fmt.format(c.score))}
      ${c.since ? fact('Playing since', since(c.since)) : ''}
    </dl>
    <p class="mk-label pcard-label">Kart park</p>
    <dl class="city-facts pcard-facts">
      ${fact('Races', fmt.format(g.karts.races))}
      ${fact('Wins', fmt.format(g.karts.wins))}
      ${fact('Podiums', fmt.format(g.karts.podiums))}
      ${fact('Cups won', fmt.format(g.karts.trophies))}
      ${laps}
    </dl>
    <p class="mk-label pcard-label">Fight Club</p>
    <dl class="city-facts pcard-facts">
      ${fact('Bouts', `${fmt.format(g.fights.wins)} won · ${fmt.format(g.fights.losses)} lost`)}
      ${fact('Knock-outs', fmt.format(g.fights.kos))}
      ${fact('Sparring partners', `${fmt.format(g.fights.partners)} <small>of ${PARTNER_IDS.length} beaten</small>`)}
      ${fact('Best chain', fmt.format(g.fights.chain))}
    </dl>`;
}

export function createProfileCard(root: HTMLElement, d: { game: GameDeps; who(): Who }) {
  const own = root.querySelector<HTMLElement>('[data-pcard-own]');
  const modal = root.querySelector<HTMLElement>('[data-pcard]')!;
  const body = modal.querySelector<HTMLElement>('[data-pcard-body]')!;
  let picking = false;
  let lastFocus: HTMLElement | null = null;

  /** Your own card: your save's game (any profile: a guest sees what a wallet would show) */
  const mine = (): PlayerCard => {
    const w = d.who();
    return { ...w, game: gameCard(d.game.save()) };
  };

  function ownHtml() {
    const s = d.game.save();
    const w = d.who();
    const card = mine();
    const o = ownsOf(s);
    const earned = BADGES.filter((b) => s.badges.includes(b.id));
    const picker = picking
      ? `<div class="pcard-pick" role="group" aria-label="Pin badges">
          <p class="mk-note">${s.pinned.length} of ${PIN_MAX} pinned. Tap a badge to pin it or take it off.</p>
          ${earned.length ? `<div class="pcard-pick-list">${earned.map((b) => `<button type="button" class="walk-fp" data-pin="${esc(b.id)}" aria-pressed="${s.pinned.includes(b.id)}"${!s.pinned.includes(b.id) && s.pinned.length >= PIN_MAX ? ' disabled' : ''}>${esc(b.name)}</button>`).join('')}</div>` : '<p class="mk-note">No badges yet: earn them on the Missions tab’s list.</p>'}
          <button type="button" class="mk-btn is-small" data-pin-done>Done</button>
        </div>`
      : '';
    return `<div class="pcard pcard-own-card">${cardHtml(card, true, true)}</div>
      ${picker}
      <div class="modal-acts">
        ${picking ? '' : `<button type="button" class="mk-btn is-small" data-pin-open>${s.pinned.length ? 'Change pinned badges' : 'Pin badges'}</button>`}
        <button type="button" class="mk-btn is-small" data-pcard-mine>See my player card</button>
      </div>
      <p class="mk-label pcard-label">What you own</p>
      <dl class="city-facts pcard-facts">
        ${fact('Vehicles bought', fmt.format(o.vehicles))}
        ${fact('Karts bought', fmt.format(o.karts))}
        ${fact('Guns bought', fmt.format(o.guns))}
        ${fact('Clothes bought', fmt.format(o.clothes))}
        ${fact('Places you run', fmt.format(o.places))}
        ${fact('Fighting styles', fmt.format(o.styles))}
      </dl>
      <p class="mk-note">${w.account ? 'Other players see your card when they tap your name online: never your Dorras or your wallet.' : 'Online, other players see your name, rank and target score. Log in with a wallet to show the rest.'}</p>`;
  }

  function paint() {
    if (own) repaint(own, ownHtml());
  }

  function show(c: PlayerCard, isMine = false) {
    if (modal.hidden) lastFocus = document.activeElement as HTMLElement;
    body.innerHTML = cardHtml(c, isMine);
    modal.hidden = false;
    modal.querySelector<HTMLButtonElement>('[data-pcard-close]')?.focus({ preventScroll: true });
  }
  function close() {
    if (modal.hidden) return false;
    modal.hidden = true;
    lastFocus?.focus?.({ preventScroll: true });
    return true;
  }

  own?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!btn) return;
    const ds = btn.dataset;
    if ('pinOpen' in ds) picking = true;
    else if ('pinDone' in ds) picking = false;
    else if (ds.pin) {
      if (togglePin(d.game.save(), ds.pin)) d.game.commit();
    } else if ('pcardMine' in ds) return show(mine(), true);
    else return;
    paint();
    // (the keyboard stays on the list it was in)
    const again = ds.pin ? own.querySelector<HTMLButtonElement>(`[data-pin="${CSS.escape(ds.pin)}"]`) : own.querySelector<HTMLButtonElement>(ds.pinOpen !== undefined ? '[data-pin], [data-pin-done]' : '[data-pin-open]');
    again?.focus({ preventScroll: true });
  });
  modal.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t === modal || t.closest('[data-pcard-close]')) close();
  });
  // Esc closes the card first (nothing after this sees it)
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && close()) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true
  );

  return { paint, show, close };
}

export type ProfileCard = ReturnType<typeof createProfileCard>;
