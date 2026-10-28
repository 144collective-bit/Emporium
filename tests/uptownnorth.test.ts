// Uptown North (uptownnorth.ts, the owner's call: Uptown's towers carried north onto Palm Court's old land): its block in
// the plan, paved as Uptown's; its towers (highrise.ts) as tall as Uptown's, in two columns either side of the service
// way, clear of the park's gates' walks and the square; the square's pool, trees, benches, lamps and people clear of
// each other and of what's solid; dining on the square; and on foot from each of the park's east gates to the avenue
// and from the square over the zebra to the mall's forecourt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EAST_COL, GATE_WALKS, NORTH_BLOCK, NORTH_LAMPS, NORTH_PEOPLE, NORTH_RECT, NORTH_SOLIDS, NORTH_SQUARE, NORTH_TREES, POOL, SERVICE_WAY, SQUARE_BENCHES, WEST_COL } from '../src/scripts/city3d/uptownnorth';
import { HIGHRISES } from '../src/scripts/city3d/highrise';
import { FRONTAGES } from '../src/scripts/city3d/streetlevel';
import { PLAN, distToStreet } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { GATES, WESTLAKE_RECT } from '../src/scripts/city3d/westlake';
import { MALL_BLOCK, TOWER_ZEBRA } from '../src/scripts/city3d/mall';
import { NS_ROADS } from '../src/scripts/city3d/layout';

type Pt = [number, number];
const inRect = ([x, z]: Pt, r: readonly number[], m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
const overlap = (a: readonly number[], b: readonly number[]) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
const towers = HIGHRISES.filter((t) => t.block === NORTH_BLOCK.id);
const roads = PLAN.streets.filter((s) => s.kind !== 'alley');

test("its block: Palm Court's old land between the park and the north avenue, in the plan as Uptown's", () => {
  const b = PLAN.blocks.find((q) => q.id === NORTH_BLOCK.id)!;
  assert.ok(b && b.ref === 'uptown' && b.use === 'plain');
  assert.ok(!PLAN.blocks.some((q) => q.id !== b.id && q.id !== 'palm-court' && q.poly.some((p) => inRect(p, NORTH_RECT, -0.01))), 'nothing else on its land');
  assert.ok(NORTH_RECT[0] >= WESTLAKE_RECT[2] && NORTH_RECT[2] < MALL_BLOCK[0]);
  for (const p of NORTH_BLOCK.poly) for (const s of roads) assert.ok(distToStreet(s, p) > s.half + 0.79, `its sidewalk on ${s.id}`);
});

test("seven towers as tall as Uptown's, in the two columns either side of the service way, clear of the gates' walks and the square", () => {
  assert.equal(towers.length, 7);
  assert.ok(towers.every((t) => t.roof >= 20 && t.roof <= 32));
  assert.ok(new Set(towers.map((t) => t.design)).size >= 4, 'a mix of designs');
  for (const t of towers) {
    const col = t.lot[2] <= WEST_COL[1] + 1e-6 ? WEST_COL : EAST_COL;
    assert.ok(t.lot[0] >= col[0] - 1e-6 && t.lot[2] <= col[1] + 1e-6, `${t.id} in its column`);
    assert.equal(t.front, col === WEST_COL ? 'w' : 'e', `${t.id}'s lobby on the park or the avenue`);
    assert.ok(!overlap(t.lot, SERVICE_WAY) && !overlap(t.lot, NORTH_SQUARE), `${t.id} in the way`);
    for (const w of GATE_WALKS) assert.ok(!overlap(t.lot, w), `${t.id} on a gate's walk`);
  }
  // The park's east gates on the block, each with its walk
  const gates = GATES.filter((g) => g.out[0] === 1 && g.at[1] > NORTH_RECT[1] && g.at[1] < NORTH_RECT[3]);
  assert.equal(GATE_WALKS.length, gates.length);
  assert.ok(gates.length >= 2);
});

test("the towers' sides on the square and the gates' walks are dining; nearly every one has shops", () => {
  for (const f of FRONTAGES.filter((q) => towers.some((t) => t.id === q.tower) && q.street === 'square')) assert.equal(f.char, 'dining');
  assert.ok(FRONTAGES.filter((q) => q.street === 'square').length >= 6);
  assert.ok(towers.filter((t) => FRONTAGES.some((f) => f.tower === t.id && f.units.length)).length >= towers.length - 1);
});

test('the square: the pool in its middle, trees, benches and lamps round it clear of each other, the towers and the streets', () => {
  assert.ok(inRect([POOL.x, POOL.z], NORTH_SQUARE, -POOL.r - 3));
  assert.ok(POOL.h + POOL.sculpture < 12.5, 'its sculpture under the Emporium');
  for (const p of [...NORTH_TREES.map(([x, z]): Pt => [x, z]), ...SQUARE_BENCHES.map((b): Pt => [b.x, b.z])]) {
    assert.ok(inRect(p, NORTH_SQUARE) && Math.hypot(p[0] - POOL.x, p[1] - POOL.z) > POOL.r + 0.8, `at ${p}`);
    assert.ok(!SOLIDS.some((b) => inRect(p, b, 0.3)), `in something solid at ${p}`);
  }
  for (const [x, z] of NORTH_LAMPS) {
    assert.ok(inRect([x, z], NORTH_RECT), `a lamp off the block at ${x}, ${z}`);
    assert.ok(!SOLIDS.some((b) => inRect([x, z], b, 0.2)), `a lamp in something solid at ${x}, ${z}`);
    for (const s of roads) assert.ok(distToStreet(s, [x, z]) > s.half + 0.3);
  }
  for (const p of NORTH_PEOPLE) if (p.act !== 'sit') assert.ok(!SOLIDS.some((b) => inRect([p.x, p.z], b, 0.2)), `someone at ${p.x}, ${p.z} in something`);
  for (const b of NORTH_SOLIDS) assert.ok(SOLIDS.includes(b));
});

test("on foot from the park's east gates through to the avenue, and from the square over the zebra to the mall's forecourt", () => {
  const solid = (x: number, z: number) => SOLIDS.some((b) => inRect([x, z], b, 0.3));
  const [x0, z0, x1, z1] = [NORTH_RECT[0] - 1, NORTH_RECT[1], MALL_BLOCK[0] + 4, NORTH_RECT[3]];
  const step = 0.5;
  const nx = Math.ceil((x1 - x0) / step);
  const nz = Math.ceil((z1 - z0) / step);
  const seen = new Uint8Array(nx * nz);
  const ix = (x: number) => Math.round((x - x0) / step);
  const iz = (z: number) => Math.round((z - z0) / step);
  const from: Pt = [POOL.x + POOL.r + 2.5, POOL.z];
  const queue: [number, number][] = [[ix(from[0]), iz(from[1])]];
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
  for (const w of GATE_WALKS) {
    const z = (w[1] + w[3]) / 2;
    assert.ok(seen[iz(z) * nx + ix(NORTH_RECT[0] + 0.3)], `the gate at ${z} can't be reached`);
    assert.ok(seen[iz(z) * nx + ix(NORTH_RECT[2] - 0.3)], `the avenue at ${z} can't be reached`);
  }
  const ns0 = NS_ROADS[0];
  assert.ok(seen[iz(TOWER_ZEBRA.z) * nx + ix(ns0.c + ns0.half + 1)], "the mall's side of the zebra can't be reached");
});
