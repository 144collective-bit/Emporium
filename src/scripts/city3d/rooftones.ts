/*
 * The rooflines' variety (docs/trenches-variety-plan.md Phase 3; DOM-free, tested in tests/rooftones.test.ts). The
 * owner's picks (2026-11-12): roofs in a mix of tar grey, gravel and silver paint with some navy kept; the tenements'
 * heights mixed, no two neighbours alike (streetwall.ts); varied clutter on most roofs. Each pick is a hash of where the
 * building stands, so nothing else in the city's seeded layout moves.
 *
 * - `roofTone()`: a flat roof's covering (infill.ts `roof()`, the Trench Houses' roofs in projects3d.ts).
 * - `corniceAt()`: the shop kit's cornice (infill.ts `cornice()`): bracketed, stepped, a plain coping, or none.
 * - `tankAt()`: a tower's water tank, round timber or square steel on its stilts (projects3d.ts).
 */

export type RoofTone = 'navy' | 'tar' | 'gravel' | 'silver';
/** Each covering's colour: tar grey, gravel's pale grey-brown, silver paint, the city's old navy */
export const ROOF_TONES: Record<RoofTone, string> = { navy: '#2a2547', tar: '#3b3a40', gravel: '#77736b', silver: '#a7abb2' };
/** How often each covering comes up */
export const ROOF_MIX: [RoofTone, number][] = [
  ['tar', 0.35],
  ['gravel', 0.25],
  ['silver', 0.15],
  ['navy', 0.25],
];
export type CorniceKind = 'bracketed' | 'stepped' | 'coping' | 'none';
export const CORNICE_MIX: [CorniceKind, number][] = [
  ['bracketed', 0.4],
  ['stepped', 0.25],
  ['coping', 0.2],
  ['none', 0.15],
];
export type TankKind = 'round' | 'square';

/** A hash in [0, 1) of a point (rounded to centimetres) and a salt (shopfronts.ts's picks too) */
export function spotHash(x: number, z: number, salt: number) {
  let h = (Math.round(x * 100) * 374761393 + Math.round(z * 100) * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function pick<T>(mix: [T, number][], u: number): T {
  for (const [k, w] of mix) {
    if (u < w) return k;
    u -= w;
  }
  return mix[0][0];
}

export const roofTone = (x: number, z: number): RoofTone => pick(ROOF_MIX, spotHash(x, z, 11));
export const corniceAt = (x: number, z: number): CorniceKind => pick(CORNICE_MIX, spotHash(x, z, 23));
export const tankAt = (x: number, z: number): TankKind => (spotHash(x, z, 37) < 0.55 ? 'round' : 'square');
/** How many vent stacks and whether an aerial stands on a tower's roof */
export const ventsAt = (x: number, z: number) => 1 + Math.floor(spotHash(x, z, 41) * 3);
export const aerialAt = (x: number, z: number) => spotHash(x, z, 43) < 0.6;
