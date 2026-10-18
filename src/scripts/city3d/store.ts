/*
 * Builder state: the demo wallet, the plots you own and what stands on them.
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

interface State {
  v: 1;
  wallet: Wallet | null;
  plots: Record<string, Owned>;
}

export type BuyStep = 'wallet' | 'chain' | 'done';

const KEY = 'degen-city-builder-v1';
const empty = (): State => ({ v: 1, wallet: null, plots: {} });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const s = JSON.parse(raw) as State;
    return s && s.v === 1 && typeof s.plots === 'object' ? s : empty();
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
    owned(id: string) {
      return state.plots[id] ?? null;
    },
    ownedIds() {
      return Object.keys(state.plots);
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
      const o = state.plots[id];
      if (!o) return;
      o.design = { ...design };
      save();
    },

    demolish(id: string) {
      const o = state.plots[id];
      if (!o) return;
      delete o.design;
      save();
    },

    /** Simulated: gives the plot back and refunds the demo PLS paid. */
    release(id: string) {
      const o = state.plots[id];
      if (!o) return;
      if (state.wallet) state.wallet.balance += o.price;
      delete state.plots[id];
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
