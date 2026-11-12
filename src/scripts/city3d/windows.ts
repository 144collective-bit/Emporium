/*
 * The windows on the city's shared wall atlas (docs/trenches-variety-plan.md Phase 1; DOM-free, tested in
 * tests/windows.test.ts), read by infill.ts's `wallBand()`, which paints them. The owner's picks (2026-11-12): the whole
 * city's atlas, so downtown, the building kits, The Trenches and Endswood's terraces all change together; by day almost
 * no window lit (about one in twenty, warm), as real windows are, the rest dark glass with the sky in it and blinds or
 * curtains behind; at night about half lit, mostly warm, some a television's blue, the odd one pink or cyan.
 *
 * - `WINDOW_TYPE`: each wall kind its own window, so neighbours of different bricks read differently: sashes on red
 *   brick, pairs on tan, wide steel casements on dark brick, round-headed on brownstone, shutters on stucco, balcony
 *   doors on the hotels, the warehouses' and the glass towers' as they were.
 * - `paneAt()`: what one window (a bay on a floor, and which of a pair) shows, from a hash of where it is in its band,
 *   the same every time it's painted: lit at night and in which light, lit by day too (only ever a warm one lit at
 *   night), and what hangs behind the glass.
 */

export type WallKindName = 'brick' | 'brownstone' | 'stuccoTeal' | 'stuccoPink' | 'stuccoViolet' | 'industrial' | 'glassBlue' | 'glassTeal' | 'hotel' | 'brickTan' | 'brickDark';
export type WindowType = 'sash' | 'pair' | 'casement' | 'arched' | 'shuttered' | 'balcony' | 'steel' | 'curtain';

export const WINDOW_TYPE: Record<WallKindName, WindowType> = {
  brick: 'sash',
  brickTan: 'pair',
  brickDark: 'casement',
  brownstone: 'arched',
  stuccoTeal: 'shuttered',
  stuccoPink: 'shuttered',
  stuccoViolet: 'shuttered',
  hotel: 'balcony',
  industrial: 'steel',
  glassBlue: 'curtain',
  glassTeal: 'curtain',
};

/** The light behind a lit window at night */
export type Light = 'warm' | 'tv' | 'pink' | 'cyan';
/** How often each light is the one, of the lit windows (mostly warm, some a television's blue, the odd neon) */
export const NIGHT_MIX: [Light, number][] = [
  ['warm', 0.74],
  ['tv', 0.18],
  ['pink', 0.04],
  ['cyan', 0.04],
];
/** The share of windows lit at night, and by day */
export const NIGHT_LIT = 0.5;
export const DAY_LIT = 0.05;

/** What hangs behind the glass: nothing, a blind part drawn down, or curtains either side */
export type Dressing = 'bare' | 'blind' | 'curtains';
export interface Pane {
  /** Lit at night, and in which light (null: dark) */
  night: Light | null;
  /** Lit by day too (only ever a warm one lit at night) */
  day: boolean;
  dressing: Dressing;
  /** How far a blind is drawn down (0 to 1) */
  drop: number;
}

/** A hash in [0, 1) of four whole numbers (the same every time) */
function hash(a: number, b: number, c: number, d: number) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647 + d * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** One window on a band: `seed` the band's, `row` its floor, `col` its bay, `sub` which of a pair (0 or 1) */
export function paneAt(seed: number, row: number, col: number, sub = 0): Pane {
  const k = col * 2 + sub;
  const lit = hash(seed, row, k, 1) < NIGHT_LIT;
  let night: Light | null = null;
  if (lit) {
    let x = hash(seed, row, k, 2);
    for (const [l, w] of NIGHT_MIX) {
      if (x < w) {
        night = l;
        break;
      }
      x -= w;
    }
    night ??= 'warm';
  }
  // (by day only some of the warm ones: about DAY_LIT of all windows)
  const warmShare = NIGHT_LIT * NIGHT_MIX[0][1];
  const day = night === 'warm' && hash(seed, row, k, 3) < DAY_LIT / warmShare;
  const d = hash(seed, row, k, 4);
  const dressing: Dressing = d < 0.4 ? 'blind' : d < 0.7 ? 'curtains' : 'bare';
  return { night, day, dressing, drop: 0.15 + hash(seed, row, k, 5) * 0.55 };
}
