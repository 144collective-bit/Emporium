/*
 * St Aldwyn's (docs/south-plan.md Phase 3, step 3b; the owner's call, 2026-11-16: Victorian Gothic): on the village's
 * hilltop in its churchyard (south.ts `CHURCHYARD`), laid east to west as churches are: the tower and its broach spire
 * at the west end (its tip 22.5 over its base, the owner's figure), the nave, the narrower chancel to the east, a porch
 * on the north side facing the lychgate on Church Road, the path between them, gravestones and a few yews round it.
 * DOM-free, tested in tests/aldwyns.test.ts; drawn by village3d.ts.
 */
import { CHURCHYARD, CHURCH_ROAD, type Pt } from './south';
import { distTo, inside, seeded } from './streetfaces';
import { southLift } from './southground';
import { cover, type Box } from './southblocks';

type Rect = [number, number, number, number];
const SLAB = 0.15;

/* ---------- The church (its parts as rects, x along the nave, east +x) ---------- */

/** The nave's middle line's z and its parts: each [x0, z0, x1, z1] and its walls' height (to the eaves), its roof's
 * rise over them */
const Z = 462;
export const NAVE: Rect = [-214, Z - 3.2, -199, Z + 3.2];
export const CHANCEL: Rect = [-199, Z - 2.3, -194.2, Z + 2.3];
export const TOWER: Rect = [-218.6, Z - 2.2, -214, Z + 2.2];
export const PORCH: Rect = [-209.4, Z - 3.2 - 2.4, -206.6, Z - 3.2];
export const HEIGHTS = { nave: 4.2, naveRoof: 3.4, chancel: 3.4, chancelRoof: 2.6, tower: 8.6, porch: 2.2, porchRoof: 1.2 };
/** The spire's tip over the church's base (the owner's figure), and its foot (the tower's top) */
export const SPIRE_TIP = 22.5;

/** The church's base: its floor over the hilltop's highest ground under it (a plinth where the ground falls) */
const PARTS: Rect[] = [NAVE, CHANCEL, TOWER, PORCH];
const corners = (r: Rect): Pt[] => [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]];
export const CHURCH_BASE = SLAB + Math.max(...PARTS.flatMap(corners).map(([x, z]) => southLift(x, z)));
export const CHURCH_LOW = SLAB + Math.min(...PARTS.flatMap(corners).map(([x, z]) => southLift(x, z)));

/* ---------- The way in ---------- */

/** The porch's door (its north face's middle) and where you stand at it */
export const PORCH_DOOR: Pt = [(PORCH[0] + PORCH[2]) / 2, PORCH[1]];
export const DOOR_SPOT: Pt = [PORCH_DOOR[0], PORCH_DOOR[1] - 0.8];
/** The lychgate: on the churchyard's north edge, in line with the porch, facing Church Road; its roof's span */
export const LYCHGATE = { at: [PORCH_DOOR[0], 450.1] as Pt, w: 2.6, d: 1.6, h: 2.4 };
/** The path: from Church Road's sidewalk through the lychgate to the porch door */
export const CHURCH_PATH: Pt[] = (() => {
  const x = PORCH_DOOR[0];
  const road = CHURCH_ROAD.pts.reduce((b, p) => (Math.abs(p[0] - x) < Math.abs(b[0] - x) ? p : b))[1];
  return [[x, road + CHURCH_ROAD.half + 0.8], [x, PORCH_DOOR[1] - 0.5]];
})();
export const PATH_W = 1.3;

/* ---------- The churchyard ---------- */

/** The yews: dark, by the path and the churchyard's corners (the graves keep clear of them) */
export const YEWS: [number, number, number][] = (
  [
    [PORCH_DOOR[0] - 2.4, 453.6, 0.85],
    [PORCH_DOOR[0] + 2.4, 453.6, 0.85],
    [-219, 468.5, 1],
    [-193, 468.5, 0.95],
    [-219.5, 455.5, 0.9],
  ] as [number, number, number][]
).filter(([x, z]) => inside(CHURCHYARD, [x, z]) && distTo(CHURCHYARD, [x, z], true) > 1);

/** The gravestones: rows of them, each [x, z, turn, kind] (0 an upright headstone, 1 a cross, 2 a low chest tomb), on
 * the hill round the church, off the path and clear of the church and the yard's edge */
export const GRAVES: [number, number, number, number][] = (() => {
  const r = seeded(1880);
  const out: [number, number, number, number][] = [];
  const clear = (p: Pt) =>
    inside(CHURCHYARD, p) &&
    distTo(CHURCHYARD, p, true) > 1.2 &&
    PARTS.every((q) => p[0] < q[0] - 1.4 || p[0] > q[2] + 1.4 || p[1] < q[1] - 1.4 || p[1] > q[3] + 1.4) &&
    distTo(CHURCH_PATH, p) > PATH_W / 2 + 0.6 &&
    Math.hypot(p[0] - LYCHGATE.at[0], p[1] - LYCHGATE.at[1]) > 2.5 &&
    YEWS.every(([x, z]) => Math.hypot(p[0] - x, p[1] - z) > 1.7);
  for (let z = 451.5; z < 475; z += 1.9)
    for (let x = -221; x < -189; x += 1.25) {
      const p: Pt = [x + (r() - 0.5) * 0.4, z + (r() - 0.5) * 0.3];
      if (!clear(p) || r() < 0.3) continue;
      const k = r();
      out.push([p[0], p[1], (r() - 0.5) * 0.15, k < 0.7 ? 0 : k < 0.88 ? 1 : 2]);
    }
  return out;
})();
/* ---------- Solids ---------- */

/** The church's parts (their tops over its base: not lifted again), and on the ground the lychgate's posts and the
 * graves (lifted with it, solids.ts) */
export const CHURCH_SOLIDS: Box[] = [
  ...cover(corners(NAVE), CHURCH_BASE + HEIGHTS.nave + HEIGHTS.naveRoof, 0.6),
  ...cover(corners(CHANCEL), CHURCH_BASE + HEIGHTS.chancel + HEIGHTS.chancelRoof, 0.6),
  ...cover(corners(TOWER), CHURCH_BASE + SPIRE_TIP, 0.6),
  ...cover(corners(PORCH), CHURCH_BASE + HEIGHTS.porch + HEIGHTS.porchRoof, 0.6),
];
export const CHURCHYARD_SOLIDS: Box[] = [
  ...[-1, 1].map((s): Box => {
    const [x, z] = [LYCHGATE.at[0] + (s * LYCHGATE.w) / 2 - s * 0.15, LYCHGATE.at[1]];
    return [x - 0.15, z - 0.15, x + 0.15, z + 0.15, LYCHGATE.h];
  }),
  ...GRAVES.map(([x, z, , k]): Box => (k === 2 ? [x - 0.5, z - 0.3, x + 0.5, z + 0.3, 0.5] : [x - 0.3, z - 0.1, x + 0.3, z + 0.1, k === 1 ? 0.9 : 0.75])),
];

/** The churchyard's low stone wall: round its edge, open at the lychgate (each run in short pieces for its solids) */
export const YARD_WALL_H = 0.7;
export const YARD_WALL: [Pt, Pt][] = (() => {
  const out: [Pt, Pt][] = [];
  const gap = LYCHGATE.w / 2 - 0.15;
  CHURCHYARD.forEach((a, i) => {
    const c = CHURCHYARD[(i + 1) % CHURCHYARD.length];
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const n = Math.max(1, Math.ceil(l / 0.8));
    for (let k = 0; k < n; k++) {
      const [p, q] = [k / n, (k + 1) / n].map((f): Pt => [a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f]);
      const m: Pt = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      if (Math.abs(m[0] - LYCHGATE.at[0]) < gap + 0.4 && Math.abs(m[1] - LYCHGATE.at[1]) < 2) continue;
      out.push([p, q]);
    }
  });
  return out;
})();
CHURCHYARD_SOLIDS.push(
  ...YARD_WALL.map(([p, q]): Box => [Math.min(p[0], q[0]) - 0.12, Math.min(p[1], q[1]) - 0.12, Math.max(p[0], q[0]) + 0.12, Math.max(p[1], q[1]) + 0.12, YARD_WALL_H])
);
