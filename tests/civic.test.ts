// The civic quarter (civic.ts, docs/civic-plan.md Phase 1): the square at Westlake Park's south end on the axis, open
// to the avenue; City Hall's, the police headquarters' and the courthouse's lots round it; the walks round City Hall
// joining the park's; nothing on the lake; the park's own trees, lamps, benches and beds kept off it; one line from
// City Hall's door over the zebra and down Uptown's lane to the plaza's cross.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AXIS,
  AXIS_HALF,
  COURT,
  EDGE_XS,
  HALL,
  LOTS,
  PARK_EDGE,
  POLICE,
  SQUARE,
  SQUARE_BENCHES,
  SQUARE_LAMPS,
  SQUARE_TREES,
  inCivic,
  inSquare,
  onLot,
  type Pt,
  type Rect,
} from '../src/scripts/city3d/civic';
import { BENCHES, BIG, GATES, LOOP_OUT, MALL, PARK_LAMPS, PARK_TREES, PATHS, ZS, distToLine, inLake, inPark, onPath } from '../src/scripts/city3d/westlake';
import { MALL_BEDS, PLANTERS, WALLS, WALL } from '../src/scripts/city3d/gardens';
import { PARK_EDGE_TREES } from '../src/scripts/city3d/ringstreet';
import { AXIS_X, AXIS_ZEBRAS, UPTOWN_LANES } from '../src/scripts/city3d/uptown';
import { CENTRE } from '../src/scripts/city3d/plaza';
import { PICNICS } from '../src/scripts/city3d/parklife';

/** Every point of a rectangle, `step` apart */
const fill = (r: Rect, step = 0.5): Pt[] => {
  const out: Pt[] = [];
  for (let x = r[0]; x <= r[2] + 1e-9; x += step) for (let z = r[1]; z <= r[3] + 1e-9; z += step) out.push([x, z]);
  return out;
};
const path = (id: string) => PATHS.find((q) => q.id === id)!;
/** How far a point is from a path's edge */
const fromPath = (id: string, p: Pt) => distToLine(path(id).pts, p, path(id).loop) - path(id).half;
const overlap = (a: Rect, b: Rect) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
const lots = LOTS.flatMap((l) => l.rects);

test('the line: City Hall, the square, the zebra, Uptown\'s lane and the plaza\'s cross on one axis', () => {
  assert.equal(PARK_EDGE, ZS, "the square's mouth on the park's edge");
  assert.equal(AXIS, MALL.x);
  assert.equal(AXIS, AXIS_X);
  assert.equal(CENTRE[0], AXIS, "the plaza's cross on the axis");
  assert.equal(HALL.door[0], AXIS);
  assert.equal(HALL.rear[0], AXIS);
  assert.ok(Math.abs((SQUARE[0] + SQUARE[2]) / 2 - AXIS) < 1e-9, 'the square centred on it');
  for (const r of [HALL.front, HALL.back]) assert.ok(Math.abs((r[0] + r[2]) / 2 - AXIS) < 1e-9, 'City Hall centred on it');
  // The zebra over the avenue in front of the square, and Uptown's lane carrying it on to the plaza
  assert.ok(AXIS_ZEBRAS.some((z) => Math.abs(z.z - z.half - PARK_EDGE) < 1.5), 'a zebra over the avenue at the square');
  assert.ok(UPTOWN_LANES.some((l) => l[0] < AXIS && l[2] > AXIS && l[1] < CENTRE[1]), "Uptown's lane on the axis");
  assert.ok(HALL.door[1] === SQUARE[1], "City Hall's door at the square's head");
});

test('the land: on the park, the square open to the avenue, the lots round it and apart, nothing on the lake', () => {
  for (const p of fill(SQUARE)) if (p[1] < PARK_EDGE - 0.01) assert.ok(inPark(p), `the square off the park at ${p}`);
  assert.equal(SQUARE[3], PARK_EDGE, 'the square reaches the avenue');
  for (const r of lots) for (const p of fill(r)) assert.ok(inPark(p, 3), `a lot near the park's edge at ${p}`);
  // Each lot apart from the others and off the square (City Hall's front meets the square's head)
  for (let i = 0; i < lots.length; i++) {
    for (let j = i + 1; j < lots.length; j++) if (!(lots[i] === HALL.front && lots[j] === HALL.back)) assert.ok(!overlap(lots[i], lots[j]), 'lots apart');
    assert.ok(!overlap(lots[i], SQUARE), 'a lot on the square');
  }
  // Flanking it: the police west, the courthouse east, facing across it
  assert.ok(POLICE[2] < SQUARE[0] && COURT[0] > SQUARE[2]);
  assert.deepEqual(LOTS.find((l) => l.id === 'police')!.faces, [1, 0]);
  assert.deepEqual(LOTS.find((l) => l.id === 'courthouse')!.faces, [-1, 0]);
  // The lake and its loop untouched: every lot and the square well off the water and the loop
  for (const r of [SQUARE, ...lots])
    for (const p of fill(r)) {
      assert.ok(!inLake(p[0], p[1], LOOP_OUT + 2), `on the lake at ${p}`);
      assert.ok(fromPath('loop', p) > 1.5, `on the lake loop at ${p}`);
    }
});

test('the walks: the lots off every path; the Mall from City Hall\'s back door; the walks round it joining the park\'s', () => {
  // (but the Mall, which starts at City Hall's back door, and never further in)
  for (const r of lots) for (const p of fill(r)) for (const q of PATHS) if (!(q.id === 'mall' && r === HALL.back)) assert.ok(fromPath(q.id, p) > 0.8, `${q.id} on a lot at ${p}`);
  for (const p of path('mall').pts) assert.ok(p[1] <= HALL.rear[1], 'the Mall into City Hall');
  // The Mall starts at City Hall's back door, the west walk comes round to it, the way to the lake leaves it
  assert.deepEqual(path('mall').pts[0], HALL.rear);
  const w = path('civic-w').pts;
  assert.ok(inSquare(w[0]), 'the west walk from the square');
  assert.ok(fromPath('mall', w.at(-1)!) < 0, 'the west walk to the Mall');
  assert.ok(fromPath('mall', path('mall-lake').pts[0]) < 0, 'the way to the lake from the Mall');
  const e = path('civic-e').pts;
  assert.ok(inSquare(e[0]), 'the east walk from the square');
  assert.ok(fromPath('loop', e.at(-1)!) < 0, 'the east walk to the lake loop');
  // The square open to the avenue: no gate in its mouth, the park's wall broken along it
  for (const g of GATES) assert.ok(!inSquare(g.at, 1), `${g.id} in the square's mouth`);
  for (const run of WALLS) for (const p of run) assert.ok(!inSquare(p, WALL.w / 2), `the park's wall across the square at ${p}`);
  // (and it stands either side of it)
  assert.ok(WALLS.some((r) => r.some((p) => p[0] < SQUARE[0] && p[0] > SQUARE[0] - 3 && Math.abs(p[1] - ZS) < 1)));
  assert.ok(WALLS.some((r) => r.some((p) => p[0] > SQUARE[2] && p[0] < SQUARE[2] + 3 && Math.abs(p[1] - ZS) < 1)));
});

test("the park's own keep off it: trees, lamps, benches, beds, planters, the edge row and picnics", () => {
  for (const t of PARK_TREES) assert.ok(!inCivic([t.x, t.z], 2), `a park tree on the civic quarter at ${t.x}, ${t.z}`);
  for (const [x, z] of PARK_LAMPS) assert.ok(!inCivic([x, z], 0.5), `a park lamp at ${x}, ${z}`);
  for (const b of BENCHES) assert.ok(!inCivic(b.at, 0.5), `a park bench at ${b.at}`);
  for (const r of MALL_BEDS) assert.ok(!inCivic([(r[0] + r[2]) / 2, (r[1] + r[3]) / 2], 1), `a bed at ${r}`);
  for (const p of PLANTERS) assert.ok(!inCivic(p.at, p.r), `a planter at ${p.at}`);
  for (const [x, z] of PARK_EDGE_TREES) assert.ok(!inCivic([x, z], 1), `an edge tree at ${x}, ${z}`);
  for (const p of PICNICS) assert.ok(!inCivic(p.at, 3), `a picnic at ${p.at}`);
});

test("what stands on the square: on it, off the lots, the walks and each other, along its edges", () => {
  const things: Pt[] = [...SQUARE_TREES, ...SQUARE_LAMPS.map(([x, z]): Pt => [x, z]), ...SQUARE_BENCHES.map((b) => b.at)];
  for (const p of things) {
    assert.ok(inSquare(p, -0.5), `off the square at ${p}`);
    assert.ok(!onLot(p, 0.5), `on a lot at ${p}`);
    assert.ok(!onPath(p, 0.5), `on a walk at ${p}`);
    assert.ok(Math.abs(p[0] - AXIS) > AXIS_HALF + 3, `on the axis at ${p}`);
  }
  for (let i = 0; i < things.length; i++) for (let j = i + 1; j < things.length; j++) assert.ok(Math.hypot(things[i][0] - things[j][0], things[i][1] - things[j][1]) > 0.9, 'apart');
  for (const [x] of SQUARE_TREES) assert.ok(EDGE_XS.includes(x));
  // Benches face the axis
  for (const b of SQUARE_BENCHES) assert.ok(Math.sign(Math.sin(b.ry)) === Math.sign(AXIS - b.at[0]), `a bench at ${b.at} facing away`);
  assert.ok(SQUARE_TREES.length >= 6 && SQUARE_LAMPS.length >= 6 && SQUARE_BENCHES.length >= 4);
  // On the park's land
  for (const p of things) assert.ok(inPark(p, 1) || BIG.length === 0);
});
