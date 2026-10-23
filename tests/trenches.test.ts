// The Trenches (trenches.ts, growth plan Phase 9): its streets and blocks on the south-west quadrant inside the ring
// highway, clear of the highway, the river, the town's south row and everything that stands; every street end a
// junction (so traffic runs it), lights all along Trench Avenue; and the blocks between the streets, off them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AVENUE_Z, BANK, HIGHWAY_CLEAR, RING_W, TRENCH_BLOCKS, TRENCH_CROSSINGS, TRENCH_RECT, TRENCH_STREETS, inTrenches } from '../src/scripts/city3d/trenches';
import { PLAN, distToStreet, inPoly, outset, polyArea } from '../src/scripts/city3d/streetplan';
import { fromHighway, insideHighway } from '../src/scripts/city3d/highway';
import { RIVER, WALK_W } from '../src/scripts/city3d/layout';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PROJECT_SOLIDS } from '../src/scripts/city3d/projects';
import { COMMONS_SOLIDS } from '../src/scripts/city3d/commons';
import { GRIT_SOLIDS } from '../src/scripts/city3d/grit';
import { PADS } from '../src/scripts/city3d/outer';
import { ROUTES, pointOn } from '../src/scripts/city3d/routes';

const others = PLAN.blocks.filter((b) => !b.id.startsWith('trench-'));

test('its streets: south of the river, inside the highway and clear of it, every end at a junction', () => {
  for (const s of TRENCH_STREETS) {
    for (const p of s.pts) {
      assert.ok(p[1] > RIVER[1], `${s.id} south of the river`);
      assert.ok(insideHighway(p[0], p[1]) && fromHighway(p[0], p[1]) > HIGHWAY_CLEAR - 1e-6, `${s.id} clear of the highway at ${p}`);
      assert.ok(
        TRENCH_CROSSINGS.some((c) => c.streets.includes(s.id) && Math.hypot(c.at[0] - p[0], c.at[1] - p[1]) < 1e-6),
        `${s.id}'s end ${p} is a junction`
      );
    }
    // Along its length, never over a block that was there before (the south row, its bend's sidewalk) or a pad
    const [a, b] = s.pts;
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
    for (let k = 0; k <= n; k++) {
      const p: [number, number] = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n];
      for (const o of others) assert.ok(!inPoly(o.poly, p), `${s.id} through ${o.id} at ${p}`);
      for (const pad of PADS) assert.ok(!(p[0] > pad.rect[0] && p[0] < pad.rect[2] && p[1] > pad.rect[1] && p[1] < pad.rect[3]), `${s.id} over ${pad.id}`);
    }
  }
  // Trench Avenue's junctions have lights; its cross streets meet the bank avenue and the west ring avenue
  for (const c of TRENCH_CROSSINGS) assert.equal(c.lights, c.streets.includes('trench-ave'), c.id);
  const ave = TRENCH_STREETS.find((s) => s.id === 'trench-ave')!;
  assert.equal(ave.kind, 'avenue');
  assert.ok(ave.pts.every((p) => p[1] === AVENUE_Z));
  assert.ok(TRENCH_CROSSINGS.some((c) => c.streets.includes(`ew${PLAN.streets.filter((s) => s.id.startsWith('ew')).length - 1}`)));
  assert.ok(TRENCH_CROSSINGS.some((c) => c.streets.includes('ns0') && c.at[0] === RING_W.c));
});

test('its blocks: between its streets and off them, clear of the highway, the town and everything that stands', () => {
  assert.ok(TRENCH_BLOCKS.length >= 18);
  assert.equal(new Set(TRENCH_BLOCKS.map((b) => b.id)).size, TRENCH_BLOCKS.length);
  const roads = PLAN.streets.filter((s) => s.kind !== 'alley');
  for (const b of TRENCH_BLOCKS) {
    assert.ok(polyArea(b.poly) > 100, `${b.id} is a block, counter-clockwise`);
    const slab = outset(b.poly, WALK_W);
    for (const p of slab) {
      assert.ok(insideHighway(p[0], p[1]) && fromHighway(p[0], p[1]) > HIGHWAY_CLEAR - WALK_W - 0.3, `${b.id} clear of the highway at ${p.map((v) => v.toFixed(1))}`);
      for (const s of roads) assert.ok(distToStreet(s, p) >= s.half - 1e-6, `${b.id}'s sidewalk on ${s.id}`);
      assert.ok(p[1] > BANK.c + BANK.half - 1e-6);
      for (const o of others) assert.ok(!inPoly(o.poly, p), `${b.id} on ${o.id}`);
    }
    // Nothing that stands is on it but the metro's (its stair tower at The Trenches) and The Trenches' own (projects.ts, commons.ts, grit.ts)
    for (const box of SOLIDS) {
      if (PROJECT_SOLIDS.includes(box) || COMMONS_SOLIDS.includes(box) || GRIT_SOLIDS.includes(box)) continue;
      const c: [number, number] = [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
      if (inPoly(b.poly, c)) assert.ok(box[4] !== undefined && box[4] > 5, `${b.id} has a box on it at ${box.join(', ')}`);
    }
    // Its middle is The Trenches' land
    const m = b.poly.reduce((a, p) => [a[0] + p[0] / b.poly.length, a[1] + p[1] / b.poly.length], [0, 0]);
    assert.ok(inTrenches(m[0], m[1]));
  }
  // Rows: A along Trench Avenue's north side, B the projects, C along the highway
  assert.ok(TRENCH_BLOCKS.filter((b) => b.row === 'A').every((b) => b.poly.every((p) => p[1] < AVENUE_Z)));
  assert.ok(TRENCH_BLOCKS.filter((b) => b.row !== 'A').every((b) => b.poly.every((p) => p[1] > AVENUE_Z)));
  // Not the town
  assert.ok(!inTrenches(30, 30) && !inTrenches(0, 110));
  assert.ok(TRENCH_RECT[0] < TRENCH_RECT[2] && TRENCH_RECT[1] < TRENCH_RECT[3]);
});

test('traffic runs every one of its streets', () => {
  const all = ROUTES.flatMap((r) => {
    const out: [number, number][] = [];
    for (let p = 0, seg = 0; p <= r.len; p += 1) {
      const o = pointOn(r, p, seg);
      seg = o.seg;
      out.push(o.at);
    }
    return out;
  });
  for (const s of TRENCH_STREETS) {
    const [a, b] = s.pts;
    const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    assert.ok(all.some((p) => distToStreet(s, p) < s.half && Math.hypot(p[0] - mid[0], p[1] - mid[1]) < 40), `traffic on ${s.id}`);
  }
});
