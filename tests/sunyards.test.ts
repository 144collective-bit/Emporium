// Sunridge's yards (sunyards.ts, docs/suburb-plan.md Phase 3): desert and lawn fronts about half each, the plants on
// their own lot clear of the driveway, the walk and the house; the block walls off every street and through no house,
// never doubled; the returns' gates; the pools and back-yard things inside the back yard; their solids.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WALLS, YARDS, YARD_SOLIDS } from '../src/scripts/city3d/sunyards';
import { HOUSES, toWorld } from '../src/scripts/city3d/sunhouses';
import { LOTS, outline } from '../src/scripts/city3d/sunridgelots';
import { SUN_LAMPS, SUN_STREETS, distTo, inside, type Pt } from '../src/scripts/city3d/sunridge';
import { WALK_W } from '../src/scripts/city3d/layout';

const houses = new Map(HOUSES.map((h) => [h.id, h]));
const lots = new Map(LOTS.map((l) => [l.id, l]));
const inPart = (h: (typeof HOUSES)[number], p: Pt, m = 0) =>
  h.parts.some((q) => {
    const [u, v] = [(p[0] - h.o[0]) * h.u[0] + (p[1] - h.o[1]) * h.u[1], (p[0] - h.o[0]) * h.v[0] + (p[1] - h.o[1]) * h.v[1]];
    return u > q.u0 + m && u < q.u1 - m && v > q.v0 + m && v < q.v1 - m;
  });

test('a yard a house, desert and lawn about half each, the plants on their lot clear of the driveway, the walk and the house', () => {
  assert.equal(YARDS.length, HOUSES.length);
  const treed = YARDS.filter((y) => y.plants.some((p) => ['paloverde', 'saguaro', 'palm', 'shade'].includes(p.kind))).length / YARDS.length;
  assert.ok(treed > 0.9, `only ${(treed * 100).toFixed(0)}% of the fronts have a tree`);
  const desert = YARDS.filter((y) => y.front === 'desert').length / YARDS.length;
  assert.ok(desert > 0.35 && desert < 0.7, `${(desert * 100).toFixed(0)}% desert`);
  for (const y of YARDS) {
    const h = houses.get(y.house)!;
    const lot = outline(lots.get(h.lot)!);
    for (const p of y.plants) {
      const w = toWorld(h, p.u, p.v);
      assert.ok(inside(lot, w), `${y.house}'s ${p.kind} off its lot`);
      assert.ok(!(p.u > h.drive[0] && p.u < h.drive[1] && p.v < h.garageDoor.v), `${y.house}'s ${p.kind} on the driveway`);
      assert.ok(!inPart(h, w, -0.1), `${y.house}'s ${p.kind} in the house`);
    }
    for (const g of y.ground) for (const [u, v] of g) assert.ok(inside(lot, toWorld(h, u, v)) || distTo(lot, toWorld(h, u, v), true) < 0.05, `${y.house}'s ground off its lot`);
  }
});

test('the block walls: off every street and sidewalk, through no house, never two along the same line', () => {
  assert.ok(WALLS.length > HOUSES.length * 2);
  for (const w of WALLS) {
    const pts: Pt[] = [0, 0.25, 0.5, 0.75, 1].map((t) => [w.a[0] + (w.b[0] - w.a[0]) * t, w.a[1] + (w.b[1] - w.a[1]) * t]);
    for (const p of pts) {
      assert.ok(SUN_STREETS.every((s) => distTo(s.pts, p, !!s.loop) > s.half + WALK_W - 0.05), `a wall on a street at ${p}`);
      for (const h of HOUSES) assert.ok(!inPart(h, p, 0.1), `a wall through ${h.id} at ${p}`);
    }
    for (const [x, z] of SUN_LAMPS) assert.ok(distTo([w.a, w.b], [x, z]) > 0.2, 'a wall through a lamp');
  }
  // (no two walls lying along each other: the middle of each well off every other wall but where they meet end to end)
  for (const [i, a] of WALLS.entries()) {
    const mid: Pt = [(a.a[0] + a.b[0]) / 2, (a.a[1] + a.b[1]) / 2];
    for (const [j, b] of WALLS.entries()) if (i !== j) assert.ok(distTo([b.a, b.b], mid) > 0.12, `walls ${i} and ${j} along each other at ${mid}`);
  }
  assert.ok(WALLS.filter((w) => w.gate).length > HOUSES.length, 'the returns have their gates');
});

test('the back yards: their pools, patios and things inside them; about one in three with a pool; solid walls and sheds', () => {
  const pools = YARDS.filter((y) => y.pool).length / YARDS.length;
  assert.ok(pools > 0.12 && pools < 0.45, `${(pools * 100).toFixed(0)}% with pools`);
  for (const y of YARDS) {
    const h = houses.get(y.house)!;
    const lot = outline(lots.get(h.lot)!);
    const [u0, v0, u1, v1] = y.back;
    if (y.pool) {
      assert.ok(y.pool.u0 >= u0 - 1e-9 && y.pool.u1 <= u1 + 1e-9 && y.pool.v0 >= v0 && y.pool.v1 <= v1 + 1e-9, `${y.house}'s pool outside its back yard`);
      for (const [u, v] of [
        [y.pool.u0, y.pool.v0],
        [y.pool.u1, y.pool.v1],
      ])
        assert.ok(inside(lot, toWorld(h, u, v)));
    }
    for (const e of y.extras) assert.ok(inside(lot, toWorld(h, e.u, e.v)) && e.v > v0, `${y.house}'s ${e.kind} outside its back yard`);
  }
  assert.ok(YARD_SOLIDS.length >= WALLS.length);
});
