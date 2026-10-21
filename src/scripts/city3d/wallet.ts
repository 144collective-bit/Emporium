/*
 * PulseChain wallets in the browser. Talks to the visitor's own wallet
 * (EIP-1193): every installed wallet (MetaMask, Rabby, OKX and others, as
 * extensions or inside a wallet app's own browser) announces itself
 * (EIP-6963), with the older window.ethereum as a fallback. Without one (a
 * phone's normal browser, a computer without an extension) WalletConnect
 * links a phone wallet by QR code or app switch; its SDK only loads when
 * picked. No keys ever touch the site: the wallet asks the visitor to
 * approve each request.
 */
import { CHAINS, type Chain } from '../net/auth';
import { WALLETCONNECT_PROJECT_ID } from '../../data/site';

interface Eip1193 {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, f: (...args: never[]) => void): void;
}

export interface WalletInfo {
  id: string;
  name: string;
  /** A data: URI the wallet supplies (may be empty) */
  icon: string;
  /** A line under the name in the picker */
  note?: string;
  provider: Eip1193;
}

/* ---------- WalletConnect (phone wallets by QR code / app switch) ---------- */

export const WALLETCONNECT = 'walletconnect';
const WC_ID = (import.meta.env.PUBLIC_WALLETCONNECT_PROJECT_ID as string | undefined) || WALLETCONNECT_PROJECT_ID;
type WcProvider = Eip1193 & { session?: unknown; accounts: string[]; enable(): Promise<string[]>; disconnect(): Promise<void> };
let wc: Promise<WcProvider> | null = null;

/** The WalletConnect provider, made (and its SDK loaded) on first use; it restores an earlier session by itself */
function walletConnect(): Promise<WcProvider> {
  wc ??= (async () => {
    const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
    const ids = Object.keys(CHAINS).map(Number);
    return (await EthereumProvider.init({
      projectId: WC_ID,
      // Optional, so a wallet that doesn't list a PulseChain network can still connect (ensureChain adds it)
      optionalChains: ids as [number, ...number[]],
      rpcMap: Object.fromEntries(ids.map((id) => [id, CHAINS[id].rpc])),
      showQrModal: true,
      qrModalOptions: { themeMode: 'dark' },
      metadata: { name: 'Sector 7', description: 'Sector 7: PulseChain native', url: location.origin, icons: [`${location.origin}/icon-512.png`] },
    })) as unknown as WcProvider;
  })();
  wc.catch(() => (wc = null));
  return wc;
}

/** A plain QR-code mark (no wallet brand) */
const QR_ICON = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#00eaff" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/></svg>')}`;

const wcWallet: WalletInfo = {
  id: WALLETCONNECT,
  name: 'WalletConnect',
  icon: QR_ICON,
  note: 'Use a wallet app on your phone: scan a QR code, or pick the app',
  provider: {
    async request({ method, params }) {
      const p = await walletConnect();
      // Opens the QR / app picker unless there's a session already
      if (method === 'eth_requestAccounts') return p.session ? p.accounts : p.enable();
      if (method === 'eth_accounts') return p.session ? p.accounts : [];
      return p.request({ method, params });
    },
    on(event, f) {
      walletConnect().then((p) => p.on?.(event, f), () => {});
    },
  },
};

/** End a WalletConnect session (the wallet app forgets this site); nothing to do for installed wallets */
export async function forgetWallet(w: WalletInfo) {
  if (w.id !== WALLETCONNECT || !wc) return;
  const p = await wc.catch(() => null);
  if (p?.session) await p.disconnect().catch(() => {});
}

const found = new Map<string, WalletInfo>();
if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', (e) => {
    const d = (e as CustomEvent).detail as { info?: { uuid?: string; rdns?: string; name?: string; icon?: string }; provider?: Eip1193 } | undefined;
    if (!d?.provider || !d.info) return;
    const id = d.info.rdns || d.info.uuid || d.info.name || 'wallet';
    const icon = typeof d.info.icon === 'string' && d.info.icon.startsWith('data:image/') ? d.info.icon : '';
    found.set(id, { id, name: String(d.info.name || 'Wallet').slice(0, 40), icon, provider: d.provider });
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

/** Wallets in this browser (asks them to announce themselves again first), then WalletConnect when it's set up */
export async function findWallets(): Promise<WalletInfo[]> {
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  await new Promise((r) => setTimeout(r, 120));
  const list = [...found.values()];
  const legacy = (window as unknown as { ethereum?: Eip1193 }).ethereum;
  if (!list.length && legacy) list.push({ id: 'injected', name: 'Browser wallet', icon: '', provider: legacy });
  if (WC_ID) list.push(wcWallet);
  return list;
}

/** A readable message for a wallet error */
export function walletError(e: unknown) {
  const err = e as { code?: number; message?: string } | undefined;
  if (err?.code === 4001) return 'You cancelled in your wallet.';
  if (err?.code === -32002) return 'Your wallet is already asking you something: open it to answer.';
  const m = err?.message || String(e);
  return m.length > 160 ? `${m.slice(0, 157)}…` : m;
}

const hexId = (n: number) => `0x${n.toString(16)}`;
/** Installed wallets answer eth_chainId in hex; WalletConnect answers with a plain number */
const chainOf = async (w: WalletInfo) => {
  const v = await w.provider.request({ method: 'eth_chainId' });
  return typeof v === 'number' ? v : /^0x/i.test(String(v)) ? Number.parseInt(String(v), 16) : Number(v);
};

/** Make sure the wallet is on `chain`, adding the network to the wallet if it doesn't know it */
export async function ensureChain(w: WalletInfo, chain: Chain) {
  const current = await chainOf(w);
  if (current === chain.id) return;
  try {
    await w.provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexId(chain.id) }] });
  } catch (e) {
    const err = e as { code?: number; message?: string };
    if (err.code !== 4902 && !/unrecognized|not added|unknown chain/i.test(err.message ?? '')) throw e;
    await w.provider.request({
      method: 'wallet_addEthereumChain',
      params: [{ chainId: hexId(chain.id), chainName: chain.name, nativeCurrency: { name: chain.symbol, symbol: chain.symbol, decimals: 18 }, rpcUrls: [chain.rpc], blockExplorerUrls: [chain.explorer] }],
    });
  }
  const now = await chainOf(w);
  if (now !== chain.id) throw new Error(`Switch your wallet to ${chain.name} to continue.`);
}

/** Ask the wallet for an account (it shows its own connect prompt) */
export async function requestAccount(w: WalletInfo) {
  const accounts = (await w.provider.request({ method: 'eth_requestAccounts' })) as string[];
  if (!accounts?.[0]) throw new Error('Your wallet didn\'t share an account.');
  return accounts[0].toLowerCase();
}

/** The account the wallet already lets this site see, without asking (or null) */
export async function knownAccount(w: WalletInfo) {
  try {
    const accounts = (await w.provider.request({ method: 'eth_accounts' })) as string[];
    return accounts?.[0]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

/** Balance in wei */
export async function balanceOf(w: WalletInfo, address: string) {
  return BigInt(String(await w.provider.request({ method: 'eth_getBalance', params: [address, 'latest'] })));
}

/** Send `wei` to `to`; the wallet shows the payment for approval. Returns the transaction hash. */
export async function pay(w: WalletInfo, from: string, to: string, wei: bigint) {
  return String(await w.provider.request({ method: 'eth_sendTransaction', params: [{ from, to, value: `0x${wei.toString(16)}` }] })).toLowerCase();
}

/** personal_sign: the wallet shows the message and signs it (no transaction, no gas) */
export async function signMessage(w: WalletInfo, address: string, message: string) {
  const hex = `0x${Array.from(new TextEncoder().encode(message), (b) => b.toString(16).padStart(2, '0')).join('')}`;
  return String(await w.provider.request({ method: 'personal_sign', params: [hex, address] }));
}

export function onWalletChange(w: WalletInfo, f: (accounts: string[] | null) => void) {
  w.provider.on?.('accountsChanged', ((a: string[]) => f(a)) as never);
  w.provider.on?.('chainChanged', (() => f(null)) as never);
}
