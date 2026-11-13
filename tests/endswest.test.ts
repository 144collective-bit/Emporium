// Endswood carried west (endswest.ts, docs/ends-west-plan.md Phase 1, the owner's picks: still Endswood, the Close
// carried west with its bollards at the far end, houses facing paths and greens with cars in courts behind, the near
// half): its land outside the highway's bend and off Lot 9 and the Docks; the Close in the street plan reaching its far
// end, crossing the tunnel's footpath on a zebra, carrying no traffic; the blocks, lanes, courts, rows, gardens, paths,
// greens and the reserve where they belong and never on each other; its lamps sodium, the trees and its sound
// Endswood's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLOSE_BOLLARDS, CLOSE_END, CLOSE_WEST, ENDS_SOLIDS, ROAD_HALF, ROAD_Z, WEST_RECT, WEST_X0, inEndswood } from '../src/scripts/city3d/endswood';
import {
  COURTS,
  CROSS_PATHS,
  GARDENS,
  GREENS,
  HOUSE_DEPTH,
  LANES,
  LINK_BLOCKS,
  PATHS,
  PATH_X,
  RESERVE,
  ROWS,
  WEST_BLOCKS,
  WEST_LAMPS,
  ZEBRA,
} from '../src/scripts/city3d/endswest';
import { FOOTPATH, LOT9_RECT, PATH_RECT } from '../src/scripts/city3d/lot9';
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
const blockOf = (r: Rect) => WEST_BLOCKS.find((b) => within(r, b.rect))!;

test("its land: outside the highway's bend, clear of its ramps, off Lot 9 and the Docks, in the world, west of the old estate", () => {
  for (const b of [...WEST_BLOCKS, ...LINK_BLOCKS]) {
    assert.ok(within(b.rect, WEST_RECT) || inEndswood((b.rect[0] + b.rect[2]) / 2, (b.rect[1] + b.rect[3]) / 2), `${b.id} off the estate's land`);
    for (const [x, z] of corners(b.rect)) {
      assert.ok(!insideHighway(x, z) && fromHighway(x, z) > HIGHWAY_HALF + 6, `${b.id}'s corner ${x}, ${z} by the highway`);
      assert.ok(!rampLand(x, z), `${b.id} on ramp land`);
    }
    assert.ok(!inRect(LOT9_RECT, b.rect[0], b.rect[3]) && !inRect(LOT9_RECT, b.rect[2], b.rect[3]), `${b.id} on Lot 9`);
  }
  assert.ok(WEST_RECT[3] <= LOT9_RECT[1], "above Lot 9's land");
  assert.ok(WEST_RECT[1] > DOCKS_RECT[3], 'south of the Docks');
  assert.ok(WEST_RECT[0] > WORLD_BOUNDS[0] + 100, 'well in the world');
  // (the near half only, the owner's pick: the land west of it kept for later)
  assert.ok(WEST_X0 >= -205 && WEST_X0 <= -195);
});

test("the Close carried west: in the street plan to its far end, its bollards across it there, no traffic down it", () => {
  const close = PLAN.streets.find((s) => s.id === 'ends-close')!;
  assert.ok(close, 'the Close is a street');
  const xs = close.pts.map((p) => p[0]);
  assert.ok(Math.abs(Math.min(...xs) - CLOSE_WEST) < 1e-9, 'it reaches the far end');
  assert.ok(close.pts.every((p) => p[1] === ROAD_Z), 'straight along the road line');
  // The bollards: four across the road at the far end, none left at the old end
  assert.equal(CLOSE_BOLLARDS.length, 4);
  for (const [x, z] of CLOSE_BOLLARDS) {
    assert.ok(Math.abs(x - CLOSE_WEST) < 0.5 && Math.abs(z - ROAD_Z) <= ROAD_HALF * 1.25, `a bollard at ${x}, ${z}`);
    assert.ok(SOLIDS.some((b) => inRect(b, x, z)) && ENDS_SOLIDS.some((b) => inRect(b, x, z)));
  }
  assert.ok(!SOLIDS.some((b) => inRect(b, CLOSE_END + 0.35, ROAD_Z)), 'the old end is open');
  // (a dead end: no route drives it past the old end)
  for (const r of ROUTES) for (const p of r.pts) assert.ok(!(p[0] < CLOSE_END - 1 && Math.abs(p[1] - ROAD_Z) < ROAD_HALF + 1), `a route down the Close at ${p}`);
  // The blocks either side reach its far end; nothing solid on the road between the ends
  for (const b of WEST_BLOCKS) assert.equal(b.rect[0], WEST_X0);
  for (let x = CLOSE_WEST + 1; x < CLOSE_END; x += 0.5) for (const z of [ROAD_Z - ROAD_HALF + 0.2, ROAD_Z, ROAD_Z + ROAD_HALF - 0.2]) assert.ok(!SOLIDS.some((b) => inRect(b, x, z)), `something solid on the Close at ${x}, ${z}`);
});

test("the tunnel's footpath crosses it on a zebra, the pavements stopping either side of the path", () => {
  // The zebra's middle on the footpath's line where it crosses the road
  const near = FOOTPATH.filter((p) => Math.abs(p[1] - ROAD_Z) < 8);
  assert.ok(near.some((p) => Math.abs(p[0] - PATH_X) < 1.2));
  assert.equal(ZEBRA.x, PATH_X);
  assert.ok(ZEBRA.half > 1, 'wider than the path');
  // The pavements (their slabs reach WALK_W further) keep off the path's land
  for (const b of LINK_BLOCKS) {
    const slab: Rect = [b.rect[0] - WALK_W, b.rect[1] - WALK_W, b.rect[2] + WALK_W, b.rect[3] + WALK_W];
    assert.ok(!overlap(slab, [PATH_RECT[0], ROAD_Z - 5, PATH_RECT[2], ROAD_Z + 5]), `${b.id} over the footpath`);
    assert.ok(Math.abs(b.rect[1] - ROAD_Z) < ROAD_HALF + WALK_W + 1 || Math.abs(b.rect[3] - ROAD_Z) < ROAD_HALF + WALK_W + 1, `${b.id} beside the road`);
  }
  // And the links reach the extension's blocks' sidewalks on the one side
  const west = Math.min(...LINK_BLOCKS.map((b) => b.rect[0]));
  assert.ok(west - WALK_W <= WEST_BLOCKS[0].rect[2] + WALK_W + 0.01, 'the pavement joins the extension');
});

test('on the blocks: lanes, courts, rows, gardens, paths, greens and the reserve in their block, none on another', () => {
  const things: [string, Rect][] = [
    ...LANES.map((r, i): [string, Rect] => [`lane ${i}`, r]),
    ...COURTS.map((r, i): [string, Rect] => [`court ${i}`, r]),
    ...ROWS.map((r): [string, Rect] => [`row ${r.id}`, r.rect]),
    ...GARDENS.map((r, i): [string, Rect] => [`garden ${i}`, r]),
    ...GREENS.map((r, i): [string, Rect] => [`green ${i}`, r]),
    ...RESERVE.map((r, i): [string, Rect] => [`reserve ${i}`, r]),
  ];
  for (const [id, r] of [...things, ...PATHS.map((r, i): [string, Rect] => [`path ${i}`, r]), ...CROSS_PATHS.map((r, i): [string, Rect] => [`cross path ${i}`, r])]) {
    assert.ok(r[2] > r[0] && r[3] > r[1], `${id} empty`);
    assert.ok(blockOf(r), `${id} off the blocks`);
  }
  for (let i = 0; i < things.length; i++) for (let j = i + 1; j < things.length; j++) assert.ok(!overlap(things[i][1], things[j][1]), `${things[i][0]} on ${things[j][0]}`);
  // Paths never on a row, a garden, a court or the reserve
  for (const p of [...PATHS, ...CROSS_PATHS]) for (const [id, r] of things.filter(([id]) => !id.startsWith('green') && !id.startsWith('lane'))) assert.ok(!overlap(p, r), `a path on ${id}`);
});

test('houses face paths and greens, cars in courts behind: every row fronts a path, backs onto its garden, a lane to each court', () => {
  assert.ok(ROWS.length >= 6);
  for (const r of ROWS) {
    const [x0, z0, x1, z1] = r.rect;
    assert.ok(Math.abs(z1 - z0 - HOUSE_DEPTH) < 1e-9);
    const front = r.faces > 0 ? z1 : z0;
    const back = r.faces > 0 ? z0 : z1;
    assert.ok(PATHS.some((p) => p[0] <= x0 && p[2] >= x1 && (r.faces > 0 ? Math.abs(p[1] - front) < 1e-9 : Math.abs(p[3] - front) < 1e-9)), `${r.id}'s front on a path`);
    assert.ok(GARDENS.some((g) => g[0] === x0 && g[2] === x1 && (r.faces > 0 ? Math.abs(g[3] - back) < 1e-9 : Math.abs(g[1] - back) < 1e-9)), `${r.id}'s garden behind it`);
    // (a court behind most: a row with none has its garden down to the block's edge)
  }
  assert.ok(ROWS.filter((r) => COURTS.some((c) => Math.abs((r.faces > 0 ? c[3] : c[1]) - (r.faces > 0 ? r.rect[1] : r.rect[3])) < 6)).length >= 4, 'most rows have a court behind');
  // Every court is reached from a lane, and every lane from the Close
  for (const c of COURTS) assert.ok(LANES.some((l) => Math.abs(l[2] - c[0]) < 1e-9 && l[1] <= c[1] && l[3] >= c[3]), `a court at ${c} with no lane`);
  for (const l of LANES) assert.ok(Math.abs(l[3] - (ROAD_Z - ROAD_HALF - WALK_W)) < 1e-9 || Math.abs(l[1] - (ROAD_Z + ROAD_HALF + WALK_W)) < 1e-9, 'a lane off the Close');
  // Each green between two rows facing it
  for (const g of GREENS) assert.ok(ROWS.filter((r) => r.rect[0] === g[0] && Math.abs((r.faces > 0 ? r.rect[3] : r.rect[1]) - (r.faces > 0 ? g[1] : g[3])) < 2).length === 2, `a green at ${g} without two rows facing it`);
});

test('its lamps, trees and sound are Endswood\'s: sodium on its sidewalks and in its courts, no trees, the estate heard', () => {
  for (const [x, z, , y] of WEST_LAMPS) {
    assert.ok(inEndswood(x, z), `a lamp off the estate at ${x}, ${z}`);
    // (sodium all the way in; at the land's outer edges mixed a little with the white, as every sodium district's)
    const onClose = Math.abs(z - ROAD_Z) < ROAD_HALF + 1 && x > -185;
    assert.ok(sodiumShare(x, z) > (onClose ? 0.99 : 0.7), `a white lamp at ${x}, ${z}: ${sodiumShare(x, z).toFixed(2)}`);
    assert.equal(lampStyle(x, z), 'cobra');
    assert.ok(y > 0.1, 'on the slab');
    assert.ok(!ROWS.some((r) => inRect(r.rect, x, z, 0.5)), `a lamp on a row at ${x}, ${z}`);
    assert.ok(!(Math.abs(z - ROAD_Z) < ROAD_HALF), `a lamp in the road at ${x}`);
  }
  for (const b of WEST_BLOCKS) for (let x = b.rect[0]; x <= b.rect[2]; x += 3) for (let z = b.rect[1]; z <= b.rect[3]; z += 3) assert.ok(!treeSpot(x, z), `a tree may stand at ${x}, ${z}`);
  const a = ambienceAt(-170, 410, 0, 0);
  assert.ok(a.ends > 0.9, `the estate's sound ${a.ends}`);
});
