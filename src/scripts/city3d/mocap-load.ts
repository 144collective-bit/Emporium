/*
 * The motion capture's clips (mocap.ts), fetched the first time something
 * wants them (walking, the lab): each file is named by its contents, so the
 * service worker keeps it on the device after the first time. The core pack
 * (`CORE_PACK`: standing, walking, running, turns, strafes, the running
 * jumps) is what walking needs from its first step; the packs the animator
 * reaches for only now and then (`LAZY_PACKS`, the polish plan's Phase 8:
 * the crouched walks, the standing jumps' wind-ups, the stairs climb) are
 * fetched the first time it asks for one (`Animator.need`, walk.ts) and
 * joined onto it (`Animator.extend()`); until one is in, the core's clips
 * stand in (the crouch laid over a standing clip, a running jump's take-off,
 * the walks up a slope). A new one is a take with `pack` in takes.json and a
 * line in `PACKS` here (`npm run mocap` writes one file a pack). The crowd
 * pack (`CROWD_PACK`: the crowd's walks, run and idles, small) is fetched at
 * the boot, and the stage and the hologram play its idles and walk too.
 */
import clipsUrl from '../../data/mocap/clips.bin?url';
import crouchUrl from '../../data/mocap/clips-crouch.bin?url';
import crowdUrl from '../../data/mocap/clips-crowd.bin?url';
import jumpsUrl from '../../data/mocap/clips-jumps.bin?url';
import stairsUrl from '../../data/mocap/clips-stairs.bin?url';
import { CORE_PACK, decodeMocap, type MoData } from './mocap';

/** Each pack's file (written by `npm run mocap`): the core, the ones fetched on first use, and the crowd's (crowdclips.ts, fetched at the boot) */
export const CROWD_PACK = 'crowd';
/** The packs the animator asks for as it first needs them (the tag it searches for → the pack) */
export const LAZY_PACKS = ['crouch', 'jumps', 'stairs'] as const;
export type LazyPack = (typeof LAZY_PACKS)[number];
const PACKS: Record<string, string> = { [CORE_PACK]: clipsUrl, [CROWD_PACK]: crowdUrl, crouch: crouchUrl, jumps: jumpsUrl, stairs: stairsUrl };

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

/** The core and every lazy pack as one (the lab and the sparring demo, which play every program at once) */
export async function loadMocapAll(): Promise<MoData> {
  const [core, ...rest] = await Promise.all([loadMocap(), ...LAZY_PACKS.map((p) => loadMocap(p))]);
  return { fps: core.fps, clips: [...core.clips, ...rest.flatMap((d) => d.clips)] };
}
