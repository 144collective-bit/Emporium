/*
 * Accounts: logging in with a wallet. One Durable Object for the whole game.
 *
 * The visitor's wallet signs a short message (personal_sign: no transaction,
 * no gas) holding a one-time nonce; the signature proves they hold the
 * address, and they get a session token (30 days). That one login covers
 * everything a wallet does in the city:
 * - their player profile (name, rank, score, look), kept per wallet so it
 *   follows them to any browser (a wallet's first login starts a fresh one).
 *
 * Only a hash of each session token is stored.
 */
import { DurableObject } from 'cloudflare:workers';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { isAddress, signInMessage, type AccountMe } from '../../src/scripts/net/auth';
import type { OwnProfile } from '../../src/scripts/net/protocol';
import type { Env } from './index';
import { sha256, walletKey } from './keys';

const NONCE_TTL = 10 * 60_000;
const SESSION_TTL = 30 * 24 * 3600_000;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (status: number, message: string) => json({ error: message }, status);
const randomHex = (n: number) => bytesToHex(crypto.getRandomValues(new Uint8Array(n)));
const bearer = (auth: string | null) => /^Bearer ([0-9a-f]{64})$/.exec(auth ?? '')?.[1] ?? null;

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

interface Session {
  address: string;
  exp: number;
}

export class Accounts extends DurableObject<Env> {
  private hits = new Map<string, { n: number; t: number }>();

  /** At most `n` requests a minute of one kind from one address */
  private limited(req: Request, kind: string, n: number) {
    const ip = req.headers.get('CF-Connecting-IP') ?? 'local';
    const k = `${kind}:${ip}`;
    const now = Date.now();
    const h = this.hits.get(k);
    if (!h || now - h.t > 60_000) {
      this.hits.set(k, { n: 1, t: now });
      if (this.hits.size > 5000) this.hits.clear();
      return false;
    }
    return ++h.n > n;
  }

  /** The wallet a session token belongs to, or null (also used by the rooms) */
  async check(token: unknown): Promise<string | null> {
    if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) return null;
    const key = `session:${await sha256(token)}`;
    const s = await this.ctx.storage.get<Session>(key);
    if (!s) return null;
    if (s.exp < Date.now()) {
      await this.ctx.storage.delete(key);
      return null;
    }
    return s.address;
  }

  async fetch(req: Request): Promise<Response> {
    const path = new URL(req.url).pathname.replace(/\/$/, '');
    try {
      if (req.method === 'GET' && path === '/auth/me') return this.limited(req, 'me', 60) ? fail(429, 'Slow down') : this.me(bearer(req.headers.get('Authorization')));
      if (req.method !== 'POST') return fail(404, 'Not found');
      const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body) return fail(400, 'Expected JSON');
      if (path === '/auth/nonce') return this.limited(req, 'nonce', 20) ? fail(429, 'Slow down') : this.nonce(body, req.headers.get('Origin') ?? '');
      if (path === '/auth/session') return this.limited(req, 'session', 20) ? fail(429, 'Slow down') : this.session(body);
      if (path === '/auth/rename') return this.limited(req, 'rename', 20) ? fail(429, 'Slow down') : this.rename(bearer(req.headers.get('Authorization')));
      if (path === '/auth/logout') return this.logout(bearer(req.headers.get('Authorization')));
      return fail(404, 'Not found');
    } catch (e) {
      console.error('accounts', e);
      return fail(500, 'Something went wrong');
    }
  }

  /** Step 1 of logging in: the exact message for the wallet to sign */
  private async nonce(body: Record<string, unknown>, origin: string) {
    if (!isAddress(body.address)) return fail(400, 'Not a wallet address');
    const chain = Number(this.env.AUTH_CHAIN_ID) || 943;
    const nonce = randomHex(12);
    const message = signInMessage({ origin, address: body.address, chain, nonce, issued: new Date().toISOString() });
    await this.ctx.storage.put(`nonce:${nonce}`, { address: body.address.toLowerCase(), message, exp: Date.now() + NONCE_TTL });
    // Now and then, clear out nonces nobody signed
    if (Math.random() < 0.05) {
      const now = Date.now();
      const stale = [...(await this.ctx.storage.list<{ exp: number }>({ prefix: 'nonce:', limit: 500 }))].filter(([, v]) => v.exp < now).map(([k]) => k);
      if (stale.length) await this.ctx.storage.delete(stale);
    }
    return json({ nonce, message });
  }

  /** Step 2: the signed message, for a session token */
  private async session(body: Record<string, unknown>) {
    const nonce = String(body.nonce ?? '');
    if (!/^[0-9a-f]{24}$/.test(nonce)) return fail(400, 'Bad sign-in');
    const n = await this.ctx.storage.get<{ address: string; message: string; exp: number }>(`nonce:${nonce}`);
    await this.ctx.storage.delete(`nonce:${nonce}`);
    if (!n || n.exp < Date.now()) return fail(401, 'Sign-in expired, try again');
    const signer = recoverSigner(n.message, String(body.signature ?? ''));
    if (signer !== n.address) return fail(401, "That signature isn't from this wallet");
    const token = randomHex(32);
    await this.ctx.storage.put(`session:${await sha256(token)}`, { address: n.address, exp: Date.now() + SESSION_TTL } satisfies Session);
    return json({ token, address: n.address });
  }

  private profile(address: string) {
    return walletKey(address).then((k) => this.env.PROFILES.get(this.env.PROFILES.idFromName(k)));
  }

  /** The logged-in wallet's basic profile: its player profile */
  private async me(token: string | null) {
    const address = await this.check(token);
    if (!address) return fail(401, 'Log in with your wallet');
    const profile = (await this.profile(address).then((p) => p.open(undefined, address))) as OwnProfile;
    const chain = Number(this.env.AUTH_CHAIN_ID) || 943;
    return json({ address, chain, profile } satisfies AccountMe);
  }

  private async rename(token: string | null) {
    const address = await this.check(token);
    if (!address) return fail(401, 'Log in with your wallet');
    const p = await this.profile(address);
    await p.open(undefined, address);
    const profile = (await p.rename()) as OwnProfile;
    return json({ profile });
  }

  private async logout(token: string | null) {
    if (token) await this.ctx.storage.delete(`session:${await sha256(token)}`);
    return json({ ok: true });
  }
}
