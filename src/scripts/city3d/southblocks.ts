/*
 * Endswood's blocks as data (docs/south-plan.md Phase 2, step 2a; the owner's calls, 2026-11-14): DOM-free, tested in
 * tests/southblocks.test.ts. Drawn in 2b, walked in 2c, the ground round them in 2d.
 *
 * - **The Rampart**: one long block curving along the ring road (a barrier against its noise), from the closes in the
 *   west to the avenue, stepping up to 13 storeys north-east of the Circus; an archway over Underhill Lane's turning
 *   circle and the path to Lot 9's tunnel; its galleries face the estate, its stair cores stand out from them.
 * - **Harrier Point and Kite Point**: the twin towers north-east of the Circus, 18 storeys, a plant room on top, their
 *   lifts and stairs in a separate core between them, joined to it by bridges every third floor.
 * - **The stairwell blocks**: Linnet, Marten and Wren Courts, tall thin slabs between the avenues (9 storeys); Sorrel,
 *   Fennel and Teasel Houses round the Circus's south and east, along the streets' curves (5 storeys). A stair core at
 *   each end, on the side its galleries face, the galleries running into them. Teasel's west half is hoarded for refit,
 *   Bunker Sound in its basement.
 * - **The sky network**: covered bridges between the cores at the third, sixth and ninth floors, a podium deck between
 *   Teasel and Fennel over their parking court; the estate crossed without touching the ground.
 * - **The ground**: parking courts off the streets, grass with desire lines, a play area.
 *
 * Heights are in the city's units: a storey 1 (as the old estate's), the ground floor taller; the towers' plant rooms
 * reach about 20 (the owner's figure, St Aldwyn's spire 22.5).
 */
import { HALF, PATH_HALF, MARSH_LANE, ENDSWOOD_ROAD, FOOTPATHS as FOOTPATHS_ALL, SOUTH_BLOCKS as SOUTH_LAND, type Pt } from './south';
import { cross, inside, shift, smooth } from './streetfaces';
import { southLift } from './southground';
import type { Box } from './underground';

export type { Pt, Box };

/* ---------- The measures ---------- */

/** A storey's height (the old estate's), the ground floor's (taller: entrances, the hall), the roof's parapet */
export const STOREY = 1;
export const GROUND_H = 1.4;
export const PARAPET = 0.3;
/** The block's slab's height over today's ground (world.ts `SLAB`, endswood.ts `SLAB_Y`) */
const SLAB_Y = 0.15;
/** A sidewalk's width: a block stands at least `KERB_GAP` back from it */
const WALK = 0.8;
export const KERB_GAP = 1;
/** A gallery's width (a street in the sky, walked), a stair core's half width, a bridge's half width */
export const GALLERY_W = 1.6;
export const CORE_HALF = 1.4;
export const BRIDGE_HALF = 0.9;
/** The floors the galleries run along and the bridges cross at: every third ("streets in the sky") */
export const SKY_FLOORS = [3, 6, 9, 12, 15];
/** The clear height under a bridge over a street (a bus's under it) */
export const BRIDGE_CLEAR = 3;
/** A stair core's lift house over its block's roof (room for a landing on the top gallery's floor under it) */
export const CORE_OVER = 1.8;
/** How far a slab's end corners are cut back: this much of its depth (docs/brutalist-plan.md Phase 1: chamfered, hard,
 * where they were rounded) */
export const CORNER_R = 0.15;
/** The corners' cut: one straight face (a chamfer) */
const CUT = 1;
/** The towers' plant room over their roofs, and their beacon's height over that */
export const PLANT_H = 1.6;
export const BEACON_H = 0.5;

/** A floor's level over a block's base: the ground floor 0, the first floor over it, and so on */
export const floorY = (base: number, n: number) => base + (n === 0 ? 0 : GROUND_H + (n - 1) * STOREY);
/** A block's roof's level with `storeys` storeys (the ground floor one of them) */
export const roofY = (base: number, storeys: number) => floorY(base, storeys);

/* ---------- The accents (brutalist, docs/brutalist-plan.md: raw grey concrete, each block's own colour a stripe on its ends) ---------- */

export type Accent = 'orange' | 'teal' | 'mustard';
export const ACCENTS: Record<Accent, number> = { orange: 0xd9692e, teal: 0x2c9a92, mustard: 0xd6a12a };
/** The concrete: a cool grey, dark and weathered (the wall atlas's `brutal` band; the owner's pick, 2026-11-21) */
export const CONCRETE = 0x7d8085;

/* ---------- Lines and shapes ---------- */

const len = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
/** A line's length */
export const lineLength = (pts: Pt[]) => pts.reduce((s, p, i) => (i ? s + len(pts[i - 1], p) : s), 0);
/** The point `d` along a line, and its direction there */
export function pointAt(pts: Pt[], d: number): { p: Pt; dir: Pt } {
  let left = Math.max(0, d);
  for (let i = 1; i < pts.length; i++) {
    const l = len(pts[i - 1], pts[i]);
    if (left <= l || i === pts.length - 1) {
      const t = l ? Math.min(1, left / l) : 0;
      const dir: Pt = l ? [(pts[i][0] - pts[i - 1][0]) / l, (pts[i][1] - pts[i - 1][1]) / l] : [1, 0];
      return { p: [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t], dir };
    }
    left -= l;
  }
  return { p: pts[0], dir: [1, 0] };
}
/** The part of a line from `a` to `b` along it */
export function section(pts: Pt[], a: number, b: number, step = 1.5): Pt[] {
  const n = Math.max(1, Math.ceil((b - a) / step));
  return Array.from({ length: n + 1 }, (_, k) => pointAt(pts, a + ((b - a) * k) / n).p);
}
/** How far along a line it first reaches `x` (a line running one way in x there) */
export function alongToX(pts: Pt[], x: number) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    const l = len(a, b);
    if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) return d + (l * (x - a[0])) / (b[0] - a[0]);
    d += l;
  }
  return Number.NaN;
}
/** A line's right side (`side` 1) or left (-1): streetfaces.ts `shift()` moves a line to its right */
const SIDE = { right: 1, left: -1 } as const;
export type Side = keyof typeof SIDE;

/** Corners rounded: each corner at `at` replaced by a curve `r` back along each edge */
function roundAt(poly: Pt[], at: number[], r: number, n = CUT): Pt[] {
  const out: Pt[] = [];
  poly.forEach((v, i) => {
    if (!at.includes(i)) return void out.push(v);
    const [p, q] = [poly[(i - 1 + poly.length) % poly.length], poly[(i + 1) % poly.length]];
    const rr = Math.min(r, len(p, v) * 0.45, len(v, q) * 0.45);
    const a: Pt = [v[0] + ((p[0] - v[0]) * rr) / len(p, v), v[1] + ((p[1] - v[1]) * rr) / len(p, v)];
    const b: Pt = [v[0] + ((q[0] - v[0]) * rr) / len(v, q), v[1] + ((q[1] - v[1]) * rr) / len(v, q)];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const u = 1 - t;
      out.push([u * u * a[0] + 2 * u * t * v[0] + t * t * b[0], u * u * a[1] + 2 * u * t * v[1] + t * t * b[1]]);
    }
  });
  return out;
}
/** A slab's footprint: its spine widened `depth`, its ends' corners rounded */
export const slabFoot = (spine: Pt[], depth: number): Pt[] => slabRing(spine, depth, 0, lineLength(spine), true, true).ring;
/** A square, `half` each way, turned `rot` (radians, from +x towards +z), its corners cut back `r` */
export function squareFoot(c: Pt, half: number, rot: number, r = half * 0.2): Pt[] {
  const [cs, sn] = [Math.cos(rot), Math.sin(rot)];
  const sq: Pt[] = [[half, half], [-half, half], [-half, -half], [half, -half]].map(([x, z]): Pt => [c[0] + x * cs - z * sn, c[1] + x * sn + z * cs]);
  return roundAt(sq, [0, 1, 2, 3], r);
}

/* ---------- The blocks ---------- */

export interface Step {
  /** Along its spine, from and to */
  from: number;
  to: number;
  storeys: number;
}
export interface Block {
  id: string;
  name: string;
  kind: 'rampart' | 'slab' | 'tower' | 'core';
  /** Its footprint, a closed ring */
  foot: Pt[];
  /** A slab's and the Rampart's: the line along its middle, its depth, the side its galleries face */
  spine?: Pt[];
  depth?: number;
  galleries?: Side;
  /** Its heights along its spine (a tower's one step) */
  steps: Step[];
  /** Its ground floor's level: its slab over the highest ground under it (where the ground falls, a plinth) */
  base: number;
  accent?: Accent;
  /** An archway through it at the ground (the Rampart's): along its spine, from and to, and the clear height under */
  arch?: { from: number; to: number; clear: number };
  /** The part hoarded for refit, along its spine (Teasel House's west half) */
  refit?: { from: number; to: number };
}

/** A block's base: its slab over the highest ground under its footprint (sampled at its corners and its middle) */
function baseOf(foot: Pt[]) {
  const c: Pt = [foot.reduce((s, p) => s + p[0], 0) / foot.length, foot.reduce((s, p) => s + p[1], 0) / foot.length];
  return SLAB_Y + Math.max(...[...foot, c].map((p) => southLift(p[0], p[1])));
}
/** The highest storeys a block has */
export const storeysOf = (b: Block) => Math.max(...b.steps.map((s) => s.storeys));
/** The top of a block: its roof's parapet (a tower's beacon over its plant room; a core's lift house) */
export function topOf(b: Block) {
  const roof = roofY(b.base, storeysOf(b));
  return b.kind === 'tower' ? roof + PLANT_H + BEACON_H : b.kind === 'core' ? roof + 0.8 : roof + PARAPET;
}
/** The storeys a block has at a point along its spine */
export const storeysAt = (b: Block, d: number) => (b.steps.find((s) => d >= s.from && d <= s.to) ?? b.steps[0]).storeys;

function slab(id: string, name: string, kind: Block['kind'], spine: Pt[], depth: number, galleries: Side, steps: Step[] | number, accent?: Accent, extra: Partial<Block> = {}): Block {
  const foot = slabFoot(spine, depth);
  const L = lineLength(spine);
  return { id, name, kind, foot, spine, depth, galleries, steps: typeof steps === 'number' ? [{ from: 0, to: L, storeys: steps }] : steps, base: baseOf(foot), accent, ...extra };
}
/** A street's centre line moved `d` to its right, from `x0` to `x1` along it (a line running one way in x there) */
function alongStreet(pts: Pt[], d: number, x0: number, x1: number): Pt[] {
  const line = shift(pts, d);
  const [a, b] = [alongToX(line, x0), alongToX(line, x1)];
  return section(line, Math.min(a, b), Math.max(a, b));
}

// The Rampart: west to east along the ring road (its left side north, to the road; its galleries on its right, south)
const RAMPART_SPINE = smooth([[-168, 342.4], [-150, 341.6], [-130, 342.2], [-112, 343.6], [-95, 343.4], [-75, 342.6], [-55, 342.2], [-35, 342.6], [-15, 343.2]], 2);
const atX = (x: number) => alongToX(RAMPART_SPINE, x);
/** Its heights, west to east: rising to 13 storeys north-east of the Circus, falling again to the avenue */
const RAMPART_STEPS: [number, number][] = [[-140, 7], [-121, 9], [-97, 11], [-58, 13], [-34, 11], [Infinity, 9]];
const rampartSteps = (): Step[] => {
  const L = lineLength(RAMPART_SPINE);
  let from = 0;
  return RAMPART_STEPS.map(([x, storeys]) => {
    const to = Number.isFinite(x) ? atX(x) : L;
    const s = { from, to, storeys };
    from = to;
    return s;
  });
};
export const RAMPART: Block = slab('rampart', 'The Rampart', 'rampart', RAMPART_SPINE, 9, 'right', rampartSteps(), 'mustard', {
  // (over Underhill Lane's turning circle and the path to Lot 9's tunnel: the first two floors open, the third over them)
  arch: { from: atX(-121), to: atX(-97), clear: GROUND_H + STOREY - 0.25 },
});

// The twin towers and their core between them, north-east of the Circus
const TWIN_ROT = Math.atan2(7, 32);
export const TOWER_HALF = 7;
export const TWIN_CORE_HALF = 3;
const twin = (id: string, name: string, c: Pt, accent: Accent): Block => {
  const foot = squareFoot(c, TOWER_HALF, TWIN_ROT);
  return { id, name, kind: 'tower', foot, steps: [{ from: 0, to: 0, storeys: 18 }], base: baseOf(foot), accent };
};
export const HARRIER = twin('harrier', 'Harrier Point', [-67, 371.5], 'orange');
export const KITE = twin('kite', 'Kite Point', [-35, 378.5], 'teal');
const twinCoreFoot = squareFoot([-51, 375], TWIN_CORE_HALF, TWIN_ROT, 0.6);
export const TWIN_CORE: Block = { id: 'twin-core', name: 'The Core', kind: 'core', foot: twinCoreFoot, steps: [{ from: 0, to: 0, storeys: 19 }], base: baseOf(twinCoreFoot) };
/** The top floor the twins and The Core share: a bridge from The Core to each tower at it (docs/brutalist-plan.md Phase 3) */
export const TOP_FLOOR = 17;
/**
 * The Perch (docs/brutalist-plan.md Phase 3, the owner's name): a hexagonal concrete drum round The Core's top two
 * floors, wider than it, a flat face to each tower (where the top bridges meet it); inside, one room two storeys high
 * round a glass lift, a glass band all round it; its roof The Core's, so it's no taller (`topOf()` unchanged)
 */
export const PERCH = (() => {
  const c: Pt = [twinCoreFoot.reduce((s, p) => s + p[0], 0) / twinCoreFoot.length, twinCoreFoot.reduce((s, p) => s + p[1], 0) / twinCoreFoot.length];
  /** From its middle to the middle of a face, and to a corner */
  const apothem = 4.3;
  const r = apothem / Math.cos(Math.PI / 6);
  const foot = Array.from({ length: 6 }, (_, k): Pt => {
    const a = TWIN_ROT + Math.PI / 6 + (k * Math.PI) / 3;
    return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r];
  });
  const base = TWIN_CORE.base;
  /** Its floor (the top floor's), its roof (The Core's) */
  const [y0, y1] = [floorY(base, TOP_FLOOR), roofY(base, storeysOf(TWIN_CORE))];
  return { name: 'The Perch', at: c, apothem, r, foot, y0, y1, rot: TWIN_ROT };
})();

// The stairwell blocks: three tall slabs between the avenues (running south: their right side west, their galleries
// there), three lower round the Circus along the streets' curves
const GAP = HALF + WALK + KERB_GAP;
export const LINNET = slab('linnet', 'Linnet Court', 'slab', [[8, 343], [8, 369]], 7, 'right', 9, 'teal');
export const MARTEN = slab('marten', 'Marten Court', 'slab', [[29.5, 343], [29.5, 386]], 8, 'right', 9, 'orange');
export const WREN = slab('wren', 'Wren Court', 'slab', [[53.5, 343], [53.5, 396]], 7, 'right', 9, 'mustard');
// (Marsh Lane and Endswood Road run west: their right side is north)
export const SORREL = slab('sorrel', 'Sorrel House', 'slab', alongStreet(MARSH_LANE.pts, GAP + 4 + 1.5, 26, 7.5), 8, 'right', 5, 'orange');
export const FENNEL = slab('fennel', 'Fennel House', 'slab', alongStreet(MARSH_LANE.pts, GAP + 4 + 1.5, -30, -66), 8, 'right', 5, 'teal');
const TEASEL_SPINE = alongStreet(ENDSWOOD_ROAD.pts, -(GAP + 4 + 1.5), -26, -60);
export const TEASEL = slab('teasel', 'Teasel House', 'slab', TEASEL_SPINE, 8, 'left', 5, 'mustard', {
  // (its west half, by the Circus, hoarded for refit; the spine runs east to west, so its second half)
  refit: { from: lineLength(TEASEL_SPINE) / 2, to: lineLength(TEASEL_SPINE) },
});

/* ---------- A block's steps as outlines (for drawing them) ---------- */

/** What an edge of a step's outline is: along its spine's right side or left, a rounded corner, its start or end (a
 * block's end, or where it meets its next step: `cut`) */
export type EdgeTag = 'right' | 'left' | 'corner' | 'start' | 'end';
export interface StepShape {
  /** Its outline, a closed ring, and each edge's tag (`tags[i]`: the edge from `ring[i]` to the next) */
  ring: Pt[];
  tags: EdgeTag[];
  /** Whether its start and end are cuts (where it meets the step before or after it) rather than the block's ends */
  cutStart: boolean;
  cutEnd: boolean;
}
/** A step of a slab or the Rampart as an outline: its sides along its spine, its corners rounded where the block ends */
export function stepShape(b: Block, st: Step): StepShape {
  const L = lineLength(b.spine!);
  const [cutStart, cutEnd] = [st.from > 1e-6, st.to < L - 1e-6];
  return { ...slabRing(b.spine!, b.depth!, st.from, st.to, !cutStart, !cutEnd), cutStart, cutEnd };
}
/**
 * A stretch `from` to `to` of a spine widened `depth`, as a ring with each edge tagged: its right side, a quarter-round
 * corner (`rs`, `re`: at its start, its end), the end across, its left side back, the start across
 */
function slabRing(spine: Pt[], depth: number, from: number, to: number, rs: boolean, re: boolean, n = CUT): { ring: Pt[]; tags: EdgeTag[] } {
  const r = depth * CORNER_R;
  const h = depth / 2;
  const [a, c] = [from + (rs ? r : 0), to - (re ? r : 0)];
  // (a point every 3 along: the spines bend gently)
  const sec = section(spine, a, c, 3);
  const [right, left] = [shift(sec, h), shift(sec, -h).reverse()];
  const ring: Pt[] = [];
  const tags: EdgeTag[] = [];
  const emit = (p: Pt, t: EdgeTag) => (ring.push(p), tags.push(t));
  /** The two corners at an end: round from its side to across it, then on round to the other side (`back`: the start) */
  const corners = (d: number, back: boolean, cap: EdgeTag) => {
    const { p, dir } = pointAt(spine, d);
    const t: Pt = back ? [-dir[0], -dir[1]] : dir;
    // (looking along t, its right: the spine's right at the end, its left at the start)
    const nr: Pt = [-t[1], t[0]];
    const c1: Pt = [p[0] + nr[0] * (h - r), p[1] + nr[1] * (h - r)];
    const c2: Pt = [p[0] - nr[0] * (h - r), p[1] - nr[1] * (h - r)];
    for (let k = 1; k <= n; k++) {
      const q = ((k / n) * Math.PI) / 2;
      emit([c1[0] + r * (Math.cos(q) * nr[0] + Math.sin(q) * t[0]), c1[1] + r * (Math.cos(q) * nr[1] + Math.sin(q) * t[1])], k < n ? 'corner' : cap);
    }
    for (let k = 0; k < n; k++) {
      const q = ((k / n) * Math.PI) / 2;
      emit([c2[0] + r * (Math.cos(q) * t[0] - Math.sin(q) * nr[0]), c2[1] + r * (Math.cos(q) * t[1] - Math.sin(q) * nr[1])], 'corner');
    }
  };
  right.forEach((p, i) => emit(p, i < right.length - 1 ? 'right' : re ? 'corner' : 'end'));
  if (re) corners(c, false, 'end');
  left.forEach((p, i) => emit(p, i < left.length - 1 ? 'left' : rs ? 'corner' : 'start'));
  if (rs) corners(a, true, 'start');
  return { ring, tags };
}
/** A ring's outward normal along its edge `i` (x, z), whichever way round it runs */
export function outward(ring: Pt[], i: number): Pt {
  const area = ring.reduce((s, p, k) => s + p[0] * ring[(k + 1) % ring.length][1] - ring[(k + 1) % ring.length][0] * p[1], 0);
  const [a, c] = [ring[i], ring[(i + 1) % ring.length]];
  const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
  const [dx, dz] = [(c[0] - a[0]) / l, (c[1] - a[1]) / l];
  return area > 0 ? [dz, -dx] : [-dz, dx];
}

/* ---------- The stair cores ---------- */

export interface Core {
  id: string;
  /** The block it serves */
  of: string;
  at: Pt;
  /** Its turn (radians, from +x towards +z): square to its block */
  rot: number;
  half: number;
  /** Its roof: over its block's, the lift's machine room */
  top: number;
  foot: Pt[];
  /**
   * How far it stands off its block (docs/brutalist-plan.md Phase 2: a service tower of its own, a link from its
   * gallery to it at each landing; 0: against its block as before). `SERVICE_GAP` where there's room, less where a
   * street or a parking court is near (`CORE_GAPS`)
   */
  gap: number;
  /** The link's line at each landing: from the gallery's end (or front) to the tower's face, and the way along it */
  link: [Pt, Pt] | null;
}
/** A service tower's distance off its block: a bridge's length (docs/brutalist-plan.md Phase 2) */
export const SERVICE_GAP = 3;
/** The towers with less room than that (measured: a street, a parking court or the underpass's ramp near; 0: still
 * against its block) */
const CORE_GAPS: Record<string, number> = { 'rampart-2': 0, 'rampart-3': 1, 'sorrel-b': 1.5, 'fennel-a': 1, 'linnet-b': 0 };
const rotOf = (dir: Pt) => Math.atan2(dir[1], dir[0]);
function coreAt(b: Block, id: string, at: Pt, dir: Pt, storeys: number, gap: number, link: [Pt, Pt] | null): Core {
  const rot = rotOf(dir);
  return { id, of: b.id, at, rot, half: CORE_HALF, top: roofY(b.base, storeys) + CORE_OVER, foot: squareFoot(at, CORE_HALF, rot, 0.6), gap, link };
}
/** A slab's cores: past each end, in line with its galleries, standing `gap` off it (each gallery runs on to it by its link) */
function endCores(b: Block): Core[] {
  const spine = b.spine!;
  const L = lineLength(spine);
  const s = SIDE[b.galleries!];
  // (its outer face flush with the gallery's outer edge, as before; the link along the gallery band's middle)
  const off = s * (b.depth! / 2 + GALLERY_W - CORE_HALF);
  const mid = s * (b.depth! / 2 + GALLERY_W / 2);
  return ([['a', 0, -1], ['b', L, 1]] as const).map(([k, d, out]) => {
    const id = `${b.id}-${k}`;
    const gap = CORE_GAPS[id] ?? SERVICE_GAP;
    const { p, dir } = pointAt(spine, d);
    const right: Pt = [-dir[1], dir[0]];
    const along = out * (CORE_HALF + 0.05 + gap);
    const at: Pt = [p[0] + dir[0] * along + right[0] * off, p[1] + dir[1] * along + right[1] * off];
    const from: Pt = [p[0] + right[0] * mid, p[1] + right[1] * mid];
    const to: Pt = [p[0] + dir[0] * out * (gap + 0.05) + right[0] * mid, p[1] + dir[1] * out * (gap + 0.05) + right[1] * mid];
    return coreAt(b, id, at, dir, storeysAt(b, d), gap, gap > 0 ? [from, to] : null);
  });
}
/** The Rampart's cores: standing out from its galleries, at these points along it (none under the arch) */
const RAMPART_CORE_XS = [-152, -128, -88, -51, -21];
function sideCores(b: Block, xs: number[]): Core[] {
  const spine = b.spine!;
  const s = SIDE[b.galleries!];
  return xs.map((x, i) => {
    const id = `${b.id}-${i}`;
    const gap = CORE_GAPS[id] ?? SERVICE_GAP;
    const d = alongToX(spine, x);
    const { p, dir } = pointAt(spine, d);
    const right: Pt = [-dir[1], dir[0]];
    const edge = s * (b.depth! / 2 + GALLERY_W);
    const off = s * (b.depth! / 2 + GALLERY_W + CORE_HALF + 0.05 + gap);
    const link: [Pt, Pt] = [[p[0] + right[0] * edge, p[1] + right[1] * edge], [p[0] + right[0] * (edge + s * (gap + 0.05)), p[1] + right[1] * (edge + s * (gap + 0.05))]];
    return coreAt(b, id, [p[0] + right[0] * off, p[1] + right[1] * off], dir, storeysAt(b, d), gap, gap > 0 ? link : null);
  });
}
/** A core's landing posts: the four corners of its footprint, a little in (the ring's points furthest out each way
 * round its middle), less any that would stand in its link's doorway, where the covered link from the gallery arrives
 * (J1 part 3: a post dead in the opening read as slabs meeting at a point, and walked through, having no solid) */
export function landingPosts(ring: Pt[], link: [Pt, Pt] | null = null): Pt[] {
  const c: Pt = [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length];
  const far = [...ring].sort((p, q) => Math.hypot(q[0] - c[0], q[1] - c[1]) - Math.hypot(p[0] - c[0], p[1] - c[1]));
  const out: Pt[] = [];
  for (const p of far) {
    if (out.length === 4) break;
    if (out.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > 1)) out.push(p);
  }
  const posts = out.map((p): Pt => [c[0] + (p[0] - c[0]) * 0.85, c[1] + (p[1] - c[1]) * 0.85]);
  return link ? posts.filter((p) => !inDoorway(link, p)) : posts;
}
/** Whether a point stands in a link's doorway: across it within its half-width (and a post's), at its tower end */
export function inDoorway(link: [Pt, Pt], p: Pt): boolean {
  const [a, e] = link;
  const l = Math.hypot(e[0] - a[0], e[1] - a[1]) || 1;
  const t: Pt = [(e[0] - a[0]) / l, (e[1] - a[1]) / l];
  const s = (p[0] - a[0]) * t[0] + (p[1] - a[1]) * t[1];
  const o = Math.abs(-(p[0] - a[0]) * t[1] + (p[1] - a[1]) * t[0]);
  return o < BRIDGE_HALF + 0.15 && s > l - 1.5 && s < l + 2;
}

export const CORES: Core[] = [...sideCores(RAMPART, RAMPART_CORE_XS), ...[LINNET, MARTEN, WREN, SORREL, FENNEL, TEASEL].flatMap(endCores)];

/** Every block, the cores apart */
export const BLOCKS: Block[] = [RAMPART, HARRIER, KITE, TWIN_CORE, LINNET, MARTEN, WREN, SORREL, FENNEL, TEASEL];
export const blockById = (id: string) => BLOCKS.find((b) => b.id === id)!;
export const coreById = (id: string) => CORES.find((c) => c.id === id)!;

/* ---------- The towers' stair cages (docs/brutalist-plan.md, the owner's pick: caged stairs outside, walked) ---------- */

/**
 * A service tower's stair cage: a concrete-framed cage of anti-climb mesh standing out from one of its faces (one with
 * no door, link or bridge on it, clear of the streets and the courts: measured), switchback flights inside it from the
 * street up to each of its landings. In the cage's own numbers: `a` out from the tower's face (0 at the face), `b`
 * across (its `side`)
 */
export interface Cage {
  id: string;
  core: string;
  /** The face's middle at the tower, the way out from it, the way across */
  root: Pt;
  out: Pt;
  side: Pt;
  base: number;
  /** As high as the cage's frame goes */
  top: number;
  /** A point in the cage's numbers, in the world */
  at(a: number, b: number): Pt;
}
/** The cage's measures: how far out it reaches, half its width, its landings' depth, its lanes' half gap */
export const CAGE = { len: 5, half: 1.1, land: 0.9, gap: 0.05 };
/** Which face each tower's cage stands out from (measured: the others have a door, a link, a bridge, a street or a
 * parking court; the Rampart's fifth, Linnet's and Marten's north ones, Fennel's east one and Teasel's east one have no
 * room for one and keep their lifts alone) */
const CAGE_FACES: Record<string, '+d' | '-d' | '+r' | '-r'> = {
  'rampart-0': '+d', 'rampart-1': '+d', 'rampart-2': '+d', 'rampart-3': '+d', 'linnet-b': '-r', 'marten-b': '+r',
  'wren-a': '-r', 'wren-b': '+r', 'sorrel-a': '-r', 'sorrel-b': '-r', 'fennel-b': '-r', 'teasel-b': '+r',
};
export const CAGES: Cage[] = CORES.filter((c) => CAGE_FACES[c.id]).map((c) => {
  const d: Pt = [Math.cos(c.rot), Math.sin(c.rot)];
  const out: Pt = { '+d': d, '-d': [-d[0], -d[1]] as Pt, '+r': [-d[1], d[0]] as Pt, '-r': [d[1], -d[0]] as Pt }[CAGE_FACES[c.id]];
  const side: Pt = [-out[1], out[0]];
  const root: Pt = [c.at[0] + out[0] * (c.half + 0.05), c.at[1] + out[1] * (c.half + 0.05)];
  const at = (a: number, b: number): Pt => [root[0] + out[0] * a + side[0] * b, root[1] + out[1] * a + side[1] * b];
  return { id: `${c.id}-cage`, core: c.id, root, out, side, base: blockById(c.of).base, top: c.top - 0.3, at };
});
/** A cage's ground as boxes: under its second flights' lane and its far end (its first flight's lane and the way in at the
 * tower left clear, walked up from the street) */
const cageSolids = (g: Cage): Box[] => {
  const { len, half, gap, land } = CAGE;
  const rect = (a0: number, a1: number, b0: number, b1: number): Pt[] => [g.at(a0, b0), g.at(a1, b0), g.at(a1, b1), g.at(a0, b1)];
  return [...cover(rect(land, len, -half, -gap), g.top, 0.3), ...cover(rect(len - 2, len, gap, half), g.top, 0.3)];
};


/* ---------- The galleries ---------- */

export interface Gallery {
  of: string;
  floor: number;
  y: number;
  /** Its deck: a band along its block's galleried side */
  poly: Pt[];
}
/** Every gallery: along each slab's and the Rampart's galleried side at each sky floor it rises past */
export const GALLERIES: Gallery[] = BLOCKS.filter((b) => b.spine).flatMap((b) => {
  const s = SIDE[b.galleries!];
  return SKY_FLOORS.flatMap((floor) => {
    // (along every stretch of it tall enough for this floor)
    return b.steps
      .filter((st) => st.storeys > floor)
      .map((st) => {
        const part = section(b.spine!, st.from, st.to);
        const [inner, outer] = [shift(part, (s * b.depth!) / 2), shift(part, s * (b.depth! / 2 + GALLERY_W))];
        return { of: b.id, floor, y: floorY(b.base, floor), poly: [...inner, ...outer.reverse()] };
      });
  });
});

/* ---------- The sky network ---------- */

/** One end of a bridge: a core, a tower's face, the podium deck */
export type End = { core: string } | { block: string } | { deck: string };
export interface Bridge {
  id: string;
  a: End;
  b: End;
  floor: number;
  /** Its two ends, each where it meets its end's face, and their levels (level, unless the ground under its ends differs) */
  pts: [Pt, Pt];
  ys: [number, number];
}
/** (The Core's at its top floor: The Perch's, wider) */
const footOf = (e: End, floor = 0) =>
  'core' in e ? coreById(e.core).foot : 'block' in e ? (e.block === 'twin-core' && floor >= TOP_FLOOR ? PERCH.foot : blockById(e.block).foot) : DECKS.find((d) => d.id === e.deck)!.poly;
const centreOf = (poly: Pt[]): Pt => [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
const baseOfEnd = (e: End) => ('core' in e ? blockById(coreById(e.core).of).base : 'block' in e ? blockById(e.block).base : null);
/** Where a line from `from` to `to` crosses a ring's edge last (`last`) or first */
function edgeHit(poly: Pt[], from: Pt, to: Pt, last: boolean): Pt {
  let best: number | null = null;
  for (let i = 0; i < poly.length; i++) {
    const hit = cross(from, to, poly[i], poly[(i + 1) % poly.length]);
    if (hit && (best === null || (last ? hit[0] > best : hit[0] < best))) best = hit[0];
  }
  const t = best ?? (last ? 0 : 1);
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
}
function bridge(id: string, a: End, b: End, floor: number, via?: [Pt, Pt]): Bridge {
  const [fa, fb] = [footOf(a, floor), footOf(b, floor)];
  const [ca, cb] = via ?? [centreOf(fa), centreOf(fb)];
  const pts: [Pt, Pt] = [edgeHit(fa, ca, cb, true), edgeHit(fb, ca, cb, false)];
  const yOf = (e: End) => {
    const base = baseOfEnd(e);
    return base === null ? DECKS.find((d) => 'deck' in e && d.id === e.deck)!.y : floorY(base, floor);
  };
  return { id, a, b, floor, pts, ys: [yOf(a), yOf(b)] };
}

/* ---------- The podium deck, the courts, the grass, the play area ---------- */

export interface Deck {
  id: string;
  poly: Pt[];
  y: number;
}
/** The podium deck between Teasel House's galleries and Fennel House's, over their parking court, at the third floor */
const PODIUM_X = [-56, -36];
const podium = (): Deck => {
  const [t, f] = [TEASEL, FENNEL];
  const edge = (b: Block): Pt[] => {
    const s = SIDE[b.galleries!];
    const line = shift(b.spine!, s * (b.depth! / 2 + GALLERY_W - 0.2));
    const [a, c] = [alongToX(line, PODIUM_X[0]), alongToX(line, PODIUM_X[1])];
    return section(line, Math.min(a, c), Math.max(a, c));
  };
  const [te, fe] = [edge(t), edge(f)];
  // (Teasel's runs east to west, Fennel's too: one forward, the other back, to close the ring)
  return { id: 'podium', poly: [...te, ...fe.reverse()], y: floorY(Math.max(t.base, f.base), 3) };
};
export const DECKS: Deck[] = [podium()];

export const BRIDGES: Bridge[] = [
  // The Rampart to the towers' core, at the third, sixth and ninth floors
  ...[3, 6, 9].map((f) => bridge(`rampart-core-${f}`, { core: 'rampart-3' }, { block: 'twin-core' }, f)),
  // The core to each tower, every third floor
  ...[3, 6, 9, 12, 15].flatMap((f) => [bridge(`core-harrier-${f}`, { block: 'twin-core' }, { block: 'harrier' }, f), bridge(`core-kite-${f}`, { block: 'twin-core' }, { block: 'kite' }, f)]),
  // ...and at the top floor, The Perch to each (the twins joined at the top: docs/brutalist-plan.md Phase 3)
  bridge(`core-harrier-${TOP_FLOOR}`, { block: 'twin-core' }, { block: 'harrier' }, TOP_FLOOR),
  bridge(`core-kite-${TOP_FLOOR}`, { block: 'twin-core' }, { block: 'kite' }, TOP_FLOOR),
  // Along the ring road, over the avenues: the Rampart's east end to Linnet, Linnet to Marten, Marten to Wren
  bridge('rampart-linnet', { core: 'rampart-4' }, { core: 'linnet-a' }, 3),
  ...[3, 6].flatMap((f) => [bridge(`linnet-marten-${f}`, { core: 'linnet-a' }, { core: 'marten-a' }, f), bridge(`marten-wren-${f}`, { core: 'marten-a' }, { core: 'wren-a' }, f)]),
  // Marten's south end to Sorrel's east end
  bridge('marten-sorrel', { core: 'marten-b' }, { core: 'sorrel-a' }, 3),
  // Sorrel's west end over the avenue to Teasel's east end
  bridge('sorrel-teasel', { core: 'sorrel-b' }, { core: 'teasel-a' }, 3),
  // Kite Point over Endswood Road to Teasel's east end
  bridge('kite-teasel', { block: 'kite' }, { core: 'teasel-a' }, 3),
];



export interface Court {
  id: string;
  poly: Pt[];
  /** Where cars come in: the street it opens off, and the point on its kerb */
  street: string;
  entry: Pt;
}
/** The parking courts: behind the Rampart (in off Underhill Lane's turning circle), between Teasel and Fennel (in off
 * Marsh Lane, under the podium deck), north of Sorrel (in off Endswood Road) */
export const COURTS: Court[] = [
  { id: 'court-rampart', poly: smooth([[-101, 353.2], [-80, 352.6], [-60, 352.4], [-40, 352.6], [-24, 353.4], [-24, 359.4], [-40, 361], [-60, 361], [-80, 361], [-101, 360]], 3, true), street: 'south-underhill', entry: [-102, 355] },
  {
    id: 'court-podium',
    // (the ground between Teasel's galleries and Fennel's, under the deck, opening east of Fennel onto Marsh Lane)
    poly: [
      [-58, 428.2], [-50, 426.8], [-44, 424], [-38.3, 421], [-33.4, 418.2], [-28.2, 415.3], [-25.6, 414], [-20.5, 416], [-19.5, 441], [-26, 441.6],
      [-26.6, 434.5], [-27.6, 430.4], [-31.8, 430.4], [-37.3, 432.2], [-43, 433.9], [-48.5, 435.5], [-53.9, 436.8], [-58, 437.5],
    ],
    street: 'south-marsh',
    entry: [-23, 443.4],
  },
  {
    id: 'court-sorrel',
    poly: [[3.5, 398], [10, 393.5], [14.5, 388], [18.5, 391], [19.5, 398], [17.5, 405.5], [13.5, 412], [9.5, 416.5], [5, 419.5], [3.2, 417]],
    street: 'south-endswood',
    entry: [7, 389],
  },
];
/** Grass with desire lines between the towers and Endswood Road, round them, and by Teasel and Sorrel */
export const GRASS: Pt[][] = [
  smooth([[-97, 364], [-80, 363.5], [-60, 363], [-44, 364], [-26, 363], [-26, 384], [-12, 384], [-12, 387.5], [-26, 391.5], [-41, 399.5], [-54, 406.5], [-62, 404], [-72, 401], [-84, 396], [-87, 390], [-92, 380], [-97.5, 370]], 3, true),
];
/** The paths worn across the grass: from Underhill Lane and from Endswood Road to the towers' core, and to Kite Point */
export const DESIRE_LINES: Pt[][] = [
  smooth([[-89, 386], [-72, 384], [-58, 381], [-52, 379]], 2),
  smooth([[-46.5, 404], [-46, 396], [-50, 386], [-51, 379.5]], 2),
  smooth([[-17, 390.5], [-23, 389.4], [-29, 389.2]], 2),
];
/** A 70s concrete play area east of Kite Point: a climbing frame, a sandpit, a ball court (2d) */
export const PLAY: Pt[] = smooth([[-24, 363], [-13, 363], [-13, 382], [-24, 382]], 3, true);

/* ---------- Basement and refit ---------- */

/** Bunker Sound: in Teasel House's basement, under its hoarded half, its door off Endswood Road */
export const BUNKER = (() => {
  const { p, dir } = pointAt(TEASEL.spine!, (TEASEL.refit!.from + TEASEL.refit!.to) / 2);
  const s = -SIDE[TEASEL.galleries!];
  const right: Pt = [-dir[1], dir[0]];
  const d = (TEASEL.depth! / 2 + 0.3) * s;
  return { of: TEASEL.id, door: [p[0] + right[0] * d, p[1] + right[1] * d] as Pt, face: Math.atan2(right[1] * s, right[0] * s) };
})();

/* ---------- Solids (walk mode's boxes; 2b adds them to the city's) ---------- */

/**
 * A footprint as boxes: strips `step` wide across its longer way, each from the shape's least to most along the other,
 * `top` high. Strips whose middle is in `skip` (along x or z, as the strips run) are left out (an archway).
 */
export function cover(poly: Pt[], top: number, step = 0.6, skip?: [number, number]): Box[] {
  const xs = poly.map((p) => p[0]);
  const zs = poly.map((p) => p[1]);
  const alongX = Math.max(...xs) - Math.min(...xs) >= Math.max(...zs) - Math.min(...zs);
  const [lo, hi] = alongX ? [Math.min(...xs), Math.max(...xs)] : [Math.min(...zs), Math.max(...zs)];
  const out: Box[] = [];
  for (let a = lo; a < hi - 1e-6; a += step) {
    const b = Math.min(hi, a + step);
    if (skip && (a + b) / 2 > skip[0] && (a + b) / 2 < skip[1]) continue;
    let [m0, m1] = [Infinity, -Infinity];
    const take = (v: number) => ((m0 = Math.min(m0, v)), (m1 = Math.max(m1, v)));
    for (let i = 0; i < poly.length; i++) {
      const [p, q] = [poly[i], poly[(i + 1) % poly.length]];
      const [pu, pv, qu, qv] = alongX ? [p[0], p[1], q[0], q[1]] : [p[1], p[0], q[1], q[0]];
      if (pu >= a && pu <= b) take(pv);
      for (const u of [a, b]) if ((pu - u) * (qu - u) < 0) take(pv + ((qv - pv) * (u - pu)) / (qu - pu));
    }
    if (m0 < m1) out.push(alongX ? [a, m0, b, m1, top] : [m0, a, m1, b, top]);
  }
  return out;
}
/** The archway's span along x (the Rampart runs east-west there) */
export const ARCH_X: [number, number] = [pointAt(RAMPART_SPINE, RAMPART.arch!.from).p[0], pointAt(RAMPART_SPINE, RAMPART.arch!.to).p[0]];
/* ---------- The bridges' piers (docs/brutalist-plan.md polish: heavy concrete spans) ---------- */

export interface Pier {
  id: string;
  at: Pt;
  /** Its turn: square to its span */
  rot: number;
  /** Its top: the underside of the lowest bridge on its span there */
  top: number;
  base: number;
}
/** A pier's half width, the spans long enough to have them, and how far apart along a span */
export const PIER_HALF = 0.35;
const PIER_SPAN = 10;
const PIER_EVERY = 7;
/** How far a point is in from the nearest edge of the estate's land it stands on (negative: on no land, a street) */
const onLand = (p: Pt) => {
  const f = SOUTH_LAND.find((b) => inside(b.poly, p));
  if (!f) return -1;
  return Math.min(...f.poly.map((q, i) => segDist(p, q, f.poly[(i + 1) % f.poly.length])));
};
/** Every long bridge's piers: about every `PIER_EVERY` along it, where the ground under it is the estate's (clear of the
 * streets and their sidewalks, the footpaths, the blocks, the towers, their cages and the courts) */
export const PIERS: Pier[] = (() => {
  const spans = new Map<string, Bridge[]>();
  for (const br of BRIDGES) {
    const key = br.pts.flat().map((v) => v.toFixed(1)).join(',');
    spans.set(key, [...(spans.get(key) ?? []), br]);
  }
  const out: Pier[] = [];
  for (const set of spans.values()) {
    const low = set.reduce((a, b) => (Math.min(...a.ys) < Math.min(...b.ys) ? a : b));
    const [a, c] = low.pts;
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (l < PIER_SPAN) continue;
    const n = Math.max(1, Math.round(l / PIER_EVERY) - 1);
    for (let k = 1; k <= n; k++) {
      const f = k / (n + 1);
      const at: Pt = [a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f];
      const clear = [-1, 1].every((dx) => [-1, 1].every((dz) => onLand([at[0] + dx * 0.6, at[1] + dz * 0.6]) > 1.7));
      if (!clear) continue;
      if (FOOTPATHS_ALL.some((fp) => fp.pts.some((q, i) => i > 0 && segDist(at, fp.pts[i - 1], q) < PATH_HALF + 1))) continue;
      if ([...BLOCKS.map((b) => b.foot), ...CORES.map((q) => q.foot)].some((ft) => inside(ft, at) || ft.some((q, i) => segDist(at, q, ft[(i + 1) % ft.length]) < 1.2)) || CAGES.some((g) => inside([g.at(-0.3, -1.6), g.at(CAGE.len + 0.3, -1.6), g.at(CAGE.len + 0.3, 1.6), g.at(-0.3, 1.6)], at))) continue;
      if (COURTS.some((ct) => inside(ct.poly, at))) continue;
      const y = low.ys[0] + (low.ys[1] - low.ys[0]) * f;
      out.push({ id: `${low.id}-pier-${k}`, at, rot: Math.atan2(c[1] - a[1], c[0] - a[0]), top: y - 0.22, base: southLift(at[0], at[1]) + 0.15 });
    }
  }
  return out;
})();

export const BLOCK_SOLIDS: Box[] = [
  ...BLOCKS.flatMap((b) => cover(b.foot, topOf(b), 0.6, b.arch ? ARCH_X : undefined)),
  ...CORES.map((c) => cover(c.foot, c.top, 0.6)).flat(),
  ...CAGES.flatMap(cageSolids),
  ...PIERS.map((p): Box => [p.at[0] - PIER_HALF, p.at[1] - PIER_HALF, p.at[0] + PIER_HALF, p.at[1] + PIER_HALF, p.top]),
];

/** Where the blocks stand, all of them, their bridges and their deck (districts.ts loads their drawing within reach of it) */
export const BLOCKS_RECT: [number, number, number, number] = (() => {
  const pts = [...BLOCKS.flatMap((b) => b.foot), ...CORES.flatMap((c) => c.foot)];
  return [Math.min(...pts.map((p) => p[0])) - 4, Math.min(...pts.map((p) => p[1])) - 4, Math.max(...pts.map((p) => p[0])) + 4, Math.max(...pts.map((p) => p[1])) + 4];
})();
/** Is a point inside any block or core (for the tests and the ground's things kept clear of them) */
export const inBlock = (p: Pt, m = 0) => [...BLOCKS.map((b) => b.foot), ...CORES.map((c) => c.foot)].some((f) => inside(f, p) || (m > 0 && f.some((q, i) => segDist(p, q, f[(i + 1) % f.length]) < m)));
function segDist(p: Pt, a: Pt, b: Pt) {
  const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
  const l2 = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / l2));
  return Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vz * t);
}
export { PATH_HALF };
