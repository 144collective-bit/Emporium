/*
 * A thin front for a feature whose code is a chunk the boot never downloads (as combat-lazy.ts is for target
 * practice): the same shape as the real thing, fetched when `when` says (normally once the first frame is drawn)
 * and standing in until then. Before it's in, a read gets the stand-in's answer from `idle` ("not driving, nothing
 * near") and any other call does nothing; once it's in, everything is the real one's. For something whose own state
 * starts the first time it's used (your car, your aircraft: docs/header-plan.md, the boot's trim), so nothing set
 * before it came is lost.
 */
import { lazy } from './lazy';

export function lazyFront<T extends object>(load: () => Promise<T>, what: string, idle: Partial<T>, when: (go: () => void) => void): T & { loaded(): Promise<T> } {
  let real: T | null = null;
  const get = lazy(load, what);
  let pending: Promise<T> | null = null;
  const loaded = () => (pending ??= get().then((r) => (real = r)));
  when(() => void loaded().catch(() => {}));
  return new Proxy({} as T & { loaded(): Promise<T> }, {
    get(_, k) {
      if (k === 'loaded') return loaded;
      if (real) return Reflect.get(real, k);
      if (k in idle) return Reflect.get(idle, k);
      return () => undefined;
    },
  });
}
