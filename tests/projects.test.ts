// The Trenches' buildings (projects.ts, growth plan Phase 9 step 2): the towers on their blocks, off the streets and
// clear of each other, every one under the Emporium with its door facing out to a street; The Block's parts on its
// block and clear of the station's stair tower; the rows inside their blocks; and every footprint in SOLIDS.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMPORIUM_ROOF, PROJECT_SOLIDS, ROW_BLOCKS, THE_BLOCK, TOWERS, blockFence, rows } from '../src/scripts/city3d/projects';
import { TRENCH_BLOCKS } from '../src/scripts/city3d/trenches';
import { PLAN, distToStreet, inPoly } from '../src/scripts/city3d/streetplan';
import { METRO_SOLIDS, STATIONS } from '../src/scripts/city3d/metro';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { KIT_TALLEST } from '../src/scripts/city3d/kits';
import type { Pt, Rect } from '../src/scripts/city3d/downtown';

const corners = ([x0, z0, x1, z1]: Rect): Pt[] => [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
];
const overlap = (a: Rect, b: Rect, m = 0) => Math.min(a[2], b[2]) - Math.max(a[0], b[0]) > -m && Math.min(a[3], b[3]) - Math.max(a[1], b[1]) > -m;
const roads = PLAN.streets.filter((s) => s.kind !== 'alley');
const blockOf = (id: string) => TRENCH_BLOCKS.find((b) => b.id === id)!;

test('the towers: on their blocks with room round them, under the Emporium, doors out to a street', () => {
  assert.ok(TOWERS.length >= 20);
  assert.equal(new Set(TOWERS.map((t) => t.no)).size, TOWERS.length);
  for (const t of TOWERS) {
    const blk = blockOf(t.block);
    assert.equal(blk.row, 'B', `${t.id} stands on the projects' rows`);
    // A lawn round it: a metre and a half in from the block's edge
    for (const p of t.parts)
      for (const [x, z] of corners([p[0] - 1.5, p[1] - 1.5, p[2] + 1.5, p[3] + 1.5])) assert.ok(inPoly(blk.poly, [x, z]), `${t.id} on ${blk.id} at ${x}, ${z}`);
    assert.ok(t.top < EMPORIUM_ROOF - 0.5, `${t.id} under the Emporium`);
    assert.ok(t.h > 8 && t.floors >= 7 && t.floors <= 9);
    // Clear of every other tower, with room to walk between
    for (const o of TOWERS) if (o !== t) for (const p of t.parts) for (const q of o.parts) assert.ok(!overlap(p, q, 3), `${t.id} clear of ${o.id}`);
    // Its door just outside its own wall, with the street the way it faces and nothing of the tower between
    const n: Pt = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] }[t.door.face] as Pt;
    const { x, z } = t.door;
    assert.ok(!t.parts.some(([a, b, c, d]) => x > a && x < c && z > b && z < d), `${t.id}'s door outside it`);
    assert.ok(t.parts.some(([a, b, c, d]) => x - n[0] * 0.3 > a && x - n[0] * 0.3 < c && z - n[1] * 0.3 > b && z - n[1] * 0.3 < d), `${t.id}'s door on its wall`);
    let reached = false;
    for (let s = 0.5; s < 25 && !reached; s += 0.5) {
      const p: Pt = [x + n[0] * s, z + n[1] * s];
      assert.ok(!t.parts.some(([a, b, c, d]) => p[0] > a && p[0] < c && p[1] > b && p[1] < d));
      reached = !inPoly(blk.poly, p);
    }
    assert.ok(reached, `${t.id}'s door looks out to a street within 25`);
  }
  // Both shapes, and the ones round The Block the tallest
  assert.ok(TOWERS.some((t) => t.shape === 'cross') && TOWERS.some((t) => t.shape === 'slab'));
  assert.ok(!TOWERS.some((t) => t.block === THE_BLOCK.block));
});

test('The Block: its parts on its block, clear of each other and of the station', () => {
  const blk = blockOf(THE_BLOCK.block);
  const parts: [string, Rect][] = [
    ['plaza', THE_BLOCK.plaza],
    ['fence', THE_BLOCK.fence],
    ['playground', THE_BLOCK.playground],
    ['handball', THE_BLOCK.handball],
    ...THE_BLOCK.beds.map((b, i): [string, Rect] => [`bed ${i}`, b]),
  ];
  for (const [name, r] of parts) for (const p of corners(r)) assert.ok(inPoly(blk.poly, p), `${name} on The Block`);
  for (const [a, r] of parts)
    for (const [b, q] of parts) if (a !== b && a !== 'plaza' && b !== 'plaza') assert.ok(!overlap(r, q), `${a} clear of ${b}`);
  // The court inside its fence; the station's stair tower clear of everything but the plaza it stands by
  const [c0, c1, c2, c3] = THE_BLOCK.court;
  const [f0, f1, f2, f3] = THE_BLOCK.fence;
  assert.ok(c0 > f0 && c1 > f1 && c2 < f2 && c3 < f3);
  const tower = STATIONS.find((s) => s.id === 'trenches')!.tower as Rect;
  for (const [name, r] of parts) if (name !== 'plaza') assert.ok(!overlap(r, tower, 1), `${name} clear of the station`);
  for (const [x, z] of [...THE_BLOCK.poles, ...THE_BLOCK.tables, ...THE_BLOCK.benches.map(([x, z]): Pt => [x, z])]) {
    assert.ok(inPoly(blk.poly, [x, z]), `${x}, ${z} on The Block`);
    for (const [name, r] of parts) if (name !== 'plaza' && name !== 'playground') assert.ok(!overlap([x - 0.3, z - 0.3, x + 0.3, z + 0.3], r), `${x}, ${z} clear of ${name}`);
  }
  // The fence: a way in on each long side
  const runs = blockFence();
  assert.equal(runs.length, 6);
  const zm = (f1 + f3) / 2;
  for (const x of [f0, f2]) assert.ok(!runs.some(([a, b, c, d]) => x >= a - 1e-6 && x <= c + 1e-6 && zm > b && zm < d), 'a gate');
});

test('the rows: inside their blocks, off the streets, low, clear of the towers', () => {
  const laid = rows();
  assert.ok(laid.lots.length > 80);
  assert.equal(laid.byBlock.length, ROW_BLOCKS.length);
  ROW_BLOCKS.forEach((rb, i) => {
    const blk = blockOf(rb.id);
    assert.ok(blk.row !== 'B');
    for (const lot of laid.byBlock[i].lots) {
      const [a, b, c, d] = lot.box;
      for (const p of corners([a + 1e-6, b + 1e-6, c - 1e-6, d - 1e-6])) {
        assert.ok(inPoly(blk.poly, p), `${rb.id}'s ${lot.type} on its block at ${p}`);
        for (const s of roads) assert.ok(distToStreet(s, p) > s.half, `${rb.id}'s ${lot.type} on ${s.id}`);
      }
      for (const s of lot.solids) assert.ok(s[4] <= KIT_TALLEST && s[4] < EMPORIUM_ROOF - 0.5);
      for (const t of TOWERS) for (const p of t.parts) assert.ok(!overlap(lot.box, p), `${rb.id} clear of ${t.id}`);
    }
  });
});

test('every footprint is solid, and none is on a street or the metro', () => {
  assert.ok(PROJECT_SOLIDS.length > 100);
  for (const b of PROJECT_SOLIDS) {
    assert.ok(SOLIDS.includes(b));
    assert.ok(b[0] < b[2] && b[1] < b[3] && b[4] > 0);
    for (const p of corners([b[0], b[1], b[2], b[3]])) for (const s of roads) assert.ok(distToStreet(s, p) > s.half - 1e-6, `${b.join(', ')} on ${s.id}`);
    for (const m of METRO_SOLIDS) assert.ok(!overlap([b[0], b[1], b[2], b[3]], [m[0], m[1], m[2], m[3]]), `${b.join(', ')} on the metro`);
  }
  // Each tower is solid to its top
  for (const t of TOWERS) for (const p of t.parts) assert.ok(PROJECT_SOLIDS.some((b) => b[0] === p[0] && b[1] === p[1] && b[2] === p[2] && b[3] === p[3] && b[4] === t.top));
});
