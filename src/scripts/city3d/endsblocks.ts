/*
 * Endswood's blocks (docs/estate-plan.md Phase 3; DOM-free, the boot's: what's solid; tested in
 * tests/endsblocks.test.ts): the estate's buildings as data, drawn by endsblocks3d.ts in its chunk. Brutalist council
 * blocks in board-marked concrete, every name made up, every top under the Emporium (`TALLEST`).
 *
 * - **Fennel House**, the barrier block along the highway: a long deck-access slab in two halves either side of the
 *   spine, small windows on the highway's side, its galleries facing into the estate, stair and lift cores on its
 *   north face, a bridge over the spine between the halves (a street in the sky).
 * - **Harrier Point**, the point tower, its lift and stair tower standing apart, bridges across every third floor.
 * - **Linnet, Sorrel, Teasel and Wren Courts**, maisonettes: a gallery every second floor, garages under some.
 * - **Marten House**, a smaller slab east of the avenue; **Hawthorn Terrace**, stepping down towards the common, each
 *   step's roof the terrace of the flats over it; **Kite House**, emptied for demolition: every window behind grey
 *   steel screens, hoardings round its foot.
 * - The lock-up garages along the Close, and the garage court behind Hawthorn Terrace (docs/estate-plan.md Phase 4).
 * - **Endswood Parade** (Phase 4): maisonettes over a row of shops facing Endswood Road behind a forecourt (its units,
 *   canopy and shopfronts are endsstreet.ts's).
 *
 * A building is shells (boxes standing on the block's slab: a face on each side, the ground floor's own front), galleries
 * (`Deck`: hung off a face every floor or every second), bridges and rooftop plant rooms. Heights: a ground floor
 * `GROUND` tall, the storeys over it `STOREY` each.
 */
import { SLAB_Y, type Pt, type Rect, type Box } from './endswood';
import { PARADE } from './endsstreet';

export type Side = 'n' | 's' | 'e' | 'w';
/** What a face shows above the ground floor (endsblocks3d.ts's atlas bands): flats' windows with coloured panels under
 * them, the barrier's slit windows, the doors behind a gallery, plain concrete, steel-screened windows */
export type Face = 'flats' | 'slits' | 'deck' | 'blank' | 'void';
/** What a ground floor shows: garage doors, engineering brick, a glazed entrance, or shopfronts (endsstreet3d.ts draws
 * those: the parade's) */
export type Ground = 'garage' | 'brick' | 'entry' | 'shops';
/** The flats' panels' colour: faded orange, teal, mustard */
export type Tint = 0 | 1 | 2;

export const GROUND = 1.5;
export const STOREY = 1;
/** How far a gallery stands out from its face, how tall its parapet is */
export const DECK = { out: 1.1, slab: 0.12, parapet: 0.55 };
/** The roofs' parapet over the roof */
export const PARAPET = 0.25;
/** The tallest anything may stand (under the Emporium's roof by half a tile, projects.ts `EMPORIUM_ROOF`) */
export const TALLEST = 12;

export interface Shell {
  rect: Rect;
  /** Its foot (the block's slab) and its roof */
  y0: number;
  y1: number;
  faces: Record<Side, Face>;
  ground: Partial<Record<Side, Ground>>;
  tint: Tint;
  /** A plant room or a lift house: plain concrete all round, no ground floor of its own */
  plain?: true;
}
export interface Deck {
  /** The shell it hangs off and which face */
  shell: number;
  side: Side;
  /** Each gallery's floor */
  ys: number[];
}
export interface Bridge {
  rect: Rect;
  y0: number;
  y1: number;
}
export interface EstateBlock {
  id: string;
  name: string;
  kind: 'slab' | 'tower' | 'maisonette' | 'terrace' | 'condemned' | 'garages' | 'parade';
  shells: Shell[];
  decks: Deck[];
  bridges: Bridge[];
  /** Hoardings round its foot (a condemned block's): their runs */
  hoarding?: Rect;
  /** Where its entrance is, on the ground outside it */
  door: Pt;
}

/** A height `n` storeys over the ground floor, from the slab */
export const topOf = (n: number) => SLAB_Y + GROUND + n * STOREY;
const faces = (all: Face, over: Partial<Record<Side, Face>> = {}): Record<Side, Face> => ({ n: all, s: all, e: all, w: all, ...over });
/** A shell standing on the slab, `n` storeys over its ground floor */
const shell = (rect: Rect, n: number, f: Record<Side, Face>, ground: Partial<Record<Side, Ground>>, tint: Tint): Shell => ({ rect, y0: SLAB_Y, y1: topOf(n), faces: f, ground, tint });
/** A plain one (a core, a lift tower) to `top` */
const plain = (rect: Rect, top: number, ground: Partial<Record<Side, Ground>> = {}): Shell => ({ rect, y0: SLAB_Y, y1: top, faces: faces('blank'), ground: { n: 'brick', s: 'brick', e: 'brick', w: 'brick', ...ground }, tint: 0, plain: true });
/** The galleries' floors: every storey over the ground floor (every second, from the first, for maisonettes) */
const decks = (n: number, step = 1) => Array.from({ length: Math.ceil(n / step) }, (_, k) => SLAB_Y + GROUND + k * step * STOREY);

/** Fennel House's line: its galleries face south into the estate */
const FENNEL = { z0: 337.6, z1: 345, n: 8 };
const CORE = 2.6;
const fennel = (x0: number, x1: number, cores: number[]): Shell[] => [
  shell([x0, FENNEL.z0, x1, FENNEL.z1], FENNEL.n, faces('blank', { n: 'slits', s: 'deck' }), { n: 'brick', s: 'garage', e: 'brick', w: 'brick' }, 0),
  // (its cores on the highway's side, a lift house over each)
  ...cores.map((x) => plain([x, FENNEL.z0 - 2, x + CORE, FENNEL.z0], topOf(FENNEL.n) + 1.3, { n: 'entry' })),
];

export const BLOCKS: EstateBlock[] = [
  {
    id: 'fennel-w',
    name: 'Fennel House',
    kind: 'slab',
    shells: fennel(-103, -62, [-99, -70]),
    decks: [{ shell: 0, side: 's', ys: decks(FENNEL.n) }],
    // (the street in the sky over the spine to the east half, at the third floor)
    bridges: [{ rect: [-62, 340.3, -50, 342.3], y0: topOf(2), y1: topOf(3) }],
    door: [-97.7, 334.9],
  },
  {
    id: 'fennel-e',
    name: 'Fennel House',
    kind: 'slab',
    shells: fennel(-50, -12, [-46, -19]),
    decks: [{ shell: 0, side: 's', ys: decks(FENNEL.n) }],
    bridges: [],
    door: [-17.7, 334.9],
  },
  {
    id: 'harrier',
    name: 'Harrier Point',
    kind: 'tower',
    shells: [
      shell([-31, 354, -22, 363], 9, faces('flats'), { n: 'brick', s: 'entry', e: 'brick', w: 'brick' }, 0),
      // (the lift and stair tower standing apart west of it, its lift house over the tower's roof)
      plain([-35.6, 357, -32.6, 360], topOf(9) + 1.1, { s: 'entry' }),
    ],
    decks: [],
    bridges: [2, 5, 8].map((k) => ({ rect: [-32.6, 357.9, -31, 359.1] as Rect, y0: topOf(k), y1: topOf(k) + 0.9 })),
    door: [-26.5, 363.6],
  },
  {
    id: 'linnet',
    name: 'Linnet Court',
    kind: 'maisonette',
    shells: [shell([-100, 352, -74, 358.5], 4, faces('blank', { n: 'flats', s: 'deck' }), { n: 'garage', s: 'entry', e: 'brick', w: 'brick' }, 1)],
    decks: [{ shell: 0, side: 's', ys: decks(4, 2) }],
    bridges: [],
    door: [-87, 359.1],
  },
  {
    id: 'lockups',
    name: 'Endswood Close garages',
    kind: 'garages',
    shells: [{ rect: [-100, 372.5, -76, 376.4], y0: SLAB_Y, y1: SLAB_Y + GROUND, faces: faces('blank'), ground: { s: 'garage', n: 'brick', e: 'brick', w: 'brick' }, tint: 0 }],
    decks: [],
    bridges: [],
    door: [-88, 377],
  },
  {
    id: 'hawthorn',
    name: 'Hawthorn Terrace',
    kind: 'terrace',
    // (four steps down to the south, each its own shell; the front one its entrance)
    shells: [3, 2, 1, 0].map((n, k) => shell([-101, 387 + k * 5, -72, 392 + k * 5], n, faces('blank', { s: 'flats' }), { s: k === 3 ? 'entry' : 'brick', e: 'brick', w: 'brick', n: 'brick' }, 2)),
    decks: [],
    bridges: [],
    door: [-86.5, 407.6],
  },
  {
    id: 'kite',
    name: 'Kite House',
    kind: 'condemned',
    shells: [shell([-44, 398, -14, 405], 7, faces('void', { e: 'blank', w: 'blank' }), { n: 'brick', s: 'brick', e: 'brick', w: 'brick' }, 1)],
    decks: [],
    bridges: [],
    hoarding: [-45.6, 396.4, -12.4, 406.6],
    door: [-29, 395.8],
  },
  {
    id: 'parade',
    name: 'Endswood Parade',
    kind: 'parade',
    shells: [shell([PARADE.x0, PARADE.z, PARADE.x1, PARADE.back], PARADE.storeys, faces('blank', { n: 'flats', s: 'flats' }), { n: 'shops', s: 'brick', e: 'brick', w: 'brick' }, 2)],
    decks: [],
    bridges: [],
    // (the tenants' hall's door at its east end)
    door: [-12.9, 385.3],
  },
  {
    id: 'court-n',
    name: 'Hawthorn garages',
    kind: 'garages',
    shells: [{ rect: [-100, 410.5, -84, 414.2], y0: SLAB_Y, y1: SLAB_Y + GROUND, faces: faces('blank'), ground: { s: 'garage', n: 'brick', e: 'brick', w: 'brick' }, tint: 0 }],
    decks: [],
    bridges: [],
    door: [-92, 414.8],
  },
  {
    id: 'court-s',
    name: 'Hawthorn garages',
    kind: 'garages',
    shells: [{ rect: [-102, 423.6, -78, 427.3], y0: SLAB_Y, y1: SLAB_Y + GROUND, faces: faces('blank'), ground: { n: 'garage', s: 'brick', e: 'brick', w: 'brick' }, tint: 0 }],
    decks: [],
    bridges: [],
    door: [-90, 423],
  },
  {
    id: 'sorrel',
    name: 'Sorrel Court',
    kind: 'maisonette',
    shells: [shell([1.5, 340, 8.5, 372], 4, faces('blank', { w: 'flats', e: 'deck' }), { e: 'entry', w: 'brick', n: 'brick', s: 'brick' }, 0)],
    decks: [{ shell: 0, side: 'e', ys: decks(4, 2) }],
    bridges: [],
    door: [9.1, 352],
  },
  {
    id: 'teasel',
    name: 'Teasel Court',
    kind: 'maisonette',
    shells: [shell([47.5, 340, 54.5, 372], 4, faces('blank', { w: 'flats', e: 'deck' }), { e: 'entry', w: 'garage', n: 'brick', s: 'brick' }, 1)],
    decks: [{ shell: 0, side: 'e', ys: decks(4, 2) }],
    bridges: [],
    door: [55.1, 352],
  },
  {
    id: 'marten',
    name: 'Marten House',
    kind: 'slab',
    shells: [
      shell([24, 387, 31.5, 423], 7, faces('blank', { e: 'flats', w: 'deck' }), { w: 'garage', e: 'entry', n: 'brick', s: 'brick' }, 2),
      plain([31.5, 390, 34, 392.5], topOf(7) + 1.2, { e: 'entry' }),
      plain([31.5, 417.5, 34, 420], topOf(7) + 1.2, { e: 'entry' }),
    ],
    decks: [{ shell: 0, side: 'w', ys: decks(7) }],
    bridges: [],
    door: [34.6, 391.2],
  },
  {
    id: 'wren',
    name: 'Wren Court',
    kind: 'maisonette',
    shells: [shell([47.5, 388, 54.5, 422], 4, faces('blank', { w: 'flats', e: 'deck' }), { e: 'entry', w: 'brick', n: 'brick', s: 'brick' }, 0)],
    decks: [{ shell: 0, side: 'e', ys: decks(4, 2) }],
    bridges: [],
    door: [55.1, 400.7],
  },
];

/** The rect a gallery covers (its floor, out from its face) */
export function deckRect(b: EstateBlock, d: Deck): Rect {
  const [x0, z0, x1, z1] = b.shells[d.shell].rect;
  const o = DECK.out;
  return d.side === 'n' ? [x0, z0 - o, x1, z0] : d.side === 's' ? [x0, z1, x1, z1 + o] : d.side === 'w' ? [x0 - o, z0, x0, z1] : [x1, z0, x1 + o, z1];
}
/** A gallery's cross walls (it hangs off them): at each end and every 9 or so, from the slab to its top parapet */
export const FIN = 0.22;
export function finsOf(b: EstateBlock, d: Deck): Rect[] {
  const [x0, z0, x1, z1] = deckRect(b, d);
  const alongX = d.side === 'n' || d.side === 's';
  const [a, c] = alongX ? [x0, x1] : [z0, z1];
  const n = Math.max(1, Math.round((c - a) / 9));
  return Array.from({ length: n + 1 }, (_, k): Rect => {
    const at = a + ((c - a) * k) / n;
    const [lo, hi] = [Math.max(a, at - FIN / 2), Math.min(c, at + FIN / 2)];
    return alongX ? [lo, z0, hi, z1] : [x0, lo, x1, hi];
  });
}
/** The top of a gallery's cross walls */
export const finTop = (d: Deck) => d.ys[d.ys.length - 1] + DECK.parapet;
/** The hoardings' panels as thin runs round a rect, `gap` left open nowhere (a condemned block is shut) */
export const HOARD = { h: 1.7, t: 0.12 };
export function hoardingRuns(r: Rect): Rect[] {
  const [x0, z0, x1, z1] = r;
  const t = HOARD.t;
  return [
    [x0, z0, x1, z0 + t],
    [x0, z1 - t, x1, z1],
    [x0, z0, x0 + t, z1],
    [x1 - t, z0, x1, z1],
  ];
}

/** What's solid: every shell standing on the slab to its roof's parapet, the galleries' cross walls and the hoardings
 * (the galleries and bridges are over a walker's head) */
export const BLOCK_SOLIDS: Box[] = BLOCKS.flatMap((b) => [
  ...b.shells.map((s): Box => [s.rect[0], s.rect[1], s.rect[2], s.rect[3], s.y1 + PARAPET]),
  ...b.decks.flatMap((d) => finsOf(b, d).map((r): Box => [...r, finTop(d)])),
  ...(b.hoarding ? hoardingRuns(b.hoarding).map((r): Box => [...r, HOARD.h]) : []),
]);
