/*
 * Modelled facades (docs/buildings-plan.md): where the windows painted on the wall atlas (infill.ts, their types
 * windows.ts's) stand on a building's front, so the drawing can put real frames, sills and lintels round them.
 * DOM-free; tested in tests/facade.test.ts.
 *
 * The atlas paints COLS bays by ROWS floors a band; a pixel is 1/64 of a tile both ways (a bay is CELL_W wide and
 * PX_W pixels, a floor FLOOR tall and PX_H). infill.ts paints each window's glass from PANES, so paint and geometry
 * can't drift apart.
 */
import { FLOOR } from './downtown';
import { WINDOW_TYPE, type WallKindName, type WindowType } from './windows';

export const CELL_W = 0.75;
export const COLS = 8;
export const ROWS = 4;
export const PX_W = 48;
export const PX_H = 64;
/** One atlas pixel in tiles, across and up */
export const PX = CELL_W / PX_W;
const PY = FLOOR / PX_H;

/** How a wall's windows are built: its window type. A glass curtain wall has none of its own. */
export type FacadeStyle = Exclude<WindowType, 'curtain'>;
export function styleOf(kind: WallKindName): FacadeStyle | null {
  const type = WINDOW_TYPE[kind];
  return type === 'curtain' ? null : type;
}

/** A window's opening in its cell, in atlas pixels from the cell's top-left, and how many bays it spans */
export interface Pane {
  x: number;
  y: number;
  w: number;
  h: number;
  span: number;
  /** A pair's two sashes: where the post between them starts (from the opening's left) and how wide it is */
  post?: [number, number];
}
const SASH: Pane = { x: 11, y: 13, w: 26, h: 36, span: 1 };
/** One sash of a pair (two side by side under one lintel) */
export const PAIR_SASH = { w: 13, gap: 6 };
export const PANES: Record<FacadeStyle, Pane> = {
  sash: SASH,
  shuttered: SASH,
  balcony: SASH,
  arched: { x: 12, y: 10, w: 24, h: 42, span: 1 },
  // Two narrow sashes: the opening is both and the post between
  pair: { x: 8, y: 14, w: PAIR_SASH.w * 2 + PAIR_SASH.gap, h: 34, span: 1, post: [PAIR_SASH.w, PAIR_SASH.gap] },
  // A wide steel casement between the floor's concrete bands
  casement: { x: 5, y: 19, w: 38, h: 27, span: 1 },
  // A long low window a bay
  ribbon: { x: 4, y: 20, w: PX_W - 8, h: 22, span: 1 },
  // Big steel windows, one for every two bays
  steel: { x: 10, y: 10, w: PX_W * 2 - 20, h: 42, span: 2 },
  // The gallery sides' kitchen windows, one a flat (two bays), behind a grille (the door beside it painted only)
  deck: { x: 54, y: 16, w: 30, h: 22, span: 2 },
  // Brutalist balcony recesses, one for every two bays: the window at the back of the recess (its door beside it,
  // painted only; the recess's front over its foot)
  recess: { x: 20, y: 16, w: 50, h: 28, span: 2 },
};
/** The brutalist recesses (`recess`), in pixels: the fin between two, the slab's edge at each floor, the front's top,
 * the door at the back beside the window */
/** The gallery sides' flats (`deck`), in pixels: a front door and a kitchen window behind a grille, two bays a flat */
export const DECK = { door: { x: 12, w: 20, y: 18 }, meter: { x: 36, w: 9, y: 30, h: 14 } };
/** What's at a flat's door off the gallery (by a hash of where it is): its door's paint, a steel door, a boarded one, a
 * tag scrawled by it, or a plain one; mostly plain, rough at the edges */
export const DECK_LIFE = ['plain', 'plain', 'steel', 'plain', 'tag', 'plain', 'boarded', 'plain', 'tag', 'plain', 'steel', 'plain'] as const;
export type DeckLife = (typeof DECK_LIFE)[number];
export const deckLife = (seed: number, row: number, i: number): DeckLife => DECK_LIFE[(seed * 97 + row * 13 + i * 5) % DECK_LIFE.length];
/** The front doors' paints: council colours, worn */
export const DOOR_PAINTS = ['#7a2b2b', '#2d4f3a', '#2b3e66', '#6b5a2a', '#4a4a52', '#5a2d4f'];
export const RECESS = { fin: 10, slab: 9, front: 42, door: { x: 76, w: 12, y: 14 } };
/** What lives in a brutalist recess (by a hash of where it is): a plant, a dish, an air-con unit, a bike, washing out,
 * a front painted in a colour (the odd one, the blocks' own accents), a flat boarded up, one burnt out (soot over it),
 * or nothing; mostly plain, so a long front reads calm, washing only now and then */
export const RECESS_LIFE = ['plant', 'none', 'dish', 'ac', 'none', 'bike', 'plant', 'none', 'washing', 'none', 'panel', 'ac', 'none', 'dish', 'boarded', 'burnt'] as const;
export type RecessLife = (typeof RECESS_LIFE)[number];
/** What's in a recess: `seed` the band's, `row` its floor in the band, `i` the recess along it */
export const recessLife = (seed: number, row: number, i: number): RecessLife => RECESS_LIFE[(seed * 131 + row * 17 + i * 7) % RECESS_LIFE.length];
/** The painted fronts' colours: the blocks' own accents (southblocks.ts `ACCENTS`), muted a little by weather */
export const RECESS_PANELS = ['#c7652f', '#2c8f88', '#c99a2c'];
/** A hotel's even bays are balcony doors, down to the floor */
export const BALCONY_DOOR: Pane = { x: 12, y: 8, w: 24, h: PX_H - 8, span: 1 };
/** The casements' concrete bands across each floor, in pixels from the floor's top: the lintel's and the sill's */
export const CASEMENT_BANDS: [number, number][] = [
  [10, 14],
  [48, 53],
];

/** How far a window's surround reaches past its glass each side (shutters, the sill's ends) */
export const REACH: Record<FacadeStyle, number> = { sash: 0.1, arched: 0.1, shuttered: 0.16, steel: 0.1, balcony: 0.1, pair: 0.1, casement: 0.07, ribbon: 0.05, recess: 0.05, deck: 0.05 };
/** The least plain wall left at each end of a front: under it a bay is dropped and the rest centred again */
export const END_MIN = 0.09;

export interface Bays {
  /** Whole bays across the front */
  n: number;
  /** One bay's width (two cells for the big steel windows) */
  bw: number;
  /** The plain wall at each end, covered by the corner piers */
  s0: number;
  /** The atlas's u (in repeats of a band) at the front's left end, so bay 0 starts on a cell */
  start: number;
}

/**
 * A front's bays, centred: whole bays only, the leftover split between the two ends. `col` is the atlas column the
 * first bay shows (0 to COLS - 1; made even where a window spans two). A hotel's bays start at its left end
 * (its balconies are laid from there).
 */
export function baysOf(w: number, style: FacadeStyle, col: number): Bays {
  const span = PANES[style].span;
  const bw = CELL_W * span;
  if (style === 'balcony') return { n: Math.floor((w + 1e-6) / bw), bw, s0: 0, start: 0 };
  let n = Math.floor((w + 1e-6) / bw);
  if (n > 0 && (w - n * bw) / 2 < END_MIN) n--;
  const s0 = (w - n * bw) / 2;
  const c = col - (col % span);
  return { n, bw, s0, start: c / COLS - s0 / (CELL_W * COLS) };
}

export interface Win {
  floor: number;
  bay: number;
  /** The opening: along the front from its left end, and up from the foot of the upper wall */
  u0: number;
  u1: number;
  y0: number;
  y1: number;
  door: boolean;
  /** There's room over it for its lintel (the top floor's can be under the cornice) */
  head: boolean;
  /** A pair's post between its two sashes */
  post?: [number, number];
}
/** A lintel's height over the glass */
export const LINTEL = 0.11;

/**
 * Every window on a front: `floors` whole floors up from the upper wall's foot, nothing drawn above `clip`
 * (the cornice's underside, or the wall's top), nothing between `skip` (a bay window standing in front).
 */
export function windowsOf(bays: Bays, style: FacadeStyle, floors: number, clip: number, skip?: [number, number]): Win[] {
  const out: Win[] = [];
  for (let floor = 0; floor < floors; floor++)
    for (let bay = 0; bay < bays.n; bay++) {
      const door = style === 'balcony' && bay % 2 === 0;
      const p = door ? BALCONY_DOOR : PANES[style];
      const u0 = bays.s0 + bay * bays.bw + p.x * PX;
      const u1 = u0 + p.w * PX;
      const top = floor * FLOOR + FLOOR - p.y * PY;
      const y0 = top - p.h * PY;
      const y1 = Math.min(top, clip);
      if (y1 - y0 < 0.2) continue;
      if (skip && u1 + REACH[style] > skip[0] && u0 - REACH[style] < skip[1]) continue;
      const win: Win = { floor, bay, u0, u1, y0, y1, door, head: top + LINTEL <= clip };
      if (p.post) win.post = [u0 + p.post[0] * PX, u0 + (p.post[0] + p.post[1]) * PX];
      out.push(win);
    }
  return out;
}
