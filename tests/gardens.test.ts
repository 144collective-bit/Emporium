// Westlake Park's walks, walls and gardens (gardens.ts, the north side's stage 3) and its lakeside terraces
// (westlake.ts): kerbs and edges along the walks but never across another; the park's wall round its edge, open at
// every gate and walk; the formal garden on the stadium's old site with its walks, parterres and fountains; planters
// clear of everything; terraces stepping down to the water that you can walk out on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EDGES,
  FOUNTAIN,
  GARDEN_BENCHES,
  GARDEN_IN,
  GARDEN_LAMPS,
  GARDEN_PEOPLE,
  GARDEN_SOLIDS,
  GARDEN_WALLS,
  HEDGE,
  KERB,
  KERBS,
  MAIN_WALKS,
  MALL_BEDS,
  PARTERRES,
  PLANTERS,
  ROUNDS,
  URNS,
  WALL,
  WALLS,
} from '../src/scripts/city3d/gardens';
import {
  BENCHES,
  BIG,
  GARDEN_SITE,
  GARDEN_XS,
  GARDEN_Z,
  GATES,
  JETTY,
  LAKE_C,
  MALL,
  PARK_LAMPS,
  PARK_TREES,
  PATHS,
  TERRACES,
  TERRACE_STEPS,
  distToLine,
  inLake,
  inPark,
  lakeAt,
  onPath,
  onTerrace,
  terraceY,
  type Pt,
} from '../src/scripts/city3d/westlake';
import { RINGS, ringLine } from '../src/scripts/city3d/parklife';
import { SOLIDS, SOLID_GRID } from '../src/scripts/city3d/solids';

const inBox = (b: readonly number[], x: number, z: number, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;
const blocked = (p: Pt, r = 0.3) => SOLID_GRID.near(p[0], p[1], r).some((b) => inBox(b, p[0], p[1], r));

test('the main walks are kerbed both sides, the rest edged; neither ever runs across another path, the jetty or a terrace', () => {
  for (const id of MAIN_WALKS) for (const side of [1, -1]) assert.ok(KERBS.some((k) => k.path === id && k.side === side), `${id} kerbed on its ${side} side`);
  for (const q of PATHS.filter((r) => !MAIN_WALKS.includes(r.id))) assert.ok(EDGES.some((e) => e.path === q.id), `${q.id} edged`);
  assert.ok(KERB.h > 0.04 && KERB.h < 0.15, 'a raised kerb, low enough to step over');
  for (const set of [KERBS, EDGES])
    for (const run of set) {
      const own = PATHS.find((q) => q.id === run.path)!;
      for (const p of run.pts) {
        // Along its own walk's edge (its corners mitred)
        assert.ok(Math.abs(distToLine(own.pts, p, own.loop) - own.half) < 0.5, `${run.path}'s edge off its edge at ${p}`);
        for (const q of PATHS) if (q !== own) assert.ok(distToLine(q.pts, p, q.loop) > q.half, `${run.path}'s edge across ${q.id} at ${p}`);
        assert.ok(!onTerrace(p[0], p[1], -0.3), `${run.path}'s edge on a terrace`);
        assert.ok(!(Math.abs(p[0] - JETTY.x) < JETTY.half + 0.2 && p[1] > JETTY.z0 - 0.4 && p[1] < JETTY.z1), `${run.path}'s edge across the jetty`);
      }
    }
});

test('the park\'s wall: round the edge of every block, open at each gate and where every walk goes out, never on a path', () => {
  assert.ok(WALLS.length >= BIG.length / 4 && WALLS.flat().length > 1000);
  for (const run of WALLS)
    for (const p of run) {
      assert.ok(inPark(p, 0.3) && !inPark(p, 0.6), `the wall off the park's edge at ${p}`);
      assert.ok(!onPath(p, WALL.w / 2), `the wall across a path at ${p}`);
    }
  // Every gate open: its path's middle clear, and the wall either side of it
  for (const g of GATES) {
    const inside: Pt = [g.at[0] - g.out[0] * WALL.in, g.at[1] - g.out[1] * WALL.in];
    assert.ok(!blocked(inside, 0.3), `${g.id} shut`);
  }
  // Every path that reaches a block's edge gets out through it
  for (const q of PATHS)
    for (const e of [q.pts[0], q.pts.at(-1)!])
      if (!inPark(e, 1)) assert.ok(!WALLS.some((r) => r.some((p) => Math.hypot(p[0] - e[0], p[1] - e[1]) < q.half)), `${q.id} walled in at ${e}`);
  assert.ok(WALL.h + 0.15 < 1 && WALL.h > 0.3, 'a low wall');
});

test('the formal garden: walled on the stadium\'s old site, open at the Mall and its walks, its parterres hedged round, a fountain in each round place', () => {
  const [x0, z0, x1, z1] = GARDEN_SITE;
  for (const r of GARDEN_WALLS) for (const p of r) assert.ok(p[0] >= x0 && p[0] <= x1 && p[1] >= z0 && p[1] <= z1);
  // Open where the Mall, the cross walk and the garden's walks come through
  for (const p of [
    [MALL.x, GARDEN_IN[1]],
    [MALL.x, GARDEN_IN[3]],
    [GARDEN_IN[0], GARDEN_Z],
    [GARDEN_IN[2], GARDEN_Z],
    ...GARDEN_XS.map((x) => [x, GARDEN_IN[1]]),
  ] as Pt[])
    assert.ok(!blocked(p, 0.35), `the garden shut at ${p}`);
  // Walking through: down the Mall and along the cross walk to each fountain's rim
  for (let z = z0 - 1; z < z1 + 1; z += 0.25) assert.ok(!blocked([MALL.x, z], 0.35), `the Mall blocked at ${z}`);
  for (let x = x0 - 1; x < x1 + 1; x += 0.25) if (ROUNDS.every((r) => Math.abs(x - r.c[0]) > FOUNTAIN.r + 0.5)) assert.ok(!blocked([x, GARDEN_Z], 0.35), `the cross walk blocked at ${x}`);
  // Eight parterres, each inside the garden, off every path, its bed inside its hedge, the hedge open on one side
  assert.equal(PARTERRES.length, 8);
  for (const pt of PARTERRES) {
    for (const p of pt.line) assert.ok(p[0] > GARDEN_IN[0] && p[0] < GARDEN_IN[2] && p[1] > GARDEN_IN[1] && p[1] < GARDEN_IN[3], `a hedge outside the garden at ${p}`);
    for (const r of pt.hedge) for (const p of r) assert.ok(!onPath(p, HEDGE.w / 2 + 0.05), `a hedge on a path at ${p}`);
    for (const r of ROUNDS) for (const p of pt.line) assert.ok(Math.hypot(p[0] - r.c[0], p[1] - r.c[1]) > r.r + 0.3, 'a hedge in the round place');
    // Hedged all round but the gap
    const len = (r: Pt[]) => r.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - r[i - 1][0], p[1] - r[i - 1][1]) : 0), 0);
    const round = len([...pt.line, pt.line[0]]);
    const hedged = pt.hedge.reduce((a, r) => a + len(r), 0);
    assert.ok(hedged > round - 3 && hedged < round, `hedged ${hedged.toFixed(1)} of ${round.toFixed(1)}`);
    assert.ok(!blocked(pt.gap, 0.2), 'its hedge open at the gap');
    for (const p of pt.bed) assert.ok(!onPath(p, 0.5), `a bed on a path at ${p}`);
  }
  for (const r of ROUNDS) {
    assert.ok(onPath(r.c) && GARDEN_XS.includes(r.c[0]) && r.c[1] === GARDEN_Z, 'each round place where the walks cross');
    assert.ok(blocked(r.c, 0.1), 'the fountain solid');
  }
  for (const b of GARDEN_BENCHES) assert.ok(b.at[0] > x0 && b.at[0] < x1 && b.at[1] > z0 && b.at[1] < z1 && !blocked(b.at, 0.05));
  for (const u of URNS) assert.ok(blocked(u, 0.05));
  for (const [x, z] of GARDEN_LAMPS) assert.ok(!blocked([x, z], 0.1) && !onPath([x, z], 0.1), 'a lantern in the way');
  for (const p of GARDEN_PEOPLE) assert.ok(p.act === 'sit' || !blocked([p.x, p.z], 0.25), `someone standing in something at ${p.x}, ${p.z}`);
});

test('the flower beds: along the Mall and round the walks, off every path, lamp, bench, tree, the lake and each other', () => {
  assert.ok(MALL_BEDS.length > 10 && PLANTERS.length > 20);
  const spots: { at: Pt; r: number }[] = [...MALL_BEDS.map((b) => ({ at: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2] as Pt, r: Math.hypot(b[2] - b[0], b[3] - b[1]) / 2 })), ...PLANTERS];
  for (const { at, r } of spots) {
    assert.ok(inPark(at, r), `a bed off the park at ${at}`);
    assert.ok(!onPath(at, r * 0.8), `a bed on a path at ${at}`);
    assert.ok(!inLake(at[0], at[1], r + 0.3) && !onTerrace(at[0], at[1], -r));
    for (const [x, z] of PARK_LAMPS) assert.ok(Math.hypot(x - at[0], z - at[1]) > r * 0.8, `a bed on a lamp at ${at}`);
    for (const t of PARK_TREES) assert.ok(Math.hypot(t.x - at[0], t.z - at[1]) > r * 0.8, `a bed on a tree at ${at}`);
    for (const b of BENCHES) assert.ok(Math.hypot(b.at[0] - at[0], b.at[1] - at[1]) > r * 0.8, `a bed on a bench at ${at}`);
  }
  // Some at the walks' junctions
  assert.ok(PLANTERS.filter((p) => PATHS.some((q) => !MAIN_WALKS.includes(q.id) && distToLine(q.pts, p.at, q.loop) < q.half + 2.2)).length >= 8);
});

test('the lakeside terraces: from the loop down to the water in steps, walkable out over it, clear of the boats and the jetty', () => {
  assert.equal(TERRACES.length, 3);
  // The steps: a step up off the loop, the platform, then down to just over the water (SLAB + 0.04)
  const h = TERRACE_STEPS.map((s) => s[2]);
  assert.ok(h[1] > h[0] && h.slice(1).every((v, i, a) => i === 0 || v < a[i - 1]));
  assert.ok(h.at(-1)! > 0.04 + 0.01 && h.at(-1)! < 0.1, 'the last just over the water');
  for (let i = 1; i < TERRACE_STEPS.length; i++) assert.equal(TERRACE_STEPS[i][0], TERRACE_STEPS[i - 1][1], 'no gaps between the steps');
  for (const t of TERRACES) {
    // On the water's edge, facing out of the lake
    assert.ok(Math.hypot(t.at[0] - lakeAt(t.a)[0], t.at[1] - lakeAt(t.a)[1]) < 1e-9);
    const out: Pt = [t.at[0] + t.u[0] * 2, t.at[1] + t.u[1] * 2];
    assert.ok(!inLake(out[0], out[1]) && inLake(t.at[0] - t.u[0] * 1.5, t.at[1] - t.u[1] * 1.5));
    // Walking out: on every step, its height
    for (const [d0, d1, hh] of TERRACE_STEPS) {
      const d = (d0 + d1) / 2;
      const p: Pt = [t.at[0] + t.u[0] * d, t.at[1] + t.u[1] * d];
      assert.ok(onTerrace(p[0], p[1], 0.1) && Math.abs(terraceY(p[0], p[1])! - hh) < 1e-9);
    }
    // Off the jetty, the boathouse and the boats' rings (their nearest a couple of tiles off)
    assert.ok(Math.hypot(t.at[0] - JETTY.x, t.at[1] - (JETTY.z0 + JETTY.z1) / 2) > 10);
    const tip: Pt = [t.at[0] - t.u[0] * 2.4, t.at[1] - t.u[1] * 2.4];
    for (const ring of RINGS) for (const p of ringLine(ring.in)) for (const s of [-t.half, 0, t.half]) assert.ok(Math.hypot(p[0] - tip[0] - t.t[0] * s, p[1] - tip[1] - t.t[1] * s) > 1.5, 'a boat ring over a terrace');
    // Nothing solid on it
    for (let s = -t.half + 0.4; s < t.half - 0.4; s += 0.5) for (let d = -2.2; d < 3.1; d += 0.5) assert.ok(!blocked([t.at[0] + t.u[0] * d + t.t[0] * s, t.at[1] + t.u[1] * d + t.t[1] * s], 0.2), 'something solid on a terrace');
  }
  assert.equal(terraceY(LAKE_C[0], LAKE_C[1]), null);
});

test('solids: in the city\'s, each on the park', () => {
  for (const b of GARDEN_SOLIDS) {
    assert.ok(SOLIDS.includes(b));
    assert.ok(inPark([(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], 0.05), `a solid off the park at ${b}`);
    assert.ok(b[4] < 2, 'all low');
  }
});
