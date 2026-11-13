// The Ends' far west (endsfar.ts, docs/ends-far-west-plan.md Phase 1, the owner's picks: still Endswood, Degen's
// compound its centrepiece on a new plot, bungalows and allotments round it): its land west of the rows, clear of the
// highway, Lot 9 and the Docks; the Close carried on to a T with the lane, no traffic down either; the compound's
// plot at the head of the Close, its gates opposite the road's end; the plots round it, none on another or on a road;
// its lamps sodium, the trees and its sound Endswood's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLOSE_WEST, ROAD_HALF, ROAD_Z, WEST_RECT, WEST_X0, inEndswood } from '../src/scripts/city3d/endswood';
import { FAR_BLOCKS, FAR_CROSSINGS, FAR_LAMPS, FAR_RECT, FAR_STREETS, GATES, HEAD, LANE_HALF, LANE_X, LANE_Z, PLOT } from '../src/scripts/city3d/endsfar';
import { LANES, WEST_BLOCKS } from '../src/scripts/city3d/endswest';
import { LOT9_RECT } from '../src/scripts/city3d/lot9';
import { DOCKS_RECT } from '../src/scripts/city3d/docks';
import { PLAN } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { HIGHWAY_HALF, fromHighway, insideHighway } from '../src/scripts/city3d/highway';
import { rampLand } from '../src/scripts/city3d/viaduct';
import { ROUTES } from '../src/scripts/city3d/routes';
import { treeSpot } from '../src/scripts/city3d/outskirts';
import { sodiumShare } from '../src/scripts/city3d/lampmix';
import { lampStyle } from '../src/scripts/city3d/lampposts';
import { ambienceAt } from '../src/scripts/city3d/ambience';
import { LAZY_DISTRICTS } from '../src/scripts/city3d/districts';
import { WORLD_BOUNDS, WALK_W } from '../src/scripts/city3d/layout';

type Rect = [number, number, number, number];
const inRect = (r: readonly number[], x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
const within = (inner: readonly number[], outer: readonly number[], m = 0) => inner[0] >= outer[0] - m && inner[1] >= outer[1] - m && inner[2] <= outer[2] + m && inner[3] <= outer[3] + m;
const overlap = (a: readonly number[], b: readonly number[], m = 1e-6) => a[0] < b[2] - m && a[2] > b[0] + m && a[1] < b[3] - m && a[3] > b[1] + m;
const corners = (r: readonly number[]): [number, number][] => [
  [r[0], r[1]],
  [r[2], r[1]],
  [r[0], r[3]],
  [r[2], r[3]],
];
/** A block with its sidewalk round it (its slab) */
const slab = (r: Rect): Rect => [r[0] - WALK_W, r[1] - WALK_W, r[2] + WALK_W, r[3] + WALK_W];
/** The roads' asphalt */
const CLOSE_RUN: Rect = [LANE_X + LANE_HALF, ROAD_Z - ROAD_HALF, CLOSE_WEST, ROAD_Z + ROAD_HALF];
const LANE_RUN: Rect = [LANE_X - LANE_HALF, LANE_Z[0], LANE_X + LANE_HALF, LANE_Z[1]];

test("its land: west of the rows and one with them, outside the highway, off Lot 9 and the Docks, well in the world", () => {
  for (const b of FAR_BLOCKS) {
    assert.ok(within(b.rect, FAR_RECT), `${b.id} off the far west's land`);
    assert.ok(b.rect[2] > b.rect[0] && b.rect[3] > b.rect[1], `${b.id} empty`);
    for (const [x, z] of corners(b.rect)) {
      assert.ok(inEndswood(x, z, 0.01), `${b.id}'s corner ${x}, ${z} off the estate`);
      assert.ok(!insideHighway(x, z) && fromHighway(x, z) > HIGHWAY_HALF + 6, `${b.id}'s corner ${x}, ${z} by the highway`);
      assert.ok(!rampLand(x, z), `${b.id} on ramp land`);
      assert.ok(!inRect(LOT9_RECT, x, z), `${b.id} on Lot 9`);
    }
  }
  assert.ok(FAR_RECT[3] <= LOT9_RECT[1], "above Lot 9's land");
  assert.ok(FAR_RECT[1] > DOCKS_RECT[3], 'south of the Docks');
  assert.ok(FAR_RECT[0] > WORLD_BOUNDS[0] + 100, 'well in the world');
  // West of the rows, and reaching into their land so the two read as one (a point on the seam is the estate's middle)
  assert.ok(FAR_RECT[2] > WEST_RECT[0] && FAR_RECT[0] < WEST_RECT[0]);
  assert.ok(inEndswood(WEST_RECT[0], ROAD_Z, -3), 'the seam between the rows and the far west is inside the estate');
  // Loaded as you approach, a chunk of its own
  assert.ok(LAZY_DISTRICTS.some((d) => d.id === 'endsfar' && d.rect === FAR_RECT));
});

test('the Close carried on to a T with the lane: in the street plan, joined end to end, nothing solid on them, no traffic', () => {
  for (const t of FAR_STREETS) assert.ok(PLAN.streets.some((s) => s.id === t.id && s.kind === 'street'), t.id);
  for (const c of FAR_CROSSINGS) assert.ok(PLAN.crossings.some((x) => x.id === c.id && !x.lights), c.id);
  const [run, lane] = FAR_STREETS;
  // It starts where the Close ended and runs straight on to the lane's centre line
  const close = PLAN.streets.find((s) => s.id === 'ends-close')!;
  assert.deepEqual(run.pts[0], [Math.min(...close.pts.map((p) => p[0])), ROAD_Z]);
  assert.deepEqual(run.pts[0], [CLOSE_WEST, ROAD_Z]);
  assert.deepEqual(run.pts.at(-1), HEAD);
  assert.deepEqual(HEAD, [LANE_X, ROAD_Z]);
  // The lane crosses its end, north and south of it, through the T
  assert.ok(lane.pts.every((p) => p[0] === LANE_X));
  assert.ok(LANE_Z[0] < ROAD_Z - 20 && LANE_Z[1] > ROAD_Z + 20);
  assert.ok(lane.pts.some((p) => p[1] === ROAD_Z), 'a point at the T');
  assert.ok(LANE_X < WEST_X0 - 10, 'clear of the rows and their service lanes');
  for (const l of LANES) assert.ok(!overlap(l, LANE_RUN) && !overlap(l, CLOSE_RUN));
  // Nothing solid on either (the Close's bollards are gone), and no route drives them
  for (const r of [CLOSE_RUN, LANE_RUN]) for (let x = r[0] + 0.2; x < r[2]; x += 0.5) for (let z = r[1] + 0.2; z < r[3]; z += 0.5) assert.ok(!SOLIDS.some((b) => inRect(b, x, z)), `something solid on the road at ${x}, ${z}`);
  for (const r of ROUTES) for (const p of r.pts) assert.ok(!inRect(CLOSE_RUN, p[0], p[1], 1) && !inRect(LANE_RUN, p[0], p[1], 1), `a route in the far west at ${p}`);
});

test("the compound's plot: at the head of the Close, its gates opposite the road's end, 26 by 24", () => {
  const [x0, z0, x1, z1] = PLOT;
  assert.ok(Math.abs(x1 - x0 - 26) < 1e-9 && Math.abs(z1 - z0 - 24) < 1e-9);
  assert.equal((z0 + z1) / 2, ROAD_Z, 'on the Close\'s line');
  assert.ok(x1 < LANE_X - LANE_HALF, 'west of the lane');
  assert.ok(Math.abs(x1 + WALK_W - (LANE_X - LANE_HALF)) < 1e-9, 'its sidewalk on the lane\'s kerb');
  assert.deepEqual(FAR_BLOCKS[0], { id: 'ends-fc', use: 'compound', rect: PLOT, poly: FAR_BLOCKS[0].poly });
  // The gates: on its east edge, as wide as the Close and a little more, facing straight down it
  assert.equal(GATES.x, x1);
  assert.ok(GATES.z0 < ROAD_Z - ROAD_HALF && GATES.z1 > ROAD_Z + ROAD_HALF && GATES.z1 - GATES.z0 < ROAD_HALF * 2 + 1);
  assert.ok(GATES.z0 > z0 + 2 && GATES.z1 < z1 - 2, 'wall either side of them');
  // (a car coming down the Close meets nothing between its end and the gates but the lane)
  for (let x = GATES.x + WALK_W + 0.1; x < CLOSE_WEST; x += 0.5) assert.ok(inRect(LANE_RUN, x, ROAD_Z) || inRect(CLOSE_RUN, x, ROAD_Z, 0.01), `off the road at ${x}`);
});

test('the plots round it: the bungalows north and south along the lane, the allotments behind, the verge by the rows; none on another or on a road', () => {
  const by = (use: string) => FAR_BLOCKS.filter((b) => b.use === use);
  assert.deepEqual([by('compound').length, by('bungalows').length, by('allotments').length, by('verge').length], [1, 2, 1, 2]);
  assert.equal(new Set(FAR_BLOCKS.map((b) => b.id)).size, FAR_BLOCKS.length);
  // Sidewalks and all, no block on another, on the rows' blocks, or on the asphalt
  const all = [...FAR_BLOCKS.map((b) => ({ id: b.id, r: slab(b.rect) })), ...WEST_BLOCKS.map((b) => ({ id: b.id, r: slab(b.rect) }))];
  for (let i = 0; i < FAR_BLOCKS.length; i++) for (let j = i + 1; j < all.length; j++) assert.ok(!overlap(all[i].r, all[j].r), `${all[i].id} on ${all[j].id}`);
  for (const b of FAR_BLOCKS) for (const road of [CLOSE_RUN, LANE_RUN]) assert.ok(!overlap(slab(b.rect), road), `${b.id} on a road`);
  // The bungalows' land fronts the lane either side of the compound; the allotments lie behind all three
  for (const b of by('bungalows')) {
    assert.equal(b.rect[2], PLOT[2], `${b.id} on the lane`);
    assert.equal(b.rect[0], PLOT[0]);
    assert.ok(b.rect[3] < PLOT[1] || b.rect[1] > PLOT[3]);
    assert.ok(b.rect[3] - b.rect[1] >= 16, `${b.id} deep enough for a close of bungalows`);
  }
  const [a] = by('allotments');
  assert.ok(a.rect[2] < PLOT[0] && a.rect[1] <= LANE_Z[0] && a.rect[3] >= LANE_Z[1]);
  // The verge fills the land between the lane and the rows, either side of the Close
  for (const v of by('verge')) {
    assert.ok(v.rect[0] > LANE_X + LANE_HALF && v.rect[2] < WEST_X0);
    assert.ok(Math.abs(v.rect[2] + WALK_W - CLOSE_WEST) < 1e-9, `${v.id}'s sidewalk meets the rows'`);
  }
});

test("its lamps, trees and sound are Endswood's: sodium by its roads, no trees, the estate heard", () => {
  assert.ok(FAR_LAMPS.length >= 4);
  for (const [x, z, , y] of FAR_LAMPS) {
    assert.ok(inEndswood(x, z), `a lamp off the estate at ${x}, ${z}`);
    assert.ok(sodiumShare(x, z) > 0.7, `a white lamp at ${x}, ${z}: ${sodiumShare(x, z).toFixed(2)}`);
    assert.equal(lampStyle(x, z), 'cobra');
    assert.ok(y > 0.1, 'on the slab');
    assert.ok(!inRect(CLOSE_RUN, x, z) && !inRect(LANE_RUN, x, z), `a lamp in the road at ${x}, ${z}`);
    assert.ok(FAR_BLOCKS.some((b) => inRect(slab(b.rect), x, z, 0.01)), `a lamp off the sidewalks at ${x}, ${z}`);
    assert.ok(!inRect(PLOT, x, z, 0.3), 'never on the compound');
  }
  for (const b of FAR_BLOCKS) for (let x = b.rect[0]; x <= b.rect[2]; x += 3) for (let z = b.rect[1]; z <= b.rect[3]; z += 3) assert.ok(!treeSpot(x, z), `a tree may stand at ${x}, ${z}`);
  assert.ok(ambienceAt((PLOT[0] + PLOT[2]) / 2, ROAD_Z, 0, 0).ends > 0.9, "the estate's sound at the compound");
});
