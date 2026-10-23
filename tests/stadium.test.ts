// Sector 7 Stadium (stadium.ts, Westlake Park's step 2; moved north of the ring highway in the north side's stage 1):
// the bowl on its own block north of the highway, under the Emporium, its stands stepping up inside the facade, its
// gate on the forecourt at the foot of the footbridge from the Mall; Stadium Road and the car park's loop in the
// street plan, clear of the highway; the footbridge walkable over the highway, solid only at its piers and stairs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BAYS,
  BLOCK,
  BRIDGE,
  BRIDGE_RECT,
  CAR_PARK,
  CENTRE,
  CONCOURSE,
  FACADE,
  GATE,
  LOOP,
  MASTS,
  PARKED,
  PITCH,
  ROAD,
  ROOF,
  SCREEN,
  STADIUM_LAMPS,
  STADIUM_SOLIDS,
  STADIUM_SPAWN,
  TALLEST,
  TIERS,
  TRACK,
  bridgeWall,
  bridgeY,
  inOval,
  oval,
} from '../src/scripts/city3d/stadium';
import { BRIDGE_FOOT, MALL, PATHS, Z0, onPath } from '../src/scripts/city3d/westlake';
import { SOLIDS, SOLID_GRID } from '../src/scripts/city3d/solids';
import { OUTER_SLIPS, PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { HIGHWAY_HALF, fromHighway, insideHighway } from '../src/scripts/city3d/highway';
import { WALK_W } from '../src/scripts/city3d/layout';

const [BX0, BZ0, BX1, BZ1] = BLOCK;
const inBox = (b: number[], x: number, z: number, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;

test('the bowl: on its block north of the highway, under the Emporium, the stands inside the facade and the pitch inside the track', () => {
  for (const [x, z] of oval(ROOF.a1 + 1.8, ROOF.b1 + 1.8, 180)) assert.ok(x > BX0 && x < BX1 && z > BZ0 && z < BZ1, `the bowl off its block at ${x}, ${z}`);
  for (const [x, z] of [[BX0, BZ0], [BX1, BZ1], [BX0, BZ1], [BX1, BZ0]]) assert.ok(!insideHighway(x, z) && fromHighway(x, z) > HIGHWAY_HALF + 6, 'north of the highway, clear of it');
  assert.ok(TALLEST < 11.5, 'under the Emporium');
  assert.ok(ROOF.y1 < TALLEST && SCREEN.y + SCREEN.h < TALLEST + 0.5);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) assert.ok(inOval(TRACK.a, TRACK.b, CENTRE[0] + sx * PITCH.hx, CENTRE[1] + sz * PITCH.hz, -0.5), 'pitch inside the track');
  assert.ok(TIERS[0].a > TRACK.a && TIERS[0].b > TRACK.b);
  const back = (t: (typeof TIERS)[number]) => ({ a: t.a + t.steps * t.depth, b: t.b + t.steps * t.depth, y: t.y + t.steps * t.rise });
  assert.ok(back(TIERS[0]).a <= CONCOURSE.a1 && Math.abs(back(TIERS[0]).y - CONCOURSE.y) < 1e-9);
  assert.ok(TIERS[1].y > CONCOURSE.y);
  assert.ok(back(TIERS[1]).a < FACADE.a && back(TIERS[1]).b < FACADE.b && back(TIERS[1]).y < FACADE.h);
  assert.ok(ROOF.a0 < TIERS[1].a && ROOF.a1 > FACADE.a && ROOF.y0 > FACADE.h);
  // In line with the Mall
  assert.equal(CENTRE[0], MALL.x);
});

test('solid all round, the gate on the forecourt at the footbridge\'s foot, the masts and screen in place', () => {
  for (const [x, z] of oval(FACADE.a, FACADE.b, 360)) assert.ok(STADIUM_SOLIDS.some((b) => inBox(b, x, z)), `a gap in the facade at ${x}, ${z}`);
  for (const b of STADIUM_SOLIDS) assert.ok(SOLIDS.includes(b));
  for (let x = CENTRE[0] - 20; x < CENTRE[0] + 20; x += 1) for (let z = CENTRE[1] - 14; z < CENTRE[1] + 14; z += 1) assert.ok(!SOLID_GRID.near(x, z, 0).some((b) => inBox(b, x, z)), `something solid on the pitch at ${x}, ${z}`);
  // The gate faces south, the footbridge's stairs come down just in front of it; its spot and the spawn are clear
  assert.equal(GATE.x, BRIDGE.x);
  assert.ok(GATE.z < BRIDGE.north[0] && BRIDGE.north[0] - GATE.z < 6, 'the stairs come down in front of the gate');
  for (const p of [GATE.spot, STADIUM_SPAWN]) {
    assert.ok(!SOLID_GRID.near(p.x, p.z, 0.4).some((b) => inBox(b, p.x, p.z, 0.35)), `something solid at ${p.x}, ${p.z}`);
    assert.ok(inBox(BLOCK, p.x, p.z), 'on the block');
    assert.equal(bridgeY(p.x, p.z, 0.15), null, 'off the stairs');
  }
  assert.ok(GATE.spot.z > GATE.z && STADIUM_SPAWN.z > GATE.z);
  assert.equal(MASTS.length, 4);
  for (const m of MASTS) assert.ok(!inOval(FACADE.a, FACADE.b, m.x, m.z, 0.5) && inBox(BLOCK, m.x, m.z, -1), 'a mast outside the facade, on the block');
  assert.ok(Math.abs(SCREEN.z - CENTRE[1]) < FACADE.b, 'the screen over the north stand');
});

test('Stadium Road and the car park loop: in the street plan off the north road, clear of the highway and the block', () => {
  const road = PLAN.streets.find((s) => s.id === 'stadium-road')!;
  const loop = PLAN.streets.find((s) => s.id === 'stadium-loop')!;
  assert.ok(road && loop && loop.oneway);
  assert.ok(PLAN.crossings.some((c) => c.id === 'stadium-in' && c.streets.includes('ns0')));
  for (const s of [road, loop])
    for (let i = 1; i < s.pts.length; i++)
      for (let k = 0; k <= 20; k++) {
        const p: [number, number] = [s.pts[i - 1][0] + ((s.pts[i][0] - s.pts[i - 1][0]) * k) / 20, s.pts[i - 1][1] + ((s.pts[i][1] - s.pts[i - 1][1]) * k) / 20];
        assert.ok(fromHighway(p[0], p[1]) > HIGHWAY_HALF + s.half + 6, `${s.id} too near the highway at ${p}`);
        // The block's sidewalk (outside its outline) clear of the asphalt
        assert.ok(!inBox(BLOCK, p[0], p[1], WALK_W + s.half - 0.01), `${s.id} on the block at ${p}`);
      }
  // The block's sidewalk meets the road's edge
  assert.ok(Math.abs(BZ1 + WALK_W - (ROAD.z - ROAD.half)) < 1e-9);
  // The north road's outer corners get slip lanes at the highway (the stadium's traffic)
  for (const id of OUTER_SLIPS) assert.ok(PLAN.streets.filter((s) => s.kind === 'slip' && s.id.startsWith(`slip-${id}-`)).length === 4);
  // The car park: inside the loop, its bays inside it, most taken
  const [x0, z0, x1, z1] = CAR_PARK;
  assert.ok(x0 > LOOP.x0 + LOOP.half && x1 < LOOP.x1 - LOOP.half && z0 > LOOP.z1 + LOOP.half && z1 < ROAD.z - ROAD.half);
  assert.ok(BAYS.length >= 60);
  for (const b of BAYS) assert.ok(b.x > x0 && b.x < x1 && b.z > z0 && b.z < z1, 'a bay inside');
  assert.ok(PARKED.length > BAYS.length * 0.4 && PARKED.length < BAYS.length * 0.8);
  for (const [x, z] of STADIUM_LAMPS) for (const s of PLAN.streets) if (s.kind !== 'alley') assert.ok(distToStreet(s, [x, z]) > s.half + 0.2, `a lamp on ${s.id}`);
});

test('the footbridge: from the Mall up over the ring walk, the park\'s edge, the highway and Stadium Road, down to the forecourt', () => {
  const { x, half, y, deck, south, north } = BRIDGE;
  assert.equal(x, MALL.x);
  assert.ok(Math.abs(south[0] - BRIDGE_FOOT) < 0.1, 'its south stairs start where the Mall ends');
  const mall = PATHS.find((p) => p.id === 'mall')!;
  assert.ok(Math.abs(mall.pts.at(-1)![1] - BRIDGE_FOOT) < 1e-9);
  // The deck reaches over the park's edge, the highway and the road
  assert.ok(deck[0] > Z0 && deck[1] < ROAD.z - ROAD.half && deck[1] > BZ0, 'deck from the park to the block');
  // Walking up: the stairs climb a step at a time, the deck is flat, the stairs on the far side come down
  let last = 0.15;
  for (let z = south[0] - 0.01; z > north[0]; z -= 0.1) {
    const h = bridgeY(x, z, last);
    assert.ok(h !== null, `off the bridge at ${z.toFixed(2)}`);
    assert.ok(h! - last < 0.32 && h! <= y + 1e-9);
    last = h!;
  }
  assert.ok(Math.abs(bridgeY(x, -170, y)! - y) < 1e-9);
  // Under it (on the highway) it's not ground; up on it, its parapets stop you
  assert.equal(bridgeY(x, -170, 0.04), null);
  assert.ok(bridgeWall(x + half + 0.1, -170, y, 0.35) && !bridgeWall(x, -170, y, 0.35));
  assert.ok(!bridgeWall(x + half + 0.4, -170, 0.04, 0.35), 'nothing stops you under it');
  // Clear for the traffic: nothing solid on the highway's lanes or the road under it (the middle pier on the median)
  for (const b of STADIUM_SOLIDS.filter((b) => inBox(BRIDGE_RECT, (b[0] + b[2]) / 2, (b[1] + b[3]) / 2))) {
    const [cx, cz] = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
    const hw = fromHighway(cx, cz);
    assert.ok(hw < 0.31 || hw > HIGHWAY_HALF + 0.3, `a pier on the highway at ${cz}`);
    assert.ok(Math.abs(cz - ROAD.z) > ROAD.half + 0.2, 'a pier on Stadium Road');
    // ...and off the ring walk in the park
    assert.ok(!onPath([cx, cz], 0.2), 'a pier on a path');
  }
});
