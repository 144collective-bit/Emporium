/*
 * Accounts: logging in (docs/multiplayer-plan.md, "Profiles and logging
 * in"). One Durable Object for the whole game. Playing online needs an
 * account; single player never asks for one.
 *
 * An account is a username (the name others see, through the filter in
 * net/auth.ts), an email (private: where a password reset link goes) and a
 * password (PBKDF2, login.ts). Five wrong tries lock a username for a while
 * (an address after more). Logging in, by username or email, gives a
 * session token (30 days); only hashes of tokens and reset links are stored.
 *
 * Each account opens one player Profile (profile.ts), fresh when it's made.
 *
 * Storage: `user:<id>`, `name:<username lower case>`, `email:<lower case>`
 * (each an account id), `session:` and `reset:` (by hash), `tries:name:` /
 * `tries:ip:`.
 */
import { DurableObject } from 'cloudflare:workers';
import { emailKey, emailOk, nameKey, passwordProblem, usernameProblem, blockedList, type AccountMe, type AuthAnswer, type AuthConfig } from '../../src/scripts/net/auth';
import type { OwnProfile } from '../../src/scripts/net/protocol';
import type { Env } from './index';
import { sha256 } from './keys';
import { TRIES, backTo, checkPassword, hashPassword, lockedOut, randomHex, resetEmail, stale, wrongTry, type PasswordHash, type Tries } from './login';

const MINUTE = 60_000;
const SESSION_TTL = 30 * 24 * 60 * MINUTE;
const RESET_TTL = 30 * MINUTE;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (status: number, message: string) => json({ error: message }, status);
const bearer = (auth: string | null) => /^Bearer ([0-9a-f]{64})$/.exec(auth ?? '')?.[1] ?? null;
const str = (v: unknown, max = 300) => (typeof v === 'string' && v.length <= max ? v : '');

export interface User {
  id: string;
  username: string;
  email: string;
  pw: PasswordHash;
  /** Its player Profile's name (profile.ts) */
  profile: string;
  created: number;
}
/** Who a session token belongs to (the rooms and the Worker's routes ask) */
export interface Who {
  id: string;
  username: string;
  profile: string;
}
interface Session {
  user: string;
  exp: number;
}

export class Accounts extends DurableObject<Env> {
  private hits = new Map<string, { n: number; t: number }>();

  private ip(req: Request) {
    return req.headers.get('CF-Connecting-IP') ?? 'local';
  }
  /** At most `n` requests a minute of one kind from one address */
  private limited(req: Request, kind: string, n: number) {
    const k = `${kind}:${this.ip(req)}`;
    const now = Date.now();
    const h = this.hits.get(k);
    if (!h || now - h.t > MINUTE) {
      this.hits.set(k, { n: 1, t: now });
      if (this.hits.size > 5000) this.hits.clear();
      return false;
    }
    return ++h.n > n;
  }
  private config(): AuthConfig {
    return { email: !!this.env.EMAIL_API_KEY };
  }

  /* ---------- Accounts and sessions ---------- */

  private user(id: string) {
    return this.ctx.storage.get<User>(`user:${id}`);
  }
  private async saveUser(u: User) {
    await this.ctx.storage.put(`user:${u.id}`, u);
  }
  private profileOf(u: User) {
    return this.env.PROFILES.get(this.env.PROFILES.idFromName(u.profile));
  }
  /** Its profile opened under its username (made on the first open) */
  private async openProfile(u: User) {
    return (await this.profileOf(u).open(u.username)) as OwnProfile;
  }
  private async session(u: User): Promise<AuthAnswer> {
    const token = randomHex(32);
    await this.ctx.storage.put(`session:${await sha256(token)}`, { user: u.id, exp: Date.now() + SESSION_TTL } satisfies Session);
    return { token };
  }
  /** The account a username or an email belongs to */
  private async byName(name: string) {
    const id = name.includes('@') ? await this.ctx.storage.get<string>(`email:${emailKey(name)}`) : await this.ctx.storage.get<string>(`name:${nameKey(name)}`);
    return id ? this.user(id) : undefined;
  }

  /** The account a session token belongs to, or null (the rooms and the Worker's routes ask too) */
  async check(token: unknown): Promise<Who | null> {
    const u = await this.byToken(token);
    return u ? { id: u.id, username: u.username, profile: u.profile } : null;
  }
  private async byToken(token: unknown): Promise<User | null> {
    if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) return null;
    const key = `session:${await sha256(token)}`;
    const s = await this.ctx.storage.get<Session>(key);
    // (a session from before accounts were only usernames and emails has no user: it's gone)
    if (!s?.user || s.exp < Date.now()) {
      if (s) await this.ctx.storage.delete(key);
      return null;
    }
    return (await this.user(s.user)) ?? null;
  }

  /* ---------- Requests ---------- */

  async fetch(req: Request): Promise<Response> {
    const path = new URL(req.url).pathname.replace(/\/$/, '');
    try {
      if (req.method === 'GET') {
        if (path === '/auth/config') return json(this.config());
        if (path === '/auth/me') return this.limited(req, 'me', 60) ? fail(429, 'Slow down') : this.me(bearer(req.headers.get('Authorization')));
        return fail(404, 'Not found');
      }
      if (req.method !== 'POST') return fail(404, 'Not found');
      const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body) return fail(400, 'Expected JSON');
      const token = bearer(req.headers.get('Authorization'));
      const slow = (kind: string, n: number) => this.limited(req, kind, n);
      switch (path) {
        case '/auth/signup':
          return slow('signup', 10) ? fail(429, 'Slow down') : this.signup(body);
        case '/auth/login':
          return slow('login', 30) ? fail(429, 'Slow down') : this.login(body, this.ip(req));
        case '/auth/forgot':
          return slow('forgot', 5) ? fail(429, 'Slow down') : this.forgot(body, req.headers.get('Origin'));
        case '/auth/reset':
          return slow('reset', 10) ? fail(429, 'Slow down') : this.reset(body);
        case '/auth/username':
          return slow('username', 10) ? fail(429, 'Slow down') : this.setUsername(body, token);
        case '/auth/password':
          return slow('password', 10) ? fail(429, 'Slow down') : this.setPassword(body, token);
        case '/auth/email':
          return slow('email', 10) ? fail(429, 'Slow down') : this.setEmail(body, token);
        case '/auth/logout':
          return this.logout(token);
      }
      return fail(404, 'Not found');
    } catch (e) {
      console.error('accounts', e);
      return fail(500, 'Something went wrong');
    }
  }

  /** The logged-in account and its player profile: only its owner sees this */
  private async me(token: string | null) {
    const u = await this.byToken(token);
    if (!u) return fail(401, 'Log in to play online');
    return json({ username: u.username, email: u.email, profile: await this.openProfile(u) } satisfies AccountMe);
  }

  private async signup(b: Record<string, unknown>) {
    const username = str(b.username, 40);
    const email = str(b.email, 254).trim();
    const password = str(b.password, 200);
    const problem =
      usernameProblem(username, blockedList(this.env.BLOCKED_NAMES)) ?? (emailOk(email) ? null : "That doesn't look like an email address.") ?? passwordProblem(password, username);
    if (problem) return fail(400, problem);
    if (await this.ctx.storage.get(`name:${nameKey(username)}`)) return fail(409, 'That username is taken. Try another.');
    if (await this.ctx.storage.get(`email:${emailKey(email)}`)) return fail(409, 'That email is already on an account. Log in, or reset its password.');
    const id = `u${randomHex(8)}`;
    const u: User = { id, username, email, pw: await hashPassword(password), profile: await sha256(`user:${id}`), created: Date.now() };
    await this.ctx.storage.put({ [`user:${id}`]: u, [`name:${nameKey(username)}`]: id, [`email:${emailKey(email)}`]: id });
    await this.openProfile(u);
    return json(await this.session(u));
  }

  /** `name`: the username or the email */
  private async login(b: Record<string, unknown>, ip: string) {
    const name = str(b.name, 254).trim();
    const password = str(b.password, 200);
    const nameTries = `tries:name:${name.toLowerCase()}`;
    const ipTries = `tries:ip:${ip}`;
    const now = Date.now();
    const [t1, t2] = await Promise.all([this.ctx.storage.get<Tries>(nameTries), this.ctx.storage.get<Tries>(ipTries)]);
    if (lockedOut(t1, now) || lockedOut(t2, now)) return fail(429, 'Too many wrong tries. Wait 15 minutes, or reset your password.');
    const u = name ? await this.byName(name) : undefined;
    if (!u || !password || !(await checkPassword(password, u.pw))) {
      await this.ctx.storage.put({ [nameTries]: wrongTry(t1, now), [ipTries]: wrongTry(t2, now, TRIES.ipMax) });
      return fail(401, 'Wrong username or password.');
    }
    await this.ctx.storage.delete(nameTries);
    if (stale(u.pw)) await this.saveUser({ ...u, pw: await hashPassword(password) });
    return json(await this.session(u));
  }

  /** A reset link to the account's email (the same answer whether or not there's such an account) */
  private async forgot(b: Record<string, unknown>, origin: string | null) {
    if (!this.config().email) return json({ soon: true });
    const u = await this.byName(str(b.name, 254).trim());
    if (u) {
      const token = randomHex(32);
      await this.ctx.storage.put(`reset:${await sha256(token)}`, { user: u.id, exp: Date.now() + RESET_TTL });
      const mail = resetEmail(u.username, `${backTo(origin, this.env.ALLOWED_ORIGINS)}/?reset=${token}`);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.env.EMAIL_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: this.env.EMAIL_FROM || 'Sector 7 <no-reply@degenemporium.com>', to: [u.email], subject: mail.subject, text: mail.text }),
      }).catch((e) => (console.error('email', e), null));
      if (!res?.ok) console.error('email', res?.status);
    }
    // Now and then, clear out reset links nobody used
    if (Math.random() < 0.05) await this.sweep();
    return json({ sent: true });
  }

  private async reset(b: Record<string, unknown>) {
    const token = str(b.token, 64);
    if (!/^[0-9a-f]{64}$/.test(token)) return fail(400, 'That reset link is broken. Ask for another.');
    const key = `reset:${await sha256(token)}`;
    const r = await this.ctx.storage.get<{ user: string; exp: number }>(key);
    const u = r && r.exp > Date.now() ? await this.user(r.user) : undefined;
    if (!u) return fail(400, 'That reset link has expired. Ask for another.');
    const password = str(b.password, 200);
    const problem = passwordProblem(password, u.username);
    if (problem) return fail(400, problem);
    await this.ctx.storage.delete([key, `tries:name:${nameKey(u.username)}`, `tries:name:${emailKey(u.email)}`]);
    await this.saveUser({ ...u, pw: await hashPassword(password) });
    return json(await this.session(u));
  }

  /* ----- Changing an account ----- */

  private async setUsername(b: Record<string, unknown>, token: string | null) {
    const u = await this.byToken(token);
    if (!u) return fail(401, 'Log in first');
    const username = str(b.username, 40);
    const problem = usernameProblem(username, blockedList(this.env.BLOCKED_NAMES));
    if (problem) return fail(400, problem);
    const owner = await this.ctx.storage.get<string>(`name:${nameKey(username)}`);
    if (owner && owner !== u.id) return fail(409, 'That username is taken. Try another.');
    await this.ctx.storage.put({ [`user:${u.id}`]: { ...u, username }, [`name:${nameKey(username)}`]: u.id });
    if (nameKey(u.username) !== nameKey(username)) await this.ctx.storage.delete(`name:${nameKey(u.username)}`);
    await this.profileOf(u).open(username);
    return this.me(token);
  }

  /** A new password: the current one first */
  private async setPassword(b: Record<string, unknown>, token: string | null) {
    const u = await this.byToken(token);
    if (!u) return fail(401, 'Log in first');
    if (!(await checkPassword(str(b.current, 200), u.pw))) return fail(403, 'Your current password is wrong.');
    const password = str(b.password, 200);
    const problem = passwordProblem(password, u.username);
    if (problem) return fail(400, problem);
    await this.saveUser({ ...u, pw: await hashPassword(password) });
    return this.me(token);
  }

  /** A new email: the password first */
  private async setEmail(b: Record<string, unknown>, token: string | null) {
    const u = await this.byToken(token);
    if (!u) return fail(401, 'Log in first');
    if (!(await checkPassword(str(b.current, 200), u.pw))) return fail(403, 'Your password is wrong.');
    const email = str(b.email, 254).trim();
    if (!emailOk(email)) return fail(400, "That doesn't look like an email address.");
    const owner = await this.ctx.storage.get<string>(`email:${emailKey(email)}`);
    if (owner && owner !== u.id) return fail(409, 'That email is already on another account.');
    await this.ctx.storage.put({ [`user:${u.id}`]: { ...u, email }, [`email:${emailKey(email)}`]: u.id });
    if (emailKey(u.email) !== emailKey(email)) await this.ctx.storage.delete(`email:${emailKey(u.email)}`);
    return this.me(token);
  }

  private async logout(token: string | null) {
    if (token) await this.ctx.storage.delete(`session:${await sha256(token)}`);
    return json({ ok: true });
  }

  /** Clear out reset links nobody used */
  private async sweep() {
    const now = Date.now();
    const old = [...(await this.ctx.storage.list<{ exp: number }>({ prefix: 'reset:', limit: 128 }))].filter(([, v]) => v.exp < now).map(([k]) => k);
    if (old.length) await this.ctx.storage.delete(old);
  }
}
