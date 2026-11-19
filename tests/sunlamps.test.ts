// Sunridge's lamps clear of the driveways (sunlamps.ts; the map polish plan's Phase 0)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRIVE_CLEAR, SUN_LAMPS, clearOfDrives } from '../src/scripts/city3d/sunlamps';
import { SUN_LAMP_STATIONS, SUN_STREETS, distTo } from '../src/scripts/city3d/sunridge';
import { HOUSES } from '../src/scripts/city3d/sunhouses';

test('no lamp stands in a driveway or its mouth across the sidewalk', () => {
  for (const [x, z] of SUN_LAMPS)
    for (const h of HOUSES) {
      const [dx, dz] = [x - h.o[0], z - h.o[1]];
      const [u, v] = [dx * h.u[0] + dz * h.u[1], dx * h.v[0] + dz * h.v[1]];
      assert.ok(!(v > -3 && v < 0.5 && u > h.drive[0] - DRIVE_CLEAR + 0.1 && u < h.drive[1] + DRIVE_CLEAR - 0.1), `a lamp at ${x.toFixed(1)}, ${z.toFixed(1)} in ${h.id}'s drive`);
    }
});

test('the lamps keep their stride: nearly every station has its lamp, each still on its sidewalk, none on another', () => {
  assert.ok(SUN_LAMPS.length >= SUN_LAMP_STATIONS.length - 3, `${SUN_LAMP_STATIONS.length - SUN_LAMPS.length} lamps lost`);
  for (const [x, z] of SUN_LAMPS) {
    const kerb = Math.min(...SUN_STREETS.map((s) => distTo(s.pts, [x, z], !!s.loop) - s.half));
    assert.ok(kerb > 0.2 && kerb < 0.8, `a lamp ${kerb.toFixed(2)} from the kerb at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    for (const [ox, oz] of SUN_LAMPS) if (ox !== x || oz !== z) assert.ok(Math.hypot(ox - x, oz - z) > 3, 'a lamp on a lamp');
  }
});

test('a lamp clear of every drive stays where its station is', () => {
  assert.deepEqual(clearOfDrives([[0, 0, 0, 0.15]], []), [[0, 0, 0, 0.15]]);
});
