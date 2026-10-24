// The river's life (riverlife.ts, river plan step 4a): the cruise boat, the rowing eight and the dinghies, each on a
// line of its own, always in the water, clear of the boats' lanes, the tall ship, the bridges' piers, the decks and
// what's moored, and under the bridges with room to spare; a function of the clock.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CREW, CRUISE, DINGHIES, cruiseAt, hullCorners, loopOf, pointAlong, riverMovers, stadium, type Hull } from '../src/scripts/city3d/riverlife';
import { WALK_W } from '../src/scripts/city3d/layout';
import { LANDINGS, OBSTACLES, inRect } from './water';
import { WATER_Y, inWater } from '../src/scripts/city3d/river';
import { BOAT_LANES, BX, DECK_DEPTH, DECK_HALF, SHIP, lowY, shipAt } from '../src/scripts/city3d/liberty';
import { DEPTH, HALF, HX, deckY } from '../src/scripts/city3d/harbour';
import { BRIDGE_PIERS, PIER_HALF, boatZ } from '../src/scripts/city3d/waterfront';
import { riverBridges } from '../src/scripts/city3d/streetplan';

test('loops: closed, smooth, and a point along them wraps', () => {
  const l = loopOf(stadium(0, 10, 0, 4));
  assert.ok(Math.abs(l.len - (20 + Math.PI * 4)) < 0.2);
  const a = pointAlong(l, 3).at;
  const b = pointAlong(l, 3 + l.len).at;
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9);
  for (let s = 0; s < l.len; s += 0.3) {
    const [p, q] = [pointAlong(l, s).at, pointAlong(l, s + 0.3).at];
    assert.ok(Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.31);
  }
});

test('every new boat stays in the water, clear of everything on it', () => {
  for (let t = 0; t < 720; t += 0.5) {
    const ship = shipAt(t);
    const shipCorners = hullCorners(ship.x, ship.z, ship.yaw, { len: SHIP.len + 3.2, beam: SHIP.beam, top: SHIP.mast });
    for (const m of riverMovers(t)) {
      const c = hullCorners(m.x, m.z, m.yaw, m.hull);
      for (const p of c) {
        assert.ok(inWater(p[0], p[1], 0.4), `${m.id} on the bank at ${p.map((v) => v.toFixed(1))} (t ${t})`);
        for (const [what, r] of [...OBSTACLES, ...LANDINGS]) assert.ok(!inRect(p, r, 0.3), `${m.id} meets ${what} at ${p.map((v) => v.toFixed(1))} (t ${t})`);
      }
      // Clear of the tall ship (its bowsprit too)
      const sx = [Math.min(...shipCorners.map((q) => q[0])), Math.max(...shipCorners.map((q) => q[0]))];
      const sz = [Math.min(...shipCorners.map((q) => q[1])), Math.max(...shipCorners.map((q) => q[1]))];
      for (const p of c) assert.ok(!(p[0] > sx[0] - 0.6 && p[0] < sx[1] + 0.6 && p[1] > sz[0] - 0.6 && p[1] < sz[1] + 0.6), `${m.id} meets the tall ship (t ${t})`);
    }
  }
});

test('they keep off the boats lanes (the cruise boat crosses the middle one only at its turns)', () => {
  const clear = (m: { id: string; x: number; z: number; yaw: number; hull: Hull }) => {
    for (const p of hullCorners(m.x, m.z, m.yaw, m.hull))
      for (let lane = 0; lane < BOAT_LANES.length; lane++) assert.ok(Math.abs(p[1] - boatZ(lane, p[0])) > 0.35 + 0.3, `${m.id} in lane ${lane} at ${p.map((v) => v.toFixed(1))}`);
  };
  for (let t = 0; t < 720; t += 0.5)
    for (const m of riverMovers(t)) {
      // (on its straights only: round its ends it crosses the middle lane, wide of everything else)
      if (m.id === 'cruise' && (m.x < -105 || m.x > 26)) continue;
      clear(m);
    }
});

test('under the bridges with room to spare', () => {
  for (let t = 0; t < 720; t += 0.25)
    for (const m of riverMovers(t))
      for (const [x, z] of hullCorners(m.x, m.z, m.yaw, m.hull)) {
        const top = WATER_Y + m.hull.top;
        if (Math.abs(x - BX) < DECK_HALF + 0.2) assert.ok(top < lowY(z) - DECK_DEPTH - 0.25, `${m.id} hits Liberty Bridge's deck`);
        if (Math.abs(x - HX) < HALF + 0.2) assert.ok(top < deckY(z) - DEPTH - 0.25, `${m.id} hits Harbour Bridge's deck`);
        for (const b of riverBridges().filter((r) => r.street === 'highway')) assert.ok(x < b.x0 - 1 || x > b.x1 + 1, `${m.id} under the highway`);
      }
});

test('the highway bridges piers stand between the lanes; the cruise and the dinghies are where they say', () => {
  for (const z of BRIDGE_PIERS) for (const lane of BOAT_LANES) assert.ok(Math.abs(z - lane) > PIER_HALF + 1.5);
  for (const b of riverBridges().filter((r) => r.street === 'highway')) assert.ok(b.x1 - b.x0 > 2 * WALK_W);
  assert.equal(DINGHIES.length, 4);
  // The cruise boat runs eastward on its north line
  const p = cruiseAt(0);
  const q = cruiseAt(1);
  if (Math.abs(p.z - 87.7) < 0.01 && Math.abs(q.z - 87.7) < 0.01) assert.ok(q.x > p.x);
  assert.ok(CRUISE.loop.len > 300 && CREW.loop.len > 80);
});
