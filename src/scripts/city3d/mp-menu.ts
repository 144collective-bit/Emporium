/*
 * The Multiplayer menu (docs/multiplayer-plan.md, "The Multiplayer menu and
 * its games"): helps a player find the game and the mode they want.
 *
 * 1. You: playing online needs an account (Log in / Make an account open
 *    the account card, account-ui.ts); logged in, the profile: its name (the
 *    username), rank and look, and Your account.
 * 2. Pick a mode: Hangout, and the modes still to come (they say so).
 * 3. Find a game: Browse the mode's open games, or make a private one and
 *    share its link (whoever opens it lands here, on that game).
 * 4. Where to start: the Emporium, The Trenches, the kart park, the stadium,
 *    or next to the friend whose link it was.
 *
 * Opened from the start menu's Multiplayer, an invite link, the city's ☰ Menu
 * and walk mode's Online tab; `play()` hands the choice to the city. Loaded
 * only when it's first opened, and only on a site built with a game server.
 * The only thing players type that others see is their username (filtered,
 * net/auth.ts); games are listed by mode and map.
 */
import { GAME_MODES, GAME_MODE_IDS, MAP_NAMES, gameIdOk, isPrivateId, type GameInfo, type GameMode, type MapId } from '../net/games';
import { RANKS } from '../net/profile-data';
import type { OwnProfile } from '../net/protocol';
import type { StartSpot } from './index';

export interface MpChoice {
  /** The game's id, or null for the first city with room */
  game: string | null;
  spot: StartSpot;
  /** The friend whose link it was (spot `friend`) */
  friend: string | null;
}

export interface MpMenuDeps {
  root: HTMLElement;
  /** The game server's address (PUBLIC_GAME_SERVER) */
  server: string;
  /** The account (account.ts), null until it's loaded */
  account(): { readonly token: string | null; subscribe(f: () => void): void } | null;
  /** Open the account card: on Log in, Make an account, or the account itself */
  openAccount(view?: 'login' | 'signup'): void;
  /** Play the chosen game */
  play(c: MpChoice): void;
  /** In the city: the game this player is in now (null: not online), and leaving online play */
  current(): { id: string; name: string } | null;
  leave: (() => void) | null;
}

type Step = 'you' | 'mode' | 'find' | 'made' | 'spot';

const SPOTS: { id: StartSpot; name: string; sub: string }[] = [
  { id: 'emporium', name: 'The Emporium', sub: 'Downtown' },
  { id: 'trenches', name: 'The Trenches', sub: "The Block's plaza" },
  { id: 'karts', name: 'The kart park', sub: 'Its gate, north of the highway' },
  { id: 'stadium', name: 'The stadium', sub: 'Its forecourt, north of Westlake Park' },
];

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
/** Where the menu was when the player went to log in (Google and Discord leave the page): CityMap.astro carries on from it */
const RESUME = 'degen-city-mp-resume';
const LOOK_NAMES: Record<string, string> = { suit: 'a suit', hoodie: 'a hoodie', track: 'a track suit', varsity: 'a varsity jacket', puffer: 'a puffer jacket' };

/** The invite link for a private game: the site's own address with the game's id and who shared it */
export function inviteLink(game: string, from: string | null) {
  const u = new URL(location.pathname, location.origin);
  u.searchParams.set('game', game);
  if (from) u.searchParams.set('with', from);
  return u.toString();
}

/** An invite in this page's address (`?game=` and `&with=`), if it's a game id */
export function inviteInAddress(): { game: string; friend: string | null } | null {
  const q = new URLSearchParams(location.search);
  const game = q.get('game');
  if (!gameIdOk(game)) return null;
  const friend = q.get('with');
  return { game, friend: friend && friend.length <= 40 ? friend : null };
}

export function createMpMenu(d: MpMenuDeps) {
  const el = document.createElement('div');
  el.className = 'mpm';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'mpm-title');
  el.innerHTML = `<div class="mpm-card">
    <button type="button" class="mpm-x" data-act="close" aria-label="Close the Multiplayer menu"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" /></svg></button>
    <p class="mpm-kicker">Multiplayer · beta</p>
    <div class="mpm-body" data-mpm-body></div>
  </div>`;
  d.root.append(el);
  const body = el.querySelector<HTMLElement>('[data-mpm-body]')!;

  let step: Step = 'you';
  let mode: GameMode = 'hangout';
  let map: MapId = 'sector7';
  let me: OwnProfile | null = null;
  let meError = '';
  let games: GameInfo[] | null = null;
  let gamesError = '';
  let made: GameInfo | null = null;
  /** The game picked (null: the first city with room) and the friend whose link it was */
  let game: string | null = null;
  let friend: string | null = null;
  let busy = false;
  let copied = false;
  let back: HTMLElement | null = null;

  const base = d.server.replace(/\/$/, '').replace(/^ws/, 'http');
  function headers(): Record<string, string> {
    const t = d.account()?.token;
    return t ? { Authorization: `Bearer ${t}` } : {};
  }
  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(base + path, { ...init, headers: { ...headers(), ...(init?.body ? { 'Content-Type': 'application/json' } : {}) } });
    const json = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) throw Object.assign(new Error(json.error ?? `The game server said ${res.status}`), { status: res.status });
    return json;
  }

  async function loadMe() {
    meError = '';
    me = null;
    if (!d.account()?.token) return paint();
    paint();
    try {
      me = (await call<{ profile: OwnProfile }>('/me')).profile;
    } catch (e) {
      // (logged out elsewhere: the account card's own check forgets the token, and this asks to log in)
      if ((e as { status?: number }).status !== 401) meError = "Can't reach the game server right now.";
    }
    paint();
  }
  /** Off to log in, the menu's place kept for after */
  function login(view: 'login' | 'signup') {
    try {
      sessionStorage.setItem(RESUME, JSON.stringify({ game, friend }));
    } catch {
      /* fine: they pick the game again */
    }
    d.openAccount(view);
  }
  async function loadGames() {
    games = null;
    gamesError = '';
    paint();
    try {
      games = (await call<{ games: GameInfo[] }>(`/games?mode=${mode}`)).games;
    } catch {
      gamesError = "Can't reach the game server right now.";
    }
    paint();
  }
  async function create() {
    if (busy) return;
    busy = true;
    gamesError = '';
    paint();
    try {
      made = (await call<{ game: GameInfo }>('/games', { method: 'POST', body: JSON.stringify({ mode, map }) })).game;
      copied = false;
      go('made');
    } catch (e) {
      gamesError = e instanceof Error ? e.message : "Couldn't make the game. Try again.";
    }
    busy = false;
    paint();
  }

  /* ---------- The steps ---------- */

  function youView() {
    const rank = me ? (RANKS.find((r) => r.id === me!.rank) ?? RANKS[0]).name : '';
    const look = me ? (LOOK_NAMES[me.look.kind] ?? 'your look') : '';
    const where = d.current();
    const loggedIn = !!d.account()?.token;
    return `<h2 class="mpm-title" id="mpm-title">You</h2>
      ${where ? `<p class="mpm-now">You're in <b>${esc(where.name)}</b>.</p>` : ''}
      ${
        !loggedIn
          ? `<p class="mpm-line">Playing online needs an account: your username is the name other players see, and your profile follows you to any browser you log in from.</p>
      <div class="mpm-pair">
        <button type="button" class="city-start-btn mpm-half" data-act="login"><span class="city-start-btn-name">Log in</span></button>
        <button type="button" class="city-start-btn mpm-half" data-act="signup"><span class="city-start-btn-name">Sign up</span></button>
      </div>
      <p class="mpm-note">With a username and password, Google, Discord or a wallet. Single player never asks you to log in.</p>`
          : me
            ? `<div class="mpm-you">
        <p class="mpm-name">${esc(me.name)}</p>
        <p class="mpm-line">${esc(rank)} · your account's profile</p>
        <p class="mpm-line">Wearing ${esc(look)}: change your look at Drop 001 in the city.</p>
      </div>
      <div class="mpm-pair">
        <button type="button" class="mpm-small" data-act="account">Your account</button>
      </div>
      <p class="mpm-note">Online progress is its own: your single player save stays as it is.</p>`
            : meError
              ? `<p class="mpm-error">${esc(meError)}</p><button type="button" class="mpm-small" data-act="retry-me">Try again</button>`
              : '<p class="mpm-wait">Finding your profile…</p>'
      }
      ${
        me
          ? game
            ? `<button type="button" class="city-start-btn" data-act="to-spot"><span class="city-start-btn-name">Next</span><span class="city-start-btn-sub">${isPrivateId(game) ? 'Your friend’s private game' : 'Where to start'}</span></button>`
            : `<button type="button" class="city-start-btn" data-act="to-mode"><span class="city-start-btn-name">Pick a mode</span><span class="city-start-btn-sub">Hangout, matches, races and fights</span></button>`
          : ''
      }
      ${where && d.leave ? '<button type="button" class="mpm-small mpm-leave" data-act="leave">Leave online play</button>' : ''}`;
  }

  function modeView() {
    return `<h2 class="mpm-title" id="mpm-title">Pick a mode</h2>
      <div class="mpm-list">${GAME_MODE_IDS.map((id) => {
        const m = GAME_MODES[id];
        return `<button type="button" class="city-start-btn" data-act="mode" data-mode="${id}" ${m.ready ? '' : 'aria-disabled="true"'}>
          <span class="city-start-btn-name">${esc(m.name)}</span>
          <span class="city-start-btn-sub">${m.ready ? esc(m.blurb) : `Coming soon · ${esc(m.blurb)}`}</span>
        </button>`;
      }).join('')}</div>
      <button type="button" class="city-start-back" data-act="to-you">Back</button>`;
  }

  function findView() {
    const m = GAME_MODES[mode];
    const list =
      games === null
        ? gamesError
          ? `<p class="mpm-error">${esc(gamesError)}</p><button type="button" class="mpm-small" data-act="refresh">Try again</button>`
          : '<p class="mpm-wait">Finding games…</p>'
        : games.length
          ? `<ul class="mpm-games">${games
              .map(
                (g) => `<li><span class="mpm-game"><b>${esc(GAME_MODES[g.mode].name)} · ${esc(MAP_NAMES[g.map])}</b><small>${esc(g.name)}</small></span>
              <button type="button" class="mpm-small" data-act="join" data-id="${esc(g.id)}">Join</button></li>`,
              )
              .join('')}</ul>`
          : '<p class="mpm-wait">No open games yet. Make one below.</p>';
    const maps =
      m.maps.length > 1
        ? `<div class="city-start-seg" role="group" aria-label="Map">${m.maps
            .map((id) => `<button type="button" data-act="map" data-map="${id}" aria-pressed="${id === map}">${esc(MAP_NAMES[id])}</button>`)
            .join('')}</div>`
        : `<p class="mpm-line">Map: ${esc(MAP_NAMES[map])}</p>`;
    return `<h2 class="mpm-title" id="mpm-title">${esc(m.name)}</h2>
      <p class="mpm-label">Open games <button type="button" class="mpm-link" data-act="refresh">Refresh</button></p>
      ${list}
      <p class="mpm-label">Private game</p>
      <p class="mpm-line">Only people with its link can join.</p>
      ${maps}
      ${games !== null && gamesError ? `<p class="mpm-error">${esc(gamesError)}</p>` : ''}
      <button type="button" class="mpm-small" data-act="create" ${busy ? 'disabled' : ''}>Make a private game</button>
      <button type="button" class="city-start-back" data-act="to-mode">Back</button>`;
  }

  function madeView() {
    const link = made ? inviteLink(made.id, me?.name ?? null) : '';
    return `<h2 class="mpm-title" id="mpm-title">Your private game</h2>
      <p class="mpm-line">${made ? `${esc(GAME_MODES[made.mode].name)} · ${esc(MAP_NAMES[made.map])}` : ''}. Send this link to your friends: opening it brings them straight to you.</p>
      <input class="mpm-linkbox" type="text" readonly value="${esc(link)}" aria-label="Invite link" data-mpm-link />
      <button type="button" class="mpm-small" data-act="copy">${copied ? 'Copied' : 'Copy link'}</button>
      <button type="button" class="city-start-btn" data-act="to-spot"><span class="city-start-btn-name">Go in</span><span class="city-start-btn-sub">Where to start</span></button>
      <button type="button" class="city-start-back" data-act="to-find">Back</button>`;
  }

  function spotView() {
    const spots = friend ? [{ id: 'friend' as StartSpot, name: `Next to ${friend}`, sub: 'The friend whose link this is' }, ...SPOTS] : SPOTS;
    return `<h2 class="mpm-title" id="mpm-title">Where to start</h2>
      <div class="mpm-list">${spots
        .map(
          (s) => `<button type="button" class="city-start-btn" data-act="play" data-spot="${s.id}">
          <span class="city-start-btn-name">${esc(s.name)}</span><span class="city-start-btn-sub">${esc(s.sub)}</span></button>`,
        )
        .join('')}</div>
      <button type="button" class="city-start-back" data-act="${made ? 'to-made' : friend || (game && isPrivateId(game)) ? 'to-you' : 'to-find'}">Back</button>`;
  }

  function paint() {
    if (el.hidden) return;
    const focused = (document.activeElement as HTMLElement | null)?.dataset.act;
    body.innerHTML = { you: youView, mode: modeView, find: findView, made: madeView, spot: spotView }[step]();
    // Keep the focus where it was across a repaint (the same button), else on the step's first
    const again = focused && body.querySelector<HTMLElement>(`[data-act="${focused}"]`);
    (again || body.querySelector<HTMLElement>('button:not([disabled]):not([aria-disabled="true"])'))?.focus({ preventScroll: true });
  }
  function go(s: Step) {
    step = s;
    if (s === 'find') loadGames();
    else paint();
    body.scrollTop = 0;
    // A new step: focus its first button (not wherever the last one was)
    body.querySelector<HTMLElement>('button:not([disabled]):not([aria-disabled="true"])')?.focus({ preventScroll: true });
  }

  el.addEventListener('click', async (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!b || b.getAttribute('aria-disabled') === 'true') return;
    switch (b.dataset.act) {
      case 'close':
        return close();
      case 'login':
      case 'signup':
        return login(b.dataset.act as 'login' | 'signup');
      case 'retry-me':
        return loadMe();
      case 'account':
        return d.openAccount();
      case 'leave':
        d.leave?.();
        return close();
      case 'to-you':
        game = friend ? game : null;
        return go('you');
      case 'to-mode':
        return go('mode');
      case 'to-find':
        return go('find');
      case 'to-made':
        return go('made');
      case 'to-spot':
        if (made) game = made.id;
        return go('spot');
      case 'mode':
        mode = b.dataset.mode as GameMode;
        map = GAME_MODES[mode].maps[0];
        made = null;
        return go('find');
      case 'map':
        map = b.dataset.map as MapId;
        return paint();
      case 'refresh':
        return loadGames();
      case 'create':
        return create();
      case 'join':
        game = b.dataset.id!;
        made = null;
        return go('spot');
      case 'copy': {
        const box = el.querySelector<HTMLInputElement>('[data-mpm-link]');
        if (!box) return;
        try {
          await navigator.clipboard.writeText(box.value);
        } catch {
          box.select();
          document.execCommand?.('copy');
        }
        copied = true;
        return paint();
      }
      case 'play': {
        const spot = b.dataset.spot as StartSpot;
        const c: MpChoice = { game, spot, friend: spot === 'friend' ? friend : null };
        close();
        d.play(c);
        return;
      }
    }
  });
  // While it's open no other key handler hears the keyboard (Space on a button never jumps); Esc closes it
  el.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') close();
  });

  function open(o: { game?: string; friend?: string | null } = {}) {
    back = document.activeElement as HTMLElement | null;
    game = o.game ?? null;
    friend = o.friend ?? null;
    made = null;
    step = 'you';
    el.hidden = false;
    paint();
    loadMe();
  }
  function close() {
    if (el.hidden) return;
    el.hidden = true;
    back?.focus?.({ preventScroll: true });
  }
  // Logging in or out changes whose profile this is
  let token = d.account()?.token ?? null;
  d.account()?.subscribe(() => {
    const t = d.account()?.token ?? null;
    if (t === token) return;
    token = t;
    if (!el.hidden) loadMe();
  });

  return {
    open,
    close,
    get isOpen() {
      return !el.hidden;
    },
  };
}

export type MpMenu = ReturnType<typeof createMpMenu>;
