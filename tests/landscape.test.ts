// Crestmont's planting and the hill roads' walls (landscape.ts, docs/crestmont-plan.md Phase 3): palms along the
// Flats' streets, the boulevard's median, Foothill Road and up Ridge Road; jacarandas along the east-west roads;
// oaks and scrub on the hills off the roads; retaining walls where the roads are cut in and rails where they're
// built up. Nothing on the asphalt or a sidewalk, everything on the ground, every palm under the Emporium.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EDGE_AT, EDGE_OUT, JACARANDAS, OAKS, PALMS, PALM_TALLEST, SCRUB, WALLS, frameAt } from '../src/scripts/city3d/landscape';
import { BOULEVARD, BOULEVARD_MEDIAN, CREST_LAMPS, FLATS_X, HILL_ROADS, nearHillRoad } from '../src/scripts/city3d/crestmont';
import { heightAt, naturalAt } from '../src/scripts/city3d/terrain';
import { PLAN, distToStreet, onSlab } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import { WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { treeSpot } from '../src/scripts/city3d/outskirts';

type Pt = [number, number];
const streets = PLAN.streets.filter((s) => s.kind !== 'alley');
const inSolid = (x: number, z: number) => SOLIDS.some((b) => x > b[0] && x < b[2] && z > b[1] && z < b[3]);

test('the palms: along the streets, never on the asphalt or a sidewalk, clear of the lamps and each other, under the Emporium', () => {
  assert.ok(PALMS.length > 60);
  assert.ok(PALMS.some((p) => p.kind === 'date') && PALMS.some((p) => p.kind === 'fan'));
  const blvd = FLATS_X[BOULEVARD];
  const median = PALMS.filter((p) => Math.abs(p.x - blvd) < 1e-9);
  assert.ok(median.length >= 8, 'the boulevard has its palms');
  for (const p of PALMS) {
    assert.ok(p.x > WORLD_BOUNDS[0] && p.x < WORLD_BOUNDS[2]);
    assert.ok(p.h + 1.2 <= PALM_TALLEST && PALM_TALLEST < EMPORIUM_ROOF, `a palm ${p.h.toFixed(1)} high`);
    assert.ok(Math.abs(p.y - heightAt(p.x, p.z)) < 0.2 || p.y > 0, 'a palm off the ground');
    // On the boulevard's median (inside its kerb), or off every street's asphalt and sidewalk
    if (median.includes(p)) assert.ok(Math.abs(p.x - blvd) < BOULEVARD_MEDIAN / 2 - 0.4);
    else for (const s of streets) assert.ok(distToStreet(s, [p.x, p.z]) > s.half + 0.85, `a palm at ${p.x.toFixed(1)}, ${p.z.toFixed(1)} on ${s.id}`);
    assert.ok(CREST_LAMPS.every(([x, z]) => Math.hypot(x - p.x, z - p.z) > 1.7), 'a palm in a lamp');
    assert.ok(!inSolid(p.x, p.z));
  }
  for (const [i, a] of PALMS.entries()) for (const b of PALMS.slice(i + 1)) assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 2, 'two palms in one spot');
});

test('the jacarandas: on the lots along the east-west roads, off the asphalt', () => {
  assert.ok(JACARANDAS.length > 30);
  for (const j of JACARANDAS) {
    for (const s of streets) assert.ok(distToStreet(s, [j.x, j.z]) > s.half + 0.7, `a jacaranda on ${s.id}`);
    assert.ok(onSlab(PLAN, [j.x, j.z]), 'a jacaranda off the lots');
  }
});

test("the hills' oaks and scrub: on the hills, off the roads and their beds, on the ground", () => {
  assert.ok(OAKS.length > 200 && SCRUB.length > 1000);
  for (const p of [...OAKS, ...SCRUB]) {
    assert.ok(naturalAt(p.x, p.z) > 0, 'planted off the hills');
    assert.ok(!nearHillRoad(p.x, p.z, 1.5), `planted on a road at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
    assert.ok(Math.abs(p.y - heightAt(p.x, p.z)) < 1e-9);
  }
  for (const [i, a] of OAKS.entries()) for (const b of OAKS.slice(i + 1)) assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 3, 'two oaks in one spot');
  // The outskirts' trees and the woods keep off the hills now
  for (const o of OAKS) if (naturalAt(o.x, o.z) > 0.4) assert.equal(treeSpot(o.x, o.z), false);
});

test("the hill roads' edges: a wall where the road is cut in, a rail where it's built up, on the bed's shoulder", () => {
  const walls = WALLS.filter((w) => w.kind === 'wall');
  const rails = WALLS.filter((w) => w.kind === 'rail');
  assert.ok(walls.length > 50 && rails.length > 10);
  for (const w of WALLS) {
    const r = HILL_ROADS.find((q) => q.id === w.road)!;
    // Its ends just past the asphalt (on the bed: the ground there is the road's)
    for (const [p, y] of [
      [w.a, w.ya],
      [w.b, w.yb],
    ] as [Pt, number][]) {
      const d = distToStreet(PLAN.streets.find((s) => s.id === r.id)!, p);
      assert.ok(Math.abs(d - EDGE_OUT) < 0.25, `${w.road}'s edge ${d.toFixed(2)} out`);
      assert.ok(Math.abs(heightAt(...p) - y) < 0.5, `${w.road}'s edge off the bed`);
      // ...never on another road
      for (const s of streets) if (s.id !== r.id) assert.ok(distToStreet(s, p) > s.half + 0.5, `${w.road}'s edge on ${s.id}`);
    }
    if (w.kind === 'wall') assert.ok(w.h > 0.3 && w.h <= 1.8);
  }
  // A wall stands where the hills rise past the road, a rail where they fall away
  for (const w of WALLS) {
    const r = HILL_ROADS.find((q) => q.id === w.road)!;
    const m: Pt = [(w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2];
    const c = r.pts.reduce((best, q) => (Math.hypot(q[0] - m[0], q[1] - m[1]) < Math.hypot(best[0] - m[0], best[1] - m[1]) ? q : best));
    const out: Pt = [m[0] + ((m[0] - c[0]) / EDGE_OUT) * 4, m[1] + ((m[1] - c[1]) / EDGE_OUT) * 4];
    const y = (w.ya + w.yb) / 2;
    if (w.kind === 'wall') assert.ok(naturalAt(...out) - y > EDGE_AT.cut - 0.6, `a wall where ${w.road} isn't cut in`);
    else assert.ok(y - naturalAt(...out) > EDGE_AT.fill - 0.6, `a rail where ${w.road} isn't built up`);
  }
  assert.ok(frameAt(HILL_ROADS[0], 10).u.every(Number.isFinite));
});
