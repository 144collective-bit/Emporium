// The open slopes' cover (crestcover.ts): drifts of shrubs and outcrops of boulders on the open hills, off the roads,
// the pads, the landmarks, the land round the houses and the oaks; footpaths between the roads where they save a
// long way round, gentle enough to walk, with bollards at each end.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOLLARDS, DRIFTS, GARDEN_PATHS, GARDEN_PATH, GATES, OUTCROPS, PATH_BOLLARDS, PATH_LIGHTS, TRAIL, TRAILS, onGardenPath, onTrail, open } from '../src/scripts/city3d/crestcover';
import { BED, nearHillRoad } from '../src/scripts/city3d/crestmont';
import { heightAt } from '../src/scripts/city3d/terrain';
import { MANSIONS, PAD_EASE, onMansion, toWorld } from '../src/scripts/city3d/mansions';
import { onSite } from '../src/scripts/city3d/crestsites';
import { onLand } from '../src/scripts/city3d/crestland';

test('the drifts and outcrops: on the open slopes, off everything there and the footpaths', () => {
  assert.ok(DRIFTS.length >= 40 && OUTCROPS.length >= 10);
  for (const d of DRIFTS) {
    assert.ok(d.clumps.length >= 3);
    for (const c of d.clumps) {
      assert.ok(open(c.x, c.z), `a drift's clump on taken ground at ${c.x.toFixed(1)}, ${c.z.toFixed(1)}`);
      assert.ok(Math.abs(c.y - heightAt(c.x, c.z)) < 1e-9 && !onTrail(c.x, c.z));
    }
  }
  for (const o of OUTCROPS) for (const r of o) assert.ok(open(r.x, r.z) && !onTrail(r.x, r.z) && Math.abs(r.y - heightAt(r.x, r.z)) < 1e-9);
  for (const [x, z] of DRIFTS.flatMap((d) => d.clumps.map((c) => [c.x, c.z]))) assert.ok(!onMansion(x, z, 1) && !onSite(x, z) && !onLand(x, z));
});

test('the footpaths: from a road to a road, clear on the way, never steeper than they may climb, bollards at each end', () => {
  assert.ok(TRAILS.length >= 1);
  for (const t of TRAILS) {
    assert.ok(t.pts.length >= 10);
    for (const [k, p] of t.pts.entries()) {
      assert.ok(!nearHillRoad(p[0], p[1], BED.shoulder + 0.2), `a footpath on a road at ${p[0].toFixed(1)}, ${p[1].toFixed(1)}`);
      assert.ok(!onMansion(p[0], p[1], 1) && !onSite(p[0], p[1], 0.5));
      if (k > 0) {
        const q = t.pts[k - 1];
        const run = Math.hypot(p[0] - q[0], p[1] - q[1]);
        assert.ok(run < TRAIL.step * 2 && Math.abs(p[2] - q[2]) <= TRAIL.grade * run + 1e-9, 'a footpath too steep');
      }
    }
    // (each end at a road's verge: a road within a few tiles)
    for (const p of [t.pts[0], t.pts[t.pts.length - 1]]) assert.ok(nearHillRoad(p[0], p[1], BED.shoulder + 2));
  }
  assert.equal(BOLLARDS.length, TRAILS.length * 4);
  for (const [x, z] of BOLLARDS) assert.ok(!nearHillRoad(x, z, 0.5));
});

test("the garden paths: from a mansion's gate to a neighbour's or down to a road, clear of everything else, gentle, bollards at a road", () => {
  assert.ok(GARDEN_PATHS.length >= 3, 'the gardens have no paths');
  const inPad = (r: number[], x: number, z: number, e: number) => x > r[0] - e && x < r[2] + e && z > r[1] - e && z < r[3] + e;
  for (const p of GARDEN_PATHS) {
    const own = MANSIONS.filter((m) => p.gates.some((g) => g.m === m.id));
    assert.equal(own.length, p.gates.length);
    // (it starts at its gate, just past the pad's edge; ends at the other gate, or by a road)
    for (const [k, g] of p.gates.entries()) {
      const m = MANSIONS.find((q) => q.id === g.m)!;
      assert.ok(!m.walled, `${m.id}'s walls opened for a gate`);
      const end = k === 0 ? p.pts[0] : p.pts[p.pts.length - 1];
      const [gx, gz] = toWorld(m, g.u, g.v);
      assert.ok(Math.hypot(end[0] - gx, end[1] - gz) < 0.5, `${m.id}'s path not at its gate`);
    }
    if (p.gates.length === 1) assert.ok(nearHillRoad(p.pts[p.pts.length - 1][0], p.pts[p.pts.length - 1][1], BED.shoulder + 2), 'a garden path ending nowhere');
    for (const [k, q] of p.pts.entries()) {
      for (const m of MANSIONS) {
        const mine = own.includes(m);
        assert.ok(!inPad(m.rect, q[0], q[1], mine ? -0.05 : PAD_EASE + 1), `${p.from}'s path across ${m.id}'s pad`);
      }
      assert.ok(!onSite(q[0], q[1]) && !onLand(q[0], q[1]) && !onTrail(q[0], q[1]), 'a garden path on a landmark, the land or a footpath');
      if (k < p.pts.length - 3) assert.ok(!nearHillRoad(q[0], q[1], BED.shoulder + 0.5), `${p.from}'s path along a road`);
      if (k > 0) {
        const r = p.pts[k - 1];
        const run = Math.hypot(q[0] - r[0], q[1] - r[1]);
        assert.ok(Math.abs(q[2] - r[2]) <= TRAIL.grade * run + 1e-9, 'a garden path too steep');
      }
    }
  }
  // (each house two at most; the gates' list is theirs)
  for (const m of MANSIONS) assert.ok(GATES.filter((g) => g.m === m.id).length <= GARDEN_PATH.perHouse);
  assert.equal(PATH_BOLLARDS.length, GARDEN_PATHS.filter((p) => p.gates.length === 1).length * 2);
  // (the slopes' drifts keep off them)
  for (const d of DRIFTS) for (const c of d.clumps) assert.ok(!onGardenPath(c.x, c.z, 0.3));
});

test('the footpaths lit at night: low lights beside them, never on them nor on a road', () => {
  assert.ok(PATH_LIGHTS.length >= 8);
  const paths = [...TRAILS, ...GARDEN_PATHS];
  for (const [x, z, y] of PATH_LIGHTS) {
    const d = Math.min(...paths.flatMap((t) => t.pts.map((p) => Math.hypot(p[0] - x, p[1] - z))));
    assert.ok(d > TRAIL.half && d < TRAIL.half + 0.9, `a path light ${d.toFixed(2)} from its path`);
    assert.ok(!nearHillRoad(x, z, BED.shoulder + 0.3) && Math.abs(y - heightAt(x, z)) < 1e-9);
  }
});
