// Crestmont's streets (crestmont.ts, docs/crestmont-plan.md Phase 2): the Flats' grid across downtown's east-west
// roads past the highway up to Foothill Road, the boulevard with its median, and the hill roads graded up the hills
// on their beds (terrain.ts), with traffic up one and down the other and none on the cul-de-sacs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BED,
  BOULEVARD,
  CREST_BLOCKS,
  CREST_CROSSINGS,
  CREST_LAMPS,
  CREST_STREETS,
  FLATS_STREETS,
  FLATS_X,
  FOOTHILL_Z,
  HILL_ROADS,
  MAX_GRADE,
  nearHillRoad,
  roadY,
} from '../src/scripts/city3d/crestmont';
import { HILLS, heightAt, naturalAt } from '../src/scripts/city3d/terrain';
import { PLAN, distToStreet, onSlab } from '../src/scripts/city3d/streetplan';
import { EW_ROADS, WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { HIGHWAY_BOX, HIGHWAY_HALF, fromHighway } from '../src/scripts/city3d/highway';
import { ROUTES, pointOn } from '../src/scripts/city3d/routes';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { treeSpot } from '../src/scripts/city3d/outskirts';

type Pt = [number, number];

test('in the street plan: every street and crossing, the blocks off the asphalt, inside the world, east of the highway', () => {
  for (const s of CREST_STREETS) {
    const p = PLAN.streets.find((q) => q.id === s.id);
    assert.ok(p, `${s.id} isn't in the plan`);
    assert.equal(p!.lanes, 1);
    for (const [x, z] of s.pts) {
      assert.ok(x > HIGHWAY_BOX[2] && fromHighway(x, z) > HIGHWAY_HALF + 8, `${s.id} at ${x}, ${z} is on the highway`);
      assert.ok(x > WORLD_BOUNDS[0] && x < WORLD_BOUNDS[2] && z > WORLD_BOUNDS[1] && z < WORLD_BOUNDS[3]);
    }
  }
  for (const c of CREST_CROSSINGS) {
    const k = PLAN.crossings.find((q) => q.id === c.id)!;
    // Every street it names runs through or ends exactly there
    for (const id of k.streets) assert.ok(distToStreet(PLAN.streets.find((s) => s.id === id)!, c.at) < 1e-6, `${c.id}: ${id}`);
  }
  // The Flats' streets cross every east-west road up to the bank avenue, lit at the avenues
  for (const [i] of FLATS_X.entries())
    for (const [j, r] of EW_ROADS.entries()) {
      if (r.c > EW_ROADS[3].c) continue;
      const c = CREST_CROSSINGS.find((q) => q.id === `crest-ns${i}-ew${j}`);
      assert.ok(c && c.lights === (r.lanes === 2));
    }
  // The blocks: off every street's asphalt and sidewalk, flat, inside where you can walk
  for (const b of CREST_BLOCKS) {
    const [x0, z0, x1, z1] = b.rect;
    assert.ok(x1 - x0 > 12 && z1 - z0 > 10, `${b.id} is too small`);
    assert.ok(x1 < WORLD_BOUNDS[2] - 1);
    for (const p of [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [(x0 + x1) / 2, (z0 + z1) / 2]] as Pt[]) {
      assert.equal(heightAt(...p), 0, `${b.id} is on the hills`);
      for (const s of PLAN.streets) assert.ok(distToStreet(s, p) > s.half + 0.79 || s.kind === 'alley', `${b.id} on ${s.id}`);
      assert.ok(onSlab(PLAN, [p[0] + (p[0] === x0 ? 0.1 : -0.1), p[1] + (p[1] === z0 ? 0.1 : -0.1)]));
    }
  }
  // The boulevard carries its median, its lanes either side
  const blvd = PLAN.streets.find((s) => s.id === `crest-ns${BOULEVARD}`)!;
  assert.ok(blvd.median && blvd.half > blvd.median / 2 + 1.6);
});

test('the hill roads: graded no steeper than MAX_GRADE, level with the Flats at their feet, meeting Ridge Road level', () => {
  const ridge = HILL_ROADS.find((r) => r.id === 'crest-ridge')!;
  for (const r of HILL_ROADS) {
    for (let i = 1; i < r.pts.length; i++) {
      const g = Math.abs(r.y[i] - r.y[i - 1]) / (r.cum[i] - r.cum[i - 1]);
      assert.ok(g <= MAX_GRADE + 1e-9, `${r.id} climbs ${(g * 100).toFixed(0)}% at ${r.pts[i]}`);
      // Smooth: a point every couple of tiles, no kinks sharper than a bend
      assert.ok(r.cum[i] - r.cum[i - 1] < 2.5);
      if (i > 1) {
        const [a, b, c] = [r.pts[i - 2], r.pts[i - 1], r.pts[i]];
        const turn = Math.abs(Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]));
        assert.ok(Math.min(turn, Math.PI * 2 - turn) < 0.6, `${r.id} kinks at ${b}`);
      }
    }
    // Never far under or over the hills (cut and fill), never under the Flats
    r.pts.forEach(([x, z], i) => {
      assert.ok(r.y[i] >= 0);
      assert.ok(Math.abs(r.y[i] - naturalAt(x, z)) < 8.5, `${r.id} is ${(r.y[i] - naturalAt(x, z)).toFixed(1)} off the hills at ${x.toFixed(0)}, ${z.toFixed(0)}`);
      if (z > HILLS.foot.z) assert.equal(r.y[i], 0, `${r.id} rises on the Flats`);
    });
    // Its ends: at Foothill Road on the Flats, or on Ridge Road at Ridge Road's own height there
    for (const end of [r.pts[0], r.pts[r.pts.length - 1]]) {
      if (Math.abs(end[1] - FOOTHILL_Z) < 1e-9) continue;
      const k = ridge.pts.findIndex((p) => p[0] === end[0] && p[1] === end[1]);
      if (r === ridge || k < 0) continue;
      const mine = end === r.pts[0] ? r.y[0] : r.y[r.y.length - 1];
      assert.ok(Math.abs(mine - ridge.y[k]) < 1e-9, `${r.id} meets Ridge Road off its level`);
    }
  }
  // The roads climb to the ridge: well up the hills
  assert.ok(Math.max(...ridge.y) > 25);
});

test('their beds: the ground under each hill road is its height, level across, its banks eased into the slope', () => {
  for (const r of HILL_ROADS)
    for (let d = 0; d <= r.cum[r.cum.length - 1]; d += 2) {
      let i = 1;
      while (i < r.cum.length - 1 && r.cum[i] < d) i++;
      const [a, b] = [r.pts[i - 1], r.pts[i]];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const f = (d - r.cum[i - 1]) / (r.cum[i] - r.cum[i - 1] || 1);
      const p: Pt = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      const n: Pt = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
      const y = roadY(r, d);
      // On the road, and out to its edges (where two roads meet, between their heights)
      for (const w of [0, r.half, -r.half]) {
        const g = heightAt(p[0] + n[0] * w, p[1] + n[1] * w);
        assert.ok(Math.abs(g - y) < 0.5, `${r.id} at ${d.toFixed(0)}: the ground is ${(g - y).toFixed(2)} off its bed`);
      }
    }
  assert.ok(BED.ease >= 8);
});

test('traffic up Canyon Drive and down Ridge Road (or the other way), none on the cul-de-sacs or past Canyon Drive', () => {
  const near = (r: (typeof HILL_ROADS)[number], d: number) => {
    let i = 1;
    while (i < r.cum.length - 1 && r.cum[i] < d) i++;
    return r.pts[i];
  };
  const drives = (id: string, d: number) => {
    const r = HILL_ROADS.find((q) => q.id === id)!;
    const p = near(r, d);
    return ROUTES.some((route) => {
      for (let s = 0; s < route.len; s += 1.5) {
        const q = pointOn(route, s, 0).at;
        if (Math.hypot(q[0] - p[0], q[1] - p[1]) < r.half) return true;
      }
      return false;
    });
  };
  const canyon = HILL_ROADS.find((r) => r.id === 'crest-canyon')!;
  assert.ok(drives('crest-canyon', canyon.cum.at(-1)! / 2), 'nobody drives Canyon Drive');
  assert.ok(drives('crest-ridge', 80), 'nobody drives Ridge Road');
  const summit = HILL_ROADS.find((r) => r.id === 'crest-summit')!;
  assert.ok(!drives('crest-summit', summit.cum.at(-1)! - 3), 'traffic down a cul-de-sac');
  const ridge = HILL_ROADS.find((r) => r.id === 'crest-ridge')!;
  assert.ok(!drives('crest-ridge', ridge.cum.at(-1)! - 4), 'traffic out to the overlook');
  // The Flats' streets carry traffic too
  for (const s of FLATS_STREETS) {
    const mid: Pt = [(s.pts[0][0] + s.pts[1][0]) / 2, (s.pts[0][1] + s.pts[1][1]) / 2 + 3.1];
    assert.ok(ROUTES.some((route) => {
      for (let p = 0; p < route.len; p += 1) {
        const q = pointOn(route, p, 0).at;
        if (Math.hypot(q[0] - mid[0], q[1] - mid[1]) < s.half + 0.5) return true;
      }
      return false;
    }), `nobody drives ${s.id}`);
  }
});

test("the lamps: on the sidewalk or the hill road's verge, on the ground, never on the asphalt or anything solid", () => {
  assert.ok(CREST_LAMPS.length > 40);
  for (const [x, z, , y] of CREST_LAMPS) {
    for (const s of PLAN.streets) if (s.kind !== 'alley') assert.ok(distToStreet(s, [x, z]) > s.half + 0.2, `a lamp at ${x.toFixed(1)}, ${z.toFixed(1)} on ${s.id}`);
    const ground = onSlab(PLAN, [x, z]) ? 0.15 : heightAt(x, z) + 0.035;
    assert.ok(Math.abs(y - ground) < 0.35, `a lamp at ${x.toFixed(1)}, ${z.toFixed(1)} floats ${(y - ground).toFixed(2)}`);
    assert.ok(!SOLIDS.some((b) => x > b[0] && x < b[2] && z > b[1] && z < b[3]));
  }
});

test("the outskirts' trees keep off the Flats and the hill roads", () => {
  for (const r of HILL_ROADS) for (const [x, z] of r.pts) assert.equal(treeSpot(x, z), false);
  assert.equal(treeSpot(FLATS_X[1] + 10, 0), false);
  assert.ok(nearHillRoad(...HILL_ROADS[0].pts[40]));
  assert.ok(!nearHillRoad(300, -300));
});
