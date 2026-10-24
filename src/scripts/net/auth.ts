/*
 * Logging in to an account (docs/multiplayer-plan.md, "Profiles and logging
 * in"), shared by the site and the game server: the rules for usernames,
 * passwords and emails, the shape of the server's account API, the
 * PulseChain networks a wallet can be on and the message a wallet signs.
 * No DOM or scene code (the server bundles this).
 *
 * An account is opened with a username and password, Google, Discord or a
 * wallet, any of them linked to the same profile. The username is the one
 * thing a player types that others see (the owner's call), so it goes
 * through `usernameProblem()` on the way in, in the browser and again on
 * the server; the email is private (its owner sees it, nobody else).
 */
import type { OwnProfile } from './protocol';

export interface Chain {
  id: number;
  name: string;
  /** Short label for the wallet chip */
  short: string;
  symbol: string;
  rpc: string;
  explorer: string;
  testnet: boolean;
}

/** The networks the server can be set to (AUTH_CHAIN_ID) */
export const CHAINS: Record<number, Chain> = {
  369: { id: 369, name: 'PulseChain', short: 'PulseChain', symbol: 'PLS', rpc: 'https://rpc.pulsechain.com', explorer: 'https://scan.pulsechain.com', testnet: false },
  943: { id: 943, name: 'PulseChain Testnet v4', short: 'Testnet', symbol: 'tPLS', rpc: 'https://rpc.v4.testnet.pulsechain.com', explorer: 'https://scan.v4.testnet.pulsechain.com', testnet: true },
};

export const isAddress = (s: unknown): s is string => typeof s === 'string' && /^0x[0-9a-fA-F]{40}$/.test(s);

/* ---------- Usernames ---------- */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 16;
/** Letters, digits, `_` and `-` */
const NAME_CHARS = /^[A-Za-z0-9_-]+$/;

/**
 * Words no username may hold anywhere (after `squash()`: case, the usual
 * number-for-letter swaps and the `_` and `-` between letters taken out).
 * Kept to stems that are almost never part of an ordinary word.
 */
const NEVER = [
  'fuck', 'fuk', 'fck', 'shit', 'cunt', 'bitch', 'bastard', 'whore', 'slut', 'porn', 'penis', 'vagina', 'dildo', 'pussy',
  'jizz', 'wank', 'twat', 'nigg', 'niga', 'fagg', 'retard', 'nazi', 'hitler', 'kkk', 'rapist', 'molest', 'paedo',
  'incest', 'cocksuck', 'motherf', 'asshole', 'arsehole', 'dickhead',
];
/** Words a username may not be made of: whole parts only (split at `_`, `-`, digits and capitals), so "classic" or "scrape" pass */
const NEVER_PART = [
  'ass', 'arse', 'cum', 'fag', 'rape', 'cock', 'dick', 'tit', 'tits', 'sex', 'kys', 'hoe', 'nig', 'spic', 'chink', 'kike',
  'coon', 'gook', 'dyke', 'tranny', 'nonce', 'anal', 'nude', 'nudes', 'xxx', 'pedo', 'pedos', 'boob', 'boobs',
];
/** Names that would pass for the city's own people or point somewhere else */
const STAFF = ['admin', 'moderator', 'official', 'support', 'staff', 'sector7', 'sectorseven', 'emporium', 'system', 'owner', 'developer', 'http', 'www'];
const STAFF_PART = ['mod', 'mods', 'dev', 'devs', 'bot', 'server'];

/** The usual digits for letters */
const unleet = (s: string, one: 'i' | 'l') => {
  const swap: Record<string, string> = { '0': 'o', '1': one, '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g', '$': 's' };
  return s.replace(/[0-9$]/g, (c) => swap[c] ?? c);
};
/** Lower case, the usual digits for letters, `_` and `-` gone: what the filters read */
const squash = (s: string, one: 'i' | 'l') => unleet(s.toLowerCase().replace(/[_-]/g, ''), one);
/** A username's parts: split at `_`, `-` and where a capital follows a small letter, digits read as letters ("s3x" is one part) */
function parts(s: string) {
  return s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .flatMap((p) => [unleet(p.toLowerCase(), 'i'), unleet(p.toLowerCase(), 'l'), ...p.toLowerCase().split(/[0-9]+/)])
    .filter(Boolean);
}

/** The owner's private list (`BLOCKED_NAMES`, comma separated, held as a Cloudflare secret): each word in the filters' own form */
export function blockedList(raw: string | undefined | null) {
  return (raw ?? '')
    .split(',')
    .map((w) => squash(w.trim(), 'i'))
    .filter((w) => w.length >= 2);
}

/** Why `name` can't be a username (the line to show), or null when it can. `blocked`: `blockedList()`'s words */
export function usernameProblem(name: unknown, blocked: readonly string[] = []): string | null {
  if (typeof name !== 'string' || !name) return 'Pick a username.';
  if (name.length < USERNAME_MIN || name.length > USERNAME_MAX) return `Usernames are ${USERNAME_MIN} to ${USERNAME_MAX} characters.`;
  if (!NAME_CHARS.test(name)) return 'Use letters, numbers, _ and - only.';
  if (!/[A-Za-z]/.test(name)) return 'Put at least one letter in it.';
  if (/0x[0-9a-f]{4,}/i.test(name)) return "That looks like a wallet address. Pick a name instead.";
  const forms = [squash(name, 'i'), squash(name, 'l'), name.toLowerCase().replace(/[_-]/g, '')];
  const bits = parts(name);
  const any = (words: readonly string[]) => words.some((w) => forms.some((f) => f.includes(w)));
  const part = (words: readonly string[]) => bits.some((b) => words.includes(b));
  if (any(STAFF) || part(STAFF_PART)) return "That name is kept for the city's own people.";
  if (any(NEVER) || part(NEVER_PART) || any(blocked)) return "That name isn't allowed. Try another.";
  return null;
}
/** The form two usernames are compared in: one account per name whatever the case */
export const nameKey = (name: string) => name.toLowerCase();

/* ---------- Passwords and emails ---------- */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
const COMMON = ['password', 'password1', 'password123', '12345678', '123456789', '1234567890', 'qwerty123', 'qwertyuiop', 'iloveyou', 'sector7sector7', '11111111', '00000000', 'abcd1234', 'letmein1'];

/** Why `pw` can't be the password (the line to show), or null */
export function passwordProblem(pw: unknown, username?: string): string | null {
  if (typeof pw !== 'string' || pw.length < PASSWORD_MIN) return `Passwords are at least ${PASSWORD_MIN} characters.`;
  if (pw.length > PASSWORD_MAX) return `Passwords are at most ${PASSWORD_MAX} characters.`;
  if (username && pw.toLowerCase().includes(username.toLowerCase())) return "Don't put your username in your password.";
  if (COMMON.includes(pw.toLowerCase())) return 'That password is too easy to guess.';
  return null;
}

/** A plausible email address (the reset link proves it) */
export const emailOk = (s: unknown): s is string => typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
export const emailKey = (s: string) => s.trim().toLowerCase();

/* ---------- The account API ---------- */

/** The ways into an account */
export const WAYS = ['password', 'google', 'discord', 'wallet'] as const;
export type Way = (typeof WAYS)[number];
/** The sign-in providers (OAuth) */
export const PROVIDERS = ['google', 'discord'] as const;
export type Provider = (typeof PROVIDERS)[number];
export const PROVIDER_NAMES: Record<Provider, string> = { google: 'Google', discord: 'Discord' };

/** What the server has set up (GET /auth/config): which buttons to show */
export interface AuthConfig {
  google: boolean;
  discord: boolean;
  /** Reset links can be emailed (an email service's key is set) */
  email: boolean;
  chain: number;
}

/** A logged-in account (GET /auth/me): only its owner ever sees this */
export interface AccountMe {
  username: string;
  email: string | null;
  ways: { password: boolean; google: boolean; discord: boolean; wallet: string | null };
  chain: number;
  profile: OwnProfile;
}

/**
 * The answer to a way in: a session (`token`), or, for a first sign-in with
 * Google, Discord or a wallet, a short-lived `pending` pass to finish with a
 * username (POST /auth/finish).
 */
export type AuthAnswer = { token: string } | { pending: string; way: Way };

/** "0x1234…abcd" */
export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** The message a visitor signs to log in with their wallet (no transaction, no gas) */
export function signInMessage(o: { origin: string; address: string; chain: number; nonce: string; issued: string }) {
  return [
    'Sector 7 wants you to log in with your PulseChain wallet:',
    o.address,
    '',
    'This only proves you hold this wallet: it logs you in to your player profile. It does not send a transaction or cost gas.',
    '',
    `URI: ${o.origin}`,
    `Chain ID: ${o.chain}`,
    `Nonce: ${o.nonce}`,
    `Issued At: ${o.issued}`,
  ].join('\n');
}
