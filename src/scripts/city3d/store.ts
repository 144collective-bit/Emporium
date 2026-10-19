/*
 * Builder state: who owns which large plot and what stands on it, behind one
 * interface (Store) that the build-mode UI talks to.
 *
 * - Live (land.ts): the visitor's real PulseChain wallet pays, the game
 *   server checks the payment on chain and keeps the list every visitor sees.
 * - Demo (here, when the site has no game server): EVERYTHING IS SIMULATED.
 *   connect() invents an address, buy() waits a moment and invents a
 *   transaction hash, the balance is play money, and it all lives in this
 *   browser's localStorage. Keep it labelled as a demo.
 */
import { DEMO_WALLET_START, PLOT_PRICE } from '../../data/plots';
import type { Design, Plot, PlotState } from './plots';

export interface Wallet {
  address: string;
  /** Whole PLS */
  balance: number;
}

/** A plot that has an owner */
export interface PlotRecord {
  owner: string;
  tx: string;
  at: number;
  design?: Design;
}

export type BuyStep = 'wallet' | 'chain' | 'done';

export interface Network {
  name: string;
  short: string;
  symbol: string;
  testnet: boolean;
}

export interface WalletChoice {
  id: string;
  name: string;
  icon: string;
}

export interface Store {
  readonly mode: 'demo' | 'live';
  /** The PulseChain network sales run on (live only) */
  readonly network: Network | null;
  /** Plots can be bought (live: the owner's wallet is set on the server) */
  readonly open: boolean;
  /** The owner's wallet that payments go to (live) */
  readonly payee: string | null;
  /** Price of a plot in whole PLS (live: the game server's price, the one that's charged) */
  readonly price: number;
  /** Confirmations a payment needs (live) */
  readonly confirmations: number;
  readonly wallet: Wallet | null;
  get(id: string): PlotRecord | null;
  mine(id: string): boolean;
  /** A payment for this plot is being checked */
  pending(id: string): boolean;
  /** Every plot that isn't for sale, and why */
  states(): Map<string, PlotState>;
  /** Wallets in this browser to pick from (live; empty: none installed) */
  wallets(): Promise<WalletChoice[]>;
  connect(walletId?: string): Promise<Wallet>;
  disconnect(): void;
  buy(plot: Plot, onStep: (s: BuyStep) => void): Promise<PlotRecord>;
  build(id: string, design: Design): Promise<void>;
  demolish(id: string): Promise<void>;
  /** Load the latest owners (live) */
  refresh(): Promise<void>;
  subscribe(f: () => void): () => void;
  /** Live: stop or restart checking the server for new owners (the Online / Offline switch) */
  setActive?(on: boolean): void;
  /** Demo only: give a plot back for its demo PLS, and clear the whole demo */
  release?(id: string): void;
  reset?(): void;
}

interface Owned extends PlotRecord {
  price: number;
}
interface State {
  v: 2;
  wallet: Wallet | null;
  plots: Record<string, Owned>;
}

const KEY = 'degen-city-builder-v2';
const empty = (): State => ({ v: 2, wallet: null, plots: {} });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');

function load(): State {
  try {
    // Version 1 was the small-plot grid: those plots no longer exist, so it starts fresh
    const s = JSON.parse(localStorage.getItem(KEY) || 'null') as State | null;
    return s && s.v === 2 && typeof s.plots === 'object' ? s : empty();
  } catch {
    return empty();
  }
}

/** The demo: play money, saved in this browser only */
export function createDemoStore(): Store {
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
    mode: 'demo',
    network: null,
    open: true,
    payee: null,
    price: PLOT_PRICE,
    confirmations: 0,
    get wallet() {
      return state.wallet;
    },
    get(id) {
      return state.plots[id] ?? null;
    },
    mine(id) {
      return !!state.plots[id];
    },
    pending: () => false,
    states() {
      return new Map(Object.keys(state.plots).map((id) => [id, 'mine' as PlotState]));
    },
    wallets: async () => [{ id: 'demo', name: 'Demo wallet', icon: '' }],
    /** Simulated: invents a wallet with demo PLS. */
    async connect() {
      await wait(700);
      state.wallet = { address: `0x${hex(20)}`, balance: DEMO_WALLET_START };
      save();
      return state.wallet;
    },
    disconnect() {
      state.wallet = null;
      save();
    },
    /** Simulated purchase: "asks the wallet", "waits for PulseChain", then records the plot as yours. */
    async buy(plot, onStep) {
      const w = state.wallet;
      if (!w) throw new Error('Connect the demo wallet first.');
      if (state.plots[plot.id]) throw new Error('You already own this plot.');
      if (w.balance < plot.price) throw new Error('Not enough demo PLS for this plot.');
      onStep('wallet');
      await wait(1100);
      onStep('chain');
      await wait(1600);
      w.balance -= plot.price;
      const owned: Owned = { owner: w.address, tx: `0x${hex(32)}`, at: Date.now(), price: plot.price };
      state.plots[plot.id] = owned;
      save();
      onStep('done');
      return owned;
    },
    async build(id, design) {
      const o = state.plots[id];
      if (!o) return;
      o.design = { ...design };
      save();
    },
    async demolish(id) {
      const o = state.plots[id];
      if (!o) return;
      delete o.design;
      save();
    },
    refresh: async () => {},
    subscribe(f) {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    release(id) {
      const o = state.plots[id];
      if (!o) return;
      if (state.wallet) state.wallet.balance += o.price;
      delete state.plots[id];
      save();
    },
    reset() {
      state = empty();
      save();
    },
  };
}

/**
 * The Online / Offline switch's store (online.ts): the live store while
 * online, the demo while offline. The live one is only made the first time
 * the city goes online, so an offline visit never calls the game server.
 */
export function createSwitchStore(makeLive: () => Store, online: boolean) {
  const demo = createDemoStore();
  let liveStore: Store | null = null;
  let cur = demo;
  const listeners = new Set<() => void>();
  const changed = () => listeners.forEach((f) => f());
  demo.subscribe(() => cur === demo && changed());
  function setOnline(on: boolean) {
    if (on && !liveStore) {
      liveStore = makeLive();
      liveStore.subscribe(() => cur === liveStore && changed());
    }
    const next = on ? liveStore! : demo;
    liveStore?.setActive?.(on);
    if (next === cur) return;
    cur = next;
    changed();
  }
  setOnline(online);
  const store: Store = {
    get mode() {
      return cur.mode;
    },
    get network() {
      return cur.network;
    },
    get open() {
      return cur.open;
    },
    get payee() {
      return cur.payee;
    },
    get price() {
      return cur.price;
    },
    get confirmations() {
      return cur.confirmations;
    },
    get wallet() {
      return cur.wallet;
    },
    get: (id) => cur.get(id),
    mine: (id) => cur.mine(id),
    pending: (id) => cur.pending(id),
    states: () => cur.states(),
    wallets: () => cur.wallets(),
    connect: (id) => cur.connect(id),
    disconnect: () => cur.disconnect(),
    buy: (plot, onStep) => cur.buy(plot, onStep),
    build: (id, design) => cur.build(id, design),
    demolish: (id) => cur.demolish(id),
    refresh: () => cur.refresh(),
    subscribe(f) {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    // Demo only (builder-ui.ts checks they exist before using them)
    get release() {
      return cur.release;
    },
    get reset() {
      return cur.reset;
    },
  };
  return { store, setOnline };
}
