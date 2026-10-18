/*
 * The browser's connection to the game server: one WebSocket, reconnecting
 * with a growing delay if it drops, and the guest token that ties this
 * browser to its player profile (a random secret kept in localStorage; the
 * server only ever stores its hash).
 */
import type { SkinId } from './profile-data';
import { PROTOCOL, type ClientMsg, type ServerMsg } from './protocol';

const TOKEN_KEY = 'degen-city-player-v1';

/** This browser's guest token, made on first use. Without storage it lasts for the visit. */
function guestToken() {
  try {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved && /^[A-Za-z0-9_-]{32,128}$/.test(saved)) return saved;
  } catch {
    /* no storage: a fresh token each visit */
  }
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* fine */
  }
  return token;
}

export type NetState = 'off' | 'connecting' | 'online' | 'retrying' | 'full' | 'error';

export interface NetClient {
  readonly state: NetState;
  /** Round trip to the server in ms (0 until measured) */
  readonly ping: number;
  connect(local: { total: number; skin: SkinId }): void;
  disconnect(): void;
  send(msg: ClientMsg): void;
  onMessage(fn: (msg: ServerMsg) => void): void;
  onState(fn: (state: NetState, detail?: string) => void): void;
}

export function createNetClient(base: string): NetClient {
  // https:// or wss:// both work; a page on https can only open wss://
  const url = base.replace(/\/$/, '').replace(/^http/, 'ws') + '/play';
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
      sock.send(JSON.stringify({ t: 'hello', v: PROTOCOL, token: guestToken(), local } satisfies ClientMsg));
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
    sock.onclose = () => {
      window.clearInterval(pinger);
      if (ws !== sock) return;
      ws = null;
      if (want) later();
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
    connect(l) {
      local = l;
      if (want) return;
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
