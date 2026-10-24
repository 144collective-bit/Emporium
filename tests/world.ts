// Shared bits for the tests: the city's raised ground and box maths.
import { PLAN, inPoly, type Pt } from '../src/scripts/city3d/streetplan';
import type { Box } from '../src/scripts/city3d/solids';

export type Rect = [x0: number, z0: number, x1: number, z1: number];

/** Every raised slab (a downtown block, a district or an extra lot) with its sidewalk: convex outlines */
export const SLABS: Pt[][] = PLAN.slabs;

/** A box's corners, pulled in a hair so a box flush with an edge still counts as inside */
const corners = (b: Rect | Box): Pt[] => {
  const e = 1e-6;
  return [
    [b[0] + e, b[1] + e],
    [b[2] - e, b[1] + e],
    [b[2] - e, b[3] - e],
    [b[0] + e, b[3] - e],
  ];
};
/** Is a box wholly on one slab (slabs are convex, so its corners are enough) */
export const onSlab = (b: Rect | Box) => SLABS.some((s) => corners(b).every((p) => inPoly(s, p)));
/** Is a point on any slab */
export const pointOnSlab = (x: number, z: number) => SLABS.some((s) => inPoly(s, [x, z]));
/** A slab's bounding box */
export const bounds = (s: Pt[]): Rect => [Math.min(...s.map((p) => p[0])), Math.min(...s.map((p) => p[1])), Math.max(...s.map((p) => p[0])), Math.max(...s.map((p) => p[1]))];

/** Do two convex outlines overlap (more than touching): no separating axis among their edges */
export function polysOverlap(a: Pt[], b: Pt[], eps = 1e-6) {
  if (convex(a) && convex(b)) {
    for (const poly of [a, b])
      for (let i = 0; i < poly.length; i++) {
        const p = poly[i];
        const q = poly[(i + 1) % poly.length];
        const ax: Pt = [q[1] - p[1], p[0] - q[0]];
        const proj = (s: Pt[]) => s.map((v) => v[0] * ax[0] + v[1] * ax[1]);
        const pa = proj(a);
        const pb = proj(b);
        if (Math.max(...pa) <= Math.min(...pb) + eps || Math.max(...pb) <= Math.min(...pa) + eps) return false;
      }
    return true;
  }
  // Either is concave (Uptown's blocks round its circle and along its crescent): edges crossing, or a point of one
  // well inside the other
  const cross = (o: Pt, p: Pt, q: Pt) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++) {
      const [p, q] = [a[i], a[(i + 1) % a.length]];
      const [r, s] = [b[j], b[(j + 1) % b.length]];
      const [d1, d2, d3, d4] = [cross(r, s, p), cross(r, s, q), cross(p, q, r), cross(p, q, s)];
      const l1 = Math.hypot(s[0] - r[0], s[1] - r[1]);
      const l2 = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (((d1 > eps * l1 && d2 < -eps * l1) || (d1 < -eps * l1 && d2 > eps * l1)) && ((d3 > eps * l2 && d4 < -eps * l2) || (d3 < -eps * l2 && d4 > eps * l2))) return true;
    }
  const deep = (p: Pt, poly: Pt[]) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [u, v] = [poly[i], poly[j]];
      if (u[1] > p[1] !== v[1] > p[1] && p[0] < ((v[0] - u[0]) * (p[1] - u[1])) / (v[1] - u[1]) + u[0]) inside = !inside;
    }
    if (!inside) return false;
    for (let i = 0; i < poly.length; i++) {
      const [u, v] = [poly[i], poly[(i + 1) % poly.length]];
      const [vx, vz] = [v[0] - u[0], v[1] - u[1]];
      const t = Math.max(0, Math.min(1, ((p[0] - u[0]) * vx + (p[1] - u[1]) * vz) / (vx * vx + vz * vz || 1)));
      if (Math.hypot(p[0] - u[0] - vx * t, p[1] - u[1] - vz * t) < eps * 10) return false;
    }
    return true;
  };
  return a.some((p) => deep(p, b)) || b.some((p) => deep(p, a));
}
/** Is an outline convex (every turn the same way) */
function convex(poly: Pt[]) {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const [o, p, q] = [poly[i], poly[(i + 1) % poly.length], poly[(i + 2) % poly.length]];
    const c = (p[0] - o[0]) * (q[1] - p[1]) - (p[1] - o[1]) * (q[0] - p[0]);
    if (Math.abs(c) < 1e-9) continue;
    if (sign && Math.sign(c) !== sign) return false;
    sign = Math.sign(c);
  }
  return true;
}

export const overlaps = (a: Rect | Box, b: Rect | Box) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
export const inside = (a: Rect | Box, b: Rect | Box) => a[0] >= b[0] && a[2] <= b[2] && a[1] >= b[1] && a[3] <= b[3];
export const pointIn = (x: number, z: number, b: Rect | Box, pad = 0) => x > b[0] - pad && x < b[2] + pad && z > b[1] - pad && z < b[3] + pad;
