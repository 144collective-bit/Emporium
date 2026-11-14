// The south's rolling ground (southground.ts, docs/south-plan.md Phase 1c, the owner's calls): rolling under everything
// in Endswood and its new land, today's ground wherever the south meets what's built and fixed (the ring road's edge, the
// south avenue and east of it, Lot 9, the tunnel's mouth, Degen's plot), the village's hill about two storeys with St
// Aldwyn's on top, the roads on beds held to a gentle grade and level across, clear of the brook at the bridge, no step
// anywhere.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BRIDGE_CLEAR, GRADE, HILL_H, ROAD_BEDS, SOUTH_GROUND_RECT, VALLEY, landAt, southHeightAt } from '../src/scripts/city3d/southground';
import { BRIDGES, CHURCHYARD, COMPOUND, EDGE_Z, FOOTPATHS, LOT9_EDGE, SOUTH_CROSSINGS, SOUTH_STREETS, type Pt } from '../src/scripts/city3d/south';
import { distTo, inside } from '../src/scripts/city3d/streetfaces';

const near = (p: Pt, q: Pt) => Math.abs(p[0] - q[0]) < 1e-4 && Math.abs(p[1] - q[1]) < 1e-4;

test("today's ground wherever the south meets what's fixed", () => {
  // (outside its land, east of the south avenue, along the ring road's edge)
  for (const [x, z] of [[-500, 450], [-4.5, 400], [30, 420], [-60, EDGE_Z + 1], [-200, EDGE_Z + 2], [-300, 700]] as Pt[]) assert.equal(southHeightAt(x, z), 0, `${x}, ${z}`);
  for (let z = SOUTH_GROUND_RECT[1]; z < SOUTH_GROUND_RECT[3]; z += 3) assert.ok(Math.abs(southHeightAt(-12, z)) < 1e-9, `by the south avenue at ${z}`);
  // (Lot 9, inside its fence and along it)
  for (let x = -130; x < -18; x += 3) for (let z = 468; z < 622; z += 3) if (inside(LOT9_EDGE, [x, z]) || distTo(LOT9_EDGE, [x, z], true) < 2) assert.ok(Math.abs(southHeightAt(x, z)) < 1e-9, `Lot 9 at ${x}, ${z}`);
  // (Degen's plot, level all over, and the tunnel's mouth)
  const [x0, z0, x1, z1] = COMPOUND;
  for (let x = x0; x <= x1; x += 1) for (let z = z0; z <= z1; z += 1) assert.ok(Math.abs(southHeightAt(x, z)) < 1e-9, `the compound at ${x}, ${z}`);
  assert.ok(Math.abs(southHeightAt(-112, 337)) < 1e-9 && Math.abs(southHeightAt(-109.5, 345)) < 0.05, "the tunnel's mouth");
});

test("the village's hill: about two storeys, St Aldwyn's on its top", () => {
  const c: Pt = [CHURCHYARD.reduce((s, p) => s + p[0], 0) / CHURCHYARD.length, CHURCHYARD.reduce((s, p) => s + p[1], 0) / CHURCHYARD.length];
  assert.ok(Math.abs(southHeightAt(c[0], c[1]) - HILL_H) < 0.25, `the churchyard at ${southHeightAt(c[0], c[1])}`);
  assert.ok(HILL_H >= 2 && HILL_H <= 3, 'about two storeys');
  // (nothing in the south higher than the hill's top)
  for (let x = -440; x < 0; x += 4) for (let z = 330; z < 640; z += 4) assert.ok(southHeightAt(x, z) <= HILL_H + 0.05, `over the hill at ${x}, ${z}`);
  // (and it falls away from the church every way)
  for (const a of [0, 1, 2, 3, 4, 5]) {
    const [dx, dz] = [Math.cos(a), Math.sin(a)];
    assert.ok(landAt(c[0] + dx * 45, c[1] + dz * 45) < landAt(c[0] + dx * 10, c[1] + dz * 10), `the hill falls away at ${a}`);
  }
});

test('the roads: held to a gentle grade along, level across, meeting at the same height', () => {
  for (const b of ROAD_BEDS)
    for (let i = 1; i < b.pts.length; i++) {
      const l = Math.hypot(b.pts[i][0] - b.pts[i - 1][0], b.pts[i][1] - b.pts[i - 1][1]) || 1;
      assert.ok(Math.abs(b.y[i] - b.y[i - 1]) / l <= GRADE + 1e-6, `${b.street} climbs ${(Math.abs(b.y[i] - b.y[i - 1]) / l).toFixed(3)} at ${b.pts[i]}`);
    }
  for (const c of SOUTH_CROSSINGS) {
    const ys = ROAD_BEDS.flatMap((b) => b.pts.map((p, i) => (near(p, c.at) ? b.y[i] : null)).filter((y): y is number => y !== null));
    assert.ok(Math.max(...ys) - Math.min(...ys) < 1e-6, `${c.id}'s streets meet at different heights`);
  }
  // (the ground on a road is its bed, the same across it)
  for (const b of ROAD_BEDS)
    for (let i = 2; i < b.pts.length - 2; i += 5) {
      const [p, q] = [b.pts[i - 1], b.pts[i + 1]];
      const l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      const [nx, nz] = [-(q[1] - p[1]) / l, (q[0] - p[0]) / l];
      for (const k of [-1, 0, 1]) {
        const [x, z] = [b.pts[i][0] + nx * k * b.half * 0.9, b.pts[i][1] + nz * k * b.half * 0.9];
        // (where another street's bed crosses close by, the two blend: skip near crossings)
        if (SOUTH_CROSSINGS.some((c) => Math.hypot(c.at[0] - x, c.at[1] - z) < 12)) continue;
        assert.ok(Math.abs(southHeightAt(x, z) - b.y[i]) < 0.03, `${b.street} not level across at ${x.toFixed(1)}, ${z.toFixed(1)}: ${southHeightAt(x, z).toFixed(3)} against ${b.y[i].toFixed(3)}`);
      }
    }
});

test('the bridge: its deck clear of the brook', () => {
  assert.ok(BRIDGES.length > 0);
  for (const b of BRIDGES) assert.ok(southHeightAt(b.at[0], b.at[1]) >= -VALLEY.depth + BRIDGE_CLEAR - 1e-6, `the bridge at ${southHeightAt(b.at[0], b.at[1])}`);
});

test('no step anywhere, and nowhere too steep to walk', () => {
  const [x0, z0, x1, z1] = SOUTH_GROUND_RECT;
  for (let x = x0 + 0.25; x < x1; x += 2.3)
    for (let z = z0 + 0.25; z < z1; z += 2.9) {
      const h = southHeightAt(x, z);
      const gx = Math.abs(southHeightAt(x + 0.5, z) - h) / 0.5;
      const gz = Math.abs(southHeightAt(x, z + 0.5) - h) / 0.5;
      assert.ok(Math.max(gx, gz) < 0.32, `a step at ${x.toFixed(1)}, ${z.toFixed(1)}: ${Math.max(gx, gz).toFixed(2)}`);
    }
  // (the footpaths a gentle walk)
  for (const f of FOOTPATHS) {
    const [a, b] = f.pts;
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
    for (let k = 1; k < n; k++) {
      const p: Pt = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n];
      const q: Pt = [a[0] + ((b[0] - a[0]) * (k - 1)) / n, a[1] + ((b[1] - a[1]) * (k - 1)) / n];
      const l = Math.hypot(p[0] - q[0], p[1] - q[1]);
      assert.ok(Math.abs(southHeightAt(p[0], p[1]) - southHeightAt(q[0], q[1])) / l < 0.2, `${f.id} too steep`);
    }
  }
  // (every street's a bed: none left out)
  assert.equal(ROAD_BEDS.length, SOUTH_STREETS.length);
});
