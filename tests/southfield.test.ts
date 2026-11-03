// Southfield (southfield.ts, docs/blend-plan.md Phase 5a): the land south of the south row filled by its neighbours,
// scenery only. Its streets join the plan without moving a metro pillar, everything stands on its blocks, inside the
// highway, off the roads and the metro, clear of what was there, and under the Emporium.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BAYS, DEPOT_GATE, DEPOT_SHED, EAST_GARDEN, EAST_TUNNEL, FUTURE_SITES, GARDEN_LOT, GARDEN_TUNNEL, HUTS, LOCKUPS, MERCHANT, PARK_BENCHES, PARK_LAMPS, PARK_LOT, PARK_PATHS, PARK_TREES, PLOTS,
  POND, RAIL_BENCHES, RAIL_WALK, SF_BLOCKS, SF_CARS, SF_CROSSINGS, SF_LAMPS, SF_PEOPLE, SF_SIGNS, SF_STREETS, SOUTHFIELD_SOLIDS, STRIPS, STRIP_TREES, STRIP_WALK, TRUCK_OFFICE, WEST_LOCKUPS,
  YARD_LOTS, inPond, shedOf, type Rect,
} from '../src/scripts/city3d/southfield';
import { PLAN, distToStreet, inPoly, slabOf, type Pt } from '../src/scripts/city3d/streetplan';
import { SOLIDS } from '../src/scripts/city3d/solids';
import { PLACES } from '../src/scripts/city3d/places';
import { METRO_SOLIDS, PILLAR_HALF, TRACKS } from '../src/scripts/city3d/metro';
import { HIGHWAY_HALF, fromHighway, insideHighway } from '../src/scripts/city3d/highway';
import { EL_CLEAR } from '../src/scripts/city3d/landuse';
import { EMPORIUM_ROOF } from '../src/scripts/city3d/projects';

const mine = new Set(SOUTHFIELD_SOLIDS);
const others = SOLIDS.filter((b) => !mine.has(b));
const overlap = (a: readonly number[], b: readonly number[], m = 0) => a[0] < b[2] - m && a[2] > b[0] + m && a[1] < b[3] - m && a[3] > b[1] + m;
const segDist = (p: Pt, a: Pt, b: Pt) => {
  const vx = b[0] - a[0];
  const vz = b[1] - a[1];
  const l2 = vx * vx + vz * vz;
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / l2)) : 0;
  return Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vz * t);
};
/** How far a point is from a metro track's line */
const fromTrack = (p: Pt) => Math.min(...Object.values(TRACKS).flatMap((t) => t.pts.slice(1).map((q, i) => segDist(p, t.pts[i], q))));
const corners = (r: readonly number[]): Pt[] => [
  [r[0], r[1]],
  [r[2], r[1]],
  [r[0], r[3]],
  [r[2], r[3]],
];
const myBlocks = PLAN.blocks.filter((b) => SF_BLOCKS.some((s) => s.id === b.id));
const onMySlab = (p: Pt) => myBlocks.some((b) => inPoly(slabOf(b), p));
const roads = PLAN.streets.filter((s) => s.kind !== 'alley' && s.kind !== 'highway');

test('its streets and blocks are in the street plan, its ring lit where it meets the avenue', () => {
  for (const s of SF_STREETS) assert.ok(PLAN.streets.some((t) => t.id === s.id), s.id);
  for (const b of SF_BLOCKS) assert.ok(PLAN.blocks.some((t) => t.id === b.id && t.ref === b.ref), b.id);
  for (const c of SF_CROSSINGS) assert.equal(c.lights, c.streets.includes('ew4'), c.id);
});

test('no street of its runs near the metro, so not one pillar moves (they are worked out from the street plan)', () => {
  for (const s of SF_STREETS)
    for (let i = 1; i < s.pts.length; i++)
      for (let t = 0; t <= 1; t += 0.02) {
        const p: Pt = [s.pts[i - 1][0] + (s.pts[i][0] - s.pts[i - 1][0]) * t, s.pts[i - 1][1] + (s.pts[i][1] - s.pts[i - 1][1]) * t];
        assert.ok(fromTrack(p) > s.half + PILLAR_HALF + 0.3 + 2, `${s.id} at ${p} is ${fromTrack(p).toFixed(2)} from a track`);
      }
});

test('all of it inside the ring highway, well clear of its verge', () => {
  for (const b of SF_BLOCKS) for (const p of b.poly) assert.ok(insideHighway(p[0], p[1]) && fromHighway(p[0], p[1]) > HIGHWAY_HALF + 6, `${b.id} at ${p}`);
  for (const s of SF_STREETS) for (const p of s.pts) assert.ok(insideHighway(p[0], p[1]) && fromHighway(p[0], p[1]) > HIGHWAY_HALF + 8, `${s.id} at ${p}`);
  for (const p of [...RAIL_WALK, ...STRIP_WALK]) assert.ok(insideHighway(p[0], p[1]) && fromHighway(p[0], p[1]) > HIGHWAY_HALF + 6, `the walk at ${p}`);
});

test('every solid on its blocks, off every road, clear of what was there and of the metro, under the Emporium', () => {
  for (const b of SOUTHFIELD_SOLIDS) {
    for (const p of corners(b)) assert.ok(onMySlab(p), `${b.join(', ')} is off its blocks`);
    for (const s of roads) for (const p of corners(b)) assert.ok(distToStreet(s, p) > s.half + 0.3, `${b.join(', ')} on ${s.id}`);
    for (const o of others) assert.ok(!overlap(b, o), `${b.join(', ')} overlaps ${o.join(', ')}`);
    for (const p of [...corners(b), [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2] as Pt]) assert.ok(fromTrack(p) > 4, `${b.join(', ')} is under the el`);
    assert.ok(b[4] < EMPORIUM_ROOF - 0.5, `${b.join(', ')} is ${b[4]} tall`);
  }
  for (const m of METRO_SOLIDS) for (const b of SOUTHFIELD_SOLIDS) assert.ok(!overlap(b, m), `${b.join(', ')} on a pillar`);
});

test("its buildings, sheds and huts don't overlap each other; the parked vehicles stand clear of them", () => {
  const things: [string, Rect][] = [
    ...YARD_LOTS.map((l, i): [string, Rect] => [`lot ${i}`, l.box]),
    ...[DEPOT_SHED, DEPOT_GATE, MERCHANT, TRUCK_OFFICE, ...LOCKUPS, ...WEST_LOCKUPS, ...HUTS, GARDEN_TUNNEL, EAST_TUNNEL].map((s): [string, Rect] => [s.id, s.rect]),
    ...BAYS.map((r, i): [string, Rect] => [`bay ${i}`, r]),
    ...PLOTS.filter((p) => p.shed).map((p, i): [string, Rect] => [`plot shed ${i}`, shedOf(p)]),
  ];
  for (let i = 0; i < things.length; i++) for (let j = i + 1; j < things.length; j++) assert.ok(!overlap(things[i][1], things[j][1], 0.01), `${things[i][0]} and ${things[j][0]}`);
  const cars = SOUTHFIELD_SOLIDS.slice(-SF_CARS.length);
  for (const c of cars) for (const [name, r] of things) assert.ok(!overlap(c, r), `a parked vehicle at ${c.join(', ')} in ${name}`);
  for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) assert.ok(!overlap(cars[i], cars[j]), `two parked vehicles at ${cars[i].join(', ')}`);
});

test('the allotments: plots inside their strips, none overlapping, a path down the middle', () => {
  for (const p of PLOTS) {
    const strip = Object.values(STRIPS).find((s) => p.rect[0] >= s[0] - 1e-6 && p.rect[2] <= s[2] + 1e-6 && p.rect[1] >= s[1] - 1e-6 && p.rect[3] <= s[3] + 1e-6);
    assert.ok(strip, `plot at ${p.rect} is off its strip`);
    const mid = (strip![0] + strip![2]) / 2;
    assert.ok(p.rect[2] < mid - 0.7 || p.rect[0] > mid + 0.7, `plot at ${p.rect} is on the path`);
  }
  for (let i = 0; i < PLOTS.length; i++) for (let j = i + 1; j < PLOTS.length; j++) assert.ok(!overlap(PLOTS[i].rect, PLOTS[j].rect, 0.01), `plots ${i} and ${j}`);
  assert.ok(PLOTS.length >= 40, `${PLOTS.length} plots`);
  for (const p of PLOTS) assert.ok(!overlap(p.rect, EAST_GARDEN, 0.01), 'the east strip keeps its garden');
});

test('the park: its paths on its lawn and off the pond, its trees off the paths, the pond, the garden and the el', () => {
  const inPark = (p: Pt, m = 0) => p[0] > PARK_LOT[0] + m && p[0] < PARK_LOT[2] - m && p[1] > PARK_LOT[1] + m && p[1] < PARK_LOT[3] - m;
  for (const path of PARK_PATHS)
    for (let i = 1; i < path.pts.length; i++)
      for (let t = 0; t <= 1; t += 0.05) {
        const p: Pt = [path.pts[i - 1][0] + (path.pts[i][0] - path.pts[i - 1][0]) * t, path.pts[i - 1][1] + (path.pts[i][1] - path.pts[i - 1][1]) * t];
        assert.ok(inPark(p, -0.01), `path ${path.id} at ${p} leaves the park`);
        assert.ok(!inPond(p[0], p[1], path.w / 2 + 0.2), `path ${path.id} at ${p} in the pond`);
      }
  for (const [x, z] of PARK_TREES) {
    assert.ok(inPark([x, z], 1), `tree at ${x}, ${z}`);
    assert.ok(!inPond(x, z, 2), `tree in the pond at ${x}, ${z}`);
    assert.ok(fromTrack([x, z]) > EL_CLEAR, `tree under the el at ${x}, ${z}`);
    for (const p of PARK_PATHS) for (let i = 1; i < p.pts.length; i++) assert.ok(segDist([x, z], p.pts[i - 1], p.pts[i]) > p.w / 2 + 0.8, `tree on path ${p.id} at ${x}, ${z}`);
    assert.ok(!(x > GARDEN_LOT[0] - 1 && x < GARDEN_LOT[2] + 1 && z > GARDEN_LOT[1] - 1 && z < GARDEN_LOT[3] + 1), `tree in the garden at ${x}, ${z}`);
  }
  for (let i = 0; i < PARK_TREES.length; i++) for (let j = i + 1; j < PARK_TREES.length; j++) assert.ok(Math.hypot(PARK_TREES[i][0] - PARK_TREES[j][0], PARK_TREES[i][1] - PARK_TREES[j][1]) > 2.5);
  assert.ok(PARK_TREES.length >= 30, `${PARK_TREES.length} trees`);
  assert.ok(POND.x - POND.rx > PARK_LOT[0] + 8 && POND.x + POND.rx < PARK_LOT[2] - 8, 'the pond inside the loop');
});

test('the lamps on sidewalks or lawns, off the roads and clear of everything solid; the trees, benches and people clear too', () => {
  const solidAt = (x: number, z: number, m: number) => SOLIDS.some((b) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m);
  for (const [x, z] of [...SF_LAMPS.map(([x, z]) => [x, z] as Pt), ...PARK_LAMPS.map(([x, z]) => [x, z] as Pt)]) {
    assert.ok(onMySlab([x, z]), `lamp at ${x}, ${z} is off its blocks`);
    for (const s of roads) assert.ok(distToStreet(s, [x, z]) > s.half + 0.2, `lamp at ${x}, ${z} on ${s.id}`);
    assert.ok(!solidAt(x, z, 0.3), `lamp at ${x}, ${z} in something solid`);
  }
  for (const [x, z] of [...PARK_TREES, ...STRIP_TREES]) assert.ok(!solidAt(x, z, 0.6), `tree at ${x}, ${z} in something solid`);
  for (const [x, z] of [...PARK_BENCHES, ...RAIL_BENCHES]) assert.ok(!solidAt(x, z, 0.8), `bench at ${x}, ${z} in something solid`);
  for (const p of SF_PEOPLE) assert.ok(!solidAt(p.x, p.z, 0.2), `someone at ${p.x}, ${p.z} in something solid`);
  for (const [x, z] of RAIL_BENCHES) assert.ok(fromTrack([x, z]) > 2.5, `bench at ${x}, ${z} under the deck`);
});

test('the walks: off the streets but where they cross the small north-south roads, clear of the pillars', () => {
  for (const [name, pts] of [
    ['rail', RAIL_WALK],
    ['strip', STRIP_WALK],
  ] as const)
    for (let i = 1; i < pts.length; i++)
      for (let t = 0; t <= 1; t += 0.01) {
        const p: Pt = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
        for (const s of roads) if (!(name === 'strip' && /^ns[12]s$/.test(s.id))) assert.ok(distToStreet(s, p) > s.half + 0.6, `the ${name} walk at ${p} on ${s.id}`);
        for (const m of METRO_SOLIDS) assert.ok(!(p[0] > m[0] - 0.9 && p[0] < m[2] + 0.9 && p[1] > m[1] - 0.9 && p[1] < m[3] + 0.9), `the ${name} walk at ${p} on a pillar`);
      }
});

test("no place's arrival spot lands on anything of its", () => {
  for (const pl of PLACES) for (const b of SOUTHFIELD_SOLIDS) assert.ok(!(pl.at.x > b[0] - 0.4 && pl.at.x < b[2] + 0.4 && pl.at.z > b[1] - 0.4 && pl.at.z < b[3] + 0.4), `${pl.id} in ${b.join(', ')}`);
});

test('the sites kept for later: named, on its blocks; its signs fixed made-up copy', () => {
  assert.ok(FUTURE_SITES.length >= 3);
  for (const s of FUTURE_SITES) {
    assert.ok(s.name.length > 3 && s.what.length > 3);
    for (const p of corners(s.rect)) assert.ok(onMySlab(p), `${s.id} at ${p}`);
  }
  for (const t of Object.values(SF_SIGNS)) assert.match(t, /^[A-Z' ]+$/);
});
