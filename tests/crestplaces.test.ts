// Crestmont's new places (the premium upgrade's Phase 4; the owner's calls, 2026-11-20: "Split", "Panels + the showroom
// sells", the names kept): THE ASTERLY on Highcrest, and on Coral Drive two boutiques refitted, VELLANO MOTOR SALON and
// SOLENNE, standing where they stood. Each a place with its door, its live line, where you arrive by it; the showroom's
// cars the garage's own, for Dorras.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOUTIQUES, CORAL_DOORS, CORAL_PLACES, CORAL_PLACE_NAMES, CORAL_SOLIDS, CORAL_SPAWNS, doorOf } from '../src/scripts/city3d/coral';
import { PLACES } from '../src/scripts/city3d/places';
import { LIVE_PLACES } from '../src/scripts/city3d/live';
import { LIVE_IDS, liveLine } from '../src/scripts/city3d/livelines';
import { SITE_DOORS } from '../src/scripts/city3d/crestsites';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { CAR_CATALOG } from '../src/scripts/city3d/catalog';

const IDS = ['asterly', 'vellano', 'solenne'] as const;
const at = (d: number, h: number) => new Date(2026, 10, d, h).getTime();

test('the three places: in the places, the live list and the live lines, each with a door', () => {
  for (const id of IDS) {
    assert.ok(PLACES.some((p) => p.id === id && p.kind === 'spot'), `${id} isn't a place`);
    assert.ok(LIVE_PLACES.some((p) => p.id === id), `${id} isn't live`);
    assert.ok((LIVE_IDS as readonly string[]).includes(id), `${id} has no live line`);
    for (const h of [3, 9, 13, 16, 20]) assert.ok(liveLine(id, at(20, h)), `${id} says nothing at ${h}`);
  }
  assert.ok(SITE_DOORS.some((d) => d.id === 'asterly'));
  assert.deepEqual(
    CORAL_DOORS.map((d) => d.id),
    ['vellano', 'solenne']
  );
});

test("Coral Drive's refits: two boutiques as they stood, renamed, one on each side of the street", () => {
  const show = CORAL_PLACES.vellano;
  const spa = CORAL_PLACES.solenne;
  assert.ok(show && spa && show !== spa);
  assert.equal(show.name, CORAL_PLACE_NAMES.vellano);
  assert.equal(spa.name, CORAL_PLACE_NAMES.solenne);
  assert.notEqual(show.face, spa.face, 'both on one side');
  for (const b of [show, spa]) {
    assert.ok(!b.cafe && !b.side && BOUTIQUES.includes(b));
    assert.equal(BOUTIQUES.filter((q) => q.name === b.name).length, 1, `two boutiques called ${b.name}`);
  }
});

test("the refits' doors and where you arrive: on the strip in front, off the street and off what's solid", () => {
  for (const d of CORAL_DOORS) {
    const b = CORAL_PLACES[d.id];
    const [dx, dz] = doorOf(b);
    assert.ok(Math.hypot(d.x - dx, d.z - dz) < 1, `${d.id}'s door off its shopfront`);
    const s = CORAL_SPAWNS[d.id];
    for (const p of [d, s]) {
      for (const box of CORAL_SOLIDS) assert.ok(!(p.x > box[0] && p.x < box[2] && p.z > box[1] && p.z < box[3]), `${d.id} in something solid`);
      for (const st of PLAN.streets) if (st.kind !== 'alley') assert.ok(distToStreet(st, [p.x, p.z]) > st.half + 0.2, `${d.id} on ${st.id}`);
    }
    // (facing its door)
    const [fx, fz] = [-Math.sin(s.yaw), -Math.cos(s.yaw)];
    assert.ok(fx * (d.x - s.x) + fz * (d.z - s.z) > 0, `${d.id}'s arrival faces away`);
  }
});

test("the showroom's cars: the garage's own for sale, every one with a price and a level", () => {
  const forSale = Object.entries(CAR_CATALOG).filter(([, e]) => e.price > 0);
  assert.ok(forSale.length >= 5);
  for (const [, e] of forSale) assert.ok(e.level >= 1 && Number.isFinite(e.price));
});
