/*
 * The wall round Sector 7 (wall.ts, docs/wall-plan.md): 200 ft of solid concrete past the grass round the
 * world's edge, closed all round, with everything that exists inside it. Run at both sizes of the world.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BEYOND, BOAT_ENDS, CULVERT, CULVERTS, archY, WALL, WALL_CORNERS, WALL_H, WALL_HAZE, WALL_INNER, WALL_LAND, WALL_LOOK, WALL_OUTER, WALL_RUNS, WALL_SOLIDS, WALL_TOP, CAMERAS, FLOOD, FLOODS, SIDE, TOP, alongFace, fromWall, inWall } from '../src/scripts/city3d/wall';
import { EXT, FLY_BOUNDS, WALL_FOOT, WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { WATER_Y } from '../src/scripts/city3d/river';
import { EDGE_TURN } from '../src/scripts/city3d/flight-sim';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { WALL_SOUND, ambienceAt } from '../src/scripts/city3d/ambience';
import { PLAN } from '../src/scripts/city3d/streetplan';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import { TALLEST as UPTOWN_TALLEST } from '../src/scripts/city3d/highrise';
import { CEILING } from '../src/scripts/city3d/flight-sim';
import { SITE } from '../src/scripts/city3d/airfield';
import { KART_PARK } from '../src/scripts/city3d/kartpark';
import { CAMERA_FAR, SKY_RADIUS } from '../src/scripts/city3d/bounds';

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
  for (const x of [WALL_OUTER[0], WALL_OUTER[2]])
    for (const z of [WALL_OUTER[1], WALL_OUTER[3]]) assert.ok(inWall(x + Math.sign(30 - x) * 0.5, z + Math.sign(30 - z) * 0.5), `the corner ${x}, ${z}`);
});

test('everything that exists stands inside it, well clear: nothing moves for it', () => {
  // Every street, block and slab, the airport and the kart park
  const clear = (x: number, z: number, what: string) => assert.ok(fromWall(x, z) >= WALL.out, `${what} at ${x}, ${z} is ${fromWall(x, z)} from the wall`);
  for (const s of PLAN.streets) for (const [x, z] of s.pts) clear(x, z, s.id);
  for (const b of PLAN.blocks) for (const [x, z] of b.poly) clear(x, z, b.id);
  for (const r of [SITE, [KART_PARK.x0, KART_PARK.z0, KART_PARK.x1, KART_PARK.z1]]) {
    clear(r[0], r[1], 'a site');
    clear(r[2], r[3], 'a site');
  }
});

test('the barred culverts: arches across the river where it meets the wall, the boats stopped at the bars', () => {
  assert.equal(CULVERTS.length, 2);
  for (const c of CULVERTS) {
    assert.equal(c.x, c.side === 'w' ? WALL_INNER[0] : WALL_INNER[2]);
    assert.ok(inWall(c.x - c.dir, (c.water[0] + c.water[1]) / 2), 'on the wall');
    // The arches span the water edge to edge, a pier between each, none wider than a bay
    assert.ok(Math.abs(c.bays[0][0] - c.water[0]) < 1e-9 && Math.abs(c.bays.at(-1)![1] - c.water[1]) < 1e-9);
    for (let k = 0; k < c.bays.length; k++) {
      const [z0, z1] = c.bays[k];
      assert.ok(z1 - z0 > 4 && z1 - z0 <= CULVERT.bay + 1e-9, `a bay ${z1 - z0} across`);
      if (k) assert.ok(Math.abs(z0 - c.bays[k - 1][1] - CULVERT.pier) < 1e-9, 'a pier between');
      // Its top: the spring at its sides, the crown in its middle, over the water, under the wall's top
      assert.ok(Math.abs(archY(c.bays[k], z0)! - (WATER_Y + CULVERT.spring)) < 1e-9);
      assert.ok(Math.abs(archY(c.bays[k], (z0 + z1) / 2)! - (WATER_Y + CULVERT.crown)) < 1e-9);
      assert.equal(archY(c.bays[k], z0 - 0.1), null);
    }
    assert.ok(WATER_Y + CULVERT.cap + CULVERT.lintel < WALL.h, 'the frame well under the top');
    // The frame spans the channel to the slopes' tops
    assert.ok(c.tops[0] <= c.water[0] && c.tops[1] >= c.water[1]);
  }
  // The boats' ends are at the bars, so the river is boated its whole length inside the wall
  assert.ok(BOAT_ENDS[0] > WALL_INNER[0] && BOAT_ENDS[0] < WALL_INNER[0] + CULVERT.out);
  assert.ok(BOAT_ENDS[1] < WALL_INNER[2] && BOAT_ENDS[1] > WALL_INNER[2] - CULVERT.out);
});

test('the sky dome reaches past it from town', () => {
  for (const [x, z] of WALL_CORNERS) assert.ok(Math.hypot(x - 30, z - 30) <= SKY_RADIUS);
});

test('past it, a little land, then the murk on it', () => {
  for (let k = 0; k < 4; k++) assert.equal(Math.abs(WALL_LAND[k] - WALL_OUTER[k]), BEYOND.land);
  // Some land shows before the first sheet of murk, and every sheet stands on the land
  assert.ok(Math.min(...BEYOND.murk) >= 10, 'a strip of land seen before the murk');
  for (const d of BEYOND.murk) assert.ok(d > 0 && d < BEYOND.land);
  assert.ok(BEYOND.h > WALL.h, 'the murk rises over the wall');
});

test('from town every side stands clear of the far haze, and the haze is whole before the far plane', () => {
  const [from, to] = [WALL_HAZE.from * SKY_RADIUS, WALL_HAZE.to * SKY_RADIUS];
  const [i0, j0, i1, j1] = WALL_INNER;
  const mx = (i0 + i1) / 2;
  const mz = (j0 + j1) / 2;
  for (const [x, z] of [[i0, mz], [i1, mz], [mx, j0], [mx, j1]]) assert.ok(Math.hypot(x - 30, z - 30) < from, `the middle of a side at ${x}, ${z}`);
  assert.ok(to < CAMERA_FAR, 'faded out before the far plane clips it');
  assert.ok(WALL_LOOK.std > 0 && WALL_LOOK.std < 1, 'some of the city haze, never all');
});

test('you walk and drive up to its foot and no further; flying turns back well short of it', () => {
  for (const [k, sgn] of [[0, 1], [1, 1], [2, -1], [3, -1]] as const) {
    const gap = (WORLD_BOUNDS[k] - WALL_INNER[k]) * sgn;
    assert.ok(gap > 0 && gap <= WALL_FOOT + 1e-9, `the walk limit ${gap} from the wall`);
    assert.ok((FLY_BOUNDS[k] - WALL_INNER[k]) * sgn - EDGE_TURN > 40, 'the turn back starts well short of the wall');
  }
  // The wall is solid all the way up, a box a side
  assert.equal(WALL_SOLIDS.length, 4);
  for (const b of WALL_SOLIDS) assert.equal(b[4], WALL_TOP);
  assert.ok(SOLIDS.some((b) => b === WALL_SOLIDS[0]), 'in SOLIDS: walking, the camera, bullets');
});

test('its top: a parapet each side, wire on them, cameras along the inner one', () => {
  assert.equal(WALL_TOP, WALL.h + TOP.parapet.h);
  assert.ok(TOP.parapet.w * 2 < WALL.thick, 'a walk between the parapets');
  assert.ok(WALL_TOP + TOP.post + 1 < CEILING - 20, 'the cameras well under what flies');
  // A camera on every side, evenly along it, on the inner parapet's middle, looking into the city
  assert.ok(CAMERAS.length >= 4 * Math.floor(SIDE / TOP.camEvery));
  for (const c of CAMERAS) {
    assert.ok(Math.abs(fromWall(c.x, c.z) - TOP.parapet.w / 2) < 1e-9, `a camera off the parapet at ${c.x}, ${c.z}`);
    assert.ok(fromWall(c.x + c.nx * 10, c.z + c.nz * 10) > fromWall(c.x, c.z), 'facing into the city');
  }
});

test('floodlights at its foot, evenly along every side, clear of the corners', () => {
  assert.equal(FLOODS.length, 4 * Math.floor(SIDE / FLOOD.every + 0.5));
  for (const f of FLOODS) {
    assert.ok(Math.abs(fromWall(f.x, f.z) - FLOOD.out) < 1e-9);
    assert.ok(f.s >= FLOOD.every / 2 - 1e-9 && f.s <= SIDE - FLOOD.every / 2 + 1e-9, 'half a spacing from each corner');
    // (the wash in the shader lights a pool round each, at the same spacing: wall3d.ts)
    assert.ok(Math.abs(((f.s / FLOOD.every) % 1) - 0.5) < 1e-6);
  }
  // Each spot is reachable on foot: inside where walking stops
  for (const f of FLOODS) assert.ok(f.x > WORLD_BOUNDS[0] && f.x < WORLD_BOUNDS[2] && f.z > WORLD_BOUNDS[1] && f.z < WORLD_BOUNDS[3]);
  assert.deepEqual(alongFace(SIDE, 1).length, 4, 'one a side when the spacing is a side');
});

test('its sound: the wind and the hum full at its foot, gone in town', () => {
  const [i0, j0] = WALL_INNER;
  assert.ok(ambienceAt(i0 + 1, 40, 0, 0).wall > 0.95, 'at its foot');
  assert.ok(ambienceAt(30, j0 + 2, 0, 0).wall > 0.9);
  assert.equal(ambienceAt(30, 30, 0, 0).wall, 0, 'downtown hears none of it');
  assert.equal(ambienceAt(i0 + WALL_SOUND + 5, 40, 0, 0).wall, 0);
});
