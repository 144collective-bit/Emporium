/*
 * A lamp post per district (docs/polish-plan.md Phase 10, the owner's call: "a lamp post per district"; DOM-free,
 * tested in tests/lampposts.test.ts). Every street lamp the city places (`addLamp()` in world.ts) is drawn by
 * `buildLamps()` from where it stands: `lampStyle(x, z)` says which post it is, `LAMP_POSTS` what each post looks
 * like, in tiles (Degen is about a tile tall; the town's post, today's, is 1.6 to its arm). One instanced shape a
 * kind (a pole, its arm or cap, its lit head), so a kind costs a draw, not a lamp. The colour of the light (white,
 * sodium, the dead and the flickering) is lampmix.ts's, the halos and the pools of light are as they were.
 *
 * - `town`: the municipal post, a slim pole with a short arm and a boxed head (downtown, the districts round it, the
 *   Docks and the yards (their tall floodlight masts are their own), the kart park, the stadium, the airport's deck).
 * - `uptown`: slim steel with a flat head on a long arm (Uptown, Uptown North and the mall).
 * - `lantern`: an ornate black post with a lantern on top (Crestmont).
 * - `suburb`: a short residential post with a globe (Sunridge).
 * - `cobra`: a tall pole with a cobra head out over the road (The Trenches, Lot 9, Endswood Estate: the sodium districts' own).
 * - `park`: a park lantern on a short post (Westlake Park, its gardens).
 * - `strip`: a double-arm post with a head each side and a neon line down the pole (the Neon Mile).
 * - `airport`: a tall grey mast with a wide head (the airport's roads).
 */
import { inTrenches } from './trenches';
import { PATH_RECT, inLot9Lamps } from './lot9';
import { inEndswood } from './endswood';
import { inUptown } from './uptown';
import { NORTH_RECT } from './uptownnorth';
import { MALL_AREA } from './mall';
import { CREST_RECT } from './crestmont';
import { inSunridge } from './sunridge';
import { WESTLAKE_RECT } from './westlake';
import { inStrip } from './strip';
import { AIRPORT_AREAS } from './airfield';

export type LampKind = 'town' | 'uptown' | 'lantern' | 'suburb' | 'cobra' | 'park' | 'strip' | 'airport';
export const LAMP_KINDS: LampKind[] = ['town', 'uptown', 'lantern', 'suburb', 'cobra', 'park', 'strip', 'airport'];

/** What a kind of post looks like, in tiles */
export interface LampPost {
  /** The pole: its height, and its radius at the top and the foot */
  h: number;
  r: [number, number];
  /** The arm: how far the head reaches out from the pole (0: the head sits on top, under a cap) */
  arm: number;
  /** A head on both sides (the arm reaching `arm` each way) */
  double: boolean;
  /** The lit head: its size (across, high, deep) and how high its middle is */
  head: [number, number, number];
  headY: number;
  /** A lantern or globe: the head stands on the pole's top under a cap, not under an arm */
  cap: boolean;
  /** A neon line down the pole (the Neon Mile's) */
  neon: boolean;
  /** The post's paint (palette.ts `LAMP_POST`) */
  post: 'ink' | 'steel' | 'black' | 'green';
}

export const LAMP_POSTS: Record<LampKind, LampPost> = {
  town: { h: 1.6, r: [0.035, 0.05], arm: 0.4, double: false, head: [0.2, 0.07, 0.12], headY: 1.53, cap: false, neon: false, post: 'ink' },
  uptown: { h: 2.0, r: [0.028, 0.04], arm: 0.55, double: false, head: [0.3, 0.035, 0.16], headY: 1.96, cap: false, neon: false, post: 'steel' },
  lantern: { h: 1.45, r: [0.035, 0.06], arm: 0, double: false, head: [0.15, 0.22, 0.15], headY: 1.58, cap: true, neon: false, post: 'black' },
  suburb: { h: 1.1, r: [0.028, 0.04], arm: 0, double: false, head: [0.16, 0.16, 0.16], headY: 1.2, cap: true, neon: false, post: 'green' },
  cobra: { h: 1.85, r: [0.035, 0.055], arm: 0.65, double: false, head: [0.32, 0.06, 0.14], headY: 1.8, cap: false, neon: false, post: 'ink' },
  park: { h: 1.25, r: [0.03, 0.045], arm: 0, double: false, head: [0.16, 0.18, 0.16], headY: 1.36, cap: true, neon: false, post: 'black' },
  strip: { h: 2.2, r: [0.04, 0.055], arm: 0.45, double: true, head: [0.22, 0.06, 0.12], headY: 2.14, cap: false, neon: true, post: 'steel' },
  airport: { h: 3.0, r: [0.045, 0.07], arm: 0.7, double: false, head: [0.4, 0.08, 0.2], headY: 2.94, cap: false, neon: false, post: 'steel' },
};

const inRect = (r: readonly number[], x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;

/** Which post a lamp at x, z is: the district it stands in picks it, the town's everywhere else */
export function lampStyle(x: number, z: number): LampKind {
  // (Lot 9's reach up the tunnel's footpath, and Endswood Estate with the common down to Lot 9: sodium estates, lampmix.ts)
  if (inTrenches(x, z) || inLot9Lamps(x, z) || inRect(PATH_RECT, x, z, 2) || inEndswood(x, z)) return 'cobra';
  if (inUptown(x, z) || inRect(NORTH_RECT, x, z) || inRect(MALL_AREA, x, z)) return 'uptown';
  // (Crestmont's lamps along its east road stand a hair past its rect)
  if (inRect(CREST_RECT, x, z, 1)) return 'lantern';
  if (inSunridge(x, z)) return 'suburb';
  if (inRect(WESTLAKE_RECT, x, z)) return 'park';
  if (inStrip(x, z)) return 'strip';
  // (the airport's first lamps stand on its landside's line)
  if (AIRPORT_AREAS.some((r) => inRect(r, x, z, 1))) return 'airport';
  return 'town';
}

/** Where a post's lit head is (and so its halo): `arm` out along the post's facing, `headY` up; a double arm's halo between its heads */
export const headOf = (k: LampKind) => ({ out: LAMP_POSTS[k].double ? 0 : LAMP_POSTS[k].arm, up: LAMP_POSTS[k].headY });
