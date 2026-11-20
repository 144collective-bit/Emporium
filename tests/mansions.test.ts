// The hills' mansions (mansions.ts, docs/crestmont-plan.md Phase 6): pads held level beside the hill roads, off
// the roads, each other, the overlook and the lower slopes; a drive up from the road; the houses on their pads under
// the Emporium; the summit estate, a compound, glass and villas; what's solid at the pad's height; nothing growing on
// them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CUT, DRIVE_GRADE, MANSIONS, MANSION_CARS, MANSION_LEVELS, MANSION_SOLIDS, NEW_LOTS, PAD_EASE, TALLEST, YARD, rectToWorld, topOf, toWorld } from '../src/scripts/city3d/mansions';
import { BED, CREST_LAMPS, HILL_ROADS, nearHillRoad } from '../src/scripts/city3d/crestmont';
import { LEVELS, heightAt, naturalAt } from '../src/scripts/city3d/terrain';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import { PALMS, hillPlanting } from '../src/scripts/city3d/landscape';

const { oaks: OAKS, scrub: SCRUB } = hillPlanting();
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
    // Never a quarry (a new lot terraced deeper by its own allowance: the premium upgrade's Phase 3, `NEW_LOTS`)
    const deeper = m.lot ? NEW_LOTS[MANSIONS.filter((q) => q.lot).indexOf(m)][5] : 0;
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) assert.ok(Math.abs(naturalAt(x, z) - m.y) <= CUT + deeper + 1e-9, `${m.id} a quarry`);
    // The drive: from the road's edge to the pad's front, its rise gentle
    const [a, b] = m.drive;
    assert.ok(nearHillRoad(a[0], a[1], 0.6), `${m.id}'s drive doesn't start at a road`);
    assert.ok(Math.hypot(...(toWorld(m, m.du, 0).map((v, i) => v - b[i]) as [number, number])) < 1e-6, `${m.id}'s drive misses its front`);
    const road = HILL_ROADS.find((r) => r.id === m.road)!;
    // (since the owner's call, 2026-11-19, the pad's at the hill's level: its drive may climb as far as DRIVE_GRADE lets it)
    assert.ok(road && Math.abs(heightAt(a[0], a[1]) - m.y) <= DRIVE_GRADE * Math.hypot(b[0] - a[0], b[1] - a[1]) + 0.5, `${m.id}'s drive climbs too far`);
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

test("built on the hillside, not sunk in it (the owner's call): each pad at the hills' middle under it, a flat yard round it", () => {
  for (const m of MANSIONS) {
    const [x0, z0, x1, z1] = m.rect;
    const hs: number[] = [];
    for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) hs.push(naturalAt(x0 + ((x1 - x0) * i) / 6, z0 + ((z1 - z0) * j) / 6));
    const [lo, hi] = [Math.min(...hs), Math.max(...hs)];
    // (at the middle, or as near it as its drive can climb)
    const [a, b] = m.drive;
    // (the layout reads the road's height at its nearest point, here under the drive's mouth: within a little)
    const capped = Math.abs(m.y - heightAt(a[0], a[1])) >= DRIVE_GRADE * Math.hypot(b[0] - a[0], b[1] - a[1]) - 0.3;
    assert.ok(Math.abs(m.y - (lo + hi) / 2) < 1e-6 || capped, `${m.id} not at the hill's level`);
    // (never sunk deeper than half its ground's rise, give or take what the drive holds it to)
    assert.ok(hi - m.y <= (hi - lo) / 2 + 0.5, `${m.id} sunk ${(hi - m.y).toFixed(1)} into the hill`);
    // The yard: round the pad, at most YARD a side, its ground held level at the pad's height
    const [y0, y1, y2, y3] = m.yard;
    assert.ok(y0 <= x0 && y1 <= z0 && y2 >= x1 && y3 >= z1 && x0 - y0 <= YARD && z0 - y1 <= YARD && y2 - x1 <= YARD && y3 - z1 <= YARD);
    for (let x = y0 + 0.1; x < y2; x += 0.9) for (const z of [y1 + 0.1, y3 - 0.1]) assert.ok(Math.abs(heightAt(x, z) - m.y) < 1e-6, `${m.id}'s yard not level`);
  }
  // (and some room round them all: the yards aren't all nothing)
  assert.ok(MANSIONS.reduce((n, m) => n + (m.yard[2] - m.yard[0] - (m.rect[2] - m.rect[0])) + (m.yard[3] - m.yard[1] - (m.rect[3] - m.rect[1])), 0) > 20);
});
