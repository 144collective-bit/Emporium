// Westlake Park (westlake.ts, growth plan Phase 9b): its blocks west of town inside the ring highway, clear of the
// highway and its slip lanes, the Parkway, the avenues and everything that was there; the lake, its loop, the paths,
// the gates, trees, lamps and benches where they belong; the stadium's site kept clear.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BENCHES,
  BIG,
  GATES,
  GATE_PIERS,
  LAKE_C,
  LAKE_WALLS,
  LOOP_OUT,
  PARK_LAMPS,
  PARK_TREES,
  PATHS,
  STADIUM_SITE,
  STRIPS,
  WESTLAKE_SOLIDS,
  WESTLAKE_BLOCKS,
  WESTLAKE_RECT,
  distToLine,
  inLake,
  inPark,
  lakeLine,
  lakeR,
  onPath,
} from '../src/scripts/city3d/westlake';
import { PLAN, distToStreet, inPoly, polyArea } from '../src/scripts/city3d/streetplan';
import { fromHighway, insideHighway } from '../src/scripts/city3d/highway';
import { RIVER, WALK_W } from '../src/scripts/city3d/layout';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { STADIUM_SOLIDS } from '../src/scripts/city3d/stadium';
import { PADS } from '../src/scripts/city3d/outer';
import { inTown } from '../src/scripts/city3d/outer';
import { inTrenches } from '../src/scripts/city3d/trenches';
import { RIVER_WALLS } from '../src/scripts/city3d/drive-sim';

type Pt = [number, number];
const edges = (poly: Pt[]) => poly.map((p, i): [Pt, Pt] => [p, poly[(i + 1) % poly.length]]);
const along = (a: Pt, b: Pt, step = 0.5): Pt[] => {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
  return Array.from({ length: n + 1 }, (_, k) => [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n] as Pt);
};

test('its blocks: west of town, north of the river, inside the highway and clear of it, its slips and every street', () => {
  assert.equal(WESTLAKE_BLOCKS.length, 4);
  for (const b of WESTLAKE_BLOCKS) {
    assert.ok(polyArea(b.poly) > 0 || polyArea(b.poly) < 0, `${b.id} has an area`);
    for (const [a, c] of edges(b.poly))
      for (const p of along(a, c)) {
        assert.ok(p[1] < RIVER[0], `${b.id} north of the river at ${p}`);
        assert.ok(insideHighway(p[0], p[1]) && fromHighway(p[0], p[1]) > 10 - 1e-6, `${b.id} clear of the highway at ${p}`);
        assert.ok(!inTown(p), `${b.id} out of town at ${p}`);
        assert.ok(!inTrenches(p[0], p[1]), `${b.id} off The Trenches at ${p}`);
        // Its sidewalk (WALK_W round it) off every street's asphalt, slips and the Parkway included
        for (const s of PLAN.streets) if (s.kind !== 'alley') assert.ok(distToStreet(s, p) > s.half + WALK_W - 0.05, `${b.id}'s sidewalk on ${s.id} at ${p}`);
      }
  }
  // The big one is big, the strips run the park's width
  assert.ok(Math.abs(polyArea(BIG)) > 20000);
  for (const s of STRIPS) assert.ok(Math.abs(s.poly[2][0] - s.poly[0][0]) > 150);
});

test('its blocks are the street plan\'s, and no other block or pad is on them', () => {
  for (const b of WESTLAKE_BLOCKS) {
    const mine = PLAN.blocks.find((x) => x.id === b.id);
    assert.ok(mine, `${b.id} in the plan`);
    assert.equal(mine!.use, 'park');
  }
  const others = PLAN.blocks.filter((x) => !x.id.startsWith('westlake-'));
  for (const b of WESTLAKE_BLOCKS)
    for (const p of b.poly) for (const o of others) assert.ok(!inPoly(o.poly, p), `${b.id}'s corner ${p} in ${o.id}`);
  for (const pad of PADS) assert.ok(!inPark([(pad.rect[0] + pad.rect[2]) / 2, (pad.rect[1] + pad.rect[3]) / 2]), `${pad.id} on the park`);
  // What was solid there before (nothing): the park's land is open (but its own gates and the stadium, stadium.ts)
  const before = SOLIDS.filter((s) => !WESTLAKE_SOLIDS.includes(s as never) && !STADIUM_SOLIDS.includes(s));
  for (const s of before) assert.ok(!inPark([(s[0] + s[2]) / 2, (s[1] + s[3]) / 2]), `a solid on the park at ${s}`);
  const [x0, z0, x1, z1] = WESTLAKE_RECT;
  for (const b of WESTLAKE_BLOCKS) for (const p of b.poly) assert.ok(p[0] >= x0 && p[0] <= x1 && p[1] >= z0 && p[1] <= z1);
});

test('the lake: inside the big block, its loop round it on the park, its walls covering it for cars', () => {
  for (const p of lakeLine(LOOP_OUT + 2, 180)) assert.ok(inPoly(BIG, p), `the loop's land at ${p}`);
  for (let a = 0; a < 2 * Math.PI; a += 0.05) assert.ok(lakeR(a) > 10 && lakeR(a) < 36, `a sensible radius at ${a}`);
  assert.ok(inLake(LAKE_C[0], LAKE_C[1]));
  assert.ok(!inLake(LAKE_C[0] + 40, LAKE_C[1]));
  // A walker's radius keeps them off the water at its edge
  for (const p of lakeLine(0.1, 60)) assert.ok(inLake(p[0], p[1], 0.3), `the edge at ${p} is kept off`);
  // Every point in the water is in one of the cars' walls, and they stay off the paths but the loop's water side
  for (let x = LAKE_C[0] - 36; x < LAKE_C[0] + 36; x += 0.7)
    for (let z = LAKE_C[1] - 36; z < LAKE_C[1] + 36; z += 0.7)
      if (inLake(x, z)) assert.ok(LAKE_WALLS.some((w) => x >= w[0] && x <= w[2] && z >= w[1] && z <= w[3]), `water at ${x}, ${z} walled`);
  for (const w of LAKE_WALLS) assert.ok(!RIVER_WALLS.some((r) => r[1] < w[3] && r[3] > w[1] && r[0] < w[2] && r[2] > w[0]));
});

test('the paths: on the park, off the lake and the stadium\'s site (but its forecourt), each gate on one', () => {
  for (const q of PATHS) {
    const pts = q.loop ? [...q.pts, q.pts[0]] : q.pts;
    for (let i = 1; i < pts.length; i++)
      for (const p of along(pts[i - 1], pts[i], 1)) {
        assert.ok(inPark(p, -0.01), `${q.id} on the park at ${p}`);
        assert.ok(!inLake(p[0], p[1], q.half + 0.5), `${q.id} in the lake at ${p}`);
        const [x0, z0, x1, z1] = STADIUM_SITE;
        assert.ok(!(p[0] > x0 && p[0] < x1 && p[1] > z0 && p[1] < z1), `${q.id} on the stadium's site at ${p}`);
      }
  }
  for (const g of GATES) assert.ok(onPath(g.at), `${g.id} on a path`);
  // Two piers a gate, off its path
  assert.equal(GATE_PIERS.length, GATES.length * 2);
  for (const pr of GATE_PIERS) assert.ok(!onPath([(pr[0] + pr[2]) / 2, (pr[1] + pr[3]) / 2], 0.1), `a pier on a path at ${pr}`);
  for (const pr of GATE_PIERS) assert.ok(SOLIDS.some((s) => s.every((v, i) => v === pr[i])), 'the piers are solid');
});

test('trees, lamps and benches: on the park, off the paths, the water and the stadium\'s site', () => {
  assert.ok(PARK_TREES.length > 300, `${PARK_TREES.length} trees`);
  assert.ok(PARK_TREES.filter((t) => t.clump).length > 150);
  const [x0, z0, x1, z1] = STADIUM_SITE;
  const onSite = (p: Pt, m: number) => p[0] > x0 - m && p[0] < x1 + m && p[1] > z0 - m && p[1] < z1 + m;
  for (const t of PARK_TREES) {
    const p: Pt = [t.x, t.z];
    assert.ok(inPark(p, 1), `a tree off the park at ${p}`);
    assert.ok(!onPath(p, 1), `a tree on a path at ${p}`);
    assert.ok(!inLake(t.x, t.z, LOOP_OUT + 2), `a tree in the lake at ${p}`);
    assert.ok(!onSite(p, 2), `a tree on the stadium's site at ${p}`);
  }
  for (let i = 0; i < PARK_TREES.length; i++)
    for (let j = i + 1; j < PARK_TREES.length; j++) assert.ok(Math.hypot(PARK_TREES[i].x - PARK_TREES[j].x, PARK_TREES[i].z - PARK_TREES[j].z) > 2, 'trees apart');
  assert.ok(PARK_LAMPS.length > 60);
  for (const [x, z] of PARK_LAMPS) {
    assert.ok(inPark([x, z], 0.2), `a lamp off the park at ${x}, ${z}`);
    assert.ok(!onPath([x, z], 0.1), `a lamp on a path at ${x}, ${z}`);
    assert.ok(!inLake(x, z, 1), `a lamp in the lake at ${x}, ${z}`);
    assert.ok(PARK_TREES.every((t) => Math.hypot(t.x - x, t.z - z) > 0.6), `a lamp in a tree at ${x}, ${z}`);
  }
  assert.ok(BENCHES.length > 15);
  for (const b of BENCHES) {
    assert.ok(inPark(b.at, 0.5), `a bench off the park at ${b.at}`);
    assert.ok(!inLake(b.at[0], b.at[1], 0.6), `a bench in the lake at ${b.at}`);
    for (const q of PATHS) if (q.id !== 'loop' && q.id !== 'mall') assert.ok(distToLine(q.pts, b.at, q.loop) > q.half + 0.6, `a bench on ${q.id} at ${b.at}`);
  }
});
