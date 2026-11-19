// Cutting convex holes out of flat shapes (holes.ts, docs/south-plan.md Phase 4b): what's left covers exactly the
// piece less the hole, never inside the hole, whichever way either is wound.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { area2, disc, fan, minusAll, minusConvex, type Pt } from '../src/scripts/city3d/holes';

const areaOf = (pieces: Pt[][]) => pieces.reduce((s, p) => s + Math.abs(area2(p)) / 2, 0);
const insideConvex = (poly: Pt[], [x, z]: Pt) => {
  const s = Math.sign(area2(poly));
  return poly.every((a, i) => {
    const b = poly[(i + 1) % poly.length];
    return s * ((b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0])) > 1e-9;
  });
};

test('a square less a square in its middle leaves the ring round it, nothing in the hole', () => {
  const sq: Pt[] = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const hole: Pt[] = [[4, 4], [6, 4], [6, 6], [4, 6]];
  const left = minusConvex(sq, hole);
  assert.ok(Math.abs(areaOf(left) - 96) < 1e-9);
  for (const p of left) for (const q of p) assert.ok(!insideConvex(hole, q));
  // (wound the other way, the same)
  assert.ok(Math.abs(areaOf(minusConvex([...sq].reverse(), [...hole].reverse())) - 96) < 1e-9);
});

test('a hole over an edge or a corner cuts what it covers; one apart leaves it whole; one over it all leaves nothing', () => {
  const tri: Pt[] = [[0, 0], [10, 0], [0, 10]];
  assert.ok(Math.abs(areaOf(minusConvex(tri, [[-1, -1], [2, -1], [2, 2], [-1, 2]])) - (50 - 4)) < 1e-9);
  assert.deepEqual(minusConvex(tri, [[20, 20], [22, 20], [22, 22]]), [tri]);
  assert.equal(areaOf(minusConvex(tri, [[-5, -5], [20, -5], [20, 20], [-5, 20]])), 0);
});

test('a slanted strip and a disc together cut out what they cover between them, and the fan covers what is left', () => {
  const sq: Pt[] = [[0, 0], [20, 0], [20, 20], [0, 20]];
  const strip: Pt[] = [[2, 3], [18, 15], [16.8, 16.6], [0.8, 4.6]];
  const round = disc(10, 10, 3, 48);
  const left = minusAll(sq, [strip, round]);
  // (sample the square: a point is in what's left exactly when it's in neither hole)
  const tris = fan(left);
  for (let x = 0.25; x < 20; x += 0.5)
    for (let z = 0.25; z < 20; z += 0.5) {
      const p: Pt = [x, z];
      const holed = insideConvex(strip, p) || insideConvex(round, p);
      const kept = tris.some((t) => insideConvex(t, p));
      if (holed) assert.ok(!kept, `${x}, ${z} kept in a hole`);
      else if (![strip, round].some((h) => h.some((q, i) => near(p, q, h[(i + 1) % h.length])))) assert.ok(kept, `${x}, ${z} lost`);
    }
});
/** Is p within a hair of the edge q to r (an edge's points may land either side) */
function near(p: Pt, q: Pt, r: Pt) {
  const [vx, vz] = [r[0] - q[0], r[1] - q[1]];
  const t = Math.max(0, Math.min(1, ((p[0] - q[0]) * vx + (p[1] - q[1]) * vz) / (vx * vx + vz * vz)));
  return Math.hypot(p[0] - q[0] - vx * t, p[1] - q[1] - vz * t) < 1e-6;
}
