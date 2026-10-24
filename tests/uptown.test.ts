// Uptown, the financial centre (uptown.ts, docs/finance-plan.md Phases 1 and 5): its streets (the circle and its
// streets, the one-way pair, the diagonal, the east street and the crescent: the owner's picks in Phase 5), every
// junction lit but the circle's, traffic driving them the right way, its blocks off the asphalt and clear of the park
// (the flatiron's wedge, the pocket park and the circle's island among them), the plaza's block on the Mall's axis,
// the axis's lanes, the lamps on the sidewalks, and the promenade's line carried on west. The plaza on its block and
// the café terraces by the lanes are tests/plaza.test.ts's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AXIS_X,
  BIKE,
  BOULEVARD_X,
  CIRCLE,
  COUPLET,
  CRESCENT,
  DIAG,
  E,
  EAST_X,
  ISLAND_R,
  NS_X,
  PLAZA_BLOCK,
  ROWS_Z,
  STREET_MEDIAN,
  UPTOWN_BLOCKS,
  UPTOWN_CROSSINGS,
  UPTOWN_LAMPS,
  UPTOWN_LANES,
  UPTOWN_RECT,
  UPTOWN_STREETS,
  W,
  crescentX,
  inUptown,
} from '../src/scripts/city3d/uptown';
import { NS_X as TRENCH_X } from '../src/scripts/city3d/trenches';
import { BIG, GATES, MALL, inPark } from '../src/scripts/city3d/westlake';
import { PLAN, polyArea, type Street } from '../src/scripts/city3d/streetplan';
import { JUNCTIONS, ROUTES } from '../src/scripts/city3d/routes';
import { PROMENADE } from '../src/scripts/city3d/outer';
import { LANE, RIVER, WALK_W } from '../src/scripts/city3d/layout';
import { insideHighway, fromHighway, HIGHWAY_HALF } from '../src/scripts/city3d/highway';
import { polysOverlap } from './world';

type Pt = [number, number];
/** How far a point is from a street's centre line */
function distToStreet(s: Street, p: Pt) {
  let best = Infinity;
  for (let i = 1; i < s.pts.length; i++) {
    const [a, b] = [s.pts[i - 1], s.pts[i]];
    const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / (vx * vx + vz * vz || 1)));
    best = Math.min(best, Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vz * t));
  }
  return best;
}
const street = (id: string) => UPTOWN_STREETS.find((s) => s.id === `uptown-${id}`)!;
/** Every step a route takes (from, to) */
const steps = ROUTES.flatMap((r) => r.pts.slice(1).map((p, i): [Pt, Pt] => [r.pts[i] as Pt, p as Pt]));
const [RING, CROSS_N, CROSS_S, BANK] = ROWS_Z;

test('its streets: the circle and its streets, the one-way pair, the diagonal, the east street and the crescent, all in the plan', () => {
  assert.equal(ROWS_Z.length, 4);
  assert.ok(BANK.c < RIVER[0], 'the bank avenue north of the river');
  for (const s of UPTOWN_STREETS) {
    const mine = PLAN.streets.find((t) => t.id === s.id)!;
    assert.ok(mine, `${s.id} in the plan`);
    assert.equal(mine.kind, 'street');
    assert.equal(mine.lanes, 1);
    assert.equal(mine.oneway, s.oneway);
    assert.equal(mine.loop, s.loop);
    assert.equal(mine.median, s.median);
  }
  // The one-way pair and the east street in line with The Trenches' cross streets across the river
  for (const x of [COUPLET.north, COUPLET.south, EAST_X]) assert.ok(TRENCH_X.includes(x), `${x} lines up with a Trenches cross street`);
  assert.deepEqual(NS_X, [CIRCLE.x, COUPLET.north, COUPLET.south, EAST_X]);
  // The pair: north on the plaza's west side, south on its east, ring avenue to bank avenue, a bike lane inside the asphalt
  const [n, s] = [street('ns1'), street('ns2')];
  assert.deepEqual([n.pts[0], n.pts.at(-1)], [[COUPLET.north, RING.c], [COUPLET.north, BANK.c]]);
  assert.equal(n.oneway, -1, 'northbound: against its points');
  assert.equal(s.oneway, 1, 'southbound: along them');
  assert.ok(BIKE.off - BIKE.w / 2 > 0.53 + 0.05 && BIKE.off + BIKE.w / 2 < LANE, 'the bike lane clear of the cars (down the middle) and inside the asphalt');
  // The circle: a closed loop one way round its island, its streets meeting it on its centre line, giving way
  const c = street('circle');
  assert.ok(c.loop && c.oneway === 1);
  assert.deepEqual(c.pts[0], c.pts.at(-1));
  for (const p of c.pts) assert.ok(Math.abs(Math.hypot(p[0] - CIRCLE.x, p[1] - CIRCLE.z) - CIRCLE.r) < 1e-9);
  assert.ok(ISLAND_R > 3 && CIRCLE.half * 2 >= 2.8, 'an island for a monument, a carriageway a car and a half wide');
  for (const id of ['circle-n', 'circle-s', 'circle-e']) {
    const arm = street(id);
    const end = arm.pts.find((p) => Math.abs(Math.hypot(p[0] - CIRCLE.x, p[1] - CIRCLE.z) - CIRCLE.r) < 1e-9)!;
    assert.ok(end, `${id} meets the circle`);
    assert.ok(UPTOWN_CROSSINGS.some((k) => !k.lights && k.at[0] === end[0] && k.at[1] === end[1] && k.streets.includes(arm.id) && k.streets.includes(c.id)), `${id} gives way at the circle`);
  }
  // Circle Street: from the circle east to the plaza's street on its middle, a planted median down it, as the diagonal
  const ce = street('circle-e');
  assert.deepEqual(ce.pts.at(-1), [COUPLET.north, CIRCLE.z]);
  for (const id of ['circle-e', 'diag']) assert.ok(street(id).median === STREET_MEDIAN && street(id).half >= LANE + STREET_MEDIAN / 2 - 1e-9, `${id}'s median`);
  // The diagonal: from where the ring avenue meets the pair's southbound street to where the south cross street meets the east street
  const d = street('diag');
  assert.deepEqual([d.pts[0], d.pts.at(-1)], DIAG);
  assert.deepEqual(DIAG, [[COUPLET.south, RING.c], [EAST_X, CROSS_S.c]]);
  const slope = Math.atan2(DIAG[1][0] - DIAG[0][0], DIAG[1][1] - DIAG[0][1]);
  assert.ok(slope > 0.5 && slope < 0.85, 'a real diagonal: 30 to 50 degrees off north-south');
  // The crescent: from the ring avenue to the bank avenue, bowing east between the east street and Uptown's edge
  const cr = street('crescent');
  assert.deepEqual([cr.pts[0][1], cr.pts.at(-1)![1]], [RING.c, BANK.c]);
  for (const p of cr.pts) assert.ok(p[0] >= CRESCENT.x - 1e-9 && p[0] <= CRESCENT.x + CRESCENT.bow + 1e-9 && Math.abs(p[0] - crescentX(p[1])) < 1e-9);
  assert.ok(crescentX((RING.c + BANK.c) / 2) - CRESCENT.x > 4, 'a real bow');
  for (const r of [CROSS_N, CROSS_S]) assert.ok(cr.pts.some((p) => p[1] === r.c), 'through its crossings');
});

test('its junctions: lit wherever its streets meet an avenue, a cross street or each other, three phases where the diagonal comes in; the circle gives way', () => {
  for (const s of UPTOWN_STREETS) if (s.id !== 'uptown-circle')
    for (const r of ROWS_Z) {
      const [z0, z1] = [Math.min(...s.pts.map((p) => p[1])), Math.max(...s.pts.map((p) => p[1]))];
      if (r.c < z0 - 1e-9 || r.c > z1 + 1e-9) continue;
      assert.ok(PLAN.crossings.some((c) => c.streets.includes(s.id) && c.at[1] === r.c && c.lights), `${s.id} at z ${r.c}`);
    }
  for (const c of UPTOWN_CROSSINGS) assert.equal(c.lights, !c.streets.includes('uptown-circle'), c.id);
  for (const j of JUNCTIONS) if (j.streets.some((s) => s.id === 'uptown-diag')) assert.ok(j.three, `three phases at ${j.at}`);
  // No two junctions too close (a car's length and its stop)
  for (const [i, a] of UPTOWN_CROSSINGS.entries())
    for (const b of UPTOWN_CROSSINGS.slice(i + 1)) assert.ok(Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]) > 4.5, `${a.id} and ${b.id}`);
});

test('traffic drives its streets, the one-way ones and the circle only the right way', () => {
  const along = (id: string) => steps.filter(([a, b]) => distToStreet(street(id) as unknown as Street, a) < 1.2 && distToStreet(street(id) as unknown as Street, b) < 1.2 && Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.3);
  for (const s of UPTOWN_STREETS) assert.ok(along(s.id.slice(7)).length > 0, `a route down ${s.id}`);
  // The pair: northbound up its west street, southbound down its east one (away from the junctions)
  const pair = (x: number) => steps.filter(([a, b]) => Math.abs(a[0] - x) < 0.3 && Math.abs(b[0] - x) < 0.3 && Math.abs(b[1] - a[1]) > 0.3 && a[1] > 0 && a[1] < 60);
  assert.ok(pair(COUPLET.north).length && pair(COUPLET.north).every(([a, b]) => b[1] < a[1]), 'northbound');
  assert.ok(pair(COUPLET.south).length && pair(COUPLET.south).every(([a, b]) => b[1] > a[1]), 'southbound');
  // Round the circle anticlockwise seen from above (north up): east along its south side
  const round = steps.filter(([a, b]) => [a, b].every((p) => Math.abs(Math.hypot(p[0] - CIRCLE.x, p[1] - CIRCLE.z) - CIRCLE.r) < 0.6));
  assert.ok(round.length > 5);
  // (a car turning on or off it may run in across it for a step or two: never against it)
  for (const [a, b] of round) {
    const sin = ((a[0] - CIRCLE.x) * (b[1] - a[1]) - (a[1] - CIRCLE.z) * (b[0] - a[0])) / Math.hypot(a[0] - CIRCLE.x, a[1] - CIRCLE.z) / Math.hypot(b[0] - a[0], b[1] - a[1]);
    assert.ok(sin < 0.5, `the wrong way round at ${a} to ${b}`);
  }
});

test('its blocks: towers\' land, the plaza, a pocket park and the circle\'s island, off every street\'s asphalt and sidewalk, clear of the park, inside the highway', () => {
  assert.deepEqual([...new Set(UPTOWN_BLOCKS.map((b) => b.row))].sort(), ['m', 'n', 's']);
  assert.equal(UPTOWN_BLOCKS.filter((b) => b.use === 'plaza').map((b) => b.id).join(), PLAZA_BLOCK);
  assert.equal(UPTOWN_BLOCKS.filter((b) => b.use === 'island').length, 1);
  assert.equal(UPTOWN_BLOCKS.filter((b) => b.use === 'park').length, 1);
  for (const b of UPTOWN_BLOCKS) {
    const mine = PLAN.blocks.find((x) => x.id === b.id)!;
    assert.ok(mine, `${b.id} in the plan`);
    assert.equal(mine.ref, 'uptown');
    assert.equal(mine.use, b.use === 'plaza' ? 'plaza' : b.use === 'towers' ? 'plain' : 'park');
    assert.ok(polyArea(b.poly) > 4, `${b.id} wound the plan's way round, with room on it`);
    const [x0, , x1] = b.rect;
    assert.ok(x0 >= W - 1e-6 && x1 <= E + 1e-6);
    for (const p of b.poly) {
      assert.ok(!inPark(p), `${b.id} on the park at ${p}`);
      assert.ok(insideHighway(p[0], p[1]) && fromHighway(p[0], p[1]) > HIGHWAY_HALF + 4, `${b.id} by the highway at ${p}`);
      assert.ok(p[1] < RIVER[0] - 3, `${b.id} at the river`);
      // Its sidewalk off every street's asphalt (its lanes are its own; the island's are the circle's to meet)
      for (const s of PLAN.streets) if (s.kind !== 'alley' && (b.use !== 'island' || s.id === 'uptown-circle')) assert.ok(distToStreet(s, p) > s.half + WALK_W - 0.05, `${b.id}'s sidewalk on ${s.id} at ${p}`);
    }
  }
  // Nothing overlaps, sidewalks and all
  for (const [i, a] of UPTOWN_BLOCKS.entries()) for (const b of UPTOWN_BLOCKS.slice(i + 1)) assert.ok(!polysOverlap(a.poly, b.poly), `${a.id} and ${b.id}`);
  assert.ok(BIG.every((p) => !inUptown(p[0], p[1], -1)), 'the park is not Uptown');
  // The flatiron's wedge: a triangle, its sharp corner under 45 degrees
  const wedge = UPTOWN_BLOCKS.find((b) => b.id === 'uptown-m2e')!;
  assert.equal(wedge.poly.length, 3);
  const angles = wedge.poly.map((p, i) => {
    const [a, c] = [wedge.poly[(i + 2) % 3], wedge.poly[(i + 1) % 3]];
    const [u, v] = [[a[0] - p[0], a[1] - p[1]], [c[0] - p[0], c[1] - p[1]]];
    return Math.acos((u[0] * v[0] + u[1] * v[1]) / Math.hypot(u[0], u[1]) / Math.hypot(v[0], v[1]));
  });
  assert.ok(Math.min(...angles) < Math.PI / 4, 'a sharp corner');
});

test('the axis: the Mall carried on from its gate through the plaza\'s block to the river, walk-only lanes either side', () => {
  assert.equal(AXIS_X, MALL.x);
  assert.ok(GATES.some((g) => Math.abs(g.at[0] - AXIS_X) < 0.01), 'the Mall\'s gate on the ring avenue faces it');
  const plaza = UPTOWN_BLOCKS.find((b) => b.id === PLAZA_BLOCK)!;
  assert.equal(plaza.row, 'm');
  assert.ok(plaza.rect[0] < AXIS_X && plaza.rect[2] > AXIS_X, 'the plaza on the axis');
  assert.equal(UPTOWN_LANES.length, 2);
  for (const l of UPTOWN_LANES) {
    const b = UPTOWN_BLOCKS.find((q) => q.rect[1] === l[1] && q.rect[0] < l[0] && q.rect[2] > l[2])!;
    assert.ok(b.row !== 'm' && l[0] > b.rect[0] && l[2] < b.rect[2], 'a lane through a block either side of the plaza');
    assert.ok(PLAN.streets.some((s) => s.kind === 'alley' && s.lanes === 0 && Math.abs(s.pts[0][0] - AXIS_X) < 0.01 && s.pts[0][1] === l[1]), 'walk-only in the plan');
  }
});

test('its lamps: on the sidewalks, off the asphalt, out of the junctions', () => {
  assert.ok(UPTOWN_LAMPS.length > 40, `${UPTOWN_LAMPS.length} lamps`);
  for (const [x, z] of UPTOWN_LAMPS) {
    for (const s of PLAN.streets) if (s.kind !== 'alley') assert.ok(distToStreet(s, [x, z]) > s.half + 0.2, `a lamp on ${s.id} at ${x}, ${z}`);
    assert.ok(x > W && x < E);
  }
});

test('the boulevard\'s line and its land: from Uptown\'s edge to the town\'s promenade, the trees kept off', () => {
  assert.equal(BOULEVARD_X[0], W);
  assert.equal(BOULEVARD_X[1], PROMENADE.x[0]);
  assert.ok(UPTOWN_RECT[3] === RIVER[0] && UPTOWN_RECT[0] < W && UPTOWN_RECT[2] > E);
});
