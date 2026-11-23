// Riverside Raceway behind `?karts=new` (kartswitch.ts; docs/kart-harbour-plan.md Phase 3): the switch read from the
// query, the park's land as the boot writes it, the city's ground taking the park's (the hill, the tunnel's floor) only
// with it on, the tunnel's and cuttings' walls on foot, the outskirts' trees off its land, its courses' names.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KARTS2, KART2_LAND, kartsNewAsked } from '../src/scripts/city3d/kartswitch';
import { KART2_AREA, KART2_RECTS, TUNNEL2 } from '../src/scripts/city3d/kartpark2';
import { CIRCUIT2, COURSES2, KERB2, SITE2, TRACK2_HALF, TUNNEL_CLEAR } from '../src/scripts/city3d/kartcircuit2';
import { RIVER_COURSES, WALL2_T, riversideSurfaceAt, riversideWall } from '../src/scripts/city3d/kartcourse2';
import { RIVER_COURSE_NAME } from '../src/scripts/city3d/kartcircuit';
import { createGroundHeight } from '../src/scripts/city3d/groundheight';
import { outskirtsTrees } from '../src/scripts/city3d/outskirts';
import { courseLabel } from '../src/scripts/city3d/kart-records';
import { F, frame } from '../src/scripts/city3d/kartpark';
import { F_CUT } from '../src/scripts/city3d/kartcourse2';
import { flattenRolls, rollsAt } from '../src/scripts/city3d/rolls';

test('the switch: on only for ?karts=new', () => {
  assert.ok(kartsNewAsked('?karts=new'));
  assert.ok(kartsNewAsked('?fps&karts=new&spawn=1,2'));
  assert.ok(!kartsNewAsked(''));
  assert.ok(!kartsNewAsked('?karts=old'));
  assert.ok(!kartsNewAsked('?karts'));
  assert.equal(KARTS2.on, false, 'off unless the page asks');
});

test("the boot's copy of the park's land is the park's", () => {
  assert.deepEqual(KART2_LAND, KART2_AREA);
});

test("the park's land's rolls levelled (behind the switch, at the boot), the land well away untouched", () => {
  const inLand: [number, number][] = [];
  for (let x = KART2_LAND[0]; x <= KART2_LAND[2]; x += 3) for (let z = KART2_LAND[1]; z <= KART2_LAND[3]; z += 3) inLand.push([x, z]);
  const far: [number, number] = [KART2_LAND[0] - 120, KART2_LAND[1] + 80];
  const farBefore = rollsAt(...far);
  assert.ok(inLand.some(([x, z]) => rollsAt(x, z) !== 0), 'the land rolls now');
  flattenRolls([KART2_LAND]);
  assert.ok(inLand.every(([x, z]) => rollsAt(x, z) === 0), 'level');
  assert.equal(rollsAt(...far), farBefore);
});

test("the city's ground: the park's only with the switch on (the road over the hill, the tunnel's floor under it)", () => {
  const ground = createGroundHeight({ leavesOpen: () => false });
  const top = CIRCUIT2.y.indexOf(Math.max(...CIRCUIT2.y));
  const [hx, hz] = [CIRCUIT2.x[top], CIRCUIT2.z[top]];
  const mid = TUNNEL2.samples[Math.floor(TUNNEL2.samples.length / 2)];
  const [tx, tz] = [CIRCUIT2.x[mid], CIRCUIT2.z[mid]];
  const off = ground(hx, hz, 0);
  assert.ok(off < 0.3, 'off: the open land');
  KARTS2.surfaceAt = riversideSurfaceAt;
  try {
    assert.ok(Math.abs(ground(hx, hz, 3.5) - (CIRCUIT2.y[top] + 0.035)) < 0.05, 'on: the road over the hill');
    assert.ok(ground(tx, tz, 0.2) < 0.3, "on: the tunnel's floor from inside");
    assert.ok(ground(tx, tz, 3.4) > TUNNEL_CLEAR, 'on: the hill over it from above');
  } finally {
    KARTS2.surfaceAt = null;
  }
});

test("the tunnel's and cuttings' walls on foot: against them from the road, nothing over the hill or out on the level", () => {
  const c = RIVER_COURSES.riverside;
  const edge = TRACK2_HALF + KERB2;
  const r = 0.3;
  const mid = TUNNEL2.samples[Math.floor(TUNNEL2.samples.length / 2)];
  const f = frame(c, mid * c.step);
  assert.ok(riversideWall(f.x + f.nx * (edge - 0.1), f.z + f.nz * (edge - 0.1), 0.05, r), "the tunnel's wall");
  assert.ok(!riversideWall(f.x, f.z, 0.05, r), "the tunnel's middle");
  assert.ok(!riversideWall(f.x + f.nx * (edge - 0.1), f.z + f.nz * (edge - 0.1), 3.4, r), 'over the hill');
  const ci = Array.from({ length: c.x.length }, (_, i) => i).find((i) => c.flags[i] & F_CUT)!;
  const g = frame(c, ci * c.step);
  assert.ok(c.flags[ci] & F.tunnel);
  assert.ok(riversideWall(g.x + g.nx * edge, g.z + g.nz * edge, 0.05, r) || riversideWall(g.x - g.nx * edge, g.z - g.nz * edge, 0.05, r), "a cutting's wall");
  assert.ok(!riversideWall(g.x + g.nx * (edge + WALL2_T + 2), g.z + g.nz * (edge + WALL2_T + 2), 0.05, r), 'past it');
  assert.ok(!riversideWall(SITE2.x0 - 10, SITE2.z0 + 10, 0, r), 'off the site');
});

test("the outskirts' trees keep off the park's land when it's given them", () => {
  const inPark = (x: number, z: number) => KART2_RECTS.some((q) => x > q[0] - 2 && x < q[2] + 2 && z > q[1] - 2 && z < q[3] + 2);
  const before = outskirtsTrees(1200, 0.6).filter((t) => inPark(t.x, t.z)).length;
  const after = outskirtsTrees(1200, 0.6, KART2_RECTS).filter((t) => inPark(t.x, t.z)).length;
  assert.ok(before > 0, 'trees stand there now');
  assert.equal(after, 0);
});

test("its courses' names, as the boot labels them without loading the circuit", () => {
  assert.equal(RIVER_COURSE_NAME, COURSES2.riverside.name);
  assert.match(courseLabel('riverside'), /^Riverside Raceway$/);
  assert.match(courseLabel('riverside-reverse'), /Riverside Raceway<i class="kart-rev">rev<\/i>/);
});
