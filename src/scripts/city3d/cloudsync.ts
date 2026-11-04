/*
 * Keeping a wallet's save in this browser and on the game server in step
 * (docs/account-plan.md Phase 2): the rules, free of the DOM, tested in
 * tests/cloudsync.test.ts. cloudsave.ts does the talking.
 *
 * - The browser keeps a note with the wallet's slot (`CloudMeta`, under
 *   saveslot.ts's `CLOUD_META_KEY`): the server's revision its copy is
 *   from, this device's lease, and the keys changed since they last went up
 *   (`dirty`), so a change made offline or just before the tab closed goes
 *   up the next time.
 * - The keys are the slot's (backup.ts's `BACKUP_KEYS`); the walk settings
 *   go up as this kind of device's (`toCloud()`), and only this kind's come
 *   down.
 * - Coming down (`pullPlan()`): if the server's revision is the one this
 *   copy is from, nothing comes down; if this device still holds the save
 *   (`held`), a revision it hasn't seen is its own (an upload as the page
 *   closed whose answer never came, or another tab's), so this copy is still
 *   the newest and only the revision is taken; on a new account's first contact
 *   everything kept here goes up; otherwise the server's copy wins (another
 *   device played, or the account was deleted and started again), and
 *   anything changed here that hadn't gone up is lost (`lost`, said on screen).
 */
import { BACKUP_KEYS, TYCOON_KEY } from './backup';
import { SETTINGS_KEY, settingsKey, type CloudKey, type CloudSave, type Device } from '../net/savecheck';

/** The keys kept in step: the slot's */
export const LOCAL_KEYS: readonly string[] = BACKUP_KEYS;

export interface CloudMeta {
  /** The server's revision this browser's copy is from (0: never in step yet) */
  rev: number;
  /** This device's hold on the save (cloudsave.ts takes one when it connects) */
  lease: string | null;
  /** Keys changed here since they last went up */
  dirty: string[];
}
export const freshMeta = (): CloudMeta => ({ rev: 0, lease: null, dirty: [] });
export function cleanMeta(raw: unknown): CloudMeta {
  const o = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const rev = typeof o.rev === 'number' && Number.isInteger(o.rev) && o.rev >= 0 ? o.rev : 0;
  const lease = typeof o.lease === 'string' && /^[0-9a-f]{32}$/.test(o.lease) ? o.lease : null;
  const dirty = Array.isArray(o.dirty) ? [...new Set(o.dirty.filter((k): k is string => LOCAL_KEYS.includes(k as string)))] : [];
  return { rev, lease, dirty };
}

/** Phones and tablets keep their settings apart from desktops' */
export const deviceOf = (coarsePointer: boolean): Device => (coarsePointer ? 'phone' : 'desktop');
/** A slot key's name in the cloud */
export const toCloud = (key: string, device: Device): CloudKey => (key === SETTINGS_KEY ? settingsKey(device) : (key as CloudKey));

export type Pull =
  /** Already in step */
  | { kind: 'same' }
  /** Moved on by this device itself: this copy stays, the revision is taken */
  | { kind: 'ours'; rev: number }
  /** A new account's first contact: everything kept here goes up */
  | { kind: 'first'; dirty: string[] }
  /** The server's copy wins: `writes` to put in the slot (null clears a key) */
  | { kind: 'load'; writes: [string, string | null][]; meta: CloudMeta; lost: boolean; wiped: boolean };

/** What to do with the server's copy; `has` says whether the slot holds a key */
export function pullPlan(meta: CloudMeta, server: CloudSave, device: Device, has: (key: string) => boolean): Pull {
  if (server.rev === meta.rev && server.rev > 0) return { kind: 'same' };
  if (server.held && server.rev > 0) return { kind: 'ours', rev: server.rev };
  if (server.rev === 0 && meta.rev === 0) return { kind: 'first', dirty: [...new Set([...meta.dirty, ...LOCAL_KEYS.filter(has)])] };
  const writes: [string, string | null][] = [];
  const dirty: string[] = [];
  for (const k of LOCAL_KEYS) {
    const v = server.saves[toCloud(k, device)];
    if (v !== undefined && v !== null) writes.push([k, JSON.stringify(v)]);
    else if (k === SETTINGS_KEY) {
      // No settings of this kind of device up there yet: these ones go up
      if (has(k)) dirty.push(k);
    } else writes.push([k, null]);
  }
  return { kind: 'load', writes, meta: { rev: server.rev, lease: meta.lease, dirty }, lost: meta.dirty.length > 0, wiped: server.rev === 0 };
}

/**
 * What goes up: the changed keys' values, parsed (a key cleared here goes up
 * as null, but never the city's game). `drop` are keys that won't parse: they
 * can't go up, so they're no longer waiting.
 */
export function uploadBody(dirty: readonly string[], read: (key: string) => string | null, device: Device) {
  const saves: Partial<Record<CloudKey, unknown>> = {};
  const sent: string[] = [];
  const drop: string[] = [];
  for (const k of dirty) {
    const raw = read(k);
    if (raw === null) {
      if (k === TYCOON_KEY) drop.push(k);
      else {
        saves[toCloud(k, device)] = null;
        sent.push(k);
      }
      continue;
    }
    try {
      saves[toCloud(k, device)] = JSON.parse(raw);
      sent.push(k);
    } catch {
      drop.push(k);
    }
  }
  return { saves, sent, drop };
}

/**
 * What's still waiting after an upload went up: keys not sent, and keys
 * changed again while it was on its way (`changed`).
 */
export const settle = (dirty: readonly string[], sent: readonly string[], drop: readonly string[], changed: ReadonlySet<string>) =>
  dirty.filter((k) => (!sent.includes(k) && !drop.includes(k)) || changed.has(k));

/** Upload this long after the last change, but no later than MAX_WAIT after the first one waiting (ms) */
export const QUIET = 8_000;
export const MAX_WAIT = 25_000;
/** How long to wait before trying again after a failure: 5 s, doubling, at most a minute */
export const retryIn = (tries: number) => Math.min(60_000, 5_000 * 2 ** Math.max(0, tries));
/** A request's body small enough to go up as the page closes (keepalive's limit is 64 KB) */
export const KEEPALIVE_MAX = 60_000;
