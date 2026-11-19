/*
 * Cutting convex holes out of flat shapes (DOM-free; docs/south-plan.md Phase 4b): the Circus's sunken plaza and its
 * subways' cuttings out of the blocks' slabs they open through (world.ts) and the junctions' asphalt (south3d.ts). A
 * shape is cut a convex piece at a time (a triangle of its triangulation): what's left of a convex piece outside a
 * convex hole is a few convex pieces, one past each of the hole's edges. Tested in tests/holes.test.ts.
 */
export type Pt = [number, number];

/** Twice the signed area (positive: counter-clockwise, x right and z up as drawn on paper) */
export const area2 = (poly: Pt[]) => poly.reduce((s, p, i) => s + p[0] * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * p[1], 0);

/** What of a convex polygon lies on the side of the line a to b where `side(p) >= 0` */
function clip(poly: Pt[], side: (p: Pt) => number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const [p, q] = [poly[i], poly[(i + 1) % poly.length]];
    const [sp, sq] = [side(p), side(q)];
    if (sp >= 0) out.push(p);
    if ((sp >= 0) !== (sq >= 0)) {
      const t = sp / (sp - sq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}
/** Points closer than this count as one, and pieces thinner than this go */
const EPS = 1e-9;
const tidy = (poly: Pt[]) => poly.filter((p, i) => Math.hypot(p[0] - poly[(i + 1) % poly.length][0], p[1] - poly[(i + 1) % poly.length][1]) > 1e-7);

/** The bounds of some points: x0, z0, x1, z1 */
export const boundsOf = (pts: Pt[]): [number, number, number, number] => [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
const overlaps = (a: [number, number, number, number], b: [number, number, number, number]) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

/** A convex piece less a convex hole: the convex pieces left (the piece itself if they don't meet) */
export function minusConvex(piece: Pt[], hole: Pt[]): Pt[][] {
  if (!overlaps(boundsOf(piece), boundsOf(hole))) return [piece];
  // (the hole's edges each with its inside on the left: wound counter-clockwise)
  const h = area2(hole) >= 0 ? hole : [...hole].reverse();
  const out: Pt[][] = [];
  let rest = piece;
  for (let i = 0; i < h.length && rest.length >= 3; i++) {
    const [a, b] = [h[i], h[(i + 1) % h.length]];
    const left = (p: Pt) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    // (past this edge, outside the hole: kept; the rest goes on to the next edge)
    const outside = tidy(clip(rest, (p) => -left(p)));
    if (outside.length >= 3 && Math.abs(area2(outside)) > EPS) out.push(outside);
    rest = tidy(clip(rest, left));
  }
  return out;
}
/** A convex piece less every hole */
export function minusAll(piece: Pt[], holes: Pt[][]): Pt[][] {
  let pieces = [piece];
  for (const hole of holes) pieces = pieces.flatMap((p) => minusConvex(p, hole));
  return pieces;
}
/** The triangles of a set of convex pieces (a fan each), wound as the piece was */
export const fan = (pieces: Pt[][]): [Pt, Pt, Pt][] => pieces.flatMap((p) => p.slice(1, -1).map((q, i): [Pt, Pt, Pt] => [p[0], q, p[i + 2]]));
/** A regular polygon round (x, z) with its corners `r` out: a circle's hole, the circle inside it */
export const disc = (x: number, z: number, r: number, n = 48): Pt[] => Array.from({ length: n }, (_, i): Pt => [x + r * Math.cos((i / n) * Math.PI * 2), z + r * Math.sin((i / n) * Math.PI * 2)]);
