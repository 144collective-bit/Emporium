// Sunridge's houses (sunhouses.ts, docs/suburb-plan.md Phase 2): a house on (nearly) every lot, inside it with side
// yards and a back yard, off every street; the plans, elevations and colours mixed, no two neighbours alike; a
// driveway from the street to every garage; everything under the Emporium; their solids where their walls are.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BACK_MIN, HOUSES, HOUSE_SOLIDS, PLANS, SIDE_MIN, houseTop, toWorld } from '../src/scripts/city3d/sunhouses';
import { LOTS, outline } from '../src/scripts/city3d/sunridgelots';
import { SUN_STREETS, distTo, inside, type Pt } from '../src/scripts/city3d/sunridge';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import { WALK_W } from '../src/scripts/city3d/layout';

const lots = new Map(LOTS.map((l) => [l.id, l]));
const corners = (h: (typeof HOUSES)[number]) => h.parts.flatMap((p): Pt[] => [toWorld(h, p.u0, p.v0), toWorld(h, p.u1, p.v0), toWorld(h, p.u0, p.v1), toWorld(h, p.u1, p.v1)]);

test('a house on every lot but a very few, each inside its own lot with room round it, off the streets', () => {
  assert.ok(HOUSES.length >= LOTS.length - 3, `${HOUSES.length} houses on ${LOTS.length} lots`);
  assert.equal(new Set(HOUSES.map((h) => h.lot)).size, HOUSES.length, 'two houses on one lot');
  for (const h of HOUSES) {
    const lot = outline(lots.get(h.lot)!);
    for (const p of corners(h)) {
      assert.ok(inside(lot, p), `${h.id} off its lot at ${p}`);
      assert.ok(distTo(lot, p, true) > SIDE_MIN - 0.15, `${h.id} too near its lot's edge at ${p}`);
      assert.ok(SUN_STREETS.every((s) => distTo(s.pts, p, !!s.loop) > s.half + WALK_W), `${h.id} on a street at ${p}`);
    }
    // A back yard: the lot's back edge well behind the house
    const back = h.parts.reduce((m, p) => Math.max(m, p.v1), 0);
    const l = lots.get(h.lot)!;
    const bmid: Pt = [(l.back[0][0] + l.back[1][0]) / 2, (l.back[0][1] + l.back[1][1]) / 2];
    const bv = (bmid[0] - h.o[0]) * h.v[0] + (bmid[1] - h.o[1]) * h.v[1];
    assert.ok(bv - back >= BACK_MIN - 0.6, `${h.id}'s back yard only ${(bv - back).toFixed(2)} deep`);
  }
});

test('the plans, elevations and colours mixed, neighbours never the same colour, about three in ten two storeys', () => {
  for (const p of PLANS) assert.ok(HOUSES.some((h) => h.plan === p), `no ${p}`);
  for (const e of ['arch', 'stone', 'tower']) assert.ok(HOUSES.some((h) => h.elevation === e), `no ${e} entries`);
  const two = HOUSES.filter((h) => h.plan === 'two' || h.plan === 'porch').length / HOUSES.length;
  assert.ok(two > 0.18 && two < 0.42, `${(two * 100).toFixed(0)}% two storeys`);
  for (let i = 1; i < HOUSES.length; i++) {
    const [a, b] = [HOUSES[i - 1], HOUSES[i]];
    // (side by side: the lots one after the other along the same street)
    if (lots.get(a.lot)!.street === lots.get(b.lot)!.street && Math.hypot(a.o[0] - b.o[0], a.o[1] - b.o[1]) < 8) assert.notEqual(a.scheme, b.scheme, `${a.id} and ${b.id} the same colour`);
  }
  assert.ok(HOUSES.some((h) => h.solar) && HOUSES.some((h) => h.chimney) && HOUSES.some((h) => h.mirror) && HOUSES.some((h) => !h.mirror));
});

test('a driveway from the street to every garage, the front door facing the street', () => {
  for (const h of HOUSES) {
    const g = h.parts.find((p) => p.kind === 'garage')!;
    assert.ok(h.garageDoor.v === g.v0 && h.garageDoor.v >= 3.2, `${h.id}'s driveway too short`);
    assert.ok(h.drive[0] >= g.u0 - 0.3 && h.drive[1] <= g.u1 + 0.3);
    const m = h.parts.find((p) => p.kind === 'main')!;
    assert.ok(h.door.v <= m.v0 + 1e-9 && h.door.v > 2.5, `${h.id}'s door not on its front`);
  }
});

test('under the Emporium, and solid where the walls are', () => {
  for (const h of HOUSES) assert.ok(houseTop(h) < EMPORIUM_ROOF - 3, `${h.id} ${houseTop(h)}`);
  assert.ok(HOUSE_SOLIDS.length >= HOUSES.length * 2);
  // Every house's middle inside one of its boxes, and every box near its house
  for (const h of HOUSES) {
    const m = h.parts.find((p) => p.kind === 'main')!;
    const [x, z] = toWorld(h, (m.u0 + m.u1) / 2, (m.v0 + m.v1) / 2);
    assert.ok(HOUSE_SOLIDS.some((b) => x >= b[0] - 1e-6 && x <= b[2] + 1e-6 && z >= b[1] - 1e-6 && z <= b[3] + 1e-6), `${h.id}'s middle isn't solid`);
  }
});
