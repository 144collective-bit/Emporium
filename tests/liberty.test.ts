// Liberty Bridge (liberty.ts, layout.ts LIBERTY_ROAD, outer.ts): the road reaches from the west cross
// street to the Southside Loop, the towers stand on their grounds off the road, the cables clear
// the avenues they leap, and walking in starts somewhere you can stand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CORE_ROADS, EW_ROADS, LIBERTY_ROAD, RIVER, RING_HI, SOUTH_ROAD, WALK_W } from '../src/scripts/city3d/layout';
import { LIBERTY_END, LIBERTY_GROUNDS, OUTER_BLOCKS, PADS, offBridges, onLiberty } from '../src/scripts/city3d/outer';
import { ANCHORS, CROWN, DECK, DECK_HALF, DECK_STROLLS, HANGERS, LEG_X, LIBERTY_SOLIDS, LIBERTY_SPAWN, LOW, LX, SADDLE, TOWERS, TOWER_H, cableY, onDeckWalk } from '../src/scripts/city3d/liberty';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';

const inRect = (r: number[], x: number, z: number) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3];

test('Liberty Road runs from the west cross street, over the river, to the Southside Loop', () => {
  assert.equal(LIBERTY_ROAD.z0, CORE_ROADS[1]);
  assert.ok(LIBERTY_END[1] > SOUTH_ROAD + 20, 'past the south bank avenue');
  const s = PLAN.streets.find((t) => t.id === 'liberty')!;
  assert.deepEqual(s.pts, [[LX, LIBERTY_ROAD.z0], LIBERTY_END]);
  // Down the middle of the old West 3 and South 1 plots, which are off the market
  for (const g of LIBERTY_GROUNDS) assert.ok(Math.abs((g[0] + g[2]) / 2 - LX) < 1e-9);
  assert.ok(!PADS.some((p) => LIBERTY_GROUNDS.some((g) => p.rect[0] < g[2] && p.rect[2] > g[0] && p.rect[1] < g[3] && p.rect[3] > g[1])), 'no plot or lot on the grounds');
  // Every block keeps off it
  for (const b of OUTER_BLOCKS) for (const q of b.poly) assert.ok(distToStreet(s, q) >= s.half + WALK_W - 1e-6, `${b.id} at ${q}`);
});

test('the deck spans the river, promenade to promenade, and the promenade keeps off it', () => {
  assert.ok(DECK.z0 < RIVER[0] - 1 && DECK.z1 > RIVER[1] + 1);
  const north = EW_ROADS.find((r) => r.c === RING_HI)!;
  const south = EW_ROADS.find((r) => r.c === SOUTH_ROAD)!;
  assert.ok(DECK.z0 >= north.c + north.half && DECK.z1 <= south.c - south.half, 'between the avenues');
  assert.ok(!offBridges(LX) && !offBridges(LX + DECK_HALF));
  assert.ok(onLiberty([LX, 70]) && !onLiberty([LX, LIBERTY_ROAD.z0 - 3]));
});

test('the towers: on their grounds, off the road, under the Emporium', () => {
  assert.ok(TOWER_H < 12.5 && CROWN.y1 < TOWER_H);
  TOWERS.forEach((z, i) => assert.ok(z > LIBERTY_GROUNDS[i][1] && z < LIBERTY_GROUNDS[i][3]));
  for (const b of LIBERTY_SOLIDS) {
    assert.ok(SOLIDS.includes(b), 'in the city\'s solids');
    // Clear of the road and its sidewalks
    assert.ok(b[0] > LX + LIBERTY_ROAD.half + WALK_W || b[2] < LX - LIBERTY_ROAD.half - WALK_W, `${b}`);
    assert.ok(LIBERTY_GROUNDS.some((g) => inRect(g, b[0], b[1]) && inRect(g, b[2], b[3])), `${b} on the grounds`);
  }
  assert.ok(ANCHORS[0] < TOWERS[0] && ANCHORS[1] > TOWERS[1]);
});

test('the cables: on the saddles at the towers, lowest mid-span, high over both avenues', () => {
  for (const z of TOWERS) assert.ok(Math.abs(cableY(z) - SADDLE) < 1e-9);
  assert.ok(Math.abs(cableY((TOWERS[0] + TOWERS[1]) / 2) - LOW) < 1e-9);
  for (const r of EW_ROADS.filter((r) => r.c > TOWERS[0] && r.c < TOWERS[1]))
    for (let z = r.c - r.half - WALK_W; z <= r.c + r.half + WALK_W; z += 0.1) assert.ok(cableY(z) > 3, `a bus fits under at z ${z.toFixed(1)}`);
  // No hanger stands on an avenue's asphalt
  for (const h of HANGERS) assert.ok(!EW_ROADS.some((r) => Math.abs(h.z - r.c) < r.half + 0.1), `hanger at ${h.z}`);
  assert.ok(HANGERS.some((h) => h.deck) && HANGERS.every((h) => !h.deck || (h.z > DECK.z0 && h.z < DECK.z1)));
  assert.ok(LEG_X > DECK_HALF, 'the cables run outside the deck');
});

test('walking in and strolling: on the deck walks, clear of every solid', () => {
  assert.ok(onDeckWalk(LIBERTY_SPAWN.x, LIBERTY_SPAWN.z));
  assert.ok(!SOLIDS.some((b) => inRect(b, LIBERTY_SPAWN.x, LIBERTY_SPAWN.z)));
  for (const poly of DECK_STROLLS) for (const [x, z] of poly) for (const d of [-0.65, 0.65]) assert.ok(onDeckWalk(x + d, z), `${x + d}, ${z}`);
});
