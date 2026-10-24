// Uptown's towers (highrise.ts, docs/finance-plan.md Phases 2 and 5): slim (the owner's call in Phase 5: shafts 10
// across at most, two or three to a block, the spire about 40, the rest 14 to 32), every part inside its lot and its
// lot inside its block, off the streets and apart from the next, each tier stacked on the one below and inside it,
// the flatiron filling the diagonal's wedge, the river row's shafts at the back of their podiums, the lobbies' doors
// on open ground, solid in strips, and the flying traffic well over them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GROUND, HIGHRISES, HIGHRISE_SOLIDS, PODIUM, PROW, SPIRE_LOT, STRIP, TALLEST, partBox, partStrips, type Highrise } from '../src/scripts/city3d/highrise';
import { AXIS_X, LANE_HALF, PLAZA_BLOCK, UPTOWN_BLOCKS, UPTOWN_LANES } from '../src/scripts/city3d/uptown';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import { PLAN, polyArea, type Street } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { FLIGHTS, PERIOD, REACH, poseAt } from '../src/scripts/city3d/airfield';
import { WALK_W } from '../src/scripts/city3d/layout';

type Pt = [number, number];
type Rect = [number, number, number, number];
const inside = (a: Rect, b: Rect, m = 0) => a[0] >= b[0] + m - 1e-6 && a[1] >= b[1] + m - 1e-6 && a[2] <= b[2] - m + 1e-6 && a[3] <= b[3] - m + 1e-6;
const overlap = (a: Rect, b: Rect) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
function distToLine(pts: Pt[], p: Pt, closed = false) {
  let best = Infinity;
  const n = closed ? pts.length + 1 : pts.length;
  for (let i = 1; i < n; i++) {
    const [a, b] = [pts[i - 1], pts[i % pts.length]];
    const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / (vx * vx + vz * vz || 1)));
    best = Math.min(best, Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vz * t));
  }
  return best;
}
const distToStreet = (s: Street, p: Pt) => distToLine(s.pts, p);
/** Is a point inside an outline, at least m in from its edges */
function inPoly(poly: Pt[], p: Pt, m = 0) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [u, v] = [poly[i], poly[j]];
    if (u[1] > p[1] !== v[1] > p[1] && p[0] < ((v[0] - u[0]) * (p[1] - u[1])) / (v[1] - u[1]) + u[0]) inside = !inside;
  }
  return inside && distToLine(poly, p, true) >= m - 1e-6;
}
const corners = (r: Rect): Pt[] => [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]];
const shafts = (t: Highrise) => t.parts.filter((p) => p.skin !== 'podium');

test('slim towers, two or three to a block, the spire in the plaza the tallest, the rest 14 to 32, every one over the Emporium', () => {
  assert.ok(HIGHRISES.length >= 24, `${HIGHRISES.length} towers`);
  assert.equal(new Set(HIGHRISES.map((t) => t.id)).size, HIGHRISES.length, 'ids unique');
  const spire = HIGHRISES.find((t) => t.design === 'spire')!;
  assert.equal(spire.block, PLAZA_BLOCK);
  assert.equal(spire.roof, TALLEST.roof);
  assert.equal(spire.tip, TALLEST.tip);
  assert.ok(TALLEST.roof >= 38 && TALLEST.roof <= 42, 'about 40 (the owner\'s call)');
  for (const b of UPTOWN_BLOCKS) {
    const n = HIGHRISES.filter((t) => t.block === b.id).length;
    assert.ok(n <= 3, `${b.id}: ${n} towers`);
    if (b.use !== 'towers') assert.ok(b.id === PLAZA_BLOCK ? n === 1 : n === 0, `${b.id} is a ${b.use}`);
  }
  for (const t of HIGHRISES) {
    assert.ok(UPTOWN_BLOCKS.some((b) => b.id === t.block), `${t.id}'s block`);
    assert.ok(t.roof > EMPORIUM_ROOF, `${t.id} over the Emporium (the owner's call)`);
    if (t !== spire) {
      assert.ok(t.roof >= 14 && t.roof <= 32, `${t.id} at ${t.roof}`);
      assert.ok(t.tip < spire.roof, `${t.id}'s tip under the spire's roof`);
    }
    assert.equal(Math.max(...t.parts.map((p) => p.y1)), t.roof);
    assert.ok(t.tip > t.roof);
    // Slim: no shaft wider than 10 across (the spire's 12), and tall for its width (the flatiron's a wedge)
    const widest = Math.max(...shafts(t).map((p) => Math.min(p.rect[2] - p.rect[0], p.rect[3] - p.rect[1])));
    assert.ok(widest <= (t === spire ? 12.01 : t.design === 'flatiron' ? 12 : 10), `${t.id}'s shaft ${widest.toFixed(1)} across`);
    if (t.design !== 'flatiron') assert.ok(t.roof >= 2.5 * widest, `${t.id}: ${t.roof} tall on ${widest.toFixed(1)}`);
  }
  // Every design used
  assert.deepEqual([...new Set(HIGHRISES.map((t) => t.design))].sort(), ['deco', 'flatiron', 'round', 'slab', 'spire', 'twin']);
});

test('every part inside its lot and its lot inside its block, off every street and its sidewalk, clear of the lanes, apart from the next', () => {
  for (const t of HIGHRISES) {
    const blk = UPTOWN_BLOCKS.find((b) => b.id === t.block)!;
    // (the flatiron's lot is its wedge's bounds: its parts' corners are its own, below)
    if (t.design !== 'flatiron') for (const c of corners(t.lot)) assert.ok(inPoly(blk.poly, c) || distToLine(blk.poly, c, true) < 0.6, `${t.id}'s lot off its block at ${c}`);
    for (const l of UPTOWN_LANES) assert.ok(!overlap(t.lot, l), `${t.id}'s lot on a lane`);
    for (const p of t.parts) {
      assert.ok(inside(p.rect, t.lot, 0.5), `${t.id}: a part off its lot`);
      // On its block, every corner (a prism's own)
      for (const c of p.poly ?? corners(p.rect)) {
        assert.ok(inPoly(blk.poly, c, 0.3), `${t.id}: a part off its block at ${c}`);
        for (const s of PLAN.streets) if (s.kind !== 'alley') assert.ok(distToStreet(s, c) > s.half + WALK_W, `${t.id} on ${s.id}`);
      }
    }
  }
  // Two on a block stand apart: room for a service way between
  for (const [i, a] of HIGHRISES.entries())
    for (const b of HIGHRISES.slice(i + 1)) {
      const gap = Math.max(a.lot[0] - b.lot[2], b.lot[0] - a.lot[2], a.lot[1] - b.lot[3], b.lot[1] - a.lot[3]);
      assert.ok(gap >= 1.5, `${a.id} and ${b.id} ${gap.toFixed(2)} apart`);
    }
  // The spire leaves the plaza its west side, well clear of the axis
  assert.ok(SPIRE_LOT[0] > AXIS_X + LANE_HALF + 6);
});

test('each tier stands on the one below and inside it; the podium a double-height lobby; the twins side by side under a skybridge', () => {
  for (const t of HIGHRISES) {
    const pod = t.parts.find((p) => p.skin === 'podium');
    if (t.design === 'spire' || t.design === 'flatiron') assert.ok(!pod, `${t.id} stands without a podium`);
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
      for (const c of sh[i].poly ?? []) assert.ok(inPoly(sh[i - 1].poly!, c), `${t.id}'s cornice over its body`);
    }
  }
});

test('the flatiron: a stone wedge filling the diagonal\'s sharp corner, its prow blunt', () => {
  const f = HIGHRISES.find((t) => t.design === 'flatiron')!;
  const wedge = UPTOWN_BLOCKS.find((b) => b.id === f.block)!;
  assert.equal(wedge.poly.length, 3, 'on the wedge');
  const body = f.parts[0];
  assert.equal(body.shape, 'prism');
  assert.equal(body.skin, 'stone');
  assert.ok(polyArea(body.poly!) > 0.5 * polyArea(wedge.poly), 'it fills its wedge');
  // The prow: its narrow end, PROW across, square to the wedge's length
  // (its sharp end is its south end: the diagonal comes in to the east street there)
  const south = Math.max(...body.poly!.map((p) => p[1]));
  const end = body.poly!.filter((p) => Math.abs(p[1] - south) < 1e-6);
  assert.equal(end.length, 2);
  assert.ok(Math.abs(Math.abs(end[0][0] - end[1][0]) - PROW) < 1e-3, 'a blunt prow');
});

test('the river row: shafts at the back of their podiums, the front of the roof open for a terrace', () => {
  const row = HIGHRISES.filter((t) => t.block.startsWith('uptown-s') && t.parts[0].skin === 'podium');
  assert.ok(row.length >= 6);
  for (const t of row) {
    const pod = t.parts[0].rect;
    const front = Math.max(...shafts(t).map((p) => p.rect[3]));
    assert.ok(pod[3] - front >= 3, `${t.id}: ${(pod[3] - front).toFixed(2)} in front of its shafts`);
    assert.equal(t.front, 's', `${t.id}'s lobby on the river`);
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
      if (p.poly) {
        // A prism: every point of it in a strip, and the strips no more than a fifth over it
        for (let k = 0; k < 400; k++) {
          const q: Pt = [p.rect[0] + ((k % 20) + 0.5) * (p.rect[2] - p.rect[0]) / 20, p.rect[1] + (Math.floor(k / 20) + 0.5) * (p.rect[3] - p.rect[1]) / 20];
          if (inPoly(p.poly, q)) assert.ok(strips.some((s) => q[0] >= s[0] && q[0] <= s[2] && q[1] >= s[1] && q[1] <= s[3]), 'the strips cover the prism');
        }
        const area = strips.reduce((a, s) => a + (s[2] - s[0]) * (s[3] - s[1]), 0);
        assert.ok(area < polyArea(p.poly) * 1.2, 'close round it');
        continue;
      }
      const area = strips.reduce((a, s) => a + (s[2] - s[0]) * (s[3] - s[1]), 0);
      assert.ok(Math.abs(area - (box[2] - box[0]) * (box[3] - box[1])) < 1e-6, 'the strips cover the part');
    }
  assert.equal(HIGHRISE_SOLIDS.length, HIGHRISES.flatMap((t) => t.parts.flatMap(partStrips)).length + HIGHRISES.reduce((n, t) => n + t.columns.length, 0));
});

test('the lobbies: every design, a colonnade\'s or an arcade\'s ground floor set back behind its columns (walkable under the storey over it)', () => {
  assert.deepEqual([...new Set(HIGHRISES.map((t) => t.lobby))].sort(), ['arcade', 'atrium', 'colonnade', 'pavilion', 'retail']);
  for (const t of HIGHRISES) {
    const pod = t.parts[0];
    if (t.lobby === 'colonnade' || t.lobby === 'arcade') {
      assert.ok(pod.skin === 'podium' && pod.foot, `${t.id}'s ground floor set back`);
      const f = pod.foot!;
      const back = t.front === 'n' ? f[1] - pod.rect[1] : t.front === 's' ? pod.rect[3] - f[3] : t.front === 'w' ? f[0] - pod.rect[0] : pod.rect[2] - f[2];
      assert.ok(Math.abs(back - GROUND.recess) < 1e-9, `${t.id} set back on its front`);
      assert.ok(t.columns.length >= 3, `${t.id}'s columns`);
      // The columns on the podium's front line, inside it, a walker's width and more apart
      for (const [x, z] of t.columns) assert.ok(inside([x - GROUND.col / 2, z - GROUND.col / 2, x + GROUND.col / 2, z + GROUND.col / 2], pod.rect, 0), `${t.id}'s column off its podium`);
      for (let i = 1; i < t.columns.length; i++) assert.ok(Math.hypot(t.columns[i][0] - t.columns[i - 1][0], t.columns[i][1] - t.columns[i - 1][1]) - GROUND.col > 0.9);
    } else assert.equal(t.columns.length, 0);
    assert.ok(GROUND.h < PODIUM.h - 0.5, 'a storey over the ground floor');
  }
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
