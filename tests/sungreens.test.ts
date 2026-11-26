// Sunridge's greens (sungreens.ts; the improvement loop's J12, R3, the owner's call 2026-11-26: no house taken): a
// footpath from Saguaro and Palo Verde Courts' turning circles across the greens to Mesa Drive's sidewalk, clear of
// every lot, bollards at each end, a bench beside each; trees in groups on the greens, clear of the lots, the paths
// and the street; all of them solid.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GREEN, GREEN_PATHS, GREEN_SOLIDS, GREEN_TREES, PATH_COURTS, lotDist } from '../src/scripts/city3d/sungreens';
import { BULB, COURTS, HALF, MESA, distTo, type Pt } from '../src/scripts/city3d/sunridge';
import { WALK_W } from '../src/scripts/city3d/layout';

const near = (a: Pt, c: Pt) => Math.hypot(a[0] - c[0], a[1] - c[1]);
/** Points every quarter metre along a line */
const along = (pts: Pt[]) =>
  pts.slice(1).flatMap((c, i) => {
    const a = pts[i];
    const n = Math.max(1, Math.ceil(near(a, c) / 0.25));
    return Array.from({ length: n + 1 }, (_, k): Pt => [a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n]);
  });

test('a path from each of the two courts\' circles to Mesa Drive, from sidewalk to sidewalk, clear of every lot', () => {
  assert.deepEqual(GREEN_PATHS.map((g) => g.court), [...PATH_COURTS]);
  for (const g of GREEN_PATHS) {
    const c = COURTS.find((q) => q.id === g.court)!;
    const end = c.pts[c.pts.length - 1];
    const first = g.pts[0];
    const last = g.pts[g.pts.length - 1];
    assert.ok(Math.abs(near(first, end) - (BULB + WALK_W)) < 0.1, `${g.court}: not from the circle's sidewalk`);
    assert.ok(Math.abs(distTo(MESA.pts, last) - (HALF + WALK_W)) < 0.1, `${g.court}: not to Mesa Drive's sidewalk`);
    // (away from the street at both ends, its whole width off every lot)
    for (const p of along(g.pts)) {
      if (near(p, first) < 1.5 || distTo(MESA.pts, p) < HALF + WALK_W + 1.5) continue;
      assert.ok(lotDist(p) >= GREEN.pathW / 2 + GREEN.clear - 1e-6, `${g.court}: in a lot at ${p.map((v) => v.toFixed(1))}`);
    }
    // (not back down beside its own court)
    assert.ok(distTo(c.pts.slice(0, -1), g.pts[1]) > HALF + 3);
  }
});

test('bollards at both ends of each path, either side of it; a bench beside it, off the lots', () => {
  for (const g of GREEN_PATHS) {
    assert.equal(g.bollards.length, 4);
    for (const b of g.bollards) {
      assert.ok(Math.abs(distTo(g.pts, b) - GREEN.bollard.gap / 2) < 0.05, 'a bollard off the path\'s side');
      assert.ok(near(b, g.pts[0]) < 1.5 || near(b, g.pts[g.pts.length - 1]) < 1.5, 'a bollard away from the ends');
    }
    const at: Pt = [g.bench.x, g.bench.z];
    assert.ok(distTo(g.pts, at) > GREEN.pathW / 2 + 0.4 && distTo(g.pts, at) < GREEN.pathW / 2 + 1.2, 'the bench beside the path');
    assert.ok(lotDist(at) > 0.6, 'the bench in a lot');
  }
});

test('trees in groups on the greens: clear of the lots, the paths and Mesa Drive, none on another; all solid', () => {
  assert.ok(GREEN_TREES.length >= 9, `only ${GREEN_TREES.length} trees`);
  for (const [i, t] of GREEN_TREES.entries()) {
    const p: Pt = [t.x, t.z];
    assert.ok(lotDist(p) >= GREEN.treeLot - 1e-9, `tree ${i} by a lot`);
    for (const g of GREEN_PATHS) assert.ok(distTo(g.pts, p) >= GREEN.pathW / 2 + GREEN.treePath - 1e-9, `tree ${i} on a path`);
    assert.ok(distTo(MESA.pts, p) > HALF + WALK_W + 2.5);
    for (const o of GREEN_TREES.slice(i + 1)) assert.ok(near(p, [o.x, o.z]) >= 1.6, 'trees on each other');
    // (in a group: another within 3.5)
    assert.ok(GREEN_TREES.some((o) => o !== t && near(p, [o.x, o.z]) < 3.5), `tree ${i} alone`);
  }
  assert.equal(GREEN_SOLIDS.length, GREEN_TREES.length + GREEN_PATHS.length * 5);
});
