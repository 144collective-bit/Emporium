/*
 * The street lamps mixed at the districts' edges (docs/blend-plan.md Phase 6a; DOM-free, tested in
 * tests/lampmix.test.ts). Each district keeps its lamps' colour: sodium orange in The Trenches, along the waterfront,
 * in the Docks and Southfield Yards, white everywhere else. Where they meet, the city has been replacing them street
 * by street: within `MIX` of the edge either way a lamp is sodium with a share that eases from all white outside to
 * all sodium inside (`sodiumShare()`), each lamp picked by its own number from where it stands (`lampTone()`), so a
 * visit finds them the same every time. The Trenches' dead and flickering lamps stay its own (`lampKind()`).
 *
 * The kerb at The Trenches' edge is blended the same way (the polish plan's Phase 10, the owner's call): where its grey
 * sidewalks face the town's purple across the west ring avenue, each slab's colour runs from the one to the other over
 * `MIX` either side of the avenue (`kerbShare()`, read by world.ts's slab paint vertex by vertex), so the two meet in
 * the middle of the street instead of switching on a line. Nothing moves.
 */
import { RING_W, TRENCH_RECT, inTrenches, lampKind } from './trenches';
import { inDocks } from './docks';
import { inYards } from './southfield';
import { WATERFRONT_RECT } from './waterfront';
import { inLot9, inLot9Lamps } from './lot9';

/** How far either side of a sodium district's edge its lamps mix with the white (tiles: about a block) */
export const MIX = 18;

/** The sodium districts, each a test of whether x, z is inside it, `m` further out (negative: further in) */
const inRect = (r: readonly number[], x: number, z: number, m: number) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
export const SODIUM_AREAS: ((x: number, z: number, m: number) => boolean)[] = [
  inTrenches,
  inDocks,
  inYards,
  (x, z, m) => inRect(WATERFRONT_RECT, x, z, m),
  inLot9,
];

/**
 * How far x, z is inside the sodium districts (tiles; negative outside), clamped to `MIX` either way: the deepest of
 * them, each found by halving the margin that just takes it in
 */
export function sodiumDepth(x: number, z: number) {
  let best = -MIX;
  for (const inside of SODIUM_AREAS) {
    if (inside(x, z, -MIX)) return MIX;
    if (!inside(x, z, MIX)) continue;
    // (the margin that just takes x, z in lies between lo, out, and hi, in)
    let [lo, hi] = [-MIX, MIX];
    for (let k = 0; k < 14; k++) {
      const m = (lo + hi) / 2;
      if (inside(x, z, m)) hi = m;
      else lo = m;
    }
    best = Math.max(best, -(lo + hi) / 2);
  }
  return best;
}

/** The share of lamps at x, z that are sodium: 0 well outside the sodium districts, 1 well inside, a half on the edge */
export function sodiumShare(x: number, z: number) {
  const t = (sodiumDepth(x, z) + MIX) / (2 * MIX);
  return t * t * (3 - 2 * t);
}

/** A lamp's own number, 0-1, from where it stands (not the one `lampKind()` picks the dead and the flickering by) */
function own(x: number, z: number) {
  const h = Math.sin(x * 39.3467 + z * 11.1351) * 24634.6345;
  return h - Math.floor(h);
}

/** A lamp in Lot 9: as The Trenches' `lampKind()`, its own number from where it stands */
function lot9Kind(x: number, z: number) {
  const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  const u = h - Math.floor(h);
  return u < 0.08 ? 'dead' : u < 0.22 ? 'flicker' : 'sodium';
}

/** The seam the kerb blends across: the west ring avenue's centre line (x) along The Trenches' blocks (z) */
export const KERB_SEAM = { x: RING_W.c, z0: TRENCH_RECT[1], z1: TRENCH_RECT[3] };
/**
 * The share of The Trenches' grey in the kerb at x, z: 1 a block or more inside The Trenches, 0 a block or more into
 * the town east of the west ring avenue, a half on the avenue's line; off the seam's span (north of the bank avenue,
 * south of the highway) each side keeps its own
 */
export function kerbShare(x: number, z: number) {
  const d = Math.max(-MIX, Math.min(MIX, KERB_SEAM.x - x));
  if (z < KERB_SEAM.z0 - MIX || z > KERB_SEAM.z1 + MIX) return d > 0 ? 1 : 0;
  const t = (d + MIX) / (2 * MIX);
  return t * t * (3 - 2 * t);
}

export type LampTone = 'white' | 'sodium' | 'flicker' | 'dead';
/** What a street lamp at x, z is: white or sodium by `sodiumShare()`, and in The Trenches the odd one dead and a few sodium ones flickering */
export function lampTone(x: number, z: number): LampTone {
  // (Lot 9's as worn as The Trenches': the odd one dead, a few flickering; lot9.ts)
  const k = lampKind(x, z) ?? (inLot9Lamps(x, z) ? lot9Kind(x, z) : null);
  if (k === 'dead') return 'dead';
  if (own(x, z) >= sodiumShare(x, z)) return 'white';
  return k === 'flicker' ? 'flicker' : 'sodium';
}
