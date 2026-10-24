/*
 * Accounts: logging in (docs/multiplayer-plan.md, "Profiles and logging
 * in"). One Durable Object for the whole game. Playing online needs an
 * account; single player never asks for one.
 *
 * An account has a username (the name others see, through the filter in
 * net/auth.ts), a private email (for reset links), and its ways in, any of
 * them linked to the same account:
 * - a password (PBKDF2, login.ts; five wrong tries lock the username and the
 *   address for a while),
 * - Google or Discord (OAuth 2 with PKCE: only the provider's account id is
 *   kept, never a name, picture or email from it),
 * - a wallet (it signs a short message: no transaction, no gas).
 * A first sign-in with Google, Discord or a wallet gets a short-lived
 * pending pass, finished with a username. Logging in gives a session token
 * (30 days); only hashes of tokens, passes and reset links are stored.
 *
 * Each account opens one player Profile (profile.ts): a new account's is
 * fresh; a wallet that had a profile before accounts keeps it.
 *
 * Storage: `user:<id>`, `name:<username lower case>`, `email:<lower case>`,
 * `way:<google|discord|wallet>:<id>` (each an account id), `session:`,
 * `pending:`, `reset:` (by hash), `oauth:<state>`, `claim:<code>`, `nonce:`,
 * `tries:name:` / `tries:ip:`.
 */
import { DurableObject } from 'cloudflare:workers';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import {
  PROVIDERS,
  blockedList,
  emailKey,
  emailOk,
  isAddress,
  nameKey,
  passwordProblem,
  signInMessage,
  usernameProblem,
  type AccountMe,
  type AuthAnswer,
  type AuthConfig,
  type Provider,
  type Way,
} from '../../src/scripts/net/auth';
import type { OwnProfile } from '../../src/scripts/net/protocol';
import type { Env } from './index';
import { sha256, walletKey } from './keys';
import {
  DISCORD_ME,
  OAUTH,
  authorizeUrl,
  backTo,
  checkPassword,
  discordId,
  googleId,
  hashPassword,
  lockedOut,
  TRIES,
  pkce,
  randomHex,
  resetEmail,
  stale,
  tokenForm,
  wrongTry,
  type PasswordHash,
  type Tries,
} from './login';

const MINUTE = 60_000;
const NONCE_TTL = 10 * MINUTE;
const SESSION_TTL = 30 * 24 * 60 * MINUTE;
/** A first sign-in's pass to pick a username, a sign-in's round trip to the provider, a reset link, the code back from it */
const PENDING_TTL = 30 * MINUTE;
const OAUTH_TTL = 10 * MINUTE;
const RESET_TTL = 30 * MINUTE;
const CLAIM_TTL = 2 * MINUTE;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (status: number, message: string) => json({ error: message }, status);
const bearer = (auth: string | null) => /^Bearer ([0-9a-f]{64})$/.exec(auth ?? '')?.[1] ?? null;
const str = (v: unknown, max = 300) => (typeof v === 'string' && v.length <= max ? v : '');

/** The wallet that signed `message` with personal_sign (EIP-191), or null */
export function recoverSigner(message: string, signature: string): string | null {
  try {
    if (!/^0x[0-9a-fA-F]{130}$/.test(signature)) return null;
    const msg = new TextEncoder().encode(message);
    const prefix = new TextEncoder().encode(`\x19Ethereum Signed Message:\n${msg.length}`);
    const both = new Uint8Array(prefix.length + msg.length);
    both.set(prefix);
    both.set(msg, prefix.length);
    const hash = keccak_256(both);
    const sig = hexToBytes(signature.slice(2));
    let v = sig[64];
    if (v >= 27) v -= 27;
    if (v > 1) return null;
    // noble's "recovered" layout is the recovery bit first, then r and s
    const rec = new Uint8Array(65);
    rec[0] = v;
    rec.set(sig.subarray(0, 64), 1);
    const pub = secp256k1.Point.fromBytes(secp256k1.recoverPublicKey(rec, hash, { prehash: false })).toBytes(false);
    return `0x${bytesToHex(keccak_256(pub.subarray(1)).subarray(12))}`;
  } catch {
    return null;
  }
}

export interface User {
  id: string;
  username: string;
  email: string | null;
  pw?: PasswordHash;
  google?: string;
  discord?: string;
  wallet?: string;
  /** Its player Profile's name (profile.ts) */
  profile: string;
  created: number;
}
/** Who a session token belongs to (the rooms and the menu's routes ask) */
export interface Who {
  id: string;
  username: string;
  profile: string;
}
interface Session {
  user?: string;
  /** A wallet session from before accounts: it opens the account that wallet is linked to, if any */
  address?: string;
  exp: number;
}
interface Pending {
  way: Exclude<Way, 'password'>;
  id: string;
  /** The profile to keep (a wallet's from before accounts) */
  profile?: string;
  exp: number;
}
interface OAuthState {
  provider: Provider;
  verifier: string;
  origin: string;
  /** Linking to this logged-in account, not signing in */
  link?: string;
  exp: number;
}
type Claim = { answer: AuthAnswer | { linked: true } | { error: string }; exp: number };

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
  private get blocked() {
    return blockedList(this.env.BLOCKED_NAMES);
  }
  private config(): AuthConfig {
    return {
      google: !!(this.env.GOOGLE_CLIENT_ID && this.env.GOOGLE_CLIENT_SECRET),
      discord: !!(this.env.DISCORD_CLIENT_ID && this.env.DISCORD_CLIENT_SECRET),
      email: !!this.env.EMAIL_API_KEY,
      chain: Number(this.env.AUTH_CHAIN_ID) || 943,
    };
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
  private async session(u: User): Promise<{ token: string }> {
    const token = randomHex(32);
    await this.ctx.storage.put(`session:${await sha256(token)}`, { user: u.id, exp: Date.now() + SESSION_TTL } satisfies Session);
    return { token };
  }
  private async pending(p: Omit<Pending, 'exp'>): Promise<AuthAnswer> {
    const pass = randomHex(32);
    await this.ctx.storage.put(`pending:${await sha256(pass)}`, { ...p, exp: Date.now() + PENDING_TTL } satisfies Pending);
    return { pending: pass, way: p.way };
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
    if (!s) return null;
    if (s.exp < Date.now()) {
      await this.ctx.storage.delete(key);
      return null;
    }
    const id = s.user ?? (s.address ? await this.ctx.storage.get<string>(`way:wallet:${s.address}`) : undefined);
    return id ? ((await this.user(id)) ?? null) : null;
  }

  /** A new account with this username (checked), email and way in */
  private async create(username: string, email: string | null, way: Partial<Pick<User, 'pw' | 'google' | 'discord' | 'wallet'>>, profile?: string): Promise<User | string> {
    const problem = usernameProblem(username, this.blocked);
    if (problem) return problem;
    if (await this.ctx.storage.get(`name:${nameKey(username)}`)) return 'That username is taken. Try another.';
    if (email && (await this.ctx.storage.get(`email:${emailKey(email)}`))) return 'That email is already on an account. Log in, or reset its password.';
    const id = `u${randomHex(8)}`;
    const u: User = { id, username, email: email?.trim() ?? null, ...way, profile: profile ?? (await sha256(`user:${id}`)), created: Date.now() };
    const puts: Record<string, unknown> = { [`user:${id}`]: u, [`name:${nameKey(username)}`]: id };
    if (email) puts[`email:${emailKey(email)}`] = id;
    if (way.google) puts[`way:google:${way.google}`] = id;
    if (way.discord) puts[`way:discord:${way.discord}`] = id;
    if (way.wallet) puts[`way:wallet:${way.wallet}`] = id;
    await this.ctx.storage.put(puts);
    return u;
  }

  /* ---------- Requests ---------- */

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/$/, '');
    try {
      if (req.method === 'GET') {
        if (path === '/auth/config') return json(this.config());
        if (path === '/auth/me') return this.limited(req, 'me', 60) ? fail(429, 'Slow down') : this.me(bearer(req.headers.get('Authorization')));
        const back = /^\/auth\/(google|discord)\/callback$/.exec(path);
        if (back) return this.callback(back[1] as Provider, url);
        return fail(404, 'Not found');
      }
      if (req.method !== 'POST') return fail(404, 'Not found');
      const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body) return fail(400, 'Expected JSON');
      const token = bearer(req.headers.get('Authorization'));
      const origin = req.headers.get('Origin') ?? '';
      const slow = (kind: string, n: number) => this.limited(req, kind, n);
      switch (path) {
        case '/auth/signup':
          return slow('signup', 10) ? fail(429, 'Slow down') : this.signup(body);
        case '/auth/login':
          return slow('login', 30) ? fail(429, 'Slow down') : this.login(body, this.ip(req));
        case '/auth/finish':
          return slow('finish', 20) ? fail(429, 'Slow down') : this.finish(body);
        case '/auth/forgot':
          return slow('forgot', 5) ? fail(429, 'Slow down') : this.forgot(body, origin);
        case '/auth/reset':
          return slow('reset', 10) ? fail(429, 'Slow down') : this.reset(body);
        case '/auth/oauth':
          return slow('oauth', 20) ? fail(429, 'Slow down') : this.oauth(body, token, origin, url.origin);
        case '/auth/claim':
          return slow('claim', 20) ? fail(429, 'Slow down') : this.claim(body);
        case '/auth/nonce':
          return slow('nonce', 20) ? fail(429, 'Slow down') : this.nonce(body, origin);
        case '/auth/session':
          return slow('session', 20) ? fail(429, 'Slow down') : this.walletIn(body, token);
        case '/auth/username':
          return slow('username', 10) ? fail(429, 'Slow down') : this.setUsername(body, token);
        case '/auth/password':
          return slow('password', 10) ? fail(429, 'Slow down') : this.setPassword(body, token);
        case '/auth/email':
          return slow('email', 10) ? fail(429, 'Slow down') : this.setEmail(body, token);
        case '/auth/unlink':
          return slow('unlink', 10) ? fail(429, 'Slow down') : this.unlink(body, token);
        case '/auth/logout':
          return this.logout(token);
      }
      return fail(404, 'Not found');
    } catch (e) {
      console.error('accounts', e);
      return fail(500, 'Something went wrong');
    }
  }

  /** The logged-in account, its ways in and its player profile: only its owner sees this */
  private async me(token: string | null) {
    const u = await this.byToken(token);
    if (!u) return fail(401, 'Log in to play online');
    const profile = await this.openProfile(u);
    return json({
      username: u.username,
      email: u.email,
      ways: { password: !!u.pw, google: !!u.google, discord: !!u.discord, wallet: u.wallet ?? null },
      chain: this.config().chain,
      profile,
    } satisfies AccountMe);
  }

  /* ----- Username and password ----- */

  private async signup(b: Record<string, unknown>) {
    const username = str(b.username, 40);
    const email = str(b.email, 254).trim();
    const password = str(b.password, 200);
    const problem = usernameProblem(username, this.blocked) ?? (emailOk(email) ? null : 'Enter your email: it is only used to reset your password.') ?? passwordProblem(password, username);
    if (problem) return fail(400, problem);
    const u = await this.create(username, email, { pw: await hashPassword(password) });
    if (typeof u === 'string') return fail(409, u);
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
    const id = name.includes('@') ? await this.ctx.storage.get<string>(`email:${emailKey(name)}`) : await this.ctx.storage.get<string>(`name:${nameKey(name)}`);
    const u = id ? await this.user(id) : undefined;
    const ok = !!u?.pw && !!password && (await checkPassword(password, u.pw));
    if (!ok || !u) {
      await this.ctx.storage.put({ [nameTries]: wrongTry(t1, now), [ipTries]: wrongTry(t2, now, TRIES.ipMax) });
      return fail(401, 'Wrong username or password.');
    }
    await this.ctx.storage.delete(nameTries);
    if (stale(u.pw!)) await this.saveUser({ ...u, pw: await hashPassword(password) });
    return json(await this.session(u));
  }

  private async forgot(b: Record<string, unknown>, origin: string) {
    if (!this.config().email) return json({ soon: true });
    const name = str(b.name, 254).trim();
    const id = name.includes('@') ? await this.ctx.storage.get<string>(`email:${emailKey(name)}`) : await this.ctx.storage.get<string>(`name:${nameKey(name)}`);
    const u = id ? await this.user(id) : undefined;
    // The same answer whether or not there's such an account (nobody can find out who has one)
    if (u?.email) {
      const token = randomHex(32);
      await this.ctx.storage.put(`reset:${await sha256(token)}`, { user: u.id, exp: Date.now() + RESET_TTL });
      const link = `${backTo(origin, this.env.ALLOWED_ORIGINS)}/?reset=${token}`;
      const mail = resetEmail(u.username, link);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.env.EMAIL_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: this.env.EMAIL_FROM || 'Sector 7 <no-reply@degenemporium.com>', to: [u.email], subject: mail.subject, text: mail.text }),
      }).catch((e) => (console.error('email', e), null));
      if (!res?.ok) console.error('email', res?.status);
    }
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
    await this.ctx.storage.delete([key, `tries:name:${nameKey(u.username)}`, ...(u.email ? [`tries:name:${emailKey(u.email)}`] : [])]);
    await this.saveUser({ ...u, pw: await hashPassword(password) });
    return json(await this.session(u));
  }

  /* ----- A first sign-in with Google, Discord or a wallet: pick a username ----- */

  private async finish(b: Record<string, unknown>) {
    const pass = str(b.pending, 64);
    if (!/^[0-9a-f]{64}$/.test(pass)) return fail(400, 'That sign-in has expired. Start again.');
    const key = `pending:${await sha256(pass)}`;
    const p = await this.ctx.storage.get<Pending>(key);
    if (!p || p.exp < Date.now()) return fail(400, 'That sign-in has expired. Start again.');
    // Someone else finished with this way in meanwhile: it's theirs
    if (await this.ctx.storage.get(`way:${p.way}:${p.id}`)) return fail(409, 'That sign-in is already on an account. Log in again.');
    const u = await this.create(str(b.username, 40), null, { [p.way]: p.id }, p.profile);
    if (typeof u === 'string') return fail(400, u);
    await this.ctx.storage.delete(key);
    await this.openProfile(u);
    return json(await this.session(u));
  }

  /* ----- Google and Discord ----- */

  private secrets(p: Provider) {
    const id = p === 'google' ? this.env.GOOGLE_CLIENT_ID : this.env.DISCORD_CLIENT_ID;
    const secret = p === 'google' ? this.env.GOOGLE_CLIENT_SECRET : this.env.DISCORD_CLIENT_SECRET;
    return id && secret ? { id, secret } : null;
  }

  /** Step 1: where to send the player (the provider's sign-in page); `link`: add it to the logged-in account */
  private async oauth(b: Record<string, unknown>, token: string | null, origin: string, self: string) {
    const provider = b.provider as Provider;
    if (!PROVIDERS.includes(provider)) return fail(400, 'No such sign-in');
    const keys = this.secrets(provider);
    if (!keys) return fail(503, `${provider === 'google' ? 'Google' : 'Discord'} sign-in isn't set up yet.`);
    let link: string | undefined;
    if (b.link) {
      const u = await this.byToken(token);
      if (!u) return fail(401, 'Log in first');
      link = u.id;
    }
    const state = randomHex(16);
    const { verifier, challenge } = await pkce();
    await this.ctx.storage.put(`oauth:${state}`, { provider, verifier, origin: backTo(origin, this.env.ALLOWED_ORIGINS), link, exp: Date.now() + OAUTH_TTL } satisfies OAuthState);
    return json({ url: authorizeUrl(provider, { clientId: keys.id, redirect: `${self}/auth/${provider}/callback`, state, challenge }) });
  }

  /** Step 2: the provider sends the player back here; they go on to the site with a one-time code (never a token in the address) */
  private async callback(provider: Provider, url: URL) {
    const state = url.searchParams.get('state') ?? '';
    const s = /^[0-9a-f]{32}$/.test(state) ? await this.ctx.storage.get<OAuthState>(`oauth:${state}`) : undefined;
    if (s) await this.ctx.storage.delete(`oauth:${state}`);
    const site = s?.origin ?? backTo(null, this.env.ALLOWED_ORIGINS);
    const go = async (answer: Claim['answer']) => {
      const code = randomHex(16);
      await this.ctx.storage.put(`claim:${code}`, { answer, exp: Date.now() + CLAIM_TTL } satisfies Claim);
      return Response.redirect(`${site}/?login=${code}`, 302);
    };
    if (!s || s.provider !== provider || s.exp < Date.now()) return go({ error: 'That sign-in took too long. Try again.' });
    const code = url.searchParams.get('code');
    const keys = this.secrets(provider);
    if (!code || !keys) return go({ error: url.searchParams.get('error') === 'access_denied' ? 'Sign-in cancelled.' : "That sign-in didn't work. Try again." });
    const id = await this.providerId(provider, keys, code, s.verifier, `${url.origin}/auth/${provider}/callback`);
    if (!id) return go({ error: "That sign-in didn't work. Try again." });
    return go(await this.wayIn(provider, id, s.link));
  }

  /** The provider's account id for a sign-in's code, or null */
  private async providerId(p: Provider, keys: { id: string; secret: string }, code: string, verifier: string, redirect: string) {
    const res = await fetch(OAUTH[p].token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: tokenForm({ clientId: keys.id, secret: keys.secret, redirect, code, verifier }),
    });
    if (!res.ok) return console.error('oauth token', p, res.status), null;
    const t = (await res.json().catch(() => null)) as { id_token?: string; access_token?: string } | null;
    if (p === 'google') return googleId(t?.id_token, keys.id);
    if (!t?.access_token) return null;
    const me = await fetch(DISCORD_ME, { headers: { Authorization: `Bearer ${t.access_token}` } });
    return me.ok ? discordId(await me.json().catch(() => null)) : null;
  }

  /** A way in proven (Google, Discord, a wallet): its account's session, a link to the logged-in account, or a pending pass */
  private async wayIn(way: Exclude<Way, 'password'>, id: string, link?: string, profile?: string): Promise<Claim['answer']> {
    const owner = await this.ctx.storage.get<string>(`way:${way}:${id}`);
    if (link) {
      if (owner && owner !== link) return { error: `That ${way === 'wallet' ? 'wallet' : way === 'google' ? 'Google account' : 'Discord account'} is already linked to another profile.` };
      const u = await this.user(link);
      if (!u) return { error: 'Log in again.' };
      const old = u[way];
      await this.ctx.storage.put({ [`user:${u.id}`]: { ...u, [way]: id }, [`way:${way}:${id}`]: u.id });
      if (old && old !== id) await this.ctx.storage.delete(`way:${way}:${old}`);
      return { linked: true };
    }
    const u = owner ? await this.user(owner) : undefined;
    return u ? this.session(u) : this.pending({ way, id, profile });
  }

  /** Step 3: the site swaps the code for what the sign-in came to */
  private async claim(b: Record<string, unknown>) {
    const code = str(b.code, 32);
    if (!/^[0-9a-f]{32}$/.test(code)) return fail(400, 'That sign-in has expired. Try again.');
    const c = await this.ctx.storage.get<Claim>(`claim:${code}`);
    await this.ctx.storage.delete(`claim:${code}`);
    if (!c || c.exp < Date.now()) return fail(400, 'That sign-in has expired. Try again.');
    if ('error' in c.answer) return fail(400, c.answer.error);
    return json(c.answer);
  }

  /* ----- A wallet ----- */

  /** Step 1: the exact message for the wallet to sign */
  private async nonce(b: Record<string, unknown>, origin: string) {
    if (!isAddress(b.address)) return fail(400, 'Not a wallet address');
    const chain = this.config().chain;
    const nonce = randomHex(12);
    const message = signInMessage({ origin, address: b.address, chain, nonce, issued: new Date().toISOString() });
    await this.ctx.storage.put(`nonce:${nonce}`, { address: b.address.toLowerCase(), message, exp: Date.now() + NONCE_TTL });
    // Now and then, clear out what nobody finished
    if (Math.random() < 0.05) await this.sweep();
    return json({ nonce, message });
  }

  /** Step 2: the signed message: the wallet's account (`link`: added to the logged-in one) */
  private async walletIn(b: Record<string, unknown>, token: string | null) {
    const nonce = String(b.nonce ?? '');
    if (!/^[0-9a-f]{24}$/.test(nonce)) return fail(400, 'Bad sign-in');
    const n = await this.ctx.storage.get<{ address: string; message: string; exp: number }>(`nonce:${nonce}`);
    await this.ctx.storage.delete(`nonce:${nonce}`);
    if (!n || n.exp < Date.now()) return fail(401, 'Sign-in expired, try again');
    const signer = recoverSigner(n.message, String(b.signature ?? ''));
    if (signer !== n.address) return fail(401, "That signature isn't from this wallet");
    let link: string | undefined;
    if (b.link) {
      const u = await this.byToken(token);
      if (!u) return fail(401, 'Log in first');
      link = u.id;
    }
    // A wallet that had a profile before accounts keeps it
    const answer = await this.wayIn('wallet', n.address, link, await walletKey(n.address));
    return 'error' in answer ? fail(409, answer.error) : json(answer);
  }

  /* ----- Changing an account ----- */

  private async setUsername(b: Record<string, unknown>, token: string | null) {
    const u = await this.byToken(token);
    if (!u) return fail(401, 'Log in first');
    const username = str(b.username, 40);
    const problem = usernameProblem(username, this.blocked);
    if (problem) return fail(400, problem);
    const owner = await this.ctx.storage.get<string>(`name:${nameKey(username)}`);
    if (owner && owner !== u.id) return fail(409, 'That username is taken. Try another.');
    await this.ctx.storage.put({ [`user:${u.id}`]: { ...u, username }, [`name:${nameKey(username)}`]: u.id });
    if (nameKey(u.username) !== nameKey(username)) await this.ctx.storage.delete(`name:${nameKey(u.username)}`);
    await this.profileOf(u).open(username);
    return this.me(token);
  }

  /** Set a password (the account's first needs its email too), or change it (the current one first) */
  private async setPassword(b: Record<string, unknown>, token: string | null) {
    const u = await this.byToken(token);
    if (!u) return fail(401, 'Log in first');
    if (u.pw && !(await checkPassword(str(b.current, 200), u.pw))) return fail(403, 'Your current password is wrong.');
    const password = str(b.password, 200);
    const problem = passwordProblem(password, u.username);
    if (problem) return fail(400, problem);
    let next: User = { ...u, pw: await hashPassword(password) };
    if (!u.email) {
      const email = str(b.email, 254).trim();
      if (!emailOk(email)) return fail(400, 'Enter your email: it is only used to reset your password.');
      const owner = await this.ctx.storage.get<string>(`email:${emailKey(email)}`);
      if (owner && owner !== u.id) return fail(409, 'That email is already on another account.');
      next = { ...next, email };
      await this.ctx.storage.put(`email:${emailKey(email)}`, u.id);
    }
    await this.saveUser(next);
    return this.me(token);
  }

  private async setEmail(b: Record<string, unknown>, token: string | null) {
    const u = await this.byToken(token);
    if (!u) return fail(401, 'Log in first');
    if (u.pw && !(await checkPassword(str(b.current, 200), u.pw))) return fail(403, 'Your current password is wrong.');
    const email = str(b.email, 254).trim();
    if (!emailOk(email)) return fail(400, "That doesn't look like an email address.");
    const owner = await this.ctx.storage.get<string>(`email:${emailKey(email)}`);
    if (owner && owner !== u.id) return fail(409, 'That email is already on another account.');
    await this.ctx.storage.put({ [`user:${u.id}`]: { ...u, email }, [`email:${emailKey(email)}`]: u.id });
    if (u.email && emailKey(u.email) !== emailKey(email)) await this.ctx.storage.delete(`email:${emailKey(u.email)}`);
    return this.me(token);
  }

  /** Take a way in off the account (never the last one) */
  private async unlink(b: Record<string, unknown>, token: string | null) {
    const u = await this.byToken(token);
    if (!u) return fail(401, 'Log in first');
    const way = b.way as Way;
    const has = { password: !!u.pw, google: !!u.google, discord: !!u.discord, wallet: !!u.wallet };
    if (!(way in has) || !has[way]) return fail(400, "That isn't on your account.");
    if (Object.values(has).filter(Boolean).length < 2) return fail(400, "It's your only way in: add another first.");
    const next = { ...u };
    if (way === 'password') delete next.pw;
    else {
      await this.ctx.storage.delete(`way:${way}:${u[way]}`);
      delete next[way];
    }
    await this.saveUser(next);
    return this.me(token);
  }

  private async logout(token: string | null) {
    if (token) await this.ctx.storage.delete(`session:${await sha256(token)}`);
    return json({ ok: true });
  }

  /** Clear out passes, sign-ins, codes and links nobody finished */
  private async sweep() {
    const now = Date.now();
    for (const prefix of ['nonce:', 'pending:', 'oauth:', 'claim:', 'reset:']) {
      const old = [...(await this.ctx.storage.list<{ exp: number }>({ prefix, limit: 128 }))].filter(([, v]) => v.exp < now).map(([k]) => k);
      if (old.length) await this.ctx.storage.delete(old);
    }
  }
}
