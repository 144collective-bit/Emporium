/*
 * The wall round Sector 7 (wall.ts, docs/wall-plan.md): 200 ft of solid concrete past the grass round the
 * world's edge, closed all round, with everything that exists inside it. Run at both sizes of the world.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CULVERTS, WALL, WALL_CORNERS, WALL_H, WALL_INNER, WALL_OUTER, WALL_RUNS, fromWall, inWall } from '../src/scripts/city3d/wall';
import { EXT, RIVER, WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { PLAN } from '../src/scripts/city3d/streetplan';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import { TALLEST as UPTOWN_TALLEST } from '../src/scripts/city3d/highrise';
import { CEILING } from '../src/scripts/city3d/flight-sim';
import { SITE } from '../src/scripts/city3d/airfield';
import { KART_PARK } from '../src/scripts/city3d/kartpark';
import { SKY_RADIUS } from '../src/scripts/city3d/bounds';

test('it is 200 ft of concrete: far over the Emporium, under the spire and what flies', () => {
  assert.ok(Math.abs(WALL_H * 1.8 - 60.96) < 1e-9, '200 ft at 1.8 m a tile');
  assert.equal(WALL.h, WALL_H);
  assert.ok(WALL.h > 33 && WALL.h < 35);
  assert.ok(WALL.h > EMPORIUM_ROOF * 2.5, 'nearly three times the Emporium');
  assert.ok(WALL.h < UPTOWN_TALLEST.roof, "Sector 7 Tower's roof still stands over it");
  assert.ok(WALL.h < CEILING - 20, 'room to fly over it');
  assert.equal(WALL.thick, 8);
});

test('it stands past the grass round the edge, its inner face 80 out', () => {
  assert.equal(WALL.out, 80);
  assert.deepEqual(WALL_INNER, [EXT[0] - 80, EXT[0] - 80, EXT[1] + 80, EXT[1] + 80]);
  for (let k = 0; k < 4; k++) assert.equal(Math.abs(WALL_OUTER[k] - WALL_INNER[k]), WALL.thick);
});

test('it is solid all round: the four sides meet at the corners, nothing overlaps, no gap', () => {
  const area = (r: number[]) => (r[2] - r[0]) * (r[3] - r[1]);
  const ring = area(WALL_OUTER) - area(WALL_INNER);
  assert.ok(Math.abs(WALL_RUNS.reduce((a, r) => a + area(r.rect), 0) - ring) < 1e-6, 'the runs cover the ring exactly');
  for (const a of WALL_RUNS)
    for (const b of WALL_RUNS)
      if (a !== b) {
        const ox = Math.min(a.rect[2], b.rect[2]) - Math.max(a.rect[0], b.rect[0]);
        const oz = Math.min(a.rect[3], b.rect[3]) - Math.max(a.rect[1], b.rect[1]);
        assert.ok(ox <= 1e-9 || oz <= 1e-9, `${a.side} and ${b.side} overlap`);
      }
  // Walked round its middle line, every step is wall (no exits yet, the owner's call)
  const [i0, j0, i1, j1] = WALL_INNER;
  const m = WALL.thick / 2;
  for (let t = i0 - m; t <= i1 + m; t += 1) {
    assert.ok(inWall(t, j0 - m) && inWall(t, j1 + m), `a gap at x ${t}`);
  }
  for (let t = j0 - m; t <= j1 + m; t += 1) assert.ok(inWall(i0 - m, t) && inWall(i1 + m, t), `a gap at z ${t}`);
  // Neither inside it nor past it is wall
  assert.ok(!inWall(30, 30) && !inWall(WALL_OUTER[0] - 1, 30) && !inWall(30, WALL_OUTER[3] + 1));
  for (const [x, z] of WALL_CORNERS) assert.ok(inWall(x + Math.sign(30 - x) * 0.5, z + Math.sign(30 - z) * 0.5), `the corner ${x}, ${z}`);
});

test('everything that exists stands inside it, well clear: nothing moves for it', () => {
  // Where you can walk and drive today, every street, block and slab, the airport and the kart park
  const clear = (x: number, z: number, what: string) => assert.ok(fromWall(x, z) >= WALL.out, `${what} at ${x}, ${z} is ${fromWall(x, z)} from the wall`);
  clear(WORLD_BOUNDS[0], WORLD_BOUNDS[1], 'the walk limit');
  clear(WORLD_BOUNDS[2], WORLD_BOUNDS[3], 'the walk limit');
  for (const s of PLAN.streets) for (const [x, z] of s.pts) clear(x, z, s.id);
  for (const b of PLAN.blocks) for (const [x, z] of b.poly) clear(x, z, b.id);
  for (const r of [SITE, [KART_PARK.x0, KART_PARK.z0, KART_PARK.x1, KART_PARK.z1]]) {
    clear(r[0], r[1], 'a site');
    clear(r[2], r[3], 'a site');
  }
});

test('the culverts are kept where the river meets the west and east sides', () => {
  assert.equal(CULVERTS.length, 2);
  for (const c of CULVERTS) {
    assert.equal(c.x, c.side === 'w' ? WALL_INNER[0] : WALL_INNER[2]);
    assert.deepEqual([c.z0, c.z1], [RIVER[0], RIVER[1]]);
    assert.ok(inWall(c.x + (c.side === 'w' ? -1 : 1), (c.z0 + c.z1) / 2), 'on the wall');
  }
});

test('the sky dome reaches past it from town', () => {
  for (const [x, z] of WALL_CORNERS) assert.ok(Math.hypot(x - 30, z - 30) <= SKY_RADIUS);
});
