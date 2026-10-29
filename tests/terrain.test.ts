// Crestmont's hills (terrain.ts, docs/crestmont-plan.md Phase 1): the first ground that isn't flat. Nothing
// that stands in the city moves: the ground is 0 everywhere outside the hills' land, under every street, block,
// solid and place. The hills rise gently to 45-60 m (the owner's call), smooth enough to walk and drive, fall
// away before the skyline ring, and every aircraft flies well over them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HILLS, TERRAIN_RECT, heightAt, hillsAlong, naturalAt, onHills, slopeAt, type Level } from '../src/scripts/city3d/terrain';
import { HILL_ROADS } from '../src/scripts/city3d/crestmont';
import { PLAN } from '../src/scripts/city3d/streetplan';
import { SOLIDS, rayBoxes } from '../src/scripts/city3d/solids';
import { PLACES } from '../src/scripts/city3d/places';
import { EXT } from '../src/scripts/city3d/layout';
import { SKYLINE } from '../src/scripts/city3d/bounds';
import { KART_PARK } from '../src/scripts/city3d/kartpark';
import { HIGHWAY, HIGHWAY_HALF } from '../src/scripts/city3d/highway';
import { AIRSIDE, FLIGHTS, PERIOD, poseAt } from '../src/scripts/city3d/airfield';
import { MANSION_SOLIDS } from '../src/scripts/city3d/mansions';

const TILE_M = 1.8;
const grid = (step: number, f: (x: number, z: number) => void) => {
  for (let x = TERRAIN_RECT[0] - 4; x <= TERRAIN_RECT[2] + 4; x += step) for (let z = TERRAIN_RECT[1] - 4; z <= TERRAIN_RECT[3] + 4; z += step) f(x, z);
};

test('flat everywhere but the hills: 0 outside their land, and under every street, block, solid (but the mansions) and place', () => {
  for (const [x, z] of [
    [0, 0],
    [-300, -300],
    [TERRAIN_RECT[0] - 0.01, -200],
    [400, TERRAIN_RECT[3] + 0.01],
    [400, 200],
  ])
    assert.equal(heightAt(x, z), 0, `the ground rises at ${x}, ${z}`);
  // Every street of the plan, along its centre line and out to its edges, and every block's outline
  // (but the hill roads, which climb the hills on their beds: crestmont.ts, tests/crestmont.test.ts)
  for (const s of PLAN.streets.filter((s) => !HILL_ROADS.some((r) => r.id === s.id)))
    for (let i = 0; i + 1 < s.pts.length; i++) {
      const [a, b] = [s.pts[i], s.pts[i + 1]];
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
      for (let k = 0; k <= n; k++) {
        const x = a[0] + ((b[0] - a[0]) * k) / n;
        const z = a[1] + ((b[1] - a[1]) * k) / n;
        for (const [dx, dz] of [
          [0, 0],
          [s.half + 1, 0],
          [-s.half - 1, 0],
          [0, s.half + 1],
          [0, -s.half - 1],
        ])
          assert.equal(heightAt(x + dx, z + dz), 0, `${s.id} rises at ${(x + dx).toFixed(0)}, ${(z + dz).toFixed(0)}`);
      }
    }
  for (const blk of PLAN.blocks) for (const [x, z] of blk.poly) assert.equal(heightAt(x, z), 0, `block ${blk.id}`);
  // The ring highway with its verges, the kart park, everything solid, every place you arrive at
  for (const [x, z] of HIGHWAY) assert.equal(heightAt(x + HIGHWAY_HALF + 4, z) + heightAt(x - HIGHWAY_HALF - 4, z), 0);
  for (const [x, z] of [
    [KART_PARK.x0, KART_PARK.z0],
    [KART_PARK.x1, KART_PARK.z0],
    [KART_PARK.x1, KART_PARK.z1],
  ])
    assert.equal(heightAt(x, z), 0);
  // (but the hills' mansions, which stand on their pads up there: tests/mansions.test.ts)
  for (const b of SOLIDS.filter((b) => !MANSION_SOLIDS.includes(b))) for (const [x, z] of [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]]) assert.equal(heightAt(x, z), 0, `a solid at ${x}, ${z} is on the hills`);
  for (const p of PLACES) assert.equal(heightAt(p.at.x, p.at.z), 0, `${p.id} is on the hills`);
});

test("gentle hills to 45-60 m (the owner's call), never under the ground, smooth enough to walk and drive", () => {
  let top = 0;
  let steep = 0;
  let banks = 0;
  grid(1, (x, z) => {
    const h = heightAt(x, z);
    assert.ok(h >= 0 && Number.isFinite(h), `the ground at ${x}, ${z}`);
    top = Math.max(top, h);
    // The hills' own slopes, and where the roads are cut in, their banks (steeper: Phase 3's retaining walls)
    const e = 0.25;
    steep = Math.max(steep, Math.hypot(naturalAt(x + e, z) - naturalAt(x - e, z), naturalAt(x, z + e) - naturalAt(x, z - e)) / (2 * e));
    banks = Math.max(banks, slopeAt(x, z));
    // No steps: within half a tile the ground never moves more than the steepest bank allows
    assert.ok(Math.abs(heightAt(x + 0.5, z) - h) < 0.8 && Math.abs(heightAt(x, z + 0.5) - h) < 0.8, `a step at ${x}, ${z}`);
  });
  assert.ok(top * TILE_M >= 45 && top * TILE_M <= 62, `the ridge is ${(top * TILE_M).toFixed(0)} m`);
  assert.ok(steep < 0.75, `a slope of ${steep.toFixed(2)}`);
  assert.ok(banks < 1.5, `a bank of ${banks.toFixed(2)}`);
  // It rises from its foot: low by the Flats, high at the ridge
  assert.ok(heightAt(HILLS.foot.x + 5, HILLS.foot.z - 5) < 1);
  assert.ok(heightAt(380, -320) > 20);
});

test('they fall away before the skyline ring, at both sizes of the world', () => {
  // The skyline's towers stand SKYLINE.gap past the edge: the ground under them is all but level there
  for (let z = TERRAIN_RECT[1]; z <= TERRAIN_RECT[3]; z += 2) assert.ok(heightAt(EXT[1] + SKYLINE.gap, z) < 3, `the skyline's ground at ${z}`);
  for (let x = TERRAIN_RECT[0]; x <= TERRAIN_RECT[2]; x += 2) assert.ok(heightAt(x, EXT[0] - SKYLINE.gap) < 3);
  // Written in fixed numbers: nothing past the hills' own end, however far out the edge is
  assert.equal(heightAt(HILLS.end.x + 1, -200), 0);
  assert.equal(heightAt(400, HILLS.end.z - 1), 0);
});

test('a level holds its ground flat and eases back into the slope round it', () => {
  const pad: Level = { rect: [360, -260, 372, -248], y: 18, ease: 8 };
  for (let x = 360; x <= 372; x += 1) for (let z = -260; z <= -248; z += 1) assert.ok(Math.abs(heightAt(x, z, [pad]) - 18) < 1e-9);
  // Far from it, the hills as they were; round it, between the two
  assert.equal(heightAt(330, -200, [pad]), heightAt(330, -200));
  const out = heightAt(376, -254, [pad]);
  const [lo, hi] = [Math.min(18, heightAt(376, -254)), Math.max(18, heightAt(376, -254))];
  assert.ok(out >= lo - 1e-9 && out <= hi + 1e-9);
});

test('a ray stops on the hills where it first meets them, and passes where it never does', () => {
  // Straight down onto the ridge
  const h = heightAt(380, -320);
  const t = hillsAlong({ x: 380, y: 60, z: -320 }, { x: 0, y: -1, z: 0 }, 100, 0, 0.1);
  assert.ok(Math.abs(60 - t - h) < 0.2, `down onto ${h.toFixed(2)}, stopped at ${(60 - t).toFixed(2)}`);
  // Level across the hills low down: stops at the first slope higher than it, the same as marching it finely
  const from = { x: 290, y: 5, z: -200 };
  const dir = { x: 1, y: 0, z: 0 };
  const got = hillsAlong(from, dir, 200, 0, 0.25);
  let want = 200;
  for (let s = 0; s <= 200; s += 0.01)
    if (heightAt(from.x + s, from.z) > from.y) {
      want = s;
      break;
    }
  assert.ok(got <= want + 1e-9 && want - got < 0.3, `${got} for ${want}`);
  // Nowhere near the hills, or well over them: untouched
  assert.equal(hillsAlong({ x: 0, y: 2, z: 0 }, { x: 1, y: 0, z: 0 }, 100), 100);
  assert.equal(hillsAlong({ x: 300, y: 80, z: -300 }, { x: 1, y: 0, z: 0 }, 150), 150);
  // Shots stop on them (solids.ts)
  assert.ok(rayBoxes(from, dir, 200) <= want + 1e-9);
  assert.equal(onHills(0, 0), false);
  assert.equal(onHills(380, -320), true);
});

test('every aircraft that crosses the hills (none does today) flies well over them', () => {
  for (let t = 0; t < PERIOD; t += 0.25)
    for (const f of FLIGHTS) {
      const p = poseAt(f, t);
      if (!onHills(p.x, p.z)) continue;
      const [x0, z0, x1, z1] = AIRSIDE;
      if (p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1) continue;
      assert.ok(p.y > heightAt(p.x, p.z) + 10, `${f.id} is ${(p.y - heightAt(p.x, p.z)).toFixed(1)} over the hills at ${p.x.toFixed(0)}, ${p.z.toFixed(0)}`);
    }
});
