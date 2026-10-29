// The Docks (docks.ts, docs/docks-plan.md Phase 1): the streets off the south bank avenue west of the highway with
// traffic, the blocks round the basin, the basin open to the river under the avenue's bridge and clear of the boats'
// lanes, the frontage a straight quay, walking and driving stopped at the water, the trees kept off, all well inside
// the world at both sizes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AVENUE_KERB,
  BASIN,
  BASIN_WALLS,
  CHANNEL,
  DOCKS_QUAY,
  DOCKS_RECT,
  DOCK_BLOCKS,
  DOCK_BRIDGE,
  DOCK_CROSSINGS,
  DOCK_LAMPS,
  DOCK_STREETS,
  OPEN_WATER,
  inBasin,
  inDocks,
  onDockBridge,
} from '../src/scripts/city3d/docks';
import { PLAN, distToStreet, inPoly, onSlab } from '../src/scripts/city3d/streetplan';
import { EXT, RIVER, SOUTH_ROAD, WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { HIGHWAY_HALF, fromHighway } from '../src/scripts/city3d/highway';
import { ROUTES, pointOn } from '../src/scripts/city3d/routes';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { treeSpot } from '../src/scripts/city3d/outskirts';
import { edgesAt, laneAt, pullAt } from '../src/scripts/city3d/river';
import { BOAT_LANES } from '../src/scripts/city3d/liberty';
import { TRENCH_RECT } from '../src/scripts/city3d/trenches';

type Pt = [number, number];

test('the docks are well inside the world, off the highway and The Trenches', () => {
  const [x0, z0, x1, z1] = DOCKS_RECT;
  assert.ok(x0 > WORLD_BOUNDS[0] + 10 && x1 < WORLD_BOUNDS[2] && z1 < WORLD_BOUNDS[3], `inside the world (${EXT})`);
  assert.equal(z0, RIVER[1]);
  assert.ok(x1 < TRENCH_RECT[0], 'west of The Trenches');
  for (let x = x0; x <= x1; x += 2) for (let z = z0; z <= z1; z += 2) assert.ok(fromHighway(x, z) > HIGHWAY_HALF + 1, `on the highway at ${x}, ${z}`);
});

test('the streets join the plan, the ring off the avenue, lit where it meets it', () => {
  for (const s of DOCK_STREETS) assert.ok(PLAN.streets.some((q) => q.id === s.id), s.id);
  for (const c of DOCK_CROSSINGS) {
    const p = PLAN.crossings.find((q) => q.id === c.id)!;
    assert.ok(p, c.id);
    // Each crossing is on every street it names
    for (const id of p.streets) assert.ok(distToStreet(PLAN.streets.find((s) => s.id === id)!, p.at) < 1e-6, `${c.id} off ${id}`);
  }
  assert.ok(DOCK_CROSSINGS.filter((c) => c.streets.includes('ew4')).every((c) => c.lights && c.at[1] === SOUTH_ROAD));
  // The highway's junction with the avenue on its west side: a slip lane on its south-west corner only (the
  // north-west one would be on the river)
  const slips = PLAN.streets.filter((s) => s.id.startsWith('slip-highway-ew4-1-')).map((s) => s.id);
  assert.ok(slips.includes('slip-highway-ew4-1-0'));
  assert.ok(!slips.includes('slip-highway-ew4-1-2'));
  const sw = PLAN.streets.find((s) => s.id === 'slip-highway-ew4-1-0')!;
  assert.ok(sw.pts.every((p) => p[0] < -215 && p[1] > SOUTH_ROAD));
});

test('traffic drives every docks street', () => {
  const on = (s: (typeof PLAN.streets)[number]) =>
    ROUTES.some((route) => {
      for (let d = 0; d < route.len; d += 2) {
        const q = pointOn(route, d, 0).at;
        if (inDocks(q[0], q[1], -2) && distToStreet(s, q) < s.half) return true;
      }
      return false;
    });
  for (const s of DOCK_STREETS) assert.ok(on(PLAN.streets.find((q) => q.id === s.id)!), `no traffic on ${s.id}`);
});

test('the blocks: on no street, none over another, none over the water', () => {
  const slabs = PLAN.blocks.map((b, i) => ({ b, slab: PLAN.slabs[i] })).filter(({ b }) => b.ref === 'docks');
  assert.equal(slabs.length, DOCK_BLOCKS.length);
  const streets = PLAN.streets.filter((s) => s.kind !== 'alley');
  const [x0, z0, x1, z1] = DOCKS_RECT;
  for (let x = x0; x <= x1; x += 0.7)
    for (let z = z0; z <= z1; z += 0.7) {
      const under = slabs.filter(({ slab }) => inPoly(slab, [x, z]));
      // (a point on the line between two slabs counts as in both: only the insides must not overlap)
      if (under.length > 1) assert.ok(under.every(({ slab }) => slab.some((p, i) => onLine(p, slab[(i + 1) % slab.length], [x, z]))), `${under.map((u) => u.b.id)} overlap at ${x}, ${z}`);
      if (!under.length) continue;
      for (const s of streets) assert.ok(distToStreet(s, [x, z]) > s.half - 0.01, `${under[0].b.id} on ${s.id} at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      assert.ok(!inBasin(x, z, 0.01), `${under[0].b.id} over the water at ${x}, ${z}`);
    }
  // The quays reach the water's edge: just off it, on a slab
  const [bx0, bz0, bx1, bz1] = BASIN;
  for (const p of [
    [bx0 - 0.1, (bz0 + bz1) / 2],
    [bx1 + 0.1, (bz0 + bz1) / 2],
    [(bx0 + bx1) / 2, bz1 + 0.1],
    [CHANNEL[0] - 0.1, 145],
    [CHANNEL[2] + 0.1, 145],
  ] as Pt[])
    assert.ok(onSlab(PLAN, p), `no quay at ${p}`);
});

/** Is p on the segment a-b (within a hair) */
function onLine(a: Pt, b: Pt, p: Pt) {
  const [dx, dz] = [b[0] - a[0], b[1] - a[1]];
  const l = Math.hypot(dx, dz);
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (l * l);
  return t >= -1e-6 && t <= 1 + 1e-6 && Math.abs((p[0] - a[0]) * dz - (p[1] - a[1]) * dx) / l < 0.36;
}

test('the basin opens onto the river under the avenue, the frontage a straight quay', () => {
  assert.equal(CHANNEL[1], RIVER[1]);
  assert.equal(CHANNEL[3], BASIN[1]);
  assert.ok(CHANNEL[0] > BASIN[0] && CHANNEL[2] < BASIN[2]);
  // The bridge carries the avenue and the promenade over the mouth, its sidewalk to the quays' edge
  assert.ok(DOCK_BRIDGE[1] === RIVER[1] && DOCK_BRIDGE[3] > AVENUE_KERB);
  assert.ok(onDockBridge((CHANNEL[0] + CHANNEL[2]) / 2, SOUTH_ROAD) && !inBasin((CHANNEL[0] + CHANNEL[2]) / 2, SOUTH_ROAD));
  assert.ok(inBasin((CHANNEL[0] + CHANNEL[2]) / 2, DOCK_BRIDGE[3] + 1));
  for (let x = DOCKS_QUAY[0]; x <= DOCKS_QUAY[1]; x += 1) assert.equal(pullAt('south', x), 0, `the south bank pulls back at ${x}`);
  // The south boat lane passes the mouth well out in the river
  for (let x = CHANNEL[0]; x <= CHANNEL[2]; x += 1) assert.ok(laneAt(BOAT_LANES[2], x) < RIVER[1] - 6 && edgesAt(x)[1] === RIVER[1]);
});

test('walking and driving stop at the water; nothing solid in it', () => {
  // The walls cover the open water exactly
  assert.deepEqual(
    BASIN_WALLS.map((w) => w.slice(0, 4)),
    OPEN_WATER.map((r) => [...r])
  );
  for (const [x, z] of [
    [(BASIN[0] + BASIN[2]) / 2, (BASIN[1] + BASIN[3]) / 2],
    [(CHANNEL[0] + CHANNEL[2]) / 2, (DOCK_BRIDGE[3] + CHANNEL[3]) / 2],
  ])
    assert.ok(inBasin(x, z, 1));
  for (const b of SOLIDS) for (const r of OPEN_WATER) assert.ok(b[2] <= r[0] || b[0] >= r[2] || b[3] <= r[1] || b[1] >= r[3], `a solid in the basin: ${b}`);
});

test('lamps stand on the sidewalks, off the streets; no trees on the docks', () => {
  for (const [x, z] of DOCK_LAMPS) {
    assert.ok(onSlab(PLAN, [x, z]), `a lamp off the sidewalk at ${x}, ${z}`);
    for (const s of PLAN.streets) if (s.kind !== 'alley') assert.ok(distToStreet(s, [x, z]) > s.half + 0.2, `a lamp on ${s.id} at ${x}, ${z}`);
    assert.ok(!inBasin(x, z, -0.5));
  }
  const [x0, z0, x1, z1] = DOCKS_RECT;
  for (let x = x0; x <= x1; x += 3) for (let z = z0; z <= z1; z += 3) assert.ok(!treeSpot(x, z), `a tree at ${x}, ${z}`);
});
