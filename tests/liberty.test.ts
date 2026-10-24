// Liberty Bridge (liberty.ts, river plan step 3): a footbridge in the style of the old gate-tower bridges with
// lifting leaves. Its towers stand in the river clear of the boats' lanes and under the Emporium, its approaches
// rise from the promenades, the leaves lift for the tall ship (and only then) without touching the high level or the
// ship, walking goes up the approaches, through the towers, over the leaves while they're down, and round the high
// level from the lifts, without stepping off.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RIVER } from '../src/scripts/city3d/layout';
import { WATER_Y, edgesAt, inWater } from '../src/scripts/city3d/river';
import { offFootbridge } from '../src/scripts/city3d/outer';
import { outset } from '../src/scripts/city3d/streetplan';
import { HX } from '../src/scripts/city3d/harbour';
import { HIGHWAY_BOX } from '../src/scripts/city3d/highway';
import { SOLIDS } from '../src/scripts/city3d/solids';
import {
  ABUTMENTS,
  ANCHOR_X,
  APPROACH,
  BOAT_LANES,
  BX,
  CHAIN,
  DECK_DEPTH,
  DECK_HALF,
  DECK_STROLLS,
  FACES,
  HIGH,
  HIGH_Y,
  LEAF,
  LIBERTY_RECTS,
  LIBERTY_SOLIDS,
  LIBERTY_SPAWN,
  LIFTS,
  LOW_Y,
  OUTER,
  PROM_Y,
  SHIP,
  SHIP_TIMES,
  SHUT_WINDOWS,
  TOWER,
  TOWERS,
  WALK_HALF,
  ZC,
  chainY,
  footbridgeWall,
  footbridgeY,
  leavesAt,
  lowY,
  onHigh,
  onLeaves,
  pointedArch,
  shipAt,
} from '../src/scripts/city3d/liberty';

/** The Emporium's roof: everything here stays under it */
const EMPORIUM = 12.5;
/** A boat on the river: its half width across the water and how high its cabin stands over the water (life.ts) */
const BOAT = { half: 0.35, top: 0.75 };
/** The leaf's far corners when it's up `a`: [z, y] of its tip's top and its tip's underside (the north leaf) */
const leafTip = (a: number) => [
  [FACES[0] + LEAF.len * Math.cos(a), LOW_Y + LEAF.len * Math.sin(a)],
  [FACES[0] + LEAF.len * Math.cos(a) + LEAF.t * Math.sin(a), LOW_Y + LEAF.len * Math.sin(a) - LEAF.t * Math.cos(a)],
];

test('its towers stand in the river either side of the middle, everything under the Emporium', () => {
  assert.ok(Math.abs(TOWERS[0] + TOWERS[1] - 2 * ZC) < 1e-9);
  for (const z of TOWERS) {
    const reach = TOWER.pier.hx + TOWER.pier.cut;
    for (const x of [BX - reach, BX, BX + reach]) {
      const [n, s] = edgesAt(x);
      assert.ok(z - TOWER.pier.hz > n + 5 && z + TOWER.pier.hz < s - 5, 'well out in the water');
      assert.ok(inWater(x, z));
    }
  }
  assert.ok(TOWER.pier.y < WATER_Y);
  assert.ok(TOWER.flame.base + TOWER.flame.h < EMPORIUM);
  assert.ok(TOWER.turret.top + TOWER.turret.dome + 0.45 < EMPORIUM, 'the turrets and finials');
  assert.ok(HIGH_Y + HIGH.h + 0.1 < TOWER.cornice, 'the high level under the cornice');
  // The arch through each tower clears the walk (a body and a bit) and stays under the high level
  assert.ok(TOWER.arch.half >= WALK_HALF);
  assert.ok(TOWER.arch.spring - LOW_Y > 1.8);
  assert.ok(TOWER.arch.spring + pointedArch(TOWER.arch.half, 0) < HIGH_Y - 0.4);
  // Clear of Harbour Bridge and the highway's bridges
  assert.ok(Math.abs(BX - HX) > 40);
});

test('the approaches rise gently from the promenades, level through the towers and over the middle', () => {
  assert.ok(APPROACH[0] < RIVER[0] && APPROACH[1] > RIVER[1], 'they start on the promenades');
  assert.ok(Math.abs(lowY(APPROACH[0]) - PROM_Y) < 1e-9 && Math.abs(lowY(APPROACH[1]) - PROM_Y) < 1e-9);
  let prev = lowY(APPROACH[0]);
  for (let z = APPROACH[0]; z <= ZC; z += 0.25) {
    const y = lowY(z);
    assert.ok(y >= prev - 1e-9 && y - prev < 0.04, `a step at ${z}`);
    assert.ok(Math.abs(y - lowY(2 * ZC - z)) < 1e-9, 'the same both ways');
    prev = y;
  }
  for (let z = OUTER[0]; z <= OUTER[1]; z += 0.5) assert.equal(lowY(z), LOW_Y);
  // The chains hang over the walk, from the abutments into the towers
  for (let z = APPROACH[0]; z <= APPROACH[1]; z += 0.25) {
    const c = chainY(z);
    if (c !== null) assert.ok(c - 0.32 > lowY(z) + 0.3, `the chain's in the deck at ${z}`);
  }
  assert.ok(CHAIN.x < TOWER.hx && CHAIN.tower < TOWER.cornice);
  for (const a of ABUTMENTS) assert.ok(CHAIN.x > a.x[0] && CHAIN.x < a.x[1] && CHAIN.abutment < a.top);
});

test('the boats keep their lanes: under the approaches and through the middle, clear of the piers', () => {
  assert.deepEqual(BOAT_LANES, [80.75, 101, 121.25]);
  for (const lane of BOAT_LANES) {
    for (const t of TOWERS) assert.ok(Math.abs(lane - t) > TOWER.pier.hz + BOAT.half + 2, `lane ${lane} meets a pier`);
    for (const a of ABUTMENTS) assert.ok(lane > a.z[1] + 2 || lane < a.z[0] - 2);
    // Under the deck with room to spare (the leaves down)
    for (const dz of [-BOAT.half, BOAT.half]) assert.ok(lowY(lane + dz) - DECK_DEPTH - (WATER_Y + BOAT.top) > 0.6, `lane ${lane} scrapes under the deck`);
  }
});

test('the leaves lift for the tall ship, clear of it and of the high level, and only then', () => {
  // Fully up, each leaf's tip stays under the high level's truss
  for (const [, y] of leafTip(LEAF.max)) assert.ok(y < HIGH_Y - 0.45 - 0.1);
  // The ship's masts under the high level, its hull and yards clear of the raised leaves and the piers
  assert.ok(WATER_Y + SHIP.mast + 0.4 < HIGH_Y - 0.45);
  const yard = SHIP.beam * 1.15 / 2 + 0.2;
  for (let y = LOW_Y; y <= WATER_Y + SHIP.mast; y += 0.1) {
    // (the north leaf's underside at height y, when it's up: the south one mirrors it)
    const z = FACES[0] + (y - LOW_Y) / Math.tan(LEAF.max) + LEAF.t / Math.sin(LEAF.max);
    assert.ok(SHIP.z - yard > z + 0.3 && SHIP.z + yard < 2 * ZC - z - 0.3, `the leaves catch the sails at ${y.toFixed(1)}`);
  }
  assert.ok(SHIP.z - SHIP.beam / 2 > TOWERS[0] + TOWER.pier.hz + 0.8 && SHIP.z + SHIP.beam / 2 < TOWERS[1] - TOWER.pier.hz - 0.8);
  for (const lane of BOAT_LANES) assert.ok(Math.abs(lane - SHIP.z) > yard + BOAT.half + 0.3, 'the ship off the lanes');
  // Its anchorages: between the highway's west bridge and Harbour Bridge, in the water
  for (const x of ANCHOR_X) {
    assert.ok(x - SHIP.len > HIGHWAY_BOX[0] + 30 && x + SHIP.len < HX - 15);
    assert.ok(inWater(x - SHIP.len / 2, SHIP.z, 2) && inWater(x + SHIP.len / 2, SHIP.z, 2));
  }
  // Whenever any of it (its bowsprit too) is over the bridge's line, the leaves are fully up
  let shut = 0;
  const reach = SHIP.len / 2 + 1.7 + DECK_HALF;
  for (let t = 0; t < SHIP_TIMES.period; t += 0.25) {
    const s = shipAt(t);
    const l = leavesAt(t);
    if (Math.abs(s.x - BX) < reach) assert.ok(l.angle > LEAF.max - 1e-6, `the ship meets the leaves at ${t}`);
    if (l.angle > 0) assert.ok(l.shut, 'the gates are shut while they move');
    if (l.shut) shut += 0.25;
    if (!l.shut) assert.equal(l.angle, 0);
  }
  assert.equal(SHUT_WINDOWS.length, 2);
  assert.ok(shut < SHIP_TIMES.period * 0.3, 'shut a fifth of the time or so');
  assert.ok(shut > 0);
  // The ship's way round: still at its anchors, smooth under way, the same for everyone (a function of the time)
  for (let t = 0; t < SHIP_TIMES.period; t += 0.5) {
    const [a, b] = [shipAt(t), shipAt(t + 0.5)];
    assert.ok(Math.abs(b.x - a.x) < SHIP_TIMES.v * 0.5 + 1e-6, `it jumps at ${t}`);
    assert.equal(a.z, SHIP.z);
  }
  assert.deepEqual(shipAt(1234.5), shipAt(1234.5 + SHIP_TIMES.period));
});

test('walking: up the approach, through the tower, over the leaves while they are down', () => {
  // Walk in starts on the promenade at the foot of the north approach
  assert.ok(LIBERTY_SPAWN.z < RIVER[0]);
  assert.ok(Math.abs(footbridgeY(LIBERTY_SPAWN.x, LIBERTY_SPAWN.z, 0.05)! - lowY(LIBERTY_SPAWN.z)) < 1e-9);
  let y = PROM_Y;
  for (let z = APPROACH[0] + 0.05; z <= APPROACH[1] - 0.05; z += 0.2) {
    const g = footbridgeY(BX + 0.3, z, y, 0.22);
    assert.ok(g !== null, `off the deck at ${z}`);
    y = g!;
    assert.ok(!footbridgeWall(BX + 0.3, z, y, 0.22));
  }
  // The leaves shut: no way on, a wall at the gates
  const mid = ZC;
  assert.equal(footbridgeY(BX, mid, LOW_Y, 0.22, false), null);
  assert.ok(footbridgeWall(BX, FACES[0] + 0.1, LOW_Y, 0.22, false));
  assert.ok(onLeaves(BX, mid) && !onLeaves(BX, FACES[0] - 0.5));
  assert.ok(footbridgeY(BX, FACES[0] - 0.6, LOW_Y, 0.22, false) === LOW_Y, 'the tower side of the gate stays open');
  // You can't step off the deck over the water
  for (const z of [RIVER[0] + 5, ZC, RIVER[1] - 5]) assert.ok(footbridgeWall(BX + WALK_HALF + 0.05, z, LOW_Y, 0.22));
  // Through the towers: nothing solid in the arch
  for (const z of TOWERS) for (const x of [BX - WALK_HALF + 0.25, BX, BX + WALK_HALF - 0.25]) assert.ok(!SOLIDS.some((b) => x > b[0] - 0.22 && x < b[2] + 0.22 && z > b[1] - 0.22 && z < b[3] + 0.22));
  for (const z of TOWERS) assert.ok(LIBERTY_SOLIDS.some((b) => BX + TOWER.hx - 0.1 > b[0] && BX + TOWER.hx - 0.1 < b[2] && z > b[1] && z < b[3]));
});

test('the high level: a walk all the way round from the lifts, railings at its edges', () => {
  const [w0, w1] = HIGH.walk;
  const m = 0.22;
  for (let z = FACES[0] + m; z <= FACES[1] - m; z += 0.25) for (const e of [-1, 1]) assert.equal(footbridgeY(BX + (e * (w0 + w1)) / 2, z, HIGH_Y, m), HIGH_Y);
  for (let x = -w1 + m; x <= w1 - m; x += 0.25) for (const z of [FACES[0] + HIGH.gallery / 2, FACES[1] - HIGH.gallery / 2]) assert.equal(footbridgeY(BX + x, z, HIGH_Y, m), HIGH_Y);
  // Over the middle between the walkways, and outside them: a railing (you can't fall)
  assert.ok(!onHigh(BX, ZC) && footbridgeWall(BX, ZC, HIGH_Y, m));
  assert.ok(footbridgeWall(BX + w1 + 0.05, ZC, HIGH_Y, m) && footbridgeWall(BX + w1 + 0.05, FACES[0] + 0.5, HIGH_Y, m));
  // Walking on the lower deck under it stays on the lower deck
  assert.equal(footbridgeY(BX + 1.2, FACES[0] + 0.5, LOW_Y), LOW_Y);
  // The lifts: a door on the lower deck in each tower's arch, one on each gallery, and where they let you out
  for (const l of LIFTS) {
    assert.equal(footbridgeY(l.low.x, l.low.z, LOW_Y), LOW_Y);
    assert.equal(footbridgeY(l.down.x, l.down.z, LOW_Y), LOW_Y);
    assert.equal(footbridgeY(l.up.x, l.up.z, HIGH_Y + 0.15, m), HIGH_Y);
    assert.ok(onHigh(l.high.x, l.high.z));
    assert.ok(Math.hypot(l.high.x - l.low.x, l.high.z - l.low.z) > 2, "the doors' prompts apart");
  }
  // The strollers' lanes (life.ts: 0.16 to 0.62 out from the outline) all on the high level
  for (const poly of DECK_STROLLS)
    for (const d of [0.16, 0.31, 0.47, 0.62])
      for (const [x, z] of outset(poly, d)) assert.ok(onHigh(x, z, 0.15), `a stroller off the high level at ${x.toFixed(2)}, ${z.toFixed(2)}`);
});

test('the promenades keep their dressing off it; what covers it is in the water or on the deck', () => {
  assert.ok(!offFootbridge(BX) && offFootbridge(BX + TOWER.pier.hx + TOWER.pier.cut + 2));
  for (const r of LIBERTY_RECTS) assert.ok(r[0] < r[2] && r[1] < r[3]);
  for (const b of LIBERTY_SOLIDS) assert.ok(SOLIDS.some((s) => s.every((v, i) => v === b[i])));
});
