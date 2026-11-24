// Crestmont's landmarks (crestsites.ts, docs/crestmont-plan.md Phase 7): the grand hotel on its block, the civic
// hall at the boulevard's head, the country club's holes on the lower slopes, the overlook high on the ridge, the
// reservoir in its bowl; their ground held level off every road, mansion and estate; under the Emporium; nothing
// growing on them; the water held in by its banks and dams.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ASTERLY, CIVIC, EASE, FENCE, HOTEL, HOTEL_PALMS, OVERLOOK, RESERVOIR, SITE_CUT, SITE_DOORS, SITE_LEVELS, SITE_SOLIDS, SITE_SPAWNS, TALLEST, onSite } from '../src/scripts/city3d/crestsites';
import { BED, CREST_LAMPS, FLATS_X, BOULEVARD, nearHillRoad } from '../src/scripts/city3d/crestmont';
import { KEPT } from '../src/scripts/city3d/estates';
import { MANSIONS, onMansion } from '../src/scripts/city3d/mansions';
import { onLand } from '../src/scripts/city3d/crestland';
import { onTrail } from '../src/scripts/city3d/crestcover';
import { LEVELS, heightAt, naturalAt } from '../src/scripts/city3d/terrain';
import { drawnAt } from '../src/scripts/city3d/drawn';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import { PALMS, hillPlanting } from '../src/scripts/city3d/landscape';

const { oaks: OAKS, scrub: SCRUB } = hillPlanting();
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';

type Rect = [number, number, number, number];
const inside = (r: Rect, x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
const apart = (a: Rect, b: Rect, m: number) => a[2] + m < b[0] || b[2] + m < a[0] || a[3] + m < b[1] || b[3] + m < a[1];

test('their ground: held level, off every road, mansion and each other, never a quarry', () => {
  for (const l of SITE_LEVELS) {
    assert.ok(LEVELS.includes(l));
    const [x0, z0, x1, z1] = l.rect;
    // (a level nested inside it later, of the same site: the reservoir's basin in its apron, its own height)
    const inner = SITE_LEVELS.filter((o) => o !== l && o.of && o.of === l.of && SITE_LEVELS.indexOf(o) > SITE_LEVELS.indexOf(l));
    const nested = (x: number, z: number) => inner.some((o) => x > o.rect[0] - o.ease && x < o.rect[2] + o.ease && z > o.rect[1] - o.ease && z < o.rect[3] + o.ease);
    for (let x = x0; x <= x1; x += 2) for (let z = z0; z <= z1; z += 2) if (!nested(x, z)) assert.ok(Math.abs(heightAt(x, z) - l.y) < 1e-6);
    for (let x = x0 - EASE; x <= x1 + EASE; x += 1) for (let z = z0 - EASE; z <= z1 + EASE; z += 1) assert.ok(!nearHillRoad(x, z, BED.shoulder), `a site's ground reaches a road at ${x}, ${z}`);
    for (const m of MANSIONS) assert.ok(apart(m.rect, l.rect, 2 * EASE), `a site on ${m.id}`);
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) assert.ok(Math.abs(naturalAt(x, z) - l.y) <= SITE_CUT);
    for (const o of SITE_LEVELS) if (o !== l && !(o.of && o.of === l.of)) assert.ok(apart(o.rect, l.rect, 2 * EASE));
  }
  // The streets' own ground stays flat (the civic hall sits at the Flats' level)
  assert.equal(CIVIC.y, 0);
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

test('the country club retired (docs/golf-plan.md Phase 4): no clubhouse, no holes, no door of its own on the hills', () => {
  assert.ok(!SITE_DOORS.some((d) => (d.id as string) === 'golfclub'));
  assert.ok(!('golfclub' in SITE_SPAWNS));
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
  // The basin (the owner's call, 2026-11-19): its water held by its coping all round, the ground just outside the coping
  // over the water everywhere (no edge over air), the floor under it, the coping over it
  const { rect, crest, coping, floor } = RESERVOIR;
  assert.ok(floor < y && crest > y);
  const out = coping / 2 + 0.05;
  const [a, b, c, d] = [rect[0] - out, rect[1] - out, rect[2] + out, rect[3] + out];
  for (let t = 0; t <= 1; t += 0.02)
    for (const [x, z] of [
      [a + (c - a) * t, b],
      [a + (c - a) * t, d],
      [a, b + (d - b) * t],
      [c, b + (d - b) * t],
    ])
      assert.ok(drawnAt(x, z) > y, `the reservoir's water over air at ${x.toFixed(1)}, ${z.toFixed(1)}`);
  for (let x = rect[0] + 0.5; x < rect[2]; x += 1) for (let z = rect[1] + 0.5; z < rect[3]; z += 1) assert.ok(drawnAt(x, z) < y - 0.1, 'the basin floor over its water');
});

test('nothing grows on them, and no lamp stands there', () => {
  const on = (x: number, z: number) => SITE_LEVELS.some((l) => inside(l.rect, x, z)) || inside(FENCE, x, z);
  for (const p of [...OAKS, ...SCRUB]) assert.ok(!onSite(p.x, p.z), `planted on a landmark at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
  for (const p of PALMS) assert.ok(!on(p.x, p.z), `a palm on a landmark at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
  for (const [x, z] of CREST_LAMPS) assert.ok(!on(x, z));
});

test("the doors (the polish plan's Phase 7): one a place, on its ground by the building or the view, clear of everything solid, a step from where you arrive", () => {
  assert.deepEqual(
    SITE_DOORS.map((d) => d.id),
    ['hotel', 'civichall', 'overlook', 'reservoir', 'asterly', 'belvedere', 'glasshouse']
  );
  for (const d of SITE_DOORS) {
    for (const s of SOLIDS) assert.ok(!inside([s[0], s[1], s[2], s[3]], d.x, d.z), `${d.id}'s door in ${s.join()}`);
    for (const s of PLAN.streets) if (s.kind !== 'alley') assert.ok(distToStreet(s, [d.x, d.z]) > s.half + 0.3, `${d.id}'s door on ${s.id}`);
    const at = SITE_SPAWNS[d.id];
    assert.ok(Math.hypot(d.x - at.x, d.z - at.z) < 24, `${d.id}'s door far from where you arrive`);
  }
  // Each by its building's front (the hotel's under the porte-cochère, the hall's in its colonnade)
  const by = (r: readonly number[], x: number, z: number, m: number) => inside([r[0] - m, r[1] - m, r[2] + m, r[3] + m], x, z);
  const door = (id: string) => SITE_DOORS.find((d) => d.id === id)!;
  assert.ok(by(HOTEL.porte, door('hotel').x, door('hotel').z, 0.1) && door('hotel').x < HOTEL.body[0]);
  assert.ok(by(CIVIC.hall, door('civichall').x, door('civichall').z, 1) && door('civichall').z > CIVIC.hall[3]);
  assert.ok(inside(OVERLOOK.rect, door('overlook').x, door('overlook').z), 'the overlook\'s on its pad');
  assert.ok(door('reservoir').x < FENCE[0] && door('reservoir').z > FENCE[1] && door('reservoir').z < FENCE[3], "the reservoir's outside its fence on the west bank");
  // (THE ASTERLY's on the overlook's pad at its bridge, the premium upgrade's Phase 4)
  assert.ok(inside(OVERLOOK.rect, door('asterly').x, door('asterly').z), "the asterly's on the overlook's pad");
  assert.ok(door('asterly').x > ASTERLY.bridge[0] && door('asterly').x < ASTERLY.bridge[2], "the asterly's at its bridge");
});

test("THE ASTERLY (the premium upgrade's Phase 4): off the overlook's falling side, its floor level with it, over open slope, under the Emporium", () => {
  const A = ASTERLY;
  assert.ok(OVERLOOK.look[1] > 0.9, 'the overlook looks south, its pavilion off that side');
  assert.ok(Math.abs(A.y - OVERLOOK.y - 0.15) < 1e-9);
  // (off the overlook, touching it only by its bridge; the bridge from the overlook's edge to the pavilion)
  for (const r of [A.body, A.terrace]) assert.ok(r[1] > OVERLOOK.rect[3] + 1 || r[3] < OVERLOOK.rect[1] - 1, 'the pavilion on the overlook');
  assert.ok(A.bridge[1] < OVERLOOK.rect[3] && A.bridge[3] >= A.body[1] - 1e-9, "the bridge doesn't reach");
  // (its floor over the ground all under it: on legs, nothing cut or built up for it)
  for (const [x0, z0, x1, z1] of [A.body, A.terrace])
    for (let x = x0; x <= x1; x += 0.5) for (let z = z0; z <= z1; z += 0.5) assert.ok(heightAt(x, z) < A.y - 0.3, `the ground up through THE ASTERLY at ${x}, ${z}`);
  // (over open slope: no hill house's ground, land, footpath or road under it)
  for (const [x0, z0, x1, z1] of [A.body, A.terrace])
    for (let x = x0 - 1; x <= x1 + 1; x += 1)
      for (let z = z0 - 1; z <= z1 + 1; z += 1) {
        assert.ok(!onMansion(x, z), `THE ASTERLY over a hill house at ${x}, ${z}`);
        assert.ok(!onLand(x, z), `THE ASTERLY over land at ${x}, ${z}`);
        assert.ok(!onTrail(x, z), `THE ASTERLY over a footpath at ${x}, ${z}`);
        assert.ok(!nearHillRoad(x, z, 1), `THE ASTERLY over a road at ${x}, ${z}`);
      }
  assert.ok(A.h + A.roof + 1.3 < TALLEST, 'THE ASTERLY too tall');
  assert.ok(onSite((A.body[0] + A.body[2]) / 2, (A.body[1] + A.body[3]) / 2), 'the planting under THE ASTERLY');
});
