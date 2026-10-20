// The street plan as data (streetplan.ts): today's grid described as streets,
// crossings and blocks, matching layout.ts, and the geometry helpers the
// organic redesign will build on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAN, blockAt, distToStreet, gridPlan, inPoly, lanePaths, offsetLine, pointAt, polyArea, polyCentre, streetLength, type Pt, type Street } from '../src/scripts/city3d/streetplan';
import { BLOCKS, BS, CORE_ROADS, EW_ROADS, EXT, EXTRA_LOTS, NS_ROADS, WALK_W, laneCentres } from '../src/scripts/city3d/layout';
import { DISTRICTS } from '../src/data/plots';

const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

test('the grid plan has every road of layout.ts, edge to edge', () => {
  const p = gridPlan();
  assert.equal(p.streets.length, NS_ROADS.length + EW_ROADS.length);
  for (const r of NS_ROADS) assert.ok(p.streets.some((s) => s.pts[0][0] === r.c && s.pts.at(-1)![0] === r.c && s.half === r.half && s.lanes === r.lanes), `north-south road at x ${r.c}`);
  for (const r of EW_ROADS) assert.ok(p.streets.some((s) => s.pts[0][1] === r.c && s.pts.at(-1)![1] === r.c && s.half === r.half && s.lanes === r.lanes), `east-west road at z ${r.c}`);
  for (const s of p.streets) assert.ok(near(streetLength(s), EXT[1] - EXT[0]), `${s.id} runs edge to edge`);
  assert.ok(p.streets.every((s) => s.kind !== 'alley'), 'no alleys yet');
});

test('a crossing wherever two roads meet, lights only on the core streets', () => {
  const p = gridPlan();
  assert.equal(p.crossings.length, NS_ROADS.length * EW_ROADS.length);
  const lit = p.crossings.filter((c) => c.lights);
  assert.equal(lit.length, CORE_ROADS.length * CORE_ROADS.length);
  for (const c of lit) assert.ok(CORE_ROADS.includes(c.at[0]) && CORE_ROADS.includes(c.at[1]));
  // Each crossing's streets really pass through it
  const byId = new Map(p.streets.map((s) => [s.id, s]));
  for (const c of p.crossings) for (const id of c.streets) assert.ok(distToStreet(byId.get(id)!, c.at) < 1e-6, `${id} at ${c.id}`);
});

test('blocks: the core, every district and every extra lot, off the roads', () => {
  const p = gridPlan();
  assert.equal(p.blocks.length, BLOCKS.length * BLOCKS.length + DISTRICTS.length + EXTRA_LOTS.length);
  assert.equal(new Set(p.blocks.map((b) => b.id)).size, p.blocks.length, 'ids are unique');
  for (const d of DISTRICTS) assert.ok(p.blocks.some((b) => b.use === 'district' && b.ref === d.id), `district ${d.id}`);
  for (const b of p.blocks) {
    assert.ok(near(polyArea(b.poly), BS * BS), `${b.id} is a ${BS} x ${BS} block, counter-clockwise`);
    // Every corner, with its sidewalk round it, stays off every road's asphalt
    for (const s of p.streets) for (const q of b.poly) assert.ok(distToStreet(s, q) >= s.half + b.walk - 1e-6, `${b.id} corner ${q} on ${s.id}`);
  }
  // The landmarks' blocks are where landmarks.ts puts them
  assert.equal(blockAt(p, [18.5, 18.5])?.ref, 'emporium');
  assert.equal(blockAt(p, [32.5, 32.5])?.ref, 'plan');
  assert.equal(blockAt(p, [4.5, 4.5])?.use, 'park');
  assert.equal(blockAt(p, [11.5, 4.5]), undefined, 'a street is on no block');
});

test('the city is built from the grid plan for now', () => {
  assert.deepEqual(PLAN, gridPlan());
});

test('lane paths match layout.ts laneCentres on the grid', () => {
  const p = gridPlan();
  NS_ROADS.forEach((r, i) => {
    const lanes = lanePaths(p.streets.find((s) => s.id === `ns${i}`)!);
    const want = laneCentres(r, 'z');
    assert.equal(lanes.length, want.length);
    for (const w of want) assert.ok(lanes.some((l) => l.dir === w.dir && near(l.pts[0][0], w.coord)), `x ${w.coord} dir ${w.dir}`);
  });
  EW_ROADS.forEach((r, i) => {
    const lanes = lanePaths(p.streets.find((s) => s.id === `ew${i}`)!);
    const want = laneCentres(r, 'x');
    for (const w of want) assert.ok(lanes.some((l) => l.dir === w.dir && near(l.pts[0][1], w.coord)), `z ${w.coord} dir ${w.dir}`);
  });
  const alley: Street = { id: 'a', kind: 'alley', pts: [[0, 0], [5, 0]], half: 0.7, lanes: 0 };
  assert.deepEqual(lanePaths(alley), [], 'no cars down an alley');
});

test('points along a bent street, and offsets that keep their width round the bend', () => {
  const s: Street = { id: 'b', kind: 'street', pts: [[0, 0], [10, 0], [10, 10]], half: 1.7, lanes: 1 };
  assert.ok(near(streetLength(s), 20));
  const mid = pointAt(s, 15);
  assert.deepEqual(mid.at, [10, 5]);
  assert.deepEqual(mid.dir, [0, 1]);
  assert.deepEqual(pointAt(s, 99).at, [10, 10], 'clamped to the end');
  // Offset 1 to the right of travel: along +x that's +z, then along +z it's -x
  const off = offsetLine(s.pts, 1);
  assert.deepEqual(off[0], [0, 1]);
  assert.ok(near(off[1][0], 9) && near(off[1][1], 1), 'the corner is mitred');
  assert.ok(near(off[2][0], 9) && near(off[2][1], 10));
});

test('outlines: inside, area and centre', () => {
  const sq: Pt[] = [
    [0, 0],
    [0, 4],
    [4, 4],
    [4, 0],
  ];
  assert.ok(inPoly(sq, [2, 2]));
  assert.ok(!inPoly(sq, [5, 2]));
  assert.equal(polyArea(sq), 16);
  assert.equal(polyArea([...sq].reverse()), -16);
  assert.deepEqual(polyCentre(sq), [2, 2]);
  // An L-shaped block (the kind the redesign brings)
  const L: Pt[] = [
    [0, 0],
    [0, 6],
    [6, 6],
    [6, 4],
    [2, 4],
    [2, 0],
  ];
  assert.ok(inPoly(L, [1, 1]) && inPoly(L, [5, 5]) && !inPoly(L, [4, 2]));
  assert.equal(polyArea(L), 6 * 2 + 4 * 2);
  assert.ok(WALK_W > 0);
});
