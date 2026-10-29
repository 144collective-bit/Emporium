// The hills' mansions (mansions.ts, docs/crestmont-plan.md Phase 6): pads held level beside the hill roads, off
// the roads, each other, the overlook and the lower slopes; a drive up from the road; the houses on their pads under
// the Emporium; the summit estate, a compound, glass and villas; what's solid at the pad's height; nothing growing on
// them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CUT, MANSIONS, MANSION_CARS, MANSION_LEVELS, MANSION_SOLIDS, PAD_EASE, RISE, TALLEST, rectToWorld, topOf, toWorld } from '../src/scripts/city3d/mansions';
import { BED, CREST_LAMPS, HILL_ROADS, nearHillRoad } from '../src/scripts/city3d/crestmont';
import { LEVELS, heightAt, naturalAt } from '../src/scripts/city3d/terrain';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import { OAKS, PALMS, SCRUB } from '../src/scripts/city3d/landscape';
import { SOLIDS } from '../src/scripts/city3d/solids';

type Rect = [number, number, number, number];
const inside = (r: Rect, x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;

test('the pads: on the hills, held level, off the roads and each other, a drive up from the road', () => {
  assert.ok(MANSIONS.length >= 8);
  for (const l of MANSION_LEVELS) assert.ok(LEVELS.includes(l));
  const kinds = new Set(MANSIONS.map((m) => m.kind));
  for (const k of ['glass', 'villa', 'compound', 'summit']) assert.ok(kinds.has(k as never), `no ${k}`);
  assert.equal(MANSIONS.filter((m) => m.kind === 'summit').length, 1);
  for (const m of MANSIONS) {
    const [x0, z0, x1, z1] = m.rect;
    assert.ok(naturalAt((x0 + x1) / 2, (z0 + z1) / 2) > 3, `${m.id} off the hills`);
    // Level inside
    for (let x = x0; x <= x1; x += 2) for (let z = z0; z <= z1; z += 2) assert.ok(Math.abs(heightAt(x, z) - m.y) < 1e-6, `${m.id} isn't level`);
    // Its ease kept off every road's asphalt and shoulder
    for (let x = x0 - PAD_EASE; x <= x1 + PAD_EASE; x += 1) for (let z = z0 - PAD_EASE; z <= z1 + PAD_EASE; z += 1) assert.ok(!nearHillRoad(x, z, BED.shoulder), `${m.id}'s ground reaches a road at ${x.toFixed(0)}, ${z.toFixed(0)}`);
    // Never a quarry
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) assert.ok(Math.abs(naturalAt(x, z) - m.y) <= CUT + 1e-9);
    // The drive: from the road's edge to the pad's front, its rise gentle
    const [a, b] = m.drive;
    assert.ok(nearHillRoad(a[0], a[1], 0.6), `${m.id}'s drive doesn't start at a road`);
    assert.ok(Math.hypot(...(toWorld(m, m.du, 0).map((v, i) => v - b[i]) as [number, number])) < 1e-6, `${m.id}'s drive misses its front`);
    const road = HILL_ROADS.find((r) => r.id === m.road)!;
    assert.ok(road && Math.abs(heightAt(a[0], a[1]) - m.y) <= RISE + 1.2, `${m.id}'s drive climbs too far`);
    for (const o of MANSIONS) if (o !== m) assert.ok(o.rect[2] + PAD_EASE * 2 < x0 || x1 + PAD_EASE * 2 < o.rect[0] || o.rect[3] + PAD_EASE * 2 < z0 || z1 + PAD_EASE * 2 < o.rect[1], `${m.id} on ${o.id}`);
  }
});

test('the houses: on their pads, under the Emporium; the cars on the forecourts; solid at the pad height', () => {
  assert.ok(TALLEST < EMPORIUM_ROOF);
  for (const m of MANSIONS) {
    for (const p of m.parts) {
      const r = rectToWorld(m, p.u0, p.v0, p.u1, p.v1);
      assert.ok(r[0] >= m.rect[0] + 1 && r[2] <= m.rect[2] - 1 && r[1] >= m.rect[1] + 1 && r[3] <= m.rect[3] - 1, `${m.id}'s house off its pad`);
      assert.ok(topOf(p) <= TALLEST);
    }
    const [pu0, pv0, pu1, pv1] = m.pool;
    const pool = rectToWorld(m, pu0, pv0, pu1, pv1);
    assert.ok(pool[0] >= m.rect[0] && pool[2] <= m.rect[2] && pool[1] >= m.rect[1] && pool[3] <= m.rect[3], `${m.id}'s pool off its pad`);
    assert.ok(pv0 - pv1 >= 1.2);
  }
  for (const { y, car: [, x, z] } of MANSION_CARS) {
    const m = MANSIONS.find((s) => inside(s.rect, x, z))!;
    assert.ok(m && Math.abs(m.y - y) < 1e-9, 'a car off its pad');
  }
  for (const b of MANSION_SOLIDS) {
    assert.ok(SOLIDS.includes(b));
    assert.ok(b[0] < b[2] && b[1] < b[3]);
    // Its top over the ground it stands on (bullets fly over the hills)
    const m = MANSIONS.find((s) => inside(s.rect, (b[0] + b[2]) / 2, (b[1] + b[3]) / 2, 6))!;
    assert.ok(m && b[4] > m.y - 4 && b[4] <= m.y + TALLEST + 1e-9);
  }
});

test("nothing grows on a pad or a drive, and no lamp stands there", () => {
  const onPad = (x: number, z: number) => MANSIONS.some((m) => inside(m.rect, x, z));
  for (const p of [...OAKS, ...SCRUB, ...PALMS]) assert.ok(!onPad(p.x, p.z), `planted on a pad at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
  for (const [x, z] of CREST_LAMPS) assert.ok(!onPad(x, z));
});
