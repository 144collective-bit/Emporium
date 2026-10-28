/*
 * The motion capture's clips (mocap.ts), fetched the first time something
 * wants them (walking, the lab): each file is named by its contents, so the
 * service worker keeps it on the device after the first time. The core pack
 * (`CORE_PACK`: standing, walking, running, turns, strafes, jumps, the
 * crouch) is what walking needs; another pack (the moments', the fight's)
 * is fetched the first time it's used, through `loadMocap(pack)`, and a new
 * one is a take with `pack` in takes.json and a line in `PACKS` here. The
 * crowd pack (`CROWD_PACK`: the crowd's walks, run and idles, small) is
 * fetched at the boot.
 */
import clipsUrl from '../../data/mocap/clips.bin?url';
import crowdUrl from '../../data/mocap/clips-crowd.bin?url';
import { CORE_PACK, decodeMocap, type MoData } from './mocap';

/** Each pack's file (written by `npm run mocap`): the core, and the crowd's (crowdclips.ts, fetched at the boot) */
export const CROWD_PACK = 'crowd';
const PACKS: Record<string, string> = { [CORE_PACK]: clipsUrl, [CROWD_PACK]: crowdUrl };

const loading = new Map<string, Promise<MoData>>();
export function loadMocap(pack = CORE_PACK): Promise<MoData> {
  const url = PACKS[pack];
  if (!url) return Promise.reject(new Error(`Mocap: no pack ${pack}`));
  let p = loading.get(pack);
  if (!p) {
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Mocap: ${r.status}`);
        return r.arrayBuffer();
      })
      .then(decodeMocap);
    loading.set(pack, p);
    // (a failed fetch can be tried again)
    p.catch(() => loading.delete(pack));
  }
  return p;
}
