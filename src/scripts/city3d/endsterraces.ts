/*
 * Endswood carried west, the terraces (docs/ends-west-plan.md Phase 2; DOM-free, the chunk's, tested in
 * tests/endsterraces.test.ts): the council town houses on the rows' footprints Phase 1 kept (endswest.ts `ROWS`),
 * laid as those estates were: each row broken into terraces by walk-through passages (`GINNEL`) from the front paths
 * to the back gardens and the courts, each terrace its own build (the owner's picks: two and three storeys mixed along
 * each row, flat roofs behind a parapet and shallow pitched ones mixed, as worn as Endswood), its houses mirrored in
 * pairs so their doors sit side by side, every door its own colour (the owner's pick: mixed, as after right-to-buy),
 * a concrete canopy or a brick porch over it, and here and there a glazed porch someone added, a boarded window, a dish,
 * a faded door, a stained canopy. Behind each house its back garden in close-board fences with a gate onto the court
 * (or the strip by the Close), a shed in some. Everything under the Emporium.
 *
 * `TERRACE_SOLIDS` join the grids when the chunk loads (endswest3d.ts, `addSolids()`); the boot never carries any of
 * it. In world numbers, x across, z north (-) to south (+); a terrace's own frame is u along its front from its left
 * end as you face it, v out from the front (back is negative), as infill.ts's `kit()` draws.
 */
import { COURTS, GARDENS, ROWS, type Row } from './endswest';
import { SLAB_Y, type Pt, type Rect } from './endswood';
import { rng } from './recipes';
import type { Box } from './solids';
import { HOME, HOME_HOUSE } from './home';

export type RoofKind = 'flat' | 'pitched';
export type Brick = 'brick' | 'brickTan' | 'brickDark';
export type PorchKind = 'canopy' | 'box' | 'glazed';

/** A storey's height: the ground floor's taller (a door a grown-up walks through), the floors over it a tile */
export const GROUND_H = 1.25;
export const UPPER_H = 1;
/** A pitched roof's rise over its eaves (shallow: council roofs), and a flat roof's parapet */
export const PITCH = 0.85;
export const PARAPET_H = 0.24;
/** The passages through each row between its terraces (walk-only) */
export const GINNEL = 1.6;
/** A door: its width, height, and how far in from its house's end it stands */
export const DOOR = { w: 0.6, h: 1.1, in: 0.75 };
/** What stands out from a front: a canopy's depth, a porch's depth and width, a bin's footprint */
export const CANOPY = { d: 0.6, w: 1.1, y: 1.3 };
export const PORCH = { d: 0.7, w: 1.1, h: 1.32 };
export const BIN = { w: 0.42, d: 0.48, h: 0.66 };
/** The close-board fences round the back gardens: their height and thickness */
export const FENCE = { h: 0.95, t: 0.08 };
/** The tallest anything here stands (a three-storey pitched terrace's chimney), well under the Emporium's 12.5 */
export const TALLEST = 6;

/** Doors in their own colours (the owner's pick: mixed, as after right-to-buy), the uPVC white among them */
export const DOOR_COLOURS = ['#b3302b', '#2b4c86', '#2e663c', '#d6b03a', '#1c1b21', '#683b77', '#ecebe6', '#c4682a', '#3f7f88'];

export interface House {
  id: string;
  /** Along its terrace's front (u) */
  u0: number;
  u1: number;
  /** The door's middle along the front (u), and its foot outside it (world) */
  door: number;
  foot: Pt;
  colour: string;
  porch: PorchKind;
  /** Worn: a board over a ground-floor window (its middle along the front, u), a dish, a faded door, a stained canopy */
  board: number | null;
  dish: boolean;
  faded: boolean;
  stained: boolean;
  /** A wheelie bin or two by the front, on the side away from the door (u of the first) */
  bins: number;
  binU: number;
  /** A shed at the end of its back garden */
  shed: boolean;
}

export interface Terrace {
  id: string;
  row: Row;
  /** Its body (world) */
  rect: Rect;
  storeys: 2 | 3;
  roof: RoofKind;
  brick: Brick;
  /** Its frame: u along the front from `left` (world), out along `n` */
  left: Pt;
  t: Pt;
  n: Pt;
  /** Front width and depth */
  w: number;
  d: number;
  /** The wall's top (the eaves, or the flat roof's deck), and its very top (the ridge, or the parapet) */
  top: number;
  peak: number;
  houses: House[];
  /** Its back garden's far edge, measured back from the front (a positive depth) */
  garden: number;
}

/** How each row is broken up: its terraces' house counts and builds (the owner's picks: every row mixed) */
interface Plan {
  n: number;
  storeys: 2 | 3;
  roof: RoofKind;
  brick: Brick;
}
const PLANS: Record<string, Plan[]> = {
  rn1: [
    { n: 4, storeys: 3, roof: 'flat', brick: 'brickTan' },
    { n: 4, storeys: 2, roof: 'pitched', brick: 'brick' },
  ],
  rn2: [
    { n: 3, storeys: 2, roof: 'pitched', brick: 'brick' },
    { n: 2, storeys: 3, roof: 'flat', brick: 'brickDark' },
    { n: 3, storeys: 2, roof: 'pitched', brick: 'brickTan' },
  ],
  rs1: [
    { n: 5, storeys: 2, roof: 'pitched', brick: 'brickTan' },
    { n: 3, storeys: 3, roof: 'flat', brick: 'brick' },
  ],
  rs2: [
    { n: 3, storeys: 3, roof: 'flat', brick: 'brick' },
    { n: 5, storeys: 2, roof: 'pitched', brick: 'brickDark' },
  ],
  rs3: [
    { n: 2, storeys: 2, roof: 'pitched', brick: 'brick' },
    { n: 4, storeys: 3, roof: 'flat', brick: 'brickTan' },
    { n: 2, storeys: 2, roof: 'pitched', brick: 'brickDark' },
  ],
  rs4: [
    { n: 4, storeys: 2, roof: 'flat', brick: 'brick' },
    { n: 4, storeys: 3, roof: 'pitched', brick: 'brickTan' },
  ],
};

const wallTop = (s: 2 | 3) => SLAB_Y + GROUND_H + (s - 1) * UPPER_H;

/** The world point at (u, v) in a terrace's frame */
export const toWorld = (T: Pick<Terrace, 'left' | 't' | 'n'>, u: number, v: number): Pt => [T.left[0] + T.t[0] * u + T.n[0] * v, T.left[1] + T.t[1] * u + T.n[1] * v];
/** A rect in a terrace's frame (u0..u1 along, v0..v1 out) as a world rect */
export function rectOf(T: Pick<Terrace, 'left' | 't' | 'n'>, u0: number, u1: number, v0: number, v1: number): Rect {
  const a = toWorld(T, u0, v0);
  const c = toWorld(T, u1, v1);
  return [Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.max(a[0], c[0]), Math.max(a[1], c[1])];
}

export const TERRACES: Terrace[] = ROWS.flatMap((row, ri) => {
  const plans = PLANS[row.id];
  const [x0, z0, x1, z1] = row.rect;
  const total = plans.reduce((s, p) => s + p.n, 0);
  const hw = (x1 - x0 - GINNEL * (plans.length - 1)) / total;
  // The frame faces out of the row's front: south (+1) along +x from its west end, north (-1) along -x from its east end
  const n: Pt = [0, row.faces];
  const t: Pt = [n[1], -n[0]];
  const g = GARDENS[ri];
  const garden = row.faces > 0 ? z0 - g[1] : g[3] - z1;
  const out: Terrace[] = [];
  let x = x0;
  let k = 0;
  plans.forEach((p, bi) => {
    const w = hw * p.n;
    const rect: Rect = [x, z0, x + w, z1];
    const left: Pt = row.faces > 0 ? [x, z1] : [x + w, z0];
    const top = wallTop(p.storeys);
    const T: Terrace = { id: `${row.id}-${bi}`, row, rect, storeys: p.storeys, roof: p.roof, brick: p.brick, left, t, n, w, d: z1 - z0, top, peak: p.roof === 'pitched' ? top + PITCH : top + PARAPET_H, houses: [], garden };
    for (let i = 0; i < p.n; i++) {
      const r = rng(9100 + ri * 97 + bi * 31 + i * 7);
      const [u0, u1] = [i * hw, (i + 1) * hw];
      // Mirrored in pairs: the first of a pair's door by its right end, the second's by its left, side by side
      const door = i % 2 === 0 ? u1 - DOOR.in : u0 + DOOR.in;
      const prev = T.houses[i - 1]?.colour ?? out.at(-1)?.houses.at(-1)?.colour;
      let c = Math.floor(r() * DOOR_COLOURS.length);
      if (DOOR_COLOURS[c] === prev) c = (c + 1) % DOOR_COLOURS.length;
      const porch: PorchKind = r() < 0.18 ? 'glazed' : p.roof === 'pitched' ? 'box' : 'canopy';
      const away = door > (u0 + u1) / 2 ? u0 + 0.35 : u1 - 0.35 - BIN.w;
      T.houses.push({
        id: `${T.id}-${i}`,
        u0,
        u1,
        door,
        foot: toWorld(T, door, porch === 'canopy' ? 0.45 : PORCH.d + 0.3),
        colour: DOOR_COLOURS[c],
        porch,
        board: (k * 5 + ri) % 7 === 3 ? (door > (u0 + u1) / 2 ? u0 + 1.2 : u1 - 1.2) : null,
        dish: r() < 0.35,
        faded: r() < 0.25,
        stained: r() < 0.3,
        bins: r() < 0.4 ? 2 : 1,
        binU: away,
        // (Degen's home, home.ts: his garage stands in its garden)
        shed: r() < 0.4 && garden > 3 && `${T.id}-${i}` !== HOME_HOUSE,
      });
      k++;
    }
    out.push(T);
    x += w + GINNEL;
  });
  return out;
});

/** Every house, in row order */
export const HOUSES: House[] = TERRACES.flatMap((t) => t.houses);

/** The passages through the rows: from the front path back to the gardens' far edge (world rects) */
export const GINNELS: Rect[] = ROWS.flatMap((row, ri) => {
  const ts = TERRACES.filter((t) => t.row === row);
  const g = GARDENS[ri];
  const [z0, z1] = row.faces > 0 ? [g[1], row.rect[3]] : [row.rect[1], g[3]];
  return ts.slice(1).map((t, i): Rect => [ts[i].rect[2], z0, t.rect[0], z1]);
});

/** Is the court behind a row's gardens (a gate onto it), or only the strip by the Close? */
export const courtBehind = (row: Row) => {
  const g = GARDENS[ROWS.indexOf(row)];
  const edge = row.faces > 0 ? g[1] : g[3];
  return COURTS.some((c) => Math.abs((row.faces > 0 ? c[3] : c[1]) - edge) < 1e-6);
};

/** A box along a line from a to c (world), `t` thick, `h` tall */
function lineBox(a: Pt, c: Pt, t: number, h: number): Box {
  return [Math.min(a[0], c[0]) - t / 2, Math.min(a[1], c[1]) - t / 2, Math.max(a[0], c[0]) + t / 2, Math.max(a[1], c[1]) + t / 2, h];
}
/** The garden fences of a terrace (world lines): one along every party line and both ends, and one along the far edge */
export function fencesOf(T: Terrace): [Pt, Pt][] {
  const lines: [Pt, Pt][] = [];
  const back = -T.d;
  const far = -T.d - T.garden;
  const us = [0, ...T.houses.map((h) => h.u1)];
  // (inset a hair from the ends, so the end fences stand on the terrace's own land, not in the passage)
  for (const u of us) {
    const uu = Math.min(T.w - FENCE.t / 2, Math.max(FENCE.t / 2, u));
    lines.push([toWorld(T, uu, back), toWorld(T, uu, far + FENCE.t / 2)]);
  }
  lines.push([toWorld(T, FENCE.t / 2, far + FENCE.t / 2), toWorld(T, T.w - FENCE.t / 2, far + FENCE.t / 2)]);
  // Degen's home (home.ts): where his garage stands its walls are the garden's edge, and the fences stop at them
  return T.houses.some((h) => h.id === HOME_HOUSE) ? lines.flatMap((l) => cutBy(l, HOME.garage)) : lines;
}

/** A fence line (along x or z) less the stretch that runs along or inside a rect (within a fence's thickness of it) */
function cutBy([a, c]: [Pt, Pt], [x0, z0, x1, z1]: Rect): [Pt, Pt][] {
  const m = FENCE.t * 1.5;
  const alongZ = Math.abs(a[0] - c[0]) < 1e-9;
  const [fixed, lo, hi] = alongZ ? [a[0], Math.min(a[1], c[1]), Math.max(a[1], c[1])] : [a[1], Math.min(a[0], c[0]), Math.max(a[0], c[0])];
  const [f0, f1, r0, r1] = alongZ ? [x0, x1, z0, z1] : [z0, z1, x0, x1];
  if (fixed < f0 - m || fixed > f1 + m || hi <= r0 || lo >= r1) return [[a, c]];
  const pt = (v: number): Pt => (alongZ ? [fixed, v] : [v, fixed]);
  const out: [Pt, Pt][] = [];
  if (lo < r0 - 1e-6) out.push([pt(lo), pt(r0)]);
  if (hi > r1 + 1e-6) out.push([pt(r1), pt(hi)]);
  return out;
}

/** Each house's gate in its back fence: its middle along the front (u) and its width */
export const GATE_W = 0.7;
export const gateOf = (h: House) => (h.door > (h.u0 + h.u1) / 2 ? h.u1 - 0.7 : h.u0 + 0.7);

/** How far out from the front a bin stands, and where each of a house's bins starts along it (u: the second towards the door) */
export const BIN_OFF = 0.04;
export const binsOf = (h: House) => Array.from({ length: h.bins }, (_, b) => h.binU + (h.binU > h.door ? -b : b) * (BIN.w + 0.06));

/** What's solid: the terraces to their tops, the porches, the bins and the gardens' fences (gates shut) */
export const TERRACE_SOLIDS: Box[] = TERRACES.flatMap((T): Box[] => {
  const out: Box[] = [[...T.rect, T.peak] as Box];
  for (const h of T.houses) {
    if (h.porch !== 'canopy') out.push([...rectOf(T, h.door - PORCH.w / 2, h.door + PORCH.w / 2, 0, PORCH.d), SLAB_Y + PORCH.h] as Box);
    for (const u of binsOf(h)) out.push([...rectOf(T, u, u + BIN.w, BIN_OFF, BIN_OFF + BIN.d), SLAB_Y + BIN.h] as Box);
  }
  for (const [a, c] of fencesOf(T)) out.push(lineBox(a, c, FENCE.t, SLAB_Y + FENCE.h));
  return out;
});
