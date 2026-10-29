// The Flats' estates (estates.ts, docs/crestmont-plan.md Phase 5): lots on the blocks the Drive and the later
// landmarks don't take, each facing a street; in each, the house, its forecourt, fountain and pool inside the hedges,
// apart from each other, the gate on the drive; every style; nothing on a street, under the Emporium.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESTATES, ESTATE_BLOCKS, ESTATE_CARS, ESTATE_SOLIDS, FOUNTAIN, GATE, HEDGE, KEPT, STYLES, TALLEST, fountainOf, gardenPalmsOf, hedgesOf, inGateway, partTop, piersOf, rectToWorld, toWorld, type Part } from '../src/scripts/city3d/estates';
import { CREST_BLOCKS, CREST_LAMPS, FLATS_X } from '../src/scripts/city3d/crestmont';
import { DRIVE_BLOCKS } from '../src/scripts/city3d/coral';
import { PLAN, distToStreet, onSlab } from '../src/scripts/city3d/streetplan';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import { JACARANDAS, PALMS } from '../src/scripts/city3d/landscape';
import { SOLIDS } from '../src/scripts/city3d/solids';

type Rect = [number, number, number, number];
const inside = (r: Rect, x: number, z: number, m = 0) => x > r[0] + m && x < r[2] - m && z > r[1] + m && z < r[3] - m;
const overlap = (a: Rect, b: Rect) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
const streets = PLAN.streets.filter((s) => s.kind !== 'alley');
const parts = (e: (typeof ESTATES)[number]) => [e.house.main, e.house.wing, e.house.tower].filter((p): p is Part => !!p);

test('the lots: on the blocks the Drive, the hotel and the station leave, tiling them, each facing a street', () => {
  for (const id of ESTATE_BLOCKS) assert.ok(!(DRIVE_BLOCKS as readonly string[]).includes(id) && !(KEPT as readonly string[]).includes(id));
  assert.ok(ESTATES.length >= 25);
  for (const id of ESTATE_BLOCKS) {
    const r = CREST_BLOCKS.find((b) => b.id === id)!.rect;
    const area = ESTATES.filter((e) => e.block === id).reduce((a, e) => a + (e.rect[2] - e.rect[0]) * (e.rect[3] - e.rect[1]), 0);
    assert.ok(Math.abs(area - (r[2] - r[0]) * (r[3] - r[1])) < 1e-6, `${id} not covered`);
  }
  for (const [i, a] of ESTATES.entries()) for (const b of ESTATES.slice(i + 1)) assert.ok(!overlap(a.rect, b.rect), `${a.id} in ${b.id}`);
  // Its front is on a north-south street's sidewalk
  for (const e of ESTATES) {
    const [x, z] = toWorld(e, 0, 0.5);
    assert.ok(!onSlab(PLAN, [x + (e.face === 'e' ? 1 : -1) * 0.5, z]) || FLATS_X.some((s) => Math.abs(s - x) < 6), `${e.id} faces no street`);
    assert.ok(FLATS_X.some((s) => Math.abs(Math.abs(s - toWorld(e, 0, 0)[0]) - 2.5) < 1.5), `${e.id}'s front off a street`);
  }
  assert.deepEqual([...new Set(ESTATES.map((e) => e.style))].sort(), [...STYLES].sort());
});

test('each estate: the house, forecourt, fountain and pool inside its hedges and apart, the gate on the drive, under the Emporium', () => {
  assert.ok(TALLEST < EMPORIUM_ROOF);
  for (const e of ESTATES) {
    const lot: Rect = [-e.W / 2, -e.D, e.W / 2, 0];
    const inLot = (r: Rect, m = 0) => r[0] >= lot[0] + m && r[2] <= lot[2] - m && r[1] >= lot[1] + m && r[3] <= lot[3] - m;
    const front = -HEDGE.front - HEDGE.thick;
    for (const p of parts(e)) {
      assert.ok(inLot([p.u0, p.v1, p.u1, p.v0], 0.9), `${e.id}'s house off its lot`);
      assert.ok(p.v0 < front - 2, `${e.id}'s house on its hedge`);
      assert.ok(partTop(e.style, p) + 0.15 <= TALLEST);
    }
    // The forecourt in front of the house, the fountain in it, clear of the house and the gate
    const [fu, fv] = fountainOf(e);
    assert.ok(fv < e.court[0] - FOUNTAIN.r && fv > e.court[1] + FOUNTAIN.r + 0.3);
    // The pool behind the house, inside the back hedge
    const [, pv0, , pv1] = e.pool;
    assert.ok(pv0 < e.house.main.v1 - 0.5 && pv1 > -e.D + HEDGE.side + 0.4, `${e.id}'s pool`);
    // The gate on the house's line, the piers either side of the gap
    assert.ok(Math.abs(fu - e.hc) < 1e-9);
    for (const [u] of piersOf(e)) assert.ok(Math.abs(Math.abs(u - e.hc) - GATE.half - GATE.pier) < 1e-9);
    // The hedges inside the lot
    for (const [u0, v0, u1, v1] of hedgesOf(e)) assert.ok(inLot([Math.min(u0, u1), Math.min(v0, v1), Math.max(u0, u1), Math.max(v0, v1)], -1e-9));
    // Its palms on the lawn, off the house and the forecourt
    for (const [u, v] of gardenPalmsOf(e)) {
      assert.ok(u > lot[0] + 0.8 && u < lot[2] - 0.8, `${e.id}'s palm off the lot`);
      for (const p of parts(e)) assert.ok(!(u > p.u0 - 0.6 && u < p.u1 + 0.6 && v < p.v0 + 0.6 && v > p.v1 - 0.6), `${e.id}'s palm in the house`);
    }
  }
});

test("the estates' solids: in the city's, on the slabs, off the streets; the street's planting off them", () => {
  for (const s of ESTATE_SOLIDS) {
    assert.ok(SOLIDS.includes(s));
    for (const [x, z] of [
      [s[0], s[1]],
      [s[2], s[3]],
    ])
      assert.ok(onSlab(PLAN, [x, z]), `a box off the slabs at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    for (const st of streets) assert.ok(distToStreet(st, [(s[0] + s[2]) / 2, (s[1] + s[3]) / 2]) > st.half + 0.5);
  }
  const blocked = (x: number, z: number) => ESTATE_SOLIDS.some((b) => x > b[0] && x < b[2] && z > b[1] && z < b[3]);
  for (const p of PALMS) assert.ok(!blocked(p.x, p.z), `a palm in an estate at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
  for (const p of PALMS) assert.ok(!inGateway(p.x, p.z, 0.3), 'a palm in a gateway');
  for (const j of JACARANDAS) assert.ok(!blocked(j.x, j.z), 'a jacaranda in an estate');
  for (const [x, z] of CREST_LAMPS) assert.ok(!blocked(x, z));
  // The cars on their forecourts
  for (const [, x, z] of ESTATE_CARS) assert.ok(ESTATES.some((e) => inside(rectToWorld(e, e.hc - 4, e.court[0], e.hc + 4, e.court[1]), x, z)));
});
