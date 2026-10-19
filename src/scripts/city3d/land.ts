/*
 * Live plot sales: the visitor's own PulseChain wallet (wallet.ts) and the
 * game server's land list (server/src/land.ts), behind the builder's Store.
 *
 * Buying: the wallet sends the plot price to the owner's wallet; the
 * transaction hash goes to the server, which checks the payment on
 * PulseChain and makes the sender the owner. A payment in flight is kept in
 * localStorage so a closed tab doesn't lose it: the claim is sent again on
 * the next visit.
 *
 * Building: the owner logs in with their wallet (account.ts: one signed
 * message, no gas), then each change is saved on the server for every
 * visitor to see.
 */
import { PLOT_PRICE, type Design } from '../../data/plots';
import { CHAINS, plsToWei, type ClaimStatus, type LandState } from '../net/land';
import type { PlotState } from './plots';
import type { Account } from './account';
import type { Network, PlotRecord, Store, Wallet } from './store';
import { balanceOf, ensureChain, findWallets, knownAccount, onWalletChange, pay, requestAccount, walletError, type WalletInfo } from './wallet';

const PENDING_KEY = 'degen-city-land-pending';
const WALLET_KEY = 'degen-city-land-wallet';
const REFRESH = 30_000;
const POLL = 4_000;

const read = <T>(store: Storage, key: string, fallback: T): T => {
  try {
    return (JSON.parse(store.getItem(key) || 'null') as T) ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (store: Storage, key: string, v: unknown) => {
  try {
    if (v === null) store.removeItem(key);
    else store.setItem(key, JSON.stringify(v));
  } catch {
    /* private mode: works for this visit only */
  }
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createLandStore(server: string, account: Account): Store {
  const base = server.replace(/\/$/, '').replace(/^ws/, 'http');
  let land: LandState | null = null;
  let wallet: Wallet | null = null;
  let current: WalletInfo | null = null;
  const listeners = new Set<() => void>();
  const changed = () => listeners.forEach((f) => f());
  const chain = () => (land ? CHAINS[land.chain] : undefined);

  async function api<T>(path: string, init?: RequestInit & { body?: string }): Promise<T> {
    const res = await fetch(base + path, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) throw Object.assign(new Error(data.error || `The server said ${res.status}`), { status: res.status });
    return data;
  }

  async function refresh() {
    try {
      land = await api<LandState>('/land');
      changed();
    } catch {
      /* offline or the server is down: keep what we had */
    }
  }

  async function updateBalance() {
    const w = wallet;
    if (!w || !current) return;
    try {
      w.balance = Number((await balanceOf(current, w.address)) / 10n ** 18n);
    } catch {
      /* the wallet's RPC is busy: keep the last balance */
    }
    changed();
  }

  function use(w: WalletInfo, address: string) {
    const first = current !== w;
    current = w;
    wallet = { address, balance: wallet?.address === address ? wallet.balance : 0 };
    write(localStorage, WALLET_KEY, w.id);
    if (first)
      onWalletChange(w, (accounts) => {
        if (accounts && !accounts[0]) {
          wallet = null;
          changed();
        } else if (accounts?.[0] && wallet && accounts[0].toLowerCase() !== wallet.address) {
          wallet = { address: accounts[0].toLowerCase(), balance: 0 };
          updateBalance();
        } else updateBalance();
      });
    updateBalance();
  }

  // A wallet that already lets this site see an account reconnects without asking
  (async () => {
    const id = read<string | null>(localStorage, WALLET_KEY, null);
    if (!id) return;
    const w = (await findWallets()).find((x) => x.id === id);
    const address = w ? await knownAccount(w) : null;
    if (w && address) use(w, address);
  })();

  /** Hand a payment to the server and wait until it's settled */
  async function settle(plot: string, tx: string): Promise<ClaimStatus> {
    let status: ClaimStatus | null = null;
    for (let i = 0; !status; i++) {
      try {
        status = await api<ClaimStatus>('/land/claim', { method: 'POST', body: JSON.stringify({ plot, tx }) });
      } catch (e) {
        if ((e as { status?: number }).status && (e as { status: number }).status < 500 && (e as { status: number }).status !== 429) throw e;
        if (i > 20) throw new Error('The game server can\'t be reached. Your payment is saved: come back later and it will be checked.');
        await wait(3000);
      }
    }
    refresh();
    while (status.status === 'pending') {
      await wait(POLL);
      try {
        status = await api<ClaimStatus>(`/land/claim?tx=${tx}`);
      } catch {
        /* keep waiting */
      }
      if (status.status === 'pending') refresh();
    }
    return status;
  }

  // Payments from an earlier visit that weren't settled yet
  const pending = read<{ plot: string; tx: string }[]>(localStorage, PENDING_KEY, []);
  const forget = (tx: string) =>
    write(
      localStorage,
      PENDING_KEY,
      read<{ plot: string; tx: string }[]>(localStorage, PENDING_KEY, []).filter((p) => p.tx !== tx)
    );
  for (const p of pending) settle(p.plot, p.tx).then(() => forget(p.tx), () => {});

  // Paused while the city is switched offline (a payment in flight still settles)
  let active = true;
  refresh();
  setInterval(() => active && document.visibilityState === 'visible' && refresh(), REFRESH);

  /** Logged in with the connected wallet (account.ts), asking it to sign only if it isn't yet */
  async function session(): Promise<string> {
    if (!wallet || !current) throw new Error('Connect your wallet first.');
    return account.tokenFor(current, wallet.address);
  }

  async function saveDesign(id: string, design: Design | null) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await session();
      try {
        const { plot } = await api<{ plot: PlotRecord }>('/land/design', { method: 'POST', body: JSON.stringify({ plot: id, design }), headers: { Authorization: `Bearer ${token}` } });
        if (land) land.plots[id] = plot;
        changed();
        return;
      } catch (e) {
        // An expired login: log in again once
        if ((e as { status?: number }).status !== 401 || attempt) throw e;
        account.expired();
      }
    }
  }

  const network = (): Network | null => {
    const c = chain();
    return c ? { name: c.name, short: c.short, symbol: c.symbol, testnet: c.testnet } : null;
  };

  return {
    mode: 'live',
    get network() {
      return network();
    },
    get open() {
      return !!land?.payee && !!chain();
    },
    get payee() {
      return land?.payee ?? null;
    },
    get price() {
      return Number(land?.price ?? PLOT_PRICE);
    },
    get confirmations() {
      return land?.confirmations ?? 3;
    },
    get wallet() {
      return wallet;
    },
    get(id) {
      return land?.plots[id] ?? null;
    },
    mine(id) {
      return !!wallet && land?.plots[id]?.owner === wallet.address;
    },
    pending(id) {
      return !!land?.pending.includes(id) && !land.plots[id];
    },
    states() {
      const out = new Map<string, PlotState>();
      if (!land) return out;
      for (const id of land.pending) out.set(id, 'pending');
      for (const [id, p] of Object.entries(land.plots)) out.set(id, wallet && p.owner === wallet.address ? 'mine' : 'taken');
      return out;
    },
    async wallets() {
      return (await findWallets()).map(({ id, name, icon }) => ({ id, name, icon }));
    },
    async connect(walletId) {
      const list = await findWallets();
      const w = list.find((x) => x.id === walletId) ?? list[0];
      if (!w) throw new Error('No wallet found in this browser.');
      try {
        const address = await requestAccount(w);
        const c = chain();
        if (c) await ensureChain(w, c);
        use(w, address);
      } catch (e) {
        throw new Error(walletError(e));
      }
      return wallet!;
    },
    disconnect() {
      wallet = null;
      current = null;
      write(localStorage, WALLET_KEY, null);
      changed();
    },
    async buy(plot, onStep) {
      await refresh();
      const c = chain();
      if (!land?.payee || !c) throw new Error('Plot sales aren\'t open yet.');
      if (!wallet || !current) throw new Error('Connect your wallet first.');
      if (land.plots[plot.id]) throw new Error('Someone already owns this plot.');
      if (land.pending.includes(plot.id)) throw new Error('A payment for this plot is being checked right now. Try another plot, or check back in a few minutes.');
      const price = plsToWei(land.price || PLOT_PRICE);
      onStep('wallet');
      let tx: string;
      try {
        await ensureChain(current, c);
        if ((await balanceOf(current, wallet.address)) < price) throw new Error(`Not enough ${c.symbol}: a plot is ${Number(land.price).toLocaleString('en-US')} ${c.symbol} plus a little for gas.`);
        tx = await pay(current, wallet.address, land.payee, price);
      } catch (e) {
        throw new Error(walletError(e));
      }
      // Kept until settled, so a closed tab doesn't lose the payment
      write(localStorage, PENDING_KEY, [...read<{ plot: string; tx: string }[]>(localStorage, PENDING_KEY, []), { plot: plot.id, tx }]);
      onStep('chain');
      const status = await settle(plot.id, tx);
      forget(tx);
      await refresh();
      updateBalance();
      if (status.status === 'owned') {
        onStep('done');
        return land!.plots[plot.id];
      }
      if (status.status === 'refund') throw new Error(`${status.reason ?? 'This plot went to someone else.'} Your payment is recorded for a refund.`);
      throw new Error(status.reason ?? 'The payment could not be confirmed.');
    },
    build: (id, design) => saveDesign(id, design),
    demolish: (id) => saveDesign(id, null),
    refresh,
    setActive(on) {
      if (on && !active) refresh();
      active = on;
    },
    subscribe(f) {
      listeners.add(f);
      return () => listeners.delete(f);
    },
  };
}
