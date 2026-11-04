/*
 * Logging in with a wallet (the game server's accounts.ts). The visitor's
 * wallet signs a short message (no transaction, no gas) and the server hands
 * back a session token, kept in this browser for 30 days
 * (degen-city-account-v1). While logged in:
 * - going online opens the wallet's own player profile instead of this
 *   browser's guest one (net/client.ts sends the token),
 * - the profile card (account-ui.ts) shows the basic profile: name, rank,
 *   score and wallet;
 * - the city plays the wallet's own save (saveslot.ts), kept with the account
 *   (cloudsave.ts): logging in or out switches whose save the page plays, so
 *   the page starts again (`onSwitch()`, CityMap.astro), after what's waiting
 *   has gone up (`beforeLogout()`). A session that runs out logs out here
 *   without a switch: the page plays on and says so.
 */
import type { AccountMe } from '../net/auth';
import type { OwnProfile } from '../net/protocol';
import { findWallets, requestAccount, signMessage, walletError, type WalletInfo } from './wallet';
import { slot } from './saveslot';

const KEY = 'degen-city-account-v1';

interface Saved {
  address: string;
  token: string;
}

function load(): Saved | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null') as Saved | null;
    return s && /^0x[0-9a-f]{40}$/.test(s.address) && /^[0-9a-f]{64}$/.test(s.token) ? s : null;
  } catch {
    return null;
  }
}

export function createAccount(server: string) {
  const base = server.replace(/\/$/, '').replace(/^ws/, 'http');
  let saved = load();
  let me: AccountMe | null = null;
  const listeners = new Set<() => void>();
  const changed = () => listeners.forEach((f) => f());
  /** Told when a login or a log-out changes who's logged in */
  const switchFns = new Set<() => void>();
  /** Run (and waited for, briefly) before a log-out */
  const beforeFns = new Set<() => Promise<void>>();

  function keep(s: Saved | null) {
    const who = saved?.address;
    saved = s;
    if (s?.address !== who) me = null;
    try {
      if (s) localStorage.setItem(KEY, JSON.stringify(s));
      else localStorage.removeItem(KEY);
    } catch {
      /* private mode: logged in for this visit only */
    }
    changed();
  }

  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(base + path, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) throw Object.assign(new Error(data.error || `The server said ${res.status}`), { status: res.status });
    return data;
  }
  const authed = () => ({ Authorization: `Bearer ${saved?.token}` });
  const expired = (e: unknown) => (e as { status?: number }).status === 401;

  /** Sign in with a wallet that's already sharing `address` */
  async function loginWith(w: WalletInfo, address: string) {
    const { nonce, message } = await api<{ nonce: string; message: string }>('/auth/nonce', { method: 'POST', body: JSON.stringify({ address }) });
    let signature: string;
    try {
      signature = await signMessage(w, address, message);
    } catch (e) {
      throw new Error(walletError(e));
    }
    const s = await api<Saved>('/auth/session', { method: 'POST', body: JSON.stringify({ nonce, signature }) });
    keep({ address: s.address, token: s.token });
    refresh();
    switchFns.forEach((f) => f());
    return s.token;
  }

  /** Load the basic profile (the server makes the wallet's profile on its first login) */
  async function refresh() {
    if (!saved) return null;
    try {
      me = await api<AccountMe>('/auth/me', { headers: authed() });
      changed();
    } catch (e) {
      // Expired or logged out elsewhere: logged out here too
      if (expired(e)) keep(null);
    }
    return me;
  }

  return {
    /** The logged-in wallet (lowercase), or null */
    get address() {
      return saved?.address ?? null;
    },
    /** The session token, for the game server */
    get token() {
      return saved?.token ?? null;
    },
    /** The basic profile, once loaded */
    get me() {
      return me;
    },
    wallets: findWallets,
    /** Ask a wallet for its account, then for the login signature */
    async login(walletId?: string) {
      const list = await findWallets();
      const w = list.find((x) => x.id === walletId) ?? list[0];
      if (!w) throw new Error('No wallet found in this browser.');
      let address: string;
      try {
        address = await requestAccount(w);
      } catch (e) {
        throw new Error(walletError(e));
      }
      await loginWith(w, address);
    },
    /** The server turned the token down: forget it */
    expired() {
      keep(null);
    },
    async logout() {
      await Promise.all([...beforeFns].map((f) => f().catch(() => {})));
      const token = saved?.token;
      keep(null);
      if (token) await api('/auth/logout', { method: 'POST', body: '{}', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      switchFns.forEach((f) => f());
    },
    /** End every session this wallet has, in every browser (this one too) */
    async logoutAll() {
      if (!saved) return;
      await Promise.all([...beforeFns].map((f) => f().catch(() => {})));
      try {
        await api('/auth/logout-all', { method: 'POST', body: '{}', headers: authed() });
      } catch (e) {
        if (!expired(e)) throw e;
      }
      keep(null);
      switchFns.forEach((f) => f());
    },
    /**
     * Delete the account for good: the server wipes its save, snapshots and
     * profile and ends every session; this browser forgets its copy of the
     * wallet's game (the guest's stays). `confirm` is what was typed.
     */
    async deleteAccount(confirm: string) {
      if (!saved) return;
      const address = saved.address;
      await api('/auth/delete', { method: 'POST', body: JSON.stringify({ confirm }), headers: authed() });
      // (this page's game is the wallet's: it mustn't store itself back before the page starts again)
      if (slot().address === address) slot().seal();
      try {
        const mine = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter((k): k is string => !!k && k.endsWith(`@${address}`));
        for (const k of mine) localStorage.removeItem(k);
      } catch {
        /* the server's copy is gone either way */
      }
      keep(null);
      switchFns.forEach((f) => f());
    },
    /** A login or log-out changed who's logged in (not a session running out) */
    onSwitch(f: () => void) {
      switchFns.add(f);
    },
    /** Something to finish before logging out (the cloud save's last upload) */
    beforeLogout(f: () => Promise<void>) {
      beforeFns.add(f);
    },
    refresh,
    /** A new player name from the word lists */
    async rename() {
      if (!saved) return;
      try {
        const { profile } = await api<{ profile: OwnProfile }>('/auth/rename', { method: 'POST', body: '{}', headers: authed() });
        if (me) me = { ...me, profile };
        changed();
      } catch (e) {
        if (expired(e)) keep(null);
        else throw e;
      }
    },
    /** Profile news from the game room (score, rank, name) while walking online */
    profileChanged(p: OwnProfile) {
      if (!me || p.wallet !== me.address) return;
      me = { ...me, profile: p };
      changed();
    },
    subscribe(f: () => void) {
      listeners.add(f);
      return () => listeners.delete(f);
    },
  };
}

export type Account = ReturnType<typeof createAccount>;
