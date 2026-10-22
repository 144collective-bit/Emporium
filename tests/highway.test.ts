// The ring highway (highway.ts, growth plan Phase 7): a closed loop well outside the town, the kart park, the
// airport and the test district, inside the world; a lit junction wherever it meets an arterial, two slip lanes
// on the town side of each; a bridge each side over the river; and the trees keep off it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HIGHWAY, HIGHWAY_BOX, HIGHWAY_HALF, fromHighway, insideHighway } from '../src/scripts/city3d/highway';
import { PLAN, distToStreet, riverBridges, streetLength } from '../src/scripts/city3d/streetplan';
import { EW_ROADS, NS_ROADS, WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { PARKWAY, SOUTHSIDE } from '../src/scripts/city3d/outer';
import { KART_PARK } from '../src/scripts/city3d/kartpark';
import { SITE } from '../src/scripts/city3d/airfield';
import { DISTRICT_RECT } from '../src/scripts/city3d/testdistrict';
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

test('well outside the town, the kart park, the airport and the test district', () => {
  const clear = (x: number, z: number, m: number) => fromHighway(x, z) > HIGHWAY_HALF + m && insideHighway(x, z);
  for (const p of [...PARKWAY, ...SOUTHSIDE]) assert.ok(clear(p[0], p[1], 40), `the bends at ${p}`);
  for (const [x, z] of [
    [KART_PARK.x0, KART_PARK.z0],
    [KART_PARK.x1, KART_PARK.z0],
    [SITE[2], SITE[3]],
    [SITE[0], SITE[3]],
    [SITE[2], SITE[1]],
    [DISTRICT_RECT[0], DISTRICT_RECT[1]],
    [DISTRICT_RECT[0], DISTRICT_RECT[3]],
    [DISTRICT_RECT[2], DISTRICT_RECT[3]],
  ])
    assert.ok(clear(x, z, 15), `${x}, ${z}`);
});

test('a lit junction wherever it meets an arterial, two slip lanes on the town side of each', () => {
  const meets = PLAN.crossings.filter((c) => c.streets.includes('highway'));
  assert.equal(meets.length, (NS_ROADS.length + EW_ROADS.length) * 2);
  for (const c of meets) {
    assert.ok(c.lights);
    assert.ok(fromHighway(c.at[0], c.at[1]) < 1e-6);
    const slips = PLAN.streets.filter((s) => s.id.startsWith(`slip-${c.id}-`));
    assert.equal(slips.length, 2, c.id);
    for (const s of slips) {
      assert.equal(s.oneway, 1);
      // From the one road's outer lane to the other's, out across the corner, on the town side
      for (const p of s.pts) assert.ok(insideHighway(p[0], p[1]) || fromHighway(p[0], p[1]) < HIGHWAY_HALF);
      const mid = s.pts[3];
      assert.ok(fromHighway(mid[0], mid[1]) > HIGHWAY_HALF, `${s.id} cuts across the corner, off the highway`);
      const art = PLAN.streets.find((t) => t.id === c.streets[0])!;
      assert.ok(distToStreet(art, mid) > art.half, `${s.id} cuts across the corner, off the arterial`);
    }
  }
});

test('a bridge each side over the river', () => {
  const hb = riverBridges().filter((b) => b.street === 'highway');
  assert.equal(hb.length, 2);
  assert.deepEqual(
    hb.map((b) => b.c),
    [HIGHWAY_BOX[0], HIGHWAY_BOX[2]]
  );
});

test('the trees keep off it and its slip lanes', () => {
  const trees = outskirtsTrees(150);
  for (const t of trees) assert.ok(fromHighway(t.x, t.z) > HIGHWAY_HALF + 1.4, `a tree on the highway at ${t.x}, ${t.z}`);
  const slips = PLAN.streets.filter((s) => s.kind === 'slip');
  for (const t of trees) for (const s of slips) assert.ok(distToStreet(s, [t.x, t.z]) > s.half + 0.5, `a tree on ${s.id}`);
});
