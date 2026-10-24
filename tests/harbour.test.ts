// Harbour Bridge (harbour.ts, river plan step 2): the east avenue's suspension bridge over the lowered river, the
// metro down its middle. Its deck humps over the water so the boats pass under, its towers stand in the river clear
// of the boats' lanes, its great arch clears the traffic and the el, its footways run through the towers' smaller
// arches, and everything stays under the Emporium.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANCHORS,
  CABLE,
  CABLE_U,
  CROWN,
  DEPTH,
  FOOTWAY,
  GIRDER,
  HALF,
  HARBOUR_SOLIDS,
  HARBOUR_SPAWN,
  HARBOUR_STREET,
  HX,
  MID,
  RISE,
  ROADWAY,
  TOWER,
  TOWERS,
  Z0,
  Z1,
  cableY,
  deckSlope,
  deckY,
  harbourY,
  onHarbour,
  pointedArch,
} from '../src/scripts/city3d/harbour';
import { BRIDGED_NS, NS_ROADS, RIVER } from '../src/scripts/city3d/layout';
import { WATER_Y, edgesAt, inWater } from '../src/scripts/city3d/river';
import { BOAT_LANES } from '../src/scripts/city3d/liberty';
import { boatZ } from '../src/scripts/city3d/waterfront';
import { DECK_HALF, DECK_T, DECK_Y, LINE_X, PILLARS } from '../src/scripts/city3d/metro';
import { PLAN, riverBridges } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';

/** The Emporium's roof: everything here stays under it */
const EMPORIUM = 12.5;
/** A boat on the river: its half width across the water and how high its cabin stands over the water (life.ts) */
const BOAT = { half: 0.35, top: 0.75 };

test('the east avenue carries it, the metro with it', () => {
  assert.equal(HX, NS_ROADS[BRIDGED_NS[0]].c);
  assert.equal(HX, LINE_X);
  assert.ok(PLAN.streets.some((s) => s.id === HARBOUR_STREET));
  const b = riverBridges().find((r) => r.street === HARBOUR_STREET)!;
  assert.deepEqual([b.x0, b.x1], [HX - HALF, HX + HALF]);
  assert.ok(Z0 < RIVER[0] && Z1 > RIVER[1], 'from bank avenue to bank avenue');
  assert.ok(Math.abs(MID - (Z0 + Z1) / 2) < 1e-9);
});

test('the deck rises smoothly from each bank avenue to RISE over the middle', () => {
  assert.equal(deckY(Z0), 0);
  assert.equal(deckY(Z1), 0);
  assert.ok(Math.abs(deckY(MID) - RISE) < 1e-9);
  let prev = 0;
  for (let z = Z0; z <= MID; z += 0.25) {
    assert.ok(deckY(z) >= prev - 1e-9, `it dips at ${z}`);
    assert.ok(Math.abs(deckSlope(z)) < 0.13, `too steep for a car at ${z}`);
    assert.ok(Math.abs(deckY(z) - deckY(Z0 + Z1 - z)) < 1e-9, 'the same both ways');
    prev = deckY(z);
  }
  // Walking on it: the roadway, the footways' boards a kerb's step up, nothing off it
  assert.ok(Math.abs(harbourY(HX + 1, MID)! - RISE) < 1e-9);
  assert.ok(harbourY(HX + (FOOTWAY[0] + FOOTWAY[1]) / 2, MID)! > RISE + 0.1);
  assert.equal(harbourY(HX + HALF + 0.1, MID), null);
  assert.equal(harbourY(HX, Z0 - 0.1), null);
  assert.ok(onHarbour(HARBOUR_SPAWN.x, HARBOUR_SPAWN.z, 0.3));
  const u = HARBOUR_SPAWN.x - HX;
  assert.ok(u > FOOTWAY[0] && u < FOOTWAY[1], 'the spawn is on a footway');
});

test('the water is lower: the boats pass under the deck in every lane', () => {
  assert.equal(WATER_Y, -1.5);
  for (let lane = 0; lane < BOAT_LANES.length; lane++)
    for (let x = HX - HALF - 1; x <= HX + HALF + 1; x += 0.5) {
      const z = boatZ(lane, x);
      // The deck's underside over the boat's beam, and the boat's top
      const under = Math.min(deckY(z - BOAT.half), deckY(z + BOAT.half)) - DEPTH;
      assert.ok(under - (WATER_Y + BOAT.top) > 0.6, `lane ${lane} scrapes under the deck at ${z.toFixed(2)}`);
    }
});

test('the towers stand in the river on their piers, clear of the boats', () => {
  const reach = TOWER.base.hu + TOWER.base.cut;
  for (const t of TOWERS) {
    for (const x of [HX - reach, HX, HX + reach]) {
      const [n, s] = edgesAt(x);
      assert.ok(t - TOWER.base.hz > n + 3 && t + TOWER.base.hz < s - 3, 'in the water, well out from the banks');
      assert.ok(inWater(x, t));
    }
    for (let lane = 0; lane < BOAT_LANES.length; lane++)
      for (let x = HX - reach - 2; x <= HX + reach + 2; x += 0.5) assert.ok(Math.abs(boatZ(lane, x) - t) > TOWER.base.hz + BOAT.half + 1.5, `lane ${lane} meets the tower at ${t}`);
    assert.ok(TOWER.base.y < WATER_Y, 'its pier goes down into the water');
  }
  // The main span between them, a side span to each bank
  assert.ok(TOWERS[1] - TOWERS[0] > 25);
  assert.ok(Math.abs(TOWERS[0] + TOWERS[1] - 2 * MID) < 1e-9);
});

test('everything under the Emporium', () => {
  assert.ok(TOWER.saddle + 0.08 < EMPORIUM);
  assert.ok(TOWER.top < EMPORIUM && CROWN < TOWER.cornice);
  for (let z = ANCHORS[0].z[0]; z <= ANCHORS[2].z[1]; z += 0.5) assert.ok(cableY(z) < TOWER.saddle, `the cable's over the saddles at ${z}`);
  assert.ok(Math.abs(cableY(TOWERS[0]) - CABLE.top) < 1e-9 && Math.abs(cableY(TOWERS[1]) - CABLE.top) < 1e-9);
});

test('the great arch clears the roadway and the el, the cables clear the deck', () => {
  const { arch } = TOWER;
  const deck = Math.max(...TOWERS.map(deckY));
  assert.equal(arch.half, ROADWAY);
  // The el's deck and a train on it (about 2.2 tall) through the middle
  assert.ok(arch.spring + pointedArch(arch.half, DECK_HALF) > DECK_Y + 2.4);
  // A bus (about 1.7 tall) in the outer lane
  assert.ok(arch.spring + pointedArch(arch.half, ROADWAY - 0.3) > deck + 2.0);
  // The el's hammerheads over the hump clear a bus in the inner lane
  assert.ok(DECK_Y - DECK_T - 0.3 - RISE > 1.9);
  // The cables hang over the girders all the way
  for (let z = ANCHORS[0].z[1]; z <= ANCHORS[2].z[0]; z += 0.5) assert.ok(cableY(z) > deckY(z) + GIRDER.h, `the cable's in the deck at ${z}`);
  // Each cable lands on its girder (and on the tower's piers and legs)
  for (const u of CABLE_U) {
    const a = Math.abs(u);
    assert.ok((a >= GIRDER.inner[0] && a <= GIRDER.inner[1]) || (a >= GIRDER.outer[0] && a <= GIRDER.outer[1]));
    assert.ok((a >= TOWER.pier[0] && a <= TOWER.pier[1]) || (a >= TOWER.leg[0] && a <= TOWER.leg[1]));
  }
});

test('the metro rides its raised centre: posts on the median all the way across', () => {
  const on = PILLARS.filter((p) => onHarbour(...p.at)).map((p) => p.at);
  assert.ok(on.length >= 5);
  for (const [x] of on) assert.ok(Math.abs(x - HX) < 1e-6);
  const zs = on.map(([, z]) => z).sort((a, b) => a - b);
  for (let i = 1; i < zs.length; i++) assert.ok(zs[i] - zs[i - 1] <= 12 + 1e-6);
});

test('the footways go through the towers, the roadway is clear, the girders and towers are solid', () => {
  const inSolid = (x: number, z: number, m = 0.3) => HARBOUR_SOLIDS.some((b) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m);
  const walk = (FOOTWAY[0] + FOOTWAY[1]) / 2;
  const [a0, a1] = [TOWER.foot.u[0], TOWER.foot.u[1]];
  assert.ok(a0 >= FOOTWAY[0] && a1 <= FOOTWAY[1], "the arch is the footway's");
  for (let z = Z0 + 0.5; z < Z1 - 0.5; z += 0.25) {
    for (const e of [-1, 1]) assert.ok(!inSolid(HX + e * walk, z, 0.28), `the footway's blocked at ${z}`);
    for (const u of [-2.85, -1.15, 1.15, 2.85]) assert.ok(!inSolid(HX + u, z, 0.75), `the lane at ${u} is blocked at ${z}`);
  }
  for (const t of TOWERS) for (const u of [-(TOWER.leg[0] + TOWER.leg[1]) / 2, (TOWER.leg[0] + TOWER.leg[1]) / 2, -(TOWER.pier[0] + TOWER.pier[1]) / 2]) assert.ok(inSolid(HX + u, t, 0));
  assert.ok(inSolid(HX + (GIRDER.outer[0] + GIRDER.outer[1]) / 2, MID, 0));
  // ...and they're among the city's solids
  for (const b of HARBOUR_SOLIDS) assert.ok(SOLIDS.some((s) => s.every((v, i) => v === b[i])));
});
