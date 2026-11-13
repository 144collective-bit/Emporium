// The Outlands' land and save (docs/outlands-plan.md, Phase 0): outlands.ts and outlands-save.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHUNK, CHUNKS, HALF, LAKE, LODS, RIVER, SIZE, SPAWN, WADE, WALK_LIMIT, WATER_Y, chunkDist, chunkKey, chunkOf, chunkX, chunksAround, heightAt, inBounds, noise, riverZ, slopeAt, walkable, waterDepth } from '../src/scripts/city3d/outlands';
import { OUTLANDS_KEY, cleanOutlands, keepRun, newOutlands, startRun } from '../src/scripts/city3d/outlands-save';
import { BACKUP_KEYS } from '../src/scripts/city3d/backup';
import { LIVE_FEATURES } from '../src/scripts/city3d/live';

/** A grid of points over the walkable land, `n` a side */
const grid = (n: number) => {
  const out: [number, number][] = [];
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) out.push([-WALK_LIMIT + ((a + 0.5) * 2 * WALK_LIMIT) / n, -WALK_LIMIT + ((b + 0.5) * 2 * WALK_LIMIT) / n]);
  return out;
};

test('about 8 km across, in whole chunks', () => {
  assert.equal(SIZE, CHUNKS * CHUNK);
  // (1 tile is about 1.8 m)
  const km = (SIZE * 1.8) / 1000;
  assert.ok(km > 7.5 && km < 8.5, `${km} km`);
  assert.ok(WALK_LIMIT < HALF - 100, 'the mountains at the edge stand past where walking stops');
});

test('the land is the same every time: seeded, no Math.random', () => {
  const random = Math.random;
  Math.random = () => {
    throw new Error('Math.random');
  };
  try {
    const a = grid(30).map(([x, z]) => heightAt(x, z));
    const b = grid(30).map(([x, z]) => heightAt(x, z));
    assert.deepEqual(a, b);
  } finally {
    Math.random = random;
  }
  for (let i = 0; i < 2000; i++) {
    const n = noise(i * 0.37 - 300, i * 0.91 + 17, 3);
    assert.ok(n >= -1 && n <= 1, String(n));
  }
});

test('hills, not cliffs: nowhere walkable is steeper than 1 in 1', () => {
  let worst = 0;
  for (const [x, z] of grid(140)) worst = Math.max(worst, slopeAt(x, z));
  assert.ok(worst < 1, `steepest ${worst.toFixed(2)}`);
  // (and it isn't flat: real hills)
  const hs = grid(40).map(([x, z]) => heightAt(x, z));
  assert.ok(Math.max(...hs) - Math.min(...hs) > 30);
});

test('dry land everywhere but the river and the lake', () => {
  for (const [x, z] of grid(120)) {
    if (waterDepth(x, z) === 0) continue;
    const river = Math.abs(z - riverZ(x)) < RIVER.half + 0.5;
    const lake = Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 0.5;
    assert.ok(river || lake, `wet at ${x}, ${z}`);
  }
});

test('the river is waded across anywhere; the lake is too deep', () => {
  for (let x = -WALK_LIMIT; x <= WALK_LIMIT; x += 37) {
    const z = riverZ(x);
    assert.ok(waterDepth(x, z) > 0, `the river is wet at x ${x}`);
    assert.ok(waterDepth(x, z) <= WADE, `the river is shallow at x ${x}`);
    if (inBounds(x, z)) assert.ok(walkable(x, z));
  }
  assert.ok(waterDepth(LAKE.x, LAKE.z) > WADE * 4);
  assert.equal(walkable(LAKE.x, LAKE.z), false);
  // (and it doesn't run into the lake)
  for (let x = LAKE.x - LAKE.shore; x <= LAKE.x + LAKE.shore; x += 5) assert.ok(Math.hypot(x - LAKE.x, riverZ(x) - LAKE.z) > LAKE.shore + RIVER.half);
});

test('the edge: mountains past the walking limit, nothing walkable past it', () => {
  assert.equal(walkable(WALK_LIMIT + 1, 0), false);
  assert.equal(walkable(0, -WALK_LIMIT - 1), false);
  assert.ok(heightAt(HALF - 5, 300) > heightAt(0, 300) + 40);
  assert.ok(heightAt(-300, -HALF + 5) > 80);
});

test('the spawn is on dry, gentle land', () => {
  assert.ok(walkable(SPAWN.x, SPAWN.z));
  assert.ok(heightAt(SPAWN.x, SPAWN.z) > WATER_Y + 0.5);
  assert.ok(slopeAt(SPAWN.x, SPAWN.z) < 0.4);
});

test('chunks: every point is in one, nearest first, each tier reaching as far as its last detail', () => {
  assert.equal(chunkOf(-HALF), 0);
  assert.equal(chunkOf(HALF - 0.001), CHUNKS - 1);
  assert.equal(chunkOf(HALF + 50), CHUNKS - 1);
  assert.equal(chunkX(chunkOf(10)) <= 10 && 10 < chunkX(chunkOf(10)) + CHUNK, true);
  for (const tier of ['high', 'low'] as const) {
    const { within, steps } = LODS[tier];
    assert.equal(within.length, steps.length);
    for (let k = 1; k < within.length; k++) assert.ok(within[k] > within[k - 1] && steps[k] > steps[k - 1]);
    // (every step fits a chunk a whole number of times, so neighbours share their edges)
    for (const s of steps) assert.equal(CHUNK % s, 0);
    const near = chunksAround(SPAWN.x, SPAWN.z, tier);
    assert.equal(near[0].dist, 0);
    assert.equal(near[0].lod, 0);
    for (let k = 1; k < near.length; k++) assert.ok(near[k].dist >= near[k - 1].dist);
    for (const c of near) {
      assert.ok(c.dist <= within[c.lod] && (c.lod === 0 || c.dist > within[c.lod - 1]));
      assert.equal(chunkDist(c.i, c.j, SPAWN.x, SPAWN.z), c.dist);
    }
    assert.equal(new Set(near.map(chunkKey)).size, near.length);
  }
  // (phones draw fewer, so their draw calls stay low)
  const high = chunksAround(0, 0, 'high').length;
  const low = chunksAround(0, 0, 'low').length;
  assert.ok(low < high / 2, `${low} on phones, ${high} on desktop`);
  assert.ok(high <= 120, `${high} chunks at most on desktop`);
});

test('the save: its own key, in the backup, cleaned of anything', () => {
  assert.ok(OUTLANDS_KEY.startsWith('degen-city-'));
  assert.ok((BACKUP_KEYS as readonly string[]).includes(OUTLANDS_KEY));
  for (const raw of [undefined, null, 'x', 42, [], {}, { run: 'x' }, { run: { x: 'a', z: 1 } }, { runs: -3 }]) assert.deepEqual(cleanOutlands(raw), newOutlands());
  // (a run in the lake or past the edge is dropped)
  assert.equal(cleanOutlands({ run: { x: LAKE.x, z: LAKE.z, yaw: 0, started: 1, at: 2 } }).run, null);
  assert.equal(cleanOutlands({ run: { x: HALF, z: 0, yaw: 0, started: 1, at: 2 } }).run, null);
  const kept = cleanOutlands({ v: 1, runs: 2, run: { x: SPAWN.x, z: SPAWN.z, yaw: 1, started: 10, at: 20 } });
  assert.deepEqual(kept, { v: 1, runs: 2, run: { x: SPAWN.x, z: SPAWN.z, yaw: 1, started: 10, at: 20 } });
  assert.deepEqual(cleanOutlands(JSON.parse(JSON.stringify(kept))), kept);
});

test('a run starts at the spawn, carries on, and keeps where he walks', () => {
  const s = newOutlands();
  const r = startRun(s, SPAWN, 100);
  assert.equal(s.runs, 1);
  assert.deepEqual([r.x, r.z, r.started], [SPAWN.x, SPAWN.z, 100]);
  assert.equal(startRun(s, SPAWN, 200), r, 'carried on, not a new one');
  assert.equal(s.runs, 1);
  keepRun(s, SPAWN.x + 5, SPAWN.z, 2, 300);
  assert.deepEqual([s.run!.x, s.run!.yaw, s.run!.at], [SPAWN.x + 5, 2, 300]);
  // (never somewhere he couldn't stand)
  keepRun(s, LAKE.x, LAKE.z, 0, 400);
  assert.equal(s.run!.x, SPAWN.x + 5);
});

test('the owner can close the way in', () => {
  assert.ok(LIVE_FEATURES.some((f) => f.id === 'outlands'));
});
