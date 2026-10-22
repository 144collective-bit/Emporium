/*
 * The merch marks as art (DOM-free): each a few SVG paths in a 100 x 100
 * box, drawn into the clothes' logo atlas (character.ts) and shown as icons
 * in the fitting room. Placeholders in the city's style (made-up marks, no
 * real brand, nothing about the token) until the merch store's own designs
 * go in: swapping one is replacing its paths here (or, later, an image in
 * src/assets/merch/ drawn into its cell instead).
 *
 * A mark is printed in one ink: `fill` is the ink, `stroke` lines in the
 * ink (`width` wide), `dark` and `line` the near-black parts and outlines
 * (the ink darkened), so it reads in any colourway.
 */
import type { MarkId } from '../net/profile-data';

export interface MarkArt {
  fill?: string;
  stroke?: string;
  width?: number;
  dark?: string;
  line?: string;
}

export const MARK_ART: Record<MarkId, MarkArt> = {
  // The Emporium diamond (the cap patch in the art)
  diamond: { fill: 'M30 24H70L88 42L50 86L12 42Z', line: 'M12 42H88M40 24L50 86L60 24' },
  // The Sector 7 badge: a seven on a hexagon
  seven: { fill: 'M50 6L90 28V72L50 94L10 72V28Z', dark: 'M30 26H72V38L52 78H38L57 39H30Z' },
  bolt: { fill: 'M60 6L20 56H45L36 94L82 40H56Z' },
  star: { fill: 'M50 6L61 37H94L67 57L77 90L50 70L23 90L33 57L6 37H39Z' },
  heart: { fill: 'M50 88C14 62 6 40 18 26C28 14 44 16 50 30C56 16 72 14 82 26C94 40 86 62 50 88Z' },
  wave: { stroke: 'M10 32Q30 16 50 32T90 32M10 54Q30 38 50 54T90 54M10 76Q30 60 50 76T90 76', width: 10 },
  eye: { fill: 'M6 50Q50 6 94 50Q50 94 6 50Z', dark: 'M50 32A18 18 0 1 0 50.01 32Z' },
  // Degen's balaclava and shades as a badge
  mask: { fill: 'M50 6C78 6 86 28 86 52C86 78 70 94 50 94C30 94 14 78 14 52C14 28 22 6 50 6Z', dark: 'M20 40H47V58H20ZM53 40H80V58H53Z', line: 'M47 47H53M30 74Q50 82 70 74' },
};

/** The atlas the clothes print from: four marks across, two down, in `MARK_IDS` order */
export const ATLAS_COLS = 4;
export const ATLAS_ROWS = 2;
