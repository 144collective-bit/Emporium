// Crestmont's gateway (crestgate.ts, the premium upgrade's Phase 1; the owner's call, 2026-11-19: "Gateway, streets
// kept"): the pylons and wing walls on the corner lots' strips outside the hedges, off the streets, the sidewalks, the
// hedges, the gates and everything else solid; the fountain on the median's grass, clear of its palms and the
// junction; the verges' planting off it all; under the Emporium.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASIN, CORNER_Z, GATEWAY_SOLIDS, GATE_X, MEDIAN_GRASS, PYLON, PYLONS, WINGS, onGateway } from '../src/scripts/city3d/crestgate';
import { ESTATES, ESTATE_SOLIDS, HEDGE, SLAB_Y, hedgesOf, piersOf, rectToWorld, toWorld } from '../src/scripts/city3d/estates';
import { ESTATE_GARDENS, GARDEN_SOLIDS } from '../src/scripts/city3d/crestgardens';
import { LAND_SOLIDS } from '../src/scripts/city3d/crestland';
import { CREST_LAMPS } from '../src/scripts/city3d/crestmont';
import { JACARANDAS, PALMS } from '../src/scripts/city3d/landscape';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { EW_ROADS, WALK_W } from '../src/scripts/city3d/layout';

type R = readonly number[];
const overlap = (a: R, b: R, m = 0) => a[0] < b[2] + m && b[0] < a[2] + m && a[1] < b[3] + m && b[1] < a[3] + m;
const pylonBoxes = PYLONS.map((p) => [p.x - PYLON.half, p.z - PYLON.half, p.x + PYLON.half, p.z + PYLON.half]);
const gate = [...pylonBoxes, ...WINGS];
const near = PLAN.streets;

test('the pylons and wings: on the corner lots, in the strip outside their hedges, off every street', () => {
  assert.equal(PYLONS.length, 2);
  for (const r of gate) {
    const lot = ESTATES.find((e) => overlap(e.rect, r));
    assert.ok(lot, `the gateway's box ${r.map((n) => n.toFixed(1))} on no lot`);
    assert.ok(r[0] >= lot.rect[0] && r[2] <= lot.rect[2] && r[1] >= lot.rect[1] && r[3] <= lot.rect[3], `the gateway's box off ${lot.id}`);
    // (no closer to a street's edge than the lots' own edge: the sidewalk stays clear)
    for (const [x, z] of [
      [r[0], r[1]],
      [r[2], r[1]],
      [r[0], r[3]],
      [r[2], r[3]],
    ])
      for (const st of near) assert.ok(distToStreet(st, [x, z]) > st.half + WALK_W - 1e-6, `the gateway on ${st.id} or its sidewalk at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    for (const h of hedgesOf(lot)) assert.ok(!overlap(rectToWorld(lot, h[0], h[1], h[2], h[3]), r, -1e-6), `the gateway in ${lot.id}'s hedge`);
    for (const [u, v] of piersOf(lot)) {
      const [x, z] = toWorld(lot, u, v);
      assert.ok(!overlap([x - 0.5, z - 0.5, x + 0.5, z + 0.5], r), `the gateway on ${lot.id}'s gate`);
    }
  }
  // (on either side of the boulevard, symmetric, at the avenue's corner)
  assert.ok(Math.abs(PYLONS[0].x + PYLONS[1].x - 2 * GATE_X) < 1e-9);
  for (const p of PYLONS) assert.ok(Math.abs(p.z - (CORNER_Z - HEDGE.outer / 2)) < 1e-9);
});

test('the gateway: on nothing else solid, off the street trees and lamps; under the Emporium', () => {
  const others = [...ESTATE_SOLIDS, ...GARDEN_SOLIDS, ...LAND_SOLIDS];
  for (const g of GATEWAY_SOLIDS) {
    for (const o of others) assert.ok(!overlap(g, o, -1e-6), `the gateway's box on another solid at ${o.slice(0, 2).map((n) => n.toFixed(1))}`);
    for (const t of [...PALMS, ...JACARANDAS]) assert.ok(!overlap(g, [t.x, t.z, t.x, t.z], 0.6), `the gateway on a tree at ${t.x.toFixed(1)}, ${t.z.toFixed(1)}`);
    for (const [x, z] of CREST_LAMPS) assert.ok(!overlap(g, [x, z, x, z], 0.6), `the gateway on a lamp at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    assert.ok(g[4] - SLAB_Y < 4, 'the gateway taller than a gateway');
  }
});

test('the fountain: on the median grass, clear of its junction with the avenue and its palms', () => {
  assert.equal(BASIN.x, GATE_X);
  assert.ok(BASIN.r < MEDIAN_GRASS, 'the basin wider than the median');
  const bank = EW_ROADS[3];
  // (the median stops 0.6 short of the avenue's edge: crestmont3d.ts `inJunction`)
  assert.ok(BASIN.z + BASIN.r < bank.c - bank.half - 0.6 - 0.3, 'the basin in the junction');
  for (const p of PALMS) if (Math.abs(p.x - GATE_X) < 0.5) assert.ok(Math.abs(p.z - BASIN.z) > BASIN.r + 2, `the basin under the median's palm at ${p.z}`);
});

test('the verges: none of their planting on the gateway', () => {
  for (const [i, e] of ESTATES.entries())
    for (const f of ESTATE_GARDENS[i].feats) {
      const r = rectToWorld(e, f.r[0], f.r[1], f.r[2], f.r[3]);
      assert.ok(!GATEWAY_SOLIDS.some((g) => overlap(g, r, 0.2)), `${e.id}'s ${f.kind} on the gateway`);
    }
  assert.ok(onGateway(PYLONS[0].x, PYLONS[0].z));
  assert.ok(!onGateway(GATE_X, BASIN.z - BASIN.r - 1));
});
