/*
 * The live settings in the browser (live.ts reads them): fetched once at the
 * boot (the boot waits at most LIVE_TIMEOUT, then goes on with the last copy
 * seen), again every POLL_MS while the tab is showing, kept in localStorage
 * for a visit when the backend can't be reached. Everything that's gated asks
 * `live` as it happens, and `onChange()` hears when something changed.
 *
 * Off for the texture bake and the benchmark (`?bake-textures`, `?bench`),
 * so neither depends on the backend.
 */
import { LIVE_KEY, LIVE_TIMEOUT, LIVE_URL, NO_LIVE, POLL_MS, closedLine, featureGate, featureName, placeGate, readLive, sameLive, type FeatureId, type Live } from './live';

const OFF = /[?&](bake-textures|bench)\b/.test(location.search);

function lastCopy(): Live {
  if (OFF) return NO_LIVE;
  try {
    const s = localStorage.getItem(LIVE_KEY);
    return s ? readLive(JSON.parse(s)) : NO_LIVE;
  } catch {
    return NO_LIVE;
  }
}

let current = lastCopy();
let lastCheck = 0;
const subs = new Set<(l: Live) => void>();

async function check(timeout: number) {
  if (OFF) return;
  lastCheck = Date.now();
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeout);
  try {
    const res = await fetch(LIVE_URL, { signal: ac.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!res.ok) return;
    const raw: unknown = await res.json();
    try {
      localStorage.setItem(LIVE_KEY, JSON.stringify(raw));
    } catch {}
    const next = readLive(raw);
    if (sameLive(next, current)) return;
    current = next;
    for (const fn of subs) fn(current);
  } catch {
    // (offline, slow or down: keep what we have)
  } finally {
    clearTimeout(t);
  }
}

let started = false;
let first: Promise<void> | null = null;

export const live = {
  get now() {
    return current;
  },
  /** Starts checking (once); resolves when the first check is back, or after LIVE_TIMEOUT */
  start(): Promise<void> {
    if (!started) {
      started = true;
      first = check(LIVE_TIMEOUT * 4);
      setInterval(() => {
        if (!document.hidden) void check(LIVE_TIMEOUT * 4);
      }, POLL_MS);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && Date.now() - lastCheck > POLL_MS) void check(LIVE_TIMEOUT * 4);
      });
    }
    return Promise.race([first!, new Promise<void>((r) => setTimeout(r, LIVE_TIMEOUT))]);
  },
  place: (id: string) => placeGate(current, id),
  feature: (id: FeatureId) => featureGate(current, id),
  /** A feature's closed line, or null when it's open */
  closed(id: FeatureId) {
    const g = featureGate(current, id);
    return g.open ? null : closedLine(featureName(id), g);
  },
  onChange(fn: (l: Live) => void) {
    subs.add(fn);
    return () => subs.delete(fn);
  },
};
