/**
 * The estate's sitting-out squares (docs/flats-plan.md Phase 5, the owner's pick "Courtyards"): on the bare paving round
 * Linnet, Marten and Wren Courts, a few small squares, each a raised round planter with grass and a tree in it, two
 * benches facing it, a bin and a lamp; worn grass where the planter's edge is sat on. DOM-free, the chunk's
 * (southblocks3d.ts draws them; tests/southsquares.test.ts); their solids join the grids when the chunk loads.
 *
 * Placed, not drawn by hand: the roomiest spots on the paving within reach of the three slabs, a whole square's reach
 * clear of the blocks, cores, stair cages, bridges' piers, the streets and their sidewalks, the parking courts, the
 * grass, the play area and the yard's things, and well apart.
 */
import { BLOCKS, BRIDGES, CAGES, CAGE, COURTS, GRASS, PIERS, PLAY, inBlock, type Pt } from './southblocks';
import { BIKE_SHEDS, BIN_STORES, DECK_COLUMNS } from './southyard';
import { PLAN, distToStreet } from './streetplan';
import { distTo, inside } from './streetfaces';

type Box = [number, number, number, number, number];

export const SQUARE = {
  /** The planter's radius and height; how far out the benches, the bin and the lamp stand from its middle */
  planter: 1.4,
  planterH: 0.45,
  bench: 2.5,
  bin: 2.4,
  lamp: 2.7,
  /** The whole square's reach (kept clear), and how far apart two squares keep */
  reach: 3.6,
  apart: 14,
  lampH: 3.2,
} as const;

export interface Square {
  at: Pt;
  /** The benches (facing the planter), the bin, the lamp */
  benches: { x: number; z: number; yaw: number }[];
  bin: Pt;
  lamp: Pt;
}

const SLABS = BLOCKS.filter((b) => ['linnet', 'marten', 'wren'].includes(b.id));
const STREETS = PLAN.streets;
const cageFoot = (c: (typeof CAGES)[number]): Pt[] => [c.at(0, -CAGE.half), c.at(CAGE.len, -CAGE.half), c.at(CAGE.len, CAGE.half), c.at(0, CAGE.half)];
/** Is a point clear of everything a square must keep off, by `m` */
export function clearOf(p: Pt, m: number) {
  return (
    !inBlock(p, m + 1.5) &&
    CAGES.every((c) => !inside(cageFoot(c), p) && distTo(cageFoot(c), p, true) > m + 1) &&
    PIERS.every((q) => Math.hypot(q.at[0] - p[0], q.at[1] - p[1]) > m + 1) &&
    BRIDGES.every((br) => distTo(br.pts, p) > m) &&
    STREETS.every((s) => distToStreet(s, p) - s.half - 1.2 > m) &&
    COURTS.every((c) => !inside(c.poly, p) && distTo(c.poly, p, true) > m) &&
    GRASS.every((g) => !inside(g, p) && distTo(g, p, true) > m) &&
    !inside(PLAY, p) &&
    distTo(PLAY, p, true) > m &&
    [...BIN_STORES, ...BIKE_SHEDS].every((t) => Math.hypot(t.at[0] - p[0], t.at[1] - p[1]) > m + 2) &&
    DECK_COLUMNS.every(([x, z]) => Math.hypot(x - p[0], z - p[1]) > m)
  );
}

export const SQUARES: Square[] = (() => {
  const near = (p: Pt) => SLABS.some((b) => b.foot.some((_, i) => distTo([b.foot[i], b.foot[(i + 1) % b.foot.length]], p) < 16));
  const pts = SLABS.flatMap((b) => b.foot);
  const [x0, x1] = [Math.min(...pts.map((p) => p[0])) - 16, Math.max(...pts.map((p) => p[0])) + 16];
  const [z0, z1] = [Math.min(...pts.map((p) => p[1])) - 16, Math.max(...pts.map((p) => p[1])) + 16];
  const spots: { p: Pt; room: number }[] = [];
  for (let x = x0; x <= x1; x += 1)
    for (let z = z0; z <= z1; z += 1) {
      const p: Pt = [x, z];
      if (!near(p) || !clearOf(p, SQUARE.reach)) continue;
      // (how much more room it has: the most margin it keeps, up to 3 more)
      let room = 0;
      while (room < 3 && clearOf(p, SQUARE.reach + room + 0.5)) room += 0.5;
      spots.push({ p, room });
    }
  spots.sort((a, b) => b.room - a.room || a.p[0] - b.p[0] || a.p[1] - b.p[1]);
  const out: Square[] = [];
  for (const { p } of spots) {
    if (out.length >= 5 || out.some((s) => Math.hypot(s.at[0] - p[0], s.at[1] - p[1]) < SQUARE.apart)) continue;
    // (facing the nearest slab: the benches either side, the lamp on the slab's side, the bin by a bench)
    const b = SLABS.slice().sort((a, c) => distTo(a.foot, p, true) - distTo(c.foot, p, true))[0];
    const cx = b.foot.reduce((s, q) => s + q[0], 0) / b.foot.length;
    const cz = b.foot.reduce((s, q) => s + q[1], 0) / b.foot.length;
    const d = Math.hypot(cx - p[0], cz - p[1]) || 1;
    const to: Pt = [(cx - p[0]) / d, (cz - p[1]) / d];
    const side: Pt = [-to[1], to[0]];
    const at = (r: number, dir: Pt): Pt => [p[0] + dir[0] * r, p[1] + dir[1] * r];
    const benches = [side, [-side[0], -side[1]] as Pt].map((dir) => {
      const q = at(SQUARE.bench, dir);
      // (facing in: its front towards the planter)
      return { x: q[0], z: q[1], yaw: Math.atan2(-dir[0], -dir[1]) };
    });
    const bin = at(SQUARE.bin, [(side[0] - to[0]) * Math.SQRT1_2, (side[1] - to[1]) * Math.SQRT1_2]);
    out.push({ at: p, benches, bin, lamp: at(SQUARE.lamp, to) });
  }
  return out;
})();

/** What's solid: the planters, the benches, the bins, the lamps' posts */
export const SQUARE_SOLIDS: Box[] = SQUARES.flatMap((s): Box[] => [
  [s.at[0] - SQUARE.planter * 0.85, s.at[1] - SQUARE.planter * 0.85, s.at[0] + SQUARE.planter * 0.85, s.at[1] + SQUARE.planter * 0.85, SQUARE.planterH],
  ...s.benches.map((b): Box => [b.x - 0.7, b.z - 0.7, b.x + 0.7, b.z + 0.7, 0.8]),
  [s.bin[0] - 0.25, s.bin[1] - 0.25, s.bin[0] + 0.25, s.bin[1] + 0.25, 0.9],
  [s.lamp[0] - 0.1, s.lamp[1] - 0.1, s.lamp[0] + 0.1, s.lamp[1] + 0.1, SQUARE.lampH],
]);
