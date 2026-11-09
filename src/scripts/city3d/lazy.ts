/*
 * A part of the city loaded when it's first used (`import()`: the gun store,
 * the garage's menu, the world map, the economy's screens...) that fails to
 * fetch (offline, or a page opened before a new version went live asking for
 * a file the new version replaced) used to leave its door prompt doing
 * nothing. `lazy(load, what)` wraps the import: the same promise while it's
 * in flight and once it's in, a toast "Couldn't load <what> · reload" once
 * on a failure, and the next call tries the fetch again (polish plan Phase
 * 4). The page's own `vite:preloadError` handler reloads once for a stale
 * chunk; this is for the rest.
 */
type Toast = (text: string, ms?: number) => void;
let toast: Toast | null = null;
/** Where the failures are said (index.ts gives it the city's toast once the economy is up) */
export function setLazyToast(t: Toast) {
  toast = t;
}

export function lazy<T>(load: () => Promise<T>, what: string): () => Promise<T> {
  let pending: Promise<T> | null = null;
  let said = false;
  return () =>
    (pending ??= load().catch((err: unknown) => {
      // (the next call tries again)
      pending = null;
      if (!said) {
        said = true;
        const line = `Couldn't load ${what} · reload`;
        if (toast) toast(line, 5000);
        else console.warn(line, err);
      }
      throw err;
    }));
}
