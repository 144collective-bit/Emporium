/*
 * The Trenches' tenements' ground floors (docs/trenches-variety-plan.md Phase 4; DOM-free, tested in
 * tests/shopfronts.test.ts). The owner's picks (2026-11-13): fire escapes on about half the tenements, mostly the taller
 * ones; a mix of shopfronts (roll shutters half up, bodegas with awnings, recessed doorways, gated entries); some ground
 * floors painted a colour of their own under the brick. Each pick a hash of where the tenement stands (rooftones.ts
 * `spotHash()`), so nothing else in the seeded layout moves. Set on the tenements' lots by streetwall.ts and drawn by
 * infill.ts's shop kit, near only; downtown's shops carry none of it and look as they did.
 */
import { spotHash } from './rooftones';

/** A shopfront's kind: as it was, a roll shutter half up, its door set back in a recess, or a steel gate across it */
export type ShopFront = 'open' | 'halfShutter' | 'recessed' | 'gated';
export const FRONT_MIX: [ShopFront, number][] = [
  ['open', 0.3],
  ['halfShutter', 0.25],
  ['recessed', 0.25],
  ['gated', 0.2],
];
/** The colours a ground floor is painted (pilasters, the stall riser): oxblood, bottle green, black, cream, slate */
export const PAINTS = ['#5c1f24', '#1f4a33', '#1c1b21', '#d9cfb4', '#3e4a5a'];
/** The share of ground floors painted */
export const PAINTED = 0.45;
/** The share of tenements with a fire escape, at four or more floors over the shop and under it */
export const ESCAPE = { tall: 0.8, short: 0.2, from: 4 };

export function frontAt(x: number, z: number): ShopFront {
  let u = spotHash(x, z, 53);
  for (const [k, w] of FRONT_MIX) {
    if (u < w) return k;
    u -= w;
  }
  return 'open';
}
/** A ground floor's paint, or null to leave it as the shopfront band has it */
export const paintAt = (x: number, z: number): string | null => (spotHash(x, z, 59) < PAINTED ? PAINTS[Math.floor(spotHash(x, z, 61) * PAINTS.length)] : null);
/** A fire escape up the front: most of the tall ones, a few of the rest */
export const escapeAt = (x: number, z: number, floors: number) => spotHash(x, z, 67) < (floors >= ESCAPE.from ? ESCAPE.tall : ESCAPE.short);
