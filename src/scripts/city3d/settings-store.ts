/*
 * The settings in this browser (docs/settings-plan.md): `degen-city-settings-v1`, read once (and, the first time,
 * what lived in the Labels and walk keys before), written on every change. Everything that follows a setting reads
 * `settings()` (cheap: the record in memory) or hears `onSettings()`; the Settings tab writes `setSettings()`.
 *
 * `actions` are the rows that aren't kept (Sound and the walk's first person): the city fills them in once it's up,
 * and says when they change (`acted()`) so the tab can repaint.
 */
import { cleanSettings, LABELS_KEY, SETTINGS_KEY, WALK_KEY, type Settings } from './settings';

type Listener = (s: Readonly<Settings>, keys: readonly (keyof Settings)[]) => void;

let cur: Settings | null = null;
const subs = new Set<Listener>();
const actSubs = new Set<() => void>();

function read(key: string): unknown {
  try {
    const v = localStorage.getItem(key);
    return v === null ? null : key === LABELS_KEY ? v : JSON.parse(v);
  } catch {
    return null;
  }
}

function load(): Settings {
  const own = read(SETTINGS_KEY);
  if (own) return cleanSettings(own);
  // The first load: Labels' and the walk's settings come over, and are kept at once (the walk's key then keeps only
  // what it remembers itself, walk.ts)
  const s = cleanSettings(null, { labels: read(LABELS_KEY), walk: read(WALK_KEY) });
  write(s);
  return s;
}
function write(s: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* not kept: they hold for this visit */
  }
}

/** The settings now */
export function settings(): Readonly<Settings> {
  return (cur ??= load());
}

/** Change some: kept, and told to whatever listens (only the keys that changed) */
export function setSettings(patch: Partial<Settings>) {
  const was = settings();
  const next = cleanSettings({ ...was, ...patch });
  const keys = (Object.keys(next) as (keyof Settings)[]).filter((k) => JSON.stringify(next[k]) !== JSON.stringify(was[k]));
  if (!keys.length) return;
  cur = next;
  write(next);
  for (const fn of subs) fn(next, keys);
}

/** Hear every change; returns the way to stop */
export function onSettings(fn: Listener) {
  subs.add(fn);
  return () => void subs.delete(fn);
}

export interface Action {
  on(): boolean;
  set(on: boolean): void | Promise<unknown>;
}
/**
 * The rows that act on the city now, filled in by the city (none before it's up); `soundWanted`, Sound turned on
 * before there was a sound to turn on (the city turns it on when it makes it)
 */
export const actions: { sound?: Action; fp?: Action; soundWanted?: boolean } = {};
/** What the city was built with (Quality takes a reload: the tab offers one while the setting differs) */
export const boot: { quality?: Settings['quality'] } = {};
/** An action's state changed (the tab repaints) */
export const acted = () => actSubs.forEach((fn) => fn());
export function onActed(fn: () => void) {
  actSubs.add(fn);
  return () => void actSubs.delete(fn);
}
