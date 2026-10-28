// The edge as data (growth plan Phases 5 and 6): the outskirts' trees are seeded tile by tile at a density per area, so
// a bigger world has more trees, never thinner ones, and the same trees where the world already was; woods stand on
// the land well away from the city; the camera's pan comes from the city, not the edge, and it
// sees as far as the skyline past the edge. Runs at today's size and at Phase 10's (npm run test:wide).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BELT, BELT_FREE, OPEN_FREE, WOODS, WOODS_OFF, freeLand, inWoods, outskirtsTrees, treeSpot } from '../src/scripts/city3d/outskirts';
import { BUILT_UP, CAMERA_FAR, PAN_BOUNDS, PAN_MARGIN, SKYLINE, SKY_RADIUS } from '../src/scripts/city3d/bounds';
import { EXT, NS_ROADS, WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { MALL_AREA } from '../src/scripts/city3d/mall';
import { HIGHWAY_BOX } from '../src/scripts/city3d/highway';

/** The world before Phase 6 (the densities were worked out on it), Phase 6's and Phase 10's */
const TODAY: [number, number] = [-200, 240];
const P6: [number, number] = [-420, 460];
const WIDE: [number, number] = [-680, 720];
const inBox = (b: readonly number[], x: number, z: number) => x > b[0] && x < b[2] && z > b[1] && z < b[3];

/** Where the kart park stood when the densities were worked out (north of the Parkway; it moved north of the highway in the north side's stage 2) */
const OLD_KART: [number, number, number, number] = [92, -138, 180, -48];
/** Where the airport stood when they were worked out (it moved out to the world's south edge in docs/airport-plan.md Phase 3) */
const OLD_AIRPORT: [number, number, number, number] = [70.2, 169.5, 234, 279];
/** Either: their land is open again, its trees come at the same density as the rest */
const OLD = [OLD_KART, OLD_AIRPORT];
/** The land a tree could stand on in the mall's land before it was built (step 2, as freeLand counts): off the north-south roads and the highway's junctions */
function mallWas(r: readonly number[], skip?: readonly number[]) {
  const o = overlap(r, MALL_AREA);
  let n = 0;
  for (let x = o[0] + 1; x < o[2]; x += 2)
    for (let z = o[1] + 1; z < o[3]; z += 2) {
      if (skip && inBox(skip, x, z)) continue;
      if (NS_ROADS.some((q) => Math.abs(x - q.c) < q.half + 0.8)) continue;
      if (NS_ROADS.some((q) => Math.abs(x - q.c) < 17 && Math.abs(z - HIGHWAY_BOX[1]) < 17)) continue;
      n++;
    }
  return n * 4;
}
const overlap = (a: readonly number[], b: readonly number[]): [number, number, number, number] => [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];

test('the densities still fit the land the world had before Phase 6', () => {
  // (the kart park's and the airport's old land counted out: open again, its trees come at the same density as the rest)
  const outer: [number, number, number, number] = [TODAY[0] + 4, TODAY[0] + 4, TODAY[1] - 4, TODAY[1] - 4];
  const away = (r: [number, number, number, number], skip?: [number, number, number, number]) => OLD.reduce((n, o) => n + freeLand(overlap(r, o), 2, skip), 0);
  // (and the mall's land added back: built on since, docs/mall-plan.md; it was free but for the roads across it and
  // the highway's junctions)
  const belt = freeLand(BELT, 2) - away(BELT) + mallWas(BELT);
  const open = freeLand(outer, 2, BELT) - away(outer, BELT) + mallWas(outer, BELT);
  assert.ok(Math.abs(belt - BELT_FREE) / BELT_FREE < 0.03, `belt ${belt} against ${BELT_FREE}`);
  assert.ok(Math.abs(open - OPEN_FREE) / OPEN_FREE < 0.03, `open land ${open} against ${OPEN_FREE}`);
});

test('the world before Phase 6 keeps the trees it had (but by the highway), each where a tree may stand', () => {
  for (const count of [250, 150, 90]) {
    const all = outskirtsTrees(count, 0.6, [], TODAY);
    // (less the ones where the ring highway now runs, Phase 7: its north side crosses that land; the ones on the
    // airport's old land left out of the count, as it's open again)
    const trees = all.filter((t) => !inBox(OLD_AIRPORT, t.x, t.z));
    assert.ok(trees.length <= count * 1.6 * 1.08 && trees.length > count * 1.6 * 0.86, `${trees.length} for ${count}`);
    for (const t of trees) {
      assert.ok(treeSpot(t.x, t.z));
      assert.ok(t.x > TODAY[0] + 4 && t.x < TODAY[1] - 4 && t.z > TODAY[0] + 4 && t.z < TODAY[1] - 4);
    }
  }
  assert.deepEqual(outskirtsTrees(150, 0.6, [], TODAY), outskirtsTrees(150, 0.6, [], TODAY), 'seeded');
});

test('a bigger world has more trees, never thinner ones, and the same trees where the world already was', () => {
  for (const [small, big, inner] of [
    // Whole tiles inside the smaller world's land (tiles start at multiples of 30)
    [TODAY, P6, [-180, -180, 210, 210]],
    [P6, WIDE, [-390, -390, 450, 450]],
  ] as const) {
    const today = outskirtsTrees(150, 0.6, [], small);
    const wide = outskirtsTrees(150, 0.6, [], big);
    const within = (t: { x: number; z: number }) => t.x >= inner[0] && t.x < inner[2] && t.z >= inner[1] && t.z < inner[3];
    assert.deepEqual(wide.filter(within), today.filter(within));
    // The open land's density holds (the woods aside): trees a unit of open land, about the same both ways
    const open = (ext: readonly number[], n: number) => n / ((ext[1] - ext[0] - 8) ** 2);
    const outside = (ts: typeof today) => ts.filter((t) => !inBox(BELT, t.x, t.z) && !inWoods(t.x, t.z)).length;
    const [a, b] = [open(small, outside(today)), open(big, outside(wide))];
    assert.ok(b > a * 0.9, `${b} against ${a}`);
    assert.ok(wide.length > today.length * 2);
  }
  // Land kept clear stays clear
  const clear: [number, number, number, number] = [-190, 100, -46, 228];
  assert.ok(outskirtsTrees(150, 0.6, [clear], TODAY).every((t) => !(t.x > clear[0] - 2 && t.x < clear[2] + 2 && t.z > clear[1] - 2 && t.z < clear[3] + 2)));
});

/** How far from the town, the kart park and the airport (what the woods keep clear of) */
const fromCity = (x: number, z: number) => Math.min(...WOODS_OFF.map((b) => Math.hypot(Math.max(b[0] - x, 0, x - b[2]), Math.max(b[1] - z, 0, z - b[3]))));

test('woods stand only well away from the city, never on the land the world had before Phase 6', () => {
  const trees = outskirtsTrees(150, 0.6, [], P6);
  const woods = trees.filter((t) => inWoods(t.x, t.z));
  // About the woods' density on their land, a few thousand trees on the medium tier, a share of them pines
  assert.ok(woods.length > 1500 && woods.length < 5000, `${woods.length} trees in the woods`);
  const pines = woods.filter((t) => t.pine).length / woods.length;
  assert.ok(Math.abs(pines - WOODS.pine) < 0.05, `pines ${pines}`);
  for (const t of woods) {
    assert.ok(treeSpot(t.x, t.z));
    assert.ok(!inBox([TODAY[0], TODAY[0], TODAY[1], TODAY[1]], t.x, t.z), `${t.x}, ${t.z} is on the old land`);
    assert.ok(fromCity(t.x, t.z) > WOODS.clear);
  }
  // In patches: some of the land past the clearance, not all of it
  let n = 0;
  let w = 0;
  for (let x = P6[0] + 5; x < P6[1]; x += 10)
    for (let z = P6[0] + 5; z < P6[1]; z += 10)
      if (fromCity(x, z) > WOODS.clear) {
        n++;
        if (inWoods(x, z)) w++;
      }
  assert.ok(w / n > 0.08 && w / n < 0.35, `woods cover ${w / n} of the far land`);
});

test('the camera sees the skyline ring past the edge from town, in front of the sky', () => {
  assert.ok(SKY_RADIUS >= 400 && CAMERA_FAR > SKY_RADIUS);
  // The ring's far side, seen from downtown's middle: the middle of each side and its corners
  const mid = (EXT[0] + EXT[1]) / 2;
  const reach = (EXT[1] - EXT[0]) / 2 + SKYLINE.gap + SKYLINE.depth;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]])
    assert.ok(Math.hypot(mid + dx * reach - 30, mid + dz * reach - 30) <= SKY_RADIUS);
});

test('City view pans round the built-up area, never past the world', () => {
  for (const k of [0, 1, 2, 3] as const) {
    // Inside the world, 10 in from where you can walk
    assert.ok(k < 2 ? PAN_BOUNDS[k] >= WORLD_BOUNDS[k] + 10 - 1e-9 : PAN_BOUNDS[k] <= WORLD_BOUNDS[k] - 10 + 1e-9);
    // and never further than PAN_MARGIN from the built-up area
    assert.ok(Math.abs(PAN_BOUNDS[k] - BUILT_UP[k]) <= PAN_MARGIN + 1e-9);
  }
  // Since Phase 6 the world is bigger than that: the pan stops round the city, short of the edge (but to the north,
  // where the kart park moved past the ring highway, and the east and south, where the airport stands on the edge:
  // there it can reach the edge's margin)
  assert.ok(PAN_BOUNDS[0] > WORLD_BOUNDS[0] + 10);
});
