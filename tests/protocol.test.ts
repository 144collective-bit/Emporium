// The multiplayer protocol's checks (protocol.ts), shared by the site and the game server:
// the world's edge, how fast each way of getting about may go, jumps, and the guns' mods.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FLAG, MODES, SPEEDS, cleanMods, inWorld, modeBits, modeOf, moveOk } from '../src/scripts/net/protocol';
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
  assert.ok(!inWorld(0, -2, 0) && !inWorld(0, 41, 0));
});

test('every district is inside it', () => {
  for (const [name, p] of Object.entries({ WALK_SPAWN, BLOCK_SPAWN, KART_SPAWN, AIR_SPAWN, STADIUM_SPAWN }))
    assert.ok(inWorld(p.x, 0.15, p.z), `${name} at ${p.x}, ${p.z}`);
});

test('the mode rides in the flags beside the other bits', () => {
  for (const m of MODES) {
    const fl = modeBits(m) | FLAG.armed | FLAG.run | FLAG.warp;
    assert.equal(modeOf(fl), m);
    assert.equal(fl & 0xff, FLAG.armed | FLAG.run | FLAG.warp);
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
