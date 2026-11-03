// The blocks' edges onto open land (verges.ts, docs/blend-plan.md Phase 3): found where a block meets open land and
// nowhere else, the slab easing down to the ground over the bank (walking and driving follow it), the district's
// hedge or low wall along the foot with ways through, low enough to vault, clear of everything else that's solid.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EDGE, GAP, GAP_EVERY, OUT, RAMP, VERGES, VERGE_SOLIDS, edgePieces, openAt, pieceLine, vergeY } from '../src/scripts/city3d/verges';
import { PLAN, distToStreet, onSlab, type Pt } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { isLow, OVER } from '../src/scripts/city3d/vault';
import { PLACES } from '../src/scripts/city3d/places';

const SLAB = 0.15;
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const out = (p: Pt, n: Pt, d: number): Pt => [p[0] + n[0] * d, p[1] + n[1] * d];

test('a verge is a block edge with open land past it, its top on the slab and its bank off every street', () => {
  assert.ok(VERGES.length > 50);
  for (const v of VERGES) {
    for (const t of [0.1, 0.5, 0.9]) {
      const p = lerp(v.a, v.b, t);
      assert.ok(onSlab(PLAN, out(p, v.n, -0.15)), `${v.block}: the slab is on its inside`);
      assert.ok(!onSlab(PLAN, out(p, v.n, 0.3)), `${v.block}: no slab past it`);
      assert.ok(openAt(out(p, v.n, RAMP + 0.3)), `${v.block}: the bank's foot on open land`);
      for (const s of PLAN.streets)
        if (s.kind !== 'highway') assert.ok(distToStreet(s, out(p, v.n, RAMP / 2)) > s.half, `${v.block}'s bank on ${s.id}`);
    }
    assert.ok(Math.abs(Math.hypot(...v.n) - 1) < 1e-2);
  }
  assert.ok(OUT > RAMP / 2);
});

/** Whether another verge's bank reaches near p (an inside corner: two banks meet) */
const nearOther = (v: (typeof VERGES)[number], p: Pt) =>
  VERGES.some((w) => w !== v && [0, 0.25, 0.5, 0.75, 1].some((t) => Math.hypot(...([0, 1].map((i) => lerp(w.a, w.b, t)[i] - p[i]) as Pt)) < RAMP + Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]) / 4 + 0.5));

test('the bank: the slab\'s height at the edge, easing to the ground at its foot', () => {
  for (const v of VERGES) {
    const p = lerp(v.a, v.b, 0.5);
    if (nearOther(v, p) || nearOther(v, out(p, v.n, RAMP))) continue;
    assert.ok(Math.abs(vergeY(...out(p, v.n, 0.01)) - SLAB) < 0.01, `${v.block} at its edge`);
    assert.ok(Math.abs(vergeY(...out(p, v.n, RAMP / 2)) - SLAB / 2) < 0.01, `${v.block} half way`);
    assert.equal(vergeY(...out(p, v.n, RAMP + 0.05)), 0, `${v.block} past its foot`);
    // (no step down it)
    let last = vergeY(...out(p, v.n, 0.001));
    for (let d = 0.05; d <= RAMP; d += 0.05) {
      const y = vergeY(...out(p, v.n, d));
      assert.ok(y <= last + 1e-9 && last - y < 0.02);
      last = y;
    }
  }
  assert.equal(vergeY(30, 30), 0, 'downtown');
});

test('hedges and walls: low, vaultable, with a way through every so often, clear of everything else solid and every place', () => {
  const others = SOLIDS.filter((b) => !VERGE_SOLIDS.includes(b));
  for (const b of VERGE_SOLIDS) {
    assert.ok(b[4] <= OVER.vault, 'low enough to vault');
    assert.ok(isLow(b), 'a low thing');
    for (const o of others) assert.ok(b[0] >= o[2] || b[2] <= o[0] || b[1] >= o[3] || b[3] <= o[1], `a verge's edge in ${o.join(', ')}`);
    for (const p of PLACES) assert.ok(!(p.at.x > b[0] - 0.3 && p.at.x < b[2] + 0.3 && p.at.z > b[1] - 0.3 && p.at.z < b[3] + 0.3), `on ${p.id}'s spot`);
  }
  for (const v of VERGES.filter((w) => w.edge)) {
    const l = Math.hypot(v.b[0] - v.a[0], v.b[1] - v.a[1]);
    const pieces = edgePieces(v);
    // (along a verge longer than the spacing, at least one way through, GAP wide)
    if (l > GAP_EVERY + GAP) {
      assert.ok(pieces.length >= 2, `${v.block}: no way through ${l.toFixed(1)} long`);
      for (let i = 1; i < pieces.length; i++) assert.ok(pieces[i][0] - pieces[i - 1][1] >= GAP - 1e-6);
    }
    for (const piece of pieces) {
      const { a } = pieceLine(v, piece);
      assert.ok(openAt(a), `${v.block}'s ${v.edge} on open land`);
    }
    assert.ok(EDGE[v.edge!].h <= OVER.vault);
  }
});
