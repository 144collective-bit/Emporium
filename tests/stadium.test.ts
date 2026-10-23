// Sector 7 Stadium (stadium.ts, Westlake Park's step 2): the bowl on the site the park kept for it, under the
// Emporium, its stands stepping up inside the facade, its gate on the forecourt, its masts and car park clear of
// the park's paths, trees, lamps and the lake; solid all round, so nobody walks or drives into it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BAYS,
  CAR_PARK,
  CENTRE,
  CONCOURSE,
  ENTRANCES,
  FACADE,
  GATE,
  MASTS,
  PARKED,
  PITCH,
  ROOF,
  SCREEN,
  STADIUM_SOLIDS,
  STADIUM_SPAWN,
  TALLEST,
  TIERS,
  TRACK,
  inOval,
  oval,
} from '../src/scripts/city3d/stadium';
import { GATES, PARK_LAMPS, PARK_TREES, PATHS, STADIUM_SITE, STRIPS, distToLine, inLake, inPark, onPath } from '../src/scripts/city3d/westlake';
import { SOLIDS, SOLID_GRID } from '../src/scripts/city3d/solids';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';

const [SX0, SZ0, SX1, SZ1] = STADIUM_SITE;
const inBox = (b: number[], x: number, z: number, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;

test('the bowl: on its site, under the Emporium, the stands inside the facade and the pitch inside the track', () => {
  for (const [x, z] of oval(FACADE.a + 0.3, FACADE.b + 0.3, 180)) assert.ok(x > SX0 && x < SX1 && z > SZ0 && z < SZ1, `the facade off its site at ${x}, ${z}`);
  for (const [x, z] of oval(ROOF.a1, ROOF.b1, 180)) assert.ok(x > SX0 && x < SX1 && z > SZ0 && z < SZ1, `the roof off its site at ${x}, ${z}`);
  assert.ok(TALLEST < 11.5, 'under the Emporium');
  assert.ok(ROOF.y1 < TALLEST && SCREEN.y + SCREEN.h < TALLEST + 0.5);
  // The pitch's corners inside the track, the track inside the lower tier's front
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) assert.ok(inOval(TRACK.a, TRACK.b, CENTRE[0] + sx * PITCH.hx, CENTRE[1] + sz * PITCH.hz, -0.5), 'pitch inside the track');
  assert.ok(TIERS[0].a > TRACK.a && TIERS[0].b > TRACK.b);
  // Each tier's back edge inside the next thing out, rising as it goes
  const back = (t: (typeof TIERS)[number]) => ({ a: t.a + t.steps * t.depth, b: t.b + t.steps * t.depth, y: t.y + t.steps * t.rise });
  assert.ok(back(TIERS[0]).a <= CONCOURSE.a1 && Math.abs(back(TIERS[0]).y - CONCOURSE.y) < 1e-9);
  assert.ok(TIERS[1].y > CONCOURSE.y);
  assert.ok(back(TIERS[1]).a < FACADE.a && back(TIERS[1]).b < FACADE.b && back(TIERS[1]).y < FACADE.h);
  // The roof covers the upper tier from the concourse out
  assert.ok(ROOF.a0 < TIERS[1].a && ROOF.a1 > FACADE.a && ROOF.y0 > FACADE.h);
});

test('solid all round: nothing gets in, the gate is on the forecourt in front of the Mall', () => {
  for (const [x, z] of oval(FACADE.a, FACADE.b, 360)) assert.ok(STADIUM_SOLIDS.some((b) => inBox(b, x, z)), `a gap in the facade at ${x}, ${z}`);
  for (const b of STADIUM_SOLIDS) assert.ok(SOLIDS.includes(b));
  // The pitch is open ground nobody reaches (the facade round it), nothing solid inside
  for (let x = CENTRE[0] - 20; x < CENTRE[0] + 20; x += 1) for (let z = CENTRE[1] - 14; z < CENTRE[1] + 14; z += 1) assert.ok(!SOLID_GRID.near(x, z, 0).some((b) => inBox(b, x, z)), `something solid on the pitch at ${x}, ${z}`);
  // The gate faces south onto the forecourt, the Mall comes up to it, and its spot and the spawn are clear and on a path
  assert.ok(Math.abs(GATE.x - (PATHS.find((p) => p.id === 'mall')!.pts[0][0])) < 1e-9, 'the gate on the Mall');
  for (const p of [GATE.spot, STADIUM_SPAWN]) {
    assert.ok(!SOLID_GRID.near(p.x, p.z, 0.4).some((b) => inBox(b, p.x, p.z, 0.35)), `something solid at ${p.x}, ${p.z}`);
    assert.ok(onPath([p.x, p.z], 0.3), `${p.x}, ${p.z} on a path`);
  }
  assert.ok(GATE.spot.z > GATE.z && STADIUM_SPAWN.z > GATE.spot.z);
});

test('the masts and screen: outside the stands, inside the site, off the paths and trees', () => {
  assert.equal(MASTS.length, 4);
  for (const m of MASTS) {
    assert.ok(!inOval(FACADE.a, FACADE.b, m.x, m.z, 0.5), 'a mast outside the facade');
    assert.ok(m.x > SX0 + 1 && m.x < SX1 - 1 && m.z > SZ0 + 1 && m.z < SZ1 - 1, 'a mast on the site');
    assert.ok(!onPath([m.x, m.z], 1), 'a mast on a path');
    for (const t of PARK_TREES) assert.ok(Math.hypot(t.x - m.x, t.z - m.z) > 2, 'a tree on a mast');
  }
  assert.ok(Math.abs(SCREEN.z - CENTRE[1]) < FACADE.b, 'the screen over the north stand');
});

test('the car park: on the first strip, off the streets, its bays inside it, the strip\'s walk and trees off it', () => {
  const [x0, z0, x1, z1] = CAR_PARK;
  const [s0, s1] = [STRIPS[0].poly[0], STRIPS[0].poly[2]];
  assert.ok(x0 >= s0[0] && x1 <= s1[0] && z0 >= Math.min(s0[1], s1[1]) && z1 <= Math.max(s0[1], s1[1]), 'on the strip');
  for (const s of PLAN.streets) if (s.kind !== 'alley') for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]] as [number, number][]) assert.ok(distToStreet(s, [x, z]) > s.half, `on ${s.id}`);
  assert.ok(BAYS.length >= 30);
  for (const b of BAYS) assert.ok(b.x > x0 && b.x < x1 && b.z > z0 && b.z < z1, 'a bay inside');
  assert.ok(PARKED.length > BAYS.length * 0.5 && PARKED.length < BAYS.length);
  for (const t of PARK_TREES) assert.ok(!(t.x > x0 - 1 && t.x < x1 + 1 && t.z > z0 - 1 && t.z < z1 + 1), `a tree in the car park at ${t.x}, ${t.z}`);
  for (const [x, z] of PARK_LAMPS) assert.ok(!(x > x0 && x < x1 && z > z0 && z < z1), `a lamp in the car park at ${x}, ${z}`);
  for (const q of PATHS) for (const p of q.pts) assert.ok(!(p[0] > x0 && p[0] < x1 && p[1] > z0 && p[1] < z1) || distToLine(q.pts, p) > 99, `${q.id} through the car park`);
  for (const e of ENTRANCES) assert.ok(e.x - e.w / 2 > x0 && e.x + e.w / 2 < x1);
});

test('the park keeps clear of it: the site, its forecourt, the lake', () => {
  for (const t of PARK_TREES) assert.ok(!(t.x > SX0 - 1 && t.x < SX1 + 1 && t.z > SZ0 - 1 && t.z < SZ1 + 1), `a tree on the stadium's site at ${t.x}, ${t.z}`);
  for (const [x, z] of oval(FACADE.a + 2, FACADE.b + 2, 90)) {
    assert.ok(inPark([x, z]), `the stadium off the park at ${x}, ${z}`);
    assert.ok(!inLake(x, z, 4), 'the stadium by the lake');
  }
  assert.ok(GATES.some((g) => g.id === 'gate-mall'));
});
