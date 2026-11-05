/*
 * Cloud saves (docs/account-plan.md Phase 1): what a wallet's save on the
 * game server holds, and the checks every upload goes through before the
 * server keeps it. Free of the DOM, shared by the server (server/src/saves.ts)
 * and the browser, tested in tests/savecheck.test.ts.
 *
 * - The keys are the backup's (backup.ts `BACKUP_KEYS`), but the walk
 *   settings go up as two copies, one for phones and one for desktops
 *   (`settingsKey()`): a touch layout means nothing on a laptop.
 * - Every value is cleaned by the same cleaner the browser loads it with, so
 *   the server only ever holds values the game could have made.
 * - The checks are sanity checks, not a rerun of the economy: between the
 *   last save the server accepted and this one, what the business is worth
 *   (`worth()`, every value at the same moment's prices, so the market's
 *   swings don't count), XP, each lifetime counter and the target score may
 *   grow at most a burst plus a rate for each real minute that passed
 *   (`GROW`). A badge new in this save must be earned by it. They catch an
 *   edited save, not a determined cheat (the plan's risks).
 * - Values are stored in pieces (`split()` / `join()`), since one value in a
 *   Durable Object's storage is limited in size.
 */
import { BACKUP_KEYS, BACKUP_MAX, TYCOON_KEY } from '../city3d/backup';
import { cleanSave, level, newSave, worth, COUNTER_IDS, type CounterId, type TycoonSave } from '../city3d/tycoon';
import { BADGES, badgeMet } from '../city3d/missions';
import { cleanCar } from '../city3d/mycar';
import { cleanBike } from '../city3d/mybike';
import { cleanPlane } from '../city3d/myplane';
import { cleanTouch } from '../city3d/touchlayout';
import { weaponUnlocked } from '../city3d/combat-sim';
import { cleanLook, skinUnlocked, type SkinId } from './profile-data';

/* ---------- The keys ---------- */

/** The walk settings' key in the browser (walk.ts) */
export const SETTINGS_KEY = 'degen-city-walk-v1';
/** The kinds of device the settings are kept apart for */
export const DEVICES = ['phone', 'desktop'] as const;
export type Device = (typeof DEVICES)[number];
/** The settings' key in the cloud for a kind of device */
export const settingsKey = (d: Device) => `${SETTINGS_KEY}:${d}` as const;
export const SCORE_KEY = 'degen-city-combat-v1';
export const GHOSTS_KEY = 'degen-city-ghosts-v2';
/** Every key a cloud save holds */
export const CLOUD_KEYS = [...BACKUP_KEYS.filter((k) => k !== SETTINGS_KEY), ...DEVICES.map(settingsKey)] as const;
export type CloudKey = (typeof CLOUD_KEYS)[number];
export const isCloudKey = (k: unknown): k is CloudKey => CLOUD_KEYS.includes(k as CloudKey);
/**
 * What goes in a daily snapshot, and what a restore puts back: the progress,
 * not the kart ghosts (the bulk, and only replays) or the settings (a
 * restore rolls back a bad session, never the controls).
 */
export const SNAPSHOT_KEYS = CLOUD_KEYS.filter((k) => k !== GHOSTS_KEY && !k.startsWith(`${SETTINGS_KEY}:`));

/** The most one key's value may be (characters of JSON): the ghosts are the bulk */
export const KEY_MAX: Record<CloudKey, number> = Object.fromEntries(CLOUD_KEYS.map((k) => [k, k === GHOSTS_KEY ? 3_500_000 : k === TYCOON_KEY ? 512_000 : 64_000])) as Record<CloudKey, number>;
/** The most a whole save may be, as the backup file's */
export const SAVE_MAX = BACKUP_MAX;

/* ---------- Growth ---------- */

/** At most `burst` plus `perMin` for each real minute since the last save accepted */
export interface Limit {
  burst: number;
  perMin: number;
}
/**
 * Generous on purpose. A fully built business with every shelf full grows
 * its worth about 350 a minute and its XP about 95 (the test measures it);
 * the bursts cover the most one sitting can bring in at once (the three
 * richest missions claimed together, a Neon series' last race and its
 * trophy, the daily challenge, a bout's purse, the badges that come with
 * them: the test works it out from the game's own tables).
 */
export const GROW: { worth: Limit; xp: Limit; score: Limit; played: Limit; counters: Partial<Record<CounterId, Limit>>; counter: Limit } = {
  worth: { burst: 200_000, perMin: 8_000 },
  /** Seconds played (Phase 5): no faster than the clock, with room for two windows open side by side and a clock that's off */
  played: { burst: 900, perMin: 120 },
  xp: { burst: 30_000, perMin: 1_000 },
  /** Target practice's lifetime score (dummies 100, drones 150) */
  score: { burst: 5_000, perMin: 3_000 },
  counters: {
    sold: { burst: 2_000, perMin: 600 },
    earned: { burst: 100_000, perMin: 20_000 },
    driven: { burst: 5_000, perMin: 4_000 },
    dummies: { burst: 200, perMin: 120 },
    drones: { burst: 200, perMin: 120 },
    fistDowns: { burst: 200, perMin: 120 },
    overtakes: { burst: 100, perMin: 40 },
    cleanLaps: { burst: 50, perMin: 20 },
  },
  /** Every other counter */
  counter: { burst: 100, perMin: 60 },
};
export const allowance = (l: Limit, minutes: number) => l.burst + l.perMin * Math.max(0, minutes);

/* ---------- Cleaning ---------- */

const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

/** Target practice's save (combat.ts's own loader, without the DOM) */
export interface Score {
  total: number;
  skin: SkinId;
  weapon: string;
}
export function cleanScore(v: unknown): Score {
  const o = obj(v) ?? {};
  const total = typeof o.total === 'number' && Number.isFinite(o.total) ? Math.min(1e12, Math.max(0, Math.floor(o.total))) : 0;
  const skin = typeof o.skin === 'string' && skinUnlocked(o.skin as SkinId, total) ? (o.skin as SkinId) : 'olive';
  const weapon = weaponUnlocked(o.weapon, total) ? (o.weapon as string) : 'rifle';
  return { total, skin, weapon };
}
/** The walk settings (walk.ts's own loader, without the DOM) */
export function cleanSettings(v: unknown) {
  const o = obj(v) ?? {};
  const sens = typeof o.sens === 'number' && Number.isFinite(o.sens) ? Math.min(2.5, Math.max(0.3, o.sens)) : 1;
  const autoAds = ['off', 'touch', 'always'].includes(o.autoAds as string) ? (o.autoAds as string) : 'off';
  return { sens, invert: !!o.invert, autoAds, touch: cleanTouch(o.touch) };
}
/** The kart ghosts: kept as they are (only the size is checked), as long as they're a set of ghosts */
const cleanGhosts = (v: unknown) => obj(v);

/** Every key's cleaner, but the city's game (cleaned with the time) */
const CLEAN: Record<Exclude<CloudKey, typeof TYCOON_KEY>, (v: unknown) => unknown> = {
  'degen-city-car-v1': cleanCar,
  'degen-city-bike-v1': cleanBike,
  'degen-city-plane-v1': cleanPlane,
  'degen-city-look-v1': cleanLook,
  [SCORE_KEY]: cleanScore,
  [GHOSTS_KEY]: cleanGhosts,
  'degen-city-walk-v1:phone': cleanSettings,
  'degen-city-walk-v1:desktop': cleanSettings,
};

/* ---------- The checks ---------- */

/** What an upload is checked against: the city's game and the target score the server last accepted, and when each was (server time) */
export interface Baseline {
  game: TycoonSave;
  gameAt: number;
  score: number;
  scoreAt: number;
}
/** A new account's baseline: a fresh game from when the account first took its save */
export const freshBaseline = (at: number): Baseline => ({ game: newSave(at), gameAt: at, score: 0, scoreAt: at });
/** The baseline from what the server holds (the stored JSON) and when each part was last accepted */
export function baselineOf(stored: Partial<Record<CloudKey, string>>, gameAt: number, scoreAt: number): Baseline {
  const parse = (s: string | undefined) => {
    try {
      return s === undefined ? undefined : JSON.parse(s);
    } catch {
      return undefined;
    }
  };
  const game = parse(stored[TYCOON_KEY]);
  return { game: game ? cleanSave(game, gameAt) : newSave(gameAt), gameAt, score: cleanScore(parse(stored[SCORE_KEY])).total, scoreAt };
}

/** Why an upload was turned away */
export type Why = 'empty' | 'key' | 'size' | 'shape' | 'game' | 'worth' | 'xp' | 'score' | 'played' | 'badge' | `counter:${CounterId}`;
export type Verdict = { ok: true; writes: Partial<Record<CloudKey, string | null>> } | { ok: false; why: Why[] };

/**
 * Check an upload: `saves` is the keys that changed (a value, or null to
 * clear it; the city's game can't be cleared). On a yes, `writes` is what to
 * store, each value cleaned and as JSON. `total` is how big the whole save
 * would be after it (the server adds up what it keeps).
 */
export function checkSaves(base: Baseline, saves: unknown, now: number, total = 0): Verdict {
  const o = obj(saves);
  if (!o || !Object.keys(o).length) return { ok: false, why: ['empty'] };
  const why = new Set<Why>();
  const writes: Partial<Record<CloudKey, string | null>> = {};
  const since = (t: number) => (now - t) / 60000;
  let size = total;
  for (const [k, v] of Object.entries(o)) {
    if (!isCloudKey(k)) {
      why.add('key');
      continue;
    }
    if (v === null) {
      if (k === TYCOON_KEY) why.add('game');
      else writes[k] = null;
      continue;
    }
    if (!obj(v)) {
      why.add('shape');
      continue;
    }
    let raw: string;
    try {
      raw = JSON.stringify(v);
    } catch {
      why.add('shape');
      continue;
    }
    if (raw.length > KEY_MAX[k]) {
      why.add('size');
      continue;
    }
    size += raw.length;
    if (k === TYCOON_KEY) {
      const game = cleanSave(v, now);
      for (const w of grew(base, game, now, since(base.gameAt))) why.add(w);
      writes[k] = JSON.stringify(game);
    } else {
      const clean = CLEAN[k](v);
      if (clean === null) {
        why.add('shape');
        continue;
      }
      if (k === SCORE_KEY && (clean as Score).total - base.score > allowance(GROW.score, since(base.scoreAt))) why.add('score');
      writes[k] = k === GHOSTS_KEY ? raw : JSON.stringify(clean);
    }
  }
  if (size > SAVE_MAX) why.add('size');
  return why.size ? { ok: false, why: [...why] } : { ok: true, writes };
}

/** What grew faster than the game allows from the baseline to this game */
function grew(base: Baseline, game: TycoonSave, now: number, minutes: number): Why[] {
  const out: Why[] = [];
  const prev = base.game;
  if (worth(game, now) - worth(prev, now) > allowance(GROW.worth, minutes)) out.push('worth');
  if (game.xp - prev.xp > allowance(GROW.xp, minutes)) out.push('xp');
  if (game.played - prev.played > allowance(GROW.played, minutes)) out.push('played');
  for (const c of COUNTER_IDS) if (game.counters[c] - prev.counters[c] > allowance(GROW.counters[c] ?? GROW.counter, minutes)) out.push(`counter:${c}`);
  for (const id of game.badges) {
    if (prev.badges.includes(id)) continue;
    const b = BADGES.find((x) => x.id === id);
    if (!b || !badgeMet(game, b)) out.push('badge');
  }
  return [...new Set(out)];
}

/* ---------- Storing ---------- */

/** Characters in one stored piece: under the storage's limit for one value even if every character takes two bytes */
export const CHUNK = 60_000;
/** A value cut into pieces for storage (an empty value is one empty piece) */
export function split(s: string, size = CHUNK): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out.length ? out : [''];
}
export const join = (pieces: readonly string[]) => pieces.join('');

/* ---------- Snapshots ---------- */

/** How many daily snapshots the server keeps */
export const SNAPSHOTS = 10;
/** A snapshot's day (UTC) */
export const snapDay = (now: number) => new Date(now).toISOString().slice(0, 10);
export const isSnapDay = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
/** What the save history shows of a snapshot */
export interface SnapSummary {
  day: string;
  at: number;
  level: number;
  dorras: number;
  xp: number;
}
export const summaryOf = (day: string, at: number, game: TycoonSave): SnapSummary => ({ day, at, level: level(game), dorras: game.dorras, xp: game.xp });

/* ---------- The API (server/src/index.ts, /save) ---------- */

/** GET /save (?lease=: the device's lease, to be told whether it still holds the save) */
export interface CloudSave {
  rev: number;
  /** When the server last accepted a save (0: never) */
  at: number;
  saves: Partial<Record<CloudKey, unknown>>;
  /**
   * The lease asked about is still the current one: no other device has
   * taken the save since, so any revision the device hasn't seen is its own
   * (an upload as the page closed, or another tab's).
   */
  held?: boolean;
}
/** POST /save/lease: this device takes the save (any other device's lease ends) */
export interface CloudLease {
  lease: string;
  rev: number;
}
/** PUT /save */
export interface CloudPut {
  lease: string;
  /** The revision the upload was made from */
  base: number;
  saves: Partial<Record<CloudKey, unknown>>;
}
export type CloudPutResult =
  | { ok: true; rev: number }
  /** lease: another device took the save; stale: the save moved on since `base` (load it again); slow: too many uploads */
  | { ok: false; why: 'lease' | 'stale' | 'slow'; rev: number }
  | { ok: false; why: 'check'; checks: Why[]; rev: number };
