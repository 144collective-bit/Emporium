/*
 * Where a player's Profile lives. Guests: the hash of their browser's secret
 * guest token. Wallets: the hash of their address, so the same profile opens
 * in any browser they log in from.
 */
export async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const guestKey = (token: string) => sha256(token);
export const walletKey = (address: string) => sha256(`wallet:${address.toLowerCase()}`);
