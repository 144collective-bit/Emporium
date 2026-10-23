// Liberty Bridge (liberty.ts): a footbridge raised over both river avenues and the widened river,
// beside West 3 and South 1 (which stay on the market). The towers and stairs stand clear of the
// plots and roads, the arches clear the traffic and the boats, and walking goes up the stairs,
// along the walkway and down again without stepping off.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EW_ROADS, NS_ROADS, RIVER, RIVER_W, RING_HI, SOUTH_ROAD, WALK_W } from '../src/scripts/city3d/layout';
import { PADS, inside, OUTER_BLOCKS, offBridges, offFootbridge } from '../src/scripts/city3d/outer';
import {
  BOAT_LANES,
  BX,
  DECK_HALF,
  DECK_STROLLS,
  DECK_Y,
  LIBERTY_RECTS,
  LIBERTY_SOLIDS,
  LIBERTY_SPAWN,
  STAIR,
  STAIR_BASE,
  SUPPORTS,
  TOWER,
  TOWERS,
  WALKWAY,
  WALK_HALF,
  archY,
  footbridgeWall,
  footbridgeY,
  landingOf,
  stairTread,
  stairsOf,
} from '../src/scripts/city3d/liberty';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { DISTRICTS } from '../src/data/plots';

const overlaps = (a: number[], b: number[]) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

test('the river is five times as wide, and every plot is still on the market', () => {
  assert.equal(RIVER_W, 15);
  assert.equal(RIVER[1] - RIVER[0], 15);
  assert.equal(DISTRICTS.length, 16);
  assert.ok(DISTRICTS.some((d) => d.id === 'W3') && DISTRICTS.some((d) => d.id === 'S1'));
});

test('it stands on the lawns beside West 3 and South 1, clear of every plot, lot and road', () => {
  for (const r of LIBERTY_RECTS) for (const p of PADS) assert.ok(!overlaps(r, p.rect), `${r} on ${p.id}`);
  // Off the straight roads' asphalt and sidewalks, except where the walkway passes over the two river avenues
  for (const r of NS_ROADS) for (const q of LIBERTY_RECTS) assert.ok(q[2] < r.c - r.half - WALK_W || q[0] > r.c + r.half + WALK_W);
  const crossed = EW_ROADS.filter((r) => r.c > TOWERS[0] && r.c < TOWERS[1]).map((r) => r.c);
  assert.deepEqual(crossed, [RING_HI, SOUTH_ROAD]);
  // The towers are on their lawns (outer blocks), one each side of the river
  TOWERS.forEach((z) => assert.ok(OUTER_BLOCKS.some((b) => inside(b.poly, [BX, z]) && inside(b.poly, [BX - TOWER.hx - STAIR.w, z]) && inside(b.poly, [BX + TOWER.hx + STAIR.w, z]))));
  assert.ok(TOWERS[0] < RIVER[0] && TOWERS[1] > RIVER[1]);
  // Promenade benches, trees and lamps keep off it; the road bridges are elsewhere
  assert.ok(!offFootbridge(BX) && offBridges(BX));
});

test('the walkway: high over both avenues, on pillars you can walk between, piers in the water', () => {
  for (const c of [RING_HI, SOUTH_ROAD]) {
    const r = EW_ROADS.find((e) => e.c === c)!;
    for (let z = r.c - r.half; z <= r.c + r.half; z += 0.1) assert.ok(archY(z)! > 2.4, `a bus fits under at z ${z.toFixed(1)}`);
    // No support stands on an avenue
    for (const s of SUPPORTS) assert.ok(Math.abs(s.z - r.c) > r.half + WALK_W);
  }
  const piers = SUPPORTS.filter((s) => s.kind === 'pier');
  assert.equal(piers.length, 2);
  for (const p of piers) assert.ok(p.z > RIVER[0] && p.z < RIVER[1]);
  for (const s of SUPPORTS.filter((s) => s.kind === 'pillars')) assert.ok(s.z < RIVER[0] || s.z > RIVER[1], 'pillars on land');
  // Boats pass down the middle of the three arches over the water, with room under them
  assert.equal(BOAT_LANES.length, 3);
  for (const z of BOAT_LANES) {
    assert.ok(z > RIVER[0] && z < RIVER[1]);
    assert.ok(archY(z)! > 2);
  }
  // Everything is under the Emporium's roof
  assert.ok(TOWER.flame.base + TOWER.flame.h < 12.3);
  for (const b of LIBERTY_SOLIDS) assert.ok(SOLIDS.includes(b));
});

test('walking: up the stairs, across the landing, along the walkway to the other side and down', () => {
  // The foot of the north tower's east stairs, where Walk in starts
  assert.equal(footbridgeY(LIBERTY_SPAWN.x, LIBERTY_SPAWN.z, 0.15), null, 'Walk in starts on the lawn');
  assert.ok(!SOLIDS.some((b) => LIBERTY_SPAWN.x > b[0] - 0.3 && LIBERTY_SPAWN.x < b[2] + 0.3 && LIBERTY_SPAWN.z > b[1] - 0.3 && LIBERTY_SPAWN.z < b[3] + 0.3));
  // Climb: the ground rises step by step under your feet
  const x = LIBERTY_SPAWN.x;
  const st = stairsOf(0);
  let y = 0.15;
  for (let z = st.z0 + 0.05; z <= st.z1; z += 0.1) {
    const h = footbridgeY(x, z, y, 0.22);
    assert.ok(h !== null, `on the stairs at z ${z.toFixed(2)}`);
    assert.ok(h! >= y - 0.3 && h! <= y + 0.3);
    y = h!;
  }
  assert.ok(Math.abs(y - DECK_Y) < 0.1);
  // Across the landing to the walkway, and all the way over
  const la = landingOf(0);
  assert.equal(footbridgeY(x, (la.z0 + la.z1) / 2, y, 0.22), DECK_Y);
  for (let z = WALKWAY[0]; z <= WALKWAY[1]; z += 0.25) assert.equal(footbridgeY(BX, z, DECK_Y, 0.22), DECK_Y);
  // Down the south tower's west stairs
  const s1 = stairsOf(1);
  assert.ok(footbridgeY(BX - TOWER.hx - STAIR.tread / 2, s1.z1, DECK_Y)! > DECK_Y - 0.1);
  assert.ok(footbridgeY(BX - TOWER.hx - STAIR.tread / 2, s1.z0, 0.2)! < 0.1);
  // Not off the landing's far edge either, beside the walkway (a body's width short of it)
  assert.ok(footbridgeWall(BX + TOWER.hx + STAIR.tread / 2, landingOf(0).z1 + 0.1, DECK_Y, 0.22));
  // You can't step off: past the parapets up there is a wall
  for (const z of [62, RIVER[0] + 3, 90]) {
    assert.ok(footbridgeWall(BX + WALK_HALF + 0.1, z, DECK_Y));
    assert.ok(footbridgeWall(BX - DECK_HALF + 0.05, z, DECK_Y));
  }
  // Walking under it on the promenade: on the ground, between the pillars, nothing in the way
  const prom = SUPPORTS[2];
  assert.equal(footbridgeY(BX, prom.z, 0.05), null);
  assert.ok(!footbridgeWall(BX, prom.z, 0.05));
  assert.ok(!SOLIDS.some((b) => BX > b[0] - 0.22 && BX < b[2] + 0.22 && prom.z > b[1] - 0.22 && prom.z < b[3] + 0.22));
  // People stroll the walkway
  for (const poly of DECK_STROLLS) for (const [px, pz] of poly) for (const d of [-0.65, 0.65]) assert.equal(footbridgeY(px + d, pz, DECK_Y), DECK_Y);
});

test('the stairs\' treads, as the feet stand on them: each step at its height, on or over the ramp he walks up', () => {
  const rise = (DECK_Y - STAIR_BASE) / STAIR.steps;
  for (const i of [0, 1] as const) {
    const st = stairsOf(i);
    const x = BX + TOWER.hx + STAIR.tread / 2;
    for (let k = 0; k < STAIR.steps; k++) {
      // The middle of step k
      const z = st.z0 + ((st.z1 - st.z0) * (k + 0.5)) / STAIR.steps;
      const tread = stairTread(x, z, 10);
      assert.ok(tread !== null);
      assert.ok(Math.abs(tread - (STAIR_BASE + (k + 1) * rise)) < 1e-9, `step ${k}`);
      assert.ok(tread >= (footbridgeY(x, z, 10) ?? 0) - 1e-9, 'never under the ramp');
    }
    // Off the stairs (beside them, or well below them: under the walkway) there's no tread
    assert.equal(stairTread(BX, (st.z0 + st.z1) / 2, 10), null);
    assert.equal(stairTread(x, (st.z0 + st.z1) / 2, -5), null);
  }
});
