/*
 * Whose save this browser is playing (docs/account-plan.md Phase 2): the
 * guest's, or a logged-in wallet's. Every file that reads or writes a save
 * (the keys in backup.ts's `BACKUP_KEYS`) goes through the slot, never
 * `localStorage` itself.
 *
 * - A guest's saves are the keys as they've always been, so nothing moves
 *   for anyone who never logs in.
 * - A wallet's saves sit beside them, the address added to each key
 *   (`degen-city-tycoon-v1@0xab12...`, `slotKey()`), so the two games never
 *   touch: an account always starts fresh and the guest game stays as it was.
 * - Which one is decided once, when the page starts, from the login kept in
 *   the browser (`degen-city-account-v1`); logging in or out reloads the page
 *   (the page's script in CityMap.astro). A session that ran out still
 *   plays the wallet's own copy here until it logs in again or plays as a
 *   guest (cloudsave.ts says so).
 * - Writes are told to whoever listens (cloudsave.ts uploads them); a write
 *   made `quiet` (the cloud's own copy coming down) isn't.
 *
 * DOM-free and with no imports (vehicleids.ts reads through it, and the
 * saves' own modules import that): the storage is given, or the browser's own
 * is found when first used. It never throws: a browser that won't keep anything (private
 * browsing, storage turned off) reads as empty, as the loaders always took it.
 */
/** The wallet login kept in the browser (account.ts) */
export const ACCOUNT_KEY = 'degen-city-account-v1';
/** The cloud's own note on a wallet's slot (cloudsync.ts), kept with the slot */
export const CLOUD_META_KEY = 'degen-city-cloud-v1';

/** What the slot needs of the browser's storage */
export interface KeyStore {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

const ADDRESS = /^0x[0-9a-f]{40}$/;
/** The wallet logged in on this browser (lowercase), or null for a guest */
export function loggedIn(store: KeyStore | null): string | null {
  try {
    const s = JSON.parse(store?.getItem(ACCOUNT_KEY) ?? 'null') as { address?: unknown; token?: unknown } | null;
    return s && typeof s.address === 'string' && ADDRESS.test(s.address) && typeof s.token === 'string' && /^[0-9a-f]{64}$/.test(s.token) ? s.address : null;
  } catch {
    return null;
  }
}
/** The session token kept with the login, or null */
export function tokenOf(store: KeyStore | null): string | null {
  try {
    const s = JSON.parse(store?.getItem(ACCOUNT_KEY) ?? 'null') as { token?: unknown } | null;
    return typeof s?.token === 'string' && /^[0-9a-f]{64}$/.test(s.token) ? s.token : null;
  } catch {
    return null;
  }
}
/** Where a profile's save is kept in the browser */
export const slotKey = (key: string, address: string | null) => (address ? `${key}@${address}` : key);

export interface Slot {
  /** The wallet whose save this is, or null: the guest's */
  readonly address: string | null;
  get(key: string): string | null;
  /** Store a value (false if the browser wouldn't); `quiet` isn't told to the listeners */
  set(key: string, value: string, quiet?: boolean): boolean;
  remove(key: string, quiet?: boolean): void;
  /** Told the key of every write that isn't quiet */
  subscribe(fn: (key: string) => void): () => void;
  /**
   * Nothing more is written (the page is about to start again on what was
   * just put in, and the game mustn't store its old copy over it first)
   */
  seal(): void;
}

export function createSlot(store: KeyStore | null, address: string | null): Slot {
  const fns = new Set<(key: string) => void>();
  let sealed = false;
  const tell = (key: string, quiet?: boolean) => {
    if (!quiet) for (const f of fns) f(key);
  };
  return {
    address,
    get(key) {
      try {
        return store?.getItem(slotKey(key, address)) ?? null;
      } catch {
        return null;
      }
    },
    set(key, value, quiet) {
      try {
        if (!store || sealed) return false;
        store.setItem(slotKey(key, address), value);
      } catch {
        return false;
      }
      tell(key, quiet);
      return true;
    },
    remove(key, quiet) {
      if (sealed) return;
      try {
        store?.removeItem(slotKey(key, address));
      } catch {
        return;
      }
      tell(key, quiet);
    },
    subscribe(fn) {
      fns.add(fn);
      return () => fns.delete(fn);
    },
    seal() {
      sealed = true;
    },
  };
}

/** The browser's storage, or null where there is none (the game server, a test) or it won't open */
export function browserStore(): KeyStore | null {
  try {
    return (globalThis as unknown as { localStorage?: KeyStore }).localStorage ?? null;
  } catch {
    return null;
  }
}

let page: Slot | null = null;
/** The page's slot: whose save this page plays, decided the first time it's asked */
export function slot(): Slot {
  if (!page) {
    const store = browserStore();
    page = createSlot(store, loggedIn(store));
  }
  return page;
}
/** A slot's value parsed (null if there's none or it won't parse) */
export function readJson(key: string, s: Slot = slot()): unknown {
  try {
    return JSON.parse(s.get(key) ?? 'null');
  } catch {
    return null;
  }
}
