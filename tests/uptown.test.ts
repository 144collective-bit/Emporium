// Uptown, the financial centre (uptown.ts, docs/finance-plan.md Phase 1): its streets in line with The Trenches' across
// the river, every junction lit, its twelve blocks off the asphalt and clear of the park, the plaza's block on the
// Mall's axis, the axis's lanes, the lamps on the sidewalks, traffic down its streets, and the promenade's line carried
// on west. The plaza on its block and the café terraces by the lanes are tests/plaza.test.ts's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AXIS_X,
  BOULEVARD_X,
  E,
  NS_X,
  PLAZA_BLOCK,
  ROWS_Z,
  UPTOWN_BLOCKS,
  UPTOWN_CROSSINGS,
  UPTOWN_LAMPS,
  UPTOWN_LANES,
  UPTOWN_RECT,
  UPTOWN_STREETS,
  W,
  inUptown,
} from '../src/scripts/city3d/uptown';
import { NS_X as TRENCH_X } from '../src/scripts/city3d/trenches';
import { BIG, GATES, MALL, inPark } from '../src/scripts/city3d/westlake';
import { PLAN, type Street } from '../src/scripts/city3d/streetplan';
import { ROUTES } from '../src/scripts/city3d/routes';
import { PROMENADE } from '../src/scripts/city3d/outer';
import { RIVER, WALK_W } from '../src/scripts/city3d/layout';
import { insideHighway, fromHighway, HIGHWAY_HALF } from '../src/scripts/city3d/highway';

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

test('its streets: three, in line with The Trenches\' across the river, from the ring avenue to the bank avenue, every junction lit', () => {
  assert.equal(NS_X.length, 3);
  for (const x of NS_X) assert.ok(TRENCH_X.includes(x), `${x} lines up with a Trenches cross street`);
  assert.equal(ROWS_Z.length, 4);
  assert.ok(ROWS_Z.at(-1)!.c < RIVER[0], 'the bank avenue north of the river');
  for (const s of UPTOWN_STREETS) {
    const mine = PLAN.streets.find((t) => t.id === s.id)!;
    assert.ok(mine, `${s.id} in the plan`);
    assert.equal(mine.kind, 'street');
    assert.equal(mine.lanes, 1);
    assert.equal(s.pts[0][1], ROWS_Z[0].c);
    assert.equal(s.pts.at(-1)![1], ROWS_Z.at(-1)!.c);
    // A junction with every avenue and cross street it meets, lit
    for (const r of ROWS_Z) assert.ok(PLAN.crossings.some((c) => c.streets.includes(s.id) && c.at[1] === r.c && c.lights), `${s.id} at z ${r.c}`);
  }
  assert.equal(UPTOWN_CROSSINGS.length, NS_X.length * ROWS_Z.length);
  for (const c of UPTOWN_CROSSINGS) assert.ok(c.lights);
});

test('traffic drives its streets', () => {
  for (const x of NS_X) {
    const along = ROUTES.some((r) => r.pts.some((p, i) => i > 0 && Math.abs(p[0] - x) < 2 && Math.abs(r.pts[i - 1][0] - x) < 2 && Math.abs(p[1] - r.pts[i - 1][1]) > 5 && p[1] > 0 && p[1] < 60));
    assert.ok(along, `a route down the street at x ${x}`);
  }
});

test('its blocks: twelve, in three rows, off every street\'s asphalt and sidewalk, clear of the park, inside the highway', () => {
  assert.equal(UPTOWN_BLOCKS.length, 12);
  assert.deepEqual([...new Set(UPTOWN_BLOCKS.map((b) => b.row))], ['n', 'm', 's']);
  for (const b of UPTOWN_BLOCKS) {
    const mine = PLAN.blocks.find((x) => x.id === b.id)!;
    assert.ok(mine, `${b.id} in the plan`);
    assert.equal(mine.ref, 'uptown');
    assert.equal(mine.use, b.id === PLAZA_BLOCK ? 'plaza' : 'plain');
    const [x0, z0, x1, z1] = b.rect;
    assert.ok(x1 - x0 > 25 && z1 - z0 > 12, `${b.id} big enough for towers`);
    assert.ok(x0 >= W - 1e-6 && x1 <= E + 1e-6);
    for (const p of b.poly) {
      assert.ok(!inPark(p), `${b.id} on the park at ${p}`);
      assert.ok(insideHighway(p[0], p[1]) && fromHighway(p[0], p[1]) > HIGHWAY_HALF + 4, `${b.id} by the highway at ${p}`);
      assert.ok(p[1] < RIVER[0] - 3, `${b.id} at the river`);
      // Its sidewalk off every street's asphalt (its lanes are its own)
      for (const s of PLAN.streets) if (s.kind !== 'alley') assert.ok(distToStreet(s, p) > s.half + WALK_W - 0.05, `${b.id}'s sidewalk on ${s.id} at ${p}`);
    }
  }
  // Nothing overlaps
  for (const [i, a] of UPTOWN_BLOCKS.entries())
    for (const b of UPTOWN_BLOCKS.slice(i + 1)) assert.ok(a.rect[2] <= b.rect[0] || b.rect[2] <= a.rect[0] || a.rect[3] <= b.rect[1] || b.rect[3] <= a.rect[1], `${a.id} and ${b.id}`);
  assert.ok(BIG.every((p) => !inUptown(p[0], p[1], -1)), 'the park is not Uptown');
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

test('the boulevard\'s line and its land: the promenade carried on west from Uptown\'s edge, the trees kept off', () => {
  assert.equal(BOULEVARD_X[0], W);
  assert.equal(BOULEVARD_X[1], PROMENADE.x[0]);
  assert.ok(UPTOWN_RECT[3] === RIVER[0] && UPTOWN_RECT[0] < W && UPTOWN_RECT[2] > E);
});
