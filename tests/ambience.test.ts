// The sound follows the district you're in (ambience.ts, growth plan Phase 8): the beat at the Emporium, the hum in
// town and wind out of it, the river by the water, traffic by the highway and the avenues; every layer 0-1 everywhere.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ambienceAt } from '../src/scripts/city3d/ambience';
import { DOORS } from '../src/scripts/city3d/solids';
import { EXT, RIVER, NS_ROADS } from '../src/scripts/city3d/layout';
import { HIGHWAY_BOX } from '../src/scripts/city3d/highway';
import { CLUB } from '../src/scripts/city3d/avenue';

test('every layer stays between 0 and 1 across the world', () => {
  for (let x = EXT[0]; x <= EXT[1]; x += 23)
    for (let z = EXT[0]; z <= EXT[1]; z += 23) {
      const a = ambienceAt(x, z);
      for (const [k, v] of Object.entries(a)) assert.ok(v >= 0 && v <= 1 && Number.isFinite(v), `${k} at ${x}, ${z}: ${v}`);
    }
});

test('the beat is the Emporium’s, the hum the town’s, the wind the open land’s', () => {
  const e = DOORS.find((d) => d.id === 'emporium')!;
  const at = ambienceAt(e.x, e.z + 2);
  assert.ok(at.beat > 0.9 && at.city === 1 && at.open === 0);
  const far = ambienceAt(EXT[0] + 20, EXT[0] + 20);
  assert.equal(far.beat, 0);
  assert.ok(far.city < 0.05 && far.open > 0.95);
});

test('the river by the water, traffic by the highway and the avenues', () => {
  assert.ok(ambienceAt(30, (RIVER[0] + RIVER[1]) / 2).water === 1);
  assert.ok(ambienceAt(30, RIVER[0] - 60).water === 0);
  // On the highway's north side, and in the middle of a block far from any road
  assert.ok(ambienceAt((HIGHWAY_BOX[0] + HIGHWAY_BOX[2]) / 2, HIGHWAY_BOX[1]).road > 0.95);
  assert.ok(ambienceAt(NS_ROADS[NS_ROADS.length - 1].c, 40).road >= 0.55);
  assert.ok(ambienceAt(EXT[0] + 20, EXT[0] + 20).road === 0);
});

test("Club PULSE's beat by its door on Trench Avenue, none across town", () => {
  assert.ok(ambienceAt(CLUB.spot.x, CLUB.spot.z).club > 0.95);
  assert.ok(ambienceAt(CLUB.door.x + 15, CLUB.door.z + 4).club > 0.2, 'down the avenue');
  const e = DOORS.find((d) => d.id === 'emporium')!;
  assert.equal(ambienceAt(e.x, e.z).club, 0);
  assert.ok(ambienceAt(CLUB.spot.x, CLUB.spot.z, 120).club < 0.05, 'high over it, a wash');
});
