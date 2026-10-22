// Driving rules (drive-sim.ts): arcade handling and soft, safe collisions, and
// the garage's mods (catalog.ts, tycoon.ts) making a car faster through tune().
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RIVER_WALLS, circles, newCar, stepCar, tune, type CarState, type DriveInput, type DriveWorld } from '../src/scripts/city3d/drive-sim';
import { EXT, NS_ROADS, RIVER, WALK_W, WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { CARGO, DRIVE } from '../src/scripts/city3d/mycar';
import { NO_CAR_MODS, carStats } from '../src/scripts/city3d/catalog';
import { carStatsOf, cleanSave, modCar } from '../src/scripts/city3d/tycoon';
import type { Box } from '../src/scripts/city3d/solids';

const HATCH = { L: 2.2, W: 0.98, wheelbase: 1.38 };
const T = tune(DRIVE.hatch, HATCH);
const OPEN: DriveWorld = { boxes: [], soft: [] };
const BOUNDS: Box = [...WORLD_BOUNDS, 0];
const DT = 1 / 60;
const GAS: DriveInput = { throttle: 1, steer: 0, handbrake: false };
const HUGE: Box = [-1e5, -1e5, 1e5, 1e5, 0];
function run(c: CarState, inp: DriveInput, seconds: number, world = OPEN, bounds = HUGE) {
  let hit = 0;
  for (let i = 0; i < seconds / DT; i++) hit = Math.max(hit, stepCar(c, inp, T, DT, world, bounds));
  return hit;
}

test('better numbers make a faster, quicker, grippier car', () => {
  const slow = tune({ speed: 0, accel: 0, grip: 0 }, HATCH);
  const fast = tune({ speed: 1, accel: 1, grip: 1 }, HATCH);
  assert.ok(fast.top > slow.top && fast.accel > slow.accel && fast.grip > slow.grip);
  // Top speeds stay city-sized: about 45-115 km/h (a tile is 1.8 m)
  for (const t of [slow, fast]) assert.ok(t.top * 6.48 > 40 && t.top * 6.48 < 120);
});

test('mods raise the top speed, pick-up and grip through tune(), within the city-sized range', () => {
  const stock = tune(DRIVE.hatch, HATCH);
  const engine = tune(carStats(DRIVE.hatch, CARGO.hatch, { ...NO_CAR_MODS, engine: 3 }), HATCH);
  assert.ok(engine.top > stock.top, 'the engine mod raises the top speed');
  assert.equal(engine.accel, stock.accel);
  assert.equal(engine.grip, stock.grip);
  const all = tune(carStats(DRIVE.hatch, CARGO.hatch, { engine: 3, turbo: 3, tyres: 3, rack: 0 }), HATCH);
  assert.ok(all.accel > stock.accel && all.grip > stock.grip);
  // A maxed-out car is still city-sized (the stats cap a little over 1)
  const maxed = tune(carStats(DRIVE.super, CARGO.super, { engine: 3, turbo: 3, tyres: 3, rack: 3 }), HATCH);
  assert.ok(maxed.top * 6.48 < 120);
  // ...and the same numbers come from a save with the mods bought in it
  const save = cleanSave({ dorras: 1e6 }, 0);
  for (let k = 0; k < 3; k++) assert.ok(modCar(save, 'hatch', 'engine').ok);
  assert.deepEqual(tune(carStatsOf(save, 'hatch'), HATCH), engine);
  // A modded car actually goes faster
  const slow = newCar(0, 0, 0);
  const fast = newCar(0, 0, 0);
  for (let i = 0; i < 20 / DT; i++) {
    stepCar(slow, GAS, stock, DT, OPEN, HUGE);
    stepCar(fast, GAS, engine, DT, OPEN, HUGE);
  }
  assert.ok(fast.speed > slow.speed + 1, `${fast.speed} vs ${slow.speed}`);
});

test('full gas builds speed up to the top speed, never past it', () => {
  const c = newCar(0, 0, 0);
  run(c, GAS, 2);
  const early = c.speed;
  run(c, GAS, 20);
  assert.ok(early > 3, 'pulls away');
  assert.ok(c.speed <= T.top + 1e-6 && c.speed > T.top * 0.95, `speed ${c.speed}`);
  // Facing +x at yaw 0
  assert.ok(c.x > 50 && Math.abs(c.z) < 1e-6);
});

test('the brake stops it, then it reverses (slowly)', () => {
  const c = newCar(0, 0, 0);
  run(c, GAS, 3);
  run(c, { throttle: -1, steer: 0, handbrake: false }, 1.2);
  assert.ok(c.speed < 1, 'stopped or nearly');
  run(c, { throttle: -1, steer: 0, handbrake: false }, 6);
  assert.ok(Math.abs(c.speed + T.reverse) < 1e-6, `reverse speed ${c.speed}`);
});

test('steering right turns right (yaw goes down), and wider when fast', () => {
  const slow = newCar(0, 0, 0);
  slow.speed = slow.vx = 3;
  run(slow, { throttle: 0.2, steer: 1, handbrake: false }, 0.5);
  assert.ok(slow.yaw < 0);
  const fast = newCar(0, 0, 0);
  fast.speed = fast.vx = 11;
  run(fast, { throttle: 0.2, steer: 1, handbrake: false }, 0.5);
  // Turning radius: speed / yaw rate
  assert.ok(Math.abs(fast.speed / fast.yawRate) > Math.abs(slow.speed / slow.yawRate));
});

test('the handbrake lets the back slide out', () => {
  const grip = newCar(0, 0, 0);
  const slide = newCar(0, 0, 0);
  for (const c of [grip, slide]) c.speed = c.vx = 10;
  run(grip, { throttle: 0, steer: 1, handbrake: false }, 0.6);
  run(slide, { throttle: 0, steer: 1, handbrake: true }, 0.6);
  const drift = (c: CarState) => Math.abs(Math.atan2(-c.vz, c.vx) - c.yaw);
  assert.ok(drift(slide) > drift(grip));
});

test('walls: driving at one never gets the car inside it', () => {
  const wall: Box = [10, -5, 12, 5, 2];
  for (const angle of [0, 0.4, -0.7, 1.1]) {
    const c = newCar(0, -Math.tan(angle) * 6, angle * 0.5);
    const world = { boxes: [wall], soft: [] };
    for (let i = 0; i < 400; i++) {
      stepCar(c, GAS, T, DT, world, BOUNDS);
      for (const cc of circles(c, T)) {
        const px = Math.max(wall[0], Math.min(cc.x, wall[2]));
        const pz = Math.max(wall[1], Math.min(cc.z, wall[3]));
        assert.ok(Math.hypot(cc.x - px, cc.z - pz) > cc.r - 0.05, `inside the wall at step ${i}`);
      }
    }
  }
});

test('low things (kerbs, pond edges) don\'t stop it', () => {
  const c = newCar(0, 0, 0);
  run(c, GAS, 3, { boxes: [[8, -3, 9, 3, 0.1]], soft: [] });
  assert.ok(c.x > 9);
});

test('the river stops it except over the bridges', () => {
  const into = newCar(5, RIVER[0] - 5, -Math.PI / 2);
  run(into, GAS, 5);
  assert.ok(into.z < RIVER[0], 'drove into the river');
  for (const r of NS_ROADS) {
    // Down each lane of every bridge
    const c = newCar(r.c + 0.85, RIVER[0] - 6, -Math.PI / 2);
    run(c, GAS, 5);
    assert.ok(c.z > RIVER[1] + 1, `blocked on the bridge at x ${r.c}`);
  }
  // The gaps in the river walls are the bridges' width
  assert.equal(RIVER_WALLS.length, NS_ROADS.length + 1);
  for (const r of NS_ROADS) assert.ok(!RIVER_WALLS.some((w) => w[0] < r.c + r.half && w[2] > r.c - r.half), `no gap at x ${r.c}`);
  // From the street plan (growth plan Phase 5): the river runs edge to edge, and the walls are what they were
  assert.equal(RIVER_WALLS[0][0], EXT[0]);
  assert.equal(RIVER_WALLS.at(-1)![2], EXT[1]);
  const gaps = NS_ROADS.map((r) => [r.c - r.half - WALK_W + 0.1, r.c + r.half + WALK_W - 0.1]);
  RIVER_WALLS.slice(1).forEach((w, i) => assert.ok(Math.abs(w[0] - gaps[i][1]) < 1e-9 && Math.abs(RIVER_WALLS[i][2] - gaps[i][0]) < 1e-9));
});

test('people and other cars are soft: a bump, never driving through', () => {
  const person = { x: 6, z: 0, r: 0.28 };
  const c = newCar(0, 0, 0);
  let hit = 0;
  for (let i = 0; i < 300; i++) {
    hit = Math.max(hit, stepCar(c, GAS, T, DT, { boxes: [], soft: [person] }, BOUNDS));
    for (const cc of circles(c, T)) assert.ok(Math.hypot(cc.x - person.x, cc.z - person.z) > cc.r + person.r - 0.05);
  }
  assert.ok(hit > 0, 'it noticed the bump');
  assert.ok(c.x < person.x, 'still on the near side');
});

test('the edge of the world holds it in', () => {
  const c = newCar(BOUNDS[2] - 4, 0, 0);
  run(c, GAS, 5, OPEN, BOUNDS);
  assert.ok(c.x <= BOUNDS[2]);
});
