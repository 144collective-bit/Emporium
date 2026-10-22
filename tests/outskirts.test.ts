// The edge as data (growth plan Phase 5): the outskirts' trees are seeded tile by tile at a density per area, so a
// bigger world has more trees, never thinner ones, and the same trees where the world already was; the camera's pan
// and the Build overview come from the city, not the edge. Runs at today's size and at Phase 6's (npm run test:wide).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BELT, BELT_FREE, OPEN_FREE, freeLand, outskirtsTrees, treeSpot } from '../src/scripts/city3d/outskirts';
import { BUILT_UP, PAN_BOUNDS, PAN_MARGIN, overviewFrame } from '../src/scripts/city3d/bounds';
import { EXT, WORLD_BOUNDS } from '../src/scripts/city3d/layout';

const TODAY: [number, number] = [-200, 240];
const WIDE: [number, number] = [-420, 460];

test('the densities still fit today\'s land', () => {
  const belt = freeLand(BELT, 2);
  const open = freeLand([TODAY[0] + 4, TODAY[0] + 4, TODAY[1] - 4, TODAY[1] - 4], 2, BELT);
  assert.ok(Math.abs(belt - BELT_FREE) / BELT_FREE < 0.03, `belt ${belt} against ${BELT_FREE}`);
  assert.ok(Math.abs(open - OPEN_FREE) / OPEN_FREE < 0.03, `open land ${open} against ${OPEN_FREE}`);
});

test('today\'s world keeps the trees it had, each where a tree may stand', () => {
  for (const count of [250, 150, 90]) {
    const trees = outskirtsTrees(count, 0.6, [], TODAY);
    assert.ok(Math.abs(trees.length - count * 1.6) / (count * 1.6) < 0.08, `${trees.length} for ${count}`);
    for (const t of trees) {
      assert.ok(treeSpot(t.x, t.z));
      assert.ok(t.x > TODAY[0] + 4 && t.x < TODAY[1] - 4 && t.z > TODAY[0] + 4 && t.z < TODAY[1] - 4);
    }
  }
  assert.deepEqual(outskirtsTrees(150, 0.6, [], TODAY), outskirtsTrees(150, 0.6, [], TODAY), 'seeded');
});

test('a bigger world has more trees, never thinner ones, and the same trees where the world already was', () => {
  const today = outskirtsTrees(150, 0.6, [], TODAY);
  const wide = outskirtsTrees(150, 0.6, [], WIDE);
  // Whole tiles inside today's land (tiles start at multiples of 30)
  const inner = (t: { x: number; z: number }) => t.x >= -180 && t.x < 210 && t.z >= -180 && t.z < 210;
  assert.deepEqual(wide.filter(inner), today.filter(inner));
  // The open land's density holds: trees a unit of open land, about the same both ways
  const open = (ext: [number, number], n: number) => n / ((ext[1] - ext[0] - 8) ** 2);
  const outside = (ts: typeof today) => ts.filter((t) => !(t.x > BELT[0] && t.x < BELT[2] && t.z > BELT[1] && t.z < BELT[3])).length;
  const [a, b] = [open(TODAY, outside(today)), open(WIDE, outside(wide))];
  assert.ok(b > a * 0.9, `${b} against ${a}`);
  assert.ok(wide.length > today.length * 2);
  // Land kept clear stays clear
  const clear: [number, number, number, number] = [-190, 100, -46, 228];
  assert.ok(outskirtsTrees(150, 0.6, [clear], TODAY).every((t) => !(t.x > clear[0] - 2 && t.x < clear[2] + 2 && t.z > clear[1] - 2 && t.z < clear[3] + 2)));
});

test('City view pans round the built-up area, never past the world, and the Build overview frames the plots', () => {
  for (const k of [0, 1, 2, 3] as const) {
    // Inside the world, 10 in from where you can walk
    assert.ok(k < 2 ? PAN_BOUNDS[k] >= WORLD_BOUNDS[k] + 10 - 1e-9 : PAN_BOUNDS[k] <= WORLD_BOUNDS[k] - 10 + 1e-9);
    // and never further than PAN_MARGIN from the built-up area
    assert.ok(Math.abs(PAN_BOUNDS[k] - BUILT_UP[k]) <= PAN_MARGIN + 1e-9);
  }
  if (EXT[0] === TODAY[0] && EXT[1] === TODAY[1]) {
    // Today: what it was, the world's bounds 10 in
    assert.deepEqual(PAN_BOUNDS, [WORLD_BOUNDS[0] + 10, WORLD_BOUNDS[1] + 10, WORLD_BOUNDS[2] - 10, WORLD_BOUNDS[3] - 10]);
  } else {
    // A bigger world: the pan stops round the city, short of the far edge
    assert.ok(PAN_BOUNDS[0] > WORLD_BOUNDS[0] + 10 && PAN_BOUNDS[3] < WORLD_BOUNDS[3] - 10);
  }
  // The Build overview: where it always looked from (the plots don't move)
  const f = overviewFrame();
  assert.deepEqual(f.target, [20, 34]);
  assert.equal(f.scale, 1);
});
