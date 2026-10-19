/*
 * Builder state: the demo wallet, the plots you own, the big plots you've
 * merged them into (four in a 2 x 2 square) and what stands on them.
 *
 * EVERYTHING HERE IS SIMULATED. connect() invents an address, buy() waits a
 * moment and invents a transaction hash, and the balance is play money. The
 * state lives in this browser's localStorage only.
 *
 * When the real wallet arrives, replace connect() and buy() with calls to the
 * wallet / contract (they're already async and report progress the same
 * way), and load ownership from the chain instead of localStorage. The UI
 * only talks to this interface.
 */
import { DEMO_WALLET_START } from '../../data/plots';
import type { Design, Plot } from './plots';

export interface Wallet {
  address: string;
  balance: number;
}

export interface Owned {
  /** Simulated transaction hash */
  tx: string;
  at: number;
  price: number;
  design?: Design;
}

/** Four owned plots merged into one big plot (keyed by the big plot's id) */
interface Big {
  parts: string[];
  at: number;
  design?: Design;
}

interface State {
  v: 1;
  wallet: Wallet | null;
  plots: Record<string, Owned>;
  big: Record<string, Big>;
}

export type BuyStep = 'wallet' | 'chain' | 'done';

const KEY = 'degen-city-builder-v1';
const empty = (): State => ({ v: 1, wallet: null, plots: {}, big: {} });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const s = JSON.parse(raw) as State;
    if (!s || s.v !== 1 || typeof s.plots !== 'object') return empty();
    // Saved before big plots existed, or a big plot whose plots aren't all still owned
    s.big = s.big && typeof s.big === 'object' ? s.big : {};
    for (const [id, b] of Object.entries(s.big)) if (!Array.isArray(b.parts) || !b.parts.every((q) => s.plots[q])) delete s.big[id];
    return s;
  } catch {
    return empty();
  }
}

export function createStore() {
  let state = load();
  const listeners = new Set<() => void>();
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* private mode or storage full: the demo still works for this visit */
    }
    listeners.forEach((f) => f());
  };

  return {
    get wallet() {
      return state.wallet;
    },
    /** A plot you own (or a big plot you've merged: its first plot's transaction, the four prices added up) */
    owned(id: string): Owned | null {
      const b = state.big[id];
      if (b) {
        const first = state.plots[b.parts[0]];
        return { tx: first.tx, at: b.at, price: b.parts.reduce((n, q) => n + state.plots[q].price, 0), design: b.design };
      }
      return state.plots[id] ?? null;
    },
    ownedIds() {
      return Object.keys(state.plots);
    },
    bigIds() {
      return Object.keys(state.big);
    },
    /** The big plot a plot has been merged into, if any */
    bigOf(id: string) {
      for (const [bid, b] of Object.entries(state.big)) if (b.parts.includes(id)) return bid;
      return null;
    },

    /** Merge four plots you own (a 2 x 2 square, nothing built on them) into one big plot */
    merge(big: Plot) {
      const parts = big.parts ?? [];
      if (parts.length !== 4) throw new Error('A big plot is four plots in a 2 × 2 square.');
      if (!parts.every((q) => state.plots[q])) throw new Error('You need to own all four plots first.');
      if (parts.some((q) => this.bigOf(q))) throw new Error('One of these plots is already part of a big plot.');
      if (parts.some((q) => state.plots[q].design)) throw new Error('Clear the buildings on these plots first.');
      state.big[big.id] = { parts: [...parts], at: Date.now() };
      save();
    },

    /** Split a big plot (with nothing built on it) back into its four plots */
    split(id: string) {
      const b = state.big[id];
      if (!b) return;
      if (b.design) throw new Error('Demolish the building first.');
      delete state.big[id];
      save();
    },
    subscribe(f: () => void) {
      listeners.add(f);
      return () => listeners.delete(f);
    },

    /** Simulated: invents a wallet with demo PLS. */
    async connect(): Promise<Wallet> {
      await wait(700);
      state.wallet = { address: `0x${hex(20)}`, balance: DEMO_WALLET_START };
      save();
      return state.wallet;
    },

    disconnect() {
      state.wallet = null;
      save();
    },

    /**
     * Simulated purchase: "asks the wallet", "waits for PulseChain", then
     * records the plot as yours. Throws with a readable message if it can't.
     */
    async buy(plot: Plot, onStep: (s: BuyStep) => void): Promise<Owned> {
      if (!state.wallet) throw new Error('Connect the demo wallet first.');
      if (state.plots[plot.id]) throw new Error('You already own this plot.');
      if (state.wallet.balance < plot.price) throw new Error('Not enough demo PLS for this plot.');
      onStep('wallet');
      await wait(1100);
      onStep('chain');
      await wait(1600);
      state.wallet.balance -= plot.price;
      const owned: Owned = { tx: `0x${hex(32)}`, at: Date.now(), price: plot.price };
      state.plots[plot.id] = owned;
      save();
      onStep('done');
      return owned;
    },

    build(id: string, design: Design) {
      const o = state.big[id] ?? state.plots[id];
      if (!o) return;
      o.design = { ...design };
      save();
    },

    demolish(id: string) {
      const o = state.big[id] ?? state.plots[id];
      if (!o) return;
      delete o.design;
      save();
    },

    /** Simulated: gives the plot back (a big plot: all four) and refunds the demo PLS paid. */
    release(id: string) {
      const b = state.big[id];
      const ids = b ? b.parts : [id];
      if (b) delete state.big[id];
      for (const q of ids) {
        const o = state.plots[q];
        if (!o) continue;
        if (state.wallet) state.wallet.balance += o.price;
        delete state.plots[q];
      }
      save();
    },

    /** Clears the whole demo: wallet, plots and buildings. */
    reset() {
      state = empty();
      save();
    },
  };
}

export type Store = ReturnType<typeof createStore>;
