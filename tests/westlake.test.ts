// Westlake Park (westlake.ts, growth plan Phase 9b): its blocks west of town inside the ring highway, clear of the
// highway and its slip lanes, the Parkway, the avenues and everything that was there; the lake, its loop, the paths,
// the gates, trees, lamps and benches where they belong; the stadium's old site kept clear for the garden.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BENCHES,
  BIG,
  GATES,
  GATE_PIERS,
  LAKE_C,
  LAKE_WALLS,
  LOOP_OUT,
  PARK_LAMPS,
  PARK_TREES,
  PATHS,
  GARDEN_SITE,
  WESTLAKE_SOLIDS,
  WESTLAKE_BLOCKS,
  WESTLAKE_RECT,
  distToLine,
  inLake,
  inPark,
  lakeLine,
  lakeR,
  LAKE_REACH,
  LAKE_ARM,
  LAKE_INLET,
  LAKE_POLY,
  ROCKS,
  PARK_TREES as TREES_FOR_ROCKS,
  lakeCoreLine,
  lakeDist,
  RIM,
  lakeAt,
  onPath,
  onBridge,
  LAKE_PARTS,
  GRAND,
  grandAt,
  grandY,
  onGrand,
  LAKE_HOLE,
  WATER_Y,
  BED_Y,
  bridgeY,
  BRIDGES,
  onLawn,
  PROMENADE_HALF,
} from '../src/scripts/city3d/westlake';
import { PLAN, distToStreet, inPoly, polyArea } from '../src/scripts/city3d/streetplan';
import { fromHighway, insideHighway } from '../src/scripts/city3d/highway';
import { RIVER, WALK_W } from '../src/scripts/city3d/layout';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { SQUARE } from '../src/scripts/city3d/civic';
import { STADIUM_SOLIDS } from '../src/scripts/city3d/stadium';
import { GARDEN_SOLIDS } from '../src/scripts/city3d/gardens';
import { CITYHALL_SOLIDS, FLAG_SOLIDS, FLANK_SOLIDS, FOUNTAIN_SOLIDS } from '../src/scripts/city3d/civic';
import { PADS } from '../src/scripts/city3d/outer';
import { inTown } from '../src/scripts/city3d/outer';
import { inTrenches } from '../src/scripts/city3d/trenches';
import { RIVER_WALLS } from '../src/scripts/city3d/drive-sim';

type Pt = [number, number];
const edges = (poly: Pt[]) => poly.map((p, i): [Pt, Pt] => [p, poly[(i + 1) % poly.length]]);
const along = (a: Pt, b: Pt, step = 0.5): Pt[] => {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
  return Array.from({ length: n + 1 }, (_, k) => [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n] as Pt);
};

test('its blocks: west of town, north of the river, inside the highway and clear of it, its slips and every street', () => {
  assert.equal(WESTLAKE_BLOCKS.length, 1);
  for (const b of WESTLAKE_BLOCKS) {
    assert.ok(polyArea(b.poly) > 0 || polyArea(b.poly) < 0, `${b.id} has an area`);
    for (const [a, c] of edges(b.poly))
      for (const p of along(a, c)) {
        assert.ok(p[1] < RIVER[0], `${b.id} north of the river at ${p}`);
        assert.ok(insideHighway(p[0], p[1]) && fromHighway(p[0], p[1]) > 10 - 1e-6, `${b.id} clear of the highway at ${p}`);
        assert.ok(!inTown(p), `${b.id} out of town at ${p}`);
        assert.ok(!inTrenches(p[0], p[1]), `${b.id} off The Trenches at ${p}`);
        // Its sidewalk (WALK_W round it) off every street's asphalt, slips and the Parkway included
        for (const s of PLAN.streets) if (s.kind !== 'alley') assert.ok(distToStreet(s, p) > s.half + WALK_W - 0.05, `${b.id}'s sidewalk on ${s.id} at ${p}`);
      }
  }
  // The big one is big (the strips south of it are Uptown's now: uptown.ts)
  assert.ok(Math.abs(polyArea(BIG)) > 20000);
  assert.equal(WESTLAKE_BLOCKS.length, 1);
});

test('its blocks are the street plan\'s, and no other block or pad is on them', () => {
  for (const b of WESTLAKE_BLOCKS) {
    const mine = PLAN.blocks.find((x) => x.id === b.id);
    assert.ok(mine, `${b.id} in the plan`);
    assert.equal(mine!.use, 'park');
  }
  const others = PLAN.blocks.filter((x) => !x.id.startsWith('westlake-'));
  for (const b of WESTLAKE_BLOCKS)
    for (const p of b.poly) for (const o of others) assert.ok(!inPoly(o.poly, p), `${b.id}'s corner ${p} in ${o.id}`);
  for (const pad of PADS) assert.ok(!inPark([(pad.rect[0] + pad.rect[2]) / 2, (pad.rect[1] + pad.rect[3]) / 2]), `${pad.id} on the park`);
  // What was solid there before (nothing): the park's land is open (but its own gates, the stadium (stadium.ts) and its
  // walls, garden and planters (gardens.ts, gardens.test.ts))
  const before = SOLIDS.filter((s) => !WESTLAKE_SOLIDS.includes(s as never) && !STADIUM_SOLIDS.includes(s) && !GARDEN_SOLIDS.includes(s) && !CITYHALL_SOLIDS.includes(s) && !FLANK_SOLIDS.includes(s) && !FLAG_SOLIDS.includes(s) && !FOUNTAIN_SOLIDS.includes(s));
  for (const s of before) assert.ok(!inPark([(s[0] + s[2]) / 2, (s[1] + s[3]) / 2]), `a solid on the park at ${s}`);
  const [x0, z0, x1, z1] = WESTLAKE_RECT;
  for (const b of WESTLAKE_BLOCKS) for (const p of b.poly) assert.ok(p[0] >= x0 && p[0] <= x1 && p[1] >= z0 && p[1] <= z1);
});

test('the lake: inside the big block, its loop round it on the park, its walls covering it for cars', () => {
  for (const p of lakeLine(LOOP_OUT + 2, 180)) assert.ok(inPoly(BIG, p), `the loop's land at ${p}`);
  // (out to the arm's tip, the redesign's Phase 1)
  for (let a = 0; a < 2 * Math.PI; a += 0.05) assert.ok(lakeR(a) > 10 && lakeR(a) <= LAKE_REACH + 1e-9 && LAKE_REACH < 56, `a sensible radius at ${a}`);
  assert.ok(inLake(LAKE_C[0], LAKE_C[1]));
  assert.ok(!inLake(LAKE_C[0] + 40, LAKE_C[1]));
  // A walker's radius keeps them off the water at its edge
  for (const p of lakeLine(0.1, 60)) assert.ok(inLake(p[0], p[1], 0.3), `the edge at ${p} is kept off`);
  // Every point in the water is in one of the cars' walls, and they stay off the paths but the loop's water side
  for (let x = LAKE_C[0] - 36; x < LAKE_C[0] + 36; x += 0.7)
    for (let z = LAKE_C[1] - 36; z < LAKE_C[1] + 36; z += 0.7)
      if (inLake(x, z)) assert.ok(LAKE_WALLS.some((w) => x >= w[0] && x <= w[2] && z >= w[1] && z <= w[3]), `water at ${x}, ${z} walled`);
  for (const w of LAKE_WALLS) assert.ok(!RIVER_WALLS.some((r) => r[1] < w[3] && r[3] > w[1] && r[0] < w[2] && r[2] > w[0]));
});

test('the paths: on the park, off the lake and the garden\'s site (but the Mall and the garden\'s own walks through it), each gate on one', () => {
  for (const q of PATHS) {
    const pts = q.loop ? [...q.pts, q.pts[0]] : q.pts;
    for (let i = 1; i < pts.length; i++)
      for (const p of along(pts[i - 1], pts[i], 1)) {
        assert.ok(inPark(p, -0.01), `${q.id} on the park at ${p}`);
        // (but where the loop crosses a bridge over the arm or the inlet: docs/westlake-plan.md Phase 3a)
        if (!onBridge(p[0], p[1], -1.5)) assert.ok(!inLake(p[0], p[1], q.half + 0.5), `${q.id} in the lake at ${p}`);
        const [x0, z0, x1, z1] = GARDEN_SITE;
        if (q.id !== 'mall' && !q.id.startsWith('garden-')) assert.ok(!(p[0] > x0 && p[0] < x1 && p[1] > z0 && p[1] < z1), `${q.id} on the garden's site at ${p}`);
      }
  }
  for (const g of GATES) assert.ok(onPath(g.at), `${g.id} on a path`);
  // Two piers a gate, off its path
  assert.equal(GATE_PIERS.length, GATES.length * 2);
  for (const pr of GATE_PIERS) assert.ok(!onPath([(pr[0] + pr[2]) / 2, (pr[1] + pr[3]) / 2], 0.1), `a pier on a path at ${pr}`);
  for (const pr of GATE_PIERS) assert.ok(SOLIDS.some((s) => s.every((v, i) => v === pr[i])), 'the piers are solid');
});

test('trees, lamps and benches: on the park, off the paths, the water and the garden\'s site', () => {
  // (fewer since the civic quarter took the park's south end, civic.ts, the owner's call: it has trees of its own)
  // (fewer since the lake's arm reached into the north-east woods and the Great Lawn was cleared, the redesign's
  // Phases 1 and 2: Phase 5 plants the park anew)
  assert.ok(PARK_TREES.length > 120, `${PARK_TREES.length} trees`);
  assert.ok(PARK_TREES.filter((t) => t.clump).length > 100);
  const [x0, z0, x1, z1] = GARDEN_SITE;
  const onSite = (p: Pt, m: number) => p[0] > x0 - m && p[0] < x1 + m && p[1] > z0 - m && p[1] < z1 + m;
  for (const t of PARK_TREES) {
    const p: Pt = [t.x, t.z];
    assert.ok(inPark(p, 1), `a tree off the park at ${p}`);
    assert.ok(!onPath(p, 1), `a tree on a path at ${p}`);
    assert.ok(!inLake(t.x, t.z, LOOP_OUT + 2), `a tree in the lake at ${p}`);
    assert.ok(!onSite(p, 2), `a tree on the garden's site at ${p}`);
  }
  for (let i = 0; i < PARK_TREES.length; i++)
    for (let j = i + 1; j < PARK_TREES.length; j++) assert.ok(Math.hypot(PARK_TREES[i].x - PARK_TREES[j].x, PARK_TREES[i].z - PARK_TREES[j].z) > 2, 'trees apart');
  assert.ok(PARK_LAMPS.length > 60);
  for (const [x, z] of PARK_LAMPS) {
    assert.ok(inPark([x, z], 0.2), `a lamp off the park at ${x}, ${z}`);
    assert.ok(!onPath([x, z], 0.1), `a lamp on a path at ${x}, ${z}`);
    assert.ok(!inLake(x, z, 1), `a lamp in the lake at ${x}, ${z}`);
    assert.ok(PARK_TREES.every((t) => Math.hypot(t.x - x, t.z - z) > 0.6), `a lamp in a tree at ${x}, ${z}`);
  }
  // (the Mall's south stretch's went with the civic square, civic.ts, which has benches of its own)
  assert.ok(BENCHES.length >= 14);
  for (const b of BENCHES) {
    assert.ok(inPark(b.at, 0.5), `a bench off the park at ${b.at}`);
    assert.ok(!inLake(b.at[0], b.at[1], 0.6), `a bench in the lake at ${b.at}`);
    for (const q of PATHS) if (q.id !== 'loop' && q.id !== 'mall' && q.id !== 'promenade') assert.ok(distToLine(q.pts, b.at, q.loop) > q.half + 0.6, `a bench on ${q.id} at ${b.at}`);
  }
});

/** Whether a closed outline crosses itself */
function crosses(pts: Pt[]) {
  const n = pts.length;
  const cut = (a: Pt, b: Pt, c: Pt, d: Pt) => {
    const o = (p: Pt, q: Pt, r: Pt) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
  };
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) if ((j + 1) % n !== i && cut(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) return true;
  return false;
}

test('the lake redesigned (docs/westlake-plan.md Phase 1): round its old centre, its arm north and its inlet, coves and a point, a clean outline', () => {
  assert.ok(!crosses(LAKE_POLY), 'the shore crosses itself');
  assert.ok(inLake(LAKE_C[0], LAKE_C[1], -10), 'its middle well out in the water');
  // The arm and the inlet: water out along each line to near its end
  for (const arm of [LAKE_ARM, LAKE_INLET]) {
    for (const p of arm.line.slice(0, -1)) assert.ok(inLake(p[0], p[1]), `the arm's line at ${p} in the water`);
    const end = arm.line.at(-1)!;
    assert.ok(inLake(end[0], end[1]) && lakeDist(end[0], end[1]) > -arm.w.at(-1)!, `its end at ${end}`);
  }
  assert.ok(LAKE_POLY.some((p) => p[1] < -95), 'the arm reaches north into the woods');
  // The open water (the boats') is inside the lake, a clean outline; the lines off the shore (the rim, the loop and its lanes) too
  for (const p of lakeCoreLine(-0.5, 120)) assert.ok(inLake(p[0], p[1]), `the open water at ${p} out of the lake`);
  for (const out of [RIM.w, LOOP_OUT - 0.8, LOOP_OUT, LOOP_OUT + 0.8, LOOP_OUT + 1.1]) {
    const line = lakeLine(out, 240);
    assert.ok(!crosses(line), `the line ${out} off the shore crosses itself`);
    for (const p of line) assert.ok(!inLake(p[0], p[1], out - 0.3), `the line ${out} off the shore at ${p} too near the water`);
  }
  // Its north shore by the boathouse and the jetty where it was
  assert.ok(Math.abs(lakeAt(-Math.PI / 2)[1] - -67.9) < 0.6, `the north shore at ${lakeAt(-Math.PI / 2)}`);
});

test('the rock outcrops: on the park, off the paths and the water, apart, solid, the trees off them', () => {
  assert.ok(ROCKS.length >= 25, `${ROCKS.length} rocks`);
  const point = lakeAt((150 * Math.PI) / 180, 1.5);
  assert.ok(ROCKS.filter((k) => Math.hypot(k.x - point[0], k.z - point[1]) < 4).length >= 2, `stones at the point by ${point}`);
  for (const k of ROCKS) {
    const p: Pt = [k.x, k.z];
    assert.ok(inPark(p, 1.5), `a rock off the park at ${p}`);
    assert.ok(!onPath(p, k.r * 0.7), `a rock on a path at ${p}`);
    assert.ok(!inLake(k.x, k.z, k.r * 0.5 + RIM.w), `a rock in the water at ${p}`);
    assert.ok(SOLIDS.some((b) => k.x > b[0] && k.x < b[2] && k.z > b[1] && k.z < b[3]), `a rock not solid at ${p}`);
    for (const t of TREES_FOR_ROCKS) assert.ok(Math.hypot(t.x - k.x, t.z - k.z) > k.r + 1, `a tree in a rock at ${p}`);
    for (const b of BENCHES) assert.ok(Math.hypot(b.at[0] - k.x, b.at[1] - k.z) > k.r + 0.9, `a bench against a rock at ${p}`);
    for (const l of PARK_LAMPS) assert.ok(Math.hypot(l[0] - k.x, l[1] - k.z) > k.r + 0.7, `a lamp in a rock at ${p}`);
  }
  for (let i = 0; i < ROCKS.length; i++)
    for (let j = i + 1; j < ROCKS.length; j++) assert.ok(Math.hypot(ROCKS[i].x - ROCKS[j].x, ROCKS[i].z - ROCKS[j].z) > (ROCKS[i].r + ROCKS[j].r) * 0.74, 'two rocks in one');
});

test('the paths re-laid (docs/westlake-plan.md Phase 2): none a dead end, the Great Lawn open, the promenade\'s double avenue', () => {
  // Every walk's ends meet another walk or a gate
  for (const q of PATHS.filter((r) => !r.loop))
    for (const end of [q.pts[0], q.pts.at(-1)!]) {
      // (or the civic square, paved edge to edge, which the civic quarter's walks open into)
      const onSquare = end[0] > SQUARE[0] - 1 && end[0] < SQUARE[2] + 1 && end[1] > SQUARE[1] - 1 && end[1] < SQUARE[3] + 1;
      const met = onSquare || PATHS.some((r) => r !== q && distToLine(r.pts, end, r.loop) < r.half + q.half + 0.6) || GATES.some((g) => Math.hypot(g.at[0] - end[0], g.at[1] - end[1]) < g.half + 1);
      assert.ok(met, `${q.id} ends nowhere at ${end.map((v) => v.toFixed(1))}`);
    }
  for (const id of ['lawn', 'promenade', 'ramble-e', 'ramble-n', 'ramble-w', 'lawn-lake', 'mall-lawn', 'lawn-n']) assert.ok(PATHS.some((q) => q.id === id), `no ${id}`);
  // The lawn: no trees, no rocks
  for (const t of PARK_TREES) assert.ok(!onLawn([t.x, t.z], -1), `a tree on the Great Lawn at ${t.x}, ${t.z}`);
  for (const k of ROCKS) assert.ok(!onLawn([k.x, k.z], -1), `a rock on the Great Lawn at ${k.x}, ${k.z}`);
  // The promenade: trees either side in two rows, benches along its edges
  const prom = PATHS.find((q) => q.id === 'promenade')!;
  const avenue = PARK_TREES.filter((t) => Math.abs(t.x - prom.pts[0][0]) < PROMENADE_HALF + 6 && t.z < prom.pts[0][1] && t.z > prom.pts[1][1]);
  for (const side of [-1, 1]) for (const row of [1.75, 4.7]) assert.ok(avenue.filter((t) => Math.abs(t.x - (prom.pts[0][0] + side * (PROMENADE_HALF + row))) < 0.01).length >= 2, `the avenue's row ${side * row}`);
  assert.ok(BENCHES.filter((b) => Math.abs(Math.abs(b.at[0] - prom.pts[0][0]) - (PROMENADE_HALF + 0.45)) < 0.01).length >= 4, 'benches along the promenade');
});

test('the bridges (docs/westlake-plan.md Phase 3a): over the arm and the inlet, landing on the loop, the loop over them, their walks round', () => {
  assert.deepEqual(BRIDGES.map((k) => k.id), ['iron', 'stone']);
  const loop = PATHS.find((q) => q.id === 'loop')!;
  for (const k of BRIDGES) {
    // Its ends on the land, on the loop; its middle over the water, its deck up off it
    for (const e of [k.a, k.b]) {
      assert.ok(!inLake(e[0], e[1], 0.5), `${k.id}'s end at ${e} in the water`);
      assert.ok(distToLine(loop.pts, e, true) < 0.2, `${k.id}'s end at ${e} off the loop`);
    }
    assert.ok(k.len > 8 && k.len < 25, `${k.id}: ${k.len.toFixed(1)} long`);
    const water = Array.from({ length: 41 }, (_, i) => (i / 40) * k.len).filter((s) => inLake(k.a[0] + k.u[0] * s, k.a[1] + k.u[1] * s));
    assert.ok(water.length > 3, `${k.id} over no water`);
    const m: Pt = [k.a[0] + k.u[0] * (k.len / 2), k.a[1] + k.u[1] * (k.len / 2)];
    assert.ok(onBridge(m[0], m[1], 0.5) && Math.abs(bridgeY(m[0], m[1])! - k.rise) < 1e-6, `${k.id}'s deck at its middle`);
    assert.ok(bridgeY(k.a[0], k.a[1])! < 0.05, `${k.id}'s deck at its end`);
    // The loop runs across it
    for (let s = 1; s < k.len - 1; s += 1) assert.ok(distToLine(loop.pts, [k.a[0] + k.u[0] * s, k.a[1] + k.u[1] * s], true) < 0.2, `the loop off ${k.id} at ${s}`);
  }
  // The walks round the arm and the inlet, from one end of its bridge to the other, on the land
  for (const [id, k] of [['arm-walk', BRIDGES[0]], ['inlet-walk', BRIDGES[1]]] as const) {
    const q = PATHS.find((r) => r.id === id)!;
    const ends = [q.pts[0], q.pts.at(-1)!];
    for (const e of ends) assert.ok([k.a, k.b].some((b) => Math.hypot(b[0] - e[0], b[1] - e[1]) < 0.01), `${id} ends off ${k.id}`);
    for (const p of q.pts) assert.ok(!inLake(p[0], p[1], q.half + 0.3), `${id} in the water at ${p}`);
  }
});

test('the lake lowered into its embankment (docs/westlake-plan.md Phase 3b): its convex pieces cover it, the ground cut under it, the water down', () => {
  const area = (q: Pt[]) => Math.abs(q.reduce((t, p, i) => t + p[0] * q[(i + 1) % q.length][1] - q[(i + 1) % q.length][0] * p[1], 0)) / 2;
  const whole = area(lakeLine(0.15, 240));
  const parts = LAKE_PARTS.reduce((t, q) => t + area(q), 0);
  assert.ok(Math.abs(parts - whole) / whole < 0.002, `the pieces cover ${parts.toFixed(1)} of ${whole.toFixed(1)}`);
  // Each piece convex (to a millimetre's rounding) and the water inside one of them
  const cr = (a: Pt, b: Pt, c: Pt) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  for (const q of LAKE_PARTS) {
    const sg = Math.sign(q.reduce((t, p, i) => t + p[0] * q[(i + 1) % q.length][1] - q[(i + 1) % q.length][0] * p[1], 0));
    for (let i = 0; i < q.length; i++) assert.ok(cr(q[i], q[(i + 1) % q.length], q[(i + 2) % q.length]) * sg > -0.01, 'a piece not convex');
  }
  for (const p of lakeLine(-0.5, 120)) assert.ok(p[0] > LAKE_HOLE[0] && p[0] < LAKE_HOLE[2] && p[1] > LAKE_HOLE[1] && p[1] < LAKE_HOLE[3], 'the ground left over the water');
  assert.ok(WATER_Y < -1.5 && BED_Y < WATER_Y, 'the water down in its embankment');
});

test('the grand terrace (docs/westlake-plan.md Phase 3b): its plaza at the water, steps evenly down from the lawn, over the water and into the land, clear', () => {
  const { front, back, half, foot, flight, plaza } = GRAND;
  assert.ok(plaza > WATER_Y && plaza - WATER_Y < 0.4, 'the plaza just over the water');
  // On the plaza, the plaza's height; down the steps, each lower than the last, from the lawn to the plaza
  assert.equal(grandY(...grandAt((front + back) / 2 - 2, 0)), plaza);
  for (const sg of [-1, 1]) {
    let last = Infinity;
    for (let a = half - 0.05; a > foot + 0.05; a -= 0.1) {
      const y = grandY(...grandAt(back - flight / 2, sg * a))!;
      assert.ok(y <= last + 1e-9 && y < 0 && y > plaza, `a step at ${a}`);
      assert.ok(last === Infinity || last - y < 0.2, 'a step too tall');
      last = y;
    }
  }
  assert.equal(grandY(...grandAt(back + 0.5, 0)), null);
  // Out over the water and into the land
  const pts = Array.from({ length: 21 }, (_, i) => grandAt(front + 0.5, -half + i)).concat(Array.from({ length: 21 }, (_, i) => grandAt(back - 0.5, -half + i)));
  assert.ok(pts.some((p) => inLake(p[0], p[1])) && pts.some((p) => !inLake(p[0], p[1])), 'over the water and the land both');
  // No path through it, no tree, lamp, bench or rock on it
  for (const q of PATHS) for (const p of q.pts) assert.ok(!onGrand(p[0], p[1], -0.2), `${q.id} through the terrace at ${p}`);
  for (const t of PARK_TREES) assert.ok(!onGrand(t.x, t.z, -1), 'a tree on the terrace');
  for (const [x, z] of PARK_LAMPS) assert.ok(!onGrand(x, z, -0.5), 'a lamp on the terrace');
  for (const b of BENCHES) assert.ok(!onGrand(b.at[0], b.at[1], -0.5), 'a bench on the terrace');
  for (const k of ROCKS) assert.ok(!onGrand(k.x, k.z, -1), 'a rock on the terrace');
});
