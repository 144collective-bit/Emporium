// Uptown's towers (highrise.ts, docs/finance-plan.md Phase 2): one to a block, the spire in the plaza the tallest (the
// owner's call: over the Emporium, about 30; the rest 15 to 25), every part inside its lot and off the streets, each
// tier stacked on the one below and inside it, the lobbies' doors on open ground, solid in strips, and the flying
// traffic well over them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HIGHRISES, HIGHRISE_SOLIDS, PODIUM, SPIRE_LOT, STRIP, TALLEST, partBox, partStrips, type Highrise } from '../src/scripts/city3d/highrise';
import { AXIS_X, LANE_HALF, PLAZA_BLOCK, UPTOWN_BLOCKS, UPTOWN_LANES } from '../src/scripts/city3d/uptown';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import { PLAN, type Street } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { FLIGHTS, PERIOD, REACH, poseAt } from '../src/scripts/city3d/airfield';
import { WALK_W } from '../src/scripts/city3d/layout';

type Pt = [number, number];
type Rect = [number, number, number, number];
const inside = (a: Rect, b: Rect, m = 0) => a[0] >= b[0] + m - 1e-6 && a[1] >= b[1] + m - 1e-6 && a[2] <= b[2] - m + 1e-6 && a[3] <= b[3] - m + 1e-6;
const overlap = (a: Rect, b: Rect) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
function distToStreet(s: Street, p: Pt) {
  let best = Infinity;
  for (let i = 1; i < s.pts.length; i++) {
    const [a, b] = [s.pts[i - 1], s.pts[i]];
    const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / (vx * vx + vz * vz || 1)));
    best = Math.min(best, Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vz * t));
  }
  return best;
}
const shafts = (t: Highrise) => t.parts.filter((p) => p.skin !== 'podium');

test('one tower to a block, the spire in the plaza the tallest, the rest 15 to 25, every one over the Emporium', () => {
  assert.deepEqual(HIGHRISES.map((t) => t.block).sort(), UPTOWN_BLOCKS.map((b) => b.id).sort());
  const spire = HIGHRISES.find((t) => t.design === 'spire')!;
  assert.equal(spire.block, PLAZA_BLOCK);
  assert.equal(spire.roof, TALLEST.roof);
  assert.equal(spire.tip, TALLEST.tip);
  for (const t of HIGHRISES) {
    assert.ok(t.roof > EMPORIUM_ROOF, `${t.id} over the Emporium (the owner's call)`);
    if (t !== spire) {
      assert.ok(t.roof >= 15 && t.roof <= 25, `${t.id} at ${t.roof}`);
      assert.ok(t.tip < spire.roof, `${t.id}'s tip under the spire's roof`);
    }
    assert.equal(Math.max(...t.parts.map((p) => p.y1)), t.roof);
    assert.ok(t.tip > t.roof);
  }
  // Every design used
  assert.deepEqual([...new Set(HIGHRISES.map((t) => t.design))].sort(), ['deco', 'round', 'slab', 'spire', 'twin']);
});

test('every part inside its lot and its lot inside its block, off every street and its sidewalk, clear of the lanes', () => {
  for (const t of HIGHRISES) {
    const blk = UPTOWN_BLOCKS.find((b) => b.id === t.block)!;
    assert.ok(inside(t.lot, blk.rect), `${t.id}'s lot off its block`);
    for (const l of UPTOWN_LANES) assert.ok(!overlap(t.lot, l), `${t.id}'s lot on a lane`);
    for (const p of t.parts) {
      assert.ok(inside(p.rect, t.lot, 0.5), `${t.id}: a part off its lot`);
      for (const [x, z] of [[p.rect[0], p.rect[1]], [p.rect[2], p.rect[3]], [p.rect[0], p.rect[3]], [p.rect[2], p.rect[1]]] as Pt[])
        for (const s of PLAN.streets) if (s.kind !== 'alley') assert.ok(distToStreet(s, [x, z]) > s.half + WALK_W, `${t.id} on ${s.id}`);
    }
  }
  // The spire leaves the plaza its west side, well clear of the axis
  assert.ok(SPIRE_LOT[0] > AXIS_X + LANE_HALF + 6);
});

test('each tier stands on the one below and inside it; the podium a double-height lobby; the twins side by side under a skybridge', () => {
  for (const t of HIGHRISES) {
    const pod = t.parts.find((p) => p.skin === 'podium');
    if (t.design === 'spire') assert.ok(!pod, 'the spire stands in the plaza, no podium');
    else {
      assert.ok(pod && pod.y0 === 0 && pod.y1 === PODIUM.h, `${t.id}'s podium`);
      for (const s of shafts(t)) assert.ok(inside(s.rect, pod.rect, 0.5), `${t.id}'s shaft over its podium`);
    }
    if (t.design === 'twin') {
      const [a, b] = shafts(t);
      assert.ok(!overlap(a.rect, b.rect) && a.y0 === b.y0, 'two shafts side by side');
      assert.ok(t.bridge && t.bridge.y0 > PODIUM.h + 4 && t.bridge.y1 < Math.min(a.y1, b.y1), 'a skybridge between them');
      continue;
    }
    const sh = shafts(t);
    for (let i = 1; i < sh.length; i++) {
      assert.equal(sh[i].y0, sh[i - 1].y1, `${t.id}'s tier ${i} on the one below`);
      assert.ok(inside(sh[i].rect, sh[i - 1].rect), `${t.id}'s tier ${i} inside the one below`);
    }
  }
});

test('the lobbies: each door on open ground in front of its tower, on its own lot', () => {
  for (const t of HIGHRISES) {
    assert.ok(t.door[0] > t.lot[0] && t.door[0] < t.lot[2] && t.door[1] > t.lot[1] && t.door[1] < t.lot[3], `${t.id}'s door off its lot`);
    assert.ok(!SOLIDS.some((b) => t.door[0] > b[0] && t.door[0] < b[2] && t.door[1] > b[1] && t.door[1] < b[3]), `${t.id}'s door inside something solid`);
  }
});

test('solid in strips no wider than STRIP, covering every part to its top', () => {
  for (const t of HIGHRISES)
    for (const p of t.parts) {
      const box = partBox(p);
      const strips = partStrips(p);
      for (const s of strips) {
        assert.ok(Math.min(s[2] - s[0], s[3] - s[1]) <= STRIP + 1e-6);
        assert.equal(s[4], p.y1);
        assert.ok(SOLIDS.some((b) => b.every((v, i) => v === s[i])), 'in SOLIDS');
      }
      const area = strips.reduce((a, s) => a + (s[2] - s[0]) * (s[3] - s[1]), 0);
      assert.ok(Math.abs(area - (box[2] - box[0]) * (box[3] - box[1])) < 1e-6, 'the strips cover the part');
    }
  assert.equal(HIGHRISE_SOLIDS.length, HIGHRISES.flatMap((t) => t.parts.flatMap(partStrips)).length);
});

test('the flying traffic keeps well over the towers', () => {
  for (let t = 0; t < PERIOD; t += 0.25)
    for (const f of FLIGHTS) {
      const p = poseAt(f, t);
      for (const h of HIGHRISES) {
        const [x0, z0, x1, z1] = h.lot;
        const d = Math.hypot(Math.max(x0 - p.x, 0, p.x - x1), Math.max(z0 - p.z, 0, p.z - z1));
        if (d < REACH[f.kind] + 4) assert.ok(p.y > h.tip + 4, `${f.id} at ${p.y.toFixed(1)} over ${h.id} (its tip ${h.tip}) at t ${t}`);
      }
    }
});
