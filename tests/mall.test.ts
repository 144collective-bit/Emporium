// The shopping plaza and the mall north of downtown (mall.ts, docs/mall-plan.md step 1): the land between the Parkway and
// the ring highway east of Westlake Park, its blocks off every street, the short streets stopping at the Parkway, the
// loop in the plan, Palm Court's rows open to the park's gates, the zebra and the mall, what's solid off the streets, its
// people clear of it, everything under the Emporium, and on foot from Palm Court's arch to the mall's porch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANCHORS,
  ARCH,
  BAYS,
  CINEMA,
  COURT,
  COURT_SPAWN,
  FOUNTAIN,
  GATE_GAPS,
  HALL,
  LOOP,
  MALL_AREA,
  MALL_BLOCK,
  MALL_LAMPS,
  MALL_PEOPLE,
  MALL_SOLIDS,
  MALL_SPAWN,
  MSCP,
  PALMS,
  PARKED,
  PARK_BLOCK,
  PORCH,
  PROM,
  RANK_CABS,
  SHOPS,
  TALLEST,
  ZEBRA,
} from '../src/scripts/city3d/mall';
import { HIGHWAY_BOX } from '../src/scripts/city3d/highway';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { NS_ROADS, SHORT_NS } from '../src/scripts/city3d/layout';
import { GATES, WESTLAKE_RECT } from '../src/scripts/city3d/westlake';

type Rect = readonly number[];
const inBox = (b: Rect, x: number, z: number, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;
const corners = (r: Rect): [number, number][] => [
  [r[0], r[1]],
  [r[2], r[1]],
  [r[0], r[3]],
  [r[2], r[3]],
];
const roads = PLAN.streets.filter((s) => s.kind !== 'alley');

test('between the Parkway and the highway, east of the park; its blocks off every street', () => {
  assert.ok(COURT[0] >= WESTLAKE_RECT[2] && MALL_AREA[1] > HIGHWAY_BOX[1] + 10);
  for (const r of [COURT, MALL_BLOCK, PARK_BLOCK]) for (const p of corners(r)) for (const s of roads) assert.ok(distToStreet(s, p) > s.half + 0.79, `${r} on ${s.id}`);
  for (const b of ['palm-court', 'mall', 'mall-park']) assert.ok(PLAN.blocks.some((k) => k.id === b && k.ref === 'mall'), b);
  assert.ok(TALLEST < 12.5, 'under the Emporium');
});

test('the short streets stop at the Parkway; the loop is in the plan, off the north avenue at both legs', () => {
  for (const i of Object.keys(SHORT_NS).map(Number)) {
    const s = PLAN.streets.find((q) => q.id === `ns${i}`)!;
    assert.ok(s.pts[0][1] > MALL_AREA[3] - 4, `ns${i} reaches into the mall's land`);
    assert.ok(!PLAN.crossings.some((c) => c.streets.includes(`ns${i}`) && c.streets.includes('highway') && c.at[1] < 0), `ns${i} still meets the highway's north side`);
  }
  const loop = PLAN.streets.find((s) => s.id === 'mall-loop')!;
  assert.ok(loop && loop.pts[0][0] === NS_ROADS[0].c && loop.pts.at(-1)![0] === NS_ROADS[0].c && !loop.oneway);
  assert.equal(PLAN.crossings.filter((c) => c.streets.includes('mall-loop')).length, 2);
  assert.ok(LOOP.xE + LOOP.half < NS_ROADS[NS_ROADS.length - 1].c - NS_ROADS[NS_ROADS.length - 1].half - 1, 'the east leg clear of the east avenue');
});

test("Palm Court: two rows facing across the promenade, open to the park's gates and the zebra; the cinema across the north end", () => {
  const east = GATES.filter((g) => g.out[0] === 1 && g.at[1] < COURT[3] && g.at[1] > COURT[1]);
  assert.equal(GATE_GAPS.length, east.length);
  assert.ok(east.length >= 2);
  assert.ok(SHOPS.length >= 14);
  for (const s of SHOPS) {
    assert.ok(inBox(COURT, s.rect[0], s.rect[1], 1e-6) && inBox(COURT, s.rect[2], s.rect[3], 1e-6));
    assert.ok(s.face === 1 ? Math.abs(s.rect[2] - PROM[0]) < 1e-6 : Math.abs(s.rect[0] - PROM[1]) < 1e-6, 'its front on the promenade');
    assert.ok(s.rect[3] - s.rect[1] > 3.5, 'not a sliver');
    if (s.face === 1) for (const g of east) assert.ok(s.rect[3] < g.at[1] - 2 || s.rect[1] > g.at[1] + 2, `${s.name} in front of a gate`);
    else assert.ok(s.rect[3] < ZEBRA.z - 2 || s.rect[1] > ZEBRA.z + 2, `${s.name} in front of the zebra`);
    assert.ok(s.rect[1] > CINEMA.rect[3] && s.rect[3] < ARCH.z, 'between the cinema and the arch');
    assert.ok(!/\d/.test(s.name), 'made-up names, no numbers');
  }
  for (const [x, z] of PALMS) assert.ok(x > PROM[0] && x < PROM[1] && Math.hypot(x - FOUNTAIN.x, z - FOUNTAIN.z) > FOUNTAIN.r + 1);
});

test('the mall: the anchors at the hall\'s ends, the porch on its front, the car parks inside the loop', () => {
  assert.ok(ANCHORS[0].rect[2] <= HALL.rect[0] + 1e-6 && ANCHORS[1].rect[0] >= HALL.rect[2] - 1e-6);
  for (const a of [...ANCHORS.map((x) => x.rect), HALL.rect, PORCH.rect]) assert.ok(inBox(MALL_BLOCK, a[0], a[1], 1e-6) && inBox(MALL_BLOCK, a[2], a[3], 1e-6));
  assert.ok(PORCH.rect[1] >= HALL.rect[3] - 1e-6, 'the porch on the hall\'s front');
  assert.ok(inBox(PARK_BLOCK, MSCP.rect[0], MSCP.rect[1], 1e-6) && inBox(PARK_BLOCK, MSCP.rect[2], MSCP.rect[3], 1e-6));
  for (const b of BAYS) assert.ok(inBox(PARK_BLOCK, b.x, b.z) && !inBox(MSCP.rect, b.x, b.z, 2));
  assert.ok(RANK_CABS.length >= 2 && PARKED.length > BAYS.length / 2);
});

test('what\'s solid is off every street, and the lamps', () => {
  for (const b of MALL_SOLIDS) for (const p of corners(b)) for (const s of roads) assert.ok(distToStreet(s, p) > s.half - 1e-6, `${b} on ${s.id}`);
  for (const [x, z] of MALL_LAMPS) for (const s of roads) assert.ok(distToStreet(s, [x, z]) > s.half + 0.3, `a lamp at ${x}, ${z} on ${s.id}`);
  for (const p of MALL_PEOPLE) if (p.act !== 'sit') assert.ok(!MALL_SOLIDS.some((b) => inBox(b, p.x, p.z, 0.2)), `someone at ${p.x}, ${p.z} in something`);
});

test('on foot from Palm Court\'s arch, up the promenade, over the zebra to the mall\'s porch', () => {
  const solid = (x: number, z: number) => SOLIDS.some((b) => inBox(b, x, z, 0.3));
  const [x0, z0, x1, z1] = [COURT[0], MALL_BLOCK[1], MALL_BLOCK[2], COURT[3] + 1];
  const step = 0.5;
  const nx = Math.ceil((x1 - x0) / step);
  const nz = Math.ceil((z1 - z0) / step);
  const seen = new Uint8Array(nx * nz);
  const ix = (x: number) => Math.round((x - x0) / step);
  const iz = (z: number) => Math.round((z - z0) / step);
  assert.ok(!solid(COURT_SPAWN.x, COURT_SPAWN.z) && !solid(MALL_SPAWN.x, MALL_SPAWN.z), 'the spawns are clear');
  const queue: [number, number][] = [[ix(COURT_SPAWN.x), iz(COURT_SPAWN.z)]];
  seen[queue[0][1] * nx + queue[0][0]] = 1;
  while (queue.length) {
    const [i, k] = queue.pop()!;
    for (const [di, dk] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const [a, c] = [i + di, k + dk];
      if (a < 0 || c < 0 || a >= nx || c >= nz || seen[c * nx + a]) continue;
      if (solid(x0 + a * step, z0 + c * step)) continue;
      seen[c * nx + a] = 1;
      queue.push([a, c]);
    }
  }
  assert.ok(seen[iz(MALL_SPAWN.z) * nx + ix(MALL_SPAWN.x)], "the mall's porch can't be reached");
  assert.ok(seen[iz(CINEMA.rect[3] + 1) * nx + ix((PROM[0] + PROM[1]) / 2)], "the cinema's doors can't be reached");
});
