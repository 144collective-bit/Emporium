/*
 * Land: one Durable Object for the whole city. Who owns which large plot and
 * what's built on it.
 *
 * Buying: the buyer's wallet sends the plot price in PLS to the owner's wallet
 * (LAND_PAYEE). The site hands the transaction hash here, and this checks it on
 * PulseChain itself, never trusting the browser: sent to the payee, at least
 * the price, succeeded, LAND_CONFIRMATIONS deep, not older than a day, and not
 * used before. The sender becomes the owner. A payment for a plot someone else
 * got first (or a short one) is recorded and logged for a manual refund.
 *
 * Building: an owner logs in with their wallet (accounts.ts: they sign a short
 * message, no transaction, no gas), then can change their building.
 * Designs are checked against the fixed lists in src/data/plots.ts.
 *
 * Everything is kept per network (LAND_CHAIN_ID), so testnet sales never mix
 * with mainnet ones.
 */
import { DurableObject } from 'cloudflare:workers';
import { PLOT_IDS, PLOT_PRICE, cleanDesign } from '../../src/data/plots';
import { CHAINS, isAddress, isTxHash, plsToWei, type ClaimStatus, type LandPlot, type LandState } from '../../src/scripts/net/land';
import type { Env } from './index';

/** How long a payment is looked for before giving up */
const CLAIM_WINDOW = 20 * 60_000;
const POLL = 6_000;
/** A payment made more than this long before it's claimed (seconds) doesn't count */
const MAX_AGE = 24 * 3600;

interface Claim {
  plot: string;
  tx: string;
  at: number;
  status: ClaimStatus['status'];
  owner?: string;
  reason?: string;
}
interface Refund {
  tx: string;
  from: string;
  plot: string;
  /** wei, as a decimal string */
  value: string;
  at: number;
  reason: string;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (status: number, message: string) => json({ error: message }, status);

export class Land extends DurableObject<Env> {
  private plots: Map<string, LandPlot> | null = null;
  private claims: Map<string, Claim> | null = null;
  private hits = new Map<string, { n: number; t: number }>();
  /** Payments being looked up right now (a claim and the alarm can overlap while PulseChain answers) */
  private checking = new Set<string>();

  private cfg() {
    const chain = Number(this.env.LAND_CHAIN_ID) || 943;
    const payee = isAddress(this.env.LAND_PAYEE) ? this.env.LAND_PAYEE.toLowerCase() : null;
    const price = /^\d+$/.test(this.env.LAND_PRICE_PLS ?? '') ? this.env.LAND_PRICE_PLS! : String(PLOT_PRICE);
    const confirmations = Math.max(1, Number(this.env.LAND_CONFIRMATIONS) || 3);
    const rpc = this.env.LAND_RPC || CHAINS[chain]?.rpc || '';
    return { chain, payee, price, confirmations, rpc, key: (k: string) => `${chain}:${k}` };
  }

  private async load() {
    const { key } = this.cfg();
    if (!this.plots) {
      this.plots = new Map();
      for (const [k, v] of await this.ctx.storage.list<LandPlot>({ prefix: key('plot:') })) this.plots.set(k.slice(key('plot:').length), v);
    }
    if (!this.claims) {
      this.claims = new Map();
      for (const [, c] of await this.ctx.storage.list<Claim>({ prefix: key('claim:') })) this.claims.set(c.tx, c);
    }
    return { plots: this.plots, claims: this.claims };
  }

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

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/$/, '');
    try {
      if (req.method === 'GET' && path === '/land') return json(await this.state());
      if (req.method === 'GET' && path === '/land/claim') return this.claimStatus(url.searchParams.get('tx'));
      if (req.method !== 'POST') return fail(404, 'Not found');
      const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body) return fail(400, 'Expected JSON');
      if (path === '/land/claim') return this.limited(req, 'claim', 12) ? fail(429, 'Slow down') : this.claim(body);
      if (path === '/land/design') return this.limited(req, 'design', 40) ? fail(429, 'Slow down') : this.design(body, req.headers.get('Authorization') ?? '');
      return fail(404, 'Not found');
    } catch (e) {
      console.error('land', e);
      return fail(500, 'Something went wrong');
    }
  }

  /** The plots a wallet owns on this network (the account's profile, accounts.ts) */
  async ownedBy(address: string): Promise<string[]> {
    const { plots } = await this.load();
    const a = address.toLowerCase();
    return [...plots].filter(([, p]) => p.owner === a).map(([id]) => id);
  }

  private async state(): Promise<LandState> {
    const c = this.cfg();
    const { plots, claims } = await this.load();
    return {
      chain: c.chain,
      payee: c.payee,
      price: c.price,
      confirmations: c.confirmations,
      plots: Object.fromEntries(plots),
      pending: [...new Set([...claims.values()].filter((x) => x.status === 'pending').map((x) => x.plot))],
    };
  }

  private async claimStatus(tx: string | null) {
    if (!isTxHash(tx)) return fail(400, 'Not a transaction hash');
    const { claims } = await this.load();
    const c = claims.get(tx.toLowerCase());
    if (!c) return fail(404, 'No claim for this transaction');
    return json({ status: c.status, plot: c.plot, owner: c.owner, reason: c.reason } satisfies ClaimStatus);
  }

  /** A buyer's payment for a plot: recorded, then checked on PulseChain until it's settled */
  private async claim(body: Record<string, unknown>) {
    const cfg = this.cfg();
    if (!cfg.payee) return fail(403, 'Plot sales are not open yet');
    const plot = String(body.plot ?? '');
    if (!PLOT_IDS.includes(plot)) return fail(400, 'No such plot');
    if (!isTxHash(body.tx)) return fail(400, 'Not a transaction hash');
    const tx = body.tx.toLowerCase();
    const { claims } = await this.load();
    const known = claims.get(tx);
    if (known) return json({ status: known.status, plot: known.plot, owner: known.owner, reason: known.reason } satisfies ClaimStatus);
    if (await this.ctx.storage.get(cfg.key(`used:${tx}`))) return fail(409, 'This payment has already been used');
    const c: Claim = { plot, tx, at: Date.now(), status: 'pending' };
    claims.set(tx, c);
    await this.ctx.storage.put(cfg.key(`claim:${tx}`), c);
    await this.check(c).catch((e) => console.warn('land check', e));
    if (c.status === 'pending') await this.ctx.storage.setAlarm(Date.now() + POLL);
    return json({ status: c.status, plot: c.plot, owner: c.owner, reason: c.reason } satisfies ClaimStatus);
  }

  async alarm() {
    const { claims } = await this.load();
    let waiting = false;
    for (const c of claims.values()) {
      if (c.status !== 'pending') continue;
      await this.check(c).catch((e) => console.warn('land check', e));
      if (c.status === 'pending') waiting = true;
    }
    if (waiting) await this.ctx.storage.setAlarm(Date.now() + POLL);
  }

  private async rpc<T>(method: string, params: unknown[]): Promise<T> {
    const { rpc } = this.cfg();
    const r = await fetch(rpc, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
    const j = (await r.json()) as { result?: T; error?: { message: string } };
    if (j.error) throw new Error(j.error.message);
    return j.result as T;
  }

  private async settle(c: Claim, status: Claim['status'], extra: Partial<Claim> = {}) {
    Object.assign(c, { status }, extra);
    await this.ctx.storage.put(this.cfg().key(`claim:${c.tx}`), c);
  }

  private async refund(c: Claim, from: string, value: bigint, reason: string) {
    const r: Refund = { tx: c.tx, from, plot: c.plot, value: value.toString(), at: Date.now(), reason };
    await this.ctx.storage.put(this.cfg().key(`refund:${c.tx}`), r);
    // In the Worker's logs (Cloudflare dashboard) so the owner can send it back
    console.error('LAND REFUND DUE', JSON.stringify(r));
    await this.settle(c, 'refund', { owner: from, reason });
  }

  /** One look at a pending payment on PulseChain */
  private async check(c: Claim) {
    if (c.status !== 'pending' || this.checking.has(c.tx)) return;
    this.checking.add(c.tx);
    try {
      await this.lookup(c);
    } finally {
      this.checking.delete(c.tx);
    }
  }
  private async lookup(c: Claim) {
    const cfg = this.cfg();
    if (Date.now() - c.at > CLAIM_WINDOW) return this.settle(c, 'failed', { reason: "This payment wasn't found on PulseChain in time. Check the transaction in your wallet." });
    const tx = await this.rpc<{ from: string; to: string | null; value: string; blockNumber: string | null; chainId?: string } | null>('eth_getTransactionByHash', [c.tx]);
    if (!tx || !tx.blockNumber) return;
    const receipt = await this.rpc<{ status: string } | null>('eth_getTransactionReceipt', [c.tx]);
    if (!receipt) return;
    if (receipt.status !== '0x1') return this.settle(c, 'failed', { reason: 'This payment failed on PulseChain, so no PLS moved.' });
    if (!tx.to || tx.to.toLowerCase() !== cfg.payee) return this.settle(c, 'failed', { reason: "This payment wasn't sent to the Degen City wallet." });
    if (tx.chainId && Number(tx.chainId) !== cfg.chain) return this.settle(c, 'failed', { reason: 'This payment is on another network.' });
    const latest = Number(await this.rpc<string>('eth_blockNumber', []));
    if (latest - Number(tx.blockNumber) + 1 < cfg.confirmations) return;
    const block = await this.rpc<{ timestamp: string } | null>('eth_getBlockByNumber', [tx.blockNumber, false]);
    if (block && Number(block.timestamp) < c.at / 1000 - MAX_AGE) return this.settle(c, 'failed', { reason: 'This payment is too old to claim a plot.' });

    // Settled on chain: one claim per payment, ever
    const usedKey = cfg.key(`used:${c.tx}`);
    if (await this.ctx.storage.get(usedKey)) return this.settle(c, 'failed', { reason: 'This payment has already been used.' });
    await this.ctx.storage.put(usedKey, c.plot);
    const from = tx.from.toLowerCase();
    const value = BigInt(tx.value);
    if (value < plsToWei(cfg.price)) return this.refund(c, from, value, 'Paid less than the plot price.');
    const { plots } = await this.load();
    if (plots.has(c.plot)) return this.refund(c, from, value, 'Someone else bought this plot first.');
    const p: LandPlot = { owner: from, tx: c.tx, at: Date.now() };
    plots.set(c.plot, p);
    await this.ctx.storage.put(cfg.key(`plot:${c.plot}`), p);
    await this.settle(c, 'owned', { owner: from });
  }

  /** An owner changes (or clears, with design: null) the building on their plot */
  private async design(body: Record<string, unknown>, auth: string) {
    const token = /^Bearer ([0-9a-f]{64})$/.exec(auth)?.[1];
    const address = token ? ((await this.env.ACCOUNTS.get(this.env.ACCOUNTS.idFromName('main')).check(token)) as string | null) : null;
    if (!address) return fail(401, 'Log in with your wallet first');
    const plot = String(body.plot ?? '');
    const { plots } = await this.load();
    const p = plots.get(plot);
    if (!p || p.owner !== address) return fail(403, "This plot isn't yours");
    if (body.design === null) delete p.design;
    else {
      const d = cleanDesign(body.design);
      if (!d) return fail(400, 'Not a building');
      p.design = d;
    }
    await this.ctx.storage.put(this.cfg().key(`plot:${plot}`), p);
    return json({ ok: true, plot: p });
  }
}
