/*
 * The parts of logging in that don't need Cloudflare (accounts.ts uses them;
 * tests/login.test.ts holds them): password hashes, the lock-out after wrong
 * tries and the reset email. Web Crypto only, no packages.
 */

const enc = new TextEncoder();
export const toHex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
export const randomHex = (n: number) => toHex(crypto.getRandomValues(new Uint8Array(n)));

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

/* ---------- The reset link ---------- */

/** The site a reset link opens: the page it was asked from if that's an allowed one, or the first of them */
export function backTo(origin: string | null | undefined, allowed: string) {
  const list = allowed.split(',').map((s) => s.trim()).filter(Boolean);
  return origin && list.includes(origin) ? origin : list[0];
}

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
