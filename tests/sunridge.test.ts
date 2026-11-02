// Sunridge, the suburb (sunridge.ts, sunridgelots.ts; docs/suburb-plan.md Phase 1): its land clear of Palm Court, the
// Parkway's bend and the highway; its streets in the plan and joined at their crossings, driven by the traffic; its
// blocks covering the land between them, never on a street; its lots on their blocks, none over another or a street,
// about 120 of them; its wall solid with gaps at the entrances and the footpath; its lamps on the sidewalks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENTRIES, LAND, LOT_D, MESA, PARKWAY_LOOP, PATH, SUN_BLOCKS, SUN_CROSSINGS, SUN_LAMPS, SUN_SOLIDS, SUN_STREETS, SUNRIDGE_RECT, WALL_RUNS, ZONES, distTo, inSunridge, inside, type Pt } from '../src/scripts/city3d/sunridge';
import { LOTS, MIN_D, MIN_W, outline } from '../src/scripts/city3d/sunridgelots';
import { PLAN } from '../src/scripts/city3d/streetplan';
import { COURT } from '../src/scripts/city3d/mall';
import { fromHighway, HIGHWAY_HALF } from '../src/scripts/city3d/highway';
import { ROUTES } from '../src/scripts/city3d/routes';
import { WALK_W } from '../src/scripts/city3d/layout';
import { SOLIDS } from '../src/scripts/city3d/solids';

const streetsOf = SUN_STREETS.map((s) => PLAN.streets.find((t) => t.id === s.id)!);
// (an entrance's line ends at the loop's middle: as asphalt it stops at the loop's kerb)
const lineOf = (s: (typeof SUN_STREETS)[number]): Pt[] => (s.id.startsWith('sun-entry') ? [s.pts[0], [s.pts[1][0], s.pts[1][1] + 2.5]] : s.pts);
const onStreet = (p: Pt, m = 0) => SUN_STREETS.some((s) => distTo(lineOf(s), p, !!s.loop) < s.half + m);

test('the land: clear of Palm Court, the Parkway and its outer kerb, the other blocks and the highway (with room for its ramps)', () => {
  for (const p of LAND) {
    assert.ok(p[0] > COURT[2] + WALK_W * 2 + 1, `the land over Palm Court at ${p}`);
    assert.ok(fromHighway(p[0], p[1]) > HIGHWAY_HALF + 14, `the land too near the highway at ${p}`);
  }
  // (no other block's slab within reach of Sunridge's)
  const mine = new Set(SUN_BLOCKS.map((b) => b.id));
  for (const [i, b] of PLAN.blocks.entries()) {
    if (mine.has(b.id)) continue;
    for (const p of PLAN.slabs[i]) assert.ok(!inSunridge(p[0], p[1], WALK_W + 1), `${b.id} on Sunridge's land at ${p}`);
  }
  assert.ok(inSunridge(180, -80) && !inSunridge(100, -80) && !inSunridge(250, -145));
  assert.ok(SUNRIDGE_RECT[2] > SUNRIDGE_RECT[0] + 140);
});

test('the streets: in the plan, the loop a lot deep in from the land, every crossing on both its streets, the entrances on the avenue', () => {
  for (const s of streetsOf) assert.ok(s, 'a street missing from the plan');
  for (const p of PARKWAY_LOOP) assert.ok(distTo(LAND, p, true) > LOT_D + 2.4, `the loop too near the land's edge at ${p}`);
  assert.deepEqual(PARKWAY_LOOP[0], PARKWAY_LOOP[PARKWAY_LOOP.length - 1]);
  for (const c of SUN_CROSSINGS) {
    const pc = PLAN.crossings.find((x) => x.id === c.id)!;
    assert.ok(pc, `crossing ${c.id} missing`);
    for (const id of c.streets) {
      const s = PLAN.streets.find((t) => t.id === id)!;
      assert.ok(distTo(s.pts, c.at, !!s.loop) < 1e-6, `${c.id} not on ${id}`);
    }
  }
  for (const e of ENTRIES) assert.equal(e.pts[0][1], -4.5);
  // Mesa Drive and the courts start on the streets they leave
  assert.ok(distTo(PARKWAY_LOOP, MESA.pts[0], true) < 1e-6 && distTo(PARKWAY_LOOP, MESA.pts[MESA.pts.length - 1], true) < 1e-6);
});

test('the traffic drives the loop, Mesa Drive and the entrances (not the cul-de-sacs)', () => {
  const driven = (id: string) => {
    const s = SUN_STREETS.find((t) => t.id === id)!;
    const mid = s.pts[Math.floor(s.pts.length / 2)];
    return ROUTES.some((r) => r.pts.some((p) => Math.hypot(p[0] - mid[0], p[1] - mid[1]) < s.half + 0.5));
  };
  for (const id of ['sun-parkway', 'sun-mesa', 'sun-entry-w', 'sun-entry-e']) assert.ok(driven(id), `no traffic on ${id}`);
});

test('the blocks: the land between the streets, wound as the plan wants, never on a street', () => {
  assert.ok(SUN_BLOCKS.length >= 4);
  let a = 0;
  for (const b of SUN_BLOCKS) {
    let s = 0;
    for (let i = 0; i < b.poly.length; i++) {
      const [p, q] = [b.poly[i], b.poly[(i + 1) % b.poly.length]];
      s += p[0] * q[1] - q[0] * p[1];
    }
    assert.ok(s < 0, `${b.id} wound the wrong way`);
    a += -s / 2;
    for (const p of b.poly) {
      assert.ok(!onStreet(p, WALK_W - 0.05), `${b.id}'s edge on a street or its sidewalk at ${p}`);
      assert.ok(inside(LAND, p) || distTo(LAND, p, true) < 1e-6, `${b.id} outside the land at ${p}`);
    }
    assert.ok(b.runs.length >= 1);
  }
  // (most of the land: all of it but the streets and their sidewalks)
  let land = 0;
  for (let i = 0; i < LAND.length; i++) land += LAND[i][0] * LAND[(i + 1) % LAND.length][1] - LAND[(i + 1) % LAND.length][0] * LAND[i][1];
  land = Math.abs(land) / 2;
  assert.ok(a > land * 0.78 && a < land, `the blocks cover ${((a / land) * 100).toFixed(0)}% of the land`);
});

test('the lots: about a hundred and ten, on their blocks, none over another, a street, the amenities or the footpath', () => {
  assert.ok(LOTS.length >= 100 && LOTS.length <= 135, `${LOTS.length} lots`);
  const blocks = new Map(SUN_BLOCKS.map((b) => [b.id, b]));
  for (const l of LOTS) {
    const b = blocks.get(l.block)!;
    const o = outline(l);
    const mid: Pt = [(o[0][0] + o[1][0] + o[2][0] + o[3][0]) / 4, (o[0][1] + o[1][1] + o[2][1] + o[3][1]) / 4];
    assert.ok(inside(b.poly, mid), `${l.id} off its block`);
    for (const p of o) assert.ok(!onStreet(p, WALK_W - 0.05), `${l.id} on a street at ${p}`);
    assert.ok(l.depth >= MIN_D - 1e-9);
    const w = Math.hypot(l.front[1][0] - l.front[0][0], l.front[1][1] - l.front[0][1]);
    assert.ok(w >= MIN_W - 0.05, `${l.id} only ${w.toFixed(2)} wide`);
    for (const z of [...ZONES.map((q) => q.rect), PATH]) assert.ok(!(mid[0] > z[0] && mid[0] < z[2] && mid[1] > z[1] && mid[1] < z[3]), `${l.id} on kept land`);
  }
  // (no two overlapping: no lot's middle in another's outline)
  for (const a of LOTS)
    for (const b of LOTS) {
      if (a === b) continue;
      const o = outline(a);
      const mid: Pt = [(o[0][0] + o[2][0]) / 2, (o[0][1] + o[2][1]) / 2];
      assert.ok(!inside(outline(b), mid), `${a.id} over ${b.id}`);
    }
  // Every cul-de-sac has houses round it
  for (const id of ['sun-court-0', 'sun-court-1', 'sun-court-2']) assert.ok(LOTS.filter((l) => l.street === id).length >= 2, `${id} has no lots`);
});

test('the wall: solid, round the land but at the entrances and the footpath; the lamps on the sidewalks', () => {
  assert.ok(WALL_RUNS.length >= 2);
  for (const s of SUN_SOLIDS) assert.ok(SOLIDS.some((t) => t.every((v, i) => v === s[i])), 'a wall box missing from SOLIDS');
  for (const run of WALL_RUNS)
    for (const p of run) {
      assert.ok(!onStreet(p, WALK_W + 0.1), `the wall across a street at ${p}`);
      assert.ok(!(p[0] > PATH[0] && p[0] < PATH[2] && p[1] > PATH[1] && p[1] < PATH[3]), 'the wall across the footpath');
    }
  assert.ok(SUN_LAMPS.length >= 50);
  for (const [x, z] of SUN_LAMPS) {
    assert.ok(!onStreet([x, z], 0.2), `a lamp on the asphalt at ${x}, ${z}`);
    assert.ok(onStreet([x, z], WALK_W), `a lamp off the sidewalk at ${x}, ${z}`);
  }
});
