// Getting about (growth plan Phase 8): every place on the map has a spot you can arrive at and stand on; walking
// there counts it as visited (for fast travel, kept in the save); and a taxi can drive from any place to any
// other along the streets, to the kerb nearest it, in well under a minute.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLACES, PLACE_IDS, SEEN_R, seen } from '../src/scripts/city3d/places';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { RIVER, WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { cleanSave, newSave, visit } from '../src/scripts/city3d/tycoon';
import { pathBetween, pointOn } from '../src/scripts/city3d/routes';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { onDeck } from '../src/scripts/city3d/waterfront';

const R = 0.3;
const blocked = (x: number, z: number) => SOLIDS.some((b) => x > b[0] - R && x < b[2] + R && z > b[1] - R && z < b[3] + R);

test('every place has a spot to arrive at, free to stand on, in the world and out of the river', () => {
  assert.equal(new Set(PLACE_IDS).size, PLACES.length);
  for (const p of PLACES) {
    assert.ok(!blocked(p.at.x, p.at.z), `${p.id}'s spot is in something solid`);
    assert.ok(p.at.x > WORLD_BOUNDS[0] && p.at.x < WORLD_BOUNDS[2] && p.at.z > WORLD_BOUNDS[1] && p.at.z < WORLD_BOUNDS[3]);
    // (or on The Trenches' boardwalk, out over the water)
    assert.ok(p.at.z < RIVER[0] || p.at.z > RIVER[1] || onDeck(p.at.x, p.at.z, 0.3), `${p.id} is in the river`);
    assert.ok(Number.isFinite(p.at.yaw));
    assert.ok(p.spot || p.name, `${p.id} has a name`);
  }
});

test("walking to a place counts it as visited, kept in the save, and fast travel's list is only places on the map", () => {
  for (const p of PLACES) assert.ok(seen(p.at.x, p.at.z).includes(p.id));
  assert.deepEqual(seen(-400, -400), []);
  assert.ok(SEEN_R < 15);
  const s = newSave(0);
  assert.deepEqual(s.visited, []);
  assert.deepEqual(visit(s, ['emporium', 'karts', 'nowhere']), ['emporium', 'karts']);
  assert.deepEqual(visit(s, ['karts', 'airport']), ['airport']);
  const back = cleanSave(JSON.parse(JSON.stringify({ ...s, visited: [...s.visited, 'nowhere', 7, 'karts'] })), 0);
  assert.deepEqual(back.visited, ['emporium', 'karts', 'airport']);
  // A save from before it has none
  const old = JSON.parse(JSON.stringify(s));
  delete old.visited;
  assert.deepEqual(cleanSave(old, 0).visited, []);
});

test('a taxi drives from any place to any other along the streets, to the kerb nearest it, in well under a minute', () => {
  const roads = PLAN.streets.filter((s) => s.lanes > 0);
  const TAXI_SPEED = 12;
  for (const a of PLACES)
    for (const b of PLACES) {
      if (a === b) continue;
      const r = pathBetween([a.at.x, a.at.z], [b.at.x, b.at.z]);
      assert.ok(r, `no way from ${a.id} to ${b.id}`);
      for (let p = 0; p <= r!.len; p += 1) {
        const q = pointOn(r!, p, 0).at;
        assert.ok(roads.some((s) => distToStreet(s, q) <= s.half - 0.3), `${a.id} to ${b.id} leaves the road at ${q.map((v) => v.toFixed(1))}`);
      }
      // It ends at the road nearest the place (a lane's width or so from it)
      const end = r!.pts[r!.pts.length - 1];
      const nearest = Math.min(...roads.filter((s) => s.kind !== 'slip').map((s) => distToStreet(s, [b.at.x, b.at.z])));
      assert.ok(Math.hypot(end[0] - b.at.x, end[1] - b.at.z) < nearest + 4, `${a.id} to ${b.id} stops ${Math.hypot(end[0] - b.at.x, end[1] - b.at.z).toFixed(1)} away`);
      // (the longest, between the airport and Westlake Park's stadium, corner to corner of the map, is about 50 s)
      assert.ok(r!.len / TAXI_SPEED < 55, `${a.id} to ${b.id}: ${r!.len.toFixed(0)}`);
    }
});
