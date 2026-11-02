// The Neon Mile's resorts (resorts.ts, docs/strip-plan.md Phase 2): seven made-up resorts on the Strip's two rows,
// each on its own land facing the boulevard, their towers over the Emporium but Wild Ace's, well under every flight;
// their doors at their fronts, the spots you walk in at on the lot facing them, clear of everything solid; Big City's
// rollercoaster clear of its towers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BIG_CITY, COASTER, COASTER_SAMPLES, RESORTS, RESORT_SOLIDS, RESORT_TALLEST, SPHERE_LOT, coasterAt, polyStrips, type Part } from '../src/scripts/city3d/resorts';
import { ROWS, STRIP_BLOCKS, inStrip } from '../src/scripts/city3d/strip';
import { PLAN, distToStreet, onSlab } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import { FLIGHTS, PERIOD, REACH, poseAt } from '../src/scripts/city3d/airfield';

type Rect = [number, number, number, number];
const inside = (a: Rect, b: Rect, m = 0) => a[0] >= b[0] - m && a[1] >= b[1] - m && a[2] <= b[2] + m && a[3] <= b[3] + m;
const overlaps = (a: readonly number[], b: readonly number[]) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
/** The row's lot outline's west edge at z (the Parkway's side) */
const westAt = (row: 'north' | 'south', z: number) => {
  const poly = STRIP_BLOCKS[row === 'north' ? 0 : 1].poly;
  return Math.max(...poly.filter((p) => p[0] < 200 && Math.abs(p[1] - z) < 2.1).map((p) => p[0]));
};

test('seven resorts with made-up names, each on its own land along a row, none overlapping', () => {
  assert.equal(RESORTS.length, 7);
  assert.equal(new Set(RESORTS.map((r) => r.name)).size, 7);
  assert.equal(RESORTS.filter((r) => r.row === 'north').length, 4);
  for (const r of RESORTS) {
    const [z0, z1] = ROWS[r.row];
    assert.ok(Math.abs(r.land[1] - z0) < 1e-6 && Math.abs(r.land[3] - z1) < 1e-6, `${r.id} the row's depth`);
    assert.ok(r.x0 > westAt(r.row, z0) && r.x0 > westAt(r.row, z1) && r.x1 <= 249.1 + 1e-6, `${r.id} on its row`);
    assert.equal(r.face, r.row === 'north' ? 1 : -1);
    for (const p of r.parts) assert.ok(inside(p.rect, r.land, 0.01), `${r.id}'s part ${p.rect} off its land`);
    for (const w of r.water) assert.ok(inside(w, r.land), `${r.id}'s water`);
    assert.ok(inside(r.pylon.rect, r.land) && inside(r.porte.rect, r.land));
  }
  const lands = [...RESORTS.map((r) => r.land), SPHERE_LOT];
  lands.forEach((a, i) => lands.forEach((b, j) => i < j && assert.ok(!overlaps(a, b), `lands ${i} and ${j} overlap`)));
  assert.ok(inside(SPHERE_LOT, [0, ROWS.south[0], 249.1, ROWS.south[1]]));
});

test('their towers rise over the Emporium, but Wild Ace by the welcome sign; Orbit the tallest', () => {
  for (const r of RESORTS) {
    const tower = Math.max(...r.parts.map((p) => p.y1));
    if (r.id === 'wildace') assert.ok(r.top < EMPORIUM_ROOF - 0.5 && tower < EMPORIUM_ROOF - 0.5, `Wild Ace at ${r.top}`);
    else assert.ok(tower >= 20 && tower <= 38.6, `${r.id}'s tower at ${tower}`);
    assert.ok(r.top >= tower && r.top >= r.pylon.h, `${r.id}'s top`);
    // (the hotel floors: 20 to 35)
    for (const p of r.parts) if (p.windows) assert.ok(p.y1 <= 35, `${r.id}'s floors to ${p.y1}`);
  }
  assert.equal(RESORT_TALLEST, RESORTS.find((r) => r.id === 'orbit')!.top);
  assert.ok(RESORTS.every((r) => r.id === 'orbit' || r.top < RESORT_TALLEST - 5));
});

test('well under every flight', () => {
  for (let t = 0; t < PERIOD; t += 0.25)
    for (const f of FLIGHTS) {
      const p = poseAt(f, t);
      for (const r of RESORTS) {
        const [x0, z0, x1, z1] = r.land;
        const d = Math.hypot(Math.max(x0 - p.x, 0, p.x - x1), Math.max(z0 - p.z, 0, p.z - z1));
        if (d < REACH[f.kind] + 4) assert.ok(p.y > r.top + 4, `${f.id} at ${p.y.toFixed(1)} over ${r.id} at t ${t}`);
      }
    }
});

test('the doors at the fronts, the spots you walk in at on the lot facing them, clear of everything solid', () => {
  for (const r of RESORTS) {
    const { door, spawn } = r;
    assert.ok(onSlab(PLAN, [spawn.x, spawn.z]) && inStrip(spawn.x, spawn.z), `${r.id}'s spawn`);
    for (const b of SOLIDS) {
      assert.ok(!(spawn.x > b[0] - 0.4 && spawn.x < b[2] + 0.4 && spawn.z > b[1] - 0.4 && spawn.z < b[3] + 0.4), `${r.id}'s spawn in ${b}`);
      assert.ok(!(door.x > b[0] && door.x < b[2] && door.z > b[1] && door.z < b[3]), `${r.id}'s door in ${b}`);
    }
    // Facing the door, a few steps from it, on the boulevard's side of it
    const [fx, fz] = [-Math.sin(spawn.yaw), -Math.cos(spawn.yaw)];
    const [dx, dz] = [door.x - spawn.x, door.z - spawn.z];
    const dist = Math.hypot(dx, dz);
    assert.ok(dist > 1.5 && dist < 6, `${r.id}'s spawn ${dist.toFixed(1)} from the door`);
    assert.ok((fx * dx + fz * dz) / dist > 0.85, `${r.id}'s spawn faces the door`);
    assert.ok(Math.sign(spawn.z - door.z) === r.face, `${r.id}'s spawn in front`);
    // The door a hair outside a building's face
    const face = r.parts.some((p) => p.solid !== false && door.x > p.rect[0] && door.x < p.rect[2] && Math.abs((r.face > 0 ? p.rect[3] : p.rect[1]) - door.z) < 1.0);
    assert.ok(face || r.id === 'scarab', `${r.id}'s door off its front`);
  }
});

test('everything solid on the lots, off the streets', () => {
  const roads = PLAN.streets.filter((s) => s.kind !== 'alley');
  for (const b of RESORT_SOLIDS) {
    assert.ok(b[4] > 0.3, `${b} too low`);
    for (const q of [
      [b[0], b[1]],
      [b[2], b[3]],
      [b[0], b[3]],
      [b[2], b[1]],
    ] as [number, number][]) {
      assert.ok(inStrip(q[0], q[1]), `${b} off the Strip`);
      for (const s of roads) assert.ok(distToStreet(s, q) > s.half + 0.6, `${b} on ${s.id}`);
    }
  }
  for (const b of RESORT_SOLIDS) assert.ok(SOLIDS.includes(b), 'in SOLIDS');
});

test('a convex outline as strips covers it', () => {
  const poly: [number, number][] = [
    [0, 0],
    [0, 4],
    [3, 5],
    [4, 1],
  ];
  const strips = polyStrips(poly, 3);
  assert.ok(strips.length >= 4);
  for (const [x, z] of poly) assert.ok(strips.some((b) => x >= b[0] - 1e-9 && x <= b[2] + 1e-9 && z >= b[1] - 1e-9 && z <= b[3] + 1e-9));
  assert.ok(strips.every((b) => b[4] === 3 && b[2] - b[0] <= 1 + 1e-9));
});

test("Big City's rollercoaster: round the cluster on its land, clear of its towers, over its podium", () => {
  const big = RESORTS.find((r) => r.id === 'bigcity')!;
  const towers = big.parts.filter((p: Part) => p.windows);
  const podium = big.parts[0];
  for (let k = 0; k < COASTER_SAMPLES; k++) {
    const [x, y, z] = coasterAt(k / COASTER_SAMPLES);
    assert.ok(x > big.land[0] + 0.4 && x < big.land[2] - 0.4 && z > big.land[1] + 0.3 && z < big.land[3] - 0.3, `the track off its land at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    assert.ok(y > 6, `the track low at ${y.toFixed(1)}`);
    for (const p of towers) {
      const d = Math.hypot(Math.max(p.rect[0] - x, 0, x - p.rect[2]), Math.max(p.rect[1] - z, 0, z - p.rect[3]));
      assert.ok(d > 0.7 || y > p.y1 + 1, `the track by a tower at ${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`);
    }
    if (x > podium.rect[0] && x < podium.rect[2] && z > podium.rect[1] && z < podium.rect[3]) assert.ok(y > podium.y1 + 1.6, 'over the podium');
  }
  assert.ok(COASTER.length > 10);
  // (and under its own tall tower's spire)
  assert.ok(Math.max(...COASTER.map((p) => p[1])) < BIG_CITY.spire.y0);
});
