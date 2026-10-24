/*
 * The browser's connection to the game server: one WebSocket, reconnecting
 * with a growing delay if it drops, and the guest token that ties this
 * browser to its player profile (a random secret kept in localStorage; the
 * server only ever stores its hash).
 */
import type { SkinId } from './profile-data';
import { PROTOCOL, type ClientMsg, type ServerMsg } from './protocol';
import { guestToken } from './guest';

/** Server close codes that mean "don't come straight back" (see server/src/room.ts) */
const STOP: Record<number, string> = {
  4001: 'You went online in another tab or window. Go online here to play in this one instead.',
  4002: 'Disconnected for sending too many messages.',
  4004: 'Something went wrong with your guest pass. Reload the page and try again.',
  4006: 'That game has ended. Pick another from the Multiplayer menu.',
};

export type NetState = 'off' | 'connecting' | 'online' | 'retrying' | 'full' | 'error';

export interface NetClient {
  readonly state: NetState;
  /** Round trip to the server in ms (0 until measured) */
  readonly ping: number;
  /** Join a game: `game` is its id (games.ts), or null for the first city with room */
  connect(local: { total: number; skin: SkinId }, game?: string | null): void;
  disconnect(): void;
  send(msg: ClientMsg): void;
  onMessage(fn: (msg: ServerMsg) => void): void;
  onState(fn: (state: NetState, detail?: string) => void): void;
}

/** `auth`: the wallet login's session token, if logged in (account.ts): the room then opens that wallet's profile */
export function createNetClient(base: string, auth?: () => string | null): NetClient {
  // https:// or wss:// both work; a page on https can only open wss://
  const play = base.replace(/\/$/, '').replace(/^http/, 'ws') + '/play';
  let url = play;
  let ws: WebSocket | null = null;
  let state: NetState = 'off';
  let want = false;
  let tries = 0;
  let retry = 0;
  let pinger = 0;
  let ping = 0;
  let local: { total: number; skin: SkinId } = { total: 0, skin: 'olive' };
  const onMsg: ((m: ServerMsg) => void)[] = [];
  const onSt: ((s: NetState, d?: string) => void)[] = [];
  const set = (s: NetState, d?: string) => {
    state = s;
    for (const f of onSt) f(s, d);
  };

  function open() {
    window.clearTimeout(retry);
    set(tries ? 'retrying' : 'connecting');
    let sock: WebSocket;
    try {
      sock = new WebSocket(url);
    } catch {
      return later();
    }
    ws = sock;
    sock.onopen = () => {
      sock.send(JSON.stringify({ t: 'hello', v: PROTOCOL, token: guestToken(), auth: auth?.() ?? undefined, local } satisfies ClientMsg));
    };
    sock.onmessage = (ev) => {
      let m: ServerMsg;
      try {
        m = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (m.t === 'welcome') {
        tries = 0;
        set('online');
        window.clearInterval(pinger);
        pinger = window.setInterval(() => sock.readyState === 1 && sock.send(JSON.stringify({ t: 'ping', c: performance.now() })), 5000);
      } else if (m.t === 'pong') ping = Math.round(performance.now() - m.c);
      else if (m.t === 'full') {
        want = false;
        set('full');
      } else if (m.t === 'error') {
        want = false;
        set('error', m.m);
      }
      for (const f of onMsg) f(m);
    };
    sock.onclose = (e) => {
      if (ws !== sock) return;
      window.clearInterval(pinger);
      ws = null;
      // Closed on purpose by the server: retrying would only make things worse
      // (two tabs would keep knocking each other off)
      const why = STOP[e.code];
      if (want && why) {
        want = false;
        set('error', why);
      } else if (want) later();
      else if (state === 'online' || state === 'connecting' || state === 'retrying') set('off');
    };
  }
  function later() {
    tries++;
    set('retrying');
    retry = window.setTimeout(open, Math.min(15000, 1000 * 2 ** Math.min(tries - 1, 4)));
  }

  return {
    get state() {
      return state;
    },
    get ping() {
      return ping;
    },
    connect(l, game) {
      local = l;
      if (want) return;
      url = game ? `${play}?game=${encodeURIComponent(game)}` : play;
      want = true;
      tries = 0;
      open();
    },
    disconnect() {
      want = false;
      window.clearTimeout(retry);
      const s = ws;
      ws = null;
      s?.close();
      set('off');
    },
    send(msg) {
      if (ws?.readyState === 1) ws.send(JSON.stringify(msg));
    },
    onMessage(fn) {
      onMsg.push(fn);
    },
    onState(fn) {
      onSt.push(fn);
    },
  };
}
