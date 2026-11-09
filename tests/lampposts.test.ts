// A lamp post per district (lampposts.ts, the polish plan's Phase 10): every lamp the city places gets a kind from
// where it stands, each district's lamps its own, the town's everywhere else; each kind's shape holds its head over
// its pole and the posts in scale with Degen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAMP_KINDS, LAMP_POSTS, headOf, lampStyle, type LampKind } from '../src/scripts/city3d/lampposts';
import { UPTOWN_LAMPS } from '../src/scripts/city3d/uptown';
import { NORTH_LAMPS } from '../src/scripts/city3d/uptownnorth';
import { MALL_LAMPS } from '../src/scripts/city3d/mall';
import { CREST_LAMPS } from '../src/scripts/city3d/crestmont';
import { SUN_LAMPS } from '../src/scripts/city3d/sunridge';
import { SUN_PLACE_LAMPS } from '../src/scripts/city3d/sunplaces';
import { PARK_LAMPS as WESTLAKE_LAMPS } from '../src/scripts/city3d/westlake';
import { GARDEN_LAMPS } from '../src/scripts/city3d/gardens';
import { STRIP_LAMPS } from '../src/scripts/city3d/strip';
import { LOT9_LAMPS } from '../src/scripts/city3d/lot9';
import { ENDS_LAMPS } from '../src/scripts/city3d/endswood';
import { COMMON_LAMPS } from '../src/scripts/city3d/endsblend';
import { AIRPORT_LAMPS } from '../src/scripts/city3d/airfield';
import { DOCK_LAMPS } from '../src/scripts/city3d/docks';
import { SF_LAMPS } from '../src/scripts/city3d/southfield';
import { STADIUM_LAMPS } from '../src/scripts/city3d/stadium';
import { KART_LAMPS } from '../src/scripts/city3d/kartfacility';
import { DIAGONAL_LAMPS } from '../src/scripts/city3d/downtown';
import { BLOCK_SPAWN } from '../src/scripts/city3d/projects';
import { TRENCH_STREETS } from '../src/scripts/city3d/trenches';

type Lamp = readonly [number, number, ...number[]];
const kindsOf = (lamps: readonly Lamp[]) => new Set(lamps.map(([x, z]) => lampStyle(x, z)));
const only = (lamps: readonly Lamp[], kind: LampKind, what: string) => {
  assert.ok(lamps.length > 0, `${what}: no lamps`);
  assert.deepEqual([...kindsOf(lamps)], [kind], `${what}: ${[...kindsOf(lamps)].join(', ')}`);
};

test('every kind is a post in scale with Degen, its head over its pole, its arm reaching it', () => {
  for (const k of LAMP_KINDS) {
    const P = LAMP_POSTS[k];
    assert.ok(P.h >= 1 && P.h <= 3.2, `${k}: ${P.h} tall`);
    assert.ok(P.r[0] <= P.r[1] && P.r[1] < 0.1, `${k}: a slim pole`);
    assert.ok(P.headY >= P.h - 0.1 && P.headY <= P.h + 0.3, `${k}: the head at the pole's top`);
    assert.ok(P.cap === (P.arm === 0), `${k}: a cap only where there's no arm`);
    const { out, up } = headOf(k);
    assert.equal(up, P.headY);
    assert.equal(out, P.double ? 0 : P.arm);
    assert.ok(!P.neon || k === 'strip');
  }
  assert.equal(new Set(Object.keys(LAMP_POSTS)).size, LAMP_KINDS.length);
});

test('each district gets its own post', () => {
  only(UPTOWN_LAMPS, 'uptown', 'Uptown');
  only(NORTH_LAMPS, 'uptown', 'Uptown North');
  only(MALL_LAMPS, 'uptown', 'the mall');
  only(CREST_LAMPS, 'lantern', 'Crestmont');
  only(SUN_LAMPS, 'suburb', 'Sunridge');
  only(SUN_PLACE_LAMPS, 'suburb', "Sunridge's places");
  only(WESTLAKE_LAMPS, 'park', 'Westlake Park');
  only(GARDEN_LAMPS, 'park', 'the formal garden');
  only(STRIP_LAMPS, 'strip', 'the Neon Mile');
  only(LOT9_LAMPS, 'cobra', 'Lot 9');
  only(ENDS_LAMPS, 'cobra', 'Endswood Estate');
  only(COMMON_LAMPS, 'cobra', "Endswood's common");
  only(AIRPORT_LAMPS, 'airport', 'the airport');
  // The Trenches' lamps stand along its streets (streets3d.ts places them): a point on each street is its own
  for (const s of TRENCH_STREETS) {
    const [a, b] = [s.pts[0], s.pts[s.pts.length - 1]];
    assert.equal(lampStyle((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), 'cobra', s.id);
  }
  assert.equal(lampStyle(BLOCK_SPAWN.x, BLOCK_SPAWN.z), 'cobra');
});

test("the town's post everywhere else: downtown, the Docks and the yards (their masts are their own), the stadium, the kart park", () => {
  only(DIAGONAL_LAMPS.map((l) => l.at), 'town', 'downtown');
  only(DOCK_LAMPS, 'town', 'the Docks');
  only(SF_LAMPS, 'town', 'Southfield Yards');
  only(STADIUM_LAMPS, 'town', 'the stadium');
  only(KART_LAMPS, 'town', 'the kart park');
  // Open land
  assert.equal(lampStyle(-500, -500), 'town');
});
