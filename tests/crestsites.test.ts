// Crestmont's landmarks (crestsites.ts, docs/crestmont-plan.md Phase 7): the grand hotel on its block, the civic
// hall at the boulevard's head, the country club's holes on the lower slopes, the overlook high on the ridge, the
// reservoir in its bowl; their ground held level off every road, mansion and estate; under the Emporium; nothing
// growing on them; the water held in by its banks and dams.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CIVIC, CLUB, EASE, FAIRWAY, FENCE, FRINGE, HOLES, HOTEL, HOTEL_PALMS, OVERLOOK, RESERVOIR, SITE_CUT, SITE_LEVELS, SITE_SOLIDS, TALLEST, bunkersOf, onSite } from '../src/scripts/city3d/crestsites';
import { BED, CREST_LAMPS, FLATS_X, BOULEVARD, nearHillRoad } from '../src/scripts/city3d/crestmont';
import { KEPT } from '../src/scripts/city3d/estates';
import { MANSIONS } from '../src/scripts/city3d/mansions';
import { LEVELS, heightAt, naturalAt } from '../src/scripts/city3d/terrain';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import { OAKS, PALMS, SCRUB } from '../src/scripts/city3d/landscape';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';

type Rect = [number, number, number, number];
const inside = (r: Rect, x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
const apart = (a: Rect, b: Rect, m: number) => a[2] + m < b[0] || b[2] + m < a[0] || a[3] + m < b[1] || b[3] + m < a[1];

test('their ground: held level, off every road, mansion and each other, never a quarry', () => {
  for (const l of SITE_LEVELS) {
    assert.ok(LEVELS.includes(l));
    const [x0, z0, x1, z1] = l.rect;
    for (let x = x0; x <= x1; x += 2) for (let z = z0; z <= z1; z += 2) assert.ok(Math.abs(heightAt(x, z) - l.y) < 1e-6);
    for (let x = x0 - EASE; x <= x1 + EASE; x += 1) for (let z = z0 - EASE; z <= z1 + EASE; z += 1) assert.ok(!nearHillRoad(x, z, BED.shoulder), `a site's ground reaches a road at ${x}, ${z}`);
    for (const m of MANSIONS) assert.ok(apart(m.rect, l.rect, 2 * EASE), `a site on ${m.id}`);
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) assert.ok(Math.abs(naturalAt(x, z) - l.y) <= SITE_CUT);
    for (const o of SITE_LEVELS) if (o !== l) assert.ok(apart(o.rect, l.rect, 2 * EASE));
  }
  // The streets' own ground stays flat (the civic hall and the clubhouse sit at the Flats' level)
  assert.equal(CIVIC.y, 0);
  assert.equal(CLUB.y, 0);
});

test('the hotel on the block kept for it; the civic hall on the boulevard; all under the Emporium', () => {
  assert.ok((KEPT as readonly string[]).includes('crest-2-0'));
  for (const r of [HOTEL.body, HOTEL.tower, HOTEL.porte, HOTEL.drive, HOTEL.pool, HOTEL.deck] as Rect[]) assert.ok(r[0] >= HOTEL.block[0] - 1e-9 && r[2] <= HOTEL.block[2] + 1e-9 && r[1] >= HOTEL.block[1] - 1e-9 && r[3] <= HOTEL.block[3] + 1e-9);
  assert.ok(TALLEST < EMPORIUM_ROOF);
  const hotelTop = HOTEL.storey.ground + (HOTEL.towerFloors - 1) * HOTEL.storey.upper + 0.8 + 0.15;
  assert.ok(hotelTop <= TALLEST);
  assert.ok(CIVIC.towerTop + CIVIC.dome + 0.8 <= TALLEST);
  // On the boulevard's line, past Foothill Road
  assert.equal((CIVIC.hall[0] + CIVIC.hall[2]) / 2, FLATS_X[BOULEVARD]);
  for (const p of HOTEL_PALMS) assert.ok(inside(HOTEL.block, p.x, p.z) && !inside(HOTEL.body, p.x, p.z, 1));
  for (const b of SITE_SOLIDS) {
    assert.ok(SOLIDS.includes(b));
    for (const s of PLAN.streets.filter((s) => s.kind !== 'alley')) assert.ok(distToStreet(s, [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]) > s.half + 0.3, `a landmark's box on ${s.id}`);
  }
});

test('the country club: six holes on the lower slopes, off the roads and the mansions', () => {
  assert.equal(HOLES.length, 6);
  for (const h of HOLES) {
    for (const [x, z] of [h.tee, h.green]) {
      assert.ok(!nearHillRoad(x, z, FAIRWAY + 2), `hole ${h.n} by a road`);
      for (const m of MANSIONS) assert.ok(!inside(m.rect, x, z, EASE + FRINGE), `hole ${h.n} on ${m.id}`);
      assert.ok(naturalAt(x, z) < 9, `hole ${h.n} off the lower slopes`);
    }
    // Along the fairway, clear of the roads and the mansions' ground
    for (let t = 0; t <= 1; t += 0.05) {
      const [x, z] = [h.tee[0] + (h.green[0] - h.tee[0]) * t, h.tee[1] + (h.green[1] - h.tee[1]) * t];
      assert.ok(!nearHillRoad(x, z, FAIRWAY + 1));
      for (const m of MANSIONS) assert.ok(!inside(m.rect, x, z, EASE + FAIRWAY - 1), `hole ${h.n}'s fairway on ${m.id}`);
    }
    assert.equal(bunkersOf(h).length, 2);
  }
  // No two holes' fairways run into each other
  const along = (h: (typeof HOLES)[number]) => Array.from({ length: 21 }, (_, k) => [h.tee[0] + ((h.green[0] - h.tee[0]) * k) / 20, h.tee[1] + ((h.green[1] - h.tee[1]) * k) / 20]);
  for (const [i, a] of HOLES.entries())
    for (const b of HOLES.slice(i + 1)) for (const p of along(a)) for (const q of along(b)) assert.ok(Math.hypot(p[0] - q[0], p[1] - q[1]) > 2 * FAIRWAY - 1, `holes ${a.n} and ${b.n} run into each other`);
});

test('the overlook high on the ridge, the reservoir held in by its banks and dams', () => {
  assert.ok(OVERLOOK.y > 20, `the overlook at ${OVERLOOK.y.toFixed(1)}`);
  assert.ok(nearHillRoad(OVERLOOK.path[0][0], OVERLOOK.path[0][1], 0.6));
  // The water: under the ground past every side without a dam (its edge in the bank), level with a dam's face where there is one
  const { water, dams, y } = RESERVOIR;
  for (const [x, z, dam] of [
    [water[0], (water[1] + water[3]) / 2, dams.w],
    [water[2], (water[1] + water[3]) / 2, dams.e],
    [(water[0] + water[2]) / 2, water[1], dams.n],
    [(water[0] + water[2]) / 2, water[3], dams.s],
  ] as [number, number, boolean][])
    if (!dam) assert.ok(heightAt(x, z) > y, `the reservoir's water over its bank at ${x}, ${z}`);
  assert.ok(Object.values(dams).some((d) => d), 'a reservoir with no dam');
  assert.ok(FENCE[0] < water[0] && FENCE[2] > water[2] && FENCE[1] < water[1] && FENCE[3] > water[3]);
});

test('nothing grows on them, and no lamp stands there', () => {
  const on = (x: number, z: number) => SITE_LEVELS.some((l) => inside(l.rect, x, z)) || HOLES.some((h) => Math.hypot(x - h.green[0], z - h.green[1]) < FRINGE) || inside(FENCE, x, z);
  for (const p of [...OAKS, ...SCRUB]) assert.ok(!onSite(p.x, p.z), `planted on a landmark at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
  for (const p of PALMS) assert.ok(!on(p.x, p.z), `a palm on a landmark at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
  for (const [x, z] of CREST_LAMPS) assert.ok(!on(x, z));
});
