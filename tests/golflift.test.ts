// The golf course's ground in the city (golflift.ts, golf3d.ts, docs/golf-plan.md Phase 2): the course's own shape
// (golfground.ts) on the grid the city reads, exactly; walked on, driven on and seen round as it's drawn; the rolls and
// the outskirts' trees kept off its play (its native grass keeping its woods); its turf over every tee, green, fairway
// and bunker, a hair over the grass; its lakes' water under their shores.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRIVE, FOOTPATH, GOLF_FAR, GOLF_RECT, GOLF_STEP, LAND, golfGrid, golfTrees, golfIn, golfLand, golfLift, golfMesh, golfNode, golfShare, golfWater, onGolf, packGolf, unpackGolf } from '../src/scripts/city3d/golflift';
import { golfHeightAt, lakeWater } from '../src/scripts/city3d/golfground';
import { landAt } from '../src/scripts/city3d/golfbake';
import { COURSE, COURSE_RECT, HOLES, LAKES, along, bunkersOf, fairwayEnd, greenOf, inCourse, lakeAt, surfaceAt, type Pt } from '../src/scripts/city3d/golf';
import { heightAt, hillsAlong, onHills } from '../src/scripts/city3d/terrain';
import { rollsAt } from '../src/scripts/city3d/rolls';
import { keptOff } from '../src/scripts/city3d/landuse';
import { outskirtsTrees } from '../src/scripts/city3d/outskirts';
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
