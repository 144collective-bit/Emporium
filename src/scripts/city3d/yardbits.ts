/*
 * The Trenches' streets and yards, filled in (docs/trenches-variety-plan.md Phase 5; DOM-free, tested in
 * tests/yardbits.test.ts): the bare concrete of the projects' yards given what a lived-in yard has, and utility poles
 * with their wires along the yards' street edges. Drawn by grit3d.ts (in each yard's site), nothing of it solid.
 *
 * - `YARD_BITS`: benches with a bin beside them, bike racks and planter boxes, each on a grid over the yard where it's
 *   clear of everything the grit keeps clear (grit.ts `taken()`: the towers, their ways in, the amenities, the bays,
 *   the street walls), the worn grass and dirt, the trees, the dumpsters and each other, each seeded and facing the
 *   nearest tower's door.
 * - `STREET_POLES` and `POLE_WIRES`: a wooden pole every so often just inside a yard's street edge (the lamps stand on
 *   the sidewalk outside it), only where nothing's built along that edge and clear of
 *   the towers, their stoops and ways in (`taken()`) and the trees; wires between two poles
 *   only when they're near each other and nothing built stands between, so no wire runs across a tenement's or a tower's front.
 */
import type { Pt, Rect } from './downtown';
import { DUMPSTERS, PATCHES, YARDS, YARD_TREES, taken } from './grit';
import { TOWERS } from './projects';
import { overlaps } from './commons';
import { built } from './streetwall';
import { rng } from './recipes';

export type BitKind = 'bench' | 'rack' | 'planter';
export interface YardBit {
  block: string;
  kind: BitKind;
  x: number;
  z: number;
  /** Its facing (ry, 0 is +z): towards the nearest tower's door */
  ry: number;
}
/** How far apart the grid's spots are, and how far in from the yard's edge they start */
export const BIT_GRID = 3.2;
export const BIT_EDGE = 2.2;
/** Each bit's footprint's half size (the bench with its bin, the rack, the planter), for keeping clear */
export const BIT_HALF = 0.9;

const bounds = (poly: Pt[]): Rect => [Math.min(...poly.map((p) => p[0])), Math.min(...poly.map((p) => p[1])), Math.max(...poly.map((p) => p[0])), Math.max(...poly.map((p) => p[1]))];
const grow = ([x0, z0, x1, z1]: Rect, m: number): Rect => [x0 - m, z0 - m, x1 + m, z1 + m];
const boxAt = (x: number, z: number, h: number): Rect => [x - h, z - h, x + h, z + h];

export const YARD_BITS: YardBit[] = YARDS.flatMap((blk, bi) => {
  const b = bounds(blk.poly);
  const r = rng(12100 + bi * 23);
  const keep: Rect[] = [
    ...taken(blk.id),
    ...PATCHES.filter((p) => p.block === blk.id).map((p) => grow(p.rect, 0.3)),
    ...YARD_TREES.filter((t) => t.block === blk.id).map((t) => boxAt(t.x, t.z, 1)),
    ...DUMPSTERS.map((d) => grow(d.rect, 0.8)),
  ];
  const doors = TOWERS.filter((t) => t.block === blk.id).map((t) => t.door);
  const out: YardBit[] = [];
  for (let x = b[0] + BIT_EDGE; x <= b[2] - BIT_EDGE; x += BIT_GRID)
    for (let z = b[1] + BIT_EDGE; z <= b[3] - BIT_EDGE; z += BIT_GRID) {
      const u = r();
      // (about one spot in five left as it is: a yard isn't furnished edge to edge)
      if (u < 0.2) continue;
      if (keep.some((k) => overlaps(k, boxAt(x, z, BIT_HALF)))) continue;
      const kind: BitKind = u < 0.62 ? 'bench' : u < 0.8 ? 'rack' : 'planter';
      const d = doors.reduce<{ x: number; z: number } | null>((a, p) => (!a || Math.hypot(p.x - x, p.z - z) < Math.hypot(a.x - x, a.z - z) ? p : a), null);
      // (a quarter turn at a time, towards the door)
      const raw = d ? Math.atan2(d.x - x, d.z - z) : 0;
      out.push({ block: blk.id, kind, x, z, ry: Math.round(raw / (Math.PI / 2)) * (Math.PI / 2) });
    }
  return out;
});

/** A pole's height, where its cross arm is, its radius; how far in from a yard's street edge it stands */
export const POLE = { h: 4.4, arm: 4.05, r: 0.13, in: 0.35 };
/** How far apart the poles go along an edge, how near a tree they may be, and the longest a wire runs */
export const POLE_GAP = 11;
export const POLE_TREE = 1.1;
export const WIRE_MAX = 16;
/** How far along its edge a pole may slide off its spot to find clear ground */
export const POLE_SLIDE = 3;

export interface StreetPole {
  block: string;
  x: number;
  z: number;
  /** Along x (its cross arm along the edge) or along z */
  alongX: boolean;
  /** Which edge (0 north, 1 south, 2 west, 3 east) and how far along it, to join wires along an edge in order */
  edge: number;
  at: number;
}
export const STREET_POLES: StreetPole[] = YARDS.flatMap((blk) => {
  const b = bounds(blk.poly);
  const builtHere = [...built(blk.id), ...taken(blk.id)].map((q) => grow(q, 0.5));
  const trees = YARD_TREES.filter((t) => t.block === blk.id);
  const out: StreetPole[] = [];
  const edges: [Pt, Pt, boolean][] = [
    [[b[0] + 3, b[1] + POLE.in], [b[2] - 3, b[1] + POLE.in], true],
    [[b[0] + 3, b[3] - POLE.in], [b[2] - 3, b[3] - POLE.in], true],
    [[b[0] + POLE.in, b[1] + 3], [b[0] + POLE.in, b[3] - 3], false],
    [[b[2] - POLE.in, b[1] + 3], [b[2] - POLE.in, b[3] - 3], false],
  ];
  edges.forEach(([p, q, alongX], edge) => {
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const n = Math.max(1, Math.round(len / POLE_GAP));
    const clear = (x: number, z: number) => !builtHere.some((k) => overlaps(k, boxAt(x, z, POLE.r))) && !trees.some((t) => Math.hypot(t.x - x, t.z - z) < POLE_TREE);
    for (let i = 0; i <= n; i++) {
      // (a pole whose spot is taken slides along the edge, up to POLE_SLIDE either way, to the nearest clear spot)
      const at = [0, 1, -1, 2, -2, 3, -3].map((d) => (len * i) / n + (d * POLE_SLIDE) / 3).find((a) => {
        if (a < 0 || a > len) return false;
        return clear(p[0] + ((q[0] - p[0]) * a) / len, p[1] + ((q[1] - p[1]) * a) / len);
      });
      if (at === undefined) continue;
      out.push({ block: blk.id, x: p[0] + ((q[0] - p[0]) * at) / len, z: p[1] + ((q[1] - p[1]) * at) / len, alongX, edge, at });
    }
  });
  return out;
});

/** The wires: between two poles next to each other along an edge, near enough, with nothing built between */
export const POLE_WIRES: [Pt, Pt][] = YARDS.flatMap((blk) => {
  const builtHere = [...built(blk.id), ...TOWERS.filter((t) => t.block === blk.id).flatMap((t) => t.parts.map((q) => q.rect))];
  const mine = STREET_POLES.filter((p) => p.block === blk.id);
  const out: [Pt, Pt][] = [];
  for (let e = 0; e < 4; e++) {
    const line = mine.filter((p) => p.edge === e).sort((a, c) => a.at - c.at);
    for (let i = 1; i < line.length; i++) {
      const [a, c] = [line[i - 1], line[i]];
      if (Math.hypot(c.x - a.x, c.z - a.z) > WIRE_MAX) continue;
      const span: Rect = [Math.min(a.x, c.x) - 0.05, Math.min(a.z, c.z) - 0.05, Math.max(a.x, c.x) + 0.05, Math.max(a.z, c.z) + 0.05];
      if (builtHere.some((k) => overlaps(k, span))) continue;
      out.push([
        [a.x, a.z],
        [c.x, c.z],
      ]);
    }
  }
  return out;
});
