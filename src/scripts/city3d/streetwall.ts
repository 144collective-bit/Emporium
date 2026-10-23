/*
 * The Trenches built up (the grit's step 2, the owner's call: "more built
 * up and have more buildings"; DOM-free, tested in tests/streetwall.test.ts),
 * drawn by streetwall3d.ts:
 *
 * - **The street walls** (`TENEMENTS`): 4-6 storey tenements, shops on the
 *   ground floor and a fire escape up the front, shoulder to shoulder along
 *   the projects' yards' street fronts wherever there's room, the towers
 *   behind. A row breaks at every way in (a tower's door, an amenity's way
 *   out, a bay, the rec block's path), keeps clear of the towers (light
 *   between) and never stands in front of a mural. They're the kits' shops
 *   (kits.ts, infill.ts), in brick, with made-up names (`TRENCH_SIGNS`).
 * - **Two vacant lots** (`VACANT`): gaps in the walls, fenced off, rubble,
 *   weeds and a billboard.
 * - **Low commercial** (`LOWRISE`): lock-up garages along Bottom Street,
 *   and on the strip between West Street and the highway (row W) an auto
 *   shop, a tyre place, a car wash, a scrap yard, a body shop and
 *   warehouses, signs with made-up names (`LOWRISE_NAMES`).
 * - **The yards' chain-link** (`EDGES`, moved here from commons.ts) runs
 *   only where no building stands.
 *
 * What's solid is `STREETWALL_SOLIDS` (in SOLIDS): the buildings, the
 * fences, the scrap yard's piles, the car wash's posts and brushes.
 */
import type { Face, Footprint, Pt, Rect, SignId } from './downtown';
import { AMENITIES, BAYS, REC, amenityWay, doorWay, overlaps, standing, waysIn } from './commons';
import { THE_BLOCK, TOWERS, towerShell } from './projects';
import { TRENCH_BLOCKS } from './trenches';
import { heightOf, lotSolids, type Lot } from './kits';
import { rng } from './recipes';

const bounds = (poly: Pt[]): Rect => [Math.min(...poly.map((p) => p[0])), Math.min(...poly.map((p) => p[1])), Math.max(...poly.map((p) => p[0])), Math.max(...poly.map((p) => p[1]))];
const grow = ([x0, z0, x1, z1]: Rect, m: number): Rect => [x0 - m, z0 - m, x1 + m, z1 + m];
const rectOf = (id: string) => bounds(TRENCH_BLOCKS.find((b) => b.id === id)!.poly);

/** The street walls' depth (the plot: the building and its front strip) */
export const WALL_DEPTH = 4.4;
/** Low commercial's depth along Bottom Street */
export const LOCKUP_DEPTH = 4.6;
/** How far a tenement keeps from a tower behind it */
export const BACK_CLEAR = 1.8;
/** The shops in the walls take these names in turn (made-up, SIGNS in downtown.ts) */
export const TRENCH_SIGNS: SignId[] = ['chicken', 'barber', 'nails', 'deli', 'laundry', 'phones', 'pizza', 'mart', 'tacos', 'noodles'];

/** The projects' yards (row B but The Block) */
const YARD_BLOCKS = TRENCH_BLOCKS.filter((b) => b.row === 'B' && b.id !== THE_BLOCK.block);

/** The strip in front of a mural (the towers along Trench Avenue carry one on their north wall, projects3d.ts): kept open */
function muralViews(block: string): Rect[] {
  const b = rectOf(block);
  if (!block.startsWith('trench-b0-')) return [];
  return TOWERS.filter((t) => t.block === block && t.door.face !== 'n').flatMap((t) => {
    const w = towerShell(t.parts)
      .walls.filter((o) => o.n[1] < -0.5 && o.y0 === 0 && Math.hypot(o.c[0] - o.a[0], o.c[1] - o.a[1]) >= 5)
      .sort((p, q) => p.a[1] - q.a[1])[0];
    return w ? [[Math.min(w.a[0], w.c[0]) - 1, b[1], Math.max(w.a[0], w.c[0]) + 1, w.a[1]] as Rect] : [];
  });
}
/** What a yard's street front must leave open: the towers (and the light round them), every way in, the bays, the amenities, the rec block's buildings and path, the murals */
function frontKeep(block: string): Rect[] {
  const b = rectOf(block);
  const towers = TOWERS.filter((t) => t.block === block);
  return [
    ...towers.flatMap((t) => t.parts.map((p) => grow(p.rect, BACK_CLEAR))),
    ...towers.flatMap((t) => [...t.stoops, ...(t.scaffold ? [t.scaffold] : [])]).map((r) => grow(r, 0.8)),
    ...towers.map((t) => doorWay(t, b, 1.7)),
    ...AMENITIES.filter((a) => a.block === block).flatMap((a) => [grow(a.rect, 1), amenityWay(a, 1.4)]),
    ...BAYS.filter((y) => y.block === block).map((y) => grow(y.rect, 0.4)),
    ...(block === REC.block ? [REC.centre, REC.laundry, REC.pavilion, REC.path].map((r) => grow(r, 1)) : []),
    ...muralViews(block),
  ];
}

/** A clear run along one side of a yard: from a0 to a1 along it, facing out of the block */
interface Run {
  block: string;
  face: Face;
  a0: number;
  a1: number;
  depth: number;
}
/** The plot along a side between a0 and a1, `depth` deep from the block's edge */
function plotOf(block: string, face: Face, a0: number, a1: number, depth: number): Rect {
  const b = rectOf(block);
  return face === 'n' ? [a0, b[1], a1, b[1] + depth] : face === 's' ? [a0, b[3] - depth, a1, b[3]] : face === 'w' ? [b[0], a0, b[0] + depth, a1] : [b[2] - depth, a0, b[2], a1];
}
/** Every yard's clear runs, side by side (north and south whole, west and east between them) */
function clearRuns(): Run[] {
  const out: Run[] = [];
  for (const blk of YARD_BLOCKS) {
    const b = bounds(blk.poly);
    const keep = frontKeep(blk.id);
    for (const face of ['n', 's', 'w', 'e'] as Face[]) {
      // Bottom Street's side of the yards along it is lock-ups (low), the rest the tenements' walls
      const depth = face === 's' && blk.id.startsWith('trench-b2-') ? LOCKUP_DEPTH : WALL_DEPTH;
      const alongX = face === 'n' || face === 's';
      const [s0, s1] = alongX ? [b[0], b[2]] : [b[1] + WALL_DEPTH, b[3] - WALL_DEPTH];
      let start: number | null = null;
      const close = (end: number) => {
        if (start !== null && end - start >= 3.1) out.push({ block: blk.id, face, a0: start, a1: end, depth });
        start = null;
      };
      for (let a = s0; a < s1 - 1e-6; a += 0.5) {
        const free = !keep.some((k) => overlaps(k, plotOf(blk.id, face, a, Math.min(s1, a + 0.5), depth)));
        if (free && start === null) start = a;
        if (!free) close(a);
      }
      close(s1);
    }
  }
  return out;
}
const RUNS = clearRuns();

/* ---------- The tenements and the vacant lots ---------- */

/** Widths across a run, each 3.1 to 5 (a short run's one lot up to 5.6), adding up to it */
function widths(len: number, r: () => number): number[] {
  let n = Math.max(1, Math.round(len / 3.9));
  if (len / n > 5) n++;
  if (n > 1 && len / n < 3.1) n--;
  const base = len / n;
  const out = Array.from({ length: n }, () => base);
  // Vary them a little in pairs, keeping the sum
  const amp = Math.max(0, Math.min(0.8, base - 3.1, 5 - base));
  for (let i = 0; i + 1 < n; i += 2) {
    const d = (r() - 0.5) * amp * 2;
    out[i] += d;
    out[i + 1] -= d;
  }
  return out;
}
const BRICKS: NonNullable<Lot['wall']>[] = ['brick', 'brick', 'brickDark', 'brick', 'brickTan', 'brownstone'];

/** A vacant lot in a wall: its plot, the side it faces */
export interface Vacant {
  id: string;
  block: string;
  rect: Rect;
  face: Face;
}
const LAID = (() => {
  const lots: (Lot & { block: string })[] = [];
  const r = rng(5150);
  let k = 0;
  for (const run of RUNS.filter((o) => o.depth === WALL_DEPTH)) {
    let a = run.a0;
    for (const w of widths(run.a1 - run.a0, r)) {
      const floors = 3 + Math.floor(r() * 3);
      const lot: Lot & { block: string } = {
        block: run.block,
        box: plotOf(run.block, run.face, a, a + w, WALL_DEPTH),
        h: heightOf('shop', floors),
        face: run.face,
        seed: 61000 + k,
        type: 'shop',
        floors,
        sign: TRENCH_SIGNS[k % TRENCH_SIGNS.length],
        front: 0.5,
        solids: [],
        escape: true,
        wall: BRICKS[Math.floor(r() * BRICKS.length)],
      };
      lot.solids = lotSolids(lot);
      lots.push(lot);
      a += w;
      k++;
    }
  }
  // Two of them left empty: a wide one in each of two blocks well apart, inside a longer wall (buildings either side)
  const touches = (a: Lot, c: Lot) => {
    const alongX = a.face === 'n' || a.face === 's';
    return a.face === c.face && (alongX ? Math.abs(a.box[2] - c.box[0]) < 1e-6 || Math.abs(a.box[0] - c.box[2]) < 1e-6 : Math.abs(a.box[3] - c.box[1]) < 1e-6 || Math.abs(a.box[1] - c.box[3]) < 1e-6) && overlaps(grow(a.box, 0.01), c.box);
  };
  const inside = lots.filter((l) => {
    const w = l.face === 'n' || l.face === 's' ? l.box[2] - l.box[0] : l.box[3] - l.box[1];
    return w >= 3.6 && lots.filter((o) => o !== l && o.block === l.block && touches(l, o)).length === 2;
  });
  const picks: (Lot & { block: string })[] = [];
  for (const l of inside) {
    if (picks.length >= 2) break;
    if (picks.some((p) => p.block === l.block || Math.hypot(p.box[0] - l.box[0], p.box[1] - l.box[1]) < 60)) continue;
    picks.push(l);
  }
  const vacant: Vacant[] = picks.map((l, i) => ({ id: `vacant-${i}`, block: l.block, rect: l.box, face: l.face }));
  return { tenements: lots.filter((l) => !picks.includes(l)), vacant };
})();
export const TENEMENTS: (Lot & { block: string })[] = LAID.tenements;
export const VACANT: Vacant[] = LAID.vacant;
/** A vacant lot's fence: along its street front and its back, how high */
export const VACANT_FENCE = 1.6;

/* ---------- Low commercial ---------- */

export type LowKind = 'lockups' | 'auto' | 'tyres' | 'carwash' | 'scrap' | 'body' | 'warehouse';
/** The signs, made-up names */
export const LOWRISE_NAMES: Record<Exclude<LowKind, 'lockups'>, string> = {
  auto: 'FAST LANE AUTO',
  tyres: 'TYRE TOWN',
  carwash: 'BUBBLES CAR WASH',
  scrap: 'TRENCH SCRAP & METAL',
  body: 'BODY WORKS',
  warehouse: 'STORAGE',
};
/** A low commercial lot: its plot, the side it faces, the building on it (if any), how high, the rest that's solid */
export interface LowLot {
  id: string;
  block: string;
  kind: LowKind;
  rect: Rect;
  face: Face;
  /** The building (or for the scrap yard its office; for the car wash its kiosk) */
  body: Rect;
  h: number;
  /** Everything else solid on it (fences, piles, posts, brushes) */
  extra: Footprint[];
}
/** A lot's frame: u along its front (left to right seen from the street), v back from the front */
export function lowFrame(l: { rect: Rect; face: Face }) {
  const [x0, z0, x1, z1] = l.rect;
  const alongX = l.face === 'n' || l.face === 's';
  const W = alongX ? x1 - x0 : z1 - z0;
  const D = alongX ? z1 - z0 : x1 - x0;
  /** A world point from (u, v) */
  const at = (u: number, v: number): Pt =>
    l.face === 's' ? [x0 + u, z1 - v] : l.face === 'n' ? [x1 - u, z0 + v] : l.face === 'e' ? [x1 - v, z1 - u] : [x0 + v, z0 + u];
  /** A world rectangle from (u0, v0, u1, v1) */
  const rect = (u0: number, v0: number, u1: number, v1: number): Rect => {
    const [p, q] = [at(u0, v0), at(u1, v1)];
    return [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1])];
  };
  return { W, D, at, rect };
}
/** A low lot's layout from its kind and plot */
function lowLot(id: string, block: string, kind: LowKind, rect: Rect, face: Face): LowLot {
  const F = lowFrame({ rect, face });
  const { W, D } = F;
  const extra: Footprint[] = [];
  let body: Rect;
  let h: number;
  if (kind === 'lockups') {
    body = F.rect(0, 1.2, W, D);
    h = 2.0;
  } else if (kind === 'auto' || kind === 'body') {
    // A workshop at the back, an apron in front
    body = F.rect(0, 3.2, W, D - 0.3);
    h = 2.6;
  } else if (kind === 'tyres') {
    body = F.rect(0.4, 2.6, W - 0.4, D - 0.3);
    h = 2.3;
    // Stacks of tyres either side of the door, against the front
    for (const u of [0.9, W - 0.9]) extra.push([...F.rect(u - 0.45, 1.6, u + 0.45, 2.5), 0.9]);
  } else if (kind === 'carwash') {
    // The kiosk at one side, the canopy's posts, the two brushes in the bay
    body = F.rect(W - 2.2, 1.5, W - 0.3, 3.3);
    h = 2.2;
    const bay = W - 2.6;
    for (const u of [0.3, bay - 0.1]) for (const v of [1.2, D - 0.8]) extra.push([...F.rect(u - 0.1, v - 0.1, u + 0.1, v + 0.1), 2.6]);
    for (const u of [0.9, bay - 0.7]) extra.push([...F.rect(u - 0.35, D / 2 - 0.35, u + 0.35, D / 2 + 0.35), 2.0]);
  } else if (kind === 'scrap') {
    // A yard behind a fence (the gate in the front), the office cabin by the gate, piles of crushed cars
    body = F.rect(W - 3.6, 0.6, W - 0.6, 2.8);
    h = 2.1;
    const t = 0.1;
    const gate: [number, number] = [W / 2 - 1.6, W / 2 + 1.6];
    extra.push([...F.rect(0, 0, gate[0], t), 2.2], [...F.rect(gate[1], 0, W, t), 2.2], [...F.rect(0, D - t, W, D), 2.2], [...F.rect(0, 0, t, D), 2.2], [...F.rect(W - t, 0, W, D), 2.2]);
    for (const [u, v] of [
      [2, D - 2.2],
      [W / 2, D - 2.2],
      [W - 2.4, D - 2.6],
      [2.2, D / 2 - 0.4],
    ] as Pt[])
      extra.push([...F.rect(u - 1.1, v - 0.8, u + 1.1, v + 0.8), 1.6]);
  } else {
    // A warehouse: the shed, a loading dock in front of its door
    body = F.rect(0.2, 2.2, W - 0.2, D - 0.3);
    h = 3.4;
    extra.push([...F.rect(W / 2 - 1.8, 1.4, W / 2 + 1.8, 2.2), 0.4]);
  }
  return { id, block, kind, rect, face, body, h, extra };
}
export const LOWRISE: LowLot[] = (() => {
  const out: LowLot[] = [];
  // Lock-ups along Bottom Street, wherever a yard leaves room
  RUNS.filter((o) => o.depth === LOCKUP_DEPTH).forEach((run, i) => out.push(lowLot(`lockups-${i}`, run.block, 'lockups', plotOf(run.block, run.face, run.a0, run.a1, LOCKUP_DEPTH), run.face)));
  // Row W: down the strip from the north, facing West Street, a gap between each
  const w = TRENCH_BLOCKS.find((b) => b.row === 'W')!;
  const [x0, z0, x1, z1] = bounds(w.poly);
  const depth = Math.min(10, x1 - x0 - 3);
  const order: [LowKind, number][] = [
    ['warehouse', 10],
    ['auto', 9],
    ['tyres', 7],
    ['carwash', 9],
    ['scrap', 16],
    ['body', 8],
    ['warehouse', 10],
    ['lockups', 9],
    ['warehouse', 10],
    ['auto', 8],
  ];
  let z = z0 + 1;
  order.forEach(([kind, len], i) => {
    if (z + len > z1 - 1) return;
    out.push(lowLot(`w-${i}-${kind}`, w.id, kind, [x1 - depth, z, x1, z + len], 'e'));
    z += len + 1.6;
  });
  return out;
})();
/** Cars at the low lots: nose in on the auto shops' and body shop's aprons, one in the car wash's bay (model, x, z, yaw, colour) */
export const LOW_CARS: [string, number, number, number, string][] = (() => {
  const out: [string, number, number, number, string][] = [];
  const models = ['hatch', 'sedan', 'pickup', 'coupe', 'van'];
  const colours = ['#e23b3b', '#2aabee', '#f3f2f7', '#2b2d3a', '#ffd23f', '#7a5a3c'];
  LOWRISE.forEach((l, i) => {
    if (l.kind !== 'auto' && l.kind !== 'body' && l.kind !== 'carwash') return;
    const F = lowFrame(l);
    const spots: [number, number][] = l.kind === 'carwash' ? [[(F.W - 2.6) / 2, F.D / 2]] : [[F.W * 0.3, 1.65], ...(F.W >= 8.5 ? [[F.W * 0.72, 1.65] as [number, number]] : [])];
    spots.forEach(([u, v], k) => {
      const [x, z] = F.at(u, v);
      // Nose in: along v, which runs across the street
      const alongX = l.face === 'e' || l.face === 'w';
      out.push([models[(i + k) % models.length], x, z, alongX ? (k % 2 ? 0 : Math.PI) : (k % 2 ? 1 : -1) * (Math.PI / 2), colours[(i * 2 + k) % colours.length]]);
    });
  });
  return out;
})();
/** A parked car's footprint, half its length and width */
const CAR = { l: 1.5, w: 0.6 };
export const carSolid = ([, x, z, yaw]: [string, number, number, number, string]): Footprint => {
  const along = Math.abs(Math.cos(yaw)) > 0.5;
  const [hx, hz] = along ? [CAR.l, CAR.w] : [CAR.w, CAR.l];
  return [x - hx, z - hz, x + hx, z + hz, 1.2];
};
/** Low lots' solids: the building (but the car wash's kiosk counts as one too) and the rest */
export const lowSolids = (l: LowLot): Footprint[] => [[...l.body, l.h + 0.2], ...l.extra];

/* ---------- The yards' chain-link (moved from commons.ts: it runs only where nothing's built) ---------- */

/** A run of chain-link (on its low kerb) along a yard's edge, a little in from it */
export interface EdgeRun {
  block: string;
  a: Pt;
  c: Pt;
}
/** How high the chain-link stands over its kerb */
export const EDGE_H = 1.1;
export const EDGE_IN = 0.3;
/** Everything built along a block's front (the walls, the vacant lots, the low lots) */
export const built = (block: string): Rect[] => [...TENEMENTS.filter((l) => l.block === block).map((l) => l.box), ...VACANT.filter((v) => v.block === block).map((v) => v.rect), ...LOWRISE.filter((l) => l.block === block).map((l) => l.rect)];
export const EDGES: EdgeRun[] = (() => {
  const out: EdgeRun[] = [];
  for (const blk of YARD_BLOCKS) {
    const b = bounds(blk.poly);
    const gaps = [...waysIn(blk.id), ...BAYS.filter((y) => y.block === blk.id).map((y) => grow(y.rect, 0.3)), ...standing(blk.id), ...built(blk.id).map((r) => grow(r, 0.3))];
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
        if (start !== null && end - start >= 1) out.push({ block: blk.id, a: alongX ? [start, p[1]] : [p[0], start], c: alongX ? [end, p[1]] : [p[0], end] });
        start = null;
      };
      for (let a = a0; a < a1 - 1e-6; a += 0.5) {
        const free = !gaps.some((g) => overlaps(g, probe(a)));
        if (free && start === null) start = a;
        if (!free) close(a);
      }
      close(a1);
    }
  }
  return out;
})();
/** A chain-link run's footprint */
export const edgeSolid = (e: EdgeRun): Footprint => {
  const alongX = e.a[1] === e.c[1];
  const [wx, wz] = alongX ? [0, 0.1] : [0.1, 0];
  return [Math.min(e.a[0], e.c[0]) - wx, Math.min(e.a[1], e.c[1]) - wz, Math.max(e.a[0], e.c[0]) + wx, Math.max(e.a[1], e.c[1]) + wz, EDGE_H + 0.12];
};

/* ---------- What's solid ---------- */

/** A vacant lot's fences: along its street front and its back */
export function vacantFences(v: Vacant): Footprint[] {
  const F = lowFrame(v);
  return [
    [...F.rect(0.1, 0.25, F.W - 0.1, 0.35), VACANT_FENCE],
    [...F.rect(0.1, F.D - 0.35, F.W - 0.1, F.D - 0.25), VACANT_FENCE],
  ];
}
export const STREETWALL_SOLIDS: Footprint[] = [...TENEMENTS.flatMap((l) => l.solids), ...VACANT.flatMap(vacantFences), ...LOWRISE.flatMap(lowSolids), ...LOW_CARS.map(carSolid), ...EDGES.map(edgeSolid)];
