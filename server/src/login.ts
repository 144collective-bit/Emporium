/*
 * The parts of logging in that don't need Cloudflare (accounts.ts uses them;
 * tests/login.test.ts holds them): password hashes, the lock-out after wrong
 * tries, and signing in with Google or Discord (OAuth 2, the code flow with a
 * one-time `state` and PKCE). Web Crypto only, no packages.
 */
import type { Provider } from '../../src/scripts/net/auth';

const enc = new TextEncoder();
export const toHex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
export const randomHex = (n: number) => toHex(crypto.getRandomValues(new Uint8Array(n)));
const b64url = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/* ---------- Passwords ---------- */

/**
 * PBKDF2-SHA256 rounds: the most Cloudflare's Web Crypto takes (it refuses
 * more than 100,000). Each hash keeps its own count, so a later raise
 * re-hashes a password the next time it's used (`stale()`).
 */
export const PBKDF2_ROUNDS = 100_000;

export interface PasswordHash {
  alg: 'pbkdf2-sha256';
  rounds: number;
  salt: string;
  hash: string;
}

async function pbkdf2(pw: string, salt: string, rounds: number) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: rounds }, key, 256);
  return toHex(bits);
}

export async function hashPassword(pw: string, rounds = PBKDF2_ROUNDS): Promise<PasswordHash> {
  const salt = randomHex(16);
  return { alg: 'pbkdf2-sha256', rounds, salt, hash: await pbkdf2(pw, salt, rounds) };
}

/** The same length strings compared without stopping at the first difference */
export function sameHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function checkPassword(pw: string, h: PasswordHash) {
  if (h.alg !== 'pbkdf2-sha256') return false;
  return sameHex(await pbkdf2(pw, h.salt, h.rounds), h.hash);
}
/** Hashed with fewer rounds than today's: hash it again once it's checked */
export const stale = (h: PasswordHash) => h.rounds < PBKDF2_ROUNDS;

/* ---------- Wrong tries ---------- */

/**
 * Five wrong tries in 15 minutes locks a username for 15 minutes; an address
 * (many players can share one) is locked after `ipMax`.
 */
export const TRIES = { max: 5, ipMax: 25, window: 15 * 60_000, lock: 15 * 60_000 } as const;
export interface Tries {
  n: number;
  /** When the first of these tries was */
  since: number;
  /** Locked until (ms), or 0 */
  until: number;
}
export const lockedOut = (t: Tries | undefined, now: number) => !!t && t.until > now;
/** One more wrong try (`max` of them locks) */
export function wrongTry(t: Tries | undefined, now: number, max: number = TRIES.max): Tries {
  const fresh = !t || now - t.since > TRIES.window;
  const n = fresh ? 1 : t!.n + 1;
  return { n, since: fresh ? now : t!.since, until: n >= max ? now + TRIES.lock : 0 };
}

/* ---------- Google and Discord ---------- */

interface ProviderInfo {
  authorize: string;
  token: string;
  scope: string;
}
export const OAUTH: Record<Provider, ProviderInfo> = {
  google: { authorize: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', scope: 'openid' },
  discord: { authorize: 'https://discord.com/oauth2/authorize', token: 'https://discord.com/api/oauth2/token', scope: 'identify' },
};
/** Discord's own user, from its access token: only the id is kept */
export const DISCORD_ME = 'https://discord.com/api/users/@me';

/** A PKCE pair: the verifier kept on the server, its challenge sent with the sign-in */
export async function pkce() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(await crypto.subtle.digest('SHA-256', enc.encode(verifier)));
  return { verifier, challenge };
}

/** Where the button sends the player: the provider's own sign-in page */
export function authorizeUrl(p: Provider, o: { clientId: string; redirect: string; state: string; challenge: string }) {
  const u = new URL(OAUTH[p].authorize);
  u.searchParams.set('client_id', o.clientId);
  u.searchParams.set('redirect_uri', o.redirect);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', OAUTH[p].scope);
  u.searchParams.set('state', o.state);
  u.searchParams.set('code_challenge', o.challenge);
  u.searchParams.set('code_challenge_method', 'S256');
  u.searchParams.set('prompt', p === 'google' ? 'select_account' : 'consent');
  return u.toString();
}

/** The form that swaps the code the provider sent back for its tokens */
export function tokenForm(o: { clientId: string; secret: string; redirect: string; code: string; verifier: string }) {
  return new URLSearchParams({ grant_type: 'authorization_code', code: o.code, redirect_uri: o.redirect, client_id: o.clientId, client_secret: o.secret, code_verifier: o.verifier });
}

/**
 * Google's account id (`sub`) from the ID token its token endpoint sent us.
 * It came straight from Google over TLS, so its claims are read, not its
 * signature checked (Google's own advice for the code flow); it must be
 * Google's, for this app, and not expired.
 */
export function googleId(idToken: unknown, clientId: string, now = Date.now()): string | null {
  if (typeof idToken !== 'string') return null;
  try {
    const part = idToken.split('.')[1];
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')));
    const iss = json.iss === 'https://accounts.google.com' || json.iss === 'accounts.google.com';
    if (!iss || json.aud !== clientId || typeof json.sub !== 'string' || !(json.exp * 1000 > now)) return null;
    return /^[0-9A-Za-z_-]{1,64}$/.test(json.sub) ? json.sub : null;
  } catch {
    return null;
  }
}
/** Discord's user id (a snowflake) from /users/@me */
export const discordId = (me: unknown): string | null => {
  const id = (me as { id?: unknown } | null)?.id;
  return typeof id === 'string' && /^\d{5,25}$/.test(id) ? id : null;
};

/** The site to send the player back to after a sign-in: one of the allowed pages, or the first of them */
export function backTo(origin: string | null | undefined, allowed: string) {
  const list = allowed.split(',').map((s) => s.trim()).filter(Boolean);
  return origin && list.includes(origin) ? origin : list[0];
}

/* ---------- The reset email ---------- */

export function resetEmail(username: string, link: string) {
  return {
    subject: 'Reset your Sector 7 password',
    text: [
      `Hi ${username},`,
      '',
      'Someone (hopefully you) asked to reset the password for your Sector 7 account. Open this link within 30 minutes to pick a new one:',
      '',
      link,
      '',
      "If it wasn't you, ignore this email: your password stays as it is.",
    ].join('\n'),
  };
}
