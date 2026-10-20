/*
 * Logging in with a wallet, shared by the site and the game server: the
 * PulseChain networks a wallet can be on, the shape of the server's account
 * API and the message a wallet signs. No DOM or scene code (the server
 * bundles this). Plot sales for PLS were retired: district plots are bought
 * with Dorras in the city's own game (tycoon.ts).
 */
import type { OwnProfile } from './protocol';

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

/** The networks the server can be set to (AUTH_CHAIN_ID) */
export const CHAINS: Record<number, Chain> = {
  369: { id: 369, name: 'PulseChain', short: 'PulseChain', symbol: 'PLS', rpc: 'https://rpc.pulsechain.com', explorer: 'https://scan.pulsechain.com', testnet: false },
  943: { id: 943, name: 'PulseChain Testnet v4', short: 'Testnet', symbol: 'tPLS', rpc: 'https://rpc.v4.testnet.pulsechain.com', explorer: 'https://scan.v4.testnet.pulsechain.com', testnet: true },
};

export const isAddress = (s: unknown): s is string => typeof s === 'string' && /^0x[0-9a-fA-F]{40}$/.test(s);

/** A logged-in wallet's basic profile (GET /auth/me) */
export interface AccountMe {
  address: string;
  chain: number;
  profile: OwnProfile;
}

/** "0x1234…abcd" */
export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** The message a visitor signs to log in with their wallet (no transaction, no gas) */
export function signInMessage(o: { origin: string; address: string; chain: number; nonce: string; issued: string }) {
  return [
    'Degen City wants you to log in with your PulseChain wallet:',
    o.address,
    '',
    'This only proves you hold this wallet: it logs you in to your player profile. It does not send a transaction or cost gas.',
    '',
    `URI: ${o.origin}`,
    `Chain ID: ${o.chain}`,
    `Nonce: ${o.nonce}`,
    `Issued At: ${o.issued}`,
  ].join('\n');
}
