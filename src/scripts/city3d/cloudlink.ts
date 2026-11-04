/*
 * How the screens in the boot reach a wallet's cloud save (cloudsave.ts,
 * its own chunk) without importing it: cloudsave.ts registers itself here
 * once it's made. Null on a guest's page. No imports but a type.
 */
import type { SnapSummary } from '../net/savecheck';

export type RestoreResult = 'ok' | 'gone' | 'elsewhere' | 'offline';
export interface CloudLink {
  /** The daily snapshots kept on the server, newest first */
  history(): Promise<SnapSummary[]>;
  /** Put a day's snapshot back: on 'ok' the page starts again on it */
  restore(day: string): Promise<RestoreResult>;
}

let link: CloudLink | null = null;
export const setCloudLink = (l: CloudLink | null) => void (link = l);
export const cloudLink = () => link;
