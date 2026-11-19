// The banks round the hills' mansions' pads (crestbanks.ts): spokes all round each pad, sorted by the ground; the cut
// banks terraced with walls that hold their ground, never standing proud of it, the fill banks planted; nothing on a
// road's shoulder, a drive, a landmark, a villa's terraces or under a glass mansion's cantilever; every foot on the
// ground as drawn.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRIVE_GAP, DRIVE_LIGHT, PATH_GAP, banks, driveLights, PLANT_TALLEST, READ, TERRACES, TERRACE_SOLIDS, TIERS, toFrame } from '../src/scripts/city3d/crestbanks';
import { MANSIONS, PAD_EASE, toWorld } from '../src/scripts/city3d/mansions';
import { BED, nearHillRoad } from '../src/scripts/city3d/crestmont';
import { drawnAt, heightAt } from '../src/scripts/city3d/terrain';

const BANKS = banks();
const DRIVE_LIGHTS = driveLights();
import { onSite } from '../src/scripts/city3d/crestsites';

const toDrive = (m: (typeof MANSIONS)[number], x: number, z: number) => {
  const [a, b] = m.drive;
  const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz)));
  return Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t);
};

test('a bank to every pad, walked all round it, its spokes sorted by the ground', () => {
  assert.equal(BANKS.length, MANSIONS.length);
  for (const [i, b] of BANKS.entries()) {
    const m = MANSIONS[i];
    assert.equal(b.id, m.id);
    assert.ok(b.spokes.length > 40);
    for (const s of b.spokes) {
      // (each leaves the pad's edge, its way out a unit)
      assert.ok(Math.abs(Math.hypot(s.nx, s.nz) - 1) < 1e-9);
      // (from its yard's edge: mansions.ts `yard`)
      assert.ok(s.x >= m.yard[0] - 1e-9 && s.x <= m.yard[2] + 1e-9 && s.z >= m.yard[1] - 1e-9 && s.z <= m.yard[3] + 1e-9);
      if (s.kind === 'none') continue;
      const g = heightAt(s.x + s.nx * READ.at, s.z + s.nz * READ.at) - m.y;
      assert.ok(s.kind === 'cut' ? g > READ.by : s.kind === 'fill' ? g < -READ.by : Math.abs(g) <= READ.by, `${m.id}'s ${s.kind} spoke at ${s.x.toFixed(1)}, ${s.z.toFixed(1)}`);
    }
  }
  // (the hills give both kinds of bank somewhere)
  const kinds = BANKS.flatMap((b) => b.spokes.map((s) => s.kind));
  assert.ok(kinds.includes('cut') && kinds.includes('fill') && kinds.includes('level'));
});

test("the walls hold their ground: topped just over the bank behind, their feet in the ground, no taller than a terrace's", () => {
  let n = 0;
  for (const b of BANKS)
    for (const w of b.walls) {
      assert.ok(w.length >= 2);
      for (const p of w) {
        n++;
        const h = p.y1 - p.y0;
        assert.ok(h > 0.4 && h < 1.6, `a wall ${h.toFixed(2)} high at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
        assert.ok(p.y0 < drawnAt(p.x, p.z) - 0.1, `a wall's foot in the air at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
        // (never standing proud: the top within half a tile of the ground about it)
        assert.ok(p.y1 - drawnAt(p.x, p.z) < 1.1, `a wall standing proud at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
      }
      // (a run follows the bank: posts close together)
      for (let k = 1; k < w.length; k++) assert.ok(Math.hypot(w[k].x - w[k - 1].x, w[k].z - w[k - 1].z) < 1.8);
    }
  assert.ok(n > 300, 'the cut banks are terraced');
  assert.ok(TIERS[0] < 0.5 && TIERS[TIERS.length - 1] < PAD_EASE);
});

test('the planting and boulders: on the banks, on the ground as drawn, off the roads, the drives and what stands behind the pads', () => {
  let plants = 0;
  for (const [i, b] of BANKS.entries()) {
    const m = MANSIONS[i];
    const things = [...b.plants, ...b.rocks, ...b.walls.flat()];
    for (const t of things) {
      const y = 'y' in t ? t.y : t.y0;
      if ('kind' in t || 'turn' in t) assert.ok(Math.abs(y - drawnAt(t.x, t.z)) < 1e-9);
      assert.ok(!nearHillRoad(t.x, t.z, BED.shoulder + 0.3), `${m.id}'s bank on a road at ${t.x.toFixed(1)}, ${t.z.toFixed(1)}`);
      assert.ok(toDrive(m, t.x, t.z) > DRIVE_GAP - 1.3, `${m.id}'s bank on its drive at ${t.x.toFixed(1)}, ${t.z.toFixed(1)}`);
      assert.ok(!onSite(t.x, t.z), `${m.id}'s bank on a landmark`);
      // (outside the pad, within its ease)
      const [u, v] = toFrame(m, t.x, t.z);
      assert.ok(Math.abs(u) > m.W / 2 - 1e-6 || v > -1e-6 || v < -m.D + 1e-6, `${m.id}'s bank on its pad at ${u.toFixed(1)}, ${v.toFixed(1)}`);
      // (not on a villa's terraces nor under a glass mansion's cantilever)
      if (m.terraces.length) assert.ok(!(v < -m.D && v > -m.D - 4.2 && Math.abs(u) < m.W / 2 - 1), `${m.id}'s bank on its terraces`);
      if (m.reach) assert.ok(!(v < -m.D && v > -m.D - m.reach && u > m.parts[0].u0 && u < m.parts[0].u1), `${m.id}'s bank under its cantilever`);
    }
    plants += b.plants.length;
  }
  assert.ok(plants > 600);
  assert.ok(PLANT_TALLEST < 1);
});

test('the frame turned back: toFrame() undoes toWorld()', () => {
  for (const m of MANSIONS)
    for (const [u, v] of [
      [0, 0],
      [3.5, -2],
      [-6, -9],
    ]) {
      const [a, b] = toFrame(m, ...toWorld(m, u, v));
      assert.ok(Math.abs(a - u) < 1e-9 && Math.abs(b - v) < 1e-9);
    }
});

test("a villa's terraces on the ground behind it: never buried, their feet in the ground, solid to their tops", () => {
  let n = 0;
  for (const [i, m] of MANSIONS.entries()) {
    assert.ok(TERRACES[i].length >= m.terraces.length && TERRACES[i].length <= m.terraces.length * 4);
    for (const t of TERRACES[i]) {
      n++;
      for (let u = t.r[0] + 0.1; u < t.r[2]; u += 0.6)
        for (let v = t.r[3] + 0.1; v < t.r[1]; v += 0.4) {
          const g = drawnAt(...toWorld(m, u, v)) - m.y;
          assert.ok(t.top > g, `${m.id}'s terrace buried at ${u.toFixed(1)}, ${v.toFixed(1)}`);
          assert.ok(t.foot < g, `${m.id}'s terrace's foot in the air`);
        }
      // (a terrace, not a tower: its face no taller than a storey)
      assert.ok(t.top - t.foot < 3, `${m.id}'s terrace ${(t.top - t.foot).toFixed(2)} high`);
    }
  }
  assert.ok(n >= 2);
  assert.equal(TERRACE_SOLIDS.length, n);
});

test("the banks open where a garden path comes through: no wall, plant or boulder on it", async () => {
  const { onGardenPath, GARDEN_PATHS } = await import('../src/scripts/city3d/crestcover');
  assert.ok(GARDEN_PATHS.length > 0);
  for (const b of BANKS) for (const t of [...b.plants, ...b.rocks, ...b.walls.flat()]) assert.ok(!onGardenPath(t.x, t.z, PATH_GAP - 0.55), `${b.id}'s bank across a garden path at ${t.x.toFixed(1)}, ${t.z.toFixed(1)}`);
});

test("the grounds lit at night: lights in the terrace walls' faces, low lights by the drives off the drive, its piers and the road", async () => {
  const { DRIVE_PIERS } = await import('../src/scripts/city3d/crestland');
  let walls = 0;
  for (const b of BANKS)
    for (const [x, z, y] of b.lights) {
      walls++;
      // (by a wall, under its top, over the ground in front)
      const p = b.walls.flat().reduce((best, q) => (Math.hypot(q.x - x, q.z - z) < Math.hypot(best.x - x, best.z - z) ? q : best));
      assert.ok(Math.hypot(p.x - x, p.z - z) < 0.6 && y < p.y1 && y > drawnAt(x, z), `${b.id}'s wall light off its wall`);
    }
  assert.ok(walls >= 20, 'the terraces are dark');
  assert.ok(DRIVE_LIGHTS.length >= 8);
  for (const [x, z, y] of DRIVE_LIGHTS) {
    const m = MANSIONS.find((q) => toDrive(q, x, z) < DRIVE_LIGHT.off + 0.2);
    assert.ok(m && toDrive(m, x, z) > 1.35, `a drive light on a drive at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    assert.ok(!nearHillRoad(x, z, BED.shoulder) && Math.abs(y - drawnAt(x, z)) < 1e-9);
    for (const p of DRIVE_PIERS) assert.ok(Math.hypot(p.x - x, p.z - z) > 0.6, 'a drive light in a pier');
  }
});
