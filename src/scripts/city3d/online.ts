/*
 * The Online / Offline switch in the mode header (only when the site is built
 * with a game server, PUBLIC_GAME_SERVER). One choice for the whole city:
 *
 * - Online: walking joins the shared city (multiplayer.ts) and Build mode
 *   sells real plots through the visitor's wallet (land.ts).
 * - Offline: solo walking, and Build mode is the labelled demo with play
 *   money (store.ts). Nothing talks to the game server.
 *
 * The choice is remembered in this browser (degen-city-online-v1).
 */
import type { NetState } from '../net/client';

const KEY = 'degen-city-online-v1';

function saved() {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export interface OnlineStatus {
  /** Walking and connected, connecting, or failed (multiplayer.ts) */
  state: NetState;
  room: string;
  players: number;
}

export function createOnlineSwitch(root: HTMLElement) {
  const el = root.querySelector<HTMLElement>('[data-online-switch]')!;
  const dot = el.querySelector<HTMLElement>('[data-online-dot]')!;
  const btns = [...el.querySelectorAll<HTMLButtonElement>('[data-online-set]')];
  const toastEl = root.querySelector<HTMLElement>('[data-toast]')!;
  const listeners: ((on: boolean) => void)[] = [];
  let on = saved();
  let status: OnlineStatus | null = null;
  let toastTimer = 0;

  function toast(msg: string) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('is-on'), 4200);
  }

  function paint() {
    root.dataset.online = on ? 'on' : 'off';
    for (const b of btns) b.setAttribute('aria-pressed', String((b.dataset.onlineSet === 'on') === on));
    // Grey offline; cyan ready (online, not walking); then the connection while walking
    const s = on ? (status && status.state !== 'off' ? status.state : 'ready') : 'off';
    dot.dataset.state = s;
    el.title = !on
      ? 'Offline: solo walking, and Build mode is a demo with play money'
      : s === 'online' && status
        ? `Online: in ${status.room} with ${status.players} ${status.players === 1 ? 'Degen' : 'Degens'}`
        : s === 'connecting' || s === 'retrying'
          ? 'Online: joining a city…'
          : s === 'full'
            ? 'Online: every city is full right now'
            : s === 'error'
              ? 'Online: the game server can\'t be reached'
              : 'Online: walking joins other players, and Build mode sells real plots';
  }

  function set(next: boolean) {
    if (next === on) return;
    on = next;
    try {
      localStorage.setItem(KEY, on ? 'on' : 'off');
    } catch {
      /* private mode: this visit only */
    }
    paint();
    listeners.forEach((f) => f(on));
    toast(on ? 'Online: walk to join other players. Build mode sells real plots.' : 'Offline: solo walking. Build mode is a demo with play money.');
  }

  for (const b of btns)
    b.addEventListener('click', () => {
      const want = b.dataset.onlineSet === 'on';
      // The narrowest phones show only the current side: tapping it flips
      const alone = btns.every((o) => o === b || !o.getClientRects().length);
      set(want === on && alone ? !on : want);
    });
  el.hidden = false;
  paint();

  return {
    get on() {
      return on;
    },
    set,
    onChange(f: (on: boolean) => void) {
      listeners.push(f);
    },
    /** Multiplayer's connection changed */
    status(s: OnlineStatus) {
      status = s;
      paint();
    },
  };
}
