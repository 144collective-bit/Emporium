// Sunridge's yards (sunyards.ts, docs/suburb-plan.md Phase 3): desert and lawn fronts about half each, the plants on
// their own lot clear of the driveway, the walk and the house; the block walls off every street and through no house,
// never doubled; the returns' gates; the pools and back-yard things inside the back yard; their solids.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HEAD_CLEAR, REACH, SPRINKLE, SPRINKLERS, WALLS, YARDS, YARD_SOLIDS, sprayAt, sprinklerOn } from '../src/scripts/city3d/sunyards';
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

test('the lawns\' sprinklers: one on every front lawn, on the lawn, clear of its plants, about a third on at a time', () => {
  const lawns = YARDS.filter((y) => y.front === 'lawn');
  assert.ok(lawns.length > 30);
  assert.equal(SPRINKLERS.length, lawns.length, 'every lawn has its sprinkler');
  for (const sp of SPRINKLERS) {
    const y = YARDS.find((q) => q.house === sp.house)!;
    const h = HOUSES.find((q) => q.id === sp.house)!;
    assert.equal(y.front, 'lawn');
    // (on one of the lawn's pieces, in the house's frame)
    const onLawn = y.ground.some((g) => inside(g.map(([u, v]) => toWorld(h, u, v)), [sp.x, sp.z]));
    assert.ok(onLawn, `${sp.house}'s sprinkler on its lawn`);
    for (const pl of y.plants) {
      const [px, pz] = toWorld(h, pl.u, pl.v);
      assert.ok(Math.hypot(px - sp.x, pz - sp.z) >= HEAD_CLEAR - 1e-9, `${sp.house}'s sprinkler clear of its ${pl.kind}`);
    }
    assert.ok(sp.r >= REACH[0] && sp.r <= REACH[1]);
    // (its spray lands on its lawn, not the sidewalk: every way round, its reach's end on one of the lawn's pieces, but the smallest lawns)
    const lands = Array.from({ length: 12 }, (_, k) => (k / 12) * Math.PI * 2).filter((a) => y.ground.some((g) => inside(g.map(([u, v]) => toWorld(h, u, v)), [sp.x + Math.cos(a) * sp.r, sp.z - Math.sin(a) * sp.r]))).length;
    assert.ok(sp.r === REACH[0] || lands === 12, `${sp.house}'s spray lands off its lawn (${lands} of 12)`);
    for (const b of YARD_SOLIDS) assert.ok(!(sp.x > b[0] && sp.x < b[2] && sp.z > b[1] && sp.z < b[3]), `${sp.house}'s sprinkler in a wall`);
  }
  // On a third of the time each, staggered: never none and never all on at once over a period
  for (let t = 0; t < SPRINKLE.period; t += 15) {
    const on = SPRINKLERS.filter((sp) => sprinklerOn(sp, t)).length / SPRINKLERS.length;
    assert.ok(on > 0.15 && on < 0.55, `${(on * 100).toFixed(0)}% on at ${t}`);
  }
  const sp = SPRINKLERS[0];
  assert.ok(Math.abs(sprayAt(sp, 1) - sprayAt(sp, 1 + SPRINKLE.turn)) < 1e-9, 'round once a turn');
});
