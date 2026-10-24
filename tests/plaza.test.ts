// Uptown's plaza (plaza.ts, docs/finance-plan.md Phase 3): the cross in its pool where the Mall's axis meets the line
// between the lobbies (the owner's pick), the water wall either side of the way in, the canopies over the lunch tables,
// the trees, benches, lamps and planters, the café terraces by the lanes, the LED ribbon's words, the people at lunch,
// and what's solid; the ways through it open.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BENCHES,
  CENTRE,
  CHAIR,
  CROSS,
  GAP,
  KIOSKS,
  LAMPS,
  PLANTERS,
  PLAZA_PEOPLE,
  PLAZA_SOLIDS,
  POOL,
  TABLES,
  TERRACES,
  TERRACE_LAMPS,
  TERRACE_TABLES,
  TERRACE_TREES,
  TREES,
  WALL_RUNS,
  WATER_WALL,
} from '../src/scripts/city3d/plaza';
import { CANOPIES, KIOSK_NAMES, POSTS, RIBBON_TOWER, RIBBON_WORDS } from '../src/scripts/city3d/plazadress';
import { AXIS_X, CIRCLE, COUPLET, LANE_HALF, PLAZA_BLOCK, UPTOWN_BLOCKS, UPTOWN_LANES, UPTOWN_STREETS } from '../src/scripts/city3d/uptown';
import { HIGHRISES, SPIRE_LOT } from '../src/scripts/city3d/highrise';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLAN } from '../src/scripts/city3d/streetplan';
import { WALK_W } from '../src/scripts/city3d/layout';

type Pt = [number, number];
type Rect = [number, number, number, number];
const block = UPTOWN_BLOCKS.find((b) => b.id === PLAZA_BLOCK)!.rect;
const inRect = (r: readonly number[], p: Pt, m = 0) => p[0] > r[0] + m && p[0] < r[2] - m && p[1] > r[1] + m && p[1] < r[3] - m;
const within = (a: Rect, b: readonly number[]) => a[0] >= b[0] - 1e-6 && a[1] >= b[1] - 1e-6 && a[2] <= b[2] + 1e-6 && a[3] <= b[3] + 1e-6;
const overlap = (a: readonly number[], b: readonly number[]) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
const solidAt = (p: Pt, m = 0) => SOLIDS.some((s) => inRect(s, p, -m));
const spire = HIGHRISES.find((t) => t.design === 'spire')!;
const [CX, CZ] = CENTRE;
const FORECOURT: Rect = [block[0], block[1], SPIRE_LOT[0], block[3]];
const ring = POOL.r + POOL.w;

test('the cross: in its pool where the axis meets the line from the circle to the spire\'s lobby, the tallest thing in the plaza, under the spire and the Emporium', () => {
  assert.equal(CX, AXIS_X, 'on the Mall\'s axis');
  assert.ok(Math.abs(CZ - spire.door[1]) < 1e-6, 'in line with the spire\'s lobby');
  assert.equal(spire.front, 'w', 'the spire\'s lobby faces the plaza');
  // Circle Street runs from the circle straight at the way in (uptown.ts, Phase 5)
  assert.equal(CIRCLE.z, CZ, 'down Circle Street from the circle');
  const circleSt = UPTOWN_STREETS.find((s) => s.id === 'uptown-circle-e')!;
  assert.ok(circleSt.pts.every((p) => p[1] === CZ) && circleSt.pts.at(-1)![0] === COUPLET.north, 'to the plaza\'s street');
  // The ribbon's tower across the one-way pair's east street, its lobby facing the plaza
  const across = HIGHRISES.find((t) => t.id === RIBBON_TOWER.id)!;
  assert.equal(across.front, 'w');
  assert.ok(across.lot[0] > COUPLET.south && across.lot[1] < CZ + 10 && across.lot[3] > CZ - 10, 'across the street from the plaza');
  assert.ok(inRect(FORECOURT, CENTRE, ring + 1), 'the pool on the forecourt with room round it');
  // The plinth steps up inside the pool, each narrower; the arms across the axis, under the shaft's top
  let side = Infinity;
  let top = POOL.water;
  for (const [s, t] of CROSS.steps) {
    assert.ok(s < side && t > top);
    [side, top] = [s, t];
  }
  assert.ok((CROSS.steps[0][0] / 2) * Math.SQRT2 < POOL.r - 0.3, 'the plinth in the water');
  assert.ok(CROSS.arm + CROSS.w / 2 < CROSS.top - 1 && CROSS.arm > CROSS.top * 0.6, 'the arms high on the shaft');
  assert.ok(CROSS.span / 2 < POOL.r, 'the arms over the pool');
  assert.ok(CROSS.top < spire.roof && CROSS.top < EMPORIUM_ROOF);
  assert.ok(PLAZA_SOLIDS.every((s) => s[4] <= CROSS.top), 'nothing in the plaza taller');
});

test('everything on the plaza\'s block or its terraces, off the streets and the spire', () => {
  const lots = [block, ...TERRACES];
  const rects: Rect[] = [
    [CX - ring, CZ - ring, CX + ring, CZ + ring],
    ...WALL_RUNS.map(([a, b]): Rect => [WATER_WALL.x, a, WATER_WALL.trough, b]),
    ...CANOPIES,
    ...PLANTERS,
    ...KIOSKS.map((k) => k.rect),
    ...[...TREES, ...TERRACE_TREES].map(([x, z]): Rect => [x - 0.65, z - 0.65, x + 0.65, z + 0.65]),
    ...[...TABLES, ...TERRACE_TABLES].map(([x, z]): Rect => [x - 0.4, z - CHAIR - 0.25, x + 0.4, z + CHAIR + 0.25]),
    ...BENCHES.map(({ at: [x, z] }): Rect => [x - 0.8, z - 0.8, x + 0.8, z + 0.8]),
  ];
  for (const r of rects) {
    assert.ok(lots.some((l) => within(r, l)), `${r} off the plaza`);
    assert.ok(!overlap(r, spire.lot) || PLANTERS.includes(r), `${r} on the spire`);
    for (const s of PLAN.streets)
      if (s.kind !== 'alley') for (const p of [[r[0], r[1]], [r[2], r[3]]] as Pt[]) assert.ok(Math.abs(p[0] - s.pts[0][0]) > s.half + WALK_W || s.pts[0][0] !== s.pts.at(-1)![0], `${r} on ${s.id}`);
  }
  for (const r of PLANTERS) assert.ok(!overlap(r, spire.lot), 'planters beside the spire, not on it');
  // The terraces: the slivers west of the lanes, each its kiosk and four tables
  assert.equal(TERRACES.length, UPTOWN_LANES.length);
  TERRACES.forEach((t, i) => {
    assert.ok(Math.abs(t[2] - UPTOWN_LANES[i][0]) < 1e-6, 'up to its lane');
    assert.ok(within(KIOSKS[i].rect, t));
    assert.equal(TERRACE_TABLES.filter((p) => inRect(t, p)).length, 4);
  });
  assert.equal(KIOSK_NAMES.length, KIOSKS.length);
});

test('the ways through are open: the axis round the pool, in from the street through the water wall, to the spire\'s lobby', () => {
  const clear = (p: Pt, what: string) => assert.ok(!solidAt(p, 0.35), `${what} blocked at ${p.map((v) => v.toFixed(1))}`);
  // Down the axis from cross street to cross street, round the pool on either side
  for (let z = block[1] + 0.4; z < block[3] - 0.4; z += 0.25) {
    if (Math.abs(z - CZ) > ring + 0.5) clear([AXIS_X, z], 'the axis');
    for (const s of [-1, 1]) if (Math.abs(z - CZ) < ring + 0.5) clear([AXIS_X + s * (ring + 0.6), z], 'round the pool');
  }
  // From the street through the way in to the pool, and on from the pool to the spire's door
  for (let x = block[0] + 0.2; x < CX - ring - 0.5; x += 0.25) clear([x, CZ], 'the way in');
  for (let x = CX + ring + 0.5; x < spire.door[0]; x += 0.25) clear([x, CZ], 'to the spire');
  // The way in: the water wall either side of it, as wide as the lobby's door
  assert.deepEqual(WALL_RUNS.map((r) => r[1] < CZ), [true, false]);
  assert.ok(Math.abs(WALL_RUNS[0][1] - (CZ - GAP)) < 1e-6 && Math.abs(WALL_RUNS[1][0] - (CZ + GAP)) < 1e-6);
  // The canopies' posts off the axis and the tables, and the tables off the axis
  for (const x of POSTS) {
    assert.ok(Math.abs(x - AXIS_X) > LANE_HALF, 'a post on the axis');
    for (const [tx] of TABLES) assert.ok(Math.abs(x - tx) > 0.9, 'a post in a table');
  }
  for (const [x] of TABLES) assert.ok(Math.abs(x - AXIS_X) > LANE_HALF + 0.4, 'a table on the axis');
  // Each terrace's queue and tables off the lane
  for (const [x] of TERRACE_TABLES) assert.ok(x < UPTOWN_LANES[0][0] - 0.4);
});

test('the lunch tables under the canopies, the trees, benches and lamps clear of each other and of anything solid', () => {
  for (const t of TABLES) assert.ok(CANOPIES.some((c) => inRect(c, t, 0.4)), 'a table out from under its canopy');
  const spots: [string, Pt][] = [...[...TREES, ...TERRACE_TREES].map((p): [string, Pt] => ['tree', p]), ...[...LAMPS, ...TERRACE_LAMPS].map(([x, z]): [string, Pt] => ['lamp', [x, z]]), ...BENCHES.map((b): [string, Pt] => ['bench', b.at])];
  for (const [what, p] of spots) {
    assert.ok(!solidAt(p, 0.2), `a ${what} in something solid at ${p}`);
    assert.ok(Math.hypot(p[0] - CX, p[1] - CZ) > ring + 0.6, `a ${what} on the pool`);
    for (const [, q] of spots) if (q !== p) assert.ok(Math.hypot(p[0] - q[0], p[1] - q[1]) > 1.2, `${what} at ${p} on top of another at ${q}`);
    for (const t of [...TABLES, ...TERRACE_TABLES]) assert.ok(Math.hypot(p[0] - t[0], p[1] - t[1]) > 1.1, `a ${what} on a table at ${t}`);
  }
  // Benches face the pool
  for (const b of BENCHES) {
    const [fx, fz] = [Math.sin(b.ry), Math.cos(b.ry)];
    assert.ok(fx * (CX - b.at[0]) + fz * (CZ - b.at[1]) > 0.99 * Math.hypot(CX - b.at[0], CZ - b.at[1]));
  }
});

test('people at lunch: plenty, none in anything solid, those sitting on a chair or a bench', () => {
  assert.ok(PLAZA_PEOPLE.length >= 30, `${PLAZA_PEOPLE.length} people`);
  for (const p of PLAZA_PEOPLE) {
    assert.ok(!solidAt([p.x, p.z], 0.15), `someone in something solid at ${p.x}, ${p.z}`);
    if (p.act !== 'sit') continue;
    const chair = [...TABLES, ...TERRACE_TABLES].some(([x, z]) => Math.abs(p.x - x) < 1e-6 && Math.abs(Math.abs(p.z - z) - CHAIR) < 1e-6);
    const bench = BENCHES.some((b) => Math.hypot(p.x - b.at[0], p.z - b.at[1]) < 0.5);
    assert.ok(chair || bench, `sitting on nothing at ${p.x}, ${p.z}`);
  }
  for (let i = 0; i < PLAZA_PEOPLE.length; i++)
    for (let j = i + 1; j < PLAZA_PEOPLE.length; j++) {
      const [a, b] = [PLAZA_PEOPLE[i], PLAZA_PEOPLE[j]];
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 0.5, `two people at ${a.x}, ${a.z}`);
    }
});

test('what\'s solid: in SOLIDS, the pool closed round, the water wall and the kiosks', () => {
  for (const b of PLAZA_SOLIDS) assert.ok(SOLIDS.some((s) => s.every((v, i) => v === b[i])), 'in SOLIDS');
  for (let a = 0; a < Math.PI * 2; a += 0.1) assert.ok(solidAt([CX + Math.sin(a) * (POOL.r - 0.2), CZ + Math.cos(a) * (POOL.r - 0.2)]), 'into the pool');
  for (const [a, b] of WALL_RUNS) assert.ok(solidAt([WATER_WALL.x + 0.5, (a + b) / 2]) && solidAt([WATER_WALL.trough - 0.3, (a + b) / 2]));
  for (const k of KIOSKS) assert.ok(solidAt([(k.rect[0] + k.rect[2]) / 2, (k.rect[1] + k.rect[3]) / 2]));
  // Nothing of it wider than a few tiles (the collision grid's reach)
  for (const s of PLAZA_SOLIDS) assert.ok(Math.min(s[2] - s[0], s[3] - s[1]) <= 8, `${s}`);
  // Never across the spire's footprint (its own solids are highrise.ts's)
  for (const s of PLAZA_SOLIDS) assert.ok(!overlap(s, SPIRE_LOT));
});

test('the LED ribbon: round the podium across the street, fixed made-up words, never a number', () => {
  assert.notEqual(RIBBON_TOWER.design, 'spire');
  assert.equal(RIBBON_TOWER.parts[0].skin, 'podium');
  assert.ok(RIBBON_WORDS.length >= 4);
  for (const w of RIBBON_WORDS) assert.match(w, /^[A-Z ]+$/, `${w}: letters only`);
});
