/*
 * Your save as a file: everything the city keeps in this browser (the city's
 * game, your car and aircraft, your look, target practice, the walk
 * settings, your kart ghosts) packed into one JSON file to download, and
 * read back from one. Free of the DOM; the Vault's panel (tycoon-ui.ts)
 * does the downloading and the loading.
 *
 * - Only the city's own saves go in. The guest and wallet login tokens stay
 *   out (they're keys to a profile on the game server, not progress), and so
 *   do screen preferences.
 * - A file is checked before anything is written: it has to be a Sector 7
 *   backup with the city's game in it, every value has to be readable, and
 *   the city's game goes through `cleanSave()` like any save loaded.
 *   Each of the other saves is cleaned by its own loader when the city
 *   starts again.
 */
import { cleanSave, level, type TycoonSave } from './tycoon';

/** The city's game: a backup must carry it */
export const TYCOON_KEY = 'degen-city-tycoon-v1';
/** Every save a backup carries (localStorage keys) */
export const BACKUP_KEYS = [
  TYCOON_KEY,
  'degen-city-car-v1',
  'degen-city-plane-v1',
  'degen-city-look-v1',
  'degen-city-combat-v1',
  'degen-city-walk-v1',
  'degen-city-ghosts-v1',
] as const;
export type BackupKey = (typeof BACKUP_KEYS)[number];
export const BACKUP_KIND = 'sector7-save';
export const BACKUP_V = 1;
/** Bigger than any real save (the ghosts are the bulk) */
export const BACKUP_MAX = 4_000_000;

export interface Backup {
  kind: typeof BACKUP_KIND;
  v: typeof BACKUP_V;
  /** When it was made (ms since 1970) */
  at: number;
  saves: Partial<Record<BackupKey, unknown>>;
}

/** Pack the city's saves from storage (`get` reads a key; unreadable ones are left out) */
export function packBackup(get: (key: string) => string | null, now: number): Backup {
  const saves: Backup['saves'] = {};
  for (const k of BACKUP_KEYS) {
    const raw = get(k);
    if (raw === null) continue;
    try {
      saves[k] = JSON.parse(raw);
    } catch {
      /* a broken save isn't worth keeping */
    }
  }
  return { kind: BACKUP_KIND, v: BACKUP_V, at: now, saves };
}
/** The file's name: sector-7-save-2026-10-21.json */
export const backupName = (now: number) => `sector-7-save-${new Date(now).toISOString().slice(0, 10)}.json`;

export type ReadBackup =
  | { ok: true; writes: [BackupKey, string][]; at: number; level: number; dorras: number }
  | { ok: false; why: 'size' | 'json' | 'kind' | 'newer' | 'empty' };
/**
 * Check a backup file's text. On a yes, `writes` is every save to put back
 * (the city's game already cleaned), with what it holds for the confirm.
 */
export function readBackup(text: string, now: number): ReadBackup {
  if (text.length > BACKUP_MAX) return { ok: false, why: 'size' };
  let o: Record<string, unknown>;
  try {
    const v = JSON.parse(text);
    if (!v || typeof v !== 'object' || Array.isArray(v)) return { ok: false, why: 'kind' };
    o = v as Record<string, unknown>;
  } catch {
    return { ok: false, why: 'json' };
  }
  if (o.kind !== BACKUP_KIND) return { ok: false, why: 'kind' };
  if (typeof o.v !== 'number' || o.v > BACKUP_V) return { ok: false, why: 'newer' };
  const saves = o.saves && typeof o.saves === 'object' && !Array.isArray(o.saves) ? (o.saves as Record<string, unknown>) : {};
  const game = saves[TYCOON_KEY];
  if (!game || typeof game !== 'object' || Array.isArray(game)) return { ok: false, why: 'empty' };
  const save: TycoonSave = cleanSave(game, now);
  const writes: [BackupKey, string][] = [[TYCOON_KEY, JSON.stringify(save)]];
  for (const k of BACKUP_KEYS) if (k !== TYCOON_KEY && saves[k] !== undefined && saves[k] !== null) writes.push([k, JSON.stringify(saves[k])]);
  const at = typeof o.at === 'number' && Number.isFinite(o.at) ? Math.min(o.at, now) : 0;
  return { ok: true, writes, at, level: level(save), dorras: save.dorras };
}
