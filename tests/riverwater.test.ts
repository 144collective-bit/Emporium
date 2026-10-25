// The water's look (riverwater.ts, docs/water-plan.md step 1): the river's rows across it (how far from a bank, the
// shallows' teal, where the waves wash in), the cove's swash strip on the sand and the lake's rings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BED, LAKE_INSETS, LAKE_MIDDLE, RUN_UP, SHALLOWS, SWASH_LIFT, lakeRings, riverRows, sandY, swashAt } from '../src/scripts/city3d/riverwater';
import { BANKS, WATER_Y, edgesAt, pullAt, topsAt } from '../src/scripts/city3d/river';
import { EXT } from '../src/scripts/city3d/layout';
import { LAKE_C, inLake, lakeR } from '../src/scripts/city3d/westlake';

test('the rows run north to south from water line to water line, the middle the furthest from both', () => {
  for (let x = EXT[0]; x <= EXT[1]; x += 1.5) {
    const rows = riverRows(x);
    const [n, s] = edgesAt(x);
    assert.equal(rows[0].z, n);
    assert.equal(rows.at(-1)!.z, s);
    for (let i = 1; i < rows.length; i++) assert.ok(rows[i].z > rows[i - 1].z, `rows out of order at ${x}`);
    // (each row's edge is its true distance to the nearer water line, so the distance between rows is exact)
    for (const r of rows) assert.ok(Math.abs(r.edge - Math.min(r.z - n, s - r.z)) < 1e-9, `edge wrong at ${x}, ${r.z}`);
    assert.equal(rows[2].edge, Math.max(...rows.map((r) => r.edge)));
    assert.ok(rows[1].edge === SHALLOWS && rows[3].edge === SHALLOWS);
  }
});

test('the quays carry no waves washing in and no teal; natural banks do', () => {
  for (let x = EXT[0]; x <= EXT[1]; x += 1.5) {
    const rows = riverRows(x);
    for (const [r, bank] of [
      [rows[0], 'north'],
      [rows.at(-1)!, 'south'],
    ] as const) {
      const quay = pullAt(bank, x) === 0;
      if (quay) assert.ok(r.wash === 0 && r.shore === 1 && r.beach === 0, `waves on a quay at ${x}`);
      if (pullAt(bank, x) >= 1.2) assert.ok(r.wash === 1 && r.shore === 0, `no waves on a natural bank at ${x}`);
      for (const v of [r.wash, r.shore, r.beach]) assert.ok(v >= 0 && v <= 1);
    }
    // (out in the stream, nothing washes in)
    assert.equal(rows[2].wash, 0);
  }
});

test('only the cove has a beach, and its swash lies on the sand from the water line up', () => {
  const cove = BANKS.find((b) => b.beach)!;
  let strips = 0;
  for (let x = EXT[0]; x <= EXT[1]; x += 0.5) {
    const w = swashAt(x);
    const rows = riverRows(x);
    const inCove = x > cove.x0 && x < cove.x1;
    if (!inCove) {
      assert.equal(w, null, `a swash off the beach at ${x}`);
      assert.ok(rows.every((r) => r.beach === 0), `a beach off the cove at ${x}`);
      continue;
    }
    if (!w) continue;
    strips++;
    const s = edgesAt(x)[1];
    const top = topsAt(x)[1];
    // From the water's edge (where its mesh ends, the sand there about the water's height), up the beach no further
    // than its run-up and never past the slope's top
    assert.equal(w.lo[0], s);
    assert.ok(Math.abs(sandY('south', x, s) - WATER_Y) < 0.3, `the sand at the water's edge is far from the water's height at ${x}`);
    assert.ok(w.hi[0] > w.lo[0] && w.hi[0] - w.lo[0] <= RUN_UP + 1e-9 && w.hi[0] <= top + 1e-9);
    // Just over the sand all the way (nothing flush), about the water's height at its foot, no higher than the street
    for (const t of [0, 0.5, 1]) {
      const z = w.lo[0] + (w.hi[0] - w.lo[0]) * t;
      const y = w.lo[1] + (w.hi[1] - w.lo[1]) * t;
      assert.ok(Math.abs(y - sandY('south', x, z) - SWASH_LIFT) < 1e-6, `the strip leaves the sand at ${x}`);
      assert.ok(y > WATER_Y - 0.15 && y <= SWASH_LIFT + 1e-9);
    }
    assert.ok(w.fade > 0 && w.fade <= 1);
  }
  assert.ok(strips > 60, `the cove's swash is too short (${strips})`);
});

test('the sand reaches under the water (the foam reads what stands in it)', () => {
  assert.ok(BED < WATER_Y - 0.2);
  const x = 20;
  const s = edgesAt(x)[1];
  assert.ok(sandY('south', x, s - 0.5) === BED);
  assert.ok(sandY('south', x, topsAt(x)[1]) === 0);
});

test('the lake has rings in from its edge, all in the lake, and a middle further in than any', () => {
  for (let k = 0; k < 120; k++) {
    const a = (k / 120) * Math.PI * 2;
    const rings = lakeRings(a);
    assert.equal(rings.length, LAKE_INSETS.length);
    rings.forEach(([x, z, d], i) => {
      assert.equal(d, LAKE_INSETS[i]);
      if (d > 0) assert.ok(inLake(x, z), `a ring outside the lake at ${a}`);
      assert.ok(Math.abs(Math.hypot(x - LAKE_C[0], z - LAKE_C[1]) - (lakeR(a) + 0.02 - d)) < 1e-9);
    });
  }
  assert.ok(LAKE_MIDDLE > LAKE_INSETS.at(-1)!);
});
