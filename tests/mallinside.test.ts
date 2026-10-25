// Inside Starlight Mall (mallinside.ts, docs/mall-plan.md step 2): the hall's walls with the doors open, the
// units on both floors, the atrium, the escalators, the food court upstairs; walking in at the doors, up an
// escalator to the food court and round the galleries, never off the upper floor's edges; its people clear of it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BALUSTRADE,
  BOLLARDS,
  BOLLARD,
  DOOR,
  ESCALATORS,
  FOOD_STALLS,
  FOOT_Z,
  IN,
  INSIDE_SPAWN,
  INSIDE_TALLEST,
  KIOSKS,
  LIFT_SHAFT,
  MALL_LIFT,
  LEVEL_SOLIDS,
  LOBBY_Z,
  MALL_INSIDE_PEOPLE,
  MALL_INSIDE_SOLIDS,
  STALL_Z,
  TABLES,
  TERRACE_Z,
  UNITS,
  UNIT_NAMES,
  UP,
  UPPER,
  VOID,
  escalatorY,
  floorsAt,
  mallFloor,
  mallWall,
} from '../src/scripts/city3d/mallinside';
import { HALL, MALL_SPAWN, PORCH } from '../src/scripts/city3d/mall';
import { SOLIDS } from '../src/scripts/city3d/solids';

type Rect = readonly number[];
const inBox = (b: Rect, x: number, z: number, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;
const SLAB = 0.15;
const R = 0.22;

test('the units, two floors of them, made-up names; the food court upstairs; all under the roof', () => {
  assert.equal(UNITS.length, 16);
  assert.equal(new Set(UNITS.map((u) => u.name)).size, UNITS.length);
  for (const n of [...UNIT_NAMES, ...FOOD_STALLS.map((s) => s.name)]) assert.ok(!/\d/.test(n), `${n}: no numbers`);
  for (const u of UNITS) assert.ok(inBox(IN, u.rect[0], u.rect[1], 1e-6) && inBox(IN, u.rect[2], u.rect[3], 1e-6));
  for (const [x, z] of TABLES) assert.ok(UPPER.some((r) => inBox(r, x, z)) && z > STALL_Z + 0.8, 'a table on the terrace');
  assert.ok(INSIDE_TALLEST < HALL.h && UP * 2 <= HALL.h + 1e-6, 'two floors under the roof');
});

test('the floors: two over the galleries and the terrace, one in the atrium, an escalator on its own', () => {
  assert.deepEqual(floorsAt((VOID[0] + VOID[2]) / 2 - 4, (VOID[1] + VOID[3]) / 2), [0]);
  assert.deepEqual(floorsAt(VOID[0] - 1, (VOID[1] + VOID[3]) / 2), [0, UP]);
  assert.deepEqual(floorsAt(25, STALL_Z + 3), [0, UP]);
  const e = ESCALATORS[0];
  const x = (e.x0 + e.x1) / 2;
  assert.equal(escalatorY(FOOT_Z + 0.5), 0);
  assert.equal(escalatorY(TERRACE_Z + 0.4), UP);
  assert.deepEqual(floorsAt(x, (FOOT_Z + TERRACE_Z) / 2), [escalatorY((FOOT_Z + TERRACE_Z) / 2)]);
  // By Degen's height: under a gallery he's on the ground floor, up there on the upper one
  assert.equal(mallFloor(VOID[0] - 1, -130, SLAB + 0.3), SLAB);
  assert.equal(mallFloor(VOID[0] - 1, -130, SLAB + UP + 0.3), SLAB + UP);
  assert.equal(mallFloor(HALL.rect[0] - 2, -130, 0), null);
});

test('the balustrades: the upper floor\'s edges, an escalator\'s side, what stands on your floor', () => {
  const up = SLAB + UP;
  // Off the gallery's edge into the atrium, and back from it
  assert.ok(mallWall(VOID[0] + 0.1, -130, up, R));
  assert.ok(!mallWall(VOID[0] - 1, -130, up, R));
  // Downstairs the atrium is open floor, but not under an escalator's middle
  assert.ok(!mallWall(VOID[0] + 1, -130, SLAB, R));
  const e = ESCALATORS[0];
  assert.ok(mallWall((e.x0 + e.x1) / 2, (FOOT_Z + TERRACE_Z) / 2, SLAB, 0));
  // The tables are upstairs: they stop you there, not under the terrace
  const [tx, tz] = TABLES[0];
  assert.ok(mallWall(tx, tz, up, R));
  assert.ok(!mallWall(tx, tz, SLAB, R) || LEVEL_SOLIDS.some((b) => b[4] === 0 && inBox(b, tx, tz, R)));
});

test("what's solid: the walls with the doors open, nothing in the way of the doors; the bollards stop a car", () => {
  const z = HALL.rect[3] - 0.15;
  for (let x = DOOR.x0 + 0.3; x < DOOR.x1 - 0.3; x += 0.1) {
    const blocked = SOLIDS.some((b) => inBox(b, x, z, R));
    const bollard = BOLLARDS.some(([bx]) => Math.abs(bx - x) < BOLLARD + R + 1e-6);
    assert.ok(!blocked || bollard, `the doorway at ${x.toFixed(1)}`);
  }
  // A walker gets between the bollards, no car does (a car's half-width is over 0.6)
  for (let i = 1; i < BOLLARDS.length; i++) {
    const gap = BOLLARDS[i][0] - BOLLARDS[i - 1][0] - BOLLARD * 2;
    assert.ok(gap > R * 2 + 0.2 && gap < 1.2, `gap ${gap}`);
  }
  assert.ok(BOLLARDS[0][0] - BOLLARD - DOOR.x0 < 1.2 && DOOR.x1 - BOLLARDS.at(-1)![0] - BOLLARD < 1.2);
  assert.ok(BOLLARDS.every(([, bz]) => bz > HALL.rect[3] && bz < PORCH.rect[3]));
  for (const p of MALL_INSIDE_PEOPLE)
    // (the food court's cooks stand behind their counters, in the stalls' strip)
    if (p.act !== 'sit' && p.z > STALL_Z) {
      assert.ok(!MALL_INSIDE_SOLIDS.some((b) => inBox(b, p.x, p.z, 0.15)), `someone at ${p.x}, ${p.z} in something`);
      assert.ok(!LEVEL_SOLIDS.some((b) => (b[4] === 1) === p.y > 1 && inBox(b, p.x, p.z, 0.15)), `someone at ${p.x}, ${p.z} in something on their floor`);
      assert.ok(floorsAt(p.x, p.z).includes(p.y), `someone at ${p.x}, ${p.z} off their floor`);
    }
});

test('walking in at the doors, round the ground floor, up an escalator to the food court and round the galleries', () => {
  const step = 0.25;
  const [x0, z0, x1, z1] = [HALL.rect[0], HALL.rect[1], HALL.rect[2], MALL_SPAWN.z + 1];
  const nx = Math.ceil((x1 - x0) / step) + 1;
  const nz = Math.ceil((z1 - z0) / step) + 1;
  const blocked = (x: number, z: number, y: number) => SOLIDS.some((b) => inBox(b, x, z, R)) || mallWall(x, z, y, R);
  const ground = (x: number, z: number, y: number) => mallFloor(x, z, y + 0.3) ?? SLAB;
  const seen = new Map<string, number>();
  const key = (i: number, k: number, y: number) => `${i},${k},${Math.round(y * 4)}`;
  const at = (i: number, k: number) => [x0 + i * step, z0 + k * step];
  const start: [number, number, number] = [Math.round((MALL_SPAWN.x - x0) / step), Math.round((MALL_SPAWN.z - z0) / step), SLAB];
  const queue = [start];
  seen.set(key(...start), SLAB);
  let maxY = 0;
  const reached = new Set<string>();
  while (queue.length) {
    const [i, k, y] = queue.pop()!;
    maxY = Math.max(maxY, y);
    for (const [di, dk] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const [a, c] = [i + di, k + dk];
      if (a < 0 || c < 0 || a >= nx || c >= nz) continue;
      const [x, z] = at(a, c);
      if (blocked(x, z, y)) continue;
      const g = ground(x, z, y);
      // (no step up more than a kerb's worth, and no falling off: the walls above see to it)
      if (g > y + 0.3 + 1e-6) continue;
      const kk = key(a, c, g);
      if (seen.has(kk)) continue;
      seen.set(kk, g);
      if (g > SLAB + UP - 0.01) reached.add(`${a},${c}`);
      queue.push([a, c, g]);
    }
  }
  const upAt = (x: number, z: number) => reached.has(`${Math.round((x - x0) / step)},${Math.round((z - z0) / step)}`);
  assert.ok([...seen.keys()].some((k) => k.startsWith(`${Math.round((INSIDE_SPAWN.x - x0) / step)},${Math.round((INSIDE_SPAWN.z - z0) / step)},`)), 'in at the doors to the lobby');
  assert.ok(maxY > SLAB + UP - 0.01, 'up an escalator');
  assert.ok(upAt((IN[0] + IN[2]) / 2, STALL_Z + 1.2), 'the food court');
  assert.ok(upAt(VOID[0] - 1.5, LOBBY_Z - 1), 'the west gallery');
  assert.ok(upAt(VOID[2] + 1.5, LOBBY_Z - 1), 'the east gallery');
  // Nowhere upstairs over the atrium (the balustrades hold)
  for (const s of reached) {
    const [a, c] = s.split(',').map(Number);
    const [x, z] = at(a, c);
    assert.ok(!inBox(VOID, x, z, -0.01) || ESCALATORS.some((e) => x > e.x0 && x < e.x1), `upstairs over the atrium at ${x}, ${z}`);
  }
});

test('the glass lift: a door on each floor, clear of everything, its stops on their floors; the kiosks clear of the way round', () => {
  const clear = (x: number, z: number) => !SOLIDS.some((b) => inBox(b, x, z, R));
  assert.ok(clear(MALL_LIFT.low.x, MALL_LIFT.low.z) && clear(MALL_LIFT.high.x, MALL_LIFT.high.z));
  assert.equal(mallFloor(MALL_LIFT.up.x, MALL_LIFT.up.z, SLAB + MALL_LIFT.up.y + 0.3), SLAB + UP);
  assert.ok(!mallWall(MALL_LIFT.up.x, MALL_LIFT.up.z, SLAB + UP, R), 'the upper stop on the gallery');
  assert.ok(!mallWall(MALL_LIFT.down.x, MALL_LIFT.down.z, SLAB, R), 'the lower stop on the ground floor');
  assert.ok(inBox(VOID, LIFT_SHAFT[0], LIFT_SHAFT[1]) && inBox(VOID, LIFT_SHAFT[2], LIFT_SHAFT[3]), 'the shaft in the atrium');
  for (const k of KIOSKS) {
    assert.ok(inBox(VOID, k.rect[0], k.rect[1]) && inBox(VOID, k.rect[2], k.rect[3]));
    assert.ok(!/\d/.test(k.name));
    for (const e of ESCALATORS) assert.ok(k.rect[2] < e.x0 - BALUSTRADE - 0.8 || k.rect[0] > e.x1 + BALUSTRADE + 0.8, 'room between a kiosk and an escalator');
  }
});
