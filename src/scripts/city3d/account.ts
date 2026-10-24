/*
 * Your account on the game server (its accounts.ts; docs/multiplayer-plan.md,
 * "Profiles and logging in"). Playing online needs one; single player never
 * asks. Logged in with a username and password, Google, Discord or a
 * wallet (any of them linked to the same account), the server hands back a
 * session token kept in this browser for 30 days (degen-city-account-v1).
 * While logged in, going online opens the account's player profile, whose
 * name is its username.
 *
 * Google and Discord leave the page for their sign-in and come back with
 * `?login=<code>` (`claimInAddress()`); a reset link comes back with
 * `?reset=<token>`. A first sign-in with Google, Discord or a wallet comes
 * back pending: it's finished with a username (`finish()`).
 */
import type { AccountMe, AuthAnswer, AuthConfig, Provider, Way } from '../net/auth';
import type { OwnProfile } from '../net/protocol';
import { findWallets, requestAccount, signMessage, walletError } from './wallet';

const KEY = 'degen-city-account-v1';

function load(): string | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null') as { token?: unknown } | null;
    return typeof s?.token === 'string' && /^[0-9a-f]{64}$/.test(s.token) ? s.token : null;
  } catch {
    return null;
  }
}

/** A sign-in from Google or Discord (`?login=`) or a reset link (`?reset=`) in this page's address, taken out of it */
export function claimInAddress(): { login?: string; reset?: string } | null {
  const q = new URLSearchParams(location.search);
  const login = q.get('login');
  const reset = q.get('reset');
  if (!login && !reset) return null;
  q.delete('login');
  q.delete('reset');
  const rest = q.toString();
  history.replaceState(history.state, '', location.pathname + (rest ? `?${rest}` : '') + location.hash);
  return {
    ...(login && /^[0-9a-f]{32}$/.test(login) ? { login } : {}),
    ...(reset && /^[0-9a-f]{64}$/.test(reset) ? { reset } : {}),
  };
}

export function createAccount(server: string) {
  const base = server.replace(/\/$/, '').replace(/^ws/, 'http');
  let token = load();
  let me: AccountMe | null = null;
  /** A first sign-in waiting for its username */
  let pending: { pass: string; way: Way } | null = null;
  let config: Promise<AuthConfig | null> | null = null;
  const listeners = new Set<() => void>();
  const changed = () => listeners.forEach((f) => f());

  function keep(t: string | null) {
    if (t !== token) me = null;
    token = t;
    if (t) pending = null;
    try {
      if (t) localStorage.setItem(KEY, JSON.stringify({ token: t }));
      else localStorage.removeItem(KEY);
    } catch {
      /* private mode: logged in for this visit only */
    }
    changed();
  }

  async function api<T>(path: string, init?: RequestInit & { auth?: boolean }): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (init?.auth && token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(base + path, { ...init, headers });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (res.status === 401 && init?.auth) keep(null);
    if (!res.ok) throw Object.assign(new Error(data.error || `The game server said ${res.status}`), { status: res.status });
    return data;
  }
  const post = <T>(path: string, body: unknown, auth = false) => api<T>(path, { method: 'POST', body: JSON.stringify(body), auth });

  /** A way in answered: logged in, or a first sign-in waiting for a username */
  function answered(a: AuthAnswer | { linked: true }) {
    if ('token' in a) {
      keep(a.token);
      refresh();
    } else if ('pending' in a) {
      pending = { pass: a.pending, way: a.way };
      changed();
    } else refresh();
  }

  /** The account (and its profile), from the server */
  async function refresh() {
    if (!token) return null;
    try {
      me = await api<AccountMe>('/auth/me', { auth: true });
      changed();
    } catch {
      /* logged out elsewhere (api() forgot the token), or the server is away for now */
    }
    return me;
  }
  /** After a change the server answers with the account as it is now */
  const updated = (m: AccountMe) => {
    me = m;
    changed();
  };

  /** Sign a wallet's login message (`link`: add the wallet to this account) */
  async function wallet(walletId: string | undefined, link: boolean) {
    const list = await findWallets();
    const w = list.find((x) => x.id === walletId) ?? list[0];
    if (!w) throw new Error('No wallet found in this browser.');
    let address: string;
    let signature: string;
    let nonce: string;
    try {
      address = await requestAccount(w);
      const n = await post<{ nonce: string; message: string }>('/auth/nonce', { address });
      nonce = n.nonce;
      signature = await signMessage(w, address, n.message);
    } catch (e) {
      throw new Error(walletError(e));
    }
    answered(await post<AuthAnswer | { linked: true }>('/auth/session', { nonce, signature, ...(link ? { link: true } : {}) }, link));
  }

  return {
    /** The session token, for the game server (null: not logged in) */
    get token() {
      return token;
    },
    /** The account, once loaded */
    get me() {
      return me;
    },
    /** A first sign-in with Google, Discord or a wallet, waiting for its username */
    get pending() {
      return pending?.way ?? null;
    },
    /** Which ways in the server has set up (Google, Discord, reset emails) */
    config() {
      return (config ??= api<AuthConfig>('/auth/config').catch(() => ((config = null), null)));
    },
    wallets: findWallets,
    async signup(username: string, email: string, password: string) {
      answered(await post<AuthAnswer>('/auth/signup', { username, email, password }));
    },
    /** `name`: the username or the email */
    async login(name: string, password: string) {
      answered(await post<AuthAnswer>('/auth/login', { name, password }));
    },
    /** Off to Google or Discord to sign in (`link`: add it to this account); they send the player back with `?login=` */
    async provider(p: Provider, link = false) {
      const { url } = await post<{ url: string }>('/auth/oauth', { provider: p, ...(link ? { link: true } : {}) }, link);
      location.assign(url);
    },
    /** Back from Google or Discord: what the sign-in came to */
    async claim(code: string) {
      answered(await post<AuthAnswer | { linked: true }>('/auth/claim', { code }));
    },
    wallet: (walletId?: string) => wallet(walletId, false),
    linkWallet: (walletId?: string) => wallet(walletId, true),
    /** A first sign-in's username */
    async finish(username: string) {
      if (!pending) throw new Error('That sign-in has expired. Start again.');
      answered(await post<AuthAnswer>('/auth/finish', { pending: pending.pass, username }));
    },
    cancelPending() {
      pending = null;
      changed();
    },
    /** A reset link's email (`soon`: resets by email aren't set up yet) */
    forgot(name: string) {
      return post<{ sent?: true; soon?: true }>('/auth/forgot', { name });
    },
    async reset(resetToken: string, password: string) {
      answered(await post<AuthAnswer>('/auth/reset', { token: resetToken, password }));
    },
    async setUsername(username: string) {
      updated(await post<AccountMe>('/auth/username', { username }, true));
    },
    /** A first password needs the email too; changing one needs the current one */
    async setPassword(password: string, current?: string, email?: string) {
      updated(await post<AccountMe>('/auth/password', { password, current, email }, true));
    },
    async setEmail(email: string, current?: string) {
      updated(await post<AccountMe>('/auth/email', { email, current }, true));
    },
    async unlink(way: Way) {
      updated(await post<AccountMe>('/auth/unlink', { way }, true));
    },
    async logout() {
      const t = token;
      keep(null);
      if (t) await fetch(`${base}/auth/logout`, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` } }).catch(() => {});
    },
    refresh,
    /** Profile news from the game room (score, rank, look) while playing online */
    profileChanged(p: OwnProfile) {
      if (!me) return;
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
