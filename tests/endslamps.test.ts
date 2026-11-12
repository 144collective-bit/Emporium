// Endswood's street lamps face what they light (the owner's call, 2026-11-12: the Close's and Endswood Road's heads had
// reached back over the pavement): a lamp's arm reaches along (cos ry, -sin ry) (world.ts `buildLamps()`), so the
// roads' lamps reach out over the carriageway, the Circus's and the well's in towards their middles, the west
// extension's courts' and greens' south over them, and the kickabout green's east over it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CIRCUS, ENDS_LAMPS, ROAD_HALF, ROAD_Z, WELL } from '../src/scripts/city3d/endswood';
import { COURTS, GREENS, WEST_LAMPS } from '../src/scripts/city3d/endswest';
import { KICKABOUT } from '../src/scripts/city3d/endsweststreet';

/** Which way a lamp's arm reaches */
const arm = (ry: number): [number, number] => [Math.cos(ry), -Math.sin(ry)];
const onRoad = (z: number) => Math.abs(Math.abs(z - ROAD_Z) - (ROAD_HALF + 0.45)) < 1e-6;

test("the road lamps along Endswood Road and the Close reach out over the carriageway", () => {
  const road = [...ENDS_LAMPS, ...WEST_LAMPS].filter(([, z]) => onRoad(z));
  assert.ok(road.length >= 15, `${road.length} road lamps`);
  for (const [x, z, ry] of road) {
    const [, dz] = arm(ry);
    assert.ok(Math.sign(dz) === Math.sign(ROAD_Z - z) && Math.abs(dz) > 0.99, `the lamp at ${x.toFixed(1)}, ${z.toFixed(1)} reaches away from the road`);
  }
});

test("the Circus's and the well's lamps reach in towards their middles", () => {
  const round = (cx: number, cz: number, r0: number, r1: number) => ENDS_LAMPS.filter(([x, z]) => { const d = Math.hypot(x - cx, z - cz); return d > r0 && d < r1; });
  const circus = round(CIRCUS.x, CIRCUS.z, CIRCUS.r, CIRCUS.r + CIRCUS.half + 1);
  const well = round(WELL.x, WELL.z, WELL.r, WELL.r + WELL.wall + 1.5);
  assert.ok(circus.length >= 4 && well.length >= 4);
  for (const [[x, z, ry], [cx, cz]] of [...circus.map((l) => [l, [CIRCUS.x, CIRCUS.z]] as const), ...well.map((l) => [l, [WELL.x, WELL.z]] as const)]) {
    const [dx, dz] = arm(ry);
    const [ix, iz] = [cx - x, cz - z];
    const cos = (dx * ix + dz * iz) / Math.hypot(ix, iz);
    assert.ok(cos > 0.99, `the lamp at ${x.toFixed(1)}, ${z.toFixed(1)} reaches ${cos.toFixed(2)} of the way in`);
  }
});

test("the west extension's courts' and greens' lamps reach south over them, the kickabout's east over the green", () => {
  for (const r of [...COURTS, ...GREENS]) {
    const lamp = WEST_LAMPS.find(([x, z]) => z > r[1] && z < r[3] && x > r[0] && x < r[2]);
    assert.ok(lamp, 'a lamp on every court and green');
    const [hx, hz] = [lamp[0] + arm(lamp[2])[0] * 0.6, lamp[1] + arm(lamp[2])[1] * 0.6];
    assert.ok(hz > lamp[1] && hz < r[3] && hx > r[0] && hx < r[2], `a court's or green's lamp reaching off it at ${lamp[0]}, ${lamp[1]}`);
  }
  const green = WEST_LAMPS.filter(([x, z]) => x > KICKABOUT[0] - 3 && x < KICKABOUT[0] && z > KICKABOUT[1] && z < KICKABOUT[3]);
  assert.ok(green.length >= 2 && green.every(([, , ry]) => arm(ry)[0] > 0.99));
});
