// The street plan as data (streetplan.ts): the straight grid of layout.ts, the
// city as built (downtown's diagonals, blocks, alleys and squares on top), and
// the geometry helpers they're made with.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAN, blockAt, cityPlan, distToStreet, gridPlan, inPoly, lanePaths, offsetLine, onSlab, outset, pointAt, polyArea, polyCentre, streetLength, type Pt, type Street } from '../src/scripts/city3d/streetplan';
import { BLOCKS, BS, CORE_ROADS, EW_ROADS, EXT, EXTRA_LOTS, NS_ROADS, RING_HI, RING_LO, WALK_W, laneCentres } from '../src/scripts/city3d/layout';
import { BLOCKS_DT, DIAGONALS } from '../src/scripts/city3d/downtown';
import { BEND_KERBS, OUTER_BLOCKS } from '../src/scripts/city3d/outer';
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

test('grid blocks: the core, every district and every extra lot, off the roads', () => {
  const p = gridPlan();
  assert.equal(p.blocks.length, BLOCKS.length * BLOCKS.length + DISTRICTS.length + EXTRA_LOTS.length);
  assert.equal(new Set(p.blocks.map((b) => b.id)).size, p.blocks.length, 'ids are unique');
  for (const d of DISTRICTS) assert.ok(p.blocks.some((b) => b.use === 'district' && b.ref === d.id), `district ${d.id}`);
  for (const b of p.blocks) {
    assert.ok(near(polyArea(b.poly), BS * BS), `${b.id} is a ${BS} x ${BS} block, counter-clockwise`);
    for (const s of p.streets) for (const q of b.poly) assert.ok(distToStreet(s, q) >= s.half + b.walk - 1e-6, `${b.id} corner ${q} on ${s.id}`);
  }
});

test('the city as built: the grid\'s roads, three diagonals from the ring\'s corners, and walk-only alleys', () => {
  const p = cityPlan();
  const g = gridPlan();
  for (const s of g.streets) assert.deepEqual(p.streets.find((t) => t.id === s.id), s, `${s.id} is kept`);
  const diags = p.streets.filter((s) => s.id.startsWith('diag'));
  assert.equal(diags.length, DIAGONALS.length);
  const corners = [RING_LO, RING_HI];
  for (const d of diags) {
    assert.equal(d.kind, 'street');
    assert.equal(d.lanes, 1);
    // From a ring corner to a crossing of the cross streets, at 45 degrees
    assert.ok(corners.includes(d.pts[0][0]) && corners.includes(d.pts[0][1]), `${d.id} starts at a ring corner`);
    assert.ok(CORE_ROADS.includes(d.pts[1][0]) && CORE_ROADS.includes(d.pts[1][1]), `${d.id} ends where the cross streets meet`);
    assert.ok(near(Math.abs(d.pts[1][0] - d.pts[0][0]), Math.abs(d.pts[1][1] - d.pts[0][1])));
    // Both ends are crossings that know it
    for (const end of d.pts) assert.ok(p.crossings.some((c) => c.at[0] === end[0] && c.at[1] === end[1] && c.streets.includes(d.id)), `${d.id} end ${end}`);
  }
  const alleys = p.streets.filter((s) => s.kind === 'alley');
  assert.ok(alleys.length >= 5, 'downtown has its alleys and lanes');
  for (const a of alleys) assert.deepEqual(lanePaths(a), [], 'no cars down an alley');
  // Lights where downtown's cross streets meet, where Liberty Road crosses a straight road, and nowhere else
  for (const c of p.crossings) assert.equal(c.lights, (CORE_ROADS.includes(c.at[0]) && CORE_ROADS.includes(c.at[1])) || (c.streets.includes('liberty') && !c.streets.includes('southside')), c.id);
});

test('the city\'s blocks: downtown\'s outlines, every district and lot, off the asphalt, the landmarks on theirs', () => {
  const p = cityPlan();
  assert.equal(p.blocks.length, BLOCKS_DT.length + OUTER_BLOCKS.length + BEND_KERBS.length);
  // Every plot and every lot sits on an outer block
  for (const d of DISTRICTS) assert.equal(p.blocks.filter((b) => b.pads?.includes(d.id)).length, 1, `plot ${d.id}`);
  assert.equal(p.blocks.flatMap((b) => b.pads ?? []).length, DISTRICTS.length + EXTRA_LOTS.length);
  assert.equal(new Set(p.blocks.map((b) => b.id)).size, p.blocks.length, 'ids are unique');
  assert.equal(p.slabs.length, p.blocks.length);
  const roads = p.streets.filter((s) => s.kind !== 'alley');
  for (const b of p.blocks) {
    assert.ok(polyArea(b.poly) > 0, `${b.id} runs counter-clockwise`);
    // Every corner, with its sidewalk round it, stays off every road's asphalt
    for (const s of roads) for (const q of b.poly) assert.ok(distToStreet(s, q) >= s.half + b.walk - 1e-6, `${b.id} corner ${q} on ${s.id}`);
  }
  // Every landmark has its block
  const places = p.blocks.flatMap((b) => b.places ?? []);
  assert.deepEqual([...new Set(places)].sort(), ['apartments', 'emporium', 'liberty', 'plan', 'shop', 'signal', 'telegram', 'vault', 'workshop']);
  // Liberty Bridge's towers stand either side of Liberty Road at both ends: four blocks
  assert.equal(places.filter((id) => id === 'liberty').length, 4);
  assert.ok(blockAt(p, [30, 36])?.places?.includes('emporium'));
  // The hangout square is the block south of the Emporium's, and there are pocket parks
  assert.ok(p.plazas.some((q) => q.kind === 'hangout' && inPoly(q.poly, [30, 52])));
  assert.equal(p.plazas.filter((q) => q.kind === 'park').length, 3 + 4, 'three pocket parks downtown, four further out');
  assert.equal(p.plazas.filter((q) => q.kind === 'square').length, 4, 'a small square on each side of town');
  // A street, or a diagonal, is on no slab
  assert.ok(!onSlab(p, [17, 30]) && !onSlab(p, [8, 8]) && !onSlab(p, [52, 8]));
  assert.ok(onSlab(p, [30, 36]) && onSlab(p, [19, 30]), 'a lot, and its sidewalk');
});

test('the city is built from the city plan', () => {
  assert.deepEqual(PLAN, cityPlan());
});

test('sidewalks round a triangle are cut square at its sharp tips', () => {
  const tri: Pt[] = [
    [0, 0],
    [0, 10],
    [10, 10],
  ];
  const o = outset(tri, 1);
  // The right-angle corner is mitred (one point), the two 45-degree tips cut (two each)
  assert.equal(o.length, 5);
  for (const q of o) assert.ok(q.every(Number.isFinite));
  assert.ok(o.some((q) => near(q[0], -1) && near(q[1], 11)), 'the square corner');
  // Nothing reaches more than the sidewalk past the outline's own bounds
  for (const q of o) assert.ok(q[0] >= -1 - 1e-9 && q[0] <= 11 + 1e-9 && q[1] >= -1 - 1e-9 && q[1] <= 11 + 1e-9);
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
