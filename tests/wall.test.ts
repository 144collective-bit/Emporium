/*
 * The wall round Sector 7 (wall.ts, docs/wall-plan.md): 200 ft of solid concrete past the grass round the
 * world's edge, closed all round, with everything that exists inside it. Run at both sizes of the world.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARCH, ARCH_SPAN, CAMERAS, CULVERT_BARS, CULVERT_FLOOR, CULVERT_X, EDGES, FLOOD, FLOODS, FLOOD_SOLIDS, TOP, archTop, BEYOND, CULVERTS, WALL, WALL_CORNERS, WALL_H, WALL_HAZE, WALL_INNER, WALL_LAND, WALL_LOOK, WALL_OUTER, WALL_RUNS, WALL_SOLIDS, fromWall, inWall } from '../src/scripts/city3d/wall';
import { EXT, RIVER, WALL_MARGIN, WALL_OUT, WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { PLAN } from '../src/scripts/city3d/streetplan';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import { TALLEST as UPTOWN_TALLEST } from '../src/scripts/city3d/highrise';
import { CEILING, EDGE_TURN, TUNES, newFlight, stepFly } from '../src/scripts/city3d/flight-sim';
import { CAMERA_GRID, SOLIDS, SOLID_GRID, rayBoxes, type Box } from '../src/scripts/city3d/solids';
import { newBoat, stepBoat } from '../src/scripts/city3d/boat-sim';
import { RIVER_WALLS } from '../src/scripts/city3d/drive-sim';
import { PAN_BOUNDS } from '../src/scripts/city3d/bounds';
import { WATER_Y, laneAt } from '../src/scripts/city3d/river';
import { BOAT, WATER_SOLIDS } from '../src/scripts/city3d/boat-sim';
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

/* ---------- Phase 3: walk to the wall ---------- */

test("walking and driving reach the wall's foot, all round, and no further", () => {
  assert.equal(WALL_OUT, WALL.out);
  for (const [x, z] of [
    [WORLD_BOUNDS[0], WORLD_BOUNDS[1]],
    [WORLD_BOUNDS[2], WORLD_BOUNDS[3]],
  ])
    assert.ok(Math.abs(fromWall(x, z) - WALL_MARGIN) < 1e-9, `the walk limit is ${fromWall(x, z)} from the wall`);
  assert.ok(WALL_MARGIN > 0 && WALL_MARGIN <= 2, 'at its foot');
  // The City view's free camera goes up to the wall too (freecam.ts), never into it
  assert.ok(fromWall(PAN_BOUNDS[0], PAN_BOUNDS[1]) > 0 && fromWall(PAN_BOUNDS[2], PAN_BOUNDS[3]) > 0);
  assert.ok(fromWall(PAN_BOUNDS[0], PAN_BOUNDS[1]) <= 3 && fromWall(PAN_BOUNDS[2], PAN_BOUNDS[3]) <= 3);
});

test('it is solid in every grid: walking, the camera, driving and flying, and bullets stop on it', () => {
  for (const r of WALL_SOLIDS) assert.equal(r[4], WALL.h, 'to its full height');
  for (const b of WALL_SOLIDS) assert.ok(SOLIDS.includes(b));
  const mid: [number, number][] = [
    [(WALL_INNER[0] + WALL_INNER[2]) / 2, WALL_INNER[1] - 1],
    [(WALL_INNER[0] + WALL_INNER[2]) / 2, WALL_INNER[3] + 1],
    [WALL_INNER[0] - 1, 30],
    [WALL_INNER[2] + 1, 30],
  ];
  for (const [x, z] of mid) {
    for (const g of [SOLID_GRID, CAMERA_GRID]) assert.ok(g.near(x, z, 0.5).some((b) => WALL_SOLIDS.includes(b)), `the wall at ${x}, ${z}`);
  }
  // A shot fired along the ground at it stops at its inner face
  const y = 1.5;
  for (const [dx, dz, face] of [
    [-1, 0, WALL_INNER[0]],
    [1, 0, WALL_INNER[2]],
  ] as const) {
    const from = { x: face - dx * 20, y, z: 31 };
    const t = rayBoxes(from, { x: dx, y: 0, z: dz }, 100);
    assert.ok(Math.abs(t - 20) < 0.05, `the shot went ${t}`);
  }
});

test('an aircraft turns back short of the wall and never goes through it, whatever its height', () => {
  const bounds: Box = [...WORLD_BOUNDS, 0];
  const world = { boxes: WALL_SOLIDS, ceilings: [], soft: [], ground: () => 0 };
  for (const id of ['prop', 'bizjet', 'heli'] as const)
    for (const y of [12, 50])
      for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        // Started 60 short of the wall's inner face, heading straight at it at full power
        const [dx, dz] = [Math.round(Math.cos(yaw)), Math.round(-Math.sin(yaw))];
        const x = dx > 0 ? WALL_INNER[2] - 60 : dx < 0 ? WALL_INNER[0] + 60 : 30;
        const z = dz > 0 ? WALL_INNER[3] - 60 : dz < 0 ? WALL_INNER[1] + 60 : 30;
        const s = newFlight(x, z, yaw, y);
        s.ground = false;
        s.gear = false;
        s.power = s.spool = 1;
        s.speed = TUNES[id].top * 0.9;
        for (let t = 0; t < 30; t += 1 / 30) {
          stepFly(s, { throttle: 1, turn: 0, climb: 0 }, TUNES[id], 1 / 30, world, bounds);
          assert.ok(fromWall(s.x, s.z) >= WALL_MARGIN - 1e-6, `${id} at ${y} reached ${fromWall(s.x, s.z)} from the wall`);
        }
        assert.ok(fromWall(s.x, s.z) > EDGE_TURN * 0.25, `${id} turned back`);
      }
});

test("the river runs on to the wall: a boat stops at the culverts' bars, a car's river walls reach its foot", () => {
  // The car's walls along the water reach either end
  const xs = RIVER_WALLS.map((b) => [b[0], b[2]]).flat();
  assert.ok(Math.min(...xs) <= WALL_INNER[0] + 1e-6 && Math.max(...xs) >= WALL_INNER[2] - 1e-6);
  // A boat at full power down the middle of the river runs on into the culvert and stops at its bars (Phase 5)
  for (const [x, yaw, bars] of [
    [WALL_INNER[2] - 60, 0, CULVERT_X[1]],
    [WALL_INNER[0] + 60, Math.PI, CULVERT_X[0]],
  ] as const) {
    const s = newBoat({ x, z: laneAt((RIVER[0] + RIVER[1]) / 2, x), yaw });
    for (let i = 0; i < 40 * 30; i++) stepBoat(s, { throttle: 1, steer: 0 }, 1 / 30);
    const gap = Math.abs(s.x - bars);
    assert.ok(gap < BOAT.len + 1 && gap > 0.3, `the boat stopped ${gap} from the bars`);
    assert.ok(Math.sign(s.x - bars) === Math.sign(30 - bars), 'on the city side of them');
  }
});

/* ---------- Phase 4: the top and the night ---------- */

test('the top: a parapet both sides, the wire on the inner one, cameras on posts along it looking in', () => {
  assert.ok(TOP.parapet.h > 0.9 && TOP.parapet.h < 1.5 && TOP.parapet.w < WALL.thick / 4);
  assert.ok(TOP.wire.r * 2 > TOP.parapet.w && TOP.wire.small < TOP.wire.r);
  const top = WALL.h + TOP.parapet.h + 2 * TOP.wire.r + 2 * TOP.wire.small;
  assert.ok(top < UPTOWN_TALLEST.roof && top < CEILING - 20, 'still under the spire and what flies');
  assert.equal(EDGES.length, 4);
  for (const side of ['n', 's', 'w', 'e']) {
    const on = CAMERAS.filter((c) => c.side === side);
    assert.ok(on.length >= 20, `${side}: ${on.length} cameras`);
    for (let i = 1; i < on.length; i++) assert.ok(Math.abs(Math.hypot(on[i].x - on[i - 1].x, on[i].z - on[i - 1].z) - TOP.camera.every) < 1e-6, 'evenly spaced');
  }
  for (const c of CAMERAS) {
    assert.ok(inWall(c.x, c.z), 'on the top');
    assert.ok(fromWall(c.x, c.z) > -TOP.parapet.w - 1 && fromWall(c.x, c.z) < -TOP.parapet.w, 'just behind the inner parapet');
    // Looking in: a step the way it looks takes it towards the city
    const [x, z] = [c.x + Math.cos(c.yaw), c.z - Math.sin(c.yaw)];
    assert.ok(fromWall(x, z) > fromWall(c.x, c.z), 'looking into the city');
    assert.ok(Math.min(c.x - WALL_INNER[0], WALL_INNER[2] - c.x, c.z - WALL_INNER[1], WALL_INNER[3] - c.z) > -WALL.thick, 'not past the outer face');
  }
});

test('the floodlights at its foot: clear of the corners and the culverts, low and solid, washing up under the top', () => {
  assert.ok(FLOODS.length > 120);
  for (const f of FLOODS) {
    assert.ok(fromWall(f.x, f.z) > 0 && fromWall(f.x, f.z) < FLOOD.d, 'against the inner face, in the city');
    const corner = Math.min(...[WALL_INNER[0], WALL_INNER[2]].flatMap((x) => [WALL_INNER[1], WALL_INNER[3]].map((z) => Math.hypot(f.x - x, f.z - z))));
    assert.ok(corner > FLOOD.corner, 'clear of the corners');
    if (f.side === 'w' || f.side === 'e') assert.ok(f.z < RIVER[0] - 4 || f.z > RIVER[1] + 4, 'clear of the culvert');
  }
  for (const b of FLOOD_SOLIDS) {
    assert.ok(SOLIDS.includes(b) && b[4] < 0.75, 'solid and low enough to see over');
    assert.ok(b[0] >= WORLD_BOUNDS[0] - 1 && b[2] <= WORLD_BOUNDS[2] + 1, 'at the walk limit');
  }
  assert.ok(FLOOD.wash < WALL.h && FLOOD.spread < FLOOD.every, 'each wash its own, under the top');
});

/* ---------- Phase 5: the river and the culverts ---------- */

test('the culverts: a low arch over the water at each end, its bars across it in the wall', () => {
  assert.equal(CULVERT_X.length, 2);
  CULVERT_X.forEach((x, i) => {
    assert.ok(inWall(x, (RIVER[0] + RIVER[1]) / 2), 'in the wall');
    assert.equal(x, CULVERTS[i].side === 'w' ? WALL_INNER[0] - WALL.thick / 2 : WALL_INNER[2] + WALL.thick / 2);
  });
  // The arch: its sides rise from under the water to the springing, its crown over the middle, low
  const [a, b] = ARCH_SPAN;
  assert.ok(a > RIVER[0] && b < RIVER[1]);
  assert.ok(CULVERT_FLOOR < WATER_Y - 2, 'its sides go down under the water');
  assert.ok(Math.abs(archTop(a + 1e-6) - ARCH.spring) < 0.05 && Math.abs(archTop(b - 1e-6) - ARCH.spring) < 0.05, 'springing');
  assert.ok(Math.abs(archTop((a + b) / 2) - (ARCH.spring + ARCH.rise)) < 1e-6, 'its crown');
  for (let z = a + 0.5; z < b; z += 0.5) assert.ok(archTop(z) >= ARCH.spring - 1e-6 && archTop(z) <= ARCH.spring + ARCH.rise + 1e-6);
  assert.ok(ARCH.spring + ARCH.rise < WALL.h / 4, 'low');
  // The bars: across all of the river's band, and the boats keep off them
  for (const r of CULVERT_BARS) {
    assert.ok(r[1] <= RIVER[0] && r[3] >= RIVER[1]);
    assert.ok(WATER_SOLIDS.some((w) => w.every((v, k) => v === r[k])), 'in the boats\' solids');
  }
  assert.ok(ARCH.bars.gap < 1.5 && ARCH.bars.r >= 0.1, 'heavy and close: nothing gets through');
});

/* ---------- Phase 6: polish ---------- */

test("its sound: the wind and the hum full at its foot, fading out well before the town", async () => {
  const { ambienceAt, WALL_SOUND } = await import('../src/scripts/city3d/ambience');
  assert.ok(ambienceAt(WORLD_BOUNDS[0] + 0.5, 30, 0).wall > 0.95, 'at its foot');
  assert.ok(ambienceAt(WALL_INNER[0] + WALL_SOUND / 2, 30, 0).wall > 0.2, 'carrying out over the strip');
  assert.equal(ambienceAt(30, 30, 0).wall, 0, 'none in town');
  assert.equal(ambienceAt(WALL_INNER[0] + WALL_SOUND + 1, 30, 0).wall, 0);
});
