/*
 * Hashes: of tokens (only these are stored), and the Profile names accounts
 * use (accounts.ts). A wallet that had a profile before accounts keeps it:
 * its profile is named by the hash of its address.
 */
export async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const walletKey = (address: string) => sha256(`wallet:${address.toLowerCase()}`);
