/*
 * The city's ground palette (docs/blend-plan.md Phase 1; DOM-free, tested in
 * tests/palette.test.ts): the colours the ground, the kerbs, the verges, the
 * trees and the street lamps are drawn in, in one place, so the districts
 * share them and the plan's Phase 2 can retune them together and blend them
 * at the seams. A district picks from here; it never writes a ground colour
 * of its own.
 *
 * Phase 1 moved the colours here as they were (nothing changed on screen);
 * several are near neighbours today (seven greens), which Phase 2 folds into
 * one family.
 */

/** What the ground is covered in */
export const COVER = {
  /** The open land (the base ground, the river's grass banks, the foot of the hills) */
  rough: '#245c45',
  /** A block's grass lot (world.ts `LOTS`), the kart park's lawns */
  lawn: '#2f7a52',
  /** A district's open pad (outer.ts `PADS`) */
  pad: '#367f5a',
  /** A planted median or island (Uptown's, Crestmont's, Sunridge's) */
  planted: '#3f7a4a',
  /** The top of an avenue's raised median */
  median: '#3f5a4a',
  /** Sunridge's lawns, front and back */
  garden: '#4f9a49',
  /** The mall's car park islands */
  island: '#6f9a4e',
  /** Dry grass (the islands' grasses) */
  dry: '#b9b06a',
  /** Worn grass and weeds (The Trenches' yards, its vacant lots) */
  worn: '#5f7f3f',
  /** A worn lawn (The Trenches' rec block) */
  wornLawn: '#4c7d47',
  /** A dirt lot */
  dirt: '#6a4a3c',
  /** Bare dirt (The Trenches' patches, the vacant lots) */
  bare: '#6b5848',
  /** Paving's ground colour (the paved lots' tile texture) */
  paving: '#3a3470',
  /** Concrete (a concrete lot, a paved rim) */
  concrete: '#4b4766',
} as const;
export type Cover = keyof typeof COVER;

/** Kerbs: the stone round every block in town, and the grey of The Trenches' and the Docks' */
export const KERB = {
  town: '#5a5290',
  grit: '#5f5c70',
} as const;

/** The trees: the round ones' crowns (a few greens, picked per tree), their trunks, the pines */
export const TREE = {
  crowns: ['#2fae6e', '#33b878', '#24995f', '#3fc485', '#2a9d63'],
  trunk: '#6b4630',
  pine: '#1d7a55',
} as const;

/** The street lamps' light: white in town, sodium orange in The Trenches, along the waterfront and in the Docks */
export const LAMP = {
  white: { bulb: '#fff1c2', halo: '#ffe2a0', pool: '#ffd98a' },
  sodium: { bulb: '#ffb35c', halo: '#ffab55', pool: '#ff9a45' },
} as const;
