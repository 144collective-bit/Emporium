// Getting about (growth plan Phase 8): every place on the map has a spot you can arrive at and stand on; walking
// there counts it as visited (for fast travel, kept in the save); and a taxi can drive from any place to any
// other along the streets, to the kerb nearest it, in about a minute at most.
import { test } from 'node:test';
import { RESORTS } from '../src/scripts/city3d/resorts';
import { HILL_ROADS } from '../src/scripts/city3d/crestmont';
import assert from 'node:assert/strict';
import { PLACES, PLACE_IDS, SEEN_R, seen } from '../src/scripts/city3d/places';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { RIVER, STRIP_BLVD, WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { cleanSave, newSave, visit } from '../src/scripts/city3d/tycoon';
import { pathBetween, pointOn, rideTime } from '../src/scripts/city3d/routes';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { onDeck } from '../src/scripts/city3d/waterfront';
import { onEsplanade } from '../src/scripts/city3d/boulevard';

const R = 0.3;
const blocked = (x: number, z: number) => SOLIDS.some((b) => x > b[0] - R && x < b[2] + R && z > b[1] - R && z < b[3] + R);

test('every place has a spot to arrive at, free to stand on, in the world and out of the river', () => {
  assert.equal(new Set(PLACE_IDS).size, PLACES.length);
  for (const p of PLACES) {
    assert.ok(!blocked(p.at.x, p.at.z), `${p.id}'s spot is in something solid`);
    assert.ok(p.at.x > WORLD_BOUNDS[0] && p.at.x < WORLD_BOUNDS[2] && p.at.z > WORLD_BOUNDS[1] && p.at.z < WORLD_BOUNDS[3]);
    // (or on The Trenches' boardwalk or Uptown's esplanade, out over the water)
    assert.ok(p.at.z < RIVER[0] || p.at.z > RIVER[1] || onDeck(p.at.x, p.at.z, 0.3) || onEsplanade(p.at.x, p.at.z, 0.3), `${p.id} is in the river`);
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

test('a taxi drives from any place to any other along the streets, to the kerb nearest it, in about a minute at most', () => {
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
      // (of the streets a taxi can reach: not the hills' cul-de-sacs, which join no other street, nor the raised highway and its ramps)
      const nearest = Math.min(...roads.filter((s) => s.kind !== 'highway' && s.kind !== 'ramp' && !HILL_ROADS.some((r) => r.id === s.id && r.deadEnd)).map((s) => distToStreet(s, [b.at.x, b.at.z])));
      // (to a Neon Mile resort or the Sphere a taxi may stop on the boulevard's far kerb, the planted median between, by the way it
      // comes: no U-turns; the resorts' own drives come with the limos, docs/strip-plan.md Phase 5)
      const across = RESORTS.some((r) => r.id === b.id) || b.id === 'sphere' ? STRIP_BLVD.half : 0;
      assert.ok(Math.hypot(end[0] - b.at.x, end[1] - b.at.z) < nearest + 4 + across, `${a.id} to ${b.id} stops ${Math.hypot(end[0] - b.at.x, end[1] - b.at.z).toFixed(1)} away`);
      // (the longest in town, from The Trenches to Westlake Park's stadium, is about 59 s since the river was widened;
      // to or from the airport, out on the world's south edge since docs/airport-plan.md Phase 3, the longest is the
      // stadium to the airport's metro station by the terminal, corner to corner of the city, about 72 s)
      // (and to or from Crestmont's hills, the overlook up Vista Lane and the reservoir out past the ring highway's
      // north-east corner, from the stadium about 81 s; between the world's two far corners, the airport and the hills,
      // about 80 s)
      // (and Southbank Docks' metro station out on the docks' east quay past the highway's west side, docs/docks-plan.md
      // Phase 2: from Crestmont's grand hotel across the whole city about 67 s)
      // (and Lot 9 past the highway's south-west corner, docs/trailer-plan.md: from the stadium about 68 s)
      // (and the kart park out west past the highway since it moved, docs/kart-west-plan.md: to Crestmont's grand hotel
      // across the whole city about 75 s)
      // (and Lot 9 since it moved south of Endswood Estate, docs/estate-plan.md Phase 1: from Crestmont's civic hall
      // about 78 s)
      const docks = (id: string) => id === 'metro-docks' || id === 'harbourmaster' || id === 'karts' || id === 'metro-kart';
      // (and Endswood Estate's places south of the highway's south-west bend, docs/estate-plan.md Phase 8: from
      // Crestmont's grand hotel about 66 s)
      const ends = (id: string) => id === 'endswood' || id === 'aldwyns' || id === 'bunker';
      // (and Degen's home: first at the far end of the Close in Endswood carried west, docs/home-plan.md, as far out
      // as Lot 9; since it moved to his compound past the Close's end in the far west, the owner's call,
      // docs/ends-far-west-plan.md Phase 2, a little further: from Crestmont's grand hotel about 85 s)
      const extra = (id: string) => (id === 'airport' || id === 'metro-airport' || docks(id) || ends(id) ? 12 : id === 'lot9' ? 18 : id === 'home' || id === 'overlook' || id === 'reservoir' ? 22 : 0);
      // (from the docks out west to Crestmont's hills in the far north-east, right across the world: about 90 s)
      // (until the raised highway's exits come in, docs/highway-plan.md Phase 3, the far corners are the long way
      // round through town: the overlook to the airport's metro station about 94 s)
      // (and the kart park out west to the overlook, right across the world, about 98 s)
      // (and Lot 9 since it moved south of Endswood, docs/estate-plan.md Phase 1: the overlook to it, the far north-east
      // corner to the far south-west, about 100 s)
      // (and Degen's compound in the far west, docs/ends-far-west-plan.md Phase 2, the owner's call: the overlook to it,
      // the far north-east corner to further south-west still, about 107 s)
      const most = 110;
      // (Stadium Road's way in from the north road went up past the raised highway's exit 1, docs/highway-plan.md
      // Phase 1b: from the stadium to Crestmont's civic hall about 63 s, to its overlook about 85 s)
      // (and since its Phase 2 the ring highway is up on its viaduct, its exits to come in Phase 3: a taxi goes the
      // long way round through town, from the stadium to the airport's metro station about 77 s)
      // (since Phase 3 by its exits, quicker up there: routes.ts rideTime, HIGHWAY_PACE)
      const time = rideTime(r!, 0, TAXI_SPEED);
      assert.ok(time < Math.min(most, 66 + extra(a.id) + extra(b.id)), `${a.id} to ${b.id}: ${time.toFixed(0)} s`);
    }
});
