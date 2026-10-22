/*
 * The Trenches' communal areas (the redesign's step B, the owner's call;
 * DOM-free, tested in tests/commons.test.ts): what's on the lawns round the
 * Trench Houses (projects.ts) besides the towers.
 *
 * - **Amenities** (`AMENITIES`): each block of the projects its own mix
 *   (`MIX`) of playgrounds, basketball half-courts, a soccer cage, a skate
 *   spot, a community garden with BBQs and picnic tables, chess tables and
 *   washing lines, each placed on the open lawn: clear of the towers (their
 *   stoops and scaffolding), of the way from every door to the street, and of
 *   each other, the first spot that fits looking out from the lawn's middle.
 * - **The rec block** (`REC`): the block east of The Block: the rec centre,
 *   a laundromat, a pavilion with BBQs and picnic tables, and a big lawn.
 * - **Parking bays** (`BAYS`): lay-bys behind the sidewalk on the projects'
 *   street sides, clear of the doors' ways out, with cars parked in some
 *   (`BAY_CARS`), so nothing parks in the traffic lanes.
 * - **Edges** (`EDGES`): low iron railings or hedges round each lawn, open
 *   at every way in; fire hydrants (`HYDRANTS`) on the sidewalk corners.
 *
 * Everything here is scenery: nothing to do yet. What's solid
 * (`COMMONS_SOLIDS`: the cage's and courts' fences, ramps, grills, the
 * buildings, the pavilion's posts, the parked cars) joins SOLIDS.
 */
import type { Face, Footprint, Pt, Rect } from './downtown';
import { TOWERS, type Tower } from './projects';
import { TRENCH_BLOCKS } from './trenches';
import { WALK_W } from './layout';
import { rng } from './recipes';

export type AmenityKind = 'playground' | 'halfcourt' | 'soccer' | 'skate' | 'garden' | 'chess' | 'washing';
/** Each kind's size (w along x before turning, d along z) */
export const AMENITY_SIZE: Record<AmenityKind, [number, number]> = {
  playground: [7, 6],
  halfcourt: [7.5, 7.2],
  soccer: [13, 8.5],
  skate: [9, 6.5],
  garden: [9, 6],
  chess: [4.5, 3.5],
  washing: [5.5, 2.5],
};
export const AMENITY_KINDS = Object.keys(AMENITY_SIZE) as AmenityKind[];
/** What each block of the projects gets, in the order they're placed (no two blocks alike) */
export const MIX: Record<string, AmenityKind[]> = {
  'trench-b0-0': ['playground', 'garden', 'washing'],
  'trench-b0-1': ['halfcourt', 'chess', 'washing'],
  'trench-b0-4': ['skate', 'playground'],
  'trench-b1-0': ['soccer', 'garden', 'washing'],
  'trench-b1-1': ['playground', 'halfcourt', 'chess'],
  'trench-b1-2': ['playground', 'chess', 'washing'],
  'trench-b1-3': ['halfcourt', 'garden', 'chess'],
  'trench-b1-4': ['playground', 'garden'],
  'trench-b2-0': ['soccer', 'chess'],
  'trench-b2-1': ['skate', 'garden', 'playground', 'washing'],
  'trench-b2-2': ['halfcourt', 'playground', 'washing'],
  'trench-b2-3': ['garden', 'playground', 'chess'],
  'trench-b2-4': ['halfcourt', 'washing'],
};
export interface Amenity {
  id: string;
  kind: AmenityKind;
  block: string;
  rect: Rect;
  /** Turned a quarter (its long side along z) */
  turned: boolean;
  /** The side of it that opens onto the lawn's nearest edge (its gate, the path out) */
  opens: Face;
}

const bounds = (poly: Pt[]): Rect => [Math.min(...poly.map((p) => p[0])), Math.min(...poly.map((p) => p[1])), Math.max(...poly.map((p) => p[0])), Math.max(...poly.map((p) => p[1]))];
const grow = ([x0, z0, x1, z1]: Rect, m: number): Rect => [x0 - m, z0 - m, x1 + m, z1 + m];
export const overlaps = (a: Rect, b: Rect) => Math.min(a[2], b[2]) - Math.max(a[0], b[0]) > 1e-6 && Math.min(a[3], b[3]) - Math.max(a[1], b[1]) > 1e-6;
const FACE_OUT: Record<Face, Pt> = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] };

/** Everything a tower puts on its lawn: its parts, stoops and scaffolding */
export const towerRects = (t: Tower): Rect[] => [...t.parts.map((p) => p.rect), ...t.stoops, ...(t.scaffold ? [t.scaffold] : [])];
/** The way from a tower's door straight out to its block's edge, a path's width (kept clear) */
export function doorWay(t: Tower, blk: Rect, half = 1.3): Rect {
  const { x, z, face } = t.door;
  const [x0, z0, x1, z1] = blk;
  return face === 'n' ? [x - half, z0, x + half, z] : face === 's' ? [x - half, z, x + half, z1] : face === 'w' ? [x0, z - half, x, z + half] : [x, z - half, x1, z + half];
}
/** The way from a rectangle on a lawn out to the block's edge on one side, a path's width */
function wayOut([x0, z0, x1, z1]: Rect, f: Face, b: Rect, half: number): Rect {
  const [mx, mz] = [(x0 + x1) / 2, (z0 + z1) / 2];
  return f === 'n' ? [mx - half, b[1], mx + half, z0] : f === 's' ? [mx - half, z1, mx + half, b[3]] : f === 'w' ? [b[0], mz - half, x0, mz + half] : [x1, mz - half, b[2], mz + half];
}
/** Clear room round towers and between things on the lawn */
const ROOM = 1.2;
const EDGE = 1.2;

/** The rec block (east of The Block): its buildings and the pavilion, in world numbers */
const REC_BLOCK = TRENCH_BLOCKS.find((b) => b.id === 'trench-b0-3')!;
const [RX0, RZ0, RX1, RZ1] = bounds(REC_BLOCK.poly);
export const REC = {
  block: REC_BLOCK.id,
  rect: [RX0, RZ0, RX1, RZ1] as Rect,
  /** The rec centre: two storeys, its doors on the south side (a glass entrance hall in the middle) */
  centre: [RX0 + 3, RZ0 + 3, RX0 + 21, RZ0 + 13] as Rect,
  centreH: 3.6,
  /** The laundromat: one storey, its door on the south side */
  laundry: [RX0 + 24, RZ0 + 3, RX0 + 31, RZ0 + 10] as Rect,
  laundryH: 2.0,
  /** The pavilion: a roof on posts over picnic tables and BBQs */
  pavilion: [RX0 + 6, RZ0 + 22, RX0 + 19, RZ0 + 30] as Rect,
  pavilionH: 2.4,
  /** A path from the street (Trench Avenue, north) past the doors to the pavilion */
  path: [RX0 + 21.5, RZ0, RX0 + 23.5, RZ1] as Rect,
};
/** The rec block's doors (world), out on the path side of each building */
export const REC_DOORS = {
  centre: { x: (REC.centre[0] + REC.centre[2]) / 2, z: REC.centre[3] + 0.3 },
  laundry: { x: (REC.laundry[0] + REC.laundry[2]) / 2, z: REC.laundry[3] + 0.3 },
};

/** The amenities, block by block */
export const AMENITIES: Amenity[] = (() => {
  const out: Amenity[] = [];
  for (const blk of TRENCH_BLOCKS) {
    const mix = MIX[blk.id];
    if (!mix) continue;
    const b = bounds(blk.poly);
    const towers = TOWERS.filter((t) => t.block === blk.id);
    const keep: Rect[] = [...towers.flatMap(towerRects).map((r) => grow(r, ROOM)), ...towers.map((t) => doorWay(t, b))];
    const [cx, cz] = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
    // Spots to try, nearest the lawn's middle first
    const spots: Pt[] = [];
    for (let x = b[0] + EDGE; x < b[2] - EDGE; x += 0.5) for (let z = b[1] + EDGE; z < b[3] - EDGE; z += 0.5) spots.push([x, z]);
    spots.sort((p, q) => Math.hypot(p[0] - cx, p[1] - cz) - Math.hypot(q[0] - cx, q[1] - cz));
    mix.forEach((kind, i) => {
      const [w, d] = AMENITY_SIZE[kind];
      for (const turned of [false, true]) {
        const [sw, sd] = turned ? [d, w] : [w, d];
        const solid = towers.flatMap(towerRects);
        // It opens towards the nearest edge its way out to it is clear to (past no tower, no other amenity)
        const opening = (rect: Rect): Face | null => {
          const gaps: [Face, number][] = [
            ['n', rect[1] - b[1]],
            ['s', b[3] - rect[3]],
            ['w', rect[0] - b[0]],
            ['e', b[2] - rect[2]],
          ];
          gaps.sort((p, q) => p[1] - q[1]);
          const ok = gaps.find(([f]) => {
            const way = wayOut(rect, f, b, 1);
            return !solid.some((k) => overlaps(k, way)) && !out.some((o) => o.block === blk.id && overlaps(o.rect, way));
          });
          return ok ? ok[0] : null;
        };
        let opens: Face | null = null;
        const at = spots.find(([x, z]) => {
          const r: Rect = [x - sw / 2, z - sd / 2, x + sw / 2, z + sd / 2];
          if (r[0] < b[0] + EDGE || r[1] < b[1] + EDGE || r[2] > b[2] - EDGE || r[3] > b[3] - EDGE) return false;
          if (keep.some((k) => overlaps(k, r)) || out.some((o) => o.block === blk.id && (overlaps(grow(o.rect, 1), r) || overlaps(amenityWay(o), r)))) return false;
          opens = opening(r);
          return opens !== null;
        });
        if (!at || !opens) continue;
        const rect: Rect = [at[0] - sw / 2, at[1] - sd / 2, at[0] + sw / 2, at[1] + sd / 2];
        out.push({ id: `${blk.id}:${i}`, kind, block: blk.id, rect, turned, opens });
        return;
      }
    });
  }
  return out;
})();
/** The way from an amenity out to its block's edge (a path; kept clear of bays and railings) */
export function amenityWay(a: Amenity, half = 1): Rect {
  return wayOut(a.rect, a.opens, bounds(TRENCH_BLOCKS.find((o) => o.id === a.block)!.poly), half);
}

/* ---------- Parking bays ---------- */

/** A bay: a strip behind the sidewalk along one side of a block, the cars in it parked along it */
export interface Bay {
  id: string;
  block: string;
  rect: Rect;
  face: Face;
}
export const BAY_DEPTH = 2;
/** A space: this long, a car parked in each */
export const SPACE = 3.4;

/** Every block of the projects' ways in (doors, amenities, the rec block's path) */
function waysIn(block: string): Rect[] {
  const blk = TRENCH_BLOCKS.find((o) => o.id === block)!;
  const b = bounds(blk.poly);
  return [...TOWERS.filter((t) => t.block === block).map((t) => doorWay(t, b, 1.6)), ...AMENITIES.filter((a) => a.block === block).map((a) => amenityWay(a, 1.4)), ...(block === REC.block ? [REC.path] : [])];
}
/** What else stands near a block's edge (towers and their bits, amenities, the rec block's buildings) */
function standing(block: string): Rect[] {
  return [
    ...TOWERS.filter((t) => t.block === block).flatMap(towerRects),
    ...AMENITIES.filter((a) => a.block === block).map((a) => a.rect),
    ...(block === REC.block ? [REC.centre, REC.laundry, REC.pavilion] : []),
  ].map((r) => grow(r, 0.8));
}

export const BAYS: Bay[] = (() => {
  const out: Bay[] = [];
  for (const blk of TRENCH_BLOCKS) {
    if (blk.row !== 'B' || blk.id === 'trench-b0-2') continue;
    const b = bounds(blk.poly);
    const keep = [...waysIn(blk.id), ...standing(blk.id)];
    // Its two longest clear runs along the east-west and north-south streets (not the avenue: its traffic is fast)
    const sides: { face: Face; strip: (a0: number, a1: number) => Rect; a0: number; a1: number }[] = [
      { face: 's', strip: (a0, a1) => [a0, b[3] - BAY_DEPTH, a1, b[3]], a0: b[0], a1: b[2] },
      { face: 'w', strip: (a0, a1) => [b[0], a0, b[0] + BAY_DEPTH, a1], a0: b[1], a1: b[3] },
      { face: 'e', strip: (a0, a1) => [b[2] - BAY_DEPTH, a0, b[2], a1], a0: b[1], a1: b[3] },
      { face: 'n', strip: (a0, a1) => [a0, b[1], a1, b[1] + BAY_DEPTH], a0: b[0], a1: b[2] },
    ];
    const runs: Bay[] = [];
    for (const s of sides) {
      if (s.face === 'n' && blk.id.startsWith('trench-b0-')) continue;
      let start: number | null = null;
      const close = (end: number) => {
        if (start === null) return;
        const n = Math.floor((end - start) / SPACE);
        if (n >= 2) {
          const used = Math.min(n, 4) * SPACE;
          const a0 = start + (end - start - used) / 2;
          runs.push({ id: `${blk.id}:${s.face}`, block: blk.id, rect: s.strip(a0, a0 + used), face: s.face });
        }
        start = null;
      };
      // Walk along the side, half a tile at a time, from a corner's room to the next
      for (let a = s.a0 + 3; a <= s.a1 - 3; a += 0.5) {
        const free = !keep.some((k) => overlaps(k, s.strip(a, a + 0.5)));
        if (free && start === null) start = a;
        if (!free) close(a);
      }
      close(s.a1 - 3);
    }
    // The two longest, on different sides
    runs.sort((p, q) => q.rect[2] - q.rect[0] + q.rect[3] - q.rect[1] - (p.rect[2] - p.rect[0] + p.rect[3] - p.rect[1]));
    const pick: Bay[] = [];
    for (const r of runs) if (pick.length < 2 && !pick.some((p) => p.face === r.face)) pick.push(r);
    pick.forEach((p, i) => out.push({ ...p, id: `${p.id}:${i}` }));
  }
  return out;
})();
/** The cars parked in the bays: model, x, z, heading (cars.ts's yaw), colour; about two spaces in three taken */
export const BAY_CARS: { bay: string; car: [string, number, number, number, string] }[] = (() => {
  const models = ['hatch', 'sedan', 'pickup', 'van', 'coupe'];
  const colours = ['#e23b3b', '#2aabee', '#ffd23f', '#f3f2f7', '#8000ff', '#1fbf6b', '#ff8a3d', '#2b2d3a', '#7a5a3c'];
  const out: { bay: string; car: [string, number, number, number, string] }[] = [];
  const r = rng(4242);
  for (const bay of BAYS) {
    const alongX = bay.face === 'n' || bay.face === 's';
    const [x0, z0, x1, z1] = bay.rect;
    const n = Math.round((alongX ? x1 - x0 : z1 - z0) / SPACE);
    for (let i = 0; i < n; i++) {
      if (r() > 0.68) continue;
      const a = (alongX ? x0 : z0) + (i + 0.5) * SPACE;
      const [x, z] = alongX ? [a, (z0 + z1) / 2] : [(x0 + x1) / 2, a];
      // Parked along the street, either way
      const yaw = (alongX ? 0 : -Math.PI / 2) + (r() < 0.5 ? Math.PI : 0);
      out.push({ bay: bay.id, car: [models[Math.floor(r() * models.length)], x, z, yaw, colours[Math.floor(r() * colours.length)]] });
    }
  }
  return out;
})();
/** A parked car's footprint, half its length and width (the longest model) */
export const CAR_HALF = { l: 1.5, w: 0.6 };

/* ---------- The lawns' edges ---------- */

/** A run of railing or hedge along a lawn's edge, a little in from it */
export interface EdgeRun {
  block: string;
  a: Pt;
  c: Pt;
  kind: 'rail' | 'hedge';
}
export const EDGE_IN = 0.3;
export const EDGES: EdgeRun[] = (() => {
  const out: EdgeRun[] = [];
  TRENCH_BLOCKS.forEach((blk, bi) => {
    if (blk.row !== 'B' || blk.id === 'trench-b0-2') return;
    const b = bounds(blk.poly);
    const kind: EdgeRun['kind'] = bi % 3 === 1 ? 'hedge' : 'rail';
    const gaps = [...waysIn(blk.id), ...BAYS.filter((y) => y.block === blk.id).map((y) => grow(y.rect, 0.3)), ...standing(blk.id)];
    const i = EDGE_IN;
    const lines: [Pt, Pt][] = [
      [[b[0] + i, b[1] + i], [b[2] - i, b[1] + i]],
      [[b[0] + i, b[3] - i], [b[2] - i, b[3] - i]],
      [[b[0] + i, b[1] + i], [b[0] + i, b[3] - i]],
      [[b[2] - i, b[1] + i], [b[2] - i, b[3] - i]],
    ];
    for (const [p, q] of lines) {
      const alongX = p[1] === q[1];
      const [a0, a1] = alongX ? [p[0], q[0]] : [p[1], q[1]];
      const probe = (a: number): Rect => (alongX ? [a, p[1] - 0.05, a + 0.5, p[1] + 0.05] : [p[0] - 0.05, a, p[0] + 0.05, a + 0.5]);
      let start: number | null = null;
      const close = (end: number) => {
        if (start !== null && end - start >= 1) out.push({ block: blk.id, a: alongX ? [start, p[1]] : [p[0], start], c: alongX ? [end, p[1]] : [p[0], end], kind });
        start = null;
      };
      for (let a = a0; a < a1 - 1e-6; a += 0.5) {
        const free = !gaps.some((g) => overlaps(g, probe(a)));
        if (free && start === null) start = a;
        if (!free) close(a);
      }
      close(a1);
    }
  });
  return out;
})();

/** Fire hydrants: on the sidewalk at each projects block's corners */
export const HYDRANTS: Pt[] = TRENCH_BLOCKS.filter((b) => b.row === 'B').flatMap((blk) => {
  const [x0, z0, x1, z1] = bounds(blk.poly);
  const o = WALK_W / 2;
  return [
    [x0 - o, z0 + 1.6],
    [x1 + o, z1 - 1.6],
  ] as Pt[];
});

/** Everything the commons take on a lawn (the amenities, their ways out, the bays): the projects' trees keep off it (projects3d.ts) */
export const commonsTaken = (block: string): Rect[] => [
  ...AMENITIES.filter((a) => a.block === block).flatMap((a) => [grow(a.rect, 1), amenityWay(a)]),
  ...BAYS.filter((y) => y.block === block).map((y) => grow(y.rect, 0.6)),
];

/* ---------- What's solid, and who's out there ---------- */

/** An amenity's solid parts (fences with their gates, ramps, grills, the washing lines' poles) */
export function amenitySolids(a: Amenity): Footprint[] {
  const [x0, z0, x1, z1] = a.rect;
  const t = 0.08;
  const fence = (h: number, gate: number): Footprint[] => {
    // Round the edge, a gate in the middle of the side it opens to
    const [mx, mz] = [(x0 + x1) / 2, (z0 + z1) / 2];
    const g = gate / 2;
    const sides: Footprint[] = [];
    const run = (f: Face, r: Rect) => {
      if (f !== a.opens) return void sides.push([...r, h]);
      if (f === 'n' || f === 's') sides.push([r[0], r[1], mx - g, r[3], h], [mx + g, r[1], r[2], r[3], h]);
      else sides.push([r[0], r[1], r[2], mz - g, h], [r[0], mz + g, r[2], r[3], h]);
    };
    run('n', [x0, z0, x1, z0 + t]);
    run('s', [x0, z1 - t, x1, z1]);
    run('w', [x0, z0, x0 + t, z1]);
    run('e', [x1 - t, z0, x1, z1]);
    return sides;
  };
  const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
  if (a.kind === 'soccer') return fence(2.6, 1.6);
  if (a.kind === 'halfcourt') return fence(2.2, 1.6);
  if (a.kind === 'skate') {
    // A quarter pipe at each end, a fun box in the middle
    const along = !a.turned;
    return along
      ? [
          [x0, z0 + 0.5, x0 + 1.6, z1 - 0.5, 0.9],
          [x1 - 1.6, z0 + 0.5, x1, z1 - 0.5, 0.9],
          [cx - 1.2, cz - 0.9, cx + 1.2, cz + 0.9, 0.45],
        ]
      : [
          [x0 + 0.5, z0, x1 - 0.5, z0 + 1.6, 0.9],
          [x0 + 0.5, z1 - 1.6, x1 - 0.5, z1, 0.9],
          [cx - 0.9, cz - 1.2, cx + 0.9, cz + 1.2, 0.45],
        ];
  }
  if (a.kind === 'garden') return gardenGrills(a).map(([x, z]): Footprint => [x - 0.3, z - 0.3, x + 0.3, z + 0.3, 0.9]);
  if (a.kind === 'washing') return washingPoles(a).map(([x, z]): Footprint => [x - 0.06, z - 0.06, x + 0.06, z + 0.06, 1.9]);
  return [];
}
/** A garden's two grills (world) */
export function gardenGrills(a: Amenity): Pt[] {
  const [x0, z0, x1, z1] = a.rect;
  return a.turned
    ? [
        [x1 - 1.2, z0 + 1.6],
        [x1 - 1.2, z1 - 1.6],
      ]
    : [
        [x0 + 1.6, z1 - 1.2],
        [x1 - 1.6, z1 - 1.2],
      ];
}
/** A washing line's poles (world): pairs along its length */
export function washingPoles(a: Amenity): Pt[] {
  const [x0, z0, x1, z1] = a.rect;
  return a.turned
    ? [
        [x0 + 0.5, z0 + 0.3],
        [x0 + 0.5, z1 - 0.3],
        [x1 - 0.5, z0 + 0.3],
        [x1 - 0.5, z1 - 0.3],
      ]
    : [
        [x0 + 0.3, z0 + 0.5],
        [x1 - 0.3, z0 + 0.5],
        [x0 + 0.3, z1 - 0.5],
        [x1 - 0.3, z1 - 0.5],
      ];
}
/** The pavilion's posts (world) */
export function pavilionPosts(): Pt[] {
  const [x0, z0, x1, z1] = REC.pavilion;
  const out: Pt[] = [];
  for (const x of [x0 + 0.2, (x0 + x1) / 2, x1 - 0.2]) for (const z of [z0 + 0.2, z1 - 0.2]) out.push([x, z]);
  return out;
}

export const COMMONS_SOLIDS: Footprint[] = [
  ...AMENITIES.flatMap(amenitySolids),
  [...REC.centre, REC.centreH + 0.3],
  [...REC.laundry, REC.laundryH + 0.25],
  ...pavilionPosts().map(([x, z]): Footprint => [x - 0.1, z - 0.1, x + 0.1, z + 0.1, REC.pavilionH]),
  ...BAY_CARS.map(({ car: [, x, z, yaw] }): Footprint => {
    const along = Math.abs(Math.cos(yaw)) > 0.5;
    const [hx, hz] = along ? [CAR_HALF.l, CAR_HALF.w] : [CAR_HALF.w, CAR_HALF.l];
    return [x - hx, z - hz, x + hx, z + hz, 1.2];
  }),
];

/** Who's out on the lawns: kids at play, neighbours at the grills and the chess tables, someone at the washing (x, z, facing, what they're doing, how big) */
export interface CommonsPerson {
  x: number;
  z: number;
  ry: number;
  act: 'look' | 'chat' | 'sit';
  /** Seat height over the slab, for sitters */
  seat?: number;
  kid?: boolean;
}
export function commonsPeople(low: boolean): CommonsPerson[] {
  const out: CommonsPerson[] = [];
  const r = rng(777);
  const face = (x: number, z: number, tx: number, tz: number) => Math.atan2(tx - x, tz - z);
  for (const a of AMENITIES) {
    const [x0, z0, x1, z1] = a.rect;
    const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
    const ring = (k: number, rad: number, kid: boolean, act: CommonsPerson['act']) => {
      for (let i = 0; i < k; i++) {
        const t = (i / k) * Math.PI * 2 + r() * 0.6;
        const [x, z] = [cx + Math.cos(t) * rad, cz + Math.sin(t) * rad];
        out.push({ x, z, ry: face(x, z, cx, cz), act, kid });
      }
    };
    if (a.kind === 'playground') ring(low ? 2 : 4, 2.2, true, 'look');
    else if (a.kind === 'halfcourt' || a.kind === 'soccer') ring(low ? 2 : a.kind === 'soccer' ? 6 : 3, a.kind === 'soccer' ? 3 : 2, true, 'look');
    else if (a.kind === 'skate') ring(low ? 1 : 3, 2.4, true, 'look');
    else if (a.kind === 'garden') {
      // Two at each grill, chatting
      for (const [gx, gz] of gardenGrills(a).slice(0, low ? 1 : 2)) out.push({ x: gx + 0.8, z: gz, ry: -Math.PI / 2, act: 'chat' }, { x: gx, z: gz + 0.8 * (gz < cz ? 1 : -1), ry: gz < cz ? Math.PI : 0, act: 'chat' });
    } else if (a.kind === 'chess') {
      for (const s of [-1, 1].slice(0, low ? 1 : 2) as number[]) out.push({ x: cx - 1.2 + s * 0.55, z: cz, ry: s < 0 ? Math.PI / 2 : -Math.PI / 2, act: 'sit', seat: 0.42 });
    } else if (a.kind === 'washing' && r() < 0.6) out.push({ x: cx, z: cz, ry: a.turned ? Math.PI / 2 : 0, act: 'look' });
  }
  // Under the pavilion and by the rec centre's doors
  const [px0, pz0, px1, pz1] = REC.pavilion;
  for (let i = 0; i < (low ? 2 : 5); i++) {
    const [x, z] = [px0 + 2 + ((px1 - px0 - 4) * i) / 4, (pz0 + pz1) / 2 + (i % 2 ? 1.1 : -1.1)];
    out.push({ x, z, ry: i % 2 ? Math.PI : 0, act: i % 3 === 2 ? 'chat' : 'sit', seat: i % 3 === 2 ? undefined : 0.42 });
  }
  out.push({ x: REC_DOORS.centre.x + 1.2, z: REC_DOORS.centre.z + 1.4, ry: Math.PI, act: 'chat' }, { x: REC_DOORS.centre.x + 1.9, z: REC_DOORS.centre.z + 1.0, ry: -Math.PI / 2, act: 'chat' });
  return out;
}
