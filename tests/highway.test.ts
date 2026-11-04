// The ring highway (highway.ts, growth plan Phase 7): a closed loop well outside the town (the kart park and, since
// docs/airport-plan.md Phase 3, the airport are past it), inside the world; raised on its viaduct since
// docs/highway-plan.md Phase 2, every arterial passing under it (`RING_MEETS`), nothing meeting it at street level; a
// span each side over the river; and the trees keep off it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HIGHWAY, HIGHWAY_BOX, HIGHWAY_HALF, fromHighway, insideHighway } from '../src/scripts/city3d/highway';
import { PLAN, RING_MEETS, riverBridges, riverCrossings, streetLength } from '../src/scripts/city3d/streetplan';
import { EW_ROADS, NS_ROADS, SHORT_NS, WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { PARKWAY, SOUTHSIDE } from '../src/scripts/city3d/outer';
import { KART_PARK } from '../src/scripts/city3d/kartpark';
import { AIRPORT_AREAS } from '../src/scripts/city3d/airfield';
import { outskirtsTrees } from '../src/scripts/city3d/outskirts';

test('a closed loop, measured right, inside the world', () => {
  assert.deepEqual(HIGHWAY[0], HIGHWAY.at(-1));
  const hw = PLAN.streets.find((s) => s.id === 'highway')!;
  assert.ok(hw.loop && hw.kind === 'highway' && hw.lanes === 2);
  // Every point on the centre line is on the rounded box (fromHighway measures it exactly)
  for (const p of HIGHWAY) assert.ok(fromHighway(p[0], p[1]) < 0.2, `${p}`);
  // Halfway between its points the curve's chords stay close to it
  for (let i = 1; i < HIGHWAY.length; i++) assert.ok(fromHighway((HIGHWAY[i][0] + HIGHWAY[i - 1][0]) / 2, (HIGHWAY[i][1] + HIGHWAY[i - 1][1]) / 2) < 0.2);
  assert.ok(streetLength(hw) > 1600);
  const [x0, z0, x1, z1] = HIGHWAY_BOX;
  assert.ok(x0 - HIGHWAY_HALF > WORLD_BOUNDS[0] && z0 - HIGHWAY_HALF > WORLD_BOUNDS[1] && x1 + HIGHWAY_HALF < WORLD_BOUNDS[2] && z1 + HIGHWAY_HALF < WORLD_BOUNDS[3]);
  assert.ok(insideHighway(30, 30) && !insideHighway(x0 - 10, 30));
});

test('well outside the town, and clear of the kart park north of it and the airport south-east of it', () => {
  const clear = (x: number, z: number, m: number) => fromHighway(x, z) > HIGHWAY_HALF + m && insideHighway(x, z);
  for (const p of [...PARKWAY, ...SOUTHSIDE]) assert.ok(clear(p[0], p[1], 40), `the bends at ${p}`);
  // (the kart park moved past it in the north side's stage 2)
  for (const [x, z] of [
    [KART_PARK.x0, KART_PARK.z1],
    [KART_PARK.x1, KART_PARK.z1],
  ])
    assert.ok(!insideHighway(x, z) && fromHighway(x, z) > HIGHWAY_HALF + 8, `${x}, ${z}`);
  // (the airport moved out past it in docs/airport-plan.md Phase 3: none of its land inside it or near it)
  for (const r of AIRPORT_AREAS)
    for (let x = r[0]; x <= r[2]; x += 2)
      for (let z = r[1]; z <= r[3]; z += 2) assert.ok(!insideHighway(x, z) && fromHighway(x, z) > HIGHWAY_HALF + 4, `the airport at ${x}, ${z}`);
});

test('raised: nothing meets it at street level, and every arterial passes under it where it crossed it', () => {
  assert.equal(PLAN.crossings.filter((c) => c.streets.includes('highway')).length, 0);
  assert.equal(PLAN.streets.filter((s) => s.kind === 'slip').length, 0);
  // (but the short north-south streets stop at the Parkway: they never reach it, docs/mall-plan.md)
  assert.equal(RING_MEETS.length, (NS_ROADS.length + EW_ROADS.length) * 2 - Object.keys(SHORT_NS).length);
  for (const m of RING_MEETS) {
    assert.ok(fromHighway(m.at[0], m.at[1]) < 1e-6);
    const art = PLAN.streets.find((t) => t.id === m.street)!;
    // The arterial runs on under it, on both sides
    for (const d of [-8, 8]) {
      const p: [number, number] = m.along === 1 ? [m.at[0], m.at[1] + d] : [m.at[0] + d, m.at[1]];
      assert.ok(art.pts.some((_, i) => i > 0 && Math.min(art.pts[i - 1][m.along], art.pts[i][m.along]) <= p[m.along] && Math.max(art.pts[i - 1][m.along], art.pts[i][m.along]) >= p[m.along]), `${m.street} under ${m.id}`);
    }
  }
});

test('a span each side over the river, overhead: no way over there at street level', () => {
  const hb = riverBridges().filter((b) => b.street === 'highway');
  assert.equal(hb.length, 2);
  assert.deepEqual(
    hb.map((b) => b.c),
    [HIGHWAY_BOX[0], HIGHWAY_BOX[2]]
  );
  for (const b of hb) assert.ok(!riverCrossings().bridges.some(([x0, x1]) => x0 < b.c && x1 > b.c));
});

test('the trees keep off it', () => {
  const trees = outskirtsTrees(150);
  for (const t of trees) assert.ok(fromHighway(t.x, t.z) > HIGHWAY_HALF + 1.4, `a tree on the highway at ${t.x}, ${t.z}`);
});
