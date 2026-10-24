/*
 * Your account on the game server (its accounts.ts; docs/multiplayer-plan.md,
 * "Profiles and logging in"). Playing online needs one; single player never
 * asks. An account is a username, an email and a password; logging in (by
 * username or email) gives a session token kept in this browser for 30 days
 * (degen-city-account-v1). While logged in, going online opens the
 * account's player profile, whose name is its username.
 *
 * A password reset link comes back with `?reset=<token>` (`resetInAddress()`).
 */
import type { AccountMe, AuthAnswer, AuthConfig } from '../net/auth';
import type { OwnProfile } from '../net/protocol';

const KEY = 'degen-city-account-v1';

function load(): string | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null') as { token?: unknown } | null;
    return typeof s?.token === 'string' && /^[0-9a-f]{64}$/.test(s.token) ? s.token : null;
  } catch {
    return null;
  }
}

/** A password reset link's token in this page's address (`?reset=`), taken out of it */
export function resetInAddress(): string | null {
  const q = new URLSearchParams(location.search);
  const reset = q.get('reset');
  if (!reset) return null;
  q.delete('reset');
  const rest = q.toString();
  history.replaceState(history.state, '', location.pathname + (rest ? `?${rest}` : '') + location.hash);
  return /^[0-9a-f]{64}$/.test(reset) ? reset : null;
}

export function createAccount(server: string) {
  const base = server.replace(/\/$/, '').replace(/^ws/, 'http');
  let token = load();
  let me: AccountMe | null = null;
  let config: Promise<AuthConfig | null> | null = null;
  const listeners = new Set<() => void>();
  const changed = () => listeners.forEach((f) => f());

  function keep(t: string | null) {
    if (t !== token) me = null;
    token = t;
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

  /** Logged in: keep the session and load the account */
  function answered(a: AuthAnswer) {
    keep(a.token);
    refresh();
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

  return {
    /** The session token, for the game server (null: not logged in) */
    get token() {
      return token;
    },
    /** The account, once loaded */
    get me() {
      return me;
    },
    /** Whether reset emails are set up on the server */
    config() {
      return (config ??= api<AuthConfig>('/auth/config').catch(() => ((config = null), null)));
    },
    async signup(username: string, email: string, password: string) {
      answered(await post<AuthAnswer>('/auth/signup', { username, email, password }));
    },
    /** `name`: the username or the email */
    async login(name: string, password: string) {
      answered(await post<AuthAnswer>('/auth/login', { name, password }));
    },
    /** A reset link to the account's email (`soon`: resets by email aren't set up yet) */
    forgot(name: string) {
      return post<{ sent?: true; soon?: true }>('/auth/forgot', { name });
    },
    async reset(resetToken: string, password: string) {
      answered(await post<AuthAnswer>('/auth/reset', { token: resetToken, password }));
    },
    async setUsername(username: string) {
      updated(await post<AccountMe>('/auth/username', { username }, true));
    },
    async setPassword(password: string, current: string) {
      updated(await post<AccountMe>('/auth/password', { password, current }, true));
    },
    async setEmail(email: string, current: string) {
      updated(await post<AccountMe>('/auth/email', { email, current }, true));
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
