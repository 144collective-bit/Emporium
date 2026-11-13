// The Trenches' streets and yards filled in (yardbits.ts, docs/trenches-variety-plan.md Phase 5): the benches, racks and
// planters stand inside their yards, clear of everything the grit keeps clear, the worn ground, the trees, the dumpsters
// and each other; the poles stand clear of what's built and of the trees; no wire is longer than WIRE_MAX or crosses
// anything built.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BIT_HALF, POLE, POLE_TREE, POLE_WIRES, STREET_POLES, WIRE_MAX, YARD_BITS } from '../src/scripts/city3d/yardbits';
import { DUMPSTERS, PATCHES, YARDS, YARD_TREES, taken } from '../src/scripts/city3d/grit';
import { built } from '../src/scripts/city3d/streetwall';
import { TOWERS } from '../src/scripts/city3d/projects';
import { overlaps } from '../src/scripts/city3d/commons';
import type { Rect } from '../src/scripts/city3d/downtown';

const box = (x: number, z: number, h: number): Rect => [x - h, z - h, x + h, z + h];
const bounds = (id: string): Rect => {
  const p = YARDS.find((y) => y.id === id)!.poly;
  return [Math.min(...p.map((q) => q[0])), Math.min(...p.map((q) => q[1])), Math.max(...p.map((q) => q[0])), Math.max(...p.map((q) => q[1]))];
};

test('the yards are furnished: benches, racks and planters, in most yards', () => {
  for (const k of ['bench', 'rack', 'planter'] as const) assert.ok(YARD_BITS.filter((b) => b.kind === k).length >= 10, k);
  assert.ok(new Set(YARD_BITS.map((b) => b.block)).size >= YARDS.length / 2, 'most yards have something');
});

test('every bit stands inside its yard, clear of the kept ground, the patches, the trees, the dumpsters and each other', () => {
  for (const b of YARD_BITS) {
    const [x0, z0, x1, z1] = bounds(b.block);
    const me = box(b.x, b.z, BIT_HALF);
    assert.ok(b.x - BIT_HALF >= x0 && b.x + BIT_HALF <= x1 && b.z - BIT_HALF >= z0 && b.z + BIT_HALF <= z1, `${b.kind} at ${b.x},${b.z} outside`);
    assert.ok(!taken(b.block).some((k) => overlaps(k, me)), `${b.kind} at ${b.x},${b.z} on kept ground`);
    assert.ok(!PATCHES.filter((p) => p.block === b.block).some((p) => overlaps(p.rect, me)), `${b.kind} on a patch`);
    assert.ok(!YARD_TREES.some((t) => Math.hypot(t.x - b.x, t.z - b.z) < 1 + BIT_HALF * 0.5), `${b.kind} under a tree`);
    assert.ok(!DUMPSTERS.some((d) => overlaps(d.rect, me)), `${b.kind} on a dumpster`);
    assert.ok(Math.abs((b.ry / (Math.PI / 2)) % 1) < 1e-9, 'a quarter turn');
  }
  for (let i = 0; i < YARD_BITS.length; i++)
    for (let j = i + 1; j < YARD_BITS.length; j++) {
      const [a, c] = [YARD_BITS[i], YARD_BITS[j]];
      assert.ok(!overlaps(box(a.x, a.z, BIT_HALF), box(c.x, c.z, BIT_HALF)), `two bits at ${a.x},${a.z}`);
    }
});

test("the poles stand clear of what's built, the kept ground and the trees, and the wires are short and cross nothing built", () => {
  assert.ok(STREET_POLES.length > 40 && POLE_WIRES.length > 20, `${STREET_POLES.length} poles, ${POLE_WIRES.length} wires`);
  for (const p of STREET_POLES) {
    assert.ok(!built(p.block).some((k) => overlaps(k, box(p.x, p.z, POLE.r))), `a pole in a building at ${p.x},${p.z}`);
    assert.ok(!taken(p.block).some((k) => overlaps(k, box(p.x, p.z, POLE.r))), `a pole on kept ground at ${p.x},${p.z}`);
    assert.ok(!YARD_TREES.some((t) => Math.hypot(t.x - p.x, t.z - p.z) < POLE_TREE), `a pole in a tree at ${p.x},${p.z}`);
  }
  const all = [...YARDS.flatMap((y) => built(y.id)), ...TOWERS.flatMap((t) => t.parts.map((q) => q.rect))];
  for (const [a, c] of POLE_WIRES) {
    assert.ok(Math.hypot(c[0] - a[0], c[1] - a[1]) <= WIRE_MAX, 'a wire too long');
    const span: Rect = [Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.max(a[0], c[0]), Math.max(a[1], c[1])];
    assert.ok(!all.some((k) => overlaps(k, span)), `a wire across a building from ${a} to ${c}`);
    assert.ok(STREET_POLES.some((p) => p.x === a[0] && p.z === a[1]) && STREET_POLES.some((p) => p.x === c[0] && p.z === c[1]), 'a wire ends on a pole');
  }
});
