/*
 * Endswood's blocks (docs/estate-plan.md Phase 3; DOM-free, the boot's: what's solid; tested in
 * tests/endsblocks.test.ts): the estate's buildings as data, drawn by endsblocks3d.ts in its chunk. Brutalist council
 * blocks in board-marked concrete, every name made up, every top under the Emporium (`TALLEST`).
 *
 * - **Fennel House**, the barrier block along the highway: a long deck-access slab in two halves either side of the
 *   spine, small windows on the highway's side, its galleries facing into the estate, escape stairs on its north
 *   face, a bridge over the spine between the halves (a street in the sky); its lifts in its stair towers.
 * - **Stair towers** (the polish round, `STAIRS`): a concrete dog-leg stair standing off every block's galleries,
 *   walked from the street up (endsdecks.ts), Fennel House's with a lift beside it.
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
  /** How far it stands out, where it isn't `DECK.out` (Fennel House's, walked on: wider) */
  out?: number;
  /** Walked on (docs/estate-plan.md Phase 5, endsdecks.ts): its cross walls open at each gallery */
  walk?: true;
}
export interface Bridge {
  rect: Rect;
  /** Its floor and its roof's underside: a walkway `WALK_H` tall, open at the sides over a parapet (Phase 5) */
  y0: number;
  y1: number;
}
/** A walkway's height inside, floor to roof (Liberty Bridge's high walkways are 1.7): over Degen's head */
export const WALK_H = 1.6;
/** A walked gallery's cross walls are open from its floor this high (the lintel over it up to the next gallery) */
export const OPENING = 1.55;
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
const FENNEL = { z0: 337.6, z1: 345, n: 8, out: 1.5 };
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
    // (galleries every second storey, maisonettes' doors on them, as the great deck-access slabs had: room overhead to
    // walk them, docs/estate-plan.md Phase 5)
    decks: [{ shell: 0, side: 's', ys: decks(FENNEL.n, 2), out: FENNEL.out, walk: true }],
    // (the street in the sky over the spine to the east half, on the second gallery's line)
    bridges: [{ rect: [-62, FENNEL.z1 - 0.2, -50, FENNEL.z1 + FENNEL.out], y0: topOf(2), y1: topOf(2) + WALK_H }],
    door: [-97.7, 334.9],
  },
  {
    id: 'fennel-e',
    name: 'Fennel House',
    kind: 'slab',
    shells: fennel(-50, -12, [-46, -19]),
    decks: [{ shell: 0, side: 's', ys: decks(FENNEL.n, 2), out: FENNEL.out, walk: true }],
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
      plain([-35.9, 357, -32.9, 360], topOf(9) + 1.1, { s: 'entry' }),
    ],
    decks: [],
    // (every third floor, its roof under the next: walked on, docs/estate-plan.md Phase 5)
    bridges: [1, 4, 7].map((k) => ({ rect: [-32.9, 357.7, -31, 359.3] as Rect, y0: topOf(k), y1: topOf(k) + WALK_H })),
    door: [-26.5, 363.6],
  },
  {
    id: 'linnet',
    name: 'Linnet Court',
    kind: 'maisonette',
    shells: [shell([-100, 352, -74, 358.5], 4, faces('blank', { n: 'flats', s: 'deck' }), { n: 'garage', s: 'entry', e: 'brick', w: 'brick' }, 1)],
    decks: [{ shell: 0, side: 's', ys: decks(4, 2), walk: true }],
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
    decks: [{ shell: 0, side: 'e', ys: decks(4, 2), walk: true }],
    bridges: [],
    door: [9.1, 352],
  },
  {
    id: 'teasel',
    name: 'Teasel Court',
    kind: 'maisonette',
    shells: [shell([47.5, 340, 54.5, 372], 4, faces('blank', { w: 'flats', e: 'deck' }), { e: 'entry', w: 'garage', n: 'brick', s: 'brick' }, 1)],
    decks: [{ shell: 0, side: 'e', ys: decks(4, 2), walk: true }],
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
    decks: [{ shell: 0, side: 'w', ys: decks(7, 2), walk: true }],
    bridges: [],
    door: [34.6, 391.2],
  },
  {
    id: 'wren',
    name: 'Wren Court',
    kind: 'maisonette',
    shells: [shell([47.5, 388, 54.5, 422], 4, faces('blank', { w: 'flats', e: 'deck' }), { e: 'entry', w: 'brick', n: 'brick', s: 'brick' }, 0)],
    decks: [{ shell: 0, side: 'e', ys: decks(4, 2), walk: true }],
    bridges: [],
    door: [55.1, 400.7],
  },
];

/* ---------- Stair towers (the polish round) ---------- */

/**
 * A concrete stair tower up to a block's galleries (the polish round, the owner's call: "use a stairwell to get to the
 * balcony"), every one walked (endsdecks.ts): a dog-leg stair, two flights to each gallery with a half landing between,
 * standing out from the gallery's outer edge (or its end) through a gap in its parapet. Written in its own frame: `u`
 * across it (lane A, the flights out, at -u; lane B, the flights back, at +u), `v` out from the gallery's edge.
 */
export interface StairTower {
  block: string;
  deck: number;
  /** The way it stands out from the gallery: the gallery's own side (off its outer edge) or along it (off its end) */
  side: Side;
  /** Its middle along the edge it stands on (world x for a north or south one, z for an east or west one); off a
   * gallery's end, in line with its middle */
  at?: number;
  /** A lift in a shaft beside it (on its +u side), its doors on the landing where it meets each gallery: the near
   * landing deeper (`LIFT_NEAR`) for an up door and a down door side by side */
  lift?: true;
}
/** Its measurements: half its inside width, its walls, half the wall between the flights, the near landing (where it
 * meets the gallery), the flights' run, the half landing, the porch's height at the foot (under the first landing) */
export const STAIR = { half: 1, wall: 0.2, spine: 0.1, near: 0.9, run: 1.6, far: 0.8, porch: 1.4, slab: 0.15, rail: 0.95 };
/** A lift tower's near landing, and its shaft's width across (beside the tower's +u wall) */
export const LIFT_NEAR = 1.6;
export const SHAFT = 1.3;
export const STAIR_TOWERS: StairTower[] = [
  // (Fennel House's lifts are in its towers, by its galleries: the cores on its highway side are escape stairs)
  { block: 'fennel-w', deck: 0, side: 's', at: -66, lift: true },
  { block: 'fennel-e', deck: 0, side: 's', at: -35.6, lift: true },
  { block: 'linnet', deck: 0, side: 's', at: -87 },
  // (Marten House's west galleries run the block's length: its tower stands off their north end)
  { block: 'marten', deck: 0, side: 'n' },
  { block: 'sorrel', deck: 0, side: 'e', at: 360 },
  { block: 'teasel', deck: 0, side: 'e', at: 344 },
  { block: 'wren', deck: 0, side: 'e', at: 392.5 },
];
export const STEP_OUT: Record<Side, [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
export interface StairGeom {
  tower: StairTower;
  /** The floors it reaches: the ground, then each gallery */
  levels: number[];
  /** Its roof's top */
  top: number;
  /** Its near landing's depth out from the gallery (`STAIR.near`, or `LIFT_NEAR` with a lift) and its whole depth */
  near: number;
  depth: number;
  /** The middle of its edge on the gallery, out (v) and across (u, a quarter turn from v) */
  origin: [number, number];
  out: [number, number];
  across: [number, number];
  /** Is `v` along world x (an east or west tower) */
  vAlongX: boolean;
  /** A rect in its frame (u0, v0, u1, v1) as a world rect */
  rect(u0: number, v0: number, u1: number, v1: number): Rect;
  /** A point in its frame in world numbers */
  at(u: number, v: number): [number, number];
  /** World x or z (whichever runs along v) at `v` */
  alongV(v: number): number;
}
export function stairGeom(t: StairTower): StairGeom {
  const b = BLOCKS.find((q) => q.id === t.block)!;
  const d = b.decks[t.deck];
  const r = deckRect(b, d);
  const out = STEP_OUT[t.side];
  // (across: a quarter turn from out, so lane A, -u, is on the left looking out)
  const across: [number, number] = [-out[1], out[0]];
  const vAlongX = out[0] !== 0;
  const edge = t.side === 'n' ? r[1] : t.side === 's' ? r[3] : t.side === 'w' ? r[0] : r[2];
  // (off a gallery's end: in line with its middle)
  const inline = t.side !== d.side;
  const mid = inline ? (vAlongX ? (r[1] + r[3]) / 2 : (r[0] + r[2]) / 2) : t.at!;
  const origin: [number, number] = vAlongX ? [edge, mid] : [mid, edge];
  const at = (u: number, v: number): [number, number] => [origin[0] + across[0] * u + out[0] * v, origin[1] + across[1] * u + out[1] * v];
  const rect = (u0: number, v0: number, u1: number, v1: number): Rect => {
    const [ax, az] = at(u0, v0);
    const [cx, cz] = at(u1, v1);
    return [Math.min(ax, cx), Math.min(az, cz), Math.max(ax, cx), Math.max(az, cz)];
  };
  const levels = [SLAB_Y, ...d.ys];
  const near = t.lift ? LIFT_NEAR : STAIR.near;
  return { tower: t, levels, top: levels[levels.length - 1] + 2, near, depth: near + STAIR.run + STAIR.far + STAIR.wall, origin, out, across, vAlongX, rect, at, alongV: (v) => (vAlongX ? at(0, v)[0] : at(0, v)[1]) };
}
export const STAIRS: StairGeom[] = STAIR_TOWERS.map(stairGeom);
/** Where along a gallery's edge (its parapet, or its end wall) each tower opens onto it: the world span and the tower */
export const stairGapsOf = (b: EstateBlock, k: number) => STAIRS.filter((g) => g.tower.block === b.id && g.tower.deck === k);
/** What's solid of each at street level: its two sides and its back past the porch, the wall between the flights, and
 * the space under the first flight back (no walking under a stair) */
export function stairSolids(g: StairGeom): Box[] {
  const { half, wall, spine, run, far } = STAIR;
  const near = g.near;
  const back = near + run + far;
  return [
    // (the lift's shaft beside its landings, the porch to the street open in front of it)
    ...(g.tower.lift ? [[...g.rect(half + wall, 0, half + wall + SHAFT, near), g.top] as Box] : []),
    [...g.rect(-half - wall, near, -half, back + wall), g.top],
    [...g.rect(half, near, half + wall, back + wall), g.top],
    [...g.rect(-half - wall, back, half + wall, back + wall), g.top],
    [...g.rect(-spine, near, spine, near + run), g.top],
    [...g.rect(spine, near, half, back), (g.levels[0] + g.levels[1]) / 2],
  ];
}

/** Every block's bridges (the street in the sky is the west half's, and meets the east half's gallery too) */
const BLOCKS_BRIDGES = () => BLOCKS.flatMap((b) => b.bridges);
/** The rect a gallery covers (its floor, out from its face) */
export function deckRect(b: EstateBlock, d: Deck): Rect {
  const [x0, z0, x1, z1] = b.shells[d.shell].rect;
  const o = d.out ?? DECK.out;
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
/** Is a gallery's cross wall at `x` or `z` along it one of its two ends, and does a bridge meet that end at `y` */
const bridgedAt = (b: EstateBlock, f: Rect, y: number) => BLOCKS_BRIDGES().some((br) => Math.abs(br.y0 - y) < 0.01 && f[0] <= br.rect[2] + 0.01 && f[2] >= br.rect[0] - 0.01 && f[1] < br.rect[3] && f[3] > br.rect[1]);
/**
 * A cross wall's solid spans, bottom up: whole, or for a walked gallery open `OPENING` from each gallery's floor (but
 * at its two ends, unless a bridge meets it there)
 */
export function finSpans(b: EstateBlock, d: Deck): { rect: Rect; spans: [number, number][] }[] {
  const s = b.shells[d.shell];
  const fins = finsOf(b, d);
  return fins.map((f, k) => {
    const end = k === 0 || k === fins.length - 1;
    // (an end's open where a bridge meets it at that gallery, or a stair tower stands off it)
    const open = d.walk ? d.ys.filter((y) => !end || bridgedAt(b, f, y) || stairedAt(b, d, f)) : [];
    const spans: [number, number][] = [];
    let at = s.y0;
    for (const y of open) {
      spans.push([at, y]);
      at = y + OPENING;
    }
    // (the top gallery's opening runs up past the stub over its parapet)
    if (at < finTop(d) - 1e-9) spans.push([at, finTop(d)]);
    return { rect: f, spans };
  });
}
/** Does a stair tower stand off a gallery's end at its cross wall `f` (in line with the gallery) */
const stairedAt = (b: EstateBlock, d: Deck, f: Rect) =>
  STAIRS.some((g) => {
    if (g.tower.block !== b.id || b.decks[g.tower.deck] !== d) return false;
    const gap = g.rect(-STAIR.half, -0.5, STAIR.half, 0.2);
    return f[0] < gap[2] && f[2] > gap[0] && f[1] < gap[3] && f[3] > gap[1];
  });
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
export const BLOCK_SOLIDS: Box[] = [...BLOCKS.flatMap((b) => [
  ...b.shells.map((s): Box => [s.rect[0], s.rect[1], s.rect[2], s.rect[3], s.y1 + PARAPET]),
  // (a walked gallery's cross walls to its first gallery's floor: over that they're open at each gallery, and their
  // lintels are the walk camera's, endsdecks.ts; nothing on the ground reaches higher)
  ...b.decks.flatMap((d) => finsOf(b, d).map((r): Box => [...r, d.walk ? d.ys[0] : finTop(d)])),
  ...(b.hoarding ? hoardingRuns(b.hoarding).map((r): Box => [...r, HOARD.h]) : []),
]), ...STAIRS.flatMap(stairSolids)];
