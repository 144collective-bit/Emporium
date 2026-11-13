/*
 * The Outlands' save (docs/outlands-plan.md): its own localStorage key,
 * apart from the city's game, so whatever happens out there (a death, from
 * Phase 3) never touches Sector 7's save. DOM-free, tested in
 * tests/outlands.test.ts; the backup carries it (backup.ts `BACKUP_KEYS`).
 *
 * - Phase 0 keeps where the run is (where Degen stood and faced when he last
 *   left or saved), so going back carries on there; no run, a new one starts
 *   at the spawn.
 * - `cleanOutlands()` reads anything (nothing, junk, an older save) into a
 *   save that's safe to use: a run that isn't on walkable land is dropped.
 */
import { walkable } from './outlands';

export const OUTLANDS_KEY = 'degen-city-outlands-v1';
export const OUTLANDS_V = 1;

export interface OutlandsRun {
  /** Where he stands, and the way he faces (0 faces +z) */
  x: number;
  z: number;
  yaw: number;
  /** When the run began and when it was last saved (ms since 1970) */
  started: number;
  at: number;
}

export interface OutlandsSave {
  v: typeof OUTLANDS_V;
  /** The run in progress, if there is one */
  run: OutlandsRun | null;
  /** How many runs have been started */
  runs: number;
}

export const newOutlands = (): OutlandsSave => ({ v: OUTLANDS_V, run: null, runs: 0 });

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function cleanOutlands(raw: unknown): OutlandsSave {
  const s = newOutlands();
  if (!raw || typeof raw !== 'object') return s;
  const o = raw as Record<string, unknown>;
  if (num(o.runs) && o.runs >= 0) s.runs = Math.floor(o.runs);
  const r = o.run as Record<string, unknown> | null | undefined;
  if (r && typeof r === 'object' && num(r.x) && num(r.z) && walkable(r.x, r.z)) {
    const started = num(r.started) && r.started > 0 ? r.started : 0;
    s.run = { x: r.x, z: r.z, yaw: num(r.yaw) ? r.yaw : 0, started, at: num(r.at) && r.at >= started ? r.at : started };
    s.runs = Math.max(s.runs, 1);
  }
  return s;
}

/** A run carried on, or a new one at `spawn` (counted) */
export function startRun(s: OutlandsSave, spawn: { x: number; z: number; yaw: number }, now: number): OutlandsRun {
  if (s.run) return s.run;
  s.runs++;
  s.run = { x: spawn.x, z: spawn.z, yaw: spawn.yaw, started: now, at: now };
  return s.run;
}

/** Where the run is now */
export function keepRun(s: OutlandsSave, x: number, z: number, yaw: number, now: number) {
  if (!s.run || !walkable(x, z)) return;
  s.run.x = x;
  s.run.z = z;
  s.run.yaw = yaw;
  s.run.at = Math.max(s.run.started, now);
}
