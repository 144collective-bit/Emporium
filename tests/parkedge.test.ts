// The walk between Westlake Park and Uptown North's towers (parkedge.ts, docs/blend-plan.md Phase 6e): one granite
// walk over both sidewalks, trees in grates and lamps down its middle, clear of the gates, their walks, the lobbies'
// doors, the square's trees, every lamp and anything solid.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOOR_CLEAR, EDGE_LAMPS, EDGE_TREES, EDGE_X, GATE_CLEAR, GRATE, PROMENADE } from '../src/scripts/city3d/parkedge';
import { GATE_WALKS, NORTH_LAMPS, NORTH_RECT, SQUARE_TREES } from '../src/scripts/city3d/uptownnorth';
import { GATES, GATE_PIERS, PARK_LAMPS, PATHS, X1 } from '../src/scripts/city3d/westlake';
import { HIGHRISES } from '../src/scripts/city3d/highrise';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLAN, onSlab, type Pt } from '../src/scripts/city3d/streetplan';

const inBox = (r: readonly number[], q: Pt, m: number) => q[0] > r[0] - m && q[0] < r[2] + m && q[1] > r[1] - m && q[1] < r[3] + m;
const gates = GATES.filter((g) => g.out[0] === 1 && g.at[1] > PROMENADE[1] && g.at[1] < PROMENADE[3]);
const doors = HIGHRISES.filter((h) => h.block === 'uptown-north' && h.door[0] < NORTH_RECT[0] + 1).map((h) => h.door);

test('the walk lies over both sidewalks, between the park and the towers, clear of the park paths and the granite', () => {
  const [x0, z0, x1, z1] = PROMENADE;
  assert.ok(x0 > X1 && x0 - X1 < 0.05, "it starts a hair inside the park's sidewalk");
  assert.ok(x1 < NORTH_RECT[0] && NORTH_RECT[0] - x1 < 0.05, "it stops just short of Uptown North's lot");
  assert.ok(EDGE_X > x0 && EDGE_X < x1);
  assert.ok(z0 <= NORTH_RECT[1] && z1 >= NORTH_RECT[3]);
  // On the slabs, under nothing solid but the gates' piers (standing on it), and nothing of the park's paths under it
  const piers = new Set(GATE_PIERS.map((b) => b.join()));
  for (let z = z0 + 0.1; z < z1; z += 0.5)
    for (const x of [x0 + 0.01, EDGE_X, x1 - 0.01]) {
      assert.ok(onSlab(PLAN, [x, z]), `${x}, ${z} off the slabs`);
      for (const b of SOLIDS) if (!piers.has(b.join())) assert.ok(!inBox(b, [x, z], 0), `${x}, ${z} in ${b}`);
    }
  for (const p of PATHS) for (const [x] of p.pts) if (Math.abs(x - X1) < 0.01) assert.ok(x < x0, `${p.id} reaches under the walk`);
  for (const w of GATE_WALKS) assert.ok(w[0] > x1, 'the gate walks start past it');
});

test('its lamps and trees stand down the middle, clear of the gates, the doors and each other', () => {
  assert.ok(EDGE_LAMPS.length >= 7, `${EDGE_LAMPS.length} lamps`);
  assert.ok(EDGE_TREES.length >= 8, `${EDGE_TREES.length} trees`);
  const lamps: Pt[] = [...NORTH_LAMPS, ...PARK_LAMPS].map(([x, z]) => [x, z] as Pt);
  for (const [x, z, ry] of EDGE_LAMPS) {
    assert.equal(x, EDGE_X);
    assert.ok(Math.abs(Math.cos(ry) - 1) < 1e-9, 'the arm reaches over the walk to the towers');
    for (const l of lamps) assert.ok(Math.hypot(l[0] - x, l[1] - z) > 4, `${z} by a lamp`);
    for (const b of SOLIDS) assert.ok(!inBox(b, [x, z], 0.3), `${z} in ${b}`);
  }
  const zs = EDGE_LAMPS.map(([, z]) => z).sort((a, b) => a - b);
  for (let i = 1; i < zs.length; i++) assert.ok(zs[i] - zs[i - 1] > 5 && zs[i] - zs[i - 1] < 26, `${zs[i - 1]} to ${zs[i]}`);
  for (const [x, z] of EDGE_TREES) {
    assert.equal(x, EDGE_X);
    for (const b of SOLIDS) assert.ok(!inBox(b, [x, z], GRATE / 2), `${z} in ${b}`);
    for (const t of SQUARE_TREES) assert.ok(Math.hypot(t[0] - x, t[1] - z) > 3, `${z} by the square's tree`);
    for (const l of [...lamps, ...EDGE_LAMPS.map(([lx, lz]) => [lx, lz] as Pt)]) assert.ok(Math.hypot(l[0] - x, l[1] - z) > 2, `${z} by a lamp`);
  }
  for (const [, z] of [...EDGE_LAMPS, ...EDGE_TREES]) {
    for (const g of gates) assert.ok(Math.abs(g.at[1] - z) >= g.half + GATE_CLEAR - 1e-9, `${z} in front of ${g.id}`);
    for (const w of GATE_WALKS) assert.ok(z <= w[1] - 1 || z >= w[3] + 1, `${z} on a gate's walk`);
    for (const d of doors) assert.ok(Math.abs(d[1] - z) >= DOOR_CLEAR - 1e-9, `${z} in front of a lobby`);
  }
});
