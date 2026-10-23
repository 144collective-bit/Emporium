// The Trenches' buildings (projects.ts, growth plan Phase 9 step 2): the towers on their blocks, off the streets and
// clear of each other, every one under the Emporium with its door facing out to a street; The Block's parts on its
// block and clear of the station's stair tower; the rows inside their blocks; and every footprint in SOLIDS.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CORNER_SHOPS, TOWER_DESIGNS, towerShell, EMPORIUM_ROOF, PROJECT_SOLIDS, ROW_BLOCKS, THE_BLOCK, TOWERS, blockFence, isCorner, rows } from '../src/scripts/city3d/projects';
import { WALK_W } from '../src/scripts/city3d/layout';
import { TRENCH_BLOCKS } from '../src/scripts/city3d/trenches';
import { PLAN, distToStreet, inPoly, outset } from '../src/scripts/city3d/streetplan';
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
    const rects = t.parts.map((p) => p.rect);
    for (const p of rects)
      for (const [x, z] of corners([p[0] - 1.5, p[1] - 1.5, p[2] + 1.5, p[3] + 1.5])) assert.ok(inPoly(blk.poly, [x, z]), `${t.id} on ${blk.id} at ${x}, ${z}`);
    assert.ok(t.top < EMPORIUM_ROOF - 0.5, `${t.id} under the Emporium`);
    // 4 to 10 storeys (walk-ups to point towers), the tallest part the one with the stair house
    assert.ok(t.parts.every((p) => p.floors >= 3 && p.floors <= 9 && p.h <= t.h && p.rect[2] - p.rect[0] >= 4 && p.rect[3] - p.rect[1] >= 4), `${t.id}'s parts`);
    assert.equal(t.parts[t.main].h, t.h);
    // Clear of every other tower (and its stoops and scaffolding), with room to walk between
    const ext = (o: typeof t) => [...o.parts.map((p) => p.rect), ...o.stoops, ...(o.scaffold ? [o.scaffold] : [])];
    for (const o of TOWERS) if (o !== t) for (const p of ext(t)) for (const q of ext(o)) assert.ok(!overlap(p, q, 3), `${t.id} clear of ${o.id}`);
    // Its stoops and scaffolding on its lawn, against its walls
    for (const st of [...t.stoops, ...(t.scaffold ? [t.scaffold] : [])]) {
      for (const p of corners(st)) assert.ok(inPoly(blk.poly, p), `${t.id}'s stoop on its block`);
      assert.ok(rects.some((p) => overlap(st, p, 1e-6)) && !rects.some((p) => overlap(st, p)), `${t.id}'s stoop against its wall`);
    }
    // Its walls close round it: every wall's two ends meet other walls, and each faces out of the tower
    const { walls, roofs } = towerShell(t.parts);
    const inside = ([x, z]: Pt) => rects.some(([a, b, c, d]) => x > a && x < c && z > b && z < d);
    for (const w of walls) {
      const m: Pt = [(w.a[0] + w.c[0]) / 2, (w.a[1] + w.c[1]) / 2];
      assert.ok(inside([m[0] - w.n[0] * 0.05, m[1] - w.n[1] * 0.05]), `${t.id}'s wall faces out`);
      assert.ok(w.y1 > w.y0 && w.y0 >= 0 && Number.isInteger(w.y0), `${t.id}'s wall starts on a floor line`);
    }
    for (let i = 0; i < walls.length; i++)
      for (let j = i + 1; j < walls.length; j++) {
        const [p, q] = [walls[i], walls[j]];
        // No two walls in one plane, facing one way, overlapping (they'd flicker)
        const same = p.n[0] === q.n[0] && p.n[1] === q.n[1] && (p.n[0] ? p.a[0] === q.a[0] : p.a[1] === q.a[1]);
        if (!same) continue;
        const [p0, p1] = p.n[0] ? [Math.min(p.a[1], p.c[1]), Math.max(p.a[1], p.c[1])] : [Math.min(p.a[0], p.c[0]), Math.max(p.a[0], p.c[0])];
        const [q0, q1] = q.n[0] ? [Math.min(q.a[1], q.c[1]), Math.max(q.a[1], q.c[1])] : [Math.min(q.a[0], q.c[0]), Math.max(q.a[0], q.c[0])];
        const along = Math.min(p1, q1) - Math.max(p0, q0) > 1e-6;
        const up = Math.min(p.y1, q.y1) - Math.max(p.y0, q.y0) > 1e-6;
        assert.ok(!(along && up), `${t.id}: two walls in one plane`);
      }
    // The roofs cover its footprint exactly once over
    const area = (r: Rect) => (r[2] - r[0]) * (r[3] - r[1]);
    const cover = roofs.reduce((a, rf) => a + area(rf.rect), 0);
    const xs = [...new Set(rects.flatMap((p) => [p[0], p[2]]))].sort((a, b) => a - b);
    const zs = [...new Set(rects.flatMap((p) => [p[1], p[3]]))].sort((a, b) => a - b);
    let foot = 0;
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) if (inside([(xs[i] + xs[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2])) foot += (xs[i + 1] - xs[i]) * (zs[j + 1] - zs[j]);
    assert.ok(Math.abs(cover - foot) < foot * 0.01, `${t.id}'s roofs cover it`);
    // Its door just outside its own wall, with the street the way it faces and nothing of the tower between
    const n: Pt = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] }[t.door.face] as Pt;
    const { x, z } = t.door;
    assert.ok(!rects.some(([a, b, c, d]) => x > a && x < c && z > b && z < d), `${t.id}'s door outside it`);
    assert.ok(rects.some(([a, b, c, d]) => x - n[0] * 0.3 > a && x - n[0] * 0.3 < c && z - n[1] * 0.3 > b && z - n[1] * 0.3 < d), `${t.id}'s door on its wall`);
    let reached = false;
    for (let s = 0.5; s < 25 && !reached; s += 0.5) {
      const p: Pt = [x + n[0] * s, z + n[1] * s];
      assert.ok(!rects.some(([a, b, c, d]) => p[0] > a && p[0] < c && p[1] > b && p[1] < d));
      reached = !inPoly(blk.poly, p);
    }
    assert.ok(reached, `${t.id}'s door looks out to a street within 25`);
  }
  // Every design, and every brick, in the mix; most of it red; the tallest the point towers; scaffolding on one
  for (const d of TOWER_DESIGNS) assert.ok(TOWERS.some((t) => t.design === d), `a ${d}`);
  assert.ok(TOWERS.filter((t) => t.brick === 'brick').length > TOWERS.length / 2);
  assert.ok(new Set(TOWERS.map((t) => t.brick)).size >= 3);
  assert.equal(Math.max(...TOWERS.map((t) => t.floors)), Math.max(...TOWERS.filter((t) => t.design === 'point').map((t) => t.floors)));
  assert.equal(TOWERS.filter((t) => t.scaffold).length, 1);
  // No two towers on a block of one design and size, and each block its own layout
  const layouts = new Map<string, string>();
  for (const t of TOWERS) layouts.set(t.block, `${layouts.get(t.block) ?? ''}|${t.design}`);
  assert.ok(new Set(layouts.values()).size >= layouts.size - 2, 'blocks laid out differently');
  // Not on The Block, nor on the rec centre's block east of it (step B)
  assert.ok(!TOWERS.some((t) => t.block === THE_BLOCK.block || t.block === 'trench-b0-3'));
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
  // (row A's blocks a strip each along Trench Avenue, row C's along Bottom Street: the riverside is riverside.ts's)
  assert.ok(laid.lots.length > 40);
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
      for (const t of TOWERS) for (const p of t.parts) assert.ok(!overlap(lot.box, p.rect), `${rb.id} clear of ${t.id}`);
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
  // Each tower is solid to its roofs (the tallest part to the top of its stair house or tank), its stoops too
  for (const t of TOWERS) {
    t.parts.forEach((p, i) => assert.ok(PROJECT_SOLIDS.some((b) => b.slice(0, 4).join() === p.rect.join() && b[4] === (i === t.main ? t.top : p.h))));
    for (const st of t.stoops) assert.ok(PROJECT_SOLIDS.some((b) => b.slice(0, 4).join() === st.join()));
  }
});

test('the corner shops: four row lots made shops, each facing its street, the door out on the sidewalk, a car can pull up', () => {
  assert.equal(CORNER_SHOPS.length, 4);
  assert.deepEqual(
    CORNER_SHOPS.map((c) => c.id),
    ['c0', 'c1', 'c2', 'c3']
  );
  assert.equal(new Set(CORNER_SHOPS.map((c) => c.name)).size, 4);
  for (const c of CORNER_SHOPS) {
    const blk = blockOf(c.block);
    assert.equal(c.lot.type, 'shop');
    assert.ok(isCorner(c.lot) && rows().lots.includes(c.lot));
    assert.ok(c.lot.solids.every((b) => b[4] < EMPORIUM_ROOF - 0.5) && c.lot.solids.length === 1, 'a shopfront, no stoop');
    for (const b of c.lot.solids) assert.ok(PROJECT_SOLIDS.some((p) => p.join() === b.join()));
    // The door: off the block, on its sidewalk (within the slab), clear of everything solid
    const { x, z } = c.door;
    assert.ok(!inPoly(blk.poly, [x, z]) && inPoly(outset(blk.poly, WALK_W), [x, z]), `${c.id}'s door on the sidewalk`);
    assert.ok(!SOLIDS.some((b) => x > b[0] - 0.3 && x < b[2] + 0.3 && z > b[1] - 0.3 && z < b[3] + 0.3), `${c.id}'s door clear`);
    // A drivable street within a car's reach of it (the business card's Car tab)
    assert.ok(roads.some((s) => s.kind !== 'highway' && distToStreet(s, [x, z]) - s.half < 1.5), `${c.id} on a street`);
  }
  // Spread out: no two on one block
  assert.equal(new Set(CORNER_SHOPS.map((c) => c.block)).size, 4);
});
