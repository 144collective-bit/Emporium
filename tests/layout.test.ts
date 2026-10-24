// The street plan (layout.ts): downtown's size and cross streets, streets, avenues,
// lanes, the river, and the landmarks' old drawing grid with their seats today.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BLOCKS, BS, CITY_EXT, CORE_ROADS, DOWNTOWN, EW_ROADS, EXT, GARAGE, LANE, MEDIAN, NS_ROADS, RING_HI, RING_LO, RIVER, SEATS, SOUTH_ROAD, THIRDS, WALK_W, WORLD_BOUNDS, design, designBox, laneCentres, seat } from '../src/scripts/city3d/layout';
import { SLABS, bounds, inside, overlaps, polysOverlap } from './world';
import { PLAN } from '../src/scripts/city3d/streetplan';

test('downtown is 60 across, cut in thirds by two cross streets, inside the ring', () => {
  assert.equal(BS, 9);
  assert.equal(DOWNTOWN, 60);
  // The ring avenues' sidewalks end where downtown starts and ends
  const ring = NS_ROADS[0];
  assert.equal(ring.c, RING_LO);
  assert.ok(Math.abs(RING_LO + ring.half + WALK_W) < 1e-9 && Math.abs(RING_HI - ring.half - WALK_W - DOWNTOWN) < 1e-9);
  // Each third's lot meets its cross street's sidewalk exactly
  CORE_ROADS.forEach((c, i) => {
    assert.ok(Math.abs(THIRDS[i][1] - (c - LANE - WALK_W)) < 1e-9);
    assert.ok(Math.abs(THIRDS[i + 1][0] - (c + LANE + WALK_W)) < 1e-9);
  });
  // Districts and the extra lots line up on the thirds
  THIRDS.forEach(([a, b], i) => assert.ok(Math.abs(BLOCKS[i] + BS / 2 - (a + b) / 2) < 1e-9));
});

test('no road runs over a slab (a block, district or lot, with its sidewalk)', () => {
  for (const r of NS_ROADS) for (const s of SLABS) assert.ok(s.every((p) => p[0] <= r.c - r.half + 1e-6) || s.every((p) => p[0] >= r.c + r.half - 1e-6), `north-south road at x ${r.c} crosses a slab at ${bounds(s)}`);
  for (const r of EW_ROADS) for (const s of SLABS) assert.ok(s.every((p) => p[1] <= r.c - r.half + 1e-6) || s.every((p) => p[1] >= r.c + r.half - 1e-6), `east-west road at z ${r.c} crosses a slab at ${bounds(s)}`);
});

test('no two slabs overlap', () => {
  for (let i = 0; i < SLABS.length; i++) for (let j = i + 1; j < SLABS.length; j++) assert.ok(!polysOverlap(SLABS[i], SLABS[j]), `slabs at ${bounds(SLABS[i])} and ${bounds(SLABS[j])} overlap`);
});

test('streets have one lane each way, avenues two, every lane inside its asphalt', () => {
  for (const [roads, axis] of [
    [NS_ROADS, 'z'],
    [EW_ROADS, 'x'],
  ] as const)
    for (const r of roads) {
      const lanes = laneCentres(r, axis);
      assert.equal(lanes.length, r.lanes * 2);
      assert.equal(lanes.filter((l) => l.dir === 1).length, r.lanes);
      for (const l of lanes) {
        assert.ok(Math.abs(l.coord - r.c) + LANE / 2 <= r.half + 1e-9, 'lane spills off the road');
        if (r.lanes === 2) assert.ok(Math.abs(l.coord - r.c) - LANE / 2 >= MEDIAN / 2 - 1e-9, 'lane runs over the median');
      }
    }
});

test('right-hand traffic: heading +x on the +z side, heading +z on the -x side', () => {
  const ew = laneCentres(EW_ROADS[1], 'x');
  for (const l of ew) assert.equal(Math.sign(l.coord - EW_ROADS[1].c), l.dir);
  const ns = laneCentres(NS_ROADS[1], 'z');
  for (const l of ns) assert.equal(Math.sign(l.coord - NS_ROADS[1].c), -l.dir);
});

test('the river runs between the north bank avenue and the south bank road, clear of every slab', () => {
  const north = EW_ROADS.filter((r) => r.c < RIVER[0]).at(-1)!;
  assert.ok(north.c + north.half < RIVER[0]);
  assert.ok(SOUTH_ROAD - EW_ROADS.find((r) => r.c === SOUTH_ROAD)!.half > RIVER[1]);
  for (const s of SLABS.map(bounds)) assert.ok(s[3] <= RIVER[0] || s[1] >= RIVER[1], 'a slab sits in the river');
});

test('the garage lot is on the south bank, past the river', () => {
  assert.ok(GARAGE.oz > RIVER[1]);
});

test('the drawing grid seats each old block (0, 11, 22) on its landmark\'s lot today', () => {
  const lots = Object.entries(SEATS).filter(([k]) => k !== '0,0');
  for (const [k, [ox, oz]] of lots) {
    const [bx, bz] = k.split(',').map(Number);
    assert.deepEqual(design(bx + 4.5, bz + 4.5), [ox + 4.5, oz + 4.5], `old block ${k}`);
    // The whole old block (with half the old street round it) moves the same way
    assert.deepEqual(seat(bx - 0.9, bz + 9.9), seat(bx + 4.5, bz + 4.5));
    // Every lot is inside downtown, off the cross streets
    for (const [a, b] of [
      [ox, ox + BS],
      [oz, oz + BS],
    ])
      assert.ok(THIRDS.some(([t0, t1]) => a >= t0 && b <= t1), `lot ${k} sits on a cross street`);
  }
  // No two lots overlap
  for (let i = 0; i < lots.length; i++)
    for (let j = i + 1; j < lots.length; j++) {
      const [a, b] = [lots[i][1], lots[j][1]];
      assert.ok(!overlaps([a[0], a[1], a[0] + BS, a[1] + BS], [b[0], b[1], b[0] + BS, b[1] + BS]), `${lots[i][0]} and ${lots[j][0]}`);
    }
  // A box moves whole, by the block its centre is in (the Emporium's podium)
  assert.deepEqual(designBox([11.8, 11.8, 18, 16, 2.6]), [26.3, 32.3, 32.5, 36.5, 2.6]);
});

test('the world reaches well past the city, with room to build', () => {
  const world = [EXT[0], EXT[0], EXT[1], EXT[1]] as [number, number, number, number];
  assert.ok(inside(WORLD_BOUNDS, world), 'you can walk or drive off the edge');
  assert.ok(CITY_EXT[0] >= EXT[0] && CITY_EXT[1] <= EXT[1]);
  for (const s of SLABS.map(bounds)) assert.ok(inside(s, WORLD_BOUNDS), 'a block or district is out of reach');
  // At least a hundred tiles of open land on every side of what's built (but the grand station, whose tracks run out
  // to the world's edge: the owner's call, docs/station-plan.md)
  const built = SLABS.filter((_, i) => PLAN.blocks[i].ref !== 'station').map(bounds).reduce((b, s) => [Math.min(b[0], s[0]), Math.min(b[1], s[1]), Math.max(b[2], s[2]), Math.max(b[3], s[3])], [Infinity, Infinity, -Infinity, -Infinity]);
  assert.ok(built[0] - WORLD_BOUNDS[0] >= 100 && built[1] - WORLD_BOUNDS[1] >= 100 && WORLD_BOUNDS[2] - built[2] >= 100 && WORLD_BOUNDS[3] - built[3] >= 100);
});
