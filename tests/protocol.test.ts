// The multiplayer protocol's checks (protocol.ts), shared by the site and the game server:
// the world's edge, how fast each way of getting about may go, jumps, the guns' mods, and what a player is in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FLAG, MODES, SPEEDS, VEH_KINDS, cleanMods, cleanVehicle, faceYaw, inWorld, jumped, modeBits, modeOf, moveOk, sameVehicle, vehFace } from '../src/scripts/net/protocol';
import { CEILING } from '../src/scripts/city3d/flight-sim';
import { CAR_PAINTS, PLAYER_AIRCRAFT, PLAYER_BIKES, PLAYER_CARS, PLAYER_KARTS } from '../src/scripts/city3d/vehicleids';
import { EXT, WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { BLOCK_SPAWN } from '../src/scripts/city3d/projects';
import { KART_SPAWN } from '../src/scripts/city3d/kartpark';
import { AIR_SPAWN } from '../src/scripts/city3d/airfield';
import { STADIUM_SPAWN } from '../src/scripts/city3d/stadium';
import { WALK_SPAWN } from '../src/scripts/city3d/solids';
import { MOD_LEVELS } from '../src/scripts/city3d/catalog';

test('the world is the one you can walk and drive, edge to edge', () => {
  const [x0, z0, x1, z1] = WORLD_BOUNDS;
  assert.ok(inWorld(x0, 0.15, z0) && inWorld(x1, 0.15, z1));
  assert.ok(!inWorld(EXT[0] - 1, 0.15, 0) && !inWorld(0, 0.15, EXT[1] + 1));
  // (down to the river's water, up to an aircraft's ceiling: your own flies there)
  assert.ok(inWorld(0, -1.5, 0) && inWorld(0, CEILING, 0));
  assert.ok(!inWorld(0, -4, 0) && !inWorld(0, CEILING + 9, 0));
});

test('every district is inside it', () => {
  for (const [name, p] of Object.entries({ WALK_SPAWN, BLOCK_SPAWN, KART_SPAWN, AIR_SPAWN, STADIUM_SPAWN }))
    assert.ok(inWorld(p.x, 0.15, p.z), `${name} at ${p.x}, ${p.z}`);
});

test('the mode rides in the flags beside the other bits', () => {
  for (const m of MODES) {
    const fl = modeBits(m) | FLAG.armed | FLAG.run | FLAG.warp | FLAG.gear;
    assert.equal(modeOf(fl), m);
    assert.equal(fl & 0xff, FLAG.armed | FLAG.run | FLAG.warp);
    assert.ok(fl & FLAG.gear);
  }
  assert.equal(modeOf(0), 'walk');
  assert.equal(modeOf(7 << 8), 'walk');
});

test('each way of getting about has its own top speed', () => {
  const a = { x: 0, z: 0 };
  // A second at a car's speed is too far on foot, fine in the car, the kart or the air
  const car = { x: 25, z: 0 };
  assert.ok(!moveOk(a, car, 1, modeBits('walk')));
  assert.ok(!moveOk(a, car, 1, modeBits('fight')));
  for (const m of ['drive', 'kart', 'ride', 'fly'] as const) assert.ok(moveOk(a, car, 1, modeBits(m)), m);
  // Nothing outruns its own limit (a jump is FLAG.warp's job)
  for (const m of MODES) assert.ok(!moveOk(a, { x: SPEEDS[m] * 2 + 3, z: 0 }, 1, modeBits(m)), m);
  // Walking keeps its old slack: a step, and no more, when two messages arrive together
  assert.ok(moveOk(a, { x: 0.7, z: 0 }, 0, 0));
  assert.ok(!moveOk(a, { x: 0.8, z: 0 }, 0, 0));
  // A fast plane's two messages arriving together still pass
  assert.ok(moveOk(a, { x: 2, z: 0 }, 0, modeBits('fly')));
});

test('the guns’ mods are whole levels within the workbench’s', () => {
  assert.deepEqual(cleanMods(null), {});
  assert.deepEqual(cleanMods('rifle'), {});
  assert.deepEqual(cleanMods({ rifle: { barrel: 2, mag: 1, grip: 3 } }), { rifle: { barrel: 2, mag: 1, grip: 3 } });
  assert.deepEqual(cleanMods({ rifle: { barrel: 99, mag: -4, grip: 1.5 } }), { rifle: { barrel: MOD_LEVELS, mag: 0, grip: 0 } });
  assert.deepEqual(cleanMods({ laser: { barrel: 1 }, smg: 'x', lmg: {} }), { lmg: { barrel: 0, mag: 0, grip: 0 } });
});

test('what a player is in: every vehicle of theirs, any paint, nothing else', () => {
  const lists = { car: PLAYER_CARS, bike: PLAYER_BIKES, kart: PLAYER_KARTS, plane: PLAYER_AIRCRAFT, boat: ['hire'] } as const;
  for (const k of VEH_KINDS)
    for (const id of lists[k])
      for (const { id: p } of CAR_PAINTS) assert.deepEqual(cleanVehicle({ k, id, p }), { k, id, p });
  // Wrong kinds, a model of another kind, the city's own models, unknown paints, junk: nothing
  for (const bad of [null, 'car', {}, { k: 'tank', id: 'hatch', p: 'red' }, { k: 'car', id: 'rocket', p: 'red' }, { k: 'car', id: 'bus', p: 'red' }, { k: 'car', id: 'police', p: 'red' }, { k: 'car', id: 'hatch', p: '#ff0000' }, { k: 'boat', id: 'yacht', p: 'red' }])
    assert.equal(cleanVehicle(bad), null, JSON.stringify(bad));
  // Only the three fields go through
  assert.deepEqual(cleanVehicle({ k: 'car', id: 'hatch', p: 'red', name: '<b>x</b>' }), { k: 'car', id: 'hatch', p: 'red' });
  assert.ok(sameVehicle(null, undefined) && sameVehicle({ k: 'car', id: 'hatch', p: 'red' }, { k: 'car', id: 'hatch', p: 'red' }));
  assert.ok(!sameVehicle(null, { k: 'car', id: 'hatch', p: 'red' }) && !sameVehicle({ k: 'car', id: 'hatch', p: 'red' }, { k: 'car', id: 'hatch', p: 'cyan' }));
});

test('a vehicle\'s heading travels as a walker\'s facing, and comes back', () => {
  for (const yaw of [0, 0.7, -2, Math.PI]) {
    const f = vehFace(yaw);
    // (the same way forward: a vehicle's (cos, -sin), a walker's (sin, cos))
    assert.ok(Math.abs(Math.cos(yaw) - Math.sin(f)) < 1e-9 && Math.abs(-Math.sin(yaw) - Math.cos(f)) < 1e-9);
    assert.ok(Math.abs(faceYaw(f) - yaw) < 1e-9);
  }
});

test('a jump between snapshots is told from a fast move', () => {
  const a = { x: 0, z: 0 };
  // A sprint's step or a car's 15th of a second: moves; across town: a jump
  assert.ok(!jumped(a, { x: 0.6, z: 0 }, 1 / 15, modeBits('walk')));
  assert.ok(!jumped(a, { x: 2, z: 0 }, 1 / 15, modeBits('drive')));
  assert.ok(jumped(a, { x: 60, z: 0 }, 1 / 15, modeBits('walk')));
  assert.ok(jumped(a, { x: 60, z: 0 }, 1 / 15, modeBits('fly')));
  // A car's speed on foot between two snapshots is a jump (fast travel out of a car lands on foot)
  assert.ok(jumped(a, { x: 3, z: 0 }, 1 / 15, modeBits('walk')));
});
