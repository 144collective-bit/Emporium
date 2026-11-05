// The Neon Mile (strip.ts, docs/strip-plan.md Phase 1): the boulevard from the Parkway to the east road with its
// planted median, downtown's two small streets stopping at the Parkway and starting again past the Strip (the
// highway's junctions and Crestmont's streets as they were), the lots either side, traffic down the boulevard, its
// lamps on the sidewalks, all well inside the world at both sizes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BLVD_WEST, STRIP_BLOCKS, STRIP_CROSSINGS, STRIP_LAMPS, STRIP_RECT, STRIP_STREETS, STRIP_WALK, inStrip, parkwayX } from '../src/scripts/city3d/strip';
import { PLAN, distToStreet, onSlab, RING_MEETS } from '../src/scripts/city3d/streetplan';
import { EW_ROADS, LANE, STRIP_BLVD, STRIP_EAST_X, STRIP_GAP, WORLD_BOUNDS, ewRuns, ewStreet } from '../src/scripts/city3d/layout';
import { HIGHWAY_HALF, fromHighway } from '../src/scripts/city3d/highway';
import { ROUTES, pointOn } from '../src/scripts/city3d/routes';
import { CREST_CROSSINGS } from '../src/scripts/city3d/crestmont';
import { treeSpot } from '../src/scripts/city3d/outskirts';

const street = (id: string) => PLAN.streets.find((s) => s.id === id)!;

test('the Strip is well inside the world, clear of the highway', () => {
  const [x0, z0, x1, z1] = STRIP_RECT;
  assert.ok(x0 > WORLD_BOUNDS[0] && x1 < WORLD_BOUNDS[2] && z0 > WORLD_BOUNDS[1] && z1 < WORLD_BOUNDS[3]);
  for (const s of STRIP_STREETS)
    for (const p of s.pts) assert.ok(fromHighway(...p) > HIGHWAY_HALF + s.half + 4, `${s.id} by the highway at ${p}`);
});

test('the small streets stop at the Parkway and start again at the east road; the highway and Crestmont keep theirs', () => {
  for (const i of Object.keys(STRIP_GAP).map(Number)) {
    const r = EW_ROADS[i];
    const west = street(`ew${i}`);
    const east = street(`ew${i}e`);
    assert.ok(Math.abs(west.pts[1][0] - parkwayX(r.c)) < 0.01, `ew${i} ends on the Parkway's line`);
    assert.ok(Math.abs(STRIP_GAP[i][0] - parkwayX(r.c)) < 0.01, `STRIP_GAP[${i}] is the Parkway's crossing`);
    assert.equal(east.pts[0][0], STRIP_EAST_X);
    assert.ok(PLAN.crossings.some((c) => c.streets.includes(`ew${i}`) && c.streets.includes('parkway') && Math.abs(c.at[0] - west.pts[1][0]) < 1e-6));
    assert.ok(PLAN.crossings.some((c) => c.streets.includes(`ew${i}e`) && c.streets.includes('strip-east')));
    // The east piece passes under the raised highway (streetplan.ts RING_MEETS), and Crestmont's crossings are its
    assert.ok(RING_MEETS.some((m) => m.id === `highway-ew${i}-0` && m.street === `ew${i}e`));
    for (const c of CREST_CROSSINGS) if (c.at[1] === r.c) assert.ok(c.streets.includes(`ew${i}e`), c.id);
    // Not across the Strip
    for (let x = 130; x < STRIP_EAST_X - 1; x += 5) assert.ok(!ewRuns(i, x) && distToStreet(west, [x, r.c]) > 5 && distToStreet(east, [x, r.c]) > 0.5);
    assert.equal(ewStreet(i, 0), `ew${i}`);
    assert.equal(ewStreet(i, 300), `ew${i}e`);
  }
});

test('the boulevard runs from the Parkway to the east road, two lanes each way round a planted median, lit at both ends', () => {
  const b = street('strip-blvd');
  assert.equal(b.kind, 'avenue');
  assert.equal(b.lanes, 2);
  assert.equal(b.median, STRIP_BLVD.median);
  assert.ok(Math.abs(b.half - (STRIP_BLVD.median / 2 + 2 * LANE)) < 1e-9);
  assert.ok(Math.abs(b.pts[0][0] - BLVD_WEST) < 1e-9 && b.pts[1][0] === STRIP_EAST_X);
  for (const c of STRIP_CROSSINGS) {
    const p = PLAN.crossings.find((q) => q.id === c.id)!;
    assert.ok(p, c.id);
    for (const id of p.streets) assert.ok(distToStreet(street(id), p.at) < 1e-6, `${c.id} off ${id}`);
  }
  assert.ok(['strip-parkway', 'strip-east-blvd', 'strip-east-ew0', 'strip-east-ew3'].every((id) => STRIP_CROSSINGS.find((c) => c.id === id)!.lights));
});

test('the lots: either side of the boulevard, off every street, a wide sidewalk round them', () => {
  const slabs = PLAN.blocks.map((b, i) => ({ b, slab: PLAN.slabs[i] })).filter(({ b }) => b.ref === 'strip');
  assert.equal(slabs.length, STRIP_BLOCKS.length);
  for (const { b } of slabs) assert.equal(b.walk, STRIP_WALK);
  const roads = PLAN.streets.filter((s) => s.kind !== 'alley');
  for (const { b } of slabs) for (const q of b.poly) for (const s of roads) assert.ok(distToStreet(s, q) >= s.half + b.walk - 1e-6, `${b.id} corner ${q} on ${s.id}`);
  // Deep enough for the resorts (Phase 2): about 23 each, and long
  for (const { b } of slabs) {
    const zs = b.poly.map((p) => p[1]);
    const xs = b.poly.map((p) => p[0]);
    assert.ok(Math.max(...zs) - Math.min(...zs) > 21, `${b.id} deep enough`);
    assert.ok(Math.max(...xs) - Math.min(...xs) > 120, `${b.id} long enough`);
  }
  // Both sides of the boulevard are sidewalk; its middle is not
  assert.ok(onSlab(PLAN, [190, STRIP_BLVD.z - STRIP_BLVD.half - 0.3]) && onSlab(PLAN, [190, STRIP_BLVD.z + STRIP_BLVD.half + 0.3]));
  assert.ok(!onSlab(PLAN, [190, STRIP_BLVD.z]));
});

test('traffic drives the boulevard both ways and the east road', () => {
  for (const id of ['strip-blvd', 'strip-east']) {
    const s = street(id);
    for (const way of [1, -1]) {
      const on = ROUTES.some((route) => {
        for (let d = 0; d < route.len; d += 2) {
          const { at, dir } = pointOn(route, d, 0);
          if (inStrip(at[0], at[1], -3) && distToStreet(s, at) < s.half) {
            const along = id === 'strip-blvd' ? dir[0] : dir[1];
            if (Math.sign(along) === way) return true;
          }
        }
        return false;
      });
      assert.ok(on, `no traffic along ${id} going ${way}`);
    }
  }
});

test('lamps stand on the sidewalks, off the streets; no trees on the Strip', () => {
  assert.ok(STRIP_LAMPS.length > 20);
  for (const [x, z] of STRIP_LAMPS) {
    assert.ok(onSlab(PLAN, [x, z]), `a lamp off the sidewalk at ${x}, ${z}`);
    for (const s of PLAN.streets) if (s.kind !== 'alley') assert.ok(distToStreet(s, [x, z]) > s.half + 0.2, `a lamp on ${s.id} at ${x}, ${z}`);
  }
  const [x0, z0, x1, z1] = STRIP_RECT;
  for (let x = x0 + 3; x <= x1; x += 3) for (let z = z0; z <= z1; z += 3) assert.ok(!treeSpot(x, z), `a tree at ${x}, ${z}`);
});
