// The far west round the compound (endsfarhomes.ts, docs/ends-far-west-plan.md Phase 4, the owner's pick: a small
// close of bungalows along the lane, allotments behind): the bungalows on their blocks either side of the compound,
// facing the lane, each with a way from the lane to its door, lower than everything of his; the allotments behind all
// three, fenced, gated opposite the compound's back gate, their plots off the paths; what's solid, and none of it on a
// road, the compound or each other.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALLOTMENT, BUNGALOW, BUNGALOWS, FAR_FENCE, FAR_HOME_SOLIDS, FRONT_WALL, PLOTS, SHED_H, WIRE, backFences, frontWall } from '../src/scripts/city3d/endsfarhomes';
import { FAR_BLOCKS, LANE_HALF, LANE_X, LANE_Z, PLOT } from '../src/scripts/city3d/endsfar';
import { HOME, HOME_PICK, HOME_SOLIDS } from '../src/scripts/city3d/home';
import { ROAD_HALF, ROAD_Z, SLAB_Y, inEndswood } from '../src/scripts/city3d/endswood';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { FAR_LAMPS } from '../src/scripts/city3d/endsfar';
import { WALK_W } from '../src/scripts/city3d/layout';

type Rect = [number, number, number, number];
const inRect = (r: readonly number[], x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
const within = (inner: readonly number[], outer: readonly number[], m = 0) => inner[0] >= outer[0] - m && inner[1] >= outer[1] - m && inner[2] <= outer[2] + m && inner[3] <= outer[3] + m;
const overlap = (a: readonly number[], b: readonly number[], m = 1e-6) => a[0] < b[2] - m && a[2] > b[0] + m && a[1] < b[3] - m && a[3] > b[1] + m;
const block = (use: string) => FAR_BLOCKS.filter((b) => b.use === use).map((b) => b.rect);
const R = 0.14;
const stands = (x: number, z: number) => ![...SOLIDS, ...FAR_HOME_SOLIDS].some((b) => inRect(b, x, z, R));

test('the bungalows: two on each block either side of the compound, facing the lane, lower than everything of his', () => {
  assert.equal(BUNGALOWS.length, 4);
  assert.equal(new Set(BUNGALOWS.map((b) => b.id)).size, 4);
  for (const B of block('bungalows')) assert.equal(BUNGALOWS.filter((b) => within(b.lot, B, 1e-9)).length, 2);
  for (const b of BUNGALOWS) {
    assert.ok(within(b.rect, b.lot, -0.5), `${b.id} tight on its lot`);
    assert.ok(within(b.front, b.lot, 1e-9) && within(b.back, b.lot, 1e-9));
    assert.ok(!overlap(b.rect, b.front) && !overlap(b.rect, b.back) && !overlap(b.front, b.back));
    // It fronts the lane: its front garden on the block's east edge, a garden's depth from the kerb
    assert.ok(Math.abs(b.front[2] + WALK_W - (LANE_X - LANE_HALF)) < 1e-9, `${b.id}'s garden on the lane's sidewalk`);
    assert.ok(Math.abs(b.rect[2] - b.rect[0] - BUNGALOW.depth) < 1e-9 && b.rect[3] - b.rect[1] > 5);
    assert.ok(b.doorZ > b.rect[1] + 0.5 && b.doorZ < b.rect[3] - 0.5, `${b.id}'s door on its front`);
    for (const [x, z] of [[b.lot[0], b.lot[1]], [b.lot[2], b.lot[3]]]) assert.ok(inEndswood(x, z, 0.01));
    assert.ok(!overlap(b.lot, PLOT), `${b.id} on the compound`);
    if (b.shed) assert.ok(within(b.shed, b.back, -0.05) && !overlap(b.shed, b.rect), `${b.id}'s shed in its back garden`);
    assert.ok(inRect(b.front, b.bin[0], b.bin[1]) && Math.abs(b.bin[1] - b.doorZ) > 0.9, `${b.id}'s bin in the front garden, off the path`);
  }
  // No two neighbours share a door's colour; one storey, and his is the tallest thing out here
  for (const B of block('bungalows')) {
    const [a, c] = BUNGALOWS.filter((b) => within(b.lot, B, 1e-9));
    assert.notEqual(a.door, c.door);
  }
  assert.ok(BUNGALOW.ridge < HOME.garageTop + 0.01, 'under his garage\'s top');
  assert.ok(BUNGALOW.ridge < HOME.eaves && BUNGALOW.eaves < 1.3);
  assert.ok(HOME_PICK.every((p) => p.h >= HOME.workshopH));
});

test("a way from the lane to every bungalow's door; its garden walled in front, fenced behind", () => {
  for (const b of BUNGALOWS) {
    // Through the gap in the front wall opposite the door, straight up the path
    const walls = frontWall(b);
    assert.equal(walls.length, 2);
    assert.ok(walls.every((w) => !(b.doorZ > w[1] - 0.3 && b.doorZ < w[3] + 0.3)), `${b.id}'s path's gap is clear`);
    assert.ok(Math.abs(walls[1][1] - walls[0][3] - FRONT_WALL.gap) < 1e-9);
    for (let x = LANE_X - LANE_HALF; x > b.rect[2] + R + 0.02; x -= 0.1) assert.ok(stands(x, b.doorZ), `${b.id}'s path blocked at ${x}`);
    // The front wall runs the lot's whole front but for the gap; the fences close the back garden on three sides
    assert.ok(Math.abs(walls[0][1] - b.lot[1]) < 1e-9 && Math.abs(walls[1][3] - b.lot[3]) < 1e-9);
    const f = backFences(b);
    assert.equal(f.length, 3);
    for (const r of f) assert.ok(within(r, b.lot, 1e-9));
    for (let z = b.lot[1] + 0.2; z < b.lot[3]; z += 0.4) assert.ok(!stands(b.lot[0] + FAR_FENCE.t / 2, z), `${b.id}'s back fence open at ${z}`);
  }
  assert.ok(FRONT_WALL.h < 0.6 && FAR_FENCE.h > 0.8);
});

test('the allotments: behind the compound and the bungalows, fenced, a gate at each end and one opposite his back gate', () => {
  const [A] = block('allotments');
  assert.deepEqual(ALLOTMENT.rect, A);
  assert.ok(A[2] < PLOT[0] && A[1] <= LANE_Z[0] && A[3] >= LANE_Z[1]);
  const { paths, fence, gateZ, mid } = ALLOTMENT;
  // The east gate is on his back gate's line: from his gate you walk straight across to the middle path
  const G = HOME.backGate;
  assert.equal(gateZ, (G.z0 + G.z1) / 2);
  for (let x = G.x + 0.5; x > mid; x -= 0.1) assert.ok(stands(x, gateZ) && !HOME_SOLIDS.some((b) => inRect(b, x, gateZ, R)), `the way from his back gate blocked at ${x}`);
  // The middle path runs end to end through a gate in each end fence
  for (let z = A[1] - 0.5; z < A[3] + 0.5; z += 0.2) assert.ok(stands(mid, z), `the middle path blocked at ${z}`);
  for (const p of paths) assert.ok(within(p, A, 1e-9));
  // The fence is whole everywhere else
  for (const r of fence) assert.ok(within(r, A, 1e-9) && Math.min(r[2] - r[0], r[3] - r[1]) <= WIRE.t + 1e-9);
  for (let z = A[1] + 0.3; z < A[3]; z += 0.4) {
    assert.ok(!stands(A[0] + WIRE.t / 2, z), `the west fence open at ${z}`);
    assert.equal(stands(A[2] - WIRE.t / 2, z), Math.abs(z - gateZ) < WIRE.gate / 2 - R, `the east fence at ${z}`);
  }
  for (let x = A[0] + 0.3; x < A[2]; x += 0.3) for (const z of [A[1] + WIRE.t / 2, A[3] - WIRE.t / 2]) assert.equal(stands(x, z), Math.abs(x - mid) < WIRE.gate / 2 - R, `an end fence at ${x}`);
  assert.ok(WIRE.h < 0.9, 'low: seen over');
});

test('the plots: either side of the middle path, off the paths and each other, beds and sheds inside them', () => {
  assert.ok(PLOTS.length >= 12 && PLOTS.length % 2 === 0);
  assert.equal(new Set(PLOTS.map((p) => p.id)).size, PLOTS.length);
  for (const p of PLOTS) {
    assert.ok(within(p.rect, ALLOTMENT.rect, -0.3), `${p.id} at the fence`);
    for (const path of ALLOTMENT.paths) assert.ok(!overlap(p.rect, path), `${p.id} on a path`);
    for (const bed of p.beds) {
      assert.ok(within(bed.rect, p.rect, 1e-9) && bed.rect[2] > bed.rect[0] && bed.rect[3] > bed.rect[1]);
      if (p.shed) assert.ok(!overlap(bed.rect, p.shed), `${p.id}'s bed under its shed`);
    }
    for (let i = 0; i < p.beds.length; i++) for (let j = i + 1; j < p.beds.length; j++) assert.ok(!overlap(p.beds[i].rect, p.beds[j].rect));
    if (p.shed) {
      assert.ok(within(p.shed, p.rect, 1e-9));
      assert.ok(p.butt && inRect(p.rect, p.butt[0], p.butt[1], 0.01) && !inRect(p.shed, p.butt[0], p.butt[1]));
    } else assert.equal(p.butt, null);
  }
  for (let i = 0; i < PLOTS.length; i++) for (let j = i + 1; j < PLOTS.length; j++) assert.ok(!overlap(PLOTS[i].rect, PLOTS[j].rect), `${PLOTS[i].id} on ${PLOTS[j].id}`);
  // A mix: most are worked, some have sheds, some beds are dug bare, at least one plot is left to grass
  assert.ok(PLOTS.filter((p) => p.beds.length).length >= PLOTS.length * 0.7);
  assert.ok(PLOTS.some((p) => p.shed) && PLOTS.some((p) => !p.shed));
  assert.ok(PLOTS.some((p) => p.beds.some((b) => !b.crop)) && PLOTS.some((p) => p.beds.some((b) => b.crop)));
  assert.ok(new Set(PLOTS.flatMap((p) => p.beds.map((b) => b.crop))).size >= 4);
});

test("what's solid: on its own blocks, off the roads, the compound, the lamps and each other's doors", () => {
  const mine = [...block('bungalows'), ...block('allotments')];
  const roads: Rect[] = [
    [LANE_X - LANE_HALF, LANE_Z[0], LANE_X + LANE_HALF, LANE_Z[1]],
    [LANE_X, ROAD_Z - ROAD_HALF, -200, ROAD_Z + ROAD_HALF],
  ];
  for (const b of FAR_HOME_SOLIDS) {
    assert.ok(b[2] > b[0] && b[3] > b[1] && b[4] > SLAB_Y, `an empty solid ${b}`);
    assert.ok(mine.some((r) => within(b, r, 1e-9)), `a solid off its blocks: ${b}`);
    for (const r of roads) assert.ok(!overlap(b, r), 'a solid on a road');
    assert.ok(!overlap(b, PLOT), 'a solid on the compound');
    for (const h of HOME_SOLIDS) assert.ok(!overlap(b, h));
    for (const [x, z] of FAR_LAMPS) assert.ok(!inRect(b, x, z, 0.2), `a lamp at ${x}, ${z} in a solid`);
    assert.ok(!SOLIDS.includes(b), 'joined with the chunk, not at the boot');
  }
  // Every bungalow's body, every shed and every stretch of fence is there
  for (const h of BUNGALOWS) assert.ok(FAR_HOME_SOLIDS.some((b) => b[0] === h.rect[0] && b[2] === h.rect[2] && b[4] === SLAB_Y + BUNGALOW.ridge));
  for (const r of [...BUNGALOWS.map((b) => b.shed), ...PLOTS.map((p) => p.shed)]) if (r) assert.ok(FAR_HOME_SOLIDS.some((b) => b[0] === r[0] && b[1] === r[1] && b[2] === r[2] && b[3] === r[3] && b[4] === SLAB_Y + SHED_H), 'a shed');
  assert.equal(FAR_HOME_SOLIDS.length, BUNGALOWS.length * 6 + BUNGALOWS.filter((b) => b.shed).length + ALLOTMENT.fence.length + PLOTS.filter((p) => p.shed).length);
});
