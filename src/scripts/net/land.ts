/*
 * Land sales, shared by the site and the game server: the PulseChain
 * networks, the shape of the server's land API, and small helpers.
 * No DOM or scene code (the server bundles this).
 */
import type { Design } from '../../data/plots';

export interface Chain {
  id: number;
  name: string;
  /** Short label for the wallet chip */
  short: string;
  symbol: string;
  rpc: string;
  explorer: string;
  testnet: boolean;
}

/** The networks the server can be set to (LAND_CHAIN_ID) */
export const CHAINS: Record<number, Chain> = {
  369: { id: 369, name: 'PulseChain', short: 'PulseChain', symbol: 'PLS', rpc: 'https://rpc.pulsechain.com', explorer: 'https://scan.pulsechain.com', testnet: false },
  943: { id: 943, name: 'PulseChain Testnet v4', short: 'Testnet', symbol: 'tPLS', rpc: 'https://rpc.v4.testnet.pulsechain.com', explorer: 'https://scan.v4.testnet.pulsechain.com', testnet: true },
};

/** A plot someone owns */
export interface LandPlot {
  /** The wallet that paid for it (lowercase 0x address) */
  owner: string;
  /** The payment's transaction hash */
  tx: string;
  /** When the payment was confirmed (ms) */
  at: number;
  design?: Design;
}

/** GET /land */
export interface LandState {
  chain: number;
  /** Where payments go; null while sales aren't open */
  payee: string | null;
  /** Price of a plot in whole PLS (a string: it's bigger than a safe JS number in wei) */
  price: string;
  /** Confirmations a payment needs before the plot is yours */
  confirmations: number;
  plots: Record<string, LandPlot>;
  /** Plots with a payment being checked */
  pending: string[];
}

/** GET /land/claim?tx= */
export interface ClaimStatus {
  status: 'pending' | 'owned' | 'refund' | 'failed';
  plot: string;
  owner?: string;
  /** Why a claim failed, or why a payment is due a refund */
  reason?: string;
}

export const isAddress = (s: unknown): s is string => typeof s === 'string' && /^0x[0-9a-fA-F]{40}$/.test(s);
export const isTxHash = (s: unknown): s is string => typeof s === 'string' && /^0x[0-9a-fA-F]{64}$/.test(s);
/** Whole PLS to wei (18 decimals) */
export const plsToWei = (pls: string | number) => BigInt(pls) * 10n ** 18n;
/** "0x1234…abcd" */
export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** The message an owner signs to prove they hold their wallet (no transaction, no gas) */
export function signInMessage(o: { origin: string; address: string; chain: number; nonce: string; issued: string }) {
  return [
    'Degen City wants you to sign in with your PulseChain wallet:',
    o.address,
    '',
    'This only proves you hold this wallet so you can build on your plot. It does not send a transaction or cost gas.',
    '',
    `URI: ${o.origin}`,
    `Chain ID: ${o.chain}`,
    `Nonce: ${o.nonce}`,
    `Issued At: ${o.issued}`,
  ].join('\n');
}
