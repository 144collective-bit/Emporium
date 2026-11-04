/*
 * A wallet's cloud save (docs/account-plan.md Phase 1): one Durable Object
 * per wallet, addressed by the hash of its address (keys.ts `walletKey()`,
 * the same as its Profile). The Worker (index.ts, /save) checks the session
 * and calls these methods.
 *
 * - The save is every key in CLOUD_KEYS (net/savecheck.ts), each stored in
 *   pieces (`split()`), with a revision that goes up on every write.
 * - One device at a time: `lease()` hands this device the save, and a write
 *   with any other lease is refused, so a second device takes over and the
 *   first stops saving. A write must also come from the revision it was
 *   made from (`base`).
 * - Every upload goes through `checkSaves()`: cleaned, and turned away if
 *   anything grew faster than the game allows since the last one accepted.
 * - Before the first write of each day (UTC), the save as it stood is kept
 *   as a snapshot (the progress: not the kart ghosts or the settings), the last SNAPSHOTS of
 *   them, for `history()` and `restore()`.
 *
 * Only the server's own clock counts.
 */
import { DurableObject } from 'cloudflare:workers';
import { TYCOON_KEY } from '../../src/scripts/city3d/backup';
import {
  CLOUD_KEYS,
  SCORE_KEY,
  SNAPSHOTS,
  SNAPSHOT_KEYS,
  baselineOf,
  checkSaves,
  freshBaseline,
  isCloudKey,
  isSnapDay,
  join,
  snapDay,
  split,
  summaryOf,
  type CloudKey,
  type CloudLease,
  type CloudPutResult,
  type CloudSave,
  type SnapSummary,
} from '../../src/scripts/net/savecheck';
import { cleanSave } from '../../src/scripts/city3d/tycoon';
import type { Env } from './index';

interface Meta {
  rev: number;
  /** When a save was last accepted (0: never), and the city's game and the target score each */
  at: number;
  gameAt: number;
  scoreAt: number;
  /** When this account first took its save */
  created: number;
  lease: string | null;
  /** Pieces and characters per key held */
  pieces: Partial<Record<CloudKey, number>>;
  sizes: Partial<Record<CloudKey, number>>;
  /** The snapshots' days, oldest first */
  snaps: string[];
  /** Uploads turned away by the checks */
  refused: number;
}
interface Snap {
  summary: SnapSummary;
  pieces: Partial<Record<CloudKey, number>>;
}

/** Uploads a minute, at most */
const PUTS_PER_MIN = 30;
/** Storage takes at most 128 keys a call */
const BATCH = 128;

const newMeta = (now: number): Meta => ({ rev: 0, at: 0, gameAt: now, scoreAt: now, created: now, lease: null, pieces: {}, sizes: {}, snaps: [], refused: 0 });
const pieceKey = (prefix: string, k: CloudKey, i: number) => `${prefix}${k}:${i}`;
/** The object's storage, or a transaction on it */
type Store = Pick<DurableObjectStorage, 'get' | 'put' | 'delete'>;
const randomHex = (n: number) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');

export class Saves extends DurableObject<Env> {
  private meta: Meta | null = null;
  private puts: number[] = [];

  private async load() {
    this.meta ??= (await this.ctx.storage.get<Meta>('meta')) ?? newMeta(Date.now());
    return this.meta;
  }

  /** The values of `keys` stored under `prefix` (pieces joined) */
  private async read(st: Store, prefix: string, pieces: Partial<Record<CloudKey, number>>, keys: readonly CloudKey[]) {
    const names: string[] = [];
    for (const k of keys) for (let i = 0; i < (pieces[k] ?? 0); i++) names.push(pieceKey(prefix, k, i));
    const got = new Map<string, string>();
    for (let i = 0; i < names.length; i += BATCH) for (const [n, v] of await st.get<string>(names.slice(i, i + BATCH))) got.set(n, v);
    const out: Partial<Record<CloudKey, string>> = {};
    for (const k of keys) {
      const n = pieces[k] ?? 0;
      if (!n) continue;
      const parts = Array.from({ length: n }, (_, i) => got.get(pieceKey(prefix, k, i)));
      if (parts.every((p): p is string => typeof p === 'string')) out[k] = join(parts);
    }
    return out;
  }

  /** Put `writes` (null clears a key) under `prefix`, keeping `pieces` and `sizes` in step */
  private async write(st: Store, prefix: string, writes: Partial<Record<CloudKey, string | null>>, pieces: Partial<Record<CloudKey, number>>, sizes?: Partial<Record<CloudKey, number>>) {
    const puts: Record<string, string> = {};
    const dels: string[] = [];
    for (const [k, v] of Object.entries(writes) as [CloudKey, string | null][]) {
      const old = pieces[k] ?? 0;
      const parts = v === null ? [] : split(v);
      parts.forEach((p, i) => (puts[pieceKey(prefix, k, i)] = p));
      for (let i = parts.length; i < old; i++) dels.push(pieceKey(prefix, k, i));
      if (parts.length) pieces[k] = parts.length;
      else delete pieces[k];
      if (sizes) {
        if (v === null) delete sizes[k];
        else sizes[k] = v.length;
      }
    }
    const entries = Object.entries(puts);
    for (let i = 0; i < entries.length; i += BATCH) await st.put(Object.fromEntries(entries.slice(i, i + BATCH)));
    for (let i = 0; i < dels.length; i += BATCH) await st.delete(dels.slice(i, i + BATCH));
  }

  /** The whole save, and whether `lease` is still the current one */
  async get(lease?: unknown): Promise<CloudSave> {
    const m = await this.load();
    const raw = await this.read(this.ctx.storage, 'v:', m.pieces, CLOUD_KEYS);
    const saves: CloudSave['saves'] = {};
    for (const [k, v] of Object.entries(raw) as [CloudKey, string][]) {
      try {
        saves[k] = JSON.parse(v);
      } catch {
        /* never written that way: left out */
      }
    }
    return { rev: m.rev, at: m.at, saves, held: typeof lease === 'string' && !!m.lease && lease === m.lease };
  }

  /** This device takes the save; any other device's lease ends */
  async lease(): Promise<CloudLease> {
    const m = await this.load();
    m.lease = randomHex(16);
    await this.ctx.storage.put('meta', m);
    return { lease: m.lease, rev: m.rev };
  }

  /** An upload: the keys that changed, from revision `base`, by the device holding `lease` */
  async put(lease: unknown, base: unknown, saves: unknown): Promise<CloudPutResult> {
    const m = await this.load();
    const now = Date.now();
    if (typeof lease !== 'string' || lease !== m.lease) return { ok: false, why: 'lease', rev: m.rev };
    if (base !== m.rev) return { ok: false, why: 'stale', rev: m.rev };
    this.puts = this.puts.filter((t) => now - t < 60_000);
    if (this.puts.length >= PUTS_PER_MIN) return { ok: false, why: 'slow', rev: m.rev };
    this.puts.push(now);

    const held = await this.read(this.ctx.storage, 'v:', m.pieces, [TYCOON_KEY, SCORE_KEY]);
    const baseline = m.rev ? baselineOf(held, m.gameAt, m.scoreAt) : freshBaseline(m.created);
    const changing = saves && typeof saves === 'object' ? Object.keys(saves).filter(isCloudKey) : [];
    const kept = Object.entries(m.sizes).reduce((a, [k, n]) => a + (changing.includes(k as CloudKey) ? 0 : (n ?? 0)), 0);
    const verdict = checkSaves(baseline, saves, now, kept);
    if (!verdict.ok) {
      m.refused++;
      await this.ctx.storage.put('meta', m);
      console.warn('save refused', { rev: m.rev, why: verdict.why, refused: m.refused });
      return { ok: false, why: 'check', checks: verdict.why, rev: m.rev };
    }

    // Worked on a copy, so a transaction that fails leaves what's in memory as it was stored
    const next: Meta = structuredClone(m);
    await this.ctx.storage.transaction(async (txn) => {
      await this.snapshot(txn, next, now);
      await this.write(txn, 'v:', verdict.writes, next.pieces, next.sizes);
      next.rev++;
      next.at = now;
      if (TYCOON_KEY in verdict.writes) next.gameAt = now;
      if (SCORE_KEY in verdict.writes) next.scoreAt = now;
      await txn.put('meta', next);
    });
    this.meta = next;
    return { ok: true, rev: next.rev };
  }

  /** Before the first write of a day, keep the save as it stands (if there is one) */
  private async snapshot(st: Store, m: Meta, now: number) {
    const day = snapDay(now);
    if (!m.rev || m.snaps.includes(day)) return;
    const values = await this.read(st, 'v:', m.pieces, SNAPSHOT_KEYS);
    const game = values[TYCOON_KEY];
    if (game === undefined) return;
    const pieces: Snap['pieces'] = {};
    await this.write(st, `s:${day}:`, values, pieces);
    await st.put(`snap:${day}`, { summary: summaryOf(day, m.at, cleanSave(JSON.parse(game), m.at)), pieces } satisfies Snap);
    m.snaps.push(day);
    while (m.snaps.length > SNAPSHOTS) await this.dropSnap(st, m.snaps.shift()!);
  }
  private async dropSnap(st: Store, day: string) {
    const s = await st.get<Snap>(`snap:${day}`);
    if (s) await this.write(st, `s:${day}:`, Object.fromEntries(Object.keys(s.pieces).map((k) => [k, null])), { ...s.pieces });
    await st.delete(`snap:${day}`);
  }

  /** The snapshots kept, newest first */
  async history(): Promise<SnapSummary[]> {
    const m = await this.load();
    const out: SnapSummary[] = [];
    for (const day of [...m.snaps].reverse()) {
      const s = await this.ctx.storage.get<Snap>(`snap:${day}`);
      if (s) out.push(s.summary);
    }
    return out;
  }

  /**
   * Put a snapshot back (the progress; the kart ghosts and the settings stay
   * as they are), by the device holding the save. The checks measure from it after.
   */
  async restore(lease: unknown, day: unknown): Promise<CloudPutResult | { ok: false; why: 'day'; rev: number }> {
    const m = await this.load();
    if (typeof lease !== 'string' || lease !== m.lease) return { ok: false, why: 'lease', rev: m.rev };
    if (!isSnapDay(day) || !m.snaps.includes(day)) return { ok: false, why: 'day', rev: m.rev };
    const s = await this.ctx.storage.get<Snap>(`snap:${day}`);
    if (!s) return { ok: false, why: 'day', rev: m.rev };
    const values = await this.read(this.ctx.storage, `s:${day}:`, s.pieces, SNAPSHOT_KEYS);
    const now = Date.now();
    const next: Meta = structuredClone(m);
    await this.ctx.storage.transaction(async (txn) => {
      await this.write(txn, 'v:', Object.fromEntries(SNAPSHOT_KEYS.map((k) => [k, values[k] ?? null])), next.pieces, next.sizes);
      next.rev++;
      next.at = next.gameAt = next.scoreAt = now;
      await txn.put('meta', next);
    });
    this.meta = next;
    return { ok: true, rev: next.rev };
  }

  /** Delete the save, its snapshots and everything about it (deleting the account) */
  async wipe() {
    await this.ctx.storage.deleteAll();
    this.meta = null;
    this.puts = [];
  }
}
