// Every street lamp by a street reaches out over it (the owner's call, 2026-11-12: Endswood's, Lot 9's, the Docks',
// the Neon Mile's, Southfield's, the stadium's, the kart park's, Crestmont's, the airport's and the park side of
// Uptown's avenue had reached back off it): a lamp's arm reaches along (cos ry, -sin ry) (world.ts `buildLamps()`),
// so for every lamp within `NEAR` of a street's edge, its head is no further from that street than its pole. The one
// exception is the well's in Endswood Circus, which reach in over the well (tests/endslamps.test.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { PARK_LAMPS } from '../src/scripts/city3d/westlake';
import { SQUARE_LAMPS } from '../src/scripts/city3d/civic';
import { CREST_LAMPS } from '../src/scripts/city3d/crestmont';
import { SUN_LAMPS } from '../src/scripts/city3d/sunridge';
import { SUN_PLACE_LAMPS } from '../src/scripts/city3d/sunplaces';
import { DOCK_LAMPS } from '../src/scripts/city3d/docks';
import { STRIP_LAMPS } from '../src/scripts/city3d/strip';
import { DECK_LAMPS as VIA_DECK } from '../src/scripts/city3d/viapiers';
import { RAMP_LAMPS } from '../src/scripts/city3d/viadress';
import { SWING_LAMPS } from '../src/scripts/city3d/swingbridge';
import { ENDS_LAMPS } from '../src/scripts/city3d/endswood';
import { RURAL_LAMPS } from '../src/scripts/city3d/ruraldress';
import { LOT9_LAMPS } from '../src/scripts/city3d/lot9';
import { PARK_LAMPS as SF_PARK, SF_LAMPS } from '../src/scripts/city3d/southfield';
import { GARDEN_LAMPS } from '../src/scripts/city3d/gardens';
import { LAMPS as PLAZA_LAMPS, TERRACE_LAMPS } from '../src/scripts/city3d/plaza';
import { EDGE_LAMPS } from '../src/scripts/city3d/boulevard';
import { MALL_LAMPS } from '../src/scripts/city3d/mall';
import { NORTH_LAMPS } from '../src/scripts/city3d/uptownnorth';
import { EDGE_LAMPS as PARK_EDGE } from '../src/scripts/city3d/parkedge';
import { STADIUM_LAMPS } from '../src/scripts/city3d/stadium';
import { AIRPORT_LAMPS, DECK_LAMPS as AIR_DECK } from '../src/scripts/city3d/airfield';
import { KART_LAMPS } from '../src/scripts/city3d/kartfacility';
import { RING_LAMPS, PARK_SIDE_LAMPS, MALL_SIDE_LAMPS } from '../src/scripts/city3d/ringstreet';
import { UPTOWN_LAMPS } from '../src/scripts/city3d/uptown';
import { DIAGONAL_LAMPS } from '../src/scripts/city3d/downtown';
const lists: Record<string, readonly (readonly unknown[])[]> = { PARK_LAMPS, SQUARE_LAMPS, CREST_LAMPS, SUN_LAMPS, SUN_PLACE_LAMPS, DOCK_LAMPS, STRIP_LAMPS, VIA_DECK, RAMP_LAMPS, SWING_LAMPS, ENDS_LAMPS, RURAL_LAMPS, LOT9_LAMPS, SF_PARK, SF_LAMPS, GARDEN_LAMPS, PLAZA_LAMPS, TERRACE_LAMPS, EDGE_LAMPS, MALL_LAMPS, NORTH_LAMPS, PARK_EDGE, STADIUM_LAMPS, AIRPORT_LAMPS, AIR_DECK, KART_LAMPS, RING_LAMPS, PARK_SIDE_LAMPS, MALL_SIDE_LAMPS, UPTOWN_LAMPS, DIAGONAL: DIAGONAL_LAMPS.map((l) => [l.at[0], l.at[1], l.ry]) };
const NEAR = 3;
const streets = PLAN.streets.filter((s) => s.kind !== 'highway' && s.kind !== 'ramp');

test('every street lamp by a street reaches out over it, not back off it', () => {
  let checked = 0;
  for (const [name, ls] of Object.entries(lists)) {
    for (const l of ls) {
      const [x, z, ry] = l as number[];
      let best: { s: (typeof streets)[number]; d: number } | null = null;
      for (const s of streets) {
        const d = distToStreet(s, [x, z]) - s.half;
        if (!best || d < best.d) best = { s, d };
      }
      if (!best || best.d > NEAR || best.d < -0.5) continue;
      checked++;
      const head: [number, number] = [x + Math.cos(ry) * 0.6, z - Math.sin(ry) * 0.6];
      const moved = distToStreet(best.s, head) - distToStreet(best.s, [x, z]);
      assert.ok(moved < 0.3, `${name}: the lamp at ${x.toFixed(1)}, ${z.toFixed(1)} reaches ${moved.toFixed(2)} away from ${best.s.id}`);
    }
  }
  assert.ok(checked > 500, `${checked} lamps by a street`);
});
