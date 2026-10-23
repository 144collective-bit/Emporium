/*
 * The motion capture's clips (mocap.ts), fetched the first time something
 * wants them (walking, the lab): the file is named by its contents, so the
 * service worker keeps it on the device after the first time.
 */
import clipsUrl from '../../data/mocap/clips.bin?url';
import { decodeMocap, type MoData } from './mocap';

let loading: Promise<MoData> | null = null;
export function loadMocap(): Promise<MoData> {
  loading ??= fetch(clipsUrl)
    .then((r) => {
      if (!r.ok) throw new Error(`Mocap: ${r.status}`);
      return r.arrayBuffer();
    })
    .then(decodeMocap);
  // (a failed fetch can be tried again)
  loading.catch(() => (loading = null));
  return loading;
}
