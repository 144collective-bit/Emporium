// The edge as data (growth plan Phases 5 and 6): the outskirts' trees are seeded tile by tile at a density per area, so
// a bigger world has more trees, never thinner ones, and the same trees where the world already was; woods stand on
// the land well away from the city; the camera's pan comes from the city, not the edge, and it
// sees as far as the skyline past the edge. Runs at today's size and at Phase 10's (npm run test:wide).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BELT, BELT_EASE, BELT_FREE, OPEN_FREE, WOODS, WOODS_OFF, beltShare, freeLand, inWoods, outskirtsTrees, treeSpot } from '../src/scripts/city3d/outskirts';
import { TOWN_BOX } from '../src/scripts/city3d/landuse';
import { BUILT_UP, CAMERA_FAR, PAN_BOUNDS, PAN_MARGIN, SKYLINE, SKY_RADIUS } from '../src/scripts/city3d/bounds';
import { EW_ROADS, EXT, NS_ROADS, STRIP_GAP, WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { MALL_AREA } from '../src/scripts/city3d/mall';
import { HIGHWAY_BOX } from '../src/scripts/city3d/highway';
import { SUNRIDGE_RECT, inSunridge } from '../src/scripts/city3d/sunridge';

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
/** The land Sunridge took that a tree could stand on before (docs/suburb-plan.md Phase 1: open land; as freeLand counts), the kart park's old land in it left out unless `kart` */
function sunWas(r: readonly number[], skip?: readonly number[], kart = false) {
  const o = overlap(r, SUNRIDGE_RECT);
  let n = 0;
  for (let x = o[0] + 1; x < o[2]; x += 2)
    for (let z = o[1] + 1; z < o[3]; z += 2) {
      if ((skip && inBox(skip, x, z)) || (!kart && inBox(OLD_KART, x, z)) || !inSunridge(x, z, 2)) continue;
      if (Math.abs(z - -4.5) < 3.7 + 0.8) continue;
      n++;
    }
  return n * 4;
}
/**
 * The Neon Mile's land counts as it was (its keep is `since`, landuse.ts), but for downtown's two small east-west
 * roads, which ran across it then and stop either side of it now (layout.ts STRIP_GAP): the land under them, as
 * freeLand counts it today, to take back off
 */
function stripRoads(r: readonly number[], skip?: readonly number[]) {
  let n = 0;
  for (const [k, [x0, x1]] of Object.entries(STRIP_GAP)) {
    const q = EW_ROADS[+k];
    const o = overlap(r, [x0, q.c - q.half - 0.8, x1, q.c + q.half + 0.8]);
    for (let x = r[0] + 1; x < r[2]; x += 2)
      for (let z = r[1] + 1; z < r[3]; z += 2) if (inBox(o, x, z) && !(skip && inBox(skip, x, z)) && treeSpot(x, z, [], false)) n++;
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
  // (and Sunridge's, docs/suburb-plan.md: open land but the kart park's old site)
  // (and the roads that ran across the Neon Mile's land taken back off: docs/strip-plan.md)
  const belt = freeLand(BELT, 2) - away(BELT) + mallWas(BELT) + sunWas(BELT) - stripRoads(BELT);
  const open = freeLand(outer, 2, BELT) - away(outer, BELT) + mallWas(outer, BELT) + sunWas(outer, BELT) - stripRoads(outer, BELT);
  assert.ok(Math.abs(belt - BELT_FREE) / BELT_FREE < 0.03, `belt ${belt} against ${BELT_FREE}`);
  assert.ok(Math.abs(open - OPEN_FREE) / OPEN_FREE < 0.03, `open land ${open} against ${OPEN_FREE}`);
});

test('as many trees as the densities give the land free today, each where a tree may stand, the belt easing out', () => {
  // (the world before Phase 6 is mostly districts now: its trees are counted against the land a tree may stand on
  // today, at the belt's density by the town easing to the open land's, docs/blend-plan.md Phase 1)
  const land: [number, number, number, number] = [TODAY[0] + 4, TODAY[0] + 4, TODAY[1] - 4, TODAY[1] - 4];
  // (5,000 for the count: enough trees that the random tries' noise is a few per cent on the little free land left
  // there now (2,500 was, until Southfield took the south band: docs/blend-plan.md Phase 5a); the tiers' 250, 150 and
  // 90 for where they stand)
  for (const count of [5000, 250, 150, 90]) {
    const trees = outskirtsTrees(count, 0.6, [], TODAY);
    const [belt, open] = [count / BELT_FREE, (count * 0.6) / OPEN_FREE];
    let want = 0;
    for (let x = land[0] + 1; x < land[2]; x += 2)
      for (let z = land[1] + 1; z < land[3]; z += 2) if (treeSpot(x, z)) want += 4 * (open + (belt - open) * beltShare(x, z));
    if (count === 5000) assert.ok(Math.abs(trees.length - want) / want < 0.08, `${trees.length} for ${count}, the land gives ${want.toFixed(0)}`);
    for (const t of trees) {
      assert.ok(treeSpot(t.x, t.z));
      assert.ok(t.x > land[0] && t.x < land[2] && t.z > land[1] && t.z < land[3]);
    }
  }
  // The belt's share eases from 1 by the town to 0, never a step
  let last = 1;
  for (let d = 0; d < BELT_EASE.fade + 10; d += 0.5) {
    const k = beltShare(TOWN_BOX[2] + d, (TOWN_BOX[1] + TOWN_BOX[3]) / 2);
    assert.ok(k <= last + 1e-9 && last - k < 0.05, `the belt's share at ${d} past the town`);
    last = k;
  }
  assert.equal(last, 0);
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
  // About the woods' density on their land, a few thousand trees on the medium tier, a share of them pines (fewer
  // since Crestmont's hills took the north-east corner's: they carry their own oaks and scrub, landscape.ts)
  assert.ok(woods.length > 1000 && woods.length < 5000, `${woods.length} trees in the woods`);
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
