// The outer districts' lawns dressed (outerdress.ts): walks from the plots and squares out to the sidewalk,
// flower beds in the corners, benches, bins and a picnic table; everything on its block, clear of what's solid,
// the pads, the squares and the parks, and the lawn trees kept off it all.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BENCH_OUT, PATH_W, dressing } from '../src/scripts/city3d/outerdress';
import { OUTER_BLOCKS, OUTER_PARKS, OUTER_SQUARES, PADS, SQUARE_LAYOUTS, inside, type Pt } from '../src/scripts/city3d/outer';
import { SOLID_GRID } from '../src/scripts/city3d/solids';

const solidAt = ([x, z]: Pt, m: number) => SOLID_GRID.near(x, z, m + 0.5).some((b) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m);
const D = dressing(solidAt);
const block = (id: string) => OUTER_BLOCKS.find((b) => b.id === id)!;
const segDist = (a: Pt, b: Pt, p: Pt) => {
  const vx = b[0] - a[0];
  const vz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / (vx * vx + vz * vz || 1)));
  return Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vz * t);
};

test('every plot has a walk out to its block, and every square two; each on its block, clear of what stands', () => {
  for (const p of PADS.filter((q) => q.kind === 'plot')) {
    const [x0, z0, x1, z1] = p.rect;
    assert.ok(
      D.paths.some((q) => q.a[0] >= x0 - 1e-6 && q.a[0] <= x1 + 1e-6 && q.a[1] >= z0 - 1e-6 && q.a[1] <= z1 + 1e-6),
      `a walk from ${p.id}`
    );
  }
  for (const s of OUTER_SQUARES) assert.ok(D.paths.filter((q) => q.block === s.block && q.a[1] >= s.rect[1] - 1e-6 && q.a[1] <= s.rect[3] + 1e-6 && q.a[0] > s.rect[0] && q.a[0] < s.rect[2]).length >= 1, `a way into ${s.name}`);
  for (const q of D.paths) {
    const len = Math.hypot(q.b[0] - q.a[0], q.b[1] - q.a[1]);
    assert.ok(len > 0.5 && len < 30, `a walk ${len} long`);
    for (let t = 0.6; t < len - 0.6; t += 0.5) {
      const p: Pt = [q.a[0] + ((q.b[0] - q.a[0]) * t) / len, q.a[1] + ((q.b[1] - q.a[1]) * t) / len];
      assert.ok(inside(block(q.block).poly, p), `the walk in ${q.block} off its block`);
      assert.ok(!solidAt(p, 0), `the walk in ${q.block} through something solid at ${p}`);
    }
  }
});

test('beds and furniture stand on open lawn: their block, clear of what stands, the pads, the squares and the parks', () => {
  assert.ok(D.beds.length >= 12 && D.furniture.filter((f) => f.kind === 'bench').length >= 10 && D.furniture.filter((f) => f.kind === 'picnic').length >= 10);
  const off = [...PADS.map((p) => p.rect), ...OUTER_SQUARES.map((s) => s.rect), ...OUTER_PARKS.map((p) => p.rect)];
  const inRect = (r: number[], [x, z]: Pt, m: number) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
  for (const b of D.beds) {
    assert.ok(inside(block(b.block).poly, b.at));
    assert.ok(!solidAt(b.at, b.r) && off.every((r) => !inRect(r, b.at, b.r)), `a bed at ${b.at}`);
    assert.ok(D.paths.every((q) => segDist(q.a, q.b, b.at) > PATH_W / 2 + b.r), `a bed on a walk at ${b.at}`);
  }
  for (const f of D.furniture) {
    assert.ok(inside(block(f.block).poly, f.at));
    assert.ok(!solidAt(f.at, 0.3) && off.every((r) => !inRect(r, f.at, 0.3)), `a ${f.kind} at ${f.at}`);
    // (benches beside the walk, never on it)
    assert.ok(D.paths.every((q) => segDist(q.a, q.b, f.at) > PATH_W / 2 + 0.2), `a ${f.kind} on a walk at ${f.at}`);
    if (f.kind === 'bench') assert.ok(D.paths.some((q) => Math.abs(segDist(q.a, q.b, f.at) - BENCH_OUT) < 0.05), 'a bench by a walk');
  }
});

test("the lawn trees are kept off the walks, the beds and the picnic tables", () => {
  for (const t of D.trees) {
    assert.ok(D.paths.every((q) => segDist(q.a, q.b, t) > PATH_W / 2 + 0.5));
    assert.ok(D.beds.every((b) => Math.hypot(t[0] - b.at[0], t[1] - b.at[1]) > b.r));
    assert.ok(D.furniture.every((f) => f.kind !== 'picnic' || Math.hypot(t[0] - f.at[0], t[1] - f.at[1]) > 1.5));
  }
});

test("the squares' troughs, café tables and string-light poles stand clear of the centrepiece, benches, kiosk and lamps", () => {
  for (const l of SQUARE_LAYOUTS) {
    assert.ok(l.troughs.length >= 2, `${l.square.name}'s troughs`);
    const [x0, z0, x1, z1] = l.square.rect;
    const things: Pt[] = [...l.lamps, ...l.planters, ...l.benches.map((b) => b.at), ...l.bollards, l.centre];
    for (const r of l.troughs) {
      assert.ok(r[0] >= x0 && r[2] <= x1 && r[1] >= z0 && r[3] <= z1);
      for (const [x, z] of things) assert.ok(x < r[0] - 0.5 || x > r[2] + 0.5 || z < r[1] - 0.5 || z > r[3] + 0.5, `a trough in ${l.square.name} on something at ${x}, ${z}`);
    }
    for (const [x, z] of [...l.cafe, ...l.poles]) {
      assert.ok(x > x0 && x < x1 && z > z0 && z < z1);
      assert.ok(!solidAt([x, z], 0.15), `${l.square.name}: a café table or pole in something solid`);
    }
  }
});
