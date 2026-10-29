// The Drive, Crestmont's shopping street (coral.ts, docs/crestmont-plan.md Phase 4): boutiques along both sides of
// Coral Drive on their lots, facing it, under the Emporium; Via Coral through the west block, open at both ends; the
// bays off the kerb cut into the blocks with the sidewalk round behind them, their cars inside them; nothing on a
// street, nothing in anything else.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARCH, BOUTIQUES, CORAL_CARS, CORAL_SOLIDS, DRIVE_BLOCKS, FOUNTAINS, FRONT, LANE_SHOPS, PLANTERS, SHOPS, TABLES, TALLEST, VALET_STANDS, VIA, heightOf, onDrive } from '../src/scripts/city3d/coral';
import { CORAL, CORAL_BAYS, CREST_BLOCKS, CREST_LAMPS, FLATS_X, bayRect, crestPoly, flatsHalf, inBay } from '../src/scripts/city3d/crestmont';
import { PLAN, distToStreet, onSlab } from '../src/scripts/city3d/streetplan';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import { WALK_W } from '../src/scripts/city3d/layout';
import { JACARANDAS, PALMS } from '../src/scripts/city3d/landscape';
import { SOLIDS } from '../src/scripts/city3d/solids';

type Rect = [number, number, number, number];
const rectOf = (id: string): Rect => CREST_BLOCKS.find((b) => b.id === id)!.rect;
const inside = (r: Rect, x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
const overlap = (a: Rect, b: Rect) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
const streets = PLAN.streets.filter((s) => s.kind !== 'alley');
const coral = FLATS_X[CORAL];

test('the boutiques: on their lots along Coral Drive, facing it, set back, two or three storeys, apart, under the Emporium', () => {
  assert.ok(BOUTIQUES.length >= 8);
  assert.ok(TALLEST < EMPORIUM_ROOF);
  for (const b of BOUTIQUES) {
    const block = DRIVE_BLOCKS.find((id) => inside(rectOf(id), (b.rect[0] + b.rect[2]) / 2, (b.rect[1] + b.rect[3]) / 2))!;
    assert.ok(block, `${b.name} off the Drive's blocks`);
    const r = rectOf(block);
    assert.ok(b.rect[0] >= r[0] && b.rect[2] <= r[2] && b.rect[1] >= r[1] && b.rect[3] <= r[3], `${b.name} off its lot`);
    // Facing Coral Drive, its front FRONT back from the lot's edge
    if (r[2] < coral) assert.ok(b.face === 'e' && Math.abs(r[2] - b.rect[2] - FRONT) < 1e-9);
    else assert.ok(b.face === 'w' && Math.abs(b.rect[0] - r[0] - FRONT) < 1e-9);
    assert.ok(b.rect[3] - b.rect[1] > 4.5, `${b.name} a sliver`);
  }
  for (const b of SHOPS) {
    assert.ok(heightOf(b) + 0.15 <= TALLEST);
    for (const o of SHOPS) if (o !== b) assert.ok(!overlap(b.rect, o.rect), `${b.name} in ${o.name}`);
  }
  // Every name made up and on one shop, two cafés, one a side
  assert.equal(new Set(SHOPS.map((b) => b.name)).size, SHOPS.length);
  assert.deepEqual(
    BOUTIQUES.filter((b) => b.cafe).map((b) => b.face).sort(),
    ['e', 'w']
  );
});

test('Via Coral: through the west block from Coral Drive to Alder Way, its shops either side, its fountains in it, clear of the shops', () => {
  const r = rectOf('crest-0-2');
  assert.equal(VIA.lane[2], r[2]);
  assert.equal(VIA.piazza[0], r[0]);
  for (const s of SHOPS) for (const c of [VIA.lane, VIA.piazza]) assert.ok(!overlap(s.rect, c), `${s.name} on the via`);
  for (const f of FOUNTAINS) {
    assert.ok([VIA.lane, VIA.piazza].some((c) => inside(c, f.x - f.r, f.z) && inside(c, f.x + f.r, f.z)), 'a fountain off the via');
    // (room to walk past it)
    assert.ok(VIA.half - f.r > 1.2 || inside(VIA.piazza, f.x, f.z));
  }
  for (const z of ARCH.piers) assert.ok(z > VIA.lane[1] && z < VIA.lane[3]);
  assert.ok(ARCH.piers[1] - ARCH.piers[0] - 2 * ARCH.half > 3, 'a narrow arch');
  for (const s of LANE_SHOPS) assert.ok(s.face === 'n' || s.face === 's');
});

test("the bays: cut into the blocks off Coral Drive's kerb, the sidewalk behind them, their cars inside, no lamp or palm in them", () => {
  for (const b of CORAL_BAYS) {
    const [x0, z0, x1, z1] = bayRect(b);
    // From the kerb in
    assert.ok(Math.abs((b.side === 'e' ? x1 : x0) - (b.side === 'e' ? coral - flatsHalf(CORAL) : coral + flatsHalf(CORAL))) < 1e-9);
    // Off every slab (the block's outline has it cut out) and the street
    for (const [x, z] of [
      [(x0 + x1) / 2, (z0 + z1) / 2],
      [x0 + 0.1, z0 + 0.1],
      [x1 - 0.1, z1 - 0.1],
    ])
      assert.ok(!onSlab(PLAN, [x, z]), `${b.id} on a slab`);
    // The sidewalk round behind it: just behind its back, still on the sidewalk's slab
    const back = b.side === 'e' ? x0 - WALK_W / 2 : x1 + WALK_W / 2;
    assert.ok(onSlab(PLAN, [back, (z0 + z1) / 2]), `no sidewalk behind ${b.id}`);
    assert.ok(crestPoly(b.block).length > 4);
  }
  for (const [, x, z] of CORAL_CARS) assert.ok(inBay(x, z), 'a car off its bay');
  for (const [x, z] of CREST_LAMPS) assert.ok(!inBay(x, z, 0.3), 'a lamp in a bay');
  for (const p of PALMS) assert.ok(!inBay(p.x, p.z, 0.3), 'a palm in a bay');
  assert.ok(VALET_STANDS.length === CORAL_BAYS.filter((b) => b.kind === 'valet').length);
  for (const [x, z] of VALET_STANDS) assert.ok(onSlab(PLAN, [x, z]) && !inBay(x, z, 0.3));
});

test("the strip in front: planters, tables and stands on the lots, off the streets and the shops; nothing grows on the Drive", () => {
  for (const [x, z] of [...PLANTERS, ...TABLES, ...VALET_STANDS]) {
    assert.ok(onSlab(PLAN, [x, z]), `off the lots at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    for (const s of streets) assert.ok(distToStreet(s, [x, z]) > s.half + 0.4);
    for (const b of SHOPS) assert.ok(!inside(b.rect, x, z), `in ${b.name}`);
  }
  for (const p of PALMS) assert.ok(!SHOPS.some((b) => inside(b.rect, p.x, p.z, 1)), 'a palm in a boutique');
  for (const j of JACARANDAS) assert.ok(!onDrive(j.x, j.z, 1.2), 'a jacaranda on the Drive');
  // The Drive's solids are the city's
  for (const s of CORAL_SOLIDS) assert.ok(SOLIDS.includes(s));
});
