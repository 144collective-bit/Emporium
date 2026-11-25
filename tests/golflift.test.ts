// The golf course's ground in the city (golflift.ts, golf3d.ts, docs/golf-plan.md Phase 2): the course's own shape
// (golfground.ts) on the grid the city reads, exactly; walked on, driven on and seen round as it's drawn; the rolls and
// the outskirts' trees kept off its play (its native grass keeping its woods); its turf over every tee, green, fairway
// and bunker, a hair over the grass; its lakes' water under their shores.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRIVE, FOOTPATH, GOLF_FAR, GOLF_RECT, GOLF_STEP, LAND, PINE_BELT, copseNear, golfGrid, golfTrees, golfIn, golfLand, golfLift, golfMesh, golfNode, golfShare, golfWater, onGolf, packGolf, unpackGolf } from '../src/scripts/city3d/golflift';
import { golfHeightAt, lakeWater } from '../src/scripts/city3d/golfground';
import { landAt } from '../src/scripts/city3d/golfbake';
import { COURSE, COURSE_RECT, HOLES, LAKES, along, bunkersOf, fairwayEnd, greenOf, inCourse, lakeAt, surfaceAt, type Pt } from '../src/scripts/city3d/golf';
import { heightAt, hillsAlong, onHills } from '../src/scripts/city3d/terrain';
import { rollsAt } from '../src/scripts/city3d/rolls';
import { keptOff } from '../src/scripts/city3d/landuse';
import { WALL_PINES, outskirtsTrees, treeSpot, wallPines } from '../src/scripts/city3d/outskirts';
import { WORLD_BOUNDS } from '../src/scripts/city3d/layout';
import { colourAt } from '../src/scripts/city3d/ground';
import { COVER } from '../src/scripts/city3d/palette';
import { EXT } from '../src/scripts/city3d/layout';

const [X0, Z0, X1, Z1] = GOLF_RECT;
const node = (i: number, j: number): Pt => [X0 + i * GOLF_STEP, Z0 + j * GOLF_STEP];

test("the grid's box: round the course's land, on its step", () => {
  assert.ok(X0 <= COURSE_RECT[0] - GOLF_STEP && Z0 <= COURSE_RECT[1] - GOLF_STEP && X1 >= COURSE_RECT[2] + GOLF_STEP && Z1 >= COURSE_RECT[3] + GOLF_STEP);
  for (const v of GOLF_RECT) assert.equal(Math.abs(v % GOLF_STEP), 0);
  const g = golfGrid();
  assert.equal(g.nx, (X1 - X0) / GOLF_STEP + 1);
  assert.equal(g.nz, (Z1 - Z0) / GOLF_STEP + 1);
});

test("the grid holds the course's own heights and land, and each lake's water", () => {
  const g = golfGrid();
  for (let j = 0; j < g.nz; j += 3)
    for (let i = 0; i < g.nx; i += 3) {
      const p = node(i, j);
      assert.ok(Math.abs(golfNode(i, j) - golfHeightAt(...p)) <= 1 / 128 + 1e-9, `the height at ${p}`);
      assert.ok(Math.abs(golfLift(...p) - golfHeightAt(...p)) <= 1 / 128 + 1e-9, `the lift at ${p}`);
      const s = surfaceAt(...p);
      assert.equal(golfLand(...p), landAt(...p), `the land at ${p}`);
      if (s === null) assert.equal(golfLand(...p), LAND.off);
      else if (s !== 'native' && s !== 'rough') assert.equal(golfLand(...p), LAND.play, `${s} in play at ${p}`);
    }
  LAKES.forEach((l, i) => assert.ok(Math.abs(golfWater(i) - lakeWater(l)) <= 1 / 128, l.name));
  // (off the grid, nothing)
  for (const p of [[0, 0], [280, -500], [600, 0], [800, -400]] as Pt[]) assert.equal(golfLift(...p), 0, `${p}`);
});

test('packed and unpacked: the same heights to a 64th, big steps and all', () => {
  const g = packGolf(
    (x, z) => (x > 500 ? 40 + z / 100 : x < 400 ? -3.5 : 0.25),
    (x) => (x > 600 ? 2 : x > 450 ? 1 : 0),
    [1.234]
  );
  const { heights, land } = unpackGolf(g);
  for (let j = 0; j < g.nz; j += 7)
    for (let i = 0; i < g.nx; i += 5) {
      const [x, z] = node(i, j);
      const want = x > 500 ? 40 + z / 100 : x < 400 ? -3.5 : 0.25;
      assert.ok(Math.abs(heights[j * g.nx + i] - want) <= 1 / 128, `${x}, ${z}`);
      assert.equal(land[j * g.nx + i], x > 600 ? 2 : x > 450 ? 1 : 0);
    }
  assert.equal(g.w[0], Math.round(1.234 * 64) / 64);
  assert.ok(!/["\\]/.test(g.h) && !/["\\]/.test(g.m), 'plain in the page');
});

test('between the points: two flat triangles a square, no step anywhere', () => {
  for (let x = COURSE_RECT[0]; x < COURSE_RECT[2]; x += 7.3)
    for (let z = COURSE_RECT[1]; z < COURSE_RECT[3]; z += 11.1) {
      const [a, b, c] = [golfLift(x, z), golfLift(x + 0.25, z), golfLift(x, z + 0.25)];
      assert.ok(Math.abs(b - a) < 0.3 && Math.abs(c - a) < 0.3, `a step at ${x}, ${z}`);
    }
  // (inside a square, the triangle from its low corner to its high one)
  const [i, j] = [60, 120];
  const [x, z] = node(i, j);
  const [h00, h10, h01, h11] = [golfNode(i, j), golfNode(i + 1, j), golfNode(i, j + 1), golfNode(i + 1, j + 1)];
  const [u, v] = [0.7, 0.2];
  assert.ok(Math.abs(golfLift(x + u * GOLF_STEP, z + v * GOLF_STEP) - (h00 + (h10 - h00) * u + (h11 - h10) * v)) < 1e-5);
  assert.ok(Math.abs(golfLift(x + v * GOLF_STEP, z + u * GOLF_STEP) - (h00 + (h01 - h00) * u + (h11 - h01) * v)) < 1e-5);
});

test('walked, driven and seen round: the ground the city reads is the course\'s', () => {
  for (const h of HOLES) {
    for (const p of [h.line[0], h.line.at(-1)!, along(h, 60).at]) {
      assert.ok(onHills(...p), `hole ${h.n} on the ground that isn't flat`);
      assert.equal(heightAt(...p), golfLift(...p), `hole ${h.n}'s ground`);
    }
  }
  assert.ok(!onGolf(250, -300) && !onGolf(0, 0) && onGolf(...HOLES[4].line[0]));
  // (the walk camera keeps over the Knob: a ray from its west at the Knob's foot stops on it)
  const t = hillsAlong({ x: 600, y: 2, z: -664 }, { x: 1, y: 0, z: 0 }, 200);
  assert.ok(t < 160, `the ray ran on to ${t}`);
});

test('the rolls and the trees keep off the play; the native grass keeps its woods', () => {
  for (let x = COURSE_RECT[0]; x < COURSE_RECT[2]; x += 6) for (let z = COURSE_RECT[1]; z < COURSE_RECT[3]; z += 6) if (inCourse(x, z)) assert.equal(rollsAt(x, z), 0, `rolls on the course at ${x}, ${z}`);
  for (const p of COURSE) assert.equal(rollsAt(...p), 0, `rolls at the club's edge, ${p}`);
  for (const h of HOLES) {
    for (const p of [h.line[0], h.line.at(-1)!]) assert.equal(keptOff(...p), 'golf', `hole ${h.n} kept clear`);
    if (h.fairway) assert.equal(keptOff(...along(h, (h.fairway.from + fairwayEnd(h)) / 2).at), 'golf');
  }
  // (the outskirts' trees keep off the club's land, its drive and its footpath: the course's own woods stand there)
  const outskirts = outskirtsTrees(150, 0.6, [], EXT);
  for (const t of outskirts) assert.equal(golfLand(t.x, t.z), LAND.off, `an outskirts tree on the course at ${t.x.toFixed(1)}, ${t.z.toFixed(1)}`);
  for (const [line, half] of [[DRIVE, 3.7], [FOOTPATH, 2.3]] as const)
    for (const p of line) for (const t of outskirts) assert.ok(Math.hypot(t.x - p[0], t.z - p[1]) > half, `a tree on the drive or the footpath at ${p}`);
});

test("the ground's paint: the course's rough in play, eased in from the open land", () => {
  const rough = parseInt(COVER.courseRough.slice(1), 16);
  const want = [((rough >> 16) & 255) / 255, ((rough >> 8) & 255) / 255, (rough & 255) / 255];
  // (in the middle of a long stretch of play: a fairway's middle, all of it the course's)
  const mid = along(HOLES[5], 100).at;
  assert.ok(golfShare(...mid, 2) > 0.99);
  const c = colourAt(...mid);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(c[i] - want[i]) < 0.06, `the rough's colour: ${c.map((v) => v.toFixed(2))}`);
  assert.equal(golfShare(0, 0, 1), 0);
});

test('the turf: over every tee, green, fairway and bunker, a hair over the grass, nowhere over the water', async () => {
  const { mownNear, turfMesh, shoreOf, TURF_LIFT } = await import('../src/scripts/city3d/golf3d');
  for (const h of HOLES) {
    for (const p of [h.line[0], greenOf(h).at, ...bunkersOf(h).map((b) => b.at)]) assert.ok(mownNear(...p, 0), `hole ${h.n} mown at ${p}`);
    if (h.fairway) assert.ok(mownNear(...along(h, h.fairway.from + 10).at, 0));
  }
  for (const l of LAKES) assert.ok(!mownNear(...l.at, 0) || l.id === 'pond', `mown over ${l.name}`);
  // (on the ground's own triangles: every point the lift over the ground there)
  const r: [number, number, number, number] = [720, -720, 750, -690];
  for (const [far, lift] of [[false, TURF_LIFT], [true, TURF_LIFT]] as const) {
    const m = turfMesh(r, far, lift)!;
    assert.ok(m, "the Knob's green has turf");
    const pos = m.getAttribute('position');
    for (let k = 0; k < pos.count; k++) assert.ok(Math.abs(pos.getY(k) - (golfLift(pos.getX(k), pos.getZ(k)) + lift)) < 1e-5);
  }
  // (the shore: on each lake's edge)
  for (const l of LAKES) for (const p of shoreOf(l, 24)) assert.ok(Math.abs(lakeAt(l, ...p) - 1) < 1e-6, l.name);
  assert.ok(golfIn(700, -700, 730, -670) && !golfIn(0, 0, 30, 30));
});

test('the mesh: near the grid, far a coarser middle, and their edges the same points (no gap between them)', () => {
  const r: [number, number, number, number] = [690, -690, 720, -660];
  const [near, far] = [golfMesh(r, false), golfMesh(r, true)];
  const edge = (m: { xz: number[] }) =>
    new Set(
      Array.from({ length: m.xz.length / 2 }, (_, k): Pt => [m.xz[k * 2], m.xz[k * 2 + 1]])
        .filter(([x, z]) => x === r[0] || x === r[2] || z === r[1] || z === r[3])
        .map((p) => p.join(','))
    );
  assert.deepEqual([...edge(far)].sort(), [...edge(near)].sort(), 'the same points on its edges');
  assert.ok(far.tri.length < near.tri.length / 3, `far is lighter: ${far.tri.length / 3} triangles to ${near.tri.length / 3}`);
  // (each covers the box once: its triangles' areas add up to the box's, every one facing up)
  for (const m of [near, far]) {
    let area = 0;
    for (let t = 0; t < m.tri.length; t += 3) {
      const [a, b, c] = [m.tri[t], m.tri[t + 1], m.tri[t + 2]];
      const [ax, az, bx, bz, cx, cz] = [m.xz[a * 2], m.xz[a * 2 + 1], m.xz[b * 2], m.xz[b * 2 + 1], m.xz[c * 2], m.xz[c * 2 + 1]];
      const up = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
      assert.ok(up >= 0, 'faces up');
      area += up / 2;
    }
    assert.ok(Math.abs(area - (r[2] - r[0]) * (r[3] - r[1])) < 1e-6, `covers the box: ${area}`);
  }
  assert.equal(GOLF_FAR, 3 * GOLF_STEP);
});

test("the course's woods: thick between the holes, a few in the rough, none in play, the same every time", () => {
  const trees = golfTrees();
  assert.ok(trees.length > 800 && trees.length < 3000, `${trees.length} trees`);
  for (const t of trees) {
    assert.ok(inCourse(t.x, t.z), `a tree off the course at ${t.x.toFixed(1)}, ${t.z.toFixed(1)}`);
    assert.notEqual(golfLand(t.x, t.z), LAND.play, `a tree in play at ${t.x.toFixed(1)}, ${t.z.toFixed(1)}`);
    assert.ok(!['fairway', 'green', 'fringe', 'tee', 'bunker', 'water', 'path', 'drive', 'grounds', 'cut'].includes(surfaceAt(t.x, t.z)!), `a tree on ${surfaceAt(t.x, t.z)}`);
  }
  const native = trees.filter((t) => golfLand(t.x, t.z) === LAND.native).length;
  assert.ok(native > trees.length / 2, 'most in the native grass');
  assert.deepEqual(golfTrees(), trees, 'the same every time');
  // (phones keep about half, the same ones)
  const half = golfTrees(0.5);
  assert.ok(half.length > trees.length * 0.4 && half.length < trees.length * 0.6);
  const all = new Set(trees.map((t) => `${t.x},${t.z}`));
  for (const t of half) assert.ok(all.has(`${t.x},${t.z}`));
});

test("the design pass's D2: the woods in copses and glades, a belt of tall pines by the wall, the second cut, wildflowers in the glades", async () => {
  const trees = golfTrees();
  // (copses: the native grass's trees mostly where it's thick, few in its glades)
  const native = trees.filter((t) => golfLand(t.x, t.z) === LAND.native);
  const thick = native.filter((t) => copseNear(t.x, t.z) > 0.6).length;
  const glade = native.filter((t) => copseNear(t.x, t.z) < 0.4).length;
  assert.ok(thick > glade * 3, `${thick} in the copses, ${glade} in the glades`);
  // (the belt: tall pines near the north and east edges, deeper than the woods elsewhere)
  const north = trees.filter((t) => t.z < Z0 + PINE_BELT.reach && t.pine && t.s >= 2.6);
  const east = trees.filter((t) => t.x > X1 - PINE_BELT.reach && t.pine && t.s >= 2.6);
  assert.ok(north.length > 60 && east.length > 150, `${north.length} pines north, ${east.length} east`);
  const tall = trees.filter((t) => t.z > Z0 + PINE_BELT.reach + 10 && t.x < X1 - PINE_BELT.reach - 10 && t.s > 3);
  assert.ok(tall.length < north.length / 4, 'the tall pines kept to the belt');
  // (the second cut: the turf laid out past the first cut round a fairway, the paint there its colour)
  const { mownNear, flowersIn, FLOWERS } = await import('../src/scripts/city3d/golf3d');
  const { SECOND_CUT, FIRST_CUT, fairwayHalf, framePt } = await import('../src/scripts/city3d/golf');
  for (const h of HOLES.filter((q) => q.fairway)) {
    const s = h.fairway!.from + 20;
    const p = framePt(h, s, fairwayHalf(h, s) + FIRST_CUT + SECOND_CUT - 0.5);
    if (surfaceAt(...p) === 'rough') assert.ok(mownNear(...p, 0), `hole ${h.n}'s second cut not laid at ${p}`);
  }
  // (the wildflowers: on the native grass in its glades, never in play or under the copses, the same every time;
  // phones a half of the same ones)
  const flowers = flowersIn(GOLF_RECT);
  assert.ok(flowers.length > 800 && flowers.length < 5000, `${flowers.length} flowers`);
  for (const f of flowers.filter((_, k) => k % 7 === 0)) {
    const g: Pt = [X0 + Math.round((f.x - X0) / GOLF_STEP) * GOLF_STEP, Z0 + Math.round((f.z - Z0) / GOLF_STEP) * GOLF_STEP];
    assert.equal(golfLand(...g), LAND.native, `a flower off the native grass at ${f.x.toFixed(1)}, ${f.z.toFixed(1)}`);
    assert.ok(copseNear(...g) < FLOWERS.glade);
    assert.ok(inCourse(f.x, f.z));
  }
  assert.deepEqual(flowersIn(GOLF_RECT), flowers);
  const few = flowersIn(GOLF_RECT, 0.5);
  assert.ok(few.length > flowers.length * 0.4 && few.length < flowers.length * 0.6);
  const all = new Set(flowers.map((f) => `${f.x},${f.z}`));
  for (const f of few) assert.ok(all.has(`${f.x},${f.z}`));
  // (a box's flowers split between two halves of it, none lost or doubled: a site a tile)
  const r: [number, number, number, number] = [X0 + 100, Z0 + 100, X0 + 196, Z0 + 196];
  const [L, R] = [flowersIn([r[0], r[1], X0 + 148, r[3]]), flowersIn([X0 + 148, r[1], r[2], r[3]])];
  assert.deepEqual([...L, ...R].map((f) => `${f.x},${f.z}`).sort(), flowersIn(r).map((f) => `${f.x},${f.z}`).sort());
});

test("D2's pines past the fence: off the course and clear of its fence, inside the wall, along the north and east only, the same every time", () => {
  const pines = wallPines();
  assert.ok(pines.length > 400, `${pines.length} pines`);
  for (const t of pines) {
    assert.equal(golfLand(t.x, t.z), LAND.off, `a pine on the course at ${t.x.toFixed(1)}, ${t.z.toFixed(1)}`);
    assert.ok(!inCourse(t.x, t.z));
    for (let a = 0; a < 8; a++) assert.equal(golfLand(t.x + Math.cos((a * Math.PI) / 4) * (WALL_PINES.gap - 0.5), t.z + Math.sin((a * Math.PI) / 4) * (WALL_PINES.gap - 0.5)), LAND.off, 'a pine by the fence');
    assert.ok(t.x < WORLD_BOUNDS[2] - WALL_PINES.wall + 1 && t.z > WORLD_BOUNDS[1] + WALL_PINES.wall - 1, 'a pine in the wall');
    // (north of the course or east of it, never west or south)
    assert.ok(t.z < Z0 + 20 || t.x > X1 - 20, `a pine away from the wall's sides at ${t.x.toFixed(1)}, ${t.z.toFixed(1)}`);
    assert.ok(t.pine && t.s >= 2.6);
    assert.ok(treeSpot(t.x, t.z));
  }
  assert.ok(pines.some((t) => t.z < Z0) && pines.some((t) => t.x > X1), 'both sides planted');
  assert.deepEqual(wallPines(), pines);
  const few = wallPines(0.5);
  assert.ok(few.length > pines.length * 0.4 && few.length < pines.length * 0.6);
  const all = new Set(pines.map((t) => `${t.x},${t.z}`));
  for (const t of few) assert.ok(all.has(`${t.x},${t.z}`));
});

test("Phase 3's drawing: the drive on the ground, its lamps beside it, the fence round the edge open at the ways in, reeds out of play", async () => {
  const { driveMesh, DRIVE_LAMPS, DRIVE_LIFT, FENCE_GAPS, FENCE_RUNS, FENCE, reedsOf, mownNear } = await import('../src/scripts/city3d/golf3d');
  const { insetOf, PATHS, fromDrive } = await import('../src/scripts/city3d/golf');
  // (the asphalt a hair over the ground all along)
  const g = driveMesh(DRIVE);
  const pos = g.getAttribute('position');
  for (let k = 0; k < pos.count; k++) assert.ok(Math.abs(pos.getY(k) - (golfLift(pos.getX(k), pos.getZ(k)) + DRIVE_LIFT)) < 1e-5);
  // (the lamps beside it, off it, off the play)
  assert.ok(DRIVE_LAMPS.length >= 3, `${DRIVE_LAMPS.length} lamps`);
  for (const l of DRIVE_LAMPS) {
    const d = fromDrive(...l.at);
    assert.ok(d > 1.7 && d < 3.5, `a lamp ${d.toFixed(2)} from the drive`);
    assert.ok(!['fairway', 'green', 'tee', 'bunker', 'water', 'path'].includes(surfaceAt(...l.at) ?? ''), 'a lamp in play');
  }
  // (the fence on the club's edge, open where the drive and the footpath come in, and only there)
  assert.deepEqual(FENCE_GAPS.map((x) => x.kind).sort(), ['drive', 'path']);
  for (const run of FENCE_RUNS) for (const p of run) assert.ok(Math.abs(insetOf(...p)) < 0.6, `a post off the edge at ${p}`);
  for (const gap of FENCE_GAPS) for (const run of FENCE_RUNS) for (const p of run) assert.ok(Math.hypot(p[0] - gap.at[0], p[1] - gap.at[1]) >= gap.half - FENCE.gap / 2, `a post across the ${gap.kind}`);
  assert.ok(FENCE_RUNS.length <= 3, 'one fence, broken only at the ways in');
  // (the reeds on the lakes' banks, not on a tee, green, fairway or path)
  for (const l of LAKES) for (const p of reedsOf(l)) assert.ok(['rough', 'native', 'water'].includes(surfaceAt(...p) ?? ''), `reeds on ${surfaceAt(...p)}`);
  // (the turf over every path)
  for (const p of PATHS) for (const q of p.pts) if (insetOf(...q) > 0) assert.ok(mownNear(...q, 0), `${p.id} not mown at ${q}`);
});

test("the design pass's D3: the reeds in clumps in the shallows, gaps of open bank between; lily pads on the water off them", async () => {
  const { reedsOf, reedClumps, liliesOf, LILIES, shoreOf } = await import('../src/scripts/city3d/golf3d');
  for (const l of LAKES) {
    const reeds = reedsOf(l);
    const clumps = reedClumps(l);
    assert.ok(clumps.length >= 2 && clumps.length <= 4, `${l.name}: ${clumps.length} clumps`);
    // (clumps, not a ring: well under half the shore has reeds by it)
    const shore = shoreOf(l, 72);
    const by = shore.filter(([x, z]) => reeds.some(([rx, rz]) => Math.hypot(rx - x, rz - z) < 2)).length;
    assert.ok(by < shore.length * 0.6, `${l.name}: reeds by ${by} of ${shore.length} shore points`);
    // (in the shallows: just inside the shore)
    for (const [x, z] of reeds) assert.ok(lakeAt(l, x, z) > 0.85 && lakeAt(l, x, z) <= 1.001, `${l.name}: a reed out of the shallows`);
    // (the pads on the water, clear of the shore; the same each time; a few in flower)
    const pads = liliesOf(l);
    assert.ok(pads.length >= LILIES.min, `${l.name}: ${pads.length} pads`);
    for (const p of pads) assert.ok(lakeAt(l, p.x, p.z) <= LILIES.inside + 1e-9);
    assert.deepEqual(liliesOf(l), pads);
  }
  const all = LAKES.flatMap((l) => liliesOf(l));
  const flowers = all.filter((p) => p.flower).length;
  assert.ok(flowers > 0 && flowers < all.length / 2, `${flowers} of ${all.length} pads in flower`);
});

test('Knob Hill Golf Club (Phase 4): the clubhouse on its grounds, under the Emporium, its door clear, Walk in by it, the place moved here', async () => {
  const { GOLF_CLUBHOUSE: C, GOLF_CLUBHOUSE_H, clubLevel, golfSolids, CLUB_NAME } = await import('../src/scripts/city3d/golflift');
  const { CLUB_GROUNDS, fromPaths, fromDrive } = await import('../src/scripts/city3d/golf');
  const { SOLIDS } = await import('../src/scripts/city3d/solids');
  const { PLACES } = await import('../src/scripts/city3d/places');
  const within = (r: readonly number[], o: readonly number[]) => r[0] >= o[0] && r[1] >= o[1] && r[2] <= o[2] && r[3] <= o[3];
  assert.deepEqual(C.grounds, CLUB_GROUNDS);
  for (const r of [C.house, C.porch, C.terrace, C.carpark, C.shed, C.nets]) assert.ok(within(r, C.grounds), `${r} off the grounds`);
  // (the grounds level all over, the clubhouse under the Emporium's 12.5 over its ground)
  const y = clubLevel();
  for (let x = C.grounds[0]; x <= C.grounds[2]; x += 4) for (let z = C.grounds[1]; z <= C.grounds[3]; z += 4) assert.ok(Math.abs(golfLift(x, z) - y) < 0.02, `the grounds not level at ${x}, ${z}`);
  assert.ok(GOLF_CLUBHOUSE_H < 12.5 && y > 1);
  // (its solids in the city's, over the grounds' level; none on a hole, a path or the drive's way in)
  for (const s of golfSolids()) {
    assert.ok(SOLIDS.some((t) => t.every((v, i) => Math.abs(v - s[i]) < 1e-9)), "in the city's solids");
    assert.ok(s[4] > y, 'its top over the grounds');
  }
  // (the door in the porch, in no solid; Walk in in the car park, facing it, a few steps off)
  const d = C.door;
  assert.ok(d.x > C.porch[0] && d.x < C.porch[2] && d.z > C.porch[1] && d.z < C.porch[3], 'the door in the porch');
  for (const s of SOLIDS) assert.ok(!(d.x > s[0] && d.x < s[2] && d.z > s[1] && d.z < s[3]), `the door in a solid ${s.join()}`);
  const at = C.spawn;
  assert.ok(at.x > C.carpark[0] && at.x < C.carpark[2] && at.z > C.carpark[1] && at.z < C.carpark[3], 'Walk in in the car park');
  for (const s of SOLIDS) assert.ok(!(at.x > s[0] && at.x < s[2] && at.z > s[1] && at.z < s[3]), 'Walk in in a solid');
  assert.ok(Math.hypot(at.x - d.x, at.z - d.z) < 14);
  const [fx, fz] = [-Math.sin(at.yaw), -Math.cos(at.yaw)];
  assert.ok(fx * (d.x - at.x) + fz * (d.z - at.z) > 0, 'facing the door');
  // (clear of the holes, the paths and the drive but where they come in)
  for (const h of HOLES) for (const r of [C.house, C.shed, C.nets]) assert.ok(nearestOnRect(h, r) > 12, `hole ${h.n} by the clubhouse`);
  assert.ok(fromPaths((C.house[0] + C.house[2]) / 2, (C.house[1] + C.house[3]) / 2) > 5 && fromDrive(...([(C.house[0] + C.house[2]) / 2, C.house[3]] as [number, number])) > 5);
  // (the place: here now, the old club's gone from Crestmont)
  const place = PLACES.find((p) => p.id === 'golfclub')!;
  assert.ok(place && place.at && Math.hypot(place.at.x - at.x, place.at.z - at.z) < 1e-9, 'the place moved here');
  assert.ok(/^[A-Z ]+$/.test(CLUB_NAME) && !/\d/.test(CLUB_NAME), 'a made-up name, no number');
});

function nearestOnRect(h: (typeof HOLES)[number], r: readonly number[]) {
  let m = Infinity;
  for (let x = r[0]; x <= r[2]; x += 1) for (let z = r[1]; z <= r[3]; z += 1) m = Math.min(m, nearestTo(h, x, z));
  return m;
}
function nearestTo(h: (typeof HOLES)[number], x: number, z: number) {
  let m = Infinity;
  for (let i = 1; i < h.line.length; i++) {
    const [a, b] = [h.line[i - 1], h.line[i]];
    const [vx, vz] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz || 1)));
    m = Math.min(m, Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t));
  }
  return m;
}

test('Clubhouse Drive a street: off the country road up to the car park, a one-way loop to turn round, a taxi up it', async () => {
  const { PLAN, distToStreet } = await import('../src/scripts/city3d/streetplan');
  const { pathBetween } = await import('../src/scripts/city3d/routes');
  const { GOLF_CLUBHOUSE, DRIVE_HALF } = await import('../src/scripts/city3d/golflift');
  const drive = PLAN.streets.find((s) => s.id === 'golf-drive')!;
  const turn = PLAN.streets.find((s) => s.id === 'golf-drive-turn')!;
  assert.ok(drive && turn, 'the drive and its loop are streets of the plan');
  assert.equal(drive.half, DRIVE_HALF);
  assert.ok(turn.loop && turn.oneway, 'the loop is one way round');
  // It starts on the country road's edge, where the gate's crossing is, and ends at the loop
  const road = PLAN.streets.find((s) => s.id === 'ew0-e')!;
  assert.ok(distToStreet(road, drive.pts[0]) <= road.half + 0.01, `the drive starts on ew0-e (${drive.pts[0]})`);
  const gate = PLAN.crossings.find((c) => c.id === 'golf-drive-gate')!;
  assert.deepEqual(gate.streets.slice().sort(), ['ew0-e', 'golf-drive']);
  assert.ok(!gate.lights);
  // The loop by the car park
  const [x0, z0, x1, z1] = GOLF_CLUBHOUSE.carpark;
  for (const p of turn.pts) assert.ok(p[0] > x0 - 12 && p[0] < x1 + 12 && p[1] > z0 - 4 && p[1] < z1 + 14, `the loop strays at ${p}`);
  // A taxi from the city drives up it to the car park
  const up = pathBetween([0, 0], [GOLF_CLUBHOUSE.spawn.x, GOLF_CLUBHOUSE.spawn.z])!;
  const end = up.pts[up.pts.length - 1];
  assert.ok(Math.hypot(end[0] - GOLF_CLUBHOUSE.spawn.x, end[1] - GOLF_CLUBHOUSE.spawn.z) < 16, `the taxi stops ${end} short of the club`);
  assert.ok(distToStreet(drive, end) < 4 || distToStreet(turn, end) < 4, 'it stops on the club\'s own street');
});
