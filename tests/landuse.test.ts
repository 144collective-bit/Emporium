// The one clearing rule (landuse.ts, docs/blend-plan.md Phase 1): everything the outskirts' trees keep off in one
// list, filed by tile, every margin wobbled further out (never in), so tree lines come out ragged. Runs at both world
// sizes (npm run test:wide).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EL_CLEAR, HIGHWAY_VERGE, KEEPS, STREET_VERGE, WOBBLE, keepsNear, keptOff, noise, wobble } from '../src/scripts/city3d/landuse';
import { outskirtsTrees, treeSpot } from '../src/scripts/city3d/outskirts';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { HIGHWAY_HALF, fromHighway } from '../src/scripts/city3d/highway';
import { TRACKS } from '../src/scripts/city3d/metro';
import { RAMPS } from '../src/scripts/city3d/viaduct';
import { EXT, NS_ROADS } from '../src/scripts/city3d/layout';
import { TRENCH_RECT } from '../src/scripts/city3d/trenches';
import { UPTOWN_RECT } from '../src/scripts/city3d/uptown';
import { WESTLAKE_RECT } from '../src/scripts/city3d/westlake';
import { STADIUM_RECTS } from '../src/scripts/city3d/stadium';
import { WATERFRONT_RECT } from '../src/scripts/city3d/waterfront';

const trees = outskirtsTrees(150, 0.6, [], EXT);
const segDist = (p: [number, number], a: [number, number], b: [number, number]) => {
  const vx = b[0] - a[0];
  const vz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / (vx * vx + vz * vz || 1)));
  return Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vz * t);
};

test('the wobble is smooth, between 0 and its most, and only ever adds to a margin', () => {
  for (let x = EXT[0]; x < EXT[1]; x += 7.3)
    for (let z = EXT[0]; z < EXT[1]; z += 11.1) {
      const n = noise(x, z);
      assert.ok(n >= 0 && n <= 1);
      assert.ok(Math.abs(noise(x + 0.5, z) - n) < 0.15, 'smooth');
      // Wherever a keep holds a tree off with its margin as it is, it still does wobbled
      const w = wobble(x, z);
      for (const k of keepsNear(x, z)) if (k.hit(x, z, 0)) assert.ok(k.hit(x, z, w), `${k.id} at ${x}, ${z}`);
    }
});

test('every keep is filed under every tile its box touches', () => {
  for (let x = EXT[0] + 1; x < EXT[1]; x += 13)
    for (let z = EXT[0] + 1; z < EXT[1]; z += 13) {
      const near = keepsNear(x, z);
      for (const k of KEEPS) if (x >= k.box[0] && x <= k.box[2] && z >= k.box[1] && z <= k.box[3]) assert.ok(near.includes(k), `${k.id} near ${x}, ${z}`);
    }
});

test("the trees keep off every street and its verge, the highway's, and the metro's line", () => {
  for (const t of trees) {
    const p: [number, number] = [t.x, t.z];
    assert.ok(fromHighway(t.x, t.z) >= HIGHWAY_HALF + HIGHWAY_VERGE, `a tree on the highway at ${t.x}, ${t.z}`);
    for (const s of PLAN.streets) if (s.kind !== 'highway') assert.ok(distToStreet(s, p) >= s.half + STREET_VERGE, `a tree on ${s.id} at ${t.x}, ${t.z}`);
    for (const tr of Object.values(TRACKS)) for (let i = 1; i < tr.pts.length; i++) assert.ok(segDist(p, tr.pts[i - 1], tr.pts[i]) >= EL_CLEAR, `a tree under the el at ${t.x}, ${t.z}`);
  }
});

test('the districts that used to clear their own land by hand are still clear', () => {
  for (const r of [TRENCH_RECT, UPTOWN_RECT, WESTLAKE_RECT, WATERFRONT_RECT, ...STADIUM_RECTS]) {
    for (let x = r[0]; x <= r[2]; x += 3) for (let z = r[1]; z <= r[3]; z += 3) assert.ok(!treeSpot(x, z), `a tree may stand at ${x}, ${z}`);
    assert.ok(!trees.some((t) => t.x > r[0] - 2 && t.x < r[2] + 2 && t.z > r[1] - 2 && t.z < r[3] + 2));
  }
});

test('a tree line along a street is ragged, not ruled', () => {
  // The east ring avenue north past the highway, through open land: how far from its asphalt the first free spot is,
  // all along it, varies by more than half the wobble
  const road = NS_ROADS[NS_ROADS.length - 1];
  const gaps: number[] = [];
  for (let z = -400; z < -320; z += 2) {
    let d = road.half;
    while (d < road.half + STREET_VERGE + WOBBLE + 2 && !treeSpot(road.c + d, z)) d += 0.1;
    gaps.push(d - road.half);
  }
  const spread = Math.max(...gaps) - Math.min(...gaps);
  assert.ok(Math.min(...gaps) >= STREET_VERGE - 1e-6);
  assert.ok(spread > WOBBLE / 2, `the verge's width varies by ${spread.toFixed(2)}`);
});

test("the raised highway's ramps keep their land clear (docs/highway-plan.md Phase 1b), and nothing grows downtown", () => {
  for (const r of RAMPS) for (const p of r.pts) assert.ok(!treeSpot(p[0], p[1]), `a tree could stand on ${r.id} at ${p.map((v) => v.toFixed(1))}`);
  assert.notEqual(keptOff(30, 30), null, 'nothing grows in downtown');
});
