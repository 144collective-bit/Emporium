// Sunridge's yards (sunyards.ts, docs/suburb-plan.md Phase 3): desert and lawn fronts about half each, the plants on
// their own lot clear of the driveway, the walk and the house; the block walls off every street and through no house,
// never doubled; the returns' gates; the pools and back-yard things inside the back yard; their solids.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRESS_FROM, DRESS_R, bedCorners, FLARE, HEAD_CLEAR, REACH, SPRINKLE, SPRINKLERS, WALLS, YARDS, YARD_SOLIDS, behind, gardenFrame, sprayAt, sprinklerOn } from '../src/scripts/city3d/sunyards';
import { HOUSES, toWorld } from '../src/scripts/city3d/sunhouses';
import { GARDENS, LOTS, outline } from '../src/scripts/city3d/sunridgelots';
import { PATH, SUNRIDGE_RECT, SUN_BLOCKS, SUN_LAMPS, SUN_STREETS, ZONES, distTo, inside, type Pt } from '../src/scripts/city3d/sunridge';
import { WALK_W } from '../src/scripts/city3d/layout';

const houses = new Map(HOUSES.map((h) => [h.id, h]));
const lots = new Map(LOTS.map((l) => [l.id, l]));
/** Each lot's garden (Phase 8: grown into the land behind): the yards keep inside it */
const gardens = new Map(GARDENS.map((g) => [g.id, g]));
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
    const lot = gardens.get(h.lot)!.outline;
    for (const p of y.plants) {
      const w = toWorld(h, p.u, p.v);
      // (the front yard is the lot's own; the garden its share of the block behind)
      assert.ok(inside(lot, w) || inside(outline(lots.get(h.lot)!), w), `${y.house}'s ${p.kind} off its lot`);
      assert.ok(!(p.u > h.drive[0] && p.u < h.drive[1] && p.v < h.garageDoor.v), `${y.house}'s ${p.kind} on the driveway`);
      assert.ok(!inPart(h, w, -0.1), `${y.house}'s ${p.kind} in the house`);
    }
    // (on its lot, or out in front of it to the sidewalk's edge: Phase 7, the front carried to the sidewalk)
    const block = SUN_BLOCKS.find((b) => b.id === lots.get(h.lot)!.block)!.poly;
    for (const g of y.ground) for (const [u, v] of g) assert.ok(inside(lot, toWorld(h, u, v)) || distTo(lot, toWorld(h, u, v), true) < 0.35 || (v <= 0 && (inside(block, toWorld(h, u, v)) || distTo(block, toWorld(h, u, v), true) < 0.03)), `${y.house}'s ground off its lot`);
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
    // (walls running the same way, within a quarter of a right angle: a return meeting a side wall at a T isn't along it)
    const dir = (w: typeof a) => Math.atan2(w.b[1] - w.a[1], w.b[0] - w.a[0]);
    const parallel = (b: typeof a) => Math.abs(Math.sin(dir(a) - dir(b))) < Math.sin(Math.PI / 8);
    for (const [j, b] of WALLS.entries()) if (i !== j && parallel(b)) assert.ok(distTo([b.a, b.b], mid) > 0.12, `walls ${i} and ${j} along each other at ${mid}`);
  }
  assert.ok(WALLS.filter((w) => w.gate).length > HOUSES.length, 'the returns have their gates');
});

test('the back yards: their pools, patios and things inside them; about one in three with a pool; solid walls and sheds', () => {
  const pools = YARDS.filter((y) => y.pool).length / YARDS.length;
  assert.ok(pools > 0.12 && pools < 0.45, `${(pools * 100).toFixed(0)}% with pools`);
  for (const y of YARDS) {
    const h = houses.get(y.house)!;
    const lot = gardens.get(h.lot)!.outline;
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

test('the lawns are turf islands in their gravel: inside their pieces, edges soft, no long straight run (Phase 7)', () => {
  for (const y of YARDS) {
    if (y.front === 'desert') {
      assert.equal(y.islands.length, 0);
      continue;
    }
    assert.ok(y.islands.length >= 1 && y.islands.length <= y.ground.length, `${y.house}: its turf`);
    y.islands.forEach((isl, k) => {
      assert.ok(isl.length >= 16, `${y.house}'s island ${k} has ${isl.length} points`);
      assert.ok(y.ground.some((g) => isl.every((p) => inside(g, p))), `${y.house}'s island ${k} out of its piece`);
      // (no edge between neighbouring points longer than a tile and a bit: it bends all the way round)
      for (let i = 0; i < isl.length; i++) {
        const [a, b] = [isl[i], isl[(i + 1) % isl.length]];
        assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.4, `${y.house}'s island ${k} has a straight run`);
      }
    });
  }
  // Each sprinkler's head on its turf
  for (const sp of SPRINKLERS) {
    const y = YARDS.find((q) => q.house === sp.house)!;
    const h = HOUSES.find((q) => q.id === sp.house)!;
    assert.ok(y.islands.some((g) => inside(g.map(([u, v]) => toWorld(h, u, v)), [sp.x, sp.z])), `${sp.house}'s sprinkler on its turf`);
  }
});

test('the driveways: from the garage to the sidewalk\'s edge, flared and rounded there, no bare ground before it and nothing on it', () => {
  const blocks = new Map(SUN_BLOCKS.map((b) => [b.id, b.poly]));
  for (const y of YARDS) {
    const h = HOUSES.find((q) => q.id === y.house)!;
    const lot = LOTS.find((l) => l.id === h.lot)!;
    const block = blocks.get(lot.block)!;
    const W = y.drive.map(([u, v]) => toWorld(h, u, v));
    // (every point on the block's ground, or on its edge: never out on the sidewalk)
    for (const p of W) assert.ok(inside(block, p) || distTo(block, p, true) < 0.03, `${y.house}'s driveway on the sidewalk at ${p.map((c) => c.toFixed(2))}`);
    // Its street end on the sidewalk's edge, all the way across (the points at its least v, a few each side of the middle)
    const [d0, d1] = h.drive;
    const end = y.drive.filter(([u]) => u > d0 + 0.05 && u < d1 - 0.05 && u !== undefined).filter(([, v]) => v < 0.05 + Math.max(0, ...y.drive.filter(([u2]) => u2 > d0 && u2 < d1).map(([, v2]) => v2 <= 0.3 ? v2 : -Infinity)));
    assert.ok(end.length >= 2, `${y.house}'s driveway has a street end`);
    for (const [u, v] of end) assert.ok(distTo(block, toWorld(h, u, v), true) < 0.03, `${y.house}'s driveway stops short of the sidewalk at u ${u.toFixed(2)}`);
    // Flared both sides (where the lot has room), and never past the lot's sides
    const us = y.drive.map(([u]) => u);
    assert.ok(Math.min(...us) <= d0 && Math.max(...us) >= d1 && Math.min(...us) >= d0 - FLARE - 1e-9 && Math.max(...us) <= d1 + FLARE + 1e-9);
    const out = gardens.get(h.lot)!.outline;
    for (const [u, v] of y.drive) if (v > 0.05) assert.ok(inside(out, toWorld(h, u, v)) || distTo(out, toWorld(h, u, v), true) < 0.35, `${y.house}'s driveway out of its lot`);
  }
});

test('the front yards reach the sidewalk\'s edge too: no sliver of bare ground between', () => {
  const blocks = new Map(SUN_BLOCKS.map((b) => [b.id, b.poly]));
  for (const y of YARDS) {
    const h = HOUSES.find((q) => q.id === y.house)!;
    const block = blocks.get(LOTS.find((l) => l.id === h.lot)!.block)!;
    for (const g of y.ground) {
      if (g[0][1] > 0.5) continue; // (the side yards in front of the return walls start back from the street)
      const front = g.filter(([, v]) => v < 0.6);
      for (const [u, v] of front.slice(1, -1)) assert.ok(distTo(block, toWorld(h, u, v), true) < 0.03, `${y.house}'s front ground stops short of the sidewalk at u ${u.toFixed(2)}`);
    }
  }
});

test('the gardens (Phase 8): each block divided among its lots, each garden round its whole lot, in its block, out of every other, the land all but used', () => {
  const area = (o: Pt[]) => Math.abs(o.reduce((t, p, i) => t + p[0] * o[(i + 1) % o.length][1] - o[(i + 1) % o.length][0] * p[1], 0)) / 2;
  const blocks = new Map(SUN_BLOCKS.map((b) => [b.id, b.poly]));
  assert.equal(GARDENS.length, LOTS.length);
  // (traced on a quarter-tile grid and smoothed: a garden's edge is within about that of where the land divides)
  const TOL = 0.35;
  GARDENS.forEach((g, k) => {
    const l = LOTS[k];
    assert.equal(g.id, l.id);
    const o = g.outline;
    assert.ok(o.length >= 4);
    for (const p of outline(l)) assert.ok(inside(o, p) || distTo(o, p, true) < TOL, `${g.id} doesn't hold its lot`);
    for (const p of o) assert.ok(inside(blocks.get(g.block)!, p) || distTo(blocks.get(g.block)!, p, true) < TOL, `${g.id} out of its block`);
  });
  // (no two overlapping more than that: no corner of one well inside another)
  for (const [i, a] of GARDENS.entries())
    for (const [j, b] of GARDENS.entries()) if (i !== j) for (const p of a.outline) assert.ok(!inside(b.outline, p) || distTo(b.outline, p, true) < TOL + 0.1, `${a.id} into ${b.id}`);
  // The land all but used: of every spot on the blocks off the streets' edges, the amenities and the footpath (and
  // their margins), nearly all in a garden
  const lots = LOTS.reduce((t, l) => t + area(outline(l)), 0);
  const grown = GARDENS.reduce((t, g) => t + area(g.outline), 0);
  assert.ok(grown > lots * 1.3, `gardens ${grown.toFixed(0)} against lots ${lots.toFixed(0)}`);
  let free = 0;
  let used = 0;
  for (let x = SUNRIDGE_RECT[0]; x < SUNRIDGE_RECT[2]; x += 1)
    for (let z = SUNRIDGE_RECT[1]; z < SUNRIDGE_RECT[3]; z += 1) {
      const p: Pt = [x + 0.5, z + 0.5];
      const b = SUN_BLOCKS.find((q) => inside(q.poly, p));
      if (!b || distTo(b.poly, p, true) < 1.2) continue;
      if ([...ZONES.map((q) => q.rect), PATH].some((r) => p[0] > r[0] - 1.2 && p[0] < r[2] + 1.2 && p[1] > r[1] - 1.2 && p[1] < r[3] + 1.2)) continue;
      free++;
      if (GARDENS.some((g) => inside(g.outline, p))) used++;
    }
  assert.ok(used / free > 0.9, `${((used / free) * 100).toFixed(1)}% of the free land in gardens`);
});

test('the back lawns (Phase 8): inside their garden, clear of its walls, under no pool, most growing past the old back yard', () => {
  let bigger = 0;
  let n = 0;
  for (const y of YARDS) {
    if (!y.lawn) continue;
    assert.ok(!y.pool, `${y.house}: a lawn and a pool`);
    const h = houses.get(y.house)!;
    const g = gardens.get(h.lot)!;
    const world = (p: Pt): Pt => [h.o[0] + h.u[0] * p[0] + h.v[0] * p[1], h.o[1] + h.u[1] * p[0] + h.v[1] * p[1]];
    for (let i = 0; i < 4; i++)
      for (let k = 0; k <= 4; k++) {
        const [a, b] = [y.lawn[i], y.lawn[(i + 1) % 4]];
        const p = world([a[0] + ((b[0] - a[0]) * k) / 4, a[1] + ((b[1] - a[1]) * k) / 4]);
        assert.ok(inside(g.outline, p), `${y.house}: its lawn out of its garden at ${p.map((x) => x.toFixed(1))}`);
      }
    const [u0, , u1, v1] = y.back;
    const area = (q: Pt[]) => Math.abs(q.reduce((s, p, i) => s + p[0] * q[(i + 1) % 4][1] - q[(i + 1) % 4][0] * p[1], 0)) / 2;
    // (never smaller than the back yard's own patch of lawn was, from the patio to the back wall)
    const before = (u1 - u0 - 0.6) * (v1 - 0.3 - (y.patio[3] + 0.2));
    assert.ok(area(y.lawn) > before * 0.95, `${y.house}: its lawn smaller than the back yard's`);
    n++;
    if (area(y.lawn) > before * 1.15) bigger++;
  }
  assert.ok(n > YARDS.length * 0.4, `only ${n} back lawns`);
  assert.ok(bigger > n * 0.3, `only ${bigger} of ${n} lawns grown into their gardens`);
});

test('the big gardens dressed (Phase 8): a varied mix in some, none in a small one, each thing in its garden clear of the walls, the house, the pool and each other', () => {
  const kinds = new Map<string, number>();
  let dressed = 0;
  let big = 0;
  const area = (q: Pt[]) => Math.abs(q.reduce((s, p, i) => s + p[0] * q[(i + 1) % q.length][1] - q[(i + 1) % q.length][0] * p[1], 0)) / 2;
  for (const y of YARDS) {
    const h = houses.get(y.house)!;
    const f = gardenFrame(lots.get(h.lot)!);
    const vb = Math.max(...h.parts.map((p) => p.v1));
    const room = area(behind(f, vb));
    if (room >= DRESS_FROM) big++;
    if (!y.dress.length) continue;
    dressed++;
    assert.ok(room >= DRESS_FROM * 0.9, `${y.house}: a small garden (${room.toFixed(0)}) dressed`);
    const g = gardens.get(h.lot)!;
    const world = (u: number, v: number): Pt => [h.o[0] + h.u[0] * u + h.v[0] * v, h.o[1] + h.u[1] * u + h.v[1] * v];
    const things = y.dress.filter((d) => d.kind !== 'stones') as Exclude<(typeof y.dress)[number], { kind: 'stones' }>[];
    for (const d of y.dress) kinds.set(d.kind + ('sort' in d ? d.sort : 'crop' in d ? d.crop : ''), (kinds.get(d.kind + ('sort' in d ? d.sort : 'crop' in d ? d.crop : '')) ?? 0) + 1);
    for (const d of things) {
      const r = d.kind === 'tree' ? 0.3 : DRESS_R.firepit;
      const hu = d.kind === 'bed' ? DRESS_R.bed : r;
      const hv = hu;
      const around: Pt[] = d.kind === 'bed' ? bedCorners(d.u, d.v, d.rot) : Array.from({ length: 13 }, (_, k) => (k ? [d.u + Math.cos((k / 12) * Math.PI * 2) * r, d.v + Math.sin((k / 12) * Math.PI * 2) * r] : [d.u, d.v]));
      if (d.kind === 'bed') {
        // (along the garden's nearest edge: a wall, or the perimeter wall it backs onto)
        const c = world(d.u, d.v);
        const edges = g.outline.map((a, i) => [a, g.outline[(i + 1) % g.outline.length]] as [Pt, Pt]);
        const [a, b] = edges.reduce((m, e) => (distTo(e, c) < distTo(m, c) ? e : m));
        const way = world(Math.cos(d.rot), Math.sin(d.rot));
        const bedWay = Math.atan2(way[1] - h.o[1], way[0] - h.o[0]);
        assert.ok(Math.abs(Math.abs(Math.cos(Math.atan2(b[1] - a[1], b[0] - a[0]) - bedWay)) - 1) < 0.01 && distTo([a, b], c) < 1.4, `${y.house}: its bed not along a wall`);
      }
      for (const [u, v] of around) {
        const p = world(u, v);
        assert.ok(inside(g.outline, p), `${y.house}: its ${d.kind} out of its garden`);
        assert.ok(WALLS.every((w) => distTo([w.a, w.b], p) > 0.2), `${y.house}: its ${d.kind} against a wall`);
        assert.ok(!inPart(h, p), `${y.house}: its ${d.kind} in the house`);
      }
      if (y.pool) assert.ok(d.u + hu < y.pool.u0 - 0.3 || d.u - hu > y.pool.u1 + 0.3 || d.v + hv < y.pool.v0 - 0.3 || d.v - hv > y.pool.v1 + 0.3, `${y.house}: its ${d.kind} in the pool`);
      for (const e of things) if (e !== d) assert.ok(Math.hypot(e.u - d.u, e.v - d.v) > DRESS_R[e.kind] + DRESS_R[d.kind] - 0.01, `${y.house}: its ${d.kind} on its ${e.kind}`);
      for (const e of y.extras) assert.ok(Math.hypot(e.u - d.u, e.v - d.v) > DRESS_R[d.kind] + 0.7, `${y.house}: its ${d.kind} on its ${e.kind}`);
    }
    for (const d of y.dress)
      if (d.kind === 'stones') {
        assert.ok(d.pts.length >= 3);
        for (const [u, v] of d.pts) {
          assert.ok(inside(g.outline, world(u, v)), `${y.house}: a stepping stone out of its garden`);
          assert.ok(!inPart(h, world(u, v)), `${y.house}: a stepping stone in the house`);
          if (y.pool) assert.ok(!(u > y.pool.u0 - 0.3 && u < y.pool.u1 + 0.3 && v > y.pool.v0 - 0.3 && v < y.pool.v1 + 0.3), `${y.house}: a stepping stone in the pool`);
        }
      }
  }
  // (not in every big garden, but in most; every kind of each)
  assert.ok(dressed > big * 0.45 && dressed < big * 0.85, `${dressed} of ${big} big gardens dressed`);
  for (const k of ['treelemon', 'treemesquite', 'treeshade', 'bedveg', 'bedflowers', 'firepit', 'stones']) assert.ok((kinds.get(k) ?? 0) >= 2, `only ${kinds.get(k) ?? 0} ${k}`);
  // (about half the fire pits lit of an evening, steady)
  const pits = YARDS.flatMap((y) => y.dress.filter((d) => d.kind === 'firepit'));
  const lit = pits.filter((d) => d.kind === 'firepit' && d.burning).length;
  assert.ok(lit >= pits.length * 0.25 && lit <= pits.length * 0.75, `${lit} of ${pits.length} fire pits lit`);
});
