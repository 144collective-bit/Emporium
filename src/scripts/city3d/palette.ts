/*
 * The city's ground palette (docs/blend-plan.md Phase 1; DOM-free, tested in
 * tests/palette.test.ts): the colours the ground, the kerbs, the verges, the
 * trees and the street lamps are drawn in, in one place, so the districts
 * share them and the plan's Phase 2 can retune them together and blend them
 * at the seams. A district picks from here; it never writes a ground colour
 * of its own.
 *
 * Phase 1 moved the colours here as they were; Phase 2 drew the greens into
 * one family and added the open land's covers (ground.ts mixes them).
 */

/**
 * What the ground is covered in. The greens are one family (Phase 2: the planted verges, Sunridge's lawns, the
 * mall's islands and the worn lawn drawn in towards the city's own green), the dry and worn ones yellower
 */
export const COVER = {
  /** The open land (the base ground, the foot of the hills) */
  rough: '#245c45',
  /** Meadow: the open land's lighter, yellower patches */
  meadow: '#3d6b48',
  /** Dry grass: the open land's sun-dried patches, the highway's verges, round the airport, the Docks, Sunridge and Crestmont */
  dryGrass: '#566b47',
  /** The grass running down to the river, lusher */
  bank: '#2c6a4b',
  /** A block's grass lot (world.ts `LOTS`), the kart park's lawns; round the park and the town */
  lawn: '#2f7a52',
  /** A district's open pad (outer.ts `PADS`) */
  pad: '#367f5a',
  /** A planted median or island (Uptown's, Crestmont's, Sunridge's) */
  planted: '#3a7a50',
  /** The top of an avenue's raised median */
  median: '#3f5a4a',
  /** Sunridge's lawns, front and back */
  garden: '#4a9257',
  /** The mall's car park islands */
  island: '#5f925a',
  /** Dry grass in a bed (the islands' grasses) */
  dry: '#b9b06a',
  /** Worn grass and weeds (The Trenches' yards, its vacant lots, a street's verge) */
  worn: '#5f7f3f',
  /** A worn lawn (The Trenches' rec block) */
  wornLawn: '#4a7a4e',
  /** A dirt lot */
  dirt: '#6a4a3c',
  /** Bare dirt (The Trenches' patches, the vacant lots, its edge) */
  bare: '#6b5848',
  /** A dry wash's sandy bed (Sunridge's fringe, fringes.ts) */
  wash: '#9a8762',
  /** Gravel (round the Docks' yards) */
  gravel: '#6d6a72',
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

/** What stands along a block's edge onto open land (verges.ts): a clipped hedge, its top a shade lighter, and a low stone wall with its coping */
export const VERGE = {
  hedge: '#22643f',
  hedgeTop: '#2b7449',
  wall: '#8d87a8',
  coping: '#a7a2bf',
} as const;

/** The trees: the round ones' crowns (a few greens, picked per tree), their trunks, the pines, the medians' columnar trees */
export const TREE = {
  crowns: ['#2fae6e', '#33b878', '#24995f', '#3fc485', '#2a9d63'],
  trunk: '#6b4630',
  pine: '#1d7a55',
  /** A planted median's columnar tree (Uptown's, the ring's) and its slimmer trunk */
  column: '#24603a',
  columnTrunk: '#5a4232',
} as const;

/** The roads' paint (the polish plan's Phase 10): asphalt, the lane lines, zebras, the yellow centre line */
export const ROAD = {
  asphalt: '#26243f',
  line: '#d9d5ee',
  zebra: '#e8e4f8',
  yellow: '#f5d76e',
} as const;

/** Stone underfoot: the squares' and parks' kerbs, paths, edges, caps, gravel, paving and inlays */
export const STONE = {
  kerb: '#8f8ab0',
  path: '#a9a3bf',
  edge: '#6e6a8c',
  cap: '#b3aed2',
  gravel: '#9a91b8',
  paving: '#b7b0cf',
  inlay: '#b9b3d6',
} as const;

/** Planting on the ground: hedges (and their lighter tops), clipped box, shrubs, the medians' low shrubs */
export const PLANT = {
  hedge: '#2c6a3c',
  hedgeTop: '#3a8a4e',
  clipped: '#2a8a55',
  shrub: '#2a7048',
  shrubDark: '#1f5a3a',
  box: '#2f6a3c',
} as const;

/** Soil in a bed */
export const SOIL = {
  bed: '#4a3326',
  garden: '#5a4436',
} as const;

/** The river's banks (world.ts `riverBanks()`): the quay walls, the sand and pebbles where the water pulls back, the rocks */
export const BANK = {
  quay: '#6b6790',
  wall: '#57537a',
  sand: '#cdbb8e',
  pebbles: '#8f8a80',
  rock: '#77738a',
} as const;

/** The street lamps' light: white in town, sodium orange in The Trenches, along the waterfront and in the Docks */
export const LAMP = {
  white: { bulb: '#fff1c2', halo: '#ffe2a0', pool: '#ffd98a' },
  sodium: { bulb: '#ffb35c', halo: '#ffab55', pool: '#ff9a45' },
} as const;

/**
 * The lamp posts' paint (lampposts.ts, the polish plan's Phase 10: a post per district): the town's ink, Uptown's
 * and the airport's steel, Crestmont's and the park's black iron, Sunridge's dark green; and a dead lamp's unlit head
 */
export const LAMP_POST = {
  ink: '#1b1830',
  steel: '#8c8aa0',
  black: '#1a1724',
  green: '#2e4b3b',
  dead: '#3a3644',
} as const;
