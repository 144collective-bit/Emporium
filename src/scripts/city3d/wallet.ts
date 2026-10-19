/*
 * PulseChain wallets in the browser. Talks to the visitor's own wallet
 * (EIP-1193): every installed wallet announces itself (EIP-6963), with the
 * older window.ethereum as a fallback. No keys ever touch the site: the
 * wallet asks the visitor to approve each request.
 */
import type { Chain } from '../net/land';

interface Eip1193 {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, f: (...args: never[]) => void): void;
}

export interface WalletInfo {
  id: string;
  name: string;
  /** A data: URI the wallet supplies (may be empty) */
  icon: string;
  provider: Eip1193;
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

/** Wallets in this browser (asks them to announce themselves again first) */
export async function findWallets(): Promise<WalletInfo[]> {
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  await new Promise((r) => setTimeout(r, 120));
  const list = [...found.values()];
  const legacy = (window as unknown as { ethereum?: Eip1193 }).ethereum;
  if (!list.length && legacy) list.push({ id: 'injected', name: 'Browser wallet', icon: '', provider: legacy });
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

/** Make sure the wallet is on `chain`, adding the network to the wallet if it doesn't know it */
export async function ensureChain(w: WalletInfo, chain: Chain) {
  const current = Number.parseInt(String(await w.provider.request({ method: 'eth_chainId' })), 16);
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
  const now = Number.parseInt(String(await w.provider.request({ method: 'eth_chainId' })), 16);
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
