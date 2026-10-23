// Collision data (solids.ts, shared by walk mode, your car and the game server):
// everything solid stands on a slab and off the roads, and every door, the gun
// counter, the garage door and the walk-mode spawn can be reached.
import { METRO_SOLIDS } from '../src/scripts/city3d/metro';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAMERA_ONLY, DOORS, FIGHTCLUB_SITE, GARAGE_SITE, MARKET_SITE, RACK, SHOT_SOLIDS, SOLIDS, STALL_SPOT, TURNTABLE_BOX, UNIT_SITE, UNIT_SIZE, WALK_SPAWN, LOT_SITE, lotSolids, rayBoxes, unitSolids } from '../src/scripts/city3d/solids';
import { BIG_LOTS, EW_ROADS, GARAGE, BS, LANE, MARKET, NS_ROADS, UNITS } from '../src/scripts/city3d/layout';
import { CIRCUIT_SOLIDS as KART_SOLIDS } from '../src/scripts/city3d/kartcircuit';
import { CORNERS, FIGHT_CLUB, FIGHT_SPAWN, OUT, RING, RING_HALF, TRAINER, inRing } from '../src/scripts/city3d/fightsite';
import { LOT_KIND_IDS, UNIT_KIND_IDS } from '../src/scripts/city3d/tycoon';
import { inside, onSlab, pointIn, pointOnSlab, type Rect } from './world';
import { AIRPORT_SOLIDS } from '../src/scripts/city3d/airfield';
import { LIBERTY_SOLIDS } from '../src/scripts/city3d/liberty';
import { WATERFRONT_SOLIDS } from '../src/scripts/city3d/waterfront';
import { NIGHT_MARKET_SOLIDS } from '../src/scripts/city3d/nightmarket';

/** Degen's radius in walk mode (walk.ts RADIUS) */
const R = 0.22;
const blocked = (x: number, z: number) => SOLIDS.some((b) => pointIn(x, z, b, R));

test('every solid box stands on a block, district or the garage lot (the kart park and the airport are flat open ground, tested in kart.test.ts and airfield.test.ts; Liberty Bridge stands on the promenades and in the river too, tested in liberty.test.ts; the waterfront\'s on the boardwalk, tested in waterfront.test.ts, and the night market\'s on its deck, nightmarket.test.ts; the metro on the avenue\'s median and the lawns, tested in metro.test.ts)', () => {
  for (const b of [...SOLIDS, ...CAMERA_ONLY]) if (!KART_SOLIDS.includes(b) && !AIRPORT_SOLIDS.includes(b) && !LIBERTY_SOLIDS.includes(b) && !METRO_SOLIDS.includes(b) && !WATERFRONT_SOLIDS.includes(b) && !NIGHT_MARKET_SOLIDS.includes(b)) assert.ok(onSlab(b), `box ${b.join(', ')} is off the slabs`);
});

test('no solid box sits on a road (but the metro\'s pillars in an avenue\'s median, metro.test.ts)', () => {
  for (const b of SOLIDS) {
    if (METRO_SOLIDS.includes(b)) continue;
    for (const r of NS_ROADS) assert.ok(b[2] <= r.c - r.half || b[0] >= r.c + r.half, `box ${b.join(', ')} on the road at x ${r.c}`);
    for (const r of EW_ROADS) assert.ok(b[3] <= r.c - r.half || b[1] >= r.c + r.half, `box ${b.join(', ')} on the road at z ${r.c}`);
  }
});

test('boxes are well formed', () => {
  for (const b of SOLIDS) assert.ok(b[0] < b[2] && b[1] < b[3] && b[4] >= 0, `box ${b.join(', ')}`);
});

test('every door can be stood at (and is on a block)', () => {
  assert.equal(new Set(DOORS.map((d) => d.id)).size, DOORS.length, 'a door is listed twice');
  for (const d of DOORS) {
    assert.ok(pointOnSlab(d.x, d.z), `${d.id} door is off the slabs`);
    // Somewhere within reach of the prompt (1.7) is free to stand on
    const spots = Array.from({ length: 48 }, (_, k) => [d.x + Math.cos(k) * (0.3 + (k % 6) * 0.25), d.z + Math.sin(k) * (0.3 + (k % 6) * 0.25)]);
    assert.ok(spots.some(([x, z]) => !blocked(x, z)), `nowhere free to stand at the ${d.id} door`);
  }
});

test('the gun store counter, the garage door and the spawn are free to stand at', () => {
  const near = (x: number, z: number, reach: number) =>
    Array.from({ length: 48 }, (_, k) => [x + Math.cos(k) * reach * ((k % 4) + 1) / 4, z + Math.sin(k) * reach * ((k % 4) + 1) / 4]).some(([px, pz]) => !blocked(px, pz));
  assert.ok(near(RACK.x, RACK.z, 1.0), 'the counter');
  assert.ok(near(GARAGE_SITE.door.x, GARAGE_SITE.door.z, 1.2), 'the garage door');
  const sx = WALK_SPAWN.x + Math.sin(WALK_SPAWN.yaw) * WALK_SPAWN.back;
  const sz = WALK_SPAWN.z + Math.cos(WALK_SPAWN.yaw) * WALK_SPAWN.back;
  assert.ok(!blocked(sx, sz), 'walk mode starts inside something');
});

test('the garage, its turntable and its door are on the garage lot', () => {
  const lot: Rect = [GARAGE.ox, GARAGE.oz, GARAGE.ox + BS, GARAGE.oz + BS];
  assert.ok(inside(GARAGE_SITE.building, lot));
  assert.ok(inside(TURNTABLE_BOX, lot));
  assert.ok(pointIn(GARAGE_SITE.door.x, GARAGE_SITE.door.z, lot));
  assert.ok(SOLIDS.includes(TURNTABLE_BOX));
  // Your car (on the turntable) fits it, whatever the model
  const t = GARAGE_SITE.turntable;
  assert.ok(Math.hypot(2.95 / 2, 1.06 / 2) <= t.r, 'the longest player car hangs off the turntable');
});

test('the market square: stalls, gantry and pole on its lot, your stall\'s spot free, the aisle walkable', () => {
  const lot: Rect = [MARKET.ox, MARKET.oz, MARKET.ox + BS, MARKET.oz + BS];
  for (const t of MARKET_SITE.stalls) assert.ok(inside([t.x - t.w / 2, t.z - t.d / 2, t.x + t.w / 2, t.z + t.d / 2], lot), `stall at ${t.x}, ${t.z} is off the lot`);
  assert.ok(pointIn(MARKET_SITE.pole.x, MARKET_SITE.pole.z, lot));
  assert.ok(pointIn(MARKET_SITE.gantry.x, MARKET_SITE.gantry.z0, lot) && pointIn(MARKET_SITE.gantry.x, MARKET_SITE.gantry.z1, lot));
  // You stand on the spot (the prompt reaches 1.0), and it's in front of your stall's counter
  assert.ok(pointIn(STALL_SPOT.x, STALL_SPOT.z, lot));
  assert.ok(!blocked(STALL_SPOT.x, STALL_SPOT.z), 'your stall\'s spot is inside something');
  const mine = MARKET_SITE.stalls[0];
  assert.ok(STALL_SPOT.z > mine.z + mine.d / 2 && STALL_SPOT.z - (mine.z + mine.d / 2) < 1, 'the spot is not at the counter');
  // Down the aisle from the gantry to the far end, nothing in the way
  const az = (MARKET_SITE.stalls[0].z + MARKET_SITE.stalls[4].z) / 2;
  for (let x = MARKET.ox + 0.6; x < MARKET_SITE.pole.x - 0.4; x += 0.2) assert.ok(!blocked(x, az), `the aisle is blocked at x ${x.toFixed(1)}`);
  // and in through the gantry
  assert.ok(MARKET_SITE.gantry.z1 - MARKET_SITE.gantry.z0 > 3, 'the gantry is too narrow to walk through');
});

test('Makers\' Row: four units on their lot, apart, each with a door free to stand at whatever is built', () => {
  const lot: Rect = [UNITS.ox, UNITS.oz, UNITS.ox + BS, UNITS.oz + BS];
  const rects = UNIT_SITE.map((u): Rect => [u.x0, u.z0, u.x0 + UNIT_SIZE, u.z0 + UNIT_SIZE]);
  rects.forEach((r, i) => {
    assert.ok(inside(r, lot), `unit ${i + 1} is off its lot`);
    for (let j = i + 1; j < rects.length; j++) assert.ok(!(r[0] < rects[j][2] && r[2] > rects[j][0] && r[1] < rects[j][3] && r[3] > rects[j][1]), `units ${i + 1} and ${j + 1} overlap`);
  });
  for (const u of UNIT_SITE) {
    // The door is at the unit's street side, on the lot
    assert.ok(pointIn(u.door.x, u.door.z, lot), `unit ${u.i + 1}'s door is off the lot`);
    assert.ok(u.facing < 0 ? u.door.z < u.z0 + 1 : u.door.z > u.z0 + UNIT_SIZE - 1, `unit ${u.i + 1}'s door isn't at its front`);
    for (const kind of [null, ...UNIT_KIND_IDS]) {
      const boxes = unitSolids(u.i, kind);
      for (const b of boxes) assert.ok(inside(b, rects[u.i]), `unit ${u.i + 1}'s ${kind} reaches out of the unit`);
      assert.ok(!boxes.some((b) => pointIn(u.door.x, u.door.z, b, R)) && !blocked(u.door.x, u.door.z), `unit ${u.i + 1}'s door is blocked when it's a ${kind}`);
    }
  }
  // The units are off the market square (and its stalls)
  assert.ok(UNITS.oz + BS < MARKET.oz);
});

test('the big lots: on their own lots, off the roads, each with a door at its street free whatever is built', () => {
  for (const site of LOT_SITE) {
    const lot: Rect = [site.ox, site.oz, site.ox + BS, site.oz + BS];
    assert.ok(pointIn(site.door.x, site.door.z, lot), `lot ${site.i}'s door is off the lot`);
    for (const kind of [null, ...LOT_KIND_IDS]) {
      const boxes = lotSolids(site.i, kind);
      for (const b of boxes) {
        assert.ok(inside(b, lot), `lot ${site.i}'s ${kind} reaches out of the lot`);
        for (const r of EW_ROADS) assert.ok(b[3] <= r.c - r.half || b[1] >= r.c + r.half, `lot ${site.i}'s ${kind} is on a road`);
      }
      assert.ok(!boxes.some((b) => pointIn(site.door.x, site.door.z, b, R)) && !blocked(site.door.x, site.door.z), `lot ${site.i}'s door is blocked when it's a ${kind}`);
    }
    // The door faces a street: across its sidewalk and the verge, near enough for a car parked there to unload (tycoon-ui CAR_R, 9)
    assert.ok(EW_ROADS.some((r) => Math.abs(site.door.z - r.c) - LANE / 2 < 9), `lot ${site.i}'s door isn't on a street`);
  }
  // Clear of Makers' Row and the market
  for (const l of BIG_LOTS) assert.ok(l.ox > UNITS.ox + BS + 1 && l.ox > MARKET.ox + BS + 1);
});

test('the Fight Club: its footprints on the lot and in SOLIDS, the ring, the trainer\'s spot, the way out, the spawn and the corners free', () => {
  const lot: Rect = [FIGHT_CLUB.x0, FIGHT_CLUB.z0, FIGHT_CLUB.x1, FIGHT_CLUB.z1];
  assert.ok(FIGHTCLUB_SITE.length > 10);
  for (const b of FIGHTCLUB_SITE) {
    assert.ok(inside(b, lot), `box ${b.join(', ')} is off the lot`);
    assert.ok(SOLIDS.includes(b), `box ${b.join(', ')} is not in SOLIDS`);
  }
  // Nothing solid inside the ropes (the posts stand at the corners, outside)
  for (let x = RING.x - RING_HALF + 0.2; x <= RING.x + RING_HALF - 0.2 + 1e-9; x += 0.4)
    for (let z = RING.z - RING_HALF + 0.2; z <= RING.z + RING_HALF - 0.2 + 1e-9; z += 0.4) {
      assert.ok(inRing(x, z), `${x}, ${z} is not in the ring`);
      assert.ok(!FIGHTCLUB_SITE.some((b) => pointIn(x, z, b)), `something solid in the ring at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    }
  // Where you stand at the counter, where you step out, where Walk in starts and the fighters' corners
  for (const [name, p] of [['the trainer\'s spot', TRAINER], ['the way out', OUT], ['the spawn', FIGHT_SPAWN], ['your corner', CORNERS[0]], ['their corner', CORNERS[1]]] as const) {
    assert.ok(pointIn(p.x, p.z, lot), `${name} is off the lot`);
    assert.ok(!blocked(p.x, p.z), `${name} is inside something`);
  }
  // The trainer's spot is in front of the counter, within the prompt's reach
  assert.ok(TRAINER.z > FIGHTCLUB_SITE.find((b) => b[1] < TRAINER.z && b[3] > 87 && b[0] < TRAINER.x && b[2] > TRAINER.x)![3], 'the trainer stands behind the counter');
});

test('bullets stop at walls but not at the dummies\' own footprints', () => {
  assert.ok(SHOT_SOLIDS.length < SOLIDS.length);
  // From the street in front of the garage straight at its wall
  const from = { x: GARAGE_SITE.door.x, y: 1, z: GARAGE.oz - 2 };
  const t = rayBoxes(from, { x: 0, y: 0, z: 1 }, 100);
  assert.ok(Math.abs(from.z + t - GARAGE_SITE.building[1]) < 1e-6, `stopped at z ${from.z + t}`);
  // Down at the ground
  assert.ok(Math.abs(rayBoxes({ x: 0, y: 2.1, z: 0 }, { x: 0, y: -1, z: 0 }, 100) - 2) < 1e-6);
});
