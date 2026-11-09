// The motion capture's packs for the tests (the polish plan's Phase 8): the core pack (`clips.bin`, fetched when
// walking starts) with every lazy pack joined on in order (`clips-crouch.bin`, `clips-jumps.bin`,
// `clips-stairs.bin`: mocap-load.ts `LAZY_PACKS`, fetched on first use and joined by `Animator.extend()`), which
// is what an animator holds once it has asked for them all. tests/mocap.test.ts checks each file on its own.
import { readFileSync } from 'node:fs';
import { decodeMocap, type MoData } from '../src/scripts/city3d/mocap';

/** The lazy packs, in the order walk.ts would most often ask for them */
export const LAZY_PACKS = ['crouch', 'jumps', 'stairs'] as const;

export const corePack = (): MoData => decodeMocap(readFileSync('src/data/mocap/clips.bin'));
export const lazyPack = (pack: string): MoData => decodeMocap(readFileSync(`src/data/mocap/clips-${pack}.bin`));

/** The core and every lazy pack as one, the core's clips first */
export function allMocap(): MoData {
  const core = corePack();
  return { fps: core.fps, clips: [...core.clips, ...LAZY_PACKS.flatMap((p) => lazyPack(p).clips)] };
}
